# Praxis Reactive Redesign (Svelte 5 Native)

## 1. Vision

Praxis will evolve from a "step-based" logic engine to a **natively reactive** framework built on Svelte 5 Runes. This means the core `LogicEngine` will be a Svelte class, and state changes will propagate automatically through the dependency graph.

## 2. Core Architecture

### 2.1. The Reactive Engine (`LogicEngine.svelte.ts`)

The engine will no longer be a plain TS class. It will use `$state` to hold the application context and facts.

```typescript
// praxis/src/core/engine.svelte.ts
import { type Class } from 'type-fest';

export class LogicEngine<TContext extends object> {
    // The single source of truth, reactive by default
    state = $state<{
        context: TContext;
        facts: PraxisFact[];
        meta: Record<string, unknown>;
    }>({
        context: {} as TContext,
        facts: [],
        meta: {}
    });

    constructor(initialContext: TContext) {
        this.state.context = initialContext;
    }

    // Expose the raw reactive state for binding/derivation
    get context() {
        return this.state.context;
    }
    
    get facts() {
        return this.state.facts;
    }
}
```

### 2.2. Rules as Mutators

In the previous version, rules returned new facts. In the reactive version, rules are **mutators** that directly modify the reactive state. This allows Svelte's fine-grained reactivity to trigger only the necessary updates.

```typescript
// praxis/src/core/types.ts
export type ReactiveRule<TContext> = (
    state: { context: TContext; facts: PraxisFact[] }, 
    event: PraxisEvent
) => void;
```

### 2.3. Derivations (Computed State)

Instead of recomputing state in every "step", we encourage using `$derived` for values that depend on the core state.

```typescript
// Example usage in an app
class AppState {
    // Core state
    connections = $state<Connection[]>([]);
    activeId = $state<string | null>(null);

    // Derived state (automatically updates)
    activeConnection = $derived(
        this.connections.find(c => c.id === this.activeId)
    );
}
```

### 2.4. Actors as Effects

Actors are simply `$effect` blocks that watch the state.

```typescript
// praxis/src/core/actor.ts
export function createActor<TContext>(
    engine: LogicEngine<TContext>, 
    fn: (context: TContext) => void
) {
    $effect(() => {
        fn(engine.context);
    });
}
```

## 3. Migration Plan

### Phase 1: Core Update
1.  **Rename** `engine.ts` to `engine.svelte.ts`.
2.  **Update** `LogicEngine` to use `$state`.
3.  **Update** `PraxisRegistry` to support reactive rules.
4.  **Add** `svelte` as a direct dependency (or ensure peer dependency is strictly enforced).

### Phase 2: Bridge Update
1.  Create a `ReactiveBridge` that uses `$effect.root` to subscribe to state changes and send messages to the WebView.
2.  This replaces the manual `getSerializableContext` calls.

### Phase 3: Tooling
1.  Update the CLI to generate `.svelte.ts` files for schemas.

## 4. Example Usage

```typescript
// defining the engine
const engine = new LogicEngine({ count: 0 });

// defining a rule
const incrementRule: ReactiveRule<any> = (state, event) => {
    if (event.type === 'INCREMENT') {
        state.context.count++;
    }
};

// processing an event
engine.apply(incrementRule, { type: 'INCREMENT' });

// reacting (Actor)
$effect(() => {
    console.log("Count is now:", engine.context.count);
});
```

## 5. Benefits

1.  **Simplicity**: No more complex "step" logic or diffing. Svelte handles the dependency tracking.
2.  **Performance**: Fine-grained updates. Only the parts of the UI/logic that depend on changed data will re-run.
3.  **Isomorphism**: The same logic code runs in the Extension Host (Node) and the WebView (Browser).

