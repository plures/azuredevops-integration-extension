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

## Single Source of Truth – Praxis Derivation Pipeline

### Policy: no direct edits to `generated/`

All files under `generated/` are **automatically derived** from the Praxis
schema descriptor (`src/praxis/application/schema/descriptor.ts`).

**Never edit `generated/` files manually.** Any change you make will be
overwritten the next time someone runs `npm run derive` and will cause the
CI drift gate to fail.

### How to make a behaviour change

Follow this pipeline:

1. **Edit Praxis logic** — change facts, events, or rule descriptors in
   `src/praxis/application/schema/descriptor.ts` (and the corresponding
   runtime definitions in `src/praxis/application/`).
2. **Regenerate derived artifacts** — run:
   ```
   npm run derive
   ```
3. **Review the diff** — inspect what changed in `generated/` and confirm it
   matches your intent.
4. **Commit everything together** — the schema change *and* the regenerated
   artifacts must land in the same commit.

### Drift gate

The CI workflow `.github/workflows/drift-gate.yml` runs `npm run derive:check`
on every PR.  It exits with a non-zero code if any derived artifact is stale.
The job also runs `npm run test:derive` to validate schema completeness.

### Derive commands

| Command | Description |
|---------|-------------|
| `npm run derive` | Regenerate all derived artifacts |
| `npm run derive:check` | Regenerate and fail if any file changed |
| `npm run test:derive` | Run schema completeness tests |
| `npm run praxis:schema` | Print schema as a table (uses live engine) |

## Git Worktrees

This project uses Git worktrees for parallel development. Cursor automatically creates worktrees when switching branches.

**Automatic Configuration**: Git worktree settings are automatically applied to your local repository during `npm install` via the `prepare` script. The configuration includes:

- Worktree pruning
- Pull with rebase
- Push with auto setup remote
- Useful worktree aliases (e.g., `git wt`, `git wt-add`, `git wt-cleanup`)

**Quick Reference**:

- List worktrees: `git worktree list` or `git wt`
- See [Git Worktree Setup Guide](docs/GIT_WORKTREE_SETUP.md) for detailed configuration
- See [Git Workflow Strategy](docs/GIT_WORKFLOW_STRATEGY.md) for branch naming and PR process
- To apply settings globally (optional): `cat .gitconfig.worktree >> ~/.gitconfig`

## GitHub Copilot Setup

This repository includes comprehensive instructions for GitHub Copilot coding agent:

- `.github/copilot-instructions.md` - Main instructions file containing:
  - Repository structure and key files
  - Build, test, and development workflows
  - FSM-first architectural principles
  - Security considerations and best practices
- `.github/instructions/vscode-extension.instructions.md` - Detailed architectural guardrails

These instructions help Copilot coding agent understand the repository structure, build processes, and architectural patterns to provide better assistance with development tasks.

If in doubt, open an issue or a draft pull request describing your planned change and its impact on extension activation or webview messages.
