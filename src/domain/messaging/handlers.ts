/**
 * The seven message handlers, exported as a static `handlers` map keyed
 * by message `type` with middlewares applied at the definition site.
 *
 * Importing the middlewares from `middlewares.ts` (rather than the
 * router) is what keeps the router→handlers edge one-directional —
 * handlers never import the router, so there is no cycle.
 *
 * `state.vault!` non-null assertions in the unlocked handlers are
 * load-bearing: the `requireUnlocked` middleware guarantees
 * `auth === 'UNLOCKED'` ⟹ `vault != null`. Preserve them — do not
 * "improve" to safe accessors.
 */

import {
  authenticateAndDeriveKey,
  base64ToBytes,
  bytesEqual,
  decryptVault,
  initializeVault,
  uuid,
} from '@/services/crypto';
import {clearAuthState} from '@/services/storage/auth-state';
import {
  getSettings,
  isInitialized,
  setVault,
  updateMeta,
} from '@/services/storage/vault';
import {normalizeUrl} from '@/utils/url';
import type {BookmarkRecord, Folder} from '@/types/vault';
import type {Message} from '@/types/messages';
import {error, ok} from '@/types/messages';
import {
  isUnlocked,
  lockNow,
  persistVault,
  resetInitCache,
  state,
} from '@/domain/auth/session';
import {recordFailedAttempt} from '@/domain/auth/rate-limit';
import {scheduleAutoLock} from '@/domain/auth/auto-lock';
import {
  requireUninitialized,
  requireUnlockable,
  requireUnlocked,
} from '@/domain/messaging/middlewares';
import type {Handler} from '@/domain/messaging/types';

/** The typed handler map keyed by message `type`. */
type HandlerMap = {[K in Message['type']]?: Handler<K>};

