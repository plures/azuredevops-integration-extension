#!/usr/bin/env node

/**
 * Webview Debug Test - Final Verification
 *
 * This script verifies the debug setup is ready for testing
 */

import * as fs from 'fs';
import * as path from 'path';

console.log('🔧 Webview Debug Test - Final Verification');
console.log('==========================================');

// Check if debug app is properly built
const reactiveMainPath = 'media/webview/reactive-main.js';
if (fs.existsSync(reactiveMainPath)) {
  const content = fs.readFileSync(reactiveMainPath, 'utf8');
  const hasDebugApp = content.includes('DebugApp') || content.includes('Webview Debug Test');
  const hasMount = content.includes('mount(');
  const hasVscode = content.includes('vscode');

  console.log('\n✅ Debug webview files ready:');
  console.log(`   ${hasDebugApp ? '✅' : '❌'} Contains debug app code`);
  console.log(`   ${hasMount ? '✅' : '❌'} Contains Svelte mount() call`);
  console.log(`   ${hasVscode ? '✅' : '❌'} Contains VS Code API access`);

  if (hasDebugApp && hasMount && hasVscode) {
    console.log('\n🎉 Debug webview should display properly!');
  } else {
    console.log('\n⚠️  Debug webview may have issues');
  }
} else {
  console.log('\n❌ reactive-main.js not found');
}

// Check extension activation fixes
const activationPath = 'src/activation.ts';
if (fs.existsSync(activationPath)) {
  const activation = fs.readFileSync(activationPath, 'utf8');
  const hasDefensiveReg = activation.includes('registerCommandSafely');
  const hasReactiveMain = activation.includes('reactive-main.js');

  console.log('\n✅ Extension activation ready:');
  console.log(`   ${hasDefensiveReg ? '✅' : '❌'} Has defensive command registration`);
  console.log(`   ${hasReactiveMain ? '✅' : '❌'} References correct webview script`);
} else {
  console.log('\n❌ src/activation.ts not found');
}

console.log('\n🚀 Testing Instructions:');
console.log('========================');
console.log('1. Press F5 in VS Code to launch extension host');
console.log('2. Open Activity Bar > Azure DevOps panel');
console.log('3. You should see: "🎉 Webview Debug Test"');
console.log('4. Check browser console (Ctrl+Shift+I) for any errors');
console.log('5. Click "Test VS Code Communication" button');

console.log('\n🎯 Expected Results:');
console.log('   ✅ Green checkmark status');
console.log('   ✅ Current timestamp displayed');
console.log('   ✅ "Svelte Version: 5.x (Runes)" shown');
console.log('   ✅ Test button functional');
console.log('   ✅ No console errors');

console.log('\n📊 If debug app works:');
console.log('   → Webview loading is functional');
console.log('   → Svelte 5 compilation is working');
console.log('   → VS Code integration is connected');
console.log('   → Ready to switch back to full ReactiveApp');

export {};
