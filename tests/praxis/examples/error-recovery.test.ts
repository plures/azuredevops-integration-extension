/**
 * Error Recovery Test Example
 * 
 * Demonstrates testing error scenarios and recovery workflows
 * using the history testing infrastructure.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { startRecording, stopRecording } from '../../../src/testing/historyTestRecorder.js';
import { createSnapshotTest } from '../../../src/testing/snapshotTesting.js';
import { validateEventSequence, checkState, checkProperty } from '../../../src/testing/eventSequenceValidator.js';
import { resetEngine, waitForState, getContext, dispatch } from '../../../src/testing/helpers.js';
import {
  ActivateEvent,
  ActivationCompleteEvent,
  ConnectionsLoadedEvent,
  WorkItemsErrorEvent,
  ApplicationErrorEvent,
  RetryApplicationEvent,
  RefreshDataEvent,
} from '../../../src/praxis/application/facts.js';
import type { ProjectConnection } from '../../../src/praxis/connection/types.js';

describe('Error Recovery - History Testing Examples', () => {
  beforeEach(() => {
    resetEngine();
  });

  describe('Network Error Recovery', () => {
    it('should record error recovery workflow', async () => {
      // Setup: Activate and load connection
      const testConnection: ProjectConnection = {
        id: 'test-connection-error',
        organization: 'test-org',
        project: 'test-project',
        label: 'Test Connection',
        baseUrl: 'https://dev.azure.com',
        apiBaseUrl: 'https://dev.azure.com/test-org/test-project/_apis',
        authMethod: 'entra',
      };

      dispatch([ActivateEvent.create({})]);
      dispatch([ActivationCompleteEvent.create({})]);
      dispatch([
        ConnectionsLoadedEvent.create({
          connections: [testConnection],
          activeId: testConnection.id,
        }),
      ]);

      await waitForState((ctx) => ctx.applicationState === 'active');

      // Start recording
      startRecording('error-recovery-001', 'Network error and recovery workflow');

      // Step 1: Simulate network error
      dispatch([
        WorkItemsErrorEvent.create({
          connectionId: testConnection.id,
          error: 'Network timeout',
        }),
      ]);

      await waitForState((ctx) => ctx.lastError !== null);
      await waitForState((ctx) => ctx.workItemsError !== null);

      // Verify error state
      let context = getContext();
      expect(context.lastError).toBeTruthy();
      expect(context.workItemsErrorConnectionId).toBe(testConnection.id);
      expect(context.errorRecoveryAttempts).toBe(0);

      // Step 2: Retry
      dispatch([
        RetryApplicationEvent.create({
          connectionId: testConnection.id,
        }),
      ]);

      await waitForState((ctx) => ctx.errorRecoveryAttempts > 0);

      // Verify retry state
      context = getContext();
      expect(context.errorRecoveryAttempts).toBeGreaterThan(0);

      // Step 3: Refresh data (simulate successful recovery)
      dispatch([
        RefreshDataEvent.create({
          connectionId: testConnection.id,
        }),
      ]);

      // Clear error (simulate successful refresh) - Note: WorkItemsErrorEvent doesn't support null, 
      // so we'll just verify the retry happened. In real scenarios, a RefreshDataEvent would clear the error.

      // Note: Error clearing would happen via a successful refresh, not shown here
      // In a real scenario, WorkItemsLoadedEvent would clear the error

      // Stop recording
      const scenario = stopRecording();

      // Verify scenario
      expect(scenario.id).toBe('error-recovery-001');
      expect(scenario.events.length).toBeGreaterThan(0);

      // Verify final state
      const finalContext = getContext();
      // Note: Error may still be present until cleared by successful operation
      expect(finalContext.errorRecoveryAttempts).toBeGreaterThan(0);
    });
  });

  describe('Error State Validation', () => {
    it('should validate error recovery sequence', () => {
      const testConnection: ProjectConnection = {
        id: 'test-connection-error-validation',
        organization: 'test-org',
        project: 'test-project',
        label: 'Test Connection',
        baseUrl: 'https://dev.azure.com',
        apiBaseUrl: 'https://dev.azure.com/test-org/test-project/_apis',
        authMethod: 'entra',
      };

      const result = validateEventSequence({
        name: 'error-recovery-validation',
        sequence: [
          ActivateEvent.create({}),
          ActivationCompleteEvent.create({}),
          ConnectionsLoadedEvent.create({
            connections: [testConnection],
            activeId: testConnection.id,
          }),
          ApplicationErrorEvent.create({
            error: 'Test error',
            connectionId: testConnection.id,
          }),
          RetryApplicationEvent.create({
            connectionId: testConnection.id,
          }),
        ],
        validators: [
          {
            afterIndex: 3,
            validator: (ctx) => ctx.lastError !== null,
            errorMessage: 'Error should be set after ApplicationErrorEvent',
          },
          {
            afterIndex: 3,
            validator: checkProperty('errorRecoveryAttempts', 0),
            errorMessage: 'Error recovery attempts should start at 0',
          },
          {
            afterIndex: 4,
            validator: (ctx) => ctx.errorRecoveryAttempts > 0,
            errorMessage: 'Error recovery attempts should increment after retry',
          },
        ],
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('Error Recovery Snapshots', () => {
    it('should validate error state transitions', () => {
      const testConnection: ProjectConnection = {
        id: 'test-connection-error-snapshot',
        organization: 'test-org',
        project: 'test-project',
        label: 'Test Connection',
        baseUrl: 'https://dev.azure.com',
        apiBaseUrl: 'https://dev.azure.com/test-org/test-project/_apis',
        authMethod: 'entra',
      };

      const testFn = createSnapshotTest({
        name: 'error-state-transitions',
        events: [
          ActivateEvent.create({}),
          ActivationCompleteEvent.create({}),
          ConnectionsLoadedEvent.create({
            connections: [testConnection],
            activeId: testConnection.id,
          }),
          ApplicationErrorEvent.create({
            error: 'Connection failed',
            connectionId: testConnection.id,
          }),
          RetryApplicationEvent.create({
            connectionId: testConnection.id,
          }),
        ],
        expectedSnapshots: [
          {
            index: 3,
            state: 'active',
            contextChecks: (ctx) => ctx.lastError !== null,
            description: 'Error should be set after ApplicationErrorEvent',
          },
          {
            index: 3,
            state: 'active',
            contextChecks: (ctx) => ctx.errorRecoveryAttempts === 0,
            description: 'Error recovery attempts should start at 0',
          },
          {
            index: 4,
            state: 'active',
            contextChecks: (ctx) => ctx.errorRecoveryAttempts > 0,
            description: 'Error recovery attempts should increment after retry',
          },
        ],
      });

      expect(() => testFn()).not.toThrow();
    });
  });
});

