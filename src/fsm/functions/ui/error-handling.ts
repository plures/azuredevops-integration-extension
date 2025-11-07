/**
 * Error Handling and User Feedback Functions
 * 
 * Provides error detection, classification, and UI state updates for authentication
 * failures, network errors, and other connection issues.
 */

import type { ApplicationContext, UIState } from '../../machines/applicationMachine.js';

/**
 * Error types that can occur in the extension
 */
export type ErrorType = 'authentication' | 'network' | 'authorization' | 'server' | 'unknown';

/**
 * Detected error information
 */
export interface DetectedError {
  type: ErrorType;
  recoverable: boolean;
  message: string;
  suggestedAction: string;
}

/**
 * Detects the type of error from an error object or message
 * 
 * @param error Error object or error message string
 * @param statusCode Optional HTTP status code
 * @returns Detected error information
 */
export function detectErrorType(error: Error | string, statusCode?: number): DetectedError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Check status code first (most reliable)
  if (statusCode) {
    if (statusCode === 401) {
      return {
        type: 'authentication',
        recoverable: true,
        message: 'Authentication failed. Your credentials may have expired.',
        suggestedAction: 'Re-authenticate',
      };
    }
    if (statusCode === 403) {
      return {
        type: 'authorization',
        recoverable: true,
        message: 'You don\'t have permission to access this resource.',
        suggestedAction: 'Check Permissions',
      };
    }
    if (statusCode === 404) {
      return {
        type: 'server',
        recoverable: false,
        message: 'Resource not found. The requested item may have been deleted.',
        suggestedAction: 'Refresh',
      };
    }
    if (statusCode >= 500) {
      return {
        type: 'server',
        recoverable: true,
        message: 'Server error occurred. Please try again later.',
        suggestedAction: 'Retry',
      };
    }
    if (statusCode === 408 || statusCode === 504) {
      return {
        type: 'network',
        recoverable: true,
        message: 'Request timed out. Check your network connection.',
        suggestedAction: 'Retry',
      };
    }
  }

  // Check error message patterns
  if (
    lowerMessage.includes('expired') ||
    lowerMessage.includes('invalid token') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('authentication failed') ||
    lowerMessage.includes('personal access token') ||
    lowerMessage.includes('401')
  ) {
    const isPatExpired = lowerMessage.includes('expired') || lowerMessage.includes('personal access token');
    return {
      type: 'authentication',
      recoverable: true,
      message: isPatExpired
        ? 'Your Personal Access Token has expired.'
        : 'Authentication failed. Invalid credentials.',
      suggestedAction: isPatExpired ? 'Update PAT' : 'Re-authenticate',
    };
  }

  if (
    lowerMessage.includes('forbidden') ||
    lowerMessage.includes('permission') ||
    lowerMessage.includes('access denied') ||
    lowerMessage.includes('403')
  ) {
    return {
      type: 'authorization',
      recoverable: true,
      message: 'You don\'t have permission to perform this action.',
      suggestedAction: 'Check Permissions',
    };
  }

  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('enotfound')
  ) {
    return {
      type: 'network',
      recoverable: true,
      message: 'Network error. Check your internet connection.',
      suggestedAction: 'Retry',
    };
  }

  if (
    lowerMessage.includes('server') ||
    lowerMessage.includes('500') ||
    lowerMessage.includes('502') ||
    lowerMessage.includes('503')
  ) {
    return {
      type: 'server',
      recoverable: true,
      message: 'Server error occurred. Please try again later.',
      suggestedAction: 'Retry',
    };
  }

  // Default to unknown
  return {
    type: 'unknown',
    recoverable: false,
    message: errorMessage || 'An unexpected error occurred.',
    suggestedAction: 'Retry',
  };
}

/**
 * Updates UI state with error information
 * 
 * @param context Current application context
 * @param error Error information
 * @param connectionId Connection ID where error occurred
 * @returns Partial UIState with error information
 */
export function updateUIStateForError(
  context: ApplicationContext,
  error: {
    message: string;
    type: string;
    connectionId: string;
  }
): Partial<UIState> {
  const detectedError = detectErrorType(error.message);
  const now = Date.now();

  // Get existing connection health or create new
  const existingHealth = context.ui?.connectionHealth;
  const lastSuccess = existingHealth?.status === 'healthy' ? existingHealth.lastSuccess : undefined;

  return {
    connectionHealth: {
      status: 'error',
      lastSuccess,
      lastFailure: now,
      lastError: {
        message: detectedError.message,
        type: detectedError.type,
        recoverable: detectedError.recoverable,
        suggestedAction: detectedError.suggestedAction,
      },
    },
    statusMessage: {
      text: detectedError.message,
      type: 'error' as const,
    },
  };
}

/**
 * Updates UI state with refresh status
 * 
 * @param success Whether the refresh was successful
 * @param error Optional error message if refresh failed
 * @param nextAutoRefresh Optional timestamp for next auto-refresh
 * @returns Partial UIState with refresh status
 */
export function updateRefreshStatus(
  success: boolean,
  error?: string,
  nextAutoRefresh?: number
): Partial<UIState> {
  return {
    refreshStatus: {
      lastAttempt: Date.now(),
      success,
      error,
      nextAutoRefresh,
    },
  };
}

/**
 * Clears error state from UI
 * 
 * @returns Partial UIState with cleared error information
 */
export function clearErrorState(): Partial<UIState> {
  return {
    connectionHealth: {
      status: 'healthy',
      lastSuccess: Date.now(),
      lastFailure: undefined,
      lastError: undefined,
    },
    statusMessage: undefined,
  };
}

