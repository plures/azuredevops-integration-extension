/**
 * PraxisDB Adapter
 *
 * Provides a minimal adapter layer for PluresDB integration.
 * This module defines the core interface and an in-memory implementation.
 */

/**
 * Function to unsubscribe from a watch
 */
export type UnsubscribeFn = () => void;

/**
 * Core database interface for Praxis
 *
 * Provides a minimal API for get/set/watch operations.
 * Can be backed by in-memory storage or PluresDB.
 */
export interface PraxisDB {
  /**
   * Get a value by key
   * @param key The key to retrieve
   * @returns The value or undefined if not found
   */
  get<T>(key: string): Promise<T | undefined>;

  /**
   * Set a value by key
   * @param key The key to set
   * @param value The value to store
   */
  set<T>(key: string, value: T): Promise<void>;

  /**
   * Watch a key for changes
   * @param key The key to watch
   * @param callback Called when the value changes
   * @returns Function to unsubscribe from updates
   */
  watch<T>(key: string, callback: (val: T) => void): UnsubscribeFn;
}

/**
 * In-memory implementation of PraxisDB
 *
 * Provides a simple in-memory store for development and testing.
 * Suitable for proxying to PluresDB later.
 */
export class InMemoryPraxisDB implements PraxisDB {
  private store = new Map<string, unknown>();
  private watchers = new Map<string, Set<(val: unknown) => void>>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.store.get(key) as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);

    // Notify watchers
    const keyWatchers = this.watchers.get(key);
    if (keyWatchers) {
      for (const callback of keyWatchers) {
        callback(value);
      }
    }
  }

  watch<T>(key: string, callback: (val: T) => void): UnsubscribeFn {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, new Set());
    }

    const watchers = this.watchers.get(key)!;
    const wrappedCallback = (val: unknown) => callback(val as T);
    watchers.add(wrappedCallback);

    // Return unsubscribe function
    return () => {
      watchers.delete(wrappedCallback);
      if (watchers.size === 0) {
        this.watchers.delete(key);
      }
    };
  }

  /**
   * Get all keys (for testing/debugging)
   */
  keys(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.store.clear();
    this.watchers.clear();
  }
}

/**
 * Create a new in-memory PraxisDB instance
 *
 * @returns InMemoryPraxisDB instance
 *
 * @example
 * ```typescript
 * const db = createInMemoryDB();
 * await db.set('user:1', { name: 'Alice' });
 * const user = await db.get('user:1');
 * ```
 */
export function createInMemoryDB(): InMemoryPraxisDB {
  return new InMemoryPraxisDB();
}

/**
 * PluresDB instance type - represents either PluresNode or SQLiteCompatibleAPI
 */
export type PluresDBInstance = {
  get(key: string): Promise<any>;
  put(key: string, value: any): Promise<void>;
};

/**
 * Configuration options for PluresDBPraxisAdapter
 */
export interface PluresDBAdapterConfig {
  /** PluresDB instance */
  db: PluresDBInstance;
  /** Polling interval in milliseconds for watch functionality (default: 1000ms) */
  pollInterval?: number;
}

/**
 * PluresDB-backed implementation of PraxisDB
 *
 * Wraps the official PluresDB package from NPM to provide
 * the PraxisDB interface for production use.
 */
export class PluresDBPraxisAdapter implements PraxisDB {
  private db: PluresDBInstance;
  private watchers = new Map<string, Set<(val: unknown) => void>>();
  private pollIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private lastValues = new Map<string, unknown>();
  private pollInterval: number;

  constructor(config: PluresDBAdapterConfig | PluresDBInstance) {
    // Support both old API (direct db instance) and new config API
    if ('get' in config && 'put' in config) {
      this.db = config;
      this.pollInterval = 1000;
    } else {
      this.db = config.db;
      this.pollInterval = config.pollInterval ?? 1000;
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.db.get(key);
      return value as T | undefined;
    } catch (error) {
      // PluresDB returns undefined/null for missing keys
      return undefined;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.db.put(key, value);

    // Update last known value
    this.lastValues.set(key, value);

    // Notify watchers
    const keyWatchers = this.watchers.get(key);
    if (keyWatchers) {
      for (const callback of keyWatchers) {
        callback(value);
      }
    }
  }

  watch<T>(key: string, callback: (val: T) => void): UnsubscribeFn {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, new Set());
    }

    const watchers = this.watchers.get(key)!;
    const wrappedCallback = (val: unknown) => callback(val as T);
    watchers.add(wrappedCallback);

    // Set up polling for this key if not already set up
    if (!this.pollIntervals.has(key)) {
      const interval = setInterval(async () => {
        try {
          const value = await this.db.get(key);
          const lastValue = this.lastValues.get(key);
          
          // Only notify if value has actually changed
          if (JSON.stringify(value) !== JSON.stringify(lastValue)) {
            this.lastValues.set(key, value);
            const currentWatchers = this.watchers.get(key);
            if (currentWatchers) {
              for (const cb of currentWatchers) {
                cb(value);
              }
            }
          }
        } catch (error) {
          // Ignore errors in polling
        }
      }, this.pollInterval);

      this.pollIntervals.set(key, interval);
    }

    // Return unsubscribe function
    return () => {
      watchers.delete(wrappedCallback);
      if (watchers.size === 0) {
        this.watchers.delete(key);
        // Clean up polling interval
        const interval = this.pollIntervals.get(key);
        if (interval) {
          clearInterval(interval);
          this.pollIntervals.delete(key);
        }
        // Clean up last value cache
        this.lastValues.delete(key);
      }
    };
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    // Clear all polling intervals
    for (const interval of this.pollIntervals.values()) {
      clearInterval(interval);
    }
    this.pollIntervals.clear();
    this.watchers.clear();
    this.lastValues.clear();
  }
}

/**
 * Create a PluresDB-backed PraxisDB instance
 *
 * Wraps the official PluresDB package from NPM.
 *
 * @param config PluresDB instance or configuration object
 * @returns PluresDBPraxisAdapter instance
 *
 * @example
 * ```typescript
 * import { PluresNode } from 'pluresdb';
 * import { createPluresDB } from '@plures/praxis';
 *
 * const pluresdb = new PluresNode({ autoStart: true });
 * const db = createPluresDB(pluresdb);
 *
 * await db.set('user:1', { name: 'Alice' });
 * const user = await db.get('user:1');
 * ```
 *
 * @example
 * ```typescript
 * // With custom polling interval
 * const db = createPluresDB({
 *   db: pluresdb,
 *   pollInterval: 500, // Poll every 500ms
 * });
 * ```
 */
export function createPluresDB(config: PluresDBAdapterConfig | PluresDBInstance): PluresDBPraxisAdapter {
  return new PluresDBPraxisAdapter(config);
}
