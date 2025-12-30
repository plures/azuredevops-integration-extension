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
import * as msal from '@azure/msal-node';
import * as vscode from 'vscode';
import { enrichDeviceCodeResponse } from '../auth/deviceCodeHelpers.js';
import { createLogger } from '../../logging/unifiedLogger.js';

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

const DEFAULT_ENTRA_TENANT = 'organizations';
const DEFAULT_ENTRA_CLIENT_ID = 'c6c01810-2fff-45f0-861b-2ba02ae00ddc';
const AZURE_CLI_CLIENT_ID = '04b07795-8ddb-461a-bbee-02f9e1bf7b46';
const AZURE_DEVOPS_SCOPE = '499b84ac-1321-427f-aa17-267ca6975798/.default';
const OFFLINE_ACCESS_SCOPE = 'offline_access';

type DeviceCodeInfo = {
  userCode?: string;
  verificationUri: string;
  verificationUriComplete?: string;
  expiresInSeconds: number;
  message?: string;
};

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return true;
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    // Give a 5-minute buffer
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now + 300;
  } catch {
    return true;
  }
}

function resolveScopes(customScopes?: string[]): string[] {
  const scopes = new Set<string>();
  (customScopes ?? [AZURE_DEVOPS_SCOPE]).forEach((scope) => {
    if (scope && typeof scope === 'string') {
      const trimmed = scope.trim();
      if (trimmed.length > 0) {
        scopes.add(trimmed);
      }
    }
  });
  scopes.add(OFFLINE_ACCESS_SCOPE);
  return Array.from(scopes);
}

async function tryGetCachedToken(
  context: ExtensionContext,
  searchKeys: string[],
  targetKey: string
): Promise<string | undefined> {
  for (const key of searchKeys) {
    const cachedToken = await context.secrets.get(key);
    if (cachedToken && !isTokenExpired(cachedToken)) {
      if (key !== targetKey) {
        await context.secrets.store(targetKey, cachedToken);
      }
      return cachedToken;
    }
  }
  return undefined;
}

function normalizeDeviceCodeResponse(response: any): DeviceCodeInfo {
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

async function notifyDeviceCode(
  info: DeviceCodeInfo,
  options: GetEntraIdTokenOptions
): Promise<void> {
  // Validate userCode exists
  if (!info.userCode || info.userCode.trim() === '') {
    activationLogger.warn('[notifyDeviceCode] Device code is missing', {
      meta: { hasVerificationUri: !!info.verificationUri },
    });
    vscode.window.showErrorMessage('Device code is not available. Please try signing in again.');
    return;
  }

  if (info.userCode) {
    try {
      await vscode.env.clipboard.writeText(info.userCode);
    } catch (error) {
      activationLogger.warn('[notifyDeviceCode] Failed to copy device code to clipboard', {
        meta: error,
      });
      // Continue even if clipboard copy fails
    }
  }

  const label = options.connectionLabel || options.connectionId || 'Microsoft Entra ID';
  const message = `To sign in to ${label}, use a web browser to open ${info.verificationUri} and enter the code ${info.userCode} to authenticate.`;

  const openInBrowser = 'Open in Browser';

  void vscode.window
    .showInformationMessage(message, openInBrowser)
    .then(async (action) => {
      if (action !== openInBrowser) return;

      if (info.userCode) {
        try {
          await vscode.env.clipboard.writeText(info.userCode);
          vscode.window.showInformationMessage(
            `Device code ${info.userCode} copied to clipboard. Paste it into the browser to finish signing in.`
          );
        } catch (error) {
          activationLogger.warn('[notifyDeviceCode] Failed to copy device code to clipboard', {
            meta: error,
          });
          vscode.window.showWarningMessage(
            `Failed to copy device code to clipboard: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      const target = info.verificationUriComplete || info.verificationUri;
      try {
        await vscode.env.openExternal(vscode.Uri.parse(target));
      } catch (error) {
        activationLogger.warn('[notifyDeviceCode] Failed to open browser', { meta: error });
        // Show error if browser open fails
        vscode.window.showErrorMessage('Failed to open browser. Please open it manually.');
      }
    })
    .then(undefined, (error) => {
      activationLogger.warn('[notifyDeviceCode] Notification error', { meta: error });
    });

  if (info.userCode && typeof options.onDeviceCode === 'function') {
    // Call onDeviceCode callback and handle errors to prevent unhandled rejections
    Promise.resolve(
      options.onDeviceCode({
        userCode: info.userCode,
        verificationUri: info.verificationUri,
        verificationUriComplete: info.verificationUriComplete,
        expiresInSeconds: info.expiresInSeconds,
      })
    ).catch((error) => {
      activationLogger.error('[notifyDeviceCode] Error in onDeviceCode callback', {
        meta: error,
      });
      // Don't throw - this is a callback error, not a fatal error
    });
  }
}

function formatAuthError(error: any): string {
  if (!error) return 'Unknown error';

  const parts: string[] = [];
  const knownFields = [
    error.errorCode,
    error.subError,
    error.statusCode,
    error.message,
    error.errorMessage,
    error.correlationId,
  ]
    .filter(Boolean)
    .map((v) => `${v}`);

  parts.push(...knownFields);

  const responseBody = error?.responseBody || error?.body || error?.response?.body;
  if (responseBody) {
    const bodyString =
      typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
    parts.push(`body=${bodyString}`);
  }

  if (error?.stack) {
    parts.push(`stack=${error.stack}`);
  }

  return parts.filter(Boolean).join(' | ');
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

type GetEntraIdTokenOptions = {
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
  const attemptAcquire = async (clientId: string) => {
    const pca = new msal.PublicClientApplication({
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${authorityTenant}`,
      },
    });

    const targetKey = `entra:${resolvedTenantId}:${clientId}`;

    const deviceCodeRequest = {
      deviceCodeCallback: async (response: any) => {
        try {
          const info = normalizeDeviceCodeResponse(response);
          if (!info || !info.userCode || info.userCode.trim() === '') {
            activationLogger.error('[getEntraIdToken] Invalid device code response received', {
              meta: { response, hasUserCode: !!info?.userCode },
            });
            // Still try to notify, but it will show an error
            try {
              await notifyDeviceCode(
                {
                  userCode: '',
                  verificationUri: info?.verificationUri || 'https://microsoft.com/devicelogin',
                  expiresInSeconds: info?.expiresInSeconds || 900,
                },
                options
              );
            } catch (notifyError) {
              activationLogger.error('[getEntraIdToken] Failed to notify device code error', {
                meta: notifyError,
              });
            }
            return;
          }
          try {
            await notifyDeviceCode(info, options);
          } catch (notifyError) {
            activationLogger.error('[getEntraIdToken] Error in notifyDeviceCode', {
              meta: { notifyError, hasUserCode: !!info?.userCode },
            });
            // Don't rethrow - allow authentication to continue even if notification fails
          }
        } catch (error) {
          activationLogger.error('[getEntraIdToken] Error in deviceCodeCallback', {
            meta: { error, response },
          });
          // Try to notify with minimal info so user knows something went wrong
          try {
            await notifyDeviceCode(
              {
                userCode: '',
                verificationUri: 'https://microsoft.com/devicelogin',
                expiresInSeconds: 900,
              },
              options
            );
          } catch (notifyError) {
            activationLogger.error('[getEntraIdToken] Failed to notify device code error', {
              meta: notifyError,
            });
            // Ignore notification errors if we're already in error state
          }
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
  };

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
