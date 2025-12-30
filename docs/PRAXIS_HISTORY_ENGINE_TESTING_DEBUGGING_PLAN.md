# Praxis History Engine: Testing & Debugging Plan

## Overview

The Praxis history engine provides powerful time-travel debugging and state snapshot capabilities. This document outlines how to leverage these features for automated testing and advanced debugging.

## Current State

✅ **History Engine Implemented**:
- `createHistoryEngine` with 50 snapshot capacity
- Undo/redo functionality with state restoration
- History tracking for all dispatched events
- State snapshots with full context

✅ **Existing Infrastructure**:
- Vitest test framework
- ComponentLogger and TraceLogger
- FSM Inspector and trace commands
- Debug console bridge

## 1. Automated Testing Enhancements

### 1.1 History-Based Test Recording & Replay

**Goal**: Record user interactions and replay them as automated tests.

**Implementation**:

```typescript
// src/testing/historyRecorder.ts
export interface TestScenario {
  id: string;
  name: string;
  initialState: ApplicationEngineContext;
  events: Array<{
    event: PraxisEvent;
    label?: string;
    expectedState?: Partial<ApplicationEngineContext>;
    timestamp: number;
  }>;
  finalState: ApplicationEngineContext;
}

export class HistoryTestRecorder {
  private scenario: TestScenario | null = null;
  
  startRecording(scenarioId: string, scenarioName: string) {
    const initialState = frontendEngine.getContext();
    this.scenario = {
      id: scenarioId,
      name: scenarioName,
      initialState: { ...initialState },
      events: [],
      finalState: initialState,
    };
  }
  
  stopRecording(): TestScenario {
    if (!this.scenario) throw new Error('No active recording');
    this.scenario.finalState = frontendEngine.getContext();
    return this.scenario;
  }
  
  // Hook into dispatch to record events
  recordEvent(event: PraxisEvent, label?: string) {
    if (!this.scenario) return;
    this.scenario.events.push({
      event,
      label,
      timestamp: Date.now(),
    });
  }
}

// Usage in tests
test('user workflow: create work item and start timer', async () => {
  const recorder = new HistoryTestRecorder();
  recorder.startRecording('test-001', 'Create work item and start timer');
  
  // Simulate user actions
  dispatch([CreateWorkItemEvent.create({ title: 'Test Item' })]);
  await waitForState((ctx) => ctx.workItems.length > 0);
  
  const workItemId = frontendEngine.getContext().workItems[0].id;
  dispatch([StartTimerEvent.create({ workItemId })]);
  
  const scenario = recorder.stopRecording();
  
  // Save scenario for replay
  await saveTestScenario(scenario);
  
  // Verify final state
  expect(frontendEngine.getContext().timerState).toBe('running');
});
```

**Benefits**:
- Record real user workflows
- Replay scenarios for regression testing
- Generate test cases from bug reports
- Validate state transitions

### 1.2 Snapshot-Based Regression Testing

**Goal**: Compare state snapshots to detect regressions.

**Implementation**:

```typescript
// src/testing/snapshotTesting.ts
export interface SnapshotTest {
  name: string;
  events: PraxisEvent[];
  expectedSnapshots: Array<{
    index: number;
    state: string;
    contextChecks: (ctx: ApplicationEngineContext) => boolean;
  }>;
}

export function createSnapshotTest(test: SnapshotTest) {
  return () => {
    // Reset to initial state
    const initialContext = getInitialContext();
    frontendEngine.updateContext(initialContext);
    history.clearHistory();
    
    // Apply events
    for (const event of test.events) {
      dispatch([event]);
    }
    
    // Verify snapshots
    const historyEntries = history.getHistory();
    for (const expected of test.expectedSnapshots) {
      const entry = historyEntries[expected.index];
      expect(entry).toBeDefined();
      expect(entry.state.state).toBe(expected.state);
      expect(expected.contextChecks(entry.state.context)).toBe(true);
    }
  };
}

// Usage
test('connection authentication flow', createSnapshotTest({
  name: 'connection-auth-flow',
  events: [
    ConnectionAddedEvent.create({ ... }),
    AuthenticationRequiredEvent.create({ connectionId: '...' }),
    AuthenticationSuccessEvent.create({ connectionId: '...' }),
  ],
  expectedSnapshots: [
    { index: 1, state: 'active', contextChecks: (ctx) => ctx.connections.length === 1 },
    { index: 2, state: 'active', contextChecks: (ctx) => ctx.connectionStates.get('...')?.state === 'authenticated' },
  ],
}));
```

