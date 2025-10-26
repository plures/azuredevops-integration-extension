/**
 * Authentication Service
 * Provides a unified interface for managing authentication across PAT and Entra ID
 */

import type * as vscode from 'vscode';
import { EntraAuthProvider } from './entraAuthProvider.js';

// Inline type definitions for removed auth components
export type AuthMethod = 'pat' | 'entra';

export interface AuthenticationResult {
  success: boolean;
  accessToken?: string;
  error?: string;
  requiresDeviceCode?: boolean;
}

export interface TokenInfo {
  accessToken: string;
  expiresAt: Date;
  scopes: string[];
}

export interface IAuthProvider {
  authenticate(): Promise<AuthenticationResult>;
  getToken(): Promise<TokenInfo | null>;
  clearTokens(): Promise<void>;
  refreshToken?(): Promise<AuthenticationResult>;

  // Additional methods provided by EntraAuthProvider
  getAccessToken?(): Promise<string | undefined>;
  refreshAccessToken?(): Promise<AuthenticationResult>;
  signOut?(): Promise<void>;
  resetToken?(): Promise<void>;
  isAuthenticated?(): Promise<boolean>;
  getTokenInfo?(): Promise<TokenInfo | undefined>;
}

export interface PatAuthConfig {
  personalAccessToken: string;
}

export interface EntraAuthConfig {
  clientId: string;
  tenantId?: string;
  scopes?: string[];
}

export type DeviceCodeCallback = (
  deviceCode: string,
  userCode: string,
  verificationUri: string,
  expiresIn: number
) => Promise<void>;

// Stub PatAuthProvider for backward compatibility
class PatAuthProvider implements IAuthProvider {
  constructor(private config: PatAuthConfig) {}

  async authenticate(): Promise<AuthenticationResult> {
    return { success: true, accessToken: this.config.personalAccessToken };
  }

  async getToken(): Promise<TokenInfo | null> {
    return {
      accessToken: this.config.personalAccessToken,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      scopes: ['vso.work', 'vso.build', 'vso.code'], // Default PAT scopes
    };
  }

  async clearTokens(): Promise<void> {
    // No-op for PAT
  }
}

export interface AuthServiceOptions {
  authMethod: AuthMethod;
  secretStorage: vscode.SecretStorage;
  connectionId: string;
  patConfig?: PatAuthConfig;
  entraConfig?: EntraAuthConfig;
  deviceCodeCallback?: DeviceCodeCallback;
  onStatusUpdate?: (connectionId: string, status: any) => void;
}

/**
 * Manages authentication for a single connection
 * Supports both PAT and Entra ID authentication methods
 */
export class AuthService {
  private authMethod: AuthMethod;
  private provider: IAuthProvider;
  private connectionId: string;

  constructor(options: AuthServiceOptions) {
    this.authMethod = options.authMethod;
    this.connectionId = options.connectionId;

    // Create the appropriate auth provider
    if (options.authMethod === 'pat') {
      if (!options.patConfig) {
        throw new Error('PAT configuration is required for PAT authentication');
      }
      this.provider = new PatAuthProvider(options.patConfig);
    } else if (options.authMethod === 'entra') {
      if (!options.entraConfig) {
        throw new Error('Entra configuration is required for Entra ID authentication');
      }
      this.provider = new EntraAuthProvider({
        config: options.entraConfig,
        secretStorage: options.secretStorage,
        connectionId: options.connectionId,
        deviceCodeCallback: options.deviceCodeCallback,
        onStatusUpdate: options.onStatusUpdate,
      });
    } else {
      throw new Error(`Unsupported authentication method: ${options.authMethod}`);
    }
  }

  /**
   * Get the authentication method
   */
  getAuthMethod(): AuthMethod {
    return this.authMethod;
  }

  /**
   * Get the connection ID
   */
  getConnectionId(): string {
    return this.connectionId;
  }

  /**
   * Authenticate and acquire an access token
   */
  async authenticate(): Promise<AuthenticationResult> {
    return this.provider.authenticate();
  }

