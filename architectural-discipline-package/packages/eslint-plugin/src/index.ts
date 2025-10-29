/**
 * @architectural-discipline/eslint-plugin
 * 
 * ESLint plugin for architectural discipline rules
 */

import { ESLint } from 'eslint';
import { ArchitecturalAnalyzer, FILE_TYPE_PATTERNS } from '@architectural-discipline/core';
import type { FileMetrics, FileType } from '@architectural-discipline/core';

export interface ArchitecturalRuleOptions {
  maxLines?: number;
  maxLinesPerFunction?: number;
  maxComplexity?: number;
  maxDepth?: number;
  maxStatements?: number;
  fileTypePatterns?: typeof FILE_TYPE_PATTERNS;
  enableStatisticalAnalysis?: boolean;
}

export interface ArchitecturalRuleContext {
  filename: string;
  sourceCode: string;
  options: ArchitecturalRuleOptions;
  analyzer: ArchitecturalAnalyzer;
}

/**
 * ESLint rule for maximum lines per file with statistical analysis
 */
export const maxLinesRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce maximum lines per file with statistical analysis',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          max: {
            type: 'number',
            minimum: 1,
          },
          skipBlankLines: {
            type: 'boolean',
          },
          skipComments: {
            type: 'boolean',
          },
          enableStatisticalAnalysis: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      exceedMaxLines: 'File has {{actual}} lines, maximum allowed is {{max}}',
      statisticalOutlier: 'File exceeds statistical threshold for {{fileType}} files ({{actual}} lines, expected {{expected}})',
    },
  },

  create(context: any) {
    const options = context.options[0] || {};
    const maxLines = options.max || 300;
    const skipBlankLines = options.skipBlankLines !== false;
    const skipComments = options.skipComments !== false;
    const enableStatisticalAnalysis = options.enableStatisticalAnalysis !== false;

    const analyzer = new ArchitecturalAnalyzer();

    return {
      Program(node: any) {
        const sourceCode = context.getSourceCode();
        const lines = sourceCode.lines;
        let lineCount = lines.length;

        // Skip blank lines if configured
        if (skipBlankLines) {
          lineCount = lines.filter((line: string) => line.trim() !== '').length;
        }

        // Skip comments if configured
        if (skipComments) {
          lineCount = lines.filter((line: string) => {
            const trimmed = line.trim();
            return trimmed !== '' && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
          }).length;
        }

        // Check against absolute maximum
        if (lineCount > maxLines) {
          context.report({
            node,
            messageId: 'exceedMaxLines',
            data: {
              actual: lineCount,
              max: maxLines,
            },
          });
        }

        // Statistical analysis if enabled
        if (enableStatisticalAnalysis) {
          try {
            const fileMetrics = analyzer.analyzeFile(context.getFilename(), sourceCode.getText());
            const fileType = fileMetrics.fileType;

            // Check if file exceeds statistical threshold for its type
            if (lineCount > fileType.expectedSizeRange[1]) {
              context.report({
                node,
                messageId: 'statisticalOutlier',
                data: {
                  actual: lineCount,
                  fileType: `${fileType.category}-${fileType.subcategory}`,
                  expected: `${fileType.expectedSizeRange[0]}-${fileType.expectedSizeRange[1]}`,
                },
              });
            }
          } catch (error) {
            // Silently fail statistical analysis to avoid breaking builds
            console.warn('Architectural analysis failed:', error);
          }
        }
      },
    };
  },
};

/**
 * ESLint rule for maximum lines per function
 */
