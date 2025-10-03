/**
 * Microsoft Entra ID (Azure AD) Authentication Provider
 * Implements device code flow for CLI-like authentication experience
 */

import * as msal from '@azure/msal-node';
import type * as vscode from 'vscode';
import type {
  IAuthProvider,
  AuthenticationResult,
  EntraAuthConfig,
  TokenInfo,
  DeviceCodeCallback,
} from './types.js';

export interface EntraAuthProviderOptions {
  config: EntraAuthConfig;
  secretStorage: vscode.SecretStorage;
  connectionId: string;
  deviceCodeCallback?: DeviceCodeCallback;
}

/**
 * Azure DevOps service principal ID (constant across all Azure AD tenants)
 */
const AZURE_DEVOPS_RESOURCE_ID = '499b84ac-1321-427f-aa17-267ca6975798';

/**
 * Default scopes for Azure DevOps access
 */
const DEFAULT_BASE_SCOPES = [`${AZURE_DEVOPS_RESOURCE_ID}/.default`];
const OFFLINE_ACCESS_SCOPE = 'offline_access';

export class EntraAuthProvider implements IAuthProvider {
  private config: EntraAuthConfig;
  private secretStorage: vscode.SecretStorage;
  private connectionId: string;
  private deviceCodeCallback?: DeviceCodeCallback;
  private msalClient: msal.PublicClientApplication;
  private cachedToken?: TokenInfo;
  private refreshTokenKey: string;
  private tokenCacheKey: string;

  constructor(options: EntraAuthProviderOptions) {
    this.config = options.config;
    this.secretStorage = options.secretStorage;
    this.connectionId = options.connectionId;
    this.deviceCodeCallback = options.deviceCodeCallback;
    this.refreshTokenKey = `azureDevOpsInt.entra.refreshToken.${this.connectionId}`;
    this.tokenCacheKey = `azureDevOpsInt.entra.tokenCache.${this.connectionId}`;

    // Initialize MSAL with device code flow configuration
    const msalConfig: msal.Configuration = {
      auth: {
        clientId: this.config.clientId,
        authority: this.getAuthority(),
      },
      cache: {
        cachePlugin: this.createCachePlugin(),
      },
      system: {
        loggerOptions: {
          loggerCallback: (level, message, containsPii) => {
            if (containsPii) return;
            console.log(`[MSAL][${level}]`, message);
          },
          piiLoggingEnabled: false,
          logLevel: msal.LogLevel.Warning,
        },
      },
    };

    this.msalClient = new msal.PublicClientApplication(msalConfig);
  }

  /**
   * Get the authority URL for MSAL
   */
  private getAuthority(): string {
    const tenantId = this.config.tenantId || 'organizations';
    return `https://login.microsoftonline.com/${tenantId}`;
  }

  /**
   * Resolve requested scopes, ensuring offline_access is always included
   */
  private resolveScopes(): string[] {
    const configuredScopes =
      Array.isArray(this.config.scopes) && this.config.scopes.length > 0
        ? this.config.scopes
        : DEFAULT_BASE_SCOPES;

    const scopeSet = new Set<string>();
    for (const scope of configuredScopes) {
      if (typeof scope === 'string') {
        const trimmed = scope.trim();
        if (trimmed.length > 0) {
          scopeSet.add(trimmed);
        }
      }
    }

    scopeSet.add(OFFLINE_ACCESS_SCOPE);

    return Array.from(scopeSet);
  }

  /**
   * Create a cache plugin that persists the MSAL token cache in secret storage
   */
  private createCachePlugin(): msal.ICachePlugin {
    return {
      beforeCacheAccess: async (context: msal.TokenCacheContext) => {
        try {
          const serialized = await this.secretStorage.get(this.tokenCacheKey);
          if (serialized) {
            context.tokenCache.deserialize(serialized);
          }
        } catch (error) {
          console.error('[EntraAuthProvider] Failed to load token cache:', error);
        }
      },
      afterCacheAccess: async (context: msal.TokenCacheContext) => {
        if (!context.cacheHasChanged) {
          return;
        }
        try {
          const serialized = context.tokenCache.serialize();
          await this.secretStorage.store(this.tokenCacheKey, serialized);
        } catch (error) {
          console.error('[EntraAuthProvider] Failed to persist token cache:', error);
        }
      },
    } satisfies msal.ICachePlugin;
  }

