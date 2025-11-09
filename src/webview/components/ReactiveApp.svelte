<!--
Module: src/webview/components/ReactiveApp.svelte
Owner: webview
Reads: syncState from extension (ApplicationContext serialized)
Writes: UI-only events; selection via selection writer factory (webview-owned)
Receives: syncState, host broadcasts
Emits: fsmEvent envelopes (Router handles stamping)
Prohibitions: Do not import extension host modules; Do not define context types
Rationale: Svelte UI component; reacts to ApplicationContext and forwards intents

LLM-GUARD:
- Use selection writer factory for selection updates
- Do not route by connection here; let Router decide targets
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { applicationMachine } from '../../fsm/machines';
  import { useMachine } from '@xstate/svelte';
  import WorkItemList from './WorkItemList.svelte';
  import Settings from './Settings.svelte';
  import StatusBar from './StatusBar.svelte';
  import { fsmLogger } from '../../fsm/logging';

  const { state, send } = useMachine(applicationMachine);

  onMount(() => {
    fsmLogger.info('Svelte component mounted', {
      fsmComponent: 'ReactiveApp',
      state: $state.value,
    });
  });
</script>

<main>
  {#if $state.matches('uninitialized')}
    <p>Loading...</p>
  {:else if $state.matches('settings')}
    <Settings {send} />
  {:else if $state.matches('workItemSelection')}
    <WorkItemList {send} />
  {:else if $state.matches('error')}
    <div class="error-container">
      <h2>An Error Occurred</h2>
      <p>{$state.context.error?.message ?? 'Unknown error'}</p>
      <button onclick={() => send({ type: 'RETRY' })}>Retry</button>
    </div>
  {/if}
</main>

<StatusBar fsmState={$state} />

<style>
  main {
    padding: 1rem;
    height: calc(100vh - 30px); /* Adjust based on StatusBar height */
    overflow-y: auto;
  }

  .error-container {
    padding: 1rem;
    color: var(--vscode-errorForeground);
  }
</style>
