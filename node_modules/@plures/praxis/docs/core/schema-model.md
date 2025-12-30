# Praxis Schema Model

The Praxis Schema Format (PSF) is the foundation of every Praxis application. This document explains the schema structure, types, and best practices.

## Overview

A PSF schema is a JSON document that describes your entire application:

```json
{
  "$version": "1.0.0",
  "id": "my-app",
  "name": "My Application",
  "description": "Application description",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "modifiedAt": "2024-01-01T00:00:00.000Z",
  "facts": [...],
  "events": [...],
  "rules": [...],
  "constraints": [...],
  "models": [...],
  "components": [...],
  "flows": [...],
  "docs": {...},
  "canvas": {...}
}
```

## Schema Sections

### Metadata

```json
{
  "$version": "1.0.0",
  "id": "unique-app-id",
  "name": "Human Readable Name",
  "description": "What this application does",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "modifiedAt": "2024-01-01T00:00:00.000Z"
}
```

### Facts

Facts are typed propositions about your domain. They represent "what is true" after events are processed.

```json
{
  "facts": [
    {
      "id": "fact_user_logged_in",
      "tag": "UserLoggedIn",
      "description": "User successfully authenticated",
      "payload": {
        "type": "object",
        "properties": {
          "userId": { "type": "string" },
          "timestamp": { "type": "number" }
        }
      }
    }
  ]
}
```

| Field         | Type   | Required | Description                  |
| ------------- | ------ | -------- | ---------------------------- |
| `id`          | string | Yes      | Unique identifier            |
| `tag`         | string | Yes      | Fact tag (used in code)      |
| `description` | string | Yes      | Human-readable description   |
| `payload`     | object | Yes      | JSON Schema for fact payload |

### Events

Events are things that happen in your application that drive state changes.

```json
{
  "events": [
    {
      "id": "event_login",
      "tag": "Login",
      "description": "User attempts to log in",
      "payload": {
        "type": "object",
        "properties": {
          "username": { "type": "string" },
          "password": { "type": "string" }
        }
      }
    }
  ]
}
```

| Field         | Type   | Required | Description                   |
| ------------- | ------ | -------- | ----------------------------- |
| `id`          | string | Yes      | Unique identifier             |
| `tag`         | string | Yes      | Event tag (used in code)      |
| `description` | string | Yes      | Human-readable description    |
| `payload`     | object | Yes      | JSON Schema for event payload |

### Rules

Rules are pure functions that produce facts from events and current state.

```json
{
  "rules": [
    {
      "id": "auth.login",
      "name": "Process Login",
      "description": "Handle login event and emit UserLoggedIn fact",
      "triggers": ["Login"],
      "then": {
        "inline": "const event = events.find(e => e.tag === 'Login'); if (!event) return []; return [{ tag: 'UserLoggedIn', payload: { userId: event.payload.username, timestamp: Date.now() } }];",
        "language": "typescript"
      },
      "priority": 10
    }
  ]
}
```

| Field         | Type     | Required | Description                         |
| ------------- | -------- | -------- | ----------------------------------- |
| `id`          | string   | Yes      | Unique identifier                   |
| `name`        | string   | Yes      | Rule name                           |
| `description` | string   | Yes      | What the rule does                  |
| `triggers`    | string[] | No       | Events that trigger this rule       |
| `then`        | object   | Yes      | Rule implementation                 |
| `priority`    | number   | No       | Execution priority (higher = first) |

### Constraints

Constraints are invariants that must always hold true.

```json
{
  "constraints": [
    {
      "id": "cart.maxItems",
      "name": "Maximum Cart Items",
      "description": "Cart cannot have more than 100 items",
      "check": {
        "inline": "(state.context.cart || []).length <= 100",
        "language": "typescript"
      },
      "errorMessage": "Cart cannot contain more than 100 items",
      "severity": "error"
    }
  ]
}
```

| Field          | Type   | Required | Description                     |
| -------------- | ------ | -------- | ------------------------------- |
| `id`           | string | Yes      | Unique identifier               |
| `name`         | string | Yes      | Constraint name                 |
| `description`  | string | Yes      | What the constraint ensures     |
| `check`        | object | Yes      | Constraint check implementation |
| `errorMessage` | string | Yes      | Error message when violated     |
| `severity`     | string | Yes      | `error` or `warning`            |

### Models

Models define your data structures.

```json
{
  "models": [
    {
      "id": "model_user",
      "name": "User",
      "description": "Application user",
      "fields": [
        { "name": "id", "type": "uuid", "description": "Unique identifier" },
        { "name": "username", "type": "string", "description": "Username" },
        { "name": "email", "type": "string", "description": "Email address" },
        { "name": "createdAt", "type": "datetime", "description": "Creation time" },
        {
          "name": "role",
          "type": { "enum": ["admin", "user", "guest"] },
          "description": "User role"
        }
      ],
      "indexes": [{ "name": "idx_email", "fields": ["email"], "unique": true }],
      "relationships": [
        { "name": "posts", "type": "one-to-many", "target": "Post", "foreignKey": "authorId" }
      ]
    }
  ]
}
```

#### Field Types

