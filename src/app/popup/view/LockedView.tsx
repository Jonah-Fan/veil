/**
 * LockedView — popup view shown when a vault exists but is locked.
 *
 * Collects the master password and sends an `UNLOCK` message to the
 * background; on success it calls `onDone` so the parent refreshes auth
 * state and routes to the unlocked view. On a wrong password it shows the
 * error, shakes the field, and clears the input. While the background's
 * rate-limit is active (`state.lockedUntil` in the future) the submit
 * button is disabled and a cooldown countdown is shown; a timer fires
 * `onDone` shortly after the lockout expires so the parent can re-poll.
 *
 * Pure presentational + local-form-state component; all crypto/storage
 * work happens in the background service worker.
 */

import {
  type SubmitEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {sendMessage} from '@/services/messaging/bridge';
import type {StatePayload} from '@/types/messages';
import {LockEmblem, type LockEmblemLockState} from '@/components/LockEmblem';
import {PasswordInput} from '@/components/PasswordInput';

/** Props accepted by {@link LockedView}. */
interface Props {
  /** Current auth/rate-limit snapshot from the background. */
  state: StatePayload;
  /** Called after a successful unlock, or after a lockout expires. */
  onDone: () => void;
}

/**
 * Local form state and submit handler for the locked view: the password,
 * loading/error/shake flags, the rate-limit countdown (`isLocked` +
 * `remainingMs`), and the derived {@link LockEmblemLockState} for the
 * emblem. Submits via an `UNLOCK` message. Two effects manage cleanup —
 * a timer to fire `onDone` once the lockout elapses, and clearing the
 * shake-animation timer on unmount.
 */
function useLockedView(state: StatePayload, onDone: () => void) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const isLocked = state.lockedUntil > Date.now();
  const remainingMs = Math.max(0, state.lockedUntil - Date.now());

  useEffect(() => {
    if (!isLocked) return;
    const timer = setTimeout(onDone, remainingMs + 50);
    return () => clearTimeout(timer);
  }, [isLocked, remainingMs, onDone]);

  useEffect(() => {
    return () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    };
  }, []);

  const submit = useCallback(
    async (e: SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isLocked || !password) return;

      setLoading(true);
      setError('');

      try {
        const res = await sendMessage({type: 'UNLOCK', password});
        if (res.ok) {
          onDone();
        } else {
          setError(res.error);
          setShake(true);
          setPassword('');
          shakeTimer.current = setTimeout(() => setShake(false), 400);
        }
      } finally {
        setLoading(false);
      }
    },
    [isLocked, password, onDone],
  );

  const emblemState: LockEmblemLockState | undefined = isLocked
    ? 'blocked'
    : shake
      ? 'error'
      : password
        ? 'primed'
        : undefined;

  return {
    password,
    setPassword,
    loading,
    error,
    shake,
    isLocked,
    remainingMs,
    emblemState,
    submit,
  };
}

/**
 * Popup view for unlocking an existing vault. Renders the lock emblem,
 * a master-password form (with shake-on-error + cooldown countdown),
 * and unlocks the vault on submit.
 */
export function LockedView({state, onDone}: Props) {
  const {
    password,
    setPassword,
    loading,
    error,
    shake,
    isLocked,
    remainingMs,
    emblemState,
    submit,
  } = useLockedView(state, onDone);

  return (
    <form className="view view--lock" onSubmit={submit}>
      <LockEmblem variant="lock" state={emblemState} />

      <header className="lock__header">
        <div className="lock__eyebrow">
          <span>Veil</span>
        </div>
        <h1 className="view__title">Unlock vault</h1>
        <p className="view__subtitle">
          Enter your master password to continue.
        </p>
      </header>

      <div className={shake ? 'shake' : undefined}>
        <PasswordInput
          value={password}
          onChange={setPassword}
          placeholder="Master password"
          autoFocus
        />
      </div>

      {isLocked && (
        <p className="lock__cooldown" role="status">
          Too many attempts. Try again in about{' '}
          <strong>{Math.ceil(remainingMs / 1000)}</strong> seconds.
        </p>
      )}
      {error && !isLocked && <p className="error">{error}</p>}

      <button
        className="btn btn--primary btn--block"
        disabled={isLocked || !password || loading}
      >
        {loading ? 'Unlocking…' : 'Unlock'}
      </button>
    </form>
  );
}
