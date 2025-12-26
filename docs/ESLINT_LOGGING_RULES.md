# ESLint Rules for Logging

## Overview

ESLint rules enforce the Praxis event-driven logging pattern, ensuring that all application events flow through Praxis for automatic logging and state management.

## Rules

### 1. No Console Methods (`no-console`)

**Rule**: `'no-console': 'error'`

**Purpose**: Prevents direct use of `console.log`, `console.error`, `console.warn`, `console.debug`.

**Exceptions**: 
- Logging infrastructure files (`src/logging/**/*.ts`)
- Debug console bridge (`src/fsm/commands/debugConsoleBridge.ts`)

**Example**:
```typescript
// ❌ ERROR
console.log('User clicked button');

// ✅ CORRECT - Dispatch as Praxis event
dispatchApplicationEvent(UserClickedButtonEvent.create({ buttonId: 'submit' }));
```

### 2. No Manual Logging Imports (`no-restricted-imports`)

**Rule**: Blocks imports from deprecated logging modules

**Purpose**: Prevents importing old logging systems (`unifiedLogger`, `createLogger`, etc.)

**Example**:
```typescript
// ❌ ERROR
import { createLogger } from './logging/unifiedLogger.js';

// ✅ CORRECT - Use Praxis events
import { dispatchApplicationEvent } from './services/extensionHostBridge.js';
```

### 3. No Manual Logging Calls (`no-restricted-syntax`)

**Rule**: Blocks `postWebviewLog`, `createLogger`, `createScopedLogger` calls

**Purpose**: Prevents use of deprecated logging APIs

**Example**:
```typescript
// ❌ ERROR
postWebviewLog('Message sent');

// ✅ CORRECT - Dispatch as Praxis event
dispatchApplicationEvent(MessageSentEvent.create({ messageId }));
```

### 4. No StandardizedLogger for Application Events (`no-restricted-syntax`)

**Rule**: Blocks `standardizedLogger.info/error/warn/debug` calls in application code

**Purpose**: Enforces Praxis event-driven logging pattern

**Exceptions**:
- Logging infrastructure files (allowed)
- `activation.ts` (warning only - prefer Praxis events)

**Example**:
```typescript
// ❌ ERROR in application code
standardizedLogger.error('auth', 'webview-provider', 'writeText', 'Failed to copy', {
  connectionId,
  error: err.message
});

// ✅ CORRECT - Dispatch as Praxis event
dispatchApplicationEvent(
  DeviceCodeCopyFailedEvent.create({
    connectionId: message.event.connectionId,
    error: err instanceof Error ? err.message : String(err),
  })
);
```

## File-Specific Rules

### Logging Infrastructure Files

**Files**: 
- `src/logging/StandardizedAutomaticLogger.ts`
- `src/logging/AutomaticLogger.ts`
- `src/logging/FunctionInterceptor.ts`
- `src/logging/MessageInterceptor.ts`
- `src/logging.ts`
- `src/logging/unifiedLogger.ts`

**Rules**: 
- `no-console: 'off'` - These files ARE the logging system
- `no-restricted-imports: 'off'` - Can import each other
- `no-restricted-syntax: 'off'` - Can use logging syntax

### Infrastructure Files (Pre-Praxis)

**Files**:
- `src/activation.ts` (only for pre-Praxis initialization)
- `src/services/extensionHostBridge.ts` (bridge initialization)

**Rules**:
- `no-restricted-syntax: 'warn'` - Warns when using `standardizedLogger`, suggests Praxis events

## Migration Checklist

When refactoring code to use Praxis events:

- [ ] Remove `standardizedLogger` imports
- [ ] Replace `standardizedLogger.*` calls with `dispatchApplicationEvent()`
- [ ] Create corresponding Praxis events in `src/praxis/application/facts.ts` if needed
- [ ] Verify ESLint passes (no errors)
- [ ] Test that events are automatically logged via Praxis trace recorder

## Benefits

1. **Automatic Logging** - All events logged automatically via Praxis
2. **State Management** - Events update application state
3. **Type Safety** - Events are typed, preventing errors
4. **Consistency** - All events follow same pattern
5. **Replay Capability** - All events captured for replay

