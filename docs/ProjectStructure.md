# Project Structure

## Overview

This document defines the project structure for the Azure DevOps Integration Extension, following VSCode extension best practices and the established architecture patterns.

## Root Directory Structure

```
azuredevops-integration-extension/
├── .cursor/                    # Cursor IDE configuration
│   └── rules/                  # Workspace rules and templates
├── .github/                    # GitHub workflows and templates
├── .vscode/                    # VS Code workspace configuration
├── apps/                       # Application packages
│   ├── app-mobile/            # Mobile app (future)
│   └── app-web/               # Web app (future)
├── docs/                       # Documentation
├── images/                     # Screenshots and media
├── media/                      # Extension media assets
│   ├── generated-icons/        # Auto-generated icons
│   ├── webview/               # Webview assets
│   └── *.png, *.svg           # Icon files
├── mcp-server/                 # Model Context Protocol server
├── packages/                   # Shared packages
│   ├── core/                  # Core business logic
│   └── ui-web/                # Web UI components
├── scripts/                    # Build and utility scripts
├── src/                        # Main extension source code
├── tests/                      # Test files
├── vscode-stub/               # VS Code API stubs for testing
├── *.json                     # Configuration files
├── *.md                       # Documentation files
└── *.txt                      # License and notice files
```

## Source Code Structure (`src/`)

### Main Extension Files

```
src/
├── activation.ts              # Main extension activation entrypoint
├── azureClient.ts             # Azure DevOps API client
├── gitUtils.ts                # Git integration utilities
├── logging.ts                 # Logging utilities
├── provider.ts                # Data provider for work items
├── rateLimiter.ts             # API rate limiting
├── sessionTelemetry.ts        # Telemetry and analytics
├── telemetryDatabase.ts       # Telemetry data storage
├── timer.ts                   # Time tracking functionality
├── types.d.ts                 # TypeScript type definitions
├── types-sqljs.d.ts          # SQL.js type definitions
├── webviewMessaging.ts        # Webview communication
├── workItemNormalize.ts       # Work item data normalization
└── webview/                   # Webview implementation
    ├── App.svelte            # Main Svelte application
    ├── Toasts.svelte         # Toast notification component
    ├── toastStore.ts         # Toast state management
    ├── index.html            # Webview HTML template
    ├── main.ts               # Legacy webview entrypoint
    └── svelte-main.ts        # Svelte webview entrypoint
```

### Legacy Files (To Be Removed)

```
src/
├── azureClient.js             # Legacy JS version
├── provider.js                # Legacy JS version
├── timer.js                   # Legacy JS version
└── README_TS.md              # Legacy documentation
```

## Package Structure (`packages/`)

### Core Package (`packages/core/`)

```
packages/core/
├── src/
│   ├── adapters/
│   │   └── ado.ts            # Azure DevOps adapter
│   ├── events.ts             # Event system
│   ├── index.ts              # Package exports
│   ├── memoryRepo.ts         # In-memory repository
│   ├── repository.ts         # Repository interface
│   ├── sync.ts               # Data synchronization
│   └── types.ts              # Core types
├── package.json
├── README.md
└── tsconfig.json
```

### UI Web Package (`packages/ui-web/`)

```
packages/ui-web/
├── src/
│   └── stores.ts             # Shared UI state stores
├── package.json
├── README.md
└── tsconfig.json
```

## Test Structure (`tests/`)

### Unit Tests

```
tests/
├── activation.*.test.ts       # Activation tests
├── azureClient.*.test.ts      # Azure client tests
├── gitUtils.test.ts           # Git utilities tests
├── provider.*.test.ts         # Provider tests
├── rateLimiter.*.test.ts      # Rate limiter tests
├── sessionTelemetry.*.test.ts # Telemetry tests
├── timer.*.test.ts            # Timer tests
├── ui-reactivity.test.ts      # UI reactivity tests
├── workItemNormalize.test.ts  # Work item normalization tests
└── helpers/
    └── mockContext.ts         # Test helper utilities
```

### Integration Tests

```
tests/
├── integration/               # VS Code integration tests
│   ├── extension-tests.js
│   ├── README.md
│   └── webview-roundtrip.test.ts
└── integration-tests/         # E2E integration tests
    ├── activate-only.test.ts
    ├── index.ts
    ├── tsconfig.json
    └── webview.test.ts
```

## Media Assets (`media/`)

### Icons and Images

```
media/
├── icon.png                   # Extension icon
├── workitems-icon.svg         # Work items icon
├── generated-icons/           # Auto-generated icon sizes
│   ├── workitems-icon-16.png
│   ├── workitems-icon-32.png
│   ├── workitems-icon-48.png
│   ├── workitems-icon-64.png
│   ├── workitems-icon-128.png
│   └── workitems-icon-256.png
└── webview/                   # Webview assets
    ├── index.html
    ├── main.js
    ├── main.js.map
    ├── svelte-main.css
    ├── svelte-main.css.map
    ├── svelte-main.js
    ├── svelte-main.js.map
    └── svelte.html
```

## Scripts (`scripts/`)

### Build and Development

