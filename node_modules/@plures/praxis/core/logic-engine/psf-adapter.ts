/**
 * PSF-Aware Logic Engine Adapter
 *
 * This module connects the logic engine to the Praxis Schema Format (PSF).
 * It enables schema-driven rule evaluation and constraint checking.
 */

import type { PSFSchema, PSFRule, PSFConstraint, PSFExpression } from '../schema-engine/psf.js';
import type { PraxisFact, PraxisEvent, PraxisState } from '../../src/core/protocol.js';
import type { RuleDescriptor, ConstraintDescriptor } from '../../src/core/rules.js';

/**
 * PSF Adapter options
 */
export interface PSFAdapterOptions {
  /** Enable expression caching */
  cacheExpressions?: boolean;
  /** Sandbox for expression evaluation */
  sandbox?: Record<string, unknown>;
}

/**
 * Compiled expression
 */
interface CompiledExpression {
  fn: Function;
  source: string;
}

/**
 * PSF Adapter for Logic Engine
 *
 * Converts PSF rules and constraints to logic engine format.
 */
export class PSFLogicAdapter {
  private options: Required<PSFAdapterOptions>;
  private expressionCache: Map<string, CompiledExpression> = new Map();
  private sandbox: Record<string, unknown>;

  constructor(options: PSFAdapterOptions = {}) {
    this.options = {
      cacheExpressions: options.cacheExpressions ?? true,
      sandbox: options.sandbox ?? {},
    };
    this.sandbox = { ...this.options.sandbox };
  }

  /**
   * Convert PSF rules to logic engine rule descriptors
   */
  convertRules<TContext = unknown>(rules: PSFRule[]): RuleDescriptor<TContext>[] {
    return rules.map((rule) => this.convertRule<TContext>(rule));
  }

  /**
   * Convert a single PSF rule to rule descriptor
   */
  convertRule<TContext = unknown>(rule: PSFRule): RuleDescriptor<TContext> {
    const whenFn = rule.when ? this.compileExpression(rule.when, ['state', 'events']) : null;
    const thenFn = this.compileExpression(rule.then, ['state', 'events']);

    return {
      id: rule.id,
      description: rule.description,
      meta: {
        triggers: rule.triggers,
        priority: rule.priority,
        ...rule.meta,
      },
      impl: (state: PraxisState & { context: TContext }, events: PraxisEvent[]): PraxisFact[] => {
        // Filter events by triggers if specified
        let filteredEvents = events;
        if (rule.triggers && rule.triggers.length > 0) {
          filteredEvents = events.filter((e) => rule.triggers!.includes(e.tag));
          if (filteredEvents.length === 0) {
            return [];
          }
        }

        // Check condition
        if (whenFn) {
          try {
            const conditionResult = whenFn.fn.call(this.sandbox, state, filteredEvents);
            if (!conditionResult) {
              return [];
            }
          } catch (error) {
            console.error(`Error evaluating rule condition "${rule.id}":`, error);
            return [];
          }
        }

        // Execute action
        try {
          const result = thenFn.fn.call(this.sandbox, state, filteredEvents);
          if (Array.isArray(result)) {
            return result;
          }
          return [];
        } catch (error) {
          console.error(`Error executing rule action "${rule.id}":`, error);
          return [];
        }
      },
    };
  }

  /**
   * Convert PSF constraints to logic engine constraint descriptors
   */
  convertConstraints<TContext = unknown>(
    constraints: PSFConstraint[]
  ): ConstraintDescriptor<TContext>[] {
    return constraints.map((constraint) => this.convertConstraint<TContext>(constraint));
  }

