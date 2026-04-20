/**
 * Unified Integration Helpers
 *
 * Convenience functions for setting up Praxis with all ecosystem integrations
 * (PluresDB, Unum, State-Docs, CodeCanvas) in a single call.
 */

import type { LogicEngine } from '../core/engine.js';
import type { PraxisRegistry, PraxisModule } from '../core/rules.js';
import type { PraxisSchema } from '../core/schema/types.js';
import type { PraxisDB, UnsubscribeFn } from '../core/pluresdb/adapter.js';
import type { UnumIdentity } from './unum.js';
import {
  createPluresDBAdapter,
  generateId,
  type PluresDBAdapter,
} from './pluresdb.js';
import {
  createUnumAdapter,
  attachUnumToEngine,
  type UnumAdapter,
  type UnumChannel,
} from './unum.js';
import {
  createStateDocsGenerator,
  type StateDocsGenerator,
  type GeneratedDoc,
} from './state-docs.js';
import {
  schemaToCanvas,
  type CanvasDocument,
} from './code-canvas.js';

/**
 * Configuration for unified Praxis application
 */
export interface UnifiedAppConfig<TContext = unknown> {
  /** Praxis registry with rules and constraints */
  registry: PraxisRegistry<TContext>;

  /** Initial context for the engine */
  initialContext: TContext;

  /** PluresDB instance (if not provided, creates in-memory DB) */
  db?: PraxisDB;

  /** Enable Unum for distributed communication */
  enableUnum?: boolean;

  /** Unum identity configuration (without id and createdAt which are auto-generated) */
  unumIdentity?: Omit<UnumIdentity, 'id' | 'createdAt'>;

  /** Enable State-Docs documentation generation */
  enableDocs?: boolean;

  /** State-Docs configuration */
  docsConfig?: {
    projectTitle: string;
    target?: string;
  };

  /** Praxis schema for CodeCanvas integration */
  schema?: PraxisSchema;
}

/**
 * Unified application instance with all integrations
 */
export interface UnifiedApp<TContext = unknown> {
  /** Praxis logic engine */
  engine: LogicEngine<TContext>;

  /** PluresDB adapter for persistence */
  pluresdb: PluresDBAdapter<TContext>;

  /** Unum adapter for distributed communication (if enabled) */
  unum?: UnumAdapter;

  /** Default Unum channel (if Unum enabled) */
  channel?: UnumChannel;

  /** State-Docs generator (if enabled) */
  docs?: StateDocsGenerator;

  /** CodeCanvas document (if schema provided) */
  canvas?: CanvasDocument;

  /** Generate documentation from current state */
  generateDocs?: () => GeneratedDoc[];

  /** Cleanup function to dispose all integrations */
  dispose: () => void;
}

/**
 * Create a unified Praxis application with all integrations
 *
 * This is a convenience function that sets up:
 * - Praxis logic engine
 * - PluresDB for persistence (auto-attaches to engine)
 * - Unum for distributed communication (optional)
 * - State-Docs for documentation generation (optional)
 * - CodeCanvas for visual schema editing (optional)
 *
 * @example
 * ```typescript
 * import { createUnifiedApp } from '@plures/praxis';
 *
 * const app = await createUnifiedApp({
 *   registry: myRegistry,
 *   initialContext: { count: 0 },
 *   enableUnum: true,
 *   unumIdentity: { name: 'node-1' },
 *   enableDocs: true,
 *   docsConfig: { projectTitle: 'My App' },
 *   schema: mySchema,
 * });
 *
 * // Use the engine
 * app.engine.step([myEvent]);
 *
 * // Broadcast to other nodes
 * if (app.channel) {
 *   await app.unum?.broadcastEvent(app.channel.id, myEvent);
 * }
 *
 * // Generate documentation
 * const docs = app.generateDocs?.();
 *
 * // Cleanup
 * app.dispose();
 * ```
 */
