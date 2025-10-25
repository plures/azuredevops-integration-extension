# XState v5 + Svelte: Proven Integration Patterns

## Core Problem Analysis

Your current implementation has fundamental architectural issues:

### ❌ Current Anti-Patterns

1. **Manual State Serialization**: Extension serializes machine snapshots to JSON → sends to webview → webview manually parses
   - **Problem**: Breaks XState's built-in reactivity, snapshot integrity, type safety
   - **Result**: State mismatches, manual `isInState()` helpers that fail on nested states

2. **Separation of Actor from View**: Machine runs in extension host, webview gets stale snapshots
   - **Problem**: No direct subscription to actor, relies on postMessage roundtrips
   - **Result**: Delayed updates, synchronization bugs, complexity explosion

3. **String-based State Matching**: Custom `isInState()` function parsing object paths
   - **Problem**: Reinventing XState's `state.matches()`, prone to bugs
   - **Result**: Broken nested state detection (e.g., `active.ready` not recognized)

4. **No Svelte Store Integration**: Using a manual writable store with manual updates
   - **Problem**: Not leveraging Svelte's automatic subscription cleanup and reactivity
   - **Result**: Memory leaks, stale subscriptions, manual lifecycle management

---

## ✅ Proven Architecture: Actor-First Pattern

### Principle 1: **Run the Actor Where the UI Lives**

**Don't**: Run machine in extension host, serialize snapshots to webview  
**Do**: Run the actor directly in the webview

```typescript
// ❌ ANTI-PATTERN (current approach)
// extension/activation.ts
const actor = createActor(machine).start();
webview.postMessage({ 
  type: 'syncState', 
  payload: { fsmState: actor.getSnapshot().value } 
});

// webview/store.ts
window.addEventListener('message', (event) => {
  if (event.data.type === 'syncState') {
    store.set({ value: event.data.payload.fsmState }); // ← Manual, brittle
  }
});
```

```typescript
// ✅ PROVEN PATTERN
// webview/stores/actor.ts
import { readable } from 'svelte/store';
import { createActor } from 'xstate';
import { machine } from './machine';

export const actor = createActor(machine).start();

// Native Svelte store wrapping XState actor
export const snapshot = readable(
  actor.getSnapshot(),
  (set) => {
    const subscription = actor.subscribe((snapshot) => {
      set(snapshot); // ← Automatic, type-safe
    });
    return subscription.unsubscribe;
  }
);
```

### Principle 2: **Use XState's Built-in State Matching**

**Don't**: Parse state objects manually  
**Do**: Use `snapshot.matches()` directly

```svelte
<!-- ❌ ANTI-PATTERN -->
<script>
  function isInState(path: string) {
    const segments = path.split('.');
    let current = fsmState;
    for (const seg of segments) {
      if (!(seg in current)) return false;
      current = current[seg];
    }
    return true;
  }
  
  $: isReady = isInState('active.ready'); // ← Breaks on object states
</script>

<!-- ✅ PROVEN PATTERN -->
<script>
  import { snapshot } from './stores/actor';
  
  // XState's built-in matcher handles all cases:
  // - Simple strings: 'active'
  // - Nested: { active: 'ready' }
  // - Parallel states
  // - Partial matches
  
  $: isReady = $snapshot.matches({ active: 'ready' }); // ← Always works
  $: isActive = $snapshot.matches('active'); // ← Works for parent state
  $: isAnySetup = $snapshot.matches({ active: { setup: '*' } }); // ← Wildcards
</script>
```

### Principle 3: **Use Derived Reactive Statements**

**Don't**: Create multiple boolean flags  
**Do**: Derive computed values from snapshot

```svelte
<!-- ❌ ANTI-PATTERN -->
<script>
  $: isInactiveOrActivating = isInState('inactive') || isInState('activating');
  $: isActivationFailed = isInState('activation_failed');
  $: isActiveSetup = isInState('active.setup');
  $: isActiveReady = isInState('active.ready');
  // ... 10 more flags
</script>

<!-- ✅ PROVEN PATTERN -->
<script>
  import { snapshot } from './stores/actor';
  
  // Derive only what you need, when you need it
  $: state = $snapshot;
  $: isLoading = state.matches('activating') || state.matches({ active: 'setup' });
  $: canShowUI = state.matches({ active: 'ready' });
  $: context = state.context; // Type-safe context access
</script>

{#if isLoading}
  <LoadingSpinner />
{:else if canShowUI}
  <MainUI {context} />
{/if}
```

---

## 🏗️ Recommended Architecture for VS Code Extensions

### Challenge: Extension Host vs. Webview Isolation

VS Code webviews run in a separate process from the extension host. Here's the proven solution:

### Option A: **Shared State via Message Protocol** (Recommended for VS Code)

```typescript
// extension/src/machines/applicationMachine.ts
export const applicationMachine = createMachine({
  id: 'application',
  initial: 'inactive',
  context: { connections: [], activeId: null },
  states: {
    inactive: { on: { ACTIVATE: 'activating' } },
    activating: { 
      invoke: {
        src: 'loadConnections',
        onDone: { target: 'active', actions: 'storeConnections' }
      }
    },
    active: {
      initial: 'idle',
      states: {
        idle: {},
        loading: { invoke: { src: 'fetchWorkItems' } }
      }
    }
  }
});

// extension/src/activation.ts
import { createActor } from 'xstate';
import { applicationMachine } from './machines/applicationMachine';

export function activate(context: vscode.ExtensionContext) {
  const actor = createActor(applicationMachine, {
    input: { extensionContext: context }
  }).start();

  // Create webview
  const panel = vscode.window.createWebviewPanel(/*...*/);
  
  // Forward state to webview
  actor.subscribe((snapshot) => {
    panel.webview.postMessage({
      type: 'state:update',
      snapshot: JSON.parse(JSON.stringify(snapshot)) // Serialize for postMessage
    });
  });
  
  // Forward events from webview to actor
  panel.webview.onDidReceiveMessage((message) => {
    if (message.type === 'event') {
      actor.send(message.event);
    }
  });
  
  return { actor, dispose: () => actor.stop() };
}
```

