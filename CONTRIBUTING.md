Contribution guidelines

Key conventions maintained by this project:

- TypeScript ESM imports: In source TypeScript files we use explicit ".js" extensions on import specifiers where the import is preserved to runtime (e.g. activation). This matches `moduleResolution: NodeNext` and ensures the emitted ESM JS is correct. Use `import type` for purely type-only imports when possible.

- Build outputs: The published package should include only runtime artifacts (dist/, media/) and not the entire src/ tree. Use `npm run build` and verify artifacts in `dist/` and `media/`.

- Staged deletions: Files moved to `.delete/` are preserved snapshots. Convert any useful code (e.g. timer harness) into tests under `tests/` before removing the original.

- Running locally:
  - `npm install`
  - `npm run webview:dev` to run Vite dev server for the webview.
  - `npm run watch` and then use the "Extension: Watch" launch configuration to debug in VS Code.

- Tests:
  - `npm test` runs Mocha tests under `tests/`.

If in doubt, open an issue or a draft pull request describing your planned change and its impact on extension activation or webview messages.
