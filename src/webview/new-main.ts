import App from './App.svelte';
import { appState } from './store.svelte';
import type { ApplicationState } from '../fsm/types';

const vscode = acquireVsCodeApi();

window.addEventListener('message', (event: MessageEvent<{ type: string; payload: ApplicationState }>) => {
  const message = event.data;
  if (message.type === 'syncState') {
    appState.set(message.payload);
  }
});

const app = new App({
  target: document.body,
});

export default app;
