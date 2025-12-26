# Entra ID App Registration Guide

## Overview

The Azure DevOps Integration extension uses Authorization Code Flow with PKCE for Entra ID authentication. This requires an app registration in Entra ID (Azure AD) with the correct redirect URI.

## Current Configuration

- **Client ID**: `a5243d69-523e-496b-a22c-7ff3b5a3e85b` (hardcoded in code)
- **Redirect URI**: `vscode-azuredevops-int://auth/callback`
- **Application Type**: Public client (mobile and desktop applications)
- **Supported Account Types**: Multi-tenant (AzureADMultipleOrgs)

## Quick Start

### Prerequisites

1. **Azure CLI installed**: https://aka.ms/azure-cli
2. **Logged in**: Run `az login` in your terminal
3. **PowerShell execution policy**: May need to allow script execution (see below)

### Update Existing App Registration

```powershell
# Login to Azure (if not already logged in)
az login

# Update the app registration with correct redirect URI
.\scripts\update-entra-app-redirect.ps1 -ClientId a5243d69-523e-496b-a22c-7ff3b5a3e85b

# Or use default client ID
.\scripts\update-entra-app-redirect.ps1
```

This will:
- Find the app registration by client ID
- Update the redirect URI to `vscode-azuredevops-int://auth/callback`
- Enable public client flows
- Verify the configuration

## Registration Methods

### Method 1: PowerShell Scripts (Recommended)

#### Update Existing App

```powershell
# Login first
az login

# Update existing app registration
.\scripts\update-entra-app-redirect.ps1 -ClientId a5243d69-523e-496b-a22c-7ff3b5a3e85b

# Or with default client ID
.\scripts\update-entra-app-redirect.ps1
```

#### Create New App Registration

```powershell
# Login first
az login

# Create new app registration
.\scripts\register-entra-ado-app.ps1

# With custom name and admin consent
.\scripts\register-entra-ado-app.ps1 -AppName "My Custom App" -GrantAdminConsent

# Update existing app
.\scripts\register-entra-ado-app.ps1 -ClientId "existing-client-id"
```

The scripts will:
1. Check if Azure CLI is available (find it automatically on Windows)
2. Verify you're logged in
3. Update existing app or create new one
4. Configure redirect URI: `vscode-azuredevops-int://auth/callback`
5. Add Azure DevOps API permissions
6. Save proof file to `tmp/entra-ado-registration-proof.json`

### Method 2: Node.js Scripts (Alternative)

If you prefer Node.js scripts:

```bash
# Update existing app
node scripts/update-entra-app-redirect.mjs a5243d69-523e-496b-a22c-7ff3b5a3e85b

# Create new app
node scripts/register-entra-ado-app.mjs
```

### Method 3: Azure Portal (Manual)

1. **Navigate to Azure Portal**
   - Go to https://portal.azure.com
   - Navigate to **Azure Active Directory** > **App registrations**

2. **Find or Create App**
   - **If updating existing**: Search for app with Client ID `a5243d69-523e-496b-a22c-7ff3b5a3e85b`
   - **If creating new**: Click **New registration**

3. **Configure App Registration**
   - **Name**: `AzureDevOps-VSCode-Ext` (or your preferred name)
   - **Supported account types**: **Accounts in any organizational directory and personal Microsoft accounts**
   - **Redirect URI**: Leave empty for now (configured in next step)

4. **Configure Redirect URIs**
   - Go to **Authentication** section
   - Under **Platform configurations**, click **Add a platform** > **Mobile and desktop applications**
   - Add redirect URI: `vscode-azuredevops-int://auth/callback`
   - **Important**: Select **Public client flows** > **Yes** (enable public client)

5. **Add API Permissions**
   - Go to **API permissions** section
   - Click **Add a permission**
   - Select **APIs my organization uses**
   - Search for: `499b84ac-1321-427f-aa17-267ca6975798` (Azure DevOps)
   - Select **Delegated permissions**
   - Check: `user_impersonation` (or `.default`)
   - Click **Add permissions**

