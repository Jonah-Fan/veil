export const STORAGE_KEYS = {
  VAULT: 'vault',
  SETTINGS: 'settings',
  META: 'meta',
  AUTH_STATE: 'auth-state',
} as const;

export type AuthState = 'UNINITIALIZED' | 'LOCKED' | 'UNLOCKED' | 'LOADING';

export interface BookmarkRecord {
  id: string;
  url: string;
  title: string;
  description?: string;
  favicon?: string;
  tags: string[];
  folderId: string | null;
  order?: number;
  createdAt: number;
  visitedAt: number;
  visitCount: number;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
}

export interface VaultBlob {
  salt: string;
  iv: string;
  verifier: string;
  ciphertext: string;
}

export interface VaultData {
  bookmarks: BookmarkRecord[];
  folders: Folder[];
}

export interface Settings {
  autoLockMinutes: number;
  version: number;
}

export const DEFAULT_SETTINGS: Settings = {autoLockMinutes: 5, version: 1};

export interface Meta {
  createdAt: number;
  lastBackupAt: number | null;
  bookmarkCount: number;
}

export interface AuthStateRecord {
  failedAttempts: number;
  lockedUntil: number;
}
