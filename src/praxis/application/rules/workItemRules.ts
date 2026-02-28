/**
 * Praxis Application Rules - Work Items
 *
 * Rules for work item management state transitions.
 */

import { defineRule, findEvent } from '@plures/praxis';
import { getClock, type ApplicationEngineContext } from '../engine.js';
import { WorkItemsLoadedEvent, WorkItemsErrorEvent, CreateWorkItemEvent } from '../facts.js';
import type { WorkItem } from '../types.js';

/**
 * Handle work items loaded
 */
const workItemsLoadedRule = defineRule<ApplicationEngineContext>({
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
      timestamp: getClock(state).now(),
    };

    // Priority 3: Make Map updates immutable (create new Map instance)
    // Priority 4: Idempotency - only update if changed
    const existingWorkItems = state.context.connectionWorkItems.get(connectionId);
    if (existingWorkItems !== workItems) {
      state.context.connectionWorkItems = new Map(state.context.connectionWorkItems);
      state.context.connectionWorkItems.set(connectionId, workItems);
    }

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
const workItemsErrorRule = defineRule<ApplicationEngineContext>({
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

/**
 * Handle create work item (optimistic local update)
 * Adds the new work item to the connection's local list immediately.
 */
const createWorkItemRule = defineRule<ApplicationEngineContext>({
  id: 'application.createWorkItem',
  description: 'Optimistically add a new work item to the local state',
  meta: {
    triggers: ['CREATE_WORK_ITEM'],
  },
  impl: (state, events) => {
    const event = findEvent(events, CreateWorkItemEvent);
    if (!event) return [];

    const { connectionId, workItemType, title } = event.payload;
    const existing = state.context.connectionWorkItems.get(connectionId) ?? [];
    const maxId = existing.length > 0 ? Math.max(...existing.map((wi) => wi.id)) : 0;
    const newWorkItem: WorkItem = {
      id: maxId + 1,
      fields: { Title: title ?? 'New Work Item', 'Work Item Type': workItemType ?? 'Task' },
      url: '',
    };

    state.context.connectionWorkItems = new Map(state.context.connectionWorkItems);
    state.context.connectionWorkItems.set(connectionId, [...existing, newWorkItem]);

    return [];
  },
});

export const workItemRules = [workItemsLoadedRule, workItemsErrorRule, createWorkItemRule];
