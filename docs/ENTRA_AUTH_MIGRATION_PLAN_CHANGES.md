# Entra ID Authentication Migration Plan - Key Changes

## Summary

The Entra ID authentication migration plan has been updated to reflect the recent codebase reorganization where all FSM references were removed and the codebase was restructured.

## Key Changes Made

### 1. Updated File Paths

**Old Paths → New Paths:**

- `src/fsm/functions/auth/authentication.ts` → `src/services/auth/authentication.ts`
- `src/fsm/functions/connection/connectionManagerHelpers.ts` → `src/services/connection/connectionManagerHelpers.ts`
- `src/fsm/logging/FSMLogger.ts` → `src/logging/ComponentLogger.ts`
- `src/fsm/machines/applicationTypes.ts` → `src/types/application.ts`
- `src/fsm/services/extensionHostBridge.ts` → `src/services/extensionHostBridge.ts`

### 2. Updated Architecture References

**Removed:**

- FSM-based state management references
- FSM context updates
- FSM authentication functions

**Added:**

- Praxis-based state management (Facts, Rules, Events)
- Praxis application engine (`src/praxis/application/`)
- ConnectionService and ConnectionDriver patterns
- ComponentLogger for logging

### 3. Updated Integration Points

**ConnectionService Integration:**

- `src/praxis/connection/service.ts` - Singleton service managing connection managers
- Uses `ConnectionDriver` for lifecycle management
- Integrates with Praxis connection managers

**ConnectionDriver Integration:**

- `src/praxis/connection/driver.ts` - Polls and drives connection lifecycle
- Handles state transitions for authentication
- Updates status bar via callbacks

**Praxis Event Integration:**

- Events dispatched via `dispatchApplicationEvent` in `src/activation.ts`
- Events update Praxis application context
- UI reacts automatically to context changes

### 4. Updated Code Examples

All code examples now use:

- `ComponentLogger` instead of `FSMLogger`
- `Component` enum instead of `FSMComponent`
- `src/services/auth/` paths instead of `src/fsm/functions/auth/`
- `ConnectionService.getInstance()` instead of `getConnectionFSMManager()`
- Praxis event dispatching instead of FSM event sending

### 5. Updated Action Items

All action items now reference:

- Correct file paths (`src/services/`, `src/logging/`, `src/types/`)
- Praxis terminology (Facts, Rules, Events, Context)
- ComponentLogger for logging
- ConnectionService and ConnectionDriver for connection management

## Implementation Impact

### No Breaking Changes

The migration plan maintains backward compatibility:

- Device code flow remains as fallback
- Feature flags control rollout
- Existing authentication flows continue to work

### New Integration Points

The plan now correctly identifies:

- Where to add PKCE utilities (`src/services/auth/pkceUtils.ts`)
- Where to add authorization code provider (`src/services/auth/authorizationCodeProvider.ts`)
- How to integrate with ConnectionService and ConnectionDriver
- How to dispatch Praxis events for state updates

## Next Steps

1. Review the updated plan in `docs/ENTRA_AUTH_MIGRATION_PLAN.md`
2. Verify all file paths are correct
3. Begin Phase 1 implementation with updated paths
4. Use ComponentLogger for all logging
5. Integrate with ConnectionService and ConnectionDriver

## Verification Checklist

- [x] All FSM references removed from migration plan
- [x] All file paths updated to new structure
- [x] Integration points updated to use ConnectionService
- [x] Code examples use ComponentLogger
- [x] Praxis terminology used throughout
- [x] Action items reference correct files

---

**Updated**: After src/fsm/ directory cleanup  
**Status**: Ready for Implementation
