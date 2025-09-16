<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let workItems: any[] = [];
  export let kanbanView: boolean = false;
  const dispatch = createEventDispatcher();

  // Reference to avoid Svelte unused export warning until kanban layout implemented
  $: kanbanView;

  function start(item: any) { dispatch('startTimer', item); }
</script>

<style>
  .list { display:flex; flex-direction:column; gap:.4rem; }
  .item { padding:.5rem .6rem; border:1px solid var(--vscode-editorWidget-border); border-radius:4px; background: var(--vscode-editor-background); cursor:pointer; }
  .id { opacity:.7; font-size:.75rem; }
  .title { font-weight:500; }
  .state { font-size:.7rem; text-transform:uppercase; letter-spacing:.05em; }
  .empty-msg { opacity:.6; font-size:.8rem; }
</style>

<div class="list">
  {#each workItems as wi}
    <div class="item" role="button" tabindex="0" on:click={() => start(wi)} on:keydown={(e)=> (e.key==='Enter'||e.key===' ') && (e.preventDefault(), start(wi))}>
      <div class="id">#{wi.fields?.['System.Id']}</div>
      <div class="title">{wi.fields?.['System.Title']}</div>
      <div class="state">{wi.fields?.['System.State']}</div>
    </div>
  {/each}
  {#if workItems.length === 0}
    <div class="empty-msg">No work items.</div>
  {/if}
</div>
