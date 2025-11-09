/**
 * Module: Router Events
 * Owner: router
 * Reads: activeConnectionId (from Application context)
 * Writes: none
 * Receives: UI/system intents
 * Emits: connection-shaped events with stamped meta (atConnectionId, correlationId, timestamp)
 * Prohibitions: No domain logic; no context mutation
 * Rationale: Centralized stamping + typing for routed events
 *
 * LLM-GUARD:
 * - Do not handle webview rendering here
 * - Do not mutate ApplicationContext here
 */

export type ConnectionEventType =
  | 'REFRESH'
  | 'REAUTHENTICATE'
  | 'TOKEN_EXPIRED'
  | 'DELETE_CONNECTION'
  | 'RUN_QUERY';

export type RoutedMeta = {
  atConnectionId: string;
  timestamp: number;
  correlationId: string;
};

export type ConnectionEvent<P = unknown> = {
  type: ConnectionEventType;
  meta: RoutedMeta;
  payload?: P;
};

export function stampConnectionMeta<P = unknown>(
  type: ConnectionEventType,
  atConnectionId: string,
  payload?: P
): ConnectionEvent<P> {
  return {
    type,
    meta: {
      atConnectionId,
      timestamp: Date.now(),
      correlationId: createCorrelationId(),
    },
    payload,
  };
}

function createCorrelationId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
