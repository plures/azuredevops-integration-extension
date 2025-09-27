var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// node_modules/svelte/src/runtime/internal/utils.js
function noop() {
}
function run(fn) {
  return fn();
}
function blank_object() {
  return /* @__PURE__ */ Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
function is_function(thing) {
  return typeof thing === "function";
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || a && typeof a === "object" || typeof a === "function";
}
function is_empty(obj) {
  return Object.keys(obj).length === 0;
}
function subscribe(store2, ...callbacks) {
  if (store2 == null) {
    for (const callback of callbacks) {
      callback(void 0);
    }
    return noop;
  }
  const unsub = store2.subscribe(...callbacks);
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function component_subscribe(component, store2, callback) {
  component.$$.on_destroy.push(subscribe(store2, callback));
}

// node_modules/svelte/src/runtime/internal/globals.js
var globals = typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : (
  // @ts-ignore Node typings have this
  global
);

// node_modules/svelte/src/runtime/internal/ResizeObserverSingleton.js
var ResizeObserverSingleton = class _ResizeObserverSingleton {
  /** @param {ResizeObserverOptions} options */
  constructor(options) {
    /**
     * @private
     * @readonly
     * @type {WeakMap<Element, import('./private.js').Listener>}
     */
    __publicField(this, "_listeners", "WeakMap" in globals ? /* @__PURE__ */ new WeakMap() : void 0);
    /**
     * @private
     * @type {ResizeObserver}
     */
    __publicField(this, "_observer");
    /** @type {ResizeObserverOptions} */
    __publicField(this, "options");
    this.options = options;
  }
  /**
   * @param {Element} element
   * @param {import('./private.js').Listener} listener
   * @returns {() => void}
   */
  observe(element2, listener) {
    this._listeners.set(element2, listener);
    this._getObserver().observe(element2, this.options);
    return () => {
      this._listeners.delete(element2);
      this._observer.unobserve(element2);
    };
  }
  /**
   * @private
   */
  _getObserver() {
    return this._observer ?? (this._observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        _ResizeObserverSingleton.entries.set(entry.target, entry);
        this._listeners.get(entry.target)?.(entry);
      }
    }));
  }
};
ResizeObserverSingleton.entries = "WeakMap" in globals ? /* @__PURE__ */ new WeakMap() : void 0;

// node_modules/svelte/src/runtime/internal/dom.js
var is_hydrating = false;
function start_hydrating() {
  is_hydrating = true;
}
function end_hydrating() {
  is_hydrating = false;
}
function append(target, node) {
  target.appendChild(node);
}
function insert(target, node, anchor) {
  target.insertBefore(node, anchor || null);
}
function detach(node) {
  if (node.parentNode) {
    node.parentNode.removeChild(node);
  }
}
function destroy_each(iterations, detaching) {
  for (let i = 0; i < iterations.length; i += 1) {
    if (iterations[i]) iterations[i].d(detaching);
  }
}
function element(name) {
  return document.createElement(name);
}
function text(data) {
  return document.createTextNode(data);
}
function space() {
  return text(" ");
}
function empty() {
  return text("");
}
function listen(node, event, handler, options) {
  node.addEventListener(event, handler, options);
  return () => node.removeEventListener(event, handler, options);
}
function prevent_default(fn) {
  return function(event) {
    event.preventDefault();
    return fn.call(this, event);
  };
}
function stop_propagation(fn) {
  return function(event) {
    event.stopPropagation();
    return fn.call(this, event);
  };
}
function attr(node, attribute, value) {
  if (value == null) node.removeAttribute(attribute);
  else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
}
function children(element2) {
  return Array.from(element2.childNodes);
}
function set_data(text2, data) {
  data = "" + data;
  if (text2.data === data) return;
  text2.data = /** @type {string} */
  data;
}
function set_input_value(input, value) {
  input.value = value == null ? "" : value;
}
function set_style(node, key, value, important) {
  if (value == null) {
    node.style.removeProperty(key);
  } else {
    node.style.setProperty(key, value, important ? "important" : "");
  }
}
function select_option(select, value, mounting) {
  for (let i = 0; i < select.options.length; i += 1) {
    const option = select.options[i];
    if (option.__value === value) {
      option.selected = true;
      return;
    }
  }
  if (!mounting || value !== void 0) {
    select.selectedIndex = -1;
  }
}
function select_value(select) {
  const selected_option = select.querySelector(":checked");
  return selected_option && selected_option.__value;
}
function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
  return new CustomEvent(type, { detail, bubbles, cancelable });
}
function get_custom_elements_slots(element2) {
  const result = {};
  element2.childNodes.forEach(
    /** @param {Element} node */
    (node) => {
      result[node.slot || "default"] = true;
    }
  );
  return result;
}

// node_modules/svelte/src/runtime/internal/lifecycle.js
var current_component;
function set_current_component(component) {
  current_component = component;
}
function get_current_component() {
  if (!current_component) throw new Error("Function called outside component initialization");
  return current_component;
}
function createEventDispatcher() {
  const component = get_current_component();
  return (type, detail, { cancelable = false } = {}) => {
    const callbacks = component.$$.callbacks[type];
    if (callbacks) {
      const event = custom_event(
        /** @type {string} */
        type,
        detail,
        { cancelable }
      );
      callbacks.slice().forEach((fn) => {
        fn.call(component, event);
      });
      return !event.defaultPrevented;
    }
    return true;
  };
}

// node_modules/svelte/src/runtime/internal/scheduler.js
var dirty_components = [];
var binding_callbacks = [];
var render_callbacks = [];
var flush_callbacks = [];
var resolved_promise = /* @__PURE__ */ Promise.resolve();
var update_scheduled = false;
function schedule_update() {
  if (!update_scheduled) {
    update_scheduled = true;
    resolved_promise.then(flush);
  }
}
function add_render_callback(fn) {
  render_callbacks.push(fn);
}
var seen_callbacks = /* @__PURE__ */ new Set();
var flushidx = 0;
function flush() {
  if (flushidx !== 0) {
    return;
  }
  const saved_component = current_component;
  do {
    try {
      while (flushidx < dirty_components.length) {
        const component = dirty_components[flushidx];
        flushidx++;
        set_current_component(component);
        update(component.$$);
      }
    } catch (e) {
      dirty_components.length = 0;
      flushidx = 0;
      throw e;
    }
    set_current_component(null);
    dirty_components.length = 0;
    flushidx = 0;
    while (binding_callbacks.length) binding_callbacks.pop()();
    for (let i = 0; i < render_callbacks.length; i += 1) {
      const callback = render_callbacks[i];
      if (!seen_callbacks.has(callback)) {
        seen_callbacks.add(callback);
        callback();
      }
    }
    render_callbacks.length = 0;
  } while (dirty_components.length);
  while (flush_callbacks.length) {
    flush_callbacks.pop()();
  }
  update_scheduled = false;
  seen_callbacks.clear();
  set_current_component(saved_component);
}
function update($$) {
  if ($$.fragment !== null) {
    $$.update();
    run_all($$.before_update);
    const dirty = $$.dirty;
    $$.dirty = [-1];
    $$.fragment && $$.fragment.p($$.ctx, dirty);
    $$.after_update.forEach(add_render_callback);
  }
}
function flush_render_callbacks(fns) {
  const filtered = [];
  const targets = [];
  render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
  targets.forEach((c) => c());
  render_callbacks = filtered;
}

// node_modules/svelte/src/runtime/internal/transitions.js
var outroing = /* @__PURE__ */ new Set();
var outros;
function transition_in(block, local) {
  if (block && block.i) {
    outroing.delete(block);
    block.i(local);
  }
}
function transition_out(block, local, detach2, callback) {
  if (block && block.o) {
    if (outroing.has(block)) return;
    outroing.add(block);
    outros.c.push(() => {
      outroing.delete(block);
      if (callback) {
        if (detach2) block.d(1);
        callback();
      }
    });
    block.o(local);
  } else if (callback) {
    callback();
  }
}

// node_modules/svelte/src/runtime/internal/each.js
function ensure_array_like(array_like_or_iterator) {
  return array_like_or_iterator?.length !== void 0 ? array_like_or_iterator : Array.from(array_like_or_iterator);
}
function destroy_block(block, lookup) {
  block.d(1);
  lookup.delete(block.key);
}
function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block3, next, get_context) {
  let o = old_blocks.length;
  let n = list.length;
  let i = o;
  const old_indexes = {};
  while (i--) old_indexes[old_blocks[i].key] = i;
  const new_blocks = [];
  const new_lookup = /* @__PURE__ */ new Map();
  const deltas = /* @__PURE__ */ new Map();
  const updates = [];
  i = n;
  while (i--) {
    const child_ctx = get_context(ctx, list, i);
    const key = get_key(child_ctx);
    let block = lookup.get(key);
    if (!block) {
      block = create_each_block3(key, child_ctx);
      block.c();
    } else if (dynamic) {
      updates.push(() => block.p(child_ctx, dirty));
    }
    new_lookup.set(key, new_blocks[i] = block);
    if (key in old_indexes) deltas.set(key, Math.abs(i - old_indexes[key]));
  }
  const will_move = /* @__PURE__ */ new Set();
  const did_move = /* @__PURE__ */ new Set();
  function insert2(block) {
    transition_in(block, 1);
    block.m(node, next);
    lookup.set(block.key, block);
    next = block.first;
    n--;
  }
  while (o && n) {
    const new_block = new_blocks[n - 1];
    const old_block = old_blocks[o - 1];
    const new_key = new_block.key;
    const old_key = old_block.key;
    if (new_block === old_block) {
      next = new_block.first;
      o--;
      n--;
    } else if (!new_lookup.has(old_key)) {
      destroy(old_block, lookup);
      o--;
    } else if (!lookup.has(new_key) || will_move.has(new_key)) {
      insert2(new_block);
    } else if (did_move.has(old_key)) {
      o--;
    } else if (deltas.get(new_key) > deltas.get(old_key)) {
      did_move.add(new_key);
      insert2(new_block);
    } else {
      will_move.add(old_key);
      o--;
    }
  }
  while (o--) {
    const old_block = old_blocks[o];
    if (!new_lookup.has(old_block.key)) destroy(old_block, lookup);
  }
  while (n) insert2(new_blocks[n - 1]);
  run_all(updates);
  return new_blocks;
}

// node_modules/svelte/src/shared/boolean_attributes.js
var _boolean_attributes = (
  /** @type {const} */
  [
    "allowfullscreen",
    "allowpaymentrequest",
    "async",
    "autofocus",
    "autoplay",
    "checked",
    "controls",
    "default",
    "defer",
    "disabled",
    "formnovalidate",
    "hidden",
    "inert",
    "ismap",
    "loop",
    "multiple",
    "muted",
    "nomodule",
    "novalidate",
    "open",
    "playsinline",
    "readonly",
    "required",
    "reversed",
    "selected"
  ]
);
var boolean_attributes = /* @__PURE__ */ new Set([..._boolean_attributes]);

// node_modules/svelte/src/runtime/internal/Component.js
function create_component(block) {
  block && block.c();
}
function mount_component(component, target, anchor) {
  const { fragment, after_update } = component.$$;
  fragment && fragment.m(target, anchor);
  add_render_callback(() => {
    const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
    if (component.$$.on_destroy) {
      component.$$.on_destroy.push(...new_on_destroy);
    } else {
      run_all(new_on_destroy);
    }
    component.$$.on_mount = [];
  });
  after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
  const $$ = component.$$;
  if ($$.fragment !== null) {
    flush_render_callbacks($$.after_update);
    run_all($$.on_destroy);
    $$.fragment && $$.fragment.d(detaching);
    $$.on_destroy = $$.fragment = null;
    $$.ctx = [];
  }
}
function make_dirty(component, i) {
  if (component.$$.dirty[0] === -1) {
    dirty_components.push(component);
    schedule_update();
    component.$$.dirty.fill(0);
  }
  component.$$.dirty[i / 31 | 0] |= 1 << i % 31;
}
function init(component, options, instance3, create_fragment3, not_equal, props, append_styles = null, dirty = [-1]) {
  const parent_component = current_component;
  set_current_component(component);
  const $$ = component.$$ = {
    fragment: null,
    ctx: [],
    // state
    props,
    update: noop,
    not_equal,
    bound: blank_object(),
    // lifecycle
    on_mount: [],
    on_destroy: [],
    on_disconnect: [],
    before_update: [],
    after_update: [],
    context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
    // everything else
    callbacks: blank_object(),
    dirty,
    skip_bound: false,
    root: options.target || parent_component.$$.root
  };
  append_styles && append_styles($$.root);
  let ready = false;
  $$.ctx = instance3 ? instance3(component, options.props || {}, (i, ret, ...rest) => {
    const value = rest.length ? rest[0] : ret;
    if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
      if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
      if (ready) make_dirty(component, i);
    }
    return ret;
  }) : [];
  $$.update();
  ready = true;
  run_all($$.before_update);
  $$.fragment = create_fragment3 ? create_fragment3($$.ctx) : false;
  if (options.target) {
    if (options.hydrate) {
      start_hydrating();
      const nodes = children(options.target);
      $$.fragment && $$.fragment.l(nodes);
      nodes.forEach(detach);
    } else {
      $$.fragment && $$.fragment.c();
    }
    if (options.intro) transition_in(component.$$.fragment);
    mount_component(component, options.target, options.anchor);
    end_hydrating();
    flush();
  }
  set_current_component(parent_component);
}
var SvelteElement;
if (typeof HTMLElement === "function") {
  SvelteElement = class extends HTMLElement {
    constructor($$componentCtor, $$slots, use_shadow_dom) {
      super();
      /** The Svelte component constructor */
      __publicField(this, "$$ctor");
      /** Slots */
      __publicField(this, "$$s");
      /** The Svelte component instance */
      __publicField(this, "$$c");
      /** Whether or not the custom element is connected */
      __publicField(this, "$$cn", false);
      /** Component props data */
      __publicField(this, "$$d", {});
      /** `true` if currently in the process of reflecting component props back to attributes */
      __publicField(this, "$$r", false);
      /** @type {Record<string, CustomElementPropDefinition>} Props definition (name, reflected, type etc) */
      __publicField(this, "$$p_d", {});
      /** @type {Record<string, Function[]>} Event listeners */
      __publicField(this, "$$l", {});
      /** @type {Map<Function, Function>} Event listener unsubscribe functions */
      __publicField(this, "$$l_u", /* @__PURE__ */ new Map());
      this.$$ctor = $$componentCtor;
      this.$$s = $$slots;
      if (use_shadow_dom) {
        this.attachShadow({ mode: "open" });
      }
    }
    addEventListener(type, listener, options) {
      this.$$l[type] = this.$$l[type] || [];
      this.$$l[type].push(listener);
      if (this.$$c) {
        const unsub = this.$$c.$on(type, listener);
        this.$$l_u.set(listener, unsub);
      }
      super.addEventListener(type, listener, options);
    }
    removeEventListener(type, listener, options) {
      super.removeEventListener(type, listener, options);
      if (this.$$c) {
        const unsub = this.$$l_u.get(listener);
        if (unsub) {
          unsub();
          this.$$l_u.delete(listener);
        }
      }
      if (this.$$l[type]) {
        const idx = this.$$l[type].indexOf(listener);
        if (idx >= 0) {
          this.$$l[type].splice(idx, 1);
        }
      }
    }
    async connectedCallback() {
      this.$$cn = true;
      if (!this.$$c) {
        let create_slot = function(name) {
          return () => {
            let node;
            const obj = {
              c: function create() {
                node = element("slot");
                if (name !== "default") {
                  attr(node, "name", name);
                }
              },
              /**
               * @param {HTMLElement} target
               * @param {HTMLElement} [anchor]
               */
              m: function mount(target, anchor) {
                insert(target, node, anchor);
              },
              d: function destroy(detaching) {
                if (detaching) {
                  detach(node);
                }
              }
            };
            return obj;
          };
        };
        await Promise.resolve();
        if (!this.$$cn || this.$$c) {
          return;
        }
        const $$slots = {};
        const existing_slots = get_custom_elements_slots(this);
        for (const name of this.$$s) {
          if (name in existing_slots) {
            $$slots[name] = [create_slot(name)];
          }
        }
        for (const attribute of this.attributes) {
          const name = this.$$g_p(attribute.name);
          if (!(name in this.$$d)) {
            this.$$d[name] = get_custom_element_value(name, attribute.value, this.$$p_d, "toProp");
          }
        }
        for (const key in this.$$p_d) {
          if (!(key in this.$$d) && this[key] !== void 0) {
            this.$$d[key] = this[key];
            delete this[key];
          }
        }
        this.$$c = new this.$$ctor({
          target: this.shadowRoot || this,
          props: {
            ...this.$$d,
            $$slots,
            $$scope: {
              ctx: []
            }
          }
        });
        const reflect_attributes = () => {
          this.$$r = true;
          for (const key in this.$$p_d) {
            this.$$d[key] = this.$$c.$$.ctx[this.$$c.$$.props[key]];
            if (this.$$p_d[key].reflect) {
              const attribute_value = get_custom_element_value(
                key,
                this.$$d[key],
                this.$$p_d,
                "toAttribute"
              );
              if (attribute_value == null) {
                this.removeAttribute(this.$$p_d[key].attribute || key);
              } else {
                this.setAttribute(this.$$p_d[key].attribute || key, attribute_value);
              }
            }
          }
          this.$$r = false;
        };
        this.$$c.$$.after_update.push(reflect_attributes);
        reflect_attributes();
        for (const type in this.$$l) {
          for (const listener of this.$$l[type]) {
            const unsub = this.$$c.$on(type, listener);
            this.$$l_u.set(listener, unsub);
          }
        }
        this.$$l = {};
      }
    }
    // We don't need this when working within Svelte code, but for compatibility of people using this outside of Svelte
    // and setting attributes through setAttribute etc, this is helpful
    attributeChangedCallback(attr2, _oldValue, newValue) {
      if (this.$$r) return;
      attr2 = this.$$g_p(attr2);
      this.$$d[attr2] = get_custom_element_value(attr2, newValue, this.$$p_d, "toProp");
      this.$$c?.$set({ [attr2]: this.$$d[attr2] });
    }
    disconnectedCallback() {
      this.$$cn = false;
      Promise.resolve().then(() => {
        if (!this.$$cn && this.$$c) {
          this.$$c.$destroy();
          this.$$c = void 0;
        }
      });
    }
    $$g_p(attribute_name) {
      return Object.keys(this.$$p_d).find(
        (key) => this.$$p_d[key].attribute === attribute_name || !this.$$p_d[key].attribute && key.toLowerCase() === attribute_name
      ) || attribute_name;
    }
  };
}
function get_custom_element_value(prop, value, props_definition, transform) {
  const type = props_definition[prop]?.type;
  value = type === "Boolean" && typeof value !== "boolean" ? value != null : value;
  if (!transform || !props_definition[prop]) {
    return value;
  } else if (transform === "toAttribute") {
    switch (type) {
      case "Object":
      case "Array":
        return value == null ? null : JSON.stringify(value);
      case "Boolean":
        return value ? "" : null;
      case "Number":
        return value == null ? null : value;
      default:
        return value;
    }
  } else {
    switch (type) {
      case "Object":
      case "Array":
        return value && JSON.parse(value);
      case "Boolean":
        return value;
      // conversion already handled above
      case "Number":
        return value != null ? +value : value;
      default:
        return value;
    }
  }
}
var SvelteComponent = class {
  constructor() {
    /**
     * ### PRIVATE API
     *
     * Do not use, may change at any time
     *
     * @type {any}
     */
    __publicField(this, "$$");
    /**
     * ### PRIVATE API
     *
     * Do not use, may change at any time
     *
     * @type {any}
     */
    __publicField(this, "$$set");
  }
  /** @returns {void} */
  $destroy() {
    destroy_component(this, 1);
    this.$destroy = noop;
  }
  /**
   * @template {Extract<keyof Events, string>} K
   * @param {K} type
   * @param {((e: Events[K]) => void) | null | undefined} callback
   * @returns {() => void}
   */
  $on(type, callback) {
    if (!is_function(callback)) {
      return noop;
    }
    const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
    callbacks.push(callback);
    return () => {
      const index = callbacks.indexOf(callback);
      if (index !== -1) callbacks.splice(index, 1);
    };
  }
  /**
   * @param {Partial<Props>} props
   * @returns {void}
   */
  $set(props) {
    if (this.$$set && !is_empty(props)) {
      this.$$.skip_bound = true;
      this.$$set(props);
      this.$$.skip_bound = false;
    }
  }
};

