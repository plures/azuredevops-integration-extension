/**
 * Module: src/fsm/ConnectionFSMManager.ts
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
 *
 * This module now uses Praxis logic engine instead of XState.
 */
/**
 * Connection FSM Manager
 *
 * Manages connection state machines and integrates them with the existing
 * activation.ts connection management system.
 *
 * Now uses Praxis logic engine instead of XState.
 */

import { PraxisConnectionManager } from '../praxis/connection/manager.js';
import type { ProjectConnection as PraxisProjectConnection } from '../praxis/connection/types.js';
import { createComponentLogger, FSMComponent } from './logging/FSMLogger.js';

// Re-export ProjectConnection type for compatibility
export type ProjectConnection = PraxisProjectConnection;

export class ConnectionFSMManager {
  private connectionManagers = new Map<string, PraxisConnectionManager>();
  private isEnabled: boolean = false;
  private logger = createComponentLogger(FSMComponent.CONNECTION, 'ConnectionFSMManager');

  constructor() {
    this.logger.info('ConnectionFSMManager created (Praxis-based)');
  }

  /**
   * Enable/disable the Connection FSM system
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.logger.info(`Connection FSM ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Create or get connection manager for a specific connection
   */
  getConnectionActor(connectionId: string): PraxisConnectionManager {
    if (!this.connectionManagers.has(connectionId)) {
      const manager = new PraxisConnectionManager({
        id: connectionId,
        organization: '',
        project: '',
        authMethod: 'pat',
      });
      manager.start();
      this.connectionManagers.set(connectionId, manager);
    }

    return this.connectionManagers.get(connectionId)!;
  }

  /**
   * Get the actual state value of a connection machine (e.g., 'connected', 'auth_failed')
   */
  getConnectionState(connectionId: string): string | null {
    const manager = this.connectionManagers.get(connectionId);
    if (!manager) return null;
    return manager.getConnectionState();
  }

