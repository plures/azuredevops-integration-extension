// Minimal integration test runner for VS Code extension host.
// Export a named `run` function as expected by @vscode/test-electron.
// Keep it lightweight; real roundtrip tests can be added here later.
export async function run() {
  // If we wanted to assert activation, we'd import 'vscode' and check:
  // const vscode = await import('vscode');
  // const ext = vscode.extensions.getExtension('PluresLLC.azuredevops-integration-extension');
  // await ext?.activate();
  // For now, just succeed to validate wiring and webview launch path.
}
