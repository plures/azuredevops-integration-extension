/**
 * Praxis Authentication Types
 *
 * Type definitions for the Praxis-based authentication implementation.
 * These types mirror the XState auth context and events for seamless migration.
 */

/**
 * Authentication state values
 */
export type PraxisAuthState = 'idle' | 'authenticating' | 'authenticated' | 'failed';

/**
 * Authentication method type
 */
export type AuthMethod = 'pat' | 'entra';

/**
 * Authentication context - the source of truth for authentication state
 */
export interface PraxisAuthContext {
  connectionId: string;
  authMethod: AuthMethod;
  token?: string;
  expiresAt?: number;
  error?: string;
  retryCount: number;
  lastAuthAttempt?: number;
  // Additional fields for Entra authentication
  tenantId?: string;
  clientId?: string;
  // Device code flow state
  deviceCodeSession?: {
    userCode: string;
    verificationUri: string;
    expiresInSeconds: number;
    startedAt: number;
  };
}

/**
 * Authentication result - returned after authentication attempt
 */
export interface PraxisAuthResult {
  success: boolean;
  token?: string;
  expiresAt?: number;
  error?: string;
}

/**
 * Authentication snapshot for external consumption
 */
export interface PraxisAuthSnapshot {
  state: PraxisAuthState;
  connectionId: string;
  authMethod: AuthMethod;
  isAuthenticated: boolean;
  hasToken: boolean;
  error?: string;
  lastAuthAttempt?: number;
}

/**
 * Default authentication configuration
 */
export const DEFAULT_AUTH_CONFIG = {
  maxRetryCount: 3,
  retryDelayMs: 1000,
} as const;
