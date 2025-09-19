import * as path from 'path';
import { fileURLToPath } from 'node:url';
import { runTests, downloadAndUnzipVSCode } from '@vscode/test-electron';

// This is a high-level smoke test scaffold. It requires installed extension build and will be run in CI.
// Implemented as placeholder showing how the test runner would be invoked in CI; actual in-test code lives in ./integration-tests folder when run in a real environment.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const _vscodeExecutablePath = await downloadAndUnzipVSCode('1.78.0');
  const extensionDevelopmentPath = path.resolve(__dirname, '../../');
  const extensionTestsPath = path.resolve(extensionDevelopmentPath, 'out', 'integration-tests');
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