  /**
   * Get a valid access token (from cache or by refreshing)
   */
  async getAccessToken(): Promise<string | undefined> {
    return this.provider.getAccessToken?.();
  }

  /**
   * Refresh the access token if supported by the auth method
   */
  async refreshAccessToken(): Promise<AuthenticationResult> {
    if (this.provider.refreshAccessToken) {
      return this.provider.refreshAccessToken();
    }
    return {
      success: false,
      error: 'Token refresh not supported for this authentication method',
    };
  }

  /**
   * Sign out and clear cached credentials
   */
  async signOut(): Promise<void> {
    return this.provider.signOut?.();
  }

  /**
   * Reset token cache and failure tracking (if supported)
   */
  async resetToken(): Promise<void> {
    if (this.provider.resetToken) {
      return this.provider.resetToken();
    }
  }

  /**
   * Check if currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return this.provider.isAuthenticated?.() ?? false;
  }

  /**
   * Get token expiration info (if supported)
   */
  async getTokenInfo(): Promise<TokenInfo | undefined> {
    if (this.provider.getTokenInfo) {
      return this.provider.getTokenInfo();
    }
    return undefined;
  }

  /**
   * Get refresh status from TokenLifecycleManager (if supported)
   */
  getRefreshStatus(): any {
    if (this.provider && typeof (this.provider as any).getRefreshStatus === 'function') {
      return (this.provider as any).getRefreshStatus();
    }
    return undefined;
  }

  /**
   * Check if token is about to expire (within 5 minutes)
   */
  async isTokenExpiringSoon(): Promise<boolean> {
    const tokenInfo = await this.getTokenInfo();
    if (!tokenInfo) {
      return false;
    }

    const now = Date.now();
    const fiveMinutesFromNow = now + 5 * 60 * 1000;
    return tokenInfo.expiresAt.getTime() < fiveMinutesFromNow;
  }

  /**
   * Get human-readable token expiration status
   */
  async getTokenExpirationStatus(): Promise<string> {
    const tokenInfo = await this.getTokenInfo();
    if (!tokenInfo) {
      return 'Unknown';
    }

    const now = Date.now();
    const expiresAt = tokenInfo.expiresAt.getTime();
    const diffMs = expiresAt - now;

    if (diffMs <= 0) {
      return 'Expired';
    }

    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    }
  }

  /**
   * Dispose resources and cleanup
   */
  dispose(): void {
    if (this.provider && typeof (this.provider as any).dispose === 'function') {
      (this.provider as any).dispose();
    }
  }
}

/**
 * Factory function to create an AuthService from connection configuration
 */
export async function createAuthService(
  authMethod: AuthMethod,
  secretStorage: vscode.SecretStorage,
  connectionId: string,
  options: {
    patKey?: string;
    entraConfig?: EntraAuthConfig;
    deviceCodeCallback?: DeviceCodeCallback;
    onStatusUpdate?: (connectionId: string, status: any) => void;
  }
): Promise<AuthService> {
  if (authMethod === 'pat') {
    if (!options.patKey) {
      throw new Error('PAT key is required for PAT authentication');
    }

    const pat = await secretStorage.get(options.patKey);
    if (!pat) {
      throw new Error('PAT not found in secret storage');
    }

    return new AuthService({
      authMethod: 'pat',
      secretStorage,
      connectionId,
      patConfig: { personalAccessToken: pat },
    });
  } else if (authMethod === 'entra') {
    if (!options.entraConfig) {
      throw new Error('Entra configuration is required for Entra ID authentication');
    }

    return new AuthService({
      authMethod: 'entra',
      secretStorage,
      connectionId,
      entraConfig: options.entraConfig,
      deviceCodeCallback: options.deviceCodeCallback,
      onStatusUpdate: options.onStatusUpdate,
    });
  } else {
    throw new Error(`Unsupported authentication method: ${authMethod}`);
  }
}
