/**
 * Module: src/fsm/functions/webview/toggleDebugView.ts
 * Owner: webview
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
import { fsmLogger, FSMComponent } from '../../logging/FSMLogger.js';
import type { ApplicationContext } from '../../machines/applicationTypes.js';

/**
 * Pure function to toggle debug view visibility.
 * Enforces FSM-first pattern: receives context, returns partial context updates only.
 */
export function toggleDebugView(context: Pick<ApplicationContext, 'debugViewVisible'>) {
  const next = !context.debugViewVisible;
  try {
    fsmLogger.debug(
      FSMComponent.WEBVIEW,
      'Toggling debug view visibility',
      {
        state: next ? 'visible' : 'hidden',
        event: 'TOGGLE_DEBUG_VIEW',
        component: FSMComponent.WEBVIEW,
      },
      { previous: context.debugViewVisible, next }
    );
  } catch {
    // Ignore logging errors (e.g. during early activation or test environments)
  }
  return { debugViewVisible: next };
}
