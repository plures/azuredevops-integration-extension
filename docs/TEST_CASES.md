# TEST_CASES.md — Azure DevOps Integration Extension

**Version**: 1.0.0  
**Last updated**: 2026-03-06  
**Status**: Active  

This document defines real-world developer test cases that match daily Azure DevOps usage.  
All test cases use **Given / When / Then** format and are categorised by priority tier.

---

## Priority Tiers

| Tier | Meaning | Release gate |
|------|---------|-------------|
| **P0** | Must pass before any release is published | Hard gate — release is blocked if any P0 fails |
| **P1** | Should pass before release; known failures require sign-off | Soft gate — documented waiver required |
| **P2** | Nice-to-have; tracked but not blocking | Advisory — filed as bug, not blocking |

---

## Automated-Test Mapping

Every P0 case **must** have a corresponding automated test.  
The table below cross-references each case to its test file and `it()` description.

| Case ID | Priority | Automated test file | Test description |
|---------|----------|---------------------|-----------------|
| TC-001 | P0 | `tests/praxis/examples/developer-scenarios.test.ts` | `TC-001: successful Entra ID Device Code sign-in sets auth state to authenticated` |
| TC-002 | P0 | `tests/praxis/examples/developer-scenarios.test.ts` | `TC-002: authentication failure emits AuthenticationFailedEvent with error message` |
| TC-003 | P0 | `tests/praxis/examples/developer-scenarios.test.ts` | `TC-003: tenant mismatch results in authentication failure with descriptive error` |
| TC-004 | P0 | `tests/praxis/examples/developer-scenarios.test.ts` | `TC-004: work items are loaded for the active connection` |
| TC-005 | P0 | `tests/praxis/examples/developer-scenarios.test.ts` | `TC-005: UpdateWorkItemEvent transitions work item to new state` |
| TC-006 | P0 | `tests/praxis/examples/developer-scenarios.test.ts` | `TC-006: CreatePullRequestEvent is dispatched with correct connection and work item` |
| TC-007 | P0 | `tests/praxis/examples/developer-scenarios.test.ts` | `TC-007: permission-denied error is surfaced as ApplicationErrorEvent` |
| TC-008 | P1 | `tests/praxis/examples/developer-scenarios.test.ts` | `TC-008: PAT-based connection loads work items successfully` |
| TC-009 | P1 | `tests/praxis/examples/developer-scenarios.test.ts` | `TC-009: CreateBranchEvent is dispatched with work item context` |
| TC-010 | P1 | `tests/praxis/examples/developer-scenarios.test.ts` | `TC-010: switching active connection isolates work item lists per connection` |
| TC-011 | P1 | `tests/praxis/examples/developer-scenarios.test.ts` | `TC-011: WorkItemsErrorEvent is raised when network is unavailable` |
| TC-012 | P1 | `tests/praxis/examples/developer-scenarios.test.ts` | `TC-012: retry after network error reloads work items` |
| TC-013 | P2 | `tests/praxis/examples/developer-scenarios.test.ts` | `TC-013: sign-out clears authentication state for the connection` |
| TC-014 | P2 | `tests/praxis/examples/developer-scenarios.test.ts` | `TC-014: timer start → pause → stop records full timer history` |
| TC-015 | P2 | `tests/praxis/examples/developer-scenarios.test.ts` | `TC-015: cross-project work item list contains items from both connections` |
| TC-016 | P2 | `tests/praxis/examples/developer-scenarios.test.ts` | `TC-016: device code sign-in session is recorded and cleared on completion` |
| TC-017 | P2 | `tests/praxis/examples/developer-scenarios.test.ts` | `TC-017: auth code flow browser-opened event is recorded in session state` |
| TC-018 | P2 | `tests/praxis/examples/developer-scenarios.test.ts` | `TC-018: on-premises connection uses custom baseUrl and loads work items` |

---

## P0 — Release-Blocking Cases

### TC-001 · Sign-in with Entra ID (Device Code flow) — happy path

**Priority**: P0  
**Scenario**: Successful interactive sign-in using the Microsoft Entra ID device code flow.

