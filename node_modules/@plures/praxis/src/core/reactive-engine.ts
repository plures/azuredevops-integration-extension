/**
 * Praxis Reactive Logic Engine
 * 
 * A framework-agnostic reactive implementation of the Praxis Logic Engine.
 * Uses JavaScript Proxies to provide reactivity without Svelte-specific primitives.
 * 
 * This implementation provides:
 * - Proxy-based state tracking for automatic reactivity
 * - Subscription-based change notifications
 * - Computed/derived values support
 * - Compatible API with Svelte-based implementation
 */

export interface ReactiveEngineOptions<TContext> {
    initialContext: TContext;
    initialFacts?: any[];
    initialMeta?: Record<string, unknown>;
}

/**
 * Callback type for state change subscribers
 */
export type StateChangeCallback<TContext> = (state: {
    context: TContext;
    facts: any[];
    meta: Record<string, unknown>;
}) => void;

/**
 * Callback type for unsubscribe function
 */
export type UnsubscribeFn = () => void;

/**
 * Framework-agnostic reactive logic engine using JavaScript Proxies
 */
export class ReactiveLogicEngine<TContext extends object> {
    private _state: { context: TContext; facts: any[]; meta: Record<string, unknown> };
    private _subscribers = new Set<StateChangeCallback<TContext>>();
    private _contextProxy: TContext;
    private _factsProxy: any[];
    private _metaProxy: Record<string, unknown>;
    private _batchDepth = 0;
    private _pendingNotification = false;
    private _proxyCache = new WeakMap<object, any>();
    
