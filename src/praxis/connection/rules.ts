/**
 * Praxis Connection Rules
 *
 * Defines the rules for connection state transitions using the Praxis logic engine.
 * These rules update the connection context directly based on events.
 */

import { defineRule, findEvent, type RuleDescriptor } from '@plures/praxis';
import { DEFAULT_CONNECTION_CONFIG } from './types.js';
import {
  ConnectEvent,
  DisconnectEvent,
  AuthenticatedEvent,
  AuthConnectionFailedEvent,
  ClientCreatedEvent,
  ClientFailedEvent,
  ProviderCreatedEvent,
  ProviderFailedEvent,
  ConnectionErrorEvent,
  TokenExpiredConnectionEvent,
  RefreshAuthEvent,
  TokenRefreshedEvent,
  TokenRefreshFailedEvent,
  RetryConnectionEvent,
  ResetConnectionEvent,
} from './facts.js';
import type { ConnectionEngineContext } from './engine.js';

/**
 * Connect rule - initiates connection
 */
export const connectRule: RuleDescriptor<ConnectionEngineContext> = defineRule({
  id: 'connection.connect',
  description: 'Initiate connection to Azure DevOps',
  impl: (state, events) => {
    const connectEvent = findEvent(events, ConnectEvent);
    if (!connectEvent) return [];

    // Allow connection from disconnected or any failed state
    const allowedStates = [
      'disconnected',
      'auth_failed',
      'client_failed',
      'provider_failed',
      'connection_error',
    ];
    if (!allowedStates.includes(state.context.connectionState)) return [];

    state.context.connectionState = 'authenticating';
    state.context.connectionData = {
      ...state.context.connectionData,
      config: connectEvent.payload.config,
      connectionId: connectEvent.payload.config.id,
      authMethod: connectEvent.payload.config.authMethod || 'pat',
      forceInteractive: connectEvent.payload.forceInteractive || false,
      retryCount: 0,
      lastError: undefined,
    };
    return [];
  },
});

/**
 * Disconnect rule - disconnects and clears state
 */
export const disconnectRule: RuleDescriptor<ConnectionEngineContext> = defineRule({
  id: 'connection.disconnect',
  description: 'Disconnect from Azure DevOps',
  impl: (state, events) => {
    const disconnectEvent = findEvent(events, DisconnectEvent);
    if (!disconnectEvent) return [];

    state.context.connectionState = 'disconnected';
    state.context.connectionData = {
      ...state.context.connectionData,
      isConnected: false,
      client: undefined,
      provider: undefined,
      credential: undefined,
      pat: undefined,
      accessToken: undefined,
      accessTokenExpiresAt: undefined,
      lastError: undefined,
      forceInteractive: false,
    };
    return [];
  },
});

/**
 * Authenticated rule - handle successful authentication
 */
export const authenticatedRule: RuleDescriptor<ConnectionEngineContext> = defineRule({
  id: 'connection.authenticated',
  description: 'Handle successful authentication',
  impl: (state, events) => {
    const authEvent = findEvent(events, AuthenticatedEvent);
    if (!authEvent) return [];
    if (state.context.connectionState !== 'authenticating') return [];

    state.context.connectionState = 'creating_client';
    state.context.connectionData = {
      ...state.context.connectionData,
      credential: authEvent.payload.credential,
      accessToken: authEvent.payload.credential,
      accessTokenExpiresAt: authEvent.payload.expiresAt,
      lastError: undefined,
    };
    return [];
  },
});

/**
 * Auth failed rule - handle authentication failure
 */
export const authConnectionFailedRule: RuleDescriptor<ConnectionEngineContext> = defineRule({
  id: 'connection.authFailed',
  description: 'Handle authentication failure',
  impl: (state, events) => {
    const failedEvent = findEvent(events, AuthConnectionFailedEvent);
    if (!failedEvent) return [];
    if (state.context.connectionState !== 'authenticating') return [];

    state.context.connectionState = 'auth_failed';
    state.context.connectionData = {
      ...state.context.connectionData,
      lastError: failedEvent.payload.error,
      retryCount: state.context.connectionData.retryCount + 1,
      reauthInProgress: false,
      forceInteractive: false,
    };
    return [];
  },
});

