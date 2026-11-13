import { $t as e, Et as t, c as n, n as r, pt as i, qt as a, rn as o, wt as s } from "./system.js";
import { i as c, s as l, t as u } from "./resource.js";
import { s as d } from "./logger.js";
import { s as f } from "./env.js";
import { r as p } from "./Animator.js";
import { t as m } from "./quat.js";
import { i as h, l as g } from "./customDraw.js";
import { n as _ } from "./planetQuery.js";
import { a as v, c as y, i as b, n as x, o as S, r as C, s as w, t as T } from "./Physics3DComponents.js";
import { n as E } from "./meshCollision.js";
import { n as ee } from "./collisionGeometry.js";
//#region src/physics3d/planetGravity.ts
/** The force on a body of `mass` that the planet's pull is, over the world's gravity: all in metres, kilograms and seconds. */
function te(e, t, n, r, i) {
	return [
		e * (n[0] * r - i[0] * t),
		e * (n[1] * r - i[1] * t),
		e * (n[2] * r - i[2] * t)
	];
}
/** Installs the system that pulls bodies toward the planets: every fixed step, before the world steps. */
function ne(e) {
	e.addSystemToSchedule(11, n([], () => {
		if (!e.hasResource(_) || !e.hasResource(y)) return;
		const t = e.getResource(_);
		if (t.planets.size === 0) return;
		const n = e.getResource(y);
		const r = n.module, i = n.config;
		if (!r?._physics3d_addForce || !r._physics3d_getBodyDynamics || !i) return;
		const o = i.pixelsPerUnit;
		const s = [
			i.gravity.x,
			i.gravity.y,
			i.gravity.z
		];
		for (const i of e.world.getEntitiesWithComponents([S, a])) {
			const a = e.world.get(i, S);
			if (!a.enabled || a.bodyType !== 2) continue;
			const c = n.bodies.get(i);
			if (!c || !r._physics3d_getBodyState(c)) continue;
			const l = r.HEAPF32;
			const u = r._physics3d_queryResult() >> 2;
			const d = l[u] * o, f = l[u + 1] * o, p = l[u + 2] * o;
			const m = t.nearest(d, f, p);
			if (m === null) continue;
			const h = t.planets.get(m);
			const g = t.up(m, d, f, p);
			if (h.gravity <= 0 || !g) continue;
			if (!r._physics3d_getBodyDynamics(c)) continue;
			const _ = r.HEAPF32[r._physics3d_queryResult() >> 2];
			const v = te(_, a.gravityScale, [
				-g[0],
				-g[1],
				-g[2]
			], h.gravity, s);
			r._physics3d_addForce(c, v[0], v[1], v[2], l[u], l[u + 1], l[u + 2]);
		}
	}, { name: "PlanetGravitySystem" }));
}
//#endregion
//#region src/math/vec3.ts
const D = {
	create(e = 0, t = 0, n = 0) {
		return {
			x: e,
			y: t,
			z: n
		};
	},
	clone(e) {
		return {
			x: e.x,
			y: e.y,
			z: e.z
		};
	},
	add(e, t) {
		return {
			x: e.x + t.x,
			y: e.y + t.y,
			z: e.z + t.z
		};
	},
	sub(e, t) {
		return {
			x: e.x - t.x,
			y: e.y - t.y,
			z: e.z - t.z
		};
	},
	scale(e, t) {
		return {
			x: e.x * t,
			y: e.y * t,
			z: e.z * t
		};
	},
	mul(e, t) {
		return {
			x: e.x * t.x,
			y: e.y * t.y,
			z: e.z * t.z
		};
	},
	neg(e) {
		return {
			x: -e.x,
			y: -e.y,
			z: -e.z
		};
	},
	dot(e, t) {
		return e.x * t.x + e.y * t.y + e.z * t.z;
	},
	cross(e, t) {
		return {
			x: e.y * t.z - e.z * t.y,
			y: e.z * t.x - e.x * t.z,
			z: e.x * t.y - e.y * t.x
		};
	},
	len(e) {
		return Math.hypot(e.x, e.y, e.z);
	},
	len2(e) {
		return e.x * e.x + e.y * e.y + e.z * e.z;
	},
	dist(e, t) {
		return Math.hypot(e.x - t.x, e.y - t.y, e.z - t.z);
	},
	normalize(e) {
		const t = Math.hypot(e.x, e.y, e.z);
		return t > 0 ? {
			x: e.x / t,
			y: e.y / t,
			z: e.z / t
		} : {
			x: 0,
			y: 0,
			z: 0
		};
	},
	lerp(e, t, n) {
		return {
			x: e.x + (t.x - e.x) * n,
			y: e.y + (t.y - e.y) * n,
			z: e.z + (t.z - e.z) * n
		};
	},
	equals(e, t, n = 1e-6) {
		return Math.abs(e.x - t.x) <= n && Math.abs(e.y - t.y) <= n && Math.abs(e.z - t.z) <= n;
	}
};
//#endregion
//#region src/physics3d/AdvancedJoint3D.ts
/** @file Swing/twist and per-axis constraints, authored in a body's local frame. */
/** Axis motion for SixDOF joints. @experimental */
const O = {
	Locked: 0,
	Limited: 1,
	Free: 2
};
const re = {
	connectedEntity: -1,
	anchor: {
		x: 0,
		y: 0,
		z: 0
	},
	axis: {
		x: 1,
		y: 0,
		z: 0
	},
	normalAxis: {
		x: 0,
		y: 1,
		z: 0
	},
	enableMotor: false,
	angularVelocity: {
		x: 0,
		y: 0,
		z: 0
	},
	maxMotorTorque: 10,
	collideConnected: false,
	enabled: true
};
const ie = {
	anchor: { tooltip: "Attachment in this entity’s local frame, in world units." },
	axis: {
		category: "Reference Frame",
		tooltip: "Local X/twist direction. Must be nonzero."
	},
	normalAxis: {
		category: "Reference Frame",
		tooltip: "Local Y reference. Must not be parallel to the X/twist axis."
	},
	enableMotor: { category: "Motor" },
	angularVelocity: {
		category: "Motor",
		tooltip: "Body B relative to A, in constraint axes (rad/s)."
	},
	maxMotorTorque: {
		category: "Motor",
		min: 0,
		tooltip: "Maximum torque per motor axis (N m)."
	},
	collideConnected: { category: "Collision" }
};
/** A limited ball joint with separate twist limits. Angles are radians. @experimental */
const k = e("SwingTwistJoint3D", {
	...re,
	axis: {
		x: 0,
		y: 1,
		z: 0
	},
	normalAxis: {
		x: 1,
		y: 0,
		z: 0
	},
	normalHalfConeAngle: Math.PI / 4,
	planeHalfConeAngle: Math.PI / 4,
	twistMinAngle: -Math.PI / 6,
	twistMaxAngle: Math.PI / 6
}, {
	entityFields: ["connectedEntity"],
	fields: {
		...ie,
		normalHalfConeAngle: {
			category: "Swing Limits",
			min: 0,
			max: Math.PI
		},
		planeHalfConeAngle: {
			category: "Swing Limits",
			min: 0,
			max: Math.PI
		},
		twistMinAngle: {
			category: "Twist Limits",
			min: -Math.PI,
			max: Math.PI
		},
		twistMaxAngle: {
			category: "Twist Limits",
			min: -Math.PI,
			max: Math.PI
		}
	}
});
/** Six axes independently locked, limited or free; optional velocity motors. @experimental */
const A = e("SixDOFJoint3D", {
	...re,
	translationMotion: {
		x: 0,
		y: 0,
		z: 0
	},
	rotationMotion: {
		x: 0,
		y: 0,
		z: 0
	},
	translationLower: {
		x: -100,
		y: -100,
		z: -100
	},
	translationUpper: {
		x: 100,
		y: 100,
		z: 100
	},
	rotationLower: {
		x: -Math.PI / 6,
		y: -Math.PI / 6,
		z: -Math.PI / 6
	},
	rotationUpper: {
		x: Math.PI / 6,
		y: Math.PI / 6,
		z: Math.PI / 6
	},
	linearVelocity: {
		x: 0,
		y: 0,
		z: 0
	},
	maxMotorForce: 100
}, {
	entityFields: ["connectedEntity"],
	fields: {
		...ie,
		translationMotion: {
			category: "Translation Limits",
			tooltip: "Each axis: 0 locked, 1 limited, 2 free."
		},
		translationLower: { category: "Translation Limits" },
		translationUpper: { category: "Translation Limits" },
		rotationMotion: {
			category: "Rotation Limits",
			tooltip: "Each axis: 0 locked, 1 limited, 2 free."
		},
		rotationLower: { category: "Rotation Limits" },
		rotationUpper: { category: "Rotation Limits" },
		linearVelocity: {
			category: "Motor",
			tooltip: "Body B relative to A, in constraint axes (world units/s)."
		},
		maxMotorForce: {
			category: "Motor",
			min: 0,
			tooltip: "Maximum force per translation axis (N)."
		}
	}
});
const ae = [
	"x",
	"y",
	"z"
];
const oe = (e) => e && ae.every((t) => Number.isFinite(e[t]));
/** Returns an explanation for invalid settings, or null when they are valid. @experimental */
function j(e) {
	if (![
		e.anchor,
		e.axis,
		e.normalAxis,
		e.angularVelocity
	].every(oe)) return "Joint vectors must be finite.";
	const t = e.axis, n = e.normalAxis;
	const r = Math.hypot(t.y * n.z - t.z * n.y, t.z * n.x - t.x * n.z, t.x * n.y - t.y * n.x);
	const i = Math.hypot(t.x, t.y, t.z), a = Math.hypot(n.x, n.y, n.z);
	const o = i * a;
	if (i < 1e-6 || a < 1e-6 || !Number.isFinite(o) || r / o < 1e-5) return "Reference directions must be nonzero and not parallel.";
	if (!Number.isFinite(e.maxMotorTorque) || e.maxMotorTorque < 0) return "Motor torque must be finite and nonnegative.";
	if ("translationMotion" in e) {
		if (![
			e.translationMotion,
			e.rotationMotion,
			e.translationLower,
			e.translationUpper,
			e.rotationLower,
			e.rotationUpper,
			e.linearVelocity
		].every(oe)) return "Axis settings must be finite.";
		if (!Number.isFinite(e.maxMotorForce) || e.maxMotorForce < 0) return "Motor force must be finite and nonnegative.";
		for (const t of ae) for (const n of [false, true]) {
			const r = (n ? e.rotationMotion : e.translationMotion)[t];
			if (![
				0,
				1,
				2
			].includes(r)) return "Axis motion must be Locked, Limited or Free.";
			if (r !== 1) continue;
			const i = (n ? e.rotationLower : e.translationLower)[t];
			const a = (n ? e.rotationUpper : e.translationUpper)[t];
			if (i >= a) return "A limited axis needs a lower bound below its upper bound.";
			if (n && (i < -Math.PI || a > Math.PI)) return "Rotation limits must lie within −π to π.";
		}
	} else {
		if (![e.normalHalfConeAngle, e.planeHalfConeAngle].every((e) => Number.isFinite(e) && e >= 0 && e <= Math.PI)) return "Swing half angles must lie within 0 to π.";
		if (!Number.isFinite(e.twistMinAngle) || !Number.isFinite(e.twistMaxAngle) || e.twistMinAngle < -Math.PI || e.twistMaxAngle > Math.PI || e.twistMinAngle > e.twistMaxAngle) return "Twist limits must be ordered within −π to π.";
	}
	return null;
}
/** Constraint frame/settings changes rebuild; changing motors does not reset the reference pose. */
function se(e) {
	const { enableMotor: t, angularVelocity: n, maxMotorTorque: r, ...i } = e;
	if ("linearVelocity" in i) {
		const { linearVelocity: e, maxMotorForce: t, ...n } = i;
		return JSON.stringify(n);
	}
	return JSON.stringify(i);
}
function ce(e) {
	return e.x | e.y << 2 | e.z << 4;
}
//#endregion
//#region src/physics3d/ragdoll.ts
/** How a ragdoll's joints are limited. */
const M = {
	/** Every joint gets `swing` and `twist`. */
	Uniform: 0,
	/** Each joint gets the share of them its part of a body has, read from the bone's name: a spine stiff, a shoulder loose, a shin almost a hinge. A bone the names do not place gets all of it. */
	Humanoid: 1
};
/** Which of its own axes a character looks along. */
const N = {
	PlusZ: 0,
	MinusZ: 1,
	PlusX: 2,
	MinusX: 3
};
/**
* A skinned character that can go limp.
*
* @experimental
*/
const P = e("Ragdoll", {
	active: false,
	skin: 0,
	profile: M.Humanoid,
	swing: 100,
	twist: 60,
	bend: 130,
	facing: N.PlusZ,
	thickness: .25,
	minBoneLength: .05,
	friction: .5,
	recoverTime: .4
}, {
	entityFields: ["skin"],
	fields: {
		active: {
			category: "Ragdoll",
			tooltip: "Whether the character is limp. Turn it on when it is knocked down, off to stand it up."
		},
		skin: {
			category: "Ragdoll",
			tooltip: "The entity that holds the skinned mesh, whose joints are the skeleton. Empty looks on this entity and then below it."
		},
		profile: {
			enum: [{
				label: "Uniform",
				value: M.Uniform
			}, {
				label: "Humanoid",
				value: M.Humanoid
			}],
			category: "Limits",
			tooltip: "Uniform gives every joint the same limits. Humanoid gives each the share of them its part of a body has, read from the bone's name: a spine stiff, a shoulder loose, a shin almost a hinge."
		},
		swing: {
			min: 0,
			max: 175,
			category: "Limits",
			tooltip: "How far a limb may swing from its bone's line, in degrees. With the humanoid profile, the most a loose joint (a shoulder, a hip) is given."
		},
		twist: {
			min: 0,
			max: 175,
			category: "Limits",
			tooltip: "How far a limb may twist about its own line, in degrees. With the humanoid profile, the most a loose joint is given."
		},
		thickness: {
			min: .01,
			max: 2,
			category: "Bodies",
			tooltip: "A limb's thickness as a fraction of its length."
		},
		minBoneLength: {
			min: 0,
			category: "Bodies",
			tooltip: "A bone shorter than this gets no body of its own (a finger, a toe): its parent carries it."
		},
		bend: {
			min: 0,
			max: 175,
			category: "Limits",
			tooltip: "How far a knee or an elbow may bend, in degrees, and only one way: a shin folds back, a forearm folds forward. 0 leaves them swinging like any other joint. Humanoid profile only."
		},
		facing: {
			enum: [
				{
					label: "+Z",
					value: N.PlusZ
				},
				{
					label: "-Z",
					value: N.MinusZ
				},
				{
					label: "+X",
					value: N.PlusX
				},
				{
					label: "-X",
					value: N.MinusX
				}
			],
			category: "Limits",
			tooltip: "Which of its own axes the character looks along. It is what tells a knee from a hyperextended one."
		},
		friction: {
			min: 0,
			category: "Bodies"
		},
		recoverTime: {
			min: 0,
			category: "Recovery",
			tooltip: "Seconds to blend from the limp pose back to the animation once the ragdoll is turned off."
		}
	}
});
/**
* What the author says of one bone of a ragdoll: that it gets no body, or limits of its own. Put it on the bone's entity.
*
* @experimental
*/
const F = e("RagdollJoint", {
	body: true,
	custom: false,
	swing: 70,
	twist: 40,
	bend: 0,
	fold: 0
}, { fields: {
	body: {
		category: "Ragdoll",
		tooltip: "Whether this bone gets a body of its own. Off, the bone above carries it."
	},
	custom: {
		category: "Limits",
		tooltip: "Use the limits below instead of the ones the ragdoll's profile gives this joint."
	},
	swing: {
		min: 0,
		max: 175,
		category: "Limits",
		tooltip: "How far the limb may swing from its bone's line, in degrees, either way.",
		shownWhen: {
			field: "custom",
			values: [1]
		}
	},
	twist: {
		min: 0,
		max: 175,
		category: "Limits",
		tooltip: "How far the limb may twist about its own line, in degrees, either way.",
		shownWhen: {
			field: "custom",
			values: [1]
		}
	},
	bend: {
		min: 0,
		max: 175,
		category: "Limits",
		tooltip: "How far it may bend, in degrees, one way only (a knee, an elbow). 0 is an ordinary swing and twist joint.",
		shownWhen: {
			field: "custom",
			values: [1]
		}
	},
	fold: {
		enum: [
			{
				label: "As its name says",
				value: 0
			},
			{
				label: "Toward the facing",
				value: 1
			},
			{
				label: "Away from the facing",
				value: -1
			}
		],
		category: "Limits",
		tooltip: "Which way a bend goes where the bone's name does not say.",
		shownWhen: {
			field: "custom",
			values: [1]
		}
	}
} });
/** The share of the swing and twist each part gets: a trunk bends little, a shoulder and a hip go round, a knee and an elbow are almost hinges. */
const le = {
	spine: {
		swing: .3,
		twist: .35
	},
	neck: {
		swing: .45,
		twist: .6
	},
	head: {
		swing: .4,
		twist: .6
	},
	shoulder: {
		swing: .25,
		twist: .15
	},
	upperArm: {
		swing: 1,
		twist: .8
	},
	forearm: {
		swing: .8,
		twist: .1
	},
	hand: {
		swing: .45,
		twist: .25
	},
	thigh: {
		swing: .75,
		twist: .4
	},
	shin: {
		swing: .9,
		twist: .08
	},
	foot: {
		swing: .35,
		twist: .2
	},
	toe: {
		swing: .25,
		twist: .08
	},
	other: {
		swing: 1,
		twist: 1
	}
};
/**
* Which part of a body a bone is, from its name (Rigify's `DEF-upper_arm.L`, Mixamo's `LeftArm`, a plain `forearm_r`). The checks go from the more specific to the less, because
* a forearm is also an arm and a shin a leg.
*
* @experimental
*/
function I(e) {
	const t = (e ?? "").toLowerCase().replace(/[^a-z]/g, "");
	if (!t) return "other";
	if (/toe/.test(t)) return "toe";
	if (/foot|ankle/.test(t)) return "foot";
	if (/shin|calf|lowerleg|knee/.test(t)) return "shin";
	if (/thigh|upperleg|upleg/.test(t)) return "thigh";
	if (/hand|wrist|palm/.test(t)) return "hand";
	if (/forearm|lowerarm|elbow/.test(t)) return "forearm";
	if (/upperarm|uparm/.test(t)) return "upperArm";
	if (/shoulder|clavicle|collar/.test(t)) return "shoulder";
	if (/neck/.test(t)) return "neck";
	if (/head/.test(t)) return "head";
	if (/spine|chest|torso|abdomen|belly/.test(t)) return "spine";
	if (/arm/.test(t)) return "upperArm";
	if (/leg/.test(t)) return "thigh";
	return "other";
}
const ue = 1e-9;
/** A direction perpendicular to `a`. */
function de(e) {
	const t = Math.abs(e.y) < .9 ? {
		x: 0,
		y: 1,
		z: 0
	} : {
		x: 1,
		y: 0,
		z: 0
	};
	return D.normalize(D.cross(e, t));
}
/**
* The limbs a skeleton is made into. Pure: bones in, limbs out, parents before children.
*
* A bone points at its longest child; one with no children (a hand, a head) takes its parent's line and half its length. A bone shorter than
* `minBoneLength` gets no limb, and what hangs from it hangs from the limb above.
*
* @experimental
*/
function fe(e, t) {
	const n = new Map(e.map((e) => [e.id, e]));
	const r = /* @__PURE__ */ new Map();
	for (const t of e) {
		if (t.parent === null || !n.has(t.parent)) continue;
		let e = r.get(t.parent);
		if (!e) r.set(t.parent, e = []);
		e.push(t);
	}
	const i = [];
	const a = /* @__PURE__ */ new Map();
	const o = (e, t) => Math.hypot(t.x - e.x, t.y - e.y, t.z - e.z);
	const s = e.filter((e) => e.parent === null || !n.has(e.parent));
	const c = [];
	const l = (e) => {
		c.push(e);
		for (const t of r.get(e.id) ?? []) l(t);
	};
	for (const e of s) l(e);
	for (const e of c) {
		if (e.override?.body === false) continue;
		let s = null, c = 0;
		for (const t of r.get(e.id) ?? []) {
			const n = o(e.position, t.position);
			if (n > c) {
				c = n;
				s = D.sub(t.position, e.position);
			}
		}
		if (!s) {
			const t = e.parent === null ? void 0 : n.get(e.parent);
			if (!t) continue;
			const r = D.sub(e.position, t.position);
			c = Math.hypot(r.x, r.y, r.z) / 2;
			s = D.scale(D.normalize(r), c);
		}
		if (c < Math.max(t.minBoneLength, ue)) continue;
		const l = m.rotate(m.conjugate(e.rotation), s);
		const u = Math.abs(l.x) >= Math.abs(l.y) && Math.abs(l.x) >= Math.abs(l.z) ? 0 : Math.abs(l.y) >= Math.abs(l.z) ? 1 : 2;
		const d = Math.max(c * t.thickness, 1e-4);
		const f = [
			d,
			d,
			d
		];
		f[u] = c / 2;
		const p = D.normalize(l);
		let h = e.parent === null ? void 0 : n.get(e.parent);
		while (h && !a.has(h.id)) h = h.parent === null ? void 0 : n.get(h.parent);
		const g = {
			entity: e.id,
			connected: h ? h.id : null,
			halfExtents: {
				x: f[0],
				y: f[1],
				z: f[2]
			},
			center: {
				x: l.x / 2,
				y: l.y / 2,
				z: l.z / 2
			},
			axis: p,
			normalAxis: de(p),
			...t.profile === M.Uniform ? {
				swing: 1,
				twist: 1
			} : le[I(e.name)]
		};
		const _ = I(e.name);
		const v = e.override;
		if (v?.swing !== void 0) g.swingDeg = v.swing;
		if (v?.twist !== void 0) g.twistDeg = v.twist;
		const y = v?.bend ?? (t.profile !== M.Uniform ? t.bend : 0) ?? 0;
		const b = v?.fold ? v.fold > 0 ? 1 : -1 : _ === "shin" ? -1 : _ === "forearm" ? 1 : 0;
		if (y > 0 && b !== 0 && t.forward && h) {
			const n = pe(e, h, s, b, t.forward, y * Math.PI / 180);
			if (n) g.hinge = n;
		}
		i.push(g);
		a.set(e.id, g);
	}
	return i;
}
/**
* The one-way hinge of a knee or an elbow, or null where the character's facing runs along the bone so no side is the bending one.
*
* `along` is the bone above's line, from its own origin to this bone's; `bendSide` is 1 where the bone folds toward the way the character looks and -1 where it folds away.
*/
function pe(e, t, n, r, i, a) {
	const o = D.sub(e.position, t.position);
	if (Math.hypot(o.x, o.y, o.z) < 1e-9) return null;
	const s = D.normalize(o);
	const c = D.scale(i, r);
	const l = D.sub(c, D.scale(s, D.dot(c, s)));
	if (Math.hypot(l.x, l.y, l.z) < .3) return null;
	const u = D.normalize(l);
	const d = D.normalize(D.cross(s, u));
	const f = D.normalize(n);
	const p = Math.atan2(D.dot(D.cross(s, f), d), D.dot(s, f));
	const h = (t) => m.rotate(m.conjugate(e.rotation), t);
	const g = h(d);
	return {
		axis: g,
		normalAxis: de(g),
		lower: Math.min(-p, -.02),
		upper: Math.max(a - p, .02)
	};
}
const me = (e) => e * e * (3 - 2 * e);
function he(e, t, n) {
	const r = e.x * t.x + e.y * t.y + e.z * t.z + e.w * t.w < 0 ? -1 : 1;
	return m.normalize({
		w: e.w + (r * t.w - e.w) * n,
		x: e.x + (r * t.x - e.x) * n,
		y: e.y + (r * t.y - e.y) * n,
		z: e.z + (r * t.z - e.z) * n
	});
}
/** The skinned mesh a ragdoll reads its skeleton from: the entity named, or this one, or the first thing below it that is skinned. */
function ge(e, t, n) {
	const r = o("MeshSkin");
	if (!r) return null;
	let s = null;
	if (n.skin > 0 && e.valid(n.skin) && e.has(n.skin, r)) s = n.skin;
	const c = n.skin > 0 ? [] : [t];
	for (let t = 0; s === null && t < c.length && t < 4096; t++) {
		const n = c[t];
		if (!e.valid(n)) continue;
		if (e.has(n, r)) {
			s = n;
			break;
		}
		if (e.has(n, i)) c.push(...e.get(n, i).entities);
	}
	if (s === null) return null;
	const l = e.get(s, r).joints.filter((t) => e.valid(t) && e.has(t, a));
	return l.length > 0 ? {
		skin: s,
		joints: l
	} : null;
}
/**
* What `entity`'s ragdoll would be made of from the pose its skeleton is in now: the same answer the ragdoll builds its bodies from, so the editor can draw it before anything runs.
* Null where there is no skinned mesh to read.
*
* @experimental
*/
function _e(e, n, r) {
	const i = ge(e, n, r);
	if (!i) return null;
	e.ensureTransformsComposed();
	const o = new Set(i.joints);
	const c = (n) => {
		let r = e.has(n, t) ? e.get(n, t).entity : void 0;
		for (let n = 0; r !== void 0 && e.valid(r) && n < 256; n++) {
			if (o.has(r)) return r;
			r = e.has(r, t) ? e.get(r, t).entity : void 0;
		}
		return null;
	};
	const l = i.joints.map((t) => {
		const n = e.get(t, a);
		const r = e.has(t, F) ? e.get(t, F) : null;
		return {
			id: t,
			parent: c(t),
			name: e.has(t, s) ? e.get(t, s).value : void 0,
			position: {
				x: n.worldPosition.x,
				y: n.worldPosition.y,
				z: n.worldPosition.z
			},
			rotation: {
				w: n.worldRotation.w,
				x: n.worldRotation.x,
				y: n.worldRotation.y,
				z: n.worldRotation.z
			},
			...r ? { override: {
				body: r.body,
				fold: r.fold,
				...r.custom ? {
					swing: r.swing,
					twist: r.twist,
					bend: r.bend
				} : {}
			} } : {}
		};
	});
	const u = [
		{
			x: 0,
			y: 0,
			z: 1
		},
		{
			x: 0,
			y: 0,
			z: -1
		},
		{
			x: 1,
			y: 0,
			z: 0
		},
		{
			x: -1,
			y: 0,
			z: 0
		}
	][r.facing] ?? {
		x: 0,
		y: 0,
		z: 1
	};
	const d = e.get(n, a);
	const f = m.rotate({
		w: d.worldRotation.w,
		x: d.worldRotation.x,
		y: d.worldRotation.y,
		z: d.worldRotation.z
	}, u);
	const p = fe(l, {
		thickness: r.thickness,
		minBoneLength: r.minBoneLength,
		profile: r.profile,
		bend: r.bend,
		forward: f
	});
	const h = (e) => Math.min(Math.max(e, 0), 175) * Math.PI / 180;
	const g = {
		x: 0,
		y: 0,
		z: 0
	};
	return {
		skin: i.skin,
		bones: i.joints,
		limbs: p.map((e) => {
			if (e.connected === null) return {
				limb: e,
				joint: null
			};
			if (e.hinge) {
				const t = e.hinge;
				return {
					limb: e,
					joint: {
						kind: "sixDOF",
						data: {
							connectedEntity: e.connected,
							anchor: g,
							axis: t.axis,
							normalAxis: t.normalAxis,
							enableMotor: false,
							angularVelocity: g,
							maxMotorTorque: 10,
							collideConnected: false,
							enabled: true,
							translationMotion: g,
							rotationMotion: {
								x: O.Limited,
								y: O.Locked,
								z: O.Locked
							},
							translationLower: g,
							translationUpper: g,
							rotationLower: {
								x: -t.upper,
								y: 0,
								z: 0
							},
							rotationUpper: {
								x: -t.lower,
								y: 0,
								z: 0
							},
							linearVelocity: g,
							maxMotorForce: 0
						}
					}
				};
			}
			const t = h(e.swingDeg ?? r.swing * e.swing), n = h(e.twistDeg ?? r.twist * e.twist);
			return {
				limb: e,
				joint: {
					kind: "swingTwist",
					data: {
						connectedEntity: e.connected,
						anchor: g,
						axis: e.axis,
						normalAxis: e.normalAxis,
						enableMotor: false,
						angularVelocity: g,
						maxMotorTorque: 10,
						collideConnected: false,
						enabled: true,
						normalHalfConeAngle: t,
						planeHalfConeAngle: t,
						twistMinAngle: -n,
						twistMaxAngle: n
					}
				}
			};
		})
	};
}
/**
* Installs the systems that turn a `Ragdoll`'s switch into bodies and back. Called once by the 3D physics plugin.
*
* The animation is never switched off. A frame runs the fixed steps (the solver writes the bodies' poses into the bones), then Update (the
* animator writes its own over them), then PostUpdate: where the bodies' poses are written back, so what is drawn is the ragdoll and the next
* fixed step starts from it. Holding the animator off instead meant restoring it afterwards, which it does not do cleanly (it comes back on
* a pose of its own), and left a character with no animation to blend back to; run underneath, it is already where it should be.
*/
function ve(e) {
	const t = /* @__PURE__ */ new Map();
	const r = /* @__PURE__ */ new Map();
	const i = e.world;
	const o = (e) => {
		const t = i.get(e, a);
		return {
			position: {
				x: t.position.x,
				y: t.position.y,
				z: t.position.z
			},
			rotation: {
				w: t.rotation.w,
				x: t.rotation.x,
				y: t.rotation.y,
				z: t.rotation.z
			}
		};
	};
	const s = (e, t) => {
		const n = i.get(e, a);
		n.position.x = t.position.x;
		n.position.y = t.position.y;
		n.position.z = t.position.z;
		n.rotation.x = t.rotation.x;
		n.rotation.y = t.rotation.y;
		n.rotation.z = t.rotation.z;
		n.rotation.w = t.rotation.w;
		i.set(e, a, n);
	};
	const l = (e, n) => {
		const a = _e(i, e, n);
		if (!a) {
			d.warn("physics3d", `Ragdoll on entity ${e} found no skinned mesh with joints on it or below it`);
			return;
		}
		d.info("physics3d", `Ragdoll on entity ${e}: ${a.limbs.length} limbs from ${a.bones.length} bones`);
		for (const { limb: e, joint: t } of a.limbs) {
			const r = e.entity;
			i.insert(r, S, {
				bodyType: 2,
				enabled: true
			});
			i.insert(r, T, {
				halfExtents: e.halfExtents,
				center: e.center,
				friction: n.friction,
				restitution: 0,
				isSensor: false,
				enabled: true
			});
			if (t?.kind === "sixDOF") i.insert(r, A, t.data);
			else if (t) i.insert(r, k, t.data);
		}
		r.delete(e);
		t.set(e, {
			limbs: a.limbs.map((e) => e.limb.entity),
			posed: /* @__PURE__ */ new Map()
		});
	};
	const p = (e, n) => {
		const a = t.get(e);
		if (!a) return;
		t.delete(e);
		d.info("physics3d", `Ragdoll on entity ${e} stands up (blend ${n.recoverTime}s)`);
		for (const e of a.limbs) {
			if (!i.valid(e)) continue;
			i.remove(e, k);
			i.remove(e, A);
			i.remove(e, T);
			i.remove(e, S);
		}
		if (n.recoverTime > 0 && a.posed.size > 0) r.set(e, {
			elapsed: 0,
			duration: n.recoverTime,
			from: a.posed
		});
	};
	e.addSystemToSchedule(3, n([], () => {
		for (const e of i.getEntitiesWithComponents([P])) {
			const n = i.get(e, P);
			const r = t.has(e);
			if (n.active && !r) l(e, n);
			else if (!n.active && r) p(e, n);
		}
		for (const e of [...t.keys()]) if (!i.valid(e)) t.delete(e);
		for (const e of [...r.keys()]) if (!i.valid(e)) r.delete(e);
	}, { name: "RagdollSystem" }), { runIf: f });
	e.addSystemToSchedule(12, n([], () => {
		for (const e of t.values()) for (const t of e.limbs) if (i.valid(t)) e.posed.set(t, o(t));
	}, { name: "RagdollCaptureSystem" }), { runIf: f });
	e.addSystemToSchedule(4, n([u(c)], (e) => {
		for (const e of t.values()) for (const [t, n] of e.posed) if (i.valid(t)) s(t, n);
		for (const [t, n] of r) {
			n.elapsed += e.delta;
			const a = me(Math.min(n.elapsed / n.duration, 1));
			for (const [e, t] of n.from) {
				if (!i.valid(e)) continue;
				const n = o(e);
				s(e, {
					position: {
						x: t.position.x + (n.position.x - t.position.x) * a,
						y: t.position.y + (n.position.y - t.position.y) * a,
						z: t.position.z + (n.position.z - t.position.z) * a
					},
					rotation: he(t.rotation, n.rotation, a)
				});
			}
			if (n.elapsed >= n.duration) {
				r.delete(t);
				d.info("physics3d", `Ragdoll on entity ${t} is back on the animation`);
			}
		}
	}, { name: "RagdollPoseSystem" }), { runIf: f });
}
//#endregion
//#region src/physics3d/Physics3DModule.ts
/**
* @file    Physics3DModule.ts
* @brief   The 3D physics wasm module's surface, and how it is loaded.
*/
/** One readback record: entity, position, rotation. */
const ye = 8;
const be = [
	"_physics3d_init",
	"_physics3d_shutdown",
	"_physics3d_isReady",
	"_physics3d_step",
	"_physics3d_setSolver",
	"_physics3d_addBox",
	"_physics3d_addSphere",
	"_physics3d_addCapsule",
	"_physics3d_removeBody",
	"_physics3d_setTransform",
	"_physics3d_raycast",
	"_physics3d_raycastWith",
	"_physics3d_transforms",
	"_physics3d_transformsBytes",
	"_physics3d_addCharacter",
	"_physics3d_moveCharacter",
	"_physics3d_removeCharacter",
	"_physics3d_setCharacterPosition",
	"_physics3d_sphereCast",
	"_physics3d_overlapSphere",
	"_physics3d_overlapBox",
	"_physics3d_contactEnters",
	"_physics3d_contactEntersBytes",
	"_physics3d_sensorEnters",
	"_physics3d_sensorEntersBytes",
	"_physics3d_addHingeJoint",
	"_physics3d_removeJoint",
	"_physics3d_addSwingTwistJoint",
	"_physics3d_addSixDOFJoint",
	"_physics3d_setAdvancedJointMotor"
];
/** Throws naming what is missing, rather than letting the first frame do it. */
function xe(e) {
	const t = e;
	const n = be.filter((e) => typeof t?.[e] !== "function");
	if (n.length > 0) throw new Error(`physics3d.wasm is missing ${n.join(", ")} — it was built from sources older than the code driving it`);
}
/** Load the module from `url`, or adopt a factory a host already resolved. */
async function Se(e, t) {
	const n = await (t ?? (await import(
		/*  @vite-ignore*/
		e
)).default)();
	xe(n);
	return n;
}
/**
* This step's 3D collision and trigger events. Drained per fixed step, so a
* system reading it must run inside one — a read from `Update` sees whatever the
* last step left.
*
* @experimental
*/
const Ce = l({
	contactEnters: [],
	contactExits: [],
	sensorEnters: [],
	sensorExits: []
}, "Physics3DEvents");
/**
* Refill `events` from the module's four buffers. A contact point is made in the world's own
* units, so `pixelsPerUnit` brings it into the space `Transform` and the queries speak.
*/
function we(e, t, n = 1) {
	const r = e.HEAPF32;
	const i = (e, t, n, r) => {
		const i = [];
		const a = e >> 2;
		for (let e = 0; e < t / 4; e += n) i.push(r(a + e));
		return i;
	};
	t.contactEnters = i(e._physics3d_contactEnters(), e._physics3d_contactEntersBytes(), 8, (e) => ({
		entityA: r[e],
		entityB: r[e + 1],
		normalX: r[e + 2],
		normalY: r[e + 3],
		normalZ: r[e + 4],
		pointX: r[e + 5] * n,
		pointY: r[e + 6] * n,
		pointZ: r[e + 7] * n
	}));
	t.contactExits = i(e._physics3d_contactExits(), e._physics3d_contactExitsBytes(), 2, (e) => ({
		entityA: r[e],
		entityB: r[e + 1]
	}));
	t.sensorEnters = i(e._physics3d_sensorEnters(), e._physics3d_sensorEntersBytes(), 2, (e) => ({
		sensorEntity: r[e],
		visitorEntity: r[e + 1]
	}));
	t.sensorExits = i(e._physics3d_sensorExits(), e._physics3d_sensorExitsBytes(), 2, (e) => ({
		sensorEntity: r[e],
		visitorEntity: r[e + 1]
	}));
}
//#endregion
//#region src/physics3d/implicitStatic.ts
/**
* @file    implicitStatic.ts
* @brief   Which entities are a static body with no RigidBody3D: one answer for the world that builds them and the
*          wireframe that draws them, so the two cannot disagree.
*/
/**
* A collider with no RigidBody3D is a static body, as in Unity: an imported level collides with a MeshCollider3D on
* each mesh and nothing else. Not when a character controller owns the entity, and not under a RigidBody3D, whose
* child colliders belong to that body.
*/
function L(e, n) {
	if (e.has(n, S) || e.has(n, C)) return false;
	let r = n;
	for (let n = 0; n < 64 && e.has(r, t); n++) {
		r = e.get(r, t).entity;
		if (!e.valid(r)) return true;
		if (e.has(r, S)) return false;
	}
	return true;
}
//#endregion
//#region src/physics3d/CompoundCollider3D.ts
const R = e("CompoundCollider3D", {
	parts: [],
	friction: .3,
	restitution: 0,
	isSensor: false,
	mass: 1,
	enabled: true
});
const Te = 11;
/** The side module's bounded primitive packet, in metres, built only when a body is created. */
function Ee(e, t, n) {
	if (!Number.isFinite(n) || n <= 0 || e.length > 16384) throw Error("Invalid compound collider size or units");
	if (![
		t.x,
		t.y,
		t.z
	].every((e) => Number.isFinite(e) && e > 0)) throw Error("Compound colliders require a finite positive placement scale");
	const r = new Float32Array(e.length * 11);
	const i = Math.abs(t.x) / n, a = Math.abs(t.y) / n, o = Math.abs(t.z) / n;
	e.forEach((e, s) => {
		const c = s * 11;
		const l = e.rotation, u = Math.hypot(l.x, l.y, l.z, l.w);
		if (!Number.isFinite(u) || u === 0) throw Error("Invalid compound collider rotation");
		if (!(Math.abs(i - a) < 1e-6 && Math.abs(a - o) < 1e-6) && e.kind !== "sphere" && Math.hypot(l.x, l.y, l.z) > 1e-6) throw Error("Rotated compound primitives under non-uniform scale require baked collision geometry");
		let d;
		if (e.kind === "box" && e.halfExtents) d = [
			0,
			e.halfExtents.x * i,
			e.halfExtents.y * a,
			e.halfExtents.z * o
		];
		else if (e.kind === "sphere") d = [
			1,
			(e.radius ?? 0) * Math.max(i, a, o),
			0,
			0
		];
		else if (e.kind === "capsule") d = [
			2,
			(e.radius ?? 0) * Math.max(i, o),
			(e.halfHeight ?? 0) * a,
			0
		];
		else throw Error("Unsupported compound collider primitive");
		if (d[1] <= 0 || e.kind === "box" && (d[2] <= 0 || d[3] <= 0) || d[2] < 0) throw Error("Compound collider dimensions must be positive");
		r.set([
			...d,
			e.position.x * t.x / n,
			e.position.y * t.y / n,
			e.position.z * t.z / n,
			l.x / u,
			l.y / u,
			l.z / u,
			l.w / u
		], c);
	});
	if (r.some((e) => !Number.isFinite(e))) throw Error("Compound collider contains non-finite values");
	return r;
}
//#endregion
//#region src/physics3d/ColliderShape3D.ts
/** Points per full circle in a sphere/capsule wireframe. */
const De = 24;
const z = {
	x: 0,
	y: 0,
	z: 0
};
/** Turn a vector by a rotation — what places an anchor, an axis or a wireframe
*  vertex in the world. The maths is the math module's; this is its name here. */
function B(e, t) {
	return m.rotate(e, t);
}
/** Local AABB of a loaded mesh's collision triangles, or null when nothing loaded them. */
function Oe(e, t = {
	x: 1,
	y: 1,
	z: 1
}) {
	const n = e !== 0 ? E(e) : null;
	if (!n || n.positions.length < 3) return null;
	const r = n.positions;
	let i = r[0], a = r[1], o = r[2];
	let s = i, c = a, l = o;
	for (let e = 3; e + 2 < r.length; e += 3) {
		const t = r[e], n = r[e + 1], u = r[e + 2];
		if (t < i) i = t;
		else if (t > s) s = t;
		if (n < a) a = n;
		else if (n > c) c = n;
		if (u < o) o = u;
		else if (u > l) l = u;
	}
	return {
		center: {
			x: (i + s) / 2 * t.x,
			y: (a + c) / 2 * t.y,
			z: (o + l) / 2 * t.z
		},
		halfExtents: {
			x: (s - i) / 2 * Math.abs(t.x),
			y: (c - a) / 2 * Math.abs(t.y),
			z: (l - o) / 2 * Math.abs(t.z)
		}
	};
}
/**
* Every 3D collider on `entity`, each marked with whether it is the one the solver
* ends up building. The order mirrors `createBody` in Physics3DSystem — box, sphere,
* mesh, hull, capsule — and must keep mirroring it: a visualizer drawing a different
* shape than the world collides with is worse than none.
*/
function ke(e, t) {
	const n = [];
	const r = (e) => e.enabled !== false;
	const i = e.has(t, S) ? e.get(t, S) : null;
	const o = i !== null ? r(i) : L(e, t);
	let s = false;
	if (e.has(t, R)) {
		const i = e.get(t, R), c = e.has(t, a) ? e.get(t, a).worldScale : {
			x: 1,
			y: 1,
			z: 1
		};
		const l = Ee(i.parts, c, 1);
		s = r(i) && i.parts.length > 0;
		for (let e = 0; e < i.parts.length; e++) {
			const t = l.subarray(e * 11, (e + 1) * 11);
			const r = {
				center: {
					x: t[4],
					y: t[5],
					z: t[6]
				},
				rotation: {
					x: t[7],
					y: t[8],
					z: t[9],
					w: t[10]
				}
			};
			const a = t[0] === 0 ? {
				...r,
				kind: "box",
				halfExtents: {
					x: t[1],
					y: t[2],
					z: t[3]
				}
			} : t[0] === 1 ? {
				...r,
				kind: "sphere",
				radius: t[1]
			} : {
				...r,
				kind: "capsule",
				radius: t[1],
				halfHeight: t[2]
			};
			n.push({
				component: "CompoundCollider3D",
				shape: a,
				isSensor: i.isSensor,
				active: s && o
			});
		}
	}
	const c = e.has(t, T) ? e.get(t, T) : null;
	if (c) {
		const e = !s && r(c);
		if (e) s = true;
		n.push({
			component: "BoxCollider3D",
			shape: {
				kind: "box",
				halfExtents: c.halfExtents,
				center: c.center ?? z
			},
			isSensor: c.isSensor === true,
			active: e && o
		});
	}
	const l = e.has(t, w) ? e.get(t, w) : null;
	if (l) {
		const e = !s && r(l);
		if (e) s = true;
		n.push({
			component: "SphereCollider3D",
			shape: {
				kind: "sphere",
				radius: l.radius,
				...l.center ? { center: l.center } : {}
			},
			isSensor: l.isSensor === true,
			active: e && o
		});
	}
	const u = e.has(t, v) ? e.get(t, v) : null;
	if (u) {
		const i = !s && r(u) && u.mesh !== 0;
		if (i) s = true;
		const c = Oe(u.mesh, e.has(t, a) ? e.get(t, a).worldScale : void 0);
		if (c) n.push({
			component: "MeshCollider3D",
			shape: {
				kind: "box",
				halfExtents: c.halfExtents,
				center: c.center
			},
			isSensor: false,
			active: i && o
		});
	}
	const d = e.has(t, b) ? e.get(t, b) : null;
	if (d) {
		const i = !s && r(d) && d.mesh !== 0;
		if (i) s = true;
		const c = Oe(d.mesh, e.has(t, a) ? e.get(t, a).worldScale : void 0);
		if (c) n.push({
			component: "ConvexCollider3D",
			shape: {
				kind: "box",
				halfExtents: c.halfExtents,
				center: c.center
			},
			isSensor: d.isSensor === true,
			active: i && o
		});
	}
	const f = e.has(t, x) ? e.get(t, x) : null;
	if (f) {
		const e = !s && r(f);
		if (e) s = true;
		n.push({
			component: "CapsuleCollider3D",
			shape: {
				kind: "capsule",
				radius: f.radius,
				halfHeight: f.halfHeight,
				...f.center ? { center: f.center } : {}
			},
			isSensor: f.isSensor === true,
			active: e && o
		});
	}
	const p = e.has(t, C) ? e.get(t, C) : null;
	if (p) n.push({
		component: "CharacterController3D",
		shape: {
			kind: "capsule",
			radius: p.radius,
			halfHeight: p.halfHeight
		},
		isSensor: false,
		active: r(p)
	});
	return n;
}
function V(e, t, n, r) {
	const i = [];
	for (let a = 0; a <= r; a++) {
		const o = a / r * Math.PI * 2;
		const s = Math.cos(o) * e;
		const c = Math.sin(o) * e;
		i.push(t === "xy" ? {
			x: n.x + s,
			y: n.y + c,
			z: n.z
		} : t === "xz" ? {
			x: n.x + s,
			y: n.y,
			z: n.z + c
		} : {
			x: n.x,
			y: n.y + s,
			z: n.z + c
		});
	}
	return i;
}
/** Half-circle cap from angle 0 to π, in the plane the axis names, around `offset`. */
function H(e, t, n, r, i) {
	const a = [];
	for (let o = 0; o <= i; o++) {
		const s = o / i * Math.PI;
		const c = Math.cos(s) * e;
		const l = Math.sin(s) * e * r;
		a.push(t === "xy" ? {
			x: n.x + c,
			y: n.y + l,
			z: n.z
		} : {
			x: n.x,
			y: n.y + l,
			z: n.z + c
		});
	}
	return a;
}
/**
* The shape's wireframe as entity-local polylines (world units, unrotated).
* A box gives its 12 edges; a sphere three great circles; a capsule two rings,
* four caps and the four lines between them.
*/
function U(e, t = 24) {
	if (e.rotation) return W(U({
		...e,
		rotation: void 0,
		center: z
	}, t), e.center ?? z, e.rotation);
	const n = Ae(e, t);
	const r = e.kind === "box" ? void 0 : e.center;
	return r ? n.map((e) => e.map((e) => ({
		x: e.x + r.x,
		y: e.y + r.y,
		z: e.z + r.z
	}))) : n;
}
function Ae(e, t) {
	if (e.kind === "box") {
		const { center: t, halfExtents: n } = e;
		const r = (e, r, i) => ({
			x: t.x + e * n.x,
			y: t.y + r * n.y,
			z: t.z + i * n.z
		});
		const i = (e) => [
			r(-1, e, -1),
			r(1, e, -1),
			r(1, e, 1),
			r(-1, e, 1),
			r(-1, e, -1)
		];
		const a = [];
		for (const [e, t] of [
			[-1, -1],
			[1, -1],
			[1, 1],
			[-1, 1]
		]) a.push([r(e, -1, t), r(e, 1, t)]);
		return [
			i(-1),
			i(1),
			...a
		];
	}
	if (e.kind === "sphere") {
		const n = e.radius;
		return [
			V(n, "xy", z, t),
			V(n, "xz", z, t),
			V(n, "yz", z, t)
		];
	}
	const { radius: n, halfHeight: r } = e;
	const i = {
		x: 0,
		y: r,
		z: 0
	};
	const a = {
		x: 0,
		y: -r,
		z: 0
	};
	const o = Math.max(2, Math.round(t / 2));
	const s = [];
	for (const [e, t] of [
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1]
	]) s.push([{
		x: e * n,
		y: -r,
		z: t * n
	}, {
		x: e * n,
		y: r,
		z: t * n
	}]);
	return [
		V(n, "xz", i, t),
		V(n, "xz", a, t),
		H(n, "xy", i, 1, o),
		H(n, "zy", i, 1, o),
		H(n, "xy", a, -1, o),
		H(n, "zy", a, -1, o),
		...s
	];
}
/**
* Local polylines placed in the world by an entity's position and rotation.
*
* Scale is deliberately left out: the solver builds the shape from the collider's
* own numbers, so a scaled entity still collides at its authored size and a gizmo
* that grew with the scale would be drawing a body that does not exist.
*/
function W(e, t, n) {
	return e.map((e) => e.map((e) => {
		const r = B(n, e);
		return {
			x: t.x + r.x,
			y: t.y + r.y,
			z: t.z + r.z
		};
	}));
}
/** Points around a sphere or capsule when it is turned into triangles. Coarser
*  than the wireframe: this feeds a voxeliser, which rounds everything onto its
*  own grid anyway, and every extra ring is triangles it has to rasterise. */
const je = 8;
/**
* The shape as a closed triangle soup in entity-local space, wound so a face's
* normal points OUT — which way a face points is part of the answer to a caller
* like a navigation bake, where an upward normal is what makes a triangle ground
* rather than wall. The sibling of {@link collider3DWireframe}, in triangles.
*/
function Me(e) {
	if (e.rotation) {
		const t = Me({
			...e,
			rotation: void 0,
			center: z
		});
		const n = e.center ?? z;
		for (let r = 0; r < t.positions.length; r += 3) {
			const i = m.rotate(e.rotation, {
				x: t.positions[r],
				y: t.positions[r + 1],
				z: t.positions[r + 2]
			});
			t.positions.set([
				i.x + n.x,
				i.y + n.y,
				i.z + n.z
			], r);
		}
		return t;
	}
	if (e.kind === "box") {
		const { center: t, halfExtents: n } = e;
		const r = /* @__PURE__ */ new Float32Array(24);
		let i = 0;
		for (const e of [-1, 1]) for (const [a, o] of [
			[-1, -1],
			[1, -1],
			[1, 1],
			[-1, 1]
		]) {
			r[i++] = t.x + a * n.x;
			r[i++] = t.y + e * n.y;
			r[i++] = t.z + o * n.z;
		}
		return {
			positions: r,
			indices: Uint32Array.from(Ne)
		};
	}
	const t = e.radius;
	const n = e.kind === "capsule" ? e.halfHeight : 0;
	const r = e.center ?? z;
	const i = je;
	const a = je;
	const o = 10;
	const s = /* @__PURE__ */ new Float32Array(270);
	let c = 0;
	for (let e = 0; e < o; e++) {
		const o = e <= i / 2;
		const l = (o ? e : e - 1) / i * Math.PI;
		const u = Math.cos(l) * t + (o ? n : -n);
		const d = Math.sin(l) * t;
		for (let e = 0; e <= a; e++) {
			const t = e / a * Math.PI * 2;
			s[c++] = Math.cos(t) * d + r.x;
			s[c++] = u + r.y;
			s[c++] = Math.sin(t) * d + r.z;
		}
	}
	const l = [];
	for (let e = 0; e + 1 < o; e++) for (let t = 0; t < a; t++) {
		const n = e * 9 + t;
		const r = n + a + 1;
		l.push(n, n + 1, r, n + 1, r + 1, r);
	}
	return {
		positions: s,
		indices: Uint32Array.from(l)
	};
}
/** The twelve triangles over the eight corners emitted above, every one of them
*  wound counter-clockwise seen from outside the box. */
const Ne = [
	0,
	1,
	2,
	0,
	2,
	3,
	4,
	6,
	5,
	4,
	7,
	6,
	0,
	4,
	5,
	0,
	5,
	1,
	1,
	5,
	6,
	1,
	6,
	2,
	2,
	6,
	7,
	2,
	7,
	3,
	3,
	7,
	4,
	3,
	4,
	0
];
//#endregion
//#region src/physics3d/Physics3DJoints.ts
/**
* @file    Physics3DJoints.ts
* @brief   Joints between 3D bodies, as a scene authors them.
* @details A joint lives on the entity that declares it and names the other one,
*          the same shape the 2D joints use — so a scene reads the same whichever
*          world it is in, and one entity can be jointed to several others by
*          carrying several joint entities rather than one crowded component.
*
*          Anchors and axes are written in THIS entity's local space, in world
*          units, and are resolved against its transform when the joint is made:
*          an author moves the piece and the joint follows, rather than holding a
*          world coordinate that stops meaning anything once the scene is edited.
*/
/**
* A shared point the two bodies turn freely about — a chain link, a ragdoll limb.
*
* @experimental
*/
const G = e("PointJoint3D", {
	connectedEntity: -1,
	anchor: {
		x: 0,
		y: 0,
		z: 0
	},
	collideConnected: false,
	enabled: true
}, {
	entityFields: ["connectedEntity"],
	fields: { anchor: { tooltip: "Where the joint attaches, in THIS entity's frame (world units)." } }
});
/**
* One axis of rotation — a door, a lever, a driven wheel. Limits are radians
* measured from the pose the joint was made in, so zero is where you placed it.
*
* @experimental
*/
const K = e("HingeJoint3D", {
	connectedEntity: -1,
	anchor: {
		x: 0,
		y: 0,
		z: 0
	},
	axis: {
		x: 0,
		y: 1,
		z: 0
	},
	enableLimit: false,
	lowerAngle: -Math.PI / 2,
	upperAngle: Math.PI / 2,
	enableMotor: false,
	motorSpeed: 0,
	maxMotorTorque: 0,
	collideConnected: false,
	enabled: true,
	angle: 0
}, {
	entityFields: ["connectedEntity"],
	fields: { anchor: { tooltip: "Where the joint attaches, in THIS entity's frame (world units)." } }
});
/**
* One axis of travel — a lift, a piston, a sliding door. Limits are world units
* along `axis`, again measured from where the joint was made.
*
* @experimental
*/
const q = e("SliderJoint3D", {
	connectedEntity: -1,
	anchor: {
		x: 0,
		y: 0,
		z: 0
	},
	axis: {
		x: 0,
		y: 1,
		z: 0
	},
	enableLimit: false,
	lowerTranslation: -100,
	upperTranslation: 100,
	enableMotor: false,
	motorSpeed: 0,
	maxMotorForce: 0,
	collideConnected: false,
	enabled: true,
	translation: 0
}, {
	entityFields: ["connectedEntity"],
	fields: { anchor: { tooltip: "Where the joint attaches, in THIS entity's frame (world units)." } }
});
/**
* A distance kept between two points: a rope when only `maxLength` matters, a rod
* when the two lengths meet, a spring when `frequency` is above zero.
*
* @experimental
*/
const J = e("DistanceJoint3D", {
	connectedEntity: -1,
	anchor: {
		x: 0,
		y: 0,
		z: 0
	},
	connectedAnchor: {
		x: 0,
		y: 0,
		z: 0
	},
	minLength: 0,
	maxLength: 100,
	frequency: 0,
	damping: .5,
	collideConnected: false,
	enabled: true
}, { entityFields: ["connectedEntity"] });
/**
* No freedom at all: the two move as one. It has no anchor — the pose the pieces
* are in when the joint is made is the joint.
*
* @experimental
*/
const Pe = e("FixedJoint3D", {
	connectedEntity: -1,
	collideConnected: false,
	enabled: true
}, { entityFields: ["connectedEntity"] });
/** The joint components, in the order the system offers an entity's to the world. */
const Y = [
	G,
	K,
	q,
	J,
	Pe,
	k,
	A
];
/** An entity's joint: the FIRST of the joint components it carries, matching what the world
*  builds — the module keys one constraint per entity, so a second component on
*  the same entity would be geometry nothing enforces. */
function Fe(e, t) {
	for (const n of Y) if (e.world.has(t, n)) return {
		def: n,
		data: e.world.get(t, n)
	};
	return null;
}
/**
* The joint an entity declares, in the shape a gizmo draws — the SAME first-wins
* choice the world makes, so an editor never draws a joint the solver ignored.
*/
function Ie(e, t) {
	for (const n of Y) {
		if (!e.has(t, n)) continue;
		const r = e.get(t, n);
		return {
			type: n._name,
			connectedEntity: r.connectedEntity,
			anchor: r.anchor ?? null,
			connectedAnchor: r.connectedAnchor ?? null,
			axis: r.axis ?? null,
			enabled: r.enabled !== false,
			limits: n === k || n === A ? r : void 0
		};
	}
	return null;
}
/** A local (world-unit) point on `entity`, in metres, where the solver wants it. */
function X(e, t, n, r) {
	const i = e.world.get(t, a);
	const o = i?.worldPosition ?? {
		x: 0,
		y: 0,
		z: 0
	};
	const s = i?.worldRotation ?? {
		x: 0,
		y: 0,
		z: 0,
		w: 1
	};
	const c = B(s, n);
	return {
		x: (o.x + c.x) / r,
		y: (o.y + c.y) / r,
		z: (o.z + c.z) / r
	};
}
/** A local direction on `entity`, in world space. Directions do not scale. */
function Z(e, t, n) {
	const r = e.world.get(t, a);
	return B(r?.worldRotation ?? {
		x: 0,
		y: 0,
		z: 0,
		w: 1
	}, n);
}
/**
* Hand one joint to the world. The entity that declares it is body A and the one
* it names is body B, so `anchor` and `connectedAnchor` read in that order and a
* hinge's angle grows the way the axis points.
*/
function Le(e, t, n, r, i, a, o) {
	const s = e.world.get(n, r);
	const c = s.collideConnected ? 1 : 0;
	const l = n;
	if (r === k || r === A) {
		const r = s;
		if (j(r)) return false;
		const u = X(e, n, r.anchor, o);
		const d = Z(e, n, r.axis), f = Z(e, n, r.normalAxis);
		if ("translationMotion" in r) {
			const e = r.translationLower, n = r.translationUpper;
			const s = r.rotationLower, p = r.rotationUpper;
			return t._physics3d_addSixDOFJoint(l, i, a, u.x, u.y, u.z, d.x, d.y, d.z, f.x, f.y, f.z, ce(r.translationMotion), ce(r.rotationMotion), e.x / o, e.y / o, e.z / o, n.x / o, n.y / o, n.z / o, s.x, s.y, s.z, p.x, p.y, p.z, c) !== 0;
		}
		return t._physics3d_addSwingTwistJoint(l, i, a, u.x, u.y, u.z, d.x, d.y, d.z, f.x, f.y, f.z, r.normalHalfConeAngle, r.planeHalfConeAngle, r.twistMinAngle, r.twistMaxAngle, c) !== 0;
	}
	if (r === G) {
		const r = X(e, n, s.anchor, o);
		return t._physics3d_addPointJoint(l, i, a, r.x, r.y, r.z, c) !== 0;
	}
	if (r === K) {
		const r = s;
		const u = X(e, n, r.anchor, o);
		const d = Z(e, n, r.axis);
		return t._physics3d_addHingeJoint(l, i, a, u.x, u.y, u.z, d.x, d.y, d.z, r.enableLimit ? 1 : 0, r.lowerAngle, r.upperAngle, r.enableMotor ? 1 : 0, r.motorSpeed, r.maxMotorTorque, c) !== 0;
	}
	if (r === q) {
		const r = s;
		const u = X(e, n, r.anchor, o);
		const d = Z(e, n, r.axis);
		return t._physics3d_addSliderJoint(l, i, a, u.x, u.y, u.z, d.x, d.y, d.z, r.enableLimit ? 1 : 0, r.lowerTranslation / o, r.upperTranslation / o, r.enableMotor ? 1 : 0, r.motorSpeed / o, r.maxMotorForce, c) !== 0;
	}
	if (r === J) {
		const r = s;
		const u = X(e, n, r.anchor, o);
		const d = X(e, r.connectedEntity, r.connectedAnchor, o);
		return t._physics3d_addDistanceJoint(l, i, a, u.x, u.y, u.z, d.x, d.y, d.z, r.minLength / o, r.maxLength / o, r.frequency, r.damping, c) !== 0;
	}
	return t._physics3d_addFixedJoint(l, i, a, c) !== 0;
}
/**
* Bring the world's joints in line with the ECS.
*
* Called BEFORE bodies are removed, and that order is load-bearing: the module
* holds each constraint against two bodies, so a body taken out from under a live
* joint leaves the solver holding nothing.
*
* @param doomed Entities whose bodies are about to go, so their joints go first.
*/
function Re(e, t, n, r, i, a) {
	for (const [i, o] of r) {
		const s = e.world.valid(i) ? Fe(e, i) : null;
		const c = s ? s.data.connectedEntity : -1;
		const l = s && (s.def === k || s.def === A) ? s.data : null;
		if ((!l || !j(l) && se(l) === o.settings) && s !== null && s.data.enabled !== false && s.def._name === o.type && !a.has(i) && !a.has(c) && n.get(i) === o.bodyA && n.get(c) === o.bodyB) continue;
		t._physics3d_removeJoint(i, o.bodyA, o.bodyB);
		r.delete(i);
	}
	for (const a of Y) for (const o of e.world.queryEntities([a])) {
		if (r.has(o)) continue;
		const a = Fe(e, o);
		if (!a || a.data.enabled === false) continue;
		const s = n.get(o);
		const c = n.get(a.data.connectedEntity);
		if (s === void 0 || c === void 0 || s === c) continue;
		if (Le(e, t, o, a.def, s, c, i)) {
			const t = ze(e, o, a.def, i);
			r.set(o, {
				bodyA: s,
				bodyB: c,
				type: a.def._name,
				motorOn: t.on,
				motorSpeed: t.speed,
				settings: a.def === k || a.def === A ? se(a.data) : void 0
			});
		}
	}
	Be(e, t, r, i);
}
/** The motor a driven joint is asking for right now, in the module's units. */
function ze(e, t, n, r) {
	if (n === K) {
		const n = e.world.get(t, K);
		return {
			on: n.enableMotor === true,
			speed: n.motorSpeed
		};
	}
	if (n === q) {
		const n = e.world.get(t, q);
		return {
			on: n.enableMotor === true,
			speed: n.motorSpeed / r
		};
	}
	return {
		on: false,
		speed: 0
	};
}
/**
* Carry gameplay's motor changes into the world, and the joint's own state back.
* A joint is built once, so without this `motorSpeed` would be a field nothing
* reads after the first frame — and no game could ask how far the door swung.
*/
function Be(e, t, n, r) {
	for (const [i, a] of n) if (a.type === k._name || a.type === A._name) {
		const n = a.type === k._name ? k : A;
		const o = e.world.get(i, n);
		if (j(o)) continue;
		const s = o.angularVelocity;
		const c = "linearVelocity" in o ? o.linearVelocity : {
			x: 0,
			y: 0,
			z: 0
		};
		const l = "maxMotorForce" in o ? o.maxMotorForce : 0;
		const u = [
			o.enableMotor ? 1 : 0,
			c.x / r,
			c.y / r,
			c.z / r,
			s.x,
			s.y,
			s.z,
			l,
			o.maxMotorTorque
		];
		const d = u.join(",");
		if (d !== a.motorSettings) {
			t._physics3d_setAdvancedJointMotor(i, ...u);
			a.motorSettings = d;
		}
	} else if (a.type === K._name) {
		const n = e.world.get(i, K);
		const r = n.enableMotor === true;
		if (r !== a.motorOn || n.motorSpeed !== a.motorSpeed) {
			t._physics3d_setJointMotor(i, r ? 1 : 0, n.motorSpeed);
			a.motorOn = r;
			a.motorSpeed = n.motorSpeed;
		}
		n.angle = t._physics3d_jointValue(i);
		e.world.set(i, K, n);
	} else if (a.type === q._name) {
		const n = e.world.get(i, q);
		const o = n.enableMotor === true;
		const s = n.motorSpeed / r;
		if (o !== a.motorOn || s !== a.motorSpeed) {
			t._physics3d_setJointMotor(i, o ? 1 : 0, s);
			a.motorOn = o;
			a.motorSpeed = s;
		}
		n.translation = t._physics3d_jointValue(i) * r;
		e.world.set(i, q, n);
	}
}
//#endregion
//#region src/physics3d/Physics3DSystem.ts
/** Body kinds, in the order the module reads them. */
const Q = {
	Static: 0,
	Kinematic: 1,
	Dynamic: 2
};
const Ve = {
	gravity: {
		x: 0,
		y: -9.81,
		z: 0
	},
	fixedTimestep: 1 / 60,
	collisionSteps: 1,
	pixelsPerUnit: 100,
	maxBodies: 1024,
	velocityIterations: 0,
	positionIterations: 0,
	enableSleep: true,
	bounceThreshold: 0
};
const He = /* @__PURE__ */ new WeakMap();
/** Ground states, as CharacterVirtual reports them. */
const Ue = 0;
/**
* Sweep every character, then write where each ended up.
*
* Characters are moved BEFORE the solver steps: a character reads the world as it
* stands and the bodies then react to where it went, which is the order that keeps
* a character from being pushed by the very body it just displaced.
*/
function We(e, t, n, r) {
	const i = r.pixelsPerUnit;
	const o = /* @__PURE__ */ new Set();
	for (const s of e.world.queryEntities([C])) {
		const c = e.world.get(s, C);
		if (!c.enabled) continue;
		o.add(s);
		let l = n.get(s);
		if (l === void 0) {
			const r = e.world.get(s, a)?.worldPosition ?? {
				x: 0,
				y: 0,
				z: 0
			};
			l = t._physics3d_addCharacter(s, c.radius / i, c.halfHeight / i, r.x / i, r.y / i, r.z / i, c.maxSlope, c.mass, c.layer, c.pushForce);
			if (l === 0) continue;
			n.set(s, l);
		}
		t._physics3d_moveCharacter(l, c.velocity.x / i, c.velocity.y / i, c.velocity.z / i, r.fixedTimestep, c.stepHeight / i, c.snapDown / i);
		if (t._physics3d_queryResultBytes() === 0) continue;
		const u = t._physics3d_queryResult() >> 2;
		const d = t.HEAPF32;
		c.isOnFloor = d[u + 3] === Ue;
		c.floorNormal.x = d[u + 4];
		c.floorNormal.y = d[u + 5];
		c.floorNormal.z = d[u + 6];
		c.realVelocity.x = d[u + 7] * i;
		c.realVelocity.y = d[u + 8] * i;
		c.realVelocity.z = d[u + 9] * i;
		e.world.set(s, C, c);
		if (!e.world.has(s, a)) continue;
		const f = e.world.get(s, a);
		const p = Ge(e, s, {
			x: d[u] * i,
			y: d[u + 1] * i,
			z: d[u + 2] * i
		});
		f.position.x = p.position.x;
		f.position.y = p.position.y;
		f.position.z = p.position.z;
		e.world.set(s, a, f);
	}
	for (const [r, i] of n) {
		if (o.has(r) && e.world.valid(r)) continue;
		t._physics3d_removeCharacter(i);
		n.delete(r);
	}
}
/**
* @brief The local pose that composes to `world` under this entity's parent
* @details A body goes to the solver at its composed WORLD pose, so what comes
*          back is one too, and under a parent that transform has to come back
*          out or composing adds it twice. Non-uniform parent scale keeps the
*          translation exact; the rotation carries the skew the docs name.
*/
function Ge(e, n, r, i) {
	const o = (e.world.has(n, t) ? e.world.get(n, t) : null)?.entity;
	if (o === void 0 || !e.world.valid(o) || !e.world.has(o, a)) return {
		position: r,
		rotation: i
	};
	const s = e.world.get(o, a);
	const c = m.conjugate(s.worldRotation);
	const l = m.rotate(c, D.sub(r, s.worldPosition));
	const u = s.worldScale;
	return {
		position: {
			x: u.x !== 0 ? l.x / u.x : l.x,
			y: u.y !== 0 ? l.y / u.y : l.y,
			z: u.z !== 0 ? l.z / u.z : l.z
		},
		rotation: i ? m.mul(c, i) : void 0
	};
}
function Ke(e) {
	return e.bodyType === 0 ? Q.Static : e.bodyType === 1 ? Q.Kinematic : Q.Dynamic;
}
/** Where a collider sits from the entity's origin, in metres. Absent means at the origin. */
function $(e, t) {
	return e ? [
		e.x / t,
		e.y / t,
		e.z / t
	] : [
		0,
		0,
		0
	];
}
/**
* Create the body an entity's collider describes.
* @returns the module's body id, or 0 when the entity carries no 3D collider.
*/
function qe(e, t, n, r, i) {
	const o = e.world.get(n, a);
	const s = o?.worldPosition ?? {
		x: 0,
		y: 0,
		z: 0
	};
	const c = o?.worldRotation ?? {
		x: 0,
		y: 0,
		z: 0,
		w: 1
	};
	const l = s.x / i, u = s.y / i, d = s.z / i;
	const f = [
		Ke(r),
		r.gravityScale,
		r.linearDamping,
		r.angularDamping,
		r.fixedRotation ? 1 : 0,
		r.layer,
		r.continuousCollision ? 1 : 0
	];
	const p = (t) => e.world.has(n, t);
	if (p(R)) {
		const r = e.world.get(n, R);
		if (r.enabled && r.parts.length) {
			if (!t._physics3d_addCompound) throw Error("CompoundCollider3D requires a rebuilt 3D physics module");
			const e = Ee(r.parts, o?.worldScale ?? {
				x: 1,
				y: 1,
				z: 1
			}, i);
			const a = t._malloc(e.byteLength);
			try {
				t.HEAPF32.set(e, a >> 2);
				return t._physics3d_addCompound(n, a, r.parts.length, l, u, d, c.x, c.y, c.z, c.w, ...f, r.friction, r.restitution, r.isSensor ? 1 : 0, r.mass);
			} finally {
				t._free(a);
			}
		}
	}
	const m = p(T) ? e.world.get(n, T) : void 0;
	if (m?.enabled) return t._physics3d_addBox(n, m.halfExtents.x / i, m.halfExtents.y / i, m.halfExtents.z / i, l, u, d, c.x, c.y, c.z, c.w, ...f, m.friction, m.restitution, m.isSensor ? 1 : 0, ...$(m.center, i));
	const h = p(w) ? e.world.get(n, w) : void 0;
	if (h?.enabled) return t._physics3d_addSphere(n, h.radius / i, l, u, d, c.x, c.y, c.z, c.w, ...f, h.friction, h.restitution, h.isSensor ? 1 : 0, ...$(h.center, i));
	const g = p(v) ? e.world.get(n, v) : void 0;
	if (g?.enabled && g.mesh !== 0) return Je(t, n, g, l, u, d, c, i, r.layer, o?.worldScale);
	const _ = p(b) ? e.world.get(n, b) : void 0;
	if (_?.enabled && _.mesh !== 0) return $e(t, n, _, l, u, d, c, i, f, o?.worldScale);
	const y = p(x) ? e.world.get(n, x) : void 0;
	if (y?.enabled) return t._physics3d_addCapsule(n, y.radius / i, y.halfHeight / i, l, u, d, c.x, c.y, c.z, c.w, ...f, y.friction, y.restitution, y.isSensor ? 1 : 0, ...$(y.center, i));
	return 0;
}
/**
* Hand a loaded mesh's triangles to the module, scaled into metres.
*
* They cross through the module's own heap: the positions have to be scaled
* anyway, so a copy is made either way and this is the one the module can read.
*/
function Je(e, t, n, r, i, a, o, s, c, l) {
	const u = E(n.mesh);
	if (!u) return 0;
	return Ye(e, t, u.positions, u.indices, r, i, a, o, s, c, n.friction, n.restitution, l);
}
/** Triangles in world units, scaled into metres on the module's heap, as one static body at (px, py, pz) in metres. */
function Ye(e, t, n, r, i, a, o, s, c, l, u, d, f) {
	const p = e._malloc(n.length * 4);
	const m = e._malloc(r.length * 4);
	try {
		const h = e.HEAPF32;
		for (let e = 0; e < n.length; e++) h[(p >> 2) + e] = n[e] * (f ? e % 3 === 0 ? f.x : e % 3 === 1 ? f.y : f.z : 1) / c;
		e.HEAPU32.set(r, m >> 2);
		if (f && f.x * f.y * f.z < 0) for (let t = 0; t < r.length; t += 3) {
			e.HEAPU32[(m >> 2) + t + 1] = r[t + 2];
			e.HEAPU32[(m >> 2) + t + 2] = r[t + 1];
		}
		return e._physics3d_addMeshBody(t, p, n.length / 3, m, r.length, i, a, o, s.x, s.y, s.z, s.w, l, u, d);
	} finally {
		e._free(p);
		e._free(m);
	}
}
/** How far past a changed piece a resting body may stand and still have been resting on it, in world units. */
const Xe = 4;
/**
* Wakes what may have rested on a piece that has just changed or gone. A solver does not look again at what sleeps, so a body whose ground was
* dug out from under it would stay in the air. A force too small to matter is what both solvers wake a body for.
*/
function Ze(e, t, n, r, i) {
	if (!t._physics3d_addForce || n.size === 0) return;
	const [o, s, c] = r.origin, l = r.positions;
	let u = Infinity, d = Infinity, f = Infinity, p = -Infinity, m = -Infinity, h = -Infinity;
	for (let e = 0; e < l.length; e += 3) {
		u = Math.min(u, l[e]);
		d = Math.min(d, l[e + 1]);
		f = Math.min(f, l[e + 2]);
		p = Math.max(p, l[e]);
		m = Math.max(m, l[e + 1]);
		h = Math.max(h, l[e + 2]);
	}
	const g = Xe;
	for (const [r, l] of n) {
		if (!e.world.valid(r) || !e.world.has(r, S) || !e.world.has(r, a)) continue;
		if (e.world.get(r, S).bodyType !== Q.Dynamic) continue;
		const n = e.world.get(r, a).worldPosition;
		const _ = n.x - o, v = n.y - s, y = n.z - c;
		if (_ < u - g || _ > p + g || v < d - g || v > m + g || y < f - g || y > h + g) continue;
		t._physics3d_addForce(l, 0, -1e-6, 0, n.x / i, n.y / i, n.z / i);
	}
}
/** Follows the app's collision geometry: a static mesh body a piece, built again when its piece is replaced, removed with it. */
function Qe(e, t, n, r, i, a) {
	if (!n && r.size === 0) return;
	const o = /* @__PURE__ */ new Set();
	if (n) for (const [s, c] of n.entries()) {
		o.add(s);
		const n = r.get(s);
		if (n?.piece === c) continue;
		if (n) {
			t._physics3d_removeBody(n.id);
			Ze(e, t, i, n.piece, a);
		}
		const [l, u, d] = c.origin;
		const f = Ye(t, c.owner, c.positions, c.indices, l / a, u / a, d / a, {
			x: 0,
			y: 0,
			z: 0,
			w: 1
		}, a, c.layer, c.friction, c.restitution);
		if (f !== 0) r.set(s, {
			piece: c,
			id: f
		});
		else r.delete(s);
	}
	for (const [n, s] of r) {
		if (o.has(n)) continue;
		t._physics3d_removeBody(s.id);
		Ze(e, t, i, s.piece, a);
		r.delete(n);
	}
}
/**
* Hand a mesh's vertices over as a convex hull.
*
* Only the positions cross: Jolt builds the hull itself, so the triangles that
* a mesh collider needs would be a copy nothing reads.
*/
function $e(e, t, n, r, i, a, o, s, c, l) {
	const u = E(n.mesh);
	if (!u) return 0;
	const { positions: d } = u;
	const f = e._malloc(d.length * 4);
	try {
		const u = e.HEAPF32;
		for (let e = 0; e < d.length; e++) u[(f >> 2) + e] = d[e] * (l ? e % 3 === 0 ? l.x : e % 3 === 1 ? l.y : l.z : 1) / s;
		return e._physics3d_addConvexBody(t, f, d.length / 3, r, i, a, o.x, o.y, o.z, o.w, ...c, n.friction, n.restitution, n.isSensor ? 1 : 0);
	} finally {
		e._free(f);
	}
}
/** The colliders that make a static body on their own, with no RigidBody3D. */
const et = [
	v,
	T,
	w,
	x,
	b,
	R
];
/** Per body map: which of its bodies are static for having no RigidBody3D. */
const tt = /* @__PURE__ */ new WeakMap();
const nt = {
	bodyType: 0,
	layer: 0,
	gravityScale: 0,
	linearDamping: 0,
	angularDamping: 0,
	fixedRotation: false,
	continuousCollision: false,
	enabled: true
};
/** Bring the world's population in line with the ECS, then step and read back. */
function rt(e, t, n, r, i = /* @__PURE__ */ new Map(), o, s = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Map(), l = null) {
	const u = r.pixelsPerUnit;
	e.world.ensureTransformsComposed();
	We(e, t, i, r);
	const d = He.get(n) ?? /* @__PURE__ */ new Map();
	He.set(n, d);
	e.world.ensureTransformsComposed();
	const f = /* @__PURE__ */ new Set();
	const p = [];
	for (const t of e.world.queryEntities([S])) p.push([t, e.world.get(t, S)]);
	for (const t of et) for (const n of e.world.queryEntities([t])) {
		if (!L(e.world, n)) continue;
		const r = e.world.get(n, t).layer ?? 0;
		p.push([n, {
			...nt,
			layer: r
		}]);
	}
	const m = tt.get(n) ?? /* @__PURE__ */ new Set();
	tt.set(n, m);
	for (const [r, i] of p) {
		if (!i.enabled || f.has(r)) continue;
		f.add(r);
		const o = !e.world.has(r, S);
		if (n.has(r) && o !== m.has(r)) {
			t._physics3d_removeBody(n.get(r));
			n.delete(r);
			d.delete(r);
		}
		if (o) m.add(r);
		else m.delete(r);
		const s = !n.has(r);
		if (s) {
			const a = qe(e, t, r, i, u);
			if (a !== 0) n.set(r, a);
		}
		if (i.bodyType !== Q.Dynamic && n.has(r) && e.world.has(r, a)) {
			const i = e.world.get(r, a), o = i.worldPosition, c = i.worldRotation;
			const l = [
				o.x / u,
				o.y / u,
				o.z / u,
				c.x,
				c.y,
				c.z,
				c.w
			];
			const f = d.get(r);
			if (!s && (!f || l.some((e, t) => e !== f[t]))) t._physics3d_setTransform(n.get(r), ...l);
			d.set(r, l);
		}
	}
	const h = /* @__PURE__ */ new Set();
	for (const t of n.keys()) if (!f.has(t) || !e.world.valid(t)) h.add(t);
	Re(e, t, n, s, u, h);
	for (const e of h) {
		t._physics3d_removeBody(n.get(e));
		n.delete(e);
		d.delete(e);
	}
	Qe(e, t, l, c, n, u);
	e.world.ensureTransformsComposed();
	t._physics3d_step(r.fixedTimestep, r.collisionSteps);
	if (o) we(t, o, u);
	const g = t._physics3d_transformsBytes();
	if (g === 0) return;
	const _ = t._physics3d_transforms() >> 2;
	const v = t.HEAPF32;
	const y = g / 4 / 8;
	for (let t = 0; t < y; t++) {
		const n = _ + t * 8;
		const r = v[n];
		if (!e.world.valid(r) || !e.world.has(r, a)) continue;
		const i = e.world.get(r, a);
		const o = Ge(e, r, {
			x: v[n + 1] * u,
			y: v[n + 2] * u,
			z: v[n + 3] * u
		}, {
			x: v[n + 4],
			y: v[n + 5],
			z: v[n + 6],
			w: v[n + 7]
		});
		if (i.position.x === Math.fround(o.position.x) && i.position.y === Math.fround(o.position.y) && i.position.z === Math.fround(o.position.z) && i.rotation.x === Math.fround(o.rotation.x) && i.rotation.y === Math.fround(o.rotation.y) && i.rotation.z === Math.fround(o.rotation.z) && i.rotation.w === Math.fround(o.rotation.w)) continue;
		i.position.x = o.position.x;
		i.position.y = o.position.y;
		i.position.z = o.position.z;
		i.rotation.x = o.rotation.x;
		i.rotation.y = o.rotation.y;
		i.rotation.z = o.rotation.z;
		i.rotation.w = o.rotation.w;
		e.world.set(r, a, i);
	}
}
//#endregion
//#region src/physics3d/Physics3DQueries.ts
/**
* The 3D world's spatial queries.
*
* A layer mask of 0 means every layer: a caller that did not ask to filter is
* asking for everything, and answering "nothing" there would be a silent empty
* result for the commonest call.
*/
var it = class {
	constructor(e, t, n = /* @__PURE__ */ new Map()) {
		this.module_ = e;
		this.ppu_ = t;
		this.characters_ = n;
	}
	/**
	* Put a character somewhere, rather than moving it there. Its position is an
	* OUTPUT — the step writes it into `Transform` every frame — so this is the
	* only way to say it, and the velocity is dropped with the move.
	*
	* Answers false for an entity the world has no character for.
	*/
	teleportCharacter(e, t) {
		const n = this.characters_.get(e);
		if (n === void 0) return false;
		const r = this.ppu_;
		this.module_._physics3d_setCharacterPosition(n, t.x / r, t.y / r, t.z / r);
		return true;
	}
	/**
	* The nearest body along a ray, or null. `direction` carries its length.
	*
	* Characters (CharacterController3D) are passed through unless `options.characters` asks for them: line of sight and
	* a camera's boom ask about the world, a shot asks about who is in the way. A ray that starts inside a character
	* meets it at once, so a shooter leaves its own out by its layer.
	*/
	raycast(e, t, n = 0, r) {
		const i = this.ppu_;
		const a = [
			e.x / i,
			e.y / i,
			e.z / i,
			t.x / i,
			t.y / i,
			t.z / i,
			n
		];
		return (r?.characters ? this.module_._physics3d_raycastWith(...a, 1) : this.module_._physics3d_raycast(...a)) ? this.readCast_() : null;
	}
	/**
	* Sweeps a sphere along `direction` and returns the first body it meets.
	*
	* What a ray cannot answer: a ray is infinitely thin, so it passes through
	* the very gaps a moving body would not fit — "can this thing get there" is
	* a different question from "is anything on this line".
	*/
	sphereCast(e, t, n, r = 0) {
		const i = this.ppu_;
		return this.module_._physics3d_sphereCast(e.x / i, e.y / i, e.z / i, t / i, n.x / i, n.y / i, n.z / i, r) ? this.readCast_() : null;
	}
	/** Every body overlapping a sphere — what a spawn point asks before it spawns. */
	overlapSphere(e, t, n = 0) {
		const r = this.ppu_;
		const i = this.module_._physics3d_overlapSphere(e.x / r, e.y / r, e.z / r, t / r, n);
		return this.readOverlaps_(i);
	}
	/** The same for a box, given its half-extents. */
	overlapBox(e, t, n = 0) {
		const r = this.ppu_;
		const i = this.module_._physics3d_overlapBox(e.x / r, e.y / r, e.z / r, t.x / r, t.y / r, t.z / r, n);
		return this.readOverlaps_(i);
	}
	readCast_() {
		const e = this.module_.HEAPF32;
		const t = this.module_._physics3d_queryResult() >> 2;
		const n = this.ppu_;
		return {
			entity: e[t],
			fraction: e[t + 1],
			x: e[t + 2] * n,
			y: e[t + 3] * n,
			z: e[t + 4] * n,
			normalX: e[t + 5],
			normalY: e[t + 6],
			normalZ: e[t + 7]
		};
	}
	readOverlaps_(e) {
		if (e <= 0) return [];
		const t = this.module_.HEAPF32;
		const n = this.module_._physics3d_queryResult() >> 2;
		const r = this.ppu_;
		const i = [];
		for (let a = 0; a < e; a++) {
			const e = n + a * 4;
			i.push({
				entity: t[e],
				x: t[e + 1] * r,
				y: t[e + 2] * r,
				z: t[e + 3] * r
			});
		}
		return i;
	}
};
//#endregion
//#region src/physics3d/Physics3DDebugDraw.ts
/** Off until a game turns it on: a debug overlay costs a line per edge per frame. */
const at = l({
	enabled: false,
	showColliders: true,
	showContacts: false
}, "Physics3DDebugDraw");
const ot = {
	r: .2,
	g: .4,
	b: 1,
	a: .8
};
const st = {
	r: .2,
	g: 1,
	b: .2,
	a: .8
};
const ct = {
	r: .2,
	g: 1,
	b: 1,
	a: .8
};
const lt = {
	r: 1,
	g: 1,
	b: .2,
	a: .6
};
const ut = {
	r: 1,
	g: .6,
	b: .1,
	a: .9
};
const dt = {
	r: 1,
	g: .2,
	b: .2,
	a: 1
};
/** World units. The 3D world is authored at 100 units to the metre, so this is
*  about a centimetre — thin enough not to hide the shape it outlines. */
const ft = 2;
const pt = 8;
function mt(e) {
	switch (e) {
		case 0: return ot;
		case 1: return ct;
		default: return st;
	}
}
function ht(e, t) {
	const n = e.getResource(at);
	if (!n || !n.enabled) return;
	if (n.showColliders) {
		const t = e.world;
		for (const n of e.world.getEntitiesWithComponents([a])) {
			const r = ke(t, n);
			if (r.length === 0) continue;
			const i = e.world.get(n, a);
			const o = e.world.has(n, S) ? e.world.get(n, S) : null;
			for (const e of r) {
				if (!e.active) continue;
				const t = e.component === "CharacterController3D" ? ut : e.isSensor ? lt : mt(o?.bodyType ?? 2);
				const n = W(U(e.shape), i.worldPosition, i.worldRotation);
				for (const e of n) for (let n = 0; n + 1 < e.length; n++) g.line3D(e[n], e[n + 1], t, ft);
			}
		}
	}
	if (n.showContacts && t) for (const e of t) {
		const t = {
			x: e.pointX,
			y: e.pointY,
			z: e.pointZ
		};
		for (const e of [
			{
				x: pt,
				y: 0,
				z: 0
			},
			{
				x: 0,
				y: pt,
				z: 0
			},
			{
				x: 0,
				y: 0,
				z: pt
			}
		]) g.line3D({
			x: t.x - e.x,
			y: t.y - e.y,
			z: t.z - e.z
		}, {
			x: t.x + e.x,
			y: t.y + e.y,
			z: t.z + e.z
		}, dt, ft);
	}
}
/** Installed by the 3D physics plugin; the resource decides whether it draws. */
function gt(e, t) {
	e.insertResource(at, {
		enabled: false,
		showColliders: true,
		showContacts: false
	});
	h("physics3d-debug-draw", () => {
		ht(e, t());
	});
}
//#endregion
//#region src/physics3d/Physics3DPlugin.ts
/**
* @file    Physics3DPlugin.ts
* @brief   Loads the 3D physics module and drives one world from the ECS.
*/
/** Ask the 3D world what is where. Present once the module has loaded. */
const _t = l(null, "Physics3D");
var vt = class {
	constructor(e, t = {}, n) {
		this.name = "physics3d";
		this.module_ = null;
		this.wasmUrl_ = e;
		this.factory_ = n;
		this.config_ = {
			...Ve,
			...t
		};
	}
	build(e) {
		const t = {
			module: null,
			initPromise: null,
			bodies: /* @__PURE__ */ new Map(),
			characters: /* @__PURE__ */ new Map(),
			joints: /* @__PURE__ */ new Map(),
			pieces: /* @__PURE__ */ new Map(),
			config: this.config_
		};
		const r = {
			contactEnters: [],
			contactExits: [],
			sensorEnters: [],
			sensorExits: []
		};
		e.insertResource(Ce, r);
		e.insertResource(y, t);
		ne(e);
		ve(e);
		e.subsystems?.transition?.("physics3d", "initializing");
		const i = Se(this.wasmUrl_, this.factory_).then((i) => {
			this.module_ = i;
			const { gravity: a, maxBodies: o } = this.config_;
			i._physics3d_init(a.x, a.y, a.z, o);
			const s = this.config_;
			i._physics3d_setSolver(s.velocityIterations, s.positionIterations, s.enableSleep ? 1 : 0, s.bounceThreshold);
			this.config_.layerMasks?.forEach((e, t) => {
				i._physics3d_setLayerMask(t, e);
			});
			t.module = i;
			const c = new it(i, this.config_.pixelsPerUnit, t.characters);
			e.insertResource(_t, c);
			if (e.hasResource(p)) e.getResource(p).setGroundProbe((e, t, n) => {
				const r = c.raycast(e, {
					x: 0,
					y: -t,
					z: 0
				}, n);
				return r ? {
					y: r.y,
					normal: {
						x: r.normalX,
						y: r.normalY,
						z: r.normalZ
					}
				} : null;
			});
			e.addSystemToSchedule(11, n([], () => {
				rt(e, i, t.bodies, this.config_, t.characters, r, t.joints, t.pieces, e.hasResource(ee) ? e.getResource(ee) : null);
			}, { name: "Physics3DStepSystem" }), { profileDomain: "physics3d" });
			gt(e, () => r.contactEnters);
			e.setFixedTimestep?.(this.config_.fixedTimestep);
			e.subsystems?.transition?.("physics3d", "ready");
		});
		i.catch((t) => {
			e.subsystems?.markError?.("physics3d", t instanceof Error ? t.message : String(t));
		});
		t.initPromise = i;
	}
	/** Tear the world down, so a re-init does not inherit the last one's bodies. */
	cleanup() {
		this.module_?._physics3d_shutdown();
		this.module_ = null;
	}
};
function yt(e, t = {}, n) {
	return new vt(e, t, n);
}
//#endregion
export { P as A, j as B, L as C, we as D, xe as E, fe as F, _e as I, O as L, F as M, M as N, Se as O, I as P, A as R, R as S, Ce as T, D as V, Me as _, ht as a, ke as b, Ve as c, Pe as d, K as f, De as g, Ie as h, at as i, N as j, le as k, rt as l, q as m, vt as n, gt as o, G as p, yt as r, it as s, _t as t, J as u, U as v, ye as w, B as x, W as y, k as z };

//# sourceMappingURL=Physics3DPlugin.js.map