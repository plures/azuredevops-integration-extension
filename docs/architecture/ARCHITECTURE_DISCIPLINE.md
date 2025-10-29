# Architecture Discipline & Quality Standards

## Purpose

This document establishes **non-negotiable** standards for developing features in this codebase. Every feature must follow this process. No exceptions.

---

## Development Process (Mandatory)

### Phase 1: Specification

1. **Write design doc** in `docs/features/FEATURE_NAME.md`
   - Problem statement
   - User stories (Gherkin format)
   - Success criteria
   - API contracts
   - State machine diagram (if applicable)

2. **Review & approval** - Design must be reviewed before coding

### Phase 2: Test-Driven Development

1. **Write integration test** in `tests/features/FEATURE_NAME.test.ts`
   - Test file created BEFORE implementation
   - Tests describe expected behavior from design doc
   - Tests must fail initially (red phase)

2. **Write unit tests** for pure functions
   - One test file per module
   - AAA pattern (Arrange, Act, Assert)
   - Test edge cases

### Phase 3: Implementation

1. **Write minimal code** to make tests pass
2. **Refactor** while keeping tests green
3. **Code review** before merge

### Phase 4: Validation

1. **All tests pass** (100% of feature tests)
2. **No linter errors**
3. **Manual testing** of happy path + edge cases
4. **Update validation checklist**

---

## File Size Limits (Enforced)

| File Type         | Max Lines | Rationale                         |
| ----------------- | --------- | --------------------------------- |
| TypeScript source | 500       | Easy to understand in one sitting |
| Test files        | 300       | Focused test suites               |
| Svelte components | 300       | Single responsibility             |
| FSM machines      | 400       | State complexity bounded          |

**Enforcement**: ESLint rule `max-lines` set to these limits.

**When file exceeds limit**:

1. Extract to separate module
2. Use composition over large files
3. Split by responsibility

---

## Module Design Principles

### Pure Functions First

```typescript
// ✅ GOOD: Pure, testable, no side effects
export function calculateElapsedSeconds(startTime: number, stopTime?: number): number {
  const now = stopTime || Date.now();
  return Math.floor((now - startTime) / 1000);
}

// ❌ BAD: Side effects, hard to test
function updateTimer() {
  const elapsed = Date.now() - timer.startTime;
  panel.webview.postMessage({ elapsed });
  globalState.update('timer', elapsed);
}
```

### Single Responsibility

```typescript
// ✅ GOOD: One thing
export function formatElapsedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ❌ BAD: Multiple responsibilities
function handleTimer(action: string, workItemId?: number) {
  if (action === 'start') {
    // fetch work item
    // update state
    // persist to storage
    // send to webview
    // update status bar
  }
}
```

### Dependency Injection

```typescript
// ✅ GOOD: Dependencies injected
export function createTimerService(persistence: PersistenceService, logger: Logger): TimerService {
  return {
    start: (workItemId, title) => {
      logger.info('Starting timer', { workItemId });
      persistence.save({ workItemId, startTime: Date.now() });
    },
  };
}

// ❌ BAD: Global dependencies
function startTimer(workItemId: number) {
  console.log('Starting'); // Global console
  vscode.globalState.update(); // Global state
}
```

---

## XState v5 Type Safety

### Enforce Correct Types

Create `src/fsm/xstate-helpers.ts`:

```typescript
import { assign, ActorRefFrom } from 'xstate';

/**
 * Type-safe action array creator
 * Ensures actions are always wrapped in arrays for XState v5
 */
export function actions<TContext, TEvent>(...actionList: Array<any>): Array<any> {
  return actionList;
}

/**
 * Type-safe entry/exit array creator
 */
export function entryActions<TContext, TEvent>(...actionList: Array<any>): Array<any> {
  return actionList;
}

// Usage example:
// entry: entryActions(
//   assign({ isActive: true }),
//   log('Entered state')
// )
```

### Machine Validation

Add `scripts/validate-machines.ts`:

```typescript
/**
 * Validates all state machines follow XState v5 conventions:
 * 1. entry is array or undefined
 * 2. exit is array or undefined
 * 3. actions is array or undefined
 * 4. All guards are functions
 */
export function validateMachineStructure(machine: any): ValidationResult {
  // Check all states recursively
  // Ensure entry/exit/actions are arrays
  // Report violations
}
```

Run in pre-commit hook.

---

## Svelte 5 Type Safety

### Runes Mode Enforcement

Add ESLint rule:

```json
{
  "rules": {
    "svelte/valid-prop-names-in-kit-pages": "error",
    "svelte/no-export-load-in-svelte-module-in-kit-pages": "error"
  }
}
```

### Component Contract

```typescript
// ✅ GOOD: Explicit props interface
interface Props {
  context: ApplicationContext;
  sendEvent: (event: ApplicationEvent) => void;
}
const { context, sendEvent }: Props = $props();

// All reactive values use $derived or $state
let filterText = $state('');
const filteredItems = $derived(workItems.filter(...));
```

---

## Testing Standards

