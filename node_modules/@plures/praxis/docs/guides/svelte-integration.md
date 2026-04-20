# Praxis Svelte 5 Integration Guide

Complete guide to using Praxis with Svelte 5, including both traditional stores and modern runes.

## Overview

Praxis provides first-class Svelte 5 support through the `@plures/praxis/svelte` export. The integration offers:

- ✅ **Traditional Stores**: Backward-compatible store API
- ✅ **Svelte 5 Runes**: Modern `$state`, `$derived`, `$effect` support
- ✅ **History & Time-Travel**: Built-in undo/redo and debugging
- ✅ **Type Safety**: Full TypeScript support
- ✅ **Automatic Cleanup**: No memory leaks
- ✅ **Zero Config**: Works out of the box

## Installation

```bash
npm install @plures/praxis svelte@^5.0.0
```

## Quick Start

### Option 1: Store API (Traditional)

```svelte
<script lang="ts">
  import { createPraxisStore } from '@plures/praxis/svelte';
  import { myEngine, Increment } from './my-engine';

  const store = createPraxisStore(myEngine);
</script>

<div>
  <p>Count: {$store.context.count}</p>
  <button onclick={() => store.dispatch([Increment.create({})])}>
    Increment
  </button>
</div>
```

### Option 2: Runes API (Svelte 5)

```svelte
<script lang="ts">
  import { usePraxisEngine } from '@plures/praxis/svelte';
  import { myEngine, Increment } from './my-engine';

  const { context, dispatch } = usePraxisEngine(myEngine);
</script>

<div>
  <p>Count: {context.count}</p>
  <button onclick={() => dispatch([Increment.create({})])}>
    Increment
  </button>
</div>
```

## Store API

### createPraxisStore

Creates a Svelte store that tracks the full engine state.

```typescript
import { createPraxisStore } from '@plures/praxis/svelte';
import type { Readable } from '@plures/praxis/svelte';

const store = createPraxisStore(engine);

// Subscribe to changes
const unsubscribe = store.subscribe((state) => {
  console.log('State:', state.context);
  console.log('Facts:', state.facts);
});

// Dispatch events
store.dispatch([MyEvent.create({ data: 'value' })]);

// Clean up
unsubscribe();
```

**Use in Svelte:**

```svelte
<script>
  import { createPraxisStore } from '@plures/praxis/svelte';
  import { engine, Increment } from './engine';

  const store = createPraxisStore(engine);
</script>

<div>
  <h2>Full State Access</h2>
  <p>Count: {$store.context.count}</p>
  <p>Facts: {$store.facts.length}</p>
  <p>Protocol: {$store.protocolVersion}</p>

  <button onclick={() => store.dispatch([Increment.create({})])}>
    Increment
  </button>
</div>
```

### createContextStore

Creates a store that tracks only the engine context.

```typescript
import { createContextStore } from '@plures/praxis/svelte';

const contextStore = createContextStore(engine);

// Subscribe to context changes only
contextStore.subscribe((context) => {
  console.log('Context updated:', context);
});

// Dispatch events
contextStore.dispatch([MyEvent.create({})]);
```

**Use in Svelte:**

```svelte
<script>
  import { createContextStore } from '@plures/praxis/svelte';
  import { engine, UpdateUser } from './engine';

  const context = createContextStore(engine);
</script>

<div>
  <h2>User: {$context.user?.name || 'Guest'}</h2>
  <p>Page: {$context.currentPage}</p>

  <button onclick={() => context.dispatch([UpdateUser.create({ name: 'Alice' })])}>
    Update User
  </button>
</div>
```

### createDerivedStore

Creates a store that extracts and tracks a specific value from the context.

```typescript
import { createDerivedStore } from '@plures/praxis/svelte';

const countStore = createDerivedStore(engine, (context) => context.count);

// Only updates when the derived value changes
countStore.subscribe((count) => {
  console.log('Count:', count);
});

countStore.dispatch([Increment.create({})]);
```

**Use in Svelte:**

```svelte
<script>
  import { createDerivedStore } from '@plures/praxis/svelte';
  import { engine, Increment } from './engine';

  const count = createDerivedStore(engine, (ctx) => ctx.count);
  const userName = createDerivedStore(engine, (ctx) => ctx.user?.name);
</script>

<div>
  <p>Count: {$count}</p>
  <p>User: {$userName || 'Anonymous'}</p>

  <button onclick={() => count.dispatch([Increment.create({})])}>
    Increment
  </button>
</div>
```

