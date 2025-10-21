var __defProp = Object.defineProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key2, value) => key2 in obj ? __defProp(obj, key2, { enumerable: true, configurable: true, writable: true, value }) : obj[key2] = value;
var __publicField = (obj, key2, value) => __defNormalProp(obj, typeof key2 !== "symbol" ? key2 + "" : key2, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

// node_modules/svelte/src/version.js
var PUBLIC_VERSION = "5";

// node_modules/svelte/src/internal/disclose-version.js
var _a;
if (typeof window !== "undefined") {
  ((_a = window.__svelte ?? (window.__svelte = {})).v ?? (_a.v = /* @__PURE__ */ new Set())).add(PUBLIC_VERSION);
}

// node_modules/svelte/src/internal/flags/index.js
var async_mode_flag = false;
var legacy_mode_flag = false;
var tracing_mode_flag = false;
function enable_legacy_mode_flag() {
  legacy_mode_flag = true;
}

// node_modules/svelte/src/internal/flags/legacy.js
enable_legacy_mode_flag();

// node_modules/svelte/src/constants.js
var EACH_ITEM_REACTIVE = 1;
var EACH_INDEX_REACTIVE = 1 << 1;
var EACH_IS_CONTROLLED = 1 << 2;
var EACH_IS_ANIMATED = 1 << 3;
var EACH_ITEM_IMMUTABLE = 1 << 4;
var PROPS_IS_IMMUTABLE = 1;
var PROPS_IS_RUNES = 1 << 1;
var PROPS_IS_UPDATED = 1 << 2;
var PROPS_IS_BINDABLE = 1 << 3;
var PROPS_IS_LAZY_INITIAL = 1 << 4;
var TRANSITION_OUT = 1 << 1;
var TRANSITION_GLOBAL = 1 << 2;
var TEMPLATE_FRAGMENT = 1;
var TEMPLATE_USE_IMPORT_NODE = 1 << 1;
var TEMPLATE_USE_SVG = 1 << 2;
var TEMPLATE_USE_MATHML = 1 << 3;
var HYDRATION_START = "[";
var HYDRATION_START_ELSE = "[!";
var HYDRATION_END = "]";
var HYDRATION_ERROR = {};
var ELEMENT_PRESERVE_ATTRIBUTE_CASE = 1 << 1;
var ELEMENT_IS_INPUT = 1 << 2;
var UNINITIALIZED = Symbol();
var FILENAME = Symbol("filename");
var HMR = Symbol("hmr");
var NAMESPACE_HTML = "http://www.w3.org/1999/xhtml";

// node_modules/esm-env/dev-fallback.js
var node_env = globalThis.process?.env?.NODE_ENV;
var dev_fallback_default = node_env && !node_env.toLowerCase().startsWith("prod");

// node_modules/svelte/src/internal/shared/utils.js
var is_array = Array.isArray;
var index_of = Array.prototype.indexOf;
var array_from = Array.from;
var object_keys = Object.keys;
var define_property = Object.defineProperty;
var get_descriptor = Object.getOwnPropertyDescriptor;
var get_descriptors = Object.getOwnPropertyDescriptors;
var object_prototype = Object.prototype;
var array_prototype = Array.prototype;
var get_prototype_of = Object.getPrototypeOf;
var is_extensible = Object.isExtensible;
var noop = () => {
};
function run(fn) {
  return fn();
}
function run_all(arr) {
  for (var i = 0; i < arr.length; i++) {
    arr[i]();
  }
}
function deferred() {
  var resolve;
  var reject;
  var promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// node_modules/svelte/src/internal/client/constants.js
var DERIVED = 1 << 1;
var EFFECT = 1 << 2;
var RENDER_EFFECT = 1 << 3;
var BLOCK_EFFECT = 1 << 4;
var BRANCH_EFFECT = 1 << 5;
var ROOT_EFFECT = 1 << 6;
var BOUNDARY_EFFECT = 1 << 7;
var UNOWNED = 1 << 8;
var DISCONNECTED = 1 << 9;
var CLEAN = 1 << 10;
var DIRTY = 1 << 11;
var MAYBE_DIRTY = 1 << 12;
var INERT = 1 << 13;
var DESTROYED = 1 << 14;
var EFFECT_RAN = 1 << 15;
var EFFECT_TRANSPARENT = 1 << 16;
var INSPECT_EFFECT = 1 << 17;
var HEAD_EFFECT = 1 << 18;
var EFFECT_PRESERVED = 1 << 19;
var USER_EFFECT = 1 << 20;
var REACTION_IS_UPDATING = 1 << 21;
var ASYNC = 1 << 22;
var ERROR_VALUE = 1 << 23;
var STATE_SYMBOL = Symbol("$state");
var LEGACY_PROPS = Symbol("legacy props");
var LOADING_ATTR_SYMBOL = Symbol("");
var PROXY_PATH_SYMBOL = Symbol("proxy path");
var STALE_REACTION = new class StaleReactionError extends Error {
  constructor() {
    super(...arguments);
    __publicField(this, "name", "StaleReactionError");
    __publicField(this, "message", "The reaction that called `getAbortSignal()` was re-run or destroyed");
  }
}();
var TEXT_NODE = 3;
var COMMENT_NODE = 8;

// node_modules/svelte/src/internal/shared/errors.js
function lifecycle_outside_component(name) {
  if (dev_fallback_default) {
    const error = new Error(`lifecycle_outside_component
\`${name}(...)\` can only be used during component initialisation
https://svelte.dev/e/lifecycle_outside_component`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/lifecycle_outside_component`);
  }
}

// node_modules/svelte/src/internal/client/errors.js
function async_derived_orphan() {
  if (dev_fallback_default) {
    const error = new Error(`async_derived_orphan
Cannot create a \`$derived(...)\` with an \`await\` expression outside of an effect tree
https://svelte.dev/e/async_derived_orphan`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/async_derived_orphan`);
  }
}
function derived_references_self() {
  if (dev_fallback_default) {
    const error = new Error(`derived_references_self
A derived value cannot reference itself recursively
https://svelte.dev/e/derived_references_self`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/derived_references_self`);
  }
}
function effect_in_teardown(rune) {
  if (dev_fallback_default) {
    const error = new Error(`effect_in_teardown
\`${rune}\` cannot be used inside an effect cleanup function
https://svelte.dev/e/effect_in_teardown`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/effect_in_teardown`);
  }
}
function effect_in_unowned_derived() {
  if (dev_fallback_default) {
    const error = new Error(`effect_in_unowned_derived
Effect cannot be created inside a \`$derived\` value that was not itself created inside an effect
https://svelte.dev/e/effect_in_unowned_derived`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/effect_in_unowned_derived`);
  }
}
function effect_orphan(rune) {
  if (dev_fallback_default) {
    const error = new Error(`effect_orphan
\`${rune}\` can only be used inside an effect (e.g. during component initialisation)
https://svelte.dev/e/effect_orphan`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/effect_orphan`);
  }
}
function effect_update_depth_exceeded() {
  if (dev_fallback_default) {
    const error = new Error(`effect_update_depth_exceeded
Maximum update depth exceeded. This typically indicates that an effect reads and writes the same piece of state
https://svelte.dev/e/effect_update_depth_exceeded`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/effect_update_depth_exceeded`);
  }
}
function flush_sync_in_effect() {
  if (dev_fallback_default) {
    const error = new Error(`flush_sync_in_effect
Cannot use \`flushSync\` inside an effect
https://svelte.dev/e/flush_sync_in_effect`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/flush_sync_in_effect`);
  }
}
function hydration_failed() {
  if (dev_fallback_default) {
    const error = new Error(`hydration_failed
Failed to hydrate the application
https://svelte.dev/e/hydration_failed`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/hydration_failed`);
  }
}
function props_invalid_value(key2) {
  if (dev_fallback_default) {
    const error = new Error(`props_invalid_value
Cannot do \`bind:${key2}={undefined}\` when \`${key2}\` has a fallback value
https://svelte.dev/e/props_invalid_value`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/props_invalid_value`);
  }
}
function rune_outside_svelte(rune) {
  if (dev_fallback_default) {
    const error = new Error(`rune_outside_svelte
The \`${rune}\` rune is only available inside \`.svelte\` and \`.svelte.js/ts\` files
https://svelte.dev/e/rune_outside_svelte`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/rune_outside_svelte`);
  }
}
function state_descriptors_fixed() {
  if (dev_fallback_default) {
    const error = new Error(`state_descriptors_fixed
Property descriptors defined on \`$state\` objects must contain \`value\` and always be \`enumerable\`, \`configurable\` and \`writable\`.
https://svelte.dev/e/state_descriptors_fixed`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/state_descriptors_fixed`);
  }
}
function state_prototype_fixed() {
  if (dev_fallback_default) {
    const error = new Error(`state_prototype_fixed
Cannot set prototype of \`$state\` object
https://svelte.dev/e/state_prototype_fixed`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/state_prototype_fixed`);
  }
}
function state_unsafe_mutation() {
  if (dev_fallback_default) {
    const error = new Error(`state_unsafe_mutation
Updating state inside \`$derived(...)\`, \`$inspect(...)\` or a template expression is forbidden. If the value should not be reactive, declare it without \`$state\`
https://svelte.dev/e/state_unsafe_mutation`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/state_unsafe_mutation`);
  }
}
function svelte_boundary_reset_onerror() {
  if (dev_fallback_default) {
    const error = new Error(`svelte_boundary_reset_onerror
A \`<svelte:boundary>\` \`reset\` function cannot be called while an error is still being handled
https://svelte.dev/e/svelte_boundary_reset_onerror`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/svelte_boundary_reset_onerror`);
  }
}

// node_modules/svelte/src/internal/client/warnings.js
var bold = "font-weight: bold";
var normal = "font-weight: normal";
function await_reactivity_loss(name) {
  if (dev_fallback_default) {
    console.warn(`%c[svelte] await_reactivity_loss
%cDetected reactivity loss when reading \`${name}\`. This happens when state is read in an async function after an earlier \`await\`
https://svelte.dev/e/await_reactivity_loss`, bold, normal);
  } else {
    console.warn(`https://svelte.dev/e/await_reactivity_loss`);
  }
}
function await_waterfall(name, location) {
  if (dev_fallback_default) {
    console.warn(`%c[svelte] await_waterfall
%cAn async derived, \`${name}\` (${location}) was not read immediately after it resolved. This often indicates an unnecessary waterfall, which can slow down your app
https://svelte.dev/e/await_waterfall`, bold, normal);
  } else {
    console.warn(`https://svelte.dev/e/await_waterfall`);
  }
}
function hydration_attribute_changed(attribute, html2, value) {
  if (dev_fallback_default) {
    console.warn(`%c[svelte] hydration_attribute_changed
%cThe \`${attribute}\` attribute on \`${html2}\` changed its value between server and client renders. The client value, \`${value}\`, will be ignored in favour of the server value
https://svelte.dev/e/hydration_attribute_changed`, bold, normal);
  } else {
    console.warn(`https://svelte.dev/e/hydration_attribute_changed`);
  }
}
function hydration_mismatch(location) {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] hydration_mismatch
%c${location ? `Hydration failed because the initial UI does not match what was rendered on the server. The error occurred near ${location}` : "Hydration failed because the initial UI does not match what was rendered on the server"}
https://svelte.dev/e/hydration_mismatch`,
      bold,
      normal
    );
  } else {
    console.warn(`https://svelte.dev/e/hydration_mismatch`);
  }
}
function lifecycle_double_unmount() {
  if (dev_fallback_default) {
    console.warn(`%c[svelte] lifecycle_double_unmount
%cTried to unmount a component that was not mounted
https://svelte.dev/e/lifecycle_double_unmount`, bold, normal);
  } else {
    console.warn(`https://svelte.dev/e/lifecycle_double_unmount`);
  }
}
function select_multiple_invalid_value() {
  if (dev_fallback_default) {
    console.warn(`%c[svelte] select_multiple_invalid_value
%cThe \`value\` property of a \`<select multiple>\` element should be an array, but it received a non-array value. The selection will be kept as is.
https://svelte.dev/e/select_multiple_invalid_value`, bold, normal);
  } else {
    console.warn(`https://svelte.dev/e/select_multiple_invalid_value`);
  }
}
function state_proxy_equality_mismatch(operator) {
  if (dev_fallback_default) {
    console.warn(`%c[svelte] state_proxy_equality_mismatch
%cReactive \`$state(...)\` proxies and the values they proxy have different identities. Because of this, comparisons with \`${operator}\` will produce unexpected results
https://svelte.dev/e/state_proxy_equality_mismatch`, bold, normal);
  } else {
    console.warn(`https://svelte.dev/e/state_proxy_equality_mismatch`);
  }
}
function state_proxy_unmount() {
  if (dev_fallback_default) {
    console.warn(`%c[svelte] state_proxy_unmount
%cTried to unmount a state proxy, rather than a component
https://svelte.dev/e/state_proxy_unmount`, bold, normal);
  } else {
    console.warn(`https://svelte.dev/e/state_proxy_unmount`);
  }
}
function svelte_boundary_reset_noop() {
  if (dev_fallback_default) {
    console.warn(`%c[svelte] svelte_boundary_reset_noop
%cA \`<svelte:boundary>\` \`reset\` function only resets the boundary the first time it is called
https://svelte.dev/e/svelte_boundary_reset_noop`, bold, normal);
  } else {
    console.warn(`https://svelte.dev/e/svelte_boundary_reset_noop`);
  }
}

// node_modules/svelte/src/internal/client/dom/hydration.js
var hydrating = false;
function set_hydrating(value) {
  hydrating = value;
}
var hydrate_node;
function set_hydrate_node(node) {
  if (node === null) {
    hydration_mismatch();
    throw HYDRATION_ERROR;
  }
  return hydrate_node = node;
}
function hydrate_next() {
  return set_hydrate_node(
    /** @type {TemplateNode} */
    get_next_sibling(hydrate_node)
  );
}
function reset(node) {
  if (!hydrating) return;
  if (get_next_sibling(hydrate_node) !== null) {
    hydration_mismatch();
    throw HYDRATION_ERROR;
  }
  hydrate_node = node;
}
function next(count = 1) {
  if (hydrating) {
    var i = count;
    var node = hydrate_node;
    while (i--) {
      node = /** @type {TemplateNode} */
      get_next_sibling(node);
    }
    hydrate_node = node;
  }
}
function skip_nodes(remove = true) {
  var depth = 0;
  var node = hydrate_node;
  while (true) {
    if (node.nodeType === COMMENT_NODE) {
      var data = (
        /** @type {Comment} */
        node.data
      );
      if (data === HYDRATION_END) {
        if (depth === 0) return node;
        depth -= 1;
      } else if (data === HYDRATION_START || data === HYDRATION_START_ELSE) {
        depth += 1;
      }
    }
    var next2 = (
      /** @type {TemplateNode} */
      get_next_sibling(node)
    );
    if (remove) node.remove();
    node = next2;
  }
}
function read_hydration_instruction(node) {
  if (!node || node.nodeType !== COMMENT_NODE) {
    hydration_mismatch();
    throw HYDRATION_ERROR;
  }
  return (
    /** @type {Comment} */
    node.data
  );
}

// node_modules/svelte/src/internal/client/reactivity/equality.js
function equals(value) {
  return value === this.v;
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || a !== null && typeof a === "object" || typeof a === "function";
}
function safe_equals(value) {
  return !safe_not_equal(value, this.v);
}

// node_modules/svelte/src/internal/client/dev/tracing.js
var tracing_expressions = null;
function get_stack(label) {
  let error = Error();
  const stack2 = error.stack;
  if (!stack2) return null;
  const lines = stack2.split("\n");
  const new_lines = ["\n"];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === "Error") {
      continue;
    }
    if (line.includes("validate_each_keys")) {
      return null;
    }
    if (line.includes("svelte/src/internal")) {
      continue;
    }
    new_lines.push(line);
  }
  if (new_lines.length === 1) {
    return null;
  }
  define_property(error, "stack", {
    value: new_lines.join("\n")
  });
  define_property(error, "name", {
    // 'Error' suffix is required for stack traces to be rendered properly
    value: `${label}Error`
  });
  return (
    /** @type {Error & { stack: string }} */
    error
  );
}
function tag(source2, label) {
  source2.label = label;
  tag_proxy(source2.v, label);
  return source2;
}
function tag_proxy(value, label) {
  value?.[PROXY_PATH_SYMBOL]?.(label);
  return value;
}

// node_modules/svelte/src/internal/client/context.js
var component_context = null;
function set_component_context(context) {
  component_context = context;
}
var dev_stack = null;
function set_dev_stack(stack2) {
  dev_stack = stack2;
}
var dev_current_component_function = null;
function set_dev_current_component_function(fn) {
  dev_current_component_function = fn;
}
function push(props, runes = false, fn) {
  component_context = {
    p: component_context,
    c: null,
    e: null,
    s: props,
    x: null,
    l: legacy_mode_flag && !runes ? { s: null, u: null, $: [] } : null
  };
  if (dev_fallback_default) {
    component_context.function = fn;
    dev_current_component_function = fn;
  }
}
function pop(component2) {
  var context = (
    /** @type {ComponentContext} */
    component_context
  );
  var effects = context.e;
  if (effects !== null) {
    context.e = null;
    for (var fn of effects) {
      create_user_effect(fn);
    }
  }
  if (component2 !== void 0) {
    context.x = component2;
  }
  component_context = context.p;
  if (dev_fallback_default) {
    dev_current_component_function = component_context?.function ?? null;
  }
  return component2 ?? /** @type {T} */
  {};
}
function is_runes() {
  return !legacy_mode_flag || component_context !== null && component_context.l === null;
}

// node_modules/svelte/src/internal/client/dom/task.js
var micro_tasks = [];
function run_micro_tasks() {
  var tasks = micro_tasks;
  micro_tasks = [];
  run_all(tasks);
}
function queue_micro_task(fn) {
  if (micro_tasks.length === 0 && !is_flushing_sync) {
    var tasks = micro_tasks;
    queueMicrotask(() => {
      if (tasks === micro_tasks) run_micro_tasks();
    });
  }
  micro_tasks.push(fn);
}
function flush_tasks() {
  while (micro_tasks.length > 0) {
    run_micro_tasks();
  }
}

// node_modules/svelte/src/internal/client/error-handling.js
var adjustments = /* @__PURE__ */ new WeakMap();
function handle_error(error) {
  var effect2 = active_effect;
  if (effect2 === null) {
    active_reaction.f |= ERROR_VALUE;
    return error;
  }
  if (dev_fallback_default && error instanceof Error && !adjustments.has(error)) {
    adjustments.set(error, get_adjustments(error, effect2));
  }
  if ((effect2.f & EFFECT_RAN) === 0) {
    if ((effect2.f & BOUNDARY_EFFECT) === 0) {
      if (!effect2.parent && error instanceof Error) {
        apply_adjustments(error);
      }
      throw error;
    }
    effect2.b.error(error);
  } else {
    invoke_error_boundary(error, effect2);
  }
}
function invoke_error_boundary(error, effect2) {
  while (effect2 !== null) {
    if ((effect2.f & BOUNDARY_EFFECT) !== 0) {
      try {
        effect2.b.error(error);
        return;
      } catch (e) {
        error = e;
      }
    }
    effect2 = effect2.parent;
  }
  if (error instanceof Error) {
    apply_adjustments(error);
  }
  throw error;
}
function get_adjustments(error, effect2) {
  const message_descriptor = get_descriptor(error, "message");
  if (message_descriptor && !message_descriptor.configurable) return;
  var indent = is_firefox ? "  " : "	";
  var component_stack = `
${indent}in ${effect2.fn?.name || "<unknown>"}`;
  var context = effect2.ctx;
  while (context !== null) {
    component_stack += `
${indent}in ${context.function?.[FILENAME].split("/").pop()}`;
    context = context.p;
  }
  return {
    message: error.message + `
${component_stack}
`,
    stack: error.stack?.split("\n").filter((line) => !line.includes("svelte/src/internal")).join("\n")
  };
}
function apply_adjustments(error) {
  const adjusted = adjustments.get(error);
  if (adjusted) {
    define_property(error, "message", {
      value: adjusted.message
    });
    define_property(error, "stack", {
      value: adjusted.stack
    });
  }
}

// node_modules/svelte/src/internal/client/reactivity/batch.js
var batches = /* @__PURE__ */ new Set();
var current_batch = null;
var previous_batch = null;
var batch_values = null;
var effect_pending_updates = /* @__PURE__ */ new Set();
var queued_root_effects = [];
var last_scheduled_effect = null;
var is_flushing = false;
var is_flushing_sync = false;
var _previous, _callbacks, _pending, _deferred, _boundary_async_effects, _render_effects, _effects, _block_effects, _dirty_effects, _maybe_dirty_effects, _Batch_instances, traverse_effect_tree_fn, defer_effects_fn, commit_fn;
var _Batch = class _Batch {
  constructor() {
    __privateAdd(this, _Batch_instances);
    /**
     * The current values of any sources that are updated in this batch
     * They keys of this map are identical to `this.#previous`
     * @type {Map<Source, any>}
     */
    __publicField(this, "current", /* @__PURE__ */ new Map());
    /**
     * The values of any sources that are updated in this batch _before_ those updates took place.
     * They keys of this map are identical to `this.#current`
     * @type {Map<Source, any>}
     */
    __privateAdd(this, _previous, /* @__PURE__ */ new Map());
    /**
     * When the batch is committed (and the DOM is updated), we need to remove old branches
     * and append new ones by calling the functions added inside (if/each/key/etc) blocks
     * @type {Set<() => void>}
     */
    __privateAdd(this, _callbacks, /* @__PURE__ */ new Set());
    /**
     * The number of async effects that are currently in flight
     */
    __privateAdd(this, _pending, 0);
    /**
     * A deferred that resolves when the batch is committed, used with `settled()`
     * TODO replace with Promise.withResolvers once supported widely enough
     * @type {{ promise: Promise<void>, resolve: (value?: any) => void, reject: (reason: unknown) => void } | null}
     */
    __privateAdd(this, _deferred, null);
    /**
     * Async effects inside a newly-created `<svelte:boundary>`
     * — these do not prevent the batch from committing
     * @type {Effect[]}
     */
    __privateAdd(this, _boundary_async_effects, []);
    /**
     * Template effects and `$effect.pre` effects, which run when
     * a batch is committed
     * @type {Effect[]}
     */
    __privateAdd(this, _render_effects, []);
    /**
     * The same as `#render_effects`, but for `$effect` (which runs after)
     * @type {Effect[]}
     */
    __privateAdd(this, _effects, []);
    /**
     * Block effects, which may need to re-run on subsequent flushes
     * in order to update internal sources (e.g. each block items)
     * @type {Effect[]}
     */
    __privateAdd(this, _block_effects, []);
    /**
     * Deferred effects (which run after async work has completed) that are DIRTY
     * @type {Effect[]}
     */
    __privateAdd(this, _dirty_effects, []);
    /**
     * Deferred effects that are MAYBE_DIRTY
     * @type {Effect[]}
     */
    __privateAdd(this, _maybe_dirty_effects, []);
    /**
     * A set of branches that still exist, but will be destroyed when this batch
     * is committed — we skip over these during `process`
     * @type {Set<Effect>}
     */
    __publicField(this, "skipped_effects", /* @__PURE__ */ new Set());
  }
  /**
   *
   * @param {Effect[]} root_effects
   */
  process(root_effects) {
    queued_root_effects = [];
    previous_batch = null;
    this.apply();
    for (const root3 of root_effects) {
      __privateMethod(this, _Batch_instances, traverse_effect_tree_fn).call(this, root3);
    }
    if (__privateGet(this, _pending) === 0) {
      var previous_batch_sources = batch_values;
      __privateMethod(this, _Batch_instances, commit_fn).call(this);
      var render_effects = __privateGet(this, _render_effects);
      var effects = __privateGet(this, _effects);
      __privateSet(this, _render_effects, []);
      __privateSet(this, _effects, []);
      __privateSet(this, _block_effects, []);
      previous_batch = this;
      current_batch = null;
      batch_values = previous_batch_sources;
      flush_queued_effects(render_effects);
      flush_queued_effects(effects);
      previous_batch = null;
      __privateGet(this, _deferred)?.resolve();
    } else {
      __privateMethod(this, _Batch_instances, defer_effects_fn).call(this, __privateGet(this, _render_effects));
      __privateMethod(this, _Batch_instances, defer_effects_fn).call(this, __privateGet(this, _effects));
      __privateMethod(this, _Batch_instances, defer_effects_fn).call(this, __privateGet(this, _block_effects));
    }
    batch_values = null;
    for (const effect2 of __privateGet(this, _boundary_async_effects)) {
      update_effect(effect2);
    }
    __privateSet(this, _boundary_async_effects, []);
  }
  /**
   * Associate a change to a given source with the current
   * batch, noting its previous and current values
   * @param {Source} source
   * @param {any} value
   */
  capture(source2, value) {
    if (!__privateGet(this, _previous).has(source2)) {
      __privateGet(this, _previous).set(source2, value);
    }
    this.current.set(source2, source2.v);
    batch_values?.set(source2, source2.v);
  }
  activate() {
    current_batch = this;
  }
  deactivate() {
    current_batch = null;
    batch_values = null;
  }
  flush() {
    if (queued_root_effects.length > 0) {
      this.activate();
      flush_effects();
      if (current_batch !== null && current_batch !== this) {
        return;
      }
    } else if (__privateGet(this, _pending) === 0) {
      __privateMethod(this, _Batch_instances, commit_fn).call(this);
    }
    this.deactivate();
    for (const update2 of effect_pending_updates) {
      effect_pending_updates.delete(update2);
      update2();
      if (current_batch !== null) {
        break;
      }
    }
  }
  increment() {
    __privateSet(this, _pending, __privateGet(this, _pending) + 1);
  }
  decrement() {
    __privateSet(this, _pending, __privateGet(this, _pending) - 1);
    for (const e of __privateGet(this, _dirty_effects)) {
      set_signal_status(e, DIRTY);
      schedule_effect(e);
    }
    for (const e of __privateGet(this, _maybe_dirty_effects)) {
      set_signal_status(e, MAYBE_DIRTY);
      schedule_effect(e);
    }
    this.flush();
  }
  /** @param {() => void} fn */
  add_callback(fn) {
    __privateGet(this, _callbacks).add(fn);
  }
  settled() {
    return (__privateGet(this, _deferred) ?? __privateSet(this, _deferred, deferred())).promise;
  }
  static ensure() {
    if (current_batch === null) {
      const batch = current_batch = new _Batch();
      batches.add(current_batch);
      if (!is_flushing_sync) {
        _Batch.enqueue(() => {
          if (current_batch !== batch) {
            return;
          }
          batch.flush();
        });
      }
    }
    return current_batch;
  }
  /** @param {() => void} task */
  static enqueue(task) {
    queue_micro_task(task);
  }
  apply() {
    if (!async_mode_flag || batches.size === 1) return;
    batch_values = new Map(this.current);
    for (const batch of batches) {
      if (batch === this) continue;
      for (const [source2, previous] of __privateGet(batch, _previous)) {
        if (!batch_values.has(source2)) {
          batch_values.set(source2, previous);
        }
      }
    }
  }
};
_previous = new WeakMap();
_callbacks = new WeakMap();
_pending = new WeakMap();
_deferred = new WeakMap();
_boundary_async_effects = new WeakMap();
_render_effects = new WeakMap();
_effects = new WeakMap();
_block_effects = new WeakMap();
_dirty_effects = new WeakMap();
_maybe_dirty_effects = new WeakMap();
_Batch_instances = new WeakSet();
/**
 * Traverse the effect tree, executing effects or stashing
 * them for later execution as appropriate
 * @param {Effect} root
 */
traverse_effect_tree_fn = function(root3) {
  root3.f ^= CLEAN;
  var effect2 = root3.first;
  while (effect2 !== null) {
    var flags2 = effect2.f;
    var is_branch = (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) !== 0;
    var is_skippable_branch = is_branch && (flags2 & CLEAN) !== 0;
    var skip = is_skippable_branch || (flags2 & INERT) !== 0 || this.skipped_effects.has(effect2);
    if (!skip && effect2.fn !== null) {
      if (is_branch) {
        effect2.f ^= CLEAN;
      } else if ((flags2 & EFFECT) !== 0) {
        __privateGet(this, _effects).push(effect2);
      } else if (async_mode_flag && (flags2 & RENDER_EFFECT) !== 0) {
        __privateGet(this, _render_effects).push(effect2);
      } else if ((flags2 & CLEAN) === 0) {
        if ((flags2 & ASYNC) !== 0 && effect2.b?.is_pending()) {
          __privateGet(this, _boundary_async_effects).push(effect2);
        } else if (is_dirty(effect2)) {
          if ((effect2.f & BLOCK_EFFECT) !== 0) __privateGet(this, _block_effects).push(effect2);
          update_effect(effect2);
        }
      }
      var child2 = effect2.first;
      if (child2 !== null) {
        effect2 = child2;
        continue;
      }
    }
    var parent = effect2.parent;
    effect2 = effect2.next;
    while (effect2 === null && parent !== null) {
      effect2 = parent.next;
      parent = parent.parent;
    }
  }
};
/**
 * @param {Effect[]} effects
 */
defer_effects_fn = function(effects) {
  for (const e of effects) {
    const target = (e.f & DIRTY) !== 0 ? __privateGet(this, _dirty_effects) : __privateGet(this, _maybe_dirty_effects);
    target.push(e);
    set_signal_status(e, CLEAN);
  }
  effects.length = 0;
};
/**
 * Append and remove branches to/from the DOM
 */
