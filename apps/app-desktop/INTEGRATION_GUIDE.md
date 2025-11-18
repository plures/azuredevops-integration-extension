# Cross-Platform Desktop Application Integration Guide

## Overview

This guide documents how the Azure DevOps Integration desktop application (Tauri) integrates with the existing VS Code extension codebase, leveraging shared FSM machines and business logic.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Repository Root                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐                  ┌──────────────────┐  │
│  │   VS Code Ext   │                  │  Desktop App     │  │
│  │   (src/)        │                  │  (apps/app-      │  │
│  │                 │                  │   desktop/)      │  │
│  └────────┬────────┘                  └────────┬─────────┘  │
│           │                                     │            │
│           │          ┌────────────────┐        │            │
│           └─────────►│  Shared Code   │◄───────┘            │
│                      │  (FSM + Logic) │                     │
│                      └────────────────┘                     │
│                                                               │
│  Shared Components:                                          │
│  • src/fsm/machines/     - XState state machines            │
│  • src/fsm/functions/    - Pure business logic              │
│  • src/azureClient.ts    - Azure DevOps API client          │
│  • src/webview/*.svelte  - Svelte UI components (adapted)   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Key Differences: VS Code Extension vs Desktop App

### VS Code Extension

- **Host**: VS Code Extension Host (Node.js)
- **UI**: Webview Panel (sandboxed)
- **IPC**: `vscode.postMessage()` / message handlers
- **Storage**: VS Code SecretStorage API, workspace configuration
- **Dialogs**: VS Code window API
- **Distribution**: VSIX package via VS Code Marketplace

### Desktop App (Tauri)

- **Host**: Tauri (Rust backend)
- **UI**: SvelteKit (SSG) with native window
- **IPC**: Tauri `invoke()` / event system
- **Storage**: Tauri Store plugin (encrypted JSON)
- **Dialogs**: Tauri dialog plugin or custom UI
- **Distribution**: Native installers (MSI, DMG, AppImage, etc.)

## Platform Abstraction Strategy

The desktop app uses a **Platform Adapter** pattern to bridge VS Code APIs to Tauri equivalents.

### Platform Adapter Interface

Located in: `apps/app-desktop/src/lib/platform-adapter.ts`

```typescript
export interface PlatformAdapter {
  // Messaging - replaces vscode.postMessage()
  postMessage(message: any): void;
  onMessage(handler: (message: any) => void): void;

  // Storage - replaces vscode.SecretStorage
  getSecret(key: string): Promise<string | undefined>;
  setSecret(key: string, value: string): Promise<void>;
  deleteSecret(key: string): Promise<void>;

  // Configuration - replaces workspace.getConfiguration()
  getConfiguration<T>(key: string, defaultValue?: T): Promise<T>;
  setConfiguration(key: string, value: any): Promise<void>;

  // Dialogs - replaces vscode.window.*
  showInputBox(options: {...}): Promise<string | undefined>;
  showQuickPick<T>(...): Promise<T | undefined>;
  showInformationMessage(message: string): Promise<void>;
  showErrorMessage(message: string): Promise<void>;

  // File System - replaces vscode.workspace.fs
  fileExists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;

  // External URLs - replaces vscode.env.openExternal()
  openExternal(url: string): Promise<void>;
}
```

### VS Code Compatibility Layer

The platform adapter provides a `createVSCodeCompatibilityAPI()` function that creates a mock `vscode` API object for existing components:

```typescript
const vscodeApi = createVSCodeCompatibilityAPI();
// Makes it available to Svelte components
(window as any).__vscodeApi = vscodeApi;
```

This allows Svelte components from `src/webview/` to work with minimal changes.

## Code Sharing Strategy

### What's Shared (Direct Import)

1. **FSM State Machines** (`src/fsm/machines/`)
   - `applicationMachine.ts` - Main application orchestration
   - `connectionMachine.ts` - Connection management
   - `timerMachine.ts` - Time tracking
   - All business logic flows through FSM for consistency

2. **Pure Business Functions** (`src/fsm/functions/`)
   - Connection normalization
   - Work item transformations
   - Time calculations
   - Authentication helpers
   - All pure functions with no side effects

3. **Azure Client** (`src/azureClient.ts`)
   - HTTP client for Azure DevOps REST API
   - Rate limiting
   - Error handling
   - Shared between both platforms

### What's Adapted (Modified for Desktop)

1. **Svelte Components** (`src/webview/*.svelte`)
   - Copy to `apps/app-desktop/src/lib/components/`
   - Replace `vscode.postMessage()` with platform adapter
   - Remove VS Code-specific styling variables
   - Update imports to use local paths

2. **Extension Activation** (`src/activation.ts`)
   - Not directly shared
   - Desktop app has own initialization in Rust backend
   - Similar flow but adapted to Tauri lifecycle

### What's Desktop-Specific

1. **Tauri Backend** (`src-tauri/`)
   - Rust code for IPC handlers
   - Native system integration
   - Platform-specific features

2. **Platform Adapter** (`src/lib/platform-adapter.ts`)
   - Bridges VS Code → Tauri APIs
   - Desktop-only implementation

3. **Build Configuration**
   - Vite config for SvelteKit
   - Tauri configuration
   - Different bundling strategy than VS Code extension

## Integration Patterns

### Pattern 1: Importing FSM Machines

**Desktop App Usage:**

```typescript
// apps/app-desktop/src/lib/fsm-integration.ts
import { createApplicationMachine } from '../../../src/fsm/machines/applicationMachine.js';
import { getPlatformAdapter } from './platform-adapter';

const adapter = getPlatformAdapter();
const machine = createApplicationMachine({
  // Desktop-specific actors
  storage: {
    getSecret: adapter.getSecret.bind(adapter),
    setSecret: adapter.setSecret.bind(adapter),
  },
  // ... other actors
});
```

### Pattern 2: Adapting Svelte Components

**Original (VS Code):**

```svelte
<script lang="ts">
  const vscode = (window as any).__vscodeApi;

  function sendEvent(event: any) {
    vscode.postMessage({ type: 'fsmEvent', event });
  }
</script>
```

**Adapted (Desktop):**

```svelte
<script lang="ts">
  import { getPlatformAdapter } from '$lib/platform-adapter';

  const adapter = getPlatformAdapter();

  function sendEvent(event: any) {
    adapter.postMessage({ type: 'fsmEvent', event });
  }
</script>
```

### Pattern 3: Using Azure Client

**Both platforms can use the same import:**

```typescript
import { AzureDevOpsIntClient } from '../../../src/azureClient.js';

const client = new AzureDevOpsIntClient({
  organization: 'myorg',
  project: 'myproject',
  pat: await adapter.getSecret('pat-key'),
});
```

## File System Structure

```
azuredevops-integration-extension/
├── src/                          # Shared VS Code extension source
│   ├── fsm/                      # ✅ Shared FSM machines & functions
│   │   ├── machines/             # State machines (100% shared)
│   │   └── functions/            # Pure business logic (100% shared)
│   ├── webview/                  # ⚠️  Svelte components (adapted)
│   ├── azureClient.ts            # ✅ Shared API client
│   ├── activation.ts             # ❌ VS Code-specific
│   └── ...
│
├── apps/app-desktop/             # Desktop application
│   ├── src/
│   │   ├── lib/
│   │   │   ├── platform-adapter.ts      # Platform abstraction
│   │   │   ├── fsm-integration.ts       # FSM setup for desktop
│   │   │   └── components/              # Adapted Svelte components
│   │   └── routes/
│   │       └── +page.svelte             # Main app page
│   ├── src-tauri/                       # Rust backend
│   │   ├── src/
│   │   │   └── lib.rs                   # IPC handlers
│   │   ├── Cargo.toml                   # Rust dependencies
│   │   └── tauri.conf.json              # Tauri config
│   └── package.json
│
└── package.json                  # Root package
```

## Development Workflow

### Initial Setup

```bash
# Install root dependencies (includes VS Code extension deps)
cd /path/to/repo
npm install

# Install desktop app dependencies
cd apps/app-desktop
npm install
```

### Running Desktop App

```bash
cd apps/app-desktop

# Development mode (hot reload)
npm run tauri dev

# Build for production
npm run tauri build

# Type checking
npm run check
```

### Building for Multiple Platforms

Desktop app can be built on each platform:

- **Windows**: Produces `.msi` and `.exe`
- **macOS**: Produces `.dmg` and `.app` bundle
- **Linux**: Produces `.deb`, `.AppImage`, `.rpm`

Cross-compilation is limited; typically build on target platform.

## Testing Strategy

### Unit Tests (Shared Code)

FSM machines and business functions have unit tests in the main repo:

```bash
# Run from root
npm test
```

These tests cover both VS Code extension and desktop app since they share the same business logic.

### Desktop-Specific Tests

```bash
cd apps/app-desktop
npm run check  # Type checking
# Add Vitest or other test framework as needed
```

## Deployment

### VS Code Extension

```bash
# From root
npm run package  # Creates .vsix file
# Publish to VS Code Marketplace
```

### Desktop Application

```bash
# From apps/app-desktop
npm run tauri build

# Output in: src-tauri/target/release/bundle/
# - Windows: .msi in /msi/, .exe in /nsis/
# - macOS: .dmg and .app in /dmg/
# - Linux: .deb, .AppImage in respective folders
```

## Configuration Management

### VS Code Extension

- Settings: `settings.json` via VS Code API
- Secrets: VS Code SecretStorage API
- Workspace-specific configurations

### Desktop App

- Settings: Tauri Store plugin → `config.json`
- Secrets: Tauri Store plugin → encrypted storage
- Application-wide configuration

### Shared Configuration Structure

Both platforms use the same configuration schema defined in FSM context types:

```typescript
interface ConnectionConfig {
  id: string;
  organization: string;
  project: string;
  authMethod: 'pat' | 'entra';
  // ... shared structure
}
```

## Known Limitations & Future Work

### Current MVP Limitations

1. **OAuth/Entra ID**: Desktop app initially supports PAT only
   - Entra ID requires desktop-specific OAuth flow
   - Planned for future release

2. **Git Integration**: Not yet implemented in desktop
   - VS Code uses built-in Git extension
   - Desktop needs native Git integration

3. **System Tray**: Not implemented
   - Planned feature for background operation

4. **Auto-Updates**: Not configured
   - Requires Tauri updater plugin setup

### Extension Points

To add new features that work on both platforms:

1. Implement business logic as pure functions in `src/fsm/functions/`
2. Add state machine transitions in `src/fsm/machines/`
3. Create UI components in Svelte (agnostic to platform)
4. Platform-specific integration happens in:
   - VS Code: `src/activation.ts`
   - Desktop: `apps/app-desktop/src-tauri/src/lib.rs`

## Troubleshooting

### Import Errors

If you see import errors in the desktop app for shared code:

```bash
# Ensure TypeScript can resolve paths
cd apps/app-desktop
npm run check
```

Update `tsconfig.json` paths if needed:

```json
{
  "compilerOptions": {
    "paths": {
      "$lib": ["./src/lib"],
      "$lib/*": ["./src/lib/*"],
      "$fsm/*": ["../../src/fsm/*"]
    }
  }
}
```

### Tauri Plugin Errors

If Tauri plugins fail to initialize, check:

1. `Cargo.toml` includes the plugin dependency
2. `lib.rs` calls `.plugin(...)` initialization
3. `tauri.conf.json` includes required permissions

### Svelte Component Issues

When adapting VS Code components:

1. Replace `vscode.postMessage()` with platform adapter
2. Remove VS Code CSS variables (e.g., `var(--vscode-*)`)
3. Update imports to use SvelteKit aliases (`$lib/...`)

## References

- [Tauri Documentation](https://tauri.app/)
- [SvelteKit Documentation](https://kit.svelte.dev/)
- [XState Documentation](https://xstate.js.org/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- Main repo [FSM Architecture Docs](../../docs/FSM_FIRST_DEVELOPMENT_RULES.md)
