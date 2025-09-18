Developer CLI (dev-cli)

We provide small npm scripts and a lightweight dev CLI to help common tasks:

Usage:

- npm run dev:webview # start webview dev server (Vite)
- npm run watch # watch TypeScript + esbuild bundling
- npm run test # run unit tests

We will add a small dev-cli.js in scripts/ to automate: ensure environment, run webview dev and extension watch concurrently, and open a debug window in VS Code.
