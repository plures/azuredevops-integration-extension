#!/usr/bin/env node
// ESM wrapper that sets TS_NODE env vars before launching the ESM test runner
// Replaces the legacy .cjs wrapper so the repo is ESM-only.
process.env.TS_NODE_TRANSPILE_ONLY = 'true';
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: 'NodeNext' });

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure a local 'vscode' stub exists in node_modules so unit tests can import it
try {
  const projectRoot = path.resolve(__dirname, '..');
  const stubSrcDir = path.resolve(projectRoot, 'vscode-stub');
  const stubIndex = path.resolve(stubSrcDir, 'index.js');
  const stubPkg = path.resolve(stubSrcDir, 'package.json');
  const nmVscodeDir = path.resolve(projectRoot, 'node_modules', 'vscode');
  const nmVscodePkg = path.resolve(nmVscodeDir, 'package.json');
  const nmVscodeIndex = path.resolve(nmVscodeDir, 'index.js');
  if (fs.existsSync(stubIndex)) {
    if (!fs.existsSync(nmVscodeDir)) fs.mkdirSync(nmVscodeDir, { recursive: true });
    let pkgJson = { name: 'vscode', version: '0.0.0', type: 'module', main: 'index.js' };
    try {
      if (fs.existsSync(stubPkg)) {
        const raw = JSON.parse(fs.readFileSync(stubPkg, 'utf8'));
        pkgJson = {
          name: 'vscode',
          version: '0.0.0',
          type: raw.type || 'module',
          main: 'index.js',
        };
      }
    } catch {
      // ignore parse failure
    }
    fs.writeFileSync(nmVscodePkg, JSON.stringify(pkgJson, null, 2));
    fs.copyFileSync(stubIndex, nmVscodeIndex);
  }
} catch {
  // best-effort; unit tests may fail if vscode cannot be stubbed
}

const runner = path.join(__dirname, 'run-esm-tests.mjs');
const res = spawnSync(process.execPath, [runner], { stdio: 'inherit' });
process.exit(res.status || 0);
