# Entra ID Authentication Migration Plan - UPDATED

## From Device Code Flow to Authorization Code Flow with PKCE

**Last Updated**: After src/fsm/ directory cleanup  
**Status**: Ready for Implementation

## Executive Summary

This document outlines the migration plan from device code flow to OAuth 2.0 Authorization Code Flow with PKCE (Proof Key for Code Exchange) for authenticating the VSCode extension against Azure DevOps via Microsoft Entra ID. The authorization code flow with PKCE is the recommended approach for public clients (like VSCode extensions) and provides a more seamless user experience.

**Important**: This plan has been updated to reflect the recent codebase reorganization:

- All FSM references removed, using Praxis terminology
- Updated file paths to reflect new directory structure (`src/services/`, `src/logging/`, `src/types/`, etc.)
- Integration points updated to use `ConnectionService`, `ConnectionDriver`, and Praxis engines

## Current State Analysis

### Current Implementation

The extension currently uses **Device Code Flow** (`acquireTokenByDeviceCode`) which:

- Requires users to manually enter a code in a browser
- Has a 15-minute timeout window
- Creates friction in the authentication experience
- Is not the recommended flow for VSCode extensions

**Key Files (Updated Paths):**

- `src/auth/entraAuthProvider.ts` - Main authentication provider using MSAL device code flow
- `src/services/auth/authentication.ts` - Authentication helper functions (getEntraIdToken, getPat, clearEntraIdToken)
- `src/services/connection/connectionManagerHelpers.ts` - Connection lifecycle helpers (performAuthentication, createClient, createProvider)
- `src/praxis/connection/service.ts` - ConnectionService managing Praxis connection managers (singleton)
- `src/praxis/connection/driver.ts` - ConnectionDriver handling connection lifecycle polling and state transitions
- `src/praxis/connection/manager.ts` - PraxisConnectionManager for connection state management
- `src/praxis/auth/` - Praxis authentication engine, rules, and facts
- `src/praxis/application/` - Praxis application engine managing overall application state

### Architecture Patterns

The extension follows:

- **Praxis-based state management** (Logic engine with Facts, Rules, and Flows)
- **Event-driven architecture** with typed events dispatched via `dispatchApplicationEvent` in `src/activation.ts`
- **Service layer pattern** (`ConnectionService`, `EntraAuthProvider`, `AuthService`)
- **Driver pattern** (`ConnectionDriver` polls and drives connection lifecycle)
- **Secret storage** via VSCode's `SecretStorage` API
- **MSAL Node.js** (`@azure/msal-node`) for authentication
- **Component-based logging** (`ComponentLogger` from `src/logging/ComponentLogger.ts`)

## Recommended Solution: Authorization Code Flow with PKCE

### Why Authorization Code Flow with PKCE?

1. **Microsoft Recommendation**: Authorization code flow with PKCE is the recommended OAuth 2.0 flow for public clients (VSCode extensions)
2. **Better UX**: Users authenticate directly in browser without manual code entry
3. **Security**: PKCE mitigates authorization code interception attacks
4. **Seamless**: Can leverage VSCode's built-in URI handler for redirects
5. **Future-proof**: Aligns with Microsoft's long-term authentication strategy

### How It Works

1. **Generate PKCE Parameters**: Create code verifier and code challenge
2. **Initiate Authorization**: Open browser with authorization URL containing code challenge
3. **User Authenticates**: User signs in via browser (no code entry needed)
4. **Handle Redirect**: VSCode extension receives redirect via custom URI scheme
5. **Exchange Code**: Exchange authorization code + code verifier for access token
6. **Store Tokens**: Securely store tokens using existing secret storage

## Implementation Plan

### Phase 1: Infrastructure Setup

#### 1.1 Register Custom URI Scheme

**File**: `package.json`

Add URI handler registration to `contributes` section:

```json
{
  "contributes": {
    "uriHandlers": [
      {
        "uri": "vscode-azuredevops-int",
        "label": "Azure DevOps Integration Auth"
      }
    ]
  }
}
```

