# Complete Flow: Setup Wizard → First Query

This document traces the complete execution flow from clicking "Complete Setup" in the wizard to the first work items query being executed.

## 📋 Flow Overview

```
User clicks "Complete Setup"
  ↓
SetupWizard.completeSetup()
  ↓
Save connection to settings
  ↓
Set as active connection
  ↓
User clicks "Open Work Items View"
  ↓
revealWorkItemsView()
  ↓
Webview resolved
  ↓
initDomainObjects()
  ↓
ensureActiveConnection()
  ↓
Create AzureDevOpsIntClient
  ↓
Create WorkItemsProvider
  ↓
provider.refresh("My Activity")
  ↓
client.getWorkItems("My Activity")
  ↓
Execute WIQL query
  ↓
Display results in webview
```

## 🔍 Detailed Step-by-Step Flow

---

### Step 1: Complete Setup (SetupWizard.completeSetup)

**File:** `src/setupWizard.ts` lines 910-1030

**What happens:**

1. Validates setup data (parsedUrl, PAT, etc.)
2. Creates connection object with:

   ```typescript
   {
     id: UUID,
     organization: parsedUrl.organization,  // ⚠️ CRITICAL: Must be correct for on-prem
     project: parsedUrl.project,
     label: user-provided label,
     team: optional team,
     baseUrl: parsedUrl.baseUrl,           // e.g., "https://vstfdt.corp.microsoft.com"
     apiBaseUrl: parsedUrl.apiBaseUrl,     // e.g., "https://vstfdt.corp.microsoft.com/tfs/CEDialtone/One/_apis"
     authMethod: 'pat' or 'entra',
     identityName: user identity,          // e.g., "REDMOND\kbristol" (on-prem only)
   }
   ```

3. **Saves PAT to secrets** (if PAT auth):

   ```typescript
   const patKey = `azureDevOpsInt.pat.${connectionId}`;
   await context.secrets.store(patKey, this.data.pat);
   connection.patKey = patKey;
   ```

4. **Saves connection to config**:

   ```typescript
   await saveConnectionToConfig(connection);
   // Writes to: azureDevOpsIntegration.connections array in settings.json
   ```

5. **Sets as active connection**:

   ```typescript
   await context.globalState.update('azureDevOpsInt.activeConnectionId', connection.id);
   ```

6. Shows success message with "Open Work Items View" button

**Key logs to watch:**

```
[SetupWizard] completeSetup - Connection object created: {...}
[SetupWizard] completeSetup - Storing PAT with key: azureDevOpsInt.pat.{UUID}
[SetupWizard] completeSetup - Setting as active connection: {UUID}
```

---

### Step 2: Open Work Items View (revealWorkItemsView)

**File:** `src/activation.ts` lines 3881-3900

**What happens:**

1. Executes command to reveal the Activity Bar container:

   ```typescript
   vscode.commands.executeCommand('workbench.view.extension.azureDevOpsIntegration');
   ```

2. Focuses the webview:
   ```typescript
   vscode.commands.executeCommand('azureDevOpsWorkItems.focus');
   ```

**Key logs:**

```
Revealed Azure DevOps container
Focused Work Items view
```

---

### Step 3: Webview Resolved (resolveWebviewView)

**File:** `src/activation.ts` lines 1832-1875

**What happens:**

1. Creates webview with HTML content
2. Sets up message handler for webview ↔ extension communication
3. Calls `initDomainObjects()` to initialize the connection and provider

**Key logs:**

```
[azureDevOpsInt] resolveWebviewView invoked for view: azureDevOpsWorkItems
```

---

### Step 4: Initialize Domain Objects (initDomainObjects)

**File:** `src/activation.ts` lines 1877-1923

**What happens:**

1. **Load connections from config**:

   ```typescript
   await ensureConnectionsInitialized(context);
   // Reads: azureDevOpsIntegration.connections from settings.json
   ```

2. **Get/create connection state**:

   ```typescript
   const state = await ensureActiveConnection(context, activeConnectionId, { refresh: false });
   ```

