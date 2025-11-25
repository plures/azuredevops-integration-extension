/**
 * Praxis Application Rules - Lifecycle
 *
 * Rules for application lifecycle state transitions.
 */

import { defineRule, findEvent } from '@plures/praxis';
import type { ApplicationEngineContext } from '../engine.js';
import {
  ActivateEvent,
  ActivationCompleteEvent,
  ActivationFailedEvent,
  DeactivateEvent,
  DeactivationCompleteEvent,
} from '../facts.js';

/**
 * Handle application activation
 */
export const activateRule = defineRule<ApplicationEngineContext>({
  id: 'application.activate',
  description: 'Activate the application',
  impl: (state, events) => {
    const activateEvent = findEvent(events, ActivateEvent);
    if (!activateEvent) return [];
    if (state.context.applicationState !== 'inactive') return [];

    state.context.applicationState = 'activating';
    state.context.isActivated = false;
    state.context.isDeactivating = false;
    state.context.errorRecoveryAttempts = 0;
    state.context.lastError = undefined;

    return [];
  },
});

/**
 * Handle activation complete
 */
export const activationCompleteRule = defineRule<ApplicationEngineContext>({
  id: 'application.activationComplete',
  description: 'Complete application activation',
  impl: (state, events) => {
    const completeEvent = findEvent(events, ActivationCompleteEvent);
    if (!completeEvent) return [];
    if (state.context.applicationState !== 'activating') return [];

    state.context.applicationState = 'active';
    state.context.isActivated = true;

    return [];
  },
});

/**
 * Handle activation failure
 */
export const activationFailedRule = defineRule<ApplicationEngineContext>({
  id: 'application.activationFailed',
  description: 'Handle activation failure',
  impl: (state, events) => {
    const failedEvent = findEvent(events, ActivationFailedEvent);
    if (!failedEvent) return [];
    if (state.context.applicationState !== 'activating') return [];

    state.context.applicationState = 'error_recovery';
    state.context.lastError = { message: failedEvent.payload.error };
    state.context.errorRecoveryAttempts++;

    return [];
  },
});

/**
 * Handle deactivation
 */
export const deactivateRule = defineRule<ApplicationEngineContext>({
  id: 'application.deactivate',
  description: 'Deactivate the application',
  impl: (state, events) => {
    const deactivateEvent = findEvent(events, DeactivateEvent);
    if (!deactivateEvent) return [];
    if (state.context.applicationState === 'inactive') return [];
    if (state.context.applicationState === 'deactivating') return [];

    state.context.applicationState = 'deactivating';
    state.context.isDeactivating = true;

    return [];
  },
});

/**
 * Handle deactivation complete
 */
export const deactivationCompleteRule = defineRule<ApplicationEngineContext>({
  id: 'application.deactivationComplete',
  description: 'Complete application deactivation',
  impl: (state, events) => {
    const completeEvent = findEvent(events, DeactivationCompleteEvent);
    if (!completeEvent) return [];
    if (state.context.applicationState !== 'deactivating') return [];

    state.context.applicationState = 'inactive';
    state.context.isActivated = false;
    state.context.isDeactivating = false;

    return [];
  },
});

export const lifecycleRules = [
  activateRule,
  activationCompleteRule,
  activationFailedRule,
  deactivateRule,
  deactivationCompleteRule,
];
