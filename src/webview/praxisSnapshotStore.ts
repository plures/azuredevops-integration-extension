import { writable } from 'svelte/store';

export interface ApplicationSnapshot {
  value: string | any;
  context: any;
  matches: Record<string, boolean>;
}

export const applicationSnapshot = writable<ApplicationSnapshot>({
  value: 'initializing',
  context: {},
  matches: { initializing: true },
});
