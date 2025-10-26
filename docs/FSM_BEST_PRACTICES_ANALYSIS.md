# FSM Best Practices Analysis & Fixes

## Executive Summary

This document outlines the state machine issues identified and resolved in the Azure DevOps Integration Extension codebase, along with best practices for XState v5 state machine design.

**Date**: 2025-10-26  
**Scope**: All state machines in `src/fsm/machines/`  
**Status**: ✅ Critical issues resolved

---

## Issues Identified & Resolved

### 🔴 CRITICAL: Reserved Event Name Collision

**Location**: `src/fsm/machines/applicationMachine.ts` (Lines 125-129)

**Problem**:
Custom events were using the reserved `xstate.*` namespace:
```typescript
// ❌ INCORRECT - Reserved namespace
| { type: 'xstate.snapshot.auth'; snapshot: any }
| { type: 'xstate.error.actor.auth'; error: any }
| { type: 'xstate.snapshot.data'; snapshot: any }
| { type: 'xstate.error.actor.data'; error: any }
```

**Why This Is Critical**:
- The `xstate.` prefix is **reserved** by XState for internal system events
- Using it for custom events can cause:
  - Event handling conflicts
  - Unexpected behavior during state transitions
  - Debugging nightmares (events may be intercepted by XState internals)
  - Version upgrade issues

**Solution** ✅:
```typescript
// ✅ CORRECT - Custom namespace
| { type: 'AUTH_SNAPSHOT'; snapshot: any }
| { type: 'AUTH_ERROR'; error: any }
| { type: 'DATA_SNAPSHOT'; snapshot: any }
| { type: 'DATA_ERROR'; error: any }
```

**References Updated**:
- Event type definitions (lines 125-129)
- Event handlers (lines 375-386)
- Action implementations (lines 577-614)

---

### 🔴 CRITICAL: Infinite Loop via Unconditional `always` Transition

**Location**: `src/fsm/machines/applicationMachine.ts` (Lines 242-245)

**Problem**:
Unconditional `always` transition competing with `onDone`:
```typescript
// ❌ INCORRECT - Race condition / infinite loop
loading_connections: {
  invoke: {
    src: 'setupUI',
    onDone: {
      target: 'waiting_for_panel',
      actions: [/* ... */],
    },
  },
  always: {  // ⚠️ Fires immediately, races with onDone
    target: 'waiting_for_panel',
    actions: ['fallbackSetupUICompletion'],
  },
  after: {
    250: {
      target: 'waiting_for_panel',  // Redundant!
    },
  },
}
```

**Why This Is Critical**:
- `always` transitions evaluate **immediately** upon state entry
- Creates a race condition with `invoke` → `onDone`
- Can cause:
  - Actions to execute in wrong order
  - Context corruption
  - State machine stuck in loops
  - Unpredictable behavior in tests

**Solution** ✅:
```typescript
// ✅ CORRECT - Guarded fallback only
loading_connections: {
  invoke: {
    src: 'setupUI',
    onDone: {
      target: 'waiting_for_panel',
      actions: [
        'storeConnectionsFromSetup',
        'initializeAuthActors',
        'selectInitialConnection',
      ],
    },
    onError: 'setup_error',
  },
  /**
   * Fallback transition for test environments.
   * BEST PRACTICE: Using 'after' with guard instead of 'always' 
   * to prevent infinite loops.
   */
  after: {
    250: {
      target: 'waiting_for_panel',
      actions: ['fallbackSetupUICompletion'],
      // Guard prevents transition if we've already progressed
      guard: ({ context }) => !context.webviewPanel,
    },
  },
}
```

**Key Improvements**:
1. Removed unconditional `always` transition
2. Kept single `after` timeout as safety fallback
3. Added guard to prevent duplicate transitions
4. Clear documentation of intent

---

## State Machine Best Practices

### 1. Event Naming Conventions

#### ✅ DO:
```typescript
// Use SCREAMING_SNAKE_CASE for events
| { type: 'AUTHENTICATE' }
| { type: 'AUTH_SUCCESS' }
| { type: 'CONNECTION_ESTABLISHED' }
| { type: 'WORK_ITEMS_LOADED' }

// Use domain-specific prefixes
| { type: 'AUTH_*' }      // Authentication events
| { type: 'CONNECTION_*' } // Connection events
| { type: 'DATA_*' }       // Data events
```

#### ❌ DON'T:
```typescript
// Never use reserved prefixes
| { type: 'xstate.*' }      // Reserved by XState
| { type: 'done.*' }        // Reserved by XState
| { type: 'error.*' }       // Could conflict with XState

// Avoid lowercase or camelCase
| { type: 'authenticate' }  // Inconsistent
| { type: 'authSuccess' }   // Not conventional
```

