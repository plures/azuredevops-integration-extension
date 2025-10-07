# On-Premises URL Parsing Fix

## Problem

When parsing on-premises Azure DevOps Server URLs in simplified format (2-segment), the API URL was being constructed incorrectly by duplicating the collection name.

**Example:**

- Input URL: `https://server/collection/project`
- Expected API URL: `https://server/collection/project/_apis` ✅
- Previous API URL: `https://server/collection/collection/project/_apis` ❌

## Root Cause

The `buildApiBaseUrl` function was treating all on-premises URLs the same way:

```typescript
// Old code (incorrect)
const apiUrl = `${trimmedBase}/${organization}/${project}/_apis`;
```

However, in the simplified 2-segment format:

- `baseUrl` = `https://server/collection` (already includes collection)
- `organization` = `collection` (same as collection)
- `project` = `project`

This resulted in: `https://server/collection/collection/project/_apis` (duplicate!)

## Solution

Added an `isSimplifiedOnPrem` flag to distinguish between:

1. **Simplified format** (2-segment): `https://server/collection/project`
   - `baseUrl` already includes collection
   - Don't add organization (it's the same as collection)
   - API URL: `${baseUrl}/${project}/_apis`

2. **Full format** (3-segment): `https://server/collection/org/project`
   - `baseUrl` includes collection
   - Organization is separate from collection
   - API URL: `${baseUrl}/${organization}/${project}/_apis`

## Implementation

### Updated `buildApiBaseUrl` function:

```typescript
function buildApiBaseUrl(
  baseUrl: string,
  organization: string,
  project: string,
  isSimplifiedOnPrem: boolean = false
): string {
  const trimmedBase = baseUrl.replace(/\/$/, '');
  const lowerBase = trimmedBase.toLowerCase();

  if (lowerBase.includes('visualstudio.com')) {
    return `https://dev.azure.com/${organization}/${project}/_apis`;
  }

  if (lowerBase.includes('dev.azure.com')) {
    return `${trimmedBase}/${project}/_apis`;
  }

  // On-prem: baseUrl already includes collection
  // For simplified format, don't add organization (it's same as collection)
  // For full format with separate org, add org/project
  const apiUrl = isSimplifiedOnPrem
    ? `${trimmedBase}/${project}/_apis`
    : `${trimmedBase}/${organization}/${project}/_apis`;

  return apiUrl;
}
```

### URL Parsing Logic:

```typescript
if (segments.length >= 3) {
  // Full on-prem format: collection/org/project
  const collection = normalizeProjectSegment(segments[0]);
  organization = normalizeProjectSegment(segments[1]);
  project = normalizeProjectSegment(segments[2]);
  baseUrl = `${parsed.protocol}//${parsed.host}/${collection}`;
  // isSimplifiedOnPrem = false (default)
} else if (segments.length >= 2) {
  // Simplified on-prem format: collection/project
  const collection = normalizeProjectSegment(segments[0]);
  organization = collection; // Same as collection
  project = normalizeProjectSegment(segments[1]);
  baseUrl = `${parsed.protocol}//${parsed.host}/${collection}`;
  isSimplifiedOnPrem = true; // Flag this as simplified format
}
```

## Test Cases

### 2-Segment (Simplified):

```typescript
Input: 'https://server/tfs/MyProject'
Output:
  - baseUrl: 'https://server/tfs'
  - organization: 'tfs'
  - project: 'MyProject'
  - apiBaseUrl: 'https://server/tfs/MyProject/_apis' ✅
```

### 3-Segment (Full):

```typescript
Input: 'https://server/DefaultCollection/MyOrg/MyProject'
Output:
  - baseUrl: 'https://server/DefaultCollection'
  - organization: 'MyOrg'
  - project: 'MyProject'
  - apiBaseUrl: 'https://server/DefaultCollection/MyOrg/MyProject/_apis' ✅
```

## Impact

This fix ensures that:

- ✅ On-premises URLs work correctly in both 2-segment and 3-segment formats
- ✅ API requests go to the correct endpoint
- ✅ No duplication of collection name in API URLs
- ✅ Backward compatible with existing cloud URLs (dev.azure.com, visualstudio.com)

## Related Files

- `src/azureDevOpsUrlParser.ts` - URL parsing logic
- `tests/azureDevOpsUrlParser.test.ts` - Test cases including new edge case tests
