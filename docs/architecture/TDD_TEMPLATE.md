# Test-Driven Development Template

## Feature Development Workflow

Every feature MUST follow this exact workflow. No exceptions.

---

## Step 1: Design Document

**File**: `docs/features/FEATURE_NAME.md`

### Template
```markdown
# Feature: [Feature Name]

## Problem Statement
[What problem does this solve?]

## User Stories
```gherkin
Feature: [Feature Name]
  As a [user type]
  I want to [action]
  So that [benefit]

Scenario: [Happy path]
  Given [initial state]
  When [action]
  Then [expected result]
  
Scenario: [Edge case]
  Given [edge condition]
  When [action]
  Then [expected handling]
```

## API Contract
```typescript
// Public API
export interface FeatureAPI {
  method(param: Type): ReturnType;
}

// Events
export type FeatureEvent = 
  | { type: 'ACTION_NAME'; payload: Data }
  
// State
export interface FeatureState {
  field: Type;
}
```

## State Machine (if applicable)
```
[idle] --ACTION--> [processing] --SUCCESS--> [complete]
                        |
                    FAILURE
                        |
                        v
                    [error]
```

## Success Criteria
- [ ] User can perform X in < 3 clicks
- [ ] Feature persists across restarts
- [ ] Error states have clear messages
```

**Approval Required**: Design must be reviewed before proceeding.

---

## Step 2: Write Tests (RED Phase)

**File**: `tests/features/FEATURE_NAME.test.ts`

### Template
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Feature: [Feature Name]', () => {
  // Setup
  beforeEach(() => {
    // Arrange: Create fresh state
  });

  afterEach(() => {
    // Cleanup
  });

  describe('Happy Path', () => {
    it('should do X when Y', () => {
      // Arrange
      const input = createTestInput();

      // Act
      const result = performAction(input);

      // Assert
      expect(result).toEqual(expectedOutput);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      expect(() => performAction(null)).toThrow('Input required');
    });

    it('should handle invalid state', () => {
      const result = performAction(invalidInput);
      expect(result.error).toBeDefined();
    });
  });

  describe('Integration', () => {
    it('should persist state across restarts', () => {
      // Test persistence
    });

    it('should integrate with FSM', () => {
      // Test FSM integration
    });
  });
});
```

**Requirement**: Tests must FAIL initially (RED phase).

---

## Step 3: Implement (GREEN Phase)

### Module Structure
```
src/features/FEATURE_NAME/
  index.ts          # Public API (exports)
  types.ts          # TypeScript interfaces
  machine.ts        # State machine (if needed)
  handlers.ts       # Event handlers
  utils.ts          # Pure functions
  integration.ts    # VSCode/webview integration
  FEATURE_NAME.test.ts  # Co-located tests
```

### Implementation Rules
1. **Start with pure functions** (easiest to test)
2. **Then add state machine** (if needed)
3. **Finally add integration** (VSCode commands, webview)
4. **Keep running tests** - stay in GREEN

### Code Standards
```typescript
// ✅ Pure function - no side effects
export function calculateValue(input: number): number {
  return input * 2;
}

// ✅ Dependency injection
export function createService(deps: Dependencies): Service {
  return {
    method: () => deps.logger.info('Called')
  };
}

// ❌ Global state access
function updateGlobal() {
  globalState.value = 123; // NEVER DO THIS
}

// ❌ Side effects in logic
function calculate(x: number): number {
  console.log('Calculating'); // Side effect!
  return x * 2;
}
```

---

## Step 4: Refactor (REFACTOR Phase)

While tests stay GREEN:
1. Extract repeated code
2. Improve naming
3. Add documentation
4. Optimize performance

---

## Step 5: Integration

### Checklist
- [ ] Feature has integration test
- [ ] Feature has unit tests for pure functions
- [ ] All tests pass
- [ ] No linter errors
- [ ] File sizes under limits
- [ ] Documentation updated
- [ ] Validation checklist updated

---

## Example: Timer Feature TDD

### 1. Design
```markdown
# Feature: Work Item Timer

## User Story
```gherkin
Scenario: Start timer
  Given I have a work item
  When I click the timer button
  Then the timer starts
  And the button changes to "Stop"
  And elapsed time displays
```

### 2. Test (RED)
```typescript
describe('Timer Feature', () => {
  it('starts timer and shows elapsed time', () => {
    const timer = createTimer();
    timer.start(123, 'Test Item');
    
    expect(timer.getState()).toBe('running');
    expect(timer.getElapsed()).toBeGreaterThan(0);
  });
});
```

### 3. Implement (GREEN)
```typescript
export function createTimer(persistence: Persistence) {
  let state: TimerState = { status: 'idle' };

  return {
    start(workItemId: number, title: string) {
      state = {
        status: 'running',
        workItemId,
        title,
        startTime: Date.now(),
      };
      persistence.save(state);
    },
    
    getState: () => state.status,
    getElapsed: () => state.startTime 
      ? Math.floor((Date.now() - state.startTime) / 1000)
      : 0,
  };
}
```

### 4. Refactor
- Extract `calculateElapsed` to utils
- Add proper types
- Document public API

---

## Enforcement

### Pre-Commit Hook
```bash
npm run test:feature || exit 1
npm run validate:machines || exit 1
```

### CI/CD
```yaml
- name: Validate Architecture
  run: |
    npm run validate:machines
    npm run test:coverage
    npm run lint:file-size
```

---

## When Something Breaks

### Debug Process
1. **Run feature tests** - which test fails?
2. **Check git diff** - what changed?
3. **Isolate the module** - test in isolation
4. **Fix and verify** - tests pass again
5. **Add regression test** - prevent future breaks

### Red Flags
- "It worked before" - missing test coverage
- "I changed one file and X broke" - tight coupling
- "I can't reproduce" - non-deterministic state

---

## Bottom Line

**No feature development without:**
1. Design doc
2. Tests written first
3. Tests passing
4. File size limits
5. Validation passing

**This is non-negotiable.**

