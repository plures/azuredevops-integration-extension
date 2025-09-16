<script lang="ts">
  export let timer: any = undefined;
  $: elapsed = format(timer?.elapsedSeconds || 0);
  function format(sec:number) {
    const h = Math.floor(sec/3600).toString().padStart(2,'0');
    const m = Math.floor((sec%3600)/60).toString().padStart(2,'0');
    const s = Math.floor(sec%60).toString().padStart(2,'0');
    return `${h}:${m}:${s}`;
  }
</script>

<style>
  .panel { border:1px solid var(--vscode-editorWidget-border); padding:.75rem; border-radius:4px; background: var(--vscode-editor-background); }
  .title { font-weight:600; margin:0 0 .5rem; font-size:.9rem; }
  .time { font-family: monospace; font-size:1.1rem; }
  .meta-line { font-size:.7rem; opacity:.7; }
  .empty-msg { opacity:.6; font-size:.8rem; }
</style>

<div class="panel">
  <h4 class="title">Timer</h4>
  {#if timer}
    <div class="time">{elapsed}</div>
    <div class="meta-line">#{timer.workItemId} {timer.isPaused ? '(Paused)' : ''}</div>
  {:else}
    <div class="empty-msg">No active timer.</div>
  {/if}
</div>
