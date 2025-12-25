# FSM to Praxis Terminology Cleanup Summary

## Overview

This document summarizes the cleanup effort to remove all FSM (Finite State Machine/XState) references from documentation and replace them with Praxis terminology, since the codebase has fully migrated to the Praxis logic engine.

## Files Updated

### 1. `docs/ENTRA_AUTH_MIGRATION_PLAN.md` ✅

**Changes Made:**

- Replaced "FSM-based state management" with "Praxis-based state management"
- Updated file references from `src/fsm/` to `src/praxis/`
- Changed "FSM authentication functions" to "Praxis authentication engine"
- Updated "FSM Events and Types" section to "Praxis Application Events and Facts"
- Replaced FSM event examples with Praxis Facts and Events
- Updated all code examples to use Praxis patterns (Rules, Facts, Events)

**Key Terminology Changes:**

- `FSM context` → `Praxis context`
- `FSM events` → `Praxis Events/Facts`
- `FSM state machine` → `Praxis engine`
- `FSM rules` → `Praxis Rules`

### 2. `docs/DevelopmentRules.md` ✅

**Changes Made:**

- Updated "Separation of Concerns" section:
  - `FSM (Extension Host)` → `Praxis (Extension Host)`
  - `Svelte informs FSM` → `Svelte informs Praxis`
  - `FSM updates state` → `Praxis updates state`
- Updated "Reactive Paradigm" section:
  - `FSM context changes` → `Praxis context changes`
  - `FSM context` → `Praxis context`
- Updated "Implementation Rules" section:
  - `FSM Context Updates` → `Praxis Context Updates`
  - Updated examples to use Praxis Rules instead of FSM actions
- Updated data flow diagram:
  - `FSM processes` → `Praxis Rules process`

### 3. `docs/ValidationChecklist.md` ✅

**Changes Made:**

- Updated "Reactive Architecture Philosophy" section:
  - All FSM references replaced with Praxis
  - `FSM manages` → `Praxis manages`
  - `FSM context` → `Praxis context (Facts)`
  - `FSM timerActor` → `Praxis TimerManager`
- Updated "FSM Type-Safe Architecture" section → "Praxis Type-Safe Architecture":
  - Removed XState-specific validation rules
  - Added Praxis-specific validation (Facts, Events, Rules)
  - Updated to reflect Praxis Schema Format (PSF)
- Updated implementation status items:
  - `FSM processes` → `Praxis Rules process`
  - `FSM dispatch` → `Praxis dispatch`
  - `FSM authentication functions` → `Praxis authentication rules`
- Updated Entra ID Authentication Migration checklist:
  - `FSM authentication functions updated` → `Praxis authentication rules updated`

## Remaining Work

### Documentation Files Still Containing FSM References

The following documentation files still contain FSM references but are **legacy/historical documents** that document the migration process itself. These should be reviewed to determine if they should be:

1. **Archived** (moved to `docs/archive/` or `docs/history/`)
2. **Updated** (if still relevant for reference)
3. **Deleted** (if no longer needed)

**Legacy FSM Documentation Files:**

