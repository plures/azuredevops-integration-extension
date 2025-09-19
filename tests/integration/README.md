# Integration Tests

This directory contains integration tests for the Azure DevOps Integration extension. These tests run inside a real VS Code instance to verify that the extension works end-to-end.

## Test Structure

- `tests/integration/webview-roundtrip.test.ts` - Main test runner that sets up VS Code and loads integration tests
- `tests/integration-tests/` - Actual test files that run inside VS Code
  - `index.ts` - Test runner entry point
  - `webview.test.ts` - Webview functionality tests

## Running Integration Tests

### Local Development

```bash
# Install dependencies first
npm ci

# Run integration tests
npm run test:integration
```

### Environment Requirements

Integration tests require:

1. **Network access** to download VS Code
2. **Graphical environment** or virtual display for VS Code to run

#### Linux (Headless)

If running in a headless Linux environment (like CI), you need `xvfb`:

```bash
# Install xvfb
sudo apt-get install xvfb

# Run with virtual display
xvfb-run -a npm run test:integration
```

#### CI/GitHub Actions

The GitHub Actions workflow automatically:
- Installs `xvfb` for headless testing
- Sets up virtual display
- Runs tests with proper environment

### Fallback Behavior

The integration tests have built-in fallback mechanisms:

1. **Network issues**: If VS Code can't be downloaded, tests skip gracefully
2. **Display issues**: If no display is available, helpful error messages are shown
3. **Compilation**: Integration tests are automatically compiled if needed

### Test Output

- **Success**: Tests pass and extension functionality is verified
- **Skip**: Tests are skipped due to environment limitations (not a failure)
- **Failure**: Actual test failures or extension issues

## Adding New Integration Tests

1. Add test files to `tests/integration-tests/`
2. Follow the existing pattern using VS Code's test framework
3. Tests should be resilient to configuration issues
4. Use timeouts appropriately for async operations

## Troubleshooting

### "Missing X server" Error

```
Error: Missing X server or $DISPLAY
```

**Solution**: Install and use `xvfb-run`:
```bash
sudo apt-get install xvfb
xvfb-run -a npm run test:integration
```

### Download Failures

```
Failed to download VS Code
```

This is normal in restricted environments. Tests will skip gracefully.

### Extension Not Found

Ensure the extension is built before running tests:
```bash
npm run build
npm run test:integration
```