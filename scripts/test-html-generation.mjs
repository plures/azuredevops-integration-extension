#!/usr/bin/env node

/**
 * HTML Generation Test
 *
 * This script simulates the HTML generation process to see what's being created
 */

import * as fs from 'fs';
import * as path from 'path';

console.log('🔍 HTML Generation Debug Test');
console.log('==============================');

// Read the HTML template
const htmlPath = path.join('media', 'webview', 'svelte.html');
if (fs.existsSync(htmlPath)) {
  let html = fs.readFileSync(htmlPath, 'utf8');
  console.log('\n📄 Original HTML template:');
  console.log('   Script reference:', html.match(/src="[^"]*"/)?.[0] || 'Not found');

  // Simulate the replacement process
  const mockScriptUri = 'vscode-webview://12345/media/webview/reactive-main.js?v=1.0.0';
  const originalScript = './reactive-main.js';

  console.log('\n🔄 Replacement process:');
  console.log('   Looking for:', originalScript);
  console.log('   Replacing with:', mockScriptUri);

  const hasOriginal = html.includes(originalScript);
  console.log('   Found original script reference:', hasOriginal ? '✅' : '❌');

  if (hasOriginal) {
    html = html.replace(originalScript, mockScriptUri);
    console.log('   Replacement successful: ✅');
  } else {
    console.log('   Replacement failed: ❌');
  }

  // Check CSS replacement
  console.log('\n🎨 CSS injection check:');
  const cssPattern = '</head>';
  const hasCssTarget = html.includes(cssPattern);
  console.log('   Found </head> for CSS injection:', hasCssTarget ? '✅' : '❌');

  // Check script element structure
  console.log('\n📜 Script element analysis:');
  const scriptTags = html.match(/<script[^>]*>/g) || [];
  scriptTags.forEach((tag, i) => {
    console.log(`   Script ${i + 1}: ${tag}`);
  });
} else {
  console.log('\n❌ HTML template not found');
}

// Check if reactive-main.js exists and has content
const jsPath = path.join('media', 'webview', 'reactive-main.js');
if (fs.existsSync(jsPath)) {
  const jsContent = fs.readFileSync(jsPath, 'utf8');
  const hasMount = jsContent.includes('mount(');
  const hasDebug = jsContent.includes('Debug');
  const hasError = jsContent.includes('console.error');

  console.log('\n🔧 JavaScript file analysis:');
  console.log('   File size:', Math.round(jsContent.length / 1024) + 'KB');
  console.log('   Contains mount():', hasMount ? '✅' : '❌');
  console.log('   Contains debug code:', hasDebug ? '✅' : '❌');
  console.log('   Has error handling:', hasError ? '✅' : '❌');
} else {
  console.log('\n❌ reactive-main.js not found');
}

console.log('\n🎯 Most likely issues:');
console.log('   • Script URL replacement not working');
console.log('   • JavaScript errors preventing mount');
console.log('   • CSP blocking script execution');
console.log('   • Missing svelte-root element');

console.log('\n🔍 Next debugging steps:');
console.log('   1. Check browser console for errors');
console.log('   2. Verify script URL is correct in DOM');
console.log('   3. Test if svelte-root element exists');
console.log('   4. Check if mount() is being called');

export {};
