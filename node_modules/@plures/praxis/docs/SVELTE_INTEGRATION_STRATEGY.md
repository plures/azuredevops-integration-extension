# Svelte Integration Strategy for Praxis

## Current State

Praxis uses **Svelte 5 Runes** (`$state`, `$derived`, `$effect`) as its core reactivity engine. This provides excellent performance and developer experience but introduces a build-time dependency on the Svelte compiler.

## The Problem

Consumers of `@plures/praxis` in non-browser environments (Node.js, Electron Main, VS Code Extension Host) currently face a hurdle:

1.  They import `ReactiveLogicEngine`.
2.  This imports code containing `$state`.
3.  **Runtime Error**: `$state is not defined`.

To fix this, the **consumer** currently has to configure their bundler (esbuild, webpack, vite) to compile the *library's* code (or their own usage of it) using `esbuild-svelte`. This leaks implementation details and increases friction.

## Strategy: Invisible Integration

We want users to `import { engine } from '@plures/praxis'` and have it "just work" anywhere, without knowing it uses Svelte under the hood.

### 1. Dual Distribution Builds (Recommended)

The `@plures/praxis` package should ship pre-compiled artifacts for different environments.

**`package.json` exports:**

```json
{
  "exports": {
    ".": {
      "node": "./dist/node/index.js",      // Compiled with generate: 'server'
      "browser": "./dist/browser/index.js", // Compiled with generate: 'client' (or raw?)
      "default": "./dist/node/index.js"
    }
  }
}
```

**Build Pipeline Changes:**
*   Run `tsup` or `esbuild` twice during the library build process.
*   **Build 1 (Node)**: Use `esbuild-svelte` with `generate: 'server'`. This bakes the reactivity into standard JS getters/setters/signals that Node can execute.
*   **Build 2 (Browser)**: Use `esbuild-svelte` with `generate: 'client'` (or leave as raw `.svelte.ts` if we expect the user to bundle it, but pre-compiled is safer).

**Result**:
The consumer installs `@plures/praxis`.
*   **In VS Code**: Node resolves `dist/node/index.js`. The code is standard JS. No `esbuild-svelte` needed in the consumer's build config (unless they write *their own* `.svelte.ts` files).
*   **In Webview**: Bundler resolves `dist/browser/index.js`.

### 2. The "Core" vs "Reactive" Split

If we want to support users who strictly cannot have Svelte code (even compiled), we could separate the packages:

*   `@plures/praxis-core`: Pure TS, no reactivity. Just the logic engine, types, and rule processing. State is a plain object.
*   `@plures/praxis`: Re-exports core + the Svelte reactive engine.

### 3. Seamless Developer Experience (DX)

To make the integration invisible:

1.  **Pre-compile everything**: Never force the user to compile `node_modules`.
2.  **Type Definitions**: Ensure `.d.ts` files hide the Svelte implementation details (e.g., `state` property should just look like `TContext`, not a Svelte proxy type).
3.  **Templates**: If the user *does* want to write reactive logic (e.g., `myRules.svelte.ts`), provide templates (`praxis init`) that set up the build tools automatically.

## Action Plan

1.  **Update Praxis Build**: Modify `praxis/package.json` and build scripts to output a Node-compatible build.
2.  **Verify**: Create a test consumer (simple Node script) that imports the library and runs without any build step.
3.  **Document**: Update the main README to explain that Praxis works in Node.js out of the box.
