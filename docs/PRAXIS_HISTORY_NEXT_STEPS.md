# Praxis History Engine: Next Steps

## Current Status

✅ **Phase 1-3 Complete**: Core testing infrastructure, debugging UI, and VS Code integration are all implemented and working.

## Recommended Next Steps (Priority Order)

### 1. Write Real Test Examples (High Priority) ⭐

**Goal**: Create practical test examples using the new infrastructure to demonstrate value and establish patterns.

**Tasks**:
- [ ] Create example test scenarios for common workflows
  - Connection setup and authentication flow
  - Work item creation and timer start
  - Error recovery scenarios
  - View mode switching
- [ ] Add integration tests using `HistoryTestRecorder`
- [ ] Create snapshot tests for critical state transitions
- [ ] Document test patterns and best practices

**Files to Create**:
```
tests/praxis/examples/
  ├── connection-workflow.test.ts
  ├── work-item-lifecycle.test.ts
  ├── error-recovery.test.ts
  └── state-transitions.test.ts
```

**Value**: Demonstrates the power of the new testing infrastructure and provides templates for future tests.

---

### 2. Vitest Plugin Integration (High Priority) ⭐

**Goal**: Create a Vitest plugin that automatically integrates history testing into the test runner.

**Tasks**:
- [ ] Create `vitest-plugin-praxis-history.ts`
- [ ] Auto-reset history before each test
- [ ] Export history on test failure
- [ ] Add custom matchers (`toHaveStateTransition`, `toHaveHistoryLength`)
- [ ] Generate test artifacts with history snapshots

**Implementation**:
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { praxisHistory } from './src/testing/vitest-plugin.js';

export default defineConfig({
  plugins: [
    praxisHistory({
      exportOnFailure: true,
      maxHistorySize: 100,
    }),
  ],
});
```

**Value**: Seamless integration with existing test infrastructure, automatic history management.

---

### 3. Automated Test Generation (Medium Priority)

**Goal**: Generate test cases automatically from recorded history.

**Tasks**:
- [ ] Create `generateTestFromHistory()` function
- [ ] Extract test scenarios from history entries
- [ ] Generate Vitest test code
- [ ] Support multiple output formats (Vitest, Jest, Mocha)
- [ ] Add test case templates

**Usage**:
```typescript
import { generateTestFromHistory } from './testing/testGenerator.js';

const history = exportHistory();
const testCode = generateTestFromHistory(history, {
  framework: 'vitest',
  includeSnapshots: true,
});

// Write to file
await writeFile('generated-test.test.ts', testCode);
```

**Value**: Convert bug reports and user workflows into automated tests automatically.

---

### 4. Performance Profiling Dashboard (Medium Priority)

**Goal**: Visual dashboard for analyzing state transition performance.

**Tasks**:
- [ ] Create `PerformanceProfiler` class
- [ ] Track transition times, context sizes, event counts
- [ ] Create `PerformanceDashboard.svelte` component
- [ ] Identify slow transitions
- [ ] Export performance reports

**Features**:
- Timeline showing transition durations
- Heatmap of slow operations
- Memory usage tracking
- Export performance data

**Value**: Identify performance bottlenecks and optimize state transitions.

---

### 5. State Invariant Validation (Medium Priority)

**Goal**: Automatically validate business rules and state invariants.

**Tasks**:
- [ ] Create `StateInvariant` interface
- [ ] Define common invariants (e.g., "timer can't run without work item")
- [ ] Auto-validate on state changes
- [ ] Create invariant violation reports
- [ ] Add to test framework

**Usage**:
```typescript
import { defineInvariant, validateInvariants } from './testing/invariants.js';

const invariants = [
  defineInvariant('timer-requires-work-item', (ctx) => {
    if (ctx.timerState === 'running') {
      return ctx.activeQuery !== null;
    }
    return true;
  }),
];

