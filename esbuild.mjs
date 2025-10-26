import esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWatch = process.argv.includes('--watch');
const isProd = process.argv.includes('--production');

async function buildExtension() {
  // 1) Build the extension (Node CommonJS - required for VSCode/Cursor)
  const ext = await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'activation.ts')],
    bundle: true,
    platform: 'node',
    target: ['node20'],
    external: ['vscode'],
    outfile: path.join(__dirname, 'dist', 'extension.cjs'),
    sourcemap: !isProd,
    minify: isProd,
    format: 'cjs',
    logLevel: 'info',
    mainFields: ['main', 'module'],
    resolveExtensions: ['.ts', '.js', '.json'],
  });
  console.log(`[esbuild] Built extension (CommonJS${isProd ? ' prod' : ''}) -> dist/extension.cjs`);
  return ext;
}

async function buildWebview() {
  console.log('[esbuild] Building webview...');

  // Import the svelte plugin
  const { default: sveltePlugin } = await import('esbuild-svelte');

  try {
    await esbuild.build({
      entryPoints: ['src/webview/main.ts'],
      bundle: true,
      outfile: 'media/webview/main.js',
      sourcemap: !isProd,
      minify: isProd,
      target: 'es2020',
      format: 'iife',
      platform: 'browser',
      loader: {
        '.html': 'text',
        '.css': 'css',
      },
      logOverride: {
        'invalid-source-mappings': 'silent',
      },
      plugins: [
        sveltePlugin({
          compilerOptions: {
            css: 'external',
            dev: !isProd,
          },
        }),
      ],
      external: [
        // Explicitly exclude Node.js modules and VSCode API
        'vscode',
        'fs',
        'path',
        'crypto',
        'http',
        'https',
        'stream',
        'util',
        'perf_hooks',
        'azure-devops-node-api',
      ],
      define: {
        'process.env.NODE_ENV': isProd ? '"production"' : '"development"',
        'process.env.BROWSER': '"true"',
      },
      banner: {
        js: `/* Azure DevOps Integration - Webview Bundle */\n(function(){\n  // Early process shim for dependencies referencing process/env before entry executes\n  var g = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : this);\n  if (!g.process) {\n    g.process = {\n      env: {\n        NODE_ENV: ${isProd ? '"production"' : '"development"'},\n        BROWSER: 'true'\n      },\n      nextTick: function(cb){ Promise.resolve().then(cb); },\n      cwd: function(){ return '/'; },\n      platform: 'browser',\n      version: 'v0-webview'\n    };\n  } else {\n    if (!g.process.env) {\n      g.process.env = { NODE_ENV: ${isProd ? '"production"' : '"development"'}, BROWSER: 'true' };\n    } else if (!g.process.env.NODE_ENV) {\n      g.process.env.NODE_ENV = ${isProd ? '"production"' : '"development"'};\n    }\n    if (!g.process.nextTick) {\n      g.process.nextTick = function(cb){ Promise.resolve().then(cb); };\n    }\n  }\n})();`,
      },
    });

    console.log('[esbuild] ✓ Webview built successfully');
  } catch (error) {
    console.error('[esbuild] ✗ Webview build failed:', error);
    throw error;
  }
}

async function build() {
  try {
    // Build extension first
    const ext = await buildExtension();

    // Then build webview
    await buildWebview();

    return ext;
  } catch (err) {
    console.error('[esbuild] Build failed:', err);
    process.exit(1);
  }
}

build();