commit_fn = function() {
  var _a2;
  for (const fn of __privateGet(this, _callbacks)) {
    fn();
  }
  __privateGet(this, _callbacks).clear();
  if (batches.size > 1) {
    __privateGet(this, _previous).clear();
    let is_earlier = true;
    for (const batch of batches) {
      if (batch === this) {
        is_earlier = false;
        continue;
      }
      const sources = [];
      for (const [source2, value] of this.current) {
        if (batch.current.has(source2)) {
          if (is_earlier && value !== batch.current.get(source2)) {
            batch.current.set(source2, value);
          } else {
            continue;
          }
        }
        sources.push(source2);
      }
      if (sources.length === 0) {
        continue;
      }
      const others = [...batch.current.keys()].filter((s) => !this.current.has(s));
      if (others.length > 0) {
        for (const source2 of sources) {
          mark_effects(source2, others);
        }
        if (queued_root_effects.length > 0) {
          current_batch = batch;
          batch.apply();
          for (const root3 of queued_root_effects) {
            __privateMethod(_a2 = batch, _Batch_instances, traverse_effect_tree_fn).call(_a2, root3);
          }
          queued_root_effects = [];
          batch.deactivate();
        }
      }
    }
    current_batch = null;
  }
  batches.delete(this);
};
var Batch = _Batch;
function flushSync(fn) {
  if (async_mode_flag && active_effect !== null) {
    flush_sync_in_effect();
  }
  var was_flushing_sync = is_flushing_sync;
  is_flushing_sync = true;
  try {
    var result;
    if (fn) {
      if (current_batch !== null) {
        flush_effects();
      }
      result = fn();
    }
    while (true) {
      flush_tasks();
      if (queued_root_effects.length === 0) {
        current_batch?.flush();
        if (queued_root_effects.length === 0) {
          last_scheduled_effect = null;
          return (
            /** @type {T} */
            result
          );
        }
      }
      flush_effects();
    }
  } finally {
    is_flushing_sync = was_flushing_sync;
  }
}
function flush_effects() {
  var was_updating_effect = is_updating_effect;
  is_flushing = true;
  try {
    var flush_count = 0;
    set_is_updating_effect(true);
    while (queued_root_effects.length > 0) {
      var batch = Batch.ensure();
      if (flush_count++ > 1e3) {
        if (dev_fallback_default) {
          var updates = /* @__PURE__ */ new Map();
          for (const source2 of batch.current.keys()) {
            for (const [stack2, update2] of source2.updated ?? []) {
              var entry = updates.get(stack2);
              if (!entry) {
                entry = { error: update2.error, count: 0 };
                updates.set(stack2, entry);
              }
              entry.count += update2.count;
            }
          }
          for (const update2 of updates.values()) {
            console.error(update2.error);
          }
        }
        infinite_loop_guard();
      }
      batch.process(queued_root_effects);
      old_values.clear();
    }
  } finally {
    is_flushing = false;
    set_is_updating_effect(was_updating_effect);
    last_scheduled_effect = null;
  }
}
function infinite_loop_guard() {
  try {
    effect_update_depth_exceeded();
  } catch (error) {
    if (dev_fallback_default) {
      define_property(error, "stack", { value: "" });
    }
    invoke_error_boundary(error, last_scheduled_effect);
  }
}
var eager_block_effects = null;
function flush_queued_effects(effects) {
  var length = effects.length;
  if (length === 0) return;
  var i = 0;
  while (i < length) {
    var effect2 = effects[i++];
    if ((effect2.f & (DESTROYED | INERT)) === 0 && is_dirty(effect2)) {
      eager_block_effects = [];
      update_effect(effect2);
      if (effect2.deps === null && effect2.first === null && effect2.nodes_start === null) {
        if (effect2.teardown === null && effect2.ac === null) {
          unlink_effect(effect2);
        } else {
          effect2.fn = null;
        }
      }
      if (eager_block_effects?.length > 0) {
        old_values.clear();
        for (const e of eager_block_effects) {
          update_effect(e);
        }
        eager_block_effects = [];
      }
    }
  }
  eager_block_effects = null;
}
function mark_effects(value, sources) {
  if (value.reactions !== null) {
    for (const reaction of value.reactions) {
      const flags2 = reaction.f;
      if ((flags2 & DERIVED) !== 0) {
        mark_effects(
          /** @type {Derived} */
          reaction,
          sources
        );
      } else if ((flags2 & (ASYNC | BLOCK_EFFECT)) !== 0 && depends_on(reaction, sources)) {
        set_signal_status(reaction, DIRTY);
        schedule_effect(
          /** @type {Effect} */
          reaction
        );
      }
    }
  }
}
function depends_on(reaction, sources) {
  if (reaction.deps !== null) {
    for (const dep of reaction.deps) {
      if (sources.includes(dep)) {
        return true;
      }
      if ((dep.f & DERIVED) !== 0 && depends_on(
        /** @type {Derived} */
        dep,
        sources
      )) {
        return true;
      }
    }
  }
  return false;
}
function schedule_effect(signal) {
  var effect2 = last_scheduled_effect = signal;
  while (effect2.parent !== null) {
    effect2 = effect2.parent;
    var flags2 = effect2.f;
    if (is_flushing && effect2 === active_effect && (flags2 & BLOCK_EFFECT) !== 0) {
      return;
    }
    if ((flags2 & (ROOT_EFFECT | BRANCH_EFFECT)) !== 0) {
      if ((flags2 & CLEAN) === 0) return;
      effect2.f ^= CLEAN;
    }
  }
  queued_root_effects.push(effect2);
}

// node_modules/svelte/src/reactivity/create-subscriber.js
function createSubscriber(start) {
  let subscribers = 0;
  let version = source(0);
  let stop;
  if (dev_fallback_default) {
    tag(version, "createSubscriber version");
  }
  return () => {
    if (effect_tracking()) {
      get(version);
      render_effect(() => {
        if (subscribers === 0) {
          stop = untrack(() => start(() => increment(version)));
        }
        subscribers += 1;
        return () => {
          queue_micro_task(() => {
            subscribers -= 1;
            if (subscribers === 0) {
              stop?.();
              stop = void 0;
              increment(version);
            }
          });
        };
      });
    }
  };
}

// node_modules/svelte/src/internal/client/dom/blocks/boundary.js
var flags = EFFECT_TRANSPARENT | EFFECT_PRESERVED | BOUNDARY_EFFECT;
function boundary(node, props, children) {
  new Boundary(node, props, children);
}
var _pending2, _anchor, _hydrate_open, _props, _children, _effect, _main_effect, _pending_effect, _failed_effect, _offscreen_fragment, _local_pending_count, _pending_count, _is_creating_fallback, _effect_pending, _effect_pending_update, _effect_pending_subscriber, _Boundary_instances, hydrate_resolved_content_fn, hydrate_pending_content_fn, run_fn, show_pending_snippet_fn, update_pending_count_fn;
var Boundary = class {
  /**
   * @param {TemplateNode} node
   * @param {BoundaryProps} props
   * @param {((anchor: Node) => void)} children
   */
  constructor(node, props, children) {
    __privateAdd(this, _Boundary_instances);
    /** @type {Boundary | null} */
    __publicField(this, "parent");
    __privateAdd(this, _pending2, false);
    /** @type {TemplateNode} */
    __privateAdd(this, _anchor);
    /** @type {TemplateNode | null} */
    __privateAdd(this, _hydrate_open, hydrating ? hydrate_node : null);
    /** @type {BoundaryProps} */
    __privateAdd(this, _props);
    /** @type {((anchor: Node) => void)} */
    __privateAdd(this, _children);
    /** @type {Effect} */
    __privateAdd(this, _effect);
    /** @type {Effect | null} */
    __privateAdd(this, _main_effect, null);
    /** @type {Effect | null} */
    __privateAdd(this, _pending_effect, null);
    /** @type {Effect | null} */
    __privateAdd(this, _failed_effect, null);
    /** @type {DocumentFragment | null} */
    __privateAdd(this, _offscreen_fragment, null);
    __privateAdd(this, _local_pending_count, 0);
    __privateAdd(this, _pending_count, 0);
    __privateAdd(this, _is_creating_fallback, false);
    /**
     * A source containing the number of pending async deriveds/expressions.
     * Only created if `$effect.pending()` is used inside the boundary,
     * otherwise updating the source results in needless `Batch.ensure()`
     * calls followed by no-op flushes
     * @type {Source<number> | null}
     */
    __privateAdd(this, _effect_pending, null);
    __privateAdd(this, _effect_pending_update, () => {
      if (__privateGet(this, _effect_pending)) {
        internal_set(__privateGet(this, _effect_pending), __privateGet(this, _local_pending_count));
      }
    });
    __privateAdd(this, _effect_pending_subscriber, createSubscriber(() => {
      __privateSet(this, _effect_pending, source(__privateGet(this, _local_pending_count)));
      if (dev_fallback_default) {
        tag(__privateGet(this, _effect_pending), "$effect.pending()");
      }
      return () => {
        __privateSet(this, _effect_pending, null);
      };
    }));
    __privateSet(this, _anchor, node);
    __privateSet(this, _props, props);
    __privateSet(this, _children, children);
    this.parent = /** @type {Effect} */
    active_effect.b;
    __privateSet(this, _pending2, !!__privateGet(this, _props).pending);
    __privateSet(this, _effect, block(() => {
      active_effect.b = this;
      if (hydrating) {
        const comment2 = __privateGet(this, _hydrate_open);
        hydrate_next();
        const server_rendered_pending = (
          /** @type {Comment} */
          comment2.nodeType === COMMENT_NODE && /** @type {Comment} */
          comment2.data === HYDRATION_START_ELSE
        );
        if (server_rendered_pending) {
          __privateMethod(this, _Boundary_instances, hydrate_pending_content_fn).call(this);
        } else {
          __privateMethod(this, _Boundary_instances, hydrate_resolved_content_fn).call(this);
        }
      } else {
        try {
          __privateSet(this, _main_effect, branch(() => children(__privateGet(this, _anchor))));
        } catch (error) {
          this.error(error);
        }
        if (__privateGet(this, _pending_count) > 0) {
          __privateMethod(this, _Boundary_instances, show_pending_snippet_fn).call(this);
        } else {
          __privateSet(this, _pending2, false);
        }
      }
    }, flags));
    if (hydrating) {
      __privateSet(this, _anchor, hydrate_node);
    }
  }
  /**
   * Returns `true` if the effect exists inside a boundary whose pending snippet is shown
   * @returns {boolean}
   */
  is_pending() {
    return __privateGet(this, _pending2) || !!this.parent && this.parent.is_pending();
  }
  has_pending_snippet() {
    return !!__privateGet(this, _props).pending;
  }
  /**
   * Update the source that powers `$effect.pending()` inside this boundary,
   * and controls when the current `pending` snippet (if any) is removed.
   * Do not call from inside the class
   * @param {1 | -1} d
   */
  update_pending_count(d) {
    __privateMethod(this, _Boundary_instances, update_pending_count_fn).call(this, d);
    __privateSet(this, _local_pending_count, __privateGet(this, _local_pending_count) + d);
    effect_pending_updates.add(__privateGet(this, _effect_pending_update));
  }
  get_effect_pending() {
    __privateGet(this, _effect_pending_subscriber).call(this);
    return get(
      /** @type {Source<number>} */
      __privateGet(this, _effect_pending)
    );
  }
  /** @param {unknown} error */
  error(error) {
    var onerror = __privateGet(this, _props).onerror;
    let failed = __privateGet(this, _props).failed;
    if (__privateGet(this, _is_creating_fallback) || !onerror && !failed) {
      throw error;
    }
    if (__privateGet(this, _main_effect)) {
      destroy_effect(__privateGet(this, _main_effect));
      __privateSet(this, _main_effect, null);
    }
    if (__privateGet(this, _pending_effect)) {
      destroy_effect(__privateGet(this, _pending_effect));
      __privateSet(this, _pending_effect, null);
    }
    if (__privateGet(this, _failed_effect)) {
      destroy_effect(__privateGet(this, _failed_effect));
      __privateSet(this, _failed_effect, null);
    }
    if (hydrating) {
      set_hydrate_node(
        /** @type {TemplateNode} */
        __privateGet(this, _hydrate_open)
      );
      next();
      set_hydrate_node(skip_nodes());
    }
    var did_reset = false;
    var calling_on_error = false;
    const reset2 = () => {
      if (did_reset) {
        svelte_boundary_reset_noop();
        return;
      }
      did_reset = true;
      if (calling_on_error) {
        svelte_boundary_reset_onerror();
      }
      Batch.ensure();
      __privateSet(this, _local_pending_count, 0);
      if (__privateGet(this, _failed_effect) !== null) {
        pause_effect(__privateGet(this, _failed_effect), () => {
          __privateSet(this, _failed_effect, null);
        });
      }
      __privateSet(this, _pending2, this.has_pending_snippet());
      __privateSet(this, _main_effect, __privateMethod(this, _Boundary_instances, run_fn).call(this, () => {
        __privateSet(this, _is_creating_fallback, false);
        return branch(() => __privateGet(this, _children).call(this, __privateGet(this, _anchor)));
      }));
      if (__privateGet(this, _pending_count) > 0) {
        __privateMethod(this, _Boundary_instances, show_pending_snippet_fn).call(this);
      } else {
        __privateSet(this, _pending2, false);
      }
    };
    var previous_reaction = active_reaction;
    try {
      set_active_reaction(null);
      calling_on_error = true;
      onerror?.(error, reset2);
      calling_on_error = false;
    } catch (error2) {
      invoke_error_boundary(error2, __privateGet(this, _effect) && __privateGet(this, _effect).parent);
    } finally {
      set_active_reaction(previous_reaction);
    }
    if (failed) {
      queue_micro_task(() => {
        __privateSet(this, _failed_effect, __privateMethod(this, _Boundary_instances, run_fn).call(this, () => {
          __privateSet(this, _is_creating_fallback, true);
          try {
            return branch(() => {
              failed(
                __privateGet(this, _anchor),
                () => error,
                () => reset2
              );
            });
          } catch (error2) {
            invoke_error_boundary(
              error2,
              /** @type {Effect} */
              __privateGet(this, _effect).parent
            );
            return null;
          } finally {
            __privateSet(this, _is_creating_fallback, false);
          }
        }));
      });
    }
  }
};
_pending2 = new WeakMap();
_anchor = new WeakMap();
_hydrate_open = new WeakMap();
_props = new WeakMap();
_children = new WeakMap();
_effect = new WeakMap();
_main_effect = new WeakMap();
_pending_effect = new WeakMap();
_failed_effect = new WeakMap();
_offscreen_fragment = new WeakMap();
_local_pending_count = new WeakMap();
_pending_count = new WeakMap();
_is_creating_fallback = new WeakMap();
_effect_pending = new WeakMap();
_effect_pending_update = new WeakMap();
_effect_pending_subscriber = new WeakMap();
_Boundary_instances = new WeakSet();
hydrate_resolved_content_fn = function() {
  try {
    __privateSet(this, _main_effect, branch(() => __privateGet(this, _children).call(this, __privateGet(this, _anchor))));
  } catch (error) {
    this.error(error);
  }
  __privateSet(this, _pending2, false);
};
hydrate_pending_content_fn = function() {
  const pending2 = __privateGet(this, _props).pending;
  if (!pending2) {
    return;
  }
  __privateSet(this, _pending_effect, branch(() => pending2(__privateGet(this, _anchor))));
  Batch.enqueue(() => {
    __privateSet(this, _main_effect, __privateMethod(this, _Boundary_instances, run_fn).call(this, () => {
      Batch.ensure();
      return branch(() => __privateGet(this, _children).call(this, __privateGet(this, _anchor)));
    }));
    if (__privateGet(this, _pending_count) > 0) {
      __privateMethod(this, _Boundary_instances, show_pending_snippet_fn).call(this);
    } else {
      pause_effect(
        /** @type {Effect} */
        __privateGet(this, _pending_effect),
        () => {
          __privateSet(this, _pending_effect, null);
        }
      );
      __privateSet(this, _pending2, false);
    }
  });
};
/**
 * @param {() => Effect | null} fn
 */
run_fn = function(fn) {
  var previous_effect = active_effect;
  var previous_reaction = active_reaction;
  var previous_ctx = component_context;
  set_active_effect(__privateGet(this, _effect));
  set_active_reaction(__privateGet(this, _effect));
  set_component_context(__privateGet(this, _effect).ctx);
  try {
    return fn();
  } catch (e) {
    handle_error(e);
    return null;
  } finally {
    set_active_effect(previous_effect);
    set_active_reaction(previous_reaction);
    set_component_context(previous_ctx);
  }
};
show_pending_snippet_fn = function() {
  const pending2 = (
    /** @type {(anchor: Node) => void} */
    __privateGet(this, _props).pending
  );
  if (__privateGet(this, _main_effect) !== null) {
    __privateSet(this, _offscreen_fragment, document.createDocumentFragment());
    move_effect(__privateGet(this, _main_effect), __privateGet(this, _offscreen_fragment));
  }
  if (__privateGet(this, _pending_effect) === null) {
    __privateSet(this, _pending_effect, branch(() => pending2(__privateGet(this, _anchor))));
  }
};
/**
 * Updates the pending count associated with the currently visible pending snippet,
 * if any, such that we can replace the snippet with content once work is done
 * @param {1 | -1} d
 */
update_pending_count_fn = function(d) {
  var _a2;
  if (!this.has_pending_snippet()) {
    if (this.parent) {
      __privateMethod(_a2 = this.parent, _Boundary_instances, update_pending_count_fn).call(_a2, d);
    }
    return;
  }
  __privateSet(this, _pending_count, __privateGet(this, _pending_count) + d);
  if (__privateGet(this, _pending_count) === 0) {
    __privateSet(this, _pending2, false);
    if (__privateGet(this, _pending_effect)) {
      pause_effect(__privateGet(this, _pending_effect), () => {
        __privateSet(this, _pending_effect, null);
      });
    }
    if (__privateGet(this, _offscreen_fragment)) {
      __privateGet(this, _anchor).before(__privateGet(this, _offscreen_fragment));
      __privateSet(this, _offscreen_fragment, null);
    }
    queue_micro_task(() => {
      Batch.ensure().flush();
    });
  }
};
function move_effect(effect2, fragment) {
  var node = effect2.nodes_start;
  var end = effect2.nodes_end;
  while (node !== null) {
    var next2 = node === end ? null : (
      /** @type {TemplateNode} */
      get_next_sibling(node)
    );
    fragment.append(node);
    node = next2;
  }
}

// node_modules/svelte/src/internal/client/reactivity/async.js
function flatten(sync, async2, fn) {
  const d = is_runes() ? derived : derived_safe_equal;
  if (async2.length === 0) {
    fn(sync.map(d));
    return;
  }
  var batch = current_batch;
  var parent = (
    /** @type {Effect} */
    active_effect
  );
  var restore = capture();
  var was_hydrating = hydrating;
  Promise.all(async2.map((expression) => async_derived(expression))).then((result) => {
    restore();
    try {
      fn([...sync.map(d), ...result]);
    } catch (error) {
      if ((parent.f & DESTROYED) === 0) {
        invoke_error_boundary(error, parent);
      }
    }
    if (was_hydrating) {
      set_hydrating(false);
    }
    batch?.deactivate();
    unset_context();
  }).catch((error) => {
    invoke_error_boundary(error, parent);
  });
}
function capture() {
  var previous_effect = active_effect;
  var previous_reaction = active_reaction;
  var previous_component_context = component_context;
  var previous_batch2 = current_batch;
  var was_hydrating = hydrating;
  if (was_hydrating) {
    var previous_hydrate_node = hydrate_node;
  }
  return function restore() {
    set_active_effect(previous_effect);
    set_active_reaction(previous_reaction);
    set_component_context(previous_component_context);
    previous_batch2?.activate();
    if (was_hydrating) {
      set_hydrating(true);
      set_hydrate_node(previous_hydrate_node);
    }
    if (dev_fallback_default) {
      set_from_async_derived(null);
    }
  };
}
function unset_context() {
  set_active_effect(null);
  set_active_reaction(null);
  set_component_context(null);
  if (dev_fallback_default) set_from_async_derived(null);
}

// node_modules/svelte/src/internal/client/reactivity/deriveds.js
var current_async_effect = null;
function set_from_async_derived(v) {
  current_async_effect = v;
}
var recent_async_deriveds = /* @__PURE__ */ new Set();
// @__NO_SIDE_EFFECTS__
function derived(fn) {
  var flags2 = DERIVED | DIRTY;
  var parent_derived = active_reaction !== null && (active_reaction.f & DERIVED) !== 0 ? (
    /** @type {Derived} */
    active_reaction
  ) : null;
  if (active_effect === null || parent_derived !== null && (parent_derived.f & UNOWNED) !== 0) {
    flags2 |= UNOWNED;
  } else {
    active_effect.f |= EFFECT_PRESERVED;
  }
  const signal = {
    ctx: component_context,
    deps: null,
    effects: null,
    equals,
    f: flags2,
    fn,
    reactions: null,
    rv: 0,
    v: (
      /** @type {V} */
      UNINITIALIZED
    ),
    wv: 0,
    parent: parent_derived ?? active_effect,
    ac: null
  };
  if (dev_fallback_default && tracing_mode_flag) {
    signal.created = get_stack("CreatedAt");
  }
  return signal;
}
// @__NO_SIDE_EFFECTS__
function async_derived(fn, location) {
  let parent = (
    /** @type {Effect | null} */
    active_effect
  );
  if (parent === null) {
    async_derived_orphan();
  }
  var boundary2 = (
    /** @type {Boundary} */
    parent.b
  );
  var promise = (
    /** @type {Promise<V>} */
    /** @type {unknown} */
    void 0
  );
  var signal = source(
    /** @type {V} */
    UNINITIALIZED
  );
  var should_suspend = !active_reaction;
  var deferreds = /* @__PURE__ */ new Map();
  async_effect(() => {
    if (dev_fallback_default) current_async_effect = active_effect;
    var d = deferred();
    promise = d.promise;
    try {
      Promise.resolve(fn()).then(d.resolve, d.reject).then(unset_context);
    } catch (error) {
      d.reject(error);
      unset_context();
    }
    if (dev_fallback_default) current_async_effect = null;
    var batch = (
      /** @type {Batch} */
      current_batch
    );
    var pending2 = boundary2.is_pending();
    if (should_suspend) {
      boundary2.update_pending_count(1);
      if (!pending2) {
        batch.increment();
        deferreds.get(batch)?.reject(STALE_REACTION);
        deferreds.delete(batch);
        deferreds.set(batch, d);
      }
    }
    const handler = (value, error = void 0) => {
      current_async_effect = null;
      if (!pending2) batch.activate();
      if (error) {
        if (error !== STALE_REACTION) {
          signal.f |= ERROR_VALUE;
          internal_set(signal, error);
        }
      } else {
        if ((signal.f & ERROR_VALUE) !== 0) {
          signal.f ^= ERROR_VALUE;
        }
        internal_set(signal, value);
        for (const [b, d2] of deferreds) {
          deferreds.delete(b);
          if (b === batch) break;
          d2.reject(STALE_REACTION);
        }
        if (dev_fallback_default && location !== void 0) {
          recent_async_deriveds.add(signal);
          setTimeout(() => {
            if (recent_async_deriveds.has(signal)) {
              await_waterfall(
                /** @type {string} */
                signal.label,
                location
              );
              recent_async_deriveds.delete(signal);
            }
          });
        }
      }
      if (should_suspend) {
        boundary2.update_pending_count(-1);
        if (!pending2) batch.decrement();
      }
    };
    d.promise.then(handler, (e) => handler(null, e || "unknown"));
  });
  teardown(() => {
    for (const d of deferreds.values()) {
      d.reject(STALE_REACTION);
    }
  });
  if (dev_fallback_default) {
    signal.f |= ASYNC;
  }
  return new Promise((fulfil) => {
    function next2(p) {
      function go() {
        if (p === promise) {
          fulfil(signal);
        } else {
          next2(promise);
        }
      }
      p.then(go, go);
    }
    next2(promise);
  });
}
// @__NO_SIDE_EFFECTS__
function derived_safe_equal(fn) {
  const signal = /* @__PURE__ */ derived(fn);
  signal.equals = safe_equals;
  return signal;
}
function destroy_derived_effects(derived3) {
  var effects = derived3.effects;
  if (effects !== null) {
    derived3.effects = null;
    for (var i = 0; i < effects.length; i += 1) {
      destroy_effect(
        /** @type {Effect} */
        effects[i]
      );
    }
  }
}
var stack = [];
function get_derived_parent_effect(derived3) {
  var parent = derived3.parent;
  while (parent !== null) {
    if ((parent.f & DERIVED) === 0) {
      return (
        /** @type {Effect} */
        parent
      );
    }
    parent = parent.parent;
  }
  return null;
}
function execute_derived(derived3) {
  var value;
  var prev_active_effect = active_effect;
  set_active_effect(get_derived_parent_effect(derived3));
  if (dev_fallback_default) {
    let prev_inspect_effects = inspect_effects;
    set_inspect_effects(/* @__PURE__ */ new Set());
    try {
      if (stack.includes(derived3)) {
        derived_references_self();
      }
      stack.push(derived3);
      destroy_derived_effects(derived3);
      value = update_reaction(derived3);
    } finally {
      set_active_effect(prev_active_effect);
      set_inspect_effects(prev_inspect_effects);
      stack.pop();
    }
  } else {
    try {
      destroy_derived_effects(derived3);
      value = update_reaction(derived3);
    } finally {
      set_active_effect(prev_active_effect);
    }
  }
  return value;
}
function update_derived(derived3) {
  var value = execute_derived(derived3);
  if (!derived3.equals(value)) {
    derived3.v = value;
    derived3.wv = increment_write_version();
  }
  if (is_destroying_effect) {
    return;
  }
  if (batch_values !== null) {
    batch_values.set(derived3, derived3.v);
  } else {
    var status = (skip_reaction || (derived3.f & UNOWNED) !== 0) && derived3.deps !== null ? MAYBE_DIRTY : CLEAN;
    set_signal_status(derived3, status);
  }
}

// node_modules/svelte/src/internal/client/reactivity/sources.js
var inspect_effects = /* @__PURE__ */ new Set();
var old_values = /* @__PURE__ */ new Map();
function set_inspect_effects(v) {
  inspect_effects = v;
}
var inspect_effects_deferred = false;
function set_inspect_effects_deferred() {
  inspect_effects_deferred = true;
}
function source(v, stack2) {
  var signal = {
    f: 0,
    // TODO ideally we could skip this altogether, but it causes type errors
    v,
    reactions: null,
    equals,
    rv: 0,
    wv: 0
  };
  if (dev_fallback_default && tracing_mode_flag) {
    signal.created = stack2 ?? get_stack("CreatedAt");
    signal.updated = null;
    signal.set_during_effect = false;
    signal.trace = null;
  }
  return signal;
}
// @__NO_SIDE_EFFECTS__
function state(v, stack2) {
  const s = source(v, stack2);
  push_reaction_value(s);
  return s;
}
// @__NO_SIDE_EFFECTS__
function mutable_source(initial_value, immutable = false, trackable = true) {
  var _a2;
  const s = source(initial_value);
  if (!immutable) {
    s.equals = safe_equals;
  }
  if (legacy_mode_flag && trackable && component_context !== null && component_context.l !== null) {
    ((_a2 = component_context.l).s ?? (_a2.s = [])).push(s);
  }
  return s;
}
function set(source2, value, should_proxy = false) {
  if (active_reaction !== null && // since we are untracking the function inside `$inspect.with` we need to add this check
  // to ensure we error if state is set inside an inspect effect
  (!untracking || (active_reaction.f & INSPECT_EFFECT) !== 0) && is_runes() && (active_reaction.f & (DERIVED | BLOCK_EFFECT | ASYNC | INSPECT_EFFECT)) !== 0 && !current_sources?.includes(source2)) {
    state_unsafe_mutation();
  }
  let new_value = should_proxy ? proxy(value) : value;
  if (dev_fallback_default) {
    tag_proxy(
      new_value,
      /** @type {string} */
      source2.label
    );
  }
  return internal_set(source2, new_value);
}
function internal_set(source2, value) {
  if (!source2.equals(value)) {
    var old_value = source2.v;
    if (is_destroying_effect) {
      old_values.set(source2, value);
    } else {
      old_values.set(source2, old_value);
    }
    source2.v = value;
    var batch = Batch.ensure();
    batch.capture(source2, old_value);
    if (dev_fallback_default) {
      if (tracing_mode_flag || active_effect !== null) {
        const error = get_stack("UpdatedAt");
        if (error !== null) {
          source2.updated ?? (source2.updated = /* @__PURE__ */ new Map());
          let entry = source2.updated.get(error.stack);
          if (!entry) {
            entry = { error, count: 0 };
            source2.updated.set(error.stack, entry);
          }
          entry.count++;
        }
      }
      if (active_effect !== null) {
        source2.set_during_effect = true;
      }
    }
    if ((source2.f & DERIVED) !== 0) {
      if ((source2.f & DIRTY) !== 0) {
        execute_derived(
          /** @type {Derived} */
          source2
        );
      }
      set_signal_status(source2, (source2.f & UNOWNED) === 0 ? CLEAN : MAYBE_DIRTY);
    }
    source2.wv = increment_write_version();
    mark_reactions(source2, DIRTY);
    if (is_runes() && active_effect !== null && (active_effect.f & CLEAN) !== 0 && (active_effect.f & (BRANCH_EFFECT | ROOT_EFFECT)) === 0) {
      if (untracked_writes === null) {
        set_untracked_writes([source2]);
      } else {
        untracked_writes.push(source2);
      }
    }
    if (dev_fallback_default && inspect_effects.size > 0 && !inspect_effects_deferred) {
      flush_inspect_effects();
    }
  }
  return value;
}
function flush_inspect_effects() {
  inspect_effects_deferred = false;
  const inspects = Array.from(inspect_effects);
  for (const effect2 of inspects) {
    if ((effect2.f & CLEAN) !== 0) {
      set_signal_status(effect2, MAYBE_DIRTY);
    }
    if (is_dirty(effect2)) {
      update_effect(effect2);
    }
  }
  inspect_effects.clear();
}
function update(source2, d = 1) {
  var value = get(source2);
  var result = d === 1 ? value++ : value--;
  set(source2, value);
  return result;
}
function increment(source2) {
  set(source2, source2.v + 1);
}
function mark_reactions(signal, status) {
  var reactions = signal.reactions;
  if (reactions === null) return;
  var runes = is_runes();
  var length = reactions.length;
  for (var i = 0; i < length; i++) {
    var reaction = reactions[i];
    var flags2 = reaction.f;
    if (!runes && reaction === active_effect) continue;
    if (dev_fallback_default && (flags2 & INSPECT_EFFECT) !== 0) {
      inspect_effects.add(reaction);
      continue;
    }
    var not_dirty = (flags2 & DIRTY) === 0;
    if (not_dirty) {
      set_signal_status(reaction, status);
    }
    if ((flags2 & DERIVED) !== 0) {
      mark_reactions(
        /** @type {Derived} */
        reaction,
        MAYBE_DIRTY
      );
    } else if (not_dirty) {
      if ((flags2 & BLOCK_EFFECT) !== 0) {
        if (eager_block_effects !== null) {
          eager_block_effects.push(
            /** @type {Effect} */
            reaction
          );
        }
      }
      schedule_effect(
        /** @type {Effect} */
        reaction
      );
    }
  }
}

