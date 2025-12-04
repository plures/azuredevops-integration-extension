/**
 * Frontend Praxis Store
 *
 * Wraps the frontend engine in a Svelte store.
 */

import { createPraxisStore, createContextStore } from '@plures/praxis/svelte';
import { frontendEngine } from './frontendEngine.js';

// Create the main store (state + context)
export const praxisStore = createPraxisStore(frontendEngine);

// Create a context-only store for easier access in components
export const contextStore = createContextStore(frontendEngine);

// Export dispatch for convenience
export const dispatch = praxisStore.dispatch;