3. **Send connections list to webview**:

   ```typescript
   notifyConnectionsList();
   ```

4. **Trigger provider refresh**:
   ```typescript
   if (panel && state?.provider) {
     const selectedQuery = getStoredQueryForConnection(state.id, 'My Activity');
     state.provider.refresh(selectedQuery);
   }
   ```

**Key logs:**

```
[initDomainObjects] start
[initDomainObjects] ensured active connection: {"hasState":true, "connectionId":"...", "hasProvider":true}
[initDomainObjects] panel ready, refreshing provider: {"id":"...", "query":"My Activity"}
```

---

### Step 5: Ensure Active Connection (ensureActiveConnection)

**File:** `src/activation.ts` lines 945-1150

**What happens:**

#### 5.1: Load connection from config

```typescript
const connection = connections.find((item) => item.id === targetId);
```

#### 5.2: Log connection details

```typescript
verbose('[ensureActiveConnection] using connection', {
  id: connection.id,
  organization: connection.organization, // ⚠️ For on-prem: "tfs/CEDialtone"
  project: connection.project, // "One"
  baseUrl: connection.baseUrl, // "https://vstfdt.corp.microsoft.com"
  authMethod: connection.authMethod || 'pat',
  hasIdentityName: !!connection.identityName, // true for on-prem
  identityName: connection.identityName, // "REDMOND\kbristol"
});
```

#### 5.3: Get credential (PAT or Entra token)

```typescript
if (authMethod === 'entra') {
  const entraResult = await ensureEntraAuthService(context, connection, { interactive: false });
  credential = entraResult.token;
} else {
  const pat = await getSecretPAT(context, targetId);
  credential = pat;
}
```

#### 5.4: Create AzureDevOpsIntClient

```typescript
verbose('[ensureActiveConnection] creating client with options', {
  hasIdentityName: !!connection.identityName,
  identityName: connection.identityName,       // "REDMOND\kbristol"
  baseUrl: connection.baseUrl,                 // "https://vstfdt.corp.microsoft.com"
});

state.client = new AzureDevOpsIntClient(
  connection.organization,    // ⚠️ "tfs/CEDialtone" (must be correct!)
  connection.project,         // "One"
  credential,                 // PAT or token
  {
    ratePerSecond: 5,
    burst: 10,
    team: connection.team,
    baseUrl: connection.baseUrl,                 // "https://vstfdt.corp.microsoft.com"
    apiBaseUrl: connection.apiBaseUrl,           // "https://vstfdt.corp.microsoft.com/tfs/CEDialtone/One/_apis"
    authType: authMethod === 'entra' ? 'bearer' : 'pat',
    identityName: connection.identityName,       // "REDMOND\kbristol"
    tokenRefreshCallback: /* only for Entra */,
  }
);
```

#### 5.5: Create WorkItemsProvider

```typescript
if (!state.provider) {
  verbose('[ensureActiveConnection] creating provider', { id: state.id });
  state.provider = new WorkItemsProvider(
    state.id,
    activeClient,
    (msg: any) => forwardProviderMessage(state.id, msg),
    {
      logger: providerLogger,
      transformWorkItems: (payload) => enrichWorkItemsForConnection(state, payload),
    }
  );
}
```

**Key logs:**

