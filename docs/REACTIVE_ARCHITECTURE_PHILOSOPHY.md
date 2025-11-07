# Reactive Architecture Philosophy

## Core Design Principles

### 1. Separation of Concerns

**Svelte (Webview UI Layer)**

- **Controls**: All UI rendering, user interactions, and visual state
- **Informs**: Sends user actions and UI state changes to FSM
- **Reacts**: Automatically updates when FSM state/context changes
- **No Business Logic**: UI components are purely presentational

**FSM (Extension Host State Layer)**

- **Manages**: All application state, business logic, and side effects
- **Updates**: State/context changes trigger reactive UI updates
- **Receives**: User actions and UI state notifications from Svelte
- **No UI Control**: FSM never directly controls UI rendering or display

### 2. Reactive Paradigm (Not Messaging)

**State/Context Updates Drive UI**

- FSM state changes → Context updates → UI automatically reacts
- No explicit "update UI" messages needed
- UI subscribes to state/context and reacts reactively
- Single source of truth: FSM state/context

**User Actions Inform FSM**

- User interactions → Svelte sends action events → FSM processes → State updates
- FSM doesn't control UI, it responds to user actions
- UI state changes (like toggles) are local to Svelte, FSM is notified for persistence

**No Command Messages**

- ❌ Don't send: `{ type: 'UPDATE_WORK_ITEMS', workItems: [...] }`
- ✅ Do: Update FSM context with work items → UI reacts automatically
- ❌ Don't send: `{ type: 'SHOW_ERROR', error: '...' }`
- ✅ Do: Update FSM context with error → UI reacts automatically

### 3. Unidirectional Data Flow

```
User Action (Svelte)
    ↓
Action Event (postMessage)
    ↓
FSM Processes Event
    ↓
State/Context Updates
    ↓
State Subscription Fires
    ↓
syncState Message (full state)
    ↓
Svelte Store Updates
    ↓
UI Reacts Automatically
```

## Current Architecture

### Extension Host → Webview

**Reactive State Sync (✅ Correct)**

```typescript
// FSM state changes → subscription fires → syncState message
panel.webview.postMessage({
  type: 'syncState',
  payload: {
    fsmState: snapshot.value,
    context: serializedContext, // Full context, not partial updates
    matches: snapshot.matches,
  },
});
```

**Anti-Pattern: Partial State Messages (❌ Avoid)**

```typescript
// ❌ DON'T: Send partial updates via separate messages
panel.webview.postMessage({ type: 'work-items-update', workItems: [...] });
panel.webview.postMessage({ type: 'workItemsError', error: '...' });
panel.webview.postMessage({ type: 'syncTimerState', payload: {...} });

// ✅ DO: Include all updates in context, send via syncState
// Context already includes: workItems, workItemsError, timerState
// Single syncState message updates everything reactively
```

### Webview → Extension Host

**User Actions (✅ Correct)**

```typescript
// Svelte sends user actions to FSM
vscode.postMessage({
  type: 'START_TIMER',
  workItemId: '123',
});

// FSM processes action → updates state → UI reacts
```

**UI State Notifications (✅ Correct)**

```typescript
// Svelte controls UI state locally, notifies FSM for persistence
vscode.postMessage({
  type: 'TOGGLE_DEBUG_VIEW',
  debugViewVisible: true, // Svelte already toggled, just informing FSM
});

// FSM updates context → syncState → UI already updated, but state persists
```

## Implementation Guidelines

### 1. FSM Context Updates

**All UI-visible state must be in FSM context:**

- `workItems` - Work items list
- `workItemsError` - Error messages
- `timerState` - Timer status
- `deviceCodeSession` - Auth flow state
- `debugViewVisible` - Debug panel visibility
- `connections` - Connection list
- `activeConnectionId` - Active connection
- Any other state the UI needs to display

**When to update context:**

- ✅ When work items are loaded → Update `context.pendingWorkItems`
- ✅ When an error occurs → Update `context.lastError` or `context.workItemsError`
- ✅ When timer starts/stops → Update `context.timerState`
- ✅ When auth flow begins → Update `context.deviceCodeSession`

**How UI gets updates:**

- FSM context changes → State subscription fires → `syncState` message → Svelte store updates → UI reacts

### 2. Svelte Component Patterns

**Reactive State Reading**

```svelte
<script lang="ts">
  const snapshot = $derived($applicationSnapshot);
  const context = $derived(snapshot.context);
  const workItems = $derived(context?.pendingWorkItems?.workItems || []);
  const error = $derived(context?.workItemsError);

  // UI automatically updates when context changes
</script>

{#if error}
  <div class="error">{error}</div>
{/if}
```

**User Action Handling**

