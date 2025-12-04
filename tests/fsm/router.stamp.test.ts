import { describe, it, expect } from 'vitest';
import { stampConnectionMeta } from '../../src/fsm/router/stamp.js';

describe('router/stamp', () => {
  it('stamps atConnectionId, timestamp, correlationId for connection-shaped events', () => {
    const evt = { type: 'REFRESH' } as any;
    const stamped = stampConnectionMeta(evt, 'conn-123');
    expect(stamped.meta.atConnectionId).toBe('conn-123');
    expect(typeof stamped.meta.timestamp).toBe('number');
    expect(typeof stamped.meta.correlationId).toBe('string');
  });

  it('does not stamp when no active connection id', () => {
    const evt = { type: 'REFRESH' } as any;
    const stamped = stampConnectionMeta(evt, null);
    expect(stamped.meta).toBeUndefined();
  });

  it('does not stamp non-connection events', () => {
    const evt = { type: 'OPEN_SETTINGS' } as any;
    const stamped = stampConnectionMeta(evt, 'conn-123');
    expect(stamped.meta).toBeUndefined();
  });
});
