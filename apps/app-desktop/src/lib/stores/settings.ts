/**
 * Settings store for persistent app settings.
 * Uses Tauri's store plugin for native storage or localStorage as fallback.
 */

import { writable } from 'svelte/store';

// Default settings configuration
const DEFAULT_SETTINGS = {
  autoUpdate: true,
};

type Settings = typeof DEFAULT_SETTINGS;

/**
 * Check if we're running in a Tauri environment
 */
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Initialize the Tauri store for persistent settings
 */
async function initStore() {
  if (!isTauri()) {
    return null;
  }
  try {
    const { Store } = await import('@tauri-apps/plugin-store');
    const store = await Store.load('.settings.dat');
    return store;
  } catch (error) {
    console.error('[Settings] Failed to initialize Tauri store:', error);
    return null;
  }
}

/**
 * Create a writable settings store with persistence
 */
function createSettingsStore() {
  const { subscribe, set: setStore } = writable<Settings>(DEFAULT_SETTINGS);

  /**
   * Load settings from persistent storage
   */
  async function load(): Promise<void> {
    if (!isTauri()) {
      // In browser, use localStorage as fallback
      try {
        const saved = localStorage.getItem('app-settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          setStore({ ...DEFAULT_SETTINGS, ...parsed });
        } else {
          setStore(DEFAULT_SETTINGS);
        }
      } catch (error) {
        console.error('[Settings] Failed to load from localStorage:', error);
        setStore(DEFAULT_SETTINGS);
      }
      return;
    }

    try {
      const store = await initStore();
      if (!store) {
        setStore(DEFAULT_SETTINGS);
        return;
      }
      const saved = await store.get<Settings>('settings');
      if (saved) {
        setStore({ ...DEFAULT_SETTINGS, ...saved });
      } else {
        // Save defaults on first run
        await save(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('[Settings] Failed to load settings:', error);
      setStore(DEFAULT_SETTINGS);
    }
  }

  /**
   * Save settings to persistent storage
   */
  async function save(newSettings: Settings): Promise<void> {
    if (!isTauri()) {
      // In browser, use localStorage as fallback
      try {
        localStorage.setItem('app-settings', JSON.stringify(newSettings));
        setStore(newSettings);
      } catch (error) {
        console.error('[Settings] Failed to save to localStorage:', error);
      }
      return;
    }

    try {
      const store = await initStore();
      if (!store) {
        setStore(newSettings);
        return;
      }
      await store.set('settings', newSettings);
      await store.save();
      setStore(newSettings);
    } catch (error) {
      console.error('[Settings] Failed to save settings:', error);
    }
  }

  /**
   * Update settings with a callback function
   */
  async function update(updater: (current: Settings) => Settings): Promise<void> {
    // Svelte stores call the callback immediately with current value
    let currentSettings: Settings = DEFAULT_SETTINGS;
    const unsubscribe = subscribe((s) => {
      currentSettings = s;
    });
    // The callback has already been called synchronously above
    unsubscribe();
    const newSettings = updater(currentSettings);
    await save(newSettings);
  }

  return {
    subscribe,
    load,
    save,
    update,
  };
}

// Create and export the settings store singleton
export const settings = createSettingsStore();

// Initialize settings on import
settings.load();
