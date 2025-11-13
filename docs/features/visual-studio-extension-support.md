# Visual Studio Extension Support - Implementation Plan

## Feature Overview

This feature enables the Azure DevOps Integration extension to support both Visual Studio Code and Visual Studio (VS) using a shared codebase. This will expand the user base to include Visual Studio developers while maintaining a single source of truth for business logic, UI components, and Azure DevOps integration.

## Problem Statement

Currently, the extension only supports Visual Studio Code. Visual Studio developers who want Azure DevOps integration must use separate tools or switch to VS Code. By supporting both platforms from a single codebase, we can:

- Reach a broader developer audience (Visual Studio has significant market share)
- Reduce maintenance overhead by sharing core logic
- Provide consistent user experience across both IDEs
- Leverage existing investment in Azure DevOps integration logic

## Goals & Success Metrics (MoSCoW)

| Priority | Goal | Metric / KPI | Target |
|----------|------|--------------|--------|
| Must | Support Visual Studio extension packaging | VSIX package creation | 100% success rate |
| Must | Share core business logic between platforms | Code reuse percentage | >90% |
| Must | Platform abstraction layer | API compatibility layer | 100% feature parity |
| Should | Support Visual Studio 2022 | VS 2022 compatibility | Full support |
| Should | Unified build pipeline | Build both platforms | Single command |
| Could | Support Visual Studio 2019 | VS 2019 compatibility | Partial support |
| Won't | Visual Studio for Mac support | (Deferred to future) | N/A |

## User Stories & Personas

### Primary Persona: Visual Studio Developer Sarah

```gherkin
As a Visual Studio developer
I want to use the Azure DevOps Integration extension in Visual Studio
So that I can manage work items and track time without switching to VS Code

Given I have Visual Studio 2022 installed
When I install the Azure DevOps Integration extension
Then I can access work items, time tracking, and Git workflows
And the experience is consistent with the VS Code version
```

### Secondary Persona: DevOps Engineer Mike

```gherkin
As a DevOps engineer managing multiple teams
I want the extension to work in both VS Code and Visual Studio
So that I can provide consistent tooling across different developer preferences

Given teams use both VS Code and Visual Studio
When I deploy the Azure DevOps Integration extension
Then it works seamlessly in both IDEs
And configuration is compatible between platforms
```

## Assumptions & Constraints

### Business Assumptions

- Visual Studio developers want similar functionality to VS Code users
- Market demand exists for Visual Studio extension support
- Users are willing to use extensions in Visual Studio
- Visual Studio 2022 is the primary target (VS 2019 support optional)

### Technical Constraints

- **VS Code API vs Visual Studio SDK**: Different APIs require abstraction layer
- **Extension Host Architecture**: VS Code uses Node.js extension host; Visual Studio uses .NET-based host
- **Package Format**: VS Code uses `.vsix` with `package.json`; Visual Studio uses `.vsix` with `source.extension.vsixmanifest`
- **UI Framework**: VS Code uses webviews; Visual Studio supports WPF, WinForms, and webviews
- **Build System**: Must support both platforms without duplicating code
- **TypeScript/JavaScript**: VS Code extensions are TypeScript/JavaScript; Visual Studio extensions are typically C#/.NET

### Dependencies

- Visual Studio SDK (for Visual Studio extension development)
- .NET SDK (if we need .NET interop)
- Shared codebase architecture (abstraction layer)
- Build tooling updates (esbuild + MSBuild or alternative)

## Technical Approach

### Architecture Overview

The solution uses a **platform abstraction layer** pattern to share code between VS Code and Visual Studio:

```
┌─────────────────────────────────────────────────────────┐
│                    Shared Core Logic                     │
│  (Azure DevOps Client, FSM, Business Logic, UI)         │
└─────────────────────────────────────────────────────────┘
                        ↕
┌──────────────────────────┐    ┌──────────────────────────┐
│   VS Code Adapter        │    │  Visual Studio Adapter   │
│   (vscode API wrapper)   │    │  (VS SDK wrapper)        │
└──────────────────────────┘    └──────────────────────────┘
                        ↕
┌──────────────────────────┐    ┌──────────────────────────┐
│   VS Code Extension      │    │  Visual Studio Extension │
│   (package.json)         │    │  (source.extension.      │
│   dist/extension.cjs     │    │   vsixmanifest)          │
└──────────────────────────┘    └──────────────────────────┘
```

