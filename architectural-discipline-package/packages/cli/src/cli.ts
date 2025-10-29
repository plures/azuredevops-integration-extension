#!/usr/bin/env node
/**
 * @architectural-discipline/cli
 * 
 * Command-line interface for architectural discipline analysis
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { glob } from 'glob';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ArchitecturalAnalyzer, FILE_TYPE_PATTERNS } from '@architectural-discipline/core';
import type { StatisticalAnalysis, FileMetrics } from '@architectural-discipline/core';

const program = new Command();

program
  .name('architectural-discipline')
  .description('Intelligent Architectural Discipline System CLI')
  .version('1.0.0');

/**
 * Analyze command
 */
program
  .command('analyze')
  .description('Analyze project architecture and generate report')
  .option('-p, --path <path>', 'Path to analyze', 'src')
  .option('-o, --output <file>', 'Output file for report')
  .option('-f, --format <format>', 'Output format (json, text)', 'text')
  .option('--ignore <patterns>', 'Ignore patterns (comma-separated)')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔍 Analyzing project architecture...'));
      
      const analyzer = new ArchitecturalAnalyzer();
      const analysis = await performAnalysis(options.path, options.ignore);
      
      if (options.format === 'json') {
        const output = JSON.stringify(analysis, null, 2);
        if (options.output) {
          await fs.writeFile(options.output, output);
          console.log(chalk.green(`✅ Report saved to ${options.output}`));
        } else {
          console.log(output);
        }
      } else {
        printAnalysisReport(analysis);
      }
      
      // Exit with error code if critical issues found
      const criticalOutliers = analysis.outliers.filter(
        (o) => o.lines > o.fileType.expectedSizeRange[1] * 1.5 ||
               o.complexity > o.fileType.complexityThreshold * 2
      );
      
      if (criticalOutliers.length > 0) {
        console.log(chalk.red(`\n❌ ${criticalOutliers.length} critical outliers require immediate attention.`));
        process.exit(1);
      } else {
        console.log(chalk.green('\n✅ Analysis complete!'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Analysis failed:'), error);
      process.exit(1);
    }
  });

/**
 * Recommend command
 */
program
  .command('recommend')
  .description('Generate refactoring recommendations')
  .option('-p, --path <path>', 'Path to analyze', 'src')
  .option('--priority <level>', 'Filter by priority (high, medium, low)')
  .action(async (options) => {
    try {
      console.log(chalk.blue('💡 Generating refactoring recommendations...'));
      
      const analyzer = new ArchitecturalAnalyzer();
      const analysis = await performAnalysis(options.path);
      
      const recommendations = options.priority 
        ? analysis.recommendations.filter(r => r.priority === options.priority)
        : analysis.recommendations;
      
      printRecommendations(recommendations);
    } catch (error) {
      console.error(chalk.red('❌ Recommendation generation failed:'), error);
      process.exit(1);
    }
  });

/**
 * Create command for project templates
 */
program
  .command('create')
  .description('Create a new project with architectural discipline')
  .argument('<name>', 'Project name')
  .option('-t, --template <template>', 'Project template', 'web-app')
  .option('-d, --directory <dir>', 'Target directory')
  .action(async (name, options) => {
    try {
      console.log(chalk.blue(`🚀 Creating ${options.template} project: ${name}`));
      
      const targetDir = options.directory || name;
      await createProject(name, options.template, targetDir);
      
      console.log(chalk.green(`✅ Project created successfully in ${targetDir}`));
      console.log(chalk.yellow('📚 Next steps:'));
      console.log(`   cd ${targetDir}`);
      console.log('   npm install');
      console.log('   npm run dev');
    } catch (error) {
      console.error(chalk.red('❌ Project creation failed:'), error);
      process.exit(1);
    }
  });

/**
 * Perform architectural analysis
 */
