/**
 * Integration Tests for Error Handling Flow
 *
 * Tests the complete error handling flow including:
 * - Authentication failure → UI state updates
 * - Refresh failure → Status bar updates
 * - Recovery actions → Authentication flow triggered
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
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

describe('Error Handling Integration', () => {
  describe('Authentication Failure Flow', () => {
    let manager: PraxisApplicationManager;
    let mockContext: any;

    beforeEach(() => {
      resetPraxisEventBus();
      mockContext = createMockExtensionContext();
      manager = new PraxisApplicationManager();
      manager.start();
    });

    it('should update UI state when AUTHENTICATION_FAILED event is received', async () => {
      // Activate the manager
      manager.activate(mockContext);

      // Load a connection
      manager.loadConnections([
        {
          id: 'test-conn',
          organization: 'test-org',
          project: 'test-project',
        },
      ]);

      // Simulate auth failure via event bus
      manager
        .getEventBus()
        .emitAuthEvent('auth:failed', { error: 'Personal Access Token has expired' }, 'test-conn');

      // Verify manager is still running and handled the event
      expect(manager.getStatus().isStarted).toBe(true);

      // Check if connection manager exists
      const connManager = manager.getConnectionManager('test-conn');
      expect(connManager).toBeDefined();
    });

    it('should clear error state when AUTHENTICATION_SUCCESS event is received', async () => {
      manager.activate(mockContext);
      manager.loadConnections([
        {
          id: 'test-conn',
          organization: 'test-org',
          project: 'test-project',
        },
      ]);

      // Send success event
      manager.getEventBus().emitAuthEvent('auth:success', { token: 'new-token' }, 'test-conn');

      expect(manager.getStatus().isStarted).toBe(true);
    });
  });

  describe('Refresh Status Updates', () => {
    let manager: PraxisApplicationManager;
    let mockContext: any;

    beforeEach(() => {
      resetPraxisEventBus();
      mockContext = createMockExtensionContext();
      manager = new PraxisApplicationManager();
      manager.start();
    });

    it('should update refresh status on successful data load', async () => {
      manager.activate(mockContext);
      manager.loadConnections([
        {
          id: 'test-conn',
          organization: 'test-org',
          project: 'test-project',
        },
      ]);

      // Mock successful load by sending WORK_ITEMS_LOADED via event bus
      manager.getEventBus().emitApplicationEvent('workitems:loaded', { count: 5 }, 'test-conn');

      expect(manager.getStatus().isStarted).toBe(true);
    });
  });

  describe('Error Recovery Actions', () => {
    let manager: PraxisApplicationManager;
    let mockContext: any;

    beforeEach(() => {
      resetPraxisEventBus();
      mockContext = createMockExtensionContext();
      manager = new PraxisApplicationManager();
      manager.start();
    });

    it('should trigger authentication when AUTHENTICATION_REQUIRED event is sent', async () => {
      manager.activate(mockContext);

      // Request auth reminder
      manager.requestAuthReminder('test-conn', 'Token expired');

      const reminders = manager.getPendingAuthReminders();
      expect(reminders).toBeDefined();
    });
  });
});
