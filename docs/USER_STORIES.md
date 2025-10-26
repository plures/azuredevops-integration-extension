# Application Lifecycle User Stories

This document outlines the key user stories for the major phases of the application's lifecycle. These stories are designed to guide architectural decisions, ensure a seamless user experience, and verify that the application's reactive, state-driven design meets all functional requirements.

---

## 1. Setup & Connection Management

**As a user, I want to configure and manage my connections to Azure DevOps so that I can access my work items from different projects and organizations.**

### Scenario 1.1: First-Time Setup

- **Given** I have just installed the extension and have no connections.
- **When** I open the extension's sidebar or run the "Azure DevOps: Setup Connection" command.
- **Then** the UI prompts me to "Add a New Connection," guiding me through the process.

### Scenario 1.2: Adding a New Connection

- **Given** I have initiated the "Add Connection" flow.
- **When** I am prompted to provide connection details.
- **Then** I can choose between "Manual Setup" and "From Work Item URL".
- **And** if I choose "Manual Setup", I am prompted for:
  1.  **Type**: "Azure DevOps Services (Cloud)" or "Azure DevOps Server (On-Premises)".
  2.  **Details**: Organization (Cloud) or Server URL (On-Prem), and Project.
  3.  **Label**: A friendly name for the connection (e.g., "Work Project").
  4.  **Auth Type**: "Personal Access Token (PAT)" or "Entra ID / OAuth" (Cloud only).
- **When** the connection settings are saved.
- **Then** the FSM context is updated with the new connection configuration.
- **And** the webview's `appState` store reacts to this change, creating a new tab for the connection.
- **And** the UI for the new tab shows a "Sign In" button because the `authStatus` for this connection is initially `'unauthenticated'`.

### Scenario 1.3: Managing Existing Connections

- **Given** I have one or more existing connections.
- **When** I run the "Azure DevOps: Setup Connection" command.
- **Then** I am presented with a choice to "Add", "Edit", or "Delete" a connection.
- **And** if I choose to "Delete" a connection, I am asked for confirmation.
- **When** I confirm the deletion.
- **Then** the connection is removed from the FSM context.
- **And** the webview reacts by removing the corresponding tab.

---

## 2. Authentication

**As a user, I want to securely authenticate with my Azure DevOps connections so that the application can access my data on my behalf.**

### Scenario 2.1: Authenticating with a Personal Access Token (PAT)

- **Given** a connection is configured for PAT authentication and has a status of `'unauthenticated'`.
- **When** I click the "Sign In" button for that connection.
- **Then** a prompt appears asking for my PAT.
- **And** the prompt includes instructions and a link for creating a PAT with the required scopes (e.g., `Work Items (Read & write)`, `Code (Read)`).
- **And** I am prompted to specify the token's expiration date or duration (e.g., 30 days, 90 days) to enable expiration warnings.
- **When** I submit a valid PAT.
- **Then** the token is securely stored in the VS Code `SecretStorage`.
- **And** the FSM transitions the connection's `authStatus` to `'authenticating'`.
- **And** an FSM service validates the token by making a test API call.
- **If** validation succeeds:
  - The `authStatus` becomes `'authenticated'`.
  - The webview reacts by hiding the "Sign In" button and starting to fetch data.
- **If** validation fails:
  - The `authStatus` becomes `'authenticationFailed'`.
  - The webview reacts by showing an error message (e.g., "Invalid PAT or insufficient permissions").

### Scenario 2.2: Authenticating with Entra ID (OAuth Device Code Flow)

- **Given** a connection is configured for Entra ID and is `'unauthenticated'`.
- **When** I click the "Sign In" button.
- **Then** the FSM initiates the OAuth device code flow.
- **And** a VS Code notification appears with a user code and a verification URL (e.g., `microsoft.com/devicelogin`).
- **And** the notification provides a "Copy Code & Open" button.
- **When** I complete the authentication flow in the browser.
- **Then** the FSM receives the access and refresh tokens.
- **And** the tokens are securely stored in `SecretStorage`.
- **And** the connection's `authStatus` transitions to `'authenticated'`.
- **And** the webview reacts by starting to fetch data.

