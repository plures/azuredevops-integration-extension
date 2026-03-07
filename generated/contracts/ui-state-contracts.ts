// ⚠️  GENERATED FILE – do not edit manually.
// Source of truth: src/praxis/application/schema/index.ts
// Regenerate:      npm run derive
// Description:     UI state type contracts derived from the Praxis fact registry

/**
 * All valid application states, derived from Praxis lifecycle rules.
 */
export type ApplicationState =
  | 'inactive'
  | 'activating'
  | 'active'
  | 'activation_error'
  | 'deactivating'
  | 'error_recovery';

/**
 * Union of all application fact tags.
 * Each entry corresponds to a `defineFact` call in facts.ts.
 */
export type ApplicationFactTag =
  | 'ApplicationState'
  | 'IsActivated'
  | 'IsDeactivating'
  | 'Connections'
  | 'ActiveConnectionId'
  | 'ActiveQuery'
  | 'ViewMode'
  | 'PendingWorkItems'
  | 'DeviceCodeSession'
  | 'AuthCodeFlowSession'
  | 'ErrorRecoveryAttempts'
  | 'LastError'
  | 'DebugLoggingEnabled'
  | 'DebugViewVisible';

/**
 * Typed fact change notification consumed by the Svelte stores layer.
 */
export type FactChangeEvent =
  | { fact: 'ApplicationState' }
  | { fact: 'IsActivated' }
  | { fact: 'IsDeactivating' }
  | { fact: 'Connections' }
  | { fact: 'ActiveConnectionId' }
  | { fact: 'ActiveQuery' }
  | { fact: 'ViewMode' }
  | { fact: 'PendingWorkItems' }
  | { fact: 'DeviceCodeSession' }
  | { fact: 'AuthCodeFlowSession' }
  | { fact: 'ErrorRecoveryAttempts' }
  | { fact: 'LastError' }
  | { fact: 'DebugLoggingEnabled' }
  | { fact: 'DebugViewVisible' };

/**
 * All UI-relevant application state grouped by concern.
 */
export interface UiStateContract {
  applicationState: ApplicationState;
  isActivated: boolean;
  activeConnectionId: string | undefined;
  activeQuery: string | undefined;
  viewMode: 'list' | 'kanban' | 'board';
  debugViewVisible: boolean;
  lastError: { message: string; stack?: string; connectionId?: string } | undefined;
}
