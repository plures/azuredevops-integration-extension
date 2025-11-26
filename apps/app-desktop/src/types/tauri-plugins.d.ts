declare module '@tauri-apps/plugin-store' {
  export class Store {
    constructor(path: string);
    static load(path: string): Promise<Store>;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: unknown): Promise<void>;
    save(): Promise<void>;
  }
  export function load(path: string): Promise<Store>;
}

declare module '@tauri-apps/plugin-opener' {
  export function openUrl(url: string): Promise<void>;
}
