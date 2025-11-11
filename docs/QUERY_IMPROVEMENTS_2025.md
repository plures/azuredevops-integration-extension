# Work Item Query Improvements - November 2025

## Overview

This document describes improvements made to Azure DevOps work item queries to align with ADO defaults and prevent exceeding the 20,000 item limit.

## Problems Identified

### 1. "Recently Updated" Query Issues

- **Missing Project Filter**: Query was searching ALL projects in the organization, not just the current project
- **Missing Active Filter**: Query included completed/closed work items
- **Too Long Time Window**: 7 days could still exceed 20k items in very large projects
- **Poor Error Recovery**: Retry logic used 90 days, making the problem worse

### 2. Error Handling Issues

- Retry logic increased date window instead of decreasing it
- No helpful error messages when queries fail
- Missing project filter wasn't added during retry

## Solutions Implemented

### 1. Fixed "Recently Updated" Query

**Before:**

```wiql
SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType],
       [System.AssignedTo], [System.CreatedDate], [System.ChangedDate],
       [System.IterationPath], [System.Tags], [Microsoft.VSTS.Common.Priority]
FROM WorkItems
WHERE [System.ChangedDate] >= @Today - 7
AND [System.State] <> 'Removed'
ORDER BY [System.ChangedDate] DESC
```

**After:**

```wiql
SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType],
       [System.AssignedTo], [System.CreatedDate], [System.ChangedDate],
       [System.IterationPath], [System.Tags], [Microsoft.VSTS.Common.Priority]
FROM WorkItems
WHERE [System.TeamProject] = @Project
AND [System.ChangedDate] >= @Today - 3
AND [System.StateCategory] <> 'Completed' AND [System.State] <> 'Removed'
ORDER BY [System.ChangedDate] DESC
```

**Key Changes:**

- ✅ Added `[System.TeamProject] = @Project` filter to scope to current project
- ✅ Added active filter (`[System.StateCategory] <> 'Completed'`) to exclude completed items
- ✅ Reduced time window from 7 days to 3 days for better performance
- ✅ Aligns with Azure DevOps default "Recently Updated" query structure

### 2. Improved Error Retry Logic

**Before:**

- Retry used 90 days (worse than original)
- No project filter added during retry
- Generic error messages

**After:**

- Retry uses 1 day (most restrictive)
- Automatically adds project filter if missing for "Recently Updated" queries
- Replaces existing ChangedDate filter if present
- Provides helpful error message suggesting filters when retry still fails

**Retry Logic Flow:**

1. Original query fails with 20k limit error
2. Retry with 1-day window
3. If retry fails, throw helpful error message:
   > "Query 'Recently Updated' returns too many work items (>20,000). Try filtering by a specific area path, iteration, or work item type to narrow results."

### 3. Query Alignment with ADO Defaults

All queries now follow Azure DevOps default query patterns:

| Query            | Project Filter | Active Filter | Time Window | User Scope |
| ---------------- | -------------- | ------------- | ----------- | ---------- |
| My Activity      | ✅             | ✅            | N/A         | ✅ (@Me)   |
| Assigned to me   | ✅             | ✅            | N/A         | ✅ (@Me)   |
| Recently Updated | ✅             | ✅            | 3 days      | ❌         |
| All Active       | ✅             | ✅            | N/A         | ❌         |
| Current Sprint   | N/A\*          | ✅            | N/A         | ❌         |
| Created By Me    | ✅             | ✅            | N/A         | ✅ (@Me)   |

\*Current Sprint uses iteration path which is project-scoped

## Query Specifications

### My Activity

```wiql
SELECT [fields] FROM WorkItems
WHERE [System.TeamProject] = @Project
AND ([System.AssignedTo] = @Me OR [System.CreatedBy] = @Me OR [System.ChangedBy] = @Me)
AND [System.StateCategory] <> 'Completed' AND [System.State] <> 'Removed'
ORDER BY [System.ChangedDate] DESC
```

### Assigned to me / My Work Items

```wiql
SELECT [fields] FROM WorkItems
WHERE [System.TeamProject] = @Project
AND [System.AssignedTo] = @Me
AND [System.StateCategory] <> 'Completed' AND [System.State] <> 'Removed'
ORDER BY [System.ChangedDate] DESC
```

### Recently Updated

```wiql
SELECT [fields] FROM WorkItems
WHERE [System.TeamProject] = @Project
AND [System.ChangedDate] >= @Today - 3
AND [System.StateCategory] <> 'Completed' AND [System.State] <> 'Removed'
ORDER BY [System.ChangedDate] DESC
```

### All Active

```wiql
SELECT [fields] FROM WorkItems
WHERE [System.TeamProject] = @Project
AND [System.StateCategory] <> 'Completed' AND [System.State] <> 'Removed'
ORDER BY [System.ChangedDate] DESC
```

### Current Sprint

```wiql
SELECT [fields] FROM WorkItems
WHERE [System.IterationPath] UNDER @CurrentIteration
AND [System.StateCategory] <> 'Completed' AND [System.State] <> 'Removed'
ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.Id] ASC
```

### Created By Me

```wiql
SELECT [fields] FROM WorkItems
WHERE [System.TeamProject] = @Project
AND [System.CreatedBy] = @Me
AND [System.StateCategory] <> 'Completed' AND [System.State] <> 'Removed'
ORDER BY [System.ChangedDate] DESC
```

## Benefits

1. **Prevents 20k Limit Errors**: Project-scoped queries dramatically reduce result sets
2. **Better Performance**: Shorter time windows and active filters reduce query execution time
3. **Aligned with ADO**: Queries match Azure DevOps default query patterns
4. **Better UX**: Users see relevant, active work items only
5. **Improved Error Handling**: Helpful messages guide users when queries still fail

## Testing Recommendations

1. **Large Projects**: Test "Recently Updated" on projects with >10k work items
2. **Multi-Project Orgs**: Verify queries only return items from selected project
3. **Error Scenarios**: Test queries that would exceed 20k limit to verify retry logic
4. **Active Filter**: Verify completed items are excluded from all queries

## Future Enhancements

1. **Configurable Time Window**: Allow users to configure "Recently Updated" time window (1-7 days)
2. **Pagination Support**: Implement pagination for queries that might return many results
3. **Query Builder UI**: Allow users to build custom queries with visual filters
4. **Query Templates**: Pre-defined queries for common scenarios (e.g., "My Bugs", "High Priority")

## Related Documentation

- `docs/QUERY_LIMIT_FIX.md` - Previous query limit fixes
- `docs/ERROR_HANDLING_IMPROVEMENTS.md` - Error handling improvements
- Azure DevOps WIQL Documentation: https://learn.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax
