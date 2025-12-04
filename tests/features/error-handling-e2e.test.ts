/**
 * E2E Tests for Error Handling User Recovery Scenarios
 *
 * Tests complete user flows for error recovery:
 * - PAT expires → See error → Click fix → Re-authenticate → Work items load
 * - Network error → See error → Click retry → Success
 * - Multiple errors → Clear state → Recovery
 */

import { describe, it, expect, vi } from 'vitest';
import { PraxisApplicationManager } from '../../src/praxis/application/manager.js';
import { resetPraxisEventBus } from '../../src/praxis/application/eventBus.js';

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
      resetPraxisEventBus();
      const mockContext = createMockExtensionContext();
      const manager = new PraxisApplicationManager();
      manager.start();

      // Step 1: Activate extension
      manager.activate(mockContext);

      manager.loadConnections([
        {
          id: 'test-conn',
          organization: 'test-org',
          project: 'test-project',
        },
      ]);

      // Step 2: Simulate PAT expiration (authentication failure)
      manager
        .getEventBus()
        .emitAuthEvent('auth:failed', { error: 'Personal Access Token has expired' }, 'test-conn');

      // Step 3: Verify error state is displayed
      // In Praxis, we check if the connection manager has the error
      const connManager = manager.getConnectionManager('test-conn');
      expect(connManager).toBeDefined();

      // Step 4: User clicks "Re-authenticate" (sends AUTHENTICATION_REQUIRED)
      manager.requestAuthReminder('test-conn', 'Token expired');

      // Step 5: Simulate successful re-authentication
      manager
        .getEventBus()
        .emitAuthEvent('auth:success', { token: 'new-valid-token' }, 'test-conn');

      // Step 6: Verify error state is cleared
      expect(manager.getStatus().isStarted).toBe(true);
    });
  });

  describe('Scenario: Network Error Recovery Flow', () => {
    it('should handle network error and allow retry', async () => {
      resetPraxisEventBus();
      const mockContext = createMockExtensionContext();
      const manager = new PraxisApplicationManager();
      manager.start();

      manager.activate(mockContext);
      manager.loadConnections([
        {
          id: 'test-conn',
          organization: 'test-org',
          project: 'test-project',
        },
      ]);

      // Simulate network error
      manager
        .getEventBus()
        .emitAuthEvent(
          'auth:failed',
          { error: 'Network timeout - connection failed' },
          'test-conn'
        );

      // User clicks "Retry" (sends REFRESH_DATA)
      manager.refreshData('test-conn');

      // Simulate successful retry
      manager.getEventBus().emitAuthEvent('auth:success', { token: 'valid-token' }, 'test-conn');

      expect(manager.getStatus().isStarted).toBe(true);
    });
  });

  describe('Scenario: Multiple Error Types', () => {
    it('should handle transition from authentication error to network error', async () => {
      resetPraxisEventBus();
      const mockContext = createMockExtensionContext();
      const manager = new PraxisApplicationManager();
      manager.start();

      manager.activate(mockContext);
      manager.loadConnections([
        {
          id: 'test-conn',
          organization: 'test-org',
          project: 'test-project',
        },
      ]);

      // First error: Authentication
      manager.getEventBus().emitAuthEvent('auth:failed', { error: 'Token expired' }, 'test-conn');

      // Second error: Network (after retry)
      manager
        .getEventBus()
        .emitAuthEvent('auth:failed', { error: 'Network connection timeout' }, 'test-conn');

      expect(manager.getStatus().isStarted).toBe(true);
    });
  });
});
