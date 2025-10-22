import App from './components/App.svelte';
import { appState } from './store.svelte.js';
import type { ApplicationState } from '../fsm/types.js';

declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

window.addEventListener('message', (event: MessageEvent<{ type: string; payload: any }>) => {
  const message = event.data;
  if (message.type === 'syncState') {
    appState.set(message.payload as ApplicationState);
  }
});

// Request initial state from the extension
vscode.postMessage({ type: 'getInitialState' });

const app = new App({
  target: document.body,
});

export default app;
