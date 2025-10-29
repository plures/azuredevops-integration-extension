# 🏗️ Architectural Discipline Core

A comprehensive, statistical approach to maintaining code quality and architecture discipline across projects.

## 🎯 Overview

This package provides intelligent, data-driven architecture analysis that grows with your project. Instead of arbitrary limits, it uses statistical analysis to identify outliers and provide intelligent refactoring recommendations.

## 📦 Packages

### Core Packages

- `@architectural-discipline/core` - Core analysis engine and types
- `@architectural-discipline/eslint-plugin` - ESLint integration
- `@architectural-discipline/cli` - Command-line analysis tool
- `@architectural-discipline/templates` - Project templates

### Framework-Specific Packages

- `@architectural-discipline/react` - React-specific rules and templates
- `@architectural-discipline/vue` - Vue-specific rules and templates
- `@architectural-discipline/svelte` - Svelte-specific rules and templates
- `@architectural-discipline/node` - Node.js-specific rules and templates

## 🚀 Quick Start

### Installation

```bash
npm install @architectural-discipline/core @architectural-discipline/eslint-plugin @architectural-discipline/cli
```

### Basic Usage

```bash
# Analyze current project
npx architectural-discipline analyze

# Check architecture compliance
npx architectural-discipline check

# Generate refactoring recommendations
npx architectural-discipline recommend
```

### ESLint Integration

```javascript
// eslint.config.js
import architecturalDiscipline from '@architectural-discipline/eslint-plugin';

export default [
  architecturalDiscipline.configs.recommended,
  {
    rules: {
      '@architectural-discipline/statistical-file-size': 'error',
      '@architectural-discipline/function-purity': 'warn',
    },
  },
];
```

## 🧠 Core Concepts

### Statistical Thresholds

- **Adaptive**: Thresholds adjust based on project patterns
- **File Type Aware**: Different expectations for different file types
- **Outlier Detection**: Uses 95th percentile and 2 standard deviations

### File Type Classification

- **Machine**: State machines, FSM definitions (50-200 lines)
- **Client**: API clients, services (100-400 lines)
- **Handler**: Event handlers, controllers (80-300 lines)
- **Utility**: Pure functions, helpers (30-150 lines)
- **Integration**: Bridges, adapters (60-250 lines)
- **Test**: Test files (20-200 lines)
- **Config**: Configuration files (20-100 lines)

### Function Purity Scoring

- **0-100 scale**: Higher is more pure
- **Side effect detection**: Logging, state mutation, I/O
- **Complexity penalties**: High cyclomatic complexity reduces score
- **Pure function bonuses**: Return values, no external dependencies

## 📊 Analysis Output

### Project Health Score

- **Overall**: 0-100 composite score
- **Maintainability**: Based on file sizes and complexity
- **Testability**: Based on function purity
- **Modularity**: Based on function distribution
- **Complexity**: Based on cyclomatic complexity

### Recommendations

- **High Priority**: Critical outliers requiring immediate attention
- **Medium Priority**: Significant improvements recommended
- **Low Priority**: Minor optimizations suggested

## 🔧 Configuration

### Custom File Types

```javascript
// architectural-discipline.config.js
export default {
  fileTypes: {
    'custom-component': {
      patterns: ['**/components/**/*.tsx'],
      expectedSizeRange: [50, 200],
      complexityThreshold: 8,
    },
  },
  thresholds: {
    outlierPercentile: 95,
    standardDeviationMultiplier: 2,
  },
};
```

### Custom Rules

```javascript
// eslint.config.js
export default [
  {
    rules: {
      '@architectural-discipline/custom-purity': ['error', { minScore: 80 }],
      '@architectural-discipline/custom-complexity': ['warn', { maxComplexity: 5 }],
    },
  },
];
```

## 🛠️ Development Workflow

### Pre-commit Hooks

```bash
# .husky/pre-commit
#!/bin/sh
npx architectural-discipline check || exit 1
```

### CI/CD Integration

```yaml
# .github/workflows/architecture.yml
name: Architecture Analysis
on: [push, pull_request]
jobs:
  architecture:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Architecture Analysis
        run: npx architectural-discipline analyze
      - name: Architecture Check
        run: npx architectural-discipline check
```

## 📚 Documentation

- [Getting Started](./docs/getting-started.md)
- [Configuration Guide](./docs/configuration.md)
- [File Type Customization](./docs/file-types.md)
- [ESLint Integration](./docs/eslint-integration.md)
- [CLI Reference](./docs/cli-reference.md)
- [Migration Guide](./docs/migration-guide.md)
- [Best Practices](./docs/best-practices.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

Built with ❤️ for maintaining clean, scalable architecture across all projects.
