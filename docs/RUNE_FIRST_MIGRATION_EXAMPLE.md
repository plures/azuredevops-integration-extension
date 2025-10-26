# Rune-First Migration Example

This document shows how to migrate from the current FSM snapshot store approach to the new Svelte 5 rune-first helpers with pub/sub broker pattern.

## Table of Contents
1. [Overview](#overview)
2. [Current Approach](#current-approach)
3. [New Rune-First Approach](#new-rune-first-approach)
4. [Migration Steps](#migration-steps)
5. [Complete Example](#complete-example)
6. [Optimistic Updates](#optimistic-updates)
7. [Troubleshooting](#troubleshooting)

---

## Overview

**Goal**: Migrate webview components from custom store-based FSM state to Svelte 5 rune-first helpers with deterministic UI.

**Benefits**:
- Native Svelte 5 runes (better performance, cleaner code)
- Deterministic UI (machine owns all UI state)
- Pub/sub broker pattern (retained snapshots, automatic replay)
- Optimistic updates (snappy UX with automatic reconciliation)
- subseq/pubseq reconciliation (no lost updates)

---

## Current Approach

### Current `App.svelte` (Simplified)

```svelte
<script lang="ts">
  import { applicationSnapshot } from './fsmSnapshotStore.js';
  
  // Reactive FSM state derived from snapshot store
  $: snapshot = $applicationSnapshot;
  $: context = snapshot.context;
  $: matches = snapshot.matches || {};
  
  // Get VS Code API
  const vscode = (window as any).__vscodeApi;
  
  // Send events back to extension
  function sendEvent(event: any) {
    if (vscode) {
      vscode.postMessage({ type: 'fsmEvent', event });
    }
  }
  
  // Derive UI state from machine states
  $: isActiveReady = matches['active.ready'];
  $: viewMode = context?.viewMode || 'list';
</script>

<main>
  {#if isActiveReady}
    <button on:click={() => sendEvent({ type: 'REFRESH_DATA' })}>
      Refresh
    </button>
    <button on:click={() => sendEvent({ type: 'TOGGLE_VIEW' })}>
      {viewMode === 'list' ? 'Kanban' : 'List'}
    </button>
  {/if}
</main>
```

**Issues with Current Approach**:
1. Manual message passing (`vscode.postMessage`)
2. No automatic snapshot retention/replay
3. UI logic derived in component (not deterministic)
4. No optimistic updates
5. No subseq/pubseq reconciliation
6. Not using Svelte 5 runes

---

## New Rune-First Approach

### New `App.svelte` (Rune-First)

```svelte
<script lang="ts">
  import { state as $state, effect as $effect } from 'svelte/runes';
  import { useApplicationMachine, matchesState, createOptimisticReducer } from './useApplicationMachine.runes';
  
  // Initialize rune-first machine connection
  const runes = { state: $state, effect: $effect };
  const { state, send, connected, pendingCount } = useApplicationMachine(runes, {
    optimistic: { reducer: createOptimisticReducer() },
    onConnectionChange: (isConnected) => {
      console.log('[App] Connection status:', isConnected);
    },
  });
  
  // Request initial snapshot on mount
  $effect(() => {
    if ($state(connected)) {
      // Connection established, snapshot will be auto-replayed by broker
    }
  });
  
  // Extract current snapshot (reactive via runes)
  $: snapshot = $state(state);
  $: context = snapshot?.context;
  $: ui = context?.ui;
  
  // Use pre-computed matches from machine
  $: isActiveReady = matchesState(snapshot, 'active.ready');
</script>

<main>
  {#if !$state(connected)}
    <div class="loading">Connecting to extension...</div>
  {:else if isActiveReady}
    <!-- Render from deterministic UI state -->
    <button onclick={() => send({ type: 'REFRESH_DATA' })}>
      {ui?.buttons?.refreshData?.label || 'Refresh'}
      {#if ui?.loading?.workItems}
        <span class="spinner"></span>
      {/if}
    </button>
    
    <button onclick={() => send({ type: 'TOGGLE_VIEW' })}>
      {ui?.buttons?.toggleView?.label || 'Toggle View'}
    </button>
    
    {#if $state(pendingCount) > 0}
      <div class="pending-indicator">
        {$state(pendingCount)} pending update(s)
      </div>
    {/if}
  {/if}
</main>

<style>
  .spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid var(--vscode-button-foreground);
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .pending-indicator {
    font-size: 0.8em;
    opacity: 0.7;
  }
</style>
```

**Benefits of New Approach**:
1. ✅ Automatic pub/sub connection via VS Code adapter
2. ✅ Retained snapshots auto-replayed on subscribe
3. ✅ UI state from machine context (deterministic)
4. ✅ Optimistic updates for snappy UX
5. ✅ Automatic subseq/pubseq reconciliation
6. ✅ Native Svelte 5 runes

---

## Migration Steps

### Step 1: Update Imports

**Before**:
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { applicationSnapshot } from './fsmSnapshotStore.js';
</script>
```

**After**:
```svelte
<script lang="ts">
  import { state as $state, effect as $effect } from 'svelte/runes';
  import { useApplicationMachine, matchesState, createOptimisticReducer } from './useApplicationMachine.runes';
</script>
```

### Step 2: Initialize Machine Connection

**Before**:
```svelte
$: snapshot = $applicationSnapshot;
const vscode = (window as any).__vscodeApi;

function sendEvent(event: any) {
  vscode.postMessage({ type: 'fsmEvent', event });
}
```

**After**:
```svelte
const runes = { state: $state, effect: $effect };
const { state, send, connected, pendingCount } = useApplicationMachine(runes, {
  optimistic: { reducer: createOptimisticReducer() },
});

$: snapshot = $state(state);
```

### Step 3: Update Event Handlers

**Before**:
```svelte
<button on:click={() => sendEvent({ type: 'REFRESH_DATA' })}>
```

**After**:
```svelte
<button onclick={() => send({ type: 'REFRESH_DATA' })}>
```

### Step 4: Render from Deterministic UI State

**Before** (Derived UI):
```svelte
<button on:click={...}>
  {$state.matches('loading') ? 'Loading...' : 'Refresh'}
</button>
```

**After** (Deterministic UI):
```svelte
<button onclick={...}>
  {snapshot?.context?.ui?.buttons?.refreshData?.label || 'Refresh'}
  {#if snapshot?.context?.ui?.loading?.workItems}
    <span class="spinner"></span>
  {/if}
</button>
```

### Step 5: Update State Matching

**Before**:
```svelte
$: isActiveReady = matches['active.ready'];
```

**After**:
```svelte
$: isActiveReady = matchesState(snapshot, 'active.ready');
```

---

## Complete Example

### Example Component: `WorkItemsPanel.svelte`

```svelte
<script lang="ts">
  import { state as $state, effect as $effect } from 'svelte/runes';
  import { useApplicationMachine, matchesState } from './useApplicationMachine.runes';
  import WorkItemList from './components/WorkItemList.svelte';
  import KanbanBoard from './components/KanbanBoard.svelte';
  
  // Initialize machine connection with optimistic reducer
  const runes = { state: $state, effect: $effect };
  const { state, send, connected, pendingCount } = useApplicationMachine(runes, {
    optimistic: {
      reducer: (snapshot, event) => {
        // Optimistic reducer (UI-only changes)
        if (event.type === 'REFRESH_DATA') {
          return {
            ...snapshot,
            context: {
              ...snapshot.context,
              ui: {
                ...snapshot.context.ui,
                loading: { ...snapshot.context.ui?.loading, workItems: true },
              },
            },
          };
        }
        return snapshot;
      },
    },
  });
  
  // Reactive state
  $: snapshot = $state(state);
  $: context = snapshot?.context;
  $: workItems = context?.pendingWorkItems?.workItems || [];
  $: viewMode = context?.viewMode || 'list';
  $: ui = context?.ui;
  
  // State matches
  $: isReady = matchesState(snapshot, 'active.ready');
  $: isLoading = ui?.loading?.workItems || false;
</script>

<div class="work-items-panel">
  {#if !$state(connected)}
    <div class="status">Connecting...</div>
  {:else if !isReady}
    <div class="status">Initializing...</div>
  {:else}
    <div class="toolbar">
      <button 
        onclick={() => send({ type: 'REFRESH_DATA' })}
        disabled={isLoading}
      >
        {ui?.buttons?.refreshData?.label || 'Refresh'}
        {#if isLoading}
          <span class="spinner" />
        {/if}
      </button>
      
      <button onclick={() => send({ type: 'TOGGLE_VIEW' })}>
        {ui?.buttons?.toggleView?.label || (viewMode === 'list' ? 'Kanban' : 'List')}
      </button>
      
      {#if $state(pendingCount) > 0}
        <span class="pending">
          ({$state(pendingCount)} pending)
        </span>
      {/if}
    </div>
    
    {#if viewMode === 'kanban'}
      <KanbanBoard {workItems} {send} />
    {:else}
      <WorkItemList {workItems} {send} />
    {/if}
  {/if}
</div>

<style>
  .toolbar {
    display: flex;
    gap: 8px;
    padding: 8px;
    border-bottom: 1px solid var(--vscode-panel-border);
  }
  
  .pending {
    font-size: 0.85em;
    opacity: 0.7;
  }
  
  .spinner {
    /* ... spinner styles ... */
  }
</style>
```

---

## Optimistic Updates

### Custom Optimistic Reducer

For specific UI interactions, create a custom optimistic reducer:

```typescript
// customOptimisticReducer.ts
import type { ApplicationSnapshot, ApplicationEvent } from '../fsm/machines/applicationMachine';

export function customOptimisticReducer(
  snapshot: ApplicationSnapshot,
  event: ApplicationEvent
): ApplicationSnapshot {
  const ctx = { ...snapshot.context };

  switch (event.type) {
    case 'REFRESH_DATA':
      // Optimistically show loading spinner
      return {
        ...snapshot,
        context: {
          ...ctx,
          ui: {
            ...ctx.ui,
            buttons: {
              ...ctx.ui?.buttons,
              refreshData: {
                label: 'Refreshing...',
                loading: true,
                disabled: true,
              },
            },
            loading: {
              ...ctx.ui?.loading,
              workItems: true,
            },
          },
        },
      };

    case 'WORK_ITEM_SELECTED':
      // Optimistically highlight selected item
      // (Will be overwritten by authoritative snapshot)
      return {
        ...snapshot,
        context: {
          ...ctx,
          ui: {
            ...ctx.ui,
            statusMessage: {
              text: `Loading work item #${(event as any).workItemId}...`,
              type: 'info',
            },
          },
        },
      };

    default:
      return snapshot;
  }
}
```

**Usage**:
```svelte
<script lang="ts">
  import { customOptimisticReducer } from './customOptimisticReducer';
  
  const { state, send } = useApplicationMachine(runes, {
    optimistic: { reducer: customOptimisticReducer },
  });
</script>
```

**Best Practices**:
1. Keep optimistic reducer **small** and **deterministic**
2. Only modify **UI state** (not business logic)
3. Expect authoritative snapshot to **overwrite** optimistic changes
4. Use for **transient feedback** (loading, selections, etc.)

---

## Troubleshooting

### Issue: Snapshots Not Arriving

**Problem**: Component shows "Connecting..." forever.

**Solution**:
1. Check extension host broker is publishing snapshots:
   ```typescript
   broker.publish(`machine:application:snapshot`, { 
     snapshot: { value: state.value, context: state.context },
     echoSubseq: lastSubseq
   }, { retain: true });
   ```

2. Verify webview is registered as subscriber:
   ```typescript
   broker.addSubscriber(webviewPanel);
   ```

3. Check browser console for PubSub adapter errors

### Issue: Events Not Acknowledged

**Problem**: `pendingCount` keeps growing, events never cleared.

**Solution**:
1. Ensure broker echoes `echoSubseq` in snapshots:
   ```typescript
   broker.publish(topic, {
     snapshot: { ... },
     echoSubseq: eventSubseq  // Must echo the subseq from event!
   }, { retain: true });
   ```

2. Check extension host is listening to events topic:
   ```typescript
   broker.on('publish', ({ topic, payload }) => {
     if (topic === 'machine:application:events') {
       const { event, subseq } = payload;
       // Process event, then echo subseq in next snapshot
     }
   });
   ```

### Issue: Stale Snapshots

**Problem**: UI shows old data even after updates.

**Solution**:
1. Verify monotonic `pubseq` increments:
   ```typescript
   // Broker should increment pubseq for every publish
   broker.publish(topic, payload, { retain: true });
   ```

2. Check for pubseq warnings in console:
   ```
   [useRemoteMachineRunes] Ignoring stale snapshot. pubseq 5 <= lastPubseq 10
   ```

3. Ensure only one broker instance exists (use `getGlobalBroker()`)

### Issue: Optimistic Updates Stuck

**Problem**: Optimistic UI changes don't revert to authoritative state.

**Solution**:
1. Ensure optimistic reducer returns **new object** (not mutated):
   ```typescript
   // ❌ WRONG
   reducer: (snapshot, event) => {
     snapshot.context.ui.loading = true;  // Mutation!
     return snapshot;
   }
   
   // ✅ CORRECT
   reducer: (snapshot, event) => ({
     ...snapshot,
     context: {
       ...snapshot.context,
       ui: { ...snapshot.context.ui, loading: { workItems: true } }
     }
   });
   ```

2. Check authoritative snapshot overwrites optimistic state
3. Verify pending events are being cleared when `echoSubseq` arrives

---

## Next Steps

1. ✅ Review this migration example
2. ✅ Test rune-first approach with a small component
3. ✅ Update extension host to use PubSubBroker
4. ✅ Migrate remaining components incrementally
5. ✅ Add E2E tests for subseq/pubseq reconciliation

---

## References

- [Migration Instructions](../src/fsm/xstate-svelte/migration%20instructions.md)
- [PubSubBroker Implementation](../src/fsm/services/PubSubBroker.ts)
- [VS Code PubSub Adapter](../src/webview/vscode-pubsub-adapter.ts)
- [Rune-First Helpers](../src/fsm/xstate-svelte/src/useRemoteMachine.runes.ts)

