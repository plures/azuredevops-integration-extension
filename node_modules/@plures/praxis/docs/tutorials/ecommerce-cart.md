# E-commerce Cart Tutorial

This tutorial walks you through building a shopping cart with a multi-step checkout flow. You'll learn about flows, complex state management, and constraint validation.

**Time:** 45-60 minutes  
**Level:** Intermediate to Advanced  
**Prerequisites:** Completed [Form Builder Tutorial](./form-builder.md)

## What You'll Build

An e-commerce cart that:

- Manages a product catalog
- Handles cart operations (add, remove, update quantity)
- Implements a multi-step checkout flow
- Validates cart constraints (max items, stock)
- Processes orders

## Step 1: Define the Models

Create the PSF schema for the e-commerce domain:

```json
{
  "$version": "1.0.0",
  "id": "ecommerce-cart",
  "name": "E-commerce Cart",

  "models": [
    {
      "name": "Product",
      "fields": [
        { "name": "id", "type": "uuid" },
        { "name": "name", "type": "string" },
        { "name": "description", "type": "string" },
        { "name": "price", "type": "number" },
        { "name": "stock", "type": "number" },
        { "name": "imageUrl", "type": "string" }
      ]
    },
    {
      "name": "CartItem",
      "fields": [
        { "name": "productId", "type": "string" },
        { "name": "quantity", "type": "number" },
        { "name": "priceAtAdd", "type": "number" }
      ]
    },
    {
      "name": "Order",
      "fields": [
        { "name": "id", "type": "uuid" },
        { "name": "items", "type": { "array": { "reference": "CartItem" } } },
        { "name": "total", "type": "number" },
        { "name": "status", "type": { "enum": ["pending", "processing", "shipped", "delivered"] } },
        { "name": "shippingAddress", "type": "object" },
        { "name": "createdAt", "type": "datetime" }
      ]
    }
  ]
}
```

## Step 2: Create the Engine

Create `src/engine.ts`:

