# Advanced Todo App with Praxis

A comprehensive example demonstrating Praxis's Svelte 5 integration with history state pattern.

## Features

### Core Functionality

- ✅ Add, complete, and remove todos
- ✅ Filter by all, active, or completed
- ✅ Complete all todos at once
- ✅ Clear completed todos
- ✅ Real-time statistics

### Advanced Features

- 🔄 **Undo/Redo**: Full history tracking with keyboard shortcuts
- 🕰️ **Time-Travel Debugging**: Navigate through state snapshots
- ⚡ **Svelte 5 Runes**: Modern reactive API
- 🎨 **Beautiful UI**: Clean, intuitive interface
- ⌨️ **Keyboard Shortcuts**: Efficient workflow

## Architecture

### State Management

- **Engine**: Praxis logic engine managing todo state
- **Rules**: Pure functions handling events
- **Facts**: Immutable history of what happened
- **Context**: Current application state

### Svelte Integration

- **usePraxisEngine**: Main composable with history support
- **Reactive Derivations**: Computed values with `$:` syntax
- **Event Dispatching**: Type-safe event handling
- **Snapshot Navigation**: Time-travel through history

## Code Structure

```
advanced-todo/
├── index.ts      # Engine definition, rules, and logic
├── App.svelte    # Svelte 5 component with UI
└── README.md     # This file
```

### Engine Definition (`index.ts`)

```typescript
// Define context type
interface TodoContext {
  todos: TodoItem[];
  filter: 'all' | 'active' | 'completed';
  nextId: number;
}

// Define events
const AddTodo = defineEvent<'ADD_TODO', { text: string }>('ADD_TODO');
const ToggleTodo = defineEvent<'TOGGLE_TODO', { id: string }>('TOGGLE_TODO');
// ... more events

// Define rules
const addTodoRule = defineRule<TodoContext>({
  id: 'todo.add',
  description: 'Add a new todo item',
  impl: (state, events) => {
    // Pure function: no side effects
    // Returns facts about what happened
  },
});

// Create engine
export function createTodoEngine() {
  const registry = new PraxisRegistry<TodoContext>();
  registry.registerRule(addTodoRule);
  // ... register more rules

  return createPraxisEngine({
    initialContext: { todos: [], filter: 'all', nextId: 1 },
    registry,
  });
}
```

### Svelte Component (`App.svelte`)

```svelte
<script lang="ts">
  import { usePraxisEngine } from '@plures/praxis/svelte';
  import { createTodoEngine, AddTodo } from './index';

  const engine = createTodoEngine();
  const {
    context,      // Reactive context
    dispatch,     // Dispatch events
    undo,         // Undo last action
    redo,         // Redo action
    canUndo,      // Boolean: can undo?
    canRedo,      // Boolean: can redo?
    snapshots,    // History snapshots
    historyIndex, // Current position
    goToSnapshot, // Jump to snapshot
  } = usePraxisEngine(engine, {
    enableHistory: true,
    maxHistorySize: 50,
  });

  function handleAddTodo(text: string) {
    dispatch([AddTodo.create({ text })], 'Add Todo');
  }
</script>

<div>
  <p>Todos: {context.todos.length}</p>
  <button onclick={undo} disabled={!canUndo}>Undo</button>
  <button onclick={redo} disabled={!canRedo}>Redo</button>
</div>
```

## Running the Example

### Non-Svelte Version

Run the TypeScript example directly:

```bash
cd /home/runner/work/praxis/praxis
npm run build
node dist/examples/advanced-todo/index.js
```

Output:

```
=== Advanced Todo Example ===

1. Adding todos:
   Total todos: 3
   - Learn Praxis
   - Build awesome app
   - Deploy to production

2. Completing first todo:
   Active: 2, Completed: 1

3. Filtering to active todos:
   Filter: active
   Showing 2 todos:
   - Build awesome app
   - Deploy to production

4. Completing all todos:
   All completed: 3/3

5. Clearing completed todos:
   Remaining todos: 0
```

### Svelte 5 Version

To use the Svelte component in your app:

1. Install dependencies:

```bash
npm install @plures/praxis svelte@^5.0.0
```

2. Import and use the component:

```svelte
<script>
  import TodoApp from '@plures/praxis/examples/advanced-todo/App.svelte';
</script>

<TodoApp />
```

Or create your own component using the engine:

```svelte
<script lang="ts">
  import { usePraxisEngine } from '@plures/praxis/svelte';
  import { createTodoEngine, AddTodo } from '@plures/praxis/examples/advanced-todo';

  const engine = createTodoEngine();
  const { context, dispatch } = usePraxisEngine(engine);

  let text = '';
</script>

<input bind:value={text} />
<button onclick={() => dispatch([AddTodo.create({ text })])}>
  Add
</button>

<ul>
  {#each context.todos as todo}
    <li>{todo.text}</li>
  {/each}
</ul>
```

## Keyboard Shortcuts

