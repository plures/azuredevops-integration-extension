/**
 * PSF Schema Sync Engine
 *
 * Provides real-time bidirectional synchronization between
 * Code ↔ PSF Schema ↔ Canvas using PluresDB as the sync backend.
 *
 * The sync engine ensures that:
 * 1. Schema changes propagate to all connected clients in real-time
 * 2. Conflicts are resolved using CRDT-style last-write-wins with metadata
 * 3. Code and canvas stay synchronized through the schema
 */

import type { PSFSchema, PSFPosition } from '../schema-engine/psf.js';
import type { PraxisDB, UnsubscribeFn } from '../../src/core/pluresdb/adapter.js';

/**
 * Schema sync options
 */
export interface SchemaSyncOptions {
  /** Database instance */
  db: PraxisDB;
  /** Schema ID to sync */
  schemaId: string;
  /** Auto-sync interval in milliseconds (0 = disabled) */
  syncInterval?: number;
  /** Device/client identifier */
  deviceId?: string;
}

/**
 * Schema change event
 */
export interface SchemaChangeEvent {
  /** Type of change */
  type: 'update' | 'delete' | 'add';
  /** Path to changed element */
  path: string;
  /** Old value */
  oldValue?: unknown;
  /** New value */
  newValue?: unknown;
  /** Timestamp */
  timestamp: number;
  /** Device that made the change */
  deviceId?: string;
}

/**
 * Sync status
 */
export interface SyncStatus {
  /** Is currently syncing */
  syncing: boolean;
  /** Last sync timestamp */
  lastSync?: number;
  /** Pending changes count */
  pendingChanges: number;
  /** Connected devices */
  connectedDevices?: string[];
  /** Sync errors */
  errors: string[];
}

/**
 * Schema Sync Engine
 *
 * Manages real-time synchronization of PSF schemas.
 */
export class SchemaSyncEngine {
  private db: PraxisDB;
  private schemaId: string;
  private deviceId: string;
  private syncInterval: number;
  private schema: PSFSchema | null = null;
  private subscribers: Set<(schema: PSFSchema) => void> = new Set();
  private changeSubscribers: Set<(change: SchemaChangeEvent) => void> = new Set();
  private unsubscribeDb: UnsubscribeFn | null = null;
  private pendingChanges: SchemaChangeEvent[] = [];
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private lastSync: number = 0;

  constructor(options: SchemaSyncOptions) {
    this.db = options.db;
    this.schemaId = options.schemaId;
    this.deviceId = options.deviceId || this.generateDeviceId();
    this.syncInterval = options.syncInterval ?? 0;
  }

  /**
   * Initialize the sync engine
   */
  async initialize(): Promise<void> {
    // Load initial schema from DB
    const schemaPath = this.getSchemaPath();
    const storedSchema = await this.db.get(schemaPath);

    if (storedSchema) {
      this.schema = storedSchema as PSFSchema;
    }

    // Subscribe to DB changes
    this.unsubscribeDb = this.db.watch(schemaPath, (value: unknown) => {
      if (value) {
        const newSchema = value as PSFSchema;
        const oldSchema = this.schema;
        this.schema = newSchema;

        // Notify subscribers
        this.notifySubscribers();

        // Generate change events
        if (oldSchema) {
          this.emitChangeEvents(oldSchema, newSchema);
        }
      }
    });

    // Start auto-sync if enabled
    if (this.syncInterval > 0) {
      this.startAutoSync();
    }
  }

  /**
   * Get current schema
   */
  getSchema(): PSFSchema | null {
    return this.schema ? { ...this.schema } : null;
  }

  /**
   * Update the entire schema
   */
  async updateSchema(schema: PSFSchema): Promise<void> {
    const now = Date.now();
    const updatedSchema: PSFSchema = {
      ...schema,
      modifiedAt: new Date(now).toISOString(),
    };

    await this.db.set(this.getSchemaPath(), updatedSchema);
    this.lastSync = now;
  }

  /**
   * Update a specific part of the schema
   */
  async updatePart<K extends keyof PSFSchema>(key: K, value: PSFSchema[K]): Promise<void> {
    if (!this.schema) {
      throw new Error('Schema not loaded');
    }

    const updatedSchema: PSFSchema = {
      ...this.schema,
      [key]: value,
      modifiedAt: new Date().toISOString(),
    };

    await this.updateSchema(updatedSchema);
  }

  /**
   * Update node position (for canvas sync)
   */
  async updateNodePosition(
    nodeType: 'facts' | 'events' | 'rules' | 'constraints' | 'models' | 'components',
    nodeId: string,
    position: PSFPosition
  ): Promise<void> {
    if (!this.schema) {
      throw new Error('Schema not loaded');
    }

    const nodes = this.schema[nodeType] as Array<{ id: string; position?: PSFPosition }>;
    const nodeIndex = nodes.findIndex((n) => n.id === nodeId);

    if (nodeIndex === -1) {
      throw new Error(`Node ${nodeId} not found in ${nodeType}`);
    }

    const updatedNodes = [...nodes];
    updatedNodes[nodeIndex] = {
      ...updatedNodes[nodeIndex],
      position,
    };

    await this.updatePart(nodeType, updatedNodes as PSFSchema[typeof nodeType]);
  }

