/**
 * Praxis Application Rules - Work Items
 *
 * Rules for work item management state transitions.
 */

import { defineRule, findEvent } from '@plures/praxis';
import type { ApplicationEngineContext } from '../engine.js';
import { WorkItemsLoadedEvent, WorkItemsErrorEvent } from '../facts.js';

/**
 * Handle work items loaded
 */
export const workItemsLoadedRule = defineRule<ApplicationEngineContext>({
  id: 'application.workItemsLoaded',
  description: 'Handle work items loaded',
  meta: {
    triggers: ['WORK_ITEMS_LOADED'],
  },
  impl: (state, events) => {
    const loadedEvent = findEvent(events, WorkItemsLoadedEvent);
    if (!loadedEvent) return [];

    const { workItems, connectionId, query } = loadedEvent.payload;

    // Store pending work items
    state.context.pendingWorkItems = {
      workItems,
      connectionId,
      query,
      timestamp: Date.now(),
    };

    // Store per connection
    state.context.connectionWorkItems.set(connectionId, workItems);

    // Clear any error for this connection
    if (state.context.lastError?.connectionId === connectionId) {
      state.context.lastError = undefined;
    }

    return [];
  },
});

/**
 * Handle work items error
 */
export const workItemsErrorRule = defineRule<ApplicationEngineContext>({
  id: 'application.workItemsError',
  description: 'Handle work items error',
  meta: {
    triggers: ['WORK_ITEMS_ERROR'],
  },
  impl: (state, events) => {
    const errorEvent = findEvent(events, WorkItemsErrorEvent);
    if (!errorEvent) return [];

    const { error, connectionId } = errorEvent.payload;

    state.context.lastError = {
      message: error,
      connectionId,
    };

    return [];
  },
});

export const workItemRules = [workItemsLoadedRule, workItemsErrorRule];
