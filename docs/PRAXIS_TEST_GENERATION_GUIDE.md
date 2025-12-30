# Automated Test Generation Guide

## Overview

The automated test generation feature allows you to convert recorded history or bug reports into executable test code automatically. This enables rapid test creation from real user workflows and bug reproductions.

## Features

✅ **Generate Tests from History** - Convert recorded scenarios to test code  
✅ **Generate Tests from Exported History** - Convert bug reports to tests  
✅ **Multiple Framework Support** - Generate Vitest, Jest, or Mocha tests  
✅ **Snapshot Test Generation** - Generate snapshot-based tests  
✅ **VS Code Integration** - Generate tests via commands  

## Usage

### Method 1: Generate from Current History

**VS Code Command**: `Azure DevOps Integration: Generate Test from History`

1. Record a workflow or reproduce a bug
2. Run the command
3. Enter test name and select framework
4. Test code is generated and saved

### Method 2: Generate from History File

**VS Code Command**: `Azure DevOps Integration: Generate Test from File`

1. Select an exported history JSON file
2. Enter test name and select framework
3. Test code is generated and saved

### Method 3: Programmatic Generation

```typescript
import { generateTestFromScenario, generateTestFromHistory } from './testing/testGenerator.js';
import { startRecording, stopRecording } from './testing/historyTestRecorder.js';

// Record a scenario
startRecording('test-001', 'My Test Scenario');
// ... perform actions ...
const scenario = stopRecording();

// Generate test code
const testCode = generateTestFromScenario(scenario, {
  framework: 'vitest',
  testName: 'my-generated-test',
  includeSnapshots: true,
  includeComments: true,
});

// Save to file
await saveGeneratedTest(testCode, 'tests/generated/my-test.test.ts');
```

## Configuration Options

```typescript
interface TestGenerationOptions {
  framework?: 'vitest' | 'jest' | 'mocha';
  includeSnapshots?: boolean;      // Include snapshot assertions
  includeComments?: boolean;        // Include comments in generated code
  indentSize?: number;              // Indentation size (default: 2)
  testName?: string;                // Name for the test
  describeName?: string;            // Name for describe block
}
```

## Generated Test Structure

### Standard Test

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { resetEngine, dispatch, waitForStateValue, getContext } from '../../../src/testing/helpers.js';

/**
 * Generated test from scenario: Complete connection authentication workflow
 * Original ID: connection-auth-001
 * Generated: 2024-01-15T10:30:00.000Z
 */
describe('Generated Tests', () => {
  beforeEach(() => {
    resetEngine();
  });

  it('connection-authentication-workflow', async () => {
    // Activate application
    dispatch([ActivateEvent.create({})]);
    await waitForStateValue('activating');

    // Complete activation
    dispatch([ActivationCompleteEvent.create({})]);
    await waitForStateValue('active');

    // Verify final state
    const context = getContext();
    expect(context.applicationState).toBe('active');
    expect(context.connections.length).toBe(1);
    expect(context.activeConnectionId).toBe('test-connection-001');

    // Snapshot test
    expect(context).toMatchSnapshot();
  });
});
```

### Snapshot Test

```typescript
import { describe, it, expect } from 'vitest';
import { createSnapshotTest } from '../../../src/testing/snapshotTesting.js';

describe('Generated Tests', () => {
  it('generated-snapshot-test', () => {
    const testFn = createSnapshotTest({
      name: 'Complete connection authentication workflow',
      events: [
        ActivateEvent.create({}),
        ActivationCompleteEvent.create({}),
      ],
      expectedSnapshots: [
        {
          index: 1,
          state: 'activating',
          contextChecks: (ctx) => ctx.applicationState === 'activating',
        },
        {
          index: 2,
          state: 'active',
          contextChecks: (ctx) => ctx.applicationState === 'active',
        },
      ],
    });

    expect(() => testFn()).not.toThrow();
  });
});
```

## Use Cases

### 1. Convert Bug Reports to Tests

```typescript
// User reports a bug with exported history
const historyJson = fs.readFileSync('bug-report.json', 'utf-8');
const exported = JSON.parse(historyJson);

// Generate test from bug report
const testCode = generateTestFromHistory(exported, {
  framework: 'vitest',
  testName: 'bug-reproduction',
});

// Save and run
await saveGeneratedTest(testCode, 'tests/bugs/bug-reproduction.test.ts');
```

### 2. Generate Tests from Recorded Workflows

```typescript
// Record a user workflow
startRecording('user-workflow-001', 'Complete user workflow');
// ... user performs actions ...
const scenario = stopRecording();

// Generate test
const testCode = generateTestFromScenario(scenario, {
  framework: 'vitest',
  testName: 'user-workflow-test',
});

// Save to test suite
await saveGeneratedTest(testCode, 'tests/workflows/user-workflow.test.ts');
```

### 3. Create Regression Tests

```typescript
// After fixing a bug, generate regression test
const testCode = generateTestFromHistory(bugHistory, {
  framework: 'vitest',
  testName: 'regression-test',
  includeSnapshots: true,
});

// Add to regression test suite
await saveGeneratedTest(testCode, 'tests/regression/fixed-bug.test.ts');
```

## Best Practices

1. **Review Generated Code** - Always review and refine generated tests
2. **Add Assertions** - Generated tests include basic assertions; add more as needed
3. **Update Imports** - Verify event imports are correct
4. **Test the Test** - Run generated tests to ensure they work
5. **Refactor as Needed** - Generated code is a starting point; refactor for maintainability

## Limitations

- **Event Imports** - May need manual adjustment of import paths
- **Complex Payloads** - Very complex payloads may not generate perfectly
- **Custom Logic** - Doesn't capture custom validation logic
- **Async Operations** - May need manual adjustment of async/await patterns

## VS Code Commands

- `azureDevOpsInt.debug.test.generateFromHistory` - Generate test from current history
- `azureDevOpsInt.debug.test.generateFromFile` - Generate test from history file

## Examples

See `tests/praxis/examples/test-generation-demo.test.ts` for complete examples.

## See Also

- [Testing Examples Guide](./PRAXIS_HISTORY_EXAMPLES_GUIDE.md)
- [Vitest Plugin Guide](./PRAXIS_VITEST_PLUGIN_GUIDE.md)
- [History Testing Implementation](./PRAXIS_HISTORY_TESTING_DEBUGGING_IMPLEMENTATION.md)

