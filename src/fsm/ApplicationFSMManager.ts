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

import { PraxisApplicationManager } from '../praxis/application/manager.js';
import { FSMManager } from './FSMManager.js';
import { FSM_CONFIG as _FSM_CONFIG } from './config.js';
import { createComponentLogger, FSMComponent } from './logging/FSMLogger.js';
import { fsmTracer } from './logging/FSMTracer.js';

export class ApplicationFSMManager {
  private praxisManager?: PraxisApplicationManager;
  private fsmManager?: FSMManager;
  private isStarted = false;
  private logger = createComponentLogger(FSMComponent.APPLICATION, 'ApplicationFSM');
  private traceCleanup: (() => void) | undefined;

  constructor(private extensionContext: any) {
    this.logger.info('ApplicationFSMManager created (Praxis-based)');
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
      this.logger.info('Starting application state machine (Praxis)...');

      // Create the main application manager
      this.praxisManager = new PraxisApplicationManager();
      this.praxisManager.start();

      // Setup FSM tracing for full replay capability
      // Note: Praxis doesn't use actors in the same way, but we can still log events
      this.traceCleanup = fsmTracer.instrumentActor(
        this.praxisManager.getEngine(),
        FSMComponent.APPLICATION,
        'applicationMachine'
      );
      this.logger.info('Application FSM instrumented for tracing and replay');

      // Activate the extension
      this.praxisManager.activate(this.extensionContext);
      this.logger.logEvent('ACTIVATE', 'initializing', 'applicationMachine', {
        context: 'extensionContext',
      });

      // Create FSM Manager for backward compatibility (Timer)
      this.fsmManager = new FSMManager();
      await this.fsmManager.start();
      this.logger.info('FSM Manager started');

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
      this.praxisManager?.deactivate();
      this.logger.logEvent('DEACTIVATE', 'stopping', 'applicationMachine');

      // Stop child managers
      await this.fsmManager?.stop();
      this.logger.info('FSM Manager stopped');

      // Stop the main manager
      this.praxisManager?.stop();
      this.logger.info('Application manager stopped');

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
    if (!this.praxisManager) return undefined;
    const snapshot = this.praxisManager.getSnapshot();
    return {
      value: snapshot.state,
      context: snapshot,
    };
  }

  /**
   * Send event to application FSM
   * Note: This is a compatibility layer. Prefer using specific methods on PraxisApplicationManager.
   */
  send(event: any) {
    if (!this.praxisManager) return;

    // Map legacy events to Praxis calls if needed
    // For now, we just log that we received a generic event
    this.logger.debug(`Received generic event: ${event.type}`, event);

    // Handle specific events that might be passed via send()
    switch (event.type) {
      case 'CONNECTIONS_LOADED':
        this.praxisManager.loadConnections(event.connections);
        break;
      case 'CONNECTION_SELECTED':
        this.praxisManager.selectConnection(event.connectionId);
        break;
      case 'AUTHENTICATION_SUCCESS': {
        const authManager = this.praxisManager.getAuthManager(event.connectionId);
        if (authManager) {
          authManager.authSuccess(event.token);
        }
        break;
      }
      case 'AUTHENTICATION_FAILED': {
        const authManagerFail = this.praxisManager.getAuthManager(event.connectionId);
        if (authManagerFail) {
          authManagerFail.authFailed(event.error);
        }
        break;
      }
      // Add other mappings as needed
    }
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
    this.praxisManager?.loadConnections(connections);
  }

  /**
   * Handle connection selection
   */
  onConnectionSelected(connectionId: string) {
    this.praxisManager?.selectConnection(connectionId);
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
    // In Praxis, we might request an auth reminder or trigger a flow
    this.praxisManager?.requestAuthReminder(connectionId, 'Authentication required');
  }

  /**
   * Handle authentication success
   */
  onAuthenticationSuccess(connectionId: string, token: string) {
    const authManager = this.praxisManager?.getAuthManager(connectionId);
    if (authManager) {
      authManager.authSuccess(token);
    }
  }

  /**
   * Handle authentication failure
   */
  onAuthenticationFailed(connectionId: string, error: string) {
    const authManager = this.praxisManager?.getAuthManager(connectionId);
    if (authManager) {
      authManager.authFailed(error);
    }
  }

  /**
   * Handle webview ready
   */
  onWebviewReady() {
    // Praxis might not need explicit webview ready event, or we can emit it via event bus
    this.praxisManager?.getEventBus().emitApplicationEvent('webview:ready', {});
  }

  /**
   * Show webview (trigger UI visibility)
   */
  showWebview() {
    if (!this.isStarted) {
      this.logger.info('Skipping webview show - FSM not started');
      return;
    }
    // Toggle debug view or ensure view mode is set
    // This might need a specific method in PraxisApplicationManager if it controls UI visibility
    this.logger.info('FSM triggered webview visibility (Praxis)');
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
    // Dispatch to event bus or handle specific messages
    this.praxisManager?.getEventBus().emitApplicationEvent('webview:message', { message });
  }

  /**
   * Handle error
   */
  onError(error: Error) {
    this.praxisManager?.reportError(error.message);
  }

  /**
   * Retry after error
   */
  retry() {
    this.praxisManager?.retry();
  }

  /**
   * Reset to initial state
   */
  reset() {
    this.praxisManager?.reset();
  }

  /**
   * Update webview panel for data synchronization
   */
  updateWebviewPanel(webviewPanel: any) {
    // Praxis doesn't store the webview panel in context directly usually
    // But we can log it or handle it if needed
    this.logger.info('Webview panel updated (Praxis)');
  }

  /**
   * Get connections from FSM state
   */
  getConnections() {
    return this.praxisManager?.getConnections() || [];
  }

  /**
   * Get active connection ID from FSM state
   */
  getActiveConnectionId() {
    return this.praxisManager?.getActiveConnectionId();
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    const status = this.praxisManager?.getStatus();
    return {
      isStarted: this.isStarted,
      currentState: status?.applicationState,
      context: {
        isActivated: status?.isStarted,
        connectionCount: status?.connectionCount,
        authManagerCount: status?.authManagerCount,
        connectionManagerCount: status?.connectionManagerCount,
      },
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
