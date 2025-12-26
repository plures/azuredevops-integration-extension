#!/usr/bin/env pwsh
#Requires -Version 7.0

<#
.SYNOPSIS
    Registers or updates a multi-tenant public client app for Azure DevOps (Entra ID OAuth).

.DESCRIPTION
    This script registers a new Entra ID app registration or updates an existing one for use
    with the Azure DevOps Integration VS Code extension. It configures the redirect URI,
    API permissions, and saves a proof file to avoid duplicate registrations.

.PARAMETER AppName
    Display name for the app registration.
    Default: AzureDevOps-VSCode-Ext

.PARAMETER RedirectUri
    Custom URI scheme redirect URI.
    Default: vscode-azuredevops-int://auth/callback

.PARAMETER ClientId
    Existing app client ID to update (optional, creates new if not provided).

.PARAMETER ScopeValue
    Azure DevOps delegated scope value to request.
    Default: user_impersonation

.PARAMETER SignInAudience
    Sign-in audience.
    Default: AzureADMultipleOrgs (multi-tenant)

.PARAMETER GrantAdminConsent
    If specified, attempt admin consent after adding permissions.

.EXAMPLE
    .\register-entra-ado-app.ps1
    
.EXAMPLE
    .\register-entra-ado-app.ps1 -ClientId "existing-client-id"
    
.EXAMPLE
    .\register-entra-ado-app.ps1 -AppName "My Custom App" -GrantAdminConsent
#>

param(
    [string]$AppName = "AzureDevOps-VSCode-Ext",
    [string]$RedirectUri = "vscode-azuredevops-int://auth/callback",
    [string]$ClientId = $null,
    [string]$ScopeValue = "user_impersonation",
    [string]$SignInAudience = "AzureADMultipleOrgs",
    [switch]$GrantAdminConsent
)

$ErrorActionPreference = "Stop"

# Azure DevOps resource identifiers
$adoResourceId = "499b84ac-1321-427f-aa17-267ca6975798"
$adoResourceUri = "https://app.vssps.visualstudio.com"
$proofPath = Join-Path $PSScriptRoot "..\tmp\entra-ado-registration-proof.json"

function Get-AzCliPath {
    # Try PATH first
    $azCommand = Get-Command az -ErrorAction SilentlyContinue
    if ($azCommand) {
        return $azCommand.Source
    }
    
    # Check common installation paths
    $commonPaths = @(
        "$env:ProgramFiles\Microsoft SDKs\Azure\CLI2\wbin\az.cmd",
        "${env:ProgramFiles(x86)}\Microsoft SDKs\Azure\CLI2\wbin\az.cmd",
        "$env:LOCALAPPDATA\Programs\Azure CLI\az.cmd"
    )
    
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            return $path
        }
    }
    
    return $null
}

function Test-AzCliInstalled {
    return (Get-AzCliPath) -ne $null
}

