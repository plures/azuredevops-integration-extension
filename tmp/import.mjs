import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

process.env.ESBK_TSCONFIG_PATH = path.resolve('tsconfig.tests.json');

register('@esbuild-kit/esm-loader', pathToFileURL('./'));

const target = process.argv[2] ?? './src/fsm/machines/applicationMachine.ts';
await import(new URL(target, pathToFileURL('./')));