- `docs/FSM_IMPLEMENTATION_SUMMARY.md` - Historical migration doc
- `docs/FSM_IMPLEMENTATION_COMPLETE.md` - Historical migration doc
- `docs/FSM_FIRST_IMPLEMENTATION_COMPLETE.md` - Historical migration doc
- `docs/FSM_INTEGRATION_COMPLETE.md` - Historical migration doc
- `docs/COMPLETE_FSM_INTEGRATION_PLAN.md` - Historical migration doc
- `docs/COMPLETE_FSM_ARCHITECTURE_SUMMARY.md` - Historical migration doc
- `docs/FSM_MIGRATION_GUIDE.md` - Historical migration doc
- `docs/FSM_BEST_PRACTICES_ANALYSIS.md` - Historical analysis doc
- `docs/FSM_VALIDATION_GAP_ANALYSIS.md` - Historical analysis doc
- `docs/FSM_ARCHITECTURE_DESIGN.md` - Historical design doc
- `docs/XSTATE_SVELTE_MIGRATION_GUIDE.md` - Historical migration doc
- `docs/XSTATE_SVELTE_PROVEN_PATTERNS.md` - Historical patterns doc
- `docs/FSM_SVELTE5_INTEGRATION_COMPLETE.md` - Historical migration doc
- `docs/FSM_SVELTE5_IMPLEMENTATION_COMPLETE.md` - Historical migration doc
- `docs/FSM_LOGGING_SYSTEM.md` - Historical logging doc
- `docs/FSM_TRACING_SYSTEM.md` - Historical tracing doc
- `docs/FSM_VISUALIZATION_GUIDE.md` - Historical visualization doc
- `docs/FSM_INSTRUMENTATION_GUIDE.md` - Historical instrumentation doc
- `docs/FSM_MIGRATION_BACKLOG.md` - Historical backlog doc
- `docs/FSM_FIRST_DEVELOPMENT_RULES.md` - Historical rules doc
- `docs/APPLICATION_FSM_TESTING_GUIDE.md` - Historical testing doc
- `docs/CONNECTION_FSM_TESTING_GUIDE.md` - Historical testing doc
- `docs/ARCHITECTURE_TYPE_SAFE_FSM_SUMMARY.md` - Historical architecture doc
- `docs/ARCHITECTURE_TYPE_SAFE_FSM_PROPOSAL.md` - Historical proposal doc
- `docs/ARCHITECTURE_TYPE_SAFE_FSM_IMMEDIATE_STEPS.md` - Historical steps doc

**Recommendation:** These files should be moved to `docs/archive/fsm-migration/` or `docs/history/` to preserve historical context while making it clear they are no longer current.

### Code Files

**Note:** The `src/fsm/` directory still exists but contains:

- Legacy wrappers that are being phased out
- Logging utilities that may still be used
- Bridge/adaptation code

These should be reviewed separately to determine if they can be removed or if they're still needed for backward compatibility.

## Key Terminology Mapping

| Old (FSM/XState)      | New (Praxis)                       |
| --------------------- | ---------------------------------- |
| FSM / State Machine   | Praxis Engine                      |
| State                 | Fact (in context)                  |
| Context               | Context (same)                     |
| Event                 | Event                              |
| Guard                 | Condition in Rule                  |
| Action                | Rule side effect                   |
| Transition            | Rule execution                     |
| Actor                 | Manager (PraxisTimerManager, etc.) |
| `actor.send()`        | `engine.step([Event])`             |
| `actor.getSnapshot()` | `engine.getContext()`              |
| `createMachine()`     | `createPraxisEngine()`             |
| State nodes           | Facts in context                   |

## Verification

To verify the cleanup is complete, run:

```bash
# Find remaining FSM references in active documentation
grep -r "FSM\|fsm\|Finite.*State\|finite.*state" docs/ --include="*.md" | grep -v "archive\|history\|PRAXIS"
```

## Next Steps

1. ✅ **Completed**: Updated active documentation (ENTRA_AUTH_MIGRATION_PLAN.md, DevelopmentRules.md, ValidationChecklist.md)
2. ⏳ **Pending**: Review and archive/hide legacy FSM documentation files
3. ⏳ **Pending**: Update any remaining code comments that reference FSM
4. ⏳ **Pending**: Update README.md if it contains FSM references
5. ⏳ **Pending**: Review `src/fsm/` directory for cleanup opportunities

## Impact

- **Active Documentation**: All current/active documentation now uses Praxis terminology
- **Migration Plan**: Updated to align with Praxis architecture
- **Development Rules**: Updated to reflect Praxis patterns
- **Validation Checklist**: Updated to track Praxis-specific items

## Notes

- The cleanup preserves historical context in legacy documentation files
- All active development documentation now correctly reflects the Praxis architecture
- The migration plan for Entra ID authentication now properly integrates with Praxis instead of FSM

---

**Last Updated**: 2024  
**Status**: Active documentation cleanup complete ✅
