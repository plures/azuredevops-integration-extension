#!/usr/bin/env tsx
/**
 * Intelligent Statistical Architecture Discipline System
 * 
 * This system uses statistical analysis to maintain code quality without arbitrary limits:
 * - Adaptive thresholds based on project growth
 * - Outlier detection for problematic files
 * - File type classification for appropriate comparisons
 * - Function purity scoring
 * - Intelligent refactoring suggestions
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// Statistical Analysis Types
interface FileMetrics {
  file: string;
  fileType: FileType;
  lines: number;
  functions: FunctionMetrics[];
  complexity: number;
  purity: number;
  dependencies: string[];
  responsibilities: string[];
}

interface FunctionMetrics {
  name: string;
  line: number;
  lines: number;
  complexity: number;
  purity: number;
  parameters: number;
  returnType: string;
  sideEffects: string[];
}

interface FileType {
  category: 'machine' | 'client' | 'handler' | 'utility' | 'integration' | 'test' | 'config';
  subcategory: string;
  expectedSizeRange: [number, number];
  complexityThreshold: number;
}

interface StatisticalAnalysis {
  fileTypeStats: Map<string, FileTypeStatistics>;
  outliers: FileMetrics[];
  recommendations: RefactoringRecommendation[];
  projectHealth: ProjectHealthScore;
}

interface FileTypeStatistics {
  count: number;
  meanLines: number;
  medianLines: number;
  standardDeviation: number;
  percentile95: number;
  percentile99: number;
  outliers: number[];
}

interface RefactoringRecommendation {
  file: string;
  priority: 'high' | 'medium' | 'low';
  type: 'extract-function' | 'extract-module' | 'reduce-complexity' | 'improve-purity';
  reason: string;
  suggestedActions: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
}

interface ProjectHealthScore {
  overall: number; // 0-100
  maintainability: number;
  testability: number;
  modularity: number;
  complexity: number;
  trends: {
    fileSizeGrowth: number;
    complexityTrend: number;
    purityTrend: number;
  };
}

// File Type Classification System
const FILE_TYPE_PATTERNS = {
  machine: {
    patterns: ['**/machines/**', '**/*Machine.ts', '**/*machine.ts'],
    expectedSizeRange: [50, 200] as [number, number],
    complexityThreshold: 8
  },
  client: {
    patterns: ['**/client.ts', '**/Client.ts', '**/*Client.ts'],
    expectedSizeRange: [100, 400] as [number, number],
    complexityThreshold: 12
  },
  handler: {
    patterns: ['**/handler.ts', '**/Handler.ts', '**/*Handler.ts'],
    expectedSizeRange: [80, 300] as [number, number],
    complexityThreshold: 10
  },
  utility: {
    patterns: ['**/utils/**', '**/util/**', '**/*Utils.ts', '**/*util.ts'],
    expectedSizeRange: [30, 150] as [number, number],
    complexityThreshold: 6
  },
  integration: {
    patterns: ['**/integration.ts', '**/bridge/**', '**/adapter/**'],
    expectedSizeRange: [60, 250] as [number, number],
    complexityThreshold: 9
  },
  test: {
    patterns: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**'],
    expectedSizeRange: [20, 200] as [number, number],
    complexityThreshold: 5
  },
  config: {
    patterns: ['**/config.ts', '**/Config.ts', '**/settings/**'],
    expectedSizeRange: [20, 100] as [number, number],
    complexityThreshold: 4
  }
};

/**
 * Classify file type based on path and content analysis
 */
function classifyFileType(filePath: string, content: string): FileType {
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);
  
  // Check patterns for each type
  for (const [category, config] of Object.entries(FILE_TYPE_PATTERNS)) {
    for (const pattern of config.patterns) {
      // Convert glob pattern to simple string matching
      const cleanPattern = pattern.replace('**/', '').replace('/**', '').replace('*', '');
      if (filePath.includes(cleanPattern) || fileName.includes(cleanPattern)) {
        return {
          category: category as any,
          subcategory: fileName,
          expectedSizeRange: config.expectedSizeRange,
          complexityThreshold: config.complexityThreshold
        };
      }
    }
  }
  
  // Default classification based on content analysis
  if (content.includes('createMachine') || content.includes('fromPromise')) {
    return {
      category: 'machine',
      subcategory: 'fsm',
      expectedSizeRange: [50, 200],
      complexityThreshold: 8
    };
  }
  
  if (content.includes('class') && content.includes('constructor')) {
    return {
      category: 'client',
      subcategory: 'service',
      expectedSizeRange: [100, 400],
      complexityThreshold: 12
    };
  }
  
  return {
    category: 'utility',
    subcategory: 'general',
    expectedSizeRange: [30, 150],
    complexityThreshold: 6
  };
}

