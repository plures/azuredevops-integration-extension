import { expect } from 'chai';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Import the function under test
import { buildMinimalWebviewHtml } from '../src/activation.ts';
import vscode from 'vscode';

// Minimal fake Webview and ExtensionContext to drive buildMinimalWebviewHtml
class FakeWebview {
  cspSource = 'vscode-resource:';
  asWebviewUri(u: any) {
    // Return a pseudo-URI with toString()
    return {
      toString: () => String(u?.toString ? u.toString() : u),
      with: ({ query }: { query: string }) => ({
        toString: () => `${String(u?.toString ? u.toString() : u)}?${query}`,
      }),
    } as any;
  }
}

class FakeExtensionContext {
  extensionPath: string;
  extensionUri: any;
  globalState: Map<string, any> = new Map();
  secrets = { get: async () => undefined } as any;
  constructor(root: string) {
    this.extensionPath = root;
    this.extensionUri = { fsPath: root };
  }
}

describe('buildMinimalWebviewHtml', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const root = path.resolve(__dirname, '..');
  const mediaSvelte = path.join(root, 'media', 'webview', 'svelte-main.js');
  const mediaIndex = path.join(root, 'media', 'webview', 'index.html');

  before(function () {
    // Ensure media files exist for the test
    if (!fs.existsSync(mediaIndex)) this.skip();
    if (!fs.existsSync(mediaSvelte)) this.skip();
  });

  it('selects svelte-main.js when the feature flag is enabled and bundle exists', () => {
    // Arrange a config getter that returns true for experimentalSvelteUI
    const originalGetConfiguration = vscode.workspace.getConfiguration;
    (vscode.workspace as any).getConfiguration = () => ({
      get: (k: string) => (k === 'experimentalSvelteUI' ? true : undefined),
    });

    const ctx = new FakeExtensionContext(root) as any;
    const webview = new FakeWebview() as any;
    const nonce = 'testnonce';

    // Act
    const html = buildMinimalWebviewHtml(ctx, webview, nonce);

    // Restore config
    (vscode.workspace as any).getConfiguration = originalGetConfiguration;

    // Assert: script tag should point to svelte-main.js
    expect(html).to.contain('svelte-main.js');
  });
});
