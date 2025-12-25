/* eslint-disable max-lines */
/**
 * Authorization Code Flow Provider with PKCE
 *
 * Implements OAuth 2.0 Authorization Code Flow with PKCE for VSCode extensions
 */

import * as msal from '@azure/msal-node';
import * as vscode from 'vscode';
import { generatePKCEParams, generateState, PKCEParams, isValidCodeVerifier } from './pkceUtils.js';
import { createComponentLogger, Component } from '../../logging/ComponentLogger.js';

const componentLogger = createComponentLogger(Component.AUTH, 'AuthorizationCodeFlowProvider');

// Constants
const AZURE_DEVOPS_RESOURCE_ID = '499b84ac-1321-427f-aa17-267ca6975798';
const DEFAULT_SCOPES = [`${AZURE_DEVOPS_RESOURCE_ID}/.default`, 'offline_access'];
const AUTH_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export interface AuthenticationResult {
  success: boolean;
  accessToken?: string;
  expiresAt?: Date;
  error?: string;
}

export interface AuthorizationCodeFlowOptions {
  config: {
    clientId: string;
    tenantId?: string;
    scopes?: string[];
  };
  secretStorage: vscode.SecretStorage;
  connectionId: string;
  redirectUri: string;
  onStatusUpdate?: (
    connectionId: string,
    status: {
      type: 'auth_code_flow_started' | 'auth_code_flow_completed' | 'auth_code_flow_failed';
      authorizationUrl?: string;
      expiresInSeconds?: number;
      error?: string;
    }
  ) => void;
}

export class AuthorizationCodeFlowProvider {
  private msalClient: msal.PublicClientApplication;
  private secretStorage: vscode.SecretStorage;
  private connectionId: string;
  private redirectUri: string;
  private config: AuthorizationCodeFlowOptions['config'];
  private pkceParams?: PKCEParams;
  private pendingAuthState?: string;
  private authStartTime?: number;
  private resolveAuthPromise?: (result: AuthenticationResult) => void;
  private rejectAuthPromise?: (error: Error) => void;
  private authTimeout?: NodeJS.Timeout;
  private onStatusUpdate?: AuthorizationCodeFlowOptions['onStatusUpdate'];

  constructor(options: AuthorizationCodeFlowOptions) {
    this.config = options.config;
    this.secretStorage = options.secretStorage;
    this.connectionId = options.connectionId;
    this.redirectUri = options.redirectUri;
    this.onStatusUpdate = options.onStatusUpdate;

    const tenantId = this.config.tenantId || 'organizations';
    const authority = `https://login.microsoftonline.com/${tenantId}`;

    const msalConfig: msal.Configuration = {
      auth: {
        clientId: this.config.clientId,
        authority: authority,
      },
      cache: {
        cachePlugin: this.createCachePlugin(),
      },
      system: {
        loggerOptions: {
          loggerCallback: (level, message, containsPii) => {
            if (containsPii) return;
            componentLogger.debug(`MSAL ${level}: ${message}`);
          },
          piiLoggingEnabled: false,
          logLevel: msal.LogLevel.Warning,
        },
      },
    };

    this.msalClient = new msal.PublicClientApplication(msalConfig);
  }

  /**
   * Create cache plugin for MSAL token cache persistence
   */
  private createCachePlugin(): msal.ICachePlugin {
    const cacheKey = `azureDevOpsInt.entra.tokenCache.${this.connectionId}`;

    return {
      beforeCacheAccess: async (context: msal.TokenCacheContext) => {
        try {
          const serialized = await this.secretStorage.get(cacheKey);
          if (serialized) {
            context.tokenCache.deserialize(serialized);
          }
        } catch (error) {
          componentLogger.error(`Failed to load token cache: ${error}`);
        }
      },
      afterCacheAccess: async (context: msal.TokenCacheContext) => {
        if (!context.cacheHasChanged) {
          return;
        }
        try {
          const serialized = context.tokenCache.serialize();
          await this.secretStorage.store(cacheKey, serialized);
        } catch (error) {
          componentLogger.error(`Failed to persist token cache: ${error}`);
        }
      },
    } satisfies msal.ICachePlugin;
  }

  /**
   * Get authority URL
   */
  private getAuthority(): string {
    const tenantId = this.config.tenantId || 'organizations';
    return `https://login.microsoftonline.com/${tenantId}`;
  }

  /**
   * Resolve scopes, ensuring offline_access is included
   */
  private resolveScopes(): string[] {
    const configuredScopes =
      this.config.scopes && this.config.scopes.length > 0 ? this.config.scopes : DEFAULT_SCOPES;

    const scopeSet = new Set<string>();
    for (const scope of configuredScopes) {
      if (typeof scope === 'string' && scope.trim().length > 0) {
        scopeSet.add(scope.trim());
      }
    }

    // Always include offline_access for refresh token support
    scopeSet.add('offline_access');

    return Array.from(scopeSet);
  }

