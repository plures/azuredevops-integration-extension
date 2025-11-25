/**
 * Praxis Timer Types
 *
 * Type definitions for the Praxis-based timer implementation.
 * These types mirror the XState timer context and events for seamless migration.
 */

/**
 * Timer context - the source of truth for timer state
 */
export interface PraxisTimerContext {
  workItemId?: number;
  workItemTitle?: string;
  startTime?: number;
  pausedAt?: number;
  isPaused: boolean;
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

/**
 * Timer state values
 */
export type PraxisTimerState = 'idle' | 'running' | 'paused';

/**
 * Timer stop result - returned when timer is stopped
 */
export interface PraxisTimerStopResult {
  workItemId: number;
  startTime: number;
  endTime: number;
  duration: number;
  hoursDecimal: number;
  capApplied?: boolean;
  capLimitHours?: number;
}

/**
 * Timer snapshot for external consumption
 */
export interface PraxisTimerSnapshot {
  workItemId?: number;
  workItemTitle?: string;
  startTime?: number;
  elapsedSeconds: number;
  isPaused: boolean;
  running: boolean;
  isPomodoro?: boolean;
  pomodoroCount?: number;
}

/**
 * Default timer configuration
 */
export const DEFAULT_TIMER_CONFIG = {
  inactivityTimeoutSec: 900, // 15 minutes
  defaultElapsedLimitHours: 3.5,
  pomodoroEnabled: false,
  pomodoroCount: 0,
} as const;
