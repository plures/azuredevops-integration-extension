#!/usr/bin/env node
/* eslint-disable no-undef */
// Generate webview screenshots using Playwright (Chromium)
// - Loads built webview HTML from media/webview/index.html
// - Injects fixture via window.__AZDO_FIXTURE__ to bypass VS Code messaging
// - Captures list, kanban, and timer variants to images

import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readJson(p) {
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const builtIndex = path.resolve(repoRoot, 'media', 'webview', 'index.html');
  const outDir = path.resolve(repoRoot, 'images');
  const samplePath = path.resolve(__dirname, 'sample-data.json');
  const staticRoot = path.resolve(repoRoot, 'media', 'webview');

  // Ensure static webview assets exist
  try {
    await fs.access(builtIndex);
  } catch {
    console.error('[screenshots] Webview HTML not found at', builtIndex);
    console.error('Ensure images/ are present (they are committed to the repo).');
    console.error(
      'If missing in your checkout, re-install or rebuild the extension: npm run build'
    );
    process.exit(1);
  }

  const sample = await readJson(samplePath);
  await ensureDir(outDir);

  // Start a tiny static server to avoid file:// CORS issues with module scripts
  const server = await startStaticServer(staticRoot);
  const baseUrl = `http://127.0.0.1:${server.port}/index.html`;

  const browser = await chromium.launch({ headless: true });
  // Use a viewport that yields images that render nicely in VS Code's Markdown preview
  const context = await browser.newContext({
    viewport: { width: 1200, height: 720 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Pipe webview console logs and errors to our stdout for debugging
  page.on('console', (msg) => {
    try {
      console.log(`[webview:${msg.type()}]`, msg.text());
    } catch {
      // ignore logging errors
    }
  });
  page.on('pageerror', (err) => {
    console.error('[webview:error]', err);
  });

  // Intercept file:// CSS/JS loading by serving with a local file server built into Playwright
  // Easiest approach: use file URL directly; Chromium supports file URLs for static assets
  const fileUrl = baseUrl; // now served over http to satisfy module CORS

  // Helper to capture a screenshot with a given fixture
  async function capture(name, fixture, dumpHtml = false, options = {}) {
    const { widthPx } = options; // optional target width for the captured element
    // Ensure init script is in place before navigation so fixture is applied before any scripts run
    await page.addInitScript((f) => {
      // Provide fixture data for the webview bootstrap to pick up
      window.__AZDO_FIXTURE__ = f;
      // Stub VS Code webview API to avoid runtime errors during static rendering
      if (typeof window.acquireVsCodeApi !== 'function') {
        window.acquireVsCodeApi = () => {
          return {
            postMessage: () => {},
            setState: () => {},
            getState: () => null,
          };
        };
      }
      if (!window.vscode) {
        window.vscode = { postMessage: () => {} };
      }
    }, fixture);
    await page.goto(fileUrl);
    // Wait until bootstrap has fed data and content renders
    const wantKanban = fixture.view === 'kanban';
    // First, container present
    await page.waitForSelector('#workItemsContainer');
    // Then, wait for a concrete UI signal of rendering
    if (wantKanban) {
      await page.waitForSelector('.kanban-board .kanban-column', { timeout: 30000 });
    } else {
      await page.waitForSelector('.work-item-card', { timeout: 30000 });
    }
    // If timer is part of the fixture, ensure timer sidebar is visible before capture
    if (fixture.timer) {
      try {
        await page.waitForSelector('#timerContainer:not([hidden])', { timeout: 10000 });
        await page.waitForFunction(
          () => {
            const col = document.getElementById('timerColumn');
            if (!col) return false;
            const style = getComputedStyle(col);
            return style.display !== 'none';
          },
          null,
          { timeout: 10000 }
        );
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        // ignore timer wait errors; proceed with capture
      }
    }
    // Allow layout to settle a bit
    await page.waitForTimeout(150);
    // Minimize whitespace: relax fixed heights so the element shrinks to content
    if (wantKanban) {
      await page.addStyleTag({ content: `.kanban-board{min-height:auto !important;}` });
    } else {
      await page.addStyleTag({ content: `#workItemsContainer{max-height:none !important;}` });
    }
    if (dumpHtml) {
      const html = await page.content();
      await fs.writeFile(path.join(outDir, `${name}.html`), html, 'utf8');
    }
    // Prefer an element-level screenshot to keep dimensions friendly for previews
    const selector = wantKanban ? '.kanban-board' : '#workItemsContainer';
    // If a target width is requested, apply it before selecting/screenshotting
    if (typeof widthPx === 'number' && widthPx > 0) {
      const css = `${selector}{width:${widthPx}px !important; max-width:${widthPx}px !important;}`;
      await page.addStyleTag({ content: css });
    }
    const target = await page.$(selector);
    if (target) {
      await target.screenshot({ path: path.join(outDir, `${name}.png`) });
    } else {
      // Fallback to viewport screenshot
      await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    }
    console.log('[screenshots] Wrote', path.join(outDir, `${name}.png`));
  }

  const baseItems = sample.workItems || [];

  await capture(
    'work-items-list',
    {
      workItems: baseItems,
      view: 'list',
      selectWorkItemId: 101,
    },
    true,
    { widthPx: 300 }
  );

  await capture(
    'work-items-kanban',
    {
      workItems: baseItems,
      view: 'kanban',
    },
    true,
    { widthPx: 600 }
  );

  // Timer-specific screenshot removed; timer visibility is demonstrated inline when active.

  await browser.close();
  await server.stop();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// --- helpers ---
function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const contentTypes = new Map([
      ['.html', 'text/html; charset=utf-8'],
      ['.js', 'application/javascript; charset=utf-8'],
      ['.mjs', 'application/javascript; charset=utf-8'],
      ['.css', 'text/css; charset=utf-8'],
      ['.svg', 'image/svg+xml'],
      ['.png', 'image/png'],
      ['.jpg', 'image/jpeg'],
      ['.jpeg', 'image/jpeg'],
      ['.json', 'application/json; charset=utf-8'],
      ['.map', 'application/json; charset=utf-8'],
    ]);

    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURI((req.url || '/').split('?')[0]);
        let relPath = urlPath === '/' ? '/index.html' : urlPath;
        // prevent path traversal
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
