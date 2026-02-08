/**
 * Helper functions for device code authentication flow
 */
import type { ExtensionContext } from "vscode";
import * as msal from "@azure/msal-node";
import { createLogger } from "../../logging/unifiedLogger.js";

const logger = createLogger("device-code-flow");

type DeviceCodeCallbackOptions = {
  resolvedTenantId: string;
  options: any;
  normalizeDeviceCodeResponse: (response: any) => any;
  notifyDeviceCode: (info: any, options: any) => Promise<void>;
};

/**
 * Create the device code callback handler
 */
export function createDeviceCodeCallback(
  callbackOptions: DeviceCodeCallbackOptions,
) {
  return async (response: any) => {
    try {
      const info = callbackOptions.normalizeDeviceCodeResponse(response);
      if (!info || !info.userCode || info.userCode.trim() === "") {
        logger.error(
          "[deviceCodeCallback] Invalid device code response received",
          {
            meta: { response, hasUserCode: !!info?.userCode },
          },
        );
        // Still try to notify, but it will show an error
        try {
          await callbackOptions.notifyDeviceCode(
            {
              userCode: "",
              verificationUri:
                info?.verificationUri || "https://microsoft.com/devicelogin",
              expiresInSeconds: info?.expiresInSeconds || 900,
            },
            callbackOptions.options,
          );
        } catch (notifyError) {
          logger.error(
            "[deviceCodeCallback] Failed to notify device code error",
            {
              meta: notifyError,
            },
          );
        }
        return;
      }
      try {
        await callbackOptions.notifyDeviceCode(info, callbackOptions.options);
      } catch (notifyError) {
        logger.error("[deviceCodeCallback] Error in notifyDeviceCode", {
          meta: { notifyError, hasUserCode: !!info?.userCode },
        });
        // Don't rethrow - allow authentication to continue even if notification fails
      }
    } catch (error) {
      logger.error("[deviceCodeCallback] Error in deviceCodeCallback", {
        meta: { error, response },
      });
      // Try to notify with minimal info so user knows something went wrong
      try {
        await callbackOptions.notifyDeviceCode(
          {
            userCode: "",
            verificationUri: "https://microsoft.com/devicelogin",
            expiresInSeconds: 900,
          },
          callbackOptions.options,
        );
      } catch (notifyError) {
        logger.error(
          "[deviceCodeCallback] Failed to notify device code error",
          {
            meta: notifyError,
          },
        );
        // Ignore notification errors if we're already in error state
      }
    }
  };
}

/**
 * Attempt to acquire token using device code flow
 */
export async function attemptDeviceCodeAcquisition(
  context: ExtensionContext,
  clientId: string,
  authorityTenant: string,
  resolvedTenantId: string,
  scopes: string[],
  legacyKey: string,
  deviceCodeCallback: (response: any) => Promise<void>,
): Promise<string> {
  const pca = new msal.PublicClientApplication({
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${authorityTenant}`,
    },
  });

  const targetKey = `entra:${resolvedTenantId}:${clientId}`;

  const deviceCodeRequest = {
    deviceCodeCallback,
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

  throw new Error("Failed to acquire Entra ID token.");
}
