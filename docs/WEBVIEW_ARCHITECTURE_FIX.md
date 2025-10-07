# Webview Architecture Fix - Connection Isolation

## Problem Statement

The webview was displaying stale data from previous connections when switching between projects. This manifested as:

1. **Cross-Connection Contamination**: Work items from one connection would appear when another connection was active
2. **No Loading State**: The UI would show "No items found" immediately before queries returned, or show stale data during loading
3. **Message Push vs Pull**: The extension was pushing data to the webview indiscriminately rather than the webview pulling data based on connection state

## Root Causes

### 1. Missing Connection ID in Messages

**Before:**

```typescript
function forwardProviderMessage(connectionId: string, message: any) {
  if (message?.type === 'workItemsLoaded') {
    const enrichment = branchStateByConnection.get(connectionId);
    const merged = {
      ...message,
      branchContext: enrichment?.context ?? null,
    };
    postToWebview({ panel, message: merged, logger: verbose });
    return;
  }
  postToWebview({ panel, message, logger: verbose });
}
```

**Problem**: Messages were forwarded to the webview without including `connectionId`, making it impossible for the webview to filter messages by connection.

**After:**

```typescript
function forwardProviderMessage(connectionId: string, message: any) {
  // CRITICAL: Always include connectionId in provider messages so webview can
  // filter/ignore messages that don't match the active connection.
  if (message?.type === 'workItemsLoaded') {
    const enrichment = branchStateByConnection.get(connectionId);
    const merged = {
      ...message,
      connectionId, // ← NOW INCLUDED
      branchContext: enrichment?.context ?? null,
    };
    postToWebview({ panel, message: merged, logger: verbose });
    updateBuildRefreshTimer(connectionId, !!enrichment?.hasActiveBuild);
    return;
  }

  // Include connectionId in all provider messages for proper filtering
  const tagged = { ...message, connectionId }; // ← NOW INCLUDED
  postToWebview({ panel, message: tagged, logger: verbose });
}
```

### 2. No Message Filtering in Webview

**Before:**

```typescript
case 'workItemsLoaded': {
  // ... process message regardless of which connection it's for
  lastWorkItems = items;
  // ... update UI
}
```

**Problem**: The webview would process any `workItemsLoaded` message, even if it was for an inactive connection.

**After:**

```typescript
case 'workItemsLoaded': {
  const messageConnectionId = message?.connectionId;

  // CRITICAL FIX: Only process this message if it's for the active connection
  if (messageConnectionId && messageConnectionId !== activeConnectionId) {
    console.warn(
      '[svelte-main] Ignoring workItemsLoaded for inactive connection:',
      messageConnectionId,
      'active:',
      activeConnectionId
    );
    break;  // ← IGNORE STALE DATA
  }

  // ... process only if connection matches
}
```

### 3. No Loading State on Connection Switch

**Before:**

```typescript
case 'connectionsUpdate': {
  if (newActiveConnectionId && newActiveConnectionId !== activeConnectionId) {
    activeConnectionId = newActiveConnectionId;
    applyConnectionState(activeConnectionId);  // Just restore saved state
  }
}
```

**Problem**: When switching connections, the old data remained visible until new data arrived.

**After:**

```typescript
case 'connectionsUpdate': {
  if (newActiveConnectionId && newActiveConnectionId !== activeConnectionId) {
    if (activeConnectionId) {
      saveConnectionState(activeConnectionId);
    }
    activeConnectionId = newActiveConnectionId;

    // CRITICAL FIX: Clear stale data and show loading
    lastWorkItems = [];
    itemsForView = [];
    workItemCount = 0;
    loading = true;  // ← SHOW LOADING STATE
    errorMsg = '';

    applyConnectionState(activeConnectionId);
  }
}
```

## Additional Fixes

### Setup Flow Ordering

**Problem**: During `promptAddConnection`, the code tried to use `newConnection.id` before creating the connection object:

```typescript
const connPatKey = `azureDevOpsInt.pat.${newConnection.id}`;  // ERROR: newConnection doesn't exist yet
const newConnection: ProjectConnection = { ... };
```

**Fix**: Reordered the flow:

1. Create connection object first (to get ID)
2. Prompt for optional identity name (on-prem only)
3. Prompt for PAT
4. Store PAT using the connection ID
5. Save connection

### Per-Connection PAT Storage

**Before**: PAT was stored in global secret key
**After**: Each connection gets its own secret key: `azureDevOpsInt.pat.{connectionId}`

This ensures:

- No credential sharing between connections
- PAT is properly associated with the connection
- PAT survives connection switching and window reloads

## Benefits

1. **Connection Isolation**: Each connection's data is properly isolated; switching connections shows correct data immediately
2. **Better UX**: Loading states appear when appropriate; no more "flashing" of stale data
3. **Debugging**: Connection ID in logs makes it easy to trace which connection a message belongs to
4. **Architectural Soundness**: Data flows correctly with proper filtering rather than relying on timing

## Testing Checklist

- [x] Switch between connections: old data should not appear
- [x] Create new connection: should prompt for identity (on-prem only), then PAT
- [x] Reload window: each connection should retain its PAT
- [x] Query results: should only update UI if for active connection
- [ ] Multiple rapid connection switches: should handle gracefully

## Future Improvements

1. **Request-Response Pattern**: Consider moving to explicit request/response for queries rather than unsolicited pushes
2. **Connection State Machine**: Formalize connection states (idle, loading, loaded, error)
3. **Optimistic Updates**: Show loading skeleton while preserving last known good data
4. **Message Queue**: Queue messages during connection switches to avoid race conditions