**Benefits**:
- Detect state regressions automatically
- Validate state transitions at each step
- Compare snapshots across versions
- Ensure state consistency

### 1.3 Event Sequence Validation

**Goal**: Validate that events are processed in correct order and produce expected state.

**Implementation**:

```typescript
// src/testing/eventSequenceValidator.ts
export interface EventSequenceTest {
  name: string;
  sequence: PraxisEvent[];
  validators: Array<{
    afterIndex: number;
    validator: (ctx: ApplicationEngineContext, history: HistoryEntry[]) => boolean;
    errorMessage: string;
  }>;
}

export function validateEventSequence(test: EventSequenceTest) {
  return () => {
    resetEngine();
    
    for (let i = 0; i < test.sequence.length; i++) {
      dispatch([test.sequence[i]]);
      
      // Run validators for this index
      const validators = test.validators.filter(v => v.afterIndex === i);
      for (const validator of validators) {
        const ctx = frontendEngine.getContext();
        const historyEntries = history.getHistory();
        const isValid = validator.validator(ctx, historyEntries);
        expect(isValid).toBe(true, validator.errorMessage);
      }
    }
  };
}

// Usage
test('timer cannot start without work item', validateEventSequence({
  name: 'timer-validation',
  sequence: [
    StartTimerEvent.create({ workItemId: null }),
  ],
  validators: [
    {
      afterIndex: 0,
      validator: (ctx) => ctx.timerState === 'idle',
      errorMessage: 'Timer should not start without work item',
    },
  ],
}));
```

**Benefits**:
- Validate business rules automatically
- Test edge cases and error conditions
- Ensure state invariants are maintained
- Catch logic errors early

### 1.4 State Transition Testing

**Goal**: Test all possible state transitions systematically.

**Implementation**:

```typescript
// src/testing/stateTransitionTester.ts
export interface StateTransition {
  from: string;
  event: PraxisEvent;
  to: string;
  guard?: (ctx: ApplicationEngineContext) => boolean;
}

export function testStateTransitions(transitions: StateTransition[]) {
  return () => {
    for (const transition of transitions) {
      // Set up initial state
      const initialState = createState(transition.from);
      frontendEngine.updateContext(initialState);
      history.clearHistory();
      
      // Check guard if present
      if (transition.guard && !transition.guard(initialState)) {
        continue; // Skip if guard fails
      }
      
      // Apply transition
      dispatch([transition.event]);
      
      // Verify final state
      const finalState = frontendEngine.getContext();
      expect(finalState.applicationState).toBe(transition.to);
    }
  };
}

// Usage
test('all application state transitions', testStateTransitions([
  {
    from: 'inactive',
    event: ActivateEvent.create({}),
    to: 'active',
  },
  {
    from: 'active',
    event: DeactivateEvent.create({}),
    to: 'inactive',
  },
  // ... all transitions
]));
```

**Benefits**:
- Comprehensive state coverage
- Validate all transitions work correctly
- Ensure no invalid transitions occur
- Document allowed state changes

## 2. Advanced Debugging Features

### 2.1 Time-Travel Debugging UI

**Goal**: Visual interface for navigating through state history.

**Implementation**:

```typescript
// src/webview/components/HistoryTimeline.svelte
<script lang="ts">
  import { history } from '../praxis/store.js';
  
  const historyEntries = $derived(history.getHistory());
  const currentIndex = $state(historyEntries.length - 1);
  
  function goToSnapshot(index: number) {
    history.goToHistory(index);
    currentIndex = index;
  }
  
  function compareSnapshots(index1: number, index2: number) {
    const entry1 = historyEntries[index1];
    const entry2 = historyEntries[index2];
    // Show diff between snapshots
    return diffContext(entry1.state.context, entry2.state.context);
  }
</script>

<div class="history-timeline">
  {#each historyEntries as entry, index}
    <div 
      class="timeline-entry" 
      class:active={index === currentIndex}
      onclick={() => goToSnapshot(index)}
    >
      <span class="index">{index}</span>
      <span class="state">{entry.state.state}</span>
      <span class="label">{entry.label || 'Unlabeled'}</span>
      <span class="timestamp">{new Date(entry.timestamp).toLocaleTimeString()}</span>
    </div>
  {/each}
</div>
```

