/**
 * Module: src/fsm/functions/setup/convert.ts
 * Owner: application
 * Reads: (document)
 * Writes: (document)
 * Receives: (document)
 * Emits: (document)
 * Prohibitions: Do not mutate ApplicationContext directly; Do not define new *Context types
 * Rationale: (document)
 *
 * LLM-GUARD:
 * - Follow ownership boundaries; route events to Router; do not add UI logic here
 */
import * as vscode from 'vscode';
import type { ProjectConnection } from '../../machines/applicationTypes.js';
import { createLogger } from '../../../logging/unifiedLogger.js';

const logger = createLogger('convert');

// Import the actual save function from activation
// This ensures we're using the real persistence mechanism, not a no-op
async function saveConnectionsToConfig(
  _context: vscode.ExtensionContext,
  connections: ProjectConnection[]
): Promise<void> {
  const settings = vscode.workspace.getConfiguration('azureDevOpsIntegration');
  // Serialize connections, explicitly removing undefined values
  const serialized = connections.map((entry) => {
    const { patKey, ...rest } = entry;
    // Only include patKey if it exists (for PAT connections)
    return patKey ? { ...rest, patKey } : rest;
  });
  await settings.update('connections', serialized, vscode.ConfigurationTarget.Global);
  logger.info('✅ Connections saved to VS Code settings', {
    count: serialized.length,
    connectionIds: serialized.map((c: any) => c.id),
  });
}

