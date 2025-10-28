/**
 * XState v5 Type Safety Helpers
 *
 * These helpers enforce XState v5 conventions at compile time:
 * - All entry/exit/actions must be arrays
 * - Provides better error messages
 * - Makes migration from v4 easier
 */

import { assign as xstateAssign, ActionFunction } from 'xstate';

/**
 * Type-safe wrapper for XState assign that ensures it's in an array
 *
 * @example
 * // ✅ Correct usage
 * entry: actions(
 *   assign({ isActive: true }),
 *   log('Entered state')
 * )
 *
 * // ❌ Wrong (will cause runtime error)
 * entry: assign({ isActive: true })
 */
export function actions<TContext, TEvent>(
  ...actionList: Array<ActionFunction<TContext, TEvent, any, any, any, any, any> | string>
): Array<ActionFunction<TContext, TEvent, any, any, any, any, any> | string> {
  if (actionList.length === 0) {
    throw new Error('actions() must have at least one action');
  }
  return actionList;
}

/**
 * Re-export assign with a note
 * Use this instead of importing directly from xstate
 */
export const assign = xstateAssign;

/**
 * Type-safe entry actions creator
 * Ensures entry is always an array
 */
export function entry<TContext, TEvent>(
  ...actionList: Array<ActionFunction<TContext, TEvent, any, any, any, any, any> | string>
): Array<ActionFunction<TContext, TEvent, any, any, any, any, any> | string> {
  if (actionList.length === 0) {
    throw new Error('entry() must have at least one action');
  }
  return actionList;
}

/**
 * Type-safe exit actions creator
 * Ensures exit is always an array
 */
export function exit<TContext, TEvent>(
  ...actionList: Array<ActionFunction<TContext, TEvent, any, any, any, any, any> | string>
): Array<ActionFunction<TContext, TEvent, any, any, any, any, any> | string> {
  if (actionList.length === 0) {
    throw new Error('exit() must have at least one action');
  }
  return actionList;
}

/**
 * Validation helper - checks if a value is a valid XState v5 action array
 */
export function isValidActionArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Migration helper - wraps single action in array if needed
 * Use during migration from XState v4 to v5
 */
export function ensureActionArray<T>(value: T | T[] | undefined): T[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  return [value];
}
