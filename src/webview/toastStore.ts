import { writable } from 'svelte/store';

export interface Toast {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timeout: number; // ms (0 => persistent)
}

let counter = 0;
const store = writable<Toast[]>([]);
export const toasts = store;

export function addToast(
  message: string,
  opts: Partial<Pick<Toast, 'type' | 'timeout'>> = {}
): number {
  const id = ++counter;
  const toast: Toast = {
    id,
    message,
    type: opts.type || 'info',
    timeout: typeof opts.timeout === 'number' ? opts.timeout : opts.type === 'error' ? 8000 : 4000,
  };
  store.update((list) => [...list, toast]);
  if (toast.timeout > 0) {
    setTimeout(() => removeToast(id), toast.timeout);
  }
  return id;
}

export function removeToast(id: number): void {
  store.update((list) => list.filter((t) => t.id !== id));
}

export function clearToasts(): void {
  store.set([]);
}
