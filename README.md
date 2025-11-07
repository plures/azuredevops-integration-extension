# Azure DevOps Integration for VS Code

**Streamline your development workflow** with Azure DevOps work items, time tracking, and Git integration directly in VS Code. Perfect for teams using Azure DevOps Services or DevOps Server (on-premises).

**Get Help:**

- Copy logs: `Azure DevOps Integration: Copy Logs to Clipboard`
- Open an issue on [GitHub](https://github.com/plures/azuredevops-integration-extension/issues)

## 🎬 See It In Action

![Extension Demo - Loading sequence showing initialization, work item list, and Kanban board views](images/loading-sequence.gif)

**Watch the complete workflow:** Initialization → Work item queries → List and Kanban views with smooth transitions and native VS Code theming.

## 🚀 Key Features

### 📋 **Work Items Management**

- **Smart Queries**: Built-in filters (My Activity, Assigned to Me, Current Sprint, All Active, Recently Updated)
- **Custom WIQL**: Write your own queries with full WIQL syntax support
- **Dual Views**: Toggle between detailed list and visual Kanban board views
- **Work Item Actions**: Edit, open in browser, create branches, and start timers directly from work items

### ⏱️ **Time Tracking**

- **Smart Timer**: Start/stop timer for work items with real-time elapsed time display
- **Timer Persistence**: Timer state persists across VS Code restarts
- **Work Item Association**: Timer automatically links to selected work item
- **Visual Indicators**: Timer status shown on work item cards

### 🔀 **Git Integration**

- **Branch Creation**: Generate branches from work items with customizable naming templates
- **Automatic Linking**: Created branches are automatically linked to work items
- **Smart Templates**: Configure branch naming patterns (e.g., `feature/{id}-{title}`)

### 🔐 **Modern Authentication**

- **Microsoft Entra ID**: Secure OAuth 2.0 device code flow with automatic token refresh
- **Personal Access Tokens**: Traditional PAT support with secure storage in VS Code secret store
- **On-Premises Support**: Full compatibility with Azure DevOps Server
- **Connection Management**: Switch between multiple organizations/projects seamlessly
- **Status Indicators**: Visual authentication status in status bar

### 🎨 **Rich Interface**

- **Dual Views**: Toggle between detailed list and visual Kanban board
- **Keyboard Navigation**: Essential shortcuts (r for refresh, v for view toggle, / for search)
- **Accessibility**: ARIA support and keyboard navigation
- **Native VS Code Theming**: Automatically adapts to your VS Code theme

---

### 🛡️ Security & Trust

This extension handles your data with enterprise-grade security. For complete details on authentication, data access, and runtime security, see our [Security & Trust Notice](SECURITY.md).

## � Get Started in 3 Steps

### 1. 📥 **Install**

**From VS Code Marketplace:**

- Open Extensions view (`Ctrl+Shift+X`)
- Search "Azure DevOps Integration"
- Click Install

**Quick Install via Command Palette:**

- Press `Ctrl+P` (Cmd+P on macOS)
- Type: `ext install PluresLLC.azure-devops-integration-extension`

### 2. ⚙️ **Setup**

**Easy Setup Wizard (Recommended):**

1. Open Command Palette (`Ctrl+Shift+P`)
2. Run: `Azure DevOps Integration: Setup Wizard (Easy)`
3. **Paste any work item URL** from your Azure DevOps
4. Choose authentication method:
   - **Microsoft Entra ID** (OAuth) - Modern, secure, no tokens to manage
   - **Personal Access Token** - Traditional approach

The wizard auto-detects your organization, project, and server type!

**For On-Premises:** The extension fully supports Azure DevOps Server. Just use a work item URL from your server (e.g., `https://myserver/DefaultCollection/MyProject/_workitems/edit/123`)

### 3. 🎯 **Start Working**

- Click the **Azure DevOps** icon in the Activity Bar
- Browse work items with built-in queries or create custom WIQL
- Start timers, create branches, and manage work items directly in VS Code

---

## 🔐 Authentication Options

### 🌟 **Microsoft Entra ID (Recommended)**

**Perfect for Azure DevOps Services (cloud):**

- ✅ **No token management** - OAuth 2.0 handles everything
- ✅ **Auto-refresh** - Never worry about expired tokens
- ✅ **Status bar indicator** - See token status at a glance
- ✅ **One-click reconnect** - Easy reauthorization when needed

### � **Personal Access Token**

**Required for on-premises, available for cloud:**

**Minimum required scopes:**

- Work Items (Read & Write)
- User Profile (Read)
- Team (Read)
- Code (Read & Write) - for Git integration
- Build (Read) - for future features

**Generate at:** Azure DevOps → User Settings → Security → Personal Access Tokens

> **Note:** On-premises Azure DevOps Server only supports PAT authentication. The setup wizard automatically detects this and guides you accordingly.

## ⌨️ Essential Commands

**Setup & Connection:**

- `Azure DevOps Integration: Setup Wizard (Easy)` - Guided setup with URL parsing
- `Azure DevOps Integration: Sign In with Microsoft Entra ID` - OAuth authentication
- `Azure DevOps Integration: Setup or Manage Connections` - Manage connections

**Daily Workflow:**

- `Azure DevOps Integration: Show Work Items` - Open main view
- `Azure DevOps Integration: Start/Stop Timer` - Toggle time tracking
- `Azure DevOps Integration: Create Branch from Work Item` - Git integration
- `Azure DevOps Integration: Toggle Kanban View` - Switch view modes
- `Azure DevOps Integration: Refresh Work Items` - Refresh data

> 💡 **Pro Tip:** Press `Ctrl+Shift+P` and type "Azure DevOps" to see all available commands

## ⚙️ Configuration

**Key Settings (Optional):**

```jsonc
{
  // Git templates
  "azureDevOpsIntegration.branchNameTemplate": "feature/{id}-{title}",

  // Debugging
  "azureDevOpsIntegration.debugLogging": false,
}
```

> 🔒 **Security:** Tokens are stored securely in VS Code's secret store, never in settings files.

## 🔍 Troubleshooting

**Having issues?**

1. **Check Debug Logs:**
   - Enable: Set `azureDevOpsIntegration.debugLogging` to `true`
   - View: Command Palette → `Azure DevOps Integration: Open Logs`

2. **Common Solutions:**
   - **Empty work items**: Verify PAT scopes and organization/project settings
   - **Timer issues**: Confirm a work item is selected
   - **Git integration**: Ensure PAT has Code (Read & Write) permissions
   - **Authentication issues**: Check status bar indicator and use "Sign In" command if needed

3. **Get Help:**
   - Copy logs: `Azure DevOps Integration: Copy Logs to Clipboard`
   - Open an issue on [GitHub](https://github.com/plures/azuredevops-integration-extension/issues)

---

## 📚 Documentation & Resources

- **[Marketplace Page](https://marketplace.visualstudio.com/items?itemName=PluresLLC.azure-devops-integration-extension)** - Install and reviews
- **[Security & Trust](SECURITY.md)** - Security practices and data handling
- **[Architecture Guide](docs/ARCHITECTURE.md)** - Technical details and CI testing
- **[Release Notes](CHANGELOG.md)** - Latest features and fixes
- **[GitHub Repository](https://github.com/plures/azuredevops-integration-extension)** - Source code and issues

## 🤝 Contributing

Contributions welcome! Please open an issue for substantial changes. Built with TypeScript, Svelte, and ESBuild following VS Code extension best practices.

This repository includes comprehensive [GitHub Copilot instructions](.github/copilot-instructions.md) to help AI coding assistants understand our architecture and development workflow.

**Quick Development:**

```bash
npm run build          # Build extension
npm run test           # Run tests
npm run test:integration # Integration tests (temporarily disabled)
```

**Release Process:** Releases are fully automated using GitHub Actions. Use [conventional commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, etc.) and releases happen automatically when merged to main. See [docs/RELEASE_PROCESS.md](./docs/RELEASE_PROCESS.md) for details.

## 📄 Legal

**License:** MIT License - see [LICENSE](./LICENSE.txt)  
**Attribution:** See [NOTICE](./NOTICE.md) for third-party licenses  
**Security:** Read our [Security & Trust Notice](SECURITY.md) for data handling details

---

**Enjoy streamlined Azure DevOps integration!** 🚀  
_Feedback and feature requests are always welcome._

- Architecture, security notes, and CI testing details: see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).
- What's new: see [CHANGELOG](./CHANGELOG.md) for the latest features and fixes.