// node_modules/svelte/src/internal/client/proxy.js
var regex_is_valid_identifier = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
function proxy(value) {
  if (typeof value !== "object" || value === null || STATE_SYMBOL in value) {
    return value;
  }
  const prototype = get_prototype_of(value);
  if (prototype !== object_prototype && prototype !== array_prototype) {
    return value;
  }
  var sources = /* @__PURE__ */ new Map();
  var is_proxied_array = is_array(value);
  var version = state(0);
  var stack2 = dev_fallback_default && tracing_mode_flag ? get_stack("CreatedAt") : null;
  var parent_version = update_version;
  var with_parent = (fn) => {
    if (update_version === parent_version) {
      return fn();
    }
    var reaction = active_reaction;
    var version2 = update_version;
    set_active_reaction(null);
    set_update_version(parent_version);
    var result = fn();
    set_active_reaction(reaction);
    set_update_version(version2);
    return result;
  };
  if (is_proxied_array) {
    sources.set("length", state(
      /** @type {any[]} */
      value.length,
      stack2
    ));
    if (dev_fallback_default) {
      value = /** @type {any} */
      inspectable_array(
        /** @type {any[]} */
        value
      );
    }
  }
  var path = "";
  let updating = false;
  function update_path(new_path) {
    if (updating) return;
    updating = true;
    path = new_path;
    tag(version, `${path} version`);
    for (const [prop2, source2] of sources) {
      tag(source2, get_label(path, prop2));
    }
    updating = false;
  }
  return new Proxy(
    /** @type {any} */
    value,
    {
      defineProperty(_, prop2, descriptor) {
        if (!("value" in descriptor) || descriptor.configurable === false || descriptor.enumerable === false || descriptor.writable === false) {
          state_descriptors_fixed();
        }
        var s = sources.get(prop2);
        if (s === void 0) {
          s = with_parent(() => {
            var s2 = state(descriptor.value, stack2);
            sources.set(prop2, s2);
            if (dev_fallback_default && typeof prop2 === "string") {
              tag(s2, get_label(path, prop2));
            }
            return s2;
          });
        } else {
          set(s, descriptor.value, true);
        }
        return true;
      },
      deleteProperty(target, prop2) {
        var s = sources.get(prop2);
        if (s === void 0) {
          if (prop2 in target) {
            const s2 = with_parent(() => state(UNINITIALIZED, stack2));
            sources.set(prop2, s2);
            increment(version);
            if (dev_fallback_default) {
              tag(s2, get_label(path, prop2));
            }
          }
        } else {
          set(s, UNINITIALIZED);
          increment(version);
        }
        return true;
      },
      get(target, prop2, receiver) {
        if (prop2 === STATE_SYMBOL) {
          return value;
        }
        if (dev_fallback_default && prop2 === PROXY_PATH_SYMBOL) {
          return update_path;
        }
        var s = sources.get(prop2);
        var exists = prop2 in target;
        if (s === void 0 && (!exists || get_descriptor(target, prop2)?.writable)) {
          s = with_parent(() => {
            var p = proxy(exists ? target[prop2] : UNINITIALIZED);
            var s2 = state(p, stack2);
            if (dev_fallback_default) {
              tag(s2, get_label(path, prop2));
            }
            return s2;
          });
          sources.set(prop2, s);
        }
        if (s !== void 0) {
          var v = get(s);
          return v === UNINITIALIZED ? void 0 : v;
        }
        return Reflect.get(target, prop2, receiver);
      },
      getOwnPropertyDescriptor(target, prop2) {
        var descriptor = Reflect.getOwnPropertyDescriptor(target, prop2);
        if (descriptor && "value" in descriptor) {
          var s = sources.get(prop2);
          if (s) descriptor.value = get(s);
        } else if (descriptor === void 0) {
          var source2 = sources.get(prop2);
          var value2 = source2?.v;
          if (source2 !== void 0 && value2 !== UNINITIALIZED) {
            return {
              enumerable: true,
              configurable: true,
              value: value2,
              writable: true
            };
          }
        }
        return descriptor;
      },
      has(target, prop2) {
        if (prop2 === STATE_SYMBOL) {
          return true;
        }
        var s = sources.get(prop2);
        var has = s !== void 0 && s.v !== UNINITIALIZED || Reflect.has(target, prop2);
        if (s !== void 0 || active_effect !== null && (!has || get_descriptor(target, prop2)?.writable)) {
          if (s === void 0) {
            s = with_parent(() => {
              var p = has ? proxy(target[prop2]) : UNINITIALIZED;
              var s2 = state(p, stack2);
              if (dev_fallback_default) {
                tag(s2, get_label(path, prop2));
              }
              return s2;
            });
            sources.set(prop2, s);
          }
          var value2 = get(s);
          if (value2 === UNINITIALIZED) {
            return false;
          }
        }
        return has;
      },
      set(target, prop2, value2, receiver) {
        var s = sources.get(prop2);
        var has = prop2 in target;
        if (is_proxied_array && prop2 === "length") {
          for (var i = value2; i < /** @type {Source<number>} */
          s.v; i += 1) {
            var other_s = sources.get(i + "");
            if (other_s !== void 0) {
              set(other_s, UNINITIALIZED);
            } else if (i in target) {
              other_s = with_parent(() => state(UNINITIALIZED, stack2));
              sources.set(i + "", other_s);
              if (dev_fallback_default) {
                tag(other_s, get_label(path, i));
              }
            }
          }
        }
        if (s === void 0) {
          if (!has || get_descriptor(target, prop2)?.writable) {
            s = with_parent(() => state(void 0, stack2));
            if (dev_fallback_default) {
              tag(s, get_label(path, prop2));
            }
            set(s, proxy(value2));
            sources.set(prop2, s);
          }
        } else {
          has = s.v !== UNINITIALIZED;
          var p = with_parent(() => proxy(value2));
          set(s, p);
        }
        var descriptor = Reflect.getOwnPropertyDescriptor(target, prop2);
        if (descriptor?.set) {
          descriptor.set.call(receiver, value2);
        }
        if (!has) {
          if (is_proxied_array && typeof prop2 === "string") {
            var ls = (
              /** @type {Source<number>} */
              sources.get("length")
            );
            var n = Number(prop2);
            if (Number.isInteger(n) && n >= ls.v) {
              set(ls, n + 1);
            }
          }
          increment(version);
        }
        return true;
      },
      ownKeys(target) {
        get(version);
        var own_keys = Reflect.ownKeys(target).filter((key3) => {
          var source3 = sources.get(key3);
          return source3 === void 0 || source3.v !== UNINITIALIZED;
        });
        for (var [key2, source2] of sources) {
          if (source2.v !== UNINITIALIZED && !(key2 in target)) {
            own_keys.push(key2);
          }
        }
        return own_keys;
      },
      setPrototypeOf() {
        state_prototype_fixed();
      }
    }
  );
}
function get_label(path, prop2) {
  if (typeof prop2 === "symbol") return `${path}[Symbol(${prop2.description ?? ""})]`;
  if (regex_is_valid_identifier.test(prop2)) return `${path}.${prop2}`;
  return /^\d+$/.test(prop2) ? `${path}[${prop2}]` : `${path}['${prop2}']`;
}
function get_proxied_value(value) {
  try {
    if (value !== null && typeof value === "object" && STATE_SYMBOL in value) {
      return value[STATE_SYMBOL];
    }
  } catch {
  }
  return value;
}
function is(a, b) {
  return Object.is(get_proxied_value(a), get_proxied_value(b));
}
var ARRAY_MUTATING_METHODS = /* @__PURE__ */ new Set([
  "copyWithin",
  "fill",
  "pop",
  "push",
  "reverse",
  "shift",
  "sort",
  "splice",
  "unshift"
]);
function inspectable_array(array) {
  return new Proxy(array, {
    get(target, prop2, receiver) {
      var value = Reflect.get(target, prop2, receiver);
      if (!ARRAY_MUTATING_METHODS.has(
        /** @type {string} */
        prop2
      )) {
        return value;
      }
      return function(...args) {
        set_inspect_effects_deferred();
        var result = value.apply(this, args);
        flush_inspect_effects();
        return result;
      };
    }
  });
}

// node_modules/svelte/src/internal/client/dev/equality.js
function init_array_prototype_warnings() {
  const array_prototype2 = Array.prototype;
  const cleanup = Array.__svelte_cleanup;
  if (cleanup) {
    cleanup();
  }
  const { indexOf, lastIndexOf, includes } = array_prototype2;
  array_prototype2.indexOf = function(item, from_index) {
    const index2 = indexOf.call(this, item, from_index);
    if (index2 === -1) {
      for (let i = from_index ?? 0; i < this.length; i += 1) {
        if (get_proxied_value(this[i]) === item) {
          state_proxy_equality_mismatch("array.indexOf(...)");
          break;
        }
      }
    }
    return index2;
  };
  array_prototype2.lastIndexOf = function(item, from_index) {
    const index2 = lastIndexOf.call(this, item, from_index ?? this.length - 1);
    if (index2 === -1) {
      for (let i = 0; i <= (from_index ?? this.length - 1); i += 1) {
        if (get_proxied_value(this[i]) === item) {
          state_proxy_equality_mismatch("array.lastIndexOf(...)");
          break;
        }
      }
    }
    return index2;
  };
  array_prototype2.includes = function(item, from_index) {
    const has = includes.call(this, item, from_index);
    if (!has) {
      for (let i = 0; i < this.length; i += 1) {
        if (get_proxied_value(this[i]) === item) {
          state_proxy_equality_mismatch("array.includes(...)");
          break;
        }
      }
    }
    return has;
  };
  Array.__svelte_cleanup = () => {
    array_prototype2.indexOf = indexOf;
    array_prototype2.lastIndexOf = lastIndexOf;
    array_prototype2.includes = includes;
  };
}

// node_modules/svelte/src/internal/client/dom/operations.js
var $window;
var $document;
var is_firefox;
var first_child_getter;
var next_sibling_getter;
function init_operations() {
  if ($window !== void 0) {
    return;
  }
  $window = window;
  $document = document;
  is_firefox = /Firefox/.test(navigator.userAgent);
  var element_prototype = Element.prototype;
  var node_prototype = Node.prototype;
  var text_prototype = Text.prototype;
  first_child_getter = get_descriptor(node_prototype, "firstChild").get;
  next_sibling_getter = get_descriptor(node_prototype, "nextSibling").get;
  if (is_extensible(element_prototype)) {
    element_prototype.__click = void 0;
    element_prototype.__className = void 0;
    element_prototype.__attributes = null;
    element_prototype.__style = void 0;
    element_prototype.__e = void 0;
  }
  if (is_extensible(text_prototype)) {
    text_prototype.__t = void 0;
  }
  if (dev_fallback_default) {
    element_prototype.__svelte_meta = null;
    init_array_prototype_warnings();
  }
}
function create_text(value = "") {
  return document.createTextNode(value);
}
// @__NO_SIDE_EFFECTS__
function get_first_child(node) {
  return first_child_getter.call(node);
}
// @__NO_SIDE_EFFECTS__
function get_next_sibling(node) {
  return next_sibling_getter.call(node);
}
function child(node, is_text) {
  if (!hydrating) {
    return /* @__PURE__ */ get_first_child(node);
  }
  var child2 = (
    /** @type {TemplateNode} */
    /* @__PURE__ */ get_first_child(hydrate_node)
  );
  if (child2 === null) {
    child2 = hydrate_node.appendChild(create_text());
  } else if (is_text && child2.nodeType !== TEXT_NODE) {
    var text2 = create_text();
    child2?.before(text2);
    set_hydrate_node(text2);
    return text2;
  }
  set_hydrate_node(child2);
  return child2;
}
function first_child(fragment, is_text = false) {
  if (!hydrating) {
    var first = (
      /** @type {DocumentFragment} */
      /* @__PURE__ */ get_first_child(
        /** @type {Node} */
        fragment
      )
    );
    if (first instanceof Comment && first.data === "") return /* @__PURE__ */ get_next_sibling(first);
    return first;
  }
  if (is_text && hydrate_node?.nodeType !== TEXT_NODE) {
    var text2 = create_text();
    hydrate_node?.before(text2);
    set_hydrate_node(text2);
    return text2;
  }
  return hydrate_node;
}
function sibling(node, count = 1, is_text = false) {
  let next_sibling = hydrating ? hydrate_node : node;
  var last_sibling;
  while (count--) {
    last_sibling = next_sibling;
    next_sibling = /** @type {TemplateNode} */
    /* @__PURE__ */ get_next_sibling(next_sibling);
  }
  if (!hydrating) {
    return next_sibling;
  }
  if (is_text && next_sibling?.nodeType !== TEXT_NODE) {
    var text2 = create_text();
    if (next_sibling === null) {
      last_sibling?.after(text2);
    } else {
      next_sibling.before(text2);
    }
    set_hydrate_node(text2);
    return text2;
  }
  set_hydrate_node(next_sibling);
  return (
    /** @type {TemplateNode} */
    next_sibling
  );
}
function clear_text_content(node) {
  node.textContent = "";
}
function should_defer_append() {
  if (!async_mode_flag) return false;
  if (eager_block_effects !== null) return false;
  var flags2 = (
    /** @type {Effect} */
    active_effect.f
  );
  return (flags2 & EFFECT_RAN) !== 0;
}

// node_modules/svelte/src/internal/client/dom/elements/misc.js
function remove_textarea_child(dom) {
  if (hydrating && get_first_child(dom) !== null) {
    clear_text_content(dom);
  }
}
var listening_to_form_reset = false;
function add_form_reset_listener() {
  if (!listening_to_form_reset) {
    listening_to_form_reset = true;
    document.addEventListener(
      "reset",
      (evt) => {
        Promise.resolve().then(() => {
          if (!evt.defaultPrevented) {
            for (
              const e of
              /**@type {HTMLFormElement} */
              evt.target.elements
            ) {
              e.__on_r?.();
            }
          }
        });
      },
      // In the capture phase to guarantee we get noticed of it (no possiblity of stopPropagation)
      { capture: true }
    );
  }
}

// node_modules/svelte/src/internal/client/dom/elements/bindings/shared.js
function without_reactive_context(fn) {
  var previous_reaction = active_reaction;
  var previous_effect = active_effect;
  set_active_reaction(null);
  set_active_effect(null);
  try {
    return fn();
  } finally {
    set_active_reaction(previous_reaction);
    set_active_effect(previous_effect);
  }
}
function listen_to_event_and_reset_event(element2, event2, handler, on_reset = handler) {
  element2.addEventListener(event2, () => without_reactive_context(handler));
  const prev = element2.__on_r;
  if (prev) {
    element2.__on_r = () => {
      prev();
      on_reset(true);
    };
  } else {
    element2.__on_r = () => on_reset(true);
  }
  add_form_reset_listener();
}

// node_modules/svelte/src/internal/client/reactivity/effects.js
function validate_effect(rune) {
  if (active_effect === null && active_reaction === null) {
    effect_orphan(rune);
  }
  if (active_reaction !== null && (active_reaction.f & UNOWNED) !== 0 && active_effect === null) {
    effect_in_unowned_derived();
  }
  if (is_destroying_effect) {
    effect_in_teardown(rune);
  }
}
function push_effect(effect2, parent_effect) {
  var parent_last = parent_effect.last;
  if (parent_last === null) {
    parent_effect.last = parent_effect.first = effect2;
  } else {
    parent_last.next = effect2;
    effect2.prev = parent_last;
    parent_effect.last = effect2;
  }
}
function create_effect(type, fn, sync, push2 = true) {
  var parent = active_effect;
  if (dev_fallback_default) {
    while (parent !== null && (parent.f & INSPECT_EFFECT) !== 0) {
      parent = parent.parent;
    }
  }
  if (parent !== null && (parent.f & INERT) !== 0) {
    type |= INERT;
  }
  var effect2 = {
    ctx: component_context,
    deps: null,
    nodes_start: null,
    nodes_end: null,
    f: type | DIRTY,
    first: null,
    fn,
    last: null,
    next: null,
    parent,
    b: parent && parent.b,
    prev: null,
    teardown: null,
    transitions: null,
    wv: 0,
    ac: null
  };
  if (dev_fallback_default) {
    effect2.component_function = dev_current_component_function;
  }
  if (sync) {
    try {
      update_effect(effect2);
      effect2.f |= EFFECT_RAN;
    } catch (e2) {
      destroy_effect(effect2);
      throw e2;
    }
  } else if (fn !== null) {
    schedule_effect(effect2);
  }
  if (push2) {
    var e = effect2;
    if (sync && e.deps === null && e.teardown === null && e.nodes_start === null && e.first === e.last && // either `null`, or a singular child
    (e.f & EFFECT_PRESERVED) === 0) {
      e = e.first;
    }
    if (e !== null) {
      e.parent = parent;
      if (parent !== null) {
        push_effect(e, parent);
      }
      if (active_reaction !== null && (active_reaction.f & DERIVED) !== 0 && (type & ROOT_EFFECT) === 0) {
        var derived3 = (
          /** @type {Derived} */
          active_reaction
        );
        (derived3.effects ?? (derived3.effects = [])).push(e);
      }
    }
  }
  return effect2;
}
function effect_tracking() {
  return active_reaction !== null && !untracking;
}
function teardown(fn) {
  const effect2 = create_effect(RENDER_EFFECT, null, false);
  set_signal_status(effect2, CLEAN);
  effect2.teardown = fn;
  return effect2;
}
function user_effect(fn) {
  validate_effect("$effect");
  if (dev_fallback_default) {
    define_property(fn, "name", {
      value: "$effect"
    });
  }
  var flags2 = (
    /** @type {Effect} */
    active_effect.f
  );
  var defer = !active_reaction && (flags2 & BRANCH_EFFECT) !== 0 && (flags2 & EFFECT_RAN) === 0;
  if (defer) {
    var context = (
      /** @type {ComponentContext} */
      component_context
    );
    (context.e ?? (context.e = [])).push(fn);
  } else {
    return create_user_effect(fn);
  }
}
function create_user_effect(fn) {
  return create_effect(EFFECT | USER_EFFECT, fn, false);
}
function user_pre_effect(fn) {
  validate_effect("$effect.pre");
  if (dev_fallback_default) {
    define_property(fn, "name", {
      value: "$effect.pre"
    });
  }
  return create_effect(RENDER_EFFECT | USER_EFFECT, fn, true);
}
function effect_root(fn) {
  Batch.ensure();
  const effect2 = create_effect(ROOT_EFFECT | EFFECT_PRESERVED, fn, true);
  return () => {
    destroy_effect(effect2);
  };
}
function component_root(fn) {
  Batch.ensure();
  const effect2 = create_effect(ROOT_EFFECT | EFFECT_PRESERVED, fn, true);
  return (options = {}) => {
    return new Promise((fulfil) => {
      if (options.outro) {
        pause_effect(effect2, () => {
          destroy_effect(effect2);
          fulfil(void 0);
        });
      } else {
        destroy_effect(effect2);
        fulfil(void 0);
      }
    });
  };
}
function effect(fn) {
  return create_effect(EFFECT, fn, false);
}
function legacy_pre_effect(deps, fn) {
  var context = (
    /** @type {ComponentContextLegacy} */
    component_context
  );
  var token = { effect: null, ran: false, deps };
  context.l.$.push(token);
  token.effect = render_effect(() => {
    deps();
    if (token.ran) return;
    token.ran = true;
    untrack(fn);
  });
}
function legacy_pre_effect_reset() {
  var context = (
    /** @type {ComponentContextLegacy} */
    component_context
  );
  render_effect(() => {
    for (var token of context.l.$) {
      token.deps();
      var effect2 = token.effect;
      if ((effect2.f & CLEAN) !== 0) {
        set_signal_status(effect2, MAYBE_DIRTY);
      }
      if (is_dirty(effect2)) {
        update_effect(effect2);
      }
      token.ran = false;
    }
  });
}
function async_effect(fn) {
  return create_effect(ASYNC | EFFECT_PRESERVED, fn, true);
}
function render_effect(fn, flags2 = 0) {
  return create_effect(RENDER_EFFECT | flags2, fn, true);
}
function template_effect(fn, sync = [], async2 = []) {
  flatten(sync, async2, (values) => {
    create_effect(RENDER_EFFECT, () => fn(...values.map(get)), true);
  });
}
function block(fn, flags2 = 0) {
  var effect2 = create_effect(BLOCK_EFFECT | flags2, fn, true);
  if (dev_fallback_default) {
    effect2.dev_stack = dev_stack;
  }
  return effect2;
}
function branch(fn, push2 = true) {
  return create_effect(BRANCH_EFFECT | EFFECT_PRESERVED, fn, true, push2);
}
function execute_effect_teardown(effect2) {
  var teardown2 = effect2.teardown;
  if (teardown2 !== null) {
    const previously_destroying_effect = is_destroying_effect;
    const previous_reaction = active_reaction;
    set_is_destroying_effect(true);
    set_active_reaction(null);
    try {
      teardown2.call(null);
    } finally {
      set_is_destroying_effect(previously_destroying_effect);
      set_active_reaction(previous_reaction);
    }
  }
}
function destroy_effect_children(signal, remove_dom = false) {
  var effect2 = signal.first;
  signal.first = signal.last = null;
  while (effect2 !== null) {
    const controller = effect2.ac;
    if (controller !== null) {
      without_reactive_context(() => {
        controller.abort(STALE_REACTION);
      });
    }
    var next2 = effect2.next;
    if ((effect2.f & ROOT_EFFECT) !== 0) {
      effect2.parent = null;
    } else {
      destroy_effect(effect2, remove_dom);
    }
    effect2 = next2;
  }
}
function destroy_block_effect_children(signal) {
  var effect2 = signal.first;
  while (effect2 !== null) {
    var next2 = effect2.next;
    if ((effect2.f & BRANCH_EFFECT) === 0) {
      destroy_effect(effect2);
    }
    effect2 = next2;
  }
}
function destroy_effect(effect2, remove_dom = true) {
  var removed = false;
  if ((remove_dom || (effect2.f & HEAD_EFFECT) !== 0) && effect2.nodes_start !== null && effect2.nodes_end !== null) {
    remove_effect_dom(
      effect2.nodes_start,
      /** @type {TemplateNode} */
      effect2.nodes_end
    );
    removed = true;
  }
  destroy_effect_children(effect2, remove_dom && !removed);
  remove_reactions(effect2, 0);
  set_signal_status(effect2, DESTROYED);
  var transitions = effect2.transitions;
  if (transitions !== null) {
    for (const transition2 of transitions) {
      transition2.stop();
    }
  }
  execute_effect_teardown(effect2);
  var parent = effect2.parent;
  if (parent !== null && parent.first !== null) {
    unlink_effect(effect2);
  }
  if (dev_fallback_default) {
    effect2.component_function = null;
  }
  effect2.next = effect2.prev = effect2.teardown = effect2.ctx = effect2.deps = effect2.fn = effect2.nodes_start = effect2.nodes_end = effect2.ac = null;
}
function remove_effect_dom(node, end) {
  while (node !== null) {
    var next2 = node === end ? null : (
      /** @type {TemplateNode} */
      get_next_sibling(node)
    );
    node.remove();
    node = next2;
  }
}
function unlink_effect(effect2) {
  var parent = effect2.parent;
  var prev = effect2.prev;
  var next2 = effect2.next;
  if (prev !== null) prev.next = next2;
  if (next2 !== null) next2.prev = prev;
  if (parent !== null) {
    if (parent.first === effect2) parent.first = next2;
    if (parent.last === effect2) parent.last = prev;
  }
}
function pause_effect(effect2, callback) {
  var transitions = [];
  pause_children(effect2, transitions, true);
  run_out_transitions(transitions, () => {
    destroy_effect(effect2);
    if (callback) callback();
  });
}
function run_out_transitions(transitions, fn) {
  var remaining = transitions.length;
  if (remaining > 0) {
    var check = () => --remaining || fn();
    for (var transition2 of transitions) {
      transition2.out(check);
    }
  } else {
    fn();
  }
}
function pause_children(effect2, transitions, local) {
  if ((effect2.f & INERT) !== 0) return;
  effect2.f ^= INERT;
  if (effect2.transitions !== null) {
    for (const transition2 of effect2.transitions) {
      if (transition2.is_global || local) {
        transitions.push(transition2);
      }
    }
  }
  var child2 = effect2.first;
  while (child2 !== null) {
    var sibling2 = child2.next;
    var transparent = (child2.f & EFFECT_TRANSPARENT) !== 0 || (child2.f & BRANCH_EFFECT) !== 0;
    pause_children(child2, transitions, transparent ? local : false);
    child2 = sibling2;
  }
}
function resume_effect(effect2) {
  resume_children(effect2, true);
}
function resume_children(effect2, local) {
  if ((effect2.f & INERT) === 0) return;
  effect2.f ^= INERT;
  if ((effect2.f & CLEAN) === 0) {
    set_signal_status(effect2, DIRTY);
    schedule_effect(effect2);
  }
  var child2 = effect2.first;
  while (child2 !== null) {
    var sibling2 = child2.next;
    var transparent = (child2.f & EFFECT_TRANSPARENT) !== 0 || (child2.f & BRANCH_EFFECT) !== 0;
    resume_children(child2, transparent ? local : false);
    child2 = sibling2;
  }
  if (effect2.transitions !== null) {
    for (const transition2 of effect2.transitions) {
      if (transition2.is_global || local) {
        transition2.in();
      }
    }
  }
}

// node_modules/svelte/src/internal/client/legacy.js
var captured_signals = null;
function capture_signals(fn) {
  var previous_captured_signals = captured_signals;
  try {
    captured_signals = /* @__PURE__ */ new Set();
    untrack(fn);
    if (previous_captured_signals !== null) {
      for (var signal of captured_signals) {
        previous_captured_signals.add(signal);
      }
    }
    return captured_signals;
  } finally {
    captured_signals = previous_captured_signals;
  }
}
function invalidate_inner_signals(fn) {
  for (var signal of capture_signals(fn)) {
    internal_set(signal, signal.v);
  }
}

