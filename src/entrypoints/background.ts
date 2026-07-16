import {setupMessageListener} from '@/domain/messaging/router';
import {setupStartupListener} from '@/domain/auth/session';
import {setupAutoLockListener} from '@/domain/auth/auto-lock';
import {
  setupCommands,
  setupContextMenu,
  setupOnInstalled,
} from '@/domain/integrations';

// noinspection JSUnusedGlobalSymbols
export default defineBackground(() => {
  setupMessageListener();
  setupStartupListener();
  setupAutoLockListener();
  setupOnInstalled();
  setupContextMenu();
  setupCommands();
});
