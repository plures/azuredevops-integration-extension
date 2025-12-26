# Standardized Automatic Logging Architecture

## Overview

This document defines the standardized automatic logging system for the Azure DevOps Integration Extension. All logging is automatic, zero-instrumentation, and follows a strict format for filtering and replay capability.

## Log Format Standard

**Format:** `[azuredevops-integration-extension][{runtime}][{flowName}][{componentName}][{functionName}] {message}`

### Components:

1. **`[azuredevops-integration-extension]`** - Application name (always first)
2. **`[{runtime}]`** - Runtime context:
   - `ext` - Extension host (Node.js)
   - `webview` - Webview context (browser)
3. **`[{flowName}]`** - High-level flow/capability:
   - `activation` - Extension activation
   - `auth` - Authentication flows
   - `connection` - Connection management
   - `sync` - State synchronization
   - `ui` - User interface
   - `praxis` - Praxis engine operations
   - `command` - Command execution
   - `message` - Message passing (automatic, not app logic)
4. **`[{componentName}]`** - Specific component/module:
   - `activation` - Extension activation
   - `webview-provider` - Webview view provider
   - `entra-auth` - Entra ID authentication
   - `connection-manager` - Connection management
   - `praxis-engine` - Praxis state machine engine
   - `sync-bridge` - Automatic context sync bridge
   - etc.
5. **`[{functionName}]`** - Function/method name (optional, for function-level logging)

### Examples:

```
[azuredevops-integration-extension][ext][activation][activation][activate] Extension activating
[azuredevops-integration-extension][ext][auth][entra-auth][getEntraIdToken] Starting token acquisition
[azuredevops-integration-extension][webview][sync][sync-bridge][onContextUpdate] Context updated: 4 connections
[azuredevops-integration-extension][ext][praxis][praxis-engine][dispatch] Event: CONNECTIONS_LOADED
[azuredevops-integration-extension][ext][message][message-interceptor][postMessage] host->webview: syncState
```

## Architecture Principles

### 1. Zero Manual Instrumentation

- **NO** `console.log`, `console.error`, `console.warn`, `console.debug`
- **NO** `postWebviewLog` calls
- **NO** `createLogger` or `createScopedLogger` calls
- **NO** manual logging statements

### 2. Automatic Logging Points

Logging happens automatically at:

1. **Function Entry/Exit** - Via `FunctionInterceptor` (when functions are wrapped)
2. **Message Passing** - Via `MessageInterceptor` (webview ↔ extension)
3. **State Changes** - Via Praxis engine instrumentation
4. **Errors** - Via global error handlers
5. **Performance** - Via automatic performance monitoring

**Important:** Some events still require explicit logging calls:
- **Promise callbacks** (`.then()`, `.catch()`) - Not automatically intercepted
- **Control flow branches** (if/else, switch cases) - Not automatically captured
- **Success cases** - Need explicit logging for important operations
- **Application events** - User actions, state transitions, etc.

For these cases, use `StandardizedAutomaticLogger` directly:
```typescript
import { standardizedLogger } from './logging/StandardizedAutomaticLogger.js';

// Log important application events
standardizedLogger.info('auth', 'webview-provider', 'openExternal', 'Browser opened successfully', { connectionId });
standardizedLogger.error('auth', 'webview-provider', 'writeText', 'Failed to copy', { error: err.message });
standardizedLogger.warn('auth', 'webview-provider', 'onDidReceiveMessage', 'Session not found', { connectionId });
```

### 3. Context Synchronization (Reactive, Not Message-Based)

**Key Principle:** Message passing is **NOT** part of application logic. It's a hidden, automatic facility.

#### Current (Deprecated) Approach:
```typescript
// ❌ WRONG: Manual message passing
webview.postMessage({ type: 'syncState', payload: state });
window.addEventListener('message', (event) => {
  if (event.data.type === 'syncState') {
    updateState(event.data.payload);
  }
});
```

#### New (Reactive) Approach:
```typescript
// ✅ CORRECT: Automatic reactive sync
// Extension host context changes → automatically synced to webview
// Webview context changes → automatically synced to extension host
// No manual message handling needed

// Extension host:
const context = reactiveContextStore.get();
context.connections = [...]; // Automatically synced

// Webview:
const context = reactiveContextStore.get(); // Always in sync
```

### 4. Reactive Context Bridge

The `ReactiveContextBridge` provides:

- **Automatic bidirectional sync** between extension host and webview
- **Praxis integration** - Context changes trigger Praxis events automatically
- **No manual message handling** - All handled transparently
- **Deterministic replay** - All state changes are logged and replayable

## Implementation

### StandardizedAutomaticLogger

```typescript
class StandardizedAutomaticLogger {
  log(
    runtime: 'ext' | 'webview',
    flowName: string,
    componentName: string,
    functionName: string | undefined,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    meta?: Record<string, unknown>
  ): void {
    const prefix = `[azuredevops-integration-extension][${runtime}][${flowName}][${componentName}]`;
    const functionPart = functionName ? `[${functionName}]` : '';
    const logMessage = `${prefix}${functionPart} ${message}`;
    
    // Log to VS Code output channel
    // Log to console (for debug console)
    // Store for replay
  }
}
```

### Automatic Interception

1. **FunctionInterceptor** - Wraps all functions automatically
2. **MessageInterceptor** - Intercepts all `postMessage` and `addEventListener('message')`
3. **PraxisInstrumentation** - Instruments Praxis engine for state change logging
4. **ErrorHandlers** - Global error handlers for automatic error logging

## Enforcement

### ESLint Rules

```javascript
// eslint.config.js
rules: {
  'no-console': 'error', // No console.log/error/warn/debug
  'no-manual-logging': 'error', // No postWebviewLog, createLogger, etc.
}
```

### TypeScript Types

```typescript
// Prevent manual logging imports
declare module './logging/unifiedLogger' {
  // Deprecated - use automatic logging only
}

declare module './logging' {
  // Deprecated - use automatic logging only
}
```

## Migration Path

1. ✅ Create `StandardizedAutomaticLogger`
2. ✅ Update `AutomaticLogger` to use standardized format
3. ✅ Update `MessageInterceptor` to use standardized format
4. ✅ Update `FunctionInterceptor` to use standardized format
5. ✅ Remove all manual logging calls
6. ✅ Add ESLint rules
7. ✅ Create `ReactiveContextBridge` for automatic sync
8. ✅ Migrate from message-based to reactive context sync

## Benefits

1. **Consistent Format** - All logs follow same pattern, easy to filter
2. **Zero Instrumentation** - No manual logging code needed
3. **Full Replay** - All logs structured for replay capability
4. **Automatic Sync** - Context sync is transparent, not part of app logic
5. **Deterministic** - Reactive architecture ensures deterministic behavior
6. **Debuggable** - All logs accessible via debug console

