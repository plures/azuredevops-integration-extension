# On-Premises TFS Connection Fixes

## Issues Addressed

### 1. Signin Card from Previous Tab Appearing ✅

**Problem**: When switching between connections, the auth reminder (signin card) from the previous connection would appear on the new connection's tab.

**Root Cause**: The `authReminderMap` in the webview was not being cleared when switching connections, causing stale auth UI state to persist.

**Fix Applied**: In `src/webview/svelte-main.ts`, the `connectionsUpdate` handler now clears the auth reminder map when switching connections:

```typescript
case 'connectionsUpdate': {
  // ... existing connection switch logic ...

  if (newActiveConnectionId && newActiveConnectionId !== activeConnectionId) {
    // ... clear work items ...

    // CRITICAL FIX: Clear auth reminders from previous connection
    authReminderMap.clear();
    authReminders = [];

    applyConnectionState(activeConnectionId);
  }
}
```

### 2. User Identity Name Not Being Used ✅

**Problem**: The setup wizard collected an optional username/email for on-prem servers (for @Me substitution), but it was never passed to the Azure DevOps client or used in identity resolution. Diagnostic logs showed "User ID: unknown" even after providing the username.

**Root Cause**:

- The `identityName` field was added to `ProjectConnection` but not passed to the `AzureDevOpsIntClient` constructor
- The identity resolution logic didn't have a fallback to use `identityName` when the `connectionData` endpoint failed or returned incomplete data

**Fix Applied**:

1. **Added `identityName` to `ClientOptions`** (`src/azureClient.ts`):

```typescript
interface ClientOptions {
  // ... existing options ...
  identityName?: string; // Optional identity name for on-prem servers where @Me doesn't resolve
}
```

2. **Store and use `identityName` in AzureDevOpsIntClient** (`src/azureClient.ts`):

```typescript
private identityName?: string; // Fallback identity name for on-prem servers

constructor(...) {
  // ...
  this.identityName = options.identityName?.trim() ? options.identityName.trim() : undefined;
  // ...
}
```

3. **Enhanced identity resolution with fallback** (`src/azureClient.ts`):

```typescript
private async _getAuthenticatedIdentity() {
  try {
    // ... existing connectionData logic ...

    // If we still don't have a uniqueName and identityName was provided (for on-prem),
    // use identityName as the fallback uniqueName
    if (!this.cachedIdentity.uniqueName && this.identityName) {
      console.log('[AzureClient][DEBUG] using provided identityName as fallback:', this.identityName);
      this.cachedIdentity.uniqueName = this.identityName;
    }

    return this.cachedIdentity;
  } catch (e) {
    // If connectionData fails entirely and we have identityName, use it as a fallback
    if (this.identityName) {
      console.log('[AzureClient][DEBUG] connectionData failed, using identityName fallback:', this.identityName);
      this.cachedIdentity = {
        uniqueName: this.identityName,
      };
      return this.cachedIdentity;
    }
    return null;
  }
}
```

4. **Pass `identityName` from connection to client** (`src/activation.ts`):

```typescript
state.client = new AzureDevOpsIntClient(connection.organization, connection.project, credential!, {
  // ... existing options ...
  identityName: connection.identityName, // Pass through for on-prem identity fallback
});
```

## Issue Still Under Investigation

### Network Error: Cannot Reach Azure DevOps

**Current Error**:

```
Network error: Cannot reach Azure DevOps.
• Check your internet connection
• Verify your base URL is correct
• Current URL: https://vstfdt.corp.microsoft.com/tfs/CEDialtone/_apis
```

**Analysis**:

The URL construction appears to be correct for a TFS/on-prem server:

- **Server**: `vstfdt.corp.microsoft.com`
- **Collection**: `tfs`
- **Project**: `CEDialtone`
- **API Base URL**: `https://vstfdt.corp.microsoft.com/tfs/CEDialtone/_apis` ✅

The error is a network-level failure, not a URL construction issue. Possible causes:

1. **PAT Authentication Issue**
   - PAT may be invalid or expired
   - PAT may not have correct scopes (Work Items: Read/Write required)
   - PAT may not be properly stored/retrieved from VS Code secrets

2. **Network Connectivity**
   - Corporate proxy blocking the request
   - VPN required but not connected
   - Firewall rules blocking the connection
   - DNS resolution failure for `vstfdt.corp.microsoft.com`

3. **TLS/SSL Certificate Issues**
   - Self-signed or corporate certificate not trusted by Node.js
   - May need to set `NODE_TLS_REJECT_UNAUTHORIZED=0` (not recommended for production)
   - May need to configure custom CA certificates

4. **TFS Server Configuration**
   - Server may be offline or unreachable
   - REST API may not be enabled
   - API version compatibility (extension uses `api-version=7.0`)

### Recommended Diagnostic Steps

1. **Test basic connectivity**:

   ```powershell
   # Test if server is reachable
   Test-NetConnection -ComputerName vstfdt.corp.microsoft.com -Port 443

   # Try accessing the API endpoint directly
   curl -k https://vstfdt.corp.microsoft.com/tfs/CEDialtone/_apis/connectionData?api-version=7.0 -H "Authorization: Basic <base64-encoded-pat>"
   ```

2. **Verify PAT**:
   - Create a new PAT in TFS: `https://vstfdt.corp.microsoft.com/tfs/_usersSettings/tokens`
   - Ensure scopes: Work Items (Read, Write), Code (Read) if using Git features
   - Test PAT with curl/Postman before using in extension

3. **Check certificate trust**:

   ```powershell
   # View certificate chain
   $req = [Net.HttpWebRequest]::Create("https://vstfdt.corp.microsoft.com")
   $req.GetResponse() | Out-Null
   $req.ServicePoint.Certificate
   ```

4. **Review axios network logs**:
   - The extension logs all HTTP requests/responses
   - Check for specific error codes:
     - `ECONNREFUSED`: Server not listening on port
     - `ENOTFOUND`: DNS resolution failure
     - `CERT_HAS_EXPIRED`: Certificate issue
     - `ECONNRESET`: Connection dropped

5. **Test with diagnostic script**:
   Run the diagnose script and share the full output:
   ```powershell
   npm run diagnose -- --connection "tfs/CEDialtone"
   ```

## Testing Checklist

- [x] Signin cards clear when switching connections
- [x] `identityName` is collected during setup for on-prem URLs
- [x] `identityName` is stored in connection config
- [x] `identityName` is passed to AzureDevOpsIntClient
- [x] Identity resolution uses `identityName` as fallback
- [ ] Network connectivity to TFS server works
- [ ] PAT authentication succeeds
- [ ] @Me-based queries return correct results ("Assigned to me", "My Activity")

## Next Steps

1. **Reload VS Code** to load the compiled extension
2. **Review diagnostic logs** for detailed error information:
   - Look for `[azureDevOpsInt][HTTP]` entries
   - Check for axios error details (error code, response body)
   - Verify identity resolution logs: `[AzureClient][DEBUG]`
3. **Test basic connectivity** to the TFS server outside VS Code
4. **Verify PAT** is valid and has correct scopes
5. **Check for certificate/proxy issues** if in corporate environment
6. Once connectivity works, verify queries return correct results

## Files Modified

- `src/webview/svelte-main.ts`: Clear auth reminder map on connection switch
- `src/azureClient.ts`: Add `identityName` option and fallback logic
- `src/activation.ts`: Pass `identityName` from connection to client
