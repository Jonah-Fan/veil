/**
 * UnlockedView — popup view shown while the vault is unlocked.
 *
 * The save form captures the active tab and posts a `SAVE_BOOKMARK`
 * message to the background, which encrypts and stores it; this file
 * only renders form state and routes messages, so plaintext vault data
 * never reaches the UI. Saving is de-duplicated by normalized URL, and
 * a `RECORD_VISIT` message is fired when a recent bookmark is opened.
 * All crypto/storage lives in the background service worker.
 */

import {
  type SubmitEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {browser} from 'wxt/browser';
import {sendMessage} from '@/services/messaging/bridge';
import {useVault} from '@/app/hooks/useVault';
import {getDomain, isAllowedUrl, normalizeUrl} from '@/utils/url';
import type {BookmarkRecord} from '@/types/vault';

/** Props accepted by {@link UnlockedView}. */
interface Props {
  /** Called after a bookmark is successfully saved. */
  onDone: () => void;
}

/** Snapshot of the active tab captured for the save form. */
interface TabInfo {
  /** The tab's full URL. */
  url: string;
  /** Page title (falls back to the URL when absent). */
  title: string;
  /** Optional favicon URL for display. */
  favicon?: string;
}

/**
 * Local form state and handlers for the unlocked view: the active tab
 * snapshot, editable title/description, the save submit (sends
 * `SAVE_BOOKMARK`, then refreshes the vault and notifies the parent via
 * `onDone`), the duplicate-URL gate (`exists`/`canSave`), and the
 * recent-bookmarks list. Saving changes the vault but not the auth state;
 * the parent callback lets the app re-sync state without waiting for the
 * next poll tick.
 */
function useUnlockedView(onDone: () => void) {
  const {vault, refresh} = useVault();
  const [tab, setTab] = useState<TabInfo | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    browser.tabs.query({active: true, currentWindow: true}).then(([active]) => {
      if (!mounted || !active?.url || !isAllowedUrl(active.url)) return;
      const info: TabInfo = {
        url: active.url,
        title: active.title ?? active.url,
        favicon: active.favIconUrl,
      };
      setTab(info);
      setTitle(info.title);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const normalized = useMemo(() => (tab ? normalizeUrl(tab.url) : ''), [tab]);

  const exists = useMemo(
    () =>
      (vault?.bookmarks ?? []).some(b => normalizeUrl(b.url) === normalized),
    [vault?.bookmarks, normalized],
  );
  const canSave = tab !== null && !exists && !saving;

  const submit = useCallback(
    async (e: SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!tab || !canSave) return;

      setSaving(true);
      setError('');

      try {
        const res = await sendMessage({
          type: 'SAVE_BOOKMARK',
          url: tab.url,
          title,
          description: description || undefined,
          favicon: tab.favicon,
        });
        if (res.ok) {
          await refresh();
          onDone();
        } else {
          setError(res.error);
        }
      } finally {
        setSaving(false);
      }
    },
    [tab, canSave, title, description, onDone, refresh],
  );

  const openBookmark = useCallback(async (b: BookmarkRecord) => {
    await browser.tabs.create({url: b.url});
    void sendMessage({type: 'RECORD_VISIT', id: b.id});
  }, []);

  // Sends DELETE_BOOKMARK to the background; the persisted vault
  // change then trips the useVault storage listener, which refreshes
  // the list — so no local optimistic state is kept here.
  const deleteBookmark = useCallback(
    async (id: string) => {
      const res = await sendMessage({type: 'DELETE_BOOKMARK', id});
      if (res.ok) await refresh();
    },
    [refresh],
  );

  // Opens the full-page manager in a new tab, then dismisses the
  // popup. The manager is a separate WXT entrypoint (manager.html)
  // that runs its own auth gate against the same background state.
  const openManager = useCallback(async () => {
    await browser.tabs.create({url: browser.runtime.getURL('/manager.html')});
    window.close();
  }, []);

  const recent = useMemo(
    () =>
      (vault?.bookmarks ?? [])
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5),
    [vault?.bookmarks],
  );

  return {
    tab,
    title,
    setTitle,
    description,
    setDescription,
    saving,
    error,
    exists,
    canSave,
    submit,
    openBookmark,
    deleteBookmark,
    openManager,
    recent,
  };
}

function RecentRow({
  bookmark,
  onOpen,
  onDelete,
}: {
  bookmark: BookmarkRecord;
  onOpen: (b: BookmarkRecord) => void;
  onDelete: (id: string) => void;
}) {
  const [faviconOk, setFaviconOk] = useState(true);
  const initial = bookmark.title.slice(0, 1).toUpperCase();
  return (
    <li key={bookmark.id} className="recent__item">
      <div
        className="recent__main"
        onClick={() => onOpen(bookmark)}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen(bookmark);
          }
        }}
      >
        <span className="recent__favicon">
          {faviconOk && bookmark.favicon ? (
            <img
              src={bookmark.favicon}
              alt=""
              onError={() => setFaviconOk(false)}
            />
          ) : (
            <span className="recent__initial">{initial}</span>
          )}
        </span>
        <span className="recent__text">
          <span className="recent__title">{bookmark.title}</span>
          <span className="recent__domain">{getDomain(bookmark.url)}</span>
        </span>
      </div>
      <button
        type="button"
        className="recent__delete"
        aria-label="Delete bookmark"
        onClick={() => onDelete(bookmark.id)}
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
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </button>
    </li>
  );
}

