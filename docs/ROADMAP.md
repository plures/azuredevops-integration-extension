# azuredevops-integration-extension Roadmap

## Role in Plures Ecosystem
This VS Code extension is the developer-facing interface to Azure DevOps inside the Plures workflow. It dogfoods Praxis for state management and demonstrates a full productivity surface (work items, time tracking, Git automation) embedded directly in the IDE.

## Current State
The extension already supports work item lists and Kanban views, time tracking, and Git branch creation with robust authentication (Entra ID + PAT). The codebase includes Svelte 5 views, Praxis logic, caching, telemetry, and a full command surface. Remaining gaps are deeper work item editing, richer board interactions, and marketplace release polish.

## Milestones

### Near-term (Q2 2026)
- Implement full work item edit/create flows (fields, comments, links).
- Add richer Kanban interactions (drag/drop, swimlanes, filters).
- Improve time tracking export (daily summaries, CSV/ADO sync).
- Ship stable marketplace build pipeline and signed packages.
- Expand test coverage for auth and webview lifecycle.

### Mid-term (Q3–Q4 2026)
- Add sprint analytics and personal productivity dashboards.
- Integrate pull request + build status views inside the extension.
- Offline mode with queued updates and background sync.
- Multi-organization workspace profiles and quick switching.
- Enhanced accessibility and keyboard shortcuts parity.

### Long-term
- Team-level dashboards and shared reporting views.
- Native integration with Praxis Business governance workflows.
- Extension API for third-party panels (custom queries, widgets).
- Full feature parity with Azure DevOps web UX.
