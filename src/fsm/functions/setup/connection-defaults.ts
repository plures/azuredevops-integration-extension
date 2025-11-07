/**
 * Connection Defaults Utilities
 *
 * Auto-detects and provides default values for connection setup based on
 * parsed URL and environment type.
 */

import type { ParsedAzureDevOpsUrl } from '../../../azureDevOpsUrlParser.js';
import { detectEnvironmentType } from './environment-detection.js';
import { detectWindowsUser } from './user-detection.js';
import { getRecommendedAuthMethod, type RecommendedAuthMethodId } from './auth-methods.js';
import type { ProjectConnection } from '../../machines/applicationMachine.js';

export interface ConnectionDefaults {
  organization: string;
  project: string;
  baseUrl: string;
  apiBaseUrl: string;
  environment: 'online' | 'onpremises';
  recommendedAuthMethod: RecommendedAuthMethodId | null;
  // OnPremises-specific
  windowsUser?: {
    username: string;
    domain: string;
    formatted: string; // DOMAIN\user format
  };
  identityName?: string; // Suggested identity for OnPremises
}

/**
 * Auto-detects connection defaults from parsed URL
 *
 * @param parsedUrl - Parsed Azure DevOps URL
 * @returns Connection defaults with all auto-detected values
 */
export function autoDetectConnectionDefaults(parsedUrl: ParsedAzureDevOpsUrl): ConnectionDefaults {
  const environment = detectEnvironmentType(parsedUrl);
  const recommendedAuthMethod = getRecommendedAuthMethod(environment);

  const defaults: ConnectionDefaults = {
    organization: parsedUrl.organization,
    project: parsedUrl.project,
    baseUrl: parsedUrl.baseUrl,
    apiBaseUrl: parsedUrl.apiBaseUrl,
    environment,
    recommendedAuthMethod,
  };

  // For OnPremises, try to detect Windows user
  if (environment === 'onpremises') {
    const windowsUser = detectWindowsUser();
    if (windowsUser) {
      defaults.windowsUser = windowsUser;
      // Suggest formatted identity for OnPremises (may need adjustment)
      defaults.identityName = windowsUser.formatted;
    }
  }

  return defaults;
}

/**
 * Creates a connection object from defaults with optional overrides
 *
 * @param defaults - Auto-detected defaults
 * @param overrides - Manual overrides from user
 * @returns ProjectConnection object ready to save
 */
export function createConnectionFromDefaults(
  defaults: ConnectionDefaults,
  overrides: {
    label?: string;
    team?: string;
    authMethod?: 'pat' | 'entra';
    patKey?: string;
    tenantId?: string;
    identityName?: string;
    apiBaseUrl?: string;
    id?: string;
  } = {}
): Partial<ProjectConnection> {
  const connection: Partial<ProjectConnection> = {
    id: overrides.id,
    organization: defaults.organization,
    project: defaults.project,
    baseUrl: defaults.baseUrl,
    apiBaseUrl: overrides.apiBaseUrl || defaults.apiBaseUrl,
    authMethod: overrides.authMethod || defaults.recommendedAuthMethod || 'pat',
    label: overrides.label || `${defaults.organization}/${defaults.project}`,
    team: overrides.team,
    tenantId: overrides.tenantId,
    identityName: overrides.identityName || defaults.identityName,
    patKey: overrides.patKey,
  };

  return connection;
}
