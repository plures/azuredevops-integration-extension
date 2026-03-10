/**
 * @ado-ext/ui-web — design-dojo component library
 *
 * Re-exports all Svelte components and the CSS design-token path.
 * Import tokens in your app entry:
 *   import '@ado-ext/ui-web/tokens.css';
 */

// Core interaction components
export { default as Button } from './components/Button.svelte';
export { default as IconButton } from './components/IconButton.svelte';
export { default as Badge } from './components/Badge.svelte';
export { default as Alert } from './components/Alert.svelte';
export { default as EmptyState } from './components/EmptyState.svelte';
export { default as Toast } from './components/Toast.svelte';
export { default as TabBar } from './components/TabBar.svelte';

// Azure DevOps domain components
export { default as WorkItemStateBadge } from './components/WorkItemStateBadge.svelte';
export { default as PriorityBadge } from './components/PriorityBadge.svelte';