// node_modules/svelte/src/internal/client/runtime.js
var is_updating_effect = false;
function set_is_updating_effect(value) {
  is_updating_effect = value;
}
var is_destroying_effect = false;
function set_is_destroying_effect(value) {
  is_destroying_effect = value;
}
var active_reaction = null;
var untracking = false;
function set_active_reaction(reaction) {
  active_reaction = reaction;
}
var active_effect = null;
function set_active_effect(effect2) {
  active_effect = effect2;
}
var current_sources = null;
function push_reaction_value(value) {
  if (active_reaction !== null && (!async_mode_flag || (active_reaction.f & DERIVED) !== 0)) {
    if (current_sources === null) {
      current_sources = [value];
    } else {
      current_sources.push(value);
    }
  }
}
var new_deps = null;
var skipped_deps = 0;
var untracked_writes = null;
function set_untracked_writes(value) {
  untracked_writes = value;
}
var write_version = 1;
var read_version = 0;
var update_version = read_version;
function set_update_version(value) {
  update_version = value;
}
var skip_reaction = false;
function increment_write_version() {
  return ++write_version;
}
function is_dirty(reaction) {
  var flags2 = reaction.f;
  if ((flags2 & DIRTY) !== 0) {
    return true;
  }
  if ((flags2 & MAYBE_DIRTY) !== 0) {
    var dependencies = reaction.deps;
    var is_unowned = (flags2 & UNOWNED) !== 0;
    if (dependencies !== null) {
      var i;
      var dependency;
      var is_disconnected = (flags2 & DISCONNECTED) !== 0;
      var is_unowned_connected = is_unowned && active_effect !== null && !skip_reaction;
      var length = dependencies.length;
      if ((is_disconnected || is_unowned_connected) && (active_effect === null || (active_effect.f & DESTROYED) === 0)) {
        var derived3 = (
          /** @type {Derived} */
          reaction
        );
        var parent = derived3.parent;
        for (i = 0; i < length; i++) {
          dependency = dependencies[i];
          if (is_disconnected || !dependency?.reactions?.includes(derived3)) {
            (dependency.reactions ?? (dependency.reactions = [])).push(derived3);
          }
        }
        if (is_disconnected) {
          derived3.f ^= DISCONNECTED;
        }
        if (is_unowned_connected && parent !== null && (parent.f & UNOWNED) === 0) {
          derived3.f ^= UNOWNED;
        }
      }
      for (i = 0; i < length; i++) {
        dependency = dependencies[i];
        if (is_dirty(
          /** @type {Derived} */
          dependency
        )) {
          update_derived(
            /** @type {Derived} */
            dependency
          );
        }
        if (dependency.wv > reaction.wv) {
          return true;
        }
      }
    }
    if (!is_unowned || active_effect !== null && !skip_reaction) {
      set_signal_status(reaction, CLEAN);
    }
  }
  return false;
}
function schedule_possible_effect_self_invalidation(signal, effect2, root3 = true) {
  var reactions = signal.reactions;
  if (reactions === null) return;
  if (!async_mode_flag && current_sources?.includes(signal)) {
    return;
  }
  for (var i = 0; i < reactions.length; i++) {
    var reaction = reactions[i];
    if ((reaction.f & DERIVED) !== 0) {
      schedule_possible_effect_self_invalidation(
        /** @type {Derived} */
        reaction,
        effect2,
        false
      );
    } else if (effect2 === reaction) {
      if (root3) {
        set_signal_status(reaction, DIRTY);
      } else if ((reaction.f & CLEAN) !== 0) {
        set_signal_status(reaction, MAYBE_DIRTY);
      }
      schedule_effect(
        /** @type {Effect} */
        reaction
      );
    }
  }
}
function update_reaction(reaction) {
  var _a2;
  var previous_deps = new_deps;
  var previous_skipped_deps = skipped_deps;
  var previous_untracked_writes = untracked_writes;
  var previous_reaction = active_reaction;
  var previous_skip_reaction = skip_reaction;
  var previous_sources = current_sources;
  var previous_component_context = component_context;
  var previous_untracking = untracking;
  var previous_update_version = update_version;
  var flags2 = reaction.f;
  new_deps = /** @type {null | Value[]} */
  null;
  skipped_deps = 0;
  untracked_writes = null;
  skip_reaction = (flags2 & UNOWNED) !== 0 && (untracking || !is_updating_effect || active_reaction === null);
  active_reaction = (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) === 0 ? reaction : null;
  current_sources = null;
  set_component_context(reaction.ctx);
  untracking = false;
  update_version = ++read_version;
  if (reaction.ac !== null) {
    without_reactive_context(() => {
      reaction.ac.abort(STALE_REACTION);
    });
    reaction.ac = null;
  }
  try {
    reaction.f |= REACTION_IS_UPDATING;
    var fn = (
      /** @type {Function} */
      reaction.fn
    );
    var result = fn();
    var deps = reaction.deps;
    if (new_deps !== null) {
      var i;
      remove_reactions(reaction, skipped_deps);
      if (deps !== null && skipped_deps > 0) {
        deps.length = skipped_deps + new_deps.length;
        for (i = 0; i < new_deps.length; i++) {
          deps[skipped_deps + i] = new_deps[i];
        }
      } else {
        reaction.deps = deps = new_deps;
      }
      if (!skip_reaction || // Deriveds that already have reactions can cleanup, so we still add them as reactions
      (flags2 & DERIVED) !== 0 && /** @type {import('#client').Derived} */
      reaction.reactions !== null) {
        for (i = skipped_deps; i < deps.length; i++) {
          ((_a2 = deps[i]).reactions ?? (_a2.reactions = [])).push(reaction);
        }
      }
    } else if (deps !== null && skipped_deps < deps.length) {
      remove_reactions(reaction, skipped_deps);
      deps.length = skipped_deps;
    }
    if (is_runes() && untracked_writes !== null && !untracking && deps !== null && (reaction.f & (DERIVED | MAYBE_DIRTY | DIRTY)) === 0) {
      for (i = 0; i < /** @type {Source[]} */
      untracked_writes.length; i++) {
        schedule_possible_effect_self_invalidation(
          untracked_writes[i],
          /** @type {Effect} */
          reaction
        );
      }
    }
    if (previous_reaction !== null && previous_reaction !== reaction) {
      read_version++;
      if (untracked_writes !== null) {
        if (previous_untracked_writes === null) {
          previous_untracked_writes = untracked_writes;
        } else {
          previous_untracked_writes.push(.../** @type {Source[]} */
          untracked_writes);
        }
      }
    }
    if ((reaction.f & ERROR_VALUE) !== 0) {
      reaction.f ^= ERROR_VALUE;
    }
    return result;
  } catch (error) {
    return handle_error(error);
  } finally {
    reaction.f ^= REACTION_IS_UPDATING;
    new_deps = previous_deps;
    skipped_deps = previous_skipped_deps;
    untracked_writes = previous_untracked_writes;
    active_reaction = previous_reaction;
    skip_reaction = previous_skip_reaction;
    current_sources = previous_sources;
    set_component_context(previous_component_context);
    untracking = previous_untracking;
    update_version = previous_update_version;
  }
}
function remove_reaction(signal, dependency) {
  let reactions = dependency.reactions;
  if (reactions !== null) {
    var index2 = index_of.call(reactions, signal);
    if (index2 !== -1) {
      var new_length = reactions.length - 1;
      if (new_length === 0) {
        reactions = dependency.reactions = null;
      } else {
        reactions[index2] = reactions[new_length];
        reactions.pop();
      }
    }
  }
  if (reactions === null && (dependency.f & DERIVED) !== 0 && // Destroying a child effect while updating a parent effect can cause a dependency to appear
  // to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
  // allows us to skip the expensive work of disconnecting and immediately reconnecting it
  (new_deps === null || !new_deps.includes(dependency))) {
    set_signal_status(dependency, MAYBE_DIRTY);
    if ((dependency.f & (UNOWNED | DISCONNECTED)) === 0) {
      dependency.f ^= DISCONNECTED;
    }
    destroy_derived_effects(
      /** @type {Derived} **/
      dependency
    );
    remove_reactions(
      /** @type {Derived} **/
      dependency,
      0
    );
  }
}
function remove_reactions(signal, start_index) {
  var dependencies = signal.deps;
  if (dependencies === null) return;
  for (var i = start_index; i < dependencies.length; i++) {
    remove_reaction(signal, dependencies[i]);
  }
}
function update_effect(effect2) {
  var flags2 = effect2.f;
  if ((flags2 & DESTROYED) !== 0) {
    return;
  }
  set_signal_status(effect2, CLEAN);
  var previous_effect = active_effect;
  var was_updating_effect = is_updating_effect;
  active_effect = effect2;
  is_updating_effect = true;
  if (dev_fallback_default) {
    var previous_component_fn = dev_current_component_function;
    set_dev_current_component_function(effect2.component_function);
    var previous_stack = (
      /** @type {any} */
      dev_stack
    );
    set_dev_stack(effect2.dev_stack ?? dev_stack);
  }
  try {
    if ((flags2 & BLOCK_EFFECT) !== 0) {
      destroy_block_effect_children(effect2);
    } else {
      destroy_effect_children(effect2);
    }
    execute_effect_teardown(effect2);
    var teardown2 = update_reaction(effect2);
    effect2.teardown = typeof teardown2 === "function" ? teardown2 : null;
    effect2.wv = write_version;
    if (dev_fallback_default && tracing_mode_flag && (effect2.f & DIRTY) !== 0 && effect2.deps !== null) {
      for (var dep of effect2.deps) {
        if (dep.set_during_effect) {
          dep.wv = increment_write_version();
          dep.set_during_effect = false;
        }
      }
    }
  } finally {
    is_updating_effect = was_updating_effect;
    active_effect = previous_effect;
    if (dev_fallback_default) {
      set_dev_current_component_function(previous_component_fn);
      set_dev_stack(previous_stack);
    }
  }
}
function get(signal) {
  var flags2 = signal.f;
  var is_derived = (flags2 & DERIVED) !== 0;
  captured_signals?.add(signal);
  if (active_reaction !== null && !untracking) {
    var destroyed = active_effect !== null && (active_effect.f & DESTROYED) !== 0;
    if (!destroyed && !current_sources?.includes(signal)) {
      var deps = active_reaction.deps;
      if ((active_reaction.f & REACTION_IS_UPDATING) !== 0) {
        if (signal.rv < read_version) {
          signal.rv = read_version;
          if (new_deps === null && deps !== null && deps[skipped_deps] === signal) {
            skipped_deps++;
          } else if (new_deps === null) {
            new_deps = [signal];
          } else if (!skip_reaction || !new_deps.includes(signal)) {
            new_deps.push(signal);
          }
        }
      } else {
        (active_reaction.deps ?? (active_reaction.deps = [])).push(signal);
        var reactions = signal.reactions;
        if (reactions === null) {
          signal.reactions = [active_reaction];
        } else if (!reactions.includes(active_reaction)) {
          reactions.push(active_reaction);
        }
      }
    }
  } else if (is_derived && /** @type {Derived} */
  signal.deps === null && /** @type {Derived} */
  signal.effects === null) {
    var derived3 = (
      /** @type {Derived} */
      signal
    );
    var parent = derived3.parent;
    if (parent !== null && (parent.f & UNOWNED) === 0) {
      derived3.f ^= UNOWNED;
    }
  }
  if (dev_fallback_default) {
    if (current_async_effect) {
      var tracking = (current_async_effect.f & REACTION_IS_UPDATING) !== 0;
      var was_read = current_async_effect.deps?.includes(signal);
      if (!tracking && !untracking && !was_read) {
        await_reactivity_loss(
          /** @type {string} */
          signal.label
        );
        var trace2 = get_stack("TracedAt");
        if (trace2) console.warn(trace2);
      }
    }
    recent_async_deriveds.delete(signal);
    if (tracing_mode_flag && !untracking && tracing_expressions !== null && active_reaction !== null && tracing_expressions.reaction === active_reaction) {
      if (signal.trace) {
        signal.trace();
      } else {
        trace2 = get_stack("TracedAt");
        if (trace2) {
          var entry = tracing_expressions.entries.get(signal);
          if (entry === void 0) {
            entry = { traces: [] };
            tracing_expressions.entries.set(signal, entry);
          }
          var last = entry.traces[entry.traces.length - 1];
          if (trace2.stack !== last?.stack) {
            entry.traces.push(trace2);
          }
        }
      }
    }
  }
  if (is_destroying_effect) {
    if (old_values.has(signal)) {
      return old_values.get(signal);
    }
    if (is_derived) {
      derived3 = /** @type {Derived} */
      signal;
      var value = derived3.v;
      if ((derived3.f & CLEAN) === 0 && derived3.reactions !== null || depends_on_old_values(derived3)) {
        value = execute_derived(derived3);
      }
      old_values.set(derived3, value);
      return value;
    }
  } else if (is_derived) {
    derived3 = /** @type {Derived} */
    signal;
    if (batch_values?.has(derived3)) {
      return batch_values.get(derived3);
    }
    if (is_dirty(derived3)) {
      update_derived(derived3);
    }
  }
  if (batch_values?.has(signal)) {
    return batch_values.get(signal);
  }
  if ((signal.f & ERROR_VALUE) !== 0) {
    throw signal.v;
  }
  return signal.v;
}
function depends_on_old_values(derived3) {
  if (derived3.v === UNINITIALIZED) return true;
  if (derived3.deps === null) return false;
  for (const dep of derived3.deps) {
    if (old_values.has(dep)) {
      return true;
    }
    if ((dep.f & DERIVED) !== 0 && depends_on_old_values(
      /** @type {Derived} */
      dep
    )) {
      return true;
    }
  }
  return false;
}
function untrack(fn) {
  var previous_untracking = untracking;
  try {
    untracking = true;
    return fn();
  } finally {
    untracking = previous_untracking;
  }
}
var STATUS_MASK = ~(DIRTY | MAYBE_DIRTY | CLEAN);
function set_signal_status(signal, status) {
  signal.f = signal.f & STATUS_MASK | status;
}
function deep_read_state(value) {
  if (typeof value !== "object" || !value || value instanceof EventTarget) {
    return;
  }
  if (STATE_SYMBOL in value) {
    deep_read(value);
  } else if (!Array.isArray(value)) {
    for (let key2 in value) {
      const prop2 = value[key2];
      if (typeof prop2 === "object" && prop2 && STATE_SYMBOL in prop2) {
        deep_read(prop2);
      }
    }
  }
}
function deep_read(value, visited = /* @__PURE__ */ new Set()) {
  if (typeof value === "object" && value !== null && // We don't want to traverse DOM elements
  !(value instanceof EventTarget) && !visited.has(value)) {
    visited.add(value);
    if (value instanceof Date) {
      value.getTime();
    }
    for (let key2 in value) {
      try {
        deep_read(value[key2], visited);
      } catch (e) {
      }
    }
    const proto = get_prototype_of(value);
    if (proto !== Object.prototype && proto !== Array.prototype && proto !== Map.prototype && proto !== Set.prototype && proto !== Date.prototype) {
      const descriptors = get_descriptors(proto);
      for (let key2 in descriptors) {
        const get3 = descriptors[key2].get;
        if (get3) {
          try {
            get3.call(value);
          } catch (e) {
          }
        }
      }
    }
  }
}

// node_modules/svelte/src/internal/client/dom/elements/events.js
var all_registered_events = /* @__PURE__ */ new Set();
var root_event_handles = /* @__PURE__ */ new Set();
function create_event(event_name, dom, handler, options = {}) {
  function target_handler(event2) {
    if (!options.capture) {
      handle_event_propagation.call(dom, event2);
    }
    if (!event2.cancelBubble) {
      return without_reactive_context(() => {
        return handler?.call(this, event2);
      });
    }
  }
  if (event_name.startsWith("pointer") || event_name.startsWith("touch") || event_name === "wheel") {
    queue_micro_task(() => {
      dom.addEventListener(event_name, target_handler, options);
    });
  } else {
    dom.addEventListener(event_name, target_handler, options);
  }
  return target_handler;
}
function event(event_name, dom, handler, capture2, passive2) {
  var options = { capture: capture2, passive: passive2 };
  var target_handler = create_event(event_name, dom, handler, options);
  if (dom === document.body || // @ts-ignore
  dom === window || // @ts-ignore
  dom === document || // Firefox has quirky behavior, it can happen that we still get "canplay" events when the element is already removed
  dom instanceof HTMLMediaElement) {
    teardown(() => {
      dom.removeEventListener(event_name, target_handler, options);
    });
  }
}
function delegate(events) {
  for (var i = 0; i < events.length; i++) {
    all_registered_events.add(events[i]);
  }
  for (var fn of root_event_handles) {
    fn(events);
  }
}
var last_propagated_event = null;
function handle_event_propagation(event2) {
  var handler_element = this;
  var owner_document = (
    /** @type {Node} */
    handler_element.ownerDocument
  );
  var event_name = event2.type;
  var path = event2.composedPath?.() || [];
  var current_target = (
    /** @type {null | Element} */
    path[0] || event2.target
  );
  last_propagated_event = event2;
  var path_idx = 0;
  var handled_at = last_propagated_event === event2 && event2.__root;
  if (handled_at) {
    var at_idx = path.indexOf(handled_at);
    if (at_idx !== -1 && (handler_element === document || handler_element === /** @type {any} */
    window)) {
      event2.__root = handler_element;
      return;
    }
    var handler_idx = path.indexOf(handler_element);
    if (handler_idx === -1) {
      return;
    }
    if (at_idx <= handler_idx) {
      path_idx = at_idx;
    }
  }
  current_target = /** @type {Element} */
  path[path_idx] || event2.target;
  if (current_target === handler_element) return;
  define_property(event2, "currentTarget", {
    configurable: true,
    get() {
      return current_target || owner_document;
    }
  });
  var previous_reaction = active_reaction;
  var previous_effect = active_effect;
  set_active_reaction(null);
  set_active_effect(null);
  try {
    var throw_error;
    var other_errors = [];
    while (current_target !== null) {
      var parent_element = current_target.assignedSlot || current_target.parentNode || /** @type {any} */
      current_target.host || null;
      try {
        var delegated = current_target["__" + event_name];
        if (delegated != null && (!/** @type {any} */
        current_target.disabled || // DOM could've been updated already by the time this is reached, so we check this as well
        // -> the target could not have been disabled because it emits the event in the first place
        event2.target === current_target)) {
          if (is_array(delegated)) {
            var [fn, ...data] = delegated;
            fn.apply(current_target, [event2, ...data]);
          } else {
            delegated.call(current_target, event2);
          }
        }
      } catch (error) {
        if (throw_error) {
          other_errors.push(error);
        } else {
          throw_error = error;
        }
      }
      if (event2.cancelBubble || parent_element === handler_element || parent_element === null) {
        break;
      }
      current_target = parent_element;
    }
    if (throw_error) {
      for (let error of other_errors) {
        queueMicrotask(() => {
          throw error;
        });
      }
      throw throw_error;
    }
  } finally {
    event2.__root = handler_element;
    delete event2.currentTarget;
    set_active_reaction(previous_reaction);
    set_active_effect(previous_effect);
  }
}

// node_modules/svelte/src/internal/client/dom/blocks/svelte-head.js
var head_anchor;
function reset_head_anchor() {
  head_anchor = void 0;
}

// node_modules/svelte/src/internal/client/dom/reconciler.js
function create_fragment_from_html(html2) {
  var elem = document.createElement("template");
  elem.innerHTML = html2.replaceAll("<!>", "<!---->");
  return elem.content;
}

// node_modules/svelte/src/internal/client/dom/template.js
function assign_nodes(start, end) {
  var effect2 = (
    /** @type {Effect} */
    active_effect
  );
  if (effect2.nodes_start === null) {
    effect2.nodes_start = start;
    effect2.nodes_end = end;
  }
}
// @__NO_SIDE_EFFECTS__
function from_html(content, flags2) {
  var is_fragment = (flags2 & TEMPLATE_FRAGMENT) !== 0;
  var use_import_node = (flags2 & TEMPLATE_USE_IMPORT_NODE) !== 0;
  var node;
  var has_start = !content.startsWith("<!>");
  return () => {
    if (hydrating) {
      assign_nodes(hydrate_node, null);
      return hydrate_node;
    }
    if (node === void 0) {
      node = create_fragment_from_html(has_start ? content : "<!>" + content);
      if (!is_fragment) node = /** @type {Node} */
      get_first_child(node);
    }
    var clone = (
      /** @type {TemplateNode} */
      use_import_node || is_firefox ? document.importNode(node, true) : node.cloneNode(true)
    );
    if (is_fragment) {
      var start = (
        /** @type {TemplateNode} */
        get_first_child(clone)
      );
      var end = (
        /** @type {TemplateNode} */
        clone.lastChild
      );
      assign_nodes(start, end);
    } else {
      assign_nodes(clone, clone);
    }
    return clone;
  };
}
function text(value = "") {
  if (!hydrating) {
    var t = create_text(value + "");
    assign_nodes(t, t);
    return t;
  }
  var node = hydrate_node;
  if (node.nodeType !== TEXT_NODE) {
    node.before(node = create_text());
    set_hydrate_node(node);
  }
  assign_nodes(node, node);
  return node;
}
function comment() {
  if (hydrating) {
    assign_nodes(hydrate_node, null);
    return hydrate_node;
  }
  var frag = document.createDocumentFragment();
  var start = document.createComment("");
  var anchor = create_text();
  frag.append(start, anchor);
  assign_nodes(start, anchor);
  return frag;
}
function append(anchor, dom) {
  if (hydrating) {
    active_effect.nodes_end = hydrate_node;
    hydrate_next();
    return;
  }
  if (anchor === null) {
    return;
  }
  anchor.before(
    /** @type {Node} */
    dom
  );
}

// node_modules/svelte/src/utils.js
var DOM_BOOLEAN_ATTRIBUTES = [
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "disabled",
  "formnovalidate",
  "indeterminate",
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
  "seamless",
  "selected",
  "webkitdirectory",
  "defer",
  "disablepictureinpicture",
  "disableremoteplayback"
];
var DOM_PROPERTIES = [
  ...DOM_BOOLEAN_ATTRIBUTES,
  "formNoValidate",
  "isMap",
  "noModule",
  "playsInline",
  "readOnly",
  "value",
  "volume",
  "defaultValue",
  "defaultChecked",
  "srcObject",
  "noValidate",
  "allowFullscreen",
  "disablePictureInPicture",
  "disableRemotePlayback"
];
var PASSIVE_EVENTS = ["touchstart", "touchmove"];
function is_passive_event(name) {
  return PASSIVE_EVENTS.includes(name);
}
var STATE_CREATION_RUNES = (
  /** @type {const} */
  [
    "$state",
    "$state.raw",
    "$derived",
    "$derived.by"
  ]
);
var RUNES = (
  /** @type {const} */
  [
    ...STATE_CREATION_RUNES,
    "$state.snapshot",
    "$props",
    "$props.id",
    "$bindable",
    "$effect",
    "$effect.pre",
    "$effect.tracking",
    "$effect.root",
    "$effect.pending",
    "$inspect",
    "$inspect().with",
    "$inspect.trace",
    "$host"
  ]
);

// node_modules/svelte/src/internal/client/render.js
var should_intro = true;
function set_text(text2, value) {
  var str = value == null ? "" : typeof value === "object" ? value + "" : value;
  if (str !== (text2.__t ?? (text2.__t = text2.nodeValue))) {
    text2.__t = str;
    text2.nodeValue = str + "";
  }
}
function mount(component2, options) {
  return _mount(component2, options);
}
function hydrate(component2, options) {
  init_operations();
  options.intro = options.intro ?? false;
  const target = options.target;
  const was_hydrating = hydrating;
  const previous_hydrate_node = hydrate_node;
  try {
    var anchor = (
      /** @type {TemplateNode} */
      get_first_child(target)
    );
    while (anchor && (anchor.nodeType !== COMMENT_NODE || /** @type {Comment} */
    anchor.data !== HYDRATION_START)) {
      anchor = /** @type {TemplateNode} */
      get_next_sibling(anchor);
    }
    if (!anchor) {
      throw HYDRATION_ERROR;
    }
    set_hydrating(true);
    set_hydrate_node(
      /** @type {Comment} */
      anchor
    );
    const instance = _mount(component2, { ...options, anchor });
    set_hydrating(false);
    return (
      /**  @type {Exports} */
      instance
    );
  } catch (error) {
    if (error instanceof Error && error.message.split("\n").some((line) => line.startsWith("https://svelte.dev/e/"))) {
      throw error;
    }
    if (error !== HYDRATION_ERROR) {
      console.warn("Failed to hydrate: ", error);
    }
    if (options.recover === false) {
      hydration_failed();
    }
    init_operations();
    clear_text_content(target);
    set_hydrating(false);
    return mount(component2, options);
  } finally {
    set_hydrating(was_hydrating);
    set_hydrate_node(previous_hydrate_node);
    reset_head_anchor();
  }
}
var document_listeners = /* @__PURE__ */ new Map();
function _mount(Component, { target, anchor, props = {}, events, context, intro = true }) {
  init_operations();
  var registered_events = /* @__PURE__ */ new Set();
  var event_handle = (events2) => {
    for (var i = 0; i < events2.length; i++) {
      var event_name = events2[i];
      if (registered_events.has(event_name)) continue;
      registered_events.add(event_name);
      var passive2 = is_passive_event(event_name);
      target.addEventListener(event_name, handle_event_propagation, { passive: passive2 });
      var n = document_listeners.get(event_name);
      if (n === void 0) {
        document.addEventListener(event_name, handle_event_propagation, { passive: passive2 });
        document_listeners.set(event_name, 1);
      } else {
        document_listeners.set(event_name, n + 1);
      }
    }
  };
  event_handle(array_from(all_registered_events));
  root_event_handles.add(event_handle);
  var component2 = void 0;
  var unmount2 = component_root(() => {
    var anchor_node = anchor ?? target.appendChild(create_text());
    boundary(
      /** @type {TemplateNode} */
      anchor_node,
      {
        pending: () => {
        }
      },
      (anchor_node2) => {
        if (context) {
          push({});
          var ctx = (
            /** @type {ComponentContext} */
            component_context
          );
          ctx.c = context;
        }
        if (events) {
          props.$$events = events;
        }
        if (hydrating) {
          assign_nodes(
            /** @type {TemplateNode} */
            anchor_node2,
            null
          );
        }
        should_intro = intro;
        component2 = Component(anchor_node2, props) || {};
        should_intro = true;
        if (hydrating) {
          active_effect.nodes_end = hydrate_node;
          if (hydrate_node === null || hydrate_node.nodeType !== COMMENT_NODE || /** @type {Comment} */
          hydrate_node.data !== HYDRATION_END) {
            hydration_mismatch();
            throw HYDRATION_ERROR;
          }
        }
        if (context) {
          pop();
        }
      }
    );
    return () => {
      for (var event_name of registered_events) {
        target.removeEventListener(event_name, handle_event_propagation);
        var n = (
          /** @type {number} */
          document_listeners.get(event_name)
        );
        if (--n === 0) {
          document.removeEventListener(event_name, handle_event_propagation);
          document_listeners.delete(event_name);
        } else {
          document_listeners.set(event_name, n);
        }
      }
      root_event_handles.delete(event_handle);
      if (anchor_node !== anchor) {
        anchor_node.parentNode?.removeChild(anchor_node);
      }
    };
  });
  mounted_components.set(component2, unmount2);
  return component2;
}
var mounted_components = /* @__PURE__ */ new WeakMap();
function unmount(component2, options) {
  const fn = mounted_components.get(component2);
  if (fn) {
    mounted_components.delete(component2);
    return fn(options);
  }
  if (dev_fallback_default) {
    if (STATE_SYMBOL in component2) {
      state_proxy_unmount();
    } else {
      lifecycle_double_unmount();
    }
  }
  return Promise.resolve();
}

// node_modules/svelte/src/index-client.js
if (dev_fallback_default) {
  let throw_rune_error = function(rune) {
    if (!(rune in globalThis)) {
      let value;
      Object.defineProperty(globalThis, rune, {
        configurable: true,
        // eslint-disable-next-line getter-return
        get: () => {
          if (value !== void 0) {
            return value;
          }
          rune_outside_svelte(rune);
        },
        set: (v) => {
          value = v;
        }
      });
    }
  };
  throw_rune_error("$state");
  throw_rune_error("$effect");
  throw_rune_error("$derived");
  throw_rune_error("$inspect");
  throw_rune_error("$props");
  throw_rune_error("$bindable");
}
function create_custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
  return new CustomEvent(type, { detail, bubbles, cancelable });
}
function createEventDispatcher() {
  const active_component_context = component_context;
  if (active_component_context === null) {
    lifecycle_outside_component("createEventDispatcher");
  }
  return (type, detail, options) => {
    const events = (
      /** @type {Record<string, Function | Function[]>} */
      active_component_context.s.$$events?.[
        /** @type {string} */
        type
      ]
    );
    if (events) {
      const callbacks = is_array(events) ? events.slice() : [events];
      const event2 = create_custom_event(
        /** @type {string} */
        type,
        detail,
        options
      );
      for (const fn of callbacks) {
        fn.call(active_component_context.x, event2);
      }
      return !event2.defaultPrevented;
    }
    return true;
  };
}

// node_modules/svelte/src/internal/client/dom/blocks/if.js
function if_block(node, fn, elseif = false) {
  if (hydrating) {
    hydrate_next();
  }
  var anchor = node;
  var consequent_effect = null;
  var alternate_effect = null;
  var condition = UNINITIALIZED;
  var flags2 = elseif ? EFFECT_TRANSPARENT : 0;
  var has_branch = false;
  const set_branch = (fn2, flag = true) => {
    has_branch = true;
    update_branch(flag, fn2);
  };
  var offscreen_fragment = null;
  function commit() {
    if (offscreen_fragment !== null) {
      offscreen_fragment.lastChild.remove();
      anchor.before(offscreen_fragment);
      offscreen_fragment = null;
    }
    var active = condition ? consequent_effect : alternate_effect;
    var inactive = condition ? alternate_effect : consequent_effect;
    if (active) {
      resume_effect(active);
    }
    if (inactive) {
      pause_effect(inactive, () => {
        if (condition) {
          alternate_effect = null;
        } else {
          consequent_effect = null;
        }
      });
    }
  }
  const update_branch = (new_condition, fn2) => {
    if (condition === (condition = new_condition)) return;
    let mismatch = false;
    if (hydrating) {
      const is_else = read_hydration_instruction(anchor) === HYDRATION_START_ELSE;
      if (!!condition === is_else) {
        anchor = skip_nodes();
        set_hydrate_node(anchor);
        set_hydrating(false);
        mismatch = true;
      }
    }
    var defer = should_defer_append();
    var target = anchor;
    if (defer) {
      offscreen_fragment = document.createDocumentFragment();
      offscreen_fragment.append(target = create_text());
    }
    if (condition) {
      consequent_effect ?? (consequent_effect = fn2 && branch(() => fn2(target)));
    } else {
      alternate_effect ?? (alternate_effect = fn2 && branch(() => fn2(target)));
    }
    if (defer) {
      var batch = (
        /** @type {Batch} */
        current_batch
      );
      var active = condition ? consequent_effect : alternate_effect;
      var inactive = condition ? alternate_effect : consequent_effect;
      if (active) batch.skipped_effects.delete(active);
      if (inactive) batch.skipped_effects.add(inactive);
      batch.add_callback(commit);
    } else {
      commit();
    }
    if (mismatch) {
      set_hydrating(true);
    }
  };
  block(() => {
    has_branch = false;
    fn(set_branch);
    if (!has_branch) {
      update_branch(null, null);
    }
  }, flags2);
  if (hydrating) {
    anchor = hydrate_node;
  }
}

