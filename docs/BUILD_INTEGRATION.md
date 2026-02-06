# Build Process Integration

## Overview

The Praxis history testing infrastructure is fully integrated into the build process, ensuring tests run automatically during builds and CI/CD pipelines.

## Build Scripts

### Standard Build

```bash
npm run build
```

**What it does**:

1. Formats code (`npm run format`)
2. Compiles TypeScript (`npm run compile`)
3. Validates code (`npm run validate:all`)
4. **Runs Praxis tests** (`npm run test:praxis`) ✨ NEW

### Strict Build

```bash
npm run build:strict
```

**What it does**:

1. Formats code
2. Compiles TypeScript
3. Strict validation (`npm run validate:all:strict`)
4. **Runs Praxis tests** ✨ NEW

### CI Build

```bash
npm run build:ci
```

**What it does**:

1. Compiles TypeScript
2. Validates code
3. **Runs all tests** (`npm run test:all`) ✨ NEW
   - Unit tests
   - Praxis tests

## Test Scripts

### Run All Praxis Tests

```bash
npm run test:praxis
```

Runs all Praxis-related tests including:

- History recorder tests
- Snapshot testing tests
- Event sequence validator tests
- Example test scenarios
- Test generation demos

### Run Example Tests

```bash
npm run test:praxis:examples
```

Runs only the example test scenarios:

- Connection authentication workflow
- Work item lifecycle
- Error recovery scenarios
- Test generation demos

### Watch Mode

```bash
npm run test:praxis:watch
```

Runs tests in watch mode for development.

### UI Mode

```bash
npm run test:praxis:ui
```

Opens Vitest UI for interactive test running.

## CI/CD Integration

### GitHub Actions

The `.github/workflows/test-praxis.yml` workflow automatically:

1. **Triggers on**:
   - Push to `main` or `develop` branches
   - Pull requests
   - Changes to Praxis-related files

2. **Runs**:
   - Compiles TypeScript
   - Runs Praxis tests
   - Uploads test artifacts on failure
   - Uploads coverage reports

3. **Artifacts**:
   - Test history exports (on failure)
   - Coverage reports

### Pre-commit Hook

The `precommit` script runs validation before commits:

```json
"precommit": "npm run validate:all"
```

This ensures code quality before commits.

## Test Artifacts

### Automatic Export

When tests fail, history is automatically exported to `test-artifacts/`:

```
test-artifacts/
  ├── connection_auth_workflow_1234567890.json
  ├── work_item_lifecycle_1234567891.json
  └── error_recovery_1234567892.json
```

### CI Artifact Upload

In CI, failed test artifacts are automatically uploaded:

```yaml
- name: Upload test artifacts
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: test-artifacts
    path: test-artifacts/
```

## Vitest Configuration

### Setup Files

The `vitest.config.ts` automatically loads:

```typescript
setupFiles: ['tests/setup/praxis-history-setup.ts'];
```

This provides:

- Custom matchers
- Auto-reset history
- Export on failure

### Test Patterns

Tests are discovered automatically:

- `tests/praxis/**/*.test.ts` - All Praxis tests
- `tests/praxis/examples/**/*.test.ts` - Example tests
- `src/**/*.test.ts` - Source tests (excluding legacy)

## Build Process Flow

```
┌─────────────────┐
│  npm run build  │
└────────┬────────┘
         │
         ├─► Format Code
         │
         ├─► Compile TypeScript
         │
         ├─► Validate Code
         │
         └─► Run Praxis Tests ✨
                │
                ├─► History Recorder Tests
                ├─► Snapshot Tests
                ├─► Event Sequence Tests
                └─► Example Scenarios
```

## Pre-commit Integration

Tests run automatically before commits:

```bash
# Git hook runs:
npm run validate:all
```

This includes:

- Type checking
- Linting
- (Tests can be added here if needed)

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Praxis History Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test-praxis:
    runs-on: ubuntu-latest
    steps:
      - Install dependencies
      - Compile TypeScript
      - Run Praxis tests
      - Upload artifacts (on failure)
      - Upload coverage
```

## Coverage Reports

Test coverage is automatically generated:

```bash
npm run test:praxis -- --coverage
```

Coverage reports are uploaded to Codecov in CI.

## Best Practices

1. **Run tests before committing**:

   ```bash
   npm run test:praxis
   ```

2. **Use watch mode during development**:

   ```bash
   npm run test:praxis:watch
   ```

3. **Check artifacts on failure**:

   ```bash
   ls test-artifacts/
   ```

4. **Review CI test results**:
   - Check GitHub Actions for test status
   - Download artifacts if tests fail
   - Review coverage reports

## Troubleshooting

### Tests Not Running

1. Check `vitest.config.ts` includes setup file
2. Verify test files match include patterns
3. Check for compilation errors

### Artifacts Not Generated

1. Verify `exportOnFailure` is `true` in setup
2. Check `test-artifacts/` directory exists
3. Ensure tests are actually failing

### CI Tests Failing

1. Check GitHub Actions logs
2. Download test artifacts
3. Review error messages
4. Run tests locally to reproduce

## See Also

- [Vitest Plugin Guide](./PRAXIS_VITEST_PLUGIN_GUIDE.md)
- [Testing Examples Guide](./PRAXIS_HISTORY_EXAMPLES_GUIDE.md)
- [Test Generation Guide](./PRAXIS_TEST_GENERATION_GUIDE.md)
