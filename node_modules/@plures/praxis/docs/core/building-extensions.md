# Building Extensions

Praxis is designed to be extensible. This guide explains how to create plugins, custom generators, and integrations for the Praxis framework.

## Extension Types

| Type                  | Description                | Use Case                         |
| --------------------- | -------------------------- | -------------------------------- |
| **Plugins**           | Extend engine behavior     | Add middleware, effects, logging |
| **Generators**        | Custom code generation     | Generate for other frameworks    |
| **Adapters**          | External integrations      | Connect to databases, APIs       |
| **Templates**         | Custom project scaffolding | Organization-specific setups     |
| **Canvas Extensions** | Extend visual editor       | Custom components, tools         |

## Plugins

### Creating a Plugin

Plugins can hook into the engine lifecycle:

```typescript
import type { PraxisPlugin, PraxisState, PraxisEvent } from '@plures/praxis';

interface LoggerOptions {
  level: 'debug' | 'info' | 'warn' | 'error';
  prefix?: string;
}

export function createLoggerPlugin(options: LoggerOptions): PraxisPlugin {
  return {
    name: 'logger',

    // Called when engine is created
    onInit(engine) {
      console.log(`${options.prefix || ''} Engine initialized`);
    },

    // Called before each step
    beforeStep(state, events) {
      if (options.level === 'debug') {
        console.log('Events:', events);
      }
      return { state, events }; // Can modify
    },

    // Called after each step
    afterStep(result) {
      if (options.level === 'debug') {
        console.log('Facts:', result.state.facts);
      }
      return result; // Can modify
    },

    // Called on error
    onError(error, state, events) {
      console.error(`${options.prefix || ''} Error:`, error);
    },
  };
}
```

### Using Plugins

```typescript
import { createPraxisEngine, PraxisRegistry } from '@plures/praxis';
import { createLoggerPlugin } from './plugins/logger';
import { createPersistPlugin } from './plugins/persist';

const engine = createPraxisEngine({
  initialContext: { count: 0 },
  registry: new PraxisRegistry(),
  plugins: [
    createLoggerPlugin({ level: 'debug', prefix: '[MyApp]' }),
    createPersistPlugin({ storage: 'localStorage', key: 'app-state' }),
  ],
});
```

### Plugin API

```typescript
interface PraxisPlugin<TContext = any> {
  name: string;

  // Lifecycle hooks
  onInit?(engine: PraxisEngine<TContext>): void;
  onDestroy?(): void;

  // Step hooks
  beforeStep?(
    state: PraxisState<TContext>,
    events: PraxisEvent[]
  ): { state: PraxisState<TContext>; events: PraxisEvent[] };

  afterStep?(result: StepResult<TContext>): StepResult<TContext>;

  // Error handling
  onError?(error: Error, state: PraxisState<TContext>, events: PraxisEvent[]): void;

  // Subscription
  onStateChange?(state: PraxisState<TContext>): void;
}
```

## Custom Generators

### Creating a Generator

Generators transform PSF schemas into code:

```typescript
import type { PSFSchema, Generator, GeneratorOutput } from '@plures/praxis/codegen';

interface ReactGeneratorOptions {
  typescript: boolean;
  styling: 'css' | 'styled-components' | 'tailwind';
}

export const reactGenerator: Generator<ReactGeneratorOptions> = {
  name: 'react',
  description: 'Generate React components from PSF schema',

  generate(schema: PSFSchema, options: ReactGeneratorOptions): GeneratorOutput[] {
    const outputs: GeneratorOutput[] = [];

    // Generate components
    for (const component of schema.components) {
      const code = generateReactComponent(component, options);
      outputs.push({
        path: `components/${component.name}.${options.typescript ? 'tsx' : 'jsx'}`,
        content: code,
        type: 'component',
      });
    }

    // Generate types (TypeScript only)
    if (options.typescript) {
      const types = generateTypes(schema);
      outputs.push({
        path: 'types.ts',
        content: types,
        type: 'types',
      });
    }

    return outputs;
  },
};

function generateReactComponent(component: ComponentDef, options: ReactGeneratorOptions): string {
  const { name, type, model, props } = component;

  return `
