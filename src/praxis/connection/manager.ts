/**
 * Praxis Connection Manager
 *
 * High-level API for connection operations using the Praxis logic engine.
 * This class provides a simple API that mirrors the existing FSMManager
 * for easy migration from XState.
 */

import type { LogicEngine } from '@plures/praxis';
import type {
  PraxisConnectionContext,
  PraxisConnectionState,
  PraxisConnectionSnapshot,
  ProjectConnection,
} from './types.js';
import { DEFAULT_CONNECTION_CONFIG } from './types.js';
import {
  ConnectEvent,
  DisconnectEvent,
  AuthenticatedEvent,
  AuthConnectionFailedEvent,
  ClientCreatedEvent,
  ClientFailedEvent,
  ProviderCreatedEvent,
  ProviderFailedEvent,
  ConnectionErrorEvent,
  TokenExpiredConnectionEvent,
  TokenRefreshedEvent,
  TokenRefreshFailedEvent,
  RetryConnectionEvent,
  ResetConnectionEvent,
} from './facts.js';
import { createConnectionEngine, type ConnectionEngineContext } from './engine.js';

/**
 * PraxisConnectionManager - High-level API for connection operations
 */
export class PraxisConnectionManager {
  private engine: LogicEngine<ConnectionEngineContext>;
  private isStarted = false;

  constructor(config: ProjectConnection, initialConfig?: Partial<PraxisConnectionContext>) {
    this.engine = createConnectionEngine(config, initialConfig);
  }

  start(): void {
    this.isStarted = true;
  }

  stop(): void {
    this.isStarted = false;
  }

  getConnectionState(): PraxisConnectionState {
    return this.engine.getContext().connectionState;
  }

  getConnectionData(): PraxisConnectionContext {
    return this.engine.getContext().connectionData;
  }

  /**
   * Initiate connection
   */
  connect(options?: { forceInteractive?: boolean }): boolean {
    if (!this.isStarted) return false;
    if (this.getConnectionState() !== 'disconnected') return false;

    const config = this.getConnectionData().config;
    this.engine.step([
      ConnectEvent.create({
        config,
        forceInteractive: options?.forceInteractive,
      }),
    ]);

    return this.getConnectionState() === 'authenticating';
  }

  /**
   * Disconnect from Azure DevOps
   */
  disconnect(): boolean {
    if (!this.isStarted) return false;

    this.engine.step([DisconnectEvent.create({})]);
    return this.getConnectionState() === 'disconnected';
  }

  /**
   * Handle successful authentication
   */
  authenticated(credential: string, expiresAt?: number): boolean {
    if (!this.isStarted) return false;
    if (this.getConnectionState() !== 'authenticating') return false;

    this.engine.step([AuthenticatedEvent.create({ credential, expiresAt })]);
    return this.getConnectionState() === 'creating_client';
  }

  /**
   * Handle failed authentication
   */
  authFailed(error: string): boolean {
    if (!this.isStarted) return false;
    if (this.getConnectionState() !== 'authenticating') return false;

    this.engine.step([AuthConnectionFailedEvent.create({ error })]);
    return this.getConnectionState() === 'auth_failed';
  }

  /**
   * Handle client creation success
   */
  clientCreated(client: unknown): boolean {
    if (!this.isStarted) return false;
    if (this.getConnectionState() !== 'creating_client') return false;

    this.engine.step([ClientCreatedEvent.create({ client })]);
    return this.getConnectionState() === 'creating_provider';
  }

  /**
   * Handle client creation failure
   */
  clientFailed(error: string): boolean {
    if (!this.isStarted) return false;
    if (this.getConnectionState() !== 'creating_client') return false;

    this.engine.step([ClientFailedEvent.create({ error })]);
    return this.getConnectionState() === 'client_failed';
  }

  /**
   * Handle provider creation success
   */
  providerCreated(provider: unknown): boolean {
    if (!this.isStarted) return false;
    if (this.getConnectionState() !== 'creating_provider') return false;

    this.engine.step([ProviderCreatedEvent.create({ provider })]);
    return this.getConnectionState() === 'connected';
  }

