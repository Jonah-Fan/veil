import {useCallback, useEffect, useState} from 'react';
import {sendMessage} from '@/services/messaging/bridge';
import type {StatePayload} from '@/types/messages';

export interface AuthState {
  state: StatePayload | null;
  refresh: () => Promise<void>;
}

const POLL_MS = 1000;

export function useAuthState(): AuthState {
  const [state, setState] = useState<StatePayload | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    const res = await sendMessage({type: 'GET_STATE'});
    if (res.ok) {
      setState(res.data);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return {state, refresh};
}
