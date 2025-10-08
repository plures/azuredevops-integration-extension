# On-Premises URL Parsing and Identity Fixes (v1.9.6)

## Problem Statement

On-premises Azure DevOps Server connections had multiple issues that prevented them from working correctly:

1. **Hardcoded Cloud URLs**: Manual entry flow hardcoded `https://dev.azure.com/...` for `apiBaseUrl`, breaking custom and on-premises instances
2. **Missing Identity**: On-premises servers don't resolve `@Me` in WIQL queries, requiring explicit user identity
3. **Optional Identity**: Identity was marked optional but is actually **required** for on-premises queries to work

## Root Cause Analysis

### Issue 1: Hardcoded apiBaseUrl in Manual Entry

**Location**: `src/setupWizard.ts` - `step1_ManualEntry()` function (line ~399)

**Problem**:

```typescript
// OLD CODE - WRONG
this.data.parsedUrl = {
  organization,
  project,
  baseUrl,
  apiBaseUrl: `https://dev.azure.com/${organization}/${project}/_apis`, // ❌ HARDCODED!
  isValid: true,
};
```

This broke:

- visualstudio.com URLs (legacy cloud)
- Custom domain cloud instances
- **On-premises servers** (completely broken)

**Fix**:

```typescript
// NEW CODE - CORRECT
// Determine apiBaseUrl based on the base URL type
let apiBaseUrl: string;
const lowerBase = baseUrl.toLowerCase();

if (lowerBase.includes('dev.azure.com')) {
  apiBaseUrl = `https://dev.azure.com/${organization}/${project}/_apis`;
} else if (lowerBase.includes('visualstudio.com')) {
  apiBaseUrl = `https://dev.azure.com/${organization}/${project}/_apis`;
} else {
  // On-premises or custom: {baseUrl}/{org}/{project}/_apis
  apiBaseUrl = `${baseUrl.replace(/\/$/, '')}/${organization}/${project}/_apis`;
  console.log('[SetupWizard] Manual entry - On-premises API URL:', apiBaseUrl);
}
```

Now correctly generates:

- Cloud: `https://dev.azure.com/org/project/_apis`
- On-Prem: `https://vstfdt.corp.microsoft.com/tfs/One/_apis`

### Issue 2: Missing Identity Prompting

**Location**: `src/setupWizard.ts` - `step3_PATSetup()` function (after PAT entry)

**Problem**:
On-premises Azure DevOps Server often fails to resolve `@Me` in WIQL queries. Queries like:

```sql
SELECT [System.Id], [System.Title]
FROM WorkItems
WHERE [System.AssignedTo] = @Me
```

return **no results** even when the user has assigned work items.

The deprecated `_promptAddConnection_DEPRECATED()` function had identity prompting, but SetupWizard did not.

**Why @Me Fails on On-Premises**:

1. On-premises uses Windows Authentication or LDAP
2. User identity format: `DOMAIN\username` or `user@contoso.com`
3. Azure DevOps Server may not correctly map PAT authentication to the user's Windows identity
4. The API provides the identity in responses, but WIQL `@Me` resolution can fail

**Fix**: Added identity prompting after PAT entry, **required** for on-premises:

```typescript
// For on-premises servers, prompt for identity name (required for @Me queries)
const isOnPrem =
  this.data.parsedUrl?.baseUrl &&
  !this.data.parsedUrl.baseUrl.includes('dev.azure.com') &&
  !this.data.parsedUrl.baseUrl.includes('visualstudio.com');

if (isOnPrem) {
  console.log('[SetupWizard] On-premises detected, prompting for identity name');

  // Generate a default identity based on environment variables
  let defaultIdentity = '';
  if (process.env.USERDOMAIN && process.env.USERNAME) {
    // Windows: DOMAIN\username
    defaultIdentity = `${process.env.USERDOMAIN}\\${process.env.USERNAME}`;
  } else if (process.env.USER) {
    // Linux/Mac: username
    defaultIdentity = process.env.USER;
  }

  const identityName = await vscode.window.showInputBox({
    prompt: 'Enter your identity for Azure DevOps Server (required for @Me queries)',
    placeHolder: 'e.g. DOMAIN\\username or user@contoso.com',
    value: defaultIdentity, // Pre-fill with detected identity
    validateInput: (value) => {
      if (!value || !value.trim()) {
        return 'Identity name is required for on-premises Azure DevOps Server. This is used to resolve @Me in work item queries.';
      }
      return null;
    },
    ignoreFocusOut: true,
  });

  if (!identityName || !identityName.trim()) {
    vscode.window.showErrorMessage(
      'Identity name is required for on-premises connections. Setup cannot continue without it.'
    );
    return false;
  }

  this.data.identityName = identityName.trim();
  console.log('[SetupWizard] Identity name configured for on-premises');
}
```

### Issue 3: Identity Name Data Flow

**Problem**: Even when identity was collected (in deprecated function), it wasn't always passed through correctly.

**Fixed Data Flow**:

1. **WizardData Interface** (line 26):

```typescript
export interface SetupWizardData {
  // ... other fields
  identityName?: string; // User identity for on-premises @Me substitution (required for on-prem)
}
```

2. **StoredConnection Interface** (line 50):

```typescript
export interface StoredConnection {
  // ... other fields
  identityName?: string; // User identity for on-premises @Me substitution (required for on-prem)
}
```

3. **Connection Object Creation** in `completeSetup()` (line 943):

