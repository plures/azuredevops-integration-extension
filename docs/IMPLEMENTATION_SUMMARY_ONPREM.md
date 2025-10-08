# On-Premises Connection Fixes - Implementation Summary

## Changes Made (v1.9.6)

### 1. Fixed Hardcoded apiBaseUrl in Manual Entry

**File**: `src/setupWizard.ts`
**Function**: `step1_ManualEntry()` (line ~388)

**Problem**:

- Manual entry hardcoded `apiBaseUrl` as `https://dev.azure.com/${organization}/${project}/_apis`
- Broke visualstudio.com, custom, and **all on-premises** instances

**Solution**:

- Added logic to generate correct `apiBaseUrl` based on baseUrl type:
  - dev.azure.com → `https://dev.azure.com/{org}/{project}/_apis`
  - visualstudio.com → `https://dev.azure.com/{org}/{project}/_apis`
  - On-prem/custom → `{baseUrl}/{org}/{project}/_apis`

### 2. Added Required Identity Prompting for On-Premises

**File**: `src/setupWizard.ts`
**Function**: `step3_PATSetup()` (after PAT entry)

**Problem**:

- On-premises servers don't resolve `@Me` in WIQL queries correctly
- Queries like `WHERE [System.AssignedTo] = @Me` return no results
- Old deprecated function had identity prompt, but SetupWizard didn't

**Solution**:

- Detect on-premises (not dev.azure.com/visualstudio.com)
- Auto-generate default identity from environment:
  - Windows: `process.env.USERDOMAIN\process.env.USERNAME`
  - Linux/Mac: `process.env.USER`
- Prompt user for identity (pre-filled with default)
- **Make it required** - validation prevents empty value
- Store in `this.data.identityName`

### 3. Updated Data Interfaces

**File**: `src/setupWizard.ts`

**SetupWizardData Interface** (line 26):

```typescript
identityName?: string; // User identity for on-premises @Me substitution (required for on-prem)
```

**StoredConnection Interface** (line 50):

```typescript
identityName?: string; // User identity for on-premises @Me substitution (required for on-prem)
```

### 4. Pass Identity Through to Connection Object

**File**: `src/setupWizard.ts`
**Function**: `completeSetup()` (line ~943)

**Change**:

```typescript
const connection: StoredConnection = {
  // ... other fields
  identityName: this.data.identityName, // ✅ NOW ADDED
};
```

## What This Fixes

### Before (Broken)

**Manual Entry Connection**:

```json
{
  "organization": "tfs",
  "project": "One",
  "baseUrl": "https://vstfdt.corp.microsoft.com/tfs",
  "apiBaseUrl": "https://dev.azure.com/tfs/One/_apis" // ❌ WRONG!
}
```

**Missing Identity**:

- No prompt for identity
- `@Me` queries fail
- No work items shown even when user has assigned items

### After (Fixed)

**Manual Entry Connection**:

```json
{
  "organization": "tfs",
  "project": "One",
  "baseUrl": "https://vstfdt.corp.microsoft.com/tfs",
  "apiBaseUrl": "https://vstfdt.corp.microsoft.com/tfs/One/_apis", // ✅ CORRECT!
  "identityName": "CONTOSO\\jsmith" // ✅ NOW INCLUDED
}
```

**With Identity**:

- Identity prompt appears for on-premises
- Pre-filled with detected environment identity
- Required field - can't skip
- `@Me` queries work correctly
- User's work items display properly

## Testing Needed

### Test On-Premises Connection Setup

1. Start extension setup wizard
2. Choose "Enter manually" for project info
3. Select "Custom" for base URL
4. Enter on-premises URL: `https://vstfdt.corp.microsoft.com/tfs`
5. Enter organization/collection: `tfs`
6. Enter project: `One`
7. **Verify**: Message shows "Azure DevOps Server (On-Premises) Detected"
8. Enter PAT
9. **Verify**: Identity prompt appears
10. **Verify**: Pre-filled with `DOMAIN\USERNAME` (Windows) or `username` (Linux/Mac)
11. **Verify**: Cannot skip or leave blank (validation error)
12. Complete setup

### Verify Connection in Settings

Check `.vscode/settings.json` or user settings:

```json
{
  "azureDevOpsIntegration.connections": [
    {
      "id": "...",
      "organization": "tfs",
      "project": "One",
      "baseUrl": "https://vstfdt.corp.microsoft.com/tfs",
      "apiBaseUrl": "https://vstfdt.corp.microsoft.com/tfs/One/_apis", // ✅ Check this
      "authMethod": "pat",
      "identityName": "CONTOSO\\jsmith" // ✅ Check this
    }
  ]
}
```

### Verify Work Items Load

1. Connection appears in work items sidebar
2. Can load work items
3. Queries with `@Me` return results:
   ```sql
   WHERE [System.AssignedTo] = @Me
   ```
4. Can create new work items
5. Can update work items

## Files Changed

1. **src/setupWizard.ts** - 4 changes:
   - Fixed manual entry `apiBaseUrl` generation (~15 lines)
   - Added identity prompting for on-premises (~45 lines)
   - Added `identityName` to `SetupWizardData` interface (1 line)
   - Added `identityName` to `StoredConnection` interface (1 line)
   - Added `identityName` to connection object in `completeSetup()` (1 line)

2. **CHANGELOG.md** - Updated v1.9.6 section with fixes

3. **docs/ONPREM_URL_IDENTITY_FIXES.md** - New comprehensive documentation

4. **docs/CODE_CLEANUP_REDUNDANT_SETUP_PATHS.md** - Updated status

## Compile Status

✅ **Successfully compiled** - no errors

## Next Steps

1. **User Testing** (REQUIRED):
   - Test with actual on-premises Azure DevOps Server
   - Verify connection saves with correct `apiBaseUrl` and `identityName`
   - Verify work items load and `@Me` queries work

2. **After Testing Passes**:
   - Remove `_promptAddConnection_DEPRECATED()` function
   - Clean up other redundant code paths
   - Consider adding migration for existing connections missing identity

## Key Improvements

1. **Unified URL Generation**: Both URL parsing and manual entry now generate correct `apiBaseUrl` for all instance types

2. **Required Identity**: On-premises connections cannot be created without identity, preventing non-functional connections

3. **Smart Defaults**: Environment variable detection means most users can just click "OK" on the identity prompt

4. **Clear Error Messages**: Users understand why identity is required and what format to use

5. **Consistent Data Flow**: Identity flows through all layers: wizard → connection → client → queries

## Environment Variable Detection

**Windows**:

```
USERDOMAIN: "CONTOSO"
USERNAME: "jsmith"
Result: "CONTOSO\jsmith"
```

**Linux/Mac**:

```
USER: "jsmith"
Result: "jsmith"
```

Users can override if the detected value doesn't match their Azure DevOps Server identity.

## Related Documentation

- [ONPREM_URL_IDENTITY_FIXES.md](./ONPREM_URL_IDENTITY_FIXES.md) - Detailed technical analysis
- [CODE_CLEANUP_REDUNDANT_SETUP_PATHS.md](./CODE_CLEANUP_REDUNDANT_SETUP_PATHS.md) - Cleanup plan
- [BUG_FIX_ENTRA_ID_NOT_OFFERED.md](./BUG_FIX_ENTRA_ID_NOT_OFFERED.md) - Related authentication fix
