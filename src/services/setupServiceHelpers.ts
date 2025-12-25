/**
 * Helper functions for setup service
 */

import * as vscode from 'vscode';
import type { ProjectConnection } from '../types/application.js';
import type { ExtensionContext } from 'vscode';

export interface ConnectionInfo {
  organization: string;
  project: string;
  baseUrl: string;
}

/**
 * Parse work item URL to extract connection info
 */
export function parseWorkItemUrl(url: string): ConnectionInfo | null {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);

    // Handle dev.azure.com/org/project pattern
    if (parsed.hostname === 'dev.azure.com') {
      if (pathParts.length >= 2) {
        return {
          organization: pathParts[0],
          project: pathParts[1],
          baseUrl: `https://dev.azure.com/${pathParts[0]}`,
        };
      }
    }

    // Handle org.visualstudio.com/project pattern
    const vsMatch = parsed.hostname.match(/^(.+)\.visualstudio\.com$/);
    if (vsMatch && pathParts.length >= 1) {
      return {
        organization: vsMatch[1],
        project: pathParts[0],
        baseUrl: `https://${vsMatch[1]}.visualstudio.com`,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Show URL input dialog
 */
export async function showUrlInput(): Promise<string | undefined> {
  return await vscode.window.showInputBox({
    prompt: 'Enter an Azure DevOps work item URL to auto-configure your connection',
    placeHolder: 'https://dev.azure.com/myorg/myproject/_workitems/edit/123',
    validateInput: (value) => {
      if (!value) return 'URL is required';
      if (!value.includes('_workitems')) return 'Please provide a work item URL';
      return null;
    },
  });
}

/**
 * Create new connection from connection info and credentials
 */
export function createConnectionFromInfo(
  connectionInfo: ConnectionInfo,
  authMethod: 'pat' | 'entra',
  credentials: { token?: string; tenantId?: string; clientId?: string }
): ProjectConnection {
  const connectionId = `${connectionInfo.organization}-${connectionInfo.project}-${Date.now()}`;
  return {
    id: connectionId,
    organization: connectionInfo.organization,
    project: connectionInfo.project,
    baseUrl: connectionInfo.baseUrl,
    authMethod,
    ...(authMethod === 'pat' && credentials.token ? { patKey: `pat-${connectionId}` } : {}),
    ...(authMethod === 'entra' && credentials.tenantId ? { tenantId: credentials.tenantId } : {}),
    ...(authMethod === 'entra' && credentials.clientId ? { clientId: credentials.clientId } : {}),
  };
}

/**
 * Save connection and update bridge reader
 */
export async function saveConnection(
  context: ExtensionContext,
  connection: ProjectConnection,
  existingConnections: ProjectConnection[],
  credentials?: { token?: string }
): Promise<void> {
  // Save PAT if using PAT auth
  if (connection.authMethod === 'pat' && credentials?.token) {
    await context.secrets.store(`pat-${connection.id}`, credentials.token);
  }

  // Save connection
  const settings = vscode.workspace.getConfiguration('azureDevOpsIntegration');
  const updatedConnections = [...existingConnections, connection];
  await settings.update('connections', updatedConnections, vscode.ConfigurationTarget.Global);

  // Update bridge reader
  try {
    const { setLoadedConnectionsReader } = await import('../services/extensionHostBridge.js');
    setLoadedConnectionsReader(() => updatedConnections);
  } catch {
    // Swallow errors updating bridge reader
  }
}
