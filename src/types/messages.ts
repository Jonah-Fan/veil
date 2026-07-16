/**
 * Strongly-typed message contract between the UI and the background
 * service worker.
 *
 * The UI sends a {@link Message} (a discriminated union keyed on `type`)
 * via `sendMessage` in `services/messaging/bridge.ts`; the background
 * replies with a {@link MessageResponse} envelope (`{ok, data}` on
 * success, `{ok: false, error}` on failure). {@link ResponseData} maps
 * each message `type` to the payload carried on success, and
 * {@link StatePayload} is the snapshot returned by `GET_STATE`. Nothing
 * in here runs at runtime except the `ok`/`error` constructors.
 */

import type {AuthState, BookmarkRecord, Folder, VaultData} from '@/types/vault';

/** Snapshot of auth/rate-limit state returned to the UI by `GET_STATE`. */
export interface StatePayload {
  /** Current auth phase. */
  auth: AuthState;
  /** Whether a vault blob exists on disk (i.e. initialization is done). */
  initialized: boolean;
  /** Count of consecutive failed unlock attempts. */
  failedAttempts: number;
  /**
   * Epoch ms until which unlock is rate-limited; 0 (or past) when not
   * locked out.
   */
  lockedUntil: number;
  /** Current auto-lock delay in minutes; `<= 0` disables auto-lock. */
  autoLockMinutes: number;
}

/**
 * Every message the UI can send to the background, discriminated by the
 * `type` field. Members:
 * - `GET_STATE` — fetch the current {@link StatePayload}.
 * - `INIT` — create the encrypted vault from a master password.
 * - `UNLOCK` — derive the key and decrypt the vault.
 * - `LOCK` — drop the in-memory key/vault and re-lock.
 * - `SAVE_BOOKMARK` — insert or update a bookmark by normalized URL.
 * - `UPDATE_BOOKMARK` — update a bookmark's title/description/tags/folder.
 * - `DELETE_BOOKMARK` — remove a bookmark by id.
 * - `CREATE_FOLDER` — create a root folder; returns it.
 * - `UPDATE_FOLDER` — rename a folder by id.
 * - `DELETE_FOLDER` — remove a folder; its bookmarks move to unfiled.
 * - `SET_FOLDER_ORDER` — rewrite folder display order from an id list.
 * - `SET_BOOKMARK_ORDER` — rewrite a folder's bookmark order from an id list.
 * - `MOVE_BOOKMARK` — move a bookmark to a folder (or unfiled) by id.
 * - `GET_BOOKMARKS` — fetch the decrypted vault (null when locked).
 * - `RECORD_VISIT` — bump a bookmark's visit count/timestamp.
 */
export type Message =
  | {type: 'GET_STATE'}
  | {type: 'INIT'; password: string}
  | {type: 'UNLOCK'; password: string}
  | {type: 'LOCK'}
  | {
      type: 'SAVE_BOOKMARK';
      url: string;
      title: string;
      description?: string;
      favicon?: string;
    }
  | {
      type: 'UPDATE_BOOKMARK';
      id: string;
      title: string;
      description?: string;
      tags?: string[];
      folderId?: string | null;
    }
  | {type: 'CREATE_FOLDER'; name: string}
  | {type: 'UPDATE_FOLDER'; id: string; name: string}
  | {type: 'DELETE_FOLDER'; id: string}
  | {type: 'SET_FOLDER_ORDER'; ids: string[]}
  | {type: 'SET_BOOKMARK_ORDER'; folderId: string | null; ids: string[]}
  | {type: 'MOVE_BOOKMARK'; id: string; folderId: string | null}
  | {type: 'DELETE_BOOKMARK'; id: string}
  | {type: 'GET_BOOKMARKS'}
  | {type: 'RECORD_VISIT'; id: string};

/**
 * Maps each {@link Message} `type` to the payload carried on a successful
 * response. `void` means the response carries no data.
 */
export interface ResponseDataMap {
  /** `GET_STATE` → the auth/rate-limit snapshot. */
  GET_STATE: StatePayload;
  /** `INIT` → no payload. */
  INIT: void;
  /** `UNLOCK` → no payload. */
  UNLOCK: void;
  /** `LOCK` → no payload. */
  LOCK: void;
  /** `SAVE_BOOKMARK` → the inserted/updated bookmark. */
  SAVE_BOOKMARK: BookmarkRecord;
  /** `UPDATE_BOOKMARK` → no payload. */
  UPDATE_BOOKMARK: void;
  /** `DELETE_BOOKMARK` → no payload. */
  DELETE_BOOKMARK: void;
  /** `CREATE_FOLDER` → the created folder. */
  CREATE_FOLDER: Folder;
  /** `UPDATE_FOLDER` → no payload. */
  UPDATE_FOLDER: void;
  /** `DELETE_FOLDER` → no payload. */
  DELETE_FOLDER: void;
  /** `SET_FOLDER_ORDER` → no payload. */
  SET_FOLDER_ORDER: void;
  /** `SET_BOOKMARK_ORDER` → no payload. */
  SET_BOOKMARK_ORDER: void;
  /** `MOVE_BOOKMARK` → no payload. */
  MOVE_BOOKMARK: void;
  /** `GET_BOOKMARKS` → the decrypted vault, or `null` when locked. */
  GET_BOOKMARKS: VaultData | null;
  /** `RECORD_VISIT` → no payload. */
  RECORD_VISIT: void;
}

/**
 * Resolves a message `type` to its success payload type via
 * {@link ResponseDataMap}.
 *
 * @template T A {@link Message} `type` literal.
 */
export type ResponseData<T extends Message['type']> = ResponseDataMap[T];

/**
 * Unified response envelope returned to the UI: success carries a `data`
 * payload, failure carries an `error` reason. Discriminate on the `ok`
 * flag.
 *
 * @template T The payload type carried on success.
 */
export type MessageResponse<T> =
  {ok: true; data: T} | {ok: false; error: string};

/**
 * Constructs a success response carrying the supplied payload back to the
 * caller.
 *
 * @param data The result to return on success.
 * @returns A `MessageResponse` discriminated as `ok: true`.
 */
export const ok = <T>(data: T): MessageResponse<T> => ({ok: true, data});

/**
 * Constructs a failure response carrying a human-readable error reason back
 * to the caller.
 *
 * @param error The failure reason to surface to the UI.
 * @returns A `MessageResponse` discriminated as `ok: false`.
 */
export const error = (error: string): MessageResponse<never> => ({
  ok: false,
  error,
});