**Given**  
- The extension is activated with a connection configured for Entra ID authentication  
- The user has not yet authenticated  

**When**  
- `SignInEntraEvent` is dispatched for the active connection with `forceInteractive: false`  
- A device code session is started (`DeviceCodeStartedAppEvent`)  
- The user completes the browser sign-in  
- `DeviceCodeCompletedAppEvent` is dispatched with a valid token  
- `AuthenticationSuccessEvent` is dispatched for the connection  

**Then**  
- The connection auth state is `authenticated`  
- No `lastError` is set on the engine context  
- Work items can be loaded without an auth error  

**Automated test**: `TC-001: successful Entra ID Device Code sign-in sets auth state to authenticated`

---

### TC-002 · Token expiry and silent-refresh failure

**Priority**: P0  
**Scenario**: An existing token expires and the silent refresh attempt fails, forcing re-authentication.

**Given**  
- The user is authenticated with a token that has an expiry in the past  

**When**  
- A work-item fetch is attempted  
- `AuthenticationFailedEvent` is dispatched with error `"token_expired"`  

**Then**  
- The connection auth state transitions to `unauthenticated`  
- `lastError` on the context captures the expiry reason  
- A re-authentication prompt (auth reminder) is raised  

**Automated test**: `TC-002: authentication failure emits AuthenticationFailedEvent with error message`

---

### TC-003 · Tenant mismatch during Entra authentication

**Priority**: P0  
**Scenario**: The user signs into a different Microsoft tenant than the one configured for the connection.

**Given**  
- A connection is configured with `tenantId: "corp-tenant-id"`  
- The user signs into `personal-tenant-id` via device code  

**When**  
- `AuthenticationFailedEvent` is dispatched with error containing `"tenant_mismatch"`  

**Then**  
- The connection auth state is `unauthenticated`  
- `lastError.message` includes tenant context information  
- The UI shows a re-authentication prompt with a descriptive message  

**Automated test**: `TC-003: tenant mismatch results in authentication failure with descriptive error`

---

### TC-004 · Query work items assigned to current user

**Priority**: P0  
**Scenario**: The developer opens the extension and loads their assigned work items.

**Given**  
- The extension is activated  
- One connection is configured and authenticated  

**When**  
- `WorkItemsLoadedEvent` is dispatched with a list of work items  

**Then**  
- `connectionWorkItems` for the active connection is non-empty  
- Each work item has an `id`, `title`, `state`, and `workItemType`  
- The active connection ID matches the loaded items  

**Automated test**: `TC-004: work items are loaded for the active connection`

---

### TC-005 · Edit work item state across projects

**Priority**: P0  
**Scenario**: The developer moves a bug from `Active` to `Resolved` using the extension.

**Given**  
- Work items are loaded for the active connection  
- Work item #3001 is in state `Active`  

**When**  
- `WorkItemsLoadedEvent` is dispatched with the work item now having state `Resolved`  

**Then**  
- `connectionWorkItems` reflects the updated state for item #3001  
- No error is recorded in the engine context  

**Automated test**: `TC-005: UpdateWorkItemEvent transitions work item to new state`

---

### TC-006 · Create PR and validate event dispatch

**Priority**: P0  
**Scenario**: The developer creates a pull request directly from a work item.

**Given**  
- The extension is active and authenticated  
- Work item #4001 is selected  

**When**  
- `CreatePullRequestEvent` is dispatched with `{ connectionId, workItemId: 4001 }`  

**Then**  
- The event is accepted by the engine without error  
- No `lastError` is recorded  
- The engine state remains `active`  

**Automated test**: `TC-006: CreatePullRequestEvent is dispatched with correct connection and work item`

---

### TC-007 · Permission-denied error handling

**Priority**: P0  
**Scenario**: A work item update fails because the current user lacks write permissions.

**Given**  
- The extension is active and authenticated  

**When**  
- `ApplicationErrorEvent` is dispatched with `{ error: "permission_denied" }`  

**Then**  
- `lastError.message` contains `"permission_denied"`  
- A retry action is available (engine does not crash and remains in `active` state)  

