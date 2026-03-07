#!/usr/bin/env tsx
/* eslint-disable max-lines, max-lines-per-function */
/**
 * Praxis Derivation Generator
 *
 * Single Source of Truth pipeline: reads the machine-readable Praxis schema
 * and writes derived artifacts to `generated/`.
 *
 * Usage:
 *   npm run derive          – regenerate all artifacts
 *   npm run derive:check    – regenerate and fail (exit 1) if any file changed
 *
 * Derived artifacts (never edit by hand):
 *   generated/contracts/ui-state-contracts.ts    – UI state type contracts
 *   generated/contracts/api-behavior-contracts.ts – event/fact interfaces
 *   generated/docs/runbook.md                    – auto-generated runbook
 *   generated/tests/scaffold.test.ts             – per-rule test scaffolds
 *   generated/manifest.json                      – content hashes (drift gate)
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Use the zero-dependency descriptor so that the CLI does not pull in
// @plures/praxis → svelte/internal/client at derivation time.
import { schemaDescriptor } from '../src/praxis/application/schema/descriptor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const GENERATED = path.join(ROOT, 'generated');

// ─── Utilities ────────────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

interface WriteResult {
  path: string;
  hash: string;
  changed: boolean;
}

function writeIfChanged(filePath: string, content: string): WriteResult {
  const previous = existsSync(filePath) ? readFileSync(filePath, 'utf8') : null;
  const hash = sha256(content);
  const changed = previous !== content;
  if (changed) {
    writeFileSync(filePath, content, 'utf8');
  }
  return { path: filePath, hash, changed };
}

function generatedHeader(description: string): string {
  return [
    `// ⚠️  GENERATED FILE – do not edit manually.`,
    `// Source of truth: src/praxis/application/schema/index.ts`,
    `// Regenerate:      npm run derive`,
    `// Description:     ${description}`,
    ``,
  ].join('\n');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findEventGroup(tag: string): string {
  const match = schemaDescriptor.events.find((e) => e.tag === tag);
  return match ? match.group : 'unclassified';
}

// ─── Generator: UI state contracts ────────────────────────────────────────────

/**
 * Generates TypeScript type contracts for UI state derived from the fact
 * registry.  Produces `ApplicationState`, `ApplicationFactTag`,
 * `FactChangeEvent`, and `UiStateContract` type definitions.
 */
function generateUiStateContracts(): string {
  const states = [
    'inactive',
    'activating',
    'active',
    'activation_error',
    'deactivating',
    'error_recovery',
  ];
  const factEntries = schemaDescriptor.facts.map((f) => `  | { fact: '${f.tag}' }`).join('\n');

  return [
    generatedHeader('UI state type contracts derived from the Praxis fact registry'),
    `/**`,
    ` * All valid application states, derived from Praxis lifecycle rules.`,
    ` */`,
    `export type ApplicationState =`,
    states.map((s) => `  | '${s}'`).join('\n') + ';',
    ``,
    `/**`,
    ` * Union of all application fact tags.`,
    ` * Each entry corresponds to a \`defineFact\` call in facts.ts.`,
    ` */`,
    `export type ApplicationFactTag =`,
    schemaDescriptor.facts.map((f) => `  | '${f.tag}'`).join('\n') + ';',
    ``,
    `/**`,
    ` * Typed fact change notification consumed by the Svelte stores layer.`,
    ` */`,
    `export type FactChangeEvent =`,
    factEntries + ';',
    ``,
    `/**`,
    ` * All UI-relevant application state grouped by concern.`,
    ` */`,
    `export interface UiStateContract {`,
    `  applicationState: ApplicationState;`,
    `  isActivated: boolean;`,
    `  activeConnectionId: string | undefined;`,
    `  activeQuery: string | undefined;`,
    `  viewMode: 'list' | 'kanban' | 'board';`,
    `  debugViewVisible: boolean;`,
    `  lastError: { message: string; stack?: string; connectionId?: string } | undefined;`,
    `}`,
    ``,
  ].join('\n');
}

// ─── Generator: API behavior contracts ────────────────────────────────────────

/**
 * Generates TypeScript interfaces for event payloads (`ApplicationEventPayloads`)
 * and the rule registry metadata (`ApplicationRuleRegistry`), derived from the
 * event and rule descriptors.  Also exports `ApplicationEventTag` and
 * `ApplicationRuleId` union types.
 */
