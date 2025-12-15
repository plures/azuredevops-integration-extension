#!/usr/bin/env node
import { applicationSchema } from '../src/praxis/application/schema/index.js';

type Section = 'all' | 'events' | 'facts' | 'rules';
type Format = 'table' | 'json';

interface TableSpec {
  headers: string[];
  rows: string[][];
}

const args = process.argv.slice(2);
const section = parseSection(args.find((arg) => SECTION_NAMES.has(arg?.toLowerCase() ?? '')));
const format: Format = args.includes('--json') ? 'json' : 'table';

if (format === 'json') {
  outputJson(section);
} else {
  outputTable(section);
}

function parseSection(value: string | undefined): Section {
  if (!value) return 'all';
  const normalized = value.toLowerCase();
  if (SECTION_NAMES.has(normalized)) return normalized as Section;
  return 'all';
}

const SECTION_NAMES = new Set<Section>(['all', 'events', 'facts', 'rules']);

function outputJson(section: Section): void {
  const payload: Record<string, unknown> = {};
  if (section === 'events' || section === 'all') {
    payload.events = applicationSchema.events.map((event) => ({
      tag: event.tag,
      group: findEventGroup(event.tag),
    }));
  }
  if (section === 'facts' || section === 'all') {
    payload.facts = applicationSchema.facts.map((fact) => ({ tag: fact.tag }));
  }
  if (section === 'rules' || section === 'all') {
    payload.rules = applicationSchema.rules.map((rule) => ({
      id: rule.id,
      description: rule.description,
      triggers: rule.meta && 'triggers' in rule.meta ? (rule.meta as any).triggers : undefined,
    }));
  }
  console.log(JSON.stringify(payload, null, 2));
}

function outputTable(section: Section): void {
  const tables: TableSpec[] = [];
  if (section === 'events' || section === 'all') {
    tables.push({
      headers: ['Event', 'Group'],
      rows: applicationSchema.events.map((event) => [event.tag, findEventGroup(event.tag)]),
    });
  }
  if (section === 'facts' || section === 'all') {
    tables.push({
      headers: ['Fact'],
      rows: applicationSchema.facts.map((fact) => [fact.tag]),
    });
  }
  if (section === 'rules' || section === 'all') {
    tables.push({
      headers: ['Rule', 'Description'],
      rows: applicationSchema.rules.map((rule) => [rule.id, rule.description ?? '']),
    });
  }

  const divider = '-'.repeat(60);
  for (const [index, table] of tables.entries()) {
    if (index > 0) {
      console.log(divider);
    }
    console.log(renderTable(table));
  }
}

function findEventGroup(tag: string): string {
  const entries = Object.entries(applicationSchema.eventGroups);
  const match = entries.find(([_, defs]) => defs.some((def) => def.tag === tag));
  return match ? match[0] : 'unclassified';
}

function renderTable(table: TableSpec): string {
  const widths: number[] = [];
  table.headers.forEach((header, idx) => {
    widths[idx] = Math.max(header.length, ...table.rows.map((row) => row[idx]?.length ?? 0));
  });

  const padRow = (row: string[]) => row.map((cell, idx) => cell.padEnd(widths[idx])).join('  ');

  const parts = [padRow(table.headers)];
  parts.push(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const row of table.rows) {
    parts.push(padRow(row));
  }
  return parts.join('\n');
}