### Integration Tests (Required for Features)

```typescript
// tests/features/timer.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createActor } from 'xstate';
import { timerMachine } from '../../src/fsm/machines/timerMachine';

describe('Timer Feature', () => {
  let timerActor: any;

  beforeEach(() => {
    timerActor = createActor(timerMachine).start();
  });

  it('starts timer and sets workItemId', () => {
    timerActor.send({
      type: 'START',
      workItemId: 123,
      workItemTitle: 'Test Item',
    });

    const snapshot = timerActor.getSnapshot();
    expect(snapshot.value).toBe('running');
    expect(snapshot.context.workItemId).toBe(123);
    expect(snapshot.context.startTime).toBeGreaterThan(0);
  });

  it('persists and restores timer state', () => {
    // Start timer
    timerActor.send({ type: 'START', workItemId: 123, workItemTitle: 'Test' });
    const snapshot1 = timerActor.getSnapshot();

    // Create new actor and restore
    const restored = createActor(timerMachine).start();
    restored.send({
      type: 'RESTORE',
      workItemId: snapshot1.context.workItemId,
      workItemTitle: snapshot1.context.workItemTitle,
      startTime: snapshot1.context.startTime,
      isPaused: false,
    });

    const snapshot2 = restored.getSnapshot();
    expect(snapshot2.context.workItemId).toBe(123);
    expect(snapshot2.context.startTime).toBe(snapshot1.context.startTime);
  });
});
```

### Unit Tests (Required for Pure Functions)

```typescript
// tests/utils/time-formatting.test.ts
import { describe, it, expect } from 'vitest';
import { formatElapsedTime } from '../../src/utils/time-formatting';

describe('formatElapsedTime', () => {
  it('formats seconds only', () => {
    expect(formatElapsedTime(45)).toBe('0:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatElapsedTime(125)).toBe('2:05');
  });

  it('formats hours, minutes, seconds', () => {
    expect(formatElapsedTime(3665)).toBe('1:01:05');
  });
});
```

---

## Pre-Commit Enforcement

### `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# 1. Type check
echo "📝 Type checking..."
npm run type-check || exit 1

# 2. Lint
echo "🔧 Linting..."
npm run lint || exit 1

# 3. Validate FSM machines
echo "🤖 Validating state machines..."
npm run validate:machines || exit 1

# 4. Run affected tests
echo "🧪 Running tests..."
npm run test:changed || exit 1

echo "✅ All checks passed!"
```

### `package.json` scripts

```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "validate:machines": "tsx scripts/validate-machines.ts",
    "test:changed": "vitest related --run",
    "test:feature": "vitest tests/features --run",
    "pre-commit": "lint-staged && npm run validate:machines && npm run test:feature"
  }
}
```

---

## File Structure Refactoring

### Current Problem

```
src/
  activation.ts (3000+ lines) ❌
  fsm/
    machines/
      applicationMachine.ts (1100+ lines) ❌
```

### Target Structure

```
src/
  activation/
    index.ts (100 lines) ✅
    command-handlers.ts (200 lines) ✅
    event-dispatcher.ts (150 lines) ✅
    context-serializer.ts (100 lines) ✅

  features/
    timer/
      timer-machine.ts (150 lines) ✅
      timer-persistence.ts (80 lines) ✅
      timer-ui-integration.ts (100 lines) ✅
      timer.test.ts (200 lines) ✅

    edit-dialog/
      edit-dialog-handler.ts (150 lines) ✅
      field-selectors.ts (100 lines) ✅
      edit-dialog.test.ts (150 lines) ✅

  utils/
    time-formatting.ts (50 lines) ✅
    time-formatting.test.ts (100 lines) ✅
```

---

## Immediate Action Plan

### Step 1: Create Foundation (Today)

1. ✅ Create this architecture doc
2. ⬜ Add ESLint `max-lines` rules
3. ⬜ Add XState validation script
4. ⬜ Create test template for features
5. ⬜ Update pre-commit hooks

### Step 2: Extract Timer Module (Tomorrow)

1. ⬜ Create `src/features/timer/` directory
2. ⬜ Extract timer logic from activation.ts
3. ⬜ Write integration tests
4. ⬜ Verify timer works in isolation
5. ⬜ Document timer module

### Step 3: Apply to All Features (This Week)

1. ⬜ Repeat for edit-dialog
2. ⬜ Repeat for branch-linking
3. ⬜ Repeat for connection management
4. ⬜ Establish pattern

### Step 4: Prevent Regression (Ongoing)

1. ⬜ Every feature gets integration test
2. ⬜ Every PR runs full test suite
3. ⬜ No merge without passing tests
4. ⬜ No file >500 lines

---

## Decision Point

**I strongly recommend** we pause feature development and spend 2-3 days building this foundation. Otherwise, we'll keep hitting the same issues.

**Your call**: Should I:

1. **Implement this foundation** (stop features, build discipline)
2. **Try to fix timer one more time** (risky, might break again)
3. **Revert to working state** (abandon FSM, start over with better plan)

What would you like me to do?
