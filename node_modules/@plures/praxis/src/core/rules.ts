/**
 * Rules and Constraints System
 *
 * This module defines the types and registry for rules and constraints.
 * Rules and constraints are identified by stable IDs and can be described as data,
 * making them portable across languages and suitable for DSL-based definitions.
 */

import type { PraxisEvent, PraxisFact, PraxisState } from './protocol.js';

/**
 * Unique identifier for a rule
 */
export type RuleId = string;

/**
 * Unique identifier for a constraint
 */
export type ConstraintId = string;

/**
 * A rule function derives new facts or transitions from context + input facts/events.
 * Rules must be pure - no side effects.
 *
 * @param state Current Praxis state
 * @param events Events to process
 * @returns Array of new facts to add to the state
 */
export type RuleFn<TContext = unknown> = (
  state: PraxisState & { context: TContext },
  events: PraxisEvent[]
) => PraxisFact[];

/**
 * A constraint function checks that an invariant holds.
 * Constraints must be pure - no side effects.
 *
 * @param state Current Praxis state
 * @returns true if constraint is satisfied, false or error message if violated
 */
export type ConstraintFn<TContext = unknown> = (
  state: PraxisState & { context: TContext }
) => boolean | string;

/**
 * Descriptor for a rule, including its ID, description, and implementation.
 */
export interface RuleDescriptor<TContext = unknown> {
  /** Unique identifier for the rule */
  id: RuleId;
  /** Human-readable description */
  description: string;
  /** Implementation function */
  impl: RuleFn<TContext>;
  /** Optional metadata */
  meta?: Record<string, unknown>;
}

/**
 * Descriptor for a constraint, including its ID, description, and implementation.
 */
export interface ConstraintDescriptor<TContext = unknown> {
  /** Unique identifier for the constraint */
  id: ConstraintId;
  /** Human-readable description */
  description: string;
  /** Implementation function */
  impl: ConstraintFn<TContext>;
  /** Optional metadata */
  meta?: Record<string, unknown>;
}

/**
 * A Praxis module bundles rules and constraints.
 * Modules can be composed and registered with the engine.
 */
export interface PraxisModule<TContext = unknown> {
  /** Rules in this module */
  rules: RuleDescriptor<TContext>[];
  /** Constraints in this module */
  constraints: ConstraintDescriptor<TContext>[];
  /** Optional module metadata */
  meta?: Record<string, unknown>;
}

/**
 * Registry for rules and constraints.
 * Maps IDs to their descriptors.
 */
export class PraxisRegistry<TContext = unknown> {
  private rules = new Map<RuleId, RuleDescriptor<TContext>>();
  private constraints = new Map<ConstraintId, ConstraintDescriptor<TContext>>();

  /**
   * Register a rule
   */
  registerRule(descriptor: RuleDescriptor<TContext>): void {
    if (this.rules.has(descriptor.id)) {
      throw new Error(`Rule with id "${descriptor.id}" already registered`);
    }
    this.rules.set(descriptor.id, descriptor);
  }

  /**
   * Register a constraint
   */
  registerConstraint(descriptor: ConstraintDescriptor<TContext>): void {
    if (this.constraints.has(descriptor.id)) {
      throw new Error(`Constraint with id "${descriptor.id}" already registered`);
    }
    this.constraints.set(descriptor.id, descriptor);
  }

  /**
   * Register a module (all its rules and constraints)
   */
  registerModule(module: PraxisModule<TContext>): void {
    for (const rule of module.rules) {
      this.registerRule(rule);
    }
    for (const constraint of module.constraints) {
      this.registerConstraint(constraint);
    }
  }

  /**
   * Get a rule by ID
   */
  getRule(id: RuleId): RuleDescriptor<TContext> | undefined {
    return this.rules.get(id);
  }

  /**
   * Get a constraint by ID
   */
  getConstraint(id: ConstraintId): ConstraintDescriptor<TContext> | undefined {
    return this.constraints.get(id);
  }

  /**
   * Get all registered rule IDs
   */
  getRuleIds(): RuleId[] {
    return Array.from(this.rules.keys());
  }

  /**
   * Get all registered constraint IDs
   */
  getConstraintIds(): ConstraintId[] {
    return Array.from(this.constraints.keys());
  }

  /**
   * Get all rules
   */
  getAllRules(): RuleDescriptor<TContext>[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get all constraints
   */
  getAllConstraints(): ConstraintDescriptor<TContext>[] {
    return Array.from(this.constraints.values());
  }
}
