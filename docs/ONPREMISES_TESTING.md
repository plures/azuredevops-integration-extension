# Azure DevOps Server (On-Premises) Support - Manual Testing Guide

This document describes how to manually test the on-premises Azure DevOps Server support added to the extension.

## Changes Summary

The extension now supports Azure DevOps Server (on-premises installations) in addition to Azure DevOps Services (cloud). The key changes are:

1. **AzureClient URL Construction**: When a custom `baseUrl` is provided, the client now constructs API URLs using that base instead of hardcoding `dev.azure.com`
2. **URL Parser**: Added support for parsing on-premises URLs (e.g., `https://server/collection/project/...`)
3. **URL Generators**: Updated PAT creation and work item URL generators to handle on-premises installations

## Expected Behavior

### For Azure DevOps Online (dev.azure.com)

- **Input**: No custom baseUrl OR baseUrl like `https://dev.azure.com/myorg`
- **API Base URL**: `https://dev.azure.com/{organization}/{project}/_apis`
- **Browser URL**: `https://dev.azure.com/{organization}/{project}/...`
- **No change** from previous behavior

### For Azure DevOps Server (On-Premises)

- **Input**: Custom baseUrl like `https://myserver/DefaultCollection`
- **API Base URL**: `https://myserver/DefaultCollection/{project}/_apis`
- **Browser URL**: `https://myserver/DefaultCollection/{project}/...`
- **New behavior** that supports on-premises installations

## Test Scenarios

### 1. Parse On-Premises URL

```typescript
const url = 'https://myserver/DefaultCollection/MyProject/_workitems/edit/123';
const parsed = parseAzureDevOpsUrl(url);

// Expected results:
// parsed.isValid === true
// parsed.organization === 'DefaultCollection'
// parsed.project === 'MyProject'
// parsed.baseUrl === 'https://myserver/DefaultCollection'
// parsed.apiBaseUrl === 'https://myserver/DefaultCollection/MyProject/_apis'
// parsed.workItemId === 123
```

### 2. Initialize Client with On-Premises Base URL

```typescript
const client = new AzureDevOpsIntClient('DefaultCollection', 'MyProject', 'fake-pat', {
  baseUrl: 'https://myserver/DefaultCollection',
});

// Expected results:
// client.baseUrl === 'https://myserver/DefaultCollection'
// client.axios.defaults.baseURL === 'https://myserver/DefaultCollection/MyProject/_apis'
```

### 3. Build API URLs with On-Premises Base

```typescript
const client = new AzureDevOpsIntClient('DefaultCollection', 'MyProject', 'fake-pat', {
  baseUrl: 'https://myserver/DefaultCollection',
});

const apiUrl = client.buildFullUrl('/wit/workitems/123');
// Expected: 'https://myserver/DefaultCollection/MyProject/_apis/wit/workitems/123'

const browserUrl = client.getBrowserUrl('/_workitems/edit/123');
// Expected: 'https://myserver/DefaultCollection/MyProject/_workitems/edit/123'
```

### 4. Team URLs with On-Premises Base

```typescript
const client = new AzureDevOpsIntClient('DefaultCollection', 'MyProject', 'fake-pat', {
  baseUrl: 'https://myserver/DefaultCollection',
  team: 'MyTeam',
});

// Team API URLs should be constructed as:
// https://myserver/DefaultCollection/MyProject/MyTeam/_apis/...
```

### 5. Generate Work Item URL for On-Premises

```typescript
const url = generateWorkItemUrl(
  'DefaultCollection',
  'MyProject',
  123,
  'https://myserver/DefaultCollection'
);
// Expected: 'https://myserver/DefaultCollection/MyProject/_workitems/edit/123'
```

### 6. Generate PAT Creation URL for On-Premises

```typescript
const url = generatePatCreationUrl('DefaultCollection', 'https://myserver/DefaultCollection');
// Expected: 'https://myserver/DefaultCollection/_usersSettings/tokens'
```

## Integration Test

To test with a real on-premises Azure DevOps Server:

1. Open VS Code with the extension installed
2. Run the setup wizard or configure settings manually:
   - Provide the full on-premises URL: `https://your-server/YourCollection/YourProject/_workitems/edit/1234`
   - Or set `azureDevOpsIntegration.baseUrl` to `https://your-server/YourCollection`
   - Provide a valid PAT for the on-premises server
3. The extension should:
   - Parse the URL correctly
   - Make API calls to `https://your-server/YourCollection/YourProject/_apis/...`
   - Open work items at `https://your-server/YourCollection/YourProject/_workitems/edit/{id}`

## Backwards Compatibility

All existing functionality for Azure DevOps Services (dev.azure.com) should continue to work without any changes:

- URLs are parsed the same way
- API calls go to the same endpoints
- No configuration changes required for cloud users

## Code Changes

### Modified Files

1. `src/azureClient.ts`
   - Added `apiBaseUrl` property
   - Updated constructor to build API URL from custom baseUrl
   - Updated `buildFullUrl()` to use apiBaseUrl
   - Updated `buildTeamApiUrl()` to use apiBaseUrl

2. `src/azureDevOpsUrlParser.ts`
   - Added on-premises URL parsing logic
   - Updated `generateWorkItemUrl()` for on-premises
   - Updated `generatePatCreationUrl()` for on-premises

3. `tests/azureDevOpsUrlParser.test.ts`
   - Added tests for on-premises URL parsing
   - Added tests for URL generation with on-premises base

4. `tests/azureClient.baseUrl.test.ts` (new file)
   - Added tests for AzureClient with custom baseUrl
