import { describe, it } from 'mocha';
import { expect } from 'chai';
import type {
  ApplicationContext,
  ConnectionState,
} from '../../src/fsm/machines/applicationTypes.js';
import {
  planRequireAuthentication,
  type RequireAuthenticationMessage,
} from '../../src/fsm/functions/auth/requireAuthentication.js';

describe('auth.requireAuthentication.planRequireAuthentication', () => {
  const buildContext = (
    overrides: Partial<ApplicationContext> = {},
    connectionOverrides: Partial<ConnectionState> = {}
  ): ApplicationContext => {
    const baseConnection: ConnectionState = {
      connectionId: 'conn-1',
      config: {
        id: 'conn-1',
        organization: 'org',
        project: 'proj',
      } as any,
      authMethod: 'entra',
      isConnected: false,
      retryCount: 0,
      refreshFailureCount: 0,
      reauthInProgress: false,
      forceInteractive: false,
    };

    const connectionState = { ...baseConnection, ...connectionOverrides };

    const base: Partial<ApplicationContext> = {
      isActivated: true,
      isDeactivating: false,
      connections: [connectionState.config],
      activeConnectionId: connectionState.connectionId,
      connectionStates: new Map([[connectionState.connectionId, connectionState]]),
      pendingAuthReminders: new Map(),
      extensionContext: undefined,
      webviewPanel: undefined,
      pendingWorkItems: undefined,
      timerActor: undefined,
      connectionActors: new Map(),
      authActors: new Map(),
      dataActor: undefined,
      webviewActor: undefined,
      lastError: undefined,
      errorRecoveryAttempts: 0,
    };

    const merged = { ...base, ...overrides };
    if (!merged.connectionStates) {
      merged.connectionStates = new Map();
    }

    return merged as ApplicationContext;
  };

  it('returns interactive plan when connection ready', () => {
    const context = buildContext();
    const message: RequireAuthenticationMessage = {
      type: 'requireAuthentication',
      connectionId: 'conn-1',
    };

    const plan = planRequireAuthentication(context, message);

    expect(plan.connectionId).to.equal('conn-1');
    expect(plan.interactiveAuth).to.deep.equal({
      connectionId: 'conn-1',
      reason: 'authFailed',
    });
    expect(plan.warnings).to.be.empty;
  });

  it('warns when connection missing', () => {
    const context = buildContext({}, { connectionId: 'different' });
    const message: RequireAuthenticationMessage = {
      type: 'requireAuthentication',
      connectionId: 'conn-1',
    };

    const plan = planRequireAuthentication(context, message);

    expect(plan.connectionId).to.equal('conn-1');
    expect(plan.interactiveAuth).to.be.undefined;
    expect(plan.warnings).to.include('connection_state_missing');
  });

  it('warns when reauth already in progress', () => {
    const context = buildContext({}, { reauthInProgress: true });
    const message: RequireAuthenticationMessage = {
      type: 'requireAuthentication',
      connectionId: 'conn-1',
    };

    const plan = planRequireAuthentication(context, message);

    expect(plan.interactiveAuth).to.be.undefined;
    expect(plan.warnings).to.include('reauth_in_progress');
  });

  it('warns when connection id missing', () => {
    const context = buildContext();
    const message: RequireAuthenticationMessage = {
      type: 'requireAuthentication',
    };

    const plan = planRequireAuthentication(context, message);

    expect(plan.connectionId).to.be.undefined;
    expect(plan.interactiveAuth).to.be.undefined;
    expect(plan.warnings).to.include('missing_connection_id');
  });
});