### Platform Differences

| Aspect | VS Code | Visual Studio |
|--------|---------|---------------|
| **Extension Host** | Node.js | .NET (C#) |
| **API** | `vscode` module | Visual Studio SDK (C#) |
| **Package Format** | `package.json` + `.vsix` | `source.extension.vsixmanifest` + `.vsix` |
| **UI Framework** | Webviews (HTML/CSS/JS) | WPF/WinForms/Webviews |
| **Language** | TypeScript/JavaScript | C#/.NET |
| **Build Tool** | esbuild/webpack | MSBuild |
| **Activation** | `activate()` function | `Package` class with `Initialize()` |

### Solution Strategy

**Option 1: TypeScript/JavaScript Only (Recommended)**
- Use Visual Studio's support for JavaScript/TypeScript extensions
- Leverage Visual Studio's webview support (similar to VS Code)
- Minimal changes to existing codebase
- **Pros**: Maximum code reuse, familiar tooling
- **Cons**: May have limitations with VS-specific features

**Option 2: Hybrid Approach**
- Core logic in TypeScript/JavaScript (shared)
- Platform adapters in respective languages (TypeScript for VS Code, C# for VS)
- **Pros**: Full access to platform-specific features
- **Cons**: More complex, requires C# development

**Option 3: Web-Based Extension**
- Package as web-based extension that works in both
- **Pros**: Single codebase, maximum compatibility
- **Cons**: Limited platform-specific features, may not feel native

**Recommended: Option 1** - Use TypeScript/JavaScript with platform abstraction layer.

### Implementation Phases

#### Phase 1: Platform Abstraction Layer (Foundation)

**1.1 Create Platform Adapter Interface**

```typescript
// src/platform/PlatformAdapter.ts
export interface PlatformAdapter {
  // Extension lifecycle
  activate(context: ExtensionContext): Promise<void>;
  deactivate(): Promise<void>;
  
  // Commands
  registerCommand(command: string, callback: (...args: any[]) => any): void;
  
  // UI
  createWebviewPanel(id: string, title: string, viewColumn: ViewColumn): WebviewPanel;
  createOutputChannel(name: string): OutputChannel;
  
  // Storage
  getWorkspaceState(): Memento;
  getGlobalState(): Memento;
  
  // Secrets
  getSecret(key: string): Promise<string | undefined>;
  setSecret(key: string, value: string): Promise<void>;
  deleteSecret(key: string): Promise<void>;
  
  // File system
  workspaceFolders(): WorkspaceFolder[] | undefined;
  
  // Window
  showInformationMessage(message: string, ...items: string[]): Thenable<string | undefined>;
  showErrorMessage(message: string, ...items: string[]): Thenable<string | undefined>;
  showWarningMessage(message: string, ...items: string[]): Thenable<string | undefined>;
}
```

**1.2 Implement VS Code Adapter**

```typescript
// src/platform/vscode/VSCodeAdapter.ts
import * as vscode from 'vscode';
import { PlatformAdapter } from '../PlatformAdapter.js';

export class VSCodeAdapter implements PlatformAdapter {
  constructor(private context: vscode.ExtensionContext) {}
  
  async activate(context: ExtensionContext): Promise<void> {
    // VS Code activation logic
  }
  
  registerCommand(command: string, callback: (...args: any[]) => any): void {
    this.context.subscriptions.push(
      vscode.commands.registerCommand(command, callback)
    );
  }
  
  // ... implement all interface methods using vscode API
}
```

**1.3 Implement Visual Studio Adapter**

```typescript
// src/platform/visualstudio/VisualStudioAdapter.ts
import { PlatformAdapter } from '../PlatformAdapter.js';
// Visual Studio JavaScript API imports (when available)

export class VisualStudioAdapter implements PlatformAdapter {
  constructor(private context: VisualStudioExtensionContext) {}
  
  async activate(context: ExtensionContext): Promise<void> {
    // Visual Studio activation logic
  }
  
  registerCommand(command: string, callback: (...args: any[]) => any): void {
    // Visual Studio command registration
  }
  
  // ... implement all interface methods using VS SDK
}
```

**1.4 Platform Detection**

```typescript
// src/platform/detect.ts
export function detectPlatform(): 'vscode' | 'visualstudio' {
  // Detect based on available APIs
  if (typeof require !== 'undefined' && require('vscode')) {
    return 'vscode';
  }
  // Check for Visual Studio APIs
  if (typeof window !== 'undefined' && (window as any).VisualStudio) {
    return 'visualstudio';
  }
  throw new Error('Unknown platform');
}

export function createPlatformAdapter(context: any): PlatformAdapter {
  const platform = detectPlatform();
  switch (platform) {
    case 'vscode':
      return new VSCodeAdapter(context);
    case 'visualstudio':
      return new VisualStudioAdapter(context);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
```

#### Phase 2: Refactor Activation Layer

**2.1 Update activation.ts**

```typescript
// src/activation.ts
import { createPlatformAdapter } from './platform/detect.js';

export async function activate(context: any): Promise<void> {
  const adapter = createPlatformAdapter(context);
  
  // Use adapter instead of direct vscode API calls
  await initializeExtension(adapter);
  
  // Store adapter for use throughout extension
  setPlatformAdapter(adapter);
}
```

**2.2 Update All Direct API Calls**

- Replace `vscode.commands.registerCommand` → `adapter.registerCommand`
- Replace `vscode.window.createWebviewPanel` → `adapter.createWebviewPanel`
- Replace `vscode.window.showInformationMessage` → `adapter.showInformationMessage`
- Replace `context.workspaceState` → `adapter.getWorkspaceState()`
- Replace `context.secrets` → `adapter.getSecret()/setSecret()`

#### Phase 3: Build System Updates

**3.1 Update esbuild.mjs for Multi-Platform**

```javascript
// esbuild.mjs
async function buildExtension(platform) {
  const entryPoint = platform === 'vscode' 
    ? 'src/activation.ts'
    : 'src/visualstudio/activation.ts';
    
  const outfile = platform === 'vscode'
    ? 'dist/extension.cjs'
    : 'dist/visualstudio/extension.js';
    
  await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'node',
    target: ['node20'],
    external: platform === 'vscode' ? ['vscode'] : ['visualstudio'],
    outfile: outfile,
    // ... rest of config
  });
}
```

**3.2 Create Visual Studio Package Structure**

```
visualstudio/
├── source.extension.vsixmanifest  # VS extension manifest
├── package.json                    # VS Code-compatible manifest (if needed)
├── dist/
│   └── extension.js                # Built extension code
└── README.md
```

**3.3 Update package.json Scripts**

```json
{
  "scripts": {
    "build": "node esbuild.mjs",
    "build:vscode": "node esbuild.mjs --platform vscode",
    "build:visualstudio": "node esbuild.mjs --platform visualstudio",
    "build:all": "npm run build:vscode && npm run build:visualstudio",
    "package:vscode": "vsce package",
    "package:visualstudio": "node scripts/package-vs.mjs",
    "package:all": "npm run package:vscode && npm run package:visualstudio"
  }
}
```

#### Phase 4: Visual Studio Manifest

**4.1 Create source.extension.vsixmanifest**

```xml
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" 
                xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" 
                xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" 
              Id="azuredevops-integration-extension" 
              Version="2.2.3" 
              Publisher="PluresLLC"/>
    <DisplayName>Azure DevOps Integration</DisplayName>
    <Description>Integrate Azure DevOps work items, time tracking, and Git workflows directly in Visual Studio.</Description>
    <Tags>azure, devops, work items, time tracking, git, integration</Tags>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Community" Version="[17.0,18.0)" />
    <InstallationTarget Id="Microsoft.VisualStudio.Professional" Version="[17.0,18.0)" />
    <InstallationTarget Id="Microsoft.VisualStudio.Enterprise" Version="[17.0,18.0)" />
  </Installation>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.JavaScript" 
           d:Source="File" 
           Path="dist/extension.js" 
           AssemblyName="azuredevops-integration-extension" />
  </Assets>
  <Prerequisites>
    <Prerequisite Id="Microsoft.VisualStudio.Component.CoreEditor" Version="[17.0,18.0)" DisplayName="Visual Studio core editor" />
  </Prerequisites>
</PackageManifest>
```

#### Phase 5: Testing Strategy

**5.1 Platform-Specific Tests**

```typescript
// tests/platform/vscode-adapter.test.ts
describe('VSCodeAdapter', () => {
  it('should register commands', () => {
    // Test VS Code adapter
  });
});

// tests/platform/visualstudio-adapter.test.ts
describe('VisualStudioAdapter', () => {
  it('should register commands', () => {
    // Test Visual Studio adapter
  });
});
```

**5.2 Integration Tests**

- Test activation flow for both platforms
- Test command registration for both platforms
- Test webview creation for both platforms
- Test storage/secret APIs for both platforms

#### Phase 6: Documentation & Publishing

**6.1 Update Documentation**

- Add Visual Studio installation instructions
- Document platform differences (if any)
- Update README with Visual Studio support
- Create Visual Studio-specific troubleshooting guide

**6.2 Publishing Strategy**

- **VS Code Marketplace**: Continue using existing `vsce publish` workflow
- **Visual Studio Marketplace**: Create new publishing workflow
  - Package VSIX with Visual Studio manifest
  - Upload to Visual Studio Marketplace
  - Maintain separate versioning (or unified versioning)

## Security Considerations

### Access Control

- Respect platform-specific permission models
- Visual Studio may have different security contexts than VS Code
- Ensure secrets storage works correctly on both platforms

### Data Protection

- PAT storage must work identically on both platforms
- Entra ID authentication flow must be compatible
- Audit logging should work on both platforms

### Compliance

- Both extensions must comply with marketplace policies
- Privacy policies must be consistent
- Telemetry collection must respect user preferences on both platforms

## Testing Strategy

### Testing Layers

* **Unit**: Platform adapters, abstraction layer (>90% coverage)
* **Integration**: Activation flow, command registration, webview creation
* **E2E**: Complete user workflows on both platforms
* **Platform-Specific**: VS Code and Visual Studio specific features
* **Cross-Platform**: Shared functionality works identically

### Test Cases

* Successful activation on both platforms
* Command registration on both platforms
* Webview creation and communication
* Storage/secret APIs
* Error handling and recovery
* Performance benchmarks (activation time, memory usage)

## Release Strategy

### Deployment Phases

1. **Alpha**: Internal testing with Visual Studio 2022 (2 weeks)
2. **Beta**: Limited user group (50 users, 2 weeks)
3. **Gradual Rollout**: 25% → 50% → 100% over 2 weeks

### Monitoring

* Activation success rate by platform
* Performance metrics (activation time, memory usage)
* Error rates by platform
* User feedback and support tickets

### Rollback Plan

* Feature flags for platform detection
* Ability to disable Visual Studio support if issues arise
* Separate versioning allows independent rollback

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create `PlatformAdapter` interface
- [ ] Implement `VSCodeAdapter` (wrap existing vscode API calls)
- [ ] Implement `VisualStudioAdapter` (stub initially)
- [ ] Create platform detection utility
- [ ] Add platform abstraction tests

### Phase 2: Refactoring
- [ ] Update `activation.ts` to use adapter
- [ ] Refactor command registration to use adapter
- [ ] Refactor webview creation to use adapter
- [ ] Refactor storage/secret APIs to use adapter
- [ ] Update all direct API calls throughout codebase

### Phase 3: Build System
- [ ] Update `esbuild.mjs` for multi-platform builds
- [ ] Create Visual Studio package structure
- [ ] Add build scripts for both platforms
- [ ] Create VSIX packaging script for Visual Studio

### Phase 4: Visual Studio Integration
- [ ] Create `source.extension.vsixmanifest`
- [ ] Implement Visual Studio activation entrypoint
- [ ] Test Visual Studio extension loading
- [ ] Verify webview support in Visual Studio

### Phase 5: Testing
- [ ] Write platform adapter unit tests
- [ ] Write integration tests for both platforms
- [ ] Test activation flow on both platforms
- [ ] Test complete user workflows

### Phase 6: Documentation & Release
- [ ] Update README with Visual Studio support
- [ ] Create Visual Studio installation guide
- [ ] Update CHANGELOG
- [ ] Create Visual Studio marketplace listing
- [ ] Set up Visual Studio publishing workflow

## Risk Mitigation

### High-Risk Areas

1. **API Compatibility**: Visual Studio JavaScript API may differ significantly from VS Code
   - **Mitigation**: Create comprehensive abstraction layer, test early and often

2. **Webview Differences**: Visual Studio webviews may behave differently
   - **Mitigation**: Test webview functionality thoroughly, have fallback UI options

3. **Build Complexity**: Supporting two platforms may complicate build process
   - **Mitigation**: Use feature flags, maintain separate build configs

4. **Maintenance Overhead**: Two platforms to support and test
   - **Mitigation**: Maximize code reuse, automated testing, clear separation of concerns

## Success Criteria

### Technical Metrics

- Code reuse: >90% shared between platforms
- Build success rate: 100% for both platforms
- Test coverage: >90% for platform adapters
- Activation time: <100ms on both platforms

### User Metrics

- Visual Studio extension installs: >100 in first month
- User satisfaction: >4.0/5 on Visual Studio Marketplace
- Support tickets: <10/month related to Visual Studio support
- Feature parity: 100% core features available on both platforms

## Timeline Estimates

### Phase 1: Foundation (1-2 weeks)
- Platform abstraction layer: 1 week
- VS Code adapter implementation: 3 days
- Visual Studio adapter stub: 2 days

### Phase 2: Refactoring (2-3 weeks)
- Activation layer refactor: 1 week
- Command registration refactor: 3 days
- Webview refactor: 3 days
- Storage/secret refactor: 2 days
- Testing and fixes: 1 week

### Phase 3: Build System (1 week)
- Build script updates: 3 days
- Packaging scripts: 2 days
- Testing: 2 days

### Phase 4: Visual Studio Integration (1-2 weeks)
- Manifest creation: 1 day
- Activation entrypoint: 2 days
- Testing and debugging: 1 week

### Phase 5: Testing (1-2 weeks)
- Unit tests: 3 days
- Integration tests: 3 days
- E2E tests: 3 days
- Bug fixes: 3 days

### Phase 6: Documentation & Release (1 week)
- Documentation: 2 days
- Marketplace setup: 2 days
- Release preparation: 1 day
- Monitoring setup: 2 days

**Total Estimated Time: 7-11 weeks**

## Next Steps

1. **Research Visual Studio JavaScript Extension API**
   - Verify Visual Studio 2022 supports JavaScript/TypeScript extensions
   - Document API differences from VS Code
   - Identify any limitations or gotchas

2. **Create Proof of Concept**
   - Build minimal Visual Studio extension
   - Test webview support
   - Verify command registration works
   - Test storage/secret APIs

3. **Get Stakeholder Approval**
   - Review implementation plan
   - Confirm timeline and resources
   - Get approval to proceed

4. **Begin Phase 1 Implementation**
   - Start with platform abstraction layer
   - Implement VS Code adapter first (low risk)
   - Create Visual Studio adapter stub

## References

- [Visual Studio Extension Development](https://docs.microsoft.com/en-us/visualstudio/extensibility/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [VSIX Manifest Schema](https://docs.microsoft.com/en-us/visualstudio/extensibility/vsix-manifest-schema-reference)
- [Visual Studio Marketplace](https://marketplace.visualstudio.com/)

