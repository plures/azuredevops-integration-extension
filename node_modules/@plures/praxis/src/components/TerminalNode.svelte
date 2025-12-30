<script lang="ts">
  /**
   * TerminalNode.svelte
   * 
   * Svelte component for terminal nodes in Praxis/RuneBook.
   * Provides a terminal interface with command execution, history, and canvas integration.
   */
  import { onDestroy } from 'svelte';
  import type { TerminalAdapter } from '../runtime/terminal-adapter.js';
  import type { TerminalExecutionResult } from '../runtime/terminal-adapter.js';

  // Props
  export let adapter: TerminalAdapter;
  export let x: number = 0;
  export let y: number = 0;
  export let width: number = 600;
  export let height: number = 400;
  export let draggable: boolean = true;
  export let resizable: boolean = true;
  export let showContextMenu: boolean = false;

  // Local state
  let currentCommand = '';
  let isDragging = false;
  let isResizing = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let resizeStartX = 0;
  let resizeStartY = 0;
  let resizeStartWidth = 0;
  let resizeStartHeight = 0;
  let terminalOutput: TerminalExecutionResult[] = [];
  let contextMenuX = 0;
  let contextMenuY = 0;
  let outputContainer: HTMLDivElement;

  // Get state from adapter
  $: state = adapter.getState();
  $: inputMode = state.inputMode;
  $: history = state.history;
  $: lastOutput = state.lastOutput;

  // Execute command
  async function executeCommand() {
    if (!currentCommand.trim()) return;

    const result = await adapter.executeCommand(currentCommand);
    terminalOutput = [...terminalOutput, result];
    currentCommand = '';

    // Auto-scroll to bottom after DOM update
    if (outputContainer) {
      setTimeout(() => {
        outputContainer.scrollTop = outputContainer.scrollHeight;
      }, 0);
    }
  }

  // Handle keyboard shortcuts
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      executeCommand();
    }
  }

  // Drag handling
  function startDrag(event: MouseEvent) {
    if (!draggable) return;
    isDragging = true;
    dragStartX = event.clientX - x;
    dragStartY = event.clientY - y;
  }

  function handleDrag(event: MouseEvent) {
    if (!isDragging) return;
    x = event.clientX - dragStartX;
    y = event.clientY - dragStartY;
  }

  function stopDrag() {
    isDragging = false;
  }

  // Resize handling
  function startResize(event: MouseEvent) {
    if (!resizable) return;
    event.stopPropagation();
    isResizing = true;
    resizeStartX = event.clientX;
    resizeStartY = event.clientY;
    resizeStartWidth = width;
    resizeStartHeight = height;
  }

  function handleResize(event: MouseEvent) {
    if (!isResizing) return;
    const deltaX = event.clientX - resizeStartX;
    const deltaY = event.clientY - resizeStartY;
    width = Math.max(300, resizeStartWidth + deltaX);
    height = Math.max(200, resizeStartHeight + deltaY);
  }

  function stopResize() {
    isResizing = false;
  }

  // Context menu handling
  function handleContextMenu(event: MouseEvent) {
    event.preventDefault();
    contextMenuX = event.clientX;
    contextMenuY = event.clientY;
    showContextMenu = true;
  }

  function closeContextMenu() {
    showContextMenu = false;
  }

  function clearTerminal() {
    terminalOutput = [];
    adapter.clearHistory();
    closeContextMenu();
  }

  function copyLastOutput() {
    if (lastOutput) {
      navigator.clipboard.writeText(lastOutput);
    }
    closeContextMenu();
  }

  // Global mouse event listeners with proper cleanup
  let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  let mouseUpHandler: (() => void) | null = null;

  $: {
    // Remove old listeners if they exist
    if (mouseMoveHandler) {
      window.removeEventListener('mousemove', mouseMoveHandler);
    }
    if (mouseUpHandler) {
      window.removeEventListener('mouseup', mouseUpHandler);
    }

    // Add new listeners if dragging or resizing
    if (isDragging) {
      mouseMoveHandler = handleDrag;
      mouseUpHandler = stopDrag;
      window.addEventListener('mousemove', mouseMoveHandler);
      window.addEventListener('mouseup', mouseUpHandler);
    } else if (isResizing) {
      mouseMoveHandler = handleResize;
      mouseUpHandler = stopResize;
      window.addEventListener('mousemove', mouseMoveHandler);
      window.addEventListener('mouseup', mouseUpHandler);
    } else {
      mouseMoveHandler = null;
      mouseUpHandler = null;
    }
  }

  // Cleanup event listeners on component destroy
  onDestroy(() => {
    if (mouseMoveHandler) {
      window.removeEventListener('mousemove', mouseMoveHandler);
    }
    if (mouseUpHandler) {
      window.removeEventListener('mouseup', mouseUpHandler);
    }
  });

  // Click outside to close context menu
  function handleDocumentClick() {
    if (showContextMenu) {
      closeContextMenu();
    }
  }
</script>

<svelte:window on:click={handleDocumentClick} />

<div
  class="terminal-node"
  style="left: {x}px; top: {y}px; width: {width}px; height: {height}px;"
  on:contextmenu={handleContextMenu}
  role="application"
  aria-label="Terminal Node"
