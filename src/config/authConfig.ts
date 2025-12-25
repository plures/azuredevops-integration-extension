/**
 * Authentication Configuration
 *
 * Centralized configuration for authentication flow selection
 */

import * as vscode from 'vscode';

export type AuthFlowPreference = 'auto' | 'device-code' | 'auth-code';

export interface AuthConfig {
  useAuthCodeFlow: boolean;
  flowPreference: AuthFlowPreference;
}

/**
 * Get authentication configuration from VS Code settings
 */
export function getAuthConfig(): AuthConfig {
  const config = vscode.workspace.getConfiguration('azureDevOpsIntegration.auth');

  const useAuthCodeFlow = config.get<boolean>('useAuthCodeFlow', false);
  const flowPreference = config.get<AuthFlowPreference>('flow', 'auto');

  return {
    useAuthCodeFlow: useAuthCodeFlow || flowPreference === 'auth-code',
    flowPreference: flowPreference,
  };
}

/**
 * Check if authorization code flow should be used for a connection
 */
export function shouldUseAuthCodeFlow(
  authMethod: 'pat' | 'entra' | undefined,
  _connectionId?: string
): boolean {
  // Only use auth code flow for Entra authentication
  if (authMethod !== 'entra') {
    return false;
  }

  const config = getAuthConfig();

  // Explicit preference
  if (config.flowPreference === 'auth-code') {
    return true;
  }

  if (config.flowPreference === 'device-code') {
    return false;
  }

  // Auto mode: use auth code flow if enabled
  return config.useAuthCodeFlow;
}
