/**
 * Praxis Authentication Module
 *
 * Exports the Praxis-based authentication implementation.
 */

// Types
export type {
  PraxisAuthContext,
  PraxisAuthState,
  PraxisAuthResult,
  PraxisAuthSnapshot,
  AuthMethod,
} from './types.js';
export { DEFAULT_AUTH_CONFIG } from './types.js';

// Facts and Events
export {
  AuthStateFact,
  AuthDataFact,
  AuthenticatedFact,
  AuthFailedFact,
  TokenExpiredFact,
  AuthenticateEvent,
  AuthSuccessEvent,
  AuthFailedEvent,
  LogoutEvent,
  TokenRefreshEvent,
  TokenExpiredEvent,
  DeviceCodeStartedEvent,
  DeviceCodeCompletedEvent,
  RetryAuthEvent,
  ResetAuthEvent,
} from './facts.js';

// Rules
export {
  authenticateRule,
  authSuccessRule,
  authFailedRule,
  logoutRule,
  tokenExpiredRule,
  deviceCodeStartedRule,
  deviceCodeCompletedRule,
  retryAuthRule,
  resetAuthRule,
} from './rules.js';

// Engine
export { createAuthEngine, type AuthEngineContext } from './engine.js';

// Manager
export { PraxisAuthManager } from './manager.js';
