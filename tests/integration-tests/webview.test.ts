// Integration test for webview messaging
// This file will be run inside the VS Code extension host
import * as vscode from 'vscode';
import * as assert from 'assert';

suite('Webview Integration Tests', () => {
  test('Self test webview command should work', async function () {
    this.timeout(10000); // 10 seconds timeout for this test
    // Ensure the extension is activated so commands are registered
    const ext = vscode.extensions.getExtension('PluresLLC.azuredevops-integration-extension');
    assert.ok(ext, 'Extension not found');
    await ext!.activate();
    // This command tests the webview round-trip functionality
    await vscode.commands.executeCommand('azureDevOpsInt.selfTestWebview');
    // If we get here without throwing, the test passed
    assert.ok(true, 'Webview self-test completed successfully');
  });
});
