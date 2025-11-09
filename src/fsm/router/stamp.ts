/**
 * Module: Router Stamping Helper
 * Owner: router
 * Reads: activeConnectionId (from Application context)
 * Writes: none
 * Receives: webview events (any)
 * Emits: stamped event with meta for connection-shaped events
 * Prohibitions: No domain logic; No context mutation; No VS Code API calls
 * Rationale: Centralize event stamping and shape normalization
 *
 * LLM-GUARD:
 * - Do not handle UI rendering here
 * - Do not dispatch FSM events here
 */

type AnyEvent = { type: string; [key: string]: any };

const CONNECTION_EVENT_TYPES = new Set([
  'AUTHENTICATION_REQUIRED',
  'TOKEN_EXPIRED',
  'RUN_QUERY',
  'DELETE_CONNECTION',
  'REFRESH',
  'REFRESH_DATA',
]);

export function isConnectionShapedEvent(type: string | undefined): boolean {
  return Boolean(type && CONNECTION_EVENT_TYPES.has(type));
}

export function stampConnectionMeta<E extends AnyEvent>(
  event: E,
  activeConnectionId: string | null | undefined
): E {
  if (!event || !isConnectionShapedEvent(event.type) || !activeConnectionId) return event;
  const meta = event.meta ?? {};
  return {
    ...event,
    meta: {
      ...meta,
      atConnectionId: activeConnectionId,
      timestamp: Date.now(),
      correlationId:
        meta.correlationId ?? Math.random().toString(36).slice(2) + Date.now().toString(36),
    },
  } as E;
}
