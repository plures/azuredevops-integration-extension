# FSM-First Development Rules

## Core Principles

### 1. **FSM-First Architecture**
- **ALL business logic MUST go through the FSM**
- Never bypass FSM state machines for core application flows
- Use FSM context for data passing between operations
- Every significant operation should be a state transition

### 2. **Traceability and Replayability**
- **Everything in FSM context gets automatically traced**
- Put data in context for automatic logging and debugging
- Design for deterministic state transitions
- Enable replay of user sessions from FSM logs

### 3. **Functional Programming Style**
- **Single-purpose, pure functions**
- Minimize side effects
- Prefer immutable data structures
- Use function composition over imperative chains

### 4. **Small, Focused Functions**
- **One responsibility per function**
- Functions should be easily testable
- Compose complex operations from simple functions
- Maximum 20-30 lines per function

## Implementation Rules

### FSM Context Usage

#### ✅ DO: Put data in FSM context
```typescript
// FSM context automatically traces all data
const context: ConnectionContext = {
  connectionId: 'conn-123',
  config: { organization: 'myorg', project: 'myproject' },
  credential: token,
  // This data is automatically logged and traceable
};

// Pass through FSM
connectionMachine.send({
  type: 'AUTHENTICATE',
  context
});
```

#### ❌ DON'T: Bypass FSM with direct function calls
```typescript
// This bypasses tracing and context
const result = await directApiCall(token, url);
```

### Function Design

#### ✅ DO: Single-purpose functions with FSM context
```typescript
async function validateOrganization(context: ConnectionContext): Promise<ValidationResult> {
  const { organization, baseUrl } = context.config;
  
  return {
    isValid: !!organization,
    normalizedUrl: normalizeUrl(baseUrl),
    context // Return context for FSM chaining
  };
}
```

#### ❌ DON'T: Multi-purpose functions with side effects
```typescript
async function validateAndConnect(org: string, token: string) {
  // Multiple responsibilities + side effects
  const isValid = validateOrg(org);
  const client = createClient(token);
  await client.connect();
  updateUI();
}
```

### Data Flow Patterns

#### ✅ DO: FSM-driven data flow
```typescript
// All data flows through FSM context
connectionMachine
  .provide({
    actors: {
      validateConfig: fromPromise(({ input }) => validateConfiguration(input)),
      authenticate: fromPromise(({ input }) => performAuthentication(input)),
      createClient: fromPromise(({ input }) => createAzureClient(input))
    }
  })
```

#### ❌ DON'T: Direct function chains
```typescript
// Bypasses FSM context and tracing
const result = await validateConfig(config)
  .then(createAuth)
  .then(createClient)
  .then(connect);
```

## Traceability Requirements

### Automatic Tracing via Context

When data is in FSM context, it's automatically traced:

```typescript
const connectionContext: ConnectionContext = {
  connectionId: 'user-connection-1',
  config: {
    organization: 'myorg',
    project: 'myproject',
    baseUrl: 'https://dev.azure.com/myorg'
  },
  authMethod: 'entra',
  // All this data appears in FSM logs automatically
};
```

### Manual Logging Only for Implementation Details

```typescript
async function discoverTenant(organizationUrl: string, context: FSMContext): Promise<string> {
  // Use FSM logging for implementation details
  const fsmContext = { component: FSMComponent.AUTH, connectionId: context.connectionId };
  
  logger.debug('Starting tenant discovery', fsmContext, {
    organizationUrl,
    requestType: 'tenant-info'
  });
  
  // Business logic
  const tenant = await callTenantAPI(organizationUrl);
  
  logger.info('Tenant discovered', fsmContext, { 
    discoveredTenant: tenant,
    organizationUrl 
  });
  
  return tenant;
}
```

## Code Organization Rules

### 1. FSM Machines (Business Logic)
- Located in `src/fsm/machines/`
- Handle all business state transitions
- Use `fromPromise` actors for async operations
- Pass data via context

