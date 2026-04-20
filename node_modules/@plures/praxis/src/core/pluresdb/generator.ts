/**
 * PluresDB Config Generator
 *
 * Generates PluresDB configuration from schema definitions.
 */

import type { NormalizedSchema, NormalizedModel } from '../schema/normalize.js';

/**
 * PluresDB config generation options
 */
export interface PluresDBGeneratorOptions {
  /** Output directory */
  outputDir: string;
  /** Database name */
  dbName?: string;
  /** Database version */
  dbVersion?: number;
  /** Enable sync */
  enableSync?: boolean;
  /** Sync endpoint */
  syncEndpoint?: string;
  /** Auto-index strategy: 'all' indexes all string/number/date fields, 'explicit' only indexes fields defined in schema, 'none' disables auto-indexing */
  autoIndex?: 'all' | 'explicit' | 'none';
}

/**
 * Generated PluresDB config file
 */
export interface GeneratedPluresDBFile {
  /** File path */
  path: string;
  /** File content */
  content: string;
  /** File type */
  type: 'config' | 'types';
}

/**
 * PluresDB store definition
 */
interface StoreDefinition {
  keyPath: string;
  indexes: string[];
}

/**
 * PluresDB generator class
 */
export class PluresDBGenerator {
  private options: PluresDBGeneratorOptions;

  constructor(options: PluresDBGeneratorOptions) {
    this.options = {
      dbVersion: 1,
      enableSync: false,
      autoIndex: 'all', // Default to indexing all fields for backward compatibility
      ...options,
    };
  }

  /**
   * Generate PluresDB configuration from schema
   */
  generateConfig(schema: NormalizedSchema): GeneratedPluresDBFile[] {
    const files: GeneratedPluresDBFile[] = [];

    // Generate the main config file
    files.push(this.generateConfigFile(schema));

    return files;
  }