**Performance Note:** `createDerivedStore` only notifies subscribers when the selected value actually changes, making it more efficient than subscribing to the full state.

## Runes API (Svelte 5)

### usePraxisEngine

The main composable for Svelte 5 runes. Provides reactive access to engine state with optional history tracking.

```typescript
import { usePraxisEngine } from '@plures/praxis/svelte';

const {
  state, // Full state (reactive)
  context, // Context (reactive)
  facts, // Facts array (reactive)
  dispatch, // Dispatch events
  // History features (when enableHistory: true)
  snapshots, // Array of state snapshots
  undo, // Undo last action
  redo, // Redo action
  canUndo, // Boolean: can undo?
  canRedo, // Boolean: can redo?
  historyIndex, // Current position in history
  goToSnapshot, // Jump to specific snapshot
} = usePraxisEngine(engine, {
  enableHistory: true,
  maxHistorySize: 50,
});
```

**Basic Example:**

```svelte
<script lang="ts">
  import { usePraxisEngine } from '@plures/praxis/svelte';
  import { createCounterEngine, Increment, Decrement } from './counter';

  const engine = createCounterEngine();
  const { context, dispatch } = usePraxisEngine(engine);
</script>

<div>
  <h1>Counter: {context.count}</h1>
  <button onclick={() => dispatch([Increment.create({})])}>+</button>
  <button onclick={() => dispatch([Decrement.create({})])}>-</button>
</div>
```

**With History:**

```svelte
<script lang="ts">
  import { usePraxisEngine } from '@plures/praxis/svelte';
  import { createCounterEngine, Increment } from './counter';

  const engine = createCounterEngine();
  const {
    context,
    dispatch,
    undo,
    redo,
    canUndo,
    canRedo,
    snapshots,
    historyIndex
  } = usePraxisEngine(engine, {
    enableHistory: true,
    maxHistorySize: 50
  });
</script>

<div class="counter-app">
  <header>
    <h1>Counter: {context.count}</h1>
    <p>History: {historyIndex + 1} / {snapshots.length}</p>
  </header>

  <main>
    <button onclick={() => dispatch([Increment.create({ amount: 1 })])}>
      +1
    </button>
    <button onclick={() => dispatch([Increment.create({ amount: 5 })])}>
      +5
    </button>
  </main>

  <footer>
    <button onclick={undo} disabled={!canUndo}>
      ⟲ Undo
    </button>
    <button onclick={redo} disabled={!canRedo}>
      ⟳ Redo
    </button>
  </footer>
</div>
```

### usePraxisContext

Extract a specific value from the engine context.

```typescript
import { usePraxisContext } from '@plures/praxis/svelte';

const count = usePraxisContext(engine, (ctx) => ctx.count);
const userName = usePraxisContext(engine, (ctx) => ctx.user?.name);
```

**Example:**

```svelte
<script lang="ts">
  import { usePraxisContext } from '@plures/praxis/svelte';
  import { engine } from './engine';

  const count = usePraxisContext(engine, (ctx) => ctx.count);
  const isAuthenticated = usePraxisContext(engine, (ctx) => !!ctx.user);
</script>

<div>
  <p>Count: {count}</p>
  <p>Authenticated: {isAuthenticated}</p>
</div>
```

### usePraxisSubscription

Subscribe to engine state changes with automatic cleanup.

```typescript
import { usePraxisSubscription } from '@plures/praxis/svelte';

// Automatically cleaned up when component unmounts
usePraxisSubscription(engine, (state) => {
  console.log('State changed:', state);
});
```

**Example:**

```svelte
<script lang="ts">
  import { usePraxisSubscription } from '@plures/praxis/svelte';
  import { engine } from './engine';

  // Log all state changes
  usePraxisSubscription(engine, (state) => {
    console.log('Context:', state.context);
    console.log('Facts:', state.facts.length);
  });

  // Persist to localStorage
  usePraxisSubscription(engine, (state) => {
    localStorage.setItem('app-state', JSON.stringify(state.context));
  });
</script>
```

## History & Time-Travel

### Time-Travel Debugging