### 2. Pure Functions (Implementation)
- Located in `src/fsm/functions/` or `src/utils/`
- Stateless, single-purpose functions
- Take FSM context as input
- Return results for FSM processing

### 3. Providers/Clients (External Integrations)
- Located in `src/auth/`, `src/azure/`, etc.
- Handle external API calls
- Should be called FROM FSM actors, not directly
- Accept FSM context for traceability

## Migration Strategy

### Phase 1: Identify Non-FSM Code
Look for these anti-patterns:
- Direct async chains `.then().then()`
- Functions that don't use FSM context
- Business logic outside FSM machines
- Manual state management

### Phase 2: Extract Pure Functions
```typescript
// Before: Mixed responsibilities
async function connectToProject(org: string, project: string, token: string) {
  const client = new AzureClient(token);
  const isValid = await client.validateProject(org, project);
  if (isValid) {
    await client.connect();
    updateUI('connected');
  }
}

// After: Pure functions + FSM coordination
async function validateProject(context: ConnectionContext): Promise<ValidationResult> {
  const { organization, project } = context.config;
  // Pure validation logic
}

async function createAzureClient(context: ConnectionContext): Promise<AzureClient> {
  // Pure client creation
}

// FSM coordinates the flow
connectionMachine.send({ type: 'VALIDATE_PROJECT', context });
```

### Phase 3: Move Logic to FSM
```typescript
const connectionMachine = createMachine({
  context: ({ input }) => ({
    connectionId: input.connectionId,
    config: input.config,
    credential: null,
    client: null
  }),
  states: {
    validating: {
      invoke: {
        src: 'validateProject',
        input: ({ context }) => context,
        onDone: { target: 'authenticated', actions: 'updateContext' }
      }
    }
  }
});
```

## Benefits of FSM-First Development

### 1. **Complete Traceability**
- Every operation is logged with context
- Can replay user sessions from logs
- Easy debugging of complex flows

### 2. **Predictable State Management**
- No hidden state mutations
- Clear state transitions
- Deterministic behavior

### 3. **Testability**
- Pure functions are easy to test
- FSM states can be tested independently
- Context provides clear test inputs

### 4. **Maintainability**
- Single source of truth for business logic
- Clear separation of concerns
- Easy to add new features

## Enforcement

### Code Review Checklist
- [ ] Business logic goes through FSM?
- [ ] Data passed via FSM context?
- [ ] Functions are single-purpose?
- [ ] No direct async chains bypassing FSM?
- [ ] Proper FSM logging used?

### Automated Checks
- ESLint rules for FSM patterns
- TypeScript strict mode
- Test coverage requirements
- FSM context type checking

## Examples

### ✅ Good: FSM-First Authentication
```typescript
// FSM machine coordinates the flow
const authMachine = createMachine({
  context: ({ input }) => ({
    connectionId: input.connectionId,
    authMethod: input.authMethod,
    config: input.config,
    credential: null
  }),
  states: {
    authenticating: {
      invoke: {
        src: 'performAuthentication',
        input: ({ context }) => context,
        onDone: { target: 'authenticated', actions: 'storeCredential' }
      }
    }
  }
});

// Pure function for implementation
async function performAuthentication(context: AuthContext): Promise<AuthResult> {
  if (context.authMethod === 'entra') {
    return performEntraAuth(context);
  } else {
    return performPATAuth(context);
  }
}
```

### ❌ Bad: Direct Function Chains
```typescript
// Bypasses FSM, no traceability
export async function authenticateUser(connectionId: string, authMethod: string) {
  const config = getConfig(connectionId);
  const provider = createProvider(authMethod);
  const token = await provider.authenticate();
  const client = new AzureClient(token);
  return client;
}
```

---

**Remember: If it's not in FSM context, it's not traced. If it's not traced, it's hard to debug.**