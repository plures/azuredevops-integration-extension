# Root Cause Analysis: State Matching Failure

## 🐛 The Critical Bug

### Location: `src/activation.ts:1766`

```typescript
const serializableState = {
  fsmState: snapshot.value, // ← BUG: Only sending state.value
  context: getSerializableContext(snapshot.context),
};
panel.webview.postMessage({
  type: 'syncState',
  payload: serializableState,
});
```

### What's Wrong

You're only sending `snapshot.value` and `snapshot.context` to the webview, but **XState snapshots contain critical methods** like:

- `snapshot.matches()`
- `snapshot.can()`
- `snapshot.hasTag()`
- Internal state metadata

### Why It Fails

```svelte
<!-- webview/App.svelte -->
<script>
  $: snapshot = $applicationSnapshot; // ← Receives { value, context }
  $: isReady = snapshot.matches({ active: 'ready' }); // ← FAILS: matches is undefined!
</script>
```

Your webview receives a plain object `{ value: {...}, context: {...} }`, not a proper XState snapshot.

When Svelte tries to call `$snapshot.matches()`, it fails because plain objects don't have that method.

---

## 🔍 Why Your Manual `isInState()` Was Needed

Your custom state matcher was a workaround for the missing `snapshot.matches()`:

```typescript
function isInState(path: string): boolean {
  const state = fsmState; // Only has the .value property
  // Manually parse the object structure...
}
```

**This is why it broke on nested states** – you were reinventing XState's complex state matching logic.

---

## ✅ The Fix

### Option 1: Send Full Snapshot (Recommended)

```typescript
// src/activation.ts
appActor.subscribe((snapshot: any) => {
  if (panel && snapshot) {
    // Serialize the ENTIRE snapshot, preserving structure
    const serializedSnapshot = JSON.parse(JSON.stringify(snapshot));

    panel.webview.postMessage({
      type: 'syncState',
      snapshot: serializedSnapshot, // ← Full snapshot
    });
  }
});
```

```typescript
// webview/fsmSnapshotStore.ts
window.addEventListener('message', (event) => {
  if (event.data.type === 'syncState') {
    applicationSnapshot.set(event.data.snapshot); // ← Complete snapshot
  }
});
```

**Problem**: `snapshot.matches()` is a function – it won't survive JSON serialization.

### Option 2: Reconstruct Snapshot in Webview (Workaround)

Since XState snapshots have methods that can't be serialized, you need to recreate them:

```typescript
// webview/stores/snapshotReconstructor.ts
import { createActor } from 'xstate';
import { applicationMachine } from '../machines/applicationMachine'; // Must be available in webview

function reconstructSnapshot(serializedState: any) {
  // Create a temporary actor to get a proper snapshot
  const tempActor = createActor(applicationMachine);
  tempActor.start();

  // Transition to the received state
  // This is complex and error-prone – NOT RECOMMENDED
}
```

**Problem**: This requires duplicating the entire machine definition in the webview.

### Option 3: Pre-Compute State Checks (Simplest)

Since you can't serialize `snapshot.matches()`, compute all needed booleans in the extension and send those:

```typescript
// src/activation.ts
appActor.subscribe((snapshot: any) => {
  if (panel && snapshot) {
    panel.webview.postMessage({
      type: 'syncState',
      state: {
        value: snapshot.value,
        context: getSerializableContext(snapshot.context),
        // Pre-compute all state checks
        matches: {
          inactive: snapshot.matches('inactive'),
          activating: snapshot.matches('activating'),
          activation_failed: snapshot.matches('activation_failed'),
          active: snapshot.matches('active'),
          'active.setup': snapshot.matches({ active: 'setup' }),
          'active.ready': snapshot.matches({ active: 'ready' }),
          'active.ready.idle': snapshot.matches({ active: { ready: 'idle' } }),
          'active.ready.managingConnections': snapshot.matches({
            active: { ready: 'managingConnections' },
          }),
        },
        // Also include can() checks if needed
        can: {
          ACTIVATE: snapshot.can({ type: 'ACTIVATE' }),
          DEACTIVATE: snapshot.can({ type: 'DEACTIVATE' }),
        },
      },
    });
  }
});
```

```svelte
<!-- webview/App.svelte -->
<script>
  import { applicationSnapshot } from './fsmSnapshotStore';

  $: state = $applicationSnapshot;
  $: matches = state?.matches || {};

  // Direct boolean access – simple and reliable
  $: isReady = matches['active.ready'];
  $: isActivating = matches.activating;
</script>

{#if isActivating}
  <p>Loading...</p>
{:else if isReady}
  <MainUI />
{/if}
```

---

## 🎯 Recommended Solution

**Use Option 3** (pre-compute state checks) because:

1. ✅ **Simple**: No complex reconstruction logic
2. ✅ **Type-safe**: Extension can validate all state paths
3. ✅ **Performant**: Minimal overhead
4. ✅ **Debuggable**: Can log exact booleans being sent

### Implementation Steps

1. **Update `src/activation.ts` snapshot handler**:

   ```typescript
   const computedMatches = {
     inactive: snapshot.matches('inactive'),
     activating: snapshot.matches('activating'),
     'active.setup': snapshot.matches({ active: 'setup' }),
     'active.ready': snapshot.matches({ active: 'ready' }),
     // Add all states you check in the UI
   };

   panel.webview.postMessage({
     type: 'syncState',
     state: {
       value: snapshot.value,
       context: getSerializableContext(snapshot.context),
       matches: computedMatches,
     },
   });
   ```

2. **Update `webview/fsmSnapshotStore.ts`**:

   ```typescript
   window.addEventListener('message', (event) => {
     if (event.data.type === 'syncState') {
       applicationSnapshot.set({
         value: event.data.state.value,
         context: event.data.state.context,
         matches: event.data.state.matches,
       });
     }
   });
   ```

3. **Simplify `webview/App.svelte`**:

   ```svelte
   <script>
     $: state = $applicationSnapshot;
     $: m = state?.matches || {};
   </script>

   {#if m.activating}
     <p>Loading...</p>
   {:else if m['active.ready']}
     <MainUI />
   {/if}
   ```

---

## 📊 Comparison of Solutions

| Approach               | Pros              | Cons                         | Verdict                 |
| ---------------------- | ----------------- | ---------------------------- | ----------------------- |
| Send full snapshot     | Native XState API | Methods don't serialize      | ❌ Won't work           |
| Reconstruct in webview | Proper snapshots  | Requires machine duplication | ⚠️ Too complex          |
| Pre-compute booleans   | Simple, reliable  | Manual state list            | ✅ **Best for VS Code** |
| Run actor in webview   | True reactive     | Can't access extension APIs  | ❌ Not viable           |

---

## 🚀 Next Steps

1. **Immediate**: Replace `isInState()` with `state.matches.<path>`
2. **Short-term**: Implement pre-computed state checks
3. **Long-term**: Consider state machine per layer:
   - Extension host: Connection/auth machine
   - Webview: UI state machine
   - Sync via events, not full snapshots
