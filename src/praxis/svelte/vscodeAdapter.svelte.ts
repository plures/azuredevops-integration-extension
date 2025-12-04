/**
 * Praxis VS Code Webview Adapter
 *
 * Enables communication between Praxis engines in the extension host
 * and Svelte components in the webview.
 */

import type { PraxisEvent } from '@plures/praxis';
import type {
  RemoteEngineAdapter,
  PraxisWebviewMessage,
  PraxisStatePayload,
  PraxisEventPayload,
  PraxisEngineState,
  UsePraxisEngineResult,
  UsePraxisEngineOptions,
} from './types.js';

/**
 * Get VS Code API if available (in webview context)
 */
function getVSCodeApi(): any {
  if (typeof window !== 'undefined' && (window as any).__vscodeApi) {
    return (window as any).__vscodeApi;
  }
  if (typeof acquireVsCodeApi !== 'undefined') {
    return acquireVsCodeApi();
  }
  return undefined;
}

// Declare acquireVsCodeApi for TypeScript
declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

/**
 * Create a VS Code webview adapter for Praxis engines
 *
 * This adapter enables communication between the extension host
 * (where Praxis engines run) and the webview (where Svelte renders).
 *
 * @param engineId - Unique identifier for the engine
 * @returns Remote engine adapter
 */
export function createVSCodePraxisAdapter<TContext>(
  engineId: string = 'application'
): RemoteEngineAdapter<TContext> {
  const vscode = getVSCodeApi();
  let currentContext: TContext | undefined;
  let isConnectedFlag = false;
  const subscribers = new Set<(context: TContext) => void>();

  // Set up message listener
  if (typeof window !== 'undefined') {
    window.addEventListener('message', (event) => {
      const message = event.data as PraxisWebviewMessage;

      if (!message || !message.type) return;

      switch (message.type) {
        case 'praxis:state': {
          const payload = message.payload as PraxisStatePayload<TContext>;
          if (payload.engineId && payload.engineId !== engineId) return;

          currentContext = payload.context;
          isConnectedFlag = true;

          // Notify all subscribers
          for (const callback of subscribers) {
            try {
              callback(payload.context);
            } catch (error) {
              console.debug('[PraxisAdapter] Subscriber error:', error);
            }
          }
          break;
        }

        case 'praxis:connected':
          isConnectedFlag = true;
          break;

        case 'praxis:disconnected':
          isConnectedFlag = false;
          break;
      }
    });
  }

  return {
    subscribe: (callback: (context: TContext) => void) => {
      subscribers.add(callback);

      // Send initial context if available
      if (currentContext) {
        callback(currentContext);
      }

      // Return unsubscribe function
      return () => {
        subscribers.delete(callback);
      };
    },

    sendEvent: (event: PraxisEvent) => {
      if (!vscode) {
        console.debug(
          '[PraxisAdapter] VS Code API not available. ' +
            'Ensure this code runs inside a VS Code webview with acquireVsCodeApi() called, ' +
            'or window.__vscodeApi is set.'
        );
        return;
      }

      const message: PraxisWebviewMessage<PraxisEventPayload> = {
        type: 'praxis:event',
        payload: {
          event,
          engineId,
        },
        timestamp: Date.now(),
      };

      vscode.postMessage(message);
    },

    isConnected: () => isConnectedFlag,

    getContext: () => currentContext,
  };
}

/**
 * Use a remote Praxis engine in Svelte webview
 *
 * This hook connects to a Praxis engine running in the extension host
 * via the VS Code webview messaging API.
 *
 * @param adapter - Remote engine adapter
 * @param options - Configuration options
 * @returns Reactive state and dispatch function
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { createVSCodePraxisAdapter, useRemotePraxisEngine } from '$lib/praxis/svelte';
 *
 *   const adapter = createVSCodePraxisAdapter<ApplicationContext>('application');
 *   const { state, dispatch } = useRemotePraxisEngine(adapter);
 * </script>
 * ```
 */
export function useRemotePraxisEngine<TContext>(
  adapter: RemoteEngineAdapter<TContext>,
  options: UsePraxisEngineOptions<TContext> = {}
): UsePraxisEngineResult<TContext> {
  // Create reactive state
  const initialContext = (adapter.getContext() || options.initialContext || {}) as TContext;

  const state = $state<PraxisEngineState<TContext>>({
    context: initialContext,
    connected: adapter.isConnected(),
    lastUpdate: Date.now(),
  });

  // Subscribe to context updates
  $effect(() => {
    const unsubscribe = adapter.subscribe((context) => {
      state.context = context;
      state.connected = true;
      state.lastUpdate = Date.now();

      options.onStateChange?.(context);
    });

    // Update connection status
    const checkConnection = setInterval(() => {
      const wasConnected = state.connected;
      state.connected = adapter.isConnected();

      if (wasConnected !== state.connected) {
        options.onConnectionChange?.(state.connected);
      }
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(checkConnection);
    };
  });

  // Dispatch function
  const dispatch = (event: PraxisEvent): void => {
    adapter.sendEvent(event);
  };

  // Get current context
  const getContext = (): TContext => {
    return adapter.getContext() || state.context;
  };

  // Check connection status
  const isConnected = (): boolean => {
    return adapter.isConnected();
  };

  return {
    state,
    dispatch,
    getContext,
    isConnected,
  };
}

/**
 * Singleton adapter instance
 */
let globalAdapter: RemoteEngineAdapter<unknown> | undefined;

/**
 * Get or create the global VS Code Praxis adapter
 */
export function getGlobalPraxisAdapter<TContext>(): RemoteEngineAdapter<TContext> {
  if (!globalAdapter) {
    globalAdapter = createVSCodePraxisAdapter<TContext>('application');
  }
  return globalAdapter as RemoteEngineAdapter<TContext>;
}

/**
 * Reset the global adapter (for testing)
 */
export function resetGlobalPraxisAdapter(): void {
  globalAdapter = undefined;
}
