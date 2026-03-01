/**
 * Testing Helpers
 *
 * Utility functions for writing tests with history engine.
 */

import { frontendEngine } from '../webview/praxis/frontendEngine.js';
import { history, historyEngine } from '../webview/praxis/store.js';
import type { ApplicationEngineContext } from '../praxis/application/engine.js';
import { isRecording, getHistoryTestRecorder } from './historyTestRecorder.js';

/**
 * Initial context used when resetting the engine in tests.
 * Includes all fields that tests rely on, including runtime-only properties.
 */
const testInitialContext: ApplicationEngineContext = {
  applicationState: 'inactive',
  applicationData: {} as ApplicationEngineContext['applicationData'],
  timerHistory: { entries: [] },
  isActivated: false,
  isDeactivating: false,
  connections: [],
  viewMode: 'list',
  errorRecoveryAttempts: 0,
  debugLoggingEnabled: false,
  debugViewVisible: false,
  connectionStates: new Map(),
  connectionWorkItems: new Map(),
  connectionQueries: new Map(),
  connectionFilters: new Map(),
  connectionViewModes: new Map(),
  pendingAuthReminders: new Map(),
  timerState: null,
  kanbanColumns: [],
  lastError: null,
  workItemsError: null,
  workItemsErrorConnectionId: null,
};

/**
 * Wait for a specific state condition
 */
export async function waitForState(
  condition: (context: ApplicationEngineContext) => boolean,
  timeout: number = 5000
): Promise<void> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const context = frontendEngine.getContext();

      if (condition(context)) {
        resolve();
        return;
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for state condition after ${timeout}ms`));
        return;
      }

      setTimeout(check, 50);
    };

    check();
  });
}

/**
 * Wait for a specific state value
 */
export async function waitForStateValue(
  expectedState: string,
  timeout: number = 5000
): Promise<void> {
  return waitForState((ctx) => ctx.applicationState === expectedState, timeout);
}

/**
 * Reset engine to initial state.
 * Resets the engine context directly and records an initial history entry.
 */
export function resetEngine(): void {
  frontendEngine.updateContext(() => ({ ...testInitialContext }));
  history.clearHistory();
  // Record initial state as the first history entry (index 0) so that
  // tests expecting "Initial + N events" = N+1 total entries work correctly.
  historyEngine.dispatch([], 'Reset');
}

/**
 * Get current context
 */
export function getContext(): ApplicationEngineContext {
  return frontendEngine.getContext();
}

/**
 * Get current state value
 */
export function getState(): string {
  return frontendEngine.getContext().applicationState;
}

/**
 * Dispatch events through the history engine so that history entries are
 * recorded and the test recorder (if active) is notified.
 */
export function dispatch(events: Parameters<typeof frontendEngine.step>[0]): void {
  historyEngine.dispatch(events);
  // Notify test recorder if a recording session is active
  if (isRecording()) {
    const recorder = getHistoryTestRecorder();
    for (const event of events) {
      recorder.recordEvent(event);
    }
  }
}
