import {InitializeView} from '@/app/popup/view/InitializeView';
import {LockedView} from '@/app/popup/view/LockedView';
import {UnlockedView} from '@/app/popup/view/UnlockedView';
import {useAuthState} from '@/app/hooks/useAuthState';

export function App() {
  const {state, refresh} = useAuthState();
  if (!state) return <div className="loading">Loading…</div>;
  switch (state.auth) {
    case 'UNINITIALIZED':
      return <InitializeView onDone={refresh} />;
    case 'LOCKED':
      return <LockedView state={state} onDone={refresh} />;
    case 'UNLOCKED':
      return <UnlockedView onDone={refresh} />;
    default:
      return <div className="loading">Loading…</div>;
  }
}