async function performAnalysis(srcPath: string, ignorePatterns?: string): Promise<StatisticalAnalysis> {
  const ignore = ignorePatterns ? ignorePatterns.split(',') : [
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
  ];

  const files = await glob(`${srcPath}/**/*.ts`, { ignore });
  const analyzer = new ArchitecturalAnalyzer();
  
  const metrics: FileMetrics[] = [];
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const fileMetrics = analyzer.analyzeFile(file, content);
      metrics.push(fileMetrics);
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Skipping ${file}: ${error}`));
    }
  }
  
  const fileTypeStats = analyzer.calculateStatisticalThresholds(metrics);
  const outliers = analyzer.detectOutliers(metrics, fileTypeStats);
  const recommendations = analyzer.generateRecommendations(outliers);
  const projectHealth = analyzer.calculateProjectHealth(metrics, fileTypeStats);
  
  return {
    fileTypeStats,
    outliers,
    recommendations,
    projectHealth,
  };
}

/**
 * Print analysis report
 */
function printAnalysisReport(analysis: StatisticalAnalysis): void {
  console.log('\n' + chalk.blue('🧠 Intelligent Statistical Architecture Analysis'));
  console.log('='.repeat(60));

  // Project Health Overview
  console.log(`\n📊 Project Health Score: ${analysis.projectHealth.overall}/100`);
  console.log(`   Maintainability: ${analysis.projectHealth.maintainability}/100`);
  console.log(`   Testability: ${analysis.projectHealth.testability}/100`);
  console.log(`   Modularity: ${analysis.projectHealth.modularity}/100`);
  console.log(`   Complexity: ${analysis.projectHealth.complexity}/100`);

  // File Type Statistics
  console.log(`\n📈 File Type Statistics:`);
  analysis.fileTypeStats.forEach((stats, type) => {
    console.log(`   ${type}:`);
    console.log(`     Count: ${stats.count} files`);
    console.log(`     Mean: ${stats.meanLines} lines`);
    console.log(`     Median: ${stats.medianLines} lines`);
    console.log(`     Std Dev: ${stats.standardDeviation} lines`);
    console.log(`     95th Percentile: ${stats.percentile95} lines`);
    console.log(`     Outliers: ${stats.outliers.length} files`);
  });

  // Outliers Analysis
  if (analysis.outliers.length > 0) {
    console.log(`\n⚠️  Statistical Outliers Detected (${analysis.outliers.length} files):`);

    analysis.outliers.forEach((outlier) => {
      console.log(`\n   📁 ${outlier.file}`);
      console.log(`      Type: ${outlier.fileType.category}-${outlier.fileType.subcategory}`);
      console.log(
        `      Lines: ${outlier.lines} (expected: ${outlier.fileType.expectedSizeRange[0]}-${outlier.fileType.expectedSizeRange[1]})`
      );
      console.log(
        `      Complexity: ${outlier.complexity} (threshold: ${outlier.fileType.complexityThreshold})`
      );
      console.log(`      Purity: ${Math.round(outlier.purity)}/100`);
      console.log(`      Functions: ${outlier.functions.length}`);
    });
  } else {
    console.log(`\n✅ No statistical outliers detected! Project follows healthy patterns.`);
  }

  console.log(`\n📚 Development Methodology Guidelines:`);
  console.log(`   1. Keep functions focused and pure when possible`);
  console.log(`   2. Extract modules when files exceed statistical thresholds`);
  console.log(`   3. Use composition over large monolithic structures`);
  console.log(`   4. Apply single responsibility principle`);
  console.log(`   5. Monitor complexity and purity scores`);
}

/**
 * Print recommendations
 */
function printRecommendations(recommendations: any[]): void {
  if (recommendations.length === 0) {
    console.log(chalk.green('✅ No recommendations needed!'));
    return;
  }

  console.log(`\n🔧 Intelligent Refactoring Recommendations (${recommendations.length}):`);

  const highPriority = recommendations.filter((r) => r.priority === 'high');
  const mediumPriority = recommendations.filter((r) => r.priority === 'medium');
  const lowPriority = recommendations.filter((r) => r.priority === 'low');

  if (highPriority.length > 0) {
    console.log(`\n   ${chalk.red('🔴 High Priority')} (${highPriority.length}):`);
    highPriority.forEach((rec) => {
      console.log(`      ${chalk.bold(rec.file)}: ${rec.reason}`);
      console.log(`         Actions: ${rec.suggestedActions.join(', ')}`);
    });
  }

  if (mediumPriority.length > 0) {
    console.log(`\n   ${chalk.yellow('🟡 Medium Priority')} (${mediumPriority.length}):`);
    mediumPriority.forEach((rec) => {
      console.log(`      ${rec.file}: ${rec.reason}`);
    });
  }

  if (lowPriority.length > 0) {
    console.log(`\n   ${chalk.green('🟢 Low Priority')} (${lowPriority.length}):`);
    lowPriority.forEach((rec) => {
      console.log(`      ${rec.file}: ${rec.reason}`);
    });
  }
}

/**
 * Create project from template
 */
async function createProject(name: string, template: string, targetDir: string): Promise<void> {
  // This would integrate with the template system
  console.log(chalk.yellow(`📋 Template: ${template}`));
  console.log(chalk.yellow(`📁 Directory: ${targetDir}`));
  
  // For now, just create a basic structure
  await fs.ensureDir(targetDir);
  
  const packageJson = {
    name,
    version: '1.0.0',
    description: `Project created with architectural discipline (${template} template)`,
    scripts: {
      'check:architecture': 'architectural-discipline analyze',
      'recommend': 'architectural-discipline recommend',
    },
    devDependencies: {
      '@architectural-discipline/eslint-plugin': '^1.0.0',
    },
  };
  
  await fs.writeFile(
    path.join(targetDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  console.log(chalk.green('📦 Created package.json with architectural discipline integration'));
}

// Parse command line arguments
program.parse();