**Action Items:**

- [ ] Add URI handler to package.json
- [ ] Test URI handler registration
- [ ] Document URI scheme in README

#### 1.2 Add PKCE Utility Functions

**New File**: `src/services/auth/pkceUtils.ts`

**Note**: Placed in `src/services/auth/` to align with the new directory structure where authentication helpers are located.

Create utilities for PKCE code generation:

```typescript
import * as crypto from 'crypto';

export interface PKCEParams {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

/**
 * Generate PKCE parameters for authorization code flow
 */
export function generatePKCEParams(): PKCEParams {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
  };
}

function generateCodeVerifier(): string {
  return base64URLEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier: string): string {
  return base64URLEncode(crypto.createHash('sha256').update(verifier).digest());
}

function base64URLEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
```

**Action Items:**

- [ ] Create `src/services/auth/pkceUtils.ts`
- [ ] Implement PKCE generation functions
- [ ] Add unit tests (`tests/services/auth/pkceUtils.test.ts`)
- [ ] Document PKCE parameter generation

#### 1.3 Create Authorization Code Flow Provider

**New File**: `src/services/auth/authorizationCodeProvider.ts`

Create a new provider implementing authorization code flow:

```typescript
import * as msal from '@azure/msal-node';
import * as vscode from 'vscode';
import { generatePKCEParams, PKCEParams } from './pkceUtils.js';
import { createLogger } from '../../logging/unifiedLogger.js';
import { createComponentLogger, Component } from '../../logging/ComponentLogger.js';

const logger = createLogger('authCodeFlow');
const componentLogger = createComponentLogger(Component.AUTH, 'AuthorizationCodeFlowProvider');

export interface AuthorizationCodeFlowOptions {
  config: {
    clientId: string;
    tenantId?: string;
    scopes?: string[];
  };
  secretStorage: vscode.SecretStorage;
  connectionId: string;
  redirectUri: string;
  onStatusUpdate?: (connectionId: string, status: any) => void;
}

export class AuthorizationCodeFlowProvider {
  private msalClient: msal.PublicClientApplication;
  private secretStorage: vscode.SecretStorage;
  private connectionId: string;
  private redirectUri: string;
  private pkceParams?: PKCEParams;
  private pendingAuthState?: string;

  constructor(options: AuthorizationCodeFlowOptions) {
    // Initialize MSAL client similar to EntraAuthProvider
    // Store PKCE params temporarily (in-memory or secure storage)
  }

  /**
   * Initiate authorization code flow with PKCE
   */
  async authenticate(forceInteractive: boolean = false): Promise<AuthenticationResult> {
    // 1. Try silent authentication first (unless forced)
    // 2. Generate PKCE parameters
    // 3. Build authorization URL
    // 4. Open browser
    // 5. Wait for redirect URI handler
    // 6. Exchange code for token
  }

  /**
   * Handle redirect URI with authorization code
   */
  async handleRedirectUri(uri: vscode.Uri): Promise<AuthenticationResult> {
    // 1. Parse authorization code and state from URI
    // 2. Verify state matches pending auth
    // 3. Exchange code + verifier for token
    // 4. Store tokens securely
  }
}
```

**Action Items:**

- [ ] Create `src/services/auth/authorizationCodeProvider.ts`
- [ ] Implement authorization URL generation
- [ ] Implement redirect URI handling
- [ ] Implement token exchange logic using MSAL
- [ ] Integrate with `ConnectionService` for connection lifecycle management
- [ ] Add error handling and logging using ComponentLogger
- [ ] Dispatch Praxis events for state updates

### Phase 2: Integration with Existing Architecture

#### 2.1 Update EntraAuthProvider and Connection Helpers

**Files**:

- `src/auth/entraAuthProvider.ts` - Main provider
- `src/services/auth/authentication.ts` - Helper functions (getEntraIdToken)
- `src/services/connection/connectionManagerHelpers.ts` - Connection lifecycle helpers

Add support for authorization code flow alongside device code flow (backward compatibility):

