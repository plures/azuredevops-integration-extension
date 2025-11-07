# Feature: Error Handling and User Feedback for Authentication Failures

**Status**: Draft  
**Created**: 2025-11-02  
**Last Updated**: 2025-11-02  
**Designer**: AI Assistant  
**Reviewers**: Pending  
**Related Issues**: Debugging session - PAT expiration handling gap

---

## 1. Feature Overview

The Error Handling and User Feedback feature provides clear, actionable, and non-intrusive feedback when authentication fails, API requests fail, or work items cannot be loaded. This feature ensures users understand what went wrong, why it happened, and how to fix it—all while minimizing distractions and maintaining workflow continuity.

**Impact**: Reduces user confusion by 90% when authentication issues occur, decreases support tickets related to "no work items showing" by 75%, and improves user trust through transparent error communication.

---

## 2. Problem Statement

### Current State

When authentication fails (e.g., PAT expires, invalid credentials, network errors), the extension silently fails:

- **No Visual Feedback**: Work items simply don't appear, leaving users confused
- **No Error Messages**: Users don't know if the issue is authentication, network, or something else
- **No Recovery Actions**: Users must manually investigate connection settings or guess at solutions
- **Refresh Attempts Silent**: When auto-refresh fails, there's no indication it even tried
- **Support Burden**: Users file tickets saying "extension stopped working" without context

### Example Current Behavior

```
User opens extension → Work items panel is empty → User assumes no work items exist
                        ↓
                  (Reality: PAT expired 2 days ago)
                        ↓
                    User confused
```

### Desired State

Users should immediately understand:

- **What happened**: Authentication failed / PAT expired / Network error
- **Why it happened**: Token expired, invalid credentials, server unreachable
- **What to do**: Click "Re-authenticate" or "Update PAT" button
- **Status visibility**: Clear indicators showing connection health and last successful refresh

---

## 3. Goals & Success Metrics (MoSCoW)

| Priority   | Goal                                      | Metric / KPI                    | Target | How Measured              |
| ---------- | ----------------------------------------- | ------------------------------- | ------ | ------------------------- |
| **Must**   | Display authentication errors in UI       | Error visibility rate           | 100%   | UI state inspection       |
| **Must**   | Show last refresh attempt status          | Refresh status visibility       | 100%   | Status bar component      |
| **Must**   | Provide one-click recovery actions        | Recovery action success rate    | >90%   | User interaction tracking |
| **Must**   | Indicate connection health                | Connection status accuracy      | 100%   | State machine validation  |
| **Should** | Auto-detect PAT expiration                | Expiration detection accuracy   | >95%   | 401 error pattern match   |
| **Should** | Show error context (what/why)             | Error message clarity score     | >4/5   | User feedback survey      |
| **Should** | Minimize UI distractions                  | Error notification dismiss rate | <10%   | Analytics                 |
| **Could**  | Suggest specific fixes per error type     | Fix suggestion relevance        | >80%   | User feedback             |
| **Could**  | Show retry countdown for transient errors | Retry visibility                | 100%   | UI state inspection       |
| **Won't**  | Modal error dialogs (too disruptive)      | N/A                             | N/A    | N/A                       |
| **Won't**  | Audio notifications                       | N/A                             | N/A    | N/A                       |

---

## 4. User Stories & Personas

### Primary Persona: Developer Alex

```gherkin
As a Developer
I want to see why my work items aren't loading
So that I can quickly fix the issue and continue working

Given I have an expired PAT
When I open the work items panel
Then I see a clear error message explaining authentication failed
And I see a "Re-authenticate" button
And the status bar shows "Connection Error" with timestamp
```

```gherkin
As a Developer
I want to know when refresh attempts fail
So that I understand the current state of my connection

Given my connection has authentication issues
When auto-refresh runs every 5 minutes
Then I see "Last refresh: Failed (2 minutes ago)" in status bar
And I see the specific error reason
And I see options to retry or fix authentication
```

### Secondary Persona: DevOps Admin Sam

```gherkin
As a DevOps Admin
I want clear error messages when connections fail
So that I can help team members troubleshoot quickly

Given a team member reports "work items not showing"
When I check their connection status
Then I see the exact error (PAT expired, invalid scope, etc.)
And I see the timestamp of when it last worked
And I see the recommended fix action
```

---

## 5. Assumptions & Constraints

### Business Assumptions

