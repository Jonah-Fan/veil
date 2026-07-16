import {useCallback, useEffect, useState} from 'react';
import {browser} from 'wxt/browser';
import {sendMessage} from '@/services/messaging/bridge';
import {STORAGE_KEYS, type VaultData} from '@/types/vault';

export interface VaultState {
  vault: VaultData | null;
  refresh: () => Promise<void>;
}

export function useVault(): VaultState {
  const [vault, setVault] = useState<VaultData | null>(null);

  const refresh = useCallback(async () => {
    const res = await sendMessage({type: 'GET_BOOKMARKS'});
    setVault(res.ok ? res.data : null);
  }, []);

  useEffect(() => {
    void refresh();
    const listener = (changes: Record<string, unknown>, area: string) => {
      if (area === 'local' && STORAGE_KEYS.VAULT in changes) void refresh();
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, [refresh]);

  return {vault, refresh};
}