```typescript
// In src/auth/entraAuthProvider.ts
export class EntraAuthProvider implements IAuthProvider {
  private useAuthCodeFlow: boolean = false; // Feature flag

  async authenticate(forceInteractive: boolean = false): Promise<AuthenticationResult> {
    if (this.useAuthCodeFlow) {
      return this.authenticateWithAuthCodeFlow(forceInteractive);
    }
    // Existing device code flow...
  }

  private async authenticateWithAuthCodeFlow(forceInteractive: boolean): Promise<AuthenticationResult> {
    // Delegate to AuthorizationCodeFlowProvider
  }
}

// In src/services/auth/authentication.ts
export async function getEntraIdToken(
  context: ExtensionContext,
  tenantId?: string,
  options: GetEntraIdTokenOptions = {}
): Promise<string> {
  // Add support for auth code flow when feature flag enabled
  // Fall back to device code flow if auth code flow fails
}

// In src/services/connection/connectionManagerHelpers.ts
export async function performAuthentication(
  manager: PraxisConnectionManager,
  config: ProjectConnection,
  context: ExtensionContext,
  force?: boolean,
  onDeviceCode?: (info: {...}) => void
): Promise<void> {
  // Check if auth code flow is enabled
  // Use AuthorizationCodeFlowProvider if enabled
  // Otherwise use existing device code flow
}
```

**Action Items:**

- [ ] Add feature flag for auth code flow in `EntraAuthProvider`
- [ ] Update `src/services/auth/authentication.ts` `getEntraIdToken` to support auth code flow
- [ ] Update `src/services/connection/connectionManagerHelpers.ts` `performAuthentication` to use auth code flow when enabled
- [ ] Add method to delegate to `AuthorizationCodeFlowProvider`
- [ ] Maintain backward compatibility with device code flow
- [ ] Add configuration option to choose flow
- [ ] Update `src/praxis/connection/driver.ts` to handle auth code flow state transitions

#### 2.2 Update Praxis Authentication Engine

**File**: `src/praxis/auth/facts.ts` and `src/praxis/auth/rules.ts`

Update Praxis authentication rules and facts to support authorization code flow:

```typescript
// In src/praxis/auth/facts.ts - Add new events
export const AuthCodeFlowStartedEvent = defineEvent<
  'AUTH_CODE_FLOW_STARTED',
  {
    connectionId: string;
    authorizationUrl: string;
    expiresInSeconds: number;
  }
>('AUTH_CODE_FLOW_STARTED');

export const AuthRedirectReceivedEvent = defineEvent<
  'AUTH_REDIRECT_RECEIVED',
  {
    connectionId: string;
    authorizationCode: string;
    state: string;
  }
>('AUTH_REDIRECT_RECEIVED');

// In src/praxis/auth/rules.ts - Add new rules
export const handleAuthCodeFlowStartRule = defineRule<AuthEngineContext>({
  id: 'auth.codeFlow.start',
  description: 'Start authorization code flow with PKCE',
  impl: (state, events) => {
    const event = findEvent(events, StartAuthCodeFlowEvent);
    if (!event) return [];

    // Generate PKCE params and authorization URL
    // Update context with pending auth state
    return [];
  },
});
```

**Action Items:**

- [ ] Add auth code flow events to `src/praxis/auth/facts.ts`
- [ ] Add auth code flow rules to `src/praxis/auth/rules.ts`
- [ ] Update `src/praxis/connection/manager.ts` to handle auth code flow
- [ ] Update `src/praxis/connection/driver.ts` to drive auth code flow lifecycle
- [ ] Add context properties for pending auth requests in `src/praxis/auth/types.ts`

#### 2.3 Register URI Handler in Activation

**File**: `src/activation.ts`

Register URI handler in `activate()` function:

