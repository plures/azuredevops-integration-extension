/**
 * Cloud Relay Client
 *
 * Client for connecting to Praxis Cloud Relay service (Azure-based).
 */

import type {
  CloudRelayConfig,
  CloudRelayClient,
  RelayStatus,
  CRDTSyncMessage,
  UsageMetrics,
  HealthCheckResponse,
} from './types.js';

/**
 * Create a cloud relay client
 */
export function createCloudRelay(config: CloudRelayConfig): CloudRelayClient {
  let status: RelayStatus = {
    connected: false,
    endpoint: config.endpoint,
    appId: config.appId,
  };

  let syncTimer: NodeJS.Timeout | null = null;
  const vectorClock: Record<string, number> = {};

  return {
    async connect(): Promise<void> {
      // Validate endpoint
      if (!config.endpoint) {
        throw new Error('Cloud relay endpoint is required');
      }

      // Test connection
      try {
        const response = await fetch(`${config.endpoint}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(config.authToken && {
              Authorization: `Bearer ${config.authToken}`,
            }),
          },
        });

        if (!response.ok) {
          throw new Error(`Health check failed: ${response.statusText}`);
        }

        status.connected = true;
        status.lastSync = Date.now();

        // Start auto-sync if enabled
        if (config.autoSync) {
          const interval = config.syncInterval || 5000;
          syncTimer = setInterval(() => {
            // Auto-sync logic would go here
            // For now, just update lastSync
            status.lastSync = Date.now();
          }, interval);
        }
      } catch (error) {
        status.connected = false;
        throw new Error(
          `Failed to connect to cloud relay: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },

    async disconnect(): Promise<void> {
      if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
      }
      status.connected = false;
    },

    async sync(message: CRDTSyncMessage): Promise<void> {
      if (!status.connected) {
        throw new Error('Not connected to cloud relay');
      }

      // Update vector clock
      vectorClock[config.appId] = (vectorClock[config.appId] || 0) + 1;
      message.clock = { ...vectorClock };

      try {
        const response = await fetch(`${config.endpoint}/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.authToken && {
              Authorization: `Bearer ${config.authToken}`,
            }),
          },
          body: JSON.stringify(message),
        });

        if (!response.ok) {
          throw new Error(`Sync failed: ${response.statusText}`);
        }

        status.lastSync = Date.now();

        // Merge received vector clock
        const result = (await response.json()) as any;
        if (result.clock) {
          Object.entries(result.clock).forEach(([key, value]) => {
            vectorClock[key] = Math.max(vectorClock[key] || 0, value as number);
          });
        }
      } catch (error) {
        throw new Error(
          `Failed to sync: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },

    async getUsage(): Promise<UsageMetrics> {
      if (!status.connected) {
        throw new Error('Not connected to cloud relay');
      }

      try {
        const response = await fetch(`${config.endpoint}/usage?appId=${config.appId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(config.authToken && {
              Authorization: `Bearer ${config.authToken}`,
            }),
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to get usage: ${response.statusText}`);
        }

        return (await response.json()) as UsageMetrics;
      } catch (error) {
        throw new Error(
          `Failed to get usage metrics: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },

    async getHealth(): Promise<HealthCheckResponse> {
      try {
        const response = await fetch(`${config.endpoint}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Health check failed: ${response.statusText}`);
        }

        return (await response.json()) as HealthCheckResponse;
      } catch (error) {
        throw new Error(
          `Failed to get health status: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },

    getStatus(): RelayStatus {
      return { ...status };
    },
  };
}

/**
 * Connect to Praxis Cloud Relay
 *
 * @param endpoint - Azure Function App endpoint URL
 * @param options - Additional configuration options
 * @returns Cloud relay client instance
 *
 * @example
 * ```typescript
 * import { connectRelay } from "@plures/praxis/cloud";
 *
 * const relay = await connectRelay("https://my-app.azurewebsites.net", {
 *   appId: "my-app",
 *   authToken: "github-token",
 *   autoSync: true
 * });
 *
 * // Sync data
 * await relay.sync({
 *   type: "delta",
 *   appId: "my-app",
 *   clock: {},
 *   facts: [...],
 *   timestamp: Date.now()
 * });
 * ```
 */
export async function connectRelay(
  endpoint: string,
  options: Omit<CloudRelayConfig, 'endpoint'> = { appId: 'default' }
): Promise<CloudRelayClient> {
  const config: CloudRelayConfig = {
    endpoint,
    ...options,
  };

  const client = createCloudRelay(config);
  await client.connect();
  return client;
}