```
[ensureActiveConnection] evaluating target: {"requested":"...", "activeConnectionId":"...", "resolved":"...", "connectionCount":3}
[ensureActiveConnection] using connection: {"id":"...", "organization":"tfs/CEDialtone", "project":"One", "baseUrl":"https://vstfdt.corp.microsoft.com", "authMethod":"pat", "hasIdentityName":true, "identityName":"REDMOND\\kbristol"}
[ensureActiveConnection] using PAT authentication: {"id":"..."}
[ensureActiveConnection] creating new client: {"id":"...", "organization":"tfs/CEDialtone", "project":"One", "team":null, "baseUrl":"https://vstfdt.corp.microsoft.com", "authMethod":"pat"}
[ensureActiveConnection] creating client with options: {"hasIdentityName":true, "identityName":"REDMOND\\kbristol", "baseUrl":"https://vstfdt.corp.microsoft.com"}
[AzureClient] Using manual API URL override: {"apiBaseUrl":"https://vstfdt.corp.microsoft.com/tfs/CEDialtone/One/_apis", "baseUrl":"https://vstfdt.corp.microsoft.com"}
[AzureClient] Configured with fallback identityName for on-prem: REDMOND\kbristol
[ensureActiveConnection] creating provider: {"id":"..."}
[ensureActiveConnection] provider ready: {"id":"...", "hasClient":true}
```

---

### Step 6: AzureDevOpsIntClient Constructor

**File:** `src/azureClient.ts` lines 42-116

**What happens:**

#### 6.1: Store parameters

```typescript
this.organization = organization; // "tfs/CEDialtone" (on-prem) or "msazuredev" (cloud)
this.project = project; // "One"
this.credential = credential; // PAT or token
this.authType = options.authType; // 'pat' or 'bearer'
this.identityName = options.identityName?.trim(); // "REDMOND\kbristol"
```

#### 6.2: Determine base URLs

```typescript
if (options.apiBaseUrl) {
  // Manual API URL override - use as-is
  this.apiBaseUrl = options.apiBaseUrl.replace(/\/$/, '');
  this.baseUrl = options.baseUrl || `https://dev.azure.com/${organization}`;
  console.log('[AzureClient] Using manual API URL override:', {
    apiBaseUrl: this.apiBaseUrl, // "https://vstfdt.corp.microsoft.com/tfs/CEDialtone/One/_apis"
    baseUrl: this.baseUrl, // "https://vstfdt.corp.microsoft.com"
  });
} else if (options.baseUrl) {
  // Derive apiBaseUrl from baseUrl
  this.baseUrl = options.baseUrl;
  const trimmedBase = this.baseUrl.replace(/\/$/, '');
  const lowerBase = trimmedBase.toLowerCase();

  if (lowerBase.includes('dev.azure.com')) {
    this.apiBaseUrl = `${trimmedBase}/${project}/_apis`;
  } else if (lowerBase.includes('visualstudio.com')) {
    this.apiBaseUrl = `https://dev.azure.com/${organization}/${project}/_apis`;
  } else {
    // On-premises: construct API URL with org/project path
    this.apiBaseUrl = `${trimmedBase}/${organization}/${project}/_apis`;
    console.log('[AzureClient] On-prem configuration:', {
      baseUrl: this.baseUrl,
      organization,
      project,
      apiBaseUrl: this.apiBaseUrl,
    });
  }
} else {
  // Default to dev.azure.com
  this.baseUrl = `https://dev.azure.com/${organization}`;
  this.apiBaseUrl = `https://dev.azure.com/${organization}/${project}/_apis`;
}
```

#### 6.3: Create axios instance

```typescript
this.axios = axios.create({
  baseURL: this.apiBaseUrl, // ⚠️ CRITICAL: All API calls use this as the base
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});
```

#### 6.4: Add auth interceptor

```typescript
this.axios.interceptors.request.use(async (cfg) => {
  await this.limiter.acquire();

  if (this.authType === 'pat') {
    (cfg.headers ||= {} as any)['Authorization'] =
      `Basic ${Buffer.from(':' + this.credential).toString('base64')}`;
  } else {
    (cfg.headers ||= {} as any)['Authorization'] = `Bearer ${this.credential}`;
  }

  console.log('[azureDevOpsInt][HTTP] →', cfg.method?.toUpperCase(), cfg.url, 'attempt', attempt);
  return cfg;
});
```

**Key logs:**

```
[AzureClient] Using manual API URL override: {"apiBaseUrl":"https://vstfdt.corp.microsoft.com/tfs/CEDialtone/One/_apis", "baseUrl":"https://vstfdt.corp.microsoft.com"}
[AzureClient] Configured with fallback identityName for on-prem: REDMOND\kbristol
```

---

### Step 7: Provider Refresh (WorkItemsProvider.refresh)

**File:** `src/provider.ts` lines 102-200

**What happens:**

#### 7.1: Normalize query

```typescript
const normalizedQuery = query || this._currentQuery || 'My Activity';
this._currentQuery = normalizedQuery;
```

#### 7.2: Send loading message to webview

```typescript
this._post({
  type: 'workItemsLoading',
  query: normalizedQuery,
});
```

#### 7.3: Fetch work items

```typescript
this.log('debug', 'refresh(): starting fetch', {
  connectionId: this.connectionId,
  query: normalizedQuery,
});

