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

const msalConfig = {
  auth: {
    clientId: 'a5243d69-523e-496b-a22c-7ff3b5a3e85b', // Replace with your client ID
    authority: 'https://login.microsoftonline.com/common',
  },
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

export async function clearEntraIdToken(
  context: ExtensionContext,
  tenantId?: string
): Promise<void> {
  if (!tenantId) {
    return;
  }
  const secretKey = `entra:${tenantId}`;
  await context.secrets.delete(secretKey);
}

export async function getEntraIdToken(
  context: ExtensionContext,
  tenantId?: string,
  force?: boolean,
  onDeviceCode?: (response: any) => void
): Promise<string> {
  if (!tenantId) {
    throw new Error('Tenant ID is not defined for this connection.');
  }
  const secretKey = `entra:${tenantId}`;

  // Try to get cached token first, unless forced
  if (!force) {
    const cachedToken = await context.secrets.get(secretKey);
    if (cachedToken && !isTokenExpired(cachedToken)) {
      return cachedToken;
    }
  }

  const authority = tenantId
    ? `https://login.microsoftonline.com/${tenantId}`
    : 'https://login.microsoftonline.com/common';

  // Use a persistent cache plugin if possible, but for now we just recreate PCA
  // Note: In a real extension, you should use a persistent cache to avoid re-authenticating
  // every time the extension reloads.
  const pca = new msal.PublicClientApplication({
    auth: {
      clientId: msalConfig.auth.clientId,
      authority,
    },
    system: {
      loggerOptions: {
        loggerCallback(loglevel, message, containsPii) {
          // console.log(message);
        },
        piiLoggingEnabled: false,
        logLevel: msal.LogLevel.Verbose,
      },
    },
  });

  const deviceCodeRequest = {
    deviceCodeCallback: (response: any) => {
      if (onDeviceCode) {
        onDeviceCode(response);
      }
      // UI is handled by the Webview via onDeviceCode callback
    },
    scopes: ['499b84ac-1321-427f-aa17-267ca6975798/.default'], // Azure DevOps scope
  };

  try {
    const tokenResponse = await pca.acquireTokenByDeviceCode(deviceCodeRequest);
    if (tokenResponse && tokenResponse.accessToken) {
      // Store the token securely
      await context.secrets.store(secretKey, tokenResponse.accessToken);
      return tokenResponse.accessToken;
    } else {
      throw new Error('Failed to acquire Entra ID token.');
    }
  } catch (error) {
    throw new Error(`Entra ID token acquisition failed: ${error}`);
  }
}
