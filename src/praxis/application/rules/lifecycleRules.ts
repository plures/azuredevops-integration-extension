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
const activateRule = defineRule<ApplicationEngineContext>({
  id: 'application.activate',
  description: 'Activate the application',
  meta: {
    triggers: ['ACTIVATE'],
    transition: { from: 'inactive', to: 'activating' },
  },
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
const activationCompleteRule = defineRule<ApplicationEngineContext>({
  id: 'application.activationComplete',
  description: 'Complete application activation',
  meta: {
    triggers: ['ACTIVATION_COMPLETE'],
    transition: { from: 'activating', to: 'active' },
  },
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
const activationFailedRule = defineRule<ApplicationEngineContext>({
  id: 'application.activationFailed',
  description: 'Handle activation failure',
  meta: {
    triggers: ['APP_ACTIVATION_FAILED'],
    transition: { from: 'activating', to: 'activation_error' },
  },
  impl: (state, events) => {
    const failedEvent = findEvent(events, ActivationFailedEvent);
    if (!failedEvent) return [];
    if (state.context.applicationState !== 'activating') return [];

    state.context.applicationState = 'activation_error';
    state.context.lastError = { message: failedEvent.payload.error };
    state.context.errorRecoveryAttempts++;

    return [];
  },
});

/**
 * Handle deactivation
 */
const deactivateRule = defineRule<ApplicationEngineContext>({
  id: 'application.deactivate',
  description: 'Deactivate the application',
  meta: {
    triggers: ['DEACTIVATE'],
    transition: { from: ['inactive', 'active', 'activation_error'], to: 'deactivating' },
  },
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
const deactivationCompleteRule = defineRule<ApplicationEngineContext>({
  id: 'application.deactivationComplete',
  description: 'Complete application deactivation',
  meta: {
    triggers: ['DEACTIVATION_COMPLETE'],
    transition: { from: 'deactivating', to: 'inactive' },
  },
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
