#!/usr/bin/env node

/**
 * FSM Svelte 5 Integration Validation Script
 * 
 * This script validates that the complete FSM + Svelte 5 integration is working:
 * 1. Extension builds successfully
 * 2. Webview builds successfully  
 * 3. FSM stores are properly exported
 * 4. Reactive components are properly structured
 * 5. Build artifacts are in place
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname); // Go up one level to project root

console.log('🔍 FSM Svelte 5 Integration Validation');
console.log('=====================================\n');

let allValidationsPassed = true;

function validate(description, condition, details = '') {
  const status = condition ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${description}`);
  if (details && condition) {
    console.log(`    ${details}`);
  } else if (details && !condition) {
    console.log(`    ❌ ${details}`);
  }
  
  if (!condition) {
    allValidationsPassed = false;
  }
  return condition;
}

// 1. Check that build artifacts exist
console.log('📦 Build Artifacts:');
const extensionExists = fs.existsSync(path.join(rootDir, 'dist', 'extension.cjs'));
validate('Extension build exists', extensionExists, 'dist/extension.cjs found');

const webviewJsExists = fs.existsSync(path.join(rootDir, 'media', 'webview', 'reactive-main.js'));
validate('Webview JS build exists', webviewJsExists, 'media/webview/reactive-main.js found');

const webviewCssExists = fs.existsSync(path.join(rootDir, 'media', 'webview', 'reactive-main.css'));
validate('Webview CSS build exists', webviewCssExists, 'media/webview/reactive-main.css found');

// 2. Check HTML entry point is updated
console.log('\n🌐 HTML Entry Point:');
try {
  const htmlContent = fs.readFileSync(path.join(rootDir, 'media', 'webview', 'svelte.html'), 'utf8');
  const usesReactiveMain = htmlContent.includes('reactive-main.js');
  validate('HTML points to reactive-main.js', usesReactiveMain, 'svelte.html updated');
} catch (error) {
  validate('HTML file readable', false, `Error reading svelte.html: ${error.message}`);
}

// 3. Check that stores are properly structured
console.log('\n🏪 Store Structure:');
try {
  const mainStoreExists = fs.existsSync(path.join(rootDir, 'src', 'stores', 'applicationStore.ts'));
  validate('Main application store exists', mainStoreExists, 'src/stores/applicationStore.ts found');

  const webviewStoreExists = fs.existsSync(path.join(rootDir, 'src', 'webview', 'webviewStore.ts'));
  validate('Webview store exists', webviewStoreExists, 'src/webview/webviewStore.ts found');

  if (webviewStoreExists) {
    const webviewStoreContent = fs.readFileSync(path.join(rootDir, 'src', 'webview', 'webviewStore.ts'), 'utf8');
    const hasExports = webviewStoreContent.includes('export const actions') && 
                      webviewStoreContent.includes('export const selectors') &&
                      webviewStoreContent.includes('export const isActivated');
    validate('Webview store has required exports', hasExports, 'actions, selectors, reactive stores exported');
  }
} catch (error) {
  validate('Store files readable', false, `Error reading store files: ${error.message}`);
}

// 4. Check Svelte 5 components
console.log('\n⚡ Svelte 5 Components:');
try {
  const reactiveAppExists = fs.existsSync(path.join(rootDir, 'src', 'webview', 'ReactiveApp.svelte'));
  validate('ReactiveApp.svelte exists', reactiveAppExists, 'Svelte 5 component found');

  const reactiveMainExists = fs.existsSync(path.join(rootDir, 'src', 'webview', 'reactive-main.ts'));
  validate('reactive-main.ts exists', reactiveMainExists, 'Svelte 5 entry point found');

  if (reactiveMainExists) {
    const reactiveMainContent = fs.readFileSync(path.join(rootDir, 'src', 'webview', 'reactive-main.ts'), 'utf8');
    const usesWebviewStore = reactiveMainContent.includes('./webviewStore.js');
    validate('reactive-main uses webview store', usesWebviewStore, 'imports from webviewStore.js');
  }
} catch (error) {
  validate('Svelte components readable', false, `Error reading Svelte files: ${error.message}`);
}

// 5. Check activation integration
console.log('\n🚀 Activation Integration:');
try {
  const activationContent = fs.readFileSync(path.join(rootDir, 'src', 'activation.ts'), 'utf8');
  const importsApplicationStore = activationContent.includes('from \'./stores/applicationStore.js\'');
  validate('Activation imports application store', importsApplicationStore, 'activation.ts integrated with FSM store');

  const callsActivateAction = activationContent.includes('actions.activate()');
  validate('Activation calls FSM actions', callsActivateAction, 'FSM activation integrated');
} catch (error) {
  validate('Activation file readable', false, `Error reading activation.ts: ${error.message}`);
}

// 6. Check esbuild configuration
console.log('\n⚙️ Build Configuration:');
try {
  const esbuildContent = fs.readFileSync(path.join(rootDir, 'esbuild.mjs'), 'utf8');
  const buildsReactiveMain = esbuildContent.includes('reactive-main.ts');
  validate('esbuild targets reactive-main.ts', buildsReactiveMain, 'build configuration updated');
} catch (error) {
  validate('esbuild config readable', false, `Error reading esbuild.mjs: ${error.message}`);
}

// 7. Package.json dependencies
console.log('\n📋 Dependencies:');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const hasXState = packageJson.dependencies && packageJson.dependencies.xstate;
  validate('XState dependency present', !!hasXState, hasXState ? `xstate@${hasXState}` : 'XState not found');

  const hasXStateSvelte = packageJson.dependencies && packageJson.dependencies['@xstate/svelte'];
  validate('@xstate/svelte dependency present', !!hasXStateSvelte, hasXStateSvelte ? `@xstate/svelte@${hasXStateSvelte}` : '@xstate/svelte not found');

  const svelteVersion = (packageJson.dependencies && packageJson.dependencies.svelte) || 
                       (packageJson.devDependencies && packageJson.devDependencies.svelte);
  const isSvelte5 = svelteVersion && svelteVersion.startsWith('^5');
  validate('Svelte 5 installed', isSvelte5, svelteVersion ? `svelte@${svelteVersion}` : 'Svelte not found');
} catch (error) {
  validate('package.json readable', false, `Error reading package.json: ${error.message}`);
}

// Final summary
console.log('\n📊 Validation Summary:');
console.log('====================');

if (allValidationsPassed) {
  console.log('🎉 ALL VALIDATIONS PASSED!');
  console.log('✨ FSM + Svelte 5 integration is complete and ready for testing.');
  console.log('');
  console.log('Next steps:');
  console.log('1. Enable Application FSM in VS Code settings:');
  console.log('   "azureDevOpsIntegration.experimental.useApplicationFSM": true');
  console.log('2. Launch the extension in VS Code');
  console.log('3. Open the Azure DevOps Work Items view');
  console.log('4. Verify reactive behavior and FSM state management');
  process.exit(0);
} else {
  console.log('❌ Some validations failed. Please review the issues above.');
  console.log('🔧 Fix the failing validations and run this script again.');
  process.exit(1);
}