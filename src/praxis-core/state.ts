import type { ConnectionConfig, AppError } from './events.js';

/**
 * Application State
 *
 * The Single Source of Truth for the application.
 * Plain TypeScript class for Node.js environment.
 */
export class AppState {
  // Core State
  connections: ConnectionConfig[] = [];
  activeConnectionId: string | null = null;
  errors: AppError[] = [];
  isAuthenticating = false;

  // Derived State
  get activeConnection() {
    return this.connections.find((c) => c.id === this.activeConnectionId);
  }

  get hasConnections() {
    return this.connections.length > 0;
  }

  constructor() {
    // Initial state is empty
  }
}

export const appState = new AppState();
