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
 *
 * This module now uses Praxis logic engine instead of XState.
 * The inspector functionality has been removed as Praxis uses different debugging approaches.
 */
import { createComponentLogger, FSMComponent } from './logging/FSMLogger';

// Create logger for FSM configuration
const logger = createComponentLogger(FSMComponent.APPLICATION, 'fsmConfig');

/**
 * Setup function for FSM debugging.
 * Previously used @statelyai/inspect for XState visualization.
 * Now returns undefined as Praxis uses different debugging approaches.
 */
export const setupFSMInspector = (): undefined => {
  // Praxis logic engine uses different debugging approaches
  // (structured logging, trace sessions, context inspection)
  if (process.env.NODE_ENV === 'development' || process.env.ENABLE_FSM_INSPECTOR === 'true') {
    logger.info('FSM debugging enabled. Use FSM logging and tracing for state machine inspection.');
  }
  return undefined;
};

export const FSM_CONFIG = {
  // Development settings - TRACING ENABLED BY DEFAULT
  enableInspector: false, // Praxis doesn't use XState inspector
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
