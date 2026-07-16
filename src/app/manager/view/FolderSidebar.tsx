import {KeyboardEvent, SubmitEvent, useState} from 'react';
import {useDroppable} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import type {Folder} from '@/types/vault';

interface Props {
  folders: Folder[];
  total: number;
  unfiled: number;
  counts: Record<string, number>;
  effectiveFolder: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => Promise<string | null>;
  onRename: (id: string, name: string) => Promise<string | null>;
  onDelete: (id: string) => void;
}

const ALL = 'All';
const UNFILED = 'Unfiled';
const ALL_KEY = 'ALL';
const UNFILED_KEY = 'UNFILED';
const UNFILED_DROP = 'UNFILED';

export function FolderSidebar({
  folders,
  total,
  unfiled,
  counts,
  effectiveFolder,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  // Sort by order; the sidebar SortableContext holds folder ids so folders
  // can be drag-reordered.
  const sorted = folders.slice().sort((a, b) => a.order - b.order);
  const folderIds = sorted.map(f => f.id);

  const startCreate = () => {
    setCreating(true);
    setNewName('');
  };
  const cancelCreate = () => {
    setCreating(false);
    setNewName('');
  };
  const submitCreate = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const err = await onCreate(name);
    if (err) return;
    setNewName('');
    setCreating(false);
  };

  const startRename = (f: Folder) => {
    setRenameId(f.id);
    setRenameDraft(f.name);
  };
  const cancelRename = () => {
    setRenameId(null);
    setRenameDraft('');
  };
  const submitRename = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = renameDraft.trim();
    if (!name || !renameId) return;
    const err = await onRename(renameId, name);
    if (err) return;
    setRenameId(null);
    setRenameDraft('');
  };

  const confirmDelete = (f: Folder) => {
    const n = counts[f.id] ?? 0;
    const msg =
      n > 0
        ? `Delete folder "${f.name}"? ${n} bookmarks will move to "Unfiled".`
        : `Delete folder "${f.name}"? This folder is empty.`;
    if (window.confirm(msg)) onDelete(f.id);
  };

  const escCancel = (e: KeyboardEvent, cancel: () => void) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  const rowClass = (key: string, extra = '') =>
    'folder' +
    (effectiveFolder === key ? ' folder--active' : '') +
    (extra ? ' ' + extra : '');

  return (
    <nav className="manager__sidebar" aria-label="Folders">
      <h2 className="manager__sidebar-title">Folders</h2>
      <SortableContext items={folderIds} strategy={verticalListSortingStrategy}>
        <ul className="folder__list">
          <li>
            <div className={rowClass(ALL_KEY)}>
              <span className="folder__accent" aria-hidden="true" />
              <button
                type="button"
                className="folder__main"
                onClick={() => onSelect(ALL_KEY)}
              >
                <span className="folder__name">{ALL}</span>
                <span className="folder__count">{total}</span>
              </button>
              <div className="folder__actions" aria-hidden="true" />
            </div>
          </li>
          <UnfiledRow
            active={effectiveFolder === UNFILED_KEY}
            count={unfiled}
            onSelect={() => onSelect(UNFILED_KEY)}
          />
          {sorted.map(f =>
            renameId === f.id ? (
              <li key={f.id} className="folder__rename">
                <form
                  onSubmit={submitRename}
                  onKeyDown={e => escCancel(e, cancelRename)}
                >
                  <input
                    className="field__input"
                    value={renameDraft}
                    onChange={e => setRenameDraft(e.target.value)}
                    placeholder="Folder name"
                    aria-label="Rename folder"
                    autoFocus
                  />
                </form>
              </li>
            ) : (
              <SortableFolderRow
                key={f.id}
                folder={f}
                count={counts[f.id] ?? 0}
                active={effectiveFolder === f.id}
                onSelect={() => onSelect(f.id)}
                onRename={() => startRename(f)}
                onDelete={() => confirmDelete(f)}
              />
            ),
          )}
        </ul>
      </SortableContext>
      {creating ? (
        <form
          className="manager__new-folder-input"
          onSubmit={submitCreate}
          onKeyDown={e => escCancel(e, cancelCreate)}
        >
          <input
            className="field__input"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Folder name"
            aria-label="New folder name"
            autoFocus
          />
        </form>
      ) : (
        <button
          type="button"
          className="btn btn--ghost manager__new-folder"
          onClick={startCreate}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New folder
        </button>
      )}
    </nav>
  );
}

// Unfiled row: useDroppable makes it a bookmark drop target (it has no
// entity, so it's not sortable). The whole row is clickable.
function UnfiledRow({
  active,
  count,
  onSelect,
}: {
  active: boolean;
  count: number;
  onSelect: () => void;
}) {
  const {setNodeRef, isOver} = useDroppable({
    id: UNFILED_DROP,
    data: {type: 'folder', folderId: null},
  });
  return (
    <li>
      <div
        ref={setNodeRef}
        className={
          'folder' +
          (active ? ' folder--active' : '') +
          (isOver ? ' folder--over' : '')
        }
      >
        <span className="folder__accent" aria-hidden="true" />
        <button type="button" className="folder__main" onClick={onSelect}>
          <span className="folder__name">{UNFILED}</span>
          <span className="folder__count">{count}</span>
        </button>
        <div className="folder__actions" aria-hidden="true" />
      </div>
    </li>
  );
}

// Real folder row: useSortable makes it drag-reorderable and (as a side
// effect) a droppable bookmark drop target. ref + listeners sit on the row
// div; .folder__main (select) and .folder__action (rename/delete) are
// sibling buttons. Row listeners + the distance constraint tell a click
// from a drag.
function SortableFolderRow({
  folder,
  count,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  folder: Folder;
  count: number;
  active: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: folder.id,
    data: {type: 'folder', folderId: folder.id},
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const cls =
    'folder' +
    (active ? ' folder--active' : '') +
    (isOver ? ' folder--over' : '') +
    (isDragging ? ' folder--dragging' : '');
  return (
    <li>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cls}
      >
        <span className="folder__accent" aria-hidden="true" />
        <button type="button" className="folder__main" onClick={onSelect}>
          <span className="folder__name">{folder.name}</span>
          <span className="folder__count">{count}</span>
        </button>
        <div className="folder__actions">
          <button
            type="button"
            className="folder__action folder__action--edit"
            aria-label={`Rename ${folder.name}`}
            onClick={onRename}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
          <button
            type="button"
            className="folder__action folder__action--danger"
            aria-label={`Delete ${folder.name}`}
            onClick={onDelete}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </li>
  );
}
