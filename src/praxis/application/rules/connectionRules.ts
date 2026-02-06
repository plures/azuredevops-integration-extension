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
const connectionsLoadedRule = defineRule<ApplicationEngineContext>({
  id: 'application.connectionsLoaded',
  description: 'Handle connections loaded',
  meta: {
    triggers: ['CONNECTIONS_LOADED'],
  },
  impl: (state, events) => {
    const loadedEvent = findEvent(events, ConnectionsLoadedEvent);
    if (!loadedEvent) return [];

    state.context.connections = loadedEvent.payload.connections;

    // Initialize connection states for each connection (if not already present)
    // This ensures connectionStates Map is populated when connections are loaded
    state.context.connectionStates = new Map(state.context.connectionStates);
    for (const connection of loadedEvent.payload.connections) {
      if (!state.context.connectionStates.has(connection.id)) {
        state.context.connectionStates.set(connection.id, {
          state: 'disconnected',
          connectionId: connection.id,
          isConnected: false,
          authMethod: connection.authMethod || 'pat',
          hasClient: false,
          hasProvider: false,
          retryCount: 0,
          error: undefined,
        });
      }
    }

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
const connectionSelectedRule = defineRule<ApplicationEngineContext>({
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
const queryChangedRule = defineRule<ApplicationEngineContext>({
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

    // Priority 3: Make Map updates immutable (create new Map instance)
    // Priority 4: Idempotency - only update if changed
    if (targetConnectionId) {
      const existingQuery = state.context.connectionQueries.get(targetConnectionId);
      if (existingQuery !== query) {
        state.context.connectionQueries = new Map(state.context.connectionQueries);
        state.context.connectionQueries.set(targetConnectionId, query);
      }
    }

    return [];
  },
});

/**
 * Handle view mode changed
 */
const viewModeChangedRule = defineRule<ApplicationEngineContext>({
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

    // Priority 3: Make Map updates immutable (create new Map instance)
    // Priority 4: Idempotency - only update if changed
    if (state.context.activeConnectionId) {
      const existingMode = state.context.connectionViewModes.get(state.context.activeConnectionId);
      if (existingMode !== modeEvent.payload.viewMode) {
        state.context.connectionViewModes = new Map(state.context.connectionViewModes);
        state.context.connectionViewModes.set(
          state.context.activeConnectionId,
          modeEvent.payload.viewMode
        );
      }
    }

    return [];
  },
});

/**
 * Handle authentication failure
 */
const authenticationFailedRule = defineRule<ApplicationEngineContext>({
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

    // Priority 3: Make Map updates immutable (create new Map instance)
    // Priority 4: Idempotency - check if already exists with same value
    const existingReminder = state.context.pendingAuthReminders.get(connectionId);
    const newReminder = {
      connectionId,
      reason: error,
      status: 'pending',
    };

    if (
      !existingReminder ||
      existingReminder.reason !== newReminder.reason ||
      existingReminder.status !== newReminder.status
    ) {
      state.context.pendingAuthReminders = new Map(state.context.pendingAuthReminders);
      state.context.pendingAuthReminders.set(connectionId, newReminder);
    }

    // Update connection state if it exists (immutable Map update)
    const existingState = state.context.connectionStates.get(connectionId);
    if (existingState) {
      const updatedState = {
        ...existingState,
        state: 'auth_failed',
        error: error,
        isConnected: false,
      };
      // Only update if changed (idempotency)
      if (
        existingState.state !== updatedState.state ||
        existingState.error !== updatedState.error ||
        existingState.isConnected !== updatedState.isConnected
      ) {
        state.context.connectionStates = new Map(state.context.connectionStates);
        state.context.connectionStates.set(connectionId, updatedState);
      }
    } else {
      // If we don't have state yet, create a placeholder one
      const connection = state.context.connections.find((c) => c.id === connectionId);
      if (connection) {
        state.context.connectionStates = new Map(state.context.connectionStates);
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
const connectionStateUpdatedRule = defineRule<ApplicationEngineContext>({
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

    // Priority 3: Make Map updates immutable (create new Map instance)
    // Priority 4: Idempotency - only update if changed
    const existingSnapshot = state.context.connectionStates.get(connectionId);
    if (!existingSnapshot || JSON.stringify(existingSnapshot) !== JSON.stringify(snapshot)) {
      state.context.connectionStates = new Map(state.context.connectionStates);
      state.context.connectionStates.set(connectionId, snapshot);
    }
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
