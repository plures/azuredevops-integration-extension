# Bug Fix: Entra ID Authentication Option Not Shown When Adding Connections

## Issue Description

**Reporter**: User reported that after updating to v1.9.5, their existing connection stopped working. When they removed the connection and tried to add it again, they were not prompted to choose Entra ID authentication, even though their URL (`https://dev.azure.com/msazuredev/SFTCloudInfra/_workitems/edit/2328900`) is clearly Azure DevOps Services (cloud), which should support Entra ID.

## Root Cause

The extension had **two different code paths** for adding connections:

1. **SetupWizard** (`src/setupWizard.ts`) - Modern, comprehensive wizard that:
   - Detects cloud vs on-premises installations
   - Offers choice between Entra ID and PAT for cloud instances
   - Only offers PAT for on-premises installations
2. **promptAddConnection** (`src/activation.ts`) - Legacy function that:
   - **Always** prompts for PAT only
   - Never asks user to choose authentication method
   - Does not support Entra ID at all

When users clicked "Add project connection..." from the setup command, the code was calling the **legacy promptAddConnection function** instead of the modern SetupWizard. This meant users never saw the Entra ID option.

## Breaking Change in v1.9.5

Version 1.9.5 introduced a breaking change:

- **Old behavior**: PATs were stored globally
- **New behavior**: PATs are stored per-connection for better security

This caused existing connections to lose their PAT and stop working, forcing users to re-add connections. When they did, they hit the bug where the legacy add flow didn't offer Entra ID.

## Solution

**Changed** `src/activation.ts` line 3003 to use SetupWizard instead of promptAddConnection:

```typescript
if (action === 'add') {
  // Use the modern SetupWizard which supports both PAT and Entra ID authentication
  const wizard = new SetupWizard(context);
  const result = await wizard.start();

  if (result.status === 'success') {
    // Reload connections after successful setup
    await ensureConnectionsInitialized(context);
    ensureTimer(context);

    // If a connection was added, set it as active
    if (result.connectionId) {
      const newConnection = connections.find((c) => c.id === result.connectionId);
      if (newConnection) {
        activeConnectionId = result.connectionId;
        await context.globalState.update(ACTIVE_CONNECTION_STATE_KEY, activeConnectionId);
        vscode.window.showInformationMessage(
          `Connection "${newConnection.label || `${newConnection.organization}/${newConnection.project}`}" added and activated successfully.`
        );
      }
    }
  }
}
```

## Changes Made

1. ✅ Added `import { SetupWizard } from './setupWizard.js'` to activation.ts
2. ✅ Replaced `promptAddConnection()` call with `SetupWizard` instantiation
3. ✅ Added proper connection activation after successful setup
4. ✅ Renamed `promptAddConnection` to `_promptAddConnection_DEPRECATED` to indicate it's no longer used
5. ✅ Added debug logging to `step2_AuthMethodSelection` in setupWizard.ts for future troubleshooting

## Testing

Users should now see:

1. When adding a cloud connection (dev.azure.com or visualstudio.com):
   - **"Microsoft Entra ID (Recommended)"** option
   - **"Personal Access Token (PAT)"** option
2. When adding an on-premises connection:
   - Informational message explaining only PAT is supported
   - Automatic selection of PAT method

## Migration Path for Affected Users

Users who experienced this issue should:

1. Update to this version (1.9.7+)
2. Click "Add project connection..."
3. Provide their work item URL
4. **New**: See the authentication method selection dialog
5. Choose "Microsoft Entra ID (Recommended)" for cloud connections
6. Complete the OAuth flow

## Related Files

- `src/activation.ts` - Main extension activation, connection management
- `src/setupWizard.ts` - Modern setup wizard with auth method selection
- `src/azureDevOpsUrlParser.ts` - URL parsing to detect cloud vs on-premises

## Debug Information

Added console logging to help diagnose similar issues in the future:

- `[SetupWizard] Step 1 - Parsed URL:` - Shows the parsed URL structure
- `[SetupWizard] Step 2 - Auth Method Selection` - Shows when auth selection is triggered
- `[SetupWizard] parsedUrl:` - Complete parsed URL object
- `[SetupWizard] isOnPremises:` - Whether system detected on-premises installation
- `[SetupWizard] current authMethod:` - Any pre-filled auth method

Users can view this debug output in: **View → Output → Azure DevOps Integration**
