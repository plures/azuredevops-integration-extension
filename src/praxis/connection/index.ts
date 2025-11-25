/**
 * Praxis Connection Module
 *
 * Exports the Praxis-based connection implementation.
 */

// Types
export type {
  PraxisConnectionContext,
  PraxisConnectionState,
  PraxisConnectionResult,
  PraxisConnectionSnapshot,
  ProjectConnection,
} from './types.js';
export { DEFAULT_CONNECTION_CONFIG } from './types.js';

// Facts and Events
export {
  ConnectionStateFact,
  ConnectionDataFact,
  ConnectionEstablishedFact,
  ConnectionFailedFact,
  ConnectEvent,
  DisconnectEvent,
  AuthenticatedEvent,
  AuthConnectionFailedEvent,
  ClientCreatedEvent,
  ClientFailedEvent,
  ProviderCreatedEvent,
  ProviderFailedEvent,
  ConnectionErrorEvent,
  TokenExpiredConnectionEvent,
  RefreshAuthEvent,
  TokenRefreshedEvent,
  TokenRefreshFailedEvent,
  RetryConnectionEvent,
  ResetConnectionEvent,
} from './facts.js';

// Rules
export {
  connectRule,
  disconnectRule,
  authenticatedRule,
  authConnectionFailedRule,
  clientCreatedRule,
  clientFailedRule,
  providerCreatedRule,
  providerFailedRule,
  connectionErrorRule,
  tokenExpiredConnectionRule,
  refreshAuthRule,
  tokenRefreshedRule,
  tokenRefreshFailedRule,
  retryConnectionRule,
  resetConnectionRule,
} from './rules.js';

// Engine
export { createConnectionEngine, type ConnectionEngineContext } from './engine.js';

// Manager
export { PraxisConnectionManager } from './manager.js';
