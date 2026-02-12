/**
 * Praxis Application Rules - Error and Misc
 *
 * Rules for error handling, debug, and other state transitions.
 */

import { defineRule, findEvent } from '@plures/praxis';
import { getClock, type ApplicationEngineContext } from '../engine.js';
import {
  DeviceCodeStartedAppEvent,
  DeviceCodeCompletedAppEvent,
  DeviceCodeCancelledEvent,
  AuthCodeFlowStartedAppEvent,
  AuthCodeFlowCompletedAppEvent,
  ApplicationErrorEvent,
  RetryApplicationEvent,
  ResetApplicationEvent,
  ToggleDebugViewEvent,
  AuthReminderRequestedEvent,
  AuthReminderClearedEvent,
  AuthenticationSuccessEvent,
} from '../facts.js';

// ============================================================================
// Device Code Flow Rules
// ============================================================================

/**
 * Handle device code started
 */
const deviceCodeStartedRule = defineRule<ApplicationEngineContext>({
  id: 'application.deviceCodeStarted',
  description: 'Handle device code flow started',
  meta: {
    triggers: ['DEVICE_CODE_STARTED'],
  },
  impl: (state, events) => {
    const startedEvent = findEvent(events, DeviceCodeStartedAppEvent);
    if (!startedEvent) return [];

    const { connectionId, userCode, verificationUri, expiresInSeconds } = startedEvent.payload;
    const now = getClock(state).now();

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
const deviceCodeCompletedRule = defineRule<ApplicationEngineContext>({
  id: 'application.deviceCodeCompleted',
  description: 'Handle device code flow completed',
  meta: {
    triggers: ['DEVICE_CODE_COMPLETED'],
  },
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
const deviceCodeCancelledRule = defineRule<ApplicationEngineContext>({
  id: 'application.deviceCodeCancelled',
  description: 'Handle device code flow cancelled',
  meta: {
    triggers: ['DEVICE_CODE_CANCELLED'],
  },
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
// Auth Code Flow Rules
// ============================================================================

/**
 * Handle auth code flow started
 */
const authCodeFlowStartedRule = defineRule<ApplicationEngineContext>({
  id: 'application.authCodeFlowStarted',
  description: 'Handle authorization code flow with PKCE started',
  meta: {
    triggers: ['AUTH_CODE_FLOW_STARTED'],
  },
  impl: (state, events) => {
    const startedEvent = findEvent(events, AuthCodeFlowStartedAppEvent);
    if (!startedEvent) return [];

    const { connectionId, authorizationUrl, expiresInSeconds } = startedEvent.payload;
    const now = getClock(state).now();

    state.context.authCodeFlowSession = {
      connectionId,
      authorizationUrl,
      startedAt: now,
      expiresAt: now + expiresInSeconds * 1000,
      expiresInSeconds,
    };

    return [];
  },
});

/**
 * Handle auth code flow completed
 */
const authCodeFlowCompletedRule = defineRule<ApplicationEngineContext>({
  id: 'application.authCodeFlowCompleted',
  description: 'Handle authorization code flow with PKCE completed',
  meta: {
    triggers: ['AUTH_CODE_FLOW_COMPLETED'],
  },
  impl: (state, events) => {
    const completedEvent = findEvent(events, AuthCodeFlowCompletedAppEvent);
    if (!completedEvent) return [];

    if (state.context.authCodeFlowSession?.connectionId === completedEvent.payload.connectionId) {
      state.context.authCodeFlowSession = undefined;
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
const applicationErrorRule = defineRule<ApplicationEngineContext>({
  id: 'application.error',
  description: 'Handle application error',
  meta: {
    triggers: ['APPLICATION_ERROR'],
  },
  impl: (state, events) => {
    const errorEvent = findEvent(events, ApplicationErrorEvent);
    if (!errorEvent) return [];

    state.context.lastError = {
      message: errorEvent.payload.error,
      connectionId: errorEvent.payload.connectionId,
    };

    // Do not transition to error_recovery, just log the error
    // if (state.context.applicationState === 'active') {
    //   state.context.applicationState = 'error_recovery';
    //   state.context.errorRecoveryAttempts++;
    // }

    return [];
  },
});

/**
 * Handle retry
 */
const retryRule = defineRule<ApplicationEngineContext>({
  id: 'application.retry',
  description: 'Retry after error',
  meta: {
    triggers: ['RETRY'],
    transition: { from: ['error_recovery', 'activation_error'], to: 'active' },
  },
  impl: (state, events) => {
    const retryEvent = findEvent(events, RetryApplicationEvent);
    if (!retryEvent) return [];

    if (
      state.context.applicationState !== 'error_recovery' &&
      state.context.applicationState !== 'activation_error'
    )
      return [];

    state.context.lastError = undefined;
    state.context.applicationState = 'active';

    return [];
  },
});

/**
 * Handle reset
 */
const resetRule = defineRule<ApplicationEngineContext>({
  id: 'application.reset',
  description: 'Reset application state',
  meta: {
    triggers: ['RESET'],
    transition: { from: '*', to: 'inactive' },
  },
  impl: (state, events) => {
    const resetEvent = findEvent(events, ResetApplicationEvent);
    if (!resetEvent) return [];

    state.context.applicationState = 'inactive';
    state.context.isActivated = false;
    state.context.isDeactivating = false;
    state.context.lastError = undefined;
    state.context.errorRecoveryAttempts = 0;
    state.context.deviceCodeSession = undefined;
    state.context.authCodeFlowSession = undefined;
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
const toggleDebugViewRule = defineRule<ApplicationEngineContext>({
  id: 'application.toggleDebugView',
  description: 'Toggle debug view visibility',
  meta: {
    triggers: ['TOGGLE_DEBUG_VIEW'],
  },
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
const authReminderRequestedRule = defineRule<ApplicationEngineContext>({
  id: 'application.authReminderRequested',
  description: 'Handle authentication reminder request',
  meta: {
    triggers: ['AUTH_REMINDER_REQUESTED'],
  },
  impl: (state, events) => {
    const reminderEvent = findEvent(events, AuthReminderRequestedEvent);
    if (!reminderEvent) return [];

    const { connectionId, reason, detail } = reminderEvent.payload;

    // Priority 3: Make Map updates immutable (create new Map instance)
    // Priority 4: Idempotency - check if already exists with same value
    const existing = state.context.pendingAuthReminders.get(connectionId);
    const newValue = {
      connectionId,
      reason: detail || reason,
      status: 'pending',
    };

    if (!existing || existing.reason !== newValue.reason || existing.status !== newValue.status) {
      state.context.pendingAuthReminders = new Map(state.context.pendingAuthReminders);
      state.context.pendingAuthReminders.set(connectionId, newValue);
    }

    return [];
  },
});

/**
 * Handle auth reminder cleared
 */
const authReminderClearedRule = defineRule<ApplicationEngineContext>({
  id: 'application.authReminderCleared',
  description: 'Handle authentication reminder cleared',
  meta: {
    triggers: ['AUTH_REMINDER_CLEARED'],
  },
  impl: (state, events) => {
    const clearedEvent = findEvent(events, AuthReminderClearedEvent);
    if (!clearedEvent) return [];

    // Priority 3: Make Map updates immutable (create new Map instance)
    // Priority 4: Idempotency - check if exists before deleting
    if (state.context.pendingAuthReminders.has(clearedEvent.payload.connectionId)) {
      state.context.pendingAuthReminders = new Map(state.context.pendingAuthReminders);
      state.context.pendingAuthReminders.delete(clearedEvent.payload.connectionId);
    }

    return [];
  },
});

/**
 * Handle authentication success
 */
const authenticationSuccessRule = defineRule<ApplicationEngineContext>({
  id: 'application.authenticationSuccess',
  description: 'Handle authentication success',
  meta: {
    triggers: ['AUTHENTICATION_SUCCESS'],
  },
  impl: (state, events) => {
    const successEvent = findEvent(events, AuthenticationSuccessEvent);
    if (!successEvent) return [];

    const { connectionId } = successEvent.payload;

    // Priority 3: Make Map updates immutable (create new Map instance)
    // Priority 4: Idempotency - check if exists before deleting
    if (state.context.pendingAuthReminders.has(connectionId)) {
      state.context.pendingAuthReminders = new Map(state.context.pendingAuthReminders);
      state.context.pendingAuthReminders.delete(connectionId);
    }

    // Idempotency: Only clear if session exists for this connection
    if (state.context.deviceCodeSession?.connectionId === connectionId) {
      state.context.deviceCodeSession = undefined;
    }

    if (state.context.authCodeFlowSession?.connectionId === connectionId) {
      state.context.authCodeFlowSession = undefined;
    }

    if (state.context.lastError?.connectionId === connectionId) {
      state.context.lastError = undefined;
    }

    return [];
  },
});

export const miscRules = [
  // Device code
  deviceCodeStartedRule,
  deviceCodeCompletedRule,
  deviceCodeCancelledRule,
  // Auth code flow
  authCodeFlowStartedRule,
  authCodeFlowCompletedRule,
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
];
