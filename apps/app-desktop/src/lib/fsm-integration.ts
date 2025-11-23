/**
 * FSM Integration for Desktop Application
 *
 * This module provides a stub for integrating XState FSM machines from the parent
 * VS Code extension into the Tauri desktop application.
 *
 * NOTE: Full FSM integration is planned for future iterations.
 * For now, this is a stub implementation that provides the interface
 * without the actual FSM logic.
 */

import { createActor, type AnyActorRef } from 'xstate';
import { getPlatformAdapter } from './platform-adapter';

// Temporary type placeholder until FSM integration is complete
type ApplicationContext = any;

// Type for our FSM snapshot that will be sent to UI
export interface FsmSnapshot {
  value: string;
  context: ApplicationContext;
  matches: Record<string, boolean>;
}

/**
 * Desktop-specific FSM Manager (Stub Implementation)
 *
 * This provides the interface for FSM integration but currently
 * returns stub/mock data. Full integration pending.
 */
export class DesktopFsmManager {
  private actor: AnyActorRef | null = null;
  private platformAdapter = getPlatformAdapter();
  private subscribers: ((snapshot: FsmSnapshot) => void)[] = [];

  /**
   * Initialize the FSM with desktop-specific actors
   *
   * NOTE: This is a stub implementation. Full FSM integration pending.
   */
  async initialize() {
    console.log('[DesktopFSM] Stub initialization - FSM integration pending');
    // TODO: Import and initialize actual FSM machines when ready
    // const { applicationMachine } = await import('../../../src/fsm/machines/applicationMachine.js');
    // this.actor = createActor(applicationMachine);
    // this.actor.subscribe((state) => { ... });
    // this.actor.start();
    return Promise.resolve();
  }

  /**
   * Send an event to the FSM
   *
   * NOTE: Stub implementation - logs but doesn't process
   */
  send(event: any) {
    console.log('[DesktopFSM] Stub send - event:', event.type);
    // Events are currently ignored in stub implementation
  }

  /**
   * Subscribe to FSM state changes
   *
   * NOTE: Stub implementation - accepts subscriptions but never fires them
   */
  subscribe(callback: (snapshot: FsmSnapshot) => void): () => void {
    this.subscribers.push(callback);
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Get current FSM snapshot
   *
   * NOTE: Stub implementation returns null
   */
  getSnapshot(): FsmSnapshot | null {
    return null;
  }

  /**
   * Stop the FSM
   *
   * NOTE: Stub implementation
   */
  stop() {
    console.log('[DesktopFSM] Stub stop');
    this.actor = null;
  }

  /**
   * Cleanup and dispose resources
   *
   * NOTE: Stub implementation
   */
  dispose() {
    this.stop();
    this.subscribers = [];
    console.log('[DesktopFSM] Disposed');
  }
}

// Singleton instance
let fsmManager: DesktopFsmManager | null = null;

/**
 * Get or create the singleton FSM manager
 */
export function getFsmManager(): DesktopFsmManager {
  if (!fsmManager) {
    fsmManager = new DesktopFsmManager();
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
