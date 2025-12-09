import type { ConnectionConfig, AppError } from './events.js';

/**
 * Application State
 *
 * The Single Source of Truth for the application.
 * Uses Svelte 5 Runes for fine-grained reactivity.
 */
export class AppState {
  // Core State
  connections = $state<ConnectionConfig[]>([]);
  activeConnectionId = $state<string | null>(null);
  errors = $state<AppError[]>([]);
  isAuthenticating = $state(false);

  // Derived State
  activeConnection = $derived(this.connections.find((c) => c.id === this.activeConnectionId));

  hasConnections = $derived(this.connections.length > 0);

  constructor() {
    // Initial state is empty
  }
}

export const appState = new AppState();
