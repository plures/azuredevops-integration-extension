# 🚀 Architectural Discipline Core Package Implementation

## 📋 Quick Start Implementation

### 1. Create Core Package Structure

```bash
mkdir -p packages/core/src/{analysis,classification,scoring,types}
cd packages/core
npm init -y
```

### 2. Core Package Dependencies

```json
{
  "name": "@architectural-discipline/core",
  "version": "1.0.0",
  "description": "Core analysis engine for architectural discipline",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "vitest": "^1.0.0"
  }
}
```

### 3. Extract Core Types

```typescript
// packages/core/src/types/FileMetrics.ts
export interface FileMetrics {
  file: string;
  fileType: FileType;
  lines: number;
  functions: FunctionMetrics[];
  complexity: number;
  purity: number;
  dependencies: string[];
  responsibilities: string[];
}

export interface FunctionMetrics {
  name: string;
  lines: number;
  complexity: number;
  purity: number;
  parameters: number;
  sideEffects: string[];
}

export interface FileTypeStatistics {
  fileType: string;
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  percentile95: number;
  percentile99: number;
  outliers: FileMetrics[];
}

export interface RefactoringRecommendation {
  file: string;
  priority: 'high' | 'medium' | 'low';
  type: 'extract-function' | 'extract-module' | 'simplify-logic' | 'reduce-complexity';
  description: string;
  estimatedEffort: number;
  impact: number;
}

export interface ProjectHealthScore {
  overall: number;
  maintainability: number;
  testability: number;
  modularity: number;
  complexity: number;
  recommendations: RefactoringRecommendation[];
}
```

### 4. Extract Analysis Engine

```typescript
// packages/core/src/analysis/statisticalAnalysis.ts
import { FileMetrics, FileTypeStatistics, StatisticalAnalysis } from '../types';

export class StatisticalAnalyzer {
  async analyzeProject(sourceDir: string): Promise<StatisticalAnalysis> {
    const files = await this.scanFiles(sourceDir);
    const fileTypeStats = this.calculateFileTypeStatistics(files);
    const outliers = this.detectOutliers(files, fileTypeStats);
    const recommendations = this.generateRecommendations(outliers);

    return {
      fileTypeStats,
      outliers,
      recommendations,
      projectHealth: this.calculateProjectHealth(files, outliers),
    };
  }

  private calculateFileTypeStatistics(files: FileMetrics[]): Map<string, FileTypeStatistics> {
    const stats = new Map<string, FileTypeStatistics>();

    // Group files by type
    const grouped = files.reduce(
      (acc, file) => {
        if (!acc[file.fileType]) acc[file.fileType] = [];
        acc[file.fileType].push(file);
        return acc;
      },
      {} as Record<string, FileMetrics[]>
    );

    // Calculate statistics for each type
    for (const [fileType, fileList] of Object.entries(grouped)) {
      const lines = fileList.map((f) => f.lines);
      const mean = lines.reduce((a, b) => a + b, 0) / lines.length;
      const sorted = [...lines].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const variance =
        lines.reduce((acc, line) => acc + Math.pow(line - mean, 2), 0) / lines.length;
      const stdDev = Math.sqrt(variance);
      const percentile95 = this.calculatePercentile(sorted, 95);
      const percentile99 = this.calculatePercentile(sorted, 99);

      stats.set(fileType, {
        fileType,
        count: fileList.length,
        mean,
        median,
        stdDev,
        percentile95,
        percentile99,
        outliers: [],
      });
    }

    return stats;
  }

  private detectOutliers(
    files: FileMetrics[],
    stats: Map<string, FileTypeStatistics>
  ): FileMetrics[] {
    const outliers: FileMetrics[] = [];

    for (const file of files) {
      const fileStats = stats.get(file.fileType);
      if (!fileStats) continue;

      // Use 95th percentile and 2 standard deviations as thresholds
      const threshold = Math.max(fileStats.percentile95, fileStats.mean + 2 * fileStats.stdDev);

      if (file.lines > threshold) {
        outliers.push(file);
      }
    }

    return outliers;
  }

  private generateRecommendations(outliers: FileMetrics[]): RefactoringRecommendation[] {
    return outliers.map((file) => ({
      file: file.file,
      priority: this.calculatePriority(file),
      type: this.determineRefactoringType(file),
      description: this.generateDescription(file),
      estimatedEffort: this.estimateEffort(file),
      impact: this.calculateImpact(file),
    }));
  }

  private calculateProjectHealth(
    files: FileMetrics[],
    outliers: FileMetrics[]
  ): ProjectHealthScore {
    const totalFiles = files.length;
    const outlierCount = outliers.length;
    const avgComplexity = files.reduce((sum, f) => sum + f.complexity, 0) / totalFiles;
    const avgPurity = files.reduce((sum, f) => sum + f.purity, 0) / totalFiles;

    return {
      overall: Math.round(100 - (outlierCount / totalFiles) * 100),
      maintainability: Math.round(100 - (outlierCount / totalFiles) * 100),
      testability: Math.round(avgPurity),
      modularity: Math.round(100 - (outlierCount / totalFiles) * 100),
      complexity: Math.round(100 - avgComplexity * 10),
      recommendations: [],
    };
  }
}
```

