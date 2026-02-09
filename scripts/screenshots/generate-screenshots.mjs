#!/usr/bin/env node
/**
 * Generate Static Screenshots
 *
 * Creates static PNG screenshots of the webview in different states:
 * - List view with work items
 * - Kanban board view
 */

import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'url';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { ensurePrerequisites } from './check-prerequisites.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');

// Constants
const CAPTURE_WIDTH = 1600;
const CAPTURE_PADDING = 64;
const CAPTURE_MAX_HEIGHT = 716;

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
  const byId = new Map(items.map((w) => [w.id, w]));
  const pick = (predicate) =>
    items
      .filter((w) => predicate(String(w.fields?.['System.State'] || '').toLowerCase()))
      .map((w) => w.id);
  const todo = pick(
    (s) => s.includes('new') || s.includes('to do') || s.includes('todo') || s.includes('proposed')
  );
  const inprog = pick(
    (s) =>
      s.includes('in progress') ||
      s.includes('inprogress') ||
      s.includes('doing') ||
      s.includes('active')
  );
  const review = pick((s) => s.includes('review') || s.includes('testing'));
  const done = pick(
    (s) =>
      s.includes('done') ||
      s.includes('resolved') ||
      s.includes('closed') ||
      s.includes('completed')
  );
  // Ensure each item is placed at least once
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

const fixtures = [
  {
    name: 'work-items-list',
    view: 'list',
    workItems: makeSampleWorkItems(),
  },
  {
    name: 'work-items-kanban',
    view: 'kanban',
    workItems: makeSampleWorkItems(),
  },
];

