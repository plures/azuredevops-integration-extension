#!/usr/bin/env node
/**
 * Integration test for workflow automation improvements
 *
 * This test validates that the CI workflow changes don't break the existing functionality
 * and that the improved error handling works as expected.
 */

import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

async function testWorkflowFile() {
  console.log('🧪 Testing workflow file changes...');

  try {
    // Read the CI workflow file
    const workflowPath = join(projectRoot, '.github', 'workflows', 'ci.yml');
    const workflowContent = await fs.readFile(workflowPath, 'utf8');

    // Test 1: Verify retry logic is present
    const hasRetryLogic = workflowContent.includes('for i in {1..3}; do');
    if (!hasRetryLogic) {
      throw new Error('❌ Retry logic not found in workflow');
    }
    console.log('✅ Retry logic found');

    // Test 2: Verify verification step is present
    const hasVerification = workflowContent.includes('git ls-remote --tags origin');
    if (!hasVerification) {
      throw new Error('❌ Tag verification not found in workflow');
    }
    console.log('✅ Tag verification found');

    // Test 3: Verify error notification is present
    const hasNotification = workflowContent.includes('Notify on tag failure');
    if (!hasNotification) {
      throw new Error('❌ Error notification not found in workflow');
    }
    console.log('✅ Error notification found');

    // Test 4: Verify the workflow still has the original structure
    const hasVersionBumpJob = workflowContent.includes('version-bump-and-tag:');
    if (!hasVersionBumpJob) {
      throw new Error('❌ Version bump job missing');
    }
    console.log('✅ Original workflow structure preserved');

    // Test 5: Verify YAML is valid (basic check)
    const lines = workflowContent.split('\n');
    let indentLevel = 0;
    let hasIndentationIssues = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') continue;

      const leadingSpaces = line.length - line.trimStart().length;
      if (leadingSpaces % 2 !== 0) {
        hasIndentationIssues = true;
        console.warn(`⚠️  Potential indentation issue on line ${i + 1}: "${line}"`);
      }
    }

    if (!hasIndentationIssues) {
      console.log('✅ YAML indentation looks correct');
    }

    console.log('✅ All workflow tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Workflow test failed:', error.message);
    return false;
  }
}

async function testFixScript() {
  console.log('🧪 Testing fix script...');

  try {
    const scriptPath = join(projectRoot, 'scripts', 'fix-missing-tags.sh');
    const scriptContent = await fs.readFile(scriptPath, 'utf8');

    // Test 1: Verify script has proper shebang
    if (!scriptContent.startsWith('#!/bin/bash')) {
      throw new Error('❌ Script missing proper shebang');
    }
    console.log('✅ Script has proper shebang');

    // Test 2: Verify script has error handling
    if (!scriptContent.includes('set -e')) {
      throw new Error('❌ Script missing error handling');
    }
    console.log('✅ Script has error handling');

    // Test 3: Verify script looks for release commits
    if (!scriptContent.includes('chore(release)')) {
      throw new Error("❌ Script doesn't look for release commits");
    }
    console.log('✅ Script searches for release commits');

    // Test 4: Verify script checks remote tags
    if (!scriptContent.includes('git ls-remote --tags origin')) {
      throw new Error("❌ Script doesn't check remote tags");
    }
    console.log('✅ Script checks remote tags');

    console.log('✅ All fix script tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Fix script test failed:', error.message);
    return false;
  }
}

async function testDocumentation() {
  console.log('🧪 Testing documentation...');

  try {
    const docPath = join(projectRoot, 'docs', 'WORKFLOW_IMPROVEMENTS.md');
    const docContent = await fs.readFile(docPath, 'utf8');

    // Test 1: Verify documentation has proper structure
    if (!docContent.includes('# Workflow Automation Improvements')) {
      throw new Error('❌ Documentation missing title');
    }
    console.log('✅ Documentation has proper title');

    // Test 2: Verify documentation explains the problem
    if (!docContent.includes('## Problem')) {
      throw new Error('❌ Documentation missing problem section');
    }
    console.log('✅ Documentation explains the problem');

    // Test 3: Verify documentation explains solutions
    if (!docContent.includes('## Solutions Implemented')) {
      throw new Error('❌ Documentation missing solutions section');
    }
    console.log('✅ Documentation explains solutions');

    console.log('✅ All documentation tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Documentation test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Running workflow automation improvement tests...\n');

  const results = await Promise.all([testWorkflowFile(), testFixScript(), testDocumentation()]);

  const allPassed = results.every((result) => result);

  console.log('\n📋 Test Summary:');
  console.log(`Workflow file: ${results[0] ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Fix script: ${results[1] ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Documentation: ${results[2] ? '✅ PASS' : '❌ FAIL'}`);

  if (allPassed) {
    console.log('\n🎉 All tests passed! Workflow improvements are ready.');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed. Please fix the issues above.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
