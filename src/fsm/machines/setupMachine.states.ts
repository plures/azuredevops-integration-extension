/**
 * State Name Constants for Setup Machine
 *
 * Use these constants instead of string literals to:
 * 1. Get IntelliSense/autocomplete
 * 2. Prevent typos
 * 3. Enable safe refactoring
 *
 * Usage:
 * ```typescript
 * SETUP_REQUESTED: {
 *   target: SetupStates.SHOWING_MENU,
 * },
 * ```
 */

export const SetupStates = {
  IDLE: 'idle',
  SHOWING_MENU: 'showingMenu',
  HANDLING_ACTION: 'handlingAction',
  MANAGING_EXISTING: 'managingExisting',
  TESTING_EXISTING_CONNECTION: 'testingExistingConnection',
  TESTING_EXISTING_RESULT: 'testingExistingResult',
} as const;

export type SetupState = (typeof SetupStates)[keyof typeof SetupStates];

/**
 * Helper to create relative state transitions
 * Use for transitions within the same parent state
 */
export function relativeSetupState(state: string): string {
  return `.${state}`;
}

/**
 * Type-safe transition helper
 * Validates that target state exists in the machine
 */
export function createSetupTransition(target: SetupState) {
  return { target };
}
