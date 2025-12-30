#!/usr/bin/env node

// Registers a multi-tenant public client app for Azure DevOps (Entra ID OAuth)
// and writes a proof file so we avoid duplicate registrations.
//
// Environment overrides:
//   ADO_ENTRA_APP_NAME             Display name for the app (default: AzureDevOps-VSCode-Ext)
//   ADO_ENTRA_REDIRECT_URI         Custom URI scheme (default: vscode-azuredevops-int://auth/callback)
//   ADO_ENTRA_CLIENT_ID            Existing app client ID to update (optional, creates new if not provided)
//   ADO_ENTRA_SCOPE_VALUE          Azure DevOps delegated scope value to request (default: user_impersonation)
//   ADO_ENTRA_APP_AUDIENCE         Sign-in audience (default: AzureADMultipleOrgs for multi-tenant)
//   ADO_ENTRA_GRANT_ADMIN_CONSENT  If "true", attempt admin consent after adding permissions

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const proofPath = path.resolve('tmp/entra-ado-registration-proof.json');
const appName = process.env.ADO_ENTRA_APP_NAME || 'AzureDevOps-VSCode-Ext';
const redirectUri = process.env.ADO_ENTRA_REDIRECT_URI || 'vscode-azuredevops-int://auth/callback';
const existingClientId = process.env.ADO_ENTRA_CLIENT_ID; // Optional: update existing app
const scopeValue = process.env.ADO_ENTRA_SCOPE_VALUE || 'user_impersonation';
const signInAudience = process.env.ADO_ENTRA_APP_AUDIENCE || 'AzureADMultipleOrgs';
const grantAdminConsent =
  (process.env.ADO_ENTRA_GRANT_ADMIN_CONSENT || '').toLowerCase() === 'true';

// Azure DevOps resource identifiers
const adoResourceId = '499b84ac-1321-427f-aa17-267ca6975798';
const adoResourceUri = 'https://app.vssps.visualstudio.com';

let azBinary = 'az';

function runAz(args, label) {
  // Quote the path if it contains spaces (Windows paths)
  const quotedBinary = azBinary.includes(' ') ? `"${azBinary}"` : azBinary;

  const result = spawnSync(quotedBinary, [...args, '--output', 'json'], {
    encoding: 'utf8',
    shell: true, // Use shell on Windows to handle .cmd files
    windowsVerbatimArguments: false,
  });
  if (result.status !== 0) {
    const stderr = result.stderr || result.stdout;
    throw new Error(`Failed to run az ${label}: ${stderr}`);
  }
  const output = result.stdout && result.stdout.trim();
  return output ? JSON.parse(output) : null;
}

function tryInstallAzCli() {
  console.log('Azure CLI not found. Attempting installation via winget (Microsoft.AzureCLI)...');
  const install = spawnSync(
    'winget',
    ['install', '--exact', '--id', 'Microsoft.AzureCLI', '--source', 'winget', '--silent'],
    { encoding: 'utf8' }
  );

  const combined = `${install.stdout || ''}\n${install.stderr || ''}`;
  const benignAlreadyInstalled = combined.match(/already installed|No available upgrade/i);

  if (install.status !== 0 && !benignAlreadyInstalled) {
    const msg = combined || 'winget install failed';
    throw new Error(
      `Failed to install Azure CLI using winget. You may need to run an elevated shell and accept agreements. Details: ${msg}`
    );
  }

  console.log('Azure CLI installation attempt finished. Re-checking availability...');
}

function pickAzBinary() {
  const candidates = ['az', 'az.cmd'];
  const pf = process.env['ProgramFiles'];
  const pf86 = process.env['ProgramFiles(x86)'];
  const localAppData = process.env['LOCALAPPDATA'];

  // Common installation paths
  const common = [
    pf ? path.join(pf, 'Microsoft SDKs', 'Azure', 'CLI2', 'wbin', 'az.cmd') : null,
    pf86 ? path.join(pf86, 'Microsoft SDKs', 'Azure', 'CLI2', 'wbin', 'az.cmd') : null,
    localAppData ? path.join(localAppData, 'Programs', 'Azure CLI', 'az.cmd') : null,
    localAppData ? path.join(localAppData, 'Microsoft', 'Azure CLI', 'az.cmd') : null,
  ].filter(Boolean);

  candidates.push(...common);

  for (const exe of candidates) {
    try {
      const probe = spawnSync(exe, ['--version'], { encoding: 'utf8', shell: true });
      if (probe.status === 0) {
        azBinary = exe;
        return true;
      }
    } catch (err) {
      // Continue to next candidate
    }
  }
  return false;
}

function assertAzCliAvailable() {
  if (pickAzBinary()) return;

  // Attempt to install via winget
  tryInstallAzCli();

  // Re-probe after attempted install
  if (!pickAzBinary()) {
    throw new Error(
      "Azure CLI (az) is required but not available after install attempt. Install manually: https://aka.ms/azure-cli and ensure 'az' is on PATH (you may need a new shell)."
    );
  }
}

function ensureProofPath() {
  const dir = path.dirname(proofPath);
  mkdirSync(dir, { recursive: true });
}

