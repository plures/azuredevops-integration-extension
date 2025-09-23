// Minimal smoke test: verify the extension is discoverable without forcing activation.
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Smoke: Extension discovery', () => {
  test('Extension is resolvable by ID (no activation)', async function () {
    this.timeout(5000);
    const ext = vscode.extensions.getExtension('PluresLLC.azuredevops-integration-extension');
    assert.ok(ext, 'Extension should be resolvable');
    // In smoke mode, avoid activating to reduce risk of extension host stalls in constrained environments.
    assert.strictEqual(typeof ext?.packageJSON?.name, 'string');
  });
});
