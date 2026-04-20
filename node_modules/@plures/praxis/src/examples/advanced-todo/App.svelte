<!-- 
  Advanced Todo App - Svelte 5 Component
  
  This component demonstrates:
  - Svelte 5 runes integration with Praxis
  - History state pattern with undo/redo
  - Time-travel debugging
  - Reactive derived values
-->

<script lang="ts">
  import { usePraxisEngine } from '@plures/praxis/svelte';
  import {
    createTodoEngine,
    getFilteredTodos,
    getStats,
    AddTodo,
    ToggleTodo,
    RemoveTodo,
    SetFilter,
    CompleteAll,
    ClearCompleted,
    type TodoItem,
  } from './index';

  // Create engine with history enabled
  const engine = createTodoEngine();
  const {
    context,
    dispatch,
    undo,
    redo,
    canUndo,
    canRedo,
    snapshots,
    historyIndex,
    goToSnapshot,
  } = usePraxisEngine(engine, {
    enableHistory: true,
    maxHistorySize: 50,
  });

  // Local UI state
  let newTodoText = $state('');
  let showDebugger = $state(false);

  // Derived reactive values
  $: filteredTodos = getFilteredTodos(context.todos, context.filter);
  $: stats = getStats(context.todos);
  $: allCompleted = stats.total > 0 && stats.completed === stats.total;

  // Event handlers
  function handleAddTodo() {
    if (newTodoText.trim()) {
      dispatch([AddTodo.create({ text: newTodoText })], 'Add Todo');
      newTodoText = '';
    }
  }

  function handleToggle(id: string) {
    dispatch([ToggleTodo.create({ id })], 'Toggle Todo');
  }

  function handleRemove(id: string) {
    dispatch([RemoveTodo.create({ id })], 'Remove Todo');
  }

  function handleFilterChange(filter: 'all' | 'active' | 'completed') {
    dispatch([SetFilter.create({ filter })], 'Change Filter');
  }

  function handleCompleteAll() {
    dispatch([CompleteAll.create({})], 'Complete All');
  }

  function handleClearCompleted() {
    if (stats.completed > 0) {
      dispatch([ClearCompleted.create({})], 'Clear Completed');
    }
  }

  // Keyboard shortcuts
  function handleKeydown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'z' && canUndo) {
        event.preventDefault();
        undo();
      } else if (event.key === 'y' && canRedo) {
        event.preventDefault();
        redo();
      } else if (event.key === 'd') {
        event.preventDefault();
        showDebugger = !showDebugger;
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="todo-app">
  <!-- Header -->
  <header class="header">
    <h1>Praxis Todos</h1>
    <div class="history-controls">
      <button onclick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
        ⟲ Undo
      </button>
      <span class="history-info">
        {historyIndex + 1} / {snapshots.length}
      </span>
      <button onclick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">
        ⟳ Redo
      </button>
      <button 
        onclick={() => showDebugger = !showDebugger}
        class:active={showDebugger}
        title="Toggle Debugger (Ctrl+D)"
      >
        🐛 Debug
      </button>
    </div>
  </header>

  <!-- Main Content -->
  <main class="main">
    <!-- Input -->
    <div class="input-section">
      <input
        type="text"
        bind:value={newTodoText}
        onkeypress={(e) => e.key === 'Enter' && handleAddTodo()}
        placeholder="What needs to be done?"
        class="new-todo"
      />
      <button onclick={handleAddTodo} class="add-btn">
        Add
      </button>
    </div>

    {#if stats.total > 0}
      <!-- Filters -->
      <div class="filters">
        <button
          class:active={context.filter === 'all'}
          onclick={() => handleFilterChange('all')}
        >
          All ({stats.total})
        </button>
        <button
          class:active={context.filter === 'active'}
          onclick={() => handleFilterChange('active')}
        >
          Active ({stats.active})
        </button>
        <button
          class:active={context.filter === 'completed'}
          onclick={() => handleFilterChange('completed')}
        >
          Completed ({stats.completed})
        </button>
      </div>

      <!-- Todo List -->
      <ul class="todo-list">
        {#each filteredTodos as todo (todo.id)}
          <li class="todo-item" class:completed={todo.completed}>
            <input
              type="checkbox"
              checked={todo.completed}
              onchange={() => handleToggle(todo.id)}
            />
            <span class="todo-text">{todo.text}</span>
            <button onclick={() => handleRemove(todo.id)} class="remove-btn">
              ✕
            </button>
          </li>
        {/each}
      </ul>

      <!-- Footer -->
      <footer class="footer">
        <span class="stats">
          {stats.active} {stats.active === 1 ? 'item' : 'items'} left
        </span>
        
        <div class="actions">
          <button onclick={handleCompleteAll} disabled={allCompleted}>
            Complete All
          </button>
          <button onclick={handleClearCompleted} disabled={stats.completed === 0}>
            Clear Completed
          </button>
        </div>
      </footer>
    {:else}
      <div class="empty-state">
        <p>No todos yet. Add one above!</p>
      </div>
    {/if}
  </main>

  <!-- Time-Travel Debugger -->
  {#if showDebugger}
    <aside class="debugger">
      <h2>Time-Travel Debugger</h2>
      
      <div class="timeline">
        {#each snapshots as snapshot, index}
          <button
            class="snapshot"
            class:active={index === historyIndex}
            onclick={() => goToSnapshot(index)}
            title={`Snapshot ${index + 1}`}
          >
            <div class="snapshot-time">
              {new Date(snapshot.timestamp).toLocaleTimeString()}
            </div>
            <div class="snapshot-events">
              {snapshot.events.length} events
            </div>
          </button>
        {/each}
      </div>

      <div class="state-viewer">
        <h3>Current State</h3>
        <pre>{JSON.stringify(context, null, 2)}</pre>
      </div>
    </aside>
  {/if}
</div>

<style>
  .todo-app {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e0e0e0;
  }

  .header h1 {
    margin: 0;
    font-size: 2rem;
    color: #333;
  }

  .history-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .history-controls button {
    padding: 0.5rem 1rem;
    border: 1px solid #ddd;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .history-controls button:hover:not(:disabled) {
    background: #f5f5f5;
  }

  .history-controls button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .history-controls button.active {
    background: #e3f2fd;
    border-color: #2196f3;
  }

  .history-info {
    padding: 0 0.5rem;
    color: #666;
    font-size: 0.9rem;
  }

  .input-section {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .new-todo {
    flex: 1;
    padding: 0.75rem;
    border: 2px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  .new-todo:focus {
    outline: none;
    border-color: #2196f3;
  }

  .add-btn {
    padding: 0.75rem 1.5rem;
    background: #2196f3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
  }

  .add-btn:hover {
    background: #1976d2;
  }

  .filters {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .filters button {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ddd;
    background: white;
    border-radius: 4px;
    cursor: pointer;
  }

  .filters button.active {
    background: #2196f3;
    color: white;
    border-color: #2196f3;
  }

  .todo-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .todo-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-bottom: 0.5rem;
    background: white;
  }

  .todo-item.completed {
    background: #f5f5f5;
  }

  .todo-item.completed .todo-text {
    text-decoration: line-through;
    color: #999;
  }

  .todo-item input[type="checkbox"] {
    width: 1.25rem;
    height: 1.25rem;
    cursor: pointer;
  }

  .todo-text {
    flex: 1;
    font-size: 1rem;
  }

  .remove-btn {
    padding: 0.25rem 0.5rem;
    background: transparent;
    border: none;
    color: #f44336;
    cursor: pointer;
    font-size: 1.25rem;
  }

  .remove-btn:hover {
    color: #d32f2f;
  }

  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e0e0e0;
  }

  .stats {
    color: #666;
    font-size: 0.9rem;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .actions button {
    padding: 0.5rem 1rem;
    border: 1px solid #ddd;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .actions button:hover:not(:disabled) {
    background: #f5f5f5;
  }

  .actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: #999;
  }

  .debugger {
    margin-top: 2rem;
    padding: 1rem;
    border: 2px solid #2196f3;
    border-radius: 4px;
    background: #f5f5f5;
  }

  .debugger h2 {
    margin-top: 0;
    color: #2196f3;
  }

  .timeline {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding: 1rem 0;
    margin-bottom: 1rem;
  }

  .snapshot {
    min-width: 100px;
    padding: 0.5rem;
    border: 2px solid #ddd;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    text-align: center;
  }

  .snapshot.active {
    border-color: #2196f3;
    background: #e3f2fd;
  }

  .snapshot-time {
    font-size: 0.8rem;
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .snapshot-events {
    font-size: 0.75rem;
    color: #666;
  }

  .state-viewer {
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 1rem;
  }

  .state-viewer h3 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    font-size: 1rem;
  }

  .state-viewer pre {
    margin: 0;
    overflow-x: auto;
    font-size: 0.85rem;
    line-height: 1.5;
  }
</style>
