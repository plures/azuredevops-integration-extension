/**
 * Module: src/fsm/services/fsmSetupService.ts
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
 *
 * This module now uses a simplified Praxis-compatible approach instead of XState.
 */
/**
 * FSM-based Setup UI Integration
 * Handles VS Code UI interactions for the setup flow
 *
 * Note: This has been simplified to work without XState.
 * The setup flow is now implemented directly without a state machine.
 */

import * as vscode from 'vscode';
import { createLogger } from '../logging/unifiedLogger.js';

const logger = createLogger('fsm-setup-service');
const DEFAULT_ENTRA_TENANT_ID = 'organizations';
const DEFAULT_ENTRA_CLIENT_ID = 'c6c01810-2fff-45f0-861b-2ba02ae00ddc';

// Define the connection type locally since it's defined in activation.ts
type ProjectConnection = {
  id: string;
  organization: string;
  project: string;
  label?: string;
  team?: string;
  authMethod?: 'pat' | 'entra';
  patKey?: string;
  baseUrl?: string;
  identityName?: string;
  tenantId?: string;
  clientId?: string;
  apiBaseUrl?: string;
};

interface StartSetupOptions {
  /**
   * Target connection to reconfigure. When provided with startAtAuthChoice,
   * skips URL parsing and jumps directly to auth selection.
   */
  connectionId?: string;
  /**
   * When true, start the flow at the auth method selection step for the target connection.
   */
  startAtAuthChoice?: boolean;
}

// Result type for setup flow
export interface FSMSetupResult {
  status: 'success' | 'cancelled' | 'removed';
  connectionId?: string;
  removedConnectionId?: string;
}

export class FSMSetupService {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async startSetup(options?: StartSetupOptions): Promise<FSMSetupResult> {
    // Load connections from workspace configuration (not globalState!)
    const settings = vscode.workspace.getConfiguration('azureDevOpsIntegration');
    const existingConnections = settings.get<ProjectConnection[]>('connections', []);
    const activeConnectionId = this.context.globalState.get<string>(
      'azureDevOpsInt.activeConnectionId'
    );

    const startAtAuthChoice = options?.startAtAuthChoice ?? false;
    const targetConnectionId = options?.connectionId ?? activeConnectionId;
    const targetConnection = targetConnectionId
      ? existingConnections.find((c) => c.id === targetConnectionId)
      : undefined;

    logger.debug('Starting setup', {
      connectionsCount: existingConnections.length,
      activeConnectionId,
      connectionAuthMethods: existingConnections.map((c) => ({
        id: c.id,
        authMethod: c.authMethod,
      })),
      startAtAuthChoice,
      targetConnectionId,
    });