// node_modules/svelte/src/shared/version.js
var PUBLIC_VERSION = "4";

// node_modules/svelte/src/runtime/internal/disclose-version/index.js
if (typeof window !== "undefined")
  (window.__svelte || (window.__svelte = { v: /* @__PURE__ */ new Set() })).v.add(PUBLIC_VERSION);

// node_modules/svelte/src/runtime/store/index.js
var subscriber_queue = [];
function writable(value, start = noop) {
  let stop;
  const subscribers = /* @__PURE__ */ new Set();
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update2(fn) {
    set(fn(value));
  }
  function subscribe2(run2, invalidate = noop) {
    const subscriber = [run2, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set, update2) || noop;
    }
    run2(value);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0 && stop) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update: update2, subscribe: subscribe2 };
}

// src/webview/toastStore.ts
var counter = 0;
var store = writable([]);
var toasts = store;
function addToast(message, opts = {}) {
  const id = ++counter;
  const toast = {
    id,
    message,
    type: opts.type || "info",
    timeout: typeof opts.timeout === "number" ? opts.timeout : opts.type === "error" ? 8e3 : 4e3
  };
  store.update((list) => [...list, toast]);
  if (toast.timeout > 0) {
    setTimeout(() => removeToast(id), toast.timeout);
  }
  return id;
}
function removeToast(id) {
  store.update((list) => list.filter((t) => t.id !== id));
}

// src/webview/Toasts.svelte
function get_each_context(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[3] = list[i];
  return child_ctx;
}
function create_each_block(key_1, ctx) {
  let div1;
  let div0;
  let t0_value = (
    /*t*/
    ctx[3].message + ""
  );
  let t0;
  let t1;
  let button;
  let t3;
  let div1_class_value;
  let mounted;
  let dispose;
  function click_handler() {
    return (
      /*click_handler*/
      ctx[2](
        /*t*/
        ctx[3]
      )
    );
  }
  return {
    key: key_1,
    first: null,
    c() {
      div1 = element("div");
      div0 = element("div");
      t0 = text(t0_value);
      t1 = space();
      button = element("button");
      button.textContent = "\xD7";
      t3 = space();
      attr(div0, "class", "msg svelte-cy4nnu");
      attr(button, "class", "close svelte-cy4nnu");
      attr(button, "title", "Dismiss");
      attr(button, "aria-label", "Dismiss notification");
      attr(div1, "class", div1_class_value = "toast " + /*t*/
      ctx[3].type + " svelte-cy4nnu");
      attr(div1, "role", "status");
      this.first = div1;
    },
    m(target, anchor) {
      insert(target, div1, anchor);
      append(div1, div0);
      append(div0, t0);
      append(div1, t1);
      append(div1, button);
      append(div1, t3);
      if (!mounted) {
        dispose = listen(button, "click", click_handler);
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      ctx = new_ctx;
      if (dirty & /*$toasts*/
      2 && t0_value !== (t0_value = /*t*/
      ctx[3].message + "")) set_data(t0, t0_value);
      if (dirty & /*$toasts*/
      2 && div1_class_value !== (div1_class_value = "toast " + /*t*/
      ctx[3].type + " svelte-cy4nnu")) {
        attr(div1, "class", div1_class_value);
      }
    },
    d(detaching) {
      if (detaching) {
        detach(div1);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_fragment(ctx) {
  let div;
  let each_blocks = [];
  let each_1_lookup = /* @__PURE__ */ new Map();
  let each_value = ensure_array_like(
    /*$toasts*/
    ctx[1]
  );
  const get_key = (ctx2) => (
    /*t*/
    ctx2[3].id
  );
  for (let i = 0; i < each_value.length; i += 1) {
    let child_ctx = get_each_context(ctx, each_value, i);
    let key = get_key(child_ctx);
    each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
  }
  return {
    c() {
      div = element("div");
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      attr(div, "class", "toast-region svelte-cy4nnu");
      attr(div, "role", "region");
      attr(div, "aria-live", "polite");
      attr(
        div,
        "aria-label",
        /*ariaLabel*/
        ctx[0]
      );
    },
    m(target, anchor) {
      insert(target, div, anchor);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(div, null);
        }
      }
    },
    p(ctx2, [dirty]) {
      if (dirty & /*$toasts*/
      2) {
        each_value = ensure_array_like(
          /*$toasts*/
          ctx2[1]
        );
        each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx2, each_value, each_1_lookup, div, destroy_block, create_each_block, null, get_each_context);
      }
      if (dirty & /*ariaLabel*/
      1) {
        attr(
          div,
          "aria-label",
          /*ariaLabel*/
          ctx2[0]
        );
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching) {
        detach(div);
      }
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].d();
      }
    }
  };
}
function instance($$self, $$props, $$invalidate) {
  let $toasts;
  component_subscribe($$self, toasts, ($$value) => $$invalidate(1, $toasts = $$value));
  let { ariaLabel = "Notifications" } = $$props;
  const click_handler = (t) => removeToast(t.id);
  $$self.$$set = ($$props2) => {
    if ("ariaLabel" in $$props2) $$invalidate(0, ariaLabel = $$props2.ariaLabel);
  };
  return [ariaLabel, $toasts, click_handler];
}
var Toasts = class extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance, create_fragment, safe_not_equal, { ariaLabel: 0 });
  }
};
var Toasts_default = Toasts;

