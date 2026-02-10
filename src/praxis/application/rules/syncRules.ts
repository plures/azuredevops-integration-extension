/**
 * Praxis Application Rules - Sync
 *
 * Rules for synchronizing state from backend to frontend.
 */

import { defineRule, findEvent } from '@plures/praxis';
import type { ApplicationEngineContext } from '../engine.js';
import { SyncStateEvent } from '../facts.js';

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
  // eslint-disable-next-line max-lines-per-function
  impl: (state, events) => {
    const syncEvent = findEvent(events, SyncStateEvent);
    if (!syncEvent) return [];

    const payload = syncEvent.payload;
    
    // Priority 1: Removed side effects (postMessage, console.debug)
    // Automatic logging via Praxis event system will capture this
    
    // Priority 2: Explicit field updates instead of Object.assign
    // Update connections array explicitly (create new array for reactivity)
    if (Array.isArray(payload.connections)) {
      state.context.connections = [...payload.connections];
    } else if (payload.connections === undefined || payload.connections === null) {
      // If connections is missing, keep existing connections (don't clear them)
      // This prevents connections from being lost during sync
      // No logging needed - automatic logging will capture state changes
    }
    
    // Update other context properties explicitly
    if (payload.isActivated !== undefined) {
      state.context.isActivated = payload.isActivated;
    }
    if (payload.isDeactivating !== undefined) {
      state.context.isDeactivating = payload.isDeactivating;
    }
    if (payload.activeConnectionId !== undefined) {
      state.context.activeConnectionId = payload.activeConnectionId;
    }
    if (payload.activeQuery !== undefined) {
      state.context.activeQuery = payload.activeQuery;
    }
    if (payload.viewMode !== undefined) {
      state.context.viewMode = payload.viewMode;
    }
    if (payload.pendingWorkItems !== undefined) {
      state.context.pendingWorkItems = payload.pendingWorkItems;
    }
    if (payload.deviceCodeSession !== undefined) {
      state.context.deviceCodeSession = payload.deviceCodeSession;
    }
    if (payload.authCodeFlowSession !== undefined) {
      state.context.authCodeFlowSession = payload.authCodeFlowSession;
    }
    if (payload.lastError !== undefined) {
      state.context.lastError = payload.lastError;
    }
    if (payload.errorRecoveryAttempts !== undefined) {
      state.context.errorRecoveryAttempts = payload.errorRecoveryAttempts;
    }
    if (payload.workItemsError !== undefined) {
      state.context.workItemsError = payload.workItemsError;
    }
    if (payload.workItemsErrorConnectionId !== undefined) {
      state.context.workItemsErrorConnectionId = payload.workItemsErrorConnectionId;
    }
    if (payload.debugLoggingEnabled !== undefined) {
      state.context.debugLoggingEnabled = payload.debugLoggingEnabled;
    }
    if (payload.debugViewVisible !== undefined) {
      state.context.debugViewVisible = payload.debugViewVisible;
    }
    if (payload.kanbanColumns !== undefined) {
      state.context.kanbanColumns = Array.isArray(payload.kanbanColumns) ? [...payload.kanbanColumns] : payload.kanbanColumns;
    }
    
    // Priority 3: Make Map updates immutable (create new Map instances)
    if (payload.connectionStates !== undefined) {
      if (payload.connectionStates instanceof Map) {
        state.context.connectionStates = new Map(payload.connectionStates);
      } else if (typeof payload.connectionStates === 'object' && payload.connectionStates !== null) {
        state.context.connectionStates = new Map(Object.entries(payload.connectionStates));
      }
    }
    if (payload.connectionWorkItems !== undefined) {
      if (payload.connectionWorkItems instanceof Map) {
        state.context.connectionWorkItems = new Map(payload.connectionWorkItems);
      } else if (typeof payload.connectionWorkItems === 'object' && payload.connectionWorkItems !== null) {
        state.context.connectionWorkItems = new Map(Object.entries(payload.connectionWorkItems));
      }
    }
    if (payload.connectionQueries !== undefined) {
      if (payload.connectionQueries instanceof Map) {
        state.context.connectionQueries = new Map(payload.connectionQueries);
      } else if (typeof payload.connectionQueries === 'object' && payload.connectionQueries !== null) {
        state.context.connectionQueries = new Map(Object.entries(payload.connectionQueries));
      }
    }
    if (payload.connectionFilters !== undefined) {
      if (payload.connectionFilters instanceof Map) {
        state.context.connectionFilters = new Map(payload.connectionFilters);
      } else if (typeof payload.connectionFilters === 'object' && payload.connectionFilters !== null) {
        state.context.connectionFilters = new Map(Object.entries(payload.connectionFilters));
      }
    }
    if (payload.connectionViewModes !== undefined) {
      if (payload.connectionViewModes instanceof Map) {
        state.context.connectionViewModes = new Map(payload.connectionViewModes);
      } else if (typeof payload.connectionViewModes === 'object' && payload.connectionViewModes !== null) {
        state.context.connectionViewModes = new Map(Object.entries(payload.connectionViewModes));
      }
    }
    if (payload.pendingAuthReminders !== undefined) {
      if (payload.pendingAuthReminders instanceof Map) {
        state.context.pendingAuthReminders = new Map(payload.pendingAuthReminders);
      } else if (typeof payload.pendingAuthReminders === 'object' && payload.pendingAuthReminders !== null) {
        state.context.pendingAuthReminders = new Map(Object.entries(payload.pendingAuthReminders));
      }
    }

    return [];
  },
});
