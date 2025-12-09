# Praxis in VS Code Extensions: The Build Recipe

This guide documents how to integrate **Praxis** (which uses Svelte 5 Runes) into a **VS Code Extension** (which runs in Node.js).

## The Challenge

Praxis uses Svelte 5 Runes (`$state`, `$derived`, `$effect`) for fine-grained reactivity. These are **compile-time macros**. 

The VS Code Extension Host runs **Node.js**, which does not understand `$state`. If you try to run Praxis code directly, you will get:
`ReferenceError: $state is not defined`.

## The Solution: Server-Side Compilation

We must compile the `.svelte.ts` files into standard JavaScript using the Svelte compiler in "server" mode (which generates code suitable for non-DOM environments).

### 1. Dependencies

Install the necessary build tools:

```bash
npm install --save-dev esbuild esbuild-svelte svelte svelte-preprocess
```

### 2. Build Configuration (`esbuild.mjs`)

You need to configure `esbuild` to handle `.svelte.ts` files.

**Key Configuration Points:**
1.  **Plugin**: Use `esbuild-svelte`.
2.  **Compiler Options**: Set `runes: true` and `generate: 'server'`.
3.  **Include**: Target `.svelte.ts` (and `.svelte.js`) files.
4.  **Resolve**: Add `.svelte.ts` to `resolveExtensions`.

```javascript
// esbuild.mjs
import esbuild from 'esbuild';
import { default as sveltePlugin } from 'esbuild-svelte';
import { default as sveltePreprocess } from 'svelte-preprocess';

async function buildExtension() {
  await esbuild.build({
    entryPoints: ['src/activation.ts'],
    bundle: true,
    platform: 'node',
    outfile: 'dist/extension.cjs',
    // ... other options ...
    resolveExtensions: ['.ts', '.js', '.json', '.svelte.ts'], // <--- IMPORTANT
    plugins: [
      sveltePlugin({
        preprocess: sveltePreprocess(),
        compilerOptions: {
          runes: true,
          generate: 'server', // <--- CRITICAL: Compiles for Node.js (no DOM)
        },
        include: /\.(svelte\.ts|svelte\.js)$/,
      }),
    ],
  });
}
```

### 3. File Naming

*   Use `.svelte.ts` for any file that uses `$state` or `$derived`.
*   This signals to the bundler (and developers) that the file contains reactive logic.

## Automation & Best Practices

To make this easier for future extensions, we should consider:

1.  **Shared Build Package**: Create `@plures/praxis-build-vscode` that exports a pre-configured esbuild setup.
    ```javascript
    // Future usage
    import { buildExtension } from '@plures/praxis-build-vscode';
    buildExtension({ entry: 'src/activation.ts' });
    ```

2.  **Template**: Update the `vscode-extension` template in `architectural-discipline-package` to include this configuration by default.

3.  **CLI Tool**: `praxis init vscode` could scaffold this `esbuild.mjs` file automatically.