async function main() {
  console.log('[screenshots] Checking prerequisites...');
  const prerequisitesOk = await ensurePrerequisites();
  if (!prerequisitesOk) {
    console.error('[screenshots] Prerequisites check failed');
    process.exit(1);
  }

  console.log('[screenshots] Starting screenshot generation...');

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
  console.log('[screenshots] Serving webview from', baseHttpUrl);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: {
      width: CAPTURE_WIDTH + CAPTURE_PADDING * 2,
      height: CAPTURE_MAX_HEIGHT,
    },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Load the webview HTML
  await page.goto(baseHttpUrl);

  // Load CSS - use absolute file path
  const cssPath = join(PROJECT_ROOT, 'media', 'webview', 'main.css');
  try {
    // Prefer loading by filesystem path to avoid file:// URL quirks on Windows
    await page.addStyleTag({ path: cssPath });
    console.log('[screenshots] CSS loaded successfully');
  } catch (error) {
    console.warn('[screenshots] Could not load CSS from', cssPath, '- continuing without it');
  }

  // Load the built webview bundle so Svelte renders components
  const jsPath = join(PROJECT_ROOT, 'media', 'webview', 'main.js');
  try {
    // When served over http, the script tag in svelte.html should load automatically.
    // As a fallback, inject inline.
    const jsCode = await readFile(jsPath, 'utf8');
    await page.addScriptTag({ content: jsCode });
    console.log('[screenshots] JS injected successfully (fallback)');
  } catch (error) {
    console.warn('[screenshots] Could not load JS from', jsPath, '- continuing without it');
  }

  // Inject VS Code theme CSS variables (solid dark background to match marketplace/README)
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
        --vscode-list-inactiveSelectionBackground: #2a2d2e;
        --vscode-list-hoverBackground: #2a2d2e;
        --vscode-list-hoverForeground: ${VSCODE_THEME.foreground};
        --vscode-focusBorder: ${VSCODE_THEME.focusBorder};
        --vscode-sideBar-background: #252526;
        --vscode-badge-background: #4d4d4d;
        --vscode-badge-foreground: #ffffff;
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
      #svelte-root, main {
        width: ${CAPTURE_WIDTH}px !important;
        max-width: ${CAPTURE_WIDTH}px !important;
        height: ${CAPTURE_MAX_HEIGHT}px !important;
        max-height: ${CAPTURE_MAX_HEIGHT}px !important;
        overflow: hidden !important;
        margin: 0 auto;
      }
    `,
  });

  // Wait for Svelte root
  try {
    await page.waitForSelector('#svelte-root', { timeout: 10000 });
    await page.waitForTimeout(500);
  } catch (error) {
    console.warn('[screenshots] svelte-root not found, continuing anyway');
  }

  // Helper: dispatch a syncState snapshot that the current webview understands
  async function dispatchSyncState(view, items, columns, connectionId = 'demo-conn') {
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
        pendingWorkItems:
          items && items.length > 0
            ? {
                workItems: items,
                connectionId,
                query: 'Demo',
              }
            : undefined,
        viewMode: view === 'kanban' ? 'kanban' : 'list',
        ...(view === 'kanban' && Array.isArray(columns) ? { kanbanColumns: columns } : {}),
      },
      matches: {
        'active.ready': true,
        'active.ready.idle': true,
      },
    };

    await page.evaluate((snap) => {
      window.postMessage({ type: 'syncState', payload: snap }, '*');
    }, snapshot);
  }

  const outDir = join(PROJECT_ROOT, 'images');
  const fs = await import('node:fs/promises');
  await fs.mkdir(outDir, { recursive: true });

  // Generate screenshots for each fixture
  for (const fixture of fixtures) {
    console.log(`[screenshots] Generating ${fixture.name}...`);

    // Send a syncState snapshot so the Svelte app renders the requested view + items
    const columns =
      fixture.view === 'kanban' ? makeSampleKanbanColumns(fixture.workItems) : undefined;
    await dispatchSyncState(fixture.view, fixture.workItems, columns);
    await page.waitForTimeout(700);

    // Wait for content to render (with fallback to static HTML template if needed)
    let rendered = false;
    try {
      if (fixture.view === 'kanban') {
        await page.waitForSelector('.kanban-board, .kanban-column', { timeout: 8000 });
        const hasCards = await page.$('.kanban-card, .kanban-item, .work-item-card');
        if (!hasCards) {
          throw new Error('No kanban cards detected');
        }
      } else {
        await page.waitForSelector('.work-item-card, .work-item-list, .work-item-list-item', {
          timeout: 8000,
        });
      }
      await page.waitForTimeout(500);
      rendered = true;
    } catch (error) {
      // Fallback: inject static HTML template
      try {
        const templatePath = join(PROJECT_ROOT, 'images', `${fixture.name}.html`);
        let html = await readFile(templatePath, 'utf8');
        // Sanitize stale asset links from previous release exports
        html = html
          .replace(/<link[^>]+svelte-main\.css[^>]*>/gi, '')
          .replace(/<script[^>]+svelte-main\.js[^>]*><\/script>/gi, '');
        await page.evaluate((markup) => {
          const root = document.getElementById('svelte-root') || document.body;
          root.innerHTML = markup;
        }, html);
        await page.waitForTimeout(200);
        rendered = true;
      } catch {
        console.warn(`[screenshots] Content not found for ${fixture.name}, continuing anyway`);
      }
    }

    // Capture screenshot
    const target =
      (await page.$('#svelte-root')) || (await page.$('main')) || (await page.$('body'));

    if (target) {
      const screenshotPath = join(outDir, `${fixture.name}.png`);
      await target.screenshot({
        path: screenshotPath,
        omitBackground: true,
      });
      console.log(`[screenshots] ✓ ${fixture.name} saved: ${screenshotPath}`);
    } else {
      console.warn(`[screenshots] No target element found for ${fixture.name}`);
    }
  }

  await browser.close();
  await new Promise((r) => server.close(() => r()));
  console.log('[screenshots] ✓ All screenshots generated');
}

main().catch((error) => {
  console.error('[screenshots] Error:', error);
  process.exit(1);
});