  /**
   * Convert a single PSF constraint to constraint descriptor
   */
  convertConstraint<TContext = unknown>(constraint: PSFConstraint): ConstraintDescriptor<TContext> {
    const checkFn = this.compileExpression(constraint.check, ['state']);

    return {
      id: constraint.id,
      description: constraint.description,
      meta: {
        severity: constraint.severity,
        ...constraint.meta,
      },
      impl: (state: PraxisState & { context: TContext }): boolean | string => {
        try {
          const result = checkFn.fn.call(this.sandbox, state);
          if (result === true) {
            return true;
          }
          return constraint.errorMessage;
        } catch (error) {
          return `Error checking constraint "${constraint.id}": ${error}`;
        }
      },
    };
  }

  /**
   * Load a complete PSF schema into the logic engine
   */
  loadSchema<TContext = unknown>(
    schema: PSFSchema
  ): {
    rules: RuleDescriptor<TContext>[];
    constraints: ConstraintDescriptor<TContext>[];
  } {
    // Add schema facts and events to sandbox for expression evaluation
    this.sandbox = {
      ...this.options.sandbox,
      Facts: this.createFactHelpers(schema),
      Events: this.createEventHelpers(schema),
    };

    return {
      rules: this.convertRules<TContext>(schema.rules),
      constraints: this.convertConstraints<TContext>(schema.constraints),
    };
  }

  /**
   * Compile a PSF expression to a function
   */
  private compileExpression(expr: PSFExpression, args: string[]): CompiledExpression {
    const source = 'inline' in expr ? expr.inline : `/* ref: ${expr.ref} */ null`;
    const cacheKey = `${args.join(',')}:${source}`;

    if (this.options.cacheExpressions && this.expressionCache.has(cacheKey)) {
      return this.expressionCache.get(cacheKey)!;
    }

    try {
      // Create function from expression
      const fn = new Function(...args, `return (${source});`);
      const compiled: CompiledExpression = { fn, source };

      if (this.options.cacheExpressions) {
        this.expressionCache.set(cacheKey, compiled);
      }

      return compiled;
    } catch (error) {
      // Return a safe no-op function on compilation error
      console.error(`Error compiling expression: ${source}`, error);
      return {
        fn: () => null,
        source,
      };
    }
  }

  /**
   * Create fact helper functions for expression evaluation
   */
  private createFactHelpers(schema: PSFSchema): Record<string, unknown> {
    const helpers: Record<string, unknown> = {};

    for (const fact of schema.facts) {
      helpers[fact.tag] = {
        tag: fact.tag,
        create: (payload: unknown) => ({ tag: fact.tag, payload }),
        is: (f: PraxisFact) => f.tag === fact.tag,
      };
    }

    return helpers;
  }

  /**
   * Create event helper functions for expression evaluation
   */
  private createEventHelpers(schema: PSFSchema): Record<string, unknown> {
    const helpers: Record<string, unknown> = {};

    for (const event of schema.events) {
      helpers[event.tag] = {
        tag: event.tag,
        create: (payload: unknown) => ({ tag: event.tag, payload }),
        is: (e: PraxisEvent) => e.tag === event.tag,
      };
    }

    return helpers;
  }

  /**
   * Clear expression cache
   */
  clearCache(): void {
    this.expressionCache.clear();
  }
}

/**
 * Create a PSF logic adapter
 */
export function createPSFLogicAdapter(options?: PSFAdapterOptions): PSFLogicAdapter {
  return new PSFLogicAdapter(options);
}

/**
 * Schema-aware engine factory
 */
export interface SchemaAwareEngineOptions<TContext = unknown> {
  schema: PSFSchema;
  initialContext: TContext;
  sandbox?: Record<string, unknown>;
}

/**
 * Create a schema-aware logic engine from PSF
 */
export async function createSchemaAwareEngine<TContext = unknown>(
  options: SchemaAwareEngineOptions<TContext>
): Promise<{
  rules: RuleDescriptor<TContext>[];
  constraints: ConstraintDescriptor<TContext>[];
  adapter: PSFLogicAdapter;
}> {
  const adapter = new PSFLogicAdapter({ sandbox: options.sandbox });
  const { rules, constraints } = adapter.loadSchema<TContext>(options.schema);

  return {
    rules,
    constraints,
    adapter,
  };
}
