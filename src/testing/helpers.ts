/**
 * Testing Helpers
 * 
 * Utility functions for writing tests with history engine.
 */

import { frontendEngine } from '../webview/praxis/frontendEngine.js';
import { history } from '../webview/praxis/store.js';
import type { ApplicationEngineContext } from '../praxis/application/engine.js';

/**
 * Wait for a specific state condition
 */
export async function waitForState(
  condition: (context: ApplicationEngineContext) => boolean,
  timeout: number = 5000
): Promise<void> {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const check = () => {
      const context = frontendEngine.getContext();
      
      if (condition(context)) {
        resolve();
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for state condition after ${timeout}ms`));
        return;
      }
      
      setTimeout(check, 50);
    };
    
    check();
  });
}

/**
 * Wait for a specific state value
 */
export async function waitForStateValue(
  expectedState: string,
  timeout: number = 5000
): Promise<void> {
  return waitForState((ctx) => ctx.applicationState === expectedState, timeout);
}

/**
 * Reset engine to initial state
 */
export async function resetEngine(_setup?: (context: ApplicationEngineContext) => ApplicationEngineContext): Promise<void> {
  // Clear history first
  history.clearHistory();
  
  // For testing, we'll use ResetApplicationEvent to reset state
  // This is the proper way to reset via Praxis events
  const factsModule = await import('../../src/praxis/application/facts.js');
  const { ResetApplicationEvent } = factsModule;
  
  // Dispatch reset event if available
  if (ResetApplicationEvent) {
    try {
      frontendEngine.step([ResetApplicationEvent.create({})]);
    } catch (_e) {
      // If reset event doesn't work, just clear history
      // The engine will start fresh on next test
    }
  }
  
  // Note: In a real scenario, we might need to recreate the engine
  // For now, clearing history and using reset events should work
}

/**
 * Get current context
 */
export function getContext(): ApplicationEngineContext {
  return frontendEngine.getContext();
}

/**
 * Get current state value
 */
export function getState(): string {
  return frontendEngine.getContext().applicationState;
}

/**
 * Dispatch events (for testing)
 */
export function dispatch(events: Parameters<typeof frontendEngine.step>[0]): void {
  frontendEngine.step(events);
}

