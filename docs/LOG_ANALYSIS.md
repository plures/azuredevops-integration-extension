# Log Analysis: What the Logs Are Telling Us

## Log Pattern Observed

```
[azuredevops-integration-extension][ext][message][webview-provider][postMessage] host->webview: syncState
[azuredevops-integration-extension][ext][message][webview-provider][onDidReceiveMessage] webview->host: webviewReady
[azuredevops-integration-extension][ext][message][webview-provider][postMessage] host->webview: syncState (duplicate)
[azuredevops-integration-extension][ext][message][webview-provider][onDidReceiveMessage] webview->host: getContext
[azuredevops-integration-extension][ext][message][webview-provider][onDidReceiveMessage] webview->host: webviewReady (duplicate)
[azuredevops-integration-extension][ext][message][webview-provider][postMessage] host->webview: syncState (duplicate)
```

## Key Findings

### ✅ **What's Working**

1. **Automatic Logging**: All messages are being logged automatically with correct format
2. **Message Flow**: Extension host ↔ webview communication is working
3. **State Sync**: `syncState` messages are being sent with full context
4. **Connections Loaded**: 4 connections are present in context

### ❌ **Critical Issues**

#### 1. **Empty Maps** - All Maps are `{}`

**Observed**:
```json
"connectionStates": {},
"pendingAuthReminders": {},
"connectionQueries": {},
"connectionWorkItems": {},
"connectionFilters": {},
"connectionViewModes": {}
```

**Root Cause**: Maps are empty in the Praxis context, meaning:
- Connection states aren't being populated when connections are loaded
- No connection-specific data is being tracked
- Maps are initialized but never updated

**Impact**: 
- ⚠️ **HIGH** - Connection state information is missing
- UI can't display connection-specific data
- Per-connection queries/work items aren't tracked

**Fix Needed**: 
- Populate `connectionStates` when connections are loaded
- Ensure `CONNECTION_STATE_UPDATED` events are dispatched
- Initialize Maps with connection data

---

#### 2. **Redundant syncState Messages**

**Observed**: Same `syncState` message sent 3 times in quick succession

**Root Cause**: 
- Multiple triggers calling `sendCurrentState()`
- `webviewReady` event triggers sync
- `getContext` request triggers sync
- State change listeners trigger sync

**Impact**: 
- ⚠️ **MEDIUM** - Inefficient, wastes resources
- May cause UI flicker
- Increases message passing overhead

**Fix Needed**:
- Debounce/throttle `sendCurrentState()` calls
- Deduplicate state before sending (compare signatures)
- Use reactive sync instead of message-based sync

---

#### 3. **Duplicate webviewReady Events**

**Observed**: `webviewReady` sent twice

**Root Cause**: 
- Webview may be registering multiple listeners
- Or webview is reloading/reinitializing

**Impact**: 
- ⚠️ **LOW** - Minor inefficiency
- May trigger duplicate syncs

**Fix Needed**:
- Ensure webview only sends `webviewReady` once per initialization
- Check for duplicate event handlers

---

#### 4. **Explicit getContext Request**

**Observed**: Webview explicitly requests context via `getContext` message

**Root Cause**: 
- Webview isn't receiving initial state automatically
- Or webview is checking for state updates

**Impact**: 
- ⚠️ **MEDIUM** - Indicates reactive sync isn't working perfectly
- Still using request/response pattern instead of reactive updates

**Fix Needed**:
- Ensure initial state is sent automatically when webview loads
- Implement reactive context sync (no explicit requests needed)

---

#### 5. **No Connection States**

**Observed**: 4 connections exist but `connectionStates` is empty

**Root Cause**: 
- `CONNECTION_STATE_UPDATED` events aren't being dispatched when connections are loaded
- Connection state isn't being initialized in Praxis context
- Connection managers aren't syncing state to Praxis

**Impact**: 
- ⚠️ **HIGH** - Missing critical connection state information
- Can't track connection status (connected/disconnected/auth_failed)
- Can't display connection-specific errors

**Fix Needed**:
- Dispatch `CONNECTION_STATE_UPDATED` when connections are loaded
- Initialize connection states in `connectionsLoadedRule`
- Sync connection state from ConnectionService to Praxis

---

## State Analysis

### What We Have ✅
- `connections`: 4 connections loaded
- `activeConnectionId`: Set correctly
- `isActivated`: true
- `viewMode`: "list"
- Basic application state

### What We're Missing ❌
- `connectionStates`: Empty (should have 4 entries)
- `pendingAuthReminders`: Empty (may be correct if no auth issues)
- `connectionQueries`: Empty (may be correct if no queries set)
- `connectionWorkItems`: Empty (should be populated when work items loaded)
- `connectionFilters`: Empty (may be correct)
- `connectionViewModes`: Empty (should have at least active connection)

---

## Recommendations

### Priority 1: Populate Connection States

**Action**: Initialize `connectionStates` when connections are loaded

**Location**: `src/praxis/application/rules/connectionRules.ts`

**Fix**:
```typescript
const connectionsLoadedRule = defineRule<ApplicationEngineContext>({
  // ...
  impl: (state, events) => {
    const loadedEvent = findEvent(events, ConnectionsLoadedEvent);
    if (!loadedEvent) return [];

    state.context.connections = loadedEvent.payload.connections;

    // Initialize connection states for each connection
    state.context.connectionStates = new Map(state.context.connectionStates);
    for (const connection of loadedEvent.payload.connections) {
      if (!state.context.connectionStates.has(connection.id)) {
        state.context.connectionStates.set(connection.id, {
          state: 'disconnected',
          connectionId: connection.id,
          isConnected: false,
          authMethod: connection.authMethod || 'pat',
          hasClient: false,
          hasProvider: false,
          retryCount: 0,
          error: undefined,
        });
      }
    }

    // Auto-select first connection if none selected
    if (!state.context.activeConnectionId && state.context.connections.length > 0) {
      state.context.activeConnectionId = state.context.connections[0].id;
    }

    return [];
  },
});
```

---

### Priority 2: Deduplicate syncState Messages

**Action**: Add signature-based deduplication

**Location**: `src/activation.ts` - `sendCurrentState()`

**Fix**:
```typescript
let lastStateSignature: string | undefined;

const sendCurrentState = () => {
  // ... get snapshot ...
  
  const serializableState = {
    praxisState: snapshot.value,
    context: getSerializableContext(snapshot.context),
    matches,
  };
  
  // Deduplicate: only send if state changed
  const signature = JSON.stringify(serializableState);
  if (signature === lastStateSignature) {
    return; // No change, skip
  }
  lastStateSignature = signature;
  
  webviewToUse.postMessage({
    type: 'syncState',
    payload: serializableState,
  });
};
```

---

### Priority 3: Ensure Initial State Sent

**Action**: Send initial state when webview resolves

**Location**: `src/activation.ts` - `resolveWebviewView()`

**Fix**: Already implemented - `sendCurrentState()` is called, but may need to ensure it happens after webview is ready.

---

## Summary

**Main Issues**:
1. ❌ **Connection states not populated** - Maps are empty
2. ⚠️ **Redundant syncs** - Same state sent multiple times
3. ⚠️ **Explicit getContext** - Reactive sync not perfect

**What's Working**:
- ✅ Automatic logging
- ✅ Message passing
- ✅ Connections loaded
- ✅ Basic state sync

**Next Steps**:
1. Fix connection state initialization
2. Add state deduplication
3. Verify reactive sync is working

