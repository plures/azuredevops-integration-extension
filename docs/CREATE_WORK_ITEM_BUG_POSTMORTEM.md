# Create Work Item Bug - Post-Mortem Analysis

## Issue Summary

The "Create Work Item" button (+ icon in sidebar) and command palette command (`Ctrl+P > Create Work Item`) were not functional. Clicking the button or executing the command had no effect.

## Root Cause

The `CREATE_WORK_ITEM` event was being dispatched but never handled. The event handling chain was incomplete:

1. ✅ **Webview** sends `EXECUTE_COMMAND` message with `azureDevOpsInt.createWorkItem`
2. ✅ **Activation handler** executes the command via `vscode.commands.executeCommand`
3. ✅ **Command handler** dispatches `CREATE_WORK_ITEM` event
4. ❌ **Event dispatcher** had no `case 'CREATE_WORK_ITEM'` in switch statement
5. ✅ **Implementation** existed (createWorkItem method in azureClient and provider)

## Why Tests Didn't Catch This

### 1. No Integration Tests for Command Flow

- **Gap**: No tests validate the complete path from UI button click through to handler execution
- **Impact**: Individual components work in isolation but integration fails
- **Example**: Button sends message ✓, Command is registered ✓, But nothing happens ✗

### 2. Test Infrastructure Issues

- **Problem**: ~35% of test suite fails due to vscode module import errors
- **Cause**: Many modules import `vscode` directly, which isn't available in test environment
- **Affected**:
  - `tests/fsm/connectionMachine.test.ts`
  - `tests/fsm/setupMachine.test.ts`
  - `tests/integration-tests/*.test.ts`
  - `src/features/commands/commands.test.ts`
  - Many others

### 3. Missing UI Component Tests

- **Gap**: No tests for webview components (WebviewHeader.svelte)
- **Missing Coverage**:
  - Button click handlers
  - Message emission from webview
  - Event handler responses to messages

### 4. No Manual Testing Protocol

- **Issue**: This bug would be immediately obvious in manual testing
- **Symptom**: Button click has zero visible effect - no dialog, no error, nothing
- **Recommendation**: Establish pre-release manual testing checklist

## Comparison: What Tests Exist

### Tests That Work ✅

- **Unit tests for pure functions**: timer logic, WIQL parsing, URL parsing
- **Azure Client tests with mocking**: API calls, error handling
- **Provider tests**: debounce, search, filtering
- **FSM state machine tests** (where vscode isn't imported)

### Tests That Fail ❌

- **Command handler tests**: Can't import registration.ts (vscode dependency)
- **Integration tests**: Can't run without VS Code environment
- **FSM tests with activation**: Can't import modules with vscode dependencies
- **Setup/connection tests**: Blocked by vscode module

## Technical Details

### Fix Implementation

Added missing event handler in `src/activation.ts`:

```typescript
case 'CREATE_WORK_ITEM':
  try {
    if (client && provider) {
      showCreateWorkItemDialog(client, provider);
    } else {
      vscode.window.showErrorMessage('Unable to create work item: missing client or provider');
    }
  } catch (error) {
    activationLogger.error('Error creating work item', { meta: error });
    vscode.window.showErrorMessage(
      `Failed to create work item: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  break;
```

Also implemented `showCreateWorkItemDialog` function:

- Fetches work item types from Azure DevOps API
- Prompts for type, title, description, assignee
- Creates work item and refreshes view
- Proper error handling throughout

### FSM Type Addition

Added to `ApplicationEvent` type in `src/fsm/machines/applicationMachine.ts`:

```typescript
| { type: 'CREATE_WORK_ITEM' }
```

## Recommendations

### Immediate (P0)

1. **Manual Testing Checklist**
   - Create pre-release manual test checklist
   - Test all UI buttons: Refresh, Create, Toggle Kanban, Setup, Debug
   - Test all command palette commands
   - Document in CONTRIBUTING.md

2. **Fix Test Infrastructure**
   - Implement proper vscode module stub for unit tests
   - Add vscode-stub package or similar solution
   - Get existing tests running again

### Short Term (P1)

3. **Add Integration Tests**
   - Use @vscode/test-electron for proper VS Code environment
   - Test command execution end-to-end
   - Test webview message → handler → execution flow

4. **UI Component Tests**
   - Add Playwright or similar for webview testing
   - Test button handlers emit correct messages
   - Validate webview state updates

### Long Term (P2)

5. **Refactor for Testability**
   - Separate pure business logic from vscode dependencies
   - Use dependency injection for vscode APIs
   - Consider adapter pattern for VS Code APIs

6. **Continuous Integration**
   - Run manual test checklist in CI (could be automated with Playwright)
   - Add smoke tests for critical user flows
   - Fail CI if integration tests don't pass

## Lessons Learned

1. **Integration points are fragile**: Event-driven architectures need integration tests
2. **Test infrastructure matters**: Broken tests provide false confidence
3. **Manual testing catches obvious issues**: Some bugs are immediately visible to users
4. **Type safety isn't enough**: TypeScript caught the event type issue but not the missing handler
5. **UI coverage gaps**: Frontend components need testing too

## Related Issues

This bug is similar to other potential event handling gaps. Audit needed for:

- All event types in ApplicationEvent
- All cases in dispatchApplicationEvent switch
- All webview message types
- All command registrations

## Files Modified

### Source

- `src/activation.ts`: Added CREATE_WORK_ITEM handler and showCreateWorkItemDialog
- `src/fsm/machines/applicationMachine.ts`: Added CREATE_WORK_ITEM event type

### Tests

- `tests/features/commands-create-work-item.test.ts`: New comprehensive test suite

## Verification

### Manual Testing Required

- [ ] Click + button in sidebar - verify dialog appears
- [ ] Complete dialog and create work item - verify it appears in list
- [ ] Cancel dialog - verify no item created
- [ ] Test with no connection - verify error message
- [ ] Test command palette: `Ctrl+P > Create Work Item`
- [ ] Test other buttons still work: Refresh, Toggle Kanban, Setup, Debug

### Automated Testing

- Tests created but require vscode stub infrastructure fixes
- Tests validate command registration and event dispatching
- Tests confirm other button commands are registered

## Timeline

- **Introduced**: Unknown (likely during FSM migration or event system refactor)
- **Discovered**: 2025-11-23 (user report)
- **Fixed**: 2025-11-23
- **Severity**: High (core feature completely broken)
- **Impact**: All users attempting to create work items

## Prevention

Future prevention checklist:

1. ✅ Add event type to FSM
2. ✅ Add handler in dispatchApplicationEvent
3. ✅ Add command registration (was already done)
4. ⚠️ Add integration test (created but needs infrastructure)
5. ❌ Manual testing before release (not done)

---

_This post-mortem serves as documentation for the bug fix and recommendations for improving testing infrastructure._