```svelte
<script lang="ts">
  import { usePraxisEngine } from '@plures/praxis/svelte';
  import { createMyEngine } from './engine';

  const engine = createMyEngine();
  const {
    context,
    snapshots,
    goToSnapshot,
    historyIndex
  } = usePraxisEngine(engine, { enableHistory: true });
</script>

<div class="debugger">
  <h2>Time-Travel Debugger</h2>

  <div class="timeline">
    {#each snapshots as snapshot, index}
      <button
        class:active={index === historyIndex}
        onclick={() => goToSnapshot(index)}
      >
        {new Date(snapshot.timestamp).toLocaleTimeString()}
        <br />
        {snapshot.events.length} events
      </button>
    {/each}
  </div>

  <div class="state-viewer">
    <h3>State at {new Date(snapshots[historyIndex]?.timestamp).toLocaleString()}</h3>
    <pre>{JSON.stringify(context, null, 2)}</pre>
  </div>
</div>

<style>
  .timeline {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
  }

  .timeline button {
    padding: 0.5rem;
    border: 2px solid #ccc;
  }

  .timeline button.active {
    border-color: #007bff;
    background: #e7f3ff;
  }
</style>
```

### Undo/Redo UI

```svelte
<script lang="ts">
  import { usePraxisEngine } from '@plures/praxis/svelte';
  import { createTextEngine, InsertText, DeleteText } from './text-engine';

  const engine = createTextEngine();
  const { context, dispatch, undo, redo, canUndo, canRedo } =
    usePraxisEngine(engine, { enableHistory: true });

  let input = '';

  function handleInsert() {
    if (input.trim()) {
      dispatch([InsertText.create({ text: input })], 'Insert Text');
      input = '';
    }
  }
</script>

<div class="text-editor">
  <div class="toolbar">
    <button onclick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
      ⟲ Undo
    </button>
    <button onclick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">
      ⟳ Redo
    </button>
  </div>

  <div class="editor">
    <textarea bind:value={context.content} readonly></textarea>
  </div>

  <div class="input">
    <input
      type="text"
      bind:value={input}
      onkeypress={(e) => e.key === 'Enter' && handleInsert()}
      placeholder="Type text..."
    />
    <button onclick={handleInsert}>Insert</button>
  </div>
</div>
```

## Advanced Patterns

### Multiple Engines

```svelte
<script lang="ts">
  import { usePraxisEngine } from '@plures/praxis/svelte';
  import { createAuthEngine, createCartEngine } from './engines';

  const authEngine = createAuthEngine();
  const cartEngine = createCartEngine();

  const auth = usePraxisEngine(authEngine);
  const cart = usePraxisEngine(cartEngine);
</script>

<div>
  <header>
    {#if auth.context.user}
      <p>Welcome, {auth.context.user.name}!</p>
      <button onclick={() => auth.dispatch([Logout.create({})])}>
        Logout
      </button>
    {:else}
      <button onclick={() => auth.dispatch([Login.create({})])}>
        Login
      </button>
    {/if}
  </header>

  <main>
    <p>Cart Items: {cart.context.items.length}</p>
    <button onclick={() => cart.dispatch([AddToCart.create({ id: '1' })])}>
      Add Item
    </button>
  </main>
</div>
```

### Computed Values

```svelte
<script lang="ts">
  import { usePraxisEngine } from '@plures/praxis/svelte';
  import { createCartEngine } from './cart-engine';

  const engine = createCartEngine();
  const { context, dispatch } = usePraxisEngine(engine);

  // Derive computed values
  $: total = context.items.reduce((sum, item) => sum + item.price, 0);
  $: itemCount = context.items.length;
  $: isEmpty = itemCount === 0;
</script>

<div class="cart">
  <h2>Shopping Cart</h2>

  {#if isEmpty}
    <p>Your cart is empty</p>
  {:else}
    <ul>
      {#each context.items as item}
        <li>{item.name} - ${item.price}</li>
      {/each}
    </ul>

    <div class="summary">
      <p>Items: {itemCount}</p>
      <p>Total: ${total.toFixed(2)}</p>
    </div>
  {/if}
</div>
```

### Side Effects

