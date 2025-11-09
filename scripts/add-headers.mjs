#!/usr/bin/env node
// Add ownership headers to TypeScript modules.
// - Targets: src/**/*.ts (excluding *.d.ts, **/*.test.ts, dist/**, out/**)
// - Skips files that already contain a "Module:" header in the first 20 lines.
import { glob } from 'glob';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const patterns = ['src/**/*.ts'];
const ignore = [
  '**/*.d.ts',
  '**/*.test.ts',
  '**/dist/**',
  '**/out/**',
  '**/node_modules/**',
  '**/vscode-stub/**',
];

function detectOwner(file) {
  const p = file.replace(/\\/g, '/');
  if (p.includes('/webview/')) return 'webview';
  if (p.includes('/fsm/machines/connection')) return 'connection';
  if (p.includes('/features/connection/')) return 'connection';
  if (p.includes('/features/timer/')) return 'timer';
  if (p.includes('/fsm/')) return 'application';
  if (p.includes('/provider')) return 'connection';
  if (p.includes('/azureClient')) return 'connection';
  return 'application';
}

function buildHeader(file) {
  const owner = detectOwner(file);
  const rel = path.relative(root, file).replace(/\\/g, '/');
  return `/**
 * Module: ${rel}
 * Owner: ${owner}
 * Reads: (document)
 * Writes: (document)
 * Receives: (document)
 * Emits: (document)
 * Prohibitions: Do not mutate ApplicationContext directly; Do not define new *Context types
 * Rationale: (document)
 *
 * LLM-GUARD:
 * - Follow ownership boundaries; route events to Router; do not add UI logic here
 */
`;
}

function hasHeader(content) {
  const head = content.split('\n').slice(0, 20).join('\n');
  return /Module:\s/.test(head);
}

async function run() {
  const files = await glob(patterns, { ignore, nodir: true });
  let updated = 0;
  for (const file of files) {
    try {
      const content = await readFile(file, 'utf8');
      if (hasHeader(content)) continue;
      // Preserve shebang if present
      let newContent;
      if (content.startsWith('#!')) {
        const idx = content.indexOf('\n');
        const shebang = content.slice(0, idx + 1);
        newContent = shebang + buildHeader(file) + content.slice(idx + 1);
      } else {
        newContent = buildHeader(file) + content;
      }
      await writeFile(file, newContent, 'utf8');
      updated++;
    } catch (err) {
      console.error('[add-headers] Failed for', file, err?.message ?? err);
    }
  }
  console.log(`[add-headers] Updated ${updated} files`);
}

run().catch((e) => {
  console.error('[add-headers] Fatal error', e);
  process.exit(1);
});
