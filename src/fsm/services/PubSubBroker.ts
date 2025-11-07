/**
 * PubSub Broker for Extension Host
 *
 * Implements the pub/sub broker pattern for XState machine <-> webview communication.
 * Conforms to the migration instructions for subseq/pubseq reconciliation.
 *
 * Features:
 * - Topic-based message routing
 * - Retained messages (snapshots)
 * - Subscriber management
 * - Monotonic pubseq generation
 * - Event echoing (echoSubseq)
 */

import { EventEmitter } from 'events';
import { createLogger } from '../../logging/unifiedLogger.js';

const logger = createLogger('pubsub-broker');

/**
 * Message envelope for pubsub:publish (subscriber -> broker)
 */
interface PublishMessage<T = any> {
  type: 'pubsub:publish';
  topic: string;
  payload: T;
  retain?: boolean;
}

/**
 * Message envelope for pubsub:message (broker -> subscriber)
 */
interface BroadcastMessage<T = any> {
  type: 'pubsub:message';
  topic: string;
  payload: T;
  pubseq: number;
}

/**
 * Subscribe message
 */
interface SubscribeMessage {
  type: 'pubsub:subscribe';
  topic: string;
}

/**
 * Unsubscribe message
 */
interface UnsubscribeMessage {
  type: 'pubsub:unsubscribe';
  topic: string;
}

/**
 * Subscriber interface (typically a webview)
 */
export interface Subscriber {
  /**
   * Unique identifier for this subscriber
   */
  id: string;
  /**
   * Send a message to this subscriber
   */
  postMessage(message: any): void;
}

/**
 * Retained message with pubseq
 */
interface RetainedMessage<T = any> {
  topic: string;
  payload: T;
  pubseq: number;
  timestamp: number;
}

/**
 * PubSub Broker for managing communication between extension host and webviews.
 *
 * Responsibilities:
 * - Route messages between publishers and subscribers
 * - Maintain retained messages (e.g., machine snapshots)
 * - Generate monotonic pubseq for all publishes
 * - Replay retained messages to new subscribers
 *
 * @example
 * ```typescript
 * const broker = new PubSubBroker();
 *
 * // Register webview as subscriber
 * broker.addSubscriber(webviewPanel);
 *
 * // Publish machine snapshot
 * broker.publish('machine:app:snapshot', {
 *   state: { value: 'ready', context: {...} },
 *   echoSubseq: 5
 * }, { retain: true });
 *
 * // Handle incoming messages from webview
 * webview.webview.onDidReceiveMessage(message => {
 *   broker.handleMessage(webviewPanel.id, message);
 * });
 * ```
 */
export class PubSubBroker extends EventEmitter {
  /**
   * Map of topic -> Set of subscriber IDs
   */
  private subscriptions = new Map<string, Set<string>>();

  /**
   * Map of subscriber ID -> Subscriber instance
   */
  private subscribers = new Map<string, Subscriber>();

  /**
   * Map of topic -> retained message
   */
  private retainedMessages = new Map<string, RetainedMessage>();

  /**
   * Monotonic publisher sequence counter
   */
  private pubseqCounter = 0;

  /**
   * Add a subscriber (webview) to the broker.
   *
   * @param subscriber - Subscriber instance with id and postMessage method
   */
  addSubscriber(subscriber: Subscriber): void {
    this.subscribers.set(subscriber.id, subscriber);
    logger.debug('Subscriber added', { subscriberId: subscriber.id });
  }

  /**
   * Remove a subscriber from the broker.
   * Automatically unsubscribes from all topics.
   *
   * @param subscriberId - Subscriber ID to remove
   */
  removeSubscriber(subscriberId: string): void {
    // Remove from all topic subscriptions
    for (const [topic, subs] of this.subscriptions.entries()) {
      subs.delete(subscriberId);
      if (subs.size === 0) {
        this.subscriptions.delete(topic);
      }
    }

    // Remove subscriber reference
    this.subscribers.delete(subscriberId);
    logger.debug('Subscriber removed', { subscriberId });
  }

  /**
   * Handle incoming message from a subscriber.
   * Routes to appropriate handler based on message type.
   *
   * @param subscriberId - ID of the subscriber sending the message
   * @param message - Message object
   */
  handleMessage(subscriberId: string, message: any): void {
    if (!message || typeof message.type !== 'string') {
      logger.warn('Invalid message received', { meta: message });
      return;
    }

    switch (message.type) {
      case 'pubsub:subscribe':
        this.handleSubscribe(subscriberId, message as SubscribeMessage);
        break;
      case 'pubsub:unsubscribe':
        this.handleUnsubscribe(subscriberId, message as UnsubscribeMessage);
        break;
      case 'pubsub:publish':
        this.handlePublish(subscriberId, message as PublishMessage);
        break;
      default:
        logger.warn('Unknown message type', { messageType: message.type });
    }
  }

