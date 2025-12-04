import type { ExtensionContext } from 'vscode';
import type { ProjectConnection } from '../../../praxis/connection/types.js';
import type { PraxisConnectionManager } from '../../../praxis/connection/manager.js';
import { AzureDevOpsIntClient } from '../../../azureClient.js';
import { WorkItemsProvider } from '../../../provider.js';
import { getPat, getEntraIdToken } from '../auth/authentication.js';

/**
 * Perform authentication
 */
export async function performAuthentication(
  manager: PraxisConnectionManager,
  config: ProjectConnection,
  context: ExtensionContext,
  force?: boolean,
  onDeviceCode?: (response: any) => void
): Promise<void> {
  try {
    let token: string;
    let expiresAt: number | undefined;

    if (config.authMethod === 'entra') {
      token = await getEntraIdToken(context, config.tenantId, force, onDeviceCode);
      // Entra tokens usually expire in 1 hour, but we let MSAL handle refresh
      expiresAt = Date.now() + 3600 * 1000;
    } else {
      token = await getPat(context, config.patKey);
    }

    manager.authenticated(token, expiresAt);
  } catch (error) {
    manager.authFailed(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Create Azure Client
 */
export async function createClient(
  manager: PraxisConnectionManager,
  config: ProjectConnection,
  credential: string,
  onAuthFailure: () => void
): Promise<void> {
  try {
    const client = new AzureDevOpsIntClient(config.organization, config.project, credential, {
      authType: config.authMethod === 'entra' ? 'bearer' : 'pat',
      onAuthFailure: onAuthFailure,
    });
    manager.clientCreated(client);
  } catch (error) {
    manager.clientFailed(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Create Provider
 */
export async function createProvider(
  manager: PraxisConnectionManager,
  config: ProjectConnection,
  client: AzureDevOpsIntClient
): Promise<void> {
  try {
    // Dynamically import activation to get the panel
    // This avoids circular dependency issues at module level
    const { panel } = await import('../../../activation.js');

    const postMessage = (msg: any) => {
      if (panel?.webview) {
        panel.webview.postMessage(msg);
      }
    };

    const provider = new WorkItemsProvider(config.id, client, postMessage);
    manager.providerCreated(provider);
  } catch (error) {
    manager.providerFailed(error instanceof Error ? error.message : String(error));
  }
}
