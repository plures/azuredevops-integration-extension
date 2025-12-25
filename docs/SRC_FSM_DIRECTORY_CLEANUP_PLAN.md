# src/fsm/ Directory Cleanup Plan

## Current State

The `src/fsm/` directory still exists despite the migration to Praxis being marked as "COMPLETE" in `PRAXIS_REDESIGN_PLAN.md`. The directory contains a mix of:

1. **Legacy wrappers** that wrap Praxis managers (should be removed)
2. **Logging utilities** (should be renamed/moved)
3. **Helper functions** (still needed, should be moved to appropriate locations)
4. **Type definitions** (still needed, should be moved)
5. **Services and bridges** (still needed, should be moved)

## Analysis

### Files Still Being Used

#### Legacy Wrappers (Should Be Removed)

- `src/fsm/ConnectionFSMManager.ts` - Wraps `PraxisConnectionManager`, still imported in `activation.ts`
- `src/fsm/FSMManager.ts` - Wraps `PraxisTimerManager`, may still be used

#### Logging Utilities (Should Be Renamed/Moved)

- `src/fsm/logging/FSMLogger.ts` - Still actively used, but name suggests FSM
- `src/fsm/logging/FSMTracer.ts` - Still actively used, but name suggests FSM
- `src/fsm/logging/LiveCanvasBridge.ts` - Still used

**Recommendation**: Move to `src/logging/` and rename:

- `FSMLogger.ts` → `ComponentLogger.ts` or `ApplicationLogger.ts`
- `FSMTracer.ts` → `TraceLogger.ts` or `ApplicationTracer.ts`
- `LiveCanvasBridge.ts` → `LiveCanvasBridge.ts` (name is fine)

#### Helper Functions (Should Be Moved)

- `src/fsm/functions/` - Various utility functions still being used
  - `auth/` - Authentication helpers
  - `connection/` - Connection management helpers
  - `setup/` - Setup wizard helpers
  - `ui/` - UI helpers
  - etc.

**Recommendation**: Move to `src/services/` or `src/utils/` based on purpose:

- `src/fsm/functions/auth/` → `src/services/auth/`
- `src/fsm/functions/connection/` → `src/services/connection/`
- `src/fsm/functions/setup/` → `src/services/setup/`
- `src/fsm/functions/ui/` → `src/services/ui/`

#### Type Definitions (Should Be Moved)

- `src/fsm/machines/applicationTypes.ts` - Application types
- `src/fsm/machines/connectionTypes.ts` - Connection types
- `src/fsm/types.ts` - General types

**Recommendation**: Move to `src/types/`:

- `src/fsm/machines/applicationTypes.ts` → `src/types/application.ts`
- `src/fsm/machines/connectionTypes.ts` → `src/types/connection.ts`
- `src/fsm/types.ts` → `src/types/common.ts` (or merge into appropriate files)

#### Services (Should Be Moved)

- `src/fsm/services/extensionHostBridge.ts` - Webview bridge
- `src/fsm/services/fsmSetupService.ts` - Setup service
- `src/fsm/services/PubSubBroker.ts` - Pub/sub broker

**Recommendation**: Move to `src/services/`:

- `src/fsm/services/extensionHostBridge.ts` → `src/services/extensionHostBridge.ts`
- `src/fsm/services/fsmSetupService.ts` → `src/services/setupService.ts`
- `src/fsm/services/PubSubBroker.ts` → `src/services/pubSubBroker.ts`

#### Commands (Should Be Moved)

- `src/fsm/commands/` - Debug and trace commands

**Recommendation**: Move to `src/features/commands/` or `src/commands/`:

- `src/fsm/commands/` → `src/commands/debug/`

#### Config (Should Be Moved)

- `src/fsm/config.ts` - Configuration

**Recommendation**: Move to `src/config/`:

- `src/fsm/config.ts` → `src/config/application.ts`

#### Adapters (Should Be Removed)

- `src/fsm/adapters/TimerAdapter.ts` - Legacy adapter, should be removed if not used

#### Router (Should Be Moved)

- `src/fsm/router/` - Event routing

**Recommendation**: Move to `src/services/router/`:

- `src/fsm/router/` → `src/services/router/`

#### Tools (Should Be Moved)

- `src/fsm/tools/` - Development tools

**Recommendation**: Move to `src/tools/`:

- `src/fsm/tools/` → `src/tools/`

## Migration Plan

### Phase 1: Remove Legacy Wrappers

1. **Update `activation.ts`** to use `PraxisConnectionManager` directly instead of `ConnectionFSMManager`
2. **Remove `ConnectionFSMManager.ts`**
3. **Check if `FSMManager.ts` is still used**, remove if not
4. **Remove `adapters/TimerAdapter.ts`** if not used

### Phase 2: Rename/Move Logging

1. **Create `src/logging/` directory**
2. **Move and rename logging files**:
   - `FSMLogger.ts` → `ComponentLogger.ts`
   - `FSMTracer.ts` → `TraceLogger.ts`
   - `LiveCanvasBridge.ts` → (keep name)
3. **Update all imports** across codebase
4. **Rename `FSMComponent` enum** → `LogComponent` or `Component`

### Phase 3: Move Helper Functions

1. **Create appropriate directories** (`src/services/`, `src/utils/`)
2. **Move functions** to appropriate locations
3. **Update all imports**

### Phase 4: Move Types

1. **Create `src/types/` directory** (if not exists)
2. **Move type definition files**
3. **Update all imports**

### Phase 5: Move Services

1. **Move service files** to `src/services/`
2. **Rename `fsmSetupService.ts`** → `setupService.ts`
3. **Update all imports**

### Phase 6: Move Commands, Config, Router, Tools

1. **Move remaining directories** to appropriate locations
2. **Update all imports**

### Phase 7: Remove Empty Directory

1. **Delete `src/fsm/` directory** once empty
2. **Verify no remaining imports**

## Import Update Strategy

Use find-and-replace with careful verification:

1. **Update imports in batches** by category (logging, services, types, etc.)
2. **Run tests after each batch** to catch breaking changes
3. **Update ESLint config** to remove `src/fsm/` exceptions
4. **Update any build scripts** that reference `src/fsm/`

## Verification

After cleanup, verify:

- [ ] No imports from `src/fsm/` remain
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Extension activates correctly
- [ ] No runtime errors

## Timeline Estimate

- **Phase 1**: 1-2 hours (remove wrappers)
- **Phase 2**: 2-3 hours (logging rename/move)
- **Phase 3**: 3-4 hours (helper functions)
- **Phase 4**: 1-2 hours (types)
- **Phase 5**: 1-2 hours (services)
- **Phase 6**: 1-2 hours (commands, config, router, tools)
- **Phase 7**: 30 minutes (final cleanup)

**Total**: ~10-15 hours

## Risks

1. **Breaking changes** if imports aren't updated correctly
2. **Circular dependencies** when moving files
3. **Test failures** if test files aren't updated
4. **Runtime errors** if dynamic imports aren't updated

## Mitigation

1. **Incremental migration** - one phase at a time
2. **Comprehensive testing** after each phase
3. **Search and replace** with verification
4. **Keep git history** for easy rollback

---

**Status**: Planning  
**Priority**: High (directory name is misleading)  
**Dependencies**: None
