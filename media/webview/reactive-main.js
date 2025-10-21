/* Azure DevOps Integration - Webview Bundle */
"use strict";
(() => {
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
  var ELEMENT_NODE = 1;
  var TEXT_NODE = 3;
  var COMMENT_NODE = 8;
  var DOCUMENT_FRAGMENT_NODE = 11;

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
  function component_api_changed(method, component2) {
    if (dev_fallback_default) {
      const error = new Error(`component_api_changed
Calling \`${method}\` on a component instance (of ${component2}) is no longer valid in Svelte 5
https://svelte.dev/e/component_api_changed`);
      error.name = "Svelte error";
      throw error;
    } else {
      throw new Error(`https://svelte.dev/e/component_api_changed`);
    }
  }
  function component_api_invalid_new(component2, name) {
    if (dev_fallback_default) {
      const error = new Error(`component_api_invalid_new
Attempted to instantiate ${component2} with \`new ${name}\`, which is no longer valid in Svelte 5. If this component is not under your control, set the \`compatibility.componentApi\` compiler option to \`4\` to keep it working.
https://svelte.dev/e/component_api_invalid_new`);
      error.name = "Svelte error";
      throw error;
    } else {
      throw new Error(`https://svelte.dev/e/component_api_invalid_new`);
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
  function each_key_duplicate(a, b, value) {
    if (dev_fallback_default) {
      const error = new Error(`each_key_duplicate
${value ? `Keyed each block has duplicate key \`${value}\` at indexes ${a} and ${b}` : `Keyed each block has duplicate key at indexes ${a} and ${b}`}
https://svelte.dev/e/each_key_duplicate`);
      error.name = "Svelte error";
      throw error;
    } else {
      throw new Error(`https://svelte.dev/e/each_key_duplicate`);
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
  function console_log_state(method) {
    if (dev_fallback_default) {
      console.warn(`%c[svelte] console_log_state
%cYour \`console.${method}\` contained \`$state\` proxies. Consider using \`$inspect(...)\` or \`$state.snapshot(...)\` instead
https://svelte.dev/e/console_log_state`, bold, normal);
    } else {
      console.warn(`https://svelte.dev/e/console_log_state`);
    }
  }
  function event_handler_invalid(handler, suggestion) {
    if (dev_fallback_default) {
      console.warn(`%c[svelte] event_handler_invalid
%c${handler} should be a function. Did you mean to ${suggestion}?
https://svelte.dev/e/event_handler_invalid`, bold, normal);
    } else {
      console.warn(`https://svelte.dev/e/event_handler_invalid`);
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

  // node_modules/svelte/src/internal/flags/index.js
  var async_mode_flag = false;
  var legacy_mode_flag = false;
  var tracing_mode_flag = false;

  // node_modules/svelte/src/internal/shared/warnings.js
  var bold2 = "font-weight: bold";
  var normal2 = "font-weight: normal";
  function state_snapshot_uncloneable(properties) {
    if (dev_fallback_default) {
      console.warn(
        `%c[svelte] state_snapshot_uncloneable
%c${properties ? `The following properties cannot be cloned with \`$state.snapshot\` \u2014 the return value contains the originals:

${properties}` : "Value cannot be cloned with `$state.snapshot` \u2014 the original value was returned"}
https://svelte.dev/e/state_snapshot_uncloneable`,
        bold2,
        normal2
      );
    } else {
      console.warn(`https://svelte.dev/e/state_snapshot_uncloneable`);
    }
  }

  // node_modules/svelte/src/internal/shared/clone.js
  var empty = [];
  function snapshot(value, skip_warning = false, no_tojson = false) {
    if (dev_fallback_default && !skip_warning) {
      const paths = [];
      const copy = clone(value, /* @__PURE__ */ new Map(), "", paths, null, no_tojson);
      if (paths.length === 1 && paths[0] === "") {
        state_snapshot_uncloneable();
      } else if (paths.length > 0) {
        const slice = paths.length > 10 ? paths.slice(0, 7) : paths.slice(0, 10);
        const excess = paths.length - slice.length;
        let uncloned = slice.map((path) => `- <value>${path}`).join("\n");
        if (excess > 0) uncloned += `
- ...and ${excess} more`;
        state_snapshot_uncloneable(uncloned);
      }
      return copy;
    }
    return clone(value, /* @__PURE__ */ new Map(), "", empty, null, no_tojson);
  }
  function clone(value, cloned, path, paths, original = null, no_tojson = false) {
    if (typeof value === "object" && value !== null) {
      var unwrapped = cloned.get(value);
      if (unwrapped !== void 0) return unwrapped;
      if (value instanceof Map) return (
        /** @type {Snapshot<T>} */
        new Map(value)
      );
      if (value instanceof Set) return (
        /** @type {Snapshot<T>} */
        new Set(value)
      );
      if (is_array(value)) {
        var copy = (
          /** @type {Snapshot<any>} */
          Array(value.length)
        );
        cloned.set(value, copy);
        if (original !== null) {
          cloned.set(original, copy);
        }
        for (var i = 0; i < value.length; i += 1) {
          var element2 = value[i];
          if (i in value) {
            copy[i] = clone(element2, cloned, dev_fallback_default ? `${path}[${i}]` : path, paths, null, no_tojson);
          }
        }
        return copy;
      }
      if (get_prototype_of(value) === object_prototype) {
        copy = {};
        cloned.set(value, copy);
        if (original !== null) {
          cloned.set(original, copy);
        }
        for (var key2 in value) {
          copy[key2] = clone(
            // @ts-expect-error
            value[key2],
            cloned,
            dev_fallback_default ? `${path}.${key2}` : path,
            paths,
            null,
            no_tojson
          );
        }
        return copy;
      }
      if (value instanceof Date) {
        return (
          /** @type {Snapshot<T>} */
          structuredClone(value)
        );
      }
      if (typeof /** @type {T & { toJSON?: any } } */
      value.toJSON === "function" && !no_tojson) {
        return clone(
          /** @type {T & { toJSON(): any } } */
          value.toJSON(),
          cloned,
          dev_fallback_default ? `${path}.toJSON()` : path,
          paths,
          // Associate the instance with the toJSON clone
          value
        );
      }
    }
    if (value instanceof EventTarget) {
      return (
        /** @type {Snapshot<T>} */
        value
      );
    }
    try {
      return (
        /** @type {Snapshot<T>} */
        structuredClone(value)
      );
    } catch (e) {
      if (dev_fallback_default) {
        paths.push(path);
      }
      return (
        /** @type {Snapshot<T>} */
        value
      );
    }
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
  function add_svelte_meta(callback, type, component2, line, column, additional) {
    const parent = dev_stack;
    dev_stack = {
      type,
      file: component2[FILENAME],
      line,
      column,
      parent,
      ...additional
    };
    try {
      return callback();
    } finally {
      dev_stack = parent;
    }
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
      for (const root2 of root_effects) {
        __privateMethod(this, _Batch_instances, traverse_effect_tree_fn).call(this, root2);
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
  traverse_effect_tree_fn = function(root2) {
    root2.f ^= CLEAN;
    var effect2 = root2.first;
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
            for (const root2 of queued_root_effects) {
              __privateMethod(_a2 = batch, _Batch_instances, traverse_effect_tree_fn).call(_a2, root2);
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
  function user_derived(fn) {
    const d = /* @__PURE__ */ derived(fn);
    if (!async_mode_flag) push_reaction_value(d);
    return d;
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
  function strict_equals(a, b, equal = true) {
    try {
      if (a === b !== (get_proxied_value(a) === get_proxied_value(b))) {
        state_proxy_equality_mismatch(equal ? "===" : "!==");
      }
    } catch {
    }
    return a === b === equal;
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
  function schedule_possible_effect_self_invalidation(signal, effect2, root2 = true) {
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
        if (root2) {
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

  // node_modules/svelte/src/internal/client/dev/elements.js
  function add_locations(fn, filename, locations) {
    return (...args) => {
      const dom = fn(...args);
      var node = hydrating ? dom : dom.nodeType === DOCUMENT_FRAGMENT_NODE ? dom.firstChild : dom;
      assign_locations(node, filename, locations);
      return dom;
    };
  }
  function assign_location(element2, filename, location) {
    element2.__svelte_meta = {
      parent: dev_stack,
      loc: { file: filename, line: location[0], column: location[1] }
    };
    if (location[2]) {
      assign_locations(element2.firstChild, filename, location[2]);
    }
  }
  function assign_locations(node, filename, locations) {
    var i = 0;
    var depth = 0;
    while (node && i < locations.length) {
      if (hydrating && node.nodeType === COMMENT_NODE) {
        var comment2 = (
          /** @type {Comment} */
          node
        );
        if (comment2.data === HYDRATION_START || comment2.data === HYDRATION_START_ELSE) depth += 1;
        else if (comment2.data[0] === HYDRATION_END) depth -= 1;
      }
      if (depth === 0 && node.nodeType === ELEMENT_NODE) {
        assign_location(
          /** @type {Element} */
          node,
          filename,
          locations[i++]
        );
      }
      node = node.nextSibling;
    }
  }

  // node_modules/svelte/src/internal/client/dom/elements/events.js
  var all_registered_events = /* @__PURE__ */ new Set();
  var root_event_handles = /* @__PURE__ */ new Set();
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
  function apply(thunk, element2, args, component2, loc, has_side_effects = false, remove_parens = false) {
    let handler;
    let error;
    try {
      handler = thunk();
    } catch (e) {
      error = e;
    }
    if (typeof handler !== "function" && (has_side_effects || handler != null || error)) {
      const filename = component2?.[FILENAME];
      const location = loc ? ` at ${filename}:${loc[0]}:${loc[1]}` : ` in ${filename}`;
      const phase = args[0]?.eventPhase < Event.BUBBLING_PHASE ? "capture" : "";
      const event_name = args[0]?.type + phase;
      const description = `\`${event_name}\` handler${location}`;
      const suggestion = remove_parens ? "remove the trailing `()`" : "add a leading `() =>`";
      event_handler_invalid(description, suggestion);
      if (error) {
        throw error;
      }
    }
    handler?.apply(element2, args);
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
      var clone2 = (
        /** @type {TemplateNode} */
        use_import_node || is_firefox ? document.importNode(node, true) : node.cloneNode(true)
      );
      if (is_fragment) {
        var start = (
          /** @type {TemplateNode} */
          get_first_child(clone2)
        );
        var end = (
          /** @type {TemplateNode} */
          clone2.lastChild
        );
        assign_nodes(start, end);
      } else {
        assign_nodes(clone2, clone2);
      }
      return clone2;
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

  // node_modules/svelte/src/internal/client/dev/legacy.js
  function check_target(target) {
    if (target) {
      component_api_invalid_new(target[FILENAME] ?? "a component", target.name);
    }
  }
  function legacy_api() {
    const component2 = component_context?.function;
    function error(method) {
      component_api_changed(method, component2[FILENAME]);
    }
    return {
      $destroy: () => error("$destroy()"),
      $on: () => error("$on(...)"),
      $set: () => error("$set(...)")
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
  function append_styles(styles, important = false) {
    var separator = important ? " !important;" : ";";
    var css = "";
    for (var key2 in styles) {
      var value = styles[key2];
      if (value != null && value !== "") {
        css += " " + key2 + ": " + value + separator;
      }
    }
    return css;
  }
  function to_css_name(name) {
    if (name[0] !== "-" || name[1] !== "-") {
      return name.toLowerCase();
    }
    return name;
  }
  function to_style(value, styles) {
    if (styles) {
      var new_style = "";
      var normal_styles;
      var important_styles;
      if (Array.isArray(styles)) {
        normal_styles = styles[0];
        important_styles = styles[1];
      } else {
        normal_styles = styles;
      }
      if (value) {
        value = String(value).replaceAll(/\s*\/\*.*?\*\/\s*/g, "").trim();
        var in_str = false;
        var in_apo = 0;
        var in_comment = false;
        var reserved_names = [];
        if (normal_styles) {
          reserved_names.push(...Object.keys(normal_styles).map(to_css_name));
        }
        if (important_styles) {
          reserved_names.push(...Object.keys(important_styles).map(to_css_name));
        }
        var start_index = 0;
        var name_index = -1;
        const len = value.length;
        for (var i = 0; i < len; i++) {
          var c = value[i];
          if (in_comment) {
            if (c === "/" && value[i - 1] === "*") {
              in_comment = false;
            }
          } else if (in_str) {
            if (in_str === c) {
              in_str = false;
            }
          } else if (c === "/" && value[i + 1] === "*") {
            in_comment = true;
          } else if (c === '"' || c === "'") {
            in_str = c;
          } else if (c === "(") {
            in_apo++;
          } else if (c === ")") {
            in_apo--;
          }
          if (!in_comment && in_str === false && in_apo === 0) {
            if (c === ":" && name_index === -1) {
              name_index = i;
            } else if (c === ";" || i === len - 1) {
              if (name_index !== -1) {
                var name = to_css_name(value.substring(start_index, name_index).trim());
                if (!reserved_names.includes(name)) {
                  if (c !== ";") {
                    i++;
                  }
                  var property = value.substring(start_index, i).trim();
                  new_style += " " + property + ";";
                }
              }
              start_index = i + 1;
              name_index = -1;
            }
          }
        }
      }
      if (normal_styles) {
        new_style += append_styles(normal_styles);
      }
      if (important_styles) {
        new_style += append_styles(important_styles, true);
      }
      new_style = new_style.trim();
      return new_style === "" ? null : new_style;
    }
    return value == null ? null : String(value);
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

  // node_modules/svelte/src/internal/client/dom/elements/style.js
  function update_styles(dom, prev = {}, next2, priority) {
    for (var key2 in next2) {
      var value = next2[key2];
      if (prev[key2] !== value) {
        if (next2[key2] == null) {
          dom.style.removeProperty(key2);
        } else {
          dom.style.setProperty(key2, value, priority);
        }
      }
    }
  }
  function set_style(dom, value, prev_styles, next_styles) {
    var prev = dom.__style;
    if (hydrating || prev !== value) {
      var next_style_attr = to_style(value, next_styles);
      if (!hydrating || next_style_attr !== dom.getAttribute("style")) {
        if (next_style_attr == null) {
          dom.removeAttribute("style");
        } else {
          dom.style.cssText = next_style_attr;
        }
      }
      dom.__style = value;
    } else if (next_styles) {
      if (Array.isArray(next_styles)) {
        update_styles(dom, prev_styles?.[0], next_styles[0]);
        update_styles(dom, prev_styles?.[1], next_styles[1], "important");
      } else {
        update_styles(dom, prev_styles, next_styles);
      }
    }
    return next_styles;
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

  // node_modules/svelte/src/store/utils.js
  function subscribe_to_store(store, run2, invalidate) {
    if (store == null) {
      run2(void 0);
      if (invalidate) invalidate(void 0);
      return noop;
    }
    const unsub = untrack(
      () => store.subscribe(
        run2,
        // @ts-expect-error
        invalidate
      )
    );
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
  }

  // node_modules/svelte/src/store/shared/index.js
  var subscriber_queue = [];
  function readable(value, start) {
    return {
      subscribe: writable(value, start).subscribe
    };
  }
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
  function derived2(stores, fn, initial_value) {
    const single = !Array.isArray(stores);
    const stores_array = single ? [stores] : stores;
    if (!stores_array.every(Boolean)) {
      throw new Error("derived() expects stores as input, got a falsy value");
    }
    const auto = fn.length < 2;
    return readable(initial_value, (set2, update2) => {
      let started = false;
      const values = [];
      let pending2 = 0;
      let cleanup = noop;
      const sync = () => {
        if (pending2) {
          return;
        }
        cleanup();
        const result = fn(single ? values[0] : values, set2, update2);
        if (auto) {
          set2(result);
        } else {
          cleanup = typeof result === "function" ? result : noop;
        }
      };
      const unsubscribers = stores_array.map(
        (store, i) => subscribe_to_store(
          store,
          (value) => {
            values[i] = value;
            pending2 &= ~(1 << i);
            if (started) {
              sync();
            }
          },
          () => {
            pending2 |= 1 << i;
          }
        )
      );
      started = true;
      sync();
      return function stop() {
        run_all(unsubscribers);
        cleanup();
        started = false;
      };
    });
  }

  // node_modules/svelte/src/internal/client/reactivity/store.js
  var is_store_binding = false;
  var IS_UNMOUNTED = Symbol();
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

  // node_modules/svelte/src/internal/client/validate.js
  function validate_each_keys(collection, key_fn) {
    render_effect(() => {
      const keys = /* @__PURE__ */ new Map();
      const maybe_array = collection();
      const array = is_array(maybe_array) ? maybe_array : maybe_array == null ? [] : Array.from(maybe_array);
      const length = array.length;
      for (let i = 0; i < length; i++) {
        const key2 = key_fn(array[i], i);
        if (keys.has(key2)) {
          const a = String(keys.get(key2));
          const b = String(i);
          let k = String(key2);
          if (k.startsWith("[object ")) k = null;
          each_key_duplicate(a, b, k);
        }
        keys.set(key2, i);
      }
    });
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

  // node_modules/svelte/src/internal/client/dev/console-log.js
  function log_if_contains_state(method, ...objects) {
    untrack(() => {
      try {
        let has_state = false;
        const transformed = [];
        for (const obj of objects) {
          if (obj && typeof obj === "object" && STATE_SYMBOL in obj) {
            transformed.push(snapshot(obj, true));
            has_state = true;
          } else {
            transformed.push(obj);
          }
        }
        if (has_state) {
          console_log_state(method);
          console.log("%c[snapshot]", "color: grey", ...transformed);
        }
      } catch {
      }
    });
    return objects;
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
  function onMount(fn) {
    if (component_context === null) {
      lifecycle_outside_component("onMount");
    }
    if (legacy_mode_flag && component_context.l !== null) {
      init_update_callbacks(component_context).m.push(fn);
    } else {
      user_effect(() => {
        const cleanup = untrack(fn);
        if (typeof cleanup === "function") return (
          /** @type {() => void} */
          cleanup
        );
      });
    }
  }
  function init_update_callbacks(context) {
    var l = (
      /** @type {ComponentContextLegacy} */
      context.l
    );
    return l.u ?? (l.u = { a: [], b: [], m: [] });
  }

  // src/webview/contextIntegration.ts
  var contextState = writable(null);
  var connections = derived2(
    contextState,
    ($state) => $state?.connections || []
  );
  var activeConnection = derived2([contextState], ([$state]) => {
    if (!$state) return null;
    const targetId = $state.tab?.connectionId ?? $state.activeConnectionId;
    return $state.connections.find((c) => c.id === targetId) || null;
  });
  var workItems = derived2(
    contextState,
    ($state) => $state?.tab?.workItems || $state?.workItems || []
  );
  var timerState = derived2(
    contextState,
    ($state) => $state?.tab?.timer || $state?.timer || { isActive: false, isRunning: false, elapsed: 0 }
  );
  var isLoading = derived2(
    contextState,
    ($state) => $state?.tab?.status?.isLoading ?? $state?.isLoading ?? false
  );
  var contextActions = {
    switchConnection: (connectionId) => {
      console.log("[Webview Context] Switching connection to:", connectionId);
      if (window.vscode) {
        window.vscode.postMessage({
          type: "switchConnection",
          connectionId
        });
      }
    },
    startTimer: (workItemId) => {
      console.log("[Webview Context] Starting timer for:", workItemId);
      if (window.vscode) {
        window.vscode.postMessage({
          type: "startTimer",
          workItemId: parseInt(workItemId)
        });
      }
    },
    stopTimer: () => {
      console.log("[Webview Context] Stopping timer");
      if (window.vscode) {
        window.vscode.postMessage({
          type: "stopTimer"
        });
      }
    },
    refreshWorkItems: () => {
      console.log("[Webview Context] Refreshing work items");
      if (window.vscode) {
        window.vscode.postMessage({
          type: "refreshWorkItems"
        });
      }
    }
  };
  function handleContextMessage(event2) {
    if (event2.data?.type === "contextUpdate") {
      console.log("[Webview Context] Received context update:", event2.data.context);
      contextState.set(event2.data.context);
    }
  }
  if (typeof window !== "undefined") {
    window.addEventListener("message", handleContextMessage);
    if (window.vscode) {
      window.vscode.postMessage({ type: "getContext" });
    }
  }
  var contextDebug = {
    getState: () => {
      let currentState2 = null;
      const unsubscribe = contextState.subscribe((state2) => {
        currentState2 = state2;
      });
      unsubscribe();
      return currentState2;
    },
    logState: () => {
      console.log("[Context Debug] Current state:", contextDebug.getState());
    },
    testSwitchConnection: (connectionId) => {
      console.log("[Context Debug] Testing connection switch to:", connectionId);
      contextActions.switchConnection(connectionId);
    }
  };
  if (typeof window !== "undefined") {
    window.contextDebug = contextDebug;
    window.contextActions = contextActions;
  }
  console.log("\u{1F31F} [Webview Context] Context-driven integration initialized");

  // src/webview/fsm-webview.svelte.ts
  var vscodeApi = (() => {
    try {
      if (typeof window === "undefined") return null;
      if (window.vscode && typeof window.vscode.postMessage === "function") {
        return window.vscode;
      }
      if (typeof window.acquireVsCodeApi === "function") {
        const api = window.acquireVsCodeApi();
        if (api && typeof api.postMessage === "function") {
          window.vscode = api;
          return api;
        }
      }
    } catch (error) {
      console.warn("[webview-fsm] Failed to acquire VS Code API", error);
    }
    return null;
  })();
  function postMessageToExtension(message) {
    try {
      if (vscodeApi && typeof vscodeApi.postMessage === "function") {
        vscodeApi.postMessage(message);
        return;
      }
      if (typeof window !== "undefined" && window.parent?.postMessage) {
        window.parent.postMessage(message, "*");
      } else {
        console.warn("[webview-fsm] No messaging bridge available for extension message:", message);
      }
    } catch (error) {
      console.error("[webview-fsm] Failed to post message to extension", error, message);
    }
  }
  var currentState = state(proxy({
    value: "idle",
    context: {
      connectionId: void 0,
      isInitialized: false,
      connections: [],
      activeConnectionId: void 0,
      workItemsByConnection: /* @__PURE__ */ new Map(),
      timerActor: null,
      loadingStates: /* @__PURE__ */ new Map(),
      pendingAuthReminders: /* @__PURE__ */ new Map(),
      connectionStateSummaries: []
    },
    matches: (state2) => false,
    can: (eventType) => false
  }));
  var globalConnectionsCount = writable(0);
  var globalConnectionsArray = writable([]);
  var debugStore = writable("initial");
  var connectionsVersion = state(0);
  var connectionsCount = state(0);
  var errorState = null;
  var workItemsState = state(proxy([]));
  var connectionState = state(void 0);
  var isDataLoadingState = state(false);
  var isInitializingState = state(false);
  var isActivatedState = state(false);
  var fsmMock = {
    // Make it callable to return snapshot
    __call: () => get(currentState),
    // Provide snapshot property for direct access
    get snapshot() {
      return get(currentState);
    },
    // Provide error property
    get error() {
      return errorState;
    },
    // Additional properties that might be expected
    matches: (state2) => get(currentState).value === state2 || get(currentState).value.includes(state2),
    can: (eventType) => true,
    // Mock always allows events
    send: (event2) => console.log("[webview-fsm] Event sent:", event2)
  };
  var fsm = Object.assign(
    () => {
      const version = get(connectionsVersion);
      console.log("[webview-fsm] fsm() called with reactive version:", version, "connections:", get(currentState).context.connections?.length || 0);
      return get(currentState);
    },
    fsmMock
  );
  var connections2 = () => {
    const version = get(connectionsVersion);
    const result = get(currentState).context.connections || [];
    console.log("[webview-fsm] connections() called with version:", version, "count:", result.length);
    return result;
  };
  var activeConnection2 = () => get(connectionState);
  var isDataLoading = () => get(isDataLoadingState);
  var isInitializing = () => get(isInitializingState);
  var isActivated = () => get(isActivatedState);
  var selectors = {
    getWorkItemById: (workItemId) => {
      const allItems = Array.from(get(currentState).context.workItemsByConnection?.values() || []).flat();
      return allItems.find((item) => item.id.toString() === workItemId.toString());
    },
    getConnectionById: (connectionId) => {
      return get(currentState).context.connections?.find((conn) => conn.id === connectionId);
    },
    getActiveConnection: () => {
      const activeId = get(currentState).context.activeConnectionId;
      if (!activeId) return null;
      return get(currentState).context.connections?.find((conn) => conn.id === activeId) || null;
    }
  };
  var actions = {
    startConnection: (payload) => {
      console.log("[webview-fsm] Sending startConnection message", payload);
      postMessageToExtension({ type: "startConnection", payload });
    },
    stopConnection: () => {
      console.log("[webview-fsm] Sending stopConnection message");
      postMessageToExtension({ type: "stopConnection" });
    },
    loadWorkItems: (connId, query) => {
      console.log("[webview-fsm] Sending loadWorkItems message", { connId, query });
      postMessageToExtension({ type: "getWorkItems", connectionId: connId, query });
    },
    startTimer: (workItemId, title) => {
      console.log("[webview-fsm] Sending startTimer message", { workItemId, title });
      postMessageToExtension({ type: "startTimer", workItemId, title });
    },
    requireAuthentication: (connectionId) => {
      console.log("[webview-fsm] Sending requireAuthentication message", { connectionId });
      postMessageToExtension({ type: "requireAuthentication", connectionId });
    },
    setActiveConnection: (connectionId) => {
      console.log("[webview-fsm] Sending setActiveConnection message", { connectionId });
      postMessageToExtension({ type: "setActiveConnection", connectionId });
    }
  };
  function handleExtensionMessage(message) {
    if (message.type === "fsm-state-update") {
      get(currentState).value = message.state?.value || "idle";
      get(currentState).context = message.state?.context || { connectionId: void 0, isInitialized: false };
    }
    if (message.type === "contextUpdate") {
      const contextPayload = message.context || {};
      const incomingConnections = Array.isArray(contextPayload.connections) ? contextPayload.connections : [];
      const activeConnectionId = typeof contextPayload.activeConnectionId === "string" ? contextPayload.activeConnectionId : null;
      get(currentState).context.connections = incomingConnections;
      get(currentState).context.activeConnectionId = activeConnectionId || void 0;
      update(connectionsVersion);
      set(connectionsCount, incomingConnections.length, true);
      globalConnectionsCount.set(get(connectionsCount));
      globalConnectionsArray.set([...incomingConnections]);
      if (activeConnectionId) {
        const activeConn = incomingConnections.find((conn) => conn.id === activeConnectionId);
        if (activeConn) {
          set(connectionState, activeConn, true);
        }
      }
      const incomingWorkItems = Array.isArray(contextPayload.workItems) ? contextPayload.workItems : [];
      if (!(get(currentState).context.workItemsByConnection instanceof Map)) {
        get(currentState).context.workItemsByConnection = /* @__PURE__ */ new Map();
      }
      const workItemsMap = new Map(get(currentState).context.workItemsByConnection);
      if (activeConnectionId) {
        workItemsMap.set(activeConnectionId, incomingWorkItems);
        set(workItemsState, incomingWorkItems, true);
      } else {
        set(workItemsState, incomingWorkItems, true);
      }
      get(currentState).context.workItemsByConnection = workItemsMap;
      set(isDataLoadingState, Boolean(contextPayload.isLoading), true);
      set(isInitializingState, false);
      set(isActivatedState, true);
      const authReminderEntries = Array.isArray(contextPayload.authReminders) ? contextPayload.authReminders.filter((reminder) => typeof reminder?.connectionId === "string").map((reminder) => [reminder.connectionId, reminder]) : [];
      get(currentState).context.pendingAuthReminders = new Map(authReminderEntries);
      if (Array.isArray(contextPayload.connectionStateSummaries)) {
        get(currentState).context.connectionStateSummaries = [...contextPayload.connectionStateSummaries];
      }
      set(
        currentState,
        {
          ...get(currentState),
          context: {
            ...get(currentState).context,
            connections: [...incomingConnections],
            workItemsByConnection: new Map(workItemsMap),
            pendingAuthReminders: new Map(authReminderEntries),
            activeConnectionId: activeConnectionId || void 0,
            connectionStateSummaries: Array.isArray(contextPayload.connectionStateSummaries) ? [...contextPayload.connectionStateSummaries] : get(currentState).context.connectionStateSummaries
          }
        },
        true
      );
      return;
    }
    if (message.type === "work-items-update") {
      set(workItemsState, message.workItems || [], true);
      console.log("[webview-fsm] Work items updated:", message.workItems?.length, "from source:", message.source);
    }
    if (message.type === "connections-update") {
      const oldConnections = get(currentState).context.connections?.length || 0;
      get(currentState).context.connections = message.connections || [];
      get(currentState).context.activeConnectionId = message.activeConnectionId;
      if (message.activeConnectionId && get(currentState).context.connections) {
        const activeConn = get(currentState).context.connections.find((conn) => conn.id === message.activeConnectionId);
        if (activeConn) {
          set(connectionState, activeConn, true);
          console.log("[webview-fsm] Active connection set:", {
            id: activeConn.id,
            name: activeConn.name,
            url: activeConn.url
          });
        } else {
          console.warn("[webview-fsm] Active connection ID not found in connections list:", message.activeConnectionId);
        }
      }
      set(currentState, { ...get(currentState) }, true);
      update(connectionsVersion);
      set(connectionsCount, get(currentState).context.connections?.length || 0, true);
      globalConnectionsCount.set(get(connectionsCount));
      globalConnectionsArray.set([...get(currentState).context.connections || []]);
      debugStore.set(`updated-${get(connectionsCount)}-${Date.now()}`);
      const newConnections = get(currentState).context.connections?.length || 0;
      console.log("[webview-fsm] Connections updated:", message.connections?.length, "active:", message.activeConnectionId);
      console.log("[webview-fsm] Context state after update:", {
        oldCount: oldConnections,
        newCount: newConnections,
        contextConnections: get(currentState).context.connections?.length || 0,
        contextObject: typeof get(currentState).context,
        connectionsArray: Array.isArray(get(currentState).context.connections),
        stateReassigned: true,
        connectionsVersion: get(connectionsVersion),
        reactiveCount: get(connectionsCount),
        globalCountStore: "updated via store.set()",
        globalArrayStore: "updated via store.set()",
        debugStoreUpdated: true
      });
    }
    if (message.type === "connection-update") {
      set(connectionState, message.connection, true);
    }
    if (message.type === "loading-state-update") {
      set(isDataLoadingState, message.isDataLoading || false, true);
      set(isInitializingState, message.isInitializing || false, true);
      set(isActivatedState, message.isActivated || false, true);
    }
    if (message.type === "connectionSwitched") {
      console.log("\u{1F517} [webview-fsm] Connection switched:", {
        newConnectionId: message.connectionId,
        connection: message.connection,
        oldActiveId: get(currentState).context.activeConnectionId
      });
      if (get(currentState).context) {
        get(currentState).context.activeConnectionId = message.connectionId;
      }
      set(currentState, { ...get(currentState) }, true);
    }
    if (message.type === "connectionSwitchFailed") {
      console.error("\u{1F534} [webview-fsm] Connection switch failed:", { connectionId: message.connectionId, error: message.error });
    }
    if (message.type === "auth-reminders-update") {
      const remindersMap = /* @__PURE__ */ new Map();
      if (message.authReminders && Array.isArray(message.authReminders)) {
        message.authReminders.forEach((reminder) => {
          remindersMap.set(reminder.connectionId, reminder);
        });
      }
      get(currentState).context.pendingAuthReminders = remindersMap;
      console.log("[webview-fsm] Auth reminders updated:", remindersMap.size, "pending");
    }
  }

  // src/webview/store.svelte.ts
  var ui = proxy({
    activeTab: "work-items",
    previousTab: null,
    isLoadingWorkItems: false,
    isLoadingConnections: false,
    viewMode: "list",
    sortBy: "Created Date",
    sortDirection: "desc",
    selectedStates: [],
    searchQuery: "",
    assignedToMe: false,
    showConnectionDialog: false,
    showWorkItemDialog: false,
    showTimerDialog: false,
    selectedWorkItemId: null,
    selectedConnectionId: null,
    lastError: null,
    errorMessage: ""
  });
  var draft = proxy({
    connection: { url: "", personalAccessToken: "", project: "", name: "" },
    workItem: {
      title: "",
      description: "",
      type: "Task",
      state: "New",
      assignedTo: ""
    },
    timer: { workItemId: null, title: "", description: "" }
  });
  function connections3() {
    const snapshot2 = fsm();
    const result = snapshot2?.context?.connections || [];
    console.log("[store] connections() called:", {
      snapshotExists: !!snapshot2,
      contextExists: !!snapshot2?.context,
      connectionsExists: !!snapshot2?.context?.connections,
      connectionsLength: result.length,
      connectionsData: result,
      snapshotValue: snapshot2?.value
    });
    return result;
  }
  function activeConnection3() {
    const snapshot2 = fsm();
    const activeId = snapshot2?.context?.activeConnectionId;
    if (!activeId) return null;
    return connections3().find((conn) => conn.id === activeId) || null;
  }
  function allWorkItems() {
    const snapshot2 = fsm();
    const activeConnId = snapshot2?.context?.activeConnectionId;
    if (!activeConnId || !snapshot2?.context?.workItemsByConnection) {
      return [];
    }
    return Array.from(snapshot2.context.workItemsByConnection.get(activeConnId) || []);
  }
  var applySearchFilter = (items, query) => {
    const trimmed = query.trim();
    if (!trimmed) return items;
    const q = trimmed.toLowerCase();
    return items.filter((item) => item["System.Title"]?.toLowerCase().includes(q) || item["System.Description"]?.toLowerCase().includes(q) || item.id.toString().includes(q));
  };
  var applyStateFilter = (items, states) => {
    if (states.length === 0) return items;
    return items.filter((item) => states.includes(item["System.State"] || ""));
  };
  var applyAssignedToMeFilter = (items) => {
    if (!ui.assignedToMe) return items;
    const current = activeConnection3()?.currentUser;
    if (!current) return items;
    return items.filter((item) => item["System.AssignedTo"]?.uniqueName === current.uniqueName);
  };
  var sortWorkItems = (items, sortBy, direction) => {
    const sorted = [...items];
    sorted.sort((a, b) => {
      let aVal = a[sortBy] ?? "";
      let bVal = b[sortBy] ?? "";
      if (sortBy.includes("Date")) {
        aVal = new Date(String(aVal)).getTime();
        bVal = new Date(String(bVal)).getTime();
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      const comparison = String(aVal).localeCompare(String(bVal));
      return direction === "asc" ? comparison : -comparison;
    });
    return sorted;
  };
  function filteredWorkItems() {
    const initial = allWorkItems();
    const afterSearch = applySearchFilter(initial, ui.searchQuery);
    const afterState = applyStateFilter(afterSearch, ui.selectedStates);
    const afterAssignment = applyAssignedToMeFilter(afterState);
    return sortWorkItems(afterAssignment, ui.sortBy, ui.sortDirection);
  }
  function timerState2() {
    const snapshot2 = fsm();
    return snapshot2?.context?.timerActor?.getSnapshot?.() || null;
  }
  function isDataLoading2() {
    const snapshot2 = fsm();
    const activeConnId = snapshot2?.context?.activeConnectionId;
    if (!activeConnId || !snapshot2?.context?.loadingStates) {
      return false;
    }
    return snapshot2.context.loadingStates.get(activeConnId) || false;
  }
  var effectsInitialized = false;
  var syncUiWithFSM = () => {
    user_effect(() => {
      const snapshot2 = fsm();
      if (!snapshot2) return;
      ui.isLoadingWorkItems = isDataLoading2();
      ui.isLoadingConnections = snapshot2.matches?.("connections.loading") ?? false;
      if (!fsm.error) {
        ui.lastError = null;
        ui.errorMessage = "";
        return;
      }
      ui.lastError = fsm.error;
      ui.errorMessage = fsm.error.message;
    });
  };
  var persistDrafts = () => {
    user_effect(() => {
      try {
        localStorage.setItem("azuredevops-drafts", JSON.stringify(draft));
      } catch (error) {
        console.warn("[webviewStore] Failed to persist drafts:", error);
      }
    });
  };
  var restoreDrafts = () => {
    user_effect(() => {
      try {
        const stored = localStorage.getItem("azuredevops-drafts");
        if (stored) {
          const parsed = JSON.parse(stored);
          Object.assign(draft, parsed);
        }
      } catch (error) {
        console.warn("[webviewStore] Failed to restore drafts:", error);
      }
    });
  };
  function initializeStoreEffects() {
    if (effectsInitialized) return;
    effectsInitialized = true;
    syncUiWithFSM();
    persistDrafts();
    restoreDrafts();
  }
  var uiActions = {
    // Tab management
    setActiveTab: (tab) => {
      ui.previousTab = ui.activeTab;
      ui.activeTab = tab;
    },
    goToPreviousTab: () => {
      if (ui.previousTab) {
        const temp = ui.activeTab;
        ui.activeTab = ui.previousTab;
        ui.previousTab = temp;
      }
    },
    // Work items filters and view
    setSearchQuery: (query) => {
      ui.searchQuery = query;
    },
    setSelectedStates: (states) => {
      ui.selectedStates = states;
    },
    toggleState: (state2) => {
      const index2 = ui.selectedStates.indexOf(state2);
      if (index2 >= 0) {
        ui.selectedStates.splice(index2, 1);
      } else {
        ui.selectedStates.push(state2);
      }
    },
    setSortBy: (field) => {
      if (ui.sortBy === field) {
        ui.sortDirection = ui.sortDirection === "asc" ? "desc" : "asc";
      } else {
        ui.sortBy = field;
        ui.sortDirection = "asc";
      }
    },
    setViewMode: (mode) => {
      ui.viewMode = mode;
    },
    toggleAssignedToMe: () => {
      ui.assignedToMe = !ui.assignedToMe;
    },
    // Selection
    selectWorkItem: (id) => {
      ui.selectedWorkItemId = id;
    },
    selectConnection: (id) => {
      ui.selectedConnectionId = id;
    },
    // Dialogs
    showConnectionDialog: (show = true) => {
      ui.showConnectionDialog = show;
    },
    showWorkItemDialog: (show = true) => {
      ui.showWorkItemDialog = show;
    },
    showTimerDialog: (show = true) => {
      ui.showTimerDialog = show;
    },
    // Error handling
    clearError: () => {
      ui.lastError = null;
      ui.errorMessage = "";
    },
    setError: (error) => {
      ui.lastError = error instanceof Error ? error : new Error(error);
      ui.errorMessage = ui.lastError.message;
    },
    // Draft management
    updateConnectionDraft: (updates) => {
      Object.assign(draft.connection, updates);
    },
    updateWorkItemDraft: (updates) => {
      Object.assign(draft.workItem, updates);
    },
    updateTimerDraft: (updates) => {
      Object.assign(draft.timer, updates);
    },
    clearConnectionDraft: () => {
      draft.connection = { url: "", personalAccessToken: "", project: "", name: "" };
    },
    clearWorkItemDraft: () => {
      draft.workItem = {
        title: "",
        description: "",
        type: "Task",
        state: "New",
        assignedTo: ""
      };
    },
    clearTimerDraft: () => {
      draft.timer = { workItemId: null, title: "", description: "" };
    }
  };
  var integrationActions = {
    // Create new connection
    createConnection: () => {
      if (!draft.connection.url || !draft.connection.personalAccessToken) {
        uiActions.setError("URL and Personal Access Token are required");
        return;
      }
      const connection = { id: `conn-${Date.now()}`, ...draft.connection };
      actions.addConnection(connection);
      uiActions.clearConnectionDraft();
      uiActions.showConnectionDialog(false);
    },
    // Load work items with current filters
    loadWorkItems: () => {
      const snapshot2 = fsm();
      const connId = snapshot2?.context?.activeConnectionId;
      if (!connId) {
        uiActions.setError("No active connection");
        return;
      }
      let query = "";
      if (ui.selectedStates.length > 0) {
        query += `[System.State] IN (${ui.selectedStates.map((s) => `'${s}'`).join(", ")})`;
      }
      if (ui.assignedToMe) {
        const currentUser = activeConnection3()?.currentUser;
        if (currentUser) {
          if (query) query += " AND ";
          query += `[System.AssignedTo] = '${currentUser.uniqueName}'`;
        }
      }
      actions.loadWorkItems(connId, query);
    },
    // Start timer for selected work item
    startTimerForWorkItem: (workItemId) => {
      const workItem = selectors.getWorkItemById(workItemId);
      if (!workItem || !workItem["System.Title"]) {
        uiActions.setError("Work item not found");
        return;
      }
      actions.startTimer(workItemId, workItem["System.Title"]);
      uiActions.setActiveTab("timer");
    },
    // Switch to connection and load its data
    switchToConnection: (connectionId) => {
      actions.setActiveConnection(connectionId);
    }
  };
  var debug = {
    ui: () => ui,
    draft: () => draft,
    derived: {
      connections: () => connections3(),
      activeConnection: () => activeConnection3(),
      filteredWorkItems: () => filteredWorkItems(),
      timerState: () => timerState2(),
      isDataLoading: () => isDataLoading2()
    },
    actions: { ...uiActions, ...integrationActions },
    clearAll: () => {
      ui.activeTab = "work-items";
      ui.previousTab = null;
      ui.isLoadingWorkItems = false;
      ui.isLoadingConnections = false;
      ui.selectedStates = [];
      ui.searchQuery = "";
      ui.assignedToMe = false;
      ui.selectedWorkItemId = null;
      ui.selectedConnectionId = null;
      uiActions.clearError();
      uiActions.clearConnectionDraft();
      uiActions.clearWorkItemDraft();
      uiActions.clearTimerDraft();
      console.log("[webviewStore] All state cleared");
    }
  };

  // node_modules/svelte/src/version.js
  var PUBLIC_VERSION = "5";

  // node_modules/svelte/src/internal/disclose-version.js
  var _a;
  if (typeof window !== "undefined") {
    ((_a = window.__svelte ?? (window.__svelte = {})).v ?? (_a.v = /* @__PURE__ */ new Set())).add(PUBLIC_VERSION);
  }

  // src/webview/ReactiveApp.svelte
  ReactiveApp[FILENAME] = "src/webview/ReactiveApp.svelte";
  function handleQueryChange(e, selectedQuery) {
    set(selectedQuery, e.target.value, true);
    integrationActions.loadWorkItems();
  }
  function toggleKanbanView(_, kanbanView) {
    set(kanbanView, !get(kanbanView));
    addToast(`Switched to ${get(kanbanView) ? "Kanban" : "List"} view`, { type: "info" });
  }
  function clearSelection(__1, selectedItems) {
    get(selectedItems).clear();
    set(selectedItems, /* @__PURE__ */ new Set(), true);
  }
  var on_click = (
    // Kanban helpers
    // Lifecycle
    // Initialize store effects (critical for proper FSM operation)
    // Listen for VS Code messages
    // Request initial data
    (__2, onConnectionSelect, connection) => onConnectionSelect()(get(connection).id)
  );
  var root_2 = add_locations(from_html(`<button role="tab"> </button>`), ReactiveApp[FILENAME], [[667, 8]]);
  var root_1 = add_locations(from_html(`<div class="connection-tabs svelte-1s1bz3t" role="tablist" aria-label="Project connections"></div>`), ReactiveApp[FILENAME], [[665, 4]]);
  var on_click_1 = (__3, handleAuthReminderAction, reminder) => handleAuthReminderAction(get(reminder).connectionId, "signIn");
  var on_click_2 = (__4, handleAuthReminderAction, reminder) => handleAuthReminderAction(get(reminder).connectionId, "dismiss");
  var root_4 = add_locations(from_html(`<div class="auth-reminder svelte-1s1bz3t" role="alert"><div class="auth-reminder-icon svelte-1s1bz3t" aria-hidden="true">\u26A0\uFE0F</div> <div class="auth-reminder-body svelte-1s1bz3t"><div class="auth-reminder-title svelte-1s1bz3t"> </div> <div class="auth-reminder-detail svelte-1s1bz3t"> </div></div> <div class="auth-reminder-actions svelte-1s1bz3t"><button class="primary svelte-1s1bz3t">Sign In</button> <button class="secondary svelte-1s1bz3t">Dismiss</button></div></div>`), ReactiveApp[FILENAME], [
    [
      686,
      8,
      [
        [687, 10],
        [688, 10, [[689, 12], [692, 12]]],
        [697, 10, [[698, 12], [704, 12]]]
      ]
    ]
  ]);
  var root_3 = add_locations(from_html(`<div class="auth-reminders svelte-1s1bz3t" role="region" aria-label="Authentication reminders"></div>`), ReactiveApp[FILENAME], [[684, 4]]);
  var on_click_3 = (__5, triggerManualSignIn) => triggerManualSignIn();
  var root_6 = add_locations(from_html(`<div class="manual-signin svelte-1s1bz3t" role="region" aria-label="Manual sign-in"><div class="manual-signin-card svelte-1s1bz3t"><div class="manual-signin-icon svelte-1s1bz3t" aria-hidden="true">\u{1F510}</div> <div class="manual-signin-content svelte-1s1bz3t"><div class="manual-signin-title svelte-1s1bz3t">Sign In Required</div> <div class="manual-signin-message svelte-1s1bz3t"><!></div></div> <div class="manual-signin-actions svelte-1s1bz3t"><button class="primary svelte-1s1bz3t" title="Sign in to the active connection">Start Sign In</button></div></div></div>`), ReactiveApp[FILENAME], [
    [
      716,
      4,
      [
        [
          717,
          6,
          [
            [718, 8],
            [719, 8, [[720, 10], [721, 10]]],
            [729, 8, [[730, 10]]]
          ]
        ]
      ]
    ]
  ]);
  var root_9 = add_locations(from_html(`<div class="init-status svelte-1s1bz3t"><div class="init-progress svelte-1s1bz3t"><div class="init-progress-bar svelte-1s1bz3t"></div></div> <div class="init-message svelte-1s1bz3t"><!></div></div>`), ReactiveApp[FILENAME], [[744, 4, [[745, 6, [[746, 8]]], [748, 6]]]]);
  var root_16 = add_locations(from_html(`<option class="svelte-1s1bz3t"> </option>`), ReactiveApp[FILENAME], [[775, 10]]);
  var root_17 = add_locations(from_html(`<div class="query-description svelte-1s1bz3t"> </div>`), ReactiveApp[FILENAME], [[779, 8]]);
  var root_18 = add_locations(from_html(`<span class="spinner svelte-1s1bz3t" role="status" aria-label="Loading" title="Loading"></span>`), ReactiveApp[FILENAME], [[788, 6]]);
  var on_click_4 = (__6, handleItemAction, activeWorkItemId) => handleItemAction("view", { id: get(activeWorkItemId) });
  var root_21 = add_locations(from_html(`<button class="svelte-1s1bz3t"></button>`), ReactiveApp[FILENAME], [[797, 8]]);
  var root_19 = add_locations(from_html(`<span class="muted svelte-1s1bz3t"> <!></span> <!>`, 1), ReactiveApp[FILENAME], [[792, 6]]);
  var root_22 = add_locations(from_html(`<button title="Clear selection (Esc)" aria-label="Clear selection" class="svelte-1s1bz3t"><span class="codicon codicon-close svelte-1s1bz3t"></span> </button>`), ReactiveApp[FILENAME], [[818, 8, [[819, 10]]]]);
  var root_23 = add_locations(from_html(`<div class="error-banner svelte-1s1bz3t" role="alert"><div style="font-weight: 600; margin-bottom: 4px;" class="svelte-1s1bz3t">\u26A0\uFE0F Error Loading Work Items</div> <div class="svelte-1s1bz3t"> </div> <button style="margin-top: 8px;" class="svelte-1s1bz3t">Retry</button></div>`), ReactiveApp[FILENAME], [[829, 6, [[830, 8], [831, 8], [832, 8]]]]);
  var root_25 = add_locations(from_html(`<div class="loading svelte-1s1bz3t"><span class="spinner svelte-1s1bz3t" role="status" aria-label="Loading"></span> Loading work items\u2026</div>`), ReactiveApp[FILENAME], [[835, 6, [[836, 8]]]]);
  var root_27 = add_locations(from_html(`<div class="empty svelte-1s1bz3t"><div style="margin-bottom: 16px;" class="svelte-1s1bz3t">No work items to display.</div> <button class="svelte-1s1bz3t">Refresh</button></div>`), ReactiveApp[FILENAME], [[839, 6, [[840, 8], [841, 8]]]]);
  var on_click_5 = (__7, toggleItemSelection, item) => toggleItemSelection(Number(get(item).id));
  var root_31 = add_locations(from_html(`<span class="timer-indicator svelte-1s1bz3t"><span class="codicon codicon-clock svelte-1s1bz3t" aria-hidden="true"></span> </span>`), ReactiveApp[FILENAME], [[872, 20, [[873, 22]]]]);
  var on_click_6 = (__8, handleStopTimer) => handleStopTimer();
  var root_32 = add_locations(from_html(`<button class="action-btn stop compact svelte-1s1bz3t" title="Stop timer"><span class="codicon codicon-debug-stop svelte-1s1bz3t" aria-hidden="true"></span></button>`), ReactiveApp[FILENAME], [[897, 20, [[903, 22]]]]);
  var on_click_7 = (__9, handleItemAction, item) => handleItemAction("start", get(item));
  var root_33 = add_locations(from_html(`<button class="action-btn start compact svelte-1s1bz3t" title="Start timer"><span class="codicon codicon-play svelte-1s1bz3t" aria-hidden="true"></span></button>`), ReactiveApp[FILENAME], [[906, 20, [[913, 22]]]]);
  var on_click_8 = (__10, handleItemAction, item) => handleItemAction("view", get(item));
  var root_30 = add_locations(from_html(`<div><div class="work-item-header svelte-1s1bz3t"><input type="checkbox" class="work-item-checkbox svelte-1s1bz3t"/> <span class="work-item-type-icon svelte-1s1bz3t"> </span> <span class="work-item-id svelte-1s1bz3t"> </span> <!></div> <div class="work-item-content svelte-1s1bz3t"><div class="work-item-title svelte-1s1bz3t"> </div> <div class="work-item-meta svelte-1s1bz3t"><span class="work-item-type svelte-1s1bz3t"> </span> <span> </span></div></div> <div class="work-item-actions svelte-1s1bz3t"><!> <button class="action-btn view compact svelte-1s1bz3t" title="View"><span class="codicon codicon-eye svelte-1s1bz3t" aria-hidden="true"></span></button></div></div>`), ReactiveApp[FILENAME], [
    [
      853,
      14,
      [
        [859, 16, [[860, 18], [867, 18], [870, 18]]],
        [879, 16, [[880, 18], [883, 18, [[884, 20], [887, 20]]]]],
        [895, 16, [[916, 18, [[922, 20]]]]]
      ]
    ]
  ]);
  var root_29 = add_locations(from_html(`<div class="kanban-board svelte-1s1bz3t" aria-label="Kanban board"><div class="kanban-column svelte-1s1bz3t"><div class="kanban-column-header svelte-1s1bz3t"><h3 class="svelte-1s1bz3t">Work Items</h3> <span class="item-count svelte-1s1bz3t"> </span></div> <div class="kanban-column-content svelte-1s1bz3t"></div></div></div>`), ReactiveApp[FILENAME], [
    [
      845,
      6,
      [[846, 8, [[847, 10, [[848, 12], [849, 12]]], [851, 10]]]]
    ]
  ]);
  var on_click_9 = (__11, toggleItemSelection, item) => toggleItemSelection(Number(get(item).id));
  var root_36 = add_locations(from_html(`<span class="timer-indicator svelte-1s1bz3t"><span class="codicon codicon-clock svelte-1s1bz3t" aria-hidden="true"></span> </span>`), ReactiveApp[FILENAME], [[958, 16, [[959, 18]]]]);
  var root_37 = add_locations(from_html(`<span class="codicon codicon-account svelte-1s1bz3t" aria-hidden="true"></span> `, 1), ReactiveApp[FILENAME], [[983, 20]]);
  var root_38 = add_locations(from_html(`<span class="codicon codicon-account svelte-1s1bz3t" aria-hidden="true"></span> Unassigned`, 1), ReactiveApp[FILENAME], [[987, 20]]);
  var on_click_10 = (__12, handleStopTimer) => handleStopTimer();
  var root_39 = add_locations(from_html(`<button class="action-btn stop svelte-1s1bz3t" title="Stop timer"><span class="codicon codicon-debug-stop svelte-1s1bz3t" aria-hidden="true"></span> Stop</button>`), ReactiveApp[FILENAME], [[995, 16, [[1001, 18]]]]);
  var on_click_11 = (__13, handleItemAction, item) => handleItemAction("start", get(item));
  var root_40 = add_locations(from_html(`<button class="action-btn start svelte-1s1bz3t" title="Start timer"><span class="codicon codicon-play svelte-1s1bz3t" aria-hidden="true"></span> Start</button>`), ReactiveApp[FILENAME], [[1004, 16, [[1011, 18]]]]);
  var on_click_12 = (__14, handleItemAction, item) => handleItemAction("view", get(item));
  var on_click_13 = (__15, handleItemAction, item) => handleItemAction("edit", get(item));
  var root_35 = add_locations(from_html(`<div tabindex="0" role="button"><div class="work-item-header svelte-1s1bz3t"><input type="checkbox" class="work-item-checkbox svelte-1s1bz3t"/> <span class="work-item-type-icon svelte-1s1bz3t"> </span> <span class="work-item-id svelte-1s1bz3t"> </span> <!> <span> </span></div> <div class="work-item-content svelte-1s1bz3t"><div class="work-item-title svelte-1s1bz3t"> </div> <div class="work-item-meta svelte-1s1bz3t"><span class="work-item-type svelte-1s1bz3t"> </span> <span> </span> <span class="work-item-assignee svelte-1s1bz3t"><!></span></div></div> <div class="work-item-actions svelte-1s1bz3t"><!> <button class="action-btn view svelte-1s1bz3t" title="View in browser"><span class="codicon codicon-eye svelte-1s1bz3t" aria-hidden="true"></span> View</button> <button class="action-btn edit svelte-1s1bz3t" title="Edit work item"><span class="codicon codicon-edit svelte-1s1bz3t" aria-hidden="true"></span> Edit</button></div></div>`), ReactiveApp[FILENAME], [
    [
      934,
      10,
      [
        [945, 12, [[946, 14], [953, 14], [956, 14], [963, 14]]],
        [
          972,
          12,
          [[973, 14], [976, 14, [[977, 16], [978, 16], [981, 16]]]]
        ],
        [
          993,
          12,
          [[1014, 14, [[1020, 16]]], [1022, 14, [[1028, 16]]]]
        ]
      ]
    ]
  ]);
  var root_34 = add_locations(from_html(`<div class="items svelte-1s1bz3t" aria-label="Work items"></div>`), ReactiveApp[FILENAME], [[932, 6]]);
  var root = add_locations(from_html(`<div class="pane svelte-1s1bz3t"><!> <!> <!> <div class="query-header svelte-1s1bz3t" role="toolbar" aria-label="Query selection"><div class="query-selector-container svelte-1s1bz3t"><label for="querySelect" class="query-selector-label svelte-1s1bz3t">Query</label> <select id="querySelect" class="query-selector svelte-1s1bz3t" title="Select a query to filter work items" aria-label="Select query"></select> <!></div></div> <div class="pane-header svelte-1s1bz3t" role="toolbar" aria-label="Work Items actions"><span style="font-weight:600;" class="svelte-1s1bz3t">Work Items</span> <!> <span class="count svelte-1s1bz3t"> </span> <!> <span class="actions svelte-1s1bz3t" style="margin-left:auto;"><button title="Refresh work items (R)" aria-label="Refresh" class="svelte-1s1bz3t"><span class="codicon codicon-refresh svelte-1s1bz3t"></span></button> <button title="Toggle view (V)" aria-label="Toggle Kanban view" class="svelte-1s1bz3t"><span></span></button> <button title="Create work item" aria-label="Create new work item" class="svelte-1s1bz3t"><span class="codicon codicon-add svelte-1s1bz3t"></span></button> <!></span></div> <div class="pane-body svelte-1s1bz3t"><!></div></div>`), ReactiveApp[FILENAME], [
    [
      662,
      0,
      [
        [763, 2, [[764, 4, [[765, 6], [766, 6]]]]],
        [
          785,
          2,
          [
            [786, 4],
            [790, 4],
            [
              807,
              4,
              [
                [808, 6, [[809, 8]]],
                [811, 6, [[812, 8]]],
                [814, 6, [[815, 8]]]
              ]
            ]
          ]
        ],
        [827, 2]
      ]
    ]
  ]);
  function ReactiveApp($$anchor, $$props) {
    check_target(new.target);
    push($$props, true, ReactiveApp);
    console.log("\u{1F7E2} [ReactiveApp] Component is being instantiated - script block executing");
    function showToast(message, type = "info") {
      console.log(`\u{1F35E} [Toast-${type}] ${message}`);
    }
    let onConnectionSelect = prop($$props, "onConnectionSelect", 3, () => {
    }), onTimerStart = prop($$props, "onTimerStart", 3, () => {
    }), onTimerStop = prop($$props, "onTimerStop", 3, () => {
    }), onTimerPause = prop($$props, "onTimerPause", 3, () => {
    }), onWorkItemMove = prop($$props, "onWorkItemMove", 3, () => {
    }), onWorkItemCreate = prop($$props, "onWorkItemCreate", 3, () => {
    }), onRefreshData = prop($$props, "onRefreshData", 3, () => {
    }), onAuthResolve = prop($$props, "onAuthResolve", 3, (connectionId) => {
      console.log(...log_if_contains_state("log", "\u{1F510} [ReactiveApp] Starting authentication for connection:", connectionId));
    }), onRetry = prop($$props, "onRetry", 3, () => {
    }), onDebugState = prop($$props, "onDebugState", 3, () => console.log("Debug state: simplified mode"));
    let loading = tag(state(false), "loading");
    let errorMsg = tag(state(""), "errorMsg");
    let selectedItems = tag(state(proxy(/* @__PURE__ */ new Set())), "selectedItems");
    let focusedIndex = 0;
    let kanbanView = tag(state(false), "kanbanView");
    let filterText = "";
    let typeFilter = "";
    let stateFilter = "all";
    let sortKey = "title-asc";
    let selectedQuery = tag(state("My Activity"), "selectedQuery");
    let queryDescription = tag(state(""), "queryDescription");
    let timerActive = tag(user_derived(() => false), "timerActive");
    let timerRunning = tag(user_derived(() => false), "timerRunning");
    let timerElapsedLabel = tag(user_derived(() => "00:00:00"), "timerElapsedLabel");
    let activeWorkItemId = tag(user_derived(() => 0), "activeWorkItemId");
    let activeWorkItemTitle = tag(user_derived(() => ""), "activeWorkItemTitle");
    function formatElapsedTime(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor(seconds % 3600 / 60);
      const secs = seconds % 60;
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    let authReminders = tag(state(proxy([])), "authReminders");
    let authenticatedConnections = tag(state(proxy(/* @__PURE__ */ new Set())), "authenticatedConnections");
    let connectionStateSummaries = tag(state(proxy([])), "connectionStateSummaries");
    let workItemCount = tag(user_derived(() => filteredWorkItems().length), "workItemCount");
    let hasItems = tag(user_derived(() => get(workItemCount) > 0), "hasItems");
    let initStatus = tag(
      user_derived(() => ({
        phase: isInitializing() ? "initializing" : isActivated() ? "active" : "inactive",
        progress: isActivated() ? 100 : isInitializing() ? 50 : 0
      })),
      "initStatus"
    );
    let currentConnection = tag(user_derived(activeConnection2), "currentConnection");
    let connectionsList = tag(user_derived(connections2), "connectionsList");
    let dataLoading = tag(user_derived(isDataLoading), "dataLoading");
    let isAppInitializing = tag(user_derived(isInitializing), "isAppInitializing");
    let isAppActivated = tag(user_derived(isActivated), "isAppActivated");
    let activeConnectionId = tag(user_derived(() => get(currentConnection)?.id ?? null), "activeConnectionId");
    let activeConnectionStatus = tag(
      user_derived(() => get(activeConnectionId) ? get(connectionStateSummaries).find((summary) => strict_equals(summary.id, get(activeConnectionId))) ?? null : null),
      "activeConnectionStatus"
    );
    let isActiveConnectionAuthenticated = tag(
      user_derived(() => get(activeConnectionStatus) ? get(activeConnectionStatus).isConnected : get(activeConnectionId) ? get(authenticatedConnections).has(get(activeConnectionId)) : false),
      "isActiveConnectionAuthenticated"
    );
    let shouldShowManualSignIn = tag(user_derived(() => strict_equals(get(authReminders).length, 0) && (get(connectionsList)?.length || 0) > 0 && !get(dataLoading) && !get(hasItems) && !!get(activeConnectionId) && !get(isActiveConnectionAuthenticated) && !(get(activeConnectionStatus)?.reauthInProgress ?? false)), "shouldShowManualSignIn");
    function markConnectionAuthenticated(connectionId) {
      if (!connectionId) return;
      if (get(authenticatedConnections).has(connectionId)) return;
      const updated = new Set(get(authenticatedConnections));
      updated.add(connectionId);
      set(authenticatedConnections, updated, true);
    }
    function markConnectionRequiresAuth(connectionId) {
      if (!connectionId) return;
      if (!get(authenticatedConnections).has(connectionId)) return;
      const updated = new Set(get(authenticatedConnections));
      updated.delete(connectionId);
      set(authenticatedConnections, updated, true);
    }
    function upsertAuthReminder(reminder) {
      set(
        authReminders,
        [
          ...get(authReminders).filter((r) => strict_equals(r.connectionId, reminder.connectionId, false)),
          reminder
        ],
        true
      );
    }
    function clearAuthReminder(connectionId) {
      set(authReminders, get(authReminders).filter((r) => strict_equals(r.connectionId, connectionId, false)), true);
    }
    function applyAuthReminderPayload(reminders, connectionOverride) {
      const normalizedReminders = Array.isArray(reminders) ? reminders.map((reminder) => {
        const connectionId = strict_equals(typeof reminder?.connectionId, "string") ? reminder.connectionId.trim() : "";
        if (!connectionId) {
          return null;
        }
        const connectionLabel = get(connectionsList)?.find((conn) => strict_equals(conn.id, connectionId))?.label ?? connectionId;
        const reason = strict_equals(typeof reminder?.reason, "string") && reminder.reason.trim().length > 0 ? reminder.reason.trim() : "authRequired";
        const detail = strict_equals(typeof reminder?.detail, "string") ? reminder.detail : void 0;
        return {
          connectionId,
          label: connectionLabel,
          message: strict_equals(reason, "authFailed") ? `Sign in failed for ${connectionLabel}. Try again.` : `Sign in required for ${connectionLabel}.`,
          detail
        };
      }).filter(Boolean) : [];
      set(authReminders, normalizedReminders, true);
      const reminderIds = new Set(normalizedReminders.map((entry) => entry.connectionId));
      let updatedAuthenticated = new Set(get(authenticatedConnections));
      let changed = false;
      reminderIds.forEach((connectionId) => {
        if (updatedAuthenticated.delete(connectionId)) {
          changed = true;
        }
      });
      const activeConnectionIdCandidate = connectionOverride || get(activeConnectionId);
      if (strict_equals(reminderIds.size, 0) && activeConnectionIdCandidate) {
        updatedAuthenticated.add(activeConnectionIdCandidate);
        changed = true;
      }
      if (changed) {
        set(authenticatedConnections, updatedAuthenticated, true);
      }
    }
    const queryOptions = [
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
    function handleVSCodeMessage(event2) {
      const message = event2.data;
      switch (message.type) {
        case "contextUpdate": {
          if (strict_equals(typeof handleExtensionMessage, "function")) {
            handleExtensionMessage(message);
          }
          const payload = message.context;
          if (!payload || strict_equals(typeof payload, "object", false)) {
            break;
          }
          if (Array.isArray(payload.connectionStateSummaries)) {
            set(
              connectionStateSummaries,
              payload.connectionStateSummaries.map((entry) => ({
                id: entry.id,
                isConnected: Boolean(entry.isConnected),
                hasClient: Boolean(entry.hasClient),
                hasProvider: Boolean(entry.hasProvider),
                reauthInProgress: Boolean(entry.reauthInProgress)
              })),
              true
            );
            const connectedIds = get(connectionStateSummaries).filter((entry) => entry.isConnected).map((entry) => entry.id);
            set(authenticatedConnections, new Set(connectedIds), true);
          }
          const nextActiveId = strict_equals(typeof payload.activeConnectionId, "string") ? payload.activeConnectionId : null;
          const activeSummary = nextActiveId ? get(connectionStateSummaries).find((entry) => strict_equals(entry.id, nextActiveId)) : void 0;
          if (activeSummary) {
            if (activeSummary.isConnected) {
              markConnectionAuthenticated(nextActiveId);
            } else if (!activeSummary.reauthInProgress) {
              markConnectionRequiresAuth(nextActiveId);
            }
          } else if (nextActiveId) {
            markConnectionAuthenticated(nextActiveId);
          }
          applyAuthReminderPayload(payload.authReminders, nextActiveId);
          set(loading, Boolean(payload.isLoading), true);
          if (!get(loading)) {
            set(errorMsg, "");
          }
          break;
        }
        case "workItemsLoaded":
          set(loading, false);
          set(errorMsg, "");
          showToast(`Loaded ${get(workItemCount)} work items`, "success");
          break;
        case "timerState":
          break;
        case "queryChanged":
          set(queryDescription, message.description || "", true);
          if (message.query && strict_equals(typeof message.query, "string")) {
            set(selectedQuery, message.query, true);
            console.log(...log_if_contains_state("log", "\u{1F504} [Webview] Query updated from backend:", {
              newQuery: get(selectedQuery),
              description: get(queryDescription),
              connectionId: message.connectionId
            }));
          }
          break;
        case "work-items-update": {
          if (strict_equals(typeof handleExtensionMessage, "function")) {
            handleExtensionMessage(message);
          }
          set(loading, false);
          set(errorMsg, "");
          const connectionId = strict_equals(typeof message.connectionId, "string") ? message.connectionId : strict_equals(typeof message.metadata?.connectionId, "string") ? message.metadata.connectionId : get(currentConnection)?.id;
          if (connectionId) {
            markConnectionAuthenticated(connectionId);
            clearAuthReminder(connectionId);
          }
          break;
        }
        case "auth-reminders-update": {
          applyAuthReminderPayload(message.authReminders);
          break;
        }
        case "error":
          set(errorMsg, message.error || "An error occurred", true);
          set(loading, false);
          showToast(get(errorMsg), "error");
          break;
        case "loading":
          set(loading, message.loading ?? false, true);
          if (get(loading)) {
            set(errorMsg, "");
          }
          break;
        case "authReminder": {
          const connectionId = strict_equals(typeof message.connectionId, "string") ? message.connectionId.trim() : "";
          if (!connectionId) {
            console.warn(...log_if_contains_state("warn", "\u26A0\uFE0F [ReactiveApp] authReminder missing connectionId", message));
            break;
          }
          upsertAuthReminder({
            connectionId,
            label: message.connectionLabel || connectionId,
            message: message.message || `Microsoft Entra sign-in required for ${message.connectionLabel || connectionId}`,
            detail: message.detail
          });
          markConnectionRequiresAuth(connectionId);
          showToast(`Sign in required for ${message.connectionLabel || connectionId}`, "warning");
          break;
        }
        case "authReminderClear": {
          const connectionId = strict_equals(typeof message.connectionId, "string") ? message.connectionId.trim() : "";
          if (!connectionId) break;
          clearAuthReminder(connectionId);
          markConnectionAuthenticated(connectionId);
          break;
        }
        case "connections-update":
          console.log(...log_if_contains_state("log", "\u{1F504} [ReactiveApp] Received connections-update message", message));
          if (strict_equals(typeof handleExtensionMessage, "function")) {
            handleExtensionMessage(message);
            console.log("\u2705 [ReactiveApp] Delegated connections-update to FSM message handler");
          } else {
            console.warn("\u26A0\uFE0F [ReactiveApp] handleExtensionMessage function not available, falling back to manual processing");
            if (Array.isArray(message.connections)) {
              const processedConnections = message.connections.map((entry) => {
                const id = strict_equals(typeof entry?.id, "string") ? entry.id.trim() : "";
                if (!id) return null;
                const label = strict_equals(typeof entry?.label, "string") && entry.label.trim().length > 0 ? entry.label.trim() : strict_equals(typeof entry?.project, "string") && entry.project.trim().length > 0 ? entry.project.trim() : id;
                return {
                  id,
                  label,
                  url: entry?.url || "",
                  project: entry?.project || "",
                  isDefault: strict_equals(entry?.isDefault, true),
                  ...entry
                };
              }).filter(Boolean);
              globalConnectionsArray.set(processedConnections);
              globalConnectionsCount.set(processedConnections.length);
              console.log("\u2705 [ReactiveApp] Fallback: Updated global connections stores");
            }
          }
          break;
      }
    }
    function handleConnectionChange(e) {
      const connectionId = e.target.value;
      integrationActions.switchToConnection(connectionId);
    }
    function handleStartTimer(workItemId) {
      integrationActions.startTimerForWorkItem(workItemId);
    }
    function handleStopTimer() {
      actions.stopTimer();
    }
    function handleItemAction(action2, item) {
      switch (action2) {
        case "start":
          handleStartTimer(item.id);
          break;
        case "view":
          const connection = get(currentConnection);
          if (connection?.url && connection?.project) {
            const baseUrl = connection.url.replace(/\/$/, "");
            window.open(`${baseUrl}/${connection.project}/_workitems/edit/${item.id}`, "_blank");
          }
          break;
        case "edit":
          showToast(`Edit work item #${item.id} - feature coming soon`, "info");
          break;
        case "comment":
          showToast(`Add comment to #${item.id} - feature coming soon`, "info");
          break;
      }
    }
    function handleAuthReminderAction(connectionId, action2) {
      console.log(...log_if_contains_state("log", "\u{1F510} [ReactiveApp] handleAuthReminderAction called:", { connectionId, action: action2 }));
      if (strict_equals(typeof window, "undefined", false) && window.vscode?.postMessage) {
        console.log("\u{1F510} [ReactiveApp] Sending authReminderAction message via VS Code API");
        window.vscode.postMessage({ type: "authReminderAction", connectionId, action: action2 });
      } else if (strict_equals(typeof window, "undefined", false) && window.parent?.postMessage) {
        console.log("\u{1F510} [ReactiveApp] Fallback: Sending authReminderAction message via parent postMessage");
        window.parent.postMessage({ type: "authReminderAction", connectionId, action: action2 }, "*");
      } else {
        console.error("\u{1F534} [ReactiveApp] Unable to send message - no communication method available");
      }
      if (strict_equals(action2, "signIn")) {
        console.log(...log_if_contains_state("log", "\u{1F510} [ReactiveApp] Authentication sign-in initiated for connection:", connectionId));
      } else if (strict_equals(action2, "dismiss")) {
        showToast("Authentication reminder dismissed", "info");
      }
    }
    function triggerManualSignIn() {
      console.log("\u{1F510} [ReactiveApp] triggerManualSignIn called");
      const activeConnectionData = get(currentConnection);
      if (!activeConnectionData?.id) {
        console.warn("\u{1F510} [ReactiveApp] No active connection available for manual sign-in");
        showToast("No connection available for sign-in", "error");
        return;
      }
      console.log(...log_if_contains_state("log", "\u{1F510} [ReactiveApp] Triggering manual sign-in for connection:", activeConnectionData.id));
      if (strict_equals(typeof window, "undefined", false) && window.vscode?.postMessage) {
        console.log("\u{1F510} [ReactiveApp] Sending requireAuthentication message via VS Code API");
        window.vscode.postMessage({
          type: "requireAuthentication",
          connectionId: activeConnectionData.id
        });
      } else if (strict_equals(typeof window, "undefined", false) && window.parent?.postMessage) {
        console.log("\u{1F510} [ReactiveApp] Fallback: Sending requireAuthentication message via parent postMessage");
        window.parent.postMessage(
          {
            type: "requireAuthentication",
            connectionId: activeConnectionData.id
          },
          "*"
        );
      } else {
        console.error("\u{1F534} [ReactiveApp] Unable to send message - no communication method available");
      }
      const connectionName = activeConnectionData?.name || "Unknown";
      showToast(`Starting authentication for ${connectionName}...`, "info");
    }
    function toggleItemSelection(id) {
      if (get(selectedItems).has(id)) {
        get(selectedItems).delete(id);
      } else {
        get(selectedItems).add(id);
      }
      set(selectedItems, new Set(get(
        selectedItems
        // Trigger reactivity
      )), true);
    }
    function selectAll() {
      filteredWorkItems().forEach((item) => {
        const id = Number(item.id || item.fields?.["System.Id"]);
        if (id) get(selectedItems).add(id);
      });
      set(selectedItems, new Set(get(selectedItems)), true);
    }
    function normalizeState(raw) {
      if (!raw) return "new";
      const s = String(raw).toLowerCase().trim().replace(/\s+/g, "-");
      if (strict_equals(s, "new") || strict_equals(s, "to-do") || strict_equals(s, "todo") || strict_equals(s, "proposed")) return "new";
      if (strict_equals(s, "approved")) return "approved";
      if (strict_equals(s, "committed")) return "committed";
      if (strict_equals(s, "active")) return "active";
      if (strict_equals(s, "in-progress") || strict_equals(s, "inprogress") || strict_equals(s, "doing")) return "inprogress";
      if (strict_equals(s, "review") || strict_equals(s, "code-review") || strict_equals(s, "testing")) return "review";
      if (strict_equals(s, "resolved")) return "resolved";
      if (strict_equals(s, "done")) return "done";
      if (strict_equals(s, "closed") || strict_equals(s, "completed")) return "closed";
      if (strict_equals(s, "removed")) return "removed";
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
      if (strict_equals(p, 1)) return "priority-1";
      if (strict_equals(p, 2)) return "priority-2";
      if (strict_equals(p, 3)) return "priority-3";
      if (strict_equals(p, 4)) return "priority-4";
      return "priority-3";
    }
    onMount(() => {
      console.log("\u{1F7E2} [ReactiveApp] Component mounted - initializing store effects");
      console.log(...log_if_contains_state("log", "\u{1F50D} [ReactiveApp] Store import check:", {
        fsm: typeof fsm,
        connections: typeof connections2,
        ui: typeof ui,
        initializeStoreEffects: typeof initializeStoreEffects
      }));
      try {
        console.log("\u{1F504} [ReactiveApp] Calling initializeStoreEffects...");
        initializeStoreEffects();
        console.log("\u2705 [ReactiveApp] Store effects initialized successfully");
      } catch (error) {
        console.error(...log_if_contains_state("error", "\u274C [ReactiveApp] Failed to initialize store effects:", error));
        console.error(...log_if_contains_state("error", "\u274C [ReactiveApp] Error details:", { name: error.name, message: error.message, stack: error.stack }));
      }
      window.addEventListener("message", handleVSCodeMessage);
      onRefreshData()();
      console.log("\u{1F7E2} [ReactiveApp] Component mount complete with store integration");
      return () => {
        window.removeEventListener("message", handleVSCodeMessage);
      };
    });
    var $$exports = { ...legacy_api() };
    var div = root();
    var node = child(div);
    {
      var consequent = ($$anchor2) => {
        var div_1 = root_1();
        add_svelte_meta(
          () => each(div_1, 21, () => get(connectionsList), index, ($$anchor3, connection) => {
            var button = root_2();
            let classes;
            button.__click = [on_click, onConnectionSelect, connection];
            var text2 = child(button, true);
            reset(button);
            template_effect(
              ($0) => {
                classes = set_class(button, 1, "connection-tab svelte-1s1bz3t", null, classes, $0);
                set_attribute2(button, "aria-selected", strict_equals(get(connection).id, get(currentConnection)?.id));
                set_attribute2(button, "aria-label", `Switch to ${get(connection).label}`);
                set_attribute2(button, "title", `${get(connection).organization}/${get(connection).project}`);
                set_text(text2, get(connection).label);
              },
              [
                () => ({
                  active: strict_equals(get(connection).id, get(currentConnection)?.id)
                })
              ]
            );
            append($$anchor3, button);
          }),
          "each",
          ReactiveApp,
          666,
          6
        );
        reset(div_1);
        append($$anchor2, div_1);
      };
      add_svelte_meta(
        () => if_block(node, ($$render) => {
          if (get(connectionsList) && get(connectionsList).length > 1) $$render(consequent);
        }),
        "if",
        ReactiveApp,
        664,
        2
      );
    }
    var node_1 = sibling(node, 2);
    {
      var consequent_1 = ($$anchor2) => {
        var div_2 = root_3();
        validate_each_keys(() => get(authReminders), (reminder) => reminder.connectionId);
        add_svelte_meta(
          () => each(div_2, 21, () => get(authReminders), (reminder) => reminder.connectionId, ($$anchor3, reminder) => {
            var div_3 = root_4();
            var div_4 = sibling(child(div_3), 2);
            var div_5 = child(div_4);
            var text_1 = child(div_5, true);
            reset(div_5);
            var div_6 = sibling(div_5, 2);
            var text_2 = child(div_6, true);
            reset(div_6);
            reset(div_4);
            var div_7 = sibling(div_4, 2);
            var button_1 = child(div_7);
            button_1.__click = [on_click_1, handleAuthReminderAction, reminder];
            var button_2 = sibling(button_1, 2);
            button_2.__click = [on_click_2, handleAuthReminderAction, reminder];
            reset(div_7);
            reset(div_3);
            template_effect(() => {
              set_text(text_1, get(reminder).message || `Microsoft Entra sign-in required for ${get(reminder).label}`);
              set_text(text_2, get(reminder).detail || `Sign in to refresh ${get(reminder).label} and resume work item syncing.`);
            });
            append($$anchor3, div_3);
          }),
          "each",
          ReactiveApp,
          685,
          6
        );
        reset(div_2);
        append($$anchor2, div_2);
      };
      var alternate_1 = ($$anchor2) => {
        var fragment = comment();
        var node_2 = first_child(fragment);
        {
          var consequent_3 = ($$anchor3) => {
            var div_8 = root_6();
            var div_9 = child(div_8);
            var div_10 = sibling(child(div_9), 2);
            var div_11 = sibling(child(div_10), 2);
            var node_3 = child(div_11);
            {
              var consequent_2 = ($$anchor4) => {
                var text_3 = text();
                template_effect(() => set_text(text_3, `Sign in to ${get(currentConnection).label ?? ""} to load work items and start using the extension.`));
                append($$anchor4, text_3);
              };
              var alternate = ($$anchor4) => {
                var text_4 = text("Sign in to your Azure DevOps account to load work items and start using the extension.");
                append($$anchor4, text_4);
              };
              add_svelte_meta(
                () => if_block(node_3, ($$render) => {
                  if (get(currentConnection)?.label) $$render(consequent_2);
                  else $$render(alternate, false);
                }),
                "if",
                ReactiveApp,
                722,
                12
              );
            }
            reset(div_11);
            reset(div_10);
            var div_12 = sibling(div_10, 2);
            var button_3 = child(div_12);
            button_3.__click = [on_click_3, triggerManualSignIn];
            reset(div_12);
            reset(div_9);
            reset(div_8);
            append($$anchor3, div_8);
          };
          add_svelte_meta(
            () => if_block(
              node_2,
              ($$render) => {
                if (get(shouldShowManualSignIn)) $$render(consequent_3);
              },
              true
            ),
            "if",
            ReactiveApp,
            714,
            2
          );
        }
        append($$anchor2, fragment);
      };
      add_svelte_meta(
        () => if_block(node_1, ($$render) => {
          if (get(authReminders).length > 0) $$render(consequent_1);
          else $$render(alternate_1, false);
        }),
        "if",
        ReactiveApp,
        683,
        2
      );
    }
    var node_4 = sibling(node_1, 2);
    {
      var consequent_7 = ($$anchor2) => {
        var div_13 = root_9();
        var div_14 = child(div_13);
        var div_15 = child(div_14);
        reset(div_14);
        var div_16 = sibling(div_14, 2);
        var node_5 = child(div_16);
        {
          var consequent_4 = ($$anchor3) => {
            var text_5 = text("Activating extension...");
            append($$anchor3, text_5);
          };
          var alternate_4 = ($$anchor3) => {
            var fragment_2 = comment();
            var node_6 = first_child(fragment_2);
            {
              var consequent_5 = ($$anchor4) => {
                var text_6 = text("Setting up interface...");
                append($$anchor4, text_6);
              };
              var alternate_3 = ($$anchor4) => {
                var fragment_3 = comment();
                var node_7 = first_child(fragment_3);
                {
                  var consequent_6 = ($$anchor5) => {
                    var text_7 = text("Loading work items...");
                    append($$anchor5, text_7);
                  };
                  var alternate_2 = ($$anchor5) => {
                    var text_8 = text("Initializing...");
                    append($$anchor5, text_8);
                  };
                  add_svelte_meta(
                    () => if_block(
                      node_7,
                      ($$render) => {
                        if (strict_equals(get(initStatus).phase, "loading-data")) $$render(consequent_6);
                        else $$render(alternate_2, false);
                      },
                      true
                    ),
                    "if",
                    ReactiveApp,
                    753,
                    8
                  );
                }
                append($$anchor4, fragment_3);
              };
              add_svelte_meta(
                () => if_block(
                  node_6,
                  ($$render) => {
                    if (strict_equals(get(initStatus).phase, "ui-setup")) $$render(consequent_5);
                    else $$render(alternate_3, false);
                  },
                  true
                ),
                "if",
                ReactiveApp,
                751,
                8
              );
            }
            append($$anchor3, fragment_2);
          };
          add_svelte_meta(
            () => if_block(node_5, ($$render) => {
              if (strict_equals(get(initStatus).phase, "activating")) $$render(consequent_4);
              else $$render(alternate_4, false);
            }),
            "if",
            ReactiveApp,
            749,
            8
          );
        }
        reset(div_16);
        reset(div_13);
        template_effect(() => set_style(div_15, `width: ${get(initStatus).progress ?? ""}%`));
        append($$anchor2, div_13);
      };
      add_svelte_meta(
        () => if_block(node_4, ($$render) => {
          if (strict_equals(get(initStatus).phase, "initializing")) $$render(consequent_7);
        }),
        "if",
        ReactiveApp,
        743,
        2
      );
    }
    var div_17 = sibling(node_4, 2);
    var div_18 = child(div_17);
    var select = sibling(child(div_18), 2);
    select.__change = [handleQueryChange, selectedQuery];
    add_svelte_meta(
      () => each(select, 21, () => queryOptions, index, ($$anchor2, option) => {
        var option_1 = root_16();
        var text_9 = child(option_1, true);
        reset(option_1);
        var option_1_value = {};
        template_effect(() => {
          set_text(text_9, get(option).label);
          if (option_1_value !== (option_1_value = get(option).value)) {
            option_1.value = (option_1.__value = get(option).value) ?? "";
          }
        });
        append($$anchor2, option_1);
      }),
      "each",
      ReactiveApp,
      774,
      8
    );
    reset(select);
    var node_8 = sibling(select, 2);
    {
      var consequent_8 = ($$anchor2) => {
        var div_19 = root_17();
        var text_10 = child(div_19, true);
        reset(div_19);
        template_effect(() => set_text(text_10, get(queryDescription)));
        append($$anchor2, div_19);
      };
      add_svelte_meta(
        () => if_block(node_8, ($$render) => {
          if (get(queryDescription)) $$render(consequent_8);
        }),
        "if",
        ReactiveApp,
        778,
        6
      );
    }
    reset(div_18);
    reset(div_17);
    var div_20 = sibling(div_17, 2);
    var node_9 = sibling(child(div_20), 2);
    {
      var consequent_9 = ($$anchor2) => {
        var span = root_18();
        append($$anchor2, span);
      };
      add_svelte_meta(
        () => if_block(node_9, ($$render) => {
          if (get(loading)) $$render(consequent_9);
        }),
        "if",
        ReactiveApp,
        787,
        4
      );
    }
    var span_1 = sibling(node_9, 2);
    var text_11 = child(span_1, true);
    reset(span_1);
    var node_10 = sibling(span_1, 2);
    {
      var consequent_12 = ($$anchor2) => {
        var fragment_4 = root_19();
        var span_2 = first_child(fragment_4);
        var text_12 = child(span_2);
        text_12.nodeValue = `\u2022 ${get(timerRunning) ? "Running" : "Paused"} `;
        var node_11 = sibling(text_12);
        {
          var consequent_10 = ($$anchor3) => {
            var text_13 = text();
            text_13.nodeValue = `(${get(timerElapsedLabel) ?? ""})`;
            append($$anchor3, text_13);
          };
          add_svelte_meta(
            () => if_block(node_11, ($$render) => {
              if (get(timerElapsedLabel)) $$render(consequent_10);
            }),
            "if",
            ReactiveApp,
            794,
            8
          );
        }
        reset(span_2);
        var node_12 = sibling(span_2, 2);
        {
          var consequent_11 = ($$anchor3) => {
            var button_4 = root_21();
            button_4.__click = [on_click_4, handleItemAction, activeWorkItemId];
            set_attribute2(button_4, "title", get(activeWorkItemTitle) || "Open active work item");
            set_attribute2(button_4, "aria-label", `Open active work item #${get(activeWorkItemId)}`);
            button_4.textContent = `#${get(activeWorkItemId) ?? ""}`;
            append($$anchor3, button_4);
          };
          add_svelte_meta(
            () => if_block(node_12, ($$render) => {
              if (get(activeWorkItemId)) $$render(consequent_11);
            }),
            "if",
            ReactiveApp,
            796,
            6
          );
        }
        append($$anchor2, fragment_4);
      };
      add_svelte_meta(
        () => if_block(node_10, ($$render) => {
          if (get(timerActive)) $$render(consequent_12);
        }),
        "if",
        ReactiveApp,
        791,
        4
      );
    }
    var span_3 = sibling(node_10, 2);
    var button_5 = child(span_3);
    button_5.__click = function(...$$args) {
      apply(onRefreshData, this, $$args, ReactiveApp, [808, 23]);
    };
    var button_6 = sibling(button_5, 2);
    button_6.__click = [toggleKanbanView, kanbanView];
    var span_4 = child(button_6);
    reset(button_6);
    var button_7 = sibling(button_6, 2);
    button_7.__click = function(...$$args) {
      apply(onWorkItemCreate, this, $$args, ReactiveApp, [814, 23]);
    };
    var node_13 = sibling(button_7, 2);
    {
      var consequent_13 = ($$anchor2) => {
        var button_8 = root_22();
        button_8.__click = [clearSelection, selectedItems];
        var text_14 = sibling(child(button_8));
        reset(button_8);
        template_effect(() => set_text(text_14, ` ${get(selectedItems).size ?? ""}`));
        append($$anchor2, button_8);
      };
      add_svelte_meta(
        () => if_block(node_13, ($$render) => {
          if (get(selectedItems).size > 0) $$render(consequent_13);
        }),
        "if",
        ReactiveApp,
        817,
        6
      );
    }
    reset(span_3);
    reset(div_20);
    var div_21 = sibling(div_20, 2);
    var node_14 = child(div_21);
    {
      var consequent_14 = ($$anchor2) => {
        var div_22 = root_23();
        var div_23 = sibling(child(div_22), 2);
        var text_15 = child(div_23, true);
        reset(div_23);
        var button_9 = sibling(div_23, 2);
        button_9.__click = function(...$$args) {
          apply(onRetry, this, $$args, ReactiveApp, [832, 25]);
        };
        reset(div_22);
        template_effect(() => set_text(text_15, get(errorMsg)));
        append($$anchor2, div_22);
      };
      var alternate_11 = ($$anchor2) => {
        var fragment_6 = comment();
        var node_15 = first_child(fragment_6);
        {
          var consequent_15 = ($$anchor3) => {
            var div_24 = root_25();
            append($$anchor3, div_24);
          };
          var alternate_10 = ($$anchor3) => {
            var fragment_7 = comment();
            var node_16 = first_child(fragment_7);
            {
              var consequent_16 = ($$anchor4) => {
                var div_25 = root_27();
                var button_10 = sibling(child(div_25), 2);
                button_10.__click = function(...$$args) {
                  apply(onRefreshData, this, $$args, ReactiveApp, [841, 25]);
                };
                reset(div_25);
                append($$anchor4, div_25);
              };
              var alternate_9 = ($$anchor4) => {
                var fragment_8 = comment();
                var node_17 = first_child(fragment_8);
                {
                  var consequent_19 = ($$anchor5) => {
                    var div_26 = root_29();
                    var div_27 = child(div_26);
                    var div_28 = child(div_27);
                    var span_5 = sibling(child(div_28), 2);
                    var text_16 = child(span_5, true);
                    reset(span_5);
                    reset(div_28);
                    var div_29 = sibling(div_28, 2);
                    add_svelte_meta(
                      () => each(div_29, 21, () => filteredWorkItems().slice(0, 20), index, ($$anchor6, item) => {
                        var div_30 = root_30();
                        var div_31 = child(div_30);
                        var input = child(div_31);
                        remove_input_defaults(input);
                        input.__click = [on_click_5, toggleItemSelection, item];
                        var span_6 = sibling(input, 2);
                        var text_17 = child(span_6, true);
                        reset(span_6);
                        var span_7 = sibling(span_6, 2);
                        var text_18 = child(span_7);
                        reset(span_7);
                        var node_18 = sibling(span_7, 2);
                        {
                          var consequent_17 = ($$anchor7) => {
                            var span_8 = root_31();
                            var text_19 = sibling(child(span_8));
                            text_19.nodeValue = ` ${get(timerElapsedLabel) ?? ""}`;
                            reset(span_8);
                            append($$anchor7, span_8);
                          };
                          add_svelte_meta(
                            () => if_block(node_18, ($$render) => {
                              if (get(timerActive) && strict_equals(get(activeWorkItemId), Number(get(item).id))) $$render(consequent_17);
                            }),
                            "if",
                            ReactiveApp,
                            871,
                            18
                          );
                        }
                        reset(div_31);
                        var div_32 = sibling(div_31, 2);
                        var div_33 = child(div_32);
                        var text_20 = child(div_33, true);
                        reset(div_33);
                        var div_34 = sibling(div_33, 2);
                        var span_9 = child(div_34);
                        var text_21 = child(span_9, true);
                        reset(span_9);
                        var span_10 = sibling(span_9, 2);
                        var text_22 = child(span_10, true);
                        reset(span_10);
                        reset(div_34);
                        reset(div_32);
                        var div_35 = sibling(div_32, 2);
                        var node_19 = child(div_35);
                        {
                          var consequent_18 = ($$anchor7) => {
                            var button_11 = root_32();
                            button_11.__click = [on_click_6, handleStopTimer];
                            template_effect(() => set_attribute2(button_11, "aria-label", `Stop timer for #${get(item).id}`));
                            append($$anchor7, button_11);
                          };
                          var alternate_5 = ($$anchor7) => {
                            var button_12 = root_33();
                            button_12.__click = [on_click_7, handleItemAction, item];
                            button_12.disabled = get(timerActive);
                            template_effect(() => set_attribute2(button_12, "aria-label", `Start timer for #${get(item).id}`));
                            append($$anchor7, button_12);
                          };
                          add_svelte_meta(
                            () => if_block(node_19, ($$render) => {
                              if (get(timerActive) && strict_equals(get(activeWorkItemId), Number(get(item).id))) $$render(consequent_18);
                              else $$render(alternate_5, false);
                            }),
                            "if",
                            ReactiveApp,
                            896,
                            18
                          );
                        }
                        var button_13 = sibling(node_19, 2);
                        button_13.__click = [on_click_8, handleItemAction, item];
                        reset(div_35);
                        reset(div_30);
                        template_effect(
                          ($0, $1, $2, $3, $4) => {
                            set_class(div_30, 1, `work-item-card kanban-card ${$0 ?? ""} ${$1 ?? ""}`, "svelte-1s1bz3t");
                            set_checked(input, $2);
                            set_attribute2(input, "aria-label", `Select work item #${get(item).id ?? ""}`);
                            set_text(text_17, $3);
                            set_text(text_18, `#${get(item).id ?? ""}`);
                            set_text(text_20, get(item).fields?.["System.Title"] || `Work Item #${get(item).id}`);
                            set_text(text_21, get(item).fields?.["System.WorkItemType"] || "Task");
                            set_class(span_10, 1, `work-item-state state-${$4 ?? ""}`, "svelte-1s1bz3t");
                            set_text(text_22, get(item).fields?.["System.State"] || "New");
                            set_attribute2(button_13, "aria-label", `View work item #${get(item).id}`);
                          },
                          [
                            () => get(timerActive) && strict_equals(get(activeWorkItemId), Number(get(item).id)) ? "has-active-timer" : "",
                            () => get(selectedItems).has(Number(get(item).id)) ? "selected" : "",
                            () => get(selectedItems).has(Number(get(item).id)),
                            () => getWorkItemTypeIcon(get(item).fields?.["System.WorkItemType"]),
                            () => normalizeState(get(item).fields?.["System.State"])
                          ]
                        );
                        append($$anchor6, div_30);
                      }),
                      "each",
                      ReactiveApp,
                      852,
                      12
                    );
                    reset(div_29);
                    reset(div_27);
                    reset(div_26);
                    template_effect(($0) => set_text(text_16, $0), [() => filteredWorkItems().length]);
                    append($$anchor5, div_26);
                  };
                  var alternate_8 = ($$anchor5) => {
                    var div_36 = root_34();
                    add_svelte_meta(
                      () => each(div_36, 21, () => filteredWorkItems().slice(0, 50), index, ($$anchor6, item, index2) => {
                        var div_37 = root_35();
                        set_attribute2(div_37, "data-index", index2);
                        var div_38 = child(div_37);
                        var input_1 = child(div_38);
                        remove_input_defaults(input_1);
                        input_1.__click = [on_click_9, toggleItemSelection, item];
                        var span_11 = sibling(input_1, 2);
                        var text_23 = child(span_11, true);
                        reset(span_11);
                        var span_12 = sibling(span_11, 2);
                        var text_24 = child(span_12);
                        reset(span_12);
                        var node_20 = sibling(span_12, 2);
                        {
                          var consequent_20 = ($$anchor7) => {
                            var span_13 = root_36();
                            var text_25 = sibling(child(span_13));
                            text_25.nodeValue = ` ${get(timerElapsedLabel) ?? ""}`;
                            reset(span_13);
                            append($$anchor7, span_13);
                          };
                          add_svelte_meta(
                            () => if_block(node_20, ($$render) => {
                              if (get(timerActive) && strict_equals(get(activeWorkItemId), Number(get(item).id))) $$render(consequent_20);
                            }),
                            "if",
                            ReactiveApp,
                            957,
                            14
                          );
                        }
                        var span_14 = sibling(node_20, 2);
                        var text_26 = child(span_14, true);
                        reset(span_14);
                        reset(div_38);
                        var div_39 = sibling(div_38, 2);
                        var div_40 = child(div_39);
                        var text_27 = child(div_40, true);
                        reset(div_40);
                        var div_41 = sibling(div_40, 2);
                        var span_15 = child(div_41);
                        var text_28 = child(span_15, true);
                        reset(span_15);
                        var span_16 = sibling(span_15, 2);
                        var text_29 = child(span_16, true);
                        reset(span_16);
                        var span_17 = sibling(span_16, 2);
                        var node_21 = child(span_17);
                        {
                          var consequent_21 = ($$anchor7) => {
                            var fragment_9 = root_37();
                            var text_30 = sibling(first_child(fragment_9));
                            template_effect(() => set_text(text_30, ` ${(get(item).fields["System.AssignedTo"].displayName || get(item).fields["System.AssignedTo"]) ?? ""}`));
                            append($$anchor7, fragment_9);
                          };
                          var alternate_6 = ($$anchor7) => {
                            var fragment_10 = root_38();
                            next();
                            append($$anchor7, fragment_10);
                          };
                          add_svelte_meta(
                            () => if_block(node_21, ($$render) => {
                              if (get(item).fields?.["System.AssignedTo"]) $$render(consequent_21);
                              else $$render(alternate_6, false);
                            }),
                            "if",
                            ReactiveApp,
                            982,
                            18
                          );
                        }
                        reset(span_17);
                        reset(div_41);
                        reset(div_39);
                        var div_42 = sibling(div_39, 2);
                        var node_22 = child(div_42);
                        {
                          var consequent_22 = ($$anchor7) => {
                            var button_14 = root_39();
                            button_14.__click = [on_click_10, handleStopTimer];
                            template_effect(() => set_attribute2(button_14, "aria-label", `Stop timer for #${get(item).id}`));
                            append($$anchor7, button_14);
                          };
                          var alternate_7 = ($$anchor7) => {
                            var button_15 = root_40();
                            button_15.__click = [on_click_11, handleItemAction, item];
                            button_15.disabled = get(timerActive);
                            template_effect(() => set_attribute2(button_15, "aria-label", `Start timer for #${get(item).id}`));
                            append($$anchor7, button_15);
                          };
                          add_svelte_meta(
                            () => if_block(node_22, ($$render) => {
                              if (get(timerActive) && strict_equals(get(activeWorkItemId), Number(get(item).id))) $$render(consequent_22);
                              else $$render(alternate_7, false);
                            }),
                            "if",
                            ReactiveApp,
                            994,
                            14
                          );
                        }
                        var button_16 = sibling(node_22, 2);
                        button_16.__click = [on_click_12, handleItemAction, item];
                        var button_17 = sibling(button_16, 2);
                        button_17.__click = [on_click_13, handleItemAction, item];
                        reset(div_42);
                        reset(div_37);
                        template_effect(
                          ($0, $1, $2, $3, $4, $5) => {
                            set_class(div_37, 1, `work-item-card ${$0 ?? ""} ${strict_equals(focusedIndex, index2) ? "focused" : ""} ${$1 ?? ""}`, "svelte-1s1bz3t");
                            set_attribute2(div_37, "aria-label", `Work item #${get(item).id}: ${get(item).fields?.["System.Title"]} - use action buttons to interact`);
                            set_checked(input_1, $2);
                            set_attribute2(input_1, "aria-label", `Select work item #${get(item).id ?? ""}`);
                            set_text(text_23, $3);
                            set_text(text_24, `#${get(item).id ?? ""}`);
                            set_class(span_14, 1, `work-item-priority ${$4 ?? ""}`, "svelte-1s1bz3t");
                            set_text(text_26, get(item).fields?.["Microsoft.VSTS.Common.Priority"] || "3");
                            set_text(text_27, get(item).fields?.["System.Title"] || `Work Item #${get(item).id}`);
                            set_text(text_28, get(item).fields?.["System.WorkItemType"] || "Task");
                            set_class(span_16, 1, `work-item-state state-${$5 ?? ""}`, "svelte-1s1bz3t");
                            set_text(text_29, get(item).fields?.["System.State"] || "New");
                            set_attribute2(button_16, "aria-label", `View work item #${get(item).id}`);
                            set_attribute2(button_17, "aria-label", `Edit work item #${get(item).id}`);
                          },
                          [
                            () => get(timerActive) && strict_equals(get(activeWorkItemId), Number(get(item).id)) ? "has-active-timer" : "",
                            () => get(selectedItems).has(Number(get(item).id)) ? "selected" : "",
                            () => get(selectedItems).has(Number(get(item).id)),
                            () => getWorkItemTypeIcon(get(item).fields?.["System.WorkItemType"]),
                            () => getPriorityClass(get(item).fields?.["Microsoft.VSTS.Common.Priority"]),
                            () => normalizeState(get(item).fields?.["System.State"])
                          ]
                        );
                        append($$anchor6, div_37);
                      }),
                      "each",
                      ReactiveApp,
                      933,
                      8
                    );
                    reset(div_36);
                    append($$anchor5, div_36);
                  };
                  add_svelte_meta(
                    () => if_block(
                      node_17,
                      ($$render) => {
                        if (get(kanbanView)) $$render(consequent_19);
                        else $$render(alternate_8, false);
                      },
                      true
                    ),
                    "if",
                    ReactiveApp,
                    843,
                    4
                  );
                }
                append($$anchor4, fragment_8);
              };
              add_svelte_meta(
                () => if_block(
                  node_16,
                  ($$render) => {
                    if (strict_equals(filteredWorkItems().length, 0)) $$render(consequent_16);
                    else $$render(alternate_9, false);
                  },
                  true
                ),
                "if",
                ReactiveApp,
                838,
                4
              );
            }
            append($$anchor3, fragment_7);
          };
          add_svelte_meta(
            () => if_block(
              node_15,
              ($$render) => {
                if (get(loading)) $$render(consequent_15);
                else $$render(alternate_10, false);
              },
              true
            ),
            "if",
            ReactiveApp,
            834,
            4
          );
        }
        append($$anchor2, fragment_6);
      };
      add_svelte_meta(
        () => if_block(node_14, ($$render) => {
          if (get(errorMsg)) $$render(consequent_14);
          else $$render(alternate_11, false);
        }),
        "if",
        ReactiveApp,
        828,
        4
      );
    }
    reset(div_21);
    reset(div);
    template_effect(() => {
      set_text(text_11, get(workItemCount));
      set_class(span_4, 1, `codicon codicon-${get(kanbanView) ? "list-unordered" : "organization"}`, "svelte-1s1bz3t");
    });
    bind_select_value(select, () => get(selectedQuery), ($$value) => set(selectedQuery, $$value));
    append($$anchor, div);
    return pop($$exports);
  }
  delegate(["click", "change"]);

  // src/webview/reactive-main.ts
  var vscode = (() => {
    if (window.vscode) {
      console.log("[reactive-main] Using globally available VS Code API");
      return window.vscode;
    } else if (window.acquireVsCodeApi) {
      console.log("[reactive-main] Acquiring VS Code API...");
      const api = window.acquireVsCodeApi();
      window.vscode = api;
      return api;
    } else {
      console.warn("[reactive-main] No VS Code API available");
      return null;
    }
  })();
  function postMessage(message) {
    try {
      if (vscode && typeof vscode.postMessage === "function") {
        vscode.postMessage(message);
        console.log("[reactive-main] \u2705 Message sent via VS Code API:", message.type);
      } else {
        console.warn(
          "[reactive-main] VS Code API not available, trying context bridge for:",
          message.type
        );
        if (message.type === "switchConnection" && message.connectionId) {
          if (window.__EXTENSION_CONTEXT_MANAGER__) {
            window.__EXTENSION_CONTEXT_MANAGER__.applyAction(
              "setActiveConnection",
              message.connectionId
            );
            console.log(
              "[reactive-main] \u2705 Connection switch via context bridge:",
              message.connectionId
            );
          } else {
            console.error("[reactive-main] Context bridge not available for connection switching");
          }
        } else if (message.type === "startTimer") {
          if (window.__EXTENSION_CONTEXT_MANAGER__) {
            window.__EXTENSION_CONTEXT_MANAGER__.applyAction("startTimer");
            console.log("[reactive-main] \u2705 Timer start via context bridge");
          }
        } else if (message.type === "stopTimer") {
          if (window.__EXTENSION_CONTEXT_MANAGER__) {
            window.__EXTENSION_CONTEXT_MANAGER__.applyAction("stopTimer");
            console.log("[reactive-main] \u2705 Timer stop via context bridge");
          }
        } else {
          console.warn("[reactive-main] No fallback available for message type:", message.type);
        }
      }
    } catch (error) {
      console.error("[reactive-main] Failed to post message:", error, message);
    }
  }
  var unsubscribeContext = null;
  var lastContextDigest = "";
  function toLegacyConnection(entry) {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const record = entry;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id) {
      return null;
    }
    const label = typeof record.label === "string" && record.label.trim().length > 0 ? record.label.trim() : typeof record.project === "string" && record.project.trim().length > 0 ? record.project.trim() : id;
    const organization = typeof record.organization === "string" && record.organization.trim().length > 0 ? record.organization.trim() : void 0;
    const project = typeof record.project === "string" && record.project.trim().length > 0 ? record.project.trim() : void 0;
    const authMethod = record.authMethod === "entra" ? "entra" : record.authMethod === "pat" ? "pat" : void 0;
    const url = typeof record.baseUrl === "string" ? record.baseUrl : void 0;
    return {
      id,
      label,
      name: label,
      organization,
      project,
      authMethod,
      url
    };
  }
  function readNumericId(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }
  function inferWorkItemIdentifier(item) {
    if (!item || typeof item !== "object") {
      return null;
    }
    const record = item;
    const direct = readNumericId(record.id);
    if (direct !== null) {
      return direct;
    }
    if (record.fields && typeof record.fields === "object") {
      return readNumericId(record.fields["System.Id"]);
    }
    return null;
  }
  function digestContext(context) {
    try {
      const connectionIds = Array.isArray(context.connections) ? context.connections.map((entry) => typeof entry?.id === "string" ? entry.id : "") : [];
      const activeConnectionId = typeof context.tab?.connectionId === "string" && context.tab.connectionId || (typeof context.activeConnectionId === "string" ? context.activeConnectionId : null);
      const workItemIds = Array.isArray(context.tab?.rawWorkItems) ? context.tab.rawWorkItems.map((item) => inferWorkItemIdentifier(item)).filter((id) => typeof id === "number") : [];
      const timerFingerprint = context.tab?.timer ? {
        isActive: Boolean(context.tab.timer.isActive),
        workItemId: context.tab.timer.workItemId ?? null,
        elapsed: context.tab.timer.elapsed ?? 0
      } : null;
      const authReminderKeys = Array.isArray(context.authReminders) ? context.authReminders.map(
        (reminder) => `${reminder.connectionId ?? ""}:${reminder.reason ?? ""}:${reminder.detail ?? ""}`
      ) : [];
      const tabReminderKey = context.tab?.authReminder ? `${context.tab.connectionId ?? activeConnectionId ?? ""}:${context.tab.authReminder.reason ?? ""}:${context.tab.authReminder.detail ?? ""}` : null;
      return JSON.stringify({
        connectionIds,
        activeConnectionId,
        workItemIds,
        timerFingerprint,
        authReminderKeys,
        tabReminderKey
      });
    } catch (error) {
      console.warn("[reactive-main] Failed to compute context digest", error);
      return String(Date.now());
    }
  }
  function hydrateLegacyStoresFromContext(context) {
    if (!context) {
      return;
    }
    const digest = digestContext(context);
    if (digest === lastContextDigest) {
      return;
    }
    lastContextDigest = digest;
    const connections4 = Array.isArray(context.connections) ? context.connections.map(toLegacyConnection).filter((entry) => entry !== null) : [];
    const activeConnectionId = (typeof context.tab?.connectionId === "string" && context.tab.connectionId.trim().length > 0 ? context.tab.connectionId.trim() : null) || (typeof context.activeConnectionId === "string" && context.activeConnectionId.trim().length > 0 ? context.activeConnectionId.trim() : connections4.length > 0 ? connections4[0].id : null);
    handleExtensionMessage({
      type: "connections-update",
      connections: connections4,
      activeConnectionId
    });
    const workItems3 = Array.isArray(context.tab?.rawWorkItems) ? context.tab.rawWorkItems : Array.isArray(context.workItems) ? context.workItems : [];
    handleExtensionMessage({
      type: "work-items-update",
      workItems: workItems3,
      connectionId: activeConnectionId ?? void 0,
      metadata: {
        connectionId: activeConnectionId ?? void 0,
        source: "context-bridge"
      }
    });
    handleExtensionMessage({
      type: "loading-state-update",
      isDataLoading: Boolean(context.tab?.status?.isLoading ?? context.isLoading),
      isInitializing: false,
      isActivated: true
    });
    const reminderMap = /* @__PURE__ */ new Map();
    const ensureReminder = (connectionId, reminder) => {
      if (!connectionId) {
        return;
      }
      const normalizedId = connectionId.trim();
      if (!normalizedId) {
        return;
      }
      const userFacingLabel = typeof reminder?.label === "string" && reminder.label.trim().length > 0 ? reminder.label.trim() : connections4.find((connection) => connection.id === normalizedId)?.label ?? normalizedId;
      reminderMap.set(normalizedId, {
        connectionId: normalizedId,
        reason: reminder?.reason,
        detail: reminder?.detail,
        message: reminder?.message,
        authMethod: reminder?.authMethod,
        label: userFacingLabel
      });
    };
    if (Array.isArray(context.authReminders)) {
      for (const reminder of context.authReminders) {
        ensureReminder(reminder?.connectionId, {
          reason: reminder?.reason,
          detail: reminder?.detail,
          message: reminder?.message,
          label: reminder?.label,
          authMethod: reminder?.authMethod
        });
      }
    }
    if (context.tab?.authReminder) {
      ensureReminder(context.tab.connectionId ?? activeConnectionId, {
        reason: context.tab.authReminder.reason,
        detail: context.tab.authReminder.detail,
        message: context.tab.authReminder.message,
        label: context.tab.authReminder.label,
        authMethod: context.tab.authReminder.authMethod
      });
    }
    const authRemindersPayload = Array.from(reminderMap.values()).map((reminder) => ({
      connectionId: reminder.connectionId,
      reason: reminder.reason,
      detail: reminder.detail,
      message: reminder.message,
      authMethod: reminder.authMethod,
      label: reminder.label
    }));
    handleExtensionMessage({
      type: "auth-reminders-update",
      authReminders: authRemindersPayload
    });
  }
  function processExtensionMessage(message) {
    if (!message || typeof message !== "object") {
      return;
    }
    const type = message.type;
    console.log("[reactive-main] Received message:", type, message);
    if (type === "contextUpdate") {
      const context = message.context;
      if (context) {
        contextState.set(context);
        hydrateLegacyStoresFromContext(context);
      }
      return;
    }
    handleExtensionMessage(message);
  }
  function initializeApplication() {
    window.addEventListener("message", (event2) => {
      processExtensionMessage(event2.data);
    });
    if (typeof contextState?.subscribe === "function") {
      unsubscribeContext = contextState.subscribe((state2) => {
        if (state2) {
          hydrateLegacyStoresFromContext(state2);
        }
      });
    }
    console.log("[reactive-main] Webview ready - using simplified setup");
    console.log("[reactive-main] Application initialized with simplified setup", {
      isInitializing: false,
      isActivated: true,
      connectionsCount: 0
    });
    postMessage({ type: "ready" });
  }
  function mountReactiveApp() {
    console.log("\u{1F535} [reactive-main] mountReactiveApp called");
    const target = document.getElementById("svelte-root");
    if (!target) {
      throw new Error("Could not find svelte-root element");
    }
    console.log("\u{1F535} [reactive-main] Found svelte-root element, mounting ReactiveApp...");
    console.log("[reactive-main] Reactive state at mount time (simplified):", {
      workItemsCount: 0,
      isDataLoading: false,
      isInitializing: false,
      connectionsCount: 0
    });
    console.log("[reactive-main] Mounting ReactiveApp based on proven pattern");
    const app = mount(ReactiveApp, {
      target,
      props: {
        onConnectionSelect: integrationActions.switchToConnection,
        onRefreshData: integrationActions.loadWorkItems,
        onTimerStart: integrationActions.startTimerForWorkItem
      }
    });
    console.log("[reactive-main] \u2705 App mounted successfully with universal reactivity");
    return app;
  }
  try {
    console.log("\u{1F535} [reactive-main] Starting initialization...");
    initializeApplication();
    console.log("\u{1F535} [reactive-main] Application initialized, mounting ReactiveApp...");
    const app = mountReactiveApp();
    console.log("\u{1F7E2} [reactive-main] ReactiveApp component mounted and running (fixed version)");
    console.log("[reactive-main] Reactive webview successfully initialized");
    window.__REACTIVE_APP__ = {
      app
      // integrationActions,
      // uiActions,
      // fsmDebug,
      // storeDebug
    };
  } catch (error) {
    console.error("\u274C [reactive-main] Failed to initialize reactive webview:", error);
    const root2 = document.getElementById("svelte-root");
    if (root2) {
      root2.innerHTML = `
      <div style="padding: 20px; color: var(--vscode-errorForeground);">
        <h2>Initialization Error</h2>
        <p>Failed to load the reactive interface: ${error instanceof Error ? error.message : String(error)}</p>
        <button onclick="window.location.reload()">Retry</button>
      </div>
    `;
    }
  }
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      if (unsubscribeContext) {
        try {
          unsubscribeContext();
        } catch (error) {
          console.warn("[reactive-main] Failed to unsubscribe context listener", error);
        }
        unsubscribeContext = null;
      }
    });
  }
})();
//# sourceMappingURL=reactive-main.js.map
