# Azure DevOps Integration - Desktop Application

Cross-platform desktop application built with Tauri and Svelte, leveraging the FSM architecture and business logic from the VS Code extension.

## Current Status 🚀

**Phase 1: MVP Foundation - ✅ COMPLETE**

The desktop application has a fully functional UI with all major components implemented:

- ✅ Multi-connection management interface
- ✅ Work item list view with cards
- ✅ Connection settings and configuration
- ✅ Secure PAT token storage (Tauri Store)
- ✅ Rust backend with IPC commands
- ✅ Platform adapter for VS Code API compatibility
- ✅ TypeScript type safety throughout
- ✅ Dark mode support

**Phase 2: API Integration - ⏳ IN PROGRESS**

Next steps involve integrating the Azure DevOps API:

- ⏳ Connect to Azure DevOps API via client library
- ⏳ Fetch and display real work items
- ⏳ Implement search and filtering
- ⏳ Add work item editing capabilities

See [STATUS.md](./STATUS.md) for detailed implementation status and roadmap.

## Overview

This is a cross-platform desktop application that brings Azure DevOps work item management, time tracking, and Git integration to Windows, macOS, and Linux as a standalone application.

## Architecture

### Technology Stack

- **Frontend**: Svelte 5 + SvelteKit (SSG)
- **Backend**: Tauri 2.x (Rust)
- **State Management**: XState 5 FSM machines (shared with VS Code extension)
- **Styling**: Custom theme adapted from VS Code variables

### Code Sharing

The desktop app reuses core components from the parent VS Code extension:

- `../../src/fsm/` - XState state machines and business logic
- `../../src/azureClient.ts` - Azure DevOps API client
- Svelte components (adapted from `../../src/webview/`)

### Platform Abstraction

The `src/lib/platform-adapter.ts` module provides a compatibility layer that:

- Replaces `vscode.postMessage()` with Tauri IPC (`invoke()`)
- Replaces `vscode.SecretStorage` with Tauri Store plugin
- Replaces VS Code dialogs with Tauri dialog plugin
- Provides file system access via Tauri FS plugin

## Features

### Currently Implemented ✅

- ✅ **Connection Management**: Configure multiple Azure DevOps organizations/projects
- ✅ **Settings Interface**: Easy setup wizard for connections
- ✅ **PAT Authentication**: Secure Personal Access Token storage
- ✅ **Multi-Connection Tabs**: Switch between multiple connections
- ✅ **Work Item List View**: Grid layout with work item cards
- ✅ **UI Components**: Header, search, settings, and navigation
- ✅ **Dark Mode**: Automatic theme based on system preference
- ✅ **Cross-Platform**: Runs on Windows, macOS, and Linux

### In Progress ⏳

- ⏳ **Azure DevOps API Integration**: Fetching real work items
- ⏳ **Work Item Filtering**: Search and filter capabilities
- ⏳ **FSM State Management**: Full XState integration

### Planned Features 📋

- 📋 **Kanban Board View**: Visual board layout
- 📋 **Time Tracking**: Start/stop timers for work items
- 📋 **OAuth (Entra ID)**: Microsoft account authentication
- 📋 **Git Integration**: Create branches and PRs
- 📋 **Work Item Editing**: In-app editing capabilities
- 📋 **Bulk Operations**: Mass updates and assignments
- 📋 **System Tray**: Background operation with tray icon
- 📋 **Notifications**: Native desktop notifications

## Development

### Prerequisites

- Node.js 20+ (with npm)
- Rust (latest stable)
- Platform-specific dependencies: See [Tauri Prerequisites](https://tauri.app/start/prerequisites/)

### Install Dependencies

```bash
npm install
```

### Development Mode

```bash
npm run tauri dev
```

### Build for Production

```bash
npm run tauri build
```

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer).