  /**
   * Subscribe a subscriber to a topic.
   * Automatically replays retained message if available.
   *
   * @param subscriberId - Subscriber ID
   * @param message - Subscribe message
   */
  private handleSubscribe(subscriberId: string, message: SubscribeMessage): void {
    const { topic } = message;

    // Add to subscriptions
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(subscriberId);

    logger.debug('Subscriber subscribed to topic', { subscriberId, topic });

    // Replay retained message if available
    const retained = this.retainedMessages.get(topic);
    if (retained) {
      const subscriber = this.subscribers.get(subscriberId);
      if (subscriber) {
        const broadcastMsg: BroadcastMessage = {
          type: 'pubsub:message',
          topic: retained.topic,
          payload: retained.payload,
          pubseq: retained.pubseq,
        };
        subscriber.postMessage(broadcastMsg);
        logger.debug('Replayed retained message', { topic, subscriberId });
      }
    }
  }

  /**
   * Unsubscribe a subscriber from a topic.
   *
   * @param subscriberId - Subscriber ID
   * @param message - Unsubscribe message
   */
  private handleUnsubscribe(subscriberId: string, message: UnsubscribeMessage): void {
    const { topic } = message;

    const subs = this.subscriptions.get(topic);
    if (subs) {
      subs.delete(subscriberId);
      if (subs.size === 0) {
        this.subscriptions.delete(topic);
      }
      logger.debug('Subscriber unsubscribed from topic', { subscriberId, topic });
    }
  }

  /**
   * Handle publish message from a subscriber.
   * Emits as an event for extension host to process.
   *
   * @param subscriberId - Subscriber ID
   * @param message - Publish message
   */
  private handlePublish(subscriberId: string, message: PublishMessage): void {
    const { topic, payload } = message;

    logger.debug('Subscriber published to topic', { subscriberId, topic });

    // Emit event for external listeners (e.g., machine event handlers)
    this.emit('publish', { subscriberId, topic, payload });
  }

  /**
   * Publish a message to a topic (from extension host).
   * Generates monotonic pubseq and broadcasts to all subscribers.
   * Optionally retains message for future subscribers.
   *
   * @param topic - Topic name
   * @param payload - Payload to publish
   * @param options - Publishing options
   */
  publish<T>(topic: string, payload: T, options: { retain?: boolean } = {}): void {
    const { retain = false } = options;

    // Generate monotonic pubseq
    const pubseq = ++this.pubseqCounter;

    // Retain message if requested
    if (retain) {
      this.retainedMessages.set(topic, {
        topic,
        payload,
        pubseq,
        timestamp: Date.now(),
      });
    }

    // Broadcast to all subscribers
    const subs = this.subscriptions.get(topic);
    if (subs && subs.size > 0) {
      const broadcastMsg: BroadcastMessage<T> = {
        type: 'pubsub:message',
        topic,
        payload,
        pubseq,
      };

      for (const subId of subs) {
        const subscriber = this.subscribers.get(subId);
        if (subscriber) {
          subscriber.postMessage(broadcastMsg);
        }
      }

      logger.debug('Published to topic', {
        topic,
        pubseq,
        subscriberCount: subs.size,
        retained: retain,
      });
    } else {
      logger.debug('Published to topic (no subscribers)', { topic, pubseq, retained: retain });
    }
  }

  /**
   * Get current pubseq counter value.
   * Useful for debugging/diagnostics.
   *
   * @returns Current pubseq value
   */
  getCurrentPubseq(): number {
    return this.pubseqCounter;
  }

  /**
   * Get retained message for a topic.
   *
   * @param topic - Topic name
   * @returns Retained message or undefined
   */
  getRetainedMessage(topic: string): RetainedMessage | undefined {
    return this.retainedMessages.get(topic);
  }

  /**
   * Clear retained message for a topic.
   *
   * @param topic - Topic name
   */
  clearRetainedMessage(topic: string): void {
    this.retainedMessages.delete(topic);
    logger.debug('Cleared retained message for topic', { topic });
  }

  /**
   * Get list of topics with active subscriptions.
   *
   * @returns Array of topic names
   */
  getActiveTopics(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Get subscriber count for a topic.
   *
   * @param topic - Topic name
   * @returns Number of subscribers
   */
  getSubscriberCount(topic: string): number {
    return this.subscriptions.get(topic)?.size ?? 0;
  }

  /**
   * Dispose of broker resources.
   * Removes all subscriptions and subscribers.
   */
  dispose(): void {
    this.subscriptions.clear();
    this.subscribers.clear();
    this.retainedMessages.clear();
    this.removeAllListeners();
    logger.debug('Disposed');
  }
}

/**
 * Singleton broker instance (recommended for most use cases)
 */
let globalBroker: PubSubBroker | null = null;

/**
 * Get the global PubSubBroker instance.
 * Creates one if it doesn't exist.
 *
 * @returns Global PubSubBroker instance
 */
export function getGlobalBroker(): PubSubBroker {
  if (!globalBroker) {
    globalBroker = new PubSubBroker();
  }
  return globalBroker;
}

/**
 * Reset the global broker (useful for testing).
 */
export function resetGlobalBroker(): void {
  if (globalBroker) {
    globalBroker.dispose();
    globalBroker = null;
  }
}
