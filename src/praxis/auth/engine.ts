/**
 * Praxis Authentication Engine
 *
 * Creates and configures the Praxis logic engine for authentication functionality.
 * This is the main entry point for the Praxis-based authentication implementation.
 */

import { createPraxisEngine, PraxisRegistry, type LogicEngine } from '@plures/praxis';
import type { PraxisAuthContext, PraxisAuthState, AuthMethod } from './types.js';
import {
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

/**
 * Authentication engine context - uses context for state management
 */
export interface AuthEngineContext {
  authState: PraxisAuthState;
  authData: PraxisAuthContext;
}

/**
 * Create a new Praxis authentication engine
 */
export function createAuthEngine(
  connectionId: string,
  authMethod: AuthMethod,
  initialConfig?: Partial<PraxisAuthContext>
): LogicEngine<AuthEngineContext> {
  const registry = new PraxisRegistry<AuthEngineContext>();

  // Register all authentication rules
  registry.registerRule(authenticateRule);
  registry.registerRule(authSuccessRule);
  registry.registerRule(authFailedRule);
  registry.registerRule(logoutRule);
  registry.registerRule(tokenExpiredRule);
  registry.registerRule(deviceCodeStartedRule);
  registry.registerRule(deviceCodeCompletedRule);
  registry.registerRule(retryAuthRule);
  registry.registerRule(resetAuthRule);

  return createPraxisEngine<AuthEngineContext>({
    initialContext: {
      authState: 'idle',
      authData: {
        connectionId,
        authMethod,
        retryCount: 0,
        ...initialConfig,
      },
    },
    registry,
    initialFacts: [],
  });
}
