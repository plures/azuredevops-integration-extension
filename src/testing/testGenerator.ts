/**
 * Automated Test Generator
 *
 * Generates test code automatically from recorded history or exported scenarios.
 */

import type { TestScenario } from './historyTestRecorder.js';
import type { ExportedHistory } from '../debugging/historyExport.js';
import { historyToTestScenario } from '../debugging/historyExport.js';

/**
 * Test framework options
 */
export type TestFramework = 'vitest' | 'jest' | 'mocha';

/**
 * Test generation options
 */
export interface TestGenerationOptions {
  framework?: TestFramework;
  includeSnapshots?: boolean;
  includeComments?: boolean;
  indentSize?: number;
  testName?: string;
  describeName?: string;
}

/**
 * Default options
 */
const defaultOptions: Required<TestGenerationOptions> = {
  framework: 'vitest',
  includeSnapshots: true,
  includeComments: true,
  indentSize: 2,
  testName: 'generated-test',
  describeName: 'Generated Tests',
};

/**
 * Generate test code from a test scenario
 */
export function generateTestFromScenario(
  scenario: TestScenario,
  options: TestGenerationOptions = {}
): string {
  const opts = { ...defaultOptions, ...options };
  const indent = ' '.repeat(opts.indentSize);

  const lines: string[] = [];

  // Collect event imports
  const eventImports = new Set<string>();
  for (const eventData of scenario.events) {
    const eventTag = eventData.event.tag || 'UNKNOWN_EVENT';
    const eventName = convertEventTagToName(eventTag);
    eventImports.add(eventName);
  }

  // Add imports
  lines.push(generateImports(opts.framework, eventImports));
  lines.push('');

  // Add describe block
  if (opts.includeComments) {
    lines.push('/**');
    lines.push(` * Generated test from scenario: ${scenario.name}`);
    lines.push(` * Original ID: ${scenario.id}`);
    lines.push(` * Generated: ${new Date().toISOString()}`);
    lines.push(' */');
  }

  lines.push(`describe('${opts.describeName}', () => {`);

  // Add beforeEach if needed
  if (opts.framework === 'vitest') {
    lines.push(`${indent}beforeEach(() => {`);
    lines.push(`${indent}${indent}resetEngine();`);
    lines.push(`${indent}});`);
    lines.push('');
  }

  // Generate test
  const testName = opts.testName || scenario.name.toLowerCase().replace(/\s+/g, '-');
  lines.push(`${indent}it('${testName}', async () => {`);

  // Generate event dispatches
  for (let i = 0; i < scenario.events.length; i++) {
    const eventData = scenario.events[i];

    if (opts.includeComments && eventData.label) {
      lines.push(`${indent}${indent}// ${eventData.label}`);
    }

    const eventCode = generateEventCode(eventData.event, opts.indentSize * 2);
    lines.push(`${indent}${indent}dispatch([${eventCode}]);`);

    // Add wait for state if we have expected state
    if (eventData.expectedState && eventData.expectedState.applicationState) {
      const expectedState = eventData.expectedState.applicationState;
      lines.push(`${indent}${indent}await waitForStateValue('${expectedState}');`);
    } else if (eventData.stateAfter) {
      lines.push(`${indent}${indent}await waitForStateValue('${eventData.stateAfter}');`);
    }

    lines.push('');
  }

  // Add assertions
  lines.push(`${indent}${indent}// Verify final state`);
  lines.push(`${indent}${indent}const context = getContext();`);

  if (scenario.finalContext.applicationState) {
    lines.push(
      `${indent}${indent}expect(context.applicationState).toBe('${scenario.finalContext.applicationState}');`
    );
  }

  if (scenario.finalContext.connections) {
    lines.push(
      `${indent}${indent}expect(context.connections.length).toBe(${scenario.finalContext.connections.length});`
    );
  }

  if (scenario.finalContext.activeConnectionId) {
    lines.push(
      `${indent}${indent}expect(context.activeConnectionId).toBe('${scenario.finalContext.activeConnectionId}');`
    );
  }

  // Add snapshot if requested
  if (opts.includeSnapshots && opts.framework === 'vitest') {
    lines.push('');
    lines.push(`${indent}${indent}// Snapshot test`);
    lines.push(`${indent}${indent}expect(context).toMatchSnapshot();`);
  }

  lines.push(`${indent}});`);
  lines.push('});');

  return lines.join('\n');
}

/**
 * Generate test code from exported history
 */
export function generateTestFromHistory(
  exported: ExportedHistory,
  options: TestGenerationOptions = {}
): string {
  const scenario = historyToTestScenario(
    exported,
    options.testName || 'generated-from-history',
    options.testName || 'Generated from History'
  );

  return generateTestFromScenario(scenario, options);
}

/**
 * Generate imports for test framework
 */
function generateImports(framework: TestFramework, eventImports: Set<string> = new Set()): string {
  const imports: string[] = [];

  if (framework === 'vitest') {
    imports.push("import { describe, it, expect, beforeEach } from 'vitest';");
  } else if (framework === 'jest') {
    imports.push("import { describe, it, expect, beforeEach } from '@jest/globals';");
  } else {
    imports.push("import { describe, it } from 'mocha';");
    imports.push("import { expect } from 'chai';");
  }

  imports.push(
    "import { resetEngine, dispatch, waitForStateValue, getContext } from '../../../src/testing/helpers.js';"
  );

  // Add event imports if provided
  if (eventImports.size > 0) {
    const eventNames = Array.from(eventImports).sort();
    imports.push(
      `import { ${eventNames.join(', ')} } from '../../../src/praxis/application/facts.js';`
    );
  }

  return imports.join('\n');
}

