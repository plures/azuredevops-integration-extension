/**
 * Praxis Timer Facts and Events
 *
 * Defines the facts and events for the timer logic using Praxis DSL.
 * Facts represent the current state of the timer.
 * Events represent actions that can change the timer state.
 */

import { defineFact, defineEvent } from '@plures/praxis';
import type { PraxisTimerState, PraxisTimerContext } from './types.js';

// ============================================================================
// Facts - Propositions about the timer domain
// ============================================================================

/**
 * TimerState fact - represents the current state of the timer
 */
export const TimerStateFact = defineFact<'TimerState', PraxisTimerState>('TimerState');

/**
 * TimerData fact - represents the timer context data
 */
export const TimerDataFact = defineFact<'TimerData', PraxisTimerContext>('TimerData');

/**
 * TimerStarted fact - indicates a timer has been started
 */
export const TimerStartedFact = defineFact<
  'TimerStarted',
  { workItemId: number; workItemTitle: string; startTime: number }
>('TimerStarted');

/**
 * TimerPaused fact - indicates the timer has been paused
 */
export const TimerPausedFact = defineFact<'TimerPaused', { pausedAt: number; manual: boolean }>(
  'TimerPaused'
);

/**
 * TimerResumed fact - indicates the timer has been resumed
 */
export const TimerResumedFact = defineFact<
  'TimerResumed',
  { resumedAt: number; adjustedStartTime: number }
>('TimerResumed');

/**
 * TimerStopped fact - indicates the timer has been stopped
 */
export const TimerStoppedFact = defineFact<
  'TimerStopped',
  { workItemId: number; duration: number; hoursDecimal: number }
>('TimerStopped');

/**
 * ActivityRecorded fact - indicates activity was recorded
 */
export const ActivityRecordedFact = defineFact<'ActivityRecorded', { timestamp: number }>(
  'ActivityRecorded'
);

// ============================================================================
// Events - Actions that drive state changes
// ============================================================================

/**
 * StartTimer event - starts a timer for a work item
 */
export const StartTimerEvent = defineEvent<
  'START_TIMER',
  { workItemId: number; workItemTitle: string }
>('START_TIMER');

/**
 * PauseTimer event - pauses the running timer
 */
export const PauseTimerEvent = defineEvent<'PAUSE_TIMER', { manual?: boolean }>('PAUSE_TIMER');

/**
 * ResumeTimer event - resumes a paused timer
 */
export const ResumeTimerEvent = defineEvent<'RESUME_TIMER', { fromActivity?: boolean }>(
  'RESUME_TIMER'
);

/**
 * StopTimer event - stops the timer
 */
export const StopTimerEvent = defineEvent<'STOP_TIMER', Record<string, never>>('STOP_TIMER');

/**
 * ActivityPing event - records user activity
 */
export const ActivityPingEvent = defineEvent<'ACTIVITY_PING', Record<string, never>>(
  'ACTIVITY_PING'
);

/**
 * InactivityTimeout event - triggered when inactivity timeout is reached
 */
export const InactivityTimeoutEvent = defineEvent<'INACTIVITY_TIMEOUT', Record<string, never>>(
  'INACTIVITY_TIMEOUT'
);

/**
 * RestoreTimer event - restores timer from persisted state
 */
export const RestoreTimerEvent = defineEvent<
  'RESTORE_TIMER',
  {
    workItemId: number;
    workItemTitle: string;
    startTime: number;
    isPaused: boolean;
  }
>('RESTORE_TIMER');

/**
 * PomodoroBreak event - triggers a pomodoro break
 */
export const PomodoroBreakEvent = defineEvent<'POMODORO_BREAK', Record<string, never>>(
  'POMODORO_BREAK'
);