**Features**:
- Visual timeline of state changes
- Click to jump to any snapshot
- Compare any two snapshots
- Filter by state or event type
- Export history for sharing

### 2.2 State Diff Visualization

**Goal**: Show what changed between state snapshots.

**Implementation**:

```typescript
// src/debugging/stateDiff.ts
export interface StateDiff {
  added: Record<string, any>;
  removed: Record<string, any>;
  changed: Record<string, { from: any; to: any }>;
  unchanged: Record<string, any>;
}

export function diffStates(
  from: ApplicationEngineContext,
  to: ApplicationEngineContext
): StateDiff {
  const diff: StateDiff = {
    added: {},
    removed: {},
    changed: {},
    unchanged: {},
  };
  
  // Compare all properties
  const allKeys = new Set([...Object.keys(from), ...Object.keys(to)]);
  
  for (const key of allKeys) {
    const fromValue = (from as any)[key];
    const toValue = (to as any)[key];
    
    if (!(key in from)) {
      diff.added[key] = toValue;
    } else if (!(key in to)) {
      diff.removed[key] = fromValue;
    } else if (JSON.stringify(fromValue) !== JSON.stringify(toValue)) {
      diff.changed[key] = { from: fromValue, to: toValue };
    } else {
      diff.unchanged[key] = fromValue;
    }
  }
  
  return diff;
}

// Usage in debug view
function showStateDiff(index1: number, index2: number) {
  const entries = history.getHistory();
  const diff = diffStates(
    entries[index1].state.context,
    entries[index2].state.context
  );
  
  console.log('State Diff:', {
    added: Object.keys(diff.added),
    removed: Object.keys(diff.removed),
    changed: diff.changed,
  });
}
```

**Benefits**:
- Understand what changed and why
- Debug state mutations
- Identify unexpected changes
- Visualize state evolution

### 2.3 Event Replay with Breakpoints

**Goal**: Replay events step-by-step with breakpoints for debugging.

**Implementation**:

```typescript
// src/debugging/eventReplay.ts
export class EventReplayDebugger {
  private breakpoints: Set<number> = new Set();
  private paused: boolean = false;
  
  setBreakpoint(index: number) {
    this.breakpoints.add(index);
  }
  
  removeBreakpoint(index: number) {
    this.breakpoints.delete(index);
  }
  
  async replay(scenario: TestScenario, options?: {
    stepDelay?: number;
    pauseOnBreakpoint?: boolean;
  }) {
    // Reset to initial state
    frontendEngine.updateContext(scenario.initialState);
    history.clearHistory();
    
    for (let i = 0; i < scenario.events.length; i++) {
      // Check for breakpoint
      if (this.breakpoints.has(i) && options?.pauseOnBreakpoint) {
        this.paused = true;
        await this.waitForResume();
      }
      
      // Dispatch event
      dispatch([scenario.events[i].event], scenario.events[i].label);
      
      // Wait if step delay specified
      if (options?.stepDelay) {
        await new Promise(resolve => setTimeout(resolve, options.stepDelay));
      }
      
      // Log state after each step
      console.debug(`[Replay] Step ${i}:`, {
        event: scenario.events[i].event.tag,
        state: frontendEngine.getContext().applicationState,
      });
    }
  }
  
  private async waitForResume(): Promise<void> {
    return new Promise((resolve) => {
      const checkResume = () => {
        if (!this.paused) {
          resolve();
        } else {
          setTimeout(checkResume, 100);
        }
      };
      checkResume();
    });
  }
  
  resume() {
    this.paused = false;
  }
  
  pause() {
    this.paused = true;
  }
}
```

**Benefits**:
- Step through events one at a time
- Set breakpoints at specific events
- Inspect state at each step
- Debug complex event sequences

### 2.4 History Export/Import for Bug Reports