  /**
   * Authenticate using device code flow
   */
  async authenticate(): Promise<AuthenticationResult> {
    try {
      const scopes = this.resolveScopes();

      // First, try silent authentication with cached refresh token
      const silentResult = await this.trySilentAuthentication(scopes);
      if (silentResult.success) {
        return silentResult;
      }

      // If silent auth fails, use device code flow
      const deviceCodeRequest: msal.DeviceCodeRequest = {
        deviceCodeCallback: async (response) => {
          // Call the provided callback to show device code to user
          if (this.deviceCodeCallback) {
            await this.deviceCodeCallback(
              response.deviceCode,
              response.userCode,
              response.verificationUri,
              response.expiresIn
            );
          }
        },
        scopes,
      };

      const response = await this.msalClient.acquireTokenByDeviceCode(deviceCodeRequest);

      if (!response) {
        return {
          success: false,
          error: 'Failed to acquire token via device code flow',
        };
      }

      // Cache the token info
      this.cachedToken = {
        accessToken: response.accessToken,
        expiresAt: response.expiresOn || new Date(Date.now() + 3600 * 1000),
        scopes: response.scopes,
      };

      // Store refresh token if available
      if (response.account) {
        const account = response.account;
        await this.storeAccount(account);
      }

      return {
        success: true,
        accessToken: response.accessToken,
        expiresAt: response.expiresOn || undefined,
      };
    } catch (error: any) {
      console.error('[EntraAuthProvider] Authentication failed:', error);
      return {
        success: false,
        error: error.message || 'Authentication failed',
      };
    }
  }

  /**
   * Try silent authentication using cached account
   */
  private async trySilentAuthentication(scopes: string[]): Promise<AuthenticationResult> {
    try {
      let account = await this.getStoredAccount();
      if (!account) {
        try {
          const accounts = await this.msalClient.getTokenCache().getAllAccounts();
          account = accounts[0];
        } catch (cacheError) {
          console.error('[EntraAuthProvider] Failed to read accounts from cache:', cacheError);
        }
      }
      if (!account) {
        return { success: false, error: 'No cached account found' };
      }

      const silentRequest: msal.SilentFlowRequest = {
        account,
        scopes,
        forceRefresh: false,
      };

      const response = await this.msalClient.acquireTokenSilent(silentRequest);

      if (!response) {
        return { success: false, error: 'Silent token acquisition returned no response' };
      }

      // Update cached token
      this.cachedToken = {
        accessToken: response.accessToken,
        expiresAt: response.expiresOn || new Date(Date.now() + 3600 * 1000),
        scopes: response.scopes,
      };

      return {
        success: true,
        accessToken: response.accessToken,
        expiresAt: response.expiresOn || undefined,
      };
    } catch (error: any) {
      // Silent auth failed - will need interactive flow
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a valid access token (from cache or by refreshing)
   */
  async getAccessToken(): Promise<string | undefined> {
    // Check if cached token is still valid
    if (this.cachedToken && this.cachedToken.expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
      // Token is valid for at least 5 more minutes
      return this.cachedToken.accessToken;
    }

    // Try to refresh the token
    const result = await this.refreshAccessToken();
    if (result.success && result.accessToken) {
      return result.accessToken;
    }

    return undefined;
  }

  /**
   * Refresh the access token using silent flow
   */
  async refreshAccessToken(): Promise<AuthenticationResult> {
    const scopes = this.resolveScopes();
    return this.trySilentAuthentication(scopes);
  }

  /**
   * Sign out and clear cached credentials
   */
  async signOut(): Promise<void> {
    // Clear cached token
    this.cachedToken = undefined;

    // Clear stored account
    await this.secretStorage.delete(this.refreshTokenKey);
    await this.secretStorage.delete(this.tokenCacheKey);

    // Remove account from MSAL cache
    const accounts = await this.msalClient.getTokenCache().getAllAccounts();
    for (const account of accounts) {
      await this.msalClient.getTokenCache().removeAccount(account);
    }
  }

  /**
   * Check if currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      return !!token;
    } catch {
      return false;
    }
  }

  /**
   * Get token expiration info
   */
  async getTokenInfo(): Promise<TokenInfo | undefined> {
    if (!this.cachedToken) {
      // Try to get a fresh token
      await this.getAccessToken();
    }
    return this.cachedToken;
  }

  /**
   * Store account info securely
   */
  private async storeAccount(account: msal.AccountInfo): Promise<void> {
    try {
      await this.secretStorage.store(this.refreshTokenKey, JSON.stringify(account));
    } catch (error) {
      console.error('[EntraAuthProvider] Failed to store account:', error);
    }
  }

  /**
   * Retrieve stored account info
   */
  private async getStoredAccount(): Promise<msal.AccountInfo | undefined> {
    try {
      const accountJson = await this.secretStorage.get(this.refreshTokenKey);
      if (!accountJson) {
        return undefined;
      }
      return JSON.parse(accountJson) as msal.AccountInfo;
    } catch (error) {
      console.error('[EntraAuthProvider] Failed to retrieve account:', error);
      return undefined;
    }
  }
}
