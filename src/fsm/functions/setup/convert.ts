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
    console.log('[convertConnectionToEntra] Starting Entra device code flow...');

    // Start device code flow FIRST, before saving
    vscode.window.showInformationMessage(
      `Starting Microsoft Entra sign-in for "${connectionLabel}"...`
    );

    // Dispatch sign-in event to trigger device code flow
    const { sendApplicationStoreEvent } = await import('../../services/extensionHostBridge.js');
    sendApplicationStoreEvent({
      type: 'SIGN_IN_ENTRA',
      connectionId: selectedConnection.id,
    });

    // Wait for device code session to start
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Check if device code session started
    const { getApplicationStoreActor } = await import('../../services/extensionHostBridge.js');
    const actor = getApplicationStoreActor();
    const snapshot = (actor as any)?.getSnapshot?.();
    const deviceCodeSession = snapshot?.context?.deviceCodeSession;

    if (!deviceCodeSession || deviceCodeSession.connectionId !== selectedConnection.id) {
      // Device code didn't start - abort conversion
      console.warn(
        '[convertConnectionToEntra] ⚠️  Device code flow did not start, aborting conversion'
      );
      vscode.window.showWarningMessage(
        `Could not start Entra sign-in flow. Connection remains as PAT.\n\n` +
          `Please ensure you have network connectivity and try again.`
      );
      return;
    }

    console.log('[convertConnectionToEntra] ✅ Device code session started successfully');

    // NOW save the conversion since device code is active
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

    console.log('[convertConnectionToEntra] Device code active, saving conversion...');
    await saveFn(newConnections);
    console.log('[convertConnectionToEntra] ✅ Conversion saved');

    vscode.window.showInformationMessage(
      `Device code ready! Complete sign-in in your browser to finish conversion.\n\n` +
        `If sign-in fails, you can revert by editing the connection and choosing PAT.`,
      'OK'
    );

    console.log(
      '[convertConnectionToEntra] ✅ Conversion complete, waiting for user to authenticate'
    );
  } catch (error) {
    console.error('[convertConnectionToEntra] ❌ Error during conversion:', error);
    vscode.window.showErrorMessage(
      `Failed to convert connection: ${error instanceof Error ? error.message : String(error)}\n\n` +
        `Connection remains as PAT.`
    );
  }
}
