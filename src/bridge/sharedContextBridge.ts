/**
 * Module: SharedContextBridge
 * Owner: application
 * Reads: Application FSM state; transforms to webview-ready payloads
 * Writes: none to ApplicationContext (broadcasts to webview only)
 * Receives: webview messages (forwarded to FSM); actor reference
 * Emits: syncState messages to webview
 * Prohibitions: Do not implement webview logic; Do not mutate ApplicationContext
 * Rationale: Single bridge for serializing FSM context to webview payloads
 *
 * LLM-GUARD:
 * - Post only syncState (or typed) messages; do not send partial context mutations
 * - Do not define new context types here
 *
 * This module now uses Praxis logic engine instead of XState.
 */
import type { Disposable, Webview } from 'vscode';
import type { PraxisApplicationManager } from '../praxis/application/manager.js';
import type { ProjectConnection } from '../praxis/connection/types.js';

export type Logger = (message: string, meta?: Record<string, unknown>) => void;

// Define ApplicationContext type for compatibility
interface ApplicationContext {
  isActivated?: boolean;
  isDeactivating?: boolean;
  connections?: ProjectConnection[];
  activeConnectionId?: string;
  connectionStates?: Map<string, unknown>;
  pendingAuthReminders?:
    | Map<string, { connectionId: string; reason: string; status: string }>
    | Array<{
        connectionId: string;
        reason?: string;
        status?: string;
        detail?: string;
        message?: string;
        label?: string;
        authMethod?: 'pat' | 'entra';
      }>;
  lastError?: { message: string; name?: string; stack?: string };
  pendingWorkItems?: { workItems?: unknown[]; connectionId?: string };
}

export type SharedContextBridgeOptions = {
  actor: PraxisApplicationManager | unknown;
  logger?: Logger;
  contextSelector?: (context: ApplicationContext) => SharedContextPayload;
};

export interface SharedContextBridge extends Disposable {
  attachWebview(webview: Webview): void;
  detachWebview(): void;
  handleWebviewMessage(message: unknown): boolean;
  sync(): void;
}

// For Praxis-Svelte integration, the payload is the full ApplicationContext
export type SharedContextPayload = ApplicationContext;

export function createSharedContextBridge({
  actor,
  logger,
  contextSelector,
}: SharedContextBridgeOptions): SharedContextBridge {
  const applicationManager = actor as PraxisApplicationManager;
  let currentWebview: Webview | undefined;
  let disposed = false;
  let lastSignature = '';
  let pollInterval: ReturnType<typeof setInterval> | undefined;

  function log(message: string, meta?: Record<string, unknown>) {
    try {
      logger?.(message, meta);
    } catch (error) {
      // Logger failed - silently ignore to satisfy ESLint
    }
  }

  // Poll for state changes since Praxis doesn't have built-in subscriptions
  function startPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(() => {
      maybePostContext('poll');
    }, 100);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = undefined;
    }
  }

  function getApplicationContext(): ApplicationContext {
    try {
      // Check if actor is a PraxisApplicationManager
      if (applicationManager && typeof applicationManager.getContext === 'function') {
        // Return the full context for Praxis sync
        return applicationManager.getContext() as unknown as ApplicationContext;
      }
    } catch (error) {
      log('getApplicationContextFailed', { error: serializeError(error) });
    }
    return {};
  }

  function buildPayload(context: ApplicationContext): SharedContextPayload {
    // If we are using Praxis sync, we just return the context as is (casted to payload for now)
    // The webview will handle the types.
    // We still support the old selector for backward compatibility if needed,
    // but for the new architecture, we want the raw context.

    if (contextSelector) {
      return contextSelector(context);
    }

    // For Praxis-Svelte integration, we send the raw context.
    // The types in SharedContextPayload might not match exactly, but we'll fix the receiver side.
    return context as unknown as SharedContextPayload;
  }

  function maybePostContext(reason: string) {
    if (!currentWebview) {
      return;
    }

    try {
      const context = getApplicationContext();
      const payload = buildPayload(context);
      const signature = JSON.stringify(payload);
      if (signature === lastSignature) {
        return;
      }
      lastSignature = signature;

      const state =
        applicationManager && typeof applicationManager.getApplicationState === 'function'
          ? applicationManager.getApplicationState()
          : 'unknown';

      const message = {
        type: 'contextUpdate',
        context: payload,
        meta: {
          reason,
          state,
        },
      };

      const maybeThenable = currentWebview.postMessage(message);
      if (typeof (maybeThenable as Thenable<boolean> | undefined)?.then === 'function') {
        (maybeThenable as Thenable<boolean>).then(undefined, (error) => {
          log('postMessageFailed', { error: serializeError(error) });
        });
      }
    } catch (error) {
      log('contextSerializationFailed', { error: serializeError(error) });
    }
  }

  function synchronizeImmediately(reason: string) {
    maybePostContext(reason);
  }

  function handleWebviewMessage(message: unknown): boolean {
    if (!message || typeof message !== 'object') {
      return false;
    }
    const msg = message as { type?: unknown };
    if (msg.type === 'getContext') {
      synchronizeImmediately('explicit-request');
      return true;
    }
    return false;
  }

  // Start polling when created
  startPolling();

  return {
    attachWebview(webview: Webview) {
      currentWebview = webview;
      synchronizeImmediately('webview-attached');
    },
    detachWebview() {
      currentWebview = undefined;
    },
    handleWebviewMessage,
    sync() {
      synchronizeImmediately('manual-sync');
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      stopPolling();
      currentWebview = undefined;
    },
  };
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }
  if (typeof error === 'object' && error) {
    return { ...error } as Record<string, unknown>;
  }
  return { value: String(error) };
}