import React from 'react';
${options.typescript ? `import type { ${model} } from '../types';` : ''}

${options.typescript ? `interface ${name}Props {` : ''}
${props?.map((p) => `  ${p.name}${p.required ? '' : '?'}: ${p.type};`).join('\n')}
${options.typescript ? '}' : ''}

export function ${name}(${options.typescript ? `props: ${name}Props` : 'props'}) {
  return (
    <div className="${name.toLowerCase()}">
      {/* Generated component */}
    </div>
  );
}
`.trim();
}
```

### Registering a Generator

```typescript
import { registerGenerator } from '@plures/praxis/codegen';
import { reactGenerator } from './generators/react';

registerGenerator(reactGenerator);

// Use via CLI
// praxis generate --schema ./schema.psf.json --generator react
```

### Generator Output Structure

```typescript
interface GeneratorOutput {
  path: string; // Output file path
  content: string; // Generated code
  type: OutputType; // 'component' | 'types' | 'docs' | 'config'
  overwrite?: boolean; // Allow overwriting existing files
  format?: boolean; // Apply code formatting
}
```

## Adapters

### Creating a Database Adapter

```typescript
import type { DatabaseAdapter, Collection, Query } from '@plures/praxis';

interface PostgresOptions {
  connectionString: string;
  ssl?: boolean;
}

export function createPostgresAdapter(options: PostgresOptions): DatabaseAdapter {
  let pool: Pool;

  return {
    name: 'postgres',

    async connect() {
      pool = new Pool({ connectionString: options.connectionString });
      await pool.connect();
    },

    async disconnect() {
      await pool.end();
    },

    async createCollection(name: string, schema: CollectionSchema) {
      const columns = schemaToColumns(schema);
      await pool.query(`CREATE TABLE IF NOT EXISTS ${name} (${columns})`);
    },

    async insert(collection: string, document: any) {
      const { columns, values, placeholders } = prepareInsert(document);
      const result = await pool.query(
        `INSERT INTO ${collection} (${columns}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      return result.rows[0];
    },

    async find(collection: string, query: Query) {
      const { where, params } = queryToSQL(query);
      const result = await pool.query(`SELECT * FROM ${collection} ${where}`, params);
      return result.rows;
    },

    // ... other CRUD operations
  };
}
```

### Using Adapters

```typescript
import { createPluresDB } from '@plures/praxis';
import { createPostgresAdapter } from './adapters/postgres';

const db = createPluresDB({
  adapter: createPostgresAdapter({
    connectionString: process.env.DATABASE_URL,
  }),
  collections: ['users', 'posts'],
});
```

## Templates

### Creating a Project Template

Templates are directories with files that get copied and transformed:

```
templates/
  my-template/
    template.json           # Template configuration
    package.json.template   # Files with .template get variable substitution
    src/
      schema.psf.json.template
      index.ts
    README.md.template
```

**template.json:**

```json
{
  "name": "my-template",
  "description": "My custom Praxis template",
  "version": "1.0.0",
  "variables": [
    {
      "name": "appName",
      "prompt": "Application name",
      "default": "my-app"
    },
    {
      "name": "author",
      "prompt": "Author name"
    }
  ],
  "postInstall": ["npm install", "npx praxis generate --schema ./src/schema.psf.json"]
}
```

**package.json.template:**

```json
{
  "name": "{{appName}}",
  "version": "0.1.0",
  "author": "{{author}}",
  "dependencies": {
    "@plures/praxis": "^0.2.1"
  }
}
```

### Registering Templates

```bash
# Global templates directory
~/.praxis/templates/my-template/

# Or in a package
npm install @myorg/praxis-template-enterprise
```

### Using Custom Templates

```bash
praxis create app my-app --template @myorg/praxis-template-enterprise
```

## Canvas Extensions

### Creating a Canvas Extension

```typescript
import type { CanvasExtension, CanvasContext } from '@plures/praxis/canvas';

