/**
 * Praxis Application Rules - Sync
 *
 * Rules for synchronizing state from backend to frontend.
 */

import { defineRule, findEvent } from '@plures/praxis';
import type { ApplicationEngineContext } from '../engine.js';
import { SyncStateEvent } from '../facts.js';

function updatePrimitiveFields(context: any, payload: any): void {
  if (payload.isActivated !== undefined) {
    context.isActivated = payload.isActivated;
  }
  if (payload.isDeactivating !== undefined) {
    context.isDeactivating = payload.isDeactivating;
  }
  if (payload.activeConnectionId !== undefined) {
    context.activeConnectionId = payload.activeConnectionId;
  }
  if (payload.activeQuery !== undefined) {
    context.activeQuery = payload.activeQuery;
  }
  if (payload.viewMode !== undefined) {
    context.viewMode = payload.viewMode;
  }
  if (payload.pendingWorkItems !== undefined) {
    context.pendingWorkItems = payload.pendingWorkItems;
  }
  if (payload.deviceCodeSession !== undefined) {
    context.deviceCodeSession = payload.deviceCodeSession;
  }
  if (payload.authCodeFlowSession !== undefined) {
    context.authCodeFlowSession = payload.authCodeFlowSession;
  }
  if (payload.lastError !== undefined) {
    context.lastError = payload.lastError;
  }
  if (payload.errorRecoveryAttempts !== undefined) {
    context.errorRecoveryAttempts = payload.errorRecoveryAttempts;
  }
  if (payload.workItemsError !== undefined) {
    context.workItemsError = payload.workItemsError;
  }
  if (payload.workItemsErrorConnectionId !== undefined) {
    context.workItemsErrorConnectionId = payload.workItemsErrorConnectionId;
  }
  if (payload.debugLoggingEnabled !== undefined) {
    context.debugLoggingEnabled = payload.debugLoggingEnabled;
  }
  if (payload.debugViewVisible !== undefined) {
    context.debugViewVisible = payload.debugViewVisible;
  }
  if (payload.kanbanColumns !== undefined) {
    context.kanbanColumns = Array.isArray(payload.kanbanColumns)
      ? [...payload.kanbanColumns]
      : payload.kanbanColumns;
  }
}

function updateMapField(context: any, fieldName: string, payloadValue: any): void {
  if (payloadValue !== undefined) {
    if (payloadValue instanceof Map) {
      context[fieldName] = new Map(payloadValue);
    } else if (typeof payloadValue === 'object' && payloadValue !== null) {
      context[fieldName] = new Map(Object.entries(payloadValue));
    }
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

    if (Array.isArray(payload.connections)) {
      state.context.connections = [...payload.connections];
    }

    updatePrimitiveFields(state.context, payload);

    updateMapField(state.context, 'connectionStates', payload.connectionStates);
    updateMapField(state.context, 'connectionWorkItems', payload.connectionWorkItems);
    updateMapField(state.context, 'connectionQueries', payload.connectionQueries);
    updateMapField(state.context, 'connectionFilters', payload.connectionFilters);
    updateMapField(state.context, 'connectionViewModes', payload.connectionViewModes);
    updateMapField(state.context, 'pendingAuthReminders', payload.pendingAuthReminders);
    updateMapField(state.context, 'branchContexts', payload.branchContexts);
    updateMapField(state.context, 'connectionBranches', payload.connectionBranches);
    updateMapField(state.context, 'connectionSearchTerms', payload.connectionSearchTerms);

    return [];
  },
});
