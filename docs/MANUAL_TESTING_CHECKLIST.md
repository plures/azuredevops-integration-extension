# Manual Testing Checklist for Azure DevOps Extension Buttons

This checklist should be completed before each release to ensure all UI buttons and commands work correctly.

## Setup

- [ ] VS Code is running with the extension installed
- [ ] At least one Azure DevOps connection is configured
- [ ] Connection is authenticated and working
- [ ] Some work items are visible in the sidebar

## Test 1: Create Work Item Button

### Location

Webview header, + icon

### Steps

1. [ ] Click the + button in the webview header
2. [ ] Verify: Dialog appears with "Create Work Item" title
3. [ ] Verify: Work item type list includes Task, Bug, User Story, Feature, Epic (or organization-specific types)
4. [ ] Select "Task"
5. [ ] Verify: Title input prompt appears
6. [ ] Enter title: "Test Work Item - Manual Test"
7. [ ] Verify: Description input prompt appears (optional)
8. [ ] Enter description: "Testing create work item functionality"
9. [ ] Verify: Assignee input prompt appears (optional)
10. [ ] Leave assignee empty (will assign to self)
11. [ ] Verify: Success message appears: "Successfully created Task #XXXX: Test Work Item - Manual Test"
12. [ ] Verify: New work item appears in the work items list
13. [ ] Verify: Work item has correct type (Task), title, and description

### Cancel Test

14. [ ] Click + button again
15. [ ] Press Escape or click away from dialog
16. [ ] Verify: No error message appears
17. [ ] Verify: No work item was created

### Error Test

18. [ ] Disconnect or invalidate connection
19. [ ] Click + button
20. [ ] Verify: Appropriate error message appears

## Test 2: Refresh Work Items Button

### Location

Webview header, ↻ icon

### Steps

1. [ ] Click the refresh button (↻)
2. [ ] Verify: Button shows spinning animation
3. [ ] Verify: Work items list refreshes
4. [ ] Verify: No errors in console or UI

## Test 3: Toggle Kanban View Button

### Location

Webview header, ⚏ icon

### Steps

1. [ ] Verify current view (list or kanban)
2. [ ] Click the toggle button (⚏)
3. [ ] Verify: View changes to opposite mode
4. [ ] If kanban: Verify columns appear (To Do, In Progress, Done, etc.)
5. [ ] If list: Verify table/list view appears
6. [ ] Click toggle button again
7. [ ] Verify: View returns to original mode
8. [ ] Verify: No errors or flickering

## Test 4: Setup/Manage Connections Button

### Location

Webview header, ⚙ icon

### Steps

1. [ ] Click the settings button (⚙)
2. [ ] Verify: Settings/connection management UI appears
3. [ ] Verify: Existing connections are shown
4. [ ] Verify: Can navigate through settings
5. [ ] Close settings
6. [ ] Verify: Returns to work items view

## Test 5: Toggle Debug View Button (Conditional)

### Location

Webview header, 🐛 icon (only appears if debug logging is enabled)

### Setup

1. [ ] Enable debug logging in VS Code settings
2. [ ] Verify debug button appears in header

### Steps

3. [ ] Click the debug button (🐛)
4. [ ] Verify: Debug panel appears/disappears
5. [ ] Verify: Debug information is shown when visible
6. [ ] Click again
7. [ ] Verify: Debug panel toggles correctly
8. [ ] Verify: No errors

## Test 6: Command Palette Commands

### Create Work Item

1. [ ] Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. [ ] Type "Create Work Item"
3. [ ] Select "Azure DevOps Int: Create Work Item"
4. [ ] Verify: Same dialog as button click appears
5. [ ] Complete creation or cancel
6. [ ] Verify: Works identically to button

### Refresh Work Items

7. [ ] Press `Ctrl+Shift+P` or `Cmd+Shift+P`
8. [ ] Type "Refresh Work Items"
9. [ ] Select "Azure DevOps Int: Refresh Work Items"
10. [ ] Verify: Work items refresh
11. [ ] Verify: Same behavior as button

### Toggle Kanban View

12. [ ] Press `Ctrl+Shift+P` or `Cmd+Shift+P`
13. [ ] Type "Toggle Kanban View"
14. [ ] Select "Azure DevOps Int: Toggle Kanban View"
15. [ ] Verify: View toggles
16. [ ] Verify: Same behavior as button

### Setup/Manage Connections

17. [ ] Press `Ctrl+Shift+P` or `Cmd+Shift+P`
18. [ ] Type "Setup or Manage Connections"
19. [ ] Select "Azure DevOps Int: Setup or Manage Connections"
20. [ ] Verify: Settings open
21. [ ] Verify: Same behavior as button

## Test 7: Keyboard Shortcuts

### Refresh (R key when view has focus)

1. [ ] Click in the work items view to give it focus
2. [ ] Press the `R` key
3. [ ] Verify: Work items refresh
4. [ ] Verify: Same behavior as button/command

### Toggle View (V key when view has focus)

5. [ ] Ensure work items view has focus
6. [ ] Press the `V` key
7. [ ] Verify: View toggles between list and kanban
8. [ ] Verify: Same behavior as button/command

### Focus Search (/ key when view has focus)

9. [ ] Ensure work items view has focus
10. [ ] Press the `/` key
11. [ ] Verify: Search box gets focus
12. [ ] Verify: Can start typing search term

## Test 8: Error Scenarios

### No Connection

1. [ ] Remove or disconnect all connections
2. [ ] Try each button
3. [ ] Verify: Appropriate error messages appear
4. [ ] Verify: No crashes or unhandled exceptions

### Network Issues

5. [ ] Simulate network disconnection (if possible)
6. [ ] Try refresh button
7. [ ] Try create work item
8. [ ] Verify: Timeout errors are handled gracefully
9. [ ] Verify: Helpful error messages shown

### Invalid Credentials

10. [ ] Use invalid or expired PAT
11. [ ] Try operations
12. [ ] Verify: Authentication errors shown
13. [ ] Verify: Guidance to re-authenticate provided

## Test 9: Performance

1. [ ] Open VS Code performance monitor
2. [ ] Click each button multiple times rapidly
3. [ ] Verify: No UI freezing
4. [ ] Verify: Buttons remain responsive
5. [ ] Verify: No memory leaks visible

## Test 10: Multiple Connections

If multiple connections are configured:

1. [ ] Switch between connections
2. [ ] Test create work item for each connection
3. [ ] Verify: Work items created in correct project
4. [ ] Test refresh for each connection
5. [ ] Verify: Correct work items shown for each

## Success Criteria

All checkboxes above should be checked (✓) for the test to pass.

Any failures should be:

- [ ] Documented with details
- [ ] Logged as issues
- [ ] Fixed before release

## Notes Section

Use this space to document any issues, observations, or notes during testing:

```
Date: _______________
Tester: _______________

Issues Found:
1.
2.
3.

Additional Observations:
-
-
-
```

## Related Documents

- Fix Summary: `docs/CREATE_WORK_ITEM_FIX_SUMMARY.md`
- Post-Mortem: `docs/CREATE_WORK_ITEM_BUG_POSTMORTEM.md`
- Architecture Instructions: `.github/copilot-instructions.md`

---

**Last Updated**: 2025-11-23
**Version**: 1.0
**Status**: Ready for Use
