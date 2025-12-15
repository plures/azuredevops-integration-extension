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
  impl: (state, events) => {
    const syncEvent = findEvent(events, SyncStateEvent);
    if (!syncEvent) return [];

    // Replace context with synced state
    // We use Object.assign to update the reactive proxy in place if possible,
    // or just replace the properties.
    // Since state.context is mutable in the rule, we can just assign properties.

    // Note: We must be careful not to break internal engine state if it exists in context.
    // ApplicationEngineContext is purely data, so it should be safe.

    Object.assign(state.context, syncEvent.payload);

    return [];
  },
});
