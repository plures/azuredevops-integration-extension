/**
 * Module: src/features/connection/guards.ts
 * Owner: connection
 * Reads: (document)
 * Writes: (document)
 * Receives: (document)
 * Emits: (document)
 * Prohibitions: Do not mutate ApplicationContext directly; Do not define new *Context types
 * Rationale: (document)
 *
 * LLM-GUARD:
 * - Follow ownership boundaries; route events to Router; do not add UI logic here
 */
/**
 * Connection Guards
 *
 * Guard functions for the connection state machine.
 */

import { isTokenValid } from '../../fsm/functions/authFunctions.js';
import { createComponentLogger, FSMComponent } from '../../fsm/logging/FSMLogger.js';
import type { ConnectionContext, ConnectionEvent } from './types.js';

// Create logger for connection guards
const logger = createComponentLogger(FSMComponent.CONNECTION, 'connectionGuards');

/**
 * Checks if the connection should use Entra authentication
 */
export const isEntraAuth = ({ context }: { context: ConnectionContext }): boolean => {
  return context.authMethod === 'entra';
};

/**
 * Checks if the connection should use PAT authentication
 */
export const isPATAuth = ({ context }: { context: ConnectionContext }): boolean => {
  return context.authMethod === 'pat';
};

/**
 * Checks if the connection can retry after a failure
 */
export const canRetry = ({ context }: { context: ConnectionContext }): boolean => {
  return context.retryCount < 3;
};

/**
 * Checks if the token from an event is valid
 */
export const hasValidToken = ({ event }: { event: ConnectionEvent }): boolean => {
  const output = (event as any).output;
  const token = output?.token;
  const expiresAt = output?.expiresAt;

  if (!token) {
    logger.debug('Token validation: no token found');
    return false;
  }

  const valid = isTokenValid({ expiresAt });

  if (!valid) {
    logger.info('Token validation: cached token expired or near expiry');
    return false;
  }

  logger.debug(`Token validation: valid token found, length=${token.length}`);
  return true;
};

/**
 * Checks if interactive authentication should be forced
 */
export const shouldForceInteractiveAuth = ({
  context,
}: {
  context: ConnectionContext;
}): boolean => {
  return context.forceInteractive === true;
};
