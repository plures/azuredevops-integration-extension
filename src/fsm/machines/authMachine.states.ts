/**
 * State Name Constants for Auth Machine
 *
 * Use these constants instead of string literals to:
 * 1. Get IntelliSense/autocomplete
 * 2. Prevent typos
 * 3. Enable safe refactoring
 *
 * Usage:
 * ```typescript
 * AUTHENTICATE: {
 *   target: AuthStates.AUTHENTICATING,
 * },
 * ```
 */

export const AuthStates = {
  IDLE: 'idle',
  AUTHENTICATING: 'authenticating',
  AUTHENTICATED: 'authenticated',
  FAILED: 'failed',
} as const;

export type AuthState = (typeof AuthStates)[keyof typeof AuthStates];

/**
 * Helper to create relative state transitions
 * Use for transitions within the same parent state
 */
export function relativeAuthState(state: string): string {
  return `.${state}`;
}

/**
 * Type-safe transition helper
 * Validates that target state exists in the machine
 */
export function createAuthTransition(target: AuthState) {
  return { target };
}