/**
 * Popup view for saving the currently active tab as a bookmark. Renders
 * the current tab card, editable title + optional note, a save button
 * (disabled when the URL is already bookmarked), and a list of the five
 * most recent bookmarks. Saving sends `SAVE_BOOKMARK` to the background
 * and refreshes the vault; opening a recent bookmark opens it in a new
 * tab and records the visit.
 */
export function UnlockedView({onDone}: Props) {
  const {
    tab,
    title,
    setTitle,
    description,
    setDescription,
    saving,
    error,
    exists,
    canSave,
    submit,
    openBookmark,
    deleteBookmark,
    openManager,
    recent,
  } = useUnlockedView(onDone);

  return (
    <div className="view view--unlocked">
      <header className="unlocked__header">
        <div className="unlocked__eyebrow">
          <span>Veil</span>
        </div>
        <h1 className="view__title">Save current page</h1>
        <p className="view__subtitle">Save this tab to your encrypted vault.</p>
      </header>
      {tab ? (
        <form className="unlocked__form" onSubmit={submit}>
          <div className="current-card">
            {tab.favicon && (
              <img className="current-card__favicon" src={tab.favicon} alt="" />
            )}
            <div className="current-card__meta">
              <div className="current-card__title">{tab.title}</div>
              <div className="current-card__url">{getDomain(tab.url)}</div>
            </div>
          </div>
          <input
            className="field__input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title"
          />
          <input
            className="field__input"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Note (optional)"
          />
          {exists && <p className="hint">This page is already bookmarked</p>}
          {error && <p className="error">{error}</p>}
          <button className="btn btn--primary btn--block" disabled={!canSave}>
            {saving ? 'Saving…' : exists ? 'Saved' : 'Save'}
          </button>
        </form>
      ) : (
        <p className="unlocked__empty">No URL to save on the current tab.</p>
      )}
      <h2 className="unlocked__section">Recent bookmarks</h2>
      {recent.length === 0 ? (
        <p className="recent__empty">No bookmarks yet</p>
      ) : (
        <ul className="recent">
          {recent.map(b => (
            <RecentRow
              key={b.id}
              bookmark={b}
              onOpen={openBookmark}
              onDelete={deleteBookmark}
            />
          ))}
        </ul>
      )}
      <button
        type="button"
        className="btn btn--ghost btn--block"
        onClick={() => void openManager()}
      >
        Open manager
      </button>
    </div>
  );
}
