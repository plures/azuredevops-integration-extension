# Type-Safe State Machine Architecture Proposal

## Problem Statement

**Current Issues:**
1. ❌ State transitions validated at runtime only (extension breaks on activation)
2. ❌ No IntelliSense for valid state targets
3. ❌ Typos in state names cause complete extension failure
4. ❌ TypeScript can't catch invalid transitions
5. ❌ Hard to refactor state machines safely

**Impact:**
- Small typos break entire extension
- Slow development (no autocomplete)
- Fear of refactoring
- Runtime errors instead of compile-time errors

---

## Solution: Multi-Layer Type Safety

### Layer 1: Type-Safe State Machine DSL

Create a type-safe wrapper around XState that enforces valid transitions at compile time.

```typescript
// src/fsm/typesafe/createMachine.ts
import { createMachine as xstateCreateMachine } from 'xstate';
import type { StateNodeConfig, MachineConfig } from 'xstate';

/**
 * Type-safe state machine creator that validates transitions at compile time
 */
export function createTypeSafeMachine<
  TContext,
  TEvent extends { type: string },
  TStates extends Record<string, StateNodeConfig<TContext, TEvent>>
>(config: {
  id: string;
  types: { context: TContext; events: TEvent };
  initial: keyof TStates;
  states: TStates;
  // ... other config
}): MachineConfig<TContext, TEvent> {
  // Runtime validation
  validateMachine(config);
  
  // Return XState machine (will be validated by XState too)
  return xstateCreateMachine(config);
}

/**
 * Validates state machine structure at runtime (called during build)
 */
function validateMachine(config: any): void {
  const stateNames = Object.keys(config.states);
  
  // Validate all transitions reference valid states
  for (const [stateName, stateConfig] of Object.entries(config.states)) {
    if (stateConfig.on) {
      for (const [eventName, transition] of Object.entries(stateConfig.on)) {
        if (typeof transition === 'object' && 'target' in transition) {
          const target = transition.target as string;
          if (target && !target.startsWith('.') && !stateNames.includes(target)) {
            throw new Error(
              `Invalid transition target in state "${stateName}" for event "${eventName}": ` +
              `"${target}" does not exist. Valid states: ${stateNames.join(', ')}`
            );
          }
        }
      }
    }
  }
}
```

### Layer 2: State Schema Definition

Define state machines using a schema-first approach that can be validated and provides IntelliSense.

```typescript
// src/fsm/machines/applicationMachine.schema.ts
export const applicationMachineSchema = {
  id: 'application',
  states: {
    inactive: {
      transitions: {
        ACTIVATE: 'activating',
      },
    },
    activating: {
      transitions: {
        ACTIVATION_SUCCESS: 'active',
        ACTIVATION_FAILED: 'activation_failed',
      },
    },
    active: {
      states: {
        setup: {
          transitions: {
            SETUP_COMPLETE: 'ready',
          },
        },
        ready: {
          states: {
            idle: {
              transitions: {
                REFRESH_DATA: 'loadingData',
                CONNECTION_ESTABLISHED: 'loadingData',
                SET_QUERY: 'loadingData', // ✅ TypeScript knows this is valid
              },
            },
            loadingData: {
              transitions: {
                // onDone -> idle (handled by invoke)
              },
            },
          },
        },
      },
    },
  },
} as const;

// Generate types from schema
export type ApplicationState = typeof applicationMachineSchema;
export type ApplicationStateName = keyof ApplicationState['states'];
```

### Layer 3: Build-Time Validation Script

Enhance the validation script to actually create machines and catch runtime errors.

```typescript
// scripts/validate-xstate-machines.ts (enhanced)
import { createActor } from 'xstate';
import * as vscodeMock from './mocks/vscode-mock';

async function validateMachineFile(filePath: string) {
  // Mock VS Code dependencies
  global.vscode = vscodeMock;
  
  try {
    // Dynamically import and create the machine
    const module = await import(filePath);
    const machine = module.applicationMachine; // or detect export
    
    // Actually create an actor - this will validate the machine structure
    const actor = createActor(machine);
    actor.start();
    
    // Test all transitions are valid
    validateAllTransitions(machine);
    
  } catch (error) {
    if (error.message.includes('does not exist')) {
      throw new Error(`Invalid state transition: ${error.message}`);
    }
    throw error;
  }
}
```

### Layer 4: Type-Safe Transition Helpers

Create helper functions that provide IntelliSense for valid transitions.

```typescript
// src/fsm/typesafe/transitions.ts
type StateTransitions<T> = {
  [K in keyof T]: T[K] extends { transitions: infer U } ? U : never;
};

export function createTransitionHelper<T extends StateMachineSchema>(
  schema: T
): <S extends keyof T['states'], E extends keyof StateTransitions<T['states'][S]>>(
  state: S,
  event: E
) => StateTransitions<T['states'][S]>[E] {
  return (state, event) => {
    // TypeScript ensures state and event are valid
    return schema.states[state].transitions[event];
  };
}

// Usage:
const transition = createTransitionHelper(applicationMachineSchema);
const target = transition('ready.idle', 'SET_QUERY'); // ✅ IntelliSense works!
```

### Layer 5: Code Generation

Generate type-safe wrappers from machine definitions.

```typescript
// scripts/generate-fsm-types.ts
import { generateTypesFromMachine } from './fsm-codegen';

// Generate types from machine definition
generateTypesFromMachine('src/fsm/machines/applicationMachine.ts', {
  output: 'src/fsm/machines/applicationMachine.types.ts',
  generateHelpers: true,
  generateValidators: true,
});
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
1. ✅ Create type-safe machine wrapper
2. ✅ Add build-time validation that creates machines
3. ✅ Create VS Code mock for validation
4. ✅ Update compile script to run validation

### Phase 2: Schema Definition (Week 2)
1. ✅ Extract state schemas from existing machines
2. ✅ Create schema-to-machine converter
3. ✅ Generate types from schemas
4. ✅ Migrate one machine as proof of concept

### Phase 3: Developer Experience (Week 3)
1. ✅ Create transition helper functions
2. ✅ Add IntelliSense support
3. ✅ Create ESLint rules for state transitions
4. ✅ Document new patterns

### Phase 4: Migration (Week 4)
1. ✅ Migrate all machines to type-safe versions
2. ✅ Remove old patterns
3. ✅ Update tests
4. ✅ Update documentation

---

## Benefits

### Immediate
- ✅ **Compile-time errors** instead of runtime failures
- ✅ **IntelliSense** for valid state transitions
- ✅ **Refactoring safety** - TypeScript catches broken references
- ✅ **Faster development** - autocomplete works

### Long-term
- ✅ **Confidence** - Can't break extension with typos
- ✅ **Documentation** - Schema serves as living documentation
- ✅ **Testing** - Can generate test cases from schema
- ✅ **Visualization** - Can generate state diagrams from schema

---

## Example: Before vs After

### Before (Current - Runtime Error)
```typescript
SET_QUERY: {
  actions: 'setActiveQuery',
  target: 'loadingData', // ❌ Typo - breaks at runtime
},
```

### After (Proposed - Compile Error)
```typescript
SET_QUERY: {
  actions: 'setActiveQuery',
  target: transition('ready.idle', 'SET_QUERY'), // ✅ TypeScript validates
},
// OR using schema:
SET_QUERY: {
  actions: 'setActiveQuery',
  target: schema.states.active.states.ready.states.idle.transitions.SET_QUERY,
  // ✅ IntelliSense shows: 'loadingData' | 'idle' | ...
},
```

---

## Next Steps

1. **Create proof of concept** - Implement Layer 1 for one machine
2. **Validate approach** - Test with real development workflow
3. **Get feedback** - Ensure it solves the problem
4. **Roll out** - Migrate machines incrementally

---

## Questions to Answer

1. Should we use code generation or runtime type checking?
2. How do we handle nested states (e.g., `active.ready.loadingData`)?
3. Should we create a custom DSL or enhance XState types?
4. How do we handle dynamic state creation (connection machines)?

---

## References

- [XState TypeScript Guide](https://stately.ai/docs/typescript)
- [Type-Safe State Machines](https://github.com/davidkpiano/xstate/discussions)
- [Stately Studio](https://stately.ai/studio) - Visual state machine editor

