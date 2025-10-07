# Error Handling Improvements

## Overview

Enhanced error handling and reporting for work item query failures, specifically addressing 400 Bad Request errors from Azure DevOps APIs.

## Changes Made

### 1. **Better 400 Error Messages** (`src/azureClient.ts`)

Added specific handling for 400 Bad Request errors to extract and display the actual API error message:

```typescript
} else if (status === 400) {
  // 400 Bad Request - likely WIQL syntax or field name issue
  const apiError = err?.response?.data?.message || err?.response?.data?.value?.Message;
  if (apiError) {
    errorMessage = `Invalid query (400): ${apiError}`;
  } else {
    errorMessage = `Invalid query (400). The WIQL query may contain unsupported fields or syntax for this project.\nQuery name: "${query}"`;
  }
  // Log the actual WIQL that failed for debugging
  console.error('[azureDevOpsInt][GETWI][ERROR] WIQL that failed:', wiqlToSend || wiql);
}
```

**Benefits:**

- Shows the actual error message from Azure DevOps API
- Logs the failing WIQL query for debugging
- Helps identify field name or syntax issues specific to the project

### 2. **Clear Error Display** (`src/webview/svelte-main.ts`)

Modified the `workItemsError` handler to clear stale work items when an error occurs:

```typescript
case 'workItemsError': {
  initializing = false;
  loading = false;
  errorMsg = String(message?.error || 'Failed to load work items.');
  // Clear items when there's an error to avoid showing stale data
  lastWorkItems = [];
  recomputeItemsForView();
  syncApp();
  break;
}
```

**Before:** Error banner appeared but old items from previous query still displayed (confusing)  
**After:** Error banner appears with empty item list (clear indication of failure)

## Common 400 Error Causes

### 1. **Field Not Available in Project**

Some fields like `[System.StateCategory]` may not be available in older TFS/Azure DevOps Server versions or certain project templates.

**Solution:** The extension already has fallback logic to retry with legacy state filters.

### 2. **WIQL Syntax Issues**

The "Recently Updated" query uses:

```sql
SELECT [fields] FROM WorkItems
WHERE [System.ChangedDate] >= @Today - 14
AND [System.State] <> 'Removed'
ORDER BY [System.ChangedDate] DESC
```

Potential issues:

- `@Today - 14` syntax might not be supported in older TFS versions
- `[System.State] <> 'Removed'` - the 'Removed' state might not exist in this project

### 3. **Permission Issues**

The PAT might have "Work Items (Read)" permission but lack access to specific query features.

## Debugging 400 Errors

When you see a 400 error, check the Developer Tools console for:

1. **API Error Message:**

   ```
   [azureDevOpsInt][GETWI][ERROR] Response data: {"message":"Field 'System.StateCategory' does not exist..."}
   ```

2. **Failing WIQL Query:**

   ```
   [azureDevOpsInt][GETWI][ERROR] WIQL that failed: SELECT [System.Id], ...
   ```

3. **HTTP Response Details:**
   ```
   [azureDevOpsInt][GETWI][ERROR] HTTP status: 400
   [azureDevOpsInt][GETWI][ERROR] Response data: {...}
   ```

## User Impact

**Before:**

- Generic "Failed to fetch work items: Request failed with status code 400"
- Old work items still visible (confusing)
- No information about what caused the error

**After:**

- Specific error message from Azure DevOps API
- Clear empty state when query fails
- Logged WIQL query for debugging
- Query name displayed in error message

## Example Error Messages

### With API Error Details:

```
Invalid query (400): Field 'System.StateCategory' does not exist or is not supported for this project.
```

### Without API Details:

```
Invalid query (400). The WIQL query may contain unsupported fields or syntax for this project.
Query name: "Recently Updated"
```

## Next Steps

To further investigate the specific 400 error:

1. Reload VS Code to activate the new extension version
2. Try the "Recently Updated" query again
3. Open Developer Tools (Help → Toggle Developer Tools)
4. Check the Console tab for detailed error information
5. Look for the WIQL query that failed

The error message should now show:

- The exact API error from Azure DevOps
- Which query failed
- The WIQL syntax that was rejected
