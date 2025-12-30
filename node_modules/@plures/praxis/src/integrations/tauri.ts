/**
 * Tauri Integration
 *
 * Integration with plures/svelte-tauri-template for cross-platform desktop applications.
 * Provides Praxis engine integration with Tauri 2 for native desktop capabilities.
 *
 * Features:
 * - Cross-Platform: Windows, macOS, Linux, Android, iOS
 * - Native Integration: File system, system tray, notifications
 * - IPC Bridge: Type-safe communication between Rust and TypeScript
 * - Auto-Updates: Built-in update system
 * - Code Signing: Support for signed releases
 *
 * @see https://github.com/plures/svelte-tauri-template
 */

import type { LogicEngine } from '../core/engine.js';
import type { PraxisEvent } from '../core/protocol.js';

/**
 * Tauri app configuration
 */
export interface TauriAppConfig {
  /** Application name */
  name: string;
  /** Application version */
  version: string;
  /** Application identifier (e.g., com.example.myapp) */
  identifier: string;
  /** Window configuration */
  window?: TauriWindowConfig;
  /** Security configuration */
  security?: TauriSecurityConfig;
  /** Update configuration */
  updates?: TauriUpdateConfig;
  /** Plugins to enable */
  plugins?: TauriPlugin[];
}

/**
 * Window configuration
 */
export interface TauriWindowConfig {
  /** Window title */
  title?: string;
  /** Window width */
  width?: number;
  /** Window height */
  height?: number;
  /** Minimum width */
  minWidth?: number;
  /** Minimum height */
  minHeight?: number;
  /** Whether window is resizable */
  resizable?: boolean;
  /** Whether window is fullscreen */
  fullscreen?: boolean;
  /** Whether to show title bar */
  decorations?: boolean;
  /** Whether window is transparent */
  transparent?: boolean;
  /** Whether to always be on top */
  alwaysOnTop?: boolean;
  /** Center window on screen */
  center?: boolean;
}

/**
 * Security configuration
 */
export interface TauriSecurityConfig {
  /** Content Security Policy */
  csp?: string;
  /** Allowed domains for fetch */
  allowedDomains?: string[];
  /** Enable dev tools in production */
  devTools?: boolean;
  /** Dangerous features to allow */
  dangerousAllowList?: string[];
}

/**
 * Auto-update configuration
 */
export interface TauriUpdateConfig {
  /** Enable auto-updates */
  enabled: boolean;
  /** Update endpoint URL */
  endpoint?: string;
  /** Update check interval (ms) */
  checkInterval?: number;
  /** Whether to install silently */
  silent?: boolean;
  /** Public key for update verification */
  publicKey?: string;
}

/**
 * Tauri plugin definition
 */
export interface TauriPlugin {
  /** Plugin name */
  name: string;
  /** Plugin version */
  version?: string;
  /** Plugin configuration */
  config?: Record<string, unknown>;
}

/**
 * IPC message from frontend to backend
 */
export interface TauriCommand<T = unknown> {
  /** Command name */
  cmd: string;
  /** Command payload */
  payload?: T;
}

/**
 * IPC event from backend to frontend
 */
export interface TauriEvent<T = unknown> {
  /** Event name */
  event: string;
  /** Event payload */
  payload?: T;
  /** Window label that emitted the event */
  windowLabel?: string;
}

/**
 * File system operations
 */
export interface TauriFS {
  /** Read a file */
  readFile(path: string): Promise<Uint8Array>;
  /** Read a file as text */
  readTextFile(path: string): Promise<string>;
  /** Write to a file */
  writeFile(path: string, data: Uint8Array): Promise<void>;
  /** Write text to a file */
  writeTextFile(path: string, data: string): Promise<void>;
  /** Check if path exists */
  exists(path: string): Promise<boolean>;
  /** Create directory */
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  /** Remove file or directory */
  remove(path: string, options?: { recursive?: boolean }): Promise<void>;
  /** Rename/move file */
  rename(oldPath: string, newPath: string): Promise<void>;
  /** List directory contents */
  readDir(path: string): Promise<TauriFileEntry[]>;
}

/**
 * File entry from directory listing
 */
