/**
 * Praxis Reactive Logic Engine - Svelte 5 Implementation
 * 
 * This version uses Svelte 5 runes ($state) for built-in reactivity.
 * The state object is automatically reactive when used in Svelte components.
 */

import { PraxisRegistry } from '../core/rules.js';
import type { PraxisEvent } from '../core/protocol.js';
import { LogicEngine, createPraxisEngine } from '../core/engine.js';

// Type declaration for Svelte 5 $state rune
// This is needed for TypeScript compilation; the actual implementation
// is provided by the Svelte compiler when processing .svelte.ts files
declare function $state<T>(initial: T): T;

export interface ReactiveEngineOptions<TContext> {
    initialContext: TContext;
    initialFacts?: any[];
    initialMeta?: Record<string, unknown>;
    registry?: PraxisRegistry<TContext>;
}

/**
 * Reactive Logic Engine using Svelte 5 runes.
 * Combines the standard LogicEngine with reactive state management.
 */
export class ReactiveLogicEngine<TContext extends object> {
    // Use Svelte's $state rune for automatic reactivity
    state: { context: TContext; facts: any[]; meta: Record<string, unknown> } = $state({
        context: {} as TContext,
        facts: [] as any[],
        meta: {} as Record<string, unknown>
    });

    // Internal engine for logic processing
    private _engine: LogicEngine<TContext>;

    constructor(options: ReactiveEngineOptions<TContext>) {
        // Initialize reactive state
        this.state.context = options.initialContext;
        this.state.facts = options.initialFacts ?? [];
        this.state.meta = options.initialMeta ?? {};

        // Create internal engine if registry is provided
        if (options.registry) {
            this._engine = createPraxisEngine({
                initialContext: options.initialContext,
                registry: options.registry,
            });
        } else {
            // Create a basic engine without registry
            this._engine = createPraxisEngine({
                initialContext: options.initialContext,
                registry: new PraxisRegistry<TContext>(),
            });
        }
    }

    /**
     * Access the reactive context.
     * In Svelte 5 components, changes to this object will automatically trigger updates.
     */
    get context(): TContext {
        return this.state.context;
    }

    /**
     * Access the reactive facts list.
     */
    get facts(): any[] {
        return this.state.facts;
    }

    /**
     * Access the reactive metadata.
     */
    get meta(): Record<string, unknown> {
        return this.state.meta;
    }

    /**
     * Apply a mutation to the state.
     * Changes will automatically trigger Svelte reactivity.
     * 
     * @param mutator A function that receives the state and modifies it.
     */
    apply(mutator: (state: { context: TContext; facts: any[]; meta: Record<string, unknown> }) => void): void {
        mutator(this.state);
    }

    /**
     * Process events through the logic engine and update reactive state.
     * 
     * @param events Events to process
     */
    step(events: PraxisEvent[]): void {
        const result = this._engine.step(events);
        
        // Update reactive state with engine results
        this.state.context = result.state.context as TContext;
        this.state.facts = result.state.facts;
        this.state.meta = result.state.meta ?? {};
    }
}

/**
 * Create a reactive logic engine with Svelte 5 runes.
 * 
 * @param options Configuration options
 * @returns A reactive logic engine instance
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { createReactiveEngine } from '@plures/praxis/svelte';
 * 
 *   const engine = createReactiveEngine({
 *     initialContext: { count: 0 },
 *     registry
 *   });
 * 
 *   // Use $derived for computed values
 *   const count = $derived(engine.context.count);
 *   const doubled = $derived(engine.context.count * 2);
 * 
 *   function increment() {
 *     engine.step([Increment.create({ amount: 1 })]);
 *   }
 * </script>
 * 
 * <button on:click={increment}>Count: {count}, Doubled: {doubled}</button>
 * ```
 */
export function createReactiveEngine<TContext extends object>(
    options: ReactiveEngineOptions<TContext>
): ReactiveLogicEngine<TContext> {
    return new ReactiveLogicEngine(options);
}
