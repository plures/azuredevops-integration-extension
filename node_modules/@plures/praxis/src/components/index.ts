/**
 * Praxis Svelte Components
 *
 * Exports types and interfaces for Svelte components in Praxis/RuneBook applications.
 *
 * Note: Svelte components (.svelte files) must be imported directly in Svelte applications.
 * This module provides TypeScript types for component props.
 *
 * @example
 * ```svelte
 * <script>
 *   import { TerminalNode } from '@plures/praxis/components/TerminalNode.svelte';
 * </script>
 * ```
 */

import type { TerminalAdapter } from '../runtime/terminal-adapter.js';

/**
 * Props for TerminalNode Svelte component
 */
export interface TerminalNodeProps {
  /** Terminal adapter instance (required) */
  adapter: TerminalAdapter;
  /** X position on canvas */
  x?: number;
  /** Y position on canvas */
  y?: number;
  /** Component width in pixels */
  width?: number;
  /** Component height in pixels */
  height?: number;
  /** Enable drag to move */
  draggable?: boolean;
  /** Enable resize handle */
  resizable?: boolean;
  /** Show context menu */
  showContextMenu?: boolean;
}

/**
 * Re-export TerminalAdapter for convenience
 */
export type { TerminalAdapter } from '../runtime/terminal-adapter.js';
export { createTerminalAdapter } from '../runtime/terminal-adapter.js';
