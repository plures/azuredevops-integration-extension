# Decision Ledger Architecture

## Purpose

The **Decision Ledger** provides an auditable, replayable record of every
mutating operation in the extension. It answers the question:
_"Why did the application do X, and can we replay that decision chain for
debugging?"_

## Module Boundaries

```
src/
├── decision-ledger/      ← decision types, pure functions, ledger class
├── praxis-logic/         ← domain rules, workflow intents (pure, no side effects)
├── app-adapters/         ← adapter interfaces for VS Code / ADO API calls
└── praxis/application/
    └── rules/
        └── decisionRules.ts  ← Praxis rules that append decision records
```

### `decision-ledger/`

**Responsibility**: Record, store, and replay `DecisionRecord` entries.

Key exports:

- `DecisionRecord` – immutable record of a single decision
- `DecisionLedgerState` – lightweight value type stored in engine context
- `appendDecision(state, input)` – pure function; returns new state + record
- `filterByCategory(state, category)` – filter by domain category
- `replayFrom(state, fromVersion)` – replay from a checkpoint version
- `DecisionLedger` – stateful helper class for adapters and tests
- `DecisionRecordedEvent` – Praxis event emitted when a decision is recorded

### `praxis-logic/`

**Responsibility**: Export domain rules and named workflow intents. No side
effects live here.

Key exports:

- `applicationRules` – all Praxis engine rules (re-exported)
- `AUTH_INTENTS`, `WORK_ITEM_INTENTS`, `BRANCH_INTENTS`, … – const maps
  of named workflow intents used as canonical operation strings

### `app-adapters/`

**Responsibility**: Adapter interface contracts for layers that perform side
effects (VS Code API, ADO REST API). Concrete implementations dispatch Praxis
events; they do not make policy decisions.

Key exports:

- `AuthAdapter` – sign-in, sign-out, cancel device code
- `WorkItemAdapter` – create, bulk-assign
- `BranchPrAdapter` – create branch, create PR, show PRs
- `ConnectionAdapter` – load connections, refresh work items

## How Decision Recording Works

1. A mutating event (e.g. `CREATE_BRANCH`) enters the Praxis engine.
2. The **domain rule** in `connectionRules.ts` / `workItemRules.ts` / etc.
   mutates `state.context` as before (no change to existing rules).
3. A **decision rule** in `decisionRules.auth.ts` / `decisionRules.operations.ts`
   intercepts the _same_ event and calls `recordDecision(state.context, input)`,
   which mutates `state.context.decisionLedger` in place and returns the new record.
4. The `decisionLedger` field is part of `ApplicationEngineContext` and is
   therefore visible to the debug view, history engine, and tests.

## Decision Record Structure

```typescript
interface DecisionRecord {
  id: string; // unique ID
  timestamp: number; // Unix ms
  version: number; // monotonically increasing ledger version
  category: DecisionCategory; // 'auth' | 'work-item' | 'branch' | …
  operation: string; // e.g. 'branch.create' (intent-prefixed)
  connectionId?: string; // scope, if applicable
  outcome: 'allowed' | 'denied' | 'deferred';
  rationale: string; // human-readable reason
  payload?: Record<string, unknown>; // extra metadata
}
```

## Replaying Decisions for Debugging

```typescript
import { replayFrom } from './decision-ledger/index.js';

// Get all decisions recorded after a known checkpoint
const decisions = replayFrom(context.decisionLedger, checkpointVersion);
```

## Covered Mutating Operations

| Category     | Operation                                 | Praxis Event                 |
| ------------ | ----------------------------------------- | ---------------------------- |
| auth         | auth.signInEntra                          | SIGN_IN_ENTRA                |
| auth         | auth.signOutEntra                         | SIGN_OUT_ENTRA               |
| auth         | auth.success                              | AUTHENTICATION_SUCCESS       |
| auth         | auth.failed                               | AUTHENTICATION_FAILED        |
| auth         | auth.deviceCodeStart/Complete/Cancel      | `DEVICE_CODE_*`              |
| auth         | auth.authCodeFlowStart/Complete           | `AUTH_CODE_FLOW_*`           |
| work-item    | workItem.create                           | CREATE_WORK_ITEM             |
| work-item    | workItem.bulkAssign                       | BULK_ASSIGN                  |
| branch       | branch.create                             | CREATE_BRANCH                |
| pull-request | pullRequest.create                        | CREATE_PULL_REQUEST          |
| connection   | connection.load                           | CONNECTIONS_LOADED           |
| connection   | connection.select                         | CONNECTION_SELECTED / SELECT |
| lifecycle    | lifecycle.activate / lifecycle.deactivate | ACTIVATE / DEACTIVATE        |
