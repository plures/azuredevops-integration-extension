#!/usr/bin/env node
/* eslint-env node */
/* global process, console */
// ESM test runner: registers @esbuild-kit/esm-loader for on-the-fly TypeScript ESM support, then runs Mocha programmatically.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import fs from 'fs';
import path from 'path';

process.env.ESBK_TSCONFIG_PATH =
  process.env.ESBK_TSCONFIG_PATH ?? path.resolve('tsconfig.tests.json');

const loaderModulePath = path.resolve(process.cwd(), 'scripts', 'ts-esm-loader.mjs');
const loaderModuleUrl = pathToFileURL(loaderModulePath).href;
const mochaStubModulePath = path.resolve(process.cwd(), 'scripts', 'mocha-diagnostics-stub.mjs');
const mochaStubModuleUrl = pathToFileURL(mochaStubModulePath).href;

register(loaderModuleUrl, pathToFileURL('./'));

// Remove precompiled JS directories that would otherwise be resolved before TS sources
function rmDirIfExists(dir) {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`Removed precompiled dir: ${dir}`);
    }
  } catch {
    // ignore
  }
}
rmDirIfExists(path.resolve(process.cwd(), 'out'));
rmDirIfExists(path.resolve(process.cwd(), 'out-tests'));

function collectTests(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...collectTests(full));
    else if (e.isFile() && e.name.endsWith('.test.ts')) files.push(full);
  }
  return files;
}

const testDir = path.resolve(process.cwd(), 'tests');
const files = collectTests(testDir).filter(
  (f) =>
    !f.includes(path.sep + 'integration' + path.sep) &&
    !f.includes(path.sep + 'integration-tests' + path.sep) &&
    !f.includes(path.sep + 'disabled' + path.sep) &&
    // Skip query-selector test during diagnostics because it executes assertions at module load
    !f.endsWith(`${path.sep}query-selector.test.ts`)
);

// Diagnostic: try importing activation and its top-level imports directly to surface the failing sub-import
async function diagnoseActivationImports() {
  const candidates = [
    path.resolve(process.cwd(), 'src', 'activation.ts'),
    path.resolve(process.cwd(), 'src', 'azureClient.ts'),
    path.resolve(process.cwd(), 'src', 'provider.ts'),
    path.resolve(process.cwd(), 'src', 'timer.ts'),
  ];
  for (const c of candidates) {
    try {
      await import(pathToFileURL(c).href);
      console.log('Imported OK:', c);
    } catch (err) {
      console.error('Diagnostic import failed for:', c);
      console.error(err && err.stack ? err.stack : err);
      throw err;
    }
  }
}

