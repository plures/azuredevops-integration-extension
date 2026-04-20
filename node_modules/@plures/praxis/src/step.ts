/**
 * Core step function implementation for Praxis.
 * Pure function that transitions from one state to another given an event.
 */

import type { PraxisState, PraxisEvent, StepResult, StepFunction } from './types.js';
import type { Registry } from './registry.js';

/**
 * Options for creating a step function.
 */
export interface StepOptions<
  S extends PraxisState = PraxisState,
  E extends PraxisEvent = PraxisEvent,
> {
  /** Registry containing rules and constraints */
  registry?: Registry<S, E>;
  /** Whether to check constraints before and after state transitions */
  checkConstraints?: boolean;
  /** Custom reducer function for state transitions */
  reducer?: (state: S, event: E) => S;
}

/**
 * Create a step function that integrates with the registry.
 * This is the main entry point for creating state transition logic.
 */
export function createStepFunction<
  S extends PraxisState = PraxisState,
  E extends PraxisEvent = PraxisEvent,
>(options: StepOptions<S, E> = {}): StepFunction<S, E> {
  const { registry, checkConstraints = true, reducer } = options;

  return (state: S, event: E): StepResult<S> => {
    const errors: string[] = [];

    // Check constraints before transition
    if (checkConstraints && registry) {
      const violations = registry.checkConstraints(state);
      if (violations.length > 0) {
        errors.push(...violations.map((v) => `Pre-condition: ${v.message}`));
        // Return current state with errors
        return { state, errors };
      }
    }

    // Apply the reducer to get the new state
    let newState: S;
    if (reducer) {
      try {
        newState = reducer(state, event);
      } catch (error) {
        errors.push(`Reducer error: ${error}`);
        return { state, errors };
      }
    } else {
      // Default behavior: merge event data into facts
      newState = {
        ...state,
        facts: {
          ...state.facts,
          ...(event.data || {}),
        },
        metadata: {
          ...state.metadata,
          lastUpdated: event.timestamp,
          version: (state.metadata?.version || 0) + 1,
        },
      } as S;
    }

    // Evaluate rules to get effects
    const effects = registry ? registry.evaluateRules(newState, event) : [];

    // Check constraints after transition
    if (checkConstraints && registry) {
      const violations = registry.checkConstraints(newState);
      if (violations.length > 0) {
        errors.push(...violations.map((v) => `Post-condition: ${v.message}`));
        // Return previous state with errors to maintain invariants
        return { state, errors };
      }
    }

    return {
      state: newState,
      effects,
      errors: errors.length > 0 ? errors : undefined,
    };
  };
}

/**
 * Simple step function that just applies a reducer.
 * Useful for basic state transitions without rules or constraints.
 */
export function step<S extends PraxisState = PraxisState, E extends PraxisEvent = PraxisEvent>(
  reducer: (state: S, event: E) => S
): StepFunction<S, E> {
  return (state: S, event: E): StepResult<S> => {
    try {
      const newState = reducer(state, event);
      return { state: newState };
    } catch (error) {
      return {
        state,
        errors: [`Step error: ${error}`],
      };
    }
  };
}

/**
 * Compose multiple step functions into a single step function.
 * Each step function is applied in sequence, with the output of one
 * becoming the input to the next.
 */
export function compose<S extends PraxisState = PraxisState, E extends PraxisEvent = PraxisEvent>(
  ...steps: StepFunction<S, E>[]
): StepFunction<S, E> {
  return (state: S, event: E): StepResult<S> => {
    let currentState = state;
    const allEffects: StepResult<S>['effects'] = [];
    const allErrors: string[] = [];

    for (const stepFn of steps) {
      const result = stepFn(currentState, event);
      currentState = result.state;

      if (result.effects) {
        allEffects.push(...result.effects);
      }

      if (result.errors) {
        allErrors.push(...result.errors);
      }
    }

    return {
      state: currentState,
      effects: allEffects.length > 0 ? allEffects : undefined,
      errors: allErrors.length > 0 ? allErrors : undefined,
    };
  };
}
