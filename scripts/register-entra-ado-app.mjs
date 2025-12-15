#!/usr/bin/env node

// Registers a multi-tenant public client app for Azure DevOps (Entra ID OAuth)
// and writes a proof file so we avoid duplicate registrations.
//
// Environment overrides:
//   ADO_ENTRA_APP_NAME             Display name for the app (default: AzureDevOps-VSCode-Ext)
//   ADO_ENTRA_REDIRECT_URI         Loopback or custom URI (default: http://127.0.0.1:46151)
//   ADO_ENTRA_SCOPE_VALUE          Azure DevOps delegated scope value to request (default: user_impersonation)
//   ADO_ENTRA_APP_AUDIENCE         Sign-in audience (default: AzureADMultipleOrgs for multi-tenant)
//   ADO_ENTRA_GRANT_ADMIN_CONSENT  If "true", attempt admin consent after adding permissions

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const proofPath = path.resolve('tmp/entra-ado-registration-proof.json');
const appName = process.env.ADO_ENTRA_APP_NAME || 'AzureDevOps-VSCode-Ext';
const redirectUri = process.env.ADO_ENTRA_REDIRECT_URI || 'http://127.0.0.1:46151';
const scopeValue = process.env.ADO_ENTRA_SCOPE_VALUE || 'user_impersonation';
const signInAudience = process.env.ADO_ENTRA_APP_AUDIENCE || 'AzureADMultipleOrgs';
const grantAdminConsent =
  (process.env.ADO_ENTRA_GRANT_ADMIN_CONSENT || '').toLowerCase() === 'true';

// Azure DevOps resource identifiers
const adoResourceId = '499b84ac-1321-427f-aa17-267ca6975798';
const adoResourceUri = 'https://app.vssps.visualstudio.com';

let azBinary = 'az';

function runAz(args, label) {
  const result = spawnSync(azBinary, [...args, '--output', 'json'], { encoding: 'utf8' });
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
  const common = [pf, pf86]
    .filter(Boolean)
    .flatMap((root) => [path.join(root, 'Microsoft SDKs', 'Azure', 'CLI2', 'wbin', 'az.cmd')]);
  candidates.push(...common);

  for (const exe of candidates) {
    const probe = spawnSync(exe, ['--version'], { encoding: 'utf8' });
    if (probe.status === 0) {
      azBinary = exe;
      return true;
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
  maybeExitIfProofExists();

  console.log('Registering Azure DevOps Entra public client...');
  const app = runAz(
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

  const appId = app?.appId;
  const objectId = app?.id;
  if (!appId || !objectId) {
    throw new Error('App registration did not return appId/objectId.');
  }

  console.log('Fetching Azure DevOps service principal scopes...');
  const sp = runAz(['ad', 'sp', 'show', '--id', adoResourceId], 'sp show');
  const scopeEntry = (sp?.oauth2Permissions || []).find((p) => p?.value === scopeValue);
  if (!scopeEntry) {
    throw new Error(`Could not find scope value "${scopeValue}" on Azure DevOps resource.`);
  }

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

  let adminConsentGranted = false;
  if (grantAdminConsent) {
    console.log('Granting admin consent...');
    runAz(['ad', 'app', 'permission', 'admin-consent', '--id', appId], 'permission admin-consent');
    adminConsentGranted = true;
  }

  const proof = {
    appId,
    objectId,
    displayName: app.displayName,
    signInAudience: app.signInAudience,
    redirectUris: [redirectUri],
    resource: {
      id: adoResourceId,
      uri: adoResourceUri,
      scopeValue,
      scopeId: scopeEntry.id,
    },
    adminConsentGranted,
    createdDateTime: app.createdDateTime,
    registeredAt: new Date().toISOString(),
  };

  ensureProofPath();
  writeFileSync(proofPath, JSON.stringify(proof, null, 2));
  console.log('Registration complete. Proof written to: ' + proofPath);
  console.log(JSON.stringify(proof, null, 2));
}

try {
  main();
} catch (err) {
  console.error(err?.message || err);
  process.exit(1);
}
