/**
 * FSM-based Setup UI Integration
 * Handles VS Code UI interactions for the setup machine
 */

import * as vscode from 'vscode';
import { createActor } from 'xstate';
import {
  setupMachine,
  type FSMSetupResult,
  type SetupMachineContext,
} from '../machines/setupMachine.js';

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

export class FSMSetupService {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async startSetup(options?: { skipInitialChoice?: boolean }): Promise<FSMSetupResult> {
    // Create and start the setup machine
    const actor = createActor(setupMachine, {
      input: {
        extensionContext: this.context,
        existingConnections: this.context.globalState.get<ProjectConnection[]>(
          'azureDevOpsInt.connections',
          []
        ),
      } as any,
    });

    actor.start();

    // Send start event
    actor.send({ type: 'START', skipInitialChoice: options?.skipInitialChoice });

    return new Promise<FSMSetupResult>((resolve) => {
      // Subscribe to state changes and handle UI interactions
      actor.subscribe((state) => {
        this.handleStateChange(state, actor, resolve);
      });
    });
  }

  private async handleStateChange(
    state: any,
    actor: any,
    resolve: (result: FSMSetupResult) => void
  ): Promise<void> {
    const context = state.context as SetupMachineContext;

    switch (state.value) {
      case 'collectingUrl':
        await this.showUrlInput(actor);
        break;

      case 'urlError':
        await this.showUrlError(context.error!, actor);
        break;

      case 'selectingAuth':
        await this.showAuthMethodSelection(actor);
        break;

      case 'collectingCredentials':
        await this.showCredentialsInput(context, actor);
        break;

      case 'connectionError':
        await this.showConnectionError(context.error!, actor);
        break;

      case 'saveError':
        await this.showSaveError(context.error!, actor);
        break;

      case 'managingExisting':
        await this.showExistingConnections(context, actor);
        break;

      case 'removeError':
        await this.showRemoveError(context.error!, actor);
        break;

      case 'completed':
        resolve({
          status: 'success',
          connectionId: context.connectionId,
        });
        break;

      case 'removed':
        resolve({
          status: 'removed',
          removedConnectionId: context.removedConnectionId,
        });
        break;

      case 'cancelled':
        resolve({ status: 'cancelled' });
        break;

      case 'testingConnection':
        vscode.window.showInformationMessage('Testing connection...');
        break;

      case 'testingExistingConnection':
        vscode.window.showInformationMessage('Testing connection...');
        break;

      case 'testingExistingResult':
        await this.showExistingTestResult(context, actor);
        break;

      case 'savingConnection':
        vscode.window.showInformationMessage('Saving connection...');
        break;

      case 'removingConnection':
        vscode.window.showInformationMessage('Removing connection...');
        break;
    }
  }

  private async showUrlInput(actor: any): Promise<void> {
    const url = await vscode.window.showInputBox({
      prompt: 'Enter an Azure DevOps work item URL to auto-configure your connection',
      placeHolder: 'https://dev.azure.com/myorg/myproject/_workitems/edit/123',
      validateInput: (value) => {
        if (!value) return 'URL is required';
        if (!value.includes('_workitems')) return 'Please provide a work item URL';
        return null;
      },
    });

    if (url) {
      actor.send({ type: 'URL_PROVIDED', url });
    } else {
      // Check if user wants to manage existing connections
      const manageExisting = await vscode.window.showQuickPick(
        ['Cancel', 'Manage Existing Connections'],
        { placeHolder: 'What would you like to do?' }
      );

      if (manageExisting === 'Manage Existing Connections') {
        actor.send({ type: 'MANAGE_EXISTING' });
      } else {
        actor.send({ type: 'CANCEL' });
      }
    }
  }

  private async showUrlError(error: string, actor: any): Promise<void> {
    const action = await vscode.window.showErrorMessage(
      `Invalid URL: ${error}`,
      'Try Again',
      'Cancel'
    );

    if (action === 'Try Again') {
      actor.send({ type: 'RETRY' });
    } else {
      actor.send({ type: 'CANCEL' });
    }
  }

  private async showAuthMethodSelection(actor: any): Promise<void> {
    const authMethod = await vscode.window.showQuickPick(
      [
        {
          label: 'Personal Access Token (PAT)',
          description: 'Use a Personal Access Token for authentication',
          detail: 'Recommended for most users. Generate a PAT from Azure DevOps settings.',
          value: 'pat',
        },
        {
          label: 'Microsoft Entra ID (OAuth)',
          description: 'Use your Microsoft account to sign in',
          detail: 'Enterprise authentication using your organizational account.',
          value: 'entra',
        },
      ],
      {
        placeHolder: 'Choose authentication method',
        matchOnDescription: true,
        matchOnDetail: true,
      }
    );

    if (authMethod) {
      actor.send({ type: 'AUTH_METHOD_SELECTED', method: authMethod.value as 'pat' | 'entra' });
    } else {
      actor.send({ type: 'CANCEL' });
    }
  }

  private async showCredentialsInput(context: SetupMachineContext, actor: any): Promise<void> {
    if (context.authMethod === 'pat') {
      await this.showPATInput(actor);
    } else if (context.authMethod === 'entra') {
      await this.showEntraConfig(actor);
    }
  }

