import { $t as e, Et as t, c as n, n as r, qt as i } from "./system.js";
import { s as a } from "./env.js";
//#region src/rig2d/solve2d.ts
const o = (e) => Math.atan2(Math.sin(e), Math.cos(e));
/** A rotation within a joint's limits, measured the short way round from the middle of them so a limit can cross ±180°. @experimental */
function s(e, t, n) {
	if (t === void 0 || n === void 0) return e;
	const r = (t + n) / 2, i = (n - t) / 2, a = o(e - r);
	return r + Math.max(-i, Math.min(i, a));
}
/** Where the chain's tip ends up, in the space the first bone's `x, y` are in. @experimental */
function c(e, t) {
	let n = 0, r = 0, i = 0;
	e.forEach((a, o) => {
		const s = Math.cos(i), c = Math.sin(i);
		n += s * a.x - c * a.y;
		r += c * a.x + s * a.y;
		i += a.rotation;
		if (o === e.length - 1) {
			n += Math.cos(i) * t;
			r += Math.sin(i) * t;
		}
	});
	return {
		x: n,
		y: r
	};
}
function l(e, t, n, r) {
	const i = e[0], a = e[1];
	const c = Math.hypot(a.x, a.y), l = r.tipLength;
	const u = Math.atan2(a.y, a.x);
	const d = t - i.x, f = n - i.y;
	const p = Math.hypot(d, f);
	if (p === 0) return;
	const m = Math.max(Math.abs(c - l), Math.min(c + l, p));
	const h = r.bend ?? (o(a.rotation - u) >= 0 ? 1 : -1);
	const g = Math.max(-1, Math.min(1, (m * m - c * c - l * l) / (2 * c * l)));
	const _ = Math.acos(g) * h;
	i.rotation = s(Math.atan2(f, d) - Math.atan2(l * Math.sin(_), c + l * Math.cos(_)) - u, i.min, i.max);
	a.rotation = s(_ + u, a.min, a.max);
}
function u(e, t, n, r) {
	const i = r.iterations ?? 12, a = r.tolerance ?? .01;
	for (let l = 0; l < i; l++) {
		for (let i = e.length - 1; i >= 0; i--) {
			let a = 0, l = 0, u = 0;
			for (let t = 0; t <= i; t++) {
				const n = Math.cos(u), r = Math.sin(u);
				a += n * e[t].x - r * e[t].y;
				l += r * e[t].x + n * e[t].y;
				if (t < i) u += e[t].rotation;
			}
			const d = c(e, r.tipLength);
			const f = o(Math.atan2(n - l, t - a) - Math.atan2(d.y - l, d.x - a));
			e[i].rotation = s(e[i].rotation + f, e[i].min, e[i].max);
		}
		const i = c(e, r.tipLength);
		if (Math.hypot(i.x - t, i.y - n) <= a) return;
	}
}
/**
* Turns the chain's bones in place so its tip reaches `target`, in the space the first bone's `x, y` are in. A point out of reach
* leaves the chain stretched towards it.
* @experimental
*/
function d(e, t, n, r) {
	if (e.length === 0) return;
	if (e.length === 1) {
		const r = e[0];
		r.rotation = s(Math.atan2(n - r.y, t - r.x), r.min, r.max);
	} else if (e.length === 2 && r.tipLength > 0 && (e[1].x !== 0 || e[1].y !== 0)) {
		l(e, t, n, r);
		if (e.some((e) => e.min !== void 0)) u(e, t, n, r);
	} else u(e, t, n, r);
}
//#endregion
//#region src/rig2d/rig2dPlugin.ts
const f = Math.PI / 180;
/** @experimental */
const p = e("Bone2D", { length: 0 }, { fields: { length: {
	min: 0,
	tooltip: "How far the bone reaches along its +x. An IK chain ending here reaches for the target with this end."
} } });
/** @experimental */
const m = e("IK2D", {
	target: 0,
	chainLength: 2,
	bend: 1,
	weight: 1,
	matchTargetRotation: false,
	enabled: true
}, {
	entityFields: ["target"],
	animatableFields: ["weight"],
	fields: {
		target: { tooltip: "The entity the end of this bone reaches for." },
		chainLength: {
			min: 1,
			max: 32,
			step: 1,
			tooltip: "How many bones bend, counting this one. Two bones solve exactly and keep their bend; more take an iterative solve."
		},
		bend: {
			min: -1,
			max: 1,
			step: 2,
			tooltip: "Two bones: the way the middle joint bends, 1 counter-clockwise or -1."
		},
		weight: {
			min: 0,
			max: 1,
			step: .01,
			tooltip: "How far from the animated pose towards the solve."
		},
		matchTargetRotation: { tooltip: "Also turn this bone to the target's rotation." }
	}
});
/** What a {@link BoneConstraint2D} does. @experimental */
const h = {
	/** Keep the bone's local rotation between `min` and `max`. An IK chain through this bone keeps to them too. */
	LimitRotation: 0,
	/** Take `source`'s world rotation, plus `offset`. */
	CopyRotation: 1,
	/** Stand on `source`'s world position. */
	CopyPosition: 2,
	/** Point +x at `source`, plus `offset`. */
	LookAt: 3
};
/** @experimental */
const g = e("BoneConstraint2D", {
	kind: h.LimitRotation,
	source: 0,
	min: -45,
	max: 45,
	offset: 0,
	weight: 1,
	enabled: true
}, {
	entityFields: ["source"],
	animatableFields: ["weight"],
	fields: {
		kind: { enum: [
			{
				label: "Limit Rotation",
				value: h.LimitRotation
			},
			{
				label: "Copy Rotation",
				value: h.CopyRotation
			},
			{
				label: "Copy Position",
				value: h.CopyPosition
			},
			{
				label: "Look At",
				value: h.LookAt
			}
		] },
		source: { tooltip: "The entity copied or looked at. Limit Rotation reads none." },
		min: {
			unit: "°",
			shownWhen: {
				field: "kind",
				values: [h.LimitRotation]
			}
		},
		max: {
			unit: "°",
			shownWhen: {
				field: "kind",
				values: [h.LimitRotation]
			}
		},
		offset: {
			unit: "°",
			shownWhen: {
				field: "kind",
				values: [h.CopyRotation, h.LookAt]
			}
		},
		weight: {
			min: 0,
			max: 1,
			step: .01
		}
	}
});
const _ = {
	x: 0,
	y: 0,
	angle: 0,
	sx: 1,
	sy: 1
};
const v = (e) => 2 * Math.atan2(e.z, e.w);
const y = (e, t) => e !== null && Math.abs(e - t) < 1e-5;
const b = (e) => Math.atan2(Math.sin(e), Math.cos(e));
/** One frame of solving. @internal */
var x = class {
	constructor(e) {
		this.world = e;
		this.bases_ = /* @__PURE__ */ new Map();
		this.places_ = /* @__PURE__ */ new Map();
		this.frame_ = 0;
	}
	forget(e) {
		this.bases_.delete(e);
	}
	parentOf_(e) {
		const n = this.world.tryGet(e, t);
		return n && this.world.valid(n.entity) && this.world.has(n.entity, i) ? n.entity : null;
	}
	placeOf_(e) {
		if (e === null) return _;
		const t = this.places_.get(e);
		if (t) return t;
		const n = this.placeOf_(this.parentOf_(e));
		const r = this.world.get(e, i);
		const a = Math.cos(n.angle), o = Math.sin(n.angle), s = r.position.x * n.sx, c = r.position.y * n.sy;
		const l = n.sx * n.sy < 0;
		const u = {
			x: n.x + a * s - o * c,
			y: n.y + o * s + a * c,
			angle: n.angle + (l ? -1 : 1) * v(r.rotation),
			sx: n.sx * r.scale.x,
			sy: n.sy * r.scale.y
		};
		this.places_.set(e, u);
		return u;
	}
	baseOf_(e) {
		const t = this.world.get(e, i), n = v(t.rotation);
		let r = this.bases_.get(e);
		if (!r) {
			r = {
				angle: n,
				wroteAngle: null,
				x: t.position.x,
				y: t.position.y,
				wroteX: null,
				wroteY: null,
				frame: this.frame_
			};
			this.bases_.set(e, r);
			return r;
		}
		if (r.frame !== this.frame_) {
			r.frame = this.frame_;
			if (!y(r.wroteAngle, n)) {
				r.angle = n;
				r.wroteAngle = null;
			}
			if (!y(r.wroteX, t.position.x) || !y(r.wroteY, t.position.y)) {
				r.x = t.position.x;
				r.y = t.position.y;
				r.wroteX = null;
				r.wroteY = null;
			}
		}
		return r;
	}
	writeAngle_(e, t, n) {
		t.wroteAngle = n;
		const r = n / 2;
		this.world.update(e, i, (e) => {
			e.rotation = {
				w: Math.cos(r),
				x: 0,
				y: 0,
				z: Math.sin(r)
			};
		});
		this.places_.clear();
	}
	toLocal_(e, t, n) {
		const r = Math.cos(e.angle), i = Math.sin(e.angle), a = t - e.x, o = n - e.y;
		return {
			x: (r * a + i * o) / (e.sx || 1),
			y: (-i * a + r * o) / (e.sy || 1)
		};
	}
	limitOf_(e) {
		const t = this.world.tryGet(e, g);
		if (!t || !t.enabled || t.kind !== h.LimitRotation) return {};
		return {
			min: t.min * f,
			max: t.max * f
		};
	}
	solveIK_(e) {
		const t = this.world.get(e, m);
		if (!t.enabled || !(t.weight > 0) || !this.world.valid(t.target) || !this.world.has(t.target, i)) return;
		const n = [e];
		for (let r = this.parentOf_(e); r !== null && n.length < t.chainLength; r = this.parentOf_(r)) n.unshift(r);
		const r = this.placeOf_(this.parentOf_(n[0]));
		const a = this.placeOf_(t.target);
		const o = this.toLocal_(r, a.x, a.y);
		const s = n.map((e) => {
			const t = this.world.get(e, i);
			return {
				x: t.position.x,
				y: t.position.y,
				rotation: this.baseOf_(e).angle,
				...this.limitOf_(e)
			};
		});
		const c = this.world.tryGet(e, p);
		d(s, o.x, o.y, {
			tipLength: c ? c.length : 0,
			bend: t.bend === 0 ? void 0 : t.bend
		});
		n.forEach((e, n) => {
			const r = this.baseOf_(e);
			this.writeAngle_(e, r, r.angle + b(s[n].rotation - r.angle) * Math.min(1, t.weight));
		});
		if (t.matchTargetRotation) {
			const n = this.placeOf_(this.parentOf_(e)), r = this.baseOf_(e);
			const o = n.sx * n.sy < 0 ? -1 : 1;
			const s = this.world.get(e, i);
			const c = v(s.rotation);
			this.writeAngle_(e, r, c + b(o * (a.angle - n.angle) - c) * Math.min(1, t.weight));
		}
	}
	applyConstraint_(e) {
		const t = this.world.get(e, g);
		if (!t.enabled || !(t.weight > 0)) return;
		const n = this.baseOf_(e), r = Math.min(1, t.weight);
		const a = v(this.world.get(e, i).rotation);
		if (t.kind === h.LimitRotation) {
			const i = s(a, t.min * f, t.max * f);
			if (i !== a) this.writeAngle_(e, n, a + (i - a) * r);
			return;
		}
		if (!this.world.valid(t.source) || !this.world.has(t.source, i)) return;
		const o = this.placeOf_(t.source), c = this.placeOf_(this.parentOf_(e));
		const l = c.sx * c.sy < 0 ? -1 : 1;
		if (t.kind === h.CopyPosition) {
			const t = this.toLocal_(c, o.x, o.y);
			const a = n.x + (t.x - n.x) * r, s = n.y + (t.y - n.y) * r;
			n.wroteX = a;
			n.wroteY = s;
			this.world.update(e, i, (e) => {
				e.position.x = a;
				e.position.y = s;
			});
			this.places_.clear();
			return;
		}
		const u = this.placeOf_(e);
		const d = l * ((t.kind === h.CopyRotation ? o.angle : Math.atan2(o.y - u.y, o.x - u.x)) + t.offset * f - c.angle);
		this.writeAngle_(e, n, a + b(d - a) * r);
	}
	depthOf_(e) {
		let t = 0;
		for (let n = this.parentOf_(e); n !== null; n = this.parentOf_(n)) t++;
		return t;
	}
	/** Chains first, from the trunk out, so a limb reaches from where its body now is; constraints have the last word, the same way. */
	step() {
		this.frame_++;
		this.places_.clear();
		const e = (e) => e.map((e) => [this.depthOf_(e), e]).sort((e, t) => e[0] - t[0] || e[1] - t[1]).map((e) => e[1]);
		for (const t of e(this.world.getEntitiesWithComponents([m, i]))) this.solveIK_(t);
		for (const t of e(this.world.getEntitiesWithComponents([g, i]))) this.applyConstraint_(t);
	}
};
/** Runs {@link IK2D} and {@link BoneConstraint2D} on a running game. @experimental */
var S = class {
	constructor() {
		this.name = "rig2d";
		this.activeWhen = [m, g];
	}
	build(e) {
		const t = new x(e.world);
		e.world.onDespawn((e) => t.forget(e));
		e.addSystemToSchedule(4, n([], () => t.step(), { name: "Rig2DSystem" }), {
			runAfter: ["PhysicsInterpolateSystem"],
			runIf: a
		});
	}
};
//#endregion
export { S as a, d as c, m as i, g as n, c as o, h as r, s, p as t };

//# sourceMappingURL=rig2dPlugin.js.map