/**
 * Calculate function purity score (0-100)
 * Higher score = more pure function
 */
function calculateFunctionPurity(func: FunctionMetrics, content: string): number {
  let purityScore = 100;
  
  // Deduct points for side effects
  purityScore -= func.sideEffects.length * 10;
  
  // Deduct points for high parameter count
  if (func.parameters > 5) {
    purityScore -= (func.parameters - 5) * 5;
  }
  
  // Deduct points for high complexity
  if (func.complexity > 5) {
    purityScore -= (func.complexity - 5) * 8;
  }
  
  // Check for pure function indicators
  if (content.includes('return') && !content.includes('console.log')) {
    purityScore += 5;
  }
  
  if (!content.includes('this.') && !content.includes('global')) {
    purityScore += 5;
  }
  
  return Math.max(0, Math.min(100, purityScore));
}

/**
 * Calculate cyclomatic complexity
 */
function calculateComplexity(content: string): number {
  const complexityKeywords = [
    'if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||', '\\?', ':'
  ];
  
  let complexity = 1; // Base complexity
  
  for (const keyword of complexityKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    const matches = content.match(regex);
    if (matches) {
      complexity += matches.length;
    }
  }
  
  return complexity;
}

/**
 * Analyze file and extract comprehensive metrics
 */
function analyzeFile(filePath: string): FileMetrics {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const fileType = classifyFileType(filePath, content);
  
  const metrics: FileMetrics = {
    file: filePath,
    fileType,
    lines: lines.length,
    functions: [],
    complexity: calculateComplexity(content),
    purity: 0,
    dependencies: extractDependencies(content),
    responsibilities: extractResponsibilities(content)
  };

  // Extract function information with enhanced analysis
  const functions = extractFunctions(content);
  metrics.functions = functions.map(func => {
    const sideEffects = extractSideEffects(func.content);
    const parameters = countParameters(func.signature);
    const complexity = calculateComplexity(func.content);
    
    const funcMetrics: FunctionMetrics = {
      name: func.name,
      line: func.line,
      lines: func.lines,
      complexity,
      purity: 0,
      parameters,
      returnType: extractReturnType(func.signature),
      sideEffects
    };
    
    funcMetrics.purity = calculateFunctionPurity(funcMetrics, func.content);
    return funcMetrics;
  });

  // Calculate overall file purity
  if (metrics.functions.length > 0) {
    metrics.purity = metrics.functions.reduce((sum, f) => sum + f.purity, 0) / metrics.functions.length;
  }

  return metrics;
}

/**
 * Extract function information from TypeScript content
 */
function extractFunctions(content: string): Array<{
  name: string;
  line: number;
  lines: number;
  content: string;
  signature: string;
}> {
  const functions: Array<{
    name: string;
    line: number;
    lines: number;
    content: string;
    signature: string;
  }> = [];

  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    // Detect function start
    if (line.match(/^(export\s+)?(async\s+)?function\s+\w+/) ||
        line.match(/^(export\s+)?(async\s+)?\w+\s*\([^)]*\)\s*[:=]/)) {
      
      const startLine = i;
      const signature = line.trim();
      const name = extractFunctionName(signature);
      
      // Find function end by counting braces
      let braceCount = 0;
      let endLine = i;
      
      for (let j = i; j < lines.length; j++) {
        const currentLine = lines[j];
        braceCount += (currentLine.match(/\{/g) || []).length;
        braceCount -= (currentLine.match(/\}/g) || []).length;
        
        if (braceCount === 0 && currentLine.includes('}')) {
          endLine = j;
          break;
        }
      }
      
      const functionContent = lines.slice(startLine, endLine + 1).join('\n');
      
      functions.push({
        name,
        line: startLine + 1,
        lines: endLine - startLine + 1,
        content: functionContent,
        signature
      });
      
      i = endLine + 1;
    } else {
      i++;
    }
  }

  return functions;
}