### 5. Extract File Type Classification

```typescript
// packages/core/src/classification/fileTypeClassifier.ts
export class FileTypeClassifier {
  private static readonly FILE_TYPE_PATTERNS = {
    machine: ['**/machines/**/*.ts', '**/fsm/**/*.ts', '**/state/**/*.ts'],
    client: ['**/client/**/*.ts', '**/api/**/*.ts', '**/service/**/*.ts'],
    handler: ['**/handler/**/*.ts', '**/controller/**/*.ts', '**/command/**/*.ts'],
    utility: ['**/util/**/*.ts', '**/helper/**/*.ts', '**/common/**/*.ts'],
    integration: ['**/bridge/**/*.ts', '**/adapter/**/*.ts', '**/integration/**/*.ts'],
    test: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**/*.ts'],
    config: ['**/config/**/*.ts', '**/*.config.ts'],
  };

  classifyFile(filePath: string): string {
    for (const [fileType, patterns] of Object.entries(this.FILE_TYPE_PATTERNS)) {
      if (patterns.some((pattern) => this.matchesPattern(filePath, pattern))) {
        return fileType;
      }
    }
    return 'unknown';
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    // Simple glob pattern matching implementation
    const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
    return regex.test(filePath);
  }
}
```

### 6. Extract Function Purity Scoring

```typescript
// packages/core/src/scoring/purityScorer.ts
export class PurityScorer {
  scoreFunction(functionNode: any): number {
    let score = 100;

    // Check for side effects
    if (this.hasSideEffects(functionNode)) {
      score -= 30;
    }

    // Check for external dependencies
    if (this.hasExternalDependencies(functionNode)) {
      score -= 20;
    }

    // Check for mutation
    if (this.hasMutation(functionNode)) {
      score -= 25;
    }

    // Check for I/O operations
    if (this.hasIOOperations(functionNode)) {
      score -= 35;
    }

    // Check for console.log
    if (this.hasConsoleLog(functionNode)) {
      score -= 15;
    }

    // Check for complex logic
    if (this.hasComplexLogic(functionNode)) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  private hasSideEffects(functionNode: any): boolean {
    // Check for side effects like logging, state mutation, etc.
    return this.traverseAST(functionNode, (node) => {
      if (node.type === 'CallExpression') {
        const callee = node.callee;
        if (callee.type === 'MemberExpression') {
          const object = callee.object.name;
          const property = callee.property.name;

          // Check for common side effects
          if (object === 'console' || object === 'process') return true;
          if (property === 'log' || property === 'error' || property === 'warn') return true;
        }
      }
      return false;
    });
  }

  private hasExternalDependencies(functionNode: any): boolean {
    // Check for external dependencies
    return this.traverseAST(functionNode, (node) => {
      if (node.type === 'CallExpression') {
        const callee = node.callee;
        if (callee.type === 'Identifier') {
          const name = callee.name;
          // Check for external dependencies
          if (name === 'require' || name === 'import') return true;
        }
      }
      return false;
    });
  }

  private hasMutation(functionNode: any): boolean {
    // Check for mutation operations
    return this.traverseAST(functionNode, (node) => {
      if (node.type === 'AssignmentExpression') {
        return true;
      }
      if (node.type === 'UpdateExpression') {
        return true;
      }
      return false;
    });
  }

  private hasIOOperations(functionNode: any): boolean {
    // Check for I/O operations
    return this.traverseAST(functionNode, (node) => {
      if (node.type === 'CallExpression') {
        const callee = node.callee;
        if (callee.type === 'MemberExpression') {
          const object = callee.object.name;
          const property = callee.property.name;

          // Check for I/O operations
          if (object === 'fs' || object === 'path') return true;
          if (property === 'readFile' || property === 'writeFile') return true;
        }
      }
      return false;
    });
  }

  private hasConsoleLog(functionNode: any): boolean {
    // Check for console.log usage
    return this.traverseAST(functionNode, (node) => {
      if (node.type === 'CallExpression') {
        const callee = node.callee;
        if (callee.type === 'MemberExpression') {
          const object = callee.object.name;
          const property = callee.property.name;

          if (object === 'console' && property === 'log') return true;
        }
      }
      return false;
    });
  }

  private hasComplexLogic(functionNode: any): boolean {
    // Check for complex logic patterns
    return this.traverseAST(functionNode, (node) => {
      if (node.type === 'IfStatement' || node.type === 'SwitchStatement') {
        return true;
      }
      if (node.type === 'ForStatement' || node.type === 'WhileStatement') {
        return true;
      }
      return false;
    });
  }

  private traverseAST(node: any, callback: (node: any) => boolean): boolean {
    if (callback(node)) return true;

    for (const key in node) {
      if (node.hasOwnProperty(key)) {
        const child = node[key];
        if (Array.isArray(child)) {
          for (const item of child) {
            if (typeof item === 'object' && item !== null) {
              if (this.traverseAST(item, callback)) return true;
            }
          }
        } else if (typeof child === 'object' && child !== null) {
          if (this.traverseAST(child, callback)) return true;
        }
      }
    }

    return false;
  }
}
```

