// noinspection ExceptionCaughtLocallyJS

/**
 * Cryptographic primitives for the Veil vault.
 *
 * Derives an AES-GCM key and password verifier from the master password
 * via PBKDF2 (SHA-256, 600k iterations), and encrypts/decrypts the vault
 * blob with AES-GCM using a fresh random IV per save. Also validates
 * decrypted vault structure (lightweight, no zod), initializes an empty
 * encrypted vault, and exposes small helpers: UUID generation, base64
 * conversions, constant-time comparison, and secure buffer erasure.
 *
 * Uses only the native WebCrypto API; no third-party runtime deps (D3).
 */

import type {BookmarkRecord, Folder, VaultBlob, VaultData} from '@/types/vault';

/**
 * PBKDF2 iteration count; higher resists offline brute force but slows
 * derivation.
 */
const PBKDF2_ITERATIONS = 600_000;
/** AES-GCM key length in bits. */
const KEY_BITS = 256;
/**
 * Verifier length in bits; the tail of the derived bits, SHA-256'd, is
 * used to confirm the password at unlock.
 */
const VERIFIER_BITS = 256;
/** Salt size in bytes. */
const SALT_BYTES = 16;
/** AES-GCM initial-vector size in bytes (96 bits). */
const IV_BYTES = 12;
/** Hash algorithm used by PBKDF2. */
const PBKDF2_HASH = 'SHA-256';

/** Total bits derived per PBKDF2 call: key bits + verifier bits. */
const TOTAL_DERIVED_BITS = KEY_BITS + VERIFIER_BITS;

/**
 * Domain error thrown during (de)cryption, carrying a `code` that
 * distinguishes corruption / wrong password / invalid data so the UI can
 * pick its message text without matching on strings.
 */
export class VaultError extends Error {
  /**
   * Constructs a `VaultError` tagged with an error code.
   *
   * @param message Human-readable failure text.
   * @param code Failure category: corrupted / wrong password / invalid data.
   */
  constructor(
    message: string,
    public readonly code: 'CORRUPTED' | 'INVALID_PASSWORD' | 'INVALID_DATA',
  ) {
    super(message);
    this.name = 'VaultError';
  }
}

/**
 * Key and verifier derived from the master password. `encryptionKey` is
 * non-serializable and lives only in memory (D9).
 */
export interface KeyBundle {
  encryptionKey: CryptoKey;
  verifier: Uint8Array;
}

/**
 * Zeroes a buffer to minimize the memory residency of key/plaintext
 * derived bits.
 */
function secureErase(buf: Uint8Array | Uint8Array<ArrayBuffer>): void {
  if (buf?.fill) buf.fill(0);
}

/** Generates a random UUID (v4) via `crypto.randomUUID`. */
export function uuid(): string {
  return crypto.randomUUID();
}

/** Converts a byte array to a base64 string. */
export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * Converts a base64 string to a byte array (backed by an ArrayBuffer,
 * usable directly as a BufferSource).
 */
export function base64ToBytes(str: string): Uint8Array<ArrayBuffer> {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Constant-time comparison to avoid timing side-channels when matching
 * the verifier.
 */
export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Derives an AES-GCM key and a password verifier from the master password
 * via PBKDF2 (SHA-256, 600k iterations). A single `deriveBits` call yields
 * 512 bits: the first 256 become the key, the latter 256 are SHA-256'd
 * into the verifier. The `finally` block calls {@link secureErase} on the
 * password, derived bits, and key bytes to reduce key residency in memory.
 *
 * @param password The master password in cleartext.
 * @param saltBase64 The salt from the vault blob (base64).
 * @returns The derived {@link KeyBundle} (key + verifier).
 */
export async function authenticateAndDeriveKey(
  password: string,
  saltBase64: string,
): Promise<KeyBundle> {
  const salt = base64ToBytes(saltBase64);
  const passwordBytes = new TextEncoder().encode(password);

  let keyMaterial: CryptoKey | undefined;
  let derivedBits: Uint8Array | undefined;
  let encryptionKeyBytes: Uint8Array | undefined;

  try {
    keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBytes,
      {name: 'PBKDF2'},
      false,
      ['deriveBits'],
    );

    derivedBits = new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt,
          iterations: PBKDF2_ITERATIONS,
          hash: PBKDF2_HASH,
        },
        keyMaterial,
        TOTAL_DERIVED_BITS,
      ),
    );

    encryptionKeyBytes = derivedBits.slice(0, KEY_BITS / 8);
    const passwordVerifierInput = derivedBits.slice(KEY_BITS / 8);
    const [encryptionKey, passwordVerifier] = await Promise.all([
      crypto.subtle.importKey(
        'raw',
        encryptionKeyBytes.buffer as ArrayBuffer,
        {name: 'AES-GCM'},
        false,
        ['encrypt', 'decrypt'],
      ),
      crypto.subtle.digest('SHA-256', passwordVerifierInput),
    ]);
    return {
      encryptionKey,
      verifier: new Uint8Array(passwordVerifier),
    };
  } finally {
    secureErase(passwordBytes);
    secureErase(derivedBits!);
    secureErase(encryptionKeyBytes!);
  }
}