const fetched = await this.client.getWorkItems(normalizedQuery);
const processed = await this._applyTransform(fetched);

this.log('info', 'refresh(): completed fetch', {
  connectionId: this.connectionId,
  count: Array.isArray(processed) ? processed.length : 'n/a',
});
```

#### 7.4: Update work items and send to webview

```typescript
this._workItems = processed;
this._mergeWorkItemTypesFromItems(processed);
this._postWorkItemsLoaded();
```

**Key logs:**

```
[provider:{id}] DEBUG refresh(): starting fetch: {"connectionId":"...", "query":"My Activity"}
[provider:{id}] INFO refresh(): completed fetch: {"connectionId":"...", "count":55}
```

---

### Step 8: Get Work Items (AzureDevOpsIntClient.getWorkItems)

**File:** `src/azureClient.ts` lines 600-800

**What happens:**

#### 8.1: Build WIQL query

```typescript
let wiql = this.buildWIQL(query); // Converts "My Activity" to WIQL SELECT statement
console.log('[azureDevOpsInt][GETWI] Fetching work items with query:', wiql);
console.log('[azureDevOpsInt][GETWI] API Base URL:', this.axios.defaults.baseURL);
```

#### 8.2: Resolve @Me token (if present)

```typescript
try {
  if (/@Me\b/i.test(wiql)) {
    const resolved = await this._getAuthenticatedIdentity();
    if (resolved) {
      const idVal = resolved.uniqueName || resolved.displayName || resolved.id;
      if (idVal) {
        const escaped = this._escapeWIQL(String(idVal));
        wiqlToSend = wiql.replace(/@Me\b/g, `'${escaped}'`);
        console.log('[azureDevOpsInt][GETWI] Replacing @Me with explicit identity:', idVal);
      }
    }
  }
} catch (identErr) {
  console.warn('[azureDevOpsInt][GETWI] Failed resolving identity for @Me replacement', identErr);
}
```

#### 8.3: Execute WIQL query

```typescript
const wiqlEndpoint = needsLimit
  ? '/wit/wiql?api-version=7.0&$top=100'
  : '/wit/wiql?api-version=7.0';

const wiqlResponse = await this.axios.post(wiqlEndpoint, {
  query: wiqlToSend,
});
```

#### 8.4: Fetch full work item details

```typescript
const ids = wiqlResponse.data.workItems.map((item: any) => item.id);
if (ids.length === 0) return [];

const fieldsEndpoint = `/wit/workitems?ids=${ids.join(',')}&$expand=all&api-version=7.0`;
const itemsResponse = await this.axios.get(fieldsEndpoint);

