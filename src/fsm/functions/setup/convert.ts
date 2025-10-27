import * as vscode from 'vscode';
import type { ProjectConnection } from '../../machines/applicationMachine.js';

export async function convertConnectionToEntra(
  context: vscode.ExtensionContext,
  connections: ProjectConnection[],
  saveFn: (connections: ProjectConnection[]) => Promise<void>,
  ensureActiveFn: (
    context: vscode.ExtensionContext,
    connectionId?: string,
    options?: { refresh?: boolean }
  ) => Promise<any>
): Promise<void> {
  // Filter for non-Entra connections (PAT or undefined authMethod)
  const patConnections = connections.filter((c) => c.authMethod !== 'entra');
  console.log('[convertConnectionToEntra] Found connections:', {
    totalConnections: connections.length,
    patConnections: patConnections.length,
    connectionAuthMethods: connections.map((c) => ({ id: c.id, authMethod: c.authMethod })),
  });

  if (patConnections.length === 0) {
    vscode.window.showInformationMessage('No PAT-based connections to convert.');
    return;
  }

  const choice = await vscode.window.showQuickPick(
    patConnections.map((c) => ({
      label: c.label || `${c.organization}/${c.project}`,
      connection: c,
    })),
    {
      placeHolder: 'Select a connection to convert to Entra ID',
    }
  );

  if (!choice) return;

  const newConnections = connections.map((c) => {
    if (c.id === choice.connection.id) {
      // Remove PAT-specific fields and set to Entra
      const { patKey, ...rest } = c;
      return { ...rest, authMethod: 'entra' as const };
    }
    return c;
  });

  await saveFn(newConnections);

  // Inform user and trigger device code flow
  vscode.window.showInformationMessage(
    `Connection "${choice.label}" converted to Microsoft Entra ID. Starting sign-in flow...`
  );

  // Trigger connection refresh which will start device code flow for Entra
  await ensureActiveFn(context, choice.connection.id, { refresh: true, interactive: true });

  // Also dispatch sign-in event to trigger device code UI
  const { sendApplicationStoreEvent } = await import('../../services/extensionHostBridge.js');
  sendApplicationStoreEvent({
    type: 'SIGN_IN_ENTRA',
    connectionId: choice.connection.id,
  });

  console.log('[convertConnectionToEntra] Triggered Entra sign-in for:', choice.connection.id);
}
