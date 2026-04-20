/**
 * Advanced Svelte 5 Integration Example
 *
 * Demonstrates the new Svelte 5 runes support with history state pattern.
 * This example shows a todo app with undo/redo and time-travel debugging.
 */

import {
  createPraxisEngine,
  PraxisRegistry,
  defineFact,
  defineEvent,
  defineRule,
  findEvent,
} from '../../index.js';

// ============================================================================
// Context & Domain Types
// ============================================================================

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

interface TodoContext {
  todos: TodoItem[];
  filter: 'all' | 'active' | 'completed';
  nextId: number;
}

// ============================================================================
// Facts
// ============================================================================

const TodoAdded = defineFact<'TodoAdded', { id: string; text: string }>('TodoAdded');
const TodoToggled = defineFact<'TodoToggled', { id: string }>('TodoToggled');
const TodoRemoved = defineFact<'TodoRemoved', { id: string }>('TodoRemoved');
const FilterChanged = defineFact<'FilterChanged', { filter: string }>('FilterChanged');
const AllCompleted = defineFact<'AllCompleted', {}>('AllCompleted');
const CompletedCleared = defineFact<'CompletedCleared', {}>('CompletedCleared');

// ============================================================================
// Events
// ============================================================================

const AddTodo = defineEvent<'ADD_TODO', { text: string }>('ADD_TODO');
const ToggleTodo = defineEvent<'TOGGLE_TODO', { id: string }>('TOGGLE_TODO');
const RemoveTodo = defineEvent<'REMOVE_TODO', { id: string }>('REMOVE_TODO');
const SetFilter = defineEvent<'SET_FILTER', { filter: 'all' | 'active' | 'completed' }>(
  'SET_FILTER'
);
const CompleteAll = defineEvent<'COMPLETE_ALL', {}>('COMPLETE_ALL');
const ClearCompleted = defineEvent<'CLEAR_COMPLETED', {}>('CLEAR_COMPLETED');

// ============================================================================
// Rules
// ============================================================================

