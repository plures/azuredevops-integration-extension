/**
 * Module: src/fsm/machines/setupMachine.ts
 * Owner: application
 * Reads: (document)
 * Writes: (document)
 * Receives: (document)
 * Emits: (document)
 * Prohibitions: Do not mutate ApplicationContext directly; Do not define new *Context types
 * Rationale: (document)
 *
 * LLM-GUARD:
 * - Follow ownership boundaries; route events to Router; do not add UI logic here
 */
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
import { SetupStates } from './setupMachine.states.js';

const fsmLogger = createScopedLogger('setupMachine');

enum _FSMComponent {
  SETUP = 'SETUP',
}

interface SetupMachineContext {
  // Existing action selection (menu-based)
  selectedAction?: SetupAction;
  // VS Code extension context provided via machine input
  extensionContext: vscode.ExtensionContext;
  // Existing connections (not used by current tests but required by broader setup flow)
  connections: ProjectConnection[];
  saveConnections: (connections: ProjectConnection[]) => Promise<void>;
  ensureActiveConnection: (
    context: vscode.ExtensionContext,
    connectionId?: string,
    options?: { refresh?: boolean }
  ) => Promise<any>;
  // Fields needed for existing connection testing flow (tests expect these)
  testingExistingConnection?: ProjectConnection;
  lastExistingTestResult?: { success: boolean; message: string };
  error?: string;
}

export const setupMachine = createMachine(
  {
    id: 'setup',
    initial: SetupStates.IDLE,
    // Initialize context from machine input to satisfy tests supplying extensionContext only
    context: ({ input }): SetupMachineContext => ({
      extensionContext: (input as any)?.extensionContext,
      connections: (input as any)?.existingConnections || [],
      activeConnectionId: (input as any)?.activeConnectionId,
      // Use real functions from input if provided, otherwise use no-ops for tests
      saveConnections: (input as any)?.saveConnections || (async () => {}),
      ensureActiveConnection: (input as any)?.ensureActiveConnection || (async () => {}),
    }),
    states: {
      [SetupStates.IDLE]: {
        on: {
          SETUP_REQUESTED: SetupStates.SHOWING_MENU,
          START: [
            { target: SetupStates.MANAGING_EXISTING, guard: 'skipInitialChoice' },
            { target: SetupStates.SHOWING_MENU },
          ],
        },
      },
      // Original menu-driven flow (unchanged)
      [SetupStates.SHOWING_MENU]: {
        invoke: {
          id: 'showSetupMenu',
          src: 'showSetupMenu',
          input: ({ context }) => ({
            connections: context.connections,
            activeConnectionId: context.activeConnectionId,
          }),
          onDone: {
            target: SetupStates.HANDLING_ACTION,
            actions: assign({
              selectedAction: ({ event }) => event.output,
            }),
          },
          onError: {
            target: SetupStates.IDLE,
            actions: 'logError',
          },
        },
      },
      [SetupStates.HANDLING_ACTION]: {
        always: [
          { target: SetupStates.IDLE, guard: 'isAdd', actions: ['navigateToAdd'] },
          { target: SetupStates.IDLE, guard: 'isManage', actions: ['navigateToManage'] },
          { target: SetupStates.IDLE, guard: 'isSwitch', actions: ['navigateToSwitch'] },
          { target: SetupStates.IDLE, guard: 'isEntraSignIn', actions: ['signInWithEntra'] },
          { target: SetupStates.IDLE, guard: 'isEntraSignOut', actions: ['signOutEntra'] },
          { target: SetupStates.IDLE, guard: 'isConvertToEntra', actions: ['convertToEntra'] },
          { target: SetupStates.IDLE }, // Default
        ],
      },
      // New state expected by tests when managing existing connections directly
      [SetupStates.MANAGING_EXISTING]: {
        on: {
          TEST_EXISTING_CONNECTION: {
            target: SetupStates.TESTING_EXISTING_CONNECTION,
            actions: assign({
              testingExistingConnection: ({ event }) => event.connection,
            }),
          },
          CANCEL: SetupStates.IDLE,
        },
      },
      [SetupStates.TESTING_EXISTING_CONNECTION]: {
        invoke: {
          id: 'testExistingConnection',
          src: fromPromise(({ input }) => {
            const { connection, extensionContext } = input as {
              connection?: ProjectConnection;
              extensionContext: vscode.ExtensionContext;
            };
            return (async () => {
              if (!connection) {
                return { success: false, message: 'No connection provided' };
              }
              try {
                const pat = await extensionContext.secrets.get('azureDevOpsInt.pat');
                if (!pat) {
                  return { success: false, message: 'Personal Access Token missing' };
                }
                const base = connection.apiBaseUrl || connection.baseUrl || '';
                const testUrl = base.replace(/\/$/, '') + '/wit/workitemtypes/Task?api-version=7.0';
                const res = await fetch(testUrl);
                if (res.status >= 200 && res.status < 300) {
                  return { success: true, message: 'Connection test succeeded' };
                }
                return { success: false, message: `Connection test failed (status ${res.status})` };
              } catch (err: any) {
                return { success: false, message: err?.message || 'Connection test exception' };
              }
            })();
          }),
          input: ({ context }) => ({
            connection: context.testingExistingConnection,
            extensionContext: context.extensionContext,
          }),
          onDone: {
            target: SetupStates.TESTING_EXISTING_RESULT,
            actions: assign({
              lastExistingTestResult: ({ event }) => event.output,
            }),
          },
          onError: {
            target: SetupStates.TESTING_EXISTING_RESULT,
            actions: assign({
              lastExistingTestResult: ({ event }) => ({
                success: false,
                message: (event as any).error?.message || 'Connection test failed',
              }),
            }),
          },
        },
      },
      [SetupStates.TESTING_EXISTING_RESULT]: {
        on: {
          RETRY: SetupStates.TESTING_EXISTING_CONNECTION,
          CONTINUE_MANAGING: {
            target: SetupStates.MANAGING_EXISTING,
            actions: assign({ testingExistingConnection: () => undefined }),
          },
        },
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
      showSetupMenu: fromPromise(async ({ input }: { input: any }) => {
        return showSetupMenu({
          connections: input?.connections || [],
          activeConnectionId: input?.activeConnectionId,
        });
      }),
    },
    guards: {
      isAdd: ({ context }) => context.selectedAction === 'add',
      isManage: ({ context }) => context.selectedAction === 'manage',
      isSwitch: ({ context }) => context.selectedAction === 'switch',
      isEntraSignIn: ({ context }) => context.selectedAction === 'entraSignIn',
      isEntraSignOut: ({ context }) => context.selectedAction === 'entraSignOut',
      isConvertToEntra: ({ context }) => context.selectedAction === 'convertToEntra',
      skipInitialChoice: ({ event }) => !!(event as any).skipInitialChoice,
    },
  }
);