  /**
   * Generate pluresdb-config.ts file
   */
  private generateConfigFile(schema: NormalizedSchema): GeneratedPluresDBFile {
    const lines: string[] = [];
    const dbName = this.options.dbName || schema.name.toLowerCase();

    lines.push('/**');
    lines.push(` * PluresDB Configuration for ${schema.name}`);
    lines.push(' * Generated from Praxis schema');
    lines.push(' */');
    lines.push('');

    // Import statement (for future PluresDB integration)
    lines.push("// import { createPluresDB } from '@plures/pluresdb';");
    lines.push('');

    // Generate store definitions
    lines.push('/**');
    lines.push(' * Database store configuration');
    lines.push(' * ');

    // Document indexing behavior based on configuration
    const autoIndexStrategy = this.options.autoIndex || 'all';
    if (autoIndexStrategy === 'all') {
      lines.push(' * Indexing: All string, number, and date fields are auto-indexed by default.');
      lines.push(' * For large datasets, consider using autoIndex: "explicit" to only index');
      lines.push(' * fields explicitly defined in the schema.');
    } else if (autoIndexStrategy === 'explicit') {
      lines.push(' * Indexing: Only fields explicitly defined in schema indexes are indexed.');
    } else if (autoIndexStrategy === 'none') {
      lines.push(' * Indexing: Auto-indexing disabled. Only explicit schema indexes are used.');
    }
    lines.push(' */');
    lines.push('export const stores = {');

    if (schema.models && schema.models.length > 0) {
      for (const model of schema.models) {
        const storeName = model.name.toLowerCase() + 's';
        const storeConfig = this.generateStoreConfig(model);

        lines.push(`  ${storeName}: {`);
        lines.push(`    keyPath: '${storeConfig.keyPath}',`);

        if (storeConfig.indexes.length > 0) {
          lines.push(`    indexes: [${storeConfig.indexes.map((idx) => `'${idx}'`).join(', ')}],`);
        }

        lines.push('  },');
      }
    } else {
      lines.push('  // No models defined in schema');
    }

    lines.push('};');
    lines.push('');

    // Generate main config
    lines.push('/**');
    lines.push(' * Database configuration');
    lines.push(' */');
    lines.push('export const dbConfig = {');
    lines.push(`  name: '${dbName}',`);
    lines.push(`  version: ${this.options.dbVersion},`);
    lines.push('  stores,');

    if (this.options.enableSync) {
      lines.push('  sync: {');
      lines.push('    enabled: true,');

      if (this.options.syncEndpoint) {
        lines.push(`    endpoint: '${this.options.syncEndpoint}',`);
      } else {
        lines.push("    endpoint: 'ws://localhost:8080/sync',");
      }

      lines.push("    conflictResolution: 'last-write-wins',");
      lines.push('  },');
    }

    lines.push('};');
    lines.push('');

    // Generate initialization function
    lines.push('/**');
    lines.push(' * Initialize PluresDB');
    lines.push(' * @returns Configured PluresDB instance');
    lines.push(' */');
    lines.push('export function initDB() {');
    lines.push('  // Create and configure PluresDB instance');
    lines.push('  const db = createInMemoryDB();');
    lines.push('  ');
    lines.push('  // Initialize stores based on configuration');
    lines.push('  for (const storeDef of dbConfig.stores) {');
    lines.push('    // Pre-create store paths');
    lines.push('    db.set(`stores/${storeDef.name}/_meta`, {');
    lines.push('      keyPath: storeDef.keyPath,');
    lines.push('      indexes: storeDef.indexes,');
    lines.push('      createdAt: Date.now(),');
    lines.push('    });');
    lines.push('  }');
    lines.push('  ');
    lines.push('  console.log(`PluresDB initialized: ${dbConfig.name}`);');
    lines.push('  return db;');
    lines.push('}');
    lines.push('');
    lines.push('/**');
    lines.push(' * Get store by name');
    lines.push(' */');
    lines.push(
      'export function getStore(db: ReturnType<typeof createInMemoryDB>, storeName: string) {'
    );
    lines.push('  const storeDef = dbConfig.stores.find(s => s.name === storeName);');
    lines.push('  if (!storeDef) {');
    lines.push('    throw new Error(`Store "${storeName}" not found in configuration`);');
    lines.push('  }');
    lines.push('  return {');
    lines.push('    get: (key: string) => db.get(`stores/${storeName}/${key}`),');
    lines.push(
      '    set: (key: string, value: unknown) => db.set(`stores/${storeName}/${key}`, value),'
    );
    lines.push('    delete: (key: string) => db.delete(`stores/${storeName}/${key}`),');
    lines.push('    watch: (key: string, callback: (data: unknown) => void) => ');
    lines.push('      db.watch(`stores/${storeName}/${key}`, callback),');
    lines.push('  };');
    lines.push('}');

    return {
      path: `${this.options.outputDir}/pluresdb-config.ts`,
      content: lines.join('\n'),
      type: 'config',
    };
  }

  /**
   * Generate store configuration for a model
   */
  private generateStoreConfig(model: NormalizedModel): StoreDefinition {
    // Find the ID field (or use 'id' as default)
    const idField = model.fields.find((f) => f.name === 'id' || f.name === '_id');
    const keyPath = idField ? idField.name : 'id';

    const indexes: string[] = [];

    // Apply auto-indexing based on configuration
    const autoIndexStrategy = this.options.autoIndex || 'all';

    if (autoIndexStrategy === 'all') {
      // Auto-index all string, number, and date fields for query performance
      for (const field of model.fields) {
        if (field.name !== keyPath) {
          if (field.type === 'string' || field.type === 'number' || field.type === 'date') {
            indexes.push(field.name);
          }
        }
      }
    }
    // For 'explicit' and 'none', we only add indexes explicitly defined in the schema

    // Always add indexes from schema index definitions (overrides auto-indexing)
    if (model.indexes) {
      for (const indexDef of model.indexes) {
        for (const fieldName of indexDef.fields) {
          if (!indexes.includes(fieldName) && fieldName !== keyPath) {
            indexes.push(fieldName);
          }
        }
      }
    }

    return {
      keyPath,
      indexes,
    };
  }
}

/**
 * Create a PluresDB generator
 */
export function createPluresDBGenerator(
  outputDir: string,
  options?: Partial<PluresDBGeneratorOptions>
): PluresDBGenerator {
  return new PluresDBGenerator({
    outputDir,
    ...options,
  });
}
