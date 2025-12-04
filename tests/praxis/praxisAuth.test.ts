/**
 * Praxis Authentication Tests
 *
 * Tests for the Praxis-based authentication implementation.
 * These tests mirror the existing XState auth tests for compatibility validation.
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { PraxisAuthManager } from '../../src/praxis/auth/manager.js';

describe('Praxis Authentication Manager', () => {
  let authManager: PraxisAuthManager;

  beforeEach(() => {
    authManager = new PraxisAuthManager('test-connection', 'pat');
    authManager.start();
  });

  afterEach(() => {
    authManager.stop();
  });

  describe('Basic Auth Operations', () => {
    it('should start in idle state', () => {
      const status = authManager.getStatus();
      expect(status.authState).toBe('idle');
      expect(status.isStarted).toBe(true);
    });

    it('should initiate authentication', () => {
      const result = authManager.authenticate();
      expect(result).toBe(true);

      const status = authManager.getStatus();
      expect(status.authState).toBe('authenticating');
      expect(status.authContext.connectionId).toBe('test-connection');
    });

    it('should handle successful authentication', () => {
      authManager.authenticate();
      const result = authManager.authSuccess('test-token-123', Date.now() + 3600000);

      expect(result).toBe(true);
      expect(authManager.isAuthenticated()).toBe(true);
      expect(authManager.getToken()).toBe('test-token-123');
    });

    it('should handle failed authentication', () => {
      authManager.authenticate();
      const result = authManager.authFailed('Authentication failed');

      expect(result).toBe(true);
      expect(authManager.getAuthState()).toBe('failed');
      expect(authManager.getAuthData().error).toBe('Authentication failed');
    });

    it('should not authenticate when already authenticated', () => {
      authManager.authenticate();
      authManager.authSuccess('test-token');

      const result = authManager.authenticate();
      expect(result).toBe(false);
      expect(authManager.getAuthState()).toBe('authenticated');
    });
  });

  describe('Logout', () => {
    it('should logout successfully', () => {
      authManager.authenticate();
      authManager.authSuccess('test-token');

      const result = authManager.logout();
      expect(result).toBe(true);
      expect(authManager.getAuthState()).toBe('idle');
      expect(authManager.getToken()).toBeUndefined();
    });

    it('should not logout when not authenticated', () => {
      const result = authManager.logout();
      expect(result).toBe(false);
    });
  });

  describe('Token Expiration', () => {
    it('should handle token expiration', () => {
      authManager.authenticate();
      authManager.authSuccess('test-token');

      const result = authManager.tokenExpired();
      expect(result).toBe(true);
      expect(authManager.getAuthState()).toBe('failed');
      expect(authManager.getAuthData().error).toBe('Token expired');
    });

    it('should validate token with future expiry', () => {
      authManager.authenticate();
      const futureExpiry = Date.now() + 3600000; // 1 hour from now
      authManager.authSuccess('test-token', futureExpiry);

      expect(authManager.isTokenValid()).toBe(true);
    });

    it('should invalidate token with past expiry', () => {
      authManager.authenticate();
      const pastExpiry = Date.now() - 1000; // 1 second ago
      authManager.authSuccess('test-token', pastExpiry);

      expect(authManager.isTokenValid()).toBe(false);
    });

    it('should consider token without expiry as valid', () => {
      authManager.authenticate();
      authManager.authSuccess('test-token'); // No expiry

      expect(authManager.isTokenValid()).toBe(true);
    });
  });

  describe('Device Code Flow', () => {
    it('should handle device code started', () => {
      authManager.authenticate();
      const result = authManager.deviceCodeStarted(
        'ABC123',
        'https://microsoft.com/devicelogin',
        600
      );

      expect(result).toBe(true);
      expect(authManager.hasDeviceCodeSession()).toBe(true);

      const authData = authManager.getAuthData();
      expect(authData.deviceCodeSession?.userCode).toBe('ABC123');
      expect(authData.deviceCodeSession?.verificationUri).toBe('https://microsoft.com/devicelogin');
    });

    it('should handle device code completed', () => {
      authManager.authenticate();
      authManager.deviceCodeStarted('ABC123', 'https://microsoft.com/devicelogin', 600);

      const result = authManager.deviceCodeCompleted('entra-token', Date.now() + 3600000);

      expect(result).toBe(true);
      expect(authManager.isAuthenticated()).toBe(true);
      expect(authManager.getToken()).toBe('entra-token');
      expect(authManager.hasDeviceCodeSession()).toBe(false);
    });

    it('should not start device code when not authenticating', () => {
      const result = authManager.deviceCodeStarted(
        'ABC123',
        'https://microsoft.com/devicelogin',
        600
      );
      expect(result).toBe(false);
    });
  });

  describe('Retry Logic', () => {
    it('should retry authentication after failure', () => {
      authManager.authenticate();
      authManager.authFailed('First attempt failed');

      const result = authManager.retry();
      expect(result).toBe(true);
      expect(authManager.getAuthState()).toBe('authenticating');
    });

    it('should not retry when not in failed state', () => {
      authManager.authenticate();
      authManager.authSuccess('test-token');

      const result = authManager.retry();
      expect(result).toBe(false);
    });

    it('should track retry count', () => {
      authManager.authenticate();
      authManager.authFailed('First attempt failed');
      expect(authManager.getAuthData().retryCount).toBe(1);

      authManager.retry();
      authManager.authFailed('Second attempt failed');
      expect(authManager.getAuthData().retryCount).toBe(2);

      authManager.retry();
      authManager.authFailed('Third attempt failed');
      expect(authManager.getAuthData().retryCount).toBe(3);

      // Should not retry after max retries
      const result = authManager.retry();
      expect(result).toBe(false);
    });
  });

  describe('Reset', () => {
    it('should reset to idle state', () => {
      authManager.authenticate();
      authManager.authFailed('Some error');

      authManager.reset();
      expect(authManager.getAuthState()).toBe('idle');
      expect(authManager.getAuthData().error).toBeUndefined();
      expect(authManager.getAuthData().retryCount).toBe(0);
    });

    it('should reset from authenticated state', () => {
      authManager.authenticate();
      authManager.authSuccess('test-token');

      authManager.reset();
      expect(authManager.getAuthState()).toBe('idle');
      expect(authManager.getToken()).toBeUndefined();
    });
  });

  describe('Snapshot', () => {
    it('should return correct snapshot when idle', () => {
      const snapshot = authManager.getSnapshot();

      expect(snapshot.state).toBe('idle');
      expect(snapshot.connectionId).toBe('test-connection');
      expect(snapshot.authMethod).toBe('pat');
      expect(snapshot.isAuthenticated).toBe(false);
      expect(snapshot.hasToken).toBe(false);
    });

    it('should return correct snapshot when authenticated', () => {
      authManager.authenticate();
      authManager.authSuccess('test-token');

      const snapshot = authManager.getSnapshot();

      expect(snapshot.state).toBe('authenticated');
      expect(snapshot.isAuthenticated).toBe(true);
      expect(snapshot.hasToken).toBe(true);
    });

    it('should return correct snapshot when failed', () => {
      authManager.authenticate();
      authManager.authFailed('Auth error');

      const snapshot = authManager.getSnapshot();

      expect(snapshot.state).toBe('failed');
      expect(snapshot.isAuthenticated).toBe(false);
      expect(snapshot.error).toBe('Auth error');
    });
  });

  describe('Error Handling', () => {
    it('should handle operations on stopped manager gracefully', () => {
      authManager.stop();

      expect(authManager.authenticate()).toBe(false);
      expect(authManager.authSuccess('token')).toBe(false);
      expect(authManager.authFailed('error')).toBe(false);
      expect(authManager.logout()).toBe(false);
      expect(authManager.retry()).toBe(false);
    });

    it('should not fail authentication when already authenticating', () => {
      authManager.authenticate();
      const result = authManager.authenticate();
      expect(result).toBe(false);
    });
  });

  describe('Entra Authentication', () => {
    it('should create manager with entra auth method', () => {
      const entraManager = new PraxisAuthManager('entra-connection', 'entra', {
        tenantId: 'test-tenant',
        clientId: 'test-client',
      });
      entraManager.start();

      const authData = entraManager.getAuthData();
      expect(authData.authMethod).toBe('entra');
      expect(authData.tenantId).toBe('test-tenant');
      expect(authData.clientId).toBe('test-client');

      entraManager.stop();
    });

    it('should pass tenant and client info when authenticating', () => {
      const entraManager = new PraxisAuthManager('entra-connection', 'entra');
      entraManager.start();

      entraManager.authenticate({
        tenantId: 'organizations',
        clientId: '872cd9fa-d31f-45e0-9eab-6e460a02d1f1',
      });

      const authData = entraManager.getAuthData();
      expect(authData.tenantId).toBe('organizations');
      expect(authData.clientId).toBe('872cd9fa-d31f-45e0-9eab-6e460a02d1f1');

      entraManager.stop();
    });
  });
});

describe('Praxis Auth Engine Direct Tests', () => {
  it('should work with createAuthEngine', async () => {
    const { createAuthEngine } = await import('../../src/praxis/auth/engine.js');
    const { AuthenticateEvent, AuthSuccessEvent } = await import('../../src/praxis/auth/facts.js');

    const engine = createAuthEngine('test-connection', 'pat');

    // Initial state should be idle
    expect(engine.getContext().authState).toBe('idle');

    // Authenticate
    engine.step([
      AuthenticateEvent.create({
        connectionId: 'test-connection',
        authMethod: 'pat',
      }),
    ]);

    expect(engine.getContext().authState).toBe('authenticating');

    // Auth success
    engine.step([AuthSuccessEvent.create({ token: 'direct-token' })]);

    expect(engine.getContext().authState).toBe('authenticated');
    expect(engine.getContext().authData.token).toBe('direct-token');
  });
});
