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
import { createLogger } from '../../logging/unifiedLogger.js';

const logger = createLogger('fsm-setup-service');

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

  async startSetup(options?: { skipInitialChoice?: boolean }): Promise<FSMSetupResult> {
    // Load connections from workspace configuration (not globalState!)
    const settings = vscode.workspace.getConfiguration('azureDevOpsIntegration');
    const existingConnections = settings.get<ProjectConnection[]>('connections', []);
    const activeConnectionId = this.context.globalState.get<string>(
      'azureDevOpsInt.activeConnectionId'
    );

    logger.debug('Starting setup', {
      connectionsCount: existingConnections.length,
      activeConnectionId,
      connectionAuthMethods: existingConnections.map((c) => ({
        id: c.id,
        authMethod: c.authMethod,
      })),
    });

    try {
      // Simplified setup flow without XState
      const url = await this.showUrlInput();
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
      const connectionInfo = this.parseWorkItemUrl(url);
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

      // Create connection
      const connectionId = `${connectionInfo.organization}-${connectionInfo.project}-${Date.now()}`;
      const newConnection: ProjectConnection = {
        id: connectionId,
        organization: connectionInfo.organization,
        project: connectionInfo.project,
        baseUrl: connectionInfo.baseUrl,
        authMethod,
        ...(authMethod === 'pat' && credentials.token ? { patKey: `pat-${connectionId}` } : {}),
        ...(authMethod === 'entra' && credentials.tenantId
          ? { tenantId: credentials.tenantId }
          : {}),
        ...(authMethod === 'entra' && credentials.clientId
          ? { clientId: credentials.clientId }
          : {}),
      };

      // Save PAT if using PAT auth
      if (authMethod === 'pat' && credentials.token) {
        await this.context.secrets.store(`pat-${connectionId}`, credentials.token);
      }

      // Save connection
      const updatedConnections = [...existingConnections, newConnection];
      await settings.update('connections', updatedConnections, vscode.ConfigurationTarget.Global);

      // Update bridge reader
      try {
        const { setLoadedConnectionsReader } = await import('../services/extensionHostBridge.js');
        setLoadedConnectionsReader(() => updatedConnections);
      } catch (error) {
        logger.warn('Failed to update bridge reader', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      logger.info('✅ Connection saved successfully', { connectionId });
      vscode.window.showInformationMessage('Connection saved successfully!');

      return { status: 'success', connectionId };
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

  private async showUrlInput(): Promise<string | undefined> {
    return await vscode.window.showInputBox({
      prompt: 'Enter an Azure DevOps work item URL to auto-configure your connection',
      placeHolder: 'https://dev.azure.com/myorg/myproject/_workitems/edit/123',
      validateInput: (value) => {
        if (!value) return 'URL is required';
        if (!value.includes('_workitems')) return 'Please provide a work item URL';
        return null;
      },
    });
  }

  private parseWorkItemUrl(
    url: string
  ): { organization: string; project: string; baseUrl: string } | null {
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/').filter(Boolean);

      // Handle dev.azure.com/org/project pattern
      if (parsed.hostname === 'dev.azure.com') {
        if (pathParts.length >= 2) {
          return {
            organization: pathParts[0],
            project: pathParts[1],
            baseUrl: `https://dev.azure.com/${pathParts[0]}`,
          };
        }
      }

      // Handle org.visualstudio.com/project pattern
      const vsMatch = parsed.hostname.match(/^(.+)\.visualstudio\.com$/);
      if (vsMatch && pathParts.length >= 1) {
        return {
          organization: vsMatch[1],
          project: pathParts[0],
          baseUrl: `https://${vsMatch[1]}.visualstudio.com`,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  private async showAuthMethodSelection(): Promise<'pat' | 'entra' | undefined> {
    const authMethod = await vscode.window.showQuickPick(
      [
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
      ],
      {
        placeHolder: 'Choose authentication method',
        matchOnDescription: true,
        matchOnDetail: true,
      }
    );

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
    const tenantId = await vscode.window.showInputBox({
      prompt: 'Enter your Tenant ID (Directory ID)',
      placeHolder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      validateInput: (value) => {
        if (!value) return 'Tenant ID is required';
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
          return 'Invalid Tenant ID format';
        }
        return null;
      },
    });

    if (!tenantId) return null;

    const clientId = await vscode.window.showInputBox({
      prompt: 'Enter your Application (Client) ID',
      placeHolder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      validateInput: (value) => {
        if (!value) return 'Client ID is required';
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
          return 'Invalid Client ID format';
        }
        return null;
      },
    });

    if (!clientId) return null;

    return { tenantId, clientId };
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
