/**
 * Event Registry
 *
 * Strict TypeScript Discriminated Unions for all application events.
 * This ensures compile-time safety for event processing.
 */

export interface ConnectionConfig {
  id: string;
  name: string;
  orgUrl: string;
  token: string;
  project?: string;
  isActive: boolean;
}

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  remediation?: string;
}

export type ConnectionEvent =
  | { type: 'CONNECTION_ADDED'; payload: ConnectionConfig }
  | { type: 'CONNECTION_REMOVED'; payload: { id: string } }
  | { type: 'CONNECTION_UPDATED'; payload: Partial<ConnectionConfig> & { id: string } }
  | { type: 'CONNECTION_SELECTED'; payload: { id: string } }
  | { type: 'CONNECTION_ERROR'; payload: { id: string; error: AppError } }
  | {
      type: 'CONNECTIONS_LOADED';
      payload: { connections: ConnectionConfig[]; activeId: string | null };
    };

export type AuthEvent =
  | { type: 'AUTH_STARTED'; payload: { provider: string } }
  | { type: 'AUTH_SUCCESS'; payload: { token: string } }
  | { type: 'AUTH_FAILED'; payload: { reason: string } };

export type AppEvent = ConnectionEvent | AuthEvent;
