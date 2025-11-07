/**
 * State Name Constants for Data Machine
 *
 * Use these constants instead of string literals to:
 * 1. Get IntelliSense/autocomplete
 * 2. Prevent typos
 * 3. Enable safe refactoring
 *
 * Usage:
 * ```typescript
 * FETCH: {
 *   target: DataStates.FETCHING,
 * },
 * ```
 */

export const DataStates = {
  IDLE: 'idle',
  FETCHING: 'fetching',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type DataState = (typeof DataStates)[keyof typeof DataStates];

/**
 * Helper to create relative state transitions
 * Use for transitions within the same parent state
 */
export function relativeDataState(state: string): string {
  return `.${state}`;
}

/**
 * Type-safe transition helper
 * Validates that target state exists in the machine
 */
export function createDataTransition(target: DataState) {
  return { target };
}
