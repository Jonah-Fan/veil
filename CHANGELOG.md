# Changelog

All notable changes to Veil are documented here.
The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/).

## [Unreleased]

### Changed

- Bumped TypeScript from 5.9.3 to 6.0.3 (pinned to `~6.0.3` to stay within
  `typescript-eslint`'s peer range; no source changes needed). TypeScript 7 was
  attempted but rolled back — no released `typescript-eslint` supports it yet.
- Bumped `eslint-plugin-react-hooks` from 5.2.0 to 7.1.1. The 5.x
  `configs['recommended-latest']` preset used the legacy `plugins: []` array
  form, which ESLint 9 flat config rejects; switched to the required object
  form with the two core rules enabled explicitly (matching the old preset,
  without the React Compiler rules the 7.x presets bundle).

## [0.1.0] - 2026-07-16

### Added

- **Encrypted bookmark vault**: AES-GCM-256 at rest with a 600,000-iteration PBKDF2
  (SHA-256) key derivation and a per-vault random salt. The master password is never
  written to disk — only an in-memory `CryptoKey` and a verifier are used.
- **Popup save flow**: captures the active tab's URL, title, and favicon and saves it as
  an encrypted bookmark (de-duplicated by normalized URL); lists the five most recent
  bookmarks and links into the full-page manager.
- **Save-page command**: `Ctrl+Shift+S` keyboard shortcut plus right-click "Save page" /
  "Save link" context menus.
- **Full-page manager** (`/manager.html`): folder create/rename/delete, bookmark
  edit/tag/move/delete, and drag-and-drop reordering (`@dnd-kit`).
- **Auto-lock**: re-encrypts the vault after a configurable idle timeout (default 5 minutes)
  via the `alarms` API.
- **Rate-limited unlock**: shakes on a wrong password and imposes a 60-second cooldown
  after 5 failed attempts, persisted across service-worker restarts.
