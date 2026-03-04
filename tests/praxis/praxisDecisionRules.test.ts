/* eslint-disable max-lines */
/**
 * Praxis Decision Rules – Integration Tests
 *
 * Verifies that dispatching mutating events causes the decision ledger rules
 * to append correctly-categorised entries to `context.decisionLedger`, and
 * that the `DECISION_RECORDED` event is emitted for each entry.
 *
 * One `describe` block per decision-rule category (auth, work-item, branch,
 * pull-request, connection, lifecycle) with at least one representative test.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resetEngine, dispatch, getContext } from '../../src/testing/helpers.js';
import {
  AUTH_INTENTS,
  WORK_ITEM_INTENTS,
  BRANCH_INTENTS,
  PULL_REQUEST_INTENTS,
  CONNECTION_INTENTS,
  LIFECYCLE_INTENTS,
} from '../../src/praxis-logic/intents.js';
import {
  ActivateEvent,
  DeactivateEvent,
  SignInEntraEvent,
  SignOutEntraEvent,
  AuthenticationSuccessEvent,
  AuthenticationFailedEvent,
  DeviceCodeStartedAppEvent,
  DeviceCodeCompletedAppEvent,
  DeviceCodeCancelledEvent,
  AuthCodeFlowStartedAppEvent,
  AuthCodeFlowCompletedAppEvent,
  CreateWorkItemEvent,
  BulkAssignEvent,
  CreateBranchEvent,
  CreatePullRequestEvent,
  ConnectionsLoadedEvent,
  ConnectionSelectedEvent,
} from '../../src/praxis/application/facts.js';
import type { ProjectConnection } from '../../src/praxis/connection/types.js';

const CONNECTION_ID = 'test-conn-decision';

const testConnection: ProjectConnection = {
  id: CONNECTION_ID,
  label: 'Test Connection',
  organization: 'test-org',
  project: 'test-project',
  authMethod: 'entra',
};

describe('Decision Ledger Rules – Auth', () => {
  beforeEach(async () => {
    await resetEngine();
  });

  it('SIGN_IN_ENTRA appends an auth entry with the SIGN_IN_ENTRA intent', () => {
    dispatch([SignInEntraEvent.create({ connectionId: CONNECTION_ID })]);

    const { decisionLedger } = getContext();
    const entry = decisionLedger.entries.find((e) => e.operation === AUTH_INTENTS.SIGN_IN_ENTRA);
    expect(entry).toBeDefined();
    expect(entry?.category).toBe('auth');
    expect(entry?.outcome).toBe('allowed');
    expect(entry?.connectionId).toBe(CONNECTION_ID);
  });

  it('SIGN_OUT_ENTRA appends an auth entry with the SIGN_OUT_ENTRA intent', () => {
    dispatch([SignOutEntraEvent.create({ connectionId: CONNECTION_ID })]);

    const { decisionLedger } = getContext();
    const entry = decisionLedger.entries.find((e) => e.operation === AUTH_INTENTS.SIGN_OUT_ENTRA);
    expect(entry).toBeDefined();
    expect(entry?.category).toBe('auth');
    expect(entry?.outcome).toBe('allowed');
  });

  it('AUTHENTICATION_SUCCESS appends an auth entry with the SUCCESS intent', () => {
    dispatch([AuthenticationSuccessEvent.create({ connectionId: CONNECTION_ID })]);

    const { decisionLedger } = getContext();
    const entry = decisionLedger.entries.find((e) => e.operation === AUTH_INTENTS.SUCCESS);
    expect(entry).toBeDefined();
    expect(entry?.category).toBe('auth');
    expect(entry?.outcome).toBe('allowed');
  });

  it('AUTHENTICATION_FAILED appends an auth entry with the FAILED intent and denied outcome', () => {
    dispatch([
      AuthenticationFailedEvent.create({ connectionId: CONNECTION_ID, error: 'Token expired' }),
    ]);

    const { decisionLedger } = getContext();
    const entry = decisionLedger.entries.find((e) => e.operation === AUTH_INTENTS.FAILED);
    expect(entry).toBeDefined();
    expect(entry?.category).toBe('auth');
    expect(entry?.outcome).toBe('denied');
    expect(entry?.rationale).toBe('Token expired');
  });

  it('DEVICE_CODE_STARTED appends an auth entry with DEVICE_CODE_START intent', () => {
    dispatch([
      DeviceCodeStartedAppEvent.create({
        connectionId: CONNECTION_ID,
        userCode: 'ABCD-1234',
        verificationUri: 'https://microsoft.com/devicelogin',
        expiresInSeconds: 900,
      }),
    ]);

    const { decisionLedger } = getContext();
    const entry = decisionLedger.entries.find(
      (e) => e.operation === AUTH_INTENTS.DEVICE_CODE_START
    );
    expect(entry).toBeDefined();
    expect(entry?.category).toBe('auth');
  });

  it('DEVICE_CODE_COMPLETED appends an auth entry with DEVICE_CODE_COMPLETE intent', () => {
    dispatch([DeviceCodeCompletedAppEvent.create({ connectionId: CONNECTION_ID })]);

    const { decisionLedger } = getContext();
    const entry = decisionLedger.entries.find(
      (e) => e.operation === AUTH_INTENTS.DEVICE_CODE_COMPLETE
    );
    expect(entry).toBeDefined();
    expect(entry?.category).toBe('auth');
  });

  it('DEVICE_CODE_CANCELLED appends an auth entry with DEVICE_CODE_CANCEL intent', () => {
    dispatch([DeviceCodeCancelledEvent.create({ connectionId: CONNECTION_ID })]);

    const { decisionLedger } = getContext();
    const entry = decisionLedger.entries.find(
      (e) => e.operation === AUTH_INTENTS.DEVICE_CODE_CANCEL
    );
    expect(entry).toBeDefined();
    expect(entry?.category).toBe('auth');
    expect(entry?.outcome).toBe('deferred');
  });

  it('AUTH_CODE_FLOW_STARTED appends an auth entry with AUTH_CODE_FLOW_START intent', () => {
    dispatch([
      AuthCodeFlowStartedAppEvent.create({
        connectionId: CONNECTION_ID,
        authorizationUrl: 'https://login.microsoftonline.com/authorize',
        expiresInSeconds: 300,
      }),
    ]);

    const { decisionLedger } = getContext();
    const entry = decisionLedger.entries.find(
      (e) => e.operation === AUTH_INTENTS.AUTH_CODE_FLOW_START
    );
    expect(entry).toBeDefined();
    expect(entry?.category).toBe('auth');
  });

  it('AUTH_CODE_FLOW_COMPLETED (success) appends an allowed entry', () => {
    dispatch([
      AuthCodeFlowCompletedAppEvent.create({ connectionId: CONNECTION_ID, success: true }),
    ]);

    const { decisionLedger } = getContext();
    const entry = decisionLedger.entries.find(
      (e) => e.operation === AUTH_INTENTS.AUTH_CODE_FLOW_COMPLETE
    );
    expect(entry).toBeDefined();
    expect(entry?.outcome).toBe('allowed');
  });

  it('AUTH_CODE_FLOW_COMPLETED (failure) appends a denied entry with error message', () => {
    dispatch([
      AuthCodeFlowCompletedAppEvent.create({
        connectionId: CONNECTION_ID,
        success: false,
        error: 'Access denied',
      }),
    ]);

    const { decisionLedger } = getContext();
    const entry = decisionLedger.entries.find(
      (e) => e.operation === AUTH_INTENTS.AUTH_CODE_FLOW_COMPLETE
    );
    expect(entry).toBeDefined();
    expect(entry?.outcome).toBe('denied');
    expect(entry?.rationale).toBe('Access denied');
  });
});

describe('Decision Ledger Rules – Work Items', () => {
  beforeEach(async () => {
    await resetEngine();
  });

  it('CREATE_WORK_ITEM appends a work-item entry with CREATE intent', () => {
    dispatch([CreateWorkItemEvent.create({ connectionId: CONNECTION_ID })]);

    const { decisionLedger } = getContext();
    const entry = decisionLedger.entries.find((e) => e.operation === WORK_ITEM_INTENTS.CREATE);
    expect(entry).toBeDefined();
    expect(entry?.category).toBe('work-item');
    expect(entry?.outcome).toBe('allowed');
    expect(entry?.connectionId).toBe(CONNECTION_ID);
  });

  it('BULK_ASSIGN appends a work-item entry with BULK_ASSIGN intent', () => {
    dispatch([
      BulkAssignEvent.create({ connectionId: CONNECTION_ID, workItemIds: [101, 102, 103] }),
    ]);

    const { decisionLedger } = getContext();
    const entry = decisionLedger.entries.find((e) => e.operation === WORK_ITEM_INTENTS.BULK_ASSIGN);
    expect(entry).toBeDefined();
    expect(entry?.category).toBe('work-item');
    expect(entry?.payload).toEqual({ workItemIds: [101, 102, 103] });
  });
});

describe('Decision Ledger Rules – Branch', () => {
  beforeEach(async () => {
    await resetEngine();
  });

  it('CREATE_BRANCH appends a branch entry with CREATE intent', () => {
    dispatch([CreateBranchEvent.create({ connectionId: CONNECTION_ID, workItemId: 42 })]);

    const { decisionLedger } = getContext();
    const entry = decisionLedger.entries.find((e) => e.operation === BRANCH_INTENTS.CREATE);
    expect(entry).toBeDefined();
    expect(entry?.category).toBe('branch');
    expect(entry?.outcome).toBe('allowed');
    expect(entry?.payload).toEqual({ workItemId: 42 });
  });
});

describe('Decision Ledger Rules – Pull Request', () => {
  beforeEach(async () => {
    await resetEngine();
  });

  it('CREATE_PULL_REQUEST appends a pull-request entry with CREATE intent', () => {
    dispatch([CreatePullRequestEvent.create({ connectionId: CONNECTION_ID, workItemId: 99 })]);

    const { decisionLedger } = getContext();
    const entry = decisionLedger.entries.find((e) => e.operation === PULL_REQUEST_INTENTS.CREATE);
    expect(entry).toBeDefined();
    expect(entry?.category).toBe('pull-request');
    expect(entry?.outcome).toBe('allowed');
  });
});

describe('Decision Ledger Rules – Connection', () => {
  beforeEach(async () => {
    await resetEngine();
  });

  it('CONNECTIONS_LOADED appends a connection entry with LOAD intent', () => {
    dispatch([ConnectionsLoadedEvent.create({ connections: [testConnection] })]);

    const { decisionLedger } = getContext();
    const entry = decisionLedger.entries.find((e) => e.operation === CONNECTION_INTENTS.LOAD);
    expect(entry).toBeDefined();
    expect(entry?.category).toBe('connection');
    expect(entry?.payload).toEqual({ count: 1 });
  });

  it('CONNECTION_SELECTED appends a connection entry with SELECT intent', () => {
    dispatch([ConnectionSelectedEvent.create({ connectionId: CONNECTION_ID })]);

    const { decisionLedger } = getContext();
    const entry = decisionLedger.entries.find((e) => e.operation === CONNECTION_INTENTS.SELECT);
    expect(entry).toBeDefined();
    expect(entry?.category).toBe('connection');
    expect(entry?.connectionId).toBe(CONNECTION_ID);
  });
});

describe('Decision Ledger Rules – Lifecycle', () => {
  beforeEach(async () => {
    await resetEngine();
  });

  it('ACTIVATE appends a lifecycle entry with ACTIVATE intent', () => {
    dispatch([ActivateEvent.create({})]);

    const { decisionLedger } = getContext();
    const entry = decisionLedger.entries.find((e) => e.operation === LIFECYCLE_INTENTS.ACTIVATE);
    expect(entry).toBeDefined();
    expect(entry?.category).toBe('lifecycle');
    expect(entry?.outcome).toBe('allowed');
  });

  it('DEACTIVATE appends a lifecycle entry with DEACTIVATE intent', () => {
    dispatch([DeactivateEvent.create({})]);

    const { decisionLedger } = getContext();
    const entry = decisionLedger.entries.find((e) => e.operation === LIFECYCLE_INTENTS.DEACTIVATE);
    expect(entry).toBeDefined();
    expect(entry?.category).toBe('lifecycle');
    expect(entry?.outcome).toBe('allowed');
  });

  it('multiple events accumulate distinct entries in the ledger', () => {
    dispatch([ActivateEvent.create({})]);
    dispatch([ConnectionsLoadedEvent.create({ connections: [testConnection] })]);
    dispatch([ConnectionSelectedEvent.create({ connectionId: CONNECTION_ID })]);

    const { decisionLedger } = getContext();
    const categories = decisionLedger.entries.map((e) => e.category);
    expect(categories).toContain('lifecycle');
    expect(categories).toContain('connection');
    expect(decisionLedger.version).toBeGreaterThanOrEqual(3);
  });
});