### 2. `always` Transitions - Use With Caution

#### ✅ GOOD Uses of `always`:

**Pattern 1: Router/Switch Pattern** (with guards)
```typescript
handlingAction: {
  always: [
    { target: 'stateA', guard: 'conditionA', actions: ['actionA'] },
    { target: 'stateB', guard: 'conditionB', actions: ['actionB'] },
    { target: 'stateC', guard: 'conditionC', actions: ['actionC'] },
    { target: 'default' }, // Fallback
  ],
}
```
✅ **Why this is safe**:
- Only ONE transition will match (mutually exclusive guards)
- Immediately exits to another state
- No side effects that could create loops

**Pattern 2: Conditional Initial State**
```typescript
someState: {
  always: [
    { target: 'optimizedPath', guard: 'canOptimize' },
    { target: 'normalPath' },
  ],
}
```

#### ❌ BAD Uses of `always`:

**Anti-Pattern 1: Competing with `invoke`**
```typescript
// ❌ WRONG - races with onDone
someState: {
  invoke: {
    src: 'asyncService',
    onDone: 'nextState',
  },
  always: {
    target: 'nextState',  // Will fire before invoke completes!
  },
}
```

**Anti-Pattern 2: Unconditional Loop**
```typescript
// ❌ WRONG - infinite loop
stateA: {
  always: { target: 'stateB' },
},
stateB: {
  always: { target: 'stateA' },  // Infinite ping-pong!
}
```

**Anti-Pattern 3: Context-Modifying Guard**
```typescript
// ❌ WRONG - guards should be pure
always: {
  guard: ({ context }) => {
    context.counter++;  // DON'T mutate in guards!
    return context.counter < 10;
  },
}
```

### 3. Fallback Mechanisms

**Use `after` for timeout fallbacks**:
```typescript
✅ CORRECT:
someState: {
  invoke: {
    src: 'asyncOperation',
    onDone: 'success',
  },
  after: {
    5000: {
      target: 'timeout',
      guard: 'notAlreadyCompleted',  // Important!
    },
  },
}
```

### 4. Guard Best Practices

#### ✅ DO:
```typescript
// Pure functions - no side effects
guard: ({ context }) => context.isReady && !context.hasError,

// Named guards for reusability
guards: {
  isAuthenticated: ({ context }) => !!context.token,
  hasActiveConnection: ({ context }) => !!context.activeConnectionId,
}
```

#### ❌ DON'T:
```typescript
// Mutating context in guard
guard: ({ context }) => {
  context.checkCount++;  // ❌ Side effect!
  return context.checkCount < 3;
},

// Async operations in guard
guard: async ({ context }) => {  // ❌ Guards must be synchronous!
  const result = await checkAuth();
  return result.valid;
},
```

### 5. Action Best Practices

#### ✅ DO:
```typescript
actions: {
  // Use assign for context updates
  setToken: assign({
    token: ({ event }) => event.token,
  }),
  
  // Implement action typing
  logError: ({ context, event }) => {
    if (event.type === 'ERROR') {
      console.error('[FSM]', event.error);
    }
  },
}
```

#### ❌ DON'T:
```typescript
actions: {
  // Direct context mutation
  badAction: ({ context }) => {
    context.token = 'new-token';  // ❌ Won't work!
  },
  
  // Async logic in actions (use invoke instead)
  asyncAction: async () => {  // ❌ Actions should be synchronous!
    await fetchData();
  },
}
```

### 6. Invoke Patterns

#### ✅ CORRECT Patterns:
```typescript
// Pattern 1: Promise-based service
invoke: {
  src: 'loadData',
  input: ({ context }) => ({ connectionId: context.connectionId }),
  onDone: {
    target: 'success',
    actions: assign({
      data: ({ event }) => event.output,
    }),
  },
  onError: {
    target: 'failure',
    actions: 'logError',
  },
}

// Pattern 2: Actor invocation
invoke: {
  src: authMachine,
  id: 'authActor',
  input: ({ context }) => ({ config: context.authConfig }),
  onDone: 'authenticated',
}
```

---

## Validation Checklist

### ✅ All Machines Pass:

- [x] **No reserved event names** (`xstate.*`, `done.*` prefixes)
- [x] **No unconditional `always` transitions** (except router pattern with guards)
- [x] **Guards are pure functions** (no side effects)
- [x] **Actions use `assign` for context updates**
- [x] **Invoke handlers have `onDone` and `onError`**
- [x] **Timeout fallbacks use `after` not `always`**
- [x] **Event types use SCREAMING_SNAKE_CASE**
- [x] **No async guards or actions**

