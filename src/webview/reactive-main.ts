declare function acquireVsCodeApi(): any;

import { mount } from 'svelte';
import { appState } from './store.svelte.js';
import ReactiveApp from './components/ReactiveApp.svelte';
import type { ApplicationState } from '../fsm/types.js';

const vscode = acquireVsCodeApi();

window.addEventListener('message', (event: MessageEvent<{ type: string; payload: any }>) => {
  const message = event.data;
  console.log('[reactive-main] Received message:', message.type);
  if (message.type === 'syncState') {
    appState.set(message.payload as ApplicationState);
  }
});

const target = document.getElementById('svelte-root');

if (!target) {
  throw new Error('Could not find svelte-root element');
}

const app = mount(ReactiveApp, {
  target,
});

vscode.postMessage({ type: 'ready' });

console.log('🟢 [reactive-main] ReactiveApp component mounted and running.');

export default app;