/**
 * Client created rule - handle Azure client creation success
 */
export const clientCreatedRule: RuleDescriptor<ConnectionEngineContext> = defineRule({
  id: 'connection.clientCreated',
  description: 'Handle Azure client creation success',
  impl: (state, events) => {
    const clientEvent = findEvent(events, ClientCreatedEvent);
    if (!clientEvent) return [];
    if (state.context.connectionState !== 'creating_client') return [];

    state.context.connectionState = 'creating_provider';
    state.context.connectionData = {
      ...state.context.connectionData,
      client: clientEvent.payload.client,
    };
    return [];
  },
});

/**
 * Client failed rule - handle Azure client creation failure
 */
export const clientFailedRule: RuleDescriptor<ConnectionEngineContext> = defineRule({
  id: 'connection.clientFailed',
  description: 'Handle Azure client creation failure',
  impl: (state, events) => {
    const failedEvent = findEvent(events, ClientFailedEvent);
    if (!failedEvent) return [];
    if (state.context.connectionState !== 'creating_client') return [];

    state.context.connectionState = 'client_failed';
    state.context.connectionData = {
      ...state.context.connectionData,
      lastError: failedEvent.payload.error,
    };
    return [];
  },
});

/**
 * Provider created rule - handle provider creation success
 */
export const providerCreatedRule: RuleDescriptor<ConnectionEngineContext> = defineRule({
  id: 'connection.providerCreated',
  description: 'Handle provider creation success',
  impl: (state, events) => {
    const providerEvent = findEvent(events, ProviderCreatedEvent);
    if (!providerEvent) return [];
    if (state.context.connectionState !== 'creating_provider') return [];

    state.context.connectionState = 'connected';
    state.context.connectionData = {
      ...state.context.connectionData,
      provider: providerEvent.payload.provider,
      isConnected: true,
      retryCount: 0,
      lastError: undefined,
    };
    return [];
  },
});

/**
 * Provider failed rule - handle provider creation failure
 */
export const providerFailedRule: RuleDescriptor<ConnectionEngineContext> = defineRule({
  id: 'connection.providerFailed',
  description: 'Handle provider creation failure',
  impl: (state, events) => {
    const failedEvent = findEvent(events, ProviderFailedEvent);
    if (!failedEvent) return [];
    if (state.context.connectionState !== 'creating_provider') return [];

    state.context.connectionState = 'provider_failed';
    state.context.connectionData = {
      ...state.context.connectionData,
      lastError: failedEvent.payload.error,
    };
    return [];
  },
});

/**
 * Connection error rule - handle general connection errors
 */
export const connectionErrorRule: RuleDescriptor<ConnectionEngineContext> = defineRule({
  id: 'connection.error',
  description: 'Handle connection error',
  impl: (state, events) => {
    const errorEvent = findEvent(events, ConnectionErrorEvent);
    if (!errorEvent) return [];
    if (state.context.connectionState !== 'connected') return [];

    state.context.connectionState = 'connection_error';
    state.context.connectionData = {
      ...state.context.connectionData,
      lastError: errorEvent.payload.error,
      isConnected: false,
    };
    return [];
  },
});

/**
 * Token expired rule - handle token expiration
 */
export const tokenExpiredConnectionRule: RuleDescriptor<ConnectionEngineContext> = defineRule({
  id: 'connection.tokenExpired',
  description: 'Handle token expiration',
  impl: (state, events) => {
    const expiredEvent = findEvent(events, TokenExpiredConnectionEvent);
    if (!expiredEvent) return [];
    if (state.context.connectionState !== 'connected') return [];

    // For Entra auth, transition to auth_failed to wait for user action
    // For PAT auth, attempt re-authentication
    if (state.context.connectionData.authMethod === 'entra') {
      state.context.connectionState = 'auth_failed';
      state.context.connectionData = {
        ...state.context.connectionData,
        lastError: 'Session expired. Please sign in again.',
      };
    } else {
      state.context.connectionState = 'token_refresh';
    }
    return [];
  },
});

/**
 * Refresh auth rule - start token refresh
 */
