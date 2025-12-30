# Automatic Logging Infrastructure Design

## Problem Statement

Currently, logging requires manual instrumentation throughout the codebase. This leads to:

- Inconsistent logging coverage
- Missing critical information when debugging
- Time wasted adding logging after issues occur
- Inability to replay and understand system behavior

## Solution: Automatic Observability Layer

Create a comprehensive automatic logging system that captures:

1. **Function calls/returns** - All function invocations with parameters and results
2. **Message passing** - All webview ↔ extension host communication
3. **State changes** - All Praxis state transitions and context updates
4. **Errors** - All exceptions with full context
5. **Performance** - Timing information for all operations

## Architecture

### 1. Automatic Function Interception

Use JavaScript Proxies to automatically wrap functions and log calls:

```typescript
// Automatically logs: function name, parameters, return value, duration, errors
const loggedFunction = autoLog(fn, { component: 'webview', level: 'debug' });
```

### 2. Message Interception Layer

Intercept all webview message passing automatically:

```typescript
// Extension host side
const interceptedWebview = interceptWebviewMessages(webview, {
  logAll: true,
  capturePayloads: true,
  trackTiming: true,
});

// Webview side
const interceptedPostMessage = interceptPostMessage(window.__vscodeApi, {
  logAll: true,
  capturePayloads: true,
});
```

### 3. State Change Observer

Automatically observe Praxis state changes:

```typescript
// Automatically logs all state transitions, context changes, event dispatches
observePraxisActor(actor, {
  logStateTransitions: true,
  logContextChanges: true,
  logEvents: true,
  captureSnapshots: true,
});
```

### 4. Structured Log Format

All logs follow a consistent structure for replay:

```typescript
interface AutomaticLogEntry {
  id: string; // Unique log entry ID
  timestamp: number; // High-precision timestamp
  type: 'function' | 'message' | 'state' | 'error' | 'performance';
  component: string; // Component/module name
  operation: string; // Operation name (function name, message type, etc.)

  // Function logs
  function?: {
    name: string;
    args: unknown[];
    result?: unknown;
    error?: Error;
    duration: number;
  };

  // Message logs
  message?: {
    direction: 'host->webview' | 'webview->host';
    type: string;
    payload: unknown;
    response?: unknown;
  };

  // State logs
  state?: {
    from: string;
    to: string;
    event: string;
    contextBefore: unknown;
    contextAfter: unknown;
  };

  // Error logs
  error?: {
    message: string;
    stack: string;
    context: unknown;
  };

  // Performance logs
  performance?: {
    metric: string;
    value: number;
    unit: string;
  };

  // Context
  context?: Record<string, unknown>;
  sessionId: string;
  traceId?: string; // For correlating related operations
}
```

### 5. Replay Capability

All logs are stored in a format that enables full replay:

```typescript
interface ReplaySession {
  id: string;
  startTime: number;
  endTime: number;
  entries: AutomaticLogEntry[];
  metadata: {
    extensionVersion: string;
    vscodeVersion: string;
    platform: string;
  };
}

// Replay a session
async function replaySession(session: ReplaySession): Promise<void> {
  for (const entry of session.entries) {
    await replayEntry(entry);
  }
}
```

## Implementation Plan

### Phase 1: Core Infrastructure

1. Create `AutomaticLogger` class with structured logging
2. Implement function interception using Proxies
3. Implement message interception for webview communication
4. Create log storage and retrieval system

### Phase 2: Integration

1. Integrate with existing Praxis actors
2. Integrate with webview message passing
3. Integrate with error handlers
4. Add performance monitoring

### Phase 3: Replay System

1. Implement log serialization/deserialization
2. Create replay engine
3. Add visualization tools
4. Add export/import capabilities

### Phase 4: Developer Tools

1. Create VS Code command to view logs
2. Create log filtering/search UI
3. Add log export functionality
4. Add performance analysis tools

## Benefits

1. **Zero Manual Instrumentation** - Logging happens automatically
2. **Full Visibility** - See everything that happens in the system
3. **Replay Capability** - Reproduce issues exactly as they occurred
4. **Performance Insights** - Automatic performance monitoring
5. **Debugging Efficiency** - Find issues faster with complete context

## Configuration

```typescript
interface AutomaticLoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';

  // What to log
  logFunctions: boolean;
  logMessages: boolean;
  logStateChanges: boolean;
  logErrors: boolean;
  logPerformance: boolean;

  // Filtering
  includeComponents: string[]; // Only log these components
  excludeComponents: string[]; // Don't log these components
  includeFunctions: string[]; // Only log these functions
  excludeFunctions: string[]; // Don't log these functions

  // Storage
  maxEntries: number; // Max log entries in memory
  persistToFile: boolean; // Save to file
  filePath?: string; // File path if persisting

  // Performance
  sampleRate: number; // 0.0 to 1.0, sample rate for performance logs
  minDuration: number; // Only log functions slower than this (ms)
}
```

## Usage

Once implemented, logging happens automatically. No code changes needed:

```typescript
// Before: Manual logging everywhere
function myFunction(param: string) {
  logger.debug('myFunction called', { param });
  try {
    const result = doSomething(param);
    logger.debug('myFunction succeeded', { result });
    return result;
  } catch (error) {
    logger.error('myFunction failed', { error });
    throw error;
  }
}

// After: Automatic logging, zero code changes
function myFunction(param: string) {
  // Automatically logged: call, parameters, result, duration, errors
  return doSomething(param);
}
```
