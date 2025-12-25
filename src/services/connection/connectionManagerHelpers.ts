import type { ExtensionContext } from 'vscode';
import type { ProjectConnection } from '../../../praxis/connection/types.js';
import type { PraxisConnectionManager } from '../../../praxis/connection/manager.js';
import { AzureDevOpsIntClient } from '../../azureClient.js';
import { WorkItemsProvider } from '../../provider.js';
import { getPat, getEntraIdToken } from '../auth/authentication.js';

let cachedDispatchApplicationEvent: ((event: any) => void) | undefined;

async function dispatchDeviceCodeEvent(event: any) {
  try {
    if (!cachedDispatchApplicationEvent) {
      const activation = await import('../../../activation.js');
      cachedDispatchApplicationEvent = activation.dispatchApplicationEvent;
    }
    cachedDispatchApplicationEvent?.(event);
  } catch {
    // Swallow dispatch errors to avoid breaking authentication flow
  }
}

/**
 * Perform authentication
 */
export async function performAuthentication(
  manager: PraxisConnectionManager,
  config: ProjectConnection,
  context: ExtensionContext,
  force?: boolean,
  onDeviceCode?: (info: {
    userCode: string;
    verificationUri: string;
    verificationUriComplete?: string;
    expiresInSeconds: number;
  }) => void
): Promise<void> {
  try {
    let token: string;
    let expiresAt: number | undefined;
    let deviceCodeStarted = false;

    if (config.authMethod === 'entra') {
      // Try authorization code flow first
      const { setupAuthCodeFlow } = await import('./authFlowHelpers.js');
      const authCodeResult = await setupAuthCodeFlow(
        manager,
        config,
        context,
        dispatchDeviceCodeEvent,
        force
      );

      if (authCodeResult.success && authCodeResult.token) {
        token = authCodeResult.token;
        expiresAt = authCodeResult.expiresAt;
      } else {
        // Fall back to device code flow
        token = await getEntraIdToken(context, config.tenantId, {
          force,
          connectionId: config.id,
          connectionLabel: config.label,
          clientId: config.clientId,
          onDeviceCode: async (info) => {
            deviceCodeStarted = true;
            await dispatchDeviceCodeEvent({
              type: 'DEVICE_CODE_STARTED',
              connectionId: config.id,
              userCode: info.userCode,
              verificationUri: info.verificationUri,
              expiresInSeconds: info.expiresInSeconds,
            });

            if (onDeviceCode) {
              onDeviceCode(info);
            }
          },
        });
        // Entra tokens usually expire in 1 hour, but we let MSAL handle refresh
        expiresAt = Date.now() + 3600 * 1000;
      }
    } else {
      token = await getPat(context, config.patKey);
    }

    manager.authenticated(token, expiresAt);

    if (deviceCodeStarted) {
      await dispatchDeviceCodeEvent({
        type: 'DEVICE_CODE_COMPLETED',
        connectionId: config.id,
      });
    }
  } catch (error) {
    // Ensure device code UI is cleared on failure
    await dispatchDeviceCodeEvent({
      type: 'DEVICE_CODE_COMPLETED',
      connectionId: config.id,
    });
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
    // Dynamically import activation to get forwardProviderMessage
    // This avoids circular dependency issues at module level
    const { forwardProviderMessage } = await import('../../../activation.js');

    // Use forwardProviderMessage to ensure work items are dispatched to Praxis
    // This is critical for the initial refresh to work correctly - work items must
    // be dispatched to Praxis via WORK_ITEMS_LOADED event, not posted directly to webview
    const postMessage = (msg: any) => {
      forwardProviderMessage(config.id, msg);
    };

    const provider = new WorkItemsProvider(config.id, client, postMessage);
    manager.providerCreated(provider);
  } catch (error) {
    manager.providerFailed(error instanceof Error ? error.message : String(error));
  }
}
