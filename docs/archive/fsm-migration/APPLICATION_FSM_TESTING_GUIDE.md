# Application FSM Testing Guide

## 🧪 How to Test the Complete FSM Integration

### Prerequisites

- Extension built successfully (✅ Done)
- VS Code Extension Development Host ready
- Understanding of FSM concepts

## Step 1: Enable Application FSM

### Via Settings UI

1. Open VS Code Settings (`Ctrl+,`)
2. Search for "Azure DevOps Integration"
3. Find **"Experimental: Use Application FSM"**
4. ✅ **Check the box to enable**

### Via Settings JSON

```json
{
  "azureDevOpsIntegration.experimental.useApplicationFSM": true,
  "azureDevOpsIntegration.experimental.useFSM": true,
  "azureDevOpsIntegration.enableFSMInspector": true
}
```

## Step 2: Reload VS Code Window

- **Important**: Application FSM only initializes on extension activation
- Press `Ctrl+Shift+P` → "Developer: Reload Window"
- Watch the Debug Console for FSM startup messages

### Expected Console Output

```
🚀 Application FSM enabled - initializing state machine architecture
[ApplicationFSM] Starting application state machine...
[ApplicationFSM] Application FSM started successfully
✅ Application FSM started successfully
```

## Step 3: Test FSM Commands

### Command Palette Testing

Press `Ctrl+Shift+P` and search for:

1. **"Azure DevOps: Show Application FSM Status"**
   - Should show current FSM state information
   - JSON output with application state machine details

2. **"Azure DevOps: Start Application FSM Inspector"**
   - Should display message about XState Inspector
   - Future: Will open browser to `http://localhost:8080`

3. **"Azure DevOps: Reset Application FSM"**
   - Should reset the application state machine
   - Confirm with success message

### Expected Status Output

```json
{
  "isStarted": true,
  "currentState": "active",
  "context": {
    "isActivated": true,
    "isDeactivating": false,
    "connectionCount": 0,
    "activeConnectionId": null,
    "hasTimerActor": true,
    "connectionActorCount": 0,
    "authActorCount": 0
  },
  "timerAdapter": {
    "isEnabled": true,
    "currentSnapshot": null
  },
  "fsmManager": {
    "isStarted": true,
    "hasTimerActor": true
  }
}
```

## Step 4: Test Timer FSM Integration

### Timer Operations Test

1. **Start a timer**: Use existing timer commands
2. **Check FSM status**: Verify timer state in FSM
3. **Pause/Resume**: Test state transitions
4. **Stop timer**: Confirm cleanup

### FSM-Specific Timer Tests

- `"Azure DevOps: Show FSM Status"` - Timer-specific FSM status
- `"Azure DevOps: Validate Timer Synchronization"` - Check FSM vs legacy sync

## Step 5: Validate Error Handling

### Test Error Recovery

1. **Disable FSM**: Set `useApplicationFSM` to `false`
2. **Reload window**: Should fallback to legacy activation
3. **Re-enable FSM**: Should activate FSM again
4. **Check console**: Verify graceful fallback/recovery

### Expected Fallback Behavior

```
❌ Application FSM initialization failed: [error]
[Fallback] Using legacy activation
```

## Step 6: Performance Validation

### Activation Time Test

- **Measure extension activation time**
- **Compare FSM vs legacy activation**
- **Should be similar performance** (< 100ms difference)

### Memory Usage Check

- Open VS Code Developer Tools (`Help` → `Toggle Developer Tools`)
- Monitor memory usage with FSM enabled vs disabled
- Should be comparable memory footprint

## Step 7: Integration Validation

### Existing Functionality Test

With Application FSM enabled, test:

1. **Connection management**: Setup/manage connections
2. **Work item loading**: Refresh work items
3. **Timer functionality**: Start/stop/pause timers
4. **Webview operations**: UI interactions work normally
5. **Authentication**: PAT and Entra ID flows

### Expected Result

- ✅ **All existing functionality works identically**
- ✅ **Users see no behavioral differences**
- ✅ **Extension feels the same to use**

## Step 8: Debug Console Monitoring

### Watch for FSM Messages

```
[ApplicationFSM] State changed: { value: "active", context: {...} }
[FSM Manager] Timer actor spawned
[TimerAdapter] FSM enabled for timer operations
🚀 FSM Timer enabled - using state machine for timer operations
```

### Error Message Monitoring

Any errors should be clearly indicated:

```
❌ Application FSM failed to start: [specific error]
⚠️ Application FSM not initialized
```

## Troubleshooting

### FSM Not Starting

1. **Check settings**: Ensure `useApplicationFSM` is `true`
2. **Reload window**: FSM only starts on activation
3. **Check console**: Look for error messages
4. **Disable and retry**: Toggle setting off/on

### Commands Not Working

1. **Check extension activation**: Ensure extension loaded
2. **Verify commands**: Use `Ctrl+Shift+P` to find commands
3. **Check FSM initialization**: Use status command

### Performance Issues

1. **Compare with FSM disabled**: Test both modes
2. **Check memory usage**: Monitor in dev tools
3. **Profile activation**: Use VS Code profiler if needed

## Success Criteria ✅

The Application FSM integration is successful when:

- [ ] Extension activates normally with FSM enabled
- [ ] All FSM debug commands work correctly
- [ ] Timer operations work through FSM
- [ ] Existing functionality unchanged
- [ ] Performance remains comparable
- [ ] Error handling works gracefully
- [ ] Console shows clear FSM state transitions

## Next Steps After Testing

Once testing validates the integration:

1. **Phase 3**: Implement Connection FSM
2. **Phase 4**: Add Authentication FSM
3. **Phase 5**: Replace message handling system
4. **Phase 6**: Complete global state elimination

---

**🎉 You now have a working Application FSM architecture ready for comprehensive state management replacement!**
