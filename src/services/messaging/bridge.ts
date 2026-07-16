/**
 * Typed messaging bridge from the UI to the background service worker.
 *
 * `sendMessage` wraps `browser.runtime.sendMessage` with a 10-second
 * timeout so a missing or crashed background listener cannot leave the
 * UI's `await` pending forever. Success and timeout/failure both resolve
 * to a {@link MessageResponse}; nothing rejects.
 */

import {browser} from 'wxt/browser';
import {error, Message, MessageResponse, ResponseData} from '@/types/messages';

/** Milliseconds before an unanswered message resolves as a timeout error. */
const TIMEOUT_MS = 10_000;

/**
 * Sends a strongly-typed message to the background and resolves to a
 * {@link MessageResponse}. Times out after {@link TIMEOUT_MS} and maps
 * any rejection to `{ok: false}`, so callers never hang on a missing
 * listener.
 *
 * @template M The concrete {@link Message} variant being sent.
 * @param message The discriminated message to send.
 * @returns A response envelope whose `data`, on success, is typed via
 * {@link ResponseData} for the sent `type`.
 */
export function sendMessage<M extends Message>(
  message: M,
): Promise<MessageResponse<ResponseData<M['type']>>> {
  return new Promise(resolve => {
    const timer = setTimeout(
      () => resolve({ok: false, error: 'Request timed out'}),
      TIMEOUT_MS,
    );

    browser.runtime
      .sendMessage(message)
      .then(res => resolve(res as MessageResponse<ResponseData<M['type']>>))
      .catch((err: unknown) =>
        resolve(
          error(err instanceof Error ? err.message : 'sendMessage failed'),
        ),
      )
      .finally(() => clearTimeout(timer));
  });
}
