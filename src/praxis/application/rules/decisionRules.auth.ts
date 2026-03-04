/**
 * Praxis Application Rules – Decision Ledger: Auth
 *
 * Records decision entries for all authentication-related mutating events.
 */

import { defineRule, findEvent } from '@plures/praxis';
import type { ApplicationEngineContext } from '../engine.js';
import { recordDecision } from '../../../decision-ledger/ledger.js';
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
    recordDecision(state.context, {
      category: 'auth',
      operation: 'signInEntra',
      outcome: 'allowed',
      rationale: 'User requested Entra sign-in',
      connectionId: ev.payload.connectionId,
      payload: { forceInteractive: ev.payload.forceInteractive ?? false },
    });
    return [];
  },
});

const recordSignOutDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.auth.signOut',
  description: 'Record decision when Entra sign-out is requested',
  meta: { triggers: ['SIGN_OUT_ENTRA'] },
  impl: (state, events) => {
    const ev = findEvent(events, SignOutEntraEvent);
    if (!ev) return [];
    recordDecision(state.context, {
      category: 'auth',
      operation: 'signOutEntra',
      outcome: 'allowed',
      rationale: 'User requested Entra sign-out',
      connectionId: ev.payload.connectionId,
    });
    return [];
  },
});

const recordAuthSuccessDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.auth.success',
  description: 'Record decision on authentication success',
  meta: { triggers: ['AUTHENTICATION_SUCCESS'] },
  impl: (state, events) => {
    const ev = findEvent(events, AuthenticationSuccessEvent);
    if (!ev) return [];
    recordDecision(state.context, {
      category: 'auth',
      operation: 'authenticationSuccess',
      outcome: 'allowed',
      rationale: 'Authentication completed successfully',
      connectionId: ev.payload.connectionId,
    });
    return [];
  },
});

const recordAuthFailedDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.auth.failed',
  description: 'Record decision on authentication failure',
  meta: { triggers: ['AUTHENTICATION_FAILED'] },
  impl: (state, events) => {
    const ev = findEvent(events, AuthenticationFailedEvent);
    if (!ev) return [];
    recordDecision(state.context, {
      category: 'auth',
      operation: 'authenticationFailed',
      outcome: 'denied',
      rationale: ev.payload.error,
      connectionId: ev.payload.connectionId,
    });
    return [];
  },
});

const recordDeviceCodeStartDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.auth.deviceCodeStart',
  description: 'Record decision when device code flow starts',
  meta: { triggers: ['DEVICE_CODE_STARTED'] },
  impl: (state, events) => {
    const ev = findEvent(events, DeviceCodeStartedAppEvent);
    if (!ev) return [];
    recordDecision(state.context, {
      category: 'auth',
      operation: 'deviceCodeStart',
      outcome: 'allowed',
      rationale: 'Device code flow initiated',
      connectionId: ev.payload.connectionId,
    });
    return [];
  },
});

const recordDeviceCodeCompleteDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.auth.deviceCodeComplete',
  description: 'Record decision when device code flow completes',
  meta: { triggers: ['DEVICE_CODE_COMPLETED'] },
  impl: (state, events) => {
    const ev = findEvent(events, DeviceCodeCompletedAppEvent);
    if (!ev) return [];
    recordDecision(state.context, {
      category: 'auth',
      operation: 'deviceCodeComplete',
      outcome: 'allowed',
      rationale: 'Device code flow completed',
      connectionId: ev.payload.connectionId,
    });
    return [];
  },
});

const recordDeviceCodeCancelDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.auth.deviceCodeCancel',
  description: 'Record decision when device code flow is cancelled',
  meta: { triggers: ['DEVICE_CODE_CANCELLED'] },
  impl: (state, events) => {
    const ev = findEvent(events, DeviceCodeCancelledEvent);
    if (!ev) return [];
    recordDecision(state.context, {
      category: 'auth',
      operation: 'deviceCodeCancel',
      outcome: 'deferred',
      rationale: 'Device code flow cancelled by user',
      connectionId: ev.payload.connectionId,
    });
    return [];
  },
});

const recordAuthCodeFlowStartDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.auth.authCodeFlowStart',
  description: 'Record decision when auth code flow starts',
  meta: { triggers: ['AUTH_CODE_FLOW_STARTED'] },
  impl: (state, events) => {
    const ev = findEvent(events, AuthCodeFlowStartedAppEvent);
    if (!ev) return [];
    recordDecision(state.context, {
      category: 'auth',
      operation: 'authCodeFlowStart',
      outcome: 'allowed',
      rationale: 'Authorization code flow with PKCE initiated',
      connectionId: ev.payload.connectionId,
    });
    return [];
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
    recordDecision(state.context, {
      category: 'auth',
      operation: 'authCodeFlowComplete',
      outcome,
      rationale,
      connectionId: ev.payload.connectionId,
    });
    return [];
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
