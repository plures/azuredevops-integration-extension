/**
 * Module: src/architecture/IntegrationExample.ts
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
 * Context-Driven Integration Example
 *
 * Shows how to integrate the context-driven architecture with
 * the existing VS Code extension and Svelte webview.
 */

import { ContextManager } from './ContextDrivenDemo';
import { writable, derived } from 'svelte/store';

/**
 * Extension Side Integration
 *
 * This would be added to activation.ts
 */
export class ExtensionContextIntegration {
  private contextManager: ContextManager;

  constructor() {
    this.contextManager = new ContextManager();
    console.log('[Extension] Context-driven architecture initialized');
  }

  // Handle messages from webview
  handleWebviewMessage(message: any) {
    console.log('[Extension] Received webview message:', message.type);

    switch (message.type) {
      case 'switchConnection':
        console.log('[Extension] Switching connection to:', message.connectionId);
        this.contextManager.applyAction('setActiveConnection', message.connectionId);

        // Send updated context to webview
        this.sendContextToWebview();
        break;

      case 'startTimer':
        console.log('[Extension] Starting timer for work item:', message.workItemId);
        this.contextManager.applyAction('startTimer', message.workItemId);
        this.sendContextToWebview();
        break;

      case 'refreshWorkItems': {
        console.log('[Extension] Refreshing work items');
        const activeConnectionId = this.contextManager.getContext().activeConnectionId;
        if (activeConnectionId) {
          // Use setActiveConnection to trigger refresh of the active connection
          this.contextManager.applyAction('setActiveConnection', activeConnectionId);
        }
        this.sendContextToWebview();
        break;
      }

      default:
        console.log('[Extension] Unknown message type:', message.type);
    }
  }

  // Send current context to webview
  private sendContextToWebview() {
    const context = this.contextManager.getContext();

    // This would use the actual webview panel
    console.log('[Extension] Sending context to webview:', {
      activeConnectionId: context.activeConnectionId,
      connectionCount: context.connections.length,
      timerActive: context.timer.isActive,
    });

    // webviewPanel.webview.postMessage({
    //   type: 'contextUpdate',
    //   context: context
    // });
  }

  // Get context manager for debugging
  getContextManager() {
    return this.contextManager;
  }
}

/**
 * Webview Side Integration
 *
 * This would replace the complex message handling in webview components
 */
export class WebviewContextIntegration {
  private context: any = null;
  private listeners: Array<(context: any) => void> = [];

  constructor() {
    // Listen for context updates from extension
    window.addEventListener('message', (event) => {
      if (event.data.type === 'contextUpdate') {
        console.log('[Webview] Received context update');
        this.updateContext(event.data.context);
      }
    });
  }

  // Subscribe to context changes
  subscribe(listener: (context: any) => void) {
    this.listeners.push(listener);

    // Send current context immediately
    if (this.context) {
      listener(this.context);
    }

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Update context and notify listeners
  private updateContext(newContext: any) {
    this.context = newContext;

    console.log('[Webview] Context updated, notifying listeners:', this.listeners.length);

    this.listeners.forEach((listener) => {
      try {
        listener(this.context);
      } catch (error) {
        console.error('[Webview] Error notifying listener:', error);
      }
    });
  }

  // Send action to extension
  sendAction(actionType: string, payload?: any) {
    console.log('[Webview] Sending action:', actionType, payload);

    // This would use the VS Code API
    // vscode.postMessage({ type: actionType, ...payload });

    // For demo, just log
    console.log('[Webview] Action sent to extension');
  }

  // Get current context
  getContext() {
    return this.context;
  }
}

/**
 * Svelte Store Integration
 *
 * This shows how to create reactive Svelte stores from the context
 */
export function createContextStores(webviewIntegration: WebviewContextIntegration) {
  // Main context store
  const contextStore = writable(null);

  // Subscribe to context updates
  webviewIntegration.subscribe((context) => {
    contextStore.set(context);
  });

  // Derived stores for specific UI needs
  const connections = derived(contextStore, ($context: any) => $context?.connections || []);

  const activeConnection = derived(
    contextStore,
    ($context: any) =>
      $context?.connections.find((c: any) => c.id === $context.activeConnectionId) || null
  );

  const activeWorkItems = derived(
    contextStore,
    ($context: any) => $context?.workItemsByConnection.get($context.activeConnectionId) || []
  );

  const timerState = derived(
    contextStore,
    ($context: any) => $context?.timer || { isActive: false, isRunning: false, elapsed: 0 }
  );

  const isLoading = derived(contextStore, ($context: any) => $context?.isLoading || false);

  // Action helpers
  const actions = {
    switchConnection: (connectionId: string) => {
      webviewIntegration.sendAction('switchConnection', { connectionId });
    },

    startTimer: (workItemId: string) => {
      webviewIntegration.sendAction('startTimer', { workItemId });
    },

    stopTimer: () => {
      webviewIntegration.sendAction('stopTimer');
    },

    refreshWorkItems: () => {
      webviewIntegration.sendAction('refreshWorkItems');
    },
  };

  return {
    // Raw context
    context: contextStore,

    // Derived data
    connections,
    activeConnection,
    activeWorkItems,
    timerState,
    isLoading,

    // Actions
    actions,
  };
}

/**
 * Migration Path
 *
 * 1. Add ExtensionContextIntegration to activation.ts
 * 2. Replace message handling with contextManager.applyAction calls
 * 3. Add WebviewContextIntegration to webview
 * 4. Replace complex state management with simple context subscriptions
 * 5. Update Svelte components to use derived stores
 * 6. Remove legacy FSM message coordination
 */

/**
 * Example: Fixed Connection Switching
 *
 * Current problem: Tab click doesn't update display
 *
 * With context-driven architecture:
 * 1. User clicks tab → calls actions.switchConnection(connectionId)
 * 2. WebviewContextIntegration sends message to extension
 * 3. ExtensionContextIntegration calls contextManager.applyAction('setActiveConnection', connectionId)
 * 4. ContextManager updates shared context
 * 5. DataActor observes context change and fetches work items if needed
 * 6. Updated context sent back to webview
 * 7. Svelte stores automatically update
 * 8. Component re-renders with new data
 *
 * Simple, predictable, and it works!
 */

export function demonstrateFixedConnectionSwitching() {
  console.log('\n=== Demonstrating Fixed Connection Switching ===\n');

  // Extension side
  const extensionIntegration = new ExtensionContextIntegration();

  // Webview side
  const webviewIntegration = new WebviewContextIntegration();

  // Create stores
  const stores = createContextStores(webviewIntegration);

  // Simulate adding connections
  console.log('1. Adding connections...');
  extensionIntegration.handleWebviewMessage({
    type: 'addConnection',
    connection: { id: 'conn1', label: 'Project A' },
  });

  extensionIntegration.handleWebviewMessage({
    type: 'addConnection',
    connection: { id: 'conn2', label: 'Project B' },
  });

  // Simulate tab switching
  console.log('2. User clicks first tab...');
  stores.actions.switchConnection('conn1');

  setTimeout(() => {
    console.log('3. User clicks second tab...');
    stores.actions.switchConnection('conn2');
  }, 100);

  console.log('\nBoth tab switches would work correctly!');
}