    // Array methods that mutate the array
    private static readonly ARRAY_MUTATORS = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];

    constructor(options: ReactiveEngineOptions<TContext>) {
        // Initialize raw state
        this._state = {
            context: options.initialContext,
            facts: options.initialFacts ?? [],
            meta: options.initialMeta ?? {},
        };

        // Create reactive proxies
        this._contextProxy = this._createReactiveProxy(this._state.context);
        this._factsProxy = this._createReactiveProxy(this._state.facts);
        this._metaProxy = this._createReactiveProxy(this._state.meta);
    }

    /**
     * Create a reactive proxy that notifies subscribers on changes.
     * Uses a WeakMap cache to avoid creating multiple proxies for the same object.
     */
    private _createReactiveProxy<T extends object>(target: T): T {
        // Check cache first
        const cached = this._proxyCache.get(target);
        if (cached) {
            return cached;
        }
        
        const self = this;
        
        const handler: ProxyHandler<T> = {
            get(obj, prop) {
                const value = Reflect.get(obj, prop);
                
                // If the value is an object or array, wrap it in a proxy too
                if (value && typeof value === 'object') {
                    return self._createReactiveProxy(value);
                }
                
                // Bind array methods to notify on mutations
                if (Array.isArray(obj) && typeof value === 'function') {
                    if (ReactiveLogicEngine.ARRAY_MUTATORS.includes(prop as string)) {
                        return function(...args: any[]) {
                            const result = (value as Function).apply(obj, args);
                            self._notify();
                            return result;
                        };
                    }
                }
                
                return value;
            },
            set(obj, prop, value) {
                const oldValue = (obj as any)[prop];
                const result = Reflect.set(obj, prop, value);
                
                // Only notify if value actually changed
                if (oldValue !== value) {
                    self._notify();
                }
                
                return result;
            },
            deleteProperty(obj, prop) {
                const result = Reflect.deleteProperty(obj, prop);
                self._notify();
                return result;
            },
        };
        
        const proxy = new Proxy(target, handler);
        
        // Cache the proxy
        this._proxyCache.set(target, proxy);
        
        return proxy;
    }

    /**
     * Notify all subscribers of state changes
     */
    private _notify() {
        // If we're in a batch, just mark that we need to notify
        if (this._batchDepth > 0) {
            this._pendingNotification = true;
            return;
        }
        
        // Pass proxy versions to subscribers so they can't bypass reactivity
        const currentState = {
            context: this._contextProxy,
            facts: this._factsProxy,
            meta: this._metaProxy,
        };
        
        this._subscribers.forEach((callback) => {
            try {
                callback(currentState);
            } catch (error) {
                console.error('Error in reactive engine subscriber:', error);
            }
        });
    }

    /**
     * Get the full state object
     */
    get state(): { context: TContext; facts: any[]; meta: Record<string, unknown> } {
        return {
            context: this._contextProxy,
            facts: this._factsProxy,
            meta: this._metaProxy,
        };
    }

    /**
     * Access the reactive context.
     * Changes to this object will trigger subscriber notifications.
     */
    get context(): TContext {
        return this._contextProxy;
    }

    /**
     * Access the reactive facts list.
     * Changes to this array will trigger subscriber notifications.
     */
    get facts(): any[] {
        return this._factsProxy;
    }

    /**
     * Access the reactive metadata.
     * Changes to this object will trigger subscriber notifications.
     */
    get meta(): Record<string, unknown> {
        return this._metaProxy;
    }

    /**
     * Apply a mutation to the state.
     * This is the "Action" or "Rule" equivalent.
     * Mutations are batched - notifications only happen once per apply call.
     * 
     * @param mutator A function that receives the state and modifies it.
     */
    apply(mutator: (state: { context: TContext; facts: any[]; meta: Record<string, unknown> }) => void): void {
        this._batchDepth++;
        try {
            mutator({
                context: this._contextProxy,
                facts: this._factsProxy,
                meta: this._metaProxy,
            });
        } finally {
            this._batchDepth--;
            if (this._batchDepth === 0 && this._pendingNotification) {
                this._pendingNotification = false;
                this._notify();
            }
        }
    }

    /**
     * Subscribe to state changes.
     * Returns an unsubscribe function.
     * 
     * @param callback Function to call when state changes
     * @returns Unsubscribe function
     */
    subscribe(callback: StateChangeCallback<TContext>): UnsubscribeFn {
        this._subscribers.add(callback);
        
        // Immediately call with current state (using proxy versions)
        try {
            callback({
                context: this._contextProxy,
                facts: this._factsProxy,
                meta: this._metaProxy,
            });
        } catch (error) {
            console.error('Error in reactive engine subscriber:', error);
        }
        
        // Return unsubscribe function
        return () => {
            this._subscribers.delete(callback);
        };
    }

    /**
     * Create a derived/computed value from the state.
     * The selector function will be called whenever the state changes.
     * 
     * @param selector Function to extract derived value from state
     * @returns Object with subscribe method for reactive updates
     */
    $derived<TDerived>(
        selector: (state: { context: TContext; facts: any[]; meta: Record<string, unknown> }) => TDerived
    ): { subscribe: (callback: (value: TDerived) => void) => UnsubscribeFn } {
        const subscribers = new Set<(value: TDerived) => void>();
        let currentValue = selector({
            context: this._contextProxy,
            facts: this._factsProxy,
            meta: this._metaProxy,
        });

        // Subscribe to state changes and recompute derived value
        this.subscribe(() => {
            const newValue = selector({
                context: this._contextProxy,
                facts: this._factsProxy,
                meta: this._metaProxy,
            });
            
            // Only notify if value changed
            if (newValue !== currentValue) {
                currentValue = newValue;
                subscribers.forEach((callback) => {
                    try {
                        callback(currentValue);
                    } catch (error) {
                        console.error('Error in derived value subscriber:', error);
                    }
                });
            }
        });

        return {
            subscribe: (callback: (value: TDerived) => void) => {
                subscribers.add(callback);
                try {
                    callback(currentValue); // Immediately call with current value
                } catch (error) {
                    console.error('Error in derived value subscriber:', error);
                }
                return () => {
                    subscribers.delete(callback);
                };
            },
        };
    }
}

/**
 * Create a new reactive logic engine instance.
 * 
 * @param options Configuration options for the reactive engine
 * @returns A new ReactiveLogicEngine instance
 * 
 * @example
 * ```typescript
 * const engine = createReactiveEngine({
 *   initialContext: { count: 0 },
 *   initialFacts: [],
 *   initialMeta: {}
 * });
 * 
 * // Subscribe to changes
 * engine.subscribe((state) => {
 *   console.log('State changed:', state);
 * });
 * 
 * // Mutate state (will trigger subscribers)
 * engine.apply((state) => {
 *   state.context.count++;
 * });
 * ```
 */
export function createReactiveEngine<TContext extends object>(
    options: ReactiveEngineOptions<TContext>
): ReactiveLogicEngine<TContext> {
    return new ReactiveLogicEngine(options);
}
