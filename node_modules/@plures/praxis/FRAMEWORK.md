# Praxis Framework Architecture

Praxis is the full-stack application framework for the Plures ecosystem. This document describes the framework architecture, components, and how they integrate.

## Framework Mission

Praxis unifies the Plures ecosystem into a cohesive development platform that enables:

1. **Declarative Development**: Define schemas once, generate everything
2. **Local-First Applications**: Offline-capable by default with PluresDB
3. **Visual and Code Workflows**: Seamless transitions between Canvas and code
4. **Cross-Platform Delivery**: Web, desktop, and mobile from a single codebase
5. **Distributed Coordination**: Built-in orchestration with DSC/MCP

## Framework Structure

The Praxis framework is organized into these core areas:

```
/praxis
  /core                    # Core framework functionality
    /schema                # Schema definition and validation
    /logic                 # Logic engine (facts, events, rules, constraints)
    /component             # Component generation and templates
    /generator             # Code generation utilities
    /runtime               # Runtime environment abstractions
  /integrations            # External system integrations
    /pluresdb              # PluresDB reactive datastore
    /unum                  # Unum identity and channels
    /adp                   # Architectural Decision Protocol
    /state-docs            # State-Docs documentation generation
    /canvas                # CodeCanvas visual editor
  /cli                     # Command-line interface
    /commands              # CLI command implementations
    /scaffolding           # Project scaffolding utilities
  /templates               # Project templates
    /basic-app             # Basic Praxis application
    /fullstack-app         # Full-stack with all integrations
    /component             # Reusable component template
    /orchestrator          # Distributed orchestration template
  /examples                # Example applications
    /offline-chat          # Offline-first chat application
    /knowledge-canvas      # Knowledge management with Canvas
    /distributed-node      # Self-orchestrating node example
  /docs                    # Framework documentation
    /guides                # User guides
    /api                   # API reference
    /architecture          # Architecture documentation
```

## Core Components

### 1. Schema System

The Praxis schema system provides a declarative way to define your application structure.

**Key Features:**

- Type-safe schema definitions
- Validation and constraints
- Multi-target generation (models, components, docs, orchestration)
- Schema composition and inheritance
- Version management

**Schema Format:**

```typescript
interface PraxisSchema {
  version: string;
  name: string;
  description?: string;
  models: ModelDefinition[];
  components: ComponentDefinition[];
  logic: LogicDefinition[];
  orchestration?: OrchestrationDefinition;
  metadata?: Record<string, unknown>;
}
```

**Outputs:**

- PluresDB models for data storage
- Svelte components for UI
- State-Docs documentation
- Logic machines (facts, events, rules)
- Canvas metadata for visual editing
- DSC definitions for orchestration

### 2. Logic Engine

The logic engine provides the computational core of Praxis applications.

**Components:**

- **Facts**: Typed propositions about the domain
- **Events**: Temporally ordered facts that drive change
- **Rules**: Pure functions that derive new facts
- **Constraints**: Invariants that must always hold
- **Flows**: Orchestrated sequences of state transitions
- **Actors**: Effectful units for side effects

**Architecture:**

- Pure, functional core with immutable state
- JSON-friendly protocol for cross-language use
- Type-safe TypeScript implementation
- Introspection and visualization support

### 3. Component Factory

The component factory generates Svelte components from schemas.

**Features:**

- Schema-to-component transformation
- Data binding generation
- Event handler generation
- Styling and layout from schema
- Canvas-compatible output

**Generated Components Include:**

- Form components with validation
- Data display components
- Navigation components
- State visualization components

### 4. Data Layer (PluresDB Integration)

PluresDB provides the data storage and synchronization layer.

**Capabilities:**

- Local-first reactive datastore
- Automatic sync when connected
- Query and subscription APIs
- Event sourcing support
- Conflict resolution

**Integration Points:**

- Schema-driven model generation
- Logic engine fact/event storage
- Component data binding
- Distributed state management
- CRDT-based synchronization
- Event sourcing and replay