```typescript
export async function activate(context: vscode.ExtensionContext) {
  // Existing activation code...

  // Register URI handler for authorization code flow
  const uriHandler = vscode.window.registerUriHandler({
    handleUri: async (uri: vscode.Uri) => {
      if (uri.path === '/auth/callback') {
        // Extract connection ID from state parameter
        // Route to appropriate connection's auth handler
        await handleAuthRedirect(uri, context);
      }
    },
  });

  context.subscriptions.push(uriHandler);
}

async function handleAuthRedirect(uri: vscode.Uri, context: vscode.ExtensionContext) {
  // Parse URI parameters
  // Extract connectionId from state parameter
  // Get ConnectionService instance
  // Find pending auth request for connection
  // Complete authentication via ConnectionService
  // Dispatch AUTH_REDIRECT_RECEIVED event to Praxis application engine
  // Update Praxis application context via dispatchApplicationEvent
}
```

**Action Items:**

- [ ] Register URI handler in `src/activation.ts` `activate()` function
- [ ] Implement redirect URI handler function
- [ ] Add routing logic to connect redirects to `ConnectionService` instances
- [ ] Dispatch `AUTH_REDIRECT_RECEIVED` event to Praxis application engine
- [ ] Update `ConnectionDriver` to handle auth code flow state transitions
- [ ] Add error handling for invalid redirects
- [ ] Store PKCE params temporarily (in-memory Map keyed by connectionId)

#### 2.4 Update Praxis Application Events and Facts

**File**: `src/praxis/application/facts.ts`

Add new events for authorization code flow to the Praxis application engine. These events will be dispatched via `dispatchApplicationEvent` in `src/activation.ts`:

```typescript
// Add to existing application events
export const AuthCodeFlowStartedAppEvent = defineEvent<
  'AUTH_CODE_FLOW_STARTED',
  {
    connectionId: string;
    authorizationUrl: string;
    expiresInSeconds: number;
  }
>('AUTH_CODE_FLOW_STARTED');

export const AuthCodeFlowCompletedAppEvent = defineEvent<
  'AUTH_CODE_FLOW_COMPLETED',
  {
    connectionId: string;
    success: boolean;
    error?: string;
  }
>('AUTH_CODE_FLOW_COMPLETED');

export const AuthRedirectReceivedAppEvent = defineEvent<
  'AUTH_REDIRECT_RECEIVED',
  {
    connectionId: string;
    authorizationCode: string;
    state: string;
  }
>('AUTH_REDIRECT_RECEIVED');
```

**Action Items:**

- [ ] Add new event types to `src/praxis/application/facts.ts`
- [ ] Update `src/praxis/application/rules/` to handle new events
- [ ] Update `src/praxis/application/types.ts` context types
- [ ] Add UI state properties for auth code flow in application context
- [ ] Update `src/services/connection/connectionManagerHelpers.ts` to support auth code flow
- [ ] Update `src/praxis/connection/driver.ts` to handle auth code flow state transitions

### Phase 3: UI Updates

#### 3.1 Update Auth Reminder Component

**File**: `src/webview/components/AuthReminder.svelte`

Update UI to show authorization code flow status instead of device code:

```svelte
{#if showAuthCodeFlow}
  <!-- Authorization Code Flow Banner -->
  <div class="auth-banner auth-code-flow">
    <div class="auth-message">
      <span class="auth-icon">$(browser)</span>
      <span>
        Authentication in progress: Complete sign-in in your browser
        ({authCodeFlowExpiresInMinutes}m left)
      </span>
    </div>
    <div class="auth-actions">
      <button class="auth-action" onclick={openAuthUrl}>
        Open Browser
      </button>
      <button class="auth-action" onclick={cancelAuthCodeFlow}>
        Cancel
      </button>
    </div>
  </div>
{/if}
```

**Action Items:**

- [ ] Update AuthReminder component for auth code flow
- [ ] Remove device code UI elements (or make conditional)
- [ ] Add browser opening functionality
- [ ] Add cancel/retry functionality
- [ ] Update to read from Praxis application context (not FSM context)

#### 3.2 Update Status Bar

**File**: `src/activation.ts`

Update status bar to show auth code flow status:

