# Praxis Upgrade Preparation

The local prototype scripts for AST analysis and the Logic Inspector Canvas have been removed.
These features are being integrated into the core `@plures/praxis` package.

## Pending Actions

Once the new version of Praxis (containing the `feature/logic-inspector` changes) is released:

1.  **Update Dependencies**:
    Run `npm install @plures/praxis@latest` in both the root directory and `apps/app-desktop`.

2.  **Verify Scripts**:
    The `package.json` scripts have been updated to use the `praxis` CLI commands instead of local scripts:
    - `npm run canvas` -> `praxis canvas`
    - `npm run check:architecture` -> `praxis verify implementation`

3.  **Tauri App**:
    Ensure the Tauri app (`apps/app-desktop`) also updates its dependency to leverage the new runtime features if applicable.

## Removed Files

- `scripts/ast-analyzer.ts`
- `scripts/canvas/`
- `scripts/verify-fsm-implementation.ts`
