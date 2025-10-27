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

  const connectionLabel =
    selectedConnection.label || `${selectedConnection.organization}/${selectedConnection.project}`;

  // Confirm with user before proceeding
  const confirm = await vscode.window.showWarningMessage(
    `Convert "${connectionLabel}" from PAT to Microsoft Entra ID?\n\n` +
      `You will need to sign in with your Microsoft account. ` +
      `Your PAT will only be removed after successful sign-in.`,
    { modal: true },
    'Convert and Sign In',
    'Cancel'
  );

  if (confirm !== 'Convert and Sign In') {
    console.log('[convertConnectionToEntra] User cancelled confirmation');
    return;
  }

  try {
    console.log('[convertConnectionToEntra] Converting and saving connection...');

    // Save the conversion FIRST so connection FSM sees it as Entra
    const newConnections = connections.map((c) => {
      if (c.id === selectedConnection.id) {
        // Remove PAT-specific fields and set to Entra
        const { patKey, ...rest } = c;
        console.log('[convertConnectionToEntra] Converting connection:', {
          id: c.id,
          oldAuthMethod: c.authMethod || 'pat',
          newAuthMethod: 'entra',
          removedPatKey: !!patKey,
        });
        return { ...rest, authMethod: 'entra' as const };
      }
      return c;
    });

    console.log('[convertConnectionToEntra] Saving converted connection...');
    await saveFn(newConnections);
    console.log('[convertConnectionToEntra] ✅ Connection converted to Entra and saved');

    // CRITICAL: Reload window to pick up the saved Entra connection
    // This ensures connection FSM gets the updated authMethod='entra'
    vscode.window
      .showInformationMessage(
        `Connection converted to Microsoft Entra ID!\n\n` +
          `Reloading to start device code sign-in...`,
        'Reload Now'
      )
      .then((choice) => {
        if (choice === 'Reload Now') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      });

    console.log('[convertConnectionToEntra] ✅ Conversion complete - user prompted to reload');
    console.log(
      '[convertConnectionToEntra] After reload, connection FSM will detect authMethod=entra ' +
        'and automatically start device code flow'
    );
  } catch (error) {
    console.error('[convertConnectionToEntra] ❌ Error during conversion:', error);

    // Try to rollback
    try {
      console.log('[convertConnectionToEntra] Attempting rollback...');
      await saveFn(connections); // Restore original
      console.log('[convertConnectionToEntra] ✅ Rolled back to PAT');
      vscode.window.showErrorMessage(
        `Conversion failed and was rolled back: ${error instanceof Error ? error.message : String(error)}\n\n` +
          `Connection remains as PAT.`
      );
    } catch (rollbackError) {
      console.error('[convertConnectionToEntra] ❌ Rollback failed:', rollbackError);
      vscode.window.showErrorMessage(
        `Conversion failed: ${error instanceof Error ? error.message : String(error)}\n\n` +
          `Please manually edit the connection in settings if needed.`
      );
    }
  }
}
