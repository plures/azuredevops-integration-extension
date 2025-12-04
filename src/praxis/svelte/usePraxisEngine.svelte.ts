/**
 * Praxis Svelte Engine Hook
 *
 * Svelte 5 runes-compatible hook for using Praxis engines in webview components.
 * This provides a reactive interface to Praxis state management.
 */

import type { LogicEngine, PraxisEvent } from '@plures/praxis';
import type { PraxisEngineState, UsePraxisEngineResult, UsePraxisEngineOptions } from './types.js';

/**
 * Create a reactive Praxis engine hook for Svelte 5
 *
 * This hook provides a rune-native interface for using Praxis engines
 * in Svelte components. It wraps the engine in reactive state that
 * updates automatically when events are dispatched.
 *
 * @param engine - The Praxis logic engine to wrap
 * @param options - Configuration options
 * @returns Reactive state and dispatch function
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { usePraxisEngine } from '$lib/praxis/svelte';
 *   import { createTimerEngine } from '$lib/praxis/timer';
 *
 *   const engine = createTimerEngine();
 *   const { state, dispatch } = usePraxisEngine(engine);
 * </script>
 *
 * <div>Timer: {state.context.timerState}</div>
 * ```
 */
export function usePraxisEngine<TContext>(
  engine: LogicEngine<TContext>,
  options: UsePraxisEngineOptions<TContext> = {}
): UsePraxisEngineResult<TContext> {
  // Create reactive state using Svelte 5 runes
  const initialContext = {
    ...engine.getContext(),
    ...(options.initialContext || {}),
  } as TContext;

  const state = $state<PraxisEngineState<TContext>>({
    context: initialContext,
    connected: true,
    lastUpdate: Date.now(),
  });

  // Dispatch function that updates reactive state
  const dispatch = (event: PraxisEvent): void => {
    // Step the engine
    engine.step([event]);

    // Update reactive state
    const newContext = engine.getContext();
    state.context = newContext;
    state.lastUpdate = Date.now();

    // Call state change callback
    options.onStateChange?.(newContext);
  };

  // Get current context (non-reactive)
  const getContext = (): TContext => {
    return engine.getContext();
  };

  // Check connection status
  const isConnected = (): boolean => {
    return state.connected;
  };

  return {
    state,
    dispatch,
    getContext,
    isConnected,
  };
}

/**
 * Create a derived state helper for Praxis context
 *
 * This helper creates a derived value from the Praxis context
 * that updates automatically when the context changes.
 *
 * @param state - The Praxis engine state
 * @param selector - Function to select a value from context
 * @returns Derived value
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   const { state } = usePraxisEngine(engine);
 *   const timerState = usePraxisSelector(
 *     state,
 *     (ctx) => ctx.timerState
 *   );
 * </script>
 *
 * <div>State: {timerState}</div>
 * ```
 */
export function usePraxisSelector<TContext, TSelected>(
  state: PraxisEngineState<TContext>,
  selector: (context: TContext) => TSelected
): TSelected {
  // In Svelte 5, we can use $derived to create a reactive derived value
  return $derived(selector(state.context));
}

/**
 * Create a matches helper for checking application state
 *
 * Similar to XState's matches() function, this helps check
 * if the current state matches a given pattern.
 *
 * @param context - The Praxis context
 * @param stateKey - The state property to check
 * @param value - The value to match against
 * @returns Whether the state matches
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   const { state } = usePraxisEngine(engine);
 *   const isRunning = matchesState(state.context, 'timerState', 'running');
 * </script>
 * ```
 */
export function matchesState<TContext extends Record<string, unknown>>(
  context: TContext,
  stateKey: keyof TContext,
  value: TContext[keyof TContext]
): boolean {
  return context[stateKey] === value;
}

/**
 * Create multiple state matchers at once
 *
 * @param context - The Praxis context
 * @param stateKey - The state property to check
 * @returns Object with matcher functions
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   const matches = createStateMatchers(state.context, 'timerState');
 *   // matches.idle, matches.running, matches.paused
 * </script>
 * ```
 */
export function createStateMatchers<
  TContext extends Record<string, unknown>,
  TStateKey extends keyof TContext,
>(context: TContext, stateKey: TStateKey): Record<string, boolean> {
  const currentValue = context[stateKey];
  const matchers: Record<string, boolean> = {};

  // Common state values
  const commonStates = [
    'idle',
    'active',
    'inactive',
    'running',
    'paused',
    'stopped',
    'loading',
    'error',
    'success',
    'failed',
    'connected',
    'disconnected',
    'authenticating',
    'authenticated',
    'activating',
    'deactivating',
  ];

  for (const state of commonStates) {
    matchers[state] = currentValue === state;
  }

  return matchers;
}
