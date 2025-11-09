#!/usr/bin/env node
/**
 * Generate Loading Sequence GIF
 * 
 * Creates an animated GIF showing the complete extension workflow:
 * - Initializing (10 frames)
 * - Loading (10 frames)
 * - List view (30 frames)
 * - Transition to Kanban (6 frames)
 * - Kanban view (34 frames)
 * Total: 90 frames, 4.5 seconds at 20 FPS
 */

import { chromium } from 'playwright';
import { writeFile, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'url';
import http from 'node:http';
import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;
import { PNG } from 'pngjs';

import { ensurePrerequisites } from './check-prerequisites.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');

// Constants
const CAPTURE_WIDTH = 1600;
const CAPTURE_PADDING = 0;
const CAPTURE_MAX_HEIGHT = 716;
const FPS = 20;
const FRAME_DELAY = 1000 / FPS; // 50ms per frame

// VS Code Dark+ Theme Colors
const VSCODE_THEME = {
  background: '#1e1e1e',
  foreground: '#cccccc',
  widgetBorderStrong: '#6e6e6e',
  inputBackground: '#3c3c3c',
  buttonBackground: '#0e639c',
  listActiveBackground: '#094771',
  focusBorder: '#007acc',
  editorWidgetBackground: '#252526',
  editorWidgetBorder: '#454545',
};

// Sample work items aligned to ADO fields expected by the webview
function makeSampleWorkItems() {
  const now = new Date();
  const dt = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  return [
    {
      id: 101,
      fields: {
        'System.Title': 'Implement user authentication flow',
        'System.WorkItemType': 'Task',
        'System.State': 'Active',
        'System.AssignedTo': { displayName: 'Alex Johnson' },
        'Microsoft.VSTS.Common.Priority': 2,
        'System.ChangedDate': dt(1),
        'System.CreatedDate': dt(10),
        'System.Tags': 'auth;feature',
      },
    },
    {
      id: 102,
      fields: {
        'System.Title': 'Fix null pointer crash on settings page',
        'System.WorkItemType': 'Bug',
        'System.State': 'To Do',
        'System.AssignedTo': 'Unassigned',
        'Microsoft.VSTS.Common.Priority': 1,
        'System.ChangedDate': dt(2),
        'System.CreatedDate': dt(8),
        'System.Tags': 'bug;settings;crash',
      },
    },
    {
      id: 103,
      fields: {
        'System.Title': 'Add team filters to work items view',
        'System.WorkItemType': 'Feature',
        'System.State': 'In Progress',
        'System.AssignedTo': { displayName: 'Sam Patel' },
        'Microsoft.VSTS.Common.Priority': 3,
        'System.ChangedDate': dt(0.5),
        'System.CreatedDate': dt(7),
        'System.Tags': 'ui;filter',
      },
    },
    {
      id: 104,
      fields: {
        'System.Title': 'Write integration tests for timer module',
        'System.WorkItemType': 'Task',
        'System.State': 'Review',
        'System.AssignedTo': { displayName: 'Chris Lee' },
        'Microsoft.VSTS.Common.Priority': 2,
        'System.ChangedDate': dt(3),
        'System.CreatedDate': dt(12),
        'System.Tags': 'tests;timer',
      },
    },
    {
      id: 105,
      fields: {
        'System.Title': 'Polish Kanban card layout and styling',
        'System.WorkItemType': 'Task',
        'System.State': 'Done',
        'System.AssignedTo': { displayName: 'Taylor Kim' },
        'Microsoft.VSTS.Common.Priority': 2,
        'System.ChangedDate': dt(0.2),
        'System.CreatedDate': dt(6),
        'System.Tags': 'kanban;css',
      },
    },
    {
      id: 106,
      fields: {
        'System.Title': 'Implement drag-and-drop for Kanban columns',
        'System.WorkItemType': 'Feature',
        'System.State': 'In Progress',
        'System.AssignedTo': { displayName: 'Jordan Martinez' },
        'Microsoft.VSTS.Common.Priority': 2,
        'System.ChangedDate': dt(1.5),
        'System.CreatedDate': dt(9),
        'System.Tags': 'kanban;dnd',
      },
    },
    {
      id: 107,
      fields: {
        'System.Title': 'Add support for custom work item fields',
        'System.WorkItemType': 'Feature',
        'System.State': 'New',
        'System.AssignedTo': { displayName: 'Morgan Davis' },
        'Microsoft.VSTS.Common.Priority': 3,
        'System.ChangedDate': dt(4),
        'System.CreatedDate': dt(14),
        'System.Tags': 'customization;fields',
      },
    },
  ];
}

