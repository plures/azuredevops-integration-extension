/**
 * Praxis Schema Registry for PluresDB
 *
 * Registers Praxis schema definitions in PluresDB for type-safe storage
 * and cross-agent schema discovery.
 */

import type { PraxisDB } from './adapter.js';
import type { PraxisSchema } from '../schema/types.js';
import { PRAXIS_PATHS } from './store.js';

/**
 * Get the path for a schema in PluresDB
 * @param schemaName The schema name
 */
export function getSchemaPath(schemaName: string): string {
  return `${PRAXIS_PATHS.SCHEMAS}/${schemaName}`;
}

/**
 * Stored schema entry with metadata
 */
export interface StoredSchema {
  /** The schema definition */
  schema: PraxisSchema;
  /** When the schema was registered */
  registeredAt: number;
  /** Schema version */
  version: string;
}

/**
 * PraxisSchemaRegistry
 *
 * Manages schema definitions in PluresDB.
 * Schemas are stored under `/_praxis/schemas/<schemaName>`
 */
export class PraxisSchemaRegistry {
  private db: PraxisDB;

  constructor(db: PraxisDB) {
    this.db = db;
  }

  /**
   * Register a schema in PluresDB
   *
   * @param schema The schema to register
   */
  async register(schema: PraxisSchema): Promise<void> {
    const path = getSchemaPath(schema.name);

    const storedSchema: StoredSchema = {
      schema,
      registeredAt: Date.now(),
      version: schema.version,
    };

    await this.db.set(path, storedSchema);
  }

  /**
   * Get a schema by name
   *
   * @param schemaName The schema name
   * @returns The stored schema or undefined if not found
   */
  async get(schemaName: string): Promise<StoredSchema | undefined> {
    const path = getSchemaPath(schemaName);
    return this.db.get<StoredSchema>(path);
  }

  /**
   * Check if a schema is registered
   *
   * @param schemaName The schema name
   * @returns True if the schema exists
   */
  async exists(schemaName: string): Promise<boolean> {
    const stored = await this.get(schemaName);
    return stored !== undefined;
  }

  /**
   * Update a schema (replaces existing)
   *
   * @param schema The updated schema
   */
  async update(schema: PraxisSchema): Promise<void> {
    await this.register(schema);
  }

  /**
   * List all registered schema names
   *
   * Implementation note: This method uses an index stored at `/_praxis/schemas/_index`.
   * When using InMemoryPraxisDB, schemas must be registered using `registerWithIndex()`
   * for them to appear in this listing. When using a full PluresDB implementation,
   * native listing capabilities should be used instead.
   *
   * @returns Array of registered schema names
   */
  async list(): Promise<string[]> {
    const indexPath = `${PRAXIS_PATHS.SCHEMAS}/_index`;
    const index = await this.db.get<string[]>(indexPath);
    return index ?? [];
  }

  /**
   * Register a schema and update the index
   *
   * @param schema The schema to register
   */
  async registerWithIndex(schema: PraxisSchema): Promise<void> {
    // Register the schema
    await this.register(schema);

    // Update the index
    const indexPath = `${PRAXIS_PATHS.SCHEMAS}/_index`;
    const existingIndex = (await this.db.get<string[]>(indexPath)) ?? [];

    if (!existingIndex.includes(schema.name)) {
      await this.db.set(indexPath, [...existingIndex, schema.name]);
    }
  }
}

/**
 * Register a schema in PluresDB
 *
 * Convenience function for one-off schema registration.
 *
 * @param db The PraxisDB instance
 * @param schema The schema to register
 *
 * @example
 * ```typescript
 * const db = createInMemoryDB();
 * await registerSchema(db, {
 *   version: "1.0.0",
 *   name: "MyApp",
 *   description: "My application schema"
 * });
 * ```
 */
export async function registerSchema(db: PraxisDB, schema: PraxisSchema): Promise<void> {
  const registry = new PraxisSchemaRegistry(db);
  await registry.registerWithIndex(schema);
}

/**
 * Create a PraxisSchemaRegistry instance
 *
 * @param db The PraxisDB instance
 * @returns PraxisSchemaRegistry instance
 */
export function createSchemaRegistry(db: PraxisDB): PraxisSchemaRegistry {
  return new PraxisSchemaRegistry(db);
}
