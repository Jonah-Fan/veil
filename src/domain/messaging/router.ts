/**
 * Message dispatch: `handleMessage` bootstraps the session (so the first
 * message after SW start reads disk) then routes to the matching handler,
 * and `setupMessageListener` wires `runtime.onMessage` to it.
 *
 * The `handler(msg as never)` cast is load-bearing — TypeScript cannot
 * narrow `handlers[msg.type]` to a function accepting `msg`'s specific
 * variant across the mapped type, so the cast bridges it. Preserve it;
 * do not "fix" it.
 */

import {browser} from 'wxt/browser';
import {error, type Message, type MessageResponse} from '@/types/messages';
import {initSession} from '@/domain/auth/session';
import {handlers} from '@/domain/messaging/handlers';

/** Bootstraps the session, then dispatches `msg` to its handler (or errors). */
export async function handleMessage(
  msg: Message,
): Promise<MessageResponse<unknown>> {
  await initSession();
  const handler = handlers[msg.type];
  if (!handler) return error('Unknown message');
  return handler(msg as never);
}

/**
 * Wires `runtime.onMessage` to {@link handleMessage}. Call once from
 * the entrypoint.
 */
export function setupMessageListener(): void {
  browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    void handleMessage(msg as Message)
      .then(res => sendResponse(res))
      .catch((e: unknown) =>
        sendResponse(error(e instanceof Error ? e.message : 'Internal error')),
      );
    return true;
  });
}
