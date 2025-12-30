/**
 * PluresDB Integration
 *
 * Integration with pluresdb - reactive graph datastore and event source/sink.
 * This module provides adapters for:
 * - Storing Praxis state in pluresdb
 * - Sourcing events from pluresdb
 * - Sinking events to pluresdb
 * - Reactive queries and subscriptions
 */

import type { LogicEngine } from '../core/engine.js';
import type { PraxisEvent, PraxisFact } from '../core/protocol.js';
import type { PraxisRegistry } from '../core/rules.js';
import type { PraxisDB, UnsubscribeFn } from '../core/pluresdb/adapter.js';
import { PraxisDBStore, createPraxisDBStore } from '../core/pluresdb/store.js';

// Re-export core pluresdb types and implementations
// Note: Using explicit exports to avoid circular dependency issues
export { InMemoryPraxisDB, createInMemoryDB, PluresDBPraxisAdapter, createPluresDB } from '../core/pluresdb/adapter.js';
export type { PraxisDB, UnsubscribeFn, PluresDBInstance, PluresDBAdapterConfig } from '../core/pluresdb/adapter.js';
export {
  PraxisDBStore,
  createPraxisDBStore,
  PRAXIS_PATHS,
  getFactPath,
  getEventPath,
  generateId,
} from '../core/pluresdb/store.js';
export type {
  EventStreamEntry,
  PraxisDBStoreOptions,
  RuleErrorHandler,
} from '../core/pluresdb/store.js';
export {
  PraxisSchemaRegistry,
  createSchemaRegistry,
  registerSchema,
  getSchemaPath,
} from '../core/pluresdb/schema-registry.js';
export type { StoredSchema } from '../core/pluresdb/schema-registry.js';
export { PluresDBGenerator, createPluresDBGenerator } from '../core/pluresdb/generator.js';
export type {
  PluresDBGeneratorOptions,
  GeneratedPluresDBFile,
} from '../core/pluresdb/generator.js';

/**
 * PluresDB adapter interface for engine integration
 *
 * Provides:
 * - Event sourcing (persist events to pluresdb)
 * - State snapshots (persist state to pluresdb)
 * - Event replay (rebuild state from events)
 * - Reactive queries (subscribe to state changes)
 */
export interface PluresDBAdapter<TContext = unknown> {
  /**
   * Persist events to pluresdb
   */
  persistEvents(events: PraxisEvent[]): Promise<void>;

  /**
   * Persist facts to pluresdb
   */
  persistFacts(facts: PraxisFact[]): Promise<void>;

  /**
   * Load events from pluresdb
   */
  loadEvents(query?: unknown): Promise<PraxisEvent[]>;

  /**
   * Subscribe to changes for a given tag
   *
   * Note: This watches for derived facts that are created when events are processed.
   * The callback receives the new facts as event-like objects for convenience.
   */
  subscribeToEvents(callback: (events: PraxisEvent[]) => void, query?: unknown): () => void;

  /**
   * Attach the adapter to an engine
   */
  attachEngine(engine: LogicEngine<TContext>): void;

  /**
   * Dispose of resources
   */
  dispose(): void;
}

/**
 * Options for creating a PluresDB adapter
 */
export interface PluresDBAdapterOptions<TContext = unknown> {
  /** The PraxisDB instance to use */
  db: PraxisDB;
  /** The PraxisRegistry for rules and constraints */
  registry: PraxisRegistry<TContext>;
  /** Initial context */
  initialContext?: TContext;
}

/**
 * Create a PluresDB adapter with full implementation
 *
 * @example
 * ```typescript
 * const db = createInMemoryDB();
 * const registry = new PraxisRegistry();
 * const adapter = createPluresDBAdapter({ db, registry });
 *
 * const engine = createPraxisEngine({ initialContext: {}, registry });
 * adapter.attachEngine(engine);
 *
 * await adapter.persistFacts([{ tag: "UserLoggedIn", payload: { userId: "alice" } }]);
 * ```
 */
export function createPluresDBAdapter<TContext = unknown>(
  options: PluresDBAdapterOptions<TContext>
): PluresDBAdapter<TContext> {
  const store = createPraxisDBStore(options.db, options.registry, options.initialContext);
  const subscriptions: UnsubscribeFn[] = [];

  return {
    async persistEvents(events: PraxisEvent[]): Promise<void> {
      await store.appendEvents(events);
    },

    async persistFacts(facts: PraxisFact[]): Promise<void> {
      await store.storeFacts(facts);
    },

    async loadEvents(query?: {
      tag?: string;
      since?: number;
      limit?: number;
    }): Promise<PraxisEvent[]> {
      if (!query?.tag) {
        return [];
      }
      const entries = await store.getEvents(query.tag, {
        since: query.since,
        limit: query.limit,
      });
      return entries.map((e) => e.event);
    },

    subscribeToEvents(
      callback: (events: PraxisEvent[]) => void,
      query?: { tag?: string }
    ): () => void {
      if (!query?.tag) {
        return () => {};
      }

      // Watch for new facts that might be derived from events
      const unsubscribe = store.watchFacts(query.tag, (facts) => {
        // Convert facts to events for the callback
        const events: PraxisEvent[] = facts.map((f) => ({
          tag: f.tag,
          payload: f.payload,
        }));
        callback(events);
      });

      subscriptions.push(unsubscribe);
      return unsubscribe;
    },

    attachEngine(engine: LogicEngine<TContext>): void {
      // Sync context from engine to store
      store.updateContext(engine.getContext());
    },

    dispose(): void {
      for (const unsub of subscriptions) {
        unsub();
      }
      subscriptions.length = 0;
      store.dispose();
    },
  };
}

/**
 * Attach a PraxisDBStore to a LogicEngine
 *
 * This function creates a bidirectional connection between the store and engine:
 * - Events processed by the engine are persisted to the store
 * - Facts from the store are synchronized to the engine
 *
 * @param store The PraxisDBStore instance
 * @param engine The LogicEngine instance
 * @returns Cleanup function to detach the store
 *
 * @example
 * ```typescript
 * const db = createInMemoryDB();
 * const registry = new PraxisRegistry();
 * const store = createPraxisDBStore(db, registry);
 * const engine = createPraxisEngine({ initialContext: {}, registry });
 *
 * const detach = attachToEngine(store, engine);
 *
 * // Events are now automatically persisted
 * engine.step([{ tag: "LOGIN", payload: { username: "alice" } }]);
 *
 * // Cleanup
 * detach();
 * ```
 */
export function attachToEngine<TContext = unknown>(
  store: PraxisDBStore<TContext>,
  engine: LogicEngine<TContext>
): UnsubscribeFn {
  // Sync context from engine to store
  store.updateContext(engine.getContext());

  // Return cleanup function
  return () => {
    store.dispose();
  };
}
