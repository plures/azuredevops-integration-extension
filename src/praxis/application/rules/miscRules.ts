/**
 * Praxis Application Rules - Error and Misc
 *
 * Rules for error handling, debug, and other state transitions.
 */

import { defineRule, findEvent } from '@plures/praxis';
import type { ApplicationEngineContext } from '../engine.js';
import {
  DeviceCodeStartedAppEvent,
  DeviceCodeCompletedAppEvent,
  DeviceCodeCancelledEvent,
  ApplicationErrorEvent,
  RetryApplicationEvent,
  ResetApplicationEvent,
  ToggleDebugViewEvent,
  AuthReminderRequestedEvent,
  AuthReminderClearedEvent,
  AuthenticationSuccessEvent,
  AuthenticationFailedEvent,
} from '../facts.js';

// ============================================================================
// Device Code Flow Rules
// ============================================================================

/**
 * Handle device code started
 */
export const deviceCodeStartedRule = defineRule<ApplicationEngineContext>({
  id: 'application.deviceCodeStarted',
  description: 'Handle device code flow started',
  impl: (state, events) => {
    const startedEvent = findEvent(events, DeviceCodeStartedAppEvent);
    if (!startedEvent) return [];

    const { connectionId, userCode, verificationUri, expiresInSeconds } = startedEvent.payload;
    const now = Date.now();

    state.context.deviceCodeSession = {
      connectionId,
      userCode,
      verificationUri,
      startedAt: now,
      expiresAt: now + expiresInSeconds * 1000,
      expiresInSeconds,
    };

    return [];
  },
});

/**
 * Handle device code completed
 */
export const deviceCodeCompletedRule = defineRule<ApplicationEngineContext>({
  id: 'application.deviceCodeCompleted',
  description: 'Handle device code flow completed',
  impl: (state, events) => {
    const completedEvent = findEvent(events, DeviceCodeCompletedAppEvent);
    if (!completedEvent) return [];

    if (state.context.deviceCodeSession?.connectionId === completedEvent.payload.connectionId) {
      state.context.deviceCodeSession = undefined;
    }

    return [];
  },
});

/**
 * Handle device code cancelled
 */
export const deviceCodeCancelledRule = defineRule<ApplicationEngineContext>({
  id: 'application.deviceCodeCancelled',
  description: 'Handle device code flow cancelled',
  impl: (state, events) => {
    const cancelledEvent = findEvent(events, DeviceCodeCancelledEvent);
    if (!cancelledEvent) return [];

    if (state.context.deviceCodeSession?.connectionId === cancelledEvent.payload.connectionId) {
      state.context.deviceCodeSession = undefined;
    }

    return [];
  },
});

// ============================================================================
// Error Handling Rules
// ============================================================================

/**
 * Handle application error
 */
export const applicationErrorRule = defineRule<ApplicationEngineContext>({
  id: 'application.error',
  description: 'Handle application error',
  impl: (state, events) => {
    const errorEvent = findEvent(events, ApplicationErrorEvent);
    if (!errorEvent) return [];

    state.context.lastError = {
      message: errorEvent.payload.error,
      connectionId: errorEvent.payload.connectionId,
    };

    if (state.context.applicationState === 'active') {
      state.context.applicationState = 'error_recovery';
      state.context.errorRecoveryAttempts++;
    }

    return [];
  },
});

/**
 * Handle retry
 */
export const retryRule = defineRule<ApplicationEngineContext>({
  id: 'application.retry',
  description: 'Retry after error',
  impl: (state, events) => {
    const retryEvent = findEvent(events, RetryApplicationEvent);
    if (!retryEvent) return [];

    if (state.context.applicationState !== 'error_recovery') return [];

    state.context.lastError = undefined;
    state.context.applicationState = 'active';

    return [];
  },
});

/**
 * Handle reset
 */
