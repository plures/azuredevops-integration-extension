/**
 * Praxis Connection Types
 *
 * Type definitions for the Praxis-based connection implementation.
 * These types mirror the XState connection context and events for seamless migration.
 */

import type { AuthMethod } from '../auth/types.js';

/**
 * Connection state values
 */
export type PraxisConnectionState =
  | 'disconnected'
  | 'authenticating'
  | 'creating_client'
  | 'creating_provider'
  | 'connected'
  | 'auth_failed'
  | 'client_failed'
  | 'provider_failed'
  | 'connection_error'
  | 'token_refresh';

/**
 * Project connection configuration
 */
export interface ProjectConnection {
  id: string;
  organization: string;
  project: string;
  label?: string;
  team?: string;
  authMethod?: AuthMethod;
  patKey?: string;
  tenantId?: string;
  baseUrl?: string;
  apiBaseUrl?: string;
  identityName?: string;
}

/**
 * Connection context - the source of truth for connection state
 */
export interface PraxisConnectionContext {
  connectionId: string;
  config: ProjectConnection;
  authMethod: AuthMethod;
  isConnected: boolean;
  retryCount: number;
  refreshFailureCount: number;
  reauthInProgress: boolean;
  forceInteractive: boolean;

  // Authentication data
  credential?: string;
  pat?: string;
  accessToken?: string;
  accessTokenExpiresAt?: number;

  // Client and provider references (opaque in Praxis)
  client?: unknown;
  provider?: unknown;

  // Error tracking
  lastError?: string;
  lastRefreshFailure?: Date;
  refreshBackoffUntil?: Date;
}

/**
 * Connection result - returned after connection operations
 */
export interface PraxisConnectionResult {
  success: boolean;
  connectionId: string;
  isConnected: boolean;
  error?: string;
}

/**
 * Connection snapshot for external consumption
 */
export interface PraxisConnectionSnapshot {
  state: PraxisConnectionState;
  connectionId: string;
  isConnected: boolean;
  authMethod: AuthMethod;
  hasClient: boolean;
  hasProvider: boolean;
  error?: string;
  retryCount: number;
}

/**
 * Default connection configuration
 */
export const DEFAULT_CONNECTION_CONFIG = {
  maxRetryCount: 3,
  retryDelayMs: 1000,
  refreshBackoffMinutes: 5,
  maxRefreshBackoffMinutes: 60,
} as const;
