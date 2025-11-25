/**
 * Praxis Connection Facts and Events
 *
 * Defines the facts and events for the connection logic using Praxis DSL.
 * Facts represent the current state of the connection.
 * Events represent actions that can change the connection state.
 */

import { defineFact, defineEvent } from '@plures/praxis';
import type { PraxisConnectionState, PraxisConnectionContext, ProjectConnection } from './types.js';

// ============================================================================
// Facts - Propositions about the connection domain
// ============================================================================

/**
 * ConnectionState fact - represents the current connection state
 */
export const ConnectionStateFact = defineFact<'ConnectionState', PraxisConnectionState>(
  'ConnectionState'
);

/**
 * ConnectionData fact - represents the connection context data
 */
export const ConnectionDataFact = defineFact<'ConnectionData', PraxisConnectionContext>(
  'ConnectionData'
);

/**
 * ConnectionEstablished fact - indicates connection was successful
 */
export const ConnectionEstablishedFact = defineFact<
  'ConnectionEstablished',
  { connectionId: string; hasClient: boolean; hasProvider: boolean }
>('ConnectionEstablished');

/**
 * ConnectionFailed fact - indicates connection failed
 */
export const ConnectionFailedFact = defineFact<
  'ConnectionFailed',
  { connectionId: string; error: string }
>('ConnectionFailed');

// ============================================================================
// Events - Actions that drive connection state changes
// ============================================================================

/**
 * Connect event - initiates connection to Azure DevOps
 */
export const ConnectEvent = defineEvent<
  'CONNECT',
  {
    config: ProjectConnection;
    forceInteractive?: boolean;
  }
>('CONNECT');

/**
 * Disconnect event - disconnects from Azure DevOps
 */
export const DisconnectEvent = defineEvent<'DISCONNECT', Record<string, never>>('DISCONNECT');

/**
 * AuthenticatedEvent - authentication step completed
 */
export const AuthenticatedEvent = defineEvent<
  'AUTHENTICATED',
  {
    credential: string;
    expiresAt?: number;
  }
>('AUTHENTICATED');

/**
 * AuthFailedEvent - authentication step failed
 */
export const AuthConnectionFailedEvent = defineEvent<'AUTH_CONNECTION_FAILED', { error: string }>(
  'AUTH_CONNECTION_FAILED'
);

/**
 * ClientCreated event - Azure client created successfully
 */
export const ClientCreatedEvent = defineEvent<'CLIENT_CREATED', { client: unknown }>(
  'CLIENT_CREATED'
);

/**
 * ClientFailed event - Azure client creation failed
 */
export const ClientFailedEvent = defineEvent<'CLIENT_FAILED', { error: string }>('CLIENT_FAILED');

/**
 * ProviderCreated event - Work items provider created successfully
 */
export const ProviderCreatedEvent = defineEvent<'PROVIDER_CREATED', { provider: unknown }>(
  'PROVIDER_CREATED'
);

/**
 * ProviderFailed event - Provider creation failed
 */
export const ProviderFailedEvent = defineEvent<'PROVIDER_FAILED', { error: string }>(
  'PROVIDER_FAILED'
);

/**
 * ConnectionError event - general connection error
 */
export const ConnectionErrorEvent = defineEvent<'CONNECTION_ERROR', { error: string }>(
  'CONNECTION_ERROR'
);

/**
 * TokenExpired event - auth token has expired
 */
export const TokenExpiredConnectionEvent = defineEvent<'TOKEN_EXPIRED', Record<string, never>>(
  'TOKEN_EXPIRED'
);

/**
 * RefreshAuth event - refresh authentication token
 */
export const RefreshAuthEvent = defineEvent<'REFRESH_AUTH', Record<string, never>>('REFRESH_AUTH');

/**
 * TokenRefreshed event - token refresh successful
 */
export const TokenRefreshedEvent = defineEvent<
  'TOKEN_REFRESHED',
  { token: string; expiresAt?: number }
>('TOKEN_REFRESHED');

/**
 * TokenRefreshFailed event - token refresh failed
 */
export const TokenRefreshFailedEvent = defineEvent<'TOKEN_REFRESH_FAILED', { error: string }>(
  'TOKEN_REFRESH_FAILED'
);

/**
 * Retry event - retry connection after failure
 */
export const RetryConnectionEvent = defineEvent<'RETRY', Record<string, never>>('RETRY');

/**
 * Reset event - reset connection state
 */
export const ResetConnectionEvent = defineEvent<'RESET', Record<string, never>>('RESET');
