# Background Agent Implementation Guide

**Created**: 2025-01-27  
**Purpose**: Guide for using Cursor's background agent feature to implement feature branches in parallel

---

## Overview

Using background agents is **highly appropriate** for these feature branches because:

1. **Independent Work**: Most features can be developed in parallel
2. **Clear Scope**: Each branch has well-defined objectives
3. **Documentation**: Comprehensive design docs exist for each feature
4. **Isolated Changes**: Each branch works on different parts of the codebase
5. **Efficiency**: Multiple features can be implemented simultaneously

---

## Which Features Are Suitable for Background Agents

### ✅ Excellent Candidates (Independent)

1. **`feature/fsm-type-safe-state-constants`** ⭐
   - **Why**: Well-defined scope, clear migration path
   - **Agent Task**: "Migrate all FSM machines to use state constants from `applicationMachine.states.ts` pattern"
   - **Can run in parallel**: Yes

2. **`feature/error-handling-user-feedback`**
   - **Why**: Complete feature design document exists
   - **Agent Task**: "Implement error handling feature per `docs/features/ErrorHandlingAndUserFeedback.md`"
   - **Can run in parallel**: Yes

3. **`feature/reactive-architecture-migration`**
   - **Why**: Clear migration plan in `docs/REACTIVE_MIGRATION_PLAN.md`
   - **Agent Task**: "Remove partial state messages and ensure provider updates FSM context"
   - **Can run in parallel**: Yes (but should complete before new features)

### ⚠️ Requires Sequential Work (Dependencies)

4. **`feature/fsm-type-safe-schema`**
   - **Why**: Depends on state constants being complete
   - **Agent Task**: "Implement schema-first approach after state-constants branch"
   - **Can run in parallel**: No - wait for state-constants

5. **`feature/fsm-type-safe-eslint`**
   - **Why**: Depends on both state-constants and schema
   - **Agent Task**: "Create ESLint rule after schema branch"
   - **Can run in parallel**: No - wait for dependencies

---

## How to Use Background Agents in Cursor

### Method 1: Using Cursor's Background Agent Feature

#### Step 1: Open Background Agent Panel

1. In Cursor, look for the **Background Agent** or **Agent** panel
2. Or use the command palette: `Ctrl+Shift+P` → "Cursor: Start Background Agent"
3. Or check the Cursor sidebar for an "Agents" or "Background Tasks" section

#### Step 2: Create Background Task

For each feature branch, create a background task with this format:

```markdown
## Task: Implement feature/fsm-type-safe-state-constants

**Branch**: feature/fsm-type-safe-state-constants
**Priority**: CRITICAL
**Estimated Time**: 2-3 hours

**Objective**: Migrate all FSM machines to use state name constants instead of string literals.

**Context**:

- Reference: `docs/ARCHITECTURE_TYPE_SAFE_FSM_IMMEDIATE_STEPS.md`
- Existing pattern: `src/fsm/machines/applicationMachine.states.ts`
- Target machines:
  - `applicationMachine.ts` (may already use constants)
  - `connectionMachine.ts`
  - `timerMachine.ts`
  - Any other FSM machines

**Tasks**:

1. Review `applicationMachine.states.ts` structure
2. Create state constants files for each machine:
   - `connectionMachine.states.ts`
   - `timerMachine.states.ts`
3. Migrate machine definitions to use constants
4. Update all transition targets to use constants
5. Add TypeScript types for state names
6. Update tests to use constants
7. Verify IntelliSense works correctly
8. Run tests and ensure all pass
9. Update `docs/ValidationChecklist.md` when complete

**Success Criteria**:

- All state machines use constants instead of string literals
- TypeScript provides IntelliSense for valid state targets
- No string literals in transition targets
- All tests pass

**Files to Modify**:

- `src/fsm/machines/connectionMachine.ts`
- `src/fsm/machines/timerMachine.ts`
- `src/fsm/machines/*.ts` (any other machines)
- `tests/**/*.ts` (update tests)
```