/**
 * Convert event tag to event name
 */
function convertEventTagToName(eventTag: string): string {
  // Convert EVENT_TAG to EventTagEvent
  const parts = eventTag.split('_');
  const camelCase = parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
  return camelCase + 'Event';
}

/**
 * Generate event code from event object
 */
function generateEventCode(event: any, indent: number): string {
  const eventTag = event.tag || 'UNKNOWN_EVENT';
  const payload = event.payload || {};

  // Convert event tag to event name
  const eventName = convertEventTagToName(eventTag);

  // Generate payload code
  const payloadCode = generatePayloadCode(payload, indent + 2);

  return `${eventName}.create(${payloadCode})`;
}

/**
 * Generate payload code
 */
function generatePayloadCode(payload: any, indent: number): string {
  if (!payload || Object.keys(payload).length === 0) {
    return '{}';
  }

  const indentStr = ' '.repeat(indent);
  const lines: string[] = [];

  lines.push('{');

  for (const [key, value] of Object.entries(payload)) {
    const valueCode = generateValueCode(value, indent);
    lines.push(`${indentStr}${key}: ${valueCode},`);
  }

  lines.push(' '.repeat(indent - 2) + '}');

  return lines.join('\n');
}

/**
 * Generate code for a value
 */
function generateValueCode(value: any, indent: number): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "\\'")}'`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((v) => generateValueCode(v, indent)).join(', ');
    return `[${items}]`;
  }

  if (typeof value === 'object') {
    if (value instanceof Map) {
      const entries = Array.from(value.entries())
        .map(([k, v]) => `['${k}', ${generateValueCode(v, indent)}]`)
        .join(', ');
      return `new Map([${entries}])`;
    }

    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';

    const indentStr = ' '.repeat(indent);
    const lines: string[] = [];
    lines.push('{');

    for (const [key, val] of Object.entries(value)) {
      lines.push(`${indentStr}${key}: ${generateValueCode(val, indent + 2)},`);
    }

    lines.push(' '.repeat(indent - 2) + '}');
    return lines.join('\n');
  }

  return JSON.stringify(value);
}

/**
 * Generate snapshot test from scenario
 */
export function generateSnapshotTest(
  scenario: TestScenario,
  options: TestGenerationOptions = {}
): string {
  const opts = { ...defaultOptions, ...options };
  const indent = ' '.repeat(opts.indentSize);

  const lines: string[] = [];

  lines.push(generateImports(opts.framework));
  lines.push("import { createSnapshotTest } from '../../../src/testing/snapshotTesting.js';");
  lines.push('');

  // Generate event imports
  const eventImports = new Set<string>();
  for (const eventData of scenario.events) {
    const eventTag = eventData.event.tag || 'UNKNOWN_EVENT';
    const eventName = convertEventTagToName(eventTag);
    eventImports.add(eventName);
  }

  // Add event imports
  if (eventImports.size > 0) {
    const eventNames = Array.from(eventImports).sort();
    lines.push(
      `import { ${eventNames.join(', ')} } from '../../../src/praxis/application/facts.js';`
    );
    lines.push('');
  }

  lines.push(`describe('${opts.describeName}', () => {`);
  lines.push(`${indent}it('${opts.testName}', () => {`);
  lines.push(`${indent}${indent}const testFn = createSnapshotTest({`);
  lines.push(`${indent}${indent}${indent}name: '${scenario.name}',`);
  lines.push(`${indent}${indent}${indent}events: [`);

  for (const eventData of scenario.events) {
    const eventCode = generateEventCode(eventData.event, opts.indentSize * 3);
    lines.push(`${indent}${indent}${indent}${indent}${eventCode},`);
  }

  lines.push(`${indent}${indent}${indent}],`);
  lines.push(`${indent}${indent}${indent}expectedSnapshots: [`);

  // Generate expected snapshots
  for (let i = 0; i < scenario.events.length; i++) {
    const eventData = scenario.events[i];
    if (eventData.stateAfter) {
      lines.push(`${indent}${indent}${indent}${indent}{`);
      lines.push(`${indent}${indent}${indent}${indent}${indent}index: ${i + 1},`);
      lines.push(`${indent}${indent}${indent}${indent}${indent}state: '${eventData.stateAfter}',`);
      lines.push(
        `${indent}${indent}${indent}${indent}${indent}contextChecks: (ctx) => ctx.applicationState === '${eventData.stateAfter}',`
      );
      lines.push(`${indent}${indent}${indent}${indent}},`);
    }
  }

  lines.push(`${indent}${indent}${indent}],`);
  lines.push(`${indent}${indent}});`);
  lines.push('');
  lines.push(`${indent}${indent}expect(() => testFn()).not.toThrow();`);
  lines.push(`${indent}});`);
  lines.push('});');

  return lines.join('\n');
}

/**
 * Save generated test to file
 */
export async function saveGeneratedTest(testCode: string, filepath: string): Promise<void> {
  const fs = await import('fs/promises');
  await fs.writeFile(filepath, testCode, 'utf-8');
}

/**
 * Generate test from history file
 */
export async function generateTestFromHistoryFile(
  historyFile: string,
  outputFile: string,
  options: TestGenerationOptions = {}
): Promise<void> {
  const fs = await import('fs/promises');
  const historyJson = await fs.readFile(historyFile, 'utf-8');
  const exported = JSON.parse(historyJson) as ExportedHistory;

  const testCode = generateTestFromHistory(exported, options);
  await saveGeneratedTest(testCode, outputFile);
}