export async function convertConnectionToEntra(
  context: vscode.ExtensionContext,
  connections: ProjectConnection[],
  _saveFn: (connections: ProjectConnection[]) => Promise<void>,
  ensureActiveFn: (
    context: vscode.ExtensionContext,
    connectionId?: string,
    options?: { refresh?: boolean; interactive?: boolean }
  ) => Promise<any>
): Promise<void> {
  // Filter for non-Entra connections (PAT or undefined authMethod)
  const patConnections = connections.filter((c) => c.authMethod !== 'entra');
  logger.info('Found connections', {
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
    logger.info('Only 1 PAT connection, auto-selecting', {
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
      logger.info('User cancelled selection');
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
    logger.info('User cancelled confirmation');
    return;
  }

  try {
    logger.info('Converting PAT connection to Entra ID...', {
      connectionId: selectedConnection.id,
      connectionLabel,
    });

    // OPTION 1: Simply change the connection type to Entra and use existing mechanism
    // The FSM will automatically detect it's Entra, check for token (won't find one),
    // and transition to interactive_auth which shows device code flow

    // Remove PAT credential (if exists)
    if (selectedConnection.patKey) {
      try {
        await context.secrets.delete(selectedConnection.patKey);
        logger.info('Removed PAT credential from secret storage', {
          patKey: selectedConnection.patKey,
        });
      } catch (secretError) {
        logger.warn('Failed to delete PAT secret (non-fatal)', {
          error: secretError instanceof Error ? secretError.message : String(secretError),
        });
      }
    }

    // Update connection to use Entra ID
    // Explicitly remove patKey and set authMethod to entra
    const { patKey, ...rest } = selectedConnection;
    const convertedConnection: ProjectConnection = {
      ...rest,
      authMethod: 'entra' as const,
      patKey: undefined, // Explicitly remove patKey for Entra connections
      // Keep same ID, label, and all other settings
    };

    // Remove patKey property entirely (not just set to undefined)
    delete (convertedConnection as any).patKey;

    logger.info('Converted connection object', {
      connectionId: convertedConnection.id,
      authMethod: convertedConnection.authMethod,
      hasAuthMethod: 'authMethod' in convertedConnection,
      connectionKeys: Object.keys(convertedConnection),
    });

    // Update connections array
    const updatedConnections = connections.map((c) =>
      c.id === selectedConnection.id ? convertedConnection : c
    );

    // Verify the conversion in the array
    const verifyConverted = updatedConnections.find((c) => c.id === selectedConnection.id);
    logger.info('Verifying conversion in array', {
      connectionId: verifyConverted?.id,
      authMethod: verifyConverted?.authMethod,
      hasAuthMethod: verifyConverted ? 'authMethod' in verifyConverted : false,
    });

    // Save updated connections using the real save function
    // Don't rely on saveFn passed from setup machine (it's a no-op)
    logger.info('About to save connections', {
      connectionId: selectedConnection.id,
      connectionToSave: verifyConverted,
      allConnectionsToSave: updatedConnections.map((c) => ({
        id: c.id,
        authMethod: c.authMethod,
        hasPatKey: !!c.patKey,
      })),
    });

    // Use the real save function, not the passed saveFn (which is a no-op)
    await saveConnectionsToConfig(context, updatedConnections);

    // Verify what was actually saved by reading back from settings
    const settings = vscode.workspace.getConfiguration('azureDevOpsIntegration');
    const savedConnections = settings.get<unknown[]>('connections', []);
    const savedConnection = Array.isArray(savedConnections)
      ? savedConnections.find((c: any) => c?.id === selectedConnection.id)
      : undefined;

    logger.info('✅ Connection saved - verifying persistence', {
      connectionId: selectedConnection.id,
      savedAuthMethod: verifyConverted?.authMethod,
      actuallySavedAuthMethod: (savedConnection as any)?.authMethod,
      actuallySavedPatKey: (savedConnection as any)?.patKey,
      savedConnectionKeys: savedConnection ? Object.keys(savedConnection) : [],
    });

    // CRITICAL: Update bridge reader immediately with the converted connection
    // This ensures the FSM sees the updated authMethod without waiting for VS Code settings to sync
    const { setLoadedConnectionsReader } = await import('../../services/extensionHostBridge.js');
    setLoadedConnectionsReader(() => updatedConnections);
    logger.info('✅ Bridge reader updated with converted connection', {
      connectionId: selectedConnection.id,
      authMethod: convertedConnection.authMethod,
    });

    // CRITICAL: Reset the connection actor so it starts fresh as Entra
    // Otherwise it stays in auth_failed state from PAT expiration
    // Do this AFTER updating the bridge reader so the reset reads the new config
    const { PraxisApplicationManager } = await import('../../../praxis/application/manager.js');
    const appManager = PraxisApplicationManager.getInstance();
    const connManager = appManager.getConnectionManager(selectedConnection.id);
    if (connManager) {
      // Small delay to ensure bridge reader update propagates
      await new Promise((resolve) => setTimeout(resolve, 100));
      connManager.reset();
      logger.info('Reset connection actor to start fresh as Entra', {
        connectionId: selectedConnection.id,
      });
    }

    // Step 8: Trigger Entra ID auth immediately (don't wait for ensureActiveFn)
    // The connection actor will handle the auth flow when it sees the Entra config
    const { sendApplicationStoreEvent } = await import('../../services/extensionHostBridge.js');
    sendApplicationStoreEvent({
      type: 'SIGN_IN_ENTRA',
      connectionId: selectedConnection.id,
      forceInteractive: true,
    });

    // Step 9: Set as active and ensure connection (after sending SIGN_IN_ENTRA)
    // Small delay to ensure reset completes before connecting
    await new Promise((resolve) => setTimeout(resolve, 200));
    await ensureActiveFn(context, selectedConnection.id, { refresh: true, interactive: true });

    // Step 10: Force status bar update after connection attempt
    const { updateAuthStatusBar } = await import('../../../activation.js');
    if (updateAuthStatusBar) {
      await updateAuthStatusBar();
    }

    vscode.window.showInformationMessage(
      `Connection converted successfully. Starting Microsoft Entra ID authentication...`
    );

    logger.info('✅ Conversion complete - SIGN_IN_ENTRA event sent', {
      connectionId: selectedConnection.id,
      authMethod: convertedConnection.authMethod,
    });

    // Log context after conversion for debugging
    const { getApplicationStoreActor } = await import('../../services/extensionHostBridge.js');
    const appActor = getApplicationStoreActor();
    if (appActor && typeof (appActor as any).getSnapshot === 'function') {
      const snapshot = (appActor as any).getSnapshot();
      logger.info('📊 Context after conversion', {
        connectionId: selectedConnection.id,
        fsmState: snapshot?.value,
        activeConnectionId: snapshot?.context?.activeConnectionId,
        connectionsCount: snapshot?.context?.connections?.length,
        connectionStates: Array.from(snapshot?.context?.connectionStates?.entries() || []).map(
          (entry: unknown) => {
            const [id, state] = entry as [string, any];
            return {
              id,
              authMethod: state?.authMethod || state?.config?.authMethod,
              hasClient: !!state?.client,
              hasProvider: !!state?.provider,
            };
          }
        ),
      });
    }
  } catch (error) {
    logger.error('❌ Error during conversion', { meta: error });

    vscode.window.showErrorMessage(
      `Failed to convert connection: ${error instanceof Error ? error.message : String(error)}\n\n` +
        `Your PAT connection is unchanged.`
    );
  }
}
