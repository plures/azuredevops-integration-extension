/**
 * Hero Example: E-Commerce Platform
 *
 * A comprehensive example demonstrating:
 * - Authentication with session management
 * - Shopping cart with discount rules
 * - Feature flags for A/B testing
 * - Constraints for business rules
 * - Actors for side effects
 * - Full integration of all Praxis features
 */

import {
  createPraxisEngine,
  PraxisRegistry,
  defineFact,
  defineEvent,
  defineRule,
  defineConstraint,
  defineModule,
  findEvent,
  filterFacts,
  ActorManager,
  type Actor,
} from '../../index.js';

// ============================================================================
// CONTEXT TYPE
// ============================================================================

interface ECommerceContext {
  // Auth
  currentUser: string | null;
  sessionStartTime: number | null;

  // Cart
  cart: {
    items: Array<{ productId: string; quantity: number; price: number }>;
    total: number;
    discountApplied: number;
  };

  // Feature Flags
  features: {
    freeShippingEnabled: boolean;
    loyaltyProgramEnabled: boolean;
    newCheckoutFlowEnabled: boolean;
  };

  // Business State
  loyaltyPoints: number;
  orderHistory: string[];
}

// ============================================================================
// FACTS
// ============================================================================

// Auth Facts
const UserLoggedIn = defineFact<'UserLoggedIn', { userId: string; timestamp: number }>(
  'UserLoggedIn'
);
const UserLoggedOut = defineFact<'UserLoggedOut', { userId: string }>('UserLoggedOut');
const SessionExpired = defineFact<'SessionExpired', { userId: string }>('SessionExpired');

// Cart Facts
const ItemAdded = defineFact<'ItemAdded', { productId: string; quantity: number; price: number }>(
  'ItemAdded'
);
const ItemRemoved = defineFact<'ItemRemoved', { productId: string }>('ItemRemoved');
const DiscountApplied = defineFact<'DiscountApplied', { amount: number; reason: string }>(
  'DiscountApplied'
);
const CartCleared = defineFact<'CartCleared', {}>('CartCleared');

// Feature Flag Facts
const FeatureEnabled = defineFact<'FeatureEnabled', { feature: string }>('FeatureEnabled');
const FeatureDisabled = defineFact<'FeatureDisabled', { feature: string }>('FeatureDisabled');

// Business Facts
const LoyaltyPointsAwarded = defineFact<'LoyaltyPointsAwarded', { points: number }>(
  'LoyaltyPointsAwarded'
);
const OrderPlaced = defineFact<'OrderPlaced', { orderId: string; total: number }>('OrderPlaced');

// ============================================================================
// EVENTS
// ============================================================================

// Auth Events
const Login = defineEvent<'LOGIN', { username: string }>('LOGIN');
const Logout = defineEvent<'LOGOUT', {}>('LOGOUT');
const CheckSession = defineEvent<'CHECK_SESSION', {}>('CHECK_SESSION');

// Cart Events
const AddToCart = defineEvent<
  'ADD_TO_CART',
  { productId: string; quantity: number; price: number }
>('ADD_TO_CART');
const RemoveFromCart = defineEvent<'REMOVE_FROM_CART', { productId: string }>('REMOVE_FROM_CART');
const ApplyDiscount = defineEvent<'APPLY_DISCOUNT', { code: string }>('APPLY_DISCOUNT');
const Checkout = defineEvent<'CHECKOUT', {}>('CHECKOUT');

// Feature Flag Events
const EnableFeature = defineEvent<'ENABLE_FEATURE', { feature: string }>('ENABLE_FEATURE');
const DisableFeature = defineEvent<'DISABLE_FEATURE', { feature: string }>('DISABLE_FEATURE');

// ============================================================================
// AUTH MODULE
// ============================================================================

const loginRule = defineRule<ECommerceContext>({
  id: 'auth.login',
  description: 'Process login event',
  impl: (state, events) => {
    const loginEvent = findEvent(events, Login);
    if (!loginEvent) {
      return [];
    }

    state.context.currentUser = loginEvent.payload.username;
    state.context.sessionStartTime = Date.now();

    return [
      UserLoggedIn.create({
        userId: loginEvent.payload.username,
        timestamp: Date.now(),
      }),
    ];
  },
});

