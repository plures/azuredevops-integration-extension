<!--
  Module: src/webview/components/Notification.svelte
  Owner: webview
  Rationale: Thin wrapper over design-dojo Toast.
             Retained for backward compatibility with existing event dispatching pattern.
-->
<script lang="ts">
  import Toast from '@ado-ext/ui-web/components/Toast.svelte';
  import { createEventDispatcher } from 'svelte';

  export let type: 'success' | 'error' | 'info' | 'warning' = 'info';
  export let message: string;

  const dispatch = createEventDispatcher();

  function dismiss() {
    dispatch('dismiss');
  }
</script>

<Toast {type} {message} ondismiss={dismiss} />
