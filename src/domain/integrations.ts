import {browser} from 'wxt/browser';
import {type Message} from '@/types/messages';
import {initSession, isUnlocked} from '@/domain/auth/session';
import {handleMessage} from '@/domain/messaging/router';

function openPopupIfAvailable(): void {
  const action = browser.action as unknown as {
    openPopup?: () => Promise<void>;
  };
  void action.openPopup?.();
}

async function saveFromUrl(
  url: string | undefined,
  title: string | undefined,
  favicon?: string,
): Promise<void> {
  await initSession();
  if (!isUnlocked()) {
    openPopupIfAvailable();
    return;
  }
  if (!url || !title) return;
  await handleMessage({
    type: 'SAVE_BOOKMARK',
    url,
    title,
    favicon,
  } as Message);
}

export function setupOnInstalled(): void {
  browser.runtime.onInstalled.addListener(async () => {
    await browser.contextMenus.removeAll();
    browser.contextMenus.create({
      id: 'save-page',
      title: 'Save this page with Veil',
      contexts: ['page'],
    });
    browser.contextMenus.create({
      id: 'save-link',
      title: 'Save this link with Veil',
      contexts: ['link'],
    });
  });
}

export function setupContextMenu(): void {
  browser.contextMenus.onClicked.addListener((info, tab) => {
    const isLink = Boolean(info.linkUrl);
    void saveFromUrl(
      info.linkUrl ?? info.pageUrl,
      info.selectionText ?? tab?.title,
      isLink ? undefined : tab?.favIconUrl,
    );
  });
}

export function setupCommands(): void {
  browser.commands.onCommand.addListener(command => {
    if (command !== 'save-page') return;
    void (async () => {
      const [active] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      await saveFromUrl(active?.url, active?.title, active?.favIconUrl);
    })();
  });
}
