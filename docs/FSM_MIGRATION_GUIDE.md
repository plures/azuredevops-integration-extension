# FSM-First Migration Guide

## Overview

This guide helps migrate existing code to follow FSM-first development principles for better traceability, maintainability, and debugging.

## Migration Process

### Step 1: Identify Anti-Patterns

Run ESLint to find code that violates FSM-first principles:

```bash
npm run lint
```

Look for these patterns in the codebase:

#### 🚨 Direct Client Creation (High Priority)

```typescript
// ❌ Anti-pattern: Direct client creation bypasses FSM
state.client = new AzureDevOpsIntClient(
  connection.organization,
  connection.project,
  credential!,
  options
);

// ✅ FSM-first: Use connectionMachine
const result = await connectionMachine.send({
  type: 'CONNECT',
  context: connectionContext,
});
```

#### 🚨 Promise Chains (High Priority)

```typescript
// ❌ Anti-pattern: Promise chains bypass FSM context
const result = await validateConfig(config).then(createAuth).then(createClient).then(connect);

// ✅ FSM-first: Use state machine coordination
connectionMachine.send({ type: 'VALIDATE_CONFIG', context });
```

#### 🚨 Functions Without FSM Context (Medium Priority)

```typescript
// ❌ Anti-pattern: No FSM context for traceability
async function authenticateUser(connectionId: string, authMethod: string) {
  // Implementation lost in function calls
}

// ✅ FSM-first: Accept FSM context for traceability
async function authenticateUser(context: ConnectionContext): Promise<AuthResult> {
  const fsmContext = { component: FSMComponent.AUTH, connectionId: context.connectionId };
  fsmLogger.debug(FSMComponent.AUTH, 'Starting authentication', fsmContext, {
    authMethod: context.authMethod,
    organization: context.config.organization,
  });
  // Implementation details are now traced
}
```

### Step 2: Extract Pure Functions

#### Before: Mixed Responsibilities

```typescript
async function ensureActiveConnection(connectionId: string) {
  // Validation logic
  const connection = getConnection(connectionId);
  if (!connection) throw new Error('Connection not found');

  // Authentication logic
  let credential;
  if (connection.authMethod === 'entra') {
    credential = await performEntraAuth(connection);
  } else {
    credential = await getPAT(connectionId);
  }

  // Client creation logic
  const client = new AzureDevOpsIntClient(
    connection.organization,
    connection.project,
    credential,
    options
  );

  // State mutation
  connectionStates.set(connectionId, { connection, client, credential });
}
```

#### After: Pure Functions + FSM Coordination

```typescript
// Pure function for validation
async function validateConnection(context: ConnectionContext): Promise<ValidationResult> {
  const fsmContext = { component: FSMComponent.CONNECTION, connectionId: context.connectionId };
  fsmLogger.debug(FSMComponent.CONNECTION, 'Validating connection', fsmContext);

  if (!context.config.organization) {
    return { isValid: false, error: 'Organization required', context };
  }

  return { isValid: true, context };
}

// Pure function for client creation
async function createAzureClient(context: ConnectionContext): Promise<ClientResult> {
  const { validateClientConfig, createAzureClient } = await import(
    '../functions/azureClientFunctions.js'
  );

  const validation = await validateClientConfig(context);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
  }

  return await createAzureClient(context, validation.config!);
}

// FSM coordinates the flow
const connectionMachine = createMachine({
  context: ({ input }) => input,
  states: {
    validating: {
      invoke: {
        src: 'validateConnection',
        input: ({ context }) => context,
        onDone: { target: 'authenticating', actions: 'updateContext' },
        onError: { target: 'failed', actions: 'setError' },
      },
    },
    authenticating: {
      invoke: {
        src: 'performAuthentication',
        input: ({ context }) => context,
        onDone: { target: 'creatingClient', actions: 'storeCredential' },
      },
    },
    creatingClient: {
      invoke: {
        src: 'createAzureClient',
        input: ({ context }) => context,
        onDone: { target: 'connected', actions: 'storeClient' },
      },
    },
  },
});
```

### Step 3: Update Function Signatures

#### Before: Primitive Parameters

```typescript
async function createClient(org: string, project: string, token: string, baseUrl?: string) {
  // Multiple parameters, no context
}
```

#### After: FSM Context Parameter

