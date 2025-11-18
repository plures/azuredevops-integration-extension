# Azure DevOps Integration - Desktop Application

Cross-platform desktop application built with Tauri and Svelte, leveraging the FSM architecture and webview components from the VS Code extension.

## Overview

This is a MVP (Minimum Viable Product) cross-platform desktop application that brings Azure DevOps work item management, time tracking, and Git integration to Windows, macOS, and Linux as a standalone application.

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

- ✅ **Work Items Management**: View, filter, and manage Azure DevOps work items
- ✅ **Time Tracking**: Start/stop timers for work items
- ✅ **Authentication**: Support for Personal Access Tokens (PAT)
- ✅ **Multiple Connections**: Manage multiple Azure DevOps organizations/projects
- ✅ **Kanban Board**: Visual board view for work items
- ⚠️ **OAuth (Entra ID)**: Planned for future release
- ⚠️ **Git Integration**: Planned for future release

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
