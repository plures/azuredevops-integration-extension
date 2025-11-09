/**
 * Module: ApplicationFSMManager
 * Owner: application
 * Reads: Extension context, Application FSM state
 * Writes: none directly to ApplicationContext (delegates to FSM)
 * Receives: lifecycle start/stop, debug tracing setup
 * Emits: appActor reference and tracing hooks
 * Prohibitions: Do not define ApplicationContext; Do not implement UI logic
 * Rationale: Bootstrap and manage the application FSM and tracing
 *
 * Application FSM Manager
 *
 * This manager coordinates the entire application FSM system, replacing
 * the existing global state management in activation.ts.
 */

import { createActor, ActorRefFrom } from 'xstate';
import { applicationMachine } from './machines/applicationMachine.js';
import { FSMManager } from './FSMManager.js';
import { TimerAdapter } from './adapters/TimerAdapter.js';
import { FSM_CONFIG as _FSM_CONFIG } from './config.js';
import { createComponentLogger, FSMComponent } from './logging/FSMLogger.js';
import { fsmTracer } from './logging/FSMTracer.js';

export class ApplicationFSMManager {
  private appActor?: ActorRefFrom<typeof applicationMachine>;
  private timerAdapter?: TimerAdapter;
  private fsmManager?: FSMManager;
  private isStarted = false;
  private logger = createComponentLogger(FSMComponent.APPLICATION, 'ApplicationFSM');
  private traceCleanup: (() => void) | undefined;

  constructor(private extensionContext: any) {
    this.logger.info('ApplicationFSMManager created');
  }