export const resetRule = defineRule<ApplicationEngineContext>({
  id: 'application.reset',
  description: 'Reset application state',
  impl: (state, events) => {
    const resetEvent = findEvent(events, ResetApplicationEvent);
    if (!resetEvent) return [];

    state.context.applicationState = 'inactive';
    state.context.isActivated = false;
    state.context.isDeactivating = false;
    state.context.lastError = undefined;
    state.context.errorRecoveryAttempts = 0;
    state.context.deviceCodeSession = undefined;
    state.context.pendingWorkItems = undefined;

    return [];
  },
});

// ============================================================================
// Debug Rules
// ============================================================================

/**
 * Handle toggle debug view
 */
export const toggleDebugViewRule = defineRule<ApplicationEngineContext>({
  id: 'application.toggleDebugView',
  description: 'Toggle debug view visibility',
  impl: (state, events) => {
    const toggleEvent = findEvent(events, ToggleDebugViewEvent);
    if (!toggleEvent) return [];

    if (toggleEvent.payload.debugViewVisible !== undefined) {
      state.context.debugViewVisible = toggleEvent.payload.debugViewVisible;
    } else {
      state.context.debugViewVisible = !state.context.debugViewVisible;
    }

    return [];
  },
});

// ============================================================================
// Auth Reminder Rules
// ============================================================================

/**
 * Handle auth reminder requested
 */
export const authReminderRequestedRule = defineRule<ApplicationEngineContext>({
  id: 'application.authReminderRequested',
  description: 'Handle authentication reminder request',
  impl: (state, events) => {
    const reminderEvent = findEvent(events, AuthReminderRequestedEvent);
    if (!reminderEvent) return [];

    const { connectionId, reason, detail } = reminderEvent.payload;

    state.context.pendingAuthReminders.set(connectionId, {
      connectionId,
      reason: detail || reason,
      status: 'pending',
    });

    return [];
  },
});

/**
 * Handle auth reminder cleared
 */
export const authReminderClearedRule = defineRule<ApplicationEngineContext>({
  id: 'application.authReminderCleared',
  description: 'Handle authentication reminder cleared',
  impl: (state, events) => {
    const clearedEvent = findEvent(events, AuthReminderClearedEvent);
    if (!clearedEvent) return [];

    state.context.pendingAuthReminders.delete(clearedEvent.payload.connectionId);

    return [];
  },
});

/**
 * Handle authentication success
 */
export const authenticationSuccessRule = defineRule<ApplicationEngineContext>({
  id: 'application.authenticationSuccess',
  description: 'Handle authentication success',
  impl: (state, events) => {
    const successEvent = findEvent(events, AuthenticationSuccessEvent);
    if (!successEvent) return [];

    const { connectionId } = successEvent.payload;

    state.context.pendingAuthReminders.delete(connectionId);

    if (state.context.deviceCodeSession?.connectionId === connectionId) {
      state.context.deviceCodeSession = undefined;
    }

    if (state.context.lastError?.connectionId === connectionId) {
      state.context.lastError = undefined;
    }

    return [];
  },
});

/**
 * Handle authentication failed
 */
export const authenticationFailedRule = defineRule<ApplicationEngineContext>({
  id: 'application.authenticationFailed',
  description: 'Handle authentication failure',
  impl: (state, events) => {
    const failedEvent = findEvent(events, AuthenticationFailedEvent);
    if (!failedEvent) return [];

    const { connectionId, error } = failedEvent.payload;

    state.context.lastError = {
      message: error,
      connectionId,
    };

    state.context.pendingAuthReminders.set(connectionId, {
      connectionId,
      reason: error,
      status: 'pending',
    });

    return [];
  },
});

export const miscRules = [
  // Device code
  deviceCodeStartedRule,
  deviceCodeCompletedRule,
  deviceCodeCancelledRule,
  // Error handling
  applicationErrorRule,
  retryRule,
  resetRule,
  // Debug
  toggleDebugViewRule,
  // Auth reminders
  authReminderRequestedRule,
  authReminderClearedRule,
  authenticationSuccessRule,
  authenticationFailedRule,
];