### 7. Create Main Export

```typescript
// packages/core/src/index.ts
export * from './types/FileMetrics';
export * from './analysis/statisticalAnalysis';
export * from './classification/fileTypeClassifier';
export * from './scoring/purityScorer';

export { StatisticalAnalyzer } from './analysis/statisticalAnalysis';
export { FileTypeClassifier } from './classification/fileTypeClassifier';
export { PurityScorer } from './scoring/purityScorer';
```

### 8. Create ESLint Plugin

```typescript
// packages/eslint-plugin/src/rules/statisticalFileSize.ts
import { Rule } from 'eslint';

export const statisticalFileSize: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce statistical file size limits based on file type',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          fileTypes: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                patterns: { type: 'array', items: { type: 'string' } },
                expectedSizeRange: { type: 'array', items: { type: 'number' } },
                complexityThreshold: { type: 'number' },
              },
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    return {
      Program(node) {
        const filename = context.getFilename();
        const sourceCode = context.getSourceCode();
        const lines = sourceCode.lines.length;

        // Classify file type
        const fileType = classifyFile(filename);

        // Get expected size range for file type
        const expectedRange = getExpectedSizeRange(fileType);

        if (lines > expectedRange.max) {
          context.report({
            node,
            message: `File "${filename}" has ${lines} lines, exceeding the expected range of ${expectedRange.min}-${expectedRange.max} lines for ${fileType} files.`,
          });
        }
      },
    };
  },
};
```

### 9. Create CLI Tool

```typescript
// packages/cli/src/commands/analyze.ts
import { Command } from 'commander';
import { StatisticalAnalyzer } from '@architectural-discipline/core';

export const analyzeCommand = new Command('analyze')
  .description('Analyze project architecture')
  .option('-d, --dir <directory>', 'Source directory to analyze', 'src')
  .option('-o, --output <file>', 'Output file for results')
  .option('-f, --format <format>', 'Output format (json, html, markdown)', 'json')
  .action(async (options) => {
    console.log('🔍 Analyzing project architecture...');

    const analyzer = new StatisticalAnalyzer();
    const results = await analyzer.analyzeProject(options.dir);

    console.log('📊 Analysis Results:');
    console.log(`Overall Health Score: ${results.projectHealth.overall}/100`);
    console.log(`Outliers Found: ${results.outliers.length}`);
    console.log(`Recommendations: ${results.recommendations.length}`);

    if (options.output) {
      await writeResults(results, options.output, options.format);
    }
  });
```

### 10. Create Project Templates

```bash
# packages/templates/react-typescript/
mkdir -p packages/templates/react-typescript
cd packages/templates/react-typescript

# Create template structure
mkdir -p src/{components,pages,hooks,utils}
mkdir -p tests
mkdir -p .github/workflows

# Create template files
touch package.json
touch tsconfig.json
touch eslint.config.js
touch .husky/pre-commit
touch README.md
```

### 11. Create Documentation

```markdown
# packages/core/README.md

# packages/eslint-plugin/README.md

# packages/cli/README.md

# packages/templates/README.md
```

## 🚀 Implementation Timeline

### Week 1: Core Package

- [ ] Extract core analysis engine
- [ ] Create TypeScript types
- [ ] Add unit tests
- [ ] Create ESLint plugin

### Week 2: CLI & Integration

- [ ] Create CLI tool
- [ ] Add configuration management
- [ ] Create project templates
- [ ] Add documentation

### Week 3: Publishing & Community

- [ ] Publish to npm
- [ ] Create GitHub repositories
- [ ] Set up CI/CD
- [ ] Gather community feedback

## 📊 Success Metrics

- [ ] Core package with 90%+ test coverage
- [ ] ESLint plugin with 5+ rules
- [ ] CLI tool with 4+ commands
- [ ] 3+ project templates
- [ ] Comprehensive documentation
- [ ] Published to npm with 100+ downloads

This implementation plan provides a clear roadmap for extracting our intelligent statistical architecture discipline system into reusable packages that can benefit the entire development community! 🎉