- **Ctrl+Z** / **Cmd+Z**: Undo
- **Ctrl+Y** / **Cmd+Y**: Redo
- **Ctrl+D** / **Cmd+D**: Toggle debugger
- **Enter**: Add todo (when input is focused)

## Key Concepts

### 1. Immutable State Updates

```typescript
// ❌ Don't mutate directly (outside rules)
context.todos.push(newTodo);

// ✅ Do dispatch events
dispatch([AddTodo.create({ text: 'New todo' })]);
```

### 2. Pure Rules

```typescript
const addTodoRule = defineRule({
  id: 'todo.add',
  impl: (state, events) => {
    // ✅ Pure function
    // - Deterministic
    // - No side effects
    // - Testable
    const event = findEvent(events, AddTodo);
    if (!event) return [];

    state.context.todos.push({
      /* ... */
    });
    return [
      TodoAdded.create({
        /* ... */
      }),
    ];
  },
});
```

### 3. Facts as History

```typescript
// Facts are immutable records of what happened
const facts = engine.getFacts();

// Find specific facts
const added = facts.filter((f) => f.tag === 'TodoAdded');
const toggled = facts.filter((f) => f.tag === 'TodoToggled');

// Facts enable:
// - Audit trails
// - Event sourcing
// - Time-travel debugging
```

### 4. Reactive Derivations

```svelte
<script>
  // Svelte automatically tracks dependencies
  $: filteredTodos = getFilteredTodos(context.todos, context.filter);
  $: stats = getStats(context.todos);
  $: hasCompleted = stats.completed > 0;
</script>
```

### 5. History State Pattern

```typescript
// Enable history tracking
const { undo, redo, snapshots, goToSnapshot } = usePraxisEngine(engine, {
  enableHistory: true,
  maxHistorySize: 50,
});

// Navigate history
undo(); // Go back
redo(); // Go forward
goToSnapshot(5); // Jump to specific snapshot
console.log(snapshots); // View all snapshots
```

## Testing

The engine can be tested independently of Svelte:

```typescript
import { createTodoEngine, AddTodo, ToggleTodo } from './index';

describe('Todo Engine', () => {
  it('should add todos', () => {
    const engine = createTodoEngine();
    engine.step([AddTodo.create({ text: 'Test todo' })]);

    const context = engine.getContext();
    expect(context.todos.length).toBe(1);
    expect(context.todos[0].text).toBe('Test todo');
  });

  it('should toggle todos', () => {
    const engine = createTodoEngine();
    engine.step([AddTodo.create({ text: 'Test' })]);

    const context = engine.getContext();
    const todoId = context.todos[0].id;

    engine.step([ToggleTodo.create({ id: todoId })]);
    expect(engine.getContext().todos[0].completed).toBe(true);
  });
});
```

## Performance Tips

1. **Batch Events**: Dispatch multiple events at once

   ```typescript
   dispatch(
     [
       AddTodo.create({ text: 'Todo 1' }),
       AddTodo.create({ text: 'Todo 2' }),
       AddTodo.create({ text: 'Todo 3' }),
     ],
     'Batch Add'
   );
   ```

2. **Limit History**: Adjust history size based on needs

   ```typescript
   usePraxisEngine(engine, { maxHistorySize: 20 });
   ```

3. **Selective Subscriptions**: Use derived stores for specific values
   ```typescript
   const count = createDerivedStore(engine, (ctx) => ctx.todos.length);
   ```

## Comparison with Other Libraries

### vs. Redux + Redux Toolkit

| Feature        | Redux + RTK  | Praxis    |
| -------------- | ------------ | --------- |
| State Updates  | Reducers     | Rules     |
| Side Effects   | Thunks/Sagas | Actors    |
| Time-Travel    | DevTools     | Built-in  |
| TypeScript     | Good         | Excellent |
| Learning Curve | Medium       | Low       |

### vs. XState

| Feature            | XState         | Praxis                |
| ------------------ | -------------- | --------------------- |
| State Machines     | Native         | Engine-based          |
| Svelte Integration | @xstate/svelte | @plures/praxis/svelte |
| History States     | Built-in       | Pattern-based         |
| Visual Tools       | Stately        | State-Docs (planned)  |
| Learning Curve     | High           | Medium                |

### vs. Svelte Stores

| Feature     | Svelte Stores | Praxis    |
| ----------- | ------------- | --------- |
| Simplicity  | Very High     | High      |
| Structure   | Manual        | Built-in  |
| Time-Travel | Manual        | Built-in  |
| Rules/Logic | Manual        | Built-in  |
| TypeScript  | Good          | Excellent |

## Next Steps

- Explore [History State Pattern Guide](../../docs/guides/history-state-pattern.md)
- Read [Svelte Integration Guide](../../docs/guides/svelte-integration.md)
- Check [Parallel State Pattern](../../docs/guides/parallel-state-pattern.md)
- View [More Examples](../)

## License

MIT
