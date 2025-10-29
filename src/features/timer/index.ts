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
