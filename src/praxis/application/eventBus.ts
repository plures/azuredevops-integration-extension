/**
 * Praxis Event Bus
 *
 * Implements an event bus pattern for cross-engine communication
 * between Timer, Auth, Connection, and Application engines.
 */

import type { EventBusMessage, EventBusMessageType, EventBusSubscriber } from './types.js';

/**
 * Event Bus for Praxis multi-engine architecture
 *
 * Enables loose coupling between engines while maintaining
 * coordinated state management.
 */
export class PraxisEventBus {
  private subscribers = new Map<EventBusMessageType, Set<EventBusSubscriber>>();
  private allSubscribers = new Set<EventBusSubscriber>();
  private messageHistory: EventBusMessage[] = [];
  private maxHistorySize = 100;

  /**
   * Subscribe to specific message types
   */
  subscribe(type: EventBusMessageType, subscriber: EventBusSubscriber): () => void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type)!.add(subscriber);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(type)?.delete(subscriber);
    };
  }

  /**
   * Subscribe to all message types
   */
  subscribeAll(subscriber: EventBusSubscriber): () => void {
    this.allSubscribers.add(subscriber);

    // Return unsubscribe function
    return () => {
      this.allSubscribers.delete(subscriber);
    };
  }

  /**
   * Publish a message to all relevant subscribers
   */
  publish(message: EventBusMessage): void {
    // Add timestamp if not present
    if (!message.timestamp) {
      message.timestamp = Date.now();
    }

    // Store in history
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }

    // Notify type-specific subscribers
    const typeSubscribers = this.subscribers.get(message.type);
    if (typeSubscribers) {
      for (const subscriber of typeSubscribers) {
        try {
          subscriber(message);
        } catch (error) {
          console.debug('[PraxisEventBus] Subscriber error:', {
            messageType: message.type,
            sourceEngine: message.sourceEngine,
            connectionId: message.connectionId,
            subscriberCount: typeSubscribers.size,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // Notify all-message subscribers
    for (const subscriber of this.allSubscribers) {
      try {
        subscriber(message);
      } catch (error) {
        console.debug('[PraxisEventBus] All-subscriber error:', {
          messageType: message.type,
          sourceEngine: message.sourceEngine,
          allSubscriberCount: this.allSubscribers.size,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Emit a timer event
   */
  emitTimerEvent(
    type: 'timer:started' | 'timer:stopped' | 'timer:paused' | 'timer:resumed',
    payload: Record<string, unknown>,
    connectionId?: string
  ): void {
    this.publish({
      type,
      payload,
      timestamp: Date.now(),
      sourceEngine: 'timer',
      connectionId,
    });
  }

  /**
   * Emit an auth event
   */
  emitAuthEvent(
    type: 'auth:success' | 'auth:failed' | 'auth:logout',
    payload: Record<string, unknown>,
    connectionId: string
  ): void {
    this.publish({
      type,
      payload,
      timestamp: Date.now(),
      sourceEngine: 'auth',
      connectionId,
    });
  }

  /**
   * Emit a connection event
   */
  emitConnectionEvent(
    type: 'connection:connected' | 'connection:disconnected' | 'connection:error',
    payload: Record<string, unknown>,
    connectionId: string
  ): void {
    this.publish({
      type,
      payload,
      timestamp: Date.now(),
      sourceEngine: 'connection',
      connectionId,
    });
  }

  /**
   * Emit an application event
   */
  emitApplicationEvent(
    type:
      | 'app:activated'
      | 'app:deactivated'
      | 'app:error'
      | 'workitems:loaded'
      | 'workitems:error',
    payload: Record<string, unknown>,
    connectionId?: string
  ): void {
    this.publish({
      type,
      payload,
      timestamp: Date.now(),
      sourceEngine: 'application',
      connectionId,
    });
  }

  /**
   * Get message history
   */
  getHistory(): EventBusMessage[] {
    return [...this.messageHistory];
  }

  /**
   * Get history for a specific connection
   */
  getConnectionHistory(connectionId: string): EventBusMessage[] {
    return this.messageHistory.filter((m) => m.connectionId === connectionId);
  }

  /**
   * Get history for a specific source engine
   */
  getEngineHistory(engine: 'timer' | 'auth' | 'connection' | 'application'): EventBusMessage[] {
    return this.messageHistory.filter((m) => m.sourceEngine === engine);
  }

  /**
   * Clear all subscribers
   */
  clear(): void {
    this.subscribers.clear();
    this.allSubscribers.clear();
    this.messageHistory = [];
  }

  /**
   * Get subscriber count for debugging
   */
  getSubscriberCount(): { byType: Record<string, number>; all: number } {
    const byType: Record<string, number> = {};
    for (const [type, subs] of this.subscribers) {
      byType[type] = subs.size;
    }
    return {
      byType,
      all: this.allSubscribers.size,
    };
  }
}

// Singleton instance
let eventBusInstance: PraxisEventBus | undefined;

/**
 * Get or create the global event bus instance
 */
export function getPraxisEventBus(): PraxisEventBus {
  if (!eventBusInstance) {
    eventBusInstance = new PraxisEventBus();
  }
  return eventBusInstance;
}

/**
 * Reset the event bus (for testing)
 */
export function resetPraxisEventBus(): void {
  eventBusInstance?.clear();
  eventBusInstance = undefined;
}
