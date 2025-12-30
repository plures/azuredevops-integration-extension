# Praxis CLI Usage

The Praxis CLI provides commands for creating apps, generating code, running development servers, and managing your Praxis projects.

## Installation

### Global Installation

```bash
npm install -g @plures/praxis
```

Verify installation:

```bash
praxis --version
# @plures/praxis v0.2.1
```

### Local Installation

```bash
npm install @plures/praxis
npx praxis --version
```

## Commands

### `praxis create`

Create a new Praxis application or component.

```bash
# Create a new app
praxis create app my-app

# Create with specific template
praxis create app my-app --template fullstack

# Create a component
praxis create component MyComponent

# Create in specific directory
praxis create app my-app --directory ./projects
```

**Options:**

| Option         | Description                                      |
| -------------- | ------------------------------------------------ |
| `--template`   | Template to use: `basic`, `fullstack`, `minimal` |
| `--directory`  | Output directory                                 |
| `--no-git`     | Skip git initialization                          |
| `--no-install` | Skip npm install                                 |

**Available Templates:**

| Template       | Description                                |
| -------------- | ------------------------------------------ |
| `basic`        | Simple app with logic engine and Svelte    |
| `fullstack`    | Complete app with PluresDB, auth, and sync |
| `minimal`      | Bare minimum Praxis setup                  |
| `component`    | Reusable component library                 |
| `orchestrator` | Distributed node orchestration             |

### `praxis generate`

Generate code from a PSF schema.

```bash
# Generate all outputs
praxis generate --schema ./schema.psf.json

# Generate with custom output directory
praxis generate --schema ./schema.psf.json --output ./src/generated

# Generate specific targets only
praxis generate --schema ./schema.psf.json --only types,components

# Watch mode (regenerate on changes)
praxis generate --schema ./schema.psf.json --watch

# Force regeneration (overwrite existing)
praxis generate --schema ./schema.psf.json --force

# Check mode (verify generated files are current)
praxis generate --schema ./schema.psf.json --check
```

**Options:**

| Option     | Description                                                                 |
| ---------- | --------------------------------------------------------------------------- |
| `--schema` | Path to PSF schema file                                                     |
| `--output` | Output directory (default: `./generated`)                                   |
| `--only`   | Comma-separated targets: `types`, `components`, `docs`, `rules`, `pluresdb` |
| `--watch`  | Watch for changes and regenerate                                            |
| `--force`  | Overwrite existing files                                                    |
| `--check`  | Verify files are up-to-date (exit code 1 if not)                            |
| `--format` | Output format: `typescript`, `javascript`                                   |

### `praxis canvas`

Launch CodeCanvas visual editor.

```bash
# Open Canvas with a schema
praxis canvas ./schema.psf.json

# Create new schema in Canvas
praxis canvas --new

# Custom port
praxis canvas ./schema.psf.json --port 4000

# With custom config
praxis canvas ./schema.psf.json --config canvas.config.ts

# View-only mode
praxis canvas ./schema.psf.json --mode view
```

**Options:**

| Option     | Description                      |
| ---------- | -------------------------------- |
| `--port`   | Server port (default: 3000)      |
| `--host`   | Server host (default: localhost) |
| `--config` | Path to canvas config file       |
| `--mode`   | Mode: `edit`, `view`, `present`  |
| `--new`    | Create new schema                |
| `--watch`  | Enable file watching             |

### `praxis dev`

Start development server.

```bash
# Start dev server
praxis dev

# With specific port
praxis dev --port 5173

# Open browser automatically
praxis dev --open
```

**Options:**

| Option     | Description                      |
| ---------- | -------------------------------- |
| `--port`   | Server port (default: 5173)      |
| `--host`   | Server host (default: localhost) |
| `--open`   | Open browser automatically       |
| `--config` | Path to vite config              |

### `praxis build`

Build for production.

```bash
# Build app
praxis build

# Build with specific output
praxis build --output ./dist

# Build for specific target
praxis build --target node
```

**Options:**

| Option     | Description                                  |
| ---------- | -------------------------------------------- |
| `--output` | Output directory                             |
| `--target` | Build target: `browser`, `node`, `tauri`     |
| `--minify` | Minify output (default: true for production) |

### `praxis validate`

Validate a PSF schema.

```bash
# Validate schema
praxis validate --schema ./schema.psf.json

# Verbose output
praxis validate --schema ./schema.psf.json --verbose

# Strict mode (warnings as errors)
praxis validate --schema ./schema.psf.json --strict
```

**Options:**

| Option      | Description                   |
| ----------- | ----------------------------- |
| `--schema`  | Path to PSF schema file       |
| `--verbose` | Show detailed validation info |
| `--strict`  | Treat warnings as errors      |

### `praxis docs`

Generate documentation.

