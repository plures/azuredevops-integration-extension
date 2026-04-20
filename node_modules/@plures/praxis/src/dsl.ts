/**
 * DSL for defining rules and constraints in Praxis.
 * Rules are condition-action pairs that fire when conditions are met.
 * Constraints are invariants that must hold true in valid states.
 */

import type { PraxisState, PraxisEvent, Effect } from './types.js';

/**
 * A condition function that checks if a rule should fire.
 */
export type Condition<S extends PraxisState = PraxisState, E extends PraxisEvent = PraxisEvent> = (
  state: S,
  event: E
) => boolean;

/**
 * An action function that produces effects when a rule fires.
 */
export type Action<S extends PraxisState = PraxisState, E extends PraxisEvent = PraxisEvent> = (
  state: S,
  event: E
) => Effect[];

/**
 * A rule that fires when its condition is met.
 */
export interface Rule<S extends PraxisState = PraxisState, E extends PraxisEvent = PraxisEvent> {
  /** Unique identifier for the rule */
  id: string;
  /** Human-readable description of what the rule does */
  description?: string;
  /** Priority for rule execution (higher numbers = higher priority) */
  priority?: number;
  /** Condition that must be true for the rule to fire */
  when: Condition<S, E>;
  /** Action to execute when the rule fires */
  then: Action<S, E>;
  /** Optional event type filter - only check this rule for matching events */
  eventType?: string;
}

/**
 * A constraint that must hold true in valid states.
 */
export interface Constraint<S extends PraxisState = PraxisState> {
  /** Unique identifier for the constraint */
  id: string;
  /** Human-readable description of the constraint */
  description?: string;
  /** Function that returns true if the constraint is satisfied */
  check: (state: S) => boolean;
  /** Error message to return when constraint is violated */
  errorMessage?: string;
}

/**
 * Result of checking a constraint.
 */
export interface ConstraintViolation {
  constraintId: string;
  message: string;
  state?: PraxisState;
}

/**
 * DSL builder for creating rules with a fluent interface.
 */
export class RuleBuilder<S extends PraxisState = PraxisState, E extends PraxisEvent = PraxisEvent> {
  private rule: Partial<Rule<S, E>> = {};

  /**
   * Set the rule ID.
   */
  id(id: string): this {
    this.rule.id = id;
    return this;
  }

  /**
   * Set the rule description.
   */
  describe(description: string): this {
    this.rule.description = description;
    return this;
  }

  /**
   * Set the rule priority.
   */
  priority(priority: number): this {
    this.rule.priority = priority;
    return this;
  }

  /**
   * Set the event type filter.
   */
  on(eventType: string): this {
    this.rule.eventType = eventType;
    return this;
  }

  /**
   * Set the condition for when the rule should fire.
   */
  when(condition: Condition<S, E>): this {
    this.rule.when = condition;
    return this;
  }

  /**
   * Set the action to execute when the rule fires.
   */
  then(action: Action<S, E>): this {
    this.rule.then = action;
    return this;
  }

  /**
   * Build the final rule.
   */
  build(): Rule<S, E> {
    if (!this.rule.id) {
      throw new Error('Rule must have an id');
    }
    if (!this.rule.when) {
      throw new Error('Rule must have a when condition');
    }
    if (!this.rule.then) {
      throw new Error('Rule must have a then action');
    }
    return this.rule as Rule<S, E>;
  }
}

/**
 * DSL builder for creating constraints with a fluent interface.
 */
export class ConstraintBuilder<S extends PraxisState = PraxisState> {
  private constraint: Partial<Constraint<S>> = {};

  /**
   * Set the constraint ID.
   */
  id(id: string): this {
    this.constraint.id = id;
    return this;
  }

  /**
   * Set the constraint description.
   */
  describe(description: string): this {
    this.constraint.description = description;
    return this;
  }

  /**
   * Set the constraint check function.
   */
  check(check: (state: S) => boolean): this {
    this.constraint.check = check;
    return this;
  }

  /**
   * Set the error message for constraint violations.
   */
  message(errorMessage: string): this {
    this.constraint.errorMessage = errorMessage;
    return this;
  }

  /**
   * Build the final constraint.
   */
  build(): Constraint<S> {
    if (!this.constraint.id) {
      throw new Error('Constraint must have an id');
    }
    if (!this.constraint.check) {
      throw new Error('Constraint must have a check function');
    }
    return this.constraint as Constraint<S>;
  }
}

/**
 * Factory functions for creating rules and constraints using the DSL.
 */

/**
 * Create a new rule using the fluent builder API.
 */
export function rule<
  S extends PraxisState = PraxisState,
  E extends PraxisEvent = PraxisEvent,
>(): RuleBuilder<S, E> {
  return new RuleBuilder<S, E>();
}

/**
 * Create a new constraint using the fluent builder API.
 */
export function constraint<S extends PraxisState = PraxisState>(): ConstraintBuilder<S> {
  return new ConstraintBuilder<S>();
}
