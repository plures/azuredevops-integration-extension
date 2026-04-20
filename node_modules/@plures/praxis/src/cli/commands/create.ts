/**
 * Praxis Create Command
 *
 * Creates new Praxis applications and components from templates.
 */

import { mkdir, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { existsSync } from 'fs';

/**
 * Options for the create command
 */
export interface CreateOptions {
  /** Template to use (basic, fullstack) */
  template?: string;
  /** Output directory (for components) */
  directory?: string;
  /** Features to include */
  features?: string[];
}

/**
 * Generate package.json content for a new app
 */
function generatePackageJson(name: string): string {
  const pkg = {
    name: name,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
      preview: 'vite preview',
      generate: 'praxis generate',
      test: 'vitest',
    },
    dependencies: {
      '@plures/praxis': '^0.2.1',
    },
    devDependencies: {
      '@sveltejs/vite-plugin-svelte': '^5.0.0',
      '@tsconfig/svelte': '^5.0.4',
      svelte: '^5.0.0',
      'svelte-check': '^4.0.0',
      typescript: '^5.6.0',
      vite: '^6.0.0',
      vitest: '^4.0.0',
    },
  };

  return JSON.stringify(pkg, null, 2);
}

/**
 * Generate tsconfig.json content
 */
function generateTsConfig(): string {
  const config = {
    extends: '@tsconfig/svelte/tsconfig.json',
    compilerOptions: {
      target: 'ESNext',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules'],
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Generate vite.config.ts content
 */
function generateViteConfig(): string {
  return `import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
`;
}

/**
 * Generate main.ts entry point
 */
function generateMainTs(name: string): string {
  return `/**
 * ${name} - Built with Praxis
 */
import App from './App.svelte';
import { mount } from 'svelte';

const app = mount(App, {
  target: document.getElementById('app')!
});

export default app;
`;
}

/**
 * Generate App.svelte component
 */
function generateAppSvelte(name: string): string {
  return `<script lang="ts">
  import { createPraxisEngine, PraxisRegistry, defineFact, defineEvent, defineRule } from '@plures/praxis';

  // Define your context type
  interface AppContext {
    initialized: boolean;
    message: string;
  }

  // Create the registry and engine
  const registry = new PraxisRegistry<AppContext>();
  
  const engine = createPraxisEngine({
    initialContext: {
      initialized: true,
      message: 'Welcome to ${name}!'
    },
    registry
  });

  // Reactive context
  let context = $state(engine.getContext());
</script>

<main>
  <h1>{context.message}</h1>
  <p>Your Praxis application is running!</p>
  
  <div class="card">
    <h2>Next Steps</h2>
    <ul>
      <li>Define your schema in <code>src/schemas/app.schema.js</code></li>
      <li>Run <code>praxis generate</code> to generate code</li>
      <li>Build your application logic with facts, events, and rules</li>
    </ul>
  </div>
</main>

<style>
  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
  }

  h1 {
    color: #333;
    text-align: center;
  }

  .card {
    background: #f5f5f5;
    border-radius: 8px;
    padding: 1.5rem;
    margin-top: 2rem;
  }

  .card h2 {
    margin-top: 0;
  }

  code {
    background: #e0e0e0;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.9em;
  }

  li {
    margin: 0.5rem 0;
  }
</style>
`;
}

/**
 * Generate index.html
 */
function generateIndexHtml(name: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        min-height: 100vh;
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`;
}

/**
 * Generate app schema file
 */
function generateAppSchema(name: string): string {
  return `/**
 * ${name} Schema
 * 
 * Define your application schema here.
 * Run 'praxis generate' to generate code from this schema.
 */

export const schema = {
  version: '1.0.0',
  name: '${name}',
  description: 'A Praxis application',
  
  models: [
    {
      name: 'Item',
      description: 'Example item model',
      fields: [
        { name: 'id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'createdAt', type: 'date' }
      ]
    }
  ],
  
  components: [
    {
      name: 'ItemForm',
      type: 'form',
      description: 'Form for creating items',
      model: 'Item'
    },
    {
      name: 'ItemList',
      type: 'list',
      description: 'List of items',
      model: 'Item'
    }
  ],
  
  logic: [
    {
      id: 'item-logic',
      description: 'Item management logic',
      
      events: [
        {
          tag: 'CREATE_ITEM',
          payload: { name: 'string' },
          description: 'Create a new item'
        },
        {
          tag: 'DELETE_ITEM',
          payload: { itemId: 'string' },
          description: 'Delete an item'
        }
      ],
      
      facts: [
        {
          tag: 'ItemCreated',
          payload: { itemId: 'string', name: 'string' },
          description: 'An item was created'
        },
        {
          tag: 'ItemDeleted',
          payload: { itemId: 'string' },
          description: 'An item was deleted'
        }
      ],
      
      rules: [
        {
          id: 'item.create',
          description: 'Create a new item',
          priority: 10
        }
      ],
      
      constraints: [
        {
          id: 'item.name-required',
          description: 'Item name must not be empty',
          message: 'Item name is required'
        }
      ]
    }
  ]
};

export default schema;
`;
}

/**
 * Generate svelte.config.js
 */
function generateSvelteConfig(): string {
  return `import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess()
};
`;
}

/**
 * Generate README for new app
 */
function generateReadme(name: string, template: string): string {
  return `# ${name}

A Praxis application created with the ${template} template.

## Getting Started

### Install dependencies

\`\`\`bash
npm install
\`\`\`

### Start development server

\`\`\`bash
npm run dev
\`\`\`

### Generate code from schema

\`\`\`bash
npm run generate
\`\`\`

### Build for production

\`\`\`bash
npm run build
\`\`\`

## Project Structure

\`\`\`
${name}/
├── src/
│   ├── schemas/
│   │   └── app.schema.js    # Application schema
│   ├── components/          # Generated & custom components
│   ├── logic/               # Logic engine setup
│   ├── App.svelte           # Root component
│   └── main.ts              # Application entry
├── public/                  # Static assets
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
\`\`\`

## Documentation

- [Praxis Framework Guide](https://github.com/plures/praxis/blob/main/FRAMEWORK.md)
- [Getting Started](https://github.com/plures/praxis/blob/main/GETTING_STARTED.md)
- [Schema Reference](https://github.com/plures/praxis/blob/main/docs/guides/schema.md)

## License

MIT
`;
}

/**
 * Generate .gitignore
 */
function generateGitignore(): string {
  return `# Dependencies
node_modules/

# Build output
dist/
build/
.svelte-kit/

# Generated code
generated/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Test coverage
coverage/
`;
}

/**
 * Create a new Praxis application
 */
async function createApp(name: string, options: CreateOptions): Promise<void> {
  const template = options.template || 'basic';
  const appDir = resolve(process.cwd(), name);

  // Check if directory already exists
  if (existsSync(appDir)) {
    console.error(`\n✗ Directory '${name}' already exists`);
    console.error('  Please choose a different name or remove the existing directory.\n');
    process.exit(1);
  }

  console.log(`\n📦 Creating Praxis application: ${name}`);
  console.log(`   Template: ${template}`);
  console.log(`   Location: ${appDir}\n`);

  // Create directory structure
  const dirs = [
    appDir,
    join(appDir, 'src'),
    join(appDir, 'src', 'schemas'),
    join(appDir, 'src', 'components'),
    join(appDir, 'src', 'logic'),
    join(appDir, 'src', 'store'),
    join(appDir, 'public'),
  ];

  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
  }
  console.log('✓ Created directory structure');

  // Write configuration files
  await writeFile(join(appDir, 'package.json'), generatePackageJson(name));
  await writeFile(join(appDir, 'tsconfig.json'), generateTsConfig());
  await writeFile(join(appDir, 'vite.config.ts'), generateViteConfig());
  await writeFile(join(appDir, 'svelte.config.js'), generateSvelteConfig());
  await writeFile(join(appDir, '.gitignore'), generateGitignore());
  await writeFile(join(appDir, 'README.md'), generateReadme(name, template));
  console.log('✓ Created configuration files');

  // Write source files
  await writeFile(join(appDir, 'index.html'), generateIndexHtml(name));
  await writeFile(join(appDir, 'src', 'main.ts'), generateMainTs(name));
  await writeFile(join(appDir, 'src', 'App.svelte'), generateAppSvelte(name));
  await writeFile(join(appDir, 'src', 'schemas', 'app.schema.js'), generateAppSchema(name));
  console.log('✓ Created source files');

  // Create placeholder files for generated directories
  await writeFile(
    join(appDir, 'src', 'components', '.gitkeep'),
    '# Generated components will be placed here\n'
  );
  await writeFile(join(appDir, 'src', 'logic', '.gitkeep'), '# Logic files will be placed here\n');
  await writeFile(join(appDir, 'src', 'store', '.gitkeep'), '# Store files will be placed here\n');
  await writeFile(join(appDir, 'public', '.gitkeep'), '# Static assets go here\n');
  console.log('✓ Created placeholder files');

  console.log(`
✅ Application created successfully!

Next steps:

  cd ${name}
  npm install
  npm run dev

Then open http://localhost:5173 in your browser.

To generate code from your schema:

  npm run generate

For more information, see the README.md in your project.
`);
}

/**
 * Generate component schema content
 */
function generateComponentSchema(name: string): string {
  return `/**
 * ${name} Component Schema
 */

export const componentSchema = {
  name: '${name}',
  type: 'display',
  description: 'A ${name} component',
  
  props: [
    { name: 'title', type: 'string', required: true },
    { name: 'content', type: 'string', required: false }
  ],
  
  events: [
    { name: 'click', description: 'Emitted when clicked' }
  ]
};

export default componentSchema;
`;
}

/**
 * Generate component Svelte content
 */
function generateComponentSvelte(name: string): string {
  return `<script lang="ts">
  /**
   * ${name} Component
   * 
   * Generated by Praxis.
   */
  
  interface Props {
    title: string;
    content?: string;
  }
  
  let { title, content = '' }: Props = $props();
</script>

<div class="${name.toLowerCase()}" role="button" tabindex="0">
  <h3>{title}</h3>
  {#if content}
    <p>{content}</p>
  {/if}
  <slot />
</div>

<style>
  .${name.toLowerCase()} {
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin: 0.5rem 0;
    cursor: pointer;
    transition: box-shadow 0.2s;
  }

  .${name.toLowerCase()}:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  h3 {
    margin: 0 0 0.5rem 0;
    color: #333;
  }

  p {
    margin: 0;
    color: #666;
  }
</style>
`;
}

/**
 * Create a new Praxis component
 */
async function createComponent(name: string, options: CreateOptions): Promise<void> {
  const outputDir = options.directory || join(process.cwd(), 'src', 'components');
  const componentDir = join(outputDir, name);

  // Check if component directory already exists
  if (existsSync(componentDir)) {
    console.error(`\n✗ Component '${name}' already exists at ${componentDir}`);
    console.error('  Please choose a different name or remove the existing component.\n');
    process.exit(1);
  }

  console.log(`\n🧩 Creating component: ${name}`);
  console.log(`   Location: ${componentDir}\n`);

  // Create component directory
  await mkdir(componentDir, { recursive: true });

  // Write component files
  await writeFile(join(componentDir, `${name}.svelte`), generateComponentSvelte(name));
  await writeFile(join(componentDir, `${name}.schema.js`), generateComponentSchema(name));
  await writeFile(
    join(componentDir, 'index.ts'),
    `export { default as ${name} } from './${name}.svelte';\n`
  );

  console.log(`✓ Created ${name}.svelte`);
  console.log(`✓ Created ${name}.schema.js`);
  console.log(`✓ Created index.ts`);

  console.log(`
✅ Component created successfully!

Import it in your application:

  import { ${name} } from './components/${name}';

Or use the schema for generation:

  praxis generate --schema src/components/${name}/${name}.schema.js
`);
}

/**
 * Execute the create command
 */
export async function create(
  type: string,
  name: string | undefined,
  options: CreateOptions
): Promise<void> {
  if (!name) {
    console.error('\n✗ Please provide a name for the ' + type);
    console.error(`  Usage: praxis create ${type} <name>\n`);
    process.exit(1);
  }

  // Validate name
  if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(name)) {
    console.error('\n✗ Invalid name format');
    console.error(
      '  Name must start with a letter and contain only letters, numbers, hyphens, and underscores.\n'
    );
    process.exit(1);
  }

  switch (type) {
    case 'app':
      await createApp(name, options);
      break;
    case 'component':
      await createComponent(name, options);
      break;
    default:
      console.error(`\n✗ Unknown type: ${type}`);
      console.error('  Valid types: app, component\n');
      process.exit(1);
  }
}