```bash
# Generate docs from schema
praxis docs --schema ./schema.psf.json

# With custom output
praxis docs --schema ./schema.psf.json --output ./docs

# Serve documentation
praxis docs --serve

# Watch and regenerate
praxis docs --schema ./schema.psf.json --watch
```

**Options:**

| Option     | Description                          |
| ---------- | ------------------------------------ |
| `--schema` | Path to PSF schema file              |
| `--output` | Output directory (default: `./docs`) |
| `--format` | Output format: `markdown`, `html`    |
| `--serve`  | Serve docs on local server           |
| `--watch`  | Watch for changes                    |

### Cloud Commands

#### `praxis login`

Authenticate with GitHub.

```bash
praxis login
# Opens browser for GitHub OAuth
```

#### `praxis logout`

Log out from Praxis Cloud.

```bash
praxis logout
```

#### `praxis whoami`

Show current authenticated user.

```bash
praxis whoami
# Logged in as: alice (github:alice)
# Tier: Solo
```

#### `praxis cloud init`

Initialize cloud connection.

```bash
praxis cloud init
# Configures cloud sync for current project
```

#### `praxis cloud status`

Check cloud sync status.

```bash
praxis cloud status
# Status: Connected
# Last sync: 2 minutes ago
# Pending: 0 changes
```

#### `praxis cloud usage`

View usage metrics.

```bash
praxis cloud usage
# Syncs this month: 1,234 / 50,000
# Storage: 45 MB / 1 GB
# Apps: 3 / 10
```

## Configuration

### praxis.config.ts

Create a configuration file in your project root:

```typescript
import type { PraxisConfig } from '@plures/praxis';

export default {
  // Schema settings
  schema: {
    path: './src/schema.psf.json',
    validate: true,
  },

  // Generation settings
  generate: {
    output: './src/generated',
    targets: ['types', 'components', 'docs'],
    format: 'typescript',
    formatting: 'prettier',
  },

  // Development settings
  dev: {
    port: 5173,
    open: true,
  },

  // Canvas settings
  canvas: {
    port: 3000,
    sync: true,
  },

  // Cloud settings
  cloud: {
    enabled: true,
    autoSync: true,
  },
} satisfies PraxisConfig;
```

### Environment Variables

```bash
# Cloud authentication
PRAXIS_AUTH_TOKEN=ghp_xxxxx

# Development
PRAXIS_DEV_PORT=5173
PRAXIS_CANVAS_PORT=3000

# Debugging
PRAXIS_DEBUG=true
PRAXIS_LOG_LEVEL=verbose
```

## Common Workflows

### Starting a New Project

```bash
# 1. Create app
praxis create app my-app
cd my-app

# 2. Design in Canvas (optional)
praxis canvas ./src/schema.psf.json

# 3. Generate code
praxis generate --schema ./src/schema.psf.json

# 4. Start development
praxis dev
```

### Development Cycle

```bash
# Terminal 1: Code generation (watch mode)
praxis generate --schema ./src/schema.psf.json --watch

# Terminal 2: Development server
praxis dev

# Terminal 3: Canvas (optional)
praxis canvas ./src/schema.psf.json
```

### Building for Production

```bash
# 1. Validate schema
praxis validate --schema ./src/schema.psf.json --strict

# 2. Generate production code
praxis generate --schema ./src/schema.psf.json --force

# 3. Build app
praxis build

# 4. Output is in ./dist
```

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - run: npm install

      # Validate schema
      - run: npx praxis validate --schema ./src/schema.psf.json --strict

      # Check generated files are current
      - run: npx praxis generate --schema ./src/schema.psf.json --check

      # Build
      - run: npx praxis build

      # Test
      - run: npm test
```

## Troubleshooting

### Command Not Found

```bash
# If globally installed
npm install -g @plures/praxis

# If using npx
npx praxis --version

# Check installation
which praxis
```

### Schema Validation Errors

```bash
# Get detailed errors
praxis validate --schema ./schema.psf.json --verbose

# Common issues:
# - Missing required fields (id, tag, name)
# - Invalid type definitions
# - Duplicate IDs
# - Invalid JSON syntax
```

### Generation Failures

```bash
# Check for write permissions
ls -la ./src/generated

# Force regeneration
praxis generate --schema ./schema.psf.json --force

# Debug mode
PRAXIS_DEBUG=true praxis generate --schema ./schema.psf.json
```

### Canvas Won't Start

```bash
# Check port availability
lsof -i :3000

# Use different port
praxis canvas ./schema.psf.json --port 4000

# Clear cache
praxis canvas --clear-cache
```

## Getting Help

```bash
# General help
praxis --help

# Command-specific help
praxis create --help
praxis generate --help
praxis canvas --help
```

---

**Next:** [Building Extensions](./building-extensions.md)
