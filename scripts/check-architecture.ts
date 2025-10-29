#!/usr/bin/env tsx
/**
 * Architecture Discipline Compliance Checker
 *
 * This script enforces our foundation architecture discipline rules:
 * - Files must be < 300 lines
 * - Functions must be < 100 lines
 * - No excessive complexity
 * - Clear module boundaries
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface FileMetrics {
  file: string;
  lines: number;
  functions: Array<{
    name: string;
    line: number;
    lines: number;
  }>;
  violations: string[];
}

interface ArchitectureReport {
  totalFiles: number;
  compliantFiles: number;
  violations: FileMetrics[];
  summary: {
    oversizedFiles: number;
    oversizedFunctions: number;
    complexityViolations: number;
  };
}

const MAX_FILE_LINES = 300;
const MAX_FUNCTION_LINES = 100;
const MAX_COMPLEXITY = 10;

/**
 * Parse TypeScript file and extract metrics
 */
function analyzeFile(filePath: string): FileMetrics {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const metrics: FileMetrics = {
    file: filePath,
    lines: lines.length,
    functions: [],
    violations: [],
  };

  // Check file size
  if (metrics.lines > MAX_FILE_LINES) {
    metrics.violations.push(`File exceeds ${MAX_FILE_LINES} lines (${metrics.lines} lines)`);
  }

  // Extract function information
  let inFunction = false;
  let functionStart = 0;
  let functionName = '';
  let braceCount = 0;
  let functionLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect function start
    if (
      !inFunction &&
      (trimmed.match(/^(export\s+)?(async\s+)?function\s+\w+/) ||
        trimmed.match(/^(export\s+)?(async\s+)?\w+\s*\([^)]*\)\s*[:=]\s*(async\s+)?\(/) ||
        trimmed.match(/^(export\s+)?(async\s+)?\w+\s*\([^)]*\)\s*[:=]\s*async\s+function/))
    ) {
      inFunction = true;
      functionStart = i;
      functionName = extractFunctionName(trimmed);
      functionLine = i + 1;
      braceCount = 0;
    }

    if (inFunction) {
      // Count braces to detect function end
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;

      // Function ended
      if (braceCount === 0 && trimmed.includes('}')) {
        const functionLines = i - functionStart + 1;

        metrics.functions.push({
          name: functionName,
          line: functionLine,
          lines: functionLines,
        });

        // Check function size
        if (functionLines > MAX_FUNCTION_LINES) {
          metrics.violations.push(
            `Function '${functionName}' exceeds ${MAX_FUNCTION_LINES} lines (${functionLines} lines) at line ${functionLine}`
          );
        }

        inFunction = false;
      }
    }
  }

  return metrics;
}

/**
 * Extract function name from function declaration
 */
function extractFunctionName(line: string): string {
  // Match various function patterns
  const patterns = [
    /function\s+(\w+)/,
    /(\w+)\s*\([^)]*\)\s*[:=]/,
    /(\w+)\s*\([^)]*\)\s*[:=]\s*async\s+function/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return 'anonymous';
}

/**
 * Generate architecture compliance report
 */
async function generateReport(): Promise<ArchitectureReport> {
  const srcFiles = await glob('src/**/*.ts', {
    ignore: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
      'src/architecture/**', // Ignore architecture docs
      'src/webview/ContextDrivenDemo.svelte',
      'src/webview/ContextDrivenWorkItems.svelte',
      'src/webview/ContextDrivenDemo.ts',
      'src/webview/ContextIntegration.ts',
      'src/webview/ReactiveApp*.svelte',
      'src/webview/ReactiveDemo.svelte',
      'src/webview/reactive-main*.ts',
      'src/webview/context-demo-main.ts',
    ],
  });

  const metrics = srcFiles.map(analyzeFile);
  const violations = metrics.filter((m) => m.violations.length > 0);

  const report: ArchitectureReport = {
    totalFiles: metrics.length,
    compliantFiles: metrics.length - violations.length,
    violations,
    summary: {
      oversizedFiles: violations.filter((v) => v.lines > MAX_FILE_LINES).length,
      oversizedFunctions: violations.reduce(
        (sum, v) => sum + v.functions.filter((f) => f.lines > MAX_FUNCTION_LINES).length,
        0
      ),
      complexityViolations: 0, // TODO: Implement complexity analysis
    },
  };

  return report;
}

/**
 * Print formatted report
 */
function printReport(report: ArchitectureReport): void {
  console.log('\n🏗️  Architecture Discipline Compliance Report');
  console.log('='.repeat(50));

  console.log(`\n📊 Summary:`);
  console.log(`   Total Files: ${report.totalFiles}`);
  console.log(`   Compliant Files: ${report.compliantFiles}`);
  console.log(`   Violations: ${report.violations.length}`);

  console.log(`\n📈 Metrics:`);
  console.log(`   Oversized Files (>${MAX_FILE_LINES} lines): ${report.summary.oversizedFiles}`);
  console.log(
    `   Oversized Functions (>${MAX_FUNCTION_LINES} lines): ${report.summary.oversizedFunctions}`
  );
  console.log(`   Complexity Violations: ${report.summary.complexityViolations}`);

  if (report.violations.length > 0) {
    console.log(`\n❌ Violations Found:`);

    report.violations.forEach((violation) => {
      console.log(`\n   📁 ${violation.file} (${violation.lines} lines)`);
      violation.violations.forEach((v) => {
        console.log(`      ⚠️  ${v}`);
      });
    });

    console.log(`\n🔧 Recommended Actions:`);
    console.log(`   1. Extract large functions into separate modules`);
    console.log(`   2. Split large files into focused modules`);
    console.log(`   3. Apply single responsibility principle`);
    console.log(`   4. Use composition over inheritance`);

    console.log(`\n📚 See docs/architecture/FOUNDATION_PROGRESS.md for extraction guidelines`);
  } else {
    console.log(`\n✅ All files comply with architecture discipline!`);
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const report = await generateReport();
    printReport(report);

    // Exit with error code if violations found
    if (report.violations.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error checking architecture compliance:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { generateReport, analyzeFile, ArchitectureReport };
