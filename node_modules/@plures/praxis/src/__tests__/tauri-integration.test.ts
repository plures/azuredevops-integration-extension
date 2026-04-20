/**
 * Tauri Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockTauriBridge,
  createTauriPraxisAdapter,
  attachTauriToEngine,
  generateTauriConfig,
} from '../integrations/tauri.js';
import { createPraxisEngine, PraxisRegistry } from '../index.js';

describe('Tauri Integration', () => {
  describe('createMockTauriBridge', () => {
    it('should create a mock bridge', () => {
      const bridge = createMockTauriBridge();

      expect(bridge).toBeDefined();
      expect(bridge.app.name).toBe('Mock App');
      expect(bridge.app.tauriVersion).toBe('mock');
    });

    it('should provide file system operations', async () => {
      const bridge = createMockTauriBridge();

      // Write and read text file
      await bridge.fs.writeTextFile('/test.txt', 'Hello, World!');
      const content = await bridge.fs.readTextFile('/test.txt');

      expect(content).toBe('Hello, World!');
    });

    it('should check file existence', async () => {
      const bridge = createMockTauriBridge();

      await bridge.fs.writeTextFile('/exists.txt', 'content');

      expect(await bridge.fs.exists('/exists.txt')).toBe(true);
      expect(await bridge.fs.exists('/not-exists.txt')).toBe(false);
    });

    it('should remove files', async () => {
      const bridge = createMockTauriBridge();

      await bridge.fs.writeTextFile('/to-remove.txt', 'content');
      expect(await bridge.fs.exists('/to-remove.txt')).toBe(true);

      await bridge.fs.remove('/to-remove.txt');
      expect(await bridge.fs.exists('/to-remove.txt')).toBe(false);
    });

    it('should rename files', async () => {
      const bridge = createMockTauriBridge();

      await bridge.fs.writeTextFile('/old.txt', 'content');
      await bridge.fs.rename('/old.txt', '/new.txt');

      expect(await bridge.fs.exists('/old.txt')).toBe(false);
      expect(await bridge.fs.exists('/new.txt')).toBe(true);
      expect(await bridge.fs.readTextFile('/new.txt')).toBe('content');
    });

    it('should handle binary files', async () => {
      const bridge = createMockTauriBridge();
      const data = new Uint8Array([1, 2, 3, 4, 5]);

      await bridge.fs.writeFile('/binary.bin', data);
      const read = await bridge.fs.readFile('/binary.bin');

      expect(read).toEqual(data);
    });

    it('should invoke commands', async () => {
      const bridge = createMockTauriBridge();
      const result = await bridge.invoke('test-command', { arg: 'value' });

      expect(result).toBeNull(); // Mock returns null
    });

    it('should emit and listen to events', async () => {
      const bridge = createMockTauriBridge();

      const received: unknown[] = [];
      await bridge.listen('test-event', (event) => {
        received.push(event.payload);
      });

      await bridge.emit('test-event', { data: 'test' });

      expect(received.length).toBe(1);
      expect(received[0]).toEqual({ data: 'test' });
    });

    it('should provide notification API', async () => {
      const bridge = createMockTauriBridge();

      const permission = await bridge.notification.checkPermission();
      expect(permission).toBe('granted');

      // Should not throw
      await bridge.notification.send({ title: 'Test', body: 'Body' });
    });

    it('should check for updates', async () => {
      const bridge = createMockTauriBridge();

      const update = await bridge.checkForUpdates();
      expect(update).toBeNull(); // Mock returns null
    });
  });

  describe('createTauriPraxisAdapter', () => {
    it('should create an adapter', () => {
      const bridge = createMockTauriBridge();
      const adapter = createTauriPraxisAdapter({ bridge });

      expect(adapter).toBeDefined();
      expect(adapter.getStatePath()).toBe('praxis-state.json');
      expect(adapter.getEventsPath()).toBe('praxis-events.json');
    });

    it('should use custom paths', () => {
      const bridge = createMockTauriBridge();
      const adapter = createTauriPraxisAdapter({
        bridge,
        statePath: 'custom-state.json',
        eventsPath: 'custom-events.json',
      });

      expect(adapter.getStatePath()).toBe('custom-state.json');
      expect(adapter.getEventsPath()).toBe('custom-events.json');
    });

    it('should save and load state', async () => {
      const bridge = createMockTauriBridge();
      const adapter = createTauriPraxisAdapter<{ count: number }>({ bridge });

      await adapter.saveState({ count: 42 });
      const loaded = await adapter.loadState();

      expect(loaded).toEqual({ count: 42 });
    });

    it('should return null for missing state', async () => {
      const bridge = createMockTauriBridge();
      const adapter = createTauriPraxisAdapter<{ count: number }>({ bridge });

      const loaded = await adapter.loadState();
      expect(loaded).toBeNull();
    });

    it('should save and load events', async () => {
      const bridge = createMockTauriBridge();
      const adapter = createTauriPraxisAdapter({ bridge });

      const events = [
        { tag: 'Event1', payload: { id: '1' } },
        { tag: 'Event2', payload: { id: '2' } },
      ];

      await adapter.saveEvents(events);
      const loaded = await adapter.loadEvents();

      expect(loaded).toEqual(events);
    });

    it('should return empty array for missing events', async () => {
      const bridge = createMockTauriBridge();
      const adapter = createTauriPraxisAdapter({ bridge });

      const loaded = await adapter.loadEvents();
      expect(loaded).toEqual([]);
    });

    it('should provide watch function', async () => {
      const bridge = createMockTauriBridge();
      const adapter = createTauriPraxisAdapter<{ count: number }>({ bridge });

      const cleanup = await adapter.watchStateFile(() => {});
      expect(cleanup).toBeInstanceOf(Function);
      cleanup();
    });
  });

  describe('attachTauriToEngine', () => {
    it('should attach adapter to engine', () => {
      const bridge = createMockTauriBridge();
      const adapter = createTauriPraxisAdapter({ bridge });
      const registry = new PraxisRegistry();
      const engine = createPraxisEngine({
        initialContext: { count: 0 },
        registry,
      });

      const cleanup = attachTauriToEngine(engine, adapter, {
        autoSave: true,
        saveInterval: 1000,
      });

      expect(cleanup).toBeInstanceOf(Function);
      cleanup();
    });

    it('should work without auto-save', () => {
      const bridge = createMockTauriBridge();
      const adapter = createTauriPraxisAdapter({ bridge });
      const registry = new PraxisRegistry();
      const engine = createPraxisEngine({
        initialContext: {},
        registry,
      });

      const cleanup = attachTauriToEngine(engine, adapter, {
        autoSave: false,
      });

      expect(cleanup).toBeInstanceOf(Function);
      cleanup();
    });
  });

  describe('generateTauriConfig', () => {
    it('should generate basic config', () => {
      const config = generateTauriConfig({
        name: 'My App',
        version: '1.0.0',
        identifier: 'com.example.myapp',
      });

      expect(config.productName).toBe('My App');
      expect(config.version).toBe('1.0.0');
      expect(config.identifier).toBe('com.example.myapp');
    });

    it('should include window config', () => {
      const config = generateTauriConfig({
        name: 'My App',
        version: '1.0.0',
        identifier: 'com.example.myapp',
        window: {
          title: 'My Window',
          width: 1024,
          height: 768,
          resizable: true,
          center: true,
        },
      });

      const app = config.app as {
        windows: Array<{ title: string; width: number; height: number }>;
      };
      expect(app.windows[0].title).toBe('My Window');
      expect(app.windows[0].width).toBe(1024);
      expect(app.windows[0].height).toBe(768);
    });

    it('should include security config', () => {
      const config = generateTauriConfig({
        name: 'My App',
        version: '1.0.0',
        identifier: 'com.example.myapp',
        security: {
          csp: "default-src 'self'; script-src 'self'",
          devTools: true,
        },
      });

      const app = config.app as { security: { csp: string; devtools: boolean } };
      expect(app.security.csp).toBe("default-src 'self'; script-src 'self'");
      expect(app.security.devtools).toBe(true);
    });

    it('should include plugins', () => {
      const config = generateTauriConfig({
        name: 'My App',
        version: '1.0.0',
        identifier: 'com.example.myapp',
        plugins: [
          { name: 'shell', config: { open: true } },
          { name: 'fs', config: { scope: ['$APP/*'] } },
        ],
      });

      const plugins = config.plugins as Record<string, unknown>;
      expect(plugins.shell).toEqual({ open: true });
      expect(plugins.fs).toEqual({ scope: ['$APP/*'] });
    });

    it('should have $schema', () => {
      const config = generateTauriConfig({
        name: 'My App',
        version: '1.0.0',
        identifier: 'com.example.myapp',
      });

      expect(config.$schema).toContain('tauri-config-schema');
    });
  });
});
