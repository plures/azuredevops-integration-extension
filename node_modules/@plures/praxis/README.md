dotnet build
dotnet test
# Praxis

**Typed, visual-first application logic for Svelte, Node, and the browser.**

[![npm version](https://img.shields.io/npm/v/@plures/praxis.svg)](https://www.npmjs.com/package/@plures/praxis)
[![JSR](https://jsr.io/badges/@plures/praxis)](https://jsr.io/@plures/praxis)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![Deno Compatible](https://img.shields.io/badge/deno-compatible-brightgreen)](https://deno.land/)

Praxis is **the unified solution for declarative application development**, combining:

- **Logic Modeling**: Typed facts, events, rules, and constraints for domain logic
- **Component Auto-Generation**: Svelte 5 components generated from schemas  
- **Data Persistence**: PluresDB for local-first, reactive data storage
- **Documentation**: Auto-generated docs with State-Docs and visual diagrams
- **Visual Editing**: CodeCanvas for schema design and FSM visualization
- **Distributed Systems**: Unum for identity and multi-node communication

The library delivers a unified ESM/CJS build, curated subpath exports, Svelte runes support, and a slimmer, publish-ready package for npm and JSR.

---

## What’s new
- **Unified builds & exports**: `./`, `./svelte`, `./schema`, `./component`, `./cloud`, `./components`, and CLI all ship with ESM, CJS, and type definitions.
- **Svelte 5 runes native**: Runes-friendly stores and helpers; server+client builds for integrations.
- **Framework-agnostic reactivity**: Proxy-based reactive engine for use without Svelte, enabling reactive state management in Node.js, browsers, and any JavaScript environment.
- **Logic engine refinements**: Typed registry, step diagnostics, and trace-friendly rule execution.
- **Cloud relay & local-first**: Polished cloud connector alongside PluresDB-first workflows.
- **Publish-ready**: npm public access + JSR exports aligned to source.

## Capabilities at a glance
- **Logic Engine**: Facts, events, rules, constraints, registry, introspection, and reactive engine variants (Svelte 5 + framework-agnostic).
- **Schema & Codegen**: PSF-style schema types plus component generator for Svelte UIs.
- **Svelte Integration**: Typed helpers, runes-ready builds, and Svelte component typings.
- **Local-First Data**: PluresDB integration for offline-first, reactive state with full persistence.
- **Distributed Systems**: Unum integration for identity management and multi-node channels.
- **Documentation**: State-Docs integration for auto-generated Markdown docs and Mermaid diagrams.
- **Visual Editing**: CodeCanvas integration for visual schema design and FSM visualization.
- **Cloud Relay**: Optional sync layer (GitHub-auth friendly) for distributed teams.
- **CLI**: Scaffolding, generation, canvas helpers, docs generation, and cloud commands.

## Install
Node 18+ recommended.

```bash
# npm
npm install @plures/praxis

# pnpm
pnpm add @plures/praxis
```

JSR (Deno):
```bash
const result = engine.step([Login.create({ username: 'alice' })]);
# or via import map pointing to npm:
# {
#   "imports": { "@plures/praxis": "npm:@plures/praxis@^1.1.2" }
# }
```

## Quick start (logic engine)
```ts
import {
  createPraxisEngine,
  PraxisRegistry,
  defineFact,
  defineEvent,
  defineRule,
} from '@plures/praxis';

const UserLoggedIn = defineFact<'UserLoggedIn', { userId: string }>('UserLoggedIn');
const Login = defineEvent<'LOGIN', { username: string }>('LOGIN');

const loginRule = defineRule<{ currentUser: string | null }>({
  id: 'auth.login',
  description: 'Authenticate and emit fact',
  impl: (state, events) => {
    const evt = events.find(Login.is);
    if (!evt) return [];
    state.context.currentUser = evt.payload.username;
    return [UserLoggedIn.create({ userId: evt.payload.username })];
  },
});

const registry = new PraxisRegistry();
registry.registerRule(loginRule);

const engine = createPraxisEngine({ initialContext: { currentUser: null }, registry });
engine.step([Login.create({ username: 'alex' })]);
```

## Unified workflow example

See all Praxis integrations working together - from schema definition to persistence, documentation, and distributed communication:

```ts
import {
  createPraxisEngine,
  PraxisRegistry,
  defineRule,
  createInMemoryDB,
  createPluresDBAdapter,
  createUnumAdapter,
  createStateDocsGenerator,
  schemaToCanvas,
} from '@plures/praxis';

// 1. Define logic with Praxis engine
const registry = new PraxisRegistry();
registry.registerRule(/* your rules */);
const engine = createPraxisEngine({ initialContext: {}, registry });

// 2. Add PluresDB for local-first persistence
const db = createInMemoryDB();
const pluresAdapter = createPluresDBAdapter({ db, registry });
pluresAdapter.attachEngine(engine);

// 3. Add Unum for distributed communication
const unum = await createUnumAdapter({
  db,
  identity: { name: 'node-1' },
  realtime: true,
});
const channel = await unum.createChannel('app-sync');

// Subscribe to distribute events across nodes
unum.subscribeToEvents(channel.id, (event) => {
  engine.step([event]);
});

// 4. Generate documentation with State-Docs
const docsGenerator = createStateDocsGenerator({
  projectTitle: 'My App',
  target: './docs',
});
const docs = docsGenerator.generateFromModule(registry.module);

// 5. Export schema to CodeCanvas for visual editing
const canvas = schemaToCanvas(mySchema);
// Canvas can be edited visually and converted back to schema

// Now you have:
// ✅ Logic engine running
// ✅ Auto-persisting to PluresDB
// ✅ Distributing events across nodes via Unum
// ✅ Auto-generated documentation
// ✅ Visual schema representation
```

## Svelte integration (runes-ready)
```svelte
<script lang="ts">
  import { createReactiveEngine, defineEvent, defineRule, PraxisRegistry } from '@plures/praxis/svelte';

  const Increment = defineEvent<'INCREMENT', { amount: number }>('INCREMENT');
  const counterRule = defineRule<{ count: number }>({
    id: 'counter.increment',
    description: 'Add to count',
    impl: (state, events) => {
      const evt = events.find(Increment.is);
      if (evt) state.context.count += evt.payload.amount;
      return [];
    },
  });

  const registry = new PraxisRegistry();
  registry.registerRule(counterRule);

  const engine = createReactiveEngine({ initialContext: { count: 0 }, registry });
  
  // Use Svelte's $derived with the reactive engine state
  const count = $derived(engine.context.count);

  function addOne() {
    engine.step([Increment.create({ amount: 1 })]);
  }
</script>

<button on:click={addOne}>Count is {count}</button>
```

## Framework-agnostic reactive engine
For non-Svelte environments, use the framework-agnostic reactive engine with Proxy-based reactivity:

```typescript
import { createFrameworkAgnosticReactiveEngine } from '@plures/praxis';

const engine = createFrameworkAgnosticReactiveEngine({
  initialContext: { count: 0 },
});

// Subscribe to state changes
engine.subscribe((state) => {
  console.log('Count:', state.context.count);
});

// Create derived/computed values
const doubled = engine.$derived((state) => state.context.count * 2);
doubled.subscribe((value) => {
  console.log('Doubled:', value);
});

// Apply mutations (batched for performance)
engine.apply((state) => {
  state.context.count += 1;
});
```

See the [reactive counter example](./examples/reactive-counter/README.md) for a complete demonstration.

## Cloud relay (optional)
```ts
import { connectRelay } from '@plures/praxis/cloud';

const relay = await connectRelay('https://my-relay.example.com', {
  appId: 'my-app',
  authToken: process.env.GITHUB_TOKEN,
  autoSync: true,
});

await relay.sync({
  type: 'delta',
  appId: 'my-app',
  clock: {},
  facts: [],
  timestamp: Date.now(),
});
```

## PluresDB integration
```ts
import { PluresNode } from 'pluresdb';
import { createPluresDB, createPraxisDBStore } from '@plures/praxis';
import { PraxisRegistry } from '@plures/praxis';

// Initialize the official PluresDB from npm
const pluresdb = new PluresNode({
  config: {
    port: 34567,
    dataDir: './data',
  },
  autoStart: true,
});

// Wrap it with the Praxis adapter
const db = createPluresDB(pluresdb);

// Use with Praxis store for local-first reactive data
const registry = new PraxisRegistry();
const store = createPraxisDBStore(db, registry);

// Or use in-memory database for development/testing
import { createInMemoryDB } from '@plures/praxis';
const devDb = createInMemoryDB();
```

> **Note:** Praxis now uses the official [PluresDB package from NPM](https://www.npmjs.com/package/pluresdb), which provides P2P sync, CRDT conflict resolution, SQLite compatibility, and more. The `createPluresDB()` function wraps PluresDB to provide the `PraxisDB` interface used by Praxis.

## CLI (npx-friendly)
```bash
npx praxis --help
npx praxis create app my-app
npx praxis generate --schema src/schemas/app.schema.ts
npx praxis canvas src/schemas/app.schema.ts
```

## Exports map
- `@plures/praxis` → main engine (ESM/CJS/types)
- `@plures/praxis/svelte` → Svelte 5 integrations
- `@plures/praxis/schema` → Schema types
- `@plures/praxis/component` → Component generator
- `@plures/praxis/cloud` → Cloud relay APIs
- `@plures/praxis/components` → TS props for Svelte components (e.g., TerminalNode)
- `praxis` (bin) → CLI entrypoint

## Documentation
- [Getting Started](./GETTING_STARTED.md)
- [Framework Guide](./FRAMEWORK.md)
- [Examples](./examples/)

## Contributing
PRs and discussions welcome. Please see [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md).
console.log(result.state.facts); // [{ tag: "UserLoggedIn", payload: { userId: "alice" } }]
console.log(engine.getContext()); // { currentUser: "alice" }
```

### With Constraints

```typescript
import { defineConstraint } from '@plures/praxis';

const maxSessionsConstraint = defineConstraint<AuthContext>({
  id: 'auth.maxSessions',
  description: 'Only one user can be logged in at a time',
  impl: (state) => {
    return state.context.currentUser === null || 'User already logged in';
  },
});

registry.registerConstraint(maxSessionsConstraint);
```

### Svelte 5 Integration

#### Store API (Svelte 4/5 Compatible)

```typescript
import { createPraxisStore, createDerivedStore } from '@plures/praxis/svelte';

const stateStore = createPraxisStore(engine);
const userStore = createDerivedStore(engine, (ctx) => ctx.currentUser);

// In Svelte component:
// $: currentUser = $userStore;
// <button on:click={() => stateStore.dispatch([Login.create({ username: "alice" })])}>
//   Login
// </button>
```

#### Runes API (Svelte 5 Only)

```svelte
<script lang="ts">
  import { usePraxisEngine } from '@plures/praxis/svelte';
  import { createMyEngine, Login } from './my-engine';

  const engine = createMyEngine();
  const {
    context,      // Reactive context
    dispatch,     // Dispatch events
    undo,         // Undo last action
    redo,         // Redo action
    canUndo,      // Boolean: can undo?
    canRedo,      // Boolean: can redo?
  } = usePraxisEngine(engine, {
    enableHistory: true,    // Enable undo/redo
    maxHistorySize: 50,     // Keep last 50 snapshots
  });
</script>

<div>
  <p>User: {context.currentUser || 'Guest'}</p>

  <button onclick={() => dispatch([Login.create({ username: 'alice' })])}>
    Login
  </button>

  <button onclick={undo} disabled={!canUndo}>
    ⟲ Undo
  </button>

  <button onclick={redo} disabled={!canRedo}>
    ⟳ Redo
  </button>
</div>
```

See the [Advanced Todo Example](src/examples/advanced-todo/) for a complete demo with:

- Undo/redo functionality
- Time-travel debugging
- Keyboard shortcuts
- Beautiful UI

For comprehensive guides:

- [Svelte Integration Guide](docs/guides/svelte-integration.md)
- [History State Pattern](docs/guides/history-state-pattern.md)
- [Parallel State Pattern](docs/guides/parallel-state-pattern.md)

## Core Protocol

The language-neutral core protocol forms the foundation of Praxis:

```typescript
// Facts and Events
interface PraxisFact {
  tag: string;
  payload: unknown;
}

interface PraxisEvent {
  tag: string;
  payload: unknown;
}

// State
interface PraxisState {
  context: unknown;
  facts: PraxisFact[];
  meta?: Record<string, unknown>;
}

// Step Function (the conceptual core)
type PraxisStepFn = (
  state: PraxisState,
  events: PraxisEvent[],
  config: PraxisStepConfig
) => PraxisStepResult;
```

This protocol is:

- Pure and deterministic (data in → data out)
- No side effects, no global state
- JSON-friendly for cross-language compatibility
- The foundation for all higher-level TypeScript APIs

## Framework Architecture

```
/praxis
├── core/                          # Core framework
│   ├── schema/                    # Schema system
│   │   └── types.ts              # Schema type definitions
│   ├── logic/                     # Logic engine (existing src/core/)
│   │   ├── protocol.ts           # Language-neutral protocol
│   │   ├── rules.ts              # Rules, constraints, and registry
│   │   ├── engine.ts             # LogicEngine implementation
│   │   ├── actors.ts             # Actor system
│   │   └── introspection.ts      # Introspection and visualization
│   ├── component/                 # Component generation
│   │   └── generator.ts          # Svelte component generator
│   ├── pluresdb/                  # PluresDB integration core
│   │   ├── adapter.ts            # Database adapter interface
│   │   ├── store.ts              # Reactive store implementation
│   │   ├── schema-registry.ts    # Schema registry for PluresDB
│   │   └── generator.ts          # PluresDB config generator
│   └── runtime/                   # Runtime abstractions
├── cloud/                         # Praxis Cloud integration
│   ├── auth.ts                   # GitHub OAuth authentication
│   ├── billing.ts                # Tier-based billing
│   ├── provisioning.ts           # Tenant provisioning
│   └── relay/                    # Azure relay service
├── integrations/                  # Ecosystem integrations
│   ├── pluresdb.ts               # PluresDB integration exports
│   ├── svelte.ts                 # Svelte 5 integration
│   ├── unum/                     # Unum identity and channels
│   ├── adp/                      # Architectural Decision Protocol
│   ├── state-docs/               # State-Docs documentation
│   └── canvas/                   # CodeCanvas visual editor
├── components/                    # Svelte components
│   └── TerminalNode.svelte       # Terminal node component
├── cli/                          # Command-line interface
│   ├── index.ts                  # CLI entry point
│   └── commands/                 # Command implementations
├── templates/                     # Project templates
│   ├── basic-app/                # Basic application template
│   └── fullstack-app/            # Full-stack template
├── examples/                      # Example applications
│   ├── offline-chat/             # Offline-first chat demo
│   ├── knowledge-canvas/         # Knowledge management with Canvas
│   ├── distributed-node/         # Self-orchestrating node demo
│   ├── terminal-node/            # Terminal node demo
│   ├── terminal-canvas/          # Terminal + canvas demo
│   ├── cloud-sync/               # Cloud sync demo
│   ├── github-monetization/      # GitHub monetization demo
│   ├── simple-app/               # Simple app demo
│   ├── auth-basic/               # Login/logout example
│   ├── cart/                     # Shopping cart example
│   ├── svelte-counter/           # Svelte integration example
│   └── hero-ecommerce/           # Comprehensive e-commerce demo
└── docs/                         # Framework documentation
    ├── guides/                   # User guides
    │   ├── getting-started.md   # Getting started guide
    │   ├── canvas.md            # CodeCanvas guide
    │   └── orchestration.md     # Orchestration guide
    ├── api/                      # API reference
    └── architecture/             # Architecture documentation
```

See [FRAMEWORK.md](./FRAMEWORK.md) for complete architecture documentation.

## Examples

The repository includes multiple complete examples:

### 1. Hero E-Commerce (`src/examples/hero-ecommerce`)

Comprehensive example demonstrating all Praxis features in a single application:

- Authentication with session management
- Shopping cart with discount rules
- Feature flags for A/B testing
- Loyalty program with points
- Actors for logging and analytics
- Constraints enforcing business rules

```bash
npm run build
node dist/examples/hero-ecommerce/index.js
```

### 2. Offline-First Chat (`examples/offline-chat`)

Demonstrates local-first architecture with PluresDB:

- Offline message composition and storage
- Automatic sync when connected
- Message queue for offline messages
- Conflict resolution for concurrent edits
- Real-time features (typing indicators, read receipts)

See [examples/offline-chat/README.md](./examples/offline-chat/README.md)

### 3. Knowledge Canvas (`examples/knowledge-canvas`)

Showcases CodeCanvas integration for visual knowledge management:

- Visual knowledge graph editing
- Schema-driven content types
- Generated UI components
- State-Docs integration
- Collaborative editing

See [examples/knowledge-canvas/README.md](./examples/knowledge-canvas/README.md)

### 4. Self-Orchestrating Node (`examples/distributed-node`)

Demonstrates distributed orchestration with DSC/MCP:

- Automatic node discovery
- Self-healing behavior
- State synchronization across nodes
- Health monitoring and auto-scaling
- Failover and recovery

See [examples/distributed-node/README.md](./examples/distributed-node/README.md)

### 5. Terminal Node (`examples/terminal-node`)

Demonstrates the terminal node feature for command execution:

- Terminal adapter creation and configuration
- Command execution and history tracking
- YAML schema loading with terminal nodes
- PluresDB binding configuration (ready for integration)
- Both text and widget input modes

```bash
npm run build
node examples/terminal-node/index.js
```

See [examples/terminal-node/README.md](./examples/terminal-node/README.md) and [docs/TERMINAL_NODE.md](./docs/TERMINAL_NODE.md)

### 6. Auth Basic (`src/examples/auth-basic`)

Login/logout with facts, rules, and constraints.

```bash
npm run build
node dist/examples/auth-basic/index.js
```

### 7. Cart (`src/examples/cart`)

Shopping cart with multiple rules, constraints, and complex state management.

```bash
npm run build
node dist/examples/cart/index.js
```

### 8. Svelte Counter (`src/examples/svelte-counter`)

Counter example showing Svelte v5 integration with reactive stores.

```bash
npm run build
node dist/examples/svelte-counter/index.js
```

### 9. Terminal Canvas (`examples/terminal-canvas`)

Combines terminal nodes with visual canvas features in a Svelte app.

See [examples/terminal-canvas/README.md](./examples/terminal-canvas/README.md)

### 10. GitHub Monetization (`examples/github-monetization`)

Example of GitHub-based monetization integration with Praxis Cloud.

See [examples/github-monetization/README.md](./examples/github-monetization/README.md)

### 11. Simple App (`examples/simple-app`)

A minimal example demonstrating basic Praxis schema usage.

See [examples/simple-app/README.md](./examples/simple-app/README.md)

### 12. Cloud Sync (`examples/cloud-sync`)

Demonstrates real-time synchronization with Praxis Cloud relay service.

See [examples/cloud-sync/README.md](./examples/cloud-sync/README.md)

## API Reference

### Core Types

- `PraxisFact`, `PraxisEvent`, `PraxisState` - Protocol types
- `LogicEngine<TContext>` - Main engine class
- `PraxisRegistry<TContext>` - Rule and constraint registry
- `Actor<TContext>` - Actor interface
- `ActorManager<TContext>` - Actor lifecycle management

### DSL Functions

- `defineFact<TTag, TPayload>(tag)` - Define a typed fact
- `defineEvent<TTag, TPayload>(tag)` - Define a typed event
- `defineRule<TContext>(options)` - Define a rule
- `defineConstraint<TContext>(options)` - Define a constraint
- `defineModule<TContext>(options)` - Bundle rules and constraints

### Helpers

- `findEvent(events, definition)` - Find first matching event
- `findFact(facts, definition)` - Find first matching fact
- `filterEvents(events, definition)` - Filter events by type
- `filterFacts(facts, definition)` - Filter facts by type

### Introspection & Visualization

Tools for examining and visualizing your Praxis logic:

```typescript
import { createIntrospector, PRAXIS_PROTOCOL_VERSION } from '@plures/praxis';

const introspector = createIntrospector(registry);

// Get statistics
const stats = introspector.getStats();
console.log(`Rules: ${stats.ruleCount}, Constraints: ${stats.constraintCount}`);

// Generate JSON schema
const schema = introspector.generateSchema(PRAXIS_PROTOCOL_VERSION);

// Generate graph visualization
const graph = introspector.generateGraph();

// Export to Graphviz DOT format
const dot = introspector.exportDOT();
fs.writeFileSync('registry.dot', dot);

// Export to Mermaid format
const mermaid = introspector.exportMermaid();

// Search rules and constraints
const authRules = introspector.searchRules('auth');
const maxConstraints = introspector.searchConstraints('max');
```

**Available methods:**

- `getStats()` - Get registry statistics
- `generateSchema(protocolVersion)` - Generate JSON schema
- `generateGraph()` - Generate graph representation
- `exportDOT()` - Export to Graphviz DOT format
- `exportMermaid()` - Export to Mermaid diagram format
- `getRuleInfo(id)` - Get detailed rule information
- `getConstraintInfo(id)` - Get detailed constraint information
- `searchRules(query)` - Search rules by text
- `searchConstraints(query)` - Search constraints by text

## Ecosystem Integration

Praxis integrates with the full Plures ecosystem:

### PluresDB Integration

Local-first reactive datastore for offline-capable applications. **Now fully implemented** with 32 tests covering all features.

```typescript
import {
  createInMemoryDB,
  createPraxisDBStore,
  createPluresDBAdapter,
  attachToEngine,
} from '@plures/praxis/pluresdb';

// Create an in-memory database
const db = createInMemoryDB();

// Create a PraxisDB store for facts and events
const store = createPraxisDBStore({ db });

// Or create an adapter to attach to an engine
const adapter = createPluresDBAdapter({
  db,
  registry,
  initialContext: {},
});

// Attach adapter to engine for automatic persistence
adapter.attachEngine(engine);

// Persist facts and events
await adapter.persistFacts([{ tag: 'UserLoggedIn', payload: { userId: 'alice' } }]);
await adapter.persistEvents([{ tag: 'LOGIN', payload: { username: 'alice' } }]);

// Subscribe to changes
adapter.subscribeToEvents((events) => {
  console.log('New events:', events);
});
```

**Features:**

- **In-memory adapter**: Ready-to-use implementation for development and testing
- **Reactive store**: Watch for changes with callbacks
- **Schema registry**: Store and retrieve schemas in PluresDB
- **Config generator**: Generate PluresDB configuration from Praxis schemas
- **Engine integration**: Automatic fact/event persistence

**Status**: ✅ Available (`src/core/pluresdb/`, `src/integrations/pluresdb.ts`)  
**Tests**: 32 tests covering adapter, store, registry, and engine integration

### Unum Integration

Identity and channels for distributed systems. **Now fully implemented** with comprehensive channel and identity management.

```typescript
import {
  createUnumAdapter,
  attachUnumToEngine,
} from '@plures/praxis';

// Create Unum adapter with identity
const unum = await createUnumAdapter({
  db: pluresDB,
  identity: {
    name: 'my-app-node',
    metadata: { role: 'coordinator' },
  },
  realtime: true,
});

// Create a channel for messaging
const channel = await unum.createChannel('app-events', ['member-1', 'member-2']);

// Broadcast Praxis events to channel
await unum.broadcastEvent(channel.id, {
  tag: 'USER_JOINED',
  payload: { userId: 'alice' },
});

// Subscribe to events from channel
const unsubscribe = unum.subscribeToEvents(channel.id, (event) => {
  console.log('Received event:', event);
  // Feed into local Praxis engine
  engine.step([event]);
});

// Attach to engine for automatic event broadcasting
attachUnumToEngine(engine, unum, channel.id);
```

**Features:**

- **Identity Management**: Create and manage user/node identities
- **Channel Communication**: Real-time messaging between distributed nodes
- **Event Broadcasting**: Share Praxis events across channels
- **Fact Synchronization**: Distribute facts to connected participants
- **PluresDB Integration**: Persists identities and messages

**Status**: ✅ Available (`src/integrations/unum.ts`)  
**Tests**: Comprehensive integration tests  
**Use Cases**: Distributed messaging, identity management, multi-user collaboration

### ADP Integration

Architectural Decision Protocol for guardrails and governance.

```typescript
import { createADP } from '@plures/adp';

// Track architectural decisions from schemas
const adp = createADP({
  source: 'praxis-schema',
  decisions: [
    {
      id: 'ADR-001',
      title: 'Use PluresDB for local-first storage',
      context: 'Need offline-capable data storage',
      decision: 'Adopt PluresDB',
      consequences: ['Offline support', 'Sync complexity'],
    },
  ],
});

// Enforce guardrails
adp.enforce({
  rule: 'no-direct-database-access',
  check: (code) => !code.includes('direct-sql'),
});
```

**Status**: Planned  
**Use Cases**: Architecture documentation, compliance checking, guardrails

### State-Docs Integration

Living documentation generated from Praxis schemas. **Now fully implemented** with Markdown and Mermaid diagram generation.

```typescript
import {
  createStateDocsGenerator,
  generateDocs,
} from '@plures/praxis';

// Create generator
const generator = createStateDocsGenerator({
  projectTitle: 'My Praxis App',
  target: './docs',
  visualization: {
    format: 'mermaid',
    theme: 'default',
  },
  template: {
    toc: true,
    timestamp: true,
  },
});

// Generate docs from schema
const docs = generator.generateFromSchema(appSchema);

// Or from registry
const registryDocs = generator.generateFromModule(myModule);

// Write generated docs
for (const doc of docs) {
  await writeFile(doc.path, doc.content);
}

// Quick helper
const allDocs = generateDocs(appSchema, {
  projectTitle: 'My App',
  target: './docs',
});
```

**Features:**

- **Schema Documentation**: Auto-generate docs from Praxis schemas
- **Mermaid Diagrams**: Visual state machine and flow diagrams
- **Markdown Output**: GitHub-ready documentation
- **Model & Component Docs**: Detailed API documentation
- **Logic Flow Visualization**: Event → Rule → Fact diagrams
- **Table of Contents**: Automatic ToC generation

**Status**: ✅ Available (`src/integrations/state-docs.ts`)  
**CLI**: Use `praxis generate` with `--docs` flag (coming soon)  
**Documentation**: Auto-generates README, models.md, logic diagrams

### CodeCanvas Integration

Visual IDE for schema and logic editing. **Now fully implemented** with schema visualization and canvas export.

```typescript
import {
  schemaToCanvas,
  canvasToSchema,
  canvasToMermaid,
  createCanvasEditor,
} from '@plures/praxis';

// Convert schema to canvas document
const canvas = schemaToCanvas(mySchema, {
  layout: 'hierarchical',
});

// Export to YAML (Obsidian Canvas compatible)
const yaml = canvasToYaml(canvas);
await writeFile('./schema.canvas.yaml', yaml);

// Export to Mermaid diagram
const mermaid = canvasToMermaid(canvas);

// Create canvas editor instance
const editor = createCanvasEditor({
  schema: mySchema,
  enableFSM: true,
  layout: 'hierarchical',
});

// Add nodes programmatically
editor.addNode({
  type: 'model',
  label: 'User',
  x: 100,
  y: 100,
  width: 150,
  height: 60,
  data: userModel,
});

// Convert back to schema
const updatedSchema = editor.toSchema();
```

**Features:**

- **Visual Schema Design**: Node-based schema editor
- **Canvas Export**: YAML and Mermaid diagram formats
- **Obsidian Compatible**: Works with Obsidian Canvas format
- **FSM Visualization**: State machine and flow diagrams
- **Bi-directional Sync**: Canvas ↔ Schema round-tripping
- **Guardian Validation**: Pre-commit lifecycle checks

**Status**: ✅ Available (`src/integrations/code-canvas.ts`)  
**CLI**: Use `praxis canvas` commands (coming soon)  
**Documentation**: [docs/guides/canvas.md](./docs/guides/canvas.md)

### Svelte + Tauri Runtime

Cross-platform runtime for web, desktop, and mobile.

```typescript
// Svelte v5 integration (available now)
import { createPraxisStore } from '@plures/praxis/svelte';

const stateStore = createPraxisStore(engine);
const userStore = createDerivedStore(engine, (ctx) => ctx.currentUser);

// In Svelte component:
// $: currentUser = $userStore;

// Desktop app with Tauri
npm run tauri:dev    // Development
npm run tauri:build  // Production
```

**Status**: Svelte integration available, Tauri templates planned  
**Platform Support**: Web (now), Desktop (planned), Mobile (future)

## Cross-Language Usage

### PowerShell

Full PowerShell adapter for using Praxis from PowerShell scripts:

```powershell
# Import module
Import-Module ./powershell/Praxis.psm1

# Initialize adapter
Initialize-PraxisAdapter -EnginePath "./dist/adapters/cli.js"

# Create state and events
$state = New-PraxisState -Context @{ count = 0 }
$event = New-PraxisEvent -Tag "INCREMENT" -Payload @{}

# Process step
$result = Invoke-PraxisStep -State $state -Events @($event) -ConfigPath "./config.json"

# Use result
Write-Host "Count: $($result.state.context.count)"
```

See [powershell/README.md](./powershell/README.md) for complete documentation and examples.

### C# (.NET 8+)

Full C# implementation with functional, immutable design:

```csharp
using Praxis.Core;
using Praxis.Dsl;

// Define facts and events
var UserLoggedIn = PraxisDsl.DefineFact<UserPayload>("UserLoggedIn");
var Login = PraxisDsl.DefineEvent<LoginPayload>("LOGIN");

record UserPayload(string UserId);
record LoginPayload(string Username);

// Define rules
var loginRule = PraxisDsl.DefineRule<AuthContext>(
    id: "auth.login",
    description: "Process login event",
    impl: (state, context, events) =>
    {
        var loginEvent = events.FindEvent(Login);
        if (loginEvent != null)
        {
            var payload = Login.GetPayload(loginEvent);
            return [UserLoggedIn.Create(new UserPayload(payload?.Username ?? "unknown"))];
        }
        return [];
    });

// Create engine
var registry = new PraxisRegistry<AuthContext>();
registry.RegisterRule(loginRule);

var engine = PraxisEngine.Create(new PraxisEngineOptions<AuthContext>
{
    InitialContext = new AuthContext(null),
    Registry = registry
});

// Dispatch events
var result = engine.Step([Login.Create(new LoginPayload("alice"))]);
Console.WriteLine($"Facts: {result.State.Facts.Count}"); // Facts: 1
```

See [csharp/Praxis/README.md](./csharp/Praxis/README.md) for complete documentation.

## Roadmap

### Current Focus

- Full CodeCanvas integration
- Enhanced Unum identity support
- Advanced State-Docs generation
- Multi-language schema support
- Real PluresDB sync with CRDT/offline-first capabilities

### Long Term

- Mobile templates (iOS, Android)
- Enterprise features
- Advanced orchestration
- Performance optimizations
- Plugin ecosystem

## Cross-Language Support

The core protocol is implemented across multiple languages:

**TypeScript** (Primary, npm: `@plures/praxis`)

```typescript
import { createPraxisEngine, PraxisRegistry } from '@plures/praxis';

const engine = createPraxisEngine({
  initialContext: {},
  registry: new PraxisRegistry(),
});
const result = engine.step(events);
```

**C#** (.NET 8+, NuGet: `Plures.Praxis`)

```csharp
var engine = PraxisEngine.Create(new PraxisEngineOptions<TContext> { ... });
var result = engine.Step(events);
```

See [csharp/Praxis/README.md](./csharp/Praxis/README.md) for full documentation.

**PowerShell** (GitHub: `Praxis.psm1`)

```powershell
$newState = Invoke-PraxisStep -State $state -Events $events
```

See [powershell/README.md](./powershell/README.md) for full documentation.

All implementations share the same protocol version and JSON format for interoperability.
See [CROSS_LANGUAGE_SYNC.md](./CROSS_LANGUAGE_SYNC.md) for details on keeping implementations in sync.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Type check
npm run typecheck
```

### Deno Development

```bash
# Run with Deno
deno task dev

# Run tests
deno task test

# Lint and format
deno task lint
deno task fmt
```

For more detailed development information, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) to get started.

- 🐛 [Report a bug](https://github.com/plures/praxis/issues/new?template=bug_report.yml)
- 💡 [Request a feature](https://github.com/plures/praxis/issues/new?template=enhancement.yml)
- 📖 [Improve documentation](https://github.com/plures/praxis/issues/new?template=bug_report.yml)
- 🔒 [Report a security issue](./SECURITY.md)

Please review our [Code of Conduct](./CODE_OF_CONDUCT.md) before participating.

## Support

- 📚 [Documentation](./docs/)
- 💬 [GitHub Discussions](https://github.com/plures/praxis/discussions)
- 🐛 [Issue Tracker](https://github.com/plures/praxis/issues)
- 🌐 [Plures Organization](https://github.com/plures)

---

**Praxis** – Because application logic should be practical, provable, and portable.

---

Built with ❤️ by the plures team
