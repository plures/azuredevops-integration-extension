#!/usr/bin/env node

/**
 * Webview Debug Script
 *
 * This script helps debug webview loading issues by checking:
 * 1. File existence and accessibility
 * 2. Script and CSS paths
 * 3. HTML template integrity
 */

import * as fs from 'fs';
import * as path from 'path';

console.log('🔍 Webview Debug Analysis');
console.log('=========================');

const mediaPath = 'media/webview';
const requiredFiles = ['reactive-main.js', 'reactive-main.css', 'svelte.html'];

console.log('\n📁 Checking webview files:');
requiredFiles.forEach((file) => {
  const filePath = path.join(mediaPath, file);
  const exists = fs.existsSync(filePath);
  const size = exists ? fs.statSync(filePath).size : 0;
  console.log(
    `   ${exists ? '✅' : '❌'} ${file} ${exists ? `(${Math.round(size / 1024)}KB)` : '(missing)'}`
  );
});

console.log('\n🔍 Checking reactive-main.js content:');
const reactiveMainPath = path.join(mediaPath, 'reactive-main.js');
if (fs.existsSync(reactiveMainPath)) {
  const content = fs.readFileSync(reactiveMainPath, 'utf8');
  const hasMount = content.includes('mount(');
  const hasSvelte = content.includes('svelte');
  const hasVscode = content.includes('vscode');
  const hasApp = content.includes('ReactiveApp');

  console.log(`   ${hasMount ? '✅' : '❌'} Contains mount() call`);
  console.log(`   ${hasSvelte ? '✅' : '❌'} Contains Svelte imports`);
  console.log(`   ${hasVscode ? '✅' : '❌'} Contains VS Code API`);
  console.log(`   ${hasApp ? '✅' : '❌'} Contains ReactiveApp reference`);
} else {
  console.log('   ❌ reactive-main.js not found');
}

console.log('\n🔍 Checking HTML template:');
const htmlPath = path.join(mediaPath, 'svelte.html');
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const hasRoot = html.includes('svelte-root');
  const hasScript = html.includes('reactive-main.js');
  const hasStyle = html.includes('<style>');
  const hasViewport = html.includes('viewport');

  console.log(`   ${hasRoot ? '✅' : '❌'} Contains svelte-root element`);
  console.log(`   ${hasScript ? '✅' : '❌'} References reactive-main.js`);
  console.log(`   ${hasStyle ? '✅' : '❌'} Contains embedded styles`);
  console.log(`   ${hasViewport ? '✅' : '❌'} Contains viewport meta`);
} else {
  console.log('   ❌ svelte.html not found');
}

console.log('\n🔧 Webview Provider Check:');
const activationPath = 'src/activation.ts';
if (fs.existsSync(activationPath)) {
  const activation = fs.readFileSync(activationPath, 'utf8');
  const hasProvider = activation.includes('AzureDevOpsIntViewProvider');
  const hasRegistration = activation.includes('registerWebviewViewProvider');
  const hasReactiveMain = activation.includes('reactive-main.js');
  const hasReactiveCss = activation.includes('reactive-main.css');

  console.log(`   ${hasProvider ? '✅' : '❌'} AzureDevOpsIntViewProvider class exists`);
  console.log(`   ${hasRegistration ? '✅' : '❌'} registerWebviewViewProvider call exists`);
  console.log(`   ${hasReactiveMain ? '✅' : '❌'} References reactive-main.js`);
  console.log(`   ${hasReactiveCss ? '✅' : '❌'} References reactive-main.css`);
} else {
  console.log('   ❌ src/activation.ts not found');
}

console.log('\n🎯 Common Issues & Solutions:');
console.log('   • If webview is blank: Check browser console for JS errors');
console.log('   • If styles missing: Verify reactive-main.css loads correctly');
console.log('   • If no content: Check VS Code extension host logs');
console.log('   • If not showing: Verify view provider registration');

console.log('\n🚀 Next Steps:');
console.log('   1. Launch extension with F5');
console.log('   2. Open Azure DevOps panel in Activity Bar');
console.log('   3. Check VS Code Developer Console (Help > Toggle Developer Tools)');
console.log('   4. Look for webview console logs and errors');

export {};