```
scripts/
├── capture-screenshots.mjs    # Screenshot generation
├── dev-cli.js                 # Development CLI
├── diagnose-handles.mjs       # Memory leak diagnosis
├── fix-missing-release.sh     # Release fix script
├── fix-missing-tags.sh        # Tag fix script
├── generate-icons.mjs         # Icon generation
├── release-check.js           # Release validation
├── run-esm-tests-cmd.mjs      # ESM test runner
├── run-esm-tests.mjs          # Test execution
├── run-integration.mjs        # Integration test runner
├── select-tests.js            # Test selection
├── update-changelog.js        # Changelog updater
├── watch-screenshots.mjs      # Screenshot watcher
└── screenshots/               # Screenshot automation
    ├── generate-sample-data.mjs
    ├── generate-screenshots.mjs
    └── sample-data.json
```

## Configuration Files

### TypeScript Configuration

```
tsconfig.json                  # Root TypeScript config
src/tsconfig.json             # Source-specific config
tests/integration-tests/tsconfig.json # Integration test config
packages/*/tsconfig.json       # Package-specific configs
```

### Build Configuration

```
esbuild.mjs                    # ESBuild configuration
eslint.config.js               # ESLint configuration
commitlint.config.js           # Commit linting
commitlint.config.mjs          # ESM commit linting
package.json                   # Package configuration
```

### VS Code Configuration

```
.vscode/
├── launch.json               # Debug configurations
├── settings.json             # Workspace settings
├── tasks.json                # Build tasks
└── extensions.json           # Recommended extensions
```

## Documentation Structure (`docs/`)

```
docs/
├── ARCHITECTURE.md            # Technical architecture
├── BRANCH_PROTECTION.md       # Git branch protection
├── DEV_CLI.md                # Development CLI usage
├── DEV_POLICY.md             # Development policies
├── LOCAL_FIRST_ARCHITECTURE.md # Local-first design
├── MISSING_RELEASE_FIX.md    # Release troubleshooting
├── RELEASE_NOTES_1_0_0.md    # Release notes
├── SVELTE_UI_PLAN.md         # Svelte UI planning
└── WORKFLOW_IMPROVEMENTS.md  # Workflow enhancements
```

## MCP Server Structure (`mcp-server/`)

```
mcp-server/
├── src/
│   └── server.ts             # MCP server implementation
├── package.json
├── README.md
└── tsconfig.json
```

## File Naming Conventions

### TypeScript Files

- **Classes**: PascalCase (e.g., `AzureDevOpsClient.ts`)
- **Utilities**: camelCase (e.g., `gitUtils.ts`)
- **Types**: camelCase with `.d.ts` extension (e.g., `types.d.ts`)
- **Tests**: Same as source with `.test.ts` suffix (e.g., `azureClient.test.ts`)

### Configuration Files

- **JSON**: kebab-case (e.g., `tsconfig.json`)
- **JavaScript/TypeScript**: camelCase (e.g., `esbuild.mjs`)
- **Shell Scripts**: kebab-case (e.g., `fix-missing-release.sh`)

### Documentation Files

- **Markdown**: UPPER_CASE (e.g., `README.md`, `ARCHITECTURE.md`)
- **Images**: kebab-case (e.g., `work-items-list.png`)

## Import/Export Patterns

### ESM Imports

```typescript
// External dependencies
import { ExtensionContext } from 'vscode';
import axios from 'axios';

// Internal modules (relative imports)
import { AzureDevOpsClient } from './azureClient.js';
import { WorkItem } from './types.js';

// Package imports
import { EventBus } from '@azuredevops/core';
```

### Package Exports

```typescript
// packages/core/src/index.ts
export { EventBus } from './events.js';
export { MemoryRepository } from './memoryRepo.js';
export { Repository } from './repository.js';
export type { WorkItem, WorkItemType } from './types.js';
```

## Directory Responsibilities

### `src/` - Main Extension Code

- Extension activation and lifecycle
- Azure DevOps API integration
- VS Code API integration
- Core business logic

### `packages/` - Shared Libraries

- Reusable business logic
- Shared UI components
- Common utilities
- Type definitions

### `tests/` - Test Suite

- Unit tests for all modules
- Integration tests for workflows
- E2E tests for user journeys
- Test utilities and mocks

### `scripts/` - Build and Utilities

- Build automation
- Development tools
- Release automation
- Maintenance scripts

### `media/` - Assets

- Extension icons and images
- Webview assets
- Screenshots and documentation images

### `docs/` - Documentation

- Technical documentation
- Development guides
- Architecture decisions
- Troubleshooting guides

## Dependencies and Relationships

### Core Dependencies

- `src/activation.ts` → All other source files
- `src/azureClient.ts` → `src/types.d.ts`
- `src/webview/` → `packages/ui-web/`
- `tests/` → `src/` (imports source code)

### Package Dependencies

- `packages/core/` → No internal dependencies
- `packages/ui-web/` → `packages/core/`
- `src/` → `packages/core/` and `packages/ui-web/`

### Build Dependencies

- `esbuild.mjs` → `src/` and `packages/`
- `scripts/` → `src/` and `tests/`
- `media/webview/` → `src/webview/`

This structure follows VSCode extension best practices and supports the project's ESM-first architecture while maintaining clear separation of concerns and modularity.