function generateApiBehaviorContracts(): string {
  const eventLines = schemaDescriptor.events.map((e) => {
    const group = findEventGroup(e.tag);
    return `  /** Group: ${group} */\n  '${e.tag}': unknown;`;
  });

  const ruleLines = schemaDescriptor.rules.map((r) => {
    const triggers = r.triggers.length > 0 ? r.triggers.join(', ') : '—';
    return `  /** Triggers: ${triggers} */\n  '${r.id}': { description: '${r.description}' };`;
  });

  return [
    generatedHeader('API/event behavior contracts derived from the Praxis event and rule registry'),
    `/**`,
    ` * Map of every event tag to its (opaque) payload type.`,
    ` * Import and use as a discriminated union in adapters/providers.`,
    ` */`,
    `export interface ApplicationEventPayloads {`,
    eventLines.join('\n'),
    `}`,
    ``,
    `/** Union of all event tags. */`,
    `export type ApplicationEventTag = keyof ApplicationEventPayloads;`,
    ``,
    `/**`,
    ` * Rule registry type — one entry per Praxis rule.`,
    ` * Useful for documentation tooling and runtime introspection.`,
    ` */`,
    `export interface ApplicationRuleRegistry {`,
    ruleLines.join('\n'),
    `}`,
    ``,
    `/** Union of all rule IDs. */`,
    `export type ApplicationRuleId = keyof ApplicationRuleRegistry;`,
    ``,
  ].join('\n');
}

// ─── Generator: runbook ───────────────────────────────────────────────────────

/**
 * Generates a Markdown runbook listing all facts, events (with their group),
 * and rules (with their triggers).  The output is placed in
 * `generated/docs/runbook.md` and serves as living documentation.
 */
function generateRunbook(): string {
  const eventRows = schemaDescriptor.events
    .map((e) => {
      const group = findEventGroup(e.tag);
      return `| \`${e.tag}\` | ${group} |`;
    })
    .join('\n');

  const factRows = schemaDescriptor.facts.map((f) => `| \`${f.tag}\` |`).join('\n');

  const ruleRows = schemaDescriptor.rules
    .map((r) => {
      const triggers = r.triggers.length > 0 ? r.triggers.map((t) => `\`${t}\``).join(', ') : '—';
      return `| \`${r.id}\` | ${r.description} | ${triggers} |`;
    })
    .join('\n');

  return [
    `<!-- ⚠️  GENERATED FILE – do not edit manually. -->`,
    `<!-- Source of truth: src/praxis/application/schema/index.ts -->`,
    `<!-- Regenerate:      npm run derive -->`,
    ``,
    `# Praxis Application Runbook`,
    ``,
    `_Auto-generated from the Praxis rule registry. Do not edit manually._`,
    ``,
    `## Overview`,
    ``,
    `This runbook is derived directly from the Praxis schema.  `,
    `Any behaviour change **must** start with a change to the Praxis logic; this`,
    `document will then be regenerated automatically.`,
    ``,
    `## Facts (${schemaDescriptor.facts.length})`,
    ``,
    `Facts represent reactive application state.`,
    ``,
    `| Tag |`,
    `|-----|`,
    factRows,
    ``,
    `## Events (${schemaDescriptor.events.length})`,
    ``,
    `Events are immutable triggers that cause rules to execute.`,
    ``,
    `| Tag | Group |`,
    `|-----|-------|`,
    eventRows,
    ``,
    `## Rules (${schemaDescriptor.rules.length})`,
    ``,
    `Rules are pure functions that react to events and update facts.`,
    ``,
    `| Rule ID | Description | Triggers |`,
    `|---------|-------------|----------|`,
    ruleRows,
    ``,
  ].join('\n');
}

// ─── Generator: test scaffold ─────────────────────────────────────────────────

/**
 * Generates a Vitest test scaffold with one coverage probe per Praxis rule.
 * Each probe asserts that the rule is present in the schema descriptor with a
 * non-empty `id` and `description`.  This is the minimum regression guard;
 * richer behavioural tests should live next to the rule implementations.
 */
