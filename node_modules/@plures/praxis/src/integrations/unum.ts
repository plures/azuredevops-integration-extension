/**
 * Unum Integration
 *
 * Integration with plures/unum - A modern Svelte binding library for PluresDB
 * with full Svelte 5 compatibility. Provides identity and channels support.
 *
 * Features:
 * - Svelte 4 & 5 Compatible: Works with both store-based and runes-based reactivity
 * - Type-Safe: Full TypeScript support with proper types
 * - Action-Based: Modern Svelte actions for DOM binding
 * - Store-Based: Writable store implementation for reactive data
 * - Collection Support: Easy handling of PluresDB collections
 *
 * @see https://github.com/plures/unum
 */

import type { LogicEngine } from '../core/engine.js';
import type { PraxisEvent, PraxisFact } from '../core/protocol.js';
import type { PraxisDB } from '../core/pluresdb/adapter.js';

/**
 * Unum store interface for reactive PluresDB data
 */
export interface UnumStore<T> {
  subscribe(run: (value: T) => void): () => void;
  set(value: T): void;
  update(updater: (value: T) => T): void;
}

/**
 * Unum channel for real-time communication
 */
export interface UnumChannel {
  /** Channel identifier */
  id: string;
  /** Channel name */
  name: string;
  /** Subscribe to channel messages */
  subscribe(handler: (message: UnumMessage) => void): () => void;
  /** Publish a message to the channel */
  publish(message: Omit<UnumMessage, 'timestamp' | 'channelId'>): Promise<void>;
  /** Get channel members */
  getMembers(): Promise<UnumIdentity[]>;
  /** Leave the channel */
  leave(): Promise<void>;
}

/**
 * Message sent through a Unum channel
 */
export interface UnumMessage {
  /** Message ID */
  id: string;
  /** Channel ID */
  channelId: string;
  /** Sender identity */
  sender: UnumIdentity;
  /** Message content */
  content: unknown;
  /** Message type */
  type: 'text' | 'event' | 'fact' | 'system';
  /** Timestamp */
  timestamp: number;
}

/**
 * Unum identity representing a user or system
 */
export interface UnumIdentity {
  /** Unique identifier */
  id: string;
  /** Display name */
  name?: string;
  /** Public key for encryption */
  publicKey?: string;
  /** Identity metadata */
  metadata?: Record<string, unknown>;
  /** Creation timestamp */
  createdAt: number;
  /** Last seen timestamp */
  lastSeen?: number;
}

/**
 * Unum adapter configuration
 */
export interface UnumAdapterConfig {
  /** PluresDB instance to use */
  db: PraxisDB;
  /** Current user identity */
  identity?: UnumIdentity;
  /** Whether to enable real-time sync */
  realtime?: boolean;
  /** Sync interval in milliseconds */
  syncInterval?: number;
}

/**
 * Unum adapter for Praxis engine integration
 *
 * Provides identity management and channel-based communication
 * for distributed Praxis applications.
 */
export interface UnumAdapter {
  /** Current identity */
  identity: UnumIdentity | null;

  /** Create or update identity */
  setIdentity(identity: Omit<UnumIdentity, 'id' | 'createdAt'>): Promise<UnumIdentity>;

  /** Get identity by ID */
  getIdentity(id: string): Promise<UnumIdentity | null>;

  /** Create a new channel */
  createChannel(name: string, members?: string[]): Promise<UnumChannel>;

  /** Join an existing channel */
  joinChannel(channelId: string): Promise<UnumChannel>;

  /** List available channels */
  listChannels(): Promise<UnumChannel[]>;

  /** Broadcast a Praxis event to a channel */
  broadcastEvent(channelId: string, event: PraxisEvent): Promise<void>;

  /** Broadcast a Praxis fact to a channel */
  broadcastFact(channelId: string, fact: PraxisFact): Promise<void>;

  /** Subscribe to events from a channel */
  subscribeToEvents(channelId: string, handler: (event: PraxisEvent) => void): () => void;

  /** Subscribe to facts from a channel */
  subscribeToFacts(channelId: string, handler: (fact: PraxisFact) => void): () => void;

  /** Disconnect and cleanup */
  disconnect(): Promise<void>;
}

/**
 * Create a Unum adapter for Praxis engine integration
 *
 * @example
 * ```typescript
 * import { createUnumAdapter } from '@plures/praxis/integrations/unum';
 * import { createInMemoryDB } from '@plures/praxis/integrations/pluresdb';
 *
 * const db = createInMemoryDB();
 * const unum = await createUnumAdapter({
 *   db,
 *   identity: {
 *     name: 'Alice',
 *   },
 *   realtime: true,
 * });
 *
 * // Create a channel
 * const channel = await unum.createChannel('my-channel');
 *
 * // Broadcast events to the channel
 * await unum.broadcastEvent(channel.id, myEvent);
 * ```
 */
