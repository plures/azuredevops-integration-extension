import type { ExtensionContext } from 'vscode';
import { PraxisConnectionManager } from './manager.js';
import type { ProjectConnection } from './types.js';
import { createComponentLogger, Component } from '../../logging/ComponentLogger.js';
import { ConnectionDriver } from './driver.js';

const logger = createComponentLogger(Component.CONNECTION, 'ConnectionService');

export class ConnectionService {
  private static instance: ConnectionService;
  private connectionManagers = new Map<string, PraxisConnectionManager>();
  private context?: ExtensionContext;

  private constructor() {}

  static getInstance(): ConnectionService {
    if (!ConnectionService.instance) {
      ConnectionService.instance = new ConnectionService();
    }
    return ConnectionService.instance;
  }

  setContext(context: ExtensionContext): void {
    this.context = context;
  }

  getConnectionManager(connectionId: string): PraxisConnectionManager | undefined {
    return this.connectionManagers.get(connectionId);
  }

  async connect(
    config: ProjectConnection,
    options: {
      refresh?: boolean;
      interactive?: boolean;
      onDeviceCode?: (response: any) => void;
    } = {}
  ): Promise<{
    success: boolean;
    client?: unknown;
    provider?: unknown;
    error?: string;
    state?: unknown;
  }> {
    // Get or create manager for this connection
    let manager = this.connectionManagers.get(config.id);
    if (!manager) {
      manager = new PraxisConnectionManager(config);
      manager.start();
      this.connectionManagers.set(config.id, manager);
    }

    return this.connectWithManager(manager, options);
  }

  async connectWithManager(
    manager: PraxisConnectionManager,
    options: {
      refresh?: boolean;
      interactive?: boolean;
      onDeviceCode?: (response: any) => void;
    } = {}
  ): Promise<{
    success: boolean;
    client?: unknown;
    provider?: unknown;
    error?: string;
    state?: unknown;
  }> {
    const currentState = manager.getConnectionState();
    const failedStates = ['auth_failed', 'client_failed', 'provider_failed', 'connection_error'];

    // If a previous attempt failed, reset the manager so we can restart auth (e.g., user clicks retry)
    if (failedStates.includes(currentState)) {
      logger.info(`Resetting failed connection state before reconnect`, {
        connectionId: manager.getConnectionData().config.id,
        previousState: currentState,
      });
      manager.reset();
    }

    const config = manager.getConnectionData().config;
    const forceInteractive = options?.interactive === true;

    logger.info(`Connecting to ${config.id}...`, {
      connectionId: config.id,
      authMethod: config.authMethod,
      interactive: options?.interactive,
      forceInteractive,
    });

    // Initiate connection
    manager.connect({ forceInteractive });
    logger.logEvent('CONNECT', 'connecting', 'praxisConnectionManager', {
      connectionId: config.id,
      forceInteractive,
    });

    // Wait for connection to complete or fail
    // Extended timeout for device code authentication flow (15 minutes to match Azure)
    const isEntraAuth = config.authMethod === 'entra';
    const isInteractiveAuth = options?.interactive || forceInteractive || isEntraAuth;
    const timeoutMs = isInteractiveAuth ? 900000 : 30000;

    const driver = new ConnectionDriver(
      this.context,
      () => this.updateStatusBar(),
      (id) => this.handleTokenExpired(id)
    );

    return driver.waitForConnection(
      manager,
      config,
      timeoutMs,
      forceInteractive,
      options.onDeviceCode
    );
  }

  private handleTokenExpired(connectionId: string): void {
    const manager = this.connectionManagers.get(connectionId);
    if (manager) {
      manager.tokenExpired();
    }
  }

  private updateStatusBar(): void {
    setImmediate(() => {
      const globalRef = (globalThis as any).__updateAuthStatusBar;
      if (typeof globalRef === 'function') {
        globalRef().catch((err: any) => {
          logger.warn(
            `Failed to update status bar: ${err instanceof Error ? err.message : String(err)}`
          );
        });
      } else {
        // @ts-ignore
        import('../../activation.js')
          .then(({ updateAuthStatusBar }) => {
            updateAuthStatusBar().catch((err: any) => {
              logger.warn(
                `Failed to update status bar: ${err instanceof Error ? err.message : String(err)}`
              );
            });
          })
          .catch((err) => {
            logger.warn(
              `Failed to import updateAuthStatusBar: ${err instanceof Error ? err.message : String(err)}`
            );
          });
      }
    });
  }

  disconnect(connectionId: string): void {
    const manager = this.connectionManagers.get(connectionId);
    if (manager) {
      manager.disconnect();
    }
  }
}