**Automated test**: `TC-007: permission-denied error is surfaced as ApplicationErrorEvent`

---

## P1 — Should-Pass Cases

### TC-008 · Sign-in with Personal Access Token (PAT)

**Priority**: P1  
**Scenario**: The developer uses a PAT instead of Entra ID for authentication.

**Given**  
- A connection is configured with `authMethod: "pat"` and a valid PAT  

**When**  
- `ConnectionsLoadedEvent` is dispatched with the PAT-based connection as active  
- `AuthenticationSuccessEvent` is dispatched for the connection  
- `WorkItemsLoadedEvent` is dispatched with sample work items  

**Then**  
- The connection is active and authenticated  
- Work items are loaded correctly  
- No auth reminder is raised  

**Automated test**: `TC-008: PAT-based connection loads work items successfully`

---

### TC-009 · Start branch from work item

**Priority**: P1  
**Scenario**: The developer creates a feature branch directly from a work item.

**Given**  
- The extension is active and authenticated  
- Work item #5001 is visible in the work item list  

**When**  
- `CreateBranchEvent` is dispatched with `{ connectionId, workItemId: 5001 }`  

**Then**  
- The event is accepted without error  
- Engine state remains `active`  
- No `lastError` is set  

**Automated test**: `TC-009: CreateBranchEvent is dispatched with work item context`

---

### TC-010 · Multi-connection tab switching isolates state

**Priority**: P1  
**Scenario**: The developer switches between two Azure DevOps connections; each tab shows its own work items.

**Given**  
- Two connections (`conn-A` and `conn-B`) are loaded  
- Each connection has its own list of work items  
- `conn-A` is the active connection  

**When**  
- `ConnectionSelectedEvent` is dispatched with `{ connectionId: "conn-B" }`  

**Then**  
- `activeConnectionId` is `conn-B`  
- `connectionWorkItems` for `conn-A` and `conn-B` remain separate  
- The work items visible match `conn-B`'s list  

**Automated test**: `TC-010: switching active connection isolates work item lists per connection`

---

### TC-011 · Offline behaviour — network error raises WorkItemsErrorEvent

**Priority**: P1  
**Scenario**: The developer is offline; the extension surfaces a clear network error instead of silently failing.

**Given**  
- The extension is active and the connection is authenticated  

**When**  
- `WorkItemsErrorEvent` is dispatched with `{ connectionId, error: "network_unavailable" }`  

**Then**  
- `lastError` is set with the network-unavailable reason  
- No stale work items are shown for the connection (empty list)  
- Engine remains in `active` state (error is non-fatal; recovery is via retry)  

**Automated test**: `TC-011: WorkItemsErrorEvent is raised when network is unavailable`

---

### TC-012 · Reconnect and reload after transient network error

**Priority**: P1  
**Scenario**: Network comes back; the developer clicks Retry and work items reload successfully.

**Given**  
- The engine is in `error` state after a `WorkItemsErrorEvent`  

**When**  
- `RetryApplicationEvent` is dispatched  
- `WorkItemsLoadedEvent` is dispatched with the work items  

**Then**  
- Engine state transitions back to `active`  
- `lastError` is cleared  
- Work items list is populated  

**Automated test**: `TC-012: retry after network error reloads work items`

---

## P2 — Advisory Cases

### TC-013 · Sign-out clears authentication state

**Priority**: P2  
**Scenario**: The developer explicitly signs out of a connection.

**Given**  
- The connection is authenticated  

**When**  
- `SignOutEntraEvent` is dispatched for the connection  
- `ConnectionStateUpdatedEvent` is dispatched setting auth state to `unauthenticated`  

**Then**  
- The connection no longer has a valid token  
- An auth reminder is shown  

**Automated test**: `TC-013: sign-out clears authentication state for the connection`

---

### TC-014 · Time-tracking: start → pause → stop

**Priority**: P2  
**Scenario**: The developer tracks time on a work item using the built-in timer.

**Given**  
- Work item #6001 is loaded and visible  

