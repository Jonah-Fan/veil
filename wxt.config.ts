import {defineConfig} from 'wxt';
import react from '@vitejs/plugin-react';

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  srcDir: 'src',
  vite: () => ({
    plugins: [react()],
  }),
  manifest: {
    name: 'Veil',
    description: 'Encrypted bookmark manager',
    permissions: ['storage', 'tabs', 'contextMenus', 'alarms'],
    icons: {
      16: 'icons/16.png',
      32: 'icons/32.png',
      48: 'icons/48.png',
      128: 'icons/128.png',
    },
    action: {
      default_icon: {
        16: 'icons/16.png',
        32: 'icons/32.png',
        48: 'icons/48.png',
        128: 'icons/128.png',
      },
    },
    commands: {
      'save-page': {
        suggested_key: {default: 'Ctrl+Shift+S'},
        description: 'Save the current page with Veil',
      },
    },
  },
  webExt: {
    disabled: true,
  },
});
