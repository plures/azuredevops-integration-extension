/**
 * Platform Adapter for Tauri
 * Provides abstraction layer to replace VS Code API calls with Tauri equivalents
 */

import { invoke } from '@tauri-apps/api/core';
import { Store } from '@tauri-apps/plugin-store';
import { message } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, exists, BaseDirectory } from '@tauri-apps/plugin-fs';

// Platform adapter interface matching VS Code-like API surface
export interface PlatformAdapter {
  // Messaging
  postMessage(message: any): void;
  onMessage(handler: (message: any) => void): void;

  // Storage
  getSecret(key: string): Promise<string | undefined>;
  setSecret(key: string, value: string): Promise<void>;
  deleteSecret(key: string): Promise<void>;

  // Configuration
  getConfiguration<T = any>(key: string, defaultValue?: T): Promise<T>;
  setConfiguration(key: string, value: any): Promise<void>;

  // Dialogs
  showInputBox(options: { prompt: string; password?: boolean }): Promise<string | undefined>;
  showQuickPick<T extends string>(
    items: T[],
    options?: { placeHolder?: string }
  ): Promise<T | undefined>;
  showInformationMessage(message: string): Promise<void>;
  showErrorMessage(message: string): Promise<void>;
  showWarningMessage(message: string): Promise<void>;

  // File System
  fileExists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;

  // External
  openExternal(url: string): Promise<void>;
}

// Tauri implementation
class TauriPlatformAdapter implements PlatformAdapter {
  private store: Store | null = null;
  private messageHandlers: ((message: any) => void)[] = [];
  private eventUnlisteners: (() => void)[] = [];

  constructor() {
    // Store will be initialized lazily when first accessed
    // Setup message bridge asynchronously with error handling
    this.setupMessageBridge().catch((error) => {
      console.error('[PlatformAdapter] Failed to setup message bridge:', error);
    });
  }

  private async getStore(): Promise<Store> {
    if (!this.store) {
      // Lazy load store using the load method
      const { load } = await import('@tauri-apps/plugin-store');
      this.store = await load('config.json');
    }
    return this.store;
  }

  private async setupMessageBridge() {
    try {
      // Listen for messages from Rust backend
      const { listen } = await import('@tauri-apps/api/event');
      const unlisten = await listen<any>('message-from-backend', (event) => {
        this.messageHandlers.forEach((handler) => handler(event.payload));
      });
      this.eventUnlisteners.push(unlisten);
    } catch (error) {
      console.error('[PlatformAdapter] Error setting up message bridge:', error);
      throw error;
    }
  }

  postMessage(message: any): void {
    // Send message to Rust backend
    invoke('handle_webview_message', { message }).catch(console.error);
  }

  onMessage(handler: (message: any) => void): void {
    this.messageHandlers.push(handler);
  }

  async getSecret(key: string): Promise<string | undefined> {
    try {
      // WARNING: Tauri Store plugin does not provide encryption by default.
      // For production use, implement proper encryption for sensitive data like PATs.
      // Consider using OS-specific keyring services or implementing encryption layer.
      const store = await this.getStore();
      const value = await store.get<string>(`secrets.${key}`);
      return value || undefined;
    } catch (error) {
      console.error('Error getting secret:', error);
      return undefined;
    }
  }

  async setSecret(key: string, value: string): Promise<void> {
    // WARNING: This stores secrets without encryption. For production,
    // use a proper secure storage mechanism (e.g., OS keyring).
    const store = await this.getStore();
    await store.set(`secrets.${key}`, value);
    await store.save();
  }

  async deleteSecret(key: string): Promise<void> {
    const store = await this.getStore();
    await store.delete(`secrets.${key}`);
    await store.save();
  }

  async getConfiguration<T = any>(key: string, defaultValue?: T): Promise<T> {
    try {
      const store = await this.getStore();
      const value = await store.get<T>(`config.${key}`);
      return value !== null && value !== undefined ? value : (defaultValue as T);
    } catch (error) {
      console.error('Error getting configuration:', error);
      return defaultValue as T;
    }
  }

  async setConfiguration(key: string, value: any): Promise<void> {
    const store = await this.getStore();
    await store.set(`config.${key}`, value);
    await store.save();
  }

  async showInputBox(options: { prompt: string; password?: boolean }): Promise<string | undefined> {
    // Use Tauri dialog for input
    const result = await invoke<string | null>('show_input_dialog', {
      prompt: options.prompt,
      password: options.password || false,
    });
    return result || undefined;
  }

  async showQuickPick<T extends string>(
    items: T[],
    options?: { placeHolder?: string }
  ): Promise<T | undefined> {
    // Use Tauri dialog for selection
    const result = await invoke<string | null>('show_selection_dialog', {
      items,
      placeholder: options?.placeHolder,
    });
    return result as T | undefined;
  }

  async showInformationMessage(msg: string): Promise<void> {
    await message(msg, { title: 'Information', kind: 'info' });
  }

  async showErrorMessage(msg: string): Promise<void> {
    await message(msg, { title: 'Error', kind: 'error' });
  }

  async showWarningMessage(msg: string): Promise<void> {
    await message(msg, { title: 'Warning', kind: 'warning' });
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      return await exists(path, { baseDir: BaseDirectory.AppData });
    } catch {
      return false;
    }
  }

  async readFile(path: string): Promise<string> {
    return await readTextFile(path, { baseDir: BaseDirectory.AppData });
  }

  async writeFile(path: string, content: string): Promise<void> {
    await writeTextFile(path, content, { baseDir: BaseDirectory.AppData });
  }

  async openExternal(url: string): Promise<void> {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
  }

  dispose() {
    this.eventUnlisteners.forEach((unlisten) => unlisten());
    this.eventUnlisteners = [];
    this.messageHandlers = [];
  }
}

// Singleton instance
let platformAdapter: PlatformAdapter | null = null;

export function getPlatformAdapter(): PlatformAdapter {
  if (!platformAdapter) {
    platformAdapter = new TauriPlatformAdapter();
  }
  return platformAdapter;
}

// Helper to create mock adapter for VS Code compatibility layer
export function createVSCodeCompatibilityAPI() {
  const adapter = getPlatformAdapter();

  return {
    postMessage: (msg: any) => adapter.postMessage(msg),
    setState: (state: any) => adapter.setConfiguration('vscode.state', state),
    getState: () => adapter.getConfiguration('vscode.state', {}),
  };
}
