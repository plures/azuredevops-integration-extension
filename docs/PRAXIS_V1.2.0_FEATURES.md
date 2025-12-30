# Praxis v1.2.0 Features & Integration

## Overview

We've successfully upgraded to and integrated **Praxis v1.2.0**, the latest version of the Praxis framework. This document highlights the new features and how we're leveraging them.

## What's New in v1.2.0

### 1. Framework-Agnostic Reactive Engine ⭐ NEW

**Feature**: `createFrameworkAgnosticReactiveEngine` - Proxy-based reactive engine for use without Svelte.

**Use Case**: For Node.js-only code paths in the extension host (not webview).

**Example**:
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

**Status**: Available for future use in extension host code paths.

### 2. Enhanced Svelte 5 Runes Support ⭐ ENHANCED

**Feature**: Better integration with Svelte 5 runes (`$state`, `$derived`, `$effect`).

**Current Usage**: We're using `createPraxisStore` and `createContextStore` which work seamlessly with Svelte 5.

**Available Features**:
- `usePraxisEngine` - Runes-based composable with history support
- `usePraxisContext` - Direct context access with runes
- `usePraxisSubscription` - Subscription with auto-cleanup

**Example**:
```svelte
<script lang="ts">
  import { usePraxisEngine } from '@plures/praxis/svelte';
  
  const engine = createMyEngine();
  const { context, dispatch, undo, redo } = usePraxisEngine(engine, {
    enableHistory: true,
    maxHistorySize: 50,
  });
</script>

<div>
  <p>User: {context.currentUser || 'Guest'}</p>
  <button onclick={() => dispatch([Login.create({ username: 'alice' })])}>
    Login
  </button>
  <button onclick={undo} disabled={!canUndo}>⟲ Undo</button>
</div>
```

**Status**: Available for future enhancement in webview components.

### 3. Unified Builds & Exports ⭐ NEW

**Feature**: All exports now ship with ESM, CJS, and type definitions.

**Benefits**:
- Better tree-shaking
- Proper module resolution
- TypeScript support out of the box
- Browser and Node.js variants

**Exports**:
- `@plures/praxis` → main engine
- `@plures/praxis/svelte` → Svelte 5 integrations
- `@plures/praxis/schema` → Schema types
- `@plures/praxis/component` → Component generator
- `@plures/praxis/cloud` → Cloud relay APIs

**Status**: ✅ Already benefiting from unified builds.

### 4. Logic Engine Refinements ⭐ ENHANCED

**Features**:
- **Typed Registry**: Better type inference and generics
- **Step Diagnostics**: Enhanced debugging capabilities
- **Trace-Friendly Rules**: Better rule execution tracking

**Status**: ✅ Already benefiting from improved type safety.

## Our Current Implementation

### What We're Using

1. **Unified Svelte Integration** (`@plures/praxis/svelte`):
   - `createPraxisStore` - Reactive Svelte store
   - `createContextStore` - Direct context access
   - Proper subscription management

2. **Logic Engine**:
   - `createPraxisEngine` - Core engine creation
   - `PraxisRegistry` - Rule and constraint registry
   - Type-safe rules and events

### What We Could Add

1. **History/Undo-Redo**:
   - Enable `usePraxisEngine` with `enableHistory: true`
   - Add undo/redo buttons to UI
   - Time-travel debugging

2. **Derived Stores**:
   - Use `createDerivedStore` for specific data extraction
   - Better performance for computed values
   - Cleaner component code

3. **Framework-Agnostic Engine**:
   - Use in extension host for non-Svelte code paths
   - Better reactivity in Node.js environment
   - Proxy-based reactivity without Svelte dependency

## Performance Improvements

### Before (v1.1.3)
- Manual polling every 100ms
- Up to 100ms update latency
- Constant CPU usage

### After (v1.2.0)
- Event-driven updates (instant)
- No polling overhead
- Proper subscription management
- Better type safety and inference

## Migration Notes

### Breaking Changes
**None** - v1.2.0 is backward compatible with v1.1.3.

### New Features Available
- Framework-agnostic reactive engine
- Enhanced Svelte 5 runes support
- Better type inference
- Unified builds

### Recommended Next Steps

1. **Consider History/Undo-Redo**:
   - Evaluate if undo/redo would benefit users
   - Implement `usePraxisEngine` with history enabled
   - Add UI controls for undo/redo

2. **Optimize with Derived Stores**:
   - Replace manual derived stores with `createDerivedStore`
   - Better performance for computed values
   - Cleaner component code

3. **Explore Framework-Agnostic Engine**:
   - Evaluate extension host code paths
   - Consider using framework-agnostic engine for Node.js-only code
   - Better reactivity without Svelte dependency

## References

- [Praxis v1.2.0 README](https://github.com/plures/praxis)
- [Praxis Unified Integration Documentation](./PRAXIS_UNIFIED_INTEGRATION.md)
- [Praxis v1.2.0 Integration Summary](./PRAXIS_V1.2.0_INTEGRATION_SUMMARY.md)
- [Praxis Serialization Principles](./PRAXIS_SERIALIZATION_PRINCIPLES.md)

## Status

✅ **COMPLETE** - v1.2.0 successfully integrated and documented.

**Version**: v1.2.0  
**Upgrade Date**: 2024-12-30  
**Breaking Changes**: None  
**New Features Available**: Framework-agnostic engine, enhanced runes, unified builds

