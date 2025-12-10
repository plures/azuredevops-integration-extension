/**
 * Praxis Application Rules - Connection
 *
 * Rules for connection management state transitions.
 */

import { defineRule, findEvent } from '@plures/praxis';
import type { ApplicationEngineContext } from '../engine.js';
import {
  ConnectionsLoadedEvent,
  ConnectionSelectedEvent,
  SelectConnectionEvent,
  QueryChangedEvent,
  ViewModeChangedEvent,
  ConnectionStateUpdatedEvent,
  AuthenticationFailedEvent,
} from '../facts.js';
import type { PraxisConnectionSnapshot, PraxisConnectionState } from '../../connection/types.js';

/**
 * Handle connections loaded
 */
export const connectionsLoadedRule = defineRule<ApplicationEngineContext>({
  id: 'application.connectionsLoaded',
  description: 'Handle connections loaded',
  meta: {
    triggers: ['CONNECTIONS_LOADED'],
  },
  impl: (state, events) => {
    const loadedEvent = findEvent(events, ConnectionsLoadedEvent);
    if (!loadedEvent) return [];

    // console.log('[Praxis] connectionsLoadedRule triggered', {
    //   count: loadedEvent.payload.connections.length,
    //   ids: loadedEvent.payload.connections.map((c) => c.id),
    // });

    state.context.connections = loadedEvent.payload.connections;

    // Auto-select first connection if none selected
    if (!state.context.activeConnectionId && state.context.connections.length > 0) {
      state.context.activeConnectionId = state.context.connections[0].id;
    }

    return [];
  },
});

/**
 * Handle connection selected
 */
export const connectionSelectedRule = defineRule<ApplicationEngineContext>({
  id: 'application.connectionSelected',
  description: 'Handle connection selection',
  meta: {
    triggers: ['CONNECTION_SELECTED', 'SELECT_CONNECTION'],
  },
  impl: (state, events) => {
    // Handle both CONNECTION_SELECTED and SELECT_CONNECTION events
    const selectedEvent =
      findEvent(events, ConnectionSelectedEvent) || findEvent(events, SelectConnectionEvent);
    if (!selectedEvent) return [];

    const connectionId = selectedEvent.payload.connectionId;

    // Verify connection exists
    const connectionExists = state.context.connections.some((c) => c.id === connectionId);
    if (!connectionExists) return [];

    state.context.activeConnectionId = connectionId;

    // Restore query for this connection if available
    const savedQuery = state.context.connectionQueries.get(connectionId);
    if (savedQuery) {
      state.context.activeQuery = savedQuery;
    }

    return [];
  },
});

/**
 * Handle query changed
 */
export const queryChangedRule = defineRule<ApplicationEngineContext>({
  id: 'application.queryChanged',
  description: 'Handle query change',
  meta: {
    triggers: ['QUERY_CHANGED'],
  },
  impl: (state, events) => {
    const queryEvent = findEvent(events, QueryChangedEvent);
    if (!queryEvent) return [];

    const { query, connectionId } = queryEvent.payload;
    const targetConnectionId = connectionId || state.context.activeConnectionId;

    state.context.activeQuery = query;

    // Save query per connection
    if (targetConnectionId) {
      state.context.connectionQueries.set(targetConnectionId, query);
    }

    return [];
  },
});

/**
 * Handle view mode changed
 */
export const viewModeChangedRule = defineRule<ApplicationEngineContext>({
  id: 'application.viewModeChanged',
  description: 'Handle view mode change',
  meta: {
    triggers: ['VIEW_MODE_CHANGED'],
    transition: { from: 'active', to: 'active' },
  },
  impl: (state, events) => {
    const modeEvent = findEvent(events, ViewModeChangedEvent);
    if (!modeEvent) return [];

    state.context.viewMode = modeEvent.payload.viewMode;

    // Save view mode per connection
    if (state.context.activeConnectionId) {
      state.context.connectionViewModes.set(
        state.context.activeConnectionId,
        modeEvent.payload.viewMode
      );
    }

    return [];
  },
});

/**
 * Handle authentication failure
 */
export const authenticationFailedRule = defineRule<ApplicationEngineContext>({
  id: 'application.authenticationFailed',
  description: 'Handle authentication failure',
  meta: {
    triggers: ['AUTHENTICATION_FAILED'],
  },
  impl: (state, events) => {
    const failedEvent = findEvent(events, AuthenticationFailedEvent);
    if (!failedEvent) return [];

    const { connectionId, error } = failedEvent.payload;

    // Update last error
    state.context.lastError = {
      message: error,
      connectionId,
    };

    // Add auth reminder
    state.context.pendingAuthReminders.set(connectionId, {
      connectionId,
      reason: error,
      status: 'pending',
    });

    // Update connection state if it exists
    const existingState = state.context.connectionStates.get(connectionId);
    if (existingState) {
      state.context.connectionStates.set(connectionId, {
        ...existingState,
        state: 'auth_failed',
        error: error,
        isConnected: false,
      });
    } else {
      // If we don't have state yet, create a placeholder one
      const connection = state.context.connections.find((c) => c.id === connectionId);
      if (connection) {
        state.context.connectionStates.set(connectionId, {
          state: 'auth_failed',
          connectionId,
          isConnected: false,
          authMethod: connection.authMethod || 'pat',
          hasClient: false,
          hasProvider: false,
          error: error,
          retryCount: 0,
        });
      }
    }

    return [];
  },
});

/**
 * Handle connection state updated
 */
export const connectionStateUpdatedRule = defineRule<ApplicationEngineContext>({
  id: 'application.connectionStateUpdated',
  description: 'Update connection state from external source',
  meta: {
    triggers: ['CONNECTION_STATE_UPDATED'],
  },
  impl: (state, events) => {
    const event = findEvent(events, ConnectionStateUpdatedEvent);
    if (!event) return [];
    const { connectionId, state: connState } = event.payload;

    // Map legacy state to PraxisConnectionSnapshot
    // Legacy state: { status: 'connected', connection: {...}, authMethod: '...', id: '...' }
    // PraxisConnectionSnapshot: { state: PraxisConnectionState, connectionId: string, isConnected: boolean, ... }

    const status = connState.status || 'disconnected';
    const isConnected = status === 'connected';
    const praxisState: PraxisConnectionState = isConnected ? 'connected' : 'disconnected';

    const snapshot: PraxisConnectionSnapshot = {
      state: praxisState,
      connectionId: connectionId,
      isConnected: isConnected,
      authMethod: connState.authMethod || 'pat',
      hasClient: !!connState.client,
      hasProvider: !!connState.provider,
      retryCount: 0,
      error: undefined,
    };

    state.context.connectionStates.set(connectionId, snapshot);
    return [];
  },
});

export const connectionRules = [
  connectionsLoadedRule,
  connectionSelectedRule,
  queryChangedRule,
  viewModeChangedRule,
  connectionStateUpdatedRule,
  authenticationFailedRule,
];
