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

  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 30000,
  });

  // Find all test files
  const testRoot = __dirname;
  const files = glob.globSync('**/*.test.js', { cwd: testRoot });

  // Add files to the test suite
  files.forEach((f) => mocha.addFile(path.resolve(testRoot, f)));

  return new Promise((resolve, reject) => {
    mocha.run((failures: number) => {
      if (failures > 0) {
        reject(new Error(`${failures} tests failed.`));
      } else {
        resolve();
      }
    });
  });
}
