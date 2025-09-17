Azure DevOps Integration Extension — 1.0 Release Plan

Goals for 1.0

- Stable, well-documented VS Code extension delivering core functionality: connect to Azure DevOps, browse work items, basic timer support, and basic PR operations.
- No breaking changes from current behavior.
- Packaging and CI in place to build, test, create a VSIX, and publish to Marketplace.

Pre-release checklist (must be completed before publishing):

1. Bump package.json version to 1.0.0 and update CHANGELOG.md with highlights and migration notes.
2. Verify license (MIT) and include LICENSE.txt in package.
3. Ensure `npm run build` produces `dist/extension.js` and `media/webview` assets.
4. Ensure `files` field in package.json includes only necessary runtime assets (dist, media, icons, license, README, CHANGELOG).
5. Run `npm test` locally and fix failures. Convert timer harness to unit tests (tests/timer.test.ts).
6. Add integration smoke test using @vscode/test-electron to activate the extension and verify the webview responds to a simple ping.
7. Create visuals for Marketplace: banner (1280x400 recommended), two or three screenshots (1280x720) demonstrating work items and timer flows, and small icon 128x128.
8. Prepare publisher profile on Visual Studio Marketplace and obtain a Personal Access Token (VSCE/Marketplace access token) for automation.
9. Add GitHub Actions secrets: VSCE*TOKEN (or AZURE_DEVOPS*\* if publishing via az cli) and optionally MARKETPLACE_PUBLISHER.
10. Create release in GitHub; attach VSIX artifact and release notes. Automate release via workflow on `refs/tags/v*`.

Post-release considerations (post-1.0 roadmap):

- Migrate webview UI to Svelte 5 and adopt a reactive-first architecture.
- Replace Vite bundling with a Svelte-optimized Vite config targeting smaller runtime and faster HMR for development.
- Implement integrated unit + integration tests covering webview <-> extension message round trips.
- Add semantic-release for automatic changelog and semantic versioning.
- Improve telemetry and error reporting (opt-in) and add feature flags for Pro features.

Publishing notes

- Use `vsce` or `@vscode/cli` with an access token to publish programmatically. Keep tokens in GitHub secrets.
- For CI publish: only publish on `main` when a tagged release is created (e.g. `v1.0.0`).

Contact

- Repository owner: plures
- For help executing this plan, open an issue labeled "release" or assign a PR to run the release workflow.