    try {
      if (startAtAuthChoice && targetConnection) {
        return await this.reconfigureAuth(targetConnection, existingConnections, settings);
      }

      // Simplified setup flow without XState
      const { showUrlInput, parseWorkItemUrl, createConnectionFromInfo, saveConnection } =
        await import('./setupServiceHelpers.js');

      const url = await showUrlInput();
      if (!url) {
        // Check if user wants to manage existing connections
        const manageExisting = await vscode.window.showQuickPick(
          ['Cancel', 'Manage Existing Connections'],
          { placeHolder: 'What would you like to do?' }
        );

        if (manageExisting === 'Manage Existing Connections') {
          return await this.manageExistingConnections(existingConnections);
        }
        return { status: 'cancelled' };
      }

      // Parse URL to extract connection info
      const connectionInfo = parseWorkItemUrl(url);
      if (!connectionInfo) {
        await vscode.window.showErrorMessage(
          'Invalid work item URL. Please provide a valid Azure DevOps work item URL.'
        );
        return { status: 'cancelled' };
      }

      // Select auth method
      const authMethod = await this.showAuthMethodSelection();
      if (!authMethod) {
        return { status: 'cancelled' };
      }

      // Get credentials
      let credentials: { token?: string; tenantId?: string; clientId?: string } | null = null;
      if (authMethod === 'pat') {
        const token = await this.showPATInput();
        if (!token) {
          return { status: 'cancelled' };
        }
        credentials = { token };
      } else {
        credentials = await this.showEntraConfig();
        if (!credentials) {
          return { status: 'cancelled' };
        }
      }

      // Create and save connection
      const newConnection = createConnectionFromInfo(connectionInfo, authMethod, credentials);
      await saveConnection(this.context, newConnection, existingConnections, credentials);

      logger.info('✅ Connection saved successfully', { connectionId: newConnection.id });
      vscode.window.showInformationMessage('Connection saved successfully!');

      return { status: 'success', connectionId: newConnection.id };
    } catch (error) {
      logger.error('Setup failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      await vscode.window.showErrorMessage(
        `Setup failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return { status: 'cancelled' };
    }
  }

  private async showAuthMethodSelection(
    currentMethod?: 'pat' | 'entra'
  ): Promise<'pat' | 'entra' | undefined> {
    const items = [
      {
        label: 'Personal Access Token (PAT)',
        description: 'Use a Personal Access Token for authentication',
        detail: 'Recommended for most users. Generate a PAT from Azure DevOps settings.',
        value: 'pat' as const,
      },
      {
        label: 'Microsoft Entra ID (OAuth)',
        description: 'Use your Microsoft account to sign in',
        detail: 'Enterprise authentication using your organizational account.',
        value: 'entra' as const,
      },
    ];

    const authMethod = await vscode.window.showQuickPick(items, {
      placeHolder: 'Choose authentication method',
      matchOnDescription: true,
      matchOnDetail: true,
      activeItem: currentMethod ? items.find((item) => item.value === currentMethod) : undefined,
    });

    return authMethod?.value;
  }

  private async showPATInput(): Promise<string | undefined> {
    return await vscode.window.showInputBox({
      prompt: 'Enter your Personal Access Token',
      password: true,
      placeHolder: 'Your PAT from Azure DevOps',
      validateInput: (value) => {
        if (!value) return 'PAT is required';
        if (value.length < 20) return 'PAT seems too short';
        return null;
      },
    });
  }

  private async showEntraConfig(): Promise<{ tenantId: string; clientId: string } | null> {
    // Defaults are handled automatically; keep method for potential future advanced configuration
    return { tenantId: DEFAULT_ENTRA_TENANT_ID, clientId: DEFAULT_ENTRA_CLIENT_ID };
  }

  private async reconfigureAuth(
    targetConnection: ProjectConnection,
    existingConnections: ProjectConnection[],
    settings: vscode.WorkspaceConfiguration
  ): Promise<FSMSetupResult> {
    logger.debug('Reconfiguring authentication for connection', {
      connectionId: targetConnection.id,
      authMethod: targetConnection.authMethod,
    });

    const authMethod = await this.showAuthMethodSelection(targetConnection.authMethod);
    if (!authMethod) {
      return { status: 'cancelled' };
    }

    let patToken: string | undefined;
    let tenantId: string | undefined;
    let clientId: string | undefined;

    if (authMethod === 'pat') {
      patToken = await this.showPATInput();
      if (!patToken) {
        return { status: 'cancelled' };
      }
    } else {
      // Device code flow uses the built-in multi-tenant app; do not prompt for tenant/client IDs
      tenantId = targetConnection.tenantId || DEFAULT_ENTRA_TENANT_ID;
      clientId = targetConnection.clientId || DEFAULT_ENTRA_CLIENT_ID;
    }

    if (authMethod !== 'pat' && targetConnection.patKey) {
      await this.context.secrets.delete(targetConnection.patKey);
    }

    const patKey =
      authMethod === 'pat' ? (targetConnection.patKey ?? `pat-${targetConnection.id}`) : undefined;

    if (authMethod === 'pat' && patKey && patToken) {
      await this.context.secrets.store(patKey, patToken);
    }

    const updatedConnection: ProjectConnection = {
      ...targetConnection,
      authMethod,
      patKey,
      tenantId: authMethod === 'entra' ? tenantId : undefined,
      clientId: authMethod === 'entra' ? clientId : undefined,
    };

    const updatedConnections = existingConnections.map((connection) =>
      connection.id === targetConnection.id ? updatedConnection : connection
    );

    await settings.update('connections', updatedConnections, vscode.ConfigurationTarget.Global);

    try {
      const { setLoadedConnectionsReader } = await import('../services/extensionHostBridge.js');
      setLoadedConnectionsReader(() => updatedConnections);
    } catch (error) {
      logger.warn('Failed to update bridge reader after auth reset', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (authMethod === 'entra') {
      vscode.window.showInformationMessage(
        'Authentication method updated. Starting Entra sign-in — complete the device code prompt to finish.'
      );
    } else {
      vscode.window.showInformationMessage('Authentication updated successfully.');
    }
    return { status: 'success', connectionId: targetConnection.id };
  }

  private async manageExistingConnections(
    connections: ProjectConnection[]
  ): Promise<FSMSetupResult> {
    if (connections.length === 0) {
      vscode.window.showInformationMessage('No existing connections found.');
      return { status: 'cancelled' };
    }

    const items = connections.map((conn) => ({
      label: conn.label || `${conn.organization}/${conn.project}`,
      description: conn.authMethod === 'pat' ? 'Personal Access Token' : 'Microsoft Entra ID',
      detail: conn.baseUrl,
      connection: conn,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a connection to manage',
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (!selected) {
      return { status: 'cancelled' };
    }

    const action = await vscode.window.showQuickPick(
      [
        { label: 'Remove Connection', value: 'remove', description: 'Delete this connection' },
        {
          label: 'Test Connection',
          value: 'test',
          description: 'Test if this connection is working',
        },
      ],
      {
        placeHolder: `Manage connection: ${selected.label}`,
      }
    );

    if (action?.value === 'remove') {
      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to remove the connection "${selected.label}"?`,
        { modal: true },
        'Yes, Remove'
      );

      if (confirm === 'Yes, Remove') {
        const settings = vscode.workspace.getConfiguration('azureDevOpsIntegration');
        const updatedConnections = connections.filter((c) => c.id !== selected.connection.id);
        await settings.update('connections', updatedConnections, vscode.ConfigurationTarget.Global);

        // Remove PAT if it exists
        if (selected.connection.patKey) {
          await this.context.secrets.delete(selected.connection.patKey);
        }

        vscode.window.showInformationMessage(`Connection "${selected.label}" removed.`);
        return { status: 'removed', removedConnectionId: selected.connection.id };
      }
    } else if (action?.value === 'test') {
      vscode.window.showInformationMessage('Connection test not yet implemented.');
    }

    return { status: 'cancelled' };
  }
}
