<script lang="ts">
  import { onMount } from 'svelte';
  import { createVSCodeCompatibilityAPI } from '$lib/platform-adapter';
  import App from '$lib/components/App.svelte';

  // Set up VS Code compatibility layer for webview components
  const vscodeApi = createVSCodeCompatibilityAPI();
  
  // Make it available globally for components that expect it
  if (typeof window !== 'undefined') {
    (window as any).__vscodeApi = vscodeApi;
  }

  onMount(() => {
    console.log('Azure DevOps Integration Desktop App initialized');
  });
</script>

<App />
