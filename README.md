<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
  <img alt="Veil logo" src="assets/logo-light.svg" width="120" height="120">
</picture>

# Veil

[![Project Status: Active](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6)](https://www.typescriptlang.org/)
[![Build](https://img.shields.io/badge/WXT-0.20-34d399)](https://wxt.dev/)
[![GitHub release](https://img.shields.io/github/v/release/Jonah-Fan/veil?logo=github)](https://github.com/Jonah-Fan/veil/releases)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Veil is a privacy-first, fully local encrypted bookmark manager for Microsoft Edge. Each saved
page is sealed into an on-device vault behind a master password — a private **veil** of links
only you can open.

Veil is free and open source software.

## Table of contents

- [How it works](#how-it-works)
- [Getting started](#getting-started)
- [Building from source](#building-from-source)
- [Configuration reference](#configuration-reference)
- [Asking questions and reporting issues](#asking-questions-and-reporting-issues)
- [Contributing](#contributing)
- [License](#license)
- [Privacy](#privacy)

## How it works

Veil stores your bookmarks in an encrypted vault that lives only in `browser.storage.local`
on your device.

- **Encryption at rest:** AES-GCM-256, with a fresh random IV per save. Keys are derived from
  your master password with PBKDF2 (SHA-256, 600,000 iterations) and a per-vault random salt.
- **The master password is never written to disk.** While the vault is unlocked, only the
  derived `CryptoKey` and a verifier live in the service worker's memory; locking (or the idle
  auto-lock) clears them.
- **No network.** Veil has no network permissions, no analytics, and no third-party services.
  Your data never leaves your device.

> [!IMPORTANT]
> Because the master password is never stored, **it cannot be recovered**. If you forget it,
> the encrypted vault is unrecoverable.

Save the current page three ways: the popup form, the `Ctrl+Shift+S` keyboard shortcut, or the
right-click "Save with Veil" menu. The full-page manager (`/manager.html`) gives you folders,
tagging, drag-and-drop reordering, and editing.

## Getting started

Install Veil from the Microsoft Edge Add-ons store: _<link to be added on first publish>_.

Or build and load it from source (see below).

## Building from source

Requires Node 20+ and npm.

```bash
git clone https://github.com/Jonah-Fan/veil.git
cd veil
npm ci
npm run build
```

Load the built extension in Edge: open `edge://extensions`, enable **Developer mode**, and choose
**Load unpacked** pointing at `.output/chrome-mv3`.

> [!TIP]
> For an Edge-targeted build, run `npx wxt build --browser edge` (output `.output/edge-mv3`).

To produce a distributable zip:

```bash
npm run zip                   # .output/veil-0.1.0-chrome.zip
npx wxt zip --browser edge    # .output/veil-0.1.0-edge.zip
```

## Configuration reference

Veil is configured through its in-UI settings, not files:

| Setting           | Default           | Description                                  |
| ----------------- | ----------------- | -------------------------------------------- |
| Auto-lock         | 5 minutes         | Re-encrypt the vault after this idle period. |
| Unlock rate-limit | 5 attempts / 60 s | Cooldown after repeated wrong passwords.     |
| Save shortcut     | `Ctrl+Shift+S`    | Saves the current page.                      |

> [!NOTE]
> The save shortcut is managed by the browser; rebind it in `edge://extensions/shortcuts`, not
> in Veil.

## Asking questions and reporting issues

Open a [discussion or issue](https://github.com/Jonah-Fan/veil/issues). For security
vulnerabilities, see [SECURITY.md](SECURITY.md) — do **not** open a public issue.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). For anything beyond a small fix, please open an issue
first to agree the approach, and keep pull requests focused on one concern.

## License

MIT — see [LICENSE](LICENSE). Third-party attributions are in [NOTICE.md](NOTICE.md).

## Privacy

Veil collects no data and makes no network requests. See [PRIVACY.md](PRIVACY.md).