function makeSampleKanbanColumns(items) {
  const pick = (predicate) =>
    items.filter((w) => predicate(String(w.fields?.['System.State'] || '').toLowerCase())).map((w) => w.id);
  const todo = pick((s) => s.includes('new') || s.includes('to do') || s.includes('todo') || s.includes('proposed'));
  const inprog = pick((s) => s.includes('in progress') || s.includes('inprogress') || s.includes('doing') || s.includes('active'));
  const review = pick((s) => s.includes('review') || s.includes('testing'));
  const done = pick((s) => s.includes('done') || s.includes('resolved') || s.includes('closed') || s.includes('completed'));
  const assigned = new Set([...todo, ...inprog, ...review, ...done]);
  const leftovers = items.filter((w) => !assigned.has(w.id)).map((w) => w.id);
  if (leftovers.length) inprog.push(...leftovers);
  return [
    { id: 'todo', title: 'To Do', itemIds: todo },
    { id: 'inprogress', title: 'In Progress', itemIds: inprog },
    { id: 'review', title: 'Review/Testing', itemIds: review },
    { id: 'done', title: 'Done', itemIds: done },
  ];
}

async function main() {
  console.log('[loading-gif] Checking prerequisites...');
  const prerequisitesOk = await ensurePrerequisites();
  if (!prerequisitesOk) {
    console.error('[loading-gif] Prerequisites check failed');
    process.exit(1);
  }

  console.log('[loading-gif] Starting screenshot generation...');

  // Start a tiny static server to serve media/webview over http so the bundle loads
  const webviewDir = join(PROJECT_ROOT, 'media', 'webview');
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      let filePath = url.pathname.replace(/^\/+/, '');
      if (!filePath || filePath === '/') filePath = 'svelte.html';
      const abspath = join(webviewDir, filePath);
      const data = await readFile(abspath);
      const ext = abspath.split('.').pop()?.toLowerCase() || '';
      const type =
        ext === 'html'
          ? 'text/html'
          : ext === 'css'
            ? 'text/css'
            : ext === 'js'
              ? 'text/javascript'
              : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      res.end(data);
    } catch (e) {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  const baseHttpUrl = `http://127.0.0.1:${port}/svelte.html`;
  console.log('[loading-gif] Serving webview from', baseHttpUrl);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: {
      width: ((CAPTURE_WIDTH + CAPTURE_PADDING * 2) * 2),
      height: CAPTURE_MAX_HEIGHT,
    },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Load the webview HTML
  const htmlPath = join(PROJECT_ROOT, 'media', 'webview', 'svelte.html');
  const baseUrl = pathToFileURL(htmlPath).toString();
  await page.goto(baseHttpUrl);
  // Remove restrictive CSP to allow script/style injection in Playwright
  await page.evaluate(() => {
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (csp) csp.remove();
  });
  // Ensure mount target exists even if bundle fails to create it
  await page.evaluate(() => {
    if (!document.getElementById('svelte-root')) {
      const el = document.createElement('div');
      el.id = 'svelte-root';
      document.body.appendChild(el);
    }
  });

  // Load CSS - use absolute file path
  const cssPath = join(PROJECT_ROOT, 'media', 'webview', 'main.css');
  try {
    await page.addStyleTag({ path: cssPath });
    console.log('[loading-gif] CSS loaded successfully');
  } catch (error) {
    console.warn('[loading-gif] Could not load CSS from', cssPath, '- continuing without it');
  }

  // Load the built webview bundle so Svelte renders components
  const jsPath = join(PROJECT_ROOT, 'media', 'webview', 'main.js');
  try {
    // When served over http, the script tag in svelte.html should load automatically.
    // As a fallback, inject inline.
    const jsCode = await readFile(jsPath, 'utf8');
    await page.addScriptTag({ content: jsCode });
    console.log('[loading-gif] JS injected successfully (fallback)');
  } catch (error) {
    console.warn('[loading-gif] Could not load JS from', jsPath, '- continuing without it');
  }

  // Inject VS Code theme CSS variables
  await page.addStyleTag({
    content: `
      :root {
        --vscode-foreground: ${VSCODE_THEME.foreground};
        --vscode-editor-foreground: ${VSCODE_THEME.foreground};
        --vscode-editor-background: ${VSCODE_THEME.background};
        --vscode-editorWidget-background: ${VSCODE_THEME.editorWidgetBackground};
        --vscode-editorWidget-border: ${VSCODE_THEME.widgetBorderStrong};
        --vscode-input-background: ${VSCODE_THEME.inputBackground};
        --vscode-input-foreground: ${VSCODE_THEME.foreground};
        --vscode-input-border: #3e3e42;
        --vscode-button-background: ${VSCODE_THEME.buttonBackground};
        --vscode-button-foreground: #ffffff;
        --vscode-button-hoverBackground: #1177bb;
        --vscode-list-activeSelectionBackground: ${VSCODE_THEME.listActiveBackground};
        --vscode-list-hoverBackground: #2a2d2e;
        --vscode-list-hoverForeground: ${VSCODE_THEME.foreground};
        --vscode-focusBorder: ${VSCODE_THEME.focusBorder};
        --vscode-descriptionForeground: #9d9d9d;
        --vscode-panel-border: #3e3e42;
        --vscode-textLink-foreground: #3794ff;
        --vscode-dropdown-background: var(--vscode-input-background);
        --vscode-dropdown-foreground: var(--vscode-input-foreground);
        --vscode-dropdown-border: var(--vscode-input-border);
        --vscode-inputOption-hoverBorder: var(--vscode-focusBorder);
        --ado-blue: #0078d4;
        --ado-green: #107c10;
        --ado-orange: #ff8c00;
        --ado-red: #d13438;
      }
      body, html {
        background: #0d1117 !important;
        color: var(--vscode-foreground) !important;
        margin: 0;
        padding: ${CAPTURE_PADDING}px;
      }
      main {
        width: ${CAPTURE_WIDTH}px !important;
        max-width: ${CAPTURE_WIDTH}px !important;
        margin: 0 auto;
      }
    `,
  });

  // Helper: dispatch a syncState snapshot the webview expects (reactive architecture)
  async function dispatchSyncState(view, items, matches = {}, connectionId = 'demo-conn') {
    const snapshot = {
      fsmState: 'active.ready.idle',
      context: {
        isActivated: true,
        connections: [
          {
            id: connectionId,
            organization: 'DemoOrg',
            project: 'Demo Project',
            label: 'Demo Project',
          },
        ],
        activeConnectionId: connectionId,
        pendingWorkItems: items && items.length > 0 ? {
          workItems: items,
          connectionId,
          query: 'Demo',
        } : undefined,
        viewMode: view === 'kanban' ? 'kanban' : 'list',
      },
      matches: {
        'active.ready': true,
        'active.ready.idle': true,
        ...matches,
      },
    };

    await page.evaluate((snap) => {
      window.postMessage({ type: 'syncState', payload: snap }, '*');
    }, snapshot);
  }

  // Wait for Svelte root
  try {
    await page.waitForSelector('#svelte-root', { timeout: 10000 });
    await page.waitForTimeout(500);
  } catch (error) {
    console.warn('[loading-gif] svelte-root not found, continuing anyway');
  }

  const framesDir = join(PROJECT_ROOT, 'images', 'loading-frames');
  const fs = await import('node:fs/promises');
  // Clean old frames to avoid any stale artifacts
  try {
    await fs.rm(framesDir, { recursive: true, force: true });
  } catch {}
  await fs.mkdir(framesDir, { recursive: true });

  let frameCount = 0;
  let kanbanView = false;

  // Helper: capture the primary content to avoid large borders
  async function captureTo(path) {
    // Capture the full viewport to ensure consistent frame dimensions.
    await page.screenshot({ path, omitBackground: true });
  }

  // Frame sequence: 90 frames total
  // Initializing: 10 frames
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(FRAME_DELAY);
    const framePath = join(framesDir, `frame-${String(frameCount + 1).padStart(4, '0')}.png`);
    await captureTo(framePath);
    frameCount++;
  }

  // Loading: 10 frames (no items yet, list view) using syncState
  await dispatchSyncState('list', [], { 'active.ready.loadingData': true });
  await page.waitForTimeout(500);

  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(FRAME_DELAY);
    const framePath = join(framesDir, `frame-${String(frameCount + 1).padStart(4, '0')}.png`);
    await captureTo(framePath);
    frameCount++;
  }

  // List view: 30 frames (with work items) - reuse generated PNG for visual parity
  await dispatchSyncState('list', makeSampleWorkItems());
  const listPng = join(PROJECT_ROOT, 'images', 'work-items-list.png');
  await page.waitForTimeout(300);
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(FRAME_DELAY);
    const framePath = join(framesDir, `frame-${String(frameCount + 1).padStart(4, '0')}.png`);
    await fs.copyFile(listPng, framePath);
    frameCount++;
  }

  // Transition to Kanban: 6 frames via syncState
  await dispatchSyncState('kanban', makeSampleWorkItems(), makeSampleKanbanColumns(makeSampleWorkItems()));
  await page.waitForTimeout(300);

  const kanbanPng = join(PROJECT_ROOT, 'images', 'work-items-kanban.png');
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(FRAME_DELAY);
    const framePath = join(framesDir, `frame-${String(frameCount + 1).padStart(4, '0')}.png`);
    const src = i < 3 ? listPng : kanbanPng;
    await fs.copyFile(src, framePath);
    frameCount++;
  }

  // Kanban view: 34 frames
  // Ensure kanban DOM or fallback
  try {
    await page.waitForSelector('.kanban-board, .kanban-column', { timeout: 8000 });
    // Ensure there are visible cards; otherwise fallback to static template
    const hasCards = await page.$('.kanban-card, .kanban-item, .work-item-card');
    if (!hasCards) {
      throw new Error('No kanban cards detected');
    }
  } catch {
    try {
      const kanbanHtml = await readFile(join(PROJECT_ROOT, 'images', 'work-items-kanban.html'), 'utf8');
      const sanitizedK = kanbanHtml
        .replace(/<link[^>]+svelte-main\.css[^>]*>/gi, '')
        .replace(/<script[^>]+svelte-main\.js[^>]*><\/script>/gi, '');
      await page.evaluate((markup) => {
        const root = document.getElementById('svelte-root') || document.body;
        root.innerHTML = markup;
      }, sanitizedK);
      await page.waitForTimeout(200);
    } catch {}
  }
  for (let i = 0; i < 34; i++) {
    await page.waitForTimeout(FRAME_DELAY);
    const framePath = join(framesDir, `frame-${String(frameCount + 1).padStart(4, '0')}.png`);
    await fs.copyFile(kanbanPng, framePath);
    frameCount++;
  }

  await browser.close();
  await new Promise((r) => server.close(() => r()));

  console.log(`[loading-gif] Captured ${frameCount} frames`);

  // Create GIF from frames
  console.log('[loading-gif] Creating GIF...');
  const gifPath = join(PROJECT_ROOT, 'images', 'loading-sequence.gif');
  await createGifFromFrames(framesDir, gifPath, frameCount);

  console.log(`[loading-gif] ✓ GIF created: ${gifPath}`);
}

