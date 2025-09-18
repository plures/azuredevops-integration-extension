// Diagnostic helper: register ts-node/esm in transpile-only mode and import key modules
// then print active handles so we can identify timers/sockets that keep the process alive.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import util from 'node:util';

process.env.TS_NODE_TRANSPILE_ONLY = 'true';

process.on('unhandledRejection', (r) => {
  console.error('UnhandledRejection:', util.inspect(r, { depth: null }));
  process.exit(1);
});

try {
  register('ts-node/esm', pathToFileURL('./'));
} catch (err) {
  console.error('Failed to register ts-node/esm:', util.inspect(err, { depth: null }));
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
