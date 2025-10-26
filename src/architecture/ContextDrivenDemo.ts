/**
 * Context-Driven Architecture - Working Demo
 *
 * This demonstrates the key concepts without complex XState setup.
 * Focus on the patterns and flow rather than the implementation details.
 */

import { ApplicationContext, contextActions, createInitialContext } from './ApplicationContext';

/**
 * Simple Actor Pattern - Focus on the concept
 *
 * Each "actor" is just a class that observes context changes
 * and performs its specific responsibilities.
 */

export class ConnectionActor {
  private context: ApplicationContext;

  constructor(context: ApplicationContext) {
    this.context = context;
    console.log('[ConnectionActor] Initialized');
  }

  // Called when context changes
  onContextChange(newContext: ApplicationContext) {
    console.log('[ConnectionActor] Context changed');

    // React to connection-related changes
    if (newContext.connections.length !== this.context.connections.length) {
      console.log('[ConnectionActor] Connection count changed:', newContext.connections.length);
    }

    if (newContext.activeConnectionId !== this.context.activeConnectionId) {
      console.log('[ConnectionActor] Active connection changed:', newContext.activeConnectionId);
      this.handleConnectionSwitch(newContext.activeConnectionId);
    }

    this.context = newContext;
  }

  private handleConnectionSwitch(connectionId: string | null) {
    if (!connectionId) return;

    console.log('[ConnectionActor] Handling connection switch to:', connectionId);

    // Validate connection is still available
    const connection = this.context.connections.find((c) => c.id === connectionId);
    if (!connection) {
      console.warn('[ConnectionActor] Connection not found:', connectionId);
      return;
    }

    // Connection-specific logic (auth, validation, etc.)
    console.log('[ConnectionActor] Connection switch validated');
  }
}

export class DataActor {
  private context: ApplicationContext;
  private cache = new Map<string, any>();

  constructor(context: ApplicationContext) {
    this.context = context;
    console.log('[DataActor] Initialized');
  }

  // Called when context changes
  onContextChange(newContext: ApplicationContext) {
    console.log('[DataActor] Context changed');

    // Check if we need to fetch data for the active connection
    if (newContext.activeConnectionId !== this.context.activeConnectionId) {
      console.log('[DataActor] Active connection changed, checking cache');
      this.ensureDataForConnection(newContext.activeConnectionId);
    }

    // Check if refresh was requested (simplified for demo)
    // In real implementation, we would check a refresh flag in the context
    console.log('[DataActor] Checking if refresh needed');

    this.context = newContext;
  }

  private ensureDataForConnection(connectionId: string | null) {
    if (!connectionId) return;

    if (!this.cache.has(connectionId)) {
      console.log('[DataActor] No cache for connection, fetching:', connectionId);
      this.fetchWorkItems(connectionId);
    } else {
      console.log('[DataActor] Using cached data for:', connectionId);
    }
  }

  private async fetchWorkItems(connectionId: string | null) {
    if (!connectionId) return;

    console.log('[DataActor] Fetching work items for:', connectionId);

    // Set loading state
    // In real implementation, this would update the shared context
    console.log('[DataActor] Setting loading state');

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock data
      const workItems = [
        { id: '1', title: 'Sample Work Item', type: 'Task', state: 'Active' },
        { id: '2', title: 'Another Item', type: 'Bug', state: 'New' },
      ];

      // Cache the data
      this.cache.set(connectionId, workItems);

      console.log('[DataActor] Fetched work items:', workItems.length);

      // Update shared context with the new data
      // In real implementation: contextActions.setWorkItems(connectionId, workItems)
    } catch (error) {
      console.error('[DataActor] Error fetching work items:', error);
    }
  }
}

export class TimerActor {
  private context: ApplicationContext;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(context: ApplicationContext) {
    this.context = context;
    console.log('[TimerActor] Initialized');
  }

  // Called when context changes
  onContextChange(newContext: ApplicationContext) {
    console.log('[TimerActor] Context changed');

    // React to timer state changes
    if (newContext.timer.isRunning !== this.context.timer.isRunning) {
      if (newContext.timer.isRunning) {
        this.startTicking();
      } else {
        this.stopTicking();
      }
    }

    this.context = newContext;
  }