  private async showPATInput(actor: any): Promise<void> {
    const token = await vscode.window.showInputBox({
      prompt: 'Enter your Personal Access Token',
      password: true,
      placeHolder: 'Your PAT from Azure DevOps',
      validateInput: (value) => {
        if (!value) return 'PAT is required';
        if (value.length < 20) return 'PAT seems too short';
        return null;
      },
    });

    if (token) {
      actor.send({ type: 'PAT_PROVIDED', token });
    } else {
      actor.send({ type: 'CANCEL' });
    }
  }

  private async showEntraConfig(actor: any): Promise<void> {
    // For Entra ID, we need tenant ID and client ID
    const tenantId = await vscode.window.showInputBox({
      prompt: 'Enter your Tenant ID (Directory ID)',
      placeHolder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      validateInput: (value) => {
        if (!value) return 'Tenant ID is required';
        // Basic UUID format validation
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
          return 'Invalid Tenant ID format';
        }
        return null;
      },
    });

    if (!tenantId) {
      actor.send({ type: 'CANCEL' });
      return;
    }

    const clientId = await vscode.window.showInputBox({
      prompt: 'Enter your Application (Client) ID',
      placeHolder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      validateInput: (value) => {
        if (!value) return 'Client ID is required';
        // Basic UUID format validation
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
          return 'Invalid Client ID format';
        }
        return null;
      },
    });

    if (clientId) {
      actor.send({ type: 'ENTRA_CONFIG', tenantId, clientId });
    } else {
      actor.send({ type: 'CANCEL' });
    }
  }

  private async showConnectionError(error: string, actor: any): Promise<void> {
    const action = await vscode.window.showErrorMessage(
      `Connection test failed: ${error}`,
      'Try Again',
      'Go Back',
      'Cancel'
    );

    switch (action) {
      case 'Try Again':
        actor.send({ type: 'RETRY' });
        break;
      case 'Go Back':
        actor.send({ type: 'BACK' });
        break;
      default:
        actor.send({ type: 'CANCEL' });
        break;
    }
  }

  private async showSaveError(error: string, actor: any): Promise<void> {
    const action = await vscode.window.showErrorMessage(
      `Failed to save connection: ${error}`,
      'Try Again',
      'Cancel'
    );

    if (action === 'Try Again') {
      actor.send({ type: 'RETRY' });
    } else {
      actor.send({ type: 'CANCEL' });
    }
  }

  private async showExistingConnections(context: SetupMachineContext, actor: any): Promise<void> {
    const connections = this.context.globalState.get<ProjectConnection[]>(
      'azureDevOpsInt.connections',
      []
    );

    if (connections.length === 0) {
      vscode.window.showInformationMessage('No existing connections found.');
      actor.send({ type: 'CANCEL' });
      return;
    }

    const items = connections.map((conn) => ({
      label: conn.label || `${conn.organization}/${conn.project}`,
      description: conn.authMethod === 'pat' ? 'Personal Access Token' : 'Microsoft Entra ID',
      detail: conn.baseUrl,
      connection: conn,
    }));

    items.push({
      label: '$(add) Add New Connection',
      description: 'Create a new Azure DevOps connection',
      detail: 'Set up a new connection to Azure DevOps',
      connection: null as any,
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a connection to manage or add a new one',
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (!selected) {
      actor.send({ type: 'CANCEL' });
      return;
    }

    if (!selected.connection) {
      // Add new connection - restart the flow
      actor.send({ type: 'CANCEL' });
      // Start a new setup flow
      const newSetup = new FSMSetupService(this.context);
      await newSetup.startSetup();
      return;
    }

    // Show connection management options
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
        actor.send({ type: 'REMOVE_CONNECTION', connectionId: selected.connection.id });
      } else {
        actor.send({ type: 'CANCEL' });
      }
    } else if (action?.value === 'test') {
      // TODO: Implement connection test
      vscode.window.showInformationMessage('Connection test not yet implemented in FSM setup');
      actor.send({ type: 'CANCEL' });
    } else {
      actor.send({ type: 'CANCEL' });
    }
  }

  private async showExistingTestResult(context: SetupMachineContext, actor: any): Promise<void> {
    const result = context.lastExistingTestResult;
    const connection = context.testingExistingConnection;

    if (!result || !connection) {
      actor.send({ type: 'CONTINUE_MANAGING' });
      return;
    }

    const connectionLabel =
      connection.label ||
      (connection.organization && connection.project
        ? `${connection.organization}/${connection.project}`
        : connection.id || 'connection');

    if (result.success) {
      await vscode.window.showInformationMessage(
        `Connection "${connectionLabel}" succeeded. ${result.message}`
      );
      actor.send({ type: 'CONTINUE_MANAGING' });
      return;
    }

    const choice = await vscode.window.showErrorMessage(
      `Connection test failed for "${connectionLabel}". ${result.message}`,
      'Retry',
      'Back'
    );

    if (choice === 'Retry') {
      actor.send({ type: 'RETRY' });
    } else {
      actor.send({ type: 'CONTINUE_MANAGING' });
    }
  }

  private async showRemoveError(error: string, actor: any): Promise<void> {
    const action = await vscode.window.showErrorMessage(
      `Failed to remove connection: ${error}`,
      'Try Again',
      'Cancel'
    );

    if (action === 'Try Again') {
      actor.send({ type: 'RETRY' });
    } else {
      actor.send({ type: 'CANCEL' });
    }
  }
}
