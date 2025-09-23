# packages/ui-web

Svelte component library used by both the VS Code webview and the SvelteKit app.

Initial components to extract:

- Work Items list and filters
- Kanban board
- Timer HUD and controls
- Stop dialog (Completed/Remaining/Copilot)

Components must be framework-agnostic (no VS Code API usage); communication is via props and events.
