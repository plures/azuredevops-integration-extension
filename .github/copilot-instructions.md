# GitHub Copilot Instructions

This file provides instructions for GitHub Copilot coding agent to work effectively with this repository. It contains repository-specific knowledge, build commands, testing procedures, and architectural guidelines.

## Project Structure & Context

This workspace contains three distinct but interrelated projects:

1.  **VS Code Extension** (Root): The main product, currently transitioning from legacy FSMs to Praxis.
2.  **Tauri App** (`apps/app-desktop`): A desktop application built with SvelteKit and Tauri, also using Praxis.
3.  **Praxis Framework** (`praxis`): The underlying logic engine and framework.

**CRITICAL**: We are "dogfooding" Praxis. The extension and app are the primary consumers of the Praxis framework.

- If you encounter limitations in the logic engine, **improve Praxis first**, then consume the changes in the apps.
- Treat `praxis/` as a first-class citizen in this workspace.

## Vision: The Praxis Way

We are moving AWAY from "legacy think" (monolithic FSMs, untraceable side effects) and TOWARDS **Praxis**:

- **Reactive & Functional**: Logic is composed of pure functions (Rules) that react to Events and update Facts.
- **Type-Safe**: Use the type system to prevent logic errors at compile time.
- **Visualizable**: Logic must be designed to be visualized in **CodeCanvas**. If it can't be visualized, it's too complex.
- **Schema-Driven**: The **Praxis Schema Format (PSF)** is the source of truth.
- **Granular & Event-Sourced**: State is derived from atomic events, not pre-computed aggregates. Code is organized in small, single-feature files.

## Architectural Principles (PRAXIS-FIRST)

1.  **Logic in Praxis**: All business logic belongs in Praxis definitions (Facts, Rules, Flows), not in UI components or raw event handlers.
2.  **Pure Functions**: Rules must be pure functions. Side effects are segregated into **Actors** or **Flows**.
3.  **Testable Facts**: State is represented by **Facts**. Logic is verified by asserting on Facts.
4.  **No Hidden State**: All application state must be visible and traceable through the Praxis engine.
5.  **Canvas-Ready**: Design logic as if you were drawing it on a canvas. Use clear, distinct Actors and Events.
6.  **Optimize for Local Reasoning**: Decompose code into small, single-feature files and state into raw, atomic events. Avoid monolithic contexts and pre-computed aggregates; derive the whole from the parts.

## Critical Thinking Checklist (MANDATORY)

**BEFORE implementing any logic, ask:**

1.  **"Is this logic visualizable?"** - Can I draw this flow in CodeCanvas?
2.  **"Is this a pure rule?"** - Does it just transform data, or does it have side effects? (Keep side effects separate!)
3.  **"Should this be in the Framework?"** - Is this a generic pattern that belongs in `praxis`?
4.  **"Am I using Legacy Think?"** - Am I just adding `state: 'processing'` to a giant object, or am I defining a Rule?

## AI Agent Quick Start

### 1. Big Picture & Navigation

- **Extension Logic**: `src/` (Legacy FSMs in `src/fsm/`, transitioning to Praxis).
- **Praxis Core**: `praxis/src/` (The logic engine).
- **Tauri App**: `apps/app-desktop/src/` (Desktop UI).
- **Extension Lifecycle**: `src/activation.ts` — Entry point.
- **Azure Client**: `src/azureClient.ts` — Azure DevOps REST client patterns.

### 2. Developer Workflows

- **Install & Prepare**: `npm ci` then `npm run prepare`.
- **Build Extension**: `npm run build` or `npm run watch`.
- **Build Praxis**: `cd praxis && npm run build`.
- **Build Tauri**: `cd apps/app-desktop && npm run tauri build`.
- **Test Extension**: `npm test` (Unit) or `npm run test:integration`.

### 3. Working with Legacy Code (`src/fsm`)

The VS Code extension currently uses XState-based FSMs.

- **Refactor to Praxis**: When modifying legacy logic, prefer refactoring to Praxis patterns (Facts/Rules).
- **Strict Purity**: If you must use the legacy FSM, ensure all logic is in **pure functions** in `src/fsm/functions/`.
- **Migration**: Look for opportunities to replace FSM states with Praxis Rules and Constraints.

### 4. Working with Praxis (`praxis/`)

- **Improve the Framework**: Don't hack around framework limitations. Fix them in `praxis/src`.
- **Follow the Schema**: Respect the PSF structure defined in `praxis/README.md`.

### 5. Safe Edit Patterns

- **Adding Business Logic**:
  1.  **Create a Feature File**: Do not add to monolithic files. Create `src/praxis/application/features/[feature].ts`.
  2.  **Define Atomic Events**: Define the raw events (e.g., `Start`, `Stop`) rather than derived state.
  3.  **Define Facts**: Define the history/log of events.
  4.  **Write Pure Rules**: Derive current state from the event history.
  5.  **Visualize**: Ensure the flow is drawable.
- **Modifying Extension**:
  - Do NOT edit built artifacts (`dist/`, `media/webview/main.js`).
  - Edit source in `src/` or `src/webview/` and rebuild.

## Reference

- **Praxis Documentation**: `praxis/README.md`
- **Legacy FSM Rules**: `docs/FSM_FIRST_DEVELOPMENT_RULES.md` (Use only for legacy maintenance)
