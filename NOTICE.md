# NOTICE

This file gives attribution and license notices for Veil and the third-party software
redistributed in the built extension.

## Veil

A privacy-first, local-only encrypted bookmark manager.
Copyright © 2026 Jonah Fan. Licensed under the [MIT License](LICENSE).

## Third-party software bundled in the built extension

The built extension bundles the following runtime dependencies (direct and transitive),
all permissively licensed; the specific license for each is noted in its heading below.
Dev-only tooling (WXT, Vite, ESLint, Prettier, TypeScript, @resvg/resvg-js) is not shipped
and is not listed here.

### React — MIT License

- <https://react.dev/>
- Copyright (c) Meta Platforms, Inc. and affiliates.
- UI rendering library for the popup and manager.

### React DOM — MIT License

- <https://react.dev/>
- Copyright (c) Meta Platforms, Inc. and affiliates.
- DOM renderer for React.

### scheduler — MIT License

- <https://github.com/facebook/react/tree/main/packages/scheduler>
- Copyright (c) Meta Platforms, Inc. and affiliates.
- React's cooperative rendering scheduler (transitive dependency of react-dom).

### @dnd-kit/core — MIT License

- <https://github.com/clauderic/dnd-kit>
- Copyright (c) 2021, Claudéric Demers.
- Drag-and-drop sensor and collision engine for the manager.

### @dnd-kit/accessibility — MIT License

- <https://github.com/clauderic/dnd-kit>
- Copyright (c) 2021, Claudéric Demers.
- Accessible live-region announcements for drag operations (transitive dependency of @dnd-kit/core).

### @dnd-kit/sortable — MIT License

- <https://github.com/clauderic/dnd-kit>
- Copyright (c) 2021, Claudéric Demers.
- Sortable strategies and hooks for reordering bookmarks and folders.

### @dnd-kit/utilities — MIT License

- <https://github.com/clauderic/dnd-kit>
- Copyright (c) 2021, Claudéric Demers.
- Shared utilities used by the sortable package.

### tslib — 0BSD License

- <https://github.com/microsoft/tslib>
- Copyright (c) Microsoft Corporation.
- TypeScript compiler helper functions, inlined into the bundle (transitive dependency of the @dnd-kit packages).

## License texts

The canonical text of the MIT License is available at <https://opensource.org/license/mit>.
