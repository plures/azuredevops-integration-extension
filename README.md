# Azure DevOps Integration for VS Code

Integrate Azure DevOps work items, time tracking, branching, pull requests, and build visibility directly inside VS Code.

## 🚀 Highlights

- Unified work item list (My Work Items, Current Sprint, All Active, Recently Updated, or custom WIQL)
- One‑click work item creation
- Lightweight time tracking with inactivity auto‑pause 
- Status bar timer with start / pause / resume / stop commands
- Branch creation from a selected work item (optional auto‑start timer)
- Pull request creation & quick access to your active PRs
- Recent build status viewer
- Secure PAT storage (secret store) + automatic migration from legacy keys
- Verbose diagnostic logging (opt‑in) for easier troubleshooting

## 📥 Installation

From VS Code: Extensions view → search "Azure DevOps Integration" → Install.

Command palette quick install:

1. Press Ctrl+P (Cmd+P on macOS)
2. Type: ext install plures.azuredevops-integration-extension
3. Press Enter

## 🔐 Create a Personal Access Token

Required scopes (minimum recommended):

- Work Items (Read & Write)
- Code (Read & Write) – for PRs & repos
- Build (Read) – for build status

Generate at: Azure DevOps → User Settings → Security → Personal Access Tokens.

## ⚙️ Setup

Run: Azure DevOps Integration: Setup Connection
Provide Organization (short name), Project, and PAT. The extension stores the PAT securely. If settings already exist it silently initializes on startup.

## 🕒 Time Tracking

- Start timer from command palette or by picking a work item
- Auto‑pause after configurable inactivity timeout
- Auto‑resume on activity (configurable)
- View summarized time via Show Time Report (Today, Week, Month, All Time)

## ⌨️ Core Commands

| Command ID | Palette Title |
|------------|---------------|
| azureDevOpsInt.setup | Azure DevOps Integration: Setup Connection |
| azureDevOpsInt.showWorkItems | Azure DevOps Integration: Show Work Items |
| azureDevOpsInt.createWorkItem | Azure DevOps Integration: Create Work Item |
| azureDevOpsInt.refreshWorkItems | Azure DevOps Integration: Refresh Work Items |
| azureDevOpsInt.startTimer | Azure DevOps Integration: Start Timer |
| azureDevOpsInt.pauseTimer | Azure DevOps Integration: Pause Timer |
| azureDevOpsInt.resumeTimer | Azure DevOps Integration: Resume Timer |
| azureDevOpsInt.stopTimer | Azure DevOps Integration: Stop Timer |
| azureDevOpsInt.showTimeReport | Azure DevOps Integration: Show Time Report |
| azureDevOpsInt.createBranch | Azure DevOps Integration: Create Branch from Work Item |
| azureDevOpsInt.createPullRequest | Azure DevOps Integration: Create Pull Request |
| azureDevOpsInt.showPullRequests | Azure DevOps Integration: Show My Pull Requests |
| azureDevOpsInt.showBuildStatus | Azure DevOps Integration: Show Build Status |

## 🔧 Configuration (Settings)

Namespace: azureDevOpsIntegration

```jsonc
{
  "azureDevOpsIntegration.organization": "myorg",
  "azureDevOpsIntegration.project": "myproject",
  "azureDevOpsIntegration.defaultWorkItemType": "Task",
  "azureDevOpsIntegration.defaultQuery": "My Work Items", // or Current Sprint, All Active, Recently Updated, Custom
  "azureDevOpsIntegration.timerInactivityTimeout": 300,
  "azureDevOpsIntegration.autoStartTimerOnBranch": true,
  "azureDevOpsIntegration.autoResumeOnActivity": true,
  "azureDevOpsIntegration.pomodoroEnabled": false,
  "azureDevOpsIntegration.showBuildNotifications": true,
  "azureDevOpsIntegration.workItemRefreshInterval": 300,
  "azureDevOpsIntegration.enableAnalytics": true,
  "azureDevOpsIntegration.debugLogging": false
}
```

The Personal Access Token is stored via the VS Code secret storage (not in settings.json).

## 🔍 Logging & Diagnostics

Enable setting: azureDevOpsIntegration.debugLogging. An output channel "Azure DevOps Integration" appears with verbose lifecycle, webview message, and refresh diagnostics.

## 🔄 Migration & Backward Compatibility

- Legacy config keys under azureDevOps.* are auto‑migrated if the new values are empty.
- Legacy secret key azureDevOps.pat is migrated to azureDevOpsInt.pat.
- Class alias: AzureDevOpsClient (deprecated) still exported pointing to AzureDevOpsIntClient.

## ❓ Troubleshooting

| Issue | Hint |
|-------|------|
| Empty work item list | Verify organization/project & WIQL query (default: My Work Items). Check PAT scopes. |
| Timer not starting | Ensure a work item is selected; confirm no existing active timer. |
| PR creation fails | Confirm Code (Read & Write) scope on PAT and repository presence. |
| Build list empty | Confirm Build (Read) scope and that recent builds exist. |

## 📦 Development

Scripts:

- build:all – build webview + extension bundle
- webview:dev – run Vite dev server (webview) during extension development

Launch configs (/.vscode) let you run the extension with live reload (watch tasks).

## 🤝 Contributing

Pull requests welcome. Please open an issue first for substantial changes. Add tests where practical (client querying, timer edge cases) and keep logging minimal outside debug mode.

## 📄 License
MIT License – see [LICENSE](./LICENSE.txt)

---
Enjoy the extension! Feedback & feature requests are appreciated.

## 🛠 Build Architecture & Security Notes

### Deterministic Webview Assets

The webview is built with Vite + Svelte 5. Output file names are forced to stable values:

- `media/webview/main.js`
- `media/webview/main.css`

This keeps HTML generation in the extension simple (no manifest lookup / hashing) while still allowing module scripts + CSP.

### ESM Everywhere

The extension bundle is emitted as pure ESM via `esbuild`. A lightweight banner injects `createRequire` so any transitive CommonJS `require()` calls from dependencies (e.g. node core shims) still work in the VS Code runtime.

### Defensive DOM Helper Patch (Currently a No‑Op)

A Vite plugin (`dom-accessor-patch`) was added to rewrite fragile internal Svelte DOM helper functions (`get_first_child`, `get_next_sibling`) with guarded fallbacks. In the current Svelte 5 build these helper symbols are inlined / eliminated, so the plugin does not match anything (no marker comment appears). It remains in place as future‑proof insurance; if a future Svelte version reintroduces those helpers the patch will activate and append `/* __DOM_ACCESSOR_PATCH_APPLIED__ */` to the bundle.

### Content Security Policy (CSP)

The CSP for the webview is strict:

```text
default-src 'none';
img-src <webview.cspSource> data:;
style-src <webview.cspSource>;
script-src 'nonce-<random>' <webview.cspSource>
```

Key points:

- All inline style attributes were removed; styles live in compiled CSS so `'unsafe-inline'` is not required.
- Scripts use a per‑load nonce and module script (`type="module"`).
- No remote network access is permitted (default-src 'none').

### Logging Bridge

Console calls inside the webview are proxied back to the extension (log / warn / error) for easier diagnostics when `debugLogging` is enabled.

### Future Hardening Ideas

- Subresource Integrity (SRI) on self scripts (optional; VS Code CSP already constrains origin & nonce)
- Additional runtime smoke test to assert the DOM patch plugin stayed a no‑op (or applied) during CI.