export async function createUnifiedApp<TContext = unknown>(
  config: UnifiedAppConfig<TContext>
): Promise<UnifiedApp<TContext>> {
  const { createPraxisEngine } = await import('../core/engine.js');
  const { createInMemoryDB } = await import('../core/pluresdb/adapter.js');

  // Create database if not provided
  const db = config.db || createInMemoryDB();

  // Create PluresDB adapter
  const pluresdb = createPluresDBAdapter({
    db,
    registry: config.registry,
    initialContext: config.initialContext,
  });

  // Create Praxis engine
  const engine = createPraxisEngine({
    initialContext: config.initialContext,
    registry: config.registry,
  });

  // Attach PluresDB to engine
  pluresdb.attachEngine(engine);

  const disposers: UnsubscribeFn[] = [];

  // Setup Unum if enabled
  let unum: UnumAdapter | undefined;
  let channel: UnumChannel | undefined;
  if (config.enableUnum) {
    // Convert partial identity to full identity if provided
    const fullIdentity: UnumIdentity | undefined = config.unumIdentity
      ? {
          ...config.unumIdentity,
          id: generateId(),
          createdAt: Date.now(),
        }
      : undefined;

    unum = await createUnumAdapter({
      db,
      identity: fullIdentity,
      realtime: true,
    });

    // Create default channel
    channel = await unum.createChannel(
      config.unumIdentity?.name || 'praxis-app',
      []
    );

    // Attach Unum to engine
    const unumDisposer = attachUnumToEngine(engine, unum, channel.id);
    disposers.push(unumDisposer);
  }

  // Setup State-Docs if enabled
  let docs: StateDocsGenerator | undefined;
  let generateDocs: (() => GeneratedDoc[]) | undefined;
  if (config.enableDocs && config.docsConfig) {
    docs = createStateDocsGenerator({
      projectTitle: config.docsConfig.projectTitle,
      target: config.docsConfig.target || './docs',
    });

    generateDocs = () => {
      // Get rules and constraints from registry
      const module: PraxisModule<TContext> = {
        rules: config.registry.getAllRules(),
        constraints: config.registry.getAllConstraints(),
      };
      return docs!.generateFromModule(module);
    };
  }

  // Setup CodeCanvas if schema provided
  let canvas: CanvasDocument | undefined;
  if (config.schema) {
    // Convert PraxisSchema to PSFSchema format expected by schemaToCanvas
    // Both types are structurally compatible, so we can safely cast
    canvas = schemaToCanvas(config.schema as unknown as import('../../core/schema-engine/psf.js').PSFSchema, { layout: 'hierarchical' });
  }

  return {
    engine,
    pluresdb,
    unum,
    channel,
    docs,
    canvas,
    generateDocs,
    dispose: () => {
      pluresdb.dispose();
      if (unum) {
        // Disconnect from Unum, log errors during cleanup
        unum.disconnect().catch((err) => {
          console.warn('Warning: Error during Unum disconnect:', err);
        });
      }
      for (const disposer of disposers) {
        disposer();
      }
    },
  };
}

/**
 * Attach all available integrations to an existing Praxis engine
 *
 * This is useful when you already have an engine and want to add integrations.
 *
 * @example
 * ```typescript
 * import { createPraxisEngine, attachAllIntegrations } from '@plures/praxis';
 *
 * const engine = createPraxisEngine({ initialContext: {}, registry });
 *
 * const integrations = await attachAllIntegrations(engine, registry, {
 *   enableUnum: true,
 *   enableDocs: true,
 * });
 *
 * // Later cleanup
 * integrations.dispose();
 * ```
 */
export async function attachAllIntegrations<TContext = unknown>(
  engine: LogicEngine<TContext>,
  registry: PraxisRegistry<TContext>,
  options: {
    db?: PraxisDB;
    enableUnum?: boolean;
    unumIdentity?: Omit<UnumIdentity, 'id' | 'createdAt'>;
    enableDocs?: boolean;
    docsConfig?: { projectTitle: string; target?: string };
  } = {}
): Promise<{
  pluresdb: PluresDBAdapter<TContext>;
  unum?: UnumAdapter;
  channel?: UnumChannel;
  docs?: StateDocsGenerator;
  dispose: () => void;
}> {
  const { createInMemoryDB } = await import('../core/pluresdb/adapter.js');

  // Create database if not provided
  const db = options.db || createInMemoryDB();

  // Create PluresDB adapter
  const pluresdb = createPluresDBAdapter({
    db,
    registry,
    initialContext: engine.getContext(),
  });

  // Attach PluresDB to engine
  pluresdb.attachEngine(engine);

  const disposers: UnsubscribeFn[] = [];

  // Setup Unum if enabled
  let unum: UnumAdapter | undefined;
  let channel: UnumChannel | undefined;
  if (options.enableUnum) {
    // Convert partial identity to full identity if provided
    const fullIdentity: UnumIdentity | undefined = options.unumIdentity
      ? {
          ...options.unumIdentity,
          id: generateId(),
          createdAt: Date.now(),
        }
      : undefined;

    unum = await createUnumAdapter({
      db,
      identity: fullIdentity,
      realtime: true,
    });

    channel = await unum.createChannel(
      options.unumIdentity?.name || 'praxis-app',
      []
    );

    const unumDisposer = attachUnumToEngine(engine, unum, channel.id);
    disposers.push(unumDisposer);
  }

  // Setup State-Docs if enabled
  let docs: StateDocsGenerator | undefined;
  if (options.enableDocs && options.docsConfig) {
    docs = createStateDocsGenerator({
      projectTitle: options.docsConfig.projectTitle,
      target: options.docsConfig.target || './docs',
    });
  }

  return {
    pluresdb,
    unum,
    channel,
    docs,
    dispose: () => {
      pluresdb.dispose();
      if (unum) {
        // Disconnect from Unum, log errors during cleanup
        unum.disconnect().catch((err) => {
          console.warn('Warning: Error during Unum disconnect:', err);
        });
      }
      for (const disposer of disposers) {
        disposer();
      }
    },
  };
}
