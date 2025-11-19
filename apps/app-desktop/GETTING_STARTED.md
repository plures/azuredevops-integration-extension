# Getting Started with the Desktop App

## Quick Start

### Prerequisites

1. **Node.js** (v20 or higher)

   ```bash
   node --version  # Should be 20.x or higher
   ```

2. **Rust** (latest stable)

   ```bash
   rustc --version  # Should be 1.70 or higher
   ```

3. **Platform-specific dependencies**:

   **Linux (Ubuntu/Debian):**

   ```bash
   sudo apt update
   sudo apt install libwebkit2gtk-4.1-dev \
     build-essential \
     curl \
     wget \
     file \
     libxdo-dev \
     libssl-dev \
     libayatana-appindicator3-dev \
     librsvg2-dev
   ```

   **macOS:**

   ```bash
   # Install Xcode Command Line Tools
   xcode-select --install
   ```

   **Windows:**
   - Install Microsoft C++ Build Tools via Visual Studio Installer
   - Install WebView2 (usually pre-installed on Windows 10/11)

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/plures/azuredevops-integration-extension.git
   cd azuredevops-integration-extension
   ```

2. **Install root dependencies**:

   ```bash
   npm install
   ```

3. **Navigate to desktop app**:

   ```bash
   cd apps/app-desktop
   ```

4. **Install desktop app dependencies**:
   ```bash
   npm install
   ```

### Running in Development Mode

```bash
# From apps/app-desktop directory
npm run tauri dev
```

This will:

- Start the Vite dev server
- Launch the Tauri application window
- Enable hot module reloading for frontend changes
- Show console output for both frontend and Rust backend

### Building for Production

```bash
# From apps/app-desktop directory
npm run tauri build
```

Build output will be in `src-tauri/target/release/bundle/`:

- **Windows**: `.msi` installer in `/msi/` folder
- **macOS**: `.dmg` in `/dmg/` folder, `.app` bundle in `/macos/`
- **Linux**: `.deb` in `/deb/`, `.AppImage` in `/appimage/`

## First Run Experience

When you first run the app, you'll see a welcome screen with:

- Brief introduction to the application
- Next steps for configuration

### Configuring Azure DevOps Connection

1. Click on "Configure Azure DevOps connection" (TODO: to be implemented)
2. Choose authentication method:
   - **Personal Access Token (PAT)** - Paste your Azure DevOps PAT
   - **OAuth (Entra ID)** - Sign in with Microsoft account (planned)

3. Enter your organization and project details

### Managing PAT Tokens

PATs are stored securely using Tauri's Store plugin with encryption.

**To create a PAT**:

1. Go to Azure DevOps → User Settings → Personal Access Tokens
2. Create new token with scopes:
   - Work Items (Read & Write)
   - Code (Read & Write) - for Git features
   - Build (Read) - for build status
3. Copy the token and paste it into the app

## Development Workflow

### Project Structure

```
apps/app-desktop/
├── src/
│   ├── lib/
│   │   ├── platform-adapter.ts    # Platform abstraction layer
│   │   ├── fsm-integration.ts     # FSM manager for desktop
│   │   └── components/            # Svelte components (to be added)
│   └── routes/
│       └── +page.svelte           # Main application page
├── src-tauri/
│   ├── src/
│   │   └── lib.rs                 # Rust IPC handlers
│   └── tauri.conf.json            # Tauri configuration
└── package.json
```

### Making Changes

#### Frontend (Svelte/TypeScript)

1. Edit files in `src/`
2. Changes hot-reload automatically in dev mode
3. Run type checking: `npm run check`

#### Backend (Rust)

1. Edit files in `src-tauri/src/`
2. Application automatically rebuilds and restarts
3. Check Rust compilation: `cd src-tauri && cargo check`

### Importing Shared Code

The desktop app reuses code from the parent repository:

```typescript
// Import FSM machines
import { createApplicationMachine } from '../../../src/fsm/machines/applicationMachine.js';

// Import business logic
import { normalizeConnections } from '../../../src/fsm/functions/activation/connectionNormalization.js';

// Import Azure client
import { AzureDevOpsIntClient } from '../../../src/azureClient.js';
```

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for detailed integration patterns.

## Debugging

### Frontend Debugging

1. Open Chrome DevTools in the app:
   - **macOS**: `Cmd+Option+I`
   - **Windows/Linux**: `Ctrl+Shift+I`

2. Or enable remote debugging in `tauri.conf.json`:
   ```json
   {
     "app": {
       "withGlobalTauri": true
     }
   }
   ```

### Backend Debugging (Rust)

1. Enable debug logging in `lib.rs`:

   ```rust
   println!("Debug: {:?}", some_variable);
   ```

2. View output in terminal where you ran `npm run tauri dev`

3. For advanced debugging, use `rust-analyzer` extension in VS Code

## Common Issues

### Issue: "webkit2gtk not found" (Linux)

**Solution**: Install required dependencies:

```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev
```

### Issue: "failed to run custom build command for tauri"

**Solution**: Ensure Rust is up to date:

```bash
rustup update
```

### Issue: TypeScript errors about missing types

**Solution**: Install parent repo dependencies:

```bash
cd ../../  # Go to repo root
npm install
cd apps/app-desktop
npm run check
```

### Issue: "Cannot find module" when importing shared code

**Solution**: Check TypeScript paths configuration in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "$lib": ["./src/lib"],
      "$lib/*": ["./src/lib/*"]
    }
  }
}
```

### Issue: Application won't launch on macOS

**Solution**: If you see security warnings:

1. Go to System Preferences → Security & Privacy
2. Click "Open Anyway" for the blocked application
3. Or code-sign the app (requires Apple Developer account)

## Next Steps

1. **Explore the codebase**:
   - Read [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for architecture details
   - Study `platform-adapter.ts` to understand platform abstraction
   - Review `fsm-integration.ts` for FSM usage patterns

2. **Add features**:
   - Port Svelte components from `../../src/webview/`
   - Implement work item list view
   - Add time tracking UI
   - Integrate authentication flows

3. **Test on multiple platforms**:
   - Build on Windows, macOS, and Linux
   - Test installers on each platform
   - Verify feature parity with VS Code extension

## Resources

- [Tauri Documentation](https://tauri.app/v2/guides/)
- [SvelteKit Documentation](https://kit.svelte.dev/)
- [Tauri API Reference](https://tauri.app/v2/api/js/)
- [Parent Repo FSM Guide](../../docs/FSM_FIRST_DEVELOPMENT_RULES.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)

## Getting Help

- Open an issue in the main repository
- Check existing issues for similar problems
- Review parent repo's troubleshooting documentation