export async function createUnumAdapter(config: UnumAdapterConfig): Promise<UnumAdapter> {
  const { db, realtime = true } = config;
  // syncInterval could be used for periodic sync in a more complete implementation

  let currentIdentity: UnumIdentity | null = null;
  const channels = new Map<string, UnumChannel>();
  const subscriptions = new Set<() => void>();

  // Set initial identity if provided
  if (config.identity) {
    currentIdentity = {
      ...config.identity,
      id: config.identity.id || generateId(),
      createdAt: Date.now(),
    };
    await db.set(`unum/identities/${currentIdentity.id}`, currentIdentity);
  }

  async function setIdentity(
    identity: Omit<UnumIdentity, 'id' | 'createdAt'>
  ): Promise<UnumIdentity> {
    currentIdentity = {
      ...identity,
      id: generateId(),
      createdAt: Date.now(),
    };
    await db.set(`unum/identities/${currentIdentity.id}`, currentIdentity);
    return currentIdentity;
  }

  async function getIdentity(id: string): Promise<UnumIdentity | null> {
    return (await db.get(`unum/identities/${id}`)) as UnumIdentity | null;
  }

  async function createChannel(name: string, members?: string[]): Promise<UnumChannel> {
    const channelId = generateId();
    const channelData = {
      id: channelId,
      name,
      members: members || [],
      createdAt: Date.now(),
      createdBy: currentIdentity?.id,
    };

    await db.set(`unum/channels/${channelId}`, channelData);

    const channel = createChannelInstance(channelId, name);
    channels.set(channelId, channel);
    return channel;
  }

  async function joinChannel(channelId: string): Promise<UnumChannel> {
    const existing = channels.get(channelId);
    if (existing) return existing;

    const channelData = (await db.get(`unum/channels/${channelId}`)) as {
      id: string;
      name: string;
    } | null;
    if (!channelData) {
      throw new Error(`Channel ${channelId} not found`);
    }

    const channel = createChannelInstance(channelData.id, channelData.name);
    channels.set(channelId, channel);
    return channel;
  }

  async function listChannels(): Promise<UnumChannel[]> {
    return Array.from(channels.values());
  }

  function createChannelInstance(id: string, name: string): UnumChannel {
    const handlers = new Set<(message: UnumMessage) => void>();

    return {
      id,
      name,
      subscribe(handler: (message: UnumMessage) => void): () => void {
        handlers.add(handler);

        // Set up database subscription if realtime is enabled
        if (realtime) {
          const unsub = db.watch(`unum/channels/${id}/messages`, (data) => {
            if (data) {
              handler(data as UnumMessage);
            }
          });
          subscriptions.add(unsub);
        }

        return () => {
          handlers.delete(handler);
        };
      },
      async publish(message: Omit<UnumMessage, 'timestamp' | 'channelId'>): Promise<void> {
        const fullMessage: UnumMessage = {
          ...message,
          id: message.id || generateId(),
          channelId: id,
          timestamp: Date.now(),
        };

        await db.set(`unum/channels/${id}/messages/${fullMessage.id}`, fullMessage);

        // Notify local handlers
        handlers.forEach((h) => h(fullMessage));
      },
      async getMembers(): Promise<UnumIdentity[]> {
        const channelData = (await db.get(`unum/channels/${id}`)) as { members?: string[] } | null;
        if (!channelData?.members) return [];

        const members: UnumIdentity[] = [];
        for (const memberId of channelData.members) {
          const identity = await getIdentity(memberId);
          if (identity) members.push(identity);
        }
        return members;
      },
      async leave(): Promise<void> {
        channels.delete(id);
      },
    };
  }

  async function broadcastEvent(channelId: string, event: PraxisEvent): Promise<void> {
    const channel = channels.get(channelId);
    if (!channel) {
      throw new Error(`Not joined to channel ${channelId}`);
    }

    await channel.publish({
      id: generateId(),
      sender: currentIdentity || { id: 'anonymous', createdAt: Date.now() },
      content: event,
      type: 'event',
    });
  }

  async function broadcastFact(channelId: string, fact: PraxisFact): Promise<void> {
    const channel = channels.get(channelId);
    if (!channel) {
      throw new Error(`Not joined to channel ${channelId}`);
    }

    await channel.publish({
      id: generateId(),
      sender: currentIdentity || { id: 'anonymous', createdAt: Date.now() },
      content: fact,
      type: 'fact',
    });
  }

  function subscribeToEvents(channelId: string, handler: (event: PraxisEvent) => void): () => void {
    const channel = channels.get(channelId);
    if (!channel) {
      throw new Error(`Not joined to channel ${channelId}`);
    }

    return channel.subscribe((message) => {
      if (message.type === 'event') {
        handler(message.content as PraxisEvent);
      }
    });
  }

  function subscribeToFacts(channelId: string, handler: (fact: PraxisFact) => void): () => void {
    const channel = channels.get(channelId);
    if (!channel) {
      throw new Error(`Not joined to channel ${channelId}`);
    }

    return channel.subscribe((message) => {
      if (message.type === 'fact') {
        handler(message.content as PraxisFact);
      }
    });
  }

  async function disconnect(): Promise<void> {
    // Cleanup all subscriptions
    subscriptions.forEach((unsub) => unsub());
    subscriptions.clear();

    // Leave all channels
    for (const channel of channels.values()) {
      await channel.leave();
    }
    channels.clear();

    currentIdentity = null;
  }

  return {
    get identity() {
      return currentIdentity;
    },
    setIdentity,
    getIdentity,
    createChannel,
    joinChannel,
    listChannels,
    broadcastEvent,
    broadcastFact,
    subscribeToEvents,
    subscribeToFacts,
    disconnect,
  };
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Attach Unum adapter to a Praxis engine
 *
 * Enables automatic event/fact broadcasting to connected channels.
 * This is a placeholder for future integration where the engine
 * would emit events that get broadcast to channels.
 *
 * @param _engine - The Praxis logic engine
 * @param _adapter - The Unum adapter
 * @param _channelId - The channel to broadcast to
 * @returns Cleanup function
 */
export function attachUnumToEngine<TContext>(
  _engine: LogicEngine<TContext>,
  _adapter: UnumAdapter,
  _channelId: string
): () => void {
  // In a future implementation, this would:
  // 1. Hook into engine state changes
  // 2. Broadcast new events/facts to the channel
  // For now, return a no-op cleanup function
  return () => {};
}
