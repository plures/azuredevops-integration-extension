// Diagnostic helper: register the esbuild ESM loader and import key modules
// then print active handles so we can identify timers/sockets that keep the process alive.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import util from 'node:util';
import path from 'node:path';

process.env.ESBK_TSCONFIG_PATH = path.resolve('tsconfig.tests.json');

process.on('unhandledRejection', (r) => {
  console.error('UnhandledRejection:', util.inspect(r, { depth: null }));
  process.exit(1);
});

try {
  register('@esbuild-kit/esm-loader', pathToFileURL('./'));
} catch (err) {
  console.error('Failed to register @esbuild-kit/esm-loader:', util.inspect(err, { depth: null }));
  process.exit(2);
}

async function inspectHandles() {
  // Import modules that commonly create background handles. Avoid side-effectful initialization.
  try {
    await import('../src/rateLimiter.ts');
    await import('../src/timer.ts');
    await import('../src/azureClient.ts');
    await import('../src/provider.ts');
  } catch (err) {
    console.error(
      'Import error (expected if modules require runtime env):',
      util.inspect(err, { depth: 1 })
    );
  }

  // Give any microtasks a moment to settle.
  await new Promise((r) => setTimeout(r, 250));

  const handles = process._getActiveHandles();
  console.log(`Found ${handles.length} active handles:`);
  handles.forEach((h, i) => {
    const info = {
      index: i,
      type: h.constructor?.name || typeof h,
      inspect: util.inspect(h, { depth: 1 }),
    };
    console.log(info);
  });
}

inspectHandles().then(() => process.exit(0));
