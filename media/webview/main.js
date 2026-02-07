/* Azure DevOps Integration - Webview Bundle */
(function(){
  // Early process shim for dependencies referencing process/env before entry executes
  var g = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : this);
  if (!g.process) {
    g.process = {
      env: {
        NODE_ENV: "development",
        BROWSER: 'true'
      },
      nextTick: function(cb){ Promise.resolve().then(cb); },
      cwd: function(){ return '/'; },
      platform: 'browser',
      version: 'v0-webview'
    };
  } else {
    if (!g.process.env) {
      g.process.env = { NODE_ENV: "development", BROWSER: 'true' };
    } else if (!g.process.env.NODE_ENV) {
      g.process.env.NODE_ENV = "development";
    }
    if (!g.process.nextTick) {
      g.process.nextTick = function(cb){ Promise.resolve().then(cb); };
    }
  }
})();
"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __defNormalProp = (obj, key2, value) => key2 in obj ? __defProp(obj, key2, { enumerable: true, configurable: true, writable: true, value }) : obj[key2] = value;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key2 of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key2) && key2 !== except)
          __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __publicField = (obj, key2, value) => __defNormalProp(obj, typeof key2 !== "symbol" ? key2 + "" : key2, value);
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

  // node_modules/@plures/praxis/dist/browser/chunk-VOMLVI6V.js
  function safeClone(value) {
    if (value === null || typeof value !== "object") {
      return value;
    }
    if (typeof globalThis.structuredClone === "function") {
      try {
        return globalThis.structuredClone(value);
      } catch {
      }
    }
    if (Array.isArray(value)) {
      return [...value];
    }
    return { ...value };
  }
  function createPraxisEngine(options) {
    return new LogicEngine(options);
  }
  var PRAXIS_PROTOCOL_VERSION, LogicEngine;
  var init_chunk_VOMLVI6V = __esm({
    "node_modules/@plures/praxis/dist/browser/chunk-VOMLVI6V.js"() {
      PRAXIS_PROTOCOL_VERSION = "1.0.0";
      LogicEngine = class {
        constructor(options) {
          __publicField(this, "state");
          __publicField(this, "registry");
          this.registry = options.registry;
          this.state = {
            context: options.initialContext,
            facts: options.initialFacts ?? [],
            meta: options.initialMeta ?? {},
            protocolVersion: PRAXIS_PROTOCOL_VERSION
          };
        }
        /**
         * Get the current state (immutable copy)
         */
        getState() {
          return {
            context: safeClone(this.state.context),
            facts: [...this.state.facts],
            meta: this.state.meta ? safeClone(this.state.meta) : void 0,
            protocolVersion: this.state.protocolVersion
          };
        }
        /**
         * Get the current context
         */
        getContext() {
          return safeClone(this.state.context);
        }
        /**
         * Get current facts
         */
        getFacts() {
          return [...this.state.facts];
        }
        /**
         * Process events through the engine.
         * Applies all registered rules and checks all registered constraints.
         *
         * @param events Events to process
         * @returns Result with new state and diagnostics
         */
        step(events) {
          const config = {
            ruleIds: this.registry.getRuleIds(),
            constraintIds: this.registry.getConstraintIds()
          };
          return this.stepWithConfig(events, config);
        }
        /**
         * Process events with specific rule and constraint configuration.
         *
         * @param events Events to process
         * @param config Step configuration
         * @returns Result with new state and diagnostics
         */
        stepWithConfig(events, config) {
          const diagnostics = [];
          let newState = { ...this.state };
          const newFacts = [];
          for (const ruleId of config.ruleIds) {
            const rule = this.registry.getRule(ruleId);
            if (!rule) {
              diagnostics.push({
                kind: "rule-error",
                message: `Rule "${ruleId}" not found in registry`,
                data: { ruleId }
              });
              continue;
            }
            try {
              const ruleFacts = rule.impl(newState, events);
              newFacts.push(...ruleFacts);
            } catch (error) {
              diagnostics.push({
                kind: "rule-error",
                message: `Error executing rule "${ruleId}": ${error instanceof Error ? error.message : String(error)}`,
                data: { ruleId, error }
              });
            }
          }
          newState = {
            ...newState,
            facts: [...newState.facts, ...newFacts]
          };
          for (const constraintId of config.constraintIds) {
            const constraint = this.registry.getConstraint(constraintId);
            if (!constraint) {
              diagnostics.push({
                kind: "constraint-violation",
                message: `Constraint "${constraintId}" not found in registry`,
                data: { constraintId }
              });
              continue;
            }
            try {
              const result = constraint.impl(newState);
              if (result === false) {
                diagnostics.push({
                  kind: "constraint-violation",
                  message: `Constraint "${constraintId}" violated`,
                  data: { constraintId, description: constraint.description }
                });
              } else if (typeof result === "string") {
                diagnostics.push({
                  kind: "constraint-violation",
                  message: result,
                  data: { constraintId, description: constraint.description }
                });
              }
            } catch (error) {
              diagnostics.push({
                kind: "constraint-violation",
                message: `Error checking constraint "${constraintId}": ${error instanceof Error ? error.message : String(error)}`,
                data: { constraintId, error }
              });
            }
          }
          this.state = newState;
          return {
            state: newState,
            diagnostics
          };
        }
        /**
         * Update the context directly (for exceptional cases).
         * Generally, context should be updated through rules.
         *
         * @param updater Function that produces new context from old context
         */
        updateContext(updater) {
          this.state = {
            ...this.state,
            context: updater(this.state.context)
          };
        }
        /**
         * Add facts directly (for exceptional cases).
         * Generally, facts should be added through rules.
         *
         * @param facts Facts to add
         */
        addFacts(facts) {
          this.state = {
            ...this.state,
            facts: [...this.state.facts, ...facts]
          };
        }
        /**
         * Clear all facts
         */
        clearFacts() {
          this.state = {
            ...this.state,
            facts: []
          };
        }
        /**
         * Reset the engine to initial state
         */
        reset(options) {
          this.state = {
            context: options.initialContext,
            facts: options.initialFacts ?? [],
            meta: options.initialMeta ?? {},
            protocolVersion: PRAXIS_PROTOCOL_VERSION
          };
        }
      };
    }
  });

  // node_modules/@plures/praxis/dist/browser/chunk-JQ64KMLN.js
  var init_chunk_JQ64KMLN = __esm({
    "node_modules/@plures/praxis/dist/browser/chunk-JQ64KMLN.js"() {
    }
  });

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
  var MANAGED_EFFECT = 1 << 24;
  var BLOCK_EFFECT = 1 << 4;
  var BRANCH_EFFECT = 1 << 5;
  var ROOT_EFFECT = 1 << 6;
  var BOUNDARY_EFFECT = 1 << 7;
  var CONNECTED = 1 << 9;
  var CLEAN = 1 << 10;
  var DIRTY = 1 << 11;
  var MAYBE_DIRTY = 1 << 12;
  var INERT = 1 << 13;
  var DESTROYED = 1 << 14;
  var EFFECT_RAN = 1 << 15;
  var EFFECT_TRANSPARENT = 1 << 16;
  var EAGER_EFFECT = 1 << 17;
  var HEAD_EFFECT = 1 << 18;
  var EFFECT_PRESERVED = 1 << 19;
  var USER_EFFECT = 1 << 20;
  var EFFECT_OFFSCREEN = 1 << 25;
  var WAS_MARKED = 1 << 15;
  var REACTION_IS_UPDATING = 1 << 21;
  var ASYNC = 1 << 22;
  var ERROR_VALUE = 1 << 23;
  var STATE_SYMBOL = /* @__PURE__ */ Symbol("$state");
  var LEGACY_PROPS = /* @__PURE__ */ Symbol("legacy props");
  var LOADING_ATTR_SYMBOL = /* @__PURE__ */ Symbol("");
  var PROXY_PATH_SYMBOL = /* @__PURE__ */ Symbol("proxy path");
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
  function bind_invalid_checkbox_value() {
    if (dev_fallback_default) {
      const error = new Error(`bind_invalid_checkbox_value
Using \`bind:value\` together with a checkbox input is not allowed. Use \`bind:checked\` instead
https://svelte.dev/e/bind_invalid_checkbox_value`);
      error.name = "Svelte error";
      throw error;
    } else {
      throw new Error(`https://svelte.dev/e/bind_invalid_checkbox_value`);
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
  var UNINITIALIZED = /* @__PURE__ */ Symbol();
  var FILENAME = /* @__PURE__ */ Symbol("filename");
  var NAMESPACE_HTML = "http://www.w3.org/1999/xhtml";

  // node_modules/svelte/src/internal/client/warnings.js
  var bold = "font-weight: bold";
  var normal = "font-weight: normal";
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
    return set_hydrate_node(get_next_sibling(hydrate_node));
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
  function enable_legacy_mode_flag() {
    legacy_mode_flag = true;
  }

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
  function tag(source2, label) {
    source2.label = label;
    tag_proxy(source2.v, label);
    return source2;
  }
  function tag_proxy(value, label) {
    value?.[PROXY_PATH_SYMBOL]?.(label);
    return value;
  }

  // node_modules/svelte/src/internal/shared/dev.js
  function get_error(label) {
    const error = new Error();
    const stack2 = get_stack();
    if (stack2.length === 0) {
      return null;
    }
    stack2.unshift("\n");
    define_property(error, "stack", {
      value: stack2.join("\n")
    });
    define_property(error, "name", {
      value: label
    });
    return (
      /** @type {Error & { stack: string }} */
      error
    );
  }
  function get_stack() {
    const limit = Error.stackTraceLimit;
    Error.stackTraceLimit = Infinity;
    const stack2 = new Error().stack;
    Error.stackTraceLimit = limit;
    if (!stack2) return [];
    const lines = stack2.split("\n");
    const new_lines = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const posixified = line.replaceAll("\\", "/");
      if (line.trim() === "Error") {
        continue;
      }
      if (line.includes("validate_each_keys")) {
        return [];
      }
      if (posixified.includes("svelte/src/internal") || posixified.includes("node_modules/.vite")) {
        continue;
      }
      new_lines.push(line);
    }
    return new_lines;
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
  function add_svelte_meta(callback, type2, component2, line, column, additional) {
    const parent = dev_stack;
    dev_stack = {
      type: type2,
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
      i: false,
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
    context.i = true;
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
        if (dev_fallback_default && !effect2.parent && error instanceof Error) {
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
    if (dev_fallback_default && error instanceof Error) {
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

  // node_modules/svelte/src/internal/client/reactivity/status.js
  var STATUS_MASK = ~(DIRTY | MAYBE_DIRTY | CLEAN);
  function set_signal_status(signal, status) {
    signal.f = signal.f & STATUS_MASK | status;
  }
  function update_derived_status(derived3) {
    if ((derived3.f & CONNECTED) !== 0 || derived3.deps === null) {
      set_signal_status(derived3, CLEAN);
    } else {
      set_signal_status(derived3, MAYBE_DIRTY);
    }
  }

  // node_modules/svelte/src/internal/client/reactivity/utils.js
  function clear_marked(deps) {
    if (deps === null) return;
    for (const dep of deps) {
      if ((dep.f & DERIVED) === 0 || (dep.f & WAS_MARKED) === 0) {
        continue;
      }
      dep.f ^= WAS_MARKED;
      clear_marked(
        /** @type {Derived} */
        dep.deps
      );
    }
  }
  function defer_effect(effect2, dirty_effects, maybe_dirty_effects) {
    if ((effect2.f & DIRTY) !== 0) {
      dirty_effects.add(effect2);
    } else if ((effect2.f & MAYBE_DIRTY) !== 0) {
      maybe_dirty_effects.add(effect2);
    }
    clear_marked(effect2.deps);
    set_signal_status(effect2, CLEAN);
  }

  // node_modules/svelte/src/internal/client/reactivity/batch.js
  var batches = /* @__PURE__ */ new Set();
  var current_batch = null;
  var previous_batch = null;
  var batch_values = null;
  var queued_root_effects = [];
  var last_scheduled_effect = null;
  var is_flushing = false;
  var is_flushing_sync = false;
  var _commit_callbacks, _discard_callbacks, _pending, _blocking_pending, _deferred, _dirty_effects, _maybe_dirty_effects, _decrement_queued, _Batch_instances, traverse_effect_tree_fn, defer_effects_fn, commit_fn;
  var _Batch = class _Batch {
    constructor() {
      __privateAdd(this, _Batch_instances);
      __publicField(this, "committed", false);
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
      __publicField(this, "previous", /* @__PURE__ */ new Map());
      /**
       * When the batch is committed (and the DOM is updated), we need to remove old branches
       * and append new ones by calling the functions added inside (if/each/key/etc) blocks
       * @type {Set<() => void>}
       */
      __privateAdd(this, _commit_callbacks, /* @__PURE__ */ new Set());
      /**
       * If a fork is discarded, we need to destroy any effects that are no longer needed
       * @type {Set<(batch: Batch) => void>}
       */
      __privateAdd(this, _discard_callbacks, /* @__PURE__ */ new Set());
      /**
       * The number of async effects that are currently in flight
       */
      __privateAdd(this, _pending, 0);
      /**
       * The number of async effects that are currently in flight, _not_ inside a pending boundary
       */
      __privateAdd(this, _blocking_pending, 0);
      /**
       * A deferred that resolves when the batch is committed, used with `settled()`
       * TODO replace with Promise.withResolvers once supported widely enough
       * @type {{ promise: Promise<void>, resolve: (value?: any) => void, reject: (reason: unknown) => void } | null}
       */
      __privateAdd(this, _deferred, null);
      /**
       * Deferred effects (which run after async work has completed) that are DIRTY
       * @type {Set<Effect>}
       */
      __privateAdd(this, _dirty_effects, /* @__PURE__ */ new Set());
      /**
       * Deferred effects that are MAYBE_DIRTY
       * @type {Set<Effect>}
       */
      __privateAdd(this, _maybe_dirty_effects, /* @__PURE__ */ new Set());
      /**
       * A set of branches that still exist, but will be destroyed when this batch
       * is committed — we skip over these during `process`
       * @type {Set<Effect>}
       */
      __publicField(this, "skipped_effects", /* @__PURE__ */ new Set());
      __publicField(this, "is_fork", false);
      __privateAdd(this, _decrement_queued, false);
    }
    is_deferred() {
      return this.is_fork || __privateGet(this, _blocking_pending) > 0;
    }
    /**
     *
     * @param {Effect[]} root_effects
     */
    process(root_effects) {
      queued_root_effects = [];
      this.apply();
      var effects = [];
      var render_effects = [];
      for (const root17 of root_effects) {
        __privateMethod(this, _Batch_instances, traverse_effect_tree_fn).call(this, root17, effects, render_effects);
      }
      if (this.is_deferred()) {
        __privateMethod(this, _Batch_instances, defer_effects_fn).call(this, render_effects);
        __privateMethod(this, _Batch_instances, defer_effects_fn).call(this, effects);
      } else {
        for (const fn of __privateGet(this, _commit_callbacks)) fn();
        __privateGet(this, _commit_callbacks).clear();
        if (__privateGet(this, _pending) === 0) {
          __privateMethod(this, _Batch_instances, commit_fn).call(this);
        }
        previous_batch = this;
        current_batch = null;
        flush_queued_effects(render_effects);
        flush_queued_effects(effects);
        previous_batch = null;
        __privateGet(this, _deferred)?.resolve();
      }
      batch_values = null;
    }
    /**
     * Associate a change to a given source with the current
     * batch, noting its previous and current values
     * @param {Source} source
     * @param {any} value
     */
    capture(source2, value) {
      if (value !== UNINITIALIZED && !this.previous.has(source2)) {
        this.previous.set(source2, value);
      }
      if ((source2.f & ERROR_VALUE) === 0) {
        this.current.set(source2, source2.v);
        batch_values?.set(source2, source2.v);
      }
    }
    activate() {
      current_batch = this;
      this.apply();
    }
    deactivate() {
      if (current_batch !== this) return;
      current_batch = null;
      batch_values = null;
    }
    flush() {
      this.activate();
      if (queued_root_effects.length > 0) {
        flush_effects();
        if (current_batch !== null && current_batch !== this) {
          return;
        }
      } else if (__privateGet(this, _pending) === 0) {
        this.process([]);
      }
      this.deactivate();
    }
    discard() {
      for (const fn of __privateGet(this, _discard_callbacks)) fn(this);
      __privateGet(this, _discard_callbacks).clear();
    }
    /**
     *
     * @param {boolean} blocking
     */
    increment(blocking) {
      __privateSet(this, _pending, __privateGet(this, _pending) + 1);
      if (blocking) __privateSet(this, _blocking_pending, __privateGet(this, _blocking_pending) + 1);
    }
    /**
     *
     * @param {boolean} blocking
     */
    decrement(blocking) {
      __privateSet(this, _pending, __privateGet(this, _pending) - 1);
      if (blocking) __privateSet(this, _blocking_pending, __privateGet(this, _blocking_pending) - 1);
      if (__privateGet(this, _decrement_queued)) return;
      __privateSet(this, _decrement_queued, true);
      queue_micro_task(() => {
        __privateSet(this, _decrement_queued, false);
        if (!this.is_deferred()) {
          this.revive();
        } else if (queued_root_effects.length > 0) {
          this.flush();
        }
      });
    }
    revive() {
      for (const e of __privateGet(this, _dirty_effects)) {
        __privateGet(this, _maybe_dirty_effects).delete(e);
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
    oncommit(fn) {
      __privateGet(this, _commit_callbacks).add(fn);
    }
    /** @param {(batch: Batch) => void} fn */
    ondiscard(fn) {
      __privateGet(this, _discard_callbacks).add(fn);
    }
    settled() {
      return (__privateGet(this, _deferred) ?? __privateSet(this, _deferred, deferred())).promise;
    }
    static ensure() {
      if (current_batch === null) {
        const batch = current_batch = new _Batch();
        batches.add(current_batch);
        if (!is_flushing_sync) {
          queue_micro_task(() => {
            if (current_batch !== batch) {
              return;
            }
            batch.flush();
          });
        }
      }
      return current_batch;
    }
    apply() {
      if (!async_mode_flag || !this.is_fork && batches.size === 1) return;
      batch_values = new Map(this.current);
      for (const batch of batches) {
        if (batch === this) continue;
        for (const [source2, previous] of batch.previous) {
          if (!batch_values.has(source2)) {
            batch_values.set(source2, previous);
          }
        }
      }
    }
  };
  _commit_callbacks = new WeakMap();
  _discard_callbacks = new WeakMap();
  _pending = new WeakMap();
  _blocking_pending = new WeakMap();
  _deferred = new WeakMap();
  _dirty_effects = new WeakMap();
  _maybe_dirty_effects = new WeakMap();
  _decrement_queued = new WeakMap();
  _Batch_instances = new WeakSet();
  /**
   * Traverse the effect tree, executing effects or stashing
   * them for later execution as appropriate
   * @param {Effect} root
   * @param {Effect[]} effects
   * @param {Effect[]} render_effects
   */
  traverse_effect_tree_fn = function(root17, effects, render_effects) {
    root17.f ^= CLEAN;
    var effect2 = root17.first;
    var pending_boundary = null;
    while (effect2 !== null) {
      var flags2 = effect2.f;
      var is_branch = (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) !== 0;
      var is_skippable_branch = is_branch && (flags2 & CLEAN) !== 0;
      var skip = is_skippable_branch || (flags2 & INERT) !== 0 || this.skipped_effects.has(effect2);
      if (async_mode_flag && pending_boundary === null && (flags2 & BOUNDARY_EFFECT) !== 0 && effect2.b?.is_pending) {
        pending_boundary = effect2;
      }
      if (!skip && effect2.fn !== null) {
        if (is_branch) {
          effect2.f ^= CLEAN;
        } else if (pending_boundary !== null && (flags2 & (EFFECT | RENDER_EFFECT | MANAGED_EFFECT)) !== 0) {
          pending_boundary.b.defer_effect(effect2);
        } else if ((flags2 & EFFECT) !== 0) {
          effects.push(effect2);
        } else if (async_mode_flag && (flags2 & (RENDER_EFFECT | MANAGED_EFFECT)) !== 0) {
          render_effects.push(effect2);
        } else if (is_dirty(effect2)) {
          if ((flags2 & BLOCK_EFFECT) !== 0) __privateGet(this, _dirty_effects).add(effect2);
          update_effect(effect2);
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
        if (parent === pending_boundary) {
          pending_boundary = null;
        }
        effect2 = parent.next;
        parent = parent.parent;
      }
    }
  };
  /**
   * @param {Effect[]} effects
   */
  defer_effects_fn = function(effects) {
    for (var i = 0; i < effects.length; i += 1) {
      defer_effect(effects[i], __privateGet(this, _dirty_effects), __privateGet(this, _maybe_dirty_effects));
    }
  };
  commit_fn = function() {
    var _a2;
    if (batches.size > 1) {
      this.previous.clear();
      var previous_batch_values = batch_values;
      var is_earlier = true;
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
          var prev_queued_root_effects = queued_root_effects;
          queued_root_effects = [];
          const marked = /* @__PURE__ */ new Set();
          const checked = /* @__PURE__ */ new Map();
          for (const source2 of sources) {
            mark_effects(source2, others, marked, checked);
          }
          if (queued_root_effects.length > 0) {
            current_batch = batch;
            batch.apply();
            for (const root17 of queued_root_effects) {
              __privateMethod(_a2 = batch, _Batch_instances, traverse_effect_tree_fn).call(_a2, root17, [], []);
            }
            batch.deactivate();
          }
          queued_root_effects = prev_queued_root_effects;
        }
      }
      current_batch = null;
      batch_values = previous_batch_values;
    }
    this.committed = true;
    batches.delete(this);
  };
  var Batch = _Batch;
  function flushSync(fn) {
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
    is_flushing = true;
    var source_stacks = dev_fallback_default ? /* @__PURE__ */ new Set() : null;
    try {
      var flush_count = 0;
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
              if (update2.error) {
                console.error(update2.error);
              }
            }
          }
          infinite_loop_guard();
        }
        batch.process(queued_root_effects);
        old_values.clear();
        if (dev_fallback_default) {
          for (const source2 of batch.current.keys()) {
            source_stacks.add(source2);
          }
        }
      }
    } finally {
      is_flushing = false;
      last_scheduled_effect = null;
      if (dev_fallback_default) {
        for (
          const source2 of
          /** @type {Set<Source>} */
          source_stacks
        ) {
          source2.updated = null;
        }
      }
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
        eager_block_effects = /* @__PURE__ */ new Set();
        update_effect(effect2);
        if (effect2.deps === null && effect2.first === null && effect2.nodes === null) {
          if (effect2.teardown === null && effect2.ac === null) {
            unlink_effect(effect2);
          } else {
            effect2.fn = null;
          }
        }
        if (eager_block_effects?.size > 0) {
          old_values.clear();
          for (const e of eager_block_effects) {
            if ((e.f & (DESTROYED | INERT)) !== 0) continue;
            const ordered_effects = [e];
            let ancestor = e.parent;
            while (ancestor !== null) {
              if (eager_block_effects.has(ancestor)) {
                eager_block_effects.delete(ancestor);
                ordered_effects.push(ancestor);
              }
              ancestor = ancestor.parent;
            }
            for (let j = ordered_effects.length - 1; j >= 0; j--) {
              const e2 = ordered_effects[j];
              if ((e2.f & (DESTROYED | INERT)) !== 0) continue;
              update_effect(e2);
            }
          }
          eager_block_effects.clear();
        }
      }
    }
    eager_block_effects = null;
  }
  function mark_effects(value, sources, marked, checked) {
    if (marked.has(value)) return;
    marked.add(value);
    if (value.reactions !== null) {
      for (const reaction of value.reactions) {
        const flags2 = reaction.f;
        if ((flags2 & DERIVED) !== 0) {
          mark_effects(
            /** @type {Derived} */
            reaction,
            sources,
            marked,
            checked
          );
        } else if ((flags2 & (ASYNC | BLOCK_EFFECT)) !== 0 && (flags2 & DIRTY) === 0 && depends_on(reaction, sources, checked)) {
          set_signal_status(reaction, DIRTY);
          schedule_effect(
            /** @type {Effect} */
            reaction
          );
        }
      }
    }
  }
  function depends_on(reaction, sources, checked) {
    const depends = checked.get(reaction);
    if (depends !== void 0) return depends;
    if (reaction.deps !== null) {
      for (const dep of reaction.deps) {
        if (sources.includes(dep)) {
          return true;
        }
        if ((dep.f & DERIVED) !== 0 && depends_on(
          /** @type {Derived} */
          dep,
          sources,
          checked
        )) {
          checked.set(
            /** @type {Derived} */
            dep,
            true
          );
          return true;
        }
      }
    }
    checked.set(reaction, false);
    return false;
  }
  function schedule_effect(signal) {
    var effect2 = last_scheduled_effect = signal;
    while (effect2.parent !== null) {
      effect2 = effect2.parent;
      var flags2 = effect2.f;
      if (is_flushing && effect2 === active_effect && (flags2 & BLOCK_EFFECT) !== 0 && (flags2 & HEAD_EFFECT) === 0) {
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
  var _anchor, _hydrate_open, _props, _children, _effect, _main_effect, _pending_effect, _failed_effect, _offscreen_fragment, _pending_anchor, _local_pending_count, _pending_count, _pending_count_update_queued, _is_creating_fallback, _dirty_effects2, _maybe_dirty_effects2, _effect_pending, _effect_pending_subscriber, _Boundary_instances, hydrate_resolved_content_fn, hydrate_pending_content_fn, get_anchor_fn, run_fn, show_pending_snippet_fn, update_pending_count_fn;
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
      __publicField(this, "is_pending", false);
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
      /** @type {TemplateNode | null} */
      __privateAdd(this, _pending_anchor, null);
      __privateAdd(this, _local_pending_count, 0);
      __privateAdd(this, _pending_count, 0);
      __privateAdd(this, _pending_count_update_queued, false);
      __privateAdd(this, _is_creating_fallback, false);
      /** @type {Set<Effect>} */
      __privateAdd(this, _dirty_effects2, /* @__PURE__ */ new Set());
      /** @type {Set<Effect>} */
      __privateAdd(this, _maybe_dirty_effects2, /* @__PURE__ */ new Set());
      /**
       * A source containing the number of pending async deriveds/expressions.
       * Only created if `$effect.pending()` is used inside the boundary,
       * otherwise updating the source results in needless `Batch.ensure()`
       * calls followed by no-op flushes
       * @type {Source<number> | null}
       */
      __privateAdd(this, _effect_pending, null);
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
      this.is_pending = !!__privateGet(this, _props).pending;
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
            if (__privateGet(this, _pending_count) === 0) {
              this.is_pending = false;
            }
          }
        } else {
          var anchor = __privateMethod(this, _Boundary_instances, get_anchor_fn).call(this);
          try {
            __privateSet(this, _main_effect, branch(() => children(anchor)));
          } catch (error) {
            this.error(error);
          }
          if (__privateGet(this, _pending_count) > 0) {
            __privateMethod(this, _Boundary_instances, show_pending_snippet_fn).call(this);
          } else {
            this.is_pending = false;
          }
        }
        return () => {
          __privateGet(this, _pending_anchor)?.remove();
        };
      }, flags));
      if (hydrating) {
        __privateSet(this, _anchor, hydrate_node);
      }
    }
    /**
     * Defer an effect inside a pending boundary until the boundary resolves
     * @param {Effect} effect
     */
    defer_effect(effect2) {
      defer_effect(effect2, __privateGet(this, _dirty_effects2), __privateGet(this, _maybe_dirty_effects2));
    }
    /**
     * Returns `false` if the effect exists inside a boundary whose pending snippet is shown
     * @returns {boolean}
     */
    is_rendered() {
      return !this.is_pending && (!this.parent || this.parent.is_rendered());
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
      if (!__privateGet(this, _effect_pending) || __privateGet(this, _pending_count_update_queued)) return;
      __privateSet(this, _pending_count_update_queued, true);
      queue_micro_task(() => {
        __privateSet(this, _pending_count_update_queued, false);
        if (__privateGet(this, _effect_pending)) {
          internal_set(__privateGet(this, _effect_pending), __privateGet(this, _local_pending_count));
        }
      });
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
        this.is_pending = this.has_pending_snippet();
        __privateSet(this, _main_effect, __privateMethod(this, _Boundary_instances, run_fn).call(this, () => {
          __privateSet(this, _is_creating_fallback, false);
          return branch(() => __privateGet(this, _children).call(this, __privateGet(this, _anchor)));
        }));
        if (__privateGet(this, _pending_count) > 0) {
          __privateMethod(this, _Boundary_instances, show_pending_snippet_fn).call(this);
        } else {
          this.is_pending = false;
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
            Batch.ensure();
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
  _anchor = new WeakMap();
  _hydrate_open = new WeakMap();
  _props = new WeakMap();
  _children = new WeakMap();
  _effect = new WeakMap();
  _main_effect = new WeakMap();
  _pending_effect = new WeakMap();
  _failed_effect = new WeakMap();
  _offscreen_fragment = new WeakMap();
  _pending_anchor = new WeakMap();
  _local_pending_count = new WeakMap();
  _pending_count = new WeakMap();
  _pending_count_update_queued = new WeakMap();
  _is_creating_fallback = new WeakMap();
  _dirty_effects2 = new WeakMap();
  _maybe_dirty_effects2 = new WeakMap();
  _effect_pending = new WeakMap();
  _effect_pending_subscriber = new WeakMap();
  _Boundary_instances = new WeakSet();
  hydrate_resolved_content_fn = function() {
    try {
      __privateSet(this, _main_effect, branch(() => __privateGet(this, _children).call(this, __privateGet(this, _anchor))));
    } catch (error) {
      this.error(error);
    }
  };
  hydrate_pending_content_fn = function() {
    const pending2 = __privateGet(this, _props).pending;
    if (!pending2) return;
    __privateSet(this, _pending_effect, branch(() => pending2(__privateGet(this, _anchor))));
    queue_micro_task(() => {
      var anchor = __privateMethod(this, _Boundary_instances, get_anchor_fn).call(this);
      __privateSet(this, _main_effect, __privateMethod(this, _Boundary_instances, run_fn).call(this, () => {
        Batch.ensure();
        return branch(() => __privateGet(this, _children).call(this, anchor));
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
        this.is_pending = false;
      }
    });
  };
  get_anchor_fn = function() {
    var anchor = __privateGet(this, _anchor);
    if (this.is_pending) {
      __privateSet(this, _pending_anchor, create_text());
      __privateGet(this, _anchor).before(__privateGet(this, _pending_anchor));
      anchor = __privateGet(this, _pending_anchor);
    }
    return anchor;
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
      __privateGet(this, _offscreen_fragment).append(
        /** @type {TemplateNode} */
        __privateGet(this, _pending_anchor)
      );
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
      this.is_pending = false;
      for (const e of __privateGet(this, _dirty_effects2)) {
        set_signal_status(e, DIRTY);
        schedule_effect(e);
      }
      for (const e of __privateGet(this, _maybe_dirty_effects2)) {
        set_signal_status(e, MAYBE_DIRTY);
        schedule_effect(e);
      }
      __privateGet(this, _dirty_effects2).clear();
      __privateGet(this, _maybe_dirty_effects2).clear();
      if (__privateGet(this, _pending_effect)) {
        pause_effect(__privateGet(this, _pending_effect), () => {
          __privateSet(this, _pending_effect, null);
        });
      }
      if (__privateGet(this, _offscreen_fragment)) {
        __privateGet(this, _anchor).before(__privateGet(this, _offscreen_fragment));
        __privateSet(this, _offscreen_fragment, null);
      }
    }
  };

  // node_modules/svelte/src/internal/client/reactivity/async.js
  function flatten(blockers, sync, async2, fn) {
    const d = is_runes() ? derived : derived_safe_equal;
    var pending2 = blockers.filter((b) => !b.settled);
    if (async2.length === 0 && pending2.length === 0) {
      fn(sync.map(d));
      return;
    }
    var batch = current_batch;
    var parent = (
      /** @type {Effect} */
      active_effect
    );
    var restore = capture();
    var blocker_promise = pending2.length === 1 ? pending2[0].promise : pending2.length > 1 ? Promise.all(pending2.map((b) => b.promise)) : null;
    function finish(values) {
      restore();
      try {
        fn(values);
      } catch (error) {
        if ((parent.f & DESTROYED) === 0) {
          invoke_error_boundary(error, parent);
        }
      }
      batch?.deactivate();
      unset_context();
    }
    if (async2.length === 0) {
      blocker_promise.then(() => finish(sync.map(d)));
      return;
    }
    function run3() {
      restore();
      Promise.all(async2.map((expression) => async_derived(expression))).then((result) => finish([...sync.map(d), ...result])).catch((error) => invoke_error_boundary(error, parent));
    }
    if (blocker_promise) {
      blocker_promise.then(run3);
    } else {
      run3();
    }
  }
  function capture() {
    var previous_effect = active_effect;
    var previous_reaction = active_reaction;
    var previous_component_context = component_context;
    var previous_batch2 = current_batch;
    if (dev_fallback_default) {
      var previous_dev_stack = dev_stack;
    }
    return function restore(activate_batch = true) {
      set_active_effect(previous_effect);
      set_active_reaction(previous_reaction);
      set_component_context(previous_component_context);
      if (activate_batch) previous_batch2?.activate();
      if (dev_fallback_default) {
        set_from_async_derived(null);
        set_dev_stack(previous_dev_stack);
      }
    };
  }
  function unset_context() {
    set_active_effect(null);
    set_active_reaction(null);
    set_component_context(null);
    if (dev_fallback_default) {
      set_from_async_derived(null);
      set_dev_stack(null);
    }
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
    if (active_effect !== null) {
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
      signal.created = get_error("created at");
    }
    return signal;
  }
  // @__NO_SIDE_EFFECTS__
  function async_derived(fn, label, location) {
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
    if (dev_fallback_default) signal.label = label;
    var should_suspend = !active_reaction;
    var deferreds = /* @__PURE__ */ new Map();
    async_effect(() => {
      if (dev_fallback_default) current_async_effect = active_effect;
      var d = deferred();
      promise = d.promise;
      try {
        Promise.resolve(fn()).then(d.resolve, d.reject).then(() => {
          if (batch === current_batch && batch.committed) {
            batch.deactivate();
          }
          unset_context();
        });
      } catch (error) {
        d.reject(error);
        unset_context();
      }
      if (dev_fallback_default) current_async_effect = null;
      var batch = (
        /** @type {Batch} */
        current_batch
      );
      if (should_suspend) {
        var blocking = boundary2.is_rendered();
        boundary2.update_pending_count(1);
        batch.increment(blocking);
        deferreds.get(batch)?.reject(STALE_REACTION);
        deferreds.delete(batch);
        deferreds.set(batch, d);
      }
      const handler = (value, error = void 0) => {
        current_async_effect = null;
        batch.activate();
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
          batch.decrement(blocking);
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
        return (parent.f & DESTROYED) === 0 ? (
          /** @type {Effect} */
          parent
        ) : null;
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
      let prev_eager_effects = eager_effects;
      set_eager_effects(/* @__PURE__ */ new Set());
      try {
        if (stack.includes(derived3)) {
          derived_references_self();
        }
        stack.push(derived3);
        derived3.f &= ~WAS_MARKED;
        destroy_derived_effects(derived3);
        value = update_reaction(derived3);
      } finally {
        set_active_effect(prev_active_effect);
        set_eager_effects(prev_eager_effects);
        stack.pop();
      }
    } else {
      try {
        derived3.f &= ~WAS_MARKED;
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
      derived3.wv = increment_write_version();
      if (!current_batch?.is_fork || derived3.deps === null) {
        derived3.v = value;
        if (derived3.deps === null) {
          set_signal_status(derived3, CLEAN);
          return;
        }
      }
    }
    if (is_destroying_effect) {
      return;
    }
    if (batch_values !== null) {
      if (effect_tracking() || current_batch?.is_fork) {
        batch_values.set(derived3, value);
      }
    } else {
      update_derived_status(derived3);
    }
  }

  // node_modules/svelte/src/internal/client/reactivity/sources.js
  var eager_effects = /* @__PURE__ */ new Set();
  var old_values = /* @__PURE__ */ new Map();
  function set_eager_effects(v) {
    eager_effects = v;
  }
  var eager_effects_deferred = false;
  function set_eager_effects_deferred() {
    eager_effects_deferred = true;
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
      signal.created = stack2 ?? get_error("created at");
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
    (!untracking || (active_reaction.f & EAGER_EFFECT) !== 0) && is_runes() && (active_reaction.f & (DERIVED | BLOCK_EFFECT | ASYNC | EAGER_EFFECT)) !== 0 && !current_sources?.includes(source2)) {
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
          source2.updated ?? (source2.updated = /* @__PURE__ */ new Map());
          const count = (source2.updated.get("")?.count ?? 0) + 1;
          source2.updated.set("", { error: (
            /** @type {any} */
            null
          ), count });
          if (tracing_mode_flag || count > 5) {
            const error = get_error("updated at");
            if (error !== null) {
              let entry = source2.updated.get(error.stack);
              if (!entry) {
                entry = { error, count: 0 };
                source2.updated.set(error.stack, entry);
              }
              entry.count++;
            }
          }
        }
        if (active_effect !== null) {
          source2.set_during_effect = true;
        }
      }
      if ((source2.f & DERIVED) !== 0) {
        const derived3 = (
          /** @type {Derived} */
          source2
        );
        if ((source2.f & DIRTY) !== 0) {
          execute_derived(derived3);
        }
        update_derived_status(derived3);
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
      if (!batch.is_fork && eager_effects.size > 0 && !eager_effects_deferred) {
        flush_eager_effects();
      }
    }
    return value;
  }
  function flush_eager_effects() {
    eager_effects_deferred = false;
    for (const effect2 of eager_effects) {
      if ((effect2.f & CLEAN) !== 0) {
        set_signal_status(effect2, MAYBE_DIRTY);
      }
      if (is_dirty(effect2)) {
        update_effect(effect2);
      }
    }
    eager_effects.clear();
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
      if (dev_fallback_default && (flags2 & EAGER_EFFECT) !== 0) {
        eager_effects.add(reaction);
        continue;
      }
      var not_dirty = (flags2 & DIRTY) === 0;
      if (not_dirty) {
        set_signal_status(reaction, status);
      }
      if ((flags2 & DERIVED) !== 0) {
        var derived3 = (
          /** @type {Derived} */
          reaction
        );
        batch_values?.delete(derived3);
        if ((flags2 & WAS_MARKED) === 0) {
          if (flags2 & CONNECTED) {
            reaction.f |= WAS_MARKED;
          }
          mark_reactions(derived3, MAYBE_DIRTY);
        }
      } else if (not_dirty) {
        if ((flags2 & BLOCK_EFFECT) !== 0 && eager_block_effects !== null) {
          eager_block_effects.add(
            /** @type {Effect} */
            reaction
          );
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
    var stack2 = dev_fallback_default && tracing_mode_flag ? get_error("created at") : null;
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
          set_eager_effects_deferred();
          var result = value.apply(this, args);
          flush_eager_effects();
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
    return (
      /** @type {TemplateNode | null} */
      first_child_getter.call(node)
    );
  }
  // @__NO_SIDE_EFFECTS__
  function get_next_sibling(node) {
    return (
      /** @type {TemplateNode | null} */
      next_sibling_getter.call(node)
    );
  }
  function child(node, is_text) {
    if (!hydrating) {
      return /* @__PURE__ */ get_first_child(node);
    }
    var child2 = /* @__PURE__ */ get_first_child(hydrate_node);
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
  function first_child(node, is_text = false) {
    if (!hydrating) {
      var first = /* @__PURE__ */ get_first_child(node);
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
    return next_sibling;
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
        // In the capture phase to guarantee we get noticed of it (no possibility of stopPropagation)
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
    if (active_effect === null) {
      if (active_reaction === null) {
        effect_orphan(rune);
      }
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
  function create_effect(type2, fn, sync) {
    var parent = active_effect;
    if (dev_fallback_default) {
      while (parent !== null && (parent.f & EAGER_EFFECT) !== 0) {
        parent = parent.parent;
      }
    }
    if (parent !== null && (parent.f & INERT) !== 0) {
      type2 |= INERT;
    }
    var effect2 = {
      ctx: component_context,
      deps: null,
      nodes: null,
      f: type2 | DIRTY | CONNECTED,
      first: null,
      fn,
      last: null,
      next: null,
      parent,
      b: parent && parent.b,
      prev: null,
      teardown: null,
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
    var e = effect2;
    if (sync && e.deps === null && e.teardown === null && e.nodes === null && e.first === e.last && // either `null`, or a singular child
    (e.f & EFFECT_PRESERVED) === 0) {
      e = e.first;
      if ((type2 & BLOCK_EFFECT) !== 0 && (type2 & EFFECT_TRANSPARENT) !== 0 && e !== null) {
        e.f |= EFFECT_TRANSPARENT;
      }
    }
    if (e !== null) {
      e.parent = parent;
      if (parent !== null) {
        push_effect(e, parent);
      }
      if (active_reaction !== null && (active_reaction.f & DERIVED) !== 0 && (type2 & ROOT_EFFECT) === 0) {
        var derived3 = (
          /** @type {Derived} */
          active_reaction
        );
        (derived3.effects ?? (derived3.effects = [])).push(e);
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
        if ((effect2.f & CLEAN) !== 0 && effect2.deps !== null) {
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
  function template_effect(fn, sync = [], async2 = [], blockers = []) {
    flatten(blockers, sync, async2, (values) => {
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
  function branch(fn) {
    return create_effect(BRANCH_EFFECT | EFFECT_PRESERVED, fn, true);
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
    if ((remove_dom || (effect2.f & HEAD_EFFECT) !== 0) && effect2.nodes !== null && effect2.nodes.end !== null) {
      remove_effect_dom(
        effect2.nodes.start,
        /** @type {TemplateNode} */
        effect2.nodes.end
      );
      removed = true;
    }
    destroy_effect_children(effect2, remove_dom && !removed);
    remove_reactions(effect2, 0);
    set_signal_status(effect2, DESTROYED);
    var transitions = effect2.nodes && effect2.nodes.t;
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
    effect2.next = effect2.prev = effect2.teardown = effect2.ctx = effect2.deps = effect2.fn = effect2.nodes = effect2.ac = null;
  }
  function remove_effect_dom(node, end) {
    while (node !== null) {
      var next2 = node === end ? null : get_next_sibling(node);
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
  function pause_effect(effect2, callback, destroy = true) {
    var transitions = [];
    pause_children(effect2, transitions, true);
    var fn = () => {
      if (destroy) destroy_effect(effect2);
      if (callback) callback();
    };
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
    var t = effect2.nodes && effect2.nodes.t;
    if (t !== null) {
      for (const transition2 of t) {
        if (transition2.is_global || local) {
          transitions.push(transition2);
        }
      }
    }
    var child2 = effect2.first;
    while (child2 !== null) {
      var sibling2 = child2.next;
      var transparent = (child2.f & EFFECT_TRANSPARENT) !== 0 || // If this is a branch effect without a block effect parent,
      // it means the parent block effect was pruned. In that case,
      // transparency information was transferred to the branch effect.
      (child2.f & BRANCH_EFFECT) !== 0 && (effect2.f & BLOCK_EFFECT) !== 0;
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
    var t = effect2.nodes && effect2.nodes.t;
    if (t !== null) {
      for (const transition2 of t) {
        if (transition2.is_global || local) {
          transition2.in();
        }
      }
    }
  }
  function move_effect(effect2, fragment) {
    if (!effect2.nodes) return;
    var node = effect2.nodes.start;
    var end = effect2.nodes.end;
    while (node !== null) {
      var next2 = node === end ? null : get_next_sibling(node);
      fragment.append(node);
      node = next2;
    }
  }

  // node_modules/svelte/src/internal/client/legacy.js
  var captured_signals = null;

  // node_modules/svelte/src/internal/client/runtime.js
  var is_updating_effect = false;
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
  function increment_write_version() {
    return ++write_version;
  }
  function is_dirty(reaction) {
    var flags2 = reaction.f;
    if ((flags2 & DIRTY) !== 0) {
      return true;
    }
    if (flags2 & DERIVED) {
      reaction.f &= ~WAS_MARKED;
    }
    if ((flags2 & MAYBE_DIRTY) !== 0) {
      var dependencies = (
        /** @type {Value[]} */
        reaction.deps
      );
      var length = dependencies.length;
      for (var i = 0; i < length; i++) {
        var dependency = dependencies[i];
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
      if ((flags2 & CONNECTED) !== 0 && // During time traveling we don't want to reset the status so that
      // traversal of the graph in the other batches still happens
      batch_values === null) {
        set_signal_status(reaction, CLEAN);
      }
    }
    return false;
  }
  function schedule_possible_effect_self_invalidation(signal, effect2, root17 = true) {
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
        if (root17) {
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
    var previous_sources = current_sources;
    var previous_component_context = component_context;
    var previous_untracking = untracking;
    var previous_update_version = update_version;
    var flags2 = reaction.f;
    new_deps = /** @type {null | Value[]} */
    null;
    skipped_deps = 0;
    untracked_writes = null;
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
        if (effect_tracking() && (reaction.f & CONNECTED) !== 0) {
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
        if (previous_reaction.deps !== null) {
          for (let i2 = 0; i2 < previous_skipped_deps; i2 += 1) {
            previous_reaction.deps[i2].rv = read_version;
          }
        }
        if (previous_deps !== null) {
          for (const dep of previous_deps) {
            dep.rv = read_version;
          }
        }
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
      var derived3 = (
        /** @type {Derived} */
        dependency
      );
      if ((derived3.f & CONNECTED) !== 0) {
        derived3.f ^= CONNECTED;
        derived3.f &= ~WAS_MARKED;
      }
      update_derived_status(derived3);
      destroy_derived_effects(derived3);
      remove_reactions(derived3, 0);
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
      if ((flags2 & (BLOCK_EFFECT | MANAGED_EFFECT)) !== 0) {
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
  async function tick() {
    if (async_mode_flag) {
      return new Promise((f) => {
        requestAnimationFrame(() => f());
        setTimeout(() => f());
      });
    }
    await Promise.resolve();
    flushSync();
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
            } else {
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
    }
    if (dev_fallback_default) {
      recent_async_deriveds.delete(signal);
      if (tracing_mode_flag && !untracking && tracing_expressions !== null && active_reaction !== null && tracing_expressions.reaction === active_reaction) {
        if (signal.trace) {
          signal.trace();
        } else {
          var trace2 = get_error("traced at");
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
    if (is_destroying_effect && old_values.has(signal)) {
      return old_values.get(signal);
    }
    if (is_derived) {
      var derived3 = (
        /** @type {Derived} */
        signal
      );
      if (is_destroying_effect) {
        var value = derived3.v;
        if ((derived3.f & CLEAN) === 0 && derived3.reactions !== null || depends_on_old_values(derived3)) {
          value = execute_derived(derived3);
        }
        old_values.set(derived3, value);
        return value;
      }
      var should_connect = (derived3.f & CONNECTED) === 0 && !untracking && active_reaction !== null && (is_updating_effect || (active_reaction.f & CONNECTED) !== 0);
      var is_new = derived3.deps === null;
      if (is_dirty(derived3)) {
        if (should_connect) {
          derived3.f |= CONNECTED;
        }
        update_derived(derived3);
      }
      if (should_connect && !is_new) {
        reconnect(derived3);
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
  function reconnect(derived3) {
    if (derived3.deps === null) return;
    derived3.f |= CONNECTED;
    for (const dep of derived3.deps) {
      (dep.reactions ?? (dep.reactions = [])).push(derived3);
      if ((dep.f & DERIVED) !== 0 && (dep.f & CONNECTED) === 0) {
        reconnect(
          /** @type {Derived} */
          dep
        );
      }
    }
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
      "$state.eager",
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
            delegated.call(current_target, event2);
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
    if (effect2.nodes === null) {
      effect2.nodes = { start, end, a: null, t: null };
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
        if (!is_fragment) node = /** @type {TemplateNode} */
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
      var effect2 = (
        /** @type {Effect & { nodes: EffectNodes }} */
        active_effect
      );
      if ((effect2.f & EFFECT_RAN) === 0 || effect2.nodes.end === null) {
        effect2.nodes.end = hydrate_node;
      }
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
    var str2 = value == null ? "" : typeof value === "object" ? value + "" : value;
    if (str2 !== (text2.__t ?? (text2.__t = text2.nodeValue))) {
      text2.__t = str2;
      text2.nodeValue = str2 + "";
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
      var anchor = get_first_child(target);
      while (anchor && (anchor.nodeType !== COMMENT_NODE || /** @type {Comment} */
      anchor.data !== HYDRATION_START)) {
        anchor = get_next_sibling(anchor);
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
    }
  }
  var document_listeners = /* @__PURE__ */ new Map();
  function _mount(Component2, { target, anchor, props = {}, events, context, intro = true }) {
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
          component2 = Component2(anchor_node2, props) || {};
          should_intro = true;
          if (hydrating) {
            active_effect.nodes.end = hydrate_node;
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

  // node_modules/svelte/src/internal/client/dom/blocks/branches.js
  var _batches, _onscreen, _offscreen, _outroing, _transition, _commit, _discard;
  var BranchManager = class {
    /**
     * @param {TemplateNode} anchor
     * @param {boolean} transition
     */
    constructor(anchor, transition2 = true) {
      /** @type {TemplateNode} */
      __publicField(this, "anchor");
      /** @type {Map<Batch, Key>} */
      __privateAdd(this, _batches, /* @__PURE__ */ new Map());
      /**
       * Map of keys to effects that are currently rendered in the DOM.
       * These effects are visible and actively part of the document tree.
       * Example:
       * ```
       * {#if condition}
       * 	foo
       * {:else}
       * 	bar
       * {/if}
       * ```
       * Can result in the entries `true->Effect` and `false->Effect`
       * @type {Map<Key, Effect>}
       */
      __privateAdd(this, _onscreen, /* @__PURE__ */ new Map());
      /**
       * Similar to #onscreen with respect to the keys, but contains branches that are not yet
       * in the DOM, because their insertion is deferred.
       * @type {Map<Key, Branch>}
       */
      __privateAdd(this, _offscreen, /* @__PURE__ */ new Map());
      /**
       * Keys of effects that are currently outroing
       * @type {Set<Key>}
       */
      __privateAdd(this, _outroing, /* @__PURE__ */ new Set());
      /**
       * Whether to pause (i.e. outro) on change, or destroy immediately.
       * This is necessary for `<svelte:element>`
       */
      __privateAdd(this, _transition, true);
      __privateAdd(this, _commit, () => {
        var batch = (
          /** @type {Batch} */
          current_batch
        );
        if (!__privateGet(this, _batches).has(batch)) return;
        var key2 = (
          /** @type {Key} */
          __privateGet(this, _batches).get(batch)
        );
        var onscreen = __privateGet(this, _onscreen).get(key2);
        if (onscreen) {
          resume_effect(onscreen);
          __privateGet(this, _outroing).delete(key2);
        } else {
          var offscreen = __privateGet(this, _offscreen).get(key2);
          if (offscreen) {
            __privateGet(this, _onscreen).set(key2, offscreen.effect);
            __privateGet(this, _offscreen).delete(key2);
            offscreen.fragment.lastChild.remove();
            this.anchor.before(offscreen.fragment);
            onscreen = offscreen.effect;
          }
        }
        for (const [b, k] of __privateGet(this, _batches)) {
          __privateGet(this, _batches).delete(b);
          if (b === batch) {
            break;
          }
          const offscreen2 = __privateGet(this, _offscreen).get(k);
          if (offscreen2) {
            destroy_effect(offscreen2.effect);
            __privateGet(this, _offscreen).delete(k);
          }
        }
        for (const [k, effect2] of __privateGet(this, _onscreen)) {
          if (k === key2 || __privateGet(this, _outroing).has(k)) continue;
          const on_destroy = () => {
            const keys = Array.from(__privateGet(this, _batches).values());
            if (keys.includes(k)) {
              var fragment = document.createDocumentFragment();
              move_effect(effect2, fragment);
              fragment.append(create_text());
              __privateGet(this, _offscreen).set(k, { effect: effect2, fragment });
            } else {
              destroy_effect(effect2);
            }
            __privateGet(this, _outroing).delete(k);
            __privateGet(this, _onscreen).delete(k);
          };
          if (__privateGet(this, _transition) || !onscreen) {
            __privateGet(this, _outroing).add(k);
            pause_effect(effect2, on_destroy, false);
          } else {
            on_destroy();
          }
        }
      });
      /**
       * @param {Batch} batch
       */
      __privateAdd(this, _discard, (batch) => {
        __privateGet(this, _batches).delete(batch);
        const keys = Array.from(__privateGet(this, _batches).values());
        for (const [k, branch2] of __privateGet(this, _offscreen)) {
          if (!keys.includes(k)) {
            destroy_effect(branch2.effect);
            __privateGet(this, _offscreen).delete(k);
          }
        }
      });
      this.anchor = anchor;
      __privateSet(this, _transition, transition2);
    }
    /**
     *
     * @param {any} key
     * @param {null | ((target: TemplateNode) => void)} fn
     */
    ensure(key2, fn) {
      var batch = (
        /** @type {Batch} */
        current_batch
      );
      var defer = should_defer_append();
      if (fn && !__privateGet(this, _onscreen).has(key2) && !__privateGet(this, _offscreen).has(key2)) {
        if (defer) {
          var fragment = document.createDocumentFragment();
          var target = create_text();
          fragment.append(target);
          __privateGet(this, _offscreen).set(key2, {
            effect: branch(() => fn(target)),
            fragment
          });
        } else {
          __privateGet(this, _onscreen).set(
            key2,
            branch(() => fn(this.anchor))
          );
        }
      }
      __privateGet(this, _batches).set(batch, key2);
      if (defer) {
        for (const [k, effect2] of __privateGet(this, _onscreen)) {
          if (k === key2) {
            batch.skipped_effects.delete(effect2);
          } else {
            batch.skipped_effects.add(effect2);
          }
        }
        for (const [k, branch2] of __privateGet(this, _offscreen)) {
          if (k === key2) {
            batch.skipped_effects.delete(branch2.effect);
          } else {
            batch.skipped_effects.add(branch2.effect);
          }
        }
        batch.oncommit(__privateGet(this, _commit));
        batch.ondiscard(__privateGet(this, _discard));
      } else {
        if (hydrating) {
          this.anchor = hydrate_node;
        }
        __privateGet(this, _commit).call(this);
      }
    }
  };
  _batches = new WeakMap();
  _onscreen = new WeakMap();
  _offscreen = new WeakMap();
  _outroing = new WeakMap();
  _transition = new WeakMap();
  _commit = new WeakMap();
  _discard = new WeakMap();

  // node_modules/svelte/src/internal/client/dom/blocks/if.js
  function if_block(node, fn, elseif = false) {
    if (hydrating) {
      hydrate_next();
    }
    var branches = new BranchManager(node);
    var flags2 = elseif ? EFFECT_TRANSPARENT : 0;
    function update_branch(condition, fn2) {
      if (hydrating) {
        const is_else = read_hydration_instruction(node) === HYDRATION_START_ELSE;
        if (condition === is_else) {
          var anchor = skip_nodes();
          set_hydrate_node(anchor);
          branches.anchor = anchor;
          set_hydrating(false);
          branches.ensure(condition, fn2);
          set_hydrating(true);
          return;
        }
      }
      branches.ensure(condition, fn2);
    }
    block(() => {
      var has_branch = false;
      fn((fn2, flag = true) => {
        has_branch = true;
        update_branch(flag, fn2);
      });
      if (!has_branch) {
        update_branch(false, null);
      }
    }, flags2);
  }

  // node_modules/svelte/src/internal/client/dom/blocks/each.js
  function index(_, i) {
    return i;
  }
  function pause_effects(state2, to_destroy, controlled_anchor) {
    var transitions = [];
    var length = to_destroy.length;
    var group;
    var remaining = to_destroy.length;
    for (var i = 0; i < length; i++) {
      let effect2 = to_destroy[i];
      pause_effect(
        effect2,
        () => {
          if (group) {
            group.pending.delete(effect2);
            group.done.add(effect2);
            if (group.pending.size === 0) {
              var groups = (
                /** @type {Set<EachOutroGroup>} */
                state2.outrogroups
              );
              destroy_effects(array_from(group.done));
              groups.delete(group);
              if (groups.size === 0) {
                state2.outrogroups = null;
              }
            }
          } else {
            remaining -= 1;
          }
        },
        false
      );
    }
    if (remaining === 0) {
      var fast_path = transitions.length === 0 && controlled_anchor !== null;
      if (fast_path) {
        var anchor = (
          /** @type {Element} */
          controlled_anchor
        );
        var parent_node = (
          /** @type {Element} */
          anchor.parentNode
        );
        clear_text_content(parent_node);
        parent_node.append(anchor);
        state2.items.clear();
      }
      destroy_effects(to_destroy, !fast_path);
    } else {
      group = {
        pending: new Set(to_destroy),
        done: /* @__PURE__ */ new Set()
      };
      (state2.outrogroups ?? (state2.outrogroups = /* @__PURE__ */ new Set())).add(group);
    }
  }
  function destroy_effects(to_destroy, remove_dom = true) {
    for (var i = 0; i < to_destroy.length; i++) {
      destroy_effect(to_destroy[i], remove_dom);
    }
  }
  var offscreen_anchor;
  function each(node, flags2, get_collection, get_key, render_fn, fallback_fn = null) {
    var anchor = node;
    var items = /* @__PURE__ */ new Map();
    var is_controlled = (flags2 & EACH_IS_CONTROLLED) !== 0;
    if (is_controlled) {
      var parent_node = (
        /** @type {Element} */
        node
      );
      anchor = hydrating ? set_hydrate_node(get_first_child(parent_node)) : parent_node.appendChild(create_text());
    }
    if (hydrating) {
      hydrate_next();
    }
    var fallback2 = null;
    var each_array = derived_safe_equal(() => {
      var collection = get_collection();
      return is_array(collection) ? collection : collection == null ? [] : array_from(collection);
    });
    var array;
    var first_run = true;
    function commit() {
      state2.fallback = fallback2;
      reconcile(state2, array, anchor, flags2, get_key);
      if (fallback2 !== null) {
        if (array.length === 0) {
          if ((fallback2.f & EFFECT_OFFSCREEN) === 0) {
            resume_effect(fallback2);
          } else {
            fallback2.f ^= EFFECT_OFFSCREEN;
            move(fallback2, null, anchor);
          }
        } else {
          pause_effect(fallback2, () => {
            fallback2 = null;
          });
        }
      }
    }
    var effect2 = block(() => {
      array = /** @type {V[]} */
      get(each_array);
      var length = array.length;
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
      var keys = /* @__PURE__ */ new Set();
      var batch = (
        /** @type {Batch} */
        current_batch
      );
      var defer = should_defer_append();
      for (var index2 = 0; index2 < length; index2 += 1) {
        if (hydrating && hydrate_node.nodeType === COMMENT_NODE && /** @type {Comment} */
        hydrate_node.data === HYDRATION_END) {
          anchor = /** @type {Comment} */
          hydrate_node;
          mismatch = true;
          set_hydrating(false);
        }
        var value = array[index2];
        var key2 = get_key(value, index2);
        var item = first_run ? null : items.get(key2);
        if (item) {
          if (item.v) internal_set(item.v, value);
          if (item.i) internal_set(item.i, index2);
          if (defer) {
            batch.skipped_effects.delete(item.e);
          }
        } else {
          item = create_item(
            items,
            first_run ? anchor : offscreen_anchor ?? (offscreen_anchor = create_text()),
            value,
            key2,
            index2,
            render_fn,
            flags2,
            get_collection
          );
          if (!first_run) {
            item.e.f |= EFFECT_OFFSCREEN;
          }
          items.set(key2, item);
        }
        keys.add(key2);
      }
      if (length === 0 && fallback_fn && !fallback2) {
        if (first_run) {
          fallback2 = branch(() => fallback_fn(anchor));
        } else {
          fallback2 = branch(() => fallback_fn(offscreen_anchor ?? (offscreen_anchor = create_text())));
          fallback2.f |= EFFECT_OFFSCREEN;
        }
      }
      if (hydrating && length > 0) {
        set_hydrate_node(skip_nodes());
      }
      if (!first_run) {
        if (defer) {
          for (const [key3, item2] of items) {
            if (!keys.has(key3)) {
              batch.skipped_effects.add(item2.e);
            }
          }
          batch.oncommit(commit);
          batch.ondiscard(() => {
          });
        } else {
          commit();
        }
      }
      if (mismatch) {
        set_hydrating(true);
      }
      get(each_array);
    });
    var state2 = { effect: effect2, flags: flags2, items, outrogroups: null, fallback: fallback2 };
    first_run = false;
    if (hydrating) {
      anchor = hydrate_node;
    }
  }
  function reconcile(state2, array, anchor, flags2, get_key) {
    var is_animated = (flags2 & EACH_IS_ANIMATED) !== 0;
    var length = array.length;
    var items = state2.items;
    var current = state2.effect.first;
    var seen;
    var prev = null;
    var to_animate;
    var matched = [];
    var stashed = [];
    var value;
    var key2;
    var effect2;
    var i;
    if (is_animated) {
      for (i = 0; i < length; i += 1) {
        value = array[i];
        key2 = get_key(value, i);
        effect2 = /** @type {EachItem} */
        items.get(key2).e;
        if ((effect2.f & EFFECT_OFFSCREEN) === 0) {
          effect2.nodes?.a?.measure();
          (to_animate ?? (to_animate = /* @__PURE__ */ new Set())).add(effect2);
        }
      }
    }
    for (i = 0; i < length; i += 1) {
      value = array[i];
      key2 = get_key(value, i);
      effect2 = /** @type {EachItem} */
      items.get(key2).e;
      if (state2.outrogroups !== null) {
        for (const group of state2.outrogroups) {
          group.pending.delete(effect2);
          group.done.delete(effect2);
        }
      }
      if ((effect2.f & EFFECT_OFFSCREEN) !== 0) {
        effect2.f ^= EFFECT_OFFSCREEN;
        if (effect2 === current) {
          move(effect2, null, anchor);
        } else {
          var next2 = prev ? prev.next : current;
          if (effect2 === state2.effect.last) {
            state2.effect.last = effect2.prev;
          }
          if (effect2.prev) effect2.prev.next = effect2.next;
          if (effect2.next) effect2.next.prev = effect2.prev;
          link(state2, prev, effect2);
          link(state2, effect2, next2);
          move(effect2, next2, anchor);
          prev = effect2;
          matched = [];
          stashed = [];
          current = prev.next;
          continue;
        }
      }
      if ((effect2.f & INERT) !== 0) {
        resume_effect(effect2);
        if (is_animated) {
          effect2.nodes?.a?.unfix();
          (to_animate ?? (to_animate = /* @__PURE__ */ new Set())).delete(effect2);
        }
      }
      if (effect2 !== current) {
        if (seen !== void 0 && seen.has(effect2)) {
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
            seen.delete(effect2);
            move(effect2, current, anchor);
            link(state2, effect2.prev, effect2.next);
            link(state2, effect2, prev === null ? state2.effect.first : prev.next);
            link(state2, prev, effect2);
            prev = effect2;
          }
          continue;
        }
        matched = [];
        stashed = [];
        while (current !== null && current !== effect2) {
          (seen ?? (seen = /* @__PURE__ */ new Set())).add(current);
          stashed.push(current);
          current = current.next;
        }
        if (current === null) {
          continue;
        }
      }
      if ((effect2.f & EFFECT_OFFSCREEN) === 0) {
        matched.push(effect2);
      }
      prev = effect2;
      current = effect2.next;
    }
    if (state2.outrogroups !== null) {
      for (const group of state2.outrogroups) {
        if (group.pending.size === 0) {
          destroy_effects(array_from(group.done));
          state2.outrogroups?.delete(group);
        }
      }
      if (state2.outrogroups.size === 0) {
        state2.outrogroups = null;
      }
    }
    if (current !== null || seen !== void 0) {
      var to_destroy = [];
      if (seen !== void 0) {
        for (effect2 of seen) {
          if ((effect2.f & INERT) === 0) {
            to_destroy.push(effect2);
          }
        }
      }
      while (current !== null) {
        if ((current.f & INERT) === 0 && current !== state2.fallback) {
          to_destroy.push(current);
        }
        current = current.next;
      }
      var destroy_length = to_destroy.length;
      if (destroy_length > 0) {
        var controlled_anchor = (flags2 & EACH_IS_CONTROLLED) !== 0 && length === 0 ? anchor : null;
        if (is_animated) {
          for (i = 0; i < destroy_length; i += 1) {
            to_destroy[i].nodes?.a?.measure();
          }
          for (i = 0; i < destroy_length; i += 1) {
            to_destroy[i].nodes?.a?.fix();
          }
        }
        pause_effects(state2, to_destroy, controlled_anchor);
      }
    }
    if (is_animated) {
      queue_micro_task(() => {
        if (to_animate === void 0) return;
        for (effect2 of to_animate) {
          effect2.nodes?.a?.apply();
        }
      });
    }
  }
  function create_item(items, anchor, value, key2, index2, render_fn, flags2, get_collection) {
    var v = (flags2 & EACH_ITEM_REACTIVE) !== 0 ? (flags2 & EACH_ITEM_IMMUTABLE) === 0 ? mutable_source(value, false, false) : source(value) : null;
    var i = (flags2 & EACH_INDEX_REACTIVE) !== 0 ? source(index2) : null;
    if (dev_fallback_default && v) {
      v.trace = () => {
        get_collection()[i?.v ?? index2];
      };
    }
    return {
      v,
      i,
      e: branch(() => {
        render_fn(anchor, v ?? value, i ?? index2, get_collection);
        return () => {
          items.delete(key2);
        };
      })
    };
  }
  function move(effect2, next2, anchor) {
    if (!effect2.nodes) return;
    var node = effect2.nodes.start;
    var end = effect2.nodes.end;
    var dest = next2 && (next2.f & EFFECT_OFFSCREEN) === 0 ? (
      /** @type {EffectNodes} */
      next2.nodes.start
    ) : anchor;
    while (node !== null) {
      var next_node = (
        /** @type {TemplateNode} */
        get_next_sibling(node)
      );
      dest.before(node);
      if (node === end) {
        return;
      }
      node = next_node;
    }
  }
  function link(state2, prev, next2) {
    if (prev === null) {
      state2.effect.first = next2;
    } else {
      prev.next = next2;
    }
    if (next2 === null) {
      state2.effect.last = prev;
    } else {
      next2.prev = prev;
    }
  }

  // node_modules/svelte/src/internal/client/dom/elements/actions.js
  function action(dom, action2, get_value) {
    effect(() => {
      var payload = untrack(() => action2(dom, get_value?.()) || {});
      if (get_value && payload?.update) {
        var inited = false;
        var prev = (
          /** @type {any} */
          {}
        );
        render_effect(() => {
          var value = get_value();
          deep_read_state(value);
          if (inited && safe_not_equal(prev, value)) {
            prev = value;
            payload.update(value);
          }
        });
        inited = true;
      }
      if (payload?.destroy) {
        return () => (
          /** @type {Function} */
          payload.destroy()
        );
      }
    });
  }

  // node_modules/clsx/dist/clsx.mjs
  function r(e) {
    var t, f, n = "";
    if ("string" == typeof e || "number" == typeof e) n += e;
    else if ("object" == typeof e) if (Array.isArray(e)) {
      var o = e.length;
      for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
    } else for (f in e) e[f] && (n && (n += " "), n += f);
    return n;
  }
  function clsx() {
    for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
    return n;
  }

  // node_modules/svelte/src/internal/shared/attributes.js
  function clsx2(value) {
    if (typeof value === "object") {
      return clsx(value);
    } else {
      return value ?? "";
    }
  }
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

  // node_modules/svelte/src/internal/client/dom/elements/attributes.js
  var IS_CUSTOM_ELEMENT = /* @__PURE__ */ Symbol("is custom element");
  var IS_HTML = /* @__PURE__ */ Symbol("is html");
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

  // node_modules/svelte/src/internal/client/dom/elements/bindings/input.js
  function bind_value(input, get3, set3 = get3) {
    var batches2 = /* @__PURE__ */ new WeakSet();
    listen_to_event_and_reset_event(input, "input", async (is_reset) => {
      if (dev_fallback_default && input.type === "checkbox") {
        bind_invalid_checkbox_value();
      }
      var value = is_reset ? input.defaultValue : input.value;
      value = is_numberlike_input(input) ? to_number(value) : value;
      set3(value);
      if (current_batch !== null) {
        batches2.add(current_batch);
      }
      await tick();
      if (value !== (value = get3())) {
        var start = input.selectionStart;
        var end = input.selectionEnd;
        var length = input.value.length;
        input.value = value ?? "";
        if (end !== null) {
          var new_length = input.value.length;
          if (start === end && end === length && new_length > length) {
            input.selectionStart = new_length;
            input.selectionEnd = new_length;
          } else {
            input.selectionStart = start;
            input.selectionEnd = Math.min(end, new_length);
          }
        }
      }
    });
    if (
      // If we are hydrating and the value has since changed,
      // then use the updated value from the input instead.
      hydrating && input.defaultValue !== input.value || // If defaultValue is set, then value == defaultValue
      // TODO Svelte 6: remove input.value check and set to empty string?
      untrack(get3) == null && input.value
    ) {
      set3(is_numberlike_input(input) ? to_number(input.value) : input.value);
      if (current_batch !== null) {
        batches2.add(current_batch);
      }
    }
    render_effect(() => {
      if (dev_fallback_default && input.type === "checkbox") {
        bind_invalid_checkbox_value();
      }
      var value = get3();
      if (input === document.activeElement) {
        var batch = (
          /** @type {Batch} */
          previous_batch ?? current_batch
        );
        if (batches2.has(batch)) {
          return;
        }
      }
      if (is_numberlike_input(input) && value === to_number(input.value)) {
        return;
      }
      if (input.type === "date" && !value && !input.value) {
        return;
      }
      if (value !== input.value) {
        input.value = value ?? "";
      }
    });
  }
  function bind_checked(input, get3, set3 = get3) {
    listen_to_event_and_reset_event(input, "change", (is_reset) => {
      var value = is_reset ? input.defaultChecked : input.checked;
      set3(value);
    });
    if (
      // If we are hydrating and the value has since changed,
      // then use the update value from the input instead.
      hydrating && input.defaultChecked !== input.checked || // If defaultChecked is set, then checked == defaultChecked
      untrack(get3) == null
    ) {
      set3(input.checked);
    }
    render_effect(() => {
      var value = get3();
      input.checked = Boolean(value);
    });
  }
  function is_numberlike_input(input) {
    var type2 = input.type;
    return type2 === "number" || type2 === "range";
  }
  function to_number(value) {
    return value === "" ? null : +value;
  }

  // node_modules/svelte/src/internal/client/dom/elements/bindings/this.js
  function is_bound_this(bound_value, element_or_component) {
    return bound_value === element_or_component || bound_value?.[STATE_SYMBOL] === element_or_component;
  }
  function bind_this(element_or_component = {}, update2, get_value, get_parts) {
    effect(() => {
      var old_parts;
      var parts;
      render_effect(() => {
        old_parts = parts;
        parts = get_parts?.() || [];
        untrack(() => {
          if (element_or_component !== get_value(...parts)) {
            update2(element_or_component, ...parts);
            if (old_parts && is_bound_this(get_value(...old_parts), element_or_component)) {
              update2(null, ...old_parts);
            }
          }
        });
      });
      return () => {
        queue_micro_task(() => {
          if (parts && is_bound_this(get_value(...parts), element_or_component)) {
            update2(null, ...parts);
          }
        });
      };
    });
    return element_or_component;
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

  // node_modules/svelte/src/store/utils.js
  function subscribe_to_store(store, run3, invalidate) {
    if (store == null) {
      run3(void 0);
      if (invalidate) invalidate(void 0);
      return noop;
    }
    const unsub = untrack(
      () => store.subscribe(
        run3,
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
    function set3(new_value) {
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
      set3(fn(
        /** @type {T} */
        value
      ));
    }
    function subscribe(run3, invalidate = noop) {
      const subscriber = [run3, invalidate];
      subscribers.add(subscriber);
      if (subscribers.size === 1) {
        stop = start(set3, update2) || noop;
      }
      run3(
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
    return { set: set3, update: update2, subscribe };
  }
  function get2(store) {
    let value;
    subscribe_to_store(store, (_) => value = _)();
    return value;
  }

  // node_modules/svelte/src/internal/client/reactivity/store.js
  var is_store_binding = false;
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
      addEventListener(type2, listener, options) {
        this.$$l[type2] = this.$$l[type2] || [];
        this.$$l[type2].push(listener);
        if (this.$$c) {
          const unsub = this.$$c.$on(type2, listener);
          this.$$l_u.set(listener, unsub);
        }
        super.addEventListener(type2, listener, options);
      }
      /**
       * @param {string} type
       * @param {EventListenerOrEventListenerObject} listener
       * @param {boolean | AddEventListenerOptions} [options]
       */
      removeEventListener(type2, listener, options) {
        super.removeEventListener(type2, listener, options);
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
          for (const type2 in this.$$l) {
            for (const listener of this.$$l[type2]) {
              const unsub = this.$$c.$on(type2, listener);
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
    const type2 = props_definition[prop2]?.type;
    value = type2 === "Boolean" && typeof value !== "boolean" ? value != null : value;
    if (!transform || !props_definition[prop2]) {
      return value;
    } else if (transform === "toAttribute") {
      switch (type2) {
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
      switch (type2) {
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
  function create_custom_event(type2, detail, { bubbles = false, cancelable = false } = {}) {
    return new CustomEvent(type2, { detail, bubbles, cancelable });
  }
  function createEventDispatcher() {
    const active_component_context = component_context;
    if (active_component_context === null) {
      lifecycle_outside_component("createEventDispatcher");
    }
    return (type2, detail, options) => {
      const events = (
        /** @type {Record<string, Function | Function[]>} */
        active_component_context.s.$$events?.[
          /** @type {string} */
          type2
        ]
      );
      if (events) {
        const callbacks = is_array(events) ? events.slice() : [events];
        const event2 = create_custom_event(
          /** @type {string} */
          type2,
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
  function init_update_callbacks(context) {
    var l = (
      /** @type {ComponentContextLegacy} */
      context.l
    );
    return l.u ?? (l.u = { a: [], b: [], m: [] });
  }

  // node_modules/svelte/src/version.js
  var PUBLIC_VERSION = "5";

  // node_modules/svelte/src/internal/disclose-version.js
  var _a;
  if (typeof window !== "undefined") {
    ((_a = window.__svelte ?? (window.__svelte = {})).v ?? (_a.v = /* @__PURE__ */ new Set())).add(PUBLIC_VERSION);
  }

  // node_modules/@plures/praxis/dist/browser/chunk-LE2ZJYFC.js
  init_chunk_VOMLVI6V();
  var PraxisRegistry = class {
    constructor() {
      __publicField(this, "rules", /* @__PURE__ */ new Map());
      __publicField(this, "constraints", /* @__PURE__ */ new Map());
    }
    /**
     * Register a rule
     */
    registerRule(descriptor) {
      if (this.rules.has(descriptor.id)) {
        throw new Error(`Rule with id "${descriptor.id}" already registered`);
      }
      this.rules.set(descriptor.id, descriptor);
    }
    /**
     * Register a constraint
     */
    registerConstraint(descriptor) {
      if (this.constraints.has(descriptor.id)) {
        throw new Error(`Constraint with id "${descriptor.id}" already registered`);
      }
      this.constraints.set(descriptor.id, descriptor);
    }
    /**
     * Register a module (all its rules and constraints)
     */
    registerModule(module) {
      for (const rule of module.rules) {
        this.registerRule(rule);
      }
      for (const constraint of module.constraints) {
        this.registerConstraint(constraint);
      }
    }
    /**
     * Get a rule by ID
     */
    getRule(id) {
      return this.rules.get(id);
    }
    /**
     * Get a constraint by ID
     */
    getConstraint(id) {
      return this.constraints.get(id);
    }
    /**
     * Get all registered rule IDs
     */
    getRuleIds() {
      return Array.from(this.rules.keys());
    }
    /**
     * Get all registered constraint IDs
     */
    getConstraintIds() {
      return Array.from(this.constraints.keys());
    }
    /**
     * Get all rules
     */
    getAllRules() {
      return Array.from(this.rules.values());
    }
    /**
     * Get all constraints
     */
    getAllConstraints() {
      return Array.from(this.constraints.values());
    }
  };

  // node_modules/@plures/praxis/dist/browser/integrations/svelte.js
  init_chunk_VOMLVI6V();
  function createPraxisStore(engine) {
    let currentState = engine.getState();
    const subscribers = /* @__PURE__ */ new Set();
    const notify = () => {
      currentState = engine.getState();
      subscribers.forEach((sub) => sub(currentState));
    };
    return {
      subscribe(run3) {
        subscribers.add(run3);
        run3(currentState);
        return () => {
          subscribers.delete(run3);
        };
      },
      dispatch(events) {
        engine.step(events);
        notify();
      }
    };
  }
  var HistoryStateManager = class {
    constructor(maxSize = 50) {
      __publicField(this, "history", []);
      __publicField(this, "currentIndex", -1);
      __publicField(this, "maxSize");
      __publicField(this, "idCounter", 0);
      this.maxSize = maxSize;
    }
    /**
     * Record a new history entry
     */
    record(state2, events, label) {
      if (this.currentIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.currentIndex + 1);
      }
      this.history.push({
        id: `history-${++this.idCounter}`,
        timestamp: Date.now(),
        state: state2,
        events,
        label
      });
      if (this.history.length > this.maxSize) {
        this.history.shift();
      } else {
        this.currentIndex++;
      }
    }
    /**
     * Navigate to a specific history entry
     */
    goTo(index2) {
      if (index2 < 0 || index2 >= this.history.length) {
        return null;
      }
      this.currentIndex = index2;
      return this.history[index2];
    }
    /**
     * Go back to previous state
     */
    back() {
      if (!this.canGoBack()) {
        return null;
      }
      return this.goTo(this.currentIndex - 1);
    }
    /**
     * Go forward to next state
     */
    forward() {
      if (!this.canGoForward()) {
        return null;
      }
      return this.goTo(this.currentIndex + 1);
    }
    /**
     * Check if can go back
     */
    canGoBack() {
      return this.currentIndex > 0;
    }
    /**
     * Check if can go forward
     */
    canGoForward() {
      return this.currentIndex < this.history.length - 1;
    }
    /**
     * Get current history entry
     */
    current() {
      if (this.currentIndex < 0 || this.currentIndex >= this.history.length) {
        return null;
      }
      return this.history[this.currentIndex];
    }
    /**
     * Get all history entries
     */
    getHistory() {
      return [...this.history];
    }
    /**
     * Get current index in history
     */
    getCurrentIndex() {
      return this.currentIndex;
    }
    /**
     * Clear all history
     */
    clear() {
      this.history = [];
      this.currentIndex = -1;
    }
  };
  function createHistoryEngine(engine, options = {}) {
    const history2 = new HistoryStateManager(options.maxHistorySize);
    history2.record(engine.getState(), [], options.initialLabel || "Initial");
    const dispatch = (events, label) => {
      engine.step(events);
      history2.record(engine.getState(), events, label);
    };
    const undo = () => {
      const entry = history2.back();
      if (entry) {
        return true;
      }
      return false;
    };
    const redo = () => {
      const entry = history2.forward();
      if (entry) {
        return true;
      }
      return false;
    };
    return {
      engine,
      dispatch,
      undo,
      redo,
      canUndo: () => history2.canGoBack(),
      canRedo: () => history2.canGoForward(),
      getHistory: () => history2.getHistory(),
      goToHistory: (index2) => history2.goTo(index2) !== null,
      clearHistory: () => history2.clear()
    };
  }

  // node_modules/@plures/praxis/dist/browser/index.js
  init_chunk_VOMLVI6V();
  init_chunk_JQ64KMLN();

  // node_modules/js-yaml/dist/js-yaml.mjs
  function isNothing(subject) {
    return typeof subject === "undefined" || subject === null;
  }
  function isObject(subject) {
    return typeof subject === "object" && subject !== null;
  }
  function toArray(sequence) {
    if (Array.isArray(sequence)) return sequence;
    else if (isNothing(sequence)) return [];
    return [sequence];
  }
  function extend(target, source2) {
    var index2, length, key2, sourceKeys;
    if (source2) {
      sourceKeys = Object.keys(source2);
      for (index2 = 0, length = sourceKeys.length; index2 < length; index2 += 1) {
        key2 = sourceKeys[index2];
        target[key2] = source2[key2];
      }
    }
    return target;
  }
  function repeat(string, count) {
    var result = "", cycle;
    for (cycle = 0; cycle < count; cycle += 1) {
      result += string;
    }
    return result;
  }
  function isNegativeZero(number) {
    return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
  }
  var isNothing_1 = isNothing;
  var isObject_1 = isObject;
  var toArray_1 = toArray;
  var repeat_1 = repeat;
  var isNegativeZero_1 = isNegativeZero;
  var extend_1 = extend;
  var common = {
    isNothing: isNothing_1,
    isObject: isObject_1,
    toArray: toArray_1,
    repeat: repeat_1,
    isNegativeZero: isNegativeZero_1,
    extend: extend_1
  };
  function formatError(exception2, compact) {
    var where = "", message = exception2.reason || "(unknown reason)";
    if (!exception2.mark) return message;
    if (exception2.mark.name) {
      where += 'in "' + exception2.mark.name + '" ';
    }
    where += "(" + (exception2.mark.line + 1) + ":" + (exception2.mark.column + 1) + ")";
    if (!compact && exception2.mark.snippet) {
      where += "\n\n" + exception2.mark.snippet;
    }
    return message + " " + where;
  }
  function YAMLException$1(reason, mark) {
    Error.call(this);
    this.name = "YAMLException";
    this.reason = reason;
    this.mark = mark;
    this.message = formatError(this, false);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error().stack || "";
    }
  }
  YAMLException$1.prototype = Object.create(Error.prototype);
  YAMLException$1.prototype.constructor = YAMLException$1;
  YAMLException$1.prototype.toString = function toString(compact) {
    return this.name + ": " + formatError(this, compact);
  };
  var exception = YAMLException$1;
  function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
    var head2 = "";
    var tail = "";
    var maxHalfLength = Math.floor(maxLineLength / 2) - 1;
    if (position - lineStart > maxHalfLength) {
      head2 = " ... ";
      lineStart = position - maxHalfLength + head2.length;
    }
    if (lineEnd - position > maxHalfLength) {
      tail = " ...";
      lineEnd = position + maxHalfLength - tail.length;
    }
    return {
      str: head2 + buffer.slice(lineStart, lineEnd).replace(/\t/g, "\u2192") + tail,
      pos: position - lineStart + head2.length
      // relative position
    };
  }
  function padStart(string, max) {
    return common.repeat(" ", max - string.length) + string;
  }
  function makeSnippet(mark, options) {
    options = Object.create(options || null);
    if (!mark.buffer) return null;
    if (!options.maxLength) options.maxLength = 79;
    if (typeof options.indent !== "number") options.indent = 1;
    if (typeof options.linesBefore !== "number") options.linesBefore = 3;
    if (typeof options.linesAfter !== "number") options.linesAfter = 2;
    var re = /\r?\n|\r|\0/g;
    var lineStarts = [0];
    var lineEnds = [];
    var match;
    var foundLineNo = -1;
    while (match = re.exec(mark.buffer)) {
      lineEnds.push(match.index);
      lineStarts.push(match.index + match[0].length);
      if (mark.position <= match.index && foundLineNo < 0) {
        foundLineNo = lineStarts.length - 2;
      }
    }
    if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
    var result = "", i, line;
    var lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
    var maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
    for (i = 1; i <= options.linesBefore; i++) {
      if (foundLineNo - i < 0) break;
      line = getLine(
        mark.buffer,
        lineStarts[foundLineNo - i],
        lineEnds[foundLineNo - i],
        mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]),
        maxLineLength
      );
      result = common.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line.str + "\n" + result;
    }
    line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
    result += common.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
    result += common.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
    for (i = 1; i <= options.linesAfter; i++) {
      if (foundLineNo + i >= lineEnds.length) break;
      line = getLine(
        mark.buffer,
        lineStarts[foundLineNo + i],
        lineEnds[foundLineNo + i],
        mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]),
        maxLineLength
      );
      result += common.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line.str + "\n";
    }
    return result.replace(/\n$/, "");
  }
  var snippet2 = makeSnippet;
  var TYPE_CONSTRUCTOR_OPTIONS = [
    "kind",
    "multi",
    "resolve",
    "construct",
    "instanceOf",
    "predicate",
    "represent",
    "representName",
    "defaultStyle",
    "styleAliases"
  ];
  var YAML_NODE_KINDS = [
    "scalar",
    "sequence",
    "mapping"
  ];
  function compileStyleAliases(map2) {
    var result = {};
    if (map2 !== null) {
      Object.keys(map2).forEach(function(style) {
        map2[style].forEach(function(alias) {
          result[String(alias)] = style;
        });
      });
    }
    return result;
  }
  function Type$1(tag2, options) {
    options = options || {};
    Object.keys(options).forEach(function(name) {
      if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
        throw new exception('Unknown option "' + name + '" is met in definition of "' + tag2 + '" YAML type.');
      }
    });
    this.options = options;
    this.tag = tag2;
    this.kind = options["kind"] || null;
    this.resolve = options["resolve"] || function() {
      return true;
    };
    this.construct = options["construct"] || function(data) {
      return data;
    };
    this.instanceOf = options["instanceOf"] || null;
    this.predicate = options["predicate"] || null;
    this.represent = options["represent"] || null;
    this.representName = options["representName"] || null;
    this.defaultStyle = options["defaultStyle"] || null;
    this.multi = options["multi"] || false;
    this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
    if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
      throw new exception('Unknown kind "' + this.kind + '" is specified for "' + tag2 + '" YAML type.');
    }
  }
  var type = Type$1;
  function compileList(schema2, name) {
    var result = [];
    schema2[name].forEach(function(currentType) {
      var newIndex = result.length;
      result.forEach(function(previousType, previousIndex) {
        if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) {
          newIndex = previousIndex;
        }
      });
      result[newIndex] = currentType;
    });
    return result;
  }
  function compileMap() {
    var result = {
      scalar: {},
      sequence: {},
      mapping: {},
      fallback: {},
      multi: {
        scalar: [],
        sequence: [],
        mapping: [],
        fallback: []
      }
    }, index2, length;
    function collectType(type2) {
      if (type2.multi) {
        result.multi[type2.kind].push(type2);
        result.multi["fallback"].push(type2);
      } else {
        result[type2.kind][type2.tag] = result["fallback"][type2.tag] = type2;
      }
    }
    for (index2 = 0, length = arguments.length; index2 < length; index2 += 1) {
      arguments[index2].forEach(collectType);
    }
    return result;
  }
  function Schema$1(definition) {
    return this.extend(definition);
  }
  Schema$1.prototype.extend = function extend2(definition) {
    var implicit = [];
    var explicit = [];
    if (definition instanceof type) {
      explicit.push(definition);
    } else if (Array.isArray(definition)) {
      explicit = explicit.concat(definition);
    } else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
      if (definition.implicit) implicit = implicit.concat(definition.implicit);
      if (definition.explicit) explicit = explicit.concat(definition.explicit);
    } else {
      throw new exception("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
    }
    implicit.forEach(function(type$1) {
      if (!(type$1 instanceof type)) {
        throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
      }
      if (type$1.loadKind && type$1.loadKind !== "scalar") {
        throw new exception("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
      }
      if (type$1.multi) {
        throw new exception("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
      }
    });
    explicit.forEach(function(type$1) {
      if (!(type$1 instanceof type)) {
        throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
      }
    });
    var result = Object.create(Schema$1.prototype);
    result.implicit = (this.implicit || []).concat(implicit);
    result.explicit = (this.explicit || []).concat(explicit);
    result.compiledImplicit = compileList(result, "implicit");
    result.compiledExplicit = compileList(result, "explicit");
    result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
    return result;
  };
  var schema = Schema$1;
  var str = new type("tag:yaml.org,2002:str", {
    kind: "scalar",
    construct: function(data) {
      return data !== null ? data : "";
    }
  });
  var seq = new type("tag:yaml.org,2002:seq", {
    kind: "sequence",
    construct: function(data) {
      return data !== null ? data : [];
    }
  });
  var map = new type("tag:yaml.org,2002:map", {
    kind: "mapping",
    construct: function(data) {
      return data !== null ? data : {};
    }
  });
  var failsafe = new schema({
    explicit: [
      str,
      seq,
      map
    ]
  });
  function resolveYamlNull(data) {
    if (data === null) return true;
    var max = data.length;
    return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
  }
  function constructYamlNull() {
    return null;
  }
  function isNull(object) {
    return object === null;
  }
  var _null = new type("tag:yaml.org,2002:null", {
    kind: "scalar",
    resolve: resolveYamlNull,
    construct: constructYamlNull,
    predicate: isNull,
    represent: {
      canonical: function() {
        return "~";
      },
      lowercase: function() {
        return "null";
      },
      uppercase: function() {
        return "NULL";
      },
      camelcase: function() {
        return "Null";
      },
      empty: function() {
        return "";
      }
    },
    defaultStyle: "lowercase"
  });
  function resolveYamlBoolean(data) {
    if (data === null) return false;
    var max = data.length;
    return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
  }
  function constructYamlBoolean(data) {
    return data === "true" || data === "True" || data === "TRUE";
  }
  function isBoolean(object) {
    return Object.prototype.toString.call(object) === "[object Boolean]";
  }
  var bool = new type("tag:yaml.org,2002:bool", {
    kind: "scalar",
    resolve: resolveYamlBoolean,
    construct: constructYamlBoolean,
    predicate: isBoolean,
    represent: {
      lowercase: function(object) {
        return object ? "true" : "false";
      },
      uppercase: function(object) {
        return object ? "TRUE" : "FALSE";
      },
      camelcase: function(object) {
        return object ? "True" : "False";
      }
    },
    defaultStyle: "lowercase"
  });
  function isHexCode(c) {
    return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
  }
  function isOctCode(c) {
    return 48 <= c && c <= 55;
  }
  function isDecCode(c) {
    return 48 <= c && c <= 57;
  }
  function resolveYamlInteger(data) {
    if (data === null) return false;
    var max = data.length, index2 = 0, hasDigits = false, ch;
    if (!max) return false;
    ch = data[index2];
    if (ch === "-" || ch === "+") {
      ch = data[++index2];
    }
    if (ch === "0") {
      if (index2 + 1 === max) return true;
      ch = data[++index2];
      if (ch === "b") {
        index2++;
        for (; index2 < max; index2++) {
          ch = data[index2];
          if (ch === "_") continue;
          if (ch !== "0" && ch !== "1") return false;
          hasDigits = true;
        }
        return hasDigits && ch !== "_";
      }
      if (ch === "x") {
        index2++;
        for (; index2 < max; index2++) {
          ch = data[index2];
          if (ch === "_") continue;
          if (!isHexCode(data.charCodeAt(index2))) return false;
          hasDigits = true;
        }
        return hasDigits && ch !== "_";
      }
      if (ch === "o") {
        index2++;
        for (; index2 < max; index2++) {
          ch = data[index2];
          if (ch === "_") continue;
          if (!isOctCode(data.charCodeAt(index2))) return false;
          hasDigits = true;
        }
        return hasDigits && ch !== "_";
      }
    }
    if (ch === "_") return false;
    for (; index2 < max; index2++) {
      ch = data[index2];
      if (ch === "_") continue;
      if (!isDecCode(data.charCodeAt(index2))) {
        return false;
      }
      hasDigits = true;
    }
    if (!hasDigits || ch === "_") return false;
    return true;
  }
  function constructYamlInteger(data) {
    var value = data, sign = 1, ch;
    if (value.indexOf("_") !== -1) {
      value = value.replace(/_/g, "");
    }
    ch = value[0];
    if (ch === "-" || ch === "+") {
      if (ch === "-") sign = -1;
      value = value.slice(1);
      ch = value[0];
    }
    if (value === "0") return 0;
    if (ch === "0") {
      if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
      if (value[1] === "x") return sign * parseInt(value.slice(2), 16);
      if (value[1] === "o") return sign * parseInt(value.slice(2), 8);
    }
    return sign * parseInt(value, 10);
  }
  function isInteger(object) {
    return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common.isNegativeZero(object));
  }
  var int = new type("tag:yaml.org,2002:int", {
    kind: "scalar",
    resolve: resolveYamlInteger,
    construct: constructYamlInteger,
    predicate: isInteger,
    represent: {
      binary: function(obj) {
        return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
      },
      octal: function(obj) {
        return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
      },
      decimal: function(obj) {
        return obj.toString(10);
      },
      /* eslint-disable max-len */
      hexadecimal: function(obj) {
        return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
      }
    },
    defaultStyle: "decimal",
    styleAliases: {
      binary: [2, "bin"],
      octal: [8, "oct"],
      decimal: [10, "dec"],
      hexadecimal: [16, "hex"]
    }
  });
  var YAML_FLOAT_PATTERN = new RegExp(
    // 2.5e4, 2.5 and integers
    "^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
  );
  function resolveYamlFloat(data) {
    if (data === null) return false;
    if (!YAML_FLOAT_PATTERN.test(data) || // Quick hack to not allow integers end with `_`
    // Probably should update regexp & check speed
    data[data.length - 1] === "_") {
      return false;
    }
    return true;
  }
  function constructYamlFloat(data) {
    var value, sign;
    value = data.replace(/_/g, "").toLowerCase();
    sign = value[0] === "-" ? -1 : 1;
    if ("+-".indexOf(value[0]) >= 0) {
      value = value.slice(1);
    }
    if (value === ".inf") {
      return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    } else if (value === ".nan") {
      return NaN;
    }
    return sign * parseFloat(value, 10);
  }
  var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
  function representYamlFloat(object, style) {
    var res;
    if (isNaN(object)) {
      switch (style) {
        case "lowercase":
          return ".nan";
        case "uppercase":
          return ".NAN";
        case "camelcase":
          return ".NaN";
      }
    } else if (Number.POSITIVE_INFINITY === object) {
      switch (style) {
        case "lowercase":
          return ".inf";
        case "uppercase":
          return ".INF";
        case "camelcase":
          return ".Inf";
      }
    } else if (Number.NEGATIVE_INFINITY === object) {
      switch (style) {
        case "lowercase":
          return "-.inf";
        case "uppercase":
          return "-.INF";
        case "camelcase":
          return "-.Inf";
      }
    } else if (common.isNegativeZero(object)) {
      return "-0.0";
    }
    res = object.toString(10);
    return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
  }
  function isFloat(object) {
    return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common.isNegativeZero(object));
  }
  var float = new type("tag:yaml.org,2002:float", {
    kind: "scalar",
    resolve: resolveYamlFloat,
    construct: constructYamlFloat,
    predicate: isFloat,
    represent: representYamlFloat,
    defaultStyle: "lowercase"
  });
  var json = failsafe.extend({
    implicit: [
      _null,
      bool,
      int,
      float
    ]
  });
  var core = json;
  var YAML_DATE_REGEXP = new RegExp(
    "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
  );
  var YAML_TIMESTAMP_REGEXP = new RegExp(
    "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
  );
  function resolveYamlTimestamp(data) {
    if (data === null) return false;
    if (YAML_DATE_REGEXP.exec(data) !== null) return true;
    if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
    return false;
  }
  function constructYamlTimestamp(data) {
    var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
    match = YAML_DATE_REGEXP.exec(data);
    if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
    if (match === null) throw new Error("Date resolve error");
    year = +match[1];
    month = +match[2] - 1;
    day = +match[3];
    if (!match[4]) {
      return new Date(Date.UTC(year, month, day));
    }
    hour = +match[4];
    minute = +match[5];
    second = +match[6];
    if (match[7]) {
      fraction = match[7].slice(0, 3);
      while (fraction.length < 3) {
        fraction += "0";
      }
      fraction = +fraction;
    }
    if (match[9]) {
      tz_hour = +match[10];
      tz_minute = +(match[11] || 0);
      delta = (tz_hour * 60 + tz_minute) * 6e4;
      if (match[9] === "-") delta = -delta;
    }
    date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
    if (delta) date.setTime(date.getTime() - delta);
    return date;
  }
  function representYamlTimestamp(object) {
    return object.toISOString();
  }
  var timestamp = new type("tag:yaml.org,2002:timestamp", {
    kind: "scalar",
    resolve: resolveYamlTimestamp,
    construct: constructYamlTimestamp,
    instanceOf: Date,
    represent: representYamlTimestamp
  });
  function resolveYamlMerge(data) {
    return data === "<<" || data === null;
  }
  var merge = new type("tag:yaml.org,2002:merge", {
    kind: "scalar",
    resolve: resolveYamlMerge
  });
  var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
  function resolveYamlBinary(data) {
    if (data === null) return false;
    var code, idx, bitlen = 0, max = data.length, map2 = BASE64_MAP;
    for (idx = 0; idx < max; idx++) {
      code = map2.indexOf(data.charAt(idx));
      if (code > 64) continue;
      if (code < 0) return false;
      bitlen += 6;
    }
    return bitlen % 8 === 0;
  }
  function constructYamlBinary(data) {
    var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map2 = BASE64_MAP, bits = 0, result = [];
    for (idx = 0; idx < max; idx++) {
      if (idx % 4 === 0 && idx) {
        result.push(bits >> 16 & 255);
        result.push(bits >> 8 & 255);
        result.push(bits & 255);
      }
      bits = bits << 6 | map2.indexOf(input.charAt(idx));
    }
    tailbits = max % 4 * 6;
    if (tailbits === 0) {
      result.push(bits >> 16 & 255);
      result.push(bits >> 8 & 255);
      result.push(bits & 255);
    } else if (tailbits === 18) {
      result.push(bits >> 10 & 255);
      result.push(bits >> 2 & 255);
    } else if (tailbits === 12) {
      result.push(bits >> 4 & 255);
    }
    return new Uint8Array(result);
  }
  function representYamlBinary(object) {
    var result = "", bits = 0, idx, tail, max = object.length, map2 = BASE64_MAP;
    for (idx = 0; idx < max; idx++) {
      if (idx % 3 === 0 && idx) {
        result += map2[bits >> 18 & 63];
        result += map2[bits >> 12 & 63];
        result += map2[bits >> 6 & 63];
        result += map2[bits & 63];
      }
      bits = (bits << 8) + object[idx];
    }
    tail = max % 3;
    if (tail === 0) {
      result += map2[bits >> 18 & 63];
      result += map2[bits >> 12 & 63];
      result += map2[bits >> 6 & 63];
      result += map2[bits & 63];
    } else if (tail === 2) {
      result += map2[bits >> 10 & 63];
      result += map2[bits >> 4 & 63];
      result += map2[bits << 2 & 63];
      result += map2[64];
    } else if (tail === 1) {
      result += map2[bits >> 2 & 63];
      result += map2[bits << 4 & 63];
      result += map2[64];
      result += map2[64];
    }
    return result;
  }
  function isBinary(obj) {
    return Object.prototype.toString.call(obj) === "[object Uint8Array]";
  }
  var binary = new type("tag:yaml.org,2002:binary", {
    kind: "scalar",
    resolve: resolveYamlBinary,
    construct: constructYamlBinary,
    predicate: isBinary,
    represent: representYamlBinary
  });
  var _hasOwnProperty$3 = Object.prototype.hasOwnProperty;
  var _toString$2 = Object.prototype.toString;
  function resolveYamlOmap(data) {
    if (data === null) return true;
    var objectKeys = [], index2, length, pair, pairKey, pairHasKey, object = data;
    for (index2 = 0, length = object.length; index2 < length; index2 += 1) {
      pair = object[index2];
      pairHasKey = false;
      if (_toString$2.call(pair) !== "[object Object]") return false;
      for (pairKey in pair) {
        if (_hasOwnProperty$3.call(pair, pairKey)) {
          if (!pairHasKey) pairHasKey = true;
          else return false;
        }
      }
      if (!pairHasKey) return false;
      if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
      else return false;
    }
    return true;
  }
  function constructYamlOmap(data) {
    return data !== null ? data : [];
  }
  var omap = new type("tag:yaml.org,2002:omap", {
    kind: "sequence",
    resolve: resolveYamlOmap,
    construct: constructYamlOmap
  });
  var _toString$1 = Object.prototype.toString;
  function resolveYamlPairs(data) {
    if (data === null) return true;
    var index2, length, pair, keys, result, object = data;
    result = new Array(object.length);
    for (index2 = 0, length = object.length; index2 < length; index2 += 1) {
      pair = object[index2];
      if (_toString$1.call(pair) !== "[object Object]") return false;
      keys = Object.keys(pair);
      if (keys.length !== 1) return false;
      result[index2] = [keys[0], pair[keys[0]]];
    }
    return true;
  }
  function constructYamlPairs(data) {
    if (data === null) return [];
    var index2, length, pair, keys, result, object = data;
    result = new Array(object.length);
    for (index2 = 0, length = object.length; index2 < length; index2 += 1) {
      pair = object[index2];
      keys = Object.keys(pair);
      result[index2] = [keys[0], pair[keys[0]]];
    }
    return result;
  }
  var pairs = new type("tag:yaml.org,2002:pairs", {
    kind: "sequence",
    resolve: resolveYamlPairs,
    construct: constructYamlPairs
  });
  var _hasOwnProperty$2 = Object.prototype.hasOwnProperty;
  function resolveYamlSet(data) {
    if (data === null) return true;
    var key2, object = data;
    for (key2 in object) {
      if (_hasOwnProperty$2.call(object, key2)) {
        if (object[key2] !== null) return false;
      }
    }
    return true;
  }
  function constructYamlSet(data) {
    return data !== null ? data : {};
  }
  var set2 = new type("tag:yaml.org,2002:set", {
    kind: "mapping",
    resolve: resolveYamlSet,
    construct: constructYamlSet
  });
  var _default = core.extend({
    implicit: [
      timestamp,
      merge
    ],
    explicit: [
      binary,
      omap,
      pairs,
      set2
    ]
  });
  var _hasOwnProperty$1 = Object.prototype.hasOwnProperty;
  var CONTEXT_FLOW_IN = 1;
  var CONTEXT_FLOW_OUT = 2;
  var CONTEXT_BLOCK_IN = 3;
  var CONTEXT_BLOCK_OUT = 4;
  var CHOMPING_CLIP = 1;
  var CHOMPING_STRIP = 2;
  var CHOMPING_KEEP = 3;
  var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
  var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
  var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
  var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
  var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
  function _class(obj) {
    return Object.prototype.toString.call(obj);
  }
  function is_EOL(c) {
    return c === 10 || c === 13;
  }
  function is_WHITE_SPACE(c) {
    return c === 9 || c === 32;
  }
  function is_WS_OR_EOL(c) {
    return c === 9 || c === 32 || c === 10 || c === 13;
  }
  function is_FLOW_INDICATOR(c) {
    return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
  }
  function fromHexCode(c) {
    var lc;
    if (48 <= c && c <= 57) {
      return c - 48;
    }
    lc = c | 32;
    if (97 <= lc && lc <= 102) {
      return lc - 97 + 10;
    }
    return -1;
  }
  function escapedHexLen(c) {
    if (c === 120) {
      return 2;
    }
    if (c === 117) {
      return 4;
    }
    if (c === 85) {
      return 8;
    }
    return 0;
  }
  function fromDecimalCode(c) {
    if (48 <= c && c <= 57) {
      return c - 48;
    }
    return -1;
  }
  function simpleEscapeSequence(c) {
    return c === 48 ? "\0" : c === 97 ? "\x07" : c === 98 ? "\b" : c === 116 ? "	" : c === 9 ? "	" : c === 110 ? "\n" : c === 118 ? "\v" : c === 102 ? "\f" : c === 114 ? "\r" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? '"' : c === 47 ? "/" : c === 92 ? "\\" : c === 78 ? "\x85" : c === 95 ? "\xA0" : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
  }
  function charFromCodepoint(c) {
    if (c <= 65535) {
      return String.fromCharCode(c);
    }
    return String.fromCharCode(
      (c - 65536 >> 10) + 55296,
      (c - 65536 & 1023) + 56320
    );
  }
  function setProperty(object, key2, value) {
    if (key2 === "__proto__") {
      Object.defineProperty(object, key2, {
        configurable: true,
        enumerable: true,
        writable: true,
        value
      });
    } else {
      object[key2] = value;
    }
  }
  var simpleEscapeCheck = new Array(256);
  var simpleEscapeMap = new Array(256);
  for (i = 0; i < 256; i++) {
    simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
    simpleEscapeMap[i] = simpleEscapeSequence(i);
  }
  var i;
  function State$1(input, options) {
    this.input = input;
    this.filename = options["filename"] || null;
    this.schema = options["schema"] || _default;
    this.onWarning = options["onWarning"] || null;
    this.legacy = options["legacy"] || false;
    this.json = options["json"] || false;
    this.listener = options["listener"] || null;
    this.implicitTypes = this.schema.compiledImplicit;
    this.typeMap = this.schema.compiledTypeMap;
    this.length = input.length;
    this.position = 0;
    this.line = 0;
    this.lineStart = 0;
    this.lineIndent = 0;
    this.firstTabInLine = -1;
    this.documents = [];
  }
  function generateError(state2, message) {
    var mark = {
      name: state2.filename,
      buffer: state2.input.slice(0, -1),
      // omit trailing \0
      position: state2.position,
      line: state2.line,
      column: state2.position - state2.lineStart
    };
    mark.snippet = snippet2(mark);
    return new exception(message, mark);
  }
  function throwError(state2, message) {
    throw generateError(state2, message);
  }
  function throwWarning(state2, message) {
    if (state2.onWarning) {
      state2.onWarning.call(null, generateError(state2, message));
    }
  }
  var directiveHandlers = {
    YAML: function handleYamlDirective(state2, name, args) {
      var match, major, minor;
      if (state2.version !== null) {
        throwError(state2, "duplication of %YAML directive");
      }
      if (args.length !== 1) {
        throwError(state2, "YAML directive accepts exactly one argument");
      }
      match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
      if (match === null) {
        throwError(state2, "ill-formed argument of the YAML directive");
      }
      major = parseInt(match[1], 10);
      minor = parseInt(match[2], 10);
      if (major !== 1) {
        throwError(state2, "unacceptable YAML version of the document");
      }
      state2.version = args[0];
      state2.checkLineBreaks = minor < 2;
      if (minor !== 1 && minor !== 2) {
        throwWarning(state2, "unsupported YAML version of the document");
      }
    },
    TAG: function handleTagDirective(state2, name, args) {
      var handle, prefix;
      if (args.length !== 2) {
        throwError(state2, "TAG directive accepts exactly two arguments");
      }
      handle = args[0];
      prefix = args[1];
      if (!PATTERN_TAG_HANDLE.test(handle)) {
        throwError(state2, "ill-formed tag handle (first argument) of the TAG directive");
      }
      if (_hasOwnProperty$1.call(state2.tagMap, handle)) {
        throwError(state2, 'there is a previously declared suffix for "' + handle + '" tag handle');
      }
      if (!PATTERN_TAG_URI.test(prefix)) {
        throwError(state2, "ill-formed tag prefix (second argument) of the TAG directive");
      }
      try {
        prefix = decodeURIComponent(prefix);
      } catch (err) {
        throwError(state2, "tag prefix is malformed: " + prefix);
      }
      state2.tagMap[handle] = prefix;
    }
  };
  function captureSegment(state2, start, end, checkJson) {
    var _position, _length, _character, _result;
    if (start < end) {
      _result = state2.input.slice(start, end);
      if (checkJson) {
        for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
          _character = _result.charCodeAt(_position);
          if (!(_character === 9 || 32 <= _character && _character <= 1114111)) {
            throwError(state2, "expected valid JSON character");
          }
        }
      } else if (PATTERN_NON_PRINTABLE.test(_result)) {
        throwError(state2, "the stream contains non-printable characters");
      }
      state2.result += _result;
    }
  }
  function mergeMappings(state2, destination, source2, overridableKeys) {
    var sourceKeys, key2, index2, quantity;
    if (!common.isObject(source2)) {
      throwError(state2, "cannot merge mappings; the provided source object is unacceptable");
    }
    sourceKeys = Object.keys(source2);
    for (index2 = 0, quantity = sourceKeys.length; index2 < quantity; index2 += 1) {
      key2 = sourceKeys[index2];
      if (!_hasOwnProperty$1.call(destination, key2)) {
        setProperty(destination, key2, source2[key2]);
        overridableKeys[key2] = true;
      }
    }
  }
  function storeMappingPair(state2, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
    var index2, quantity;
    if (Array.isArray(keyNode)) {
      keyNode = Array.prototype.slice.call(keyNode);
      for (index2 = 0, quantity = keyNode.length; index2 < quantity; index2 += 1) {
        if (Array.isArray(keyNode[index2])) {
          throwError(state2, "nested arrays are not supported inside keys");
        }
        if (typeof keyNode === "object" && _class(keyNode[index2]) === "[object Object]") {
          keyNode[index2] = "[object Object]";
        }
      }
    }
    if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
      keyNode = "[object Object]";
    }
    keyNode = String(keyNode);
    if (_result === null) {
      _result = {};
    }
    if (keyTag === "tag:yaml.org,2002:merge") {
      if (Array.isArray(valueNode)) {
        for (index2 = 0, quantity = valueNode.length; index2 < quantity; index2 += 1) {
          mergeMappings(state2, _result, valueNode[index2], overridableKeys);
        }
      } else {
        mergeMappings(state2, _result, valueNode, overridableKeys);
      }
    } else {
      if (!state2.json && !_hasOwnProperty$1.call(overridableKeys, keyNode) && _hasOwnProperty$1.call(_result, keyNode)) {
        state2.line = startLine || state2.line;
        state2.lineStart = startLineStart || state2.lineStart;
        state2.position = startPos || state2.position;
        throwError(state2, "duplicated mapping key");
      }
      setProperty(_result, keyNode, valueNode);
      delete overridableKeys[keyNode];
    }
    return _result;
  }
  function readLineBreak(state2) {
    var ch;
    ch = state2.input.charCodeAt(state2.position);
    if (ch === 10) {
      state2.position++;
    } else if (ch === 13) {
      state2.position++;
      if (state2.input.charCodeAt(state2.position) === 10) {
        state2.position++;
      }
    } else {
      throwError(state2, "a line break is expected");
    }
    state2.line += 1;
    state2.lineStart = state2.position;
    state2.firstTabInLine = -1;
  }
  function skipSeparationSpace(state2, allowComments, checkIndent) {
    var lineBreaks = 0, ch = state2.input.charCodeAt(state2.position);
    while (ch !== 0) {
      while (is_WHITE_SPACE(ch)) {
        if (ch === 9 && state2.firstTabInLine === -1) {
          state2.firstTabInLine = state2.position;
        }
        ch = state2.input.charCodeAt(++state2.position);
      }
      if (allowComments && ch === 35) {
        do {
          ch = state2.input.charCodeAt(++state2.position);
        } while (ch !== 10 && ch !== 13 && ch !== 0);
      }
      if (is_EOL(ch)) {
        readLineBreak(state2);
        ch = state2.input.charCodeAt(state2.position);
        lineBreaks++;
        state2.lineIndent = 0;
        while (ch === 32) {
          state2.lineIndent++;
          ch = state2.input.charCodeAt(++state2.position);
        }
      } else {
        break;
      }
    }
    if (checkIndent !== -1 && lineBreaks !== 0 && state2.lineIndent < checkIndent) {
      throwWarning(state2, "deficient indentation");
    }
    return lineBreaks;
  }
  function testDocumentSeparator(state2) {
    var _position = state2.position, ch;
    ch = state2.input.charCodeAt(_position);
    if ((ch === 45 || ch === 46) && ch === state2.input.charCodeAt(_position + 1) && ch === state2.input.charCodeAt(_position + 2)) {
      _position += 3;
      ch = state2.input.charCodeAt(_position);
      if (ch === 0 || is_WS_OR_EOL(ch)) {
        return true;
      }
    }
    return false;
  }
  function writeFoldedLines(state2, count) {
    if (count === 1) {
      state2.result += " ";
    } else if (count > 1) {
      state2.result += common.repeat("\n", count - 1);
    }
  }
  function readPlainScalar(state2, nodeIndent, withinFlowCollection) {
    var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state2.kind, _result = state2.result, ch;
    ch = state2.input.charCodeAt(state2.position);
    if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
      return false;
    }
    if (ch === 63 || ch === 45) {
      following = state2.input.charCodeAt(state2.position + 1);
      if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
        return false;
      }
    }
    state2.kind = "scalar";
    state2.result = "";
    captureStart = captureEnd = state2.position;
    hasPendingContent = false;
    while (ch !== 0) {
      if (ch === 58) {
        following = state2.input.charCodeAt(state2.position + 1);
        if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
          break;
        }
      } else if (ch === 35) {
        preceding = state2.input.charCodeAt(state2.position - 1);
        if (is_WS_OR_EOL(preceding)) {
          break;
        }
      } else if (state2.position === state2.lineStart && testDocumentSeparator(state2) || withinFlowCollection && is_FLOW_INDICATOR(ch)) {
        break;
      } else if (is_EOL(ch)) {
        _line = state2.line;
        _lineStart = state2.lineStart;
        _lineIndent = state2.lineIndent;
        skipSeparationSpace(state2, false, -1);
        if (state2.lineIndent >= nodeIndent) {
          hasPendingContent = true;
          ch = state2.input.charCodeAt(state2.position);
          continue;
        } else {
          state2.position = captureEnd;
          state2.line = _line;
          state2.lineStart = _lineStart;
          state2.lineIndent = _lineIndent;
          break;
        }
      }
      if (hasPendingContent) {
        captureSegment(state2, captureStart, captureEnd, false);
        writeFoldedLines(state2, state2.line - _line);
        captureStart = captureEnd = state2.position;
        hasPendingContent = false;
      }
      if (!is_WHITE_SPACE(ch)) {
        captureEnd = state2.position + 1;
      }
      ch = state2.input.charCodeAt(++state2.position);
    }
    captureSegment(state2, captureStart, captureEnd, false);
    if (state2.result) {
      return true;
    }
    state2.kind = _kind;
    state2.result = _result;
    return false;
  }
  function readSingleQuotedScalar(state2, nodeIndent) {
    var ch, captureStart, captureEnd;
    ch = state2.input.charCodeAt(state2.position);
    if (ch !== 39) {
      return false;
    }
    state2.kind = "scalar";
    state2.result = "";
    state2.position++;
    captureStart = captureEnd = state2.position;
    while ((ch = state2.input.charCodeAt(state2.position)) !== 0) {
      if (ch === 39) {
        captureSegment(state2, captureStart, state2.position, true);
        ch = state2.input.charCodeAt(++state2.position);
        if (ch === 39) {
          captureStart = state2.position;
          state2.position++;
          captureEnd = state2.position;
        } else {
          return true;
        }
      } else if (is_EOL(ch)) {
        captureSegment(state2, captureStart, captureEnd, true);
        writeFoldedLines(state2, skipSeparationSpace(state2, false, nodeIndent));
        captureStart = captureEnd = state2.position;
      } else if (state2.position === state2.lineStart && testDocumentSeparator(state2)) {
        throwError(state2, "unexpected end of the document within a single quoted scalar");
      } else {
        state2.position++;
        captureEnd = state2.position;
      }
    }
    throwError(state2, "unexpected end of the stream within a single quoted scalar");
  }
  function readDoubleQuotedScalar(state2, nodeIndent) {
    var captureStart, captureEnd, hexLength, hexResult, tmp, ch;
    ch = state2.input.charCodeAt(state2.position);
    if (ch !== 34) {
      return false;
    }
    state2.kind = "scalar";
    state2.result = "";
    state2.position++;
    captureStart = captureEnd = state2.position;
    while ((ch = state2.input.charCodeAt(state2.position)) !== 0) {
      if (ch === 34) {
        captureSegment(state2, captureStart, state2.position, true);
        state2.position++;
        return true;
      } else if (ch === 92) {
        captureSegment(state2, captureStart, state2.position, true);
        ch = state2.input.charCodeAt(++state2.position);
        if (is_EOL(ch)) {
          skipSeparationSpace(state2, false, nodeIndent);
        } else if (ch < 256 && simpleEscapeCheck[ch]) {
          state2.result += simpleEscapeMap[ch];
          state2.position++;
        } else if ((tmp = escapedHexLen(ch)) > 0) {
          hexLength = tmp;
          hexResult = 0;
          for (; hexLength > 0; hexLength--) {
            ch = state2.input.charCodeAt(++state2.position);
            if ((tmp = fromHexCode(ch)) >= 0) {
              hexResult = (hexResult << 4) + tmp;
            } else {
              throwError(state2, "expected hexadecimal character");
            }
          }
          state2.result += charFromCodepoint(hexResult);
          state2.position++;
        } else {
          throwError(state2, "unknown escape sequence");
        }
        captureStart = captureEnd = state2.position;
      } else if (is_EOL(ch)) {
        captureSegment(state2, captureStart, captureEnd, true);
        writeFoldedLines(state2, skipSeparationSpace(state2, false, nodeIndent));
        captureStart = captureEnd = state2.position;
      } else if (state2.position === state2.lineStart && testDocumentSeparator(state2)) {
        throwError(state2, "unexpected end of the document within a double quoted scalar");
      } else {
        state2.position++;
        captureEnd = state2.position;
      }
    }
    throwError(state2, "unexpected end of the stream within a double quoted scalar");
  }
  function readFlowCollection(state2, nodeIndent) {
    var readNext = true, _line, _lineStart, _pos, _tag = state2.tag, _result, _anchor2 = state2.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = /* @__PURE__ */ Object.create(null), keyNode, keyTag, valueNode, ch;
    ch = state2.input.charCodeAt(state2.position);
    if (ch === 91) {
      terminator = 93;
      isMapping = false;
      _result = [];
    } else if (ch === 123) {
      terminator = 125;
      isMapping = true;
      _result = {};
    } else {
      return false;
    }
    if (state2.anchor !== null) {
      state2.anchorMap[state2.anchor] = _result;
    }
    ch = state2.input.charCodeAt(++state2.position);
    while (ch !== 0) {
      skipSeparationSpace(state2, true, nodeIndent);
      ch = state2.input.charCodeAt(state2.position);
      if (ch === terminator) {
        state2.position++;
        state2.tag = _tag;
        state2.anchor = _anchor2;
        state2.kind = isMapping ? "mapping" : "sequence";
        state2.result = _result;
        return true;
      } else if (!readNext) {
        throwError(state2, "missed comma between flow collection entries");
      } else if (ch === 44) {
        throwError(state2, "expected the node content, but found ','");
      }
      keyTag = keyNode = valueNode = null;
      isPair = isExplicitPair = false;
      if (ch === 63) {
        following = state2.input.charCodeAt(state2.position + 1);
        if (is_WS_OR_EOL(following)) {
          isPair = isExplicitPair = true;
          state2.position++;
          skipSeparationSpace(state2, true, nodeIndent);
        }
      }
      _line = state2.line;
      _lineStart = state2.lineStart;
      _pos = state2.position;
      composeNode(state2, nodeIndent, CONTEXT_FLOW_IN, false, true);
      keyTag = state2.tag;
      keyNode = state2.result;
      skipSeparationSpace(state2, true, nodeIndent);
      ch = state2.input.charCodeAt(state2.position);
      if ((isExplicitPair || state2.line === _line) && ch === 58) {
        isPair = true;
        ch = state2.input.charCodeAt(++state2.position);
        skipSeparationSpace(state2, true, nodeIndent);
        composeNode(state2, nodeIndent, CONTEXT_FLOW_IN, false, true);
        valueNode = state2.result;
      }
      if (isMapping) {
        storeMappingPair(state2, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
      } else if (isPair) {
        _result.push(storeMappingPair(state2, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
      } else {
        _result.push(keyNode);
      }
      skipSeparationSpace(state2, true, nodeIndent);
      ch = state2.input.charCodeAt(state2.position);
      if (ch === 44) {
        readNext = true;
        ch = state2.input.charCodeAt(++state2.position);
      } else {
        readNext = false;
      }
    }
    throwError(state2, "unexpected end of the stream within a flow collection");
  }
  function readBlockScalar(state2, nodeIndent) {
    var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch;
    ch = state2.input.charCodeAt(state2.position);
    if (ch === 124) {
      folding = false;
    } else if (ch === 62) {
      folding = true;
    } else {
      return false;
    }
    state2.kind = "scalar";
    state2.result = "";
    while (ch !== 0) {
      ch = state2.input.charCodeAt(++state2.position);
      if (ch === 43 || ch === 45) {
        if (CHOMPING_CLIP === chomping) {
          chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
        } else {
          throwError(state2, "repeat of a chomping mode identifier");
        }
      } else if ((tmp = fromDecimalCode(ch)) >= 0) {
        if (tmp === 0) {
          throwError(state2, "bad explicit indentation width of a block scalar; it cannot be less than one");
        } else if (!detectedIndent) {
          textIndent = nodeIndent + tmp - 1;
          detectedIndent = true;
        } else {
          throwError(state2, "repeat of an indentation width identifier");
        }
      } else {
        break;
      }
    }
    if (is_WHITE_SPACE(ch)) {
      do {
        ch = state2.input.charCodeAt(++state2.position);
      } while (is_WHITE_SPACE(ch));
      if (ch === 35) {
        do {
          ch = state2.input.charCodeAt(++state2.position);
        } while (!is_EOL(ch) && ch !== 0);
      }
    }
    while (ch !== 0) {
      readLineBreak(state2);
      state2.lineIndent = 0;
      ch = state2.input.charCodeAt(state2.position);
      while ((!detectedIndent || state2.lineIndent < textIndent) && ch === 32) {
        state2.lineIndent++;
        ch = state2.input.charCodeAt(++state2.position);
      }
      if (!detectedIndent && state2.lineIndent > textIndent) {
        textIndent = state2.lineIndent;
      }
      if (is_EOL(ch)) {
        emptyLines++;
        continue;
      }
      if (state2.lineIndent < textIndent) {
        if (chomping === CHOMPING_KEEP) {
          state2.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
        } else if (chomping === CHOMPING_CLIP) {
          if (didReadContent) {
            state2.result += "\n";
          }
        }
        break;
      }
      if (folding) {
        if (is_WHITE_SPACE(ch)) {
          atMoreIndented = true;
          state2.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
        } else if (atMoreIndented) {
          atMoreIndented = false;
          state2.result += common.repeat("\n", emptyLines + 1);
        } else if (emptyLines === 0) {
          if (didReadContent) {
            state2.result += " ";
          }
        } else {
          state2.result += common.repeat("\n", emptyLines);
        }
      } else {
        state2.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      }
      didReadContent = true;
      detectedIndent = true;
      emptyLines = 0;
      captureStart = state2.position;
      while (!is_EOL(ch) && ch !== 0) {
        ch = state2.input.charCodeAt(++state2.position);
      }
      captureSegment(state2, captureStart, state2.position, false);
    }
    return true;
  }
  function readBlockSequence(state2, nodeIndent) {
    var _line, _tag = state2.tag, _anchor2 = state2.anchor, _result = [], following, detected = false, ch;
    if (state2.firstTabInLine !== -1) return false;
    if (state2.anchor !== null) {
      state2.anchorMap[state2.anchor] = _result;
    }
    ch = state2.input.charCodeAt(state2.position);
    while (ch !== 0) {
      if (state2.firstTabInLine !== -1) {
        state2.position = state2.firstTabInLine;
        throwError(state2, "tab characters must not be used in indentation");
      }
      if (ch !== 45) {
        break;
      }
      following = state2.input.charCodeAt(state2.position + 1);
      if (!is_WS_OR_EOL(following)) {
        break;
      }
      detected = true;
      state2.position++;
      if (skipSeparationSpace(state2, true, -1)) {
        if (state2.lineIndent <= nodeIndent) {
          _result.push(null);
          ch = state2.input.charCodeAt(state2.position);
          continue;
        }
      }
      _line = state2.line;
      composeNode(state2, nodeIndent, CONTEXT_BLOCK_IN, false, true);
      _result.push(state2.result);
      skipSeparationSpace(state2, true, -1);
      ch = state2.input.charCodeAt(state2.position);
      if ((state2.line === _line || state2.lineIndent > nodeIndent) && ch !== 0) {
        throwError(state2, "bad indentation of a sequence entry");
      } else if (state2.lineIndent < nodeIndent) {
        break;
      }
    }
    if (detected) {
      state2.tag = _tag;
      state2.anchor = _anchor2;
      state2.kind = "sequence";
      state2.result = _result;
      return true;
    }
    return false;
  }
  function readBlockMapping(state2, nodeIndent, flowIndent) {
    var following, allowCompact, _line, _keyLine, _keyLineStart, _keyPos, _tag = state2.tag, _anchor2 = state2.anchor, _result = {}, overridableKeys = /* @__PURE__ */ Object.create(null), keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
    if (state2.firstTabInLine !== -1) return false;
    if (state2.anchor !== null) {
      state2.anchorMap[state2.anchor] = _result;
    }
    ch = state2.input.charCodeAt(state2.position);
    while (ch !== 0) {
      if (!atExplicitKey && state2.firstTabInLine !== -1) {
        state2.position = state2.firstTabInLine;
        throwError(state2, "tab characters must not be used in indentation");
      }
      following = state2.input.charCodeAt(state2.position + 1);
      _line = state2.line;
      if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
        if (ch === 63) {
          if (atExplicitKey) {
            storeMappingPair(state2, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
            keyTag = keyNode = valueNode = null;
          }
          detected = true;
          atExplicitKey = true;
          allowCompact = true;
        } else if (atExplicitKey) {
          atExplicitKey = false;
          allowCompact = true;
        } else {
          throwError(state2, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
        }
        state2.position += 1;
        ch = following;
      } else {
        _keyLine = state2.line;
        _keyLineStart = state2.lineStart;
        _keyPos = state2.position;
        if (!composeNode(state2, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
          break;
        }
        if (state2.line === _line) {
          ch = state2.input.charCodeAt(state2.position);
          while (is_WHITE_SPACE(ch)) {
            ch = state2.input.charCodeAt(++state2.position);
          }
          if (ch === 58) {
            ch = state2.input.charCodeAt(++state2.position);
            if (!is_WS_OR_EOL(ch)) {
              throwError(state2, "a whitespace character is expected after the key-value separator within a block mapping");
            }
            if (atExplicitKey) {
              storeMappingPair(state2, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
              keyTag = keyNode = valueNode = null;
            }
            detected = true;
            atExplicitKey = false;
            allowCompact = false;
            keyTag = state2.tag;
            keyNode = state2.result;
          } else if (detected) {
            throwError(state2, "can not read an implicit mapping pair; a colon is missed");
          } else {
            state2.tag = _tag;
            state2.anchor = _anchor2;
            return true;
          }
        } else if (detected) {
          throwError(state2, "can not read a block mapping entry; a multiline key may not be an implicit key");
        } else {
          state2.tag = _tag;
          state2.anchor = _anchor2;
          return true;
        }
      }
      if (state2.line === _line || state2.lineIndent > nodeIndent) {
        if (atExplicitKey) {
          _keyLine = state2.line;
          _keyLineStart = state2.lineStart;
          _keyPos = state2.position;
        }
        if (composeNode(state2, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
          if (atExplicitKey) {
            keyNode = state2.result;
          } else {
            valueNode = state2.result;
          }
        }
        if (!atExplicitKey) {
          storeMappingPair(state2, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
          keyTag = keyNode = valueNode = null;
        }
        skipSeparationSpace(state2, true, -1);
        ch = state2.input.charCodeAt(state2.position);
      }
      if ((state2.line === _line || state2.lineIndent > nodeIndent) && ch !== 0) {
        throwError(state2, "bad indentation of a mapping entry");
      } else if (state2.lineIndent < nodeIndent) {
        break;
      }
    }
    if (atExplicitKey) {
      storeMappingPair(state2, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
    }
    if (detected) {
      state2.tag = _tag;
      state2.anchor = _anchor2;
      state2.kind = "mapping";
      state2.result = _result;
    }
    return detected;
  }
  function readTagProperty(state2) {
    var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch;
    ch = state2.input.charCodeAt(state2.position);
    if (ch !== 33) return false;
    if (state2.tag !== null) {
      throwError(state2, "duplication of a tag property");
    }
    ch = state2.input.charCodeAt(++state2.position);
    if (ch === 60) {
      isVerbatim = true;
      ch = state2.input.charCodeAt(++state2.position);
    } else if (ch === 33) {
      isNamed = true;
      tagHandle = "!!";
      ch = state2.input.charCodeAt(++state2.position);
    } else {
      tagHandle = "!";
    }
    _position = state2.position;
    if (isVerbatim) {
      do {
        ch = state2.input.charCodeAt(++state2.position);
      } while (ch !== 0 && ch !== 62);
      if (state2.position < state2.length) {
        tagName = state2.input.slice(_position, state2.position);
        ch = state2.input.charCodeAt(++state2.position);
      } else {
        throwError(state2, "unexpected end of the stream within a verbatim tag");
      }
    } else {
      while (ch !== 0 && !is_WS_OR_EOL(ch)) {
        if (ch === 33) {
          if (!isNamed) {
            tagHandle = state2.input.slice(_position - 1, state2.position + 1);
            if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
              throwError(state2, "named tag handle cannot contain such characters");
            }
            isNamed = true;
            _position = state2.position + 1;
          } else {
            throwError(state2, "tag suffix cannot contain exclamation marks");
          }
        }
        ch = state2.input.charCodeAt(++state2.position);
      }
      tagName = state2.input.slice(_position, state2.position);
      if (PATTERN_FLOW_INDICATORS.test(tagName)) {
        throwError(state2, "tag suffix cannot contain flow indicator characters");
      }
    }
    if (tagName && !PATTERN_TAG_URI.test(tagName)) {
      throwError(state2, "tag name cannot contain such characters: " + tagName);
    }
    try {
      tagName = decodeURIComponent(tagName);
    } catch (err) {
      throwError(state2, "tag name is malformed: " + tagName);
    }
    if (isVerbatim) {
      state2.tag = tagName;
    } else if (_hasOwnProperty$1.call(state2.tagMap, tagHandle)) {
      state2.tag = state2.tagMap[tagHandle] + tagName;
    } else if (tagHandle === "!") {
      state2.tag = "!" + tagName;
    } else if (tagHandle === "!!") {
      state2.tag = "tag:yaml.org,2002:" + tagName;
    } else {
      throwError(state2, 'undeclared tag handle "' + tagHandle + '"');
    }
    return true;
  }
  function readAnchorProperty(state2) {
    var _position, ch;
    ch = state2.input.charCodeAt(state2.position);
    if (ch !== 38) return false;
    if (state2.anchor !== null) {
      throwError(state2, "duplication of an anchor property");
    }
    ch = state2.input.charCodeAt(++state2.position);
    _position = state2.position;
    while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
      ch = state2.input.charCodeAt(++state2.position);
    }
    if (state2.position === _position) {
      throwError(state2, "name of an anchor node must contain at least one character");
    }
    state2.anchor = state2.input.slice(_position, state2.position);
    return true;
  }
  function readAlias(state2) {
    var _position, alias, ch;
    ch = state2.input.charCodeAt(state2.position);
    if (ch !== 42) return false;
    ch = state2.input.charCodeAt(++state2.position);
    _position = state2.position;
    while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
      ch = state2.input.charCodeAt(++state2.position);
    }
    if (state2.position === _position) {
      throwError(state2, "name of an alias node must contain at least one character");
    }
    alias = state2.input.slice(_position, state2.position);
    if (!_hasOwnProperty$1.call(state2.anchorMap, alias)) {
      throwError(state2, 'unidentified alias "' + alias + '"');
    }
    state2.result = state2.anchorMap[alias];
    skipSeparationSpace(state2, true, -1);
    return true;
  }
  function composeNode(state2, parentIndent, nodeContext, allowToSeek, allowCompact) {
    var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, typeList, type2, flowIndent, blockIndent;
    if (state2.listener !== null) {
      state2.listener("open", state2);
    }
    state2.tag = null;
    state2.anchor = null;
    state2.kind = null;
    state2.result = null;
    allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
    if (allowToSeek) {
      if (skipSeparationSpace(state2, true, -1)) {
        atNewLine = true;
        if (state2.lineIndent > parentIndent) {
          indentStatus = 1;
        } else if (state2.lineIndent === parentIndent) {
          indentStatus = 0;
        } else if (state2.lineIndent < parentIndent) {
          indentStatus = -1;
        }
      }
    }
    if (indentStatus === 1) {
      while (readTagProperty(state2) || readAnchorProperty(state2)) {
        if (skipSeparationSpace(state2, true, -1)) {
          atNewLine = true;
          allowBlockCollections = allowBlockStyles;
          if (state2.lineIndent > parentIndent) {
            indentStatus = 1;
          } else if (state2.lineIndent === parentIndent) {
            indentStatus = 0;
          } else if (state2.lineIndent < parentIndent) {
            indentStatus = -1;
          }
        } else {
          allowBlockCollections = false;
        }
      }
    }
    if (allowBlockCollections) {
      allowBlockCollections = atNewLine || allowCompact;
    }
    if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
      if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
        flowIndent = parentIndent;
      } else {
        flowIndent = parentIndent + 1;
      }
      blockIndent = state2.position - state2.lineStart;
      if (indentStatus === 1) {
        if (allowBlockCollections && (readBlockSequence(state2, blockIndent) || readBlockMapping(state2, blockIndent, flowIndent)) || readFlowCollection(state2, flowIndent)) {
          hasContent = true;
        } else {
          if (allowBlockScalars && readBlockScalar(state2, flowIndent) || readSingleQuotedScalar(state2, flowIndent) || readDoubleQuotedScalar(state2, flowIndent)) {
            hasContent = true;
          } else if (readAlias(state2)) {
            hasContent = true;
            if (state2.tag !== null || state2.anchor !== null) {
              throwError(state2, "alias node should not have any properties");
            }
          } else if (readPlainScalar(state2, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
            hasContent = true;
            if (state2.tag === null) {
              state2.tag = "?";
            }
          }
          if (state2.anchor !== null) {
            state2.anchorMap[state2.anchor] = state2.result;
          }
        }
      } else if (indentStatus === 0) {
        hasContent = allowBlockCollections && readBlockSequence(state2, blockIndent);
      }
    }
    if (state2.tag === null) {
      if (state2.anchor !== null) {
        state2.anchorMap[state2.anchor] = state2.result;
      }
    } else if (state2.tag === "?") {
      if (state2.result !== null && state2.kind !== "scalar") {
        throwError(state2, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state2.kind + '"');
      }
      for (typeIndex = 0, typeQuantity = state2.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
        type2 = state2.implicitTypes[typeIndex];
        if (type2.resolve(state2.result)) {
          state2.result = type2.construct(state2.result);
          state2.tag = type2.tag;
          if (state2.anchor !== null) {
            state2.anchorMap[state2.anchor] = state2.result;
          }
          break;
        }
      }
    } else if (state2.tag !== "!") {
      if (_hasOwnProperty$1.call(state2.typeMap[state2.kind || "fallback"], state2.tag)) {
        type2 = state2.typeMap[state2.kind || "fallback"][state2.tag];
      } else {
        type2 = null;
        typeList = state2.typeMap.multi[state2.kind || "fallback"];
        for (typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) {
          if (state2.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
            type2 = typeList[typeIndex];
            break;
          }
        }
      }
      if (!type2) {
        throwError(state2, "unknown tag !<" + state2.tag + ">");
      }
      if (state2.result !== null && type2.kind !== state2.kind) {
        throwError(state2, "unacceptable node kind for !<" + state2.tag + '> tag; it should be "' + type2.kind + '", not "' + state2.kind + '"');
      }
      if (!type2.resolve(state2.result, state2.tag)) {
        throwError(state2, "cannot resolve a node with !<" + state2.tag + "> explicit tag");
      } else {
        state2.result = type2.construct(state2.result, state2.tag);
        if (state2.anchor !== null) {
          state2.anchorMap[state2.anchor] = state2.result;
        }
      }
    }
    if (state2.listener !== null) {
      state2.listener("close", state2);
    }
    return state2.tag !== null || state2.anchor !== null || hasContent;
  }
  function readDocument(state2) {
    var documentStart = state2.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
    state2.version = null;
    state2.checkLineBreaks = state2.legacy;
    state2.tagMap = /* @__PURE__ */ Object.create(null);
    state2.anchorMap = /* @__PURE__ */ Object.create(null);
    while ((ch = state2.input.charCodeAt(state2.position)) !== 0) {
      skipSeparationSpace(state2, true, -1);
      ch = state2.input.charCodeAt(state2.position);
      if (state2.lineIndent > 0 || ch !== 37) {
        break;
      }
      hasDirectives = true;
      ch = state2.input.charCodeAt(++state2.position);
      _position = state2.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch)) {
        ch = state2.input.charCodeAt(++state2.position);
      }
      directiveName = state2.input.slice(_position, state2.position);
      directiveArgs = [];
      if (directiveName.length < 1) {
        throwError(state2, "directive name must not be less than one character in length");
      }
      while (ch !== 0) {
        while (is_WHITE_SPACE(ch)) {
          ch = state2.input.charCodeAt(++state2.position);
        }
        if (ch === 35) {
          do {
            ch = state2.input.charCodeAt(++state2.position);
          } while (ch !== 0 && !is_EOL(ch));
          break;
        }
        if (is_EOL(ch)) break;
        _position = state2.position;
        while (ch !== 0 && !is_WS_OR_EOL(ch)) {
          ch = state2.input.charCodeAt(++state2.position);
        }
        directiveArgs.push(state2.input.slice(_position, state2.position));
      }
      if (ch !== 0) readLineBreak(state2);
      if (_hasOwnProperty$1.call(directiveHandlers, directiveName)) {
        directiveHandlers[directiveName](state2, directiveName, directiveArgs);
      } else {
        throwWarning(state2, 'unknown document directive "' + directiveName + '"');
      }
    }
    skipSeparationSpace(state2, true, -1);
    if (state2.lineIndent === 0 && state2.input.charCodeAt(state2.position) === 45 && state2.input.charCodeAt(state2.position + 1) === 45 && state2.input.charCodeAt(state2.position + 2) === 45) {
      state2.position += 3;
      skipSeparationSpace(state2, true, -1);
    } else if (hasDirectives) {
      throwError(state2, "directives end mark is expected");
    }
    composeNode(state2, state2.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
    skipSeparationSpace(state2, true, -1);
    if (state2.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state2.input.slice(documentStart, state2.position))) {
      throwWarning(state2, "non-ASCII line breaks are interpreted as content");
    }
    state2.documents.push(state2.result);
    if (state2.position === state2.lineStart && testDocumentSeparator(state2)) {
      if (state2.input.charCodeAt(state2.position) === 46) {
        state2.position += 3;
        skipSeparationSpace(state2, true, -1);
      }
      return;
    }
    if (state2.position < state2.length - 1) {
      throwError(state2, "end of the stream or a document separator is expected");
    } else {
      return;
    }
  }
  function loadDocuments(input, options) {
    input = String(input);
    options = options || {};
    if (input.length !== 0) {
      if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
        input += "\n";
      }
      if (input.charCodeAt(0) === 65279) {
        input = input.slice(1);
      }
    }
    var state2 = new State$1(input, options);
    var nullpos = input.indexOf("\0");
    if (nullpos !== -1) {
      state2.position = nullpos;
      throwError(state2, "null byte is not allowed in input");
    }
    state2.input += "\0";
    while (state2.input.charCodeAt(state2.position) === 32) {
      state2.lineIndent += 1;
      state2.position += 1;
    }
    while (state2.position < state2.length - 1) {
      readDocument(state2);
    }
    return state2.documents;
  }
  function loadAll$1(input, iterator, options) {
    if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
      options = iterator;
      iterator = null;
    }
    var documents = loadDocuments(input, options);
    if (typeof iterator !== "function") {
      return documents;
    }
    for (var index2 = 0, length = documents.length; index2 < length; index2 += 1) {
      iterator(documents[index2]);
    }
  }
  function load$1(input, options) {
    var documents = loadDocuments(input, options);
    if (documents.length === 0) {
      return void 0;
    } else if (documents.length === 1) {
      return documents[0];
    }
    throw new exception("expected a single document in the stream, but found more");
  }
  var loadAll_1 = loadAll$1;
  var load_1 = load$1;
  var loader = {
    loadAll: loadAll_1,
    load: load_1
  };
  var _toString = Object.prototype.toString;
  var _hasOwnProperty = Object.prototype.hasOwnProperty;
  var CHAR_BOM = 65279;
  var CHAR_TAB = 9;
  var CHAR_LINE_FEED = 10;
  var CHAR_CARRIAGE_RETURN = 13;
  var CHAR_SPACE = 32;
  var CHAR_EXCLAMATION = 33;
  var CHAR_DOUBLE_QUOTE = 34;
  var CHAR_SHARP = 35;
  var CHAR_PERCENT = 37;
  var CHAR_AMPERSAND = 38;
  var CHAR_SINGLE_QUOTE = 39;
  var CHAR_ASTERISK = 42;
  var CHAR_COMMA = 44;
  var CHAR_MINUS = 45;
  var CHAR_COLON = 58;
  var CHAR_EQUALS = 61;
  var CHAR_GREATER_THAN = 62;
  var CHAR_QUESTION = 63;
  var CHAR_COMMERCIAL_AT = 64;
  var CHAR_LEFT_SQUARE_BRACKET = 91;
  var CHAR_RIGHT_SQUARE_BRACKET = 93;
  var CHAR_GRAVE_ACCENT = 96;
  var CHAR_LEFT_CURLY_BRACKET = 123;
  var CHAR_VERTICAL_LINE = 124;
  var CHAR_RIGHT_CURLY_BRACKET = 125;
  var ESCAPE_SEQUENCES = {};
  ESCAPE_SEQUENCES[0] = "\\0";
  ESCAPE_SEQUENCES[7] = "\\a";
  ESCAPE_SEQUENCES[8] = "\\b";
  ESCAPE_SEQUENCES[9] = "\\t";
  ESCAPE_SEQUENCES[10] = "\\n";
  ESCAPE_SEQUENCES[11] = "\\v";
  ESCAPE_SEQUENCES[12] = "\\f";
  ESCAPE_SEQUENCES[13] = "\\r";
  ESCAPE_SEQUENCES[27] = "\\e";
  ESCAPE_SEQUENCES[34] = '\\"';
  ESCAPE_SEQUENCES[92] = "\\\\";
  ESCAPE_SEQUENCES[133] = "\\N";
  ESCAPE_SEQUENCES[160] = "\\_";
  ESCAPE_SEQUENCES[8232] = "\\L";
  ESCAPE_SEQUENCES[8233] = "\\P";
  var DEPRECATED_BOOLEANS_SYNTAX = [
    "y",
    "Y",
    "yes",
    "Yes",
    "YES",
    "on",
    "On",
    "ON",
    "n",
    "N",
    "no",
    "No",
    "NO",
    "off",
    "Off",
    "OFF"
  ];
  var DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
  function compileStyleMap(schema2, map2) {
    var result, keys, index2, length, tag2, style, type2;
    if (map2 === null) return {};
    result = {};
    keys = Object.keys(map2);
    for (index2 = 0, length = keys.length; index2 < length; index2 += 1) {
      tag2 = keys[index2];
      style = String(map2[tag2]);
      if (tag2.slice(0, 2) === "!!") {
        tag2 = "tag:yaml.org,2002:" + tag2.slice(2);
      }
      type2 = schema2.compiledTypeMap["fallback"][tag2];
      if (type2 && _hasOwnProperty.call(type2.styleAliases, style)) {
        style = type2.styleAliases[style];
      }
      result[tag2] = style;
    }
    return result;
  }
  function encodeHex(character) {
    var string, handle, length;
    string = character.toString(16).toUpperCase();
    if (character <= 255) {
      handle = "x";
      length = 2;
    } else if (character <= 65535) {
      handle = "u";
      length = 4;
    } else if (character <= 4294967295) {
      handle = "U";
      length = 8;
    } else {
      throw new exception("code point within a string may not be greater than 0xFFFFFFFF");
    }
    return "\\" + handle + common.repeat("0", length - string.length) + string;
  }
  var QUOTING_TYPE_SINGLE = 1;
  var QUOTING_TYPE_DOUBLE = 2;
  function State(options) {
    this.schema = options["schema"] || _default;
    this.indent = Math.max(1, options["indent"] || 2);
    this.noArrayIndent = options["noArrayIndent"] || false;
    this.skipInvalid = options["skipInvalid"] || false;
    this.flowLevel = common.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
    this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
    this.sortKeys = options["sortKeys"] || false;
    this.lineWidth = options["lineWidth"] || 80;
    this.noRefs = options["noRefs"] || false;
    this.noCompatMode = options["noCompatMode"] || false;
    this.condenseFlow = options["condenseFlow"] || false;
    this.quotingType = options["quotingType"] === '"' ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
    this.forceQuotes = options["forceQuotes"] || false;
    this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
    this.implicitTypes = this.schema.compiledImplicit;
    this.explicitTypes = this.schema.compiledExplicit;
    this.tag = null;
    this.result = "";
    this.duplicates = [];
    this.usedDuplicates = null;
  }
  function indentString(string, spaces) {
    var ind = common.repeat(" ", spaces), position = 0, next2 = -1, result = "", line, length = string.length;
    while (position < length) {
      next2 = string.indexOf("\n", position);
      if (next2 === -1) {
        line = string.slice(position);
        position = length;
      } else {
        line = string.slice(position, next2 + 1);
        position = next2 + 1;
      }
      if (line.length && line !== "\n") result += ind;
      result += line;
    }
    return result;
  }
  function generateNextLine(state2, level) {
    return "\n" + common.repeat(" ", state2.indent * level);
  }
  function testImplicitResolving(state2, str2) {
    var index2, length, type2;
    for (index2 = 0, length = state2.implicitTypes.length; index2 < length; index2 += 1) {
      type2 = state2.implicitTypes[index2];
      if (type2.resolve(str2)) {
        return true;
      }
    }
    return false;
  }
  function isWhitespace(c) {
    return c === CHAR_SPACE || c === CHAR_TAB;
  }
  function isPrintable(c) {
    return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== CHAR_BOM || 65536 <= c && c <= 1114111;
  }
  function isNsCharOrWhitespace(c) {
    return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
  }
  function isPlainSafe(c, prev, inblock) {
    var cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
    var cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
    return (
      // ns-plain-safe
      (inblock ? (
        // c = flow-in
        cIsNsCharOrWhitespace
      ) : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar
    );
  }
  function isPlainSafeFirst(c) {
    return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
  }
  function isPlainSafeLast(c) {
    return !isWhitespace(c) && c !== CHAR_COLON;
  }
  function codePointAt(string, pos) {
    var first = string.charCodeAt(pos), second;
    if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
      second = string.charCodeAt(pos + 1);
      if (second >= 56320 && second <= 57343) {
        return (first - 55296) * 1024 + second - 56320 + 65536;
      }
    }
    return first;
  }
  function needIndentIndicator(string) {
    var leadingSpaceRe = /^\n* /;
    return leadingSpaceRe.test(string);
  }
  var STYLE_PLAIN = 1;
  var STYLE_SINGLE = 2;
  var STYLE_LITERAL = 3;
  var STYLE_FOLDED = 4;
  var STYLE_DOUBLE = 5;
  function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
    var i;
    var char = 0;
    var prevChar = null;
    var hasLineBreak = false;
    var hasFoldableLine = false;
    var shouldTrackWidth = lineWidth !== -1;
    var previousLineBreak = -1;
    var plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
    if (singleLineOnly || forceQuotes) {
      for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
        char = codePointAt(string, i);
        if (!isPrintable(char)) {
          return STYLE_DOUBLE;
        }
        plain = plain && isPlainSafe(char, prevChar, inblock);
        prevChar = char;
      }
    } else {
      for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
        char = codePointAt(string, i);
        if (char === CHAR_LINE_FEED) {
          hasLineBreak = true;
          if (shouldTrackWidth) {
            hasFoldableLine = hasFoldableLine || // Foldable line = too long, and not more-indented.
            i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
            previousLineBreak = i;
          }
        } else if (!isPrintable(char)) {
          return STYLE_DOUBLE;
        }
        plain = plain && isPlainSafe(char, prevChar, inblock);
        prevChar = char;
      }
      hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ");
    }
    if (!hasLineBreak && !hasFoldableLine) {
      if (plain && !forceQuotes && !testAmbiguousType(string)) {
        return STYLE_PLAIN;
      }
      return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
    }
    if (indentPerLevel > 9 && needIndentIndicator(string)) {
      return STYLE_DOUBLE;
    }
    if (!forceQuotes) {
      return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
    }
    return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
  }
  function writeScalar(state2, string, level, iskey, inblock) {
    state2.dump = (function() {
      if (string.length === 0) {
        return state2.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
      }
      if (!state2.noCompatMode) {
        if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) {
          return state2.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string + '"' : "'" + string + "'";
        }
      }
      var indent = state2.indent * Math.max(1, level);
      var lineWidth = state2.lineWidth === -1 ? -1 : Math.max(Math.min(state2.lineWidth, 40), state2.lineWidth - indent);
      var singleLineOnly = iskey || state2.flowLevel > -1 && level >= state2.flowLevel;
      function testAmbiguity(string2) {
        return testImplicitResolving(state2, string2);
      }
      switch (chooseScalarStyle(
        string,
        singleLineOnly,
        state2.indent,
        lineWidth,
        testAmbiguity,
        state2.quotingType,
        state2.forceQuotes && !iskey,
        inblock
      )) {
        case STYLE_PLAIN:
          return string;
        case STYLE_SINGLE:
          return "'" + string.replace(/'/g, "''") + "'";
        case STYLE_LITERAL:
          return "|" + blockHeader(string, state2.indent) + dropEndingNewline(indentString(string, indent));
        case STYLE_FOLDED:
          return ">" + blockHeader(string, state2.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
        case STYLE_DOUBLE:
          return '"' + escapeString(string) + '"';
        default:
          throw new exception("impossible error: invalid scalar style");
      }
    })();
  }
  function blockHeader(string, indentPerLevel) {
    var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
    var clip = string[string.length - 1] === "\n";
    var keep = clip && (string[string.length - 2] === "\n" || string === "\n");
    var chomp = keep ? "+" : clip ? "" : "-";
    return indentIndicator + chomp + "\n";
  }
  function dropEndingNewline(string) {
    return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
  }
  function foldString(string, width) {
    var lineRe = /(\n+)([^\n]*)/g;
    var result = (function() {
      var nextLF = string.indexOf("\n");
      nextLF = nextLF !== -1 ? nextLF : string.length;
      lineRe.lastIndex = nextLF;
      return foldLine(string.slice(0, nextLF), width);
    })();
    var prevMoreIndented = string[0] === "\n" || string[0] === " ";
    var moreIndented;
    var match;
    while (match = lineRe.exec(string)) {
      var prefix = match[1], line = match[2];
      moreIndented = line[0] === " ";
      result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
      prevMoreIndented = moreIndented;
    }
    return result;
  }
  function foldLine(line, width) {
    if (line === "" || line[0] === " ") return line;
    var breakRe = / [^ ]/g;
    var match;
    var start = 0, end, curr = 0, next2 = 0;
    var result = "";
    while (match = breakRe.exec(line)) {
      next2 = match.index;
      if (next2 - start > width) {
        end = curr > start ? curr : next2;
        result += "\n" + line.slice(start, end);
        start = end + 1;
      }
      curr = next2;
    }
    result += "\n";
    if (line.length - start > width && curr > start) {
      result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
    } else {
      result += line.slice(start);
    }
    return result.slice(1);
  }
  function escapeString(string) {
    var result = "";
    var char = 0;
    var escapeSeq;
    for (var i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      escapeSeq = ESCAPE_SEQUENCES[char];
      if (!escapeSeq && isPrintable(char)) {
        result += string[i];
        if (char >= 65536) result += string[i + 1];
      } else {
        result += escapeSeq || encodeHex(char);
      }
    }
    return result;
  }
  function writeFlowSequence(state2, level, object) {
    var _result = "", _tag = state2.tag, index2, length, value;
    for (index2 = 0, length = object.length; index2 < length; index2 += 1) {
      value = object[index2];
      if (state2.replacer) {
        value = state2.replacer.call(object, String(index2), value);
      }
      if (writeNode(state2, level, value, false, false) || typeof value === "undefined" && writeNode(state2, level, null, false, false)) {
        if (_result !== "") _result += "," + (!state2.condenseFlow ? " " : "");
        _result += state2.dump;
      }
    }
    state2.tag = _tag;
    state2.dump = "[" + _result + "]";
  }
  function writeBlockSequence(state2, level, object, compact) {
    var _result = "", _tag = state2.tag, index2, length, value;
    for (index2 = 0, length = object.length; index2 < length; index2 += 1) {
      value = object[index2];
      if (state2.replacer) {
        value = state2.replacer.call(object, String(index2), value);
      }
      if (writeNode(state2, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state2, level + 1, null, true, true, false, true)) {
        if (!compact || _result !== "") {
          _result += generateNextLine(state2, level);
        }
        if (state2.dump && CHAR_LINE_FEED === state2.dump.charCodeAt(0)) {
          _result += "-";
        } else {
          _result += "- ";
        }
        _result += state2.dump;
      }
    }
    state2.tag = _tag;
    state2.dump = _result || "[]";
  }
  function writeFlowMapping(state2, level, object) {
    var _result = "", _tag = state2.tag, objectKeyList = Object.keys(object), index2, length, objectKey, objectValue, pairBuffer;
    for (index2 = 0, length = objectKeyList.length; index2 < length; index2 += 1) {
      pairBuffer = "";
      if (_result !== "") pairBuffer += ", ";
      if (state2.condenseFlow) pairBuffer += '"';
      objectKey = objectKeyList[index2];
      objectValue = object[objectKey];
      if (state2.replacer) {
        objectValue = state2.replacer.call(object, objectKey, objectValue);
      }
      if (!writeNode(state2, level, objectKey, false, false)) {
        continue;
      }
      if (state2.dump.length > 1024) pairBuffer += "? ";
      pairBuffer += state2.dump + (state2.condenseFlow ? '"' : "") + ":" + (state2.condenseFlow ? "" : " ");
      if (!writeNode(state2, level, objectValue, false, false)) {
        continue;
      }
      pairBuffer += state2.dump;
      _result += pairBuffer;
    }
    state2.tag = _tag;
    state2.dump = "{" + _result + "}";
  }
  function writeBlockMapping(state2, level, object, compact) {
    var _result = "", _tag = state2.tag, objectKeyList = Object.keys(object), index2, length, objectKey, objectValue, explicitPair, pairBuffer;
    if (state2.sortKeys === true) {
      objectKeyList.sort();
    } else if (typeof state2.sortKeys === "function") {
      objectKeyList.sort(state2.sortKeys);
    } else if (state2.sortKeys) {
      throw new exception("sortKeys must be a boolean or a function");
    }
    for (index2 = 0, length = objectKeyList.length; index2 < length; index2 += 1) {
      pairBuffer = "";
      if (!compact || _result !== "") {
        pairBuffer += generateNextLine(state2, level);
      }
      objectKey = objectKeyList[index2];
      objectValue = object[objectKey];
      if (state2.replacer) {
        objectValue = state2.replacer.call(object, objectKey, objectValue);
      }
      if (!writeNode(state2, level + 1, objectKey, true, true, true)) {
        continue;
      }
      explicitPair = state2.tag !== null && state2.tag !== "?" || state2.dump && state2.dump.length > 1024;
      if (explicitPair) {
        if (state2.dump && CHAR_LINE_FEED === state2.dump.charCodeAt(0)) {
          pairBuffer += "?";
        } else {
          pairBuffer += "? ";
        }
      }
      pairBuffer += state2.dump;
      if (explicitPair) {
        pairBuffer += generateNextLine(state2, level);
      }
      if (!writeNode(state2, level + 1, objectValue, true, explicitPair)) {
        continue;
      }
      if (state2.dump && CHAR_LINE_FEED === state2.dump.charCodeAt(0)) {
        pairBuffer += ":";
      } else {
        pairBuffer += ": ";
      }
      pairBuffer += state2.dump;
      _result += pairBuffer;
    }
    state2.tag = _tag;
    state2.dump = _result || "{}";
  }
  function detectType(state2, object, explicit) {
    var _result, typeList, index2, length, type2, style;
    typeList = explicit ? state2.explicitTypes : state2.implicitTypes;
    for (index2 = 0, length = typeList.length; index2 < length; index2 += 1) {
      type2 = typeList[index2];
      if ((type2.instanceOf || type2.predicate) && (!type2.instanceOf || typeof object === "object" && object instanceof type2.instanceOf) && (!type2.predicate || type2.predicate(object))) {
        if (explicit) {
          if (type2.multi && type2.representName) {
            state2.tag = type2.representName(object);
          } else {
            state2.tag = type2.tag;
          }
        } else {
          state2.tag = "?";
        }
        if (type2.represent) {
          style = state2.styleMap[type2.tag] || type2.defaultStyle;
          if (_toString.call(type2.represent) === "[object Function]") {
            _result = type2.represent(object, style);
          } else if (_hasOwnProperty.call(type2.represent, style)) {
            _result = type2.represent[style](object, style);
          } else {
            throw new exception("!<" + type2.tag + '> tag resolver accepts not "' + style + '" style');
          }
          state2.dump = _result;
        }
        return true;
      }
    }
    return false;
  }
  function writeNode(state2, level, object, block2, compact, iskey, isblockseq) {
    state2.tag = null;
    state2.dump = object;
    if (!detectType(state2, object, false)) {
      detectType(state2, object, true);
    }
    var type2 = _toString.call(state2.dump);
    var inblock = block2;
    var tagStr;
    if (block2) {
      block2 = state2.flowLevel < 0 || state2.flowLevel > level;
    }
    var objectOrArray = type2 === "[object Object]" || type2 === "[object Array]", duplicateIndex, duplicate;
    if (objectOrArray) {
      duplicateIndex = state2.duplicates.indexOf(object);
      duplicate = duplicateIndex !== -1;
    }
    if (state2.tag !== null && state2.tag !== "?" || duplicate || state2.indent !== 2 && level > 0) {
      compact = false;
    }
    if (duplicate && state2.usedDuplicates[duplicateIndex]) {
      state2.dump = "*ref_" + duplicateIndex;
    } else {
      if (objectOrArray && duplicate && !state2.usedDuplicates[duplicateIndex]) {
        state2.usedDuplicates[duplicateIndex] = true;
      }
      if (type2 === "[object Object]") {
        if (block2 && Object.keys(state2.dump).length !== 0) {
          writeBlockMapping(state2, level, state2.dump, compact);
          if (duplicate) {
            state2.dump = "&ref_" + duplicateIndex + state2.dump;
          }
        } else {
          writeFlowMapping(state2, level, state2.dump);
          if (duplicate) {
            state2.dump = "&ref_" + duplicateIndex + " " + state2.dump;
          }
        }
      } else if (type2 === "[object Array]") {
        if (block2 && state2.dump.length !== 0) {
          if (state2.noArrayIndent && !isblockseq && level > 0) {
            writeBlockSequence(state2, level - 1, state2.dump, compact);
          } else {
            writeBlockSequence(state2, level, state2.dump, compact);
          }
          if (duplicate) {
            state2.dump = "&ref_" + duplicateIndex + state2.dump;
          }
        } else {
          writeFlowSequence(state2, level, state2.dump);
          if (duplicate) {
            state2.dump = "&ref_" + duplicateIndex + " " + state2.dump;
          }
        }
      } else if (type2 === "[object String]") {
        if (state2.tag !== "?") {
          writeScalar(state2, state2.dump, level, iskey, inblock);
        }
      } else if (type2 === "[object Undefined]") {
        return false;
      } else {
        if (state2.skipInvalid) return false;
        throw new exception("unacceptable kind of an object to dump " + type2);
      }
      if (state2.tag !== null && state2.tag !== "?") {
        tagStr = encodeURI(
          state2.tag[0] === "!" ? state2.tag.slice(1) : state2.tag
        ).replace(/!/g, "%21");
        if (state2.tag[0] === "!") {
          tagStr = "!" + tagStr;
        } else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") {
          tagStr = "!!" + tagStr.slice(18);
        } else {
          tagStr = "!<" + tagStr + ">";
        }
        state2.dump = tagStr + " " + state2.dump;
      }
    }
    return true;
  }
  function getDuplicateReferences(object, state2) {
    var objects = [], duplicatesIndexes = [], index2, length;
    inspectNode(object, objects, duplicatesIndexes);
    for (index2 = 0, length = duplicatesIndexes.length; index2 < length; index2 += 1) {
      state2.duplicates.push(objects[duplicatesIndexes[index2]]);
    }
    state2.usedDuplicates = new Array(length);
  }
  function inspectNode(object, objects, duplicatesIndexes) {
    var objectKeyList, index2, length;
    if (object !== null && typeof object === "object") {
      index2 = objects.indexOf(object);
      if (index2 !== -1) {
        if (duplicatesIndexes.indexOf(index2) === -1) {
          duplicatesIndexes.push(index2);
        }
      } else {
        objects.push(object);
        if (Array.isArray(object)) {
          for (index2 = 0, length = object.length; index2 < length; index2 += 1) {
            inspectNode(object[index2], objects, duplicatesIndexes);
          }
        } else {
          objectKeyList = Object.keys(object);
          for (index2 = 0, length = objectKeyList.length; index2 < length; index2 += 1) {
            inspectNode(object[objectKeyList[index2]], objects, duplicatesIndexes);
          }
        }
      }
    }
  }
  function dump$1(input, options) {
    options = options || {};
    var state2 = new State(options);
    if (!state2.noRefs) getDuplicateReferences(input, state2);
    var value = input;
    if (state2.replacer) {
      value = state2.replacer.call({ "": value }, "", value);
    }
    if (writeNode(state2, 0, value, true, true)) return state2.dump + "\n";
    return "";
  }
  var dump_1 = dump$1;
  var dumper = {
    dump: dump_1
  };
  function renamed(from, to) {
    return function() {
      throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
    };
  }
  var load = loader.load;
  var loadAll = loader.loadAll;
  var dump = dumper.dump;
  var safeLoad = renamed("safeLoad", "load");
  var safeLoadAll = renamed("safeLoadAll", "loadAll");
  var safeDump = renamed("safeDump", "dump");

  // node_modules/@plures/praxis/dist/browser/index.js
  function defineFact(tag2) {
    return {
      tag: tag2,
      create(payload) {
        return { tag: tag2, payload };
      },
      is(fact) {
        return fact.tag === tag2;
      }
    };
  }
  function defineEvent(tag2) {
    return {
      tag: tag2,
      create(payload) {
        return { tag: tag2, payload };
      },
      is(event2) {
        return event2.tag === tag2;
      }
    };
  }
  function defineRule(options) {
    return {
      id: options.id,
      description: options.description,
      impl: options.impl,
      meta: options.meta
    };
  }
  function findEvent(events, definition) {
    return events.find(definition.is);
  }

  // src/praxis/application/features/timer.ts
  var TimerHistoryFact = defineFact(
    "TimerHistory"
  );
  var StartTimerEvent = defineEvent(
    "StartTimer"
  );
  var PauseTimerEvent = defineEvent(
    "PauseTimer"
  );
  var StopTimerEvent = defineEvent(
    "StopTimer"
  );
  var RequestTimerHistoryEvent = defineEvent(
    "RequestTimerHistory"
  );
  var TimerHistoryLoadedEvent = defineEvent(
    "TimerHistoryLoaded"
  );
  var PersistTimerHistoryEvent = defineEvent("PersistTimerHistory");
  var UpdateTimerStatusEvent = defineEvent(
    "UpdateTimerStatus"
  );
  function calculateTimerStatus(entries) {
    let accumulatedDuration = 0;
    let currentStartTimestamp;
    let activeWorkItemId;
    let isRunning = false;
    const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      if (entry.type === "start") {
        currentStartTimestamp = entry.timestamp;
        activeWorkItemId = entry.workItemId;
        isRunning = true;
      } else if (entry.type === "pause" || entry.type === "stop") {
        if (currentStartTimestamp !== void 0) {
          accumulatedDuration += entry.timestamp - currentStartTimestamp;
          currentStartTimestamp = void 0;
        }
        isRunning = false;
        if (entry.type === "stop") {
          activeWorkItemId = void 0;
        }
      }
    }
    return {
      isRunning,
      activeWorkItemId,
      currentStartTimestamp,
      accumulatedDuration
    };
  }
  var InitializeTimerRule = defineRule({
    id: "timer.initialize",
    description: "Request timer history on activation",
    meta: {
      triggers: ["ACTIVATE"]
    },
    impl: (_state, events) => {
      if (findEvent(events, ActivateEvent)) {
        return [RequestTimerHistoryEvent.create()];
      }
      return [];
    }
  });
  var TimerHistoryLoadedRule = defineRule({
    id: "timer.loaded",
    description: "Update state with loaded history",
    meta: {
      triggers: ["TimerHistoryLoaded"]
    },
    impl: (state2, events) => {
      const event2 = findEvent(events, TimerHistoryLoadedEvent);
      if (!event2) return [];
      state2.context.timerHistory.entries = event2.payload.entries;
      const status = calculateTimerStatus(state2.context.timerHistory.entries);
      return [UpdateTimerStatusEvent.create(status)];
    }
  });
  var StartTimerRule = defineRule({
    id: "timer.start",
    description: "Start the timer for a work item",
    meta: {
      triggers: ["StartTimer"]
    },
    impl: (state2, events) => {
      const event2 = findEvent(events, StartTimerEvent);
      if (!event2) return [];
      const { workItemId, timestamp: timestamp2 } = event2.payload;
      const workItemExists = state2.context.workItems.some((wi) => wi.id === workItemId);
      if (!workItemExists) {
        return [];
      }
      const history2 = state2.context.timerHistory.entries;
      const lastEntry = history2[history2.length - 1];
      if (lastEntry && lastEntry.type === "start") {
        return [];
      }
      const newEntry = {
        type: "start",
        timestamp: timestamp2,
        workItemId
      };
      state2.context.timerHistory.entries.push(newEntry);
      const status = calculateTimerStatus(state2.context.timerHistory.entries);
      return [
        PersistTimerHistoryEvent.create({ entries: state2.context.timerHistory.entries }),
        UpdateTimerStatusEvent.create(status)
      ];
    }
  });
  var PauseTimerRule = defineRule({
    id: "timer.pause",
    description: "Pause the timer",
    meta: {
      triggers: ["PauseTimer"]
    },
    impl: (state2, events) => {
      const event2 = findEvent(events, PauseTimerEvent);
      if (!event2) return [];
      const { workItemId, timestamp: timestamp2 } = event2.payload;
      const history2 = state2.context.timerHistory.entries;
      const lastEntry = history2[history2.length - 1];
      if (!lastEntry || lastEntry.type !== "start") {
        return [];
      }
      const newEntry = {
        type: "pause",
        timestamp: timestamp2,
        workItemId
      };
      state2.context.timerHistory.entries.push(newEntry);
      const status = calculateTimerStatus(state2.context.timerHistory.entries);
      return [
        PersistTimerHistoryEvent.create({ entries: state2.context.timerHistory.entries }),
        UpdateTimerStatusEvent.create(status)
      ];
    }
  });
  var StopTimerRule = defineRule({
    id: "timer.stop",
    description: "Stop the timer",
    meta: {
      triggers: ["StopTimer"]
    },
    impl: (state2, events) => {
      const event2 = findEvent(events, StopTimerEvent);
      if (!event2) return [];
      const { workItemId, timestamp: timestamp2 } = event2.payload;
      const history2 = state2.context.timerHistory.entries;
      const lastEntry = history2[history2.length - 1];
      if (!lastEntry || lastEntry.type === "stop") {
        return [];
      }
      const newEntry = {
        type: "stop",
        timestamp: timestamp2,
        workItemId
      };
      state2.context.timerHistory.entries.push(newEntry);
      const status = calculateTimerStatus(state2.context.timerHistory.entries);
      return [
        PersistTimerHistoryEvent.create({ entries: state2.context.timerHistory.entries }),
        UpdateTimerStatusEvent.create(status)
      ];
    }
  });
  var timerRules = [
    InitializeTimerRule,
    TimerHistoryLoadedRule,
    StartTimerRule,
    PauseTimerRule,
    StopTimerRule
  ];

  // src/praxis/application/facts.ts
  var ApplicationStateFact = defineFact("ApplicationState");
  var IsActivatedFact = defineFact("IsActivated");
  var IsDeactivatingFact = defineFact("IsDeactivating");
  var ConnectionsFact = defineFact("Connections");
  var ActiveConnectionIdFact = defineFact(
    "ActiveConnectionId"
  );
  var ActiveQueryFact = defineFact("ActiveQuery");
  var ViewModeFact = defineFact("ViewMode");
  var PendingWorkItemsFact = defineFact(
    "PendingWorkItems"
  );
  var DeviceCodeSessionFact = defineFact(
    "DeviceCodeSession"
  );
  var AuthCodeFlowSessionFact = defineFact("AuthCodeFlowSession");
  var ErrorRecoveryAttemptsFact = defineFact(
    "ErrorRecoveryAttempts"
  );
  var LastErrorFact = defineFact("LastError");
  var DebugLoggingEnabledFact = defineFact(
    "DebugLoggingEnabled"
  );
  var DebugViewVisibleFact = defineFact("DebugViewVisible");
  var ActivateEvent = defineEvent("ACTIVATE");
  var ActivationCompleteEvent = defineEvent(
    "ACTIVATION_COMPLETE"
  );
  var ActivationFailedEvent = defineEvent(
    "APP_ACTIVATION_FAILED"
  );
  var DeactivateEvent = defineEvent("DEACTIVATE");
  var DeactivationCompleteEvent = defineEvent("DEACTIVATION_COMPLETE");
  var ConnectionsLoadedEvent = defineEvent("CONNECTIONS_LOADED");
  var ConnectionSelectedEvent = defineEvent(
    "CONNECTION_SELECTED"
  );
  var SelectConnectionEvent = defineEvent(
    "SELECT_CONNECTION"
  );
  var QueryChangedEvent = defineEvent("QUERY_CHANGED");
  var ViewModeChangedEvent = defineEvent(
    "VIEW_MODE_CHANGED"
  );
  var WorkItemsLoadedEvent = defineEvent("WORK_ITEMS_LOADED");
  var WorkItemsErrorEvent = defineEvent("WORK_ITEMS_ERROR");
  var RefreshDataEvent = defineEvent(
    "REFRESH_DATA"
  );
  var ConnectionStateUpdatedEvent = defineEvent("CONNECTION_STATE_UPDATED");
  var DeviceCodeStartedAppEvent = defineEvent("DEVICE_CODE_STARTED");
  var DeviceCodeCompletedAppEvent = defineEvent("DEVICE_CODE_COMPLETED");
  var DeviceCodeCancelledEvent = defineEvent("DEVICE_CODE_CANCELLED");
  var SyncStateEvent = defineEvent("SyncState");
  var ApplicationErrorEvent = defineEvent("APPLICATION_ERROR");
  var DeviceCodeCopyFailedEvent = defineEvent("DEVICE_CODE_COPY_FAILED");
  var DeviceCodeBrowserOpenFailedEvent = defineEvent("DEVICE_CODE_BROWSER_OPEN_FAILED");
  var DeviceCodeSessionNotFoundEvent = defineEvent("DEVICE_CODE_SESSION_NOT_FOUND");
  var AuthCodeFlowBrowserOpenFailedEvent = defineEvent("AUTH_CODE_FLOW_BROWSER_OPEN_FAILED");
  var AuthCodeFlowBrowserOpenedEvent = defineEvent("AUTH_CODE_FLOW_BROWSER_OPENED");
  var DeviceCodeBrowserOpenedEvent = defineEvent("DEVICE_CODE_BROWSER_OPENED");
  var RetryApplicationEvent = defineEvent("RETRY");
  var ResetApplicationEvent = defineEvent("RESET");
  var ToggleDebugViewEvent = defineEvent("TOGGLE_DEBUG_VIEW");
  var OpenSettingsEvent = defineEvent(
    "OPEN_SETTINGS"
  );
  var AuthReminderRequestedEvent = defineEvent("AUTH_REMINDER_REQUESTED");
  var AuthReminderClearedEvent = defineEvent("AUTH_REMINDER_CLEARED");
  var SignInEntraEvent = defineEvent("SIGN_IN_ENTRA");
  var AuthCodeFlowStartedAppEvent = defineEvent("AUTH_CODE_FLOW_STARTED");
  var AuthCodeFlowCompletedAppEvent = defineEvent("AUTH_CODE_FLOW_COMPLETED");
  var AuthRedirectReceivedAppEvent = defineEvent("AUTH_REDIRECT_RECEIVED");
  var SignOutEntraEvent = defineEvent(
    "SIGN_OUT_ENTRA"
  );
  var AuthenticationSuccessEvent = defineEvent("AUTHENTICATION_SUCCESS");
  var AuthenticationFailedEvent = defineEvent("AUTHENTICATION_FAILED");
  var CreateWorkItemEvent = defineEvent(
    "CREATE_WORK_ITEM"
  );
  var CreateBranchEvent = defineEvent("CREATE_BRANCH");
  var CreatePullRequestEvent = defineEvent("CREATE_PULL_REQUEST");
  var ShowPullRequestsEvent = defineEvent(
    "SHOW_PULL_REQUESTS"
  );
  var ShowBuildStatusEvent = defineEvent(
    "SHOW_BUILD_STATUS"
  );
  var SelectTeamEvent = defineEvent("SELECT_TEAM");
  var ResetPreferredRepositoriesEvent = defineEvent("RESET_PREFERRED_REPOSITORIES");
  var SelfTestWebviewEvent = defineEvent(
    "SELF_TEST_WEBVIEW"
  );
  var BulkAssignEvent = defineEvent("BULK_ASSIGN");
  var GenerateCopilotPromptEvent = defineEvent("GENERATE_COPILOT_PROMPT");
  var ShowTimeReportEvent = defineEvent(
    "SHOW_TIME_REPORT"
  );
  var WebviewReadyEvent = defineEvent(
    "WEBVIEW_READY"
  );

  // src/praxis/application/rules/lifecycleRules.ts
  var activateRule = defineRule({
    id: "application.activate",
    description: "Activate the application",
    meta: {
      triggers: ["ACTIVATE"],
      transition: { from: "inactive", to: "activating" }
    },
    impl: (state2, events) => {
      const activateEvent = findEvent(events, ActivateEvent);
      if (!activateEvent) return [];
      if (state2.context.applicationState !== "inactive") return [];
      state2.context.applicationState = "activating";
      state2.context.isActivated = false;
      state2.context.isDeactivating = false;
      state2.context.errorRecoveryAttempts = 0;
      state2.context.lastError = void 0;
      return [];
    }
  });
  var activationCompleteRule = defineRule({
    id: "application.activationComplete",
    description: "Complete application activation",
    meta: {
      triggers: ["ACTIVATION_COMPLETE"],
      transition: { from: "activating", to: "active" }
    },
    impl: (state2, events) => {
      const completeEvent = findEvent(events, ActivationCompleteEvent);
      if (!completeEvent) return [];
      if (state2.context.applicationState !== "activating") return [];
      state2.context.applicationState = "active";
      state2.context.isActivated = true;
      return [];
    }
  });
  var activationFailedRule = defineRule({
    id: "application.activationFailed",
    description: "Handle activation failure",
    meta: {
      triggers: ["APP_ACTIVATION_FAILED"],
      transition: { from: "activating", to: "activation_error" }
    },
    impl: (state2, events) => {
      const failedEvent = findEvent(events, ActivationFailedEvent);
      if (!failedEvent) return [];
      if (state2.context.applicationState !== "activating") return [];
      state2.context.applicationState = "activation_error";
      state2.context.lastError = { message: failedEvent.payload.error };
      state2.context.errorRecoveryAttempts++;
      return [];
    }
  });
  var deactivateRule = defineRule({
    id: "application.deactivate",
    description: "Deactivate the application",
    meta: {
      triggers: ["DEACTIVATE"],
      transition: { from: ["inactive", "active", "activation_error"], to: "deactivating" }
    },
    impl: (state2, events) => {
      const deactivateEvent = findEvent(events, DeactivateEvent);
      if (!deactivateEvent) return [];
      if (state2.context.applicationState === "inactive") return [];
      if (state2.context.applicationState === "deactivating") return [];
      state2.context.applicationState = "deactivating";
      state2.context.isDeactivating = true;
      return [];
    }
  });
  var deactivationCompleteRule = defineRule({
    id: "application.deactivationComplete",
    description: "Complete application deactivation",
    meta: {
      triggers: ["DEACTIVATION_COMPLETE"],
      transition: { from: "deactivating", to: "inactive" }
    },
    impl: (state2, events) => {
      const completeEvent = findEvent(events, DeactivationCompleteEvent);
      if (!completeEvent) return [];
      if (state2.context.applicationState !== "deactivating") return [];
      state2.context.applicationState = "inactive";
      state2.context.isActivated = false;
      state2.context.isDeactivating = false;
      return [];
    }
  });
  var lifecycleRules = [
    activateRule,
    activationCompleteRule,
    activationFailedRule,
    deactivateRule,
    deactivationCompleteRule
  ];

  // src/praxis/application/rules/connectionRules.ts
  var connectionsLoadedRule = defineRule({
    id: "application.connectionsLoaded",
    description: "Handle connections loaded",
    meta: {
      triggers: ["CONNECTIONS_LOADED"]
    },
    impl: (state2, events) => {
      const loadedEvent = findEvent(events, ConnectionsLoadedEvent);
      if (!loadedEvent) return [];
      state2.context.connections = loadedEvent.payload.connections;
      state2.context.connectionStates = new Map(state2.context.connectionStates);
      for (const connection of loadedEvent.payload.connections) {
        if (!state2.context.connectionStates.has(connection.id)) {
          state2.context.connectionStates.set(connection.id, {
            state: "disconnected",
            connectionId: connection.id,
            isConnected: false,
            authMethod: connection.authMethod || "pat",
            hasClient: false,
            hasProvider: false,
            retryCount: 0,
            error: void 0
          });
        }
      }
      if (!state2.context.activeConnectionId && state2.context.connections.length > 0) {
        state2.context.activeConnectionId = state2.context.connections[0].id;
      }
      return [];
    }
  });
  var connectionSelectedRule = defineRule({
    id: "application.connectionSelected",
    description: "Handle connection selection",
    meta: {
      triggers: ["CONNECTION_SELECTED", "SELECT_CONNECTION"]
    },
    impl: (state2, events) => {
      const selectedEvent = findEvent(events, ConnectionSelectedEvent) || findEvent(events, SelectConnectionEvent);
      if (!selectedEvent) return [];
      const connectionId = selectedEvent.payload.connectionId;
      const connectionExists = state2.context.connections.some((c) => c.id === connectionId);
      if (!connectionExists) return [];
      state2.context.activeConnectionId = connectionId;
      const savedQuery = state2.context.connectionQueries.get(connectionId);
      if (savedQuery) {
        state2.context.activeQuery = savedQuery;
      }
      return [];
    }
  });
  var queryChangedRule = defineRule({
    id: "application.queryChanged",
    description: "Handle query change",
    meta: {
      triggers: ["QUERY_CHANGED"]
    },
    impl: (state2, events) => {
      const queryEvent = findEvent(events, QueryChangedEvent);
      if (!queryEvent) return [];
      const { query, connectionId } = queryEvent.payload;
      const targetConnectionId = connectionId || state2.context.activeConnectionId;
      state2.context.activeQuery = query;
      if (targetConnectionId) {
        const existingQuery = state2.context.connectionQueries.get(targetConnectionId);
        if (existingQuery !== query) {
          state2.context.connectionQueries = new Map(state2.context.connectionQueries);
          state2.context.connectionQueries.set(targetConnectionId, query);
        }
      }
      return [];
    }
  });
  var viewModeChangedRule = defineRule({
    id: "application.viewModeChanged",
    description: "Handle view mode change",
    meta: {
      triggers: ["VIEW_MODE_CHANGED"],
      transition: { from: "active", to: "active" }
    },
    impl: (state2, events) => {
      const modeEvent = findEvent(events, ViewModeChangedEvent);
      if (!modeEvent) return [];
      state2.context.viewMode = modeEvent.payload.viewMode;
      if (state2.context.activeConnectionId) {
        const existingMode = state2.context.connectionViewModes.get(state2.context.activeConnectionId);
        if (existingMode !== modeEvent.payload.viewMode) {
          state2.context.connectionViewModes = new Map(state2.context.connectionViewModes);
          state2.context.connectionViewModes.set(
            state2.context.activeConnectionId,
            modeEvent.payload.viewMode
          );
        }
      }
      return [];
    }
  });
  var authenticationFailedRule = defineRule({
    id: "application.authenticationFailed",
    description: "Handle authentication failure",
    meta: {
      triggers: ["AUTHENTICATION_FAILED"]
    },
    impl: (state2, events) => {
      const failedEvent = findEvent(events, AuthenticationFailedEvent);
      if (!failedEvent) return [];
      const { connectionId, error } = failedEvent.payload;
      state2.context.lastError = {
        message: error,
        connectionId
      };
      const existingReminder = state2.context.pendingAuthReminders.get(connectionId);
      const newReminder = {
        connectionId,
        reason: error,
        status: "pending"
      };
      if (!existingReminder || existingReminder.reason !== newReminder.reason || existingReminder.status !== newReminder.status) {
        state2.context.pendingAuthReminders = new Map(state2.context.pendingAuthReminders);
        state2.context.pendingAuthReminders.set(connectionId, newReminder);
      }
      const existingState = state2.context.connectionStates.get(connectionId);
      if (existingState) {
        const updatedState = {
          ...existingState,
          state: "auth_failed",
          error,
          isConnected: false
        };
        if (existingState.state !== updatedState.state || existingState.error !== updatedState.error || existingState.isConnected !== updatedState.isConnected) {
          state2.context.connectionStates = new Map(state2.context.connectionStates);
          state2.context.connectionStates.set(connectionId, updatedState);
        }
      } else {
        const connection = state2.context.connections.find((c) => c.id === connectionId);
        if (connection) {
          state2.context.connectionStates = new Map(state2.context.connectionStates);
          state2.context.connectionStates.set(connectionId, {
            state: "auth_failed",
            connectionId,
            isConnected: false,
            authMethod: connection.authMethod || "pat",
            hasClient: false,
            hasProvider: false,
            error,
            retryCount: 0
          });
        }
      }
      return [];
    }
  });
  var connectionStateUpdatedRule = defineRule({
    id: "application.connectionStateUpdated",
    description: "Update connection state from external source",
    meta: {
      triggers: ["CONNECTION_STATE_UPDATED"]
    },
    impl: (state2, events) => {
      const event2 = findEvent(events, ConnectionStateUpdatedEvent);
      if (!event2) return [];
      const { connectionId, state: connState } = event2.payload;
      const status = connState.status || "disconnected";
      const isConnected = status === "connected";
      const praxisState = isConnected ? "connected" : "disconnected";
      const snapshot2 = {
        state: praxisState,
        connectionId,
        isConnected,
        authMethod: connState.authMethod || "pat",
        hasClient: !!connState.client,
        hasProvider: !!connState.provider,
        retryCount: 0,
        error: void 0
      };
      const existingSnapshot = state2.context.connectionStates.get(connectionId);
      if (!existingSnapshot || JSON.stringify(existingSnapshot) !== JSON.stringify(snapshot2)) {
        state2.context.connectionStates = new Map(state2.context.connectionStates);
        state2.context.connectionStates.set(connectionId, snapshot2);
      }
      return [];
    }
  });
  var connectionRules = [
    connectionsLoadedRule,
    connectionSelectedRule,
    queryChangedRule,
    viewModeChangedRule,
    connectionStateUpdatedRule,
    authenticationFailedRule
  ];

  // src/praxis/application/types.ts
  var DEFAULT_APPLICATION_CONFIG = {
    clock: { now: () => Date.now() },
    isActivated: false,
    isDeactivating: false,
    connections: [],
    connectionStates: /* @__PURE__ */ new Map(),
    connectionQueries: /* @__PURE__ */ new Map(),
    connectionWorkItems: /* @__PURE__ */ new Map(),
    connectionFilters: /* @__PURE__ */ new Map(),
    connectionViewModes: /* @__PURE__ */ new Map(),
    pendingAuthReminders: /* @__PURE__ */ new Map(),
    viewMode: "list",
    kanbanColumns: [],
    errorRecoveryAttempts: 0,
    debugLoggingEnabled: false,
    debugViewVisible: false,
    debugTraceLog: [],
    ui: {
      notification: null,
      dialog: null
    }
  };

  // src/logging/ComponentLogger.ts
  var vscode = null;
  async function getVscode() {
    if (vscode) return vscode;
    try {
      if (typeof window === "undefined") {
        vscode = await import("vscode");
      }
    } catch {
    }
    return vscode;
  }
  var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
    LogLevel2[LogLevel2["DEBUG"] = 0] = "DEBUG";
    LogLevel2[LogLevel2["INFO"] = 1] = "INFO";
    LogLevel2[LogLevel2["WARN"] = 2] = "WARN";
    LogLevel2[LogLevel2["ERROR"] = 3] = "ERROR";
    LogLevel2[LogLevel2["OFF"] = 4] = "OFF";
    return LogLevel2;
  })(LogLevel || {});
  var LOG_LEVEL_NAMES = {
    [0 /* DEBUG */]: "DEBUG",
    [1 /* INFO */]: "INFO",
    [2 /* WARN */]: "WARN",
    [3 /* ERROR */]: "ERROR",
    [4 /* OFF */]: "OFF"
  };
  var Component = /* @__PURE__ */ ((Component2) => {
    Component2["APPLICATION"] = "APPLICATION";
    Component2["CONNECTION"] = "CONNECTION";
    Component2["TIMER"] = "TIMER";
    Component2["WEBVIEW"] = "WEBVIEW";
    Component2["AUTH"] = "AUTH";
    Component2["DATA"] = "DATA";
    Component2["ADAPTER"] = "ADAPTER";
    Component2["MACHINE"] = "MACHINE";
    return Component2;
  })(Component || {});
  var DEFAULT_CONFIG = {
    enabled: true,
    level: 0 /* DEBUG */,
    // More verbose logging by default
    components: {
      ["APPLICATION" /* APPLICATION */]: true,
      ["CONNECTION" /* CONNECTION */]: true,
      ["TIMER" /* TIMER */]: true,
      ["WEBVIEW" /* WEBVIEW */]: true,
      // Enable webview logging
      ["AUTH" /* AUTH */]: true,
      ["DATA" /* DATA */]: true,
      // Enable data logging
      ["ADAPTER" /* ADAPTER */]: true,
      // Enable adapter logging
      ["MACHINE" /* MACHINE */]: true
      // Enable machine logging
    },
    destinations: {
      console: true,
      outputChannel: true,
      file: false
    },
    includeTimestamp: true,
    includeStackTrace: false,
    maxLogEntries: 1e3,
    contextTracking: true
  };
  var _ComponentLogger = class _ComponentLogger {
    constructor() {
      __publicField(this, "config", DEFAULT_CONFIG);
      __publicField(this, "logBuffer", []);
      __publicField(this, "outputChannel");
      __publicField(this, "logCounter", 0);
      __publicField(this, "configListeners", []);
      __publicField(this, "logListeners", []);
      void getVscode();
      this.loadConfiguration();
    }
    static getInstance() {
      if (!_ComponentLogger.instance) {
        _ComponentLogger.instance = new _ComponentLogger();
      }
      return _ComponentLogger.instance;
    }
    // ============================================================================
    // CONFIGURATION MANAGEMENT
    // ============================================================================
    loadConfiguration() {
      try {
        if (typeof vscode !== "undefined" && vscode?.workspace) {
          const vscodeConfig = vscode.workspace.getConfiguration("azureDevOpsIntegration.logging");
          this.config = {
            enabled: vscodeConfig.get("enabled", DEFAULT_CONFIG.enabled),
            level: vscodeConfig.get("level", DEFAULT_CONFIG.level),
            components: {
              ...DEFAULT_CONFIG.components,
              ...vscodeConfig.get("components", {})
            },
            destinations: {
              ...DEFAULT_CONFIG.destinations,
              ...vscodeConfig.get("destinations", {})
            },
            includeTimestamp: vscodeConfig.get("includeTimestamp", DEFAULT_CONFIG.includeTimestamp),
            includeStackTrace: vscodeConfig.get(
              "includeStackTrace",
              DEFAULT_CONFIG.includeStackTrace
            ),
            maxLogEntries: vscodeConfig.get("maxLogEntries", DEFAULT_CONFIG.maxLogEntries),
            contextTracking: vscodeConfig.get("contextTracking", DEFAULT_CONFIG.contextTracking)
          };
        } else {
          this.config = { ...DEFAULT_CONFIG };
        }
        this.configListeners.forEach((listener) => listener(this.config));
      } catch (error) {
        this.config = { ...DEFAULT_CONFIG };
      }
    }
    updateConfiguration(updates) {
      this.config = { ...this.config, ...updates };
      this.configListeners.forEach((listener) => listener(this.config));
      try {
        if (typeof vscode !== "undefined" && vscode?.workspace) {
          const vscodeConfig = vscode.workspace.getConfiguration("azureDevOpsIntegration.logging");
          Object.entries(updates).forEach(([key2, value]) => {
            vscodeConfig.update(key2, value, vscode.ConfigurationTarget.Global);
          });
        }
      } catch (error) {
      }
    }
    onConfigurationChange(listener) {
      this.configListeners.push(listener);
      if (vscode && vscode.Disposable) {
        return new vscode.Disposable(() => {
          const index2 = this.configListeners.indexOf(listener);
          if (index2 >= 0) {
            this.configListeners.splice(index2, 1);
          }
        });
      } else {
        return {
          dispose: () => {
            const index2 = this.configListeners.indexOf(listener);
            if (index2 >= 0) {
              this.configListeners.splice(index2, 1);
            }
          }
        };
      }
    }
    onLogEntry(listener) {
      this.logListeners.push(listener);
      if (vscode && vscode.Disposable) {
        return new vscode.Disposable(() => {
          const index2 = this.logListeners.indexOf(listener);
          if (index2 >= 0) {
            this.logListeners.splice(index2, 1);
          }
        });
      } else {
        return {
          dispose: () => {
            const index2 = this.logListeners.indexOf(listener);
            if (index2 >= 0) {
              this.logListeners.splice(index2, 1);
            }
          }
        };
      }
    }
    // ============================================================================
    // OUTPUT CHANNEL MANAGEMENT
    // ============================================================================
    getOutputChannel() {
      if (!this.outputChannel) {
        if (typeof vscode !== "undefined" && vscode?.window) {
          this.outputChannel = vscode.window.createOutputChannel("Azure DevOps Int (Praxis)");
        } else {
          return null;
        }
      }
      return this.outputChannel;
    }
    // ============================================================================
    // CORE LOGGING METHODS
    // ============================================================================
    shouldLog(level, component2) {
      if (!this.config.enabled) return false;
      if (level < this.config.level) return false;
      if (!this.config.components[component2]) return false;
      return true;
    }
    createLogEntry(level, component2, message, context, data) {
      const entry = {
        id: `log_${++this.logCounter}`,
        timestamp: Date.now(),
        level,
        component: component2,
        message,
        context: this.config.contextTracking ? context : void 0,
        data
      };
      if (this.config.includeStackTrace && level >= 2 /* WARN */) {
        entry.stackTrace = new Error().stack;
      }
      return entry;
    }
    formatLogEntry(entry) {
      const timestamp2 = this.config.includeTimestamp ? new Date(entry.timestamp).toISOString() : "";
      const level = LOG_LEVEL_NAMES[entry.level].padEnd(5);
      const component2 = `[${entry.component}]`.padEnd(12);
      let contextStr = "";
      if (entry.context) {
        const parts = [];
        if (entry.context.instanceId) parts.push(`id:${entry.context.instanceId}`);
        if (entry.context.connectionId) parts.push(`conn:${entry.context.connectionId}`);
        if (entry.context.state) parts.push(`state:${entry.context.state}`);
        if (entry.context.event) parts.push(`event:${entry.context.event}`);
        if (entry.context.machineId) parts.push(`machine:${entry.context.machineId}`);
        if (parts.length > 0) {
          contextStr = `{${parts.join(", ")}} `;
        }
      }
      let formatted = `${timestamp2} ${level} ${component2} ${contextStr}${entry.message}`;
      if (entry.data) {
        formatted += `
  Data: ${JSON.stringify(entry.data, null, 2)}`;
      }
      if (entry.stackTrace && this.config.includeStackTrace) {
        formatted += `
  Stack: ${entry.stackTrace}`;
      }
      return formatted;
    }
    writeToDestinations(entry) {
      const formatted = this.formatLogEntry(entry);
      this.logListeners.forEach((listener) => {
        try {
          listener(entry);
        } catch (e) {
        }
      });
      if (this.config.destinations.console) {
        const levelName = LOG_LEVEL_NAMES[entry.level];
        switch (levelName) {
          case "ERROR":
            console.error(formatted);
            break;
          case "WARN":
            console.warn(formatted);
            break;
          case "INFO":
            console.info(formatted);
            break;
          case "DEBUG":
          case "TRACE":
            if (typeof console.debug === "function") {
              console.debug(formatted);
            } else {
              console.log(formatted);
            }
            break;
          default:
            console.log(formatted);
            break;
        }
      }
      if (this.config.destinations.outputChannel) {
        const outputChannel2 = this.getOutputChannel();
        if (outputChannel2) {
          outputChannel2.appendLine(formatted);
        }
      }
      if (this.config.destinations.file) {
      }
    }
    addToBuffer(entry) {
      this.logBuffer.push(entry);
      if (this.logBuffer.length > this.config.maxLogEntries) {
        this.logBuffer = this.logBuffer.slice(-this.config.maxLogEntries);
      }
    }
    log(level, component2, message, context, data) {
      if (!this.shouldLog(level, component2)) return;
      const entry = this.createLogEntry(level, component2, message, context, data);
      this.addToBuffer(entry);
      this.writeToDestinations(entry);
    }
    // ============================================================================
    // PUBLIC LOGGING API
    // ============================================================================
    debug(component2, message, context, data) {
      this.log(0 /* DEBUG */, component2, message, context, data);
    }
    info(component2, message, context, data) {
      this.log(1 /* INFO */, component2, message, context, data);
    }
    warn(component2, message, context, data) {
      this.log(2 /* WARN */, component2, message, context, data);
    }
    error(component2, message, context, data) {
      this.log(3 /* ERROR */, component2, message, context, data);
    }
    // ============================================================================
    // COMPONENT-SPECIFIC LOGGING HELPERS
    // ============================================================================
    logStateTransition(component2, instanceId, fromState, toState, event2, machineId) {
      this.info(component2, `State transition: ${fromState} \u2192 ${toState}`, {
        component: component2,
        instanceId,
        state: toState,
        event: event2,
        machineId
      });
    }
    logEvent(component2, instanceId, event2, currentState, machineId, data) {
      this.debug(
        component2,
        `Event: ${event2}`,
        {
          component: component2,
          instanceId,
          state: currentState,
          event: event2,
          machineId
        },
        data
      );
    }
    logError(component2, instanceId, error, currentState, machineId) {
      this.error(
        component2,
        `Error: ${error.message}`,
        {
          component: component2,
          instanceId,
          state: currentState,
          machineId
        },
        { error: error.stack }
      );
    }
    logConnectionActivity(connectionId, activity, state2, data) {
      this.info(
        "CONNECTION" /* CONNECTION */,
        activity,
        {
          component: "CONNECTION" /* CONNECTION */,
          connectionId,
          state: state2
        },
        data
      );
    }
    // ============================================================================
    // UTILITY METHODS
    // ============================================================================
    getLogBuffer() {
      return [...this.logBuffer];
    }
    clearLogBuffer() {
      this.logBuffer = [];
    }
    exportLogs() {
      return this.logBuffer.map((entry) => this.formatLogEntry(entry)).join("\n");
    }
    getConfiguration() {
      return { ...this.config };
    }
    showOutputChannel() {
      const outputChannel2 = this.getOutputChannel();
      if (outputChannel2) {
        outputChannel2.show(true);
      }
    }
    getStats() {
      const stats = {
        totalEntries: this.logBuffer.length,
        entriesByLevel: {},
        entriesByComponent: {}
      };
      Object.values(LogLevel).forEach((level) => {
        if (typeof level === "number") {
          stats.entriesByLevel[level] = 0;
        }
      });
      Object.values(Component).forEach((component2) => {
        stats.entriesByComponent[component2] = 0;
      });
      this.logBuffer.forEach((entry) => {
        stats.entriesByLevel[entry.level]++;
        stats.entriesByComponent[entry.component]++;
      });
      return stats;
    }
  };
  __publicField(_ComponentLogger, "instance");
  var ComponentLogger = _ComponentLogger;
  var componentLogger = ComponentLogger.getInstance();

  // src/logging/TraceLogger.ts
  var _TraceLogger = class _TraceLogger {
    constructor() {
      __publicField(this, "sessions", /* @__PURE__ */ new Map());
      __publicField(this, "currentSession");
      __publicField(this, "isRecording", false);
      __publicField(this, "traceCounter", 0);
      __publicField(this, "maxEntriesPerSession", 1e4);
      __publicField(this, "subscribedActors", /* @__PURE__ */ new Map());
      this.startNewSession("Praxis Extension Startup");
    }
    static getInstance() {
      if (!_TraceLogger.instance) {
        _TraceLogger.instance = new _TraceLogger();
      }
      return _TraceLogger.instance;
    }
    // ============================================================================
    // SESSION MANAGEMENT
    // ============================================================================
    startNewSession(description) {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (this.currentSession) {
        this.currentSession.endTime = Date.now();
      }
      this.currentSession = {
        id: sessionId,
        startTime: Date.now(),
        description: description || "Praxis Trace Session",
        entries: [],
        metadata: {
          extensionVersion: process.env.npm_package_version,
          nodeVersion: process.version
        }
      };
      this.sessions.set(sessionId, this.currentSession);
      this.isRecording = true;
      componentLogger.info("MACHINE" /* MACHINE */, `New trace session started: ${sessionId}`, {
        component: "MACHINE" /* MACHINE */,
        machineId: sessionId
      });
      return sessionId;
    }
    stopCurrentSession() {
      if (this.currentSession) {
        this.currentSession.endTime = Date.now();
        this.isRecording = false;
        componentLogger.info(
          "MACHINE" /* MACHINE */,
          `Trace session ended: ${this.currentSession.id}`,
          {
            component: "MACHINE" /* MACHINE */,
            machineId: this.currentSession.id
          },
          {
            duration: this.currentSession.endTime - this.currentSession.startTime,
            entriesCount: this.currentSession.entries.length
          }
        );
      }
    }
    getCurrentSession() {
      return this.currentSession;
    }
    getSession(sessionId) {
      return this.sessions.get(sessionId);
    }
    getAllSessions() {
      return Array.from(this.sessions.values());
    }
    // ============================================================================
    // PRAXIS-COMPATIBLE ACTOR INSTRUMENTATION
    // ============================================================================
    /**
     * Instrument a Praxis manager or engine for tracing.
     * This is a no-op that returns a cleanup function for compatibility.
     * For actual tracing, use logEvent() directly.
     */
    instrumentActor(_actor, component2, machineId) {
      if (!this.isRecording || !this.currentSession) {
        return () => {
        };
      }
      const actorId = `${component2}_${machineId || "default"}_${Date.now()}`;
      componentLogger.debug("MACHINE" /* MACHINE */, `Actor registered for tracing: ${actorId}`, {
        component: component2,
        machineId
      });
      const cleanup = () => {
        this.subscribedActors.delete(actorId);
      };
      this.subscribedActors.set(actorId, cleanup);
      return cleanup;
    }
    /**
     * Log an event from a Praxis engine or manager.
     * This is the main method for recording events in Praxis-based systems.
     */
    logEvent(data) {
      if (!this.isRecording || !this.currentSession) return;
      const entry = {
        id: `trace_${++this.traceCounter}`,
        timestamp: data.timestamp,
        sessionId: this.currentSession.id,
        machineId: data.machineId,
        actorId: `${data.component}_${data.machineId}`,
        component: data.component,
        event: { type: data.eventType, payload: data.data },
        eventType: data.eventType,
        fromState: data.fromState || "unknown",
        toState: data.toState || "unknown",
        contextBefore: null,
        contextAfter: data.context,
        error: data.error
      };
      this.addTraceEntry(entry);
    }
    addTraceEntry(entry) {
      if (!this.currentSession) return;
      this.currentSession.entries.push(entry);
      if (this.currentSession.entries.length > this.maxEntriesPerSession) {
        this.currentSession.entries = this.currentSession.entries.slice(-this.maxEntriesPerSession);
      }
      if (entry.eventType !== "TICK" && entry.eventType !== "HEARTBEAT") {
        componentLogger.debug(
          "MACHINE" /* MACHINE */,
          `Praxis Event: ${entry.eventType}`,
          {
            component: entry.component,
            machineId: entry.machineId,
            state: entry.toState,
            event: entry.eventType
          },
          {
            fromState: entry.fromState,
            toState: entry.toState,
            contextChanged: JSON.stringify(entry.contextBefore) !== JSON.stringify(entry.contextAfter)
          }
        );
      }
    }
    // ============================================================================
    // REPLAY FUNCTIONALITY
    // ============================================================================
    async replaySession(sessionId, _targetActor, options = {}) {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }
      const {
        startFromEntry = 0,
        endAtEntry = session.entries.length - 1,
        stepMode = false,
        delayMs = 100,
        skipErrors = false,
        onStateChange,
        onError
      } = options;
      componentLogger.info(
        "MACHINE" /* MACHINE */,
        `Starting replay of session: ${sessionId}`,
        {
          component: "MACHINE" /* MACHINE */,
          machineId: sessionId
        },
        {
          totalEntries: session.entries.length,
          startFrom: startFromEntry,
          endAt: endAtEntry
        }
      );
      const entriesToReplay = session.entries.slice(startFromEntry, endAtEntry + 1);
      for (let i = 0; i < entriesToReplay.length; i++) {
        const entry = entriesToReplay[i];
        try {
          onStateChange?.(entry);
          if (!stepMode && delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          } else if (stepMode) {
            await this.waitForStep();
          }
        } catch (error) {
          if (skipErrors) {
            componentLogger.warn("MACHINE" /* MACHINE */, `Replay error skipped: ${error}`, {
              component: "MACHINE" /* MACHINE */,
              machineId: sessionId
            });
            onError?.(entry, error);
          } else {
            throw error;
          }
        }
      }
      componentLogger.info("MACHINE" /* MACHINE */, `Replay completed for session: ${sessionId}`);
    }
    async waitForStep() {
      return new Promise((resolve) => setTimeout(resolve, 1e3));
    }
    // ============================================================================
    // EXPORT/IMPORT FUNCTIONALITY
    // ============================================================================
    exportSession(sessionId) {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }
      return JSON.stringify(session, null, 2);
    }
    exportAllSessions() {
      const allSessions = Object.fromEntries(this.sessions);
      return JSON.stringify(allSessions, null, 2);
    }
    importSession(sessionData) {
      try {
        const session = JSON.parse(sessionData);
        if (!session.id || !session.entries || !Array.isArray(session.entries)) {
          throw new Error("Invalid session data format");
        }
        this.sessions.set(session.id, session);
        componentLogger.info(
          "MACHINE" /* MACHINE */,
          `Session imported: ${session.id}`,
          {
            component: "MACHINE" /* MACHINE */,
            machineId: session.id
          },
          {
            entriesCount: session.entries.length,
            originalStartTime: session.startTime
          }
        );
        return session.id;
      } catch (error) {
        throw new Error(`Failed to import session: ${error}`);
      }
    }
    // ============================================================================
    // ANALYSIS FUNCTIONALITY
    // ============================================================================
    analyzeSession(sessionId) {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }
      const entries = session.entries;
      const { eventFrequency, stateTransitions, uniqueStates, transitions, errors } = this.summarizeEntries(entries);
      const avgTransitionTime = transitions.length > 0 ? transitions.reduce((sum, t) => sum + t.duration, 0) / transitions.length : 0;
      const slowestTransitions = transitions.sort((a, b) => b.duration - a.duration).slice(0, 10);
      return {
        summary: {
          duration: (session.endTime || Date.now()) - session.startTime,
          totalEvents: entries.length,
          uniqueStates: uniqueStates.size,
          errors
        },
        eventFrequency,
        stateTransitions,
        performance: {
          avgTransitionTime,
          slowestTransitions
        }
      };
    }
    summarizeEntries(entries) {
      const eventFrequency = {};
      const stateTransitions = {};
      const uniqueStates = /* @__PURE__ */ new Set();
      const transitions = [];
      let errors = 0;
      entries.forEach((entry, index2) => {
        eventFrequency[entry.eventType] = (eventFrequency[entry.eventType] || 0) + 1;
        uniqueStates.add(entry.fromState);
        uniqueStates.add(entry.toState);
        if (!stateTransitions[entry.fromState]) {
          stateTransitions[entry.fromState] = [];
        }
        if (!stateTransitions[entry.fromState].includes(entry.toState)) {
          stateTransitions[entry.fromState].push(entry.toState);
        }
        if (entry.error) {
          errors++;
        }
        if (index2 > 0) {
          const duration = entry.timestamp - entries[index2 - 1].timestamp;
          transitions.push({
            from: entry.fromState,
            to: entry.toState,
            event: entry.eventType,
            duration
          });
        }
      });
      return { eventFrequency, stateTransitions, uniqueStates, transitions, errors };
    }
    // ============================================================================
    // UTILITY METHODS
    // ============================================================================
    cleanup() {
      this.subscribedActors.forEach((cleanup) => cleanup());
      this.subscribedActors.clear();
      this.stopCurrentSession();
      componentLogger.info("MACHINE" /* MACHINE */, "Trace Logger cleaned up");
    }
    getStats() {
      return {
        sessionsCount: this.sessions.size,
        totalEntries: Array.from(this.sessions.values()).reduce(
          (sum, session) => sum + session.entries.length,
          0
        ),
        currentSessionEntries: this.currentSession?.entries.length || 0,
        instrumentedActors: this.subscribedActors.size
      };
    }
  };
  __publicField(_TraceLogger, "instance");
  var TraceLogger = _TraceLogger;
  var _traceLogger = TraceLogger.getInstance();

  // src/praxis/application/engine.ts
  var defaultClock = { now: () => Date.now() };
  function getClock(_state) {
    return defaultClock;
  }

  // src/praxis/application/rules/workItemRules.ts
  var workItemsLoadedRule = defineRule({
    id: "application.workItemsLoaded",
    description: "Handle work items loaded",
    meta: {
      triggers: ["WORK_ITEMS_LOADED"]
    },
    impl: (state2, events) => {
      const loadedEvent = findEvent(events, WorkItemsLoadedEvent);
      if (!loadedEvent) return [];
      const { workItems, connectionId, query } = loadedEvent.payload;
      state2.context.pendingWorkItems = {
        workItems,
        connectionId,
        query,
        timestamp: getClock(state2).now()
      };
      const existingWorkItems = state2.context.connectionWorkItems.get(connectionId);
      if (existingWorkItems !== workItems) {
        state2.context.connectionWorkItems = new Map(state2.context.connectionWorkItems);
        state2.context.connectionWorkItems.set(connectionId, workItems);
      }
      if (state2.context.lastError?.connectionId === connectionId) {
        state2.context.lastError = void 0;
      }
      return [];
    }
  });
  var workItemsErrorRule = defineRule({
    id: "application.workItemsError",
    description: "Handle work items error",
    meta: {
      triggers: ["WORK_ITEMS_ERROR"]
    },
    impl: (state2, events) => {
      const errorEvent = findEvent(events, WorkItemsErrorEvent);
      if (!errorEvent) return [];
      const { error, connectionId } = errorEvent.payload;
      state2.context.lastError = {
        message: error,
        connectionId
      };
      return [];
    }
  });
  var workItemRules = [workItemsLoadedRule, workItemsErrorRule];

  // src/praxis/application/rules/miscRules.ts
  var deviceCodeStartedRule = defineRule({
    id: "application.deviceCodeStarted",
    description: "Handle device code flow started",
    meta: {
      triggers: ["DEVICE_CODE_STARTED"]
    },
    impl: (state2, events) => {
      const startedEvent = findEvent(events, DeviceCodeStartedAppEvent);
      if (!startedEvent) return [];
      const { connectionId, userCode, verificationUri, expiresInSeconds } = startedEvent.payload;
      const now = getClock(state2).now();
      state2.context.deviceCodeSession = {
        connectionId,
        userCode,
        verificationUri,
        startedAt: now,
        expiresAt: now + expiresInSeconds * 1e3,
        expiresInSeconds
      };
      return [];
    }
  });
  var deviceCodeCompletedRule = defineRule({
    id: "application.deviceCodeCompleted",
    description: "Handle device code flow completed",
    meta: {
      triggers: ["DEVICE_CODE_COMPLETED"]
    },
    impl: (state2, events) => {
      const completedEvent = findEvent(events, DeviceCodeCompletedAppEvent);
      if (!completedEvent) return [];
      if (state2.context.deviceCodeSession?.connectionId === completedEvent.payload.connectionId) {
        state2.context.deviceCodeSession = void 0;
      }
      return [];
    }
  });
  var deviceCodeCancelledRule = defineRule({
    id: "application.deviceCodeCancelled",
    description: "Handle device code flow cancelled",
    meta: {
      triggers: ["DEVICE_CODE_CANCELLED"]
    },
    impl: (state2, events) => {
      const cancelledEvent = findEvent(events, DeviceCodeCancelledEvent);
      if (!cancelledEvent) return [];
      if (state2.context.deviceCodeSession?.connectionId === cancelledEvent.payload.connectionId) {
        state2.context.deviceCodeSession = void 0;
      }
      return [];
    }
  });
  var authCodeFlowStartedRule = defineRule({
    id: "application.authCodeFlowStarted",
    description: "Handle authorization code flow with PKCE started",
    meta: {
      triggers: ["AUTH_CODE_FLOW_STARTED"]
    },
    impl: (state2, events) => {
      const startedEvent = findEvent(events, AuthCodeFlowStartedAppEvent);
      if (!startedEvent) return [];
      const { connectionId, authorizationUrl, expiresInSeconds } = startedEvent.payload;
      const now = getClock(state2).now();
      state2.context.authCodeFlowSession = {
        connectionId,
        authorizationUrl,
        startedAt: now,
        expiresAt: now + expiresInSeconds * 1e3,
        expiresInSeconds
      };
      return [];
    }
  });
  var authCodeFlowCompletedRule = defineRule({
    id: "application.authCodeFlowCompleted",
    description: "Handle authorization code flow with PKCE completed",
    meta: {
      triggers: ["AUTH_CODE_FLOW_COMPLETED"]
    },
    impl: (state2, events) => {
      const completedEvent = findEvent(events, AuthCodeFlowCompletedAppEvent);
      if (!completedEvent) return [];
      if (state2.context.authCodeFlowSession?.connectionId === completedEvent.payload.connectionId) {
        state2.context.authCodeFlowSession = void 0;
      }
      return [];
    }
  });
  var applicationErrorRule = defineRule({
    id: "application.error",
    description: "Handle application error",
    meta: {
      triggers: ["APPLICATION_ERROR"]
    },
    impl: (state2, events) => {
      const errorEvent = findEvent(events, ApplicationErrorEvent);
      if (!errorEvent) return [];
      state2.context.lastError = {
        message: errorEvent.payload.error,
        connectionId: errorEvent.payload.connectionId
      };
      return [];
    }
  });
  var retryRule = defineRule({
    id: "application.retry",
    description: "Retry after error",
    meta: {
      triggers: ["RETRY"],
      transition: { from: ["error_recovery", "activation_error"], to: "active" }
    },
    impl: (state2, events) => {
      const retryEvent = findEvent(events, RetryApplicationEvent);
      if (!retryEvent) return [];
      if (state2.context.applicationState !== "error_recovery" && state2.context.applicationState !== "activation_error")
        return [];
      state2.context.lastError = void 0;
      state2.context.applicationState = "active";
      return [];
    }
  });
  var resetRule = defineRule({
    id: "application.reset",
    description: "Reset application state",
    meta: {
      triggers: ["RESET"],
      transition: { from: "*", to: "inactive" }
    },
    impl: (state2, events) => {
      const resetEvent = findEvent(events, ResetApplicationEvent);
      if (!resetEvent) return [];
      state2.context.applicationState = "inactive";
      state2.context.isActivated = false;
      state2.context.isDeactivating = false;
      state2.context.lastError = void 0;
      state2.context.errorRecoveryAttempts = 0;
      state2.context.deviceCodeSession = void 0;
      state2.context.authCodeFlowSession = void 0;
      state2.context.pendingWorkItems = void 0;
      return [];
    }
  });
  var toggleDebugViewRule = defineRule({
    id: "application.toggleDebugView",
    description: "Toggle debug view visibility",
    meta: {
      triggers: ["TOGGLE_DEBUG_VIEW"]
    },
    impl: (state2, events) => {
      const toggleEvent = findEvent(events, ToggleDebugViewEvent);
      if (!toggleEvent) return [];
      if (toggleEvent.payload.debugViewVisible !== void 0) {
        state2.context.debugViewVisible = toggleEvent.payload.debugViewVisible;
      } else {
        state2.context.debugViewVisible = !state2.context.debugViewVisible;
      }
      return [];
    }
  });
  var authReminderRequestedRule = defineRule({
    id: "application.authReminderRequested",
    description: "Handle authentication reminder request",
    meta: {
      triggers: ["AUTH_REMINDER_REQUESTED"]
    },
    impl: (state2, events) => {
      const reminderEvent = findEvent(events, AuthReminderRequestedEvent);
      if (!reminderEvent) return [];
      const { connectionId, reason, detail } = reminderEvent.payload;
      const existing = state2.context.pendingAuthReminders.get(connectionId);
      const newValue = {
        connectionId,
        reason: detail || reason,
        status: "pending"
      };
      if (!existing || existing.reason !== newValue.reason || existing.status !== newValue.status) {
        state2.context.pendingAuthReminders = new Map(state2.context.pendingAuthReminders);
        state2.context.pendingAuthReminders.set(connectionId, newValue);
      }
      return [];
    }
  });
  var authReminderClearedRule = defineRule({
    id: "application.authReminderCleared",
    description: "Handle authentication reminder cleared",
    meta: {
      triggers: ["AUTH_REMINDER_CLEARED"]
    },
    impl: (state2, events) => {
      const clearedEvent = findEvent(events, AuthReminderClearedEvent);
      if (!clearedEvent) return [];
      if (state2.context.pendingAuthReminders.has(clearedEvent.payload.connectionId)) {
        state2.context.pendingAuthReminders = new Map(state2.context.pendingAuthReminders);
        state2.context.pendingAuthReminders.delete(clearedEvent.payload.connectionId);
      }
      return [];
    }
  });
  var authenticationSuccessRule = defineRule({
    id: "application.authenticationSuccess",
    description: "Handle authentication success",
    meta: {
      triggers: ["AUTHENTICATION_SUCCESS"]
    },
    impl: (state2, events) => {
      const successEvent = findEvent(events, AuthenticationSuccessEvent);
      if (!successEvent) return [];
      const { connectionId } = successEvent.payload;
      if (state2.context.pendingAuthReminders.has(connectionId)) {
        state2.context.pendingAuthReminders = new Map(state2.context.pendingAuthReminders);
        state2.context.pendingAuthReminders.delete(connectionId);
      }
      if (state2.context.deviceCodeSession?.connectionId === connectionId) {
        state2.context.deviceCodeSession = void 0;
      }
      if (state2.context.authCodeFlowSession?.connectionId === connectionId) {
        state2.context.authCodeFlowSession = void 0;
      }
      if (state2.context.lastError?.connectionId === connectionId) {
        state2.context.lastError = void 0;
      }
      return [];
    }
  });
  var miscRules = [
    // Device code
    deviceCodeStartedRule,
    deviceCodeCompletedRule,
    deviceCodeCancelledRule,
    // Auth code flow
    authCodeFlowStartedRule,
    authCodeFlowCompletedRule,
    // Error handling
    applicationErrorRule,
    retryRule,
    resetRule,
    // Debug
    toggleDebugViewRule,
    // Auth reminders
    authReminderRequestedRule,
    authReminderClearedRule,
    authenticationSuccessRule
  ];

  // src/praxis/application/rules/index.ts
  var applicationRules = [
    ...lifecycleRules,
    ...connectionRules,
    ...workItemRules,
    ...miscRules,
    ...timerRules
  ];

  // src/webview/praxis/frontendEngine.ts
  var initialContext = {
    ...DEFAULT_APPLICATION_CONFIG,
    applicationState: "inactive",
    applicationData: { ...DEFAULT_APPLICATION_CONFIG },
    timerHistory: { entries: [] },
    isActivated: false,
    isDeactivating: false,
    connections: [],
    viewMode: "list",
    errorRecoveryAttempts: 0,
    debugLoggingEnabled: false,
    debugViewVisible: false,
    connectionStates: /* @__PURE__ */ new Map(),
    connectionWorkItems: /* @__PURE__ */ new Map()
  };
  var registry = new PraxisRegistry();
  for (const rule of applicationRules) {
    registry.registerRule(rule);
  }
  var frontendEngine = createPraxisEngine({
    initialContext,
    registry
  });

  // src/webview/praxis/store.ts
  var historyEngine = createHistoryEngine(frontendEngine, {
    maxHistorySize: 50
    // Keep last 50 state snapshots
  });
  var rawStore = createPraxisStore(historyEngine.engine);
  var dispatchWithSync = (events, label) => {
    historyEngine.dispatch(events, label);
    const historyEntries = historyEngine.getHistory();
    currentHistoryIndex = historyEntries.length - 1;
    if (typeof window.__historyTestRecorder !== "undefined") {
      const recorder = window.__historyTestRecorder;
      if (recorder && typeof recorder.recordEvent === "function") {
        for (const event2 of events) {
          recorder.recordEvent(event2, label);
        }
      }
    }
    const hasSyncState = events.some((e) => e.tag === "SyncState");
    if (hasSyncState) {
      return;
    }
    const vscode2 = window.__vscodeApi;
    if (vscode2) {
      vscode2.postMessage({ type: "PRAXIS_EVENT", events });
    } else {
    }
  };
  var praxisStore = {
    subscribe: rawStore.subscribe,
    dispatch: dispatchWithSync
  };
  var currentHistoryIndex = 0;
  var initHistory = () => {
    const historyEntries = historyEngine.getHistory();
    if (historyEntries.length > 0) {
      currentHistoryIndex = historyEntries.length - 1;
    }
  };
  initHistory();
  var history = {
    undo: () => {
      if (!historyEngine.canUndo()) {
        return false;
      }
      const historyEntries = historyEngine.getHistory();
      if (currentHistoryIndex > 0) {
        currentHistoryIndex--;
        const entry = historyEntries[currentHistoryIndex];
        if (entry && entry.state && entry.state.context) {
          if (typeof frontendEngine.updateContext === "function") {
            const contextToRestore = entry.state.context;
            frontendEngine.updateContext(() => contextToRestore);
            return true;
          }
        }
      }
      return false;
    },
    redo: () => {
      if (!historyEngine.canRedo()) {
        return false;
      }
      const historyEntries = historyEngine.getHistory();
      if (currentHistoryIndex < historyEntries.length - 1) {
        currentHistoryIndex++;
        const entry = historyEntries[currentHistoryIndex];
        if (entry && entry.state && entry.state.context) {
          if (typeof frontendEngine.updateContext === "function") {
            const contextToRestore = entry.state.context;
            frontendEngine.updateContext(() => contextToRestore);
            return true;
          }
        }
      }
      return false;
    },
    canUndo: () => currentHistoryIndex > 0,
    canRedo: () => {
      const historyEntries = historyEngine.getHistory();
      return currentHistoryIndex < historyEntries.length - 1;
    },
    getHistory: () => historyEngine.getHistory(),
    goToHistory: (index2) => {
      const historyEntries = historyEngine.getHistory();
      if (index2 >= 0 && index2 < historyEntries.length) {
        const entry = historyEntries[index2];
        if (entry && entry.state && entry.state.context) {
          currentHistoryIndex = index2;
          if (typeof frontendEngine.updateContext === "function") {
            const contextToRestore = entry.state.context;
            frontendEngine.updateContext(() => contextToRestore);
            return true;
          }
        }
      }
      return false;
    },
    clearHistory: () => {
      historyEngine.clearHistory();
      currentHistoryIndex = 0;
      initHistory();
    }
  };

  // src/webview/praxisSnapshotStore.ts
  var applicationSnapshot = writable({
    value: "initializing",
    context: {},
    matches: { initializing: true }
  });

  // node_modules/svelte/src/internal/flags/legacy.js
  enable_legacy_mode_flag();

  // src/webview/selection.writer.internal.ts
  var webviewOwner = {};
  function createSelectConnection(_owner, id) {
    return {
      type: "SELECT_CONNECTION",
      origin: "webview",
      payload: {
        id,
        timestamp: Date.now(),
        correlationId: createCorrelationId()
      }
    };
  }
  function createCorrelationId() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // src/webview/components/ConnectionTabs.svelte
  ConnectionTabs[FILENAME] = "src/webview/components/ConnectionTabs.svelte";
  var root_1 = add_locations(from_html(`<button role="tab"> </button>`), ConnectionTabs[FILENAME], [[102, 4]]);
  var root = add_locations(from_html(`<div class="connection-tabs tab-bar svelte-2w6d2o" role="tablist" aria-label="Project Connections" aria-orientation="horizontal" tabindex="0"></div>`), ConnectionTabs[FILENAME], [[93, 0]]);
  function ConnectionTabs($$anchor, $$props) {
    check_target(new.target);
    push($$props, false, ConnectionTabs);
    const selectedIndex = mutable_source();
    let connections = prop($$props, "connections", 24, () => []);
    let activeConnectionId = prop($$props, "activeConnectionId", 8);
    const vscode2 = window.__vscodeApi;
    let ordered = mutable_source([]);
    let tabRefs = [];
    function tabRef(node, i) {
      tabRefs[i] = node;
      return {
        update(newIndex) {
          tabRefs[newIndex] = node;
        },
        destroy() {
          tabRefs[i] = void 0;
        }
      };
    }
    function select(id) {
      if (!vscode2) return;
      const evt = createSelectConnection(webviewOwner, id);
      vscode2.postMessage({ type: "fsmEvent", event: evt });
    }
    function focusIndex(i) {
      const target = tabRefs[i];
      if (target) {
        setTimeout(() => target.focus(), 0);
      }
    }
    function handleKeydown(e) {
      if (!get(ordered).length) return;
      const key2 = e.key;
      let nextIndex = get(selectedIndex) < 0 ? 0 : get(selectedIndex);
      const last = get(ordered).length - 1;
      if (strict_equals(key2, "ArrowRight") || strict_equals(key2, "ArrowDown")) {
        nextIndex = (get(selectedIndex) + 1) % get(ordered).length;
      } else if (strict_equals(key2, "ArrowLeft") || strict_equals(key2, "ArrowUp")) {
        nextIndex = (get(selectedIndex) - 1 + get(ordered).length) % get(ordered).length;
      } else if (strict_equals(key2, "Home")) {
        nextIndex = 0;
      } else if (strict_equals(key2, "End")) {
        nextIndex = last;
      } else {
        return;
      }
      e.preventDefault();
      const target = get(ordered)[nextIndex];
      if (target) {
        select(target.id);
        focusIndex(nextIndex);
      }
    }
    legacy_pre_effect(() => deep_read_state(connections()), () => {
      set(ordered, (connections() || []).slice().sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id)));
    });
    legacy_pre_effect(() => (get(ordered), deep_read_state(activeConnectionId())), () => {
      set(selectedIndex, get(ordered).findIndex((c) => strict_equals(c.id, activeConnectionId())));
    });
    legacy_pre_effect_reset();
    var $$exports = { ...legacy_api() };
    init();
    var div = root();
    div.__keydown = handleKeydown;
    add_svelte_meta(
      () => each(div, 5, () => get(ordered), index, ($$anchor2, c, i) => {
        var button = root_1();
        button.__click = () => select(get(c).id);
        var text2 = child(button, true);
        reset(button);
        action(button, ($$node, $$action_arg) => tabRef?.($$node, $$action_arg), () => i);
        template_effect(() => {
          set_attribute2(button, "aria-selected", (get(c), deep_read_state(activeConnectionId()), untrack(() => strict_equals(get(c).id, activeConnectionId()))));
          set_attribute2(button, "tabindex", (get(c), deep_read_state(activeConnectionId()), untrack(() => strict_equals(get(c).id, activeConnectionId()) ? 0 : -1)));
          set_class(
            button,
            1,
            clsx2((get(c), deep_read_state(activeConnectionId()), untrack(() => strict_equals(get(c).id, activeConnectionId()) ? "connection-tab tab active" : "connection-tab tab"))),
            "svelte-2w6d2o"
          );
          set_text(text2, (get(c), untrack(() => get(c).label || get(c).id)));
        });
        append($$anchor2, button);
      }),
      "each",
      ConnectionTabs,
      101,
      2
    );
    reset(div);
    append($$anchor, div);
    return pop($$exports);
  }
  delegate(["keydown", "click"]);

  // src/webview/components/Dropdown.svelte
  Dropdown[FILENAME] = "src/webview/components/Dropdown.svelte";
  var root_2 = add_locations(from_html(`<button type="button" role="option"> </button>`), Dropdown[FILENAME], [[99, 8]]);
  var root_12 = add_locations(from_html(`<div class="dropdown-menu svelte-y8wbtj" role="listbox"></div>`), Dropdown[FILENAME], [[97, 4]]);
  var root2 = add_locations(from_html(`<div data-custom-dropdown="true"><button type="button" class="dropdown-button svelte-y8wbtj" aria-haspopup="listbox"><span class="dropdown-label svelte-y8wbtj"> </span> <span>\u25BC</span></button> <!></div>`), Dropdown[FILENAME], [[83, 0, [[84, 2, [[93, 4], [94, 4]]]]]]);
  function Dropdown($$anchor, $$props) {
    check_target(new.target);
    push($$props, true, Dropdown);
    const className = prop($$props, "class", 3, "");
    let isOpen = tag(state(false), "isOpen");
    let dropdownRef = tag(state(null), "dropdownRef");
    let buttonRef = tag(state(null), "buttonRef");
    const selectedOption = tag(user_derived(() => $$props.options.find((opt) => strict_equals(opt.value, $$props.value)) || $$props.options[0] || { value: "", label: $$props.placeholder || "Select..." }), "selectedOption");
    function toggle() {
      set(isOpen, !get(isOpen));
    }
    function select(optionValue) {
      $$props.onChange(optionValue);
      set(isOpen, false);
    }
    function handleClickOutside(event2) {
      if (get(dropdownRef) && !get(dropdownRef).contains(event2.target)) {
        set(isOpen, false);
      }
    }
    function handleKeydown(event2) {
      if (strict_equals(event2.key, "Escape")) {
        set(isOpen, false);
        get(buttonRef)?.focus();
      } else if (strict_equals(event2.key, "ArrowDown") || strict_equals(event2.key, "ArrowUp")) {
        event2.preventDefault();
        const currentIndex = $$props.options.findIndex((opt) => strict_equals(opt.value, $$props.value));
        let nextIndex = currentIndex;
        if (strict_equals(event2.key, "ArrowDown")) {
          nextIndex = currentIndex < $$props.options.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : $$props.options.length - 1;
        }
        if (nextIndex >= 0 && nextIndex < $$props.options.length) {
          select($$props.options[nextIndex].value);
        }
      } else if (strict_equals(event2.key, "Enter") || strict_equals(event2.key, " ")) {
        event2.preventDefault();
        toggle();
      }
    }
    user_effect(() => {
      if (get(isOpen)) {
        document.addEventListener("click", handleClickOutside);
        return () => {
          document.removeEventListener("click", handleClickOutside);
        };
      }
    });
    var $$exports = { ...legacy_api() };
    var div = root2();
    var button = child(div);
    button.__click = toggle;
    button.__keydown = handleKeydown;
    var span = child(button);
    var text2 = child(span, true);
    reset(span);
    var span_1 = sibling(span, 2);
    let classes;
    reset(button);
    bind_this(button, ($$value) => set(buttonRef, $$value), () => get(buttonRef));
    var node = sibling(button, 2);
    {
      var consequent = ($$anchor2) => {
        var div_1 = root_12();
        validate_each_keys(() => $$props.options, (option) => option.value);
        add_svelte_meta(
          () => each(div_1, 21, () => $$props.options, (option) => option.value, ($$anchor3, option) => {
            var button_1 = root_2();
            let classes_1;
            button_1.__click = () => select(get(option).value);
            var text_1 = child(button_1, true);
            reset(button_1);
            template_effect(() => {
              classes_1 = set_class(button_1, 1, "dropdown-option svelte-y8wbtj", null, classes_1, {
                selected: strict_equals(get(option).value, $$props.value)
              });
              set_attribute2(button_1, "aria-selected", strict_equals(get(option).value, $$props.value));
              set_text(text_1, get(option).label);
            });
            append($$anchor3, button_1);
          }),
          "each",
          Dropdown,
          98,
          6
        );
        reset(div_1);
        append($$anchor2, div_1);
      };
      add_svelte_meta(
        () => if_block(node, ($$render) => {
          if (get(isOpen)) $$render(consequent);
        }),
        "if",
        Dropdown,
        96,
        2
      );
    }
    reset(div);
    bind_this(div, ($$value) => set(dropdownRef, $$value), () => get(dropdownRef));
    template_effect(() => {
      set_class(div, 1, `custom-dropdown ${className() ?? ""}`, "svelte-y8wbtj");
      set_attribute2(button, "aria-expanded", get(isOpen));
      set_text(text2, get(selectedOption).label);
      classes = set_class(span_1, 1, "dropdown-arrow svelte-y8wbtj", null, classes, { open: get(isOpen) });
    });
    append($$anchor, div);
    return pop($$exports);
  }
  delegate(["click", "keydown"]);

  // src/webview/components/ErrorBanner.svelte
  ErrorBanner[FILENAME] = "src/webview/components/ErrorBanner.svelte";
  var root_22 = add_locations(from_html(`<span class="error-hint svelte-1ju6edo">Please update your credentials to continue.</span>`), ErrorBanner[FILENAME], [[56, 10]]);
  var root_4 = add_locations(from_html(`<span class="error-hint svelte-1ju6edo">Check your internet connection and try again.</span>`), ErrorBanner[FILENAME], [[58, 10]]);
  var root_5 = add_locations(from_html(`<button class="action-button primary svelte-1ju6edo"> </button>`), ErrorBanner[FILENAME], [[64, 8]]);
  var root_6 = add_locations(from_html(`<button class="action-button secondary svelte-1ju6edo" title="Dismiss">\u2715</button>`), ErrorBanner[FILENAME], [[69, 8]]);
  var root_13 = add_locations(from_html(`<div class="error-banner svelte-1ju6edo" role="alert"><div class="error-content svelte-1ju6edo"><span class="error-icon svelte-1ju6edo">\u26A0\uFE0F</span> <div class="error-message svelte-1ju6edo"><strong class="svelte-1ju6edo"> </strong> <!></div></div> <div class="error-actions svelte-1ju6edo"><!> <!></div></div>`), ErrorBanner[FILENAME], [[50, 2, [[51, 4, [[52, 6], [53, 6, [[54, 8]]]]], [62, 4]]]]);
  function ErrorBanner($$anchor, $$props) {
    check_target(new.target);
    push($$props, true, ErrorBanner);
    function handleAction() {
      if (strict_equals($$props.error.type, "authentication") && $$props.onFixAuth) {
        $$props.onFixAuth();
      } else if ($$props.onRetry) {
        $$props.onRetry();
      }
    }
    function getActionLabel() {
      if ($$props.error.suggestedAction) {
        return $$props.error.suggestedAction;
      }
      if (strict_equals($$props.error.type, "authentication")) {
        return "Fix Authentication";
      }
      return "Retry";
    }
    var $$exports = { ...legacy_api() };
    var fragment = comment();
    var node = first_child(fragment);
    {
      var consequent_4 = ($$anchor2) => {
        var div = root_13();
        var div_1 = child(div);
        var div_2 = sibling(child(div_1), 2);
        var strong = child(div_2);
        var text2 = child(strong, true);
        reset(strong);
        var node_1 = sibling(strong, 2);
        {
          var consequent = ($$anchor3) => {
            var span = root_22();
            append($$anchor3, span);
          };
          var alternate = ($$anchor3) => {
            var fragment_1 = comment();
            var node_2 = first_child(fragment_1);
            {
              var consequent_1 = ($$anchor4) => {
                var span_1 = root_4();
                append($$anchor4, span_1);
              };
              add_svelte_meta(
                () => if_block(
                  node_2,
                  ($$render) => {
                    if (strict_equals($$props.error.type, "network")) $$render(consequent_1);
                  },
                  true
                ),
                "if",
                ErrorBanner,
                57,
                8
              );
            }
            append($$anchor3, fragment_1);
          };
          add_svelte_meta(
            () => if_block(node_1, ($$render) => {
              if (strict_equals($$props.error.type, "authentication")) $$render(consequent);
              else $$render(alternate, false);
            }),
            "if",
            ErrorBanner,
            55,
            8
          );
        }
        reset(div_2);
        reset(div_1);
        var div_3 = sibling(div_1, 2);
        var node_3 = child(div_3);
        {
          var consequent_2 = ($$anchor3) => {
            var button = root_5();
            button.__click = handleAction;
            var text_1 = child(button, true);
            reset(button);
            template_effect(($0) => set_text(text_1, $0), [getActionLabel]);
            append($$anchor3, button);
          };
          add_svelte_meta(
            () => if_block(node_3, ($$render) => {
              if ($$props.error.recoverable) $$render(consequent_2);
            }),
            "if",
            ErrorBanner,
            63,
            6
          );
        }
        var node_4 = sibling(node_3, 2);
        {
          var consequent_3 = ($$anchor3) => {
            var button_1 = root_6();
            button_1.__click = function(...$$args) {
              apply(() => $$props.onDismiss, this, $$args, ErrorBanner, [69, 57]);
            };
            append($$anchor3, button_1);
          };
          add_svelte_meta(
            () => if_block(node_4, ($$render) => {
              if ($$props.onDismiss) $$render(consequent_3);
            }),
            "if",
            ErrorBanner,
            68,
            6
          );
        }
        reset(div_3);
        reset(div);
        template_effect(() => set_text(text2, $$props.error.message));
        append($$anchor2, div);
      };
      add_svelte_meta(
        () => if_block(node, ($$render) => {
          if ($$props.error) $$render(consequent_4);
        }),
        "if",
        ErrorBanner,
        49,
        0
      );
    }
    append($$anchor, fragment);
    return pop($$exports);
  }
  delegate(["click"]);

  // src/webview/components/EmptyState.svelte
  EmptyState[FILENAME] = "src/webview/components/EmptyState.svelte";
  var root_23 = add_locations(from_html(`<button class="empty-state-action svelte-qlco7a"> </button>`), EmptyState[FILENAME], [[56, 8]]);
  var root_14 = add_locations(from_html(`<div class="empty-state-content error svelte-qlco7a"><div class="empty-state-icon svelte-qlco7a">\u26A0\uFE0F</div> <h3 class="empty-state-title svelte-qlco7a">Unable to load work items</h3> <p class="empty-state-message svelte-qlco7a"> </p> <!></div>`), EmptyState[FILENAME], [[51, 4, [[52, 6], [53, 6], [54, 6]]]]);
  var root_3 = add_locations(from_html(`<div class="empty-state-content svelte-qlco7a"><div class="empty-state-icon svelte-qlco7a">\u{1F4CB}</div> <h3 class="empty-state-title svelte-qlco7a">No work items</h3> <p class="empty-state-message svelte-qlco7a">Select a query or connection to view work items.</p></div>`), EmptyState[FILENAME], [[62, 4, [[63, 6], [64, 6], [65, 6]]]]);
  var root3 = add_locations(from_html(`<div class="empty-state svelte-qlco7a"><!></div>`), EmptyState[FILENAME], [[49, 0]]);
  function EmptyState($$anchor, $$props) {
    check_target(new.target);
    push($$props, true, EmptyState);
    function handleAction() {
      if (strict_equals($$props.error?.type, "authentication") && $$props.onFixAuth) {
        $$props.onFixAuth();
      } else if ($$props.onRetry) {
        $$props.onRetry();
      }
    }
    function getActionLabel() {
      if ($$props.error?.suggestedAction) {
        return $$props.error.suggestedAction;
      }
      if (strict_equals($$props.error?.type, "authentication")) {
        return "Re-authenticate";
      }
      return "Retry";
    }
    var $$exports = { ...legacy_api() };
    var div = root3();
    var node = child(div);
    {
      var consequent_1 = ($$anchor2) => {
        var div_1 = root_14();
        var p = sibling(child(div_1), 4);
        var text2 = child(p, true);
        reset(p);
        var node_1 = sibling(p, 2);
        {
          var consequent = ($$anchor3) => {
            var button = root_23();
            button.__click = handleAction;
            var text_1 = child(button, true);
            reset(button);
            template_effect(($0) => set_text(text_1, $0), [getActionLabel]);
            append($$anchor3, button);
          };
          add_svelte_meta(
            () => if_block(node_1, ($$render) => {
              if ($$props.error.recoverable) $$render(consequent);
            }),
            "if",
            EmptyState,
            55,
            6
          );
        }
        reset(div_1);
        template_effect(() => set_text(text2, $$props.error.message));
        append($$anchor2, div_1);
      };
      var alternate = ($$anchor2) => {
        var div_2 = root_3();
        append($$anchor2, div_2);
      };
      add_svelte_meta(
        () => if_block(node, ($$render) => {
          if ($$props.hasError && $$props.error) $$render(consequent_1);
          else $$render(alternate, false);
        }),
        "if",
        EmptyState,
        50,
        2
      );
    }
    reset(div);
    append($$anchor, div);
    return pop($$exports);
  }
  delegate(["click"]);

  // src/webview/components/WorkItemList.svelte
  WorkItemList[FILENAME] = "src/webview/components/WorkItemList.svelte";
  var root_15 = add_locations(from_html(`<div class="empty-state svelte-1uil3z2"><p class="svelte-1uil3z2">No active connection selected.</p> <p class="hint svelte-1uil3z2">Configure a connection in settings to get started.</p></div>`), WorkItemList[FILENAME], [[259, 4, [[260, 6], [261, 6]]]]);
  var root_32 = add_locations(from_html(`<div class="query-selector-bar svelte-1uil3z2"><label for="query-select" class="query-label svelte-1uil3z2">Query:</label> <!></div>`), WorkItemList[FILENAME], [[266, 6, [[267, 8]]]]);
  var root_52 = add_locations(from_html(`<div class="loading-indicator svelte-1uil3z2"><div class="loading-spinner svelte-1uil3z2"></div> <p class="svelte-1uil3z2">Loading work items...</p></div>`), WorkItemList[FILENAME], [[327, 8, [[328, 10], [329, 10]]]]);
  var root_62 = add_locations(from_html(`<div class="loading-spinner-container svelte-1uil3z2"><div class="loading-spinner small svelte-1uil3z2"></div></div>`), WorkItemList[FILENAME], [[333, 8, [[334, 10]]]]);
  var root_10 = add_locations(from_html(`<div class="empty-state svelte-1uil3z2"><p class="svelte-1uil3z2">No items match your filters.</p> <button class="svelte-1uil3z2">Clear Filters</button></div>`), WorkItemList[FILENAME], [[363, 6, [[364, 8], [365, 8]]]]);
  var root_132 = add_locations(from_html(`<span class="meta-badge assignee svelte-1uil3z2"> </span>`), WorkItemList[FILENAME], [[403, 18]]);
  var root_142 = add_locations(from_html(`<span class="meta-badge timer-badge svelte-1uil3z2" title="Timer Active" role="button" tabindex="0"><span class="codicon svelte-1uil3z2">\u23F1</span> </span>`), WorkItemList[FILENAME], [[409, 18, [[417, 20]]]]);
  var root_122 = add_locations(from_html(`<div class="work-item-card svelte-1uil3z2"><div class="card-header svelte-1uil3z2"><span class="type-icon svelte-1uil3z2"> </span> <span class="item-id svelte-1uil3z2"> </span> <span> </span></div> <div class="card-body svelte-1uil3z2"><div class="item-title svelte-1uil3z2"> </div> <div class="item-meta svelte-1uil3z2"><span class="meta-badge type svelte-1uil3z2"> </span> <span> </span> <!> <!></div> <div class="item-actions svelte-1uil3z2"><button class="action-btn primary svelte-1uil3z2"><span class="codicon svelte-1uil3z2"> </span></button> <button class="action-btn svelte-1uil3z2" title="Edit Work Item" aria-label="Edit Work Item"><span class="codicon svelte-1uil3z2">\u270E</span></button> <button class="action-btn svelte-1uil3z2" title="Create Branch" aria-label="Create Branch"><span class="codicon svelte-1uil3z2">\u2387</span></button> <button class="action-btn svelte-1uil3z2" title="Open in Azure DevOps" aria-label="Open in Azure DevOps"><span class="codicon svelte-1uil3z2">\u{1F310}</span></button></div></div></div>`), WorkItemList[FILENAME], [
    [
      376,
      10,
      [
        [377, 12, [[378, 14], [381, 14], [382, 14]]],
        [
          389,
          12,
          [
            [390, 14],
            [394, 14, [[395, 16], [397, 16]]],
            [
              424,
              14,
              [
                [425, 16, [[431, 18]]],
                [433, 16, [[439, 18]]],
                [441, 16, [[447, 18]]],
                [449, 16, [[455, 18]]]
              ]
            ]
          ]
        ]
      ]
    ]
  ]);
  var root_11 = add_locations(from_html(`<div class="items-container svelte-1uil3z2"></div>`), WorkItemList[FILENAME], [[374, 6]]);
  var root_24 = add_locations(from_html(`<!> <div class="filters-bar svelte-1uil3z2"><input type="text" placeholder="Filter by title..." class="filter-input svelte-1uil3z2"/> <!> <!> <!></div> <!> <!> <!>`, 1), WorkItemList[FILENAME], [[283, 4, [[284, 6]]]]);
  var root4 = add_locations(from_html(`<div class="work-item-list svelte-1uil3z2" style="position: relative;"><!></div>`), WorkItemList[FILENAME], [[257, 0]]);
  function WorkItemList($$anchor, $$props) {
    check_target(new.target);
    push($$props, true, WorkItemList);
    const activeConnectionId = tag(user_derived(() => $$props.context?.activeConnectionId), "activeConnectionId");
    const predefinedQueries = [
      "My Activity",
      "Assigned to me",
      "Recently Updated",
      "Created By Me",
      "All Active",
      "All Work Items"
      // Includes closed/completed items
    ];
    const currentQuery = tag(user_derived(() => $$props.query || $$props.context?.activeQuery || predefinedQueries[0]), "currentQuery");
    const pendingWorkItemsConnectionId = tag(user_derived(() => $$props.context?.pendingWorkItems?.connectionId), "pendingWorkItemsConnectionId");
    const connectionWorkItems = tag(user_derived(() => $$props.context?.connectionWorkItems || {}), "connectionWorkItems");
    const workItems = tag(
      user_derived(() => {
        if (!get(activeConnectionId)) {
          return [];
        }
        if (strict_equals(get(pendingWorkItemsConnectionId), get(activeConnectionId)) && $$props.context?.pendingWorkItems?.workItems) {
          return $$props.context.pendingWorkItems.workItems;
        }
        const connectionItems = get(connectionWorkItems)[get(activeConnectionId)];
        if (Array.isArray(connectionItems) && connectionItems.length > 0) {
          return connectionItems;
        }
        if (Array.isArray($$props.context?.workItems) && $$props.context.workItems.length > 0) {
          return $$props.context.workItems;
        }
        return [];
      }),
      "workItems"
    );
    const timerState = tag(user_derived(() => $$props.context?.timerState), "timerState");
    const workItemsError = tag(user_derived(() => $$props.context?.workItemsError), "workItemsError");
    const workItemsErrorConnectionId = tag(user_derived(() => $$props.context?.workItemsErrorConnectionId), "workItemsErrorConnectionId");
    const showError = tag(user_derived(() => get(workItemsError) && strict_equals(get(workItemsErrorConnectionId), get(activeConnectionId))), "showError");
    const uiState = tag(user_derived(() => $$props.context?.ui), "uiState");
    const connectionHealth = tag(user_derived(() => get(uiState)?.connectionHealth), "connectionHealth");
    const hasConnectionError = tag(user_derived(() => strict_equals(get(connectionHealth)?.status, "error") && get(connectionHealth)?.lastError), "hasConnectionError");
    const connectionError = tag(user_derived(() => get(connectionHealth)?.lastError), "connectionError");
    const showLoading = tag(user_derived(() => strict_equals(get(uiState)?.loading?.workItems, true)), "showLoading");
    let tick2 = tag(state(0), "tick");
    setInterval(
      () => {
        set(tick2, (get(tick2) + 1) % 1e3);
      },
      1e3
    );
    const timerElapsedSeconds = tag(
      user_derived(() => {
        if (!get(timerState)?.startTime) return 0;
        const stopTime = get(timerState).stopTime;
        const now = stopTime || Date.now();
        const elapsed = Math.floor((now - get(timerState).startTime) / 1e3);
        return Math.max(0, elapsed);
      }),
      "timerElapsedSeconds"
    );
    let filterText = tag(state(""), "filterText");
    let typeFilter = tag(state(""), "typeFilter");
    let stateFilter = tag(state("all"), "stateFilter");
    let sortKey = tag(state("updated-desc"), "sortKey");
    const availableTypes = tag(
      user_derived(() => [
        ...new Set(get(workItems).map((w) => w.fields?.["System.WorkItemType"]).filter(Boolean))
      ]),
      "availableTypes"
    );
    const availableStates = tag(
      user_derived(() => [
        ...new Set(get(workItems).map((w) => normalizeState(w.fields?.["System.State"])).filter(Boolean))
      ]),
      "availableStates"
    );
    const filteredItems = tag(
      user_derived(() => get(workItems).filter((item) => {
        const title = (item.fields?.["System.Title"] || "").toLowerCase();
        const matchesText = !get(filterText) || title.includes(get(filterText).toLowerCase());
        const matchesType = !get(typeFilter) || strict_equals(item.fields?.["System.WorkItemType"], get(typeFilter));
        const itemState = normalizeState(item.fields?.["System.State"]);
        const matchesState = strict_equals(get(stateFilter), "all") || strict_equals(itemState, get(stateFilter));
        return matchesText && matchesType && matchesState;
      }).sort((a, b) => {
        switch (get(sortKey)) {
          case "id-asc":
            return Number(a.id) - Number(b.id);
          case "id-desc":
            return Number(b.id) - Number(a.id);
          case "title-asc":
            return (a.fields?.["System.Title"] || "").localeCompare(b.fields?.["System.Title"] || "");
          case "updated-desc":
          default:
            return new Date(b.fields?.["System.ChangedDate"] || 0).getTime() - new Date(a.fields?.["System.ChangedDate"] || 0).getTime();
        }
      })),
      "filteredItems"
    );
    function normalizeState(raw) {
      if (!raw) return "new";
      const s = String(raw).toLowerCase().trim().replace(/\s+/g, "-");
      if (["new", "to-do", "todo", "proposed"].includes(s)) return "new";
      if (strict_equals(s, "active")) return "active";
      if (["in-progress", "inprogress", "doing"].includes(s)) return "inprogress";
      if (["review", "code-review", "testing"].includes(s)) return "review";
      if (strict_equals(s, "resolved")) return "resolved";
      if (strict_equals(s, "done")) return "done";
      if (["closed", "completed"].includes(s)) return "closed";
      return "new";
    }
    function getWorkItemTypeIcon(type2) {
      const t = String(type2 || "").toLowerCase();
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
    function handleStartTimer(item, event2) {
      event2.stopPropagation();
      if (strict_equals(get(timerState)?.workItemId, item.id) && strict_equals(get(timerState)?.state, "idle", false)) {
        $$props.sendEvent({ type: "STOP_TIMER" });
      } else {
        $$props.sendEvent({
          type: "START_TIMER_INTERACTIVE",
          workItemId: item.id,
          workItemTitle: item.fields?.["System.Title"]
        });
      }
    }
    function handleEditItem(item, event2) {
      event2.stopPropagation();
      $$props.sendEvent({ type: "EDIT_WORK_ITEM", workItemId: item.id });
    }
    function handleOpenInBrowser(item, event2) {
      event2.stopPropagation();
      $$props.sendEvent({ type: "OPEN_IN_BROWSER", workItemId: item.id });
    }
    function handleCreateBranch(item, event2) {
      event2.stopPropagation();
      $$props.sendEvent({ type: "CREATE_BRANCH", workItemId: item.id });
    }
    let displayTimerSeconds = true;
    let timerHoverStart = tag(state(0), "timerHoverStart");
    function formatElapsedTime(seconds, forceShowSeconds = true) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor(seconds % 3600 / 60);
      const secs = Math.floor(seconds % 60);
      const showSeconds = forceShowSeconds && (seconds < 30 || displayTimerSeconds || get(timerHoverStart) > 0 && Date.now() - get(timerHoverStart) < 3e4);
      if (hours > 0) {
        return showSeconds ? `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${hours}:${String(mins).padStart(2, "0")}`;
      }
      return showSeconds ? `${mins}:${String(secs).padStart(2, "0")}` : `${mins}m`;
    }
    function handleTimerMouseEnter() {
      set(timerHoverStart, Date.now(), true);
    }
    function handleTimerMouseLeave() {
      setTimeout(
        () => {
          set(timerHoverStart, 0);
        },
        3e4
      );
    }
    var $$exports = { ...legacy_api() };
    var div = root4();
    var node = child(div);
    {
      var consequent = ($$anchor2) => {
        var div_1 = root_15();
        append($$anchor2, div_1);
      };
      var alternate_3 = ($$anchor2) => {
        var fragment = root_24();
        var node_1 = first_child(fragment);
        {
          var consequent_1 = ($$anchor3) => {
            var div_2 = root_32();
            var node_2 = sibling(child(div_2), 2);
            {
              let $0 = user_derived(() => predefinedQueries.map((q) => ({ value: q, label: q })));
              add_svelte_meta(
                () => Dropdown(node_2, {
                  get value() {
                    return get(currentQuery);
                  },
                  get options() {
                    return get($0);
                  },
                  onChange: (value) => {
                    if ($$props.onQueryChange) {
                      $$props.onQueryChange(value);
                    }
                  },
                  class: "query-select"
                }),
                "component",
                WorkItemList,
                268,
                8,
                { componentTag: "Dropdown" }
              );
            }
            reset(div_2);
            append($$anchor3, div_2);
          };
          add_svelte_meta(
            () => if_block(node_1, ($$render) => {
              if ($$props.onQueryChange) $$render(consequent_1);
            }),
            "if",
            WorkItemList,
            265,
            4
          );
        }
        var div_3 = sibling(node_1, 2);
        var input = child(div_3);
        remove_input_defaults(input);
        var node_3 = sibling(input, 2);
        {
          let $0 = user_derived(() => [
            { value: "", label: "All Types" },
            ...get(availableTypes).map((type2) => ({ value: type2, label: type2 }))
          ]);
          add_svelte_meta(
            () => Dropdown(node_3, {
              get value() {
                return get(typeFilter);
              },
              get options() {
                return get($0);
              },
              onChange: (value) => {
                set(typeFilter, value, true);
              }
            }),
            "component",
            WorkItemList,
            290,
            6,
            { componentTag: "Dropdown" }
          );
        }
        var node_4 = sibling(node_3, 2);
        {
          let $0 = user_derived(() => [
            { value: "all", label: "All States" },
            ...get(availableStates).map((state2) => ({ value: state2, label: state2 }))
          ]);
          add_svelte_meta(
            () => Dropdown(node_4, {
              get value() {
                return get(stateFilter);
              },
              get options() {
                return get($0);
              },
              onChange: (value) => {
                set(stateFilter, value, true);
              }
            }),
            "component",
            WorkItemList,
            300,
            6,
            { componentTag: "Dropdown" }
          );
        }
        var node_5 = sibling(node_4, 2);
        add_svelte_meta(
          () => Dropdown(node_5, {
            get value() {
              return get(sortKey);
            },
            options: [
              { value: "updated-desc", label: "Updated \u2193" },
              { value: "id-desc", label: "ID \u2193" },
              { value: "id-asc", label: "ID \u2191" },
              { value: "title-asc", label: "Title A\u2192Z" }
            ],
            onChange: (value) => {
              set(sortKey, value, true);
            }
          }),
          "component",
          WorkItemList,
          310,
          6,
          { componentTag: "Dropdown" }
        );
        reset(div_3);
        var node_6 = sibling(div_3, 2);
        {
          var consequent_3 = ($$anchor3) => {
            var fragment_1 = comment();
            var node_7 = first_child(fragment_1);
            {
              var consequent_2 = ($$anchor4) => {
                var div_4 = root_52();
                append($$anchor4, div_4);
              };
              var alternate = ($$anchor4) => {
                var div_5 = root_62();
                append($$anchor4, div_5);
              };
              add_svelte_meta(
                () => if_block(node_7, ($$render) => {
                  if (strict_equals(get(workItems).length, 0)) $$render(consequent_2);
                  else $$render(alternate, false);
                }),
                "if",
                WorkItemList,
                325,
                6
              );
            }
            append($$anchor3, fragment_1);
          };
          add_svelte_meta(
            () => if_block(node_6, ($$render) => {
              if (get(showLoading)) $$render(consequent_3);
            }),
            "if",
            WorkItemList,
            324,
            4
          );
        }
        var node_8 = sibling(node_6, 2);
        {
          var consequent_4 = ($$anchor3) => {
            {
              let $0 = user_derived(() => strict_equals(get(connectionError).type, "authentication") ? {
                ...get(connectionError),
                suggestedAction: "Change auth / start new sign-in"
              } : get(connectionError));
              add_svelte_meta(
                () => ErrorBanner($$anchor3, {
                  get error() {
                    return get($0);
                  },
                  onRetry: () => $$props.sendEvent({ type: "REFRESH_DATA" }),
                  onFixAuth: () => $$props.sendEvent({ type: "RESET_AUTH", connectionId: get(activeConnectionId) }),
                  onDismiss: () => {
                  }
                }),
                "component",
                WorkItemList,
                339,
                6,
                { componentTag: "ErrorBanner" }
              );
            }
          };
          add_svelte_meta(
            () => if_block(node_8, ($$render) => {
              if (get(hasConnectionError) && get(connectionError)) $$render(consequent_4);
            }),
            "if",
            WorkItemList,
            338,
            4
          );
        }
        var node_9 = sibling(node_8, 2);
        {
          var consequent_5 = ($$anchor3) => {
            {
              let $0 = user_derived(() => get(connectionError) || (get(showError) ? {
                message: get(workItemsError) || "Unable to load work items",
                type: "authentication",
                recoverable: true,
                suggestedAction: "Change auth / start new sign-in"
              } : void 0));
              add_svelte_meta(
                () => EmptyState($$anchor3, {
                  hasError: true,
                  get error() {
                    return get($0);
                  },
                  onRetry: () => $$props.sendEvent({ type: "REFRESH_DATA" }),
                  onFixAuth: () => $$props.sendEvent({ type: "RESET_AUTH", connectionId: get(activeConnectionId) })
                }),
                "component",
                WorkItemList,
                351,
                6,
                { componentTag: "EmptyState" }
              );
            }
          };
          var alternate_2 = ($$anchor3) => {
            var fragment_4 = comment();
            var node_10 = first_child(fragment_4);
            {
              var consequent_6 = ($$anchor4) => {
                var div_6 = root_10();
                var button = sibling(child(div_6), 2);
                button.__click = () => {
                  set(filterText, "");
                  set(typeFilter, "");
                  set(stateFilter, "all");
                };
                reset(div_6);
                append($$anchor4, div_6);
              };
              var alternate_1 = ($$anchor4) => {
                var div_7 = root_11();
                validate_each_keys(() => get(filteredItems), (item) => item.id);
                add_svelte_meta(
                  () => each(div_7, 21, () => get(filteredItems), (item) => item.id, ($$anchor5, item) => {
                    var div_8 = root_122();
                    var div_9 = child(div_8);
                    var span = child(div_9);
                    var text2 = child(span, true);
                    reset(span);
                    var span_1 = sibling(span, 2);
                    var text_1 = child(span_1);
                    reset(span_1);
                    var span_2 = sibling(span_1, 2);
                    var text_2 = child(span_2);
                    reset(span_2);
                    reset(div_9);
                    var div_10 = sibling(div_9, 2);
                    var div_11 = child(div_10);
                    var text_3 = child(div_11, true);
                    reset(div_11);
                    var div_12 = sibling(div_11, 2);
                    var span_3 = child(div_12);
                    var text_4 = child(span_3, true);
                    reset(span_3);
                    var span_4 = sibling(span_3, 2);
                    var text_5 = child(span_4, true);
                    reset(span_4);
                    var node_11 = sibling(span_4, 2);
                    {
                      var consequent_7 = ($$anchor6) => {
                        var span_5 = root_132();
                        var text_6 = child(span_5, true);
                        reset(span_5);
                        template_effect(() => set_text(text_6, get(item).fields["System.AssignedTo"].displayName || get(item).fields["System.AssignedTo"]));
                        append($$anchor6, span_5);
                      };
                      add_svelte_meta(
                        () => if_block(node_11, ($$render) => {
                          if (get(item).fields?.["System.AssignedTo"]) $$render(consequent_7);
                        }),
                        "if",
                        WorkItemList,
                        402,
                        16
                      );
                    }
                    var node_12 = sibling(node_11, 2);
                    {
                      var consequent_8 = ($$anchor6) => {
                        var span_6 = root_142();
                        var text_7 = sibling(child(span_6));
                        reset(span_6);
                        template_effect(($0) => set_text(text_7, ` ${$0 ?? ""}`), [() => formatElapsedTime(get(timerElapsedSeconds))]);
                        event("mouseenter", span_6, handleTimerMouseEnter);
                        event("mouseleave", span_6, handleTimerMouseLeave);
                        append($$anchor6, span_6);
                      };
                      add_svelte_meta(
                        () => if_block(node_12, ($$render) => {
                          if (strict_equals(get(timerState)?.workItemId, get(item).id)) $$render(consequent_8);
                        }),
                        "if",
                        WorkItemList,
                        408,
                        16
                      );
                    }
                    reset(div_12);
                    var div_13 = sibling(div_12, 2);
                    var button_1 = child(div_13);
                    button_1.__click = (e) => handleStartTimer(get(item), e);
                    var span_7 = child(button_1);
                    var text_8 = child(span_7, true);
                    reset(span_7);
                    reset(button_1);
                    var button_2 = sibling(button_1, 2);
                    button_2.__click = (e) => handleEditItem(get(item), e);
                    var button_3 = sibling(button_2, 2);
                    button_3.__click = (e) => handleCreateBranch(get(item), e);
                    var button_4 = sibling(button_3, 2);
                    button_4.__click = (e) => handleOpenInBrowser(get(item), e);
                    reset(div_13);
                    reset(div_10);
                    reset(div_8);
                    template_effect(
                      ($0, $1, $2) => {
                        set_text(text2, $0);
                        set_text(text_1, `#${get(item).id ?? ""}`);
                        set_class(span_2, 1, `priority ${$1 ?? ""}`, "svelte-1uil3z2");
                        set_text(text_2, `P${(get(item).fields?.["Microsoft.VSTS.Common.Priority"] || "3") ?? ""}`);
                        set_text(text_3, get(item).fields?.["System.Title"] || `Work Item #${get(item).id}`);
                        set_text(text_4, get(item).fields?.["System.WorkItemType"] || "Task");
                        set_class(span_4, 1, `meta-badge state state-${$2 ?? ""}`, "svelte-1uil3z2");
                        set_text(text_5, get(item).fields?.["System.State"] || "New");
                        set_attribute2(button_1, "title", strict_equals(get(timerState)?.workItemId, get(item).id) ? "Stop Timer" : "Start Timer");
                        set_attribute2(button_1, "aria-label", strict_equals(get(timerState)?.workItemId, get(item).id) ? "Stop Timer" : "Start Timer");
                        set_text(text_8, strict_equals(get(timerState)?.workItemId, get(item).id) ? "\u23F9" : "\u25B6");
                      },
                      [
                        () => getWorkItemTypeIcon(get(item).fields?.["System.WorkItemType"]),
                        () => getPriorityClass(get(item).fields?.["Microsoft.VSTS.Common.Priority"]),
                        () => normalizeState(get(item).fields?.["System.State"])
                      ]
                    );
                    append($$anchor5, div_8);
                  }),
                  "each",
                  WorkItemList,
                  375,
                  8
                );
                reset(div_7);
                append($$anchor4, div_7);
              };
              add_svelte_meta(
                () => if_block(
                  node_10,
                  ($$render) => {
                    if (strict_equals(get(filteredItems).length, 0) && get(workItems).length > 0) $$render(consequent_6);
                    else $$render(alternate_1, false);
                  },
                  true
                ),
                "if",
                WorkItemList,
                362,
                4
              );
            }
            append($$anchor3, fragment_4);
          };
          add_svelte_meta(
            () => if_block(node_9, ($$render) => {
              if ((get(hasConnectionError) || get(showError)) && strict_equals(get(workItems).length, 0) && !get(showLoading)) $$render(consequent_5);
              else $$render(alternate_2, false);
            }),
            "if",
            WorkItemList,
            350,
            4
          );
        }
        bind_value(
          input,
          function get3() {
            return get(filterText);
          },
          function set3($$value) {
            set(filterText, $$value);
          }
        );
        append($$anchor2, fragment);
      };
      add_svelte_meta(
        () => if_block(node, ($$render) => {
          if (!get(activeConnectionId)) $$render(consequent);
          else $$render(alternate_3, false);
        }),
        "if",
        WorkItemList,
        258,
        2
      );
    }
    reset(div);
    append($$anchor, div);
    return pop($$exports);
  }
  delegate(["click"]);

  // src/webview/components/KanbanBoard.svelte
  KanbanBoard[FILENAME] = "src/webview/components/KanbanBoard.svelte";
  var root_16 = add_locations(from_html(`<div class="empty svelte-j9p4i1">No columns available \u2013 load work items or switch view.</div>`), KanbanBoard[FILENAME], [[101, 4]]);
  var root_63 = add_locations(from_html(`<span class="meta-badge assignee svelte-j9p4i1"> </span>`), KanbanBoard[FILENAME], [[140, 22]]);
  var root_7 = add_locations(from_html(`<span class="meta-badge timer-badge svelte-j9p4i1" title="Timer Active">\u23F1</span>`), KanbanBoard[FILENAME], [[145, 22]]);
  var root_53 = add_locations(from_html(`<div role="button" tabindex="0"><div class="kanban-item-header svelte-j9p4i1"><span class="type-icon svelte-j9p4i1"> </span> <span class="item-id svelte-j9p4i1"> </span> <span> </span></div> <div class="kanban-item-title svelte-j9p4i1"> </div> <div class="kanban-item-meta svelte-j9p4i1"><span class="meta-badge type svelte-j9p4i1"> </span> <!> <!></div> <div class="kanban-item-actions svelte-j9p4i1"><button class="action-btn svelte-j9p4i1"><span class="codicon svelte-j9p4i1"> </span></button> <button class="action-btn svelte-j9p4i1" title="Open in Azure DevOps"><span class="codicon svelte-j9p4i1">\u{1F310}</span></button></div></div>`), KanbanBoard[FILENAME], [
    [
      114,
      16,
      [
        [127, 18, [[128, 20], [129, 20], [130, 20]]],
        [134, 18],
        [137, 18, [[138, 20]]],
        [148, 18, [[149, 20, [[154, 22]]], [156, 20, [[161, 22]]]]]
      ]
    ]
  ]);
  var root_8 = add_locations(from_html(`<div class="kanban-item kanban-item-placeholder svelte-j9p4i1"><span> </span></div>`), KanbanBoard[FILENAME], [[167, 16, [[168, 18]]]]);
  var root_33 = add_locations(from_html(`<div class="column svelte-j9p4i1"><div class="column-header svelte-j9p4i1"><h3 class="svelte-j9p4i1"> </h3> <span class="count svelte-j9p4i1"> </span></div> <div class="items svelte-j9p4i1"></div></div>`), KanbanBoard[FILENAME], [[105, 8, [[106, 10, [[107, 12], [108, 12]]], [110, 10]]]]);
  var root_25 = add_locations(from_html(`<div class="columns svelte-j9p4i1"></div>`), KanbanBoard[FILENAME], [[103, 4]]);
  var root5 = add_locations(from_html(`<div class="kanban-board svelte-j9p4i1"><!></div>`), KanbanBoard[FILENAME], [[99, 0]]);
  function KanbanBoard($$anchor, $$props) {
    check_target(new.target);
    push($$props, true, KanbanBoard);
    let selectedItemId = tag(state(null), "selectedItemId");
    const activeConnectionId = tag(user_derived(() => $$props.context?.activeConnectionId), "activeConnectionId");
    const allWorkItems = tag(user_derived(() => $$props.context?.pendingWorkItems?.workItems || $$props.context?.workItems || []), "allWorkItems");
    const pendingWorkItemsConnectionId = tag(user_derived(() => $$props.context?.pendingWorkItems?.connectionId), "pendingWorkItemsConnectionId");
    const workItems = tag(
      user_derived(() => {
        if (get(pendingWorkItemsConnectionId)) {
          if (strict_equals(get(pendingWorkItemsConnectionId), get(activeConnectionId))) {
            return get(allWorkItems);
          }
          return [];
        }
        return get(activeConnectionId) ? get(allWorkItems) : [];
      }),
      "workItems"
    );
    const columns = tag(user_derived(() => $$props.context?.kanbanColumns || []), "columns");
    const timerState = tag(user_derived(() => $$props.context?.timerState), "timerState");
    const workItemsMap = tag(
      user_derived(() => {
        const map2 = /* @__PURE__ */ new Map();
        get(workItems).forEach((item) => {
          if (item?.id) {
            map2.set(String(item.id), item);
          }
        });
        return map2;
      }),
      "workItemsMap"
    );
    function getWorkItemTypeIcon(type2) {
      const t = String(type2 || "").toLowerCase();
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
    function handleItemClick(item, event2) {
      event2.stopPropagation();
      set(selectedItemId, String(item.id), true);
    }
    function handleStartTimer(item, event2) {
      event2.stopPropagation();
      if (strict_equals(get(timerState)?.workItemId, item.id) && strict_equals(get(timerState)?.state, "idle", false)) {
        $$props.sendEvent({ type: "STOP_TIMER" });
      } else {
        $$props.sendEvent({
          type: "START_TIMER_INTERACTIVE",
          workItemId: item.id,
          workItemTitle: item.fields?.["System.Title"]
        });
      }
    }
    var $$exports = { ...legacy_api() };
    var div = root5();
    var node = child(div);
    {
      var consequent = ($$anchor2) => {
        var div_1 = root_16();
        append($$anchor2, div_1);
      };
      var alternate_1 = ($$anchor2) => {
        var div_2 = root_25();
        validate_each_keys(() => get(columns), (col) => col.id);
        add_svelte_meta(
          () => each(div_2, 21, () => get(columns), (col) => col.id, ($$anchor3, col) => {
            var div_3 = root_33();
            var div_4 = child(div_3);
            var h3 = child(div_4);
            var text2 = child(h3, true);
            reset(h3);
            var span = sibling(h3, 2);
            var text_1 = child(span, true);
            reset(span);
            reset(div_4);
            var div_5 = sibling(div_4, 2);
            validate_each_keys(() => get(col).itemIds, (id) => id);
            add_svelte_meta(
              () => each(div_5, 20, () => get(col).itemIds, (id) => id, ($$anchor4, id) => {
                const item = tag(user_derived(() => get(workItemsMap).get(String(id))), "item");
                get(item);
                var fragment = comment();
                var node_1 = first_child(fragment);
                {
                  var consequent_3 = ($$anchor5) => {
                    var div_6 = root_53();
                    let classes;
                    div_6.__click = (e) => handleItemClick(get(item), e);
                    div_6.__keydown = (e) => {
                      if (strict_equals(e.key, "Enter") || strict_equals(e.key, " ")) {
                        e.preventDefault();
                        handleItemClick(get(item), e);
                      }
                    };
                    var div_7 = child(div_6);
                    var span_1 = child(div_7);
                    var text_2 = child(span_1, true);
                    reset(span_1);
                    var span_2 = sibling(span_1, 2);
                    var text_3 = child(span_2);
                    reset(span_2);
                    var span_3 = sibling(span_2, 2);
                    var text_4 = child(span_3);
                    reset(span_3);
                    reset(div_7);
                    var div_8 = sibling(div_7, 2);
                    var text_5 = child(div_8, true);
                    reset(div_8);
                    var div_9 = sibling(div_8, 2);
                    var span_4 = child(div_9);
                    var text_6 = child(span_4, true);
                    reset(span_4);
                    var node_2 = sibling(span_4, 2);
                    {
                      var consequent_1 = ($$anchor6) => {
                        var span_5 = root_63();
                        var text_7 = child(span_5, true);
                        reset(span_5);
                        template_effect(() => set_text(text_7, get(item).fields["System.AssignedTo"].displayName || get(item).fields["System.AssignedTo"]));
                        append($$anchor6, span_5);
                      };
                      add_svelte_meta(
                        () => if_block(node_2, ($$render) => {
                          if (get(item).fields?.["System.AssignedTo"]) $$render(consequent_1);
                        }),
                        "if",
                        KanbanBoard,
                        139,
                        20
                      );
                    }
                    var node_3 = sibling(node_2, 2);
                    {
                      var consequent_2 = ($$anchor6) => {
                        var span_6 = root_7();
                        append($$anchor6, span_6);
                      };
                      add_svelte_meta(
                        () => if_block(node_3, ($$render) => {
                          if (strict_equals(get(timerState)?.workItemId, get(item).id)) $$render(consequent_2);
                        }),
                        "if",
                        KanbanBoard,
                        144,
                        20
                      );
                    }
                    reset(div_9);
                    var div_10 = sibling(div_9, 2);
                    var button = child(div_10);
                    button.__click = (e) => handleStartTimer(get(item), e);
                    var span_7 = child(button);
                    var text_8 = child(span_7, true);
                    reset(span_7);
                    reset(button);
                    var button_1 = sibling(button, 2);
                    button_1.__click = (e) => {
                      e.stopPropagation();
                      $$props.sendEvent({ type: "OPEN_IN_BROWSER", workItemId: get(item).id });
                    };
                    reset(div_10);
                    reset(div_6);
                    template_effect(
                      ($0, $1, $2) => {
                        classes = set_class(div_6, 1, "kanban-item svelte-j9p4i1", null, classes, $0);
                        set_text(text_2, $1);
                        set_text(text_3, `#${get(item).id ?? ""}`);
                        set_class(span_3, 1, `priority ${$2 ?? ""}`, "svelte-j9p4i1");
                        set_text(text_4, `P${(get(item).fields?.["Microsoft.VSTS.Common.Priority"] || "3") ?? ""}`);
                        set_text(text_5, get(item).fields?.["System.Title"] || `Work Item #${get(item).id}`);
                        set_text(text_6, get(item).fields?.["System.WorkItemType"] || "Task");
                        set_attribute2(button, "title", strict_equals(get(timerState)?.workItemId, get(item).id) ? "Stop Timer" : "Start Timer");
                        set_text(text_8, strict_equals(get(timerState)?.workItemId, get(item).id) ? "\u23F9" : "\u25B6");
                      },
                      [
                        () => ({
                          selected: strict_equals(get(selectedItemId), String(get(item).id))
                        }),
                        () => getWorkItemTypeIcon(get(item).fields?.["System.WorkItemType"]),
                        () => getPriorityClass(get(item).fields?.["Microsoft.VSTS.Common.Priority"])
                      ]
                    );
                    append($$anchor5, div_6);
                  };
                  var alternate = ($$anchor5) => {
                    var div_11 = root_8();
                    var span_8 = child(div_11);
                    var text_9 = child(span_8);
                    reset(span_8);
                    reset(div_11);
                    template_effect(() => set_text(text_9, `#${id ?? ""}`));
                    append($$anchor5, div_11);
                  };
                  add_svelte_meta(
                    () => if_block(node_1, ($$render) => {
                      if (get(item)) $$render(consequent_3);
                      else $$render(alternate, false);
                    }),
                    "if",
                    KanbanBoard,
                    113,
                    14
                  );
                }
                append($$anchor4, fragment);
              }),
              "each",
              KanbanBoard,
              111,
              12
            );
            reset(div_5);
            reset(div_3);
            template_effect(() => {
              set_text(text2, get(col).title);
              set_text(text_1, get(col).itemIds.length);
            });
            append($$anchor3, div_3);
          }),
          "each",
          KanbanBoard,
          104,
          6
        );
        reset(div_2);
        append($$anchor2, div_2);
      };
      add_svelte_meta(
        () => if_block(node, ($$render) => {
          if (strict_equals(get(columns).length, 0)) $$render(consequent);
          else $$render(alternate_1, false);
        }),
        "if",
        KanbanBoard,
        100,
        2
      );
    }
    reset(div);
    append($$anchor, div);
    return pop($$exports);
  }
  delegate(["click", "keydown"]);

  // src/webview/components/ConnectionStatus.svelte
  ConnectionStatus[FILENAME] = "src/webview/components/ConnectionStatus.svelte";
  var root_17 = add_locations(from_html(`<div class="status-indicator svelte-ky1zja"><span class="status-dot svelte-ky1zja"></span> <span class="status-text svelte-ky1zja"> </span></div>`), ConnectionStatus[FILENAME], [[84, 4, [[85, 6], [86, 6]]]]);
  var root_26 = add_locations(from_html(`<div class="refresh-status svelte-ky1zja"><span class="refresh-icon svelte-ky1zja"> </span> <span class="refresh-text svelte-ky1zja"> </span></div>`), ConnectionStatus[FILENAME], [[90, 4, [[91, 6], [92, 6]]]]);
  var root6 = add_locations(from_html(`<div class="connection-status svelte-ky1zja"><!> <!></div>`), ConnectionStatus[FILENAME], [[82, 0]]);
  function ConnectionStatus($$anchor, $$props) {
    check_target(new.target);
    push($$props, true, ConnectionStatus);
    function formatTimeAgo(timestamp2) {
      const seconds = Math.floor((Date.now() - timestamp2) / 1e3);
      if (seconds < 60) return `${seconds}s ago`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    }
    function getStatusColor() {
      if (!$$props.connectionHealth) return "var(--vscode-descriptionForeground)";
      switch ($$props.connectionHealth.status) {
        case "healthy":
          return "var(--vscode-testing-iconPassed)";
        case "error":
          return "var(--vscode-errorForeground)";
        case "warning":
          return "var(--vscode-testing-iconQueued)";
        default:
          return "var(--vscode-descriptionForeground)";
      }
    }
    function getStatusText() {
      if (!$$props.connectionHealth) return "Unknown";
      switch ($$props.connectionHealth.status) {
        case "healthy":
          return "Connected";
        case "error":
          return "Connection Error";
        case "warning":
          return "Warning";
        default:
          return "Unknown";
      }
    }
    function getRefreshStatusText() {
      if (!$$props.refreshStatus) return "";
      const timeAgo = formatTimeAgo($$props.refreshStatus.lastAttempt);
      if ($$props.refreshStatus.success) {
        return `Last refresh: ${timeAgo}`;
      } else {
        return `Last refresh: Failed (${timeAgo})`;
      }
    }
    var $$exports = { ...legacy_api() };
    var div = root6();
    var node = child(div);
    {
      var consequent = ($$anchor2) => {
        var div_1 = root_17();
        var span = sibling(child(div_1), 2);
        var text2 = child(span, true);
        reset(span);
        reset(div_1);
        template_effect(
          ($0, $1) => {
            set_style(div_1, `--status-color: ${$0 ?? ""}`);
            set_text(text2, $1);
          },
          [getStatusColor, getStatusText]
        );
        append($$anchor2, div_1);
      };
      add_svelte_meta(
        () => if_block(node, ($$render) => {
          if ($$props.connectionHealth) $$render(consequent);
        }),
        "if",
        ConnectionStatus,
        83,
        2
      );
    }
    var node_1 = sibling(node, 2);
    {
      var consequent_1 = ($$anchor2) => {
        var div_2 = root_26();
        var span_1 = child(div_2);
        var text_1 = child(span_1, true);
        reset(span_1);
        var span_2 = sibling(span_1, 2);
        var text_2 = child(span_2, true);
        reset(span_2);
        reset(div_2);
        template_effect(
          ($0) => {
            set_text(text_1, $$props.refreshStatus.success ? "\u2713" : "\u2717");
            set_text(text_2, $0);
          },
          [getRefreshStatusText]
        );
        append($$anchor2, div_2);
      };
      add_svelte_meta(
        () => if_block(node_1, ($$render) => {
          if ($$props.refreshStatus) $$render(consequent_1);
        }),
        "if",
        ConnectionStatus,
        89,
        2
      );
    }
    reset(div);
    append($$anchor, div);
    return pop($$exports);
  }

  // src/webview/components/StatusBar.svelte
  StatusBar[FILENAME] = "src/webview/components/StatusBar.svelte";
  var root_18 = add_locations(from_html(`<div class="status-section connection-info svelte-1764dnv"><span class="label svelte-1764dnv">Connection:</span> <span class="value svelte-1764dnv"> </span></div>`), StatusBar[FILENAME], [[79, 4, [[80, 6], [81, 6]]]]);
  var root_34 = add_locations(from_html(`<div class="status-section timer-active svelte-1764dnv"><span class="label svelte-1764dnv">Timer:</span> <span class="value svelte-1764dnv"> </span></div>`), StatusBar[FILENAME], [[88, 4, [[89, 6], [90, 6]]]]);
  var root7 = add_locations(from_html(`<div class="status-bar svelte-1764dnv"><!> <!> <!></div>`), StatusBar[FILENAME], [[77, 0]]);
  function StatusBar($$anchor, $$props) {
    check_target(new.target);
    push($$props, true, StatusBar);
    const timerState = tag(user_derived(() => $$props.context?.timerActor?.state || "idle"), "timerState");
    const activeConnectionId = tag(user_derived(() => $$props.context?.activeConnectionId), "activeConnectionId");
    const connections = tag(user_derived(() => $$props.context?.connections || []), "connections");
    const activeConnection = tag(user_derived(() => get(connections).find((c) => strict_equals(c.id, get(activeConnectionId)))), "activeConnection");
    const uiState = tag(user_derived(() => $$props.context?.ui), "uiState");
    const connectionHealth = tag(user_derived(() => get(uiState)?.connectionHealth), "connectionHealth");
    const refreshStatus = tag(user_derived(() => get(uiState)?.refreshStatus), "refreshStatus");
    function formatConnectionLabel(conn) {
      if (!conn) return "No connection";
      if (conn.label) return conn.label;
      if (conn.organization && conn.project) {
        return `${conn.organization}/${conn.project}`;
      }
      return conn.id;
    }
    var $$exports = { ...legacy_api() };
    var div = root7();
    var node = child(div);
    {
      var consequent = ($$anchor2) => {
        var div_1 = root_18();
        var span = sibling(child(div_1), 2);
        var text2 = child(span, true);
        reset(span);
        reset(div_1);
        template_effect(($0) => set_text(text2, $0), [() => formatConnectionLabel(get(activeConnection))]);
        append($$anchor2, div_1);
      };
      add_svelte_meta(
        () => if_block(node, ($$render) => {
          if (get(activeConnection)) $$render(consequent);
        }),
        "if",
        StatusBar,
        78,
        2
      );
    }
    var node_1 = sibling(node, 2);
    {
      var consequent_1 = ($$anchor2) => {
        add_svelte_meta(
          () => ConnectionStatus($$anchor2, {
            get connectionHealth() {
              return get(connectionHealth);
            },
            get refreshStatus() {
              return get(refreshStatus);
            }
          }),
          "component",
          StatusBar,
          85,
          4,
          { componentTag: "ConnectionStatus" }
        );
      };
      add_svelte_meta(
        () => if_block(node_1, ($$render) => {
          if (get(connectionHealth) || get(refreshStatus)) $$render(consequent_1);
        }),
        "if",
        StatusBar,
        84,
        2
      );
    }
    var node_2 = sibling(node_1, 2);
    {
      var consequent_2 = ($$anchor2) => {
        var div_2 = root_34();
        var span_1 = sibling(child(div_2), 2);
        var text_1 = child(span_1, true);
        reset(span_1);
        reset(div_2);
        template_effect(() => set_text(text_1, get(timerState)));
        append($$anchor2, div_2);
      };
      add_svelte_meta(
        () => if_block(node_2, ($$render) => {
          if (strict_equals(get(timerState), "idle", false)) $$render(consequent_2);
        }),
        "if",
        StatusBar,
        87,
        2
      );
    }
    reset(div);
    append($$anchor, div);
    return pop($$exports);
  }

  // src/webview/components/ConnectionView.svelte
  ConnectionView[FILENAME] = "src/webview/components/ConnectionView.svelte";
  var root_19 = add_locations(from_html(`<div class="connection-content svelte-5unw23"><!> <!></div>`), ConnectionView[FILENAME], [[51, 4]]);
  var root8 = add_locations(from_html(`<div><!></div>`), ConnectionView[FILENAME], [[44, 0]]);
  function ConnectionView($$anchor, $$props) {
    check_target(new.target);
    push($$props, true, ConnectionView);
    function handleQueryChange(newQuery) {
      $$props.sendEvent({
        type: "SET_CONNECTION_QUERY",
        connectionId: $$props.connection.id,
        query: newQuery
      });
    }
    var $$exports = { ...legacy_api() };
    var div = root8();
    let classes;
    var node = child(div);
    {
      var consequent_1 = ($$anchor2) => {
        const contextWithWorkItems = tag(
          user_derived(() => ({
            ...$$props.context,
            pendingWorkItems: {
              workItems: $$props.workItems,
              connectionId: $$props.connection.id
            }
          })),
          "contextWithWorkItems"
        );
        get(contextWithWorkItems);
        var div_1 = root_19();
        var node_1 = child(div_1);
        {
          var consequent = ($$anchor3) => {
            add_svelte_meta(
              () => KanbanBoard($$anchor3, {
                get context() {
                  return get(contextWithWorkItems);
                },
                get sendEvent() {
                  return $$props.sendEvent;
                }
              }),
              "component",
              ConnectionView,
              53,
              8,
              { componentTag: "KanbanBoard" }
            );
          };
          var alternate = ($$anchor3) => {
            add_svelte_meta(
              () => WorkItemList($$anchor3, {
                get context() {
                  return get(contextWithWorkItems);
                },
                get matches() {
                  return $$props.matches;
                },
                get sendEvent() {
                  return $$props.sendEvent;
                },
                get query() {
                  return $$props.query;
                },
                onQueryChange: handleQueryChange
              }),
              "component",
              ConnectionView,
              55,
              8,
              { componentTag: "WorkItemList" }
            );
          };
          add_svelte_meta(
            () => if_block(node_1, ($$render) => {
              if (strict_equals($$props.viewMode, "kanban")) $$render(consequent);
              else $$render(alternate, false);
            }),
            "if",
            ConnectionView,
            52,
            6
          );
        }
        var node_2 = sibling(node_1, 2);
        add_svelte_meta(
          () => StatusBar(node_2, {
            get context() {
              return $$props.context;
            }
          }),
          "component",
          ConnectionView,
          64,
          6,
          { componentTag: "StatusBar" }
        );
        reset(div_1);
        append($$anchor2, div_1);
      };
      add_svelte_meta(
        () => if_block(node, ($$render) => {
          if ($$props.isActive) $$render(consequent_1);
        }),
        "if",
        ConnectionView,
        49,
        2
      );
    }
    reset(div);
    template_effect(() => {
      classes = set_class(div, 1, "connection-view svelte-5unw23", null, classes, { active: $$props.isActive });
      set_attribute2(div, "data-connection-id", $$props.connection.id);
    });
    append($$anchor, div);
    return pop($$exports);
  }

  // src/webview/components/ConnectionViews.svelte
  ConnectionViews[FILENAME] = "src/webview/components/ConnectionViews.svelte";
  var root9 = add_locations(from_html(`<div class="connection-views svelte-19sc4ta"></div>`), ConnectionViews[FILENAME], [[56, 0]]);
  function ConnectionViews($$anchor, $$props) {
    check_target(new.target);
    push($$props, true, ConnectionViews);
    const connectionQueries = tag(
      user_derived(() => {
        const queries = $$props.context?.connectionQueries;
        if (queries instanceof Map) return queries;
        if (queries && strict_equals(typeof queries, "object")) return new Map(Object.entries(queries));
        return /* @__PURE__ */ new Map();
      }),
      "connectionQueries"
    );
    const connectionWorkItems = tag(
      user_derived(() => {
        const items = $$props.context?.connectionWorkItems;
        if (items instanceof Map) return items;
        if (items && strict_equals(typeof items, "object")) return new Map(Object.entries(items));
        return /* @__PURE__ */ new Map();
      }),
      "connectionWorkItems"
    );
    const connectionFilters = tag(
      user_derived(() => {
        const filters = $$props.context?.connectionFilters;
        if (filters instanceof Map) return filters;
        if (filters && strict_equals(typeof filters, "object")) return new Map(Object.entries(filters));
        return /* @__PURE__ */ new Map();
      }),
      "connectionFilters"
    );
    const connectionViewModes = tag(
      user_derived(() => {
        const modes = $$props.context?.connectionViewModes;
        if (modes instanceof Map) return modes;
        if (modes && strict_equals(typeof modes, "object")) return new Map(Object.entries(modes));
        return /* @__PURE__ */ new Map();
      }),
      "connectionViewModes"
    );
    var $$exports = { ...legacy_api() };
    var div = root9();
    validate_each_keys(() => $$props.connections, (connection) => connection.id);
    add_svelte_meta(
      () => each(div, 21, () => $$props.connections, (connection) => connection.id, ($$anchor2, connection) => {
        const isActive = tag(user_derived(() => strict_equals(get(connection).id, $$props.activeConnectionId)), "isActive");
        get(isActive);
        const query = tag(user_derived(() => get(connectionQueries).get(get(connection).id) || $$props.context?.activeQuery || "My Activity"), "query");
        get(query);
        const workItems = tag(user_derived(() => get(connectionWorkItems).get(get(connection).id) || []), "workItems");
        get(workItems);
        const filters = tag(user_derived(() => get(connectionFilters).get(get(connection).id) || {}), "filters");
        get(filters);
        const viewMode = tag(user_derived(() => get(connectionViewModes).get(get(connection).id) || $$props.context?.viewMode || "list"), "viewMode");
        get(viewMode);
        add_svelte_meta(
          () => ConnectionView($$anchor2, {
            get connection() {
              return get(connection);
            },
            get isActive() {
              return get(isActive);
            },
            get query() {
              return get(query);
            },
            get workItems() {
              return get(workItems);
            },
            get filters() {
              return get(filters);
            },
            get viewMode() {
              return get(viewMode);
            },
            get context() {
              return $$props.context;
            },
            get matches() {
              return $$props.matches;
            },
            get sendEvent() {
              return $$props.sendEvent;
            }
          }),
          "component",
          ConnectionViews,
          64,
          4,
          { componentTag: "ConnectionView" }
        );
      }),
      "each",
      ConnectionViews,
      57,
      2
    );
    reset(div);
    append($$anchor, div);
    return pop($$exports);
  }

  // src/webview/components/AuthReminder.svelte
  AuthReminder[FILENAME] = "src/webview/components/AuthReminder.svelte";
  var root_110 = add_locations(from_html(`<div class="auth-reminder-banner warning svelte-cv3w9g"><span class="auth-icon svelte-cv3w9g">\u{1F510}</span> <div class="auth-message-container svelte-cv3w9g"><span class="auth-message svelte-cv3w9g"> </span></div> <div class="auth-actions svelte-cv3w9g"><button class="auth-action svelte-cv3w9g" title="Open browser to complete sign-in" aria-label="Open browser to complete sign-in"><span class="codicon svelte-cv3w9g">\u{1F310}</span> Open browser</button> <button class="auth-action secondary svelte-cv3w9g" title="Cancel authentication" aria-label="Cancel authentication"><span class="codicon svelte-cv3w9g">\u2717</span> Cancel</button></div></div>`), AuthReminder[FILENAME], [
    [
      206,
      2,
      [
        [207, 4],
        [208, 4, [[209, 6]]],
        [213, 4, [[214, 6, [[220, 8]]], [223, 6, [[229, 8]]]]]
      ]
    ]
  ]);
  var root_35 = add_locations(from_html(`<div class="auth-reminder-banner warning svelte-cv3w9g"><span class="auth-icon svelte-cv3w9g">\u{1F510}</span> <div class="auth-message-container svelte-cv3w9g"><span class="auth-message svelte-cv3w9g">Authentication Required: Enter code <strong class="svelte-cv3w9g"> </strong> </span></div> <div class="auth-actions svelte-cv3w9g"><button class="auth-action svelte-cv3w9g" title="Copy code" aria-label="Copy code"><span class="codicon svelte-cv3w9g">\u{1F4CB}</span> Copy code</button> <button class="auth-action svelte-cv3w9g" title="Copy code and open browser" aria-label="Copy code and open browser"><span class="codicon svelte-cv3w9g">\u{1F310}</span> Open browser</button> <button class="auth-action secondary svelte-cv3w9g" title="Cancel authentication" aria-label="Cancel authentication"><span class="codicon svelte-cv3w9g">\u2717</span> Cancel</button></div></div>`), AuthReminder[FILENAME], [
    [
      236,
      2,
      [
        [237, 4],
        [238, 4, [[239, 6, [[240, 44]]]]],
        [
          244,
          4,
          [
            [245, 6, [[251, 8]]],
            [254, 6, [[260, 8]]],
            [263, 6, [[269, 8]]]
          ]
        ]
      ]
    ]
  ]);
  var root_64 = add_locations(from_html(`<span class="error-hint svelte-cv3w9g"> </span>`), AuthReminder[FILENAME], [[284, 8]]);
  var root_54 = add_locations(from_html(`<div class="auth-reminder-banner error svelte-cv3w9g"><span class="auth-icon svelte-cv3w9g">\u26A0\uFE0F</span> <div class="auth-message svelte-cv3w9g"><strong class="svelte-cv3w9g">Authentication Failed</strong> <span class="error-detail svelte-cv3w9g"> </span> <!></div> <div class="auth-actions svelte-cv3w9g"><button class="auth-action svelte-cv3w9g">Start device code sign-in</button> <button class="auth-action svelte-cv3w9g">Change auth / start new sign-in</button> <button class="auth-action secondary svelte-cv3w9g">Settings</button></div></div>`), AuthReminder[FILENAME], [
    [
      276,
      2,
      [
        [277, 4],
        [278, 4, [[279, 6], [280, 6]]],
        [287, 4, [[288, 6], [291, 6], [294, 6]]]
      ]
    ]
  ]);
  var root_82 = add_locations(from_html(`<div class="auth-reminder-banner error svelte-cv3w9g"><span class="auth-icon svelte-cv3w9g">\u26A0\uFE0F</span> <div class="auth-message svelte-cv3w9g"><strong class="svelte-cv3w9g">Authentication Failed</strong> <span class="error-detail svelte-cv3w9g"> </span></div> <div class="auth-actions svelte-cv3w9g"><button class="auth-action svelte-cv3w9g">Start device code sign-in</button> <button class="auth-action svelte-cv3w9g">Change auth / start new sign-in</button> <button class="auth-action secondary svelte-cv3w9g">Settings</button></div></div>`), AuthReminder[FILENAME], [
    [
      299,
      2,
      [
        [300, 4],
        [301, 4, [[302, 6], [303, 6]]],
        [307, 4, [[308, 6], [311, 6], [314, 6]]]
      ]
    ]
  ]);
  var root_102 = add_locations(from_html(`<div class="auth-reminder-banner error svelte-cv3w9g"><span class="auth-icon svelte-cv3w9g">\u26A0</span> <span class="auth-message svelte-cv3w9g"> </span> <div class="auth-actions svelte-cv3w9g"><button class="auth-action svelte-cv3w9g">Retry</button> <button class="auth-action svelte-cv3w9g">Change auth / start new sign-in</button> <button class="auth-action secondary svelte-cv3w9g">Settings</button></div></div>`), AuthReminder[FILENAME], [
    [
      319,
      2,
      [[320, 4], [321, 4], [322, 4, [[323, 6], [324, 6], [325, 6]]]]
    ]
  ]);
  var root_133 = add_locations(from_html(`<button class="auth-action svelte-cv3w9g">Start device code sign-in</button> <button class="auth-action svelte-cv3w9g">Change auth / start new sign-in</button>`, 1), AuthReminder[FILENAME], [[338, 8], [341, 8]]);
  var root_143 = add_locations(from_html(`<button class="auth-action svelte-cv3w9g">Retry</button>`), AuthReminder[FILENAME], [[345, 8]]);
  var root_123 = add_locations(from_html(`<div class="auth-reminder-banner error svelte-cv3w9g"><span class="auth-icon svelte-cv3w9g">\u26A0\uFE0F</span> <div class="auth-message svelte-cv3w9g"><strong class="svelte-cv3w9g">Authentication Required</strong> <span class="error-detail svelte-cv3w9g"> </span></div> <div class="auth-actions svelte-cv3w9g"><!> <button class="auth-action secondary svelte-cv3w9g">Settings</button></div></div>`), AuthReminder[FILENAME], [
    [
      330,
      2,
      [
        [331, 4],
        [332, 4, [[333, 6], [334, 6]]],
        [336, 4, [[347, 6]]]
      ]
    ]
  ]);
  function AuthReminder($$anchor, $$props) {
    check_target(new.target);
    push($$props, true, AuthReminder);
    const deviceCodeSession = tag(user_derived(() => $$props.context?.deviceCodeSession), "deviceCodeSession");
    const deviceCodeRemainingMs = tag(
      user_derived(() => get(deviceCodeSession) ? Math.max(get(deviceCodeSession).expiresAt - Date.now(), 0) : 0),
      "deviceCodeRemainingMs"
    );
    const deviceCodeExpiresInMinutes = tag(user_derived(() => get(deviceCodeSession) ? Math.ceil(get(deviceCodeRemainingMs) / 6e4) : 0), "deviceCodeExpiresInMinutes");
    const deviceCodeExpired = tag(user_derived(() => get(deviceCodeSession) ? get(deviceCodeRemainingMs) <= 0 : true), "deviceCodeExpired");
    const authCodeFlowSession = tag(user_derived(() => $$props.context?.authCodeFlowSession), "authCodeFlowSession");
    const authCodeFlowRemainingMs = tag(
      user_derived(() => get(authCodeFlowSession) ? Math.max(get(authCodeFlowSession).expiresAt - Date.now(), 0) : 0),
      "authCodeFlowRemainingMs"
    );
    const authCodeFlowExpiresInMinutes = tag(user_derived(() => get(authCodeFlowSession) ? Math.ceil(get(authCodeFlowRemainingMs) / 6e4) : 0), "authCodeFlowExpiresInMinutes");
    const authCodeFlowExpired = tag(user_derived(() => get(authCodeFlowSession) ? get(authCodeFlowRemainingMs) <= 0 : true), "authCodeFlowExpired");
    const workItemsError = tag(user_derived(() => $$props.context?.workItemsError), "workItemsError");
    const workItemsErrorConnectionId = tag(user_derived(() => $$props.context?.workItemsErrorConnectionId), "workItemsErrorConnectionId");
    const activeConnectionId = tag(user_derived(() => $$props.context?.activeConnectionId), "activeConnectionId");
    const uiState = tag(user_derived(() => $$props.context?.ui), "uiState");
    const connectionHealth = tag(user_derived(() => get(uiState)?.connectionHealth), "connectionHealth");
    const connectionHealthError = tag(user_derived(() => get(connectionHealth)?.lastError), "connectionHealthError");
    const hasConnectionHealthError = tag(user_derived(() => strict_equals(get(connectionHealth)?.status, "error") && get(connectionHealthError) && strict_equals(get(connectionHealthError).type, "authentication")), "hasConnectionHealthError");
    const pendingAuthReminders = tag(user_derived(() => $$props.context?.pendingAuthReminders), "pendingAuthReminders");
    const currentAuthReminder = tag(
      user_derived(() => get(pendingAuthReminders) && get(activeConnectionId) ? get(pendingAuthReminders) instanceof Map ? get(pendingAuthReminders).get(get(activeConnectionId)) : get(pendingAuthReminders)[get(activeConnectionId)] : void 0),
      "currentAuthReminder"
    );
    const connections = tag(user_derived(() => $$props.context?.connections || []), "connections");
    const activeConnection = tag(user_derived(() => get(connections).find((c) => strict_equals(c.id, get(activeConnectionId)))), "activeConnection");
    const isEntraAuth = tag(user_derived(() => strict_equals(get(activeConnection)?.authMethod, "entra")), "isEntraAuth");
    const showPatError = tag(user_derived(() => get(workItemsError) && strict_equals(get(workItemsErrorConnectionId), get(activeConnectionId)) && !get(
      isEntraAuth
      // Don't show PAT error for Entra connections
    )), "showPatError");
    const showWorkItemsEntraAuthError = tag(user_derived(() => get(workItemsError) && strict_equals(get(workItemsErrorConnectionId), get(activeConnectionId)) && get(isEntraAuth)), "showWorkItemsEntraAuthError");
    const canShowDeviceCodeBase = tag(user_derived(() => get(deviceCodeSession) && !get(deviceCodeExpired) && strict_equals(get(deviceCodeSession).connectionId, get(activeConnectionId))), "canShowDeviceCodeBase");
    const canShowAuthCodeFlowBase = tag(user_derived(() => get(authCodeFlowSession) && !get(authCodeFlowExpired) && strict_equals(get(authCodeFlowSession).connectionId, get(activeConnectionId))), "canShowAuthCodeFlowBase");
    const entraAuthErrorEligible = tag(user_derived(() => get(hasConnectionHealthError) && !!get(activeConnectionId) && get(isEntraAuth)), "entraAuthErrorEligible");
    const showAuthCodeFlow = tag(user_derived(() => Boolean(get(canShowAuthCodeFlowBase))), "showAuthCodeFlow");
    const showDeviceCode = tag(user_derived(() => Boolean(get(canShowDeviceCodeBase) && !get(showAuthCodeFlow))), "showDeviceCode");
    const showEntraAuthError = tag(user_derived(() => Boolean(get(entraAuthErrorEligible) && !get(showDeviceCode) && !get(showAuthCodeFlow))), "showEntraAuthError");
    const showAuthReminder = tag(user_derived(() => Boolean(get(currentAuthReminder) && !get(showAuthCodeFlow) && !get(showDeviceCode) && !get(showEntraAuthError) && !get(showWorkItemsEntraAuthError) && !get(showPatError))), "showAuthReminder");
    function copyAndOpenDeviceCode() {
      if (!get(deviceCodeSession)) return;
      $$props.sendEvent({
        type: "OPEN_DEVICE_CODE_BROWSER",
        connectionId: get(deviceCodeSession).connectionId
      });
    }
    function copyDeviceCodeOnly() {
      if (!get(deviceCodeSession)) return;
      $$props.sendEvent({
        type: "COPY_DEVICE_CODE",
        connectionId: get(deviceCodeSession).connectionId
      });
    }
    function handleRetry() {
      $$props.sendEvent({ type: "REFRESH_DATA" });
    }
    function handleOpenSettings() {
      $$props.sendEvent({ type: "OPEN_SETTINGS" });
    }
    function handleResetAuth() {
      if (get(activeConnectionId)) {
        $$props.sendEvent({ type: "RESET_AUTH", connectionId: get(activeConnectionId) });
      } else {
        $$props.sendEvent({ type: "RESET_AUTH" });
      }
    }
    function handleCancelDeviceCode() {
      if (get(deviceCodeSession)) {
        $$props.sendEvent({
          type: "SIGN_OUT_ENTRA",
          connectionId: get(deviceCodeSession).connectionId
        });
      }
    }
    function handleOpenAuthCodeFlowBrowser() {
      if (!get(authCodeFlowSession)) return;
      $$props.sendEvent({
        type: "OPEN_AUTH_CODE_FLOW_BROWSER",
        connectionId: get(authCodeFlowSession).connectionId
      });
    }
    function handleCancelAuthCodeFlow() {
      if (get(authCodeFlowSession)) {
        $$props.sendEvent({
          type: "SIGN_OUT_ENTRA",
          connectionId: get(authCodeFlowSession).connectionId
        });
      }
    }
    function handleStartFreshAuth() {
      handleResetAuth();
    }
    function startDeviceCodeSignIn() {
      if (!get(isEntraAuth)) return;
      const connectionId = get(deviceCodeSession)?.connectionId ?? get(activeConnectionId);
      if (!connectionId) return;
      $$props.sendEvent({ type: "SIGN_IN_ENTRA", connectionId, forceInteractive: true });
    }
    var $$exports = { ...legacy_api() };
    var fragment = comment();
    var node = first_child(fragment);
    {
      var consequent = ($$anchor2) => {
        var div = root_110();
        var div_1 = sibling(child(div), 2);
        var span = child(div_1);
        var text2 = child(span);
        reset(span);
        reset(div_1);
        var div_2 = sibling(div_1, 2);
        var button = child(div_2);
        button.__click = handleOpenAuthCodeFlowBrowser;
        var button_1 = sibling(button, 2);
        button_1.__click = handleCancelAuthCodeFlow;
        reset(div_2);
        reset(div);
        template_effect(() => set_text(text2, `Authentication Required: Complete sign-in in your browser (${get(authCodeFlowExpiresInMinutes) ?? ""}m left)`));
        append($$anchor2, div);
      };
      var alternate_5 = ($$anchor2) => {
        var fragment_1 = comment();
        var node_1 = first_child(fragment_1);
        {
          var consequent_1 = ($$anchor3) => {
            var div_3 = root_35();
            var div_4 = sibling(child(div_3), 2);
            var span_1 = child(div_4);
            var strong = sibling(child(span_1));
            var text_1 = child(strong, true);
            reset(strong);
            var text_2 = sibling(strong);
            reset(span_1);
            reset(div_4);
            var div_5 = sibling(div_4, 2);
            var button_2 = child(div_5);
            button_2.__click = copyDeviceCodeOnly;
            var button_3 = sibling(button_2, 2);
            button_3.__click = copyAndOpenDeviceCode;
            var button_4 = sibling(button_3, 2);
            button_4.__click = handleCancelDeviceCode;
            reset(div_5);
            reset(div_3);
            template_effect(() => {
              set_text(text_1, get(deviceCodeSession).userCode);
              set_text(text_2, ` in your
        browser (${get(deviceCodeExpiresInMinutes) ?? ""}m left)`);
            });
            append($$anchor3, div_3);
          };
          var alternate_4 = ($$anchor3) => {
            var fragment_2 = comment();
            var node_2 = first_child(fragment_2);
            {
              var consequent_3 = ($$anchor4) => {
                var div_6 = root_54();
                var div_7 = sibling(child(div_6), 2);
                var span_2 = sibling(child(div_7), 2);
                var text_3 = child(span_2, true);
                reset(span_2);
                var node_3 = sibling(span_2, 2);
                {
                  var consequent_2 = ($$anchor5) => {
                    var span_3 = root_64();
                    var text_4 = child(span_3);
                    reset(span_3);
                    template_effect(() => set_text(text_4, `Suggested: ${get(connectionHealthError).suggestedAction ?? ""}`));
                    append($$anchor5, span_3);
                  };
                  add_svelte_meta(
                    () => if_block(node_3, ($$render) => {
                      if (get(connectionHealthError)?.suggestedAction) $$render(consequent_2);
                    }),
                    "if",
                    AuthReminder,
                    283,
                    6
                  );
                }
                reset(div_7);
                var div_8 = sibling(div_7, 2);
                var button_5 = child(div_8);
                button_5.__click = startDeviceCodeSignIn;
                var button_6 = sibling(button_5, 2);
                button_6.__click = handleStartFreshAuth;
                var button_7 = sibling(button_6, 2);
                button_7.__click = handleOpenSettings;
                reset(div_8);
                reset(div_6);
                template_effect(() => set_text(text_3, get(connectionHealthError)?.message || "Entra ID authentication failed. Start a new sign-in to choose PAT or begin device code again."));
                append($$anchor4, div_6);
              };
              var alternate_3 = ($$anchor4) => {
                var fragment_3 = comment();
                var node_4 = first_child(fragment_3);
                {
                  var consequent_4 = ($$anchor5) => {
                    var div_9 = root_82();
                    var div_10 = sibling(child(div_9), 2);
                    var span_4 = sibling(child(div_10), 2);
                    var text_5 = child(span_4, true);
                    reset(span_4);
                    reset(div_10);
                    var div_11 = sibling(div_10, 2);
                    var button_8 = child(div_11);
                    button_8.__click = startDeviceCodeSignIn;
                    var button_9 = sibling(button_8, 2);
                    button_9.__click = handleStartFreshAuth;
                    var button_10 = sibling(button_9, 2);
                    button_10.__click = handleOpenSettings;
                    reset(div_11);
                    reset(div_9);
                    template_effect(() => set_text(text_5, get(workItemsError) || "Authentication failed. Start a new sign-in to choose PAT or device code."));
                    append($$anchor5, div_9);
                  };
                  var alternate_2 = ($$anchor5) => {
                    var fragment_4 = comment();
                    var node_5 = first_child(fragment_4);
                    {
                      var consequent_5 = ($$anchor6) => {
                        var div_12 = root_102();
                        var span_5 = sibling(child(div_12), 2);
                        var text_6 = child(span_5, true);
                        reset(span_5);
                        var div_13 = sibling(span_5, 2);
                        var button_11 = child(div_13);
                        button_11.__click = handleRetry;
                        var button_12 = sibling(button_11, 2);
                        button_12.__click = handleStartFreshAuth;
                        var button_13 = sibling(button_12, 2);
                        button_13.__click = handleOpenSettings;
                        reset(div_13);
                        reset(div_12);
                        template_effect(() => set_text(text_6, get(workItemsError)));
                        append($$anchor6, div_12);
                      };
                      var alternate_1 = ($$anchor6) => {
                        var fragment_5 = comment();
                        var node_6 = first_child(fragment_5);
                        {
                          var consequent_7 = ($$anchor7) => {
                            var div_14 = root_123();
                            var div_15 = sibling(child(div_14), 2);
                            var span_6 = sibling(child(div_15), 2);
                            var text_7 = child(span_6, true);
                            reset(span_6);
                            reset(div_15);
                            var div_16 = sibling(div_15, 2);
                            var node_7 = child(div_16);
                            {
                              var consequent_6 = ($$anchor8) => {
                                var fragment_6 = root_133();
                                var button_14 = first_child(fragment_6);
                                button_14.__click = startDeviceCodeSignIn;
                                var button_15 = sibling(button_14, 2);
                                button_15.__click = handleStartFreshAuth;
                                append($$anchor8, fragment_6);
                              };
                              var alternate = ($$anchor8) => {
                                var button_16 = root_143();
                                button_16.__click = handleRetry;
                                append($$anchor8, button_16);
                              };
                              add_svelte_meta(
                                () => if_block(node_7, ($$render) => {
                                  if (get(isEntraAuth)) $$render(consequent_6);
                                  else $$render(alternate, false);
                                }),
                                "if",
                                AuthReminder,
                                337,
                                6
                              );
                            }
                            var button_17 = sibling(node_7, 2);
                            button_17.__click = handleOpenSettings;
                            reset(div_16);
                            reset(div_14);
                            template_effect(() => set_text(text_7, get(currentAuthReminder)?.reason || "Sign in to continue."));
                            append($$anchor7, div_14);
                          };
                          add_svelte_meta(
                            () => if_block(
                              node_6,
                              ($$render) => {
                                if (get(showAuthReminder)) $$render(consequent_7);
                              },
                              true
                            ),
                            "if",
                            AuthReminder,
                            328,
                            0
                          );
                        }
                        append($$anchor6, fragment_5);
                      };
                      add_svelte_meta(
                        () => if_block(
                          node_5,
                          ($$render) => {
                            if (get(showPatError)) $$render(consequent_5);
                            else $$render(alternate_1, false);
                          },
                          true
                        ),
                        "if",
                        AuthReminder,
                        317,
                        0
                      );
                    }
                    append($$anchor5, fragment_4);
                  };
                  add_svelte_meta(
                    () => if_block(
                      node_4,
                      ($$render) => {
                        if (get(showWorkItemsEntraAuthError)) $$render(consequent_4);
                        else $$render(alternate_2, false);
                      },
                      true
                    ),
                    "if",
                    AuthReminder,
                    297,
                    0
                  );
                }
                append($$anchor4, fragment_3);
              };
              add_svelte_meta(
                () => if_block(
                  node_2,
                  ($$render) => {
                    if (get(showEntraAuthError)) $$render(consequent_3);
                    else $$render(alternate_3, false);
                  },
                  true
                ),
                "if",
                AuthReminder,
                274,
                0
              );
            }
            append($$anchor3, fragment_2);
          };
          add_svelte_meta(
            () => if_block(
              node_1,
              ($$render) => {
                if (get(showDeviceCode)) $$render(consequent_1);
                else $$render(alternate_4, false);
              },
              true
            ),
            "if",
            AuthReminder,
            234,
            0
          );
        }
        append($$anchor2, fragment_1);
      };
      add_svelte_meta(
        () => if_block(node, ($$render) => {
          if (get(showAuthCodeFlow)) $$render(consequent);
          else $$render(alternate_5, false);
        }),
        "if",
        AuthReminder,
        204,
        0
      );
    }
    append($$anchor, fragment);
    return pop($$exports);
  }
  delegate(["click"]);

  // src/webview/components/WebviewHeader.svelte
  WebviewHeader[FILENAME] = "src/webview/components/WebviewHeader.svelte";
  var root_111 = add_locations(from_html(`<button class="header-btn svelte-1bw0sfy" title="Toggle Debug View" aria-label="Toggle Debug View"><span class="codicon svelte-1bw0sfy">\u{1F41B}</span></button>`), WebviewHeader[FILENAME], [[91, 6, [[97, 8]]]]);
  var root10 = add_locations(from_html(`<header class="webview-header svelte-1bw0sfy"><div class="header-actions svelte-1bw0sfy"><button class="header-btn svelte-1bw0sfy" title="Toggle Kanban View" aria-label="Toggle Kanban View"><span class="codicon svelte-1bw0sfy">\u268F</span></button> <button title="Refresh Work Items (R)" aria-label="Refresh Work Items"><span class="codicon svelte-1bw0sfy">\u21BB</span></button> <button class="header-btn svelte-1bw0sfy" title="Create Work Item" aria-label="Create Work Item"><span class="codicon svelte-1bw0sfy">\uFF0B</span></button> <button class="header-btn svelte-1bw0sfy" title="Setup or Manage Connections" aria-label="Setup or Manage Connections"><span class="codicon svelte-1bw0sfy">\u2699</span></button> <!></div></header>`), WebviewHeader[FILENAME], [
    [
      47,
      0,
      [
        [
          48,
          2,
          [
            [50, 4, [[56, 6]]],
            [60, 4, [[66, 6]]],
            [70, 4, [[76, 6]]],
            [80, 4, [[86, 6]]]
          ]
        ]
      ]
    ]
  ]);
  function WebviewHeader($$anchor, $$props) {
    check_target(new.target);
    push($$props, true, WebviewHeader);
    let isRefreshing = tag(state(false), "isRefreshing");
    function handleRefresh() {
      set(isRefreshing, true);
      $$props.sendEvent?.({ type: "REFRESH_DATA" });
      setTimeout(
        () => {
          set(isRefreshing, false);
        },
        500
      );
    }
    function handleToggleKanban() {
      $$props.sendEvent?.({ type: "TOGGLE_VIEW" });
    }
    function handleCreateWorkItem() {
      $$props.sendEvent?.({ type: "CREATE_WORK_ITEM" });
    }
    function handleSetup() {
      $$props.sendEvent?.({ type: "MANAGE_CONNECTIONS" });
    }
    function handleToggleDebug() {
      $$props.sendEvent?.({ type: "TOGGLE_DEBUG_VIEW" });
    }
    const showDebugButton = tag(user_derived(() => strict_equals($$props.context?.debugLoggingEnabled, true)), "showDebugButton");
    var $$exports = { ...legacy_api() };
    var header = root10();
    var div = child(header);
    var button = child(div);
    button.__click = handleToggleKanban;
    var button_1 = sibling(button, 2);
    button_1.__click = handleRefresh;
    var button_2 = sibling(button_1, 2);
    button_2.__click = handleCreateWorkItem;
    var button_3 = sibling(button_2, 2);
    button_3.__click = handleSetup;
    var node = sibling(button_3, 2);
    {
      var consequent = ($$anchor2) => {
        var button_4 = root_111();
        button_4.__click = handleToggleDebug;
        append($$anchor2, button_4);
      };
      add_svelte_meta(
        () => if_block(node, ($$render) => {
          if (get(showDebugButton)) $$render(consequent);
        }),
        "if",
        WebviewHeader,
        90,
        4
      );
    }
    reset(div);
    reset(header);
    template_effect(() => set_class(button_1, 1, `header-btn ${get(isRefreshing) ? "refreshing" : ""}`, "svelte-1bw0sfy"));
    append($$anchor, header);
    return pop($$exports);
  }
  delegate(["click"]);

  // src/webview/components/Notification.svelte
  Notification[FILENAME] = "src/webview/components/Notification.svelte";
  var root11 = add_locations(from_html(`<div role="alert"><span class="message svelte-1eagtgd"> </span> <button class="close-btn svelte-1eagtgd" aria-label="Close">\xD7</button></div>`), Notification[FILENAME], [[19, 0, [[20, 2], [21, 2]]]]);
  function Notification($$anchor, $$props) {
    check_target(new.target);
    push($$props, false, Notification);
    let type2 = prop($$props, "type", 8, "info");
    let message = prop($$props, "message", 8);
    const dispatch = createEventDispatcher();
    function dismiss() {
      dispatch("dismiss");
    }
    if (strict_equals(type2(), "success") || strict_equals(type2(), "info")) {
      setTimeout(dismiss, 5e3);
    }
    var $$exports = { ...legacy_api() };
    init();
    var div = root11();
    var span = child(div);
    var text2 = child(span, true);
    reset(span);
    var button = sibling(span, 2);
    reset(div);
    template_effect(() => {
      set_class(div, 1, `notification ${type2() ?? ""}`, "svelte-1eagtgd");
      set_text(text2, message());
    });
    event("click", button, dismiss);
    append($$anchor, div);
    return pop($$exports);
  }

  // src/webview/components/ComposeCommentDialog.svelte
  ComposeCommentDialog[FILENAME] = "src/webview/components/ComposeCommentDialog.svelte";
  var root12 = add_locations(from_html(`<div class="modal-overlay svelte-w8xrzn"><div class="modal svelte-w8xrzn" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h3 id="modal-title" class="svelte-w8xrzn"> </h3> <div class="content"><textarea placeholder="Type your comment here..." rows="5" class="svelte-w8xrzn"></textarea></div> <div class="actions svelte-w8xrzn"><button class="secondary svelte-w8xrzn">Cancel</button> <button class="primary svelte-w8xrzn"> </button></div></div></div>`), ComposeCommentDialog[FILENAME], [
    [
      23,
      0,
      [
        [
          24,
          2,
          [[25, 4], [27, 4, [[28, 6]]], [36, 4, [[37, 6], [38, 6]]]]
        ]
      ]
    ]
  ]);
  function ComposeCommentDialog($$anchor, $$props) {
    check_target(new.target);
    push($$props, false, ComposeCommentDialog);
    let workItemId = prop($$props, "workItemId", 8);
    let mode = prop($$props, "mode", 8, "addComment");
    let comment2 = mutable_source("");
    let isSubmitting = mutable_source(false);
    const dispatch = createEventDispatcher();
    function cancel() {
      dispatch("cancel");
    }
    function submit() {
      if (!get(comment2).trim()) return;
      set(isSubmitting, true);
      dispatch("submit", {
        workItemId: workItemId(),
        comment: get(comment2),
        mode: mode()
      });
    }
    var $$exports = { ...legacy_api() };
    init();
    var div = root12();
    var div_1 = child(div);
    var h3 = child(div_1);
    var text2 = child(h3);
    reset(h3);
    var div_2 = sibling(h3, 2);
    var textarea = child(div_2);
    remove_textarea_child(textarea);
    reset(div_2);
    var div_3 = sibling(div_2, 2);
    var button = child(div_3);
    var button_1 = sibling(button, 2);
    var text_1 = child(button_1, true);
    reset(button_1);
    reset(div_3);
    reset(div_1);
    reset(div);
    template_effect(
      ($0) => {
        set_text(text2, `Add Comment to Work Item #${workItemId() ?? ""}`);
        textarea.disabled = get(isSubmitting);
        button.disabled = get(isSubmitting);
        button_1.disabled = $0;
        set_text(text_1, get(isSubmitting) ? "Submitting..." : "Add Comment");
      },
      [
        () => (get(isSubmitting), get(comment2), untrack(() => get(isSubmitting) || !get(comment2).trim()))
      ]
    );
    bind_value(
      textarea,
      function get3() {
        return get(comment2);
      },
      function set3($$value) {
        set(comment2, $$value);
      }
    );
    event("click", button, cancel);
    event("click", button_1, submit);
    append($$anchor, div);
    return pop($$exports);
  }

  // src/webview/components/HistoryControls.svelte
  HistoryControls[FILENAME] = "src/webview/components/HistoryControls.svelte";
  var root13 = add_locations(from_html(`<div class="history-controls svelte-11qegyq"><button class="history-button undo svelte-11qegyq" title="Undo last action (Ctrl+Z)">\u27F2 Undo</button> <button class="history-button redo svelte-11qegyq" title="Redo last action (Ctrl+Shift+Z)">\u27F3 Redo</button></div>`), HistoryControls[FILENAME], [[50, 0, [[51, 2], [59, 2]]]]);
  function HistoryControls($$anchor, $$props) {
    check_target(new.target);
    push($$props, true, HistoryControls);
    let canUndo = tag(state(proxy(history.canUndo())), "canUndo");
    let canRedo = tag(state(proxy(history.canRedo())), "canRedo");
    user_effect(() => {
      const interval = setInterval(
        () => {
          set(canUndo, history.canUndo(), true);
          set(canRedo, history.canRedo(), true);
        },
        100
      );
      return () => clearInterval(interval);
    });
    function handleUndo() {
      console.debug("[HistoryControls] Undo clicked");
      if (history.canUndo()) {
        const result = history.undo();
        console.debug(...log_if_contains_state("debug", "[HistoryControls] Undo result:", result));
        set(canUndo, history.canUndo(), true);
        set(canRedo, history.canRedo(), true);
      } else {
        console.debug("[HistoryControls] Cannot undo - no history");
      }
    }
    function handleRedo() {
      console.debug("[HistoryControls] Redo clicked");
      if (history.canRedo()) {
        const result = history.redo();
        console.debug(...log_if_contains_state("debug", "[HistoryControls] Redo result:", result));
        set(canUndo, history.canUndo(), true);
        set(canRedo, history.canRedo(), true);
      } else {
        console.debug("[HistoryControls] Cannot redo - at end of history");
      }
    }
    var $$exports = { ...legacy_api() };
    var div = root13();
    var button = child(div);
    button.__click = handleUndo;
    var button_1 = sibling(button, 2);
    button_1.__click = handleRedo;
    reset(div);
    template_effect(() => {
      button.disabled = !get(canUndo);
      button_1.disabled = !get(canRedo);
    });
    append($$anchor, div);
    return pop($$exports);
  }
  delegate(["click"]);

  // src/debugging/stateDiff.ts
  function diffStates(from, to, options = {}) {
    const { ignoreFields = [], deep = true, includeUnchanged = false } = options;
    const ignoreSet = new Set(ignoreFields);
    const diff = {
      added: {},
      removed: {},
      changed: {},
      unchanged: {}
    };
    const allKeys = /* @__PURE__ */ new Set([...Object.keys(from), ...Object.keys(to)]);
    for (const key2 of allKeys) {
      if (ignoreSet.has(key2)) {
        continue;
      }
      const fromValue = from[key2];
      const toValue = to[key2];
      if (!(key2 in from)) {
        diff.added[key2] = toValue;
      } else if (!(key2 in to)) {
        diff.removed[key2] = fromValue;
      } else {
        const isEqual = deep ? deepEqual(fromValue, toValue) : fromValue === toValue;
        if (isEqual) {
          if (includeUnchanged) {
            diff.unchanged[key2] = fromValue;
          }
        } else {
          diff.changed[key2] = { from: fromValue, to: toValue };
        }
      }
    }
    diff.summary = {
      totalFields: allKeys.size - ignoreSet.size,
      addedCount: Object.keys(diff.added).length,
      removedCount: Object.keys(diff.removed).length,
      changedCount: Object.keys(diff.changed).length,
      unchangedCount: Object.keys(diff.unchanged).length
    };
    return diff;
  }
  function deepEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    if (typeof a !== "object") return a === b;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key2 of keysA) {
      if (!keysB.includes(key2)) return false;
      if (!deepEqual(a[key2], b[key2])) return false;
    }
    return true;
  }
  function formatDiff(diff, options) {
    const maxDepth = options?.maxDepth || 3;
    const lines = [];
    lines.push("State Diff Summary:");
    lines.push(`  Total fields: ${diff.summary.totalFields}`);
    lines.push(`  Added: ${diff.summary.addedCount}`);
    lines.push(`  Removed: ${diff.summary.removedCount}`);
    lines.push(`  Changed: ${diff.summary.changedCount}`);
    lines.push(`  Unchanged: ${diff.summary.unchangedCount}`);
    lines.push("");
    if (diff.summary.addedCount > 0) {
      lines.push("Added Fields:");
      for (const [key2, value] of Object.entries(diff.added)) {
        lines.push(`  + ${key2}: ${formatValue(value, maxDepth)}`);
      }
      lines.push("");
    }
    if (diff.summary.removedCount > 0) {
      lines.push("Removed Fields:");
      for (const [key2, value] of Object.entries(diff.removed)) {
        lines.push(`  - ${key2}: ${formatValue(value, maxDepth)}`);
      }
      lines.push("");
    }
    if (diff.summary.changedCount > 0) {
      lines.push("Changed Fields:");
      for (const [key2, change] of Object.entries(diff.changed)) {
        lines.push(`  ~ ${key2}:`);
        lines.push(`    From: ${formatValue(change.from, maxDepth)}`);
        lines.push(`    To:   ${formatValue(change.to, maxDepth)}`);
      }
    }
    return lines.join("\n");
  }
  function formatValue(value, maxDepth, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
      return "...";
    }
    if (value === null) return "null";
    if (value === void 0) return "undefined";
    if (typeof value === "string") {
      return `"${value}"`;
    }
    if (typeof value === "object") {
      if (Array.isArray(value)) {
        if (value.length === 0) return "[]";
        if (value.length > 3) {
          return `[${value.slice(0, 3).map((v) => formatValue(v, maxDepth, currentDepth + 1)).join(", ")}, ...]`;
        }
        return `[${value.map((v) => formatValue(v, maxDepth, currentDepth + 1)).join(", ")}]`;
      }
      if (value instanceof Map) {
        if (value.size === 0) return "Map {}";
        const entries = Array.from(value.entries()).slice(0, 3);
        const formatted = entries.map(
          ([k, v]) => `${formatValue(k, maxDepth, currentDepth + 1)}: ${formatValue(v, maxDepth, currentDepth + 1)}`
        ).join(", ");
        return value.size > 3 ? `Map { ${formatted}, ... }` : `Map { ${formatted} }`;
      }
      const keys = Object.keys(value);
      if (keys.length === 0) return "{}";
      if (keys.length > 3) {
        const preview = keys.slice(0, 3).map((k) => `${k}: ${formatValue(value[k], maxDepth, currentDepth + 1)}`).join(", ");
        return `{ ${preview}, ... }`;
      }
      return `{ ${keys.map((k) => `${k}: ${formatValue(value[k], maxDepth, currentDepth + 1)}`).join(", ")} }`;
    }
    return String(value);
  }
  function getDiffSummary(diff) {
    const parts = [];
    if (diff.summary.addedCount > 0) {
      parts.push(`${diff.summary.addedCount} added`);
    }
    if (diff.summary.removedCount > 0) {
      parts.push(`${diff.summary.removedCount} removed`);
    }
    if (diff.summary.changedCount > 0) {
      parts.push(`${diff.summary.changedCount} changed`);
    }
    if (parts.length === 0) {
      return "No changes";
    }
    return parts.join(", ");
  }

  // src/webview/components/HistoryTimeline.svelte
  HistoryTimeline[FILENAME] = "src/webview/components/HistoryTimeline.svelte";
  var root_27 = add_locations(from_html(`<div class="entry-label svelte-uzfmon"> </div>`), HistoryTimeline[FILENAME], [[108, 12]]);
  var root_42 = add_locations(from_html(`<span class="event-tag svelte-uzfmon"> </span>`), HistoryTimeline[FILENAME], [[113, 16]]);
  var root_55 = add_locations(from_html(`<span class="event-more svelte-uzfmon"> </span>`), HistoryTimeline[FILENAME], [[116, 16]]);
  var root_36 = add_locations(from_html(`<div class="entry-events svelte-uzfmon"><!> <!></div>`), HistoryTimeline[FILENAME], [[111, 12]]);
  var root_65 = add_locations(from_html(`<button class="action-button svelte-uzfmon" title="Compare with previous">Diff</button>`), HistoryTimeline[FILENAME], [[124, 12]]);
  var root_112 = add_locations(from_html(`<div title="Click to jump to this snapshot"><div class="entry-index svelte-uzfmon"></div> <div class="entry-content svelte-uzfmon"><div class="entry-state svelte-uzfmon"> </div> <!> <!> <div class="entry-timestamp svelte-uzfmon"> </div></div> <div class="entry-actions svelte-uzfmon"><!></div></div>`), HistoryTimeline[FILENAME], [
    [
      97,
      6,
      [[104, 8], [105, 8, [[106, 10], [120, 10]]], [122, 8]]
    ]
  ]);
  var root_72 = add_locations(from_html(`<div class="diff-panel svelte-uzfmon"><div class="diff-header svelte-uzfmon"><h4 class="svelte-uzfmon">State Diff</h4> <button class="close-button svelte-uzfmon">\xD7</button></div> <div class="diff-content svelte-uzfmon"><div class="diff-summary svelte-uzfmon"> </div> <pre class="diff-text svelte-uzfmon"> </pre></div></div>`), HistoryTimeline[FILENAME], [
    [
      141,
      4,
      [
        [142, 6, [[143, 8], [144, 8]]],
        [146, 6, [[147, 8], [150, 8]]]
      ]
    ]
  ]);
  var root14 = add_locations(from_html(`<div class="history-timeline-container svelte-uzfmon"><div class="timeline-header svelte-uzfmon"><h3 class="svelte-uzfmon">State History Timeline</h3> <div class="timeline-controls svelte-uzfmon"><button class="control-button svelte-uzfmon" title="Clear history">Clear</button> <span class="history-count svelte-uzfmon"> </span></div></div> <div class="timeline-entries svelte-uzfmon"></div> <!></div>`), HistoryTimeline[FILENAME], [
    [
      78,
      0,
      [[79, 2, [[80, 4], [81, 4, [[82, 6], [89, 6]]]]], [95, 2]]
    ]
  ]);
  function HistoryTimeline($$anchor, $$props) {
    check_target(new.target);
    push($$props, true, HistoryTimeline);
    let historyEntries = tag(state(proxy(history.getHistory())), "historyEntries");
    let currentIndex = tag(state(get(historyEntries).length - 1), "currentIndex");
    let selectedIndex = tag(state(null), "selectedIndex");
    let showDiff = tag(state(false), "showDiff");
    let diffFromIndex = tag(state(null), "diffFromIndex");
    user_effect(() => {
      const interval = setInterval(
        () => {
          const newEntries = history.getHistory();
          if (strict_equals(newEntries.length, get(historyEntries).length, false)) {
            set(historyEntries, newEntries, true);
            set(currentIndex, get(historyEntries).length - 1);
          }
        },
        100
      );
      return () => clearInterval(interval);
    });
    function goToSnapshot(index2) {
      if (history.goToHistory(index2)) {
        set(currentIndex, index2, true);
        set(selectedIndex, index2, true);
      }
    }
    function compareSnapshots(index1, index2) {
      const entry1 = get(historyEntries)[index1];
      const entry2 = get(historyEntries)[index2];
      if (!entry1 || !entry2) return null;
      const diff = diffStates(entry1.state.context, entry2.state.context);
      return diff;
    }
    function showDiffBetween(index1, index2) {
      set(diffFromIndex, index1, true);
      set(selectedIndex, index2, true);
      set(showDiff, true);
    }
    function formatTimestamp(timestamp2) {
      return new Date(timestamp2).toLocaleTimeString();
    }
    function formatEventTag(tag2) {
      return tag2.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim();
    }
    const selectedDiff = tag(
      user_derived(() => {
        if (!get(showDiff) || strict_equals(get(diffFromIndex), null) || strict_equals(get(selectedIndex), null)) {
          return null;
        }
        return compareSnapshots(get(diffFromIndex), get(selectedIndex));
      }),
      "selectedDiff"
    );
    var $$exports = { ...legacy_api() };
    var div = root14();
    var div_1 = child(div);
    var div_2 = sibling(child(div_1), 2);
    var button = child(div_2);
    button.__click = () => history.clearHistory();
    var span = sibling(button, 2);
    var text2 = child(span);
    reset(span);
    reset(div_2);
    reset(div_1);
    var div_3 = sibling(div_1, 2);
    add_svelte_meta(
      () => each(div_3, 21, () => get(historyEntries), index, ($$anchor2, entry, index2) => {
        var div_4 = root_112();
        let classes;
        div_4.__click = () => goToSnapshot(index2);
        var div_5 = child(div_4);
        div_5.textContent = index2;
        var div_6 = sibling(div_5, 2);
        var div_7 = child(div_6);
        var text_1 = child(div_7, true);
        reset(div_7);
        var node = sibling(div_7, 2);
        {
          var consequent = ($$anchor3) => {
            var div_8 = root_27();
            var text_2 = child(div_8, true);
            reset(div_8);
            template_effect(() => set_text(text_2, get(entry).label));
            append($$anchor3, div_8);
          };
          add_svelte_meta(
            () => if_block(node, ($$render) => {
              if (get(entry).label) $$render(consequent);
            }),
            "if",
            HistoryTimeline,
            107,
            10
          );
        }
        var node_1 = sibling(node, 2);
        {
          var consequent_2 = ($$anchor3) => {
            var div_9 = root_36();
            var node_2 = child(div_9);
            add_svelte_meta(
              () => each(node_2, 17, () => get(entry).events.slice(0, 2), index, ($$anchor4, event2) => {
                var span_1 = root_42();
                var text_3 = child(span_1, true);
                reset(span_1);
                template_effect(($0) => set_text(text_3, $0), [() => formatEventTag(get(event2).tag)]);
                append($$anchor4, span_1);
              }),
              "each",
              HistoryTimeline,
              112,
              14
            );
            var node_3 = sibling(node_2, 2);
            {
              var consequent_1 = ($$anchor4) => {
                var span_2 = root_55();
                var text_4 = child(span_2);
                reset(span_2);
                template_effect(() => set_text(text_4, `+${get(entry).events.length - 2} more`));
                append($$anchor4, span_2);
              };
              add_svelte_meta(
                () => if_block(node_3, ($$render) => {
                  if (get(entry).events.length > 2) $$render(consequent_1);
                }),
                "if",
                HistoryTimeline,
                115,
                14
              );
            }
            reset(div_9);
            append($$anchor3, div_9);
          };
          add_svelte_meta(
            () => if_block(node_1, ($$render) => {
              if (get(entry).events && get(entry).events.length > 0) $$render(consequent_2);
            }),
            "if",
            HistoryTimeline,
            110,
            10
          );
        }
        var div_10 = sibling(node_1, 2);
        var text_5 = child(div_10, true);
        reset(div_10);
        reset(div_6);
        var div_11 = sibling(div_6, 2);
        var node_4 = child(div_11);
        {
          var consequent_3 = ($$anchor3) => {
            var button_1 = root_65();
            button_1.__click = (e) => {
              e.stopPropagation();
              showDiffBetween(index2 - 1, index2);
            };
            append($$anchor3, button_1);
          };
          add_svelte_meta(
            () => if_block(node_4, ($$render) => {
              if (index2 > 0) $$render(consequent_3);
            }),
            "if",
            HistoryTimeline,
            123,
            10
          );
        }
        reset(div_11);
        reset(div_4);
        template_effect(
          ($0) => {
            classes = set_class(div_4, 1, "timeline-entry svelte-uzfmon", null, classes, {
              active: strict_equals(index2, get(currentIndex)),
              selected: strict_equals(index2, get(selectedIndex))
            });
            set_text(text_1, get(entry).state.state);
            set_text(text_5, $0);
          },
          [() => formatTimestamp(get(entry).timestamp)]
        );
        append($$anchor2, div_4);
      }),
      "each",
      HistoryTimeline,
      96,
      4
    );
    reset(div_3);
    var node_5 = sibling(div_3, 2);
    {
      var consequent_4 = ($$anchor2) => {
        var div_12 = root_72();
        var div_13 = child(div_12);
        var button_2 = sibling(child(div_13), 2);
        button_2.__click = () => set(showDiff, false);
        reset(div_13);
        var div_14 = sibling(div_13, 2);
        var div_15 = child(div_14);
        var text_6 = child(div_15, true);
        reset(div_15);
        var pre = sibling(div_15, 2);
        var text_7 = child(pre, true);
        reset(pre);
        reset(div_14);
        reset(div_12);
        template_effect(
          ($0, $1) => {
            set_text(text_6, $0);
            set_text(text_7, $1);
          },
          [
            () => getDiffSummary(get(selectedDiff)),
            () => formatDiff(get(selectedDiff))
          ]
        );
        append($$anchor2, div_12);
      };
      add_svelte_meta(
        () => if_block(node_5, ($$render) => {
          if (get(showDiff) && get(selectedDiff) && strict_equals(get(diffFromIndex), null, false) && strict_equals(get(selectedIndex), null, false)) $$render(consequent_4);
        }),
        "if",
        HistoryTimeline,
        140,
        2
      );
    }
    reset(div);
    template_effect(() => set_text(text2, `${get(historyEntries).length ?? ""} snapshots`));
    append($$anchor, div);
    return pop($$exports);
  }
  delegate(["click"]);

  // src/debugging/performanceProfiler.ts
  var PerformanceProfiler = class {
    /**
     * Profile history and return performance metrics
     */
    static profileHistory() {
      const entries = history.getHistory();
      if (entries.length < 2) {
        return {
          transitions: [],
          summary: {
            totalTransitions: 0,
            averageTransitionTime: 0,
            slowestTransitions: [],
            fastestTransitions: [],
            totalDuration: 0,
            averageContextSize: 0
          }
        };
      }
      const transitions = [];
      for (let i = 1; i < entries.length; i++) {
        const prev = entries[i - 1];
        const curr = entries[i];
        const duration = curr.timestamp - prev.timestamp;
        const from = prev.state.state;
        const to = curr.state.state;
        const eventCount = curr.events?.length || 0;
        const contextSize = JSON.stringify(curr.state.context).length;
        transitions.push({
          from,
          to,
          duration,
          eventCount,
          contextSize,
          timestamp: curr.timestamp,
          label: curr.label
        });
      }
      const totalDuration = transitions.reduce((sum, t) => sum + t.duration, 0);
      const averageTransitionTime = transitions.length > 0 ? totalDuration / transitions.length : 0;
      const averageContextSize = transitions.length > 0 ? transitions.reduce((sum, t) => sum + t.contextSize, 0) / transitions.length : 0;
      const sortedByDuration = [...transitions].sort((a, b) => b.duration - a.duration);
      const slowestTransitions = sortedByDuration.slice(0, 10);
      const fastestTransitions = sortedByDuration.slice(-10).reverse();
      return {
        transitions,
        summary: {
          totalTransitions: transitions.length,
          averageTransitionTime,
          slowestTransitions,
          fastestTransitions,
          totalDuration,
          averageContextSize
        }
      };
    }
    /**
     * Get slow transitions (above threshold)
     */
    static getSlowTransitions(thresholdMs = 100) {
      const profile = this.profileHistory();
      return profile.transitions.filter((t) => t.duration > thresholdMs);
    }
    /**
     * Get transitions by state
     */
    static getTransitionsByState(state2) {
      const profile = this.profileHistory();
      return profile.transitions.filter((t) => t.from === state2 || t.to === state2);
    }
    /**
     * Get average transition time for a specific state transition
     */
    static getAverageTransitionTime(from, to) {
      const profile = this.profileHistory();
      const matching = profile.transitions.filter((t) => t.from === from && t.to === to);
      if (matching.length === 0) return 0;
      return matching.reduce((sum, t) => sum + t.duration, 0) / matching.length;
    }
    /**
     * Format performance profile for display
     */
    static formatProfile(profile) {
      const lines = [];
      lines.push("Performance Profile");
      lines.push("=".repeat(50));
      lines.push("");
      lines.push(`Total Transitions: ${profile.summary.totalTransitions}`);
      lines.push(`Average Transition Time: ${profile.summary.averageTransitionTime.toFixed(2)}ms`);
      lines.push(`Total Duration: ${profile.summary.totalDuration.toFixed(2)}ms`);
      lines.push(`Average Context Size: ${(profile.summary.averageContextSize / 1024).toFixed(2)}KB`);
      lines.push("");
      if (profile.summary.slowestTransitions.length > 0) {
        lines.push("Slowest Transitions:");
        lines.push("-".repeat(50));
        for (const transition2 of profile.summary.slowestTransitions) {
          lines.push(
            `  ${transition2.from} \u2192 ${transition2.to}: ${transition2.duration.toFixed(2)}ms (${transition2.eventCount} events, ${(transition2.contextSize / 1024).toFixed(2)}KB)`
          );
          if (transition2.label) {
            lines.push(`    Label: ${transition2.label}`);
          }
        }
        lines.push("");
      }
      if (profile.summary.fastestTransitions.length > 0) {
        lines.push("Fastest Transitions:");
        lines.push("-".repeat(50));
        for (const transition2 of profile.summary.fastestTransitions) {
          lines.push(
            `  ${transition2.from} \u2192 ${transition2.to}: ${transition2.duration.toFixed(2)}ms (${transition2.eventCount} events)`
          );
        }
      }
      return lines.join("\n");
    }
    /**
     * Export performance data as JSON
     */
    static exportProfile() {
      const profile = this.profileHistory();
      return JSON.stringify(profile, null, 2);
    }
  };

  // src/webview/components/PerformanceDashboard.svelte
  PerformanceDashboard[FILENAME] = "src/webview/components/PerformanceDashboard.svelte";
  var root_43 = add_locations(from_html(`<span class="transition-label svelte-1rs9uqy"> </span>`), PerformanceDashboard[FILENAME], [[110, 18]]);
  var root_37 = add_locations(from_html(`<div class="transition-item slow svelte-1rs9uqy"><div class="transition-header svelte-1rs9uqy"><span class="transition-states svelte-1rs9uqy"> </span> <span class="transition-duration slow svelte-1rs9uqy"> </span></div> <div class="transition-details svelte-1rs9uqy"><span> </span> <span> </span> <!></div></div>`), PerformanceDashboard[FILENAME], [
    [
      97,
      12,
      [
        [98, 14, [[99, 16], [102, 16]]],
        [106, 14, [[107, 16], [108, 16]]]
      ]
    ]
  ]);
  var root_28 = add_locations(from_html(`<div class="slow-transitions svelte-1rs9uqy"><h4 class="svelte-1rs9uqy"> </h4> <div class="transitions-list svelte-1rs9uqy"></div></div>`), PerformanceDashboard[FILENAME], [[93, 6, [[94, 8], [95, 8]]]]);
  var root_66 = add_locations(from_html(`<span class="transition-label svelte-1rs9uqy"> </span>`), PerformanceDashboard[FILENAME], [[136, 16]]);
  var root_56 = add_locations(from_html(`<div><div class="transition-header svelte-1rs9uqy"><span class="transition-states svelte-1rs9uqy"> </span> <span> </span></div> <div class="transition-details svelte-1rs9uqy"><span> </span> <span> </span> <!></div></div>`), PerformanceDashboard[FILENAME], [
    [
      123,
      10,
      [
        [124, 12, [[125, 14], [128, 14]]],
        [132, 12, [[133, 14], [134, 14]]]
      ]
    ]
  ]);
  var root_113 = add_locations(from_html(`<div class="dashboard-summary svelte-1rs9uqy"><div class="summary-item svelte-1rs9uqy"><span class="summary-label svelte-1rs9uqy">Total Transitions</span> <span class="summary-value svelte-1rs9uqy"> </span></div> <div class="summary-item svelte-1rs9uqy"><span class="summary-label svelte-1rs9uqy">Avg Transition</span> <span class="summary-value svelte-1rs9uqy"> </span></div> <div class="summary-item svelte-1rs9uqy"><span class="summary-label svelte-1rs9uqy">Total Duration</span> <span class="summary-value svelte-1rs9uqy"> </span></div> <div class="summary-item svelte-1rs9uqy"><span class="summary-label svelte-1rs9uqy">Avg Context Size</span> <span class="summary-value svelte-1rs9uqy"> </span></div></div> <!> <div class="all-transitions svelte-1rs9uqy"><h4 class="svelte-1rs9uqy">All Transitions</h4> <div class="transitions-list svelte-1rs9uqy"></div></div>`, 1), PerformanceDashboard[FILENAME], [
    [
      73,
      4,
      [
        [74, 6, [[75, 8], [76, 8]]],
        [78, 6, [[79, 8], [80, 8]]],
        [82, 6, [[83, 8], [84, 8]]],
        [86, 6, [[87, 8], [88, 8]]]
      ]
    ],
    [119, 4, [[120, 6], [121, 6]]]
  ]);
  var root_73 = add_locations(from_html(`<div class="no-data svelte-1rs9uqy"><p>No performance data available. Perform some actions to see metrics.</p></div>`), PerformanceDashboard[FILENAME], [[144, 4, [[145, 6]]]]);
  var root15 = add_locations(from_html(`<div class="performance-dashboard svelte-1rs9uqy"><div class="dashboard-header svelte-1rs9uqy"><h3 class="svelte-1rs9uqy">Performance Dashboard</h3> <div class="dashboard-controls svelte-1rs9uqy"><label><input type="checkbox"/> </label> <input type="range" min="0" max="1000" step="10" class="threshold-slider svelte-1rs9uqy"/> <span class="threshold-value svelte-1rs9uqy"> </span></div></div> <!></div>`), PerformanceDashboard[FILENAME], [
    [
      52,
      0,
      [
        [
          53,
          2,
          [[54, 4], [55, 4, [[56, 6, [[57, 8]]], [60, 6], [68, 6]]]]
        ]
      ]
    ]
  ]);
  function PerformanceDashboard($$anchor, $$props) {
    check_target(new.target);
    push($$props, true, PerformanceDashboard);
    let profile = tag(state(null), "profile");
    let threshold = tag(state(
      100
      // ms
    ), "threshold");
    let showSlowOnly = tag(state(false), "showSlowOnly");
    user_effect(() => {
      const interval = setInterval(
        () => {
          set(profile, PerformanceProfiler.profileHistory(), true);
        },
        1e3
      );
      return () => clearInterval(interval);
    });
    function formatDuration(ms) {
      if (ms < 1) return `${(ms * 1e3).toFixed(0)}\u03BCs`;
      if (ms < 1e3) return `${ms.toFixed(2)}ms`;
      return `${(ms / 1e3).toFixed(2)}s`;
    }
    function formatSize(bytes) {
      if (bytes < 1024) return `${bytes}B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
    }
    const displayedTransitions = tag(
      user_derived(() => {
        if (!get(profile)) return [];
        if (get(showSlowOnly)) {
          return get(profile).transitions.filter((t) => t.duration > get(threshold));
        }
        return get(profile).transitions;
      }),
      "displayedTransitions"
    );
    const slowTransitions = tag(
      user_derived(() => {
        if (!get(profile)) return [];
        return PerformanceProfiler.getSlowTransitions(get(threshold));
      }),
      "slowTransitions"
    );
    var $$exports = { ...legacy_api() };
    var div = root15();
    var div_1 = child(div);
    var div_2 = sibling(child(div_1), 2);
    var label = child(div_2);
    var input = child(label);
    remove_input_defaults(input);
    var text2 = sibling(input);
    reset(label);
    var input_1 = sibling(label, 2);
    remove_input_defaults(input_1);
    var span = sibling(input_1, 2);
    var text_1 = child(span);
    reset(span);
    reset(div_2);
    reset(div_1);
    var node = sibling(div_1, 2);
    {
      var consequent_3 = ($$anchor2) => {
        var fragment = root_113();
        var div_3 = first_child(fragment);
        var div_4 = child(div_3);
        var span_1 = sibling(child(div_4), 2);
        var text_2 = child(span_1, true);
        reset(span_1);
        reset(div_4);
        var div_5 = sibling(div_4, 2);
        var span_2 = sibling(child(div_5), 2);
        var text_3 = child(span_2, true);
        reset(span_2);
        reset(div_5);
        var div_6 = sibling(div_5, 2);
        var span_3 = sibling(child(div_6), 2);
        var text_4 = child(span_3, true);
        reset(span_3);
        reset(div_6);
        var div_7 = sibling(div_6, 2);
        var span_4 = sibling(child(div_7), 2);
        var text_5 = child(span_4, true);
        reset(span_4);
        reset(div_7);
        reset(div_3);
        var node_1 = sibling(div_3, 2);
        {
          var consequent_1 = ($$anchor3) => {
            var div_8 = root_28();
            var h4 = child(div_8);
            var text_6 = child(h4);
            reset(h4);
            var div_9 = sibling(h4, 2);
            add_svelte_meta(
              () => each(div_9, 21, () => get(slowTransitions), index, ($$anchor4, transition2) => {
                var div_10 = root_37();
                var div_11 = child(div_10);
                var span_5 = child(div_11);
                var text_7 = child(span_5);
                reset(span_5);
                var span_6 = sibling(span_5, 2);
                var text_8 = child(span_6, true);
                reset(span_6);
                reset(div_11);
                var div_12 = sibling(div_11, 2);
                var span_7 = child(div_12);
                var text_9 = child(span_7);
                reset(span_7);
                var span_8 = sibling(span_7, 2);
                var text_10 = child(span_8, true);
                reset(span_8);
                var node_2 = sibling(span_8, 2);
                {
                  var consequent = ($$anchor5) => {
                    var span_9 = root_43();
                    var text_11 = child(span_9, true);
                    reset(span_9);
                    template_effect(() => set_text(text_11, get(transition2).label));
                    append($$anchor5, span_9);
                  };
                  add_svelte_meta(
                    () => if_block(node_2, ($$render) => {
                      if (get(transition2).label) $$render(consequent);
                    }),
                    "if",
                    PerformanceDashboard,
                    109,
                    16
                  );
                }
                reset(div_12);
                reset(div_10);
                template_effect(
                  ($0, $1) => {
                    set_text(text_7, `${get(transition2).from ?? ""} \u2192 ${get(transition2).to ?? ""}`);
                    set_text(text_8, $0);
                    set_text(text_9, `${get(transition2).eventCount ?? ""} events`);
                    set_text(text_10, $1);
                  },
                  [
                    () => formatDuration(get(transition2).duration),
                    () => formatSize(get(transition2).contextSize)
                  ]
                );
                append($$anchor4, div_10);
              }),
              "each",
              PerformanceDashboard,
              96,
              10
            );
            reset(div_9);
            reset(div_8);
            template_effect(() => set_text(text_6, `Slow Transitions (> ${get(threshold) ?? ""}ms)`));
            append($$anchor3, div_8);
          };
          add_svelte_meta(
            () => if_block(node_1, ($$render) => {
              if (get(slowTransitions).length > 0) $$render(consequent_1);
            }),
            "if",
            PerformanceDashboard,
            92,
            4
          );
        }
        var div_13 = sibling(node_1, 2);
        var div_14 = sibling(child(div_13), 2);
        add_svelte_meta(
          () => each(div_14, 21, () => get(displayedTransitions), index, ($$anchor3, transition2) => {
            var div_15 = root_56();
            let classes;
            var div_16 = child(div_15);
            var span_10 = child(div_16);
            var text_12 = child(span_10);
            reset(span_10);
            var span_11 = sibling(span_10, 2);
            let classes_1;
            var text_13 = child(span_11, true);
            reset(span_11);
            reset(div_16);
            var div_17 = sibling(div_16, 2);
            var span_12 = child(div_17);
            var text_14 = child(span_12);
            reset(span_12);
            var span_13 = sibling(span_12, 2);
            var text_15 = child(span_13, true);
            reset(span_13);
            var node_3 = sibling(span_13, 2);
            {
              var consequent_2 = ($$anchor4) => {
                var span_14 = root_66();
                var text_16 = child(span_14, true);
                reset(span_14);
                template_effect(() => set_text(text_16, get(transition2).label));
                append($$anchor4, span_14);
              };
              add_svelte_meta(
                () => if_block(node_3, ($$render) => {
                  if (get(transition2).label) $$render(consequent_2);
                }),
                "if",
                PerformanceDashboard,
                135,
                14
              );
            }
            reset(div_17);
            reset(div_15);
            template_effect(
              ($0, $1) => {
                classes = set_class(div_15, 1, "transition-item svelte-1rs9uqy", null, classes, { slow: get(transition2).duration > get(threshold) });
                set_text(text_12, `${get(transition2).from ?? ""} \u2192 ${get(transition2).to ?? ""}`);
                classes_1 = set_class(span_11, 1, "transition-duration svelte-1rs9uqy", null, classes_1, { slow: get(transition2).duration > get(threshold) });
                set_text(text_13, $0);
                set_text(text_14, `${get(transition2).eventCount ?? ""} events`);
                set_text(text_15, $1);
              },
              [
                () => formatDuration(get(transition2).duration),
                () => formatSize(get(transition2).contextSize)
              ]
            );
            append($$anchor3, div_15);
          }),
          "each",
          PerformanceDashboard,
          122,
          8
        );
        reset(div_14);
        reset(div_13);
        template_effect(
          ($0, $1, $2) => {
            set_text(text_2, get(profile).summary.totalTransitions);
            set_text(text_3, $0);
            set_text(text_4, $1);
            set_text(text_5, $2);
          },
          [
            () => formatDuration(get(profile).summary.averageTransitionTime),
            () => formatDuration(get(profile).summary.totalDuration),
            () => formatSize(get(profile).summary.averageContextSize)
          ]
        );
        append($$anchor2, fragment);
      };
      var alternate = ($$anchor2) => {
        var div_18 = root_73();
        append($$anchor2, div_18);
      };
      add_svelte_meta(
        () => if_block(node, ($$render) => {
          if (get(profile)) $$render(consequent_3);
          else $$render(alternate, false);
        }),
        "if",
        PerformanceDashboard,
        72,
        2
      );
    }
    reset(div);
    template_effect(() => {
      set_text(text2, ` Show slow only (> ${get(threshold) ?? ""}ms)`);
      set_text(text_1, `${get(threshold) ?? ""}ms`);
    });
    bind_checked(
      input,
      function get3() {
        return get(showSlowOnly);
      },
      function set3($$value) {
        set(showSlowOnly, $$value);
      }
    );
    bind_value(
      input_1,
      function get3() {
        return get(threshold);
      },
      function set3($$value) {
        set(threshold, $$value);
      }
    );
    append($$anchor, div);
    return pop($$exports);
  }

  // src/webview/App.svelte
  App[FILENAME] = "src/webview/App.svelte";
  var root_44 = add_locations(from_html(`<div class="single-connection-header svelte-db2r4i"><span class="single-connection-label svelte-db2r4i" title="Active Connection"> </span></div>`), App[FILENAME], [[168, 6, [[169, 8]]]]);
  var root_57 = add_locations(from_html(`<div class="error-banner svelte-db2r4i"><span class="codicon codicon-error"></span> <span> </span> <button class="retry-btn svelte-db2r4i">Retry</button></div>`), App[FILENAME], [[177, 6, [[178, 8], [179, 8], [180, 8]]]]);
  var root_67 = add_locations(from_html(`<div class="debug-panel svelte-db2r4i" role="region" aria-label="Debug View"><h3 class="svelte-db2r4i">Debug View</h3> <pre class="debug-json svelte-db2r4i"> </pre></div> <div class="history-timeline-panel svelte-db2r4i"><!></div> <div class="performance-dashboard-panel svelte-db2r4i"><!></div>`, 1), App[FILENAME], [[194, 6, [[195, 8], [196, 8]]], [208, 6], [213, 6]]);
  var root_114 = add_locations(from_html(`<!> <div class="history-controls-container svelte-db2r4i"><!></div> <!> <!> <!> <!> <!> <!> <!>`, 1), App[FILENAME], [[158, 4]]);
  var root_103 = add_locations(from_html(`<div class="loading svelte-db2r4i"><p>Initializing Azure DevOps Integration...</p> <p class="sub-text">Waiting for connection data...</p> <p class="sub-text" style="font-size: 0.8em; margin-top: 10px;">If this persists, check the browser console (F12) for errors.</p></div>`), App[FILENAME], [[239, 6, [[240, 8], [241, 8], [242, 8]]]]);
  var root_134 = add_locations(from_html(`<p style="font-size: 0.9em; margin-top: 10px;"> </p>`), App[FILENAME], [[251, 10]]);
  var root_124 = add_locations(from_html(`<div class="error-container svelte-db2r4i"><h2>Connection Error</h2> <p> </p> <!> <button class="svelte-db2r4i">Retry</button></div>`), App[FILENAME], [[247, 6, [[248, 8], [249, 8], [255, 8]]]]);
  var root_144 = add_locations(from_html(`<div class="empty-state"><p>No connections configured.</p> <button class="svelte-db2r4i">Configure Connections</button> <div style="margin-top: 20px; font-size: 0.8em; color: var(--vscode-descriptionForeground); text-align: left;"><details><summary>Debug Info (v2)</summary> <pre> </pre></details></div></div>`), App[FILENAME], [
    [
      258,
      6,
      [
        [259, 8],
        [260, 8],
        [263, 8, [[264, 10, [[265, 12], [266, 12]]]]]
      ]
    ]
  ]);
  var root16 = add_locations(from_html(`<main class="svelte-db2r4i"><!></main>`), App[FILENAME], [[152, 0]]);
  function App($$anchor, $$props) {
    check_target(new.target);
    push($$props, true, App);
    console.debug("[webview] App.svelte initializing");
    let currentState = tag(state(proxy(get2(praxisStore))), "currentState");
    let snapshotState = tag(state(proxy(get2(applicationSnapshot))), "snapshotState");
    user_effect(() => {
      const unsubscribe = praxisStore.subscribe((value) => {
        set(currentState, value, true);
      });
      return unsubscribe;
    });
    user_effect(() => {
      const unsubscribe = applicationSnapshot.subscribe((snapshot2) => {
        set(snapshotState, snapshot2, true);
        if (snapshot2 && snapshot2.context && (!get(currentState)?.context || strict_equals(get(currentState).context.connections?.length, 0))) {
          set(
            currentState,
            {
              value: snapshot2.value || get(currentState)?.value,
              context: snapshot2.context,
              matches: snapshot2.matches || get(currentState)?.matches || {}
            },
            true
          );
        }
      });
      return unsubscribe;
    });
    const appContext = tag(
      user_derived(() => {
        const storeContext = get(currentState)?.context;
        const snapshotContext = get(snapshotState)?.context;
        if (storeContext && (storeContext.connections?.length > 0 || Object.keys(storeContext).length > 5)) {
          return storeContext;
        }
        if (snapshotContext && (snapshotContext.connections?.length > 0 || Object.keys(snapshotContext).length > 5)) {
          return snapshotContext;
        }
        return storeContext || snapshotContext || {};
      }),
      "appContext"
    );
    user_effect(() => {
      console.debug(...log_if_contains_state("debug", "[AzureDevOpsInt][webview] App reactive - context:", {
        appState: get(appContext)?.applicationState,
        connections: get(appContext)?.connections?.length,
        activeConnectionId: get(appContext)?.activeConnectionId,
        viewMode: get(appContext)?.viewMode
      }));
    });
    const vscode2 = window.__vscodeApi;
    function sendEvent(event2) {
      if (vscode2) {
        vscode2.postMessage({ type: "appEvent", event: event2 });
      }
    }
    const hasConnections = tag(user_derived(() => (get(appContext)?.connections?.length || 0) > 0), "hasConnections");
    const isActivating = tag(user_derived(() => strict_equals(get(appContext)?.applicationState, "activating") || strict_equals(get(appContext)?.applicationState, "initializing") || strict_equals(get(appContext)?.applicationState, "inactive")), "isActivating");
    const isActivationFailed = tag(user_derived(() => strict_equals(get(appContext)?.applicationState, "activation_error") || get(appContext)?.lastError || get(appContext)?.workItemsError && strict_equals(get(appContext)?.workItemsErrorConnectionId, get(appContext)?.activeConnectionId)), "isActivationFailed");
    const connectionsArray = tag(user_derived(() => get(appContext)?.connections || []), "connectionsArray");
    const activeId = tag(user_derived(() => get(appContext)?.activeConnectionId), "activeId");
    onMount(() => {
    });
    let localDebugViewVisible = tag(state(false), "localDebugViewVisible");
    user_effect(() => {
      if (strict_equals(get(appContext)?.debugViewVisible, void 0, false)) {
        set(localDebugViewVisible, get(appContext).debugViewVisible, true);
      }
    });
    function toggleDebugView() {
      set(localDebugViewVisible, !get(localDebugViewVisible));
      sendEvent({ type: "TOGGLE_DEBUG_VIEW" });
    }
    window.__toggleDebugView = toggleDebugView;
    var $$exports = { ...legacy_api() };
    var main = root16();
    var node = child(main);
    {
      var consequent_6 = ($$anchor2) => {
        var fragment = root_114();
        var node_1 = first_child(fragment);
        add_svelte_meta(
          () => WebviewHeader(node_1, {
            get context() {
              return get(appContext);
            },
            sendEvent
          }),
          "component",
          App,
          155,
          4,
          { componentTag: "WebviewHeader" }
        );
        var div = sibling(node_1, 2);
        var node_2 = child(div);
        add_svelte_meta(() => HistoryControls(node_2, {}), "component", App, 159, 6, { componentTag: "HistoryControls" });
        reset(div);
        var node_3 = sibling(div, 2);
        {
          var consequent = ($$anchor3) => {
            add_svelte_meta(
              () => ConnectionTabs($$anchor3, {
                get connections() {
                  return get(appContext).connections;
                },
                get activeConnectionId() {
                  return get(appContext).activeConnectionId;
                }
              }),
              "component",
              App,
              163,
              6,
              { componentTag: "ConnectionTabs" }
            );
          };
          var alternate = ($$anchor3) => {
            var fragment_2 = comment();
            var node_4 = first_child(fragment_2);
            {
              var consequent_1 = ($$anchor4) => {
                var div_1 = root_44();
                var span = child(div_1);
                var text2 = child(span, true);
                reset(span);
                reset(div_1);
                template_effect(($0) => set_text(text2, $0), [
                  () => get(connectionsArray).find((c) => strict_equals(c.id, get(activeId)))?.label || get(activeId)
                ]);
                append($$anchor4, div_1);
              };
              add_svelte_meta(
                () => if_block(
                  node_4,
                  ($$render) => {
                    if (get(activeId)) $$render(consequent_1);
                  },
                  true
                ),
                "if",
                App,
                167,
                4
              );
            }
            append($$anchor3, fragment_2);
          };
          add_svelte_meta(
            () => if_block(node_3, ($$render) => {
              if (get(connectionsArray).length > 1) $$render(consequent);
              else $$render(alternate, false);
            }),
            "if",
            App,
            162,
            4
          );
        }
        var node_5 = sibling(node_3, 2);
        {
          var consequent_2 = ($$anchor3) => {
            var div_2 = root_57();
            var span_1 = sibling(child(div_2), 2);
            var text_1 = child(span_1, true);
            reset(span_1);
            var button = sibling(span_1, 2);
            button.__click = () => sendEvent({ type: "RETRY" });
            reset(div_2);
            template_effect(() => set_text(text_1, get(appContext)?.lastError?.message || "Connection Error"));
            append($$anchor3, div_2);
          };
          add_svelte_meta(
            () => if_block(node_5, ($$render) => {
              if (get(isActivationFailed)) $$render(consequent_2);
            }),
            "if",
            App,
            176,
            4
          );
        }
        var node_6 = sibling(node_5, 2);
        add_svelte_meta(
          () => ConnectionViews(node_6, {
            get connections() {
              return get(connectionsArray);
            },
            get activeConnectionId() {
              return get(activeId);
            },
            get context() {
              return get(appContext);
            },
            matches: {},
            sendEvent
          }),
          "component",
          App,
          184,
          4,
          { componentTag: "ConnectionViews" }
        );
        var node_7 = sibling(node_6, 2);
        add_svelte_meta(
          () => AuthReminder(node_7, {
            get context() {
              return get(appContext);
            },
            sendEvent
          }),
          "component",
          App,
          192,
          4,
          { componentTag: "AuthReminder" }
        );
        var node_8 = sibling(node_7, 2);
        {
          var consequent_3 = ($$anchor3) => {
            var fragment_3 = root_67();
            var div_3 = first_child(fragment_3);
            var pre = sibling(child(div_3), 2);
            var text_2 = child(pre, true);
            reset(pre);
            reset(div_3);
            var div_4 = sibling(div_3, 2);
            var node_9 = child(div_4);
            add_svelte_meta(() => HistoryTimeline(node_9, {}), "component", App, 209, 8, { componentTag: "HistoryTimeline" });
            reset(div_4);
            var div_5 = sibling(div_4, 2);
            var node_10 = child(div_5);
            add_svelte_meta(() => PerformanceDashboard(node_10, {}), "component", App, 214, 8, { componentTag: "PerformanceDashboard" });
            reset(div_5);
            template_effect(($0) => set_text(text_2, $0), [
              () => JSON.stringify(
                {
                  appState: get(appContext).applicationState,
                  activeConnectionId: get(appContext).activeConnectionId,
                  viewMode: get(appContext).viewMode
                },
                null,
                2
              )
            ]);
            append($$anchor3, fragment_3);
          };
          add_svelte_meta(
            () => if_block(node_8, ($$render) => {
              if (get(appContext)?.debugLoggingEnabled && get(localDebugViewVisible)) $$render(consequent_3);
            }),
            "if",
            App,
            193,
            4
          );
        }
        var node_11 = sibling(node_8, 2);
        {
          var consequent_4 = ($$anchor3) => {
            add_svelte_meta(
              () => Notification($$anchor3, {
                get message() {
                  return get(appContext).ui.statusMessage.text;
                },
                get type() {
                  return get(appContext).ui.statusMessage.type;
                },
                $$events: { dismiss: () => sendEvent({ type: "DISMISS_NOTIFICATION" }) }
              }),
              "component",
              App,
              220,
              6,
              { componentTag: "Notification" }
            );
          };
          add_svelte_meta(
            () => if_block(node_11, ($$render) => {
              if (get(appContext)?.ui?.statusMessage) $$render(consequent_4);
            }),
            "if",
            App,
            219,
            4
          );
        }
        var node_12 = sibling(node_11, 2);
        {
          var consequent_5 = ($$anchor3) => {
            add_svelte_meta(
              () => ComposeCommentDialog($$anchor3, {
                get workItemId() {
                  return get(appContext).ui.modal.workItemId;
                },
                get mode() {
                  return get(appContext).ui.modal.mode;
                },
                $$events: {
                  cancel: () => sendEvent({ type: "DISMISS_DIALOG" }),
                  submit: (event2) => sendEvent({ type: "SUBMIT_COMMENT", ...event2.detail })
                }
              }),
              "component",
              App,
              228,
              6,
              { componentTag: "ComposeCommentDialog" }
            );
          };
          add_svelte_meta(
            () => if_block(node_12, ($$render) => {
              if (strict_equals(get(appContext)?.ui?.modal?.type, "composeComment")) $$render(consequent_5);
            }),
            "if",
            App,
            227,
            4
          );
        }
        append($$anchor2, fragment);
      };
      var alternate_3 = ($$anchor2) => {
        var fragment_6 = comment();
        var node_13 = first_child(fragment_6);
        {
          var consequent_7 = ($$anchor3) => {
            var div_6 = root_103();
            append($$anchor3, div_6);
          };
          var alternate_2 = ($$anchor3) => {
            var fragment_7 = comment();
            var node_14 = first_child(fragment_7);
            {
              var consequent_9 = ($$anchor4) => {
                var div_7 = root_124();
                var p = sibling(child(div_7), 2);
                var text_3 = child(p, true);
                reset(p);
                var node_15 = sibling(p, 2);
                {
                  var consequent_8 = ($$anchor5) => {
                    var p_1 = root_134();
                    var text_4 = child(p_1);
                    reset(p_1);
                    template_effect(() => set_text(text_4, `Connection: ${get(appContext).activeConnectionId ?? ""}`));
                    append($$anchor5, p_1);
                  };
                  add_svelte_meta(
                    () => if_block(node_15, ($$render) => {
                      if (get(appContext)?.activeConnectionId) $$render(consequent_8);
                    }),
                    "if",
                    App,
                    250,
                    8
                  );
                }
                var button_1 = sibling(node_15, 2);
                button_1.__click = () => sendEvent({ type: "RETRY" });
                reset(div_7);
                template_effect(() => set_text(text_3, get(appContext)?.workItemsError || get(appContext)?.lastError?.message || "Unknown error"));
                append($$anchor4, div_7);
              };
              var alternate_1 = ($$anchor4) => {
                var div_8 = root_144();
                var button_2 = sibling(child(div_8), 2);
                button_2.__click = () => sendEvent({ type: "OPEN_SETTINGS" });
                var div_9 = sibling(button_2, 2);
                var details = child(div_9);
                var pre_1 = sibling(child(details), 2);
                var text_5 = child(pre_1, true);
                reset(pre_1);
                reset(details);
                reset(div_9);
                reset(div_8);
                template_effect(($0) => set_text(text_5, $0), [
                  () => JSON.stringify(
                    {
                      hasConnections: get(hasConnections),
                      connectionsLength: get(appContext)?.connections?.length || 0,
                      appState: get(appContext)?.applicationState || "unknown",
                      activeConnectionId: get(appContext)?.activeConnectionId,
                      contextKeys: get(appContext) ? Object.keys(get(appContext)) : [],
                      rawConnections: get(appContext)?.connections || [],
                      hasAppContext: !!get(appContext),
                      storeValue: get(currentState)?.value,
                      snapshotValue: get2(applicationSnapshot)?.value
                    },
                    null,
                    2
                  )
                ]);
                append($$anchor4, div_8);
              };
              add_svelte_meta(
                () => if_block(
                  node_14,
                  ($$render) => {
                    if (get(isActivationFailed)) $$render(consequent_9);
                    else $$render(alternate_1, false);
                  },
                  true
                ),
                "if",
                App,
                246,
                4
              );
            }
            append($$anchor3, fragment_7);
          };
          add_svelte_meta(
            () => if_block(node_13, ($$render) => {
              if (get(isActivating) && (!get(appContext) || strict_equals(get(appContext).applicationState, "inactive"))) $$render(consequent_7);
              else $$render(alternate_2, false);
            }),
            "if",
            App,
            238,
            4
          );
        }
        append($$anchor2, fragment_6);
      };
      add_svelte_meta(
        () => if_block(node, ($$render) => {
          if (get(hasConnections)) $$render(consequent_6);
          else $$render(alternate_3, false);
        }),
        "if",
        App,
        153,
        2
      );
    }
    reset(main);
    append($$anchor, main);
    return pop($$exports);
  }
  delegate(["click"]);

  // src/logging.ts
  var LOG_BUFFER_MAX = 5e3;
  var outputChannel;
  var logBuffer = [];
  function logLine(text2) {
    try {
      outputChannel?.appendLine(text2);
    } catch {
    }
    try {
      logBuffer.push(text2);
      if (logBuffer.length > LOG_BUFFER_MAX) {
        logBuffer.splice(0, logBuffer.length - LOG_BUFFER_MAX);
      }
    } catch {
    }
  }

  // src/logging/StandardizedAutomaticLogger.ts
  var _StandardizedAutomaticLogger = class _StandardizedAutomaticLogger {
    constructor() {
      __publicField(this, "sessionId");
      __publicField(this, "entries", []);
      __publicField(this, "maxEntries", 1e4);
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
    static getInstance() {
      if (!_StandardizedAutomaticLogger.instance) {
        _StandardizedAutomaticLogger.instance = new _StandardizedAutomaticLogger();
      }
      return _StandardizedAutomaticLogger.instance;
    }
    /**
     * Format log message according to standard:
     * [azuredevops-integration-extension][{runtime}][{flowName}][{componentName}][{functionName}] {message}
     */
    formatMessage(context, message) {
      const prefix = "[azuredevops-integration-extension]";
      const runtime = `[${context.runtime}]`;
      const flow = `[${context.flowName}]`;
      const component2 = `[${context.componentName}]`;
      const functionPart = context.functionName ? `[${context.functionName}]` : "";
      return `${prefix}${runtime}${flow}${component2}${functionPart} ${message}`;
    }
    /**
     * Format metadata for logging
     */
    formatMeta(meta) {
      if (!meta || Object.keys(meta).length === 0) return "";
      try {
        return ` ${JSON.stringify(meta)}`;
      } catch {
        return " [unserializable meta]";
      }
    }
    /**
     * Determine runtime context automatically
     */
    detectRuntime() {
      if (typeof window !== "undefined" && typeof window.acquireVsCodeApi === "function") {
        return "webview";
      }
      if (typeof process !== "undefined" && process?.versions?.node) {
        return "ext";
      }
      return "ext";
    }
    /**
     * Core logging method
     */
    log(flowName, componentName, functionName, level, message, meta) {
      const runtime = this.detectRuntime();
      const context = {
        runtime,
        flowName,
        componentName,
        functionName
      };
      const entry = {
        context,
        level,
        message,
        meta,
        timestamp: Date.now(),
        sessionId: this.sessionId
      };
      this.entries.push(entry);
      if (this.entries.length > this.maxEntries) {
        this.entries = this.entries.slice(-this.maxEntries);
      }
      const formattedMessage = this.formatMessage(context, message);
      const metaText = this.formatMeta(meta);
      const fullMessage = `${formattedMessage}${metaText}`;
      logLine(fullMessage);
      switch (level) {
        case "error":
          console.error(fullMessage);
          break;
        case "warn":
          console.warn(fullMessage);
          break;
        case "debug":
          console.debug(fullMessage);
          break;
        default:
          console.log(fullMessage);
      }
    }
    /**
     * Convenience methods for each log level
     */
    debug(flowName, componentName, functionName, message, meta) {
      this.log(flowName, componentName, functionName, "debug", message, meta);
    }
    info(flowName, componentName, functionName, message, meta) {
      this.log(flowName, componentName, functionName, "info", message, meta);
    }
    warn(flowName, componentName, functionName, message, meta) {
      this.log(flowName, componentName, functionName, "warn", message, meta);
    }
    error(flowName, componentName, functionName, message, meta) {
      this.log(flowName, componentName, functionName, "error", message, meta);
    }
    /**
     * Get all log entries (for replay/export)
     */
    getEntries(filter) {
      let entries = [...this.entries];
      if (filter?.flowName) {
        entries = entries.filter((e) => e.context.flowName === filter.flowName);
      }
      if (filter?.componentName) {
        entries = entries.filter((e) => e.context.componentName === filter.componentName);
      }
      if (filter?.level) {
        entries = entries.filter((e) => e.level === filter.level);
      }
      return entries;
    }
    /**
     * Export session for replay
     */
    exportSession() {
      return [...this.entries];
    }
    /**
     * Clear all entries
     */
    clear() {
      this.entries = [];
    }
    /**
     * Get session ID
     */
    getSessionId() {
      return this.sessionId;
    }
  };
  __publicField(_StandardizedAutomaticLogger, "instance");
  var StandardizedAutomaticLogger = _StandardizedAutomaticLogger;
  var standardizedLogger = StandardizedAutomaticLogger.getInstance();

  // src/logging/MessageInterceptor.ts
  function interceptPostMessage(vscodeApi, component2 = "webview") {
    const originalPostMessage = vscodeApi.postMessage.bind(vscodeApi);
    return {
      postMessage: (message) => {
        try {
          standardizedLogger.info(
            "message",
            component2,
            "postMessage",
            `webview->host: ${message?.type || "unknown"}`,
            { message }
          );
        } catch (err) {
        }
        return originalPostMessage(message);
      }
    };
  }
  function interceptWindowMessages(component2 = "webview") {
    if (window.addEventListener.__intercepted) {
      standardizedLogger.debug(
        "message",
        component2,
        "interceptWindowMessages",
        "Already intercepted, skipping"
      );
      return;
    }
    const originalAddEventListener = window.addEventListener.bind(window);
    const interceptedAddEventListener = function(type2, listener, options) {
      if (type2 === "message") {
        standardizedLogger.debug(
          "message",
          component2,
          "addEventListener",
          `Intercepting 'message' listener registration`
        );
        const wrappedListener = (event2) => {
          const messageEvent = event2;
          try {
            standardizedLogger.info(
              "message",
              component2,
              "addEventListener",
              `host->webview: ${messageEvent.data?.type || "unknown"}`,
              { message: messageEvent.data }
            );
          } catch (err) {
          }
          if (listener instanceof Function) {
            listener(event2);
          } else if (listener && "handleEvent" in listener) {
            listener.handleEvent(event2);
          }
        };
        return originalAddEventListener(type2, wrappedListener, options);
      }
      return originalAddEventListener(type2, listener, options);
    };
    interceptedAddEventListener.__intercepted = true;
    window.addEventListener = interceptedAddEventListener;
    standardizedLogger.info(
      "message",
      component2,
      "interceptWindowMessages",
      "window.addEventListener intercepted"
    );
  }

  // src/webview/main.ts
  try {
    interceptWindowMessages("webview");
  } catch (err) {
  }
  var __vscodeApi = void 0;
  function getVsCodeApi() {
    if (__vscodeApi) return __vscodeApi;
    try {
      if (typeof acquireVsCodeApi === "function") {
        __vscodeApi = acquireVsCodeApi();
        window.__vscodeApi = __vscodeApi;
        if (__vscodeApi && typeof __vscodeApi.postMessage === "function") {
          __vscodeApi = interceptPostMessage(__vscodeApi, "webview");
        }
        return __vscodeApi;
      }
    } catch (err) {
    }
    return __vscodeApi;
  }
  function describeError(err) {
    const errorObj = err;
    return {
      message: errorObj?.message ?? String(err),
      name: errorObj?.name,
      stack: errorObj?.stack,
      cause: errorObj?.cause ? String(errorObj.cause) : void 0
    };
  }
  if (typeof globalThis.process === "undefined") {
    globalThis.process = {
      env: {
        NODE_ENV: "development",
        USE_TIMER_PRAXIS: "true",
        USE_CONNECTION_PRAXIS: "true",
        USE_WEBVIEW_PRAXIS: "true",
        USE_MESSAGE_ROUTER: "true"
      },
      arch: "",
      platform: "browser",
      version: "0.0.0-webview",
      nextTick: (cb) => Promise.resolve().then(cb)
    };
  }
  function extractSyncEnvelope(msg) {
    if (msg.type === "syncState" && msg.payload) {
      return {
        context: msg.payload.context,
        praxisState: msg.payload.praxisState,
        matches: msg.payload.matches
      };
    }
    if (msg.type === "contextUpdate" && msg.context) {
      return {
        context: msg.context,
        praxisState: msg.meta?.state ?? msg.praxisState,
        matches: msg.matches
      };
    }
    return { context: msg.context, praxisState: msg.praxisState, matches: msg.matches };
  }
  function handlePartialUpdate(msg) {
    if (msg.command !== "UPDATE_STATE" || !msg.payload) return false;
    const partialUpdate = {
      connections: msg.payload.connections,
      activeConnectionId: msg.payload.activeConnectionId,
      lastError: msg.payload.errors?.length > 0 ? { message: msg.payload.errors[msg.payload.errors.length - 1].message } : void 0
    };
    praxisStore.dispatch([SyncStateEvent.create(partialUpdate)]);
    return true;
  }
  function buildEnrichedContext(context, praxisState) {
    const connections = Array.isArray(context?.connections) ? context.connections : [];
    return {
      ...context,
      applicationState: praxisState || context?.applicationState || "active",
      connections,
      ui: context?.ui || { activeTab: "connections" }
    };
  }
  function dispatchSyncToEngines(enrichedContext, matches) {
    const syncEvent = SyncStateEvent.create(enrichedContext);
    try {
      praxisStore.dispatch([syncEvent]);
    } catch (err) {
    }
    try {
      applicationSnapshot.set({
        value: enrichedContext.applicationState || "active",
        context: enrichedContext,
        matches: matches || {}
      });
    } catch (err) {
    }
  }
  try {
    if (typeof window.addEventListener !== "function") {
      throw new Error("window.addEventListener is not available");
    }
    window.addEventListener("message", (event2) => {
      try {
        const msg = event2?.data;
        if (!msg) {
          return;
        }
        if (handlePartialUpdate(msg)) {
          return;
        }
        const { context, praxisState, matches } = extractSyncEnvelope(msg);
        if (!context) {
          return;
        }
        const enrichedContext = buildEnrichedContext(context, praxisState);
        dispatchSyncToEngines(enrichedContext, matches);
      } catch (err) {
      }
    });
  } catch (err) {
    try {
      window.addEventListener("message", (event2) => {
      });
    } catch (fallbackErr) {
    }
  }
  var PREFERRED_IDS = ["svelte-root", "root", "app"];
  function findExistingMount() {
    for (const id of PREFERRED_IDS) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }
  function ensureMountTarget() {
    const existing = findExistingMount();
    if (existing) return existing;
    const created = document.createElement("div");
    created.id = "svelte-root";
    if (document.body.firstChild) {
      document.body.insertBefore(created, document.body.firstChild);
    } else {
      document.body.appendChild(created);
    }
    return created;
  }
  var mountAttempted = false;
  var mounted = false;
  var rootRef = null;
  var mountFailed = false;
  function tryBootstrap(reason) {
    if (mountAttempted) return;
    mountAttempted = true;
    const root17 = ensureMountTarget();
    rootRef = root17;
    try {
      root17.dataset.bootstrap = reason;
      root17.innerText = `Bootstrapping webview (${reason})\u2026`;
    } catch {
    }
    try {
      const vscode2 = getVsCodeApi();
      mount(App, { target: root17 });
      mounted = true;
      if (vscode2) {
        vscode2.postMessage({ type: "webviewReady" });
      }
    } catch (e) {
      const detail = describeError(e);
      mountFailed = true;
      try {
        const escaped = (detail.message || String(e)).replace(/</g, "&lt;");
        const stack2 = detail.stack ? `<pre style="white-space:pre-wrap">${detail.stack}</pre>` : "";
        root17.innerHTML = `<div style="padding:12px;color:var(--vscode-errorForeground,red);">Webview mount failed: ${escaped}${stack2}</div>`;
      } catch {
      }
    }
  }
  if (document.readyState === "complete" || document.readyState === "interactive") {
    tryBootstrap("ready_state");
  } else {
    window.addEventListener("DOMContentLoaded", () => tryBootstrap("dom_content_loaded"));
  }
  window.addEventListener("error", (event2) => {
  });
  window.addEventListener("unhandledrejection", (event2) => {
  });
  setTimeout(() => {
    if (mounted) return;
    if (mountFailed) return;
    const target = rootRef || findExistingMount();
    if (!target) return;
    if (mountAttempted) {
      target.innerHTML = `<div style="padding:12px;color:var(--vscode-descriptionForeground);">Webview did not finish mounting. Check logs.</div>`;
    } else {
      target.innerHTML = `<div style="padding:12px;color:var(--vscode-descriptionForeground);">Webview bootstrap not attempted.</div>`;
    }
  }, 300);
})();
/*! Bundled license information:

js-yaml/dist/js-yaml.mjs:
  (*! js-yaml 4.1.1 https://github.com/nodeca/js-yaml @license MIT *)
*/
//# sourceMappingURL=main.js.map
