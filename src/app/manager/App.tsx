/**
 * ManagerApp — root component for the full-page manager entrypoint.
 *
 * Shares the popup `App`'s auth gate via {@link useAuthState} (the 1Hz
 * `GET_STATE` poll) and routes to the matching auth view. The unlocked
 * branch renders the manager's own {@link ManagerView} rather than the
 * popup save form; `InitializeView`/`LockedView` are reused unchanged —
 * their logic is surface-agnostic, and the manager `styles.css` restyles
 * their classes for a full-page centered card. Unlock state lives in
 * the background service worker, so the poll is the page's only view
 * of it.
 */

import {InitializeView} from '@/app/popup/view/InitializeView';
import {LockedView} from '@/app/popup/view/LockedView';
import {ManagerView} from '@/app/manager/view/ManagerView';
import {useAuthState} from '@/app/hooks/useAuthState';

/** Root component for the full-page manager entrypoint. */
export function ManagerApp() {
  const {state, refresh} = useAuthState();
  if (!state) return <div className="loading">Loading…</div>;
  switch (state.auth) {
    case 'UNINITIALIZED':
      return <InitializeView onDone={refresh} />;
    case 'LOCKED':
      return <LockedView state={state} onDone={refresh} />;
    case 'UNLOCKED':
      return <ManagerView state={state} onDone={refresh} />;
    default:
      return <div className="loading">Loading…</div>;
  }
}
