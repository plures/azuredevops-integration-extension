import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import { parseAzureDevOpsUrl } from '../../../azureDevOpsUrlParser.js';
import type { ProjectConnection } from '../../machines/applicationMachine.js';
import { AzureDevOpsIntClient } from '../../../azureClient.js';
import { runEnhancedSetupWizard } from './enhanced-setup-wizard.js';
import { sendApplicationStoreEvent } from '../../services/extensionHostBridge.js';

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

/**
 * Enhanced connection setup using intelligent auto-detection
 * Supports both Online and OnPremises with minimal user input
 */
export async function addOrEditConnection(
  context: vscode.ExtensionContext,
  connections: ProjectConnection[],
  saveFn: (connections: ProjectConnection[]) => Promise<void>,
  ensureActiveFn: (
    context: vscode.ExtensionContext,
    connectionId?: string,
    options?: { refresh?: boolean; interactive?: boolean }
  ) => Promise<any>,
  connectionToEdit?: ProjectConnection
): Promise<void> {
  const isEditing = !!connectionToEdit;
  const urlValue =
    connectionToEdit && connectionToEdit.organization && connectionToEdit.project
      ? connectionToEdit.baseUrl
        ? `${connectionToEdit.baseUrl}/${connectionToEdit.organization}/${connectionToEdit.project}/_workitems/edit/1`
        : `https://dev.azure.com/${connectionToEdit.organization}/${connectionToEdit.project}/_workitems/edit/1`
      : '';

  // Step 1: Get work item URL
  const url = await vscode.window.showInputBox({
    prompt: isEditing
      ? `Editing connection: ${connectionToEdit.label || connectionToEdit.id}`
      : 'Enter an Azure DevOps work item URL to auto-configure your connection',
    value: urlValue,
    placeHolder: 'https://dev.azure.com/myorg/myproject/_workitems/edit/123',
  });

  if (!url) return;

  // Step 2: Parse URL
  const parsed = parseAzureDevOpsUrl(url);
  if (!parsed.isValid) {
    vscode.window.showErrorMessage(
      `Invalid Azure DevOps URL: ${parsed.error || 'Unable to parse URL'}`
    );
    return;
  }

  // Step 3: Run enhanced setup wizard
  const setupResult = await runEnhancedSetupWizard({
    parsedUrl: parsed,
    connectionToEdit,
  });

  if (!setupResult) return; // User cancelled

  // Step 4: Validate connection if PAT (Entra ID validation happens later)
  if (setupResult.authMethod === 'pat' && setupResult.pat) {
    const testResult = await testPATConnection(
      setupResult.connection.organization!,
      setupResult.connection.project!,
      setupResult.pat,
      setupResult.connection.baseUrl
    );

    if (!testResult.success) {
      vscode.window.showErrorMessage(
        `Connection test failed: ${testResult.message}\n\nPlease verify your PAT and try again.`
      );
      return;
    }
  }

  // Step 5: Create connection object
  const connectionId = connectionToEdit?.id || randomUUID();
  const newOrUpdatedConnection: ProjectConnection = {
    id: connectionId,
    organization: setupResult.connection.organization!,
    project: setupResult.connection.project!,
    baseUrl: setupResult.connection.baseUrl!,
    apiBaseUrl: setupResult.connection.apiBaseUrl || setupResult.connection.baseUrl!,
    authMethod: setupResult.authMethod,
    label:
      setupResult.connection.label ||
      `${setupResult.connection.organization}/${setupResult.connection.project}`,
    team: setupResult.connection.team,
    tenantId: setupResult.connection.tenantId,
    identityName: setupResult.identityName || setupResult.connection.identityName,
  };

  // Step 6: Store credentials
  if (setupResult.authMethod === 'pat' && setupResult.pat) {
    const patKey = `azureDevOpsInt.pat:${connectionId}`;
    newOrUpdatedConnection.patKey = patKey;
    await context.secrets.store(patKey, setupResult.pat);
  }

  // Step 7: Save connection
  const newConnections = [...connections];
  const existingIndex = newConnections.findIndex((c) => c.id === connectionId);

  if (existingIndex > -1) {
    newConnections[existingIndex] = newOrUpdatedConnection;
  } else {
    newConnections.push(newOrUpdatedConnection);
  }

  await saveFn(newConnections);

  // Step 8: Set as active and ensure connection
  await ensureActiveFn(context, connectionId, { refresh: true });

  // Step 9: Trigger Entra ID auth if needed
  if (setupResult.authMethod === 'entra') {
    // Save connection first, then trigger authentication
    sendApplicationStoreEvent({
      type: 'SIGN_IN_ENTRA',
      connectionId: connectionId,
      forceInteractive: true,
    });

    vscode.window.showInformationMessage(
      `Connection ${isEditing ? 'updated' : 'added'} successfully. Starting Microsoft Entra ID authentication...`
    );
  } else {
    vscode.window.showInformationMessage(
      `Connection ${isEditing ? 'updated' : 'added'} successfully.`
    );
  }
}
