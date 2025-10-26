#!/usr/bin/env node
import { access, readFile } from 'fs/promises';
import path from 'path';
import { transform } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'url';

const TS_EXT_PATTERN = /\.([cm]?ts|tsx)$/;
const JS_TO_TS_EXT = new Map([
  ['.js', '.ts'],
  ['.mjs', '.mts'],
  ['.cjs', '.cts'],
]);
const RELATIVE_SPECIFIER = /^\.\.?\//;
const SOURCE_TARGET = 'es2022';
const MOCHA_DIAGNOSTIC_ENV = 'MOCHA_DIAGNOSTIC_STUB';
const mochaDiagnosticsStubUrl = pathToFileURL(
  path.resolve(process.cwd(), 'scripts', 'mocha-diagnostics-stub.mjs')
).href;

const selectLoader = (filename) => {
  if (filename.endsWith('.tsx')) return 'tsx';
  return 'ts';
};

const toFilePath = (url) => fileURLToPath(url.split('?')[0]);

const tryResolveVariant = async (specifier, parentURL) => {
  if (!RELATIVE_SPECIFIER.test(specifier)) return undefined;

  const [bare, search] = specifier.split('?');
  const ext = path.extname(bare);
  const parentPath = toFilePath(parentURL);
  const basePath = path.resolve(path.dirname(parentPath), bare);

  if (!ext) {
    const candidates = ['.ts', '.tsx', '.mts', '.cts'];
    for (const candidateExt of candidates) {
      const candidatePath = `${basePath}${candidateExt}`;
      try {
        await access(candidatePath);
        const candidateUrl = pathToFileURL(candidatePath).href;
        return search ? `${candidateUrl}?${search}` : candidateUrl;
      } catch {
        // try next
      }
    }
    return undefined;
  }
  const mappedExt = JS_TO_TS_EXT.get(ext);
  if (!mappedExt) return undefined;

  const candidatePath = `${basePath.slice(0, -ext.length)}${mappedExt}`;

  try {
    await access(candidatePath);
    const candidateUrl = pathToFileURL(candidatePath).href;
    return search ? `${candidateUrl}?${search}` : candidateUrl;
  } catch {
    return undefined;
  }
};

export const resolve = async (specifier, context, defaultResolve) => {
  const parentURL = context?.parentURL;

  if (
    process.env[MOCHA_DIAGNOSTIC_ENV] === '1' &&
    typeof specifier === 'string' &&
    specifier.includes('mocha')
  ) {
    console.log('[ts-esm-loader] resolve diag', specifier, 'parent', parentURL);
    if (specifier === 'mocha') {
      return { url: mochaDiagnosticsStubUrl, shortCircuit: true };
    }
  }

  try {
    return await defaultResolve(specifier, context, defaultResolve);
  } catch (error) {
    if (error?.code !== 'ERR_MODULE_NOT_FOUND' || !parentURL) {
      throw error;
    }

    const tsUrl = await tryResolveVariant(specifier, parentURL);
    if (tsUrl) {
      return { url: tsUrl, shortCircuit: true };
    }

    throw error;
  }
};

export const load = async (url, context, defaultLoad) => {
  const [cleanUrl] = url.split('?');

  if (process.env[MOCHA_DIAGNOSTIC_ENV] === '1') {
    const normalizedUrl = cleanUrl.replace(/\\/g, '/');
    if (/\/node_modules\/mocha\/(?:lib\/)?mocha\.js$/i.test(normalizedUrl)) {
      const source = [
        `import * as stub from ${JSON.stringify(mochaDiagnosticsStubUrl)};`,
        'export const describe = stub.describe;',
        'export const it = stub.it;',
        'export const before = stub.before;',
        'export const after = stub.after;',
        'export const beforeEach = stub.beforeEach;',
        'export const afterEach = stub.afterEach;',
        'export default stub.default ?? { describe, it, before, after, beforeEach, afterEach };',
      ].join('\n');
      return {
        format: 'module',
        source,
        shortCircuit: true,
      };
    }
  }

  if (!TS_EXT_PATTERN.test(cleanUrl)) {
    return defaultLoad(url, context, defaultLoad);
  }

  const filename = toFilePath(cleanUrl);
  const source = await readFile(filename, 'utf8');
  const loader = selectLoader(filename);
  const result = await transform(source, {
    loader,
    format: 'esm',
    target: SOURCE_TARGET,
    sourcefile: filename,
    sourcemap: 'inline',
  });

  return {
    format: 'module',
    source: result.code,
    shortCircuit: true,
  };
};
