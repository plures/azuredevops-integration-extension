/**
 * FSM Integration for Desktop Application
 *
 * This module demonstrates how to integrate XState FSM machines from the parent
 * VS Code extension into the Tauri desktop application.
 */

import { createActor, type AnyActorRef } from 'xstate';
import type { ApplicationContext } from '../../../src/fsm/machines/applicationMachine.js';
import { getPlatformAdapter } from './platform-adapter';

// Type for our FSM snapshot that will be sent to UI
export interface FsmSnapshot {
  value: string;
  context: ApplicationContext;
  matches: Record<string, boolean>;
}

/**
 * Desktop-specific FSM Manager
 *
 * This wraps the shared application FSM machine and adapts it for Tauri
 */
export class DesktopFsmManager {
  private actor: AnyActorRef | null = null;
  private platformAdapter = getPlatformAdapter();
  private subscribers: ((snapshot: FsmSnapshot) => void)[] = [];

  /**
   * Initialize the FSM with desktop-specific actors
   */
  async initialize() {
    console.log('[DesktopFSM] Initializing application machine...');

    // Dynamically import the machine to avoid bundling issues
    // Note: applicationMachine is directly exported, not a factory function
    const { applicationMachine } = await import('../../../src/fsm/machines/applicationMachine.js');

    // Create and start the actor
    // The applicationMachine is pre-configured for VS Code extension context
    // For desktop, we would need to adapt it or create a desktop-specific machine
    // For now, we use it as-is for demonstration purposes
    this.actor = createActor(applicationMachine);

    // Subscribe to state changes
    this.actor.subscribe((state) => {
      const snapshot: FsmSnapshot = {
        value: JSON.stringify(state.value),
        context: state.context as ApplicationContext,
        matches: this.computeMatches(state),
      };

      console.log('[DesktopFSM] State changed:', snapshot.value);

      // Notify all subscribers
      this.subscribers.forEach((subscriber) => subscriber(snapshot));
    });

    this.actor.start();
    console.log('[DesktopFSM] Application machine started');
  }

  /**
   * Send an event to the FSM
   */
  send(event: any) {
    if (!this.actor) {
      console.error('[DesktopFSM] Cannot send event - actor not initialized');
      return;
    }

    console.log('[DesktopFSM] Sending event:', event.type);
    this.actor.send(event);
  }

  /**
   * Subscribe to FSM state changes
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
   */
  getSnapshot(): FsmSnapshot | null {
    if (!this.actor) {
      return null;
    }

    const state = this.actor.getSnapshot();
    return {
      value: JSON.stringify(state.value),
      context: state.context as ApplicationContext,
      matches: this.computeMatches(state),
    };
  }

  /**
   * Compute state matches for easier UI conditionals
   */
  private computeMatches(state: any): Record<string, boolean> {
    const matches: Record<string, boolean> = {};

    // Helper to check if in state
    const check = (path: string) => {
      return state.matches(path);
    };

    // Common state checks used by UI
    matches.inactive = check('inactive');
    matches.activating = check('activating');
    matches.activation_failed = check('activation_failed');
    matches.active = check('active');
    matches['active.setup'] = check('active.setup');
    matches['active.ready'] = check('active.ready');
    matches['active.ready.managingConnections'] = check('active.ready.managingConnections');

    return matches;
  }

  /**
   * Cleanup and stop the FSM
   */
  dispose() {
    if (this.actor) {
      this.actor.stop();
      this.actor = null;
    }
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
