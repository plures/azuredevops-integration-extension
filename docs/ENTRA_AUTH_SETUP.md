# Entra ID Authentication — Setup, Scopes & Troubleshooting

## Overview

This extension uses **Microsoft Entra ID** (formerly Azure Active Directory) as the primary
authentication mechanism for Azure DevOps. Personal Access Tokens (PATs) are retained as a
last-resort fallback behind an explicit opt-in setting.

---

## Authentication Flow Priority

```
1. Authorization Code + PKCE  ← PRIMARY (opens browser, no device code prompt)
       │
       └─ falls back to ─►
2. Device Code Flow            ← FALLBACK (when browser callback cannot complete)
       │
       └─ explicitly opt-in ─►
3. PAT (Personal Access Token) ← LAST RESORT (requires azureDevOpsIntegration.auth.allowPat = true)
```

The active flow is selected by `azureDevOpsIntegration.auth.flow`:

| Setting value | Behaviour |
|---|---|
| `auto` (default) | Auth Code + PKCE, device code on failure |
| `auth-code` | Force Auth Code + PKCE |
| `device-code` | Force Device Code (skip browser) |

---

## App Registration (Entra ID tenant)

### Option A — Use the built-in Visual Studio client ID (recommended)

The extension defaults to the **Visual Studio IDE client ID**
(`872cd9fa-d31f-45e0-9eab-6e460a02d1f1`). This public client is pre-consented for Azure DevOps
scopes across all Microsoft-managed tenants and requires no custom registration.

### Option B — Register your own app (corporate tenants with admin consent)

1. Sign in to <https://portal.azure.com> as a tenant admin.
2. Go to **Azure Active Directory → App registrations → New registration**.
3. Name: e.g. `Azure DevOps Integration (VSCode)`
4. Supported account types: **Accounts in this organisational directory only** (or *multitenant* if needed).
5. Redirect URI:
   - Platform: **Public client/native**
   - URI: `vscode-azuredevops-int://auth/callback`
6. Click **Register**.
7. Under **API Permissions → Add a permission → Azure DevOps**:

   | Permission | Type | Required for |
   |---|---|---|
   | `vso.work_write` | Delegated | Work item read/write (time tracking, comments) |
   | `vso.code` | Delegated | Source code read (branch context) |
   | `vso.build` | Delegated | Build definitions read |

8. Click **Grant admin consent** to pre-approve permissions for all users.
9. Copy the **Application (client) ID** and set it in VS Code settings:
   ```json
   "azureDevOpsIntegration.entra.defaultClientId": "<your-client-id>"
   ```

---

## Least-Privilege Scope Matrix

The extension requests the minimum scopes needed for its features. No `.default` scope is used.

| Scope | Azure DevOps permission | Used for |
|---|---|---|
| `vso.work_write` | Work items read + write | Querying work items, posting comments, logging time |
| `vso.code` | Source code read | Branch detection, commit context |
| `vso.build` | Build definitions read | Build status in work item cards |
| `offline_access` | — | Refresh token (silent re-auth, no re-prompt needed) |

Scopes are prefixed with the Azure DevOps resource ID:
`499b84ac-1321-427f-aa17-267ca6975798/<scope>`

---

## PAT Explicit Opt-In

PATs are retained for backwards compatibility but **not recommended**:

- PATs are long-lived credentials that can bypass Entra ID policy controls (MFA, Conditional
  Access, device compliance).
- Microsoft is deprecating PAT support for new Azure DevOps integrations.

To use PAT authentication, add to your VS Code settings:

```json
"azureDevOpsIntegration.auth.allowPat": true
```

A structured warning is logged to the output channel whenever PAT is used without this setting.

---

## Token Storage

| Token | Storage location | Cleared on |
|---|---|---|
| MSAL token cache (access + refresh) | VS Code `SecretStorage` | Sign-out |
| Account info (homeAccountId etc.) | VS Code `SecretStorage` | Sign-out |
| Raw access token (PAT) | VS Code `SecretStorage` | Connection removal |

**No tokens are stored in plain text.** The VS Code `SecretStorage` API encrypts secrets using the
OS keychain (Windows Credential Manager, macOS Keychain, libsecret on Linux).

Secret keys follow the pattern:
- `azureDevOpsInt.entra.tokenCache.<connectionId>` — MSAL serialised cache
- `azureDevOpsInt.entra.refreshToken.<connectionId>` — MSAL account info (not the raw token)

---

## Silent Re-Authentication

1. On each API call the extension checks whether the access token expires within 5 minutes.
2. If it does, `acquireTokenSilent` is called using the cached MSAL account — no user prompt.
3. Only if silent refresh fails (e.g. refresh token rotated, admin policy change) will the user see
   an interactive prompt.

---

## Telemetry

Structured auth events are emitted to the extension output channel under the `auth-telemetry`
logger. **No PII is captured.**

| Event | Key fields |
|---|---|
| `auth.success` | `connectionId`, `flow`, `scopeCount`, `silentRefresh`, `expiresInSeconds` |
| `auth.failure` | `connectionId`, `flow`, `reason`, `msalErrorCode`, `retryCount` |
| `auth.flow_selected` | `connectionId`, `flow`, `fallbackFromFlow` |
| `auth.pat_opt_in` | `connectionId`, `settingEnabled` |

Failure reasons include: `user_cancelled`, `admin_block`, `consent_required`, `mfa_required`,
`tenant_not_found`, `app_not_registered`, `timeout`, `token_exchange_failed`, `unknown`.

---

## Error Reference

| AADSTS code | Human-readable meaning | Resolution |
|---|---|---|
| `AADSTS90094` / `AADSTS90008` | Admin blocked consent | Ask tenant admin to grant consent |
| `AADSTS65001` | User has not consented to scopes | Re-run authentication and accept permissions |
| `AADSTS65004` | User declined consent | Re-run authentication and accept permissions |
| `AADSTS50076` | MFA required | Complete MFA challenge during interactive flow |
| `AADSTS50058` | Tenant not found | Check `tenantId` value in connection settings |
| `AADSTS700016` | App not found in tenant | Verify `clientId` or use Option A above |

---

## Configuration Reference

```jsonc
// .vscode/settings.json (or User settings)
{
  // Primary: Entra Auth Code + PKCE (recommended)
  "azureDevOpsIntegration.auth.flow": "auto",        // "auto" | "auth-code" | "device-code"
  "azureDevOpsIntegration.auth.useAuthCodeFlow": true,

  // Entra ID app identity
  "azureDevOpsIntegration.entra.defaultClientId": "872cd9fa-d31f-45e0-9eab-6e460a02d1f1",
  "azureDevOpsIntegration.entra.defaultTenantId": "organizations", // or your tenant GUID
  "azureDevOpsIntegration.entra.autoRefreshToken": true,

  // Last resort: PAT (must explicitly opt in)
  "azureDevOpsIntegration.auth.allowPat": false
}
```

Connection objects in `azureDevOpsIntegration.connections`:

```jsonc
{
  "id": "my-connection",
  "organization": "my-org",
  "project": "my-project",
  "authMethod": "entra",      // "pat" | "entra"  — use "entra"
  "tenantId": "organizations" // optional override per connection
}
```

---

## References

- [Microsoft Entra ID Documentation](https://learn.microsoft.com/en-us/entra/identity/)
- [Azure DevOps OAuth Scopes](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/oauth#scopes)
- [MSAL Node Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-node)
- [VS Code SecretStorage API](https://code.visualstudio.com/api/references/vscode-api#SecretStorage)
- [Authorization Code + PKCE (RFC 7636)](https://datatracker.ietf.org/doc/html/rfc7636)
