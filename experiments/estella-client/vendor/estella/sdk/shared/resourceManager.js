import { i as e, n as t, r as n, t as r } from "./moduleHealth.js";
//#region src/wasm/WasmBridge.ts
/**
* @file    WasmBridge.ts
* @brief   Single base class for every SDK→WASM subsystem bridge.
*
* @details The SDK historically reached into the WASM module five different
*          ways (a class wrapper for ECS, six global-singleton init/shutdown
*          modules, and per-subsystem typed interfaces for physics/spine/
*          tilemap/timeline). Each reinvented its own loader, ready state,
*          missing-binding policy, and — critically — its own error handling,
*          so only the ECS bridge ({@link ./ecs/BuiltinBridge}) honoured the
*          terminal-abort guard. physics/spine/timeline called straight into a
*          possibly-dead module.
*
*          `WasmBridge` is the single channel. A subsystem connects its module
*          here once; the base installs the abort guard (see moduleHealth.ts)
*          and hands back a guarded view of the module in which EVERY function
*          call short-circuits with {@link WasmModuleAborted} after an abort
*          instead of touching a corpse. Existing call sites are unchanged:
*          `bridge.module` has the same type as the raw module, so the guard is
*          transparent.
*
*          The guarded view passes through, unguarded:
*            - non-function properties (HEAP* views, constants) — read live so
*              they stay valid across ALLOW_MEMORY_GROWTH heap replacement;
*            - `_malloc`/`_free` — allocator infrastructure that
*              {@link ./wasmScratch withScratch} must still be able to call in
*              its `finally` after an abort, so re-guarding them would mask the
*              original error.
*/
/** Properties that must reach the raw module untouched (allocator infra). */
function i(e) {
	return e === "_malloc" || e === "_free";
}
/**
* Base class for a subsystem's bridge to its WASM module.
*
* @typeParam M - the module's call-surface type (e.g. `PhysicsWasmModule`).
*
* Subclasses only declare a {@link label} for diagnostics:
* ```ts
* export class PhysicsBridge extends WasmBridge<PhysicsWasmModule> {
*     protected readonly label = 'physics';
* }
* ```
*/
var a = class {
	constructor() {
		this.raw_ = null;
		this.guarded_ = null;
		this.health_ = null;
	}
	/**
	* Bind this bridge to a freshly-loaded module. Installs the terminal-abort
	* guard and builds the guarded view. Calling again rebinds to a new module.
	*
	* @param module        the module call surface used by `bridge.module`.
	* @param healthModule   the abort-authoritative module; defaults to `module`.
	*/
	connect(e, n = e) {
		this.raw_ = e;
		this.health_ = n;
		t(n);
		this.guarded_ = this.makeGuarded_(e, n);
	}
	/** Unbind. Subsequent `module` access throws until reconnected. */
	disconnect() {
		this.raw_ = null;
		this.guarded_ = null;
		this.health_ = null;
	}
	/** True once {@link connect} has run and before {@link disconnect}. */
	get connected() {
		return this.raw_ !== null;
	}
	/**
	* The guarded module. Every function call is gated through the abort guard;
	* HEAP views, constants, and `_malloc`/`_free` pass through to the live
	* module. Same static type as the raw module, so call sites are unchanged.
	*
	* @throws if the bridge is not connected.
	*/
	get module() {
		if (!this.guarded_) throw new Error(`${this.label} bridge is not connected to a WASM module`);
		return this.guarded_;
	}
	/**
	* The unguarded module, or null if not connected. Prefer {@link module};
	* reach for `raw` only when the guard is provably unwanted (it almost never
	* is — `_malloc`/`_free` and HEAP views already pass through `module`).
	*/
	get raw() {
		return this.raw_;
	}
	makeGuarded_(t, a) {
		const o = this.label;
		const s = /* @__PURE__ */ new Map();
		return new Proxy(t, { get(t, c) {
			const l = Reflect.get(t, c, t);
			if (typeof l !== "function" || i(c)) return l;
			let u = s.get(c);
			if (!u) {
				const i = l;
				const d = `${o}.${typeof c === "string" ? c : String(c)}`;
				u = (...o) => {
					e(a, d);
					try {
						return i.apply(t, o);
					} catch (e) {
						if (n(a)) throw new r(d, void 0, e);
						throw e;
					}
				};
				s.set(c, u);
			}
			return u;
		} });
	}
};
//#endregion
//#region src/wasm/resourceManager.ts
/**
* The C++ ResourceManager is an embind object reached via
* `module.getResourceManager()`, not a module itself — it owns no heap or
* onAbort. Guard its method calls with the main module as the abort authority
* (proxying the embind instance is safe: methods are invoked with the real
* instance as `this`, and HEAP/$$ pass straight through).
*/
var o = class extends a {
	constructor(...e) {
		super(...e);
		this.label = "resourceManager";
	}
};
const s = new o();
let c = null;
const l = /* @__PURE__ */ new Map();
const u = /* @__PURE__ */ new Map();
/** @internal Wired by the engine plugins — not part of the public API. */
function d(e, t) {
	if (t) {
		s.connect(e, t);
		c = s.module;
	} else {
		s.disconnect();
		c = e;
	}
	l.clear();
	u.clear();
}
function f() {
	s.disconnect();
	c = null;
	l.clear();
	u.clear();
}
function p() {
	return c;
}
function m() {
	if (!c) throw new Error("ResourceManager not initialized. Call initResourceManager() first.");
	return c;
}
/**
* Set the resident GPU-texture byte budget. When resident bytes exceed this,
* the C++ ResourcePool evicts least-recently-used unreferenced textures. `0`
* disables caching — a texture frees the moment its refcount hits zero.
* Negative / fractional inputs are clamped to a non-negative integer.
*
* The engine applies `RuntimeConfig.textureCacheBudget` at startup, so scene
* switches keep recently-used textures warm by default; call this (or set
* `textureCacheBudget` in the build config) to size it for your game.
*
* This is the single game-facing surface over the C++ budget; there is no
* parallel TS-side budget to drift from it.
*/
function h(e) {
	m().setTextureBudget(Math.max(0, Math.floor(e)));
}
/**
* Warn once when the CPU copies the graphics device keeps to survive a GPU loss
* ({@link ResourceStats.retainedBytes}) grow past `bytes`; 0 never warns. The
* engine applies `RuntimeConfig.retainedBudget` at startup.
*/
function g(e) {
	m().setRetainedBudget?.(Math.max(0, Math.floor(e)));
}
/**
* Snapshot of GPU resource usage from the C++ ResourceManager — the
* observability side of the texture budget: watch `textureBytes` against
* `textureBudget` and `textureEvictableCount` to size the warm cache.
* Returns null when the resource manager isn't initialized (or a test mock
* doesn't model stats).
*/
function _() {
	if (!c || typeof c.getResourceStats !== "function") return null;
	return c.getResourceStats();
}
/**
* Free every evictable cached texture now (memory pressure). Held textures
* and the budget are untouched; the warm cache refills as textures are
* released afterwards. The engine calls this on OS memory warnings — call it
* yourself before a known memory spike (e.g. a huge one-off allocation).
* Returns the number of textures freed (0 when uninitialized / mocked).
*/
function v() {
	if (!c || typeof c.trimTextureCache !== "function") return 0;
	return c.trimTextureCache();
}
/**
* @internal Names who refills `handle` when the device owes its content — for a
* texture no asset path can load again. Handles belong to one resource manager,
* so the refills go with it.
*/
function y(e, t) {
	u.set(e, t);
}
/** @internal The texture is being released; nothing will be owed for it. */
function b(e) {
	u.delete(e);
}
/** @internal Who refills `handle`, if anyone said. */
function x(e) {
	return u.get(e);
}
function S(e) {
	l.delete(e);
}
function C(e) {
	if (!e) return null;
	const t = l.get(e);
	if (t) return t;
	if (!c) return null;
	const n = c.getTextureDimensions(e);
	if (n) l.set(e, n);
	return n;
}
//#endregion
export { d as a, g as c, x as d, v as f, C as i, h as l, a as m, p as n, y as o, b as p, _ as r, m as s, S as t, f as u };

//# sourceMappingURL=resourceManager.js.map