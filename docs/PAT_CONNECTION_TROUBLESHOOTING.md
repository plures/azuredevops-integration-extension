# PAT Connection Troubleshooting Guide

## Issue: "PAT not found in secrets" Error

**Symptom**: Connection exists in settings but fails with "PAT not found in secrets" error.

**Root Causes Identified & Fixed**:
1. ✅ `getSecretPAT` bridge function was never initialized (fixed in `activation.ts`)
2. ✅ `patKey` wasn't being saved to connection object (fixed in `connection.ts`)
3. ✅ Missing `matches` field in initial webview state (fixed in `activation.ts`)

---

## Solution: Re-enter Your PAT

If you have an existing connection with this error, follow these steps:

### Option 1: Edit Existing Connection (Recommended)

1. Click the **⚙️ Settings icon** (Setup or Manage Connections) in the toolbar
2. Select **"Manage Existing Connections"**
3. Select your existing connection from the list
4. Choose **"Edit"**
5. Confirm the URL (press Enter)
6. Choose **"Personal Access Token (PAT)"**
7. **Enter your PAT** when prompted
8. Connection will test and save successfully ✅

### Option 2: Delete and Re-add Connection

1. Click **⚙️** → **"Manage Existing Connections"**
2. Select your connection
3. Choose **"Delete"**
4. Click **⚙️** → **"Add New Connection"**
5. Enter Azure DevOps URL
6. Choose authentication method
7. Enter PAT
8. Connection saved successfully ✅

---

## What Was Fixed (Version 1.10.1+)

### 1. PAT Bridge Function Initialization

**Before** (Bug):
```typescript
// Bridge function imported but NEVER initialized
setGetSecretPAT  // ← Never called with implementation!
```

**After** (Fixed):
```typescript
// Now properly initialized after connections load
setGetSecretPAT(async (extensionContext, connectionId) => {
  const connection = connections.find((c) => c.id === connectionId);
  if (!connection || !connection.patKey) return undefined;
  return await extensionContext.secrets.get(connection.patKey);
});
```

### 2. Missing patKey in Connection Object

**Before** (Bug):
```typescript
const patKey = `azureDevOpsInt.pat:${newOrUpdatedConnection.id}`;
await context.secrets.store(patKey, pat);  // Stored in secrets
// ❌ But patKey NOT added to connection object!
```

**After** (Fixed):
```typescript
const patKey = `azureDevOpsInt.pat:${newOrUpdatedConnection.id}`;
newOrUpdatedConnection.patKey = patKey;  // ✅ NOW saves patKey reference
await context.secrets.store(patKey, pat);
```

### 3. Webview Initial State Missing Matches

**Before** (Bug):
```typescript
webview.postMessage({
  type: 'syncState',
  payload: {
    fsmState: snapshot.value,
    context: getSerializableContext(snapshot.context),
    // ❌ Missing matches field!
  },
});
```

**After** (Fixed):
```typescript
const matches = {
  inactive: snapshot.matches('inactive'),
  activating: snapshot.matches('activating'),
  active: snapshot.matches('active'),
  'active.ready': snapshot.matches({ active: 'ready' }),
  // ... all state matches
};

webview.postMessage({
  type: 'syncState',
  payload: {
    fsmState: snapshot.value,
    context: getSerializableContext(snapshot.context),
    matches,  // ✅ NOW includes matches
  },
});
```

---

## How It Works Now

### Connection Creation Flow:
```
1. User enters Azure DevOps URL
2. Selects "Personal Access Token (PAT)"
3. Enters PAT in password field
4. System tests PAT connectivity
5. Generates patKey: "azureDevOpsInt.pat:{connectionId}"
6. ✅ Saves patKey to connection.patKey field
7. ✅ Stores PAT in VS Code secrets[patKey]
8. ✅ Saves connection to settings.json
```

### Authentication Flow:
```
1. Connection loaded from settings.json
2. Has connection.patKey field
3. ✅ Bridge function retrieves PAT from secrets[patKey]
4. ✅ Creates authenticated client
5. ✅ Connection successful
```

---

## Verification Steps

After updating to the fixed version, verify:

1. **Check Connection Has patKey**:
   - Open settings: `Ctrl+,` → Search "Azure DevOps Integration"
   - Find "Connections" setting
   - Click "Edit in settings.json"
   - Verify each connection has a `patKey` field:
   ```json
   {
     "azureDevOpsIntegration.connections": [
       {
         "id": "790aa7ed-79a4-4eb2-b431-b0057c0dccbf",
         "organization": "myorg",
         "project": "myproject",
         "authMethod": "pat",
         "patKey": "azureDevOpsInt.pat:790aa7ed-79a4-4eb2-b431-b0057c0dccbf",  // ← Must have this!
         "label": "myorg/myproject"
       }
     ]
   }
   ```

2. **Check Webview Displays**:
   - Open Azure DevOps Work Items view
   - Should show UI immediately (not blank)
   - Check browser console shows:
     ```
     🟢 [AzureDevOpsInt][webview] Svelte component mounted successfully
     ```

3. **Check Authentication Works**:
   - View should load work items if PAT is valid
   - No "PAT not found" errors in extension logs
   - Connection status shows green/connected

---

## Prevent Future Issues

### When Adding Connections Programmatically:

Always ensure both the PAT is stored AND the patKey is saved:

```typescript
const patKey = `azureDevOpsInt.pat:${connection.id}`;

// Step 1: Store PAT in secrets
await context.secrets.store(patKey, patValue);

// Step 2: MUST save patKey to connection object
const connection: ProjectConnection = {
  id: connectionId,
  organization: 'myorg',
  project: 'myproject',
  authMethod: 'pat',
  patKey: patKey,  // ← CRITICAL: Don't forget this!
  // ... other fields
};

// Step 3: Save connection to settings
await saveConnection(connection);
```

---

## For Developers

### Testing PAT Retrieval:

```typescript
// Test the bridge function
import { getSecretPAT } from './fsm/services/extensionHostBridge';

const pat = await getSecretPAT(extensionContext, connectionId);
if (!pat) {
  console.error('PAT not found for connection:', connectionId);
  // Check connection has patKey field
  // Check secrets store has value at that key
}
```

### Debugging Steps:

1. **Check bridge is initialized**:
   ```typescript
   // Should be called in loadConnectionsFromConfig
   setGetSecretPAT(async (ctx, connId) => {...});
   ```

2. **Check connection has patKey**:
   ```typescript
   const connection = connections.find(c => c.id === connectionId);
   console.log('Connection patKey:', connection?.patKey);
   ```

3. **Check secrets store**:
   ```typescript
   const pat = await context.secrets.get(connection.patKey);
   console.log('PAT found:', !!pat);
   ```

---

## Summary

**Fixed in Version**: 1.10.1+  
**Commit**: ac875f6  

**What to Do Now**:
1. Reload VS Code extension (F5 or "Developer: Reload Window")
2. Go to ⚙️ → "Manage Existing Connections"
3. Edit your connection and re-enter PAT
4. Connection will now work properly! ✅

**Critical Fixes Applied**:
- ✅ PAT bridge function now initialized
- ✅ patKey now saved to connection object
- ✅ Webview displays properly with matches
- ✅ Setup button shows ⚙️ icon

---

*Last Updated: 2025-10-26*

