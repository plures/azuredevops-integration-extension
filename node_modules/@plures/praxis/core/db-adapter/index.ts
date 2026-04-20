/**
 * Praxis DB Adapter
 *
 * The DB Adapter module provides integration with PluresDB
 * for local-first, reactive data storage and synchronization.
 *
 * Features:
 * - Schema-backed storage
 * - Real-time synchronization
 * - CRDT-style conflict resolution
 * - Event sourcing
 */

// Re-export core PluresDB adapter
export {
  InMemoryPraxisDB,
  createInMemoryDB,
  type PraxisDB,
  type UnsubscribeFn,
} from '../../src/core/pluresdb/adapter.js';

// Re-export store
export {
  PraxisDBStore,
  createPraxisDBStore,
  PRAXIS_PATHS,
  getFactPath,
  getEventPath,
  generateId,
  type EventStreamEntry,
  type PraxisDBStoreOptions,
} from '../../src/core/pluresdb/store.js';

// Re-export schema registry
export {
  PraxisSchemaRegistry,
  createSchemaRegistry,
  registerSchema,
  getSchemaPath,
  type StoredSchema,
} from '../../src/core/pluresdb/schema-registry.js';

// Re-export generator
export {
  PluresDBGenerator,
  createPluresDBGenerator,
  type PluresDBGeneratorOptions,
  type GeneratedPluresDBFile,
} from '../../src/core/pluresdb/generator.js';

// Export new PSF-aware sync engine
export * from './sync-engine.js';
