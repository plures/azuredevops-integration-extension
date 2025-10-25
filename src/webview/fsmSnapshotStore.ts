import { writable } from 'svelte/store';

export interface ApplicationSnapshot {
  value: any; // Can be string or object for nested states
  context: any;
  matches?: Record<string, boolean>; // Pre-computed state matches from extension
}

export const applicationSnapshot = writable<ApplicationSnapshot>({
  value: 'initial',
  context: {},
  matches: {},
});
