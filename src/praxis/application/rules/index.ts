/**
 * Praxis Application Rules Index
 *
 * Aggregates all application rules from separate modules.
 */

export { lifecycleRules } from './lifecycleRules.js';
export { connectionRules } from './connectionRules.js';
export { workItemRules } from './workItemRules.js';
export { miscRules } from './miscRules.js';

// Re-export individual rules for direct access
export * from './lifecycleRules.js';
export * from './connectionRules.js';
export * from './workItemRules.js';
export * from './miscRules.js';

import { lifecycleRules } from './lifecycleRules.js';
import { connectionRules } from './connectionRules.js';
import { workItemRules } from './workItemRules.js';
import { miscRules } from './miscRules.js';

/**
 * All application rules combined
 */
export const applicationRules = [
  ...lifecycleRules,
  ...connectionRules,
  ...workItemRules,
  ...miscRules,
];
