# PluresDB Integration

This module provides integration between Praxis and PluresDB for local-first, reactive data storage.

## Overview

Praxis supports PluresDB through a simple adapter interface (`PraxisDB`) that can be backed by:

1. **In-memory storage** (for development/testing) - `InMemoryPraxisDB`
2. **Official PluresDB** (for production) - `PluresDBPraxisAdapter`

## Using the Official PluresDB

The official PluresDB package from NPM provides a complete local-first database with P2P sync, CRDT conflict resolution, and more.

### Installation

PluresDB is included as a dependency in Praxis:

```bash
npm install @plures/praxis
# PluresDB is automatically installed as a dependency
```

### Basic Usage

```typescript
import { PluresNode } from 'pluresdb';
import { createPluresDB, createPraxisDBStore } from '@plures/praxis';
import { PraxisRegistry } from '@plures/praxis';

// Initialize PluresDB
const pluresdb = new PluresNode({
  config: {
    port: 34567,
    host: 'localhost',
    dataDir: './data',
  },
  autoStart: true,
});

// Wrap it with the Praxis adapter
const db = createPluresDB(pluresdb);

// Use with Praxis store
const registry = new PraxisRegistry();
const store = createPraxisDBStore(db, registry);

// Now you can use the store with Praxis engine
```

### Using with In-Memory Storage (Development)

For testing and development, use the in-memory implementation:

```typescript
import { createInMemoryDB, createPraxisDBStore } from '@plures/praxis';
import { PraxisRegistry } from '@plures/praxis';

// Create in-memory database
const db = createInMemoryDB();

// Use with Praxis store
const registry = new PraxisRegistry();
const store = createPraxisDBStore(db, registry);
```

## API Reference

### PraxisDB Interface

All database adapters implement this interface:

```typescript
interface PraxisDB {
  // Get a value by key
  get<T>(key: string): Promise<T | undefined>;
  
  // Set a value by key
  set<T>(key: string, value: T): Promise<void>;
  
  // Watch a key for changes
  watch<T>(key: string, callback: (val: T) => void): UnsubscribeFn;
}
```

### createPluresDB(db)

Creates a Praxis adapter for the official PluresDB package.

**Parameters:**
- `db`: PluresDB instance (PluresNode or SQLiteCompatibleAPI)

**Returns:** `PluresDBPraxisAdapter` instance

### createInMemoryDB()

Creates an in-memory database for testing/development.

**Returns:** `InMemoryPraxisDB` instance

## Features

### Event Sourcing

Store facts and events in PluresDB:

```typescript
import { createPraxisEngine, createPluresDBAdapter } from '@plures/praxis';

const adapter = createPluresDBAdapter({ db, registry });
const engine = createPraxisEngine({ initialContext: {}, registry });
adapter.attachEngine(engine);

// Events are now persisted to PluresDB
```

### Reactive Queries

Watch for changes in the database:

```typescript
const unsubscribe = db.watch('user:123', (user) => {
  console.log('User updated:', user);
});

// Later: unsubscribe
unsubscribe();
```

## PluresDB Features

The official PluresDB package provides:

- **P2P Graph Database**: Distributed, peer-to-peer data storage
- **SQLite Compatibility**: 95% SQLite API compatibility
- **CRDT Conflict Resolution**: Automatic conflict resolution
- **Vector Search**: Built-in vector embeddings and similarity search
- **Local-First**: Offline-first data storage with sync when online
- **Cross-Device Sync**: Automatic synchronization across devices

For more information, see the [PluresDB documentation](https://github.com/plures/pluresdb).

## Migration

If you're using the in-memory implementation and want to migrate to PluresDB:

1. Install PluresDB (already included as dependency)
2. Replace `createInMemoryDB()` with `createPluresDB(pluresdb)`
3. The API remains the same - no other code changes needed!

## Notes

- The `PluresDBPraxisAdapter` uses polling to watch for changes (since PluresDB doesn't natively support reactive queries in the current API)
- For production use, consider the polling interval and adjust if needed
- The adapter automatically handles cleanup of polling intervals when watchers are removed
