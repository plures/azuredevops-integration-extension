# Query Limit Fix - Recently Updated

## Problem

The "Recently Updated" query was returning too many work items, causing either:

1. **20,000 item limit exceeded** - When the date range returned more than 20,000 items:

   ```
   VS402337: The number of work items returned exceeds the size limit of 20000
   ```

2. **WIQL syntax errors** - When attempting to use SQL TOP keyword (not supported in WIQL):
   ```
   TF51006: The query statement is missing a FROM clause. The error is caused by «5000».
   ```

## Root Cause

- Original query used a 14-day window: `WHERE [System.ChangedDate] >= @Today - 14`
- In large projects, this could match >20,000 items
- WIQL (Work Item Query Language) does NOT support SQL `TOP` keyword
- Azure DevOps enforces a hard limit of 20,000 work items per query

## Solution

**Two-part fix:**

1. **Reduced date range**: Changed from 14 days → 7 days to naturally limit results

   ```sql
   WHERE [System.ChangedDate] >= @Today - 7
   ```

2. **Added API $top parameter**: Hard limit of 100 items via query parameter
   ```typescript
   const wiqlEndpoint = needsLimit
     ? '/wit/wiql?api-version=7.0&$top=100'
     : '/wit/wiql?api-version=7.0';
   ```

This applies to:

- "Recently Updated" query
- "All Active" query

## Why This Works

- **Date range reduction**: Fewer items match the query criteria
- **API $top parameter**: Azure DevOps API supports `$top` in the URL (unlike WIQL TOP keyword)
- **Hard limit of 100**: Ensures query never exceeds limits while providing recent/relevant items
- **Performance benefit**: Faster queries, less data transfer, better UI responsiveness

## Why 7 Days Instead of 14?

- **Azure DevOps Limit:** 20,000 items maximum per query
- **Large Projects:** Some projects have >20,000 changes in 14 days
- **Practical Balance:** 7 days covers recent activity while staying under limits
- **Still Comprehensive:** Most users focus on recent work (last week)
- **Performance:** Fewer items = faster query and UI rendering

## User Impact

**Before:**

- ❌ "Recently Updated" failed with 400 error (>20,000 items in 14 days)
- ❌ No work items displayed
- ❌ Confusing error message

**After:**

- ✅ "Recently Updated" shows items from last 7 days
- ✅ Works for large projects
- ✅ Clear error messages if other issues occur

## Other Queries Not Affected

These queries typically return smaller result sets and don't need date range adjustments:

- **My Activity** - Only items you're involved with
- **Assigned to me** - Only items assigned to you
- **Current Sprint** - Limited to current iteration
- **Mentioned** - Only items where you're mentioned
- **Following** - Only items you're following

## Testing

Reload VS Code and try "Recently Updated" again. You should now see:

- ✅ Work items from the last 7 days
- ✅ No error (unless project has >20,000 changes in 7 days)
- ✅ Fast loading

## Future Considerations

If 7 days is too restrictive for some workflows, we can:

1. **Add pagination** - Fetch older items on demand
2. **Add date range filter** - Let users specify custom time range (e.g., "Last 3 days", "Last 30 days")
3. **Make time range configurable** - Add setting for default date range
4. **Add warning badge** - Show when results might be incomplete due to 20K limit

## WIQL Limitations Discovered

**WIQL does NOT support:**

- `SELECT TOP N` syntax (causes parsing error)
- Standard SQL limiting clauses

**To limit results in WIQL, you must:**

- Use smaller date ranges (`@Today - N` with smaller N)
- Add more specific WHERE conditions
- Use the API's `$top` query parameter (not implemented yet)

## Related Improvements

This fix was discovered thanks to the enhanced error handling added in v1.9.5:

- **Better 400 error messages** - Extract actual API error message
- **Clear error display** - Clear stale items when error occurs
- **Debug logging** - Log failing WIQL query for troubleshooting

See `docs/ERROR_HANDLING_IMPROVEMENTS.md` for details.
