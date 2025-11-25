/* eslint-disable max-lines */
/**
 * Praxis Application Manager
 *
 * High-level API for application orchestration using the Praxis logic engine.
 * This class coordinates multiple Praxis engines (Timer, Auth, Connection)
 * using an event bus pattern.
 */

import type { LogicEngine } from '@plures/praxis';
import type {
  PraxisApplicationContext,
  PraxisApplicationState,
  PraxisApplicationSnapshot,
  ViewMode,
  WorkItem,
} from './types.js';
import type { ProjectConnection } from '../connection/types.js';
import { createApplicationEngine, type ApplicationEngineContext } from './engine.js';
import { PraxisEventBus, getPraxisEventBus } from './eventBus.js';
import { PraxisTimerManager } from '../timer/manager.js';
import { PraxisAuthManager } from '../auth/manager.js';
import { PraxisConnectionManager } from '../connection/manager.js';
import {
  ActivateEvent,
  ActivationCompleteEvent,
  ActivationFailedEvent,
  DeactivateEvent,
  DeactivationCompleteEvent,
  ConnectionsLoadedEvent,
  ConnectionSelectedEvent,
  QueryChangedEvent,
  ViewModeChangedEvent,
  WorkItemsLoadedEvent,
  WorkItemsErrorEvent,
  DeviceCodeStartedAppEvent,
  DeviceCodeCompletedAppEvent,
  ApplicationErrorEvent,
  RetryApplicationEvent,
  ResetApplicationEvent,
  ToggleDebugViewEvent,
  AuthReminderRequestedEvent,
  AuthReminderClearedEvent,
  AuthenticationSuccessEvent,
  AuthenticationFailedEvent,
} from './facts.js';

/**
 * PraxisApplicationManager - Orchestrates all Praxis engines
 *
 * This is the main entry point for the Praxis-based application state management.
 * It coordinates Timer, Auth, and Connection engines via an event bus.
 */
export class PraxisApplicationManager {
  private engine: LogicEngine<ApplicationEngineContext>;
  private eventBus: PraxisEventBus;
  private isStarted = false;

  // Child engine managers (per connection)
  private timerManager?: PraxisTimerManager;
  private authManagers = new Map<string, PraxisAuthManager>();
  private connectionManagers = new Map<string, PraxisConnectionManager>();

  // Event bus unsubscribe functions
  private eventBusCleanup: (() => void)[] = [];

  constructor(config?: Partial<PraxisApplicationContext>) {
    this.engine = createApplicationEngine(config);
    this.eventBus = getPraxisEventBus();
    this.setupEventBusListeners();
  }

  /**
   * Set up event bus listeners for cross-engine coordination
   */
  private setupEventBusListeners(): void {
    // Listen for timer events
    this.eventBusCleanup.push(
      this.eventBus.subscribe('timer:started', (_msg) => {
        // Timer started - could trigger UI updates
        this.syncTimerSnapshot();
      })
    );

    this.eventBusCleanup.push(
      this.eventBus.subscribe('timer:stopped', (_msg) => {
        // Timer stopped - sync snapshot
        this.syncTimerSnapshot();
      })
    );

    this.eventBusCleanup.push(
      this.eventBus.subscribe('timer:paused', () => {
        this.syncTimerSnapshot();
      })
    );

    this.eventBusCleanup.push(
      this.eventBus.subscribe('timer:resumed', () => {
        this.syncTimerSnapshot();
      })
    );

    // Listen for auth events
    this.eventBusCleanup.push(
      this.eventBus.subscribe('auth:success', (msg) => {
        if (msg.connectionId) {
          this.engine.step([AuthenticationSuccessEvent.create({ connectionId: msg.connectionId })]);
        }
      })
    );

    this.eventBusCleanup.push(
      this.eventBus.subscribe('auth:failed', (msg) => {
        if (msg.connectionId) {
          this.engine.step([
            AuthenticationFailedEvent.create({
              connectionId: msg.connectionId,
              error: String(msg.payload.error || 'Authentication failed'),
            }),
          ]);
        }
      })
    );

    // Listen for connection events
    this.eventBusCleanup.push(
      this.eventBus.subscribe('connection:connected', (msg) => {
        // Update connection state in application context
        this.syncConnectionSnapshot(msg.connectionId!);
      })
    );

    this.eventBusCleanup.push(
      this.eventBus.subscribe('connection:disconnected', (msg) => {
        this.syncConnectionSnapshot(msg.connectionId!);
      })
    );

    this.eventBusCleanup.push(
      this.eventBus.subscribe('connection:error', (msg) => {
        if (msg.connectionId) {
          this.engine.step([
            ApplicationErrorEvent.create({
              error: String(msg.payload.error || 'Connection error'),
              connectionId: msg.connectionId,
            }),
          ]);
        }
      })
    );
  }

