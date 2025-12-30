# Todo with PluresDB Tutorial

This tutorial walks you through building a local-first todo application with PluresDB integration. You'll learn how to persist data locally and sync when connected.

**Time:** 25-30 minutes  
**Level:** Beginner to Intermediate  
**Prerequisites:** Completed [First App Tutorial](./first-app.md)

## What You'll Build

A todo application that:

- Stores todos locally with PluresDB
- Works completely offline
- Syncs automatically when connected
- Shows sync status
- Handles conflicts

## Step 1: Set Up the Project

```bash
# Create project
mkdir praxis-todo
cd praxis-todo
npm init -y

# Install dependencies
npm install @plures/praxis

# Install dev dependencies
npm install -D typescript vitest
```

## Step 2: Create the Schema

Create `src/schema.psf.json`:

```json
{
  "$version": "1.0.0",
  "id": "todo-app",
  "name": "Todo App",
  "description": "A local-first todo application with PluresDB",

  "facts": [
    {
      "id": "fact_todo_created",
      "tag": "TodoCreated",
      "description": "A new todo was created",
      "payload": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "title": { "type": "string" },
          "createdAt": { "type": "number" }
        }
      }
    },
    {
      "id": "fact_todo_completed",
      "tag": "TodoCompleted",
      "description": "A todo was marked as complete",
      "payload": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "completedAt": { "type": "number" }
        }
      }
    },
    {
      "id": "fact_todo_deleted",
      "tag": "TodoDeleted",
      "description": "A todo was deleted",
      "payload": {
        "type": "object",
        "properties": {
          "id": { "type": "string" }
        }
      }
    }
  ],

  "events": [
    {
      "id": "event_create_todo",
      "tag": "CREATE_TODO",
      "description": "Create a new todo",
      "payload": {
        "type": "object",
        "properties": {
          "title": { "type": "string" }
        }
      }
    },
    {
      "id": "event_complete_todo",
      "tag": "COMPLETE_TODO",
      "description": "Mark a todo as complete",
      "payload": {
        "type": "object",
        "properties": {
          "id": { "type": "string" }
        }
      }
    },
    {
      "id": "event_delete_todo",
      "tag": "DELETE_TODO",
      "description": "Delete a todo",
      "payload": {
        "type": "object",
        "properties": {
          "id": { "type": "string" }
        }
      }
    }
  ],

  "models": [
    {
      "id": "model_todo",
      "name": "Todo",
      "description": "A todo item",
      "fields": [
        { "name": "id", "type": "uuid", "primary": true },
        { "name": "title", "type": "string" },
        { "name": "completed", "type": "boolean", "default": false },
        { "name": "createdAt", "type": "datetime" },
        { "name": "completedAt", "type": "datetime", "optional": true }
      ],
      "indexes": [
        { "name": "idx_completed", "fields": ["completed"] },
        { "name": "idx_created", "fields": ["createdAt"], "sort": "desc" }
      ]
    }
  ]
}
```

## Step 3: Set Up PluresDB

Create `src/db.ts`:

```typescript
import { createPluresDB } from '@plures/praxis';

// Define the Todo type
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
}

// Create database with schema
export const db = createPluresDB({
  name: 'todo-app',
  version: 1,
  collections: [
    {
      name: 'todos',
      schema: {
        id: { type: 'uuid', primary: true },
        title: { type: 'string', required: true },
        completed: { type: 'boolean', default: false },
        createdAt: { type: 'datetime', default: () => new Date() },
        completedAt: { type: 'datetime', optional: true },
      },
      indexes: [{ fields: ['completed'] }, { fields: ['createdAt'], sort: 'desc' }],
    },
  ],
  sync: {
    enabled: true,
    endpoint: process.env.SYNC_ENDPOINT || 'http://localhost:3001',
    autoSync: true,
    syncInterval: 5000,
  },
});

// Export typed collection
export const todos = db.collection<Todo>('todos');
```

## Step 4: Create the Engine

Create `src/engine.ts`:

