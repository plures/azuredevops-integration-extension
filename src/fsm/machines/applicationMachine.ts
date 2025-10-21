/**
 * Application-wide Finite State Machine Architecture
 *
 * This file defines the complete FSM system for the Azure DevOps extension,
 * replacing the complex global state management with structured state machines.
 */

import { createMachine, assign, ActorRefFrom, fromPromise, createActor } from 'xstate';
import { timerMachine } from './timerMachine.js';
import {
  getExtensionContextRef,
  invokeActiveConnectionHandler,
  invokeRegisterAllCommands,
  invokeWebviewMessageHandler,
  type ActiveConnectionHandlerOptions,
} from '../services/extensionHostBridge.js';
import type { TimerEvent } from '../types.js';
import {
  EXTENSION_CONFIG_NAMESPACE,
  LEGACY_EXTENSION_CONFIG_NAMESPACE,
  CONNECTIONS_CONFIG_STORAGE_KEY,
  ACTIVE_CONNECTION_STORAGE_KEY,
} from '../../config/constants.js';
import {
  normalizeConnections,
  resolveActiveConnectionId,
} from '../functions/activation/connectionNormalization.js';
import type {
  LegacyConnectionFallback,
  NormalizationSummary,
} from '../functions/activation/connectionNormalization.js';
import { migrateGlobalPATToConnections } from '../functions/secrets/patMigration.js';

// ============================================================================
// CONTEXT-PRESERVING ASSIGN HELPER
// ============================================================================

// ============================================================================
// APPLICATION STATE DEFINITIONS
// ============================================================================

export type ApplicationContext = {
  // Extension lifecycle
  isActivated: boolean;
  isDeactivating: boolean;

  // Connection management
  connections: ProjectConnection[];
  activeConnectionId?: string;
  connectionStates: Map<string, ConnectionState>;

  // Authentication
  // LEGACY AUTH REMOVED - EntraAuthenticationProvider replaced by FSM authentication
  pendingAuthReminders: Map<string, AuthReminderState>;

  // Core services
  extensionContext?: any;
  webviewBridge?: any;
  outputChannel?: any;
  statusBarItem?: any;
  authStatusBarItem?: any;

  // UI components
  webviewPanel?: any;
  pendingWorkItems?: {
    workItems: any[];
    connectionId?: string;
    query?: string;
    kanbanView?: boolean;
    types?: string[];
  };

  // Child state machines (using any for now until machines are properly imported)
  timerActor?: any;
  connectionActors: Map<string, any>;
  authActors: Map<string, any>;
  dataActor?: any;
  webviewActor?: any;

  // Error handling
  lastError?: Error;
  errorRecoveryAttempts: number;
};

export type ApplicationEvent =
  | { type: 'ACTIVATE'; context: any }
  | { type: 'DEACTIVATE' }
  | { type: 'CONNECTIONS_LOADED'; connections: ProjectConnection[] }
  | { type: 'CONNECTION_SELECTED'; connectionId: string }
  | { type: 'CONNECTION_ESTABLISHED'; connectionId: string; connectionState?: any }
  | { type: 'REFRESH_DATA' }
  | {
      type: 'WORK_ITEMS_LOADED';
      workItems: any[];
      connectionId?: string;
      query?: string;
      kanbanView?: boolean;
      types?: string[];
    }
  | { type: 'AUTHENTICATION_REQUIRED'; connectionId: string }
  | { type: 'AUTHENTICATION_SUCCESS'; connectionId: string }
  | { type: 'AUTHENTICATION_FAILED'; connectionId: string; error: string }
  | { type: 'AUTH_REMINDER_SET'; connectionId: string; reminder: AuthReminderState }
  | { type: 'AUTH_REMINDER_CLEARED'; connectionId: string }
  | { type: 'AUTH_REMINDER_DISMISSED'; connectionId: string; snoozeUntil?: number }
  | { type: 'WEBVIEW_READY' }
  | { type: 'SHOW_WEBVIEW' }
  | { type: 'WEBVIEW_MESSAGE'; message: any }
  | { type: 'UPDATE_WEBVIEW_PANEL'; webviewPanel: any }
  | { type: 'ERROR'; error: Error }
  | { type: 'RETRY' }
  | { type: 'RESET' };

type SetupUIResult = {
  connections: ProjectConnection[];
  activeConnectionId?: string;
  persisted: {
    connections: boolean;
    activeConnectionId: boolean;
  };
  summary: NormalizationSummary;
};

const EMPTY_NORMALIZATION_SUMMARY: NormalizationSummary = {
  generatedIds: [],
  addedPatKeys: [],
  addedBaseUrls: [],
  addedApiBaseUrls: [],
  removedInvalidEntries: 0,
};

function isSetupUICompletionEvent(
  event: unknown
): event is { type: 'done.invoke.setupUI'; output: SetupUIResult } {
  return Boolean(event) && (event as { type?: unknown }).type === 'done.invoke.setupUI';
}

function deriveLegacyFallback(
  config: { get?<T>(key: string): T | undefined },
  legacyConfig: { get?<T>(key: string): T | undefined }
): LegacyConnectionFallback {
  const organization =
    readConfigString(config, 'organization') ?? readConfigString(legacyConfig, 'organization');
  const project = readConfigString(config, 'project') ?? readConfigString(legacyConfig, 'project');
  const team = readConfigString(config, 'team') ?? readConfigString(legacyConfig, 'team');
  const label = readConfigString(config, 'label');

  return {
    organization,
    project,
    team,
    label,
  };
}