**Goal**: Export history for sharing bugs and reproducing issues.

**Implementation**:

```typescript
// src/debugging/historyExport.ts
export interface ExportedHistory {
  version: string;
  timestamp: string;
  initialContext: ApplicationEngineContext;
  entries: Array<{
    index: number;
    timestamp: number;
    label?: string;
    events: PraxisEvent[];
    state: {
      state: string;
      context: ApplicationEngineContext;
    };
  }>;
}

export function exportHistory(): ExportedHistory {
  const entries = history.getHistory();
  
  return {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    initialContext: entries[0]?.state.context || frontendEngine.getContext(),
    entries: entries.map((entry, index) => ({
      index,
      timestamp: entry.timestamp,
      label: entry.label,
      events: entry.events || [],
      state: {
        state: entry.state.state,
        context: entry.state.context,
      },
    })),
  };
}

export function importHistory(exported: ExportedHistory) {
  // Reset engine
  frontendEngine.updateContext(exported.initialContext);
  history.clearHistory();
  
  // Replay events
  for (const entry of exported.entries) {
    if (entry.events.length > 0) {
      dispatch(entry.events, entry.label);
    }
  }
}

// Usage: Export for bug report
function exportBugReport() {
  const exported = exportHistory();
  const json = JSON.stringify(exported, null, 2);
  vscode.env.clipboard.writeText(json);
  vscode.window.showInformationMessage('History exported to clipboard');
}

// Usage: Import to reproduce
function importBugReport(json: string) {
  const exported = JSON.parse(json) as ExportedHistory;
  importHistory(exported);
  vscode.window.showInformationMessage('History imported - state restored');
}
```

**Benefits**:
- Share exact reproduction steps
- Debug issues without access to user's environment
- Reproduce bugs consistently
- Create test cases from bug reports

### 2.5 Performance Profiling with History

**Goal**: Analyze performance by tracking state transition times.

**Implementation**:

```typescript
// src/debugging/performanceProfiler.ts
export interface PerformanceProfile {
  transitions: Array<{
    from: string;
    to: string;
    duration: number;
    eventCount: number;
    contextSize: number;
  }>;
  slowestTransitions: Array<{
    transition: string;
    duration: number;
  }>;
  averageTransitionTime: number;
}

export function profileHistory(): PerformanceProfile {
  const entries = history.getHistory();
  const transitions: PerformanceProfile['transitions'] = [];
  
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1];
    const curr = entries[i];
    
    const duration = curr.timestamp - prev.timestamp;
    const transition = `${prev.state.state} → ${curr.state.state}`;
    
    transitions.push({
      from: prev.state.state,
      to: curr.state.state,
      duration,
      eventCount: curr.events?.length || 0,
      contextSize: JSON.stringify(curr.state.context).length,
    });
  }
  
  const slowestTransitions = transitions
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10)
    .map(t => ({
      transition: `${t.from} → ${t.to}`,
      duration: t.duration,
    }));
  
  const averageTransitionTime = transitions.reduce((sum, t) => sum + t.duration, 0) / transitions.length;
  
  return {
    transitions,
    slowestTransitions,
    averageTransitionTime,
  };
}
```

**Benefits**:
- Identify slow state transitions
- Optimize performance bottlenecks
- Track performance regressions
- Profile real user workflows

## 3. Integration with Existing Tools

### 3.1 VS Code Debugger Integration

**Goal**: Integrate history engine with VS Code debugger.

**Implementation**:

```typescript
// src/debugging/vscodeDebuggerIntegration.ts
export function registerHistoryDebugger() {
  vscode.debug.registerDebugAdapterTrackerFactory('*', {
    createDebugAdapterTracker(session) {
      return {
        onDidSendMessage(message) {
          if (message.type === 'event' && message.event === 'stopped') {
            // When debugger stops, show current history state
            const currentState = frontendEngine.getContext();
            const historyEntries = history.getHistory();
            
            session.customRequest('praxis/history', {
              currentIndex: historyEntries.length - 1,
              totalEntries: historyEntries.length,
              currentState: currentState.applicationState,
            });
          }
        },
      };
    },
  });
  
  // Add custom debug commands
  vscode.commands.registerCommand('azureDevOpsInt.debug.history.export', () => {
    const exported = exportHistory();
    // Save to file or clipboard
  });
  
  vscode.commands.registerCommand('azureDevOpsInt.debug.history.import', async () => {
    const file = await vscode.window.showOpenDialog({
      filters: { 'History Files': ['json'] },
    });
    if (file) {
      const content = await vscode.workspace.fs.readFile(file[0]);
      const exported = JSON.parse(content.toString());
      importHistory(exported);
    }
  });
}
```

