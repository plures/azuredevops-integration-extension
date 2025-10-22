/**
 * FSM-based Connection Setup Machine
 * Replaces legacy SetupWizard with pure FSM architecture
 */

import { createMachine, assign, fromPromise } from 'xstate';
import { showSetupMenu, SetupAction } from '../functions/setup/ui.js';
import { createScopedLogger } from '../../logging.js';
import { addOrEditConnection } from '../functions/setup/connection.js';
import { manageConnections } from '../functions/setup/manage.js';
import { switchConnection } from '../functions/setup/switch.js';
import { convertConnectionToEntra } from '../functions/setup/convert.js';
import { signInWithEntra, signOutEntra } from '../functions/setup/auth.js';
import type { ProjectConnection } from './applicationMachine.js';
import type * as vscode from 'vscode';

const fsmLogger = createScopedLogger('setupMachine');

enum FSMComponent {
  SETUP = 'SETUP',
}

interface SetupMachineContext {
  selectedAction?: SetupAction;
  extensionContext: vscode.ExtensionContext;
  connections: ProjectConnection[];
  saveConnections: (connections: ProjectConnection[]) => Promise<void>;
  ensureActiveConnection: (
    context: vscode.ExtensionContext,
    connectionId?: string,
    options?: { refresh?: boolean }
  ) => Promise<any>;
}

export const setupMachine = createMachine(
  {
    id: 'setup',
    initial: 'idle',
    context: {} as SetupMachineContext,
    states: {
      idle: {
        on: {
          SETUP_REQUESTED: 'showingMenu',
        },
      },
      showingMenu: {
        invoke: {
          id: 'showSetupMenu',
          src: 'showSetupMenu',
          onDone: {
            target: 'handlingAction',
            actions: assign({
              selectedAction: ({ event }) => event.output,
            }),
          },
          onError: {
            target: 'idle',
            actions: 'logError',
          },
        },
      },
      handlingAction: {
        always: [
          {
            target: 'idle',
            guard: 'isAdd',
            actions: ['navigateToAdd'],
          },
          {
            target: 'idle',
            guard: 'isManage',
            actions: ['navigateToManage'],
          },
          {
            target: 'idle',
            guard: 'isSwitch',
            actions: ['navigateToSwitch'],
          },
          {
            target: 'idle',
            guard: 'isEntraSignIn',
            actions: ['signInWithEntra'],
          },
          {
            target: 'idle',
            guard: 'isEntraSignOut',
            actions: ['signOutEntra'],
          },
          {
            target: 'idle',
            guard: 'isConvertToEntra',
            actions: ['convertToEntra'],
          },
          {
            target: 'idle', // Default transition
          },
        ],
      },
    },
  },
  {
    actions: {
      logError: ({ event }) => {
        fsmLogger.error('Error in setup machine', {
          error: event.data,
        });
      },
      navigateToAdd: async ({ context }) => {
        await addOrEditConnection(
          context.extensionContext,
          context.connections,
          context.saveConnections,
          context.ensureActiveConnection
        );
      },
      navigateToManage: async ({ context }) => {
        await manageConnections(
          context.extensionContext,
          context.connections,
          context.saveConnections,
          context.ensureActiveConnection
        );
      },
      navigateToSwitch: async ({ context }) => {
        await switchConnection(
          context.extensionContext,
          context.connections,
          context.ensureActiveConnection
        );
      },
      signInWithEntra: async ({ context }) => {
        await signInWithEntra(
          context.connections,
          context.extensionContext.globalState.get('azureDevOpsInt.activeConnectionId')
        );
      },
      signOutEntra: async ({ context }) => {
        await signOutEntra(
          context.connections,
          context.extensionContext.globalState.get('azureDevOpsInt.activeConnectionId')
        );
      },
      convertToEntra: async ({ context }) => {
        await convertConnectionToEntra(
          context.extensionContext,
          context.connections,
          context.saveConnections,
          context.ensureActiveConnection
        );
      },
    },
    actors: {
      showSetupMenu: fromPromise(showSetupMenu),
    },
    guards: {
      isAdd: ({ context }) => context.selectedAction === 'add',
      isManage: ({ context }) => context.selectedAction === 'manage',
      isSwitch: ({ context }) => context.selectedAction === 'switch',
      isEntraSignIn: ({ context }) => context.selectedAction === 'entraSignIn',
      isEntraSignOut: ({ context }) => context.selectedAction === 'entraSignOut',
      isConvertToEntra: ({ context }) => context.selectedAction === 'convertToEntra',
    },
  }
);