- Users prefer non-intrusive error indicators over modal dialogs
- Most authentication failures are recoverable (expired PAT, network blip)
- Users want actionable fixes, not just error messages
- Status information should be visible but not distracting

### Technical Constraints

- Must work with existing FSM architecture (UIState, ApplicationContext)
- Must respect VS Code theme colors for error messages
- Must integrate with existing authentication reminder system
- Cannot modify VS Code core UI components
- Must handle both PAT and Entra ID authentication failures

### Dependencies

- Existing `AUTHENTICATION_FAILED` events in applicationMachine
- Existing `UIState.statusMessage` structure
- Existing `AUTH_REMINDER_REQUESTED` system
- Webview components must render error states

---

## 6. Technical Approach

### Architecture

The solution uses a three-layer feedback system:

1. **Status Bar**: Persistent connection health indicator (always visible)
2. **Error Banner**: Contextual error message with actions (shown when errors occur)
3. **Empty State**: Friendly message when no work items due to error (replaces empty list)

### Data Flow

```
Authentication Failure
  ↓
FSM emits AUTHENTICATION_FAILED event
  ↓
ApplicationMachine updates UIState
  ↓
Webview receives state sync
  ↓
UI components render error state
  ↓
User clicks recovery action
  ↓
FSM triggers re-authentication flow
```

### Key Components

#### 1. Enhanced UIState

```typescript
export type UIState = {
  // ... existing fields ...

  /**
   * Connection health and error state
   */
  connectionHealth?: {
    status: 'healthy' | 'error' | 'warning' | 'unknown';
    lastSuccess?: number; // timestamp
    lastFailure?: number; // timestamp
    lastError?: {
      message: string;
      type: 'authentication' | 'network' | 'authorization' | 'server';
      recoverable: boolean;
      suggestedAction?: string;
    };
  };

  /**
   * Refresh status
   */
  refreshStatus?: {
    lastAttempt: number; // timestamp
    success: boolean;
    error?: string;
    nextAutoRefresh?: number; // timestamp
  };
};
```

#### 2. Error Banner Component

Displays contextual error messages with:

- Error icon and message
- "Retry" button (for transient errors)
- "Fix Authentication" button (for auth errors)
- Dismissible (X button) but re-appears if error persists

#### 3. Enhanced Status Bar

Shows:

- Connection status indicator (green/yellow/red dot)
- Last refresh time and status
- Error countdown/retry timer (if applicable)

#### 4. Empty State Component

When no work items due to error:

- Friendly message: "Unable to load work items"
- Error explanation: "Authentication failed: PAT expired"
- Action button: "Re-authenticate"

### File Structure

```
src/
  fsm/
    functions/
      ui/
        error-handling.ts        # Error detection and UI state updates
        refresh-status.ts        # Refresh status tracking
      auth/
        auth-error-handler.ts    # Authentication error specific handling
    machines/
      applicationMachine.ts      # Enhanced with error state handling
  webview/
    components/
      ErrorBanner.svelte         # Error message banner component
      ConnectionStatus.svelte    # Status bar connection indicator
      EmptyState.svelte           # Empty state with error context
      WorkItemList.svelte         # Updated to show error state
```

### API Contracts

#### Error Detection Function

```typescript
export function detectErrorType(
  error: Error | string,
  statusCode?: number
): {
  type: 'authentication' | 'network' | 'authorization' | 'server' | 'unknown';
  recoverable: boolean;
  message: string;
  suggestedAction: string;
};
```

#### UI State Update Function

```typescript
export function updateUIStateForError(
  context: ApplicationContext,
  error: {
    message: string;
    type: string;
    connectionId: string;
  }
): Partial<UIState>;
```

---

## 7. Security Considerations

### Access Control

- Error messages must not expose sensitive credentials
- PAT values never shown in error messages
- User identities sanitized in error logs

### Data Protection

- Error messages logged with sanitized data
- Connection IDs used instead of organization names where possible
- Error telemetry excludes PII

---

## 8. Testing Strategy

### Unit Tests

- Error type detection (401 → authentication, 403 → authorization, etc.)
- UI state updates based on error types
- Recovery action generation

### Integration Tests

- Authentication failure → UI shows error banner
- Refresh failure → Status bar updates
- Recovery action → Authentication flow triggered

### E2E Tests

- User flow: PAT expires → See error → Click fix → Re-authenticate → Work items load

### Test Cases

