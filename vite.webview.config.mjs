import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(process.cwd(), 'src', 'webview'),
  base: '',
  plugins: [
    svelte({
      compilerOptions: {
        dev: false
      }
    })
  ],
  build: {
    outDir: path.resolve(process.cwd(), 'media', 'webview'),
    emptyOutDir: true,
    sourcemap: false,
    modulePreload: false,
    rollupOptions: {
      input: path.resolve(process.cwd(), 'src', 'webview', 'index.html'),
      output: {
        entryFileNames: 'main.js',
        assetFileNames: (info) => {
          if (info.name && info.name.endsWith('.css')) return 'main.css';
          return info.name || 'asset.[ext]';
        }
      }
    }
  }
});