# Demo: Finding and Fixing Logic Errors

This document demonstrates how the Praxis history testing infrastructure helps identify and fix logic errors.

## Overview

The history testing tools provide multiple ways to detect logic errors:

1. **Event Sequence Validation** - Validates that events lead to expected states
2. **State Diff Analysis** - Shows what changed between states
3. **Performance Profiling** - Identifies slow or problematic transitions
4. **Snapshot Testing** - Ensures state consistency at each step

## Example: Timer Logic Error Detection

### The Problem

Imagine a bug where the timer can start without a work item being selected. This violates business rules.

### Step 1: Record the Scenario

```typescript
import { startRecording, stopRecording } from './testing/historyTestRecorder.js';
import { dispatch } from './testing/helpers.js';
import { StartTimerEvent, ConnectionsLoadedEvent } from './praxis/application/facts.js';

// Record the problematic scenario
startRecording('timer-error', 'Timer start without work item');

dispatch([ConnectionsLoadedEvent.create({ connections: [...], activeId: 'conn-1' })]);
dispatch([StartTimerEvent.create({ workItemId: null, connectionId: 'conn-1' })]);

const scenario = stopRecording();
```

### Step 2: Validate with Event Sequence Validator

```typescript
import { validateEventSequence, checkCondition } from './testing/eventSequenceValidator.js';

const result = validateEventSequence({
  name: 'timer-validation',
  sequence: scenario.events.map((e) => e.event),
  validators: [
    {
      afterIndex: scenario.events.length - 1,
      validator: checkCondition(
        (ctx) => ctx.timerState === null,
        'Timer should NOT start without work item'
      ),
      errorMessage: '❌ LOGIC ERROR: Timer started without work item!',
    },
  ],
});

if (!result.valid) {
  console.log('Logic error detected!');
  result.errors.forEach((err) => console.log(err.message));
}
```

**Output:**

```
✅ Validation PASSED
✓ Logic is CORRECT - Timer did NOT start
✓ Business rule enforced properly
```

### Step 3: State Diff Analysis

```typescript
import { diffStates, formatDiff } from './debugging/stateDiff.js';

const initialState = getContext();
// ... perform operations ...
const finalState = getContext();

const diff = diffStates(initialState, finalState);
console.log(formatDiff(diff));
```

**Output:**

```
State Diff Analysis:
- Changed fields: 2
- Added fields: 1
- Removed fields: 0

Changed:
  applicationState: "inactive" → "active"
  connections: [] → [Connection {...}]

Unchanged:
  timerState: null (correctly remained null)
```

### Step 4: Performance Analysis

```typescript
import { PerformanceProfiler } from './debugging/performanceProfiler.js';

const profile = PerformanceProfiler.profileHistory();
console.log(`Average transition time: ${profile.summary.averageTransitionTime}ms`);

const slow = PerformanceProfiler.getSlowTransitions(100);
if (slow.length > 0) {
  console.log('⚠️ Slow transitions detected:');
  slow.forEach((t) => {
    console.log(`  ${t.from} → ${t.to}: ${t.duration}ms`);
  });
}
```

**Output:**

```
Performance Analysis:
- Total transitions: 3
- Average transition time: 12.5ms
- Slow transitions: 0
✅ All transitions are fast
```

## Complete Workflow Example

### Scenario: Detecting Invalid Timer Start

```typescript
import { validateEventSequence, checkCondition } from './testing/eventSequenceValidator.js';
import { diffStates } from './debugging/stateDiff.js';
import { PerformanceProfiler } from './debugging/performanceProfiler.js';
import { dispatch, getContext } from './testing/helpers.js';
import {
  ActivateEvent,
  ActivationCompleteEvent,
  ConnectionsLoadedEvent,
  StartTimerEvent,
} from './praxis/application/facts.js';

// 1. Setup
const initialState = getContext();
dispatch([ActivateEvent.create({})]);
dispatch([ActivationCompleteEvent.create({})]);
dispatch([
  ConnectionsLoadedEvent.create({
    connections: [testConnection],
    activeId: 'conn-1',
  }),
]);

// 2. Attempt invalid operation
dispatch([
  StartTimerEvent.create({
    workItemId: null, // ❌ No work item!
    connectionId: 'conn-1',
  }),
]);

const finalState = getContext();

// 3. Validate
const validation = validateEventSequence({
  name: 'timer-logic-check',
  sequence: [
    /* events */
  ],
  validators: [
    {
      afterIndex: 3,
      validator: (ctx) => ctx.timerState === null,
      errorMessage: 'Timer should be null',
    },
  ],
});

// 4. State diff
const diff = diffStates(initialState, finalState);
if (diff.changed['timerState']) {
  console.log('❌ ERROR: Timer state changed!');
} else {
  console.log('✅ CORRECT: Timer state remained null');
}

// 5. Performance check
const profile = PerformanceProfiler.profileHistory();
console.log(`Performance: ${profile.summary.averageTransitionTime}ms avg`);
```

## Real-World Use Cases

### Use Case 1: Regression Detection

```typescript
// Record a working scenario
startRecording('working-scenario', 'Timer with work item');
// ... perform correct operations ...
const workingScenario = stopRecording();

// Later, test if it still works
const currentScenario = recordCurrentScenario();
const diff = compareScenarios(workingScenario, currentScenario);

if (diff.hasBreakingChanges) {
  console.log('⚠️ Regression detected!');
}
```

### Use Case 2: Performance Regression

```typescript
const baseline = PerformanceProfiler.profileHistory();
// ... make changes ...
const current = PerformanceProfiler.profileHistory();

if (current.summary.averageTransitionTime > baseline.summary.averageTransitionTime * 1.5) {
  console.log('⚠️ Performance regression detected!');
}
```

### Use Case 3: State Invariant Validation

```typescript
validateEventSequence({
  name: 'invariant-check',
  sequence: events,
  validators: [
    {
      afterIndex: -1, // After all events
      validator: (ctx) => {
        // Business rule: If timer is running, must have work item
        if (ctx.timerState === 'running') {
          return ctx.activeQuery !== null || ctx.workItems.length > 0;
        }
        return true;
      },
      errorMessage: 'Timer running without work item',
    },
  ],
});
```

## Benefits

1. **Early Detection** - Catch logic errors before they reach production
2. **Clear Diagnostics** - See exactly what changed and why
3. **Performance Monitoring** - Identify slow operations automatically
4. **Regression Prevention** - Ensure fixes don't break existing behavior
5. **Documentation** - Tests serve as executable documentation

## Next Steps

- Run the demo test: `npm run test:praxis tests/praxis/demo/logic-error-demo-simple.test.ts`
- Review the example scenarios in `tests/praxis/examples/`
- Read the [Testing Examples Guide](./PRAXIS_HISTORY_EXAMPLES_GUIDE.md)
- Check the [Vitest Plugin Guide](./PRAXIS_VITEST_PLUGIN_GUIDE.md) for custom matchers
