/**
 * Praxis Application Rules - Sync
 *
 * Rules for synchronizing state from backend to frontend.
 */

import { defineRule, findEvent } from '@plures/praxis';
import type { ApplicationEngineContext } from '../engine.js';
import { SyncStateEvent } from '../facts.js';

/**
 * Update context field if payload value is defined
 */
function updateField<T>(context: any, key: string, value: T | undefined): void {
  if (value !== undefined) {
    context[key] = value;
  }
}

/**
 * Update Map field with immutable copy
 */
function updateMapField(context: any, key: string, value: any): void {
  if (value === undefined) return;

  if (value instanceof Map) {
    context[key] = new Map(value);
  } else if (typeof value === 'object' && value !== null) {
    context[key] = new Map(Object.entries(value));
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
    transition: { from: '*', to: '*' }, // Allow sync in any state
  },
  impl: (state, events) => {
    const syncEvent = findEvent(events, SyncStateEvent);
    if (!syncEvent) return [];

    const payload = syncEvent.payload;
    const ctx = state.context;

    // Update connections array explicitly (create new array for reactivity)
    if (Array.isArray(payload.connections)) {
      ctx.connections = [...payload.connections];
    }

    // Update simple context properties
    updateField(ctx, 'isActivated', payload.isActivated);
    updateField(ctx, 'isDeactivating', payload.isDeactivating);
    updateField(ctx, 'activeConnectionId', payload.activeConnectionId);
    updateField(ctx, 'activeQuery', payload.activeQuery);
    updateField(ctx, 'viewMode', payload.viewMode);
    updateField(ctx, 'pendingWorkItems', payload.pendingWorkItems);
    updateField(ctx, 'deviceCodeSession', payload.deviceCodeSession);
    updateField(ctx, 'authCodeFlowSession', payload.authCodeFlowSession);
    updateField(ctx, 'lastError', payload.lastError);
    updateField(ctx, 'errorRecoveryAttempts', payload.errorRecoveryAttempts);
    updateField(ctx, 'workItemsError', payload.workItemsError);
    updateField(ctx, 'workItemsErrorConnectionId', payload.workItemsErrorConnectionId);
    updateField(ctx, 'debugLoggingEnabled', payload.debugLoggingEnabled);
    updateField(ctx, 'debugViewVisible', payload.debugViewVisible);

    // Update array with immutability
    if (payload.kanbanColumns !== undefined) {
      ctx.kanbanColumns = Array.isArray(payload.kanbanColumns)
        ? [...payload.kanbanColumns]
        : payload.kanbanColumns;
    }

    // Update Map fields with immutable copies
    updateMapField(ctx, 'connectionStates', payload.connectionStates);
    updateMapField(ctx, 'connectionWorkItems', payload.connectionWorkItems);
    updateMapField(ctx, 'connectionQueries', payload.connectionQueries);
    updateMapField(ctx, 'connectionFilters', payload.connectionFilters);
    updateMapField(ctx, 'connectionViewModes', payload.connectionViewModes);
    updateMapField(ctx, 'pendingAuthReminders', payload.pendingAuthReminders);

    return [];
  },
});
