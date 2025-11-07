# Implementation Branch Plan

**Created**: 2025-01-27  
**Purpose**: Track feature branches for prioritized implementation of FSM type-safe features and architectural improvements

---

## Branch Priority & Dependencies

### Priority 1: FSM Type-Safe Foundation (Architectural)

These branches establish the foundation for type-safe state machines and should be implemented first.

#### 1. `feature/fsm-type-safe-state-constants` ⭐ **START HERE**

**Status**: Ready for implementation  
**Priority**: **CRITICAL** - Foundation for all type-safe work  
**Dependencies**: None  
**Blocks**: All other FSM type-safe features

**Objectives**:
- Migrate all state machines to use state name constants
- Replace string literals with typed constants
- Provide IntelliSense for state transitions
- Prevent typos in state names

**Implementation Tasks**:
- [ ] Review existing `applicationMachine.states.ts` structure
- [ ] Create state constants for all machines:
  - [ ] `applicationMachine.states.ts` (may already exist)
  - [ ] `connectionMachine.states.ts`
  - [ ] `timerMachine.states.ts`
  - [ ] Any other FSM machines
- [ ] Migrate machine definitions to use constants
- [ ] Update all transition targets to use constants
- [ ] Add TypeScript types for state names
- [ ] Update tests to use constants
- [ ] Verify IntelliSense works correctly

**Related Documentation**:
- `docs/ARCHITECTURE_TYPE_SAFE_FSM_IMMEDIATE_STEPS.md`
- `docs/ARCHITECTURE_TYPE_SAFE_FSM_SUMMARY.md`
- `docs/ARCHITECTURE_TYPE_SAFE_FSM_PROPOSAL.md`

**Success Criteria**:
- All state machines use constants instead of string literals
- TypeScript provides IntelliSense for valid state targets
- No string literals in transition targets
- All tests pass

---

#### 2. `feature/fsm-type-safe-schema`

**Status**: Ready for implementation  
**Priority**: **HIGH** - Builds on state constants  
**Dependencies**: `feature/fsm-type-safe-state-constants`  
**Blocks**: `feature/fsm-type-safe-eslint`

**Objectives**:
- Define machines using schema-first approach
- Generate types from schemas
- Enable visual validation tools
- Create machine structure validation

**Implementation Tasks**:
- [ ] Design schema format for state machines
- [ ] Create schema-to-machine converter
- [ ] Generate TypeScript types from schemas
- [ ] Migrate one machine as proof of concept
- [ ] Create code generation scripts
- [ ] Document schema format

**Related Documentation**:
- `docs/ARCHITECTURE_TYPE_SAFE_FSM_PROPOSAL.md` (Layer 3)

**Success Criteria**:
- At least one machine defined using schema
- Types generated from schema
- Schema validation works
- Documentation complete

---

#### 3. `feature/fsm-type-safe-eslint`

**Status**: Ready for implementation  
**Priority**: **HIGH** - Enforces type-safe patterns  
**Dependencies**: `feature/fsm-type-safe-state-constants`, `feature/fsm-type-safe-schema`  
**Blocks**: None

**Objectives**:
- Create ESLint rule to enforce state constant usage
- Validate state transitions at lint time
- Prevent invalid state references
- Integrate with existing ESLint configuration

**Implementation Tasks**:
- [ ] Design ESLint rule for state transitions
- [ ] Implement AST analysis for state validation
- [ ] Create rule configuration
- [ ] Add to ESLint config
- [ ] Test rule with existing code
- [ ] Document rule usage

**Related Documentation**:
- `docs/ARCHITECTURE_TYPE_SAFE_FSM_IMMEDIATE_STEPS.md` (Step 3)

**Success Criteria**:
- ESLint rule catches invalid state transitions
- Rule integrated into pre-commit checks
- All existing code passes rule
- Documentation complete

---

### Priority 2: Reactive Architecture Migration (Architectural)

#### 4. `feature/reactive-architecture-migration`

**Status**: Ready for implementation  
**Priority**: **HIGH** - Improves architecture consistency  
**Dependencies**: None (can work in parallel with FSM type-safe work)  
**Blocks**: None

**Objectives**:
- Remove partial state messages (`syncTimerState`, `workItemsError`, etc.)
- Ensure all UI-visible state in FSM context
- Update provider to update FSM context instead of sending messages
- Single `syncState` message for all state updates

**Implementation Tasks**:
- [ ] Verify all state in FSM context:
  - [x] `workItemsError` - Already in context
  - [x] `timerState` - Already in context
  - [x] `pendingWorkItems` - Already in context
- [ ] Update provider to update FSM context (not direct messages)
- [ ] Remove partial message handlers from `src/webview/main.ts`:
  - [ ] `syncTimerState` handler
  - [ ] `workItemsError` handler
  - [ ] `workItemsLoaded` handler
  - [ ] `work-items-update` handler
- [ ] Remove partial message sending from `src/activation.ts`
- [ ] Update `src/provider.ts` to notify FSM instead of sending messages
- [ ] Ensure timer state updates FSM context
- [ ] Verify only `syncState` messages sent to webview

**Related Documentation**:
- `docs/REACTIVE_MIGRATION_PLAN.md`
- `docs/REACTIVE_ARCHITECTURE_PHILOSOPHY.md`
- `docs/ValidationChecklist.md` (Reactive Architecture section)

