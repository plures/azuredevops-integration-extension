import { describe, it, expect, vi } from 'vitest';
import { PraxisConnectionManager } from '../../src/praxis/connection/manager.js';
import type { ProjectConnection } from '../../src/praxis/connection/types.js';

// Mock dependencies
vi.mock('../../src/features/azure/client.js', () => ({
  createAzureClient: vi.fn().mockResolvedValue({
    client: { id: 'client-stub' },
    config: {},
    context: {},
  }),
}));

vi.mock('../../src/features/azure/provider.js', () => ({
  createWorkItemsProvider: vi.fn().mockResolvedValue({
    refresh: () => undefined,
  }),
}));

describe('PraxisConnectionManager', () => {
  it('stores client and provider instances when connection succeeds', async () => {
    const connection: ProjectConnection = {
      id: 'conn-1',
      organization: 'org',
      project: 'proj',
      authMethod: 'pat',
    };

    const manager = new PraxisConnectionManager(connection);
    manager.start();

    // Wait for connection to complete (it starts automatically on start())
    await new Promise<void>((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const snapshot = manager.getSnapshot();
        if (snapshot.state === 'connected') {
          resolve();
        } else if (snapshot.state.includes('failed') || snapshot.state === 'connection_error') {
          reject(new Error(`Connection failed with state: ${snapshot.state}`));
        } else if (Date.now() - start > 2000) {
          reject(new Error('Timeout waiting for connection'));
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });

    const ctx = manager.getConnectionData();
    expect(ctx.client).toBeDefined();
    expect((ctx.client as any).id).toBe('client-stub');
    expect(ctx.provider).toBeDefined();

    manager.stop();
  });
});
