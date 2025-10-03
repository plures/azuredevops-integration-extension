# Microsoft Entra ID Authentication Implementation Guide

## Overview

This document provides a comprehensive guide for the Microsoft Entra ID (formerly Azure AD) authentication implementation in the Azure DevOps Integration extension. This feature allows users to authenticate using their Microsoft work/school accounts instead of manually creating and managing Personal Access Tokens (PATs).

## Architecture

### Authentication Service Layer

The implementation follows a provider pattern with a unified authentication service:

```
┌─────────────────────────────────────────────────┐
│            AuthService (Facade)                  │
│  - Unified interface for all auth methods        │
│  - Token lifecycle management                    │
│  - Expiration tracking                           │
└─────────────┬───────────────────────────────────┘
              │
       ┌──────┴──────┐
       │             │
┌──────▼─────┐ ┌────▼──────────┐
│   PAT      │ │  Entra ID     │
│  Provider  │ │   Provider    │
│            │ │  (MSAL-based) │
└────────────┘ └───────────────┘
```

### Key Components

#### 1. **src/auth/types.ts**

- Defines core authentication types and interfaces
- `AuthMethod`: 'pat' | 'entra'
- `IAuthProvider`: Interface all auth providers implement
- `TokenInfo`: Structure for token metadata
- `AuthenticationResult`: Standard response format

#### 2. **src/auth/patAuthProvider.ts**

- Wrapper for existing PAT authentication
- Simple pass-through implementation
- Maintains backward compatibility

#### 3. **src/auth/entraAuthProvider.ts**

- Implements device code flow using @azure/msal-node
- Silent token refresh using cached refresh tokens
- Secure token storage in VS Code secrets
- Automatic token expiration handling

#### 4. **src/auth/authService.ts**

- Factory pattern for creating auth providers
- Unified API for token acquisition and refresh
- Token expiration status and monitoring
- Helper methods for token lifecycle management

#### 5. **src/azureClient.ts** (Modified)

- Now accepts both PAT and Bearer tokens
- Automatic token refresh on 401 responses
- `authType` parameter: 'pat' | 'bearer'
- `tokenRefreshCallback` for seamless token renewal

## Configuration Schema

### Connection Object (Extended)

```typescript
{
  id: string;                    // Unique connection identifier
  organization: string;          // Azure DevOps organization
  project: string;               // Project name
  label?: string;                // Display label
  team?: string;                 // Team context
  authMethod?: 'pat' | 'entra'; // Authentication method (default: 'pat')

  // PAT specific
  patKey?: string;               // Secret storage key for PAT

  // Entra ID specific
  tenantId?: string;             // Azure AD tenant (default: 'organizations')
  clientId?: string;             // Azure AD app registration client ID
  baseUrl?: string;              // Custom Azure DevOps URL
}
```

### Global Settings

```json
{
  "azureDevOpsIntegration.entra.defaultClientId": {
    "default": "872cd9fa-d31f-45e0-9eab-6e460a02d1f1",
    "description": "Default Azure AD client ID (Visual Studio IDE client)"
  },
  "azureDevOpsIntegration.entra.defaultTenantId": {
    "default": "organizations",
    "description": "Default tenant ID ('organizations', 'common', or specific tenant)"
  },
  "azureDevOpsIntegration.entra.autoRefreshToken": {
    "default": true,
    "description": "Automatically refresh tokens before expiration"
  }
}
```

## Authentication Flows

### Device Code Flow (Entra ID)

