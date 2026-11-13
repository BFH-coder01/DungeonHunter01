//#region src/ecs/context.ts
var e = class {
	constructor() {
		this.componentRegistry = /* @__PURE__ */ new Map();
		this.pendingSystems = [];
		this.pendingPlugins = [];
		this.editorBridge = null;
		this.wasmError = {
			handler: null,
			lastReportTime: 0,
			suppressedCount: 0
		};
		this.editorMode = false;
		this.playMode = false;
		this.queueEpoch = 0;
	}
	/** @brief Drain all pending systems and clear the queue */
	drainPendingSystems() {
		const e = this.pendingSystems.splice(0);
		this.queueEpoch++;
		return e;
	}
	/** @brief Drain all pending plugins and clear the queue */
	drainPendingPlugins() {
		return this.pendingPlugins.splice(0);
	}
	/** @brief Reset all mutable state for a new session */
	reset() {
		this.queueEpoch++;
		this.pendingSystems.length = 0;
		this.pendingPlugins.length = 0;
		this.componentRegistry.clear();
		this.editorBridge = null;
		this.wasmError.handler = null;
		this.wasmError.lastReportTime = 0;
		this.wasmError.suppressedCount = 0;
		this.editorMode = false;
		this.playMode = false;
	}
};
/**
* Module-level default context.
*
* Multi-app note: this default is shared across all consumers that call
* `getDefaultContext()` without first installing their own context. If you
* run multiple isolated Apps in one process, each must call
* `setDefaultContext(new AppContext())` on its own entry path — the lazy
* singleton here will otherwise leak state (component registry, pending
* systems, wasm-error throttle) between them.
*/
let t = null;
function n() {
	if (!t) t = new e();
	return t;
}
function r(e) {
	t = e;
}
//#endregion
export { n, r, e as t };

//# sourceMappingURL=context.js.map