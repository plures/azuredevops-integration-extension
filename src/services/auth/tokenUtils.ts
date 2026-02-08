/**
 * Token utility functions for authentication
 */
import type { ExtensionContext } from 'vscode';
import * as vscode from 'vscode';
import { enrichDeviceCodeResponse } from '../auth/deviceCodeHelpers.js';
import { createLogger } from '../../logging/unifiedLogger.js';

const logger = createLogger('auth-token-utils');

const AZURE_DEVOPS_SCOPE = '499b84ac-1321-427f-aa17-267ca6975798/.default';
const OFFLINE_ACCESS_SCOPE = 'offline_access';

export type DeviceCodeInfo = {
  userCode?: string;
  verificationUri: string;
  verificationUriComplete?: string;
  expiresInSeconds: number;
  message?: string;
};

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

/**
 * Check if a JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
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

/**
 * Resolve scopes with defaults and validation
 */
export function resolveScopes(customScopes?: string[]): string[] {
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

/**
 * Try to get cached token from multiple keys
 */
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

/**
 * Normalize device code response
 */
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

/**
 * Notify user about device code
 */
export async function notifyDeviceCode(
  info: DeviceCodeInfo,
  options: GetEntraIdTokenOptions
): Promise<void> {
  // Validate userCode exists
  if (!info.userCode || info.userCode.trim() === '') {
    logger.warn('[notifyDeviceCode] Device code is missing', {
      meta: { hasVerificationUri: !!info.verificationUri },
    });
    vscode.window.showErrorMessage('Device code is not available. Please try signing in again.');
    return;
  }

  if (info.userCode) {
    try {
      await vscode.env.clipboard.writeText(info.userCode);
    } catch (error) {
      logger.warn('[notifyDeviceCode] Failed to copy device code to clipboard', {
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
          logger.warn('[notifyDeviceCode] Failed to copy device code to clipboard', {
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
        logger.warn('[notifyDeviceCode] Failed to open browser', { meta: error });
        // Show error if browser open fails
        vscode.window.showErrorMessage('Failed to open browser. Please open it manually.');
      }
    })
    .then(undefined, (error) => {
      logger.warn('[notifyDeviceCode] Notification error', { meta: error });
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
      logger.error('[notifyDeviceCode] Error in onDeviceCode callback', {
        meta: error,
      });
      // Don't throw - this is a callback error, not a fatal error
    });
  }
}

/**
 * Format authentication error for display
 */
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