  /**
   * Sync timer snapshot to application context
   */
  private syncTimerSnapshot(): void {
    if (!this.timerManager) return;

    const snapshot = this.timerManager.getTimerSnapshot();
    const ctx = this.engine.getContext();
    ctx.timerSnapshot = snapshot;
  }

  /**
   * Sync connection snapshot to application context
   */
  private syncConnectionSnapshot(connectionId: string): void {
    const manager = this.connectionManagers.get(connectionId);
    if (!manager) return;

    const snapshot = manager.getSnapshot();
    const ctx = this.engine.getContext();
    ctx.connectionStates.set(connectionId, snapshot);
  }

  /**
   * Start the application orchestrator
   */
  start(): void {
    if (this.isStarted) return;
    this.isStarted = true;

    // Create timer manager (shared across all connections)
    this.timerManager = new PraxisTimerManager();
    this.timerManager.start();
  }

  /**
   * Stop the application orchestrator
   */
  stop(): void {
    if (!this.isStarted) return;

    // Stop all child managers
    this.timerManager?.stop();

    for (const authManager of this.authManagers.values()) {
      authManager.stop();
    }
    this.authManagers.clear();

    for (const connManager of this.connectionManagers.values()) {
      connManager.stop();
    }
    this.connectionManagers.clear();

    // Clean up event bus subscriptions
    for (const cleanup of this.eventBusCleanup) {
      cleanup();
    }
    this.eventBusCleanup = [];

    this.isStarted = false;
  }

  // =========================================================================
  // Lifecycle Methods
  // =========================================================================

  /**
   * Activate the application
   */
  activate(extensionContext?: unknown): boolean {
    if (!this.isStarted) return false;
    if (this.getApplicationState() !== 'inactive') return false;

    this.engine.step([ActivateEvent.create({ extensionContext })]);
    return this.getApplicationState() === 'activating';
  }

  /**
   * Complete activation
   */
  activationComplete(): boolean {
    if (!this.isStarted) return false;
    if (this.getApplicationState() !== 'activating') return false;

    this.engine.step([ActivationCompleteEvent.create({})]);
    this.eventBus.emitApplicationEvent('app:activated', {});
    return this.getApplicationState() === 'active';
  }

  /**
   * Handle activation failure
   */
  activationFailed(error: string): boolean {
    if (!this.isStarted) return false;
    if (this.getApplicationState() !== 'activating') return false;

    this.engine.step([ActivationFailedEvent.create({ error })]);
    return this.getApplicationState() === 'error_recovery';
  }

  /**
   * Deactivate the application
   */
  deactivate(): boolean {
    if (!this.isStarted) return false;

    const state = this.getApplicationState();
    if (state === 'inactive' || state === 'deactivating') return false;

    this.engine.step([DeactivateEvent.create({})]);
    return this.getApplicationState() === 'deactivating';
  }

  /**
   * Complete deactivation
   */
  deactivationComplete(): boolean {
    if (!this.isStarted) return false;
    if (this.getApplicationState() !== 'deactivating') return false;

    this.engine.step([DeactivationCompleteEvent.create({})]);
    this.eventBus.emitApplicationEvent('app:deactivated', {});
    return this.getApplicationState() === 'inactive';
  }

  // =========================================================================
  // Connection Methods
  // =========================================================================

  /**
   * Load connections
   */
  loadConnections(connections: ProjectConnection[]): void {
    if (!this.isStarted) return;

    this.engine.step([ConnectionsLoadedEvent.create({ connections })]);

    // Create auth and connection managers for each connection
    for (const conn of connections) {
      if (!this.authManagers.has(conn.id)) {
        const authManager = new PraxisAuthManager(conn.id, conn.authMethod || 'pat');
        authManager.start();
        this.authManagers.set(conn.id, authManager);
      }

      if (!this.connectionManagers.has(conn.id)) {
        const connManager = new PraxisConnectionManager(conn);
        connManager.start();
        this.connectionManagers.set(conn.id, connManager);
      }
    }
  }