```typescript
import {
  createPraxisEngine,
  PraxisRegistry,
  defineFact,
  defineEvent,
  defineRule,
  defineConstraint,
} from '@plures/praxis';

// Types
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
}

interface CartItem {
  productId: string;
  quantity: number;
  priceAtAdd: number;
}

interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  shippingAddress: ShippingAddress;
  createdAt: Date;
}

type CheckoutStep = 'cart' | 'shipping' | 'payment' | 'confirmation';

interface CartContext {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  checkoutStep: CheckoutStep;
  shippingAddress: ShippingAddress | null;
  paymentMethod: string | null;
  lastError: string | null;
}

// Facts
export const ItemAddedToCart = defineFact<
  'ItemAddedToCart',
  { productId: string; quantity: number }
>('ItemAddedToCart');
export const ItemRemovedFromCart = defineFact<'ItemRemovedFromCart', { productId: string }>(
  'ItemRemovedFromCart'
);
export const QuantityUpdated = defineFact<
  'QuantityUpdated',
  { productId: string; newQuantity: number }
>('QuantityUpdated');
export const CheckoutStarted = defineFact<'CheckoutStarted', {}>('CheckoutStarted');
export const ShippingEntered = defineFact<'ShippingEntered', { address: ShippingAddress }>(
  'ShippingEntered'
);
export const PaymentProcessed = defineFact<'PaymentProcessed', { success: boolean }>(
  'PaymentProcessed'
);
export const OrderPlaced = defineFact<'OrderPlaced', { orderId: string; total: number }>(
  'OrderPlaced'
);
export const CartCleared = defineFact<'CartCleared', {}>('CartCleared');

// Events
export const ADD_TO_CART = defineEvent<'ADD_TO_CART', { productId: string; quantity: number }>(
  'ADD_TO_CART'
);
export const REMOVE_FROM_CART = defineEvent<'REMOVE_FROM_CART', { productId: string }>(
  'REMOVE_FROM_CART'
);
export const UPDATE_QUANTITY = defineEvent<
  'UPDATE_QUANTITY',
  { productId: string; quantity: number }
>('UPDATE_QUANTITY');
export const START_CHECKOUT = defineEvent<'START_CHECKOUT', {}>('START_CHECKOUT');
export const ENTER_SHIPPING = defineEvent<'ENTER_SHIPPING', { address: ShippingAddress }>(
  'ENTER_SHIPPING'
);
export const ENTER_PAYMENT = defineEvent<'ENTER_PAYMENT', { method: string }>('ENTER_PAYMENT');
export const CONFIRM_ORDER = defineEvent<'CONFIRM_ORDER', {}>('CONFIRM_ORDER');
export const GO_BACK = defineEvent<'GO_BACK', {}>('GO_BACK');
export const CLEAR_CART = defineEvent<'CLEAR_CART', {}>('CLEAR_CART');

// Rules
const addToCartRule = defineRule<CartContext>({
  id: 'cart.addItem',
  description: 'Add item to cart',
  impl: (state, events) => {
    const event = events.find(ADD_TO_CART.is);
    if (!event) return [];

    const product = state.context.products.find((p) => p.id === event.payload.productId);
    if (!product) {
      state.context.lastError = 'Product not found';
      return [];
    }

    if (product.stock < event.payload.quantity) {
      state.context.lastError = 'Not enough stock';
      return [];
    }

    // Check if already in cart
    const existingItem = state.context.cart.find((i) => i.productId === event.payload.productId);
    if (existingItem) {
      existingItem.quantity += event.payload.quantity;
    } else {
      state.context.cart.push({
        productId: event.payload.productId,
        quantity: event.payload.quantity,
        priceAtAdd: product.price,
      });
    }

    state.context.lastError = null;
    return [
      ItemAddedToCart.create({
        productId: event.payload.productId,
        quantity: event.payload.quantity,
      }),
    ];
  },
});

const removeFromCartRule = defineRule<CartContext>({
  id: 'cart.removeItem',
  description: 'Remove item from cart',
  impl: (state, events) => {
    const event = events.find(REMOVE_FROM_CART.is);
    if (!event) return [];

    state.context.cart = state.context.cart.filter((i) => i.productId !== event.payload.productId);
    state.context.lastError = null;

    return [ItemRemovedFromCart.create({ productId: event.payload.productId })];
  },
});

const updateQuantityRule = defineRule<CartContext>({
  id: 'cart.updateQuantity',
  description: 'Update item quantity',
  impl: (state, events) => {
    const event = events.find(UPDATE_QUANTITY.is);
    if (!event) return [];

    const item = state.context.cart.find((i) => i.productId === event.payload.productId);
    if (!item) return [];

    const product = state.context.products.find((p) => p.id === event.payload.productId);
    if (product && event.payload.quantity > product.stock) {
      state.context.lastError = 'Not enough stock';
      return [];
    }

    if (event.payload.quantity <= 0) {
      state.context.cart = state.context.cart.filter(
        (i) => i.productId !== event.payload.productId
      );
    } else {
      item.quantity = event.payload.quantity;
    }

    state.context.lastError = null;
    return [
      QuantityUpdated.create({
        productId: event.payload.productId,
        newQuantity: event.payload.quantity,
      }),
    ];
  },
});

const startCheckoutRule = defineRule<CartContext>({
  id: 'checkout.start',
  description: 'Start the checkout process',
  impl: (state, events) => {
    const event = events.find(START_CHECKOUT.is);
    if (!event) return [];

    if (state.context.cart.length === 0) {
      state.context.lastError = 'Cart is empty';
      return [];
    }

    state.context.checkoutStep = 'shipping';
    state.context.lastError = null;

    return [CheckoutStarted.create({})];
  },
});

const enterShippingRule = defineRule<CartContext>({
  id: 'checkout.shipping',
  description: 'Enter shipping information',
  impl: (state, events) => {
    const event = events.find(ENTER_SHIPPING.is);
    if (!event) return [];

    state.context.shippingAddress = event.payload.address;
    state.context.checkoutStep = 'payment';
    state.context.lastError = null;

    return [ShippingEntered.create({ address: event.payload.address })];
  },
});

const enterPaymentRule = defineRule<CartContext>({
  id: 'checkout.payment',
  description: 'Enter payment method',
  impl: (state, events) => {
    const event = events.find(ENTER_PAYMENT.is);
    if (!event) return [];

    state.context.paymentMethod = event.payload.method;
    state.context.checkoutStep = 'confirmation';
    state.context.lastError = null;

    return [];
  },
});

const confirmOrderRule = defineRule<CartContext>({
  id: 'checkout.confirm',
  description: 'Confirm and place order',
  impl: (state, events) => {
    const event = events.find(CONFIRM_ORDER.is);
    if (!event) return [];

    if (!state.context.shippingAddress || !state.context.paymentMethod) {
      state.context.lastError = 'Missing checkout information';
      return [];
    }

    // Calculate total
    const total = state.context.cart.reduce((sum, item) => {
      return sum + item.priceAtAdd * item.quantity;
    }, 0);

    // Create order
    const orderId = `order_${Date.now().toString(36)}`;
    const order: Order = {
      id: orderId,
      items: [...state.context.cart],
      total,
      status: 'pending',
      shippingAddress: state.context.shippingAddress,
      createdAt: new Date(),
    };

    state.context.orders.push(order);

    // Update stock
    for (const item of state.context.cart) {
      const product = state.context.products.find((p) => p.id === item.productId);
      if (product) {
        product.stock -= item.quantity;
      }
    }

    // Clear cart and reset checkout
    state.context.cart = [];
    state.context.checkoutStep = 'cart';
    state.context.shippingAddress = null;
    state.context.paymentMethod = null;
    state.context.lastError = null;

    return [
      PaymentProcessed.create({ success: true }),
      OrderPlaced.create({ orderId, total }),
      CartCleared.create({}),
    ];
  },
});

const goBackRule = defineRule<CartContext>({
  id: 'checkout.back',
  description: 'Go back in checkout flow',
  impl: (state, events) => {
    const event = events.find(GO_BACK.is);
    if (!event) return [];

    const stepOrder: CheckoutStep[] = ['cart', 'shipping', 'payment', 'confirmation'];
    const currentIndex = stepOrder.indexOf(state.context.checkoutStep);

    if (currentIndex > 0) {
      state.context.checkoutStep = stepOrder[currentIndex - 1];
    }

    return [];
  },
});

const clearCartRule = defineRule<CartContext>({
  id: 'cart.clear',
  description: 'Clear all items from cart',
  impl: (state, events) => {
    const event = events.find(CLEAR_CART.is);
    if (!event) return [];

    state.context.cart = [];
    state.context.checkoutStep = 'cart';
    state.context.shippingAddress = null;
    state.context.paymentMethod = null;

    return [CartCleared.create({})];
  },
});

// Constraints
const maxCartItemsConstraint = defineConstraint<CartContext>({
  id: 'cart.maxItems',
  description: 'Cart cannot have more than 20 unique items',
  check: (state) => state.context.cart.length <= 20,
  errorMessage: 'Cart cannot have more than 20 different items',
  severity: 'error',
});

const maxQuantityConstraint = defineConstraint<CartContext>({
  id: 'cart.maxQuantity',
  description: 'Cannot order more than 10 of each item',
  check: (state) => state.context.cart.every((item) => item.quantity <= 10),
  errorMessage: 'Cannot order more than 10 of each item',
  severity: 'error',
});

const stockConstraint = defineConstraint<CartContext>({
  id: 'cart.inStock',
  description: 'Cart items must be in stock',
  check: (state) => {
    for (const item of state.context.cart) {
      const product = state.context.products.find((p) => p.id === item.productId);
      if (!product || product.stock < item.quantity) {
        return false;
      }
    }
    return true;
  },
  errorMessage: 'Some items are out of stock',
  severity: 'error',
});

// Registry
const registry = new PraxisRegistry<CartContext>();
registry.registerRule(addToCartRule);
registry.registerRule(removeFromCartRule);
registry.registerRule(updateQuantityRule);
registry.registerRule(startCheckoutRule);
registry.registerRule(enterShippingRule);
registry.registerRule(enterPaymentRule);
registry.registerRule(confirmOrderRule);
registry.registerRule(goBackRule);
registry.registerRule(clearCartRule);
registry.registerConstraint(maxCartItemsConstraint);
registry.registerConstraint(maxQuantityConstraint);
registry.registerConstraint(stockConstraint);

// Sample products
const sampleProducts: Product[] = [
  {
    id: 'p1',
    name: 'Laptop',
    description: 'High-performance laptop',
    price: 999.99,
    stock: 10,
    imageUrl: '',
  },
  {
    id: 'p2',
    name: 'Headphones',
    description: 'Wireless headphones',
    price: 149.99,
    stock: 25,
    imageUrl: '',
  },
  {
    id: 'p3',
    name: 'Keyboard',
    description: 'Mechanical keyboard',
    price: 79.99,
    stock: 50,
    imageUrl: '',
  },
  {
    id: 'p4',
    name: 'Mouse',
    description: 'Wireless mouse',
    price: 49.99,
    stock: 100,
    imageUrl: '',
  },
  {
    id: 'p5',
    name: 'Monitor',
    description: '27" 4K monitor',
    price: 399.99,
    stock: 5,
    imageUrl: '',
  },
];

// Engine factory
export function createCartEngine() {
  return createPraxisEngine({
    initialContext: {
      products: sampleProducts,
      cart: [],
      orders: [],
      checkoutStep: 'cart' as CheckoutStep,
      shippingAddress: null,
      paymentMethod: null,
      lastError: null,
    },
    registry,
    enableHistory: true,
  });
}

// Helper functions
export function getCartTotal(context: CartContext): number {
  return context.cart.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);
}

export function getCartItemCount(context: CartContext): number {
  return context.cart.reduce((sum, item) => sum + item.quantity, 0);
}

export function getCheckoutStepNumber(step: CheckoutStep): number {
  const steps: CheckoutStep[] = ['cart', 'shipping', 'payment', 'confirmation'];
  return steps.indexOf(step) + 1;
}
```