async function createGifFromFrames(framesDir, outputPath, frameCount) {
  // Determine target canvas size from the first frame
  const firstPath = join(framesDir, `frame-${String(1).padStart(4, '0')}.png`);
  const firstPng = PNG.sync.read(await readFile(firstPath));
  const targetWidth = firstPng.width;
  const targetHeight = firstPng.height;

  const encoder = GIFEncoder();

  for (let i = 1; i <= frameCount; i++) {
    const framePath = join(framesDir, `frame-${String(i).padStart(4, '0')}.png`);
    const srcPng = PNG.sync.read(await readFile(framePath));

    // Normalize each frame to target size by centering on a transparent canvas
    const canvas = new Uint8Array(targetWidth * targetHeight * 4);
    const offsetX = Math.max(0, Math.floor((targetWidth - srcPng.width) / 2));
    const offsetY = Math.max(0, Math.floor((targetHeight - srcPng.height) / 2));

    for (let y = 0; y < srcPng.height; y++) {
      const destY = y + offsetY;
      if (destY < 0 || destY >= targetHeight) continue;
      for (let x = 0; x < srcPng.width; x++) {
        const destX = x + offsetX;
        if (destX < 0 || destX >= targetWidth) continue;
        const srcIdx = (y * srcPng.width + x) * 4;
        const dstIdx = (destY * targetWidth + destX) * 4;
        canvas[dstIdx] = srcPng.data[srcIdx];       // R
        canvas[dstIdx + 1] = srcPng.data[srcIdx+1]; // G
        canvas[dstIdx + 2] = srcPng.data[srcIdx+2]; // B
        canvas[dstIdx + 3] = srcPng.data[srcIdx+3]; // A
      }
    }

    const palette = quantize(canvas, 256);
    const indexed = applyPalette(canvas, palette);

    encoder.writeFrame(indexed, targetWidth, targetHeight, {
      palette,
      delay: FRAME_DELAY,
    });
  }

  encoder.finish();
  const gif = encoder.bytes();
  await writeFile(outputPath, Buffer.from(gif));
}

main().catch((error) => {
  console.error('[loading-gif] Error:', error);
  process.exit(1);
});

