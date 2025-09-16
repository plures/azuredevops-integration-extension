// Minimal esbuild bundler for new activation scaffold pulling in recovered sources
//const esbuild = require('esbuild');
//const path = require('path');
/* eslint-env node */
// @ts-nocheck
// Explicit Node global hints for linters in ESM context
/* global process, console */
import esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWatch = process.argv.includes('--watch');
const isProd = process.argv.includes('--production');

async function build() {
  await esbuild.build({
    entryPoints: { extension: path.join(__dirname, 'src', 'activation.ts') },
    bundle: true,
    platform: 'node',
    target: ['node18'],
    external: ['vscode'],
    outfile: path.join(__dirname, 'dist', 'extension.js'),
    sourcemap: !isProd,
    minify: isProd,
    format: 'esm', // restored pure ESM output
    banner: {
      js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);'
    },
    logLevel: 'info'
  });
  console.log('Built extension (ESM) -> dist/extension.js');
}

build().catch(err => { console.error(err); process.exit(1); });

// Post-build hook to patch webview runtime (executed only when explicitly invoked for webview build via npm script optional step)
// We keep it lightweight and idempotent.
if (process.env.PATCH_WEBVIEW_RUNTIME === '1') {
  try {
    const fs = await import('node:fs/promises');
    const webviewMain = path.join(__dirname, 'media', 'webview', 'main.js');
    let src = await fs.readFile(webviewMain, 'utf8');
    if (/__GH_PATCH_APPLIED__/.test(src)) {
      console.log('[patch] webview main.js already patched');
    } else {
      // Replace get_first_child and get_next_sibling bodies with guarded fallbacks.
      // Pattern: function get_first_child(node) { return first_child_getter.call(node); }
      const patched = src.replace(/function get_first_child\(node\) {[^}]+}/, 'function get_first_child(node){ try { return first_child_getter ? first_child_getter.call(node) : (node?node.firstChild:null); } catch { return node?node.firstChild:null; } }')
        .replace(/function get_next_sibling\(node\) {[^}]+}/, 'function get_next_sibling(node){ try { return next_sibling_getter ? next_sibling_getter.call(node) : (node?node.nextSibling:null); } catch { return node?node.nextSibling:null; } }')
        + '\n/* __GH_PATCH_APPLIED__ safeguard first/next child fallbacks */';
      await fs.writeFile(webviewMain, patched, 'utf8');
      console.log('[patch] Applied safe fallback wrappers to get_first_child/get_next_sibling');
    }
  } catch (e) {
    console.warn('[patch] webview runtime patch failed', e);
  }
}

if (isWatch) console.log('Watch mode enabled');
