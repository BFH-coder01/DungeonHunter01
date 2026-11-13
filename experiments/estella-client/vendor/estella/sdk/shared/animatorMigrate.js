import { $t as e, Et as t, c as n, n as r, pt as i, qt as a, rn as o, t as s, wt as c } from "./system.js";
import { i as l, t as u } from "./resource.js";
import { s as d } from "./logger.js";
import { t as f } from "./env.js";
import { G as p, W as m, _ as h, t as g } from "./Animator.js";
import { t as _ } from "./quat.js";
//#region src/ecs/systemLabels.ts
/**
* @file    systemLabels.ts
* @brief   System and plugin name constants for ordering dependencies
*/
const v = {
	UILayout: "uiLayout",
	UIInteraction: "uiInteraction",
	UIRenderOrder: "uiRenderOrder",
	UIVisibility: "uiVisibility",
	UIMask: "uiMask",
	Text: "text",
	Focus: "focus",
	Drag: "drag",
	SafeArea: "safeArea",
	TextInput: "textInput"
};
const y = {
	UILayout: "UILayoutSystem",
	UILayoutLate: "UILayoutLateSystem",
	RectAnchors: "RectAnchorsSystem",
	RectAnchorsLate: "RectAnchorsLateSystem",
	UIRenderOrder: "UIRenderOrderSystem",
	UIInteraction: "UIInteractionSystem",
	VirtualControls: "VirtualControlsSystem",
	ListView: "ListViewSystem",
	Text: "TextSystem",
	Focus: "FocusSystem",
	Tween: "TweenSystem",
	Animator: "AnimatorSystem",
	SpriteAnimator: "SpriteAnimatorSystem"
};
//#endregion
//#region src/animation/gripContact.ts
/**
* @file    gripContact.ts
* @brief   What a held object is to the fingers: simple shapes they close onto, and stop at.
*
* @details A mesh is too much to ask of every finger every frame, and the part of an object a hand closes around is nearly always a
*          handle, a barrel, a ball or a block. So the object says so: a `GripSurface` on it, or on anything under it, is a cylinder,
*          a capsule, a sphere or a box, sized in its own units as a collider is. Fingers close joint by joint until a bone meets one,
*          and the thumb's reach is moved out of them. Nothing here needs physics: it is a distance from a point to a shape.
*/
/** The shape a grip surface is. @experimental */
const b = {
	Cylinder: 0,
	Capsule: 1,
	Sphere: 2,
	Box: 3
};
/**
* A shape on a held object that fingers close onto and stop at: a handle, a barrel, a mug's body. Goes on the object or anything under it;
* a `GripProfile` with `wrap` on closes each hand's fingers onto every one there.
*
* @experimental
*/
const x = /* @__PURE__ */ e("GripSurface", {
	shape: b.Cylinder,
	direction: 1,
	center: {
		x: 0,
		y: 0,
		z: 0
	},
	radius: .5,
	height: 1,
	size: {
		x: 1,
		y: 1,
		z: 1
	}
}, { fields: {
	shape: {
		enum: [
			{
				label: "Cylinder",
				value: 0
			},
			{
				label: "Capsule",
				value: 1
			},
			{
				label: "Sphere",
				value: 2
			},
			{
				label: "Box",
				value: 3
			}
		],
		tooltip: "What the fingers close onto."
	},
	direction: {
		enum: [
			{
				label: "X",
				value: 0
			},
			{
				label: "Y",
				value: 1
			},
			{
				label: "Z",
				value: 2
			}
		],
		tooltip: "The axis a cylinder or capsule runs along."
	},
	center: { tooltip: "Its middle, in this entity's own units." },
	radius: {
		min: 0,
		step: .001,
		tooltip: "A cylinder's, capsule's or sphere's radius."
	},
	height: {
		min: 0,
		step: .001,
		tooltip: "A cylinder's or capsule's whole length."
	},
	size: { tooltip: "A box's size." }
} });
const ee = (e, t) => e.tryGet(t, i)?.entities ?? [];
const te = (e, t) => t === 0 ? e.x : t === 2 ? e.z : e.y;
/** Every grip surface on `root` and under it, placed where its transform now is. Transforms must be composed. @internal */
function ne(e, t) {
	const n = [];
	const r = [t];
	for (let t = 0; t < r.length && t < 256; t++) {
		const i = r[t];
		if (e.has(i, x) && e.has(i, a)) {
			const t = e.get(i, x);
			const r = e.get(i, a);
			const o = {
				x: Math.abs(r.worldScale.x),
				y: Math.abs(r.worldScale.y),
				z: Math.abs(r.worldScale.z)
			};
			const s = _.normalize(r.worldRotation);
			const c = t.center ?? {
				x: 0,
				y: 0,
				z: 0
			};
			const l = {
				x: r.worldPosition.x,
				y: r.worldPosition.y,
				z: r.worldPosition.z
			};
			const u = _.rotate(s, {
				x: c.x * o.x,
				y: c.y * o.y,
				z: c.z * o.z
			});
			l.x += u.x;
			l.y += u.y;
			l.z += u.z;
			const d = t.direction === 0 || t.direction === 2 ? t.direction : 1;
			const f = d === 0 ? Math.max(o.y, o.z) : d === 2 ? Math.max(o.x, o.y) : Math.max(o.x, o.z);
			const p = Math.max(0, t.radius) * (t.shape === b.Sphere ? Math.max(o.x, o.y, o.z) : f);
			const m = Math.max(0, t.height) * te(o, d);
			const h = t.shape === b.Capsule ? Math.max(0, m / 2 - p) : m / 2;
			const g = t.size ?? {
				x: 1,
				y: 1,
				z: 1
			};
			n.push({
				shape: t.shape,
				center: l,
				turn: s,
				axis: d,
				radius: p,
				half: h,
				halves: {
					x: Math.abs(g.x) * o.x / 2,
					y: Math.abs(g.y) * o.y / 2,
					z: Math.abs(g.z) * o.z / 2
				}
			});
		}
		r.push(...ee(e, i));
	}
	return n;
}
/**
* Every grip surface on `object` and under it as lines in the world, where the fingers meet them: what an editor draws. Transforms must be
* composed.
* @experimental
*/
function re(e, t) {
	const n = [];
	const r = 24;
	for (const i of ne(e, t)) {
		const e = (e) => {
			const t = _.rotate(i.turn, e);
			return {
				x: i.center.x + t.x,
				y: i.center.y + t.y,
				z: i.center.z + t.z
			};
		};
		const t = (e, t, n) => i.axis === 0 ? {
			x: e,
			y: t,
			z: n
		} : i.axis === 2 ? {
			x: t,
			y: n,
			z: e
		} : {
			x: t,
			y: e,
			z: n
		};
		const a = (n, i, a = 0, o = Math.PI * 2, s = r) => Array.from({ length: s + 1 }, (r, c) => {
			const l = a + (o - a) * c / s;
			return e(t(n, Math.cos(l) * i, Math.sin(l) * i));
		});
		if (i.shape === b.Box) {
			const t = i.halves;
			const r = (n, r, i) => e({
				x: n * t.x,
				y: r * t.y,
				z: i * t.z
			});
			n.push([
				r(-1, -1, -1),
				r(1, -1, -1),
				r(1, -1, 1),
				r(-1, -1, 1),
				r(-1, -1, -1)
			], [
				r(-1, 1, -1),
				r(1, 1, -1),
				r(1, 1, 1),
				r(-1, 1, 1),
				r(-1, 1, -1)
			]);
			for (const [e, t] of [
				[-1, -1],
				[1, -1],
				[1, 1],
				[-1, 1]
			]) n.push([r(e, -1, t), r(e, 1, t)]);
		} else if (i.shape === b.Sphere) {
			const t = i.radius;
			const a = (t) => Array.from({ length: 25 }, (n, i) => e(t(Math.PI * 2 * i / r)));
			n.push(a((e) => ({
				x: Math.cos(e) * t,
				y: Math.sin(e) * t,
				z: 0
			})), a((e) => ({
				x: Math.cos(e) * t,
				y: 0,
				z: Math.sin(e) * t
			})), a((e) => ({
				x: 0,
				y: Math.cos(e) * t,
				z: Math.sin(e) * t
			})));
		} else {
			n.push(a(i.half, i.radius), a(-i.half, i.radius));
			for (let r = 0; r < 4; r++) {
				const a = r * Math.PI / 2, o = Math.cos(a) * i.radius, s = Math.sin(a) * i.radius;
				n.push([e(t(-i.half, o, s)), e(t(i.half, o, s))]);
			}
			if (i.shape === b.Capsule) for (const a of [1, -1]) for (const o of [0, 1]) n.push(Array.from({ length: 13 }, (n, s) => {
				const c = Math.PI * s / (r / 2), l = a * (i.half + Math.sin(c) * i.radius), u = Math.cos(c) * i.radius;
				return e(o ? t(l, 0, u) : t(l, u, 0));
			}));
		}
	}
	return n;
}
/** How far a point in the world is from the surface, outside positive, inside negative. */
function ie(e, t) {
	const n = _.rotate(_.conjugate(e.turn), {
		x: t.x - e.center.x,
		y: t.y - e.center.y,
		z: t.z - e.center.z
	});
	if (e.shape === b.Sphere) return Math.hypot(n.x, n.y, n.z) - e.radius;
	if (e.shape === b.Box) {
		const t = Math.abs(n.x) - e.halves.x, r = Math.abs(n.y) - e.halves.y, i = Math.abs(n.z) - e.halves.z;
		return Math.hypot(Math.max(t, 0), Math.max(r, 0), Math.max(i, 0)) + Math.min(Math.max(t, r, i), 0);
	}
	const r = te(n, e.axis);
	const i = e.axis === 0 ? Math.hypot(n.y, n.z) : e.axis === 2 ? Math.hypot(n.x, n.y) : Math.hypot(n.x, n.z);
	if (e.shape === b.Capsule) {
		const t = Math.abs(r) - e.half;
		return Math.hypot(i, Math.max(t, 0)) - e.radius;
	}
	const a = i - e.radius, o = Math.abs(r) - e.half;
	return Math.min(Math.max(a, o), 0) + Math.hypot(Math.max(a, 0), Math.max(o, 0));
}
/** How far a point is from the nearest of the surfaces. Infinite with none. @internal */
function ae(e, t) {
	let n = Infinity;
	for (const r of e) {
		const e = ie(r, t);
		if (e < n) n = e;
	}
	return n;
}
/** How near a bone from `a` to `b` comes to any surface, its line measured at a few points along it. @internal */
function oe(e, t, n) {
	let r = Infinity;
	for (let i = 0; i <= 4; i++) {
		const a = i / 4;
		const o = ae(e, {
			x: t.x + (n.x - t.x) * a,
			y: t.y + (n.y - t.y) * a,
			z: t.z + (n.z - t.z) * a
		});
		if (o < r) r = o;
	}
	return r;
}
/**
* A finger closed from `start` toward `limit`, every free joint together, until its bones meet a surface: a bone that touches holds itself
* and every joint before it where it touched, and those after it go on closing. `touching(bends, from)` answers the first bone from `from` on
* that touches with these bends, or -1. Answers the bends, and whether any bone touched.
* @internal
*/
function se(e, t, n) {
	const r = e.length;
	const i = [...e];
	let a = 0, o = false;
	const s = 40;
	let c = 0;
	const l = (n) => {
		for (let o = a; o < r; o++) i[o] = e[o] + (t[o] - e[o]) * n;
	};
	while (a < r && c < 1) {
		const e = Math.min(1, c + 1 / s);
		l(e);
		if (n(i, a) < 0) {
			c = e;
			continue;
		}
		let t = c, r = e;
		for (let e = 0; e < 10; e++) {
			const e = (t + r) / 2;
			l(e);
			if (n(i, a) >= 0) r = e;
			else t = e;
		}
		l(r);
		const u = n(i, a);
		l(t);
		o = true;
		a = Math.max(a, u) + 1;
		c = t;
	}
	return {
		bends: i,
		touched: o
	};
}
//#endregion
//#region src/animation/gripPose.ts
const S = (e, t, n) => ({
	curl: e,
	...t !== void 0 ? { base: t } : {},
	...n !== void 0 ? { spread: n } : {}
});
const C = (e, t = 0, n = "fingers") => ({
	opposition: e,
	gap: t,
	to: n
});
const w = new Map(Object.entries({
	open: {
		thumb: C(0),
		index: S(0),
		middle: S(0),
		ring: S(0),
		pinky: S(0)
	},
	relaxed: {
		thumb: C(.25, .6),
		index: S(.18, .15),
		middle: S(.25, .2),
		ring: S(.3, .25),
		pinky: S(.35, .3)
	},
	fist: {
		thumb: C(1),
		index: S(1),
		middle: S(1),
		ring: S(1),
		pinky: S(1)
	},
	pistol: {
		thumb: C(1, .4),
		index: S(.1, .32),
		middle: S(.78, .72),
		ring: S(.82, .76),
		pinky: S(.85, .8),
		trigger: S(.55, .42)
	},
	support: {
		thumb: C(.9, .5),
		index: S(.4, .35),
		middle: S(.45, .4),
		ring: S(.48, .42),
		pinky: S(.5, .45)
	},
	handle: {
		thumb: C(1, .1),
		index: S(.78, .7),
		middle: S(.82, .75),
		ring: S(.85, .78),
		pinky: S(.88, .8)
	},
	pinch: {
		thumb: C(1, 0, "index"),
		index: S(.55, .5),
		middle: S(.25, .2),
		ring: S(.25, .2),
		pinky: S(.25, .2)
	},
	cup: {
		thumb: C(.9, .8),
		index: S(.45, .25, .3),
		middle: S(.45, .25, .3),
		ring: S(.45, .25, .3),
		pinky: S(.45, .25, .3)
	}
}));
/** Adds a pose of the game's own, or replaces one by name. @experimental */
function ce(e, t) {
	w.set(e, t);
}
/** The names a `GripPose` component can take. @experimental */
function le() {
	return [...w.keys()];
}
/** The pose of that name, or undefined. @experimental */
function ue(e) {
	return w.get(e);
}
/**
* Holds a rig's hands in a named pose. Goes on the rig's root.
*
* @experimental
*/
const de = /* @__PURE__ */ e("GripPose", {
	rightPose: "",
	leftPose: "",
	rightWeight: 1,
	leftWeight: 1,
	rightTrigger: 0,
	leftTrigger: 0,
	blendSeconds: .15,
	rightHand: "",
	leftHand: ""
}, { fields: {
	rightPose: {
		category: "Right Hand",
		tooltip: "open, relaxed, fist, pistol, support, handle, pinch, cup, or one the game registers. Empty leaves the hand alone."
	},
	rightWeight: {
		min: 0,
		max: 1,
		step: .01,
		category: "Right Hand",
		tooltip: "How much of the pose applies, over what a clip is doing with the fingers."
	},
	rightTrigger: {
		min: 0,
		max: 1,
		step: .01,
		category: "Right Hand",
		tooltip: "How far the index finger has gone from resting to pressing, in a pose that has both."
	},
	rightHand: {
		category: "Right Hand",
		advanced: true,
		tooltip: "The hand joint, by path from this entity. Empty looks for it by name."
	},
	leftPose: {
		category: "Left Hand",
		tooltip: "open, relaxed, fist, pistol, support, handle, pinch, cup, or one the game registers. Empty leaves the hand alone."
	},
	leftWeight: {
		min: 0,
		max: 1,
		step: .01,
		category: "Left Hand",
		tooltip: "How much of the pose applies, over what a clip is doing with the fingers."
	},
	leftTrigger: {
		min: 0,
		max: 1,
		step: .01,
		category: "Left Hand",
		tooltip: "How far the index finger has gone from resting to pressing, in a pose that has both."
	},
	leftHand: {
		category: "Left Hand",
		advanced: true,
		tooltip: "The hand joint, by path from this entity. Empty looks for it by name."
	},
	blendSeconds: {
		min: 0,
		step: .01,
		unit: "s",
		tooltip: "About how long a change of pose takes."
	}
} });
/** The fingers, in the order a hand's numbers are kept. */
const T = [
	"thumb",
	"index",
	"middle",
	"ring",
	"pinky"
];
const fe = {
	thumb: /thumb/i,
	index: /index|pointer/i,
	middle: /middle/i,
	ring: /(?<![a-z])ring|[a-z]ring(?=[\d_.:-]|$)/i,
	pinky: /pinky|pinkie|little/i
};
/** A bone inside the palm: nothing a pose bends, and what the first joint of a finger may hang from. */
const pe = /metacarpal|palm/i;
/** How far each joint of a finger bends when it is closed: first, second, third. In radians. */
const me = [
	Math.PI / 2,
	100 * Math.PI / 180,
	70 * Math.PI / 180
];
const he = 15 * Math.PI / 180;
const ge = {
	thumb: 0,
	index: 1,
	middle: .15,
	ring: -.6,
	pinky: -1
};
const E = (e, t) => ({
	x: e.x + t.x,
	y: e.y + t.y,
	z: e.z + t.z
});
const D = (e, t) => ({
	x: e.x - t.x,
	y: e.y - t.y,
	z: e.z - t.z
});
const _e = (e, t) => e.x * t.x + e.y * t.y + e.z * t.z;
const O = (e, t) => ({
	x: e.x * t,
	y: e.y * t,
	z: e.z * t
});
const k = (e, t) => ({
	x: e.y * t.z - e.z * t.y,
	y: e.z * t.x - e.x * t.z,
	z: e.x * t.y - e.y * t.x
});
const A = (e) => {
	const t = Math.hypot(e.x, e.y, e.z);
	return t < 1e-9 ? {
		x: 0,
		y: 0,
		z: 0
	} : O(e, 1 / t);
};
const j = (e, t) => {
	const n = Math.sin(t / 2);
	return {
		w: Math.cos(t / 2),
		x: e.x * n,
		y: e.y * n,
		z: e.z * n
	};
};
const M = (e, t) => e.tryGet(t, c)?.value ?? "";
const N = (e, t) => e.tryGet(t, i)?.entities ?? [];
/** Numbers a hand is held by, kept flat so two poses can be eased between: each finger's three joint bends and its lean (radians), then the thumb's reach, how much of it is for the index tip, and its gap. */
const ve = 4;
const P = T.length * ve + 3;
const ye = P - 3;
const be = P - 2;
const xe = P - 1;
/** Which way a positive `fan` leans each finger along its spread axis: out from the middle of the hand. */
const Se = {
	thumb: 0,
	index: 1,
	middle: 1,
	ring: -1,
	pinky: -1
};
const Ce = Math.PI / 180;
const we = (e, t, n) => e > t ? e < n ? e : n : t;
/** A finger's three joint bends and its lean, in radians: a bend by joint where it says one, else its curl and base. */
function Te(e, t) {
	const n = F(t?.curl ?? 0), r = F(t?.base ?? t?.curl ?? 0);
	const i = (e, n) => {
		const r = t?.bend?.[e];
		return typeof r === "number" && Number.isFinite(r) ? we(r, -45, 130) * Ce : n;
	};
	const a = t?.fan;
	return [
		i(0, r * me[0]),
		i(1, n * me[1]),
		i(2, n * me[2]),
		typeof a === "number" && Number.isFinite(a) ? Se[e] * we(a, -30, 30) * Ce : we(t?.spread ?? 0, -1, 1) * ge[e] * he
	];
}
function Ee(e, t) {
	let n = 0;
	for (const r of T) {
		const i = r === "thumb" ? [
			0,
			0,
			0,
			0
		] : Te(r, e?.[r]);
		for (const e of i) t[n++] = e;
	}
	t[ye] = F(e?.thumb?.opposition ?? 0);
	t[be] = e?.thumb?.to === "index" ? 1 : 0;
	t[xe] = Math.max(0, e?.thumb?.gap ?? 0);
}
const F = (e) => e > 0 ? e < 1 ? e : 1 : 0;
/**
* A pose with every finger said joint by joint, in degrees: what an editor starts from when a preset is to be changed one joint at a time. It holds
* the hand exactly as the preset does.
*
* @experimental
*/
function De(e) {
	const t = (e) => Math.round(e / Ce * 10) / 10;
	const n = (e, n) => {
		const [r, i, a, o] = Te(e, n);
		const s = Se[e];
		return {
			curl: n?.curl ?? 0,
			bend: [
				t(r),
				t(i),
				t(a)
			],
			fan: s ? t(o / s) : 0
		};
	};
	const r = {
		thumb: {
			opposition: F(e.thumb?.opposition ?? 0),
			to: e.thumb?.to === "index" ? "index" : "fingers",
			gap: Math.max(0, e.thumb?.gap ?? 0)
		},
		index: n("index", e.index),
		middle: n("middle", e.middle),
		ring: n("ring", e.ring),
		pinky: n("pinky", e.pinky)
	};
	if (e.trigger) r.trigger = n("index", e.trigger);
	return r;
}
/** A pose read from JSON as an editor writes it, any part it leaves out taken as open. Null for text that is not one. @experimental */
function Oe(e) {
	if (!e) return null;
	let t;
	try {
		t = JSON.parse(e);
	} catch {
		return null;
	}
	if (!t || typeof t !== "object") return null;
	const n = t;
	const r = (e) => typeof e === "number" && Number.isFinite(e) ? e : void 0;
	const i = (e) => {
		const t = e && typeof e === "object" ? e : {};
		const n = { curl: r(t.curl) ?? 0 };
		if (r(t.base) !== void 0) n.base = r(t.base);
		if (r(t.spread) !== void 0) n.spread = r(t.spread);
		if (Array.isArray(t.bend) && t.bend.length === 3 && t.bend.every((e) => r(e) !== void 0)) n.bend = [
			t.bend[0],
			t.bend[1],
			t.bend[2]
		];
		if (r(t.fan) !== void 0) n.fan = r(t.fan);
		return n;
	};
	const a = n.thumb && typeof n.thumb === "object" ? n.thumb : {};
	const o = {
		thumb: {
			opposition: r(a.opposition) ?? 0,
			to: a.to === "index" ? "index" : "fingers",
			gap: r(a.gap) ?? 0
		},
		index: i(n.index),
		middle: i(n.middle),
		ring: i(n.ring),
		pinky: i(n.pinky)
	};
	if (n.trigger) o.trigger = i(n.trigger);
	return o;
}
/** A finger's bones in order, from the hand: those named for it, knuckle first, those in the palm passed through. */
function I(e, t, n) {
	const r = fe[n];
	const i = (t, n) => {
		if (n > 3) return null;
		for (const n of N(e, t)) if (r.test(M(e, n)) && !pe.test(M(e, n))) return n;
		for (const r of N(e, t)) {
			const t = M(e, r);
			if (pe.test(t)) {
				const e = i(r, n + 1);
				if (e !== null) return e;
			}
		}
		return null;
	};
	const a = i(t, 0);
	if (a === null) return [];
	const o = [a];
	for (let t = a, n = 0; n < 6; n++) {
		const n = N(e, t).find((t) => r.test(M(e, t))) ?? null;
		if (n === null) break;
		o.push(n);
		t = n;
	}
	return o;
}
/** Where a joint stands from the hand, and its turn from it. */
function L(e, t) {
	let n = {
		x: 0,
		y: 0,
		z: 0
	};
	let r = {
		w: 1,
		x: 0,
		y: 0,
		z: 0
	};
	const i = [], o = [];
	for (const s of t) {
		const t = e.get(s, a);
		n = E(n, _.rotate(r, t.position));
		r = _.normalize(_.mul(r, t.rotation));
		i.push(n);
		o.push(r);
	}
	return {
		at: i,
		turn: o
	};
}
/** Which way the palm faces, and toward the thumb across it, in the hand's own frame. Null with too few fingers to tell. */
function ke(e, t, n) {
	const r = (t) => {
		const r = n[t];
		return r && r.length ? L(e, r).at[0] : null;
	};
	const i = r("index") ?? r("middle");
	const a = r("pinky") ?? r("ring") ?? r("middle");
	const o = r("middle") ?? i;
	if (!i || !a || !o) return null;
	const s = A(D(i, a));
	if (Math.hypot(s.x, s.y, s.z) < .5) return null;
	const c = n.middle && n.middle.length > 1 ? n.middle : n.index && n.index.length > 1 ? n.index : null;
	const l = c ? L(e, c).at : null;
	const u = l ? D(l[1], l[0]) : o;
	const d = A(D(u, O(s, _e(u, s))));
	const f = A(O(k(d, s), t === "right" ? -1 : 1));
	return Math.hypot(f.x, f.y, f.z) < .5 ? null : {
		palm: f,
		across: s,
		forward: d
	};
}
/** The hand's joints, with the turns a pose asks of each. They are worked out from the rig as it stands now, once. */
function Ae(e, t, n) {
	const r = {};
	for (const n of T) r[n] = I(e, t, n);
	const i = ke(e, n, r);
	if (!i) return null;
	const { palm: o, across: s } = i;
	const c = [];
	const l = [];
	for (const n of T) {
		const i = r[n];
		if (i.length === 0) {
			l.push(n);
			continue;
		}
		const { at: u, turn: d } = L(e, i);
		const f = A(i.length > 1 ? D(u[1], u[0]) : u[0]);
		const p = A(k(f, o));
		const m = i.slice(0, 3).map((t, n) => {
			const r = _.conjugate(d[n]);
			const i = _.normalize(e.get(t, a).rotation);
			const c = e.get(t, a).position;
			const l = {
				entity: t,
				rest: { ...i },
				at: {
					x: c.x,
					y: c.y,
					z: c.z
				},
				curlAxis: A(_.rotate(r, p)),
				written: { ...i }
			};
			if (n === 0) {
				l.spreadAxis = A(_.rotate(r, o));
				if (_e(k(o, f), s) < 0) l.spreadAxis = O(l.spreadAxis, -1);
			}
			return l;
		});
		c.push({
			name: n,
			joints: m,
			fan: ge[n],
			root: je(e, t, i[0]),
			tip: Me(e, i)
		});
	}
	const u = r.index ?? [], d = r.middle ?? [];
	const f = (t) => {
		const n = t.length ? L(e, t).at : [];
		let r = 0;
		for (let e = 1; e < n.length; e++) r += Math.hypot(n[e].x - n[e - 1].x, n[e].y - n[e - 1].y, n[e].z - n[e - 1].z);
		return r;
	};
	const p = f(u) || f(d) || 0;
	return {
		hand: t,
		fingers: c,
		missing: l,
		current: new Float64Array(P),
		wanted: new Float64Array(P),
		posed: new Float64Array(P),
		touching: [],
		thumbTouching: false,
		surfaces: null,
		world: {
			p: {
				x: 0,
				y: 0,
				z: 0
			},
			r: {
				w: 1,
				x: 0,
				y: 0,
				z: 0
			},
			s: 1
		},
		weight: 0,
		speed: new Float64Array(P + 1),
		settled: false,
		pose: "",
		trigger: 0,
		thumb: Ne(e, r.thumb ?? []),
		palm: o,
		across: s,
		reachUnit: p,
		index: u,
		middle: d
	};
}
/** Where a finger's first joint's parent stands in the hand as the rig rests, and its turn: through any bone in the palm between. */
function je(e, n, r) {
	const i = [];
	for (let a = e.tryGet(r, t)?.entity, o = 0; a !== void 0 && a !== n && o < 8; o++) {
		i.unshift(a);
		a = e.tryGet(a, t)?.entity;
	}
	let o = {
		x: 0,
		y: 0,
		z: 0
	}, s = {
		w: 1,
		x: 0,
		y: 0,
		z: 0
	};
	for (const t of i) {
		const n = e.get(t, a);
		o = E(o, _.rotate(s, n.position));
		s = _.normalize(_.mul(s, n.rotation));
	}
	return {
		p: o,
		r: s
	};
}
/** A finger's tip from its last bent joint: the next bone where the chain has one, else most of the bone before, as fingers end. */
function Me(e, t) {
	if (t.length > 3) return { ...e.get(t[3], a).position };
	const n = t[t.length - 1];
	const r = e.get(n, a);
	return O(_.rotate(_.conjugate(_.normalize(r.rotation)), r.position), .8);
}
/** The thumb's chain as it rests: null with fewer than three bones, since two cannot both reach and curl. */
function Ne(e, t) {
	if (t.length < 3) return null;
	const { at: n, turn: r } = L(e, t);
	const i = (e) => D(n[e + 1], n[e]);
	const o = t.length > 3 ? i(2) : O(i(1), .85);
	const s = [
		Math.hypot(...R(i(0))),
		Math.hypot(...R(i(1))),
		Math.hypot(...R(o))
	];
	if (s.some((e) => !(e > 1e-6))) return null;
	const c = e.get(t[0], a).rotation;
	return {
		root: n[0],
		lengths: s,
		restDirs: [
			A(i(0)),
			A(i(1)),
			A(o)
		],
		restTurns: [
			r[0],
			r[1],
			r[2]
		],
		parentTurn: _.normalize(_.mul(r[0], _.conjugate(c))),
		restTip: E(n[2], o)
	};
}
const R = (e) => [
	e.x,
	e.y,
	e.z
];
/** Where a bent chain's tip is, when its second and third joints each turn by `bend`, measured along its first bone and square to it. */
function Pe(e, t) {
	const [n, r, i] = e;
	return [n + r * Math.cos(t) + i * Math.cos(2 * t), r * Math.sin(t) + i * Math.sin(2 * t)];
}
/**
* The thumb's joints turned so its tip lands on `goal`, its bones curling toward `inward`: the bend found by halving, the plane by where the goal is.
* Answers each joint's turn from the hand; `points`, where given, gets where its root, its joints and its tip then stand in the hand.
*/
function Fe(e, t, n, r) {
	const i = D(t, e.root);
	const a = e.lengths[0] + e.lengths[1] + e.lengths[2];
	const o = Math.min(Math.max(Math.hypot(...R(i)), a * .35), a - 1e-6);
	let s = 0, c = 1.7;
	for (let t = 0; t < 24; t++) {
		const t = (s + c) / 2;
		const [n, r] = Pe(e.lengths, t);
		if (Math.hypot(n, r) > o) s = t;
		else c = t;
	}
	const l = (s + c) / 2;
	const [u, d] = Pe(e.lengths, l);
	const f = Math.atan2(d, u);
	const p = A(i);
	const m = D(n, O(p, _e(n, p)));
	const h = Math.hypot(...R(m)) > 1e-6 ? A(m) : A(k(p, {
		x: 0,
		y: 0,
		z: 1
	}));
	const g = (e) => E(O(p, Math.cos(e)), O(h, Math.sin(e)));
	const v = [
		g(-f),
		g(l - f),
		g(2 * l - f)
	];
	if (r) {
		let t = e.root;
		r.push(t);
		for (let n = 0; n < 3; n++) {
			t = E(t, O(v[n], e.lengths[n]));
			r.push(t);
		}
	}
	const y = [];
	let b = e.parentTurn, x = e.parentTurn;
	for (let t = 0; t < 3; t++) {
		const n = _.normalize(_.mul(_.mul(b, _.conjugate(x)), e.restTurns[t]));
		const r = _.rotate(_.mul(b, _.conjugate(x)), e.restDirs[t]);
		const i = _.normalize(_.mul(_.rotationTo(r, v[t]), n));
		y.push(i);
		x = e.restTurns[t];
		b = i;
	}
	return y;
}
const Ie = /hand|wrist/i;
const Le = /thumb|index|middle|ring|pinky|pinkie|little|finger|metacarpal|palm/i;
const Re = /right|(^|[^a-z])r($|[^a-z])/i;
const ze = /left|(^|[^a-z])l($|[^a-z])/i;
/**
* The palm of a hand joint, in the hand's own frame: its centre (halfway to the middle knuckle), and the turn whose +Z is the way the fingers point
* and whose +Y is the way the palm faces. Null for a hand whose fingers say neither. @internal
*/
function Be(e, t, n) {
	const r = {};
	for (const n of T) r[n] = I(e, t, n);
	const i = ke(e, n, r);
	const a = (r.middle?.length ? r.middle : r.index?.length ? r.index : r.ring) ?? null;
	if (!i || !a?.length) return null;
	const o = i.forward, s = A(D(i.palm, O(o, _e(i.palm, o))));
	const c = k(s, o);
	return {
		center: O(L(e, [a[0]]).at[0], .5),
		turn: Ve(c, s, o)
	};
}
/** The turn that takes +X, +Y, +Z to three square unit vectors. */
function Ve(e, t, n) {
	const r = e.x + t.y + n.z;
	let i, a, o, s;
	if (r > 0) {
		const c = Math.sqrt(r + 1) * 2;
		i = c / 4;
		a = (t.z - n.y) / c;
		o = (n.x - e.z) / c;
		s = (e.y - t.x) / c;
	} else if (e.x > t.y && e.x > n.z) {
		const r = Math.sqrt(1 + e.x - t.y - n.z) * 2;
		i = (t.z - n.y) / r;
		a = r / 4;
		o = (t.x + e.y) / r;
		s = (n.x + e.z) / r;
	} else if (t.y > n.z) {
		const r = Math.sqrt(1 + t.y - e.x - n.z) * 2;
		i = (n.x - e.z) / r;
		a = (t.x + e.y) / r;
		o = r / 4;
		s = (n.y + t.z) / r;
	} else {
		const r = Math.sqrt(1 + n.z - e.x - t.y) * 2;
		i = (e.y - t.x) / r;
		a = (n.x + e.z) / r;
		o = (n.y + t.z) / r;
		s = r / 4;
	}
	return _.normalize({
		w: i,
		x: a,
		y: o,
		z: s
	});
}
/** The joint named for that hand under `root`, nearest first. @internal */
function He(e, t, n) {
	const r = n === "right" ? Re : ze;
	const i = [t];
	for (let n = 0; n < i.length && n < 512; n++) {
		const a = i[n];
		const o = M(e, a);
		if (a !== t && Ie.test(o) && !Le.test(o) && r.test(o) && I(e, a, "middle").length + I(e, a, "index").length > 0) return a;
		i.push(...N(e, a));
	}
	return null;
}
const z = 1e-6;
const Ue = (e, t) => Math.abs(e.w - t.w) < z && Math.abs(e.x - t.x) < z && Math.abs(e.y - t.y) < z && Math.abs(e.z - t.z) < z;
/**
* A number moved toward where it is wanted, critically damped: it starts from still and comes to rest without passing it. Going a fixed share of the
* gap each frame would be at its fastest on the first, and a finger with far to go visibly jumps.
*/
function We(e, t, n, r, i, a) {
	if (i <= 0) {
		n.speed[r] = 0;
		return t;
	}
	const o = 6 / i;
	const s = e - t;
	const c = (n.speed[r] + o * s) * a;
	const l = Math.exp(-o * a);
	const u = (n.speed[r] - o * c) * l;
	const d = t + (s + c) * l;
	if (Math.abs(d - t) < .001 && Math.abs(u) < .01) {
		n.speed[r] = 0;
		return t;
	}
	n.speed[r] = u;
	return d;
}
/** A finger's joints and tip in the world, its joints bent by `bends` and its first leaning by `lean`, from the hand as this frame has it. */
function Ge(e, t, n, r) {
	let i = t.root.p, a = t.root.r;
	const o = [];
	const s = e.world;
	const c = (e) => E(s.p, _.rotate(s.r, O(e, s.s)));
	for (let e = 0; e < t.joints.length; e++) {
		const s = t.joints[e];
		i = E(i, _.rotate(a, s.at));
		let l = j(s.curlAxis, n[e] ?? 0);
		if (s.spreadAxis && r !== 0) l = _.mul(j(s.spreadAxis, r), l);
		a = _.normalize(_.mul(a, _.mul(s.rest, l)));
		o.push(c(i));
	}
	o.push(c(E(i, _.rotate(a, t.tip))));
	return o;
}
/** A finger's bone from the line through it to its skin: a share of the index finger's length, as fingers are. */
const Ke = .08;
/**
* Each finger closed from open toward the pose, joint by joint, until it meets a surface: what `wanted` asks of its bends then. Answers whether
* that changed anything. The thumb is moved out of the surfaces where it reaches (`thumbTurns`).
*/
function qe(e, t, n) {
	const r = e.get(t.hand, a);
	t.world = {
		p: { ...r.worldPosition },
		r: _.normalize(r.worldRotation),
		s: Math.abs(r.worldScale.x) || 1
	};
	t.surfaces = n;
	const i = t.reachUnit * Ke * t.world.s;
	let o = false;
	const s = [];
	for (const e of t.fingers) {
		if (e.name === "thumb") continue;
		const r = T.indexOf(e.name) * ve;
		const a = e.joints.length;
		const c = Array.from({ length: a }, (e, n) => t.posed[r + n]);
		const l = t.posed[r + 3];
		const u = c.map((e) => Math.min(0, e));
		const d = Ge(t, e, u, l);
		const f = Array.from({ length: a }, (e, t) => Math.min(i, oe(n, d[t], d[t + 1]) - 1e-6));
		const { bends: p, touched: m } = se(u, c, (r, i) => {
			const o = Ge(t, e, r, l);
			for (let e = i; e < a; e++) if (oe(n, o[e], o[e + 1]) <= f[e]) return e;
			return -1;
		});
		if (m) s.push(e.name);
		for (let e = 0; e < a; e++) if (Math.abs(t.wanted[r + e] - p[e]) > 1e-5) {
			t.wanted[r + e] = p[e];
			o = true;
		}
	}
	t.touching = s;
	return o;
}
/** Whether every joint still stands as this last wrote it: something else (a clip, an editor sampling one) may have turned them since. */
function Je(e, t) {
	for (const n of t.fingers) for (const t of n.joints) if (!e.valid(t.entity) || !Ue(e.get(t.entity, a).rotation, t.written)) return false;
	return true;
}
/**
* Holds one hand a frame: eases its numbers on, and turns each joint to them over what is there. `poseName` tells one pose from the next; `def` is it.
* `surfaces`, where there are any, are what the fingers close onto.
*/
function Ye(e, t, n, r, i, o, s, c, l, u) {
	const f = n ? r : null;
	if (n !== t.pose) {
		if (n && !f) d.warn("animation", `there is no grip pose called "${n}": the hand is left alone`);
		t.pose = n;
		if (f) {
			Ee(f, t.posed);
			t.wanted.set(t.posed);
		}
		t.settled = false;
	}
	if (f && u && u.length) {
		if (qe(e, t, u)) t.settled = false;
	} else if (t.surfaces) {
		t.surfaces = null;
		t.touching = [];
		if (f) t.wanted.set(t.posed);
		t.settled = false;
	}
	const m = f ? F(i) : 0;
	const h = f?.trigger ? F(o) : 0;
	if (h !== t.trigger) {
		t.trigger = h;
		t.settled = false;
	}
	if (m !== t.weight) t.settled = false;
	if (t.settled && !l && Je(e, t)) return;
	let g = true;
	for (let e = 0; e < P; e++) {
		const n = We(t.current[e], t.wanted[e], t, e, s, c);
		t.current[e] = n;
		if (n !== t.wanted[e]) g = false;
	}
	t.weight = We(t.weight, m, t, P, s, c);
	if (t.weight !== m) g = false;
	const v = [...t.fingers.filter((e) => e.name !== "thumb"), ...t.fingers.filter((e) => e.name === "thumb")];
	for (const n of v) {
		const r = n.name === "thumb" && t.thumb ? Xe(e, t) : null;
		const i = T.indexOf(n.name) * ve;
		const o = [
			t.current[i],
			t.current[i + 1],
			t.current[i + 2]
		];
		const s = t.current[i + 3];
		if (n.name === "index" && h > 0 && f?.trigger) {
			const e = Te("index", f.trigger);
			for (let t = 0; t < 3; t++) o[t] = o[t] + (e[t] - o[t]) * h;
		}
		for (let i = 0; i < n.joints.length; i++) {
			const c = n.joints[i];
			let l;
			if (r) {
				const e = i === 0 ? t.thumb.parentTurn : r[i - 1];
				l = _.normalize(_.mul(_.conjugate(e), r[i]));
			} else {
				let e = j(c.curlAxis, o[i]);
				if (c.spreadAxis && s !== 0) e = _.mul(j(c.spreadAxis, s), e);
				l = _.normalize(_.mul(c.rest, e));
			}
			const u = e.get(c.entity, a);
			const d = Ue(u.rotation, c.written) ? c.rest : u.rotation;
			const f = {
				w: d.w,
				x: d.x,
				y: d.y,
				z: d.z
			};
			if (t.weight >= 1) {
				f.w = l.w;
				f.x = l.x;
				f.y = l.y;
				f.z = l.z;
			} else p(f, l, t.weight);
			const m = _.normalize(f);
			e.update(c.entity, a, (e) => {
				e.rotation = {
					w: m.w,
					x: m.x,
					y: m.y,
					z: m.z
				};
			});
			c.written = { ...e.get(c.entity, a).rotation };
		}
	}
	t.settled = g;
}
/**
* Where the thumb goes this frame, as each joint's turn from the hand: from where it rests toward the middle of the middle finger (or the index tip) as
* they now stand, on the palm's side of them by a finger's thickness and the pose's gap. Null with no reach asked, which leaves it as it rests.
*/
function Xe(e, t) {
	const n = t.thumb;
	const r = t.current[ye];
	if (r <= 0) return null;
	const i = (t) => {
		if (t.length < 3) return null;
		const n = L(e, t).at;
		return O(E(n[1], n[2]), .5);
	};
	const a = (t) => t.length ? L(e, t).at[t.length - 1] : null;
	const o = i(t.middle) ?? i(t.index);
	const s = a(t.index) ?? o;
	if (!o || !s) return null;
	const c = t.current[be];
	const l = E(O(o, 1 - c), O(s, c));
	const u = t.reachUnit * .16;
	const d = E(l, O(t.palm, u + t.current[xe] * t.reachUnit));
	const f = A(E(O(t.across, -.8), O(t.palm, .6)));
	const p = (e) => E(O(n.restTip, 1 - e), O(d, e));
	t.thumbTouching = false;
	if (!t.surfaces) return Fe(n, p(r), f);
	const m = t.world, h = t.surfaces;
	const g = t.reachUnit * Ke * m.s;
	const v = (e) => {
		const t = [];
		Fe(n, p(e), f, t);
		return t.map((e) => E(m.p, _.rotate(m.r, O(e, m.s))));
	};
	const y = v(0);
	const b = [
		0,
		1,
		2
	].map((e) => Math.min(g, oe(h, y[e], y[e + 1]) - 1e-6));
	const { bends: x, touched: ee } = se([0], [r], (e, t) => {
		if (t > 0) return -1;
		const n = v(e[0]);
		return [
			0,
			1,
			2
		].some((e) => oe(h, n[e], n[e + 1]) <= b[e]) ? 0 : -1;
	});
	t.thumbTouching = ee;
	return Fe(n, p(x[0]), f);
}
function B(e, t) {
	if (!t) return;
	for (const n of t.fingers) for (const t of n.joints) if (e.valid(t.entity) && e.has(t.entity, a)) e.update(t.entity, a, (e) => {
		e.rotation = {
			w: t.rest.w,
			x: t.rest.x,
			y: t.rest.y,
			z: t.rest.z
		};
	});
}
const V = /* @__PURE__ */ new WeakMap();
/** Asks for a rig's hands this frame. Read by the next run of the grip-pose system, then forgotten. @internal */
function Ze(e, t, n) {
	let r = V.get(e);
	if (!r) {
		r = /* @__PURE__ */ new Map();
		V.set(e, r);
	}
	r.set(t, n);
}
/** Every hand this has posed put back as the rig rests, and forgotten: an editor leaving its preview. @internal */
function Qe(e) {
	const t = H.get(e);
	if (t) {
		for (const n of t.values()) {
			B(e.world, n.right);
			B(e.world, n.left);
		}
		t.clear();
	}
	V.get(e)?.clear();
}
/** The joints each hand of a rig bends, once the grip-pose system has seen it: what an editor puts a handle on. @experimental */
function $e(e, t) {
	const n = H.get(e)?.get(t);
	if (!n) return null;
	const r = (e) => e ? e.fingers.filter((e) => e.name !== "thumb").flatMap((e) => e.joints.map((t, n) => ({
		finger: e.name,
		joint: n,
		entity: t.entity,
		axis: { ...t.curlAxis },
		bone: { ...e.joints[n + 1]?.at ?? e.tip }
	}))) : [];
	return {
		right: r(n.right),
		left: r(n.left)
	};
}
const H = /* @__PURE__ */ new WeakMap();
/** What each hand of a rig with a `GripPose` was found to have, once the system has seen it. @experimental */
function et(e, t) {
	const n = H.get(e)?.get(t);
	if (!n) return null;
	const r = (e) => ({
		hand: e?.hand ?? null,
		joints: e ? e.fingers.reduce((e, t) => e + t.joints.length, 0) : 0,
		missing: e ? [...e.missing] : [...T],
		pose: e?.pose ?? "",
		weight: e?.weight ?? 0,
		touching: e ? [...e.thumbTouching && e.surfaces ? ["thumb"] : [], ...e.touching] : []
	});
	return {
		right: r(n.right),
		left: r(n.left)
	};
}
/** Holds every rig's hands. Runs after the animator, since what a clip says of the fingers is what a pose goes over. */
function tt(e) {
	const t = /* @__PURE__ */ new Map();
	H.set(e, t);
	const r = (e, t) => ["Animator", "TimelinePlayer"].some((n) => {
		const r = o(n);
		return !!r && e.has(t, r);
	});
	e.addSystemToSchedule(3, n([u(l), s()], (n, i) => {
		const a = V.get(e) ?? /* @__PURE__ */ new Map();
		V.set(e, a);
		const o = new Set(i.getEntitiesWithComponents([de]));
		for (const [e, n] of t) {
			if (!i.valid(e)) {
				t.delete(e);
				continue;
			}
			if (o.has(e) || a.has(e)) continue;
			if (n.byComponent) {
				B(i, n.right);
				B(i, n.left);
				t.delete(e);
			}
		}
		const s = /* @__PURE__ */ new Set([
			...o,
			...a.keys(),
			...t.keys()
		]);
		const c = /* @__PURE__ */ new Map();
		let l = false;
		const u = (e) => {
			if (e === void 0 || !i.valid(e)) return null;
			if (!l) {
				i.ensureTransformsComposed();
				l = true;
			}
			let t = c.get(e);
			if (!t) {
				t = ne(i, e);
				c.set(e, t);
			}
			return t;
		};
		for (const e of s) {
			if (!i.valid(e)) continue;
			const s = o.has(e) ? i.get(e, de) : null;
			const c = a.get(e);
			const l = s?.rightHand || c?.rightHand || "", f = s?.leftHand || c?.leftHand || "";
			const p = (e) => {
				const t = c?.[e];
				if (t) return {
					key: t.key,
					def: t.pose,
					weight: t.weight,
					trigger: s ? e === "right" ? s.rightTrigger : s.leftTrigger : 0,
					wrap: t.wrap
				};
				if (s) {
					const t = e === "right" ? s.rightPose : s.leftPose;
					return {
						key: t,
						def: w.get(t) ?? null,
						weight: e === "right" ? s.rightWeight : s.leftWeight,
						trigger: e === "right" ? s.rightTrigger : s.leftTrigger
					};
				}
				return {
					key: "",
					def: null,
					weight: 0,
					trigger: 0
				};
			};
			const h = {
				right: p("right"),
				left: p("left")
			};
			if (!h.right.key && !h.left.key && !t.has(e)) continue;
			let g = t.get(e);
			if (!g || g.rightHand !== l || g.leftHand !== f) {
				if (g) {
					B(i, g.right);
					B(i, g.left);
				}
				g = {
					right: null,
					left: null,
					rightHand: l,
					leftHand: f,
					tried: {
						right: false,
						left: false
					},
					byComponent: !!s,
					blend: .15
				};
				t.set(e, g);
			}
			g.byComponent = !!s;
			const _ = c ? c.blendSeconds : s ? s.blendSeconds : g.blend;
			g.blend = _;
			const v = r(i, e);
			for (const t of ["right", "left"]) {
				const r = h[t].key;
				if (!g[t] && r && !g.tried[t]) {
					g.tried[t] = true;
					const n = t === "right" ? l : f;
					const r = n ? m(i, e, n) : He(i, e, t);
					g[t] = r === null ? null : Ae(i, r, t);
					if (!g[t]) d.warn("animation", `a GripPose found no ${t} hand with fingers on "${M(i, e)}"${n ? ` at "${n}"` : ""}: name its joint in ${t}Hand`);
					else if (g[t].missing.length) d.warn("animation", `the ${t} hand of "${M(i, e)}" has no bones for its ${g[t].missing.join(", ")}: a pose does without them`);
				}
				const a = g[t];
				if (a) Ye(i, a, r, h[t].def, h[t].weight, h[t].trigger, _, n.delta, v, u(h[t].wrap));
			}
			if (!s && !c && (!g.right || g.right.weight === 0) && (!g.left || g.left.weight === 0)) t.delete(e);
		}
		a.clear();
	}, { name: "GripPoseSystem" }), {
		runAfter: [y.Animator],
		runIf: f
	});
}
//#endregion
//#region src/animation/gripHold.ts
/** The plane an object's anchors are mirrored in, by the axis square to it. @experimental */
const nt = {
	X: 0,
	Y: 1,
	Z: 2
};
/**
* How an object is held. Goes on the object; its anchors are entities under it.
*
* @experimental
*/
const U = /* @__PURE__ */ e("GripProfile", {
	mainAnchor: 0,
	supportAnchor: 0,
	mainPose: "handle",
	supportPose: "support",
	mainFingers: "",
	supportFingers: "",
	hand: 0,
	mirror: 0,
	wrap: true
}, {
	entityFields: ["mainAnchor", "supportAnchor"],
	fields: {
		mainFingers: {
			advanced: true,
			tooltip: "The leading hand's fingers joint by joint, as JSON. Written by the grip editor; over mainPose where set."
		},
		supportFingers: {
			advanced: true,
			tooltip: "The supporting hand's fingers joint by joint, as JSON."
		},
		hand: {
			enum: [{
				label: "Right",
				value: 0
			}, {
				label: "Left",
				value: 1
			}],
			tooltip: "The hand the anchors were placed for. Held with the other leading, they are mirrored."
		},
		mirror: {
			enum: [
				{
					label: "YZ (X)",
					value: 0
				},
				{
					label: "XZ (Y)",
					value: 1
				},
				{
					label: "XY (Z)",
					value: 2
				}
			],
			tooltip: "The object's own plane that mirrors the anchors to the other hand."
		},
		mainAnchor: { tooltip: "Where the leading palm sits: an entity under this one. Its +Z is the way the fingers point, +Y the way the palm faces." },
		supportAnchor: { tooltip: "Where the supporting palm sits. Empty holds this in one hand." },
		mainPose: { tooltip: "The leading hand's fingers: a captured finger pose, or a grip pose (pistol, handle, support, ...)." },
		supportPose: { tooltip: "The supporting hand's fingers." },
		wrap: { tooltip: "Close the fingers onto the GripSurface shapes on this object and under it, each stopping where it meets one. The pose says how far they may close." }
	}
});
/** Which hand leads. @experimental */
const W = {
	Right: 0,
	Left: 1
};
/** What places the held object: the leading hand as the clip moves it, or the game (aiming), with the leading arm brought to it. @experimental */
const G = {
	Hand: 0,
	Object: 1
};
/**
* Holds an object in its GripProfile's grip. Goes on the rig's root.
*
* @experimental
*/
const K = /* @__PURE__ */ e("GripHolder", {
	held: 0,
	mainHand: W.Right,
	placement: G.Hand,
	weight: 1,
	supportWeight: 1,
	blendSeconds: .2,
	rightHand: "",
	leftHand: ""
}, {
	entityFields: ["held"],
	fields: {
		held: { tooltip: "What is held: an entity with a GripProfile." },
		mainHand: {
			enum: [{
				label: "Right",
				value: W.Right
			}, {
				label: "Left",
				value: W.Left
			}],
			tooltip: "The hand that leads."
		},
		placement: {
			enum: [{
				label: "Hand",
				value: G.Hand
			}, {
				label: "Object",
				value: G.Object
			}],
			tooltip: "Hand: the object rides the leading hand as the clip moves it. Object: the game places it (aiming) and the leading arm is brought to it."
		},
		weight: {
			min: 0,
			max: 1,
			step: .01,
			tooltip: "How much of the hold applies over the clip."
		},
		supportWeight: {
			min: 0,
			max: 1,
			step: .01,
			tooltip: "How much of the supporting hand's hold applies, under the weight."
		},
		blendSeconds: {
			min: 0,
			step: .01,
			unit: "s",
			tooltip: "About how long taking hold, letting go, or changing what is held takes."
		},
		rightHand: {
			advanced: true,
			tooltip: "The right hand joint, by path from this entity. Empty finds it by name."
		},
		leftHand: {
			advanced: true,
			tooltip: "The left hand joint, by path from this entity. Empty finds it by name."
		}
	}
});
const rt = /* @__PURE__ */ new Map();
/** Keeps a finger pose by name, for a GripProfile to name. Replaces one of that name. @experimental */
function it(e, t) {
	rt.set(e, { joints: Object.fromEntries(Object.entries(t.joints).map(([e, t]) => [e, _.normalize({ ...t })])) });
}
/** The finger pose of that name, or undefined. @experimental */
function at(e) {
	return rt.get(e);
}
/** The turn of every named joint below `hand`, as it stands now: what a pose made by hand, or by a GripPose, is kept as. Plain JSON. @experimental */
function ot(e, t) {
	const n = {};
	const r = (t) => {
		for (const o of e.tryGet(t, i)?.entities ?? []) {
			const t = e.tryGet(o, c)?.value;
			if (t && e.has(o, a)) {
				const r = e.get(o, a).rotation;
				n[t] = {
					w: r.w,
					x: r.x,
					y: r.y,
					z: r.z
				};
			}
			r(o);
		}
	};
	r(t);
	return { joints: n };
}
const q = (e, t) => ({
	x: e.x + t.x,
	y: e.y + t.y,
	z: e.z + t.z
});
const J = (e, t) => ({
	x: e.x - t.x,
	y: e.y - t.y,
	z: e.z - t.z
});
const Y = (e, t) => ({
	x: e.x * t,
	y: e.y * t,
	z: e.z * t
});
const X = (e) => Math.hypot(e.x, e.y, e.z);
const st = (e, t) => e.x * t.x + e.y * t.y + e.z * t.z;
const ct = (e) => {
	const t = X(e);
	return t < 1e-12 ? {
		x: 0,
		y: 0,
		z: 0
	} : Y(e, 1 / t);
};
const Z = (e, t) => ({
	p: q(e.p, _.rotate(e.r, Y(t.p, e.s))),
	r: _.normalize(_.mul(e.r, t.r)),
	s: e.s * t.s
});
const lt = (e) => {
	const t = _.conjugate(e.r), n = 1 / e.s;
	return {
		p: Y(_.rotate(t, e.p), -n),
		r: t,
		s: n
	};
};
/** Spherical interpolation, the shorter way: what a weight between a clip and a grip means. */
function ut(e, t, n) {
	let r = e.w * t.w + e.x * t.x + e.y * t.y + e.z * t.z;
	const i = r < 0 ? -1 : 1;
	r = Math.abs(r);
	if (r > .9995) {
		const r = 1 - n;
		return _.normalize({
			w: e.w * r + t.w * n * i,
			x: e.x * r + t.x * n * i,
			y: e.y * r + t.y * n * i,
			z: e.z * r + t.z * n * i
		});
	}
	const a = Math.acos(r), o = Math.sin(a);
	const s = Math.sin((1 - n) * a) / o, c = Math.sin(n * a) / o * i;
	return {
		w: e.w * s + t.w * c,
		x: e.x * s + t.x * c,
		y: e.y * s + t.y * c,
		z: e.z * s + t.z * c
	};
}
/** An entity's place in the world as it stands, from the composed transform. */
function Q(e, t) {
	const n = e.get(t, a);
	return {
		p: { ...n.worldPosition },
		r: _.normalize(n.worldRotation),
		s: n.worldScale.x
	};
}
function dt(e, t) {
	const n = e.get(t, a);
	return {
		p: { ...n.position },
		r: _.normalize(n.rotation),
		s: n.scale.x
	};
}
function $(e, n) {
	const r = e.tryGet(n, t);
	return r && typeof r.entity === "number" && e.valid(r.entity) ? r.entity : null;
}
/** An anchor's place on its object: its locals composed up to the object, so it follows the object wherever this frame puts it. */
function ft(e, t, n) {
	let r = n;
	let i = {
		p: {
			x: 0,
			y: 0,
			z: 0
		},
		r: {
			w: 1,
			x: 0,
			y: 0,
			z: 0
		},
		s: 1
	};
	for (let n = 0; r !== null && n < 32; n++) {
		if (r === t) return i;
		i = Z(dt(e, r), i);
		r = $(e, r);
	}
	return null;
}
/** An anchor's pose on its object, mirrored in the plane square to one of the object's axes: what the other hand's palm takes there. */
function pt(e, t) {
	const n = { ...e.p }, r = { ...e.r };
	if (t === 1) {
		n.y = -n.y;
		r.x = -r.x;
		r.z = -r.z;
	} else if (t === 2) {
		n.z = -n.z;
		r.x = -r.x;
		r.y = -r.y;
	} else {
		n.x = -n.x;
		r.y = -r.y;
		r.z = -r.z;
	}
	return {
		p: n,
		r,
		s: e.s
	};
}
function mt(e, t, n, r) {
	const a = r ? m(e, t, r) : He(e, t, n);
	if (a === null) return null;
	const o = $(e, a), s = o === null ? null : $(e, o);
	const l = Be(e, a, n);
	if (o === null || s === null || !l) return null;
	const u = /* @__PURE__ */ new Map();
	const d = (t) => {
		for (const n of e.tryGet(t, i)?.entities ?? []) {
			const t = e.tryGet(n, c)?.value;
			if (t) u.set(t, n);
			d(n);
		}
	};
	d(a);
	return {
		hand: a,
		forearm: o,
		upper: s,
		palm: {
			p: l.center,
			r: l.turn,
			s: 1
		},
		fingers: u
	};
}
/** Eases `value` toward `wanted`, critically damped: from still, and to rest without passing it. */
function ht(e, t, n, r, i) {
	if (r <= 0) return [n, 0];
	const a = 6 / r;
	const o = e - n;
	const s = (t + a * o) * i;
	const c = Math.exp(-a * i);
	const l = (t - a * s) * c;
	const u = n + (o + s) * c;
	return Math.abs(u - n) < 1e-4 && Math.abs(l) < .001 ? [n, 0] : [u, l];
}
/**
* The upper arm and forearm turned so the hand joint lands on `goal`, the elbow keeping the side it is bent toward; then the hand turned to `handTurn`.
* World turns in, each joint's own turn out. The arm cannot be longer than it is: past its reach it points straight at the goal.
*/
function gt(e, t, n, r) {
	const i = Q(e, t.upper), a = Q(e, t.forearm), o = Q(e, t.hand);
	const s = $(e, t.upper);
	const c = s === null ? {
		w: 1,
		x: 0,
		y: 0,
		z: 0
	} : Q(e, s).r;
	const l = X(J(a.p, i.p)), u = X(J(o.p, a.p));
	const d = J(n, i.p);
	const f = /* @__PURE__ */ new Map();
	if (l < 1e-9 || u < 1e-9 || X(d) < 1e-9) return f;
	f.short = Math.max(0, X(d) - (l + u));
	const p = Math.min(Math.max(X(d), Math.abs(l - u) + 1e-6), l + u - 1e-6);
	const m = ct(d);
	let h = J(J(a.p, i.p), Y(m, st(J(a.p, i.p), m)));
	if (X(h) < 1e-9) h = {
		x: -m.y,
		y: m.x,
		z: 0
	};
	if (X(h) < 1e-9) h = {
		x: 0,
		y: -m.z,
		z: m.y
	};
	h = ct(h);
	const g = Math.min(1, Math.max(-1, (l * l + p * p - u * u) / (2 * l * p)));
	const v = q(i.p, q(Y(m, l * g), Y(h, l * Math.sqrt(Math.max(0, 1 - g * g)))));
	const y = q(i.p, Y(m, p));
	const b = _.normalize(_.mul(_.rotationTo(J(a.p, i.p), J(v, i.p)), i.r));
	const x = _.normalize(_.mul(b, _.conjugate(i.r)));
	const ee = _.normalize(_.mul(_.rotationTo(_.rotate(x, J(o.p, a.p)), J(y, v)), _.mul(x, a.r)));
	f.set(t.upper, _.normalize(_.mul(_.conjugate(c), b)));
	f.set(t.forearm, _.normalize(_.mul(_.conjugate(b), ee)));
	f.set(t.hand, _.normalize(_.mul(_.conjugate(ee), r)));
	return f;
}
/** Where the hand joint and its turn must be for its palm to sit on `anchor`, a pose in the world. */
function _t(e, t, n) {
	const r = _.normalize(_.mul(t.r, _.conjugate(e.palm.r)));
	return {
		at: J(t.p, _.rotate(r, Y(e.palm.p, n))),
		turn: r
	};
}
/** The fingers' own turns for a pose: a captured one by joint name. Null where it names no captured pose. */
function vt(e, t) {
	const n = rt.get(t);
	if (!n) return null;
	const r = /* @__PURE__ */ new Map();
	for (const [t, i] of Object.entries(n.joints)) {
		const n = e.fingers.get(t);
		if (n !== void 0) r.set(n, i);
	}
	return r;
}
const yt = /* @__PURE__ */ new WeakMap();
/** Runs every holder. Called by the animation plugin, before the grip poses it hands fingers to. */
function bt(e) {
	const t = /* @__PURE__ */ new Map();
	yt.set(e, t);
	e.addSystemToSchedule(3, n([u(l), s()], (n, r) => {
		for (const [e] of t) if (!r.valid(e) || !r.has(e, K)) t.delete(e);
		const i = [...r.getEntitiesWithComponents([K])];
		if (i.length === 0) return;
		r.ensureTransformsComposed();
		let o = false;
		for (const e of t.values()) for (const [t, n] of e.written) {
			if (!r.valid(t) || !r.has(t, a)) continue;
			const i = r.get(t, a).rotation;
			const s = e.base.get(t);
			if (s && Dt(i, n)) {
				r.update(t, a, (e) => {
					e.rotation = { ...s };
				});
				o = true;
			}
		}
		if (o) r.ensureTransformsComposed();
		for (const a of i) Tt(e, r, t, a, r.get(a, K), n.delta);
	}, { name: "GripHoldSystem" }), {
		runAfter: [y.Animator],
		runIf: f
	});
}
/**
* Every joint a hold turned, and every object it carried, given back as they were before it, and every holder forgotten: an editor leaving its
* preview, where nothing moves the bones back. What something else has moved since is left as it is. @experimental
*/
function xt(e) {
	const t = e.world;
	const n = yt.get(e);
	for (const e of n?.values() ?? []) {
		for (const [n, r] of e.written) {
			const i = e.base.get(n);
			if (!i || !t.valid(n) || !t.has(n, a)) continue;
			if (Dt(t.get(n, a).rotation, r)) t.update(n, a, (e) => {
				e.rotation = { ...i };
			});
		}
		for (const [n, { rest: r, put: i }] of e.carried) {
			if (!t.valid(n) || !t.has(n, a)) continue;
			const e = t.get(n, a);
			if (St(e.position, i.p) && Dt(e.rotation, i.r)) t.update(n, a, (e) => {
				e.position = { ...r.p };
				e.rotation = { ...r.r };
			});
		}
	}
	n?.clear();
	Qe(e);
}
const St = (e, t) => Math.abs(e.x - t.x) < 1e-6 && Math.abs(e.y - t.y) < 1e-6 && Math.abs(e.z - t.z) < 1e-6;
/** Inline finger poses read once per text. */
const Ct = /* @__PURE__ */ new Map();
function wt(e) {
	if (!e) return null;
	let t = Ct.get(e);
	if (t === void 0) {
		if (Ct.size > 64) Ct.clear();
		t = Oe(e);
		if (!t) d.warn("animation", "a GripProfile's fingers are not a grip pose in JSON: the pose by name is used");
		Ct.set(e, t);
	}
	return t;
}
function Tt(e, t, n, r, i, o) {
	const s = `${i.rightHand}|${i.leftHand}`;
	let l = n.get(r);
	if (!l || l.paths !== s) {
		const e = mt(t, r, "right", i.rightHand), a = mt(t, r, "left", i.leftHand);
		if (!e && !a) d.warn("animation", `a GripHolder found no arm with a hand on "${t.tryGet(r, c)?.value ?? r}"`);
		l = {
			arms: {
				right: e,
				left: a
			},
			paths: s,
			held: 0,
			amount: 0,
			speed: 0,
			from: /* @__PURE__ */ new Map(),
			change: 1,
			changeSpeed: 0,
			written: /* @__PURE__ */ new Map(),
			base: /* @__PURE__ */ new Map(),
			carried: /* @__PURE__ */ new Map(),
			asked: {},
			short: {
				main: 0,
				support: 0
			},
			mirrored: false
		};
		n.set(r, l);
	}
	const u = i.held && t.valid(i.held) && t.has(i.held, U) ? i.held : 0;
	if (u !== l.held) {
		l.from = new Map(l.written);
		l.change = l.from.size ? 0 : 1;
		l.changeSpeed = 0;
		l.held = u;
	}
	[l.amount, l.speed] = ht(l.amount, l.speed, u ? Math.min(1, Math.max(0, i.weight)) : 0, i.blendSeconds, o);
	[l.change, l.changeSpeed] = ht(l.change, l.changeSpeed, 1, i.blendSeconds, o);
	const f = i.mainHand === W.Left ? l.arms.left : l.arms.right;
	const p = i.mainHand === W.Left ? l.arms.right : l.arms.left;
	const m = /* @__PURE__ */ new Map();
	const h = [];
	l.short = {
		main: 0,
		support: 0
	};
	if (u && f) {
		const e = t.get(u, U);
		l.mirrored = i.mainHand !== e.hand;
		const n = (t) => t && l.mirrored ? pt(t, e.mirror) : t;
		const r = n(e.mainAnchor ? ft(t, u, e.mainAnchor) : null);
		const o = n(e.supportAnchor ? ft(t, u, e.supportAnchor) : null);
		if (r) {
			const n = Q(t, f.hand);
			let s;
			if (i.placement === G.Object) {
				s = Q(t, u);
				const e = _t(f, Z(s, r), n.s);
				const i = gt(t, f, e.at, e.turn);
				for (const [e, t] of i) m.set(e, t);
				l.short.main = i.short ?? 0;
			} else {
				s = Z(Z(n, f.palm), lt(r));
				const e = $(t, u);
				const i = e === null ? s : Z(lt(Q(t, e)), s);
				const o = t.get(u, a);
				const c = l.carried.get(u);
				if (!c || !(St(o.position, c.put.p) && Dt(o.rotation, c.put.r))) l.carried.set(u, {
					rest: {
						p: { ...o.position },
						r: { ...o.rotation }
					},
					put: {
						p: { ...o.position },
						r: { ...o.rotation }
					}
				});
				t.update(u, a, (e) => {
					e.position = { ...i.p };
					e.rotation = { ...i.r };
				});
				const d = t.get(u, a);
				l.carried.get(u).put = {
					p: { ...d.position },
					r: { ...d.rotation }
				};
			}
			h.push({
				arm: f,
				pose: e.mainPose,
				inline: e.mainFingers,
				weight: 1
			});
			const c = Math.min(1, Math.max(0, i.supportWeight));
			if (p && o && c > 0) {
				const n = _t(p, Z(s, o), Q(t, p.hand).s);
				const r = gt(t, p, n.at, n.turn);
				for (const [e, t] of r) {
					m.set(e, t);
					Et.set(e, c);
				}
				l.short.support = r.short ?? 0;
				h.push({
					arm: p,
					pose: e.supportPose,
					inline: e.supportFingers,
					weight: c
				});
			}
		}
	}
	const g = {};
	const v = u && t.get(u, U).wrap !== false ? { wrap: u } : {};
	for (const { arm: e, pose: t, inline: n, weight: r } of h) {
		const i = e === l.arms.right ? "right" : "left";
		const a = wt(n);
		const o = a ? null : vt(e, t);
		if (o) for (const [e, t] of o) {
			m.set(e, t);
			Et.set(e, r);
		}
		else if (a) g[i] = {
			key: n,
			pose: a,
			weight: 0,
			share: r,
			...v
		};
		else if (ue(t)) g[i] = {
			key: t,
			pose: ue(t),
			weight: 0,
			share: r,
			...v
		};
	}
	if (u && f) l.asked = g;
	if (l.amount > 0 || u) {
		const t = {
			blendSeconds: i.blendSeconds,
			rightHand: i.rightHand,
			leftHand: i.leftHand
		};
		for (const e of ["right", "left"]) {
			const n = l.asked[e];
			if (n) t[e] = {
				key: n.key,
				pose: n.pose,
				weight: l.amount * n.share,
				...n.wrap !== void 0 ? { wrap: n.wrap } : {}
			};
		}
		if (t.right || t.left) Ze(e, r, t);
	} else l.asked = {};
	const y = /* @__PURE__ */ new Set([...m.keys(), ...l.written.keys()]);
	for (const e of y) {
		if (!t.valid(e) || !t.has(e, a)) continue;
		const n = t.get(e, a).rotation;
		l.base.set(e, {
			w: n.w,
			x: n.x,
			y: n.y,
			z: n.z
		});
		const r = m.get(e);
		const i = l.amount * (Et.get(e) ?? 1);
		let o = r ? ut(n, r, i) : n;
		const s = l.from.get(e);
		if (s && l.change < 1) o = ut(s, o, l.change);
		const c = _.normalize(o);
		t.update(e, a, (e) => {
			e.rotation = { ...c };
		});
		const u = t.get(e, a).rotation;
		if (r || l.change < 1) l.written.set(e, {
			w: u.w,
			x: u.x,
			y: u.y,
			z: u.z
		});
		else l.written.delete(e);
	}
	Et.clear();
	if (l.change >= 1) l.from.clear();
}
/** Per joint, the share of the hold it takes: the supporting hand's weight on its arm and fingers. Reused across holders in one frame. */
const Et = /* @__PURE__ */ new Map();
const Dt = (e, t) => Math.abs(e.w - t.w) < 1e-6 && Math.abs(e.x - t.x) < 1e-6 && Math.abs(e.y - t.y) < 1e-6 && Math.abs(e.z - t.z) < 1e-6;
/** What a holder found and is doing. @experimental */
function Ot(e, t) {
	const n = yt.get(e)?.get(t);
	const r = n?.arms.right ?? n?.arms.left;
	return n ? {
		right: !!n.arms.right,
		left: !!n.arms.left,
		amount: n.amount,
		held: n.held,
		short: { ...n.short },
		mirrored: n.mirrored,
		palm: r ? 2 * X(r.palm.p) : 0
	} : null;
}
//#endregion
//#region src/animation/animatorMigrate.ts
/**
* @file    animatorMigrate.ts
* @brief   Bringing a parsed `.esanimator` to the version this build writes.
*
* @details A version is a property of the FILE, not of a controller: one built in
*          code never passes through here, having no older spelling to be read
*          from. What the guard buys is the other direction — a file from a later
*          build is refused rather than read for the parts this one recognises,
*          because layers it cannot see would animate a visibly wrong character
*          and nothing would say so.
*/
/** The version a file with no `version` field was written at. */
const kt = 1;
function At(e) {
	if (typeof e !== "object" || e === null) return false;
	const t = e;
	return Array.isArray(t["states"]) && typeof t["initialState"] === "string";
}
/**
* Total and idempotent: already-current data comes back with `migrated: false`.
* Throws for a shape that cannot be reconciled, and for a version this build does
* not know.
*/
function jt(e) {
	if (typeof e !== "object" || e === null) throw new Error("Animator controller data must be an object");
	const t = e;
	if (!At(t)) throw new Error("Animator controller must have a \"states\" array and an \"initialState\"");
	const n = t["version"];
	if (n !== void 0 && (typeof n !== "number" || !Number.isInteger(n))) throw new Error("Animator controller \"version\" must be an integer");
	const r = n ?? kt;
	if (r > 2) throw new Error(`Animator controller is version ${r}; this build reads up to ${2}. Update the engine rather than opening it here.`);
	if (t["layers"] !== void 0) {
		if (!Array.isArray(t["layers"])) throw new Error("Animator controller \"layers\" must be an array");
		for (const e of t["layers"]) if (!At(e) || typeof e.name !== "string") throw new Error("Every animator layer needs a name, states and an initialState");
	}
	const i = t;
	if (r === 2) return {
		def: i,
		migrated: false,
		fromVersion: r
	};
	return {
		def: {
			...Nt(i),
			version: 2,
			layers: i.layers?.map(Pt)
		},
		migrated: true,
		fromVersion: r
	};
}
/** A state whose motion is spelled the one way, with the older spellings gone —
*  left in place they would be a second answer nothing reconciles. */
function Mt(e) {
	const t = { ...e };
	const n = e.motion ?? h(e);
	delete t.clip;
	delete t.blend;
	delete t.spine;
	if (n) t.motion = n;
	else delete t.motion;
	if (e.stateMachine) t.stateMachine = {
		...e.stateMachine,
		states: e.stateMachine.states.map(Mt)
	};
	return t;
}
function Nt(e) {
	return {
		...e,
		states: e.states.map(Mt)
	};
}
function Pt(e) {
	return Nt(e);
}
//#endregion
export { x as C, y as D, v as E, ce as S, re as T, De as _, G as a, et as b, at as c, it as d, xt as f, ue as g, $e as h, nt as i, Ot as l, de as m, W as n, U as o, ut as p, K as r, ot as s, jt as t, bt as u, Oe as v, b as w, tt as x, le as y };

//# sourceMappingURL=animatorMigrate.js.map