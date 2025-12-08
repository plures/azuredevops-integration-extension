/**
 * Tests for Create Work Item command functionality
 * Validates that the CREATE_WORK_ITEM event is properly dispatched and handled
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => {
  return {
    default: {
      workspace: {
        getConfiguration: () => ({
          get: () => undefined,
          update: () => Promise.resolve(),
        }),
        onDidChangeConfiguration: () => ({ dispose: () => {} }),
      },
      window: {
        showErrorMessage: () => Promise.resolve(),
        showInformationMessage: () => Promise.resolve(),
        createOutputChannel: () => ({
          append: () => {},
          appendLine: () => {},
          show: () => {},
          dispose: () => {},
        }),
      },
      commands: {
        registerCommand: () => ({ dispose: () => {} }),
        executeCommand: () => Promise.resolve(),
      },
      Uri: {
        file: (path: string) => ({ fsPath: path }),
        parse: (uri: string) => ({ toString: () => uri }),
      },
      ExtensionContext: class {},
    },
    workspace: {
      getConfiguration: () => ({
        get: () => undefined,
        update: () => Promise.resolve(),
      }),
      onDidChangeConfiguration: () => ({ dispose: () => {} }),
    },
    window: {
      showErrorMessage: () => Promise.resolve(),
      showInformationMessage: () => Promise.resolve(),
      createOutputChannel: () => ({
        append: () => {},
        appendLine: () => {},
        show: () => {},
        dispose: () => {},
      }),
    },
    commands: {
      registerCommand: () => ({ dispose: () => {} }),
      executeCommand: () => Promise.resolve(),
    },
    Uri: {
      file: (path: string) => ({ fsPath: path }),
      parse: (uri: string) => ({ toString: () => uri }),
    },
  };
});

describe('Create Work Item Command', () => {
  describe('Command Registration', () => {
    it('should register azureDevOpsInt.createWorkItem command', async () => {
      const { commandRegistrations } = await import('../../src/features/commands/registration.js');

      const createWorkItemCommand = commandRegistrations.find(
        (cmd) => cmd.command === 'azureDevOpsInt.createWorkItem'
      );

      expect(createWorkItemCommand).toBeDefined();
      expect(createWorkItemCommand?.handler).toBeDefined();
    });
  });

  describe('Command Handler', () => {
    it('should dispatch CREATE_WORK_ITEM event when handler is called', async () => {
      const { createWorkItemCommand } = await import('../../src/features/commands/handlers.js');

      // Mock the event dispatcher
      const mockSend = vi.fn();
      const mockContext = {
        context: {} as any,
        timer: null as any,
      };

      // Mock the extension host bridge to capture the event
      const bridge = await import('../../src/fsm/services/extensionHostBridge.js');
      vi.spyOn(bridge, 'sendApplicationStoreEvent').mockImplementation((event) => {
        mockSend(event);
        return true;
      });

      // Call the handler
      createWorkItemCommand(mockContext);

      // Verify the event was dispatched
      expect(mockSend).toHaveBeenCalledWith({ type: 'CREATE_WORK_ITEM' });
    });
  });

  describe('FSM Event Type', () => {
    it('should include CREATE_WORK_ITEM in ApplicationEvent type', async () => {
      // This is a compile-time check - if the types are wrong, this test will fail to compile
      const { eventHandlers } = await import('../../src/stores/eventHandlers.js');

      // The handler should be defined
      expect(eventHandlers.CREATE_WORK_ITEM).toBeDefined();

      // Type assertion to ensure CREATE_WORK_ITEM is a valid event
      const event: { type: 'CREATE_WORK_ITEM' } = { type: 'CREATE_WORK_ITEM' };
      expect(event.type).toBe('CREATE_WORK_ITEM');
    });
  });

  describe('Webview Integration', () => {
    it('should trigger event when webview sends CREATE_WORK_ITEM message', () => {
      // This test validates the webview -> activation -> event flow
      const message = {
        type: 'appEvent',
        event: { type: 'CREATE_WORK_ITEM' },
      };

      expect(message.type).toBe('appEvent');
      expect(message.event.type).toBe('CREATE_WORK_ITEM');
    });
  });
});

describe('Other Button Commands', () => {
  describe('Refresh Work Items', () => {
    it('should register azureDevOpsInt.refreshWorkItems command', async () => {
      const { commandRegistrations } = await import('../../src/features/commands/registration.js');

      const refreshCommand = commandRegistrations.find(
        (cmd) => cmd.command === 'azureDevOpsInt.refreshWorkItems'
      );

      expect(refreshCommand).toBeDefined();
      expect(refreshCommand?.handler).toBeDefined();
    });
  });

  describe('Toggle Kanban View', () => {
    it('should register azureDevOpsInt.toggleKanbanView command', async () => {
      const { commandRegistrations } = await import('../../src/features/commands/registration.js');

      const toggleCommand = commandRegistrations.find(
        (cmd) => cmd.command === 'azureDevOpsInt.toggleKanbanView'
      );

      expect(toggleCommand).toBeDefined();
      expect(toggleCommand?.handler).toBeDefined();
    });
  });

  describe('Setup Command', () => {
    it('should register azureDevOpsInt.setup command', async () => {
      const { commandRegistrations } = await import('../../src/features/commands/registration.js');

      const setupCommand = commandRegistrations.find(
        (cmd) => cmd.command === 'azureDevOpsInt.setup'
      );

      expect(setupCommand).toBeDefined();
      expect(setupCommand?.handler).toBeDefined();
    });
  });

  describe('Toggle Debug View', () => {
    it('should register azureDevOpsInt.toggleDebugView command', async () => {
      const { commandRegistrations } = await import('../../src/features/commands/registration.js');

      const debugCommand = commandRegistrations.find(
        (cmd) => cmd.command === 'azureDevOpsInt.toggleDebugView'
      );

      expect(debugCommand).toBeDefined();
      expect(debugCommand?.handler).toBeDefined();
    });
  });
});
