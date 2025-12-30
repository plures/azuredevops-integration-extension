# Fullstack Praxis Application Template

This template provides a complete Praxis application with all framework features enabled.

## Structure

```
fullstack-app/
  ├── src/
  │   ├── schemas/
  │   │   ├── app.schema.ts           # Main application schema
  │   │   ├── auth.schema.ts          # Authentication schema
  │   │   └── data.schema.ts          # Data models schema
  │   ├── components/                  # Generated and custom components
  │   │   ├── auth/                   # Authentication components
  │   │   ├── layout/                 # Layout components
  │   │   └── widgets/                # Widget components
  │   ├── logic/                      # Logic engine
  │   │   ├── auth/                   # Auth logic module
  │   │   ├── data/                   # Data logic module
  │   │   └── engine.ts               # Main engine setup
  │   ├── store/                      # Data store
  │   │   ├── pluresdb.ts            # PluresDB setup
  │   │   └── sync.ts                # Sync configuration
  │   ├── canvas/                     # Canvas integration
  │   │   └── config.ts              # Canvas configuration
  │   ├── orchestration/              # Orchestration setup
  │   │   ├── dsc.config.ts          # DSC configuration
  │   │   └── nodes.ts               # Node definitions
  │   ├── docs/                       # Generated documentation
  │   ├── App.svelte                  # Root component
  │   └── main.ts                     # Application entry
  ├── public/                         # Static assets
  ├── tests/                          # Test suite
  ├── package.json
  ├── tsconfig.json
  ├── vite.config.ts
  ├── vitest.config.ts
  └── README.md
```

## Features

- ✅ Complete schema-driven development
- ✅ Full Praxis logic engine
- ✅ Authentication module
- ✅ PluresDB with sync
- ✅ Unum identity integration
- ✅ CodeCanvas visual editing
- ✅ State-Docs documentation
- ✅ DSC orchestration
- ✅ Comprehensive testing
- ✅ Production-ready build

## Getting Started

### 1. Create fullstack app

```bash
praxis create app my-fullstack-app --template fullstack
cd my-fullstack-app
npm install
```

### 2. Configure features

Edit feature flags in `src/config/features.ts`:

```typescript
export const features = {
  auth: true,
  canvas: true,
  orchestration: false,
  statedocs: true,
  analytics: false,
};
```

### 3. Define schemas

The template includes example schemas:

- `auth.schema.ts` - User authentication and sessions
- `data.schema.ts` - Application data models
- `app.schema.ts` - Main application configuration

### 4. Generate everything

```bash
praxis generate --target all
```

Generates:

- Components from all schemas
- Logic modules with facts, events, rules
- PluresDB models
- State-Docs documentation
- Type definitions
- Test scaffolds

### 5. Run with Canvas

```bash
praxis canvas src/schemas/app.schema.ts
```

Opens visual editor at http://localhost:3000

### 6. Development

```bash
npm run dev
```

### 7. Run tests

```bash
npm test
```

### 8. Build for production

```bash
npm run build
```

## Modules Included

### Authentication Module

Pre-configured authentication with:

- User registration and login
- Session management
- JWT tokens (optional)
- Role-based access control
- Password reset flows

### Data Module

Example data models:

- Users
- Posts
- Comments
- Relationships and indexes

### Canvas Integration

Visual editing for:

- Schema definitions
- Logic flows
- Component layouts
- Data relationships

### Orchestration

Distributed coordination:

- Node configuration
- State synchronization
- Health monitoring
- Auto-scaling support

## Advanced Configuration

### PluresDB Sync

Configure sync in `src/store/sync.ts`:

```typescript
export const syncConfig = {
  enabled: true,
  interval: 5000,
  conflictResolution: 'last-write-wins',
  endpoints: ['ws://localhost:8080'],
};
```

### Canvas Server

Configure Canvas in `src/canvas/config.ts`:

```typescript
export const canvasConfig = {
  port: 3000,
  mode: 'edit',
  collaboration: true,
  autosave: true,
};
```

### Orchestration

Configure DSC in `src/orchestration/dsc.config.ts`:

```typescript
export const dscConfig = {
  nodes: 3,
  healthCheck: {
    interval: 30000,
    timeout: 5000,
  },
  sync: {
    interval: 10000,
    strategy: 'merge',
  },
};
```

## Production Deployment

### Web Deployment

```bash
npm run build
# Deploy dist/ to your web server
```

### Desktop Application

```bash
npm run build:desktop
# Creates Tauri desktop app in dist-tauri/
```

### Mobile Application (Future)

```bash
npm run build:mobile
# Creates mobile app package
```

## Documentation

All documentation is automatically generated in `src/docs/` using State-Docs.

To view:

```bash
npm run docs
```

## Testing

The template includes:

- Unit tests for logic modules
- Component tests
- Integration tests
- E2E test scaffolds

Run all tests:

```bash
npm test
```

## Monitoring

Built-in monitoring with:

- Performance metrics
- Error tracking
- User analytics (opt-in)
- Health endpoints

## Next Steps

1. Customize schemas for your domain
2. Extend authentication with OAuth providers
3. Add custom business logic rules
4. Design UI in Canvas
5. Configure distributed deployment
6. Set up CI/CD pipeline

## Documentation

- [Fullstack Guide](../../docs/guides/fullstack.md)
- [Authentication](../../docs/guides/authentication.md)
- [PluresDB Integration](../../docs/guides/pluresdb.md)
- [Canvas Usage](../../docs/guides/canvas.md)
- [Orchestration](../../docs/guides/orchestration.md)

## License

MIT