```typescript
import {
  createPraxisEngine,
  PraxisRegistry,
  defineFact,
  defineEvent,
  defineRule,
} from '@plures/praxis';
import { todos, Todo } from './db';

// Context type
interface TodoContext {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
  syncStatus: 'online' | 'offline' | 'syncing';
}

// Facts
export const TodoCreated = defineFact<
  'TodoCreated',
  { id: string; title: string; createdAt: number }
>('TodoCreated');

export const TodoCompleted = defineFact<'TodoCompleted', { id: string; completedAt: number }>(
  'TodoCompleted'
);

export const TodoDeleted = defineFact<'TodoDeleted', { id: string }>('TodoDeleted');

// Events
export const CREATE_TODO = defineEvent<'CREATE_TODO', { title: string }>('CREATE_TODO');
export const COMPLETE_TODO = defineEvent<'COMPLETE_TODO', { id: string }>('COMPLETE_TODO');
export const DELETE_TODO = defineEvent<'DELETE_TODO', { id: string }>('DELETE_TODO');
export const SET_FILTER = defineEvent<'SET_FILTER', { filter: 'all' | 'active' | 'completed' }>(
  'SET_FILTER'
);

// Rules
const createTodoRule = defineRule<TodoContext>({
  id: 'todo.create',
  description: 'Create a new todo',
  impl: async (state, events) => {
    const event = events.find(CREATE_TODO.is);
    if (!event) return [];

    const now = Date.now();
    const id = crypto.randomUUID();

    // Create in database
    const todo: Todo = {
      id,
      title: event.payload.title,
      completed: false,
      createdAt: new Date(now),
    };

    await todos.insert(todo);

    // Update local state
    state.context.todos.unshift(todo);

    return [TodoCreated.create({ id, title: event.payload.title, createdAt: now })];
  },
});

const completeTodoRule = defineRule<TodoContext>({
  id: 'todo.complete',
  description: 'Mark a todo as complete',
  impl: async (state, events) => {
    const event = events.find(COMPLETE_TODO.is);
    if (!event) return [];

    const now = Date.now();

    // Update in database
    await todos.updateById(event.payload.id, {
      $set: { completed: true, completedAt: new Date(now) },
    });

    // Update local state
    const todo = state.context.todos.find((t) => t.id === event.payload.id);
    if (todo) {
      todo.completed = true;
      todo.completedAt = new Date(now);
    }

    return [TodoCompleted.create({ id: event.payload.id, completedAt: now })];
  },
});

const deleteTodoRule = defineRule<TodoContext>({
  id: 'todo.delete',
  description: 'Delete a todo',
  impl: async (state, events) => {
    const event = events.find(DELETE_TODO.is);
    if (!event) return [];

    // Delete from database
    await todos.deleteById(event.payload.id);

    // Update local state
    state.context.todos = state.context.todos.filter((t) => t.id !== event.payload.id);

    return [TodoDeleted.create({ id: event.payload.id })];
  },
});

const setFilterRule = defineRule<TodoContext>({
  id: 'todo.setFilter',
  description: 'Set the todo filter',
  impl: (state, events) => {
    const event = events.find(SET_FILTER.is);
    if (!event) return [];

    state.context.filter = event.payload.filter;
    return [];
  },
});

// Registry
const registry = new PraxisRegistry<TodoContext>();
registry.registerRule(createTodoRule);
registry.registerRule(completeTodoRule);
registry.registerRule(deleteTodoRule);
registry.registerRule(setFilterRule);

// Engine factory
export async function createTodoEngine() {
  // Load existing todos from database
  const existingTodos = await todos.find({}, { sort: { createdAt: -1 } });

  return createPraxisEngine({
    initialContext: {
      todos: existingTodos,
      filter: 'all',
      syncStatus: 'online',
    },
    registry,
  });
}
```

## Step 5: Add Sync Status Handling

Update `src/db.ts` to handle sync events:

```typescript
import { createPluresDB } from '@plures/praxis';

// ... existing code ...

// Sync event handlers
export function setupSyncHandlers(onStatusChange: (status: string) => void) {
  db.on('sync:start', () => {
    onStatusChange('syncing');
  });

  db.on('sync:complete', () => {
    onStatusChange('online');
  });

  db.on('sync:error', () => {
    onStatusChange('offline');
  });

  db.on('online', () => {
    onStatusChange('online');
  });

  db.on('offline', () => {
    onStatusChange('offline');
  });
}

// Manual sync
export async function syncNow() {
  return await db.sync();
}

// Get pending changes count
export function getPendingCount(): number {
  return db.getPendingChanges().length;
}
```

## Step 6: Create the Application

Create `src/main.ts`:

