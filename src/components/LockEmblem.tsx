/**
 * LockEmblem — the shared padlock SVG used by both auth views.
 *
 * Pure presentational SVG. The `variant` picks the CSS namespace (`init__`
 * for first-time setup, `lock__` for unlock) and the per-variant state drives
 * the modifier class. Each variant keeps its own CSS so its visual behavior
 * stays independent: the init shackle animates closed when sealed, while the
 * lock shackle is static and tints by state.
 */

/** Lock-variant emblem state — drives the modifier class. */
export type LockEmblemLockState = 'primed' | 'blocked' | 'error';

/**
 * Props discriminated by `variant`: each variant accepts only the state
 * shape it actually uses, so an init emblem can only take `sealed` and a
 * lock emblem can only take `state`.
 */
export type LockEmblemProps =
  | {variant: 'init'; sealed: boolean}
  | {variant: 'lock'; state?: LockEmblemLockState};

/**
 * Render the padlock emblem. `variant` selects the CSS prefix; the
 * variant-specific state selects the modifier class (or none).
 *
 * @param props - variant plus that variant's state.
 */
export function LockEmblem(props: LockEmblemProps) {
  const prefix = props.variant === 'init' ? 'init__' : 'lock__';
  let mod: string;
  if (props.variant === 'init') {
    mod = props.sealed ? ' init__emblem--sealed' : '';
  } else {
    mod = props.state ? ` ${prefix}emblem--${props.state}` : '';
  }

  return (
    <div className={`${prefix}emblem${mod}`} aria-hidden="true">
      <svg viewBox="0 0 64 72">
        <g className={`${prefix}shackle`}>
          <path d="M20 32 V22 a12 12 0 0 1 24 0 V32" />
        </g>
        <rect
          className={`${prefix}body`}
          x="12"
          y="30"
          width="40"
          height="36"
          rx="9"
        />
        <g className={`${prefix}keyhole`}>
          <circle cx="32" cy="45" r="4.5" />
          <path d="M32 49.5 v6.5" />
        </g>
      </svg>
    </div>
  );
}