```typescript
// webview/src/stores/remoteActor.ts
import { readable, writable } from 'svelte/store';
import type { Snapshot } from 'xstate';

// Simulated actor that syncs with extension host
export function createRemoteActor<TMachine>() {
  const snapshot = writable<Snapshot<TMachine> | null>(null);
  
  // Listen for state updates from extension
  window.addEventListener('message', (event) => {
    if (event.data.type === 'state:update') {
      snapshot.set(event.data.snapshot);
    }
  });
  
  // Send events to extension host
  const vscode = acquireVsCodeApi();
  const send = (event: any) => {
    vscode.postMessage({ type: 'event', event });
  };
  
  return {
    snapshot: readable(null as Snapshot<TMachine> | null, (set) => {
      return snapshot.subscribe(set);
    }),
    send
  };
}

// Usage:
export const { snapshot, send } = createRemoteActor();
```

```svelte
<!-- webview/src/App.svelte -->
<script lang="ts">
  import { snapshot, send } from './stores/remoteActor';
  
  // XState's matches() works because snapshot is a proper XState snapshot
  $: isReady = $snapshot?.matches?.({ active: 'ready' }) ?? false;
  $: context = $snapshot?.context ?? {};
</script>

{#if $snapshot?.matches('activating')}
  <p>Loading...</p>
{:else if isReady}
  <button on:click={() => send({ type: 'REFRESH' })}>
    Refresh
  </button>
  <ul>
    {#each context.workItems as item}
      <li>{item.title}</li>
    {/each}
  </ul>
{/if}
```

---

## 🎯 Action Plan for Your Project

### Step 1: Fix State Matching (Immediate)

Replace custom `isInState()` with XState's built-in `matches()`:

```diff
- function isInState(path: string): boolean {
-   const segments = path.split('.');
-   let current: any = fsmState;
-   for (const seg of segments) {
-     if (!(seg in current)) return false;
-     current = current[seg];
-   }
-   return true;
- }

+ // Use XState's built-in matcher
+ $: isActiveReady = $snapshot.matches({ active: 'ready' });
+ $: isActivating = $snapshot.matches('activating');
```

### Step 2: Ensure Proper Snapshot Structure

The extension must send **full XState snapshots**, not just `{ value, context }`:

```typescript
// ❌ WRONG: Partial snapshot
panel.webview.postMessage({
  type: 'syncState',
  payload: {
    fsmState: actor.getSnapshot().value,
    context: actor.getSnapshot().context
  }
});

// ✅ CORRECT: Full snapshot (includes matches, can, etc.)
panel.webview.postMessage({
  type: 'syncState',
  snapshot: actor.getSnapshot() // Complete snapshot object
});
```

### Step 3: Update Webview Store

```typescript
// webview/fsmSnapshotStore.ts
import { writable } from 'svelte/store';
import type { Snapshot } from 'xstate';

export const applicationSnapshot = writable<Snapshot<any> | null>(null);

window.addEventListener('message', (event) => {
  if (event.data.type === 'syncState') {
    // Store the complete snapshot, not just { value, context }
    applicationSnapshot.set(event.data.snapshot);
  }
});
```

### Step 4: Simplify Component Logic

```svelte
<!-- App.svelte -->
<script>
  import { applicationSnapshot } from './fsmSnapshotStore';
  
  // No custom helpers needed
  $: state = $applicationSnapshot;
  $: isLoading = state?.matches?.('activating') || state?.matches?.({ active: 'setup' });
  $: showMainUI = state?.matches?.({ active: 'ready' });
</script>

{#if !state}
  <p>Initializing...</p>
{:else if isLoading}
  <p>Loading connections...</p>
{:else if showMainUI}
  <MainUI context={state.context} />
{:else}
  <DebugView {state} />
{/if}
```

---

## 📚 Additional Resources

- [XState v5 Docs - State Matching](https://stately.ai/docs/transitions#checking-state)
- [Svelte Stores](https://svelte.dev/docs/svelte-store)
- [XState + Svelte Official Integration](https://stately.ai/docs/xstate-svelte)
- [VS Code Webview Message Passing](https://code.visualstudio.com/api/extension-guides/webview#passing-messages-from-an-extension-to-a-webview)

---

## 🔑 Key Takeaways

1. **Never manually parse XState state objects** – use `snapshot.matches()`
2. **Send complete snapshots** from extension to webview, not partial objects
3. **Leverage Svelte's reactivity** – `$:` statements automatically rerun when stores change
4. **Minimize custom state logic** – XState handles complexity, let it do its job
5. **Test state matching** in isolation before integrating into templates

---

## Example: Complete Working Implementation

See `examples/vscode-extension-xstate/` for a minimal, working example demonstrating:
- Extension host FSM actor
- Webview snapshot synchronization
- Type-safe state matching
- Proper cleanup and lifecycle management
