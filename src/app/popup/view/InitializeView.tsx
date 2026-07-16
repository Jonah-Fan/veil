/**
 * InitializeView — popup view shown when no vault exists yet.
 *
 * Collects a master password (twice, with a live strength meter and an
 * "irrecoverable" acknowledgment) and sends an `INIT` message to the
 * background to create the encrypted vault. On success, it calls `onDone`
 * so the parent can refresh auth state and route to the locked view.
 *
 * Pure presentational + local-form-state component; all crypto/storage
 * work happens in the background service worker.
 */

import {SubmitEvent, useCallback, useMemo, useState} from 'react';
import {sendMessage} from '@/services/messaging/bridge';
import {evaluatePassword} from '@/utils/password';
import {LockEmblem} from '@/components/LockEmblem';
import {PasswordInput} from '@/components/PasswordInput';

/** Props accepted by {@link InitializeView}. */
interface Props {
  /** Called once the vault has been created successfully. */
  onDone: () => void;
}

/**
 * Local form state and submit handler for the initialize view: password,
 * confirmation, the "irrecoverable" acknowledgment, plus the derived
 * strength meter and a `canSubmit` gate (length > 8, passwords match,
 * acknowledged, not loading). Submits via an `INIT` message.
 */
function useInitializeView(onDone: () => void) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ack, setAck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = useMemo(() => evaluatePassword(password), [password]);

  const canSubmit = useMemo(
    () => password.length >= 8 && password === confirm && ack && !loading,
    [password, confirm, ack, loading],
  );

  const submit = useCallback(
    async (e: SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!canSubmit) return;

      setLoading(true);
      setError('');

      try {
        const res = await sendMessage({type: 'INIT', password});
        if (res.ok) {
          onDone();
        } else {
          setError(res.error);
        }
      } finally {
        setLoading(false);
      }
    },
    [canSubmit, password, onDone],
  );

  return {
    password,
    setPassword,
    confirm,
    setConfirm,
    ack,
    setAck,
    loading,
    error,
    strength,
    canSubmit,
    submit,
  };
}

/**
 * Popup view for first-time vault creation. Renders the lock emblem, a
 * master-password form with confirmation + strength meter and the
 * irrecoverability acknowledgment, and creates the vault on submit.
 */
export function InitializeView({onDone}: Props) {
  const {
    password,
    setPassword,
    confirm,
    setConfirm,
    ack,
    setAck,
    loading,
    error,
    strength,
    canSubmit,
    submit,
  } = useInitializeView(onDone);

  return (
    <form className="view view--init" onSubmit={submit}>
      <LockEmblem variant="init" sealed={canSubmit} />

      <header className="init__header">
        <div className="init__eyebrow">
          <span>Veil</span>
        </div>
        <h1 className="view__title">Set master password</h1>
        <p className="view__subtitle">
          Encrypts your private bookmarks; cannot be recovered if lost.
        </p>
      </header>
      <PasswordInput
        value={password}
        onChange={setPassword}
        placeholder="Master password (≥8 chars)"
        autoFocus
      />
      <div className="strength">
        <div className={`strength__bar strength__bar--${strength.score}`} />
        <span className="strength__label">{strength.label}</span>
      </div>
      <PasswordInput
        value={confirm}
        onChange={setConfirm}
        placeholder="Re-enter password"
      />
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={ack}
          onChange={e => setAck(e.target.checked)}
        />
        <span>
          I understand bookmarks cannot be recovered without the password
        </span>
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn btn--primary btn--block" disabled={!canSubmit}>
        {loading ? 'Initializing…' : 'Create vault'}
      </button>
    </form>
  );
}