  /**
   * Start the application FSM system
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      this.logger.warn('Already started - ignoring start request');
      return;
    }

    try {
      this.logger.info('Starting application state machine...');

      // Create the main application actor
      this.appActor = createActor(applicationMachine, {
        input: {
          extensionContext: this.extensionContext,
        },
      });

      // Setup FSM tracing for full replay capability
      // Note: XState v5 createActor returns an ActorRef, but tracer expects Actor
      // We'll cast to any to bypass the type check since the runtime behavior is compatible
      this.traceCleanup = fsmTracer.instrumentActor(
        this.appActor as any,
        FSMComponent.APPLICATION,
        'applicationMachine'
      );
      this.logger.info('Application FSM instrumented for tracing and replay');

      // Subscribe to state changes with FSM logging
      this.appActor.subscribe((state) => {
        this.logger.logStateTransition(
          'unknown', // We don't have previous state here
          typeof state.value === 'string' ? state.value : JSON.stringify(state.value),
          'STATE_CHANGE',
          'applicationMachine'
        );

        this.logger.debug(
          'Application FSM state update',
          {
            state: typeof state.value === 'string' ? state.value : JSON.stringify(state.value),
            machineId: 'applicationMachine',
          },
          {
            isActivated: state.context.isActivated,
            connectionCount: state.context.connections.length,
            activeConnectionId: state.context.activeConnectionId,
          }
        );
      });

      // Start the actor
      this.appActor.start();
      this.logger.info('Application actor started');

      // Activate the extension
      this.appActor.send({ type: 'ACTIVATE', context: this.extensionContext });
      this.logger.logEvent('ACTIVATE', 'initializing', 'applicationMachine', {
        context: 'extensionContext',
      });

      // Create FSM Manager for backward compatibility
      this.fsmManager = new FSMManager();
      await this.fsmManager.start();
      this.logger.info('FSM Manager started');

      // Create Timer Adapter with FSM enabled
      // We'll pass null for legacy timer since we're using FSM mode
      this.timerAdapter = new TimerAdapter(this.fsmManager, null as any, true);
      this.logger.info('Timer Adapter created');

      this.isStarted = true;
      this.logger.info('Application FSM started successfully');

      // Load connections from VS Code configuration
      await this.loadConnectionsFromConfig();
    } catch (error) {
      this.logger.logError(error as Error, 'starting');
      throw error;
    }
  }

  /**
   * Load connections from VS Code configuration and send to FSM
   */
  private async loadConnectionsFromConfig() {
    try {
      const vscode = await import('vscode');
      const config = vscode.workspace.getConfiguration('azureDevOpsIntegration');
      const rawConnections = config.get<any[]>('connections', []);

      this.logger.info(
        `[ApplicationFSM] Loading connections from config: ${rawConnections.length} found`
      );

      // Basic connection validation and processing
      const validConnections = rawConnections.filter(
        (conn) => conn && typeof conn === 'object' && conn.id && conn.organization && conn.project
      );

      this.logger.info(
        `[ApplicationFSM] Valid connections after filtering: ${validConnections.length}`
      );

      // Send connections to FSM
      if (validConnections.length > 0) {
        this.onConnectionsLoaded(validConnections);
      }
    } catch (error) {
      this.logger.error(
        `Failed to load connections from config: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Stop the application FSM system
   */
  async stop(): Promise<void> {
    if (!this.isStarted) return;

    try {
      this.logger.info('Stopping application state machine...');

      // Send deactivate event
      this.appActor?.send({ type: 'DEACTIVATE' });
      this.logger.logEvent('DEACTIVATE', 'stopping', 'applicationMachine');

      // Stop child managers
      await this.fsmManager?.stop();
      this.logger.info('FSM Manager stopped');

      // Stop the main actor
      this.appActor?.stop();
      this.logger.info('Application actor stopped');

      this.isStarted = false;
      this.logger.info('Application FSM stopped successfully');
    } catch (error) {
      this.logger.logError(error as Error, 'stopping');
    }
  }

  /**
   * Get current application state
   */
  getState() {
    return this.appActor?.getSnapshot();
  }

  /**
   * Send event to application FSM
   */
  send(event: any) {
    this.appActor?.send(event);
  }

  /**
   * Get timer adapter for backward compatibility
   */
  getTimerAdapter(): TimerAdapter | undefined {
    return this.timerAdapter;
  }

  /**
   * Get FSM manager
   */
  getFSMManager(): FSMManager | undefined {
    return this.fsmManager;
  }

  /**
   * Handle connection changes
   */
  onConnectionsLoaded(connections: any[]) {
    this.appActor?.send({ type: 'CONNECTIONS_LOADED', connections });
  }

  /**
   * Handle connection selection
   */
  onConnectionSelected(connectionId: string) {
    this.appActor?.send({ type: 'CONNECTION_SELECTED', connectionId });
  }

  /**
   * Handle authentication requirement
   */
  onAuthenticationRequired(connectionId: string) {
    if (!this.isStarted) {
      this.logger.info(
        `Skipping authentication required - FSM not started (connectionId: ${connectionId})`
      );
      return;
    }
    this.appActor?.send({ type: 'AUTHENTICATION_REQUIRED', connectionId });
  }

  /**
   * Handle authentication success
   */
  onAuthenticationSuccess(connectionId: string) {
    this.appActor?.send({ type: 'AUTHENTICATION_SUCCESS', connectionId });
  }

  /**
   * Handle authentication failure
   */
  onAuthenticationFailed(connectionId: string, error: string) {
    this.appActor?.send({ type: 'AUTHENTICATION_FAILED', connectionId, error });
  }

  /**
   * Handle webview ready
   */
  onWebviewReady() {
    this.appActor?.send({ type: 'WEBVIEW_READY' });
  }

  /**
   * Show webview (trigger UI visibility)
   */
  showWebview() {
    if (!this.isStarted) {
      this.logger.info('Skipping webview show - FSM not started');
      return;
    }
    if (this.appActor) {
      this.appActor.send({ type: 'SHOW_WEBVIEW' });
      this.logger.info('FSM triggered webview visibility');
    } else {
      this.logger.warn('Cannot show webview - FSM actor not available');
    }
  }

  /**
   * Handle webview message
   */
  onWebviewMessage(message: any) {
    if (!this.isStarted) {
      this.logger.info(
        `Skipping webview message - FSM not started (message type: ${message?.type})`
      );
      return;
    }
    this.appActor?.send({ type: 'WEBVIEW_MESSAGE', message });
  }

  /**
   * Handle error
   */
  onError(error: Error) {
    this.appActor?.send({ type: 'ERROR', error });
  }

  /**
   * Retry after error
   */
  retry() {
    this.appActor?.send({ type: 'RETRY' });
  }

  /**
   * Reset to initial state
   */
  reset() {
    this.appActor?.send({ type: 'RESET' });
  }

  /**
   * Update webview panel for data synchronization
   */
  updateWebviewPanel(webviewPanel: any) {
    if (this.appActor) {
      // Send UPDATE_WEBVIEW_PANEL event to properly update FSM context
      this.appActor.send({
        type: 'UPDATE_WEBVIEW_PANEL',
        webviewPanel: webviewPanel,
      });
      this.logger.info('Webview panel updated in FSM context for data synchronization');
    } else {
      this.logger.warn('Cannot update webview panel - FSM actor not available');
    }
  }

  /**
   * Get connections from FSM state
   */
  getConnections() {
    const state = this.getState();
    return state?.context.connections || [];
  }

  /**
   * Get active connection ID from FSM state
   */
  getActiveConnectionId() {
    const state = this.getState();
    return state?.context.activeConnectionId;
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    const state = this.getState();
    return {
      isStarted: this.isStarted,
      currentState: state?.value,
      context: {
        isActivated: state?.context.isActivated,
        isDeactivating: state?.context.isDeactivating,
        connectionCount: state?.context.connections.length,
        activeConnectionId: state?.context.activeConnectionId,
        hasTimerActor: !!state?.context.timerActor,
        connectionActorCount: state?.context.connectionActors.size,
        authActorCount: state?.context.authActors.size,
        lastError: state?.context.lastError?.message,
        errorRecoveryAttempts: state?.context.errorRecoveryAttempts,
      },
      timerAdapter: this.timerAdapter
        ? {
            isEnabled: this.timerAdapter.validateSync(),
            currentSnapshot: this.timerAdapter.snapshot(),
          }
        : null,
      fsmManager: this.fsmManager
        ? {
            isStarted: this.fsmManager['isStarted'] || false,
            hasTimerActor: !!this.fsmManager['timerActor'],
          }
        : null,
    };
  }
}

// Singleton instance for global access
let applicationFSMManager: ApplicationFSMManager | undefined;

/**
 * Get or create the application FSM manager
 */
export function getApplicationFSMManager(extensionContext?: any): ApplicationFSMManager {
  if (!applicationFSMManager && extensionContext) {
    applicationFSMManager = new ApplicationFSMManager(extensionContext);
  }

  if (!applicationFSMManager) {
    throw new Error('ApplicationFSMManager not initialized. Call with extensionContext first.');
  }

  return applicationFSMManager;
}

/**
 * Reset the singleton (for testing)
 */
export function resetApplicationFSMManager() {
  applicationFSMManager = undefined;
}
