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
import {
  tryAuthCodeFlow,
  acquireTokenByDeviceCode,
  formatAuthError,
  type GetEntraIdTokenOptions,
} from './authHelpers.js';
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
const AZURE_DEVOPS_SCOPE = '499b84ac-1321-427f-aa17-267ca6975798/.default';
const OFFLINE_ACCESS_SCOPE = 'offline_access';

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return true;
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
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
    const searchKeys = new Set<string>([secretKey, legacyKey]);
    const cachedToken = await tryGetCachedToken(context, Array.from(searchKeys), secretKey);
    if (cachedToken) {
      return cachedToken;
    }
  }

  const { shouldUseAuthCodeFlow } = await import('../../config/authConfig.js');
  const useAuthCodeFlow = shouldUseAuthCodeFlow('entra', connectionId);

  if (useAuthCodeFlow) {
    return tryAuthCodeFlow(
      context,
      connectionId,
      resolvedClientId,
      authorityTenant,
      scopes,
      options,
      secretKey,
      legacyKey
    );
  }

  const errors: string[] = [];
  const candidateClientIds = [resolvedClientId];

  for (const clientId of candidateClientIds) {
    try {
      return await acquireTokenByDeviceCode(
        context,
        clientId,
        authorityTenant,
        resolvedTenantId,
        scopes,
        options,
        legacyKey
      );
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
