import { c as e, n as t } from "./system.js";
import { s as n } from "./resource.js";
import { Z as r, n as i } from "./base.js";
import { h as a } from "./defaults.js";
//#region src/input/keyDefaultPolicy.ts
const o = /* @__PURE__ */ new WeakMap();
/** Internal app-scoped policy; claiming the browser default does not consume game input. */
function s(e, t) {
	o.set(e, t);
	return () => {
		if (o.get(e) === t) o.delete(e);
	};
}
function c(e, t) {
	return o.get(e)?.(t) ?? false;
}
const l = /* @__PURE__ */ new WeakMap();
function u(e, t) {
	if (t === "Tab" && !e.keysDown.has(t)) l.set(e, [
		"Shift",
		"ShiftLeft",
		"ShiftRight"
	].some((t) => e.isKeyDown(t)));
}
function d(e) {
	return l.get(e) ?? [
		"Shift",
		"ShiftLeft",
		"ShiftRight"
	].some((t) => e.isKeyDown(t));
}
function f(e) {
	l.delete(e);
}
//#endregion
//#region src/input/inputRouter.ts
const p = Object.freeze({
	shift: false,
	ctrl: false,
	alt: false,
	meta: false
});
var m = class {
	constructor() {
		this.editorHandler_ = null;
		this.uiHandler_ = null;
		this.mods_ = p;
	}
	/** Registers the editor-tier handler and returns an unregister thunk. */
	setEditorHandler(e) {
		this.editorHandler_ = e;
		return () => {
			if (this.editorHandler_ === e) this.editorHandler_ = null;
		};
	}
	/** Registers the UI-tier handler and returns an unregister thunk. */
	setUIHandler(e) {
		this.uiHandler_ = e;
		return () => {
			if (this.uiHandler_ === e) this.uiHandler_ = null;
		};
	}
	get currentMods() {
		return this.mods_;
	}
	/** Clear cancelled key chords without delivering input to handlers. */
	resetModifiers() {
		this.mods_ = p;
	}
	dispatchKeyDown(e) {
		this.updateModsFromKey(e, true);
		return g(_(this.editorHandler_?.onKeyDown), this.editorHandler_, e, this.mods_) || g(_(this.uiHandler_?.onKeyDown), this.uiHandler_, e, this.mods_);
	}
	dispatchKeyUp(e) {
		const t = g(_(this.editorHandler_?.onKeyUp), this.editorHandler_, e, this.mods_) || g(_(this.uiHandler_?.onKeyUp), this.uiHandler_, e, this.mods_);
		this.updateModsFromKey(e, false);
		return t;
	}
	dispatchPointerMove(e, t) {
		return g(_(this.editorHandler_?.onPointerMove), this.editorHandler_, e, t, this.mods_) || g(_(this.uiHandler_?.onPointerMove), this.uiHandler_, e, t, this.mods_);
	}
	dispatchPointerDown(e, t, n) {
		return g(_(this.editorHandler_?.onPointerDown), this.editorHandler_, e, t, n, this.mods_) || g(_(this.uiHandler_?.onPointerDown), this.uiHandler_, e, t, n, this.mods_);
	}
	dispatchPointerUp(e) {
		return g(_(this.editorHandler_?.onPointerUp), this.editorHandler_, e, this.mods_) || g(_(this.uiHandler_?.onPointerUp), this.uiHandler_, e, this.mods_);
	}
	dispatchWheel(e, t) {
		return g(_(this.editorHandler_?.onWheel), this.editorHandler_, e, t, this.mods_) || g(_(this.uiHandler_?.onWheel), this.uiHandler_, e, t, this.mods_);
	}
	dispatchTouchStart(e, t, n) {
		return g(_(this.editorHandler_?.onTouchStart), this.editorHandler_, e, t, n) || g(_(this.uiHandler_?.onTouchStart), this.uiHandler_, e, t, n);
	}
	dispatchTouchMove(e, t, n) {
		return g(_(this.editorHandler_?.onTouchMove), this.editorHandler_, e, t, n) || g(_(this.uiHandler_?.onTouchMove), this.uiHandler_, e, t, n);
	}
	dispatchTouchEnd(e) {
		return g(_(this.editorHandler_?.onTouchEnd), this.editorHandler_, e) || g(_(this.uiHandler_?.onTouchEnd), this.uiHandler_, e);
	}
	dispatchTouchCancel(e) {
		return g(_(this.editorHandler_?.onTouchCancel), this.editorHandler_, e) || g(_(this.uiHandler_?.onTouchCancel), this.uiHandler_, e);
	}
	updateModsFromKey(e, t) {
		let { shift: n, ctrl: r, alt: i, meta: a } = this.mods_;
		if (e === "ShiftLeft" || e === "ShiftRight") n = t;
		else if (e === "ControlLeft" || e === "ControlRight") r = t;
		else if (e === "AltLeft" || e === "AltRight") i = t;
		else if (e === "MetaLeft" || e === "MetaRight" || e === "OSLeft" || e === "OSRight") a = t;
		else return;
		this.mods_ = {
			shift: n,
			ctrl: r,
			alt: i,
			meta: a
		};
	}
};
const h = new m();
function g(e, t, ...n) {
	if (typeof e !== "function") return false;
	try {
		return e.apply(t, n) === true;
	} catch {
		return false;
	}
}
function _(e) {
	return e;
}
//#endregion
//#region src/input/pointerCancellation.ts
const v = /* @__PURE__ */ new WeakSet();
const y = /* @__PURE__ */ new WeakMap();
/** Keep cancellation until the next UI pointer sample, even across a frame-edge clear. */
function b(e) {
	v.add(e);
	y.set(e, S(e) + 1);
}
function x(e) {
	return v.delete(e);
}
/** Independent consumers can observe the same cancellation after pointer sampling. */
function S(e) {
	return y.get(e) ?? 0;
}
//#endregion
//#region src/input/touchEdges.ts
const C = /* @__PURE__ */ new WeakMap();
function w(e, t) {
	C.set(e, t);
}
function T(e, t) {
	return C.get(e) ?? t;
}
//#endregion
//#region src/input/actionEdges.ts
const E = /* @__PURE__ */ new WeakMap();
function D(e) {
	let t = E.get(e);
	if (!t) {
		t = {
			owner: {
				fixed: false,
				cancellation: 0
			},
			sequence: 0,
			events: []
		};
		E.set(e, t);
	}
	return t;
}
/** Ordered physical transitions, shared read-only by all maps until frame cleanup. */
function O(e, t, n, r) {
	const i = D(e);
	const a = {
		source: t,
		code: n,
		down: r,
		sequence: ++i.sequence
	};
	i.events.push(a);
}
function k(e) {
	return D(e);
}
function A(e) {
	D(e).owner.fixed = true;
}
function j(e) {
	const t = E.get(e);
	if (t) t.owner.fixed = false;
}
/** A claimed release cancels that source without manufacturing gameplay edges. */
function M(e, t, n) {
	const r = E.get(e);
	if (!r) return;
	const i = r.events;
	let a = 0;
	for (const e of i) if (e.source !== t || e.code !== n) i[a++] = e;
	i.length = a;
}
function N(e) {
	const t = E.get(e);
	if (t) t.events.length = 0;
}
function P(e) {
	const t = E.get(e);
	if (t) {
		t.events.length = 0;
		t.owner.cancellation++;
	}
}
//#endregion
//#region src/input/input.ts
/**
* Standard-mapping gamepad buttons (W3C "standard gamepad"). Positional names
* (SDL / Steam Input convention) avoid device assumptions; Xbox / PlayStation
* face labels are noted for reference.
*
* @public
*/
let F = /* @__PURE__ */ function(e) {
	e[e["South"] = 0] = "South";
	e[e["East"] = 1] = "East";
	e[e["West"] = 2] = "West";
	e[e["North"] = 3] = "North";
	e[e["LeftBumper"] = 4] = "LeftBumper";
	e[e["RightBumper"] = 5] = "RightBumper";
	e[e["LeftTrigger"] = 6] = "LeftTrigger";
	e[e["RightTrigger"] = 7] = "RightTrigger";
	e[e["Back"] = 8] = "Back";
	e[e["Start"] = 9] = "Start";
	e[e["LeftStick"] = 10] = "LeftStick";
	e[e["RightStick"] = 11] = "RightStick";
	e[e["DpadUp"] = 12] = "DpadUp";
	e[e["DpadDown"] = 13] = "DpadDown";
	e[e["DpadLeft"] = 14] = "DpadLeft";
	e[e["DpadRight"] = 15] = "DpadRight";
	e[e["Guide"] = 16] = "Guide";
	return e;
}({});
/** Standard-mapping gamepad axes (signed, [-1,1]).
*  @public */
let I = /* @__PURE__ */ function(e) {
	e[e["LeftX"] = 0] = "LeftX";
	e[e["LeftY"] = 1] = "LeftY";
	e[e["RightX"] = 2] = "RightX";
	e[e["RightY"] = 3] = "RightY";
	return e;
}({});
const L = {
	x: 0,
	y: 0
};
/**
* This frame's raw input — the layer under {@link defineInputMap}'s named actions.
*
* `@beta`: per-frame touch state is reachable only as the raw `touches` /
* `touchesStarted` / `touchesEnded` maps, so freezing it freezes two gaps in that
* representation — no accessor for started/ended, and no write door at all.
*
* @beta
*/
var R = class {
	constructor() {
		this.keysDown = /* @__PURE__ */ new Set();
		this.keysPressed = /* @__PURE__ */ new Set();
		this.keysReleased = /* @__PURE__ */ new Set();
		this.mouseX = 0;
		this.mouseY = 0;
		this.mouseDeltaX = 0;
		this.mouseDeltaY = 0;
		this.mouseButtons = /* @__PURE__ */ new Set();
		this.mouseButtonsPressed = /* @__PURE__ */ new Set();
		this.mouseButtonsReleased = /* @__PURE__ */ new Set();
		this.scrollDeltaX = 0;
		this.scrollDeltaY = 0;
		this.touchAvailable = false;
		this.touches = /* @__PURE__ */ new Map();
		this.touchesStarted = /* @__PURE__ */ new Map();
		this.touchesEnded = /* @__PURE__ */ new Map();
		this.keysPressedFixed = /* @__PURE__ */ new Set();
		this.keysReleasedFixed = /* @__PURE__ */ new Set();
		this.mouseButtonsPressedFixed = /* @__PURE__ */ new Set();
		this.mouseButtonsReleasedFixed = /* @__PURE__ */ new Set();
		this.fixedContext_ = false;
		this.multiTouch_ = null;
		this.soleTouch_ = null;
		this.ignoredTouches_ = /* @__PURE__ */ new Set();
		this.virtual_ = /* @__PURE__ */ new Map();
		this.virtualSources_ = /* @__PURE__ */ new Map();
		this.gamepads = /* @__PURE__ */ new Map();
		this.gamepadButtonThreshold = .5;
		this.gamepadDeadzone = .15;
		this.pointerOverUI = false;
		this.injected_ = /* @__PURE__ */ new Map();
	}
	isKeyDown(e) {
		return this.keysDown.has(e);
	}
	isKeyPressed(e) {
		return (this.fixedContext_ ? this.keysPressedFixed : this.keysPressed).has(e);
	}
	isKeyReleased(e) {
		return (this.fixedContext_ ? this.keysReleasedFixed : this.keysReleased).has(e);
	}
	getMousePosition() {
		return {
			x: this.mouseX,
			y: this.mouseY
		};
	}
	/** How far the pointer moved this frame. Zero where the host does not say (a mini game has no pointer to lock). */
	getMouseDelta() {
		return {
			x: this.mouseDeltaX,
			y: this.mouseDeltaY
		};
	}
	isMouseButtonDown(e) {
		return this.mouseButtons.has(e);
	}
	isMouseButtonPressed(e) {
		return (this.fixedContext_ ? this.mouseButtonsPressedFixed : this.mouseButtonsPressed).has(e);
	}
	isMouseButtonReleased(e) {
		return (this.fixedContext_ ? this.mouseButtonsReleasedFixed : this.mouseButtonsReleased).has(e);
	}
	/** Record a key-down. The pressed edge only fires on the transition, so a
	*  browser's auto-repeat keydown for a held key doesn't re-trigger it. */
	noteKeyDown(e) {
		u(this, e);
		if (!this.keysDown.has(e)) {
			O(this, "key", e, true);
			this.keysPressed.add(e);
			this.keysPressedFixed.add(e);
		}
		this.keysDown.add(e);
	}
	noteKeyUp(e) {
		if (this.keysDown.has(e)) O(this, "key", e, false);
		this.keysDown.delete(e);
		this.keysReleased.add(e);
		this.keysReleasedFixed.add(e);
	}
	noteMouseDown(e) {
		if (!this.mouseButtons.has(e)) O(this, "mouse", e, true);
		if (e === 0) x(this);
		this.mouseButtons.add(e);
		this.mouseButtonsPressed.add(e);
		this.mouseButtonsPressedFixed.add(e);
	}
	noteMouseUp(e) {
		if (this.mouseButtons.has(e)) O(this, "mouse", e, false);
		this.mouseButtons.delete(e);
		this.mouseButtonsReleased.add(e);
		this.mouseButtonsReleasedFixed.add(e);
	}
	getScrollDelta() {
		return {
			x: this.scrollDeltaX,
			y: this.scrollDeltaY
		};
	}
	getTouches() {
		return [...this.touches.values()];
	}
	getTouchCount() {
		return this.touches.size;
	}
	getTouch(e) {
		return this.touches.get(e) ?? null;
	}
	isTouchActive(e) {
		return this.touches.has(e);
	}
	/** Fingers that went down this frame. */
	getTouchesStarted() {
		return [...this.touchesStarted.values()];
	}
	/** Fingers that came up this frame, at the position they came up at. */
	getTouchesEnded() {
		return [...this.touchesEnded.values()];
	}
	/** Retire a touch after a normal release, retaining its position and press edge. */
	endTouch(e) {
		const t = this.touches.get(e) ?? {
			id: e,
			x: 0,
			y: 0
		};
		w(t, this.touchesStarted.has(e));
		this.touches.delete(e);
		this.touchesEnded.set(e, t);
	}
	/** On unless the project turned it off (Project Settings → Runtime) or the game did. */
	isMultiTouchEnabled() {
		return this.multiTouch_ ?? a.multiTouch;
	}
	/**
	* Handle several fingers at once, or one. Turning it off while several are
	* down keeps the first that went down and cancels the rest, as the platform
	* cancelling them would: their touches end with no release edge, and a UI
	* control they were pressing lets go without a click.
	*/
	setMultiTouch(e) {
		const t = this.isMultiTouchEnabled();
		this.multiTouch_ = e;
		if (e === t) return;
		this.ignoredTouches_.clear();
		this.soleTouch_ = null;
		if (e) return;
		const n = [...this.touches.keys()];
		this.soleTouch_ = n[0] ?? null;
		for (const e of n.slice(1)) {
			h.dispatchTouchCancel(e);
			this.touches.delete(e);
			this.touchesStarted.delete(e);
			this.touchesEnded.delete(e);
			this.ignoredTouches_.add(e);
		}
	}
	/** @internal Whether a finger going down is handled; records it as the one in single-touch mode. */
	admitTouch(e) {
		if (this.isMultiTouchEnabled()) return true;
		if (this.soleTouch_ === null || this.soleTouch_ === e) {
			this.soleTouch_ = e;
			return true;
		}
		this.ignoredTouches_.add(e);
		return false;
	}
	/** @internal Whether a finger's move, lift or cancel is ignored; a lift or cancel also retires it. */
	touchIgnored(e, t = false) {
		if (this.ignoredTouches_.has(e)) {
			if (t) this.ignoredTouches_.delete(e);
			return true;
		}
		if (t && this.soleTouch_ === e) this.soleTouch_ = null;
		return false;
	}
	/** @internal Every finger is gone (focus lost, the app hidden). */
	forgetTouches() {
		this.soleTouch_ = null;
		this.ignoredTouches_.clear();
	}
	/** Set a named virtual input; held until overwritten, so stopping means
	*  writing zero. `y` defaults to 0 for button/1D use. */
	setVirtual(e, t, n = 0) {
		const r = this.virtual_.get(e);
		if (r) {
			r.x = t;
			r.y = n;
		} else this.virtual_.set(e, {
			x: t,
			y: n
		});
	}
	getVirtual(e) {
		const t = this.virtual_.get(e) ?? L;
		let n = t.x, r = t.y, i = false;
		for (const t of this.virtualSources_.values()) {
			if (t.id !== e) continue;
			i = true;
			n += t.x;
			r += t.y;
		}
		return i ? {
			x: Math.max(-1, Math.min(1, n)),
			y: Math.max(-1, Math.min(1, r))
		} : t;
	}
	/** A control owns only its contribution, even when several share a binding. */
	setVirtualSource(e, t, n, r = 0) {
		if (n === 0 && r === 0) {
			this.virtualSources_.delete(e);
			return;
		}
		const i = this.virtualSources_.get(e);
		if (i) {
			i.id = t;
			i.x = n;
			i.y = r;
		} else this.virtualSources_.set(e, {
			id: t,
			x: n,
			y: r
		});
	}
	removeVirtualSource(e) {
		this.virtualSources_.delete(e);
	}
	/** @internal Host cancellation releases managed controls, leaving manual values to their writer. */
	cancelVirtualSources() {
		this.virtualSources_.clear();
	}
	/** Drop every virtual input — used when a control layer is torn down. */
	clearVirtual() {
		this.virtual_.clear();
		this.virtualSources_.clear();
	}
	/** Indices of currently-connected gamepads. */
	getGamepads() {
		const e = [];
		for (const [t, n] of this.gamepads) if (n.connected) e.push(t);
		return e;
	}
	isGamepadConnected(e = 0) {
		return this.gamepads.get(e)?.connected ?? false;
	}
	isGamepadButtonDown(e, t = 0) {
		const n = this.connectedPad_(t);
		return !!n && (n.buttons[e] ?? 0) >= this.gamepadButtonThreshold;
	}
	isGamepadButtonPressed(e, t = 0) {
		const n = this.connectedPad_(t);
		if (!n) return false;
		const r = this.gamepadButtonThreshold;
		return (n.buttons[e] ?? 0) >= r && (n.prevButtons[e] ?? 0) < r;
	}
	isGamepadButtonReleased(e, t = 0) {
		const n = this.connectedPad_(t);
		if (!n) return false;
		const r = this.gamepadButtonThreshold;
		return (n.buttons[e] ?? 0) < r && (n.prevButtons[e] ?? 0) >= r;
	}
	/** Raw analog value of a button in [0,1] (triggers; 0/1 for digital buttons). */
	getGamepadButtonValue(e, t = 0) {
		return this.connectedPad_(t)?.buttons[e] ?? 0;
	}
	/** Signed axis value in [-1,1], with the deadzone applied. */
	getGamepadAxis(e, t = 0) {
		const n = this.connectedPad_(t);
		if (!n) return 0;
		const r = n.axes[e] ?? 0;
		return Math.abs(r) < this.gamepadDeadzone ? 0 : r;
	}
	connectedPad_(e) {
		const t = this.gamepads.get(e);
		return t?.connected ? t : void 0;
	}
	isPointerOverUI() {
		return this.pointerOverUI;
	}
	/** Ingest this frame's snapshots: shift current→prev (edge detection) then
	*  store new values. Pads absent from `snapshots` are marked disconnected. */
	/**
	* Pads supplied by the HOST rather than by the hardware — a test harness, a
	* driver, the editor's agent. They outrank the poll at the same index: the
	* poll runs every frame, so anything merely written into {@link gamepads}
	* is gone before a system reads it.
	*
	* @beta
	*/
	injectGamepad(e) {
		this.injected_.set(e.index, e);
	}
	/** Give an index (or all of them) back to the hardware. @beta */
	releaseGamepad(e) {
		if (e === void 0) this.injected_.clear();
		else this.injected_.delete(e);
	}
	updateGamepads(e) {
		const t = this.injected_.size === 0 ? e : [...e.filter((e) => !this.injected_.has(e.index)), ...this.injected_.values()];
		for (const e of this.gamepads.values()) e.connected = false;
		for (const e of t) {
			let t = this.gamepads.get(e.index);
			if (!t) {
				t = {
					connected: true,
					buttons: [],
					prevButtons: [],
					axes: []
				};
				this.gamepads.set(e.index, t);
			}
			t.prevButtons = t.buttons;
			t.buttons = e.buttons;
			t.axes = e.axes;
			t.connected = e.connected;
		}
	}
	clearFrameState() {
		N(this);
		this.keysPressed.clear();
		f(this);
		this.keysReleased.clear();
		this.mouseButtonsPressed.clear();
		this.mouseButtonsReleased.clear();
		this.scrollDeltaX = 0;
		this.scrollDeltaY = 0;
		this.mouseDeltaX = 0;
		this.mouseDeltaY = 0;
		this.touchesStarted.clear();
		this.touchesEnded.clear();
	}
	/** Enter a fixed-timestep step: keyboard/mouse edge queries now read the fixed
	*  mirrors. Called by App before each FixedUpdate step. */
	beginFixedStep() {
		this.fixedContext_ = true;
		A(this);
	}
	/** Leave a fixed step: drop the consumed edges (so a later step this frame
	*  doesn't see them again) and restore the render context. Edges that arrived
	*  on a frame with no fixed step are never cleared here, so they survive to the
	*  next frame's first step instead of being lost. */
	endFixedStep() {
		j(this);
		this.keysPressedFixed.clear();
		this.keysReleasedFixed.clear();
		this.mouseButtonsPressedFixed.clear();
		this.mouseButtonsReleasedFixed.clear();
		this.fixedContext_ = false;
	}
};
/**
* This frame's raw input, as a resource. The input plugin writes it before any
* game system runs, and clears the per-frame edges after the last one.
*
* @beta
*/
const z = n(new R(), "Input");
const B = /* @__PURE__ */ new WeakMap();
/** Internal, per-owner execution gate for the platform event funnel. */
function V(e, t, n) {
	let r = B.get(e);
	if (n) {
		if (!r) {
			r = /* @__PURE__ */ new Set();
			B.set(e, r);
		}
		const n = r.size > 0;
		r.add(t);
		if (!n) H(e).onInputCancel?.();
	} else {
		r?.delete(t);
		if (!r?.size) B.delete(e);
	}
}
/**
* The callbacks a platform's raw events arrive through — routed past the UI
* first, then recorded on `state`.
*
* Named and exported because the platform binding is not the only caller that
* should exist. A harness driving a running game has to be able to deliver a
* click, and the only faithful way to do that is through the same funnel the
* real event uses: a synthetic DOM event carries no usable `offsetX`, and
* poking `mouseX` and `mouseButtonsPressed` by hand skips the router, so UI
* that should have swallowed the click never sees it and gameplay behind a
* button reacts to presses the player never made.
*
* One implementation, so the injected event and the real one cannot diverge.
*/
function H(e) {
	const t = (t, n) => {
		if (n) e.touches.delete(t);
		else if (e.touches.has(t)) e.endTouch(t);
	};
	return {
		onKeyDown(t) {
			if (B.has(e)) return c(e, t);
			if (h.dispatchKeyDown(t)) return true;
			e.noteKeyDown(t);
			return c(e, t);
		},
		onKeyUp(t) {
			if (B.has(e)) return;
			if (h.dispatchKeyUp(t)) {
				e.keysDown.delete(t);
				M(e, "key", t);
			} else if (e.keysDown.has(t)) e.noteKeyUp(t);
		},
		onPointerMove(t, n, r, i) {
			if (B.has(e)) return;
			if (r !== void 0 && i !== void 0 && Number.isFinite(r) && Number.isFinite(i)) {
				e.mouseDeltaX += r;
				e.mouseDeltaY += i;
			}
			e.mouseX = t;
			e.mouseY = n;
			h.dispatchPointerMove(t, n);
		},
		onPointerDown(t, n, r) {
			if (B.has(e)) return;
			e.mouseX = n;
			e.mouseY = r;
			if (h.dispatchPointerDown(t, n, r)) return;
			e.noteMouseDown(t);
		},
		onPointerUp(t) {
			if (B.has(e)) return;
			if (h.dispatchPointerUp(t)) {
				e.mouseButtons.delete(t);
				M(e, "mouse", t);
				if (t === 0) b(e);
			} else if (e.mouseButtons.has(t)) e.noteMouseUp(t);
		},
		onWheel(t, n) {
			if (B.has(e)) return;
			if (h.dispatchWheel(t, n)) return;
			e.scrollDeltaX += t;
			e.scrollDeltaY += n;
		},
		onTouchStart(t, n, r) {
			if (B.has(e)) return;
			if (!e.admitTouch(t)) return;
			if (h.dispatchTouchStart(t, n, r)) return;
			const i = {
				id: t,
				x: n,
				y: r
			};
			e.touches.set(t, i);
			e.touchesStarted.set(t, i);
		},
		onTouchMove(t, n, r) {
			if (B.has(e)) return;
			if (e.touchIgnored(t)) return;
			if (h.dispatchTouchMove(t, n, r)) return;
			const i = e.touches.get(t);
			if (i) {
				i.x = n;
				i.y = r;
			}
		},
		onTouchEnd(n) {
			if (B.has(e)) return;
			if (e.touchIgnored(n, true)) return;
			t(n, h.dispatchTouchEnd(n));
		},
		onTouchCancel(t, n) {
			if (B.has(e)) return;
			if (e.touchIgnored(t, true)) return;
			h.dispatchTouchCancel(t);
			e.touches.delete(t);
			e.touchesStarted.delete(t);
			e.touchesEnded.delete(t);
			if (n === true || n === void 0 && e.touches.size === 0) {
				M(e, "mouse", 0);
				e.mouseButtons.delete(0);
				e.mouseButtonsPressed.delete(0);
				e.mouseButtonsReleased.delete(0);
				e.mouseButtonsPressedFixed.delete(0);
				e.mouseButtonsReleasedFixed.delete(0);
				b(e);
			}
		},
		onInputCancel() {
			h.resetModifiers();
			e.keysDown.clear();
			e.mouseButtons.clear();
			e.touches.clear();
			e.forgetTouches();
			e.cancelVirtualSources();
			e.clearFrameState();
			P(e);
			e.keysPressedFixed.clear();
			e.keysReleasedFixed.clear();
			e.mouseButtonsPressedFixed.clear();
			e.mouseButtonsReleasedFixed.clear();
			b(e);
		}
	};
}
var U = class {
	constructor(e) {
		this.name = "input";
		this.unbind_ = null;
		this.executionCleanup_ = /* @__PURE__ */ new WeakMap();
		this.target_ = e ?? null;
	}
	build(t) {
		const n = new R();
		t.insertResource(z, n);
		const r = t.onExecutionChange((e) => V(n, t, e));
		this.executionCleanup_.set(t, () => {
			r();
			V(n, t, false);
		});
		n.touchAvailable = i().hasTouch?.() ?? false;
		i().bindInputEvents(H(n), this.target_ ?? void 0);
		const a = i();
		if (a.pollGamepads) {
			const r = a.pollGamepads.bind(a);
			t.addSystemToSchedule(1, e([], () => {
				n.updateGamepads(r());
			}, { name: "GamepadPollSystem" }));
		}
		t.addSystemToSchedule(5, e([], () => {
			n.clearFrameState();
		}, { name: "InputClearSystem" }));
	}
	cleanup(e) {
		if (e) {
			this.executionCleanup_.get(e)?.();
			this.executionCleanup_.delete(e);
		}
		r();
	}
};
const W = new U();
//#endregion
export { R as a, V as c, S as d, x as f, d as g, s as h, U as i, k as l, h as m, F as n, H as o, m as p, z as r, W as s, I as t, T as u };

//# sourceMappingURL=input.js.map