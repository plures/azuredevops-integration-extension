#!/usr/bin/env node
/* eslint-disable no-undef */
// Deterministically generate sample work item data for screenshots
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function makeItem(id, title, state, type, assignedTo, priority, tags, iterationPath, description) {
  return { id, title, state, type, assignedTo, priority, tags, iterationPath, description };
}

async function main() {
  const outPath = path.resolve(__dirname, 'sample-data.json');
  const items = [
    makeItem(
      101,
      'Implement login flow',
      'Active',
      'Task',
      'Alex Johnson',
      2,
      ['auth', 'frontend'],
      'Project\\Sprint 42',
      'Build the login form, validation, and API wiring.'
    ),
    makeItem(
      102,
      'Fix crash on settings page',
      'To Do',
      'Bug',
      'Unassigned',
      1,
      ['bug', 'settings'],
      'Project\\Sprint 42',
      'Null pointer when opening advanced settings without profile.'
    ),
    makeItem(
      103,
      'Add team filters to work items',
      'In Progress',
      'Feature',
      'Sam Patel',
      3,
      ['filters', 'webview'],
      'Project\\Sprint 42',
      'Extend UI to include team and iteration filters.'
    ),
    makeItem(
      104,
      'Write integration tests for timer',
      'Code Review',
      'Task',
      'Chris Lee',
      2,
      ['tests', 'timer'],
      'Project\\Sprint 42',
      'Cover stop flow, inactivity, and cap behavior.'
    ),
    makeItem(
      105,
      'Polish Kanban card layout',
      'Done',
      'Task',
      'Taylor Kim',
      2,
      ['ui', 'kanban'],
      'Project\\Sprint 41',
      'Improve spacing and tag overflow.'
    ),
  ];
  const data = { workItems: items };
  await fs.writeFile(outPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('[sample-data] Wrote', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
