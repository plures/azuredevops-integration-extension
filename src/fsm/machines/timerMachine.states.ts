/**
 * Module: src/fsm/machines/timerMachine.states.ts
 * Owner: application
 * Reads: (document)
 * Writes: (document)
 * Receives: (document)
 * Emits: (document)
 * Prohibitions: Do not mutate ApplicationContext directly; Do not define new *Context types
 * Rationale: (document)
 *
 * LLM-GUARD:
 * - Follow ownership boundaries; route events to Router; do not add UI logic here
 */
/**
 * State Name Constants for Timer Machine
 *
 * Use these constants instead of string literals to:
 * 1. Get IntelliSense/autocomplete
 * 2. Prevent typos
 * 3. Enable safe refactoring
 *
 * Usage:
 * ```typescript
 * START: {
 *   target: TimerStates.RUNNING,
 * },
 * ```
 */

export const TimerStates = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
} as const;

export type TimerState = (typeof TimerStates)[keyof typeof TimerStates];

/**
 * Helper to create relative state transitions
 * Use for transitions within the same parent state
 */
export function relativeTimerState(state: string): string {
  return `.${state}`;
}

/**
 * Type-safe transition helper
 * Validates that target state exists in the machine
 */
export function createTimerTransition(target: TimerState) {
  return { target };
}