return itemsResponse.data.value.map((item: any) => ({
  id: item.id,
  fields: item.fields,
}));
```

**Key logs:**

```
[azureDevOpsInt][GETWI] Fetching work items with query: SELECT [System.Id], [System.Title], ...
[azureDevOpsInt][GETWI] API Base URL: https://vstfdt.corp.microsoft.com/tfs/CEDialtone/One/_apis
[azureDevOpsInt][HTTP] → GET https://vstfdt.corp.microsoft.com/_apis/connectionData?api-version=5.0 attempt 1
[azureDevOpsInt][HTTP] ← GET https://vstfdt.corp.microsoft.com/_apis/connectionData?api-version=5.0 401 Unauthorized
[AzureClient][DEBUG] connectionData failed, using identityName fallback: REDMOND\kbristol
[AzureClient][DEBUG] resolved identity object: {"uniqueName":"REDMOND\\kbristol"}
[azureDevOpsInt][GETWI] Replacing @Me with explicit identity: REDMOND\kbristol
[azureDevOpsInt][HTTP] → POST /wit/wiql?api-version=7.0 attempt 1
[azureDevOpsInt][HTTP] ← POST /wit/wiql?api-version=7.0 200 OK
[azureDevOpsInt][HTTP] → GET /wit/workitems?ids=123,456,...&$expand=all&api-version=7.0 attempt 1
[azureDevOpsInt][HTTP] ← GET /wit/workitems?ids=123,456,...&$expand=all&api-version=7.0 200 OK
```

---

### Step 9: Get Authenticated Identity (\_getAuthenticatedIdentity)

**File:** `src/azureClient.ts` lines 290-410

**What happens:**

#### 9.1: Try to fetch connectionData

```typescript
// Strategy 1: Use baseUrl (org/collection level)
const orgLevel = this.baseUrl.replace(/\/$/, '') + '/_apis/connectionData?api-version=5.0';
resp = await this.axios.get(orgLevel);
```

#### 9.2: Extract identity from response

```typescript
const user = resp.data?.authenticatedUser ?? {};
const uniqueName = user.uniqueName || user.unique_name || user.mailAddress || ...;

const identity = {
  id: resolvedId,
  displayName,
  uniqueName,
};
this.cachedIdentity = identity;
```

#### 9.3: Use identityName fallback (on-prem)

```typescript
// If we still don't have a uniqueName and identityName was provided (for on-prem),
// use identityName as the fallback uniqueName
if (!this.cachedIdentity.uniqueName && this.identityName) {
  console.log('[AzureClient][DEBUG] using provided identityName as fallback:', this.identityName);
  this.cachedIdentity.uniqueName = this.identityName;
}

return this.cachedIdentity;
```

#### 9.4: Catch block - use identityName if connectionData fails completely

```typescript
catch (e) {
  console.error('Error fetching authenticated user identity', e);
  // If connectionData fails entirely and we have identityName, use it as a fallback
  if (this.identityName) {
    console.log('[AzureClient][DEBUG] connectionData failed, using identityName fallback:', this.identityName);
    this.cachedIdentity = {
      uniqueName: this.identityName,  // "REDMOND\kbristol"
    };
    return this.cachedIdentity;
  }
  return null;
}
```

**Key logs:**

```
[azureDevOpsInt][HTTP] → GET https://vstfdt.corp.microsoft.com/_apis/connectionData?api-version=5.0 attempt 1
[azureDevOpsInt][HTTP][ERR] GET https://vstfdt.corp.microsoft.com/_apis/connectionData?api-version=5.0 401 Unauthorized
[AzureClient][DEBUG] connectionData failed, using identityName fallback: REDMOND\kbristol
[AzureClient][DEBUG] resolved identity object: {"uniqueName":"REDMOND\\kbristol"}
```

---

## ⚠️ Critical Points for On-Premises

### 1. URL Parsing (parseWorkItemUrl)

**File:** `src/azureDevOpsUrlParser.ts`

For URL: `https://vstfdt.corp.microsoft.com/tfs/CEDialtone/One/_workitems`

Must parse as:

- ✅ `organization: "tfs/CEDialtone"` (full collection path)
- ✅ `project: "One"`
- ✅ `baseUrl: "https://vstfdt.corp.microsoft.com"`
- ✅ `apiBaseUrl: "https://vstfdt.corp.microsoft.com/tfs/CEDialtone/One/_apis"`

**NOT:**

- ❌ `organization: "tfs"` (loses CEDialtone!)

### 2. Connection Object Storage

**File:** `src/setupWizard.ts` line 943

Must include:

