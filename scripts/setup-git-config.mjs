#!/usr/bin/env node
/**
 * Setup Git Configuration Script
 *
 * This script is run during npm install/prepare to configure git hooks
 * and other git-related settings for the project.
 */

import { execSync } from 'child_process';

try {
  // Try to install husky hooks if husky is available
  // This is optional and won't fail if husky is not installed
  try {
    execSync('npx husky install', { stdio: 'ignore', windowsHide: true });
    console.log('[setup-git-config] Husky hooks installed');
  } catch (huskyError) {
    // Husky not available or already installed - this is fine
    // The deprecated warning is expected and can be ignored
  }

  // Additional git config setup can be added here if needed

  console.log('[setup-git-config] Git configuration setup complete');
} catch (error) {
  // Don't fail the build if git config setup fails
  console.warn('[setup-git-config] Warning: Git configuration setup skipped');
  process.exit(0);
}
