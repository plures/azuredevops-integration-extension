/**
 * Cloud Relay Types
 *
 * Type definitions for Praxis Cloud Relay service.
 */

import type { PraxisFact, PraxisEvent } from '../core/protocol.js';

/**
 * Cloud relay configuration
 */
export interface CloudRelayConfig {
  /**
   * Azure Function App endpoint URL
   */
  endpoint: string;

  /**
   * GitHub OAuth token for authentication
   */
  authToken?: string;

  /**
   * Application identifier
   */
  appId: string;

  /**
   * Enable automatic sync
   */
  autoSync?: boolean;

  /**
   * Sync interval in milliseconds (default: 5000)
   */
  syncInterval?: number;

  /**
   * Enable encryption for blob storage
   */
  encryption?: boolean;
}

/**
 * Relay connection status
 */
export interface RelayStatus {
  connected: boolean;
  lastSync?: number;
  endpoint: string;
  appId: string;
}

/**
 * CRDT sync message
 */
export interface CRDTSyncMessage {
  /**
   * Message type
   */
  type: 'sync' | 'delta' | 'snapshot';

  /**
   * Application identifier
   */
  appId: string;

  /**
   * Vector clock for causality tracking
   */
  clock: Record<string, number>;

  /**
   * Facts to sync
   */
  facts?: PraxisFact[];

  /**
   * Events to forward
   */
  events?: PraxisEvent[];

  /**
   * Timestamp
   */
  timestamp: number;
}

/**
 * Usage metrics
 */
export interface UsageMetrics {
  /**
   * Application identifier
   */
  appId: string;

  /**
   * Number of sync operations
   */
  syncCount: number;

  /**
   * Number of events forwarded
   */
  eventCount: number;

  /**
   * Number of facts synced
   */
  factCount: number;

  /**
   * Storage used in bytes
   */
  storageBytes: number;

  /**
   * Period start timestamp
   */
  periodStart: number;

  /**
   * Period end timestamp
   */
  periodEnd: number;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  version: string;
  services: {
    relay: boolean;
    eventGrid: boolean;
    storage: boolean;
    auth: boolean;
  };
}

/**
 * Cloud relay client interface
 */
export interface CloudRelayClient {
  /**
   * Connect to the relay
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the relay
   */
  disconnect(): Promise<void>;

  /**
   * Sync facts and events
   */
  sync(message: CRDTSyncMessage): Promise<void>;

  /**
   * Get usage metrics
   */
  getUsage(): Promise<UsageMetrics>;

  /**
   * Get health status
   */
  getHealth(): Promise<HealthCheckResponse>;

  /**
   * Get connection status
   */
  getStatus(): RelayStatus;
}

/**
 * GitHub OAuth user info
 */
export interface GitHubUser {
  id: number;
  login: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  token?: string;
  user?: GitHubUser;
  expiresAt?: number;
}
