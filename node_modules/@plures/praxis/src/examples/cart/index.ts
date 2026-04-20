/**
 * Cart Example
 *
 * Demonstrates shopping cart logic with flows and derived state.
 * Shows how to manage complex state with multiple rules and constraints.
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
} from '../../index.js';

// Define the context type
interface CartContext {
  items: Array<{ productId: string; quantity: number; price: number }>;
  total: number;
  discountApplied: boolean;
}

// Define facts
const ItemAdded = defineFact<'ItemAdded', { productId: string; quantity: number; price: number }>(
  'ItemAdded'
);
const ItemRemoved = defineFact<'ItemRemoved', { productId: string }>('ItemRemoved');
const DiscountApplied = defineFact<'DiscountApplied', { percentage: number }>('DiscountApplied');
const CartCleared = defineFact<'CartCleared', {}>('CartCleared');

// Define events
const AddToCart = defineEvent<
  'ADD_TO_CART',
  { productId: string; quantity: number; price: number }
>('ADD_TO_CART');
const RemoveFromCart = defineEvent<'REMOVE_FROM_CART', { productId: string }>('REMOVE_FROM_CART');
const ApplyDiscount = defineEvent<'APPLY_DISCOUNT', { code: string }>('APPLY_DISCOUNT');
const ClearCart = defineEvent<'CLEAR_CART', {}>('CLEAR_CART');

// Define rules
const addToCartRule = defineRule<CartContext>({
  id: 'cart.addItem',
  description: 'Add item to cart',
  impl: (_state, events) => {
    const addEvents = events.filter(AddToCart.is);
    return addEvents.map((event) =>
      ItemAdded.create({
        productId: event.payload.productId,
        quantity: event.payload.quantity,
        price: event.payload.price,
      })
    );
  },
});

const removeFromCartRule = defineRule<CartContext>({
  id: 'cart.removeItem',
  description: 'Remove item from cart',
  impl: (_state, events) => {
    const removeEvent = findEvent(events, RemoveFromCart);
    if (!removeEvent) {
      return [];
    }
    return [ItemRemoved.create({ productId: removeEvent.payload.productId })];
  },
});

const applyDiscountRule = defineRule<CartContext>({
  id: 'cart.applyDiscount',
  description: 'Apply discount code',
  impl: (state, events) => {
    const discountEvent = findEvent(events, ApplyDiscount);
    if (!discountEvent || state.context.discountApplied) {
      return [];
    }

    // Simple discount logic: "SAVE10" = 10% off
    const percentage = discountEvent.payload.code === 'SAVE10' ? 10 : 0;
    if (percentage > 0) {
      return [DiscountApplied.create({ percentage })];
    }
    return [];
  },
});

const clearCartRule = defineRule<CartContext>({
  id: 'cart.clear',
  description: 'Clear cart',
  impl: (_state, events) => {
    const clearEvent = findEvent(events, ClearCart);
    if (!clearEvent) {
      return [];
    }
    return [CartCleared.create({})];
  },
});

const updateCartContextRule = defineRule<CartContext>({
  id: 'cart.updateContext',
  description: 'Update cart context based on facts',
  impl: (state, _events) => {
    const addedItems = filterFacts(state.facts, ItemAdded);
    const removedItems = filterFacts(state.facts, ItemRemoved);
    const clearedFacts = filterFacts(state.facts, CartCleared);
    const discountFacts = filterFacts(state.facts, DiscountApplied);

    // Check if cart was cleared
    if (clearedFacts.length > 0) {
      state.context.items = [];
      state.context.total = 0;
      state.context.discountApplied = false;
      return [];
    }

    // Build current cart items
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

    // Update context
    state.context.items = Array.from(itemMap.entries()).map(([productId, data]) => ({
      productId,
      quantity: data.quantity,
      price: data.price,
    }));

    // Calculate total
    let total = state.context.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

    // Apply discount if any
    if (discountFacts.length > 0) {
      const discount = discountFacts[discountFacts.length - 1];
      total = total * (1 - discount.payload.percentage / 100);
      state.context.discountApplied = true;
    }

    state.context.total = Math.round(total * 100) / 100; // Round to 2 decimals

    return [];
  },
});

// Define constraints
const maxItemsConstraint = defineConstraint<CartContext>({
  id: 'cart.maxItems',
  description: 'Cart cannot exceed 100 items',
  impl: (state) => {
    const totalQuantity = state.context.items.reduce((sum, item) => sum + item.quantity, 0);
    return totalQuantity <= 100 || `Cart has ${totalQuantity} items, maximum is 100`;
  },
});

const maxTotalConstraint = defineConstraint<CartContext>({
  id: 'cart.maxTotal',
  description: 'Cart total cannot exceed $10,000',
  impl: (state) => {
    return (
      state.context.total <= 10000 || `Cart total $${state.context.total} exceeds maximum $10,000`
    );
  },
});

// Create a module
const cartModule = defineModule<CartContext>({
  rules: [
    addToCartRule,
    removeFromCartRule,
    applyDiscountRule,
    clearCartRule,
    updateCartContextRule,
  ],
  constraints: [maxItemsConstraint, maxTotalConstraint],
  meta: { version: '1.0.0' },
});

// Create and configure the engine
function createCartEngine() {
  const registry = new PraxisRegistry<CartContext>();
  registry.registerModule(cartModule);

  const engine = createPraxisEngine<CartContext>({
    initialContext: {
      items: [],
      total: 0,
      discountApplied: false,
    },
    registry,
  });

  return engine;
}

// Example usage
function runExample() {
  console.log('=== Cart Example ===\n');

  const engine = createCartEngine();

  // Add items
  console.log('1. Add items to cart:');
  engine.step([
    AddToCart.create({ productId: 'prod-1', quantity: 2, price: 29.99 }),
    AddToCart.create({ productId: 'prod-2', quantity: 1, price: 49.99 }),
  ]);
  console.log('   Cart:', engine.getContext());
  console.log();

  // Apply discount
  console.log('2. Apply discount code:');
  engine.step([ApplyDiscount.create({ code: 'SAVE10' })]);
  console.log('   Cart:', engine.getContext());
  console.log();

  // Remove item
  console.log('3. Remove an item:');
  engine.step([RemoveFromCart.create({ productId: 'prod-1' })]);
  console.log('   Cart:', engine.getContext());
  console.log();

  // Add more items
  console.log('4. Add more items:');
  engine.step([AddToCart.create({ productId: 'prod-3', quantity: 3, price: 15.99 })]);
  console.log('   Cart:', engine.getContext());
  console.log();

  // Clear cart
  console.log('5. Clear cart:');
  engine.step([ClearCart.create({})]);
  console.log('   Cart:', engine.getContext());
  console.log();
}

// Run example if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExample();
}

export { createCartEngine, runExample };
