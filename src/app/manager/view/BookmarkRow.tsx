import {useCallback, useState} from 'react';
import {browser} from 'wxt/browser';
import {sendMessage} from '@/services/messaging/bridge';
import {getDomain} from '@/utils/url';
import {formatRelativeTime} from '@/utils/time';
import type {BookmarkRecord} from '@/types/vault';

interface Props {
  bookmark: BookmarkRecord;
  onDelete: (id: string) => void;
  onEditStart: (id: string) => void;
}

function useBookmarkRow(bookmark: BookmarkRecord) {
  const [faviconOk, setFaviconOk] = useState(true);

  const open = useCallback((): void => {
    void browser.tabs.create({url: bookmark.url});
    void sendMessage({type: 'RECORD_VISIT', id: bookmark.id});
  }, [bookmark.url, bookmark.id]);

  const domain = getDomain(bookmark.url);
  const time = formatRelativeTime(bookmark.visitedAt || bookmark.createdAt);
  const initial = bookmark.title.slice(0, 1).toUpperCase();

  return {
    open,
    faviconOk,
    setFaviconOk,
    domain,
    time,
    initial,
  };
}

export function BookmarkRow({bookmark, onDelete, onEditStart}: Props) {
  const r = useBookmarkRow(bookmark);

  return (
    <div className="mrow">
      <span className="mrow__accent" aria-hidden="true" />
      <button
        type="button"
        className="mrow__favicon"
        onClick={r.open}
        aria-label="Open bookmark"
      >
        {r.faviconOk && bookmark.favicon ? (
          <img
            src={bookmark.favicon}
            alt=""
            onError={() => r.setFaviconOk(false)}
          />
        ) : (
          <span className="mrow__initial">{r.initial}</span>
        )}
      </button>
      <button type="button" className="mrow__main" onClick={r.open}>
        <span className="mrow__title">{bookmark.title}</span>
        <span className="mrow__domain">{r.domain}</span>
        {bookmark.description && (
          <span className="mrow__desc">{bookmark.description}</span>
        )}
        {bookmark.tags.length > 0 && (
          <span className="mrow__tags">
            {bookmark.tags.map(t => (
              <span key={t} className="mrow__tag">
                {t}
              </span>
            ))}
          </span>
        )}
      </button>
      <span className="mrow__time">{r.time}</span>
      <button
        type="button"
        className="mrow__action mrow__action--edit"
        aria-label="Edit bookmark"
        onClick={() => onEditStart(bookmark.id)}
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
        className="mrow__action mrow__action--danger"
        aria-label="Delete bookmark"
        onClick={() => void onDelete(bookmark.id)}
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
    </div>
  );
}
