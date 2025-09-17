import { defineConfig } from 'vite';
import * as path from 'path';

export default defineConfig({
  // Point Vite at the webview source folder
  root: path.resolve(__dirname, 'src', 'webview'),
  base: '',
  build: {
    outDir: path.resolve(__dirname, 'media', 'webview'),
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src', 'webview', 'index.html'),
      output: {
        // Force stable file names to simplify HTML generation
        entryFileNames: 'main.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'main.css';
          return assetInfo.name || 'asset.[ext]';
        },
      },
    },
  },
});
