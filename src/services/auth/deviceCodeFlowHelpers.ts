/**
 * Module: src/services/auth/deviceCodeFlowHelpers.ts
 * Owner: application
 * 
 * Device Code Flow Authentication Helpers
 * Extracted from authentication.ts to reduce file complexity
 */
import type { ExtensionContext } from 'vscode';
import * as msal from '@azure/msal-node';
import * as vscode from 'vscode';
import { createLogger } from '../../logging/unifiedLogger.js';
import { normalizeDeviceCodeResponse } from './authentication.js';
import type { GetEntraIdTokenOptions } from './authentication.js';

const logger = createLogger('auth-device-code-flow');

/**
 * Notify user of device code via callback or UI
 */
export async function notifyDeviceCode(
  info: {
    userCode: string;
    verificationUri: string;
    verificationUriComplete?: string;
    expiresInSeconds: number;
  },
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
 * Attempt to acquire token using device code flow
 */
export async function attemptDeviceCodeFlow(
  context: ExtensionContext,
  clientId: string,
  authorityTenant: string,
  resolvedTenantId: string,
  legacyKey: string,
  scopes: string[],
  options: GetEntraIdTokenOptions
): Promise<string> {
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
          logger.error('[attemptDeviceCodeFlow] Invalid device code response received', {
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
            logger.error('[attemptDeviceCodeFlow] Failed to notify device code error', {
              meta: notifyError,
            });
          }
          return;
        }
        try {
          await notifyDeviceCode(info, options);
        } catch (notifyError) {
          logger.error('[attemptDeviceCodeFlow] Error in notifyDeviceCode', {
            meta: { notifyError, hasUserCode: !!info?.userCode },
          });
          // Don't rethrow - allow authentication to continue even if notification fails
        }
      } catch (error) {
        logger.error('[attemptDeviceCodeFlow] Error in deviceCodeCallback', {
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
          logger.error('[attemptDeviceCodeFlow] Failed to notify device code error', {
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
}