```typescript
async function createClient(context: ConnectionContext): Promise<ClientResult> {
  const fsmContext = { component: FSMComponent.CONNECTION, connectionId: context.connectionId };
  // Single context parameter with all data traced automatically
}
```

### Step 4: Replace Manual Logging

#### Before: Manual String Interpolation

```typescript
console.log(`🔐 Creating client for ${connectionId} with ${authMethod}`);
logger.debug(`Client options: ${JSON.stringify(options)}`);
```

#### After: Structured FSM Logging

```typescript
fsmLogger.debug(FSMComponent.CONNECTION, 'Creating client', fsmContext, {
  authMethod: context.authMethod,
  organization: context.config.organization,
  hasBaseUrl: !!context.config.baseUrl,
});
```

## Migration Checklist

### For Each Function:

- [ ] Does it accept FSM context as a parameter?
- [ ] Does it use FSM logging for implementation details?
- [ ] Is it a pure function with no side effects?
- [ ] Does it return structured results for FSM processing?
- [ ] Is it under 30 lines (single responsibility)?

### For Each Async Operation:

- [ ] Is it coordinated by an FSM machine?
- [ ] Does it use `fromPromise` actors instead of direct async calls?
- [ ] Are errors handled by FSM state transitions?
- [ ] Is the data flow traceable through FSM context?

### For Each Business Flow:

- [ ] Is the entire flow managed by an FSM machine?
- [ ] Are state transitions explicit and predictable?
- [ ] Can the flow be replayed from FSM logs?
- [ ] Are complex conditions handled by guards and actions?

## Common Migration Patterns

### Pattern 1: Convert Direct Calls to FSM Actors

```typescript
// Before
const result = await someAsyncOperation(param1, param2);

// After
const machine = createMachine({
  // ... machine definition
  states: {
    operating: {
      invoke: {
        src: 'performOperation',
        input: ({ context }) => context,
        onDone: { target: 'completed', actions: 'storeResult' },
      },
    },
  },
});
```

### Pattern 2: Extract Configuration to Context

```typescript
// Before
function processData(id: string, options: any, settings: any) {
  // Multiple parameters
}

// After
interface ProcessContext {
  connectionId: string;
  config: ProcessConfig;
  settings: ProcessSettings;
}

function processData(context: ProcessContext): Promise<ProcessResult> {
  // Single context parameter
}
```

### Pattern 3: Replace Error Handling with State Transitions

```typescript
// Before
try {
  const result = await operation();
  updateUI(result);
} catch (error) {
  showError(error);
}

// After
const machine = createMachine({
  states: {
    processing: {
      invoke: {
        src: 'performOperation',
        onDone: { target: 'success', actions: 'updateUI' },
        onError: { target: 'error', actions: 'handleError' },
      },
    },
  },
});
```

## Testing FSM-First Code

### Unit Testing Pure Functions

```typescript
describe('validateConnection', () => {
  it('should validate connection config', async () => {
    const context: ConnectionContext = {
      connectionId: 'test-1',
      config: { organization: 'myorg', project: 'myproject' },
      credential: null,
    };

    const result = await validateConnection(context);
    expect(result.isValid).to.be.true;
    expect(result.context).to.equal(context);
  });
});
```

### Integration Testing FSM Machines

```typescript
describe('connectionMachine', () => {
  it('should handle connection flow', (done) => {
    const actor = createActor(connectionMachine, {
      input: testContext,
    });

    actor.subscribe((state) => {
      if (state.matches('connected')) {
        expect(state.context.client).to.exist;
        done();
      }
    });

    actor.start();
    actor.send({ type: 'CONNECT' });
  });
});
```

## Benefits After Migration

### 🔍 Complete Traceability

- Every operation logged with structured context
- Can replay user sessions from FSM logs
- Clear audit trail for debugging

### 🧪 Better Testability

- Pure functions easy to unit test
- FSM states can be tested independently
- Deterministic behavior

### 🔧 Easier Maintenance

- Single source of truth for business logic
- Clear separation of concerns
- Predictable state management

### 🚀 Enhanced Debugging

- Rich context in every log entry
- Visual FSM state transitions
- Automated error recovery paths

## Migration Priority

1. **High Priority**: Authentication flows, client creation
2. **Medium Priority**: Data fetching, configuration validation
3. **Low Priority**: UI updates, utility functions

Start with the most critical business flows and work outward to supporting functions.
