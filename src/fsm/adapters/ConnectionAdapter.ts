/**
 * Module: src/fsm/adapters/ConnectionAdapter.ts
 * Owner: application
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
 * Connection Adapter
 *
 * Provides backward compatibility between the new Connection FSM
 * and the existing ensureActiveConnection() function.
 */

import { ConnectionFSMManager, getConnectionFSMManager } from '../ConnectionFSMManager.js';
import { ProjectConnection } from '../machines/connectionMachine.js';
import { createComponentLogger, FSMComponent } from '../logging/FSMLogger.js';
import {
  getLoadedConnections as getLoadedConnectionsFromBridge,
  getActiveConnectionId as getActiveConnectionIdFromBridge,
} from '../services/extensionHostBridge.js';

export class ConnectionAdapter {
  private fsmManager: ConnectionFSMManager;
  private useFSM: boolean = false;
  private legacyEnsureConnection?: Function;
  private logger = createComponentLogger(FSMComponent.ADAPTER, 'ConnectionAdapter');

  constructor(fsmManager: ConnectionFSMManager, legacyEnsureConnection?: Function, useFSM = false) {
    this.fsmManager = fsmManager;
    this.legacyEnsureConnection = legacyEnsureConnection;
    this.useFSM = useFSM;
    this.logger.info('ConnectionAdapter created', undefined, { useFSM });
  }

