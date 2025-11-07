export type ProjectConnection = {
  id: string;
  label?: string;
  organization: string;
  project: string;
  team?: string;
  baseUrl?: string;
  apiBaseUrl?: string;
  authMethod?: 'pat' | 'entra';
  patKey?: string;
  tenantId?: string;
  identityName?: string;
  // Metadata for safe conversion
  isBeingReplaced?: boolean; // Marks connection pending deletion after replacement succeeds
  replacementId?: string; // ID of the temp connection that will replace this one
};

export type ConnectionContext = {
  connectionId: string;
  config: ProjectConnection;
  client?: any;
  provider?: any;
  authMethod: 'pat' | 'entra';
  credential?: string;
  pat?: string;
  accessToken?: string;
  isConnected: boolean;
  lastError?: string;
  retryCount: number;
  refreshFailureCount: number;
  lastRefreshFailure?: Date;
  accessTokenExpiresAt?: number;
  refreshBackoffUntil?: Date;
  reauthInProgress: boolean;
  lastInteractiveAuthAt?: number;
  forceInteractive: boolean;
};

export type AuthReminderReason = 'tokenExpired' | 'refreshFailed' | 'authFailed';

export type AuthReminderState = {
  connectionId: string;
  status: 'pending' | 'dismissed';
  reason: AuthReminderReason;
  detail?: string;
  snoozeUntil?: number;
};

export type ConnectionEvent =
  | { type: 'CONNECT'; config: ProjectConnection; forceInteractive?: boolean }
  | { type: 'AUTHENTICATE'; interactive?: boolean }
  | { type: 'AUTH_SUCCESS'; credential: string }
  | { type: 'AUTH_FAILED'; error: string }
  | { type: 'CREATE_CLIENT' }
  | { type: 'CLIENT_CREATED'; client: any }
  | { type: 'CLIENT_FAILED'; error: string }
  | { type: 'CREATE_PROVIDER' }
  | { type: 'PROVIDER_CREATED'; provider: any }
  | { type: 'PROVIDER_FAILED'; error: string }
  | { type: 'CONNECTION_SUCCESS' }
  | { type: 'CONNECTION_FAILED'; error: string }
  | { type: 'DISCONNECT' }
  | { type: 'RETRY' }
  | { type: 'RESET' }
  | { type: 'REFRESH_AUTH' }
  | { type: 'TOKEN_EXPIRED' }
  | { type: 'NOTIFICATION_RESULT'; selection: string };