6. **Grant Admin Consent** (Optional but recommended)
   - Click **Grant admin consent for [Your Organization]**
   - Confirm the consent

7. **Verify Configuration**
   - **Application (client) ID**: Copy this value (should match `a5243d69-523e-496b-a22c-7ff3b5a3e85b` if updating)
   - **Directory (tenant) ID**: Note this if using single-tenant
   - **Redirect URIs**: Should include `vscode-azuredevops-int://auth/callback`
   - **Public client**: Should be enabled

## PowerShell Execution Policy

If you get an execution policy error, you may need to allow script execution:

```powershell
# Check current policy
Get-ExecutionPolicy

# Allow scripts for current user (recommended)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or run script with bypass (one-time)
powershell -ExecutionPolicy Bypass -File .\scripts\update-entra-app-redirect.ps1
```

## Verification Checklist

- [ ] App registration exists in Entra ID
- [ ] Redirect URI `vscode-azuredevops-int://auth/callback` is configured
- [ ] Public client flows are enabled
- [ ] Azure DevOps API permission (`user_impersonation`) is added
- [ ] Admin consent is granted (if required by your organization)
- [ ] Client ID matches the hardcoded value in code (or code is updated)

## Troubleshooting

### PowerShell Execution Policy Error

If you see: `cannot be loaded because running scripts is disabled on this system`

```powershell
# Allow scripts for current user
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or bypass for this session
powershell -ExecutionPolicy Bypass -File .\scripts\update-entra-app-redirect.ps1
```

### Azure CLI Not Found

The scripts automatically detect Azure CLI in common Windows installation locations:
- `C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd`
- `C:\Program Files (x86)\Microsoft SDKs\Azure\CLI2\wbin\az.cmd`
- `%LOCALAPPDATA%\Programs\Azure CLI\az.cmd`

If Azure CLI is installed elsewhere, add it to your PATH or the script will attempt to install it via winget.

### "Please run 'az login'"

You need to authenticate with Azure CLI first:

```powershell
az login
```

This will open a browser for authentication.

### Redirect URI Not Working

- Ensure the URI scheme matches exactly: `vscode-azuredevops-int://auth/callback`
- Verify VS Code URI handler is registered in `package.json`
- Check that the extension is installed and activated

### Authentication Fails

- Verify the app registration has the correct permissions
- Check that admin consent is granted (if required)
- Ensure the client ID in code matches the app registration
- Verify the redirect URI is configured correctly

### "Invalid redirect URI" Error

- The redirect URI must match exactly: `vscode-azuredevops-int://auth/callback`
- Ensure public client flows are enabled
- Check that the URI is added under "Mobile and desktop applications" platform

## Updating Existing App Registration

If you need to update the existing app registration (`a5243d69-523e-496b-a22c-7ff3b5a3e85b`):

```powershell
# Using PowerShell script (recommended)
.\scripts\update-entra-app-redirect.ps1 -ClientId a5243d69-523e-496b-a22c-7ff3b5a3e85b

# Or using the full registration script
.\scripts\register-entra-ado-app.ps1 -ClientId a5243d69-523e-496b-a22c-7ff3b5a3e85b

# Or manually in Azure Portal:
# 1. Find app by Client ID
# 2. Go to Authentication > Platform configurations
# 3. Update redirect URI to: vscode-azuredevops-int://auth/callback
# 4. Ensure "Public client flows" is enabled
```

## Notes

- The redirect URI `vscode-azuredevops-int://auth/callback` is handled by VS Code's URI handler system
- No additional Entra ID configuration is needed for custom URI schemes - VS Code routes them internally
- The app registration must be configured in Entra ID with the correct redirect URI for OAuth to work
- PowerShell scripts provide better Windows integration and error handling
- Both PowerShell and Node.js scripts are available - use whichever you prefer