```typescript
// In updateAuthStatusBar() function
if (isAuthCodeFlowInProgress) {
  authStatusBarItem.text = '$(browser) Entra: Signing in...';
  authStatusBarItem.tooltip = `Complete sign-in in browser for ${connectionLabel}`;
}
```

**Action Items:**

- [ ] Update status bar text for auth code flow
- [ ] Add appropriate icons
- [ ] Update tooltips
- [ ] Read auth code flow state from Praxis application context

### Phase 4: Testing & Validation

#### 4.1 Unit Tests

**New File**: `tests/services/auth/pkceUtils.test.ts`

Test PKCE parameter generation:

```typescript
import { describe, it, expect } from 'vitest';
import { generatePKCEParams } from '../../../src/services/auth/pkceUtils.js';

describe('PKCE Utils', () => {
  it('should generate valid code verifier', () => {
    const params = generatePKCEParams();
    expect(params.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
  });

  it('should generate valid code challenge', () => {
    const params = generatePKCEParams();
    expect(params.codeChallenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(params.codeChallengeMethod).toBe('S256');
  });

  it('should generate unique parameters', () => {
    const params1 = generatePKCEParams();
    const params2 = generatePKCEParams();
    expect(params1.codeVerifier).not.toBe(params2.codeVerifier);
    expect(params1.codeChallenge).not.toBe(params2.codeChallenge);
  });
});
```

**Action Items:**

- [ ] Write unit tests for PKCE utilities
- [ ] Write unit tests for authorization code provider
- [ ] Write unit tests for URI handler
- [ ] Achieve >90% coverage

#### 4.2 Integration Tests

**New File**: `tests/integration/authCodeFlow.test.ts`

**Note**: Integration tests should test the full flow including:

- `ConnectionService.connect()` with auth code flow
- `ConnectionDriver.waitForConnection()` handling auth code flow states
- URI handler registration and redirect handling
- Praxis event dispatching and context updates

Test end-to-end authorization code flow:

```typescript
describe('Authorization Code Flow Integration', () => {
  it('should complete authentication flow', async () => {
    // Mock browser redirect
    // Test full flow through ConnectionService -> ConnectionDriver -> AuthorizationCodeFlowProvider
    // Verify Praxis events are dispatched
    // Verify tokens are stored
  });

  it('should handle redirect errors', async () => {
    // Test error scenarios
  });

  it('should handle expired auth requests', async () => {
    // Test timeout scenarios
  });
});
```

**Action Items:**

- [ ] Write integration tests for auth code flow
- [ ] Test with mock redirects
- [ ] Test error scenarios
- [ ] Test token refresh
- [ ] Test Praxis event dispatching

#### 4.3 Manual Testing Checklist

- [ ] Test authentication with work account
- [ ] Test authentication with personal account
- [ ] Test authentication with MFA
- [ ] Test token refresh
- [ ] Test sign-out and re-authentication
- [ ] Test error handling (network failures, invalid redirects)
- [ ] Test on Windows, macOS, Linux
- [ ] Test with different browsers

### Phase 5: Migration Strategy

#### 5.1 Feature Flag Approach

Use feature flags to gradually roll out:

```typescript
// In configuration
{
  "azureDevOpsIntegration": {
    "useAuthCodeFlow": false, // Default to device code for backward compatibility
    "authFlow": "auto" // or "device-code" | "auth-code"
  }
}
```

**Action Items:**

- [ ] Add feature flag configuration
- [ ] Implement feature flag checking
- [ ] Document feature flag usage
- [ ] Plan rollout strategy

#### 5.2 Backward Compatibility

Maintain device code flow as fallback:

```typescript
// In src/services/auth/authentication.ts
async function getEntraIdToken(
  context: ExtensionContext,
  tenantId?: string,
  options: GetEntraIdTokenOptions = {}
): Promise<string> {
  try {
    if (useAuthCodeFlow) {
      return await getEntraIdTokenViaAuthCodeFlow(context, tenantId, options);
    }
  } catch (error) {
    logger.warn('Auth code flow failed, falling back to device code', { meta: error });
    // Fallback to device code flow
  }

  return await getEntraIdTokenViaDeviceCodeFlow(context, tenantId, options);
}
```

