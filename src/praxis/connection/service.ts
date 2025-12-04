import type { ExtensionContext } from 'vscode';
import { PraxisConnectionManager } from './manager.js';
import type { ProjectConnection } from './types.js';
import { AzureDevOpsIntClient } from '../../azureClient.js';
import {
  performAuthentication,
  createClient,
  createProvider,
} from '../../fsm/functions/connection/connectionManagerHelpers.js';
import { clearEntraIdToken } from '../../fsm/functions/auth/authentication.js';
import { createComponentLogger, FSMComponent } from '../../fsm/logging/FSMLogger.js';

const logger = createComponentLogger(FSMComponent.CONNECTION, 'ConnectionService');

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
    const forceInteractive = options?.interactive === true;
    logger.info(`Connecting to ${config.id}...`, {
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
    logger.logEvent('CONNECT', 'connecting', 'praxisConnectionManager', {
      connectionId: config.id,
      forceInteractive,
    });

    // Wait for connection to complete or fail
    // Extended timeout for device code authentication flow (15 minutes to match Azure)
    const isEntraAuth = config.authMethod === 'entra';
    const isInteractiveAuth = options?.interactive || forceInteractive || isEntraAuth;
    const timeoutMs = isInteractiveAuth ? 900000 : 30000;

    return this.waitForConnection(
      manager,
      config,
      timeoutMs,
      forceInteractive,
      options.onDeviceCode
    );
  }

  private waitForConnection(
    manager: PraxisConnectionManager,
    config: ProjectConnection,
    timeoutMs: number,
    forceInteractive?: boolean,
    onDeviceCode?: (response: any) => void
  ): Promise<{
    success: boolean;
    client?: unknown;
    provider?: unknown;
    error?: string;
    state?: unknown;
  }> {
    let authStarted = false;
    let clientStarted = false;
    let providerStarted = false;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          error: `Connection timeout (${timeoutMs / 1000}s)`,
        });
      }, timeoutMs);

      // Poll for state changes (Praxis doesn't have built-in subscriptions)
      const pollInterval = setInterval(() => {
        const state = manager.getConnectionState();
        const data = manager.getConnectionData();

        // Drive the connection process
        if (state === 'authenticating' && !authStarted) {
          authStarted = true;
          if (this.context) {
            performAuthentication(
              manager,
              config,
              this.context,
              forceInteractive,
              onDeviceCode
            ).catch((err) => {
              logger.error(`Auth error: ${err}`);
            });
          } else {
            logger.error('Extension context not set, cannot authenticate');
            manager.authFailed('Extension context not set');
          }
        } else if (state === 'creating_client' && !clientStarted && data.credential) {
          clientStarted = true;
          createClient(manager, config, data.credential, () => {
            if (this.context && config.authMethod === 'entra') {
              clearEntraIdToken(this.context, config.tenantId)
                .catch((err) => {
                  logger.warn(`Failed to clear Entra ID token: ${err}`);
                })
                .finally(() => {
                  this.handleTokenExpired(config.id);
                });
            } else {
              this.handleTokenExpired(config.id);
            }
          }).catch((err) => {
            logger.error(`Client creation error: ${err}`);
          });
        } else if (state === 'creating_provider' && !providerStarted && data.client) {
          providerStarted = true;
          createProvider(manager, config, data.client as AzureDevOpsIntClient).catch((err) => {
            logger.error(`Provider creation error: ${err}`);
          });
        }

        if (state === 'connected') {
          clearTimeout(timeout);
          clearInterval(pollInterval);
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
