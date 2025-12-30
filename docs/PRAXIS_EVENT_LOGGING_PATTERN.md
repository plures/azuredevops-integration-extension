# Praxis Event-Driven Logging Pattern

## Core Principle

**All application events should be dispatched as Praxis events. Automatic logging will capture them.**

## Why This Works

When you dispatch an event to Praxis:

1. **Praxis processes the event** - Rules evaluate, state updates
2. **Instrumentation automatically logs** - `instrumentActor` wraps the actor and logs all events via `TraceLogger.logEvent`
3. **No explicit logging needed** - The event itself becomes the log entry

## Pattern

### ❌ WRONG: Explicit Logging

```typescript
// Don't do this - explicit logging bypasses Praxis
standardizedLogger.error('auth', 'webview-provider', 'writeText', 'Failed to copy device code', {
  connectionId,
  error: err.message,
});
```

### ✅ CORRECT: Dispatch as Praxis Event

```typescript
// Dispatch as Praxis event - automatic logging captures it
dispatchApplicationEvent(
  DeviceCodeCopyFailedEvent.create({
    connectionId: message.event.connectionId,
    error: err instanceof Error ? err.message : String(err),
  })
);
```

## Benefits

1. **Automatic Logging** - No explicit logging calls needed
2. **State Management** - Events update application state
3. **Replay Capability** - All events are logged and replayable
4. **Type Safety** - Events are typed, preventing errors
5. **Consistency** - All events follow the same pattern

## When to Use Explicit Logging

Only use `StandardizedAutomaticLogger` directly for:

- **Infrastructure-level logging** - Logging system itself (`StandardizedAutomaticLogger.ts`, `FunctionInterceptor.ts`, `MessageInterceptor.ts`)
- **Very low-level errors** - Before Praxis is initialized (e.g., extension activation before Praxis starts)
- **Performance metrics** - Not application events

**ESLint Rules Enforce This:**

- ❌ **Error**: Using `standardizedLogger` in application code (should use `dispatchApplicationEvent` instead)
- ✅ **Allowed**: Using `standardizedLogger` in logging infrastructure files
- ⚠️ **Warning**: Using `standardizedLogger` in `activation.ts` (prefer Praxis events when possible)

## Event Types

### Success Events

- `DeviceCodeBrowserOpenedEvent` - Browser opened successfully
- `AuthCodeFlowBrowserOpenedEvent` - Auth flow browser opened

### Error Events

- `DeviceCodeCopyFailedEvent` - Failed to copy device code
- `DeviceCodeBrowserOpenFailedEvent` - Failed to open browser
- `AuthCodeFlowBrowserOpenFailedEvent` - Failed to open auth flow browser
- `DeviceCodeSessionNotFoundEvent` - Session not found
- `ApplicationErrorEvent` - Generic application errors

## Example: Refactoring from Explicit Logging

### Before (Explicit Logging)

```typescript
vscode.env.clipboard
  .writeText(deviceCodeSession.userCode)
  .then(() => {
    standardizedLogger.info('auth', 'webview-provider', 'writeText', 'Copied successfully', {
      connectionId,
      userCode: deviceCodeSession.userCode,
    });
  })
  .catch((err) => {
    standardizedLogger.error('auth', 'webview-provider', 'writeText', 'Failed to copy', {
      connectionId,
      error: err.message,
    });
  });
```

### After (Praxis Events)

```typescript
vscode.env.clipboard
  .writeText(deviceCodeSession.userCode)
  .then(() => {
    dispatchApplicationEvent(
      DeviceCodeBrowserOpenedEvent.create({
        connectionId: message.event.connectionId,
        userCode: deviceCodeSession.userCode,
      })
    );
  })
  .catch((err) => {
    dispatchApplicationEvent(
      DeviceCodeCopyFailedEvent.create({
        connectionId: message.event.connectionId,
        error: err instanceof Error ? err.message : String(err),
      })
    );
  });
```

## Automatic Logging Output

When events are dispatched via `dispatchApplicationEvent()`, they flow through `PraxisApplicationManager.dispatch()` which:

1. **Records the dispatch** via `traceRecorder.beginDispatch()` and `traceRecorder.completeDispatch()` (when `debugLoggingEnabled` is true)
2. **Processes the event** via `engine.step(events)` - rules evaluate, state updates
3. **Notifies listeners** - state changes propagate

The trace recorder automatically captures:

- Event type and payload
- Context before and after
- State transitions
- Any errors or diagnostics

This means **all Praxis events are automatically logged** when tracing is enabled, without needing explicit logging calls.

## Migration Checklist

- [ ] Identify all explicit logging calls for application events
- [ ] Create corresponding Praxis events in `facts.ts`
- [ ] Replace explicit logging with `dispatchApplicationEvent`
- [ ] Verify automatic logging captures the events
- [ ] Remove unused `standardizedLogger` imports