### 3.2 Test Runner Integration

**Goal**: Integrate history testing with Vitest.

**Implementation**:

```typescript
// src/testing/vitestHistoryPlugin.ts
import { beforeEach, afterEach } from 'vitest';

export function setupHistoryTesting() {
  beforeEach(() => {
    // Reset history before each test
    history.clearHistory();
    frontendEngine.updateContext(getInitialContext());
  });
  
  afterEach(() => {
    // Export history if test failed
    if (expect.getState().testPath) {
      const exported = exportHistory();
      // Save to test artifacts directory
      saveTestArtifact(exported);
    }
  });
}

// Custom matchers
expect.extend({
  toHaveStateTransition(received, from, to) {
    const entries = history.getHistory();
    const transition = entries.find(
      (e, i) => 
        i > 0 && 
        entries[i - 1].state.state === from && 
        e.state.state === to
    );
    
    return {
      message: () => `Expected state transition ${from} → ${to}`,
      pass: !!transition,
    };
  },
  
  toHaveHistoryLength(received, expected) {
    const length = history.getHistory().length;
    return {
      message: () => `Expected history length ${expected}, got ${length}`,
      pass: length === expected,
    };
  },
});
```

### 3.3 Logging Integration

**Goal**: Correlate logs with history entries.

**Implementation**:

```typescript
// src/logging/historyCorrelation.ts
export function correlateLogsWithHistory(logs: LogEntry[]) {
  const historyEntries = history.getHistory();
  
  return logs.map(log => {
    // Find closest history entry by timestamp
    const closestEntry = historyEntries.reduce((closest, entry) => {
      const logTime = log.timestamp;
      const entryTime = entry.timestamp;
      const closestTime = closest.timestamp;
      
      if (Math.abs(logTime - entryTime) < Math.abs(logTime - closestTime)) {
        return entry;
      }
      return closest;
    }, historyEntries[0]);
    
    return {
      ...log,
      historyIndex: historyEntries.indexOf(closestEntry),
      state: closestEntry.state.state,
    };
  });
}
```

## 4. Implementation Roadmap

### Phase 1: Core Testing Infrastructure (Week 1-2)

1. ✅ History engine already implemented
2. **HistoryTestRecorder** - Record test scenarios
3. **SnapshotTesting** - Snapshot comparison utilities
4. **EventSequenceValidator** - Event sequence validation

### Phase 2: Debugging UI (Week 3-4)

1. **HistoryTimeline Component** - Visual timeline UI
2. **StateDiff Visualization** - Show state changes
3. **EventReplayDebugger** - Step-through debugging
4. **History Export/Import** - Bug report sharing

### Phase 3: Integration (Week 5-6)

1. **VS Code Debugger Integration** - Custom debug adapter
2. **Vitest Plugin** - Test runner integration
3. **Logging Correlation** - Link logs to history
4. **Performance Profiling** - Performance analysis

### Phase 4: Advanced Features (Week 7-8)

1. **Automated Test Generation** - Generate tests from history
2. **Regression Detection** - Compare snapshots across versions
3. **State Invariant Validation** - Validate business rules
4. **Visual Test Reports** - HTML test reports with history

## 5. Example Test Cases

### Example 1: User Workflow Test