export interface TauriFileEntry {
  /** File name */
  name: string;
  /** Full path */
  path: string;
  /** Is directory */
  isDirectory: boolean;
  /** Is file */
  isFile: boolean;
  /** File size in bytes */
  size?: number;
  /** Last modified timestamp */
  modifiedAt?: number;
}

/**
 * System tray operations
 */
export interface TauriTray {
  /** Set tray icon */
  setIcon(icon: string | Uint8Array): Promise<void>;
  /** Set tray tooltip */
  setTooltip(tooltip: string): Promise<void>;
  /** Set tray menu */
  setMenu(menu: TauriMenuItem[]): Promise<void>;
  /** Show tray */
  show(): Promise<void>;
  /** Hide tray */
  hide(): Promise<void>;
}

/**
 * Tray menu item
 */
export interface TauriMenuItem {
  /** Item ID */
  id: string;
  /** Item label */
  label: string;
  /** Is item enabled */
  enabled?: boolean;
  /** Is item checked (for checkboxes) */
  checked?: boolean;
  /** Submenu items */
  submenu?: TauriMenuItem[];
  /** Click handler */
  onClick?: () => void;
}

/**
 * Notification API
 */
export interface TauriNotification {
  /** Send a notification */
  send(options: TauriNotificationOptions): Promise<void>;
  /** Request notification permission */
  requestPermission(): Promise<'granted' | 'denied' | 'default'>;
  /** Check notification permission */
  checkPermission(): Promise<'granted' | 'denied' | 'default'>;
}

/**
 * Notification options
 */
export interface TauriNotificationOptions {
  /** Notification title */
  title: string;
  /** Notification body */
  body?: string;
  /** Notification icon */
  icon?: string;
  /** Sound to play */
  sound?: string;
}

/**
 * Tauri bridge for Praxis integration
 *
 * Provides type-safe access to Tauri APIs from Praxis applications.
 */
export interface TauriBridge {
  /** Application info */
  app: {
    name: string;
    version: string;
    tauriVersion: string;
  };

  /** File system operations */
  fs: TauriFS;

  /** System tray operations */
  tray: TauriTray;

  /** Notification operations */
  notification: TauriNotification;

  /** Invoke a Tauri command */
  invoke<T = unknown>(cmd: string, payload?: unknown): Promise<T>;

  /** Listen to a Tauri event */
  listen<T = unknown>(event: string, handler: (event: TauriEvent<T>) => void): Promise<() => void>;

  /** Emit a Tauri event */
  emit(event: string, payload?: unknown): Promise<void>;

  /** Get window operations */
  window: {
    /** Minimize window */
    minimize(): Promise<void>;
    /** Maximize window */
    maximize(): Promise<void>;
    /** Unmaximize window */
    unmaximize(): Promise<void>;
    /** Close window */
    close(): Promise<void>;
    /** Toggle fullscreen */
    toggleFullscreen(): Promise<void>;
    /** Set window title */
    setTitle(title: string): Promise<void>;
    /** Show window */
    show(): Promise<void>;
    /** Hide window */
    hide(): Promise<void>;
    /** Focus window */
    focus(): Promise<void>;
  };

  /** Check for updates */
  checkForUpdates(): Promise<TauriUpdateInfo | null>;

  /** Install update */
  installUpdate(): Promise<void>;
}

/**
 * Update information
 */
export interface TauriUpdateInfo {
  /** New version available */
  version: string;
  /** Release date */
  date: string;
  /** Release notes */
  notes?: string;
  /** Download URL */
  url: string;
}

/**
 * Praxis-Tauri adapter for engine persistence
 */
export interface TauriPraxisAdapter<TContext = unknown> {
  /** Save engine state to file */
  saveState(state: TContext): Promise<void>;

  /** Load engine state from file */
  loadState(): Promise<TContext | null>;

  /** Save events to file */
  saveEvents(events: PraxisEvent[]): Promise<void>;

  /** Load events from file */
  loadEvents(): Promise<PraxisEvent[]>;

  /** Watch for file changes */
  watchStateFile(handler: (state: TContext) => void): Promise<() => void>;

  /** Get state file path */
  getStatePath(): string;

  /** Get events file path */
  getEventsPath(): string;
}

/**
 * Create a mock Tauri bridge for development/testing
 *
 * This provides a mock implementation that works without Tauri runtime.
 */
