/**
 * State Name Constants for Connection Machine
 *
 * Use these constants instead of string literals to:
 * 1. Get IntelliSense/autocomplete
 * 2. Prevent typos
 * 3. Enable safe refactoring
 *
 * Usage:
 * ```typescript
 * CONNECT: {
 *   target: ConnectionStates.AUTHENTICATING,
 * },
 * ```
 */

export const ConnectionStates = {
  // Top-level states
  DISCONNECTED: 'disconnected',
  AUTHENTICATING: 'authenticating',
  CREATING_CLIENT: 'creating_client',
  CREATING_PROVIDER: 'creating_provider',
  CONNECTED: 'connected',
  AUTH_FAILED: 'auth_failed',
  CLIENT_FAILED: 'client_failed',
  PROVIDER_FAILED: 'provider_failed',
  CONNECTION_ERROR: 'connection_error',
  TOKEN_REFRESH: 'token_refresh',

  // Authenticating sub-states
  'authenticating.determining_method': 'authenticating.determining_method',
  'authenticating.pat_auth': 'authenticating.pat_auth',
  'authenticating.entra_auth': 'authenticating.entra_auth',
  'authenticating.entra_auth.checking_existing_token':
    'authenticating.entra_auth.checking_existing_token',
  'authenticating.entra_auth.interactive_auth': 'authenticating.entra_auth.interactive_auth',
} as const;

export type ConnectionState = (typeof ConnectionStates)[keyof typeof ConnectionStates];

/**
 * Helper to create relative state transitions
 * Use for transitions within the same parent state
 */
export function relativeConnectionState(state: string): string {
  return `.${state}`;
}

/**
 * Type-safe transition helper
 * Validates that target state exists in the machine
 */
export function createConnectionTransition(target: ConnectionState) {
  return { target };
}
