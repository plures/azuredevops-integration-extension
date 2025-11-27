# @plures/praxis Package Analysis

## Issue

The `@plures/praxis` package installed in `node_modules` has a mismatch between its `package.json` configuration and the actual build output structure in the `dist` folder. This causes import errors and makes the package appear "uncompiled" or broken to consumers.

## Findings

The `dist` folder structure preserves the source directory structure (`src`, `core`, `ui`), but `package.json` expects a flattened structure or uses outdated paths.

| Entry                     | Current `package.json` Path          | Actual File Path                                     |
| ------------------------- | ------------------------------------ | ---------------------------------------------------- |
| `main`                    | `./dist/index.js`                    | `./dist/src/index.js`                                |
| `types`                   | `./dist/index.d.ts`                  | `./dist/src/index.d.ts`                              |
| `bin.praxis`              | `./dist/cli/index.js`                | `./dist/src/cli/index.js`                            |
| `exports["."]`            | `./dist/index.js`                    | `./dist/src/index.js`                                |
| `exports["./svelte"]`     | `./dist/integrations/svelte.js`      | `./dist/src/integrations/svelte.js`                  |
| `exports["./schema"]`     | `./dist/core/schema/types.js`        | `./dist/core/schema-engine/types.js`                 |
| `exports["./component"]`  | `./dist/core/component/generator.js` | `./dist/ui/svelte-generator/index.js` (Likely match) |
| `exports["./cloud"]`      | `./dist/cloud/index.js`              | `./dist/src/cloud/index.js`                          |
| `exports["./components"]` | `./dist/components/index.d.ts`       | `./dist/src/components/index.d.ts`                   |

## Recommended Fix

Update the `package.json` in the `@plures/praxis` project to match the build output structure.

```json
{
  "name": "@plures/praxis",
  "version": "1.0.0",
  "description": "The Full Plures Application Framework - declarative schemas, logic engine, component generation, and local-first data",
  "type": "module",
  "main": "./dist/src/index.js",
  "types": "./dist/src/index.d.ts",
  "bin": {
    "praxis": "./dist/src/cli/index.js"
  },
  "exports": {
    ".": {
      "types": "./dist/src/index.d.ts",
      "default": "./dist/src/index.js"
    },
    "./svelte": {
      "types": "./dist/src/integrations/svelte.d.ts",
      "default": "./dist/src/integrations/svelte.js"
    },
    "./schema": {
      "types": "./dist/core/schema-engine/types.d.ts",
      "default": "./dist/core/schema-engine/types.js"
    },
    "./component": {
      "types": "./dist/ui/svelte-generator/index.d.ts",
      "default": "./dist/ui/svelte-generator/index.js"
    },
    "./cloud": {
      "types": "./dist/src/cloud/index.d.ts",
      "default": "./dist/src/cloud/index.js"
    },
    "./components": {
      "types": "./dist/src/components/index.d.ts",
      "svelte": "./src/components/TerminalNode.svelte"
    }
  },
  "files": [
    "dist",
    "src",
    "core",
    "cli",
    "templates",
    "docs",
    "README.md",
    "FRAMEWORK.md",
    "src/components"
  ],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "typecheck": "tsc --noEmit",
    "cli": "node ./dist/src/cli/index.js"
  },
  "keywords": [
    "praxis",
    "framework",
    "plures",
    "logic",
    "schema",
    "component-generation",
    "local-first",
    "functional",
    "typescript",
    "state-management",
    "facts",
    "rules",
    "constraints",
    "orchestration",
    "canvas",
    "visual-development"
  ],
  "author": "Plures",
  "license": "MIT",
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^24.10.1",
    "@vitest/ui": "^4.0.10",
    "tsx": "^4.20.6",
    "typescript": "^5.9.3",
    "vitest": "^4.0.10"
  },
  "dependencies": {
    "commander": "^14.0.2",
    "js-yaml": "^4.1.1"
  },
  "peerDependencies": {
    "svelte": "^5.0.0"
  },
  "peerDependenciesMeta": {
    "svelte": {
      "optional": true
    }
  }
}
```
