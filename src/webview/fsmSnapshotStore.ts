import { writable } from 'svelte/store';

export interface ApplicationSnapshot {
  value: string;
  context: any;
}

export const applicationSnapshot = writable<ApplicationSnapshot>({ value: 'initial', context: {} });
