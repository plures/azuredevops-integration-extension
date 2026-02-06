/**
 * Device Code Flow Authentication Helpers
 *
 * Extracted from authentication.ts to reduce file size and improve maintainability.
 */
import type { ExtensionContext } from 'vscode';
import * as vscode from 'vscode';
import * as msal from '@azure/msal-node';
import { createLogger } from '../../logging/unifiedLogger.js';
import { enrichDeviceCodeResponse } from '../auth/deviceCodeHelpers.js';
import type { GetEntraIdTokenOptions } from './authentication.js';

const activationLogger = createLogger('auth-device-code-flow');

type DeviceCodeInfo = {
  userCode?: string;
  verificationUri: string;
  verificationUriComplete?: string;
  expiresInSeconds: number;
  message?: string;
};

/**
 * Normalize device code response from MSAL
 */
export function normalizeDeviceCodeResponse(response: any): DeviceCodeInfo {
  const enriched = enrichDeviceCodeResponse(response);

  const userCode = enriched.userCode ?? enriched.__normalized?.userCode;
  const verificationUri =
    enriched.verificationUri ??
    enriched.__normalized?.verificationUri ??
    'https://microsoft.com/devicelogin';
  const verificationUriComplete = enriched.verificationUriComplete;
  const expiresInSeconds =
    enriched.expiresInSeconds ?? enriched.__normalized?.expiresInSeconds ?? 900;
  const message = enriched.message ?? enriched.__normalized?.message;

  return {
    userCode,
    verificationUri,
    verificationUriComplete,
    expiresInSeconds,
    message,
  };
}

/**
 * Notify user about device code for authentication
 */
async function notifyDeviceCode(
  info: DeviceCodeInfo,
  options: GetEntraIdTokenOptions
): Promise<void> {
  const { userCode, verificationUri, message } = info;

  if (options.interactive !== false) {
    const useCode = message || `Code: ${userCode}`;
    const action = await vscode.window.showInformationMessage(
      useCode,
      { modal: false },
      'Open Browser'
    );
    if (action === 'Open Browser') {
      await vscode.env.openExternal(vscode.Uri.parse(verificationUri));
    }
  }
}

/**
 * Attempt to acquire token using device code flow
 */
export async function attemptDeviceCodeFlow(
  context: ExtensionContext,
  clientId: string,
  tenantId: string,
  scopes: string[],
  secretKey: string,
  legacyKey: string,
  options: GetEntraIdTokenOptions
): Promise<string> {
  const pca = new msal.PublicClientApplication({
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
  });

  const deviceCodeRequest = {
    deviceCodeCallback: async (response: any) => {
      try {
        const info = normalizeDeviceCodeResponse(response);
        if (!info || !info.userCode || info.userCode.trim() === '') {
          activationLogger.error('[deviceCodeFlow] Invalid device code response', {
            meta: { response, hasUserCode: !!info?.userCode },
          });
          // Still try to notify
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
            activationLogger.error('[deviceCodeFlow] Failed to notify device code error', {
              meta: notifyError,
            });
          }
          return;
        }
        try {
          await notifyDeviceCode(info, options);
        } catch (notifyError) {
          activationLogger.error('[deviceCodeFlow] Error in notifyDeviceCode', {
            meta: { notifyError, hasUserCode: !!info?.userCode },
          });
        }
      } catch (error) {
        activationLogger.error('[deviceCodeFlow] Error in deviceCodeCallback', {
          meta: { error, response },
        });
        // Try to notify with minimal info
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
          activationLogger.error('[deviceCodeFlow] Failed to notify device code error', {
            meta: notifyError,
          });
        }
      }
    },
    scopes,
  };

  const tokenResponse = await pca.acquireTokenByDeviceCode(deviceCodeRequest);
  if (tokenResponse && tokenResponse.accessToken) {
    await context.secrets.store(secretKey, tokenResponse.accessToken);
    if (legacyKey !== secretKey) {
      await context.secrets.delete(legacyKey);
    }
    return tokenResponse.accessToken;
  }

  throw new Error('Failed to acquire Entra ID token.');
}
