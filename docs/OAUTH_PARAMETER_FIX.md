# OAuth Parameter Fix for Azure DevOps Authentication

## Problem Analysis

Based on the manual login URL analysis from Azure DevOps, we discovered that the current MSAL device code flow was missing several critical OAuth parameters that Azure DevOps expects for proper authentication.

### Manual Login URL Analysis

The manual login URL revealed these required parameters:

```
https://login.microsoftonline.com/common/oauth2/authorize?
  client_id=499b84ac-1321-427f-aa17-267ca6975798
  &response_type=code+id_token
  &redirect_uri=https://app.vssps.visualstudio.com/_signin-oidc
  &response_mode=form_post
  &scope=https://499b84ac-1321-427f-aa17-267ca6975798/.default+openid+profile
  &state=...
  &nonce=...
  &site_id=501454
  &resource=499b84ac-1321-427f-aa17-267ca6975798
```

### Missing Parameters Identified

Our current MSAL implementation was missing:

1. **site_id**: `501454` - Azure DevOps site identifier
2. **resource**: `499b84ac-1321-427f-aa17-267ca6975798` - Azure DevOps resource ID
3. **response_mode**: `form_post` - OAuth response mode
4. **response_type**: `code id_token` - OAuth response type specification

## Solution Implemented

### Device Code Flow Enhancement

Updated the `DeviceCodeRequest` configuration in `src/auth/entraAuthProvider.ts` to include the missing parameters:

```typescript
const deviceCodeRequest: msal.DeviceCodeRequest = {
  deviceCodeCallback: async (response) => {
    // ... callback logic
  },
  scopes,
  extraQueryParameters: {
    // Add Azure DevOps-specific OAuth parameters found in manual login URL
    site_id: '501454',
    resource: '499b84ac-1321-427f-aa17-267ca6975798',
    response_mode: 'form_post',
    response_type: 'code id_token',
  },
};
```

### Silent Flow Enhancement

Updated the `SilentFlowRequest` configuration to include the same parameters via `tokenQueryParameters`:

```typescript
const silentRequest: msal.SilentFlowRequest = {
  account,
  scopes,
  forceRefresh: false,
  tokenQueryParameters: {
    // Add Azure DevOps-specific OAuth parameters found in manual login URL
    site_id: '501454',
    resource: '499b84ac-1321-427f-aa17-267ca6975798',
    response_mode: 'form_post',
    response_type: 'code id_token',
  },
};
```

## MSAL Configuration Research

### extraQueryParameters Support

Based on MSAL.js documentation research:

- **DeviceCodeRequest**: ✅ Supports `extraQueryParameters`
- **SilentFlowRequest**: ❌ Does not support `extraQueryParameters`, but supports `tokenQueryParameters`

The MSAL documentation shows that `extraQueryParameters` can be used to add custom OAuth parameters not directly supported by the standard MSAL request types.

## Expected Improvements

With these parameters added, the authentication flow should:

1. **Support Personal Microsoft Accounts**: The additional parameters should help Azure DevOps properly identify and handle personal Microsoft accounts
2. **Fix Browser Opening Issues**: Proper OAuth parameter specification should ensure the authentication URLs are correctly formatted
3. **Improve Tenant Discovery**: The resource and site_id parameters provide better context for tenant resolution

## Testing Recommendations

1. **Test Personal Microsoft Account Login**: Verify that personal accounts are now accepted during the authentication flow
2. **Test Browser Opening**: Confirm that the "open in browser" functionality works correctly
3. **Test Different Tenant Types**: Verify authentication works with both organizational and personal accounts
4. **Monitor Authentication Logs**: Check FSM logs for improved tenant discovery and authentication success rates

## Technical Notes

- **site_id `501454`**: This appears to be a standard Azure DevOps site identifier
- **resource parameter**: Uses the same Azure DevOps client ID, indicating it's the target resource
- **response_mode `form_post`**: Indicates how OAuth responses should be delivered
- **response_type `code id_token`**: Specifies both authorization code and ID token should be returned

This fix aligns our MSAL configuration with what Azure DevOps expects, potentially resolving both the personal account rejection and browser opening issues.