function generateTestScaffold(): string {
  const imports = [
    `import { describe, it, expect } from 'vitest';`,
    `import { schemaDescriptor } from '../../src/praxis/application/schema/descriptor.js';`,
  ].join('\n');

  const ruleTests = schemaDescriptor.rules
    .map((r) => {
      const triggerComment =
        r.triggers.length > 0
          ? `// Triggers on: ${r.triggers.join(', ')}`
          : '// No declared triggers';
      return [
        `  it('rule "${r.id}" is registered in the schema', () => {`,
        `    ${triggerComment}`,
        `    const found = schemaDescriptor.rules.find((rule) => rule.id === '${r.id}');`,
        `    expect(found).toBeDefined();`,
        `    expect(found?.description).toBeTruthy();`,
        `  });`,
      ].join('\n');
    })
    .join('\n\n');

  return [
    generatedHeader('Test scaffold — one coverage probe per Praxis rule'),
    `/* eslint-disable max-lines, max-lines-per-function */`,
    imports,
    ``,
    `/**`,
    ` * Schema completeness tests.`,
    ` *`,
    ` * These tests verify that every rule declared in the Praxis schema is`,
    ` * well-formed (has an id + description).  They serve as the minimum`,
    ` * regression guard: add richer behavioural tests alongside the rule`,
    ` * definitions themselves.`,
    ` */`,
    `describe('Praxis schema – rule registry completeness', () => {`,
    `  it('schema descriptor has facts, events and rules', () => {`,
    `    expect(schemaDescriptor.facts.length).toBeGreaterThan(0);`,
    `    expect(schemaDescriptor.events.length).toBeGreaterThan(0);`,
    `    expect(schemaDescriptor.rules.length).toBeGreaterThan(0);`,
    `  });`,
    ``,
    ruleTests,
    `});`,
    ``,
  ].join('\n');
}

// ─── Manifest ─────────────────────────────────────────────────────────────────

interface Manifest {
  schemaVersion: string;
  artifacts: Record<string, string>;
}

function buildManifest(results: WriteResult[]): string {
  const artifacts: Record<string, string> = {};
  for (const r of results) {
    const rel = path.relative(ROOT, r.path).replace(/\\/g, '/');
    artifacts[rel] = r.hash;
  }
  const manifest: Manifest = {
    schemaVersion: `facts:${schemaDescriptor.facts.length},events:${schemaDescriptor.events.length},rules:${schemaDescriptor.rules.length}`,
    artifacts,
  };
  return JSON.stringify(manifest, null, 2) + '\n';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main(): void {
  const checkMode = process.argv.includes('--check');

  ensureDir(path.join(GENERATED, 'contracts'));
  ensureDir(path.join(GENERATED, 'docs'));
  ensureDir(path.join(GENERATED, 'tests'));

  const results: WriteResult[] = [
    writeIfChanged(
      path.join(GENERATED, 'contracts', 'ui-state-contracts.ts'),
      generateUiStateContracts()
    ),
    writeIfChanged(
      path.join(GENERATED, 'contracts', 'api-behavior-contracts.ts'),
      generateApiBehaviorContracts()
    ),
    writeIfChanged(path.join(GENERATED, 'docs', 'runbook.md'), generateRunbook()),
    writeIfChanged(path.join(GENERATED, 'tests', 'scaffold.test.ts'), generateTestScaffold()),
  ];

  // Write manifest last (after all artifact hashes are known)
  const manifestPath = path.join(GENERATED, 'manifest.json');
  const manifestContent = buildManifest(results);
  const manifestResult = writeIfChanged(manifestPath, manifestContent);
  results.push(manifestResult);

  // Report
  for (const r of results) {
    const rel = path.relative(ROOT, r.path).replace(/\\/g, '/');
    const status = r.changed ? '✏️  updated' : '✅ unchanged';
    console.log(`  ${status}  ${rel}`);
  }

  const changed = results.filter((r) => r.changed);
  if (changed.length > 0) {
    console.log(`\n${changed.length} artifact(s) regenerated.`);
  } else {
    console.log('\nAll artifacts are up-to-date.');
  }

  if (checkMode && changed.length > 0) {
    console.error(
      '\n❌ Drift detected: derived artifacts are stale.\n' +
        '   Run `npm run derive` locally and commit the updated files.\n' +
        '   Changed files:\n' +
        changed.map((r) => `     - ${path.relative(ROOT, r.path).replace(/\\/g, '/')}`).join('\n')
    );
    process.exit(1);
  }
}

main();