// node_modules/svelte/src/internal/client/dom/blocks/each.js
var current_each_item = null;
function index(_, i) {
  return i;
}
function pause_effects(state2, items, controlled_anchor) {
  var items_map = state2.items;
  var transitions = [];
  var length = items.length;
  for (var i = 0; i < length; i++) {
    pause_children(items[i].e, transitions, true);
  }
  var is_controlled = length > 0 && transitions.length === 0 && controlled_anchor !== null;
  if (is_controlled) {
    var parent_node = (
      /** @type {Element} */
      /** @type {Element} */
      controlled_anchor.parentNode
    );
    clear_text_content(parent_node);
    parent_node.append(
      /** @type {Element} */
      controlled_anchor
    );
    items_map.clear();
    link(state2, items[0].prev, items[length - 1].next);
  }
  run_out_transitions(transitions, () => {
    for (var i2 = 0; i2 < length; i2++) {
      var item = items[i2];
      if (!is_controlled) {
        items_map.delete(item.k);
        link(state2, item.prev, item.next);
      }
      destroy_effect(item.e, !is_controlled);
    }
  });
}
function each(node, flags2, get_collection, get_key, render_fn, fallback_fn = null) {
  var anchor = node;
  var state2 = { flags: flags2, items: /* @__PURE__ */ new Map(), first: null };
  var is_controlled = (flags2 & EACH_IS_CONTROLLED) !== 0;
  if (is_controlled) {
    var parent_node = (
      /** @type {Element} */
      node
    );
    anchor = hydrating ? set_hydrate_node(
      /** @type {Comment | Text} */
      get_first_child(parent_node)
    ) : parent_node.appendChild(create_text());
  }
  if (hydrating) {
    hydrate_next();
  }
  var fallback2 = null;
  var was_empty = false;
  var offscreen_items = /* @__PURE__ */ new Map();
  var each_array = derived_safe_equal(() => {
    var collection = get_collection();
    return is_array(collection) ? collection : collection == null ? [] : array_from(collection);
  });
  var array;
  var each_effect;
  function commit() {
    reconcile(
      each_effect,
      array,
      state2,
      offscreen_items,
      anchor,
      render_fn,
      flags2,
      get_key,
      get_collection
    );
    if (fallback_fn !== null) {
      if (array.length === 0) {
        if (fallback2) {
          resume_effect(fallback2);
        } else {
          fallback2 = branch(() => fallback_fn(anchor));
        }
      } else if (fallback2 !== null) {
        pause_effect(fallback2, () => {
          fallback2 = null;
        });
      }
    }
  }
  block(() => {
    each_effect ?? (each_effect = /** @type {Effect} */
    active_effect);
    array = /** @type {V[]} */
    get(each_array);
    var length = array.length;
    if (was_empty && length === 0) {
      return;
    }
    was_empty = length === 0;
    let mismatch = false;
    if (hydrating) {
      var is_else = read_hydration_instruction(anchor) === HYDRATION_START_ELSE;
      if (is_else !== (length === 0)) {
        anchor = skip_nodes();
        set_hydrate_node(anchor);
        set_hydrating(false);
        mismatch = true;
      }
    }
    if (hydrating) {
      var prev = null;
      var item;
      for (var i = 0; i < length; i++) {
        if (hydrate_node.nodeType === COMMENT_NODE && /** @type {Comment} */
        hydrate_node.data === HYDRATION_END) {
          anchor = /** @type {Comment} */
          hydrate_node;
          mismatch = true;
          set_hydrating(false);
          break;
        }
        var value = array[i];
        var key2 = get_key(value, i);
        item = create_item(
          hydrate_node,
          state2,
          prev,
          null,
          value,
          key2,
          i,
          render_fn,
          flags2,
          get_collection
        );
        state2.items.set(key2, item);
        prev = item;
      }
      if (length > 0) {
        set_hydrate_node(skip_nodes());
      }
    }
    if (hydrating) {
      if (length === 0 && fallback_fn) {
        fallback2 = branch(() => fallback_fn(anchor));
      }
    } else {
      if (should_defer_append()) {
        var keys = /* @__PURE__ */ new Set();
        var batch = (
          /** @type {Batch} */
          current_batch
        );
        for (i = 0; i < length; i += 1) {
          value = array[i];
          key2 = get_key(value, i);
          var existing = state2.items.get(key2) ?? offscreen_items.get(key2);
          if (existing) {
            if ((flags2 & (EACH_ITEM_REACTIVE | EACH_INDEX_REACTIVE)) !== 0) {
              update_item(existing, value, i, flags2);
            }
          } else {
            item = create_item(
              null,
              state2,
              null,
              null,
              value,
              key2,
              i,
              render_fn,
              flags2,
              get_collection,
              true
            );
            offscreen_items.set(key2, item);
          }
          keys.add(key2);
        }
        for (const [key3, item2] of state2.items) {
          if (!keys.has(key3)) {
            batch.skipped_effects.add(item2.e);
          }
        }
        batch.add_callback(commit);
      } else {
        commit();
      }
    }
    if (mismatch) {
      set_hydrating(true);
    }
    get(each_array);
  });
  if (hydrating) {
    anchor = hydrate_node;
  }
}
function reconcile(each_effect, array, state2, offscreen_items, anchor, render_fn, flags2, get_key, get_collection) {
  var is_animated = (flags2 & EACH_IS_ANIMATED) !== 0;
  var should_update = (flags2 & (EACH_ITEM_REACTIVE | EACH_INDEX_REACTIVE)) !== 0;
  var length = array.length;
  var items = state2.items;
  var first = state2.first;
  var current = first;
  var seen;
  var prev = null;
  var to_animate;
  var matched = [];
  var stashed = [];
  var value;
  var key2;
  var item;
  var i;
  if (is_animated) {
    for (i = 0; i < length; i += 1) {
      value = array[i];
      key2 = get_key(value, i);
      item = items.get(key2);
      if (item !== void 0) {
        item.a?.measure();
        (to_animate ?? (to_animate = /* @__PURE__ */ new Set())).add(item);
      }
    }
  }
  for (i = 0; i < length; i += 1) {
    value = array[i];
    key2 = get_key(value, i);
    item = items.get(key2);
    if (item === void 0) {
      var pending2 = offscreen_items.get(key2);
      if (pending2 !== void 0) {
        offscreen_items.delete(key2);
        items.set(key2, pending2);
        var next2 = prev ? prev.next : current;
        link(state2, prev, pending2);
        link(state2, pending2, next2);
        move(pending2, next2, anchor);
        prev = pending2;
      } else {
        var child_anchor = current ? (
          /** @type {TemplateNode} */
          current.e.nodes_start
        ) : anchor;
        prev = create_item(
          child_anchor,
          state2,
          prev,
          prev === null ? state2.first : prev.next,
          value,
          key2,
          i,
          render_fn,
          flags2,
          get_collection
        );
      }
      items.set(key2, prev);
      matched = [];
      stashed = [];
      current = prev.next;
      continue;
    }
    if (should_update) {
      update_item(item, value, i, flags2);
    }
    if ((item.e.f & INERT) !== 0) {
      resume_effect(item.e);
      if (is_animated) {
        item.a?.unfix();
        (to_animate ?? (to_animate = /* @__PURE__ */ new Set())).delete(item);
      }
    }
    if (item !== current) {
      if (seen !== void 0 && seen.has(item)) {
        if (matched.length < stashed.length) {
          var start = stashed[0];
          var j;
          prev = start.prev;
          var a = matched[0];
          var b = matched[matched.length - 1];
          for (j = 0; j < matched.length; j += 1) {
            move(matched[j], start, anchor);
          }
          for (j = 0; j < stashed.length; j += 1) {
            seen.delete(stashed[j]);
          }
          link(state2, a.prev, b.next);
          link(state2, prev, a);
          link(state2, b, start);
          current = start;
          prev = b;
          i -= 1;
          matched = [];
          stashed = [];
        } else {
          seen.delete(item);
          move(item, current, anchor);
          link(state2, item.prev, item.next);
          link(state2, item, prev === null ? state2.first : prev.next);
          link(state2, prev, item);
          prev = item;
        }
        continue;
      }
      matched = [];
      stashed = [];
      while (current !== null && current.k !== key2) {
        if ((current.e.f & INERT) === 0) {
          (seen ?? (seen = /* @__PURE__ */ new Set())).add(current);
        }
        stashed.push(current);
        current = current.next;
      }
      if (current === null) {
        continue;
      }
      item = current;
    }
    matched.push(item);
    prev = item;
    current = item.next;
  }
  if (current !== null || seen !== void 0) {
    var to_destroy = seen === void 0 ? [] : array_from(seen);
    while (current !== null) {
      if ((current.e.f & INERT) === 0) {
        to_destroy.push(current);
      }
      current = current.next;
    }
    var destroy_length = to_destroy.length;
    if (destroy_length > 0) {
      var controlled_anchor = (flags2 & EACH_IS_CONTROLLED) !== 0 && length === 0 ? anchor : null;
      if (is_animated) {
        for (i = 0; i < destroy_length; i += 1) {
          to_destroy[i].a?.measure();
        }
        for (i = 0; i < destroy_length; i += 1) {
          to_destroy[i].a?.fix();
        }
      }
      pause_effects(state2, to_destroy, controlled_anchor);
    }
  }
  if (is_animated) {
    queue_micro_task(() => {
      if (to_animate === void 0) return;
      for (item of to_animate) {
        item.a?.apply();
      }
    });
  }
  each_effect.first = state2.first && state2.first.e;
  each_effect.last = prev && prev.e;
  for (var unused of offscreen_items.values()) {
    destroy_effect(unused.e);
  }
  offscreen_items.clear();
}
function update_item(item, value, index2, type) {
  if ((type & EACH_ITEM_REACTIVE) !== 0) {
    internal_set(item.v, value);
  }
  if ((type & EACH_INDEX_REACTIVE) !== 0) {
    internal_set(
      /** @type {Value<number>} */
      item.i,
      index2
    );
  } else {
    item.i = index2;
  }
}
function create_item(anchor, state2, prev, next2, value, key2, index2, render_fn, flags2, get_collection, deferred2) {
  var previous_each_item = current_each_item;
  var reactive = (flags2 & EACH_ITEM_REACTIVE) !== 0;
  var mutable = (flags2 & EACH_ITEM_IMMUTABLE) === 0;
  var v = reactive ? mutable ? mutable_source(value, false, false) : source(value) : value;
  var i = (flags2 & EACH_INDEX_REACTIVE) === 0 ? index2 : source(index2);
  if (dev_fallback_default && reactive) {
    v.trace = () => {
      var collection_index = typeof i === "number" ? index2 : i.v;
      get_collection()[collection_index];
    };
  }
  var item = {
    i,
    v,
    k: key2,
    a: null,
    // @ts-expect-error
    e: null,
    prev,
    next: next2
  };
  current_each_item = item;
  try {
    if (anchor === null) {
      var fragment = document.createDocumentFragment();
      fragment.append(anchor = create_text());
    }
    item.e = branch(() => render_fn(
      /** @type {Node} */
      anchor,
      v,
      i,
      get_collection
    ), hydrating);
    item.e.prev = prev && prev.e;
    item.e.next = next2 && next2.e;
    if (prev === null) {
      if (!deferred2) {
        state2.first = item;
      }
    } else {
      prev.next = item;
      prev.e.next = item.e;
    }
    if (next2 !== null) {
      next2.prev = item;
      next2.e.prev = item.e;
    }
    return item;
  } finally {
    current_each_item = previous_each_item;
  }
}
function move(item, next2, anchor) {
  var end = item.next ? (
    /** @type {TemplateNode} */
    item.next.e.nodes_start
  ) : anchor;
  var dest = next2 ? (
    /** @type {TemplateNode} */
    next2.e.nodes_start
  ) : anchor;
  var node = (
    /** @type {TemplateNode} */
    item.e.nodes_start
  );
  while (node !== null && node !== end) {
    var next_node = (
      /** @type {TemplateNode} */
      get_next_sibling(node)
    );
    dest.before(node);
    node = next_node;
  }
}
function link(state2, prev, next2) {
  if (prev === null) {
    state2.first = next2;
  } else {
    prev.next = next2;
    prev.e.next = next2 && next2.e;
  }
  if (next2 !== null) {
    next2.prev = prev;
    next2.e.prev = prev && prev.e;
  }
}

// node_modules/svelte/src/internal/shared/attributes.js
var whitespace = [..." 	\n\r\f\xA0\v\uFEFF"];
function to_class(value, hash2, directives) {
  var classname = value == null ? "" : "" + value;
  if (hash2) {
    classname = classname ? classname + " " + hash2 : hash2;
  }
  if (directives) {
    for (var key2 in directives) {
      if (directives[key2]) {
        classname = classname ? classname + " " + key2 : key2;
      } else if (classname.length) {
        var len = key2.length;
        var a = 0;
        while ((a = classname.indexOf(key2, a)) >= 0) {
          var b = a + len;
          if ((a === 0 || whitespace.includes(classname[a - 1])) && (b === classname.length || whitespace.includes(classname[b]))) {
            classname = (a === 0 ? "" : classname.substring(0, a)) + classname.substring(b + 1);
          } else {
            a = b;
          }
        }
      }
    }
  }
  return classname === "" ? null : classname;
}

// node_modules/svelte/src/internal/client/dom/elements/class.js
function set_class(dom, is_html, value, hash2, prev_classes, next_classes) {
  var prev = dom.__className;
  if (hydrating || prev !== value || prev === void 0) {
    var next_class_name = to_class(value, hash2, next_classes);
    if (!hydrating || next_class_name !== dom.getAttribute("class")) {
      if (next_class_name == null) {
        dom.removeAttribute("class");
      } else if (is_html) {
        dom.className = next_class_name;
      } else {
        dom.setAttribute("class", next_class_name);
      }
    }
    dom.__className = value;
  } else if (next_classes && prev_classes !== next_classes) {
    for (var key2 in next_classes) {
      var is_present = !!next_classes[key2];
      if (prev_classes == null || is_present !== !!prev_classes[key2]) {
        dom.classList.toggle(key2, is_present);
      }
    }
  }
  return next_classes;
}

// node_modules/svelte/src/internal/client/dom/elements/bindings/select.js
function select_option(select, value, mounting = false) {
  if (select.multiple) {
    if (value == void 0) {
      return;
    }
    if (!is_array(value)) {
      return select_multiple_invalid_value();
    }
    for (var option of select.options) {
      option.selected = value.includes(get_option_value(option));
    }
    return;
  }
  for (option of select.options) {
    var option_value = get_option_value(option);
    if (is(option_value, value)) {
      option.selected = true;
      return;
    }
  }
  if (!mounting || value !== void 0) {
    select.selectedIndex = -1;
  }
}
function init_select(select) {
  var observer = new MutationObserver(() => {
    select_option(select, select.__value);
  });
  observer.observe(select, {
    // Listen to option element changes
    childList: true,
    subtree: true,
    // because of <optgroup>
    // Listen to option element value attribute changes
    // (doesn't get notified of select value changes,
    // because that property is not reflected as an attribute)
    attributes: true,
    attributeFilter: ["value"]
  });
  teardown(() => {
    observer.disconnect();
  });
}
function bind_select_value(select, get3, set2 = get3) {
  var mounting = true;
  listen_to_event_and_reset_event(select, "change", (is_reset) => {
    var query = is_reset ? "[selected]" : ":checked";
    var value;
    if (select.multiple) {
      value = [].map.call(select.querySelectorAll(query), get_option_value);
    } else {
      var selected_option = select.querySelector(query) ?? // will fall back to first non-disabled option if no option is selected
      select.querySelector("option:not([disabled])");
      value = selected_option && get_option_value(selected_option);
    }
    set2(value);
  });
  effect(() => {
    var value = get3();
    select_option(select, value, mounting);
    if (mounting && value === void 0) {
      var selected_option = select.querySelector(":checked");
      if (selected_option !== null) {
        value = get_option_value(selected_option);
        set2(value);
      }
    }
    select.__value = value;
    mounting = false;
  });
  init_select(select);
}
function get_option_value(option) {
  if ("__value" in option) {
    return option.__value;
  } else {
    return option.value;
  }
}

// node_modules/svelte/src/internal/client/dom/elements/attributes.js
var CLASS = Symbol("class");
var STYLE = Symbol("style");
var IS_CUSTOM_ELEMENT = Symbol("is custom element");
var IS_HTML = Symbol("is html");
function remove_input_defaults(input) {
  if (!hydrating) return;
  var already_removed = false;
  var remove_defaults = () => {
    if (already_removed) return;
    already_removed = true;
    if (input.hasAttribute("value")) {
      var value = input.value;
      set_attribute2(input, "value", null);
      input.value = value;
    }
    if (input.hasAttribute("checked")) {
      var checked = input.checked;
      set_attribute2(input, "checked", null);
      input.checked = checked;
    }
  };
  input.__on_r = remove_defaults;
  queue_micro_task(remove_defaults);
  add_form_reset_listener();
}
function set_value(element2, value) {
  var attributes = get_attributes(element2);
  if (attributes.value === (attributes.value = // treat null and undefined the same for the initial value
  value ?? void 0) || // @ts-expect-error
  // `progress` elements always need their value set when it's `0`
  element2.value === value && (value !== 0 || element2.nodeName !== "PROGRESS")) {
    return;
  }
  element2.value = value ?? "";
}
function set_checked(element2, checked) {
  var attributes = get_attributes(element2);
  if (attributes.checked === (attributes.checked = // treat null and undefined the same for the initial value
  checked ?? void 0)) {
    return;
  }
  element2.checked = checked;
}
function set_attribute2(element2, attribute, value, skip_warning) {
  var attributes = get_attributes(element2);
  if (hydrating) {
    attributes[attribute] = element2.getAttribute(attribute);
    if (attribute === "src" || attribute === "srcset" || attribute === "href" && element2.nodeName === "LINK") {
      if (!skip_warning) {
        check_src_in_dev_hydration(element2, attribute, value ?? "");
      }
      return;
    }
  }
  if (attributes[attribute] === (attributes[attribute] = value)) return;
  if (attribute === "loading") {
    element2[LOADING_ATTR_SYMBOL] = value;
  }
  if (value == null) {
    element2.removeAttribute(attribute);
  } else if (typeof value !== "string" && get_setters(element2).includes(attribute)) {
    element2[attribute] = value;
  } else {
    element2.setAttribute(attribute, value);
  }
}
function get_attributes(element2) {
  return (
    /** @type {Record<string | symbol, unknown>} **/
    // @ts-expect-error
    element2.__attributes ?? (element2.__attributes = {
      [IS_CUSTOM_ELEMENT]: element2.nodeName.includes("-"),
      [IS_HTML]: element2.namespaceURI === NAMESPACE_HTML
    })
  );
}
var setters_cache = /* @__PURE__ */ new Map();
function get_setters(element2) {
  var cache_key = element2.getAttribute("is") || element2.nodeName;
  var setters = setters_cache.get(cache_key);
  if (setters) return setters;
  setters_cache.set(cache_key, setters = []);
  var descriptors;
  var proto = element2;
  var element_proto = Element.prototype;
  while (element_proto !== proto) {
    descriptors = get_descriptors(proto);
    for (var key2 in descriptors) {
      if (descriptors[key2].set) {
        setters.push(key2);
      }
    }
    proto = get_prototype_of(proto);
  }
  return setters;
}
function check_src_in_dev_hydration(element2, attribute, value) {
  if (!dev_fallback_default) return;
  if (attribute === "srcset" && srcset_url_equal(element2, value)) return;
  if (src_url_equal(element2.getAttribute(attribute) ?? "", value)) return;
  hydration_attribute_changed(
    attribute,
    element2.outerHTML.replace(element2.innerHTML, element2.innerHTML && "..."),
    String(value)
  );
}
function src_url_equal(element_src, url) {
  if (element_src === url) return true;
  return new URL(element_src, document.baseURI).href === new URL(url, document.baseURI).href;
}
function split_srcset(srcset) {
  return srcset.split(",").map((src) => src.trim().split(" ").filter(Boolean));
}
function srcset_url_equal(element2, srcset) {
  var element_urls = split_srcset(element2.srcset);
  var urls = split_srcset(srcset);
  return urls.length === element_urls.length && urls.every(
    ([url, width], i) => width === element_urls[i][1] && // We need to test both ways because Vite will create an a full URL with
    // `new URL(asset, import.meta.url).href` for the client when `base: './'`, and the
    // relative URLs inside srcset are not automatically resolved to absolute URLs by
    // browsers (in contrast to img.src). This means both SSR and DOM code could
    // contain relative or absolute URLs.
    (src_url_equal(element_urls[i][0], url) || src_url_equal(url, element_urls[i][0]))
  );
}

// node_modules/svelte/src/internal/client/dom/legacy/event-modifiers.js
function stopPropagation(fn) {
  return function(...args) {
    var event2 = (
      /** @type {Event} */
      args[0]
    );
    event2.stopPropagation();
    return fn?.apply(this, args);
  };
}
function preventDefault(fn) {
  return function(...args) {
    var event2 = (
      /** @type {Event} */
      args[0]
    );
    event2.preventDefault();
    return fn?.apply(this, args);
  };
}

// node_modules/svelte/src/internal/client/dom/legacy/lifecycle.js
function init(immutable = false) {
  const context = (
    /** @type {ComponentContextLegacy} */
    component_context
  );
  const callbacks = context.l.u;
  if (!callbacks) return;
  let props = () => deep_read_state(context.s);
  if (immutable) {
    let version = 0;
    let prev = (
      /** @type {Record<string, any>} */
      {}
    );
    const d = derived(() => {
      let changed = false;
      const props2 = context.s;
      for (const key2 in props2) {
        if (props2[key2] !== prev[key2]) {
          prev[key2] = props2[key2];
          changed = true;
        }
      }
      if (changed) version++;
      return version;
    });
    props = () => get(d);
  }
  if (callbacks.b.length) {
    user_pre_effect(() => {
      observe_all(context, props);
      run_all(callbacks.b);
    });
  }
  user_effect(() => {
    const fns = untrack(() => callbacks.m.map(run));
    return () => {
      for (const fn of fns) {
        if (typeof fn === "function") {
          fn();
        }
      }
    };
  });
  if (callbacks.a.length) {
    user_effect(() => {
      observe_all(context, props);
      run_all(callbacks.a);
    });
  }
}
function observe_all(context, props) {
  if (context.l.s) {
    for (const signal of context.l.s) get(signal);
  }
  props();
}

// node_modules/svelte/src/internal/client/dom/legacy/misc.js
function bubble_event($$props, event2) {
  var events = (
    /** @type {Record<string, Function[] | Function>} */
    $$props.$$events?.[event2.type]
  );
  var callbacks = is_array(events) ? events.slice() : events == null ? [] : [events];
  for (var fn of callbacks) {
    fn.call(this, event2);
  }
}

// node_modules/svelte/src/store/utils.js
function subscribe_to_store(store2, run2, invalidate) {
  if (store2 == null) {
    run2(void 0);
    if (invalidate) invalidate(void 0);
    return noop;
  }
  const unsub = untrack(
    () => store2.subscribe(
      run2,
      // @ts-expect-error
      invalidate
    )
  );
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}

// node_modules/svelte/src/store/shared/index.js
var subscriber_queue = [];
function writable(value, start = noop) {
  let stop = null;
  const subscribers = /* @__PURE__ */ new Set();
  function set2(new_value) {
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
    set2(fn(
      /** @type {T} */
      value
    ));
  }
  function subscribe(run2, invalidate = noop) {
    const subscriber = [run2, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set2, update2) || noop;
    }
    run2(
      /** @type {T} */
      value
    );
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0 && stop) {
        stop();
        stop = null;
      }
    };
  }
  return { set: set2, update: update2, subscribe };
}
function get2(store2) {
  let value;
  subscribe_to_store(store2, (_) => value = _)();
  return value;
}

// node_modules/svelte/src/internal/client/reactivity/store.js
var is_store_binding = false;
var IS_UNMOUNTED = Symbol();
function store_get(store2, store_name, stores) {
  const entry = stores[store_name] ?? (stores[store_name] = {
    store: null,
    source: mutable_source(void 0),
    unsubscribe: noop
  });
  if (dev_fallback_default) {
    entry.source.label = store_name;
  }
  if (entry.store !== store2 && !(IS_UNMOUNTED in stores)) {
    entry.unsubscribe();
    entry.store = store2 ?? null;
    if (store2 == null) {
      entry.source.v = void 0;
      entry.unsubscribe = noop;
    } else {
      var is_synchronous_callback = true;
      entry.unsubscribe = subscribe_to_store(store2, (v) => {
        if (is_synchronous_callback) {
          entry.source.v = v;
        } else {
          set(entry.source, v);
        }
      });
      is_synchronous_callback = false;
    }
  }
  if (store2 && IS_UNMOUNTED in stores) {
    return get2(store2);
  }
  return get(entry.source);
}
function setup_stores() {
  const stores = {};
  function cleanup() {
    teardown(() => {
      for (var store_name in stores) {
        const ref = stores[store_name];
        ref.unsubscribe();
      }
      define_property(stores, IS_UNMOUNTED, {
        enumerable: false,
        value: true
      });
    });
  }
  return [stores, cleanup];
}
function capture_store_binding(fn) {
  var previous_is_store_binding = is_store_binding;
  try {
    is_store_binding = false;
    return [fn(), is_store_binding];
  } finally {
    is_store_binding = previous_is_store_binding;
  }
}

// node_modules/svelte/src/internal/client/reactivity/props.js
function prop(props, key2, flags2, fallback2) {
  var runes = !legacy_mode_flag || (flags2 & PROPS_IS_RUNES) !== 0;
  var bindable = (flags2 & PROPS_IS_BINDABLE) !== 0;
  var lazy = (flags2 & PROPS_IS_LAZY_INITIAL) !== 0;
  var fallback_value = (
    /** @type {V} */
    fallback2
  );
  var fallback_dirty = true;
  var get_fallback = () => {
    if (fallback_dirty) {
      fallback_dirty = false;
      fallback_value = lazy ? untrack(
        /** @type {() => V} */
        fallback2
      ) : (
        /** @type {V} */
        fallback2
      );
    }
    return fallback_value;
  };
  var setter;
  if (bindable) {
    var is_entry_props = STATE_SYMBOL in props || LEGACY_PROPS in props;
    setter = get_descriptor(props, key2)?.set ?? (is_entry_props && key2 in props ? (v) => props[key2] = v : void 0);
  }
  var initial_value;
  var is_store_sub = false;
  if (bindable) {
    [initial_value, is_store_sub] = capture_store_binding(() => (
      /** @type {V} */
      props[key2]
    ));
  } else {
    initial_value = /** @type {V} */
    props[key2];
  }
  if (initial_value === void 0 && fallback2 !== void 0) {
    initial_value = get_fallback();
    if (setter) {
      if (runes) props_invalid_value(key2);
      setter(initial_value);
    }
  }
  var getter;
  if (runes) {
    getter = () => {
      var value = (
        /** @type {V} */
        props[key2]
      );
      if (value === void 0) return get_fallback();
      fallback_dirty = true;
      return value;
    };
  } else {
    getter = () => {
      var value = (
        /** @type {V} */
        props[key2]
      );
      if (value !== void 0) {
        fallback_value = /** @type {V} */
        void 0;
      }
      return value === void 0 ? fallback_value : value;
    };
  }
  if (runes && (flags2 & PROPS_IS_UPDATED) === 0) {
    return getter;
  }
  if (setter) {
    var legacy_parent = props.$$legacy;
    return (
      /** @type {() => V} */
      (function(value, mutation) {
        if (arguments.length > 0) {
          if (!runes || !mutation || legacy_parent || is_store_sub) {
            setter(mutation ? getter() : value);
          }
          return value;
        }
        return getter();
      })
    );
  }
  var overridden = false;
  var d = ((flags2 & PROPS_IS_IMMUTABLE) !== 0 ? derived : derived_safe_equal)(() => {
    overridden = false;
    return getter();
  });
  if (dev_fallback_default) {
    d.label = key2;
  }
  if (bindable) get(d);
  var parent_effect = (
    /** @type {Effect} */
    active_effect
  );
  return (
    /** @type {() => V} */
    (function(value, mutation) {
      if (arguments.length > 0) {
        const new_value = mutation ? get(d) : runes && bindable ? proxy(value) : value;
        set(d, new_value);
        overridden = true;
        if (fallback_value !== void 0) {
          fallback_value = new_value;
        }
        return value;
      }
      if (is_destroying_effect && overridden || (parent_effect.f & DESTROYED) !== 0) {
        return d.v;
      }
      return get(d);
    })
  );
}

// node_modules/svelte/src/legacy/legacy-client.js
function createClassComponent(options) {
  return new Svelte4Component(options);
}
var _events, _instance;
var Svelte4Component = class {
  /**
   * @param {ComponentConstructorOptions & {
   *  component: any;
   * }} options
   */
  constructor(options) {
    /** @type {any} */
    __privateAdd(this, _events);
    /** @type {Record<string, any>} */
    __privateAdd(this, _instance);
    var sources = /* @__PURE__ */ new Map();
    var add_source = (key2, value) => {
      var s = mutable_source(value, false, false);
      sources.set(key2, s);
      return s;
    };
    const props = new Proxy(
      { ...options.props || {}, $$events: {} },
      {
        get(target, prop2) {
          return get(sources.get(prop2) ?? add_source(prop2, Reflect.get(target, prop2)));
        },
        has(target, prop2) {
          if (prop2 === LEGACY_PROPS) return true;
          get(sources.get(prop2) ?? add_source(prop2, Reflect.get(target, prop2)));
          return Reflect.has(target, prop2);
        },
        set(target, prop2, value) {
          set(sources.get(prop2) ?? add_source(prop2, value), value);
          return Reflect.set(target, prop2, value);
        }
      }
    );
    __privateSet(this, _instance, (options.hydrate ? hydrate : mount)(options.component, {
      target: options.target,
      anchor: options.anchor,
      props,
      context: options.context,
      intro: options.intro ?? false,
      recover: options.recover
    }));
    if (!async_mode_flag && (!options?.props?.$$host || options.sync === false)) {
      flushSync();
    }
    __privateSet(this, _events, props.$$events);
    for (const key2 of Object.keys(__privateGet(this, _instance))) {
      if (key2 === "$set" || key2 === "$destroy" || key2 === "$on") continue;
      define_property(this, key2, {
        get() {
          return __privateGet(this, _instance)[key2];
        },
        /** @param {any} value */
        set(value) {
          __privateGet(this, _instance)[key2] = value;
        },
        enumerable: true
      });
    }
    __privateGet(this, _instance).$set = /** @param {Record<string, any>} next */
    (next2) => {
      Object.assign(props, next2);
    };
    __privateGet(this, _instance).$destroy = () => {
      unmount(__privateGet(this, _instance));
    };
  }
  /** @param {Record<string, any>} props */
  $set(props) {
    __privateGet(this, _instance).$set(props);
  }
  /**
   * @param {string} event
   * @param {(...args: any[]) => any} callback
   * @returns {any}
   */
  $on(event2, callback) {
    __privateGet(this, _events)[event2] = __privateGet(this, _events)[event2] || [];
    const cb = (...args) => callback.call(this, ...args);
    __privateGet(this, _events)[event2].push(cb);
    return () => {
      __privateGet(this, _events)[event2] = __privateGet(this, _events)[event2].filter(
        /** @param {any} fn */
        (fn) => fn !== cb
      );
    };
  }
  $destroy() {
    __privateGet(this, _instance).$destroy();
  }
};
_events = new WeakMap();
_instance = new WeakMap();

