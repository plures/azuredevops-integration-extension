<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { createVSCodeCompatibilityAPI } from '$lib/platform-adapter';

  let greetMsg = $state('');
  let name = $state('');

  // Set up VS Code compatibility layer for webview components
  const vscodeApi = createVSCodeCompatibilityAPI();
  
  // Make it available globally for components that expect it
  if (typeof window !== 'undefined') {
    (window as any).__vscodeApi = vscodeApi;
  }

  async function greet(event: Event) {
    event.preventDefault();
    greetMsg = await invoke<string>('greet', { name });
  }

  onMount(() => {
    console.log('Azure DevOps Integration Desktop App initialized');
  });
</script>

<main class="container">
  <h1>Azure DevOps Integration</h1>
  
  <div class="row">
    <p>Cross-platform desktop application for managing Azure DevOps work items</p>
  </div>

  <div class="card">
    <h2>Welcome!</h2>
    <p>
      This is the MVP version of the Azure DevOps Integration desktop application.
      It leverages the same FSM architecture and business logic as the VS Code extension.
    </p>
    
    <!-- Demo greeting functionality from template -->
    <form class="row" onsubmit={greet}>
      <input
        id="greet-input"
        placeholder="Enter a name..."
        bind:value={name}
      />
      <button type="submit">Greet</button>
    </form>
    <p>{greetMsg}</p>
  </div>

  <div class="card">
    <h3>Next Steps</h3>
    <ul>
      <li>Configure Azure DevOps connection</li>
      <li>Authenticate with PAT or OAuth</li>
      <li>View and manage work items</li>
      <li>Track time on work items</li>
    </ul>
  </div>
</main>

<style>
  :root {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    line-height: 1.5;
    font-weight: 400;
    color: #0f0f0f;
    background-color: #f6f6f6;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      color: #f6f6f6;
      background-color: #1a1a1a;
    }
  }

  .container {
    margin: 0;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0;
    color: #0078d4;
  }

  .row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .card {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  @media (prefers-color-scheme: dark) {
    .card {
      background: #2d2d2d;
    }
  }

  h2, h3 {
    margin-top: 0;
  }

  ul {
    list-style-type: none;
    padding-left: 0;
  }

  ul li::before {
    content: '✓ ';
    color: #0078d4;
    font-weight: bold;
    margin-right: 0.5rem;
  }

  input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }

  @media (prefers-color-scheme: dark) {
    input {
      background: #3a3a3a;
      border-color: #555;
      color: #f6f6f6;
    }
  }

  button {
    padding: 0.5rem 1rem;
    background: #0078d4;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  button:hover {
    background: #106ebe;
  }

  button:active {
    background: #005a9e;
  }
</style>
