/**
 * Token Cache Helpers
 * Extracted from authentication.ts to reduce file size
 */

import type { ExtensionContext } from 'vscode';

const OFFLINE_ACCESS_SCOPE = 'offline_access';
const AZURE_DEVOPS_SCOPE = '499b84ac-1321-427f-aa17-267ca6975798/.default';

export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now + 300;
  } catch {
    return true;
  }
}

export function resolveScopes(customScopes?: string[]): string[] {
  const scopes = new Set<string>();
  (customScopes ?? [AZURE_DEVOPS_SCOPE]).forEach((scope) => {
    if (scope && typeof scope === 'string') {
      const trimmed = scope.trim();
      if (trimmed.length > 0) scopes.add(trimmed);
    }
  });
  scopes.add(OFFLINE_ACCESS_SCOPE);
  return Array.from(scopes);
}

export async function tryGetCachedToken(
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

export function formatAuthError(error: any): string {
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
