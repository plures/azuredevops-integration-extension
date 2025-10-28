/**
 * Connection FSM Manager
 *
 * Manages connection state machines and integrates them with the existing
 * activation.ts connection management system.
 */

import { createActor, ActorRefFrom } from 'xstate';
import {
  connectionMachine,
  ConnectionContext as _ConnectionContext,
  ConnectionEvent as _ConnectionEvent,
  ProjectConnection,
} from './machines/connectionMachine.js';
import { createComponentLogger, FSMComponent } from './logging/FSMLogger.js';

export class ConnectionFSMManager {
  private connectionActors = new Map<string, ActorRefFrom<typeof connectionMachine>>();
  private isEnabled: boolean = false;
  private logger = createComponentLogger(FSMComponent.CONNECTION, 'ConnectionFSMManager');

  constructor() {
    this.logger.info('ConnectionFSMManager created');
  }

  /**
   * Enable/disable the Connection FSM system
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.logger.info(`Connection FSM ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Create or get connection actor for a specific connection
   */
  private getConnectionActor(connectionId: string): ActorRefFrom<typeof connectionMachine> {
    if (!this.connectionActors.has(connectionId)) {
      const actor = createActor(connectionMachine, {
        input: {
          connectionId,
          config: {} as ProjectConnection,
          authMethod: 'pat',
          isConnected: false,
          retryCount: 0,
          refreshFailureCount: 0,
          reauthInProgress: false,
        },
      });

      // Subscribe to state changes for debugging
      actor.subscribe((state) => {
        this.logger.debug(`${connectionId} state: ${String(state.value)}`, {
          state: String(state.value),
          connectionId: connectionId,
        });
      });

      // Start the actor
      actor.start();
      this.connectionActors.set(connectionId, actor);
    }

    return this.connectionActors.get(connectionId)!;
  }

  /**
   * Connect to a specific connection (replaces ensureActiveConnection logic)
   */
  async connectToConnection(
    config: ProjectConnection,
    options: { refresh?: boolean; interactive?: boolean } = {}
  ): Promise<{
    success: boolean;
    client?: any;
    provider?: any;
    error?: string;
    state?: any;
  }> {
    if (!this.isEnabled) {
      throw new Error('Connection FSM not enabled');
    }

    this.logger.info(`Connecting to ${config.id}...`, { connectionId: config.id });

    const actor = this.getConnectionActor(config.id);
    const forceInteractive = options?.interactive === true;

    // Send connect event
    actor.send({ type: 'CONNECT', config, forceInteractive });
    this.logger.logEvent('CONNECT', 'connecting', 'connectionMachine', {
      connectionId: config.id,
      forceInteractive,
    });

    // Wait for connection to complete or fail
    // Extended timeout for device code authentication flow (15 minutes to match Azure)
    // Device code flow is ALWAYS interactive - detect by checking if forceInteractive OR if using Entra auth
    const isEntraAuth = config.authMethod === 'entra';
    const isInteractiveAuth = options?.interactive || forceInteractive || isEntraAuth;
    const timeoutMs = isInteractiveAuth ? 900000 : 30000; // 15 minutes for interactive auth, 30s for cached auth

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          error: `Connection timeout (${isInteractiveAuth ? '15min' : '30s'})`,
        });
      }, timeoutMs);

      const subscription = actor.subscribe((state) => {
        if (state.matches('connected')) {
          clearTimeout(timeout);
          subscription.unsubscribe();
          resolve({
            success: true,
            client: state.context.client,
            provider: state.context.provider,
            state: state.context,
          });
        } else if (
          state.matches('auth_failed') ||
          state.matches('client_failed') ||
          state.matches('provider_failed') ||
          state.matches('connection_error')
        ) {
          clearTimeout(timeout);
          subscription.unsubscribe();
          resolve({
            success: false,
            error: state.context.lastError || 'Connection failed',
            state: state.context,
          });
        }
      });
    });
  }

  /**
   * Disconnect from a specific connection
   */
  disconnectFromConnection(connectionId: string): void {
    const actor = this.connectionActors.get(connectionId);
    if (actor) {
      actor.send({ type: 'DISCONNECT' });
    }
  }

  /**
   * Retry connection for a specific connection
   */
  retryConnection(connectionId: string): void {
    const actor = this.connectionActors.get(connectionId);
    if (actor) {
      actor.send({ type: 'RETRY' });
    }
  }

  /**
   * Reset connection state
   */
  resetConnection(connectionId: string): void {
    const actor = this.connectionActors.get(connectionId);
    if (actor) {
      actor.send({ type: 'RESET' });
    }
  }

  /**
   * Handle token expiration
   */
  handleTokenExpired(connectionId: string): void {
    const actor = this.connectionActors.get(connectionId);
    if (actor) {
      actor.send({ type: 'TOKEN_EXPIRED' });
    }
  }

  /**
   * Refresh authentication for a connection
   */
  refreshAuth(connectionId: string): void {
    const actor = this.connectionActors.get(connectionId);
    if (actor) {
      actor.send({ type: 'REFRESH_AUTH' });
    }
  }

  /**
   * Get current state of a connection
   */
  getConnectionState(connectionId: string): any {
    const actor = this.connectionActors.get(connectionId);
    return actor?.getSnapshot();
  }

  /**
   * Check if a connection is connected
   */
  isConnectionConnected(connectionId: string): boolean {
    const state = this.getConnectionState(connectionId);
    return state?.matches('connected') || false;
  }

  /**
   * Get client for a connected connection
   */
  getConnectionClient(connectionId: string): any {
    const state = this.getConnectionState(connectionId);
    return state?.context.client;
  }

  /**
   * Get provider for a connected connection
   */
  getConnectionProvider(connectionId: string): any {
    const state = this.getConnectionState(connectionId);
    return state?.context.provider;
  }

  /**
   * Get all connection states for debugging
   */
  getAllConnectionStates(): Record<string, any> {
    const states: Record<string, any> = {};

    for (const [connectionId, actor] of this.connectionActors.entries()) {
      const snapshot = actor.getSnapshot();
      states[connectionId] = {
        state: snapshot.value,
        isConnected: snapshot.context.isConnected,
        lastError: snapshot.context.lastError,
        retryCount: snapshot.context.retryCount,
        authMethod: snapshot.context.authMethod,
      };
    }

    return states;
  }

  /**
   * Clean up connection actors
   */
  cleanup(): void {
    this.logger.info(`Cleaning up ${this.connectionActors.size} connection actors`);

    for (const [connectionId, actor] of this.connectionActors.entries()) {
      try {
        actor.send({ type: 'DISCONNECT' });
        actor.stop();
      } catch (error) {
        this.logger.error(
          `Error stopping actor for ${connectionId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    this.connectionActors.clear();
  }

  /**
   * Get debug information about the Connection FSM system
   */
  getDebugInfo() {
    return {
      isEnabled: this.isEnabled,
      activeConnections: this.connectionActors.size,
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
