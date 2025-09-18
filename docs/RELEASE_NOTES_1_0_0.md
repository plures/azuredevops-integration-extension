# Azure DevOps Integration for VS Code — v1.0.0

Release date: 2025-09-18
Tag: v1.0.0

## Highlights

- Timer stop flow proposes Completed/Remaining updates and posts an optional Copilot-generated summary as a work item comment.
- New Work Items webview with list/Kanban views, filters (Sprint, Type, Assigned To), and per‑work‑item draft persistence.
- Elapsed time cap default of 3.5 hours (configurable via `azureDevOpsIntegration.defaultElapsedLimitHours`).
- "My Pull Requests" and "Create Pull Request" workflows across repositories with preferred repos remembered.
- Team-aware "Current Sprint" using team current iteration path with fallback to `@CurrentIteration`.

## Changes and fixes

- ESM-first toolchain stabilization: Mocha via Node ESM loader, Vite webview build, esbuild extension bundling.
- Process-agnostic WIQL using StateCategory with runtime fallback for legacy states; explicit api-version pinning.
- Rate limiter and retry improvements in the Azure DevOps client; better error handling.
- Time report fixes: midnight overlap handled.
- CI: formatting checks, build/test gating, release tags pinned to main ancestry.

## Developer experience

- ESLint + Prettier with Husky and lint-staged.
- Vite outputs to `media/webview`; extension bundle to `dist/`.
- Tests: unit tests green; integration harness noted for post‑1.0 improvements.

## Installation

- From VSIX: use the packaged `azuredevops-integration-extension-1.0.0.vsix` or install from Marketplace when available.

## Notes

- The repository history was squashed so v1.0.0 is the initial public commit. A full backup of the prior history was retained privately.