```svelte
<script lang="ts">
  function handleRefresh() {
    // Send action to FSM, don't update UI directly
    vscode.postMessage({ type: 'REFRESH_DATA' });
    // FSM will update context → syncState → UI reacts
  }
</script>

<button onclick={handleRefresh}>Refresh</button>
```

**Local UI State (with FSM notification)**

```svelte
<script lang="ts">
  // Svelte controls this locally
  let localDebugVisible = $state(false);

  // Sync with FSM context for initial state
  $effect(() => {
    if (context?.debugViewVisible !== undefined) {
      localDebugVisible = context.debugViewVisible;
    }
  });

  function toggleDebug() {
    localDebugVisible = !localDebugVisible;
    // Notify FSM of change (for persistence), but UI already updated
    vscode.postMessage({
      type: 'TOGGLE_DEBUG_VIEW',
      debugViewVisible: localDebugVisible
    });
  }
</script>

{#if localDebugVisible}
  <div class="debug-panel">...</div>
{/if}
```

### 3. Message Types

**Allowed Messages: Extension → Webview**

- `syncState` - Full state/context sync (reactive update)
- `ready` - Initial connection established

**Allowed Messages: Webview → Extension**

- User action events: `START_TIMER`, `STOP_TIMER`, `REFRESH_DATA`, `SET_QUERY`, etc.
- UI state notifications: `TOGGLE_DEBUG_VIEW`, etc.
- Command requests: `OPEN_SETTINGS` (triggers VS Code command)

**Prohibited Messages**

- ❌ Partial state updates (`work-items-update`, `syncTimerState`, `workItemsError`)
- ❌ UI control commands (`showError`, `hidePanel`, `updateButton`)
- ❌ Direct data pushes (include in context instead)

## Migration Checklist

### Remove Partial State Messages

- [ ] Remove `syncTimerState` message → Include `timerState` in context
- [ ] Remove `work-items-update` message → Include `workItems` in context
- [ ] Remove `workItemsError` message → Include `workItemsError` in context
- [ ] Remove `workItemsLoaded` message → Context update clears error automatically

### Ensure All UI State in Context

- [ ] Verify all displayed data is in FSM context
- [ ] Verify all error states are in FSM context
- [ ] Verify all loading states are in FSM context
- [ ] Verify all UI visibility flags are in FSM context

### Update Svelte Components

- [ ] Components read from `context` reactively (not from messages)
- [ ] Components send action events (not state updates)
- [ ] Local UI state notifies FSM (for persistence)
- [ ] No direct message handlers for state updates

## Benefits

1. **Predictability**: Single source of truth (FSM context)
2. **Reactivity**: UI automatically updates when state changes
3. **Simplicity**: No complex message routing or partial updates
4. **Maintainability**: Clear separation of concerns
5. **Testability**: FSM logic independent of UI
6. **Performance**: Single state sync instead of multiple messages

## Examples

### ✅ Correct: Reactive State Update

```typescript
// FSM action updates context
assign({
  pendingWorkItems: {
    workItems: newWorkItems,
    query: query,
    connectionId: connectionId,
  },
  workItemsError: undefined, // Clear error on success
});

// State subscription automatically sends syncState
// Svelte store updates → UI reacts
```

### ❌ Incorrect: Direct Message Update

```typescript
// ❌ DON'T: Send direct update message
context.webviewPanel.webview.postMessage({
  type: 'work-items-update',
  workItems: newWorkItems,
});

// ✅ DO: Update context, let syncState handle it
assign({ pendingWorkItems: { workItems: newWorkItems } });
```

### ✅ Correct: User Action Flow

```svelte
<!-- Svelte: User clicks refresh -->
<button onclick={() => vscode.postMessage({ type: 'REFRESH_DATA' })}>
  Refresh
</button>

<!-- FSM: Processes action, updates context -->
on: {
  REFRESH_DATA: {
    actions: ['loadData']  // Updates context.pendingWorkItems
  }
}

<!-- Result: syncState fires → UI updates automatically -->
```

### ❌ Incorrect: UI Controls FSM State

```svelte
<!-- ❌ DON'T: UI directly updates its own state -->
<button onclick={() => {
  workItems = fetchWorkItems();  // UI managing state
}}>Refresh</button>

<!-- ✅ DO: UI sends action, FSM updates state -->
<button onclick={() => {
  vscode.postMessage({ type: 'REFRESH_DATA' });
  // FSM updates context → UI reacts
}}>Refresh</button>
```

## Summary

**Philosophy**:

- **Svelte controls UI, FSM manages state**
- **State/context updates drive UI reactively**
- **User actions inform FSM, not control it**
- **No command messages, only state sync**

**Pattern**:

1. User interacts with UI → Svelte sends action event
2. FSM processes action → Updates context
3. State subscription fires → Sends `syncState` message
4. Svelte store updates → UI reacts automatically

**Key Rule**: If the UI needs to display it, it should be in FSM context, not in a separate message.
