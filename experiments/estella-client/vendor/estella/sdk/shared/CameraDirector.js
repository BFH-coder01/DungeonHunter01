import { Cn as e } from "./system.js";
import { s as t } from "./resource.js";
//#region src/animation/Easing.ts
function n(e) {
	return e;
}
function r(e) {
	return e * e;
}
function i(e) {
	return e * (2 - e);
}
function a(e) {
	return e < .5 ? 2 * e * e : -1 + (4 - 2 * e) * e;
}
function o(e) {
	return e * e * e;
}
function s(e) {
	const t = e - 1;
	return t * t * t + 1;
}
function c(e) {
	return e < .5 ? 4 * e * e * e : (e - 1) * (2 * e - 2) * (2 * e - 2) + 1;
}
const l = 1.70158;
const u = 2.70158;
const d = l * 1.525;
function f(e) {
	return u * e * e * e - l * e * e;
}
function p(e) {
	const t = e - 1;
	return 1 + u * t * t * t + l * t * t;
}
function m(e) {
	if (e < .5) return Math.pow(2 * e, 2) * (7.189819 * e - d) / 2;
	return (Math.pow(2 * e - 2, 2) * (3.5949095 * (e * 2 - 2) + d) + 2) / 2;
}
const h = 2 * Math.PI / 3;
const g = 2 * Math.PI / 4.5;
function _(e) {
	if (e === 0 || e === 1) return e;
	return -Math.pow(2, 10 * e - 10) * Math.sin((e * 10 - 10.75) * h);
}
function v(e) {
	if (e === 0 || e === 1) return e;
	return Math.pow(2, -10 * e) * Math.sin((e * 10 - .75) * h) + 1;
}
function y(e) {
	if (e === 0 || e === 1) return e;
	if (e < .5) return -(Math.pow(2, 20 * e - 10) * Math.sin((20 * e - 11.125) * g)) / 2;
	return Math.pow(2, -20 * e + 10) * Math.sin((20 * e - 11.125) * g) / 2 + 1;
}
const b = 7.5625;
const x = 2.75;
function S(e) {
	if (e < 1 / x) return b * e * e;
	else if (e < 2 / x) {
		e -= 1.5 / x;
		return b * e * e + .75;
	} else if (e < 2.5 / x) {
		e -= 2.25 / x;
		return b * e * e + .9375;
	} else {
		e -= 2.625 / x;
		return b * e * e + .984375;
	}
}
const C = 8;
const w = 1e-6;
function ee(e, t, n, r, i) {
	let a = e;
	for (let n = 0; n < C; n++) {
		const n = 1 - a;
		const i = 3 * t * n * n * a + 3 * r * n * a * a + a * a * a - e;
		if (Math.abs(i) < w) break;
		const o = 3 * t * (1 - 3 * a) * (1 - a) + 6 * r * a * (1 - a) - 3 * r * a * a + 3 * a * a;
		if (Math.abs(o) < w) break;
		a -= i / o;
	}
	const o = 1 - a;
	return 3 * n * o * o * a + 3 * i * o * a * a + a * a * a;
}
function te(e) {
	return e < 1 ? 0 : 1;
}
function ne(e) {
	return 1 - Math.cos(e * Math.PI / 2);
}
function re(e) {
	return Math.sin(e * Math.PI / 2);
}
function T(e) {
	return -(Math.cos(Math.PI * e) - 1) / 2;
}
function E(e) {
	return e * e * e * e;
}
function D(e) {
	const t = 1 - e;
	return 1 - t * t * t * t;
}
function O(e) {
	if (e < .5) return 8 * e * e * e * e;
	const t = -2 * e + 2;
	return 1 - t * t * t * t / 2;
}
function k(e) {
	return e * e * e * e * e;
}
function A(e) {
	const t = 1 - e;
	return 1 - t * t * t * t * t;
}
function j(e) {
	if (e < .5) return 16 * e * e * e * e * e;
	const t = -2 * e + 2;
	return 1 - t * t * t * t * t / 2;
}
function M(e) {
	return e === 0 ? 0 : 2 ** (10 * e - 10);
}
function N(e) {
	return e === 1 ? 1 : 1 - 2 ** (-10 * e);
}
function P(e) {
	if (e === 0 || e === 1) return e;
	return e < .5 ? 2 ** (20 * e - 10) / 2 : (2 - 2 ** (-20 * e + 10)) / 2;
}
function F(e) {
	return 1 - Math.sqrt(1 - e * e);
}
function I(e) {
	const t = e - 1;
	return Math.sqrt(1 - t * t);
}
function L(e) {
	if (e < .5) return (1 - Math.sqrt(1 - (2 * e) ** 2)) / 2;
	return (Math.sqrt(1 - (-2 * e + 2) ** 2) + 1) / 2;
}
function R(e) {
	return 1 - S(1 - e);
}
function z(e) {
	return e < .5 ? (1 - S(1 - 2 * e)) / 2 : (1 + S(2 * e - 1)) / 2;
}
function B(e) {
	return e <= 0 ? 0 : e >= 1 ? 1 : e * e * (3 - 2 * e);
}
function ie(e) {
	return e <= 0 ? 0 : e >= 1 ? 1 : e * e * e * (e * (e * 6 - 15) + 10);
}
function V(e, t, l) {
	switch (e) {
		case 0: return n(t);
		case 1: return r(t);
		case 2: return i(t);
		case 3: return a(t);
		case 4: return o(t);
		case 5: return s(t);
		case 6: return c(t);
		case 7: return f(t);
		case 8: return p(t);
		case 9: return m(t);
		case 10: return _(t);
		case 11: return v(t);
		case 12: return y(t);
		case 13: return S(t);
		case 14:
			if (l) return ee(t, l.p1x, l.p1y, l.p2x, l.p2y);
			return n(t);
		case 15: return te(t);
		case 16: return ne(t);
		case 17: return re(t);
		case 18: return T(t);
		case 19: return E(t);
		case 20: return D(t);
		case 21: return O(t);
		case 22: return k(t);
		case 23: return A(t);
		case 24: return j(t);
		case 25: return M(t);
		case 26: return N(t);
		case 27: return P(t);
		case 28: return F(t);
		case 29: return I(t);
		case 30: return L(t);
		case 31: return R(t);
		case 32: return z(t);
		case 33: return B(t);
		case 34: return ie(t);
		default: return n(t);
	}
}
//#endregion
//#region src/camera/CameraDirector.ts
/** Easing for a view-target transition. */
const H = {
	Linear: 0,
	EaseIn: 1,
	EaseOut: 2,
	EaseInOut: 3
};
function U(e, t) {
	return V(e, t < 0 ? 0 : t > 1 ? 1 : t);
}
/** Signed shortest angular delta a→b (radians), so a blend never spins the long way. */
function W(e, t) {
	const n = Math.PI * 2;
	let r = (t - e) % n;
	if (r > Math.PI) r -= n;
	if (r < -Math.PI) r += n;
	return r;
}
/** Interpolate two POVs. Continuous fields lerp; discrete ones snap to the target. */
function G(e, t, n) {
	const r = (e, t) => e + (t - e) * n;
	return {
		entity: t.entity,
		isActive: t.isActive,
		x: r(e.x, t.x),
		y: r(e.y, t.y),
		z: r(e.z, t.z),
		rotation: e.rotation + W(e.rotation, t.rotation) * n,
		projection: n < .5 ? e.projection : t.projection,
		orthoSize: r(e.orthoSize, t.orthoSize),
		fov: r(e.fov, t.fov),
		near: r(e.near, t.near),
		far: r(e.far, t.far),
		viewport: t.viewport,
		clearFlags: t.clearFlags,
		priority: t.priority,
		pixelPerfect: n < .5 ? e.pixelPerfect : t.pixelPerfect,
		cullingMask: t.cullingMask,
		renderTarget: t.renderTarget
	};
}
function K(e) {
	return {
		...e,
		viewport: { ...e.viewport }
	};
}
const q = {
	target: -1,
	hasPending: false,
	pendingTarget: -1,
	pendingTime: 0,
	pendingCurve: H.EaseInOut,
	blending: false,
	from: null,
	startTime: 0,
	duration: 0,
	curve: H.EaseInOut,
	currentMain: null,
	shakes: [],
	shakeSeq: 0,
	timelineShot: null,
	timelineOwner: -1
};
/** A fresh director state (own arrays) — use per App, not the shared default. */
function J() {
	return {
		...q,
		from: null,
		currentMain: null,
		shakes: []
	};
}
const Y = t({ ...q }, "CameraDirector");
function X(e) {
	return typeof e.getResource === "function" ? e.getResource(Y) : e;
}
/**
* Switch the active view target, optionally blending over `time` seconds with an
* easing `curve`. Records intent; the director applies it on the next frame
* (snapshotting the current view as the blend start). `time<=0` (or no prior
* view) is an instant cut. Pass the App from host code, or the
* `Res(CameraDirector)` state from inside a system.
*/
function ae(e, t, n) {
	const r = X(e);
	r.hasPending = true;
	r.pendingTarget = t;
	r.pendingTime = n?.time ?? 0;
	r.pendingCurve = n?.curve ?? H.EaseInOut;
}
/**
* A playing timeline's camera track says which camera is the view (and, across an overlap, how far one is
* blended into the next). Pass `null` to give the view back: only the player that set a shot can clear it.
*/
function oe(e, t, n) {
	const r = X(e);
	if (n) {
		r.timelineShot = n;
		r.timelineOwner = t;
	} else if (r.timelineOwner === t) {
		r.timelineShot = null;
		r.timelineOwner = -1;
	}
}
/**
* Trigger a transient camera shake on the active view — a decaying perturbation
* applied to the rendered POV only (never to a camera's Transform, so it always
* recovers and never dirties the scene). The UE `StartCameraShake` analog.
* Pass the App from host code, or the `Res(CameraDirector)` state from a system.
*/
function se(e, t) {
	const n = X(e);
	n.shakes.push({
		amplitude: t?.amplitude ?? 12,
		rotation: t?.rotation ?? 0,
		frequency: t?.frequency ?? 22,
		duration: t?.duration ?? .4,
		startTime: -1,
		seed: n.shakeSeq++
	});
}
const Z = (e, t) => Math.sin(e + t * 1.3) * .6 + Math.sin(e * 1.7 + t * 2.9) * .4;
/**
* Apply + age the active shakes, returning the POV offset for rendering. Drops
* expired shakes. Mutates the shake list, so it runs only on the advancing
* (render) resolve — the peek resolve leaves the view un-shaken (so screen<->world
* doesn't jitter while the camera shakes).
*/
function Q(e, t, n) {
	if (e.shakes.length === 0) return t;
	let r = 0;
	let i = 0;
	let a = 0;
	const o = [];
	for (const t of e.shakes) {
		if (t.startTime < 0) t.startTime = n;
		const e = n - t.startTime;
		if (e >= t.duration || t.duration <= 0) continue;
		const s = 1 - e / t.duration;
		const c = 2 * Math.PI * t.frequency * e;
		r += t.amplitude * s * Z(c, t.seed);
		i += t.amplitude * s * Z(c, t.seed + 11);
		a += t.rotation * s * Z(c, t.seed + 23);
		o.push(t);
	}
	e.shakes = o;
	if (r === 0 && i === 0 && a === 0) return t;
	return {
		...t,
		x: t.x + r,
		y: t.y + i,
		rotation: t.rotation + a
	};
}
/** The active camera by policy: isActive wins (authoritative), else highest priority. */
function $(e) {
	const t = e.find((e) => e.isActive);
	if (t) return t;
	let n = e[0];
	for (const t of e) if (t.priority > n.priority) n = t;
	return n;
}
/**
* Resolve the main POV for this frame from the full-frame camera candidates.
* `advance` runs the state machine (consume a pending target, tick the blend);
* pass false to just peek the last resolved POV (so a second consumer per frame
* — the early UICameraInfo sync — doesn't double-advance the blend).
*/
function ce(e, t, n, r) {
	if (t.length === 0) {
		if (r) e.currentMain = null;
		return null;
	}
	if (!r) return e.currentMain ?? $(t);
	if (e.hasPending) {
		e.hasPending = false;
		if (e.pendingTime > 0 && e.currentMain) {
			e.from = K(e.currentMain);
			e.blending = true;
			e.startTime = n;
			e.duration = e.pendingTime;
			e.curve = e.pendingCurve;
		} else {
			e.blending = false;
			e.from = null;
		}
		e.target = e.pendingTarget;
	}
	const i = e.timelineShot;
	const a = i ? t.find((e) => e.entity === i.to) : void 0;
	if (i && a) {
		const r = i.from === null ? void 0 : t.find((e) => e.entity === i.from);
		const o = r ? G(r, a, U(i.curve, i.weight)) : a;
		e.blending = false;
		e.from = null;
		e.currentMain = o;
		return Q(e, o, n);
	}
	const o = (e.target >= 0 ? t.find((t) => t.entity === e.target) : void 0) ?? $(t);
	let s;
	if (e.blending && e.from) {
		const t = n - e.startTime;
		if (e.duration <= 0 || t >= e.duration) {
			e.blending = false;
			e.from = null;
			s = o;
		} else s = G(e.from, o, U(e.curve, t / e.duration));
	} else s = o;
	e.currentMain = s;
	return Q(e, s, n);
}
//#endregion
export { oe as a, V as c, ce as i, Y as n, ae as o, J as r, se as s, H as t };

//# sourceMappingURL=CameraDirector.js.map