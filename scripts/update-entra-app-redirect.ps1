#!/usr/bin/env pwsh
#Requires -Version 7.0

<#
.SYNOPSIS
    Updates an existing Entra ID app registration with the correct redirect URI for VS Code extension.

.DESCRIPTION
    This script updates an existing Entra ID app registration to use the redirect URI
    required for the Azure DevOps Integration VS Code extension:
    vscode-azuredevops-int://auth/callback

.PARAMETER ClientId
    The client ID (Application ID) of the app registration to update.
    Default: a5243d69-523e-496b-a22c-7ff3b5a3e85b

.EXAMPLE
    .\update-entra-app-redirect.ps1
    
.EXAMPLE
    .\update-entra-app-redirect.ps1 -ClientId "your-client-id-here"
#>

param(
    [Parameter(Position=0)]
    [string]$ClientId = "a5243d69-523e-496b-a22c-7ff3b5a3e85b"
)

$ErrorActionPreference = "Stop"
$redirectUri = "vscode-azuredevops-int://auth/callback"

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
        $output = & $azPath $allArgs 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            throw "Azure CLI command failed: $output"
        }
        
        if ($output) {
            return $output | ConvertFrom-Json
        }
        return $null
    } catch {
        Write-Error "Failed to run az $Label`: $_"
        throw
    }
}

function Main {
    Write-Host "Updating Entra ID app registration: $ClientId" -ForegroundColor Cyan
    Write-Host "Setting redirect URI to: $redirectUri" -ForegroundColor Cyan
    Write-Host ""
    
    # Check Azure CLI installation
    if (-not (Test-AzCliInstalled)) {
        Write-Error "Azure CLI is not installed. Please install from https://aka.ms/azure-cli"
        Write-Host "You can install it using: winget install Microsoft.AzureCLI" -ForegroundColor Yellow
        exit 1
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
    
    try {
        # Find app by client ID
        Write-Host "Finding app registration..." -ForegroundColor Cyan
        $allApps = Invoke-AzCommand -Arguments @("ad", "app", "list") -Label "app list"
        
        if (-not $allApps) {
            $allApps = @()
        }
        
        $app = $allApps | Where-Object { $_.appId -eq $ClientId } | Select-Object -First 1
        
        if (-not $app) {
            Write-Error "App with client ID $ClientId not found."
            Write-Host ""
            Write-Host "Options:" -ForegroundColor Yellow
            Write-Host "1. Create a new app registration using: .\register-entra-ado-app.ps1" -ForegroundColor Yellow
            Write-Host "2. Update the client ID in the code to match your existing app" -ForegroundColor Yellow
            exit 1
        }
        
        $objectId = $app.id
        Write-Host "✅ Found app: $($app.displayName) ($objectId)" -ForegroundColor Green
        Write-Host ""
        
        # Update redirect URI
        Write-Host "Updating redirect URI..." -ForegroundColor Cyan
        Invoke-AzCommand -Arguments @(
            "ad", "app", "update",
            "--id", $objectId,
            "--is-fallback-public-client", "true",
            "--public-client-redirect-uris", $redirectUri
        ) -Label "app update" | Out-Null
        
        Write-Host "✅ Redirect URI updated successfully!" -ForegroundColor Green
        Write-Host ""
        
        # Verify
        Write-Host "Verifying configuration..." -ForegroundColor Cyan
        $updatedApp = Invoke-AzCommand -Arguments @("ad", "app", "show", "--id", $objectId) -Label "app show"
        
        $redirectUris = @()
        if ($updatedApp.spa.redirectUris) {
            $redirectUris = $updatedApp.spa.redirectUris
        } elseif ($updatedApp.publicClient.redirectUris) {
            $redirectUris = $updatedApp.publicClient.redirectUris
        }
        
        Write-Host ""
        Write-Host "Current redirect URIs:" -ForegroundColor Cyan
        foreach ($uri in $redirectUris) {
            Write-Host "  - $uri"
        }
        
        if ($redirectUris -contains $redirectUri) {
            Write-Host ""
            Write-Host "✅ Verification successful!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Next steps:" -ForegroundColor Yellow
            Write-Host "1. Ensure Azure DevOps API permissions are configured" -ForegroundColor Yellow
            Write-Host "2. Grant admin consent if required by your organization" -ForegroundColor Yellow
            Write-Host "3. Test authentication in the extension" -ForegroundColor Yellow
        } else {
            Write-Host ""
            Write-Warning "Redirect URI not found in app configuration"
            Write-Host "You may need to add it manually in Azure Portal" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Error "Error: $_"
        Write-Host ""
        Write-Host "Make sure:" -ForegroundColor Yellow
        Write-Host "1. Azure CLI is installed: https://aka.ms/azure-cli" -ForegroundColor Yellow
        Write-Host "2. You are logged in: az login" -ForegroundColor Yellow
        Write-Host "3. You have permissions to update app registrations" -ForegroundColor Yellow
        exit 1
    }
}

Main