1. User initiates authentication
2. Extension requests device code from Azure AD
3. User sees VS Code notification with:
   - User code (e.g., `ABC-DEF-GHI`)
   - Verification URL (https://microsoft.com/devicelogin)
   - Expiration time
4. User visits URL in browser and enters code
5. User authenticates with Microsoft account
6. Extension polls Azure AD for token
7. Token cached and refresh token stored in VS Code secrets

### Silent Token Refresh

1. Before API call, check if token expires soon (<5 minutes)
2. If expiring, attempt silent refresh using cached refresh token
3. Update cached token and continue request
4. If silent refresh fails, prompt user to re-authenticate

### PAT Flow (Existing)

1. User provides PAT manually
2. PAT stored in VS Code secrets
3. PAT used for all API calls
4. No automatic refresh (PATs are long-lived)

## Default Client ID

The extension uses the **Visual Studio IDE client ID** (`872cd9fa-d31f-45e0-9eab-6e460a02d1f1`) by default. This is a Microsoft-provided client ID that:

- Works across all Azure AD tenants
- Has pre-configured permissions for Azure DevOps
- Doesn't require custom app registration
- Is used by Visual Studio, Azure CLI, and other Microsoft tools

### Azure DevOps Scopes

The extension requests the following scope:

- `499b84ac-1321-427f-aa17-267ca6975798/.default`

Where `499b84ac-1321-427f-aa17-267ca6975798` is the Azure DevOps service principal ID. The `/.default` suffix requests all permissions the user has consented to.

## Security Considerations

### Token Storage

- **Refresh Tokens**: Stored in VS Code `SecretStorage` API
  - Encrypted at rest
  - Per-connection storage key: `azureDevOpsInt.entra.refreshToken.{connectionId}`
  - Cleared on sign-out

- **Access Tokens**: Cached in memory only
  - Never persisted to disk
  - Cleared when extension deactivates
  - Automatic refresh before expiration

### Token Lifetime

- **Access Token**: 1 hour (enforced by Azure AD)
- **Refresh Token**: Up to 90 days (with MFA, longer on managed devices)
- Extension automatically refreshes 5 minutes before expiration

### Conditional Access

Entra ID authentication respects all Azure AD policies:

- Multi-factor authentication (MFA)
- Device compliance
- Location-based restrictions
- Risk-based authentication

## Migration Path

### From PAT to Entra ID

Users can convert existing PAT connections to Entra ID:

```typescript
// Command: azureDevOpsInt.convertConnectionToEntra
async function convertConnectionToEntra(connectionId: string) {
  // 1. Show confirmation dialog
  // 2. Initiate Entra ID authentication
  // 3. On success, update connection config
  // 4. Remove PAT from secrets (optional)
  // 5. Refresh provider with new auth
}
```

### Backward Compatibility

- All existing PAT connections continue to work
- No breaking changes to configuration schema
- `authMethod` defaults to 'pat' if not specified
- Extension supports mixed auth methods (some PAT, some Entra)

## Error Handling

### Common Errors and Remediation

| Error           | Cause                     | Remediation                                            |
| --------------- | ------------------------- | ------------------------------------------------------ |
| `AADSTS50058`   | Tenant not found          | Check tenant ID or use 'organizations'                 |
| `AADSTS65001`   | User declined consent     | Re-run authentication and accept permissions           |
| `AADSTS50076`   | MFA required              | Complete MFA in browser during device code flow        |
| `AADSTS700016`  | Application not found     | Check client ID configuration                          |
| `Token expired` | Access token > 1 hour old | Automatic refresh, or re-authenticate if refresh fails |

## Implementation Status

### ✅ Completed

1. **Core Authentication Infrastructure**
   - ✅ MSAL integration (@azure/msal-node)
   - ✅ Provider pattern with `IAuthProvider` interface
   - ✅ PAT and Entra ID providers
   - ✅ Unified `AuthService` facade

2. **Token Management**
   - ✅ Device code flow implementation
   - ✅ Silent token refresh
   - ✅ Token expiration tracking
   - ✅ Secure secret storage

3. **Client Integration**
   - ✅ AzureDevOpsIntClient updated for dual auth
   - ✅ Bearer token support
   - ✅ Automatic 401 retry with token refresh
   - ✅ `updateCredential()` method for token updates

4. **Configuration**
   - ✅ Extended `ProjectConnection` schema
   - ✅ New VS Code settings for Entra ID
   - ✅ Default client ID configuration
   - ✅ Commands registered in package.json

### 🔄 In Progress / TODO

5. **Setup Wizard Integration**
   - ⏳ Add Entra ID option to setup wizard
   - ⏳ Device code flow UI/UX
   - ⏳ Connection testing with Entra ID

6. **Connection Management**
   - ⏳ Update `ensureActiveConnection()` for Entra ID
   - ⏳ Token refresh on connection switch
   - ⏳ Token expiration warnings

7. **User Interface**
   - ⏳ Auth method indicator in webview
   - ⏳ Token expiration status display
   - ⏳ Sign in/out commands
   - ⏳ PAT to Entra ID migration wizard

8. **Documentation**
   - ⏳ README updates
   - ⏳ Setup guide for Entra ID
   - ⏳ Troubleshooting documentation
   - ⏳ Azure AD app registration guide (optional)

9. **Testing**
   - ⏳ Unit tests for auth providers
   - ⏳ Integration tests for token flows
   - ⏳ Mock MSAL responses

## Usage Examples

### Creating an Entra ID Connection

```typescript
import { AuthService } from './auth/index.js';

// Create Entra ID auth service
const authService = new AuthService({
  authMethod: 'entra',
  secretStorage: context.secrets,
  connectionId: 'conn-123',
  entraConfig: {
    clientId: '872cd9fa-d31f-45e0-9eab-6e460a02d1f1',
    tenantId: 'organizations',
    scopes: ['499b84ac-1321-427f-aa17-267ca6975798/.default'],
  },
  deviceCodeCallback: async (deviceCode, userCode, verificationUrl, expiresIn) => {
    // Show VS Code notification with device code instructions
    vscode.window
      .showInformationMessage(
        `Sign in to Microsoft: Go to ${verificationUrl} and enter code: ${userCode}`,
        'Open Browser'
      )
      .then((selection) => {
        if (selection === 'Open Browser') {
          vscode.env.openExternal(vscode.Uri.parse(verificationUrl));
        }
      });
  },
});

// Authenticate user
const result = await authService.authenticate();
if (result.success) {
  const token = await authService.getAccessToken();

  // Create Azure DevOps client with Bearer token
  const client = new AzureDevOpsIntClient('myorg', 'myproject', token, {
    authType: 'bearer',
    tokenRefreshCallback: async () => {
      return await authService.getAccessToken();
    },
  });
}
```

### Token Refresh Background Task

```typescript
// Set up periodic token refresh (every 30 minutes)
const refreshInterval = setInterval(
  async () => {
    if (await authService.isTokenExpiringSoon()) {
      console.log('Token expiring soon, refreshing...');
      const result = await authService.refreshAccessToken();
      if (result.success && client) {
        client.updateCredential(result.accessToken);
      }
    }
  },
  30 * 60 * 1000
);

// Clean up on deactivation
context.subscriptions.push({
  dispose: () => clearInterval(refreshInterval),
});
```

## Next Steps

1. **Integrate with Setup Wizard**
   - Add "Sign in with Microsoft" button
   - Implement device code flow UI
   - Test connection with Entra ID token

2. **Update Connection Management**
   - Modify `ensureActiveConnection()` in activation.ts
   - Add AuthService creation logic
   - Handle token refresh on connection switch

3. **Add UI Indicators**
   - Show auth method badge in webview
   - Display token expiration countdown
   - Add sign in/out buttons

4. **Comprehensive Testing**
   - Unit tests for all auth providers
   - Integration tests for full auth flows
   - Manual testing with real Azure AD tenants

5. **Documentation**
   - Update README with Entra ID setup
   - Add troubleshooting guide
   - Create video walkthrough (optional)

## References

- [Microsoft Entra ID Documentation](https://learn.microsoft.com/en-us/entra/identity/)
- [MSAL Node Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-node)
- [Azure DevOps OAuth Documentation](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/oauth)
- [Device Code Flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code)

## Support

For issues related to Entra ID authentication:

1. Check token expiration status
2. Verify client ID and tenant ID configuration
3. Review Azure AD conditional access policies
4. Check extension logs for MSAL errors
5. Test with PAT authentication to isolate auth vs API issues

---

_Last Updated: January 2025_
_Version: 1.8.0-dev_