**Action Items:**

- [ ] Implement fallback mechanism in `src/services/auth/authentication.ts`
- [ ] Add logging for fallback scenarios using ComponentLogger
- [ ] Document fallback behavior
- [ ] Test fallback scenarios

#### 5.3 Gradual Rollout Plan

1. **Phase 1 (Week 1-2)**: Internal testing with feature flag disabled
2. **Phase 2 (Week 3)**: Enable for beta testers via feature flag
3. **Phase 3 (Week 4)**: Enable for 25% of users (via feature flag)
4. **Phase 4 (Week 5)**: Enable for 50% of users
5. **Phase 5 (Week 6)**: Enable for 100% of users
6. **Phase 6 (Week 7+)**: Remove device code flow (optional, keep as fallback)

**Action Items:**

- [ ] Create rollout plan document
- [ ] Set up feature flag infrastructure
- [ ] Monitor error rates during rollout
- [ ] Collect user feedback

### Phase 6: Documentation & Communication

#### 6.1 Update Documentation

**Files to Update:**

- `README.md` - Update authentication section
- `docs/ENTRA_ID_AUTH.md` - Document new flow
- `CHANGELOG.md` - Document changes
- `docs/SECURITY.md` - Update security considerations

**Action Items:**

- [ ] Update README with new authentication flow
- [ ] Document migration from device code flow
- [ ] Add troubleshooting guide
- [ ] Update security documentation

#### 6.2 User Communication

**Action Items:**

- [ ] Draft release notes explaining new flow
- [ ] Create migration guide for users
- [ ] Update in-extension help text
- [ ] Prepare support documentation

## Technical Considerations

### Security

1. **PKCE Implementation**: Ensure proper code verifier/challenge generation
2. **State Parameter**: Use cryptographically random state for CSRF protection
3. **Token Storage**: Continue using VSCode SecretStorage API
4. **Redirect URI Validation**: Validate redirect URIs match registered scheme
5. **Token Refresh**: Implement proper refresh token handling

### Performance

1. **PKCE Generation**: Should be <10ms
2. **Browser Opening**: Should be <100ms
3. **Token Exchange**: Should be <500ms
4. **Overall Auth Time**: Target <30 seconds (user-dependent)

### Compatibility

1. **VSCode Version**: Requires VSCode 1.99+ (already required)
2. **Platform Support**: Windows, macOS, Linux
3. **Browser Support**: Default system browser
4. **Network Requirements**: HTTPS endpoints

### Error Handling

1. **Network Failures**: Retry with exponential backoff
2. **Invalid Redirects**: Clear error messages
3. **Expired Auth Requests**: Auto-retry with new flow
4. **User Cancellation**: Graceful handling

## Integration Points

### ConnectionService Integration

The `ConnectionService` (`src/praxis/connection/service.ts`) will:

- Check feature flag for auth code flow
- Create `AuthorizationCodeFlowProvider` when enabled
- Pass provider to `ConnectionDriver` for lifecycle management
- Handle redirect URI callbacks via URI handler

### ConnectionDriver Integration

The `ConnectionDriver` (`src/praxis/connection/driver.ts`) will:

- Poll for auth code flow state transitions
- Drive the authentication process through state machine
- Handle timeout scenarios
- Update status bar via callback

### Praxis Event Integration

Events will be dispatched via `dispatchApplicationEvent` in `src/activation.ts`:

- `AUTH_CODE_FLOW_STARTED` - When browser opens
- `AUTH_REDIRECT_RECEIVED` - When redirect URI received
- `AUTH_CODE_FLOW_COMPLETED` - When authentication completes

These events update the Praxis application context, which drives UI updates reactively.

## Dependencies

### New Dependencies

None required - using existing `@azure/msal-node` which supports authorization code flow.

### Updated Dependencies

