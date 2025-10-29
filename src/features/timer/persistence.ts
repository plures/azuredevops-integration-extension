/**
 * Timer Persistence Utilities
 *
 * Handles saving and restoring timer state across VSCode sessions.
 * Provides pure functions for timer state management.
 */

import { TimerContext, TimerPersistenceData } from './types';

const TIMER_STATE_KEY = 'azureDevOpsIntegration.timer.state';

/**
 * Save timer state to VSCode storage
 * @param context Current timer context
 * @param state Current state value
 */
export async function saveTimerState(context: TimerContext, state: string): Promise<void> {
  if (!context.workItemId || !context.startTime) {
    return; // Nothing to save
  }

  const persistenceData: TimerPersistenceData = {
    workItemId: context.workItemId,
    workItemTitle: context.workItemTitle || '',
    startTime: context.startTime,
    isPaused: context.isPaused,
    state,
    lastActivity: context.lastActivity,
  };

  // Dynamic import to avoid issues in test environment
  const vscode = await import('vscode');
  await vscode.workspace
    .getConfiguration()
    .update(TIMER_STATE_KEY, persistenceData, vscode.ConfigurationTarget.Global);
}

/**
 * Load timer state from VSCode storage
 * @returns Persistence data if available, undefined otherwise
 */
export async function loadTimerState(): Promise<TimerPersistenceData | undefined> {
  // Dynamic import to avoid issues in test environment
  const vscode = await import('vscode');
  const config = vscode.workspace.getConfiguration();
  const state = config.get<TimerPersistenceData>(TIMER_STATE_KEY);

  if (!state || !state.workItemId || !state.startTime) {
    return undefined;
  }

  return state;
}

/**
 * Clear saved timer state
 */
export async function clearTimerState(): Promise<void> {
  // Dynamic import to avoid issues in test environment
  const vscode = await import('vscode');
  await vscode.workspace
    .getConfiguration()
    .update(TIMER_STATE_KEY, undefined, vscode.ConfigurationTarget.Global);
}

/**
 * Check if timer state is valid for restoration
 * @param state Persistence data to validate
 * @returns True if state is valid for restoration
 */
export function isValidTimerState(state: TimerPersistenceData): boolean {
  return !!(
    state &&
    typeof state.workItemId === 'number' &&
    typeof state.workItemTitle === 'string' &&
    typeof state.startTime === 'number' &&
    typeof state.isPaused === 'boolean' &&
    typeof state.state === 'string'
  );
}

/**
 * Calculate elapsed time from start time
 * @param startTime Start timestamp
 * @returns Elapsed time in seconds
 */
export function calculateElapsedTime(startTime: number): number {
  return Math.floor((Date.now() - startTime) / 1000);
}

/**
 * Format elapsed time as human-readable string
 * @param elapsedSeconds Elapsed time in seconds
 * @returns Formatted time string (e.g., "1h 23m 45s")
 */
export function formatElapsedTime(elapsedSeconds: number): string {
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}