const logoutRule = defineRule<ECommerceContext>({
  id: 'auth.logout',
  description: 'Process logout event',
  impl: (state, events) => {
    const logoutEvent = findEvent(events, Logout);
    if (!logoutEvent || !state.context.currentUser) {
      return [];
    }

    const userId = state.context.currentUser;
    state.context.currentUser = null;
    state.context.sessionStartTime = null;

    // Clear cart on logout
    state.context.cart = {
      items: [],
      total: 0,
      discountApplied: 0,
    };

    return [UserLoggedOut.create({ userId }), CartCleared.create({})];
  },
});

const sessionCheckRule = defineRule<ECommerceContext>({
  id: 'auth.checkSession',
  description: 'Check for session expiration (30 minute timeout)',
  impl: (state, events) => {
    const checkEvent = findEvent(events, CheckSession);
    if (!checkEvent || !state.context.currentUser || !state.context.sessionStartTime) {
      return [];
    }

    const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    const elapsed = Date.now() - state.context.sessionStartTime;

    if (elapsed > SESSION_TIMEOUT_MS) {
      const userId = state.context.currentUser;
      state.context.currentUser = null;
      state.context.sessionStartTime = null;
      state.context.cart = { items: [], total: 0, discountApplied: 0 };

      return [SessionExpired.create({ userId }), CartCleared.create({})];
    }

    return [];
  },
});

const authConstraints = [
  defineConstraint<ECommerceContext>({
    id: 'auth.singleSession',
    description: 'Only one user can be logged in at a time',
    impl: () => {
      // This is always valid - just enforced by business logic
      return true;
    },
  }),
];

const authModule = defineModule<ECommerceContext>({
  rules: [loginRule, logoutRule, sessionCheckRule],
  constraints: authConstraints,
  meta: { module: 'auth', version: '1.0.0' },
});

// ============================================================================
// CART MODULE
// ============================================================================

const addToCartRule = defineRule<ECommerceContext>({
  id: 'cart.addItem',
  description: 'Add item to cart',
  impl: (state, events) => {
    const addEvents = events.filter(AddToCart.is);
    if (!state.context.currentUser || addEvents.length === 0) {
      return [];
    }

    return addEvents.map((event) =>
      ItemAdded.create({
        productId: event.payload.productId,
        quantity: event.payload.quantity,
        price: event.payload.price,
      })
    );
  },
  meta: { dependsOn: 'auth.login' },
});

const removeFromCartRule = defineRule<ECommerceContext>({
  id: 'cart.removeItem',
  description: 'Remove item from cart',
  impl: (state, events) => {
    const removeEvent = findEvent(events, RemoveFromCart);
    if (!removeEvent || !state.context.currentUser) {
      return [];
    }

    return [ItemRemoved.create({ productId: removeEvent.payload.productId })];
  },
});

const applyDiscountRule = defineRule<ECommerceContext>({
  id: 'cart.applyDiscount',
  description: 'Apply discount codes',
  impl: (state, events) => {
    const discountEvent = findEvent(events, ApplyDiscount);
    if (!discountEvent || !state.context.currentUser) {
      return [];
    }

    const code = discountEvent.payload.code;
    let discount = 0;
    let reason = '';

    // Discount logic
    if (code === 'SAVE10') {
      discount = 0.1;
      reason = '10% off with code SAVE10';
    } else if (code === 'SAVE20' && state.context.loyaltyPoints > 100) {
      discount = 0.2;
      reason = '20% off for loyal customers';
    } else if (code === 'FREESHIP' && state.context.features.freeShippingEnabled) {
      discount = 0.05;
      reason = '5% off with free shipping';
    }

    if (discount > 0) {
      return [DiscountApplied.create({ amount: discount, reason })];
    }

    return [];
  },
});

