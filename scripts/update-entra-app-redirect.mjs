#!/usr/bin/env node

/**
 * Quick script to update existing Entra ID app registration with correct redirect URI
 *
 * Usage:
 *   node scripts/update-entra-app-redirect.mjs <client-id>
 *
 * Example:
 *   node scripts/update-entra-app-redirect.mjs a5243d69-523e-496b-a22c-7ff3b5a3e85b
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { existsSync } from 'node:fs';

const clientId = process.argv[2] || 'a5243d69-523e-496b-a22c-7ff3b5a3e85b';
const redirectUri = 'vscode-azuredevops-int://auth/callback';

function findAzBinary() {
  // Try direct path first (most common Windows installation)
  const defaultPath = path.join(
    process.env['ProgramFiles'] || 'C:\\Program Files',
    'Microsoft SDKs',
    'Azure',
    'CLI2',
    'wbin',
    'az.cmd'
  );

  const candidates = [];

  // Check if default path exists
  if (existsSync(defaultPath)) {
    candidates.push(defaultPath);
  }

  // Add other common paths
  const pf = process.env['ProgramFiles'];
  const pf86 = process.env['ProgramFiles(x86)'];
  const localAppData = process.env['LOCALAPPDATA'];

  if (pf) {
    const pfPath = path.join(pf, 'Microsoft SDKs', 'Azure', 'CLI2', 'wbin', 'az.cmd');
    if (existsSync(pfPath) && !candidates.includes(pfPath)) {
      candidates.push(pfPath);
    }
  }
  if (pf86) {
    const pf86Path = path.join(pf86, 'Microsoft SDKs', 'Azure', 'CLI2', 'wbin', 'az.cmd');
    if (existsSync(pf86Path) && !candidates.includes(pf86Path)) {
      candidates.push(pf86Path);
    }
  }
  if (localAppData) {
    const localPaths = [
      path.join(localAppData, 'Programs', 'Azure CLI', 'az.cmd'),
      path.join(localAppData, 'Microsoft', 'Azure CLI', 'az.cmd'),
    ];
    localPaths.forEach((p) => {
      if (existsSync(p) && !candidates.includes(p)) {
        candidates.push(p);
      }
    });
  }

  // Also try PATH-based lookups
  candidates.push('az', 'az.cmd');

  for (const exe of candidates) {
    try {
      // Use shell: true for Windows .cmd files
      const probe = spawnSync(exe, ['--version'], {
        encoding: 'utf8',
        shell: true,
        windowsVerbatimArguments: false,
        timeout: 5000,
      });
      if (probe.status === 0 || (probe.stdout && probe.stdout.includes('azure-cli'))) {
        return exe;
      }
    } catch (err) {
      // Continue to next candidate
    }
  }
  return null;
}

function runAz(args, label) {
  let azExe = findAzBinary();
  if (!azExe) {
    // Fallback: try the known path directly
    const knownPath = path.join(
      process.env['ProgramFiles'] || 'C:\\Program Files',
      'Microsoft SDKs',
      'Azure',
      'CLI2',
      'wbin',
      'az.cmd'
    );
    if (existsSync(knownPath)) {
      azExe = knownPath;
    } else {
      throw new Error('Azure CLI not found. Please install from https://aka.ms/azure-cli');
    }
  }

  // Quote the path if it contains spaces (Windows paths)
  const quotedExe = azExe.includes(' ') ? `"${azExe}"` : azExe;

  const result = spawnSync(quotedExe, [...args, '--output', 'json'], {
    encoding: 'utf8',
    shell: true, // Use shell to handle .cmd files and quoted paths
    windowsVerbatimArguments: false,
  });

  if (result.status !== 0) {
    const stderr = result.stderr || result.stdout;
    throw new Error(`Failed to run az ${label}: ${stderr}`);
  }
  const output = result.stdout && result.stdout.trim();
  return output ? JSON.parse(output) : null;
}

function checkAzLogin() {
  try {
    runAz(['account', 'show'], 'account show');
    return true;
  } catch (err) {
    return false;
  }
}

function main() {
  console.log(`Updating Entra ID app registration: ${clientId}`);
  console.log(`Setting redirect URI to: ${redirectUri}\n`);

  // Check if logged in
  if (!checkAzLogin()) {
    console.error('❌ Not logged in to Azure CLI');
    console.error('\nPlease run: az login');
    console.error('Then run this script again.');
    process.exit(1);
  }

  try {
    // Find app by client ID
    console.log('Finding app registration...');
    // List all apps and filter in JavaScript (more reliable than OData filter)
    const allApps = runAz(['ad', 'app', 'list'], 'app list');
    const apps = Array.isArray(allApps) ? allApps.filter((app) => app.appId === clientId) : [];

    if (!apps || apps.length === 0) {
      console.error(`❌ App with client ID ${clientId} not found.`);
      console.error('\nOptions:');
      console.error(
        '1. Create a new app registration using: node scripts/register-entra-ado-app.mjs'
      );
      console.error('2. Update the client ID in the code to match your existing app');
      process.exit(1);
    }

    const app = apps[0];
    const objectId = app.id;
    console.log(`✅ Found app: ${app.displayName} (${app.id})\n`);

    // Update redirect URI
    console.log('Updating redirect URI...');
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
    console.log('✅ Redirect URI updated successfully!\n');

    // Verify
    const updatedApp = runAz(['ad', 'app', 'show', '--id', objectId], 'app show');
    const redirectUris =
      updatedApp?.spa?.redirectUris || updatedApp?.publicClient?.redirectUris || [];

    console.log('Current redirect URIs:');
    redirectUris.forEach((uri) => console.log(`  - ${uri}`));

    if (redirectUris.includes(redirectUri)) {
      console.log('\n✅ Verification successful!');
      console.log('\nNext steps:');
      console.log('1. Ensure Azure DevOps API permissions are configured');
      console.log('2. Grant admin consent if required by your organization');
      console.log('3. Test authentication in the extension');
    } else {
      console.log('\n⚠️  Warning: Redirect URI not found in app configuration');
      console.log('You may need to add it manually in Azure Portal');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nMake sure:');
    console.error('1. Azure CLI is installed: https://aka.ms/azure-cli');
    console.error('2. You are logged in: az login');
    console.error('3. You have permissions to update app registrations');
    process.exit(1);
  }
}

main();
