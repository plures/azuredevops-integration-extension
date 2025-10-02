/**
 * Azure DevOps Setup Wizard
 *
 * Provides a step-by-step wizard to help users configure their Azure DevOps connection
 * by parsing work item URLs and guiding them through PAT creation.
 */

import * as vscode from 'vscode';
import {
  parseAzureDevOpsUrl,
  generatePatCreationUrl,
  testAzureDevOpsConnection,
  isAzureDevOpsWorkItemUrl,
} from './azureDevOpsUrlParser.js';
import { AzureDevOpsIntClient } from './azureClient.js';
import { randomUUID } from 'crypto';

export interface SetupWizardStep {
  step: number;
  title: string;
  description: string;
  completed: boolean;
}

export interface SetupWizardData {
  workItemUrl?: string;
  parsedUrl?: ReturnType<typeof parseAzureDevOpsUrl>;
  pat?: string;
  connectionTested?: boolean;
  team?: string;
  label?: string;
  existingConnectionId?: string;
}

export class SetupWizard {
  private context: vscode.ExtensionContext;
  private currentStep: number = 1;
  private data: SetupWizardData = {};
  private steps: SetupWizardStep[] = [
    {
      step: 1,
      title: 'Work Item URL',
      description: 'Provide a work item URL to auto-configure your connection',
      completed: false,
    },
    {
      step: 2,
      title: 'Personal Access Token',
      description: 'Create and enter your Personal Access Token',
      completed: false,
    },
    {
      step: 3,
      title: 'Test Connection',
      description: 'Verify your connection works correctly',
      completed: false,
    },
    {
      step: 4,
      title: 'Optional Settings',
      description: 'Configure team and connection label',
      completed: false,
    },
    {
      step: 5,
      title: 'Complete Setup',
      description: 'Save your connection configuration',
      completed: false,
    },
  ];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Starts the setup wizard
   */
  async start(): Promise<boolean> {
    try {
      // Reset wizard state
      this.currentStep = 1;
      this.data = {};

      // Check for existing connections
      const existingConnections = await this.getExistingConnections();

      let startChoice: string | undefined;
      if (existingConnections.length > 0) {
        // Show options for existing connections
        const choices = ['Add New Connection', 'Modify Existing Connection', 'Cancel'];

        startChoice = await vscode.window.showInformationMessage(
          `Welcome to the Azure DevOps Integration Setup Wizard!\n\n` +
            `You currently have ${existingConnections.length} connection(s) configured.\n` +
            `What would you like to do?`,
          ...choices
        );

        if (startChoice === 'Modify Existing Connection') {
          return await this.modifyExistingConnection(existingConnections);
        }
      } else {
        // Show welcome message for new setup
        startChoice = await vscode.window.showInformationMessage(
          'Welcome to the Azure DevOps Integration Setup Wizard! This will help you configure your first connection step by step.',
          'Start Setup',
          'Cancel'
        );
      }

      if (startChoice !== 'Start Setup' && startChoice !== 'Add New Connection') {
        return false;
      }

      // Execute each step
      for (let i = 0; i < this.steps.length; i++) {
        this.currentStep = i + 1;
        const stepResult = await this.executeStep(this.currentStep);

        if (!stepResult) {
          // User cancelled or step failed
          return false;
        }
      }

      // All steps completed successfully
      await this.completeSetup();
      return true;
    } catch (error) {
      console.error('[SetupWizard] Error during setup:', error);
      vscode.window.showErrorMessage(
        `Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return false;
    }
  }

  /**
   * Executes a specific step of the wizard
   */
  private async executeStep(stepNumber: number): Promise<boolean> {
    const step = this.steps[stepNumber - 1];
    if (!step) return false;

    switch (stepNumber) {
      case 1:
        return await this.step1_WorkItemUrl();
      case 2:
        return await this.step2_PersonalAccessToken();
      case 3:
        return await this.step3_TestConnection();
      case 4:
        return await this.step4_OptionalSettings();
      case 5:
        return await this.step5_CompleteSetup();
      default:
        return false;
    }
  }

  /**
   * Step 1: Get work item URL and parse it
   */
  private async step1_WorkItemUrl(): Promise<boolean> {
    const step = this.steps[0];

    // Show step information
    const stepInfo = await vscode.window.showInformationMessage(
      `Step ${this.currentStep}: ${step.title}\n\n${step.description}\n\nThis will automatically detect your organization, project, and Azure DevOps instance.`,
      'Continue',
      'Skip (Manual Entry)',
      'Cancel'
    );

    if (stepInfo === 'Cancel') return false;
    if (stepInfo === 'Skip (Manual Entry)') {
      return await this.step1_ManualEntry();
    }

    // Get work item URL from user
    const workItemUrl = await vscode.window.showInputBox({
      prompt: 'Enter a work item URL from your Azure DevOps instance',
      placeHolder: 'https://dev.azure.com/yourorg/yourproject/_workitems/edit/12345',
      validateInput: (value) => {
        if (!value || !value.trim()) {
          return 'Please enter a work item URL';
        }
        if (!isAzureDevOpsWorkItemUrl(value)) {
          return 'Please enter a valid Azure DevOps work item URL';
        }
        return null;
      },
      ignoreFocusOut: true,
    });

    if (!workItemUrl) return false;

    // Parse the URL
    this.data.workItemUrl = workItemUrl;
    this.data.parsedUrl = parseAzureDevOpsUrl(workItemUrl);

    if (!this.data.parsedUrl.isValid) {
      const errorChoice = await vscode.window.showErrorMessage(
        `Failed to parse URL: ${this.data.parsedUrl.error}`,
        'Try Again',
        'Manual Entry',
        'Cancel'
      );

      if (errorChoice === 'Try Again') {
        return await this.step1_WorkItemUrl();
      } else if (errorChoice === 'Manual Entry') {
        return await this.step1_ManualEntry();
      } else {
        return false;
      }
    }

    // Show parsed information for confirmation
    const confirmChoice = await vscode.window.showInformationMessage(
      `Detected configuration:\n\n` +
        `Organization: ${this.data.parsedUrl.organization}\n` +
        `Project: ${this.data.parsedUrl.project}\n` +
        `Base URL: ${this.data.parsedUrl.baseUrl}\n` +
        `Work Item ID: ${this.data.parsedUrl.workItemId || 'N/A'}`,
      'Correct',
      'Try Different URL',
      'Manual Entry'
    );

    if (confirmChoice === 'Try Different URL') {
      return await this.step1_WorkItemUrl();
    } else if (confirmChoice === 'Manual Entry') {
      return await this.step1_ManualEntry();
    } else if (confirmChoice === 'Correct') {
      step.completed = true;
      return true;
    }

    return false;
  }

  /**
   * Step 1 Alternative: Manual entry
   */
  private async step1_ManualEntry(): Promise<boolean> {
    const organization = await vscode.window.showInputBox({
      prompt: 'Enter your Azure DevOps organization name',
      placeHolder: 'your-organization',
      validateInput: (value) => {
        if (!value || !value.trim()) {
          return 'Organization name is required';
        }
        return null;
      },
      ignoreFocusOut: true,
    });

    if (!organization) return false;

    const project = await vscode.window.showInputBox({
      prompt: 'Enter your project name',
      placeHolder: 'your-project',
      validateInput: (value) => {
        if (!value || !value.trim()) {
          return 'Project name is required';
        }
        return null;
      },
      ignoreFocusOut: true,
    });

    if (!project) return false;

    const baseUrlChoice = await vscode.window.showQuickPick(
      [
        {
          label: 'dev.azure.com',
          description: 'https://dev.azure.com/{org}',
          value: 'dev.azure.com',
        },
        {
          label: 'visualstudio.com',
          description: 'https://{org}.visualstudio.com',
          value: 'visualstudio.com',
        },
        { label: 'Custom', description: 'Enter custom base URL', value: 'custom' },
      ],
      {
        placeHolder: 'Select your Azure DevOps instance type',
        ignoreFocusOut: true,
      }
    );

    if (!baseUrlChoice) return false;

    let baseUrl: string;
    if (baseUrlChoice.value === 'custom') {
      const customBaseUrl = await vscode.window.showInputBox({
        prompt: 'Enter your custom base URL',
        placeHolder: 'https://your-instance.visualstudio.com',
        validateInput: (value) => {
          if (!value || !value.trim()) {
            return 'Base URL is required';
          }
          if (!value.startsWith('http://') && !value.startsWith('https://')) {
            return 'Base URL must start with http:// or https://';
          }
          return null;
        },
        ignoreFocusOut: true,
      });

      if (!customBaseUrl) return false;
      baseUrl = customBaseUrl;
    } else if (baseUrlChoice.value === 'dev.azure.com') {
      baseUrl = `https://dev.azure.com/${organization}`;
    } else {
      baseUrl = `https://${organization}.visualstudio.com`;
    }

    // Create parsed URL object
    this.data.parsedUrl = {
      organization,
      project,
      baseUrl,
      apiBaseUrl: `https://dev.azure.com/${organization}/${project}/_apis`,
      isValid: true,
    };

    this.steps[0].completed = true;
    return true;
  }

  /**
   * Step 2: Get Personal Access Token
   */
  private async step2_PersonalAccessToken(): Promise<boolean> {
    const step = this.steps[1];

    if (!this.data.parsedUrl) return false;

    // Show PAT creation guide
    const patCreationUrl = generatePatCreationUrl(
      this.data.parsedUrl.organization,
      this.data.parsedUrl.baseUrl
    );

    const guideChoice = await vscode.window.showInformationMessage(
      `Step ${this.currentStep}: ${step.title}\n\n` +
        `You need to create a Personal Access Token (PAT) with the following scopes:\n` +
        `• Work Items (Read & Write)\n` +
        `• User Profile (Read)\n` +
        `• Team (Read)\n` +
        `• Code (Read & Write) - optional, for PRs\n` +
        `• Build (Read) - optional, for build status\n\n` +
        `Click "Open PAT Creation" to open the token creation page.`,
      'Open PAT Creation',
      'I Have a Token',
      'Cancel'
    );

    if (guideChoice === 'Cancel') return false;

    if (guideChoice === 'Open PAT Creation') {
      await vscode.env.openExternal(vscode.Uri.parse(patCreationUrl));

      // Wait a moment for user to create the token
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Get PAT from user
    const pat = await vscode.window.showInputBox({
      prompt: 'Enter your Personal Access Token',
      password: true,
      placeHolder: 'Paste your PAT here...',
      validateInput: (value) => {
        if (!value || !value.trim()) {
          return 'Personal Access Token is required';
        }
        if (value.length < 10) {
          return 'Personal Access Token appears to be too short';
        }
        return null;
      },
      ignoreFocusOut: true,
    });

    if (!pat) return false;

    this.data.pat = pat;
    step.completed = true;
    return true;
  }

  /**
   * Step 3: Test connection
   */
  private async step3_TestConnection(): Promise<boolean> {
    const step = this.steps[2];

    if (!this.data.parsedUrl || !this.data.pat) return false;

    // Show progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Testing Azure DevOps connection...',
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0, message: 'Validating credentials...' });

        const result = await testAzureDevOpsConnection(this.data.parsedUrl!, this.data.pat!);

        if (result.success) {
          progress.report({ increment: 100, message: 'Connection successful!' });
          this.data.connectionTested = true;
          step.completed = true;
        } else {
          throw new Error(result.error || 'Connection test failed');
        }
      }
    );

    return this.data.connectionTested || false;
  }

  /**
   * Step 4: Optional settings
   */
  private async step4_OptionalSettings(): Promise<boolean> {
    const step = this.steps[3];

    if (!this.data.parsedUrl || !this.data.pat) return false;

    // Ask about team selection
    const teamChoice = await vscode.window.showQuickPick(
      [
        { label: 'Configure team now', value: 'now' },
        { label: 'Skip team configuration', value: 'skip' },
      ],
      {
        placeHolder: 'Would you like to configure a team for sprint queries?',
        ignoreFocusOut: true,
      }
    );

    if (teamChoice?.value === 'now') {
      // Test connection first to get teams
      try {
        const client = new AzureDevOpsIntClient(
          this.data.parsedUrl!.organization,
          this.data.parsedUrl!.project,
          this.data.pat!,
          { baseUrl: this.data.parsedUrl!.baseUrl }
        );

        const teams = await (client as any).getTeams?.();
        if (teams && Array.isArray(teams) && teams.length > 0) {
          const teamPicks = teams.map((t: any) => ({
            label: t.name,
            description: t.id,
            value: t.name,
          }));

          const selectedTeam = await vscode.window.showQuickPick(teamPicks, {
            placeHolder: 'Select your team for sprint queries',
            ignoreFocusOut: true,
          });

          if (selectedTeam) {
            this.data.team = selectedTeam.value;
          }
        } else {
          vscode.window.showInformationMessage(
            'No teams found for this project. You can configure this later.'
          );
        }
      } catch (error) {
        console.warn('[SetupWizard] Could not fetch teams:', error);
        vscode.window.showInformationMessage(
          'Could not fetch teams. You can configure this later.'
        );
      }
    }

    // Ask about connection label
    const label = await vscode.window.showInputBox({
      prompt: 'Enter a label for this connection (optional)',
      placeHolder: 'e.g., "Main Project", "Client Work"',
      ignoreFocusOut: true,
    });

    if (label && label.trim()) {
      this.data.label = label.trim();
    }

    step.completed = true;
    return true;
  }

  /**
   * Step 5: Complete setup
   */
  private async step5_CompleteSetup(): Promise<boolean> {
    const step = this.steps[4];

    if (!this.data.parsedUrl || !this.data.pat) return false;

    // Show summary
    const summary =
      `Setup Summary:\n\n` +
      `Organization: ${this.data.parsedUrl.organization}\n` +
      `Project: ${this.data.parsedUrl.project}\n` +
      `Base URL: ${this.data.parsedUrl.baseUrl}\n` +
      `Team: ${this.data.team || 'Not configured'}\n` +
      `Label: ${this.data.label || 'Default'}\n` +
      `Connection Tested: ${this.data.connectionTested ? 'Yes' : 'No'}`;

    const confirmChoice = await vscode.window.showInformationMessage(
      summary,
      'Complete Setup',
      'Go Back',
      'Cancel'
    );

    if (confirmChoice === 'Cancel') return false;
    if (confirmChoice === 'Go Back') {
      return await this.step4_OptionalSettings();
    }

    step.completed = true;
    return true;
  }

  /**
   * Completes the setup by saving the connection
   */
  private async completeSetup(): Promise<void> {
    if (!this.data.parsedUrl || !this.data.pat) {
      throw new Error('Setup data is incomplete');
    }

    // Create connection object with PAT key
    const connectionId = this.data.existingConnectionId || randomUUID();
    const patKey = `azureDevOpsInt.pat.${connectionId}`;

    // Save PAT with connection-specific key
    await this.context.secrets.store(patKey, this.data.pat);

    // Create connection object
    const connection = {
      id: connectionId,
      organization: this.data.parsedUrl.organization,
      project: this.data.parsedUrl.project,
      label: this.data.label,
      team: this.data.team,
      patKey: patKey,
      baseUrl: this.data.parsedUrl.baseUrl,
    };

    // Save connection to configuration
    await this.saveConnectionToConfig(connection);

    // Set as active connection
    await this.context.globalState.update('azureDevOpsInt.activeConnectionId', connection.id);

    const action = this.data.existingConnectionId ? 'updated' : 'configured and saved';
    vscode.window
      .showInformationMessage(
        `Setup completed successfully!\n\n` +
          `Your Azure DevOps connection has been ${action}. ` +
          `You can now use the extension to view and manage work items.`,
        'Open Work Items View'
      )
      .then((choice) => {
        if (choice === 'Open Work Items View') {
          vscode.commands.executeCommand('azureDevOpsInt.showWorkItems');
        }
      });
  }

  /**
   * Gets existing connections from configuration
   */
  private async getExistingConnections(): Promise<any[]> {
    const config = vscode.workspace.getConfiguration('azureDevOpsIntegration');
    return config.get<any[]>('connections') ?? [];
  }

  /**
   * Modifies an existing connection
   */
  private async modifyExistingConnection(existingConnections: any[]): Promise<boolean> {
    // Show list of existing connections to modify
    const connectionItems = existingConnections.map((conn, index) => ({
      label: conn.label || `${conn.organization}/${conn.project}`,
      description: conn.team ? `Team: ${conn.team}` : undefined,
      detail: `Organization: ${conn.organization}, Project: ${conn.project}`,
      connection: conn,
      index,
    }));

    const selectedConnection = await vscode.window.showQuickPick(connectionItems, {
      placeHolder: 'Select a connection to modify',
      ignoreFocusOut: true,
    });

    if (!selectedConnection) {
      return false;
    }

    // Pre-populate the wizard data with existing connection
    const baseUrl =
      selectedConnection.connection.baseUrl ||
      `https://dev.azure.com/${selectedConnection.connection.organization}`;
    this.data = {
      workItemUrl: `${baseUrl}/${selectedConnection.connection.project}/_workitems`,
      parsedUrl: {
        organization: selectedConnection.connection.organization,
        project: selectedConnection.connection.project,
        baseUrl: baseUrl,
        apiBaseUrl: `https://dev.azure.com/${selectedConnection.connection.organization}/${selectedConnection.connection.project}/_apis`,
        isValid: true,
      },
      label: selectedConnection.connection.label,
      team: selectedConnection.connection.team,
      existingConnectionId: selectedConnection.connection.id,
    };

    // Execute the wizard steps
    for (let i = 0; i < this.steps.length; i++) {
      this.currentStep = i + 1;
      const stepResult = await this.executeStep(this.currentStep);

      if (!stepResult) {
        return false;
      }
    }

    // Complete the modification
    await this.completeSetup();
    return true;
  }

  /**
   * Saves a connection to the VS Code configuration
   */
  private async saveConnectionToConfig(connection: any): Promise<void> {
    const config = vscode.workspace.getConfiguration('azureDevOpsIntegration');
    const existingConnections = config.get<any[]>('connections') ?? [];

    if (this.data.existingConnectionId) {
      // Update existing connection
      const updatedConnections = existingConnections.map((conn) =>
        conn.id === this.data.existingConnectionId ? connection : conn
      );
      await config.update('connections', updatedConnections, vscode.ConfigurationTarget.Global);
    } else {
      // Add new connection
      const updatedConnections = [...existingConnections, connection];
      await config.update('connections', updatedConnections, vscode.ConfigurationTarget.Global);
    }
  }
}

/**
 * Starts the setup wizard
 */
export async function startSetupWizard(context: vscode.ExtensionContext): Promise<boolean> {
  const wizard = new SetupWizard(context);
  return await wizard.start();
}
