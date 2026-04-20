# CodeCanvas Integration Guide

CodeCanvas is the visual IDE for the Praxis framework. It provides a graphical interface for designing schemas, logic flows, and components.

## Overview

CodeCanvas enables:

- **Visual Schema Design**: Drag-and-drop model and component design
- **Logic Flow Editor**: Build rules and state machines visually
- **Component Preview**: See generated components in real-time
- **Orchestration Visualization**: Visualize distributed systems
- **Documentation Navigation**: Interactive documentation browser

## Getting Started

### Launch Canvas

From your Praxis project:

```bash
praxis canvas src/schemas/app.schema.ts
```

This opens Canvas at http://localhost:3000 with your schema loaded.

### Create New Schema

Start Canvas without a schema:

```bash
praxis canvas --new
```

## Canvas Features

### 1. Schema Editor

**Model Designer**:

- Drag models onto canvas
- Define fields with visual editor
- Set relationships between models
- Configure indexes and constraints
- Preview generated PluresDB schema

**Component Designer**:

- Create components from templates
- Bind components to models
- Configure props and events
- Design layout visually
- Preview generated Svelte components

### 2. Logic Flow Editor

**Flow Canvas**:

- Visual state machine designer
- Connect facts, events, and rules
- Define transitions with conditions
- Test flows interactively
- Export to Praxis logic code

**Rule Builder**:

- Visual rule editor
- Condition builder with drag-and-drop
- Action designer
- Priority management
- Constraint visualization

### 3. Component Preview

**Live Preview**:

- Real-time component rendering
- Interactive component testing
- Props editor
- Event logging
- Responsive preview modes

**Code Sync**:

- Two-way sync with files
- Live reload on changes
- Conflict resolution
- Version history

### 4. Orchestration View

**System Topology**:

- Node visualization
- Connection mapping
- State distribution view
- Health monitoring
- Performance metrics

**DSC Designer**:

- Visual DSC configuration
- Node role assignment
- State sync configuration
- Health check setup

### 5. Documentation Browser

**Interactive Docs**:

- Schema documentation
- API reference
- Component catalog
- Logic flow diagrams
- Generated from State-Docs

## Workflows

### Visual-First Workflow

1. Design schema in Canvas
2. Generate code with `praxis generate`
3. Customize generated code
4. Preview in Canvas
5. Deploy

### Code-First Workflow

1. Write schema in TypeScript
2. Open in Canvas for visualization
3. Make visual adjustments in Canvas
4. Sync changes back to code
5. Continue development

### Hybrid Workflow

1. Start with visual design
2. Export to code
3. Add custom logic in code
4. Use Canvas for visualization
5. Iterate between visual and code

## Configuration

### Canvas Config File

Create `canvas.config.ts`:

```typescript
import type { CanvasConfig } from '@plures/praxis/canvas';

export const config: CanvasConfig = {
  // Server settings
  port: 3000,
  host: 'localhost',

  // Editor settings
  mode: 'edit', // 'edit' | 'view' | 'present'
  theme: 'dark', // 'light' | 'dark' | 'auto'

  // Features
  features: {
    collaboration: true,
    autosave: true,
    versionHistory: true,
    aiAssist: false,
  },

  // Preview settings
  preview: {
    autoRefresh: true,
    refreshInterval: 1000,
    iframe: true,
  },

  // Code sync
  sync: {
    enabled: true,
    watchFiles: true,
    conflictResolution: 'ask', // 'ask' | 'canvas' | 'code'
  },

  // Export settings
  export: {
    format: 'typescript',
    includeComments: true,
    formatting: 'prettier',
  },
};
```

### Launch with Config

```bash
praxis canvas --config canvas.config.ts
```

## Collaboration

### Real-Time Collaboration

Enable in config:

```typescript
features: {
  collaboration: true,
}
```

Share Canvas URL with team members. Changes sync in real-time.

### Permissions

Configure access:

```typescript
collaboration: {
  enabled: true,
  permissions: {
    view: ['*'],
    edit: ['team@example.com'],
    admin: ['owner@example.com'],
  },
}
```

## Keyboard Shortcuts

- `Ctrl/Cmd + N`: New model
- `Ctrl/Cmd + C`: Create component
- `Ctrl/Cmd + R`: Add rule
- `Ctrl/Cmd + S`: Save
- `Ctrl/Cmd + G`: Generate code
- `Ctrl/Cmd + P`: Preview component
- `Ctrl/Cmd + /`: Command palette
- `Space`: Pan canvas
- `+/-`: Zoom in/out

## Tips & Tricks

### Efficient Model Design

1. Start with core models
2. Add fields incrementally
3. Use Canvas to visualize relationships
4. Generate early and often
5. Iterate based on generated code

### Logic Flow Design

1. Map business processes first
2. Identify key events
3. Define facts that matter
4. Connect with rules
5. Test flows in Canvas

### Component Design

1. Use templates as starting points
2. Preview frequently
3. Test with different data
4. Sync to code for styling
5. Maintain separation of concerns

## Integration with VS Code

### Canvas Extension

Install the Praxis Canvas extension:

```bash
code --install-extension plures.praxis-canvas
```

Features:

- Open Canvas from editor
- Inline previews
- Quick navigation
- Code snippets

## Troubleshooting

### Canvas won't start

Check:

- Port 3000 is available
- Schema file path is correct
- Dependencies are installed

### Changes not syncing

Solutions:

- Enable sync in config
- Check file permissions
- Restart Canvas with `--force-sync`

### Preview not updating

Try:

- Clear browser cache
- Disable ad blockers
- Check preview refresh settings

## Advanced Features

### Custom Templates

Add custom component templates:

```typescript
canvas: {
  templates: {
    components: [
      {
        name: 'CustomForm',
        template: './templates/custom-form.svelte',
        thumbnail: './templates/custom-form.png',
      },
    ],
  },
}
```

### Plugins

Extend Canvas with plugins:

```typescript
canvas: {
  plugins: [
    '@plures/canvas-plugin-figma',
    '@plures/canvas-plugin-storybook',
    './plugins/custom-plugin.ts',
  ],
}
```

### AI Assistance

Enable AI features:

```typescript
features: {
  aiAssist: true,
}
```

AI can:

- Suggest models from descriptions
- Generate rules from natural language
- Optimize logic flows
- Recommend component layouts

## Export Options

### Export to Code

```bash
# From Canvas UI: File > Export > TypeScript
```

Or via CLI:

```bash
praxis export --source canvas --format typescript
```

### Export Diagrams

Export visual diagrams:

- PNG/SVG for documentation
- Mermaid for markdown
- DOT for Graphviz
- PDF for presentations

### Export Documentation

Generate State-Docs from Canvas:

```bash
praxis docs --source canvas
```

## Next Steps

- Explore example Canvas projects
- Try collaborative editing
- Customize with plugins
- Integrate with CI/CD
- Share your Canvas templates

## Resources

- [Canvas Examples](../../examples/canvas/)
- [Plugin Development](../api/canvas-plugins.md)
- [Canvas API Reference](../api/canvas-api.md)
- [Video Tutorials](https://youtube.com/plures)

Canvas makes Praxis development visual, collaborative, and fun! 🎨
