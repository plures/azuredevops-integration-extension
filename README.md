# Azure DevOps Integration for VS Code

Integrate Azure DevOps work items, time tracking, branching, and pull requests directly inside VS Code.

## 🚀 Highlights

- Unified work items view (My Work Items, Current Sprint, All Active, Recently Updated, or custom WIQL)
- Team-aware Current Sprint: respects your selected team's current iteration
- One‑click work item creation
- Lightweight time tracking with inactivity auto‑pause
- Status bar timer with start / pause / resume / stop commands
- Branch creation from a selected work item (optional auto‑start timer)
- Pull request creation & quick access to your active PRs
- Secure PAT storage (secret store) + automatic migration from legacy keys
- Verbose diagnostic logging (opt‑in) for easier troubleshooting
- Webview filters (Sprint, Type, Assigned To) and a Kanban toggle
- Per‑work‑item draft persistence in the editor (your notes stick to each item locally)
- Smart stop flow: proposes Completed/Remaining updates and can post a Copilot‑generated summary comment
- Reliable queries across process templates with runtime compatibility fallback
- Generate a personalized AI workflow prompt (MCP) to let AI assist with work items

## 📥 Installation

From VS Code: Extensions view → search "Azure DevOps Integration" → Install.

Command palette quick install:

1. Press Ctrl+P (Cmd+P on macOS)
2. Type: ext install PluresLLC.azuredevops-integration-extension
3. Press Enter

## 🔐 Create a Personal Access Token

Required scopes (minimum recommended):

- Work Items (Read & Write)
- Code (Read & Write) – for PRs & repos
- Build (Read) – optional, for planned build status features

Generate at: Azure DevOps → User Settings → Security → Personal Access Tokens.

## ⚙️ Setup

Run: Azure DevOps Integration: Setup Connection
Provide Organization (short name), Project, and PAT. The extension stores the PAT securely. If settings already exist it silently initializes on startup.

Optional: set a Team for iteration-aware queries

- Use the command: Azure DevOps Integration: Select Team to set a team context. When set, the "Current Sprint" query resolves using that team's current iteration. You can clear or change this later by running the command again.

## 🕒 Time Tracking

- Start timer from command palette or by picking a work item
- Auto‑pause after configurable inactivity timeout
- Auto‑resume on activity (configurable)
- View summarized time via Show Time Report (Today, Week, Month, All Time)
- Elapsed cap: if a timer was left running, an optional cap (default 3.5 hours) is applied on stop to prevent over‑reporting
- On Stop, the extension proposes Completed/Remaining updates and can generate a concise Copilot summary comment on the work item

## ⌨️ Core Commands

| Command ID                                | Palette Title                                          |
| ----------------------------------------- | ------------------------------------------------------ |
| azureDevOpsInt.setup                      | Azure DevOps Integration: Setup Connection             |
| azureDevOpsInt.showWorkItems              | Azure DevOps Integration: Show Work Items              |
| azureDevOpsInt.createWorkItem             | Azure DevOps Integration: Create Work Item             |
| azureDevOpsInt.refreshWorkItems           | Azure DevOps Integration: Refresh Work Items           |
| azureDevOpsInt.startTimer                 | Azure DevOps Integration: Start Timer                  |
| azureDevOpsInt.pauseTimer                 | Azure DevOps Integration: Pause Timer                  |
| azureDevOpsInt.resumeTimer                | Azure DevOps Integration: Resume Timer                 |
| azureDevOpsInt.stopTimer                  | Azure DevOps Integration: Stop Timer                   |
| azureDevOpsInt.showTimeReport             | Azure DevOps Integration: Show Time Report             |
| azureDevOpsInt.createBranch               | Azure DevOps Integration: Create Branch from Work Item |
| azureDevOpsInt.createPullRequest          | Azure DevOps Integration: Create Pull Request          |
| azureDevOpsInt.showPullRequests           | Azure DevOps Integration: Show My Pull Requests        |
| azureDevOpsInt.selectTeam                 | Azure DevOps Integration: Select Team                  |
| azureDevOpsInt.resetPreferredRepositories | Azure DevOps Integration: Reset Preferred Repositories |
| azureDevOpsInt.generateAIWorkflowPrompt  | Azure DevOps Integration: Generate AI Workflow Prompt   |

More helpful commands (selection):

- Toggle Kanban View — `azureDevOpsInt.toggleKanbanView`
- Set Default Timer Elapsed Cap — `azureDevOpsInt.setDefaultElapsedLimit`

## 🔧 Configuration (Settings)

Namespace: azureDevOpsIntegration

