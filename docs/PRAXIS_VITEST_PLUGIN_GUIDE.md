# Praxis History Vitest Plugin Guide

## Overview

The Praxis History Vitest Plugin provides seamless integration between Praxis history testing and Vitest, including automatic history management, custom matchers, and test artifact generation.

## Features

✅ **Automatic History Reset** - History is automatically reset before each test  
✅ **Export on Failure** - History is automatically exported when tests fail  
✅ **Custom Matchers** - Powerful matchers for history and state validation  
✅ **Test Artifacts** - Automatic generation of history snapshots for failed tests  

## Installation

The plugin is automatically configured via `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    setupFiles: ['tests/setup/praxis-history-setup.ts'],
    // ...
  },
});
```

## Configuration

Configure the plugin in `tests/setup/praxis-history-setup.ts`:

```typescript
const praxisHistory = setupPraxisHistoryTesting({
  exportOnFailure: true,      // Export history when tests fail
  artifactsDir: 'test-artifacts', // Directory for test artifacts
  maxHistorySize: 100,         // Maximum history entries
  autoReset: true,             // Auto-reset before each test
});
```

## Custom Matchers

### `toHaveStateTransition(from, to)`

Check if history contains a specific state transition.

```typescript
it('should transition from inactive to active', () => {
  dispatch([ActivateEvent.create({})]);
  dispatch([ActivationCompleteEvent.create({})]);
  
  expect(history.getHistory()).toHaveStateTransition('inactive', 'activating');
  expect(history.getHistory()).toHaveStateTransition('activating', 'active');
});
```

### `toHaveHistoryLength(expected)`

Check if history has a specific length.

```typescript
it('should have correct history length', () => {
  dispatch([ActivateEvent.create({})]);
  dispatch([ActivationCompleteEvent.create({})]);
  
  expect(history.getHistory()).toHaveHistoryLength(3); // Initial + 2 events
});
```

### `toHaveState(expected)`

Check if current state matches expected value.

```typescript
it('should be in active state', () => {
  dispatch([ActivateEvent.create({})]);
  dispatch([ActivationCompleteEvent.create({})]);
  
  const context = getContext();
  expect(context).toHaveState('active');
});
```

## Automatic Features

### Auto-Reset History

History is automatically reset before each test:

```typescript
beforeEach(() => {
  // History is automatically reset by the plugin
  // No need to manually call resetEngine()
});
```

### Export on Failure

When a test fails, history is automatically exported to `test-artifacts/`:

```
test-artifacts/
  ├── connection_auth_workflow_1234567890.json
  ├── work_item_lifecycle_1234567891.json
  └── error_recovery_1234567892.json
```

Each exported file contains:
- Complete history with all state snapshots
- Events that led to the failure
- Initial and final context
- Metadata (test name, timestamp, etc.)

## Usage Examples

### Example 1: State Transition Testing

```typescript
import { describe, it, expect } from 'vitest';
import { dispatch } from '../../../src/testing/helpers.js';
import { history } from '../../../src/webview/praxis/store.js';
import { ActivateEvent, ActivationCompleteEvent } from '../../../src/praxis/application/facts.js';

describe('State Transitions', () => {
  it('should transition through all states', () => {
    dispatch([ActivateEvent.create({})]);
    expect(history.getHistory()).toHaveStateTransition('inactive', 'activating');
    
    dispatch([ActivationCompleteEvent.create({})]);
    expect(history.getHistory()).toHaveStateTransition('activating', 'active');
  });
});
```

### Example 2: History Length Validation

```typescript
it('should record all events', () => {
  dispatch([Event1.create({})]);
  expect(history.getHistory()).toHaveHistoryLength(2); // Initial + 1 event
  
  dispatch([Event2.create({})]);
  expect(history.getHistory()).toHaveHistoryLength(3); // Initial + 2 events
});
```

### Example 3: State Validation

```typescript
it('should reach expected state', () => {
  dispatch([ActivateEvent.create({})]);
  dispatch([ActivationCompleteEvent.create({})]);
  
  const context = getContext();
  expect(context).toHaveState('active');
});
```

## Test Artifacts

### Accessing Exported History

When a test fails, history is exported to `test-artifacts/`. You can:

1. **Import the history** to reproduce the failure:
   ```typescript
   import { importHistoryFromJSON } from '../../../src/debugging/historyExport.js';
   import * as fs from 'fs';
   
   const historyJson = fs.readFileSync('test-artifacts/failed-test.json', 'utf-8');
   importHistoryFromJSON(historyJson);
   ```

2. **Analyze the failure** by examining the history:
   ```typescript
   const exported = JSON.parse(historyJson);
   console.log('Events:', exported.entries.map(e => e.events));
   console.log('Final state:', exported.entries[exported.entries.length - 1].state);
   ```

3. **Replay the scenario** using EventReplayDebugger:
   ```typescript
   import { getEventReplayDebugger } from '../../../src/debugging/eventReplayDebugger.js';
   import { historyToTestScenario } from '../../../src/debugging/historyExport.js';
   
   const exported = JSON.parse(historyJson);
   const scenario = historyToTestScenario(exported, 'replay-001', 'Replay failed test');
   
   const debugger = getEventReplayDebugger();
   await debugger.replay(scenario);
   ```

## Best Practices

1. **Use custom matchers** for cleaner test code:
   ```typescript
   // Good ✅
   expect(history.getHistory()).toHaveStateTransition('inactive', 'active');
   
   // Less ideal ❌
   const transitions = history.getHistory().map(e => e.state.state);
   expect(transitions).toContain('active');
   ```

2. **Let the plugin handle reset** - Don't manually reset unless needed:
   ```typescript
   // Plugin handles this automatically ✅
   beforeEach(() => {
     // History is already reset
   });
   ```

3. **Check test artifacts** when tests fail:
   ```bash
   # After a test failure
   ls test-artifacts/
   cat test-artifacts/failed_test_1234567890.json
   ```

4. **Use descriptive test names** - They become artifact filenames:
   ```typescript
   // Good ✅
   it('should authenticate connection successfully', () => {
     // ...
   });
   
   // Less ideal ❌
   it('test1', () => {
     // ...
   });
   ```

## Troubleshooting

### Matchers Not Working

If custom matchers aren't recognized:

1. Check that `tests/setup/praxis-history-setup.ts` is in `vitest.config.ts`:
   ```typescript
   test: {
     setupFiles: ['tests/setup/praxis-history-setup.ts'],
   }
   ```

2. Ensure the setup file is importing correctly:
   ```typescript
   import { createMatchers } from '../../src/testing/vitest-plugin-praxis-history.js';
   ```

### History Not Resetting

If history isn't resetting:

1. Check `autoReset` is `true` in setup:
   ```typescript
   setupPraxisHistoryTesting({
     autoReset: true,
   });
   ```

2. Verify `beforeEach` is called in setup file.

### Artifacts Not Generated

If artifacts aren't generated on failure:

1. Check `exportOnFailure` is `true`:
   ```typescript
   setupPraxisHistoryTesting({
     exportOnFailure: true,
   });
   ```

2. Verify `test-artifacts/` directory exists and is writable.

## See Also

- [Testing Examples Guide](./PRAXIS_HISTORY_EXAMPLES_GUIDE.md)
- [History Testing Implementation](./PRAXIS_HISTORY_TESTING_DEBUGGING_IMPLEMENTATION.md)
- [Next Steps](./PRAXIS_HISTORY_NEXT_STEPS.md)

