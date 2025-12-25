# FSM Migration Archive

This directory contains historical documentation from the migration from XState Finite State Machines (FSM) to the Praxis logic engine.

## Purpose

These documents are preserved for historical reference and to understand the evolution of the codebase architecture. They are **not current** and should not be used as reference for new development.

## Current Architecture

The codebase now uses **Praxis** for state management. For current documentation, see:

- `docs/PRAXIS_MIGRATION_PATTERNS.md` - Current Praxis patterns
- `docs/PRAXIS_REBOOT_DESIGN.md` - Praxis architecture design
- `docs/PRAXIS_REDESIGN_PLAN.md` - Praxis redesign plan
- `docs/DevelopmentRules.md` - Current development rules (Praxis-based)
- `docs/ValidationChecklist.md` - Current validation checklist (Praxis-based)

## Archived Files

### Implementation Documents

- `FSM_IMPLEMENTATION_SUMMARY.md` - Initial FSM implementation summary
- `FSM_IMPLEMENTATION_COMPLETE.md` - FSM implementation completion
- `FSM_FIRST_IMPLEMENTATION_COMPLETE.md` - First FSM implementation
- `FSM_IMPLEMENTATION_PLAN.md` - FSM implementation plan
- `COMPLETE_FSM_INTEGRATION_PLAN.md` - Complete FSM integration plan
- `COMPLETE_FSM_ARCHITECTURE_SUMMARY.md` - Complete FSM architecture summary

### Architecture Documents

- `FSM_ARCHITECTURE_DESIGN.md` - FSM architecture design
- `ARCHITECTURE_TYPE_SAFE_FSM_SUMMARY.md` - Type-safe FSM summary
- `ARCHITECTURE_TYPE_SAFE_FSM_PROPOSAL.md` - Type-safe FSM proposal
- `ARCHITECTURE_TYPE_SAFE_FSM_IMMEDIATE_STEPS.md` - Type-safe FSM steps

### Migration Documents

- `FSM_MIGRATION_GUIDE.md` - FSM migration guide
- `FSM_MIGRATION_BACKLOG.md` - FSM migration backlog
- `XSTATE_SVELTE_MIGRATION_GUIDE.md` - XState/Svelte migration guide
- `XSTATE_SVELTE_PROVEN_PATTERNS.md` - XState/Svelte patterns

### Testing Documents

- `APPLICATION_FSM_TESTING_GUIDE.md` - Application FSM testing guide
- `CONNECTION_FSM_TESTING_GUIDE.md` - Connection FSM testing guide

### Development Rules

- `FSM_FIRST_DEVELOPMENT_RULES.md` - FSM-first development rules

### Integration Documents

- `FSM_INTEGRATION_COMPLETE.md` - FSM integration completion
- `FSM_SVELTE5_INTEGRATION_COMPLETE.md` - FSM/Svelte5 integration
- `FSM_SVELTE5_IMPLEMENTATION_COMPLETE.md` - FSM/Svelte5 implementation

### Analysis Documents

- `FSM_BEST_PRACTICES_ANALYSIS.md` - FSM best practices analysis
- `FSM_VALIDATION_GAP_ANALYSIS.md` - FSM validation gap analysis

### Tooling Documents

- `FSM_LOGGING_SYSTEM.md` - FSM logging system
- `FSM_TRACING_SYSTEM.md` - FSM tracing system
- `FSM_VISUALIZATION_GUIDE.md` - FSM visualization guide
- `FSM_INSTRUMENTATION_GUIDE.md` - FSM instrumentation guide
- `fsm-visualization-demo.html` - FSM visualization demo (if present)

## Migration Timeline

1. **Initial FSM Implementation** (Historical)
   - XState v5 was introduced for state management
   - Timer, Auth, and Connection state machines were created
   - FSM-first architecture was established

2. **Praxis Migration** (Current)
   - Praxis logic engine replaced XState
   - Facts, Rules, and Flows replaced state machines
   - All active code now uses Praxis

3. **Documentation Cleanup** (2024)
   - FSM references removed from active documentation
   - Legacy FSM docs archived to this directory
   - Current docs updated to use Praxis terminology

## Notes

- These files document the **historical** FSM/XState implementation
- They are kept for reference but **should not be used** for new development
- All current development should follow Praxis patterns documented in the main `docs/` directory
- If you need to understand the migration, see `docs/FSM_TO_PRAXIS_CLEANUP_SUMMARY.md` in the main docs folder

---

**Archive Date**: 2024  
**Reason**: Codebase migrated from FSM/XState to Praxis logic engine
