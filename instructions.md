# CLAUDE.md

This file provides guidance to github copilot when working with code in this repository.

## Repository Overview

[EP] is a VS Code extension that integrates Azure DevOps work items, time tracking, and Git workflows directly into the IDE. The extension allows developers to manage tasks, track time, create branches, and submit pull requests without leaving VS Code.

- **Publisher**: Plures, LLC
- **Current Version**: 0.1.1
- **VS Code Engine**: ^1.102.0
- **Repository**: https://github.com/plures/AzureDevOps-Integration-Extension

## Development Commands

### Build & Development
```bash
npm install          # Install dependencies (axios is the main runtime dependency)
npm run compile      # Compile TypeScript and bundle with esbuild
npm run watch        # Watch mode for development (parallel esbuild + tsc watch)
npm run package      # Production build for distribution
npm run lint         # Run ESLint on source files
npm run check-types  # TypeScript type checking without emit
```

### Testing
```bash
npm test            # Run tests (compiles tests, runs lint, then executes)
npm run compile-tests  # Compile tests to out/ directory
npm run watch-tests    # Watch mode for tests
```

### Publishing
```bash
npm run vscode:prepublish  # Pre-publish hook (runs package command)
vsce package              # Package extension as .vsix file
vsce publish              # Publish to VS Code marketplace
```

### Running in Development
1. Open project in VS Code
2. Press `F5` to launch Extension Development Host
3. The extension will be available in the new VS Code window
4. Use `Developer: Reload Window` command after making changes

## Architecture

### Build System
- **esbuild** for fast bundling with custom problem matcher plugin
- Outputs single bundled file to `dist/extension.js`
- Development mode includes sourcemaps, production mode includes minification
- Parallel TypeScript watching in development for type checking

### Single-File Architecture
The entire extension logic resides in `src/extension.ts` (2000+ lines). This monolithic approach includes:
- Azure DevOps API integration with Personal Access Token authentication
- Timer management with inactivity detection and Pomodoro support
- Webview sidebar implementation with Kanban board view
- Git operations for branch creation and pull requests
- Build monitoring with status bar integration
- Analytics tracking (optional)

### Key Components
1. **API Integration**: Uses axios for Azure DevOps REST API calls
2. **Timer System**: 
   - Global timer state with automatic pause on 5-minute inactivity
   - Pomodoro timer support (25-min work, 5-min break cycles)
   - Time entries automatically saved to work items
3. **Webview UI**: 
   - Custom HTML/CSS rendered in VS Code sidebar
   - List and Kanban board views
   - Responsive design with theme support
4. **Git Integration**: 
   - Creates branches with format: `AB#[workItemId]-[sanitized-title]`
   - Automatic work item linking in pull requests

### Data Flow
1. User authenticates with Azure DevOps PAT (stored in VS Code secrets)
2. Extension fetches work items based on configured queries
3. Work items displayed in sidebar with search/filter capabilities
4. Timer tracks time against selected work item
5. Git operations integrate with work item IDs

## Key Implementation Details

### Webview Communication
- Uses `postMessage` API for bidirectional communication
- Commands from webview: selectItem, startTimer, createBranch, updateStatus, etc.
- Updates to webview: itemsUpdated, timerUpdate, statusChanged, error

### Configuration
All settings under `azureDevOps.*` namespace:
- `organization` and `project`: Azure DevOps connection
- `defaultWorkItemType`: Default for new items (Task, Bug, User Story, etc.)
- `defaultQuery`: Initial query (My Work Items, Current Sprint, etc.)
- `timerInactivityTimeout`: Auto-pause after seconds (default: 300)
- `pomodoroEnabled`: Enable Pomodoro timer mode
- `showBuildNotifications`: Build status notifications
- `workItemRefreshInterval`: Auto-refresh interval
- `enableAnalytics`: Usage tracking toggle

### Status Bar Items
- Timer display with elapsed time
- Build status indicator
- Both update in real-time

## Common Development Tasks

### Adding New Commands
1. Add command definition in `package.json` under `contributes.commands`
2. Register command in `activate()` function using `vscode.commands.registerCommand`
3. Implement handler function in extension.ts
4. Add corresponding webview UI elements if needed

### Modifying Webview UI
1. Edit HTML generation in webview provider's `getWebviewContent()` method
2. Update styles in `media/sidebar.css`
3. Add event handlers in webview script section
4. Test both list and Kanban views

### Extending Azure DevOps API Integration
- API calls use axios with PAT in Authorization header
- Base URL pattern: `https://dev.azure.com/{organization}/{project}/_apis/`
- API version: 7.0 for most endpoints
- Handle rate limiting and authentication errors

## Code Style Patterns

### Error Handling
```typescript
try {
    // API call or operation
} catch (error) {
    console.error('Operation failed:', error);
    vscode.window.showErrorMessage(`Azure DevOps: ${error.message}`);
}
```

### Webview Updates
```typescript
if (this._view) {
    this._view.webview.postMessage({
        type: 'messageType',
        data: payload
    });
}
```

### Timer State Management
Timer operations maintain global state with persistence across VS Code sessions. State changes trigger webview updates and status bar refreshes.

## TypeScript Configuration

The project uses TypeScript with strict mode:
- Target: ES2022
- Module: Node16  
- Strict type checking enabled
- Source maps enabled for debugging

## Extension Manifest Features

Key contributions from `package.json`:
- **Activity Bar**: Custom Azure DevOps icon and container
- **Commands**: 25+ commands for comprehensive functionality
- **Views**: Webview-based work items sidebar
- **Configuration**: Extensive user settings
- **Menus**: Context-sensitive command visibility
- **Colors**: Custom timer background color

## Required Permissions for PAT

When creating a Personal Access Token, ensure these scopes:
- **Work Items** (Read & Write)
- **Code** (Read & Write)  
- **Build** (Read)
- **Pull Request** (Read & Write)