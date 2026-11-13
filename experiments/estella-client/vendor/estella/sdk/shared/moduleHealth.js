//#region src/wasm/moduleHealth.ts
/**
* @file    moduleHealth.ts
* @brief   Terminal-abort tracking for the C++/WASM boundary.
*
* @details The engine compiles the WASM module with `-fno-exceptions`, so a C++
*          failure (OOM, failed assert, unreachable) calls `abort()` and tears
*          the module down permanently — it does NOT surface as a catchable JS
*          exception. Without tracking, the SDK keeps calling into the corpse,
*          reading and writing undefined memory.
*
*          This module is the error channel for that model: install an
*          `onAbort` guard that flips a per-module "dead" flag, and have every
*          boundary call short-circuit with {@link WasmModuleAborted} instead of
*          invoking a dead module. The flag is terminal — a module never
*          recovers from abort.
*/
/** Thrown when a boundary call is attempted on a WASM module that has aborted. */
var e = class extends Error {
	constructor(e, t, n) {
		super(`WASM module aborted; refusing to call into it (${e})` + (t ? `: ${t}` : ""));
		this.name = "WasmModuleAborted";
		this.context = e;
		this.reason = t;
		if (n !== void 0) this.cause = n;
	}
};
const t = /* @__PURE__ */ new WeakMap();
function n(e) {
	let n = t.get(e);
	if (!n) {
		n = { aborted: false };
		t.set(e, n);
	}
	return n;
}
/** Mark a module as aborted (terminal). Idempotent; keeps the first reason. */
function r(e, t) {
	const r = n(e);
	if (!r.aborted) {
		r.aborted = true;
		r.reason = t;
	}
}
/** True if the module has aborted. False for null/undefined (nothing to call). */
function i(e) {
	return e ? n(e).aborted : false;
}
/** Throw {@link WasmModuleAborted} if the module has aborted; otherwise no-op. */
function a(t, r) {
	if (!t) return;
	const i = n(t);
	if (i.aborted) throw new e(r, i.reason);
}
/**
* Install a terminal abort guard on a module. The emscripten runtime invokes
* `Module.onAbort(what)` when it aborts; we flip the dead flag so subsequent
* boundary calls short-circuit. Any pre-existing `onAbort` is preserved and
* still called. Idempotent per module.
*/
function o(e) {
	const t = n(e);
	if (t.guardInstalled) return;
	t.guardInstalled = true;
	const i = e;
	const a = typeof i.onAbort === "function" ? i.onAbort.bind(i) : null;
	i.onAbort = (t) => {
		r(e, t === null || t === void 0 ? void 0 : String(t));
		if (a) a(t);
	};
}
//#endregion
export { a as i, o as n, i as r, e as t };

//# sourceMappingURL=moduleHealth.js.map