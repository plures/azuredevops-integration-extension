# Recovered TypeScript Source

This folder contains TypeScript conversions of the reconstructed Azure DevOps extension components.

## Contents

- `azureClient.ts` – Azure DevOps REST client (WIQL, CRUD, comments, iterations, time entry) (exports `AzureDevOpsIntClient` and legacy alias `AzureDevOpsClient`)
- `provider.ts` – Work items provider façade (state + messaging abstraction)
- `timer.ts` – Time tracking (start/pause/resume/stop, inactivity, pomodoro, persistence hooks)
- `types.d.ts` – Shared interfaces
- `tsconfig.json` – Compiler configuration (outputs to `../recovered-dist`)

## Build

From repository root (install axios + types if not already):

```powershell
npm install axios @types/node --save-dev
npx tsc -p recovered-src/tsconfig.json
```

Emitted JS + type declarations will appear in `recovered-dist/`.

## Integration Notes

- VS Code specific APIs (window, commands, globalState) were abstracted. Inject them where needed.
- Add an activation script that wires:
  - Create `AzureDevOpsIntClient` (or legacy alias `AzureDevOpsClient`)
  - Instantiate `WorkItemsProvider`
  - Hook a webview and route `postMessage` to provider methods
  - Instantiate `WorkItemTimer` and forward state updates to UI
- Consider splitting networking (client) from domain services for easier testing.

## Next Suggestions

1. Add unit tests (Jest / Mocha) for `buildWIQL`, `filterWorkItems`, timer inactivity edge cases.
2. Implement a thin adapter class wrapping VS Code to isolate API surface.
3. Add retry/backoff for transient 5xx in client.
4. Provide rate limiting (queue) if you plan batched operations.

Let me know if you want an activation scaffold or test harness next.
