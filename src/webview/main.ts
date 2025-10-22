import { mount } from 'svelte';
import App from './App.svelte';

// This ensures that we only try to mount the Svelte app after the DOM is fully loaded.
// This is a critical step to prevent race conditions where the script runs before the
// target element (`svelte-root`) is available.
window.addEventListener('DOMContentLoaded', () => {
  const target = document.getElementById('svelte-root');

  if (target) {
    try {
      console.log('Svelte target found, mounting ReactiveApp...');
      mount(App, { target });
      console.log('🟢 [reactive-main] ReactiveApp component mounted successfully.');

      // It's also good practice to re-acquire the vscode api and notify when ready
      // inside the listener to ensure everything is set up.
      if (typeof acquireVsCodeApi === 'function') {
        const vscode = acquireVsCodeApi();
        vscode.postMessage({ type: 'ready' });
      }
    } catch (e) {
      console.error('🔴 [reactive-main] Failed to mount ReactiveApp:', e);
    }
  } else {
    console.error('🔴 [reactive-main] Could not find svelte-root element in webview HTML.');
  }
});

// Make sure acquireVsCodeApi is declared if it's used.
declare function acquireVsCodeApi(): any;

