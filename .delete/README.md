Staged for deletion - rationale and preservation

This folder contains files identified during an initial code audit that are either duplicates of TypeScript sources (compiled JS committed in src/), ad-hoc harnesses, or intermediate build artifacts. They are staged here to allow safe review, extract useful techniques, and eventual removal from the main tree.

Guidelines:

- Files were copied here instead of immediate deletion to preserve intent and allow cherry-picking useful code snippets into documentation or tests.
- Before final deletion, each file should either be restored into the codebase in a maintained form (e.g., converted to a unit test, helper module, or documentation snippet) or fully removed with a referenced rationale in the release notes.

Staged files:

- src/azureClient.js — ESM re-export stub pointing at TypeScript source. Recommended: remove duplicate .js once build process/bundler is standardized and imports are normalized. Preserve the exported API description in documentation.
- src/provider.js — ESM re-export stub pointing at TypeScript source. Same rationale as azureClient.js.
- src/timer.js — ESM re-export stub pointing at TypeScript source. Same rationale.
- src/timerHarness.js — Development harness for exercising timer logic; useful to convert into unit tests for timer behavior. Consider converting harness into tests under tests/ before removing.

Actions to take before final deletion:

1. Extract code/logic into tests or documentation (timerHarness -> tests/timer.test.ts).
2. Normalize imports (avoid mixing explicit .js extensions in TypeScript source). Decide on either: keep .js extension in sources and retain .js stubs for dev, or remove .js stubs and update imports to extensionless specifiers.
3. Update .gitignore to ignore .delete once accepted.
4. Run full build and test to ensure no runtime regressions after removal.

Contact: plures
Date staged: 2025-09-15
