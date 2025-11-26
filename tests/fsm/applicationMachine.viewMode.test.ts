import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PraxisApplicationManager } from '../../src/praxis/application/manager.js';
import { resetPraxisEventBus } from '../../src/praxis/application/eventBus.js';

// Mock context
function createMockExtensionContext() {
  return {
    globalState: {
      get: vi.fn(() => undefined),
      update: vi.fn(() => Promise.resolve()),
    },
    workspaceState: {
      get: vi.fn(() => undefined),
      update: vi.fn(() => Promise.resolve()),
    },
    secrets: {
      get: vi.fn(() => Promise.resolve(undefined)),
      store: vi.fn(() => Promise.resolve()),
      delete: vi.fn(() => Promise.resolve()),
    },
  } as any;
}

describe('PraxisApplicationManager view mode toggling', () => {
  let manager: PraxisApplicationManager;

  beforeEach(() => {
    resetPraxisEventBus();
    manager = new PraxisApplicationManager();
    manager.start();
    manager.activate(createMockExtensionContext());
  });

  it('toggles between list and board', () => {
    expect(manager.getViewMode()).toBe('list');

    manager.toggleViewMode();
    expect(manager.getViewMode()).toBe('board');

    manager.toggleViewMode();
    expect(manager.getViewMode()).toBe('list');
  });

  it('sets view mode explicitly', () => {
    manager.setViewMode('board');
    expect(manager.getViewMode()).toBe('board');

    manager.setViewMode('list');
    expect(manager.getViewMode()).toBe('list');
  });
});
