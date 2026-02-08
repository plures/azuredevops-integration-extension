# Praxis v1.2.0 Unified Svelte Integration

## Overview

We've migrated from manual polling to the official Praxis v1.2.0 unified Svelte integration (`@plures/praxis/svelte`), providing better performance, proper reactive subscriptions, and following Praxis best practices.

**Praxis Version**: v1.2.0 (latest)
**Key Features**: Unified builds, Svelte 5 runes native, framework-agnostic reactivity, logic engine refinements

## What Changed

### Before: Manual Polling

```typescript
// ❌ OLD: Polling every 100ms
const pollInterval = setInterval(() => {
  const appState = applicationManager.getApplicationState();
  const appData = applicationManager.getContext();
  // ... update store
}, 100);
```

**Problems:**

- Unnecessary CPU usage (polling every 100ms)
- Delayed updates (up to 100ms latency)
- Not event-driven
- Doesn't follow Praxis best practices

### After: Unified Integration

```typescript
// ✅ NEW: Reactive subscriptions via Praxis integration
import { createPraxisStore, createContextStore } from '@plures/praxis/svelte';

const engine = applicationManager.getEngine();
const praxisStore = createPraxisStore(engine);
const contextStore = createContextStore(engine);
```

**Benefits:**

- Event-driven updates (instant reactivity)
- No polling overhead
- Proper subscription management
- Follows Praxis best practices
- Type-safe store access

## Features

### 1. Reactive Store (`createPraxisStore`)

Creates a Svelte store that tracks the engine's state and provides methods to dispatch events.

```typescript
const praxisStore = createPraxisStore(engine);

// Subscribe to state changes
praxisStore.subscribe((state) => {
  console.log('State changed:', state);
});

// Dispatch events
praxisStore.dispatch([MyEvent.create({ ... })]);
```

### 2. Context Store (`createContextStore`)

Creates a derived store that extracts the context from the engine state.

```typescript
const contextStore = createContextStore(engine);

// Subscribe to context changes
contextStore.subscribe((context) => {
  console.log('Context changed:', context);
});
```

### 3. Derived Store (`createDerivedStore`)

Creates a derived store that extracts specific data from the context.

```typescript
import { createDerivedStore } from '@plures/praxis/svelte';

const workItemsStore = createDerivedStore(engine, (ctx) => ctx.workItems);
```

## Implementation Details

### Store Architecture

```
PraxisApplicationManager
  └─> getEngine() → LogicEngine<ApplicationEngineContext>
       └─> createPraxisStore() → Svelte Store
            └─> applicationState (readable wrapper)
```

### Subscription Flow

1. **Manager dispatches event** → `applicationManager.dispatch([event])`
2. **Engine processes event** → `engine.step(events)`
3. **Manager notifies listeners** → `manager.subscribe(callback)`
4. **Store updates** → `praxisStore.subscribe(callback)`
5. **Components react** → Svelte reactivity system

### Dual Subscription Strategy

We subscribe to both:

- **Manager subscription**: Ensures updates when state changes through manager methods
- **Praxis store subscription**: Ensures updates when state changes through store dispatch

This ensures we get updates from all code paths.

## Performance Improvements

### Before (Polling)

- **CPU Usage**: Constant polling every 100ms
- **Update Latency**: Up to 100ms delay
- **Memory**: Multiple interval timers

### After (Reactive)

- **CPU Usage**: Only on state changes (event-driven)
- **Update Latency**: Instant (event-driven)
- **Memory**: Proper subscription cleanup

## Migration Notes

### Breaking Changes

None - the public API remains the same. The internal implementation changed from polling to reactive subscriptions.

### New Exports

The store now exposes additional properties:

```typescript
applicationStore.praxisStore; // Direct access to Praxis store
applicationStore.contextStore; // Direct access to context store
```

### Usage in Components

No changes required - components continue to use the same API:

```typescript
import { applicationState } from './stores/applicationStore';

// Still works the same way
$: state = $applicationState;
```

## Future Enhancements

### History/Undo-Redo

The integration supports history tracking:

```typescript
import { usePraxisEngine } from '@plures/praxis/svelte';

const { undo, redo, canUndo, canRedo } = usePraxisEngine(engine, {
  enableHistory: true,
});
```

### Snapshot Support

Time-travel debugging is available:

```typescript
import { createHistoryEngine } from '@plures/praxis/svelte';

const { snapshots, goToSnapshot } = createHistoryEngine(engine);
```

## v1.2.0 Enhancements

### Framework-Agnostic Reactive Engine

For non-Svelte environments, v1.2.0 provides `createFrameworkAgnosticReactiveEngine`:

```typescript
import { createFrameworkAgnosticReactiveEngine } from '@plures/praxis';

const engine = createFrameworkAgnosticReactiveEngine({
  initialContext: { count: 0 },
});

// Subscribe to state changes
engine.subscribe((state) => {
  console.log('Count:', state.context.count);
});

// Create derived/computed values
const doubled = engine.$derived((state) => state.context.count * 2);

// Apply mutations (batched for performance)
engine.apply((state) => {
  state.context.count += 1;
});
```

### Enhanced Type Safety

v1.2.0 provides:

- Better TypeScript type inference
- Typed registry with improved generics
- Step diagnostics for debugging
- Trace-friendly rule execution

### Unified Builds

All exports now ship with:

- ESM builds (`import`)
- CJS builds (`require`)
- Type definitions (`.d.ts`)
- Browser and Node.js variants

## References

- [Praxis v1.2.0 README](https://github.com/plures/praxis)
- [Praxis Svelte Integration Documentation](https://github.com/plures/praxis)
- [Praxis v1.1.3 Release Notes](./PRAXIS_V1.1.3_UPGRADE.md)
- [Praxis Serialization Principles](./PRAXIS_SERIALIZATION_PRINCIPLES.md)
