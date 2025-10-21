import { describe, it } from 'mocha';
import { expect } from 'chai';
import { buildAuthReminder } from '../../src/fsm/functions/auth/buildAuthReminder.js';
import type {
  ApplicationContext,
  AuthReminderReason,
  AuthReminderState,
  ConnectionState,
  ProjectConnection,
} from '../../src/fsm/machines/applicationMachine.js';

function createConnection(
  id: string,
  overrides: Partial<ProjectConnection> = {}
): ProjectConnection {
  return {
    id,
    organization: 'org',
    project: 'project',
    authMethod: 'entra',
    ...overrides,
  };
}

function createConnectionState(
  connection: ProjectConnection,
  overrides: Partial<ConnectionState> = {}
): ConnectionState {
  return {
    id: connection.id,
    config: connection,
    authMethod: connection.authMethod ?? 'pat',
    ...overrides,
  };
}

function createContext(
  connection: ProjectConnection,
  pendingReminders: Map<string, AuthReminderState> = new Map()
): ApplicationContext {
  const connectionState = createConnectionState(connection);

  return {
    isActivated: true,
    isDeactivating: false,
    connections: [connection],
    activeConnectionId: connection.id,
    connectionStates: new Map([[connection.id, connectionState]]),
    pendingAuthReminders: pendingReminders,
    extensionContext: undefined,
    webviewBridge: undefined,
    outputChannel: undefined,
    statusBarItem: undefined,
    authStatusBarItem: undefined,
    webviewPanel: undefined,
    pendingWorkItems: undefined,
    timerActor: undefined,
    connectionActors: new Map(),
    authActors: new Map(),
    dataActor: undefined,
    webviewActor: undefined,
    lastError: undefined,
    errorRecoveryAttempts: 0,
  } as unknown as ApplicationContext;
}

describe('buildAuthReminder', () => {
  const reason: AuthReminderReason = 'tokenExpired';

  it('returns null when connection state is missing', () => {
    const connection = createConnection('missing');
    const context = createContext(connection);
    context.connectionStates = new Map();

    const reminder = buildAuthReminder(context, {
      connectionId: connection.id,
      reason,
    });

    expect(reminder).to.be.null;
  });

  it('returns null when a pending reminder already exists', () => {
    const connection = createConnection('existing');
    const existingReminder: AuthReminderState = {
      connectionId: connection.id,
      status: 'pending',
      reason,
    };
    const pending = new Map([[connection.id, existingReminder]]);
    const context = createContext(connection, pending);

    const reminder = buildAuthReminder(context, {
      connectionId: connection.id,
      reason,
    });

    expect(reminder).to.be.null;
  });

  it('returns null when reminder is snoozed into the future', () => {
    const connection = createConnection('snoozed');
    const existingReminder: AuthReminderState = {
      connectionId: connection.id,
      status: 'dismissed',
      reason,
      snoozeUntil: Date.now() + 60_000,
    };
    const pending = new Map([[connection.id, existingReminder]]);
    const context = createContext(connection, pending);

    const reminder = buildAuthReminder(context, {
      connectionId: connection.id,
      reason,
    });

    expect(reminder).to.be.null;
  });

  it('builds a reminder with formatted detail and message', () => {
    const connection = createConnection('detail', { label: 'Friendly' });
    const context = createContext(connection);

    const reminder = buildAuthReminder(context, {
      connectionId: connection.id,
      reason: 'refreshFailed',
      detail: 'Token refresh failed twice.',
      now: Date.now(),
    });

    expect(reminder).to.not.be.null;
    expect(reminder).to.include({
      connectionId: connection.id,
      status: 'pending',
      reason: 'refreshFailed',
      label: 'Friendly',
      authMethod: 'entra',
    });
    expect(reminder?.message).to.equal(
      'Microsoft Entra sign-in required for Friendly: token refresh failed.'
    );
    expect(reminder?.detail).to.include('Token refresh failed twice.');
    expect(reminder?.detail).to.include(
      'Use Sign In here or select the authentication status bar item to reconnect.'
    );
  });

  it('falls back to organization/project label when custom label missing', () => {
    const connection = createConnection('label', {
      label: undefined,
      organization: 'orgA',
      project: 'projA',
    });
    const context = createContext(connection);

    const reminder = buildAuthReminder(context, {
      connectionId: connection.id,
      reason,
    });

    expect(reminder).to.not.be.null;
    expect(reminder?.label).to.equal('orgA/projA');
  });
});
