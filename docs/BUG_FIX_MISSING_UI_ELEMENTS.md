# Fix: Missing UI Elements (Query Selector)

## Issue

The webview was showing the header buttons but missing the query selector and work item list.

## Root Cause

The Praxis engine rules for loading connections (`connectionsLoadedRule`) and selecting a connection (`connectionSelectedRule`) were restricted to run only when the application state was `active`.

However, during the activation phase (`activating` state), the extension loads connections from configuration and emits `CONNECTIONS_LOADED` and `CONNECTION_SELECTED` events. Because of the state restriction, these events were ignored by the engine.

As a result, the application context sent to the webview had empty `connections` and undefined `activeConnectionId`. The webview's `ConnectionViews` component relies on `activeConnectionId` to render the active connection's view (which contains the query selector). Since no connection matched the (undefined) active ID, nothing was rendered below the header.

## Fix

Modified `src/praxis/application/rules/connectionRules.ts` to remove the `transition` constraint from:

- `connectionsLoadedRule`
- `connectionSelectedRule`
- `queryChangedRule`

This allows these rules to execute in any state, ensuring that connection data is correctly populated in the context during the activation phase.

## Verification

- `CONNECTIONS_LOADED` event is now processed during `activating` state.
- `context.connections` is populated.
- `context.activeConnectionId` is set.
- Webview receives correct context and renders `WorkItemList` (including query selector).

- workItemsLoadedRule (in src/praxis/application/rules/workItemRules.ts)

## Additional Fixes (UI Disappearing)

### Issue

The UI would render briefly and then disappear.

### Root Cause

The application was transitioning to an \rror_recovery\ state upon encountering errors (e.g., connection errors). The \getSnapshot\ method in \PraxisApplicationManager\ did not map \rror_recovery\ to any state recognized by the webview's \matches\ logic (which expects \ctive\, \ctive.ready\, etc.). Consequently, the webview received an empty matches object and rendered nothing.

### Fix

1.  **Prevent State Transition on Error**: Modified \workItemsErrorRule\ (in \workItemRules.ts\) and \pplicationErrorRule\ (in \miscRules.ts\) to remove the transition to \rror_recovery\. The application now remains in the \ctive\ state even if an error occurs, allowing the UI to persist and display error messages via \lastError\.
2.  **Robust State Matching**: Updated \PraxisApplicationManager.getSnapshot\ to be more explicit about state matching, although the primary fix is preventing the transition.