function maybeExitIfProofExists() {
  if (!existsSync(proofPath)) return;
  const proof = JSON.parse(readFileSync(proofPath, 'utf8'));
  console.log('Azure DevOps Entra app already registered.');
  console.log(`Registered at: ${proof.registeredAt}`);
  console.log(`Proof file: ${proofPath}`);
  console.log(JSON.stringify(proof, null, 2));
  process.exit(0);
}

function main() {
  assertAzCliAvailable();

  let app;
  let appId;
  let objectId;

  if (existingClientId) {
    // Update existing app registration
    console.log(`Updating existing Azure DevOps Entra app: ${existingClientId}...`);

    // Find the app by client ID (list all and filter in JavaScript)
    const allApps = runAz(['ad', 'app', 'list'], 'app list');
    const apps = Array.isArray(allApps) ? allApps.filter((a) => a.appId === existingClientId) : [];
    if (!apps || apps.length === 0) {
      throw new Error(`App with client ID ${existingClientId} not found.`);
    }

    app = apps[0];
    appId = app.appId;
    objectId = app.id;

    console.log(`Found app: ${app.displayName} (${appId})`);

    // Update redirect URIs
    console.log(`Updating redirect URI to: ${redirectUri}`);
    runAz(
      [
        'ad',
        'app',
        'update',
        '--id',
        objectId,
        '--enable-public-client',
        'true',
        '--public-client-redirect-uris',
        redirectUri,
      ],
      'app update'
    );
  } else {
    // Check if proof exists (skip if already registered)
    if (existsSync(proofPath)) {
      const proof = JSON.parse(readFileSync(proofPath, 'utf8'));
      console.log('Azure DevOps Entra app already registered.');
      console.log(`Registered at: ${proof.registeredAt}`);
      console.log(`App ID: ${proof.appId}`);
      console.log(`Proof file: ${proofPath}`);
      console.log(JSON.stringify(proof, null, 2));
      process.exit(0);
    }

    console.log('Registering new Azure DevOps Entra public client...');
    app = runAz(
      [
        'ad',
        'app',
        'create',
        '--display-name',
        appName,
        '--sign-in-audience',
        signInAudience,
        '--enable-public-client',
        'true',
        '--public-client-redirect-uris',
        redirectUri,
      ],
      'app create'
    );

    appId = app?.appId;
    objectId = app?.id;
    if (!appId || !objectId) {
      throw new Error('App registration did not return appId/objectId.');
    }
  }

  // Check if permissions already exist
  const existingApp = runAz(['ad', 'app', 'show', '--id', objectId], 'app show');
  const existingPermissions = existingApp?.requiredResourceAccess || [];
  const hasAdoPermission = existingPermissions.some((ra) => ra.resourceAppId === adoResourceId);

  // Fetch scope entry (needed for both permission check and proof)
  console.log('Fetching Azure DevOps service principal scopes...');
  const sp = runAz(['ad', 'sp', 'show', '--id', adoResourceId], 'sp show');
  const scopeEntry = (sp?.oauth2Permissions || []).find((p) => p?.value === scopeValue);
  if (!scopeEntry) {
    throw new Error(`Could not find scope value "${scopeValue}" on Azure DevOps resource.`);
  }

  if (!hasAdoPermission) {
    console.log(`Adding delegated permission: ${scopeEntry.value}`);
    runAz(
      [
        'ad',
        'app',
        'permission',
        'add',
        '--id',
        appId,
        '--api',
        adoResourceId,
        '--api-permissions',
        `${scopeEntry.id}=Scope`,
      ],
      'permission add'
    );
  } else {
    console.log('Azure DevOps permissions already configured.');
  }

  let adminConsentGranted = false;
  if (grantAdminConsent) {
    console.log('Granting admin consent...');
    runAz(['ad', 'app', 'permission', 'admin-consent', '--id', appId], 'permission admin-consent');
    adminConsentGranted = true;
  }

  const proof = {
    appId,
    objectId,
    displayName: app.displayName || existingApp?.displayName,
    signInAudience: app.signInAudience || existingApp?.signInAudience,
    redirectUris: [redirectUri],
    resource: {
      id: adoResourceId,
      uri: adoResourceUri,
      scopeValue,
      scopeId: scopeEntry?.id,
    },
    adminConsentGranted,
    createdDateTime: app.createdDateTime || existingApp?.createdDateTime,
    updatedAt: new Date().toISOString(),
    registeredAt: existingClientId ? 'Updated via script' : new Date().toISOString(),
  };

  ensureProofPath();
  writeFileSync(proofPath, JSON.stringify(proof, null, 2));
  console.log('\n✅ Registration complete!');
  console.log(`\nApp Client ID: ${appId}`);
  console.log(`Redirect URI: ${redirectUri}`);
  console.log(`Proof file: ${proofPath}`);
  console.log('\n' + JSON.stringify(proof, null, 2));

  if (!existingClientId) {
    console.log('\n⚠️  IMPORTANT: Update your code to use this Client ID:');
    console.log(`   DEFAULT_ENTRA_CLIENT_ID = '${appId}'`);
  }
}

try {
  main();
} catch (err) {
  console.error(err?.message || err);
  process.exit(1);
}
