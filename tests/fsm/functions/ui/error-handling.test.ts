/**
 * Unit Tests for Error Handling Functions
 *
 * Tests error detection, classification, and UI state updates.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectErrorType,
  updateUIStateForError,
  updateRefreshStatus,
  clearErrorState,
  type DetectedError,
} from '../../../../src/fsm/functions/ui/error-handling.js';
import type { ApplicationContext } from '../../../../src/fsm/machines/applicationMachine.js';

describe('Error Handling Functions', () => {
  describe('detectErrorType', () => {
    describe('Status Code Detection', () => {
      it('should detect authentication error from 401 status code', () => {
        const result = detectErrorType('Some error', 401);
        expect(result.type).toBe('authentication');
        expect(result.recoverable).toBe(true);
        expect(result.message).toContain('credentials');
        expect(result.suggestedAction).toBe('Re-authenticate');
      });

      it('should detect authorization error from 403 status code', () => {
        const result = detectErrorType('Forbidden', 403);
        expect(result.type).toBe('authorization');
        expect(result.recoverable).toBe(true);
        expect(result.message).toContain('permission');
        expect(result.suggestedAction).toBe('Check Permissions');
      });

      it('should detect server error from 404 status code', () => {
        const result = detectErrorType('Not found', 404);
        expect(result.type).toBe('server');
        expect(result.recoverable).toBe(false);
        expect(result.message).toContain('not found');
        expect(result.suggestedAction).toBe('Refresh');
      });

      it('should detect server error from 500+ status codes', () => {
        const result500 = detectErrorType('Error', 500);
        expect(result500.type).toBe('server');
        expect(result500.recoverable).toBe(true);

        const result502 = detectErrorType('Error', 502);
        expect(result502.type).toBe('server');
        expect(result502.recoverable).toBe(true);

        const result503 = detectErrorType('Error', 503);
        expect(result503.type).toBe('server');
        expect(result503.recoverable).toBe(true);
      });

      it('should detect network error from timeout status codes', () => {
        const result408 = detectErrorType('Timeout', 408);
        expect(result408.type).toBe('network');
        expect(result408.recoverable).toBe(true);
        expect(result408.message).toContain('timed out');

        const result504 = detectErrorType('Gateway timeout', 504);
        expect(result504.type).toBe('network');
        expect(result504.recoverable).toBe(true);
      });
    });

    describe('Error Message Pattern Detection', () => {
      it('should detect PAT expiration from error message', () => {
        const result = detectErrorType('Personal Access Token has expired');
        expect(result.type).toBe('authentication');
        expect(result.message).toContain('Personal Access Token');
        expect(result.suggestedAction).toBe('Update PAT');
      });

      it('should detect token expiration from error message', () => {
        const result = detectErrorType('Token expired');
        expect(result.type).toBe('authentication');
        expect(result.recoverable).toBe(true);
      });

      it('should detect invalid token from error message', () => {
        const result = detectErrorType('Invalid token provided');
        expect(result.type).toBe('authentication');
        expect(result.recoverable).toBe(true);
      });

      it('should detect unauthorized from error message', () => {
        const result = detectErrorType('Unauthorized access');
        expect(result.type).toBe('authentication');
        expect(result.recoverable).toBe(true);
      });

      it('should detect authentication failed from error message', () => {
        const result = detectErrorType('Authentication failed');
        expect(result.type).toBe('authentication');
        expect(result.recoverable).toBe(true);
      });

      it('should detect 401 from error message string', () => {
        const result = detectErrorType('Error 401: Unauthorized');
        expect(result.type).toBe('authentication');
        expect(result.recoverable).toBe(true);
      });

      it('should detect authorization error from forbidden message', () => {
        const result = detectErrorType('Forbidden: Access denied');
        expect(result.type).toBe('authorization');
        expect(result.recoverable).toBe(true);
        expect(result.message).toContain('permission');
      });

      it('should detect authorization error from permission message', () => {
        const result = detectErrorType('You do not have permission');
        expect(result.type).toBe('authorization');
        expect(result.recoverable).toBe(true);
      });

      it('should detect authorization error from 403 in message', () => {
        const result = detectErrorType('Error 403: Forbidden');
        expect(result.type).toBe('authorization');
        expect(result.recoverable).toBe(true);
      });

      it('should detect network error from network-related messages', () => {
        const networkMessages = [
          'Network error occurred',
          'Connection timeout',
          'Fetch failed',
          'ECONNREFUSED',
          'ENOTFOUND',
        ];

        networkMessages.forEach((msg) => {
          const result = detectErrorType(msg);
          expect(result.type).toBe('network');
          expect(result.recoverable).toBe(true);
          expect(result.message).toContain('Network');
        });
      });

      it('should detect server error from server-related messages', () => {
        const serverMessages = [
          'Server error 500',
          'Error 502: Bad Gateway',
          'Service unavailable 503',
        ];

        serverMessages.forEach((msg) => {
          const result = detectErrorType(msg);
          expect(result.type).toBe('server');
          expect(result.recoverable).toBe(true);
        });
      });

      it('should default to unknown for unrecognized errors', () => {
        const result = detectErrorType('Some random error message');
        expect(result.type).toBe('unknown');
        expect(result.recoverable).toBe(false);
        expect(result.message).toBe('Some random error message');
        expect(result.suggestedAction).toBe('Retry');
      });

      it('should handle empty error message', () => {
        const result = detectErrorType('');
        expect(result.type).toBe('unknown');
        expect(result.message).toBe('An unexpected error occurred.');
      });
    });

    describe('Error Object Handling', () => {
      it('should extract message from Error object', () => {
        const error = new Error('Token expired');
        const result = detectErrorType(error);
        expect(result.type).toBe('authentication');
        expect(result.message).toContain('Personal Access Token');
      });

      it('should handle Error objects with status codes', () => {
        const error = new Error('Unauthorized');
        const result = detectErrorType(error, 401);
        expect(result.type).toBe('authentication');
        // Status code takes precedence
        expect(result.message).toContain('credentials');
      });
    });

    describe('Priority: Status Code over Message', () => {
      it('should prioritize status code over error message', () => {
        // Message suggests network, but status code is 401
        const result = detectErrorType('Network timeout', 401);
        expect(result.type).toBe('authentication'); // Status code wins
        expect(result.message).toContain('credentials'); // From status code handler
      });
    });
  });

  describe('updateUIStateForError', () => {
    let mockContext: ApplicationContext;

    beforeEach(() => {
      mockContext = {
        isActivated: true,
        isDeactivating: false,
        connections: [],
        connectionStates: new Map(),
        pendingAuthReminders: new Map(),
        connectionActors: new Map(),
        authActors: new Map(),
        errorRecoveryAttempts: 0,
        viewMode: 'list',
      };
    });

    it('should update UI state with error information', () => {
      const result = updateUIStateForError(mockContext, {
        message: 'Token expired',
        type: 'authentication',
        connectionId: 'conn-1',
      });

      expect(result.connectionHealth).toBeDefined();
      expect(result.connectionHealth?.status).toBe('error');
      expect(result.connectionHealth?.lastFailure).toBeGreaterThan(0);
      expect(result.connectionHealth?.lastError).toBeDefined();
      expect(result.connectionHealth?.lastError?.type).toBe('authentication');
      expect(result.connectionHealth?.lastError?.recoverable).toBe(true);
      expect(result.statusMessage).toBeDefined();
      expect(result.statusMessage?.type).toBe('error');
      expect(result.statusMessage?.text).toContain('Personal Access Token');
    });

    it('should preserve lastSuccess if connection was previously healthy', () => {
      const previousSuccessTime = Date.now() - 10000;
      mockContext.ui = {
        connectionHealth: {
          status: 'healthy',
          lastSuccess: previousSuccessTime,
        },
      };

      const result = updateUIStateForError(mockContext, {
        message: 'Network error',
        type: 'network',
        connectionId: 'conn-1',
      });

      expect(result.connectionHealth?.lastSuccess).toBe(previousSuccessTime);
      expect(result.connectionHealth?.lastFailure).toBeGreaterThan(previousSuccessTime);
    });

    it('should not preserve lastSuccess if connection was not healthy', () => {
      mockContext.ui = {
        connectionHealth: {
          status: 'error',
          lastFailure: Date.now() - 5000,
        },
      };

      const result = updateUIStateForError(mockContext, {
        message: 'New error',
        type: 'authentication',
        connectionId: 'conn-1',
      });

      expect(result.connectionHealth?.lastSuccess).toBeUndefined();
    });

    it('should detect error type from message automatically', () => {
      const result = updateUIStateForError(mockContext, {
        message: '401 Unauthorized',
        type: 'authentication', // Type is provided but detectErrorType will refine it
        connectionId: 'conn-1',
      });

      expect(result.connectionHealth?.lastError?.type).toBe('authentication');
      expect(result.connectionHealth?.lastError?.suggestedAction).toBe('Re-authenticate');
    });
  });

  describe('updateRefreshStatus', () => {
    it('should create refresh status for successful refresh', () => {
      const result = updateRefreshStatus(true);
      expect(result.refreshStatus).toBeDefined();
      expect(result.refreshStatus?.success).toBe(true);
      expect(result.refreshStatus?.lastAttempt).toBeGreaterThan(0);
      expect(result.refreshStatus?.error).toBeUndefined();
    });

    it('should create refresh status for failed refresh with error message', () => {
      const result = updateRefreshStatus(false, 'Network timeout');
      expect(result.refreshStatus).toBeDefined();
      expect(result.refreshStatus?.success).toBe(false);
      expect(result.refreshStatus?.error).toBe('Network timeout');
      expect(result.refreshStatus?.lastAttempt).toBeGreaterThan(0);
    });

    it('should include nextAutoRefresh timestamp when provided', () => {
      const nextRefresh = Date.now() + 300000; // 5 minutes
      const result = updateRefreshStatus(true, undefined, nextRefresh);
      expect(result.refreshStatus?.nextAutoRefresh).toBe(nextRefresh);
    });

    it('should set lastAttempt to current timestamp', () => {
      const before = Date.now();
      const result = updateRefreshStatus(true);
      const after = Date.now();

      expect(result.refreshStatus?.lastAttempt).toBeGreaterThanOrEqual(before);
      expect(result.refreshStatus?.lastAttempt).toBeLessThanOrEqual(after);
    });
  });

  describe('clearErrorState', () => {
    it('should clear error state and set status to healthy', () => {
      const result = clearErrorState();
      expect(result.connectionHealth).toBeDefined();
      expect(result.connectionHealth?.status).toBe('healthy');
      expect(result.connectionHealth?.lastSuccess).toBeGreaterThan(0);
      expect(result.connectionHealth?.lastFailure).toBeUndefined();
      expect(result.connectionHealth?.lastError).toBeUndefined();
      expect(result.statusMessage).toBeUndefined();
    });

    it('should set lastSuccess to current timestamp', () => {
      const before = Date.now();
      const result = clearErrorState();
      const after = Date.now();

      expect(result.connectionHealth?.lastSuccess).toBeGreaterThanOrEqual(before);
      expect(result.connectionHealth?.lastSuccess).toBeLessThanOrEqual(after);
    });
  });
});
