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
  authMethod?: 'pat' | 'entra'; // Authentication method selection
  pat?: string;
  connectionTested?: boolean;
  team?: string;
  label?: string;
  existingConnectionId?: string;
  clientId?: string; // Entra ID client ID
  tenantId?: string; // Entra ID tenant ID
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
      title: 'Authentication Method',
      description: 'Choose between Personal Access Token or Microsoft Entra ID',
      completed: false,
    },
    {
      step: 3,
      title: 'Authentication Setup',
      description: 'Configure your chosen authentication method',
      completed: false,
    },
    {
      step: 4,
      title: 'Test Connection',
      description: 'Verify your connection works correctly',
      completed: false,
    },
    {
      step: 5,
      title: 'Optional Settings',
      description: 'Configure team and connection label',
      completed: false,
    },
    {
      step: 6,
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
        return await this.step2_AuthMethodSelection();
      case 3:
        return await this.step3_AuthenticationSetup();
      case 4:
        return await this.step4_TestConnection();
      case 5:
        return await this.step5_OptionalSettings();
      case 6:
        return await this.step6_CompleteSetup();
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
   * Step 2: Select authentication method
   */
  private async step2_AuthMethodSelection(): Promise<boolean> {
    const step = this.steps[1];

    const authMethodChoice = await vscode.window.showQuickPick(
      [
        {
          label: 'Microsoft Entra ID (Recommended)',
          description: 'Sign in with your Microsoft account - no token creation needed',
          detail:
            'Uses OAuth 2.0 authentication. Tokens refresh automatically. Recommended for enterprise environments.',
          value: 'entra',
        },
        {
          label: 'Personal Access Token (PAT)',
          description: 'Traditional token-based authentication',
          detail:
            'Requires manual PAT creation and periodic rotation. Works for all Azure DevOps configurations.',
          value: 'pat',
        },
      ],
      {
        placeHolder: `Step ${this.currentStep}: ${step.title}`,
        ignoreFocusOut: true,
      }
    );

    if (!authMethodChoice) return false;

    this.data.authMethod = authMethodChoice.value as 'pat' | 'entra';
    step.completed = true;
    return true;
  }

  /**
   * Step 3: Setup authentication based on selected method
   */
  private async step3_AuthenticationSetup(): Promise<boolean> {
    if (this.data.authMethod === 'entra') {
      return await this.step3_EntraIDSetup();
    } else {
      return await this.step3_PATSetup();
    }
  }

  /**
   * Step 3a: Entra ID authentication setup
   */
  private async step3_EntraIDSetup(): Promise<boolean> {
    const step = this.steps[2];

    if (!this.data.parsedUrl) return false;

    // Get Entra ID configuration from settings
    const config = vscode.workspace.getConfiguration('azureDevOpsIntegration');
    const defaultClientId =
      config.get<string>('entra.defaultClientId') || '872cd9fa-d31f-45e0-9eab-6e460a02d1f1';
    const defaultTenantId = config.get<string>('entra.defaultTenantId') || 'organizations';

    // Show information about Entra ID auth
    const choice = await vscode.window.showInformationMessage(
      `Step ${this.currentStep}: ${step.title}\n\n` +
        `Microsoft Entra ID authentication will:\n` +
        `• Open a browser window for you to sign in\n` +
        `• Display a device code to enter\n` +
        `• Automatically handle token refresh\n` +
        `• Work with your organization's security policies\n\n` +
        `Using default settings:\n` +
        `• Client ID: Visual Studio IDE (Microsoft)\n` +
        `• Tenant: ${defaultTenantId}\n\n` +
        `You can customize these settings later if needed.`,
      'Continue',
      'Use Custom Configuration',
      'Cancel'
    );

    if (choice === 'Cancel') return false;

    if (choice === 'Use Custom Configuration') {
      // Allow user to customize client ID and tenant ID
      const customClientId = await vscode.window.showInputBox({
        prompt: 'Enter Azure AD Application (Client) ID',
        value: defaultClientId,
        placeHolder: '872cd9fa-d31f-45e0-9eab-6e460a02d1f1',
        validateInput: (value) => {
          if (!value || !value.trim()) {
            return 'Client ID is required';
          }
          // Basic UUID validation
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
            return 'Client ID must be a valid GUID';
          }
          return null;
        },
        ignoreFocusOut: true,
      });

      if (!customClientId) return false;

      const customTenantId = await vscode.window.showInputBox({
        prompt: 'Enter Azure AD Tenant ID or domain',
        value: defaultTenantId,
        placeHolder: 'organizations, common, or your-tenant-id',
        validateInput: (value) => {
          if (!value || !value.trim()) {
            return 'Tenant ID is required';
          }
          return null;
        },
        ignoreFocusOut: true,
      });

      if (!customTenantId) return false;

      this.data.clientId = customClientId;
      this.data.tenantId = customTenantId;
    } else {
      this.data.clientId = defaultClientId;
      this.data.tenantId = defaultTenantId;
    }

    // Note: We won't actually authenticate here - that will happen in the test connection step
    // or after saving the connection. This just configures the Entra ID settings.
    step.completed = true;
    return true;
  }

  /**
   * Step 3b: PAT authentication setup
   */
  private async step3_PATSetup(): Promise<boolean> {
    const step = this.steps[2];

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
   * Step 2 (old): Get Personal Access Token
   * @deprecated - Now handled by step3_PATSetup
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
   * Step 4: Test connection
   */
  private async step4_TestConnection(): Promise<boolean> {
    const step = this.steps[3];

    if (!this.data.parsedUrl) return false;

    // For PAT auth, perform a token-based connection test. For Entra ID, we
    // defer interactive auth to first use and mark this step as completed.
    if (this.data.authMethod === 'entra') {
      this.data.connectionTested = true;
      step.completed = true;
      return true;
    }

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
   * Step 5: Optional settings
   */
  private async step5_OptionalSettings(): Promise<boolean> {
    const step = this.steps[4];

    if (!this.data.parsedUrl) return false;

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
      if (this.data.authMethod === 'pat' && this.data.pat) {
        // Test connection first to get teams (PAT flow only)
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
      } else {
        vscode.window.showInformationMessage(
          'Team configuration requires additional permissions. You can configure this after signing in.'
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
   * Step 6: Complete setup
   */
  private async step6_CompleteSetup(): Promise<boolean> {
    const step = this.steps[5];

    if (!this.data.parsedUrl) return false;

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
      return await this.step5_OptionalSettings();
    }

    step.completed = true;
    return true;
  }

  /**
   * Completes the setup by saving the connection
   */
  private async completeSetup(): Promise<void> {
    if (!this.data.parsedUrl) {
      throw new Error('Setup data is incomplete');
    }

    // Validate based on auth method
    if (this.data.authMethod === 'pat' && !this.data.pat) {
      throw new Error('PAT is required for PAT authentication');
    }

    // Create connection object
    const connectionId = this.data.existingConnectionId || randomUUID();

    let connection: any = {
      id: connectionId,
      organization: this.data.parsedUrl.organization,
      project: this.data.parsedUrl.project,
      label: this.data.label,
      team: this.data.team,
      baseUrl: this.data.parsedUrl.baseUrl,
      authMethod: this.data.authMethod || 'pat',
    };

    // Handle PAT authentication
    if (this.data.authMethod === 'pat' || !this.data.authMethod) {
      const patKey = `azureDevOpsInt.pat.${connectionId}`;
      // Save PAT with connection-specific key
      await this.context.secrets.store(patKey, this.data.pat!);
      connection.patKey = patKey;
    }

    // Handle Entra ID authentication
    if (this.data.authMethod === 'entra') {
      connection.clientId = this.data.clientId;
      connection.tenantId = this.data.tenantId;
      // Note: Actual authentication will happen when the connection is activated
      // via the signInWithEntra command or automatically when ensureActiveConnection is called
    }

    // Save connection to configuration
    await this.saveConnectionToConfig(connection);

    // Set as active connection
    await this.context.globalState.update('azureDevOpsInt.activeConnectionId', connection.id);

    // Update legacy settings for backward compatibility (only for the primary connection)
    const config = vscode.workspace.getConfiguration('azureDevOpsIntegration');
    const existingConnections = await this.getExistingConnections();
    if (existingConnections.length === 1) {
      // Only update legacy settings if this is the only connection
      await config.update(
        'organization',
        connection.organization,
        vscode.ConfigurationTarget.Global
      );
      await config.update('project', connection.project, vscode.ConfigurationTarget.Global);
      await config.update('team', connection.team, vscode.ConfigurationTarget.Global);
    }

    const authMethodName = this.data.authMethod === 'entra' ? 'Entra ID' : 'PAT';
    const action = this.data.existingConnectionId ? 'updated' : 'configured and saved';
    const entraNote =
      this.data.authMethod === 'entra'
        ? '\n\nYou will be prompted to sign in with Microsoft Entra ID when you first access this connection.'
        : '';

    vscode.window
      .showInformationMessage(
        `Setup completed successfully!\n\n` +
          `Your Azure DevOps connection has been ${action} with ${authMethodName} authentication. ` +
          `You can now use the extension to view and manage work items.${entraNote}`,
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
