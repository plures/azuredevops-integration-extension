/**
 * Context-Driven Demo Entry Point
 * 
 * This creates a standalone demo of the context-driven architecture
 * that can be tested alongside the main webview.
 */

import { mount } from 'svelte';
// import ContextDrivenWorkItems from './ContextDrivenWorkItems.svelte';
import './contextIntegration.js'; // Initialize context integration

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
const vscode = (() => {
  if (typeof window !== 'undefined' && window.acquireVsCodeApi) {
    return window.acquireVsCodeApi();
  }
  return undefined;
})();

// Make API globally available
if (typeof window !== 'undefined') {
  window.vscode = vscode;
}

// ============================================================================
// APP MOUNTING
// ============================================================================

let app: any;

function createApp() {
  const target = document.getElementById('app');
  if (!target) {
    console.error('[Context Demo] No #app element found');
    return;
  }

  console.log('🌟 [Context Demo] Mounting context-driven work items demo...');
  
  // app = mount(ContextDrivenWorkItems, { 
  //   target,
  //   props: {}
  // });

  console.log('✅ [Context Demo] Context-driven demo mount commented out - ContextDrivenWorkItems.svelte import disabled');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createApp);
  } else {
    createApp();
  }
}

// ============================================================================
// DEBUGGING
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).contextDemo = {
    app,
    remount: () => {
      if (app) {
        app.$destroy?.();
      }
      createApp();
    },
    testMessage: (type: string, data: any = {}) => {
      if (vscode) {
        vscode.postMessage({ type, ...data });
      } else {
        console.log('[Context Demo] No VS Code API, would send:', { type, ...data });
      }
    }
  };
}

export default app;