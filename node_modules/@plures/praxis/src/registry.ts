/**
 * Registry for managing rules and constraints in Praxis.
 * Provides registration, retrieval, and execution capabilities.
 */

import type { PraxisState, PraxisEvent, Effect } from './types.js';
import type { Rule, Constraint, ConstraintViolation } from './dsl.js';

/**
 * Registry for managing rules and constraints.
 */
export class Registry<S extends PraxisState = PraxisState, E extends PraxisEvent = PraxisEvent> {
  private rules: Map<string, Rule<S, E>> = new Map();
  private constraints: Map<string, Constraint<S>> = new Map();

  /**
   * Register a new rule.
   * @throws Error if a rule with the same ID already exists
   */
  registerRule(rule: Rule<S, E>): void {
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule with id '${rule.id}' already exists`);
    }
    this.rules.set(rule.id, rule);
  }

  /**
   * Register multiple rules at once.
   */
  registerRules(rules: Rule<S, E>[]): void {
    for (const rule of rules) {
      this.registerRule(rule);
    }
  }

  /**
   * Unregister a rule by ID.
   */
  unregisterRule(id: string): boolean {
    return this.rules.delete(id);
  }

  /**
   * Get a rule by ID.
   */
  getRule(id: string): Rule<S, E> | undefined {
    return this.rules.get(id);
  }

  /**
   * Get all registered rules.
   */
  getAllRules(): Rule<S, E>[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules that match a specific event type.
   */
  getRulesForEvent(eventType: string): Rule<S, E>[] {
    return Array.from(this.rules.values()).filter(
      (rule) => !rule.eventType || rule.eventType === eventType
    );
  }

  /**
   * Register a new constraint.
   * @throws Error if a constraint with the same ID already exists
   */
  registerConstraint(constraint: Constraint<S>): void {
    if (this.constraints.has(constraint.id)) {
      throw new Error(`Constraint with id '${constraint.id}' already exists`);
    }
    this.constraints.set(constraint.id, constraint);
  }

  /**
   * Register multiple constraints at once.
   */
  registerConstraints(constraints: Constraint<S>[]): void {
    for (const constraint of constraints) {
      this.registerConstraint(constraint);
    }
  }

  /**
   * Unregister a constraint by ID.
   */
  unregisterConstraint(id: string): boolean {
    return this.constraints.delete(id);
  }

  /**
   * Get a constraint by ID.
   */
  getConstraint(id: string): Constraint<S> | undefined {
    return this.constraints.get(id);
  }

  /**
   * Get all registered constraints.
   */
  getAllConstraints(): Constraint<S>[] {
    return Array.from(this.constraints.values());
  }

  /**
   * Evaluate all rules for a given state and event.
   * Returns all effects produced by rules that fire.
   */
  evaluateRules(state: S, event: E): Effect[] {
    const effects: Effect[] = [];

    // Get rules that match the event type
    const applicableRules = this.getRulesForEvent(event.type);

    // Sort by priority (higher priority first)
    const sortedRules = applicableRules.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    // Evaluate each rule
    for (const rule of sortedRules) {
      try {
        if (rule.when(state, event)) {
          const ruleEffects = rule.then(state, event);
          effects.push(...ruleEffects);
        }
      } catch (error) {
        console.error(`Error evaluating rule '${rule.id}':`, error);
      }
    }

    return effects;
  }

  /**
   * Check all constraints for a given state.
   * Returns an array of violations (empty if all constraints pass).
   */
  checkConstraints(state: S): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    for (const constraint of this.constraints.values()) {
      try {
        if (!constraint.check(state)) {
          violations.push({
            constraintId: constraint.id,
            message: constraint.errorMessage || `Constraint '${constraint.id}' violated`,
            state,
          });
        }
      } catch (error) {
        violations.push({
          constraintId: constraint.id,
          message: `Error checking constraint '${constraint.id}': ${error}`,
          state,
        });
      }
    }

    return violations;
  }

  /**
   * Clear all rules from the registry.
   */
  clearRules(): void {
    this.rules.clear();
  }

  /**
   * Clear all constraints from the registry.
   */
  clearConstraints(): void {
    this.constraints.clear();
  }

  /**
   * Clear all rules and constraints from the registry.
   */
  clear(): void {
    this.clearRules();
    this.clearConstraints();
  }

  /**
   * Get statistics about the registry.
   */
  getStats(): {
    ruleCount: number;
    constraintCount: number;
    rulesByEventType: Record<string, number>;
  } {
    const rulesByEventType: Record<string, number> = {};

    for (const rule of this.rules.values()) {
      const eventType = rule.eventType || '*';
      rulesByEventType[eventType] = (rulesByEventType[eventType] || 0) + 1;
    }

    return {
      ruleCount: this.rules.size,
      constraintCount: this.constraints.size,
      rulesByEventType,
    };
  }
}

/**
 * Create a new registry instance.
 */
export function createRegistry<
  S extends PraxisState = PraxisState,
  E extends PraxisEvent = PraxisEvent,
>(): Registry<S, E> {
  return new Registry<S, E>();
}
