/**
 * Module: SelectionWriter (Webview-only)
 * Owner: webview
 * Reads: none
 * Writes: activeConnectionId (via Application sync pipeline)
 * Receives: UI intent to select a connection
 * Emits: SELECT_CONNECTION (origin='webview')
 * Prohibitions: Do not add any extension-host imports; no context creation here
 * Rationale: Single writer for selection changes; other modules must not set selection
 *
 * LLM-GUARD:
 * - Only the webview may emit SELECT_CONNECTION
 * - Extension host code must never import this module
 */

// Ownership brand (type-level only; not serialized)
declare const WebviewOwnerBrand: unique symbol;
export type WebviewOwner = { readonly [WebviewOwnerBrand]: 'webview' };
// Internal owner token exposed only via this module; ESLint restricts imports to src/webview/**
export const webviewOwner: WebviewOwner = {} as WebviewOwner;

export type WebviewOrigin = { readonly origin: 'webview' };

export type SelectConnectionEvent = {
  type: 'SELECT_CONNECTION';
  payload: { id: string | null; timestamp: number; correlationId: string };
} & WebviewOrigin;

/**
 * Factory: createSelectConnection
 * Only callable by the webview (enforced by import boundaries)
 *
 * @param _owner WebviewOwner token (type-branded)
 * @param id string | null
 */
export function createSelectConnection(
  _owner: WebviewOwner,
  id: string | null
): SelectConnectionEvent {
  return {
    type: 'SELECT_CONNECTION',
    origin: 'webview',
    payload: {
      id,
      timestamp: Date.now(),
      correlationId: createCorrelationId(),
    },
  };
}

function createCorrelationId(): string {
  // Simple, fast correlation id; good enough for UI intents
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
