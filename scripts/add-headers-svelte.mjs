#!/usr/bin/env node
// Add ownership headers to Svelte components (webview)
// - Targets: src/webview/**/*.svelte
// - Skips files that already contain a "<!-- Module:" header in the first 20 lines.
import { glob } from 'glob';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const patterns = ['src/webview/**/*.svelte'];
const ignore = ['**/node_modules/**', '**/dist/**', '**/out/**'];

function hasHeader(content) {
  const head = content.split('\n').slice(0, 20).join('\n');
  return /<!--\s*Module:/.test(head);
}

function buildHeader(file) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  return `<!--
Module: ${rel}
Owner: webview
Reads: syncState from extension (ApplicationContext serialized)
Writes: UI-only events; selection via selection writer factory (webview-owned)
Receives: syncState, host broadcasts
Emits: fsmEvent envelopes (Router handles stamping)
Prohibitions: Do not import extension host modules; Do not define context types
Rationale: Svelte UI component; reacts to ApplicationContext and forwards intents

LLM-GUARD:
- Use selection writer factory for selection updates
- Do not route by connection here; let Router decide targets
-->
`;
}

async function run() {
  const files = await glob(patterns, { ignore, nodir: true });
  let updated = 0;
  for (const file of files) {
    try {
      const content = await readFile(file, 'utf8');
      if (hasHeader(content)) continue;
      const newContent = buildHeader(file) + content;
      await writeFile(file, newContent, 'utf8');
      updated++;
    } catch (err) {
      console.error('[add-headers-svelte] Failed for', file, err?.message ?? err);
    }
  }
  console.log(`[add-headers-svelte] Updated ${updated} files`);
}

run().catch((e) => {
  console.error('[add-headers-svelte] Fatal error', e);
  process.exit(1);
});
