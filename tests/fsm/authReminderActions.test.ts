import { describe, it } from 'mocha';
import { expect } from 'chai';
import type {
  ApplicationContext,
  AuthReminderState,
} from '../../src/fsm/machines/applicationMachine.js';
import {
  handleAuthReminderAction,
  type AuthReminderActionMessage,
  AUTH_REMINDER_SNOOZE_MS,
} from '../../src/fsm/functions/auth/authReminderActions.js';

describe('authReminderActions.handleAuthReminderAction', () => {
  const buildContext = (overrides: Partial<ApplicationContext> = {}): ApplicationContext => {
    const base = {
      isActivated: true,
      isDeactivating: false,
      connections: [],
      activeConnectionId: undefined,
      connectionStates: new Map(),
      pendingAuthReminders: new Map<string, AuthReminderState>(),
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
    } satisfies Partial<ApplicationContext>;

    return { ...base, ...overrides } as ApplicationContext;
  };

  it('returns plan for signIn and clears reminder', () => {
    const reminder: AuthReminderState = {
      connectionId: 'conn-1',
      status: 'pending',
      reason: 'authFailed',
      detail: 'Re-auth required',
      label: 'Conn 1',
      authMethod: 'entra',
    };

    const context = buildContext({
      pendingAuthReminders: new Map([[reminder.connectionId, reminder]]),
    });

    const message: AuthReminderActionMessage = {
      type: 'authReminderAction',
      connectionId: 'conn-1',
      action: 'signIn',
    };

    const plan = handleAuthReminderAction(context, message, { now: 1000 });

    expect(plan.handled).to.equal(true);
    expect(plan.notify).to.deep.equal({ type: 'clear', connectionId: 'conn-1' });
    expect(plan.interactiveAuth).to.deep.equal({
      connectionId: 'conn-1',
      reason: 'authFailed',
      detail: 'Re-auth required',
    });
    expect(plan.pendingAuthReminders.has('conn-1')).to.equal(false);
  });

  it('dismisses reminder and schedules snooze', () => {
    const connectionId = 'conn-2';
    const reminderState: AuthReminderState = {
      connectionId,
      status: 'pending',
      reason: 'authFailed',
      detail: 'Retry later',
      authMethod: 'entra',
    };

    const context = buildContext({
      pendingAuthReminders: new Map([[connectionId, reminderState]]),
    });

    const message: AuthReminderActionMessage = {
      type: 'authReminderAction',
      connectionId,
      action: 'dismiss',
    };

    const plan = handleAuthReminderAction(context, message, { now: 5000, snoozeMs: 10 });

    expect(plan.handled).to.equal(true);
    const updated = plan.pendingAuthReminders.get(connectionId);
    expect(updated?.status).to.equal('dismissed');
    expect(updated?.snoozeUntil).to.equal(5010);
    expect(plan.notify).to.be.undefined;
    expect(plan.warnings).to.be.empty;
  });

  it('provides warning when action missing', () => {
    const context = buildContext();
    const message: AuthReminderActionMessage = {
      type: 'authReminderAction',
      connectionId: 'conn-3',
    };

    const plan = handleAuthReminderAction(context, message);

    expect(plan.handled).to.equal(false);
    expect(plan.warnings).to.include('missing_action');
  });

  it('builds reminder when dismiss called without existing entry', () => {
    const context = buildContext({
      connectionStates: new Map([
        [
          'conn-4',
          {
            config: {
              id: 'conn-4',
              label: 'Conn 4',
              authMethod: 'entra',
              organization: 'org',
              project: 'proj',
            },
          } as any,
        ],
      ]),
      connections: [
        {
          id: 'conn-4',
          label: 'Conn 4',
          authMethod: 'entra',
          organization: 'org',
          project: 'proj',
        } as any,
      ],
    });

    const plan = handleAuthReminderAction(context, {
      type: 'authReminderAction',
      connectionId: 'conn-4',
      action: 'dismiss',
    });

    expect(plan.handled).to.equal(true);
    const reminder = plan.pendingAuthReminders.get('conn-4');
    expect(reminder).to.not.be.undefined;
    expect(reminder?.status).to.equal('dismissed');
    expect(reminder?.snoozeUntil).to.be.greaterThan(Date.now() - AUTH_REMINDER_SNOOZE_MS);
  });
});
