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
import { enrichDeviceCodeResponse } from './deviceCodeHelpers.js';

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
const DEFAULT_ENTRA_CLIENT_ID = 'a5243d69-523e-496b-a22c-7ff3b5a3e85b';
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
  if (info.userCode) {
    try {
      await vscode.env.clipboard.writeText(info.userCode);
    } catch {
      // Ignore clipboard errors; not fatal
    }
  }

  const label = options.connectionLabel || options.connectionId || 'Microsoft Entra ID';
  const message = `To sign in to ${label}, use a web browser to open ${info.verificationUri} and enter the code ${info.userCode ?? '---'} to authenticate.`;

  const openInBrowser = 'Open in Browser';

  void vscode.window
    .showInformationMessage(message, openInBrowser)
    .then(async (action) => {
      if (action !== openInBrowser) return;

      if (info.userCode) {
        try {
          await vscode.env.clipboard.writeText(info.userCode);
        } catch {
          // Ignore clipboard errors; not fatal
        }
      }

      const target = info.verificationUriComplete || info.verificationUri;
      try {
        await vscode.env.openExternal(vscode.Uri.parse(target));
      } catch {
        // Ignore failures; notification already shown
      }
    })
    .then(undefined, () => {
      // Ignore notification errors
    });

  if (info.userCode && typeof options.onDeviceCode === 'function') {
    options.onDeviceCode({
      userCode: info.userCode,
      verificationUri: info.verificationUri,
      verificationUriComplete: info.verificationUriComplete,
      expiresInSeconds: info.expiresInSeconds,
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

export async function getEntraIdToken(
  context: ExtensionContext,
  tenantId?: string,
  options: GetEntraIdTokenOptions = {}
): Promise<string> {
  if (!tenantId) {
    throw new Error('Tenant ID is not defined for this connection.');
  }
  const resolvedClientId = options.clientId?.trim() || DEFAULT_ENTRA_CLIENT_ID;
  const authorityTenant = tenantId || DEFAULT_ENTRA_TENANT;
  const secretKey = `entra:${tenantId}:${resolvedClientId}`;
  const legacyKey = `entra:${tenantId}`;
  const scopes = resolveScopes(options.scopes);

  // Try to get cached token first, unless forced (check new and legacy keys)
  if (!options.force) {
    const searchKeys = new Set<string>([secretKey, legacyKey]);
    const cachedToken = await tryGetCachedToken(context, Array.from(searchKeys), secretKey);
    if (cachedToken) {
      return cachedToken;
    }
  }

  const attemptAcquire = async (clientId: string) => {
    const pca = new msal.PublicClientApplication({
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${authorityTenant}`,
      },
    });

    const targetKey = `entra:${tenantId}:${clientId}`;

    const deviceCodeRequest = {
      deviceCodeCallback: async (response: any) => {
        const info = normalizeDeviceCodeResponse(response);
        await notifyDeviceCode(info, options);
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
