#!/usr/bin/env node
// Lightweight dev CLI to orchestrate webview dev server + extension watch
import { spawn } from 'child_process';

function run(name, args, opts = {}) {
  const p = spawn(name, args, { stdio: 'inherit', shell: true, ...opts });
  p.on('close', (c) => {
    console.log(`${name} exited ${c}`);
  });
  return p;
}

// Example usage: node scripts/dev-cli.js
console.log('Starting webview dev server and extension watch...');
const web = run('npm', ['--prefix', 'src/webview', 'run', 'dev']);
const ext = run('npm', ['run', 'watch']);

process.on('SIGINT', () => {
  web.kill();
  ext.kill();
  process.exit(0);
});