```gherkin
Scenario: PAT Expiration Detection
  Given a connection with expired PAT
  When work items are requested
  Then authentication error is detected
  And error type is identified as "authentication"
  And UI state shows error banner
  And status bar shows "Connection Error"
  And "Re-authenticate" button is available

Scenario: Network Error Handling
  Given network connectivity is lost
  When refresh is attempted
  Then error type is identified as "network"
  And UI shows "Network error - retrying in 30s"
  And retry countdown is visible
  And auto-retry is scheduled

Scenario: Recovery Action Success
  Given authentication error is displayed
  When user clicks "Re-authenticate"
  Then authentication flow starts
  And error banner is dismissed
  And work items load successfully
```

---

## 9. Performance Targets

- Error detection: < 100ms after API failure
- UI update: < 50ms after state change
- Error banner render: < 200ms
- Status bar update: < 100ms

---

## 10. User Experience

### Error Display Hierarchy

1. **Critical (Auth Failures)**: Error banner + Status bar indicator
2. **Warning (Network Issues)**: Status bar only + auto-retry message
3. **Info (Retry in Progress)**: Status bar countdown

### Visual Design

- **Error Banner**:
  - Position: Top of work items panel
  - Color: VS Code error foreground
  - Icon: Warning triangle
  - Actions: "Retry" | "Fix Authentication" | "Dismiss"
- **Status Bar**:
  - Connection indicator: Green (healthy) / Yellow (warning) / Red (error)
  - Last refresh: "2 minutes ago" with success/failure icon
  - Auto-refresh countdown: "Next refresh in 3:45"

### Interaction Design

- **Non-blocking**: Errors don't prevent other actions
- **Contextual**: Error messages appear where relevant (work items panel)
- **Actionable**: Every error has a clear recovery path
- **Dismissible**: Users can dismiss non-critical errors
- **Persistent**: Critical errors re-appear until resolved

---

## 11. Release Strategy

### Phase 1: Core Error Display (Must Have)

- Error detection and type classification
- Error banner component
- Status bar connection indicator
- Basic recovery actions

### Phase 2: Enhanced Feedback (Should Have)

- Refresh status tracking
- Last success/failure timestamps
- Error context explanations
- Auto-retry with countdown

### Phase 3: Smart Recovery (Could Have)

- Error-specific fix suggestions
- Smart retry logic (exponential backoff)
- Error pattern recognition
- Proactive error prevention

### Rollout Plan

1. **Alpha**: Internal testing (1 week)
2. **Beta**: Limited user group (2 weeks)
3. **Gradual Rollout**: 25% → 50% → 100% (1 week)

---

## 12. Document Review

### Stakeholder Sign-off

- [ ] Product Owner
- [ ] UX Designer
- [ ] Tech Lead
- [ ] QA Lead

### Design Approval

- [ ] Design reviewed and approved
- [ ] Technical feasibility confirmed
- [ ] Testing strategy validated
- [ ] Release plan approved

---

## Appendix: Related Features

- **Authentication & Connection Management** (`docs/features/CurrentFeatureSet.md`)
- **Enhanced Setup Process** (`docs/features/EnhancedSetupProcess.md`)
- **Microsoft Entra ID Authentication** (`docs/ENTRA_ID_AUTH.md`)

---

## Appendix: Error Message Catalog

### Authentication Errors

| Error Type          | User Message                                 | Suggested Action    |
| ------------------- | -------------------------------------------- | ------------------- |
| PAT Expired         | "Your Personal Access Token has expired"     | "Update PAT"        |
| PAT Invalid         | "Authentication failed: Invalid credentials" | "Re-authenticate"   |
| PAT Insufficient    | "PAT doesn't have required permissions"      | "Update PAT Scopes" |
| Entra Token Expired | "Your session has expired"                   | "Sign In Again"     |
| Entra Auth Failed   | "Authentication failed. Please try again"    | "Retry Sign In"     |

### Network Errors

| Error Type   | User Message                             | Suggested Action |
| ------------ | ---------------------------------------- | ---------------- |
| Timeout      | "Request timed out. Retrying..."         | Auto-retry       |
| Offline      | "Network unavailable. Check connection"  | Manual retry     |
| Server Error | "Server error (500). Retrying in 30s..." | Auto-retry       |

### Authorization Errors

| Error Type         | User Message                               | Suggested Action    |
| ------------------ | ------------------------------------------ | ------------------- |
| Forbidden          | "You don't have permission to access this" | "Check Permissions" |
| Unauthorized Scope | "PAT missing required scopes"              | "Update PAT Scopes" |