```svelte
<script lang="ts">
  import { usePraxisEngine, usePraxisSubscription } from '@plures/praxis/svelte';
  import { createOrderEngine } from './order-engine';

  const engine = createOrderEngine();
  const { context, dispatch } = usePraxisEngine(engine);

  // Persist to localStorage
  usePraxisSubscription(engine, (state) => {
    localStorage.setItem('orders', JSON.stringify(state.context.orders));
  });

  // Send analytics
  usePraxisSubscription(engine, (state) => {
    if (state.facts.some(f => f.tag === 'OrderPlaced')) {
      analytics.track('order_placed', {
        orderId: state.context.lastOrderId,
      });
    }
  });

  // Show notifications
  usePraxisSubscription(engine, (state) => {
    const errors = state.facts.filter(f => f.tag === 'OrderFailed');
    if (errors.length > 0) {
      const error = errors[errors.length - 1];
      showNotification('Order Failed', error.payload.reason);
    }
  });
</script>
```

## Performance Tips

### 1. Use Derived Stores for Specific Values

```svelte
<!-- ❌ Less efficient: subscribes to all state changes -->
<script>
  const store = createPraxisStore(engine);
</script>
<p>Count: {$store.context.count}</p>

<!-- ✅ More efficient: only updates when count changes -->
<script>
  const count = createDerivedStore(engine, ctx => ctx.count);
</script>
<p>Count: {$count}</p>
```

### 2. Limit History Size

```typescript
// For user-facing features
usePraxisEngine(engine, {
  enableHistory: true,
  maxHistorySize: 20, // Smaller for better performance
});

// For debugging/development
usePraxisEngine(engine, {
  enableHistory: true,
  maxHistorySize: 100, // Larger for more history
});
```

### 3. Batch Events

```typescript
// ❌ Multiple dispatches
dispatch([Increment.create({})]);
dispatch([UpdateUser.create({ name: 'Alice' })]);
dispatch([SaveData.create({})]);

// ✅ Single dispatch
dispatch([Increment.create({}), UpdateUser.create({ name: 'Alice' }), SaveData.create({})]);
```

### 4. Memoize Selectors

```typescript
// ❌ New function on every render
const count = usePraxisContext(engine, (ctx) => ctx.count);

// ✅ Reuse selector function
const countSelector = (ctx: MyContext) => ctx.count;
const count = usePraxisContext(engine, countSelector);
```

## TypeScript Support

All APIs are fully typed:

```typescript
import type {
  LogicEngine,
  Readable,
  Writable,
  StateSnapshot,
  HistoryEntry,
  PraxisEngineBinding,
} from '@plures/praxis/svelte';

interface MyContext {
  count: number;
  user: { id: string; name: string } | null;
}

const engine: LogicEngine<MyContext> = createPraxisEngine({
  /* ... */
});

// Store types are inferred
const store: Readable<PraxisState & { context: MyContext }> & {
  dispatch: (events: PraxisEvent[]) => void;
} = createPraxisStore(engine);

// Runes types are inferred
const binding: PraxisEngineBinding<MyContext> = usePraxisEngine(engine, {
  enableHistory: true,
});

// Selector types are inferred
const count: number = usePraxisContext(engine, (ctx: MyContext) => ctx.count);
```

## Migration from XState

If you're coming from XState:

| XState                                      | Praxis                                                  |
| ------------------------------------------- | ------------------------------------------------------- |
| `const [state, send] = useMachine(machine)` | `const { context, dispatch } = usePraxisEngine(engine)` |
| `state.context.count`                       | `context.count`                                         |
| `send({ type: 'INCREMENT' })`               | `dispatch([Increment.create({})])`                      |
| `state.matches('idle')`                     | Check context: `context.status === 'idle'`              |
| `state.history`                             | `usePraxisEngine(engine, { enableHistory: true })`      |
| `const service = interpret(machine)`        | `const store = createPraxisStore(engine)`               |

## Examples

See the following examples for complete implementations:

- [Counter with Svelte 5](/src/examples/svelte-counter/index.ts)
- [Auth Flow with History](/docs/guides/history-state-pattern.md#authentication-flow-example)
- [Svelte Integration Tests](/src/__tests__/svelte-integration.test.ts)

## Summary

Praxis provides comprehensive Svelte 5 support through:

- ✅ **Traditional Stores**: Compatible with Svelte 4 and 5
- ✅ **Modern Runes**: First-class Svelte 5 runes support
- ✅ **History Tracking**: Built-in undo/redo and time-travel
- ✅ **Type Safety**: Full TypeScript support throughout
- ✅ **Performance**: Efficient updates with derived stores
- ✅ **Developer Experience**: Simple, intuitive API

Whether you prefer stores or runes, Praxis has you covered!