/** The seven handlers, with middlewares applied at the definition site. */
export const handlers: HandlerMap = {
  GET_STATE: async () => {
    const {autoLockMinutes} = await getSettings();
    return ok({
      auth: state.auth,
      initialized: isInitialized(state.vaultStorage),
      failedAttempts: state.failedAttempts,
      lockedUntil: state.lockedUntil,
      autoLockMinutes,
    });
  },

  INIT: requireUninitialized(async msg => {
    state.vaultStorage = await initializeVault(msg.password);
    await setVault(state.vaultStorage);
    state.aesKey = null;
    state.vault = null;
    state.auth = 'LOCKED';
    state.failedAttempts = 0;
    state.lockedUntil = 0;
    resetInitCache();
    await clearAuthState();
    await updateMeta({createdAt: Date.now(), bookmarkCount: 0});
    return ok(undefined);
  }),

  UNLOCK: requireUnlockable(async msg => {
    const {encryptionKey, verifier} = await authenticateAndDeriveKey(
      msg.password,
      state.vaultStorage!.salt,
    );
    const expected = base64ToBytes(state.vaultStorage!.verifier);
    if (!bytesEqual(verifier, expected)) {
      await recordFailedAttempt();
      return error('Wrong password');
    }
    state.aesKey = encryptionKey;
    state.vault = await decryptVault(encryptionKey, state.vaultStorage!);
    state.auth = 'UNLOCKED';
    state.failedAttempts = 0;
    state.lockedUntil = 0;
    await clearAuthState();
    await scheduleAutoLock();
    return ok(undefined);
  }),

  LOCK: async () => {
    lockNow();
    return ok(undefined);
  },

  SAVE_BOOKMARK: requireUnlocked(async msg => {
    const url = normalizeUrl(msg.url);
    const existing = state.vault!.bookmarks.find(
      b => normalizeUrl(b.url) === url,
    );
    let record: BookmarkRecord;

    if (existing) {
      existing.title = msg.title;
      if (msg.description !== undefined) existing.description = msg.description;
      if (msg.favicon !== undefined) existing.favicon = msg.favicon;
      record = existing;
    } else {
      record = {
        id: uuid(),
        url,
        title: msg.title,
        tags: [],
        folderId: null,
        createdAt: Date.now(),
        visitedAt: 0,
        visitCount: 0,
        order:
          state
            .vault!.bookmarks.filter(b => b.folderId === null)
            .reduce((m, b) => Math.max(m, b.order ?? -1), -1) + 1,
        ...(msg.description !== undefined && {
          description: msg.description,
        }),
        ...(msg.favicon !== undefined && {
          favicon: msg.favicon,
        }),
      };
      state.vault!.bookmarks.push(record);
    }

    await persistVault();
    return ok(record);
  }),

  UPDATE_BOOKMARK: requireUnlocked(async msg => {
    const b = state.vault!.bookmarks.find(x => x.id === msg.id);
    if (!b) return error('Not found');
    b.title = msg.title;
    if (msg.description !== undefined) {
      b.description = msg.description || undefined;
    }
    if (msg.tags !== undefined) b.tags = msg.tags;
    if (msg.folderId !== undefined) {
      b.folderId =
        msg.folderId !== null &&
        state.vault!.folders.some(f => f.id === msg.folderId)
          ? msg.folderId
          : null;
    }
    await persistVault();
    return ok(undefined);
  }),

  DELETE_BOOKMARK: requireUnlocked(async msg => {
    const idx = state.vault!.bookmarks.findIndex(b => b.id === msg.id);
    if (idx === -1) return error('Not found');
    state.vault!.bookmarks.splice(idx, 1);
    await persistVault();
    return ok(undefined);
  }),

  CREATE_FOLDER: requireUnlocked(async msg => {
    const folder: Folder = {
      id: uuid(),
      name: msg.name,
      parentId: null,
      order:
        state.vault!.folders.reduce((m, f) => Math.max(m, f.order), -1) + 1,
    };
    state.vault!.folders.push(folder);
    await persistVault();
    return ok(folder);
  }),

  UPDATE_FOLDER: requireUnlocked(async msg => {
    const f = state.vault!.folders.find(x => x.id === msg.id);
    if (!f) return error('Not found');
    f.name = msg.name;
    await persistVault();
    return ok(undefined);
  }),

  DELETE_FOLDER: requireUnlocked(async msg => {
    const idx = state.vault!.folders.findIndex(f => f.id === msg.id);
    if (idx === -1) return error('Not found');
    state.vault!.folders.splice(idx, 1);
    const moved = state
      .vault!.bookmarks.filter(b => b.folderId === msg.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const unfiledMax = state
      .vault!.bookmarks.filter(b => b.folderId === null)
      .reduce((m, b) => Math.max(m, b.order ?? -1), -1);
    moved.forEach((b, i) => {
      b.folderId = null;
      b.order = unfiledMax + 1 + i;
    });
    await persistVault();
    return ok(undefined);
  }),

  SET_FOLDER_ORDER: requireUnlocked(async msg => {
    const map = new Map(msg.ids.map((id, i) => [id, i]));
    for (const f of state.vault!.folders) {
      if (map.has(f.id)) f.order = map.get(f.id)!;
    }
    await persistVault();
    return ok(undefined);
  }),

  SET_BOOKMARK_ORDER: requireUnlocked(async msg => {
    const map = new Map(msg.ids.map((id, i) => [id, i]));
    for (const b of state.vault!.bookmarks) {
      if (b.folderId === msg.folderId && map.has(b.id)) {
        b.order = map.get(b.id)!;
      }
    }
    await persistVault();
    return ok(undefined);
  }),

  MOVE_BOOKMARK: requireUnlocked(async msg => {
    const b = state.vault!.bookmarks.find(x => x.id === msg.id);
    if (!b) return error('Not found');
    if (
      msg.folderId !== null &&
      !state.vault!.folders.some(f => f.id === msg.folderId)
    ) {
      return error('Folder not found');
    }
    b.folderId = msg.folderId;
    b.order =
      state
        .vault!.bookmarks.filter(
          x => x.folderId === msg.folderId && x.id !== msg.id,
        )
        .reduce((m, x) => Math.max(m, x.order ?? -1), -1) + 1;
    await persistVault();
    return ok(undefined);
  }),

  GET_BOOKMARKS: async () => {
    if (!isUnlocked()) return ok(null);
    return ok(state.vault);
  },

  RECORD_VISIT: requireUnlocked(async msg => {
    const b = state.vault!.bookmarks.find(x => x.id === msg.id);
    if (!b) return error('Not found');
    b.visitCount += 1;
    b.visitedAt = Date.now();
    await persistVault();
    return ok(undefined);
  }),
};