function Test-AzLoggedIn {
    $azPath = Get-AzCliPath
    if (-not $azPath) {
        return $false
    }
    
    try {
        $result = & $azPath account show 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Invoke-AzCommand {
    param(
        [Parameter(Mandatory=$true)]
        [string[]]$Arguments,
        
        [Parameter(Mandatory=$true)]
        [string]$Label
    )
    
    $azPath = Get-AzCliPath
    if (-not $azPath) {
        throw "Azure CLI not found"
    }
    
    try {
        $allArgs = $Arguments + @("--output", "json")
        # Capture output, redirecting stderr to avoid warnings
        $rawOutput = & $azPath $allArgs 2>$null
        
        if ($LASTEXITCODE -ne 0) {
            # If it failed, try again with stderr to see the error
            $errorOutput = & $azPath $allArgs 2>&1
            throw "Azure CLI command failed: $errorOutput"
        }
        
        if (-not $rawOutput) {
            return $null
        }
        
        # Convert array output to string if needed
        $outputString = if ($rawOutput -is [System.Array]) {
            $rawOutput -join "`n"
        } else {
            $rawOutput.ToString()
        }
        
        # Find JSON boundaries
        $jsonStart = -1
        $jsonEnd = -1
        
        # Look for first { or [
        for ($i = 0; $i -lt $outputString.Length; $i++) {
            if ($outputString[$i] -eq '{' -or $outputString[$i] -eq '[') {
                $jsonStart = $i
                break
            }
        }
        
        if ($jsonStart -lt 0) {
            return $null
        }
        
        # Look for last } or ]
        for ($i = $outputString.Length - 1; $i -ge $jsonStart; $i--) {
            if ($outputString[$i] -eq '}' -or $outputString[$i] -eq ']') {
                $jsonEnd = $i
                break
            }
        }
        
        if ($jsonEnd -lt $jsonStart) {
            return $null
        }
        
        $jsonContent = $outputString.Substring($jsonStart, $jsonEnd - $jsonStart + 1)
        return $jsonContent | ConvertFrom-Json
        
    } catch {
        Write-Error "Failed to run az $Label`: $_"
        throw
    }
}

function EnsureProofPath {
    $dir = Split-Path $proofPath -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

function Main {
    # Check Azure CLI installation
    if (-not (Test-AzCliInstalled)) {
        Write-Host "Azure CLI not found. Attempting installation via winget..." -ForegroundColor Yellow
        try {
            winget install --exact --id Microsoft.AzureCLI --source winget --silent
            Write-Host "Azure CLI installation attempt finished. Re-checking availability..." -ForegroundColor Yellow
        } catch {
            Write-Warning "Failed to install Azure CLI via winget: $_"
        }
        
        if (-not (Test-AzCliInstalled)) {
            Write-Error "Azure CLI (az) is required but not available after install attempt."
            Write-Host "Install manually: https://aka.ms/azure-cli and ensure 'az' is on PATH" -ForegroundColor Yellow
            exit 1
        }
    }
    
    # Check if logged in
    if (-not (Test-AzLoggedIn)) {
        $azPath = Get-AzCliPath
        Write-Error "Not logged in to Azure CLI"
        Write-Host ""
        if ($azPath) {
            Write-Host "Please run: & `"$azPath`" login" -ForegroundColor Yellow
        } else {
            Write-Host "Please run: az login" -ForegroundColor Yellow
        }
        Write-Host "Then run this script again." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Note: If MFA is required, complete the browser authentication." -ForegroundColor Cyan
        exit 1
    }
    
    $app = $null
    $appId = $null
    $objectId = $null
    
    if ($ClientId) {
        # Update existing app registration
        Write-Host "Updating existing Azure DevOps Entra app: $ClientId..." -ForegroundColor Cyan
        
        # Find the app by client ID
        $allApps = Invoke-AzCommand -Arguments @("ad", "app", "list") -Label "app list"
        if (-not $allApps) {
            $allApps = @()
        }
        
        $app = $allApps | Where-Object { $_.appId -eq $ClientId } | Select-Object -First 1
        
        if (-not $app) {
            Write-Error "App with client ID $ClientId not found."
            exit 1
        }
        
        $appId = $app.appId
        $objectId = $app.id
        
        Write-Host "Found app: $($app.displayName) ($appId)" -ForegroundColor Green
        
        # Update redirect URIs
        Write-Host "Updating redirect URI to: $RedirectUri" -ForegroundColor Cyan
        Invoke-AzCommand -Arguments @(
            "ad", "app", "update",
            "--id", $objectId,
            "--is-fallback-public-client", "true",
            "--public-client-redirect-uris", $RedirectUri
        ) -Label "app update" | Out-Null
        
    } else {
        # Check if proof exists (skip if already registered)
        if (Test-Path $proofPath) {
            $proof = Get-Content $proofPath | ConvertFrom-Json
            Write-Host "Azure DevOps Entra app already registered." -ForegroundColor Yellow
            Write-Host "Registered at: $($proof.registeredAt)" -ForegroundColor Yellow
            Write-Host "App ID: $($proof.appId)" -ForegroundColor Yellow
            Write-Host "Proof file: $proofPath" -ForegroundColor Yellow
            Write-Host ""
            Write-Host ($proof | ConvertTo-Json -Depth 10)
            exit 0
        }
        
        Write-Host "Registering new Azure DevOps Entra public client..." -ForegroundColor Cyan
        $app = Invoke-AzCommand -Arguments @(
            "ad", "app", "create",
            "--display-name", $AppName,
            "--sign-in-audience", $SignInAudience,
            "--is-fallback-public-client", "true",
            "--public-client-redirect-uris", $RedirectUri
        ) -Label "app create"
        
        $appId = $app.appId
        $objectId = $app.id
        
        if (-not $appId -or -not $objectId) {
            Write-Error "App registration did not return appId/objectId."
            exit 1
        }
    }
    
    # Check if permissions already exist
    $existingApp = Invoke-AzCommand -Arguments @("ad", "app", "show", "--id", $objectId) -Label "app show"
    $existingPermissions = $existingApp.requiredResourceAccess
    if (-not $existingPermissions) {
        $existingPermissions = @()
    }
    
    $hasAdoPermission = $existingPermissions | Where-Object { $_.resourceAppId -eq $adoResourceId }
    
    # Fetch scope entry (needed for both permission check and proof)
    Write-Host "Fetching Azure DevOps service principal scopes..." -ForegroundColor Cyan
    $sp = Invoke-AzCommand -Arguments @("ad", "sp", "show", "--id", $adoResourceId) -Label "sp show"
    
    # Try both oauth2Permissions (legacy) and oauth2PermissionScopes (new)
    $scopes = @()
    if ($sp.oauth2Permissions) {
        $scopes = $sp.oauth2Permissions
    } elseif ($sp.oauth2PermissionScopes) {
        $scopes = $sp.oauth2PermissionScopes
    }
    
    $scopeEntry = $scopes | Where-Object { $_.value -eq $ScopeValue } | Select-Object -First 1
    
    if (-not $scopeEntry) {
        Write-Warning "Could not find scope value `"$ScopeValue`" on Azure DevOps resource."
        Write-Host "Available scopes:" -ForegroundColor Yellow
        $scopes | ForEach-Object { Write-Host "  - $($_.value)" }
        
        # Try to use .default scope or the first available scope
        $defaultScope = $scopes | Where-Object { $_.value -eq ".default" } | Select-Object -First 1
        if ($defaultScope) {
            Write-Host "Using .default scope instead..." -ForegroundColor Yellow
            $scopeEntry = $defaultScope
            $ScopeValue = ".default"
        } elseif ($scopes.Count -gt 0) {
            Write-Host "Using first available scope: $($scopes[0].value)" -ForegroundColor Yellow
            $scopeEntry = $scopes[0]
            $ScopeValue = $scopes[0].value
        } else {
            Write-Error "No scopes available on Azure DevOps resource."
            exit 1
        }
    }
    
    if (-not $hasAdoPermission) {
        Write-Host "Adding delegated permission: $($scopeEntry.value)" -ForegroundColor Cyan
        Invoke-AzCommand -Arguments @(
            "ad", "app", "permission", "add",
            "--id", $appId,
            "--api", $adoResourceId,
            "--api-permissions", "$($scopeEntry.id)=Scope"
        ) -Label "permission add" | Out-Null
    } else {
        Write-Host "Azure DevOps permissions already configured." -ForegroundColor Green
    }
    
    $adminConsentGranted = $false
    if ($GrantAdminConsent) {
        Write-Host "Granting admin consent..." -ForegroundColor Cyan
        Invoke-AzCommand -Arguments @("ad", "app", "permission", "admin-consent", "--id", $appId) -Label "permission admin-consent" | Out-Null
        $adminConsentGranted = $true
    }
    
    $proof = @{
        appId = $appId
        objectId = $objectId
        displayName = if ($app.displayName) { $app.displayName } else { $existingApp.displayName }
        signInAudience = if ($app.signInAudience) { $app.signInAudience } else { $existingApp.signInAudience }
        redirectUris = @($RedirectUri)
        resource = @{
            id = $adoResourceId
            uri = $adoResourceUri
            scopeValue = $ScopeValue
            scopeId = $scopeEntry.id
        }
        adminConsentGranted = $adminConsentGranted
        createdDateTime = if ($app.createdDateTime) { $app.createdDateTime } else { $existingApp.createdDateTime }
        updatedAt = (Get-Date).ToUniversalTime().ToString("o")
        registeredAt = if ($ClientId) { "Updated via script" } else { (Get-Date).ToUniversalTime().ToString("o") }
    }
    
    EnsureProofPath
    $proof | ConvertTo-Json -Depth 10 | Set-Content $proofPath -Encoding UTF8
    
    Write-Host ""
    Write-Host "✅ Registration complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "App Client ID: $appId" -ForegroundColor Cyan
    Write-Host "Redirect URI: $RedirectUri" -ForegroundColor Cyan
    Write-Host "Proof file: $proofPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host ($proof | ConvertTo-Json -Depth 10)
    
    if (-not $ClientId) {
        Write-Host ""
        Write-Host "⚠️  IMPORTANT: Update your code to use this Client ID:" -ForegroundColor Yellow
        Write-Host "   DEFAULT_ENTRA_CLIENT_ID = '$appId'" -ForegroundColor Yellow
    }
}

try {
    Main
} catch {
    Write-Error $_.Exception.Message
    exit 1
}

