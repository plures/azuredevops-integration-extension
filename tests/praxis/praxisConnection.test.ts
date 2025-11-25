/**
 * Praxis Connection Tests - Core
 *
 * Core tests for the Praxis-based connection implementation.
 * Tests basic operations, authentication flow, client/provider creation, and disconnect.
 * See praxisConnectionAdvanced.test.ts for token refresh, retry, and snapshot tests.
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { PraxisConnectionManager } from '../../src/praxis/connection/manager';
import type { ProjectConnection } from '../../src/praxis/connection/types';

describe('Praxis Connection Manager - Core', () => {
  let connectionManager: PraxisConnectionManager;
  const testConfig: ProjectConnection = {
    id: 'test-connection',
    organization: 'test-org',
    project: 'test-project',
    authMethod: 'pat',
  };

  beforeEach(() => {
    connectionManager = new PraxisConnectionManager(testConfig);
    connectionManager.start();
  });

  afterEach(() => {
    connectionManager.stop();
  });

  describe('Basic Connection Operations', () => {
    it('should start in disconnected state', () => {
      const status = connectionManager.getStatus();
      expect(status.connectionState).toBe('disconnected');
      expect(status.isStarted).toBe(true);
    });

    it('should initiate connection', () => {
      const result = connectionManager.connect();
      expect(result).toBe(true);
      expect(connectionManager.getStatus().connectionState).toBe('authenticating');
    });

    it('should not connect when already connecting', () => {
      connectionManager.connect();
      expect(connectionManager.connect()).toBe(false);
    });
  });

  describe('Authentication Flow', () => {
    it('should transition to creating_client after authentication', () => {
      connectionManager.connect();
      const result = connectionManager.authenticated('test-token');
      expect(result).toBe(true);
      expect(connectionManager.getConnectionState()).toBe('creating_client');
    });

    it('should handle authentication failure', () => {
      connectionManager.connect();
      const result = connectionManager.authFailed('Auth error');
      expect(result).toBe(true);
      expect(connectionManager.getConnectionState()).toBe('auth_failed');
      expect(connectionManager.getConnectionData().lastError).toBe('Auth error');
    });

    it('should store credentials after authentication', () => {
      connectionManager.connect();
      const expiresAt = Date.now() + 3600000;
      connectionManager.authenticated('test-token', expiresAt);
      const data = connectionManager.getConnectionData();
      expect(data.credential).toBe('test-token');
      expect(data.accessToken).toBe('test-token');
      expect(data.accessTokenExpiresAt).toBe(expiresAt);
    });
  });

  describe('Client and Provider Creation', () => {
    it('should create client successfully', () => {
      connectionManager.connect();
      connectionManager.authenticated('test-token');
      const mockClient = { name: 'test-client' };
      const result = connectionManager.clientCreated(mockClient);
      expect(result).toBe(true);
      expect(connectionManager.getConnectionState()).toBe('creating_provider');
      expect(connectionManager.getConnectionData().client).toStrictEqual(mockClient);
    });

    it('should handle client creation failure', () => {
      connectionManager.connect();
      connectionManager.authenticated('test-token');
      const result = connectionManager.clientFailed('Client error');
      expect(result).toBe(true);
      expect(connectionManager.getConnectionState()).toBe('client_failed');
    });

    it('should create provider and become connected', () => {
      connectionManager.connect();
      connectionManager.authenticated('test-token');
      connectionManager.clientCreated({ name: 'test-client' });
      const mockProvider = { name: 'test-provider' };
      const result = connectionManager.providerCreated(mockProvider);
      expect(result).toBe(true);
      expect(connectionManager.isConnected()).toBe(true);
      expect(connectionManager.getConnectionData().provider).toStrictEqual(mockProvider);
    });

    it('should handle provider creation failure', () => {
      connectionManager.connect();
      connectionManager.authenticated('test-token');
      connectionManager.clientCreated({ name: 'test-client' });
      const result = connectionManager.providerFailed('Provider error');
      expect(result).toBe(true);
      expect(connectionManager.getConnectionState()).toBe('provider_failed');
    });
  });

  describe('Full Connection Flow', () => {
    it('should complete full connection flow', () => {
      connectionManager.connect();
      expect(connectionManager.getConnectionState()).toBe('authenticating');
      connectionManager.authenticated('test-token');
      expect(connectionManager.getConnectionState()).toBe('creating_client');
      connectionManager.clientCreated({ name: 'test-client' });
      expect(connectionManager.getConnectionState()).toBe('creating_provider');
      connectionManager.providerCreated({ name: 'test-provider' });
      expect(connectionManager.isConnected()).toBe(true);
      expect(connectionManager.getConnectionData().isConnected).toBe(true);
    });
  });

  describe('Disconnect', () => {
    it('should disconnect successfully', () => {
      connectionManager.connect();
      connectionManager.authenticated('test-token');
      connectionManager.clientCreated({ name: 'test-client' });
      connectionManager.providerCreated({ name: 'test-provider' });
      const result = connectionManager.disconnect();
      expect(result).toBe(true);
      expect(connectionManager.getConnectionState()).toBe('disconnected');
      expect(connectionManager.getConnectionData().isConnected).toBe(false);
      expect(connectionManager.getConnectionData().client).toBeUndefined();
      expect(connectionManager.getConnectionData().provider).toBeUndefined();
    });
  });

  describe('Token Expiration', () => {
    beforeEach(() => {
      connectionManager.connect();
      connectionManager.authenticated('test-token');
      connectionManager.clientCreated({ name: 'test-client' });
      connectionManager.providerCreated({ name: 'test-provider' });
    });

    it('should handle token expiration for PAT auth', () => {
      const result = connectionManager.tokenExpired();
      expect(result).toBe(true);
      expect(connectionManager.getConnectionState()).toBe('token_refresh');
    });

    it('should handle token expiration for Entra auth', () => {
      const entraConfig: ProjectConnection = {
        id: 'entra-connection',
        organization: 'test-org',
        project: 'test-project',
        authMethod: 'entra',
      };
      const entraManager = new PraxisConnectionManager(entraConfig);
      entraManager.start();
      entraManager.connect();
      entraManager.authenticated('test-token');
      entraManager.clientCreated({ name: 'test-client' });
      entraManager.providerCreated({ name: 'test-provider' });
      const result = entraManager.tokenExpired();
      expect(result).toBe(true);
      expect(entraManager.getConnectionState()).toBe('auth_failed');
      expect(entraManager.getConnectionData().lastError).toBe(
        'Session expired. Please sign in again.'
      );
      entraManager.stop();
    });
  });
});
