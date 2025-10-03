# Entra ID Authentication - Quick Start

## For Extension Developers

### What Has Been Implemented

✅ **Core Authentication Infrastructure (Completed)**

- Microsoft Authentication Library (MSAL) integration
- Device code flow for CLI-like authentication
- Silent token refresh with cached refresh tokens
- Secure token storage using VS Code SecretStorage API
- Unified AuthService supporting both PAT and Entra ID

✅ **Azure DevOps Client Updates (Completed)**

- Dual authentication support (PAT and Bearer tokens)
- Automatic token refresh on 401 responses
- Token refresh callback mechanism

✅ **Configuration Schema (Completed)**

- Extended ProjectConnection with authMethod field
- Entra ID specific fields (tenantId, clientId)
- Default Visual Studio client ID configuration
- Global settings for Entra ID defaults

### What Still Needs Work

⏳ **Integration Points (In Progress)**

1. Setup Wizard - Add Entra ID authentication option
2. Connection Management - Update `ensureActiveConnection()` in activation.ts
3. UI Updates - Add auth method indicators and token status
4. Command Handlers - Implement sign in/out/convert commands
5. Testing - Unit and integration tests

### Using the Auth Service

```typescript
import { AuthService, createAuthService } from './auth/index.js';
import { AzureDevOpsIntClient } from './azureClient.js';

// Create Entra ID auth service
const authService = await createAuthService('entra', context.secrets, 'conn-123', {
  entraConfig: {
    clientId: '872cd9fa-d31f-45e0-9eab-6e460a02d1f1', // VS client ID
    tenantId: 'organizations',
    scopes: ['499b84ac-1321-427f-aa17-267ca6975798/.default'],
  },
  deviceCodeCallback: async (deviceCode, userCode, url, expiresIn) => {
    // Show notification to user
    const action = await vscode.window.showInformationMessage(
      `Sign in: Go to ${url} and enter code ${userCode}`,
      'Open Browser'
    );
    if (action === 'Open Browser') {
      vscode.env.openExternal(vscode.Uri.parse(url));
    }
  },
});

// Authenticate
const result = await authService.authenticate();
if (!result.success) {
  vscode.window.showErrorMessage(`Authentication failed: ${result.error}`);
  return;
}

// Get access token
const token = await authService.getAccessToken();

// Create Azure DevOps client
const client = new AzureDevOpsIntClient('myorg', 'myproject', token!, {
  authType: 'bearer',
  tokenRefreshCallback: async () => {
    return await authService.getAccessToken();
  },
});

// Use client normally - token refresh is automatic!
const workItems = await client.queryWorkItemsByWiql(wiql);
```

### Next Integration Steps

#### 1. Update activation.ts

Add to `ensureActiveConnection()`:

```typescript
async function ensureActiveConnection(context, connectionId, options) {
  const connection = connections.find((c) => c.id === connectionId);
  const authMethod = connection.authMethod || 'pat';

  let state = connectionStates.get(connectionId);
  if (!state) {
    state = { id: connectionId, config: connection, authMethod };
    connectionStates.set(connectionId, state);
  }

  // Create auth service based on method
  let authService;
  if (authMethod === 'entra') {
    authService = await createAuthService('entra', context.secrets, connectionId, {
      entraConfig: {
        clientId: connection.clientId || getConfig().get('entra.defaultClientId'),
        tenantId: connection.tenantId || getConfig().get('entra.defaultTenantId'),
        scopes: ['499b84ac-1321-427f-aa17-267ca6975798/.default'],
      },
      deviceCodeCallback: showDeviceCodeNotification,
    });

    const token = await authService.getAccessToken();
    if (!token) {
      // Need to authenticate
      const result = await authService.authenticate();
      if (!result.success) {
        vscode.window.showErrorMessage(`Authentication failed: ${result.error}`);
        return undefined;
      }
    }

    state.accessToken = await authService.getAccessToken();
  } else {
    // PAT auth (existing logic)
    state.pat = await getSecretPAT(context, connectionId);
  }

  // Create client with appropriate auth
  state.client = new AzureDevOpsIntClient(
    connection.organization,
    connection.project,
    authMethod === 'entra' ? state.accessToken! : state.pat!,
    {
      authType: authMethod === 'entra' ? 'bearer' : 'pat',
      tokenRefreshCallback:
        authMethod === 'entra' ? async () => authService!.getAccessToken() : undefined,
      team: connection.team,
      baseUrl: connection.baseUrl,
    }
  );

  return state;
}
```

#### 2. Add Command Handlers

```typescript
// Sign in with Entra ID
context.subscriptions.push(
  vscode.commands.registerCommand('azureDevOpsInt.signInWithEntra', async () => {
    // Show connection picker if multiple connections
    // Create auth service and authenticate
    // Update connection state
  })
);

// Sign out
context.subscriptions.push(
  vscode.commands.registerCommand('azureDevOpsInt.signOutEntra', async () => {
    // Get active connection
    // Sign out auth service
    // Clear cached tokens
    // Prompt for re-authentication
  })
);

// Convert PAT to Entra
context.subscriptions.push(
  vscode.commands.registerCommand('azureDevOpsInt.convertConnectionToEntra', async () => {
    // Show connection picker
    // Confirm conversion
    // Authenticate with Entra ID
    // Update connection config
    // Optionally remove PAT
  })
);
```

#### 3. Update Setup Wizard

In `setupWizard.ts`, add a step to choose auth method:

```typescript
private async step1_ChooseAuthMethod(): Promise<boolean> {
  const choice = await vscode.window.showQuickPick([
    {
      label: '$(key) Sign in with Microsoft',
      description: 'Recommended - Uses your work/school account',
      authMethod: 'entra' as const
    },
    {
      label: '$(lock) Personal Access Token',
      description: 'Manual token management',
      authMethod: 'pat' as const
    }
  ], {
    placeHolder: 'Choose authentication method',
    ignoreFocusOut: true
  });

  if (!choice) return false;

  this.data.authMethod = choice.authMethod;
  return true;
}
```

### Testing Checklist

- [ ] PAT connections still work (backward compatibility)
- [ ] Device code flow shows notification correctly
- [ ] User can complete authentication in browser
- [ ] Access token is cached and reused
- [ ] Silent token refresh works before expiration
- [ ] 401 errors trigger automatic token refresh
- [ ] Sign out clears all cached tokens
- [ ] Multiple connections with different auth methods work
- [ ] Token expiration status displays correctly
- [ ] Conversion from PAT to Entra ID works

### Troubleshooting

**Token acquisition fails:**

- Check client ID configuration
- Verify tenant ID (use 'organizations' for work accounts)
- Ensure user has Azure DevOps access
- Check for conditional access policies

**Silent refresh fails:**

- Refresh token may have expired (max 90 days)
- User needs to re-authenticate
- Show notification prompting sign-in

**401 errors persist after refresh:**

- User may not have correct permissions in Azure DevOps
- Check user is added to Azure DevOps organization
- Verify scopes are correct

### Resources

- [ENTRA_ID_AUTH.md](./ENTRA_ID_AUTH.md) - Full implementation guide
- [MSAL Node Docs](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-node)
- [Azure DevOps OAuth](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/oauth)

---

_Ready to integrate? Start with step 1 (Update activation.ts) and test each piece incrementally._
