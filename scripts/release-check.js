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

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (e) {
    return null;
  }
}

function checkUnitTests() {
  console.log('Checking unit tests...');
  const out = run('npm test --silent');
  if (out === null) {
    console.log('  ❌ Unit tests failed (0/20)');
    return 0;
  }
  console.log('  ✅ Unit tests passed (20/20)');
  return 20;
}

function checkCoverage() {
  console.log('Checking code coverage...');
  const out = run('npx c8 --reporter=text --reporter=lcov npm test --silent');
  if (!out) {
    console.log('  ⚠️  Coverage check skipped (0/50)');
    return 0;
  }
  const lines = (out.match(/Lines:\s+(\d+\.\d+)%/i) || [])[1];
  const branches = (out.match(/Branches:\s+(\d+\.\d+)%/i) || [])[1];
  const funcs = (out.match(/Functions:\s+(\d+\.\d+)%/i) || [])[1];
  const l = parseFloat(lines || 0),
    b = parseFloat(branches || 0),
    f = parseFloat(funcs || 0);
  let score = 0;
  if (l >= 85) score += 20;
  if (b >= 80) score += 15;
  if (f >= 80) score += 15;
  console.log(`  Lines: ${l}% (${l >= 85 ? '✅' : '❌'} 20pts), Branches: ${b}% (${b >= 80 ? '✅' : '❌'} 15pts), Functions: ${f}% (${f >= 80 ? '✅' : '❌'} 15pts)`);
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
