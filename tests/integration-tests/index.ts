// Integration test runner entry point
// This file is loaded by the VS Code test runner

import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup test environment
export async function run(): Promise<void> {
  // Run all tests in this directory
  const glob = await import('glob');
  const mochaImport = await import('mocha');
  const Mocha = mochaImport.default || mochaImport;

  // Create the mocha test with shorter timeout to prevent hanging
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 15000, // Reduced from 30s to 15s to fail faster
  });

  // Find all test files
  const testRoot = __dirname;
  let files = glob.globSync('**/*.test.js', { cwd: testRoot });
  if (process.env.VSCODE_INTEGRATION_SMOKE === '1') {
    // Limit to activation-only smoke in smoke mode to avoid heavier flows
    files = files.filter((f) => /activate-only\.test\.js$/.test(f));
  }

  // Add files to the test suite
  files.forEach((f) => mocha.addFile(path.resolve(testRoot, f)));

  return new Promise((resolve, reject) => {
    // Add a global timeout to prevent the entire test suite from hanging
    const globalTimeout = setTimeout(() => {
      reject(new Error('Integration tests timed out after 60 seconds'));
    }, 60000);

    mocha.run((failures: number) => {
      clearTimeout(globalTimeout);
      if (failures > 0) {
        reject(new Error(`${failures} tests failed.`));
      } else {
        resolve();
      }
    });
  });
}
