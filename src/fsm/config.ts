/**
 * Module: src/fsm/config.ts
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
import { createBrowserInspector } from '@statelyai/inspect';
import { createComponentLogger, FSMComponent } from './logging/FSMLogger';

// Create logger for FSM configuration
const logger = createComponentLogger(FSMComponent.APPLICATION, 'fsmConfig');

export const setupFSMInspector = (): any => {
  // Only enable inspector in development mode
  if (process.env.NODE_ENV === 'development' || process.env.ENABLE_FSM_INSPECTOR === 'true') {
    try {
      // Create inspector for visual debugging
      const inspector = createBrowserInspector({
        url: 'https://stately.ai/registry/editor/e13bef2b-bb13-4465-96ac-0bc25340688e?machineId=e8c673d6-40e0-459a-af48-ba8a69db9d89',
      });

      logger.info(
        'FSM Inspector enabled. Visit https://stately.ai/inspect to visualize state machines.'
      );
      return inspector;
    } catch (error) {
      logger.warn(
        'Failed to setup FSM inspector: ' + (error instanceof Error ? error.message : String(error))
      );
      return undefined;
    }
  }
  return undefined;
};

export const FSM_CONFIG = {
  // Development settings - TRACING ENABLED BY DEFAULT
  enableInspector: true, // Always enable for debugging
  enableLogging: true, // Always enable for debugging

  // Timer settings
  timer: {
    tickIntervalMs: 1000,
    inactivityCheckMs: 10000,
    inactivityTimeoutSec: 300, // 5 minutes
    defaultElapsedLimitHours: 3.5,
    pomodoroMinutes: 25,
    pomodoroBreakMinutes: 5,
  },

  // Connection settings
  connection: {
    maxRetries: 3,
    retryDelayMs: 5000,
    healthCheckIntervalMs: 30000,
    connectionTimeoutMs: 10000,
  },

  // Webview settings
  webview: {
    refreshIntervalMs: 60000,
    maxWorkItems: 1000,
    loadingTimeoutMs: 5000, // 5 seconds - lightweight tool designed for 10s-100s of items
  },

  // Feature flags for gradual rollout
  features: {
    useTimerFSM: process.env.USE_TIMER_FSM === 'true',
    useConnectionFSM: process.env.USE_CONNECTION_FSM === 'true',
    useWebviewFSM: process.env.USE_WEBVIEW_FSM === 'true',
    useMessageRouter: process.env.USE_MESSAGE_ROUTER === 'true',
  },
};

export type FSMConfig = typeof FSM_CONFIG;