/* main logic runs in __run() below */
// Wrap main logic so we don't rely on top-level await parsing in all environments
async function __run() {
  await diagnoseActivationImports();
  // Install minimal Mocha BDD globals so test files can be imported for diagnostics
  // without requiring Mocha's runner to be active. We make describe call its callback
  // so that nested `it` registrations execute (they'll be no-ops) and we can surface
  // import-time errors from test modules.
  const hadGlobals = {};
  const names = ['describe', 'it', 'before', 'after', 'beforeEach', 'afterEach'];
  for (const n of names) {
    hadGlobals[n] = globalThis[n] !== undefined;
  }
  /* eslint-disable no-unused-vars */
  globalThis.describe =
    globalThis.describe ||
    function (_name, fn) {
      if (typeof fn === 'function') {
        const fakeThis = { timeout: () => {}, retries: () => {}, slow: () => {} };
        fn.call(fakeThis);
      }
    };
  globalThis.it =
    globalThis.it ||
    function (_name, _fn) {
      /* no-op registration */
      return { timeout: () => {}, retries: () => {}, slow: () => {} };
    };
  globalThis.before =
    globalThis.before ||
    function (_fn) {
      /* no-op */
    };
  globalThis.after =
    globalThis.after ||
    function (_fn) {
      /* no-op */
    };
  globalThis.beforeEach =
    globalThis.beforeEach ||
    function (_fn) {
      /* no-op */
    };
  globalThis.afterEach =
    globalThis.afterEach ||
    function (_fn) {
      /* no-op */
    };
  /* eslint-enable no-unused-vars */

  // Phase 1: dynamically import each test file to surface import-time failures without creating
  // separate Mocha instances (avoids test registration going to the wrong Mocha instance).
  process.env.MOCHA_DIAGNOSTIC_STUB = '1';
  const { createRequire } = await import('node:module');
  const requireForDiag = createRequire(import.meta.url);
  const mochaResolvePath = requireForDiag.resolve('mocha');
  const priorMochaCacheEntry = requireForDiag.cache[mochaResolvePath];
  try {
    const mochaStubNamespace = await import(mochaStubModuleUrl);
    const stubExports = {
      ...mochaStubNamespace,
      ...(mochaStubNamespace.default || {}),
    };
    // Ensure describe/it aliases remain attached when spreads overwrite order
    if (mochaStubNamespace.describe) stubExports.describe = mochaStubNamespace.describe;
    if (mochaStubNamespace.it) stubExports.it = mochaStubNamespace.it;
    requireForDiag.cache[mochaResolvePath] = {
      id: mochaResolvePath,
      filename: mochaResolvePath,
      loaded: true,
      exports: stubExports,
      children: [],
      paths: [],
    };
  } catch (err) {
    console.error('Failed to install Mocha diagnostics stub:', err);
  }
  try {
    for (const f of files) {
      try {
        await import(pathToFileURL(f).href);
      } catch (err) {
        console.error(`\nERROR importing test file: ${f}`);
        console.error('Error message:', err && err.message);
        if (err && err.stack) {
          console.error('\nStack:\n', err.stack);
          const m = err.stack
            .split('\n')
            .find((l) => l.includes('node_modules') || l.includes('/src/') || l.includes('\\src\\'));
          if (m) console.error('\nLikely offending module (from stack):', m.trim());
        }
        // restore any pre-existing globals before exiting
        for (const n of names) {
          if (!hadGlobals[n]) delete globalThis[n];
        }
        delete process.env.MOCHA_DIAGNOSTIC_STUB;
        if (priorMochaCacheEntry) requireForDiag.cache[mochaResolvePath] = priorMochaCacheEntry;
        else delete requireForDiag.cache[mochaResolvePath];
        process.exit(3);
      }
    }
  } finally {
    if (priorMochaCacheEntry) requireForDiag.cache[mochaResolvePath] = priorMochaCacheEntry;
    else delete requireForDiag.cache[mochaResolvePath];
    delete process.env.MOCHA_DIAGNOSTIC_STUB;
  }

  // Phase 2: spawn the Mocha CLI under the @esbuild-kit/esm-loader so Mocha sets up its own ESM
  // globals and runs tests in a reliable way. This avoids issues with programmatic
  // Mocha + ESM registration differences across environments.
  const { spawn } = await import('node:child_process');
  const mochaBin = path.resolve(process.cwd(), 'node_modules', 'mocha', 'bin', 'mocha');
  const nodeArgs = [
    '--loader',
    loaderModuleUrl,
    mochaBin,
    '--exit', // force node to exit even if handles remain (safe for CI/runner)
    '--extension',
    'ts',
    '--reporter',
    'spec',
    '--recursive',
    'tests',
    '--exclude',
    'tests/integration/**',
    '--exclude',
    'tests/integration-tests/**',
    '--exclude',
    'tests/disabled/**',
  ];
  console.log('Spawning mocha CLI:', process.execPath, nodeArgs.join(' '));
  const child = spawn(process.execPath, nodeArgs, { stdio: 'inherit' });
  // Watchdog: protect against a hung child process (e.g. lingering handles). If the
  // child doesn't exit within two minutes, forcibly kill it and exit non-zero so CI
  // doesn't hang indefinitely.
  const watchdogMs = 2 * 60 * 1000; // 2 minutes
  const watchdog = globalThis.setTimeout(() => {
    console.error(`Mocha CLI did not exit within ${watchdogMs}ms; killing.`);
    try {
      child.kill('SIGKILL');
    } catch {
      /* ignore */
    }
    process.exit(124);
  }, watchdogMs);

  child.on('close', (code, signal) => {
    globalThis.clearTimeout(watchdog);
    console.log('Mocha CLI exited with code:', code, 'signal:', signal);
    // Ensure the runner process exits with the same status as the mocha CLI.
    process.exit(code ?? 0);
  });
}
__run().catch((err) => {
  console.error('Test runner failed:', err && err.stack ? err.stack : err);
  process.exit(1);
});