  /**
   * Connect to a specific connection (replaces ensureActiveConnection logic)
   */
  async connectToConnection(
    config: ProjectConnection,
    options: { refresh?: boolean; interactive?: boolean } = {}
  ): Promise<{
    success: boolean;
    client?: unknown;
    provider?: unknown;
    error?: string;
    state?: unknown;
  }> {
    if (!this.isEnabled) {
      throw new Error('Connection FSM not enabled');
    }

    const forceInteractive = options?.interactive === true;
    this.logger.info(`Connecting to ${config.id}...`, {
      connectionId: config.id,
      authMethod: config.authMethod,
      interactive: options?.interactive,
      forceInteractive,
    });

    // Get or create manager for this connection
    let manager = this.connectionManagers.get(config.id);
    if (!manager) {
      manager = new PraxisConnectionManager(config);
      manager.start();
      this.connectionManagers.set(config.id, manager);
    }

    // Initiate connection
    manager.connect({ forceInteractive });
    this.logger.logEvent('CONNECT', 'connecting', 'praxisConnectionManager', {
      connectionId: config.id,
      forceInteractive,
    });

    // Wait for connection to complete or fail
    // Extended timeout for device code authentication flow (15 minutes to match Azure)
    const isEntraAuth = config.authMethod === 'entra';
    const isInteractiveAuth = options?.interactive || forceInteractive || isEntraAuth;
    const timeoutMs = isInteractiveAuth ? 900000 : 30000;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          error: `Connection timeout (${isInteractiveAuth ? '15min' : '30s'})`,
        });
      }, timeoutMs);

      // Poll for state changes (Praxis doesn't have built-in subscriptions)
      const pollInterval = setInterval(() => {
        const state = manager!.getConnectionState();

        if (state === 'connected') {
          clearTimeout(timeout);
          clearInterval(pollInterval);
          const data = manager!.getConnectionData();
          resolve({
            success: true,
            client: data.client,
            provider: data.provider,
            state: data,
          });
          // Update status bar
          this.updateStatusBar();
        } else if (
          ['auth_failed', 'client_failed', 'provider_failed', 'connection_error'].includes(state)
        ) {
          clearTimeout(timeout);
          clearInterval(pollInterval);
          const data = manager!.getConnectionData();
          resolve({
            success: false,
            error: data.lastError || 'Connection failed',
            state: data,
          });
          // Update status bar
          this.updateStatusBar();
        }
      }, 100);
    });
  }

  /**
   * Update status bar (called on terminal states)
   */
  private updateStatusBar(): void {
    setImmediate(() => {
      const globalRef = (globalThis as any).__updateAuthStatusBar;
      if (typeof globalRef === 'function') {
        globalRef().catch((err: any) => {
          this.logger.warn(
            `Failed to update status bar: ${err instanceof Error ? err.message : String(err)}`
          );
        });
      } else {
        import('../../activation.js')
          .then(({ updateAuthStatusBar }) => {
            updateAuthStatusBar().catch((err) => {
              this.logger.warn(
                `Failed to update status bar: ${err instanceof Error ? err.message : String(err)}`
              );
            });
          })
          .catch((err) => {
            this.logger.warn(
              `Failed to import updateAuthStatusBar: ${err instanceof Error ? err.message : String(err)}`
            );
          });
      }
    });
  }

  /**
   * Disconnect from a specific connection
   */
  disconnectFromConnection(connectionId: string): void {
    const manager = this.connectionManagers.get(connectionId);
    if (manager) {
      manager.disconnect();
    }
  }

  /**
   * Retry connection for a specific connection
   */
  retryConnection(connectionId: string): void {
    const manager = this.connectionManagers.get(connectionId);
    if (manager) {
      manager.retry();
    }
  }

  /**
   * Reset connection state
   */
  resetConnection(connectionId: string): void {
    const manager = this.connectionManagers.get(connectionId);
    if (manager) {
      manager.reset();
    }
  }

  /**
   * Handle token expiration
   */
  handleTokenExpired(connectionId: string): void {
    const manager = this.connectionManagers.get(connectionId);
    if (manager) {
      manager.tokenExpired();
    }
  }

  /**
   * Refresh authentication for a connection
   */
  refreshAuth(connectionId: string): void {
    const manager = this.connectionManagers.get(connectionId);
    if (manager && manager.isConnected()) {
      manager.tokenExpired(); // This triggers refresh flow
    }
  }

  /**
   * Check if a connection is connected
   */
  isConnectionConnected(connectionId: string): boolean {
    const stateValue = this.getConnectionState(connectionId);
    return stateValue === 'connected';
  }

  /**
   * Get client for a connected connection
   */
  getConnectionClient(connectionId: string): unknown {
    const manager = this.connectionManagers.get(connectionId);
    if (!manager) return null;
    return manager.getClient();
  }

  /**
   * Get provider for a connected connection
   */
  getConnectionProvider(connectionId: string): unknown {
    const manager = this.connectionManagers.get(connectionId);
    if (!manager) return null;
    return manager.getProvider();
  }

  /**
   * Get all connection states for debugging
   */
  getAllConnectionStates(): Record<string, any> {
    const states: Record<string, any> = {};

    for (const [connectionId, manager] of this.connectionManagers.entries()) {
      const snapshot = manager.getSnapshot();
      states[connectionId] = {
        state: snapshot.state,
        isConnected: snapshot.isConnected,
        lastError: snapshot.error,
        retryCount: snapshot.retryCount,
        authMethod: snapshot.authMethod,
      };
    }

    return states;
  }

  /**
   * Clean up connection managers
   */
  cleanup(): void {
    this.logger.info(`Cleaning up ${this.connectionManagers.size} connection managers`);

    for (const [connectionId, manager] of this.connectionManagers.entries()) {
      try {
        manager.disconnect();
        manager.stop();
      } catch (error) {
        this.logger.error(
          `Error stopping manager for ${connectionId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    this.connectionManagers.clear();
  }

  /**
   * Get debug information about the Connection FSM system
   */
  getDebugInfo() {
    return {
      isEnabled: this.isEnabled,
      activeConnections: this.connectionManagers.size,
      connectionStates: this.getAllConnectionStates(),
    };
  }
}

// Singleton instance
let connectionFSMManager: ConnectionFSMManager | undefined;

/**
 * Get or create the Connection FSM Manager
 */
export function getConnectionFSMManager(): ConnectionFSMManager {
  if (!connectionFSMManager) {
    connectionFSMManager = new ConnectionFSMManager();
  }
  return connectionFSMManager;
}

/**
 * Reset the singleton (for testing)
 */
export function resetConnectionFSMManager(): void {
  if (connectionFSMManager) {
    connectionFSMManager.cleanup();
  }
  connectionFSMManager = undefined;
}
