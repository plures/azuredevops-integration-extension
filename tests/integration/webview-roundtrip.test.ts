import * as path from 'path';
import { fileURLToPath } from 'url';
import { runTests, downloadAndUnzipVSCode } from '@vscode/test-electron';

// This is a high-level smoke test scaffold. It requires installed extension build and will be run in CI.
// Implemented as placeholder showing how the test runner would be invoked in CI; actual in-test code lives in ./integration-tests folder when run in a real environment.

async function main() {
  const _vscodeExecutablePath = await downloadAndUnzipVSCode('1.78.0');
  // ESM-safe __dirname
  const __filename = fileURLToPath(import.meta.url);
  const __dirnameESM = path.dirname(__filename);
  const extensionDevelopmentPath = path.resolve(__dirnameESM, '../../');
  // Point to the ESM test module in repo; @vscode/test-electron supports JS/TS entry files
  const extensionTestsPath = path.resolve(
    extensionDevelopmentPath,
    'tests',
    'integration',
    'extension-tests.js'
  );
  try {
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: ['--extensionDevelopmentPath=' + extensionDevelopmentPath],
    });
  } catch (err) {
    console.error('Failed to run tests', err);
    process.exit(1);
  }
}

main();
