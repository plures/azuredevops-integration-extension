#!/usr/bin/env node
/**
 * Screenshot Prerequisites Checker
 *
 * Checks for and automatically installs prerequisites needed for screenshot generation,
 * such as Playwright browsers.
 */

import { execSync } from 'child_process';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Check if Playwright browsers are installed
 */
async function checkPlaywrightBrowsers() {
  try {
    const browser = await chromium.launch({ headless: true });
    const executablePath = browser.browserType().executablePath();
    await browser.close();

    // Verify the executable actually exists
    const fs = await import('node:fs/promises');
    try {
      await fs.access(executablePath);
      return true;
    } catch {
      return false;
    }
  } catch (error) {
    // Expected error when browsers aren't installed
    if (
      error.message?.includes("Executable doesn't exist") ||
      error.message?.includes('browserType.launch')
    ) {
      return false;
    }
    // Unexpected error - rethrow
    throw error;
  }
}

/**
 * Install Playwright browsers
 */
async function installPlaywrightBrowsers() {
  console.log('[prerequisites] Installing Playwright browsers...');
  console.log('[prerequisites] This may take a few minutes on first run...');

  try {
    execSync('npx playwright install chromium', {
      stdio: 'inherit',
      cwd: __dirname,
      shell: true,
    });
    console.log('✓ Playwright browsers installed successfully');
    return true;
  } catch (error) {
    console.error('[prerequisites] Failed to install Playwright browsers:', error.message);
    console.error('[prerequisites] Please run manually: npx playwright install chromium');
    return false;
  }
}

/**
 * Ensure all prerequisites are available
 */
export async function ensurePrerequisites() {
  console.log('[prerequisites] Checking prerequisites...');

  // Check Playwright browsers
  const browsersInstalled = await checkPlaywrightBrowsers();

  if (!browsersInstalled) {
    console.log('[prerequisites] Playwright browsers not found');
    const installed = await installPlaywrightBrowsers();
    if (!installed) {
      return false;
    }

    // Verify installation
    const verified = await checkPlaywrightBrowsers();
    if (!verified) {
      console.error('[prerequisites] Installation verification failed');
      return false;
    }
    console.log('[prerequisites] ✓ Playwright browsers verified');
  } else {
    console.log('[prerequisites] ✓ Playwright browsers already installed');
  }

  console.log('[prerequisites] ✓ All prerequisites are available');
  return true;
}

// If run directly, execute the check
if (import.meta.url === `file://${process.argv[1]}`) {
  ensurePrerequisites()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('[prerequisites] Error:', error);
      process.exit(1);
    });
}