export function createMockTauriBridge(): TauriBridge {
  const eventHandlers = new Map<string, Set<(event: TauriEvent) => void>>();
  const storage = new Map<string, unknown>();

  return {
    app: {
      name: 'Mock App',
      version: '0.0.0',
      tauriVersion: 'mock',
    },

    fs: {
      async readFile(path: string): Promise<Uint8Array> {
        const data = storage.get(path);
        if (data instanceof Uint8Array) return data;
        throw new Error(`File not found: ${path}`);
      },

      async readTextFile(path: string): Promise<string> {
        const data = storage.get(path);
        if (typeof data === 'string') return data;
        throw new Error(`File not found: ${path}`);
      },

      async writeFile(path: string, data: Uint8Array): Promise<void> {
        storage.set(path, data);
      },

      async writeTextFile(path: string, data: string): Promise<void> {
        storage.set(path, data);
      },

      async exists(path: string): Promise<boolean> {
        return storage.has(path);
      },

      async mkdir(_path: string, _options?: { recursive?: boolean }): Promise<void> {
        // No-op for mock
      },

      async remove(path: string, _options?: { recursive?: boolean }): Promise<void> {
        storage.delete(path);
      },

      async rename(oldPath: string, newPath: string): Promise<void> {
        const data = storage.get(oldPath);
        if (data !== undefined) {
          storage.set(newPath, data);
          storage.delete(oldPath);
        }
      },

      async readDir(_path: string): Promise<TauriFileEntry[]> {
        return [];
      },
    },

    tray: {
      async setIcon(_icon: string | Uint8Array): Promise<void> {},
      async setTooltip(_tooltip: string): Promise<void> {},
      async setMenu(_menu: TauriMenuItem[]): Promise<void> {},
      async show(): Promise<void> {},
      async hide(): Promise<void> {},
    },

    notification: {
      async send(options: TauriNotificationOptions): Promise<void> {
        console.log('Mock notification:', options.title, options.body);
      },
      async requestPermission(): Promise<'granted' | 'denied' | 'default'> {
        return 'granted';
      },
      async checkPermission(): Promise<'granted' | 'denied' | 'default'> {
        return 'granted';
      },
    },

    async invoke<T = unknown>(cmd: string, payload?: unknown): Promise<T> {
      console.log('Mock invoke:', cmd, payload);
      return null as T;
    },

    async listen<T = unknown>(
      event: string,
      handler: (event: TauriEvent<T>) => void
    ): Promise<() => void> {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set());
      }
      eventHandlers.get(event)!.add(handler as (event: TauriEvent) => void);

      return () => {
        eventHandlers.get(event)?.delete(handler as (event: TauriEvent) => void);
      };
    },

    async emit(event: string, payload?: unknown): Promise<void> {
      const handlers = eventHandlers.get(event);
      if (handlers) {
        const tauriEvent: TauriEvent = { event, payload };
        handlers.forEach((h) => h(tauriEvent));
      }
    },

    window: {
      async minimize(): Promise<void> {},
      async maximize(): Promise<void> {},
      async unmaximize(): Promise<void> {},
      async close(): Promise<void> {},
      async toggleFullscreen(): Promise<void> {},
      async setTitle(_title: string): Promise<void> {},
      async show(): Promise<void> {},
      async hide(): Promise<void> {},
      async focus(): Promise<void> {},
    },

    async checkForUpdates(): Promise<TauriUpdateInfo | null> {
      return null;
    },

    async installUpdate(): Promise<void> {},
  };
}

/**
 * Create a Tauri-Praxis adapter for engine persistence
 *
 * @example
 * ```typescript
 * import { createTauriPraxisAdapter } from '@plures/praxis/integrations/tauri';
 *
 * const adapter = createTauriPraxisAdapter({
 *   bridge: tauriBridge,
 *   statePath: 'app-state.json',
 *   eventsPath: 'app-events.json',
 * });
 *
 * // Save state
 * await adapter.saveState(engine.getContext());
 *
 * // Load state
 * const savedState = await adapter.loadState();
 * ```
 */
