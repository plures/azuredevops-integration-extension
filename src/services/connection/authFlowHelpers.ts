/**
 * Helper functions for authentication flow setup
 */

import type { ExtensionContext } from 'vscode';
import { AuthorizationCodeFlowProvider } from '../auth/authorizationCodeProvider.js';
import { shouldUseAuthCodeFlow } from '../../config/authConfig.js';
import type { ProjectConnection } from '../../types/application.js';
import type { PraxisConnectionManager } from '../../praxis/connection/manager.js';

export interface AuthFlowSetupResult {
  success: boolean;
  token?: string;
  expiresAt?: number;
  error?: string;
}

/**
 * Setup and attempt authorization code flow authentication
 */
export async function setupAuthCodeFlow(
  manager: PraxisConnectionManager,
  config: ProjectConnection,
  context: ExtensionContext,
  dispatchDeviceCodeEvent: (event: any) => Promise<void>,
  force?: boolean
): Promise<AuthFlowSetupResult> {
  const useAuthCodeFlow = shouldUseAuthCodeFlow(config.authMethod, config.id);

  if (!useAuthCodeFlow) {
    return { success: false };
  }

  try {
    const redirectUri = `vscode-azuredevops-int://auth/callback`;

    const provider = new AuthorizationCodeFlowProvider({
      config: {
        clientId: config.clientId || 'a5243d69-523e-496b-a22c-7ff3b5a3e85b',
        tenantId: config.tenantId,
        scopes: undefined, // Use defaults
      },
      secretStorage: context.secrets,
      connectionId: config.id,
      redirectUri: redirectUri,
      onStatusUpdate: async (connId, status) => {
        // Dispatch event
        await dispatchDeviceCodeEvent({
          type:
            status.type === 'auth_code_flow_started'
              ? 'AUTH_CODE_FLOW_STARTED'
              : status.type === 'auth_code_flow_completed'
                ? 'AUTH_CODE_FLOW_COMPLETED'
                : 'AUTH_CODE_FLOW_FAILED',
          connectionId: connId,
          authorizationUrl: status.authorizationUrl,
          expiresInSeconds: status.expiresInSeconds,
          error: status.error,
        });
      },
    });

    // Store provider globally for URI handler
    if (!(globalThis as any).__pendingAuthProviders) {
      (globalThis as any).__pendingAuthProviders = new Map();
    }
    (globalThis as any).__pendingAuthProviders.set(config.id, provider);

    await dispatchDeviceCodeEvent({
      type: 'AUTH_CODE_FLOW_STARTED',
      connectionId: config.id,
      authorizationUrl: '', // Will be set by provider
      expiresInSeconds: 900, // 15 minutes
    });

    const result = await provider.authenticate(force);

    if (result.success && result.accessToken) {
      const expiresAt = result.expiresAt ? result.expiresAt.getTime() : undefined;

      await dispatchDeviceCodeEvent({
        type: 'AUTH_CODE_FLOW_COMPLETED',
        connectionId: config.id,
        success: true,
      });

      // Clear provider after successful auth
      (globalThis as any).__pendingAuthProviders?.delete(config.id);

      return {
        success: true,
        token: result.accessToken,
        expiresAt,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Authentication failed',
      };
    }
  } catch (error: any) {
    // Fall back to device code flow

    console.debug(`Auth code flow failed, falling back to device code: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}
