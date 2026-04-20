# Terminal Node Documentation

## Overview

The Terminal Node is a new node type in Praxis that enables terminal/command execution capabilities within the Praxis framework. It provides a foundation for integrating command-line interfaces, scripting engines, and interactive shells into Praxis applications.

## Features

- **Flexible Input Modes**: Support for text-based and widget-based input
- **Command History**: Automatic tracking of executed commands
- **PluresDB Integration**: Reactive state synchronization (ready for implementation)
- **RuneBook Integration**: Prepared for integration with the RuneBook execution model
- **YAML/JSON Schema Support**: Define terminal nodes declaratively
- **TypeScript Support**: Full type definitions for type-safe development

## Installation

Terminal Node is part of the core Praxis package:

```bash
npm install @plures/praxis
```

## Schema Definition

### TypeScript

```typescript
import type { PraxisSchema, NodeDefinition, TerminalNodeProps } from '@plures/praxis';

const schema: PraxisSchema = {
  version: '1.0.0',
  name: 'MyApp',
  orchestration: {
    type: 'custom',
    nodes: [
      {
        id: 'terminal-1',
        type: 'terminal',
        x: 100,
        y: 100,
        props: {
          inputMode: 'text',
          history: [],
          lastOutput: null,
        },
        bindings: {
          input: '/terminal/input',
          output: '/terminal/output',
        },
      },
    ],
  },
};
```

### YAML

```yaml
version: '1.0.0'
name: 'MyApp'
orchestration:
  type: custom
  nodes:
    - id: terminal-1
      type: terminal
      x: 100
      y: 100
      props:
        inputMode: text
        history: []
        lastOutput: null
      bindings:
        input: /terminal/input
        output: /terminal/output
```

### JSON

```json
{
  "version": "1.0.0",
  "name": "MyApp",
  "orchestration": {
    "type": "custom",
    "nodes": [
      {
        "id": "terminal-1",
        "type": "terminal",
        "x": 100,
        "y": 100,
        "props": {
          "inputMode": "text",
          "history": [],
          "lastOutput": null
        },
        "bindings": {
          "input": "/terminal/input",
          "output": "/terminal/output"
        }
      }
    ]
  }
}
```

## Runtime Usage

### Creating a Terminal Adapter

```typescript
import { createTerminalAdapter } from '@plures/praxis';

const terminal = createTerminalAdapter({
  nodeId: 'my-terminal',
  props: {
    inputMode: 'text',
    history: [],
    lastOutput: null,
  },
  inputPath: '/terminal/input',
  outputPath: '/terminal/output',
});
```

### Executing Commands

```typescript
// Execute a command
const result = await terminal.executeCommand('echo "Hello World"');

console.log(result.command); // 'echo "Hello World"'
console.log(result.output); // Command output (currently stubbed)
console.log(result.exitCode); // 0 for success
console.log(result.timestamp); // Execution timestamp
```

### Managing Command History

```typescript
// Get command history
const history = terminal.getHistory();
console.log(history); // ['echo "Hello World"', ...]

// Clear history
terminal.clearHistory();
```

### Updating Terminal Properties

```typescript
// Update input mode
terminal.updateProps({
  inputMode: 'widget',
});

// Get current state
const state = terminal.getState();
console.log(state.inputMode); // 'widget'
```

### Convenience Function

```typescript
import { runTerminalCommand } from '@plures/praxis';

// Quick command execution
const result = await runTerminalCommand('temp-terminal', 'ls -la');
console.log(result.output);
```

## Svelte Component

### TerminalNode.svelte

The `TerminalNode` Svelte component provides a visual terminal interface for canvas-based applications.

**Import:**

```typescript
// Import the component directly from the .svelte file
import TerminalNode from '@plures/praxis/components/TerminalNode.svelte';
// Or use the package path if your bundler supports svelte exports
// import { TerminalNode } from '@plures/praxis/components';
```

**Basic Usage:**

```svelte
<script>
  import TerminalNode from '@plures/praxis/components/TerminalNode.svelte';
  import { createTerminalAdapter } from '@plures/praxis';

  const terminal = createTerminalAdapter({
    nodeId: 'my-terminal',
  });
</script>

<TerminalNode adapter={terminal} x={100} y={100} />
```

**Props:**