  /**
   * Select a connection
   */
  selectConnection(connectionId: string): boolean {
    if (!this.isStarted) return false;

    const ctx = this.engine.getContext();
    const exists = ctx.connections.some((c) => c.id === connectionId);
    if (!exists) return false;

    this.engine.step([ConnectionSelectedEvent.create({ connectionId })]);
    return this.getActiveConnectionId() === connectionId;
  }

  /**
   * Get the active connection ID
   */
  getActiveConnectionId(): string | undefined {
    return this.engine.getContext().activeConnectionId;
  }

  /**
   * Get all connections
   */
  getConnections(): ProjectConnection[] {
    return this.engine.getContext().connections;
  }

  /**
   * Get auth manager for a connection
   */
  getAuthManager(connectionId: string): PraxisAuthManager | undefined {
    return this.authManagers.get(connectionId);
  }

  /**
   * Get connection manager for a connection
   */
  getConnectionManager(connectionId: string): PraxisConnectionManager | undefined {
    return this.connectionManagers.get(connectionId);
  }

  // =========================================================================
  // Query and View Methods
  // =========================================================================

  /**
   * Change the active query
   */
  setQuery(query: string, connectionId?: string): void {
    if (!this.isStarted) return;
    this.engine.step([QueryChangedEvent.create({ query, connectionId })]);
  }

  /**
   * Get the active query
   */
  getActiveQuery(): string | undefined {
    return this.engine.getContext().activeQuery;
  }

  /**
   * Change the view mode
   */
  setViewMode(viewMode: ViewMode): void {
    if (!this.isStarted) return;
    this.engine.step([ViewModeChangedEvent.create({ viewMode })]);
  }

  /**
   * Get the current view mode
   */
  getViewMode(): ViewMode {
    return this.engine.getContext().viewMode;
  }

  // =========================================================================
  // Work Items Methods
  // =========================================================================

  /**
   * Handle work items loaded
   */
  workItemsLoaded(workItems: WorkItem[], connectionId: string, query?: string): void {
    if (!this.isStarted) return;

    this.engine.step([WorkItemsLoadedEvent.create({ workItems, connectionId, query })]);

    this.eventBus.emitApplicationEvent(
      'workitems:loaded',
      { count: workItems.length, query },
      connectionId
    );
  }

  /**
   * Handle work items error
   */
  workItemsError(error: string, connectionId: string): void {
    if (!this.isStarted) return;

    this.engine.step([WorkItemsErrorEvent.create({ error, connectionId })]);

    this.eventBus.emitApplicationEvent('workitems:error', { error }, connectionId);
  }

  /**
   * Get work items for a connection
   */
  getWorkItems(connectionId?: string): WorkItem[] {
    const ctx = this.engine.getContext();
    const targetId = connectionId || ctx.activeConnectionId;

    if (!targetId) return [];
    return ctx.connectionWorkItems.get(targetId) || [];
  }

  // =========================================================================
  // Timer Methods (delegated to timer manager)
  // =========================================================================

  /**
   * Start timer for a work item
   */
  startTimer(workItemId: number, workItemTitle: string): boolean {
    if (!this.timerManager) return false;

    const success = this.timerManager.startTimer(workItemId, workItemTitle);
    if (success) {
      this.eventBus.emitTimerEvent('timer:started', { workItemId, workItemTitle });
    }
    return success;
  }

  /**
   * Pause the timer
   */
  pauseTimer(): boolean {
    if (!this.timerManager) return false;

    const success = this.timerManager.pauseTimer();
    if (success) {
      this.eventBus.emitTimerEvent('timer:paused', {});
    }
    return success;
  }

  /**
   * Resume the timer
   */
  resumeTimer(): boolean {
    if (!this.timerManager) return false;

    const success = this.timerManager.resumeTimer();
    if (success) {
      this.eventBus.emitTimerEvent('timer:resumed', {});
    }
    return success;
  }

  /**
   * Stop the timer
   */
  stopTimer() {
    if (!this.timerManager) return null;

    const result = this.timerManager.stopTimer();
    if (result) {
      this.eventBus.emitTimerEvent('timer:stopped', {
        workItemId: result.workItemId,
        hoursDecimal: result.hoursDecimal,
      });
    }
    return result;
  }

  /**
   * Get timer manager
   */
  getTimerManager(): PraxisTimerManager | undefined {
    return this.timerManager;
  }