**Success Criteria**:
- Only `syncState` messages sent to webview
- All UI-visible state in FSM context
- Provider updates FSM context (not direct messages)
- Timer state in FSM context (not separate messages)
- Webview only handles `syncState` messages
- All tests pass

---

### Priority 3: Error Handling Feature

#### 5. `feature/error-handling-user-feedback`

**Status**: Ready for implementation  
**Priority**: **MEDIUM** - User-facing feature  
**Dependencies**: None (can work in parallel)  
**Blocks**: None

**Objectives**:
- Display authentication errors in UI
- Show last refresh attempt status
- Provide one-click recovery actions
- Indicate connection health

**Implementation Tasks**:
- [ ] Create error detection and type classification
- [ ] Implement error banner component (`ErrorBanner.svelte`)
- [ ] Create connection status indicator (`ConnectionStatus.svelte`)
- [ ] Implement empty state with error context (`EmptyState.svelte`)
- [ ] Update `UIState` type with connection health fields
- [ ] Add error handling functions:
  - [ ] `detectErrorType()` - Classify errors
  - [ ] `updateUIStateForError()` - Update UI state
- [ ] Integrate with application machine
- [ ] Add recovery action handlers
- [ ] Update webview components to show error states
- [ ] Write tests (unit, integration, E2E)

**Related Documentation**:
- `docs/features/ErrorHandlingAndUserFeedback.md` (Complete feature design)

**Success Criteria**:
- Error banner displays for authentication failures
- Status bar shows connection health
- Recovery actions work correctly
- All tests pass
- Feature design acceptance criteria met

---

## Implementation Order

### Phase 1: Foundation (Week 1-2)

1. **Start**: `feature/fsm-type-safe-state-constants`
   - This is the foundation for all type-safe work
   - Should be completed first
   - Enables IntelliSense and prevents typos

### Phase 2: Type-Safe Enhancement (Week 3-4)

2. **Next**: `feature/fsm-type-safe-schema`
   - Builds on state constants
   - Enables schema-first development
   - Provides type generation

3. **Then**: `feature/fsm-type-safe-eslint`
   - Enforces type-safe patterns
   - Prevents regressions
   - Integrates with CI/CD

### Phase 3: Architecture Cleanup (Week 5-6)

4. **Parallel**: `feature/reactive-architecture-migration`
   - Can work in parallel with Phase 2
   - Improves architecture consistency
   - Removes anti-patterns

### Phase 4: User Features (Week 7+)

5. **Parallel**: `feature/error-handling-user-feedback`
   - User-facing feature
   - Can work in parallel with other work
   - Improves user experience

---

## Branch Naming Convention

All branches follow the pattern: `feature/<feature-name>`

- Use kebab-case
- Be descriptive
- Group related features with prefixes (e.g., `fsm-type-safe-*`)

---

## Merge Strategy

### Before Merging

1. **All tests pass** - Unit, integration, E2E
2. **Code review approved** - At least one reviewer
3. **Documentation updated** - README, architecture docs
4. **ValidationChecklist.md updated** - Mark completed items
5. **No conflicts** - Rebase on main if needed

### Merge Order

1. `feature/fsm-type-safe-state-constants` → main
2. `feature/fsm-type-safe-schema` → main
3. `feature/fsm-type-safe-eslint` → main
4. `feature/reactive-architecture-migration` → main (can merge anytime after Phase 1)
5. `feature/error-handling-user-feedback` → main (can merge anytime)

---

## Tracking Progress

### Validation Checklist Updates

After each branch is merged, update `docs/ValidationChecklist.md`:

- [ ] Mark FSM type-safe items as complete
- [ ] Mark reactive architecture items as complete
- [ ] Mark error handling items as complete

### Documentation Updates

- [ ] Update `docs/ARCHITECTURE_TYPE_SAFE_FSM_SUMMARY.md` with progress
- [ ] Update `docs/REACTIVE_MIGRATION_PLAN.md` with completed steps
- [ ] Update `docs/features/ErrorHandlingAndUserFeedback.md` with implementation status

---

## Notes

- **FSM Type-Safe Features** are architectural improvements that should be prioritized
- **Reactive Architecture Migration** can work in parallel but should be completed before new features
- **Error Handling** is a user-facing feature that can be developed independently
- All branches are created from `main` and should be kept up to date

---

## Quick Reference

| Branch | Priority | Status | Dependencies |
|--------|----------|--------|--------------|
| `feature/fsm-type-safe-state-constants` | CRITICAL | Ready | None |
| `feature/fsm-type-safe-schema` | HIGH | Ready | state-constants |
| `feature/fsm-type-safe-eslint` | HIGH | Ready | state-constants, schema |
| `feature/reactive-architecture-migration` | HIGH | Ready | None |
| `feature/error-handling-user-feedback` | MEDIUM | Ready | None |

---

## Using Background Agents

For efficient parallel implementation, consider using Cursor's background agent feature. See `docs/BACKGROUND_AGENT_IMPLEMENTATION_GUIDE.md` for:

- How to set up background agent tasks
- Task templates for each feature branch
- Parallel implementation strategy
- Best practices and troubleshooting

**Recommended**: Start with independent features in parallel:
1. `feature/fsm-type-safe-state-constants` (Agent 1)
2. `feature/error-handling-user-feedback` (Agent 2)
3. `feature/reactive-architecture-migration` (Agent 3)

Then proceed with dependent features sequentially.

---

**Last Updated**: 2025-01-27