| Prop              | Type              | Default  | Description                |
| ----------------- | ----------------- | -------- | -------------------------- |
| `adapter`         | `TerminalAdapter` | required | Terminal adapter instance  |
| `x`               | `number`          | `0`      | X position on canvas       |
| `y`               | `number`          | `0`      | Y position on canvas       |
| `width`           | `number`          | `600`    | Component width in pixels  |
| `height`          | `number`          | `400`    | Component height in pixels |
| `draggable`       | `boolean`         | `true`   | Enable drag to move        |
| `resizable`       | `boolean`         | `true`   | Enable resize handle       |
| `showContextMenu` | `boolean`         | `false`  | Show context menu          |

**Features:**

- **Drag and Drop**: Click and drag the title bar to reposition
- **Resize**: Drag the bottom-right corner to resize
- **Context Menu**: Right-click for operations (clear, copy)
- **Keyboard Shortcuts**: Press Enter to execute commands
- **Command History**: Tracks all executed commands
- **Dark Theme**: VS Code-inspired dark color scheme
- **Input Modes**: Supports both text and widget input modes

**Complete Example:**

```svelte
<script lang="ts">
  import TerminalNode from '@plures/praxis/components/TerminalNode.svelte';
  import { createTerminalAdapter } from '@plures/praxis';

  // Create multiple terminals
  const terminals = [
    {
      id: 'term-1',
      adapter: createTerminalAdapter({
        nodeId: 'terminal-1',
        props: {
          inputMode: 'text',
          history: [],
          lastOutput: null,
        },
      }),
      x: 50,
      y: 50,
    },
    {
      id: 'term-2',
      adapter: createTerminalAdapter({
        nodeId: 'terminal-2',
        props: {
          inputMode: 'widget',
          history: [],
          lastOutput: null,
        },
      }),
      x: 700,
      y: 50,
    },
  ];
</script>

<div class="canvas">
  {#each terminals as terminal (terminal.id)}
    <TerminalNode
      adapter={terminal.adapter}
      x={terminal.x}
      y={terminal.y}
      width={600}
      height={400}
      draggable={true}
      resizable={true}
    />
  {/each}
</div>

<style>
  .canvas {
    position: relative;
    width: 100%;
    height: 100vh;
    background: #1a1a1a;
  }
</style>
```

See [examples/terminal-canvas/](../examples/terminal-canvas/) for a complete working example with toolbar and multiple terminals.

## API Reference

### TerminalNodeProps

Defines the properties of a terminal node.

```typescript
interface TerminalNodeProps {
  /** Input mode: text input or widget-based */
  inputMode: 'text' | 'widget';
  /** Command history */
  history: string[];
  /** Last command output */
  lastOutput: string | null;
}
```

### NodeBindings

Defines PluresDB path bindings for reactive state management.

```typescript
interface NodeBindings {
  /** Output binding to pluresdb path */
  output?: string;
  /** Input binding to pluresdb path */
  input?: string;
  /** Additional custom bindings */
  [key: string]: string | undefined;
}
```

### NodeDefinition

Extended to support terminal nodes and other orchestration node types.

```typescript
interface NodeDefinition {
  /** Node identifier */
  id: string;
  /** Node type */
  type: string;
  /** Node configuration */
  config: Record<string, unknown>;
  /** Node position (x, y coordinates for canvas) */
  x?: number;
  y?: number;
  /** Node props (type-specific properties) */
  props?: Record<string, unknown>;
  /** Node bindings (connections to pluresdb paths) */
  bindings?: NodeBindings;
}
```

### TerminalAdapter

The main class for managing terminal node runtime behavior.

```typescript
class TerminalAdapter {
  constructor(options: TerminalAdapterOptions);

  /** Execute a terminal command */
  executeCommand(command: string): Promise<TerminalExecutionResult>;

  /** Get current terminal state */
  getState(): Readonly<TerminalNodeState>;

  /** Update terminal props */
  updateProps(props: Partial<TerminalNodeProps>): void;

  /** Clear command history */
  clearHistory(): void;

  /** Get command history */
  getHistory(): ReadonlyArray<string>;
}
```

### TerminalExecutionResult

Result of executing a terminal command.

```typescript
interface TerminalExecutionResult {
  /** Command that was executed */
  command: string;
  /** Output from the command */
  output: string;
  /** Exit code (0 for success) */
  exitCode: number;
  /** Execution timestamp */
  timestamp: number;
  /** Error message if execution failed */
  error?: string;
}
```

## Schema Validation

Terminal nodes are automatically validated when loading schemas:

```typescript
import { validateSchema, loadSchemaFromFile } from '@plures/praxis';

// Validate a schema programmatically
const result = validateSchema(schema);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}

// Load and validate from file
const fileResult = await loadSchemaFromFile('./schema.yaml');
if (fileResult.errors.length > 0) {
  console.error('Load errors:', fileResult.errors);
}
```