  private startTicking() {
    console.log('[TimerActor] Starting timer tick');

    this.intervalId = setInterval(() => {
      console.log('[TimerActor] Tick - updating elapsed time');

      // In real implementation: contextActions.updateTimerElapsed()
      // This would update the shared context, causing UI to re-render
    }, 1000);
  }

  private stopTicking() {
    console.log('[TimerActor] Stopping timer tick');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

/**
 * Context Manager - Coordinates context updates and actor notifications
 *
 * This is the "orchestrator" that:
 * 1. Holds the shared ApplicationContext
 * 2. Applies context actions
 * 3. Notifies all actors of changes
 */
export class ContextManager {
  private context: ApplicationContext;
  private actors: Array<{ onContextChange: (context: ApplicationContext) => void }> = [];

  constructor() {
    this.context = createInitialContext();
    console.log('[ContextManager] Initialized with context:', this.context);
  }

  // Register an actor to receive context updates
  registerActor(actor: { onContextChange: (context: ApplicationContext) => void }) {
    this.actors.push(actor);
    console.log('[ContextManager] Registered actor, total:', this.actors.length);

    // Send initial context
    actor.onContextChange(this.context);
  }

  // Apply a context action and notify all actors
  applyAction(actionName: keyof typeof contextActions, ...args: any[]) {
    console.log('[ContextManager] Applying action:', actionName, args);

    try {
      // Apply the context action
      const newContext = (contextActions[actionName] as any)(this.context, ...args);

      // Update our context
      this.context = newContext;

      console.log('[ContextManager] Context updated, notifying actors');

      // Notify all actors
      this.actors.forEach((actor) => {
        try {
          actor.onContextChange(this.context);
        } catch (error) {
          console.error('[ContextManager] Error notifying actor:', error);
        }
      });
    } catch (error) {
      console.error('[ContextManager] Error applying action:', error);
    }
  }

  // Get current context (for debugging)
  getContext(): ApplicationContext {
    return this.context;
  }
}

/**
 * Demo Function - Shows the architecture in action
 */
export function demoContextDrivenArchitecture() {
  console.log('\n=== Context-Driven Architecture Demo ===\n');

  // 1. Create the context manager
  const contextManager = new ContextManager();

  // 2. Create independent actors
  const connectionActor = new ConnectionActor(contextManager.getContext());
  const dataActor = new DataActor(contextManager.getContext());
  const timerActor = new TimerActor(contextManager.getContext());

  // 3. Register actors to receive context updates
  contextManager.registerActor(connectionActor);
  contextManager.registerActor(dataActor);
  contextManager.registerActor(timerActor);

  console.log('\n--- Simulating User Actions ---\n');

  // 4. Simulate user actions
  setTimeout(() => {
    console.log('User Action: Adding connection');
    contextManager.applyAction('addConnection', {
      id: 'conn1',
      label: 'Project A',
      organization: 'MyOrg',
      project: 'ProjectA',
      url: 'https://dev.azure.com/MyOrg/ProjectA',
      pat: 'fake-pat',
    });
  }, 100);

  setTimeout(() => {
    console.log('User Action: Switching to connection');
    contextManager.applyAction('setActiveConnection', 'conn1');
  }, 200);

  setTimeout(() => {
    console.log('User Action: Starting timer');
    contextManager.applyAction('startTimer', '123');
  }, 300);

  setTimeout(() => {
    console.log('User Action: Adding second connection');
    contextManager.applyAction('addConnection', {
      id: 'conn2',
      label: 'Project B',
      organization: 'MyOrg',
      project: 'ProjectB',
      url: 'https://dev.azure.com/MyOrg/ProjectB',
      pat: 'fake-pat-2',
    });
  }, 400);

  setTimeout(() => {
    console.log('User Action: Switching to second connection');
    contextManager.applyAction('setActiveConnection', 'conn2');
  }, 500);

  console.log('\n--- Demo started, watch the console ---\n');

  return { contextManager, connectionActor, dataActor, timerActor };
}

/**
 * Key Benefits Demonstrated:
 *
 * 1. **Independence**: Each actor handles only its concern
 * 2. **Loose Coupling**: Actors don't know about each other
 * 3. **Predictable Flow**: Action → Context Update → Actor Reaction
 * 4. **Scalability**: Adding actors or connections is trivial
 * 5. **Debuggability**: Clear logs show exactly what happens when
 * 6. **Reactivity**: Changes automatically propagate to relevant actors
 */

// Export for use in tests or integration
