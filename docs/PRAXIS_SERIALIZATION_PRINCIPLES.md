# Praxis Serialization Principles

## Critical Rule: Serialization Must Be Transparent

**Serialization code should serialize what's in the context, not make business decisions about what to include or exclude.**

## Why This Matters

### 1. Context Shape is a Contract

The context shape is a contract between:
- **Praxis Rules** (which populate the context)
- **Components** (which consume the context)
- **Serialization** (which transfers context across boundaries)

If serialization filters or transforms data, it breaks this contract. Components expect certain fields to exist with certain shapes.

### 2. Business Logic Belongs in Rules

**❌ WRONG**: Filtering connection states in serialization
```typescript
// BAD: Making business decisions in serialization
if (Object.keys(connectionStatesObj).length > 0) {
  serialized.connectionStates = connectionStatesObj;
}
```

**✅ CORRECT**: Let rules decide what goes in context
```typescript
// GOOD: Serialize what's in context, period
serialized.connectionStates = context.connectionStates 
  ? Object.fromEntries(context.connectionStates) 
  : {};
```

If we want to optimize what goes into the context, we should:
1. Create a Praxis rule that filters/optimizes the context
2. Let components react to the optimized context
3. Serialize the optimized context transparently

### 3. Components React to Context Properties

The fact that a connection is `disconnected` is a **property** that components need to react to. If we omit disconnected connections from `connectionStates`, components can't:
- Show connection status indicators
- Display "Sign in required" messages
- Iterate over all connections to show tabs
- React to connection state changes

### 4. Future Developers Depend on Shape

Future developers will write code that:
- Iterates over `connectionStates` expecting all connections
- Checks `connectionStates.get(connectionId)` expecting it to exist
- Derives UI state from connection properties

If serialization filters data, this code will break in subtle ways.

## What Serialization SHOULD Do

### ✅ Serialize Transparently

```typescript
// Serialize what's in context - no filtering, no business logic
const serialized = {
  connectionStates: context.connectionStates 
    ? Object.fromEntries(context.connectionStates) 
    : {},
  workItems: context.pendingWorkItems?.workItems || [],
  // ... serialize all fields as they exist in context
};
```

### ✅ Handle Type Conversions Only

Serialization can convert types (Map → Object, Date → number) but shouldn't filter:
```typescript
// OK: Converting Map to Object for JSON serialization
connectionStates: context.connectionStates 
  ? Object.fromEntries(context.connectionStates) 
  : {}

// OK: Converting Date to number
expiresAt: context.deviceCodeSession.expiresAt

// NOT OK: Filtering based on business logic
if (connectionStates.length > 0) { ... } // ❌ Business logic
```

### ✅ Provide Defaults for Missing Fields

```typescript
// OK: Providing defaults for optional fields
connections: context.connections || [],
connectionStates: context.connectionStates ? Object.fromEntries(...) : {},
```

## What Serialization SHOULD NOT Do

### ❌ Filter Based on Business Logic

```typescript
// BAD: Filtering empty arrays
if (workItems.length > 0) {
  serialized.workItems = workItems;
}

// BAD: Filtering inactive connections
if (connectionState.isConnected) {
  serialized.connectionStates[connectionId] = connectionState;
}
```

### ❌ Make Decisions About What's "Meaningful"

```typescript
// BAD: Deciding what's meaningful
if (context.errorRecoveryAttempts > 0) {
  serialized.errorRecoveryAttempts = context.errorRecoveryAttempts;
}

// Components need to know if errorRecoveryAttempts is 0!
```

### ❌ Optimize Payload Size by Omitting Data

If payload size is a concern:
1. **Optimize in Rules**: Create rules that don't populate unnecessary data
2. **Use Context Selectors**: If Praxis supports it, use selectors to only serialize relevant parts
3. **Don't Break the Contract**: Never omit data that components expect

## Exception: Matches Object

The `matches` object is a **computed view** of state, not part of the core context. Filtering false matches is acceptable because:
- It's a derived/computed value, not core context
- Components can recompute matches from state if needed
- It's purely for convenience/performance

```typescript
// OK: Filtering computed/derived values
const matches: Record<string, boolean> = {};
for (const [key, value] of Object.entries(allMatches)) {
  if (value === true) {
    matches[key] = true; // Only include true matches
  }
}
```

## Lesson Learned

**When optimizing serialization:**
1. ✅ Ask: "Is this filtering business logic?" → If yes, move to rules
2. ✅ Ask: "Do components depend on this shape?" → If yes, don't filter
3. ✅ Ask: "Is this a computed/derived value?" → If yes, filtering may be OK
4. ✅ Ask: "Will future developers expect this?" → If yes, include it

**The Golden Rule:**
> **Serialization should be a transparent pipe. If you want to change what flows through it, change the source (rules), not the pipe (serialization).**

## Related Principles

- **Single Source of Truth**: Context is the source of truth, not serialization
- **Separation of Concerns**: Business logic in rules, serialization is just transport
- **Contract Stability**: Context shape is a contract - don't break it
- **Reactive Architecture**: Components react to context - they need the full picture

---

**Created**: 2025-01-27  
**Reason**: Learned from mistake of filtering connection states in serialization  
**Status**: Core Principle - Do Not Violate


