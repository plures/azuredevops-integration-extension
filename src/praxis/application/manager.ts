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
import type { PraxisTimerSnapshot } from '../timer/types.js';
import type { ProjectConnection } from '../connection/types.js';
import { createApplicationEngine, type ApplicationEngineContext } from './engine.js';
import { PraxisEventBus, getPraxisEventBus } from './eventBus.js';
import { PraxisTimerManager } from '../timer/manager.js';
import { PraxisAuthManager } from '../auth/manager.js';
import { PraxisConnectionManager } from '../connection/manager.js';
import { fsmTracer } from '../../fsm/logging/FSMTracer.js';
import { FSMComponent } from '../../fsm/logging/FSMLogger.js';
import { TraceRecorder } from './tracing.js';
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
  RefreshDataEvent,
  SignInEntraEvent,
  SignOutEntraEvent,
  CreateWorkItemEvent,
  CreateBranchEvent,
  CreatePullRequestEvent,
  ShowPullRequestsEvent,
  ShowBuildStatusEvent,
  SelectTeamEvent,
  ResetPreferredRepositoriesEvent,
  SelfTestWebviewEvent,
  BulkAssignEvent,
  GenerateCopilotPromptEvent,
  ShowTimeReportEvent,
  WebviewReadyEvent,
  ConnectionStateUpdatedEvent,
  type PraxisApplicationEvent,
} from './facts.js';

/**
 * PraxisApplicationManager - Orchestrates all Praxis engines
 *
 * This is the main entry point for the Praxis-based application state management.
 * It coordinates Timer, Auth, and Connection engines via an event bus.
 */
export class PraxisApplicationManager {
  private engine: LogicEngine<ApplicationEngineContext>;
  private traceRecorder: TraceRecorder<ApplicationEngineContext>;
  private eventBus: PraxisEventBus;
  private isStarted = false;

  // Child engine managers (per connection)
  private timerManager?: PraxisTimerManager;
  private authManagers = new Map<string, PraxisAuthManager>();
  private connectionManagers = new Map<string, PraxisConnectionManager>();

  // Event bus unsubscribe functions
  private eventBusCleanup: (() => void)[] = [];

  // State change listeners
  private listeners: ((context: ApplicationEngineContext) => void)[] = [];

  private static instance: PraxisApplicationManager;

  static getInstance(): PraxisApplicationManager {
    if (!PraxisApplicationManager.instance) {
      PraxisApplicationManager.instance = new PraxisApplicationManager();
    }
    return PraxisApplicationManager.instance;
  }

  static resetInstance(): void {
    if (PraxisApplicationManager.instance) {
      PraxisApplicationManager.instance.stop();
      // @ts-ignore
      PraxisApplicationManager.instance = undefined;
    }
  }