**When**  
- `StartTimerEvent` is dispatched with `{ workItemId: 6001, timestamp: <now> }`  
- `PauseTimerEvent` is dispatched  
- `StopTimerEvent` is dispatched  

**Then**  
- `timerHistory.entries` contains start, pause, and stop entries  
- No error is recorded  

**Automated test**: `TC-014: timer start → pause → stop records full timer history`

---

### TC-015 · Cross-project work item visibility

**Priority**: P2  
**Scenario**: Two connections (two projects) are loaded and work items from both are accessible independently.

**Given**  
- Connections `proj-alpha` and `proj-beta` are both loaded  
- Each has distinct work items  

**When**  
- `WorkItemsLoadedEvent` is dispatched for `proj-alpha`  
- `WorkItemsLoadedEvent` is dispatched for `proj-beta`  

**Then**  
- `connectionWorkItems.get("proj-alpha")` returns alpha's items  
- `connectionWorkItems.get("proj-beta")` returns beta's items  
- Lists do not overlap  

**Automated test**: `TC-015: cross-project work item list contains items from both connections`

---

### TC-016 · Device code sign-in session is recorded and cleared

**Priority**: P2  
**Scenario**: Device code flow records a session and clears it on completion.

**Given**  
- The extension is active and the connection is unauthenticated  

**When**  
- `DeviceCodeStartedAppEvent` is dispatched with a device code and verification URL  
- `DeviceCodeCompletedAppEvent` is dispatched  

**Then**  
- After start, `deviceCodeSession` is set on context  
- After completion, `deviceCodeSession` is cleared  

**Automated test**: `TC-016: device code sign-in session is recorded and cleared on completion`

---

### TC-017 · Auth code flow browser-opened event recorded in session

**Priority**: P2  
**Scenario**: Auth code flow captures a session when the browser is opened for sign-in.

**Given**  
- The extension is active with an unauthenticated Entra ID connection  

**When**  
- `AuthCodeFlowStartedAppEvent` is dispatched  
- `AuthCodeFlowBrowserOpenedEvent` is dispatched  

**Then**  
- `authCodeFlowSession` is set on context  
- No error is raised  

**Automated test**: `TC-017: auth code flow browser-opened event is recorded in session state`

---

### TC-018 · On-premises Azure DevOps Server connection

**Priority**: P2  
**Scenario**: The developer connects to an on-premises Azure DevOps Server using a custom base URL.

**Given**  
- A connection is configured with `baseUrl: "https://ado.corp.example.com/DefaultCollection"` and `authMethod: "pat"`  

**When**  
- `ConnectionsLoadedEvent` is dispatched with the on-premises connection  
- `AuthenticationSuccessEvent` is dispatched  
- `WorkItemsLoadedEvent` is dispatched with items  

**Then**  
- `activeConnectionId` matches the on-premises connection  
- Work items are loaded correctly  
- No cloud-specific URL error is raised  

**Automated test**: `TC-018: on-premises connection uses custom baseUrl and loads work items`

---

## Release Gate Definition

### P0 Gate (hard — must pass before every release)

All P0 automated tests in `tests/praxis/examples/developer-scenarios.test.ts` must pass in CI.  
CI command: `npm test -- --reporter=verbose tests/praxis/examples/developer-scenarios.test.ts`

### P1 Gate (soft — failures require documented waiver)

All P1 automated tests must pass or a waiver must be filed as a GitHub issue tagged `release-waiver`.

### P2 Gate (advisory — failures are tracked as bugs)

P2 test failures are opened as GitHub issues with label `P2-advisory` and do not block release.

---

## Mandatory PR Review Artefact

This document **must** be consulted as part of any feature PR review:

1. The PR author must state which test cases (by ID) are affected by the change.  
2. Any new feature must add at least one new test case (P0 or P1) to this document.  
3. Any change that modifies authentication, work item loading, or connection management **must** not reduce the count of passing P0 automated tests.

> **Template for PR description:**
>
> ```
> ## TEST_CASES impact
> - Affected cases: TC-xxx, TC-yyy
> - New cases added: TC-nnn (description)
> - P0 tests still passing: yes / no (if no, reason and waiver link)
> ```
