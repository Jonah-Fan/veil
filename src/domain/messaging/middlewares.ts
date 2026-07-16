/**
 * Dispatch middlewares: guards applied to handlers that short-circuit a
 * message with an error response when a precondition isn't met (vault
 * unlocked, vault uninitialized, or unlockable / not rate-limited).
 *
 * Split out of the router so handlers import the guards from here rather
 * than from the router — this is what breaks the router↔handlers cycle
 * (handlers → middlewares, while the router → handlers one-way).
 */

import {error} from '@/types/messages';
import {isUninitialized, isUnlocked, state} from '@/domain/auth/session';
import {isRateLimited} from '@/domain/auth/rate-limit';
import type {Middleware} from '@/domain/messaging/types';

/** Requires the vault to be unlocked; rejects with "Locked" otherwise. */
export const requireUnlocked: Middleware = handler => msg => {
  if (!isUnlocked()) return Promise.resolve(error('Locked'));
  return handler(msg);
};

/**
 * Requires the vault to be uninitialized; rejects with
 * "Already initialized" otherwise.
 */
export const requireUninitialized: Middleware = handler => msg => {
  if (!isUninitialized()) return Promise.resolve(error('Already initialized'));
  return handler(msg);
};

/**
 * Requires the vault to be present and not rate-limited; rejects
 * otherwise.
 */
export const requireUnlockable: Middleware = handler => msg => {
  if (isUnlocked()) return Promise.resolve(error('Already unlocked'));
  if (!state.vaultStorage)
    return Promise.resolve(error('Vault not initialized'));
  if (isRateLimited()) return Promise.resolve(error('Rate limited'));
  return handler(msg);
};
