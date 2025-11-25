/**
 * Praxis Connection Engine
 *
 * Creates and configures the Praxis logic engine for connection functionality.
 * This is the main entry point for the Praxis-based connection implementation.
 */

import { createPraxisEngine, PraxisRegistry, type LogicEngine } from '@plures/praxis';
import type { PraxisConnectionContext, PraxisConnectionState, ProjectConnection } from './types.js';
import {
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

/**
 * Connection engine context - uses context for state management
 */
export interface ConnectionEngineContext {
  connectionState: PraxisConnectionState;
  connectionData: PraxisConnectionContext;
}

/**
 * Create a new Praxis connection engine
 */
export function createConnectionEngine(
  config: ProjectConnection,
  initialConfig?: Partial<PraxisConnectionContext>
): LogicEngine<ConnectionEngineContext> {
  const registry = new PraxisRegistry<ConnectionEngineContext>();

  // Register all connection rules
  registry.registerRule(connectRule);
  registry.registerRule(disconnectRule);
  registry.registerRule(authenticatedRule);
  registry.registerRule(authConnectionFailedRule);
  registry.registerRule(clientCreatedRule);
  registry.registerRule(clientFailedRule);
  registry.registerRule(providerCreatedRule);
  registry.registerRule(providerFailedRule);
  registry.registerRule(connectionErrorRule);
  registry.registerRule(tokenExpiredConnectionRule);
  registry.registerRule(refreshAuthRule);
  registry.registerRule(tokenRefreshedRule);
  registry.registerRule(tokenRefreshFailedRule);
  registry.registerRule(retryConnectionRule);
  registry.registerRule(resetConnectionRule);

  return createPraxisEngine<ConnectionEngineContext>({
    initialContext: {
      connectionState: 'disconnected',
      connectionData: {
        connectionId: config.id,
        config,
        authMethod: config.authMethod || 'pat',
        isConnected: false,
        retryCount: 0,
        refreshFailureCount: 0,
        reauthInProgress: false,
        forceInteractive: false,
        ...initialConfig,
      },
    },
    registry,
    initialFacts: [],
  });
}