```typescript
import { createTodoEngine, CREATE_TODO, COMPLETE_TODO, DELETE_TODO, SET_FILTER } from './engine';
import { setupSyncHandlers, syncNow, getPendingCount } from './db';

async function main() {
  console.log('🚀 Starting Todo App with PluresDB\n');

  // Create engine
  const engine = await createTodoEngine();

  // Setup sync status updates
  setupSyncHandlers((status) => {
    console.log(`📡 Sync status: ${status}`);
  });

  // Display current state
  function displayTodos() {
    const ctx = engine.getContext();
    console.log('\n📋 Todos:');
    console.log('─'.repeat(40));

    const filtered = ctx.todos.filter((todo) => {
      if (ctx.filter === 'active') return !todo.completed;
      if (ctx.filter === 'completed') return todo.completed;
      return true;
    });

    if (filtered.length === 0) {
      console.log('  No todos');
    } else {
      filtered.forEach((todo, i) => {
        const checkbox = todo.completed ? '☑' : '☐';
        console.log(`  ${i + 1}. ${checkbox} ${todo.title}`);
      });
    }

    console.log('─'.repeat(40));
    console.log(`Filter: ${ctx.filter} | Pending sync: ${getPendingCount()}`);
    console.log('');
  }

  // Show initial state
  displayTodos();

  // Add some todos
  console.log('Adding todos...');

  await engine.dispatch([CREATE_TODO.create({ title: 'Learn Praxis' })]);
  await engine.dispatch([CREATE_TODO.create({ title: 'Build with PluresDB' })]);
  await engine.dispatch([CREATE_TODO.create({ title: 'Deploy to production' })]);

  displayTodos();

  // Complete a todo
  const firstTodoId = engine.getContext().todos[0].id;
  console.log(`Completing: ${engine.getContext().todos[0].title}`);
  await engine.dispatch([COMPLETE_TODO.create({ id: firstTodoId })]);

  displayTodos();

  // Filter by active
  console.log('Filtering by active...');
  await engine.dispatch([SET_FILTER.create({ filter: 'active' })]);

  displayTodos();

  // Filter by completed
  console.log('Filtering by completed...');
  await engine.dispatch([SET_FILTER.create({ filter: 'completed' })]);

  displayTodos();

  // Trigger sync
  console.log('Syncing with server...');
  try {
    await syncNow();
    console.log('✅ Sync complete!');
  } catch (error) {
    console.log('⚠️ Sync failed (offline mode)');
  }

  console.log('\n🎉 Done!');
}

main().catch(console.error);
```

## Step 7: Write Tests

Create `src/engine.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTodoEngine,
  CREATE_TODO,
  COMPLETE_TODO,
  DELETE_TODO,
  SET_FILTER,
  TodoCreated,
} from './engine';

describe('Todo Engine', () => {
  let engine: Awaited<ReturnType<typeof createTodoEngine>>;

  beforeEach(async () => {
    engine = await createTodoEngine();
  });

  describe('CREATE_TODO', () => {
    it('should create a new todo', async () => {
      await engine.dispatch([CREATE_TODO.create({ title: 'Test todo' })]);

      const ctx = engine.getContext();
      expect(ctx.todos.length).toBe(1);
      expect(ctx.todos[0].title).toBe('Test todo');
      expect(ctx.todos[0].completed).toBe(false);
    });

    it('should emit TodoCreated fact', async () => {
      const result = await engine.step([CREATE_TODO.create({ title: 'Test' })]);

      expect(result.state.facts).toContainEqual(expect.objectContaining({ tag: 'TodoCreated' }));
    });
  });

  describe('COMPLETE_TODO', () => {
    it('should mark todo as completed', async () => {
      await engine.dispatch([CREATE_TODO.create({ title: 'Test' })]);
      const todoId = engine.getContext().todos[0].id;

      await engine.dispatch([COMPLETE_TODO.create({ id: todoId })]);

      const todo = engine.getContext().todos[0];
      expect(todo.completed).toBe(true);
      expect(todo.completedAt).toBeDefined();
    });
  });

  describe('DELETE_TODO', () => {
    it('should remove the todo', async () => {
      await engine.dispatch([CREATE_TODO.create({ title: 'Test' })]);
      const todoId = engine.getContext().todos[0].id;

      await engine.dispatch([DELETE_TODO.create({ id: todoId })]);

      expect(engine.getContext().todos.length).toBe(0);
    });
  });

  describe('SET_FILTER', () => {
    it('should update the filter', async () => {
      await engine.dispatch([SET_FILTER.create({ filter: 'completed' })]);

      expect(engine.getContext().filter).toBe('completed');
    });
  });
});
```

## Key Concepts Learned

### 1. PluresDB Setup

```typescript
const db = createPluresDB({
  name: 'app-name',
  collections: [{ name: 'items', schema: { ... } }],
  sync: { enabled: true, endpoint: 'https://...' },
});
```

### 2. Reactive Queries

```typescript
// Subscribe to data changes
todos.subscribe({}, (items) => {
  console.log('Todos updated:', items);
});
```

### 3. Offline-First

- Data is stored locally first
- Changes are queued when offline
- Automatic sync when back online

### 4. Sync Status

```typescript
db.on('sync:start', () => {
  /* ... */
});
db.on('sync:complete', () => {
  /* ... */
});
db.on('online', () => {
  /* ... */
});
db.on('offline', () => {
  /* ... */
});
```

## Next Steps

- [Form Builder Tutorial](./form-builder.md) - Build a dynamic form builder
- [PluresDB Documentation](../core/pluresdb-integration.md) - Deep dive into PluresDB
- [Svelte Integration](../guides/svelte-integration.md) - Connect to a UI

---

**Next Tutorial:** [Form Builder](./form-builder.md)