// node_modules/svelte/src/internal/client/dom/elements/custom-element.js
var SvelteElement;
if (typeof HTMLElement === "function") {
  SvelteElement = class extends HTMLElement {
    /**
     * @param {*} $$componentCtor
     * @param {*} $$slots
     * @param {*} use_shadow_dom
     */
    constructor($$componentCtor, $$slots, use_shadow_dom) {
      super();
      /** The Svelte component constructor */
      __publicField(this, "$$ctor");
      /** Slots */
      __publicField(this, "$$s");
      /** @type {any} The Svelte component instance */
      __publicField(this, "$$c");
      /** Whether or not the custom element is connected */
      __publicField(this, "$$cn", false);
      /** @type {Record<string, any>} Component props data */
      __publicField(this, "$$d", {});
      /** `true` if currently in the process of reflecting component props back to attributes */
      __publicField(this, "$$r", false);
      /** @type {Record<string, CustomElementPropDefinition>} Props definition (name, reflected, type etc) */
      __publicField(this, "$$p_d", {});
      /** @type {Record<string, EventListenerOrEventListenerObject[]>} Event listeners */
      __publicField(this, "$$l", {});
      /** @type {Map<EventListenerOrEventListenerObject, Function>} Event listener unsubscribe functions */
      __publicField(this, "$$l_u", /* @__PURE__ */ new Map());
      /** @type {any} The managed render effect for reflecting attributes */
      __publicField(this, "$$me");
      this.$$ctor = $$componentCtor;
      this.$$s = $$slots;
      if (use_shadow_dom) {
        this.attachShadow({ mode: "open" });
      }
    }
    /**
     * @param {string} type
     * @param {EventListenerOrEventListenerObject} listener
     * @param {boolean | AddEventListenerOptions} [options]
     */
    addEventListener(type, listener, options) {
      this.$$l[type] = this.$$l[type] || [];
      this.$$l[type].push(listener);
      if (this.$$c) {
        const unsub = this.$$c.$on(type, listener);
        this.$$l_u.set(listener, unsub);
      }
      super.addEventListener(type, listener, options);
    }
    /**
     * @param {string} type
     * @param {EventListenerOrEventListenerObject} listener
     * @param {boolean | AddEventListenerOptions} [options]
     */
    removeEventListener(type, listener, options) {
      super.removeEventListener(type, listener, options);
      if (this.$$c) {
        const unsub = this.$$l_u.get(listener);
        if (unsub) {
          unsub();
          this.$$l_u.delete(listener);
        }
      }
    }
    async connectedCallback() {
      this.$$cn = true;
      if (!this.$$c) {
        let create_slot = function(name) {
          return (anchor) => {
            const slot2 = document.createElement("slot");
            if (name !== "default") slot2.name = name;
            append(anchor, slot2);
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
            if (name === "default" && !this.$$d.children) {
              this.$$d.children = create_slot(name);
              $$slots.default = true;
            } else {
              $$slots[name] = create_slot(name);
            }
          }
        }
        for (const attribute of this.attributes) {
          const name = this.$$g_p(attribute.name);
          if (!(name in this.$$d)) {
            this.$$d[name] = get_custom_element_value(name, attribute.value, this.$$p_d, "toProp");
          }
        }
        for (const key2 in this.$$p_d) {
          if (!(key2 in this.$$d) && this[key2] !== void 0) {
            this.$$d[key2] = this[key2];
            delete this[key2];
          }
        }
        this.$$c = createClassComponent({
          component: this.$$ctor,
          target: this.shadowRoot || this,
          props: {
            ...this.$$d,
            $$slots,
            $$host: this
          }
        });
        this.$$me = effect_root(() => {
          render_effect(() => {
            this.$$r = true;
            for (const key2 of object_keys(this.$$c)) {
              if (!this.$$p_d[key2]?.reflect) continue;
              this.$$d[key2] = this.$$c[key2];
              const attribute_value = get_custom_element_value(
                key2,
                this.$$d[key2],
                this.$$p_d,
                "toAttribute"
              );
              if (attribute_value == null) {
                this.removeAttribute(this.$$p_d[key2].attribute || key2);
              } else {
                this.setAttribute(this.$$p_d[key2].attribute || key2, attribute_value);
              }
            }
            this.$$r = false;
          });
        });
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
    /**
     * @param {string} attr
     * @param {string} _oldValue
     * @param {string} newValue
     */
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
          this.$$me();
          this.$$c = void 0;
        }
      });
    }
    /**
     * @param {string} attribute_name
     */
    $$g_p(attribute_name) {
      return object_keys(this.$$p_d).find(
        (key2) => this.$$p_d[key2].attribute === attribute_name || !this.$$p_d[key2].attribute && key2.toLowerCase() === attribute_name
      ) || attribute_name;
    }
  };
}
function get_custom_element_value(prop2, value, props_definition, transform) {
  const type = props_definition[prop2]?.type;
  value = type === "Boolean" && typeof value !== "boolean" ? value != null : value;
  if (!transform || !props_definition[prop2]) {
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
function get_custom_elements_slots(element2) {
  const result = {};
  element2.childNodes.forEach((node) => {
    result[
      /** @type {Element} node */
      node.slot || "default"
    ] = true;
  });
  return result;
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
var on_click = (_, t) => removeToast(get(t).id);
var root_1 = from_html(`<div role="status"><div class="msg svelte-frpt5f"> </div> <button class="close svelte-frpt5f" title="Dismiss" aria-label="Dismiss notification">&times;</button></div>`);
var root = from_html(`<div class="toast-region svelte-frpt5f" role="region" aria-live="polite"></div>`);
function Toasts($$anchor, $$props) {
  push($$props, true);
  const $toasts = () => store_get(toasts, "$toasts", $$stores);
  const [$$stores, $$cleanup] = setup_stores();
  let ariaLabel = prop($$props, "ariaLabel", 3, "Notifications");
  var div = root();
  each(div, 5, $toasts, (t) => t.id, ($$anchor2, t) => {
    var div_1 = root_1();
    var div_2 = child(div_1);
    var text2 = child(div_2, true);
    reset(div_2);
    var button = sibling(div_2, 2);
    button.__click = [on_click, t];
    reset(div_1);
    template_effect(() => {
      set_class(div_1, 1, `toast ${get(t).type ?? ""}`, "svelte-frpt5f");
      set_text(text2, get(t).message);
    });
    append($$anchor2, div_1);
  });
  reset(div);
  template_effect(() => set_attribute2(div, "aria-label", ariaLabel()));
  append($$anchor, div);
  pop();
  $$cleanup();
}
delegate(["click"]);

// src/webview/App.svelte
var root_2 = from_html(`<button role="tab"> </button>`);
var root_12 = from_html(`<div class="connection-tabs svelte-db2r4i" role="tablist" aria-label="Project connections"></div>`);
var root_4 = from_html(`<div class="auth-reminder svelte-db2r4i" role="alert"><div class="auth-reminder-icon svelte-db2r4i" aria-hidden="true">\u26A0\uFE0F</div> <div class="auth-reminder-body svelte-db2r4i"><div class="auth-reminder-title svelte-db2r4i"> </div> <div class="auth-reminder-detail svelte-db2r4i"><!></div></div> <div class="auth-reminder-actions svelte-db2r4i"><button class="primary svelte-db2r4i">Sign In</button> <button class="secondary svelte-db2r4i">Dismiss</button></div></div>`);
var root_3 = from_html(`<div class="auth-reminders svelte-db2r4i" role="region" aria-label="Authentication reminders"></div>`);
var root_7 = from_html(`<option class="svelte-db2r4i"> </option>`);
var root_8 = from_html(`<div class="query-description svelte-db2r4i"> </div>`);
var root_9 = from_html(`<div class="bulk-actions-toolbar svelte-db2r4i" role="toolbar" aria-label="Bulk actions"><span class="selected-count svelte-db2r4i"> </span> <button class="bulk-btn svelte-db2r4i" title="Bulk Assign"><span class="codicon codicon-person-add svelte-db2r4i"></span> Assign</button> <button class="bulk-btn svelte-db2r4i" title="Bulk Move"><span class="codicon codicon-arrow-right svelte-db2r4i"></span> Move</button> <button class="bulk-btn svelte-db2r4i" title="Bulk Add Tags"><span class="codicon codicon-tag svelte-db2r4i"></span> Tags</button> <button class="bulk-btn danger svelte-db2r4i" title="Bulk Delete"><span class="codicon codicon-trash svelte-db2r4i"></span> Delete</button> <button class="bulk-btn secondary svelte-db2r4i" title="Clear Selection (Esc)"><span class="codicon codicon-close svelte-db2r4i"></span> Clear</button></div>`);
var root_10 = from_html(`<span class="muted svelte-db2r4i"> </span>`);
var root_11 = from_html(`<span class="spinner svelte-db2r4i" role="status" aria-label="Loading" title="Loading"></span>`);
var root_14 = from_html(`<button class="svelte-db2r4i"> </button>`);
var root_122 = from_html(`<span class="muted svelte-db2r4i"> <!></span> <!>`, 1);
var root_15 = from_html(`<span class="nav-status svelte-db2r4i" aria-live="polite">Insert mode \u2014 shortcuts paused (Esc to resume)</span>`);
var root_17 = from_html(`<option class="svelte-db2r4i"> </option>`);
var root_19 = from_html(`<option class="svelte-db2r4i"> </option>`);
var root_21 = from_html(`<option class="svelte-db2r4i"> </option>`);
var root_22 = from_html(`<div class="error-banner svelte-db2r4i" role="alert"><div style="font-weight: 600; margin-bottom: 4px;" class="svelte-db2r4i">\u26A0\uFE0F Error Loading Work Items</div> <div class="svelte-db2r4i"> </div></div>`);
var root_23 = from_html(`<div class="loading svelte-db2r4i"><span class="spinner svelte-db2r4i" role="status" aria-label="Initializing"></span> Initializing extension\u2026</div>`);
var root_25 = from_html(`<div class="loading svelte-db2r4i"><span class="spinner svelte-db2r4i" role="status" aria-label="Loading"></span> Loading work items\u2026</div>`);
var root_31 = from_html(`<span class="timer-indicator svelte-db2r4i"><span class="codicon codicon-clock svelte-db2r4i" aria-hidden="true"></span> </span>`);
var root_32 = from_html(`<div class="work-item-desc svelte-db2r4i"> </div>`);
var root_34 = from_html(`<span class="spinner inline svelte-db2r4i" role="status" aria-label="Generating summary"></span>`);
var root_35 = from_html(`<div class="summary-status svelte-db2r4i" aria-live="polite"> </div>`);
var root_33 = from_html(`<div class="work-item-summary svelte-db2r4i" data-disable-keynav=""><div class="summary-header svelte-db2r4i"><div class="summary-context svelte-db2r4i"><span class="summary-target-label svelte-db2r4i">Comment</span> <span class="summary-provider-badge svelte-db2r4i"> </span></div> <div class="summary-header-actions svelte-db2r4i"><!> <button class="action-btn cancel compact svelte-db2r4i" title="Cancel" aria-label="Cancel"><span class="codicon codicon-close svelte-db2r4i" aria-hidden="true"></span></button></div></div> <textarea class="summary-textarea svelte-db2r4i" placeholder="Draft a concise update for this work item\u2026" rows="3" data-disable-keynav=""></textarea> <div class="summary-actions svelte-db2r4i"><div class="summary-buttons svelte-db2r4i"><button class="action-btn summary-generate svelte-db2r4i"><span class="codicon codicon-rocket svelte-db2r4i" aria-hidden="true"></span> </button> <button class="action-btn summary-apply svelte-db2r4i" title="Apply summary as comment" aria-label="Apply summary as comment"><span class="codicon codicon-check svelte-db2r4i" aria-hidden="true"></span> Apply</button></div> <div class="summary-helper svelte-db2r4i"> </div></div> <!></div>`);
var root_36 = from_html(`<span class="work-item-assignee svelte-db2r4i"><span class="codicon codicon-account svelte-db2r4i" aria-hidden="true"></span> </span>`);
var root_37 = from_html(`<button class="action-btn stop compact svelte-db2r4i" title="Stop timer"><span class="codicon codicon-debug-stop svelte-db2r4i" aria-hidden="true"></span></button>`);
var root_38 = from_html(`<button class="action-btn start compact svelte-db2r4i" title="Start timer"><span class="codicon codicon-play svelte-db2r4i" aria-hidden="true"></span></button>`);
var root_30 = from_html(`<div tabindex="0" draggable="true" role="button"><div class="work-item-header svelte-db2r4i"><input type="checkbox" class="work-item-checkbox svelte-db2r4i"/> <span class="work-item-type-icon svelte-db2r4i"> </span> <span class="work-item-id svelte-db2r4i"> </span> <!> <span> </span></div> <div class="work-item-content svelte-db2r4i"><div class="work-item-title svelte-db2r4i"> </div> <!> <!> <div class="work-item-meta svelte-db2r4i"><span class="work-item-type svelte-db2r4i"> </span> <!></div></div> <div class="work-item-actions svelte-db2r4i"><!> <button class="action-btn view compact svelte-db2r4i" title="View"><span class="codicon codicon-eye svelte-db2r4i" aria-hidden="true"></span></button> <button class="action-btn edit compact svelte-db2r4i" title="Edit"><span class="codicon codicon-edit svelte-db2r4i" aria-hidden="true"></span></button> <button class="action-btn comment compact svelte-db2r4i" title="Comment"><span class="codicon codicon-comment svelte-db2r4i" aria-hidden="true"></span></button></div></div>`);
var root_39 = from_html(`<div class="empty svelte-db2r4i">No items</div>`);
var root_28 = from_html(`<div role="listbox" tabindex="0"><div class="kanban-column-header svelte-db2r4i"><h3 class="svelte-db2r4i"> </h3> <span class="item-count svelte-db2r4i"> </span></div> <div class="kanban-column-content svelte-db2r4i"><!></div></div>`);
var root_27 = from_html(`<div class="kanban-board svelte-db2r4i" aria-label="Kanban board"></div>`);
var root_43 = from_html(`<span class="timer-indicator svelte-db2r4i"><span class="codicon codicon-clock svelte-db2r4i" aria-hidden="true"></span> </span>`);
var root_44 = from_html(`<div class="work-item-desc svelte-db2r4i"> </div>`);
var root_46 = from_html(`<span class="spinner inline svelte-db2r4i" role="status" aria-label="Generating summary"></span>`);
var root_47 = from_html(`<div class="summary-status svelte-db2r4i" aria-live="polite"> </div>`);
var root_45 = from_html(`<div class="work-item-summary svelte-db2r4i" data-disable-keynav=""><div class="summary-header svelte-db2r4i"><div class="summary-context svelte-db2r4i"><span class="summary-target-label svelte-db2r4i">Comment</span> <span class="summary-provider-badge svelte-db2r4i"> </span></div> <div class="summary-header-actions svelte-db2r4i"><!> <button class="action-btn cancel compact svelte-db2r4i" title="Cancel" aria-label="Cancel"><span class="codicon codicon-close svelte-db2r4i" aria-hidden="true"></span></button></div></div> <textarea class="summary-textarea svelte-db2r4i" placeholder="Draft a concise update for this work item\u2026" rows="3" data-disable-keynav=""></textarea> <div class="summary-actions svelte-db2r4i"><div class="summary-buttons svelte-db2r4i"><button class="action-btn summary-generate svelte-db2r4i"><span class="codicon codicon-rocket svelte-db2r4i" aria-hidden="true"></span> </button> <button class="action-btn summary-apply svelte-db2r4i" title="Apply summary as comment" aria-label="Apply summary as comment"><span class="codicon codicon-check svelte-db2r4i" aria-hidden="true"></span> Apply</button></div> <div class="summary-helper svelte-db2r4i"> </div></div> <!></div>`);
var root_48 = from_html(`<span class="codicon codicon-account svelte-db2r4i" aria-hidden="true"></span> `, 1);
var root_49 = from_html(`<span class="codicon codicon-account svelte-db2r4i" aria-hidden="true"></span> Unassigned`, 1);
var root_50 = from_html(`<button class="action-btn stop svelte-db2r4i" title="Stop timer"><span class="codicon codicon-debug-stop svelte-db2r4i" aria-hidden="true"></span> Stop</button>`);
var root_51 = from_html(`<button class="action-btn start svelte-db2r4i" title="Start timer"><span class="codicon codicon-play svelte-db2r4i" aria-hidden="true"></span> Start</button>`);
var root_42 = from_html(`<div tabindex="0" role="button"><div class="work-item-header svelte-db2r4i"><input type="checkbox" class="work-item-checkbox svelte-db2r4i"/> <span class="work-item-type-icon svelte-db2r4i"> </span> <span class="work-item-id svelte-db2r4i"> </span> <!> <span> </span></div> <div class="work-item-content svelte-db2r4i"><div class="work-item-title svelte-db2r4i"> </div> <!> <!> <div class="work-item-meta svelte-db2r4i"><span class="work-item-type svelte-db2r4i"> </span> <span> </span> <span class="work-item-assignee svelte-db2r4i"><!></span></div></div> <div class="work-item-actions svelte-db2r4i"><!> <button class="action-btn view svelte-db2r4i" title="View in browser"><span class="codicon codicon-eye svelte-db2r4i" aria-hidden="true"></span> View</button> <button class="action-btn edit svelte-db2r4i" title="Edit work item"><span class="codicon codicon-edit svelte-db2r4i" aria-hidden="true"></span> Edit</button> <button class="action-btn comment svelte-db2r4i" title="Add comment"><span class="codicon codicon-comment svelte-db2r4i" aria-hidden="true"></span> Comment</button></div></div>`);
var root_41 = from_html(`<div class="items svelte-db2r4i" aria-label="Work items"></div>`);
var root_52 = from_html(`<div class="empty svelte-db2r4i">No work items to display.</div>`);
var root2 = from_html(`<div class="pane svelte-db2r4i"><!> <!> <div class="query-header svelte-db2r4i" role="toolbar" aria-label="Query selection"><div class="query-selector-container svelte-db2r4i"><label for="querySelect" class="query-selector-label svelte-db2r4i">Query</label> <select id="querySelect" class="query-selector svelte-db2r4i" title="Select a query to filter work items" aria-label="Select query"></select> <!></div></div> <!> <div class="pane-header svelte-db2r4i" role="toolbar" aria-label="Work Items actions"><span style="font-weight:600;" class="svelte-db2r4i">Work Items</span> <!> <!> <span class="count svelte-db2r4i"> </span> <!> <!> <span class="actions svelte-db2r4i" style="margin-left:auto;"><span class="filters svelte-db2r4i" aria-label="Filters and sort"><input placeholder="Filter..." aria-label="Filter work items" class="svelte-db2r4i"/> <select aria-label="Filter by work item type" class="svelte-db2r4i"><option class="svelte-db2r4i">All types</option><!></select> <select aria-label="Filter by state" class="svelte-db2r4i"><option class="svelte-db2r4i">All</option><!></select> <select aria-label="Sort items" class="svelte-db2r4i"><option class="svelte-db2r4i">Updated \u2193</option><option class="svelte-db2r4i">ID \u2193</option><option class="svelte-db2r4i">ID \u2191</option><option class="svelte-db2r4i">Title A\u2192Z</option></select></span></span></div> <div class="pane-body svelte-db2r4i" tabindex="0" role="listbox" aria-label="Work items list"><!> <!></div> <!></div>`);
function App($$anchor, $$props) {
  push($$props, false);
  const summaryButtonLabel = mutable_source();
  const summaryHelperText = mutable_source();
  const summaryGenerateDisabled = mutable_source();
  const summaryApplyDisabled = mutable_source();
  const summaryAreaDisabled = mutable_source();
  const kanbanGroups = mutable_source();
  const columnDefs = mutable_source();
  const dispatch = createEventDispatcher();
  let workItemCount2 = prop($$props, "workItemCount", 8, 0);
  let subtitle = prop($$props, "subtitle", 8, "");
  let hasItems = prop($$props, "hasItems", 8, false);
  let timerActive2 = prop($$props, "timerActive", 8, false);
  let timerRunning2 = prop($$props, "timerRunning", 8, false);
  let timerElapsedLabel2 = prop($$props, "timerElapsedLabel", 8, "");
  let activeId2 = prop(
    $$props,
    "activeId",
    8,
    0
    // 0 means none
  );
  let activeTitle2 = prop($$props, "activeTitle", 8, "");
  let items = prop($$props, "items", 24, () => []);
  let kanbanView2 = prop($$props, "kanbanView", 8, false);
  let loading2 = prop($$props, "loading", 8, false);
  let initializing2 = prop($$props, "initializing", 8, false);
  let errorMsg2 = prop($$props, "errorMsg", 8, "");
  let filterText2 = prop($$props, "filterText", 8, "");
  let typeFilter2 = prop($$props, "typeFilter", 12, "");
  let stateFilter2 = prop(
    $$props,
    "stateFilter",
    12,
    "all"
    // one of 'all', columnDefs keys
  );
  let sortKey2 = prop(
    $$props,
    "sortKey",
    12,
    "updated-desc"
    // 'updated-desc' | 'id-desc' | 'id-asc' | 'title-asc'
  );
  let availableStates = prop($$props, "availableStates", 24, () => []);
  let availableTypes = prop($$props, "availableTypes", 24, () => []);
  let selectedQuery2 = prop($$props, "selectedQuery", 12, "My Activity");
  let queryDescription2 = prop($$props, "queryDescription", 8, "");
  let summaryDraft2 = prop($$props, "summaryDraft", 8, "");
  let summaryStatus2 = prop($$props, "summaryStatus", 8, "");
  let summaryProvider2 = prop($$props, "summaryProvider", 8, "builtin");
  let summaryBusy2 = prop($$props, "summaryBusy", 8, false);
  let summaryTargetId = prop($$props, "summaryTargetId", 8, 0);
  let summaryWorkItemId2 = prop($$props, "summaryWorkItemId", 8, 0);
  let focusedIndex = mutable_source(0);
  let selectedItems = mutable_source(/* @__PURE__ */ new Set());
  let keyboardNavigationEnabled = mutable_source(true);
  let connections2 = prop($$props, "connections", 24, () => []);
  let activeConnectionId2 = prop($$props, "activeConnectionId", 8, void 0);
  let authReminders2 = prop($$props, "authReminders", 24, () => []);
  let multiSelectMode = false;
  function toggleItemSelection(id) {
    if (get(selectedItems).has(id)) {
      get(selectedItems).delete(id);
    } else {
      get(selectedItems).add(id);
    }
    set(selectedItems, new Set(get(
      selectedItems
      // Trigger reactivity
    )));
    dispatch("selectionChanged", { selectedIds: Array.from(get(selectedItems)) });
  }
  function clearSelection() {
    get(selectedItems).clear();
    set(
      selectedItems,
      /* @__PURE__ */ new Set()
      // Trigger reactivity
    );
    dispatch("selectionChanged", { selectedIds: [] });
  }
  function selectAll() {
    items().forEach((item) => {
      const id = Number(item.id || item.fields?.["System.Id"]);
      if (id) get(selectedItems).add(id);
    });
    set(selectedItems, new Set(get(
      selectedItems
      // Trigger reactivity
    )));
    dispatch("selectionChanged", { selectedIds: Array.from(get(selectedItems)) });
  }
  function onRefresh() {
    dispatch("refresh");
  }
  function onOpenFirst() {
    if (hasItems()) dispatch("openFirst");
  }
  function onStartTimer() {
    if (hasItems() && !timerActive2()) dispatch("startTimer");
  }
  function onStopTimer() {
    if (timerActive2()) dispatch("stopTimer");
  }
  function onOpenActive() {
    if (timerActive2() && activeId2()) dispatch("openActive", { id: activeId2() });
  }
  function onCreate() {
    dispatch("createWorkItem");
  }
  function onToggleKanban() {
    dispatch("toggleKanban");
  }
  function onReminderSignIn(connectionId) {
    dispatch("authReminderAction", { connectionId, action: "signIn" });
  }
  function onReminderDismiss(connectionId) {
    dispatch("authReminderAction", { connectionId, action: "dismiss" });
  }
  function onFilterInput(e) {
    dispatch("filtersChanged", {
      filterText: e.target.value,
      typeFilter: typeFilter2(),
      stateFilter: stateFilter2(),
      sortKey: sortKey2()
    });
  }
  function onStateFilterChange(e) {
    dispatch("filtersChanged", {
      filterText: filterText2(),
      typeFilter: typeFilter2(),
      stateFilter: e.target.value,
      sortKey: sortKey2()
    });
  }
  function onTypeFilterChange(e) {
    dispatch("filtersChanged", {
      filterText: filterText2(),
      typeFilter: e.target.value,
      stateFilter: stateFilter2(),
      sortKey: sortKey2()
    });
  }
  function onSortChange(e) {
    dispatch("filtersChanged", {
      filterText: filterText2(),
      typeFilter: typeFilter2(),
      stateFilter: stateFilter2(),
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
  function onCancelSummary() {
    dispatch("cancelSummary");
  }
  function onQueryChange(e) {
    dispatch("queryChanged", { query: e.target.value });
  }
  function onConnectionChange(e) {
    dispatch("connectionChanged", { connectionId: e.target.value });
  }
  const queryOptions2 = [
    {
      value: "My Activity",
      label: "My Activity",
      description: "Work items I've created, assigned to, or recently changed"
    },
    {
      value: "My Work Items",
      label: "My Work Items",
      description: "Work items currently assigned to me"
    },
    {
      value: "Assigned to me",
      label: "Assigned to me",
      description: "Work items currently assigned to me"
    },
    {
      value: "Current Sprint",
      label: "Current Sprint",
      description: "Work items in the current iteration"
    },
    {
      value: "All Active",
      label: "All Active",
      description: "All active work items in the project"
    },
    {
      value: "Recently Updated",
      label: "Recently Updated",
      description: "Work items updated in the last 14 days"
    },
    {
      value: "Following",
      label: "Following",
      description: "Work items I'm following"
    },
    {
      value: "Mentioned",
      label: "Mentioned",
      description: "Work items where I've been mentioned"
    }
  ];
  function disableKeyboardNavigation() {
    if (!get(keyboardNavigationEnabled)) return;
    set(keyboardNavigationEnabled, false);
    addToast("Keyboard shortcuts paused\u2014press Esc to resume navigation.", { type: "info", timeout: 6e3 });
  }
  function enableKeyboardNavigation() {
    if (get(keyboardNavigationEnabled)) return;
    set(keyboardNavigationEnabled, true);
    addToast("Keyboard navigation re-enabled.", { type: "info", timeout: 3e3 });
  }
  function handleKeydown(event2) {
    const target = event2.target;
    const { key: key2, ctrlKey, metaKey, shiftKey } = event2;
    const isModifier = ctrlKey || metaKey;
    if (!get(keyboardNavigationEnabled)) {
      if (!isModifier && key2 === "Escape") {
        event2.preventDefault();
        enableKeyboardNavigation();
      }
      return;
    }
    const tagName = (target?.tagName || "").toLowerCase();
    const path = event2.composedPath?.() || [];
    const shouldBypass = (node) => {
      if (!(node instanceof Element)) return false;
      const el = node;
      const nodeTag = (el.tagName || "").toLowerCase();
      return el?.isContentEditable === true || nodeTag === "input" || nodeTag === "textarea" || nodeTag === "select" || nodeTag === "button" || el?.dataset?.disableKeynav !== void 0 || Boolean(el.closest("[data-disable-keynav]"));
    };
    if (target?.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select" || tagName === "button" || target?.closest?.("[data-disable-keynav]") || path.some(shouldBypass)) {
      return;
    }
    switch (key2) {
      case "j":
      case "ArrowDown":
        if (!isModifier) {
          event2.preventDefault();
          navigateDown();
        }
        break;
      case "k":
      case "ArrowUp":
        if (!isModifier) {
          event2.preventDefault();
          navigateUp();
        }
        break;
      case "h":
      case "ArrowLeft":
        if (!isModifier) {
          event2.preventDefault();
          navigateLeft();
        }
        break;
      case "l":
      case "ArrowRight":
        if (!isModifier) {
          event2.preventDefault();
          navigateRight();
        }
        break;
      case "Home":
        event2.preventDefault();
        navigateToTop();
        break;
      case "End":
        event2.preventDefault();
        navigateToBottom();
        break;
      case "Enter":
        if (!isModifier) {
          event2.preventDefault();
          openFocusedItem();
        }
        break;
      case " ":
        if (!isModifier) {
          event2.preventDefault();
          toggleSelection();
        }
        break;
      case "Escape":
        event2.preventDefault();
        enableKeyboardNavigation();
        clearSelection();
        break;
      case "I":
      case "i":
        if (!isModifier) {
          event2.preventDefault();
          disableKeyboardNavigation();
        }
        break;
      case "a":
        if (isModifier) {
          event2.preventDefault();
          selectAll();
        }
        break;
      case "r":
        if (!isModifier) {
          event2.preventDefault();
          onRefresh();
        }
        break;
      case "v":
        if (!isModifier) {
          event2.preventDefault();
          dispatch("toggleKanbanView");
        }
        break;
      case "f":
        if (!isModifier) {
          event2.preventDefault();
          focusSearch();
        }
        break;
    }
  }
  function navigateDown() {
    if (get(focusedIndex) < items().length - 1) {
      update(focusedIndex);
      updateFocus();
    }
  }
  function navigateUp() {
    if (get(focusedIndex) > 0) {
      update(focusedIndex, -1);
      updateFocus();
    }
  }
  function navigateLeft() {
    if (kanbanView2()) {
      updateFocus();
    }
  }
  function navigateRight() {
    if (kanbanView2()) {
      updateFocus();
    }
  }
  function navigateToTop() {
    set(focusedIndex, 0);
    updateFocus();
  }
  function navigateToBottom() {
    set(focusedIndex, Math.max(0, items().length - 1));
    updateFocus();
  }
  function toggleSelection() {
    if (get(focusedIndex) >= 0 && get(focusedIndex) < items().length) {
      const item = items()[get(focusedIndex)];
      const id = Number(item.id || item.fields?.["System.Id"]);
      if (id) {
        toggleItemSelection(id);
      }
    }
  }
  function openFocusedItem() {
    if (items()[get(focusedIndex)]) {
      dispatch("openWorkItem", { id: items()[get(focusedIndex)].id });
    }
  }
  function focusSearch() {
    const searchInput = document.querySelector('input[type="text"]');
    if (searchInput) {
      searchInput.focus();
    }
  }
  function updateFocus() {
    const focusedElement = document.querySelector(`[data-index="${get(focusedIndex)}"]`);
    if (focusedElement) {
      focusedElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }
  function handleMessage(event2) {
    const { type, data } = event2.detail;
    switch (type) {
      case "updateFocus":
        set(focusedIndex, data.focusedIndex);
        updateFocus();
        break;
      case "updateSelection":
        set(selectedItems, new Set(data.selectedItems));
        break;
      case "focusSearch":
        focusSearch();
        break;
    }
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
  function allowDrop(ev) {
    ev.preventDefault();
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
  function normalizeState2(raw) {
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
  legacy_pre_effect(() => deep_read_state(summaryProvider2()), () => {
    set(summaryButtonLabel, summaryProvider2() === "openai" ? "Generate AI Summary" : "Copy Copilot Prompt");
  });
  legacy_pre_effect(() => deep_read_state(summaryProvider2()), () => {
    set(summaryHelperText, summaryProvider2() === "openai" ? "Creates an OpenAI summary and copies it to your clipboard." : "Copies a Copilot-ready prompt to your clipboard.");
  });
  legacy_pre_effect(
    () => (deep_read_state(summaryBusy2()), deep_read_state(summaryTargetId())),
    () => {
      set(summaryGenerateDisabled, summaryBusy2() || !summaryTargetId());
    }
  );
  legacy_pre_effect(
    () => (deep_read_state(summaryBusy2()), deep_read_state(timerActive2())),
    () => {
      set(summaryApplyDisabled, summaryBusy2() || !timerActive2());
    }
  );
  legacy_pre_effect(() => deep_read_state(summaryTargetId()), () => {
    set(summaryAreaDisabled, !summaryTargetId());
  });
  legacy_pre_effect(() => deep_read_state(items()), () => {
    set(kanbanGroups, (() => {
      const present = new Set(bucketOrder);
      const groups = Object.fromEntries(bucketOrder.map((k) => [k, []]));
      (items() || []).forEach((it) => {
        const norm = normalizeState2(it?.fields?.["System.State"]);
        if (!present.has(norm)) present.add(norm);
        (groups[norm] || groups["new"]).push(it);
      });
      return groups;
    })());
  });
  legacy_pre_effect(() => get(kanbanGroups), () => {
    set(columnDefs, bucketOrder.filter((k) => (get(kanbanGroups)[k] || []).length > 0 || ["new", "active", "inprogress", "review", "done"].includes(k)).map((k) => ({ key: k, label: bucketLabels[k] || k })));
  });
  legacy_pre_effect_reset();
  init();
  var div = root2();
  var node_1 = child(div);
  {
    var consequent = ($$anchor2) => {
      var div_1 = root_12();
      each(div_1, 5, connections2, index, ($$anchor3, connection) => {
        var button = root_2();
        let classes;
        var text_1 = child(button, true);
        reset(button);
        template_effect(
          ($0) => {
            classes = set_class(button, 1, "connection-tab svelte-db2r4i", null, classes, $0);
            set_attribute2(button, "aria-selected", (get(connection), deep_read_state(activeConnectionId2()), untrack(() => get(connection).id === activeConnectionId2())));
            set_attribute2(button, "aria-label", (get(connection), untrack(() => `Switch to ${get(connection).label}`)));
            set_attribute2(button, "title", (get(connection), untrack(() => `${get(connection).organization}/${get(connection).project}`)));
            set_text(text_1, (get(connection), untrack(() => get(connection).label)));
          },
          [
            () => ({ active: get(connection).id === activeConnectionId2() })
          ]
        );
        event("click", button, () => dispatch("connectionChanged", { connectionId: get(connection).id }));
        append($$anchor3, button);
      });
      reset(div_1);
      append($$anchor2, div_1);
    };
    if_block(node_1, ($$render) => {
      if (deep_read_state(connections2()), untrack(() => connections2() && connections2().length > 1)) $$render(consequent);
    });
  }
  var node_2 = sibling(node_1, 2);
  {
    var consequent_2 = ($$anchor2) => {
      var div_2 = root_3();
      each(div_2, 5, authReminders2, (reminder) => reminder.connectionId, ($$anchor3, reminder) => {
        var div_3 = root_4();
        var div_4 = sibling(child(div_3), 2);
        var div_5 = child(div_4);
        var text_2 = child(div_5, true);
        reset(div_5);
        var div_6 = sibling(div_5, 2);
        var node_3 = child(div_6);
        {
          var consequent_1 = ($$anchor4) => {
            var text_3 = text();
            template_effect(() => set_text(text_3, (get(reminder), untrack(() => get(reminder).detail))));
            append($$anchor4, text_3);
          };
          var alternate = ($$anchor4) => {
            var text_4 = text();
            template_effect(() => set_text(text_4, `Sign in to refresh ${(get(reminder), untrack(() => get(reminder).label)) ?? ""} and resume work item syncing.`));
            append($$anchor4, text_4);
          };
          if_block(node_3, ($$render) => {
            if (get(reminder), untrack(() => get(reminder).detail)) $$render(consequent_1);
            else $$render(alternate, false);
          });
        }
        reset(div_6);
        reset(div_4);
        var div_7 = sibling(div_4, 2);
        var button_1 = child(div_7);
        var button_2 = sibling(button_1, 2);
        reset(div_7);
        reset(div_3);
        template_effect(() => set_text(text_2, (get(reminder), untrack(() => get(reminder).message || `Microsoft Entra sign-in required for ${get(reminder).label}`))));
        event("click", button_1, () => onReminderSignIn(get(reminder).connectionId));
        event("click", button_2, () => onReminderDismiss(get(reminder).connectionId));
        append($$anchor3, div_3);
      });
      reset(div_2);
      append($$anchor2, div_2);
    };
    if_block(node_2, ($$render) => {
      if (deep_read_state(authReminders2()), untrack(() => authReminders2() && authReminders2().length)) $$render(consequent_2);
    });
  }
  var div_8 = sibling(node_2, 2);
  var div_9 = child(div_8);
  var select = sibling(child(div_9), 2);
  template_effect(() => {
    selectedQuery2();
    invalidate_inner_signals(() => {
      onQueryChange;
      queryOptions2;
    });
  });
  each(select, 5, () => queryOptions2, index, ($$anchor2, option) => {
    var option_1 = root_7();
    var text_5 = child(option_1, true);
    reset(option_1);
    var option_1_value = {};
    template_effect(() => {
      set_text(text_5, (get(option), untrack(() => get(option).label)));
      if (option_1_value !== (option_1_value = (get(option), untrack(() => get(option).value)))) {
        option_1.value = (option_1.__value = (get(option), untrack(() => get(option).value))) ?? "";
      }
    });
    append($$anchor2, option_1);
  });
  reset(select);
  var node_4 = sibling(select, 2);
  {
    var consequent_3 = ($$anchor2) => {
      var div_10 = root_8();
      var text_6 = child(div_10, true);
      reset(div_10);
      template_effect(() => set_text(text_6, queryDescription2()));
      append($$anchor2, div_10);
    };
    if_block(node_4, ($$render) => {
      if (queryDescription2()) $$render(consequent_3);
    });
  }
  reset(div_9);
  reset(div_8);
  var node_5 = sibling(div_8, 2);
  {
    var consequent_4 = ($$anchor2) => {
      var div_11 = root_9();
      var span = child(div_11);
      var text_7 = child(span);
      reset(span);
      var button_3 = sibling(span, 2);
      var button_4 = sibling(button_3, 2);
      var button_5 = sibling(button_4, 2);
      var button_6 = sibling(button_5, 2);
      var button_7 = sibling(button_6, 2);
      reset(div_11);
      template_effect(() => set_text(text_7, `${(get(selectedItems), untrack(() => get(selectedItems).size)) ?? ""} selected`));
      event("click", button_3, () => dispatch("bulkAssign"));
      event("click", button_4, () => dispatch("bulkMove"));
      event("click", button_5, () => dispatch("bulkAddTags"));
      event("click", button_6, () => dispatch("bulkDelete"));
      event("click", button_7, clearSelection);
      append($$anchor2, div_11);
    };
    if_block(node_5, ($$render) => {
      if (get(selectedItems), untrack(() => get(selectedItems).size > 0)) $$render(consequent_4);
    });
  }
  var div_12 = sibling(node_5, 2);
  var node_6 = sibling(child(div_12), 2);
  {
    var consequent_5 = ($$anchor2) => {
      var span_1 = root_10();
      var text_8 = child(span_1);
      reset(span_1);
      template_effect(() => set_text(text_8, `(${subtitle() ?? ""})`));
      append($$anchor2, span_1);
    };
    if_block(node_6, ($$render) => {
      if (subtitle()) $$render(consequent_5);
    });
  }
  var node_7 = sibling(node_6, 2);
  {
    var consequent_6 = ($$anchor2) => {
      var span_2 = root_11();
      append($$anchor2, span_2);
    };
    if_block(node_7, ($$render) => {
      if (loading2()) $$render(consequent_6);
    });
  }
  var span_3 = sibling(node_7, 2);
  var text_9 = child(span_3, true);
  reset(span_3);
  var node_8 = sibling(span_3, 2);
  {
    var consequent_9 = ($$anchor2) => {
      var fragment_2 = root_122();
      var span_4 = first_child(fragment_2);
      var text_10 = child(span_4);
      var node_9 = sibling(text_10);
      {
        var consequent_7 = ($$anchor3) => {
          var text_11 = text();
          template_effect(() => set_text(text_11, `(${timerElapsedLabel2() ?? ""})`));
          append($$anchor3, text_11);
        };
        if_block(node_9, ($$render) => {
          if (timerElapsedLabel2()) $$render(consequent_7);
        });
      }
      reset(span_4);
      var node_10 = sibling(span_4, 2);
      {
        var consequent_8 = ($$anchor3) => {
          var button_8 = root_14();
          var text_12 = child(button_8);
          reset(button_8);
          template_effect(() => {
            set_attribute2(button_8, "title", activeTitle2() || "Open active work item");
            set_attribute2(button_8, "aria-label", `Open active work item #${activeId2()}`);
            set_text(text_12, `#${activeId2() ?? ""}`);
          });
          event("click", button_8, onOpenActive);
          append($$anchor3, button_8);
        };
        if_block(node_10, ($$render) => {
          if (activeId2()) $$render(consequent_8);
        });
      }
      template_effect(() => set_text(text_10, `\u2022 ${timerRunning2() ? "Running" : "Paused"} `));
      append($$anchor2, fragment_2);
    };
    if_block(node_8, ($$render) => {
      if (timerActive2()) $$render(consequent_9);
    });
  }
  var node_11 = sibling(node_8, 2);
  {
    var consequent_10 = ($$anchor2) => {
      var span_5 = root_15();
      append($$anchor2, span_5);
    };
    if_block(node_11, ($$render) => {
      if (!get(keyboardNavigationEnabled)) $$render(consequent_10);
    });
  }
  var span_6 = sibling(node_11, 2);
  var span_7 = child(span_6);
  var input = child(span_7);
  remove_input_defaults(input);
  var select_1 = sibling(input, 2);
  template_effect(() => {
    typeFilter2();
    invalidate_inner_signals(() => {
      onTypeFilterChange;
      availableTypes();
    });
  });
  var option_2 = child(select_1);
  option_2.value = option_2.__value = "";
  var node_12 = sibling(option_2);
  {
    var consequent_11 = ($$anchor2) => {
      var fragment_4 = comment();
      var node_13 = first_child(fragment_4);
      each(node_13, 1, availableTypes, index, ($$anchor3, typeName) => {
        var option_3 = root_17();
        var text_13 = child(option_3, true);
        reset(option_3);
        var option_3_value = {};
        template_effect(() => {
          set_text(text_13, get(typeName));
          if (option_3_value !== (option_3_value = get(typeName))) {
            option_3.value = (option_3.__value = get(typeName)) ?? "";
          }
        });
        append($$anchor3, option_3);
      });
      append($$anchor2, fragment_4);
    };
    if_block(node_12, ($$render) => {
      if (deep_read_state(availableTypes()), untrack(() => availableTypes() && availableTypes().length)) $$render(consequent_11);
    });
  }
  reset(select_1);
  var select_2 = sibling(select_1, 2);
  template_effect(() => {
    stateFilter2();
    invalidate_inner_signals(() => {
      onStateFilterChange;
      availableStates();
      bucketLabels;
      get(columnDefs);
    });
  });
  var option_4 = child(select_2);
  option_4.value = option_4.__value = "all";
  var node_14 = sibling(option_4);
  {
    var consequent_12 = ($$anchor2) => {
      var fragment_5 = comment();
      var node_15 = first_child(fragment_5);
      each(node_15, 1, availableStates, index, ($$anchor3, s) => {
        var option_5 = root_19();
        var text_14 = child(option_5, true);
        reset(option_5);
        var option_5_value = {};
        template_effect(() => {
          set_text(text_14, (get(s), untrack(() => bucketLabels[get(s)] || get(s))));
          if (option_5_value !== (option_5_value = get(s))) {
            option_5.value = (option_5.__value = get(s)) ?? "";
          }
        });
        append($$anchor3, option_5);
      });
      append($$anchor2, fragment_5);
    };
    var alternate_1 = ($$anchor2) => {
      var fragment_6 = comment();
      var node_16 = first_child(fragment_6);
      each(node_16, 1, () => get(columnDefs), index, ($$anchor3, c) => {
        var option_6 = root_21();
        var text_15 = child(option_6, true);
        reset(option_6);
        var option_6_value = {};
        template_effect(() => {
          set_text(text_15, (get(c), untrack(() => get(c).label)));
          if (option_6_value !== (option_6_value = (get(c), untrack(() => get(c).key)))) {
            option_6.value = (option_6.__value = (get(c), untrack(() => get(c).key))) ?? "";
          }
        });
        append($$anchor3, option_6);
      });
      append($$anchor2, fragment_6);
    };
    if_block(node_14, ($$render) => {
      if (deep_read_state(availableStates()), untrack(() => availableStates() && availableStates().length)) $$render(consequent_12);
      else $$render(alternate_1, false);
    });
  }
  reset(select_2);
  var select_3 = sibling(select_2, 2);
  template_effect(() => {
    sortKey2();
    invalidate_inner_signals(() => {
      onSortChange;
    });
  });
  var option_7 = child(select_3);
  option_7.value = option_7.__value = "updated-desc";
  var option_8 = sibling(option_7);
  option_8.value = option_8.__value = "id-desc";
  var option_9 = sibling(option_8);
  option_9.value = option_9.__value = "id-asc";
  var option_10 = sibling(option_9);
  option_10.value = option_10.__value = "title-asc";
  reset(select_3);
  reset(span_7);
  reset(span_6);
  reset(div_12);
  var div_13 = sibling(div_12, 2);
  var node_17 = child(div_13);
  {
    var consequent_13 = ($$anchor2) => {
      var div_14 = root_22();
      var div_15 = sibling(child(div_14), 2);
      var text_16 = child(div_15, true);
      reset(div_15);
      reset(div_14);
      template_effect(() => set_text(text_16, errorMsg2()));
      append($$anchor2, div_14);
    };
    if_block(node_17, ($$render) => {
      if (errorMsg2()) $$render(consequent_13);
    });
  }
  var node_18 = sibling(node_17, 2);
  {
    var consequent_14 = ($$anchor2) => {
      var div_16 = root_23();
      append($$anchor2, div_16);
    };
    var alternate_9 = ($$anchor2) => {
      var fragment_7 = comment();
      var node_19 = first_child(fragment_7);
      {
        var consequent_15 = ($$anchor3) => {
          var div_17 = root_25();
          append($$anchor3, div_17);
        };
        var alternate_8 = ($$anchor3) => {
          var fragment_8 = comment();
          var node_20 = first_child(fragment_8);
          {
            var consequent_24 = ($$anchor4) => {
              var div_18 = root_27();
              each(div_18, 5, () => get(columnDefs), index, ($$anchor5, col) => {
                var div_19 = root_28();
                var div_20 = child(div_19);
                var h3 = child(div_20);
                var text_17 = child(h3, true);
                reset(h3);
                var span_8 = sibling(h3, 2);
                var text_18 = child(span_8, true);
                reset(span_8);
                reset(div_20);
                var div_21 = sibling(div_20, 2);
                var node_21 = child(div_21);
                {
                  var consequent_23 = ($$anchor6) => {
                    var fragment_9 = comment();
                    var node_22 = first_child(fragment_9);
                    each(
                      node_22,
                      1,
                      () => (get(kanbanGroups), get(col), untrack(() => get(kanbanGroups)[get(col).key])),
                      index,
                      ($$anchor7, it) => {
                        var div_22 = root_30();
                        var div_23 = child(div_22);
                        var input_1 = child(div_23);
                        remove_input_defaults(input_1);
                        var span_9 = sibling(input_1, 2);
                        var text_19 = child(span_9, true);
                        reset(span_9);
                        var span_10 = sibling(span_9, 2);
                        var text_20 = child(span_10);
                        reset(span_10);
                        var node_23 = sibling(span_10, 2);
                        {
                          var consequent_16 = ($$anchor8) => {
                            var span_11 = root_31();
                            var text_21 = sibling(child(span_11));
                            reset(span_11);
                            template_effect(() => set_text(text_21, ` ${timerElapsedLabel2() ?? ""}`));
                            append($$anchor8, span_11);
                          };
                          if_block(node_23, ($$render) => {
                            if (deep_read_state(timerActive2()), deep_read_state(activeId2()), get(it), untrack(() => timerActive2() && activeId2() === Number(get(it).id))) $$render(consequent_16);
                          });
                        }
                        var span_12 = sibling(node_23, 2);
                        var text_22 = child(span_12, true);
                        reset(span_12);
                        reset(div_23);
                        var div_24 = sibling(div_23, 2);
                        var div_25 = child(div_24);
                        var text_23 = child(div_25, true);
                        reset(div_25);
                        var node_24 = sibling(div_25, 2);
                        {
                          var consequent_17 = ($$anchor8) => {
                            var div_26 = root_32();
                            var text_24 = child(div_26, true);
                            reset(div_26);
                            template_effect(
                              ($0, $1) => {
                                set_attribute2(div_26, "title", $0);
                                set_text(text_24, $1);
                              },
                              [
                                () => (get(it), untrack(() => extractDescription(get(it)))),
                                () => (get(it), untrack(() => extractDescription(get(it))))
                              ]
                            );
                            append($$anchor8, div_26);
                          };
                          if_block(node_24, ($$render) => {
                            if (get(it), untrack(() => extractDescription(get(it)))) $$render(consequent_17);
                          });
                        }
                        var node_25 = sibling(node_24, 2);
                        {
                          var consequent_20 = ($$anchor8) => {
                            var div_27 = root_33();
                            var div_28 = child(div_27);
                            var div_29 = child(div_28);
                            var span_13 = sibling(child(div_29), 2);
                            var text_25 = child(span_13, true);
                            reset(span_13);
                            reset(div_29);
                            var div_30 = sibling(div_29, 2);
                            var node_26 = child(div_30);
                            {
                              var consequent_18 = ($$anchor9) => {
                                var span_14 = root_34();
                                append($$anchor9, span_14);
                              };
                              if_block(node_26, ($$render) => {
                                if (summaryBusy2()) $$render(consequent_18);
                              });
                            }
                            var button_9 = sibling(node_26, 2);
                            reset(div_30);
                            reset(div_28);
                            var textarea = sibling(div_28, 2);
                            remove_textarea_child(textarea);
                            var div_31 = sibling(textarea, 2);
                            var div_32 = child(div_31);
                            var button_10 = child(div_32);
                            var text_26 = sibling(child(button_10));
                            reset(button_10);
                            var button_11 = sibling(button_10, 2);
                            reset(div_32);
                            var div_33 = sibling(div_32, 2);
                            var text_27 = child(div_33, true);
                            reset(div_33);
                            reset(div_31);
                            var node_27 = sibling(div_31, 2);
                            {
                              var consequent_19 = ($$anchor9) => {
                                var div_34 = root_35();
                                var text_28 = child(div_34, true);
                                reset(div_34);
                                template_effect(() => set_text(text_28, summaryStatus2()));
                                append($$anchor9, div_34);
                              };
                              if_block(node_27, ($$render) => {
                                if (summaryStatus2()) $$render(consequent_19);
                              });
                            }
                            reset(div_27);
                            template_effect(
                              ($0) => {
                                set_text(text_25, summaryProvider2() === "openai" ? "OpenAI" : "Copilot");
                                set_value(textarea, summaryDraft2());
                                textarea.disabled = get(summaryAreaDisabled);
                                set_attribute2(button_10, "title", get(summaryButtonLabel));
                                set_attribute2(button_10, "aria-label", get(summaryButtonLabel));
                                button_10.disabled = get(summaryGenerateDisabled);
                                set_text(text_26, ` ${get(summaryButtonLabel) ?? ""}`);
                                button_11.disabled = $0;
                                set_text(text_27, get(summaryHelperText));
                              },
                              [
                                () => (deep_read_state(summaryBusy2()), deep_read_state(summaryDraft2()), untrack(() => summaryBusy2() || !summaryDraft2().trim()))
                              ]
                            );
                            event("click", button_9, preventDefault(onCancelSummary));
                            event("input", textarea, onSummaryInput);
                            event("blur", textarea, onSummaryBlur);
                            event("keydown", textarea, stopPropagation(function($$arg) {
                              bubble_event.call(this, $$props, $$arg);
                            }));
                            event("click", button_10, preventDefault(onGenerateSummary));
                            event("click", button_11, preventDefault(() => dispatch("applySummary", { workItemId: get(it).id })));
                            append($$anchor8, div_27);
                          };
                          if_block(node_25, ($$render) => {
                            if (deep_read_state(summaryWorkItemId2()), get(it), untrack(() => summaryWorkItemId2() === Number(get(it).id))) $$render(consequent_20);
                          });
                        }
                        var div_35 = sibling(node_25, 2);
                        var span_15 = child(div_35);
                        var text_29 = child(span_15, true);
                        reset(span_15);
                        var node_28 = sibling(span_15, 2);
                        {
                          var consequent_21 = ($$anchor8) => {
                            var span_16 = root_36();
                            var text_30 = sibling(child(span_16));
                            reset(span_16);
                            template_effect(() => set_text(text_30, ` ${(get(it), untrack(() => get(it).fields["System.AssignedTo"].displayName || get(it).fields["System.AssignedTo"])) ?? ""}`));
                            append($$anchor8, span_16);
                          };
                          if_block(node_28, ($$render) => {
                            if (get(it), untrack(() => get(it).fields?.["System.AssignedTo"])) $$render(consequent_21);
                          });
                        }
                        reset(div_35);
                        reset(div_24);
                        var div_36 = sibling(div_24, 2);
                        var node_29 = child(div_36);
                        {
                          var consequent_22 = ($$anchor8) => {
                            var button_12 = root_37();
                            template_effect(() => set_attribute2(button_12, "aria-label", (get(it), untrack(() => `Stop timer for #${get(it).id}`))));
                            event("click", button_12, stopPropagation(() => dispatch("stopTimer")));
                            append($$anchor8, button_12);
                          };
                          var alternate_2 = ($$anchor8) => {
                            var button_13 = root_38();
                            template_effect(() => {
                              set_attribute2(button_13, "aria-label", (get(it), untrack(() => `Start timer for #${get(it).id}`)));
                              button_13.disabled = timerActive2();
                            });
                            event("click", button_13, stopPropagation(() => dispatch("startItem", { id: get(it).id })));
                            append($$anchor8, button_13);
                          };
                          if_block(node_29, ($$render) => {
                            if (deep_read_state(timerActive2()), deep_read_state(activeId2()), get(it), untrack(() => timerActive2() && activeId2() === Number(get(it).id))) $$render(consequent_22);
                            else $$render(alternate_2, false);
                          });
                        }
                        var button_14 = sibling(node_29, 2);
                        var button_15 = sibling(button_14, 2);
                        var button_16 = sibling(button_15, 2);
                        reset(div_36);
                        reset(div_22);
                        template_effect(
                          ($0, $1, $2, $3, $4, $5) => {
                            set_class(div_22, 1, `work-item-card kanban-card state-${$0 ?? ""} ${$1 ?? ""} ${$2 ?? ""}`, "svelte-db2r4i");
                            set_attribute2(div_22, "aria-label", (get(it), untrack(() => `Work item #${get(it).id}: ${get(it).fields?.["System.Title"]} - use action buttons to interact`)));
                            set_checked(input_1, $3);
                            set_attribute2(input_1, "aria-label", `Select work item #${(get(it), untrack(() => get(it).id)) ?? ""}`);
                            set_text(text_19, $4);
                            set_text(text_20, `#${(get(it), untrack(() => get(it).id)) ?? ""}`);
                            set_class(span_12, 1, `work-item-priority ${$5 ?? ""}`, "svelte-db2r4i");
                            set_text(text_22, (get(it), untrack(() => get(it).fields?.["Microsoft.VSTS.Common.Priority"] || "3")));
                            set_text(text_23, (get(it), untrack(() => get(it).fields?.["System.Title"] || `Work Item #${get(it).id}`)));
                            set_text(text_29, (get(it), untrack(() => get(it).fields?.["System.WorkItemType"] || "Task")));
                            set_attribute2(button_14, "aria-label", (get(it), untrack(() => `View work item #${get(it).id}`)));
                            set_attribute2(button_15, "aria-label", (get(it), untrack(() => `Edit work item #${get(it).id}`)));
                            set_attribute2(button_16, "aria-label", (get(it), untrack(() => `Add comment to #${get(it).id}`)));
                          },
                          [
                            () => (get(it), untrack(() => normalizeState2(get(it).fields?.["System.State"]))),
                            () => (deep_read_state(timerActive2()), deep_read_state(activeId2()), get(it), untrack(() => timerActive2() && activeId2() === Number(get(it).id) ? "has-active-timer" : "")),
                            () => (get(selectedItems), get(it), untrack(() => get(selectedItems).has(Number(get(it).id)) ? "selected" : "")),
                            () => (get(selectedItems), get(it), untrack(() => get(selectedItems).has(Number(get(it).id)))),
                            () => (get(it), untrack(() => getWorkItemTypeIcon(get(it).fields?.["System.WorkItemType"]))),
                            () => (get(it), untrack(() => getPriorityClass(get(it).fields?.["Microsoft.VSTS.Common.Priority"])))
                          ]
                        );
                        event("click", input_1, stopPropagation(() => toggleItemSelection(Number(get(it).id))));
                        event("click", button_14, stopPropagation(() => dispatch("openItem", { id: get(it).id })));
                        event("click", button_15, stopPropagation(() => dispatch("editItem", { id: get(it).id })));
                        event("click", button_16, stopPropagation(() => dispatch("commentItem", { id: get(it).id })));
                        event("dragstart", div_22, (e) => handleDragStart(e, get(it)));
                        event("keydown", div_22, (e) => {
                          if (kanbanView2() && (e.ctrlKey || e.metaKey) && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
                            e.preventDefault();
                            const currentKey = normalizeState2(get(it).fields?.["System.State"]);
                            const idx = get(columnDefs).findIndex((c) => c.key === currentKey);
                            if (idx !== -1) {
                              const nextIdx = e.key === "ArrowLeft" ? idx - 1 : idx + 1;
                              const target = get(columnDefs)[nextIdx];
                              if (target) {
                                const label = target.label || target.key;
                                dispatch("moveItem", { id: get(it).id, target: target.key, targetState: label });
                              }
                            }
                          }
                        });
                        append($$anchor7, div_22);
                      }
                    );
                    append($$anchor6, fragment_9);
                  };
                  var alternate_3 = ($$anchor6) => {
                    var div_37 = root_39();
                    append($$anchor6, div_37);
                  };
                  if_block(node_21, ($$render) => {
                    if (get(kanbanGroups), get(col), untrack(() => get(kanbanGroups)[get(col).key]?.length)) $$render(consequent_23);
                    else $$render(alternate_3, false);
                  });
                }
                reset(div_21);
                reset(div_19);
                template_effect(() => {
                  set_class(div_19, 1, `kanban-column state-${(get(col), untrack(() => get(col).key)) ?? ""}`, "svelte-db2r4i");
                  set_attribute2(div_19, "aria-label", (get(col), untrack(() => `${get(col).label} column - drop items here`)));
                  set_text(text_17, (get(col), untrack(() => get(col).label)));
                  set_text(text_18, (get(kanbanGroups), get(col), untrack(() => get(kanbanGroups)[get(col).key]?.length || 0)));
                });
                event("dragover", div_19, allowDrop);
                event("drop", div_19, (e) => handleDrop(e, get(col).key));
                append($$anchor5, div_19);
              });
              reset(div_18);
              append($$anchor4, div_18);
            };
            var alternate_7 = ($$anchor4) => {
              var fragment_10 = comment();
              var node_30 = first_child(fragment_10);
              {
                var consequent_32 = ($$anchor5) => {
                  var div_38 = root_41();
                  each(
                    div_38,
                    5,
                    () => (deep_read_state(items()), untrack(() => items().slice(0, 50))),
                    index,
                    ($$anchor6, it, index2) => {
                      var div_39 = root_42();
                      set_attribute2(div_39, "data-index", index2);
                      var div_40 = child(div_39);
                      var input_2 = child(div_40);
                      remove_input_defaults(input_2);
                      var span_17 = sibling(input_2, 2);
                      var text_31 = child(span_17, true);
                      reset(span_17);
                      var span_18 = sibling(span_17, 2);
                      var text_32 = child(span_18);
                      reset(span_18);
                      var node_31 = sibling(span_18, 2);
                      {
                        var consequent_25 = ($$anchor7) => {
                          var span_19 = root_43();
                          var text_33 = sibling(child(span_19));
                          reset(span_19);
                          template_effect(() => set_text(text_33, ` ${timerElapsedLabel2() ?? ""}`));
                          append($$anchor7, span_19);
                        };
                        if_block(node_31, ($$render) => {
                          if (deep_read_state(timerActive2()), deep_read_state(activeId2()), get(it), untrack(() => timerActive2() && activeId2() === Number(get(it).id))) $$render(consequent_25);
                        });
                      }
                      var span_20 = sibling(node_31, 2);
                      var text_34 = child(span_20, true);
                      reset(span_20);
                      reset(div_40);
                      var div_41 = sibling(div_40, 2);
                      var div_42 = child(div_41);
                      var text_35 = child(div_42, true);
                      reset(div_42);
                      var node_32 = sibling(div_42, 2);
                      {
                        var consequent_26 = ($$anchor7) => {
                          var div_43 = root_44();
                          var text_36 = child(div_43, true);
                          reset(div_43);
                          template_effect(
                            ($0, $1) => {
                              set_attribute2(div_43, "title", $0);
                              set_text(text_36, $1);
                            },
                            [
                              () => (get(it), untrack(() => extractDescription(get(it)))),
                              () => (get(it), untrack(() => extractDescription(get(it))))
                            ]
                          );
                          append($$anchor7, div_43);
                        };
                        if_block(node_32, ($$render) => {
                          if (get(it), untrack(() => extractDescription(get(it)))) $$render(consequent_26);
                        });
                      }
                      var node_33 = sibling(node_32, 2);
                      {
                        var consequent_29 = ($$anchor7) => {
                          var div_44 = root_45();
                          var div_45 = child(div_44);
                          var div_46 = child(div_45);
                          var span_21 = sibling(child(div_46), 2);
                          var text_37 = child(span_21, true);
                          reset(span_21);
                          reset(div_46);
                          var div_47 = sibling(div_46, 2);
                          var node_34 = child(div_47);
                          {
                            var consequent_27 = ($$anchor8) => {
                              var span_22 = root_46();
                              append($$anchor8, span_22);
                            };
                            if_block(node_34, ($$render) => {
                              if (summaryBusy2()) $$render(consequent_27);
                            });
                          }
                          var button_17 = sibling(node_34, 2);
                          reset(div_47);
                          reset(div_45);
                          var textarea_1 = sibling(div_45, 2);
                          remove_textarea_child(textarea_1);
                          var div_48 = sibling(textarea_1, 2);
                          var div_49 = child(div_48);
                          var button_18 = child(div_49);
                          var text_38 = sibling(child(button_18));
                          reset(button_18);
                          var button_19 = sibling(button_18, 2);
                          reset(div_49);
                          var div_50 = sibling(div_49, 2);
                          var text_39 = child(div_50, true);
                          reset(div_50);
                          reset(div_48);
                          var node_35 = sibling(div_48, 2);
                          {
                            var consequent_28 = ($$anchor8) => {
                              var div_51 = root_47();
                              var text_40 = child(div_51, true);
                              reset(div_51);
                              template_effect(() => set_text(text_40, summaryStatus2()));
                              append($$anchor8, div_51);
                            };
                            if_block(node_35, ($$render) => {
                              if (summaryStatus2()) $$render(consequent_28);
                            });
                          }
                          reset(div_44);
                          template_effect(
                            ($0) => {
                              set_text(text_37, summaryProvider2() === "openai" ? "OpenAI" : "Copilot");
                              set_value(textarea_1, summaryDraft2());
                              textarea_1.disabled = get(summaryAreaDisabled);
                              set_attribute2(button_18, "title", get(summaryButtonLabel));
                              set_attribute2(button_18, "aria-label", get(summaryButtonLabel));
                              button_18.disabled = get(summaryGenerateDisabled);
                              set_text(text_38, ` ${get(summaryButtonLabel) ?? ""}`);
                              button_19.disabled = $0;
                              set_text(text_39, get(summaryHelperText));
                            },
                            [
                              () => (deep_read_state(summaryBusy2()), deep_read_state(summaryDraft2()), untrack(() => summaryBusy2() || !summaryDraft2().trim()))
                            ]
                          );
                          event("click", button_17, preventDefault(onCancelSummary));
                          event("input", textarea_1, onSummaryInput);
                          event("blur", textarea_1, onSummaryBlur);
                          event("keydown", textarea_1, stopPropagation(function($$arg) {
                            bubble_event.call(this, $$props, $$arg);
                          }));
                          event("click", button_18, preventDefault(onGenerateSummary));
                          event("click", button_19, preventDefault(() => dispatch("applySummary", { workItemId: get(it).id })));
                          append($$anchor7, div_44);
                        };
                        if_block(node_33, ($$render) => {
                          if (deep_read_state(summaryWorkItemId2()), get(it), untrack(() => summaryWorkItemId2() === Number(get(it).id))) $$render(consequent_29);
                        });
                      }
                      var div_52 = sibling(node_33, 2);
                      var span_23 = child(div_52);
                      var text_41 = child(span_23, true);
                      reset(span_23);
                      var span_24 = sibling(span_23, 2);
                      var text_42 = child(span_24, true);
                      reset(span_24);
                      var span_25 = sibling(span_24, 2);
                      var node_36 = child(span_25);
                      {
                        var consequent_30 = ($$anchor7) => {
                          var fragment_11 = root_48();
                          var text_43 = sibling(first_child(fragment_11));
                          template_effect(() => set_text(text_43, ` ${(get(it), untrack(() => get(it).fields["System.AssignedTo"].displayName || get(it).fields["System.AssignedTo"])) ?? ""}`));
                          append($$anchor7, fragment_11);
                        };
                        var alternate_4 = ($$anchor7) => {
                          var fragment_12 = root_49();
                          next();
                          append($$anchor7, fragment_12);
                        };
                        if_block(node_36, ($$render) => {
                          if (get(it), untrack(() => get(it).fields?.["System.AssignedTo"])) $$render(consequent_30);
                          else $$render(alternate_4, false);
                        });
                      }
                      reset(span_25);
                      reset(div_52);
                      reset(div_41);
                      var div_53 = sibling(div_41, 2);
                      var node_37 = child(div_53);
                      {
                        var consequent_31 = ($$anchor7) => {
                          var button_20 = root_50();
                          template_effect(() => set_attribute2(button_20, "aria-label", (get(it), untrack(() => `Stop timer for #${get(it).id}`))));
                          event("click", button_20, stopPropagation(() => dispatch("stopTimer")));
                          append($$anchor7, button_20);
                        };
                        var alternate_5 = ($$anchor7) => {
                          var button_21 = root_51();
                          template_effect(() => {
                            set_attribute2(button_21, "aria-label", (get(it), untrack(() => `Start timer for #${get(it).id}`)));
                            button_21.disabled = timerActive2();
                          });
                          event("click", button_21, stopPropagation(() => dispatch("startItem", { id: get(it).id })));
                          append($$anchor7, button_21);
                        };
                        if_block(node_37, ($$render) => {
                          if (deep_read_state(timerActive2()), deep_read_state(activeId2()), get(it), untrack(() => timerActive2() && activeId2() === Number(get(it).id))) $$render(consequent_31);
                          else $$render(alternate_5, false);
                        });
                      }
                      var button_22 = sibling(node_37, 2);
                      var button_23 = sibling(button_22, 2);
                      var button_24 = sibling(button_23, 2);
                      reset(div_53);
                      reset(div_39);
                      template_effect(
                        ($0, $1, $2, $3, $4, $5) => {
                          set_class(div_39, 1, `work-item-card ${$0 ?? ""} ${get(focusedIndex) === index2 ? "focused" : ""} ${$1 ?? ""}`, "svelte-db2r4i");
                          set_attribute2(div_39, "aria-label", (get(it), untrack(() => `Work item #${get(it).id}: ${get(it).fields?.["System.Title"]} - use action buttons to interact`)));
                          set_checked(input_2, $2);
                          set_attribute2(input_2, "aria-label", `Select work item #${(get(it), untrack(() => get(it).id)) ?? ""}`);
                          set_text(text_31, $3);
                          set_text(text_32, `#${(get(it), untrack(() => get(it).id)) ?? ""}`);
                          set_class(span_20, 1, `work-item-priority ${$4 ?? ""}`, "svelte-db2r4i");
                          set_text(text_34, (get(it), untrack(() => get(it).fields?.["Microsoft.VSTS.Common.Priority"] || "3")));
                          set_text(text_35, (get(it), untrack(() => get(it).fields?.["System.Title"] || `Work Item #${get(it).id}`)));
                          set_text(text_41, (get(it), untrack(() => get(it).fields?.["System.WorkItemType"] || "Task")));
                          set_class(span_24, 1, `work-item-state state-${$5 ?? ""}`, "svelte-db2r4i");
                          set_text(text_42, (get(it), untrack(() => get(it).fields?.["System.State"] || "New")));
                          set_attribute2(button_22, "aria-label", (get(it), untrack(() => `View work item #${get(it).id}`)));
                          set_attribute2(button_23, "aria-label", (get(it), untrack(() => `Edit work item #${get(it).id}`)));
                          set_attribute2(button_24, "aria-label", (get(it), untrack(() => `Add comment to #${get(it).id}`)));
                        },
                        [
                          () => (deep_read_state(timerActive2()), deep_read_state(activeId2()), get(it), untrack(() => timerActive2() && activeId2() === Number(get(it).id) ? "has-active-timer" : "")),
                          () => (get(selectedItems), get(it), untrack(() => get(selectedItems).has(Number(get(it).id)) ? "selected" : "")),
                          () => (get(selectedItems), get(it), untrack(() => get(selectedItems).has(Number(get(it).id)))),
                          () => (get(it), untrack(() => getWorkItemTypeIcon(get(it).fields?.["System.WorkItemType"]))),
                          () => (get(it), untrack(() => getPriorityClass(get(it).fields?.["Microsoft.VSTS.Common.Priority"]))),
                          () => (get(it), untrack(() => normalizeState2(get(it).fields?.["System.State"])))
                        ]
                      );
                      event("click", input_2, stopPropagation(() => toggleItemSelection(Number(get(it).id))));
                      event("click", button_22, stopPropagation(() => dispatch("openItem", { id: get(it).id })));
                      event("click", button_23, stopPropagation(() => dispatch("editItem", { id: get(it).id })));
                      event("click", button_24, stopPropagation(() => dispatch("commentItem", { id: get(it).id })));
                      event("click", div_39, (e) => {
                        set(focusedIndex, index2);
                        updateFocus();
                        if (e.ctrlKey || e.metaKey) {
                          e.stopPropagation();
                          toggleItemSelection(Number(get(it).id));
                        }
                      });
                      event("keydown", div_39, (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          set(focusedIndex, index2);
                          updateFocus();
                          if (e.key === "Enter") {
                            openFocusedItem();
                          } else if (e.key === " ") {
                            toggleSelection();
                          }
                        }
                      });
                      append($$anchor6, div_39);
                    }
                  );
                  reset(div_38);
                  append($$anchor5, div_38);
                };
                var alternate_6 = ($$anchor5) => {
                  var div_54 = root_52();
                  append($$anchor5, div_54);
                };
                if_block(
                  node_30,
                  ($$render) => {
                    if (deep_read_state(items()), untrack(() => items() && items().length)) $$render(consequent_32);
                    else $$render(alternate_6, false);
                  },
                  true
                );
              }
              append($$anchor4, fragment_10);
            };
            if_block(
              node_20,
              ($$render) => {
                if (kanbanView2()) $$render(consequent_24);
                else $$render(alternate_7, false);
              },
              true
            );
          }
          append($$anchor3, fragment_8);
        };
        if_block(
          node_19,
          ($$render) => {
            if (loading2()) $$render(consequent_15);
            else $$render(alternate_8, false);
          },
          true
        );
      }
      append($$anchor2, fragment_7);
    };
    if_block(node_18, ($$render) => {
      if (initializing2()) $$render(consequent_14);
      else $$render(alternate_9, false);
    });
  }
  reset(div_13);
  var node_38 = sibling(div_13, 2);
  Toasts(node_38, { ariaLabel: "Work item notifications" });
  reset(div);
  template_effect(() => {
    set_text(text_9, workItemCount2());
    set_value(input, filterText2());
  });
  bind_select_value(select, selectedQuery2);
  event("change", select, onQueryChange);
  event("input", input, onFilterInput);
  event("change", select_1, onTypeFilterChange);
  bind_select_value(select_1, typeFilter2);
  event("change", select_2, onStateFilterChange);
  bind_select_value(select_2, stateFilter2);
  event("change", select_3, onSortChange);
  bind_select_value(select_3, sortKey2);
  event("keydown", div_13, handleKeydown);
  append($$anchor, div);
  pop();
}

// src/webview/svelte-main.ts
var vscode = (() => {
  try {
    return window.vscode || window.acquireVsCodeApi?.();
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
var loading = false;
var initializing = true;
var errorMsg = "";
var filterText = "";
var typeFilter = "";
var stateFilter = "all";
var sortKey = "updated-desc";
var normalizedQuery = "";
var selectedQuery = "My Activity";
var queryDescription = "";
var selectedWorkItemIds = /* @__PURE__ */ new Set();
var pendingMoves = /* @__PURE__ */ new Map();
var stateOptions = [];
var typeOptions = [];
var typeOptionHints = /* @__PURE__ */ new Set();
var searchHaystackCache = /* @__PURE__ */ new WeakMap();
var summaryDraft = "";
var summaryStatus = "";
var summaryProvider = "builtin";
var summaryBusy = false;
var summaryWorkItemId = null;
var _summaryTargetTitle = "";
var summaryBusyTimer;
var summaryStatusTimer;
var _timerStopData = null;
var _timerConnectionInfo = null;
var authReminderMap = /* @__PURE__ */ new Map();
var authReminders = [];
var queryOptions = [
  {
    value: "My Activity",
    label: "My Activity",
    description: "Work items I've created, assigned to, or recently changed"
  },
  {
    value: "My Work Items",
    label: "My Work Items",
    description: "Work items currently assigned to me"
  },
  {
    value: "Assigned to me",
    label: "Assigned to me",
    description: "Work items currently assigned to me"
  },
  {
    value: "Current Sprint",
    label: "Current Sprint",
    description: "Work items in the current iteration"
  },
  { value: "All Active", label: "All Active", description: "All active work items in the project" },
  {
    value: "Recently Updated",
    label: "Recently Updated",
    description: "Work items updated in the last 14 days"
  },
  { value: "Following", label: "Following", description: "Work items I'm following" },
  { value: "Mentioned", label: "Mentioned", description: "Work items where I've been mentioned" }
];
var connections = [];
var activeConnectionId;
var connectionStateMap = /* @__PURE__ */ new Map();
function getDefaultConnectionState() {
  return {
    filterText: "",
    typeFilter: "",
    stateFilter: "all",
    sortKey: "updated-desc",
    selectedQuery: "My Activity",
    kanbanView: false
  };
}
function saveConnectionState(connectionId) {
  if (!connectionId) return;
  connectionStateMap.set(connectionId, {
    filterText,
    typeFilter,
    stateFilter,
    sortKey,
    selectedQuery,
    kanbanView
  });
  try {
    localStorage.setItem(
      `azuredevops.connectionState.${connectionId}`,
      JSON.stringify(connectionStateMap.get(connectionId))
    );
  } catch (e) {
    console.warn("[svelte-main] Failed to persist connection state", e);
  }
}
function loadConnectionState(connectionId) {
  if (!connectionId) return getDefaultConnectionState();
  let state2 = connectionStateMap.get(connectionId);
  if (state2) return state2;
  try {
    const stored = localStorage.getItem(`azuredevops.connectionState.${connectionId}`);
    if (stored) {
      state2 = JSON.parse(stored);
      connectionStateMap.set(connectionId, state2);
      return state2;
    }
  } catch (e) {
    console.warn("[svelte-main] Failed to load connection state from localStorage", e);
  }
  const defaultState = getDefaultConnectionState();
  connectionStateMap.set(connectionId, defaultState);
  return defaultState;
}
function applyConnectionState(connectionId) {
  const state2 = loadConnectionState(connectionId);
  filterText = state2.filterText;
  typeFilter = state2.typeFilter;
  stateFilter = state2.stateFilter;
  sortKey = state2.sortKey;
  selectedQuery = state2.selectedQuery;
  kanbanView = state2.kanbanView;
  const queryOption = queryOptions.find((option) => option.value === selectedQuery);
  queryDescription = queryOption?.description || "";
}
try {
  const st = vscode && typeof vscode.getState === "function" ? vscode.getState() : null;
  if (st && typeof st.kanbanView === "boolean") kanbanView = !!st.kanbanView;
  if (st && typeof st.typeFilter === "string") typeFilter = st.typeFilter;
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
    initializing,
    errorMsg,
    filterText,
    typeFilter,
    stateFilter,
    sortKey,
    availableStates: stateOptions,
    availableTypes: typeOptions,
    selectedQuery,
    queryDescription,
    summaryDraft,
    summaryStatus,
    summaryProvider,
    summaryBusy,
    summaryTargetId: summaryWorkItemId ?? 0,
    summaryWorkItemId: summaryWorkItemId ?? 0,
    connections,
    activeConnectionId,
    selectedItems: selectedWorkItemIds,
    authReminders
  };
}
function syncApp() {
  ensureApp();
  app.$set(getAppProps());
}
function persistViewState(extra) {
  if (activeConnectionId) {
    saveConnectionState(activeConnectionId);
  }
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
      summaryWorkItemId,
      activeConnectionId,
      ...extra
    });
  } catch (e) {
    console.warn("[svelte-main] Unable to persist view state", e);
  }
}
function ensureApp() {
  if (app) return app;
  const root3 = document.createElement("div");
  root3.id = "svelte-root";
  const container = document.body || document.documentElement;
  container.insertBefore(root3, container.firstChild);
  app = mount(App, {
    target: root3,
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
  app.$on("stopTimer", () => postMessage({ type: "stopTimer", mode: "timerStop" }));
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
      setSummaryTarget(id, { ensureOpen: false, refreshDraft: true });
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
  app.$on("cancelSummary", () => {
    summaryWorkItemId = null;
    summaryDraft = "";
    summaryStatus = "";
    persistViewState();
    syncApp();
  });
  app.$on("applySummary", (ev) => {
    const workItemId = Number(ev?.detail?.workItemId);
    if (workItemId && summaryDraft.trim()) {
      postMessage({ type: "addComment", workItemId, comment: summaryDraft.trim() });
      summaryWorkItemId = null;
      summaryDraft = "";
      summaryStatus = "Comment added successfully";
      persistViewState();
      syncApp();
      setTimeout(() => {
        summaryStatus = "";
        syncApp();
      }, 3e3);
    }
  });
  app.$on("cancelSummary", () => {
    summaryWorkItemId = null;
    summaryDraft = "";
    summaryStatus = "";
    persistViewState();
    syncApp();
  });
  app.$on("applySummary", (ev) => {
    const workItemId = Number(ev?.detail?.workItemId);
    if (workItemId && summaryDraft.trim()) {
      postMessage({ type: "addComment", workItemId, comment: summaryDraft.trim() });
      summaryWorkItemId = null;
      summaryDraft = "";
      summaryStatus = "Comment added successfully";
      persistViewState();
      syncApp();
      setTimeout(() => {
        summaryStatus = "";
        syncApp();
      }, 3e3);
    }
  });
  app.$on("toggleKanban", () => {
    kanbanView = !kanbanView;
    persistViewState();
    syncApp();
    postMessage({
      type: "uiPreferenceChanged",
      preferences: { kanbanView, filterText, typeFilter, stateFilter, sortKey }
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
      preferences: { kanbanView, filterText, typeFilter, stateFilter, sortKey }
    });
  });
  app.$on("queryChanged", (ev) => {
    const { query } = ev.detail || {};
    if (query && query !== selectedQuery) {
      selectedQuery = query;
      const queryOption = queryOptions.find((option) => option.value === query);
      queryDescription = queryOption?.description || "";
      if (activeConnectionId) {
        saveConnectionState(activeConnectionId);
      }
      loading = true;
      errorMsg = "";
      syncApp();
      postMessage({ type: "setQuery", query });
    }
  });
  app.$on("connectionChanged", (ev) => {
    const { connectionId } = ev.detail || {};
    if (connectionId && connectionId !== activeConnectionId) {
      if (activeConnectionId) {
        saveConnectionState(activeConnectionId);
      }
      applyConnectionState(connectionId);
      loading = true;
      errorMsg = "";
      syncApp();
      postMessage({ type: "switchConnection", connectionId });
    }
  });
  app.$on("selectionChanged", (ev) => {
    const { selectedIds } = ev.detail || {};
    if (Array.isArray(selectedIds)) {
      selectedWorkItemIds = new Set(selectedIds.map((id) => Number(id)));
    }
  });
  app.$on("bulkAssign", () => {
    postMessage({ type: "bulkAssign" });
  });
  app.$on("bulkMove", () => {
    postMessage({ type: "bulkMove" });
  });
  app.$on("bulkAddTags", () => {
    postMessage({ type: "bulkAddTags" });
  });
  app.$on("bulkDelete", () => {
    postMessage({ type: "bulkDelete" });
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
    _attemptSummaryGeneration();
  });
  app.$on("stopAndApplySummary", () => {
    _attemptStopAndApply();
  });
  app.$on("authReminderAction", (ev) => {
    const connectionId = typeof ev?.detail?.connectionId === "string" ? ev.detail.connectionId.trim() : "";
    const action2 = typeof ev?.detail?.action === "string" ? ev.detail.action : "";
    if (!connectionId || !action2) return;
    postMessage({ type: "authReminderAction", connectionId, action: action2 });
    if (action2 === "dismiss" || action2 === "signIn") {
      if (authReminderMap.delete(connectionId)) {
        authReminders = Array.from(authReminderMap.values());
        syncApp();
      }
    }
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
  if (options.ensureOpen && changed) {
    summaryWorkItemId = id;
    const item = findWorkItemById(id);
    if (item) {
      _summaryTargetTitle = getWorkItemTitle(id);
    }
  }
  const shouldRefresh = options.refreshDraft ?? changed;
  if (shouldRefresh) {
    const persisted = loadDraftForWorkItem(id);
    if (persisted !== null) {
      summaryDraft = persisted;
    } else if (!summaryDraft || changed) {
      summaryDraft = "";
    }
  }
  if (changed || shouldRefresh) {
    if (changed || shouldRefresh) {
      persistViewState();
    }
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
function _attemptSummaryGeneration() {
  const targetId = determineSummaryTargetId();
  if (!targetId) {
    const message = "Select a work item or start a timer to generate a summary.";
    setSummaryStatus(message, { timeout: 3500 });
    addToast(message, { type: "warning", timeout: 3500 });
    syncApp();
    return;
  }
  setSummaryBusy(true);
  setSummaryStatus("Generating summary\u2026");
  syncApp();
  postMessage({
    type: "generateCopilotPrompt",
    workItemId: targetId,
    draftSummary: summaryDraft
  });
}
function _attemptStopAndApply() {
  if (_timerStopData && _timerConnectionInfo && summaryWorkItemId) {
    if (summaryWorkItemId) saveDraftForWorkItem(summaryWorkItemId, summaryDraft);
    setSummaryBusy(true);
    setSummaryStatus("Applying timer updates\u2026");
    syncApp();
    postMessage({
      type: "submitComposeComment",
      workItemId: summaryWorkItemId,
      comment: summaryDraft,
      mode: "timerStop",
      timerData: _timerStopData,
      connectionInfo: _timerConnectionInfo
    });
    return;
  }
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
  const push2 = (value) => {
    const trimmed = value.trim();
    if (trimmed.length > 0) parts.push(trimmed.toLowerCase());
  };
  const visit = (value, depth = 0) => {
    if (value === null || value === void 0) return;
    if (typeof value === "string") {
      push2(value);
      return;
    }
    if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") {
      push2(String(value));
      return;
    }
    if (value instanceof Date) {
      push2(value.toISOString());
      return;
    }
    if (typeof value === "symbol") {
      push2(value.toString());
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
      identityKeys.forEach((key2) => {
        if (Object.prototype.hasOwnProperty.call(value, key2)) {
          visit(value[key2], depth + 1);
        }
      });
      Object.keys(value).forEach((key2) => {
        if (key2 === "__proto__") return;
        visit(value[key2], depth + 1);
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
  const norm = normalizeState(stateRaw);
  if (query) {
    const haystack = getSearchHaystack(it);
    if (!haystack.includes(query)) return false;
  }
  if (typeFilter && getWorkItemType(it) !== typeFilter) return false;
  if (stateFilter && stateFilter !== "all" && norm !== stateFilter) return false;
  return true;
}
function normalizeState(raw) {
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
    const norm = normalizeState(w?.fields?.["System.State"]);
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
    case "workItemsLoading": {
      const messageConnectionId = message?.connectionId;
      if (messageConnectionId && messageConnectionId !== activeConnectionId) {
        console.log(
          "[svelte-main] Ignoring workItemsLoading for inactive connection:",
          messageConnectionId,
          "active:",
          activeConnectionId
        );
        break;
      }
      console.log(
        "[svelte-main] workItemsLoading - showing loading state for query:",
        message?.query
      );
      initializing = false;
      loading = true;
      errorMsg = "";
      syncApp();
      break;
    }
    case "workItemsLoaded": {
      const items = Array.isArray(message.workItems) ? message.workItems : [];
      const messageConnectionId = message?.connectionId;
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
        console.log(
          "[svelte-main] messageConnectionId=",
          messageConnectionId,
          "activeConnectionId=",
          activeConnectionId
        );
        if (!items || items && items.length === 0) {
          try {
            console.warn("[svelte-main] workItemsLoaded arrived with 0 items \u2014 full message:");
            console.warn(JSON.stringify(message));
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
      if (messageConnectionId && messageConnectionId !== activeConnectionId) {
        console.warn(
          "[svelte-main] Ignoring workItemsLoaded for inactive connection:",
          messageConnectionId,
          "active:",
          activeConnectionId
        );
        break;
      }
      searchHaystackCache = /* @__PURE__ */ new WeakMap();
      lastWorkItems = items;
      if (items.length > 0) {
        initializing = false;
      }
      if (typeof message.kanbanView === "boolean") {
        kanbanView = message.kanbanView;
      }
      if (messageConnectionId && messageConnectionId === activeConnectionId) {
        applyConnectionState(messageConnectionId);
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
        if (!summaryDraft || !summaryDraft.trim()) {
          const persisted = loadDraftForWorkItem(summaryWorkItemId);
          if (persisted !== null) summaryDraft = persisted;
        }
      }
      syncApp();
      break;
    }
    case "workItemsError": {
      initializing = false;
      loading = false;
      errorMsg = String(message?.error || "Failed to load work items.");
      lastWorkItems = [];
      recomputeItemsForView();
      syncApp();
      break;
    }
    case "authReminder": {
      const connectionId = typeof message?.connectionId === "string" ? message.connectionId.trim() : "";
      if (!connectionId) break;
      const labelRaw = typeof message?.connectionLabel === "string" ? message.connectionLabel : "";
      const label = labelRaw && labelRaw.trim().length > 0 ? labelRaw.trim() : "Azure DevOps connection";
      const reminderMessage = typeof message?.message === "string" && message.message.trim().length > 0 ? message.message.trim() : `Microsoft Entra sign-in required for ${label}.`;
      const detail = typeof message?.detail === "string" && message.detail.trim().length > 0 ? message.detail.trim() : void 0;
      const reason = typeof message?.reason === "string" ? message.reason : void 0;
      const authMethod = message?.authMethod === "entra" ? "entra" : message?.authMethod === "pat" ? "pat" : void 0;
      const wasNew = !authReminderMap.has(connectionId);
      authReminderMap.set(connectionId, {
        connectionId,
        label,
        message: reminderMessage,
        detail,
        reason,
        authMethod
      });
      authReminders = Array.from(authReminderMap.values());
      syncApp();
      if (wasNew) {
        addToast(reminderMessage, { type: "warning", timeout: 6e3 });
      }
      break;
    }
    case "authReminderClear": {
      const connectionId = typeof message?.connectionId === "string" ? message.connectionId.trim() : "";
      if (!connectionId) break;
      if (authReminderMap.delete(connectionId)) {
        authReminders = Array.from(authReminderMap.values());
        syncApp();
      }
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
        setSummaryTarget(activeId, { ensureOpen: false, refreshDraft: targetChanged });
        setSummaryTarget(activeId, { ensureOpen: false, refreshDraft: targetChanged });
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
    case "showComposeComment": {
      const workItemId = typeof message.workItemId === "number" ? message.workItemId : null;
      const mode = typeof message.mode === "string" ? message.mode : "addComment";
      if (mode === "timerStop" && message.timerData && workItemId) {
        const hours = Number(
          message.timerData.hoursDecimal || message.timerData.duration / 3600 || 0
        );
        const fallbackTitle = getWorkItemTitle(workItemId) || `#${workItemId}`;
        setSummaryTarget(workItemId, { ensureOpen: true, refreshDraft: false });
        if (!summaryDraft || !summaryDraft.trim()) {
          const persisted = loadDraftForWorkItem(workItemId);
          if (persisted && persisted.length > 0) {
            summaryDraft = persisted;
          } else {
            summaryDraft = `Worked approximately ${hours.toFixed(2)} hours on ${fallbackTitle}. Summarize the key updates you completed.`;
          }
        }
        _timerStopData = message.timerData;
        _timerConnectionInfo = message.connectionInfo;
        syncApp();
        addToast(
          `Timer stopped. Review the comment and use "Stop & Apply" to apply time updates to work item #${workItemId}.`,
          { type: "info", timeout: 5e3 }
        );
      } else if (mode === "addComment" && workItemId) {
        setSummaryTarget(workItemId, { ensureOpen: true, refreshDraft: false });
        syncApp();
        addToast(`Ready to compose a comment for work item #${workItemId}.`, {
          type: "info",
          timeout: 3e3
        });
      }
      break;
    }
    case "composeCommentResult": {
      const workItemId = message.workItemId;
      const mode = message.mode;
      const success = message.success;
      const hours = message.hours;
      setSummaryBusy(false);
      if (!success) {
        const errorMessage = typeof message.error === "string" && message.error.trim().length > 0 ? message.error.trim() : `Failed to ${mode === "timerStop" ? "apply timer update" : "add comment"}.`;
        setSummaryStatus(errorMessage, { timeout: 8e3 });
        addToast(errorMessage, { type: "error", timeout: 5e3 });
        syncApp();
        break;
      }
      if (typeof workItemId === "number") {
        try {
          removeDraftForWorkItem(workItemId);
        } catch (e) {
          console.warn("[svelte-main] Failed to remove persisted draft after compose", e);
        }
      }
      if (mode === "timerStop") {
        _timerStopData = null;
        _timerConnectionInfo = null;
        const hoursStr = typeof hours === "number" ? hours.toFixed(2) : "0.00";
        setSummaryStatus(
          `Timer update applied: ${hoursStr} hours added to work item #${workItemId}`,
          { timeout: 5e3 }
        );
        addToast(`Timer update applied: ${hoursStr} hours added to work item #${workItemId}`, {
          type: "success",
          timeout: 4e3
        });
        summaryWorkItemId = null;
        summaryDraft = "";
      } else {
        setSummaryStatus(`Comment added to work item #${workItemId}`, { timeout: 3e3 });
        addToast(`Comment added to work item #${workItemId}`, { type: "success", timeout: 3e3 });
      }
      syncApp();
      break;
    }
    case "moveWorkItemResult": {
      const id = Number(message.id);
      if (!id || !pendingMoves.has(id)) break;
      const pending2 = pendingMoves.get(id);
      pendingMoves.delete(id);
      if (!message.success) {
        const found = (lastWorkItems || []).find((w) => Number(w.id) === id);
        if (found && found.fields && pending2) {
          found.fields["System.State"] = pending2.prevState;
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
        if (pending2 && pending2.prevState !== message.newState) {
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
      setSummaryStatus(`Applied ${hours.toFixed(2)} hours to work item #${id}.`, {
        timeout: 4e3
      });
      syncApp();
      break;
    }
    case "clearFilters": {
      filterText = "";
      typeFilter = "";
      stateFilter = "all";
      recomputeItemsForView();
      persistViewState();
      syncApp();
      addToast("Filters cleared", { type: "info", timeout: 2e3 });
      break;
    }
    case "focusSearch": {
      try {
        const searchInput = document.querySelector('input[type="text"]');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      } catch (err) {
        console.warn("[svelte-main] Failed to focus search", err);
      }
      break;
    }
    case "requestSelection": {
      const ids = Array.from(selectedWorkItemIds);
      postMessage({ type: "selectedWorkItems", ids });
      break;
    }
    case "connectionsUpdate": {
      const receivedConnections = Array.isArray(message?.connections) ? message.connections : [];
      connections = receivedConnections.map((conn) => ({
        id: String(conn.id || ""),
        label: String(conn.label || ""),
        organization: String(conn.organization || ""),
        project: String(conn.project || "")
      }));
      const newActiveConnectionId = message?.activeConnectionId ? String(message.activeConnectionId) : void 0;
      if (newActiveConnectionId && newActiveConnectionId !== activeConnectionId) {
        if (activeConnectionId) {
          saveConnectionState(activeConnectionId);
        }
        activeConnectionId = newActiveConnectionId;
        lastWorkItems = [];
        itemsForView = [];
        workItemCount = 0;
        loading = true;
        initializing = true;
        errorMsg = "";
        authReminderMap.clear();
        authReminders = [];
        applyConnectionState(activeConnectionId);
      } else {
        activeConnectionId = newActiveConnectionId;
      }
      try {
        console.log("[svelte-main] connectionsUpdate received:", {
          count: connections.length,
          activeConnectionId,
          connections: connections.map((c) => ({ id: c.id, label: c.label }))
        });
      } catch (err) {
        void err;
      }
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
function setupActivityDetection() {
  let lastActivityTime = Date.now();
  let activityPingTimer;
  const MIN_ACTIVITY_INTERVAL_MS = 1e3;
  const PING_DELAY_MS = 500;
  const scheduleActivityPing = () => {
    if (activityPingTimer) return;
    activityPingTimer = setTimeout(() => {
      activityPingTimer = void 0;
      postMessage({ type: "activity" });
    }, PING_DELAY_MS);
  };
  const recordActivity = () => {
    const now = Date.now();
    if (now - lastActivityTime < MIN_ACTIVITY_INTERVAL_MS) return;
    lastActivityTime = now;
    scheduleActivityPing();
  };
  const activityEvents = [
    "click",
    "keydown",
    "scroll",
    "mousemove",
    "touchstart",
    "focus"
  ];
  activityEvents.forEach((eventType) => {
    if (eventType === "keydown") {
      document.addEventListener(eventType, recordActivity);
    } else {
      document.addEventListener(eventType, recordActivity, { passive: true });
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scheduleActivityPing();
  });
  window.addEventListener("focus", () => scheduleActivityPing());
  scheduleActivityPing();
}
function boot() {
  window.addEventListener("message", (ev) => onMessage(ev.data));
  errorMsg = "";
  postMessage({ type: "webviewReady" });
  ensureApp();
  setupActivityDetection();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => boot());
} else {
  boot();
}
//# sourceMappingURL=svelte-main.js.map