```typescript
{
  organization: "tfs/CEDialtone",  // ⚠️ Full path, not just "tfs"
  project: "One",
  baseUrl: "https://vstfdt.corp.microsoft.com",
  apiBaseUrl: "https://vstfdt.corp.microsoft.com/tfs/CEDialtone/One/_apis",  // ⚠️ CRITICAL
  identityName: "REDMOND\\kbristol",  // ⚠️ Required for @Me substitution
}
```

### 3. Client Construction

**File:** `src/activation.ts` line 1070

Must pass:

```typescript
new AzureDevOpsIntClient(
  connection.organization, // "tfs/CEDialtone"
  connection.project, // "One"
  credential,
  {
    baseUrl: connection.baseUrl, // "https://vstfdt.corp.microsoft.com"
    apiBaseUrl: connection.apiBaseUrl, // ⚠️ CRITICAL: Full path with collection
    identityName: connection.identityName, // "REDMOND\kbristol"
  }
);
```

### 4. Identity Resolution

**File:** `src/azureClient.ts` line 380-401

When connectionData fails (401):

```typescript
if (this.identityName) {
  this.cachedIdentity = {
    uniqueName: this.identityName, // "REDMOND\kbristol"
  };
  return this.cachedIdentity;
}
```

Then in WIQL query (line 671):

```typescript
if (resolved) {
  const idVal = resolved.uniqueName || resolved.displayName || resolved.id;
  if (idVal) {
    wiqlToSend = wiql.replace(/@Me\b/g, `'${escaped}'`);
    // Query now has explicit "REDMOND\kbristol" instead of @Me
  }
}
```

---

## 🐛 Common Issues and Fixes

### Issue 1: Organization Missing Collection Path

**Symptom:** API calls fail with 404 or wrong path
**Root Cause:** `organization` = "tfs" instead of "tfs/CEDialtone"
**Fix:** Updated `parseWorkItemUrl` to detect on-prem and use full collection path

### Issue 2: @Me Queries Return No Results

**Symptom:** Work items queries return empty for "My Activity"
**Root Cause:** On-prem server doesn't resolve @Me token
**Fix:**

1. Prompt user for `identityName` during setup
2. Use `identityName` as fallback when connectionData fails
3. Replace @Me with explicit identity in WIQL before sending

### Issue 3: connectionData Fails with 401

**Symptom:** Identity resolution fails, @Me replacement doesn't work
**Root Cause:** PAT doesn't have permission or connectionData endpoint requires different auth
**Fix:** Use `identityName` fallback (already implemented)

### Issue 4: connectionData Uses Wrong API Version

**Symptom:** 400 Bad Request - "version 7.0 requires -preview"
**Fix:** Changed from `api-version=7.0` to `api-version=5.0` (stable)

---

## 📊 Summary Checklist

When setup completes successfully, verify these logs appear in order:

- [ ] `[SetupWizard] completeSetup - Connection object created` (shows correct org/project)
- [ ] `[ensureActiveConnection] using connection` (shows `hasIdentityName: true`)
- [ ] `[AzureClient] Using manual API URL override` (shows full apiBaseUrl with collection)
- [ ] `[AzureClient] Configured with fallback identityName for on-prem` (shows identity)
- [ ] `[ensureActiveConnection] creating provider`
- [ ] `[provider] DEBUG refresh(): starting fetch`
- [ ] `[azureDevOpsInt][GETWI] Fetching work items with query`
- [ ] `[azureDevOpsInt][GETWI] API Base URL` (shows correct full path)
- [ ] `[AzureClient][DEBUG] connectionData failed, using identityName fallback` (if connectionData fails)
- [ ] `[azureDevOpsInt][GETWI] Replacing @Me with explicit identity`
- [ ] `[azureDevOpsInt][HTTP] ← POST /wit/wiql?api-version=7.0 200 OK`
- [ ] `[provider] INFO refresh(): completed fetch` (shows count > 0)

If any of these logs are missing or show incorrect values, trace back to that step to find the issue.
