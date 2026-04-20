/**
 * CLI Create Command Tests
 *
 * Tests for the praxis create command.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { existsSync } from 'fs';
import { rm, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { create, type CreateOptions } from '../cli/commands/create.js';

// Use a unique temp directory for each test run
const TEST_DIR = join(tmpdir(), 'praxis-create-tests-' + Date.now());

describe('CLI Create Command', () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    process.chdir(TEST_DIR);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('create app', () => {
    test('should create a new app with basic template', async () => {
      const appName = 'my-test-app';
      const options: CreateOptions = { template: 'basic' };

      // Mock console.log to suppress output
      const originalLog = console.log;
      console.log = () => {};

      try {
        await create('app', appName, options);

        // Verify directory structure
        const appDir = join(TEST_DIR, appName);
        expect(existsSync(appDir)).toBe(true);
        expect(existsSync(join(appDir, 'package.json'))).toBe(true);
        expect(existsSync(join(appDir, 'tsconfig.json'))).toBe(true);
        expect(existsSync(join(appDir, 'vite.config.ts'))).toBe(true);
        expect(existsSync(join(appDir, 'src', 'App.svelte'))).toBe(true);
        expect(existsSync(join(appDir, 'src', 'main.ts'))).toBe(true);
        expect(existsSync(join(appDir, 'src', 'schemas', 'app.schema.js'))).toBe(true);

        // Verify package.json content
        const packageJson = JSON.parse(await readFile(join(appDir, 'package.json'), 'utf-8'));
        expect(packageJson.name).toBe(appName);
        expect(packageJson.dependencies['@plures/praxis']).toBeDefined();
        expect(packageJson.scripts.dev).toBe('vite');
        expect(packageJson.scripts.generate).toBe('praxis generate');
      } finally {
        console.log = originalLog;
      }
    });

    test('should fail for app with invalid name', async () => {
      const originalLog = console.log;
      const originalError = console.error;
      const originalExit = process.exit;

      console.log = () => {};
      console.error = () => {};

      let exitCode: number | undefined;
      process.exit = ((code?: number) => {
        exitCode = code;
        throw new Error('process.exit called');
      }) as never;

      try {
        await create('app', '123invalid', {});
      } catch (e) {
        // Expected to throw due to process.exit mock
      } finally {
        console.log = originalLog;
        console.error = originalError;
        process.exit = originalExit;
      }

      expect(exitCode).toBe(1);
    });
  });

  describe('create component', () => {
    test('should create a new component', async () => {
      const componentName = 'MyButton';
      const componentDir = join(TEST_DIR, 'components');
      await mkdir(componentDir, { recursive: true });

      const options: CreateOptions = { directory: componentDir };

      // Mock console.log to suppress output
      const originalLog = console.log;
      console.log = () => {};

      try {
        await create('component', componentName, options);

        // Verify component files
        const outputDir = join(componentDir, componentName);
        expect(existsSync(join(outputDir, `${componentName}.svelte`))).toBe(true);
        expect(existsSync(join(outputDir, `${componentName}.schema.js`))).toBe(true);
        expect(existsSync(join(outputDir, 'index.ts'))).toBe(true);

        // Verify index.ts content
        const indexContent = await readFile(join(outputDir, 'index.ts'), 'utf-8');
        expect(indexContent).toContain(`export { default as ${componentName} }`);
      } finally {
        console.log = originalLog;
      }
    });

    test('should fail without a name', async () => {
      const originalLog = console.log;
      const originalError = console.error;
      const originalExit = process.exit;

      console.log = () => {};
      console.error = () => {};

      let exitCode: number | undefined;
      process.exit = ((code?: number) => {
        exitCode = code;
        throw new Error('process.exit called');
      }) as never;

      try {
        await create('component', undefined, {});
      } catch (e) {
        // Expected to throw due to process.exit mock
      } finally {
        console.log = originalLog;
        console.error = originalError;
        process.exit = originalExit;
      }

      expect(exitCode).toBe(1);
    });
  });

  describe('unknown type', () => {
    test('should fail for unknown type', async () => {
      const originalLog = console.log;
      const originalError = console.error;
      const originalExit = process.exit;

      console.log = () => {};
      console.error = () => {};

      let exitCode: number | undefined;
      process.exit = ((code?: number) => {
        exitCode = code;
        throw new Error('process.exit called');
      }) as never;

      try {
        await create('unknown', 'test', {});
      } catch (e) {
        // Expected to throw due to process.exit mock
      } finally {
        console.log = originalLog;
        console.error = originalError;
        process.exit = originalExit;
      }

      expect(exitCode).toBe(1);
    });
  });
});
