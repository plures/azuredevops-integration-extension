/* eslint-env node */
/* eslint-disable no-console */
import path from 'node:path';
process.env.ESBK_TSCONFIG_PATH = path.resolve('tsconfig.tests.json');

// Wrapper to register the esbuild-based ESM loader using the Node `module` register API
// This avoids using the deprecated --experimental-loader flag and follows Node's
// suggested pattern for registering ESM loaders.
import { register } from 'node:module';
import util from 'node:util';

// Log unhandled rejections with full inspection so upstream objects are visible.
process.on('unhandledRejection', (reason) => {
  console.error('UnhandledRejection reason:', util.inspect(reason, { depth: null }));
  // Exit non-zero so CI/test runners detect failure.
  process.exit(1);
});

// Register @esbuild-kit/esm-loader so we can import TypeScript test files directly.
// Use import.meta.url as the parent URL per Node's recommendation for loader registration.
try {
  register('@esbuild-kit/esm-loader', import.meta.url);
} catch (err) {
  console.error('Failed to register @esbuild-kit/esm-loader:', util.inspect(err, { depth: null }));
  process.exit(2);
}

// Allow opting into smoke-only mode for faster CI by setting VSCODE_INTEGRATION_SMOKE=1.
if (!process.env.VSCODE_INTEGRATION_SMOKE && process.env.CI === 'true') {
  // Default to smoke in CI unless explicitly disabled
  process.env.VSCODE_INTEGRATION_SMOKE = '1';
}

// Import the integration test entrypoint and catch any errors during import.
try {
  await import('../tests/integration/webview-roundtrip.test.ts');
} catch (err) {
  console.error('Import failed:', util.inspect(err, { depth: null }));
  process.exit(3);
}