  // =========================================================================
  // Device Code Flow Methods
  // =========================================================================

  /**
   * Handle device code started
   */
  deviceCodeStarted(
    connectionId: string,
    userCode: string,
    verificationUri: string,
    expiresInSeconds: number
  ): void {
    if (!this.isStarted) return;

    this.engine.step([
      DeviceCodeStartedAppEvent.create({
        connectionId,
        userCode,
        verificationUri,
        expiresInSeconds,
      }),
    ]);
  }

  /**
   * Handle device code completed
   */
  deviceCodeCompleted(connectionId: string): void {
    if (!this.isStarted) return;

    this.engine.step([DeviceCodeCompletedAppEvent.create({ connectionId })]);
  }

  /**
   * Get device code session
   */
  getDeviceCodeSession() {
    return this.engine.getContext().deviceCodeSession;
  }

  // =========================================================================
  // Error Handling Methods
  // =========================================================================

  /**
   * Report an error
   */
  reportError(error: string, connectionId?: string): void {
    if (!this.isStarted) return;

    this.engine.step([ApplicationErrorEvent.create({ error, connectionId })]);
    this.eventBus.emitApplicationEvent('app:error', { error }, connectionId);
  }

  /**
   * Retry after error
   */
  retry(): boolean {
    if (!this.isStarted) return false;
    if (this.getApplicationState() !== 'error_recovery') return false;

    this.engine.step([RetryApplicationEvent.create({})]);
    return this.getApplicationState() === 'active';
  }

  /**
   * Reset application state
   */
  reset(): void {
    if (!this.isStarted) return;
    this.engine.step([ResetApplicationEvent.create({})]);
  }

  /**
   * Get last error
   */
  getLastError() {
    return this.engine.getContext().lastError;
  }

  // =========================================================================
  // Auth Reminder Methods
  // =========================================================================

  /**
   * Request auth reminder
   */
  requestAuthReminder(connectionId: string, reason: string, detail?: string): void {
    if (!this.isStarted) return;

    this.engine.step([AuthReminderRequestedEvent.create({ connectionId, reason, detail })]);
  }

  /**
   * Clear auth reminder
   */
  clearAuthReminder(connectionId: string): void {
    if (!this.isStarted) return;

    this.engine.step([AuthReminderClearedEvent.create({ connectionId })]);
  }

  /**
   * Get pending auth reminders
   */
  getPendingAuthReminders() {
    return this.engine.getContext().pendingAuthReminders;
  }

  // =========================================================================
  // Debug Methods
  // =========================================================================

  /**
   * Toggle debug view
   */
  toggleDebugView(visible?: boolean): void {
    if (!this.isStarted) return;

    this.engine.step([ToggleDebugViewEvent.create({ debugViewVisible: visible })]);
  }

  /**
   * Get debug view visibility
   */
  isDebugViewVisible(): boolean {
    return this.engine.getContext().debugViewVisible;
  }

  // =========================================================================
  // State Access Methods
  // =========================================================================

  /**
   * Get the current application state
   */
  getApplicationState(): PraxisApplicationState {
    return this.engine.getContext().applicationState;
  }

  /**
   * Get the full application context
   */
  getContext(): ApplicationEngineContext {
    return this.engine.getContext();
  }

  /**
   * Get application snapshot
   */
  getSnapshot(): PraxisApplicationSnapshot {
    const ctx = this.engine.getContext();

    return {
      state: ctx.applicationState,
      isActivated: ctx.isActivated,
      connections: ctx.connections,
      activeConnectionId: ctx.activeConnectionId,
      hasActiveTimer: !!ctx.timerSnapshot?.running,
      connectionCount: ctx.connections.length,
      errorRecoveryAttempts: ctx.errorRecoveryAttempts,
    };
  }

  /**
   * Get status information
   */
  getStatus() {
    return {
      isStarted: this.isStarted,
      applicationState: this.getApplicationState(),
      connectionCount: this.getConnections().length,
      authManagerCount: this.authManagers.size,
      connectionManagerCount: this.connectionManagers.size,
      hasTimerManager: !!this.timerManager,
      eventBusSubscribers: this.eventBus.getSubscriberCount(),
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
  getEngine(): LogicEngine<ApplicationEngineContext> {
    return this.engine;
  }

  /**
   * Get the event bus for external subscriptions
   */
  getEventBus(): PraxisEventBus {
    return this.eventBus;
  }
}
