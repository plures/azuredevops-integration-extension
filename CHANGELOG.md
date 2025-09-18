# Change Log

All notable changes to the "Azure DevOps Integration" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.0.0] - 2025-09-18

### Added

- Timer stop flow with Proposed Completed/Remaining updates and Copilot-generated summary comment.
- Webview UI for work items, including Kanban toggle and filters (Sprint, Type, Assigned To).
- Per-work-item draft persistence in webview localStorage.
- Default elapsed time cap setting (`azureDevOpsIntegration.defaultElapsedLimitHours`, default 3.5h).
- Commands for showing pipelines, test plans, wikis, and additional Azure DevOps features.
- Minimal Pomodoro break prompt (optional, non-blocking to the webview).

### Changed

- Migrated repository to ESM-first (`type: module`), updated build and test runners accordingly.
- Reworked Mocha test execution via Node ESM loader; improved stability of integration tests.
- Refined webview messaging contract and ensured messages route through the VS Code API bridge.
- Optimized Azure DevOps REST client with retries and rate limiter configuration.
- Work item queries are now process-agnostic using `[System.StateCategory] <> 'Completed'` and excluding `'Removed'` (where supported) with automatic runtime fallback to legacy state filters when `System.StateCategory` is not available in WIQL.
- Team-aware "Current Sprint": resolves to the selected team's current iteration path when available; falls back to `@CurrentIteration` if team lookup fails.
- API versions pinned on WIQL and work item expansion for consistency (7.0).

### Fixed

- CI workflow stability: formatting checks, build order, and release gating to tags on main.
- Webview rendering issue where work items were not displayed; added robust field normalization and event wiring.
- Various edge cases in time tracking and error handling.
- "Show Time Report": entries spanning midnight are correctly handled via overlap logic.
- "Show My Pull Requests": searches across repositories and filters to the current identity.
- "Create Pull Request": stores preferred repositories and prompts on first use.

### Developer Experience

- ESLint (flat config) + Prettier enforcement; Husky + lint-staged for pre-commit consistency.
- Vite-based webview build output to `media/webview`; esbuild bundles extension to `dist/`.
- Minimal VS Code API test stub for unit tests.

[1.0.0]: https://github.com/plures/AzureDevOps-Integration-Extension/releases/tag/v1.0.0