#### Step 3: Provide Context Files

Attach these files to the background agent task:

1. **Design Documents**:
   - `docs/ARCHITECTURE_TYPE_SAFE_FSM_IMMEDIATE_STEPS.md`
   - `docs/ARCHITECTURE_TYPE_SAFE_FSM_SUMMARY.md`
   - `docs/ARCHITECTURE_TYPE_SAFE_FSM_PROPOSAL.md`

2. **Reference Implementation**:
   - `src/fsm/machines/applicationMachine.states.ts`
   - `src/fsm/machines/applicationMachine.ts` (to see usage)

3. **Related Files**:
   - `docs/IMPLEMENTATION_BRANCH_PLAN.md`
   - `docs/ValidationChecklist.md`

#### Step 4: Monitor Progress

- Check the background agent panel for progress updates
- Review changes as they're made
- Test the implementation when complete

---

### Method 2: Using Cursor Chat with Explicit Branch Context

If background agents aren't available, use Cursor Chat with branch-specific context:

#### Step 1: Checkout Feature Branch

```bash
git checkout feature/fsm-type-safe-state-constants
```

#### Step 2: Create Implementation Prompt

In Cursor Chat, use this prompt:

```
@docs/ARCHITECTURE_TYPE_SAFE_FSM_IMMEDIATE_STEPS.md @docs/IMPLEMENTATION_BRANCH_PLAN.md

I'm working on the feature/fsm-type-safe-state-constants branch.

Please implement the state constants migration:

1. Review the existing pattern in `src/fsm/machines/applicationMachine.states.ts`
2. Create state constants for connectionMachine and timerMachine
3. Migrate all machines to use constants instead of string literals
4. Update tests
5. Ensure IntelliSense works

Follow the pattern from applicationMachine.states.ts and the guidance in the attached docs.
```

#### Step 3: Review and Test

- Review the changes
- Run tests: `npm test`
- Check IntelliSense in your IDE
- Commit when satisfied

---

## Background Agent Task Templates

### Template 1: FSM Type-Safe State Constants

```markdown
## Background Task: FSM Type-Safe State Constants

**Branch**: feature/fsm-type-safe-state-constants
**Priority**: CRITICAL
**Dependencies**: None

**Goal**: Migrate all FSM machines to use typed state constants

**Reference Files**:

- `src/fsm/machines/applicationMachine.states.ts` (pattern to follow)
- `docs/ARCHITECTURE_TYPE_SAFE_FSM_IMMEDIATE_STEPS.md` (guidance)

**Steps**:

1. Create `connectionMachine.states.ts` with all state constants
2. Create `timerMachine.states.ts` with all state constants
3. Update `connectionMachine.ts` to use constants
4. Update `timerMachine.ts` to use constants
5. Update all transition targets
6. Update tests
7. Verify IntelliSense

**Validation**:

- Run: `npm test`
- Check: No string literals in transition targets
- Verify: IntelliSense shows state options
```

### Template 2: Error Handling Feature

```markdown
## Background Task: Error Handling and User Feedback

**Branch**: feature/error-handling-user-feedback
**Priority**: MEDIUM
**Dependencies**: None

**Goal**: Implement error handling feature per design document

**Reference Files**:

- `docs/features/ErrorHandlingAndUserFeedback.md` (complete spec)
- `docs/REACTIVE_ARCHITECTURE_PHILOSOPHY.md` (architecture context)

**Steps**:

1. Create error detection functions
2. Create ErrorBanner.svelte component
3. Create ConnectionStatus.svelte component
4. Create EmptyState.svelte component
5. Update UIState type
6. Integrate with application machine
7. Write tests (unit, integration, E2E)

**Validation**:

- Run: `npm test`
- Test: Authentication failure shows error banner
- Test: Recovery actions work
```

### Template 3: Reactive Architecture Migration

