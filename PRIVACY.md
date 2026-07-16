# Privacy Policy

Effective: 2026-07-16

Veil is a privacy-first, fully local encrypted bookmark manager. This policy explains
what data the extension handles — and, just as importantly, what it does not.

## In short

- **Veil does not collect, transmit, or sell any personal data.**
- Bookmarks are **encrypted at rest on your device** with AES-GCM-256.
- Your **master password is never written to disk** — it lives only in memory while the
  vault is unlocked.
- The extension has **no analytics, no telemetry, and no third-party services**. It makes
  **no network requests**.

## Data we store

All data is kept in `browser.storage.local` on your device:

- The **encrypted bookmark vault** (a salt, IV, verifier, and ciphertext). The cleartext
  bookmarks — URLs, titles, descriptions, tags, favicons, and folders — exist only inside
  the ciphertext and are decrypted in memory while the vault is unlocked.
- **Settings** such as the auto-lock idle timeout.
- **Rate-limit counters** (failed unlock attempts and a lockout deadline) — no password data.

Nothing is synced to any server. The extension has no network permissions.

## Cryptography

- Key derivation: PBKDF2 with SHA-256, 600,000 iterations, and a per-vault random salt.
- Encryption: AES-GCM 256-bit, with a fresh random IV per save.
- The master password is erased from memory as soon as the key is derived; only the derived
  `CryptoKey` and a verifier are kept, and only in memory.

> [!IMPORTANT]
> Because the master password is never stored, **it cannot be recovered**. If you forget it,
> the encrypted vault is unrecoverable.

## Permissions

Each permission and why it is needed:

- `storage` — store the encrypted vault and settings locally on the device.
- `tabs` — read the active tab's URL, title, and favicon at the moment you save a bookmark,
  so the entry is pre-filled. No page content or browsing history is accessed; nothing is sent.
- `contextMenus` — add the right-click "Save with Veil" menu item on pages and links.
- `alarms` — drive the idle auto-lock timer that clears the in-memory key and re-encrypts the vault.

Veil does **not** request any host permissions and makes no cross-origin requests.

## Your control

You can delete all Veil data at any time by uninstalling the extension, which removes its
local storage.

## Contact

Questions about privacy: **jonah-fan@outlook.com** with the subject `[veil privacy]`.
