/**
 * Module: VS Code PubSub Adapter (Webview)
 * Owner: webview
 * Reads: webview VS Code API state; receives host broadcast messages
 * Writes: UI-originated pubsub publish/subscribe/unsubscribe envelopes
 * Receives: Host broadcasts mapped to the adapter
 * Emits: postMessage envelopes via VS Code API
 * Prohibitions: Do not import extension host modules; Do not mutate ApplicationContext
 * Rationale: Isolated message adapter for webview-side pub/sub
 *
 * Message Envelope Format (matches migration instructions):
 * - Webview -> Host (publish): { type: 'pubsub:publish', topic, payload, retain? }
 * - Host -> Webview (message): { type: 'pubsub:message', topic, payload, pubseq }
 */

import type { PubSubAdapter } from '../fsm/xstate-svelte/src/useRemoteMachinePubSub';

/**
 * Message envelope for pubsub:publish (webview -> host)
 */
interface PublishMessage<T = any> {
  type: 'pubsub:publish';
  topic: string;
  payload: T;
  retain?: boolean;
}

/**
 * Message envelope for pubsub:message (host -> webview)
 */
interface BroadcastMessage<T = any> {
  type: 'pubsub:message';
  topic: string;
  payload: T;
  pubseq: number;
}

/**
 * Message envelope for pubsub:subscribe (webview -> host)
 */
interface SubscribeMessage {
  type: 'pubsub:subscribe';
  topic: string;
}

/**
 * Message envelope for pubsub:unsubscribe (webview -> host)
 */
interface UnsubscribeMessage {
  type: 'pubsub:unsubscribe';
  topic: string;
}

/**
 * VS Code API interface (minimal)
 */
interface VSCodeAPI {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

/**
 * VS Code PubSub Adapter for webview-side pub/sub communication.
 *
 * Features:
 * - Automatic subscription management (subscribe/unsubscribe)
 * - Topic-based message routing
 * - pubseq monotonic sequence validation
 * - Integration with VS Code webview message passing
 *
 * @example
 * ```typescript
 * const vscode = acquireVsCodeApi();
 * const pubsub = createVSCodePubSubAdapter(vscode);
 *
 * // Subscribe to topic
 * const unsub = pubsub.subscribe('machine:app:snapshot', (data) => {
 *   console.log('Snapshot received:', data);
 * });
 *
 * // Publish event
 * pubsub.publish('machine:app:events', { event: { type: 'CLICK' }, subseq: 1 });
 * ```
 */
export function createVSCodePubSubAdapter(vscode: VSCodeAPI): PubSubAdapter {
  // Topic -> handlers map
  const handlers = new Map<string, Set<(data: any) => void>>();

  // Track last pubseq per topic to enforce monotonic ordering
  const lastPubseq = new Map<string, number>();

  // Listen for messages from extension host
  window.addEventListener('message', (event) => {
    const message = event.data;

    // Handle pubsub:message broadcasts
    if (message?.type === 'pubsub:message') {
      const { topic, payload, pubseq } = message as BroadcastMessage;

      // Validate monotonic pubseq (prevent stale messages)
      const lastSeq = lastPubseq.get(topic) ?? -1;
      if (pubseq <= lastSeq) {
        console.debug(
          `[PubSub] Ignoring stale message for topic ${topic}. pubseq ${pubseq} <= lastSeq ${lastSeq}`
        );
        return;
      }
      lastPubseq.set(topic, pubseq);

      // Deliver to all subscribers
      const topicHandlers = handlers.get(topic);
      if (topicHandlers) {
        topicHandlers.forEach((handler) => {
          try {
            handler(payload);
          } catch (error) {
            console.debug(`[PubSub] Handler error for topic ${topic}:`, error);
          }
        });
      }
    }
  });

  return {
    /**
     * Subscribe to a topic.
     * Sends subscription message to host and registers local handler.
     *
     * @param topic - Topic name (e.g., 'machine:app:snapshot')
     * @param handler - Callback for messages on this topic
     * @returns Unsubscribe function
     */
    subscribe<T>(topic: string, handler: (data: T) => void): () => void {
      // Register handler locally
      if (!handlers.has(topic)) {
        handlers.set(topic, new Set());

        // Send subscribe message to host
        const subscribeMsg: SubscribeMessage = {
          type: 'pubsub:subscribe',
          topic,
        };
        vscode.postMessage(subscribeMsg);
      }

      handlers.get(topic)!.add(handler);

      // Return unsubscribe function
      return () => {
        const topicHandlers = handlers.get(topic);
        if (topicHandlers) {
          topicHandlers.delete(handler);

          // If no more handlers, send unsubscribe to host
          if (topicHandlers.size === 0) {
            handlers.delete(topic);
            lastPubseq.delete(topic);

            const unsubscribeMsg: UnsubscribeMessage = {
              type: 'pubsub:unsubscribe',
              topic,
            };
            vscode.postMessage(unsubscribeMsg);
          }
        }
      };
    },

    /**
     * Publish data to a topic.
     * Sends publish message to extension host.
     *
     * @param topic - Topic name (e.g., 'machine:app:events')
     * @param data - Payload to publish (should include subseq if it's an event)
     */
    publish<T>(topic: string, data: T): void {
      const publishMsg: PublishMessage<T> = {
        type: 'pubsub:publish',
        topic,
        payload: data,
        retain: false, // Events are not retained
      };
      vscode.postMessage(publishMsg);
    },
  };
}

/**
 * Singleton instance (initialized on first call)
 */
let adapterInstance: PubSubAdapter | null = null;

/**
 * Get or create the singleton VS Code PubSub adapter.
 *
 * @param vscode - VS Code API instance (optional if already initialized)
 * @returns PubSubAdapter instance
 */
export function getVSCodePubSubAdapter(vscode?: VSCodeAPI): PubSubAdapter {
  if (!adapterInstance) {
    if (!vscode) {
      // Try to get from window
      vscode = (window as any).__vscodeApi || (window as any).acquireVsCodeApi?.();
      if (!vscode) {
        throw new Error(
          '[PubSub] VS Code API not available. Call with vscode parameter or ensure acquireVsCodeApi() was called.'
        );
      }
    }
    adapterInstance = createVSCodePubSubAdapter(vscode);
  }
  return adapterInstance;
}
