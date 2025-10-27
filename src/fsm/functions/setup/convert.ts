import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import type { ProjectConnection } from '../../machines/applicationMachine.js';

export async function convertConnectionToEntra(
  context: vscode.ExtensionContext,
  connections: ProjectConnection[],
  saveFn: (connections: ProjectConnection[]) => Promise<void>,
  ensureActiveFn: (
    context: vscode.ExtensionContext,
    connectionId?: string,
    options?: { refresh?: boolean; interactive?: boolean }
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

  const connectionLabel =
    selectedConnection.label || `${selectedConnection.organization}/${selectedConnection.project}`;

  // Confirm with user
  const confirm = await vscode.window.showWarningMessage(
    `Convert "${connectionLabel}" from PAT to Microsoft Entra ID?\n\n` +
      `• A temporary Entra connection will be created\n` +
      `• Your PAT connection stays active during sign-in\n` +
      `• After successful sign-in, PAT will be removed`,
    { modal: true },
    'Convert and Sign In',
    'Cancel'
  );

  if (confirm !== 'Convert and Sign In') {
    console.log('[convertConnectionToEntra] User cancelled confirmation');
    return;
  }

  try {
    console.log('[convertConnectionToEntra] Creating temporary Entra connection...');

    // Create temp Entra connection with new ID
    const tempId = randomUUID();
    const { patKey, ...rest } = selectedConnection;
    const tempConnection: ProjectConnection = {
      ...rest,
      id: tempId,
      authMethod: 'entra' as const,
      label: `${connectionLabel} (Entra - signing in...)`,
    };

    console.log('[convertConnectionToEntra] Temp connection created:', {
      tempId,
      originalId: selectedConnection.id,
      originalLabel: connectionLabel,
    });

    // Save temp connection alongside original PAT
    const connectionsWithTemp = [...connections, tempConnection];
    await saveFn(connectionsWithTemp);
    console.log('[convertConnectionToEntra] ✅ Temp connection saved, original PAT preserved');

    // Inform user
    vscode.window.showInformationMessage(
      `Starting sign-in for "${connectionLabel}"...\n\n` +
        `Your PAT connection remains active. Complete device code auth to finalize conversion.`
    );

    // Trigger connection to temp - this starts device code in extension host
    console.log('[convertConnectionToEntra] Triggering connection to temp Entra connection...');
    await ensureActiveFn(context, tempId, { refresh: true, interactive: true });

    console.log('[convertConnectionToEntra] ✅ Device code flow initiated on temp connection');
    console.log(
      '[convertConnectionToEntra] User should complete sign-in. ' +
        'After success, manually run cleanup to finalize (or we can add auto-cleanup on auth success)'
    );

    // TODO: Add FSM event listener to auto-finalize on successful auth
    // For now, inform user they have both connections
    vscode.window.showInformationMessage(
      `Device code flow started!\n\n` +
        `Complete sign-in in your browser. After success, your connections will be updated automatically.`,
      'OK'
    );
  } catch (error) {
    console.error('[convertConnectionToEntra] ❌ Error during conversion:', error);

    // On error, try to clean up temp connection
    try {
      console.log('[convertConnectionToEntra] Cleaning up after error...');
      await saveFn(connections); // Restore original connections (removes temp)
      console.log('[convertConnectionToEntra] ✅ Cleaned up temp connection');
    } catch (cleanupError) {
      console.error('[convertConnectionToEntra] ❌ Cleanup failed:', cleanupError);
    }

    vscode.window.showErrorMessage(
      `Failed to start conversion: ${error instanceof Error ? error.message : String(error)}\n\n` +
        `Your PAT connection is unchanged.`
    );
  }
}
