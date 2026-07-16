/// <reference path="./.wxt/wxt.d.ts" />

declare module 'eslint-config-prettier' {
  import type {Config} from 'eslint/config';
  const config: Config;
  export = config;
}