**Status**: ✅ Fully implemented with comprehensive test coverage

### 5. Identity & Channels (Unum Integration)

Unum provides identity management and channel-based communication for distributed systems.

**Features:**

- Identity creation and management
- Channel-based messaging
- Event and fact broadcasting
- Member management
- Real-time synchronization with PluresDB

**Use Cases:**

- Multi-user collaboration
- Distributed event streaming
- Node-to-node communication
- Identity-based access control
- Real-time state synchronization

**Integration Points:**

- Praxis event broadcasting to channels
- Fact synchronization across nodes
- PluresDB backend for persistence
- Engine attachment for automatic distribution

**Status**: ✅ Fully implemented with comprehensive API

### 6. Documentation (State-Docs Integration)

State-Docs generates living documentation from Praxis schemas and logic definitions.

**Features:**

- Auto-generated Markdown documentation
- Mermaid and DOT diagram generation
- Model and component catalogs
- Logic flow visualization
- Event → Rule → Fact diagrams
- Customizable templates

**Use Cases:**

- API documentation
- Architecture diagrams
- Onboarding documentation
- Design reviews
- GitHub Pages integration

**Integration Points:**

- Schema documentation generation
- Registry introspection
- Automatic ToC and index generation
- Diagram export (Mermaid, DOT)

**Status**: ✅ Fully implemented with CLI support (`praxis docs`)

### 7. Visual IDE (CodeCanvas Integration)

CodeCanvas provides visual development capabilities for schemas and logic flows.

**Features:**

- Visual schema editor with node-based UI
- Schema ↔ Canvas bi-directional sync
- Mermaid and YAML export
- Obsidian Canvas compatibility
- FSM visualization
- Guardian pre-commit validation
- Activity lifecycle tracking

**Use Cases:**

- Design schemas visually
- Build logic flows with visual tools
- Export schemas to diagrams
- Integrate with Obsidian workflows
- Visualize state machines
- Enforce development lifecycle

**Integration Points:**

- Schema conversion (`schemaToCanvas`)
- Canvas export (YAML, Mermaid, JSON)
- Visual editor API
- FSM lifecycle management
- Guardian validation hooks

**Status**: ✅ Fully implemented with CLI support (`praxis canvas`)

### 8. Orchestration (DSC/MCP Support)

Support for distributed system coordination.

**Capabilities:**

- Desired State Configuration (DSC)
- Model Context Protocol (MCP) integration
- Multi-node coordination
- State synchronization
- Health monitoring

**Use Cases:**

- Self-healing distributed systems
- Automatic node onboarding
- Configuration management
- Service orchestration

## Framework CLI

The Praxis CLI provides commands for creating and managing applications.

### Commands

#### `praxis create app [name]`

Create a new Praxis application from a template.

Options:

- `--template`: Template to use (basic, fullstack, distributed)
- `--features`: Features to include (auth, canvas, orchestration)

#### `praxis create component [name]`

Create a new component from a schema.

Options:

- `--schema`: Path to schema file
- `--output`: Output directory

#### `praxis generate`

Generate code from schemas.

Options:

- `--target`: Generation target (components, models, pluresdb, docs, all)
- `--watch`: Watch for schema changes
- `--auto-index`: Auto-indexing strategy for PluresDB

#### `praxis docs [schema]`

Generate documentation from schemas or registries.

Options:

- `--output`: Output directory (default: ./docs)
- `--title`: Documentation title
- `--format`: Diagram format (mermaid, dot)
- `--no-toc`: Disable table of contents
- `--from-registry`: Generate from registry instead of schema

#### `praxis canvas [schema]`

Open CodeCanvas for visual editing or export schemas to canvas formats.

Options:

- `--port`: Port for Canvas server (default: 3000)
- `--mode`: Mode (edit, view, present)
- `--export`: Export format (yaml, mermaid, json)
- `--output`: Output file for export

#### `praxis orchestrate`

Manage orchestration and distributed coordination.

Options:

