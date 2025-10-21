import Module from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request.includes('activation')) {
    const from = parent && parent.filename ? parent.filename : '<unknown>';
    console.log('[patched] require:', request, 'from', from);
  }
  return originalLoad.call(this, request, parent, isMain);
};

const activationPath = path.resolve('./src/activation.ts');
console.log('Importing activation from', activationPath);
try {
  await import(pathToFileURL(activationPath).href);
  console.log('Activation import succeeded');
} catch (error) {
  console.error('Activation import failed:', error);
}
