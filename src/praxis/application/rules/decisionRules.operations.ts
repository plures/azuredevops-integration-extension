/**
 * Praxis Application Rules – Decision Ledger: Operations
 *
 * Records decision entries for work-item, branch, PR, connection,
 * and lifecycle mutating events.
 */

import { defineRule, findEvent } from '@plures/praxis';
import type { ApplicationEngineContext } from '../engine.js';
import { recordDecision } from '../../../decision-ledger/ledger.js';
import {
  CreateWorkItemEvent,
  CreateBranchEvent,
  CreatePullRequestEvent,
  BulkAssignEvent,
  ConnectionsLoadedEvent,
  ConnectionSelectedEvent,
  SelectConnectionEvent,
  ActivateEvent,
  DeactivateEvent,
} from '../facts.js';

// ---------------------------------------------------------------------------
// Work-item decisions
// ---------------------------------------------------------------------------

const recordCreateWorkItemDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.workItem.create',
  description: 'Record decision when a work item creation is requested',
  meta: { triggers: ['CREATE_WORK_ITEM'] },
  impl: (state, events) => {
    const ev = findEvent(events, CreateWorkItemEvent);
    if (!ev) return [];
    recordDecision(state.context, {
      category: 'work-item',
      operation: 'createWorkItem',
      outcome: 'allowed',
      rationale: 'User requested work item creation',
      connectionId: ev.payload.connectionId,
    });
    return [];
  },
});

const recordBulkAssignDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.workItem.bulkAssign',
  description: 'Record decision when bulk-assign is requested',
  meta: { triggers: ['BULK_ASSIGN'] },
  impl: (state, events) => {
    const ev = findEvent(events, BulkAssignEvent);
    if (!ev) return [];
    recordDecision(state.context, {
      category: 'work-item',
      operation: 'bulkAssign',
      outcome: 'allowed',
      rationale: 'User requested bulk assignment of work items',
      connectionId: ev.payload.connectionId,
      payload: { workItemIds: ev.payload.workItemIds },
    });
    return [];
  },
});

// ---------------------------------------------------------------------------
// Branch / PR decisions
// ---------------------------------------------------------------------------

const recordCreateBranchDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.branch.create',
  description: 'Record decision when a branch creation is requested',
  meta: { triggers: ['CREATE_BRANCH'] },
  impl: (state, events) => {
    const ev = findEvent(events, CreateBranchEvent);
    if (!ev) return [];
    recordDecision(state.context, {
      category: 'branch',
      operation: 'createBranch',
      outcome: 'allowed',
      rationale: 'User requested branch creation',
      connectionId: ev.payload.connectionId,
      payload: ev.payload.workItemId ? { workItemId: ev.payload.workItemId } : undefined,
    });
    return [];
  },
});

const recordCreatePullRequestDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.pullRequest.create',
  description: 'Record decision when a pull request creation is requested',
  meta: { triggers: ['CREATE_PULL_REQUEST'] },
  impl: (state, events) => {
    const ev = findEvent(events, CreatePullRequestEvent);
    if (!ev) return [];
    recordDecision(state.context, {
      category: 'pull-request',
      operation: 'createPullRequest',
      outcome: 'allowed',
      rationale: 'User requested pull request creation',
      connectionId: ev.payload.connectionId,
      payload: ev.payload.workItemId ? { workItemId: ev.payload.workItemId } : undefined,
    });
    return [];
  },
});

// ---------------------------------------------------------------------------
// Connection decisions
// ---------------------------------------------------------------------------

const recordConnectionLoadDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.connection.load',
  description: 'Record decision when connections are loaded',
  meta: { triggers: ['CONNECTIONS_LOADED'] },
  impl: (state, events) => {
    const ev = findEvent(events, ConnectionsLoadedEvent);
    if (!ev) return [];
    recordDecision(state.context, {
      category: 'connection',
      operation: 'connectionsLoaded',
      outcome: 'allowed',
      rationale: 'Connections loaded from configuration',
      payload: { count: ev.payload.connections.length },
    });
    return [];
  },
});

const recordConnectionSelectDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.connection.select',
  description: 'Record decision when a connection is selected',
  meta: { triggers: ['CONNECTION_SELECTED', 'SELECT_CONNECTION'] },
  impl: (state, events) => {
    const ev = findEvent(events, ConnectionSelectedEvent) ?? findEvent(events, SelectConnectionEvent);
    if (!ev) return [];
    recordDecision(state.context, {
      category: 'connection',
      operation: 'selectConnection',
      outcome: 'allowed',
      rationale: 'User selected a connection',
      connectionId: ev.payload.connectionId,
    });
    return [];
  },
});

// ---------------------------------------------------------------------------
// Lifecycle decisions
// ---------------------------------------------------------------------------

const recordActivateDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.lifecycle.activate',
  description: 'Record decision when application activates',
  meta: { triggers: ['ACTIVATE'] },
  impl: (state, events) => {
    const ev = findEvent(events, ActivateEvent);
    if (!ev) return [];
    recordDecision(state.context, {
      category: 'lifecycle',
      operation: 'activate',
      outcome: 'allowed',
      rationale: 'Application activation requested',
    });
    return [];
  },
});

const recordDeactivateDecision = defineRule<ApplicationEngineContext>({
  id: 'decision.lifecycle.deactivate',
  description: 'Record decision when application deactivates',
  meta: { triggers: ['DEACTIVATE'] },
  impl: (state, events) => {
    const ev = findEvent(events, DeactivateEvent);
    if (!ev) return [];
    recordDecision(state.context, {
      category: 'lifecycle',
      operation: 'deactivate',
      outcome: 'allowed',
      rationale: 'Application deactivation requested',
    });
    return [];
  },
});

export const operationsDecisionRules = [
  recordCreateWorkItemDecision,
  recordBulkAssignDecision,
  recordCreateBranchDecision,
  recordCreatePullRequestDecision,
  recordConnectionLoadDecision,
  recordConnectionSelectDecision,
  recordActivateDecision,
  recordDeactivateDecision,
];
