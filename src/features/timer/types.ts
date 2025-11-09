/**
 * Module: src/features/timer/types.ts
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
 * Timer Feature Types
 *
 * Defines the interfaces and types specific to the timer feature.
 * Extracted from the main FSM types for better organization.
 */

export interface TimerContext {
  workItemId?: number;
  workItemTitle?: string;
  startTime?: number;
  pausedAt?: number;
  isPaused: boolean;
  pausedAt?: number;
  lastActivity: number;
  connectionInfo?: {
    id?: string;
    label?: string;
    organization?: string;
    project?: string;
  };
  inactivityTimeoutSec: number;
  defaultElapsedLimitHours: number;
  pomodoroEnabled: boolean;
  pomodoroCount: number;
}

export type TimerEvent =
  | { type: 'START'; workItemId: number; workItemTitle: string }
  | {
      type: 'RESTORE';
      workItemId: number;
      workItemTitle: string;
      startTime: number;
      isPaused: boolean;
    }
  | { type: 'PAUSE'; manual?: boolean }
  | { type: 'RESUME'; fromActivity?: boolean }
  | { type: 'STOP' }
  | { type: 'ACTIVITY' }
  | { type: 'INACTIVITY_TIMEOUT' }
  | { type: 'POMODORO_BREAK' };

/**
 * Timer persistence data structure
 * Used for saving/restoring timer state across sessions
 */
export interface TimerPersistenceData {
  workItemId: number;
  workItemTitle: string;
  startTime: number;
  isPaused: boolean;
  state: string;
  lastActivity: number;
}

/**
 * Timer configuration
 * Configuration options for timer behavior
 */
export interface TimerConfig {
  inactivityTimeoutSec: number;
  defaultElapsedLimitHours: number;
  pomodoroEnabled: boolean;
}
