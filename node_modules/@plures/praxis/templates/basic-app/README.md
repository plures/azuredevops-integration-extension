# Basic Praxis Application Template

This template provides a minimal Praxis application setup.

## Structure

```
basic-app/
  ├── src/
  │   ├── schemas/
  │   │   └── app.schema.ts      # Application schema definition
  │   ├── components/            # Generated and custom components
  │   ├── logic/                 # Logic engine setup
  │   │   ├── facts.ts          # Fact definitions
  │   │   ├── events.ts         # Event definitions
  │   │   ├── rules.ts          # Rule definitions
  │   │   └── engine.ts         # Engine configuration
  │   ├── store/                # Data store setup
  │   │   └── index.ts          # PluresDB configuration
  │   ├── App.svelte            # Root component
  │   └── main.ts               # Application entry point
  ├── public/                   # Static assets
  ├── package.json
  ├── tsconfig.json
  ├── vite.config.ts
  └── README.md
```

## Features

- ✅ Schema-driven development
- ✅ Praxis logic engine
- ✅ Svelte UI
- ✅ PluresDB integration
- ✅ TypeScript support
- ✅ Vite build system

## Getting Started

### 1. Create a new app

```bash
praxis create app my-app --template basic
cd my-app
npm install
```

### 2. Define your schema

Edit `src/schemas/app.schema.ts`:

```typescript
import type { PraxisSchema } from '@plures/praxis/schema';

export const appSchema: PraxisSchema = {
  version: '1.0.0',
  name: 'MyApp',
  description: 'My Praxis application',

  models: [
    {
      name: 'User',
      fields: [
        { name: 'id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string' },
      ],
    },
  ],

  components: [
    {
      name: 'UserForm',
      type: 'form',
      model: 'User',
    },
  ],

  logic: [
    {
      id: 'user-logic',
      description: 'User management logic',
      events: [{ tag: 'USER_CREATE', payload: { name: 'string', email: 'string' } }],
      facts: [{ tag: 'UserCreated', payload: { userId: 'string' } }],
    },
  ],
};
```

### 3. Generate code

```bash
praxis generate --schema src/schemas/app.schema.ts
```

This generates:

- Svelte components in `src/components/`
- Logic definitions in `src/logic/`
- Type definitions throughout

### 4. Run development server

```bash
npm run dev
```

### 5. Build for production

```bash
npm run build
```

## Customization

### Add custom components

Create Svelte components in `src/components/` alongside generated ones.

### Extend logic

Add custom rules and constraints in `src/logic/rules.ts`.

### Configure store

Customize PluresDB configuration in `src/store/index.ts`.

## Next Steps

- Add authentication module
- Enable Canvas integration for visual editing
- Set up State-Docs for documentation
- Add orchestration for distributed features

## Documentation

- [Praxis Framework Guide](../../docs/guides/getting-started.md)
- [Schema Reference](../../docs/api/schema.md)
- [Logic Engine](../../docs/api/logic.md)
- [Component Generation](../../docs/api/components.md)

## License

MIT
