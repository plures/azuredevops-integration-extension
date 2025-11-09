/**
 * Module: src/features/timer/index.ts
 * Owner: timer
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
 * Timer Feature Public API
 *
 * This is the main entry point for the timer feature.
 * Provides a clean interface for timer functionality.
 */

export { timerMachine } from './machine';
export { TimerUI } from './ui-integration';
export type { TimerContext, TimerEvent, TimerPersistenceData, TimerConfig } from './types';
export {
  saveTimerState,
  loadTimerState,
  clearTimerState,
  isValidTimerState,
  calculateElapsedTime,
  formatElapsedTime,
} from './persistence';
