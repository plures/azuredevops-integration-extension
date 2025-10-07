# Manual On-Premises Setup & API URL Override

## Overview

This extension now supports simplified work item URL parsing and manual on-premises Azure DevOps Server setup with API URL override capabilities.

## Features Added

### 1. Simplified Work Item URL Parsing

When you provide a work item URL, the extension now uses a simpler, more reliable approach:

**How it works:**

- Finds the `_workitems` segment in the URL
- Extracts the project name (segment immediately before `_workitems`)
- Builds API URL: everything up to project + `/_apis`

**Benefits:**

- ✅ Works universally for cloud and on-premises
- ✅ No need to understand collection/org/project structure
- ✅ More reliable - based on actual URL structure, not assumptions
- ✅ Future-proof - works with any Azure DevOps URL format

**Example:**

```typescript
Input: https://tfs.contoso.com/DefaultCollection/Engineering/MyProject/_workitems/edit/123

Extracted:
  - Project: MyProject
  - API URL: https://tfs.contoso.com/DefaultCollection/Engineering/MyProject/_apis
  - Organization: DefaultCollection (first segment)
```

### 2. Manual On-Premises Setup

New guided setup flow for on-premises Azure DevOps Server when you don't have a work item URL.

**Setup Steps:**

1. Select "Enter organization & project manually"
2. Choose "Azure DevOps Server (On-Premises/TFS)"
3. Provide:
   - **Server URL**: `https://tfs.contoso.com`
   - **Collection**: `DefaultCollection`
   - **Project**: `MyProject`

**Result:**

- Base URL: `https://tfs.contoso.com/DefaultCollection`
- API URL: `https://tfs.contoso.com/DefaultCollection/MyProject/_apis`
- Organization: `DefaultCollection`

### 3. API URL Override

Users can now manually override the derived API URL in VS Code settings if automatic detection fails.

**How to use:**

1. Open VS Code Settings (JSON)
2. Find your connection in `azureDevOpsIntegration.connections`
3. Add `apiBaseUrl` field:

```json
{
  "id": "abc-123",
  "organization": "DefaultCollection",
  "project": "MyProject",
  "baseUrl": "https://tfs.contoso.com/DefaultCollection",
  "apiBaseUrl": "https://tfs.contoso.com/DefaultCollection/MyProject/_apis"
}
```

**Priority Order:**

1. **Manual override** (`apiBaseUrl` in settings) - highest priority
2. **Derived from work item URL parsing**
3. **Derived from baseUrl + organization + project**
4. **Default cloud** (`https://dev.azure.com`)

## Configuration

### New Connection Properties

#### `apiBaseUrl` (optional)

```json
{
  "type": "string",
  "description": "API base URL override (optional). If not specified, will be derived from baseUrl/organization/project. Format: {baseUrl}/{project}/_apis"
}
```

#### `identityName` (optional)

```json
{
  "type": "string",
  "description": "Optional identity name for on-prem servers where @Me may not resolve (email, domain\\user, etc.)"
}
```

## Implementation Details

### ProjectConnection Type

```typescript
type ProjectConnection = {
  id: string;
  organization: string;
  project: string;
  label?: string;
  team?: string;
  authMethod?: AuthMethod;
  patKey?: string;
  baseUrl?: string;
  apiBaseUrl?: string; // NEW: Manual API URL override
  identityName?: string;
  tenantId?: string;
  clientId?: string;
};
```

### AzureClient Priority Logic

```typescript
// Priority: manual apiBaseUrl override > derived from baseUrl > default cloud
if (options.apiBaseUrl) {
  // Manual API URL override - use as-is
  this.apiBaseUrl = options.apiBaseUrl.replace(/\/$/, '');
  this.baseUrl = options.baseUrl || `https://dev.azure.com/${organization}`;
} else if (options.baseUrl) {
  // Derive from baseUrl (cloud or on-prem)
  // ...
} else {
  // Default to cloud
  this.baseUrl = `https://dev.azure.com/${organization}`;
  this.apiBaseUrl = `https://dev.azure.com/${organization}/${project}/_apis`;
}
```

## Use Cases

### Use Case 1: Work Item URL (Recommended)

**User provides:**

```
https://tfs.contoso.com/tfs/Engineering/MyProject/_workitems/edit/456
```

**Extension automatically detects:**

- Project: `MyProject`
- API URL: `https://tfs.contoso.com/tfs/Engineering/MyProject/_apis`
- Organization: `tfs`

**User action:** None - works automatically!

### Use Case 2: Manual On-Prem Setup

**User provides (via prompts):**

- Server URL: `https://azuredevops.contoso.com`
- Collection: `DefaultCollection`
- Project: `WebApp`

**Extension derives:**

- Base URL: `https://azuredevops.contoso.com/DefaultCollection`
- API URL: `https://azuredevops.contoso.com/DefaultCollection/WebApp/_apis`
- Organization: `DefaultCollection`

### Use Case 3: Custom API URL Structure

**User has non-standard setup:**

- Base URL: `https://devops.contoso.com/custom-path`
- Project: `MyProject`
- API URL should be: `https://devops.contoso.com/api/MyProject/_apis`

**Solution:**

1. Setup connection normally
2. Edit settings JSON
3. Add: `"apiBaseUrl": "https://devops.contoso.com/api/MyProject/_apis"`

## Testing

### Test Scenarios

**Work Item URL Parsing:**

```typescript
✅ Cloud: https://dev.azure.com/org/project/_workitems/edit/123
✅ On-prem 2-segment: https://server/collection/project/_workitems/edit/123
✅ On-prem 3-segment: https://server/collection/org/project/_workitems/edit/123
```

**Manual On-Prem Setup:**

```typescript
✅ Server + Collection + Project → Correct API URL
✅ Identity name prompt for on-prem
✅ Settings saved correctly
```

**API URL Override:**

```typescript
✅ Manual override takes precedence
✅ Can edit in settings JSON
✅ Logged to console for debugging
```

## Troubleshooting

### Issue: API calls failing with 404

**Solution:** Check the API URL in console logs:

```
[AzureClient] Using manual API URL override: { apiBaseUrl: '...' }
```

Verify the URL is correct and manually override in settings if needed.

### Issue: @Me not resolving in queries

**Solution:** Provide `identityName` in connection settings:

```json
{
  "identityName": "domain\\username"
}
```

### Issue: Unsure what API URL to use

**Solution:**

1. Open any work item in browser
2. Copy the full URL
3. Use "Provide a work item URL" during setup
4. Extension will automatically extract the correct API URL

## Migration Notes

### Existing Connections

- ✅ No breaking changes - existing connections continue to work
- ✅ `apiBaseUrl` is optional - defaults to derived URL
- ✅ Can add `apiBaseUrl` override to any connection at any time

### Upgrading

- ✅ No user action required
- ✅ New features available immediately
- ✅ Backward compatible with all existing configurations

## Related Files

- `src/activation.ts` - Connection setup and client initialization
- `src/azureClient.ts` - API URL priority logic
- `src/azureDevOpsUrlParser.ts` - Work item URL parsing
- `package.json` - Configuration schema
- `docs/ON_PREM_URL_FIX.md` - Collection/org/project parsing details
