# Praxis v1.1.3 Optimizations - Revised

## Critical Correction

**Original optimization attempted to filter connection states in serialization - this was WRONG.**

See `docs/PRAXIS_SERIALIZATION_PRINCIPLES.md` for the core principle: **Serialization must be transparent.**

## What Was Wrong

### ❌ Filtering Connection States
```typescript
// WRONG: Filtering based on business logic
const connectionStatesObj = context.connectionStates ? Object.fromEntries(...) : {};
if (Object.keys(connectionStatesObj).length > 0) {
  serialized.connectionStates = connectionStatesObj;
}
```

**Why this is wrong:**
- Components depend on `connectionStates` having entries for ALL connections
- The fact that a connection is `disconnected` is a property components need to react to
- Future developers expect the context shape to be consistent
- Business logic doesn't belong in serialization - it belongs in Praxis rules

### ❌ Filtering Empty Arrays/Objects
```typescript
// WRONG: Deciding what's "meaningful"
if (workItems.length > 0) {
  serialized.workItems = workItems;
}
```

**Why this might be wrong:**
- Components may need to know that `workItems` is an empty array (not undefined)
- Empty arrays/objects are meaningful - they represent "no items" vs "unknown"
- Consistency matters - always include the field

## What Was Correct

### ✅ Matches Object Filtering
```typescript
// OK: Filtering computed/derived values
const matches: Record<string, boolean> = {};
for (const [key, value] of Object.entries(allMatches)) {
  if (value === true) {
    matches[key] = true; // Only include true matches
  }
}
```

**Why this is OK:**
- `matches` is a computed/derived value, not core context
- Components can recompute matches from state if needed
- It's purely for convenience/performance
- Doesn't break the context shape contract

### ✅ Connection Deduplication
```typescript
// OK: Preventing duplicates at the source (normalization)
const dedupeKey = `${org}|${project}|${baseUrl}`;
if (seen.has(dedupeKey)) {
  deduplicated++;
  continue; // Don't add duplicate
}
```

**Why this is OK:**
- Happens at the source (normalization), not in serialization
- Prevents bad data from entering context
- Doesn't break context shape - just ensures quality

### ✅ Command Registration Logging Optimization
```typescript
// OK: Reducing log verbosity (not changing behavior)
logger.info(`Registered ${disposables.length} commands in ${duration}ms`);
```

**Why this is OK:**
- Doesn't affect context or serialization
- Just reduces log noise
- No business logic involved

## Revised Optimizations

### ✅ Kept: Matches Filtering
- Only send `true` matches
- Reduces payload size without breaking contracts
- Components can recompute if needed

### ✅ Kept: Connection Deduplication
- Prevents duplicates at source
- Ensures data quality
- Doesn't affect serialization

### ✅ Kept: Command Registration Logging
- Reduces log verbosity
- No impact on context/serialization

### ❌ Reverted: Connection State Filtering
- **REVERTED**: Now serializes all connection states
- Components depend on full connection state map
- Business logic belongs in rules, not serialization

### ❌ Reverted: Empty Array/Object Filtering
- **REVERTED**: Now serializes empty arrays/objects
- Components need to distinguish between "empty" and "undefined"
- Consistency matters for context shape

## Correct Approach to Optimization

If we want to optimize payload size:

### Option 1: Optimize in Rules (Recommended)
Create Praxis rules that don't populate unnecessary data:
```typescript
// In a Praxis rule
if (connection.isConnected) {
  // Only populate connection state if connected
  // But still initialize disconnected state for all connections
}
```

### Option 2: Use Context Selectors
If Praxis supports it, use selectors to serialize only relevant parts:
```typescript
// Hypothetical - if Praxis supports this
const webviewContext = selectWebviewContext(fullContext);
serialize(webviewContext);
```

### Option 3: Accept the Payload Size
If optimization isn't critical, accept the payload size. The benefits of:
- Consistent context shape
- Predictable behavior
- Easier debugging
- Future-proof code

May outweigh the cost of larger payloads.

## Key Learnings

1. **Serialization is transport, not business logic**
   - Serialize what's in context, period
   - Don't make decisions about what to include/exclude

2. **Context shape is a contract**
   - Components depend on certain fields existing
   - Future developers expect consistency
   - Breaking the contract causes subtle bugs

3. **Business logic belongs in rules**
   - If you want to optimize, do it in rules
   - Let components react to optimized context
   - Serialize the optimized context transparently

4. **Empty is meaningful**
   - Empty arrays/objects represent "no items"
   - Undefined represents "unknown"
   - Components need to distinguish these

5. **Computed values can be filtered**
   - Derived/computed values (like `matches`) can be optimized
   - Core context fields cannot be filtered
   - When in doubt, include it

## Status

- ✅ Matches filtering: **KEPT** (computed value)
- ✅ Connection deduplication: **KEPT** (source optimization)
- ✅ Command logging: **KEPT** (no impact on context)
- ❌ Connection state filtering: **REVERTED** (broke contract)
- ❌ Empty array/object filtering: **REVERTED** (broke contract)

---

**Revised**: 2025-01-27  
**Reason**: Learned that serialization must be transparent  
**Status**: Corrected - Following Praxis principles