---

## Machine-Specific Analysis

### ✅ `applicationMachine.ts`
- **Status**: Fixed
- **Issues Resolved**: 
  - Reserved event names → Renamed to `AUTH_SNAPSHOT`, `AUTH_ERROR`, `DATA_SNAPSHOT`, `DATA_ERROR`
  - Infinite loop `always` → Replaced with guarded `after` transition
- **Best Practices Applied**: Added guard to fallback transition

### ✅ `setupMachine.ts`
- **Status**: Valid
- **Pattern**: Uses guarded `always` for routing (acceptable pattern)
- **Notes**: `handlingAction` state correctly implements router pattern with mutually exclusive guards

### ✅ `connectionMachine.ts`
- **Status**: Valid
- **Pattern**: Uses guarded `always` in `checking_existing_token` (acceptable)
- **Notes**: Guard ensures transition only fires when `forceInteractive` is true

### ✅ `timerMachine.ts`
- **Status**: Valid
- **Notes**: Clean state machine, no anti-patterns detected

### ✅ `authMachine.ts`
- **Status**: Valid
- **Notes**: Proper use of invoke patterns

### ✅ `dataMachine.ts`
- **Status**: Valid
- **Notes**: Proper use of invoke patterns

---

## Testing Recommendations

### Test for Infinite Loops:
```typescript
test('should not infinite loop on setup', async () => {
  const actor = createActor(applicationMachine);
  actor.start();
  
  actor.send({ type: 'ACTIVATE', context: mockContext });
  
  // Wait for state stabilization
  await waitFor(actor, (state) => state.matches('active.ready'), { timeout: 1000 });
  
  expect(actor.getSnapshot().value).toMatch(/active\.ready/);
});
```

### Test Event Handling:
```typescript
test('should handle AUTH_SNAPSHOT event', () => {
  const actor = createActor(applicationMachine);
  actor.start();
  
  actor.send({
    type: 'AUTH_SNAPSHOT',
    snapshot: {
      value: 'authenticated',
      context: { connection: { id: 'test' }, token: 'abc123' },
    },
  });
  
  // Verify no errors and proper handling
  expect(actor.getSnapshot().context.connections).toBeDefined();
});
```

---

## Migration Guide

### For Developers Updating Event Handlers:

**Old Code**:
```typescript
actor.subscribe((state) => {
  if (state.event.type === 'xstate.snapshot.auth') {
    // Handle auth snapshot
  }
});
```

**New Code**:
```typescript
actor.subscribe((state) => {
  if (state.event.type === 'AUTH_SNAPSHOT') {
    // Handle auth snapshot
  }
});
```

### Search & Replace Patterns:
```bash
# If you have any external references to old events:
'xstate.snapshot.auth'    → 'AUTH_SNAPSHOT'
'xstate.error.actor.auth' → 'AUTH_ERROR'
'xstate.snapshot.data'    → 'DATA_SNAPSHOT'
'xstate.error.actor.data' → 'DATA_ERROR'
```

---

## Monitoring & Observability

### FSM Health Metrics to Track:

1. **Transition Velocity**: Avg transitions/second (detect loops if > threshold)
2. **State Dwell Time**: Time spent in each state (detect hangs)
3. **Error Rate**: Frequency of `onError` transitions
4. **Fallback Usage**: How often timeout fallbacks trigger

### Recommended Alerting:

```typescript
// Alert if same transition happens > 100 times in 1 second
if (transitionCount > 100 && timeWindow < 1000) {
  logger.error('Possible infinite loop detected', {
    state: currentState,
    event: lastEvent,
    count: transitionCount,
  });
}
```

---

## Conclusion

All critical state machine issues have been resolved:

1. ✅ **Reserved event names removed** - No `xstate.*` custom events
2. ✅ **Infinite loop fixed** - Removed unconditional `always` transition
3. ✅ **Best practices applied** - Guarded fallbacks, proper naming conventions
4. ✅ **All machines validated** - No anti-patterns detected

The state machines now follow XState v5 best practices and are production-ready.

---

## References

- [XState v5 Documentation](https://statelyai.com/docs/xstate)
- [XState Best Practices](https://statelyai.com/docs/xstate/patterns)
- [Finite State Machine Design Patterns](https://en.wikipedia.org/wiki/Finite-state_machine)

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-26  
**Maintained By**: Development Team

