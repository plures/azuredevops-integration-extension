/**
 * Authentication Helper Functions
 * 
 * Utilities for device code flow, token validation, and error formatting.
 */
import * as vscode from 'vscode';
import * as msal from '@azure/msal-node';
import type { ExtensionContext } from 'vscode';
import { enrichDeviceCodeResponse } from '../auth/deviceCodeHelpers.js';
import { createLogger } from '../../logging/unifiedLogger.js';

const logger = createLogger('auth-helpers');

export type DeviceCodeInfo = {
  userCode?: string;
  verificationUri: string;
  verificationUriComplete?: string;
  expiresInSeconds: number;
  message?: string;
};

export interface GetEntraIdTokenOptions {
  clientId?: string;
  scopes?: string[];
  force?: boolean;
  connectionId?: string;
  connectionLabel?: string;
  onDeviceCode?: (info: DeviceCodeInfo) => void | Promise<void>;
}

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

export async function notifyDeviceCode(
  info: DeviceCodeInfo,
  options: GetEntraIdTokenOptions
): Promise<void> {
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
        vscode.window.showErrorMessage('Failed to open browser. Please open it manually.');
      }
    })
    .then(undefined, (error) => {
      logger.warn('[notifyDeviceCode] Notification error', { meta: error });
    });

  if (info.userCode && typeof options.onDeviceCode === 'function') {
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
    });
  }
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

export async function tryAuthCodeFlow(
  context: ExtensionContext,
  connectionId: string,
  resolvedClientId: string,
  authorityTenant: string,
  scopes: string[],
  options: GetEntraIdTokenOptions,
  secretKey: string,
  legacyKey: string
): Promise<string> {
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

async function createDeviceCodeCallback(
  options: GetEntraIdTokenOptions
): Promise<(response: any) => Promise<void>> {
  return async (response: any) => {
    try {
      const info = normalizeDeviceCodeResponse(response);
      if (!info || !info.userCode || info.userCode.trim() === '') {
        logger.error('[getEntraIdToken] Invalid device code response received', {
          meta: { response, hasUserCode: !!info?.userCode },
        });
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
          logger.error('[getEntraIdToken] Failed to notify device code error', {
            meta: notifyError,
          });
        }
        return;
      }
      try {
        await notifyDeviceCode(info, options);
      } catch (notifyError) {
        logger.error('[getEntraIdToken] Error in notifyDeviceCode', {
          meta: { notifyError, hasUserCode: !!info?.userCode },
        });
      }
    } catch (error) {
      logger.error('[getEntraIdToken] Error in deviceCodeCallback', {
        meta: { error, response },
      });
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
        logger.error('[getEntraIdToken] Failed to notify device code error', {
          meta: notifyError,
        });
      }
    }
  };
}

export async function acquireTokenByDeviceCode(
  context: ExtensionContext,
  clientId: string,
  authorityTenant: string,
  resolvedTenantId: string,
  scopes: string[],
  options: GetEntraIdTokenOptions,
  legacyKey: string
): Promise<string> {
  const pca = new msal.PublicClientApplication({
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${authorityTenant}`,
    },
  });

  const targetKey = `entra:${resolvedTenantId}:${clientId}`;
  const deviceCodeCallback = await createDeviceCodeCallback(options);
  const deviceCodeRequest = { deviceCodeCallback, scopes };

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
