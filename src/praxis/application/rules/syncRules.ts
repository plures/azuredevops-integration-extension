/**
 * Praxis Application Rules - Sync
 *
 * Rules for synchronizing state from backend to frontend.
 */

import { defineRule, findEvent } from '@plures/praxis';
import type { ApplicationEngineContext } from '../engine.js';
import { SyncStateEvent } from '../facts.js';

function updateScalarProperties(state: any, payload: any) {
  if (payload.isActivated !== undefined) state.context.isActivated = payload.isActivated;
  if (payload.isDeactivating !== undefined) state.context.isDeactivating = payload.isDeactivating;
  if (payload.activeConnectionId !== undefined)
    state.context.activeConnectionId = payload.activeConnectionId;
  if (payload.activeQuery !== undefined) state.context.activeQuery = payload.activeQuery;
  if (payload.viewMode !== undefined) state.context.viewMode = payload.viewMode;
  if (payload.pendingWorkItems !== undefined)
    state.context.pendingWorkItems = payload.pendingWorkItems;
  if (payload.deviceCodeSession !== undefined)
    state.context.deviceCodeSession = payload.deviceCodeSession;
  if (payload.authCodeFlowSession !== undefined)
    state.context.authCodeFlowSession = payload.authCodeFlowSession;
  if (payload.lastError !== undefined) state.context.lastError = payload.lastError;
  if (payload.errorRecoveryAttempts !== undefined)
    state.context.errorRecoveryAttempts = payload.errorRecoveryAttempts;
  if (payload.workItemsError !== undefined) state.context.workItemsError = payload.workItemsError;
  if (payload.workItemsErrorConnectionId !== undefined)
    state.context.workItemsErrorConnectionId = payload.workItemsErrorConnectionId;
  if (payload.debugLoggingEnabled !== undefined)
    state.context.debugLoggingEnabled = payload.debugLoggingEnabled;
  if (payload.debugViewVisible !== undefined)
    state.context.debugViewVisible = payload.debugViewVisible;
}

function updateArrayProperties(state: any, payload: any) {
  if (Array.isArray(payload.connections)) {
    state.context.connections = [...payload.connections];
  }
  if (payload.kanbanColumns !== undefined) {
    state.context.kanbanColumns = Array.isArray(payload.kanbanColumns)
      ? [...payload.kanbanColumns]
      : payload.kanbanColumns;
  }
}

function updateMapProperty(state: any, key: string, value: any) {
  if (value === undefined) return;

  if (value instanceof Map) {
    state.context[key] = new Map(value);
  } else if (typeof value === 'object' && value !== null) {
    state.context[key] = new Map(Object.entries(value));
  }
}

function updateMapProperties(state: any, payload: any) {
  updateMapProperty(state, 'connectionStates', payload.connectionStates);
  updateMapProperty(state, 'connectionWorkItems', payload.connectionWorkItems);
  updateMapProperty(state, 'connectionQueries', payload.connectionQueries);
  updateMapProperty(state, 'connectionFilters', payload.connectionFilters);
  updateMapProperty(state, 'connectionViewModes', payload.connectionViewModes);
  updateMapProperty(state, 'pendingAuthReminders', payload.pendingAuthReminders);
}

/**
 * Handle state synchronization
 * Replaces the entire context with the payload from the event.
 */
export const syncStateRule = defineRule<ApplicationEngineContext>({
  id: 'application.syncState',
  description: 'Synchronize application state from backend',
  meta: {
    triggers: ['SyncState'],
    transition: { from: '*', to: '*' },
  },
  impl: (state, events) => {
    const syncEvent = findEvent(events, SyncStateEvent);
    if (!syncEvent) return [];

    const payload = syncEvent.payload;

    updateScalarProperties(state, payload);
    updateArrayProperties(state, payload);
    updateMapProperties(state, payload);

    return [];
  },
});
