# Praxis v1.1.3 Optimizations

## Analysis of Current Performance Issues

Based on the logs and code review, several optimization opportunities have been identified:

### 1. **Large syncState Payload** ⚠️ HIGH PRIORITY

**Issue**: The `syncState` message includes massive payloads with:

- All connection states (even disconnected ones)
- Empty arrays (`workItems:[]`, `kanbanColumns:[]`)
- Empty objects (`pendingAuthReminders:{}`)
- Pre-computed matches object with many false values

**Impact**:

- Large message size (~5-10KB+ per sync)
- Unnecessary serialization overhead
- Webview processing overhead

**Optimization**:

- Omit empty arrays/objects from payload
- Only send changed fields (delta updates)
- Filter matches to only include `true` values
- Use Praxis v1.1.3's incremental update capabilities

### 2. **Duplicate Connections** ⚠️ HIGH PRIORITY

**Issue**: Logs show 5 connections for the same org/project:

```
- "955aa1d6-ac3e-447b-a906-0d0b34d84c4c"
- "arylethersystems-Developing%20Azure%20Solutions-1766727829212"
- "arylethersystems-Developing%20Azure%20Solutions-1766733881164"
- "arylethersystems-Developing%20Azure%20Solutions-1766737917948"
- "arylethersystems-Developing%20Azure%20Solutions-1766790943187"
```

**Root Cause**: Connection normalization doesn't deduplicate by `(organization, project, baseUrl)` tuple.

**Optimization**:

- Add deduplication logic in `normalizeConnections()`
- Merge duplicate connections instead of creating new ones
- Clean up existing duplicates on load

### 3. **Command Registration Verbosity** ⚠️ MEDIUM PRIORITY

**Issue**: Each command registration logs individually (32 log entries).

**Optimization**:

- Batch registration logging
- Reduce to single summary log
- Only log errors, not successful registrations

### 4. **Matches Object Optimization** ⚠️ MEDIUM PRIORITY

**Issue**: Pre-computing all possible state matches, including many `false` values:

```typescript
matches: {
  inactive: false,
  activating: false,
  activation_failed: false,
  active: true,  // Only this is true
  error_recovery: false,
  // ... 10+ more false values
}
```

**Optimization**:

- Only include `true` matches in payload
- Webview can compute matches from state if needed
- Reduces payload size by ~50%

### 5. **Connection State Serialization** ⚠️ MEDIUM PRIORITY

**Issue**: Sending full connection state objects for all connections, even disconnected ones.

**Optimization**:

- Only send state for active connection
- Send minimal state for inactive connections
- Use connection ID references instead of full objects

## Implementation Plan

### Phase 1: Payload Optimization (Immediate)

#### 1.1 Optimize syncState Payload

**File**: `src/activation.ts` - `sendCurrentState()` function

```typescript
// Before: Sends everything
const serializableState = {
  praxisState: snapshot.value,
  context: getSerializableContext(snapshot.context),
  matches, // All matches including false
};

// After: Optimized payload
const serializableState = {
  praxisState: snapshot.value,
  context: optimizeContextPayload(snapshot.context),
  matches: filterTrueMatches(matches), // Only true matches
};

function optimizeContextPayload(context: any): any {
  const optimized: any = {};

  // Only include non-empty arrays
  if (context.workItems?.length > 0) {
    optimized.workItems = context.workItems;
  }

  // Only include non-empty objects
  if (Object.keys(context.pendingAuthReminders || {}).length > 0) {
    optimized.pendingAuthReminders = context.pendingAuthReminders;
  }

  // Only include active connection state
  if (context.activeConnectionId) {
    optimized.activeConnectionId = context.activeConnectionId;
    if (context.connectionStates?.has(context.activeConnectionId)) {
      optimized.connectionStates = {
        [context.activeConnectionId]: context.connectionStates.get(context.activeConnectionId),
      };
    }
  }

  // Always include essential fields
  optimized.isActivated = context.isActivated;
  optimized.connections = context.connections; // Needed for connection list

  return optimized;
}

function filterTrueMatches(matches: Record<string, boolean>): Record<string, boolean> {
  const filtered: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(matches)) {
    if (value === true) {
      filtered[key] = true;
    }
  }
  return filtered;
}
```

#### 1.2 Optimize Matches Object

**File**: `src/activation.ts` - `sendCurrentState()` function

```typescript
// Only compute and send true matches
const activeMatches: Record<string, boolean> = {};
const matchKeys = ['inactive', 'activating', 'active', 'error_recovery', 'deactivating'];
for (const key of matchKeys) {
  if (matchesFn(key)) {
    activeMatches[key] = true;
  }
}
```

### Phase 2: Connection Deduplication (High Priority)

#### 2.1 Add Deduplication Logic

**File**: `src/services/connection/connectionNormalization.ts`

