import type { ExtensionContext } from 'vscode';
import * as msal from '@azure/msal-node';
import * as vscode from 'vscode';

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

export async function getEntraIdToken(
  context: ExtensionContext,
  tenantId?: string
): Promise<string> {
  if (!tenantId) {
    throw new Error('Tenant ID is not defined for this connection.');
  }

  const pca = new msal.PublicClientApplication(msalConfig);
  const deviceCodeRequest = {
    deviceCodeCallback: (response: msal.DeviceCodeResponse) => {
      vscode.window.showInformationMessage(response.message);
    },
    scopes: ['499b84ac-1321-427f-aa17-267ca6975798/.default'], // Azure DevOps scope
  };

  try {
    const tokenResponse = await pca.acquireTokenByDeviceCode(deviceCodeRequest);
    if (tokenResponse && tokenResponse.accessToken) {
      return tokenResponse.accessToken;
    } else {
      throw new Error('Failed to acquire Entra ID token.');
    }
  } catch (error) {
    throw new Error(`Entra ID token acquisition failed: ${error}`);
  }
}
