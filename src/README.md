Developer notes

This folder now contains the authoritative TypeScript sources for the extension. Earlier, temporary JavaScript reconstructions (`azureClient.js`, `provider.js`, `timer.js`) were kept to assist with reverse‑engineering; they have been removed in favor of the maintained TypeScript modules:

- `azureClient.ts` — Azure DevOps REST client
- `provider.ts` — Work items provider and webview messaging
- `timer.ts` — Timer state machine and persistence

Please refer to the root `README.md` and `docs/` for current architecture and development workflows.