```typescript
export function normalizeConnections(
  rawConnections: unknown[],
  legacyFallback?: LegacyFallback
): NormalizeConnectionsResult {
  const normalized: ProjectConnection[] = [];
  const seen = new Map<string, ProjectConnection>(); // Deduplication map
  let requiresSave = false;
  let added = 0;
  let migrated = 0;
  let deduplicated = 0;

  // Process raw connections
  for (const raw of rawConnections) {
    if (!raw || typeof raw !== 'object') continue;

    const conn = raw as any;

    // Validate required fields
    if (!conn.organization || !conn.project) {
      continue;
    }

    // Create deduplication key: (org, project, baseUrl)
    const dedupeKey = `${conn.organization}|${conn.project}|${conn.baseUrl || ''}`;

    // Check for duplicate
    if (seen.has(dedupeKey)) {
      const existing = seen.get(dedupeKey)!;
      // Merge: prefer connection with ID, or newer one
      if (!existing.id && conn.id) {
        // Replace existing with one that has ID
        const index = normalized.indexOf(existing);
        if (index >= 0) {
          normalized[index] = {
            ...existing,
            id: conn.id,
            // Merge other fields
            tenantId: conn.tenantId || existing.tenantId,
            authMethod: conn.authMethod || existing.authMethod,
          };
          requiresSave = true;
          deduplicated++;
        }
      }
      continue; // Skip duplicate
    }

    // Normalize connection
    const normalizedConn: ProjectConnection = {
      id: conn.id || `${conn.organization}-${conn.project}-${Date.now()}`,
      organization: String(conn.organization).trim(),
      project: String(conn.project).trim(),
      team: conn.team ? String(conn.team).trim() : undefined,
      label: conn.label ? String(conn.label).trim() : undefined,
      baseUrl: conn.baseUrl ? String(conn.baseUrl).trim() : undefined,
      apiBaseUrl: conn.apiBaseUrl ? String(conn.apiBaseUrl).trim() : undefined,
      authMethod: conn.authMethod === 'entra' ? 'entra' : 'pat',
      patKey: conn.patKey ? String(conn.patKey).trim() : undefined,
      tenantId: conn.tenantId ? String(conn.tenantId).trim() : undefined,
      identityName: conn.identityName ? String(conn.identityName).trim() : undefined,
    };

    normalized.push(normalizedConn);
    seen.set(dedupeKey, normalizedConn);

    // Check if ID was generated (migration needed)
    if (!conn.id) {
      requiresSave = true;
      added++;
    }

    // Check if other fields need normalization
    if (
      conn.organization !== normalizedConn.organization ||
      conn.project !== normalizedConn.project ||
      (conn.team || '') !== (normalizedConn.team || '') ||
      (conn.label || '') !== (normalizedConn.label || '')
    ) {
      requiresSave = true;
      migrated++;
    }
  }

  // ... rest of function

  return {
    connections: normalized,
    requiresSave: requiresSave || deduplicated > 0,
    summary: {
      normalized: normalized.length,
      added,
      migrated,
      deduplicated, // New field
    },
  };
}
```

### Phase 3: Command Registration Optimization (Low Priority)

#### 3.1 Batch Registration Logging

**File**: `src/features/commands/registration.ts`

```typescript
export function registerCommands(
  _context: vscode.ExtensionContext,
  commandContext: CommandContext
): vscode.Disposable[] {
  const startTime = Date.now();
  const disposables: vscode.Disposable[] = [];
  const errors: string[] = [];

  for (const registration of commandRegistrations) {
    try {
      const disposable = vscode.commands.registerCommand(registration.command, (...args: any[]) => {
        // ... handler code
      });
      disposables.push(disposable);
    } catch (error) {
      errors.push(`${registration.command}: ${(error as any).message}`);
      logger.error(`Failed to register command ${registration.command}`, { meta: error });
    }
  }

  // Single summary log instead of 32 individual logs
  const duration = Date.now() - startTime;
  if (errors.length > 0) {
    logger.warn(
      `[Command Registration] Registered ${disposables.length}/${commandRegistrations.length} commands in ${duration}ms`,
      {
        errors,
        failed: errors.length,
      }
    );
  } else {
    logger.info(
      `[Command Registration] Registered ${disposables.length} commands in ${duration}ms`
    );
  }

  return disposables;
}
```

### Phase 4: Leverage Praxis v1.1.3 Features

#### 4.1 Incremental Updates

Praxis v1.1.3 may support incremental context updates. Check if we can use:

- `engine.updateContext()` with partial updates
- Event-driven state changes instead of full syncs
- Subscription filters to only notify on relevant changes

#### 4.2 Context Selectors

Use Praxis context selectors to only serialize relevant parts:

```typescript
// Only serialize what webview needs
const webviewContext = {
  activeConnectionId: context.activeConnectionId,
  activeConnection: context.connections.find((c) => c.id === context.activeConnectionId),
  workItems: context.connectionWorkItems.get(context.activeConnectionId) || [],
  // ... only active connection data
};
```

## Expected Performance Improvements

### Payload Size Reduction

- **Before**: ~5-10KB per syncState message
- **After**: ~1-2KB per syncState message
- **Improvement**: 60-80% reduction

### Connection Deduplication

- **Before**: 5 duplicate connections
- **After**: 1 connection
- **Improvement**: 80% reduction in connection state overhead

### Logging Reduction

- **Before**: 32+ log entries for command registration
- **After**: 1 summary log entry
- **Improvement**: 97% reduction in log verbosity

### Matches Object

- **Before**: ~15 fields (mostly false)
- **After**: ~1-2 fields (only true)
- **Improvement**: 85% reduction

## Testing Checklist

- [ ] Verify payload optimization doesn't break webview state
- [ ] Test connection deduplication with existing duplicate connections
- [ ] Verify matches filtering works correctly
- [ ] Test incremental updates don't miss state changes
- [ ] Performance test: measure payload size reduction
- [ ] Verify command registration still works correctly
- [ ] Test with multiple connections (active/inactive)

## Rollout Plan

1. **Phase 1** (Week 1): Payload optimization - Low risk, high impact
2. **Phase 2** (Week 1): Connection deduplication - Medium risk, high impact
3. **Phase 3** (Week 2): Command registration - Low risk, low impact
4. **Phase 4** (Week 2): Praxis v1.1.3 features - Medium risk, medium impact

---

**Created**: 2025-01-27  
**Status**: Ready for Implementation  
**Priority**: High (Payload & Deduplication), Medium (Others)
