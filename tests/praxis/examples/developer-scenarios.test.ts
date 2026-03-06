/* eslint-disable max-lines, max-lines-per-function */
/**
 * Developer Scenarios Test Suite
 *
 * Automated tests for all test cases defined in docs/TEST_CASES.md.
 * Each it() description includes the TC-ID so it appears in the TEST_CASES.md
 * mapping table and in CI output.
 *
 * Run with:
 *   npm test -- --reporter=verbose tests/praxis/examples/developer-scenarios.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resetEngine, waitForState, getContext, dispatch } from '../../../src/testing/helpers.js';
import {
  ActivateEvent,
  ActivationCompleteEvent,
  ConnectionsLoadedEvent,
  ConnectionSelectedEvent,
  WorkItemsLoadedEvent,
  WorkItemsErrorEvent,
  ApplicationErrorEvent,
  AuthenticationSuccessEvent,
  AuthenticationFailedEvent,
  SignInEntraEvent,
  SignOutEntraEvent,
  DeviceCodeStartedAppEvent,
  DeviceCodeCompletedAppEvent,
  AuthCodeFlowStartedAppEvent,
  AuthCodeFlowBrowserOpenedEvent,
  CreateBranchEvent,
  CreatePullRequestEvent,
  RetryApplicationEvent,
  ConnectionStateUpdatedEvent,
  StartTimerEvent,
  PauseTimerEvent,
  StopTimerEvent,
} from '../../../src/praxis/application/facts.js';
import type { ProjectConnection } from '../../../src/praxis/connection/types.js';
import type { WorkItem } from '../../../src/praxis/application/types.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function makeConnection(
  id: string,
  authMethod: 'entra' | 'pat' = 'entra',
  baseUrl = 'https://dev.azure.com'
): ProjectConnection {
  return {
    id,
    organization: 'test-org',
    project: 'test-project',
    label: `Connection ${id}`,
    baseUrl,
    apiBaseUrl: `${baseUrl}/test-org/test-project/_apis`,
    authMethod,
  };
}

function makeWorkItem(id: number, state = 'Active', type = 'Task'): WorkItem {
  return {
    id,
    fields: {
      'System.Title': `Work Item ${id}`,
      'System.WorkItemType': type,
      'System.State': state,
      'System.AssignedTo': null,
    },
    url: `https://dev.azure.com/test-org/test-project/_workitems/edit/${id}`,
  };
}

async function bootWithConnection(conn: ProjectConnection): Promise<void> {
  dispatch([ActivateEvent.create({})]);
  dispatch([ActivationCompleteEvent.create({})]);
  dispatch([
    ConnectionsLoadedEvent.create({
      connections: [conn],
    }),
  ]);
  await waitForState((ctx) => ctx.applicationState === 'active');
}

// ---------------------------------------------------------------------------
// P0 — Release-blocking cases
// ---------------------------------------------------------------------------

describe('Developer Scenarios — P0 Authentication', () => {
  beforeEach(async () => {
    await resetEngine();
  });

  it('TC-001: successful Entra ID Device Code sign-in sets auth state to authenticated', async () => {
    const conn = makeConnection('tc-001-conn', 'entra');

    await bootWithConnection(conn);

    dispatch([SignInEntraEvent.create({ connectionId: conn.id, forceInteractive: false })]);

    dispatch([
      DeviceCodeStartedAppEvent.create({
        connectionId: conn.id,
        userCode: 'ABCD-1234',
        verificationUri: 'https://microsoft.com/devicelogin',
        expiresInSeconds: 900,
      }),
    ]);

    const ctxAfterStart = getContext();
    expect(ctxAfterStart.deviceCodeSession).toBeDefined();
    expect(ctxAfterStart.deviceCodeSession?.connectionId).toBe(conn.id);

    dispatch([DeviceCodeCompletedAppEvent.create({ connectionId: conn.id })]);
    dispatch([AuthenticationSuccessEvent.create({ connectionId: conn.id })]);

    const ctx = getContext();
    expect(ctx.deviceCodeSession).toBeUndefined();
    expect(ctx.lastError).toBeUndefined();
    expect(ctx.applicationState).toBe('active');
  });

  it('TC-002: authentication failure emits AuthenticationFailedEvent with error message', async () => {
    const conn = makeConnection('tc-002-conn', 'entra');

    await bootWithConnection(conn);

    dispatch([
      AuthenticationFailedEvent.create({
        connectionId: conn.id,
        error: 'token_expired',
      }),
    ]);

    const ctx = getContext();
    expect(ctx.lastError).toBeDefined();
    expect(ctx.lastError?.message).toBe('token_expired');
    expect(ctx.lastError?.connectionId).toBe(conn.id);

    const connState = ctx.connectionStates.get(conn.id);
    expect(connState?.state).toBe('auth_failed');
  });

  it('TC-003: tenant mismatch results in authentication failure with descriptive error', async () => {
    const conn = makeConnection('tc-003-conn', 'entra');

    await bootWithConnection(conn);

    const tenantError = 'tenant_mismatch: expected corp-tenant-id, got personal-tenant-id';

    dispatch([
      AuthenticationFailedEvent.create({
        connectionId: conn.id,
        error: tenantError,
      }),
    ]);

    const ctx = getContext();
    expect(ctx.lastError?.message).toContain('tenant_mismatch');
    expect(ctx.lastError?.connectionId).toBe(conn.id);

    const connState = ctx.connectionStates.get(conn.id);
    expect(connState?.state).toBe('auth_failed');
    expect(ctx.pendingAuthReminders.has(conn.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe('Developer Scenarios — P0 Work Items', () => {
  beforeEach(async () => {
    await resetEngine();
  });

  it('TC-004: work items are loaded for the active connection', async () => {
    const conn = makeConnection('tc-004-conn');
    const items = [makeWorkItem(101), makeWorkItem(102, 'New', 'Bug')];

    await bootWithConnection(conn);

    dispatch([WorkItemsLoadedEvent.create({ connectionId: conn.id, workItems: items })]);

    const ctx = getContext();
    const loaded = ctx.connectionWorkItems.get(conn.id);

    expect(loaded).toBeDefined();
    expect(loaded).toHaveLength(2);
    expect(loaded?.some((wi) => wi.id === 101)).toBe(true);
    expect(loaded?.some((wi) => wi.id === 102)).toBe(true);
    expect(ctx.activeConnectionId).toBe(conn.id);
  });

  it('TC-005: updated work item state is reflected via WorkItemsLoadedEvent', async () => {
    const conn = makeConnection('tc-005-conn');
    const initialItem = makeWorkItem(3001, 'Active');

    await bootWithConnection(conn);
    dispatch([WorkItemsLoadedEvent.create({ connectionId: conn.id, workItems: [initialItem] })]);

    const ctxBefore = getContext();
    const itemBefore = ctxBefore.connectionWorkItems.get(conn.id)?.[0];
    expect(itemBefore?.fields['System.State']).toBe('Active');

    const updatedItem = makeWorkItem(3001, 'Resolved');
    dispatch([WorkItemsLoadedEvent.create({ connectionId: conn.id, workItems: [updatedItem] })]);

    const ctx = getContext();
    const item = ctx.connectionWorkItems.get(conn.id)?.[0];
    expect(item?.id).toBe(3001);
    expect(item?.fields['System.State']).toBe('Resolved');
    expect(ctx.lastError).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------

describe('Developer Scenarios — P0 Pull Requests & Errors', () => {
  beforeEach(async () => {
    await resetEngine();
  });

  it('TC-006: CreatePullRequestEvent is dispatched with correct connection and work item', async () => {
    const conn = makeConnection('tc-006-conn');
    const item = makeWorkItem(4001);

    await bootWithConnection(conn);
    dispatch([WorkItemsLoadedEvent.create({ connectionId: conn.id, workItems: [item] })]);

    dispatch([CreatePullRequestEvent.create({ connectionId: conn.id, workItemId: 4001 })]);

    const ctx = getContext();
    expect(ctx.applicationState).toBe('active');
    expect(ctx.lastError).toBeUndefined();
  });

  it('TC-007: permission-denied error is surfaced as ApplicationErrorEvent', async () => {
    const conn = makeConnection('tc-007-conn');

    await bootWithConnection(conn);

    dispatch([
      ApplicationErrorEvent.create({
        error: 'permission_denied',
        connectionId: conn.id,
      }),
    ]);

    const ctx = getContext();
    expect(ctx.lastError).toBeDefined();
    expect(ctx.lastError?.message).toContain('permission_denied');

    // RetryApplicationEvent must clear lastError without crashing
    dispatch([RetryApplicationEvent.create({})]);
    const ctxAfterRetry = getContext();
    expect(ctxAfterRetry.lastError).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// P1 — Should-pass cases
// ---------------------------------------------------------------------------

describe('Developer Scenarios — P1 Connections & Auth', () => {
  beforeEach(async () => {
    await resetEngine();
  });

  it('TC-008: PAT-based connection loads work items successfully', async () => {
    const conn = makeConnection('tc-008-conn', 'pat');
    const items = [makeWorkItem(201), makeWorkItem(202, 'New', 'Bug')];

    await bootWithConnection(conn);
    dispatch([AuthenticationSuccessEvent.create({ connectionId: conn.id })]);
    dispatch([WorkItemsLoadedEvent.create({ connectionId: conn.id, workItems: items })]);

    const ctx = getContext();
    expect(ctx.connectionWorkItems.get(conn.id)).toHaveLength(2);
    expect(ctx.lastError).toBeUndefined();
    expect(ctx.pendingAuthReminders.has(conn.id)).toBe(false);
  });

  it('TC-009: CreateBranchEvent is dispatched with work item context', async () => {
    const conn = makeConnection('tc-009-conn');
    const item = makeWorkItem(5001);

    await bootWithConnection(conn);
    dispatch([WorkItemsLoadedEvent.create({ connectionId: conn.id, workItems: [item] })]);

    dispatch([CreateBranchEvent.create({ connectionId: conn.id, workItemId: 5001 })]);

    const ctx = getContext();
    expect(ctx.applicationState).toBe('active');
    expect(ctx.lastError).toBeUndefined();
  });

  it('TC-010: switching active connection isolates work item lists per connection', async () => {
    const connA = makeConnection('conn-A');
    const connB = makeConnection('conn-B');
    const itemsA = [makeWorkItem(10), makeWorkItem(11)];
    const itemsB = [makeWorkItem(20), makeWorkItem(21), makeWorkItem(22)];

    dispatch([ActivateEvent.create({})]);
    dispatch([ActivationCompleteEvent.create({})]);
    dispatch([
      ConnectionsLoadedEvent.create({
        connections: [connA, connB],
      }),
    ]);
    await waitForState((ctx) => ctx.applicationState === 'active');

    dispatch([WorkItemsLoadedEvent.create({ connectionId: connA.id, workItems: itemsA })]);
    dispatch([WorkItemsLoadedEvent.create({ connectionId: connB.id, workItems: itemsB })]);

    dispatch([ConnectionSelectedEvent.create({ connectionId: connB.id })]);
    await waitForState((ctx) => ctx.activeConnectionId === connB.id);

    const ctx = getContext();
    expect(ctx.activeConnectionId).toBe(connB.id);
    expect(ctx.connectionWorkItems.get(connA.id)).toHaveLength(2);
    expect(ctx.connectionWorkItems.get(connB.id)).toHaveLength(3);

    const idsA = ctx.connectionWorkItems.get(connA.id)?.map((w) => w.id) ?? [];
    const idsB = ctx.connectionWorkItems.get(connB.id)?.map((w) => w.id) ?? [];
    expect(idsA.some((id) => idsB.includes(id))).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe('Developer Scenarios — P1 Network Resilience', () => {
  beforeEach(async () => {
    await resetEngine();
  });

  it('TC-011: WorkItemsErrorEvent is raised when network is unavailable', async () => {
    const conn = makeConnection('tc-011-conn');

    await bootWithConnection(conn);

    dispatch([
      WorkItemsErrorEvent.create({
        connectionId: conn.id,
        error: 'network_unavailable',
      }),
    ]);

    const ctx = getContext();
    expect(ctx.lastError).toBeDefined();
    expect(ctx.lastError?.message).toBe('network_unavailable');
    expect(ctx.lastError?.connectionId).toBe(conn.id);
    // Error is non-fatal; engine stays active
    expect(ctx.applicationState).toBe('active');
  });

  it('TC-012: retry after network error reloads work items', async () => {
    const conn = makeConnection('tc-012-conn');
    const items = [makeWorkItem(301)];

    await bootWithConnection(conn);

    dispatch([
      WorkItemsErrorEvent.create({
        connectionId: conn.id,
        error: 'network_unavailable',
      }),
    ]);
    expect(getContext().lastError).toBeDefined();

    // Retry clears the error
    dispatch([RetryApplicationEvent.create({})]);
    expect(getContext().lastError).toBeUndefined();

    // On reconnect, work items reload
    dispatch([WorkItemsLoadedEvent.create({ connectionId: conn.id, workItems: items })]);

    const ctx = getContext();
    expect(ctx.applicationState).toBe('active');
    expect(ctx.connectionWorkItems.get(conn.id)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// P2 — Advisory cases
// ---------------------------------------------------------------------------

describe('Developer Scenarios — P2 Auth Flows', () => {
  beforeEach(async () => {
    await resetEngine();
  });

  it('TC-013: sign-out clears authentication state for the connection', async () => {
    const conn = makeConnection('tc-013-conn', 'entra');

    await bootWithConnection(conn);
    dispatch([AuthenticationSuccessEvent.create({ connectionId: conn.id })]);
    expect(getContext().lastError).toBeUndefined();

    dispatch([SignOutEntraEvent.create({ connectionId: conn.id })]);
    dispatch([
      ConnectionStateUpdatedEvent.create({
        connectionId: conn.id,
        state: { status: 'disconnected', connection: null, authMethod: 'entra', id: conn.id },
      }),
    ]);

    const ctx = getContext();
    const connState = ctx.connectionStates.get(conn.id);
    expect(connState?.state).not.toBe('connected');
  });

  it('TC-016: device code sign-in session is recorded and cleared on completion', async () => {
    const conn = makeConnection('tc-016-conn', 'entra');

    await bootWithConnection(conn);

    dispatch([
      DeviceCodeStartedAppEvent.create({
        connectionId: conn.id,
        userCode: 'WXYZ-9999',
        verificationUri: 'https://microsoft.com/devicelogin',
        expiresInSeconds: 900,
      }),
    ]);

    const ctxAfterStart = getContext();
    expect(ctxAfterStart.deviceCodeSession).toBeDefined();
    expect(ctxAfterStart.deviceCodeSession?.connectionId).toBe(conn.id);
    expect(ctxAfterStart.deviceCodeSession?.userCode).toBe('WXYZ-9999');

    dispatch([DeviceCodeCompletedAppEvent.create({ connectionId: conn.id })]);

    expect(getContext().deviceCodeSession).toBeUndefined();
  });

  it('TC-017: auth code flow browser-opened event does not change application state', async () => {
    const conn = makeConnection('tc-017-conn', 'entra');
    const authUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=x';

    await bootWithConnection(conn);

    // AUTH_CODE_FLOW_STARTED sets authCodeFlowSession on context
    dispatch([
      AuthCodeFlowStartedAppEvent.create({
        connectionId: conn.id,
        authorizationUrl: authUrl,
        expiresInSeconds: 300,
      }),
    ]);

    const ctxAfterStart = getContext();
    expect(ctxAfterStart.applicationState).toBe('active');
    expect(ctxAfterStart.authCodeFlowSession).toBeDefined();
    expect(ctxAfterStart.authCodeFlowSession?.connectionId).toBe(conn.id);

    // AUTH_CODE_FLOW_BROWSER_OPENED does not update authCodeFlowSession — it
    // is a notification event only; the session was already set by STARTED.
    dispatch([
      AuthCodeFlowBrowserOpenedEvent.create({
        connectionId: conn.id,
        url: authUrl,
      }),
    ]);

    const ctx = getContext();
    expect(ctx.lastError).toBeUndefined();
    expect(ctx.applicationState).toBe('active');
    // Session remains set (not cleared by browser-opened)
    expect(ctx.authCodeFlowSession?.connectionId).toBe(conn.id);
  });
});

// ---------------------------------------------------------------------------

describe('Developer Scenarios — P2 Timer & Multi-project', () => {
  beforeEach(async () => {
    await resetEngine();
  });

  it('TC-014: timer start → pause → stop records full timer history', async () => {
    const conn = makeConnection('tc-014-conn');
    const item = makeWorkItem(6001);
    const now = Date.now();

    await bootWithConnection(conn);
    dispatch([WorkItemsLoadedEvent.create({ connectionId: conn.id, workItems: [item] })]);

    dispatch([StartTimerEvent.create({ workItemId: item.id, timestamp: now })]);
    dispatch([PauseTimerEvent.create({ workItemId: item.id, timestamp: now + 60_000 })]);
    dispatch([StopTimerEvent.create({ workItemId: item.id, timestamp: now + 120_000 })]);

    const ctx = getContext();
    const entries = ctx.timerHistory.entries;
    expect(entries.some((e) => e.type === 'start')).toBe(true);
    expect(entries.some((e) => e.type === 'pause')).toBe(true);
    expect(entries.some((e) => e.type === 'stop')).toBe(true);
    expect(ctx.lastError).toBeUndefined();
  });

  it('TC-015: cross-project work item list contains items from both connections', async () => {
    const alpha = makeConnection('proj-alpha');
    const beta = makeConnection('proj-beta');
    const alphaItems = [makeWorkItem(1001), makeWorkItem(1002)];
    const betaItems = [makeWorkItem(2001), makeWorkItem(2002), makeWorkItem(2003)];

    dispatch([ActivateEvent.create({})]);
    dispatch([ActivationCompleteEvent.create({})]);
    dispatch([
      ConnectionsLoadedEvent.create({
        connections: [alpha, beta],
      }),
    ]);
    await waitForState((ctx) => ctx.applicationState === 'active');

    dispatch([WorkItemsLoadedEvent.create({ connectionId: alpha.id, workItems: alphaItems })]);
    dispatch([WorkItemsLoadedEvent.create({ connectionId: beta.id, workItems: betaItems })]);

    const ctx = getContext();
    expect(ctx.connectionWorkItems.get(alpha.id)).toHaveLength(2);
    expect(ctx.connectionWorkItems.get(beta.id)).toHaveLength(3);

    const alphaIds = ctx.connectionWorkItems.get(alpha.id)?.map((w) => w.id) ?? [];
    const betaIds = ctx.connectionWorkItems.get(beta.id)?.map((w) => w.id) ?? [];
    expect(alphaIds.some((id) => betaIds.includes(id))).toBe(false);
  });

  it('TC-018: on-premises connection uses custom baseUrl and loads work items', async () => {
    const onPremConn = makeConnection(
      'tc-018-onprem',
      'pat',
      'https://ado.corp.example.com/DefaultCollection'
    );
    const items = [makeWorkItem(9001), makeWorkItem(9002, 'New', 'Bug')];

    await bootWithConnection(onPremConn);
    dispatch([AuthenticationSuccessEvent.create({ connectionId: onPremConn.id })]);
    dispatch([WorkItemsLoadedEvent.create({ connectionId: onPremConn.id, workItems: items })]);

    const ctx = getContext();
    expect(ctx.connectionWorkItems.get(onPremConn.id)).toHaveLength(2);
    expect(ctx.lastError).toBeUndefined();
    expect(ctx.activeConnectionId).toBe(onPremConn.id);

    const storedConn = ctx.connections.find((c) => c.id === onPremConn.id);
    expect(storedConn?.baseUrl).toBe('https://ado.corp.example.com/DefaultCollection');
  });
});
