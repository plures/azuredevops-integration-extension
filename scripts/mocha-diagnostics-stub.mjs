#!/usr/bin/env node
const noopHandle = () => ({ timeout: () => {}, retries: () => {}, slow: () => {} });

const callWithFallback = (name, args) => {
  const candidate = typeof globalThis[name] === 'function' ? globalThis[name] : undefined;
  if (candidate) {
    return candidate(...args);
  }
  const [, maybeFn] = args;
  if (typeof maybeFn === 'function') {
    maybeFn();
  }
  return noopHandle();
};

const createHook = (hookName) => {
  return (...args) => {
    const fn = typeof globalThis[hookName] === 'function' ? globalThis[hookName] : undefined;
    if (fn) {
      return fn(...args);
    }
    const [maybeFn] = args;
    if (typeof maybeFn === 'function') {
      maybeFn();
    }
    return undefined;
  };
};

export const describe = (...args) => callWithFallback('describe', args);
export const it = (...args) => callWithFallback('it', args);
export const before = createHook('before');
export const after = createHook('after');
export const beforeEach = createHook('beforeEach');
export const afterEach = createHook('afterEach');

describe.only = (...args) => callWithFallback('describe', args);
describe.skip = (...args) => callWithFallback('describe', args);
it.only = (...args) => callWithFallback('it', args);
it.skip = (...args) => callWithFallback('it', args);

export default {
  describe,
  it,
  before,
  after,
  beforeEach,
  afterEach,
};
