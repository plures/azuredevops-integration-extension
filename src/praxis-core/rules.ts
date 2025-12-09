import type { AppState } from './state.svelte.js';
import type { AppEvent } from './events.js';

/**
 * Rules
 *
 * Pure functions (conceptually) that mutate the state based on events.
 * In Svelte 5, we mutate the proxy directly.
 */

// eslint-disable-next-line complexity
export function processEvent(state: AppState, event: AppEvent) {
  console.debug(`[Praxis] Processing event: ${event.type}`, event);

  switch (event.type) {
    case 'CONNECTIONS_LOADED':
      state.connections = event.payload.connections;
      state.activeConnectionId = event.payload.activeId;
      break;

    case 'CONNECTION_ADDED':
      state.connections.push(event.payload);
      // Auto-select if it's the first one
      if (state.connections.length === 1) {
        state.activeConnectionId = event.payload.id;
      }
      break;

    case 'CONNECTION_REMOVED':
      state.connections = state.connections.filter((c) => c.id !== event.payload.id);
      if (state.activeConnectionId === event.payload.id) {
        state.activeConnectionId = null;
      }
      break;

    case 'CONNECTION_SELECTED':
      state.activeConnectionId = event.payload.id;
      break;

    case 'CONNECTION_ERROR':
      state.errors.push(event.payload.error);
      // Optionally update the connection status if we add that field
      break;

    case 'AUTH_STARTED':
      state.isAuthenticating = true;
      break;

    case 'AUTH_SUCCESS':
    case 'AUTH_FAILED':
      state.isAuthenticating = false;
      break;
  }
}