const updateCartContextRule = defineRule<ECommerceContext>({
  id: 'cart.updateContext',
  description: 'Update cart context from facts',
  impl: (state) => {
    const addedItems = filterFacts(state.facts, ItemAdded);
    const removedItems = filterFacts(state.facts, ItemRemoved);
    const discounts = filterFacts(state.facts, DiscountApplied);
    const cleared = filterFacts(state.facts, CartCleared);

    if (cleared.length > 0) {
      state.context.cart = { items: [], total: 0, discountApplied: 0 };
      return [];
    }

    // Build cart items
    const itemMap = new Map<string, { quantity: number; price: number }>();

    for (const fact of addedItems) {
      const existing = itemMap.get(fact.payload.productId);
      if (existing) {
        itemMap.set(fact.payload.productId, {
          quantity: existing.quantity + fact.payload.quantity,
          price: fact.payload.price,
        });
      } else {
        itemMap.set(fact.payload.productId, {
          quantity: fact.payload.quantity,
          price: fact.payload.price,
        });
      }
    }

    for (const fact of removedItems) {
      itemMap.delete(fact.payload.productId);
    }

    state.context.cart.items = Array.from(itemMap.entries()).map(([productId, data]) => ({
      productId,
      quantity: data.quantity,
      price: data.price,
    }));

    // Calculate total
    let total = state.context.cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

    // Apply discounts
    let totalDiscount = 0;
    for (const discount of discounts) {
      totalDiscount = Math.max(totalDiscount, discount.payload.amount);
    }

    state.context.cart.discountApplied = totalDiscount;
    state.context.cart.total = total * (1 - totalDiscount);

    return [];
  },
});

const checkoutRule = defineRule<ECommerceContext>({
  id: 'cart.checkout',
  description: 'Process checkout',
  impl: (state, events) => {
    const checkoutEvent = findEvent(events, Checkout);
    if (!checkoutEvent || !state.context.currentUser || state.context.cart.items.length === 0) {
      return [];
    }

    const orderId = `order-${Date.now()}`;
    const total = state.context.cart.total;

    // Award loyalty points (1 point per dollar)
    const pointsEarned = Math.floor(total);

    state.context.orderHistory.push(orderId);
    state.context.loyaltyPoints += pointsEarned;
    state.context.cart = { items: [], total: 0, discountApplied: 0 };

    return [
      OrderPlaced.create({ orderId, total }),
      LoyaltyPointsAwarded.create({ points: pointsEarned }),
      CartCleared.create({}),
    ];
  },
});

const cartConstraints = [
  defineConstraint<ECommerceContext>({
    id: 'cart.maxItems',
    description: 'Cart cannot exceed 100 items',
    impl: (state) => {
      const totalQuantity = state.context.cart.items.reduce((sum, item) => sum + item.quantity, 0);
      return totalQuantity <= 100 || `Cart has ${totalQuantity} items, max is 100`;
    },
  }),
  defineConstraint<ECommerceContext>({
    id: 'cart.requiresAuth',
    description: 'Cart operations require authentication',
    impl: (state) => {
      if (state.context.cart.items.length > 0 && !state.context.currentUser) {
        return 'Cart operations require authentication';
      }
      return true;
    },
  }),
];

const cartModule = defineModule<ECommerceContext>({
  rules: [
    addToCartRule,
    removeFromCartRule,
    applyDiscountRule,
    updateCartContextRule,
    checkoutRule,
  ],
  constraints: cartConstraints,
  meta: { module: 'cart', version: '1.0.0', dependsOn: ['auth'] },
});

// ============================================================================
// FEATURE FLAGS MODULE
// ============================================================================

const enableFeatureRule = defineRule<ECommerceContext>({
  id: 'features.enable',
  description: 'Enable a feature flag',
  impl: (state, events) => {
    const enableEvent = findEvent(events, EnableFeature);
    if (!enableEvent) {
      return [];
    }

    const feature = enableEvent.payload.feature;
    if (feature === 'freeShipping') {
      state.context.features.freeShippingEnabled = true;
    } else if (feature === 'loyaltyProgram') {
      state.context.features.loyaltyProgramEnabled = true;
    } else if (feature === 'newCheckoutFlow') {
      state.context.features.newCheckoutFlowEnabled = true;
    }

    return [FeatureEnabled.create({ feature })];
  },
});

