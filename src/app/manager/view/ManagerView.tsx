import {useCallback, useMemo, useState} from 'react';
import {
  closestCorners,
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {arrayMove, sortableKeyboardCoordinates} from '@dnd-kit/sortable';
import {sendMessage} from '@/services/messaging/bridge';
import {useVault} from '@/app/hooks/useVault';
import {BookmarkRow} from '@/app/manager/view/BookmarkRow';
import {BookmarkList} from '@/app/manager/view/BookmarkList';
import {FolderSidebar} from '@/app/manager/view/FolderSidebar';
import {getDomain} from '@/utils/url';
import type {BookmarkRecord, Folder} from '@/types/vault';
import type {StatePayload} from '@/types/messages';

interface Props {
  state: StatePayload;
  onDone: () => void;
}

const ALL = 'All';
const EMPTY_BOOKMARKS: BookmarkRecord[] = [];
const EMPTY_FOLDERS: Folder[] = [];

function aggregateTags(bookmarks: BookmarkRecord[]): string[] {
  const set = new Set<string>();
  for (const b of bookmarks)
    for (const t of b.tags) {
      set.add(t);
    }
  return Array.from(set).sort();
}

function computeFolderState(bookmarks: BookmarkRecord[]) {
  const counts: Record<string, number> = {};
  let unfiled = 0;
  for (const b of bookmarks) {
    if (b.folderId === null) {
      unfiled += 1;
    } else {
      counts[b.folderId] = (counts[b.folderId] ?? 0) + 1;
    }
  }
  return {counts, unfiled};
}

function useVaultData() {
  const {vault, refresh} = useVault();
  return {
    bookmarks: vault?.bookmarks ?? EMPTY_BOOKMARKS,
    folders: vault?.folders ?? EMPTY_FOLDERS,
    loading: vault === null,
    refresh,
  };
}

function useHeaderScope(
  state: StatePayload,
  onDone: () => void,
  total: number,
  shown: number,
  loading: boolean,
) {
  const lock = useCallback(async () => {
    await sendMessage({type: 'LOCK'});
    onDone();
  }, [onDone]);

  const autoLockText =
    state.autoLockMinutes > 0
      ? `Auto-lock ${state.autoLockMinutes} min`
      : `Auto-lock disabled`;

  const metaText = loading
    ? `Loading…`
    : `${total} total${shown !== total ? ` · showing ${shown}` : ''} · ${autoLockText}`;

  return {lock, metaText};
}

function useSearchScope(bookmarks: BookmarkRecord[]) {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string>(ALL);

  const tags = useMemo(() => [ALL, ...aggregateTags(bookmarks)], [bookmarks]);
  const effectiveTag = tags.includes(activeTag) ? activeTag : ALL;

  return {query, setQuery, tags, activeTag, effectiveTag, setActiveTag};
}

function useFolderScope(
  folders: Folder[],
  bookmarks: BookmarkRecord[],
  refresh: () => Promise<void>,
) {
  const [activeFolder, setActiveFolder] = useState<string>('ALL');

  const effectiveFolder = useMemo(() => {
    if (activeFolder === 'ALL' || activeFolder === 'UNFILED') {
      return activeFolder;
    }
    return folders.some(f => f.id === activeFolder) ? activeFolder : 'ALL';
  }, [activeFolder, folders]);

  const {counts, unfiled} = useMemo(
    () => computeFolderState(bookmarks),
    [bookmarks],
  );

  const createFolder = useCallback(
    async (name: string): Promise<string | null> => {
      const res = await sendMessage({type: 'CREATE_FOLDER', name});
      if (res.ok) {
        setActiveFolder(res.data.id);
        await refresh();
        return null;
      }
      return res.error;
    },
    [refresh],
  );

  const renameFolder = useCallback(
    async (id: string, name: string): Promise<string | null> => {
      const res = await sendMessage({type: 'UPDATE_FOLDER', id, name});
      if (res.ok) {
        await refresh();
        return null;
      }
      return res.error;
    },
    [refresh],
  );

  const deleteFolder = useCallback(
    async (id: string) => {
      const res = await sendMessage({type: 'DELETE_FOLDER', id});
      if (res.ok) {
        await refresh();
        return null;
      }
      return res.error;
    },
    [refresh],
  );

  const reorderFolders = useCallback(
    async (ids: string[]) => {
      const res = await sendMessage({type: 'SET_FOLDER_ORDER', ids});
      if (res.ok) {
        await refresh();
        return null;
      }
      return res.error;
    },
    [refresh],
  );

  return {
    effectiveFolder,
    setActiveFolder,
    counts,
    unfiled,
    createFolder,
    renameFolder,
    deleteFolder,
    reorderFolders,
  };
}

function useBookmarkScope(refresh: () => Promise<void>) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const deleteBookmark = useCallback(
    async (id: string): Promise<string | null> => {
      const res = await sendMessage({type: 'DELETE_BOOKMARK', id});
      if (res.ok) {
        await refresh();
        return null;
      }
      return res.error;
    },
    [refresh],
  );

  const updateBookmark = useCallback(
    async (
      id: string,
      title: string,
      description: string,
      tags: string[],
      folderId: string | null,
    ): Promise<string | null> => {
      const res = await sendMessage({
        type: 'UPDATE_BOOKMARK',
        id,
        title,
        description,
        tags,
        folderId,
      });
      if (res.ok) {
        setEditingId(null);
        await refresh();
        return null;
      }
      return res.error;
    },
    [refresh],
  );

  const moveBookmark = useCallback(
    async (id: string, folderId: string | null): Promise<void> => {
      const res = await sendMessage({type: 'MOVE_BOOKMARK', id, folderId});
      if (res.ok) {
        await refresh();
      }
    },
    [refresh],
  );

  const reorderBookmarks = useCallback(
    async (folderId: string | null, ids: string[]): Promise<void> => {
      const res = await sendMessage({
        type: 'SET_BOOKMARK_ORDER',
        folderId,
        ids,
      });
      if (res.ok) {
        await refresh();
      }
    },
    [refresh],
  );

  return {
    editingId,
    setEditingId,
    deleteBookmark,
    updateBookmark,
    moveBookmark,
    reorderBookmarks,
  };
}

