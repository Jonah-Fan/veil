/**
 * Heuristic password-strength scoring for the master-password UI.
 *
 * `evaluatePassword` scores a candidate password 0–4 from simple rules
 * (length, mixed case, digits, symbols) and returns a human-readable
 * label plus a list of unmet requirements. The score is a UI hint only —
 * it is not real entropy — and must not be relied on for security
 * decisions. Pure functions, no state, no side effects.
 */

/** Password-strength result. `score` is a UI hint only, not real entropy. */
export interface PasswordStrength {
  /** Heuristic strength, 0 (weakest) to 4 (strongest). */
  score: 0 | 1 | 2 | 3 | 4;
  /** Human-readable strength label, indexed by `score`. */
  label: string;
  /** Unmet requirement hints to show the user. */
  issues: string[];
}

/** Strength labels, indexed by `score` (0–4) for the meter. */
const LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;

/** Matches a lowercase ASCII letter. */
const RE_LOWER = /[a-z]/;
/** Matches an uppercase ASCII letter. */
const RE_UPPER = /[A-Z]/;
/** Matches an ASCII digit. */
const RE_DIGIT = /[0-9]/;
/** Matches any non-alphanumeric character (i.e. a symbol). */
const RE_SYMBOL = /[^a-zA-Z0-9]/;

/** Clamps a raw score to the `0–4` range and narrows it to a valid score. */
function clampScore(n: number): PasswordStrength['score'] {
  return Math.max(0, Math.min(4, n)) as PasswordStrength['score'];
}

/** Character-class features extracted from a candidate password. */
interface Features {
  /** Password length. */
  len: number;
  /** Contains at least one lowercase letter. */
  hasLower: boolean;
  /** Contains at least one uppercase letter. */
  hasUpper: boolean;
  /** Contains at least one digit. */
  hasDigit: boolean;
  /** Contains at least one symbol. */
  hasSymbol: boolean;
}

/** Extracts length and character-class features from a password. */
function extractFeatures(pw: string): Features {
  return {
    len: pw.length,
    hasLower: RE_LOWER.test(pw),
    hasUpper: RE_UPPER.test(pw),
    hasDigit: RE_DIGIT.test(pw),
    hasSymbol: RE_SYMBOL.test(pw),
  };
}

/**
 * Scores password strength: returns a 0–4 score, a label, and a list of
 * unmet requirements. `score` is a UI hint only — not real entropy — and
 * must not be used for security decisions.
 *
 * @param pw The candidate password to evaluate.
 * @returns A {@link PasswordStrength} with score, label, and issues.
 */
export function evaluatePassword(pw: string): PasswordStrength {
  const f = extractFeatures(pw);

  const rules: [boolean, string][] = [
    [f.len < 8, 'At least 8 characters'],
    [f.len < 12, '12+ characters recommended'],
    [!f.hasLower, 'Add a lowercase letter'],
    [!f.hasUpper, 'Add an uppercase letter'],
    [!f.hasDigit, 'Add a digit'],
    [!f.hasSymbol, 'Add a symbol'],
  ];
  const issues = rules.flatMap(([cond, msg]) => (cond ? [msg] : []));

  const score = clampScore(
    (f.len >= 8 ? 1 : 0) +
      (f.len >= 12 ? 1 : 0) +
      (f.hasLower && f.hasUpper ? 1 : 0) +
      (f.hasDigit ? 1 : 0) +
      (f.hasSymbol ? 1 : 0),
  );

  return {
    score,
    label: LABELS[score],
    issues,
  };
}
