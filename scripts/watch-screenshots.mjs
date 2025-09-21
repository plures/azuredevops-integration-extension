#!/usr/bin/env node
/* eslint-disable no-undef */
// Watch webview assets and regenerate screenshots on change
import chokidar from 'chokidar';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runGenerate() {
  try {
    const mod = await import(path.resolve(__dirname, 'screenshots', 'generate-screenshots.mjs'));
    if (mod && mod.default) {
      // no-op; module runs main on import
    }
  } catch (e) {
    console.error('[screenshots:watch] Failed to generate:', e?.message || e);
  }
}

console.log('[screenshots:watch] Watching for changes...');
const watcher = chokidar.watch([
  path.resolve(__dirname, '..', 'media', 'webview', '**', '*'),
  path.resolve(__dirname, 'screenshots', '**', '*'),
]);

let pending = false;
async function debouncedRun() {
  if (pending) return;
  pending = true;
  setTimeout(async () => {
    await runGenerate();
    pending = false;
  }, 250);
}

watcher.on('change', debouncedRun).on('add', debouncedRun).on('unlink', debouncedRun);
