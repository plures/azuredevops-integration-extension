/**
 * Module: src/fsm/functions/auth/authentication.ts
 * Owner: application
 * Authentication token management and acquisition.
 */
import type { ExtensionContext } from 'vscode';
import * as msal from '@azure/msal-node';
import { createLogger } from '../../logging/unifiedLogger.js';
import { isTokenExpired, resolveScopes, tryGetCachedToken, formatAuthError } from './tokenCache.js';
import { DEFAULT_ENTRA_TENANT, DEFAULT_ENTRA_CLIENT_ID, AZURE_CLI_CLIENT_ID } from './constants.js';
import { normalizeDeviceCodeResponse, notifyDeviceCode } from './deviceCodeFlow.js';

const activationLogger = createLogger('auth-authentication');

export async function getPat(context: ExtensionContext, patKey?: string): Promise<string> {
  if (!patKey) {
    throw new Error('PAT key is not defined for this connection.');
  }
  const pat = await context.secrets.get(patKey);
  if (!pat) {
    throw new Error(`PAT not found in secret storage for key: ${patKey}`);
  }
  return pat;
}

export async function clearEntraIdToken(
  context: ExtensionContext,
  tenantId?: string,
  clientId?: string
): Promise<void> {
  if (!tenantId) return;

  const keys = new Set<string>();
  const clientKey = clientId ?? DEFAULT_ENTRA_CLIENT_ID;
  keys.add(`entra:${tenantId}:${clientKey}`);
  keys.add(`entra:${tenantId}:${AZURE_CLI_CLIENT_ID}`);
  keys.add(`entra:${tenantId}`);

  for (const key of keys) {
    await context.secrets.delete(key);
  }
}

export type GetEntraIdTokenOptions = {
  force?: boolean;
  connectionId?: string;
  connectionLabel?: string;
  clientId?: string;
  scopes?: string[];
  onDeviceCode?: (info: {
    userCode: string;
    verificationUri: string;
    verificationUriComplete?: string;
    expiresInSeconds: number;
  }) => void;
};

async function attemptDeviceCodeFlow(
  context: ExtensionContext,
  resolvedClientId: string,
  authorityTenant: string,
  resolvedTenantId: string,
  scopes: string[],
  options: GetEntraIdTokenOptions
): Promise<string> {
  const legacyKey = `entra:${resolvedTenantId}`;

  const pca = new msal.PublicClientApplication({
    auth: {
      clientId: resolvedClientId,
      authority: `https://login.microsoftonline.com/${authorityTenant}`,
    },
  });

  const targetKey = `entra:${resolvedTenantId}:${resolvedClientId}`;

  const deviceCodeRequest = {
    deviceCodeCallback: async (response: any) => {
      try {
        const info = normalizeDeviceCodeResponse(response);
        if (!info || !info.userCode || info.userCode.trim() === '') {
          activationLogger.error('[getEntraIdToken] Invalid device code response', {
            meta: { response, hasUserCode: !!info?.userCode },
          });
          return;
        }
        await notifyDeviceCode(info, options);
      } catch (error) {
        activationLogger.error('[getEntraIdToken] Error in deviceCodeCallback', {
          meta: { error, response },
        });
      }
    },
    scopes,
  };

  const tokenResponse = await pca.acquireTokenByDeviceCode(deviceCodeRequest);
  if (tokenResponse && tokenResponse.accessToken) {
    await context.secrets.store(targetKey, tokenResponse.accessToken);
    if (legacyKey !== targetKey) {
      await context.secrets.delete(legacyKey);
    }
    return tokenResponse.accessToken;
  }

  throw new Error('Failed to acquire Entra ID token.');
}

export async function getEntraIdToken(
  context: ExtensionContext,
  tenantId?: string,
  options: GetEntraIdTokenOptions = {}
): Promise<string> {
  const resolvedClientId = options.clientId?.trim() || DEFAULT_ENTRA_CLIENT_ID;
  const authorityTenant = tenantId || DEFAULT_ENTRA_TENANT;
  const resolvedTenantId = tenantId || DEFAULT_ENTRA_TENANT;
  const secretKey = `entra:${resolvedTenantId}:${resolvedClientId}`;
  const legacyKey = `entra:${resolvedTenantId}`;
  const scopes = resolveScopes(options.scopes);
  const connectionId = options.connectionId || 'default';

  if (!options.force) {
    const cachedToken = await tryGetCachedToken(context, [secretKey, legacyKey], secretKey);
    if (cachedToken) return cachedToken;
  }

  const { shouldUseAuthCodeFlow } = await import('../../config/authConfig.js');
  const useAuthCodeFlow = shouldUseAuthCodeFlow('entra', connectionId);

  if (useAuthCodeFlow) {
    const { attemptAuthCodeFlow } = await import('./authCodeFlowHelpers.js');
    const authCodeResult = await attemptAuthCodeFlow(context, {
      connectionId,
      clientId: resolvedClientId,
      tenantId: authorityTenant,
      scopes,
      force: options.force,
    });

    if (authCodeResult.success && authCodeResult.accessToken) {
      await context.secrets.store(secretKey, authCodeResult.accessToken);
      if (legacyKey !== secretKey) {
        await context.secrets.delete(legacyKey);
      }
      return authCodeResult.accessToken;
    }

    throw new Error(
      authCodeResult.error ||
        'Authorization code flow failed. If you need device code flow, set azureDevOpsIntegration.auth.flow to "device-code"'
    );
  }

  const errors: string[] = [];
  try {
    return await attemptDeviceCodeFlow(
      context,
      resolvedClientId,
      authorityTenant,
      resolvedTenantId,
      scopes,
      options
    );
  } catch (error: any) {
    const formatted = formatAuthError(error);
    errors.push(`clientId=${resolvedClientId}: ${formatted}`);
  }

  throw new Error(`Entra ID token acquisition failed: ${errors.join(' || ')}`);
}

/**
 * Get pending auth code flow provider for URI handler
 */
export function getPendingAuthCodeFlowProvider(
  connectionId: string
): AuthorizationCodeFlowProvider | undefined {
  const providers = (globalThis as any).__pendingAuthProviders as
    | Map<string, AuthorizationCodeFlowProvider>
    | undefined;
  return providers?.get(connectionId);
}

/**
 * Clear pending auth code flow provider
 */
export function clearPendingAuthCodeFlowProvider(connectionId: string): void {
  (globalThis as any).__pendingAuthProviders?.delete(connectionId);
}
