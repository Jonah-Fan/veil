import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import type {BookmarkRecord, Folder} from '@/types/vault';
import {BookmarkRow} from '@/app/manager/view/BookmarkRow';
import {BookmarkEditForm} from '@/app/manager/view/BookmarkEditForm';

interface Props {
  bookmarks: BookmarkRecord[];
  folders: Folder[];
  editingId: string | null;
  onDelete: (id: string) => void;
  onEditStart: (id: string) => void;
  onSave: (
    id: string,
    title: string,
    description: string,
    tags: string[],
    folderId: string | null,
  ) => Promise<string | null>;
  onCancelEdit: () => void;
  emptyText: string;
}

function SortableBookmarkRow({
  bookmark,
  onDelete,
  onEditStart,
}: {
  bookmark: BookmarkRecord;
  onDelete: (id: string) => void;
  onEditStart: (id: string) => void;
}) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} =
    useSortable({id: bookmark.id, data: {type: 'bookmark'}});
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isDragging ? 'mrow-wrap mrow-wrap--dragging' : 'mrow-wrap'}
    >
      <BookmarkRow
        bookmark={bookmark}
        onDelete={onDelete}
        onEditStart={onEditStart}
      />
    </div>
  );
}

function EditingRow({
  bookmark,
  folders,
  onSave,
  onCancel,
}: {
  bookmark: BookmarkRecord;
  folders: Folder[];
  onSave: Props['onSave'];
  onCancel: () => void;
}) {
  return (
    <div className="mrow-wrap">
      <BookmarkEditForm
        bookmark={bookmark}
        folders={folders}
        onSave={onSave}
        onCancel={onCancel}
      />
    </div>
  );
}

export function BookmarkList({
  bookmarks,
  folders,
  editingId,
  onDelete,
  onEditStart,
  onSave,
  onCancelEdit,
  emptyText,
}: Props) {
  const ids = bookmarks.map(b => b.id);
  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      {bookmarks.length === 0 ? (
        <p className="manager__empty">{emptyText}</p>
      ) : (
        <ul className="manager__list">
          {bookmarks.map(b =>
            editingId === b.id ? (
              <li key={b.id}>
                <EditingRow
                  bookmark={b}
                  folders={folders}
                  onSave={onSave}
                  onCancel={onCancelEdit}
                />
              </li>
            ) : (
              <li key={b.id}>
                <SortableBookmarkRow
                  bookmark={b}
                  onDelete={onDelete}
                  onEditStart={onEditStart}
                />
              </li>
            ),
          )}
        </ul>
      )}
    </SortableContext>
  );
}
