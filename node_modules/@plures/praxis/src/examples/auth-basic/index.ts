/**
 * Auth Basic Example
 *
 * Demonstrates basic authentication logic with login/logout using Praxis.
 * Shows how to define facts, events, rules, and constraints.
 */

import {
  createPraxisEngine,
  PraxisRegistry,
  defineFact,
  defineEvent,
  defineRule,
  defineConstraint,
  findEvent,
  filterFacts,
} from '../../index.js';

// Define the context type
interface AuthContext {
  currentUser: string | null;
  sessions: Array<{ userId: string; timestamp: number }>;
}

// Define facts
const UserLoggedIn = defineFact<'UserLoggedIn', { userId: string; timestamp: number }>(
  'UserLoggedIn'
);
const UserLoggedOut = defineFact<'UserLoggedOut', { userId: string; timestamp: number }>(
  'UserLoggedOut'
);

// Define events
const Login = defineEvent<'LOGIN', { username: string; password: string }>('LOGIN');
const Logout = defineEvent<'LOGOUT', {}>('LOGOUT');

// Define rules
const loginRule = defineRule<AuthContext>({
  id: 'auth.login',
  description: 'Process login event and create UserLoggedIn fact',
  impl: (_state, events) => {
    const loginEvent = findEvent(events, Login);
    if (!loginEvent) {
      return [];
    }

    // In real app, validate password here
    const userId = loginEvent.payload.username;
    return [UserLoggedIn.create({ userId, timestamp: Date.now() })];
  },
});

const logoutRule = defineRule<AuthContext>({
  id: 'auth.logout',
  description: 'Process logout event and create UserLoggedOut fact',
  impl: (state, events) => {
    const logoutEvent = findEvent(events, Logout);
    if (!logoutEvent || !state.context.currentUser) {
      return [];
    }

    return [
      UserLoggedOut.create({
        userId: state.context.currentUser,
        timestamp: Date.now(),
      }),
    ];
  },
});

const updateContextRule = defineRule<AuthContext>({
  id: 'auth.updateContext',
  description: 'Update context based on login/logout facts',
  impl: (state, _events) => {
    // This rule updates context based on facts (side effect on context)
    const loginFacts = filterFacts(state.facts, UserLoggedIn);
    const logoutFacts = filterFacts(state.facts, UserLoggedOut);

    if (loginFacts.length > 0) {
      const latestLogin = loginFacts[loginFacts.length - 1];
      state.context.currentUser = latestLogin.payload.userId;
      state.context.sessions.push({
        userId: latestLogin.payload.userId,
        timestamp: latestLogin.payload.timestamp,
      });
    }

    if (logoutFacts.length > 0) {
      state.context.currentUser = null;
    }

    return [];
  },
});

// Define constraints
const singleSessionConstraint = defineConstraint<AuthContext>({
  id: 'auth.singleSession',
  description: 'Only one user can be logged in at a time',
  impl: (state) => {
    const loginFacts = filterFacts(state.facts, UserLoggedIn);
    const logoutFacts = filterFacts(state.facts, UserLoggedOut);

    const activeLogins = loginFacts.length - logoutFacts.length;
    return activeLogins <= 1 || `Multiple active sessions detected: ${activeLogins}`;
  },
});

// Create and configure the engine
function createAuthEngine() {
  const registry = new PraxisRegistry<AuthContext>();
  registry.registerRule(loginRule);
  registry.registerRule(logoutRule);
  registry.registerRule(updateContextRule);
  registry.registerConstraint(singleSessionConstraint);

  const engine = createPraxisEngine<AuthContext>({
    initialContext: {
      currentUser: null,
      sessions: [],
    },
    registry,
  });

  return engine;
}

// Example usage
function runExample() {
  console.log('=== Auth Basic Example ===\n');

  const engine = createAuthEngine();

  // Login
  console.log('1. User logs in:');
  let result = engine.step([Login.create({ username: 'alice', password: 'secret123' })]);
  console.log('   Context:', engine.getContext());
  console.log('   Facts:', result.state.facts);
  console.log('   Diagnostics:', result.diagnostics);
  console.log();

  // Try to login again (should violate constraint)
  console.log('2. Another user tries to log in:');
  result = engine.step([Login.create({ username: 'bob', password: 'secret456' })]);
  console.log('   Context:', engine.getContext());
  console.log('   Diagnostics:', result.diagnostics);
  console.log();

  // Logout
  console.log('3. User logs out:');
  result = engine.step([Logout.create({})]);
  console.log('   Context:', engine.getContext());
  console.log('   Facts (last 3):', result.state.facts.slice(-3));
  console.log('   Diagnostics:', result.diagnostics);
  console.log();
}

// Run example if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExample();
}

export { createAuthEngine, runExample };
