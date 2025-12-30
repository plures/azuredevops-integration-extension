/**
 * DSL Helpers
 *
 * Ergonomic TypeScript helpers for defining facts, events, rules, constraints, and flows.
 * These produce both strongly-typed APIs and serializable descriptors.
 */

import type { PraxisEvent, PraxisFact } from '../core/protocol.js';
import type {
  RuleDescriptor,
  ConstraintDescriptor,
  PraxisModule,
  RuleFn,
  ConstraintFn,
} from '../core/rules.js';

/**
 * Strongly typed fact definition
 */
export interface FactDefinition<TTag extends string, TPayload> {
  tag: TTag;
  create(payload: TPayload): PraxisFact & { tag: TTag; payload: TPayload };
  is(fact: PraxisFact): fact is PraxisFact & { tag: TTag; payload: TPayload };
}

/**
 * Define a typed fact
 *
 * @example
 * const UserLoggedIn = defineFact<"UserLoggedIn", { userId: string }>("UserLoggedIn");
 * const fact = UserLoggedIn.create({ userId: "123" });
 * if (UserLoggedIn.is(fact)) {
 *   console.log(fact.payload.userId); // Type-safe!
 * }
 */
export function defineFact<TTag extends string, TPayload>(
  tag: TTag
): FactDefinition<TTag, TPayload> {
  return {
    tag,
    create(payload: TPayload): PraxisFact & { tag: TTag; payload: TPayload } {
      return { tag, payload };
    },
    is(fact: PraxisFact): fact is PraxisFact & { tag: TTag; payload: TPayload } {
      return fact.tag === tag;
    },
  };
}

/**
 * Strongly typed event definition
 */
export interface EventDefinition<TTag extends string, TPayload> {
  tag: TTag;
  create(payload: TPayload): PraxisEvent & { tag: TTag; payload: TPayload };
  is(event: PraxisEvent): event is PraxisEvent & { tag: TTag; payload: TPayload };
}

/**
 * Define a typed event
 *
 * @example
 * const Login = defineEvent<"LOGIN", { username: string; password: string }>("LOGIN");
 * const event = Login.create({ username: "alice", password: "secret" });
 */
export function defineEvent<TTag extends string, TPayload>(
  tag: TTag
): EventDefinition<TTag, TPayload> {
  return {
    tag,
    create(payload: TPayload): PraxisEvent & { tag: TTag; payload: TPayload } {
      return { tag, payload };
    },
    is(event: PraxisEvent): event is PraxisEvent & { tag: TTag; payload: TPayload } {
      return event.tag === tag;
    },
  };
}

/**
 * Options for defining a rule
 */
export interface DefineRuleOptions<TContext = unknown> {
  id: string;
  description: string;
  impl: RuleFn<TContext>;
  meta?: Record<string, unknown>;
}

/**
 * Define a rule
 *
 * @example
 * const loginRule = defineRule({
 *   id: "auth.login",
 *   description: "Process login event",
 *   impl: (state, events) => {
 *     const loginEvent = events.find(Login.is);
 *     if (loginEvent) {
 *       return [UserLoggedIn.create({ userId: loginEvent.payload.username })];
 *     }
 *     return [];
 *   }
 * });
 */
export function defineRule<TContext = unknown>(
  options: DefineRuleOptions<TContext>
): RuleDescriptor<TContext> {
  return {
    id: options.id,
    description: options.description,
    impl: options.impl,
    meta: options.meta,
  };
}

/**
 * Options for defining a constraint
 */
export interface DefineConstraintOptions<TContext = unknown> {
  id: string;
  description: string;
  impl: ConstraintFn<TContext>;
  meta?: Record<string, unknown>;
}

/**
 * Define a constraint
 *
 * @example
 * const maxCartItems = defineConstraint({
 *   id: "cart.maxItems",
 *   description: "Cart cannot exceed 100 items",
 *   impl: (state) => {
 *     const itemCount = state.context.items?.length ?? 0;
 *     return itemCount <= 100 || `Cart has ${itemCount} items, maximum is 100`;
 *   }
 * });
 */
export function defineConstraint<TContext = unknown>(
  options: DefineConstraintOptions<TContext>
): ConstraintDescriptor<TContext> {
  return {
    id: options.id,
    description: options.description,
    impl: options.impl,
    meta: options.meta,
  };
}

/**
 * Options for defining a module
 */
export interface DefineModuleOptions<TContext = unknown> {
  rules?: RuleDescriptor<TContext>[];
  constraints?: ConstraintDescriptor<TContext>[];
  meta?: Record<string, unknown>;
}

/**
 * Define a module (bundle of rules and constraints)
 *
 * @example
 * const authModule = defineModule({
 *   rules: [loginRule, logoutRule],
 *   constraints: [maxSessionsConstraint],
 *   meta: { version: "1.0.0" }
 * });
 */
export function defineModule<TContext = unknown>(
  options: DefineModuleOptions<TContext>
): PraxisModule<TContext> {
  return {
    rules: options.rules ?? [],
    constraints: options.constraints ?? [],
    meta: options.meta,
  };
}

/**
 * Helper to filter events by definition
 */
export function filterEvents<TTag extends string, TPayload>(
  events: PraxisEvent[],
  definition: EventDefinition<TTag, TPayload>
): Array<PraxisEvent & { tag: TTag; payload: TPayload }> {
  return events.filter(definition.is);
}

/**
 * Helper to filter facts by definition
 */
export function filterFacts<TTag extends string, TPayload>(
  facts: PraxisFact[],
  definition: FactDefinition<TTag, TPayload>
): Array<PraxisFact & { tag: TTag; payload: TPayload }> {
  return facts.filter(definition.is);
}

/**
 * Helper to find first event matching definition
 */
export function findEvent<TTag extends string, TPayload>(
  events: PraxisEvent[],
  definition: EventDefinition<TTag, TPayload>
): (PraxisEvent & { tag: TTag; payload: TPayload }) | undefined {
  return events.find(definition.is);
}

/**
 * Helper to find first fact matching definition
 */
export function findFact<TTag extends string, TPayload>(
  facts: PraxisFact[],
  definition: FactDefinition<TTag, TPayload>
): (PraxisFact & { tag: TTag; payload: TPayload }) | undefined {
  return facts.find(definition.is);
}
