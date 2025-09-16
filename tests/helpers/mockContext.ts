export function makeMockContext() {
  const global = new Map<string, any>();
  const secrets = new Map<string, string>();
  return {
    globalState: {
      get: (k: string) => global.get(k),
      update: async (k: string, v: any) => { global.set(k, v); return Promise.resolve(); }
    },
    secrets: {
      get: async (k: string) => secrets.get(k),
      store: async (k: string, v: string) => { secrets.set(k, v); return Promise.resolve(); },
      delete: async (k: string) => { secrets.delete(k); return Promise.resolve(); }
    },
    extensionPath: '',
    subscriptions: [] as any[]
  } as any;
}
