/**
 * Enhanced Setup Wizard
 *
 * Provides intelligent, environment-aware connection setup with minimal user input.
 * Auto-detects values where possible and presents appropriate auth methods.
 */

import * as vscode from 'vscode';
import type { ParsedAzureDevOpsUrl } from '../../../azureDevOpsUrlParser.js';
import type { ProjectConnection } from '../../machines/applicationMachine.js';
import { getEnvironmentLabel } from './environment-detection.js';
import { getAvailableAuthMethods } from './auth-methods.js';
import { validateUsernameFormat, formatUsername } from './user-detection.js';
import {
  autoDetectConnectionDefaults,
  createConnectionFromDefaults,
} from './connection-defaults.js';

export interface EnhancedSetupOptions {
  parsedUrl: ParsedAzureDevOpsUrl;
  connectionToEdit?: ProjectConnection;
}

export interface EnhancedSetupResult {
  connection: Partial<ProjectConnection>;
  authMethod: 'pat' | 'entra';
  pat?: string; // Only if PAT auth
  identityName?: string; // Only for OnPremises
}

/**
 * Shows quick setup dialog with auto-detected values
 *
 * @param defaults - Auto-detected connection defaults
 * @returns Setup result or undefined if cancelled
 */
async function showQuickSetup(
  defaults: ReturnType<typeof autoDetectConnectionDefaults>
): Promise<EnhancedSetupResult | undefined> {
  const environmentLabel = getEnvironmentLabel(defaults.environment);

  // Build detail message showing detected values
  const detailParts: string[] = [
    `Environment: ${environmentLabel}`,
    `Organization: ${defaults.organization}`,
    `Project: ${defaults.project}`,
  ];

  if (defaults.environment === 'onpremises' && defaults.windowsUser) {
    detailParts.push(`User: ${defaults.windowsUser.formatted}`);
  }

  // Get available auth methods
  const availableMethods = getAvailableAuthMethods(defaults.environment);

  // Build QuickPick items with recommended method first
  const authItems = availableMethods.map((method) => ({
    label: method.recommended ? `$(star) ${method.label}` : method.label,
    description: method.description,
    detail: method.recommended ? 'Recommended' : detailParts.join(' • '),
    method: method.id,
  }));

  // Pre-select recommended method
  const selectedAuth = await vscode.window.showQuickPick(authItems, {
    placeHolder: `Choose authentication method for ${environmentLabel}`,
    ignoreFocusOut: true,
  });

  if (!selectedAuth) return undefined;

  const authMethod = selectedAuth.method === 'entra' ? 'entra' : 'pat';
  const result: EnhancedSetupResult = {
    connection: createConnectionFromDefaults(defaults, {
      authMethod,
    }),
    authMethod,
  };

  // For OnPremises, prompt for identityName
  if (defaults.environment === 'onpremises') {
    const suggestedIdentity = defaults.identityName || '';
    const identityPrompt = suggestedIdentity
      ? `Identity for @Me queries (press Enter to use: ${suggestedIdentity})`
      : `Identity for @Me queries (e.g., DOMAIN\\user or user@domain.com)`;

    const identityInput = await vscode.window.showInputBox({
      prompt: identityPrompt,
      value: suggestedIdentity,
      placeHolder: suggestedIdentity || 'CORP\\username or user@domain.com',
      validateInput: (value) => {
        // Allow empty if we have a suggestion (user can press Enter to accept)
        if (!value && suggestedIdentity) {
          return null;
        }
        // Require value if no suggestion
        if (!value) {
          return 'Identity is recommended for OnPremises servers to resolve @Me queries';
        }
        // Validate format if provided
        if (!validateUsernameFormat(value)) {
          return 'Invalid format. Use DOMAIN\\user or user@domain.com';
        }
        return null;
      },
    });

    // Use provided input, or fall back to suggested if empty (but not empty string)
    // identityInput can be empty string if user pressed Enter with suggestion
    const finalIdentity = identityInput !== undefined ? identityInput : suggestedIdentity;
    if (finalIdentity && finalIdentity.trim()) {
      result.identityName = formatUsername(finalIdentity);
      result.connection.identityName = result.identityName;
    }
  }

  // Collect PAT if needed
  if (authMethod === 'pat') {
    const pat = await vscode.window.showInputBox({
      prompt: 'Enter your Personal Access Token',
      password: true,
      ignoreFocusOut: true,
    });

    if (!pat) return undefined;

    result.pat = pat;
  }

  return result;
}

/**
 * Prompts for OnPremises identity name
 */
async function promptOnPremisesIdentity(
  defaults: ReturnType<typeof autoDetectConnectionDefaults>
): Promise<string | undefined> {
  const suggestedIdentity = defaults.identityName || '';
  const identityInput = await vscode.window.showInputBox({
    prompt: 'Identity Name (for @Me queries)',
    value: suggestedIdentity,
    placeHolder: 'CORP\\username or user@domain.com',
    validateInput: (value) => {
      if (value && !validateUsernameFormat(value)) {
        return 'Invalid format. Use DOMAIN\\user or user@domain.com';
      }
      return null;
    },
  });

  return identityInput ? formatUsername(identityInput) : undefined;
}

