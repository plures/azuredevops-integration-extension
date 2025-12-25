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
import { createComponentLogger, Component } from '../logging/ComponentLogger.js';

// Create logger for application configuration
const logger = createComponentLogger(Component.APPLICATION, 'applicationConfig');

/**
 * Setup function for debugging.
 * Previously used @statelyai/inspect for XState visualization.
 * Now returns undefined as Praxis uses different debugging approaches.
 */
export const setupInspector = (): undefined => {
  // Praxis logic engine uses different debugging approaches
  // (structured logging, trace sessions, context inspection)
  if (process.env.NODE_ENV === 'development' || process.env.ENABLE_INSPECTOR === 'true') {
    logger.info('Debugging enabled. Use logging and tracing for inspection.');
  }
  return undefined;
};

export const APPLICATION_CONFIG = {
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
    useTimer: process.env.USE_TIMER === 'true',
    useConnection: process.env.USE_CONNECTION === 'true',
    useWebview: process.env.USE_WEBVIEW === 'true',
    useMessageRouter: process.env.USE_MESSAGE_ROUTER === 'true',
  },
};

export type ApplicationConfig = typeof APPLICATION_CONFIG;
