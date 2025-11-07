# Reactive Architecture Migration Plan

## Current Anti-Patterns to Remove

### 1. Partial State Messages

**Current (❌ Anti-Pattern)**

```typescript
// Multiple partial update messages
panel.webview.postMessage({ type: 'syncTimerState', payload: {...} });
panel.webview.postMessage({ type: 'workItemsError', error: '...' });
panel.webview.postMessage({ type: 'workItemsLoaded', workItems: [...] });
panel.webview.postMessage({ type: 'work-items-update', workItems: [...] });
```

**Target (✅ Reactive)**

```typescript
// Single syncState message with full context
panel.webview.postMessage({
  type: 'syncState',
  payload: {
    fsmState: snapshot.value,
    context: {
      ...context,
      timerState: updatedTimerState,      // Included in context
      workItemsError: error,               // Included in context
      pendingWorkItems: { workItems: [...] } // Included in context
    },
    matches: snapshot.matches
  }
});
```

### 2. Provider Direct Messages

**Current (❌ Anti-Pattern)**

```typescript
// Provider sends messages directly to webview
this._post({ type: 'workItemsLoaded', workItems: [...] });
this._post({ type: 'workItemsError', error: '...' });
```

**Target (✅ Reactive)**

```typescript
// Provider updates FSM context, FSM sends syncState
// Provider → FSM context update → syncState → webview
```

## Migration Steps

### Phase 1: Ensure All State in FSM Context

- [x] `workItemsError` - Already in context (extracted from connection snapshot)
- [x] `timerState` - Already in context
- [x] `pendingWorkItems` - Already in context
- [ ] Verify provider updates FSM context instead of sending messages

### Phase 2: Remove Partial Message Handlers

**Files to Update:**

1. `src/webview/main.ts` - Remove handlers for:
   - `syncTimerState`
   - `workItemsError`
   - `workItemsLoaded`
   - `work-items-update`

2. `src/activation.ts` - Remove sending:
   - `syncTimerState` messages
   - `workItemsError` messages
   - `workItemsLoaded` messages
   - `work-items-update` messages

3. `src/provider.ts` - Update to notify FSM instead of sending messages:
   - `workItemsLoaded` → Update FSM context
   - `workItemsError` → Update FSM context

### Phase 3: Update Provider Integration

**Current Flow:**

```
Provider → postMessage → forwardProviderMessage → sendToWebview → webview
```

**Target Flow:**

```
Provider → FSM context update → state subscription → syncState → webview
```

**Implementation:**

- Provider should call FSM action/event to update context
- Or provider should update connection state, FSM reads it
- FSM state subscription automatically sends syncState

## Files Requiring Changes

### High Priority

1. **`src/webview/main.ts`**
   - Remove `syncTimerState` handler (lines 74-93)
   - Remove `workItemsError` handler (lines 94-114)
   - Remove `workItemsLoaded` handler (lines 115-129)
   - Keep only `syncState` handler

2. **`src/activation.ts`**
   - Remove `sendToWebview` calls for partial updates
   - Ensure `syncState` includes all state
   - Update provider integration to update FSM context

3. **`src/provider.ts`**
   - Remove `_post` calls for `workItemsLoaded` and `workItemsError`
   - Add FSM context update mechanism
   - Or trigger FSM events that update context

### Medium Priority

4. **`src/fsm/machines/applicationMachine.ts`**
   - Ensure `loadData` actor updates `pendingWorkItems` in context
   - Ensure error handling updates `workItemsError` in context
   - Ensure timer updates `timerState` in context

5. **`src/activation.ts` - Timer Integration**
   - Remove `timerUpdate` message sending
   - Ensure timer state updates FSM context
   - FSM subscription handles syncState

## Verification Checklist

After migration:

- [ ] Only `syncState` messages sent to webview (no partial updates)
- [ ] All UI-visible state in FSM context
- [ ] Provider updates FSM context (not direct messages)
- [ ] Timer state in FSM context (not separate messages)
- [ ] Error states in FSM context (not separate messages)
- [ ] Webview only handles `syncState` messages
- [ ] Svelte components react to context changes (not messages)

## Benefits After Migration

1. **Single Source of Truth**: All state in FSM context
2. **Reactive Updates**: UI automatically reacts to context changes
3. **Simpler Code**: No complex message routing
4. **Better Debugging**: State changes visible in FSM
5. **Type Safety**: Context types ensure consistency