function useDragScope(
  effectiveFolder: string,
  searchBookmarks: BookmarkRecord[],
  folders: Folder[],
  moveBookmark: (id: string, folderId: string | null) => Promise<void>,
  reorderBookmarks: (folderId: string | null, ids: string[]) => Promise<void>,
  reorderFolders: (ids: string[]) => Promise<string | null>,
) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {activationConstraint: {distance: 6}}),
    useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}),
  );

  const folderDropIds = useMemo(
    () => new Set<string>([...folders.map(f => f.id), 'UNFILED']),
    [folders],
  );

  const collisionDetection = useCallback<CollisionDetection>(
    args => {
      if (args.active.data.current?.type === 'bookmark') {
        const folderHits = pointerWithin(args).filter(c =>
          folderDropIds.has(c.id as string),
        );
        if (folderHits.length > 0) return folderHits;
      }
      return closestCorners(args);
    },
    [folderDropIds],
  );

  const onDragStart = useCallback((e: DragStartEvent) => {
    if (e.active.data.current?.type === 'bookmark') {
      setActiveId(e.active.id as string);
    }
  }, []);

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveId(null);
      const {active, over} = e;
      if (!over || active.id === over.id) {
        return;
      }

      const aType = active.data.current?.type;
      const oType = over.data.current?.type;

      if (aType === 'folder' && oType === 'folder') {
        const folderIds = folders
          .slice()
          .sort((a, b) => a.order - b.order)
          .map(f => f.id);
        const from = folderIds.indexOf(active.id as string);
        const to = folderIds.indexOf(over.id as string);
        if (from !== -1 && to !== -1) {
          void reorderFolders(arrayMove(folderIds, from, to));
        }
        return;
      }

      if (aType === 'bookmark' && oType === 'folder') {
        void moveBookmark(
          active.id as string,
          over.data.current?.folderId ?? null,
        );
        return;
      }

      if (aType === 'bookmark' && oType === 'bookmark') {
        if (effectiveFolder === 'ALL') {
          return;
        }
        const folderId = effectiveFolder === 'UNFILED' ? null : effectiveFolder;
        const ids = searchBookmarks.map(b => b.id);
        const from = ids.indexOf(active.id as string);
        const to = ids.indexOf(over.id as string);
        if (from !== -1 && to !== -1) {
          void reorderBookmarks(folderId, arrayMove(ids, from, to));
        }
        return;
      }
    },
    [
      moveBookmark,
      reorderBookmarks,
      reorderFolders,
      folders,
      effectiveFolder,
      searchBookmarks,
    ],
  );

  return {
    activeId,
    sensors,
    collisionDetection,
    onDragStart,
    onDragEnd,
  };
}