function readConfigString(
  source: { get?<T>(key: string): T | undefined },
  key: string
): string | undefined {
  if (!source?.get) {
    return undefined;
  }

  const raw = source.get<string | undefined>(key);
  if (typeof raw !== 'string') {
    return undefined;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

// ============================================================================
// CONNECTION STATE MACHINE
// ============================================================================

export type ConnectionContext = {
  connectionId: string;
  config: ProjectConnection;
  client?: any; // AzureDevOpsIntClient
  provider?: any; // WorkItemsProvider
  authMethod: 'pat' | 'entra';
  credential?: string;
  isConnected: boolean;
  lastError?: string;
  retryCount: number;
};

export type ConnectionEvent =
  | { type: 'CONNECT' }
  | { type: 'AUTHENTICATE'; credential: string }
  | { type: 'AUTH_SUCCESS'; credential: string }
  | { type: 'AUTH_FAILED'; error: string }
  | { type: 'CLIENT_CREATED' }
  | { type: 'PROVIDER_CREATED' }
  | { type: 'CONNECTION_SUCCESS' }
  | { type: 'CONNECTION_FAILED'; error: string }
  | { type: 'DISCONNECT' }
  | { type: 'RETRY' }
  | { type: 'RESET' };

export const connectionMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QGMD2A7dZkBcCWGAdBHrGptjpAMQDCA8gHKMCitAKgNoAMAuoqAAOqWHnwYBIAB6IAjADYAzACZCADgDsAVm7cNG+Wq2zlAFgA0IAJ6J5W+YWXbushWeWzuagL7fL5LFwCdGJSAMoaACUWAGUWLj5JYVFxdEkZBFkdRUJFNRNTZRdTAE4leUsbBC17Qm5lHVlTRQ0XRWNffwxA1MIAQwBXHAALMHR8ZD78dChqCAwwQjx0ADdUAGtF8KCiQZGxianlqARltcnUnl4rpJExYPTED01c+Qb2-ULmyttFbkJ5IU1EpjKZ5Nx5LJOiBtr09qNxngLsdqGAAE5o1BowiCAA2UwAZliALaEWHBfpDBGHaYnM6oZEYK43JAgZL3CSsjIKFTqZx6AxGAo-BDKMWEEr8+xeEpeLzQ8lEZBosBHGYAfWQuLwBzmCyWqw2W26lApytVtM12oOp0NjPQzMSrPZqUeouU4MIOl0xg83FMWgs1kQ+Vyul0ykUskUilM0dMCpNOxC5rVUCtOvGqIxWJx+JwRLRpMVKZVaYzNvp9sd-Gdd1dXKeHtk6haNWUJU0KnsIsl-1augUsnymiciYoybJZctgkxKzwEHReqwBrWmzJSd6qZnc4X6Nt5yOTL4LKE9YejdFGjU6ga3D+hTMagDIvyJTq3BKX5an5jWkU449Ga07HOqs6oPOi5otmmLYnihIkhuE5biBGrgZB+5VkeDonk6Z4pBeoAZE4N5qHeD5iqYz5aL2kIAloX7AnoRi+oBppKpuNAACIAJIxAwzBsAktb4RyaSXgYLbNNoijgnocYqCKdgtiUd6uGoZGuB4bGTrCNACawHA8Uw6oAGIAII8QAMiwXGnmy56ckRiCSYQ0n-nJGgKcor6Bl6xjyHJhSqRoAF+DCm4UvC6oEn0eC4lE8SRAAmvZLqEdIcjKGRdQmI0KimBo2U+cGCB5FoErOK4rilCUVE6XCVIxXFCUQHQTCGcJtwEU5mWZMVuVqQVRVkSKzQVfIVUqEYXhqGFXTIVFTWxfF3F8QZQlpY54nOf1OUuENZgjSVVT-i2WhVXofZ2PNEWLRx93oM1q1tdE7ApVtPU7X1Jj7XlbRHcVr4eJVjTGC0DRmA1ZqRRgz2te1gkcJ9Ylur9qgHflgOjaVmgtpNjShXosYMdDD1AXDK0I7x-EdZteEOV9aMDZjAOFUDpX6KoTiNB2k1ZBpvjhegqCLvArIlt1qOXgAtBUpUyxVX7KyrKsXWTIQkGQnEQFLDa7U0GjvoYXnAu0saPkptRtm0jEGC0GuUvsiLIjMesZdyso3ve2hFPIJTDqpihKdlAKTdRAUXXVjvbqBWqZjg7u9cRpjNOobw1P6XmlGCIc3oF17Z6Yn72D44UllOFqgehe5okn30ZIUvYtIQnhfhdzQQ0bMc6-XbqFRot46M8fYxk0r6yIP97emC7SGPIjvRVTkB95engem5XmdvYeQlHkY2hoYw-FwHsnlD3j3wyvdZM5enamHUGdZM0bzqb2qcArGc0aRdxiuEL3ggA */
    id: 'connection',
    types: {} as {
      context: ConnectionContext;
      events: ConnectionEvent;
    },
    initial: 'disconnected',
    context: {
      connectionId: '',
      config: {} as ProjectConnection,
      authMethod: 'pat',
      isConnected: false,
      retryCount: 0,
    },
    states: {
      disconnected: {
        on: {
          CONNECT: 'authenticating',
          RESET: {
            target: 'disconnected',
            actions: assign({
              retryCount: 0,
              lastError: undefined,
            }),
          },
        },
      },
      authenticating: {
        invoke: {
          src: 'authenticateConnection',
          onDone: {
            target: 'creating_client',
            actions: assign({
              credential: ({ event }) => event.output.credential,
            }),
          },
          onError: {
            target: 'auth_failed',
            actions: assign({
              lastError: ({ event }) => (event.error as Error)?.message || 'Authentication failed',
              retryCount: ({ context }) => context.retryCount + 1,
            }),
          },
        },
      },
      creating_client: {
        invoke: {
          src: 'createClient',
          onDone: {
            target: 'creating_provider',
            actions: assign({
              client: ({ event }) => event.output,
            }),
          },
          onError: {
            target: 'connection_failed',
            actions: assign({
              lastError: ({ event }) => (event.error as Error)?.message || 'Client creation failed',
            }),
          },
        },
      },
      creating_provider: {
        invoke: {
          src: 'createProvider',
          onDone: {
            target: 'connected',
            actions: assign({
              provider: ({ event }) => event.output,
              isConnected: true,
              retryCount: 0,
              lastError: undefined,
            }),
          },
          onError: {
            target: 'connection_failed',
            actions: assign({
              lastError: ({ event }) =>
                (event.error as Error)?.message || 'Provider creation failed',
            }),
          },
        },
      },
      connected: {
        on: {
          DISCONNECT: 'disconnected',
          CONNECTION_FAILED: 'connection_failed',
        },
        entry: 'notifyConnectionSuccess',
      },
      auth_failed: {
        on: {
          RETRY: {
            target: 'authenticating',
            guard: 'canRetry',
          },
          CONNECT: 'authenticating',
          DISCONNECT: 'disconnected',
        },
        entry: 'notifyAuthFailure',
      },
      connection_failed: {
        on: {
          RETRY: {
            target: 'authenticating',
            guard: 'canRetry',
          },
          CONNECT: 'authenticating',
          DISCONNECT: 'disconnected',
        },
        entry: 'notifyConnectionFailure',
      },
    },
  },
  {
    guards: {
      canRetry: ({ context }) => context.retryCount < 3,
    },
    actions: {
      notifyConnectionSuccess: () => {
        // Emit to parent application FSM
      },
      notifyAuthFailure: () => {
        // Show auth failure UI
      },
      notifyConnectionFailure: () => {
        // Show connection failure UI
      },
    },
    actors: {
      authenticateConnection: fromPromise(async ({ input }: { input: ConnectionContext }) => {
        // Implement authentication logic based on authMethod
        return { credential: 'mock-credential' };
      }),
      createClient: fromPromise(async ({ input }: { input: ConnectionContext }) => {
        // Create AzureDevOpsIntClient
        return { client: 'mock-client' };
      }),
      createProvider: fromPromise(async ({ input }: { input: ConnectionContext }) => {
        // Create WorkItemsProvider
        return { provider: 'mock-provider' };
      }),
    },
  }
);

// ============================================================================
// AUTHENTICATION STATE MACHINE
// ============================================================================

export type AuthContext = {
  connectionId: string;
  authMethod: 'pat' | 'entra';
  token?: string;
  expiresAt?: Date;
  refreshToken?: string;
  isInteractive: boolean;
  deviceCode?: string;
  verificationUrl?: string;
  lastError?: string;
};

export type AuthEvent =
  | { type: 'START_AUTH'; interactive?: boolean }
  | { type: 'DEVICE_CODE_RECEIVED'; deviceCode: string; verificationUrl: string }
  | { type: 'USER_AUTHORIZED' }
  | { type: 'TOKEN_RECEIVED'; token: string; expiresAt?: Date; refreshToken?: string }
  | { type: 'TOKEN_EXPIRED' }
  | { type: 'REFRESH_TOKEN' }
  | { type: 'AUTH_CANCELLED' }
  | { type: 'AUTH_FAILED'; error: string };

