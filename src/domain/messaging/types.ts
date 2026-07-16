/**
 * Messaging framework types shared by the message router, middlewares,
 * and handlers.
 *
 * Pure type aliases over the {@link Message} discriminated union — no
 * runtime, no session state. Split out of the router so handlers and
 * middlewares can import these without depending on the router (which
 * would create a router↔handlers import cycle).
 */

import type {Message, MessageResponse} from '@/types/messages';

/** Extracts the concrete {@link Message} variant for a `type` literal. */
export type MsgOf<T extends Message['type']> = Extract<Message, {type: T}>;

/** A message handler keyed by message `type`, returning a response envelope. */
export type Handler<T extends Message['type']> = (
  msg: MsgOf<T>,
) => Promise<MessageResponse<unknown>>;

/**
 * Wraps a {@link Handler} with a guard (e.g. require-unlocked) that can
 * short-circuit it.
 */
export type Middleware = <T extends Message['type']>(
  handler: Handler<T>,
) => Handler<T>;
