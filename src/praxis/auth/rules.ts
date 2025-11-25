/**
 * Praxis Authentication Rules
 *
 * Defines the rules for authentication state transitions using the Praxis logic engine.
 * These rules update the authentication context directly based on events.
 */

import { defineRule, findEvent, type RuleDescriptor } from '@plures/praxis';
import type { PraxisAuthContext } from './types.js';
import { DEFAULT_AUTH_CONFIG } from './types.js';
import {
  AuthenticateEvent,
  AuthSuccessEvent,
  AuthFailedEvent,
  LogoutEvent,
  TokenExpiredEvent,
  DeviceCodeStartedEvent,
  DeviceCodeCompletedEvent,
  RetryAuthEvent,
  ResetAuthEvent,
} from './facts.js';
import type { AuthEngineContext } from './engine.js';

/**
 * Authenticate rule - initiates authentication
 */
export const authenticateRule: RuleDescriptor<AuthEngineContext> = defineRule({
  id: 'auth.authenticate',
  description: 'Initiate authentication for a connection',
  impl: (state, events) => {
    const authEvent = findEvent(events, AuthenticateEvent);
    if (!authEvent) return [];
    if (state.context.authState !== 'idle' && state.context.authState !== 'failed') return [];

    const now = Date.now();
    state.context.authState = 'authenticating';
    state.context.authData = {
      ...state.context.authData,
      connectionId: authEvent.payload.connectionId,
      authMethod: authEvent.payload.authMethod,
      tenantId: authEvent.payload.tenantId,
      clientId: authEvent.payload.clientId,
      lastAuthAttempt: now,
      error: undefined,
    };
    return [];
  },
});

/**
 * Auth success rule - handles successful authentication
 */
export const authSuccessRule: RuleDescriptor<AuthEngineContext> = defineRule({
  id: 'auth.success',
  description: 'Handle successful authentication',
  impl: (state, events) => {
    const successEvent = findEvent(events, AuthSuccessEvent);
    if (!successEvent) return [];
    if (state.context.authState !== 'authenticating') return [];

    state.context.authState = 'authenticated';
    state.context.authData = {
      ...state.context.authData,
      token: successEvent.payload.token,
      expiresAt: successEvent.payload.expiresAt,
      error: undefined,
      retryCount: 0,
      deviceCodeSession: undefined,
    };
    return [];
  },
});

/**
 * Auth failed rule - handles failed authentication
 */
export const authFailedRule: RuleDescriptor<AuthEngineContext> = defineRule({
  id: 'auth.failed',
  description: 'Handle failed authentication',
  impl: (state, events) => {
    const failedEvent = findEvent(events, AuthFailedEvent);
    if (!failedEvent) return [];
    if (state.context.authState !== 'authenticating') return [];

    state.context.authState = 'failed';
    state.context.authData = {
      ...state.context.authData,
      error: failedEvent.payload.error,
      retryCount: state.context.authData.retryCount + 1,
      token: undefined,
      expiresAt: undefined,
      deviceCodeSession: undefined,
    };
    return [];
  },
});

/**
 * Logout rule - clears authentication state
 */
export const logoutRule: RuleDescriptor<AuthEngineContext> = defineRule({
  id: 'auth.logout',
  description: 'Clear authentication state on logout',
  impl: (state, events) => {
    const logoutEvent = findEvent(events, LogoutEvent);
    if (!logoutEvent) return [];
    if (state.context.authState !== 'authenticated') return [];

    state.context.authState = 'idle';
    state.context.authData = {
      ...state.context.authData,
      token: undefined,
      expiresAt: undefined,
      error: undefined,
      retryCount: 0,
      deviceCodeSession: undefined,
    };
    return [];
  },
});

/**
 * Token expired rule - handles token expiration
 */
export const tokenExpiredRule: RuleDescriptor<AuthEngineContext> = defineRule({
  id: 'auth.tokenExpired',
  description: 'Handle token expiration',
  impl: (state, events) => {
    const expiredEvent = findEvent(events, TokenExpiredEvent);
    if (!expiredEvent) return [];
    if (state.context.authState !== 'authenticated') return [];

    state.context.authState = 'failed';
    state.context.authData = {
      ...state.context.authData,
      error: 'Token expired',
      token: undefined,
      expiresAt: undefined,
    };
    return [];
  },
});

/**
 * Device code started rule - handles device code flow start
 */
export const deviceCodeStartedRule: RuleDescriptor<AuthEngineContext> = defineRule({
  id: 'auth.deviceCodeStarted',
  description: 'Handle device code flow start',
  impl: (state, events) => {
    const deviceCodeEvent = findEvent(events, DeviceCodeStartedEvent);
    if (!deviceCodeEvent) return [];
    if (state.context.authState !== 'authenticating') return [];

    state.context.authData = {
      ...state.context.authData,
      deviceCodeSession: {
        userCode: deviceCodeEvent.payload.userCode,
        verificationUri: deviceCodeEvent.payload.verificationUri,
        expiresInSeconds: deviceCodeEvent.payload.expiresInSeconds,
        startedAt: Date.now(),
      },
    };
    return [];
  },
});

/**
 * Device code completed rule - handles device code flow completion
 */
export const deviceCodeCompletedRule: RuleDescriptor<AuthEngineContext> = defineRule({
  id: 'auth.deviceCodeCompleted',
  description: 'Handle device code flow completion',
  impl: (state, events) => {
    const completedEvent = findEvent(events, DeviceCodeCompletedEvent);
    if (!completedEvent) return [];
    if (state.context.authState !== 'authenticating') return [];

    state.context.authState = 'authenticated';
    state.context.authData = {
      ...state.context.authData,
      token: completedEvent.payload.token,
      expiresAt: completedEvent.payload.expiresAt,
      error: undefined,
      retryCount: 0,
      deviceCodeSession: undefined,
    };
    return [];
  },
});

/**
 * Retry auth rule - retry authentication after failure
 */
export const retryAuthRule: RuleDescriptor<AuthEngineContext> = defineRule({
  id: 'auth.retry',
  description: 'Retry authentication after failure',
  impl: (state, events) => {
    const retryEvent = findEvent(events, RetryAuthEvent);
    if (!retryEvent) return [];
    if (state.context.authState !== 'failed') return [];

    // Check if we've exceeded max retries
    if (state.context.authData.retryCount >= DEFAULT_AUTH_CONFIG.maxRetryCount) {
      return [];
    }

    state.context.authState = 'authenticating';
    state.context.authData = {
      ...state.context.authData,
      lastAuthAttempt: Date.now(),
      error: undefined,
    };
    return [];
  },
});

/**
 * Reset auth rule - reset authentication state to idle
 */
export const resetAuthRule: RuleDescriptor<AuthEngineContext> = defineRule({
  id: 'auth.reset',
  description: 'Reset authentication state',
  impl: (state, events) => {
    const resetEvent = findEvent(events, ResetAuthEvent);
    if (!resetEvent) return [];

    state.context.authState = 'idle';
    state.context.authData = {
      connectionId: state.context.authData.connectionId,
      authMethod: state.context.authData.authMethod,
      retryCount: 0,
      token: undefined,
      expiresAt: undefined,
      error: undefined,
      deviceCodeSession: undefined,
    };
    return [];
  },
});
