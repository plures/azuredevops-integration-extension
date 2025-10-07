# Debugging On-Prem Identity Resolution

## Current Status

### What's Working ✅

- PAT authentication succeeds
- Simple queries work ("Recently Updated" returns work item #2951)
- Query execution completes without network errors
- Connection switching clears auth reminders properly

### What's Not Working ❌

1. **Loading state never displays** - Queries complete but UI doesn't show "loading..." state
2. **User ID shows as "unknown"** - Identity resolution not returning usable data
3. **@Me-based queries return 0 items** - "My Activity" and "Assigned to me" return empty results

## Key Diagnostic Findings

From the logs:

```
[DIAGNOSIS] ✅ Authentication successful. User ID: unknown
[DIAGNOSIS] ✅ Simple query returned 1 work items
[DIAGNOSIS] ✅ "My Activity" returned 0 work items
[DIAGNOSIS] ✅ "Assigned to me" returned 0 work items
```

**Insight**: Queries execute successfully but return 0 items. This means:

- The TFS server is reachable (no network error)
- PAT authentication works (401 would fail the query)
- The @Me macro isn't being replaced OR is being replaced with an identity the TFS server doesn't recognize

## Missing Log Evidence

The following debug logs are **NOT** appearing in the output, which suggests the identity resolution or @Me replacement isn't happening:

```typescript
// These logs should appear but don't:
'[AzureClient] Configured with fallback identityName for on-prem: ...';
'[AzureClient][DEBUG] resolved identity object: ...';
'[azureDevOpsInt][GETWI] Replacing @Me with explicit identity for compatibility: ...';
```

## Recent Changes (Enhanced Logging)

Added logging to track the `identityName` flow:

1. **In `src/activation.ts`** (`ensureActiveConnection`):
   - Log `hasIdentityName` and `identityName` when using connection
   - Log client options being passed including `identityName`

2. **In `src/azureClient.ts`** (constructor):
   - Log when `identityName` is configured
   - This will confirm whether the option is actually reaching the client

## Testing Instructions

1. **Reload VS Code** to load the new compiled extension with enhanced logging

2. **Check for new log entries**:

   ```
   [ensureActiveConnection] using connection {..., "hasIdentityName": true, "identityName": "..."}
   [ensureActiveConnection] creating client with options {"hasIdentityName": true, "identityName": "..."}
   [AzureClient] Configured with fallback identityName for on-prem: ...
   ```

3. **Run a query** and look for @Me replacement logs:

   ```
   [azureDevOpsInt][GETWI] Replacing @Me with explicit identity for compatibility: ...
   ```

4. **Run the diagnostic command** and paste the full output

## Expected Behavior

When `identityName` is properly configured and used:

1. Connection logs should show:

   ```json
   {
     "id": "...",
     "organization": "tfs",
     "project": "CEDialtone",
     "authMethod": "pat",
     "hasIdentityName": true,
     "identityName": "domain\\username" // or user@contoso.com
   }
   ```

2. Client constructor should log:

   ```
   [AzureClient] Configured with fallback identityName for on-prem: domain\username
   ```

3. When running "My Activity" query, logs should show:

   ```
   [azureDevOpsInt][GETWI] Fetching work items with query: SELECT ... WHERE ... AND ([System.AssignedTo] = @Me ...
   [AzureClient][DEBUG] resolved identity object: {"uniqueName":"domain\\username",...}
   [azureDevOpsInt][GETWI] Replacing @Me with explicit identity for compatibility: domain\username
   ```

4. Diagnostic should show:
   ```
   [DIAGNOSIS] ✅ Authentication successful. User ID: domain\username
   ```

## Troubleshooting Steps

### If `identityName` is NOT in the logs

**Problem**: The connection config doesn't have `identityName` stored.

**Solution**: Delete the connection and recreate it through the setup wizard. The wizard should prompt for username/email when it detects an on-prem URL.

### If `identityName` IS in logs but @Me replacement doesn't happen

**Problem**: Identity resolution is failing or cached with wrong data.

**Solution**:

1. Check for error logs in `_getAuthenticatedIdentity()`
2. Clear the identity cache by reloading VS Code
3. Verify the `identityName` format matches what TFS expects (try both formats):
   - `domain\username`
   - `user@domain.com`

### If @Me replacement happens but still returns 0 items

**Problem**: The TFS server doesn't recognize the identity string, or the identity isn't assigned to/hasn't created any work items.

**Solution**:

1. **Verify the identity in TFS**:
   - Open work item #2951 in browser
   - Check the "Assigned To" field value
   - Compare exact format with what we're using
2. **Test with explicit WIQL**:
   Run diagnostic with a custom query:

   ```sql
   SELECT [System.Id] FROM WorkItems
   WHERE [System.AssignedTo] = 'exact-value-from-work-item'
   ```

3. **Check TFS identity fields**:
   Different TFS versions use different identity formats:
   - Display name: `John Doe`
   - Unique name: `domain\jdoe`
   - Email: `jdoe@contoso.com`
   - Full format: `John Doe <domain\jdoe>`

## Loading State Issue

Separately from identity resolution, the loading state not appearing suggests the webview's `loading` flag isn't being set correctly. This needs investigation in `src/webview/svelte-main.ts`.

### Quick Check

Look for this in the webview console logs:

```javascript
loading = true; // Should appear when connection switches or query starts
```

If not present, the `connectionsUpdate` or `workItemsLoaded` handlers may need adjustment.

## Next Actions

1. ✅ Compile with enhanced logging
2. 🔄 Reload VS Code to test
3. 📋 Run diagnostic and share full logs
4. 🔍 Check connection config for `identityName`
5. 🔧 If missing, recreate connection via setup wizard
6. 🎯 Verify @Me replacement logs appear
7. 🔍 Compare identity format with TFS work item field
