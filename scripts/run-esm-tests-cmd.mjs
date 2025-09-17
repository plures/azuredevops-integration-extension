#!/usr/bin/env node
// ESM wrapper that sets TS_NODE env vars before launching the ESM test runner
// Replaces the legacy .cjs wrapper so the repo is ESM-only.
process.env.TS_NODE_TRANSPILE_ONLY = 'true';
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: 'NodeNext' });

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runner = path.join(__dirname, 'run-esm-tests.mjs');
const res = spawnSync(process.execPath, [runner], { stdio: 'inherit' });
process.exit(res.status || 0);
