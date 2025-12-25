/**
 * Helper functions for authorization code flow authentication
 */

import type { ExtensionContext } from 'vscode';
import { AuthorizationCodeFlowProvider } from './authorizationCodeProvider.js';
import { shouldUseAuthCodeFlow } from '../../config/authConfig.js';
import { createLogger } from '../../logging/unifiedLogger.js';

const logger = createLogger('auth-code-flow-helpers');

const DEFAULT_ENTRA_CLIENT_ID = 'a5243d69-523e-496b-a22c-7ff3b5a3e85b';
const DEFAULT_ENTRA_TENANT = 'organizations';

export interface AuthCodeFlowOptions {
  connectionId: string;
  clientId?: string;
  tenantId?: string;
  scopes?: string[];
  force?: boolean;
}

/**
 * Attempt authentication using authorization code flow
 */
export async function attemptAuthCodeFlow(
  context: ExtensionContext,
  options: AuthCodeFlowOptions
): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  const useAuthCodeFlow = shouldUseAuthCodeFlow('entra', options.connectionId);

  if (!useAuthCodeFlow) {
    return { success: false };
  }

  try {
    const redirectUri = `vscode-azuredevops-int://auth/callback`;
    const resolvedClientId = options.clientId?.trim() || DEFAULT_ENTRA_CLIENT_ID;
    const authorityTenant = options.tenantId || DEFAULT_ENTRA_TENANT;

    const provider = new AuthorizationCodeFlowProvider({
      config: {
        clientId: resolvedClientId,
        tenantId: authorityTenant,
        scopes: options.scopes,
      },
      secretStorage: context.secrets,
      connectionId: options.connectionId,
      redirectUri: redirectUri,
      onStatusUpdate: async (connId, status) => {
        // Dispatch event to Praxis application engine
        if (typeof (globalThis as any).__dispatchApplicationEvent === 'function') {
          (globalThis as any).__dispatchApplicationEvent({
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
        }
      },
    });

    // Store provider for URI handler
    if (!(globalThis as any).__pendingAuthProviders) {
      (globalThis as any).__pendingAuthProviders = new Map();
    }
    (globalThis as any).__pendingAuthProviders.set(options.connectionId, provider);

    const result = await provider.authenticate(options.force);

    if (result.success && result.accessToken) {
      // Clear provider after successful auth
      (globalThis as any).__pendingAuthProviders?.delete(options.connectionId);
      return { success: true, accessToken: result.accessToken };
    } else {
      return { success: false, error: result.error || 'Authentication failed' };
    }
  } catch (error: any) {
    logger.warn('Auth code flow failed, falling back to device code', {
      meta: { error: error.message, connectionId: options.connectionId },
    });
    return { success: false, error: error.message };
  }
}