/**
 * Collects PAT from user
 */
async function collectPAT(): Promise<string | undefined> {
  const patInput = await vscode.window.showInputBox({
    prompt: 'Enter your Personal Access Token',
    password: true,
  });
  return patInput || undefined;
}

/**
 * Shows advanced setup dialog with all fields editable
 *
 * @param defaults - Auto-detected defaults
 * @returns Setup result or undefined if cancelled
 */
async function showAdvancedSetup(
  defaults: ReturnType<typeof autoDetectConnectionDefaults>
): Promise<EnhancedSetupResult | undefined> {
  // Show all fields for manual editing
  const organization = await vscode.window.showInputBox({
    prompt: 'Organization/Collection Name',
    value: defaults.organization,
    validateInput: (value) => (value ? null : 'Organization is required'),
  });
  if (!organization) return undefined;

  const project = await vscode.window.showInputBox({
    prompt: 'Project Name',
    value: defaults.project,
    validateInput: (value) => (value ? null : 'Project is required'),
  });
  if (!project) return undefined;

  const baseUrl = await vscode.window.showInputBox({
    prompt: 'Base URL',
    value: defaults.baseUrl,
    validateInput: (value) => {
      if (!value) return 'Base URL is required';
      try {
        new URL(value);
        return null;
      } catch {
        return 'Invalid URL format';
      }
    },
  });
  if (!baseUrl) return undefined;

  const apiBaseUrl = await vscode.window.showInputBox({
    prompt: 'API Base URL (optional, auto-detected if empty)',
    value: defaults.apiBaseUrl,
    validateInput: (value) => {
      if (!value) return null; // Optional
      try {
        new URL(value);
        return null;
      } catch {
        return 'Invalid URL format';
      }
    },
  });

  // Auth method selection
  const availableMethods = getAvailableAuthMethods(defaults.environment);
  const authItems = availableMethods.map((method) => ({
    label: method.recommended ? `$(star) ${method.label}` : method.label,
    description: method.description,
    method: method.id,
  }));

  const selectedAuth = await vscode.window.showQuickPick(authItems, {
    placeHolder: 'Choose authentication method',
  });
  if (!selectedAuth) return undefined;

  const authMethod = selectedAuth.method === 'entra' ? 'entra' : 'pat';

  // For OnPremises, always prompt for identityName in advanced mode
  const identityName =
    defaults.environment === 'onpremises' ? await promptOnPremisesIdentity(defaults) : undefined;

  // Label
  const label = await vscode.window.showInputBox({
    prompt: 'Connection Label (optional)',
    value: `${organization}/${project}`,
  });

  // Team (optional)
  const team = await vscode.window.showInputBox({
    prompt: 'Team Name (optional)',
  });

  // Collect PAT if needed
  const pat = authMethod === 'pat' ? await collectPAT() : undefined;
  if (authMethod === 'pat' && !pat) return undefined;

  const result: EnhancedSetupResult = {
    connection: createConnectionFromDefaults(
      {
        ...defaults,
        organization,
        project,
        baseUrl,
        apiBaseUrl: apiBaseUrl || defaults.apiBaseUrl,
      },
      {
        authMethod,
        label: label || undefined,
        team: team || undefined,
        identityName,
      }
    ),
    authMethod,
    pat,
    identityName,
  };

  return result;
}

/**
 * Enhanced setup wizard with environment-aware flow
 *
 * @param options - Setup options including parsed URL
 * @returns Setup result or undefined if cancelled
 */
export async function runEnhancedSetupWizard(
  options: EnhancedSetupOptions
): Promise<EnhancedSetupResult | undefined> {
  const { parsedUrl, connectionToEdit: _connectionToEdit } = options;

  if (!parsedUrl.isValid) {
    vscode.window.showErrorMessage(`Invalid URL: ${parsedUrl.error || 'Invalid Azure DevOps URL'}`);
    return undefined;
  }

  // Auto-detect defaults
  const defaults = autoDetectConnectionDefaults(parsedUrl);
  const environmentLabel = getEnvironmentLabel(defaults.environment);

  // Show environment detection result (non-modal, brief info)
  // Note: We'll show this in the QuickPick description instead to reduce popups

  // Choose setup path
  const setupChoice = await vscode.window.showQuickPick(
    [
      {
        label: '$(zap) Quick Setup',
        description: `Use auto-detected values (recommended)`,
        detail: `${environmentLabel} • Organization: ${defaults.organization}, Project: ${defaults.project}`,
        value: 'quick' as const,
      },
      {
        label: '$(settings-gear) Advanced Options',
        description: 'Manually configure all settings',
        detail: 'Edit organization, project, URLs, auth method, and more',
        value: 'advanced' as const,
      },
    ],
    {
      placeHolder: `How would you like to set up this ${environmentLabel} connection?`,
    }
  );

  if (!setupChoice) return undefined;

  if (setupChoice.value === 'quick') {
    return await showQuickSetup(defaults);
  } else {
    return await showAdvancedSetup(defaults);
  }
}
