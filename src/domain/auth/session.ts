import {browser} from 'wxt/browser';
import {encryptVault} from '@/services/crypto';
import {getAuthState} from '@/services/storage/auth-state';
import {
  getVault,
  isInitialized,
  setVault,
  updateMeta,
} from '@/services/storage/vault';
import type {AuthState, VaultBlob, VaultData} from '@/types/vault';

export const AUTO_LOCK_ALARM = 'auto-lock';

interface SessionState {
  auth: AuthState;
  aesKey: CryptoKey | null;
  vault: VaultData | null;
  vaultStorage: VaultBlob | null;
  failedAttempts: number;
  lockedUntil: number;
}

export const state: SessionState = {
  auth: 'LOADING',
  aesKey: null,
  vault: null,
  vaultStorage: null,
  failedAttempts: 0,
  lockedUntil: 0,
};

let initPromise: Promise<void> | null = null;

export function initSession(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = doInit().catch((e: unknown) => {
    initPromise = null;
    throw e;
  });
  return initPromise;
}

async function doInit(): Promise<void> {
  state.vaultStorage = await getVault();
  state.auth = isInitialized(state.vaultStorage) ? 'LOCKED' : 'UNINITIALIZED';
  const auth = await getAuthState();
  state.failedAttempts = auth.failedAttempts;
  state.lockedUntil = auth.lockedUntil;
}

export function resetInitCache(): void {
  initPromise = null;
}

export function isUnlocked(): boolean {
  return state.auth === 'UNLOCKED';
}

export function isUninitialized(): boolean {
  return state.auth === 'UNINITIALIZED';
}

export function lockNow(): void {
  state.aesKey = null;
  state.vault = null;
  state.auth = 'LOCKED';
  void browser.alarms.clear(AUTO_LOCK_ALARM);
}

export async function persistVault(): Promise<void> {
  if (!state.aesKey || !state.vault || !state.vaultStorage) {
    throw new Error('Vault not unlocked');
  }
  const {salt, verifier} = state.vaultStorage;
  const {iv, ciphertext} = await encryptVault(state.aesKey, state.vault);
  const blob: VaultBlob = {salt, iv, verifier, ciphertext};
  state.vaultStorage = blob;
  await setVault(blob);
  await updateMeta({bookmarkCount: state.vault.bookmarks.length});
}

export function setupStartupListener(): void {
  browser.runtime.onStartup.addListener(() => {
    void initSession().catch(() => {});
  });
}