/**
 * Extract function name from signature
 */
function extractFunctionName(signature: string): string {
  const patterns = [
    /function\s+(\w+)/,
    /(\w+)\s*\([^)]*\)\s*[:=]/,
    /(\w+)\s*\([^)]*\)\s*[:=]\s*async\s+function/
  ];

  for (const pattern of patterns) {
    const match = signature.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return 'anonymous';
}

/**
 * Count function parameters
 */
function countParameters(signature: string): number {
  const paramMatch = signature.match(/\(([^)]*)\)/);
  if (!paramMatch) return 0;
  
  const params = paramMatch[1].split(',').filter(p => p.trim());
  return params.length;
}

/**
 * Extract return type from signature
 */
function extractReturnType(signature: string): string {
  const returnMatch = signature.match(/\)\s*:\s*(\w+)/);
  return returnMatch ? returnMatch[1] : 'any';
}

/**
 * Extract side effects from function content
 */
function extractSideEffects(content: string): string[] {
  const sideEffects: string[] = [];
  
  if (content.includes('console.log')) sideEffects.push('logging');
  if (content.includes('this.')) sideEffects.push('state-mutation');
  if (content.includes('global')) sideEffects.push('global-access');
  if (content.includes('process.')) sideEffects.push('process-access');
  if (content.includes('fs.')) sideEffects.push('file-system');
  if (content.includes('fetch(') || content.includes('axios.')) sideEffects.push('network');
  
  return sideEffects;
}

/**
 * Extract dependencies from file content
 */
