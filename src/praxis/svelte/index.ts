/**
 * Praxis Svelte Integration Module
 *
 * Exports for Svelte 5 runes-compatible Praxis state management.
 * Phase 6 of the Praxis migration.
 */

// Types
export * from './types.js';

// Engine hook
export {
  usePraxisEngine,
  matchesState,
  createStateMatchers,
} from './usePraxisEngine.svelte.js';

// VS Code webview adapter
export {
  createVSCodePraxisAdapter,
  useRemotePraxisEngine,
  getGlobalPraxisAdapter,
  resetGlobalPraxisAdapter,
} from './vscodeAdapter.svelte.js';
