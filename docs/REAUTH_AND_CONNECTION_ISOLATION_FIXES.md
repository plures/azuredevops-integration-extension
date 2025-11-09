# Re-authentication and Connection Isolation Fixes

## Summary

Fixed critical issues with re-authentication and connection isolation that were causing:

1. Reauth button failing to reauth the selected connection
2. Requests being made for unselected connections
3. Status bar showing "failed" during retry/connecting states
4. Entra token refresh attempting to use legacy refresh path instead of interactive auth

## Issues Fixed

### 1. Re-authentication Not Scoped to Selected Connection

**Problem**: When clicking the reauth button, `startAuthentication` was using `authActors` which didn't properly scope to the specific connection, and didn't trigger the connection machine's interactive authentication flow.

**Fix**: Modified `startAuthentication` in `applicationMachine.ts` to use the connection machine's `CONNECT` event with `forceInteractive: true`, ensuring:

- Only the specified `connectionId` is affected
- Interactive authentication is properly triggered
- Connection machine handles the full authentication flow

**File**: `src/fsm/machines/applicationMachine.ts`

```typescript
function startAuthentication(context: ApplicationContext, connectionId: string) {
  if (context.isDeactivating) return;

  // CRITICAL: Use connection machine CONNECT event with forceInteractive=true
  // This ensures we trigger re-authentication for the SPECIFIC connection only
  const connectionActor = context.connectionActors.get(connectionId);
  if (connectionActor) {
    const connection = context.connections.find((c) => c.id === connectionId);
    if (connection) {
      connectionActor.send({
        type: 'CONNECT',
        config: connection,
        forceInteractive: true,
      });
    }
  }
}
```

### 2. Status Bar Showing "Failed" During Retry/Connecting

**Problem**: Status bar was showing "Authentication failed" immediately on startup even when the connection was still retrying/connecting, causing user confusion.

**Fix**: Added `isConnecting` check that takes priority over `hasAuthFailure`, showing "Connecting..." when the connection is in connecting/retrying states:

- `authenticating`
- `checking_token`
- `interactive_auth`
- `creating_client`
- `creating_provider`
- `reauthInProgress === true`

**File**: `src/activation.ts`

```typescript
// PRIORITY 1: Show connecting state if connection is actively connecting/retrying
// This prevents showing "failed" when the connection is still retrying
if (isConnecting && !isConnected) {
  if (authMethod === 'entra') {
    authStatusBarItem.text = '$(sync~spin) Entra: Connecting...';
    // ...
    return; // Don't check other states while connecting
  }
}
```

### 3. Entra Token Refresh Using Wrong Path

**Problem**: When Entra tokens expired, the system attempted to use `refreshAuthToken` actor which throws "LEGACY AUTH REMOVED" error. This was happening in two places:

1. `TOKEN_EXPIRED` event transition in `CONNECTED` state
2. `onAuthFailure` callback in client creation

**Fix**:

- Modified `TOKEN_EXPIRED` transition to route Entra auth to `AUTHENTICATING` with `forceInteractive: true` instead of `TOKEN_REFRESH`
- Updated `onAuthFailure` callback to send `CONNECT` with `forceInteractive: true` for Entra auth instead of `TOKEN_EXPIRED`

**File**: `src/fsm/machines/connectionMachine.ts`

```typescript
TOKEN_EXPIRED: [
  {
    target: ConnectionStates.AUTHENTICATING,
    guard: 'isPATAuth',
    // ...
  },
  {
    // CRITICAL: For Entra auth, trigger interactive authentication instead of token refresh
    target: ConnectionStates.AUTHENTICATING,
    guard: 'isEntraAuth',
    actions: assign({
      retryCount: 0,
      forceInteractive: true, // Force interactive auth for Entra token expiration
    }),
  },
  // ...
];
```

### 4. CONNECT Event in AUTH_FAILED State Not Preserving forceInteractive

**Problem**: When `CONNECT` event was sent from `AUTH_FAILED` state, it didn't preserve the `forceInteractive` flag, causing reauth to fail silently.

**Fix**: Updated `CONNECT` handler in `AUTH_FAILED` state to preserve `forceInteractive` and clear error state.

**File**: `src/fsm/machines/connectionMachine.ts`

```typescript
CONNECT: {
  target: ConnectionStates.AUTHENTICATING,
  actions: assign(({ event, context }) => ({
    retryCount: 0,
    config: event.config || context.config,
    forceInteractive: event.forceInteractive ?? context.forceInteractive ?? false,
    lastError: undefined, // Clear error when reconnecting
  })),
},
```

## Connection Type Handling

Both `dev.azure.com` and `*.visualstudio.com` connection types are handled correctly:

- Same authentication flow (device code flow with Microsoft's Azure DevOps client ID)
- Same tenant discovery logic
- Same API base URL construction
- No special handling needed - both use the same FSM authentication path

The connection machine documentation confirms:

> "It works across all Azure DevOps domains (dev.azure.com, \*.visualstudio.com)"

## Testing Recommendations

1. **Test reauth for selected connection**:
   - Select connection A
   - Click reauth button
   - Verify only connection A attempts reauth
   - Check logs to ensure no requests for other connections

2. **Test status bar during startup**:
   - Start extension with failed connection
   - Verify status bar shows "Connecting..." not "Failed" during retry
   - Verify status bar shows "Failed" only after retry exhausted

3. **Test Entra token expiration**:
   - Wait for Entra token to expire (or manually expire)
   - Verify interactive auth is triggered (device code flow)
   - Verify no "LEGACY AUTH REMOVED" errors

4. **Test connection isolation**:
   - Have multiple connections configured
   - Select connection A
   - Verify only connection A's work items are displayed
   - Switch to connection B
   - Verify only connection B's work items are displayed

## Related Files

- `src/fsm/machines/applicationMachine.ts` - `startAuthentication` function
- `src/activation.ts` - Status bar update logic
- `src/fsm/machines/connectionMachine.ts` - Connection state machine transitions
- `src/webview/components/WorkItemList.svelte` - Work item filtering (already fixed)
- `src/webview/components/KanbanBoard.svelte` - Work item filtering (already fixed)

## Notes

- All fixes maintain backward compatibility
- No breaking changes to existing connection configurations
- Status bar improvements provide better user feedback
- Connection isolation ensures data integrity across multiple connections
