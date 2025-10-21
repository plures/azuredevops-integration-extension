/**
 * Svelte 5 Debug Entry Point
 * 
 * Simplified version to test webview loading
 */

import { mount } from 'svelte';
// import App from './DebugApp.svelte';

// ============================================================================
// VS CODE API SETUP
// ============================================================================

declare global {
  interface Window {
    vscode?: any;
    acquireVsCodeApi?: () => any;
  }
}

// Acquire VS Code API
const vscode = window.vscode || window.acquireVsCodeApi?.();

// ============================================================================
// INITIALIZATION
// ============================================================================

console.log('[reactive-main] Starting Svelte 5 debug webview...');

try {
  // Mount the debug app
  const target = document.getElementById('svelte-root');
  
  if (!target) {
    throw new Error('Could not find svelte-root element');
  }
  
  // const app = mount(App, {
  //   target
  // });
  
  console.log('[reactive-main] Debug app mount commented out - DebugApp.svelte import disabled');
  
  // Export for debugging
  (window as any).__DEBUG_APP__ = {
    // app,
    vscode
  };
  
} catch (error) {
  console.error('[reactive-main] Failed to initialize debug webview:', error);
  
  // Fallback error display
  const root = document.getElementById('svelte-root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; color: #ff6b6b;">
        <h2>Debug Error</h2>
        <p>Failed to load debug interface: ${error instanceof Error ? error.message : String(error)}</p>
        <button onclick="window.location.reload()">Retry</button>
      </div>
    `;
  }
}