  setUseFSM(enabled: boolean): void {
    this.useFSM = enabled;
    this.fsmManager.setEnabled(enabled);
    this.logger.info(`FSM ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Replacement for ensureActiveConnection function
   */
  async ensureActiveConnection(
    context: any, // vscode.ExtensionContext
    connectionId?: string,
    options: { refresh?: boolean; notify?: boolean; interactive?: boolean } = {}
  ): Promise<any> {
    if (this.useFSM) {
      return this.ensureActiveConnectionFSM(context, connectionId, options);
    } else {
      // Fallback to legacy implementation
      if (this.legacyEnsureConnection) {
        return this.legacyEnsureConnection(context, connectionId, options);
      } else {
        throw new Error('Legacy ensureActiveConnection function not provided');
      }
    }
  }

  /**
   * FSM-based connection management
   */
  private async ensureActiveConnectionFSM(
    context: any,
    connectionId?: string,
    options: { refresh?: boolean; notify?: boolean; interactive?: boolean } = {}
  ): Promise<any> {
    this.logger.info('FSM connection requested', { connectionId }, { options });

    try {
      // Get connection configuration (this would normally come from VS Code settings)
      const connection = await this.getConnectionConfig(connectionId);
      if (!connection) {
        this.logger.warn(`No connection found for ID: ${connectionId}`);
        return undefined;
      }

      this.logger.info('Found connection config', {
        id: connection.id,
        authMethod: connection.authMethod,
        organization: connection.organization,
        project: connection.project,
        interactive: options.interactive,
      });

      // Use Connection FSM to establish connection
      const result = await this.fsmManager.connectToConnection(connection, options);

      if (result.success) {
        this.logger.info(`FSM connection successful: ${connection.id}`);

        // Return legacy-compatible state object
        return {
          id: connection.id,
          config: connection,
          client: result.client,
          provider: result.provider,
          authMethod: connection.authMethod || 'pat',
          isConnected: true,
        };
      } else {
        this.logger.error(`FSM connection failed: ${result.error}`);

        // Return failure state
        return {
          id: connection.id,
          config: connection,
          client: undefined,
          provider: undefined,
          authMethod: connection.authMethod || 'pat',
          isConnected: false,
          lastError: result.error,
        };
      }
    } catch (error) {
      this.logger.error(
        `FSM connection error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get connection configuration from already-loaded connections
   */
  private async getConnectionConfig(connectionId?: string): Promise<ProjectConnection | undefined> {
    try {
      // Get connections from the global connections array that was already loaded and processed
      // This ensures we use the same connection data as the legacy system
      const connections = getLoadedConnectionsFromBridge() as ProjectConnection[];
      const activeId = getActiveConnectionIdFromBridge();

      if (connections.length === 0) {
        this.logger.warn('No connections loaded');
        return undefined;
      }

      // Find the requested connection or use the active connection or first one
      let targetConnection: ProjectConnection | undefined;

      if (connectionId) {
        targetConnection = connections.find((conn) => conn.id === connectionId);
        if (!targetConnection) {
          this.logger.warn(`Connection not found: ${connectionId}`);
          return undefined;
        }
      } else if (activeId) {
        targetConnection = connections.find((conn) => conn.id === activeId);
      }

      if (!targetConnection) {
        // Use the first connection as fallback
        targetConnection = connections[0];
      }

      this.logger.debug(`Using connection: ${targetConnection.id}`);
      return targetConnection;
    } catch (error) {
      this.logger.error(
        `Failed to get connection config: ${error instanceof Error ? error.message : String(error)}`
      );
      return undefined;
    }
  }

  /**
   * Get current connection state for a connection ID
   */
  getConnectionState(connectionId: string): any {
    if (this.useFSM) {
      return this.fsmManager.getConnectionState(connectionId);
    } else {
      // Return legacy state format
      return undefined;
    }
  }

  /**
   * Check if a connection is connected
   */
  isConnected(connectionId: string): boolean {
    if (this.useFSM) {
      return this.fsmManager.isConnectionConnected(connectionId);
    } else {
      // Legacy check - would need to implement
      return false;
    }
  }

  /**
   * Disconnect from a connection
   */
  disconnect(connectionId: string): void {
    if (this.useFSM) {
      this.fsmManager.disconnectFromConnection(connectionId);
    } else {
      // Legacy disconnect implementation - call legacy function if provided
      if (this.legacyEnsureConnection) {
        this.logger.info(`Using legacy disconnect for ${connectionId}`);
        // Legacy disconnect would be manual provider cleanup
        // For now, just log since legacy doesn't have formal disconnect
      } else {
        this.logger.warn(`Legacy disconnect not available for ${connectionId}`);
      }
    }
  }

  /**
   * Retry connection
   */
  retry(connectionId: string): void {
    if (this.useFSM) {
      this.fsmManager.retryConnection(connectionId);
    } else {
      // Legacy retry implementation - call legacy ensure connection again
      if (this.legacyEnsureConnection) {
        this.logger.info(`Using legacy retry for ${connectionId}`);
        // Legacy retry is just calling ensureActiveConnection again
        this.legacyEnsureConnection(connectionId, { forceReconnect: true });
      } else {
        this.logger.warn(`Legacy retry not available for ${connectionId}`);
      }
    }
  }

  /**
   * Handle authentication failure
   */
  handleAuthFailure(connectionId: string, error: string): void {
    if (this.useFSM) {
      // FSM will handle this automatically through state transitions
      this.logger.info(`FSM handling auth failure for ${connectionId}: ${error}`);
    } else {
      // Legacy auth failure handling implementation
      this.logger.warn(`Legacy auth failure for ${connectionId}: ${error}`);
      // Legacy would typically show error to user and prompt for re-auth
      // This would be handled by the calling code in legacy mode
    }
  }

  /**
   * Handle token expiration
   */
  handleTokenExpired(connectionId: string): void {
    if (this.useFSM) {
      this.fsmManager.handleTokenExpired(connectionId);
    } else {
      // Legacy token expiration handling implementation
      this.logger.info(`Legacy token expired for ${connectionId}, attempting refresh`);
      // Legacy would attempt to refresh by calling ensureActiveConnection again
      if (this.legacyEnsureConnection) {
        this.legacyEnsureConnection(connectionId, { forceRefresh: true });
      } else {
        this.logger.warn('Legacy token expiration handling not available');
      }
    }
  }

  /**
   * Check if FSM is currently enabled
   */
  isUsingFSM(): boolean {
    return this.useFSM;
  }

  /**
   * Get debug information
   */
  getDebugInfo(): any {
    return {
      useFSM: this.useFSM,
      fsmManager: this.useFSM ? this.fsmManager.getDebugInfo() : null,
      hasLegacyFunction: !!this.legacyEnsureConnection,
    };
  }

  /**
   * Validate FSM vs legacy behavior (for testing)
   */
  async validateBehavior(
    context: any,
    connectionId?: string,
    options: { refresh?: boolean; notify?: boolean } = {}
  ): Promise<{ isConsistent: boolean; differences: string[] }> {
    if (!this.legacyEnsureConnection) {
      return { isConsistent: true, differences: ['No legacy function to compare'] };
    }

    const differences: string[] = [];

    try {
      // Test FSM behavior
      const originalUseFSM = this.useFSM;

      this.setUseFSM(true);
      const fsmResult = await this.ensureActiveConnection(context, connectionId, options);

      this.setUseFSM(false);
      const legacyResult = await this.ensureActiveConnection(context, connectionId, options);

      // Restore original setting
      this.setUseFSM(originalUseFSM);

      // Compare results
      if (!!fsmResult !== !!legacyResult) {
        differences.push(`Result existence mismatch: FSM=${!!fsmResult}, Legacy=${!!legacyResult}`);
      }

      if (fsmResult && legacyResult) {
        if (fsmResult.id !== legacyResult.id) {
          differences.push(
            `Connection ID mismatch: FSM=${fsmResult.id}, Legacy=${legacyResult.id}`
          );
        }

        if (fsmResult.isConnected !== legacyResult.isConnected) {
          differences.push(
            `Connection status mismatch: FSM=${fsmResult.isConnected}, Legacy=${legacyResult.isConnected}`
          );
        }
      }

      return {
        isConsistent: differences.length === 0,
        differences,
      };
    } catch (error) {
      return {
        isConsistent: false,
        differences: [`Validation error: ${(error as Error).message}`],
      };
    }
  }
}

/**
 * Factory function for creating connection adapters
 */
export function createConnectionAdapter(
  legacyEnsureConnection?: Function,
  config: { useFSM?: boolean } = {}
): ConnectionAdapter {
  const fsmManager = getConnectionFSMManager();
  const useFSM = config.useFSM ?? process.env.USE_CONNECTION_FSM === 'true';

  return new ConnectionAdapter(fsmManager, legacyEnsureConnection, useFSM);
}