```typescript
const connection: StoredConnection = {
  id: connectionId,
  organization: this.data.parsedUrl.organization,
  project: this.data.parsedUrl.project,
  label: this.data.label,
  team: this.data.team,
  baseUrl: this.data.parsedUrl.baseUrl,
  apiBaseUrl: this.data.parsedUrl.apiBaseUrl,
  authMethod: this.data.authMethod || 'pat',
  identityName: this.data.identityName, // ✅ Now passed through
};
```

4. **AzureDevOpsIntClient** receives identity:

```typescript
const client = new AzureDevOpsIntClient(connection.organization, connection.project, pat, {
  apiBaseUrl: connection.apiBaseUrl,
  identityName: connection.identityName, // Used for @Me fallback
  // ... other options
});
```

## Environment Variable Detection

**Windows**:

```typescript
if (process.env.USERDOMAIN && process.env.USERNAME) {
  defaultIdentity = `${process.env.USERDOMAIN}\\${process.env.USERNAME}`;
  // Example: "CONTOSO\jsmith"
}
```

**Linux/Mac**:

```typescript
if (process.env.USER) {
  defaultIdentity = process.env.USER;
  // Example: "jsmith"
}
```

The user can override the detected identity if it's not correct for their Azure DevOps Server.

## How Identity is Used

In `src/azureClient.ts`, when fetching the authenticated user identity:

```typescript
// If we still don't have a uniqueName and identityName was provided (for on-prem),
// use identityName as the fallback uniqueName
if (!this.cachedIdentity.uniqueName && this.identityName) {
  console.log('[AzureClient][DEBUG] using provided identityName as fallback:', this.identityName);
  this.cachedIdentity.uniqueName = this.identityName;
}
```

This ensures queries with `@Me` are rewritten to use the actual identity string.

## Testing Checklist

### On-Premises Connection Setup

- [ ] Start SetupWizard
- [ ] Choose "Enter manually" (or paste work item URL)
- [ ] Select "Custom" for base URL type
- [ ] Enter on-premises base URL (e.g., `https://vstfdt.corp.microsoft.com/tfs`)
- [ ] Enter organization/collection (e.g., `tfs`)
- [ ] Enter project (e.g., `One`)
- [ ] Verify it detects as on-premises (message: "Azure DevOps Server (On-Premises) Detected")
- [ ] Enter PAT
- [ ] **Verify identity prompt appears** with pre-filled value
- [ ] Verify identity is required (can't skip or leave blank)
- [ ] Complete setup

### Verify Connection Saved Correctly

Check settings.json for:

```json
{
  "azureDevOpsIntegration.connections": [
    {
      "id": "...",
      "organization": "tfs",
      "project": "One",
      "baseUrl": "https://vstfdt.corp.microsoft.com/tfs",
      "apiBaseUrl": "https://vstfdt.corp.microsoft.com/tfs/One/_apis", // ✅ Must be present
      "authMethod": "pat",
      "patKey": "...",
      "identityName": "DOMAIN\\username" // ✅ Must be present for on-prem
    }
  ]
}
```

### Verify Queries Work

- [ ] Connection appears in work items webview
- [ ] Can load work items
- [ ] Queries with `@Me` return results
- [ ] Can create work items
- [ ] Can update work items

## Differences: Cloud vs On-Premises

### Cloud (dev.azure.com)

**apiBaseUrl**: `https://dev.azure.com/{org}/{project}/_apis`
**Identity**: Resolved by Azure DevOps cloud, `@Me` works automatically
**Authentication**: PAT or Entra ID (OAuth 2.0)

### On-Premises (Azure DevOps Server)

**apiBaseUrl**: `{protocol}://{host}/{collection}/{project}/_apis`
**Identity**: Must be explicitly provided (domain\username or email)
**Authentication**: PAT only (Entra ID not supported)

## Summary of Changes

### Files Modified

1. **src/setupWizard.ts**:
   - Fixed `step1_ManualEntry()` to generate correct `apiBaseUrl` for all instance types
   - Added identity prompting in `step3_PATSetup()` for on-premises
   - Added `identityName` to `SetupWizardData` interface
   - Added `identityName` to `StoredConnection` interface
   - Updated `completeSetup()` to pass `identityName` to connection object
   - Added environment variable detection (USERDOMAIN\USERNAME or USER)

2. **CHANGELOG.md**:
   - Documented all fixes in v1.9.6 section

3. **docs/CODE_CLEANUP_REDUNDANT_SETUP_PATHS.md**:
   - Updated status of fixes

### Lines of Code Changed

- Manual entry: ~10 lines added (apiBaseUrl logic)
- Identity prompting: ~40 lines added (detection + prompt + validation)
- Interface updates: 2 fields added
- Connection object: 1 field added

## Related Issues Fixed

This also fixes the previous issue where:

- `apiBaseUrl` was missing from connections (fixed in earlier commit)
- Manual entry was broken for all non-cloud instances

Now **both** URL parsing paths (work item URL + manual entry) generate correct `apiBaseUrl` and identity.

## Migration Notes

**Existing Connections**:
Users with existing on-premises connections that are missing `identityName` may need to:

1. Edit the connection in VS Code settings.json
2. Add `"identityName": "DOMAIN\\username"` field
3. Or re-create the connection through SetupWizard

**Future Enhancement**:
Consider adding migration logic in activation.ts to detect on-premises connections missing identity and prompt the user to update them.