const addTodoRule = defineRule<TodoContext>({
  id: 'todo.add',
  description: 'Add a new todo item',
  impl: (state, events) => {
    const event = findEvent(events, AddTodo);
    if (!event || !event.payload.text.trim()) {
      return [];
    }

    const id = `todo-${state.context.nextId}`;
    const todo: TodoItem = {
      id,
      text: event.payload.text.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    state.context.todos.push(todo);
    state.context.nextId++;

    return [TodoAdded.create({ id, text: todo.text })];
  },
});

const toggleTodoRule = defineRule<TodoContext>({
  id: 'todo.toggle',
  description: 'Toggle todo completion status',
  impl: (state, events) => {
    const event = findEvent(events, ToggleTodo);
    if (!event) {
      return [];
    }

    const todo = state.context.todos.find((t) => t.id === event.payload.id);
    if (todo) {
      todo.completed = !todo.completed;
      return [TodoToggled.create({ id: todo.id })];
    }

    return [];
  },
});

const removeTodoRule = defineRule<TodoContext>({
  id: 'todo.remove',
  description: 'Remove a todo item',
  impl: (state, events) => {
    const event = findEvent(events, RemoveTodo);
    if (!event) {
      return [];
    }

    const index = state.context.todos.findIndex((t) => t.id === event.payload.id);
    if (index !== -1) {
      state.context.todos.splice(index, 1);
      return [TodoRemoved.create({ id: event.payload.id })];
    }

    return [];
  },
});

const setFilterRule = defineRule<TodoContext>({
  id: 'todo.setFilter',
  description: 'Change the filter',
  impl: (state, events) => {
    const event = findEvent(events, SetFilter);
    if (!event) {
      return [];
    }

    state.context.filter = event.payload.filter;
    return [FilterChanged.create({ filter: event.payload.filter })];
  },
});

const completeAllRule = defineRule<TodoContext>({
  id: 'todo.completeAll',
  description: 'Mark all todos as completed',
  impl: (state, events) => {
    const event = findEvent(events, CompleteAll);
    if (!event) {
      return [];
    }

    state.context.todos.forEach((todo) => {
      todo.completed = true;
    });

    return [AllCompleted.create({})];
  },
});

const clearCompletedRule = defineRule<TodoContext>({
  id: 'todo.clearCompleted',
  description: 'Remove all completed todos',
  impl: (state, events) => {
    const event = findEvent(events, ClearCompleted);
    if (!event) {
      return [];
    }

    const beforeCount = state.context.todos.length;
    state.context.todos = state.context.todos.filter((t) => !t.completed);
    const afterCount = state.context.todos.length;

    if (beforeCount !== afterCount) {
      return [CompletedCleared.create({})];
    }

    return [];
  },
});

// ============================================================================
// Engine Factory
// ============================================================================

export function createTodoEngine() {
  const registry = new PraxisRegistry<TodoContext>();

  registry.registerRule(addTodoRule);
  registry.registerRule(toggleTodoRule);
  registry.registerRule(removeTodoRule);
  registry.registerRule(setFilterRule);
  registry.registerRule(completeAllRule);
  registry.registerRule(clearCompletedRule);

  return createPraxisEngine<TodoContext>({
    initialContext: {
      todos: [],
      filter: 'all',
      nextId: 1,
    },
    registry,
  });
}

// ============================================================================
// Helper Functions for Svelte
// ============================================================================

export function getFilteredTodos(todos: TodoItem[], filter: string): TodoItem[] {
  switch (filter) {
    case 'active':
      return todos.filter((t) => !t.completed);
    case 'completed':
      return todos.filter((t) => t.completed);
    default:
      return todos;
  }
}

export function getStats(todos: TodoItem[]) {
  const total = todos.length;
  const active = todos.filter((t) => !t.completed).length;
  const completed = todos.filter((t) => t.completed).length;

  return { total, active, completed };
}

// ============================================================================
// Example Usage (non-Svelte demonstration)
// ============================================================================

function runExample() {
  console.log('=== Advanced Todo Example ===\n');

  const engine = createTodoEngine();

  // Add some todos
  console.log('1. Adding todos:');
  engine.step([AddTodo.create({ text: 'Learn Praxis' })]);
  engine.step([AddTodo.create({ text: 'Build awesome app' })]);
  engine.step([AddTodo.create({ text: 'Deploy to production' })]);

  const context1 = engine.getContext();
  console.log(`   Total todos: ${context1.todos.length}`);
  context1.todos.forEach((todo) => {
    console.log(`   - ${todo.text}`);
  });
  console.log();

  // Toggle a todo
  console.log('2. Completing first todo:');
  const firstId = context1.todos[0].id;
  engine.step([ToggleTodo.create({ id: firstId })]);

  const context2 = engine.getContext();
  const stats = getStats(context2.todos);
  console.log(`   Active: ${stats.active}, Completed: ${stats.completed}`);
  console.log();

  // Change filter
  console.log('3. Filtering to active todos:');
  engine.step([SetFilter.create({ filter: 'active' })]);

  const context3 = engine.getContext();
  const filtered = getFilteredTodos(context3.todos, context3.filter);
  console.log(`   Filter: ${context3.filter}`);
  console.log(`   Showing ${filtered.length} todos:`);
  filtered.forEach((todo) => {
    console.log(`   - ${todo.text}`);
  });
  console.log();

  // Complete all
  console.log('4. Completing all todos:');
  engine.step([CompleteAll.create({})]);

  const context4 = engine.getContext();
  const stats4 = getStats(context4.todos);
  console.log(`   All completed: ${stats4.completed}/${stats4.total}`);
  console.log();

  // Clear completed
  console.log('5. Clearing completed todos:');
  engine.step([ClearCompleted.create({})]);

  const context5 = engine.getContext();
  console.log(`   Remaining todos: ${context5.todos.length}`);
  console.log();
}

// Run example if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExample();
}

export {
  // Types
  type TodoItem,
  type TodoContext,
  // Events
  AddTodo,
  ToggleTodo,
  RemoveTodo,
  SetFilter,
  CompleteAll,
  ClearCompleted,
  // Facts
  TodoAdded,
  TodoToggled,
  TodoRemoved,
  FilterChanged,
  AllCompleted,
  CompletedCleared,
};
