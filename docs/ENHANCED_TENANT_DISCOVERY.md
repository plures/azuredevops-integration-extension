# Enhanced Tenant Discovery for Azure DevOps Authentication

## Problem Analysis

The user reported that tenant lookup was failing, and this was preventing proper authentication for personal Microsoft accounts. The original implementation used a single API endpoint that often failed for private or personal Azure DevOps organizations.

## Root Cause

1. **Single Point of Failure**: Original implementation relied solely on `https://app.vssps.visualstudio.com/_apis/organization/{orgName}/tenantinfo`
2. **Private Organizations**: Personal Microsoft accounts often use private organizations that don't expose tenant information via public APIs
3. **API Limitations**: The VSSPS tenant info endpoint may not work for all organization types or may require authentication
4. **Insufficient Fallbacks**: When tenant discovery failed, the system didn't have robust fallback strategies

## Enhanced Solution

### Multi-Strategy Tenant Discovery

The new implementation uses three different discovery strategies with proper fallbacks:

#### Strategy 1: VSSPS Tenant Discovery (Original Method)
```typescript
const discoveryUrl = `https://app.vssps.visualstudio.com/_apis/organization/${orgName}/tenantinfo`;
```
- **Best for**: Public, enterprise Azure DevOps organizations
- **Limitations**: May fail for private or personal organizations
- **Response**: Returns `{ tenantId: "guid" }` if successful

#### Strategy 2: Azure DevOps REST API
```typescript
const apiUrl = `${organizationUrl}/_apis/connectionData`;
```
- **Best for**: Organizations where VSSPS fails but REST API is accessible
- **Method**: Extracts tenant from authenticatedUser descriptor
- **Limitations**: May require authentication for private orgs

#### Strategy 3: Azure Resource Manager API
```typescript
const armUrl = `https://management.azure.com/tenants?api-version=2020-01-01`;
```
- **Best for**: Enterprise setups with ARM integration
- **Limitations**: Requires authentication, more of a future-proofing strategy
- **Current Status**: Placeholder for completeness

### Enhanced Tenant Selection Logic

When all discovery methods fail, the system now uses intelligent fallback logic:

```typescript
if (discoveredTenant) {
  // Use discovered tenant (most reliable)
  finalTenantId = discoveredTenant;
} else if (!input.config?.tenantId || tenantId === 'organizations') {
  // Use 'common' for broad compatibility
  finalTenantId = 'common';
} else {
  // Respect user configuration
  finalTenantId = configuredTenant;
}
```

## Tenant Selection Strategy

| Scenario | Discovery Result | Final Tenant | Reasoning |
|----------|------------------|--------------|-----------|
| Enterprise org with public tenant info | Success | Discovered tenant | Most reliable - actual tenant ID |
| Personal/private org | Failure | `common` | Supports both personal and work accounts |
| User configured specific tenant | Any | User's tenant | Respect user's explicit configuration |
| Default setup (`organizations`) | Failure | `common` | Broader compatibility than `organizations` |

## Microsoft Documentation Support

This approach aligns with Microsoft's guidance:

> "If the user authenticates with a personal account, using `/common` or `/consumers`, they're asked to sign in again in order to transfer authentication state to the device."
> 
> Source: [Microsoft identity platform and the OAuth 2.0 device authorization grant flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code#authenticating-the-user)

### Supported Tenant Types for Device Code Flow:

- **`/common`**: Both personal and work/school accounts (our fallback choice)
- **`/consumers`**: Personal Microsoft accounts only
- **`/organizations`**: Work/school accounts only (fails for personal accounts)
- **`/{tenant-id}`**: Specific tenant (when discovered successfully)

## Expected Behavior

### For Personal Microsoft Account Users:
1. **Discovery attempts**: All three strategies are tried
2. **Discovery likely fails**: Personal orgs are often private
3. **Fallback to `common`**: Supports personal accounts
4. **Device code flow succeeds**: Personal account can authenticate
5. **Double sign-in**: User may be prompted twice (expected per Microsoft docs)

### For Enterprise Users:
1. **Discovery likely succeeds**: Public enterprise orgs expose tenant info
2. **Use discovered tenant**: Most reliable authentication
3. **Single sign-in**: Standard enterprise authentication flow

### For On-Premises Users:
1. **Discovery fails**: On-premises doesn't use public APIs
2. **Respect user config**: Use user's explicitly configured tenant
3. **Custom tenant authentication**: Works with user's tenant setup

## Logging and Debugging

The enhanced implementation provides detailed logging for troubleshooting:

```typescript
// Discovery attempts
logger.debug('Trying VSSPS tenant discovery', context, { discoveryUrl, orgName });
logger.debug('Trying REST API tenant discovery', context, { apiUrl, orgName });

// Final decision logging
logger.debug('Final tenant selection for device code authentication', context, {
  originalConfigTenant: input.config?.tenantId,
  discoveredTenant,
  finalTenantId,
  selectionReason: 'discovery' | 'common-fallback' | 'user-config'
});
```

## Testing Scenarios

### Test Case 1: Personal Microsoft Account
- **Setup**: Personal account with private Azure DevOps org
- **Expected**: Discovery fails, falls back to `common` tenant
- **Result**: Authentication succeeds with double sign-in

### Test Case 2: Enterprise Account
- **Setup**: Work account with public enterprise org
- **Expected**: Discovery succeeds, uses specific tenant
- **Result**: Authentication succeeds with single sign-in

### Test Case 3: User-Configured Tenant
- **Setup**: User explicitly set tenant ID in configuration
- **Expected**: Discovery may fail, but respects user's tenant
- **Result**: Authentication uses user's specified tenant

### Test Case 4: On-Premises Azure DevOps
- **Setup**: On-premises server with custom tenant
- **Expected**: Discovery fails (no public APIs), uses user config
- **Result**: Authentication uses user's configured tenant

## Migration Notes

This change is backward compatible:
- **Existing configurations**: Still work as before
- **New installations**: Benefit from enhanced discovery
- **Failed authentications**: Now have better fallback options

## Future Improvements

1. **Authentication-based discovery**: Use acquired tokens to call authenticated APIs for tenant info
2. **Caching**: Cache successful tenant discoveries to reduce API calls
3. **User guidance**: Provide better error messages when specific tenant types are required
4. **Metrics**: Track which discovery methods work for different org types

## Related Documentation

- [Microsoft identity platform and the OAuth 2.0 device authorization grant flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code)
- [Authentication flows supported in MSAL](https://learn.microsoft.com/en-us/entra/msal/msal-authentication-flows#device-code)
- [Using Device Code Flow in MSAL.NET](https://learn.microsoft.com/en-us/entra/msal/dotnet/acquiring-tokens/desktop-mobile/device-code-flow)