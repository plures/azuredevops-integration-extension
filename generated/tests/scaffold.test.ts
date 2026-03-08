// ⚠️  GENERATED FILE – do not edit manually.
// Source of truth: src/praxis/application/schema/index.ts
// Regenerate:      npm run derive
// Description:     Test scaffold — one coverage probe per Praxis rule

/* eslint-disable max-lines, max-lines-per-function */
import { describe, it, expect } from 'vitest';
import { schemaDescriptor } from '../../src/praxis/application/schema/descriptor.js';

/**
 * Schema completeness tests.
 *
 * These tests verify that every rule declared in the Praxis schema is
 * well-formed (has an id + description).  They serve as the minimum
 * regression guard: add richer behavioural tests alongside the rule
 * definitions themselves.
 */
describe('Praxis schema – rule registry completeness', () => {
  it('schema descriptor has facts, events and rules', () => {
    expect(schemaDescriptor.facts.length).toBeGreaterThan(0);
    expect(schemaDescriptor.events.length).toBeGreaterThan(0);
    expect(schemaDescriptor.rules.length).toBeGreaterThan(0);
  });

  it('rule "application.activate" is registered in the schema', () => {
    // Triggers on: ACTIVATE
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'application.activate');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "application.activationComplete" is registered in the schema', () => {
    // Triggers on: ACTIVATION_COMPLETE
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'application.activationComplete');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "application.activationFailed" is registered in the schema', () => {
    // Triggers on: APP_ACTIVATION_FAILED
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'application.activationFailed');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "application.deactivate" is registered in the schema', () => {
    // Triggers on: DEACTIVATE
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'application.deactivate');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "application.deactivationComplete" is registered in the schema', () => {
    // Triggers on: DEACTIVATION_COMPLETE
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'application.deactivationComplete');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "connection.loaded" is registered in the schema', () => {
    // Triggers on: CONNECTIONS_LOADED
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'connection.loaded');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "connection.selected" is registered in the schema', () => {
    // Triggers on: CONNECTION_SELECTED, SELECT_CONNECTION
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'connection.selected');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "connection.stateUpdated" is registered in the schema', () => {
    // Triggers on: CONNECTION_STATE_UPDATED
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'connection.stateUpdated');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "application.deviceCodeStarted" is registered in the schema', () => {
    // Triggers on: DEVICE_CODE_STARTED
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'application.deviceCodeStarted');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "application.deviceCodeCompleted" is registered in the schema', () => {
    // Triggers on: DEVICE_CODE_COMPLETED
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'application.deviceCodeCompleted');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "application.deviceCodeCancelled" is registered in the schema', () => {
    // Triggers on: DEVICE_CODE_CANCELLED
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'application.deviceCodeCancelled');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "application.authCodeFlowStarted" is registered in the schema', () => {
    // Triggers on: AUTH_CODE_FLOW_STARTED
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'application.authCodeFlowStarted');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "application.authCodeFlowCompleted" is registered in the schema', () => {
    // Triggers on: AUTH_CODE_FLOW_COMPLETED
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'application.authCodeFlowCompleted');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "workItems.loaded" is registered in the schema', () => {
    // Triggers on: WORK_ITEMS_LOADED
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'workItems.loaded');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "workItems.error" is registered in the schema', () => {
    // Triggers on: WORK_ITEMS_ERROR
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'workItems.error');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "workItems.queryChanged" is registered in the schema', () => {
    // Triggers on: QUERY_CHANGED
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'workItems.queryChanged');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "application.error" is registered in the schema', () => {
    // Triggers on: APPLICATION_ERROR
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'application.error');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "application.retry" is registered in the schema', () => {
    // Triggers on: RETRY
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'application.retry');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "application.reset" is registered in the schema', () => {
    // Triggers on: RESET
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'application.reset');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "application.toggleDebugView" is registered in the schema', () => {
    // Triggers on: TOGGLE_DEBUG_VIEW
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'application.toggleDebugView');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "application.openSettings" is registered in the schema', () => {
    // Triggers on: OPEN_SETTINGS
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'application.openSettings');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "application.viewModeChanged" is registered in the schema', () => {
    // Triggers on: VIEW_MODE_CHANGED
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'application.viewModeChanged');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "application.refreshData" is registered in the schema', () => {
    // Triggers on: REFRESH_DATA
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'application.refreshData');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "application.authReminderRequested" is registered in the schema', () => {
    // Triggers on: AUTH_REMINDER_REQUESTED
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'application.authReminderRequested');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "application.authReminderCleared" is registered in the schema', () => {
    // Triggers on: AUTH_REMINDER_CLEARED
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'application.authReminderCleared');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "timer.start" is registered in the schema', () => {
    // Triggers on: StartTimer
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'timer.start');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "timer.pause" is registered in the schema', () => {
    // Triggers on: PauseTimer
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'timer.pause');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "timer.stop" is registered in the schema', () => {
    // Triggers on: StopTimer
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'timer.stop');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "timer.historyLoaded" is registered in the schema', () => {
    // Triggers on: TimerHistoryLoaded
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'timer.historyLoaded');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "decision.auth.signIn" is registered in the schema', () => {
    // Triggers on: SIGN_IN_ENTRA
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'decision.auth.signIn');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "decision.auth.signOut" is registered in the schema', () => {
    // Triggers on: SIGN_OUT_ENTRA
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'decision.auth.signOut');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "decision.auth.authSuccess" is registered in the schema', () => {
    // Triggers on: AUTHENTICATION_SUCCESS
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'decision.auth.authSuccess');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "decision.auth.authFailed" is registered in the schema', () => {
    // Triggers on: AUTHENTICATION_FAILED
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'decision.auth.authFailed');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "decision.auth.deviceCodeStart" is registered in the schema', () => {
    // Triggers on: DEVICE_CODE_STARTED
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'decision.auth.deviceCodeStart');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "decision.auth.deviceCodeComplete" is registered in the schema', () => {
    // Triggers on: DEVICE_CODE_COMPLETED
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'decision.auth.deviceCodeComplete');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "decision.auth.deviceCodeCancel" is registered in the schema', () => {
    // Triggers on: DEVICE_CODE_CANCELLED
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'decision.auth.deviceCodeCancel');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "decision.auth.authCodeFlowStart" is registered in the schema', () => {
    // Triggers on: AUTH_CODE_FLOW_STARTED
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'decision.auth.authCodeFlowStart');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "decision.auth.authCodeFlowComplete" is registered in the schema', () => {
    // Triggers on: AUTH_CODE_FLOW_COMPLETED
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'decision.auth.authCodeFlowComplete');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "decision.operations.createWorkItem" is registered in the schema', () => {
    // Triggers on: CREATE_WORK_ITEM
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'decision.operations.createWorkItem');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "decision.operations.bulkAssign" is registered in the schema', () => {
    // Triggers on: BULK_ASSIGN
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'decision.operations.bulkAssign');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "decision.operations.createBranch" is registered in the schema', () => {
    // Triggers on: CREATE_BRANCH
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'decision.operations.createBranch');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "decision.operations.createPullRequest" is registered in the schema', () => {
    // Triggers on: CREATE_PULL_REQUEST
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'decision.operations.createPullRequest');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "decision.operations.selectConnection" is registered in the schema', () => {
    // Triggers on: SELECT_CONNECTION
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'decision.operations.selectConnection');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "decision.operations.generateCopilotPrompt" is registered in the schema', () => {
    // Triggers on: GENERATE_COPILOT_PROMPT
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'decision.operations.generateCopilotPrompt');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "decision.operations.activate" is registered in the schema', () => {
    // Triggers on: ACTIVATE
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'decision.operations.activate');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });

  it('rule "decision.operations.deactivate" is registered in the schema', () => {
    // Triggers on: DEACTIVATE
    const found = schemaDescriptor.rules.find((rule) => rule.id === 'decision.operations.deactivate');
    expect(found).toBeDefined();
    expect(found?.description).toBeTruthy();
  });
});
