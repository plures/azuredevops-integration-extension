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

  // If only one PAT connection, use it directly without prompting
  let selectedConnection: ProjectConnection;
  if (patConnections.length === 1) {
    selectedConnection = patConnections[0];
    console.log('[convertConnectionToEntra] Only 1 PAT connection, auto-selecting:', {
      id: selectedConnection.id,
      label: selectedConnection.label,
    });
  } else {
    // Multiple PAT connections - show picker
    const items = patConnections.map((c) => ({
      label: c.label || `${c.organization}/${c.project}`,
      description: c.id,
      connection: c,
    }));

    console.log(
      '[convertConnectionToEntra] Showing QuickPick with items:',
      items.map((i) => i.label)
    );

    const choice = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a connection to convert to Entra ID',
      ignoreFocusOut: true,
    });

    if (!choice) {
      console.log('[convertConnectionToEntra] User cancelled selection');
      return;
    }

    selectedConnection = choice.connection;
  }

  console.log('[convertConnectionToEntra] Selected connection to convert:', {
    connectionId: selectedConnection.id,
    label:
      selectedConnection.label ||
      `${selectedConnection.organization}/${selectedConnection.project}`,
  });

  try {
    const newConnections = connections.map((c) => {
      if (c.id === selectedConnection.id) {
        // Remove PAT-specific fields and set to Entra
        const { patKey, ...rest } = c;
        console.log('[convertConnectionToEntra] Converting connection:', {
          id: c.id,
          oldAuthMethod: c.authMethod,
          newAuthMethod: 'entra',
          removedPatKey: !!patKey,
        });
        return { ...rest, authMethod: 'entra' as const };
      }
      return c;
    });

    console.log('[convertConnectionToEntra] Saving updated connections...');
    await saveFn(newConnections);
    console.log('[convertConnectionToEntra] Connections saved successfully');

    // Inform user and trigger device code flow
    vscode.window.showInformationMessage(
      `Connection "${choice.label}" converted to Microsoft Entra ID. Starting sign-in flow...`
    );

    console.log(
      '[convertConnectionToEntra] Triggering connection refresh with interactive auth...'
    );
    // Trigger connection refresh which will start device code flow for Entra
    await ensureActiveFn(context, choice.connection.id, { refresh: true, interactive: true });

    console.log('[convertConnectionToEntra] Dispatching SIGN_IN_ENTRA event...');
    // Also dispatch sign-in event to trigger device code UI
    const { sendApplicationStoreEvent } = await import('../../services/extensionHostBridge.js');
    sendApplicationStoreEvent({
      type: 'SIGN_IN_ENTRA',
      connectionId: choice.connection.id,
    });

    console.log('[convertConnectionToEntra] ✅ Triggered Entra sign-in for:', choice.connection.id);
  } catch (error) {
    console.error('[convertConnectionToEntra] ❌ Error during conversion:', error);
    vscode.window.showErrorMessage(
      `Failed to convert connection: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