export const maxLinesPerFunctionRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce maximum lines per function',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          max: {
            type: 'number',
            minimum: 1,
          },
          skipBlankLines: {
            type: 'boolean',
          },
          skipComments: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      exceedMaxLines: 'Function has {{actual}} lines, maximum allowed is {{max}}',
    },
  },

  create(context: any) {
    const options = context.options[0] || {};
    const maxLines = options.max || 100;
    const skipBlankLines = options.skipBlankLines !== false;
    const skipComments = options.skipComments !== false;

    return {
      FunctionDeclaration(node: any) {
        checkFunction(node, context, maxLines, skipBlankLines, skipComments);
      },
      FunctionExpression(node: any) {
        checkFunction(node, context, maxLines, skipBlankLines, skipComments);
      },
      ArrowFunctionExpression(node: any) {
        checkFunction(node, context, maxLines, skipBlankLines, skipComments);
      },
    };
  },
};

/**
 * Helper function to check function length
 */
function checkFunction(node: any, context: any, maxLines: number, skipBlankLines: boolean, skipComments: boolean) {
  const sourceCode = context.getSourceCode();
  const lines = sourceCode.getLines();
  
  let lineCount = node.loc.end.line - node.loc.start.line + 1;

  // Skip blank lines if configured
  if (skipBlankLines) {
    const functionLines = lines.slice(node.loc.start.line - 1, node.loc.end.line);
    lineCount = functionLines.filter((line: string) => line.trim() !== '').length;
  }

  // Skip comments if configured
  if (skipComments) {
    const functionLines = lines.slice(node.loc.start.line - 1, node.loc.end.line);
    lineCount = functionLines.filter((line: string) => {
      const trimmed = line.trim();
      return trimmed !== '' && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
    }).length;
  }

  if (lineCount > maxLines) {
    const functionName = node.id?.name || 'anonymous';
    context.report({
      node,
      messageId: 'exceedMaxLines',
      data: {
        actual: lineCount,
        max: maxLines,
      },
    });
  }
}

/**
 * ESLint rule for maximum complexity
 */
export const maxComplexityRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce maximum cyclomatic complexity',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          max: {
            type: 'number',
            minimum: 1,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      exceedMaxComplexity: 'Function has complexity {{actual}}, maximum allowed is {{max}}',
    },
  },

  create(context: any) {
    const options = context.options[0] || {};
    const maxComplexity = options.max || 10;

    return {
      FunctionDeclaration(node: any) {
        checkComplexity(node, context, maxComplexity);
      },
      FunctionExpression(node: any) {
        checkComplexity(node, context, maxComplexity);
      },
      ArrowFunctionExpression(node: any) {
        checkComplexity(node, context, maxComplexity);
      },
    };
  },
};

/**
 * Helper function to check complexity
 */
function checkComplexity(node: any, context: any, maxComplexity: number) {
  const sourceCode = context.getSourceCode();
  const text = sourceCode.getText(node);
  
  const complexityKeywords = [
    'if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||', '?', ':'
  ];

  let complexity = 1; // Base complexity

  for (const keyword of complexityKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    const matches = text.match(regex);
    if (matches) {
      complexity += matches.length;
    }
  }

  if (complexity > maxComplexity) {
    context.report({
      node,
      messageId: 'exceedMaxComplexity',
      data: {
        actual: complexity,
        max: maxComplexity,
      },
    });
  }
}

/**
 * Main plugin export
 */
export default {
  rules: {
    'max-lines': maxLinesRule,
    'max-lines-per-function': maxLinesPerFunctionRule,
    'max-complexity': maxComplexityRule,
  },
  configs: {
    recommended: {
      plugins: ['@architectural-discipline'],
      rules: {
        '@architectural-discipline/max-lines': ['error', { max: 300, enableStatisticalAnalysis: true }],
        '@architectural-discipline/max-lines-per-function': ['error', { max: 100 }],
        '@architectural-discipline/max-complexity': ['warn', { max: 10 }],
      },
    },
    strict: {
      plugins: ['@architectural-discipline'],
      rules: {
        '@architectural-discipline/max-lines': ['error', { max: 200, enableStatisticalAnalysis: true }],
        '@architectural-discipline/max-lines-per-function': ['error', { max: 50 }],
        '@architectural-discipline/max-complexity': ['error', { max: 8 }],
      },
    },
  },
};