| Type                     | Description                | Example                  |
| ------------------------ | -------------------------- | ------------------------ |
| `string`                 | Text value                 | `"Hello"`                |
| `number`                 | Numeric value              | `42`                     |
| `boolean`                | True/false                 | `true`                   |
| `uuid`                   | UUID string                | `"550e8400-..."`         |
| `datetime`               | ISO 8601 date              | `"2024-01-01T00:00:00Z"` |
| `object`                 | Nested object              | `{ key: value }`         |
| `{ array: { type } }`    | Array of type              | `[1, 2, 3]`              |
| `{ enum: [...] }`        | Enumeration                | `"active"`               |
| `{ reference: "Model" }` | Reference to another model | Foreign key              |

### Components

Components define UI elements generated from the schema.

```json
{
  "components": [
    {
      "id": "comp_user_form",
      "name": "UserForm",
      "type": "form",
      "description": "Form for creating/editing users",
      "model": "User",
      "props": [
        {
          "name": "user",
          "type": "User",
          "required": false,
          "description": "Existing user to edit"
        },
        {
          "name": "onSubmit",
          "type": "function",
          "required": true,
          "description": "Submit handler"
        }
      ],
      "events": [
        { "name": "submit", "payload": "User", "description": "Form submitted" },
        { "name": "cancel", "description": "Form cancelled" }
      ]
    }
  ]
}
```

#### Component Types

| Type        | Description        | Generated Features          |
| ----------- | ------------------ | --------------------------- |
| `form`      | Input form         | Validation, submit handling |
| `display`   | Display data       | Data binding, formatting    |
| `list`      | List of items      | Pagination, filtering       |
| `editor`    | Rich editor        | Editing capabilities        |
| `composite` | Composed of others | Layout, composition         |

### Flows

Flows define sequences of steps or state machines.

```json
{
  "flows": [
    {
      "id": "flow_checkout",
      "name": "Checkout Flow",
      "description": "Complete checkout process",
      "type": "sequence",
      "initial": "cart_review",
      "steps": [
        {
          "id": "cart_review",
          "name": "Review Cart",
          "type": "action",
          "next": "shipping"
        },
        {
          "id": "shipping",
          "name": "Enter Shipping",
          "type": "action",
          "next": "payment"
        },
        {
          "id": "payment",
          "name": "Process Payment",
          "type": "action",
          "next": {
            "success": "confirmation",
            "failure": "payment_error"
          }
        },
        {
          "id": "confirmation",
          "name": "Order Confirmed",
          "type": "terminal"
        }
      ]
    }
  ]
}
```

### Documentation

Embedded documentation for generated docs.

```json
{
  "docs": {
    "overview": "Application overview text",
    "gettingStarted": "1. Install dependencies\n2. Run development server"
  }
}
```

### Canvas

Configuration for CodeCanvas visual editor.

```json
{
  "canvas": {
    "viewport": { "x": 0, "y": 0, "zoom": 1 },
    "grid": { "enabled": true, "size": 20, "snap": true }
  }
}
```

## Schema Composition

### Extending Schemas

Schemas can extend other schemas:

```json
{
  "$extends": "./base-schema.psf.json",
  "id": "extended-app",
  "models": [
    {
      "id": "model_custom",
      "name": "CustomModel",
      "fields": [...]
    }
  ]
}
```

### Importing Definitions

Import definitions from other files:

```json
{
  "imports": [
    { "from": "./auth.psf.json", "include": ["facts", "events", "rules"] },
    { "from": "./ui-components.psf.json", "include": ["components"] }
  ]
}
```

## Validation

Schemas are validated against the PSF JSON Schema. Use the CLI:

```bash
praxis validate --schema ./schema.psf.json
```

Common validation errors:

- Missing required fields
- Invalid type definitions
- Duplicate IDs
- Invalid references to models or facts

## Best Practices

### Naming Conventions

- **Facts**: Use past tense (`UserLoggedIn`, `ItemAdded`)
- **Events**: Use present tense or imperative (`Login`, `AddItem`)
- **Rules**: Use domain.action format (`auth.login`, `cart.addItem`)
- **Models**: Use singular nouns (`User`, `Product`)
- **Components**: Use PascalCase (`UserForm`, `ProductList`)

### Organization

1. **Group related items**: Keep authentication facts, events, and rules together
2. **Use meaningful IDs**: `fact_user_logged_in` not `fact1`
3. **Document everything**: Use descriptions liberally
4. **Version your schema**: Use `$version` for breaking changes

### Performance

1. **Limit rule triggers**: Only trigger rules on relevant events
2. **Use priorities**: Execute important rules first
3. **Optimize constraints**: Keep constraint checks efficient
4. **Minimize inline code**: Use references for complex logic

## Code Generation

Generate code from your schema:

```bash
# Generate all outputs
praxis generate --schema ./schema.psf.json --output ./generated

# Generate specific outputs
praxis generate --schema ./schema.psf.json --output ./generated --only types,components

# Watch mode
praxis generate --schema ./schema.psf.json --watch
```

Generated outputs:

- `facts.ts` - Fact type definitions and creators
- `events.ts` - Event type definitions and creators
- `rules.ts` - Rule implementations
- `constraints.ts` - Constraint validators
- `models.ts` - TypeScript interfaces
- `components/` - Svelte components
- `docs/` - Markdown documentation

---

**Next:** [Logic Engine](./logic-engine.md)
