/**
 * Praxis Timer Module
 *
 * Exports the Praxis-based timer implementation.
 */

// Types
export type {
  PraxisTimerContext,
  PraxisTimerState,
  PraxisTimerStopResult,
  PraxisTimerSnapshot,
} from './types.js';
export { DEFAULT_TIMER_CONFIG } from './types.js';

// Facts and Events
export {
  TimerStateFact,
  TimerDataFact,
  TimerStartedFact,
  TimerPausedFact,
  TimerResumedFact,
  TimerStoppedFact,
  ActivityRecordedFact,
  StartTimerEvent,
  PauseTimerEvent,
  ResumeTimerEvent,
  StopTimerEvent,
  ActivityPingEvent,
  InactivityTimeoutEvent,
  RestoreTimerEvent,
  PomodoroBreakEvent,
} from './facts.js';

// Rules
export {
  startTimerRule,
  pauseTimerRule,
  resumeTimerRule,
  stopTimerRule,
  activityPingRule,
  inactivityTimeoutRule,
  restoreTimerRule,
} from './rules.js';

// Engine
export { createTimerEngine, type TimerEngineContext } from './engine.js';

// Manager
export { PraxisTimerManager } from './manager.js';
