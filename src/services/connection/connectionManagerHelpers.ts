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
      // Try authorization code flow first (default)
      const { setupAuthCodeFlow } = await import('./authFlowHelpers.js');
      const { shouldUseAuthCodeFlow } = await import('../../config/authConfig.js');
      const useAuthCodeFlow = shouldUseAuthCodeFlow('entra', config.id);
      
      if (useAuthCodeFlow) {
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
          // Don't silently fall back to device code - throw error instead
          throw new Error(
            authCodeResult.error || 
            'Authorization code flow failed. If you need device code flow, set azureDevOpsIntegration.auth.flow to "device-code"'
          );
        }
      } else {
        // Device code flow - only used when explicitly requested
        token = await getEntraIdToken(context, config.tenantId, {
          force,
          connectionId: config.id,
          connectionLabel: config.label,
          clientId: config.clientId,
          onDeviceCode: async (info) => {
            try {
              deviceCodeStarted = true;
              await dispatchDeviceCodeEvent({
                type: 'DEVICE_CODE_STARTED',
                connectionId: config.id,
                userCode: info.userCode,
                verificationUri: info.verificationUri,
                expiresInSeconds: info.expiresInSeconds,
              });

              if (onDeviceCode) {
                // Call the optional callback, but don't await it to avoid blocking
                Promise.resolve(onDeviceCode(info)).catch((error) => {
                  // Log but don't throw - callback errors shouldn't break auth flow
                  // Errors are already logged by the callback handler
                });
              }
            } catch (error) {
              // Log error but don't throw - device code dispatch failure shouldn't break auth
              // Errors are already handled by dispatchDeviceCodeEvent's try-catch
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
