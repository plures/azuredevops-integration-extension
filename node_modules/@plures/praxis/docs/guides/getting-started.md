# Getting Started with Praxis Framework

Welcome to Praxis, the full-stack application framework for the Plures ecosystem! This guide will help you get started building modern, local-first, distributed applications.

## What is Praxis?

Praxis is a **schema-driven framework** that unifies:

- **Logic Engine**: Facts, events, rules, and constraints for business logic
- **Component Generation**: Auto-generate UI from schemas
- **Local-First Data**: PluresDB for reactive, offline-capable storage
- **Visual Development**: CodeCanvas for schema and logic editing
- **Orchestration**: Distributed system coordination with DSC/MCP
- **Documentation**: Automatic State-Docs generation

## Prerequisites

- Node.js 18+ and npm
- Basic TypeScript knowledge
- Familiarity with Svelte (for UI)
- Git for version control

## Installation

### Install Praxis CLI

```bash
npm install -g @plures/praxis
```

Verify installation:

```bash
praxis --version
```

## Create Your First App

### 1. Create a new project

```bash
praxis create app my-first-app
cd my-first-app
npm install
```

This creates a basic Praxis app with:

- Schema setup
- Logic engine configuration
- Svelte UI scaffolding
- PluresDB integration
- Development scripts

### 2. Explore the structure

```
my-first-app/
  ├── src/
  │   ├── schemas/
  │   │   └── app.schema.ts      # Your app schema
  │   ├── logic/
  │   │   └── engine.ts          # Logic engine setup
  │   ├── components/            # UI components
  │   ├── store/                 # Data store
  │   └── main.ts               # Entry point
  ├── package.json
  └── README.md
```

### 3. Define your schema

Open `src/schemas/app.schema.ts`:

```typescript
import type { PraxisSchema } from '@plures/praxis/schema';

export const appSchema: PraxisSchema = {
  version: '1.0.0',
  name: 'MyFirstApp',
  description: 'My first Praxis application',

  // Define data models
  models: [
    {
      name: 'Task',
      description: 'A task item',
      fields: [
        { name: 'id', type: 'string', description: 'Unique identifier' },
        { name: 'title', type: 'string', description: 'Task title' },
        { name: 'completed', type: 'boolean', default: false },
        { name: 'createdAt', type: 'date' },
      ],
      indexes: [{ name: 'by_created', fields: ['createdAt'] }],
    },
  ],

  // Define UI components
  components: [
    {
      name: 'TaskForm',
      type: 'form',
      model: 'Task',
      description: 'Form for creating/editing tasks',
    },
    {
      name: 'TaskList',
      type: 'list',
      model: 'Task',
      description: 'List of all tasks',
    },
  ],

  // Define business logic
  logic: [
    {
      id: 'task-logic',
      description: 'Task management logic',
      events: [
        {
          tag: 'TASK_CREATE',
          payload: { title: 'string' },
          description: 'Create a new task',
        },
        {
          tag: 'TASK_COMPLETE',
          payload: { taskId: 'string' },
          description: 'Mark task as completed',
        },
      ],
      facts: [
        {
          tag: 'TaskCreated',
          payload: { taskId: 'string', title: 'string' },
          description: 'A task was created',
        },
        {
          tag: 'TaskCompleted',
          payload: { taskId: 'string' },
          description: 'A task was completed',
        },
      ],
      rules: [
        {
          id: 'create-task',
          description: 'Create a task when TASK_CREATE event occurs',
          on: ['TASK_CREATE'],
          then: 'emit TaskCreated fact',
          priority: 10,
        },
      ],
      constraints: [
        {
          id: 'task-title-required',
          description: 'Task title must not be empty',
          check: 'title.length > 0',
          message: 'Task title is required',
        },
      ],
    },
  ],
};
```

### 4. Generate code from schema

```bash
praxis generate --schema src/schemas/app.schema.ts
```

This generates:

- `src/components/TaskForm.svelte` - Form component
- `src/components/TaskList.svelte` - List component
- `src/logic/facts.ts` - Fact definitions
- `src/logic/events.ts` - Event definitions
- `src/logic/rules.ts` - Rule implementations
- TypeScript types throughout

### 5. Implement custom logic

The generator creates stubs that you can customize. Edit `src/logic/rules.ts`:

```typescript
import { defineRule } from '@plures/praxis';
import { TaskCreated } from './facts';
import { TASK_CREATE } from './events';

export const createTaskRule = defineRule({
  id: 'create-task',
  description: 'Create a task when TASK_CREATE event occurs',
  impl: (state, events) => {
    const createEvent = events.find(TASK_CREATE.is);
    if (createEvent) {
      const taskId = crypto.randomUUID();
      return [
        TaskCreated.create({
          taskId,
          title: createEvent.payload.title,
        }),
      ];
    }
    return [];
  },
});
```

### 6. Wire up the UI

Edit `src/App.svelte`:

```svelte
<script lang="ts">
  import { createPraxisStore } from '@plures/praxis/svelte';
  import { engine } from './logic/engine';
  import TaskForm from './components/TaskForm.svelte';
  import TaskList from './components/TaskList.svelte';

  const store = createPraxisStore(engine);
</script>

<main>
  <h1>My Task App</h1>
  <TaskForm />
  <TaskList />
</main>

<style>
  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }
</style>
```

### 7. Run the development server

```bash
npm run dev
```

Open http://localhost:5173 to see your app!

## Core Concepts

### Schemas

Schemas are the single source of truth. They define:

- **Models**: Data structures and relationships
- **Components**: UI elements and their behavior
- **Logic**: Facts, events, rules, and constraints
- **Orchestration**: Distributed coordination (optional)

### Logic Engine

The Praxis logic engine processes:

- **Events**: Things that happen (user actions, external triggers)
- **Facts**: Derived information about the domain
- **Rules**: Pure functions that transform events into facts
- **Constraints**: Invariants that must always hold

### Component Generation

Components are generated from schemas but can be customized:

- Generated components provide scaffolding
- Extend with custom behavior and styling
- Regenerate safely (customizations preserved in separate files)

### Local-First Data

PluresDB provides:

- Reactive data storage
- Offline operation
- Automatic sync when connected
- Conflict resolution

## Next Steps

### Visual Editing with Canvas

```bash
praxis canvas src/schemas/app.schema.ts
```

Opens CodeCanvas at http://localhost:3000 for visual schema editing.

### Add Authentication

```bash
praxis create component Auth --template auth
```

Generates authentication components and logic.

### Enable Documentation

State-Docs automatically generates documentation from your schemas:

```bash
npm run docs
```

View at http://localhost:3001

### Deploy

Build for production:

```bash
npm run build
```

Deploy the `dist/` folder to your hosting provider.

## Examples

Check out the examples in the Praxis repository:

- **Offline-First Chat**: Demonstrates local-first architecture
- **Knowledge Canvas**: Shows Canvas integration
- **E-Commerce**: Full-featured example with auth and cart

## Resources

- [Framework Architecture](./FRAMEWORK.md)
- [Schema Reference](../api/schema.md)
- [Logic Engine Guide](../api/logic.md)
- [Component Generation](../api/components.md)
- [Praxis Repository](https://github.com/plures/praxis)

## Getting Help

- GitHub Issues: Report bugs and request features
- Discussions: Ask questions and share your projects
- Discord: Join the Plures community

## What's Next?

Now that you have a basic app running:

1. Explore the generated code
2. Add more models and components
3. Implement complex business logic
4. Try visual editing with Canvas
5. Enable orchestration for distributed features
6. Build something amazing!

Welcome to the Praxis framework! 🚀