### Scenario 2.3: Automatic Token Refresh

- **Given** I am authenticated with Entra ID and the access token is nearing expiration.
- **When** the FSM's internal timer detects it's time to refresh.
- **Then** the FSM uses the stored refresh token to silently request a new access token in the background.
- **And** the new tokens are securely stored, overwriting the old ones.
- **And** my session continues uninterrupted.
- **If** the background refresh fails (e.g., refresh token expired), the `authStatus` becomes `'unauthenticated'`, and the UI prompts me to sign in again.

### Scenario 2.4: PAT Expiration Warning

- **Given** I am authenticated with a PAT that is nearing its expiration date (e.g., within 7 days).
- **When** the FSM checks token statuses.
- **Then** a warning toast notification is displayed: "Your Personal Access Token for '[Connection Label]' is expiring soon."
- **And** the status bar indicator for that connection may change color or icon to indicate the pending expiration.
- **When** I click the status bar indicator or the notification.
- **Then** the PAT sign-in flow (Scenario 2.1) is initiated so I can provide a new token.

---

## 3. Core Interaction & Data Synchronization

**As a user, I want to view and interact with my work items in a seamless and reactive way, with the confidence that my data is up-to-date.**

### Scenario 3.1: Viewing Work Items

- **Given** I have an authenticated connection.
- **When** I select the connection's tab in the webview.
- **Then** the FSM checks if data for the currently selected query is fresh.
- **If** the data is stale or not present, an FSM service is invoked to fetch the work items for the default/selected query.
- **And** the connection state transitions to `'loading'`.
- **And** the webview displays a loading indicator.
- **When** the data is successfully fetched.
- **Then** the FSM context is updated with the new work items.
- **And** the connection state becomes `'idle'`.
- **And** the webview reacts to the updated `appState` and displays the list of work items.

### Scenario 3.2: Changing Queries

- **Given** I am viewing work items for a connection.
- **When** I select a different query from the dropdown list in the webview.
- **Then** the webview posts a `SELECT_QUERY` event to the FSM.
- **And** the FSM updates the `currentQuery` for the active connection in its context.
- **And** this triggers the data fetching flow described in Scenario 3.1 for the newly selected query.

### Scenario 3.3: Background Data Refresh

- **Given** the extension is running and a refresh interval is configured (e.g., 15 minutes).
- **When** the FSM's refresh timer for a connection elapses.
- **Then** the FSM automatically re-fetches the data for the currently viewed query (as in Scenario 3.1).
- **And** the webview's list of work items updates automatically.

### Scenario 3.4: Handling Data Conflicts During User Edit

- **Given** I am editing a comment on a work item in the webview.
- **And** a background refresh occurs.
- **And** the refresh detects the work item I am editing has been **deleted** on the server.
- **Then** the FSM updates the item's state in the context to `isDeleted: true` but does **not** immediately remove it from the list.
- **And** the webview reacts to this state change:
  - The work item's card in the UI becomes visually distinct (e.g., faded out, red border).
  - A message appears on the card: "This work item has been deleted."
  - My comment input field remains active, allowing me to copy my text.
  - A "Dismiss" button is shown to remove the item from my view.
- **This ensures** I do not lose the work I was doing and am gracefully notified of the external change.

---

## 4. Timer & Work Tracking

**As a user, I want to track the time I spend on a work item directly from the UI so that I can accurately log my effort.**

### Scenario 4.1: Starting and Stopping the Timer

- **Given** I am viewing a list of work items.
- **When** I click the "Start" button on a work item.
- **Then** the webview sends a `START_TIMER` event with the `workItemId`.
- **And** the FSM updates its context to set the `activeTimer` with the `workItemId` and `startTime`.
- **And** the webview reacts:
  - The "Start" button on that item changes to a "Stop" button with a running clock icon.
  - A prominent indicator appears in the VS Code status bar showing the active work item ID and the elapsed time.
- **When** I click the "Stop" button (either in the webview or the status bar).
- **Then** an event is sent to the FSM.
- **And** the FSM clears the `activeTimer` from its context.
- **And** the webview and status bar indicators are removed.
- **(Optional)** The FSM prompts me if I want to log the elapsed time to the work item.
