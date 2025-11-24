/**
 * Auto-update service for the Tauri desktop application.
 * Handles checking for updates and installing them from GitHub Releases.
 */

import { settings } from '$lib/stores/settings';

let checkInterval: ReturnType<typeof setInterval> | null = null;
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

/**
 * Check if we're running in a Tauri environment
 */
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Initialize auto-update functionality.
 * Should be called once when the app starts.
 * @returns Cleanup function to stop auto-update checks
 */
export async function initializeAutoUpdate(): Promise<() => void> {
  // Only initialize in Tauri environment
  if (!isTauri()) {
    console.log('[Updater] Not in Tauri environment, skipping initialization');
    return () => {};
  }

  // Load settings and react to changes
  let autoUpdateEnabled = true;
  const unsubscribe = settings.subscribe((s) => {
    autoUpdateEnabled = s.autoUpdate;
    if (autoUpdateEnabled) {
      startAutoUpdate();
    } else {
      stopAutoUpdate();
    }
  });

  // Initial check if auto-update is enabled
  if (autoUpdateEnabled) {
    await checkForUpdate();
    startAutoUpdate();
  }

  return unsubscribe;
}

/**
 * Check for available updates.
 * @returns Update info if available, null otherwise
 */
export async function checkForUpdate(): Promise<{
  version: string;
  notes: string;
} | null> {
  if (!isTauri()) {
    return null;
  }

  try {
    // Use dynamic import to avoid bundling issues in non-Tauri environments
    const updaterPath = '@tauri-apps/plugin-updater';
    const { check } = await import(/* @vite-ignore */ updaterPath);
    const update = await check();

    if (update) {
      console.log('[Updater] Update available:', update.version);
      return {
        version: update.version,
        notes: update.body || '',
      };
    }

    console.log('[Updater] No updates available');
    return null;
  } catch (error) {
    console.error('[Updater] Failed to check for updates:', error);
    return null;
  }
}

/**
 * Download and install the available update.
 * The app will restart after installation.
 */
export async function installUpdate(): Promise<void> {
  if (!isTauri()) {
    console.warn('[Updater] Cannot install update: not in Tauri environment');
    return;
  }

  try {
    const updaterPath = '@tauri-apps/plugin-updater';
    const { check } = await import(/* @vite-ignore */ updaterPath);
    const update = await check();

    if (update) {
      console.log('[Updater] Downloading and installing update...');
      await update.downloadAndInstall();
      // App will restart automatically after installation
    }
  } catch (error) {
    console.error('[Updater] Failed to install update:', error);
    throw error;
  }
}

/**
 * Start periodic update checks
 */
function startAutoUpdate(): void {
  stopAutoUpdate(); // Clear any existing interval

  // Set up periodic checks
  checkInterval = setInterval(() => {
    checkForUpdate();
  }, CHECK_INTERVAL_MS);
}

/**
 * Stop periodic update checks
 */
function stopAutoUpdate(): void {
  if (checkInterval !== null) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}
