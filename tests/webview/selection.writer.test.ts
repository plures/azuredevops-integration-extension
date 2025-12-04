import { describe, it, expect } from 'vitest';
import {
  createSelectConnection,
  webviewOwner,
} from '../../src/webview/selection.writer.internal.js';

describe('webview selection writer', () => {
  it('emits SELECT_CONNECTION with origin webview and payload id', () => {
    const evt = createSelectConnection(webviewOwner, 'abc');
    expect(evt.type).toBe('SELECT_CONNECTION');
    expect(evt.origin).toBe('webview');
    expect(evt.payload.id).toBe('abc');
    expect(typeof evt.payload.timestamp).toBe('number');
    expect(typeof evt.payload.correlationId).toBe('string');
  });
});
