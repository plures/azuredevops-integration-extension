/**
 * FSM Integration for Desktop Application
 *
 * This module integrates the Praxis FSM from the parent VS Code extension
 * into the Tauri desktop application.
 */

import { PraxisApplicationManager } from '@src/praxis/application/manager.ts';
import { eventHandlers, type ApplicationEvent } from '@src/stores/eventHandlers.ts';
import { getPlatformAdapter } from './platform-adapter';
import type { ProjectConnection } from '@src/praxis/connection/types.ts';

// Type for our FSM snapshot that will be sent to UI
export interface FsmSnapshot {
  value: string;
  context: any;
  matches: (state: string) => boolean;
}

/**
 * Desktop-specific Praxis Manager
 */
export class DesktopPraxisManager {
  private manager: PraxisApplicationManager;
  private platformAdapter = getPlatformAdapter();
  private subscribers: ((snapshot: FsmSnapshot) => void)[] = [];
  private pollInterval: any;

  constructor() {
    this.manager = new PraxisApplicationManager();
  }

  /**
   * Initialize the Praxis manager
   */
  async initialize() {
    console.log('[DesktopPraxis] Initializing...');
    this.manager.start();

    // Load connections
    try {
      if ((window as any).__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core');
        const connections = await invoke<ProjectConnection[]>('get_connections');
        console.log('[DesktopPraxis] Loaded connections:', connections);
        this.manager.loadConnections(connections);
      } else {
        // Mock for browser
        console.log('[DesktopPraxis] Browser mode - no connections loaded');
        this.manager.loadConnections([]);
      }
    } catch (e) {
      console.error('[DesktopPraxis] Failed to load connections', e);
    }

    // Activate the application
    this.manager.activate();

    // Start polling for state changes
    this.pollInterval = setInterval(() => {
      this.notifySubscribers();
    }, 100);

    return Promise.resolve();
  }

  /**
   * Reload connections from backend
   */
  async reloadConnections() {
    try {
      if ((window as any).__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core');
        const connections = await invoke<ProjectConnection[]>('get_connections');
        console.log('[DesktopPraxis] Reloaded connections:', connections);
        this.manager.loadConnections(connections);
      }
    } catch (e) {
      console.error('[DesktopPraxis] Failed to reload connections', e);
    }
  }

  /**
   * Send an event to the Praxis manager
   */
  send(event: ApplicationEvent) {
    console.log('[DesktopPraxis] Event:', event.type, event);

    // Handle desktop-specific events
    if (event.type === 'CONNECTION_ADDED') {
      this.reloadConnections();
      return;
    }

    const handler = eventHandlers[event.type];
    if (handler) {
      handler(this.manager, event);
      this.notifySubscribers(); // Immediate update
    } else {
      console.warn('[DesktopPraxis] Unknown event:', event.type);
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (snapshot: FsmSnapshot) => void): () => void {
    this.subscribers.push(callback);
    callback(this.getSnapshot());
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  private notifySubscribers() {
    const snapshot = this.getSnapshot();
    for (const sub of this.subscribers) {
      sub(snapshot);
    }
  }

  /**
   * Get current snapshot
   */
  getSnapshot(): FsmSnapshot {
    const state = this.manager.getApplicationState();
    const context = this.manager.getContext();
    return {
      value: state,
      context,
      matches: (s: string) => state === s || state.includes(s),
    };
  }

  /**
   * Stop the manager
   */
  stop() {
    console.log('[DesktopPraxis] Stopping...');
    this.manager.stop();
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Cleanup and dispose resources
   */
  dispose() {
    this.stop();
    this.subscribers = [];
    console.log('[DesktopPraxis] Disposed');
  }
}

// Singleton instance
let fsmManager: DesktopPraxisManager | null = null;

/**
 * Get or create the singleton FSM manager
 */
export function getFsmManager(): DesktopPraxisManager {
  if (!fsmManager) {
    fsmManager = new DesktopPraxisManager();
  }
  return fsmManager;
}

/**
 * Initialize FSM on application startup
 */
export async function initializeFsm() {
  const manager = getFsmManager();
  await manager.initialize();
  return manager;
}
