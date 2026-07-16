import {setAuthState} from '@/services/storage/auth-state';
import {state} from '@/domain/auth/session';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;

export function isRateLimited(): boolean {
  if (state.lockedUntil <= 0) return false;
  if (state.lockedUntil > Date.now()) return true;
  state.lockedUntil = 0;
  state.failedAttempts = 0;
  return false;
}

export async function recordFailedAttempt(): Promise<void> {
  state.failedAttempts += 1;
  if (state.failedAttempts >= MAX_ATTEMPTS) {
    state.lockedUntil = Date.now() + LOCK_MS;
  }
  await setAuthState({
    failedAttempts: state.failedAttempts,
    lockedUntil: state.lockedUntil,
  });
}
