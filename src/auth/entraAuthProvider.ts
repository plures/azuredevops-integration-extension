/**
 * Module: src/auth/entraAuthProvider.ts
 * Owner: application
 * Reads: (document)
 * Writes: (document)
 * Receives: (document)
 * Emits: (document)
 * Prohibitions: Do not mutate ApplicationContext directly; Do not define new *Context types
 * Rationale: (document)
 *
 * LLM-GUARD:
 * - Follow ownership boundaries; route events to Router; do not add UI logic here
 */
/**
 * Microsoft Entra ID (Azure AD) Authentication Provider
 * Implements device code flow for CLI-like authentication experience
 */

import * as msal from '@azure/msal-node';
import { PublicClientApplication as _PublicClientApplication } from '@azure/msal-node';
import type * as vscode from 'vscode';
import { createLogger } from '../logging/unifiedLogger.js';

const logger = createLogger('entraAuth');
// Inline type definitions (previously from deleted types.js)
interface AuthenticationResult {
  success: boolean;
  accessToken?: string;
  expiresAt?: Date;
  error?: string;
}

interface EntraAuthConfig {
  clientId: string;
  tenantId?: string;
  scopes?: string[];
}

interface TokenInfo {
  accessToken: string;
  expiresAt: Date;
  scopes: string[];
}

type DeviceCodeCallback = (
  deviceCode: string,
  userCode: string,
  verificationUri: string,
  expiresIn: number
) => Promise<void>;

interface IAuthProvider {
  authenticate(forceInteractive?: boolean): Promise<AuthenticationResult>;
  getAccessToken(): Promise<string | undefined>;
  refreshAccessToken(): Promise<AuthenticationResult>;
  signOut(): Promise<void>;
  resetToken(): Promise<void>;
  isAuthenticated(): Promise<boolean>;
  getTokenInfo(): Promise<TokenInfo | undefined>;
}
// Removed TokenLifecycleManager dependency for FSM-based architecture

export interface EntraAuthProviderOptions {
  config: EntraAuthConfig;
  secretStorage: vscode.SecretStorage;
  connectionId: string;
  deviceCodeCallback?: DeviceCodeCallback;
  onStatusUpdate?: (connectionId: string, status: any) => void; // Simplified type
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

  // Refresh failure tracking to prevent constant retry attempts
  private refreshFailureCount = 0;
  private lastRefreshFailure: Date | undefined;
  private refreshBackoffUntil: Date | undefined;
  private readonly maxRefreshFailures = 3;

  constructor(options: EntraAuthProviderOptions) {
    this.config = options.config;
    this.secretStorage = options.secretStorage;
    this.connectionId = options.connectionId;
    this.deviceCodeCallback = options.deviceCodeCallback;
    this.refreshTokenKey = `azureDevOpsInt.entra.refreshToken.${this.connectionId}`;
    this.tokenCacheKey = `azureDevOpsInt.entra.tokenCache.${this.connectionId}`;

    // Initialize MSAL with device code flow configuration (v1.9.3 proven approach)
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
            logger.debug(`MSAL ${level}`, { meta: { message } });
          },
          piiLoggingEnabled: false,
          logLevel: msal.LogLevel.Warning,
        },
      },
    };

    this.msalClient = new msal.PublicClientApplication(msalConfig);
  }

  // Removed TokenLifecycleManager-specific methods

  /**
   * Get the authority URL for MSAL
   */
  private getAuthority(): string {
    const tenantId = this.config.tenantId || 'organizations';
    logger.debug('Using authority tenant', { meta: { tenantId } });
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

    // Add offline_access for refresh token support
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
          logger.error('Failed to load token cache', { meta: error });
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
          logger.error('Failed to persist token cache', { meta: error });
        }
      },
    } satisfies msal.ICachePlugin;
  }

  /**
   * Authenticate using device code flow (v1.9.3 proven approach)
   * @param forceInteractive If true, skips silent authentication and forces device code flow
   */
  async authenticate(forceInteractive: boolean = false): Promise<AuthenticationResult> {
    try {
      const scopes = this.resolveScopes();

      // Try silent authentication first (unless forced)
      if (!forceInteractive) {
        const silentResult = await this.trySilentAuthentication(scopes);
        if (silentResult.success) {
          // Reset refresh failure tracking on successful authentication
          this.refreshFailureCount = 0;
          this.lastRefreshFailure = undefined;
          this.refreshBackoffUntil = undefined;
          return silentResult;
        }
      } else {
        logger.info('Skipping silent authentication due to forceInteractive flag', {
          meta: { connectionId: this.connectionId },
        });
      }

      // If silent auth fails or is skipped, fall back to device code flow
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

      // Reset refresh failure tracking on successful authentication
      this.refreshFailureCount = 0;
      this.lastRefreshFailure = undefined;
      this.refreshBackoffUntil = undefined;

      return {
        success: true,
        accessToken: response.accessToken,
        expiresAt: response.expiresOn || undefined,
      };
    } catch (error: any) {
      logger.error('Authentication failed', { meta: error });
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
          logger.error('Failed to read accounts from cache', { meta: cacheError });
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
   * Reset token cache
   */
  async resetToken(): Promise<void> {
    // Clear cached token
    this.cachedToken = undefined;

    // Reset failure tracking
    this.refreshFailureCount = 0;
    this.lastRefreshFailure = undefined;
    this.refreshBackoffUntil = undefined;

    // Clear MSAL cache completely
    try {
      await this.secretStorage.delete(this.tokenCacheKey);
      await this.secretStorage.delete(this.refreshTokenKey);

      // Also clear all accounts from MSAL cache
      const accounts = await this.msalClient.getTokenCache().getAllAccounts();
      for (const account of accounts) {
        await this.msalClient.getTokenCache().removeAccount(account);
      }

      logger.info('Token cache completely reset', {
        meta: { connectionId: this.connectionId, clearedAccounts: accounts.length },
      });
    } catch (error) {
      logger.error('Failed to clear token cache', { meta: error });
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
      logger.error('Failed to store account', { meta: error });
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
      logger.error('Failed to retrieve account', { meta: error });
      return undefined;
    }
  }
}
