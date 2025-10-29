# Architectural Discipline Package

A comprehensive toolkit for enforcing sustainable software architecture patterns through intelligent analysis, automated refactoring recommendations, and consistent code quality standards.

## 🎯 Overview

The Architectural Discipline Package provides a complete solution for maintaining high-quality, maintainable software architecture across projects of any size. It combines statistical analysis, ESLint integration, CLI tooling, and project templates to create a unified approach to architectural excellence.

## 📦 Packages

### Core Packages

- **`@architectural-discipline/core`** - Statistical analysis engine and rule definitions
- **`@architectural-discipline/eslint-plugin`** - ESLint plugin for architectural rules
- **`@architectural-discipline/cli`** - Command-line interface for analysis and refactoring

### Project Templates

- **`@architectural-discipline/template-vscode-extension`** - VS Code extension template
- **`@architectural-discipline/template-web-app`** - Web application template
- **`@architectural-discipline/template-mobile-app`** - Mobile application template
- **`@architectural-discipline/template-cli-tool`** - CLI tool template
- **`@architectural-discipline/template-library`** - Library template
- **`@architectural-discipline/template-api-service`** - API service template

## 🚀 Quick Start

### Installation

```bash
# Install the CLI globally
npm install -g @architectural-discipline/cli

# Or install specific packages
npm install @architectural-discipline/core
npm install @architectural-discipline/eslint-plugin
```

### Basic Usage

```bash
# Analyze your project
architectural-discipline analyze

# Generate refactoring recommendations
architectural-discipline recommend

# Create a new project with architectural discipline
architectural-discipline create my-project --template web-app
```

### ESLint Integration

```javascript
// eslint.config.js
import architecturalDiscipline from '@architectural-discipline/eslint-plugin';

export default [
  architecturalDiscipline.configs.recommended,
  {
    rules: {
      '@architectural-discipline/max-lines': 'error',
      '@architectural-discipline/max-complexity': 'warn',
    }
  }
];
```

## 🏗️ Architecture

The package follows a modular architecture with clear separation of concerns:

```
packages/
├── core/                    # Statistical analysis engine
├── eslint-plugin/          # ESLint integration
├── cli/                    # Command-line interface
└── templates/              # Project templates
    ├── vscode-extension/
    ├── web-app/
    ├── mobile-app/
    ├── cli-tool/
    ├── library/
    └── api-service/
```

## 📊 Features

### Intelligent Analysis
- **Statistical Analysis**: Analyzes codebase patterns and identifies outliers
- **Complexity Metrics**: Measures cyclomatic complexity and cognitive load
- **Purity Scoring**: Evaluates function purity and side effects
- **Modularity Assessment**: Analyzes module cohesion and coupling

### Automated Recommendations
- **Refactoring Suggestions**: Provides specific, actionable refactoring recommendations
- **Priority Classification**: Categorizes issues by severity and impact
- **Context-Aware**: Considers project type and domain-specific patterns
- **Incremental Improvement**: Supports gradual architectural improvement

### Quality Enforcement
- **ESLint Integration**: Seamless integration with existing linting workflows
- **Pre-commit Hooks**: Automated quality checks before commits
- **CI/CD Integration**: Continuous quality monitoring in pipelines
- **Customizable Rules**: Configurable thresholds and rule sets

### Project Templates
- **Best Practices**: Pre-configured with architectural discipline rules
- **Framework Support**: Templates for popular frameworks and platforms
- **Documentation**: Comprehensive guides and examples
- **Migration Support**: Tools for adding discipline to existing projects

## 🎨 Philosophy

The Architectural Discipline Package is built on the principle that **sustainable software architecture requires consistent, measurable practices**. It provides:

1. **Objective Metrics**: Quantifiable measures of code quality and maintainability
2. **Actionable Insights**: Specific recommendations rather than abstract principles
3. **Gradual Adoption**: Incremental improvement without disrupting existing workflows
4. **Community Standards**: Shared understanding of architectural excellence

## 📚 Documentation

- [Getting Started](docs/getting-started.md)
- [Core Concepts](docs/core-concepts.md)
- [ESLint Plugin](docs/eslint-plugin.md)
- [CLI Reference](docs/cli-reference.md)
- [Project Templates](docs/templates.md)
- [Migration Guide](docs/migration-guide.md)
- [API Reference](docs/api-reference.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Built with inspiration from:
- Clean Architecture principles
- SOLID design principles
- Statistical analysis methodologies
- Modern JavaScript/TypeScript best practices
- Community-driven quality standards
