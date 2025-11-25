/**
 * Praxis Connection Advanced Tests
 *
 * Advanced tests for the Praxis-based connection implementation.
 * Tests token refresh, retry logic, snapshots, and engine direct tests.
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { PraxisConnectionManager } from '../../src/praxis/connection/manager';
import type { ProjectConnection } from '../../src/praxis/connection/types';

describe('Praxis Connection Manager - Advanced', () => {
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

  describe('Token Refresh', () => {
    beforeEach(() => {
      connectionManager.connect();
      connectionManager.authenticated('test-token');
      connectionManager.clientCreated({ name: 'test-client' });
      connectionManager.providerCreated({ name: 'test-provider' });
      connectionManager.tokenExpired(); // PAT goes to token_refresh
    });

    it('should handle successful token refresh', () => {
      const result = connectionManager.tokenRefreshed('new-token', Date.now() + 3600000);
      expect(result).toBe(true);
      expect(connectionManager.isConnected()).toBe(true);
      expect(connectionManager.getConnectionData().accessToken).toBe('new-token');
    });

    it('should handle failed token refresh', () => {
      const result = connectionManager.tokenRefreshFailed('Refresh failed');
      expect(result).toBe(true);
      expect(connectionManager.getConnectionState()).toBe('auth_failed');
      expect(connectionManager.getConnectionData().refreshFailureCount).toBe(1);
    });

    it('should apply exponential backoff on refresh failures', () => {
      connectionManager.tokenRefreshFailed('First failure');
      const data = connectionManager.getConnectionData();
      expect(data.refreshFailureCount).toBe(1);
      expect(data.refreshBackoffUntil).toBeDefined();
    });
  });

  describe('Retry Logic', () => {
    it('should retry connection after auth failure', () => {
      connectionManager.connect();
      connectionManager.authFailed('Auth error');
      const result = connectionManager.retry();
      expect(result).toBe(true);
      expect(connectionManager.getConnectionState()).toBe('authenticating');
    });

    it('should retry connection after client failure', () => {
      connectionManager.connect();
      connectionManager.authenticated('test-token');
      connectionManager.clientFailed('Client error');
      const result = connectionManager.retry();
      expect(result).toBe(true);
      expect(connectionManager.getConnectionState()).toBe('authenticating');
    });

    it('should track retry count and stop after max', () => {
      connectionManager.connect();
      connectionManager.authFailed('First attempt');
      expect(connectionManager.getConnectionData().retryCount).toBe(1);

      connectionManager.retry();
      connectionManager.authFailed('Second attempt');
      connectionManager.retry();
      connectionManager.authFailed('Third attempt');
      expect(connectionManager.getConnectionData().retryCount).toBe(3);

      const result = connectionManager.retry();
      expect(result).toBe(false);
    });
  });

  describe('Reset', () => {
    it('should reset to disconnected state', () => {
      connectionManager.connect();
      connectionManager.authFailed('Some error');
      connectionManager.reset();
      expect(connectionManager.getConnectionState()).toBe('disconnected');
      expect(connectionManager.getConnectionData().lastError).toBeUndefined();
      expect(connectionManager.getConnectionData().retryCount).toBe(0);
    });

    it('should reset from connected state', () => {
      connectionManager.connect();
      connectionManager.authenticated('test-token');
      connectionManager.clientCreated({ name: 'test-client' });
      connectionManager.providerCreated({ name: 'test-provider' });
      connectionManager.reset();
      expect(connectionManager.getConnectionState()).toBe('disconnected');
      expect(connectionManager.getConnectionData().client).toBeUndefined();
      expect(connectionManager.getConnectionData().provider).toBeUndefined();
    });
  });

  describe('Connection Error', () => {
    it('should handle connection error when connected', () => {
      connectionManager.connect();
      connectionManager.authenticated('test-token');
      connectionManager.clientCreated({ name: 'test-client' });
      connectionManager.providerCreated({ name: 'test-provider' });
      const result = connectionManager.connectionError('Network error');
      expect(result).toBe(true);
      expect(connectionManager.getConnectionState()).toBe('connection_error');
      expect(connectionManager.getConnectionData().isConnected).toBe(false);
    });

    it('should not handle connection error when not connected', () => {
      connectionManager.connect();
      const result = connectionManager.connectionError('Network error');
      expect(result).toBe(false);
    });
  });

  describe('Snapshot', () => {
    it('should return correct snapshot when disconnected', () => {
      const snapshot = connectionManager.getSnapshot();
      expect(snapshot.state).toBe('disconnected');
      expect(snapshot.connectionId).toBe('test-connection');
      expect(snapshot.isConnected).toBe(false);
    });

    it('should return correct snapshot when connected', () => {
      connectionManager.connect();
      connectionManager.authenticated('test-token');
      connectionManager.clientCreated({ name: 'test-client' });
      connectionManager.providerCreated({ name: 'test-provider' });
      const snapshot = connectionManager.getSnapshot();
      expect(snapshot.state).toBe('connected');
      expect(snapshot.isConnected).toBe(true);
      expect(snapshot.hasClient).toBe(true);
      expect(snapshot.hasProvider).toBe(true);
    });

    it('should return correct snapshot when failed', () => {
      connectionManager.connect();
      connectionManager.authFailed('Auth error');
      const snapshot = connectionManager.getSnapshot();
      expect(snapshot.state).toBe('auth_failed');
      expect(snapshot.error).toBe('Auth error');
      expect(snapshot.retryCount).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle operations on stopped manager gracefully', () => {
      connectionManager.stop();
      expect(connectionManager.connect()).toBe(false);
      expect(connectionManager.authenticated('token')).toBe(false);
      expect(connectionManager.retry()).toBe(false);
    });
  });

  describe('Helper Methods', () => {
    it('should correctly identify failed states', () => {
      expect(connectionManager.isFailed()).toBe(false);
      connectionManager.connect();
      connectionManager.authFailed('Error');
      expect(connectionManager.isFailed()).toBe(true);
    });

    it('should correctly identify authenticating state', () => {
      expect(connectionManager.isAuthenticating()).toBe(false);
      connectionManager.connect();
      expect(connectionManager.isAuthenticating()).toBe(true);
    });

    it('should get client and provider when connected', () => {
      expect(connectionManager.getClient()).toBeUndefined();
      expect(connectionManager.getProvider()).toBeUndefined();
      connectionManager.connect();
      connectionManager.authenticated('test-token');
      connectionManager.clientCreated({ name: 'test-client' });
      connectionManager.providerCreated({ name: 'test-provider' });
      expect(connectionManager.getClient()).toStrictEqual({ name: 'test-client' });
      expect(connectionManager.getProvider()).toStrictEqual({ name: 'test-provider' });
    });
  });
});

describe('Praxis Connection Engine Direct Tests', () => {
  it('should work with createConnectionEngine', async () => {
    const { createConnectionEngine } = await import('../../src/praxis/connection/engine');
    const { ConnectEvent, AuthenticatedEvent, ClientCreatedEvent, ProviderCreatedEvent } =
      await import('../../src/praxis/connection/facts');

    const config = { id: 'direct-test', organization: 'test-org', project: 'test-project' };
    const engine = createConnectionEngine(config);

    expect(engine.getContext().connectionState).toBe('disconnected');
    engine.step([ConnectEvent.create({ config })]);
    expect(engine.getContext().connectionState).toBe('authenticating');
    engine.step([AuthenticatedEvent.create({ credential: 'test-token' })]);
    expect(engine.getContext().connectionState).toBe('creating_client');
    engine.step([ClientCreatedEvent.create({ client: { name: 'test' } })]);
    expect(engine.getContext().connectionState).toBe('creating_provider');
    engine.step([ProviderCreatedEvent.create({ provider: { name: 'test' } })]);
    expect(engine.getContext().connectionState).toBe('connected');
    expect(engine.getContext().connectionData.isConnected).toBe(true);
  });
});