```typescript
test('complete user workflow: setup → authenticate → load work items', async () => {
  const recorder = new HistoryTestRecorder();
  recorder.startRecording('user-workflow-001', 'Complete setup workflow');
  
  // Simulate user actions
  dispatch([SetupWizardStartedEvent.create({})]);
  await waitForState((ctx) => ctx.applicationState === 'active.setup');
  
  dispatch([ConnectionAddedEvent.create({ ... })]);
  await waitForState((ctx) => ctx.connections.length > 0);
  
  dispatch([AuthenticationStartedEvent.create({ connectionId: '...' })]);
  await waitForState((ctx) => ctx.connectionStates.get('...')?.state === 'authenticated');
  
  dispatch([WorkItemsLoadedEvent.create({ connectionId: '...', workItems: [...] })]);
  await waitForState((ctx) => ctx.connectionWorkItems.get('...')?.length > 0);
  
  const scenario = recorder.stopRecording();
  
  // Verify final state
  expect(frontendEngine.getContext().applicationState).toBe('active.ready');
  expect(frontendEngine.getContext().connections.length).toBe(1);
  expect(frontendEngine.getContext().connectionWorkItems.get('...')?.length).toBeGreaterThan(0);
  
  // Save for regression testing
  await saveTestScenario(scenario);
});
```

### Example 2: Error Recovery Test

```typescript
test('error recovery: network failure → retry → success', async () => {
  resetEngine();
  
  // Simulate network failure
  dispatch([NetworkErrorEvent.create({ connectionId: '...', error: 'Timeout' })]);
  await waitForState((ctx) => ctx.lastError !== null);
  
  // Verify error state
  expect(frontendEngine.getContext().applicationState).toBe('active.error');
  expect(frontendEngine.getContext().errorRecoveryAttempts).toBe(0);
  
  // Retry
  dispatch([RetryEvent.create({})]);
  await waitForState((ctx) => ctx.errorRecoveryAttempts > 0);
  
  // Simulate success
  dispatch([NetworkSuccessEvent.create({ connectionId: '...' })]);
  await waitForState((ctx) => ctx.lastError === null);
  
  // Verify recovery
  expect(frontendEngine.getContext().applicationState).toBe('active.ready');
  expect(frontendEngine.getContext().errorRecoveryAttempts).toBe(1);
  
  // Verify history contains all transitions
  const entries = history.getHistory();
  expect(entries.some(e => e.state.state === 'active.error')).toBe(true);
  expect(entries.some(e => e.state.state === 'active.ready')).toBe(true);
});
```

### Example 3: State Invariant Test

```typescript
test('state invariants: timer cannot run without work item', async () => {
  resetEngine();
  
  // Try to start timer without work item
  dispatch([StartTimerEvent.create({ workItemId: null })]);
  
  // Verify timer remains idle
  expect(frontendEngine.getContext().timerState).toBe('idle');
  
  // Verify history shows failed attempt
  const entries = history.getHistory();
  const lastEntry = entries[entries.length - 1];
  expect(lastEntry.state.context.timerState).toBe('idle');
});
```

## 6. Benefits Summary

### For Testing
- ✅ **Record & Replay** - Capture real workflows as tests
- ✅ **Snapshot Testing** - Detect state regressions
- ✅ **Event Validation** - Ensure correct event processing
- ✅ **State Coverage** - Test all state transitions
- ✅ **Regression Detection** - Compare snapshots across versions

### For Debugging
- ✅ **Time-Travel** - Navigate through state history
- ✅ **State Inspection** - View state at any point
- ✅ **Event Replay** - Step through events with breakpoints
- ✅ **Bug Sharing** - Export/import history for reproduction
- ✅ **Performance Analysis** - Profile state transitions

### For Development
- ✅ **Better Tests** - More comprehensive test coverage
- ✅ **Faster Debugging** - Time-travel to find issues
- ✅ **Better Documentation** - History shows how system works
- ✅ **Quality Assurance** - Validate state consistency

## 7. Next Steps

1. **Implement HistoryTestRecorder** - Start with recording functionality
2. **Create HistoryTimeline Component** - Visual debugging UI
3. **Add Snapshot Testing Utilities** - Comparison and validation
4. **Integrate with Vitest** - Test runner integration
5. **Add Export/Import** - Bug report sharing

## References

- [Praxis History Engine Documentation](./PRAXIS_V1.2.0_ENHANCEMENTS_IMPLEMENTED.md)
- [Praxis Unified Integration](./PRAXIS_UNIFIED_INTEGRATION.md)
- [Testing Infrastructure](./architecture/FOUNDATION_PROGRESS.md)
- [Logging System](./UNIFIED_LOGGING_GUIDE.md)

