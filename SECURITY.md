# Security & Trust Notice

Thank you for choosing the Azure DevOps Integration extension. We take your security and privacy seriously. This document explains how the extension handles authentication, data access, and runtime security.

---

## 1. Authentication

- We use the Microsoft Authentication Library (MSAL) to authenticate via **device code flow** or **interactive login**.
- No secrets or passwords are ever stored in plain text.
- All tokens are stored securely using VS Code’s SecretStorage API.
- You will be prompted before any authentication or token refresh operation.

### VS Code Security Framework

VS Code enforces runtime security through:

- Publisher trust prompts
- Extension permission transparency
- Marketplace protections against malicious updates
- Sandboxed webview execution with Content Security Policy (CSP)

### Open Source Transparency

This extension's source code is fully published on GitHub for your review:

**Repository**: [azuredevops-integration-extension](https://github.com/plures/azuredevops-integration-extension)

### Security-Critical Code Locations

- **Authentication Implementation**: [`src/auth/`](https://github.com/plures/azuredevops-integration-extension/tree/main/src/auth)
- **API Client Security**: [`src/azureClient.ts`](https://github.com/plures/azuredevops-integration-extension/blob/main/src/azureClient.ts)
- **Webview Security**: [`src/webview/`](https://github.com/plures/azuredevops-integration-extension/tree/main/src/webview)
- **Secure Token Management**: [`src/activation.ts`](https://github.com/plures/azuredevops-integration-extension/blob/main/src/activation.ts)

- **Encrypted Storage**: Access tokens and refresh tokens are encrypted in VS Code's SecretStorage API
- **Per-Connection Storage**: Tokens are isolated per Azure DevOps connection
- **No Long-lived Secrets**: MSAL automatically refreshes tokens; no permanent credentials stored
- **Background Refresh**: Tokens refresh automatically every 30 minutes to prevent interruptions
- **Clipboard Handling**: Device codes are only copied to your clipboard if you choose **Open Browser**, letting you paste the short-lived code directly into the Microsoft verification page.

### Token Cleanup Commands

- **Entra ID Sign Out**: `Azure DevOps Integration: Sign Out from Entra ID`
- **PAT Cleanup**: Handled through connection management
- **Complete Cleanup**: Remove connection entirely to clear all associated tokens

### Code Implementation

Token storage security is implemented in:

- **Secure Storage**: [`src/auth/EntraAuthProvider.ts#L223-L248`](https://github.com/plures/azuredevops-integration-extension/blob/main/src/auth/EntraAuthProvider.ts#L223-L248)
- **Background Refresh**: [`src/activation.ts#L180-L203`](https://github.com/plures/azuredevops-integration-extension/blob/main/src/activation.ts#L180-L203)
- **Device Code Flow & Clipboard Safety**: [`src/activation.ts#L830-L880`](https://github.com/plures/azuredevops-integration-extension/blob/main/src/activation.ts#L830-L880) – copies the device code only after you choose **Open Browser**, then launches the Microsoft sign-in page.
- **Limited Scope**: Requests only Azure DevOps access (`499b84ac-1321-427f-aa17-267ca6975798/.default`)
- **No Broad Permissions**: Does not request Microsoft Graph, email, or directory access
- **Automatic Token Refresh**: Background refresh every 30 minutes prevents interruptions
- **Enterprise Compatible**: Works with your organization's conditional access and MFA policies

### Personal Access Token (PAT) - Legacy Support

- Traditional token-based authentication for backwards compatibility
- Tokens stored securely using VS Code's SecretStorage API
- No secrets or passwords are ever stored in plain text

### Code References

- **Entra ID Implementation**: [`src/auth/EntraAuthProvider.ts`](https://github.com/plures/azuredevops-integration-extension/blob/main/src/auth/EntraAuthProvider.ts)
- **Authentication Interface**: [`src/auth/types.ts`](https://github.com/plures/azuredevops-integration-extension/blob/main/src/auth/types.ts)
- **Auth Service**: [`src/auth/AuthService.ts`](https://github.com/plures/azuredevops-integration-extension/blob/main/src/auth/AuthService.ts)

You will be prompted before any authentication or token refresh operation.

## 2. Permissions & Least Privilege

### Minimal Scope Implementation

The extension implements the **principle of least privilege** by requesting only Azure DevOps access:

- **Azure DevOps Resource ID**: `499b84ac-1321-427f-aa17-267ca6975798` (Azure DevOps service principal)
- **Scope**: `.default` - Only permissions assigned to the app registration
- **No Microsoft Graph**: Does not request user profile, email, or directory data
- **No Broad Access**: Limited to Azure DevOps APIs only

#### Understanding the Resource ID

The UUID `499b84ac-1321-427f-aa17-267ca6975798` is Microsoft's **well-known Azure DevOps service principal ID**, constant across all Azure AD tenants. This is not something we invented—it's Microsoft's official standard.

**How we discovered this:**

- **Microsoft Documentation**: Specified in Azure DevOps OAuth documentation
- **Industry Standard**: Used by Azure CLI, PowerShell modules, and other Azure DevOps tools
- **Security Best Practice**: Using specific resource IDs instead of broad Microsoft Graph scopes

**Security benefits:**

```typescript
// ❌ This would request broad Microsoft Graph access
const GRAPH_SCOPES = ['https://graph.microsoft.com/.default'];

// ✅ This requests ONLY Azure DevOps access (what we use)
const AZURE_DEVOPS_SCOPES = ['499b84ac-1321-427f-aa17-267ca6975798/.default'];
```

This ensures tokens can **only** access Azure DevOps APIs and cannot access user profiles, emails, or other Microsoft services.

#### Understanding `.default` Scope

The `.default` scope is a special OAuth 2.0 scope that means **"grant all permissions that have been pre-configured for this app in Azure AD"**.

**What `.default` provides today:**

The `.default` scope grants **ONLY the permissions that have been explicitly configured for the application registration in Azure AD by administrators**. By default, a new Azure DevOps app registration starts with **ZERO permissions** until administrators explicitly grant them.

**Critical Understanding: `.default` ≠ Automatic Permissions**

- ✅ **Admin-Controlled**: Only grants permissions explicitly assigned by IT administrators in Azure AD
- ✅ **Zero by Default**: New app registrations have NO permissions until admins add them
- ✅ **Explicit Consent**: Each permission must be intentionally granted by administrators
- ✅ **Transparent**: Exact permissions visible in Azure AD Enterprise Applications

**Common Administrator-Assigned Permissions (when granted):**

When administrators configure Azure DevOps access, they typically assign these **delegated permissions**:

- **`vso.work`** - Work items (read): Read work items, queries, boards, and execute queries
- **`vso.work_write`** - Work items (read and write): Create and update work items and queries
- **`vso.code`** - Code (read): Read source code, commits, branches, and version control artifacts
- **`vso.project`** - Project and team (read): Read projects and teams information
- **`vso.profile`** - User profile (read): Read basic profile information

**What `.default` does NOT automatically include:**

- ❌ **No Default Permissions**: `.default` grants nothing unless explicitly configured
- ❌ **Microsoft Graph access** (`https://graph.microsoft.com/*`)
- ❌ **Admin permissions** (`vso.*_manage` scopes) - require explicit administrative approval
- ❌ **Full access scopes** (`vso.*_full` scopes) - require explicit administrative approval
- ❌ **Build execution** (`vso.build_execute`) - requires explicit administrative approval
- ❌ **Security management** (`vso.security_manage`) - requires explicit administrative approval

**What Our Extension Gets Today (Specific Implementation):**

For **enterprise deployments**, administrators typically configure these permissions for VS Code extensions like ours:

```text
Minimum Required Permissions (Read-Only):
✅ vso.project     - Read projects and teams
✅ vso.work        - Read work items, queries, boards
✅ vso.code        - Read source code and repositories
✅ vso.profile     - Read user profile information

Enhanced Permissions (Read-Write, when needed):
⚠️ vso.work_write  - Create and update work items (optional)
⚠️ vso.code_write  - Create branches and pull requests (optional)
```

**How to Check What Permissions Are Actually Assigned:**

To know exactly what `.default` will grant our extension, you need to check what permissions have been configured for Azure DevOps in your Azure AD tenant:

#### Option 1: Azure Portal (Enterprise Applications)

1. Go to [Azure Portal](https://portal.azure.com) → Microsoft Entra ID → Enterprise Applications
2. Search for "Azure DevOps" or filter by "Microsoft Applications"
3. Click on the Azure DevOps service principal (App ID: `499b84ac-1321-427f-aa17-267ca6975798`)
4. Go to "Permissions" tab to see all granted permissions
5. Look for **Delegated permissions** - these are what `.default` will include

#### Option 2: PowerShell Query

```powershell
# Connect to Microsoft Graph
Connect-MgGraph -Scopes "Application.Read.All"

# Get Azure DevOps service principal permissions
$azureDevOpsAppId = "499b84ac-1321-427f-aa17-267ca6975798"
$servicePrincipal = Get-MgServicePrincipal -Filter "appId eq '$azureDevOpsAppId'"
Get-MgServicePrincipalOauth2PermissionGrant -ServicePrincipalId $servicePrincipal.Id
```

#### Option 3: Microsoft Graph API

```bash
# GET request to check delegated permissions
GET https://graph.microsoft.com/v1.0/servicePrincipals?$filter=appId eq '499b84ac-1321-427f-aa17-267ca6975798'&$expand=oauth2PermissionGrants
```

**What You'll Find:**

Most enterprises configure these **standard delegated permissions** for Azure DevOps:

- `vso.project` - Read projects and teams
- `vso.work` - Read work items, queries, boards
- `vso.code` - Read source code and repositories
- `vso.profile` - Read user profile information

**Enhanced permissions** (if configured):

- `vso.work_write` - Create/update work items
- `vso.code_write` - Create branches/PRs

**Critical Point for Our Extension:**

If your Azure AD tenant has **NOT** configured any delegated permissions for Azure DevOps (App ID `499b84ac-1321-427f-aa17-267ca6975798`), then:

⚠️ **`.default` = ZERO ACCESS** - Extension will fail to authenticate or access any Azure DevOps data

✅ **Solution**: IT Admin must add delegated permissions in Azure AD Enterprise Applications for Azure DevOps service principal

**Minimum Required for Our Extension to Function:**

```text
Required Delegated Permissions:
✅ vso.project     - Read projects (to list available projects)
✅ vso.work        - Read work items (basic functionality)
🔥 vso.work_write  - Create/update work items (CORE FEATURE - REQUIRED)
✅ vso.code        - Read repositories (for branch/commit info)
✅ vso.profile     - Read user profile (for display name)

Optional (for enhanced features):
⚠️ vso.code_write  - Create branches and pull requests
```

**Alternative scope approaches:**

```typescript
// ❌ Too broad - requests ALL possible Azure DevOps permissions
const ALL_SCOPES = ['499b84ac-1321-427f-aa17-267ca6975798/user_impersonation'];

// ❌ Too specific - requires managing multiple individual scopes in code
const SPECIFIC_SCOPES = [
  '499b84ac-1321-427f-aa17-267ca6975798/vso.work',
  '499b84ac-1321-427f-aa17-267ca6975798/vso.code',
];

// ✅ Perfect balance - admin-controlled, enterprise-friendly
const DEFAULT_SCOPE = ['499b84ac-1321-427f-aa17-267ca6975798/.default'];
```

### Scope Configuration Reference

You can review the exact scope configuration in:

- **Scope Definition**: [`src/auth/EntraAuthProvider.ts#L24-L29`](https://github.com/plures/azuredevops-integration-extension/blob/main/src/auth/EntraAuthProvider.ts#L24-L29)

```typescript
const AZURE_DEVOPS_RESOURCE_ID = '499b84ac-1321-427f-aa17-267ca6975798';
const DEFAULT_SCOPES = [`${AZURE_DEVOPS_RESOURCE_ID}/.default`];
```

You can review and consent to these scopes during the login prompt.

## 3. Data Access & Usage

- We only access the data you explicitly authorize:
  - Work item titles, descriptions, and state
  - Pipeline definitions and statuses
  - Project and repository metadata
- No personal files, local workspace contents, or telemetry beyond “success/failure” events are collected.

## 4. Token Storage & Revocation

- Access tokens and refresh tokens are encrypted in VS Code’s SecretStorage.
- To **sign out** and delete cached credentials, run the **Azure DevOps: Sign Out** command from the Command Palette.
- Tokens are automatically refreshed by MSAL; at no point do we store long-lived secrets.

## 5. User Controls & Transparency

- Before performing any sensitive action (e.g., creating builds, modifying work items), the extension will prompt for your approval.
- A dedicated **Output Channel** (`Azure DevOps Integration`) logs each significant step (authentication, API calls, errors).
- You can enable **Privacy Mode** to restrict the extension to read-only operations.
- Microsoft Entra reminders appear in the Work Items view whenever a token expires or refresh fails, offering one-click reconnect or a 30-minute snooze; the status bar indicator mirrors the remaining token lifetime and cycles through each affected connection so you always know which environment needs attention.

## 6. Runtime Security & Marketplace Protections

- VS Code enforces runtime security through:
  - Publisher trust prompts
  - Extension permission transparency
  - Marketplace protections against malicious updates
- This extension’s source code is fully published on GitHub for your review:
  <https://github.com/plures/azuredevops-integration-extension>

### External Resources

For more details on VS Code extension security best practices, see:

- **VS Code Security Guide**: [Extension Security](https://code.visualstudio.com/api/advanced-topics/extension-security)
- **Microsoft Security**: [OAuth 2.0 Best Practices](https://docs.microsoft.com/en-us/azure/active-directory/develop/security-best-practices-for-app-registration)

### Security Audits

We plan to publish our security audit results as they become available.

---

## Last Updated

2025-10-02
