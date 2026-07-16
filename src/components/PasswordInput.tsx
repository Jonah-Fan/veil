/**
 * PasswordInput — controlled password field with a show/hide toggle.
 *
 * Renders an `<input>` that switches between `password` (masked) and
 * `text` (visible) via a trailing eye/eye-off button. The toggle button
 * is removed from the tab order (`tabIndex={-1}`) and carries an
 * `aria-label`, so it is reachable by screen readers but skipped during
 * keyboard field navigation. Pure presentational; value is controlled by
 * the parent via `value`/`onChange`. Note: while visible, the password
 * exists as cleartext in the DOM, so it may be exposed to autofill or
 * screen-sharing — a standard trade-off for this control.
 */

import {useState} from 'react';

/** Props accepted by {@link PasswordInput}. */
interface Props {
  /** Current password value (controlled). */
  value: string;
  /** Called with the new value on each input change. */
  onChange: (v: string) => void;
  /** Optional placeholder text for the input. */
  placeholder?: string;
  /** Focus the input on mount. */
  autoFocus?: boolean;
}

/**
 * Controlled password input with a show/hide visibility toggle. The eye
 * button flips masking; the toggle is excluded from tab order and
 * labeled for assistive tech.
 */
export function PasswordInput({
  value,
  onChange,
  placeholder,
  autoFocus,
}: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-row">
      <input
        className="password-input"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        className="toggle-btn"
        tabIndex={-1}
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
