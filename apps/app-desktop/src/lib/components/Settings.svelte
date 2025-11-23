<!--
Module: apps/app-desktop/src/lib/components/Settings.svelte
Connection settings and configuration for desktop app
-->
<script lang="ts">
  // Dynamic invoke guarded for browser
  let invoke: (<T>(cmd: string, args?: any) => Promise<T>) = async () => undefined as any;
  if ((window as any).__TAURI__) {
    import('@tauri-apps/api/core').then(m => { invoke = m.invoke as any; }).catch(() => {});
  }
  import { open } from '@tauri-apps/plugin-dialog';
  
  let { context, sendEvent }: { context: any; sendEvent: (event: any) => void } = $props();
  
  let organization = $state('');
  let project = $state('');
  let pat = $state('');
  let baseUrl = $state('https://dev.azure.com');
  let connectionLabel = $state('');
  let isSubmitting = $state(false);
  let errorMessage = $state('');
  let successMessage = $state('');
  
  async function handleSubmit(event: Event) {
    event.preventDefault();
    isSubmitting = true;
    errorMessage = '';
    successMessage = '';
    
    try {
      // Validate inputs
      if (!organization || !project || !pat) {
        throw new Error('Organization, Project, and PAT are required');
      }
      
      // Create connection object
      const connection = {
        id: `${organization}-${project}`,
        organization,
        project,
        baseUrl,
        label: connectionLabel || `${organization}/${project}`,
        authMethod: 'pat',
      };
      
      if ((window as any).__TAURI__) {
        // Save connection via Tauri
        await invoke('save_connection', { connection, pat });
        // Save PAT token securely
        await invoke('save_token', { connectionId: connection.id, token: pat });
      } else {
        // Browser: simulate save
        console.log('[Settings] Browser save (simulated)', connection);
      }
      
      successMessage = 'Connection saved successfully!';
      
      // Clear sensitive data
      pat = '';
      
      // Notify app to reload connections
      sendEvent({ type: 'CONNECTION_ADDED', connection });
      
      // Wait a bit then close settings
      setTimeout(() => {
        sendEvent({ type: 'CLOSE_SETTINGS' });
      }, 2000);
      
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[Settings] Save error:', error);
    } finally {
      isSubmitting = false;
    }
  }
  
  function handleCancel() {
    sendEvent({ type: 'CLOSE_SETTINGS' });
  }
</script>

<div class="settings-container">
  <h2>Configure Azure DevOps Connection</h2>
  
  <form onsubmit={handleSubmit}>
    <div class="form-group">
      <label for="organization">Organization *</label>
      <input
        id="organization"
        type="text"
        bind:value={organization}
        placeholder="your-org"
        required
      />
      <small>Example: contoso</small>
    </div>
    
    <div class="form-group">
      <label for="project">Project *</label>
      <input
        id="project"
        type="text"
        bind:value={project}
        placeholder="Your Project"
        required
      />
    </div>
    
    <div class="form-group">
      <label for="baseUrl">Base URL</label>
      <input
        id="baseUrl"
        type="text"
        bind:value={baseUrl}
        placeholder="https://dev.azure.com"
      />
      <small>Use https://dev.azure.com for cloud, or your on-prem URL</small>
    </div>
    
    <div class="form-group">
      <label for="connectionLabel">Connection Label (Optional)</label>
      <input
        id="connectionLabel"
        type="text"
        bind:value={connectionLabel}
        placeholder="My Project"
      />
    </div>
    
    <div class="form-group">
      <label for="pat">Personal Access Token (PAT) *</label>
      <input
        id="pat"
        type="password"
        bind:value={pat}
        placeholder="Enter your PAT"
        required
      />
      <small>
        Scopes needed: Work Items (Read & Write), Code (Read & Write), Build (Read)
      </small>
    </div>
    
    {#if errorMessage}
      <div class="error-message" role="alert">
        {errorMessage}
      </div>
    {/if}
    
    {#if successMessage}
      <div class="success-message" role="status">
        {successMessage}
      </div>
    {/if}
    
    <div class="button-group">
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Connection'}
      </button>
      <button type="button" onclick={handleCancel} disabled={isSubmitting}>
        Cancel
      </button>
    </div>
  </form>
  
  <div class="help-section">
    <h3>Need help?</h3>
    <p>
      To create a Personal Access Token:
    </p>
    <ol>
      <li>Go to Azure DevOps → User Settings → Personal Access Tokens</li>
      <li>Click "New Token"</li>
      <li>Select required scopes: Work Items, Code, Build</li>
      <li>Copy the token and paste it above</li>
    </ol>
  </div>
</div>

<style>
  .settings-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  h2 {
    margin-top: 0;
    color: #0078d4;
  }
  
  h3 {
    margin-top: 2rem;
    font-size: 1.1rem;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
    box-sizing: border-box;
  }
  
  @media (prefers-color-scheme: dark) {
    input {
      background: #3a3a3a;
      border-color: #555;
      color: #f6f6f6;
    }
  }
  
  small {
    display: block;
    margin-top: 0.25rem;
    color: #666;
    font-size: 0.875rem;
  }
  
  @media (prefers-color-scheme: dark) {
    small {
      color: #aaa;
    }
  }
  
  .error-message {
    padding: 0.75rem;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 4px;
    color: #856404;
    margin-bottom: 1rem;
  }
  
  @media (prefers-color-scheme: dark) {
    .error-message {
      background: #4a3c00;
      border-color: #8a6d00;
      color: #ffd700;
    }
  }
  
  .success-message {
    padding: 0.75rem;
    background: #d4edda;
    border: 1px solid #28a745;
    border-radius: 4px;
    color: #155724;
    margin-bottom: 1rem;
  }
  
  @media (prefers-color-scheme: dark) {
    .success-message {
      background: #1e4620;
      border-color: #28a745;
      color: #9aff9a;
    }
  }
  
  .button-group {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
  }
  
  button {
    flex: 1;
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  button[type="submit"] {
    background: #0078d4;
    color: white;
  }
  
  button[type="submit"]:hover:not(:disabled) {
    background: #106ebe;
  }
  
  button[type="button"] {
    background: #f3f3f3;
    color: #333;
  }
  
  @media (prefers-color-scheme: dark) {
    button[type="button"] {
      background: #3a3a3a;
      color: #f6f6f6;
    }
  }
  
  button[type="button"]:hover:not(:disabled) {
    background: #e0e0e0;
  }
  
  @media (prefers-color-scheme: dark) {
    button[type="button"]:hover:not(:disabled) {
      background: #4a4a4a;
    }
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .help-section {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid #ccc;
  }
  
  @media (prefers-color-scheme: dark) {
    .help-section {
      border-top-color: #555;
    }
  }
  
  ol {
    margin-left: 1.5rem;
    line-height: 1.6;
  }
</style>
