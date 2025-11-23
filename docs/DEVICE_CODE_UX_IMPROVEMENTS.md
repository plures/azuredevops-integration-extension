# Device Code Flow UX Improvements

## Problem

The previous implementation of the device code flow automatically opened the browser and copied the code to the clipboard as soon as the session started. This was found to be intrusive and unexpected by users ("We need to wait until the user clicks the button").

## Solution

We have modified the `connectionMachine.ts` to remove the automatic side effects (browser open, clipboard copy) while preserving the state transition and event emission.

### Changes

1.  **`src/fsm/machines/connectionMachine.ts`**:
    - Removed `vscode.env.clipboard.writeText(userCode)` from `deviceCodeCallback`.
    - Removed `vscode.env.openExternal(uri)` from `deviceCodeCallback`.
    - Updated the notification message to inform the user that authentication is required and they need to take action.
    - Added a "Copy & Open" button to the notification as a convenience, but it requires user interaction.

2.  **`src/activation.ts`** (Verified):
    - Confirmed that the `openDeviceCodeBrowser` message handler exists and correctly performs the copy-and-open action when triggered by the Webview.

3.  **`src/webview/components/AuthReminder.svelte`** (Verified):
    - Confirmed that the UI displays the device code and provides a button to trigger the `openDeviceCodeBrowser` message.

## Result

- **Non-intrusive**: The browser no longer opens automatically.
- **User Control**: The user must explicitly click "Copy & Open" in the notification or the button in the Webview to proceed.
- **Informative**: The user is still notified that authentication is required.
