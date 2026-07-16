import {KeyboardEvent, SubmitEvent, useCallback, useState} from 'react';
import {browser} from 'wxt/browser';
import {sendMessage} from '@/services/messaging/bridge';
import type {BookmarkRecord, Folder} from '@/types/vault';

interface Props {
  bookmark: BookmarkRecord;
  folders: Folder[];
  onSave: (
    id: string,
    title: string,
    description: string,
    tags: string[],
    folderId: string | null,
  ) => Promise<string | null>;
  onCancel: () => void;
}

function useBookEditForm(
  bookmark: BookmarkRecord,
  onSave: Props['onSave'],
  onCancel: () => void,
) {
  const [title, setTitle] = useState(bookmark.title);
  const [description, setDescription] = useState(bookmark.description ?? '');
  const [folder, setFolder] = useState(bookmark.folderId ?? '');
  const [tags, setTags] = useState(bookmark.tags.slice());
  const [tagDraft, setTagDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canSave = title.trim() !== '' && !saving;

  const addTag = useCallback((): void => {
    const t = tagDraft.trim() || null;
    if (t) {
      setTags(prev => (prev.includes(t) ? prev : [...prev, t]));
    }
    setTagDraft('');
  }, [tagDraft]);

  const deleteTag = useCallback(
    (t: string): void => setTags(prev => prev.filter(x => x !== t)),
    [],
  );

  const submit = useCallback(
    async (e: SubmitEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      if (!canSave) {
        return;
      }

      setSaving(true);
      setError('');

      const err = await onSave(
        bookmark.id,
        title.trim(),
        description,
        tags,
        folder === '' ? null : folder,
      );

      setSaving(false);
      if (err) {
        setError(err);
      }
    },
    [canSave, bookmark.id, title, description, tags, folder, onSave],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLFormElement>): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [onCancel],
  );

  const openUrl = useCallback((): void => {
    void browser.tabs.create({url: bookmark.url});
    void sendMessage({type: 'RECORD_VISIT', id: bookmark.id});
  }, [bookmark.url, bookmark.id]);

  return {
    title,
    setTitle,
    description,
    setDescription,
    folder,
    setFolder,
    tags,
    tagDraft,
    setTagDraft,
    saving,
    error,
    canSave,
    addTag,
    deleteTag,
    submit,
    onKeyDown,
    openUrl,
  };
}

interface TagListProps {
  tags: string[];
  onDelete: (t: string) => void;
}

function TagList({tags, onDelete}: TagListProps) {
  if (tags.length === 0) {
    return null;
  }

  return tags.map(t => (
    <span key={t} className="mrow__edit-tag">
      {t}
      <button
        type="button"
        aria-label={`Remove tag ${t}`}
        onClick={() => onDelete(t)}
      >
        ×
      </button>
    </span>
  ));
}

export function BookmarkEditForm({bookmark, folders, onSave, onCancel}: Props) {
  const f = useBookEditForm(bookmark, onSave, onCancel);

  return (
    <div className="mrow mrow--editing">
      <form className="mrow__edit" onSubmit={f.submit} onKeyDown={f.onKeyDown}>
        <button
          type="button"
          className="mrow__url"
          onClick={f.openUrl}
          aria-label={`URL (read-only, click to open): ${bookmark.url}`}
          title={bookmark.url}
        >
          <svg
            className="mrow__url-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span className="mrow__url-text">{bookmark.url}</span>
        </button>
        <input
          className="field__input"
          value={f.title}
          onChange={e => f.setTitle(e.target.value)}
          placeholder="Title"
          aria-label="Title"
          autoFocus
        />
        <input
          className="field__input"
          value={f.description}
          onChange={e => f.setDescription(e.target.value)}
          placeholder="Note (optional)"
          aria-label="Note"
        />
        <select
          className="field__input"
          value={f.folder}
          onChange={e => f.setFolder(e.target.value)}
          aria-label="Folder"
        >
          <option value="">Unfiled</option>
          {folders.map(f => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <div className="mrow__edit-tags">
          <TagList tags={f.tags} onDelete={f.deleteTag} />
          <input
            className="mrow__edit-tag-input"
            value={f.tagDraft}
            onChange={e => f.setTagDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                f.addTag();
              }
            }}
            placeholder="Add a tag and press Enter…"
            aria-label="Add tag"
          />
        </div>
        {f.error && <p className="error">{f.error}</p>}
        <div className="mrow__edit-actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={!f.canSave}
          >
            {f.saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