export const authMachine = createMachine(
  {
    id: 'auth',
    types: {} as {
      context: AuthContext;
      events: AuthEvent;
    },
    initial: 'unauthenticated',
    context: {
      connectionId: '',
      authMethod: 'pat',
      isInteractive: false,
    },
    states: {
      unauthenticated: {
        on: {
          START_AUTH: [
            {
              target: 'device_code_flow',
              guard: 'isEntraAuth',
            },
            {
              target: 'pat_auth',
              guard: 'isPATAuth',
            },
          ],
        },
      },
      pat_auth: {
        invoke: {
          src: 'getPATToken',
          onDone: {
            target: 'authenticated',
            actions: assign({
              token: ({ event }) => event.output,
            }),
          },
          onError: {
            target: 'auth_failed',
            actions: assign({
              lastError: ({ event }) =>
                (event.error as Error)?.message || 'PAT authentication failed',
            }),
          },
        },
      },
      device_code_flow: {
        initial: 'requesting_code',
        states: {
          requesting_code: {
            invoke: {
              src: 'requestDeviceCode',
              onDone: {
                target: 'waiting_for_user',
                actions: assign({
                  deviceCode: ({ event }) => event.output.deviceCode,
                  verificationUrl: ({ event }) => event.output.verificationUrl,
                }),
              },
              onError: {
                target: '#auth.auth_failed',
                actions: assign({
                  lastError: ({ event }) =>
                    (event.error as Error)?.message || 'Device code request failed',
                }),
              },
            },
          },
          waiting_for_user: {
            entry: 'showDeviceCodePrompt',
            invoke: {
              src: 'pollForToken',
              onDone: {
                target: '#auth.authenticated',
                actions: assign({
                  token: ({ event }) => event.output.token,
                  expiresAt: ({ event }) => event.output.expiresAt,
                  refreshToken: ({ event }) => event.output.refreshToken,
                }),
              },
              onError: {
                target: '#auth.auth_failed',
                actions: assign({
                  lastError: ({ event }) =>
                    (event.error as Error)?.message || 'Token polling failed',
                }),
              },
            },
            on: {
              AUTH_CANCELLED: '#auth.auth_failed',
            },
          },
        },
      },
      authenticated: {
        on: {
          TOKEN_EXPIRED: 'refreshing_token',
          REFRESH_TOKEN: 'refreshing_token',
        },
        entry: 'notifyAuthSuccess',
      },
      refreshing_token: {
        invoke: {
          src: 'refreshToken',
          onDone: {
            target: 'authenticated',
            actions: assign({
              token: ({ event }) => event.output.token,
              expiresAt: ({ event }) => event.output.expiresAt,
            }),
          },
          onError: {
            target: 'unauthenticated',
            actions: assign({
              token: undefined,
              refreshToken: undefined,
              lastError: ({ event }) => (event.error as Error)?.message || 'Token refresh failed',
            }),
          },
        },
      },
      auth_failed: {
        on: {
          START_AUTH: 'unauthenticated',
        },
        entry: 'notifyAuthFailure',
      },
    },
  },
  {
    guards: {
      isEntraAuth: ({ context }) => context.authMethod === 'entra',
      isPATAuth: ({ context }) => context.authMethod === 'pat',
    },
    actions: {
      showDeviceCodePrompt: ({ context }) => {
        // Show device code UI
      },
      notifyAuthSuccess: () => {
        // Emit to parent
      },
      notifyAuthFailure: () => {
        // Show error UI
      },
    },
    actors: {
      getPATToken: fromPromise(async ({ input }: { input: AuthContext }) => {
        // Get PAT from secrets
        return { token: 'mock-pat-token' };
      }),
      requestDeviceCode: fromPromise(async ({ input }: { input: AuthContext }) => {
        // Request Entra device code
        return {
          deviceCode: 'mock-device-code',
          verificationUrl: 'https://microsoft.com/devicelogin',
        };
      }),
      pollForToken: fromPromise(async ({ input }: { input: AuthContext }) => {
        // Poll for auth completion
        return {
          token: 'mock-access-token',
          expiresAt: new Date(),
          refreshToken: 'mock-refresh-token',
        };
      }),
      refreshToken: fromPromise(async ({ input }: { input: AuthContext }) => {
        // Refresh expired token
        return { token: 'mock-refreshed-token', expiresAt: new Date() };
      }),
    },
  }
);

// ============================================================================
// DATA SYNC STATE MACHINE
// ============================================================================

