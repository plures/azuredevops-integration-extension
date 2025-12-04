/**
 * Module: Praxis Bridge
 * Owner: application
 * Reads: Praxis Application State
 * Writes: Serialized state to Webview
 * Receives: Events from Webview
 * Emits: Praxis Events to Application Manager
 *
 * This bridge replaces the legacy SharedContextBridge.
 * It serializes the full Praxis state for the Webview to consume directly.
 */

import type { Disposable, Webview } from 'vscode';
import type { PraxisApplicationManager } from '../praxis/application/manager.js';
import type { PraxisApplicationContext } from '../praxis/application/types.js';
import type { PraxisApplicationEvent } from '../praxis/application/facts.js';

export interface PraxisBridge extends Disposable {
  attachWebview(webview: Webview): void;
  detachWebview(): void;
  sync(): void;
}

/**
 * Serialize context for transport
 * Converts Maps to Arrays for JSON serialization
 */
function serializeContext(context: PraxisApplicationContext): any {
  return JSON.parse(
    JSON.stringify(context, (_key, value) => {
      if (value instanceof Map) {
        return {
          __type: 'Map',
          value: Array.from(value.entries()),
        };
      }
      return value;
    })
  );
}

export function createPraxisBridge(
  manager: PraxisApplicationManager,
  logger?: (msg: string, meta?: any) => void
): PraxisBridge {
  let currentWebview: Webview | undefined;
  let disposables: Disposable[] = [];

  function postMessage(type: string, payload: any) {
    if (currentWebview) {
      currentWebview.postMessage({ type, payload }).then(
        () => {},
        (err) => {
          logger?.('Failed to post message to webview', { error: err });
        }
      );
    }
  }

  function sync() {
    if (!currentWebview) return;

    try {
      const snapshot = manager.getSnapshot();
      // We need the full context, not just the snapshot
      const context = manager.getContext();

      const serializedContext = serializeContext(context);

      postMessage('syncState', {
        state: snapshot.state,
        context: serializedContext,
        // Include matches for compatibility if needed, or let webview compute it
        matches: snapshot.matches(snapshot.state) ? { [snapshot.state]: true } : {},
      });
    } catch (error) {
      logger?.('Failed to sync state', { error });
    }
  }

  // Subscribe to manager updates
  // We need a way to know when state changes.
  // The manager doesn't expose a generic "onStateChange" yet,
  // but we can subscribe to the event bus.
  // Ideally, the manager should emit a 'state:changed' event or similar.
  // For now, we'll poll or hook into the event bus.

  // Better approach: The manager's event bus emits events.
  // We can trigger sync on any event that might change state.
  const unsubscribeBus = manager.subscribeToTimer(() => {
    // Timer updates happen frequently, maybe throttle this?
    // For now, let's sync.
    sync();
  });

  // Also subscribe to general application events if possible
  // Since subscribeToTimer only catches timer events, we might need a broader subscription.
  // Let's assume for now we rely on the existing polling mechanism in the webview
  // or add a polling interval here if the manager doesn't push updates.

  const pollInterval = setInterval(() => {
    sync();
  }, 200); // 5Hz update rate

  return {
    attachWebview(webview: Webview) {
      currentWebview = webview;

      const messageDisposable = webview.onDidReceiveMessage((message) => {
        if (message.type === 'PRAXIS_EVENT' && message.events) {
          // Dispatch events from webview to manager
          manager.dispatch(message.events as PraxisApplicationEvent[]);
        }
      });

      disposables.push(messageDisposable);
      sync();
    },

    detachWebview() {
      currentWebview = undefined;
      disposables.forEach((d) => d.dispose());
      disposables = [];
    },

    sync,

    dispose() {
      clearInterval(pollInterval);
      unsubscribeBus();
      this.detachWebview();
    },
  };
}
