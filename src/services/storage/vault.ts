import {browser} from 'wxt/browser';
import {
  DEFAULT_SETTINGS,
  type Meta,
  type Settings,
  STORAGE_KEYS,
  type VaultBlob,
} from '@/types/vault';

export async function getVault(): Promise<VaultBlob | null> {
  const res = await browser.storage.local.get(STORAGE_KEYS.VAULT);
  return (res[STORAGE_KEYS.VAULT] as VaultBlob | undefined) ?? null;
}

export async function setVault(blob: VaultBlob): Promise<void> {
  await browser.storage.local.set({[STORAGE_KEYS.VAULT]: blob});
}

export function isInitialized(blob: VaultBlob | null): boolean {
  if (blob === null) return false;
  return !!blob.salt && !!blob.iv && !!blob.verifier && !!blob.ciphertext;
}

export async function getSettings(): Promise<Settings> {
  const res = await browser.storage.local.get(STORAGE_KEYS.SETTINGS);
  const raw = res[STORAGE_KEYS.SETTINGS] ?? {};
  const stored = raw as Partial<Settings>;
  return {...DEFAULT_SETTINGS, ...stored};
}

// export async function setSettings(patch: Partial<Settings>): Promise<void> {
//   const current = await getSettings();
//   await browser.storage.local.set({
//     [STORAGE_KEYS.SETTINGS]: {...current, ...patch},
//   });
// }

// export async function getMeta(): Promise<Meta | null> {
//   const res = await browser.storage.local.get(STORAGE_KEYS.META);
//   return (res[STORAGE_KEYS.META] as Meta | undefined) ?? null;
// }

export async function updateMeta(patch: Partial<Meta>): Promise<void> {
  const res = await browser.storage.local.get(STORAGE_KEYS.META);
  const current = (res[STORAGE_KEYS.META] ?? {}) as Partial<Meta>;
  const next: Meta = {
    createdAt: current.createdAt ?? Date.now(),
    lastBackupAt: current.lastBackupAt ?? null,
    bookmarkCount: current.bookmarkCount ?? 0,
    ...patch,
  };
  await browser.storage.local.set({[STORAGE_KEYS.META]: next});
}

// export async function clearVaultAndMeta(): Promise<void> {
//   await browser.storage.local.remove(
//   [STORAGE_KEYS.VAULT, STORAGE_KEYS.META]);
// }
