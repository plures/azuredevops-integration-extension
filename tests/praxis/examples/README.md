# Praxis History Testing Examples

This directory contains example test scenarios demonstrating how to use the Praxis history testing infrastructure.

## Examples

### 1. Connection Authentication Workflow (`connection-authentication-workflow.test.ts`)

Demonstrates:

- Recording a complete connection authentication workflow
- Snapshot testing at each step
- Event sequence validation

**Key Features**:

- Record & replay workflow
- Validate state at each step
- Verify event processing order

### 2. Work Item Lifecycle (`work-item-lifecycle.test.ts`)

Demonstrates:

- Work item creation workflow
- Timer start/stop functionality
- State validation for work items

**Key Features**:

- Record work item operations
- Validate timer state transitions
- Test work item loading

### 3. Error Recovery (`error-recovery.test.ts`)

Demonstrates:

- Error scenario testing
- Recovery workflow validation
- Error state transitions

**Key Features**:

- Record error scenarios
- Validate recovery attempts
- Test error state handling

## Usage Patterns

### Pattern 1: Record & Replay

```typescript
import { startRecording, stopRecording } from '../../../src/testing/historyTestRecorder.js';

startRecording('scenario-id', 'Scenario Name');
// ... perform actions ...
const scenario = stopRecording();
```

### Pattern 2: Snapshot Testing

```typescript
import { createSnapshotTest } from '../../../src/testing/snapshotTesting.js';

const testFn = createSnapshotTest({
  name: 'test-name',
  events: [...],
  expectedSnapshots: [
    {
      index: 0,
      state: 'expected-state',
      contextChecks: (ctx) => ctx.someProperty === expectedValue,
    },
  ],
});
```

### Pattern 3: Event Sequence Validation

```typescript
import { validateEventSequence, checkState } from '../../../src/testing/eventSequenceValidator.js';

const result = validateEventSequence({
  name: 'test-name',
  sequence: [...],
  validators: [
    {
      afterIndex: 0,
      validator: checkState('expected-state'),
      errorMessage: 'State should be...',
    },
  ],
});
```

## Best Practices

1. **Always reset engine** in `beforeEach`:

   ```typescript
   beforeEach(() => {
     resetEngine();
   });
   ```

2. **Use `waitForState`** for async operations:

   ```typescript
   await waitForState((ctx) => ctx.someProperty === expectedValue);
   ```

3. **Validate final state** after recording:

   ```typescript
   const scenario = stopRecording();
   expect(scenario.finalContext.someProperty).toBe(expectedValue);
   ```

4. **Use descriptive names** for scenarios:

   ```typescript
   startRecording('connection-auth-001', 'Complete connection authentication workflow');
   ```

5. **Add context checks** in snapshot tests:
   ```typescript
   contextChecks: (ctx) => {
     // Multiple checks
     return ctx.property1 === value1 && ctx.property2 === value2;
   };
   ```

## Running Examples

```bash
# Run all example tests
npm run test:feature tests/praxis/examples

# Run specific example
npm run test:feature tests/praxis/examples/connection-authentication-workflow.test.ts
```

## Next Steps

- Add more example scenarios
- Create performance testing examples
- Add visual regression testing examples
- Document advanced patterns
