import { describe, it, expect } from 'vitest';
import { validateSchema } from '../core/schema/types.js';
import { loadSchemaFromYaml, loadSchemaFromJson } from '../core/schema/loader.js';
import {
  createTerminalAdapter,
  runTerminalCommand,
  createMockExecutor,
  type TerminalExecutionResult,
} from '../runtime/terminal-adapter.js';
import type { PraxisSchema } from '../core/schema/types.js';

describe('Terminal Node', () => {
  describe('Schema Validation', () => {
    it('validates a schema with terminal node', () => {
      const schema: PraxisSchema = {
        version: '1.0.0',
        name: 'TestTerminalSchema',
        orchestration: {
          type: 'custom',
          nodes: [
            {
              id: 't1',
              type: 'terminal',
              x: 100,
              y: 80,
              config: {},
              props: {
                inputMode: 'text',
                history: [],
                lastOutput: null,
              },
            },
          ],
        },
      };

      const result = validateSchema(schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates terminal node with widget input mode', () => {
      const schema: PraxisSchema = {
        version: '1.0.0',
        name: 'TestTerminalSchema',
        orchestration: {
          type: 'custom',
          nodes: [
            {
              id: 't2',
              type: 'terminal',
              config: {},
              props: {
                inputMode: 'widget',
                history: ['ls', 'pwd'],
                lastOutput: 'test output',
              },
            },
          ],
        },
      };

      const result = validateSchema(schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails validation with invalid inputMode', () => {
      const schema: PraxisSchema = {
        version: '1.0.0',
        name: 'TestTerminalSchema',
        orchestration: {
          type: 'custom',
          nodes: [
            {
              id: 't3',
              type: 'terminal',
              config: {},
              props: {
                inputMode: 'invalid' as any,
                history: [],
                lastOutput: null,
              },
            },
          ],
        },
      };

      const result = validateSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('inputMode');
    });

    it('fails validation when history is not an array', () => {
      const schema: PraxisSchema = {
        version: '1.0.0',
        name: 'TestTerminalSchema',
        orchestration: {
          type: 'custom',
          nodes: [
            {
              id: 't4',
              type: 'terminal',
              config: {},
              props: {
                inputMode: 'text',
                history: 'not-an-array' as any,
                lastOutput: null,
              },
            },
          ],
        },
      };

      const result = validateSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('history');
    });

    it('validates terminal node with bindings', () => {
      const schema: PraxisSchema = {
        version: '1.0.0',
        name: 'TestTerminalSchema',
        orchestration: {
          type: 'custom',
          nodes: [
            {
              id: 't5',
              type: 'terminal',
              config: {},
              props: {
                inputMode: 'text',
                history: [],
                lastOutput: null,
              },
              bindings: {
                input: '/terminal/input',
                output: '/terminal/output',
              },
            },
          ],
        },
      };

      const result = validateSchema(schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('YAML Loading', () => {
    it('loads terminal node from YAML', () => {
      const yaml = `
version: "1.0.0"
name: "TerminalTestSchema"
orchestration:
  type: custom
  nodes:
    - id: t1
      type: terminal
      x: 100
      y: 80
      props:
        inputMode: text
        history: []
        lastOutput: null
`;

      const result = loadSchemaFromYaml(yaml);
      expect(result.errors).toHaveLength(0);
      expect(result.schema).toBeDefined();
      expect(result.schema?.orchestration?.nodes).toHaveLength(1);
      expect(result.schema?.orchestration?.nodes?.[0].type).toBe('terminal');
    });

    it('loads terminal node with bindings from YAML', () => {
      const yaml = `
version: "1.0.0"
name: "TerminalTestSchema"
orchestration:
  type: custom
  nodes:
    - id: t1
      type: terminal
      x: 200
      y: 150
      props:
        inputMode: widget
        history:
          - echo hello
          - ls -la
        lastOutput: null
      bindings:
        input: /plures/terminal/input
        output: /plures/terminal/output
`;

      const result = loadSchemaFromYaml(yaml);
      expect(result.errors).toHaveLength(0);
      expect(result.schema).toBeDefined();

      const node = result.schema?.orchestration?.nodes?.[0];
      expect(node?.type).toBe('terminal');
      expect(node?.bindings?.input).toBe('/plures/terminal/input');
      expect(node?.bindings?.output).toBe('/plures/terminal/output');
    });
  });

  describe('JSON Loading', () => {
    it('loads terminal node from JSON', () => {
      const json = JSON.stringify({
        version: '1.0.0',
        name: 'TerminalTestSchema',
        orchestration: {
          type: 'custom',
          nodes: [
            {
              id: 't1',
              type: 'terminal',
              x: 100,
              y: 80,
              config: {},
              props: {
                inputMode: 'text',
                history: [],
                lastOutput: null,
              },
            },
          ],
        },
      });

      const result = loadSchemaFromJson(json);
      expect(result.errors).toHaveLength(0);
      expect(result.schema).toBeDefined();
      expect(result.schema?.orchestration?.nodes).toHaveLength(1);
      expect(result.schema?.orchestration?.nodes?.[0].type).toBe('terminal');
    });
  });

  describe('Terminal Adapter', () => {
    it('creates a terminal adapter', () => {
      const adapter = createTerminalAdapter({
        nodeId: 'test-terminal',
      });

      expect(adapter).toBeDefined();
      const state = adapter.getState();
      expect(state.nodeId).toBe('test-terminal');
      expect(state.inputMode).toBe('text');
      expect(state.history).toEqual([]);
      expect(state.lastOutput).toBeNull();
    });

    it('creates terminal adapter with custom props', () => {
      const adapter = createTerminalAdapter({
        nodeId: 'test-terminal',
        props: {
          inputMode: 'widget',
          history: ['echo test'],
          lastOutput: 'test output',
        },
      });

      const state = adapter.getState();
      expect(state.inputMode).toBe('widget');
      expect(state.history).toEqual(['echo test']);
      expect(state.lastOutput).toBe('test output');
    });

    it('creates terminal adapter with pluresDB bindings', () => {
      const adapter = createTerminalAdapter({
        nodeId: 'test-terminal',
        inputPath: '/terminal/input',
        outputPath: '/terminal/output',
      });

      expect(adapter).toBeDefined();
      const state = adapter.getState();
      expect(state.nodeId).toBe('test-terminal');
    });

    it('executes a command', async () => {
      const adapter = createTerminalAdapter({
        nodeId: 'test-terminal',
      });

      const result = await adapter.executeCommand('echo hello');

      expect(result).toBeDefined();
      expect(result.command).toBe('echo hello');
      expect(result.output).toContain('hello');
      expect(result.exitCode).toBe(0);
      expect(result.timestamp).toBeGreaterThan(0);

      const state = adapter.getState();
      expect(state.history).toContain('echo hello');
      expect(state.lastOutput).toBe(result.output);
    });

    it('maintains command history', async () => {
      const adapter = createTerminalAdapter({
        nodeId: 'test-terminal',
      });

      await adapter.executeCommand('ls');
      await adapter.executeCommand('pwd');
      await adapter.executeCommand('echo test');

      const history = adapter.getHistory();
      expect(history).toEqual(['ls', 'pwd', 'echo test']);
    });

    it('clears command history', async () => {
      const adapter = createTerminalAdapter({
        nodeId: 'test-terminal',
      });

      await adapter.executeCommand('ls');
      await adapter.executeCommand('pwd');

      expect(adapter.getHistory()).toHaveLength(2);

      adapter.clearHistory();
      expect(adapter.getHistory()).toHaveLength(0);
    });

    it('updates terminal props', () => {
      const adapter = createTerminalAdapter({
        nodeId: 'test-terminal',
      });

      adapter.updateProps({
        inputMode: 'widget',
      });

      const state = adapter.getState();
      expect(state.inputMode).toBe('widget');
    });
  });

  describe('runTerminalCommand convenience function', () => {
    it('executes command using convenience function', async () => {
      const executor = createMockExecutor({
        'ls -la': { output: 'mock listing', exitCode: 0 },
      });

      const result = await runTerminalCommand('test-node', 'ls -la', { executor });

      expect(result).toBeDefined();
      expect(result.command).toBe('ls -la');
      expect(result.exitCode).toBe(0);
    });
  });
});
