/**
 * Praxis Application Rules - Sync
 *
 * Rules for synchronizing state from backend to frontend.
 */

import { defineRule, findEvent } from '@plures/praxis';
import type { ApplicationEngineContext } from '../engine.js';
import { SyncStateEvent } from '../facts.js';

function updateSimpleFields(state: any, payload: any): void {
  const simpleFields = [
    'isActivated',
    'isDeactivating',
    'activeConnectionId',
    'activeQuery',
    'viewMode',
    'pendingWorkItems',
    'deviceCodeSession',
    'authCodeFlowSession',
    'lastError',
    'errorRecoveryAttempts',
    'workItemsError',
    'workItemsErrorConnectionId',
    'debugLoggingEnabled',
    'debugViewVisible',
  ];
  simpleFields.forEach((field) => {
    if (payload[field] !== undefined) {
      state.context[field] = payload[field];
    }
  });
}

function updateMapField(state: any, payload: any, fieldName: string): void {
  if (payload[fieldName] === undefined) return;
  if (payload[fieldName] instanceof Map) {
    state.context[fieldName] = new Map(payload[fieldName]);
  } else if (typeof payload[fieldName] === 'object' && payload[fieldName] !== null) {
    state.context[fieldName] = new Map(Object.entries(payload[fieldName]));
  }
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

    // Update connections array
    if (Array.isArray(payload.connections)) {
      state.context.connections = [...payload.connections];
    }

    // Update simple fields
    updateSimpleFields(state, payload);

    // Update kanbanColumns with copy
    if (payload.kanbanColumns !== undefined) {
      state.context.kanbanColumns = Array.isArray(payload.kanbanColumns)
        ? [...payload.kanbanColumns]
        : payload.kanbanColumns;
    }

    // Update Map fields
    const mapFields = [
      'connectionStates',
      'connectionWorkItems',
      'connectionQueries',
      'connectionFilters',
      'connectionViewModes',
      'pendingAuthReminders',
    ];
    mapFields.forEach((field) => updateMapField(state, payload, field));

    return [];
  },
});