export const customPaletteExtension: CanvasExtension = {
  name: 'custom-palette',

  // Add items to the component palette
  palette: {
    category: 'Custom',
    items: [
      {
        id: 'custom-chart',
        name: 'Chart Component',
        icon: '📊',
        createComponent: () => ({
          id: `comp_${Date.now()}`,
          name: 'Chart',
          type: 'display',
          description: 'A chart component',
        }),
      },
    ],
  },

  // Add toolbar buttons
  toolbar: [
    {
      id: 'export-figma',
      label: 'Export to Figma',
      icon: 'figma',
      action: async (context: CanvasContext) => {
        const schema = context.getSchema();
        await exportToFigma(schema);
      },
    },
  ],

  // Add context menu items
  contextMenu: [
    {
      id: 'duplicate-with-variants',
      label: 'Duplicate with Variants',
      applies: (selection) => selection.type === 'component',
      action: (context, selection) => {
        duplicateWithVariants(context, selection);
      },
    },
  ],
};
```

### Registering Canvas Extensions

**canvas.config.ts:**

```typescript
import { customPaletteExtension } from './extensions/custom-palette';

export const config: CanvasConfig = {
  extensions: [
    customPaletteExtension,
    '@plures/canvas-figma', // npm package
    './extensions/my-extension.ts', // local file
  ],
};
```

## Publishing Extensions

### Package Structure

```
my-praxis-extension/
  package.json
  src/
    index.ts      # Main entry point
    plugin.ts     # Plugin code
    generator.ts  # Generator code (if applicable)
  dist/           # Compiled output
  README.md
```

**package.json:**

```json
{
  "name": "@myorg/praxis-extension-foo",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "keywords": ["praxis", "praxis-extension", "praxis-plugin"],
  "peerDependencies": {
    "@plures/praxis": "^0.2.0"
  },
  "praxis": {
    "type": "extension",
    "provides": ["plugin", "generator"]
  }
}
```

### Publishing

```bash
npm publish --access public
```

### Discovery

Extensions with `praxis` in keywords are discoverable:

```bash
npm search praxis-extension
praxis extensions list
praxis extensions install @myorg/praxis-extension-foo
```

## Best Practices

### 1. Type Safety

Use TypeScript and export proper types:

```typescript
export interface MyPluginOptions {
  // Document all options
  enabled: boolean;
  level?: 'basic' | 'advanced';
}

export function createMyPlugin(options: MyPluginOptions): PraxisPlugin {
  // Implementation
}
```

### 2. Error Handling

Handle errors gracefully:

```typescript
export const myPlugin: PraxisPlugin = {
  name: 'my-plugin',

  beforeStep(state, events) {
    try {
      // Plugin logic
    } catch (error) {
      console.error('[my-plugin] Error:', error);
      // Don't break the engine
      return { state, events };
    }
  },
};
```

### 3. Documentation

Include comprehensive README:

```markdown
# My Praxis Extension

## Installation

\`\`\`bash
npm install @myorg/praxis-extension-foo
\`\`\`

## Usage

\`\`\`typescript
import { createFooPlugin } from '@myorg/praxis-extension-foo';

const engine = createPraxisEngine({
plugins: [createFooPlugin({ option: 'value' })],
});
\`\`\`

## Options

| Option | Type   | Default   | Description |
| ------ | ------ | --------- | ----------- |
| option | string | 'default' | Description |
```

### 4. Testing

Test your extensions:

```typescript
import { describe, it, expect } from 'vitest';
import { createMyPlugin } from './my-plugin';
import { createPraxisEngine, PraxisRegistry } from '@plures/praxis';

describe('MyPlugin', () => {
  it('should log on state change', () => {
    const logs: string[] = [];
    const plugin = createMyPlugin({
      onLog: (msg) => logs.push(msg),
    });

    const engine = createPraxisEngine({
      initialContext: {},
      registry: new PraxisRegistry(),
      plugins: [plugin],
    });

    engine.dispatch([{ tag: 'TEST', payload: {} }]);

    expect(logs).toContain('Step executed');
  });
});
```

---

**Next:** [Tutorials](../tutorials/README.md)
