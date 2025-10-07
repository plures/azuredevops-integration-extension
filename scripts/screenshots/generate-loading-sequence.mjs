#!/usr/bin/env node
/* eslint-disable no-undef */
/**
 * Generate animated GIF showing loading state transitions:
 * 1. Initializing extension (1 sec)
 * 2. Loading work items (1 sec)
 * 3. Work items displayed (2 sec)
 *
 * Requires: playwright, gifenc (or we can use ffmpeg)
 */

import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { PNG } from 'pngjs';
import gifencPkg from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifencPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CAPTURE_WIDTH = 1600; // Match viewport width
const CAPTURE_MAX_HEIGHT = 780;
const CAPTURE_PADDING = 32;
const FRAME_DELAY = 50; // milliseconds between frames for smooth playback
const CAPTURE_BORDER_RADIUS = 8;
const CAPTURE_SHADOW = '0 8px 32px rgba(0, 0, 0, 0.4)';

// VS Code Dark+ theme colors (most popular theme)
const VSCODE_THEME = {
  background: '#1e1e1e',
  sidebarBackground: '#252526',
  editorBackground: '#1e1e1e',
  foreground: '#cccccc',
  border: '#3e3e42',
  inputBackground: '#3c3c3c',
  inputForeground: '#cccccc',
  buttonBackground: '#0e639c',
  buttonForeground: '#ffffff',
  buttonHoverBackground: '#1177bb',
  listActiveBackground: '#094771',
  listHoverBackground: '#2a2d2e',
  widgetBorder: '#454545',
  widgetBorderStrong: '#6e6e6e', // More visible border for screenshots
  focusBorder: '#007acc',
  descriptionForeground: '#9d9d9d',
};

async function readJson(p) {
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const contentTypes = new Map([
      ['.html', 'text/html; charset=utf-8'],
      ['.js', 'application/javascript; charset=utf-8'],
      ['.mjs', 'application/javascript; charset=utf-8'],
      ['.css', 'text/css; charset=utf-8'],
      ['.svg', 'image/svg+xml'],
      ['.png', 'image/png'],
    ]);

    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURI((req.url || '/').split('?')[0]);
        let relPath = urlPath === '/' ? '/svelte.html' : urlPath;
        const filePath = path.join(rootDir, path.normalize(relPath).replace(/^\\|^\//, ''));
        if (!filePath.startsWith(rootDir)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }
        if (!fsSync.existsSync(filePath)) {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const ct = contentTypes.get(ext) || 'application/octet-stream';
        res.statusCode = 200;
        res.setHeader('Content-Type', ct);
        fsSync.createReadStream(filePath).pipe(res);
      } catch {
        res.statusCode = 500;
        res.end('Server error');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (typeof address === 'object' && address && 'port' in address) {
        resolve({
          port: address.port,
          stop: () => new Promise((r) => server.close(() => r())),
        });
      } else {
        reject(new Error('Failed to bind static server'));
      }
    });
  });
}

/**
 * Convert PNG sequence to GIF using pure JavaScript (gifenc + pngjs)
 */
