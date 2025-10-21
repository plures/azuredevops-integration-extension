import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

process.env.ESBK_TSCONFIG_PATH = path.resolve('tsconfig.tests.json');

register('@esbuild-kit/esm-loader', pathToFileURL('./'));
await import('../src/fsm/machines/applicationMachine.ts');