```markdown
## Background Task: Reactive Architecture Migration

**Branch**: feature/reactive-architecture-migration
**Priority**: HIGH
**Dependencies**: None

**Goal**: Remove partial state messages, ensure single syncState

**Reference Files**:

- `docs/REACTIVE_MIGRATION_PLAN.md` (migration steps)
- `docs/REACTIVE_ARCHITECTURE_PHILOSOPHY.md` (principles)

**Steps**:

1. Remove partial message handlers from `src/webview/main.ts`
2. Remove partial message sending from `src/activation.ts`
3. Update `src/provider.ts` to update FSM context
4. Ensure timer updates FSM context
5. Verify only syncState messages sent

**Validation**:

- Run: `npm test`
- Check: Only syncState messages in webview
- Verify: All state in FSM context
```

---

## Best Practices for Background Agents

### 1. Provide Clear Context

- Attach all relevant documentation
- Include reference implementations
- Specify success criteria clearly

### 2. Break Down Large Tasks

- Split complex features into smaller sub-tasks
- Each sub-task should be completable independently
- Use checklists to track progress

### 3. Review Incrementally

- Don't wait until the end to review
- Check progress periodically
- Test as features are implemented

### 4. Maintain Branch Isolation

- Each agent task should work on one branch
- Don't mix features in a single task
- Commit frequently with clear messages

### 5. Coordinate Dependencies

- Start independent features first
- Wait for dependencies before starting dependent features
- Use the implementation plan to sequence work

---

## Parallel Implementation Strategy

### Phase 1: Independent Features (Run in Parallel)

Start these simultaneously:

1. **Agent 1**: `feature/fsm-type-safe-state-constants`
2. **Agent 2**: `feature/error-handling-user-feedback`
3. **Agent 3**: `feature/reactive-architecture-migration`

### Phase 2: Dependent Features (Sequential)

After Phase 1 completes:

4. **Agent 4**: `feature/fsm-type-safe-schema` (after state-constants)
5. **Agent 5**: `feature/fsm-type-safe-eslint` (after schema)

---

## Monitoring and Coordination

### Daily Check-in

1. Review agent progress
2. Test implementations
3. Resolve conflicts early
4. Update documentation

### Conflict Resolution

- If agents modify the same files, coordinate
- Merge independent branches first
- Rebase dependent branches on merged work

### Quality Gates

Before marking an agent task complete:

- [ ] All tests pass
- [ ] Code review completed
- [ ] Documentation updated
- [ ] ValidationChecklist.md updated
- [ ] Branch ready for PR

---

## Troubleshooting

### Agent Not Available?

If Cursor doesn't have background agents:

1. Use Cursor Chat with explicit branch context
2. Work on one branch at a time manually
3. Use the task templates as implementation guides

### Conflicts Between Agents?

1. Pause conflicting agents
2. Merge completed work first
3. Rebase remaining work
4. Resume agents

### Agent Stuck?

1. Review the task description
2. Provide more context
3. Break down into smaller tasks
4. Check for errors in implementation

---

## Example: Starting a Background Agent Task

### Step-by-Step

1. **Open Cursor**
2. **Navigate to Agent Panel** (or use command palette)
3. **Create New Task**:
   ```
   Task: Implement FSM Type-Safe State Constants
   Branch: feature/fsm-type-safe-state-constants
   ```
4. **Attach Files**:
   - `docs/ARCHITECTURE_TYPE_SAFE_FSM_IMMEDIATE_STEPS.md`
   - `src/fsm/machines/applicationMachine.states.ts`
   - `docs/IMPLEMENTATION_BRANCH_PLAN.md`
5. **Provide Task Description** (use Template 1 above)
6. **Start Agent**
7. **Monitor Progress**

---

## Success Metrics

After using background agents:

- ✅ Multiple features implemented in parallel
- ✅ Clear separation of concerns
- ✅ Faster overall development
- ✅ Consistent code quality
- ✅ All tests passing

---

**Last Updated**: 2025-01-27