  /**
   * Subscribe to schema changes
   */
  subscribe(callback: (schema: PSFSchema) => void): UnsubscribeFn {
    this.subscribers.add(callback);

    // Send current schema immediately
    if (this.schema) {
      callback(this.schema);
    }

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Subscribe to individual change events
   */
  subscribeToChanges(callback: (change: SchemaChangeEvent) => void): UnsubscribeFn {
    this.changeSubscribers.add(callback);
    return () => {
      this.changeSubscribers.delete(callback);
    };
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return {
      syncing: false, // Would be true during active sync
      lastSync: this.lastSync || undefined,
      pendingChanges: this.pendingChanges.length,
      errors: [],
    };
  }

  /**
   * Force sync
   */
  async forceSync(): Promise<void> {
    if (!this.schema) return;

    // Re-read from DB to ensure we have latest
    const schemaPath = this.getSchemaPath();
    const latestSchema = await this.db.get(schemaPath);

    if (latestSchema) {
      this.schema = latestSchema as PSFSchema;
      this.notifySubscribers();
    }

    this.lastSync = Date.now();
    this.pendingChanges = [];
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.unsubscribeDb) {
      this.unsubscribeDb();
      this.unsubscribeDb = null;
    }

    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    this.subscribers.clear();
    this.changeSubscribers.clear();
  }

  /**
   * Get path for schema in DB
   */
  private getSchemaPath(): string {
    return `/schemas/${this.schemaId}`;
  }

  /**
   * Notify all subscribers
   */
  private notifySubscribers(): void {
    if (!this.schema) return;

    for (const callback of this.subscribers) {
      try {
        callback(this.schema);
      } catch (error) {
        console.error('Error in schema subscriber:', error);
      }
    }
  }

  /**
   * Emit change events by comparing schemas
   */
  private emitChangeEvents(oldSchema: PSFSchema, newSchema: PSFSchema): void {
    // Simple diff for now - could be made more granular
    const changes: SchemaChangeEvent[] = [];
    const now = Date.now();

    const keys: (keyof PSFSchema)[] = [
      'facts',
      'events',
      'rules',
      'constraints',
      'models',
      'components',
      'flows',
    ];

    for (const key of keys) {
      const oldArray = oldSchema[key] as unknown[];
      const newArray = newSchema[key] as unknown[];

      if (JSON.stringify(oldArray) !== JSON.stringify(newArray)) {
        changes.push({
          type: 'update',
          path: key,
          oldValue: oldArray,
          newValue: newArray,
          timestamp: now,
          deviceId: this.deviceId,
        });
      }
    }

    // Emit changes
    for (const change of changes) {
      for (const callback of this.changeSubscribers) {
        try {
          callback(change);
        } catch (error) {
          console.error('Error in change subscriber:', error);
        }
      }
    }
  }

  /**
   * Start auto-sync timer
   */
  private startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      this.forceSync().catch((error) => {
        console.error('Auto-sync error:', error);
      });
    }, this.syncInterval);
  }

  /**
   * Generate a device ID
   */
  private generateDeviceId(): string {
    return `device_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  }
}

/**
 * Create a schema sync engine
 */
export function createSchemaSyncEngine(options: SchemaSyncOptions): SchemaSyncEngine {
  return new SchemaSyncEngine(options);
}

/**
 * Schema store for PluresDB
 *
 * Provides a higher-level API for storing and managing PSF schemas.
 */
export class PSFSchemaStore {
  private db: PraxisDB;
  private syncEngines: Map<string, SchemaSyncEngine> = new Map();

  constructor(db: PraxisDB) {
    this.db = db;
  }

  /**
   * Save a schema
   */
  async saveSchema(schema: PSFSchema): Promise<void> {
    const path = `/schemas/${schema.id}`;
    await this.db.set(path, schema);
  }

  /**
   * Load a schema by ID
   */
  async loadSchema(schemaId: string): Promise<PSFSchema | null> {
    const path = `/schemas/${schemaId}`;
    const data = await this.db.get(path);
    return data as PSFSchema | null;
  }

  /**
   * List all schemas
   */
  async listSchemas(): Promise<string[]> {
    const schemasPath = '/schemas';
    const data = await this.db.get(schemasPath);

    if (data && typeof data === 'object') {
      return Object.keys(data);
    }

    return [];
  }

  /**
   * Delete a schema
   */
  async deleteSchema(schemaId: string): Promise<void> {
    const path = `/schemas/${schemaId}`;
    await this.db.set(path, null);

    // Dispose sync engine if exists
    const syncEngine = this.syncEngines.get(schemaId);
    if (syncEngine) {
      syncEngine.dispose();
      this.syncEngines.delete(schemaId);
    }
  }

  /**
   * Get or create a sync engine for a schema
   */
  async getSyncEngine(
    schemaId: string,
    options?: Partial<SchemaSyncOptions>
  ): Promise<SchemaSyncEngine> {
    if (this.syncEngines.has(schemaId)) {
      return this.syncEngines.get(schemaId)!;
    }

    const syncEngine = new SchemaSyncEngine({
      db: this.db,
      schemaId,
      ...options,
    });

    await syncEngine.initialize();
    this.syncEngines.set(schemaId, syncEngine);

    return syncEngine;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    for (const syncEngine of this.syncEngines.values()) {
      syncEngine.dispose();
    }
    this.syncEngines.clear();
  }
}

/**
 * Create a PSF schema store
 */
export function createPSFSchemaStore(db: PraxisDB): PSFSchemaStore {
  return new PSFSchemaStore(db);
}
