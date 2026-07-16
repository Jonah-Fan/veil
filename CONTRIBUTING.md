# Contributing to Veil

Thanks for your interest in improving Veil. It is a small project; the rules below keep it
consistent.

## Prerequisites

- Node 20+ and npm.
- No global tooling required — `wxt`, `eslint`, and `typescript` are all local dev dependencies.

## Build and test

```bash
npm ci
npm run lint        # eslint + tsc --noEmit
npm run build       # wxt build
```

Then load `.output/chrome-mv3` as an unpacked extension in Edge to verify by hand — there is no
automated test suite yet.

## Before you write code

- **Open an issue first** for anything beyond a typo or an obvious bug, so the approach is agreed.
- Keep pull requests **focused** — one concern per PR.
- Target the default branch (`master`).

## Code conventions

- TypeScript in strict mode; match the style of the surrounding code.
- 2-space indentation.
- The crypto and storage code is the security-critical core — be conservative there: never
  persist the master password, never weaken the KDF parameters, and never add a network call.

## Testing

For now, testing is manual: load the unpacked extension and exercise the popup, the
`Ctrl+Shift+S` and context-menu save paths, the full-page manager (folders, drag-and-drop
reordering, editing), auto-lock, and the unlock rate-limit.

## Documentation and style

If you add or change a user-facing behavior, update the README and add an entry under the
unreleased section of [CHANGELOG.md](CHANGELOG.md).

## Licensing

Contributions are accepted under the [MIT License](LICENSE). Third-party runtime dependencies
bundled in the built extension are attributed in [NOTICE.md](NOTICE.md).