```jsonc
{
  "azureDevOpsIntegration.organization": "myorg",
  "azureDevOpsIntegration.project": "myproject",
  // Optional team context for iteration-aware queries like "Current Sprint"
  "azureDevOpsIntegration.team": "My Team",
  "azureDevOpsIntegration.defaultWorkItemType": "Task",
  "azureDevOpsIntegration.defaultQuery": "My Work Items", // or Current Sprint, All Active, Recently Updated, Custom
  "azureDevOpsIntegration.timerInactivityTimeout": 300,
  "azureDevOpsIntegration.defaultElapsedLimitHours": 3.5, // cap long-running timers when stopped
  "azureDevOpsIntegration.autoStartTimerOnBranch": true,
  "azureDevOpsIntegration.autoResumeOnActivity": true,
  "azureDevOpsIntegration.pomodoroEnabled": false,
  "azureDevOpsIntegration.showBuildNotifications": true,
  "azureDevOpsIntegration.workItemRefreshInterval": 300,
  "azureDevOpsIntegration.enableAnalytics": true,
  // Preferred repo IDs used when creating PRs; you'll be prompted on first use if empty
  "azureDevOpsIntegration.preferredRepositoryIds": [
    // "00000000-0000-0000-0000-000000000000"
  ],
  "azureDevOpsIntegration.debugLogging": false,
  "azureDevOpsIntegration.apiRatePerSecond": 5, // throttle sustained API calls
  "azureDevOpsIntegration.apiBurst": 10 // allow short bursts
}
```

The Personal Access Token is stored via the VS Code secret storage (not in settings.json).

## 🔍 Logging & Diagnostics

Enable setting: azureDevOpsIntegration.debugLogging. An output channel "Azure DevOps Integration" appears with verbose lifecycle, webview message, and refresh diagnostics.

## 🔄 Migration & Backward Compatibility

- Legacy config keys under azureDevOps.\* are auto‑migrated if the new values are empty.
- Legacy secret key azureDevOps.pat is migrated to azureDevOpsInt.pat.
- Class alias: AzureDevOpsClient (deprecated) still exported pointing to AzureDevOpsIntClient.

## ❓ Troubleshooting

| Issue                | Hint                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------ |
| Empty work item list | Verify organization/project & WIQL query (default: My Work Items). Check PAT scopes. |
| Timer not starting   | Ensure a work item is selected; confirm no existing active timer.                    |
| PR creation fails    | Confirm Code (Read & Write) scope on PAT and repository presence.                    |

### Pull requests and preferred repositories

- The first time you create a PR, you'll be prompted to pick one or more repositories. These are saved as `azureDevOpsIntegration.preferredRepositoryIds`.
- To change or clear your choices, run: Azure DevOps Integration: Reset Preferred Repositories.
- The "Show My Pull Requests" command searches across repositories and filters to your identity.

## 🤖 AI workflow (MCP)

This extension can generate a personalized instruction prompt to help AI assistants (like GitHub Copilot Chat with MCP) interact with your Azure DevOps work items with minimal back‑and‑forth.

- Run: Azure DevOps Integration: Generate AI Workflow Prompt
- The prompt will be copied to your clipboard and opened in a new editor tab
- Paste it into your AI tool; with the MCP server configured (AZDO_ORG, AZDO_PROJECT, AZDO_PAT), the AI can list/search/create/update work items, add comments, and log time

Details and the list of available MCP methods are in docs/AI_WORKFLOW_TEMPLATE.md.

### MCP server controls in the extension

- Start MCP Server — `azureDevOpsInt.startMcpServer`
- Stop MCP Server — `azureDevOpsInt.stopMcpServer`

Prerequisites:

- In Settings, set Organization and Project (azureDevOpsIntegration.organization / .project)
- PAT stored via Setup Connection (the extension reads it from the secret store)

When started, the server logs to the "Azure DevOps MCP" output channel. The command palette shows Start or Stop based on the current server status. The extension sets the required environment (`AZDO_ORG`, `AZDO_PROJECT`, `AZDO_PAT`) when launching the server.

## 📦 Development

Scripts:

- build:all – build webview + extension bundle
- webview:dev – run Vite dev server (webview) during extension development

Launch configs (/.vscode) let you run the extension with live reload (watch tasks).

## 📘 Queries and compatibility

- Process‑agnostic active filter: when supported by your org, the extension uses `[System.StateCategory] <> 'Completed'` and excludes items in `'Removed'` for default queries like "My Work Items", "All Active", and "Current Sprint".
- Runtime fallback: some organizations or older processes reject `System.StateCategory` in WIQL. If that happens, the extension automatically falls back to a legacy filter equivalent to `NOT IN ('Closed','Done','Resolved','Removed')` and retries the query.
- Recently Updated window: the "Recently Updated" query uses a 14‑day window (`[System.ChangedDate] >= @Today - 14`).

## 🤝 Contributing

Pull requests welcome. Please open an issue first for substantial changes. Add tests where practical (client querying, timer edge cases) and keep logging minimal outside debug mode.

## 📄 License

MIT License – see [LICENSE](./LICENSE.txt)

---

Enjoy the extension! Feedback & feature requests are appreciated.

## More

- Attribution and license details: see [NOTICE](./NOTICE.md) and [LICENSE](./LICENSE.txt).
- Architecture, security notes, and CI testing details: see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).