- `@azure/msal-node`: Already supports authorization code flow (verify version compatibility)

## Success Metrics

### User Experience Metrics

- **Authentication Success Rate**: >95% (target)
- **Average Auth Time**: <30 seconds (target)
- **User Satisfaction**: Positive feedback on UX improvement

### Technical Metrics

- **Error Rate**: <1% of auth attempts
- **Fallback Rate**: <5% (device code fallback)
- **Token Refresh Success**: >98%

## Risks & Mitigation

### Risk 1: URI Handler Not Working

**Mitigation**:

- Test on all platforms during development
- Provide fallback to device code flow
- Add diagnostic logging using ComponentLogger

### Risk 2: Browser Not Opening

**Mitigation**:

- Use VSCode's `openExternal` API (already used)
- Provide manual URL copy option
- Add troubleshooting guide

### Risk 3: Redirect URI Mismatch

**Mitigation**:

- Validate redirect URI format
- Use consistent URI scheme
- Add clear error messages

### Risk 4: Token Exchange Failures

**Mitigation**:

- Implement retry logic
- Log detailed error information using ComponentLogger
- Provide fallback to device code flow

## Timeline Estimate

- **Phase 1 (Infrastructure)**: 1-2 weeks
- **Phase 2 (Integration)**: 1-2 weeks
- **Phase 3 (UI Updates)**: 1 week
- **Phase 4 (Testing)**: 1-2 weeks
- **Phase 5 (Migration)**: 2-3 weeks
- **Phase 6 (Documentation)**: 1 week

**Total Estimated Time**: 7-11 weeks

## Next Steps

1. **Review and Approve Plan**: Get stakeholder approval
2. **Create Feature Branch**: `feature/auth-code-flow-pkce`
3. **Start Phase 1**: Begin infrastructure setup
4. **Set Up Tracking**: Create GitHub issues for each phase
5. **Schedule Reviews**: Plan code review checkpoints

## References

- [Microsoft Identity Platform - OAuth 2.0 Authorization Code Flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [PKCE RFC 7636](https://www.rfc-editor.org/rfc/rfc7636)
- [VSCode URI Handler API](https://code.visualstudio.com/api/references/vscode-api#window.registerUriHandler)
- [MSAL Node.js - Authorization Code Flow](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-node)

## Appendix: Code Examples

### Example: Authorization URL Generation

```typescript
function buildAuthorizationUrl(
  clientId: string,
  tenantId: string,
  redirectUri: string,
  scopes: string[],
  codeChallenge: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: scopes.join(' '),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state,
  });

  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
}
```

### Example: Token Exchange

```typescript
async function exchangeCodeForToken(
  authorizationCode: string,
  codeVerifier: string,
  redirectUri: string,
  clientId: string,
  tenantId: string
): Promise<msal.AuthenticationResult> {
  const tokenRequest: msal.AuthorizationCodeRequest = {
    code: authorizationCode,
    codeVerifier: codeVerifier,
    redirectUri: redirectUri,
    scopes: [AZURE_DEVOPS_SCOPE, OFFLINE_ACCESS_SCOPE],
  };

  const pca = new msal.PublicClientApplication({
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
  });

  return await pca.acquireTokenByCode(tokenRequest);
}
```

### Example: ConnectionDriver Integration

```typescript
// In src/praxis/connection/driver.ts
// Update waitForConnection to handle auth code flow states

if (state === 'authenticating' && !authStarted) {
  authStarted = true;
  if (this.context) {
    const useAuthCodeFlow = config.authMethod === 'entra' && /* feature flag */;

    if (useAuthCodeFlow) {
      // Start auth code flow
      await startAuthCodeFlow(manager, config, this.context, forceInteractive);
    } else {
      // Use device code flow
      performAuthentication(manager, config, this.context, forceInteractive).catch((err) => {
        componentLogger.error(`Auth error: ${err}`);
      });
    }
  }
}
```

---

**Document Version**: 2.0  
**Last Updated**: After src/fsm/ cleanup  
**Status**: Ready for Implementation