const disableFeatureRule = defineRule<ECommerceContext>({
  id: 'features.disable',
  description: 'Disable a feature flag',
  impl: (state, events) => {
    const disableEvent = findEvent(events, DisableFeature);
    if (!disableEvent) {
      return [];
    }

    const feature = disableEvent.payload.feature;
    if (feature === 'freeShipping') {
      state.context.features.freeShippingEnabled = false;
    } else if (feature === 'loyaltyProgram') {
      state.context.features.loyaltyProgramEnabled = false;
    } else if (feature === 'newCheckoutFlow') {
      state.context.features.newCheckoutFlowEnabled = false;
    }

    return [FeatureDisabled.create({ feature })];
  },
});

const featureFlagsModule = defineModule<ECommerceContext>({
  rules: [enableFeatureRule, disableFeatureRule],
  constraints: [],
  meta: { module: 'featureFlags', version: '1.0.0' },
});

// ============================================================================
// ACTORS
// ============================================================================

/**
 * Logging actor - logs important events to console
 */
const loggingActor: Actor<ECommerceContext> = {
  id: 'logging',
  description: 'Logs important events',
  onStateChange: (state) => {
    const recentFacts = state.facts.slice(-3); // Last 3 facts
    for (const fact of recentFacts) {
      if (fact.tag === 'UserLoggedIn' && UserLoggedIn.is(fact)) {
        console.log(`  [LOG] User ${fact.payload.userId} logged in`);
      } else if (fact.tag === 'OrderPlaced' && OrderPlaced.is(fact)) {
        console.log(
          `  [LOG] Order ${fact.payload.orderId} placed for $${fact.payload.total.toFixed(2)}`
        );
      } else if (fact.tag === 'SessionExpired' && SessionExpired.is(fact)) {
        console.log(`  [LOG] Session expired for user ${fact.payload.userId}`);
      }
    }
  },
};

/**
 * Analytics actor - tracks metrics
 */
const analyticsActor: Actor<ECommerceContext> = {
  id: 'analytics',
  description: 'Tracks analytics events',
  onStateChange: (state) => {
    // In a real app, this would send to an analytics service
    const recentFacts = state.facts.slice(-1);
    for (const fact of recentFacts) {
      if (fact.tag === 'OrderPlaced' && OrderPlaced.is(fact)) {
        console.log(`  [ANALYTICS] Revenue: $${fact.payload.total.toFixed(2)}`);
      } else if (fact.tag === 'LoyaltyPointsAwarded' && LoyaltyPointsAwarded.is(fact)) {
        console.log(`  [ANALYTICS] Loyalty engagement: ${fact.payload.points} points`);
      }
    }
  },
};

// ============================================================================
// ENGINE SETUP
// ============================================================================

function createECommerceEngine() {
  const registry = new PraxisRegistry<ECommerceContext>();

  // Register all modules
  registry.registerModule(authModule);
  registry.registerModule(cartModule);
  registry.registerModule(featureFlagsModule);

  const engine = createPraxisEngine<ECommerceContext>({
    initialContext: {
      currentUser: null,
      sessionStartTime: null,
      cart: {
        items: [],
        total: 0,
        discountApplied: 0,
      },
      features: {
        freeShippingEnabled: false,
        loyaltyProgramEnabled: true,
        newCheckoutFlowEnabled: false,
      },
      loyaltyPoints: 0,
      orderHistory: [],
    },
    registry,
  });

  // Setup actors
  const actorManager = new ActorManager<ECommerceContext>();
  actorManager.attachEngine(engine);
  actorManager.register(loggingActor);
  actorManager.register(analyticsActor);

  return { engine, actorManager };
}

// ============================================================================
// DEMO SCENARIO
// ============================================================================