## Step 3: Demonstrate the Flow

Create `src/main.ts`:

```typescript
import {
  createCartEngine,
  ADD_TO_CART,
  UPDATE_QUANTITY,
  START_CHECKOUT,
  ENTER_SHIPPING,
  ENTER_PAYMENT,
  CONFIRM_ORDER,
  getCartTotal,
  getCartItemCount,
  getCheckoutStepNumber,
} from './engine';

async function main() {
  console.log('🛒 E-commerce Cart Demo\n');

  const engine = createCartEngine();

  // Helper to display cart
  function displayCart() {
    const ctx = engine.getContext();
    console.log('\n📦 Cart:');
    console.log('─'.repeat(50));

    if (ctx.cart.length === 0) {
      console.log('  (empty)');
    } else {
      ctx.cart.forEach((item, i) => {
        const product = ctx.products.find((p) => p.id === item.productId)!;
        const subtotal = item.quantity * item.priceAtAdd;
        console.log(
          `  ${i + 1}. ${product.name} x${item.quantity} @ $${item.priceAtAdd.toFixed(2)} = $${subtotal.toFixed(2)}`
        );
      });
      console.log('─'.repeat(50));
      console.log(`  Items: ${getCartItemCount(ctx)}`);
      console.log(`  Total: $${getCartTotal(ctx).toFixed(2)}`);
    }
    console.log('');
  }

  // Display products
  console.log('📋 Available Products:');
  engine.getContext().products.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} - $${p.price.toFixed(2)} (${p.stock} in stock)`);
  });

  displayCart();

  // Add items to cart
  console.log('Adding items to cart...');
  engine.dispatch([ADD_TO_CART.create({ productId: 'p1', quantity: 1 })]); // Laptop
  engine.dispatch([ADD_TO_CART.create({ productId: 'p2', quantity: 2 })]); // Headphones x2
  engine.dispatch([ADD_TO_CART.create({ productId: 'p4', quantity: 1 })]); // Mouse

  displayCart();

  // Update quantity
  console.log('Updating headphones quantity to 3...');
  engine.dispatch([UPDATE_QUANTITY.create({ productId: 'p2', quantity: 3 })]);

  displayCart();

  // Start checkout
  console.log('Starting checkout...');
  engine.dispatch([START_CHECKOUT.create({})]);
  console.log(
    `Checkout step: ${engine.getContext().checkoutStep} (${getCheckoutStepNumber(engine.getContext().checkoutStep)}/4)`
  );

  // Enter shipping
  console.log('\nEntering shipping information...');
  engine.dispatch([
    ENTER_SHIPPING.create({
      address: {
        name: 'John Doe',
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105',
        country: 'USA',
      },
    }),
  ]);
  console.log(
    `Checkout step: ${engine.getContext().checkoutStep} (${getCheckoutStepNumber(engine.getContext().checkoutStep)}/4)`
  );

  // Enter payment
  console.log('\nEntering payment method...');
  engine.dispatch([ENTER_PAYMENT.create({ method: 'credit_card' })]);
  console.log(
    `Checkout step: ${engine.getContext().checkoutStep} (${getCheckoutStepNumber(engine.getContext().checkoutStep)}/4)`
  );

  // Confirm order
  console.log('\nConfirming order...');
  const result = engine.step([CONFIRM_ORDER.create({})]);

  // Check for order confirmation
  const orderPlaced = result.state.facts.find((f) => f.tag === 'OrderPlaced');
  if (orderPlaced) {
    console.log('✅ Order placed successfully!');
    console.log(`   Order ID: ${(orderPlaced.payload as any).orderId}`);
    console.log(`   Total: $${(orderPlaced.payload as any).total.toFixed(2)}`);
  }

  // Display orders
  console.log('\n📋 Orders:');
  console.log('─'.repeat(50));
  engine.getContext().orders.forEach((order, i) => {
    console.log(`  ${i + 1}. ${order.id}`);
    console.log(`     Status: ${order.status}`);
    console.log(`     Total: $${order.total.toFixed(2)}`);
    console.log(`     Items: ${order.items.length}`);
    console.log(`     Created: ${order.createdAt.toLocaleString()}`);
  });

  // Show updated stock
  console.log('\n📦 Updated Stock:');
  engine.getContext().products.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} - ${p.stock} in stock`);
  });

  displayCart();

  console.log('🎉 Done!');
}

main().catch(console.error);
```

## Key Patterns Learned

### 1. Multi-Step Flows

Using state to track flow progress:

```typescript
type CheckoutStep = 'cart' | 'shipping' | 'payment' | 'confirmation';

interface Context {
  checkoutStep: CheckoutStep;
}
```

### 2. Related State Updates

Updating multiple pieces of state together:

```typescript
// Clear cart and reset checkout in one step
state.context.cart = [];
state.context.checkoutStep = 'cart';
state.context.shippingAddress = null;
```

### 3. Business Constraints

Enforcing business rules:

```typescript
const stockConstraint = defineConstraint({
  check: (state) =>
    state.context.cart.every(
      (item) => products.find((p) => p.id === item.productId)?.stock >= item.quantity
    ),
});
```

### 4. Multiple Facts

Emitting multiple facts from a single rule:

```typescript
return [
  PaymentProcessed.create({ success: true }),
  OrderPlaced.create({ orderId, total }),
  CartCleared.create({}),
];
```

## Next Steps

- Add product search and filtering
- Implement discount codes and promotions
- Add order history and tracking
- Integrate with a payment provider

---

**Back to:** [Tutorials](./README.md)
