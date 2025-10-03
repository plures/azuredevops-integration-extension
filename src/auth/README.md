# Authentication Module

This module provides authentication services for the Azure DevOps Integration extension, supporting both Personal Access Tokens (PAT) and Microsoft Entra ID (formerly Azure AD) authentication.

## Architecture

```
src/auth/
├── types.ts              # Core types and interfaces
├── patAuthProvider.ts    # PAT authentication implementation
├── entraAuthProvider.ts  # Entra ID OAuth 2.0 implementation
├── authService.ts        # Unified authentication service facade
└── index.ts             # Module exports
```

## Features

### Personal Access Token (PAT) Authentication

- Simple pass-through authentication
- Tokens stored securely in VS Code secrets
- No expiration handling (manual token rotation)
- Backward compatible with existing connections

### Microsoft Entra ID Authentication

- OAuth 2.0 device code flow for CLI-like experience
- Silent token acquisition using cached refresh tokens
- Automatic token refresh before expiration
- Secure token storage in VS Code SecretStorage API
- Support for Azure AD conditional access policies

## Usage

### Basic Authentication

```typescript
import { AuthService } from './auth/index.js';

// PAT authentication
const patAuth = new AuthService({
  authMethod: 'pat',
  secretStorage: context.secrets,
  connectionId: 'conn-123',
  patConfig: { pat: 'my-secret-pat' },
});

// Entra ID authentication
const entraAuth = new AuthService({
  authMethod: 'entra',
  secretStorage: context.secrets,
  connectionId: 'conn-456',
  entraConfig: {
    clientId: '872cd9fa-d31f-45e0-9eab-6e460a02d1f1',
    tenantId: 'organizations',
    scopes: ['499b84ac-1321-427f-aa17-267ca6975798/.default'],
  },
  deviceCodeCallback: async (deviceCode, userCode, url, expiresIn) => {
    console.log(`Go to ${url} and enter: ${userCode}`);
  },
});

// Authenticate
const result = await entraAuth.authenticate();
if (result.success) {
  const token = await entraAuth.getAccessToken();
  // Use token with Azure DevOps API
}
```

### With Azure DevOps Client

```typescript
import { AzureDevOpsIntClient } from '../azureClient.js';

// Create client with Entra ID token
const token = await authService.getAccessToken();
const client = new AzureDevOpsIntClient('myorg', 'myproject', token!, {
  authType: 'bearer',
  tokenRefreshCallback: async () => {
    return await authService.getAccessToken();
  },
});

// Client automatically refreshes token on 401 responses
const workItems = await client.queryWorkItemsByWiql(wiql);
```

## Token Lifecycle

### Entra ID Token Lifecycle

1. **Initial Authentication**
   - User initiates device code flow
   - Extension displays code and URL
   - User authenticates in browser
   - Extension receives access token + refresh token

2. **Token Usage**
   - Access token cached in memory
   - Valid for 1 hour
   - Used for all API calls

3. **Automatic Refresh**
   - Extension checks token expiration before each API call
   - If expiring soon (<5 minutes), silent refresh triggered
   - New access token obtained using refresh token
   - Client automatically updated with new token

4. **Token Expiration**
   - Access token: 1 hour
   - Refresh token: Up to 90 days (longer on managed devices)
   - On refresh token expiration, user must re-authenticate

### PAT Lifecycle

1. **Manual Creation**
   - User creates PAT in Azure DevOps
   - PAT stored in VS Code secrets

2. **Token Usage**
   - PAT used for all API calls
   - No automatic expiration (long-lived)

3. **Manual Rotation**
   - User must manually update PAT when it expires
   - Extension has no visibility into PAT expiration

## API Reference

### AuthService

Main class for managing authentication.

#### Methods

- `authenticate(): Promise<AuthenticationResult>` - Perform authentication flow
- `getAccessToken(): Promise<string | undefined>` - Get valid access token
- `refreshAccessToken(): Promise<AuthenticationResult>` - Manually refresh token
- `signOut(): Promise<void>` - Clear cached credentials
- `isAuthenticated(): Promise<boolean>` - Check authentication status
- `getTokenInfo(): Promise<TokenInfo | undefined>` - Get token metadata
- `isTokenExpiringSoon(): Promise<boolean>` - Check if token expires <5 min
- `getTokenExpirationStatus(): Promise<string>` - Human-readable expiration time

### IAuthProvider

Interface that all authentication providers must implement.

```typescript
interface IAuthProvider {
  authenticate(): Promise<AuthenticationResult>;
  getAccessToken(): Promise<string | undefined>;
  refreshAccessToken?(): Promise<AuthenticationResult>;
  signOut(): Promise<void>;
  isAuthenticated(): Promise<boolean>;
  getTokenInfo?(): Promise<TokenInfo | undefined>;
}
```

## Configuration

### Default Client ID

The extension uses Microsoft's Visual Studio IDE client ID by default:

- Client ID: `872cd9fa-d31f-45e0-9eab-6e460a02d1f1`
- Works across all Azure AD tenants
- Pre-configured permissions for Azure DevOps
- No custom app registration required

### Azure DevOps Scopes

Default scope: `499b84ac-1321-427f-aa17-267ca6975798/.default`

Where `499b84ac-1321-427f-aa17-267ca6975798` is the Azure DevOps service principal ID.

## Security

### Token Storage

- **Refresh Tokens**: VS Code SecretStorage API (encrypted at rest)
- **Access Tokens**: Memory only (never persisted)
- **PATs**: VS Code SecretStorage API

### Secret Keys

- PAT: `azureDevOpsInt.pat.{connectionId}`
- Entra Refresh Token: `azureDevOpsInt.entra.refreshToken.{connectionId}`

## Testing

```typescript
import { AuthService } from './auth/index.js';
import { expect } from 'chai';

describe('AuthService', () => {
  it('should authenticate with PAT', async () => {
    const auth = new AuthService({
      authMethod: 'pat',
      secretStorage: mockSecrets,
      connectionId: 'test-1',
      patConfig: { pat: 'test-pat' },
    });

    const result = await auth.authenticate();
    expect(result.success).to.be.true;

    const token = await auth.getAccessToken();
    expect(token).to.equal('test-pat');
  });
});
```

## Error Handling

Common error scenarios:

- **AADSTS50058**: Tenant not found → Check tenant ID
- **AADSTS65001**: User declined consent → Re-authenticate
- **AADSTS50076**: MFA required → Complete in browser
- **Token expired**: Automatic refresh, or prompt re-authentication

## Dependencies

- `@azure/msal-node`: Microsoft Authentication Library for OAuth 2.0 flows
- `vscode.SecretStorage`: Secure credential storage

## See Also

- [ENTRA_ID_AUTH.md](../../docs/ENTRA_ID_AUTH.md) - Comprehensive implementation guide
- [ENTRA_ID_QUICK_START.md](../../docs/ENTRA_ID_QUICK_START.md) - Integration quick start
- [Azure DevOps OAuth](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/oauth)

---

_Version: 1.8.0-dev_