  constructor(config?: Partial<PraxisApplicationContext>) {
    if (PraxisApplicationManager.instance) {
      // If an instance already exists, we should probably return it or warn.
      // But since constructor returns 'this', we can't return the existing instance easily without a factory.
      // For now, we'll just update the singleton reference if it's not set.
      // console.warn('PraxisApplicationManager instantiated directly. Use getInstance() for singleton access.');
    } else {
      PraxisApplicationManager.instance = this;
    }
    this.traceRecorder = new TraceRecorder<ApplicationEngineContext>();
    this.engine = createApplicationEngine(config, this.traceRecorder);
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
          this.dispatch([AuthenticationSuccessEvent.create({ connectionId: msg.connectionId })]);
        }
      })
    );

    this.eventBusCleanup.push(
      this.eventBus.subscribe('auth:failed', (msg) => {
        if (msg.connectionId) {
          this.dispatch([
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
          this.dispatch([
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

  public handleEvent(event: PraxisApplicationEvent): void {
    this.dispatch([event]);
  }

  /**
   * Dispatch typed events to the engine
   */
  public dispatch(events: PraxisApplicationEvent[]): void {
    const contextBefore = this.engine.getContext();
    const traceEnabled = Boolean(contextBefore.debugLoggingEnabled);

    if (traceEnabled) {
      this.traceRecorder.beginDispatch(events, contextBefore);
    }

    const result = this.engine.step(events);
    const contextAfter = this.engine.getContext();

    if (traceEnabled) {
      const entry = this.traceRecorder.completeDispatch(contextAfter, result?.diagnostics);
      if (entry) {
        this.engine.updateContext((ctx) => ({ ...ctx, debugTraceLog: this.traceRecorder.getEntries() }));
      }
    }

    if (!contextAfter.debugLoggingEnabled && this.traceRecorder.getEntries().length > 0) {
      this.traceRecorder.reset();
      this.engine.updateContext((ctx) => ({ ...ctx, debugTraceLog: [] }));
    }

    this.notifyListeners();
  }

  private notifyListeners(): void {
    const context = this.engine.getContext();
    for (const listener of this.listeners) {
      try {
        listener(context);
      } catch (error) {
        console.debug('Error in PraxisApplicationManager listener:', error);
      }
    }
  }

  /**
   * Start the application orchestrator
   */
  start(): void {
    if (this.isStarted) return;
    this.isStarted = true;

    // Instrument tracing
    this.instrumentTracing();

    // Create timer manager (shared across all connections)
    this.timerManager = new PraxisTimerManager();
    this.timerManager.start();
  }




  /**
   * Subscribe to state changes
   */
  subscribe(listener: (context: ApplicationEngineContext) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Instrument tracing
   */
  private instrumentTracing(): void {
    fsmTracer.instrumentActor(this.engine, FSMComponent.APPLICATION, 'applicationMachine');
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

    this.dispatch([ActivateEvent.create({ extensionContext })]);
    return this.getApplicationState() === 'activating';
  }

  /**
   * Complete activation
   */
  activationComplete(): boolean {
    if (!this.isStarted) return false;
    if (this.getApplicationState() !== 'activating') return false;

    this.dispatch([ActivationCompleteEvent.create({})]);
    this.eventBus.emitApplicationEvent('app:activated', {});
    return this.getApplicationState() === 'active';
  }

  /**
   * Handle activation failure
   */
  activationFailed(error: string): boolean {
    if (!this.isStarted) return false;
    if (this.getApplicationState() !== 'activating') return false;

    this.dispatch([ActivationFailedEvent.create({ error })]);
    return this.getApplicationState() === 'activation_error';
  }

  /**
   * Deactivate the application
   */
  deactivate(): boolean {
    if (!this.isStarted) return false;

    const state = this.getApplicationState();
    if (state === 'inactive' || state === 'deactivating') return false;

    this.dispatch([DeactivateEvent.create({})]);
    return this.getApplicationState() === 'deactivating';
  }

  /**
   * Complete deactivation
   */
  deactivationComplete(): boolean {
    if (!this.isStarted) return false;
    if (this.getApplicationState() !== 'deactivating') return false;

    this.dispatch([DeactivationCompleteEvent.create({})]);
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

    this.dispatch([ConnectionsLoadedEvent.create({ connections })]);

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

    this.dispatch([ConnectionSelectedEvent.create({ connectionId })]);
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
    this.dispatch([QueryChangedEvent.create({ query, connectionId })]);
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
    this.dispatch([ViewModeChangedEvent.create({ viewMode })]);
  }

  /**
   * Toggle view mode
   */
  toggleViewMode(): void {
    if (!this.isStarted) return;
    const current = this.getViewMode();
    const next = current === 'list' ? 'board' : 'list';
    this.setViewMode(next);
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

    this.dispatch([WorkItemsLoadedEvent.create({ workItems, connectionId, query })]);

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

    this.dispatch([WorkItemsErrorEvent.create({ error, connectionId })]);

    this.eventBus.emitApplicationEvent('workitems:error', { error }, connectionId);
  }

  /**
   * Handle device code flow
   */
  handleDeviceCode(
    connectionId: string,
    userCode: string,
    verificationUri: string,
    expiresIn: number
  ): void {
    if (!this.isStarted) return;

    this.dispatch([
      DeviceCodeStartedAppEvent.create({
        connectionId,
        userCode,
        verificationUri,
        expiresInSeconds: expiresIn,
      }),
    ]);
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
  pauseTimer(manual = true): boolean {
    if (!this.timerManager) return false;

    const success = this.timerManager.pauseTimer(manual);
    if (success) {
      this.eventBus.emitTimerEvent('timer:paused', { manual });
    }
    return success;
  }

  /**
   * Resume the timer
   */
  resumeTimer(fromActivity = false): boolean {
    if (!this.timerManager) return false;

    const success = this.timerManager.resumeTimer(fromActivity);
    if (success) {
      this.eventBus.emitTimerEvent('timer:resumed', { fromActivity });
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

    this.dispatch([
      DeviceCodeStartedAppEvent.create({
        connectionId,
        userCode,
        verificationUri,
        expiresInSeconds,
      }),
    ]);
  }

  /**
   * Handle device code received
   */
  deviceCodeReceived(
    connectionId: string,
    userCode: string,
    verificationUri: string,
    expiresInSeconds: number
  ): void {
    if (!this.isStarted) return;

    this.dispatch([
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

    this.dispatch([DeviceCodeCompletedAppEvent.create({ connectionId })]);
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

    this.dispatch([ApplicationErrorEvent.create({ error, connectionId })]);
    this.eventBus.emitApplicationEvent('app:error', { error }, connectionId);
  }

  /**
   * Retry after error
   */
  retry(): boolean {
    if (!this.isStarted) return false;
    if (this.getApplicationState() !== 'activation_error') return false;

    this.dispatch([RetryApplicationEvent.create({})]);
    return this.getApplicationState() === 'active';
  }

  /**
   * Reset application state
   */
  reset(): void {
    if (!this.isStarted) return;
    this.dispatch([ResetApplicationEvent.create({})]);
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

    this.dispatch([AuthReminderRequestedEvent.create({ connectionId, reason, detail })]);
  }

  /**
   * Clear auth reminder
   */
  clearAuthReminder(connectionId: string): void {
    if (!this.isStarted) return;

    this.dispatch([AuthReminderClearedEvent.create({ connectionId })]);
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

    this.dispatch([ToggleDebugViewEvent.create({ debugViewVisible: visible })]);
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
  getSnapshot(): PraxisApplicationSnapshot & { matches: (state: string) => boolean } {
    const ctx = this.engine.getContext() as unknown as PraxisApplicationContext;
    const currentState = this.getApplicationState();

    return {
      state: currentState,
      // Expose the full context for compatibility with consumers that expect
      // an XState-style snapshot shape (activation bridge, webview handlers).
      context: ctx,
      isActivated: ctx.isActivated,
      connections: ctx.connections,
      activeConnectionId: ctx.activeConnectionId,
      hasActiveTimer: !!ctx.timerSnapshot?.running,
      connectionCount: ctx.connections.length,
      errorRecoveryAttempts: ctx.errorRecoveryAttempts,
      // Compatibility with XState consumers
      matches: (state: string | Record<string, any>) => {
        if (typeof state !== 'string') return false;
        if (state === currentState) return true;
        // Map legacy states
        if (state === 'activation_failed' && currentState === 'activation_error') return true;
        // Map hierarchical states for UI compatibility
        if (currentState === 'active' && state.startsWith('active.')) return false; // Substates not supported yet
        if (currentState === 'active' && state === 'active') return true;
        return false;
      },
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

  /**
   * Refresh data
   */
  refreshData(connectionId?: string): void {
    if (!this.isStarted) return;
    this.dispatch([RefreshDataEvent.create({ connectionId })]);
  }

  /**
   * Sign in with Entra
   */
  signInEntra(connectionId: string, forceInteractive?: boolean): void {
    if (!this.isStarted) return;
    this.dispatch([SignInEntraEvent.create({ connectionId, forceInteractive })]);
  }

  /**
   * Sign out Entra
   */
  signOutEntra(connectionId: string): void {
    if (!this.isStarted) return;
    this.dispatch([SignOutEntraEvent.create({ connectionId })]);
  }

  // =========================================================================
  // UI Action Methods
  // =========================================================================

  /**
   * Create work item
   */
  createWorkItem(connectionId: string): void {
    if (!this.isStarted) return;
    this.dispatch([CreateWorkItemEvent.create({ connectionId })]);
  }

  /**
   * Create branch
   */
  createBranch(connectionId: string, workItemId?: number): void {
    if (!this.isStarted) return;
    this.dispatch([CreateBranchEvent.create({ connectionId, workItemId })]);
  }

  /**
   * Create pull request
   */
  createPullRequest(connectionId: string, workItemId?: number): void {
    if (!this.isStarted) return;
    this.dispatch([CreatePullRequestEvent.create({ connectionId, workItemId })]);
  }

  /**
   * Show pull requests
   */
  showPullRequests(connectionId: string): void {
    if (!this.isStarted) return;
    this.dispatch([ShowPullRequestsEvent.create({ connectionId })]);
  }

  /**
   * Show build status
   */
  showBuildStatus(connectionId: string): void {
    if (!this.isStarted) return;
    this.dispatch([ShowBuildStatusEvent.create({ connectionId })]);
  }

  /**
   * Select team
   */
  selectTeam(connectionId: string): void {
    if (!this.isStarted) return;
    this.dispatch([SelectTeamEvent.create({ connectionId })]);
  }

  /**
   * Reset preferred repositories
   */
  resetPreferredRepositories(connectionId: string): void {
    if (!this.isStarted) return;
    this.dispatch([ResetPreferredRepositoriesEvent.create({ connectionId })]);
  }

  /**
   * Self test webview
   */
  selfTestWebview(): void {
    if (!this.isStarted) return;
    this.dispatch([SelfTestWebviewEvent.create({})]);
  }

  /**
   * Bulk assign
   */
  bulkAssign(connectionId: string, workItemIds: number[]): void {
    if (!this.isStarted) return;
    this.dispatch([BulkAssignEvent.create({ connectionId, workItemIds })]);
  }

  /**
   * Generate Copilot prompt
   */
  generateCopilotPrompt(connectionId: string, workItemId: number): void {
    if (!this.isStarted) return;
    this.dispatch([GenerateCopilotPromptEvent.create({ connectionId, workItemId })]);
  }

  /**
   * Show time report
   */
  showTimeReport(connectionId: string): void {
    if (!this.isStarted) return;
    this.dispatch([ShowTimeReportEvent.create({ connectionId })]);
  }

  /**
   * Webview ready
   */
  webviewReady(): void {
    if (!this.isStarted) return;
    this.dispatch([WebviewReadyEvent.create({})]);
  }

  /**
   * Update connection state from external source
   */
  updateConnectionState(connectionId: string, state: any): void {
    if (!this.isStarted) return;
    this.dispatch([ConnectionStateUpdatedEvent.create({ connectionId, state })]);
  }

  /**
   * Authentication success
   */
  authenticationSuccess(connectionId: string): void {
    if (!this.isStarted) return;
    this.dispatch([AuthenticationSuccessEvent.create({ connectionId })]);
    // Also clear any pending auth reminders
    this.dispatch([AuthReminderClearedEvent.create({ connectionId })]);
  }

  /**
   * Authentication failed
   */
  authenticationFailed(connectionId: string, error: string): void {
    if (!this.isStarted) return;
    this.dispatch([AuthenticationFailedEvent.create({ connectionId, error })]);
  }

  // =========================================================================
  // Timer Adapter Support Methods
  // =========================================================================

  /**
   * Record activity ping
   */
  activityPing(): void {
    this.timerManager?.activityPing();
  }

  /**
   * Get timer snapshot
   */
  getTimerSnapshot(): PraxisTimerSnapshot | undefined {
    return this.timerManager?.getTimerSnapshot();
  }

  /**
   * Restore timer state
   */
  restoreTimer(
    workItemId: number,
    workItemTitle: string,
    startTime: number,
    isPaused: boolean
  ): boolean {
    return this.timerManager?.restoreTimer(workItemId, workItemTitle, startTime, isPaused) ?? false;
  }

  /**
   * Update elapsed limit
   */
  updateElapsedLimit(_hours: number): void {
    // TODO: Implement update elapsed limit in Praxis Timer
    // This would require a new event in the timer engine
  }

  /**
   * Subscribe to timer updates
   */
  subscribeToTimer(callback: (snapshot: PraxisTimerSnapshot | null) => void): () => void {
    // Subscribe to all timer events
    const unsubscribe = this.eventBus.subscribeAll((message) => {
      if (message.type.startsWith('timer:')) {
        callback(this.getTimerSnapshot() ?? null);
      }
    });

    // Initial callback
    callback(this.getTimerSnapshot() ?? null);

    return unsubscribe;
  }
}
