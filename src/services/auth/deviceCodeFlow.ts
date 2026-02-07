/**
 * Device Code Flow Helpers
 * Extracted from authentication.ts to reduce file size
 */

import * as vscode from 'vscode';
import { enrichDeviceCodeResponse } from './deviceCodeHelpers.js';
import { createLogger } from '../../logging/unifiedLogger.js';

const logger = createLogger('auth-device-code');

export type DeviceCodeInfo = {
  userCode?: string;
  verificationUri: string;
  verificationUriComplete?: string;
  expiresInSeconds: number;
  message?: string;
};

export type DeviceCodeOptions = {
  connectionId?: string;
  connectionLabel?: string;
  onDeviceCode?: (info: {
    userCode: string;
    verificationUri: string;
    verificationUriComplete?: string;
    expiresInSeconds: number;
  }) => void;
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

async function copyDeviceCodeToClipboard(userCode: string | undefined): Promise<void> {
  if (!userCode) return;

  try {
    await vscode.env.clipboard.writeText(userCode);
  } catch (error) {
    logger.warn('[copyDeviceCodeToClipboard] Failed to copy device code', { meta: error });
  }
}

async function openBrowserForDeviceCode(info: DeviceCodeInfo): Promise<void> {
  const target = info.verificationUriComplete || info.verificationUri;
  try {
    await vscode.env.openExternal(vscode.Uri.parse(target));
  } catch (error) {
    logger.warn('[openBrowserForDeviceCode] Failed to open browser', { meta: error });
    vscode.window.showErrorMessage('Failed to open browser. Please open it manually.');
  }
}

export async function notifyDeviceCode(
  info: DeviceCodeInfo,
  options: DeviceCodeOptions
): Promise<void> {
  if (!info.userCode || info.userCode.trim() === '') {
    logger.warn('[notifyDeviceCode] Device code is missing', {
      meta: { hasVerificationUri: !!info.verificationUri },
    });
    vscode.window.showErrorMessage('Device code is not available. Please try signing in again.');
    return;
  }

  await copyDeviceCodeToClipboard(info.userCode);

  const label = options.connectionLabel || options.connectionId || 'Microsoft Entra ID';
  const message = `To sign in to ${label}, use a web browser to open ${info.verificationUri} and enter the code ${info.userCode} to authenticate.`;

  const openInBrowser = 'Open in Browser';

  void vscode.window
    .showInformationMessage(message, openInBrowser)
    .then(async (action) => {
      if (action !== openInBrowser) return;

      vscode.window.showInformationMessage(
        `Device code ${info.userCode} copied to clipboard. Paste it into the browser to finish signing in.`
      );

      await openBrowserForDeviceCode(info);
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
      logger.error('[notifyDeviceCode] Error in onDeviceCode callback', { meta: error });
    });
  }
}