### Validation Rules

- `inputMode` must be either `'text'` or `'widget'`
- `history` must be an array (if provided)
- Node `id` is required
- Node `type` is required

## Examples

### Basic Terminal

```typescript
import { createTerminalAdapter } from '@plures/praxis';

const terminal = createTerminalAdapter({
  nodeId: 'basic-terminal',
});

await terminal.executeCommand('pwd');
await terminal.executeCommand('ls');

console.log(terminal.getHistory()); // ['pwd', 'ls']
```

### Terminal with History

```typescript
const terminal = createTerminalAdapter({
  nodeId: 'history-terminal',
  props: {
    inputMode: 'text',
    history: ['echo "Previous session"'],
    lastOutput: null,
  },
});

await terminal.executeCommand('echo "New session"');
console.log(terminal.getHistory());
// ['echo "Previous session"', 'echo "New session"']
```

### Loading from YAML

```typescript
import { loadSchemaFromFile } from '@plures/praxis';

const result = await loadSchemaFromFile('./terminal-schema.yaml');
if (result.schema?.orchestration?.nodes) {
  for (const node of result.schema.orchestration.nodes) {
    if (node.type === 'terminal') {
      console.log(`Found terminal node: ${node.id}`);
    }
  }
}
```

## Integration Points

### PluresDB (Future)

Terminal nodes support PluresDB bindings for reactive state management:

```typescript
const terminal = createTerminalAdapter({
  nodeId: 'reactive-terminal',
  inputPath: '/app/terminal/input', // Listen for commands
  outputPath: '/app/terminal/output', // Publish results
});

// When implemented, commands from inputPath will be auto-executed
// Results will be auto-synced to outputPath
```

### RuneBook (Future)

Integration with RuneBook execution model for actual command execution:

```typescript
// Current: Stubbed execution
const result = await terminal.executeCommand('npm test');
// result.output: "[Stub] Command received: npm test..."

// Future: Real execution via RuneBook
// result.output: actual test output
```

### Canvas Integration with Svelte Component

Visual terminal component for Praxis Canvas is now available! Use the `TerminalNode.svelte` component:

```svelte
<script>
  import TerminalNode from '@plures/praxis/components/TerminalNode.svelte';
  import { createTerminalAdapter } from '@plures/praxis';

  const terminal = createTerminalAdapter({
    nodeId: 'visual-terminal',
    props: {
      inputMode: 'widget',
      history: [],
      lastOutput: null,
    },
  });
</script>

<TerminalNode
  adapter={terminal}
  x={100}
  y={100}
  width={600}
  height={400}
  draggable={true}
  resizable={true}
/>
```

**Component Features:**

- Drag and drop positioning
- Resizable dimensions
- Context menu operations
- Dark VS Code-inspired theme
- Both text and widget input modes
- Command history display
- Real-time output rendering

See [examples/terminal-canvas/](../examples/terminal-canvas/) for a complete working example.

## Testing

The terminal node implementation includes comprehensive tests:

```bash
npm test
```

Tests cover:

- Schema validation with various configurations
- YAML and JSON loading
- Terminal adapter creation and configuration
- Command execution and history management
- Property updates and state management
- PluresDB binding configuration

## Future Enhancements

1. **RuneBook Integration**: Full command execution via RuneBook
2. **PluresDB Sync**: Real-time reactive state synchronization
3. **Security**: Command sandboxing and permission system
4. **Streaming**: Real-time command output streaming
5. **Environment**: Custom environment variables per terminal
6. **Multiplexing**: Multiple terminal sessions in one node
7. **Persistence**: Save/restore terminal sessions
8. **Node Wiring**: Connect terminals to InputNode, DisplayNode, and AgentNode

## Migration Guide

No migration needed - this is a new feature. Existing Praxis applications continue to work without changes.

To adopt terminal nodes:

1. Update to latest Praxis version
2. Add terminal nodes to your schema
3. Create terminal adapters in your runtime code
4. Start executing commands!

## Best Practices

1. **Use Bindings**: Define input/output bindings for reactive integration
2. **Track History**: Monitor command history for debugging
3. **Error Handling**: Check `exitCode` and `error` in execution results
4. **State Management**: Use `getState()` to inspect terminal state
5. **Clean Up**: Call `clearHistory()` when needed to manage memory

## Support

For questions, issues, or feature requests:

- GitHub Issues: https://github.com/plures/praxis/issues
- Documentation: https://github.com/plures/praxis/tree/main/docs

## License

Terminal Node is part of Praxis and follows the same MIT license.