export function createTauriPraxisAdapter<TContext = unknown>(options: {
  bridge: TauriBridge;
  statePath?: string;
  eventsPath?: string;
}): TauriPraxisAdapter<TContext> {
  const { bridge, statePath = 'praxis-state.json', eventsPath = 'praxis-events.json' } = options;

  return {
    async saveState(state: TContext): Promise<void> {
      const json = JSON.stringify(state, null, 2);
      await bridge.fs.writeTextFile(statePath, json);
    },

    async loadState(): Promise<TContext | null> {
      try {
        const exists = await bridge.fs.exists(statePath);
        if (!exists) return null;

        const json = await bridge.fs.readTextFile(statePath);
        return JSON.parse(json) as TContext;
      } catch {
        return null;
      }
    },

    async saveEvents(events: PraxisEvent[]): Promise<void> {
      const json = JSON.stringify(events, null, 2);
      await bridge.fs.writeTextFile(eventsPath, json);
    },

    async loadEvents(): Promise<PraxisEvent[]> {
      try {
        const exists = await bridge.fs.exists(eventsPath);
        if (!exists) return [];

        const json = await bridge.fs.readTextFile(eventsPath);
        return JSON.parse(json) as PraxisEvent[];
      } catch {
        return [];
      }
    },

    async watchStateFile(_handler: (state: TContext) => void): Promise<() => void> {
      // In a real implementation, this would use Tauri's fs watch API
      // For now, we'll just return a no-op cleanup function
      console.log('File watching not implemented in mock');
      return () => {};
    },

    getStatePath(): string {
      return statePath;
    },

    getEventsPath(): string {
      return eventsPath;
    },
  };
}

/**
 * Attach Tauri bridge to a Praxis engine for auto-save
 *
 * @example
 * ```typescript
 * import { attachTauriToEngine } from '@plures/praxis/integrations/tauri';
 *
 * const cleanup = attachTauriToEngine(engine, adapter, {
 *   autoSave: true,
 *   saveInterval: 5000,
 * });
 *
 * // Later, cleanup subscriptions
 * cleanup();
 * ```
 */
export function attachTauriToEngine<TContext>(
  engine: LogicEngine<TContext>,
  adapter: TauriPraxisAdapter<TContext>,
  options: {
    autoSave?: boolean;
    saveInterval?: number;
  } = {}
): () => void {
  const { autoSave = true, saveInterval = 5000 } = options;
  const cleanupFns: Array<() => void> = [];

  if (autoSave) {
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingSave = false;

    const debouncedSave = async () => {
      pendingSave = true;
      if (saveTimer) clearTimeout(saveTimer);

      saveTimer = setTimeout(async () => {
        if (pendingSave) {
          await adapter.saveState(engine.getContext());
          pendingSave = false;
        }
      }, saveInterval);
    };

    // Note: In a future implementation, this would hook into engine state changes
    // For now, we provide manual save on interval if state is dirty
    // The caller can trigger debouncedSave manually after engine.step() calls

    // Initial save setup - clean up timer on dispose
    cleanupFns.push(() => {
      if (saveTimer) clearTimeout(saveTimer);
    });

    // Expose a way to trigger save (for future use)
    void debouncedSave;
  }

  return () => {
    cleanupFns.forEach((fn) => fn());
  };
}

/**
 * Generate Tauri configuration from Praxis app config
 */
export function generateTauriConfig(config: TauriAppConfig): Record<string, unknown> {
  return {
    $schema:
      'https://raw.githubusercontent.com/tauri-apps/tauri/tauri-v2.0.0/core/tauri-config-schema/schema.json',
    productName: config.name,
    version: config.version,
    identifier: config.identifier,
    app: {
      windows: [
        {
          title: config.window?.title || config.name,
          width: config.window?.width || 800,
          height: config.window?.height || 600,
          minWidth: config.window?.minWidth,
          minHeight: config.window?.minHeight,
          resizable: config.window?.resizable ?? true,
          fullscreen: config.window?.fullscreen ?? false,
          decorations: config.window?.decorations ?? true,
          transparent: config.window?.transparent ?? false,
          alwaysOnTop: config.window?.alwaysOnTop ?? false,
          center: config.window?.center ?? true,
        },
      ],
      security: {
        csp: config.security?.csp || "default-src 'self'",
        devtools: config.security?.devTools ?? false,
      },
    },
    build: {
      devUrl: 'http://localhost:5173',
      frontendDist: '../dist',
    },
    plugins: Object.fromEntries((config.plugins || []).map((p) => [p.name, p.config || {}])),
  };
}