function useManager(state: StatePayload, onDone: () => void) {
  const {bookmarks, folders, loading, refresh} = useVaultData();
  const search = useSearchScope(bookmarks);
  const folder = useFolderScope(folders, bookmarks, refresh);
  const bookmark = useBookmarkScope(refresh);

  const doingSearch = useMemo(() => {
    const q = search.query.trim().toLowerCase();
    return bookmarks
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .filter(b => {
        if (b.id === bookmark.editingId) {
          return true;
        }

        if (folder.effectiveFolder === 'UNFILED') {
          if (b.folderId !== null) {
            return false;
          }
        } else if (folder.effectiveFolder !== 'ALL') {
          if (b.folderId !== folder.effectiveFolder) {
            return false;
          }
        }

        if (search.activeTag !== ALL && !b.tags.includes(search.activeTag)) {
          return false;
        }

        if (!q) {
          return true;
        }

        const hay = [
          b.title,
          b.url,
          getDomain(b.url),
          b.description ?? '',
          ...b.tags,
        ]
          .join(' ')
          .toLowerCase();

        return hay.includes(q);
      });
  }, [
    bookmarks,
    search.query,
    search.activeTag,
    folder.effectiveFolder,
    bookmark.editingId,
  ]);

  const header = useHeaderScope(
    state,
    onDone,
    bookmarks.length,
    doingSearch.length,
    loading,
  );

  const dnd = useDragScope(
    folder.effectiveFolder,
    doingSearch,
    folders,
    bookmark.moveBookmark,
    bookmark.reorderBookmarks,
    folder.reorderFolders,
  );

  return {
    loading,
    header,
    search,
    folderSidebar: {
      folders,
      total: bookmarks.length,
      unfiled: folder.unfiled,
      counts: folder.counts,
      effectiveFolder: folder.effectiveFolder,
      onSelect: folder.setActiveFolder,
      onCreate: folder.createFolder,
      onRename: folder.renameFolder,
      onDelete: folder.deleteFolder,
    },
    bookmarkList: {
      bookmarks: doingSearch,
      folders,
      editingId: bookmark.editingId,
      onDelete: bookmark.deleteBookmark,
      onEditStart: bookmark.setEditingId,
      onSave: bookmark.updateBookmark,
      onCancelEdit: () => bookmark.setEditingId(null),
      emptyText:
        bookmarks.length === 0
          ? `No bookmarks yet. Use "Save current page" in the popup or the keyboard shortcut to add one.`
          : `No matching bookmarks — try a different keyword or tag.`,
    },
    dragOverlay: {
      bookmarks,
      activeId: dnd.activeId,
      onDelete: bookmark.deleteBookmark,
      onEditStart: bookmark.setEditingId,
    },
    dnd: {
      sensors: dnd.sensors,
      collisionDetection: dnd.collisionDetection,
      onDragStart: dnd.onDragStart,
      onDragEnd: dnd.onDragEnd,
    },
  };
}

interface OverlayProps {
  bookmarks: BookmarkRecord[];
  activeId: string | null;
  onDelete: (id: string) => void;
  onEditStart: (id: string) => void;
}

function BookmarkDragOverlay({
  bookmarks,
  activeId,
  onDelete,
  onEditStart,
}: OverlayProps) {
  if (!activeId) {
    return null;
  }

  const b = bookmarks.find(x => x.id === activeId);
  if (!b) {
    return null;
  }

  return (
    <div className="mrow-wrap mrow-wrap--overlay">
      <BookmarkRow bookmark={b} onDelete={onDelete} onEditStart={onEditStart} />
    </div>
  );
}

export function ManagerView({state, onDone}: Props) {
  const m = useManager(state, onDone);

  return (
    <div className="view view--manager">
      <header className="manager__header">
        <div className="manager__eyebrow">
          <span>Veil</span>
        </div>
        <h1 className="view__title">Manager</h1>
        <div className="manager__meta-row">
          <p className="manager__meta">{m.header.metaText}</p>
          <button
            type="button"
            className="btn btn--ghost manager__lock"
            onClick={() => void m.header.lock()}
          >
            Lock vault
          </button>
        </div>
      </header>

      <DndContext
        sensors={m.dnd.sensors}
        collisionDetection={m.dnd.collisionDetection}
        onDragStart={m.dnd.onDragStart}
        onDragEnd={m.dnd.onDragEnd}
      >
        <div className="manager__layout">
          <FolderSidebar {...m.folderSidebar} />
          <div className="manager__main">
            <div className="manager__search">
              <svg
                className="manager__search-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="field__input manager__search-input"
                value={m.search.query}
                onChange={e => m.search.setQuery(e.target.value)}
                placeholder="Search bookmarks, URLs, tags…"
                type="search"
              />
            </div>

            {m.search.tags.length > 1 && (
              <div className="manager__tags">
                {m.search.tags.map(t => (
                  <button
                    key={t}
                    type="button"
                    className={
                      'manager__tag' +
                      (t === m.search.activeTag ? ' manager__tag--active' : '')
                    }
                    onClick={() => m.search.setActiveTag(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {m.loading ? (
              <p className="manager__empty">Loading…</p>
            ) : (
              <BookmarkList {...m.bookmarkList} />
            )}
          </div>
        </div>
        <DragOverlay>
          <BookmarkDragOverlay {...m.dragOverlay} />
        </DragOverlay>
      </DndContext>
    </div>
  );
}