  /**
   * Build authorization URL with PKCE parameters
   */
  private buildAuthorizationUrl(codeChallenge: string, state: string): string {
    const tenantId = this.config.tenantId || 'organizations';
    const scopes = this.resolveScopes();

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      response_mode: 'query',
      scope: scopes.join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: state,
    });

    return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Try silent authentication first
   */
  private async trySilentAuthentication(scopes: string[]): Promise<AuthenticationResult> {
    try {
      const accounts = await this.msalClient.getTokenCache().getAllAccounts();
      if (accounts.length === 0) {
        return { success: false, error: 'No cached account found' };
      }

      const account = accounts[0];
      const silentRequest: msal.SilentFlowRequest = {
        account: account,
        scopes: scopes,
        forceRefresh: false,
      };

      const response = await this.msalClient.acquireTokenSilent(silentRequest);

      if (response && response.accessToken) {
        componentLogger.info('Silent authentication successful');
        return {
          success: true,
          accessToken: response.accessToken,
          expiresAt: response.expiresOn || undefined,
        };
      }

      return { success: false, error: 'Silent authentication returned no token' };
    } catch (error: any) {
      componentLogger.debug(`Silent authentication failed: ${error.message}`);
      return { success: false, error: error.message || 'Silent authentication failed' };
    }
  }

  /**
   * Initiate authorization code flow with PKCE
   */
  async authenticate(forceInteractive: boolean = false): Promise<AuthenticationResult> {
    try {
      const scopes = this.resolveScopes();

      // Try silent authentication first (unless forced)
      if (!forceInteractive) {
        const silentResult = await this.trySilentAuthentication(scopes);
        if (silentResult.success) {
          return silentResult;
        }
      }

      // Generate PKCE parameters
      this.pkceParams = generatePKCEParams();
      this.pendingAuthState = generateState();
      this.authStartTime = Date.now();

      // Build authorization URL
      const authorizationUrl = this.buildAuthorizationUrl(
        this.pkceParams.codeChallenge,
        this.pendingAuthState
      );

      // Notify status update
      this.onStatusUpdate?.(this.connectionId, {
        type: 'auth_code_flow_started',
        authorizationUrl: authorizationUrl,
        expiresInSeconds: Math.floor(AUTH_TIMEOUT_MS / 1000),
      });

      // Open browser
      await vscode.env.openExternal(vscode.Uri.parse(authorizationUrl));

      componentLogger.info('Authorization URL opened in browser', {
        connectionId: this.connectionId,
        authorizationUrl: authorizationUrl.substring(0, 100) + '...',
      });

      // Wait for redirect URI handler
      return await this.waitForRedirect();
    } catch (error: any) {
      componentLogger.error(`Authentication failed: ${error.message}`, {
        connectionId: this.connectionId,
        error: error,
      });

      this.cleanup();

      return {
        success: false,
        error: error.message || 'Authentication failed',
      };
    }
  }

  /**
   * Wait for redirect URI handler to complete authentication
   */
  private waitForRedirect(): Promise<AuthenticationResult> {
    return new Promise((resolve, reject) => {
      this.resolveAuthPromise = resolve;
      this.rejectAuthPromise = reject;

      // Set timeout
      this.authTimeout = setTimeout(() => {
        this.cleanup();
        reject(new Error(`Authentication timeout after ${AUTH_TIMEOUT_MS / 1000} seconds`));
      }, AUTH_TIMEOUT_MS);
    });
  }

  /**
   * Handle redirect URI with authorization code
   * Called by URI handler in activation.ts
   */
  async handleRedirectUri(uri: vscode.Uri): Promise<AuthenticationResult> {
    try {
      // Parse URI parameters
      const params = new URLSearchParams(uri.query);
      const authorizationCode = params.get('code');
      const state = params.get('state');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      // Check for errors
      if (error) {
        const errorMsg = errorDescription || error;
        componentLogger.error(`Authorization error: ${errorMsg}`);
        this.cleanup();
        return {
          success: false,
          error: errorMsg,
        };
      }

      // Validate required parameters
      if (!authorizationCode) {
        throw new Error('Authorization code not found in redirect URI');
      }

      if (!state) {
        throw new Error('State parameter not found in redirect URI');
      }

      // Verify state matches pending auth
      if (state !== this.pendingAuthState) {
        throw new Error('State parameter mismatch - possible CSRF attack');
      }

      // Verify PKCE params exist
      if (!this.pkceParams) {
        throw new Error('PKCE parameters not found - authentication session expired');
      }

      // Verify code verifier is valid
      if (!isValidCodeVerifier(this.pkceParams.codeVerifier)) {
        throw new Error('Invalid code verifier format');
      }

      componentLogger.info('Exchanging authorization code for token', {
        connectionId: this.connectionId,
      });

      // Exchange code + verifier for token
      const tokenRequest: msal.AuthorizationCodeRequest = {
        code: authorizationCode,
        codeVerifier: this.pkceParams.codeVerifier,
        redirectUri: this.redirectUri,
        scopes: this.resolveScopes(),
      };

      const response = await this.msalClient.acquireTokenByCode(tokenRequest);

      if (!response || !response.accessToken) {
        throw new Error('Token exchange returned no access token');
      }

      // Store tokens securely
      const tokenKey = `entra:${this.config.tenantId || 'organizations'}:${this.config.clientId}`;
      await this.secretStorage.store(tokenKey, response.accessToken);

      // Store refresh token if available
      if (response.account) {
        await this.storeAccount(response.account);
      }

      componentLogger.info('Authentication successful', {
        connectionId: this.connectionId,
        expiresAt: response.expiresOn?.toISOString(),
      });

      // Notify status update
      this.onStatusUpdate?.(this.connectionId, {
        type: 'auth_code_flow_completed',
      });

      const result: AuthenticationResult = {
        success: true,
        accessToken: response.accessToken,
        expiresAt: response.expiresOn || undefined,
      };

      this.cleanup();
      if (this.resolveAuthPromise) {
        this.resolveAuthPromise(result);
      }

      return result;
    } catch (error: any) {
      componentLogger.error(`Redirect handling failed: ${error.message}`, {
        connectionId: this.connectionId,
        error: error,
      });

      this.onStatusUpdate?.(this.connectionId, {
        type: 'auth_code_flow_failed',
        error: error.message || 'Authentication failed',
      });

      this.cleanup();

      if (this.rejectAuthPromise) {
        this.rejectAuthPromise(error);
      }

      return {
        success: false,
        error: error.message || 'Redirect handling failed',
      };
    }
  }

  /**
   * Store account information for future silent authentication
   */
  private async storeAccount(account: msal.AccountInfo): Promise<void> {
    try {
      const accountKey = `azureDevOpsInt.entra.account.${this.connectionId}`;
      await this.secretStorage.store(
        accountKey,
        JSON.stringify({
          homeAccountId: account.homeAccountId,
          environment: account.environment,
          username: account.username,
          localAccountId: account.localAccountId,
        })
      );
    } catch (error) {
      componentLogger.warn(`Failed to store account info: ${error}`);
    }
  }

  /**
   * Cleanup pending authentication state
   */
  private cleanup(): void {
    if (this.authTimeout) {
      clearTimeout(this.authTimeout);
      this.authTimeout = undefined;
    }
    this.pkceParams = undefined;
    this.pendingAuthState = undefined;
    this.authStartTime = undefined;
    this.resolveAuthPromise = undefined;
    this.rejectAuthPromise = undefined;
  }

  /**
   * Get access token (for IAuthProvider interface compatibility)
   */
  async getAccessToken(): Promise<string | undefined> {
    try {
      const accounts = await this.msalClient.getTokenCache().getAllAccounts();
      if (accounts.length === 0) {
        return undefined;
      }

      const account = accounts[0];
      const scopes = this.resolveScopes();
      const silentRequest: msal.SilentFlowRequest = {
        account: account,
        scopes: scopes,
        forceRefresh: false,
      };

      const response = await this.msalClient.acquireTokenSilent(silentRequest);
      return response?.accessToken;
    } catch (error) {
      componentLogger.debug(`Failed to get access token: ${error}`);
      return undefined;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<AuthenticationResult> {
    try {
      const accounts = await this.msalClient.getTokenCache().getAllAccounts();
      if (accounts.length === 0) {
        return { success: false, error: 'No account found for token refresh' };
      }

      const account = accounts[0];
      const scopes = this.resolveScopes();
      const silentRequest: msal.SilentFlowRequest = {
        account: account,
        scopes: scopes,
        forceRefresh: true,
      };

      const response = await this.msalClient.acquireTokenSilent(silentRequest);

      if (response && response.accessToken) {
        return {
          success: true,
          accessToken: response.accessToken,
          expiresAt: response.expiresOn || undefined,
        };
      }

      return { success: false, error: 'Token refresh returned no token' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Token refresh failed' };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      const accounts = await this.msalClient.getTokenCache().getAllAccounts();
      for (const account of accounts) {
        await this.msalClient.getTokenCache().removeAccount(account);
      }

      // Clear stored tokens
      const tokenKey = `entra:${this.config.tenantId || 'organizations'}:${this.config.clientId}`;
      await this.secretStorage.delete(tokenKey);

      const accountKey = `azureDevOpsInt.entra.account.${this.connectionId}`;
      await this.secretStorage.delete(accountKey);

      this.cleanup();
    } catch (error) {
      componentLogger.error(`Sign out failed: ${error}`);
    }
  }

  /**
   * Reset token (clear cache)
   */
  async resetToken(): Promise<void> {
    await this.signOut();
  }

  /**
   * Check if authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  }

  /**
   * Get PKCE params for external storage (used by URI handler)
   */
  getPendingPKCEParams(): PKCEParams | undefined {
    return this.pkceParams;
  }

  /**
   * Get pending auth state
   */
  getPendingAuthState(): string | undefined {
    return this.pendingAuthState;
  }
}