- `--config`: Orchestration configuration file
- `--nodes`: Number of nodes to coordinate

## Application Templates

### Basic App Template

A minimal Praxis application with:

- Schema definition
- Logic engine setup
- Basic Svelte UI
- PluresDB storage
- Development scripts

### Fullstack App Template

A complete application with:

- All Basic App features
- Authentication module
- Component library
- Canvas integration
- State-Docs setup
- Orchestration ready

### Component Template

A reusable component with:

- Schema definition
- Generated Svelte component
- Unit tests
- Documentation
- Canvas metadata

### Orchestrator Template

A distributed application with:

- DSC configuration
- Multi-node setup
- State synchronization
- Health monitoring
- Auto-scaling support

## Integration Details

### PluresDB Integration

**Current Status**: Foundation in place (`src/integrations/pluresdb.ts`)

**Planned Features**:

- Schema-to-model transformation
- Reactive queries from logic engine
- Event sourcing from facts/events
- Automatic sync configuration
- Conflict resolution strategies

### Unum Integration

**Current Status**: Planned

**Planned Features**:

- Identity management
- Channel-based messaging
- Distributed actor communication
- Authentication integration
- Authorization policies

### ADP Integration

**Current Status**: Planned

**Planned Features**:

- Architectural guardrails
- Decision tracking from schemas
- Static analysis of logic rules
- Compliance checking
- Architecture visualization

### State-Docs Integration

**Current Status**: Planned

**Planned Features**:

- Automatic documentation from schemas
- Logic flow documentation
- Component documentation
- API reference generation
- Living documentation updates

### Canvas Integration

**Current Status**: Planned

**Planned Features**:

- Visual schema editor
- Logic flow designer
- Component preview server
- Real-time collaboration
- Export to schema files

## Example Applications

### Offline-First Chat

Demonstrates:

- Local-first architecture
- PluresDB for message storage
- Real-time sync when connected
- Unum channels for messaging
- Offline message queueing

### Knowledge Canvas

Demonstrates:

- Canvas visual editing
- Knowledge graph modeling
- Schema-driven UI generation
- State-Docs documentation
- Search and navigation

### Self-Orchestrating Node

Demonstrates:

- DSC orchestration
- Automatic node discovery
- Self-healing behavior
- State synchronization
- Health monitoring

## Development Workflow

### 1. Define Schema

```typescript
// app.schema.ts
export const schema: PraxisSchema = {
  version: '1.0.0',
  name: 'MyApp',
  models: [
    /* ... */
  ],
  components: [
    /* ... */
  ],
  logic: [
    /* ... */
  ],
};
```

### 2. Generate Code

```bash
praxis generate --target all
```

### 3. Customize Generated Code

Edit generated components and logic as needed.

### 4. Visual Editing (Optional)

```bash
praxis canvas app.schema.ts
```

### 5. Run Application

```bash
npm run dev
```

### 6. Deploy

```bash
npm run build
```

## Future Enhancements

### Short Term

- Complete CLI implementation
- Basic templates
- Schema validation
- Component generation stubs
- Documentation generation

### Medium Term

- Full Canvas integration
- PluresDB complete integration
- Unum identity support
- Multi-language schemas
- Advanced orchestration

### Long Term

- C# and PowerShell framework bindings
- Mobile-first templates
- Distributed tracing
- Performance optimization
- Enterprise features

## Design Principles

1. **Schema-Driven Everything**: Schemas are the source of truth
2. **Progressive Enhancement**: Start simple, add complexity as needed
3. **Visual + Code**: Support both workflows equally
4. **Local-First**: Offline-capable by default
5. **Type-Safe**: Leverage TypeScript throughout
6. **Composable**: Build complex systems from simple parts
7. **Cross-Platform**: Write once, run everywhere
8. **Cross-Language**: Protocol-first design for portability

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on contributing to the Praxis framework.

## License

MIT - See [LICENSE](./LICENSE) for details.

---

**Praxis Framework** - Because building applications should be declarative, visual, and distributed.
