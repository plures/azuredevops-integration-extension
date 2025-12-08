import { describe, it, expect, vi } from 'vitest';
import { engine, subscribe, dispatch } from '../src/praxis-core/engine.js';

describe('Praxis Subscription', () => {
  it('should notify subscribers when dispatch is called', () => {
    // 1. Setup
    const callback = vi.fn();

    // 2. Subscribe
    const unsubscribe = subscribe(callback);

    // 3. Verify Initial Call
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(engine.context);

    // 4. Dispatch Event
    dispatch({
      type: 'CONNECTIONS_LOADED',
      payload: {
        connections: [{ id: 'test', name: 'Test', orgUrl: 'url', token: 't' }],
        activeId: 'test',
      },
    });

    // 5. Verify Update
    expect(callback).toHaveBeenCalledTimes(2);
    const state = callback.mock.calls[1][0];
    expect(state.activeConnectionId).toBe('test');
    expect(state.connections).toHaveLength(1);

    // 6. Cleanup
    unsubscribe();

    // 7. Dispatch Again
    dispatch({
      type: 'CONNECTION_SELECTED',
      payload: { connectionId: 'other' },
    });

    // 8. Verify No More Updates
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