// Auto-validate in tests
validateInvariants(context, invariants);
```

**Value**: Catch logic errors early, ensure state consistency.

---

### 6. Regression Detection Automation (Low Priority)

**Goal**: Automatically detect regressions by comparing snapshots across versions.

**Tasks**:
- [ ] Create snapshot baseline system
- [ ] Compare snapshots between versions
- [ ] Generate regression reports
- [ ] Integrate with CI/CD
- [ ] Create visual diff viewer

**Value**: Automatic regression detection in CI/CD pipeline.

---

### 7. Visual Test Reports (Low Priority)

**Goal**: Generate HTML test reports with interactive history visualization.

**Tasks**:
- [ ] Create HTML report generator
- [ ] Embed history timeline in reports
- [ ] Show state diffs visually
- [ ] Include performance metrics
- [ ] Export as standalone HTML

**Value**: Beautiful, shareable test reports with full history context.

---

## Quick Wins (Do First)

### 1. Add Example Test Scenarios
Create 2-3 real test examples to demonstrate the infrastructure:
- Connection authentication flow
- Work item creation workflow
- Error recovery scenario

**Time**: 1-2 hours
**Impact**: High - Shows value immediately

### 2. Vitest Custom Matchers
Add custom matchers for better test readability:
```typescript
expect(history).toHaveStateTransition('inactive', 'active');
expect(history).toHaveHistoryLength(5);
expect(context).toMatchSnapshot();
```

**Time**: 1 hour
**Impact**: Medium - Improves developer experience

### 3. Export History on Test Failure
Automatically export history when tests fail:
```typescript
// In vitest plugin
afterEach(() => {
  if (test.result?.status === 'failed') {
    const history = exportHistory();
    writeFile(`test-artifacts/${test.name}-history.json`, history);
  }
});
```

**Time**: 30 minutes
**Impact**: High - Makes debugging failed tests much easier

---

## Implementation Roadmap

### Week 1: Quick Wins
- ✅ Example test scenarios (2-3 examples)
- ✅ Vitest custom matchers
- ✅ Export history on test failure

### Week 2: Vitest Plugin
- ✅ Vitest plugin implementation
- ✅ Auto-reset history
- ✅ Test artifact generation

### Week 3: Advanced Features
- ✅ Automated test generation
- ✅ Performance profiling dashboard
- ✅ State invariant validation

### Week 4: Polish & Documentation
- ✅ Visual test reports
- ✅ Comprehensive documentation
- ✅ Example gallery

---

## Immediate Next Steps

1. **Create Example Tests** (Start here!)
   - Write 2-3 real test scenarios
   - Document patterns and best practices
   - Add to test suite

2. **Vitest Plugin** (High value)
   - Auto-reset history
   - Export on failure
   - Custom matchers

3. **Performance Profiling** (Nice to have)
   - Track transition times
   - Identify bottlenecks
   - Create dashboard

---

## Questions to Consider

1. **Which workflows are most critical to test?**
   - Connection setup?
   - Work item operations?
   - Timer functionality?
   - Error recovery?

2. **What test patterns do we want to establish?**
   - Record-and-replay?
   - Snapshot testing?
   - Event sequence validation?

3. **How should we integrate with CI/CD?**
   - Run history tests in CI?
   - Export artifacts on failure?
   - Performance regression detection?

---

## Success Metrics

- ✅ 5+ example test scenarios created
- ✅ Vitest plugin integrated
- ✅ Tests run automatically in CI
- ✅ History exported on test failures
- ✅ Performance profiling dashboard working
- ✅ Documentation complete

---

## Resources

- [Testing & Debugging Plan](./PRAXIS_HISTORY_ENGINE_TESTING_DEBUGGING_PLAN.md)
- [Implementation Guide](./PRAXIS_HISTORY_TESTING_DEBUGGING_IMPLEMENTATION.md)
- [Praxis v1.2.0 Features](./PRAXIS_V1.2.0_FEATURES.md)

---

**Recommendation**: Start with **Quick Wins** (#1-3) to demonstrate immediate value, then move to **Vitest Plugin** for seamless integration.

