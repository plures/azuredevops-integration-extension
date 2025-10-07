# CRITICAL FIX: TFS URL Parsing Corrected

## The Problem

The extension was parsing TFS URLs **incorrectly**, treating the 3-segment structure as 2-segment:

### Incorrect Parsing (BEFORE)

```
URL: https://vstfdt.corp.microsoft.com/tfs/CEDialtone/One/_workitems/edit/2951

Parsed as:
- organization = "tfs"         ❌ WRONG (this is the collection!)
- project = "CEDialtone"       ❌ WRONG (this is the org!)
- IGNORED "One"                ❌ WRONG (this is the actual project!)

API URL constructed: https://vstfdt.corp.microsoft.com/tfs/CEDialtone/_apis
                                                            ^^^  ^^^^^^^^^
                                                         collection  project (WRONG!)
```

### Correct Parsing (AFTER FIX)

```
URL: https://vstfdt.corp.microsoft.com/tfs/CEDialtone/One/_workitems/edit/2951

Parsed as:
- collection = "tfs"           ✅ CORRECT
- organization = "CEDialtone"  ✅ CORRECT
- project = "One"              ✅ CORRECT

API URL constructed: https://vstfdt.corp.microsoft.com/tfs/CEDialtone/One/_apis
                                                            ^^^  ^^^^^^^^^  ^^^
                                                         collection   org    project
```

## What Was Fixed

### 1. URL Parser (`src/azureDevOpsUrlParser.ts`)

**Before:**

- Only looked at first 2 path segments
- Treated segment[0] as organization, segment[1] as project
- Ignored segment[2] entirely

**After:**

- Looks for 3 segments for full TFS format: `collection/org/project`
- Falls back to 2 segments for simplified format: `collection/project`
- Logs the parsed structure for debugging

### 2. API URL Builder (`src/azureDevOpsUrlParser.ts`)

**Before:**

```typescript
return `${trimmedBase}/${project}/_apis`;
// Result: https://vstfdt.corp.microsoft.com/tfs/CEDialtone/_apis ❌
```

**After:**

```typescript
return `${trimmedBase}/${organization}/${project}/_apis`;
// Result: https://vstfdt.corp.microsoft.com/tfs/CEDialtone/One/_apis ✅
```

### 3. Azure Client Constructor (`src/azureClient.ts`)

**Before:**

```typescript
this.apiBaseUrl = `${trimmedBase}/${project}/_apis`;
```

**After:**

```typescript
this.apiBaseUrl = `${trimmedBase}/${organization}/${project}/_apis`;
console.log('[AzureClient] On-prem configuration:', {
  baseUrl: this.baseUrl,
  organization,
  project,
  apiBaseUrl: this.apiBaseUrl,
});
```

### 4. Enhanced Logging (`src/activation.ts`)

Added comprehensive logging when loading connections:

```typescript
verbose('[ensureActiveConnection] using connection', {
  id: connection.id,
  organization: connection.organization,
  project: connection.project,
  baseUrl: connection.baseUrl,
  authMethod: connection.authMethod || 'pat',
  hasIdentityName: !!connection.identityName,
  identityName: connection.identityName,
});
```

## Why This Broke Everything

The extension was trying to connect to the **wrong API endpoint**:

- Attempted: `https://vstfdt.corp.microsoft.com/tfs/CEDialtone/_apis`
- Actual: `https://vstfdt.corp.microsoft.com/tfs/CEDialtone/One/_apis`

This explains why:

- ❌ ALL queries failed (not just @Me queries)
- ❌ "Recently Updated" stopped working (it was never an identity issue!)
- ❌ Network errors occurred (wrong API path = 404 or similar)

## Critical Action Required

**⚠️ YOU MUST DELETE AND RECREATE THE CONNECTION ⚠️**

The existing connection was created with the wrong org/project values stored in VS Code settings. Simply reloading won't fix it because the stored configuration is wrong.

### Steps to Fix

1. **Delete the TFS connection**:
   - Open Command Palette (Ctrl+Shift+P)
   - Run: `Azure DevOps: Remove Project Connection`
   - Select the TFS/OnPrem connection

2. **Reload VS Code** to load the fixed extension

3. **Recreate the connection** using the setup wizard:
   - Open Command Palette
   - Run: `Azure DevOps: Add Project Connection`
   - When prompted for URL, provide the **full work item URL**:
     ```
     https://vstfdt.corp.microsoft.com/tfs/CEDialtone/One/_workitems/edit/2951
     ```
   - The parser will now correctly extract:
     - Collection: `tfs`
     - Organization: `CEDialtone`
     - Project: `One`
     - baseUrl: `https://vstfdt.corp.microsoft.com/tfs`

4. **Check the logs** to verify correct parsing:

   ```
   [parseAzureDevOpsUrl] Parsed on-prem URL (3-segment): {
     collection: "tfs",
     organization: "CEDialtone",
     project: "One",
     baseUrl: "https://vstfdt.corp.microsoft.com/tfs"
   }
   ```

5. **Verify API URL construction**:

   ```
   [buildApiBaseUrl] On-prem API URL: https://vstfdt.corp.microsoft.com/tfs/CEDialtone/One/_apis
   [AzureClient] On-prem configuration: {
     baseUrl: "https://vstfdt.corp.microsoft.com/tfs",
     organization: "CEDialtone",
     project: "One",
     apiBaseUrl: "https://vstfdt.corp.microsoft.com/tfs/CEDialtone/One/_apis"
   }
   ```

6. **Test queries**:
   - "Recently Updated" should now return work item #2951
   - "All Active" should work
   - @Me queries will work once identity is resolved

## Expected Results

After recreating the connection with the correct URL structure:

✅ Network connectivity will work (correct API endpoint)
✅ "Recently Updated" will return work items
✅ Simple queries will work
✅ API calls will succeed

Then we can address the identity resolution for @Me-based queries separately.

## Technical Details: TFS URL Structure

### Azure DevOps Services (Cloud)

```
Format: https://dev.azure.com/{organization}/{project}
API:    https://dev.azure.com/{organization}/{project}/_apis
```

### Azure DevOps Server (On-Premises) - Full Format

```
Format: https://{server}/{collection}/{organization}/{project}
API:    https://{server}/{collection}/{organization}/{project}/_apis

Example:
Format: https://vstfdt.corp.microsoft.com/tfs/CEDialtone/One
API:    https://vstfdt.corp.microsoft.com/tfs/CEDialtone/One/_apis
```

### Azure DevOps Server (On-Premises) - Simplified Format

```
Format: https://{server}/{collection}/{project}
API:    https://{server}/{collection}/{project}/_apis

Example:
Format: https://myserver.com/DefaultCollection/MyProject
API:    https://myserver.com/DefaultCollection/MyProject/_apis
```

The parser now handles **both** formats correctly.

## Files Changed

1. `src/azureDevOpsUrlParser.ts` - Fixed URL parsing logic and API URL construction
2. `src/azureClient.ts` - Fixed API base URL construction in constructor
3. `src/activation.ts` - Added comprehensive connection logging
4. `src/webview/svelte-main.ts` - Reordered state application (not related to this bug)

## Next Steps

1. Delete the existing TFS connection
2. Reload VS Code
3. Recreate the connection with the full work item URL
4. Verify logs show correct parsing
5. Test queries
6. Share logs if still having issues
