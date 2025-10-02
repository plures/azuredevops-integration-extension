import esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWatch = process.argv.includes('--watch');
const isProd = process.argv.includes('--production');

async function build() {
  try {
    // 1) Build the extension (Node CommonJS - required for VSCode/Cursor)
    const ext = await esbuild.build({
      entryPoints: { extension: path.join(__dirname, 'src', 'activation.ts') },
      bundle: true,
      platform: 'node',
      target: ['node20'],
      external: ['vscode'],
      outfile: path.join(__dirname, 'dist', 'extension.js'),
      sourcemap: !isProd,
      minify: isProd,
      format: 'cjs',
      logLevel: 'info',
      mainFields: ['main', 'module'],
      resolveExtensions: ['.ts', '.js', '.json'],
    });
    console.log(
      `[esbuild] Built extension (CommonJS${isProd ? ' prod' : ''}) -> dist/extension.js`
    );
    // 2) Build webview scripts (browser ESM)
    const webviewOutDir = path.join(__dirname, 'media', 'webview');
    // Attempt to load a Svelte esbuild plugin; try official first, then community, else skip
    let sveltePluginLoaded = null;
    let sveltePluginName = '';
    try {
      const req = createRequire(import.meta.url);
      // Try official plugin
      try {
        req.resolve('@sveltejs/esbuild-plugin-svelte');
        const mod = await import('@sveltejs/esbuild-plugin-svelte');
        if (mod && mod.sveltePlugin) {
          sveltePluginLoaded = mod.sveltePlugin;
          sveltePluginName = '@sveltejs/esbuild-plugin-svelte';
        }
      } catch (e) {
        // Official plugin not available in this environment; will try community plugin next
      }
      // Fallback to community plugin
      if (!sveltePluginLoaded) {
        req.resolve('esbuild-svelte');
        const mod2 = await import('esbuild-svelte');
        if (mod2 && (mod2.default || mod2.sveltePlugin)) {
          sveltePluginLoaded = mod2.default || mod2.sveltePlugin;
          sveltePluginName = 'esbuild-svelte';
        }
      }
    } catch (e) {
      // No Svelte plugin resolvable; proceed without experimental UI build
    }

    const entries = [];
    const svelteEntry = path.join(__dirname, 'src', 'webview', 'svelte-main.ts');
    if (sveltePluginLoaded) {
      entries.push(svelteEntry);
    } else {
      console.warn('[esbuild] Svelte plugin not available - webview will not work properly');
    }

    // Optional: add svelte-preprocess if available for TypeScript/SCSS in .svelte
    let sveltePreprocessFn = null;
    if (sveltePluginLoaded) {
      try {
        const modPre = await import('svelte-preprocess');
        const preFactory = modPre.default || modPre.sveltePreprocess || modPre;
        if (typeof preFactory === 'function') sveltePreprocessFn = preFactory();
      } catch (e) {
        // svelte-preprocess not installed; proceed without it
      }
    }

    await esbuild.build({
      entryPoints: entries,
      outdir: webviewOutDir,
      bundle: true,
      splitting: false,
      format: 'esm',
      platform: 'browser',
      target: ['es2020'],
      sourcemap: !isProd,
      minify: isProd,
      logLevel: 'info',
      entryNames: '[name]',
      plugins: sveltePluginLoaded
        ? [
            sveltePluginLoaded({
              ...(sveltePluginName === '@sveltejs/esbuild-plugin-svelte'
                ? { compilerOptions: { dev: !isProd } }
                : {}),
              ...(sveltePreprocessFn ? { preprocess: sveltePreprocessFn } : {}),
            }),
          ]
        : [],
    });
    if (sveltePluginLoaded) {
      console.log(
        `[esbuild] Built webview scripts with Svelte plugin (${sveltePluginName}) -> media/webview/*.js`
      );
    } else {
      console.log(
        '[esbuild] Built webview scripts (without Svelte plugin, experimental UI skipped) -> media/webview/*.js'
      );
    }
    if (isWatch) {
      console.log(
        '[esbuild] Watch mode enabled (manual rebuild on change provided by esbuild incremental).'
      );
    }
    return ext;
  } catch (err) {
    console.error('[esbuild] Build failed:', err);
    process.exit(1);
  }
}

build();
