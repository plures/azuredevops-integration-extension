<!--
Module: apps/app-desktop/src/lib/components/WebviewHeader.svelte
Header with actions and controls
-->
<script lang="ts">
  let { context, sendEvent }: { context: any; sendEvent: (event: any) => void } = $props();
  
  let searchQuery = $state('');
  
  function handleViewToggle() {
    const newMode = context?.viewMode === 'list' ? 'kanban' : 'list';
    sendEvent({ type: 'TOGGLE_VIEW_MODE', viewMode: newMode });
  }
  
  function handleRefresh() {
    sendEvent({ type: 'REFRESH_WORK_ITEMS' });
  }
  
  function handleSettings() {
    sendEvent({ type: 'OPEN_SETTINGS' });
  }
  
  function handleSearch() {
    sendEvent({ type: 'SEARCH', query: searchQuery });
  }
</script>

<div class="webview-header">
  <div class="header-left">
    <h1>Azure DevOps</h1>
  </div>
  
  <div class="header-center">
    <div class="search-box">
      <input
        type="search"
        bind:value={searchQuery}
        placeholder="Search work items..."
        onkeyup={(e) => e.key === 'Enter' && handleSearch()}
      />
      <button onclick={handleSearch} title="Search">
        🔍
      </button>
    </div>
  </div>
  
  <div class="header-right">
    <button onclick={handleViewToggle} title="Toggle View">
      {context?.viewMode === 'list' ? '☷' : '📋'}
    </button>
    <button onclick={handleRefresh} title="Refresh">
      ↻
    </button>
    <button onclick={handleSettings} title="Settings">
      ⚙
    </button>
  </div>
</div>

<style>
  .webview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid #ccc;
    gap: 1rem;
  }
  
  @media (prefers-color-scheme: dark) {
    .webview-header {
      border-bottom-color: #555;
    }
  }
  
  .header-left h1 {
    margin: 0;
    font-size: 1.5rem;
    color: #0078d4;
  }
  
  .header-center {
    flex: 1;
    max-width: 500px;
  }
  
  .search-box {
    display: flex;
    gap: 0.5rem;
  }
  
  .search-box input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.875rem;
  }
  
  @media (prefers-color-scheme: dark) {
    .search-box input {
      background: #3a3a3a;
      border-color: #555;
      color: #f6f6f6;
    }
  }
  
  .header-right {
    display: flex;
    gap: 0.5rem;
  }
  
  button {
    padding: 0.5rem;
    border: 1px solid #ccc;
    background: transparent;
    color: #0078d4;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1.125rem;
    min-width: 36px;
    min-height: 36px;
    line-height: 1;
  }
  
  @media (prefers-color-scheme: dark) {
    button {
      border-color: #555;
      color: #4da6ff;
    }
  }
  
  button:hover {
    background: rgba(0, 120, 212, 0.1);
  }
</style>
