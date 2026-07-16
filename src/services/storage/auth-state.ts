/**
 * Persistence helpers for the rate-limit state (`STORAGE_KEYS.AUTH_STATE`)
 * in `chrome.storage.local`.
 *
 * Holds the consecutive failed unlock attempts and the lockout deadline
 * so they survive a service-worker restart. The background mirrors its
 * in-memory counters here on each failure; this module just reads,
 * writes, and clears that record. Defaults missing fields to 0 so a
 * fresh or partially-stored record is always well-formed.
 */

import {browser} from 'wxt/browser';
import {type AuthStateRecord, STORAGE_KEYS} from '@/types/vault';

/**
 * Reads the persisted rate-limit record, defaulting any missing fields
 * to 0 (no failed attempts, no active lockout).
 *
 * @returns A well-formed {@link AuthStateRecord}.
 */
export async function getAuthState(): Promise<AuthStateRecord> {
  const res = await browser.storage.local.get(STORAGE_KEYS.AUTH_STATE);
  const raw = res[STORAGE_KEYS.AUTH_STATE] ?? {};
  const stored = raw as Partial<AuthStateRecord>;
  return {
    failedAttempts: stored.failedAttempts ?? 0,
    lockedUntil: stored.lockedUntil ?? 0,
  };
}

/**
 * Persists the rate-limit record, overwriting any prior value.
 *
 * @param r The record to store.
 */
export async function setAuthState(r: AuthStateRecord): Promise<void> {
  await browser.storage.local.set({[STORAGE_KEYS.AUTH_STATE]: r});
}

/**
 * Removes the rate-limit record, resetting attempts and lockout to a
 * clean state (equivalent to `getAuthState` returning all zeros).
 */
export async function clearAuthState(): Promise<void> {
  await browser.storage.local.remove(STORAGE_KEYS.AUTH_STATE);
}
