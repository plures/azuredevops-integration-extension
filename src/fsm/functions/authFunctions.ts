/**
 * Pure functions for authentication operations
 * These functions follow FSM-first principles:
 * - Take FSM context as input
 * - Return results for FSM processing
 * - No side effects or direct state mutations
 * - Single responsibility per function
 */

import { FSMComponent, fsmLogger } from '../logging/FSMLogger.js';

/**
 * Authentication configuration
 */
export interface AuthConfig {
  connectionId: string;
  authMethod: 'pat' | 'entra';
  organization: string;
  project: string;
  baseUrl?: string;
  apiBaseUrl?: string;
  tenantId?: string;
  identityName?: string;
  patKey?: string;
}

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  credential?: string;
  authMethod: 'pat' | 'entra';
  error?: string;
  requiresInteractive?: boolean;
}

/**
 * FSM context for authentication operations
 */
export interface AuthContext {
  component: FSMComponent;
  connectionId: string;
}

/**
 * Pure function to validate authentication configuration
 * @param config Authentication configuration to validate
 * @returns Validation result
 */
export function validateAuthConfig(config: AuthConfig): {
  isValid: boolean;
  errors?: string[];
  normalizedConfig?: AuthConfig;
} {
  const errors: string[] = [];

  if (!config.connectionId) {
    errors.push('Connection ID is required');
  }

  if (!config.authMethod || !['pat', 'entra'].includes(config.authMethod)) {
    errors.push('Valid auth method (pat or entra) is required');
  }

  if (!config.organization) {
    errors.push('Organization is required');
  }

  if (!config.project) {
    errors.push('Project is required');
  }

  // Auth method specific validation
  if (config.authMethod === 'entra') {
    // Client ID is now hardcoded in connection machine - no validation needed
  } else if (config.authMethod === 'pat') {
    if (!config.patKey) {
      errors.push('PAT key is required for PAT authentication');
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Create normalized configuration
  const normalizedConfig: AuthConfig = {
    connectionId: config.connectionId.trim(),
    authMethod: config.authMethod,
    organization: config.organization.trim(),
    project: config.project.trim(),
    baseUrl: config.baseUrl?.trim(),
    apiBaseUrl: config.apiBaseUrl?.trim(),
    tenantId: config.tenantId?.trim(),
    identityName: config.identityName?.trim(),
    patKey: config.patKey?.trim(),
  };

  return { isValid: true, normalizedConfig };
}

/**
 * Pure function to determine authentication strategy
 * @param config Validated authentication configuration
 * @param context FSM context for logging
 * @returns Authentication strategy
 */
export function determineAuthStrategy(
  config: AuthConfig,
  context: AuthContext
): {
  strategy: 'check-existing' | 'interactive' | 'refresh';
  requiresUserInput: boolean;
  canAutomate: boolean;
} {
  fsmLogger.debug(FSMComponent.AUTH, 'Determining authentication strategy', context, {
    authMethod: config.authMethod,
    hasTenantId: !!config.tenantId,
    hasPatKey: !!config.patKey,
  });

  if (config.authMethod === 'pat') {
    // PAT authentication is simpler - check if we have a stored PAT
    return {
      strategy: 'check-existing',
      requiresUserInput: false,
      canAutomate: true,
    };
  } else {
    // Entra ID authentication - check existing tokens first, then interactive
    return {
      strategy: 'check-existing',
      requiresUserInput: true, // May need device code flow
      canAutomate: false, // Requires user interaction for device code
    };
  }
}

/**
 * Pure function to create authentication request parameters
 * @param config Validated authentication configuration
 * @param strategy Authentication strategy
 * @param context FSM context for logging
 * @returns Authentication request parameters
 */
export function createAuthRequest(
  config: AuthConfig,
  strategy: string,
  context: AuthContext
): {
  type: 'pat' | 'entra';
  parameters: any;
  timeout?: number;
} {
  fsmLogger.debug(FSMComponent.AUTH, 'Creating authentication request', context, {
    authMethod: config.authMethod,
    strategy,
    organization: config.organization,
    project: config.project,
  });

  if (config.authMethod === 'pat') {
    return {
      type: 'pat',
      parameters: {
        connectionId: config.connectionId,
        patKey: config.patKey,
        organization: config.organization,
        project: config.project,
        baseUrl: config.baseUrl,
        apiBaseUrl: config.apiBaseUrl,
      },
    };
  } else {
    return {
      type: 'entra',
      parameters: {
        connectionId: config.connectionId,
        tenantId: config.tenantId,
        organization: config.organization,
        project: config.project,
        baseUrl: config.baseUrl,
        apiBaseUrl: config.apiBaseUrl,
        scopes: ['https://app.vssps.visualstudio.com/.default'],
      },
      timeout: 300000, // 5 minutes for device code flow
    };
  }
}

/**
 * Pure function to validate authentication result
 * @param result Raw authentication result
 * @param config Authentication configuration
 * @param context FSM context for logging
 * @returns Validated and normalized authentication result
 */
export function validateAuthResult(
  result: any,
  config: AuthConfig,
  context: AuthContext
): AuthResult {
  fsmLogger.debug(FSMComponent.AUTH, 'Validating authentication result', context, {
    hasResult: !!result,
    authMethod: config.authMethod,
    hasCredential: !!result?.credential || !!result?.token || !!result?.accessToken,
  });

  if (!result) {
    fsmLogger.warn(FSMComponent.AUTH, 'Authentication result is null or undefined', context);
    return {
      success: false,
      authMethod: config.authMethod,
      error: 'No authentication result received',
    };
  }

  // Extract credential from various possible result formats
  const credential = result.credential || result.token || result.accessToken;

  if (!credential) {
    fsmLogger.warn(FSMComponent.AUTH, 'No credential found in authentication result', context, {
      resultKeys: Object.keys(result),
      resultType: typeof result,
    });

    return {
      success: false,
      authMethod: config.authMethod,
      error: 'No credential in authentication result',
      requiresInteractive: true,
    };
  }

  // Validate credential format based on auth method
  if (config.authMethod === 'pat') {
    // PAT should be a base64-encoded string
    if (typeof credential !== 'string' || credential.length < 10) {
      fsmLogger.warn(FSMComponent.AUTH, 'Invalid PAT credential format', context, {
        credentialType: typeof credential,
        credentialLength: credential?.length,
      });

      return {
        success: false,
        authMethod: config.authMethod,
        error: 'Invalid PAT credential format',
      };
    }
  } else {
    // Entra token should be a JWT-like string
    if (typeof credential !== 'string' || !credential.includes('.')) {
      fsmLogger.warn(FSMComponent.AUTH, 'Invalid Entra credential format', context, {
        credentialType: typeof credential,
        hasJwtStructure: typeof credential === 'string' && credential.includes('.'),
      });

      return {
        success: false,
        authMethod: config.authMethod,
        error: 'Invalid Entra credential format',
      };
    }
  }

  fsmLogger.info(FSMComponent.AUTH, 'Authentication result validated successfully', context, {
    authMethod: config.authMethod,
    hasCredential: true,
    credentialLength: credential.length,
  });

  return {
    success: true,
    credential,
    authMethod: config.authMethod,
  };
}

/**
 * Pure function to handle authentication errors
 * @param error Error from authentication attempt
 * @param config Authentication configuration
 * @param context FSM context for logging
 * @returns Structured error result with recovery suggestions
 */
export function handleAuthError(
  error: any,
  config: AuthConfig,
  context: AuthContext
): {
  success: false;
  authMethod: 'pat' | 'entra';
  error: string;
  errorType: string;
  recoveryAction?: string;
  requiresInteractive?: boolean;
} {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorType = error instanceof Error ? error.constructor.name : 'Unknown';

  fsmLogger.error(FSMComponent.AUTH, 'Authentication error occurred', context, {
    error: errorMessage,
    errorType,
    authMethod: config.authMethod,
    organization: config.organization,
  });

  // Determine recovery actions based on error type and auth method
  let recoveryAction: string | undefined;
  let requiresInteractive = false;

  if (config.authMethod === 'entra') {
    if (errorMessage.includes('AADSTS50058')) {
      recoveryAction = 'Check tenant ID configuration';
    } else if (errorMessage.includes('AADSTS65001')) {
      recoveryAction = 'User needs to consent to application permissions';
      requiresInteractive = true;
    } else if (errorMessage.includes('AADSTS50076')) {
      recoveryAction = 'Multi-factor authentication required';
      requiresInteractive = true;
    } else if (errorMessage.includes('expired') || errorMessage.includes('invalid_token')) {
      recoveryAction = 'Token refresh required';
      requiresInteractive = true;
    } else {
      recoveryAction = 'Retry interactive authentication';
      requiresInteractive = true;
    }
  } else {
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      recoveryAction = 'Check PAT permissions and expiration';
    } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      recoveryAction = 'PAT needs additional scopes';
    } else {
      recoveryAction = 'Check PAT validity and network connection';
    }
  }

  return {
    success: false,
    authMethod: config.authMethod,
    error: errorMessage,
    errorType,
    recoveryAction,
    requiresInteractive,
  };
}

/**
 * Determine whether a token is still valid with a safety buffer
 */
export function isTokenValid(
  tokenInfo: { expiresAt?: Date | number | string } | undefined,
  bufferMs = 5 * 60 * 1000
): boolean {
  if (!tokenInfo || !tokenInfo.expiresAt) {
    return false;
  }

  let expiryMs: number | undefined;

  if (tokenInfo.expiresAt instanceof Date) {
    expiryMs = tokenInfo.expiresAt.getTime();
  } else if (typeof tokenInfo.expiresAt === 'number') {
    expiryMs = tokenInfo.expiresAt;
  } else if (typeof tokenInfo.expiresAt === 'string') {
    const parsed = Date.parse(tokenInfo.expiresAt);
    expiryMs = Number.isNaN(parsed) ? undefined : parsed;
  }

  if (typeof expiryMs !== 'number' || !Number.isFinite(expiryMs)) {
    return false;
  }

  return expiryMs - bufferMs > Date.now();
}