>
  <!-- Title bar -->
  <div
    class="terminal-header"
    on:mousedown={startDrag}
    role="banner"
  >
    <span class="terminal-title">Terminal: {state.nodeId}</span>
    <span class="terminal-mode">Mode: {inputMode}</span>
  </div>

  <!-- Output area -->
  <div class="terminal-output" bind:this={outputContainer}>
    {#if terminalOutput.length === 0}
      <div class="terminal-empty">No output yet. Enter a command below.</div>
    {:else}
      {#each terminalOutput as result}
        <div class="terminal-result">
          <div class="terminal-command">$ {result.command}</div>
          <div class="terminal-result-output">{result.output}</div>
          {#if result.error}
            <div class="terminal-error">Error: {result.error}</div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  <!-- Input area -->
  <div class="terminal-input-area">
    <span class="terminal-prompt">$</span>
    {#if inputMode === 'text'}
      <input
        type="text"
        class="terminal-input"
        bind:value={currentCommand}
        on:keydown={handleKeyDown}
        placeholder="Enter command..."
        aria-label="Terminal input"
      />
    {:else if inputMode === 'widget'}
      <textarea
        class="terminal-input terminal-input-widget"
        bind:value={currentCommand}
        on:keydown={handleKeyDown}
        placeholder="Enter command..."
        rows="1"
        aria-label="Terminal input widget"
      />
    {/if}
    <button class="terminal-submit" on:click={executeCommand}>Run</button>
  </div>

  <!-- Resize handle -->
  {#if resizable}
    <div
      class="terminal-resize-handle"
      on:mousedown={startResize}
      role="button"
      tabindex="0"
      aria-label="Resize terminal"
    />
  {/if}

  <!-- Context menu -->
  {#if showContextMenu}
    <div
      class="terminal-context-menu"
      style="left: {contextMenuX}px; top: {contextMenuY}px;"
      role="menu"
    >
      <button class="context-menu-item" on:click={clearTerminal}>Clear Terminal</button>
      <button class="context-menu-item" on:click={copyLastOutput} disabled={!lastOutput}>
        Copy Last Output
      </button>
      <button class="context-menu-item" on:click={closeContextMenu}>Close Menu</button>
    </div>
  {/if}
</div>

<style>
  .terminal-node {
    position: absolute;
    display: flex;
    flex-direction: column;
    background: #1e1e1e;
    border: 1px solid #3c3c3c;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    color: #d4d4d4;
    overflow: hidden;
  }

  .terminal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #2d2d2d;
    border-bottom: 1px solid #3c3c3c;
    cursor: move;
    user-select: none;
  }

  .terminal-title {
    font-weight: 600;
    font-size: 14px;
  }

  .terminal-mode {
    font-size: 12px;
    color: #858585;
  }

  .terminal-output {
    flex: 1;
    padding: 12px;
    overflow-y: auto;
    background: #1e1e1e;
    font-size: 13px;
    line-height: 1.6;
  }

  .terminal-empty {
    color: #858585;
    font-style: italic;
  }

  .terminal-result {
    margin-bottom: 16px;
  }

  .terminal-command {
    color: #4ec9b0;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .terminal-result-output {
    color: #d4d4d4;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .terminal-error {
    color: #f48771;
    margin-top: 4px;
  }

  .terminal-input-area {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #2d2d2d;
    border-top: 1px solid #3c3c3c;
  }

  .terminal-prompt {
    color: #4ec9b0;
    font-weight: 600;
  }

  .terminal-input {
    flex: 1;
    padding: 6px 8px;
    background: #3c3c3c;
    border: 1px solid #515151;
    border-radius: 4px;
    color: #d4d4d4;
    font-family: inherit;
    font-size: 13px;
  }

  .terminal-input:focus {
    outline: none;
    border-color: #007acc;
  }

  .terminal-input-widget {
    resize: vertical;
    min-height: 28px;
  }

  .terminal-submit {
    padding: 6px 16px;
    background: #007acc;
    border: none;
    border-radius: 4px;
    color: white;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .terminal-submit:hover {
    background: #005a9e;
  }

  .terminal-submit:active {
    background: #004578;
  }

  .terminal-resize-handle {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;
    background: linear-gradient(135deg, transparent 50%, #515151 50%);
  }

  .terminal-resize-handle:hover {
    background: linear-gradient(135deg, transparent 50%, #007acc 50%);
  }

  .terminal-context-menu {
    position: fixed;
    background: #2d2d2d;
    border: 1px solid #515151;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    padding: 4px 0;
    z-index: 1000;
  }

  .context-menu-item {
    display: block;
    width: 100%;
    padding: 8px 16px;
    background: transparent;
    border: none;
    color: #d4d4d4;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    transition: background 0.2s;
  }

  .context-menu-item:hover:not(:disabled) {
    background: #3c3c3c;
  }

  .context-menu-item:disabled {
    color: #858585;
    cursor: not-allowed;
  }

  /* Scrollbar styling */
  .terminal-output::-webkit-scrollbar {
    width: 8px;
  }

  .terminal-output::-webkit-scrollbar-track {
    background: #1e1e1e;
  }

  .terminal-output::-webkit-scrollbar-thumb {
    background: #515151;
    border-radius: 4px;
  }

  .terminal-output::-webkit-scrollbar-thumb:hover {
    background: #686868;
  }
</style>
