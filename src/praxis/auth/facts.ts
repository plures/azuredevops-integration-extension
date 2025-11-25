/**
 * Praxis Authentication Facts and Events
 *
 * Defines the facts and events for the authentication logic using Praxis DSL.
 * Facts represent the current state of authentication.
 * Events represent actions that can change the authentication state.
 */

import { defineFact, defineEvent } from '@plures/praxis';
import type { PraxisAuthState, PraxisAuthContext, AuthMethod } from './types.js';

// ============================================================================
// Facts - Propositions about the authentication domain
// ============================================================================

/**
 * AuthState fact - represents the current authentication state
 */
export const AuthStateFact = defineFact<'AuthState', PraxisAuthState>('AuthState');

/**
 * AuthData fact - represents the authentication context data
 */
export const AuthDataFact = defineFact<'AuthData', PraxisAuthContext>('AuthData');

/**
 * AuthenticatedFact - indicates authentication was successful
 */
export const AuthenticatedFact = defineFact<
  'Authenticated',
  { token: string; expiresAt?: number; connectionId: string }
>('Authenticated');

/**
 * AuthFailedFact - indicates authentication failed
 */
export const AuthFailedFact = defineFact<'AuthFailed', { error: string; connectionId: string }>(
  'AuthFailed'
);

/**
 * TokenExpiredFact - indicates the auth token has expired
 */
export const TokenExpiredFact = defineFact<'TokenExpired', { connectionId: string }>(
  'TokenExpired'
);

// ============================================================================
// Events - Actions that drive authentication state changes
// ============================================================================

/**
 * Authenticate event - initiates authentication for a connection
 */
export const AuthenticateEvent = defineEvent<
  'AUTHENTICATE',
  {
    connectionId: string;
    authMethod: AuthMethod;
    forceInteractive?: boolean;
    tenantId?: string;
    clientId?: string;
  }
>('AUTHENTICATE');

/**
 * AuthSuccess event - authentication completed successfully
 */
export const AuthSuccessEvent = defineEvent<'AUTH_SUCCESS', { token: string; expiresAt?: number }>(
  'AUTH_SUCCESS'
);

/**
 * AuthFailed event - authentication failed
 */
export const AuthFailedEvent = defineEvent<'AUTH_FAILED', { error: string }>('AUTH_FAILED');

/**
 * Logout event - clears authentication state
 */
export const LogoutEvent = defineEvent<'LOGOUT', Record<string, never>>('LOGOUT');

/**
 * TokenRefresh event - refreshes the authentication token
 */
export const TokenRefreshEvent = defineEvent<'TOKEN_REFRESH', Record<string, never>>(
  'TOKEN_REFRESH'
);

/**
 * TokenExpired event - token has expired and needs refresh
 */
export const TokenExpiredEvent = defineEvent<'TOKEN_EXPIRED', Record<string, never>>(
  'TOKEN_EXPIRED'
);

/**
 * DeviceCodeStarted event - device code flow has started
 */
export const DeviceCodeStartedEvent = defineEvent<
  'DEVICE_CODE_STARTED',
  {
    userCode: string;
    verificationUri: string;
    expiresInSeconds: number;
  }
>('DEVICE_CODE_STARTED');

/**
 * DeviceCodeCompleted event - device code flow completed
 */
export const DeviceCodeCompletedEvent = defineEvent<
  'DEVICE_CODE_COMPLETED',
  { token: string; expiresAt?: number }
>('DEVICE_CODE_COMPLETED');

/**
 * RetryAuth event - retry authentication after failure
 */
export const RetryAuthEvent = defineEvent<'RETRY_AUTH', Record<string, never>>('RETRY_AUTH');

/**
 * ResetAuth event - reset authentication state
 */
export const ResetAuthEvent = defineEvent<'RESET_AUTH', Record<string, never>>('RESET_AUTH');