async function createGifFromFrames(framesDir, outputPath, fps = 20) {
  console.log('[gif] Reading PNG frames...');

  // Get all frame files
  const files = await fs.readdir(framesDir);
  const frameFiles = files.filter((f) => f.startsWith('frame-') && f.endsWith('.png')).sort();

  if (frameFiles.length === 0) {
    throw new Error('No frames found');
  }

  console.log(`[gif] Found ${frameFiles.length} frames`);

  // Read first frame to get dimensions
  const firstFramePath = path.join(framesDir, frameFiles[0]);
  const firstFrameBuffer = await fs.readFile(firstFramePath);
  const firstPng = PNG.sync.read(firstFrameBuffer);
  const { width, height } = firstPng;

  console.log(`[gif] Frame size: ${width}x${height}`);

  // Create GIF encoder
  const gif = GIFEncoder();
  const delay = Math.round(1000 / fps); // delay in milliseconds

  // Process each frame
  for (let i = 0; i < frameFiles.length; i++) {
    const framePath = path.join(framesDir, frameFiles[i]);
    const frameBuffer = await fs.readFile(framePath);
    const png = PNG.sync.read(frameBuffer);

    // Convert RGBA to RGB (gifenc expects RGB)
    const rgb = new Uint8Array(width * height * 4);
    for (let j = 0; j < png.data.length; j += 4) {
      rgb[j] = png.data[j]; // R
      rgb[j + 1] = png.data[j + 1]; // G
      rgb[j + 2] = png.data[j + 2]; // B
      rgb[j + 3] = png.data[j + 3]; // A
    }

    // Quantize colors to 256 color palette
    const palette = quantize(rgb, 256);
    const index = applyPalette(rgb, palette);

    // Add frame to GIF
    gif.writeFrame(index, width, height, {
      palette,
      delay,
      transparent: false,
    });

    if ((i + 1) % 10 === 0 || i === frameFiles.length - 1) {
      console.log(`[gif] Processed ${i + 1}/${frameFiles.length} frames`);
    }
  }

  // Finalize and write GIF
  gif.finish();
  const buffer = gif.bytes();
  await fs.writeFile(outputPath, buffer);

  console.log('[gif] ✅ Created:', outputPath);
  console.log(`[gif] Size: ${(buffer.length / 1024).toFixed(2)} KB`);
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const svelteEntry = path.resolve(repoRoot, 'media', 'webview', 'svelte.html');
  const outDir = path.resolve(repoRoot, 'images');
  const framesDir = path.resolve(outDir, 'loading-frames');
  const samplePath = path.resolve(__dirname, 'sample-data.json');
  const staticRoot = path.resolve(repoRoot, 'media', 'webview');

  try {
    await fs.access(svelteEntry);
  } catch {
    console.error('[loading-gif] Webview HTML not found at', svelteEntry);
    console.error('Run: npm run build');
    process.exit(1);
  }

  const sample = await readJson(samplePath);
  await ensureDir(outDir);
  await ensureDir(framesDir);

  // Clean up old frames
  try {
    const files = await fs.readdir(framesDir);
    for (const file of files) {
      if (file.startsWith('frame-') && file.endsWith('.png')) {
        await fs.unlink(path.join(framesDir, file));
      }
    }
  } catch {
    // ignore
  }

  const server = await startStaticServer(staticRoot);
  const baseUrl = `http://127.0.0.1:${server.port}/svelte.html`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: {
      width: (CAPTURE_WIDTH + CAPTURE_PADDING * 2) * 2, // Add padding to viewport so pane can be full width
      height: CAPTURE_MAX_HEIGHT,
    },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Inject mock vscode API that responds to webview messages
  await page.addInitScript((fixture) => {
    window.__AZDO_FIXTURE__ = fixture;

    function makeApi() {
      let kanbanView = false;

      return {
        postMessage: (msg) => {
          // Respond to webviewReady with connections
          if (msg && msg.type === 'webviewReady') {
            setTimeout(() => {
              window.postMessage(
                {
                  type: 'connectionsUpdate',
                  connections: fixture.connections || [],
                  activeConnectionId: fixture.activeConnectionId,
                },
                '*'
              );
            }, 10);
          }
          // Handle kanban view toggle
          if (msg && msg.type === 'toggleKanbanView') {
            kanbanView = !kanbanView;
          }
        },
        setState: (state) => {
          if (state && typeof state.kanbanView === 'boolean') {
            kanbanView = state.kanbanView;
          }
        },
        getState: () => ({ kanbanView }),
      };
    }

    if (typeof window.acquireVsCodeApi !== 'function') {
      window.acquireVsCodeApi = makeApi;
    }
    if (!window.vscode) {
      window.vscode = makeApi();
    }

    // Expose state control for screenshots
    window.__setLoadingState__ = (state) => {
      if (state === 'loading') {
        window.postMessage(
          {
            type: 'workItemsLoading',
            query: 'My Activity',
            connectionId: fixture.activeConnectionId,
          },
          '*'
        );
      } else if (state === 'loaded') {
        const items = fixture.workItems.map((w) => ({
          id: w.id,
          fields: {
            'System.Id': w.id,
            'System.Title': w.title,
            'System.WorkItemType': w.type,
            'System.State': w.state,
            'System.AssignedTo':
              !w.assignedTo || w.assignedTo === 'Unassigned'
                ? undefined
                : { displayName: w.assignedTo },
            'Microsoft.VSTS.Common.Priority': w.priority,
            'System.ChangedDate': new Date().toISOString(),
          },
        }));

        window.postMessage(
          {
            type: 'workItemsLoaded',
            workItems: items,
            connectionId: fixture.activeConnectionId,
            kanbanView: false,
          },
          '*'
        );
      }
    };
  }, sample);

  await page.goto(baseUrl);

  // Load the Svelte component CSS (esbuild generates this but doesn't auto-inject it)
  const cssPath = baseUrl.replace('svelte.html', 'svelte-main.css');
  await page.addStyleTag({ url: cssPath });

  // Inject VS Code theme CSS variables
  await page.addStyleTag({
    content: `
      :root {
        --vscode-font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        --vscode-font-size: 13px;
        --vscode-foreground: ${VSCODE_THEME.foreground};
        --vscode-sideBar-background: ${VSCODE_THEME.sidebarBackground};
        --vscode-editor-background: ${VSCODE_THEME.editorBackground};
        --vscode-editor-foreground: ${VSCODE_THEME.foreground};
        --vscode-widget-border: ${VSCODE_THEME.widgetBorderStrong};
        --vscode-editorWidget-border: ${VSCODE_THEME.widgetBorderStrong};
        --vscode-editorWidget-background: ${VSCODE_THEME.inputBackground};
        --vscode-input-background: ${VSCODE_THEME.inputBackground};
        --vscode-input-foreground: ${VSCODE_THEME.inputForeground};
        --vscode-input-border: ${VSCODE_THEME.border};
        --vscode-input-placeholderForeground: ${VSCODE_THEME.descriptionForeground};
        --vscode-button-background: ${VSCODE_THEME.buttonBackground};
        --vscode-button-foreground: ${VSCODE_THEME.buttonForeground};
        --vscode-button-hoverBackground: ${VSCODE_THEME.buttonHoverBackground};
        --vscode-button-secondaryBackground: ${VSCODE_THEME.inputBackground};
        --vscode-button-secondaryForeground: ${VSCODE_THEME.foreground};
        --vscode-button-secondaryHoverBackground: ${VSCODE_THEME.listHoverBackground};
        --vscode-button-border: ${VSCODE_THEME.border};
        --vscode-list-activeSelectionBackground: ${VSCODE_THEME.listActiveBackground};
        --vscode-list-hoverBackground: ${VSCODE_THEME.listHoverBackground};
        --vscode-toolbar-hoverBackground: ${VSCODE_THEME.listHoverBackground};
        --vscode-focusBorder: ${VSCODE_THEME.focusBorder};
        --vscode-descriptionForeground: ${VSCODE_THEME.descriptionForeground};
        --vscode-textBlockQuote-background: #2a2a2a;
        
        /* Azure DevOps semantic colors */
        --primary-color: #0078d4;
        --success-color: #107c10;
        --warning-color: #f8961e;
        --danger-color: #d13438;
        --info-color: #5c2d91;
        
        /* Azure DevOps state colors */
        --ado-blue: #0078d4;
        --ado-green: #107c10;
        --ado-orange: #ff8c00;
        --ado-red: #d13438;
        --ado-purple: #5c2d91;
        --ado-gray: #605e5c;
        --state-new: #0078d4;
        --state-active: #ff8c00;
        --state-inprogress: #ff8c00;
        --state-resolved: #107c10;
        --state-done: #107c10;
        --state-closed: #605e5c;
      }
    `,
  });

  // Add styling for clean screenshots with solid background
  await page.addStyleTag({
    content: `
      body, html { 
        background: #0d1117 !important; 
        margin: 0 !important; 
        padding: ${CAPTURE_PADDING}px !important;
        display: flex !important;
        justify-content: center !important;
        align-items: flex-start !important;
        min-height: 100vh !important;
      }
      .pane {
        width: 1600px !important;
        max-width: 1600px !important;
        height: ${CAPTURE_MAX_HEIGHT - CAPTURE_PADDING * 2}px !important;
        max-height: ${CAPTURE_MAX_HEIGHT - CAPTURE_PADDING * 2}px !important;
        margin: 0 auto !important;
        border-radius: ${CAPTURE_BORDER_RADIUS}px !important;
        box-shadow: ${CAPTURE_SHADOW} !important;
        overflow: hidden !important;
        background: #0d1117 !important;
        padding: 0 !important;
      }
      /* Make content fill the pane width */
      .pane > * {
        width: 100% !important;
        max-width: 100% !important;
      }
      /* Ensure borders are visible */
      .work-item-card {
        border: 1px solid ${VSCODE_THEME.widgetBorderStrong} !important;
      }
      /* Let kanban board use full width */
      .kanban-board {
        width: 100% !important;
        max-width: none !important;
      }
    `,
  });

  const captureFrame = async (frameNumber, description) => {
    await page.waitForTimeout(200); // Let UI settle
    const framePath = path.join(framesDir, `frame-${String(frameNumber).padStart(4, '0')}.png`);
    const pane = await page.$('.pane');
    if (pane) {
      await pane.screenshot({
        path: framePath,
        // No omitBackground - use solid background color instead
      });
      console.log(`[loading-gif] Captured frame ${frameNumber}: ${description}`);
    } else {
      await page.screenshot({
        path: framePath,
      });
      console.log(`[loading-gif] Captured frame ${frameNumber} (fallback): ${description}`);
    }
  };

  let frameNum = 1;

  // State 1: Initializing (0.5 seconds = 10 frames at 20fps)
  console.log('[loading-gif] Capturing initializing state...');
  await page.waitForSelector('#svelte-root', { timeout: 5000 });
  for (let i = 0; i < 10; i++) {
    await captureFrame(frameNum++, 'initializing');
    await page.waitForTimeout(FRAME_DELAY);
  }

  // State 2: Loading (0.5 seconds = 10 frames at 20fps)
  console.log('[loading-gif] Capturing loading state...');
  await page.evaluate(() => window.__setLoadingState__('loading'));
  await page.waitForSelector('.loading', { timeout: 5000 });
  for (let i = 0; i < 10; i++) {
    await captureFrame(frameNum++, 'loading');
    await page.waitForTimeout(FRAME_DELAY);
  }

  // State 3: List view with items (1.5 seconds = 30 frames at 20fps)
  console.log('[loading-gif] Capturing list view...');
  await page.evaluate(() => window.__setLoadingState__('loaded'));
  await page.waitForSelector('.work-item-card', { timeout: 5000 });
  for (let i = 0; i < 30; i++) {
    await captureFrame(frameNum++, 'list-view');
    await page.waitForTimeout(FRAME_DELAY);
  }

  // State 4: Transition to Kanban view (0.3 seconds = 6 frames for smooth transition)
  console.log('[loading-gif] Capturing transition to kanban...');

  await page.evaluate(() => {
    window.postMessage({ type: 'toggleKanbanView' }, '*');
  });
  await page.waitForTimeout(100); // Let transition start
  for (let i = 0; i < 6; i++) {
    await captureFrame(frameNum++, 'transition');
    await page.waitForTimeout(FRAME_DELAY);
  }

  // State 5: Kanban view (1.7 seconds = 34 frames at 20fps)
  console.log('[loading-gif] Capturing kanban view...');
  await page.waitForSelector('.kanban-board', { timeout: 5000 });
  for (let i = 0; i < 34; i++) {
    await captureFrame(frameNum++, 'kanban-view');
    await page.waitForTimeout(FRAME_DELAY);
  }

  await browser.close();
  await server.stop();

  // Convert frames to GIF
  console.log('[loading-gif] Converting frames to GIF...');
  const gifPath = path.resolve(outDir, 'loading-sequence.gif');

  try {
    await createGifFromFrames(framesDir, gifPath, 20);
    console.log('[loading-gif] ✅ Created animated GIF:', gifPath);

    // Optionally clean up frames
    // await fs.rm(framesDir, { recursive: true });
  } catch (err) {
    console.error('[loading-gif] Failed to create GIF:', err.message);
    console.log('[loading-gif] Frames saved in:', framesDir);
    console.log('[loading-gif] You can manually create a GIF from these frames');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
