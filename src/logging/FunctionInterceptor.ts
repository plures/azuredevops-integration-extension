/**
 * Automatic Function Call Interception
 *
 * Uses JavaScript Proxies to automatically log all function calls without
 * requiring manual instrumentation.
 */

import { standardizedLogger } from './StandardizedAutomaticLogger.js';

export interface InterceptOptions {
  component: string;
  logArgs?: boolean;
  logResult?: boolean;
  logDuration?: boolean;
  minDuration?: number; // Only log if duration exceeds this (ms)
}

/**
 * Wrap a function to automatically log calls
 */
export function interceptFunction<T extends (...args: any[]) => any>(
  fn: T,
  options: InterceptOptions
): T {
  const {
    component,
    logArgs = true,
    logResult = true,
    logDuration = true,
    minDuration = 0,
  } = options;
  const functionName = fn.name || 'anonymous';

  return ((...args: any[]) => {
    const startTime = performance.now();
    let result: any;
    let error: Error | undefined;

    try {
      result = fn(...args);

      // Handle promises
      if (result instanceof Promise) {
        return result
          .then((res) => {
            const duration = performance.now() - startTime;
            if (duration >= minDuration) {
              standardizedLogger.debug(
                'praxis',
                component,
                functionName,
                `Function completed in ${duration.toFixed(2)}ms`,
                { args: logArgs ? args : undefined, result: logResult ? res : undefined, duration }
              );
            }
            return res;
          })
          .catch((err) => {
            const duration = performance.now() - startTime;
            standardizedLogger.error(
              'praxis',
              component,
              functionName,
              `Function failed: ${err instanceof Error ? err.message : String(err)}`,
              { args: logArgs ? args : undefined, duration, error: err }
            );
            throw err;
          });
      }

      // Synchronous function
      const duration = performance.now() - startTime;
      if (duration >= minDuration) {
        standardizedLogger.debug(
          'praxis',
          component,
          functionName,
          `Function completed in ${duration.toFixed(2)}ms`,
          { args: logArgs ? args : undefined, result: logResult ? result : undefined, duration }
        );
      }

      return result;
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      const duration = performance.now() - startTime;
      standardizedLogger.error(
        'praxis',
        component,
        functionName,
        `Function failed: ${error.message}`,
        { args: logArgs ? args : undefined, duration, error }
      );
      throw err;
    }
  }) as T;
}

/**
 * Intercept all methods on an object
 */
export function interceptObject<T extends Record<string, any>>(
  obj: T,
  component: string,
  options?: Partial<InterceptOptions>
): T {
  const intercepted = {} as T;

  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'function') {
      intercepted[key] = interceptFunction(value, {
        component,
        ...options,
      });
    } else {
      intercepted[key] = value;
    }
  }

  return intercepted;
}

/**
 * Intercept a class instance's methods
 */
export function interceptInstance<T extends Record<string, any>>(
  instance: T,
  component: string,
  options?: Partial<InterceptOptions>
): T {
  const prototype = Object.getPrototypeOf(instance);
  const propertyNames = Object.getOwnPropertyNames(prototype);

  for (const name of propertyNames) {
    if (name === 'constructor') continue;

    const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
    if (descriptor && typeof descriptor.value === 'function') {
      const originalMethod = descriptor.value;
      (instance as any)[name] = interceptFunction(originalMethod.bind(instance), {
        component: `${component}.${name}`,
        ...options,
      });
    }
  }

  return instance;
}
