# Device Code Flow Personal Accounts Fix

## Issue Summary

Users with personal Microsoft accounts were experiencing authentication failures with two main symptoms:

1. Sign-in site rejected personal accounts, requesting work accounts instead
2. "Open Browser" button failed to open the browser during device code flow

## Root Cause Analysis

Based on Microsoft documentation research, the issues were caused by:

1. **Incorrect Tenant Selection**: Using `organizations` tenant which only supports work/school accounts
2. **Cached Authentication Conflicts**: Cached tokens from previous tenant causing MSAL initialization issues
3. **Undefined Device Code Parameters**: MSAL callback receiving invalid parameters due to tenant conflicts

## Microsoft Documentation References

According to Microsoft's official documentation:

### Device Code Flow with Personal Accounts

- **Source**: [Microsoft identity platform and the OAuth 2.0 device authorization grant flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code#authenticating-the-user)
- **Key Quote**: "If the user authenticates with a personal account, using `/common` or `/consumers`, they're asked to sign in again in order to transfer authentication state to the device."

### Tenant Support for Personal Accounts

- **Source**: [Using Device Code Flow in MSAL.NET](https://learn.microsoft.com/en-us/entra/msal/dotnet/acquiring-tokens/desktop-mobile/device-code-flow)
- **Key Points**:
  - Device code flow works with Microsoft Personal Accounts starting with MSAL.NET 4.5
  - Supported tenants: `/common` or `/consumers` for personal accounts
  - Work and school accounts: `/organizations`

### Authority Format Requirements

- **Source**: [Authentication flows supported in MSAL](https://learn.microsoft.com/en-us/entra/msal/msal-authentication-flows#device-code)
- **Required Format**: `https://login.microsoftonline.com/{tenant}/`
- **Tenant Options**:
  - Tenant-specific: `{tenant-id}` or `{domain.com}`
  - Work/school accounts: `organizations`
  - Personal accounts: `consumers` or `common`
  - Multi-tenant: `common` (both work and personal)

## Solution Implemented

### 1. Tenant Selection Fix

**Changed**: From `organizations` → `common` when tenant discovery fails

```typescript
// OLD: Used 'organizations' which only supports work/school accounts
const fallbackTenant = 'organizations';

// NEW: Use 'common' which supports both personal and work accounts
const multiTenantForPersonalAccounts = 'common';
```

**Rationale**:

- `/common` tenant supports both personal and work Microsoft accounts
- Microsoft documentation specifically mentions `/common` for device code flow with personal accounts
- Prevents the "personal account not accepted" error

### 2. Cache Clearing on Tenant Change

**Added**: Automatic cache clearing when switching tenants

```typescript
// Clear cached authentication when tenant changes to prevent conflicts
if (input.config?.tenantId && input.config.tenantId !== finalTenantId) {
  const cacheKey = `entra-cache-${input.connectionId}`;
  await context.secrets.delete(cacheKey);
}
```

**Rationale**:

- Cached tokens from previous tenant can cause MSAL initialization conflicts
- Prevents undefined parameters in device code callback
- Ensures clean authentication state for new tenant

### 3. Enhanced Error Handling

**Improved**: Device code callback parameter validation with actionable recovery

```typescript
// Detect invalid parameters and provide user-actionable recovery
if (!deviceCode || !userCode || !verificationUri || typeof expiresIn !== 'number') {
  // Offer cache clearing option to user
  const action = await vscode.window.showErrorMessage(
    'Device code authentication failed due to invalid parameters...',
    'Clear Auth Cache & Retry',
    'Cancel'
  );
}
```

**Rationale**:

- Provides users with clear recovery path when authentication conflicts occur
- Identifies the root cause (cache conflicts) in error messages
- Allows self-service resolution without developer intervention

## Expected Behavior After Fix

### For Personal Microsoft Accounts:

1. ✅ Tenant discovery fails → automatically switches to `/common` tenant
2. ✅ Device code flow initiates successfully with valid parameters
3. ✅ Browser opens correctly with authentication URL
4. ✅ User sees standard Microsoft personal account sign-in flow
5. ✅ User may be prompted to sign in twice (expected behavior per Microsoft docs)
6. ✅ Authentication completes successfully

### For Work/School Accounts:

1. ✅ Tenant discovery succeeds → uses discovered tenant
2. ✅ Device code flow works as before
3. ✅ No impact on existing functionality

## Testing Recommendations

1. **Clear Previous Cache**: Delete existing authentication cache before testing
2. **Test Personal Accounts**: Verify personal Microsoft accounts can authenticate
3. **Test Work Accounts**: Ensure work/school accounts still function correctly
4. **Test Cache Recovery**: Verify cache clearing option works when conflicts occur

## Future Considerations

1. **Monitor MSAL Updates**: Microsoft may improve personal account support in future versions
2. **Consider User Education**: Document that personal accounts may require two sign-ins during device code flow
3. **Cache Management**: Consider implementing periodic cache cleanup to prevent stale authentication state

## Related Documentation

- [Microsoft identity platform and the OAuth 2.0 device authorization grant flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code)
- [Using Device Code Flow in MSAL.NET](https://learn.microsoft.com/en-us/entra/msal/dotnet/acquiring-tokens/desktop-mobile/device-code-flow)
- [Authentication flows supported in MSAL](https://learn.microsoft.com/en-us/entra/msal/msal-authentication-flows#device-code)
- [Acquire tokens in MSAL Node](https://learn.microsoft.com/en-us/entra/msal/javascript/node/acquire-token-requests#device-code-flow)
