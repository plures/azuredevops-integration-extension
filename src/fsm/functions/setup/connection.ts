import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import { parseAzureDevOpsUrl } from '../../../azureDevOpsUrlParser.js';
import type { ProjectConnection } from '../../machines/applicationMachine.js';
import { AzureDevOpsIntClient } from '../../../azureClient.js';

async function testPATConnection(
  organization: string,
  project: string,
  pat: string,
  baseUrl?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const client = new AzureDevOpsIntClient(organization, project, pat, { baseUrl });
    const userId = await client.getAuthenticatedUserId();
    if (userId) {
      return { success: true };
    } else {
      return {
        success: false,
        message: 'Authentication failed. Could not retrieve user identity.',
      };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function addOrEditConnection(
  context: vscode.ExtensionContext,
  connections: ProjectConnection[],
  saveFn: (connections: ProjectConnection[]) => Promise<void>,
  ensureActiveFn: (
    context: vscode.ExtensionContext,
    connectionId?: string,
    options?: { refresh?: boolean }
  ) => Promise<any>,
  connectionToEdit?: ProjectConnection
): Promise<void> {
  const isEditing = !!connectionToEdit;
  const urlValue =
    connectionToEdit && connectionToEdit.organization && connectionToEdit.project
      ? `https://dev.azure.com/${connectionToEdit.organization}/${connectionToEdit.project}`
      : '';

  const url = await vscode.window.showInputBox({
    prompt: isEditing
      ? `Editing connection: ${connectionToEdit.label || connectionToEdit.id}`
      : 'Enter an Azure DevOps work item URL to auto-configure your connection',
    value: urlValue,
    placeHolder: 'https://dev.azure.com/myorg/myproject/_workitems/edit/123',
  });

  if (!url) return;

  const parsed = parseAzureDevOpsUrl(url);
  if (!parsed) {
    vscode.window.showErrorMessage('Invalid Azure DevOps URL');
    return;
  }

  const { organization, project, baseUrl } = parsed;

  const authMethod = (await vscode.window.showQuickPick(
    ['Personal Access Token (PAT)', 'Microsoft Entra ID'],
    {
      placeHolder: 'Choose authentication method',
    }
  )) as 'Personal Access Token (PAT)' | 'Microsoft Entra ID' | undefined;

  if (!authMethod) return;

  const newOrUpdatedConnection: ProjectConnection = {
    id: connectionToEdit?.id || randomUUID(),
    organization,
    project,
    baseUrl,
    authMethod: authMethod === 'Personal Access Token (PAT)' ? 'pat' : 'entra',
    label: `${organization}/${project}`,
  };

  if (newOrUpdatedConnection.authMethod === 'pat') {
    const pat = await vscode.window.showInputBox({
      prompt: 'Enter your Personal Access Token',
      password: true,
    });
    if (!pat) return;

    const testResult = await testPATConnection(organization, project, pat, baseUrl);
    if (!testResult.success) {
      vscode.window.showErrorMessage(`Connection test failed: ${testResult.message}`);
      return;
    }

    const patKey = `azureDevOpsInt.pat:${newOrUpdatedConnection.id}`;
    newOrUpdatedConnection.patKey = patKey; // CRITICAL: Add patKey to connection object
    await context.secrets.store(patKey, pat);
  }

  const newConnections = [...connections];
  const existingIndex = newConnections.findIndex((c) => c.id === newOrUpdatedConnection.id);

  if (existingIndex > -1) {
    newConnections[existingIndex] = newOrUpdatedConnection;
  } else {
    newConnections.push(newOrUpdatedConnection);
  }

  await saveFn(newConnections);
  await ensureActiveFn(context, newOrUpdatedConnection.id, { refresh: true });

  vscode.window.showInformationMessage(
    `Connection ${isEditing ? 'updated' : 'added'} successfully.`
  );
}
