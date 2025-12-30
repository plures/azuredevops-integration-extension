/**
 * Cloud Relay Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCloudRelay } from '../cloud/client.js';
import type { CloudRelayConfig, HealthCheckResponse, UsageMetrics } from '../cloud/types.js';

describe('Cloud Relay Client', () => {
  let config: CloudRelayConfig;

  beforeEach(() => {
    config = {
      endpoint: 'https://test.example.com',
      appId: 'test-app',
      authToken: 'test-token',
    };

    // Mock fetch globally
    global.fetch = vi.fn();
  });

  it('should create a cloud relay client', () => {
    const client = createCloudRelay(config);
    expect(client).toBeDefined();
    expect(client.getStatus).toBeDefined();
    expect(client.connect).toBeDefined();
    expect(client.disconnect).toBeDefined();
    expect(client.sync).toBeDefined();
    expect(client.getUsage).toBeDefined();
    expect(client.getHealth).toBeDefined();
  });

  it('should return initial status as disconnected', () => {
    const client = createCloudRelay(config);
    const status = client.getStatus();
    expect(status.connected).toBe(false);
    expect(status.endpoint).toBe(config.endpoint);
    expect(status.appId).toBe(config.appId);
  });

  it('should connect to relay successfully', async () => {
    const mockHealthResponse: HealthCheckResponse = {
      status: 'healthy',
      timestamp: Date.now(),
      version: '0.1.0',
      services: {
        relay: true,
        eventGrid: true,
        storage: true,
        auth: true,
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockHealthResponse,
    });

    const client = createCloudRelay(config);
    await client.connect();

    const status = client.getStatus();
    expect(status.connected).toBe(true);
    expect(status.lastSync).toBeDefined();
  });

  it('should throw error when connecting to unavailable endpoint', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: 'Service Unavailable',
    });

    const client = createCloudRelay(config);
    await expect(client.connect()).rejects.toThrow('Health check failed');
  });

  it('should sync facts and events', async () => {
    const mockHealthResponse: HealthCheckResponse = {
      status: 'healthy',
      timestamp: Date.now(),
      version: '0.1.0',
      services: {
        relay: true,
        eventGrid: true,
        storage: true,
        auth: true,
      },
    };

    const mockSyncResponse = {
      success: true,
      clock: { 'test-app': 1 },
      timestamp: Date.now(),
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockHealthResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSyncResponse,
      });

    const client = createCloudRelay(config);
    await client.connect();

    await client.sync({
      type: 'delta',
      appId: config.appId,
      clock: {},
      facts: [{ tag: 'TestFact', payload: { value: 42 } }],
      events: [],
      timestamp: Date.now(),
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should get usage metrics', async () => {
    const mockHealthResponse: HealthCheckResponse = {
      status: 'healthy',
      timestamp: Date.now(),
      version: '0.1.0',
      services: {
        relay: true,
        eventGrid: true,
        storage: true,
        auth: true,
      },
    };

    const mockUsageResponse: UsageMetrics = {
      appId: config.appId,
      syncCount: 10,
      eventCount: 50,
      factCount: 100,
      storageBytes: 1024,
      periodStart: Date.now() - 3600000,
      periodEnd: Date.now(),
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockHealthResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsageResponse,
      });

    const client = createCloudRelay(config);
    await client.connect();

    const usage = await client.getUsage();
    expect(usage.appId).toBe(config.appId);
    expect(usage.syncCount).toBe(10);
    expect(usage.eventCount).toBe(50);
  });

  it('should get health status', async () => {
    const mockHealthResponse: HealthCheckResponse = {
      status: 'healthy',
      timestamp: Date.now(),
      version: '0.1.0',
      services: {
        relay: true,
        eventGrid: true,
        storage: true,
        auth: true,
      },
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockHealthResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockHealthResponse,
      });

    const client = createCloudRelay(config);
    await client.connect();

    const health = await client.getHealth();
    expect(health.status).toBe('healthy');
    expect(health.services.relay).toBe(true);
  });

  it('should disconnect and clear auto-sync timer', async () => {
    const mockHealthResponse: HealthCheckResponse = {
      status: 'healthy',
      timestamp: Date.now(),
      version: '0.1.0',
      services: {
        relay: true,
        eventGrid: true,
        storage: true,
        auth: true,
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockHealthResponse,
    });

    config.autoSync = true;
    config.syncInterval = 1000;

    const client = createCloudRelay(config);
    await client.connect();

    const statusBefore = client.getStatus();
    expect(statusBefore.connected).toBe(true);

    await client.disconnect();

    const statusAfter = client.getStatus();
    expect(statusAfter.connected).toBe(false);
  });

  it('should throw error when syncing while disconnected', async () => {
    const client = createCloudRelay(config);

    await expect(
      client.sync({
        type: 'delta',
        appId: config.appId,
        clock: {},
        facts: [],
        events: [],
        timestamp: Date.now(),
      })
    ).rejects.toThrow('Not connected');
  });

  it('should throw error when getting usage while disconnected', async () => {
    const client = createCloudRelay(config);
    await expect(client.getUsage()).rejects.toThrow('Not connected');
  });
});
