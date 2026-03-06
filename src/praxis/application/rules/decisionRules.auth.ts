/**
 * Praxis Application Rules – Decision Ledger: Auth
 *
 * Records decision entries for all authentication-related mutating events.
 */

import { defineRule, findEvent } from '@plures/praxis';
import type { ApplicationEngineContext } from '../engine.js';
import { recordDecision } from '../../../decision-ledger/ledger.js';
import { DecisionRecordedEvent } from '../../../decision-ledger/events.js';
import { AUTH_INTENTS } from '../../../praxis-logic/intents.js';
import {
  SignInEntraEvent,
  SignOutEntraEvent,
  AuthenticationSuccessEvent,
  AuthenticationFailedEvent,
  DeviceCodeStartedAppEvent,
  DeviceCodeCompletedAppEvent,
  DeviceCodeCancelledEvent,
  AuthCodeFlowStartedAppEvent,
  AuthCodeFlowCompletedAppEvent,
} from '../facts.js';

const recordSignInDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.auth.signIn',
  description: 'Record decision when Entra sign-in is requested',
  meta: { triggers: ['SIGN_IN_ENTRA'] },
  impl: (state, events) => {
    const ev = findEvent(events, SignInEntraEvent);
    if (!ev) return [];
    const record = recordDecision(state.context, {
      category: 'auth',
      operation: AUTH_INTENTS.SIGN_IN_ENTRA,
      outcome: 'allowed',
      rationale: 'User requested Entra sign-in',
      connectionId: ev.payload.connectionId,
      payload: { forceInteractive: ev.payload.forceInteractive ?? false },
    });
    return [DecisionRecordedEvent.create(record)];
  },
});

const recordSignOutDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.auth.signOut',
  description: 'Record decision when Entra sign-out is requested',
  meta: { triggers: ['SIGN_OUT_ENTRA'] },
  impl: (state, events) => {
    const ev = findEvent(events, SignOutEntraEvent);
    if (!ev) return [];
    const record = recordDecision(state.context, {
      category: 'auth',
      operation: AUTH_INTENTS.SIGN_OUT_ENTRA,
      outcome: 'allowed',
      rationale: 'User requested Entra sign-out',
      connectionId: ev.payload.connectionId,
    });
    return [DecisionRecordedEvent.create(record)];
  },
});

const recordAuthSuccessDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.auth.success',
  description: 'Record decision on authentication success',
  meta: { triggers: ['AUTHENTICATION_SUCCESS'] },
  impl: (state, events) => {
    const ev = findEvent(events, AuthenticationSuccessEvent);
    if (!ev) return [];
    const record = recordDecision(state.context, {
      category: 'auth',
      operation: AUTH_INTENTS.SUCCESS,
      outcome: 'allowed',
      rationale: 'Authentication completed successfully',
      connectionId: ev.payload.connectionId,
    });
    return [DecisionRecordedEvent.create(record)];
  },
});

const recordAuthFailedDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.auth.failed',
  description: 'Record decision on authentication failure',
  meta: { triggers: ['AUTHENTICATION_FAILED'] },
  impl: (state, events) => {
    const ev = findEvent(events, AuthenticationFailedEvent);
    if (!ev) return [];
    const record = recordDecision(state.context, {
      category: 'auth',
      operation: AUTH_INTENTS.FAILED,
      outcome: 'denied',
      rationale: ev.payload.error,
      connectionId: ev.payload.connectionId,
    });
    return [DecisionRecordedEvent.create(record)];
  },
});

const recordDeviceCodeStartDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.auth.deviceCodeStart',
  description: 'Record decision when device code flow starts',
  meta: { triggers: ['DEVICE_CODE_STARTED'] },
  impl: (state, events) => {
    const ev = findEvent(events, DeviceCodeStartedAppEvent);
    if (!ev) return [];
    const record = recordDecision(state.context, {
      category: 'auth',
      operation: AUTH_INTENTS.DEVICE_CODE_START,
      outcome: 'allowed',
      rationale: 'Device code flow initiated',
      connectionId: ev.payload.connectionId,
    });
    return [DecisionRecordedEvent.create(record)];
  },
});

const recordDeviceCodeCompleteDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.auth.deviceCodeComplete',
  description: 'Record decision when device code flow completes',
  meta: { triggers: ['DEVICE_CODE_COMPLETED'] },
  impl: (state, events) => {
    const ev = findEvent(events, DeviceCodeCompletedAppEvent);
    if (!ev) return [];
    const record = recordDecision(state.context, {
      category: 'auth',
      operation: AUTH_INTENTS.DEVICE_CODE_COMPLETE,
      outcome: 'allowed',
      rationale: 'Device code flow completed',
      connectionId: ev.payload.connectionId,
    });
    return [DecisionRecordedEvent.create(record)];
  },
});

const recordDeviceCodeCancelDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.auth.deviceCodeCancel',
  description: 'Record decision when device code flow is cancelled',
  meta: { triggers: ['DEVICE_CODE_CANCELLED'] },
  impl: (state, events) => {
    const ev = findEvent(events, DeviceCodeCancelledEvent);
    if (!ev) return [];
    const record = recordDecision(state.context, {
      category: 'auth',
      operation: AUTH_INTENTS.DEVICE_CODE_CANCEL,
      outcome: 'deferred',
      rationale: 'Device code flow cancelled by user',
      connectionId: ev.payload.connectionId,
    });
    return [DecisionRecordedEvent.create(record)];
  },
});

const recordAuthCodeFlowStartDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.auth.authCodeFlowStart',
  description: 'Record decision when auth code flow starts',
  meta: { triggers: ['AUTH_CODE_FLOW_STARTED'] },
  impl: (state, events) => {
    const ev = findEvent(events, AuthCodeFlowStartedAppEvent);
    if (!ev) return [];
    const record = recordDecision(state.context, {
      category: 'auth',
      operation: AUTH_INTENTS.AUTH_CODE_FLOW_START,
      outcome: 'allowed',
      rationale: 'Authorization code flow with PKCE initiated',
      connectionId: ev.payload.connectionId,
    });
    return [DecisionRecordedEvent.create(record)];
  },
});

const recordAuthCodeFlowCompleteDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.auth.authCodeFlowComplete',
  description: 'Record decision when auth code flow completes',
  meta: { triggers: ['AUTH_CODE_FLOW_COMPLETED'] },
  impl: (state, events) => {
    const ev = findEvent(events, AuthCodeFlowCompletedAppEvent);
    if (!ev) return [];
    const outcome = ev.payload.success ? 'allowed' : 'denied';
    const rationale = ev.payload.success
      ? 'Authorization code flow completed successfully'
      : (ev.payload.error ?? 'Authorization code flow failed');
    const record = recordDecision(state.context, {
      category: 'auth',
      operation: AUTH_INTENTS.AUTH_CODE_FLOW_COMPLETE,
      outcome,
      rationale,
      connectionId: ev.payload.connectionId,
    });
    return [DecisionRecordedEvent.create(record)];
  },
});

export const authDecisionRules = [
  recordSignInDecision,
  recordSignOutDecision,
  recordAuthSuccessDecision,
  recordAuthFailedDecision,
  recordDeviceCodeStartDecision,
  recordDeviceCodeCompleteDecision,
  recordDeviceCodeCancelDecision,
  recordAuthCodeFlowStartDecision,
  recordAuthCodeFlowCompleteDecision,
];