  /**
   * Handle provider creation failure
   */
  providerFailed(error: string): boolean {
    if (!this.isStarted) return false;
    if (this.getConnectionState() !== 'creating_provider') return false;

    this.engine.step([ProviderFailedEvent.create({ error })]);
    return this.getConnectionState() === 'provider_failed';
  }

  /**
   * Handle connection error
   */
  connectionError(error: string): boolean {
    if (!this.isStarted) return false;
    if (this.getConnectionState() !== 'connected') return false;

    this.engine.step([ConnectionErrorEvent.create({ error })]);
    return this.getConnectionState() === 'connection_error';
  }

  /**
   * Handle token expiration
   */
  tokenExpired(): boolean {
    if (!this.isStarted) return false;
    if (this.getConnectionState() !== 'connected') return false;

    this.engine.step([TokenExpiredConnectionEvent.create({})]);
    const newState = this.getConnectionState();
    return newState === 'auth_failed' || newState === 'token_refresh';
  }

  /**
   * Handle successful token refresh
   */
  tokenRefreshed(token: string, expiresAt?: number): boolean {
    if (!this.isStarted) return false;
    if (this.getConnectionState() !== 'token_refresh') return false;

    this.engine.step([TokenRefreshedEvent.create({ token, expiresAt })]);
    return this.getConnectionState() === 'connected';
  }

  /**
   * Handle failed token refresh
   */
  tokenRefreshFailed(error: string): boolean {
    if (!this.isStarted) return false;
    if (this.getConnectionState() !== 'token_refresh') return false;

    this.engine.step([TokenRefreshFailedEvent.create({ error })]);
    return this.getConnectionState() === 'auth_failed';
  }

  /**
   * Retry connection after failure
   */
  retry(): boolean {
    if (!this.isStarted) return false;

    const currentState = this.getConnectionState();
    const failedStates = ['auth_failed', 'client_failed', 'provider_failed', 'connection_error'];
    if (!failedStates.includes(currentState)) return false;

    const connectionData = this.getConnectionData();
    if (connectionData.retryCount >= DEFAULT_CONNECTION_CONFIG.maxRetryCount) {
      return false;
    }

    this.engine.step([RetryConnectionEvent.create({})]);
    return this.getConnectionState() === 'authenticating';
  }

  /**
   * Reset connection state
   */
  reset(): void {
    if (!this.isStarted) return;
    this.engine.step([ResetConnectionEvent.create({})]);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.getConnectionState() === 'connected';
  }

  /**
   * Check if authenticating
   */
  isAuthenticating(): boolean {
    return this.getConnectionState() === 'authenticating';
  }

  /**
   * Check if in a failed state
   */
  isFailed(): boolean {
    const failedStates = ['auth_failed', 'client_failed', 'provider_failed', 'connection_error'];
    return failedStates.includes(this.getConnectionState());
  }

  /**
   * Get the client if available
   */
  getClient(): unknown | undefined {
    if (!this.isConnected()) return undefined;
    return this.getConnectionData().client;
  }

  /**
   * Get the provider if available
   */
  getProvider(): unknown | undefined {
    if (!this.isConnected()) return undefined;
    return this.getConnectionData().provider;
  }

  /**
   * Get connection snapshot
   */
  getSnapshot(): PraxisConnectionSnapshot {
    const state = this.getConnectionState();
    const data = this.getConnectionData();

    return {
      state,
      connectionId: data.connectionId,
      isConnected: data.isConnected,
      authMethod: data.authMethod,
      hasClient: !!data.client,
      hasProvider: !!data.provider,
      error: data.lastError,
      retryCount: data.retryCount,
    };
  }

  /**
   * Get status information
   */
  getStatus() {
    return {
      isStarted: this.isStarted,
      connectionState: this.getConnectionState(),
      connectionContext: this.getConnectionData(),
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
  getEngine(): LogicEngine<ConnectionEngineContext> {
    return this.engine;
  }
}
