/**
 * Connection Module Tests
 *
 * Tests for the extracted connection module components.
 */

import { describe, it, expect, vi } from 'vitest';
import { connectionMachine } from './machine.js';
import * as guards from './guards.js';
import * as utils from './utils.js';
import type { ConnectionContext, ProjectConnection } from './types.js';

// Mock the dependencies
vi.mock('../../fsm/logging/FSMLogger.js', () => ({
  createComponentLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  FSMComponent: {
    CONNECTION: 'CONNECTION',
  },
}));

vi.mock('../../fsm/functions/authFunctions.js', () => ({
  isTokenValid: vi.fn(() => true),
}));

vi.mock('../../fsm/services/extensionHostBridge.js', () => ({
  getExtensionContextRef: vi.fn(() => ({})),
  getSecretPAT: vi.fn(() => Promise.resolve('test-pat')),
}));

describe('Connection Guards', () => {
  const mockContext: ConnectionContext = {
    connectionId: 'test-connection',
    config: {} as ProjectConnection,
    authMethod: 'pat',
    isConnected: false,
    retryCount: 0,
    refreshFailureCount: 0,
    reauthInProgress: false,
    forceInteractive: false,
  };

  describe('isEntraAuth', () => {
    it('should return true for Entra authentication', () => {
      const context = { ...mockContext, authMethod: 'entra' as const };
      expect(guards.isEntraAuth({ context })).toBe(true);
    });

    it('should return false for PAT authentication', () => {
      const context = { ...mockContext, authMethod: 'pat' as const };
      expect(guards.isEntraAuth({ context })).toBe(false);
    });
  });

  describe('isPATAuth', () => {
    it('should return true for PAT authentication', () => {
      const context = { ...mockContext, authMethod: 'pat' as const };
      expect(guards.isPATAuth({ context })).toBe(true);
    });

    it('should return false for Entra authentication', () => {
      const context = { ...mockContext, authMethod: 'entra' as const };
      expect(guards.isPATAuth({ context })).toBe(false);
    });
  });

  describe('canRetry', () => {
    it('should return true when retry count is less than 3', () => {
      const context = { ...mockContext, retryCount: 2 };
      expect(guards.canRetry({ context })).toBe(true);
    });

    it('should return false when retry count is 3 or more', () => {
      const context = { ...mockContext, retryCount: 3 };
      expect(guards.canRetry({ context })).toBe(false);
    });
  });

  describe('shouldForceInteractiveAuth', () => {
    it('should return true when forceInteractive is true', () => {
      const context = { ...mockContext, forceInteractive: true };
      expect(guards.shouldForceInteractiveAuth({ context })).toBe(true);
    });

    it('should return false when forceInteractive is false', () => {
      const context = { ...mockContext, forceInteractive: false };
      expect(guards.shouldForceInteractiveAuth({ context })).toBe(false);
    });
  });
});

describe('Connection Utils', () => {
  describe('normalizeExpiryToMs', () => {
    it('should return undefined for undefined input', () => {
      expect(utils.normalizeExpiryToMs(undefined)).toBeUndefined();
    });

    it('should return number for number input', () => {
      const timestamp = Date.now();
      expect(utils.normalizeExpiryToMs(timestamp)).toBe(timestamp);
    });

    it('should convert Date to milliseconds', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      expect(utils.normalizeExpiryToMs(date)).toBe(date.getTime());
    });

    it('should convert string to milliseconds', () => {
      const dateString = '2024-01-01T00:00:00Z';
      const expected = new Date(dateString).getTime();
      expect(utils.normalizeExpiryToMs(dateString)).toBe(expected);
    });
  });

  describe('isTokenExpiredOrExpiringSoon', () => {
    it('should return true for undefined expiry', () => {
      expect(utils.isTokenExpiredOrExpiringSoon(undefined)).toBe(true);
    });

    it('should return true for expired token', () => {
      const expiredTime = Date.now() - 1000; // 1 second ago
      expect(utils.isTokenExpiredOrExpiringSoon(expiredTime)).toBe(true);
    });

    it('should return false for token expiring in the future', () => {
      const futureTime = Date.now() + 10 * 60 * 1000; // 10 minutes from now
      expect(utils.isTokenExpiredOrExpiringSoon(futureTime)).toBe(false);
    });
  });

  describe('validateConnectionConfig', () => {
    it('should return empty array for valid config', () => {
      const config: ProjectConnection = {
        id: 'test-id',
        organization: 'test-org',
        project: 'test-project',
        authMethod: 'pat',
        patKey: 'test-pat',
      };
      expect(utils.validateConnectionConfig(config)).toEqual([]);
    });

    it('should return errors for invalid config', () => {
      const config: ProjectConnection = {
        id: '',
        organization: '',
        project: '',
        authMethod: 'pat',
      };
      const errors = utils.validateConnectionConfig(config);
      expect(errors).toContain('Connection ID is required');
      expect(errors).toContain('Organization is required');
      expect(errors).toContain('Project is required');
      expect(errors).toContain('PAT key is required for PAT authentication');
    });
  });

  describe('createConnectionLabel', () => {
    it('should return custom label when provided', () => {
      const config: ProjectConnection = {
        id: 'test-id',
        label: 'Custom Label',
        organization: 'test-org',
        project: 'test-project',
      };
      expect(utils.createConnectionLabel(config)).toBe('Custom Label');
    });

    it('should create label from organization/project when no custom label', () => {
      const config: ProjectConnection = {
        id: 'test-id',
        organization: 'test-org',
        project: 'test-project',
      };
      expect(utils.createConnectionLabel(config)).toBe('test-org/test-project');
    });
  });
});

describe('Connection Machine', () => {
  it('should start in disconnected state', () => {
    const machine = connectionMachine;
    const snapshot = machine.getInitialSnapshot();
    expect(snapshot.value).toBe('disconnected');
  });

  it('should transition to authenticating on CONNECT event', () => {
    const machine = connectionMachine;
    const snapshot = machine.getInitialSnapshot();

    const nextSnapshot = machine.transition(snapshot, {
      type: 'CONNECT',
      config: {
        id: 'test-connection',
        organization: 'test-org',
        project: 'test-project',
        authMethod: 'pat',
      },
    });

    expect(nextSnapshot.value).toBe('authenticating');
  });
});
