<!--
Module: apps/app-desktop/src/lib/components/AuthReminder.svelte
Reminds users to authenticate when needed
-->
<script lang="ts">
  let { context, sendEvent }: { context: any; sendEvent: (event: any) => void } = $props();
  
  // Check if we need to show auth reminder
  const needsAuth = $derived(
    context?.lastError?.message?.includes('auth') ||
    context?.lastError?.message?.includes('401') ||
    context?.lastError?.message?.includes('403')
  );
  
  function handleSignIn() {
    sendEvent({ type: 'SIGN_IN' });
  }
</script>

{#if needsAuth}
  <div class="auth-reminder" role="alert">
    <p>
      <strong>Authentication Required</strong>
    </p>
    <p>
      Your Personal Access Token may have expired or is invalid. Please sign in again.
    </p>
    <button onclick={handleSignIn}>
      Sign In
    </button>
  </div>
{/if}

<style>
  .auth-reminder {
    margin: 1rem 0;
    padding: 1rem;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 4px;
    color: #856404;
  }
  
  @media (prefers-color-scheme: dark) {
    .auth-reminder {
      background: #4a3c00;
      border-color: #8a6d00;
      color: #ffd700;
    }
  }
  
  .auth-reminder p {
    margin: 0.5rem 0;
  }
  
  button {
    background: #0078d4;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 0.5rem;
  }
  
  button:hover {
    background: #106ebe;
  }
</style>
