/**
 * Core types for the Architectural Discipline System
 */

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
  line: number;
  lines: number;
  complexity: number;
  purity: number;
  parameters: number;
  returnType: string;
  sideEffects: string[];
}

export interface FileType {
  category: 'machine' | 'client' | 'handler' | 'utility' | 'integration' | 'test' | 'config';
  subcategory: string;
  expectedSizeRange: [number, number];
  complexityThreshold: number;
}

export interface StatisticalAnalysis {
  fileTypeStats: Map<string, FileTypeStatistics>;
  outliers: FileMetrics[];
  recommendations: RefactoringRecommendation[];
  projectHealth: ProjectHealthScore;
}

export interface FileTypeStatistics {
  count: number;
  meanLines: number;
  medianLines: number;
  standardDeviation: number;
  percentile95: number;
  percentile99: number;
  outliers: number[];
}

export interface RefactoringRecommendation {
  file: string;
  priority: 'high' | 'medium' | 'low';
  type: 'extract-function' | 'extract-module' | 'reduce-complexity' | 'improve-purity';
  reason: string;
  suggestedActions: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
}

export interface ProjectHealthScore {
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
