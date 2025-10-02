/**
 * Personal Access Token (PAT) Authentication Provider
 * Simple provider that wraps PAT authentication for Azure DevOps
 */

import type { IAuthProvider, AuthenticationResult, PatAuthConfig, TokenInfo } from './types.js';

export class PatAuthProvider implements IAuthProvider {
  private pat: string;

  constructor(config: PatAuthConfig) {
    this.pat = config.pat;
  }

  /**
   * PAT authentication is immediate - no interactive flow needed
   */
  async authenticate(): Promise<AuthenticationResult> {
    if (!this.pat || this.pat.trim().length === 0) {
      return {
        success: false,
        error: 'Personal Access Token is empty',
      };
    }

    return {
      success: true,
      accessToken: this.pat,
      // PATs don't expire unless manually revoked
    };
  }

  /**
   * Get the PAT token
   */
  async getAccessToken(): Promise<string | undefined> {
    return this.pat;
  }

  /**
   * PATs cannot be refreshed
   */
  async refreshAccessToken(): Promise<AuthenticationResult> {
    return {
      success: false,
      error: 'PAT tokens cannot be refreshed. Please create a new token.',
    };
  }

  /**
   * Clear the PAT
   */
  async signOut(): Promise<void> {
    // For PAT, we don't clear it here as it's managed by VS Code secrets
    // The caller should handle secret deletion
  }

  /**
   * Check if PAT is set
   */
  async isAuthenticated(): Promise<boolean> {
    return !!this.pat && this.pat.trim().length > 0;
  }

  /**
   * Get token info - PATs don't have expiration
   */
  async getTokenInfo(): Promise<TokenInfo | undefined> {
    if (!this.pat) {
      return undefined;
    }

    return {
      accessToken: this.pat,
      // PATs don't have expiration dates in the token itself
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Assume 1 year
    };
  }
}
