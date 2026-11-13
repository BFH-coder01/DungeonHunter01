import { n as e, r as t } from "./types.js";
//#region src/device/core.ts
function n() {
	return {
		timestamp: 0,
		acceleration: null,
		accelerationIncludingGravity: null,
		gyroscope: null,
		gravity: null,
		orientation: null
	};
}
/** Shared filtering and event isolation; platform adapters supply raw measurements. */
var r = class {
	constructor() {
		this.state = {
			fullscreen: false,
			pointerLocked: false,
			screenOn: false,
			motionActive: false
		};
		this.motionHandlers = /* @__PURE__ */ new Set();
		this.stateHandlers = /* @__PURE__ */ new Set();
		this.gravity = null;
		this.orientation = null;
	}
	onMotion(e) {
		this.motionHandlers.add(e);
		return () => this.motionHandlers.delete(e);
	}
	onStateChange(e) {
		this.stateHandlers.add(e);
		return () => this.stateHandlers.delete(e);
	}
	update(e) {
		if (!Object.entries(e).some(([e, t]) => this.state[e] !== t)) return;
		Object.assign(this.state, e);
		for (const e of this.stateHandlers) try {
			e({ ...this.state });
		} catch {}
	}
	reset() {
		this.gravity = null;
		this.orientation = null;
	}
	emit(e) {
		if (!this.state.motionActive) return;
		if (e.accelerationIncludingGravity) {
			const t = e.accelerationIncludingGravity;
			const n = e.acceleration;
			const r = {
				x: t.x - (n?.x ?? 0),
				y: t.y - (n?.y ?? 0),
				z: t.z - (n?.z ?? 0)
			};
			this.gravity = i(this.gravity, r, false);
		}
		if (e.orientation) this.orientation = i(this.orientation, e.orientation, true);
		const t = {
			...e,
			gravity: this.gravity && { ...this.gravity },
			orientation: this.orientation && { ...this.orientation }
		};
		for (const e of this.motionHandlers) try {
			e(t);
		} catch {}
	}
	dispose() {
		this.motionHandlers.clear();
		this.stateHandlers.clear();
		this.reset();
	}
};
function i(e, t, n) {
	if (!e) return { ...t };
	const r = (e, t) => e + .15 * (n ? (t - e + 540) % 360 - 180 : t - e);
	return {
		x: r(e.x, t.x),
		y: r(e.y, t.y),
		z: r(e.z, t.z)
	};
}
function a() {
	const n = new r();
	const i = async () => e;
	return {
		capabilities: () => ({ ...t }),
		state: () => ({ ...n.state }),
		startMotion: i,
		stopMotion: i,
		onMotion: (e) => n.onMotion(e),
		onStateChange: (e) => n.onStateChange(e),
		vibrate: i,
		keepScreenOn: i,
		fullscreen: i,
		pointerLock: i,
		dispose: () => n.dispose()
	};
}
//#endregion
export { n, a as r, r as t };

//# sourceMappingURL=core.js.map