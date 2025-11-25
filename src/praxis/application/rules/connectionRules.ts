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
} from '../facts.js';

/**
 * Handle connections loaded
 */
export const connectionsLoadedRule = defineRule<ApplicationEngineContext>({
  id: 'application.connectionsLoaded',
  description: 'Handle connections loaded',
  impl: (state, events) => {
    const loadedEvent = findEvent(events, ConnectionsLoadedEvent);
    if (!loadedEvent) return [];

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

export const connectionRules = [
  connectionsLoadedRule,
  connectionSelectedRule,
  queryChangedRule,
  viewModeChangedRule,
];
