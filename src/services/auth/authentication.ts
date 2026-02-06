/**
 * Module: src/fsm/functions/auth/authentication.ts
 * Owner: application
 * Reads: (document)
 * Writes: (document)
 * Receives: (document)
 * Emits: (document)
 * Prohibitions: Do not mutate ApplicationContext directly; Do not define new *Context types
 * Rationale: (document)
 *
 * LLM-GUARD:
 * - Follow ownership boundaries; route events to Router; do not add UI logic here
 */
import type { ExtensionContext } from 'vscode';
import { enrichDeviceCodeResponse } from '../auth/deviceCodeHelpers.js';
import { resolveScopes, tryGetCachedToken, formatAuthError } from './authUtilities.js';

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

const DEFAULT_ENTRA_TENANT = 'organizations';
const DEFAULT_ENTRA_CLIENT_ID = 'c6c01810-2fff-45f0-861b-2ba02ae00ddc';
const AZURE_CLI_CLIENT_ID = '04b07795-8ddb-461a-bbee-02f9e1bf7b46';

type DeviceCodeInfo = {
  userCode?: string;
  verificationUri: string;
  verificationUriComplete?: string;
  expiresInSeconds: number;
  message?: string;
};

export function normalizeDeviceCodeResponse(response: any): DeviceCodeInfo {
  const enriched = enrichDeviceCodeResponse(response);

  const userCode = enriched.userCode ?? enriched.__normalized?.userCode;
  const verificationUri =
    enriched.verificationUri ??
    enriched.__normalized?.verificationUri ??
    'https://microsoft.com/devicelogin';
  const expiresInSeconds =
    enriched.__normalized?.expiresInSeconds ?? response?.expiresIn ?? response?.expires_in ?? 900;

  return {
    userCode,
    verificationUri,
    verificationUriComplete:
      enriched.verificationUriComplete ?? enriched.__normalized?.verificationUriComplete,
    expiresInSeconds,
    message: enriched.message,
  };
}

export async function clearEntraIdToken(
  context: ExtensionContext,
  tenantId?: string,
  clientId?: string
): Promise<void> {
  if (!tenantId) {
    return;
  }

  // Delete both new and legacy cache keys
  const keys = new Set<string>();
  const clientKey = clientId ?? DEFAULT_ENTRA_CLIENT_ID;
  keys.add(`entra:${tenantId}:${clientKey}`);
  keys.add(`entra:${tenantId}:${AZURE_CLI_CLIENT_ID}`); // fallback client
  keys.add(`entra:${tenantId}`); // legacy

  for (const key of keys) {
    await context.secrets.delete(key);
  }
}

export type GetEntraIdTokenOptions = {
  /** Skip cached token check and force interactive flow */
  force?: boolean;
  /** Connection id for telemetry / UI updates */
  connectionId?: string;
  /** Optional label to show in notifications */
  connectionLabel?: string;
  /** Optional client ID override */
  clientId?: string;
  /** Optional scopes override */
  scopes?: string[];
  /** Callback invoked when device code is issued */
  onDeviceCode?: (info: {
    userCode: string;
    verificationUri: string;
    verificationUriComplete?: string;
    expiresInSeconds: number;
  }) => void;
};

// eslint-disable-next-line complexity
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

  // Try to get cached token first, unless forced (check new and legacy keys)
  if (!options.force) {
    const searchKeys = new Set<string>([secretKey, legacyKey]);
    const cachedToken = await tryGetCachedToken(context, Array.from(searchKeys), secretKey);
    if (cachedToken) {
      return cachedToken;
    }
  }

  // Check if auth code flow should be used (default for Entra)
  const { shouldUseAuthCodeFlow } = await import('../../config/authConfig.js');
  const useAuthCodeFlow = shouldUseAuthCodeFlow('entra', connectionId);

  // Only try device code flow if explicitly requested (flowPreference === 'device-code')
  // Otherwise, use auth code flow as default
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
      // Store token
      await context.secrets.store(secretKey, authCodeResult.accessToken);
      if (legacyKey !== secretKey) {
        await context.secrets.delete(legacyKey);
      }
      return authCodeResult.accessToken;
    }

    // If auth code flow fails and user didn't explicitly request device code, throw error
    // Don't silently fall back to device code
    throw new Error(
      authCodeResult.error ||
        'Authorization code flow failed. If you need device code flow, set azureDevOpsIntegration.auth.flow to "device-code"'
    );
  }

  // Device code flow - only used when explicitly requested
  const { attemptDeviceCodeFlow } = await import('./deviceCodeFlowHelpers.js');
  const attemptAcquire = (clientId: string) =>
    attemptDeviceCodeFlow(
      context,
      clientId,
      authorityTenant,
      resolvedTenantId,
      legacyKey,
      scopes,
      options
    );

  const candidateClientIds = [resolvedClientId];

  const errors: string[] = [];

  for (const clientId of candidateClientIds) {
    try {
      return await attemptAcquire(clientId);
    } catch (error: any) {
      const formatted = formatAuthError(error);
      errors.push(`clientId=${clientId}: ${formatted}`);

      const nonRetryable =
        error?.errorCode &&
        ![
          'post_request_failed',
          'invalid_grant',
          'service_not_available',
          'temporarily_unavailable',
        ].includes(error.errorCode);
      if (nonRetryable) {
        break;
      }
    }
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
