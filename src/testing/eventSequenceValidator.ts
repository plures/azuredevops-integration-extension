/**
 * Event Sequence Validator
 *
 * Validates that events are processed in correct order and produce expected state.
 */

import type { ApplicationEngineContext } from '../praxis/application/engine.js';
import type { PraxisEvent } from '@plures/praxis';
import { history } from '../webview/praxis/store.js';
import { frontendEngine } from '../webview/praxis/frontendEngine.js';
import type { HistoryEntry } from '@plures/praxis/svelte';

/**
 * A validator function that checks state after an event
 */
export type StateValidator = (
  context: ApplicationEngineContext,
  history: HistoryEntry<ApplicationEngineContext>[]
) => boolean | { valid: boolean; message?: string };

/**
 * An event sequence test
 */
export interface EventSequenceTest {
  name: string;
  description?: string;
  sequence: PraxisEvent[];
  validators: Array<{
    afterIndex: number;
    validator: StateValidator;
    errorMessage?: string;
  }>;
  setup?: (context: ApplicationEngineContext) => ApplicationEngineContext;
}

/**
 * Result of event sequence validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    index: number;
    event: string;
    message: string;
  }>;
  warnings: Array<{
    index: number;
    event: string;
    message: string;
  }>;
}

/**
 * Validate an event sequence
 */
export function validateEventSequence(test: EventSequenceTest): ValidationResult {
  // Reset engine
  resetEngine(test.setup);

  const errors: ValidationResult['errors'] = [];
  const warnings: ValidationResult['warnings'] = [];

  // Apply events and validate
  for (let i = 0; i < test.sequence.length; i++) {
    const event = test.sequence[i];

    // Dispatch event
    frontendEngine.step([event]);

    // Run validators for this index
    const validators = test.validators.filter((v) => v.afterIndex === i);

    for (const validatorConfig of validators) {
      const ctx = frontendEngine.getContext();
      const historyEntries = history.getHistory();

      const result = validatorConfig.validator(ctx, historyEntries);

      if (typeof result === 'boolean') {
        if (!result) {
          errors.push({
            index: i,
            event: event.tag,
            message: validatorConfig.errorMessage || `Validation failed after event ${i}`,
          });
        }
      } else {
        if (!result.valid) {
          errors.push({
            index: i,
            event: event.tag,
            message:
              result.message ||
              validatorConfig.errorMessage ||
              `Validation failed after event ${i}`,
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Create a validator function that checks a specific context property
 */
export function checkProperty<T>(
  property: keyof ApplicationEngineContext,
  expectedValue: T,
  message?: string
): StateValidator {
  return (context) => {
    const actualValue = context[property] as T;
    const valid = actualValue === expectedValue;

    if (!valid) {
      return {
        valid: false,
        message:
          message || `Expected ${String(property)} to be ${expectedValue}, got ${actualValue}`,
      };
    }

    return true;
  };
}

/**
 * Create a validator function that checks a condition
 */
export function checkCondition(
  condition: (context: ApplicationEngineContext) => boolean,
  message: string
): StateValidator {
  return (context) => {
    const valid = condition(context);
    return {
      valid,
      message: valid ? undefined : message,
    };
  };
}

/**
 * Create a validator function that checks state value
 */
export function checkState(expectedState: string): StateValidator {
  return (context) => {
    const valid = context.applicationState === expectedState;
    return {
      valid,
      message: valid
        ? undefined
        : `Expected state "${expectedState}", got "${context.applicationState}"`,
    };
  };
}

/**
 * Create a validator function that checks history length
 */
export function checkHistoryLength(expectedLength: number): StateValidator {
  return (_context, historyEntries) => {
    const valid = historyEntries.length === expectedLength;
    return {
      valid,
      message: valid
        ? undefined
        : `Expected history length ${expectedLength}, got ${historyEntries.length}`,
    };
  };
}

/**
 * Reset engine to initial state
 */
function resetEngine(
  setup?: (context: ApplicationEngineContext) => ApplicationEngineContext
): void {
  const initialContext: ApplicationEngineContext = {
    applicationState: 'inactive',
    applicationData: {},
    timerHistory: { entries: [] },
    isActivated: false,
    isDeactivating: false,
    connections: [],
    viewMode: 'list',
    errorRecoveryAttempts: 0,
    debugLoggingEnabled: false,
    debugViewVisible: false,
    connectionStates: new Map(),
    connectionWorkItems: new Map(),
    connectionQueries: new Map(),
    connectionFilters: new Map(),
    connectionViewModes: new Map(),
    pendingAuthReminders: new Map(),
    workItems: [],
    activeQuery: null,
    timerState: null,
    lastError: null,
    kanbanColumns: [],
    workItemsError: null,
    workItemsErrorConnectionId: null,
    deviceCodeSession: null,
    authCodeFlowSession: null,
  };

  const context = setup ? setup(initialContext) : initialContext;
  frontendEngine.updateContext(() => context);
  history.clearHistory();
}

/**
 * Create a test function from an event sequence test
 */
export function createEventSequenceTest(test: EventSequenceTest) {
  return () => {
    const result = validateEventSequence(test);

    if (!result.valid) {
      const errorMessages = result.errors
        .map((e) => `After event ${e.index} (${e.event}): ${e.message}`)
        .join('\n');

      throw new Error(`Event sequence test "${test.name}" failed:\n${errorMessages}`);
    }
  };
}