export const refreshAuthRule: RuleDescriptor<ConnectionEngineContext> = defineRule({
  id: 'connection.refreshAuth',
  description: 'Start authentication token refresh',
  impl: (state, events) => {
    const refreshEvent = findEvent(events, RefreshAuthEvent);
    if (!refreshEvent) return [];
    if (state.context.connectionState !== 'connected') return [];

    state.context.connectionState = 'token_refresh';
    return [];
  },
});

/**
 * Token refreshed rule - handle successful token refresh
 */
export const tokenRefreshedRule: RuleDescriptor<ConnectionEngineContext> = defineRule({
  id: 'connection.tokenRefreshed',
  description: 'Handle successful token refresh',
  impl: (state, events) => {
    const refreshedEvent = findEvent(events, TokenRefreshedEvent);
    if (!refreshedEvent) return [];
    if (state.context.connectionState !== 'token_refresh') return [];

    state.context.connectionState = 'connected';
    state.context.connectionData = {
      ...state.context.connectionData,
      credential: refreshedEvent.payload.token,
      accessToken: refreshedEvent.payload.token,
      accessTokenExpiresAt: refreshedEvent.payload.expiresAt,
      refreshFailureCount: 0,
      lastRefreshFailure: undefined,
      refreshBackoffUntil: undefined,
    };
    return [];
  },
});

/**
 * Token refresh failed rule - handle failed token refresh
 */
export const tokenRefreshFailedRule: RuleDescriptor<ConnectionEngineContext> = defineRule({
  id: 'connection.tokenRefreshFailed',
  description: 'Handle failed token refresh',
  impl: (state, events) => {
    const failedEvent = findEvent(events, TokenRefreshFailedEvent);
    if (!failedEvent) return [];
    if (state.context.connectionState !== 'token_refresh') return [];

    const newFailureCount = state.context.connectionData.refreshFailureCount + 1;
    const backoffMinutes = Math.min(
      DEFAULT_CONNECTION_CONFIG.maxRefreshBackoffMinutes,
      Math.pow(2, newFailureCount) * DEFAULT_CONNECTION_CONFIG.refreshBackoffMinutes
    );

    state.context.connectionState = 'auth_failed';
    state.context.connectionData = {
      ...state.context.connectionData,
      lastError: failedEvent.payload.error,
      refreshFailureCount: newFailureCount,
      lastRefreshFailure: new Date(),
      refreshBackoffUntil: new Date(Date.now() + backoffMinutes * 60 * 1000),
    };
    return [];
  },
});

/**
 * Retry connection rule - retry after failure
 */
export const retryConnectionRule: RuleDescriptor<ConnectionEngineContext> = defineRule({
  id: 'connection.retry',
  description: 'Retry connection after failure',
  impl: (state, events) => {
    const retryEvent = findEvent(events, RetryConnectionEvent);
    if (!retryEvent) return [];

    const failedStates = ['auth_failed', 'client_failed', 'provider_failed', 'connection_error'];
    if (!failedStates.includes(state.context.connectionState)) return [];

    // Check if we've exceeded max retries
    if (state.context.connectionData.retryCount >= DEFAULT_CONNECTION_CONFIG.maxRetryCount) {
      return [];
    }

    state.context.connectionState = 'authenticating';
    state.context.connectionData = {
      ...state.context.connectionData,
      lastError: undefined,
    };
    return [];
  },
});

/**
 * Reset connection rule - reset to disconnected state
 */
export const resetConnectionRule: RuleDescriptor<ConnectionEngineContext> = defineRule({
  id: 'connection.reset',
  description: 'Reset connection state',
  impl: (state, events) => {
    const resetEvent = findEvent(events, ResetConnectionEvent);
    if (!resetEvent) return [];

    state.context.connectionState = 'disconnected';
    state.context.connectionData = {
      ...state.context.connectionData,
      retryCount: 0,
      refreshFailureCount: 0,
      lastRefreshFailure: undefined,
      refreshBackoffUntil: undefined,
      reauthInProgress: false,
      lastError: undefined,
      forceInteractive: false,
      client: undefined,
      provider: undefined,
      credential: undefined,
      isConnected: false,
    };
    return [];
  },
});
