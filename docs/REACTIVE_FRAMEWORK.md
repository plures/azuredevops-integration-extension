# Reactive Framework Implementation

## Overview

This application now uses a fully reactive, event-driven architecture built on XState. All UI updates, notifications, and state-dependent actions are driven by state changes rather than polling or timing delays.

## Core Principles

1. **State Changes Trigger Events**: When XState state machines change state, they emit events
2. **Event-Driven Updates**: All UI updates, notifications, and side effects respond to events
3. **No Polling**: No `setInterval` for reactive updates - only for legitimate periodic maintenance
4. **No Fixed Delays**: No `setTimeout` delays - uses `setImmediate` for event scheduling when needed
5. **Guaranteed Execution**: Reactive systems ensure eventual execution without timing dependencies

## Reactive Systems Implemented

### 1. Status Bar Updates

**Before**: Used `setTimeout` with 100ms delay  
**After**: Immediate reactive updates via `setImmediate` when state changes

**Implementation**: `src/fsm/ConnectionFSMManager.ts`

- State machine subscriptions trigger immediate status bar updates
- Uses `setImmediate` for event loop scheduling (not a delay)
- No timing dependencies - state change → immediate UI update

### 2. Notification Display

**Before**: Used `setInterval` polling to check VS Code readiness  
**After**: Event-driven reactive retry using `setImmediate`

**Implementation**: `src/fsm/machines/connectionMachine.ts` - `patExpirationNotificationReactive`

- Attempts to show notification immediately
- On failure (VS Code not ready), schedules retry via `setImmediate`
- No intervals - pure event-driven retry mechanism

### 3. Webview State Synchronization

**Already Reactive**: Uses XState subscriptions

- Application machine state changes → subscription fires → webview updated
- Fully reactive - no polling, no delays

### 4. VS Code Readiness Service

**New**: `src/fsm/services/reactiveServices.ts`

- Reactive service that checks VS Code readiness
- Uses event-driven scheduling instead of polling
- Can be extended for other VS Code capability checks

## Architecture Pattern

```
State Change (XState)
    ↓
State Subscription Fires
    ↓
Reactive Action/Service Triggered
    ↓
Event-Driven Update (setImmediate if needed)
    ↓
UI Updates / Notifications / Side Effects
```

## Key Files

### Reactive Services

- `src/fsm/services/reactiveServices.ts` - Reusable reactive services
- `src/fsm/ConnectionFSMManager.ts` - Reactive state subscriptions
- `src/fsm/machines/connectionMachine.ts` - Reactive notification actor

### State Machines

- `src/fsm/machines/applicationMachine.ts` - Main application state machine
- `src/fsm/machines/connectionMachine.ts` - Connection state machine

### UI Updates

- `src/activation.ts` - Reactive webview state synchronization
- Status bar updates via reactive subscriptions

## Remaining Periodic Tasks

These still use `setInterval` as they are legitimate periodic maintenance tasks:

- **Token Refresh** (15 min): Could be made reactive based on expiration state (future enhancement)
- **Cache Cleanup** (5 min): Background maintenance - appropriate use of intervals
- **Garbage Collection** (5 min): Background maintenance - appropriate use of intervals
- **Build Status Refresh** (5 min): Background polling - appropriate use of intervals

## Benefits

1. **Immediate Updates**: UI reflects state changes instantly
2. **No Race Conditions**: Event-driven updates eliminate timing-based bugs
3. **Predictable**: State changes always trigger updates - guaranteed execution
4. **Maintainable**: Clear event flow, easy to debug
5. **Performant**: No unnecessary polling or delays

## Future Enhancements

- Make token refresh reactive based on expiration state changes
- Extend reactive services for other VS Code capability checks
- Create reactive event bus for cross-component communication
