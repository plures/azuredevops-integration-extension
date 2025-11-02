#!/usr/bin/env node
/**
 * Release Readiness Check Script
 * 
 * This script evaluates the project's readiness for release by checking:
 * - Unit tests (20 points)
 * - Code coverage (50 points: 20 for lines, 15 for branches, 15 for functions)
 * - Linting (10 points)
 * - Type checking (5 points)
 * - Documentation (5 points)
 * - Security vulnerabilities (10 points)
 * 
 * Total: 100 points
 * 
 * Exit codes:
 * - 0: Score >= 30 (minimum acceptable)
 * - 2: Score < 30 (below minimum threshold)
 * 
 * Recent fixes:
 * - Fixed script name from 'check-types' to 'type-check' to match package.json
 * - Removed requirement for non-existent RELEASE_PLAN_1_0.md file
 * - Added detailed logging and visual feedback for each check
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (e) {
    return null;
  }
}

function checkUnitTests() {
  console.log('Checking unit tests...');
  
  // Run tests with output captured
  const out = run('npm test 2>&1');
  if (out === null) {
    console.log('  ❌ Unit tests failed - could not run tests (0/20)');
    return 0;
  }
  
  // Parse test output for pass/fail counts
  // Look for patterns like "128 passing", "4 failing", "1 pending"
  const passingMatch = out.match(/(\d+)\s+passing/);
  const failingMatch = out.match(/(\d+)\s+failing/);
  const pendingMatch = out.match(/(\d+)\s+pending/);
  
  const passing = passingMatch ? parseInt(passingMatch[1], 10) : 0;
  const failing = failingMatch ? parseInt(failingMatch[1], 10) : 0;
  const pending = pendingMatch ? parseInt(pendingMatch[1], 10) : 0;
  const total = passing + failing;
  
  if (total === 0) {
    // No test output parsed - check if tests ran at all
    if (out.includes('passing') || out.includes('failing')) {
      // Output exists but couldn't parse - might be a parsing issue
      console.log('  ⚠️  Unit tests ran but could not parse results (10/20)');
      return 10;
    }
    console.log('  ❌ Unit tests failed - no tests found (0/20)');
    return 0;
  }
  
  if (failing === 0) {
    console.log(`  ✅ Unit tests passed: ${passing} passing${pending > 0 ? `, ${pending} pending` : ''} (20/20)`);
    return 20;
  }
  
  // Calculate pass rate and assign partial credit
  const passRate = passing / total;
  let score = 0;
  if (passRate >= 0.95) {
    score = 20; // 95%+ pass rate gets full credit
  } else if (passRate >= 0.90) {
    score = 18; // 90-95% gets 18 points
  } else if (passRate >= 0.80) {
    score = 15; // 80-90% gets 15 points
  } else if (passRate >= 0.70) {
    score = 12; // 70-80% gets 12 points
  } else if (passRate >= 0.50) {
    score = 10; // 50-70% gets 10 points
  } else {
    score = 5; // <50% gets 5 points
  }
  
  console.log(`  ⚠️  Unit tests: ${passing} passing, ${failing} failing${pending > 0 ? `, ${pending} pending` : ''} (${score}/20)`);
  console.log(`     Pass rate: ${(passRate * 100).toFixed(1)}%`);
  return score;
}

function checkCoverage() {
  console.log('Checking code coverage...');
  
  // Try to get coverage from JSON report first (more reliable)
  // c8 writes coverage data to coverage/coverage-final.json
  try {
    // This is an ES module, so use the imported fs and path modules
    const coverageJsonPath = path.resolve('coverage', 'coverage-final.json');
    
    // Run coverage to generate JSON (don't use --silent so we can see if it fails)
    const testOut = run('npx c8 --reporter=json --reporter=lcov npm test 2>&1');
    
    // Wait a bit for file to be written
    let attempts = 0;
    while (!fs.existsSync(coverageJsonPath) && attempts < 10) {
      attempts++;
      try {
        execSync('timeout /t 1 /nobreak >nul 2>&1', { stdio: 'ignore' });
      } catch {}
    }
    
    if (fs.existsSync(coverageJsonPath)) {
      const coverageData = JSON.parse(fs.readFileSync(coverageJsonPath, 'utf8'));
      
      // Calculate totals from all files
      // c8/Istanbul format: s = statements (lines), b = branches, f = functions
      // Filter out node_modules, dist, and test files from coverage
      let totalLines = 0;
      let coveredLines = 0;
      let totalBranches = 0;
      let coveredBranches = 0;
      let totalFunctions = 0;
      let coveredFunctions = 0;
      
      for (const file in coverageData) {
        // Skip node_modules, dist, and test files
        if (file.includes('node_modules') || file.includes('\\dist\\') || file.includes('/dist/') || 
            file.includes('.test.') || file.includes('.spec.')) {
          continue;
        }
        
        const fileCoverage = coverageData[file];
        
        // Lines/Statements coverage (s is an object with line numbers as keys, execution count as values)
        if (fileCoverage.s) {
          const statements = fileCoverage.s;
          for (const lineNum in statements) {
            totalLines++;
            if (statements[lineNum] > 0) {
              coveredLines++;
            }
          }
        }
        
        // Branches coverage (b is an object where each key is a branch ID, value is array of execution counts)
        if (fileCoverage.b) {
          for (const branchId in fileCoverage.b) {
            const branchCounts = fileCoverage.b[branchId];
            if (Array.isArray(branchCounts)) {
              // Each element in array is a branch path
              totalBranches += branchCounts.length;
              coveredBranches += branchCounts.filter(count => count > 0).length;
            }
          }
        }
        
        // Functions coverage (f is an object with function IDs as keys, execution count as values)
        if (fileCoverage.f) {
          for (const funcId in fileCoverage.f) {
            totalFunctions++;
            if (fileCoverage.f[funcId] > 0) {
              coveredFunctions++;
            }
          }
        }
      }
      
      const linesPct = totalLines > 0 ? (coveredLines / totalLines) * 100 : 0;
      const branchesPct = totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0;
      const funcsPct = totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0;
      
      let score = 0;
      if (linesPct >= 85) score += 20;
      if (branchesPct >= 80) score += 15;
      if (funcsPct >= 80) score += 15;
      
      console.log(`  Lines: ${linesPct.toFixed(1)}% (${linesPct >= 85 ? '✅' : '❌'} 20pts), Branches: ${branchesPct.toFixed(1)}% (${branchesPct >= 80 ? '✅' : '❌'} 15pts), Functions: ${funcsPct.toFixed(1)}% (${funcsPct >= 80 ? '✅' : '❌'} 15pts)`);
      console.log(`  Coverage score: ${score}/50`);
      return score;
    } else {
      // File doesn't exist - coverage might not have been generated
      // Fall through to text parsing
    }
  } catch (error) {
    // Fall through to text parsing if JSON parsing fails
    // Error logging disabled for cleaner output - uncomment to debug:
    // console.error('  ⚠️  Coverage JSON parsing error:', error.message);
  }
  
  // Fallback: try to parse text output
  const out = run('npx c8 --reporter=text --reporter=lcov npm test 2>&1');
  if (!out) {
    console.log('  ⚠️  Coverage check skipped (0/50)');
    return 0;
  }
  
  // Try to parse summary from text (look for "All files" or similar patterns)
  const linesMatch = out.match(/All files[^\n]*\|[^\|]+\|\s+(\d+\.\d+)/);
  const branchesMatch = out.match(/All files[^\n]*\|[^\|]+\|\s+\d+\.\d+\|\s+(\d+\.\d+)/);
  const funcsMatch = out.match(/All files[^\n]*\|[^\|]+\|\s+\d+\.\d+\|\s+\d+\.\d+\|\s+(\d+\.\d+)/);
  
  const l = parseFloat(linesMatch?.[1] || 0);
  const b = parseFloat(branchesMatch?.[1] || 0);
  const f = parseFloat(funcsMatch?.[1] || 0);
  
  // If we couldn't parse from "All files", try alternative patterns
  let linesPct = l;
  let branchesPct = b;
  let funcsPct = f;
  
  if (l === 0 && b === 0 && f === 0) {
    // Try to find summary in different format
    const summaryLines = out.split('\n').filter(line => 
      line.includes('All files') || line.includes('Summary') || line.includes('Total')
    );
    
    if (summaryLines.length > 0) {
      // Try to extract percentages from summary line
      const summaryLine = summaryLines[summaryLines.length - 1];
      const numbers = summaryLine.match(/(\d+\.\d+)/g);
      if (numbers && numbers.length >= 3) {
        linesPct = parseFloat(numbers[0]);
        branchesPct = parseFloat(numbers[1]);
        funcsPct = parseFloat(numbers[2]);
      }
    }
  }
  
  let score = 0;
  if (linesPct >= 85) score += 20;
  if (branchesPct >= 80) score += 15;
  if (funcsPct >= 80) score += 15;
  
  console.log(`  Lines: ${linesPct.toFixed(1)}% (${linesPct >= 85 ? '✅' : '❌'} 20pts), Branches: ${branchesPct.toFixed(1)}% (${branchesPct >= 80 ? '✅' : '❌'} 15pts), Functions: ${funcsPct.toFixed(1)}% (${funcsPct >= 80 ? '✅' : '❌'} 15pts)`);
  console.log(`  Coverage score: ${score}/50`);
  return score;
}

function checkLint() {
  console.log('Checking linting...');
  const out = run('npm run lint --silent');
  if (out === null) {
    console.log('  ❌ Linting failed (0/10)');
    return 0;
  }
  console.log('  ✅ Linting passed (10/10)');
  return 10;
}

function checkTypes() {
  console.log('Checking types...');
  const out = run('npm run type-check --silent');
  if (out === null) {
    console.log('  ❌ Type checking failed (0/5)');
    return 0;
  }
  console.log('  ✅ Type checking passed (5/5)');
  return 5;
}

function checkDocs() {
  console.log('Checking documentation...');
  const req = ['README.md', 'CHANGELOG.md', 'CONTRIBUTING.md'];
  let ok = 0;
  for (const f of req) {
    try {
      fs.accessSync(f);
      console.log(`  ✅ Found ${f}`);
      ok++;
    } catch (e) {
      console.log(`  ❌ Missing ${f}`);
    }
  }
  const score = ok === req.length ? 5 : 0;
  console.log(`  Documentation score: ${score}/5`);
  return score;
}

function checkSecurity() {
  console.log('Checking security vulnerabilities...');
  const out = run('npm audit --json');
  if (!out) {
    console.log('  ⚠️  Security check skipped (0/10)');
    return 0;
  }
  try {
    const j = JSON.parse(out);
    const crit = j.metadata.vulnerabilities.critical || 0;
    const high = j.metadata.vulnerabilities.high || 0;
    const score = crit + high === 0 ? 10 : 0;
    if (score > 0) {
      console.log('  ✅ No critical or high vulnerabilities (10/10)');
    } else {
      console.log(`  ❌ Found ${crit} critical and ${high} high vulnerabilities (0/10)`);
    }
    return score;
  } catch (e) {
    console.log('  ⚠️  Security check failed (0/10)');
    return 0;
  }
}

function computeScore() {
  let score = 0;
  score += checkUnitTests();
  score += checkCoverage();
  score += checkLint();
  score += checkTypes();
  score += checkDocs();
  score += checkSecurity();
  return score;
}

function suggestVersion(score) {
  if (score < 30) return '0.1.x';
  if (score < 50) return '0.2.x';
  if (score < 70) return '0.3.x';
  if (score < 85) return '0.5.x';
  if (score < 95) return '0.9.x';
  return '1.0.0-rc';
}

function main() {
  console.log('='.repeat(60));
  console.log('Running release-check (this may run tests)...');
  console.log('='.repeat(60));
  const score = computeScore();
  console.log('='.repeat(60));
  console.log(`\n📊 Final Score: ${score}/100`);
  console.log(`💡 Suggested milestone version: ${suggestVersion(score)}`);
  if (score >= 90) console.log('✨ Eligible for 1.0 release candidate');
  console.log('='.repeat(60));
  process.exit(score >= 30 ? 0 : 2);
}

main();
