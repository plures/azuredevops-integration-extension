# Praxis History Testing Examples Guide

## Overview

This guide demonstrates how to use the Praxis history testing infrastructure with real-world examples. The examples show three common testing patterns:

1. **Record & Replay** - Capture workflows and replay them as tests
2. **Snapshot Testing** - Validate state at specific points
3. **Event Sequence Validation** - Ensure events process correctly

## Example Test Scenarios

### 1. Connection Authentication Workflow

**File**: `tests/praxis/examples/connection-authentication-workflow.test.ts`

**What it tests**:
- Complete connection setup and authentication flow
- State transitions from inactive → active → authenticated
- Connection state management

**Key patterns demonstrated**:
- Recording a complete workflow
- Snapshot validation at each step
- Event sequence validation

**Usage**:
```typescript
// Record workflow
startRecording('connection-auth-001', 'Complete authentication workflow');
// ... perform actions ...
const scenario = stopRecording();

// Validate with snapshots
createSnapshotTest({
  name: 'auth-validation',
  events: [...],
  expectedSnapshots: [...],
});

// Validate event sequence
validateEventSequence({
  name: 'auth-sequence',
  sequence: [...],
  validators: [...],
});
```

### 2. Work Item Lifecycle

**File**: `tests/praxis/examples/work-item-lifecycle.test.ts`

**What it tests**:
- Work item creation
- Timer start/stop functionality
- Work item state management

**Key patterns demonstrated**:
- Testing business logic (timer requires work item)
- Validating work item loading
- State transitions for work items

**Usage**:
```typescript
// Test timer validation
validateEventSequence({
  name: 'timer-validation',
  sequence: [
    StartTimerEvent.create({ workItemId: null }),
  ],
  validators: [
    {
      afterIndex: 0,
      validator: checkCondition(
        (ctx) => ctx.timerState === null || ctx.timerState === 'idle',
        'Timer should not start without work item'
      ),
    },
  ],
});
```

### 3. Error Recovery

**File**: `tests/praxis/examples/error-recovery.test.ts`

**What it tests**:
- Error scenarios
- Recovery workflows
- Error state transitions

**Key patterns demonstrated**:
- Testing error handling
- Validating recovery attempts
- Error state management

**Usage**:
```typescript
// Test error recovery
const result = validateEventSequence({
  name: 'error-recovery',
  sequence: [
    ApplicationErrorEvent.create({ error: 'Test error' }),
    RetryApplicationEvent.create({}),
  ],
  validators: [
    {
      afterIndex: 0,
      validator: (ctx) => ctx.lastError !== null,
    },
    {
      afterIndex: 1,
      validator: (ctx) => ctx.errorRecoveryAttempts > 0,
    },
  ],
});
```

## Testing Patterns

### Pattern 1: Record & Replay

**When to use**: Capture real user workflows and replay them as tests.

```typescript
it('should record workflow', async () => {
  startRecording('scenario-id', 'Workflow Name');
  
  // Perform actions
  dispatch([Event1.create({})]);
  await waitForState((ctx) => ctx.property === value);
  
  dispatch([Event2.create({})]);
  await waitForState((ctx) => ctx.property2 === value2);
  
  const scenario = stopRecording();
  
  // Verify scenario
  expect(scenario.events.length).toBeGreaterThan(0);
  expect(scenario.finalContext.property).toBe(expectedValue);
});
```

### Pattern 2: Snapshot Testing

**When to use**: Validate state at specific points in a workflow.

```typescript
it('should validate state snapshots', () => {
  const testFn = createSnapshotTest({
    name: 'test-name',
    events: [
      Event1.create({}),
      Event2.create({}),
    ],
    expectedSnapshots: [
      {
        index: 0,
        state: 'expected-state',
        contextChecks: (ctx) => ctx.property === expectedValue,
        description: 'What should be true at this point',
      },
    ],
  });
  
  expect(() => testFn()).not.toThrow();
});
```

### Pattern 3: Event Sequence Validation

**When to use**: Ensure events process in correct order and produce expected state.

```typescript
it('should validate event sequence', () => {
  const result = validateEventSequence({
    name: 'test-name',
    sequence: [
      Event1.create({}),
      Event2.create({}),
    ],
    validators: [
      {
        afterIndex: 0,
        validator: checkState('expected-state'),
        errorMessage: 'State should be...',
      },
      {
        afterIndex: 1,
        validator: checkProperty('property', expectedValue),
        errorMessage: 'Property should be...',
      },
    ],
  });
  
  expect(result.valid).toBe(true);
  expect(result.errors.length).toBe(0);
});
```

## Helper Functions

### State Validation

```typescript
import { checkState, checkProperty, checkCondition } from '../../../src/testing/eventSequenceValidator.js';

// Check state value
checkState('active')

// Check property value
checkProperty('connections', [connection1, connection2])

// Check custom condition
checkCondition(
  (ctx) => ctx.connections.length > 0,
  'Should have connections'
)
```

### Async Operations

```typescript
import { waitForState, waitForStateValue } from '../../../src/testing/helpers.js';

// Wait for condition
await waitForState((ctx) => ctx.property === value);

// Wait for specific state
await waitForStateValue('active');
```

### Context Access

```typescript
import { getContext, getState } from '../../../src/testing/helpers.js';

// Get current context
const ctx = getContext();

// Get current state
const state = getState();
```

## Best Practices

1. **Always reset engine** in `beforeEach`:
   ```typescript
   beforeEach(() => {
     resetEngine();
   });
   ```

2. **Use descriptive scenario names**:
   ```typescript
   startRecording('connection-auth-001', 'Complete connection authentication workflow');
   ```

3. **Wait for async operations**:
   ```typescript
   dispatch([Event.create({})]);
   await waitForState((ctx) => ctx.property === expectedValue);
   ```

4. **Validate final state** after recording:
   ```typescript
   const scenario = stopRecording();
   expect(scenario.finalContext.property).toBe(expectedValue);
   ```

5. **Use context checks** in snapshot tests:
   ```typescript
   contextChecks: (ctx) => {
     return ctx.property1 === value1 && ctx.property2 === value2;
   }
   ```

6. **Add descriptions** to validators:
   ```typescript
   {
     afterIndex: 0,
     validator: checkState('active'),
     errorMessage: 'Application should be active after activation',
   }
   ```

## Running Examples

```bash
# Run all example tests
npm run test:feature tests/praxis/examples

# Run specific example
npm run test:feature tests/praxis/examples/connection-authentication-workflow.test.ts

# Run with watch mode
npm run test:feature:watch tests/praxis/examples
```

## Next Steps

- Create more example scenarios
- Add performance testing examples
- Create visual regression testing examples
- Document advanced patterns

## See Also

- [Testing & Debugging Plan](./PRAXIS_HISTORY_ENGINE_TESTING_DEBUGGING_PLAN.md)
- [Implementation Guide](./PRAXIS_HISTORY_TESTING_DEBUGGING_IMPLEMENTATION.md)
- [Next Steps](./PRAXIS_HISTORY_NEXT_STEPS.md)