async function runDemo() {
  console.log('='.repeat(70));
  console.log('E-COMMERCE PLATFORM DEMO');
  console.log('Demonstrating: Auth + Cart + Feature Flags + Actors + Constraints');
  console.log('='.repeat(70));
  console.log();

  const { engine, actorManager } = createECommerceEngine();
  await actorManager.startAll();

  // Scenario 1: User Login
  console.log('1. User Login');
  console.log('-'.repeat(70));
  let result = engine.step([Login.create({ username: 'alice' })]);
  await actorManager.notifyStateChange(engine.getState());
  console.log(`   User: ${engine.getContext().currentUser}`);
  console.log(`   Diagnostics: ${result.diagnostics.length} issue(s)`);
  console.log();

  // Scenario 2: Enable Feature Flag
  console.log('2. Enable Free Shipping Feature');
  console.log('-'.repeat(70));
  result = engine.step([EnableFeature.create({ feature: 'freeShipping' })]);
  await actorManager.notifyStateChange(engine.getState());
  console.log(`   Free Shipping Enabled: ${engine.getContext().features.freeShippingEnabled}`);
  console.log();

  // Scenario 3: Add Items to Cart
  console.log('3. Add Items to Cart');
  console.log('-'.repeat(70));
  result = engine.step([
    AddToCart.create({ productId: 'laptop-1', quantity: 1, price: 999.99 }),
    AddToCart.create({ productId: 'mouse-1', quantity: 2, price: 29.99 }),
  ]);
  await actorManager.notifyStateChange(engine.getState());
  const cart = engine.getContext().cart;
  console.log(`   Items: ${cart.items.length}`);
  console.log(`   Total: $${cart.total.toFixed(2)}`);
  console.log();

  // Scenario 4: Apply Discount
  console.log('4. Apply Discount Code');
  console.log('-'.repeat(70));
  result = engine.step([ApplyDiscount.create({ code: 'SAVE10' })]);
  await actorManager.notifyStateChange(engine.getState());
  console.log(`   Discount: ${(engine.getContext().cart.discountApplied * 100).toFixed(0)}%`);
  console.log(`   New Total: $${engine.getContext().cart.total.toFixed(2)}`);
  console.log();

  // Scenario 5: Checkout
  console.log('5. Checkout');
  console.log('-'.repeat(70));
  result = engine.step([Checkout.create({})]);
  await actorManager.notifyStateChange(engine.getState());
  console.log(`   Orders Placed: ${engine.getContext().orderHistory.length}`);
  console.log(`   Loyalty Points: ${engine.getContext().loyaltyPoints}`);
  console.log(`   Cart Items: ${engine.getContext().cart.items.length}`);
  console.log();

  // Scenario 6: Add More Items and Checkout Again
  console.log('6. Shop Again with Loyalty Discount');
  console.log('-'.repeat(70));
  engine.step([
    AddToCart.create({ productId: 'keyboard-1', quantity: 1, price: 129.99 }),
    ApplyDiscount.create({ code: 'SAVE20' }), // Requires 100+ loyalty points
  ]);
  await actorManager.notifyStateChange(engine.getState());
  console.log(`   Total: $${engine.getContext().cart.total.toFixed(2)}`);
  console.log(
    `   Discount Applied: ${(engine.getContext().cart.discountApplied * 100).toFixed(0)}%`
  );

  result = engine.step([Checkout.create({})]);
  await actorManager.notifyStateChange(engine.getState());
  console.log(`   Total Orders: ${engine.getContext().orderHistory.length}`);
  console.log(`   Total Loyalty Points: ${engine.getContext().loyaltyPoints}`);
  console.log();

  // Scenario 7: Logout
  console.log('7. User Logout');
  console.log('-'.repeat(70));
  result = engine.step([Logout.create({})]);
  await actorManager.notifyStateChange(engine.getState());
  console.log(`   User: ${engine.getContext().currentUser ?? '(none)'}`);
  console.log(`   Session Cleared: ${engine.getContext().sessionStartTime === null}`);
  console.log();

  await actorManager.stopAll();

  console.log('='.repeat(70));
  console.log('DEMO COMPLETE');
  console.log('='.repeat(70));
}

// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}

export { createECommerceEngine, runDemo };
