# Praxis Redesign Plan: "Ground Up" for Visualization & Type Safety

## 1. Vision

To transform the current "Code-First" Praxis implementation into a "Schema-Driven" or "Strictly-Typed Code-First" architecture that is:

- **Visualizable**: The logic flow is obvious in CodeCanvas.
- **Type-Safe**: The compiler prevents invalid states and transitions.
- **Reactive**: UI updates are purely event-driven.
- **Unambiguous**: Events and States have distinct, semantic names (solving the `ACTIVATION_FAILED` vs `activation_failed` confusion).

## 2. Core Problems Identified

1.  **Naming Collisions**: `ACTIVATION_FAILED` (Event) vs `activation_failed` (Legacy State) vs `error_recovery` (Praxis State).
2.  **Legacy Glue**: `activation.ts` and `App.svelte` rely on string-matching legacy state names.
3.  **Manual Boilerplate**: `engine.ts` manually constructs context instead of deriving it from a schema definition.
4.  **Opaque Logic**: Some logic is hidden in "Managers" rather than being explicit "Rules".

## 3. Redesign Strategy

### Phase 1: Semantic Naming & Schema Cleanup

- **Objective**: Eliminate ambiguity.
- **Actions**:
  - Rename Event: `ACTIVATION_FAILED` -> `APP_ACTIVATION_FAILED`.
  - Rename State: `error_recovery` -> `ActivationError` (PascalCase for States, SCREAMING_SNAKE for Events).
  - Update `praxis.json` to reflect these changes.

### Phase 2: Type System Leverage

- **Objective**: Make invalid states unrepresentable.
- **Actions**:
  - Define a `PraxisSchema` interface that drives the engine.
  - Use TypeScript Discriminated Unions for Events and States.
  - Remove `any` casts in `manager.ts`.

### Phase 3: Reactive Integration

- **Objective**: Remove manual polling/glue.
- **Actions**:
  - Expose a `store` (Svelte 5 Rune or Observable) directly from the Praxis Engine.
  - Bind UI components directly to this reactive store.
  - Remove the `matches()` shim once the UI is updated to use the new State names.

### Phase 4: Visualization First

- **Objective**: "If you can't draw it, you can't code it."
- **Actions**:
  - Ensure every Rule has a clear `on` (Event), `guards` (Conditions), and `mutations` (State Changes).
  - Verify the graph in CodeCanvas.

## 4. Immediate Next Steps

1.  **Refactor `lifecycleRules.ts`**: Rename states/events for clarity.
2.  **Update `manager.ts`**: Remove the compatibility shim and update the snapshot type.
3.  **Update Consumers**: Fix `activation.ts` and `App.svelte` to use the new, correct state names.
