/**
 * Connection Actions
 *
 * Action functions for the connection state machine.
 */

import { assign } from 'xstate';
import { createComponentLogger, FSMComponent } from '../../fsm/logging/FSMLogger.js';
import type { ConnectionContext } from './types.js';

// Create logger for connection actions
const logger = createComponentLogger(FSMComponent.CONNECTION, 'connectionActions');

/**
 * Clears all connection state
 */
export const clearConnectionState = assign({
  client: undefined,
  provider: undefined,
  credential: undefined,
  pat: undefined,
  accessToken: undefined,
  accessTokenExpiresAt: undefined,
  isConnected: false,
  lastError: undefined,
  forceInteractive: false,
});

/**
 * Resets connection retry state
 */
export const resetConnection = assign({
  retryCount: 0,
  refreshFailureCount: 0,
  lastRefreshFailure: undefined,
  refreshBackoffUntil: undefined,
  reauthInProgress: false,
  lastError: undefined,
  forceInteractive: false,
  accessTokenExpiresAt: undefined,
});

/**
 * Notifies successful connection and triggers initial refresh
 */
export const notifyConnectionSuccess = ({ context }: { context: ConnectionContext }) => {
  logger.info(`${context.connectionId} connected successfully`);

  // Trigger initial work items refresh after successful connection
  if (context.provider) {
    logger.info(`Triggering initial work items refresh for ${context.connectionId}`);
    try {
      // Get the default query (this should match activation.ts logic)
      const defaultQuery = 'My Activity'; // Default query that matches activation.ts
      context.provider.refresh(defaultQuery);
    } catch (error) {
      logger.error(
        `Failed to trigger initial refresh: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  } else {
    logger.warn(`No provider available for initial refresh on ${context.connectionId}`);
  }
};

/**
 * Notifies authentication failure with helpful error messages
 */
export const notifyAuthFailure = ({ context }: { context: ConnectionContext }) => {
  logger.error(`${context.connectionId} authentication failed: ${context.lastError}`);

  // Check for network errors and provide helpful guidance
  if (context.lastError?.includes('network_error')) {
    // Import VS Code to show helpful error message
    import('vscode').then((vscode) => {
      vscode.window
        .showErrorMessage(
          `Authentication failed due to network error. This might be caused by corporate firewall/proxy. Try: 1) Check internet connection, 2) Contact IT about Microsoft auth endpoints, 3) Try from a different network.`,
          'Retry Authentication',
          'View Logs'
        )
        .then((selection) => {
          if (selection === 'View Logs') {
            vscode.commands.executeCommand('azureDevOpsInt.showFSMLogs');
          }
        });
    });
  }
};

/**
 * Notifies client creation failure
 */
export const notifyClientFailure = ({ context }: { context: ConnectionContext }) => {
  logger.error(`${context.connectionId} client creation failed: ${context.lastError}`);
};

/**
 * Notifies provider creation failure
 */
export const notifyProviderFailure = ({ context }: { context: ConnectionContext }) => {
  logger.error(`${context.connectionId} provider creation failed: ${context.lastError}`);
};

/**
 * Notifies connection error
 */
export const notifyConnectionError = ({ context }: { context: ConnectionContext }) => {
  logger.error(`${context.connectionId} connection error: ${context.lastError}`);
};
