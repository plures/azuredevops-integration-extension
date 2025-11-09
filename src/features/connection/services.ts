/**
 * Module: src/features/connection/services.ts
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
 * Connection Services
 *
 * Service implementations for the connection state machine.
 */

import { fromPromise } from 'xstate';
import { createComponentLogger, FSMComponent } from '../../fsm/logging/FSMLogger.js';
import {
  getExtensionContextRef,
  getSecretPAT as getSecretPATFromBridge,
} from '../../fsm/services/extensionHostBridge.js';
import type { ConnectionContext } from './types.js';

// Create logger for connection services
const logger = createComponentLogger(FSMComponent.CONNECTION, 'connectionServices');

/**
 * Authenticates with PAT (Personal Access Token)
 */
export const authenticateWithPAT = fromPromise(async ({ input }: { input: ConnectionContext }) => {
  logger.debug(`Authenticating with PAT for ${input.connectionId}`);

  try {
    const extensionContext = getExtensionContextRef();

    if (!extensionContext) {
      throw new Error('Extension context not available');
    }

    const credential = await getSecretPATFromBridge(extensionContext, input.connectionId);
    if (!credential) {
      throw new Error('PAT not found in secrets');
    }

    return { credential };
  } catch (error) {
    logger.error(
      `PAT authentication failed: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
});

/**
 * Checks for existing Entra token
 * Note: This is a simplified version - the full implementation is complex
 */
export const checkExistingEntraToken = fromPromise(
  async ({ input }: { input: ConnectionContext }) => {
    logger.debug(`Checking existing Entra token for ${input.connectionId}`);

    // Simplified implementation - return null to force interactive auth
    // The full implementation would check for cached tokens
    return { token: null };
  }
);

/**
 * Creates Azure DevOps client
 */
export const createAzureClient = fromPromise(async ({ input }: { input: ConnectionContext }) => {
  logger.debug(`Creating Azure client for ${input.connectionId}`);

  try {
    // Import the Azure client
    const { AzureDevOpsIntClient } = await import('../azure-client/index.js');

    // Create client with connection details
    const client = new AzureDevOpsIntClient(
      input.config.organization,
      input.config.project,
      input.credential || '',
      input.authMethod
    );

    return { client };
  } catch (error) {
    logger.error(
      `Client creation failed: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
});

/**
 * Creates work items provider
 */
export const createWorkItemsProvider = fromPromise(
  async ({ input }: { input: ConnectionContext }) => {
    logger.debug(`Creating work items provider for ${input.connectionId}`);

    try {
      // Import the provider
      const { WorkItemsProvider } = await import('../../provider.js');

      // Create provider with client
      const provider = new WorkItemsProvider(input.client!);

      return { provider };
    } catch (error) {
      logger.error(
        `Provider creation failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }
);

/**
 * Refreshes authentication token
 */
export const refreshAuthToken = fromPromise(async ({ input }: { input: ConnectionContext }) => {
  logger.debug(`Refreshing auth token for ${input.connectionId}`);

  // Simplified implementation - would handle token refresh logic
  throw new Error('Token refresh not implemented');
});
