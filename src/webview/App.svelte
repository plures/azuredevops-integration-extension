<script lang="ts">
  import { onMount } from 'svelte';
  import { applicationMachine } from '../fsm/machines';
  import { useMachine } from '@xstate/svelte';
  import WorkItemList from './components/WorkItemList.svelte';
  import Settings from './components/Settings.svelte';
  import StatusBar from './components/StatusBar.svelte';
  import { fsmLogger } from '../fsm/logging';

  const { state, send } = useMachine(applicationMachine);

  onMount(() => {
    fsmLogger.info('Svelte component mounted', {
      fsmComponent: 'App',
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
      <button on:click={() => send({ type: 'RETRY' })}>Retry</button>
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