// src/webview/App.svelte
function get_each_context_2(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[77] = list[i];
  return child_ctx;
}
function get_each_context2(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[74] = list[i];
  return child_ctx;
}
function get_each_context_1(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[77] = list[i];
  return child_ctx;
}
function get_each_context_4(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[85] = list[i];
  return child_ctx;
}
function get_each_context_3(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[82] = list[i];
  return child_ctx;
}
function get_each_context_5(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[88] = list[i];
  return child_ctx;
}
function create_if_block_26(ctx) {
  let span;
  let t0;
  let t1;
  let t2;
  return {
    c() {
      span = element("span");
      t0 = text("(");
      t1 = text(
        /*subtitle*/
        ctx[4]
      );
      t2 = text(")");
      attr(span, "class", "muted svelte-s1e7ae");
    },
    m(target, anchor) {
      insert(target, span, anchor);
      append(span, t0);
      append(span, t1);
      append(span, t2);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*subtitle*/
      16) set_data(
        t1,
        /*subtitle*/
        ctx2[4]
      );
    },
    d(detaching) {
      if (detaching) {
        detach(span);
      }
    }
  };
}
function create_if_block_25(ctx) {
  let span;
  return {
    c() {
      span = element("span");
      attr(span, "class", "spinner svelte-s1e7ae");
      attr(span, "role", "status");
      attr(span, "aria-label", "Loading");
      attr(span, "title", "Loading");
    },
    m(target, anchor) {
      insert(target, span, anchor);
    },
    d(detaching) {
      if (detaching) {
        detach(span);
      }
    }
  };
}
function create_if_block_22(ctx) {
  let span;
  let t0;
  let t1_value = (
    /*timerRunning*/
    ctx[6] ? "Running" : "Paused"
  );
  let t1;
  let t2;
  let t3;
  let if_block1_anchor;
  let if_block0 = (
    /*timerElapsedLabel*/
    ctx[7] && create_if_block_24(ctx)
  );
  let if_block1 = (
    /*activeId*/
    ctx[8] && create_if_block_23(ctx)
  );
  return {
    c() {
      span = element("span");
      t0 = text("\u2022 ");
      t1 = text(t1_value);
      t2 = space();
      if (if_block0) if_block0.c();
      t3 = space();
      if (if_block1) if_block1.c();
      if_block1_anchor = empty();
      attr(span, "class", "muted svelte-s1e7ae");
    },
    m(target, anchor) {
      insert(target, span, anchor);
      append(span, t0);
      append(span, t1);
      append(span, t2);
      if (if_block0) if_block0.m(span, null);
      insert(target, t3, anchor);
      if (if_block1) if_block1.m(target, anchor);
      insert(target, if_block1_anchor, anchor);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*timerRunning*/
      64 && t1_value !== (t1_value = /*timerRunning*/
      ctx2[6] ? "Running" : "Paused")) set_data(t1, t1_value);
      if (
        /*timerElapsedLabel*/
        ctx2[7]
      ) {
        if (if_block0) {
          if_block0.p(ctx2, dirty);
        } else {
          if_block0 = create_if_block_24(ctx2);
          if_block0.c();
          if_block0.m(span, null);
        }
      } else if (if_block0) {
        if_block0.d(1);
        if_block0 = null;
      }
      if (
        /*activeId*/
        ctx2[8]
      ) {
        if (if_block1) {
          if_block1.p(ctx2, dirty);
        } else {
          if_block1 = create_if_block_23(ctx2);
          if_block1.c();
          if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
        }
      } else if (if_block1) {
        if_block1.d(1);
        if_block1 = null;
      }
    },
    d(detaching) {
      if (detaching) {
        detach(span);
        detach(t3);
        detach(if_block1_anchor);
      }
      if (if_block0) if_block0.d();
      if (if_block1) if_block1.d(detaching);
    }
  };
}
function create_if_block_24(ctx) {
  let t0;
  let t1;
  let t2;
  return {
    c() {
      t0 = text("(");
      t1 = text(
        /*timerElapsedLabel*/
        ctx[7]
      );
      t2 = text(")");
    },
    m(target, anchor) {
      insert(target, t0, anchor);
      insert(target, t1, anchor);
      insert(target, t2, anchor);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*timerElapsedLabel*/
      128) set_data(
        t1,
        /*timerElapsedLabel*/
        ctx2[7]
      );
    },
    d(detaching) {
      if (detaching) {
        detach(t0);
        detach(t1);
        detach(t2);
      }
    }
  };
}
function create_if_block_23(ctx) {
  let button;
  let t0;
  let t1;
  let button_title_value;
  let button_aria_label_value;
  let mounted;
  let dispose;
  return {
    c() {
      button = element("button");
      t0 = text("#");
      t1 = text(
        /*activeId*/
        ctx[8]
      );
      attr(button, "title", button_title_value = /*activeTitle*/
      ctx[9] || "Open active work item");
      attr(button, "aria-label", button_aria_label_value = `Open active work item #${/*activeId*/
      ctx[8]}`);
      attr(button, "class", "svelte-s1e7ae");
    },
    m(target, anchor) {
      insert(target, button, anchor);
      append(button, t0);
      append(button, t1);
      if (!mounted) {
        dispose = listen(
          button,
          "click",
          /*onOpenActive*/
          ctx[32]
        );
        mounted = true;
      }
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*activeId*/
      256) set_data(
        t1,
        /*activeId*/
        ctx2[8]
      );
      if (dirty[0] & /*activeTitle*/
      512 && button_title_value !== (button_title_value = /*activeTitle*/
      ctx2[9] || "Open active work item")) {
        attr(button, "title", button_title_value);
      }
      if (dirty[0] & /*activeId*/
      256 && button_aria_label_value !== (button_aria_label_value = `Open active work item #${/*activeId*/
      ctx2[8]}`)) {
        attr(button, "aria-label", button_aria_label_value);
      }
    },
    d(detaching) {
      if (detaching) {
        detach(button);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_if_block_21(ctx) {
  let each_1_anchor;
  let each_value_5 = ensure_array_like(
    /*availableTypes*/
    ctx[16]
  );
  let each_blocks = [];
  for (let i = 0; i < each_value_5.length; i += 1) {
    each_blocks[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
  }
  return {
    c() {
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      each_1_anchor = empty();
    },
    m(target, anchor) {
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(target, anchor);
        }
      }
      insert(target, each_1_anchor, anchor);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*availableTypes*/
      65536) {
        each_value_5 = ensure_array_like(
          /*availableTypes*/
          ctx2[16]
        );
        let i;
        for (i = 0; i < each_value_5.length; i += 1) {
          const child_ctx = get_each_context_5(ctx2, each_value_5, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
          } else {
            each_blocks[i] = create_each_block_5(child_ctx);
            each_blocks[i].c();
            each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
          }
        }
        for (; i < each_blocks.length; i += 1) {
          each_blocks[i].d(1);
        }
        each_blocks.length = each_value_5.length;
      }
    },
    d(detaching) {
      if (detaching) {
        detach(each_1_anchor);
      }
      destroy_each(each_blocks, detaching);
    }
  };
}
function create_each_block_5(ctx) {
  let option;
  let t_value = (
    /*typeName*/
    ctx[88] + ""
  );
  let t;
  let option_value_value;
  return {
    c() {
      option = element("option");
      t = text(t_value);
      option.__value = option_value_value = /*typeName*/
      ctx[88];
      set_input_value(option, option.__value);
    },
    m(target, anchor) {
      insert(target, option, anchor);
      append(option, t);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*availableTypes*/
      65536 && t_value !== (t_value = /*typeName*/
      ctx2[88] + "")) set_data(t, t_value);
      if (dirty[0] & /*availableTypes*/
      65536 && option_value_value !== (option_value_value = /*typeName*/
      ctx2[88])) {
        option.__value = option_value_value;
        set_input_value(option, option.__value);
      }
    },
    d(detaching) {
      if (detaching) {
        detach(option);
      }
    }
  };
}
function create_else_block_6(ctx) {
  let each_1_anchor;
  let each_value_4 = ensure_array_like(
    /*columnDefs*/
    ctx[24]
  );
  let each_blocks = [];
  for (let i = 0; i < each_value_4.length; i += 1) {
    each_blocks[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
  }
  return {
    c() {
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      each_1_anchor = empty();
    },
    m(target, anchor) {
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(target, anchor);
        }
      }
      insert(target, each_1_anchor, anchor);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*columnDefs*/
      16777216) {
        each_value_4 = ensure_array_like(
          /*columnDefs*/
          ctx2[24]
        );
        let i;
        for (i = 0; i < each_value_4.length; i += 1) {
          const child_ctx = get_each_context_4(ctx2, each_value_4, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
          } else {
            each_blocks[i] = create_each_block_4(child_ctx);
            each_blocks[i].c();
            each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
          }
        }
        for (; i < each_blocks.length; i += 1) {
          each_blocks[i].d(1);
        }
        each_blocks.length = each_value_4.length;
      }
    },
    d(detaching) {
      if (detaching) {
        detach(each_1_anchor);
      }
      destroy_each(each_blocks, detaching);
    }
  };
}
function create_if_block_20(ctx) {
  let each_1_anchor;
  let each_value_3 = ensure_array_like(
    /*availableStates*/
    ctx[15]
  );
  let each_blocks = [];
  for (let i = 0; i < each_value_3.length; i += 1) {
    each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
  }
  return {
    c() {
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      each_1_anchor = empty();
    },
    m(target, anchor) {
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(target, anchor);
        }
      }
      insert(target, each_1_anchor, anchor);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*availableStates*/
      32768 | dirty[1] & /*bucketLabels*/
      8192) {
        each_value_3 = ensure_array_like(
          /*availableStates*/
          ctx2[15]
        );
        let i;
        for (i = 0; i < each_value_3.length; i += 1) {
          const child_ctx = get_each_context_3(ctx2, each_value_3, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
          } else {
            each_blocks[i] = create_each_block_3(child_ctx);
            each_blocks[i].c();
            each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
          }
        }
        for (; i < each_blocks.length; i += 1) {
          each_blocks[i].d(1);
        }
        each_blocks.length = each_value_3.length;
      }
    },
    d(detaching) {
      if (detaching) {
        detach(each_1_anchor);
      }
      destroy_each(each_blocks, detaching);
    }
  };
}
function create_each_block_4(ctx) {
  let option;
  let t_value = (
    /*c*/
    ctx[85].label + ""
  );
  let t;
  let option_value_value;
  return {
    c() {
      option = element("option");
      t = text(t_value);
      option.__value = option_value_value = /*c*/
      ctx[85].key;
      set_input_value(option, option.__value);
    },
    m(target, anchor) {
      insert(target, option, anchor);
      append(option, t);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*columnDefs*/
      16777216 && t_value !== (t_value = /*c*/
      ctx2[85].label + "")) set_data(t, t_value);
      if (dirty[0] & /*columnDefs*/
      16777216 && option_value_value !== (option_value_value = /*c*/
      ctx2[85].key)) {
        option.__value = option_value_value;
        set_input_value(option, option.__value);
      }
    },
    d(detaching) {
      if (detaching) {
        detach(option);
      }
    }
  };
}
function create_each_block_3(ctx) {
  let option;
  let t_value = (
    /*bucketLabels*/
    (ctx[44][
      /*s*/
      ctx[82]
    ] || /*s*/
    ctx[82]) + ""
  );
  let t;
  let option_value_value;
  return {
    c() {
      option = element("option");
      t = text(t_value);
      option.__value = option_value_value = /*s*/
      ctx[82];
      set_input_value(option, option.__value);
    },
    m(target, anchor) {
      insert(target, option, anchor);
      append(option, t);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*availableStates*/
      32768 && t_value !== (t_value = /*bucketLabels*/
      (ctx2[44][
        /*s*/
        ctx2[82]
      ] || /*s*/
      ctx2[82]) + "")) set_data(t, t_value);
      if (dirty[0] & /*availableStates*/
      32768 && option_value_value !== (option_value_value = /*s*/
      ctx2[82])) {
        option.__value = option_value_value;
        set_input_value(option, option.__value);
      }
    },
    d(detaching) {
      if (detaching) {
        detach(option);
      }
    }
  };
}
function create_if_block_19(ctx) {
  let div;
  let t;
  return {
    c() {
      div = element("div");
      t = text(
        /*summaryStatus*/
        ctx[19]
      );
      attr(div, "class", "summary-status-inline svelte-s1e7ae");
      attr(div, "aria-live", "polite");
    },
    m(target, anchor) {
      insert(target, div, anchor);
      append(div, t);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*summaryStatus*/
      524288) set_data(
        t,
        /*summaryStatus*/
        ctx2[19]
      );
    },
    d(detaching) {
      if (detaching) {
        detach(div);
      }
    }
  };
}
function create_if_block_13(ctx) {
  let section;
  let div1;
  let div0;
  let t0;
  let t1;
  let textarea;
  let t2;
  let div4;
  let div2;
  let button0;
  let span0;
  let t3;
  let t4;
  let t5;
  let button1;
  let span1;
  let t6;
  let t7;
  let div3;
  let t8;
  let t9;
  let mounted;
  let dispose;
  function select_block_type_2(ctx2, dirty) {
    if (
      /*summaryTargetId*/
      ctx2[22]
    ) return create_if_block_16;
    return create_else_block_5;
  }
  let current_block_type = select_block_type_2(ctx, [-1, -1, -1]);
  let if_block0 = current_block_type(ctx);
  let if_block1 = (
    /*summaryBusy*/
    ctx[21] && create_if_block_15(ctx)
  );
  let if_block2 = (
    /*summaryStatus*/
    ctx[19] && create_if_block_14(ctx)
  );
  return {
    c() {
      section = element("section");
      div1 = element("div");
      div0 = element("div");
      if_block0.c();
      t0 = space();
      if (if_block1) if_block1.c();
      t1 = space();
      textarea = element("textarea");
      t2 = space();
      div4 = element("div");
      div2 = element("div");
      button0 = element("button");
      span0 = element("span");
      t3 = space();
      t4 = text(
        /*summaryButtonLabel*/
        ctx[30]
      );
      t5 = space();
      button1 = element("button");
      span1 = element("span");
      t6 = text("\r\n              Stop & Apply");
      t7 = space();
      div3 = element("div");
      t8 = text(
        /*summaryHelperText*/
        ctx[29]
      );
      t9 = space();
      if (if_block2) if_block2.c();
      attr(div0, "class", "summary-context svelte-s1e7ae");
      attr(div1, "class", "summary-header svelte-s1e7ae");
      attr(textarea, "class", "summary-textarea svelte-s1e7ae");
      attr(textarea, "placeholder", "Draft a concise update for your work item\u2026");
      textarea.value = /*summaryDraft*/
      ctx[18];
      attr(textarea, "rows", "5");
      textarea.disabled = /*summaryAreaDisabled*/
      ctx[25];
      attr(span0, "class", "codicon codicon-rocket");
      attr(span0, "aria-hidden", "true");
      attr(button0, "class", "action-btn summary-generate svelte-s1e7ae");
      attr(
        button0,
        "title",
        /*summaryButtonLabel*/
        ctx[30]
      );
      attr(
        button0,
        "aria-label",
        /*summaryButtonLabel*/
        ctx[30]
      );
      button0.disabled = /*summaryGenerateDisabled*/
      ctx[27];
      attr(span1, "class", "codicon codicon-check");
      attr(span1, "aria-hidden", "true");
      attr(button1, "class", "action-btn summary-apply svelte-s1e7ae");
      attr(button1, "title", "Stop timer and apply time entry with this summary");
      attr(button1, "aria-label", "Stop timer and apply time entry with this summary");
      button1.disabled = /*summaryApplyDisabled*/
      ctx[26];
      attr(div2, "class", "summary-buttons svelte-s1e7ae");
      attr(div3, "class", "summary-helper svelte-s1e7ae");
      attr(div4, "class", "summary-actions svelte-s1e7ae");
      attr(section, "class", "summary-panel svelte-s1e7ae");
      attr(section, "aria-label", "Work summary composer");
    },
    m(target, anchor) {
      insert(target, section, anchor);
      append(section, div1);
      append(div1, div0);
      if_block0.m(div0, null);
      append(div1, t0);
      if (if_block1) if_block1.m(div1, null);
      append(section, t1);
      append(section, textarea);
      append(section, t2);
      append(section, div4);
      append(div4, div2);
      append(div2, button0);
      append(button0, span0);
      append(button0, t3);
      append(button0, t4);
      append(div2, t5);
      append(div2, button1);
      append(button1, span1);
      append(button1, t6);
      append(div4, t7);
      append(div4, div3);
      append(div3, t8);
      append(section, t9);
      if (if_block2) if_block2.m(section, null);
      if (!mounted) {
        dispose = [
          listen(
            textarea,
            "input",
            /*onSummaryInput*/
            ctx[38]
          ),
          listen(
            textarea,
            "blur",
            /*onSummaryBlur*/
            ctx[39]
          ),
          listen(button0, "click", prevent_default(
            /*onGenerateSummary*/
            ctx[40]
          )),
          listen(button1, "click", prevent_default(
            /*onStopAndApplySummary*/
            ctx[41]
          ))
        ];
        mounted = true;
      }
    },
    p(ctx2, dirty) {
      if (current_block_type === (current_block_type = select_block_type_2(ctx2, dirty)) && if_block0) {
        if_block0.p(ctx2, dirty);
      } else {
        if_block0.d(1);
        if_block0 = current_block_type(ctx2);
        if (if_block0) {
          if_block0.c();
          if_block0.m(div0, null);
        }
      }
      if (
        /*summaryBusy*/
        ctx2[21]
      ) {
        if (if_block1) {
        } else {
          if_block1 = create_if_block_15(ctx2);
          if_block1.c();
          if_block1.m(div1, null);
        }
      } else if (if_block1) {
        if_block1.d(1);
        if_block1 = null;
      }
      if (dirty[0] & /*summaryDraft*/
      262144) {
        textarea.value = /*summaryDraft*/
        ctx2[18];
      }
      if (dirty[0] & /*summaryAreaDisabled*/
      33554432) {
        textarea.disabled = /*summaryAreaDisabled*/
        ctx2[25];
      }
      if (dirty[0] & /*summaryButtonLabel*/
      1073741824) set_data(
        t4,
        /*summaryButtonLabel*/
        ctx2[30]
      );
      if (dirty[0] & /*summaryButtonLabel*/
      1073741824) {
        attr(
          button0,
          "title",
          /*summaryButtonLabel*/
          ctx2[30]
        );
      }
      if (dirty[0] & /*summaryButtonLabel*/
      1073741824) {
        attr(
          button0,
          "aria-label",
          /*summaryButtonLabel*/
          ctx2[30]
        );
      }
      if (dirty[0] & /*summaryGenerateDisabled*/
      134217728) {
        button0.disabled = /*summaryGenerateDisabled*/
        ctx2[27];
      }
      if (dirty[0] & /*summaryApplyDisabled*/
      67108864) {
        button1.disabled = /*summaryApplyDisabled*/
        ctx2[26];
      }
      if (dirty[0] & /*summaryHelperText*/
      536870912) set_data(
        t8,
        /*summaryHelperText*/
        ctx2[29]
      );
      if (
        /*summaryStatus*/
        ctx2[19]
      ) {
        if (if_block2) {
          if_block2.p(ctx2, dirty);
        } else {
          if_block2 = create_if_block_14(ctx2);
          if_block2.c();
          if_block2.m(section, null);
        }
      } else if (if_block2) {
        if_block2.d(1);
        if_block2 = null;
      }
    },
    d(detaching) {
      if (detaching) {
        detach(section);
      }
      if_block0.d();
      if (if_block1) if_block1.d();
      if (if_block2) if_block2.d();
      mounted = false;
      run_all(dispose);
    }
  };
}
function create_else_block_5(ctx) {
  let span;
  return {
    c() {
      span = element("span");
      span.textContent = "Start a timer or select a work item to enable summaries.";
      attr(span, "class", "muted svelte-s1e7ae");
    },
    m(target, anchor) {
      insert(target, span, anchor);
    },
    p: noop,
    d(detaching) {
      if (detaching) {
        detach(span);
      }
    }
  };
}
function create_if_block_16(ctx) {
  let span0;
  let t1;
  let span1;
  let t2;
  let t3;
  let span2;
  let t4_value = (
    /*summaryProvider*/
    ctx[20] === "openai" ? "OpenAI" : "Copilot"
  );
  let t4;
  let t5;
  let if_block_anchor;
  let if_block = (
    /*timerActive*/
    ctx[5] && create_if_block_17(ctx)
  );
  return {
    c() {
      span0 = element("span");
      span0.textContent = "Target";
      t1 = space();
      span1 = element("span");
      t2 = text(
        /*summaryTargetDisplay*/
        ctx[28]
      );
      t3 = space();
      span2 = element("span");
      t4 = text(t4_value);
      t5 = space();
      if (if_block) if_block.c();
      if_block_anchor = empty();
      attr(span0, "class", "summary-target-label svelte-s1e7ae");
      attr(span1, "class", "summary-target-value svelte-s1e7ae");
      attr(span2, "class", "summary-provider-badge svelte-s1e7ae");
    },
    m(target, anchor) {
      insert(target, span0, anchor);
      insert(target, t1, anchor);
      insert(target, span1, anchor);
      append(span1, t2);
      insert(target, t3, anchor);
      insert(target, span2, anchor);
      append(span2, t4);
      insert(target, t5, anchor);
      if (if_block) if_block.m(target, anchor);
      insert(target, if_block_anchor, anchor);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*summaryTargetDisplay*/
      268435456) set_data(
        t2,
        /*summaryTargetDisplay*/
        ctx2[28]
      );
      if (dirty[0] & /*summaryProvider*/
      1048576 && t4_value !== (t4_value = /*summaryProvider*/
      ctx2[20] === "openai" ? "OpenAI" : "Copilot")) set_data(t4, t4_value);
      if (
        /*timerActive*/
        ctx2[5]
      ) {
        if (if_block) {
          if_block.p(ctx2, dirty);
        } else {
          if_block = create_if_block_17(ctx2);
          if_block.c();
          if_block.m(if_block_anchor.parentNode, if_block_anchor);
        }
      } else if (if_block) {
        if_block.d(1);
        if_block = null;
      }
    },
    d(detaching) {
      if (detaching) {
        detach(span0);
        detach(t1);
        detach(span1);
        detach(t3);
        detach(span2);
        detach(t5);
        detach(if_block_anchor);
      }
      if (if_block) if_block.d(detaching);
    }
  };
}
function create_if_block_17(ctx) {
  let span;
  let t0_value = (
    /*timerRunning*/
    ctx[6] ? "Running" : "Paused"
  );
  let t0;
  let t1;
  let if_block = (
    /*timerElapsedLabel*/
    ctx[7] && create_if_block_18(ctx)
  );
  return {
    c() {
      span = element("span");
      t0 = text(t0_value);
      t1 = space();
      if (if_block) if_block.c();
      attr(span, "class", "summary-target-timer svelte-s1e7ae");
    },
    m(target, anchor) {
      insert(target, span, anchor);
      append(span, t0);
      append(span, t1);
      if (if_block) if_block.m(span, null);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*timerRunning*/
      64 && t0_value !== (t0_value = /*timerRunning*/
      ctx2[6] ? "Running" : "Paused")) set_data(t0, t0_value);
      if (
        /*timerElapsedLabel*/
        ctx2[7]
      ) {
        if (if_block) {
          if_block.p(ctx2, dirty);
        } else {
          if_block = create_if_block_18(ctx2);
          if_block.c();
          if_block.m(span, null);
        }
      } else if (if_block) {
        if_block.d(1);
        if_block = null;
      }
    },
    d(detaching) {
      if (detaching) {
        detach(span);
      }
      if (if_block) if_block.d();
    }
  };
}
function create_if_block_18(ctx) {
  let t0;
  let t1;
  let t2;
  return {
    c() {
      t0 = text("(");
      t1 = text(
        /*timerElapsedLabel*/
        ctx[7]
      );
      t2 = text(")");
    },
    m(target, anchor) {
      insert(target, t0, anchor);
      insert(target, t1, anchor);
      insert(target, t2, anchor);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*timerElapsedLabel*/
      128) set_data(
        t1,
        /*timerElapsedLabel*/
        ctx2[7]
      );
    },
    d(detaching) {
      if (detaching) {
        detach(t0);
        detach(t1);
        detach(t2);
      }
    }
  };
}
function create_if_block_15(ctx) {
  let span;
  return {
    c() {
      span = element("span");
      attr(span, "class", "spinner inline svelte-s1e7ae");
      attr(span, "role", "status");
      attr(span, "aria-label", "Generating summary");
    },
    m(target, anchor) {
      insert(target, span, anchor);
    },
    d(detaching) {
      if (detaching) {
        detach(span);
      }
    }
  };
}
function create_if_block_14(ctx) {
  let div;
  let t;
  return {
    c() {
      div = element("div");
      t = text(
        /*summaryStatus*/
        ctx[19]
      );
      attr(div, "class", "summary-status svelte-s1e7ae");
      attr(div, "aria-live", "polite");
    },
    m(target, anchor) {
      insert(target, div, anchor);
      append(div, t);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*summaryStatus*/
      524288) set_data(
        t,
        /*summaryStatus*/
        ctx2[19]
      );
    },
    d(detaching) {
      if (detaching) {
        detach(div);
      }
    }
  };
}
function create_if_block_12(ctx) {
  let div;
  let t;
  return {
    c() {
      div = element("div");
      t = text(
        /*errorMsg*/
        ctx[13]
      );
      attr(div, "class", "error-banner svelte-s1e7ae");
      attr(div, "role", "alert");
    },
    m(target, anchor) {
      insert(target, div, anchor);
      append(div, t);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*errorMsg*/
      8192) set_data(
        t,
        /*errorMsg*/
        ctx2[13]
      );
    },
    d(detaching) {
      if (detaching) {
        detach(div);
      }
    }
  };
}
function create_else_block_4(ctx) {
  let div;
  return {
    c() {
      div = element("div");
      div.textContent = "No work items to display.";
      attr(div, "class", "empty svelte-s1e7ae");
    },
    m(target, anchor) {
      insert(target, div, anchor);
    },
    p: noop,
    d(detaching) {
      if (detaching) {
        detach(div);
      }
    }
  };
}
function create_if_block_7(ctx) {
  let div;
  let each_value_2 = ensure_array_like(
    /*items*/
    ctx[10].slice(0, 50)
  );
  let each_blocks = [];
  for (let i = 0; i < each_value_2.length; i += 1) {
    each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
  }
  return {
    c() {
      div = element("div");
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      attr(div, "class", "items svelte-s1e7ae");
      attr(div, "aria-label", "Work items");
    },
    m(target, anchor) {
      insert(target, div, anchor);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(div, null);
        }
      }
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*timerActive, activeId, items, timerElapsedLabel*/
      1440 | dirty[1] & /*dispatch*/
      1) {
        each_value_2 = ensure_array_like(
          /*items*/
          ctx2[10].slice(0, 50)
        );
        let i;
        for (i = 0; i < each_value_2.length; i += 1) {
          const child_ctx = get_each_context_2(ctx2, each_value_2, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
          } else {
            each_blocks[i] = create_each_block_2(child_ctx);
            each_blocks[i].c();
            each_blocks[i].m(div, null);
          }
        }
        for (; i < each_blocks.length; i += 1) {
          each_blocks[i].d(1);
        }
        each_blocks.length = each_value_2.length;
      }
    },
    d(detaching) {
      if (detaching) {
        detach(div);
      }
      destroy_each(each_blocks, detaching);
    }
  };
}
function create_if_block_1(ctx) {
  let div;
  let each_value = ensure_array_like(
    /*columnDefs*/
    ctx[24]
  );
  let each_blocks = [];
  for (let i = 0; i < each_value.length; i += 1) {
    each_blocks[i] = create_each_block2(get_each_context2(ctx, each_value, i));
  }
  return {
    c() {
      div = element("div");
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      attr(div, "class", "kanban-board svelte-s1e7ae");
      attr(div, "aria-label", "Kanban board");
    },
    m(target, anchor) {
      insert(target, div, anchor);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(div, null);
        }
      }
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*columnDefs, kanbanGroups, timerActive, activeId, kanbanView, timerElapsedLabel*/
      25168288 | dirty[1] & /*handleDrop, handleDragStart, dispatch*/
      6145) {
        each_value = ensure_array_like(
          /*columnDefs*/
          ctx2[24]
        );
        let i;
        for (i = 0; i < each_value.length; i += 1) {
          const child_ctx = get_each_context2(ctx2, each_value, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
          } else {
            each_blocks[i] = create_each_block2(child_ctx);
            each_blocks[i].c();
            each_blocks[i].m(div, null);
          }
        }
        for (; i < each_blocks.length; i += 1) {
          each_blocks[i].d(1);
        }
        each_blocks.length = each_value.length;
      }
    },
    d(detaching) {
      if (detaching) {
        detach(div);
      }
      destroy_each(each_blocks, detaching);
    }
  };
}
function create_if_block(ctx) {
  let div;
  return {
    c() {
      div = element("div");
      div.innerHTML = `<span class="spinner svelte-s1e7ae" role="status" aria-label="Loading"></span> Loading work items\u2026`;
      attr(div, "class", "loading svelte-s1e7ae");
    },
    m(target, anchor) {
      insert(target, div, anchor);
    },
    p: noop,
    d(detaching) {
      if (detaching) {
        detach(div);
      }
    }
  };
}
function create_if_block_11(ctx) {
  let span1;
  let span0;
  let t0;
  let t1;
  return {
    c() {
      span1 = element("span");
      span0 = element("span");
      t0 = space();
      t1 = text(
        /*timerElapsedLabel*/
        ctx[7]
      );
      attr(span0, "class", "codicon codicon-clock");
      attr(span0, "aria-hidden", "true");
      attr(span1, "class", "timer-indicator svelte-s1e7ae");
    },
    m(target, anchor) {
      insert(target, span1, anchor);
      append(span1, span0);
      append(span1, t0);
      append(span1, t1);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*timerElapsedLabel*/
      128) set_data(
        t1,
        /*timerElapsedLabel*/
        ctx2[7]
      );
    },
    d(detaching) {
      if (detaching) {
        detach(span1);
      }
    }
  };
}
function create_if_block_10(ctx) {
  let div;
  let t_value = extractDescription(
    /*it*/
    ctx[77]
  ) + "";
  let t;
  let div_title_value;
  return {
    c() {
      div = element("div");
      t = text(t_value);
      attr(div, "class", "work-item-desc svelte-s1e7ae");
      attr(div, "title", div_title_value = extractDescription(
        /*it*/
        ctx[77]
      ));
    },
    m(target, anchor) {
      insert(target, div, anchor);
      append(div, t);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*items*/
      1024 && t_value !== (t_value = extractDescription(
        /*it*/
        ctx2[77]
      ) + "")) set_data(t, t_value);
      if (dirty[0] & /*items*/
      1024 && div_title_value !== (div_title_value = extractDescription(
        /*it*/
        ctx2[77]
      ))) {
        attr(div, "title", div_title_value);
      }
    },
    d(detaching) {
      if (detaching) {
        detach(div);
      }
    }
  };
}
function create_else_block_3(ctx) {
  let span;
  let t;
  return {
    c() {
      span = element("span");
      t = text(" Unassigned");
      attr(span, "class", "codicon codicon-account");
      attr(span, "aria-hidden", "true");
    },
    m(target, anchor) {
      insert(target, span, anchor);
      insert(target, t, anchor);
    },
    p: noop,
    d(detaching) {
      if (detaching) {
        detach(span);
        detach(t);
      }
    }
  };
}
function create_if_block_9(ctx) {
  let span;
  let t0;
  let t1_value = (
    /*it*/
    (ctx[77].fields["System.AssignedTo"].displayName || /*it*/
    ctx[77].fields["System.AssignedTo"]) + ""
  );
  let t1;
  return {
    c() {
      span = element("span");
      t0 = space();
      t1 = text(t1_value);
      attr(span, "class", "codicon codicon-account");
      attr(span, "aria-hidden", "true");
    },
    m(target, anchor) {
      insert(target, span, anchor);
      insert(target, t0, anchor);
      insert(target, t1, anchor);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*items*/
      1024 && t1_value !== (t1_value = /*it*/
      (ctx2[77].fields["System.AssignedTo"].displayName || /*it*/
      ctx2[77].fields["System.AssignedTo"]) + "")) set_data(t1, t1_value);
    },
    d(detaching) {
      if (detaching) {
        detach(span);
        detach(t0);
        detach(t1);
      }
    }
  };
}
function create_else_block_2(ctx) {
  let button;
  let span;
  let t;
  let button_aria_label_value;
  let mounted;
  let dispose;
  function click_handler_7() {
    return (
      /*click_handler_7*/
      ctx[60](
        /*it*/
        ctx[77]
      )
    );
  }
  return {
    c() {
      button = element("button");
      span = element("span");
      t = text(" Start");
      attr(span, "class", "codicon codicon-play");
      attr(span, "aria-hidden", "true");
      attr(button, "class", "action-btn start svelte-s1e7ae");
      attr(button, "title", "Start timer");
      attr(button, "aria-label", button_aria_label_value = `Start timer for #${/*it*/
      ctx[77].id}`);
      button.disabled = /*timerActive*/
      ctx[5];
    },
    m(target, anchor) {
      insert(target, button, anchor);
      append(button, span);
      append(button, t);
      if (!mounted) {
        dispose = listen(button, "click", stop_propagation(click_handler_7));
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      ctx = new_ctx;
      if (dirty[0] & /*items*/
      1024 && button_aria_label_value !== (button_aria_label_value = `Start timer for #${/*it*/
      ctx[77].id}`)) {
        attr(button, "aria-label", button_aria_label_value);
      }
      if (dirty[0] & /*timerActive*/
      32) {
        button.disabled = /*timerActive*/
        ctx[5];
      }
    },
    d(detaching) {
      if (detaching) {
        detach(button);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_if_block_8(ctx) {
  let button;
  let span;
  let t;
  let button_aria_label_value;
  let mounted;
  let dispose;
  return {
    c() {
      button = element("button");
      span = element("span");
      t = text(" Stop");
      attr(span, "class", "codicon codicon-debug-stop");
      attr(span, "aria-hidden", "true");
      attr(button, "class", "action-btn stop svelte-s1e7ae");
      attr(button, "title", "Stop timer");
      attr(button, "aria-label", button_aria_label_value = `Stop timer for #${/*it*/
      ctx[77].id}`);
    },
    m(target, anchor) {
      insert(target, button, anchor);
      append(button, span);
      append(button, t);
      if (!mounted) {
        dispose = listen(button, "click", stop_propagation(
          /*click_handler_6*/
          ctx[59]
        ));
        mounted = true;
      }
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*items*/
      1024 && button_aria_label_value !== (button_aria_label_value = `Stop timer for #${/*it*/
      ctx2[77].id}`)) {
        attr(button, "aria-label", button_aria_label_value);
      }
    },
    d(detaching) {
      if (detaching) {
        detach(button);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_each_block_2(ctx) {
  let div5;
  let div0;
  let span0;
  let t0_value = getWorkItemTypeIcon(
    /*it*/
    ctx[77].fields?.["System.WorkItemType"]
  ) + "";
  let t0;
  let t1;
  let span1;
  let t2;
  let t3_value = (
    /*it*/
    ctx[77].id + ""
  );
  let t3;
  let t4;
  let show_if_2 = (
    /*timerActive*/
    ctx[5] && /*activeId*/
    ctx[8] === Number(
      /*it*/
      ctx[77].id
    )
  );
  let t5;
  let span2;
  let t6_value = (
    /*it*/
    (ctx[77].fields?.["Microsoft.VSTS.Common.Priority"] || "3") + ""
  );
  let t6;
  let span2_class_value;
  let t7;
  let div3;
  let div1;
  let t8_value = (
    /*it*/
    (ctx[77].fields?.["System.Title"] || `Work Item #${/*it*/
    ctx[77].id}`) + ""
  );
  let t8;
  let t9;
  let show_if_1 = extractDescription(
    /*it*/
    ctx[77]
  );
  let t10;
  let div2;
  let span3;
  let t11_value = (
    /*it*/
    (ctx[77].fields?.["System.WorkItemType"] || "Task") + ""
  );
  let t11;
  let t12;
  let span4;
  let t13_value = (
    /*it*/
    (ctx[77].fields?.["System.State"] || "New") + ""
  );
  let t13;
  let span4_class_value;
  let t14;
  let span5;
  let t15;
  let div4;
  let show_if;
  let t16;
  let button0;
  let span6;
  let t17;
  let button0_aria_label_value;
  let t18;
  let button1;
  let span7;
  let t19;
  let button1_aria_label_value;
  let t20;
  let button2;
  let span8;
  let t21;
  let button2_aria_label_value;
  let t22;
  let div5_class_value;
  let div5_aria_label_value;
  let mounted;
  let dispose;
  let if_block0 = show_if_2 && create_if_block_11(ctx);
  let if_block1 = show_if_1 && create_if_block_10(ctx);
  function select_block_type_6(ctx2, dirty) {
    if (
      /*it*/
      ctx2[77].fields?.["System.AssignedTo"]
    ) return create_if_block_9;
    return create_else_block_3;
  }
  let current_block_type = select_block_type_6(ctx, [-1, -1, -1]);
  let if_block2 = current_block_type(ctx);
  function select_block_type_7(ctx2, dirty) {
    if (dirty[0] & /*timerActive, activeId, items*/
    1312) show_if = null;
    if (show_if == null) show_if = !!/*timerActive*/
    (ctx2[5] && /*activeId*/
    ctx2[8] === Number(
      /*it*/
      ctx2[77].id
    ));
    if (show_if) return create_if_block_8;
    return create_else_block_2;
  }
  let current_block_type_1 = select_block_type_7(ctx, [-1, -1, -1]);
  let if_block3 = current_block_type_1(ctx);
  function click_handler_8() {
    return (
      /*click_handler_8*/
      ctx[61](
        /*it*/
        ctx[77]
      )
    );
  }
  function click_handler_9() {
    return (
      /*click_handler_9*/
      ctx[62](
        /*it*/
        ctx[77]
      )
    );
  }
  function click_handler_10() {
    return (
      /*click_handler_10*/
      ctx[63](
        /*it*/
        ctx[77]
      )
    );
  }
  function keydown_handler_1(...args) {
    return (
      /*keydown_handler_1*/
      ctx[64](
        /*it*/
        ctx[77],
        ...args
      )
    );
  }
  function click_handler_11() {
    return (
      /*click_handler_11*/
      ctx[65](
        /*it*/
        ctx[77]
      )
    );
  }
  return {
    c() {
      div5 = element("div");
      div0 = element("div");
      span0 = element("span");
      t0 = text(t0_value);
      t1 = space();
      span1 = element("span");
      t2 = text("#");
      t3 = text(t3_value);
      t4 = space();
      if (if_block0) if_block0.c();
      t5 = space();
      span2 = element("span");
      t6 = text(t6_value);
      t7 = space();
      div3 = element("div");
      div1 = element("div");
      t8 = text(t8_value);
      t9 = space();
      if (if_block1) if_block1.c();
      t10 = space();
      div2 = element("div");
      span3 = element("span");
      t11 = text(t11_value);
      t12 = space();
      span4 = element("span");
      t13 = text(t13_value);
      t14 = space();
      span5 = element("span");
      if_block2.c();
      t15 = space();
      div4 = element("div");
      if_block3.c();
      t16 = space();
      button0 = element("button");
      span6 = element("span");
      t17 = text(" View");
      t18 = space();
      button1 = element("button");
      span7 = element("span");
      t19 = text(" Edit");
      t20 = space();
      button2 = element("button");
      span8 = element("span");
      t21 = text(" Comment");
      t22 = space();
      attr(span0, "class", "work-item-type-icon svelte-s1e7ae");
      attr(span1, "class", "work-item-id svelte-s1e7ae");
      attr(span2, "class", span2_class_value = "work-item-priority " + getPriorityClass(
        /*it*/
        ctx[77].fields?.["Microsoft.VSTS.Common.Priority"]
      ) + " svelte-s1e7ae");
      attr(div0, "class", "work-item-header svelte-s1e7ae");
      attr(div1, "class", "work-item-title svelte-s1e7ae");
      attr(span3, "class", "work-item-type svelte-s1e7ae");
      attr(span4, "class", span4_class_value = "work-item-state state-" + normalizeState(
        /*it*/
        ctx[77].fields?.["System.State"]
      ) + " svelte-s1e7ae");
      attr(span5, "class", "work-item-assignee");
      attr(div2, "class", "work-item-meta svelte-s1e7ae");
      attr(div3, "class", "work-item-content svelte-s1e7ae");
      attr(span6, "class", "codicon codicon-eye");
      attr(span6, "aria-hidden", "true");
      attr(button0, "class", "action-btn view svelte-s1e7ae");
      attr(button0, "title", "View in browser");
      attr(button0, "aria-label", button0_aria_label_value = `View work item #${/*it*/
      ctx[77].id}`);
      attr(span7, "class", "codicon codicon-edit");
      attr(span7, "aria-hidden", "true");
      attr(button1, "class", "action-btn edit svelte-s1e7ae");
      attr(button1, "title", "Edit work item");
      attr(button1, "aria-label", button1_aria_label_value = `Edit work item #${/*it*/
      ctx[77].id}`);
      attr(span8, "class", "codicon codicon-comment");
      attr(span8, "aria-hidden", "true");
      attr(button2, "class", "action-btn comment svelte-s1e7ae");
      attr(button2, "title", "Add comment");
      attr(button2, "aria-label", button2_aria_label_value = `Add comment to #${/*it*/
      ctx[77].id}`);
      attr(div4, "class", "work-item-actions svelte-s1e7ae");
      attr(div5, "class", div5_class_value = "work-item-card " + /*timerActive*/
      (ctx[5] && /*activeId*/
      ctx[8] === Number(
        /*it*/
        ctx[77].id
      ) ? "has-active-timer" : "") + " svelte-s1e7ae");
      attr(div5, "tabindex", "0");
      attr(div5, "role", "button");
      attr(div5, "aria-label", div5_aria_label_value = `Work item #${/*it*/
      ctx[77].id}: ${/*it*/
      ctx[77].fields?.["System.Title"]} - press Enter to open`);
    },
    m(target, anchor) {
      insert(target, div5, anchor);
      append(div5, div0);
      append(div0, span0);
      append(span0, t0);
      append(div0, t1);
      append(div0, span1);
      append(span1, t2);
      append(span1, t3);
      append(div0, t4);
      if (if_block0) if_block0.m(div0, null);
      append(div0, t5);
      append(div0, span2);
      append(span2, t6);
      append(div5, t7);
      append(div5, div3);
      append(div3, div1);
      append(div1, t8);
      append(div3, t9);
      if (if_block1) if_block1.m(div3, null);
      append(div3, t10);
      append(div3, div2);
      append(div2, span3);
      append(span3, t11);
      append(div2, t12);
      append(div2, span4);
      append(span4, t13);
      append(div2, t14);
      append(div2, span5);
      if_block2.m(span5, null);
      append(div5, t15);
      append(div5, div4);
      if_block3.m(div4, null);
      append(div4, t16);
      append(div4, button0);
      append(button0, span6);
      append(button0, t17);
      append(div4, t18);
      append(div4, button1);
      append(button1, span7);
      append(button1, t19);
      append(div4, t20);
      append(div4, button2);
      append(button2, span8);
      append(button2, t21);
      append(div5, t22);
      if (!mounted) {
        dispose = [
          listen(button0, "click", stop_propagation(click_handler_8)),
          listen(button1, "click", stop_propagation(click_handler_9)),
          listen(button2, "click", stop_propagation(click_handler_10)),
          listen(div5, "keydown", keydown_handler_1),
          listen(div5, "click", click_handler_11)
        ];
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      ctx = new_ctx;
      if (dirty[0] & /*items*/
      1024 && t0_value !== (t0_value = getWorkItemTypeIcon(
        /*it*/
        ctx[77].fields?.["System.WorkItemType"]
      ) + "")) set_data(t0, t0_value);
      if (dirty[0] & /*items*/
      1024 && t3_value !== (t3_value = /*it*/
      ctx[77].id + "")) set_data(t3, t3_value);
      if (dirty[0] & /*timerActive, activeId, items*/
      1312) show_if_2 = /*timerActive*/
      ctx[5] && /*activeId*/
      ctx[8] === Number(
        /*it*/
        ctx[77].id
      );
      if (show_if_2) {
        if (if_block0) {
          if_block0.p(ctx, dirty);
        } else {
          if_block0 = create_if_block_11(ctx);
          if_block0.c();
          if_block0.m(div0, t5);
        }
      } else if (if_block0) {
        if_block0.d(1);
        if_block0 = null;
      }
      if (dirty[0] & /*items*/
      1024 && t6_value !== (t6_value = /*it*/
      (ctx[77].fields?.["Microsoft.VSTS.Common.Priority"] || "3") + "")) set_data(t6, t6_value);
      if (dirty[0] & /*items*/
      1024 && span2_class_value !== (span2_class_value = "work-item-priority " + getPriorityClass(
        /*it*/
        ctx[77].fields?.["Microsoft.VSTS.Common.Priority"]
      ) + " svelte-s1e7ae")) {
        attr(span2, "class", span2_class_value);
      }
      if (dirty[0] & /*items*/
      1024 && t8_value !== (t8_value = /*it*/
      (ctx[77].fields?.["System.Title"] || `Work Item #${/*it*/
      ctx[77].id}`) + "")) set_data(t8, t8_value);
      if (dirty[0] & /*items*/
      1024) show_if_1 = extractDescription(
        /*it*/
        ctx[77]
      );
      if (show_if_1) {
        if (if_block1) {
          if_block1.p(ctx, dirty);
        } else {
          if_block1 = create_if_block_10(ctx);
          if_block1.c();
          if_block1.m(div3, t10);
        }
      } else if (if_block1) {
        if_block1.d(1);
        if_block1 = null;
      }
      if (dirty[0] & /*items*/
      1024 && t11_value !== (t11_value = /*it*/
      (ctx[77].fields?.["System.WorkItemType"] || "Task") + "")) set_data(t11, t11_value);
      if (dirty[0] & /*items*/
      1024 && t13_value !== (t13_value = /*it*/
      (ctx[77].fields?.["System.State"] || "New") + "")) set_data(t13, t13_value);
      if (dirty[0] & /*items*/
      1024 && span4_class_value !== (span4_class_value = "work-item-state state-" + normalizeState(
        /*it*/
        ctx[77].fields?.["System.State"]
      ) + " svelte-s1e7ae")) {
        attr(span4, "class", span4_class_value);
      }
      if (current_block_type === (current_block_type = select_block_type_6(ctx, dirty)) && if_block2) {
        if_block2.p(ctx, dirty);
      } else {
        if_block2.d(1);
        if_block2 = current_block_type(ctx);
        if (if_block2) {
          if_block2.c();
          if_block2.m(span5, null);
        }
      }
      if (current_block_type_1 === (current_block_type_1 = select_block_type_7(ctx, dirty)) && if_block3) {
        if_block3.p(ctx, dirty);
      } else {
        if_block3.d(1);
        if_block3 = current_block_type_1(ctx);
        if (if_block3) {
          if_block3.c();
          if_block3.m(div4, t16);
        }
      }
      if (dirty[0] & /*items*/
      1024 && button0_aria_label_value !== (button0_aria_label_value = `View work item #${/*it*/
      ctx[77].id}`)) {
        attr(button0, "aria-label", button0_aria_label_value);
      }
      if (dirty[0] & /*items*/
      1024 && button1_aria_label_value !== (button1_aria_label_value = `Edit work item #${/*it*/
      ctx[77].id}`)) {
        attr(button1, "aria-label", button1_aria_label_value);
      }
      if (dirty[0] & /*items*/
      1024 && button2_aria_label_value !== (button2_aria_label_value = `Add comment to #${/*it*/
      ctx[77].id}`)) {
        attr(button2, "aria-label", button2_aria_label_value);
      }
      if (dirty[0] & /*timerActive, activeId, items*/
      1312 && div5_class_value !== (div5_class_value = "work-item-card " + /*timerActive*/
      (ctx[5] && /*activeId*/
      ctx[8] === Number(
        /*it*/
        ctx[77].id
      ) ? "has-active-timer" : "") + " svelte-s1e7ae")) {
        attr(div5, "class", div5_class_value);
      }
      if (dirty[0] & /*items*/
      1024 && div5_aria_label_value !== (div5_aria_label_value = `Work item #${/*it*/
      ctx[77].id}: ${/*it*/
      ctx[77].fields?.["System.Title"]} - press Enter to open`)) {
        attr(div5, "aria-label", div5_aria_label_value);
      }
    },
    d(detaching) {
      if (detaching) {
        detach(div5);
      }
      if (if_block0) if_block0.d();
      if (if_block1) if_block1.d();
      if_block2.d();
      if_block3.d();
      mounted = false;
      run_all(dispose);
    }
  };
}
function create_else_block_1(ctx) {
  let div;
  return {
    c() {
      div = element("div");
      div.textContent = "No items";
      attr(div, "class", "empty svelte-s1e7ae");
    },
    m(target, anchor) {
      insert(target, div, anchor);
    },
    p: noop,
    d(detaching) {
      if (detaching) {
        detach(div);
      }
    }
  };
}
function create_if_block_2(ctx) {
  let each_1_anchor;
  let each_value_1 = ensure_array_like(
    /*kanbanGroups*/
    ctx[23][
      /*col*/
      ctx[74].key
    ]
  );
  let each_blocks = [];
  for (let i = 0; i < each_value_1.length; i += 1) {
    each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
  }
  return {
    c() {
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      each_1_anchor = empty();
    },
    m(target, anchor) {
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(target, anchor);
        }
      }
      insert(target, each_1_anchor, anchor);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*kanbanGroups, columnDefs, timerActive, activeId, kanbanView, timerElapsedLabel*/
      25168288 | dirty[1] & /*handleDragStart, dispatch*/
      2049) {
        each_value_1 = ensure_array_like(
          /*kanbanGroups*/
          ctx2[23][
            /*col*/
            ctx2[74].key
          ]
        );
        let i;
        for (i = 0; i < each_value_1.length; i += 1) {
          const child_ctx = get_each_context_1(ctx2, each_value_1, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
          } else {
            each_blocks[i] = create_each_block_1(child_ctx);
            each_blocks[i].c();
            each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
          }
        }
        for (; i < each_blocks.length; i += 1) {
          each_blocks[i].d(1);
        }
        each_blocks.length = each_value_1.length;
      }
    },
    d(detaching) {
      if (detaching) {
        detach(each_1_anchor);
      }
      destroy_each(each_blocks, detaching);
    }
  };
}
function create_if_block_6(ctx) {
  let span1;
  let span0;
  let t0;
  let t1;
  return {
    c() {
      span1 = element("span");
      span0 = element("span");
      t0 = space();
      t1 = text(
        /*timerElapsedLabel*/
        ctx[7]
      );
      attr(span0, "class", "codicon codicon-clock");
      attr(span0, "aria-hidden", "true");
      attr(span1, "class", "timer-indicator svelte-s1e7ae");
    },
    m(target, anchor) {
      insert(target, span1, anchor);
      append(span1, span0);
      append(span1, t0);
      append(span1, t1);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*timerElapsedLabel*/
      128) set_data(
        t1,
        /*timerElapsedLabel*/
        ctx2[7]
      );
    },
    d(detaching) {
      if (detaching) {
        detach(span1);
      }
    }
  };
}
function create_if_block_5(ctx) {
  let div;
  let t_value = extractDescription(
    /*it*/
    ctx[77]
  ) + "";
  let t;
  let div_title_value;
  return {
    c() {
      div = element("div");
      t = text(t_value);
      attr(div, "class", "work-item-desc svelte-s1e7ae");
      attr(div, "title", div_title_value = extractDescription(
        /*it*/
        ctx[77]
      ));
    },
    m(target, anchor) {
      insert(target, div, anchor);
      append(div, t);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*kanbanGroups, columnDefs*/
      25165824 && t_value !== (t_value = extractDescription(
        /*it*/
        ctx2[77]
      ) + "")) set_data(t, t_value);
      if (dirty[0] & /*kanbanGroups, columnDefs*/
      25165824 && div_title_value !== (div_title_value = extractDescription(
        /*it*/
        ctx2[77]
      ))) {
        attr(div, "title", div_title_value);
      }
    },
    d(detaching) {
      if (detaching) {
        detach(div);
      }
    }
  };
}
function create_if_block_4(ctx) {
  let span1;
  let span0;
  let t0;
  let t1_value = (
    /*it*/
    (ctx[77].fields["System.AssignedTo"].displayName || /*it*/
    ctx[77].fields["System.AssignedTo"]) + ""
  );
  let t1;
  return {
    c() {
      span1 = element("span");
      span0 = element("span");
      t0 = space();
      t1 = text(t1_value);
      attr(span0, "class", "codicon codicon-account");
      attr(span0, "aria-hidden", "true");
      attr(span1, "class", "work-item-assignee");
    },
    m(target, anchor) {
      insert(target, span1, anchor);
      append(span1, span0);
      append(span1, t0);
      append(span1, t1);
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*kanbanGroups, columnDefs*/
      25165824 && t1_value !== (t1_value = /*it*/
      (ctx2[77].fields["System.AssignedTo"].displayName || /*it*/
      ctx2[77].fields["System.AssignedTo"]) + "")) set_data(t1, t1_value);
    },
    d(detaching) {
      if (detaching) {
        detach(span1);
      }
    }
  };
}
function create_else_block(ctx) {
  let button;
  let span;
  let button_aria_label_value;
  let mounted;
  let dispose;
  function click_handler_1() {
    return (
      /*click_handler_1*/
      ctx[51](
        /*it*/
        ctx[77]
      )
    );
  }
  return {
    c() {
      button = element("button");
      span = element("span");
      attr(span, "class", "codicon codicon-play");
      attr(span, "aria-hidden", "true");
      attr(button, "class", "action-btn start compact svelte-s1e7ae");
      attr(button, "title", "Start timer");
      attr(button, "aria-label", button_aria_label_value = `Start timer for #${/*it*/
      ctx[77].id}`);
      button.disabled = /*timerActive*/
      ctx[5];
    },
    m(target, anchor) {
      insert(target, button, anchor);
      append(button, span);
      if (!mounted) {
        dispose = listen(button, "click", stop_propagation(click_handler_1));
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      ctx = new_ctx;
      if (dirty[0] & /*kanbanGroups, columnDefs*/
      25165824 && button_aria_label_value !== (button_aria_label_value = `Start timer for #${/*it*/
      ctx[77].id}`)) {
        attr(button, "aria-label", button_aria_label_value);
      }
      if (dirty[0] & /*timerActive*/
      32) {
        button.disabled = /*timerActive*/
        ctx[5];
      }
    },
    d(detaching) {
      if (detaching) {
        detach(button);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_if_block_3(ctx) {
  let button;
  let span;
  let button_aria_label_value;
  let mounted;
  let dispose;
  return {
    c() {
      button = element("button");
      span = element("span");
      attr(span, "class", "codicon codicon-debug-stop");
      attr(span, "aria-hidden", "true");
      attr(button, "class", "action-btn stop compact svelte-s1e7ae");
      attr(button, "title", "Stop timer");
      attr(button, "aria-label", button_aria_label_value = `Stop timer for #${/*it*/
      ctx[77].id}`);
    },
    m(target, anchor) {
      insert(target, button, anchor);
      append(button, span);
      if (!mounted) {
        dispose = listen(button, "click", stop_propagation(
          /*click_handler*/
          ctx[50]
        ));
        mounted = true;
      }
    },
    p(ctx2, dirty) {
      if (dirty[0] & /*kanbanGroups, columnDefs*/
      25165824 && button_aria_label_value !== (button_aria_label_value = `Stop timer for #${/*it*/
      ctx2[77].id}`)) {
        attr(button, "aria-label", button_aria_label_value);
      }
    },
    d(detaching) {
      if (detaching) {
        detach(button);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_each_block_1(ctx) {
  let div5;
  let div0;
  let span0;
  let t0_value = getWorkItemTypeIcon(
    /*it*/
    ctx[77].fields?.["System.WorkItemType"]
  ) + "";
  let t0;
  let t1;
  let span1;
  let t2;
  let t3_value = (
    /*it*/
    ctx[77].id + ""
  );
  let t3;
  let t4;
  let show_if_2 = (
    /*timerActive*/
    ctx[5] && /*activeId*/
    ctx[8] === Number(
      /*it*/
      ctx[77].id
    )
  );
  let t5;
  let span2;
  let t6_value = (
    /*it*/
    (ctx[77].fields?.["Microsoft.VSTS.Common.Priority"] || "3") + ""
  );
  let t6;
  let span2_class_value;
  let t7;
  let div3;
  let div1;
  let t8_value = (
    /*it*/
    (ctx[77].fields?.["System.Title"] || `Work Item #${/*it*/
    ctx[77].id}`) + ""
  );
  let t8;
  let t9;
  let show_if_1 = extractDescription(
    /*it*/
    ctx[77]
  );
  let t10;
  let div2;
  let span3;
  let t11_value = (
    /*it*/
    (ctx[77].fields?.["System.WorkItemType"] || "Task") + ""
  );
  let t11;
  let t12;
  let t13;
  let div4;
  let show_if;
  let t14;
  let button0;
  let span4;
  let button0_aria_label_value;
  let t15;
  let button1;
  let span5;
  let button1_aria_label_value;
  let t16;
  let button2;
  let span6;
  let button2_aria_label_value;
  let t17;
  let div5_class_value;
  let div5_aria_label_value;
  let mounted;
  let dispose;
  let if_block0 = show_if_2 && create_if_block_6(ctx);
  let if_block1 = show_if_1 && create_if_block_5(ctx);
  let if_block2 = (
    /*it*/
    ctx[77].fields?.["System.AssignedTo"] && create_if_block_4(ctx)
  );
  function select_block_type_5(ctx2, dirty) {
    if (dirty[0] & /*timerActive, activeId, kanbanGroups, columnDefs*/
    25166112) show_if = null;
    if (show_if == null) show_if = !!/*timerActive*/
    (ctx2[5] && /*activeId*/
    ctx2[8] === Number(
      /*it*/
      ctx2[77].id
    ));
    if (show_if) return create_if_block_3;
    return create_else_block;
  }
  let current_block_type = select_block_type_5(ctx, [-1, -1, -1]);
  let if_block3 = current_block_type(ctx);
  function click_handler_2() {
    return (
      /*click_handler_2*/
      ctx[52](
        /*it*/
        ctx[77]
      )
    );
  }
  function click_handler_3() {
    return (
      /*click_handler_3*/
      ctx[53](
        /*it*/
        ctx[77]
      )
    );
  }
  function click_handler_4() {
    return (
      /*click_handler_4*/
      ctx[54](
        /*it*/
        ctx[77]
      )
    );
  }
  function dragstart_handler(...args) {
    return (
      /*dragstart_handler*/
      ctx[55](
        /*it*/
        ctx[77],
        ...args
      )
    );
  }
  function keydown_handler(...args) {
    return (
      /*keydown_handler*/
      ctx[56](
        /*it*/
        ctx[77],
        ...args
      )
    );
  }
  function click_handler_5() {
    return (
      /*click_handler_5*/
      ctx[57](
        /*it*/
        ctx[77]
      )
    );
  }
  return {
    c() {
      div5 = element("div");
      div0 = element("div");
      span0 = element("span");
      t0 = text(t0_value);
      t1 = space();
      span1 = element("span");
      t2 = text("#");
      t3 = text(t3_value);
      t4 = space();
      if (if_block0) if_block0.c();
      t5 = space();
      span2 = element("span");
      t6 = text(t6_value);
      t7 = space();
      div3 = element("div");
      div1 = element("div");
      t8 = text(t8_value);
      t9 = space();
      if (if_block1) if_block1.c();
      t10 = space();
      div2 = element("div");
      span3 = element("span");
      t11 = text(t11_value);
      t12 = space();
      if (if_block2) if_block2.c();
      t13 = space();
      div4 = element("div");
      if_block3.c();
      t14 = space();
      button0 = element("button");
      span4 = element("span");
      t15 = space();
      button1 = element("button");
      span5 = element("span");
      t16 = space();
      button2 = element("button");
      span6 = element("span");
      t17 = space();
      attr(span0, "class", "work-item-type-icon svelte-s1e7ae");
      attr(span1, "class", "work-item-id svelte-s1e7ae");
      attr(span2, "class", span2_class_value = "work-item-priority " + getPriorityClass(
        /*it*/
        ctx[77].fields?.["Microsoft.VSTS.Common.Priority"]
      ) + " svelte-s1e7ae");
      attr(div0, "class", "work-item-header svelte-s1e7ae");
      attr(div1, "class", "work-item-title svelte-s1e7ae");
      attr(span3, "class", "work-item-type svelte-s1e7ae");
      attr(div2, "class", "work-item-meta svelte-s1e7ae");
      attr(div3, "class", "work-item-content svelte-s1e7ae");
      attr(span4, "class", "codicon codicon-eye");
      attr(span4, "aria-hidden", "true");
      attr(button0, "class", "action-btn view compact svelte-s1e7ae");
      attr(button0, "title", "View");
      attr(button0, "aria-label", button0_aria_label_value = `View work item #${/*it*/
      ctx[77].id}`);
      attr(span5, "class", "codicon codicon-edit");
      attr(span5, "aria-hidden", "true");
      attr(button1, "class", "action-btn edit compact svelte-s1e7ae");
      attr(button1, "title", "Edit");
      attr(button1, "aria-label", button1_aria_label_value = `Edit work item #${/*it*/
      ctx[77].id}`);
      attr(span6, "class", "codicon codicon-comment");
      attr(span6, "aria-hidden", "true");
      attr(button2, "class", "action-btn comment compact svelte-s1e7ae");
      attr(button2, "title", "Comment");
      attr(button2, "aria-label", button2_aria_label_value = `Add comment to #${/*it*/
      ctx[77].id}`);
      attr(div4, "class", "work-item-actions svelte-s1e7ae");
      attr(div5, "class", div5_class_value = "work-item-card kanban-card state-" + normalizeState(
        /*it*/
        ctx[77].fields?.["System.State"]
      ) + " " + /*timerActive*/
      (ctx[5] && /*activeId*/
      ctx[8] === Number(
        /*it*/
        ctx[77].id
      ) ? "has-active-timer" : "") + " svelte-s1e7ae");
      attr(div5, "tabindex", "0");
      attr(div5, "draggable", "true");
      attr(div5, "role", "button");
      attr(div5, "aria-label", div5_aria_label_value = `Work item #${/*it*/
      ctx[77].id}: ${/*it*/
      ctx[77].fields?.["System.Title"]} - press Enter to open; Ctrl+Arrow to move`);
    },
    m(target, anchor) {
      insert(target, div5, anchor);
      append(div5, div0);
      append(div0, span0);
      append(span0, t0);
      append(div0, t1);
      append(div0, span1);
      append(span1, t2);
      append(span1, t3);
      append(div0, t4);
      if (if_block0) if_block0.m(div0, null);
      append(div0, t5);
      append(div0, span2);
      append(span2, t6);
      append(div5, t7);
      append(div5, div3);
      append(div3, div1);
      append(div1, t8);
      append(div3, t9);
      if (if_block1) if_block1.m(div3, null);
      append(div3, t10);
      append(div3, div2);
      append(div2, span3);
      append(span3, t11);
      append(div2, t12);
      if (if_block2) if_block2.m(div2, null);
      append(div5, t13);
      append(div5, div4);
      if_block3.m(div4, null);
      append(div4, t14);
      append(div4, button0);
      append(button0, span4);
      append(div4, t15);
      append(div4, button1);
      append(button1, span5);
      append(div4, t16);
      append(div4, button2);
      append(button2, span6);
      append(div5, t17);
      if (!mounted) {
        dispose = [
          listen(button0, "click", stop_propagation(click_handler_2)),
          listen(button1, "click", stop_propagation(click_handler_3)),
          listen(button2, "click", stop_propagation(click_handler_4)),
          listen(div5, "dragstart", dragstart_handler),
          listen(div5, "keydown", keydown_handler),
          listen(div5, "click", click_handler_5)
        ];
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      ctx = new_ctx;
      if (dirty[0] & /*kanbanGroups, columnDefs*/
      25165824 && t0_value !== (t0_value = getWorkItemTypeIcon(
        /*it*/
        ctx[77].fields?.["System.WorkItemType"]
      ) + "")) set_data(t0, t0_value);
      if (dirty[0] & /*kanbanGroups, columnDefs*/
      25165824 && t3_value !== (t3_value = /*it*/
      ctx[77].id + "")) set_data(t3, t3_value);
      if (dirty[0] & /*timerActive, activeId, kanbanGroups, columnDefs*/
      25166112) show_if_2 = /*timerActive*/
      ctx[5] && /*activeId*/
      ctx[8] === Number(
        /*it*/
        ctx[77].id
      );
      if (show_if_2) {
        if (if_block0) {
          if_block0.p(ctx, dirty);
        } else {
          if_block0 = create_if_block_6(ctx);
          if_block0.c();
          if_block0.m(div0, t5);
        }
      } else if (if_block0) {
        if_block0.d(1);
        if_block0 = null;
      }
      if (dirty[0] & /*kanbanGroups, columnDefs*/
      25165824 && t6_value !== (t6_value = /*it*/
      (ctx[77].fields?.["Microsoft.VSTS.Common.Priority"] || "3") + "")) set_data(t6, t6_value);
      if (dirty[0] & /*kanbanGroups, columnDefs*/
      25165824 && span2_class_value !== (span2_class_value = "work-item-priority " + getPriorityClass(
        /*it*/
        ctx[77].fields?.["Microsoft.VSTS.Common.Priority"]
      ) + " svelte-s1e7ae")) {
        attr(span2, "class", span2_class_value);
      }
      if (dirty[0] & /*kanbanGroups, columnDefs*/
      25165824 && t8_value !== (t8_value = /*it*/
      (ctx[77].fields?.["System.Title"] || `Work Item #${/*it*/
      ctx[77].id}`) + "")) set_data(t8, t8_value);
      if (dirty[0] & /*kanbanGroups, columnDefs*/
      25165824) show_if_1 = extractDescription(
        /*it*/
        ctx[77]
      );
      if (show_if_1) {
        if (if_block1) {
          if_block1.p(ctx, dirty);
        } else {
          if_block1 = create_if_block_5(ctx);
          if_block1.c();
          if_block1.m(div3, t10);
        }
      } else if (if_block1) {
        if_block1.d(1);
        if_block1 = null;
      }
      if (dirty[0] & /*kanbanGroups, columnDefs*/
      25165824 && t11_value !== (t11_value = /*it*/
      (ctx[77].fields?.["System.WorkItemType"] || "Task") + "")) set_data(t11, t11_value);
      if (
        /*it*/
        ctx[77].fields?.["System.AssignedTo"]
      ) {
        if (if_block2) {
          if_block2.p(ctx, dirty);
        } else {
          if_block2 = create_if_block_4(ctx);
          if_block2.c();
          if_block2.m(div2, null);
        }
      } else if (if_block2) {
        if_block2.d(1);
        if_block2 = null;
      }
      if (current_block_type === (current_block_type = select_block_type_5(ctx, dirty)) && if_block3) {
        if_block3.p(ctx, dirty);
      } else {
        if_block3.d(1);
        if_block3 = current_block_type(ctx);
        if (if_block3) {
          if_block3.c();
          if_block3.m(div4, t14);
        }
      }
      if (dirty[0] & /*kanbanGroups, columnDefs*/
      25165824 && button0_aria_label_value !== (button0_aria_label_value = `View work item #${/*it*/
      ctx[77].id}`)) {
        attr(button0, "aria-label", button0_aria_label_value);
      }
      if (dirty[0] & /*kanbanGroups, columnDefs*/
      25165824 && button1_aria_label_value !== (button1_aria_label_value = `Edit work item #${/*it*/
      ctx[77].id}`)) {
        attr(button1, "aria-label", button1_aria_label_value);
      }
      if (dirty[0] & /*kanbanGroups, columnDefs*/
      25165824 && button2_aria_label_value !== (button2_aria_label_value = `Add comment to #${/*it*/
      ctx[77].id}`)) {
        attr(button2, "aria-label", button2_aria_label_value);
      }
      if (dirty[0] & /*kanbanGroups, columnDefs, timerActive, activeId*/
      25166112 && div5_class_value !== (div5_class_value = "work-item-card kanban-card state-" + normalizeState(
        /*it*/
        ctx[77].fields?.["System.State"]
      ) + " " + /*timerActive*/
      (ctx[5] && /*activeId*/
      ctx[8] === Number(
        /*it*/
        ctx[77].id
      ) ? "has-active-timer" : "") + " svelte-s1e7ae")) {
        attr(div5, "class", div5_class_value);
      }
      if (dirty[0] & /*kanbanGroups, columnDefs*/
      25165824 && div5_aria_label_value !== (div5_aria_label_value = `Work item #${/*it*/
      ctx[77].id}: ${/*it*/
      ctx[77].fields?.["System.Title"]} - press Enter to open; Ctrl+Arrow to move`)) {
        attr(div5, "aria-label", div5_aria_label_value);
      }
    },
    d(detaching) {
      if (detaching) {
        detach(div5);
      }
      if (if_block0) if_block0.d();
      if (if_block1) if_block1.d();
      if (if_block2) if_block2.d();
      if_block3.d();
      mounted = false;
      run_all(dispose);
    }
  };
}
function create_each_block2(ctx) {
  let div2;
  let div0;
  let h3;
  let t0_value = (
    /*col*/
    ctx[74].label + ""
  );
  let t0;
  let t1;
  let span;
  let t2_value = (
    /*kanbanGroups*/
    (ctx[23][
      /*col*/
      ctx[74].key
    ]?.length || 0) + ""
  );
  let t2;
  let t3;
  let div1;
  let t4;
  let div2_class_value;
  let div2_aria_label_value;
  let mounted;
  let dispose;
  function select_block_type_4(ctx2, dirty) {
    if (
      /*kanbanGroups*/
      ctx2[23][
        /*col*/
        ctx2[74].key
      ]?.length
    ) return create_if_block_2;
    return create_else_block_1;
  }
  let current_block_type = select_block_type_4(ctx, [-1, -1, -1]);
  let if_block = current_block_type(ctx);
  function drop_handler(...args) {
    return (
      /*drop_handler*/
      ctx[58](
        /*col*/
        ctx[74],
        ...args
      )
    );
  }
  return {
    c() {
      div2 = element("div");
      div0 = element("div");
      h3 = element("h3");
      t0 = text(t0_value);
      t1 = space();
      span = element("span");
      t2 = text(t2_value);
      t3 = space();
      div1 = element("div");
      if_block.c();
      t4 = space();
      attr(h3, "class", "svelte-s1e7ae");
      attr(span, "class", "item-count svelte-s1e7ae");
      attr(div0, "class", "kanban-column-header svelte-s1e7ae");
      attr(div1, "class", "kanban-column-content svelte-s1e7ae");
      attr(div2, "class", div2_class_value = "kanban-column state-" + /*col*/
      ctx[74].key + " svelte-s1e7ae");
      attr(div2, "role", "listbox");
      attr(div2, "tabindex", "0");
      attr(div2, "aria-label", div2_aria_label_value = `${/*col*/
      ctx[74].label} column - drop items here`);
    },
    m(target, anchor) {
      insert(target, div2, anchor);
      append(div2, div0);
      append(div0, h3);
      append(h3, t0);
      append(div0, t1);
      append(div0, span);
      append(span, t2);
      append(div2, t3);
      append(div2, div1);
      if_block.m(div1, null);
      append(div2, t4);
      if (!mounted) {
        dispose = [listen(div2, "dragover", allowDrop), listen(div2, "drop", drop_handler)];
        mounted = true;
      }
    },
    p(new_ctx, dirty) {
      ctx = new_ctx;
      if (dirty[0] & /*columnDefs*/
      16777216 && t0_value !== (t0_value = /*col*/
      ctx[74].label + "")) set_data(t0, t0_value);
      if (dirty[0] & /*kanbanGroups, columnDefs*/
      25165824 && t2_value !== (t2_value = /*kanbanGroups*/
      (ctx[23][
        /*col*/
        ctx[74].key
      ]?.length || 0) + "")) set_data(t2, t2_value);
      if (current_block_type === (current_block_type = select_block_type_4(ctx, dirty)) && if_block) {
        if_block.p(ctx, dirty);
      } else {
        if_block.d(1);
        if_block = current_block_type(ctx);
        if (if_block) {
          if_block.c();
          if_block.m(div1, null);
        }
      }
      if (dirty[0] & /*columnDefs*/
      16777216 && div2_class_value !== (div2_class_value = "kanban-column state-" + /*col*/
      ctx[74].key + " svelte-s1e7ae")) {
        attr(div2, "class", div2_class_value);
      }
      if (dirty[0] & /*columnDefs*/
      16777216 && div2_aria_label_value !== (div2_aria_label_value = `${/*col*/
      ctx[74].label} column - drop items here`)) {
        attr(div2, "aria-label", div2_aria_label_value);
      }
    },
    d(detaching) {
      if (detaching) {
        detach(div2);
      }
      if_block.d();
      mounted = false;
      run_all(dispose);
    }
  };
}
function create_fragment2(ctx) {
  let div2;
  let div0;
  let span0;
  let t1;
  let t2;
  let t3;
  let span1;
  let t4;
  let t5;
  let t6;
  let span3;
  let button;
  let t7;
  let t8_value = (
    /*summaryOpen*/
    ctx[17] ? "\u25B4" : "\u25BE"
  );
  let t8;
  let button_aria_expanded_value;
  let t9;
  let span2;
  let input;
  let t10;
  let select0;
  let option0;
  let t12;
  let select1;
  let option1;
  let t14;
  let select2;
  let option2;
  let option3;
  let option4;
  let option5;
  let t19;
  let div1;
  let t20;
  let t21;
  let t22;
  let toasts2;
  let current;
  let mounted;
  let dispose;
  let if_block0 = (
    /*subtitle*/
    ctx[4] && create_if_block_26(ctx)
  );
  let if_block1 = (
    /*loading*/
    ctx[12] && create_if_block_25(ctx)
  );
  let if_block2 = (
    /*timerActive*/
    ctx[5] && create_if_block_22(ctx)
  );
  let if_block3 = (
    /*availableTypes*/
    ctx[16] && /*availableTypes*/
    ctx[16].length && create_if_block_21(ctx)
  );
  function select_block_type(ctx2, dirty) {
    if (
      /*availableStates*/
      ctx2[15] && /*availableStates*/
      ctx2[15].length
    ) return create_if_block_20;
    return create_else_block_6;
  }
  let current_block_type = select_block_type(ctx, [-1, -1, -1]);
  let if_block4 = current_block_type(ctx);
  function select_block_type_1(ctx2, dirty) {
    if (
      /*summaryOpen*/
      ctx2[17]
    ) return create_if_block_13;
    if (
      /*summaryStatus*/
      ctx2[19]
    ) return create_if_block_19;
  }
  let current_block_type_1 = select_block_type_1(ctx, [-1, -1, -1]);
  let if_block5 = current_block_type_1 && current_block_type_1(ctx);
  let if_block6 = (
    /*errorMsg*/
    ctx[13] && create_if_block_12(ctx)
  );
  function select_block_type_3(ctx2, dirty) {
    if (
      /*loading*/
      ctx2[12]
    ) return create_if_block;
    if (
      /*kanbanView*/
      ctx2[11]
    ) return create_if_block_1;
    if (
      /*items*/
      ctx2[10] && /*items*/
      ctx2[10].length
    ) return create_if_block_7;
    return create_else_block_4;
  }
  let current_block_type_2 = select_block_type_3(ctx, [-1, -1, -1]);
  let if_block7 = current_block_type_2(ctx);
  toasts2 = new Toasts_default({
    props: { ariaLabel: "Work item notifications" }
  });
  return {
    c() {
      div2 = element("div");
      div0 = element("div");
      span0 = element("span");
      span0.textContent = "Work Items";
      t1 = space();
      if (if_block0) if_block0.c();
      t2 = space();
      if (if_block1) if_block1.c();
      t3 = space();
      span1 = element("span");
      t4 = text(
        /*workItemCount*/
        ctx[3]
      );
      t5 = space();
      if (if_block2) if_block2.c();
      t6 = space();
      span3 = element("span");
      button = element("button");
      t7 = text("Compose Summary ");
      t8 = text(t8_value);
      t9 = space();
      span2 = element("span");
      input = element("input");
      t10 = space();
      select0 = element("select");
      option0 = element("option");
      option0.textContent = "All types";
      if (if_block3) if_block3.c();
      t12 = space();
      select1 = element("select");
      option1 = element("option");
      option1.textContent = "All";
      if_block4.c();
      t14 = space();
      select2 = element("select");
      option2 = element("option");
      option2.textContent = "Updated \u2193";
      option3 = element("option");
      option3.textContent = "ID \u2193";
      option4 = element("option");
      option4.textContent = "ID \u2191";
      option5 = element("option");
      option5.textContent = "Title A\u2192Z";
      t19 = space();
      div1 = element("div");
      if (if_block5) if_block5.c();
      t20 = space();
      if (if_block6) if_block6.c();
      t21 = space();
      if_block7.c();
      t22 = space();
      create_component(toasts2.$$.fragment);
      set_style(span0, "font-weight", "600");
      attr(span1, "class", "count svelte-s1e7ae");
      attr(button, "class", "summary-toggle svelte-s1e7ae");
      attr(button, "aria-expanded", button_aria_expanded_value = /*summaryOpen*/
      ctx[17] ? "true" : "false");
      attr(button, "aria-label", "Toggle summary composer");
      attr(input, "placeholder", "Filter...");
      input.value = /*filterText*/
      ctx[14];
      attr(input, "aria-label", "Filter work items");
      attr(input, "class", "svelte-s1e7ae");
      option0.__value = "";
      set_input_value(option0, option0.__value);
      attr(select0, "aria-label", "Filter by work item type");
      attr(select0, "class", "svelte-s1e7ae");
      if (
        /*typeFilter*/
        ctx[0] === void 0
      ) add_render_callback(() => (
        /*select0_change_handler*/
        ctx[47].call(select0)
      ));
      option1.__value = "all";
      set_input_value(option1, option1.__value);
      attr(select1, "aria-label", "Filter by state");
      attr(select1, "class", "svelte-s1e7ae");
      if (
        /*stateFilter*/
        ctx[1] === void 0
      ) add_render_callback(() => (
        /*select1_change_handler*/
        ctx[48].call(select1)
      ));
      option2.__value = "updated-desc";
      set_input_value(option2, option2.__value);
      option3.__value = "id-desc";
      set_input_value(option3, option3.__value);
      option4.__value = "id-asc";
      set_input_value(option4, option4.__value);
      option5.__value = "title-asc";
      set_input_value(option5, option5.__value);
      attr(select2, "aria-label", "Sort items");
      attr(select2, "class", "svelte-s1e7ae");
      if (
        /*sortKey*/
        ctx[2] === void 0
      ) add_render_callback(() => (
        /*select2_change_handler*/
        ctx[49].call(select2)
      ));
      attr(span2, "class", "filters svelte-s1e7ae");
      attr(span2, "aria-label", "Filters and sort");
      attr(span3, "class", "actions svelte-s1e7ae");
      set_style(span3, "margin-left", "auto");
      attr(div0, "class", "pane-header svelte-s1e7ae");
      attr(div0, "role", "toolbar");
      attr(div0, "aria-label", "Work Items actions");
      attr(div1, "class", "pane-body svelte-s1e7ae");
      attr(div2, "class", "pane svelte-s1e7ae");
    },
    m(target, anchor) {
      insert(target, div2, anchor);
      append(div2, div0);
      append(div0, span0);
      append(div0, t1);
      if (if_block0) if_block0.m(div0, null);
      append(div0, t2);
      if (if_block1) if_block1.m(div0, null);
      append(div0, t3);
      append(div0, span1);
      append(span1, t4);
      append(div0, t5);
      if (if_block2) if_block2.m(div0, null);
      append(div0, t6);
      append(div0, span3);
      append(span3, button);
      append(button, t7);
      append(button, t8);
      append(span3, t9);
      append(span3, span2);
      append(span2, input);
      append(span2, t10);
      append(span2, select0);
      append(select0, option0);
      if (if_block3) if_block3.m(select0, null);
      select_option(
        select0,
        /*typeFilter*/
        ctx[0],
        true
      );
      append(span2, t12);
      append(span2, select1);
      append(select1, option1);
      if_block4.m(select1, null);
      select_option(
        select1,
        /*stateFilter*/
        ctx[1],
        true
      );
      append(span2, t14);
      append(span2, select2);
      append(select2, option2);
      append(select2, option3);
      append(select2, option4);
      append(select2, option5);
      select_option(
        select2,
        /*sortKey*/
        ctx[2],
        true
      );
      append(div2, t19);
      append(div2, div1);
      if (if_block5) if_block5.m(div1, null);
      append(div1, t20);
      if (if_block6) if_block6.m(div1, null);
      append(div1, t21);
      if_block7.m(div1, null);
      append(div2, t22);
      mount_component(toasts2, div2, null);
      current = true;
      if (!mounted) {
        dispose = [
          listen(
            button,
            "click",
            /*onToggleSummary*/
            ctx[33]
          ),
          listen(
            input,
            "input",
            /*onFilterInput*/
            ctx[34]
          ),
          listen(
            select0,
            "change",
            /*onTypeFilterChange*/
            ctx[36]
          ),
          listen(
            select0,
            "change",
            /*select0_change_handler*/
            ctx[47]
          ),
          listen(
            select1,
            "change",
            /*onStateFilterChange*/
            ctx[35]
          ),
          listen(
            select1,
            "change",
            /*select1_change_handler*/
            ctx[48]
          ),
          listen(
            select2,
            "change",
            /*onSortChange*/
            ctx[37]
          ),
          listen(
            select2,
            "change",
            /*select2_change_handler*/
            ctx[49]
          )
        ];
        mounted = true;
      }
    },
    p(ctx2, dirty) {
      if (
        /*subtitle*/
        ctx2[4]
      ) {
        if (if_block0) {
          if_block0.p(ctx2, dirty);
        } else {
          if_block0 = create_if_block_26(ctx2);
          if_block0.c();
          if_block0.m(div0, t2);
        }
      } else if (if_block0) {
        if_block0.d(1);
        if_block0 = null;
      }
      if (
        /*loading*/
        ctx2[12]
      ) {
        if (if_block1) {
        } else {
          if_block1 = create_if_block_25(ctx2);
          if_block1.c();
          if_block1.m(div0, t3);
        }
      } else if (if_block1) {
        if_block1.d(1);
        if_block1 = null;
      }
      if (!current || dirty[0] & /*workItemCount*/
      8) set_data(
        t4,
        /*workItemCount*/
        ctx2[3]
      );
      if (
        /*timerActive*/
        ctx2[5]
      ) {
        if (if_block2) {
          if_block2.p(ctx2, dirty);
        } else {
          if_block2 = create_if_block_22(ctx2);
          if_block2.c();
          if_block2.m(div0, t6);
        }
      } else if (if_block2) {
        if_block2.d(1);
        if_block2 = null;
      }
      if ((!current || dirty[0] & /*summaryOpen*/
      131072) && t8_value !== (t8_value = /*summaryOpen*/
      ctx2[17] ? "\u25B4" : "\u25BE")) set_data(t8, t8_value);
      if (!current || dirty[0] & /*summaryOpen*/
      131072 && button_aria_expanded_value !== (button_aria_expanded_value = /*summaryOpen*/
      ctx2[17] ? "true" : "false")) {
        attr(button, "aria-expanded", button_aria_expanded_value);
      }
      if (!current || dirty[0] & /*filterText*/
      16384 && input.value !== /*filterText*/
      ctx2[14]) {
        input.value = /*filterText*/
        ctx2[14];
      }
      if (
        /*availableTypes*/
        ctx2[16] && /*availableTypes*/
        ctx2[16].length
      ) {
        if (if_block3) {
          if_block3.p(ctx2, dirty);
        } else {
          if_block3 = create_if_block_21(ctx2);
          if_block3.c();
          if_block3.m(select0, null);
        }
      } else if (if_block3) {
        if_block3.d(1);
        if_block3 = null;
      }
      if (dirty[0] & /*typeFilter, availableTypes*/
      65537) {
        select_option(
          select0,
          /*typeFilter*/
          ctx2[0]
        );
      }
      if (current_block_type === (current_block_type = select_block_type(ctx2, dirty)) && if_block4) {
        if_block4.p(ctx2, dirty);
      } else {
        if_block4.d(1);
        if_block4 = current_block_type(ctx2);
        if (if_block4) {
          if_block4.c();
          if_block4.m(select1, null);
        }
      }
      if (dirty[0] & /*stateFilter, availableStates, columnDefs*/
      16809986) {
        select_option(
          select1,
          /*stateFilter*/
          ctx2[1]
        );
      }
      if (dirty[0] & /*sortKey*/
      4) {
        select_option(
          select2,
          /*sortKey*/
          ctx2[2]
        );
      }
      if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx2, dirty)) && if_block5) {
        if_block5.p(ctx2, dirty);
      } else {
        if (if_block5) if_block5.d(1);
        if_block5 = current_block_type_1 && current_block_type_1(ctx2);
        if (if_block5) {
          if_block5.c();
          if_block5.m(div1, t20);
        }
      }
      if (
        /*errorMsg*/
        ctx2[13]
      ) {
        if (if_block6) {
          if_block6.p(ctx2, dirty);
        } else {
          if_block6 = create_if_block_12(ctx2);
          if_block6.c();
          if_block6.m(div1, t21);
        }
      } else if (if_block6) {
        if_block6.d(1);
        if_block6 = null;
      }
      if (current_block_type_2 === (current_block_type_2 = select_block_type_3(ctx2, dirty)) && if_block7) {
        if_block7.p(ctx2, dirty);
      } else {
        if_block7.d(1);
        if_block7 = current_block_type_2(ctx2);
        if (if_block7) {
          if_block7.c();
          if_block7.m(div1, null);
        }
      }
    },
    i(local) {
      if (current) return;
      transition_in(toasts2.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(toasts2.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(div2);
      }
      if (if_block0) if_block0.d();
      if (if_block1) if_block1.d();
      if (if_block2) if_block2.d();
      if (if_block3) if_block3.d();
      if_block4.d();
      if (if_block5) {
        if_block5.d();
      }
      if (if_block6) if_block6.d();
      if_block7.d();
      destroy_component(toasts2);
      mounted = false;
      run_all(dispose);
    }
  };
}
function allowDrop(ev) {
  ev.preventDefault();
}
function normalizeState(raw) {
  if (!raw) return "todo";
  const s = String(raw).toLowerCase().trim().replace(/\s+/g, "-");
  if (s === "new" || s === "to-do" || s === "todo" || s === "proposed") return "new";
  if (s === "approved") return "approved";
  if (s === "committed") return "committed";
  if (s === "active") return "active";
  if (s === "in-progress" || s === "inprogress" || s === "doing") return "inprogress";
  if (s === "review" || s === "code-review" || s === "testing") return "review";
  if (s === "resolved") return "resolved";
  if (s === "done") return "done";
  if (s === "closed" || s === "completed") return "closed";
  if (s === "removed") return "removed";
  return "new";
}
function getWorkItemTypeIcon(type) {
  const t = String(type || "").toLowerCase();
  if (t.includes("bug")) return "\uF41D";
  if (t.includes("task")) return "\uF0F7";
  if (t.includes("story") || t.includes("user story")) return "\uF413";
  if (t.includes("feature")) return "\uF0E7";
  if (t.includes("epic")) return "\uF0F2";
  return "\uF0C5";
}
function getPriorityClass(priority) {
  const p = Number(priority) || 3;
  if (p === 1) return "priority-1";
  if (p === 2) return "priority-2";
  if (p === 3) return "priority-3";
  if (p === 4) return "priority-4";
  return "priority-3";
}
function extractDescription(it) {
  const raw = it?.fields?.["System.Description"];
  if (!raw || typeof raw !== "string") return "";
  const text2 = raw.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim();
  const max = 120;
  if (text2.length <= max) return text2;
  return text2.slice(0, max).trimEnd() + "\u2026";
}
function instance2($$self, $$props, $$invalidate) {
  let summaryButtonLabel;
  let summaryHelperText;
  let summaryTargetDisplay;
  let summaryGenerateDisabled;
  let summaryApplyDisabled;
  let summaryAreaDisabled;
  let kanbanGroups;
  let columnDefs;
  const dispatch = createEventDispatcher();
  let { workItemCount: workItemCount2 = 0 } = $$props;
  let { subtitle = "" } = $$props;
  let { hasItems = false } = $$props;
  let { timerActive: timerActive2 = false } = $$props;
  let { timerRunning: timerRunning2 = false } = $$props;
  let { timerElapsedLabel: timerElapsedLabel2 = "" } = $$props;
  let { activeId: activeId2 = 0 } = $$props;
  let { activeTitle: activeTitle2 = "" } = $$props;
  let { items = [] } = $$props;
  let { kanbanView: kanbanView2 = false } = $$props;
  let { loading: loading2 = false } = $$props;
  let { errorMsg: errorMsg2 = "" } = $$props;
  let { filterText: filterText2 = "" } = $$props;
  let { typeFilter: typeFilter2 = "" } = $$props;
  let { stateFilter: stateFilter2 = "all" } = $$props;
  let { sortKey: sortKey2 = "updated-desc" } = $$props;
  let { availableStates = [] } = $$props;
  let { availableTypes = [] } = $$props;
  let { summaryOpen: summaryOpen2 = false } = $$props;
  let { summaryDraft: summaryDraft2 = "" } = $$props;
  let { summaryStatus: summaryStatus2 = "" } = $$props;
  let { summaryProvider: summaryProvider2 = "builtin" } = $$props;
  let { summaryBusy: summaryBusy2 = false } = $$props;
  let { summaryTargetId = 0 } = $$props;
  let { summaryTargetTitle: summaryTargetTitle2 = "" } = $$props;
  function onRefresh() {
    dispatch("refresh");
  }
  function onOpenFirst() {
    if (hasItems) dispatch("openFirst");
  }
  function onStartTimer() {
    if (hasItems && !timerActive2) dispatch("startTimer");
  }
  function onStopTimer() {
    if (timerActive2) dispatch("stopTimer");
  }
  function onOpenActive() {
    if (timerActive2 && activeId2) dispatch("openActive", { id: activeId2 });
  }
  function onCreate() {
    dispatch("createWorkItem");
  }
  function onToggleKanban() {
    dispatch("toggleKanban");
  }
  function onToggleSummary() {
    dispatch("toggleSummary");
  }
  function onFilterInput(e) {
    dispatch("filtersChanged", {
      filterText: e.target.value,
      typeFilter: typeFilter2,
      stateFilter: stateFilter2,
      sortKey: sortKey2
    });
  }
  function onStateFilterChange(e) {
    dispatch("filtersChanged", {
      filterText: filterText2,
      typeFilter: typeFilter2,
      stateFilter: e.target.value,
      sortKey: sortKey2
    });
  }
  function onTypeFilterChange(e) {
    dispatch("filtersChanged", {
      filterText: filterText2,
      typeFilter: e.target.value,
      stateFilter: stateFilter2,
      sortKey: sortKey2
    });
  }
  function onSortChange(e) {
    dispatch("filtersChanged", {
      filterText: filterText2,
      typeFilter: typeFilter2,
      stateFilter: stateFilter2,
      sortKey: e.target.value
    });
  }
  function onSummaryInput(e) {
    dispatch("summaryDraftChanged", { value: e.target.value });
  }
  function onSummaryBlur(e) {
    dispatch("summaryDraftBlur", { value: e.target.value });
  }
  function onGenerateSummary() {
    dispatch("generateSummary");
  }
  function onStopAndApplySummary() {
    dispatch("stopAndApplySummary");
  }
  let draggingId = null;
  function handleDragStart(ev, it) {
    draggingId = it.id;
    try {
      ev.dataTransfer?.setData("text/plain", String(it.id));
    } catch {
    }
    ev.dataTransfer && (ev.dataTransfer.effectAllowed = "move");
  }
  function handleDrop(ev, colKey) {
    ev.preventDefault();
    const txt = ev.dataTransfer?.getData("text/plain");
    const id = Number(txt || draggingId);
    draggingId = null;
    if (!id) return;
    const label = bucketLabels[colKey] || colKey;
    dispatch("moveItem", { id, target: colKey, targetState: label });
  }
  const bucketOrder = [
    "new",
    "approved",
    "committed",
    "active",
    "inprogress",
    "review",
    "resolved",
    "done",
    "closed",
    "removed"
  ];
  const bucketLabels = {
    new: "New",
    approved: "Approved",
    committed: "Committed",
    active: "Active",
    inprogress: "In Progress",
    review: "Review/Testing",
    resolved: "Resolved",
    done: "Done",
    closed: "Closed",
    removed: "Removed"
  };
  function select0_change_handler() {
    typeFilter2 = select_value(this);
    $$invalidate(0, typeFilter2);
    $$invalidate(16, availableTypes);
  }
  function select1_change_handler() {
    stateFilter2 = select_value(this);
    $$invalidate(1, stateFilter2);
    $$invalidate(15, availableStates);
    $$invalidate(24, columnDefs), $$invalidate(23, kanbanGroups), $$invalidate(10, items);
  }
  function select2_change_handler() {
    sortKey2 = select_value(this);
    $$invalidate(2, sortKey2);
  }
  const click_handler = () => dispatch("stopTimer");
  const click_handler_1 = (it) => dispatch("startItem", { id: it.id });
  const click_handler_2 = (it) => dispatch("openItem", { id: it.id });
  const click_handler_3 = (it) => dispatch("editItem", { id: it.id });
  const click_handler_4 = (it) => dispatch("commentItem", { id: it.id });
  const dragstart_handler = (it, e) => handleDragStart(e, it);
  const keydown_handler = (it, e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      dispatch("openItem", { id: it.id });
      return;
    }
    if (kanbanView2 && (e.ctrlKey || e.metaKey) && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      const currentKey = normalizeState(it.fields?.["System.State"]);
      const idx = columnDefs.findIndex((c) => c.key === currentKey);
      if (idx !== -1) {
        const nextIdx = e.key === "ArrowLeft" ? idx - 1 : idx + 1;
        const target = columnDefs[nextIdx];
        if (target) {
          const label = target.label || target.key;
          dispatch("moveItem", {
            id: it.id,
            target: target.key,
            targetState: label
          });
        }
      }
    }
  };
  const click_handler_5 = (it) => dispatch("openItem", { id: it.id });
  const drop_handler = (col, e) => handleDrop(e, col.key);
  const click_handler_6 = () => dispatch("stopTimer");
  const click_handler_7 = (it) => dispatch("startItem", { id: it.id });
  const click_handler_8 = (it) => dispatch("openItem", { id: it.id });
  const click_handler_9 = (it) => dispatch("editItem", { id: it.id });
  const click_handler_10 = (it) => dispatch("commentItem", { id: it.id });
  const keydown_handler_1 = (it, e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      dispatch("openItem", { id: it.id });
    }
  };
  const click_handler_11 = (it) => dispatch("openItem", { id: it.id });
  $$self.$$set = ($$props2) => {
    if ("workItemCount" in $$props2) $$invalidate(3, workItemCount2 = $$props2.workItemCount);
    if ("subtitle" in $$props2) $$invalidate(4, subtitle = $$props2.subtitle);
    if ("hasItems" in $$props2) $$invalidate(45, hasItems = $$props2.hasItems);
    if ("timerActive" in $$props2) $$invalidate(5, timerActive2 = $$props2.timerActive);
    if ("timerRunning" in $$props2) $$invalidate(6, timerRunning2 = $$props2.timerRunning);
    if ("timerElapsedLabel" in $$props2) $$invalidate(7, timerElapsedLabel2 = $$props2.timerElapsedLabel);
    if ("activeId" in $$props2) $$invalidate(8, activeId2 = $$props2.activeId);
    if ("activeTitle" in $$props2) $$invalidate(9, activeTitle2 = $$props2.activeTitle);
    if ("items" in $$props2) $$invalidate(10, items = $$props2.items);
    if ("kanbanView" in $$props2) $$invalidate(11, kanbanView2 = $$props2.kanbanView);
    if ("loading" in $$props2) $$invalidate(12, loading2 = $$props2.loading);
    if ("errorMsg" in $$props2) $$invalidate(13, errorMsg2 = $$props2.errorMsg);
    if ("filterText" in $$props2) $$invalidate(14, filterText2 = $$props2.filterText);
    if ("typeFilter" in $$props2) $$invalidate(0, typeFilter2 = $$props2.typeFilter);
    if ("stateFilter" in $$props2) $$invalidate(1, stateFilter2 = $$props2.stateFilter);
    if ("sortKey" in $$props2) $$invalidate(2, sortKey2 = $$props2.sortKey);
    if ("availableStates" in $$props2) $$invalidate(15, availableStates = $$props2.availableStates);
    if ("availableTypes" in $$props2) $$invalidate(16, availableTypes = $$props2.availableTypes);
    if ("summaryOpen" in $$props2) $$invalidate(17, summaryOpen2 = $$props2.summaryOpen);
    if ("summaryDraft" in $$props2) $$invalidate(18, summaryDraft2 = $$props2.summaryDraft);
    if ("summaryStatus" in $$props2) $$invalidate(19, summaryStatus2 = $$props2.summaryStatus);
    if ("summaryProvider" in $$props2) $$invalidate(20, summaryProvider2 = $$props2.summaryProvider);
    if ("summaryBusy" in $$props2) $$invalidate(21, summaryBusy2 = $$props2.summaryBusy);
    if ("summaryTargetId" in $$props2) $$invalidate(22, summaryTargetId = $$props2.summaryTargetId);
    if ("summaryTargetTitle" in $$props2) $$invalidate(46, summaryTargetTitle2 = $$props2.summaryTargetTitle);
  };
  $$self.$$.update = () => {
    if ($$self.$$.dirty[0] & /*summaryProvider*/
    1048576) {
      $: $$invalidate(30, summaryButtonLabel = summaryProvider2 === "openai" ? "Generate AI Summary" : "Copy Copilot Prompt");
    }
    if ($$self.$$.dirty[0] & /*summaryProvider*/
    1048576) {
      $: $$invalidate(29, summaryHelperText = summaryProvider2 === "openai" ? "Creates an OpenAI summary and copies it to your clipboard." : "Copies a Copilot-ready prompt to your clipboard.");
    }
    if ($$self.$$.dirty[0] & /*summaryTargetId*/
    4194304 | $$self.$$.dirty[1] & /*summaryTargetTitle*/
    32768) {
      $: $$invalidate(28, summaryTargetDisplay = summaryTargetId ? `#${summaryTargetId} \xB7 ${summaryTargetTitle2 || `Work Item #${summaryTargetId}`}` : "");
    }
    if ($$self.$$.dirty[0] & /*summaryBusy, summaryTargetId*/
    6291456) {
      $: $$invalidate(27, summaryGenerateDisabled = summaryBusy2 || !summaryTargetId);
    }
    if ($$self.$$.dirty[0] & /*summaryBusy, timerActive*/
    2097184) {
      $: $$invalidate(26, summaryApplyDisabled = summaryBusy2 || !timerActive2);
    }
    if ($$self.$$.dirty[0] & /*summaryTargetId*/
    4194304) {
      $: $$invalidate(25, summaryAreaDisabled = !summaryTargetId);
    }
    if ($$self.$$.dirty[0] & /*items*/
    1024) {
      $: $$invalidate(23, kanbanGroups = (() => {
        const present = new Set(bucketOrder);
        const groups = Object.fromEntries(bucketOrder.map((k) => [k, []]));
        (items || []).forEach((it) => {
          const norm = normalizeState(it?.fields?.["System.State"]);
          if (!present.has(norm)) present.add(norm);
          (groups[norm] || groups["new"]).push(it);
        });
        return groups;
      })());
    }
    if ($$self.$$.dirty[0] & /*kanbanGroups*/
    8388608) {
      $: $$invalidate(24, columnDefs = bucketOrder.filter((k) => (kanbanGroups[k] || []).length > 0 || ["new", "active", "inprogress", "review", "done"].includes(k)).map((k) => ({ key: k, label: bucketLabels[k] || k })));
    }
  };
  return [
    typeFilter2,
    stateFilter2,
    sortKey2,
    workItemCount2,
    subtitle,
    timerActive2,
    timerRunning2,
    timerElapsedLabel2,
    activeId2,
    activeTitle2,
    items,
    kanbanView2,
    loading2,
    errorMsg2,
    filterText2,
    availableStates,
    availableTypes,
    summaryOpen2,
    summaryDraft2,
    summaryStatus2,
    summaryProvider2,
    summaryBusy2,
    summaryTargetId,
    kanbanGroups,
    columnDefs,
    summaryAreaDisabled,
    summaryApplyDisabled,
    summaryGenerateDisabled,
    summaryTargetDisplay,
    summaryHelperText,
    summaryButtonLabel,
    dispatch,
    onOpenActive,
    onToggleSummary,
    onFilterInput,
    onStateFilterChange,
    onTypeFilterChange,
    onSortChange,
    onSummaryInput,
    onSummaryBlur,
    onGenerateSummary,
    onStopAndApplySummary,
    handleDragStart,
    handleDrop,
    bucketLabels,
    hasItems,
    summaryTargetTitle2,
    select0_change_handler,
    select1_change_handler,
    select2_change_handler,
    click_handler,
    click_handler_1,
    click_handler_2,
    click_handler_3,
    click_handler_4,
    dragstart_handler,
    keydown_handler,
    click_handler_5,
    drop_handler,
    click_handler_6,
    click_handler_7,
    click_handler_8,
    click_handler_9,
    click_handler_10,
    keydown_handler_1,
    click_handler_11
  ];
}
var App = class extends SvelteComponent {
  constructor(options) {
    super();
    init(
      this,
      options,
      instance2,
      create_fragment2,
      safe_not_equal,
      {
        workItemCount: 3,
        subtitle: 4,
        hasItems: 45,
        timerActive: 5,
        timerRunning: 6,
        timerElapsedLabel: 7,
        activeId: 8,
        activeTitle: 9,
        items: 10,
        kanbanView: 11,
        loading: 12,
        errorMsg: 13,
        filterText: 14,
        typeFilter: 0,
        stateFilter: 1,
        sortKey: 2,
        availableStates: 15,
        availableTypes: 16,
        summaryOpen: 17,
        summaryDraft: 18,
        summaryStatus: 19,
        summaryProvider: 20,
        summaryBusy: 21,
        summaryTargetId: 22,
        summaryTargetTitle: 46
      },
      null,
      [-1, -1, -1]
    );
  }
};
var App_default = App;

// src/webview/svelte-main.ts
var vscode = (() => {
  try {
    return window.vscode || acquireVsCodeApi();
  } catch (e) {
    console.error("[svelte-main] Failed to acquire VS Code API", e);
    return null;
  }
})();
function postMessage(msg) {
  try {
    if (vscode && typeof vscode.postMessage === "function") {
      vscode.postMessage(msg);
      return;
    }
    if (window.vscode && typeof window.vscode.postMessage === "function") {
      window.vscode.postMessage(msg);
      return;
    }
  } catch (err) {
    console.error("[svelte-main] postMessage error", err, msg);
  }
}
var app = null;
var workItemCount = 0;
var lastWorkItems = [];
var timerActive = false;
var timerRunning = false;
var activeId = 0;
var activeTitle = "";
var elapsedSeconds = 0;
var timerElapsedLabel = "";
var itemsForView = [];
var kanbanView = false;
var loading = true;
var errorMsg = "";
var filterText = "";
var typeFilter = "";
var stateFilter = "all";
var sortKey = "updated-desc";
var normalizedQuery = "";
var pendingMoves = /* @__PURE__ */ new Map();
var stateOptions = [];
var typeOptions = [];
var typeOptionHints = /* @__PURE__ */ new Set();
var searchHaystackCache = /* @__PURE__ */ new WeakMap();
var summaryOpen = false;
var summaryDraft = "";
var summaryStatus = "";
var summaryProvider = "builtin";
var summaryBusy = false;
var summaryWorkItemId = null;
var summaryTargetTitle = "";
var summaryBusyTimer;
var summaryStatusTimer;
try {
  const st = vscode && typeof vscode.getState === "function" ? vscode.getState() : null;
  if (st && typeof st.kanbanView === "boolean") kanbanView = !!st.kanbanView;
  if (st && typeof st.summaryOpen === "boolean") summaryOpen = !!st.summaryOpen;
  if (st && typeof st.typeFilter === "string") typeFilter = st.typeFilter;
  if (st && typeof st.summaryWorkItemId === "number") {
    summaryWorkItemId = st.summaryWorkItemId || null;
  }
} catch (e) {
  console.warn("[svelte-main] Unable to read persisted state", e);
}
function getAppProps() {
  return {
    workItemCount,
    subtitle: "",
    hasItems: itemsForView.length > 0,
    timerActive,
    timerRunning,
    timerElapsedLabel,
    activeId,
    activeTitle,
    items: itemsForView,
    kanbanView,
    loading,
    errorMsg,
    filterText,
    typeFilter,
    stateFilter,
    sortKey,
    availableStates: stateOptions,
    availableTypes: typeOptions,
    summaryOpen,
    summaryDraft,
    summaryStatus,
    summaryProvider,
    summaryBusy,
    summaryTargetId: summaryWorkItemId ?? 0,
    summaryTargetTitle
  };
}
function syncApp() {
  ensureApp();
  app.$set(getAppProps());
}
function persistViewState(extra) {
  try {
    if (!vscode || typeof vscode.setState !== "function") return;
    const prev = typeof vscode.getState === "function" && vscode.getState() || {};
    vscode.setState({
      ...prev,
      kanbanView,
      filterText,
      typeFilter,
      stateFilter,
      sortKey,
      summaryOpen,
      summaryWorkItemId,
      ...extra
    });
  } catch (e) {
    console.warn("[svelte-main] Unable to persist view state", e);
  }
}
function ensureApp() {
  if (app) return app;
  const root = document.createElement("div");
  root.id = "svelte-root";
  const container = document.body || document.documentElement;
  container.insertBefore(root, container.firstChild);
  app = new App_default({
    target: root,
    props: getAppProps()
  });
  app.$on("refresh", () => {
    loading = true;
    errorMsg = "";
    syncApp();
    postMessage({ type: "refresh" });
  });
  app.$on("openFirst", () => {
    const first = (lastWorkItems || [])[0];
    if (first)
      postMessage({
        type: "viewWorkItem",
        workItemId: Number(first.id || first.fields?.["System.Id"])
      });
    if (first) {
      const id = Number(first.id || first.fields?.["System.Id"]);
      setSummaryTarget(id, { ensureOpen: true });
      syncApp();
    }
  });
  app.$on("startTimer", () => {
    const first = (lastWorkItems || [])[0];
    if (first)
      postMessage({
        type: "startTimer",
        workItemId: Number(first.id || first.fields?.["System.Id"])
      });
  });
  app.$on("stopTimer", () => postMessage({ type: "showStopTimerOptions" }));
  app.$on("openActive", (ev) => {
    const id = ev?.detail?.id ?? activeId;
    if (id != null) {
      postMessage({ type: "viewWorkItem", workItemId: Number(id) });
      setSummaryTarget(Number(id), { ensureOpen: true });
      syncApp();
    }
  });
  app.$on("openItem", (ev) => {
    const id = Number(ev?.detail?.id);
    if (id) {
      postMessage({ type: "viewWorkItem", workItemId: id });
      setSummaryTarget(id, { ensureOpen: false });
      syncApp();
    }
  });
  app.$on("startItem", (ev) => {
    const id = Number(ev?.detail?.id);
    if (id) {
      postMessage({ type: "startTimer", workItemId: id });
      setSummaryTarget(id, { ensureOpen: true });
      syncApp();
    }
  });
  app.$on("editItem", (ev) => {
    const id = Number(ev?.detail?.id);
    if (id) {
      postMessage({ type: "editWorkItemInEditor", workItemId: id });
      setSummaryTarget(id, { ensureOpen: false });
      syncApp();
    }
  });
  app.$on("commentItem", (ev) => {
    const id = Number(ev?.detail?.id);
    if (id) {
      postMessage({ type: "addComment", workItemId: id });
      setSummaryTarget(id, { ensureOpen: true });
      syncApp();
    }
  });
  app.$on("createWorkItem", () => postMessage({ type: "createWorkItem" }));
  app.$on("toggleKanban", () => {
    kanbanView = !kanbanView;
    persistViewState();
    syncApp();
    postMessage({
      type: "uiPreferenceChanged",
      preferences: { kanbanView, filterText, typeFilter, stateFilter, sortKey, summaryOpen }
    });
  });
  app.$on("filtersChanged", (ev) => {
    filterText = String(ev?.detail?.filterText ?? filterText);
    typeFilter = String(ev?.detail?.typeFilter ?? typeFilter);
    stateFilter = String(ev?.detail?.stateFilter ?? stateFilter);
    sortKey = String(ev?.detail?.sortKey ?? sortKey);
    recomputeItemsForView();
    persistViewState();
    syncApp();
    postMessage({
      type: "uiPreferenceChanged",
      preferences: { kanbanView, filterText, typeFilter, stateFilter, sortKey, summaryOpen }
    });
  });
  app.$on("moveItem", (ev) => {
    const id = Number(ev?.detail?.id);
    const target = String(ev?.detail?.target || "");
    if (!id || !target) return;
    const found = (lastWorkItems || []).find((w) => Number(w.id) === id);
    if (found) {
      if (!found.fields) found.fields = {};
      const mapping = {
        new: "To Do",
        active: "Active",
        inprogress: "In Progress",
        review: "Review",
        resolved: "Resolved",
        done: "Done",
        removed: "Removed"
      };
      const prevState = String(found.fields["System.State"] || "");
      pendingMoves.set(id, { prevState });
      found.fields["System.State"] = mapping[target] || "Active";
      recomputeItemsForView();
      syncApp();
    }
    postMessage({ type: "moveWorkItem", id, target });
  });
  app.$on("toggleSummary", () => {
    summaryOpen = !summaryOpen;
    persistViewState();
    syncApp();
  });
  const onDraftChange = (value) => {
    summaryDraft = value;
    if (summaryWorkItemId) saveDraftForWorkItem(summaryWorkItemId, summaryDraft);
    syncApp();
  };
  app.$on("summaryDraftChanged", (ev) => {
    onDraftChange(String(ev?.detail?.value ?? ""));
  });
  app.$on("summaryDraftBlur", (ev) => {
    onDraftChange(String(ev?.detail?.value ?? ""));
  });
  app.$on("generateSummary", () => {
    attemptSummaryGeneration();
  });
  app.$on("stopAndApplySummary", () => {
    attemptStopAndApply();
  });
  return app;
}
function findWorkItemById(id) {
  const target = Number(id);
  return (lastWorkItems || []).find((w) => Number(w.id || w.fields?.["System.Id"]) === target);
}
function getWorkItemTitle(id) {
  const match = findWorkItemById(id);
  if (match) return String(match.fields?.["System.Title"] || `#${id}`);
  if (activeId === id && activeTitle) return activeTitle;
  return `Work Item #${id}`;
}
function updateSummaryTargetTitle() {
  if (summaryWorkItemId) {
    summaryTargetTitle = getWorkItemTitle(summaryWorkItemId);
  } else {
    summaryTargetTitle = "";
  }
}
function saveDraftForWorkItem(workItemId, text2) {
  try {
    localStorage.setItem(`azuredevops.draft.${workItemId}`, text2 || "");
  } catch (e) {
    console.warn("[svelte-main] Failed to save draft to localStorage", e);
  }
}
function loadDraftForWorkItem(workItemId) {
  try {
    return localStorage.getItem(`azuredevops.draft.${workItemId}`);
  } catch (e) {
    console.warn("[svelte-main] Failed to load draft from localStorage", e);
    return null;
  }
}
function removeDraftForWorkItem(workItemId) {
  try {
    localStorage.removeItem(`azuredevops.draft.${workItemId}`);
  } catch (e) {
    console.warn("[svelte-main] Failed to remove draft from localStorage", e);
  }
}
function setSummaryTarget(workItemId, options = {}) {
  const id = Number(workItemId);
  if (!Number.isFinite(id) || id <= 0) return;
  const changed = summaryWorkItemId !== id;
  if (changed) summaryWorkItemId = id;
  updateSummaryTargetTitle();
  const shouldRefresh = options.refreshDraft ?? changed;
  if (shouldRefresh) {
    const persisted = loadDraftForWorkItem(id);
    if (persisted !== null) {
      summaryDraft = persisted;
    } else if (!summaryDraft || changed) {
      summaryDraft = "";
    }
  }
  const ensureOpenRequested = options.ensureOpen || !summaryOpen && timerActive;
  let opened = false;
  if (ensureOpenRequested && !summaryOpen) {
    summaryOpen = true;
    opened = true;
  }
  if (changed || shouldRefresh || opened) {
    persistViewState();
  }
}
function setSummaryBusy(busy) {
  if (summaryBusyTimer) {
    try {
      clearTimeout(summaryBusyTimer);
    } catch {
    }
    summaryBusyTimer = void 0;
  }
  summaryBusy = busy;
  if (busy) {
    summaryBusyTimer = setTimeout(() => {
      summaryBusy = false;
      summaryBusyTimer = void 0;
      syncApp();
    }, 6e3);
  }
}
function setSummaryStatus(message, options) {
  if (summaryStatusTimer) {
    try {
      clearTimeout(summaryStatusTimer);
    } catch {
    }
    summaryStatusTimer = void 0;
  }
  summaryStatus = message;
  const delay = options?.timeout ?? 0;
  if (delay > 0) {
    summaryStatusTimer = setTimeout(() => {
      summaryStatusTimer = void 0;
      summaryStatus = "";
      syncApp();
    }, delay);
  }
}
function determineSummaryTargetId() {
  if (summaryWorkItemId) return summaryWorkItemId;
  if (timerActive && activeId) return activeId;
  const first = itemsForView[0];
  if (first) return Number(first.id || first.fields?.["System.Id"]);
  return null;
}
function attemptSummaryGeneration() {
  const targetId = determineSummaryTargetId();
  if (!targetId) {
    const message = "Select a work item or start a timer to generate a summary.";
    setSummaryStatus(message, { timeout: 3500 });
    addToast(message, { type: "warning", timeout: 3500 });
    syncApp();
    return;
  }
  if (!summaryOpen) summaryOpen = true;
  setSummaryBusy(true);
  setSummaryStatus("Generating summary\u2026");
  syncApp();
  postMessage({
    type: "generateCopilotPrompt",
    workItemId: targetId,
    draftSummary: summaryDraft
  });
}
function attemptStopAndApply() {
  if (!timerActive) {
    const message = "Start a timer before applying time to the work item.";
    setSummaryStatus(message, { timeout: 3500 });
    addToast(message, { type: "warning", timeout: 3500 });
    syncApp();
    return;
  }
  if (summaryWorkItemId) saveDraftForWorkItem(summaryWorkItemId, summaryDraft);
  setSummaryBusy(true);
  setSummaryStatus("Stopping timer and applying updates\u2026");
  syncApp();
  postMessage({ type: "stopAndApply", comment: summaryDraft });
}
function getWorkItemType(it) {
  if (!it) return "";
  const flattened = typeof it?.type === "string" ? it.type : void 0;
  const fromFields = typeof it?.fields?.["System.WorkItemType"] === "string" ? it.fields["System.WorkItemType"] : void 0;
  const value = flattened || fromFields;
  return typeof value === "string" ? value.trim() : "";
}
function buildSearchHaystack(item) {
  const parts = [];
  const seen = /* @__PURE__ */ new WeakSet();
  const maxDepth = 5;
  const push = (value) => {
    const trimmed = value.trim();
    if (trimmed.length > 0) parts.push(trimmed.toLowerCase());
  };
  const visit = (value, depth = 0) => {
    if (value === null || value === void 0) return;
    if (typeof value === "string") {
      push(value);
      return;
    }
    if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") {
      push(String(value));
      return;
    }
    if (value instanceof Date) {
      push(value.toISOString());
      return;
    }
    if (typeof value === "symbol") {
      push(value.toString());
      return;
    }
    if (typeof value === "object") {
      if (seen.has(value)) return;
      seen.add(value);
      if (depth >= maxDepth) return;
      if (Array.isArray(value)) {
        value.forEach((entry) => visit(entry, depth + 1));
        return;
      }
      const identityKeys = [
        "displayName",
        "uniqueName",
        "name",
        "fullName",
        "mailAddress",
        "email",
        "userPrincipalName",
        "upn",
        "descriptor",
        "text",
        "value",
        "title"
      ];
      identityKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          visit(value[key], depth + 1);
        }
      });
      Object.keys(value).forEach((key) => {
        if (key === "__proto__") return;
        visit(value[key], depth + 1);
      });
    }
  };
  visit(item);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
function getSearchHaystack(item) {
  if (!item || typeof item !== "object" && typeof item !== "function") {
    return typeof item === "string" ? item.toLowerCase() : String(item ?? "").toLowerCase();
  }
  const cached = searchHaystackCache.get(item);
  if (cached) return cached;
  const haystack = buildSearchHaystack(item);
  searchHaystackCache.set(item, haystack);
  return haystack;
}
function passesFilters(it) {
  const query = normalizedQuery;
  const stateRaw = String(it?.fields?.["System.State"] || "");
  const norm = normalizeState2(stateRaw);
  if (query) {
    const haystack = getSearchHaystack(it);
    if (!haystack.includes(query)) return false;
  }
  if (typeFilter && getWorkItemType(it) !== typeFilter) return false;
  if (stateFilter && stateFilter !== "all" && norm !== stateFilter) return false;
  return true;
}
function normalizeState2(raw) {
  if (!raw) return "new";
  const s = String(raw).toLowerCase().trim().replace(/\s+/g, "-");
  if (s === "new" || s === "to-do" || s === "todo" || s === "proposed") return "new";
  if (s === "approved") return "approved";
  if (s === "committed") return "committed";
  if (s === "active") return "active";
  if (s === "in-progress" || s === "inprogress" || s === "doing") return "inprogress";
  if (s === "review" || s === "code-review" || s === "testing") return "review";
  if (s === "resolved") return "resolved";
  if (s === "done") return "done";
  if (s === "closed" || s === "completed") return "closed";
  if (s === "removed") return "removed";
  return "new";
}
function recomputeTypeOptions() {
  const combined = /* @__PURE__ */ new Set();
  (Array.isArray(lastWorkItems) ? lastWorkItems : []).forEach((item) => {
    const typeName = getWorkItemType(item);
    if (typeName) combined.add(typeName);
  });
  typeOptionHints.forEach((hint) => combined.add(hint));
  typeOptions = Array.from(combined).sort((a, b) => a.localeCompare(b));
  if (typeFilter && !combined.has(typeFilter)) {
    typeFilter = "";
  }
}
function recomputeItemsForView() {
  const items = Array.isArray(lastWorkItems) ? lastWorkItems : [];
  try {
    console.log(
      "[svelte-main] recomputeItemsForView: lastWorkItems.length=",
      items.length,
      "filterText=",
      filterText,
      "typeFilter=",
      typeFilter,
      "stateFilter=",
      stateFilter
    );
  } catch (err) {
    void err;
  }
  recomputeTypeOptions();
  normalizedQuery = String(filterText || "").trim().toLowerCase();
  const filtered = items.filter(passesFilters);
  const sorted = [...filtered].sort((a, b) => {
    switch (sortKey) {
      case "id-asc":
        return Number(a.id) - Number(b.id);
      case "id-desc":
        return Number(b.id) - Number(a.id);
      case "title-asc": {
        const at = String(a.fields?.["System.Title"] || "").toLowerCase();
        const bt = String(b.fields?.["System.Title"] || "").toLowerCase();
        return at.localeCompare(bt);
      }
      case "updated-desc":
      default: {
        const ad = Date.parse(
          a.fields?.["System.ChangedDate"] || a.fields?.["System.UpdatedDate"] || ""
        );
        const bd = Date.parse(
          b.fields?.["System.ChangedDate"] || b.fields?.["System.UpdatedDate"] || ""
        );
        return (isNaN(bd) ? 0 : bd) - (isNaN(ad) ? 0 : ad);
      }
    }
  });
  itemsForView = sorted;
  workItemCount = itemsForView.length;
  const allStatesSet = /* @__PURE__ */ new Set();
  (Array.isArray(lastWorkItems) ? lastWorkItems : []).forEach((w) => {
    const norm = normalizeState2(w?.fields?.["System.State"]);
    allStatesSet.add(norm);
  });
  const order = [
    "new",
    "approved",
    "committed",
    "active",
    "inprogress",
    "review",
    "resolved",
    "done",
    "closed",
    "removed"
  ];
  stateOptions = order.filter((s) => allStatesSet.has(s));
}
function formatElapsedHHMM(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor(s % 3600 / 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}
function onMessage(message) {
  switch (message?.type) {
    case "workItemsLoaded": {
      const items = Array.isArray(message.workItems) ? message.workItems : [];
      try {
        console.log("[svelte-main] workItemsLoaded received. count=", (items || []).length);
        console.log(
          "[svelte-main] workItemsLoaded sample ids=",
          (items || []).slice(0, 5).map((i) => i.id || i.fields?.["System.Id"])
        );
        console.log(
          "[svelte-main] current filters before apply: filterText=",
          filterText,
          "typeFilter=",
          typeFilter,
          "stateFilter=",
          stateFilter
        );
        if (!items || items && items.length === 0) {
          try {
            console.warn("[svelte-main] workItemsLoaded arrived with 0 items \u2014 full message:");
            console.warn(message);
            console.warn("[svelte-main] connectionId on message =", message?.connectionId);
            console.warn(
              "[svelte-main] local persisted state: typeFilter=",
              typeFilter,
              "filterText=",
              filterText,
              "stateFilter=",
              stateFilter
            );
            console.warn("[svelte-main] timestamp (ms)=", Date.now());
          } catch (err) {
            void err;
          }
        }
      } catch (err) {
        void err;
      }
      searchHaystackCache = /* @__PURE__ */ new WeakMap();
      lastWorkItems = items;
      if (typeof message.kanbanView === "boolean") {
        kanbanView = message.kanbanView;
      }
      recomputeItemsForView();
      workItemCount = itemsForView.length;
      loading = false;
      errorMsg = "";
      if (activeId) {
        const match = findWorkItemById(activeId);
        if (match) {
          activeTitle = String(match.fields?.["System.Title"] || `#${activeId}`);
        }
      }
      if (summaryWorkItemId) {
        updateSummaryTargetTitle();
        if (!summaryDraft || !summaryDraft.trim()) {
          const persisted = loadDraftForWorkItem(summaryWorkItemId);
          if (persisted !== null) summaryDraft = persisted;
        }
      }
      syncApp();
      break;
    }
    case "workItemsError": {
      loading = false;
      errorMsg = String(message?.error || "Failed to load work items.");
      syncApp();
      break;
    }
    case "timerUpdate": {
      const snap = message?.timer;
      const hasTimer = snap && typeof snap.workItemId !== "undefined";
      timerActive = !!hasTimer;
      timerRunning = !!hasTimer && !snap.isPaused;
      elapsedSeconds = hasTimer ? Number(snap?.elapsedSeconds || 0) : 0;
      timerElapsedLabel = hasTimer ? formatElapsedHHMM(elapsedSeconds) : "";
      if (hasTimer) {
        const newActiveId = Number(snap.workItemId) || 0;
        activeId = newActiveId;
        activeTitle = snap.workItemTitle || getWorkItemTitle(activeId) || (activeId ? `#${activeId}` : "");
        const targetChanged = summaryWorkItemId !== activeId;
        setSummaryTarget(activeId, { ensureOpen: true, refreshDraft: targetChanged });
        if (!summaryDraft || !summaryDraft.trim()) {
          const persisted = loadDraftForWorkItem(activeId);
          if (persisted && persisted.length > 0) {
            summaryDraft = persisted;
          } else {
            const seconds = Number(snap.elapsedSeconds || 0);
            const hours = Math.max(0, seconds / 3600);
            const fallbackTitle = activeTitle || `#${activeId}`;
            summaryDraft = `Worked approximately ${hours.toFixed(
              2
            )} hours on ${fallbackTitle}. Provide a short summary of what you accomplished.`;
          }
        }
      } else {
        activeId = 0;
        activeTitle = "";
        timerRunning = false;
        elapsedSeconds = 0;
        timerElapsedLabel = "";
      }
      syncApp();
      break;
    }
    case "moveWorkItemResult": {
      const id = Number(message.id);
      if (!id || !pendingMoves.has(id)) break;
      const pending = pendingMoves.get(id);
      pendingMoves.delete(id);
      if (!message.success) {
        const found = (lastWorkItems || []).find((w) => Number(w.id) === id);
        if (found && found.fields && pending) {
          found.fields["System.State"] = pending.prevState;
          searchHaystackCache.delete(found);
          recomputeItemsForView();
        }
        syncApp();
        addToast(`Move failed: ${message.error || "Unknown error"}`, { type: "error" });
      } else if (message.newState) {
        const found = (lastWorkItems || []).find((w) => Number(w.id) === id);
        if (found && found.fields) {
          found.fields["System.State"] = message.newState;
          searchHaystackCache.delete(found);
          recomputeItemsForView();
        }
        syncApp();
        if (pending && pending.prevState !== message.newState) {
          addToast(`Moved #${id} \u2192 ${message.newState}`, { type: "success", timeout: 2500 });
        }
      }
      break;
    }
    case "toggleKanbanView": {
      kanbanView = !kanbanView;
      persistViewState();
      syncApp();
      break;
    }
    case "workItemTypeOptions": {
      const list = Array.isArray(message?.types) ? message.types : [];
      let changed = false;
      for (const entry of list) {
        const value = typeof entry === "string" ? entry.trim() : "";
        if (!value) continue;
        if (!typeOptionHints.has(value)) {
          typeOptionHints.add(value);
          changed = true;
        }
      }
      if (changed) {
        recomputeItemsForView();
        syncApp();
      }
      break;
    }
    case "uiPreferences": {
      const prefs = message?.preferences || {};
      if (typeof prefs.kanbanView === "boolean") kanbanView = prefs.kanbanView;
      if (typeof prefs.filterText === "string") filterText = prefs.filterText;
      if (typeof prefs.typeFilter === "string") typeFilter = prefs.typeFilter;
      if (typeof prefs.stateFilter === "string") stateFilter = prefs.stateFilter;
      if (typeof prefs.sortKey === "string") sortKey = prefs.sortKey;
      recomputeItemsForView();
      syncApp();
      break;
    }
    case "copilotPromptCopied": {
      const provider = message?.provider === "openai" ? "openai" : "builtin";
      summaryProvider = provider;
      const workItemId = Number(message.workItemId || 0);
      if (workItemId) {
        setSummaryTarget(workItemId, { ensureOpen: true, refreshDraft: false });
      }
      if (provider === "openai" && typeof message.summary === "string" && message.summary.trim()) {
        summaryDraft = message.summary.trim();
        if (summaryWorkItemId) saveDraftForWorkItem(summaryWorkItemId, summaryDraft);
      } else if (provider === "builtin" && typeof message.prompt === "string" && message.prompt.trim() && (!summaryDraft || !summaryDraft.trim())) {
        summaryDraft = message.prompt;
      }
      setSummaryBusy(false);
      setSummaryStatus(
        provider === "openai" ? "OpenAI summary copied to clipboard." : "Copilot prompt copied to clipboard. Paste into Copilot chat to generate a summary.",
        { timeout: 3500 }
      );
      summaryOpen = true;
      syncApp();
      break;
    }
    case "stopAndApplyResult": {
      const id = Number(message.workItemId);
      const hours = Number(message.hours || 0);
      setSummaryBusy(false);
      if (Number.isFinite(id) && id > 0) {
        setSummaryTarget(id, { ensureOpen: true, refreshDraft: false });
      }
      summaryDraft = "";
      if (Number.isFinite(id) && id > 0) {
        removeDraftForWorkItem(id);
      }
      setSummaryStatus(`Applied ${hours.toFixed(2)} hours to work item #${id}.`, { timeout: 4e3 });
      syncApp();
      break;
    }
    case "selfTestPing": {
      postMessage({ type: "selfTestPong", nonce: message.nonce, signature: "svelte-entry" });
      break;
    }
    default:
      break;
  }
}
function boot() {
  window.addEventListener("message", (ev) => onMessage(ev.data));
  loading = true;
  errorMsg = "";
  postMessage({ type: "webviewReady" });
  postMessage({ type: "getWorkItems" });
  ensureApp();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => boot());
} else {
  boot();
}
//# sourceMappingURL=svelte-main.js.map
