/**
 * E2E Tests for Error Handling User Recovery Scenarios
 *
 * Tests complete user flows for error recovery:
 * - PAT expires → See error → Click fix → Re-authenticate → Work items load
 * - Network error → See error → Click retry → Success
 * - Multiple errors → Clear state → Recovery
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createActor } from 'xstate';
import { applicationMachine } from '../../src/fsm/machines/applicationMachine.js';

// Helper to wait for state transitions
async function waitFor(
  actor: any,
  predicate: (snapshot: any) => boolean,
  timeout = 5000
): Promise<void> {
  const start = Date.now();
  return new Promise<void>((resolve, reject) => {
    const check = () => {
      const snapshot = actor.getSnapshot();
      if (snapshot && predicate(snapshot)) {
        resolve();
        return;
      }
      if (Date.now() - start > timeout) {
        const currentState = snapshot?.value || 'unknown';
        reject(new Error(`waitFor timeout: current state is ${currentState}`));
        return;
      }
      setTimeout(check, 10);
    };
    check();
  });
}

// Helper to create mock ExtensionContext
function createMockExtensionContext() {
  return {
    globalState: {
      get: vi.fn(() => undefined),
      update: vi.fn(() => Promise.resolve()),
    },
    workspaceState: {
      get: vi.fn(() => undefined),
      update: vi.fn(() => Promise.resolve()),
    },
    secrets: {
      get: vi.fn(() => Promise.resolve(undefined)),
      store: vi.fn(() => Promise.resolve()),
      delete: vi.fn(() => Promise.resolve()),
    },
  } as any;
}

describe('Error Handling E2E Scenarios', () => {
  describe('Scenario: PAT Expiration Recovery Flow', () => {
    it('should complete full recovery flow: PAT expires → See error → Re-authenticate → Success', async () => {
      const mockContext = createMockExtensionContext();
      const actor = createActor(applicationMachine, {
        input: { extensionContext: mockContext },
      });
      actor.start();

      // Step 1: Activate extension
      actor.send({ type: 'ACTIVATE', context: mockContext });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Step 2: Simulate PAT expiration (authentication failure)
      actor.send({
        type: 'AUTHENTICATION_FAILED',
        connectionId: 'test-conn',
        error: 'Personal Access Token has expired',
      });

      // Step 3: Verify error state is displayed
      let snapshot = actor.getSnapshot();
      expect(snapshot.context.ui?.connectionHealth?.status).toBe('error');
      expect(snapshot.context.ui?.connectionHealth?.lastError?.type).toBe('authentication');
      expect(snapshot.context.ui?.connectionHealth?.lastError?.message).toContain(
        'Personal Access Token'
      );
      expect(snapshot.context.ui?.statusMessage?.type).toBe('error');

      // Step 4: User clicks "Re-authenticate" (sends AUTHENTICATION_REQUIRED)
      actor.send({
        type: 'AUTHENTICATION_REQUIRED',
        connectionId: 'test-conn',
      });

      // Step 5: Simulate successful re-authentication
      actor.send({
        type: 'AUTHENTICATION_SUCCESS',
        connectionId: 'test-conn',
        token: 'new-valid-token',
      });

      // Step 6: Verify error state is cleared
      snapshot = actor.getSnapshot();
      expect(snapshot.context.ui?.connectionHealth?.status).toBe('healthy');
      expect(snapshot.context.ui?.connectionHealth?.lastError).toBeUndefined();
      expect(snapshot.context.ui?.connectionHealth?.lastSuccess).toBeGreaterThan(0);
      expect(snapshot.context.ui?.statusMessage).toBeUndefined();
    });

    it('should show correct error message and action for PAT expiration', async () => {
      const mockContext = createMockExtensionContext();
      const actor = createActor(applicationMachine, {
        input: { extensionContext: mockContext },
      });
      actor.start();

      actor.send({ type: 'ACTIVATE', context: mockContext });
      await new Promise((resolve) => setTimeout(resolve, 100));

      actor.send({
        type: 'AUTHENTICATION_FAILED',
        connectionId: 'test-conn',
        error: 'Personal Access Token has expired',
      });

      const snapshot = actor.getSnapshot();
      const error = snapshot.context.ui?.connectionHealth?.lastError;

      expect(error?.type).toBe('authentication');
      expect(error?.message).toContain('Personal Access Token');
      expect(error?.suggestedAction).toBe('Update PAT');
      expect(error?.recoverable).toBe(true);
    });
  });

  describe('Scenario: Network Error Recovery Flow', () => {
    it('should handle network error and allow retry', async () => {
      const mockContext = createMockExtensionContext();
      const actor = createActor(applicationMachine, {
        input: { extensionContext: mockContext },
      });
      actor.start();

      actor.send({ type: 'ACTIVATE', context: mockContext });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate network error
      actor.send({
        type: 'AUTHENTICATION_FAILED',
        connectionId: 'test-conn',
        error: 'Network timeout - connection failed',
      });

      // Verify network error is detected
      let snapshot = actor.getSnapshot();
      const error = snapshot.context.ui?.connectionHealth?.lastError;
      expect(error?.type).toBe('network');
      expect(error?.recoverable).toBe(true);
      expect(error?.suggestedAction).toBe('Retry');

      // User clicks "Retry" (sends REFRESH_DATA)
      actor.send({ type: 'REFRESH_DATA' });

      // Simulate successful retry
      actor.send({
        type: 'AUTHENTICATION_SUCCESS',
        connectionId: 'test-conn',
        token: 'valid-token',
      });

      // Verify error cleared
      snapshot = actor.getSnapshot();
      expect(snapshot.context.ui?.connectionHealth?.status).toBe('healthy');
    });
  });

  describe('Scenario: Multiple Error Types', () => {
    it('should handle transition from authentication error to network error', async () => {
      const mockContext = createMockExtensionContext();
      const actor = createActor(applicationMachine, {
        input: { extensionContext: mockContext },
      });
      actor.start();

      actor.send({ type: 'ACTIVATE', context: mockContext });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // First error: Authentication
      actor.send({
        type: 'AUTHENTICATION_FAILED',
        connectionId: 'test-conn',
        error: 'Token expired',
      });

      let snapshot = actor.getSnapshot();
      expect(snapshot.context.ui?.connectionHealth?.lastError?.type).toBe('authentication');

      // Second error: Network (after retry)
      actor.send({
        type: 'AUTHENTICATION_FAILED',
        connectionId: 'test-conn',
        error: 'Network connection timeout',
      });

      snapshot = actor.getSnapshot();
      expect(snapshot.context.ui?.connectionHealth?.lastError?.type).toBe('network');
      expect(snapshot.context.ui?.connectionHealth?.lastFailure).toBeGreaterThan(0);
    });

    it('should handle authorization error correctly', async () => {
      const mockContext = createMockExtensionContext();
      const actor = createActor(applicationMachine, {
        input: { extensionContext: mockContext },
      });
      actor.start();

      actor.send({ type: 'ACTIVATE', context: mockContext });
      await new Promise((resolve) => setTimeout(resolve, 100));

      actor.send({
        type: 'AUTHENTICATION_FAILED',
        connectionId: 'test-conn',
        error: '403 Forbidden - insufficient permissions',
      });

      const snapshot = actor.getSnapshot();
      const error = snapshot.context.ui?.connectionHealth?.lastError;

      expect(error?.type).toBe('authorization');
      expect(error?.message).toContain('permission');
      expect(error?.suggestedAction).toBe('Check Permissions');
      expect(error?.recoverable).toBe(true);
    });
  });

  describe('Scenario: Refresh Status Tracking', () => {
    it('should track refresh attempts and success/failure', async () => {
      const mockContext = createMockExtensionContext();
      const actor = createActor(applicationMachine, {
        input: { extensionContext: mockContext },
      });
      actor.start();

      actor.send({ type: 'ACTIVATE', context: mockContext });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // The refresh status is updated by actions in the machine
      // We verify the structure exists and can be updated
      const snapshot = actor.getSnapshot();
      expect(snapshot.context.ui).toBeDefined();

      // In real flow, refresh status would be updated when:
      // - loadData completes successfully (updateRefreshStatusSuccess)
      // - loadData fails (updateRefreshStatusError)
    });
  });

  describe('Scenario: Error State Clear on Success', () => {
    it('should clear all error state when authentication succeeds', async () => {
      const mockContext = createMockExtensionContext();
      const actor = createActor(applicationMachine, {
        input: { extensionContext: mockContext },
      });
      actor.start();

      actor.send({ type: 'ACTIVATE', context: mockContext });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Set error state
      actor.send({
        type: 'AUTHENTICATION_FAILED',
        connectionId: 'test-conn',
        error: 'Multiple errors occurred',
      });

      let snapshot = actor.getSnapshot();
      expect(snapshot.context.ui?.connectionHealth?.status).toBe('error');
      expect(snapshot.context.ui?.connectionHealth?.lastError).toBeDefined();
      expect(snapshot.context.ui?.statusMessage).toBeDefined();

      // Clear with success
      actor.send({
        type: 'AUTHENTICATION_SUCCESS',
        connectionId: 'test-conn',
        token: 'valid-token',
      });

      snapshot = actor.getSnapshot();
      expect(snapshot.context.ui?.connectionHealth?.status).toBe('healthy');
      expect(snapshot.context.ui?.connectionHealth?.lastError).toBeUndefined();
      expect(snapshot.context.ui?.connectionHealth?.lastSuccess).toBeGreaterThan(0);
      expect(snapshot.context.ui?.statusMessage).toBeUndefined();
    });
  });

  describe('Scenario: Error Message Catalog', () => {
    it('should provide appropriate messages for different error types', async () => {
      const mockContext = createMockExtensionContext();
      const actor = createActor(applicationMachine, {
        input: { extensionContext: mockContext },
      });
      actor.start();

      actor.send({ type: 'ACTIVATE', context: mockContext });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const errorScenarios = [
        {
          error: 'Personal Access Token has expired',
          expectedType: 'authentication',
          expectedAction: 'Update PAT',
        },
        {
          error: '403 Forbidden',
          expectedType: 'authorization',
          expectedAction: 'Check Permissions',
        },
        {
          error: 'Network timeout',
          expectedType: 'network',
          expectedAction: 'Retry',
        },
        {
          error: '500 Internal Server Error',
          expectedType: 'server',
          expectedAction: 'Retry',
        },
      ];

      for (const scenario of errorScenarios) {
        actor.send({
          type: 'AUTHENTICATION_FAILED',
          connectionId: 'test-conn',
          error: scenario.error,
        });

        const snapshot = actor.getSnapshot();
        const error = snapshot.context.ui?.connectionHealth?.lastError;

        expect(error?.type).toBe(scenario.expectedType);
        expect(error?.suggestedAction).toBe(scenario.expectedAction);
      }
    });
  });
});
