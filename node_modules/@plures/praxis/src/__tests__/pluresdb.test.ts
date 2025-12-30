/**
 * PluresDB Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInMemoryDB,
  InMemoryPraxisDB,
  createPraxisDBStore,
  PraxisDBStore,
  PRAXIS_PATHS,
  getFactPath,
  getEventPath,
  PraxisSchemaRegistry,
  registerSchema,
  createSchemaRegistry,
  getSchemaPath,
  createPluresDBAdapter,
  attachToEngine,
} from '../integrations/pluresdb.js';
import { PraxisRegistry } from '../core/rules.js';
import { createPraxisEngine } from '../core/engine.js';
import { defineRule, defineConstraint, defineFact, defineEvent } from '../dsl/index.js';
import type { PraxisSchema } from '../core/schema/types.js';

describe('InMemoryPraxisDB', () => {
  let db: InMemoryPraxisDB;

  beforeEach(() => {
    db = createInMemoryDB();
  });

  it('should get and set values', async () => {
    await db.set('test-key', { value: 42 });
    const result = await db.get<{ value: number }>('test-key');
    expect(result).toEqual({ value: 42 });
  });

  it('should return undefined for missing keys', async () => {
    const result = await db.get('nonexistent');
    expect(result).toBeUndefined();
  });

  it('should watch for changes', async () => {
    const values: number[] = [];

    db.watch<number>('counter', (val) => {
      values.push(val);
    });

    await db.set('counter', 1);
    await db.set('counter', 2);
    await db.set('counter', 3);

    expect(values).toEqual([1, 2, 3]);
  });

  it('should unsubscribe from watch', async () => {
    const values: number[] = [];

    const unsubscribe = db.watch<number>('counter', (val) => {
      values.push(val);
    });

    await db.set('counter', 1);
    unsubscribe();
    await db.set('counter', 2);

    expect(values).toEqual([1]);
  });

  it('should list keys', async () => {
    await db.set('key1', 'value1');
    await db.set('key2', 'value2');

    const keys = db.keys();
    expect(keys).toContain('key1');
    expect(keys).toContain('key2');
  });

  it('should clear all data', async () => {
    await db.set('key1', 'value1');
    db.clear();

    const result = await db.get('key1');
    expect(result).toBeUndefined();
    expect(db.keys()).toHaveLength(0);
  });
});

describe('Path generators', () => {
  it('should generate fact paths', () => {
    expect(getFactPath('UserLoggedIn')).toBe('/_praxis/facts/UserLoggedIn');
    expect(getFactPath('UserLoggedIn', 'user-123')).toBe('/_praxis/facts/UserLoggedIn/user-123');
  });

  it('should generate event paths', () => {
    expect(getEventPath('LOGIN')).toBe('/_praxis/events/LOGIN');
  });

  it('should generate schema paths', () => {
    expect(getSchemaPath('MyApp')).toBe('/_praxis/schemas/MyApp');
  });

  it('should have correct PRAXIS_PATHS', () => {
    expect(PRAXIS_PATHS.BASE).toBe('/_praxis');
    expect(PRAXIS_PATHS.FACTS).toBe('/_praxis/facts');
    expect(PRAXIS_PATHS.EVENTS).toBe('/_praxis/events');
    expect(PRAXIS_PATHS.SCHEMAS).toBe('/_praxis/schemas');
  });
});

describe('PraxisDBStore', () => {
  let db: InMemoryPraxisDB;
  let registry: PraxisRegistry;
  let store: PraxisDBStore;

  beforeEach(() => {
    db = createInMemoryDB();
    registry = new PraxisRegistry();
    store = createPraxisDBStore(db, registry);
  });

  describe('Facts', () => {
    it('should store a fact', async () => {
      const fact = { tag: 'UserLoggedIn', payload: { userId: 'alice', id: 'fact-1' } };

      await store.storeFact(fact);

      const retrieved = await store.getFact('UserLoggedIn', 'fact-1');
      expect(retrieved).toEqual(fact);
    });

    it('should store multiple facts', async () => {
      const facts = [
        { tag: 'UserLoggedIn', payload: { userId: 'alice', id: 'fact-1' } },
        { tag: 'UserLoggedIn', payload: { userId: 'bob', id: 'fact-2' } },
      ];

      await store.storeFacts(facts);

      const fact1 = await store.getFact('UserLoggedIn', 'fact-1');
      const fact2 = await store.getFact('UserLoggedIn', 'fact-2');

      expect(fact1).toEqual(facts[0]);
      expect(fact2).toEqual(facts[1]);
    });

    it('should generate id if not provided', async () => {
      const fact = { tag: 'UserLoggedIn', payload: { userId: 'alice' } };

      await store.storeFact(fact);

      // Check that something was stored under the UserLoggedIn path
      const keys = db.keys().filter((k) => k.startsWith('/_praxis/facts/UserLoggedIn/'));
      expect(keys.length).toBe(1);
    });
  });

  describe('Events', () => {
    it('should append an event', async () => {
      const event = { tag: 'LOGIN', payload: { username: 'alice' } };

      await store.appendEvent(event);

      const entries = await store.getEvents('LOGIN');
      expect(entries).toHaveLength(1);
      expect(entries[0]?.event).toEqual(event);
      expect(entries[0]?.timestamp).toBeDefined();
      expect(entries[0]?.sequence).toBe(0);
    });

    it('should append multiple events', async () => {
      const events = [
        { tag: 'LOGIN', payload: { username: 'alice' } },
        { tag: 'LOGIN', payload: { username: 'bob' } },
      ];

      await store.appendEvents(events);

      const entries = await store.getEvents('LOGIN');
      expect(entries).toHaveLength(2);
      expect(entries[0]?.event.payload).toEqual({ username: 'alice' });
      expect(entries[1]?.event.payload).toEqual({ username: 'bob' });
    });

    it('should filter events by timestamp', async () => {
      const event1 = { tag: 'LOGIN', payload: { username: 'alice' } };
      await store.appendEvent(event1);

      const timestamp = Date.now();

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const event2 = { tag: 'LOGIN', payload: { username: 'bob' } };
      await store.appendEvent(event2);

      const entries = await store.getEvents('LOGIN', { since: timestamp });
      expect(entries).toHaveLength(1);
      expect(entries[0]?.event.payload).toEqual({ username: 'bob' });
    });

    it('should limit events', async () => {
      await store.appendEvents([
        { tag: 'LOGIN', payload: { username: 'alice' } },
        { tag: 'LOGIN', payload: { username: 'bob' } },
        { tag: 'LOGIN', payload: { username: 'charlie' } },
      ]);

      const entries = await store.getEvents('LOGIN', { limit: 2 });
      expect(entries).toHaveLength(2);
      expect(entries[0]?.event.payload).toEqual({ username: 'bob' });
      expect(entries[1]?.event.payload).toEqual({ username: 'charlie' });
    });
  });

  describe('Constraints', () => {
    it('should reject facts that violate constraints', async () => {
      const noEmptyUserId = defineConstraint({
        id: 'noEmptyUserId',
        description: 'User ID cannot be empty',
        impl: (state) => {
          const facts = state.facts;
          for (const fact of facts) {
            const payload = fact.payload as { userId?: string };
            if (payload?.userId === '') {
              return 'User ID cannot be empty';
            }
          }
          return true;
        },
      });

      registry.registerConstraint(noEmptyUserId);

      const invalidFact = { tag: 'UserLoggedIn', payload: { userId: '', id: 'fact-1' } };

      await expect(store.storeFact(invalidFact)).rejects.toThrow('Constraint violation');
    });
  });

  describe('Context', () => {
    it('should update and get context', () => {
      interface Context {
        count: number;
      }
      const typedStore = createPraxisDBStore<Context>(db, registry as PraxisRegistry<Context>, {
        count: 0,
      });

      expect(typedStore.getContext()).toEqual({ count: 0 });

      typedStore.updateContext({ count: 5 });
      expect(typedStore.getContext()).toEqual({ count: 5 });
    });
  });

  describe('Dispose', () => {
    it('should dispose subscriptions', () => {
      store.dispose();
      // Should not throw
    });
  });
});

describe('PraxisSchemaRegistry', () => {
  let db: InMemoryPraxisDB;
  let schemaRegistry: PraxisSchemaRegistry;

  beforeEach(() => {
    db = createInMemoryDB();
    schemaRegistry = createSchemaRegistry(db);
  });

  const testSchema: PraxisSchema = {
    version: '1.0.0',
    name: 'TestApp',
    description: 'Test application schema',
    models: [],
    components: [],
    logic: [],
  };

  it('should register a schema', async () => {
    await schemaRegistry.register(testSchema);

    const stored = await schemaRegistry.get('TestApp');
    expect(stored?.schema).toEqual(testSchema);
    expect(stored?.version).toBe('1.0.0');
    expect(stored?.registeredAt).toBeDefined();
  });

  it('should check if schema exists', async () => {
    expect(await schemaRegistry.exists('TestApp')).toBe(false);

    await schemaRegistry.register(testSchema);

    expect(await schemaRegistry.exists('TestApp')).toBe(true);
  });

  it('should update a schema', async () => {
    await schemaRegistry.register(testSchema);

    const updatedSchema = { ...testSchema, version: '2.0.0' };
    await schemaRegistry.update(updatedSchema);

    const stored = await schemaRegistry.get('TestApp');
    expect(stored?.version).toBe('2.0.0');
  });

  it('should register with index and list schemas', async () => {
    await schemaRegistry.registerWithIndex(testSchema);
    await schemaRegistry.registerWithIndex({ ...testSchema, name: 'OtherApp' });

    const list = await schemaRegistry.list();
    expect(list).toContain('TestApp');
    expect(list).toContain('OtherApp');
  });

  it('should not duplicate in index', async () => {
    await schemaRegistry.registerWithIndex(testSchema);
    await schemaRegistry.registerWithIndex(testSchema);

    const list = await schemaRegistry.list();
    expect(list.filter((n) => n === 'TestApp')).toHaveLength(1);
  });
});

describe('registerSchema helper', () => {
  it('should register schema with convenience function', async () => {
    const db = createInMemoryDB();

    await registerSchema(db, {
      version: '1.0.0',
      name: 'QuickApp',
    });

    const schemaRegistry = createSchemaRegistry(db);
    const stored = await schemaRegistry.get('QuickApp');
    expect(stored?.schema.name).toBe('QuickApp');
  });
});

describe('PluresDBAdapter', () => {
  let db: InMemoryPraxisDB;
  let registry: PraxisRegistry;

  beforeEach(() => {
    db = createInMemoryDB();
    registry = new PraxisRegistry();
  });

  it('should persist facts', async () => {
    const adapter = createPluresDBAdapter({ db, registry });

    await adapter.persistFacts([
      { tag: 'UserLoggedIn', payload: { userId: 'alice', id: 'fact-1' } },
    ]);

    const keys = db.keys().filter((k) => k.includes('UserLoggedIn'));
    expect(keys.length).toBe(1);

    adapter.dispose();
  });

  it('should persist events', async () => {
    const adapter = createPluresDBAdapter({ db, registry });

    await adapter.persistEvents([{ tag: 'LOGIN', payload: { username: 'alice' } }]);

    const entries = await db.get<Array<{ event: unknown }>>(`/_praxis/events/LOGIN`);
    expect(entries).toHaveLength(1);

    adapter.dispose();
  });

  it('should load events', async () => {
    const adapter = createPluresDBAdapter({ db, registry });

    await adapter.persistEvents([
      { tag: 'LOGIN', payload: { username: 'alice' } },
      { tag: 'LOGIN', payload: { username: 'bob' } },
    ]);

    const events = await adapter.loadEvents({ tag: 'LOGIN' });
    expect(events).toHaveLength(2);

    adapter.dispose();
  });

  it('should attach to engine', () => {
    const adapter = createPluresDBAdapter({ db, registry });
    const engine = createPraxisEngine({
      initialContext: { count: 0 },
      registry,
    });

    // Should not throw
    adapter.attachEngine(engine);

    adapter.dispose();
  });
});

describe('attachToEngine', () => {
  it('should attach store to engine', () => {
    const db = createInMemoryDB();
    const registry = new PraxisRegistry<{ count: number }>();
    const store = createPraxisDBStore(db, registry, { count: 0 });
    const engine = createPraxisEngine({
      initialContext: { count: 5 },
      registry,
    });

    const detach = attachToEngine(store, engine);

    // Context should be synced from engine to store
    expect(store.getContext()).toEqual({ count: 5 });

    // Should not throw
    detach();
  });
});

describe('Rules triggering', () => {
  it('should trigger rules when events are appended', async () => {
    interface Context {
      logins: number;
    }

    const UserLoggedIn = defineFact<'UserLoggedIn', { userId: string }>('UserLoggedIn');
    const Login = defineEvent<'LOGIN', { username: string }>('LOGIN');

    const loginRule = defineRule<Context>({
      id: 'auth.login',
      description: 'Process login event',
      impl: (state, events) => {
        const loginEvent = events.find(Login.is);
        if (loginEvent) {
          return [UserLoggedIn.create({ userId: loginEvent.payload.username })];
        }
        return [];
      },
    });

    const db = createInMemoryDB();
    const registry = new PraxisRegistry<Context>();
    registry.registerRule(loginRule);

    const store = createPraxisDBStore(db, registry, { logins: 0 });

    await store.appendEvent(Login.create({ username: 'alice' }));

    // Check that derived fact was stored
    const keys = db.keys().filter((k) => k.includes('UserLoggedIn'));
    expect(keys.length).toBe(1);
  });
});