function extractDependencies(content: string): string[] {
  const imports: string[] = [];
  const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

/**
 * Extract responsibilities from file content
 */
function extractResponsibilities(content: string): string[] {
  const responsibilities: string[] = [];
  
  if (content.includes('createMachine')) responsibilities.push('state-management');
  if (content.includes('class')) responsibilities.push('object-oriented');
  if (content.includes('async')) responsibilities.push('asynchronous');
  if (content.includes('export')) responsibilities.push('module-export');
  if (content.includes('test') || content.includes('expect')) responsibilities.push('testing');
  
  return responsibilities;
}

/**
 * Calculate statistical thresholds for file types
 */
function calculateStatisticalThresholds(metrics: FileMetrics[]): Map<string, FileTypeStatistics> {
  const typeGroups = new Map<string, FileMetrics[]>();
  
  // Group files by type
  metrics.forEach(metric => {
    const key = `${metric.fileType.category}-${metric.fileType.subcategory}`;
    if (!typeGroups.has(key)) {
      typeGroups.set(key, []);
    }
    typeGroups.get(key)!.push(metric);
  });
  
  const stats = new Map<string, FileTypeStatistics>();
  
  typeGroups.forEach((files, type) => {
    const lines = files.map(f => f.lines).sort((a, b) => a - b);
    
    const mean = lines.reduce((sum, line) => sum + line, 0) / lines.length;
    const median = lines[Math.floor(lines.length / 2)];
    
    // Calculate standard deviation
    const variance = lines.reduce((sum, line) => sum + Math.pow(line - mean, 2), 0) / lines.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Calculate percentiles
    const percentile95 = lines[Math.floor(lines.length * 0.95)];
    const percentile99 = lines[Math.floor(lines.length * 0.99)];
    
    // Identify outliers (beyond 2 standard deviations)
    const outliers = lines.filter(line => Math.abs(line - mean) > 2 * standardDeviation);
    
    stats.set(type, {
      count: files.length,
      meanLines: Math.round(mean),
      medianLines: median,
      standardDeviation: Math.round(standardDeviation),
      percentile95,
      percentile99,
      outliers: outliers
    });
  });
  
  return stats;
}

/**
 * Detect outliers using statistical methods
 */
function detectOutliers(metrics: FileMetrics[], stats: Map<string, FileTypeStatistics>): FileMetrics[] {
  const outliers: FileMetrics[] = [];
  
  metrics.forEach(metric => {
    const key = `${metric.fileType.category}-${metric.fileType.subcategory}`;
    const typeStats = stats.get(key);
    
    if (!typeStats) return;
    
    // Check if file is an outlier (beyond 95th percentile or 2 standard deviations)
    const isSizeOutlier = metric.lines > typeStats.percentile95 || 
                         Math.abs(metric.lines - typeStats.meanLines) > 2 * typeStats.standardDeviation;
    
    // Check complexity outliers
    const isComplexityOutlier = metric.complexity > metric.fileType.complexityThreshold * 1.5;
    
    // Check purity outliers
    const isPurityOutlier = metric.purity < 50; // Low purity score
    
    if (isSizeOutlier || isComplexityOutlier || isPurityOutlier) {
      outliers.push(metric);
    }
  });
  
  return outliers;
}

/**
 * Generate intelligent refactoring recommendations
 */
function generateRecommendations(outliers: FileMetrics[]): RefactoringRecommendation[] {
  const recommendations: RefactoringRecommendation[] = [];
  
  outliers.forEach(metric => {
    // Size-based recommendations
    if (metric.lines > metric.fileType.expectedSizeRange[1]) {
      recommendations.push({
        file: metric.file,
        priority: 'high',
        type: 'extract-module',
        reason: `File exceeds expected size range for ${metric.fileType.category} files`,
        suggestedActions: [
          'Extract related functions into separate modules',
          'Apply single responsibility principle',
          'Create focused, cohesive modules'
        ],
        estimatedEffort: 'medium'
      });
    }
    
    // Function-based recommendations
    const largeFunctions = metric.functions.filter(f => f.lines > 50);
    if (largeFunctions.length > 0) {
      recommendations.push({
        file: metric.file,
        priority: 'medium',
        type: 'extract-function',
        reason: `${largeFunctions.length} functions exceed recommended size`,
        suggestedActions: [
          'Break down large functions into smaller, focused functions',
          'Extract complex logic into utility functions',
          'Use composition over large monolithic functions'
        ],
        estimatedEffort: 'low'
      });
    }
    
    // Complexity-based recommendations
    if (metric.complexity > metric.fileType.complexityThreshold) {
      recommendations.push({
        file: metric.file,
        priority: 'high',
        type: 'reduce-complexity',
        reason: `Cyclomatic complexity exceeds threshold for ${metric.fileType.category} files`,
        suggestedActions: [
          'Simplify conditional logic',
          'Extract complex conditions into named functions',
          'Use early returns to reduce nesting'
        ],
        estimatedEffort: 'medium'
      });
    }
    
    // Purity-based recommendations
    if (metric.purity < 60) {
      recommendations.push({
        file: metric.file,
        priority: 'low',
        type: 'improve-purity',
        reason: 'Low function purity score indicates many side effects',
        suggestedActions: [
          'Reduce side effects in functions',
          'Separate pure logic from side effects',
          'Use functional programming patterns'
        ],
        estimatedEffort: 'high'
      });
    }
  });
  
  return recommendations;
}

/**
 * Calculate overall project health score
 */
function calculateProjectHealth(metrics: FileMetrics[], stats: Map<string, FileTypeStatistics>): ProjectHealthScore {
  const totalFiles = metrics.length;
  const avgLines = metrics.reduce((sum, m) => sum + m.lines, 0) / totalFiles;
  const avgComplexity = metrics.reduce((sum, m) => sum + m.complexity, 0) / totalFiles;
  const avgPurity = metrics.reduce((sum, m) => sum + m.purity, 0) / totalFiles;
  
  // Calculate maintainability score (0-100)
  const maintainability = Math.max(0, 100 - (avgLines / 10) - (avgComplexity * 5));
  
  // Calculate testability score (0-100)
  const testability = Math.max(0, avgPurity - 20);
  
  // Calculate modularity score (0-100)
  const avgFunctionsPerFile = metrics.reduce((sum, m) => sum + m.functions.length, 0) / totalFiles;
  const modularity = Math.max(0, 100 - (avgFunctionsPerFile * 2));
  
  // Calculate complexity score (0-100)
  const complexity = Math.max(0, 100 - (avgComplexity * 8));
  
  // Overall health score
  const overall = (maintainability + testability + modularity + complexity) / 4;
  
  return {
    overall: Math.round(overall),
    maintainability: Math.round(maintainability),
    testability: Math.round(testability),
    modularity: Math.round(modularity),
    complexity: Math.round(complexity),
    trends: {
      fileSizeGrowth: 0, // TODO: Implement trend analysis
      complexityTrend: 0,
      purityTrend: 0
    }
  };
}

/**
 * Main analysis function
 */
async function performStatisticalAnalysis(): Promise<StatisticalAnalysis> {
  const srcFiles = await glob('src/**/*.ts', { 
    ignore: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
      'src/architecture/**',
      'src/webview/ContextDrivenDemo.svelte',
      'src/webview/ContextDrivenWorkItems.svelte',
      'src/webview/ContextDrivenDemo.ts',
      'src/webview/ContextIntegration.ts',
      'src/webview/ReactiveApp*.svelte',
      'src/webview/ReactiveDemo.svelte',
      'src/webview/reactive-main*.ts',
      'src/webview/context-demo-main.ts',
      'src/fsm/xstate-svelte/node_modules/**', // Exclude node_modules
      '**/node_modules/**' // Exclude all node_modules
    ]
  });

  const metrics = srcFiles.map(analyzeFile);
  const fileTypeStats = calculateStatisticalThresholds(metrics);
  const outliers = detectOutliers(metrics, fileTypeStats);
  const recommendations = generateRecommendations(outliers);
  const projectHealth = calculateProjectHealth(metrics, fileTypeStats);

  return {
    fileTypeStats,
    outliers,
    recommendations,
    projectHealth
  };
}

