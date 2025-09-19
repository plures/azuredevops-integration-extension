export type EntityType = 'workItem' | 'comment' | 'timerEntry' | 'pullRequest';

export interface ChangeEvent {
  type: EntityType;
  ids: Array<string | number>;
  reason?: 'upsert' | 'delete' | 'sync' | 'local-mutation';
}

export type Listener = (ev: ChangeEvent) => void;

export class EventBus {
  private listeners: Set<Listener> = new Set();

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    // noop
    return () => {
      const deleted = this.listeners.delete(listener);
      if (deleted) {
        // noop
      }
    };
  }

  emit(ev: ChangeEvent) {
    const snapshot = Array.from(this.listeners);
    for (const l of snapshot) {
      try {
        l(ev);
      } catch {
        // swallow listener errors to avoid breaking the bus
      }
    }
  }
}
