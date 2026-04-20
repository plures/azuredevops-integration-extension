# Praxis Svelte Components

This directory contains Svelte components for Praxis/RuneBook applications.

## Components

### TerminalNode

A terminal interface component with command execution, history, and canvas integration.

**Features:**

- Command execution with output display
- Command history tracking
- Draggable positioning on canvas
- Resizable dimensions
- Context menu with operations
- Text and widget input modes
- Dark theme with VS Code styling

**Usage:**

```svelte
<script>
  import TerminalNode from '@plures/praxis/components/TerminalNode.svelte';
  import { createTerminalAdapter } from '@plures/praxis';

  const adapter = createTerminalAdapter({
    nodeId: 'my-terminal',
    props: {
      inputMode: 'text',
      history: [],
      lastOutput: null,
    },
  });
</script>

<TerminalNode
  {adapter}
  x={100}
  y={100}
  width={600}
  height={400}
  draggable={true}
  resizable={true}
/>
```

**Props:**

- `adapter: TerminalAdapter` - Terminal adapter instance (required)
- `x?: number` - X position on canvas (default: 0)
- `y?: number` - Y position on canvas (default: 0)
- `width?: number` - Component width in pixels (default: 600)
- `height?: number` - Component height in pixels (default: 400)
- `draggable?: boolean` - Enable drag to move (default: true)
- `resizable?: boolean` - Enable resize handle (default: true)
- `showContextMenu?: boolean` - Show context menu (default: false)

**Canvas Integration:**

The component is designed for canvas-based applications where multiple terminal nodes can be positioned and managed visually:

```svelte
<script>
  import TerminalNode from '@plures/praxis/components/TerminalNode.svelte';
  import { createTerminalAdapter } from '@plures/praxis';

  const terminals = [
    {
      adapter: createTerminalAdapter({ nodeId: 'terminal-1' }),
      x: 50,
      y: 50,
    },
    {
      adapter: createTerminalAdapter({ nodeId: 'terminal-2' }),
      x: 700,
      y: 50,
    },
  ];
</script>

<div class="canvas">
  {#each terminals as terminal}
    <TerminalNode
      adapter={terminal.adapter}
      x={terminal.x}
      y={terminal.y}
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

## Development

### Building

Components are exported as source files and should be processed by your Svelte application's build system.

### Testing

Component behavior can be tested using Svelte Testing Library or similar tools in your application.

## Requirements

- Svelte 5.0+ (peer dependency)
- Modern browser with ES modules support

## Future Components

Planned components for upcoming RuneBook tasks:

- `InputNode` - User input widgets (text, confirm, select)
- `DisplayNode` - Data visualization (text, markdown, JSON)
- `AgentNode` - AI agent integration with MCP
- `SudolangNode` - Sudolang transformation component
- `CustomNode` - Dynamic custom component loader