/**
 * Print comprehensive analysis report
 */
function printAnalysisReport(analysis: StatisticalAnalysis): void {
  console.log('\n🧠 Intelligent Statistical Architecture Analysis');
  console.log('=' .repeat(60));
  
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
    
    analysis.outliers.forEach(outlier => {
      console.log(`\n   📁 ${outlier.file}`);
      console.log(`      Type: ${outlier.fileType.category}-${outlier.fileType.subcategory}`);
      console.log(`      Lines: ${outlier.lines} (expected: ${outlier.fileType.expectedSizeRange[0]}-${outlier.fileType.expectedSizeRange[1]})`);
      console.log(`      Complexity: ${outlier.complexity} (threshold: ${outlier.fileType.complexityThreshold})`);
      console.log(`      Purity: ${Math.round(outlier.purity)}/100`);
      console.log(`      Functions: ${outlier.functions.length}`);
    });
  }
  
  // Recommendations
  if (analysis.recommendations.length > 0) {
    console.log(`\n🔧 Intelligent Refactoring Recommendations:`);
    
    const highPriority = analysis.recommendations.filter(r => r.priority === 'high');
    const mediumPriority = analysis.recommendations.filter(r => r.priority === 'medium');
    const lowPriority = analysis.recommendations.filter(r => r.priority === 'low');
    
    if (highPriority.length > 0) {
      console.log(`\n   🔴 High Priority (${highPriority.length}):`);
      highPriority.forEach(rec => {
        console.log(`      ${rec.file}: ${rec.reason}`);
        console.log(`         Actions: ${rec.suggestedActions.join(', ')}`);
      });
    }
    
    if (mediumPriority.length > 0) {
      console.log(`\n   🟡 Medium Priority (${mediumPriority.length}):`);
      mediumPriority.forEach(rec => {
        console.log(`      ${rec.file}: ${rec.reason}`);
      });
    }
    
    if (lowPriority.length > 0) {
      console.log(`\n   🟢 Low Priority (${lowPriority.length}):`);
      lowPriority.forEach(rec => {
        console.log(`      ${rec.file}: ${rec.reason}`);
      });
    }
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
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const analysis = await performStatisticalAnalysis();
    printAnalysisReport(analysis);
    
    // Exit with error code if critical outliers found
    const criticalOutliers = analysis.outliers.filter(o => 
      o.lines > o.fileType.expectedSizeRange[1] * 1.5 || 
      o.complexity > o.fileType.complexityThreshold * 2
    );
    
    if (criticalOutliers.length > 0) {
      console.log(`\n❌ ${criticalOutliers.length} critical outliers require immediate attention.`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error performing statistical analysis:', error);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('intelligent-architecture-analysis.ts')) {
  main();
}

export { 
  performStatisticalAnalysis, 
  analyzeFile, 
  StatisticalAnalysis, 
  FileMetrics, 
  ProjectHealthScore 
};
