import { $t as e, en as t } from "./system.js";
import { s as n } from "./resource.js";
//#region src/math/mat4.ts
/**
* @file    mat4.ts
* @brief   4x4 matrix operations for camera and projection math
*/
const r = /* @__PURE__ */ new Float32Array(16);
function i(e, t, n, i, a, o) {
	const s = r;
	s.fill(0);
	const c = t - e;
	const l = i - n;
	const u = o - a;
	s[0] = 2 / c;
	s[5] = 2 / l;
	s[10] = -2 / u;
	s[12] = -(t + e) / c;
	s[13] = -(i + n) / l;
	s[14] = -(o + a) / u;
	s[15] = 1;
	return s;
}
const a = /* @__PURE__ */ new Float32Array(16);
function o(e, t, n, r) {
	const i = a;
	i.fill(0);
	const o = 1 / Math.tan(e / 2);
	const s = n - r;
	i[0] = o / t;
	i[5] = o;
	i[10] = (r + n) / s;
	i[11] = -1;
	i[14] = 2 * r * n / s;
	return i;
}
const s = /* @__PURE__ */ new Float32Array(16);
/**
* Inverse of a 2D rigid camera transform: rotateZ(-θ) · translate(-x,-y,-z),
* i.e. the view matrix of a camera at (x,y,z) rotated θ about Z (cosT/sinT =
* cos/sin θ). With θ = 0 (cosT=1, sinT=0) this equals {@link invertTranslation},
* so non-rotated cameras are byte-for-byte unchanged.
*/
function c(e, t, n, r, i) {
	const a = s;
	a[0] = r;
	a[1] = -i;
	a[2] = 0;
	a[3] = 0;
	a[4] = i;
	a[5] = r;
	a[6] = 0;
	a[7] = 0;
	a[8] = 0;
	a[9] = 0;
	a[10] = 1;
	a[11] = 0;
	a[12] = -(r * e + i * t);
	a[13] = i * e - r * t;
	a[14] = -n;
	a[15] = 1;
	return a;
}
const l = /* @__PURE__ */ new Float32Array(16);
/**
* The view matrix of a camera at (x, y, z) turned by a quaternion — the inverse
* of its own transform, which is what a camera's view IS.
*
* A rotation purely about Z reproduces {@link invertViewZ} cell for cell, so the
* 2D camera is this one's special case rather than a different path.
*/
function u(e, t, n, r, i, a, o) {
	const s = r * r, c = i * i, u = a * a;
	const d = r * i, f = r * a, p = i * a;
	const m = o * r, h = o * i, g = o * a;
	const _ = 1 - 2 * (c + u), v = 2 * (d - g), y = 2 * (f + h);
	const b = 2 * (d + g), x = 1 - 2 * (s + u), S = 2 * (p - m);
	const C = 2 * (f - h), w = 2 * (p + m), T = 1 - 2 * (s + c);
	const E = l;
	E[0] = _;
	E[1] = v;
	E[2] = y;
	E[3] = 0;
	E[4] = b;
	E[5] = x;
	E[6] = S;
	E[7] = 0;
	E[8] = C;
	E[9] = w;
	E[10] = T;
	E[11] = 0;
	E[12] = -(_ * e + b * t + C * n);
	E[13] = -(v * e + x * t + w * n);
	E[14] = -(y * e + S * t + T * n);
	E[15] = 1;
	return E;
}
const d = /* @__PURE__ */ new Float32Array(16);
/**
* The view matrix of a camera ORBITING a focus point: it stands `distance` away
* along the direction yaw/pitch name (radians) and looks back at the focus.
*
* At yaw = pitch = 0 this equals {@link invertViewZ} at θ = 0 for a camera at
* (fx, fy, fz + distance) — the 2D view is this one's special case.
*/
function f(e, t, n, r, i, a) {
	const o = Math.cos(i);
	const s = Math.sin(r) * o;
	const c = Math.sin(i);
	const l = Math.cos(r) * o;
	let u = l, f = 0, p = -s;
	const m = Math.hypot(u, p);
	if (m < 1e-6) {
		u = Math.cos(r);
		f = 0;
		p = -Math.sin(r);
	} else {
		u /= m;
		p /= m;
	}
	const h = c * p - l * f;
	const g = l * u - s * p;
	const _ = s * f - c * u;
	const v = e + s * a;
	const y = t + c * a;
	const b = n + l * a;
	const x = d;
	x[0] = u;
	x[1] = h;
	x[2] = s;
	x[3] = 0;
	x[4] = f;
	x[5] = g;
	x[6] = c;
	x[7] = 0;
	x[8] = p;
	x[9] = _;
	x[10] = l;
	x[11] = 0;
	x[12] = -(u * v + f * y + p * b);
	x[13] = -(h * v + g * y + _ * b);
	x[14] = -(s * v + c * y + l * b);
	x[15] = 1;
	return x;
}
const p = /* @__PURE__ */ new Float32Array(16);
/**
* A world transform as a column-major 4x4, from the TRS the engine resolved.
*
* One author for it, because more than one reader wants it in this form — a bake
* collects it from the editor's world, and a tool collects it from a document —
* and two transcriptions of a rotation matrix are two chances to transpose one.
*/
function m(e, t, n) {
	const { x: r, y: i, z: a, w: o } = t;
	return [
		(1 - 2 * (i * i + a * a)) * n.x,
		2 * (r * i + a * o) * n.x,
		2 * (r * a - i * o) * n.x,
		0,
		2 * (r * i - a * o) * n.y,
		(1 - 2 * (r * r + a * a)) * n.y,
		2 * (i * a + r * o) * n.y,
		0,
		2 * (r * a + i * o) * n.z,
		2 * (i * a - r * o) * n.z,
		(1 - 2 * (r * r + i * i)) * n.z,
		0,
		e.x,
		e.y,
		e.z,
		1
	];
}
function h(e, t) {
	const n = p;
	for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) n[i * 4 + r] = e[0 + r] * t[i * 4 + 0] + e[4 + r] * t[i * 4 + 1] + e[8 + r] * t[i * 4 + 2] + e[12 + r] * t[i * 4 + 3];
	return n;
}
const g = new Float32Array([
	1,
	0,
	0,
	0,
	0,
	1,
	0,
	0,
	0,
	0,
	1,
	0,
	0,
	0,
	0,
	1
]);
/**
* General 4x4 inverse (cofactor expansion). A singular matrix yields the
* untouched `result` — callers treat that as "no inverse" rather than NaN.
*
* The view/projection builders above have exact inverses of their own; this is
* for a matrix nobody can name, such as a composed view-projection.
*/
function _(e, t) {
	const n = t ?? /* @__PURE__ */ new Float32Array(16);
	const r = e[0], i = e[1], a = e[2], o = e[3];
	const s = e[4], c = e[5], l = e[6], u = e[7];
	const d = e[8], f = e[9], p = e[10], m = e[11];
	const h = e[12], g = e[13], _ = e[14], v = e[15];
	const y = r * c - i * s;
	const b = r * l - a * s;
	const x = r * u - o * s;
	const S = i * l - a * c;
	const C = i * u - o * c;
	const w = a * u - o * l;
	const T = d * g - f * h;
	const E = d * _ - p * h;
	const D = d * v - m * h;
	const O = f * _ - p * g;
	const k = f * v - m * g;
	const A = p * v - m * _;
	let j = y * A - b * k + x * O + S * D - C * E + w * T;
	if (j === 0) return n;
	j = 1 / j;
	n[0] = (c * A - l * k + u * O) * j;
	n[1] = (a * k - i * A - o * O) * j;
	n[2] = (g * w - _ * C + v * S) * j;
	n[3] = (p * C - f * w - m * S) * j;
	n[4] = (l * D - s * A - u * E) * j;
	n[5] = (r * A - a * D + o * E) * j;
	n[6] = (_ * x - h * w - v * b) * j;
	n[7] = (d * w - p * x + m * b) * j;
	n[8] = (s * k - c * D + u * T) * j;
	n[9] = (i * D - r * k - o * T) * j;
	n[10] = (h * C - g * x + v * y) * j;
	n[11] = (f * x - d * C - m * y) * j;
	n[12] = (c * E - s * O - l * T) * j;
	n[13] = (r * O - i * E + a * T) * j;
	n[14] = (g * b - h * S - _ * y) * j;
	n[15] = (d * S - f * b + p * y) * j;
	return n;
}
const v = /* @__PURE__ */ new Float32Array(16);
/**
* The eight world-space corners of what a view-projection sees: near face (bl,
* br, tr, tl) then far, as 24 floats. Read off the matrix's INVERSE, so
* projection, orbit and tilt all come from the one thing that decides the frame;
* they are the unit cube's, in the [-1, 1] depth range the builders above use.
*/
function y(e, t) {
	const n = t ?? /* @__PURE__ */ new Float32Array(24);
	const r = _(e, v.fill(0));
	for (let e = 0; e < 8; e++) {
		const t = e & 1 ? 1 : -1;
		const i = e & 2 ? 1 : -1;
		const a = e & 4 ? 1 : -1;
		const o = r[3] * t + r[7] * i + r[11] * a + r[15];
		const s = o !== 0 ? 1 / o : 0;
		const c = (e & 4 ? 12 : 0) + [
			0,
			3,
			9,
			6
		][e & 3];
		n[c] = (r[0] * t + r[4] * i + r[8] * a + r[12]) * s;
		n[c + 1] = (r[1] * t + r[5] * i + r[9] * a + r[13]) * s;
		n[c + 2] = (r[2] * t + r[6] * i + r[10] * a + r[14]) * s;
	}
	return n;
}
//#endregion
//#region src/camera/EditorView.ts
/**
* @file    EditorView.ts
* @brief   Editor viewport camera — a dedicated, editor-only eye on the scene.
*
* This is NOT a scene entity: it is never serialized, never on the undo stack,
* and never part of the saved scene. When `active`, the camera system renders
* the framebuffer through this view and drives all screen<->world queries from
* it (CameraView / UICameraInfo) INSTEAD of the scene's game Camera entities —
* so editor navigation (pan / zoom / frame / orbit) moves only this view and never
* the scene's camera. In play mode it is deactivated, so the viewport shows the
* real game camera (the true "Game" view). The editor mutates the focus, the zoom
* and the angles the eye stands at; the head-on 2D view is all of them at zero.
*
* The view's view-projection is built from the SAME math primitives as scene
* cameras (see CameraPlugin) — there is one source of view-projection math; only
* the camera *configuration* (full-frame, raw orthoSize) differs.
*/
const b = {
	active: false,
	x: 0,
	y: 0,
	z: 0,
	orthoSize: 360,
	uiPreviewAspect: 0,
	perspective: false,
	fov: 60,
	distance: 1e3,
	yaw: 0,
	pitch: 0
};
/**
* Half-height, in world units, of what the view sees on the z = 0 plane — where
* 2D content lives and where the grid, the framing and the minimap all measure.
*
* Orthographically this IS `orthoSize`. In perspective the visible extent is the
* frustum's cross-section at the focus plane, `tan(fov/2) · distance` — merely
* proportional to the zoom value, not equal to it. Everything that needs "how
* much world is on screen" asks here rather than reading `orthoSize`, which
* answers for one of the two projections and silently mis-scales the other.
*/
function x(e) {
	return e.perspective ? Math.tan(e.fov * Math.PI / 180 / 2) * e.distance : e.orthoSize;
}
/** {@link editorViewHalfHeight} with the panel aspect applied — the visible world rect. */
function S(e, t) {
	const n = x(e);
	return {
		halfW: n * (t > 0 ? t : 1),
		halfH: n
	};
}
/**
* World units per screen pixel at @p at — what a thing drawn at a fixed number of
* pixels measures in the world where it stands. Orthographically the same
* everywhere; in perspective it grows with the distance along the view axis, which
* is the axis the projection divides by. Without @p at, the focus answers.
*/
function C(e, t, n) {
	const r = t > 0 ? 2 * x(e) / t : 0;
	const i = A(e);
	if (!e.perspective || !n || i <= 0) return r;
	const a = I(e);
	const o = k(e).forward;
	const s = (n.x - a.x) * o.x + (n.y - a.y) * o.y + (n.z - a.z) * o.z;
	return s > 0 ? r * (s / i) : r;
}
/**
* Zoom the view until it sees @p halfH world units of height, writing whichever
* field this projection zooms with. The inverse of {@link editorViewHalfHeight},
* so "frame this" and "how big is what I see" cannot disagree.
*/
function w(e, t) {
	if (e.perspective) {
		const n = Math.tan(e.fov * Math.PI / 180 / 2);
		e.distance = n > 0 ? t / n : t;
	} else e.orthoSize = t;
}
const T = n({ ...b }, "EditorView");
/**
* True when the view is turned away from the head-on 2D one. Absent angles read
* as zero: a workspace saved before this existed, or a partial view an embedder
* hands in, is the 2D view — not an orbit by NaN.
*/
function E(e) {
	return (e.yaw ?? 0) !== 0 || (e.pitch ?? 0) !== 0;
}
/**
* Where the world axes point on screen for this view. Read off the very basis the
* camera is built from, so an indicator drawn from it cannot disagree with what is
* rendered — a second copy of the rotation is exactly how those two drift apart.
*/
function D(e) {
	const t = O(e);
	const n = (e) => ({
		dx: t[e],
		dy: -t[e + 1],
		depth: t[e + 2]
	});
	return {
		x: n(0),
		y: n(4),
		z: n(8)
	};
}
function O(e) {
	const t = Math.PI / 180;
	return f(0, 0, 0, (e.yaw ?? 0) * t, (e.pitch ?? 0) * t, 0);
}
/**
* Where the view's right / up / forward point in the world.
*
* A drag is a screen direction, and this is what it means in world terms. Read
* off the very matrix the camera is built from, so navigation cannot move along
* axes the picture was not drawn with.
*/
function k(e) {
	const t = O(e);
	return {
		right: {
			x: t[0],
			y: t[4],
			z: t[8]
		},
		up: {
			x: t[1],
			y: t[5],
			z: t[9]
		},
		forward: {
			x: -t[2],
			y: -t[6],
			z: -t[10]
		}
	};
}
/**
* How far the eye stands off the focus. A perspective eye has to stand
* somewhere, and so does an orbited orthographic one; head-on 2D does not.
*/
function A(e) {
	return e.perspective || E(e) ? e.distance : 0;
}
/**
* How far the view's volume reaches, from the EYE — which stands off what it is
* looking at, and spends that stand-off before the scene begins. So the reach past
* the focus is constant and the stand-off is added to it; a head-on orthographic
* eye, which has none, is left with exactly the reach it always had.
*/
function j(e) {
	return A(e) + N;
}
/**
* Where the volume begins, from the eye. Zero orthographically — that projection
* builds a symmetric box and ignores it. Depth resolution goes as distance² over
* near, and the stand-off IS the distance, so how close the near plane may sit is
* a question about the zoom. The floor is what answers at a close-up eye.
*/
function M(e) {
	return e.perspective ? Math.max(F, A(e) * P) : 0;
}
/** How far past what the view is looking at its volume extends. */
const N = 1e5;
/** The near plane as a fraction of the stand-off, and the closest it ever sits. */
const P = .001;
const F = .1;
/** Where the eye stands in world space. */
function I(e) {
	const t = O(e);
	const n = A(e);
	return {
		x: e.x + t[2] * n,
		y: e.y + t[6] * n,
		z: (e.z ?? 0) + t[10] * n
	};
}
function L(e) {
	if (!e.active) return null;
	return e.perspective ? I(e) : {
		x: e.x,
		y: e.y,
		z: e.z ?? 0
	};
}
/**
* Move the focus by an offset in the view's OWN axes, in world units.
*
* Every navigation that is not a turn is this: a drag, a zoom about the cursor,
* a dolly. Expressing them here is what keeps them from each picking a world
* plane of their own, which is only the same answer while the eye is head-on.
*/
function R(e, t, n, r = 0) {
	const i = k(e);
	e.x += i.right.x * t + i.up.x * n + i.forward.x * r;
	e.y += i.right.y * t + i.up.y * n + i.forward.y * r;
	e.z = (e.z ?? 0) + i.right.z * t + i.up.z * n + i.forward.z * r;
}
/**
* How much of the screen's two axes an axis-aligned box of half-size @p half
* covers, in world units — what "fit this in the frame" has to measure.
*/
function z(e, t) {
	const n = k(e);
	const r = (e) => Math.abs(e.x) * t.x + Math.abs(e.y) * t.y + Math.abs(e.z) * t.z;
	return {
		right: r(n.right),
		up: r(n.up)
	};
}
/**
* The plane this view is ABOUT: the ground under a 3D scene (perspective is the
* editor's word for looking at one), the plane 2D content lives on otherwise.
*
* Answered by the view alone, at every angle — what the GRID draws. A grid is the
* frame the eye judges the scene against, so one that changes plane partway
* through an orbit moves the frame itself; edge-on it converges into the horizon
* and the shader's fade takes it.
*/
function B(e) {
	return e.perspective ? {
		u: 0,
		v: 2,
		normal: 1
	} : {
		u: 0,
		v: 1,
		normal: 2
	};
}
/**
* The plane a GESTURE acts on: {@link editorViewGridPlane}, handed over to the
* plane the eye most faces where it would otherwise look along it — a drag on a
* plane seen edge-on turns a pixel of cursor travel into unbounded world motion.
* Input only; the grid asks the other one.
*/
function V(e) {
	const t = B(e);
	const n = D(e);
	const r = (e) => Math.abs((e === 0 ? n.x : e === 1 ? n.y : n.z).depth);
	if (r(t.normal) >= H) return t;
	const i = [
		0,
		1,
		2
	].reduce((e, t) => r(t) > r(e) ? t : e, 0);
	const [a, o] = [
		0,
		1,
		2
	].filter((e) => e !== i);
	return {
		u: a,
		v: o,
		normal: i
	};
}
/** How square-on a plane must be to be the one worked on — about 6° off edge-on. */
const H = .1;
/**
* The work-plane axis a screen direction names, with the sign pointing that way —
* what "right" and "up" mean for a gesture on that plane. `right` resolves first
* and `up` takes the plane's other axis, so the pair is never one axis twice.
* Head-on: +X right, +Y up.
*/
function U(e) {
	const t = V(e);
	const n = D(e);
	const r = (e) => e === 0 ? n.x : e === 1 ? n.y : n.z;
	const i = [t.u, t.v];
	const a = (e, t, n) => t * (n === "right" ? r(e).dx : -r(e).dy);
	const o = (e, t) => {
		let n = {
			axis: e[0],
			sign: 1
		};
		let r = -Infinity;
		for (const i of e) for (const e of [1, -1]) {
			const o = a(i, e, t);
			if (o > r) {
				r = o;
				n = {
					axis: i,
					sign: e
				};
			}
		}
		return n;
	};
	const s = o(i, "right");
	return {
		right: s,
		up: o(i.filter((e) => e !== s.axis), "up")
	};
}
/** A world axis as a unit vector. */
function W(e) {
	return {
		x: e === 0 ? 1 : 0,
		y: e === 1 ? 1 : 0,
		z: e === 2 ? 1 : 0
	};
}
/**
* Yaw/pitch that put the eye on a world axis, looking back down it — the standard
* views (front, side, top) every DCC offers. `sign` picks which end of the axis the
* eye stands on.
*/
function G(e, t) {
	if (e === "y") return {
		yaw: 0,
		pitch: 90 * t
	};
	if (e === "x") return {
		yaw: 90 * t,
		pitch: 0
	};
	return {
		yaw: t > 0 ? 0 : 180,
		pitch: 0
	};
}
//#endregion
//#region src/residency/components.ts
/**
* @file    components.ts
* @brief   What a project AUTHORS about residency: that a world is streamed, what
*          stays out of the streaming, and who asks for content to be present.
*
* @details Three declarations and no policy. The grid is read by the cook, which
*          is what turns one authored world into a persistent scene plus cells;
*          the source is read by the streamer, which is the only thing that
*          decides what exists. Neither is a place to put "load this now" — a
*          game that could say that has an answer the engine can never make
*          asynchronous.
*/
/** The plane a streamed world is cut on. @experimental */
let K = /* @__PURE__ */ function(e) {
	/** A 3D world's ground: cells along world x and z, and y does not partition. */
	e[e["Ground"] = 0] = "Ground";
	/** A 2D world's screen plane: cells along world x and y, and z (depth, layering) does not partition. */
	e[e["Screen"] = 1] = "Screen";
	return e;
}({});
/**
* Declares the scene carrying it a streamed world, and how the cook cuts it.
*
* Its entity is persistent by construction — it is what says the world streams.
* Presence is the switch: remove it and the scene loads whole, which is what a
* small one should do and what every scene did before.
*
* @experimental
*/
const q = e("StreamedWorld", {
	cellSize: 1e3,
	plane: 0
}, { fields: {
	cellSize: {
		min: 1,
		unit: "wu",
		tooltip: "Edge of one cell on the plane."
	},
	plane: {
		enum: [{
			label: "Ground (x, z)",
			value: 0
		}, {
			label: "Screen (x, y)",
			value: 1
		}],
		tooltip: "Which two world axes the cells are cut along: a 3D world is cut on the ground, a 2D world on the screen plane."
	}
} });
/**
* Keeps the entity's whole subtree out of the partition — the player, the camera,
* the sun, the services that outlive any place.
*
* NOT scene persistence (`setPersistent`, which is about surviving a scene
* SWITCH): this decides which cooked scene an entity is written into.
*
* @experimental
*/
const J = t("WorldPersistent");
/**
* "Keep the world near me present." Add it beside a `Transform`.
*
* A source states a need, never a decision: several may exist and their asks are
* UNIONED, which is what makes split screen, a spectator, a cinematic camera and
* an editor preview the same kind of thing.
*
* @experimental
*/
const Y = e("WorldStreamingSource", {
	prefetchRadius: 3e3,
	loadRadius: 2e3,
	unloadRadius: 3e3,
	enabled: true
}, { fields: {
	prefetchRadius: {
		min: 0,
		unit: "wu",
		tooltip: "Cells this close are prepared, not shown."
	},
	loadRadius: {
		min: 0,
		unit: "wu",
		tooltip: "Cells this close are brought in."
	},
	unloadRadius: {
		min: 0,
		unit: "wu",
		tooltip: "Resident cells are kept until past this."
	}
} });
//#endregion
export { f as A, U as C, m as D, g as E, o as F, c as M, h as N, y as O, i as P, R as S, W as T, E as _, b as a, C as b, G as c, j as d, M as f, x as g, S as h, Y as i, u as j, _ as k, k as l, B as m, q as n, T as o, I as p, J as r, D as s, K as t, z as u, A as v, w, L as x, V as y };

//# sourceMappingURL=components.js.map