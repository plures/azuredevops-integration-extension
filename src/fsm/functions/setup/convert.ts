import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import type { ProjectConnection } from '../../machines/applicationMachine.js';

/**
 * Check if temp Entra connection succeeded, and if so, finalize the conversion
 * by deleting the PAT and renaming the temp connection.
 */
async function finalizeConversionIfSuccessful(
  context: vscode.ExtensionContext,
  originalPatId: string,
  tempEntraId: string,
  originalLabel: string,
  saveFn: (connections: ProjectConnection[]) => Promise<void>
): Promise<void> {
  try {
    console.log('[finalizeConversion] Checking if temp Entra connection succeeded...');

    // Get current connections and FSM state
    const settings = vscode.workspace.getConfiguration('azureDevOpsIntegration');
    const currentConnections = settings.get<ProjectConnection[]>('connections', []);

    const { getApplicationStoreActor } = await import('../../services/extensionHostBridge.js');
    const actor = getApplicationStoreActor();
    const snapshot = (actor as any)?.getSnapshot?.();
    const connectionStates = snapshot?.context?.connectionStates;
    const tempConnectionState = connectionStates?.get(tempEntraId);

    // Check if temp Entra connection is authenticated and connected
    const isAuthenticated = !!(
      tempConnectionState?.isConnected &&
      (tempConnectionState?.client || tempConnectionState?.accessToken)
    );

    console.log('[finalizeConversion] Temp connection state:', {
      tempId: tempEntraId,
      isConnected: tempConnectionState?.isConnected,
      hasClient: !!tempConnectionState?.client,
      hasAccessToken: !!tempConnectionState?.accessToken,
      isAuthenticated,
    });

    if (isAuthenticated) {
      console.log('[finalizeConversion] ✅ Temp Entra auth succeeded! Finalizing conversion...');

      // Finalize: Replace PAT with converted Entra (using original ID and label)
      const finalConnections = currentConnections
        .filter((c) => c.id !== originalPatId && c.id !== tempEntraId) // Remove both
        .concat([
          {
            ...currentConnections.find((c) => c.id === tempEntraId)!,
            id: originalPatId, // Use original ID
            label: originalLabel, // Use original label
            isBeingReplaced: undefined,
            replacementId: undefined,
          },
        ]);

      await saveFn(finalConnections);
      console.log('[finalizeConversion] ✅ Finalized: PAT deleted, temp renamed to original');

      vscode.window.showInformationMessage(
        `✅ Successfully converted "${originalLabel}" to Microsoft Entra ID!\n\n` +
          `Your PAT connection has been removed.`
      );

      // Switch to the finalized connection
      const activeConnectionId = context.globalState.get<string>(
        'azureDevOpsInt.activeConnectionId'
      );
      if (activeConnectionId === tempEntraId) {
        await context.globalState.update('azureDevOpsInt.activeConnectionId', originalPatId);
      }
    } else {
      console.log(
        '[finalizeConversion] ⏳ Temp connection not authenticated yet, will retry later'
      );

      // Schedule another check in 15 seconds
      setTimeout(async () => {
        await finalizeConversionIfSuccessful(
          context,
          originalPatId,
          tempEntraId,
          originalLabel,
          saveFn
        );
      }, 15000);
    }
  } catch (error) {
    console.error('[finalizeConversion] Error during finalization:', error);
    // Don't show error to user - they can manually clean up if needed
  }
}

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

    // Mark original PAT for replacement
    const connectionsWithTempAndMarked = connections.map((c) => {
      if (c.id === selectedConnection.id) {
        return {
          ...c,
          isBeingReplaced: true,
          replacementId: tempId,
          label: `${c.label || connectionLabel} (will be removed after Entra sign-in)`,
        };
      }
      return c;
    });

    // Add temp connection
    connectionsWithTempAndMarked.push(tempConnection);

    await saveFn(connectionsWithTempAndMarked);
    console.log(
      '[convertConnectionToEntra] ✅ Temp connection saved, original marked for replacement'
    );

    // Inform user
    vscode.window.showInformationMessage(
      `Starting sign-in for "${connectionLabel}"...\n\n` +
        `Your PAT connection remains active. Complete device code auth to finalize conversion.`
    );

    // Trigger connection to temp - this starts device code in extension host
    console.log('[convertConnectionToEntra] Triggering connection to temp Entra connection...');
    await ensureActiveFn(context, tempId, { refresh: true, interactive: true });

    console.log('[convertConnectionToEntra] ✅ Device code flow initiated on temp connection');

    // Schedule auto-finalization check after user has time to auth
    setTimeout(async () => {
      await finalizeConversionIfSuccessful(
        context,
        selectedConnection.id,
        tempId,
        connectionLabel,
        saveFn
      );
    }, 10000); // Check after 10 seconds

    vscode.window.showInformationMessage(
      `Device code flow started!\n\n` +
        `Complete sign-in in your browser. After successful auth, the PAT connection will be automatically removed.`,
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
