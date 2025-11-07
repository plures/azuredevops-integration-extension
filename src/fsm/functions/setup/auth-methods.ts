/**
 * Authentication Method Utilities
 *
 * Provides available authentication methods based on environment type.
 */

import type { EnvironmentType } from './environment-detection.js';

export type AuthMethodId = 'entra' | 'pat' | 'ntlm' | 'basic';

/**
 * Subset of AuthMethodId that can be recommended by getRecommendedAuthMethod.
 * Only 'entra' and 'pat' are currently supported as recommended methods.
 * NTLM and Basic auth are defined in AuthMethodId for completeness but are
 * not exposed in the setup wizard or recommended by the system.
 */
export type RecommendedAuthMethodId = 'entra' | 'pat';

/**
 * Type guard to check if an auth method ID is a recommended auth method
 */
function isRecommendedAuthMethod(id: AuthMethodId): id is RecommendedAuthMethodId {
  return id === 'entra' || id === 'pat';
}

export interface AuthMethod {
  id: AuthMethodId;
  label: string;
  description: string;
  recommended: boolean;
  available: boolean;
}

/**
 * Returns available authentication methods for a given environment
 *
 * @param environment - Environment type (online or onpremises)
 * @returns Array of available authentication methods
 */
export function getAvailableAuthMethods(environment: EnvironmentType): AuthMethod[] {
  if (environment === 'online') {
    return [
      {
        id: 'entra',
        label: 'Microsoft Entra ID (OAuth)',
        description: 'Recommended: Secure, no token management, auto-refresh',
        recommended: true,
        available: true,
      },
      {
        id: 'pat',
        label: 'Personal Access Token',
        description: 'Traditional PAT authentication',
        recommended: false,
        available: true,
      },
    ];
  }

  // OnPremises - only PAT is reliably supported
  // Note: NTLM and Basic are technically supported by servers
  // but require special client configuration, so we don't expose them
  // unless explicitly requested via manual configuration
  return [
    {
      id: 'pat',
      label: 'Personal Access Token',
      description: 'Recommended: Works with all OnPremises configurations',
      recommended: true,
      available: true,
    },
  ];
}

/**
 * Gets the recommended (default) authentication method for an environment
 *
 * @param environment - Environment type
 * @returns Recommended auth method ID ('entra' or 'pat'), or null if none
 */
export function getRecommendedAuthMethod(environment: EnvironmentType): RecommendedAuthMethodId | null {
  const methods = getAvailableAuthMethods(environment);
  const recommended = methods.find((m) => m.recommended && m.available);
  
  if (!recommended) {
    return null;
  }
  
  // Runtime check to ensure we only return supported recommended methods
  // This protects against future changes where a new auth method might be
  // added with recommended: true but not added to RecommendedAuthMethodId
  if (isRecommendedAuthMethod(recommended.id)) {
    return recommended.id;
  }
  
  // This should never happen with the current implementation
  return null;
}

/**
 * Checks if an auth method is available for an environment
 *
 * @param authMethodId - Auth method ID to check
 * @param environment - Environment type
 * @returns true if method is available, false otherwise
 */
export function isAuthMethodAvailable(
  authMethodId: AuthMethodId,
  environment: EnvironmentType
): boolean {
  const methods = getAvailableAuthMethods(environment);
  return methods.some((m) => m.id === authMethodId && m.available);
}
