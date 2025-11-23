# Connection View Isolation Fix

## Issue

The user reported that when a connection is selected, information relevant to other connections (or global state) was being displayed. This indicated that the components were not correctly filtering items based on the selected connection, or were consuming global state instead of scoped state.

## Root Cause

1.  **Priority of Data Sources**: `WorkItemList.svelte` and `KanbanBoard.svelte` were prioritizing `context.workItems` (global state) over `context.pendingWorkItems.workItems` (scoped state passed by `ConnectionView`).
2.  **Missing Context Injection**: `ConnectionView.svelte` was passing the raw `context` to `KanbanBoard`, instead of the `contextWithWorkItems` which contains the scoped `pendingWorkItems`.

## Fix

1.  **WorkItemList.svelte**: Changed the derivation of `allWorkItems` to prioritize `context.pendingWorkItems.workItems`.
    ```typescript
    const allWorkItems = $derived(context?.pendingWorkItems?.workItems || context?.workItems || []);
    ```
2.  **KanbanBoard.svelte**: Changed the derivation of `allWorkItems` to prioritize `context.pendingWorkItems.workItems`.
    ```typescript
    const allWorkItems = $derived(context?.pendingWorkItems?.workItems || context?.workItems || []);
    ```
3.  **ConnectionView.svelte**:
    - Updated `KanbanBoard` instantiation to use `contextWithWorkItems`.
    - Moved `{@const contextWithWorkItems = ...}` to be a direct child of `{#if isActive}` to comply with Svelte 5 rules.

## Verification

- **Code Analysis**: Confirmed that `ConnectionView` correctly constructs `pendingWorkItems` with connection-specific items. Confirmed that child components now use this scoped data.
- **Build**: `npm run build` passed successfully.

## Impact

This ensures that each connection tab in the webview is isolated and only displays work items belonging to that connection.