export type DataSyncContext = {
  connectionId?: string;
  lastSyncTime?: Date;
  query?: string;
  workItems: any[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  retryCount: number;
};

export type DataSyncEvent =
  | { type: 'LOAD_DATA'; connectionId: string; query?: string }
  | { type: 'REFRESH_DATA' }
  | {
      type: 'WORK_ITEMS_LOADED';
      workItems: any[];
      connectionId?: string;
      query?: string;
      kanbanView?: boolean;
      types?: string[];
    }
  | { type: 'DATA_FAILED'; error: string }
  | { type: 'RETRY' }
  | { type: 'CLEAR_DATA' };

export const dataSyncMachine = createMachine(
  {
    id: 'dataSync',
    types: {} as {
      context: DataSyncContext;
      events: DataSyncEvent;
    },
    initial: 'idle',
    context: {
      workItems: [],
      isLoading: false,
      hasError: false,
      retryCount: 0,
    },
    states: {
      idle: {
        on: {
          LOAD_DATA: {
            target: 'loading',
            actions: assign({
              connectionId: ({ event }) => event.connectionId,
              query: ({ event }) => event.query,
              isLoading: true,
              hasError: false,
            }),
          },
        },
      },
      loading: {
        invoke: {
          src: 'loadWorkItems',
          onDone: {
            target: 'loaded',
            actions: assign({
              workItems: ({ event }) => event.output,
              isLoading: false,
              hasError: false,
              lastSyncTime: () => new Date(),
              retryCount: 0,
            }),
          },
          onError: {
            target: 'error',
            actions: assign({
              isLoading: false,
              hasError: true,
              errorMessage: ({ event }) => (event.error as Error)?.message || 'Data loading failed',
              retryCount: ({ context }) => context.retryCount + 1,
            }),
          },
        },
        on: {
          CLEAR_DATA: 'idle',
        },
      },
      loaded: {
        on: {
          REFRESH_DATA: {
            target: 'loading',
            actions: assign({
              isLoading: true,
              hasError: false,
            }),
          },
          LOAD_DATA: {
            target: 'loading',
            actions: assign({
              connectionId: ({ event }) => event.connectionId,
              query: ({ event }) => event.query,
              isLoading: true,
              hasError: false,
            }),
          },
          CLEAR_DATA: {
            target: 'idle',
            actions: assign({
              workItems: [],
              connectionId: undefined,
              query: undefined,
            }),
          },
        },
        entry: 'notifyDataLoaded',
      },
      error: {
        on: {
          RETRY: {
            target: 'loading',
            guard: 'canRetry',
            actions: assign({
              hasError: false,
              errorMessage: undefined,
            }),
          },
          LOAD_DATA: {
            target: 'loading',
            actions: assign({
              connectionId: ({ event }) => event.connectionId,
              query: ({ event }) => event.query,
              isLoading: true,
              hasError: false,
            }),
          },
          CLEAR_DATA: 'idle',
        },
        entry: 'notifyDataError',
      },
    },
  },
  {
    guards: {
      canRetry: ({ context }) => context.retryCount < 3,
    },
    actions: {
      notifyDataLoaded: () => {
        // Emit to parent
      },
      notifyDataError: () => {
        // Show error UI
      },
    },
    actors: {
      loadWorkItems: fromPromise(async ({ input }: { input: DataSyncContext }) => {
        // Load work items from provider
        return [];
      }),
    },
  }
);

// ============================================================================
// WEBVIEW STATE MACHINE
// ============================================================================

export type WebviewContext = {
  panel?: any;
  isReady: boolean;
  pendingMessages: any[];
  lastError?: string;
};

export type WebviewEvent =
  | { type: 'CREATE_PANEL' }
  | { type: 'PANEL_READY' }
  | { type: 'SEND_MESSAGE'; message: any }
  | { type: 'RECEIVE_MESSAGE'; message: any }
  | { type: 'PANEL_DISPOSED' }
  | { type: 'ERROR'; error: string };

export const webviewMachine = createMachine(
  {
    id: 'webview',
    types: {} as {
      context: WebviewContext;
      events: WebviewEvent;
    },
    initial: 'not_created',
    context: {
      isReady: false,
      pendingMessages: [],
    },
    states: {
      not_created: {
        on: {
          CREATE_PANEL: 'creating',
        },
      },
      creating: {
        invoke: {
          src: 'createWebviewPanel',
          onDone: {
            target: 'initializing',
            actions: assign({
              panel: ({ event }) => event.output,
            }),
          },
          onError: {
            target: 'error',
            actions: assign({
              lastError: ({ event }) => (event.error as Error)?.message || 'Panel creation failed',
            }),
          },
        },
      },
      initializing: {
        on: {
          PANEL_READY: {
            target: 'ready',
            actions: assign({
              isReady: true,
            }),
          },
          ERROR: {
            target: 'error',
            actions: assign({
              lastError: ({ event }) => event.error,
            }),
          },
        },
        entry: 'setupPanelListeners',
      },
      ready: {
        on: {
          SEND_MESSAGE: {
            actions: 'sendMessageToPanel',
          },
          RECEIVE_MESSAGE: {
            actions: 'handleMessageFromPanel',
          },
          PANEL_DISPOSED: 'not_created',
          ERROR: 'error',
        },
        entry: 'flushPendingMessages',
      },
      error: {
        on: {
          CREATE_PANEL: 'creating',
        },
      },
    },
  },
  {
    actions: {
      setupPanelListeners: () => {
        // Setup webview message listeners
      },
      sendMessageToPanel: ({ context, event }) => {
        if (event.type === 'SEND_MESSAGE') {
          if (context.isReady && context.panel) {
            context.panel.webview.postMessage(event.message);
          } else {
            context.pendingMessages.push(event.message);
          }
        }
      },
      handleMessageFromPanel: ({ event }) => {
        // Route message to appropriate handler
      },
      flushPendingMessages: ({ context }) => {
        context.pendingMessages.forEach((message) => {
          context.panel?.webview.postMessage(message);
        });
        context.pendingMessages = [];
      },
    },
    actors: {
      createWebviewPanel: fromPromise(async () => {
        // Create VS Code webview panel
        return { panel: 'mock-webview-panel' };
      }),
    },
  }
);

// ============================================================================
// MAIN APPLICATION STATE MACHINE (ORCHESTRATOR)
// ============================================================================

/**
 * Simplified application machine focused on orchestration.
 *
 * Key principles:
 * 1. Pure orchestrator - coordinates child machines
 * 2. No business logic in actions - delegates to single-purpose functions
 * 3. State changes trigger reactive store updates
 * 4. Child machines handle their own domain logic
 */
export const applicationMachine = createMachine(
  {
    id: 'application',
    types: {} as {
      context: ApplicationContext;
      events: ApplicationEvent;
    },
    initial: 'inactive',

    context: {
      isActivated: false,
      isDeactivating: false,
      connections: [],
      connectionStates: new Map(),
      pendingAuthReminders: new Map(),
      connectionActors: new Map(),
      authActors: new Map(),
      errorRecoveryAttempts: 0,
      webviewPanel: undefined,
      pendingWorkItems: undefined,
    },

    states: {
      inactive: {
        on: {
          ACTIVATE: {
            target: 'activating',
            actions: 'storeExtensionContext',
          },
        },
      },
      activating: {
        invoke: {
          src: 'performActivation',
          input: ({ context }) => context,
          onDone: {
            target: 'active',
            actions: 'markActivated',
          },
          onError: {
            target: 'activation_failed',
            actions: 'recordActivationError',
          },
        },
      },
      active: {
        initial: 'setup',
        states: {
          setup: {
            // Sequential setup: first connections, then panel, then ready for data
            entry: ['initializeChildActors'],
            initial: 'loading_connections',
            onDone: {
              target: 'ready',
            },
            states: {
              loading_connections: {
                invoke: {
                  src: 'setupUI',
                  onDone: {
                    target: 'waiting_for_panel',
                    actions: [
                      'storeConnectionsFromSetup',
                      'initializeConnectionActorsFromSetup',
                      'selectInitialConnection',
                    ],
                  },
                  onError: 'setup_error',
                },
              },
              waiting_for_panel: {
                on: {
                  UPDATE_WEBVIEW_PANEL: {
                    target: 'panel_ready',
                    actions: [
                      'updateWebviewPanelInContext',
                      'syncPendingDataIfAvailable',
                      'clearPendingData',
                    ],
                  },
                },
              },
              panel_ready: {
                type: 'final',
              },
              setup_error: {
                on: {
                  RETRY: 'loading_connections',
                },
              },
            },
            on: {
              // Handle connection events during setup
              CONNECTION_SELECTED: {
                actions: ['setActiveConnectionInContext', 'delegateConnectionActivation'],
              },
              AUTHENTICATION_REQUIRED: {
                actions: 'delegateAuthenticationStart',
              },
              AUTHENTICATION_SUCCESS: {
                actions: 'recordAuthenticationSuccess',
              },
              AUTHENTICATION_FAILED: {
                actions: 'recordAuthenticationFailure',
              },
              AUTH_REMINDER_SET: {
                actions: 'recordAuthReminder',
              },
              AUTH_REMINDER_CLEARED: {
                actions: 'clearAuthReminder',
              },
              AUTH_REMINDER_DISMISSED: {
                actions: 'dismissAuthReminder',
              },
            },
          },
          ready: {
            // Normal operation: panel and connections guaranteed to exist

            initial: 'data_loading',
            states: {
              data_loading: {
                entry: ['checkForDataLoading', 'logAllEvents'],
                on: {
                  CONNECTION_ESTABLISHED: {
                    actions: 'updateConnectionState', // No transition - stay in data_loading until WORK_ITEMS_LOADED
                  },
                  WORK_ITEMS_LOADED: {
                    target: 'data_synced',
                    actions: ['syncDataToWebview'],
                  },
                },
              },
              data_synced: {
                on: {
                  REFRESH_DATA: 'data_loading',
                  WORK_ITEMS_LOADED: {
                    actions: ['syncDataToWebview'],
                  },
                },
              },
            },
            on: {
              // Handle webview events during normal operation
              WEBVIEW_READY: {
                actions: 'notifyWebviewReady',
              },
              WEBVIEW_MESSAGE: {
                actions: 'routeWebviewMessage',
              },
              UPDATE_WEBVIEW_PANEL: {
                actions: [
                  'updateWebviewPanelInContext',
                  'syncPendingDataIfAvailable',
                  'clearPendingData',
                ],
              },
              // DEBUG: Catch WORK_ITEMS_LOADED events at ready state level
              WORK_ITEMS_LOADED: {
                actions: ['syncDataToWebview'],
              },
              // Connection changes trigger updating state
              CONNECTION_SELECTED: {
                target: 'updating',
                actions: ['setActiveConnectionInContext', 'delegateConnectionActivation'],
              },
              AUTHENTICATION_REQUIRED: {
                actions: 'delegateAuthenticationStart',
              },
              AUTHENTICATION_SUCCESS: {
                actions: 'recordAuthenticationSuccess',
              },
              AUTHENTICATION_FAILED: {
                actions: 'recordAuthenticationFailure',
              },
              AUTH_REMINDER_SET: {
                actions: 'recordAuthReminder',
              },
              AUTH_REMINDER_CLEARED: {
                actions: 'clearAuthReminder',
              },
              AUTH_REMINDER_DISMISSED: {
                actions: 'dismissAuthReminder',
              },
            },
          },
          updating: {
            // Temporary state when connections change - pause data, update, then resume

            on: {
              AUTHENTICATION_REQUIRED: {
                actions: 'delegateAuthenticationStart',
              },
              AUTHENTICATION_SUCCESS: {
                actions: 'recordAuthenticationSuccess',
              },
              AUTHENTICATION_FAILED: {
                actions: 'recordAuthenticationFailure',
              },
              AUTH_REMINDER_SET: {
                actions: 'recordAuthReminder',
              },
              AUTH_REMINDER_CLEARED: {
                actions: 'clearAuthReminder',
              },
              AUTH_REMINDER_DISMISSED: {
                actions: 'dismissAuthReminder',
              },
              CONNECTION_ESTABLISHED: {
                target: 'ready',
                actions: 'updateConnectionState',
              },
              UPDATE_WEBVIEW_PANEL: {
                actions: [
                  'updateWebviewPanelInContext',
                  'syncPendingDataIfAvailable',
                  'clearPendingData',
                ],
              },
            },
          },
        },
        on: {
          // Global events that can happen in any active state
          DEACTIVATE: 'deactivating',
          ERROR: {
            target: 'error_recovery',
            actions: 'recordError',
          },
        },
      },
      activation_failed: {
        on: {
          RETRY: 'activating',
          ACTIVATE: 'activating',
        },
      },
      error_recovery: {
        invoke: {
          src: 'recoverFromError',
          onDone: 'active',
          onError: {
            target: 'error_recovery',
            actions: 'incrementRecoveryAttempts',
          },
        },
        after: {
          5000: {
            target: 'active',
            guard: 'canRecover',
          },
        },
      },
      deactivating: {
        invoke: {
          src: 'performDeactivation',
          input: ({ context }) => context,
          onDone: 'inactive',
          onError: 'inactive', // Force to inactive even on error
        },
        entry: 'markDeactivating',
      },
    },
  },
  {
    guards: {
      canRecover: ({ context }) => context.errorRecoveryAttempts < 3,
      hasActiveConnection: ({ context }) => {
        // Only trigger automatic loading if we have an active connection and it's connected
        console.log('[ApplicationFSM] Checking hasActiveConnection guard:', {
          activeConnectionId: context.activeConnectionId,
          connectionStatesSize: context.connectionStates.size,
        });

        if (!context.activeConnectionId) {
          return false;
        }

        const connectionState = context.connectionStates.get(context.activeConnectionId);
        const hasClient = !!connectionState?.client;
        const hasProvider = !!connectionState?.provider;

        console.log('[ApplicationFSM] Connection state check:', {
          connectionId: context.activeConnectionId,
          hasState: !!connectionState,
          hasClient,
          hasProvider,
          shouldTriggerLoading: hasClient && hasProvider,
        });

        // Connection is ready when both client and provider are available
        return hasClient && hasProvider;
      },
      hasWebviewPanel: ({ context }) => {
        const hasPanel = !!context.webviewPanel;
        console.log('[ApplicationFSM] Checking hasWebviewPanel guard:', {
          hasPanel,
          webviewPanelType: typeof context.webviewPanel,
          webviewPanelValue: context.webviewPanel,
          contextKeys: Object.keys(context),
          fullContext: JSON.stringify(context, null, 2),
        });
        return hasPanel;
      },
      canLoadData: ({ context }) => {
        const hasConnection = !!(context.activeConnectionId && context.connectionStates.size > 0);
        console.log('[ApplicationFSM] Checking canLoadData guard:', {
          hasConnection,
          activeConnectionId: context.activeConnectionId,
          connectionStatesSize: context.connectionStates.size,
          canLoad: hasConnection,
        });
        return hasConnection;
      },
    },
    actions: {
      // Universal event logger - catches ALL events sent to FSM
      logAllEvents: ({ context, event }) => {
        if (event.type === 'WORK_ITEMS_LOADED') {
          console.log('[ApplicationFSM] 🔥 UNIVERSAL EVENT LOGGER: WORK_ITEMS_LOADED received!', {
            eventType: event.type,
            workItemCount: (event as any)?.workItems?.length || 0,
            connectionId: (event as any)?.connectionId,
            timestamp: Date.now(),
          });
        } else {
          console.log('[ApplicationFSM] 🔍 UNIVERSAL EVENT LOGGER: Event received:', {
            eventType: event.type,
            timestamp: Date.now(),
          });
        }
      },

      // Pure assignment actions (no side effects)
      storeExtensionContext: assign({
        extensionContext: ({ event }) => (event.type === 'ACTIVATE' ? event.context : undefined),
      }),

      markActivated: assign({
        isActivated: true,
      }),

      recordActivationError: assign({
        lastError: ({ event }) => (event.type === 'ERROR' ? event.error : undefined),
      }),

      registerConnections: assign({
        connections: ({ event }) => (event.type === 'CONNECTIONS_LOADED' ? event.connections : []),
      }),

      setActiveConnectionInContext: assign({
        activeConnectionId: ({ event, context }) =>
          event.type === 'CONNECTION_SELECTED' ? event.connectionId : context.activeConnectionId,
      }),

      storeConnectionsFromSetup: assign(({ context, event }) => {
        const completionEvent = event as unknown;
        if (!isSetupUICompletionEvent(completionEvent)) {
          return context;
        }

        const setupResult = completionEvent.output;
        const nextConnectionStates = new Map<string, ConnectionState>();

        for (const connection of setupResult.connections) {
          const previousState = context.connectionStates.get(connection.id);
          const resolvedAuthMethod: 'pat' | 'entra' =
            connection.authMethod === 'entra' ? 'entra' : (previousState?.authMethod ?? 'pat');

          nextConnectionStates.set(connection.id, {
            id: connection.id,
            config: connection,
            client: previousState?.client,
            provider: previousState?.provider,
            authMethod: resolvedAuthMethod,
            pat: previousState?.pat,
            accessToken: previousState?.accessToken,
            refreshFailureCount: previousState?.refreshFailureCount,
            lastRefreshFailure: previousState?.lastRefreshFailure,
            refreshBackoffUntil: previousState?.refreshBackoffUntil,
            reauthInProgress: previousState?.reauthInProgress,
            lastInteractiveAuthAt: previousState?.lastInteractiveAuthAt,
          });
        }

        return {
          ...context,
          connections: setupResult.connections,
          activeConnectionId: setupResult.activeConnectionId,
          connectionStates: nextConnectionStates,
        };
      }),

      initializeConnectionActorsFromSetup: ({ context, event }) => {
        const completionEvent = event as unknown;
        if (!isSetupUICompletionEvent(completionEvent)) {
          return;
        }

        const setupResult = completionEvent.output;
        const { connections } = setupResult;

        // Remove actors for connections that no longer exist
        for (const [connectionId, actor] of Array.from(context.connectionActors.entries())) {
          const stillExists = connections.some(
            (connection: ProjectConnection) => connection.id === connectionId
          );
          if (!stillExists) {
            try {
              actor.stop();
            } catch (error) {
              console.warn(
                '[ApplicationFSM] Failed to stop connection actor during cleanup:',
                error
              );
            }
            context.connectionActors.delete(connectionId);
          }
        }

        // Create actors for current connections
        for (const connection of connections) {
          const existingActor = context.connectionActors.get(connection.id);
          if (existingActor) {
            try {
              existingActor.stop();
            } catch (error) {
              console.warn(
                '[ApplicationFSM] Failed to stop existing connection actor before recreation:',
                error
              );
            }
            context.connectionActors.delete(connection.id);
          }

          const actor = createActor(connectionMachine, {
            id: `connection-${connection.id}`,
            input: {
              connectionId: connection.id,
              config: connection,
              authMethod: connection.authMethod === 'entra' ? 'entra' : 'pat',
              isConnected: false,
              retryCount: 0,
              refreshFailureCount: 0,
              reauthInProgress: false,
            },
          });

          actor.start();
          context.connectionActors.set(connection.id, actor);
        }
      },

      selectInitialConnection: ({ context, event }) => {
        const completionEvent = event as unknown;
        if (!isSetupUICompletionEvent(completionEvent)) {
          return;
        }

        const setupResult = completionEvent.output;
        const targetConnectionId = setupResult.activeConnectionId ?? setupResult.connections[0]?.id;
        if (targetConnectionId) {
          activateConnection(context, targetConnectionId);
        }
      },

      showWebview: () => {
        // Show webview through VS Code command

        try {
          // Import dynamically to avoid circular dependencies
          import('vscode')
            .then((vscode) => {
              vscode.commands.executeCommand('workbench.view.extension.azureDevOpsIntegration');
              // Also explicitly focus the view to ensure it appears
              setTimeout(() => {
                vscode.commands.executeCommand('azureDevOpsWorkItems.focus');
              }, 100);
            })
            .catch((error) => {
              console.warn('[ApplicationFSM] Failed to show webview:', error);
            });
        } catch (error) {
          console.warn('[ApplicationFSM] Failed to import vscode module:', error);
        }
      },

      recordAuthenticationSuccess: assign(({ context, event }) => {
        const newPendingAuthReminders = (() => {
          if (event.type === 'AUTHENTICATION_SUCCESS') {
            const newReminders = new Map(context.pendingAuthReminders);
            newReminders.delete(event.connectionId);
            return newReminders;
          }
          return context.pendingAuthReminders;
        })();

        return {
          ...context, // Preserve ALL existing context properties
          pendingAuthReminders: newPendingAuthReminders, // Only change what we need
        };
      }),

      recordAuthenticationFailure: assign(({ context, event }) => {
        const newPendingAuthReminders = (() => {
          if (event.type === 'AUTHENTICATION_FAILED') {
            const newReminders = new Map(context.pendingAuthReminders);
            newReminders.set(event.connectionId, {
              connectionId: event.connectionId,
              status: 'pending',
              reason: 'authFailed',
              detail: event.error,
            });
            return newReminders;
          }
          return context.pendingAuthReminders;
        })();

        return {
          ...context, // Preserve ALL existing context properties
          pendingAuthReminders: newPendingAuthReminders, // Only change what we need
        };
      }),
      recordAuthReminder: assign(({ context, event }) => {
        if (event.type !== 'AUTH_REMINDER_SET') {
          return context;
        }

        const newPendingAuthReminders = new Map(context.pendingAuthReminders);
        newPendingAuthReminders.set(event.connectionId, {
          ...event.reminder,
          connectionId: event.connectionId,
          status: event.reminder.status ?? 'pending',
        });

        return {
          ...context,
          pendingAuthReminders: newPendingAuthReminders,
        };
      }),
      clearAuthReminder: assign(({ context, event }) => {
        if (event.type !== 'AUTH_REMINDER_CLEARED') {
          return context;
        }

        const newPendingAuthReminders = new Map(context.pendingAuthReminders);
        newPendingAuthReminders.delete(event.connectionId);

        return {
          ...context,
          pendingAuthReminders: newPendingAuthReminders,
        };
      }),
      dismissAuthReminder: assign(({ context, event }) => {
        if (event.type !== 'AUTH_REMINDER_DISMISSED') {
          return context;
        }

        const newPendingAuthReminders = new Map(context.pendingAuthReminders);
        const existing = newPendingAuthReminders.get(event.connectionId);
        if (!existing) {
          return context;
        }

        newPendingAuthReminders.set(event.connectionId, {
          ...existing,
          status: 'dismissed',
          snoozeUntil: event.snoozeUntil,
        });

        return {
          ...context,
          pendingAuthReminders: newPendingAuthReminders,
        };
      }),

      recordError: assign(({ context, event }) => ({
        ...context, // Preserve ALL existing context properties
        lastError: event.type === 'ERROR' ? event.error : undefined, // Only change what we need
      })),

      updateWebviewPanelInContext: assign(({ context, event }) => {
        if (event.type === 'UPDATE_WEBVIEW_PANEL') {
          console.log('[ApplicationFSM] WEBVIEW_PANEL_TRACE - Setting panel:', {
            eventType: event.type,
            hasIncomingPanel: !!event.webviewPanel,
            currentContextPanel: !!context.webviewPanel,
            incomingPanelType: typeof event.webviewPanel,
            contextPanelType: typeof context.webviewPanel,
            timestamp: Date.now(),
          });

          const updatedContext = {
            ...context, // Preserve ALL existing context properties
            webviewPanel: event.webviewPanel, // Only update what we need
          };

          console.log('[ApplicationFSM] WEBVIEW_PANEL_TRACE - Panel set result:', {
            hasUpdatedPanel: !!updatedContext.webviewPanel,
            updatedPanelType: typeof updatedContext.webviewPanel,
            allContextKeys: Object.keys(updatedContext).length,
          });

          return updatedContext;
        }

        console.log(
          '[ApplicationFSM] WEBVIEW_PANEL_TRACE - Non-UPDATE event, preserving context:',
          {
            eventType: event.type,
            hasCurrentPanel: !!context.webviewPanel,
            currentPanelType: typeof context.webviewPanel,
            timestamp: Date.now(),
          }
        );

        return context; // No changes for other events
      }),

      updateConnectionState: assign(({ context, event }) => {
        console.log('[ApplicationFSM] WEBVIEW_PANEL_TRACE - updateConnectionState ENTRY:', {
          eventType: event.type,
          connectionId:
            event.type === 'CONNECTION_ESTABLISHED' ? event.connectionId : 'not applicable',
          currentWebviewPanel: !!context.webviewPanel,
          webviewPanelType: typeof context.webviewPanel,
          allContextKeys: Object.keys(context).sort(),
          timestamp: Date.now(),
        });

        const activeConnectionId = (() => {
          if (event.type === 'CONNECTION_ESTABLISHED') {
            return event.connectionId;
          }
          return context.activeConnectionId;
        })();

        const connectionStates = (() => {
          if (event.type === 'CONNECTION_ESTABLISHED' && event.connectionState) {
            const newStates = new Map(context.connectionStates);
            newStates.set(event.connectionId, event.connectionState);
            console.log(
              '[ApplicationFSM] updateConnectionState - AFTER storing connection state:',
              {
                connectionId: event.connectionId,
                hasClient: !!event.connectionState.client,
                hasProvider: !!event.connectionState.provider,
                authMethod: event.connectionState.authMethod,
                totalConnections: newStates.size,
                webviewPanelPreserved: !!context.webviewPanel,
                webviewPanelType: typeof context.webviewPanel,
              }
            );
            return newStates;
          }
          return context.connectionStates;
        })();

        const updatedContext = {
          ...context, // Preserve ALL existing context properties including webviewPanel
          activeConnectionId, // Only change what we need
          connectionStates,
        };

        console.log('[ApplicationFSM] WEBVIEW_PANEL_TRACE - updateConnectionState EXIT:', {
          hasWebviewPanel: !!updatedContext.webviewPanel,
          webviewPanelType: typeof updatedContext.webviewPanel,
          preservedFromInput: !!context.webviewPanel,
          allContextKeys: Object.keys(updatedContext).sort(),
          timestamp: Date.now(),
        });

        return updatedContext;
      }),

      syncPendingDataIfAvailable: ({ context }) => {
        console.log(
          '[ApplicationFSM] syncPendingDataIfAvailable called - DETAILED context check:',
          {
            hasWebviewPanel: !!context.webviewPanel,
            hasPendingWorkItems: !!context.pendingWorkItems,
            webviewPanelType: typeof context.webviewPanel,
            webviewPanelValue: context.webviewPanel,
            contextKeys: Object.keys(context),
            fullContextSubset: {
              isActivated: context.isActivated,
              activeConnectionId: context.activeConnectionId,
              connectionStatesSize: context.connectionStates.size,
              webviewPanel: context.webviewPanel,
            },
          }
        );

        if (context.webviewPanel && context.pendingWorkItems) {
          console.log(
            '[ApplicationFSM] Webview panel now available - syncing pending work items:',
            {
              workItemCount: context.pendingWorkItems.workItems.length,
              connectionId: context.pendingWorkItems.connectionId,
            }
          );

          // Manually call syncDataToWebview with pending data
          const pendingData = context.pendingWorkItems;
          const workItems = pendingData.workItems;

          // Send work items update directly via postMessage
          if (context.webviewPanel?.webview?.postMessage) {
            try {
              context.webviewPanel.webview.postMessage({
                type: 'work-items-update',
                workItems: workItems,
                source: 'fsm-pending-sync',
                metadata: {
                  workItemsCount: workItems.length,
                  connectionId: pendingData.connectionId,
                  query: pendingData.query,
                  firstWorkItem: workItems[0]
                    ? {
                        id: workItems[0].id,
                        title: workItems[0].title || workItems[0].fields?.['System.Title'],
                        state: workItems[0].state || workItems[0].fields?.['System.State'],
                      }
                    : null,
                },
              });
            } catch (error) {
              console.error(
                '[ApplicationFSM] Failed to sync pending work items to webview:',
                error
              );
            }
          }
        }
      },

      clearPendingData: assign(({ context }) => {
        console.log('[ApplicationFSM] WEBVIEW_PANEL_TRACE - clearPendingData BEFORE:', {
          hasWebviewPanel: !!context.webviewPanel,
          webviewPanelType: typeof context.webviewPanel,
          contextKeys: Object.keys(context).length,
          timestamp: Date.now(),
        });

        const updatedContext = {
          ...context, // Preserve ALL existing context properties
          pendingWorkItems: undefined, // Only change what we need to change
        };

        console.log('[ApplicationFSM] WEBVIEW_PANEL_TRACE - clearPendingData AFTER:', {
          hasWebviewPanel: !!updatedContext.webviewPanel,
          webviewPanelType: typeof updatedContext.webviewPanel,
          contextKeys: Object.keys(updatedContext).length,
          timestamp: Date.now(),
        });

        return updatedContext;
      }),

      incrementRecoveryAttempts: assign(({ context }) => ({
        ...context, // Preserve ALL existing context properties
        errorRecoveryAttempts: context.errorRecoveryAttempts + 1, // Only change what we need
      })),

      markDeactivating: assign(({ context }) => ({
        ...context, // Preserve ALL existing context properties
        isDeactivating: true, // Only change what we need
      })),

      // Delegation actions (invoke single-purpose functions)
      initializeChildActors: ({ context }) => {
        initializeTimerActor(context);
      },

      delegateConnectionActivation: ({ context, event }) => {
        if (event.type === 'CONNECTION_SELECTED') {
          activateConnection(context, event.connectionId);
        }
      },

      delegateAuthenticationStart: ({ context, event }) => {
        if (event.type === 'AUTHENTICATION_REQUIRED') {
          startAuthentication(context, event.connectionId);
        }
      },

      notifyWebviewReady: ({ context }) => {
        notifyWebviewReady(context);
      },

      routeWebviewMessage: ({ context, event }) => {
        if (event.type === 'WEBVIEW_MESSAGE') {
          routeWebviewMessage(context, event.message);
        }
      },

      // Data loading debugging action
      checkForDataLoading: ({ context }) => {
        const hasActiveConnection = !!(
          context.activeConnectionId && context.connectionStates.size > 0
        );

        console.log('[ApplicationFSM] Data state idle - checking prerequisites for loading:', {
          activeConnectionId: context.activeConnectionId,
          connectionStatesSize: context.connectionStates.size,
          hasActiveConnection,
          stateBasedApproach: 'Panel existence guaranteed by state transitions',
        });
      },

      // Data synchronization actions
      syncDataToWebview: ({ context, event }) => {
        console.log('[ApplicationFSM] 🔥 syncDataToWebview ACTION CALLED!', {
          eventType: event.type,
          hasWorkItems: 'workItems' in event,
          hasData: 'data' in event,
        });

        let workItems: any[] = [];
        let connectionId: string | undefined;
        let query: string | undefined;
        let source = 'unknown';

        // Handle WORK_ITEMS_LOADED event from provider
        if (event.type === 'WORK_ITEMS_LOADED' && 'workItems' in event) {
          workItems = event.workItems || [];
          connectionId = event.connectionId;
          query = event.query;
          source = 'provider';
        }
        // Handle loadData actor result
        else if ('data' in event && event.data) {
          const data = event.data as { workItems: any[]; connectionId: string; query?: string };
          workItems = data.workItems || [];
          connectionId = data.connectionId;
          query = data.query;
          source = 'loadData';
        }

        console.log('[ApplicationFSM] Syncing data to webview store:', {
          source,
          workItemCount: workItems.length,
          eventType: event.type,
          connectionId,
          stateBasedSyncGuarantee: 'Panel guaranteed by ready state',
        });

        // Send work items update directly via postMessage
        try {
          context.webviewPanel.webview.postMessage({
            type: 'work-items-update',
            workItems: workItems,
            source: 'fsm-store-update',
            metadata: {
              workItemsCount: workItems.length,
              connectionId: connectionId,
              query: query,
              source: source,
              firstWorkItem: workItems[0]
                ? {
                    id: workItems[0].id,
                    title: workItems[0].title || workItems[0].fields?.['System.Title'],
                    state: workItems[0].state || workItems[0].fields?.['System.State'],
                  }
                : null,
            },
          });
        } catch (error) {
          console.error('[ApplicationFSM] Failed to sync work items to webview:', error);
        }
      },
    },
    actors: {
      performActivation: fromPromise(performActivation),
      performDeactivation: fromPromise(performDeactivation),
      setupUI: fromPromise(setupUI),
      loadData: fromPromise(loadData),
      recoverFromError: fromPromise(recoverFromError),
    },
  }
);

// ============================================================================
// SINGLE-PURPOSE FUNCTIONS (CALLED BY FSM ACTIONS)
// ============================================================================

/**
 * All business logic is extracted into small, testable, single-purpose functions.
 * The FSM determines WHEN these functions are called, not HOW they work.
 */

function initializeTimerActor(context: ApplicationContext) {
  try {
    // In XState v5, we use createActor instead of spawn for child actors
    const timerActor = createActor(timerMachine, { id: 'timer' });
    context.timerActor = timerActor;
    timerActor.start();
  } catch (error) {
    console.error('[ApplicationFSM] Failed to initialize timer actor:', error);
  }
}

function activateConnection(context: ApplicationContext, connectionId: string) {
  // Don't activate connection if extension is deactivating
  if (context.isDeactivating) {
    console.log(
      `[ApplicationFSM] Skipping connection activation - extension is deactivating (connectionId: ${connectionId})`
    );
    return;
  }

  const actor = context.connectionActors.get(connectionId);
  if (actor) {
    actor.send({ type: 'CONNECT' });
  } else {
    console.warn(`[ApplicationFSM] Connection actor not found: ${connectionId}`);
  }

  void (async () => {
    try {
      const connectionConfig = context.connections.find(
        (connection) => connection.id === connectionId
      );
      const connectionState = context.connectionStates.get(connectionId);
      const authMethod = connectionConfig?.authMethod ?? connectionState?.authMethod;

      const handlerOptions: ActiveConnectionHandlerOptions = { refresh: true };

      if (authMethod === 'entra') {
        const hasAccessToken =
          typeof connectionState?.accessToken === 'string' &&
          connectionState.accessToken.length > 0;
        if (!hasAccessToken) {
          handlerOptions.interactive = true;
        }
      }

      await invokeActiveConnectionHandler(connectionId, handlerOptions);
    } catch (error) {
      console.error('[ApplicationFSM] Failed to invoke active connection handler', error);
    }
  })();
}

function startAuthentication(context: ApplicationContext, connectionId: string) {
  // Don't start authentication if extension is deactivating
  if (context.isDeactivating) {
    console.log(
      `[ApplicationFSM] Skipping authentication - extension is deactivating (connectionId: ${connectionId})`
    );
    return;
  }

  const authActor = context.authActors.get(connectionId);
  if (authActor) {
    authActor.send({ type: 'START_AUTH' });
  } else {
    console.warn(`[ApplicationFSM] Auth actor not found: ${connectionId}`);
  }
}

function notifyWebviewReady(context: ApplicationContext) {
  // Don't notify webview if extension is deactivating
  if (context.isDeactivating) {
    console.log(`[ApplicationFSM] Skipping webview notification - extension is deactivating`);
    return;
  }

  if (context.webviewActor) {
    context.webviewActor.send({ type: 'PANEL_READY' });
  }
}

function routeWebviewMessage(context: ApplicationContext, message: any) {
  if (!message || typeof message !== 'object') {
    return;
  }

  if (context.isDeactivating) {
    console.log('[ApplicationFSM] Skipping webview message routing - extension is deactivating', {
      messageType: (message as { type?: unknown })?.type ?? 'unknown',
    });
    return;
  }

  let handled = false;

  switch ((message as { type?: unknown })?.type) {
    case 'timer:start':
    case 'timer:stop':
    case 'timer:pause':
      if (context.timerActor) {
        const timerEventType = String((message as { type?: string }).type)
          .split(':')[1]
          ?.toUpperCase() as TimerEvent['type'] | undefined;

        if (
          timerEventType &&
          timerEventType !== 'TICK' &&
          timerEventType !== 'ACTIVITY' &&
          timerEventType !== 'INACTIVITY_TIMEOUT' &&
          timerEventType !== 'POMODORO_BREAK'
        ) {
          context.timerActor.send({ type: timerEventType } as TimerEvent);
          handled = true;
        }
      }
      break;

    case 'connection:select':
      handled = true;
      break;

    default:
      break;
  }

  if (handled) {
    return;
  }

  void invokeWebviewMessageHandler(message);
}

// ============================================================================
// ASYNC ACTORS (SINGLE-PURPOSE ASYNC FUNCTIONS)
// ============================================================================

async function performActivation({ input }: { input: ApplicationContext }) {
  try {
    // Only perform activation in Node.js environment (extension), not webview
    if (typeof window !== 'undefined') {
      return { success: true };
    }

    const extensionContext = getExtensionContextRef();

    if (!extensionContext) {
      throw new Error('Extension context not available for command registration');
    }

    await invokeRegisterAllCommands(extensionContext);

    return { success: true, connections: [] };
  } catch (error) {
    console.error('[ApplicationFSM] Activation failed:', error);
    throw new Error(`Activation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function performDeactivation({ input }: { input?: ApplicationContext }) {
  try {
    // Clean up child actors - use defensive checks
    if (input?.timerActor) {
      input.timerActor.stop();
    }

    if (input?.connectionActors) {
      input.connectionActors.forEach((actor) => actor.stop());
    }
    if (input?.authActors) {
      input.authActors.forEach((actor) => actor.stop());
    }

    if (input?.dataActor) {
      input.dataActor.stop();
    }

    if (input?.webviewActor) {
      input.webviewActor.stop();
    }

    return { success: true };
  } catch (error) {
    console.error('[ApplicationFSM] Deactivation failed:', error);
    throw new Error(
      `Deactivation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function setupUI({ input }: { input: ApplicationContext }) {
  const emptyResult: SetupUIResult = {
    connections: [],
    activeConnectionId: undefined,
    persisted: { connections: false, activeConnectionId: false },
    summary: { ...EMPTY_NORMALIZATION_SUMMARY },
  };

  try {
    if (typeof window !== 'undefined') {
      return emptyResult;
    }

    const vscode = await import('vscode');
    const config = vscode.workspace.getConfiguration(EXTENSION_CONFIG_NAMESPACE);
    const legacyConfig = vscode.workspace.getConfiguration(LEGACY_EXTENSION_CONFIG_NAMESPACE);

    const rawConnections = config.get<unknown[]>(CONNECTIONS_CONFIG_STORAGE_KEY, []);
    const fallback = deriveLegacyFallback(config, legacyConfig);
    const normalization = normalizeConnections(rawConnections, fallback);

    if (normalization.requiresSave) {
      await config.update(
        CONNECTIONS_CONFIG_STORAGE_KEY,
        normalization.connections,
        vscode.ConfigurationTarget.Global
      );
    }

    const extensionContext = input.extensionContext ?? getExtensionContextRef();
    let persistedActiveId: string | undefined;

    if (extensionContext) {
      const storedActive = extensionContext.globalState.get(ACTIVE_CONNECTION_STORAGE_KEY);
      if (typeof storedActive === 'string' && storedActive.trim().length > 0) {
        persistedActiveId = storedActive.trim();
      }
    }

    const activeResolution = resolveActiveConnectionId(
      persistedActiveId,
      normalization.connections
    );

    if (extensionContext && activeResolution.requiresPersistence) {
      await extensionContext.globalState.update(
        ACTIVE_CONNECTION_STORAGE_KEY,
        activeResolution.activeConnectionId
      );
    }

    if (extensionContext && normalization.connections.length > 0) {
      await migrateGlobalPATToConnections(extensionContext, normalization.connections);
    }

    return {
      connections: normalization.connections,
      activeConnectionId: activeResolution.activeConnectionId,
      persisted: {
        connections: normalization.requiresSave,
        activeConnectionId: activeResolution.requiresPersistence,
      },
      summary: normalization.summary,
    };
  } catch (error) {
    console.error('[ApplicationFSM] UI setup failed:', error);
    throw new Error(`UI setup failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function loadData({ input }: { input: ApplicationContext }) {
  try {
    if (!input.activeConnectionId) {
      return { workItems: [], connectionId: null };
    }

    // Get the connection state for active connection
    const connectionState = input.connectionStates.get(input.activeConnectionId);
    if (!connectionState?.provider) {
      return { workItems: [], connectionId: input.activeConnectionId };
    }

    // Call provider to get work items (provider is now pure utility)
    const workItems = connectionState.provider.getWorkItems();

    // If no work items yet, trigger a refresh
    if (workItems.length === 0) {
      await connectionState.provider.refresh();
      // Get updated work items after refresh
      const refreshedWorkItems = connectionState.provider.getWorkItems();

      return {
        workItems: refreshedWorkItems,
        connectionId: input.activeConnectionId,
        query: connectionState.provider.currentQuery || 'My Activity',
      };
    }

    return {
      workItems,
      connectionId: input.activeConnectionId,
      query: connectionState.provider.currentQuery || 'My Activity',
    };
  } catch (error) {
    console.error('[ApplicationFSM] Data loading failed:', error);
    throw new Error(
      `Data loading failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function recoverFromError({ input }: { input: ApplicationContext }) {
  void input;
  return { recovered: true };
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ProjectConnection = {
  id: string;
  organization: string;
  project: string;
  label?: string;
  team?: string;
  patKey?: string;
  baseUrl?: string;
  apiBaseUrl?: string;
  authMethod?: 'pat' | 'entra';
  clientId?: string;
  tenantId?: string;
  identityName?: string;
};

export type ConnectionState = {
  id: string;
  config: ProjectConnection;
  client?: any;
  provider?: any;
  authMethod: 'pat' | 'entra';
  pat?: string;
  accessToken?: string;
  // LEGACY AUTH REMOVED - authService replaced by FSM authentication
  refreshFailureCount?: number;
  lastRefreshFailure?: Date;
  refreshBackoffUntil?: Date;
  reauthInProgress?: boolean;
  lastInteractiveAuthAt?: number;
};

export type AuthReminderState = {
  connectionId: string;
  status: 'pending' | 'dismissed';
  reason: string;
  detail?: string;
  label?: string;
  message?: string;
  authMethod?: 'pat' | 'entra';
  snoozeUntil?: number;
};
