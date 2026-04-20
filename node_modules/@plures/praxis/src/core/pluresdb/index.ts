/**
 * PluresDB Integration Module
 *
 * This module exports all PluresDB-related types and functions for Praxis.
 * It provides the core adapter layer, store, and schema registry.
 */

// Adapter - Core interface and implementations (in-memory + PluresDB)
export type { PraxisDB, UnsubscribeFn, PluresDBInstance, PluresDBAdapterConfig } from './adapter.js';
export { InMemoryPraxisDB, createInMemoryDB, PluresDBPraxisAdapter, createPluresDB } from './adapter.js';

// Store - Manages facts, events, and reactive updates
export type { EventStreamEntry, PraxisDBStoreOptions, RuleErrorHandler } from './store.js';
export {
  PraxisDBStore,
  createPraxisDBStore,
  PRAXIS_PATHS,
  getFactPath,
  getEventPath,
  generateId,
} from './store.js';

// Schema Registry - Schema definitions in PluresDB
export type { StoredSchema } from './schema-registry.js';
export {
  PraxisSchemaRegistry,
  createSchemaRegistry,
  registerSchema,
  getSchemaPath,
} from './schema-registry.js';

// Config Generator - Generate PluresDB config from schemas
export type { PluresDBGeneratorOptions, GeneratedPluresDBFile } from './generator.js';
export { PluresDBGenerator, createPluresDBGenerator } from './generator.js';
