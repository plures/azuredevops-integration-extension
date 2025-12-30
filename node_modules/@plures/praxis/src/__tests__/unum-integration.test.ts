/**
 * Unum Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createUnumAdapter, attachUnumToEngine } from '../integrations/unum.js';
import { createInMemoryDB } from '../integrations/pluresdb.js';
import { createPraxisEngine, PraxisRegistry } from '../index.js';

describe('Unum Integration', () => {
  describe('createUnumAdapter', () => {
    it('should create an adapter without identity', async () => {
      const db = createInMemoryDB();
      const adapter = await createUnumAdapter({ db });

      expect(adapter).toBeDefined();
      expect(adapter.identity).toBeNull();
    });

    it('should create an adapter with identity', async () => {
      const db = createInMemoryDB();
      const adapter = await createUnumAdapter({
        db,
        identity: {
          id: 'test-user',
          name: 'Test User',
          createdAt: Date.now(),
        },
      });

      expect(adapter.identity).toBeDefined();
      expect(adapter.identity?.name).toBe('Test User');
    });

    it('should set identity', async () => {
      const db = createInMemoryDB();
      const adapter = await createUnumAdapter({ db });

      const identity = await adapter.setIdentity({ name: 'New User' });

      expect(identity.name).toBe('New User');
      expect(identity.id).toBeDefined();
      expect(identity.createdAt).toBeDefined();
    });

    it('should get identity by ID', async () => {
      const db = createInMemoryDB();
      const adapter = await createUnumAdapter({ db });

      const created = await adapter.setIdentity({ name: 'Test' });
      const fetched = await adapter.getIdentity(created.id);

      expect(fetched).toBeDefined();
      expect(fetched?.name).toBe('Test');
    });

    it('should create a channel', async () => {
      const db = createInMemoryDB();
      const adapter = await createUnumAdapter({ db });

      const channel = await adapter.createChannel('test-channel');

      expect(channel).toBeDefined();
      expect(channel.name).toBe('test-channel');
      expect(channel.id).toBeDefined();
    });

    it('should join a channel', async () => {
      const db = createInMemoryDB();
      const adapter = await createUnumAdapter({ db });

      const created = await adapter.createChannel('test-channel');
      const joined = await adapter.joinChannel(created.id);

      expect(joined.id).toBe(created.id);
      expect(joined.name).toBe('test-channel');
    });

    it('should list channels', async () => {
      const db = createInMemoryDB();
      const adapter = await createUnumAdapter({ db });

      await adapter.createChannel('channel-1');
      await adapter.createChannel('channel-2');

      const channels = await adapter.listChannels();

      expect(channels.length).toBe(2);
    });

    it('should publish messages to channel', async () => {
      const db = createInMemoryDB();
      const adapter = await createUnumAdapter({
        db,
        identity: { id: 'user-1', name: 'User 1', createdAt: Date.now() },
      });

      const channel = await adapter.createChannel('test-channel');

      const messages: unknown[] = [];
      channel.subscribe((msg) => messages.push(msg));

      await channel.publish({
        id: 'msg-1',
        sender: adapter.identity!,
        content: { text: 'Hello!' },
        type: 'text',
      });

      expect(messages.length).toBe(1);
    });

    it('should disconnect and cleanup', async () => {
      const db = createInMemoryDB();
      const adapter = await createUnumAdapter({ db });

      await adapter.createChannel('test-channel');
      await adapter.disconnect();

      const channels = await adapter.listChannels();
      expect(channels.length).toBe(0);
      expect(adapter.identity).toBeNull();
    });
  });

  describe('attachUnumToEngine', () => {
    it('should attach adapter to engine', async () => {
      const db = createInMemoryDB();
      const adapter = await createUnumAdapter({ db });
      const registry = new PraxisRegistry();
      const engine = createPraxisEngine({
        initialContext: {},
        registry,
      });

      const cleanup = attachUnumToEngine(engine, adapter, 'test-channel');

      expect(cleanup).toBeInstanceOf(Function);
      cleanup();
    });
  });
});