/**
 * Encrypts the whole cleartext vault with AES-GCM.
 * D2: uses a fresh random IV each time, persisted alongside the ciphertext,
 * to avoid IV reuse under a fixed key.
 *
 * @param encryptionKey The derived AES-GCM key.
 * @param data The cleartext {@link VaultData} to encrypt.
 * @returns The iv and ciphertext, both base64.
 */
export async function encryptVault(
  encryptionKey: CryptoKey,
  data: VaultData,
): Promise<{iv: string; ciphertext: string}> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      {name: 'AES-GCM', iv},
      encryptionKey,
      plaintext,
    ),
  );
  return {iv: bytesToBase64(iv), ciphertext: bytesToBase64(cipher)};
}

/**
 * Decrypts a vault blob and validates its structure; throws
 * {@link VaultError} on a wrong password or corrupted data.
 *
 * @param encryptionKey The key derived at unlock.
 * @param blob The persisted {@link VaultBlob}.
 * @returns The validated cleartext {@link VaultData}.
 */
export async function decryptVault(
  encryptionKey: CryptoKey,
  blob: VaultBlob,
): Promise<VaultData> {
  const iv = base64ToBytes(blob.iv);
  const cipher = base64ToBytes(blob.ciphertext);

  let plaintext: Uint8Array | undefined;
  try {
    plaintext = new Uint8Array(
      await crypto.subtle.decrypt({name: 'AES-GCM', iv}, encryptionKey, cipher),
    );
    const data = JSON.parse(new TextDecoder().decode(plaintext));
    if (!validateVaultData(data)) {
      throw new VaultError('Vault data structure is corrupted', 'CORRUPTED');
    }
    return normalizeVaultData(data);
  } catch (e) {
    if (e instanceof VaultError) throw e;
    throw new VaultError(
      'Failed to decrypt vault (invalid password or corrupted data)',
      'INVALID_PASSWORD',
    );
  } finally {
    if (plaintext) secureErase(plaintext);
  }
}

/**
 * Lightweight structural validation after decryption/import, avoiding zod
 * to keep zero third-party runtime dependencies (D3).
 *
 * @param x The parsed value to validate.
 * @returns Whether `x` matches the {@link VaultData} shape (narrows the type).
 */
export function validateVaultData(x: unknown): x is VaultData {
  if (!x || typeof x !== 'object') return false;
  const v = x as Record<string, unknown>;
  if (!Array.isArray(v.bookmarks) || !Array.isArray(v.folders)) return false;
  return v.bookmarks.every(isValidBookmark) && v.folders.every(isValidFolder);
}

/** Validates a single {@link BookmarkRecord}'s field shape. */
function isValidBookmark(b: unknown): b is BookmarkRecord {
  if (!b || typeof b !== 'object') return false;
  const x = b as Record<string, unknown>;
  return (
    typeof x.id === 'string' &&
    typeof x.url === 'string' &&
    typeof x.title === 'string' &&
    Array.isArray(x.tags) &&
    (x.folderId === null || typeof x.folderId === 'string') &&
    typeof x.createdAt === 'number' &&
    typeof x.visitedAt === 'number' &&
    typeof x.visitCount === 'number' &&
    (x.order === undefined || typeof x.order === 'number')
  );
}

/** Validates a single {@link Folder}'s field shape. */
function isValidFolder(f: unknown): f is Folder {
  if (!f || typeof f !== 'object') return false;
  const x = f as Record<string, unknown>;
  return (
    typeof x.id === 'string' &&
    typeof x.name === 'string' &&
    (x.parentId === null || typeof x.parentId === 'string') &&
    typeof x.order === 'number'
  );
}

/**
 * Normalizes a decrypted vault: backfills missing {@link BookmarkRecord.order}
 * per-folder (order is scoped within a folder), so old vaults predating the
 * `order` field open with a stable, unique order per scope. Existing `order`
 * values are preserved; only `undefined` ones are filled with the bucket
 * index. Runs on every decrypt — cheap and idempotent.
 *
 * @param v The validated cleartext vault.
 * @returns The same vault with `order` guaranteed on every bookmark.
 */
export function normalizeVaultData(v: VaultData): VaultData {
  const byFolder = new Map<string | null, BookmarkRecord[]>();
  for (const b of v.bookmarks) {
    const arr = byFolder.get(b.folderId) ?? [];
    arr.push(b);
    byFolder.set(b.folderId, arr);
  }
  for (const arr of byFolder.values()) {
    arr.forEach((b, i) => {
      if (b.order === undefined) b.order = i;
    });
  }
  return v;
}

/**
 * Initializes an empty encrypted vault from the master password:
 * generates salt/verifier and encrypts an empty {@link VaultData}.
 *
 * @param password The master password the user sets.
 * @returns A {@link VaultBlob} ready to persist.
 */
export async function initializeVault(password: string): Promise<VaultBlob> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const {encryptionKey, verifier} = await authenticateAndDeriveKey(
    password,
    bytesToBase64(salt),
  );
  const empty: VaultData = {bookmarks: [], folders: []};
  const {iv, ciphertext} = await encryptVault(encryptionKey, empty);
  return {
    salt: bytesToBase64(salt),
    iv,
    verifier: bytesToBase64(verifier),
    ciphertext,
  };
}
