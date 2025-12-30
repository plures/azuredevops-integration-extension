/**
 * Connection Authentication Workflow Test Example
 * 
 * Demonstrates recording and replaying a complete connection authentication workflow
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
  ConnectionSelectedEvent,
  SignInEntraEvent,
  AuthenticationSuccessEvent,
  ConnectionStateUpdatedEvent,
} from '../../../src/praxis/application/facts.js';
import type { ProjectConnection } from '../../../src/praxis/connection/types.js';

describe('Connection Authentication Workflow - History Testing Examples', () => {
  beforeEach(() => {
    resetEngine();
  });

  describe('Record & Replay Workflow', () => {
    it('should record complete connection authentication workflow', async () => {
      // Start recording
      startRecording('connection-auth-001', 'Complete connection authentication workflow');

      // Step 1: Activate application
      dispatch([ActivateEvent.create({})]);
      await waitForState((ctx) => ctx.applicationState === 'activating');

      dispatch([ActivationCompleteEvent.create({})]);
      await waitForState((ctx) => ctx.applicationState === 'active');

      // Step 2: Load connections
      const testConnection: ProjectConnection = {
        id: 'test-connection-001',
        organization: 'test-org',
        project: 'test-project',
        label: 'Test Connection',
        baseUrl: 'https://dev.azure.com',
        apiBaseUrl: 'https://dev.azure.com/test-org/test-project/_apis',
        authMethod: 'entra',
      };

      dispatch([
        ConnectionsLoadedEvent.create({
          connections: [testConnection],
          activeId: testConnection.id,
        }),
      ]);

      await waitForState((ctx) => ctx.connections.length === 1);
      await waitForState((ctx) => ctx.activeConnectionId === testConnection.id);

      // Step 3: Select connection
      dispatch([ConnectionSelectedEvent.create({ connectionId: testConnection.id })]);

      // Step 4: Initiate authentication
      dispatch([
        SignInEntraEvent.create({
          connectionId: testConnection.id,
          forceInteractive: false,
        }),
      ]);

      await waitForState((ctx) => {
        const connectionState = ctx.connectionStates?.get(testConnection.id);
        return connectionState?.state === 'authenticating' || connectionState?.state === 'authenticated';
      });

      // Step 5: Complete authentication
      dispatch([
        AuthenticationSuccessEvent.create({
          connectionId: testConnection.id,
          accessToken: 'mock-token',
          refreshToken: 'mock-refresh-token',
        }),
      ]);

      dispatch([
        ConnectionStateUpdatedEvent.create({
          connectionId: testConnection.id,
          state: {
            state: 'authenticated',
            connectionId: testConnection.id,
            isConnected: true,
            authMethod: 'entra',
            hasClient: true,
            hasProvider: true,
            retryCount: 0,
          },
        }),
      ]);

      await waitForState((ctx) => {
        const connectionState = ctx.connectionStates?.get(testConnection.id);
        return connectionState?.state === 'authenticated';
      });

      // Stop recording
      const scenario = stopRecording();

      // Verify scenario was recorded correctly
      expect(scenario.id).toBe('connection-auth-001');
      expect(scenario.name).toBe('Complete connection authentication workflow');
      expect(scenario.events.length).toBeGreaterThan(0);
      expect(scenario.initialContext.applicationState).toBe('inactive');
      expect(scenario.finalContext.applicationState).toBe('active');
      expect(scenario.finalContext.connections.length).toBe(1);
      expect(scenario.finalContext.activeConnectionId).toBe(testConnection.id);

      // Verify final state
      const finalContext = getContext();
      expect(finalContext.connectionStates?.get(testConnection.id)?.state).toBe('authenticated');
    });
  });

  describe('Snapshot Testing', () => {
    it('should validate state at each step of authentication', () => {
      const testConnection: ProjectConnection = {
        id: 'test-connection-002',
        organization: 'test-org',
        project: 'test-project',
        label: 'Test Connection',
        baseUrl: 'https://dev.azure.com',
        apiBaseUrl: 'https://dev.azure.com/test-org/test-project/_apis',
        authMethod: 'entra',
      };

      const testFn = createSnapshotTest({
        name: 'authentication-state-validation',
        events: [
          ActivateEvent.create({}),
          ActivationCompleteEvent.create({}),
          ConnectionsLoadedEvent.create({
            connections: [testConnection],
            activeId: testConnection.id,
          }),
          ConnectionSelectedEvent.create({ connectionId: testConnection.id }),
          SignInEntraEvent.create({
            connectionId: testConnection.id,
            forceInteractive: false,
          }),
          AuthenticationSuccessEvent.create({
            connectionId: testConnection.id,
            accessToken: 'mock-token',
            refreshToken: 'mock-refresh-token',
          }),
        ],
        expectedSnapshots: [
          {
            index: 1,
            state: 'activating',
            contextChecks: (ctx) => ctx.applicationState === 'activating',
            description: 'Application should be activating after ActivateEvent',
          },
          {
            index: 2,
            state: 'active',
            contextChecks: (ctx) => ctx.applicationState === 'active' && ctx.isActivated === true,
            description: 'Application should be active after ActivationCompleteEvent',
          },
          {
            index: 3,
            state: 'active',
            contextChecks: (ctx) => ctx.connections.length === 1 && ctx.activeConnectionId === testConnection.id,
            description: 'Connections should be loaded and active connection set',
          },
          {
            index: 5,
            state: 'active',
            contextChecks: (ctx) => {
              const connectionState = ctx.connectionStates?.get(testConnection.id);
              return connectionState !== undefined;
            },
            description: 'Connection state should exist after authentication initiated',
          },
        ],
      });

      // Should not throw if all snapshots match
      expect(() => testFn()).not.toThrow();
    });
  });

  describe('Event Sequence Validation', () => {
    it('should validate authentication event sequence', () => {
      const testConnection: ProjectConnection = {
        id: 'test-connection-003',
        organization: 'test-org',
        project: 'test-project',
        label: 'Test Connection',
        baseUrl: 'https://dev.azure.com',
        apiBaseUrl: 'https://dev.azure.com/test-org/test-project/_apis',
        authMethod: 'entra',
      };

      const result = validateEventSequence({
        name: 'authentication-sequence-validation',
        sequence: [
          ActivateEvent.create({}),
          ActivationCompleteEvent.create({}),
          ConnectionsLoadedEvent.create({
            connections: [testConnection],
            activeId: testConnection.id,
          }),
          SignInEntraEvent.create({
            connectionId: testConnection.id,
            forceInteractive: false,
          }),
          AuthenticationSuccessEvent.create({
            connectionId: testConnection.id,
            accessToken: 'mock-token',
            refreshToken: 'mock-refresh-token',
          }),
        ],
        validators: [
          {
            afterIndex: 0,
            validator: checkState('activating'),
            errorMessage: 'Application should be activating after ActivateEvent',
          },
          {
            afterIndex: 1,
            validator: checkState('active'),
            errorMessage: 'Application should be active after ActivationCompleteEvent',
          },
          {
            afterIndex: 2,
            validator: checkProperty('connections', [testConnection]),
            errorMessage: 'Connections should be loaded',
          },
          {
            afterIndex: 2,
            validator: checkProperty('activeConnectionId', testConnection.id),
            errorMessage: 'Active connection ID should be set',
          },
          {
            afterIndex: 4,
            validator: (ctx) => {
              const connectionState = ctx.connectionStates?.get(testConnection.id);
              return connectionState !== undefined;
            },
            errorMessage: 'Connection state should exist after authentication',
          },
        ],
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });
});

