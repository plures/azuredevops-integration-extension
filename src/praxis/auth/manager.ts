/**
 * Praxis Authentication Manager
 *
 * High-level API for authentication operations using the Praxis logic engine.
 * This class provides a simple API that mirrors the existing FSMManager
 * for easy migration from XState.
 */

import type { LogicEngine } from '@plures/praxis';
import type {
  PraxisAuthContext,
  PraxisAuthState,
  PraxisAuthSnapshot,
  PraxisAuthResult,
  AuthMethod,
} from './types.js';
import { DEFAULT_AUTH_CONFIG } from './types.js';
import {
  AuthenticateEvent,
  AuthSuccessEvent,
  AuthFailedEvent,
  LogoutEvent,
  TokenExpiredEvent,
  DeviceCodeStartedEvent,
  DeviceCodeCompletedEvent,
  RetryAuthEvent,
  ResetAuthEvent,
} from './facts.js';
import { createAuthEngine, type AuthEngineContext } from './engine.js';

/**
 * PraxisAuthManager - High-level API for authentication operations
 */
export class PraxisAuthManager {
  private engine: LogicEngine<AuthEngineContext>;
  private isStarted = false;
  private readonly connectionId: string;
  private readonly authMethod: AuthMethod;

  constructor(connectionId: string, authMethod: AuthMethod, config?: Partial<PraxisAuthContext>) {
    this.connectionId = connectionId;
    this.authMethod = authMethod;
    this.engine = createAuthEngine(connectionId, authMethod, config);
  }

  start(): void {
    this.isStarted = true;
  }

  stop(): void {
    this.isStarted = false;
  }

  getAuthState(): PraxisAuthState {
    return this.engine.getContext().authState;
  }

  getAuthData(): PraxisAuthContext {
    return this.engine.getContext().authData;
  }

  /**
   * Initiate authentication
   */
  authenticate(options?: {
    forceInteractive?: boolean;
    tenantId?: string;
    clientId?: string;
  }): boolean {
    if (!this.isStarted) return false;

    const currentState = this.getAuthState();
    if (currentState !== 'idle' && currentState !== 'failed') return false;

    this.engine.step([
      AuthenticateEvent.create({
        connectionId: this.connectionId,
        authMethod: this.authMethod,
        forceInteractive: options?.forceInteractive,
        tenantId: options?.tenantId,
        clientId: options?.clientId,
      }),
    ]);

    return this.getAuthState() === 'authenticating';
  }

  /**
   * Handle successful authentication
   */
  authSuccess(token: string, expiresAt?: number): boolean {
    if (!this.isStarted) return false;
    if (this.getAuthState() !== 'authenticating') return false;

    this.engine.step([AuthSuccessEvent.create({ token, expiresAt })]);
    return this.getAuthState() === 'authenticated';
  }

  /**
   * Handle failed authentication
   */
  authFailed(error: string): boolean {
    if (!this.isStarted) return false;
    if (this.getAuthState() !== 'authenticating') return false;

    this.engine.step([AuthFailedEvent.create({ error })]);
    return this.getAuthState() === 'failed';
  }

  /**
   * Logout and clear authentication
   */
  logout(): boolean {
    if (!this.isStarted) return false;
    if (this.getAuthState() !== 'authenticated') return false;

    this.engine.step([LogoutEvent.create({})]);
    return this.getAuthState() === 'idle';
  }

  /**
   * Handle token expiration
   */
  tokenExpired(): boolean {
    if (!this.isStarted) return false;
    if (this.getAuthState() !== 'authenticated') return false;

    this.engine.step([TokenExpiredEvent.create({})]);
    return this.getAuthState() === 'failed';
  }

  /**
   * Handle device code flow start
   */
  deviceCodeStarted(userCode: string, verificationUri: string, expiresInSeconds: number): boolean {
    if (!this.isStarted) return false;
    if (this.getAuthState() !== 'authenticating') return false;

    this.engine.step([
      DeviceCodeStartedEvent.create({
        userCode,
        verificationUri,
        expiresInSeconds,
      }),
    ]);

    return true;
  }

  /**
   * Handle device code flow completion
   */
  deviceCodeCompleted(token: string, expiresAt?: number): boolean {
    if (!this.isStarted) return false;
    if (this.getAuthState() !== 'authenticating') return false;

    this.engine.step([DeviceCodeCompletedEvent.create({ token, expiresAt })]);
    return this.getAuthState() === 'authenticated';
  }

  /**
   * Retry authentication after failure
   */
  retry(): boolean {
    if (!this.isStarted) return false;
    if (this.getAuthState() !== 'failed') return false;

    const authData = this.getAuthData();
    if (authData.retryCount >= DEFAULT_AUTH_CONFIG.maxRetryCount) {
      return false;
    }

    this.engine.step([RetryAuthEvent.create({})]);
    return this.getAuthState() === 'authenticating';
  }

  /**
   * Reset authentication state
   */
  reset(): void {
    if (!this.isStarted) return;
    this.engine.step([ResetAuthEvent.create({})]);
  }

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean {
    return this.getAuthState() === 'authenticated';
  }

  /**
   * Check if authentication is in progress
   */
  isAuthenticating(): boolean {
    return this.getAuthState() === 'authenticating';
  }

  /**
   * Check if there's an active device code session
   */
  hasDeviceCodeSession(): boolean {
    const authData = this.getAuthData();
    return !!authData.deviceCodeSession;
  }

  /**
   * Get the current token if authenticated
   */
  getToken(): string | undefined {
    if (!this.isAuthenticated()) return undefined;
    return this.getAuthData().token;
  }

  /**
   * Check if token is valid (not expired)
   */
  isTokenValid(): boolean {
    if (!this.isAuthenticated()) return false;

    const authData = this.getAuthData();
    if (!authData.expiresAt) return true; // No expiry set means token is valid

    // Add 5 minute buffer before expiry
    const bufferMs = 5 * 60 * 1000;
    return Date.now() < authData.expiresAt - bufferMs;
  }

  /**
   * Get authentication snapshot
   */
  getSnapshot(): PraxisAuthSnapshot {
    const authState = this.getAuthState();
    const authData = this.getAuthData();

    return {
      state: authState,
      connectionId: authData.connectionId,
      authMethod: authData.authMethod,
      isAuthenticated: authState === 'authenticated',
      hasToken: !!authData.token,
      error: authData.error,
      lastAuthAttempt: authData.lastAuthAttempt,
    };
  }

  /**
   * Get status information
   */
  getStatus() {
    return {
      isStarted: this.isStarted,
      authState: this.getAuthState(),
      authContext: this.getAuthData(),
    };
  }

  /**
   * Validate that manager is in sync
   */
  validateSync(): boolean {
    return this.isStarted;
  }

  /**
   * Get the underlying engine for advanced operations
   */
  getEngine(): LogicEngine<AuthEngineContext> {
    return this.engine;
  }
}
