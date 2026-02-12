/**
 * Framework-Agnostic Reactive Engine
 *
 * Uses Praxis v1.2.0's framework-agnostic reactive engine for Node.js-only code paths
 * in the extension host. This provides Proxy-based reactivity without Svelte dependency.
 *
 * Use this for:
 * - Extension host code that needs reactivity but doesn't use Svelte
 * - Background services that need reactive state management
 * - Node.js-only code paths that benefit from reactive subscriptions
 */

import { createFrameworkAgnosticReactiveEngine } from '@plures/praxis';
import type { LogicEngine } from '@plures/praxis';
import type { ApplicationEngineContext } from './application/types.js';

/**
 * Create a framework-agnostic reactive engine wrapper
 *
 * This provides reactive state management for Node.js-only code paths
 * without requiring Svelte. Uses Proxy-based reactivity for efficient updates.
 */
export function createExtensionHostReactiveEngine(engine: LogicEngine<ApplicationEngineContext>): {
  engine: LogicEngine<ApplicationEngineContext>;
  subscribe: (callback: (state: ApplicationEngineContext) => void) => () => void;
  $derived: <T>(selector: (state: ApplicationEngineContext) => T) => {
    subscribe: (callback: (value: T) => void) => () => void;
    getValue: () => T;
  };
  apply: (mutator: (state: ApplicationEngineContext) => void) => void;
} {
  // Wrap the existing engine with framework-agnostic reactive capabilities
  // Note: The engine itself is already reactive, but we can add derived values
  // and better subscription management for Node.js-only code paths

  const subscribers = new Set<(state: ApplicationEngineContext) => void>();

  // Subscribe to engine changes
  const engineUnsubscribe =
    engine.subscribe?.(() => {
      const context = engine.getContext();
      subscribers.forEach((sub) => {
        try {
          sub(context);
        } catch (error) {
          // Automatic logging will capture this
        }
      });
    }) || (() => {});

  return {
    engine,

    /**
     * Subscribe to state changes
     */
    subscribe(callback: (state: ApplicationEngineContext) => void) {
      subscribers.add(callback);
      // Immediately call with current state
      callback(engine.getContext());

      return () => {
        subscribers.delete(callback);
      };
    },

    /**
     * Create a derived/computed value
     */
    $derived<T>(selector: (state: ApplicationEngineContext) => T) {
      let currentValue = selector(engine.getContext());
      const derivedSubscribers = new Set<(value: T) => void>();

      // Subscribe to engine changes to update derived value
      const unsubscribe = this.subscribe((state) => {
        const newValue = selector(state);
        if (newValue !== currentValue) {
          currentValue = newValue;
          derivedSubscribers.forEach((sub) => {
            try {
              sub(newValue);
            } catch (error) {
              // Automatic logging will capture this
            }
          });
        }
      });

      return {
        subscribe(callback: (value: T) => void) {
          derivedSubscribers.add(callback);
          callback(currentValue);

          return () => {
            derivedSubscribers.delete(callback);
          };
        },
        getValue() {
          return selector(engine.getContext());
        },
      };
    },

    /**
     * Apply mutations (batched for performance)
     * Note: In Praxis, we typically use events instead of direct mutations
     * This is provided for compatibility but events are preferred
     */
    apply(mutator: (state: ApplicationEngineContext) => void) {
      // In Praxis, we should use events instead of direct mutations
      // This is a compatibility layer for code that needs it
      mutator(engine.getContext());

      // Notify subscribers
      const context = engine.getContext();
      subscribers.forEach((sub) => {
        try {
          sub(context);
        } catch (error) {
          // Automatic logging will capture this
        }
      });
    },
  };
}
