/**
 * Module: src/auth/authTelemetry.ts
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
 * Authentication Telemetry
 *
 * Structured telemetry events for authentication lifecycle:
 * success, failure, admin-block, and flow selection.
 * No PII is captured — only structural and error-category metadata.
 */

import { createLogger } from '../logging/unifiedLogger.js';

const telemetryLogger = createLogger('auth-telemetry');

export type AuthFlow = 'auth-code-pkce' | 'device-code' | 'pat';
export type AuthFailureReason =
  | 'user_cancelled'
  | 'token_exchange_failed'
  | 'silent_refresh_failed'
  | 'admin_block'
  | 'consent_required'
  | 'mfa_required'
  | 'tenant_not_found'
  | 'app_not_registered'
  | 'timeout'
  | 'unknown';

export interface AuthSuccessEvent {
  connectionId: string;
  flow: AuthFlow;
  scopes: string[];
  silentRefresh: boolean;
  expiresInSeconds?: number;
}

export interface AuthFailureEvent {
  connectionId: string;
  flow: AuthFlow;
  reason: AuthFailureReason;
  /** AADSTS error code (e.g. "AADSTS65001") — no PII */
  msalErrorCode?: string;
  retryCount: number;
}

export interface AuthFlowSelectedEvent {
  connectionId: string;
  flow: AuthFlow;
  fallbackFromFlow?: AuthFlow;
}

export interface PatOptInEvent {
  connectionId: string;
  /** Whether the user explicitly opted in to PAT via the setting */
  settingEnabled: boolean;
}

/**
 * Classify an MSAL/OAuth error message into a structured reason.
 * Matches well-known AADSTS codes and common error strings.
 */
export function classifyAuthFailure(errorMessage: string): AuthFailureReason {
  if (!errorMessage) return 'unknown';
  return matchFailureReason(errorMessage.toUpperCase());
}

/** Maps token patterns to their AuthFailureReason category. */
const FAILURE_PATTERNS: ReadonlyArray<{ tokens: string[]; reason: AuthFailureReason }> = [
  {
    tokens: ['AADSTS90094', 'AADSTS90008', 'ADMIN_POLICY'],
    reason: 'admin_block',
  },
  {
    tokens: ['AADSTS65004', 'AADSTS50126', 'USER_CANCEL', 'ACCESS_DENIED'],
    reason: 'user_cancelled',
  },
  { tokens: ['AADSTS65001', 'CONSENT_REQUIRED'], reason: 'consent_required' },
  { tokens: ['AADSTS50076', 'MFA', 'MULTI_FACTOR'], reason: 'mfa_required' },
  { tokens: ['AADSTS50058', 'TENANT_NOT_FOUND'], reason: 'tenant_not_found' },
  { tokens: ['AADSTS700016', 'APPLICATION_NOT_FOUND'], reason: 'app_not_registered' },
  { tokens: ['TIMEOUT', 'EXPIRED'], reason: 'timeout' },
];

function matchFailureReason(msg: string): AuthFailureReason {
  for (const { tokens, reason } of FAILURE_PATTERNS) {
    if (tokens.some((t) => msg.includes(t))) return reason;
  }
  // token_exchange_failed requires both TOKEN and (FAIL or EXCHANGE) — compound match
  if (msg.includes('TOKEN') && (msg.includes('FAIL') || msg.includes('EXCHANGE'))) {
    return 'token_exchange_failed';
  }
  return 'unknown';
}

/** Emit structured telemetry for a successful authentication. */
export function recordAuthSuccess(event: AuthSuccessEvent): void {
  telemetryLogger.info('auth.success', {
    meta: {
      connectionId: event.connectionId,
      flow: event.flow,
      scopeCount: event.scopes.length,
      silentRefresh: event.silentRefresh,
      expiresInSeconds: event.expiresInSeconds,
    },
  });
}

/** Emit structured telemetry for a failed authentication. */
export function recordAuthFailure(event: AuthFailureEvent): void {
  telemetryLogger.warn('auth.failure', {
    meta: {
      connectionId: event.connectionId,
      flow: event.flow,
      reason: event.reason,
      msalErrorCode: event.msalErrorCode,
      retryCount: event.retryCount,
    },
  });
}

/** Emit telemetry when the flow selection changes (e.g. fallback from auth-code to device-code). */
export function recordAuthFlowSelected(event: AuthFlowSelectedEvent): void {
  telemetryLogger.info('auth.flow_selected', {
    meta: {
      connectionId: event.connectionId,
      flow: event.flow,
      fallbackFromFlow: event.fallbackFromFlow,
    },
  });
}

/** Emit telemetry when PAT opt-in is observed. */
export function recordPatOptIn(event: PatOptInEvent): void {
  telemetryLogger.info('auth.pat_opt_in', {
    meta: {
      connectionId: event.connectionId,
      settingEnabled: event.settingEnabled,
    },
  });
}
