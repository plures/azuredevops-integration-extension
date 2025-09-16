Reconstructed source (recovered-src)

What this is
- A minimal, best-effort reconstruction of two core parts of the installed "Azure DevOps Code Companion" extension.
  - `azureClient.js` — an Azure DevOps API client (buildWIQL, getWorkItems)
  - `provider.js` — a lightweight provider wrapper that talks to the client and posts messages to a webview via a provided `postMessage` function.

Why this helps
- The original source is bundled/minified in `dist/extension.js`. These files provide readable entry points so you can:
  - Understand how WIQL queries are built and how work items are fetched.
  - Inspect and modify the provider behaviour (for example, to tweak the guard that prevents empty payloads from clearing the UI).
  - Use these files as a starting point to re-implement or maintain your own fork.

Notes & next steps
1. These files are a reconstruction — verify and adapt before running. They intentionally avoid direct vscode API coupling so you can test them with simple harnesses.
2. If you want, I can:
   - Extract more modules (timers, webview HTML/js, pr/branch helpers).
   - Recreate a runnable project structure (src/, package.json, minimal build script) that mirrors the original extension so you can rebuild and maintain it.
   - Add small unit tests for `getWorkItems` and `buildWIQL`.
3. To wire into VS Code you will need to recreate the extension activation/registration code and the webview assets; I can help do that incrementally.

How to try quickly
- Create a tiny runner to test the client. Example (node):

  const AzureDevOpsClient = require('./azureClient');
  const c = new AzureDevOpsClient('org', 'proj', 'PAT');
  c.getWorkItems('My Work Items').then(items => console.log(items.length)).catch(console.error);

Contact me which pieces you want next and I'll extract/clean them from the bundle.
