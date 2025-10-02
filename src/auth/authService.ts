/**
 * Authentication Service
 * Provides a unified interface for managing authentication across PAT and Entra ID
 */

import type * as vscode from 'vscode';
import { PatAuthProvider } from './patAuthProvider.js';
import { EntraAuthProvider } from './entraAuthProvider.js';
import type {
  IAuthProvider,
  AuthMethod,
  AuthenticationResult,
  TokenInfo,
  PatAuthConfig,
  EntraAuthConfig,
  DeviceCodeCallback,
} from './types.js';

export interface AuthServiceOptions {
  authMethod: AuthMethod;
  secretStorage: vscode.SecretStorage;
  connectionId: string;
  patConfig?: PatAuthConfig;
  entraConfig?: EntraAuthConfig;
  deviceCodeCallback?: DeviceCodeCallback;
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
    return this.provider.getAccessToken();
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
    return this.provider.signOut();
  }

  /**
   * Check if currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return this.provider.isAuthenticated();
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
      patConfig: { pat },
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
    });
  } else {
    throw new Error(`Unsupported authentication method: ${authMethod}`);
  }
}
