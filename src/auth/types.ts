/**
 * Authentication types for Azure DevOps Integration
 * Supports both Personal Access Token (PAT) and Microsoft Entra ID authentication
 */

export type AuthMethod = 'pat' | 'entra';

/**
 * Base authentication result
 */
export interface AuthenticationResult {
  success: boolean;
  error?: string;
  accessToken?: string;
  expiresAt?: Date;
  refreshToken?: string;
}

/**
 * Token information
 */
export interface TokenInfo {
  accessToken: string;
  expiresAt: Date;
  refreshToken?: string;
  scopes?: string[];
}

/**
 * Authentication provider interface
 * All auth methods must implement this interface
 */
export interface IAuthProvider {
  /**
   * Authenticate and acquire an access token
   */
  authenticate(): Promise<AuthenticationResult>;

  /**
   * Get a valid access token (from cache or by refreshing)
   */
  getAccessToken(): Promise<string | undefined>;

  /**
   * Refresh the access token if possible
   */
  refreshAccessToken?(): Promise<AuthenticationResult>;

  /**
   * Sign out and clear cached credentials
   */
  signOut(): Promise<void>;

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): Promise<boolean>;

  /**
   * Get token expiration info
   */
  getTokenInfo?(): Promise<TokenInfo | undefined>;
}

/**
 * PAT authentication configuration
 */
export interface PatAuthConfig {
  pat: string;
}

/**
 * Entra ID authentication configuration
 */
export interface EntraAuthConfig {
  tenantId?: string; // Optional, defaults to 'common' or 'organizations'
  clientId: string; // Azure AD app registration client ID
  scopes: string[]; // OAuth scopes (e.g., ['499b84ac-1321-427f-aa17-267ca6975798/.default'])
  // 499b84ac-1321-427f-aa17-267ca6975798 is the Azure DevOps service principal ID
}

/**
 * Device code callback for Entra ID authentication
 * Called when user needs to authenticate via browser
 */
export interface DeviceCodeCallback {
  (deviceCode: string, userCode: string, verificationUrl: string, expiresIn: number): Promise<void>;
}

/**
 * Entra ID device code authentication response
 */
export interface DeviceCodeResponse {
  userCode: string;
  deviceCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
  message: string;
}
