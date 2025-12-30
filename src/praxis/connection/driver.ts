/**
 * Connection Driver
 *
 * Handles the connection lifecycle by polling Praxis connection manager state
 * and driving the connection process through authentication, client creation, and provider creation.
 */

import type { ExtensionContext } from 'vscode';
import type { PraxisConnectionManager } from './manager.js';
import type { ProjectConnection } from './types.js';
import { AzureDevOpsIntClient } from '../../azureClient.js';
import {
  performAuthentication,
  createClient,
  createProvider,
} from '../../services/connection/connectionManagerHelpers.js';
import { clearEntraIdToken } from '../../services/auth/authentication.js';

export class ConnectionDriver {
  constructor(
    private context: ExtensionContext | undefined,
    private onStatusBarUpdate: () => void,
    private onTokenExpired: (connectionId: string) => void
  ) {}

  /**
   * Wait for connection to complete or fail
   */
  async waitForConnection(
    manager: PraxisConnectionManager,
    config: ProjectConnection,
    timeoutMs: number,
    forceInteractive?: boolean,
    onDeviceCode?: (response: {
      userCode: string;
      verificationUri: string;
      verificationUriComplete?: string;
      expiresInSeconds: number;
    }) => void
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
            performAuthentication(manager, config, this.context, forceInteractive, onDeviceCode).catch((err) => {
               
              console.debug(`[ConnectionDriver] Auth error: ${err}`);
            });
          } else {
             
            console.debug('[ConnectionDriver] Extension context not set, cannot authenticate');
            manager.authFailed('Extension context not set');
          }
        } else if (state === 'creating_client' && !clientStarted && data.credential) {
          clientStarted = true;
          createClient(manager, config, data.credential, () => {
            if (this.context && config.authMethod === 'entra') {
              clearEntraIdToken(this.context, config.tenantId, config.clientId)
                .catch((err) => {
                   
                  console.debug(`[ConnectionDriver] Failed to clear Entra ID token: ${err}`);
                })
                .finally(() => {
                  this.onTokenExpired(config.id);
                });
            } else {
              this.onTokenExpired(config.id);
            }
          }).catch((err) => {
             
            console.debug(`[ConnectionDriver] Client creation error: ${err}`);
          });
        } else if (state === 'creating_provider' && !providerStarted && data.client) {
          providerStarted = true;
          createProvider(manager, config, data.client as AzureDevOpsIntClient).catch((err) => {
             
            console.debug(`[ConnectionDriver] Provider creation error: ${err}`);
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
          this.onStatusBarUpdate();
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
          this.onStatusBarUpdate();
        }
      }, 100);
    });
  }
}

