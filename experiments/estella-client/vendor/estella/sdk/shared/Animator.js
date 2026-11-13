import { $t as e, Et as t, qt as n, rn as r } from "./system.js";
import { s as i } from "./resource.js";
import { o as a, r as o } from "./SpriteAnimator.js";
import { t as s } from "./quat.js";
//#region src/animation/pose.ts
const c = (e, t) => `${e} ${t._name}`;
/**
* Copy `src`'s values into `dst`, reusing whatever objects `dst` already holds.
* A pose OWNS its values: a builtin component's `get` hands back a projection
* the next reader may share, so two poses seeded from one entity would be the
* same object, and blending them would compare a value with itself.
*/
function l(e, t) {
	for (const n of Object.keys(t)) {
		const r = t[n];
		if (r !== null && typeof r === "object" && !Array.isArray(r)) {
			const t = e[n] ??= {};
			Object.assign(t, r);
		} else e[n] = r;
	}
}
/**
* One motion's evaluated result. Reused across frames: {@link reset} keeps the
* track objects and their buffers, so a steady animation allocates nothing
* after its first frame.
*/
var u = class {
	constructor() {
		this.slots_ = /* @__PURE__ */ new Map();
		this.live_ = [];
		this.stamp_ = 0;
	}
	/** Drop this frame's contents, keeping the buffers. */
	reset() {
		this.stamp_++;
		this.live_.length = 0;
	}
	get tracks() {
		return this.live_;
	}
	/**
	* The track for this component, seeded from the world the first time this
	* frame asks for it. The seed is what makes an untouched field survive: a
	* motion animating only position must not zero the rotation beside it.
	*/
	track(e, t, n) {
		const r = c(t, n);
		const i = this.slots_.get(r);
		if (i && i.stamp === this.stamp_) return i.track;
		if (!e.has(t, n)) return null;
		const a = i?.track ?? {
			entity: t,
			def: n,
			data: {},
			touched: /* @__PURE__ */ new Set()
		};
		l(a.data, e.get(t, n));
		a.touched.clear();
		if (i) i.stamp = this.stamp_;
		else this.slots_.set(r, {
			track: a,
			stamp: this.stamp_
		});
		this.live_.push(a);
		return a;
	}
	/** Write this pose's touched fields to the world. */
	applyTo(e) {
		for (const t of this.live_) if (t.touched.size > 0) e.set(t.entity, t.def, t.data);
	}
};
//#endregion
//#region src/animation/quatMix.ts
function d(e) {
	if (e === null || typeof e !== "object") return false;
	const t = e;
	return typeof t.w === "number" && typeof t.x === "number" && typeof t.y === "number" && typeof t.z === "number";
}
function f(e) {
	const t = Math.hypot(e.w, e.x, e.y, e.z);
	if (t < 1e-8) {
		e.w = 1;
		e.x = 0;
		e.y = 0;
		e.z = 0;
		return;
	}
	e.w /= t;
	e.x /= t;
	e.y /= t;
	e.z /= t;
}
/**
* The representative of the pair {q, -q}. Applied to a RESULT this is what makes
* a mix order-independent: aligning b to a or a to b differs only in overall
* sign, and collapsing that leaves one answer.
*/
function p(e) {
	if (e.w > 0) return;
	if (e.w < 0 || e.x < 0 || e.x === 0 && (e.y < 0 || e.y === 0 && e.z < 0)) {
		e.w = -e.w;
		e.x = -e.x;
		e.y = -e.y;
		e.z = -e.z;
	}
}
/** Accumulate `q * weight` into `acc`, against the hemisphere `ref` names. */
function m(e, t, n, r) {
	const i = t.w * n.w + t.x * n.x + t.y * n.y + t.z * n.z < 0 ? -r : r;
	e.w += n.w * i;
	e.x += n.x * i;
	e.y += n.y * i;
	e.z += n.z * i;
}
/** Move `dst` a `weight` share of the way to `src`, the short way round. */
function h(e, t, n) {
	const r = e.w * t.w + e.x * t.x + e.y * t.y + e.z * t.z < 0 ? -n : n;
	const i = 1 - n;
	e.w = e.w * i + t.w * r;
	e.x = e.x * i + t.x * r;
	e.y = e.y * i + t.y * r;
	e.z = e.z * i + t.z * r;
	f(e);
}
/** `to` relative to `from`, written into `out` — the turn one states over the other. */
function g(e, t, n) {
	e.w = n.w * t.w + n.x * t.x + n.y * t.y + n.z * t.z;
	e.x = n.x * t.w - n.w * t.x - n.y * t.z + n.z * t.y;
	e.y = n.y * t.w - n.w * t.y - n.z * t.x + n.x * t.z;
	e.z = n.z * t.w - n.w * t.z - n.x * t.y + n.y * t.x;
}
/** `dst = by * dst`, turning `dst` further by `by`. */
function _(e, t) {
	const n = t.w * e.w - t.x * e.x - t.y * e.y - t.z * e.z;
	const r = t.w * e.x + t.x * e.w + t.y * e.z - t.z * e.y;
	const i = t.w * e.y - t.x * e.z + t.y * e.w + t.z * e.x;
	const a = t.w * e.z + t.x * e.y - t.y * e.x + t.z * e.w;
	e.w = n;
	e.x = r;
	e.y = i;
	e.z = a;
	f(e);
}
//#endregion
//#region src/animation/poseMix.ts
function v(e) {
	if (e === null || typeof e !== "object" || Array.isArray(e)) return false;
	const t = Object.keys(e);
	if (t.length === 0) return false;
	return t.every((t) => typeof e[t] === "number");
}
function y(e, t, n) {
	let r = null;
	const i = {
		w: 0,
		x: 0,
		y: 0,
		z: 0
	};
	for (const n of t) {
		const t = n.track.data[e];
		if (!d(t)) continue;
		if (r === null) r = t;
		m(i, r, t, n.weight);
	}
	if (r === null) return;
	f(i);
	p(i);
	const a = n[e] ??= {};
	a.w = i.w + 0;
	a.x = i.x + 0;
	a.y = i.y + 0;
	a.z = i.z + 0;
}
function b(e, t, n, r) {
	const i = r[e] ??= {};
	const a = {};
	for (const n of t) {
		const t = n.track.data[e];
		if (!v(t)) continue;
		for (const e of Object.keys(t)) a[e] = (a[e] ?? 0) + t[e] * n.weight;
	}
	for (const e of Object.keys(a)) i[e] = a[e] / n;
}
function x(e, t, n, r) {
	let i = 0;
	for (const n of t) {
		const t = n.track.data[e];
		if (typeof t === "number") i += t * n.weight;
	}
	r[e] = i / n;
}
/**
* Blend `sources` into `out`, then write it. Weights need not sum to one: each
* field divides by the weight that actually reached it. `out` is seeded from the
* world like any pose, so a component some motion touches only partly keeps its
* other fields; `count` reads a prefix, so a varying blend need not allocate.
*/
function S(e, t, n, r = e.length) {
	t.reset();
	const i = /* @__PURE__ */ new Map();
	for (let t = 0; t < r; t++) {
		const { pose: n, weight: r } = e[t];
		if (r <= 0) continue;
		for (const e of n.tracks) {
			if (e.touched.size === 0) continue;
			const t = `${e.entity} ${e.def._name}`;
			const n = i.get(t);
			if (n) n.push({
				track: e,
				weight: r
			});
			else i.set(t, [{
				track: e,
				weight: r
			}]);
		}
	}
	for (const e of i.values()) {
		const r = e[0];
		const i = t.track(n, r.track.entity, r.track.def);
		if (!i) continue;
		const a = /* @__PURE__ */ new Set();
		for (const t of e) for (const e of t.track.touched) a.add(e);
		for (const t of a) {
			const n = [];
			let r = 0;
			for (const i of e) {
				if (!i.track.touched.has(t)) continue;
				n.push(i);
				r += i.weight;
			}
			if (r <= 0) continue;
			const a = n[0].track.data[t];
			if (d(a)) y(t, n, i.data);
			else if (typeof a === "number") x(t, n, r, i.data);
			else if (v(a)) b(t, n, r, i.data);
			else continue;
			i.touched.add(t);
		}
	}
}
//#endregion
//#region src/ecs/childPath.ts
const C = /* @__PURE__ */ new WeakMap();
function w(e, t, n) {
	const i = r("Parent");
	if (!e.mutationRevision || !e.getCppRegistry || !i) return void 0;
	const a = Math.max(e.mutationRevision(t, "write"), e.mutationRevision(t, "topology"), e.mutationRevision(n, "write"), e.mutationRevision(n, "topology"), e.mutationRevision(i, "write"), e.mutationRevision(i, "topology"));
	const o = e.getCppRegistry();
	let s = C.get(e);
	if (!s || s.revision !== a || s.core !== o) {
		s = {
			revision: a,
			core: o,
			parents: /* @__PURE__ */ new Map()
		};
		C.set(e, s);
	}
	return s;
}
function T(e, t, n, r, i) {
	const a = i.parents.get(t);
	if (a) return a;
	const o = e.tryGet(t, n);
	if (!o) return null;
	const s = /* @__PURE__ */ new Map();
	for (const t of o["entities"] || []) {
		const n = e.tryGet(t, r)?.["value"];
		if (typeof n === "string" && !s.has(n)) s.set(n, t);
	}
	i.parents.set(t, s);
	return s;
}
/**
* The descendant `childPath` names, relative to `rootEntity`; the root itself for
* an empty path. Null when a segment names no child, which is what an authored
* path pointing at a renamed bone comes to.
*/
function E(e, t, n) {
	if (!n) return t;
	const i = r("Children");
	const a = r("Name");
	if (!i || !a) return null;
	const o = w(e, i, a);
	let s = t;
	for (const t of n.split("/")) {
		if (o) {
			const n = T(e, s, i, a, o)?.get(t);
			if (n === void 0) return null;
			s = n;
			continue;
		}
		const n = e.tryGet(s, i);
		if (!n) return null;
		const r = n["entities"] || [];
		let c = null;
		for (const n of r) {
			const r = e.tryGet(n, a);
			if (r && r["value"] === t) {
				c = n;
				break;
			}
		}
		if (c === null) return null;
		s = c;
	}
	return s;
}
/** Add `root` and everything under it to `out`. */
function D(e, t, n) {
	if (n.has(t)) return;
	n.add(t);
	const i = r("Children");
	if (!i) return;
	const a = e.tryGet(t, i);
	if (!a) return;
	for (const t of a["entities"] || []) D(e, t, n);
}
//#endregion
//#region src/animation/motion.ts
function O(e) {
	return e.kind === "blend1d";
}
function k(e) {
	return e.kind === "blend2d";
}
/**
* The drivers one App knows. Per App and not global because a driver reaches
* live per-App state (the timeline's player flags, spine's manager), which a
* second App in the same process must not share.
*/
var A = class {
	constructor() {
		this.drivers_ = /* @__PURE__ */ new Map();
		this.posePool_ = [];
		this.mixPool_ = [];
		this.deltaPool_ = [];
		this.ctx_ = {
			world: null,
			entity: 0,
			params: {},
			extractRootMotion: false,
			drive: (e, t) => {
				this.driverFor(e)?.apply?.(this.ctx_, e, t);
			},
			finished: (e) => this.driverFor(e)?.isFinished?.(this.ctx_, e) ?? false,
			sample: (e, t, n) => this.driverFor(e)?.sample?.(this.ctx_, e, t, n) ?? false,
			duration: (e) => this.driverFor(e)?.duration?.(this.ctx_, e) ?? 0,
			loops: (e) => this.driverFor(e)?.loops?.(this.ctx_, e) ?? false,
			events: (e, t, n) => {
				this.driverFor(e)?.events?.(this.ctx_, e, t, n);
			},
			rootDelta: (e, t, n) => this.driverFor(e)?.rootMotion?.(this.ctx_, e, t, n) ?? false,
			borrowPose: () => this.posePool_.pop() ?? new u(),
			releasePose: (e) => {
				this.posePool_.push(e);
			},
			borrowMix: () => this.mixPool_.pop() ?? [],
			releaseMix: (e) => {
				this.mixPool_.push(e);
			},
			borrowDelta: () => this.deltaPool_.pop() ?? {
				position: {
					x: 0,
					y: 0,
					z: 0
				},
				rotation: {
					w: 1,
					x: 0,
					y: 0,
					z: 0
				}
			},
			releaseDelta: (e) => {
				this.deltaPool_.push(e);
			},
			resolveJoint: (e, t) => E(this.ctx_.world, e, t)
		};
	}
	register(e, t) {
		this.drivers_.set(e, t);
	}
	unregister(e) {
		this.drivers_.delete(e);
	}
	has(e) {
		return this.drivers_.has(e);
	}
	driverFor(e) {
		return this.drivers_.get(e.kind);
	}
	/**
	* The context for driving `entity` this tick, REUSED across entities: the
	* alternative is an object and three closures per animated entity per frame.
	* A driver must not keep it — it describes only the call it was handed to.
	*/
	context(e, t, n, r) {
		const i = this.ctx_;
		i.world = e;
		i.entity = t;
		i.params = n;
		i.extractRootMotion = false;
		i.resolveJoint = r ?? ((t, n) => E(e, t, n));
		return i;
	}
};
const ee = {
	lower: null,
	upper: null,
	t: 0
};
/**
* Divide `value` between the two stops it falls between. Under every threshold
* the lowest stop answers whole, which is what makes a speed parameter resting
* at zero play idle rather than nothing.
*/
function j(e, t) {
	let n = null;
	let r = null;
	let i = null;
	for (const a of e.thresholds) {
		if (i === null || a.value < i.value) i = a;
		if (a.value <= t && (n === null || a.value > n.value)) n = a;
		if (a.value > t && (r === null || a.value < r.value)) r = a;
	}
	if (n === null) {
		n = i;
		r = null;
	}
	const a = n !== null && r !== null ? r.value - n.value : 0;
	ee.lower = n;
	ee.upper = a > 0 ? r : null;
	ee.t = a > 0 ? (t - n.value) / a : 0;
	return ee;
}
/**
* The stop a 1D blend selects for `value`: the greatest threshold at or below it,
* clamped up to the lowest when the parameter sits under them all. This is what a
* motion that can only be SWITCHED to gets — a sprite sheet has no meaning
* halfway between two clips — while one that states values is mixed instead.
*/
function te(e, t) {
	return j(e, t).lower;
}
/** The motion a blend is currently selecting, or null when it has no stops. */
function M(e, t) {
	return te(t, Number(e.params[t.parameter] ?? 0))?.motion ?? null;
}
/** The parameter this blend reads, which is a float even when nothing set it. */
function ne(e, t) {
	return Number(e.params[t.parameter] ?? 0);
}
/**
* Filled only once every nested sample has returned, so a blend inside a blend
* cannot find its parent's operands here. Reused for the same reason {@link PAIR}
* is: mixing is the steady state of an animated entity, not an event.
*/
/** Grow `mix` to hold `count` weighted poses, keeping the entries already in it. */
function N(e, t) {
	while (e.length < t) e.push({
		pose: null,
		weight: 0
	});
}
/**
* A blend states values, so it MIXES: at 0.5 between walk and run the character
* is half of each, rather than walking until run's threshold is crossed. A
* motion that can only be switched to still picks ({@link selectBlendStop}) —
* `apply` is the seam for exactly those, and the two answers differ only there.
*/
const re = {
	apply(e, t, n) {
		const r = M(e, t);
		if (r) e.drive(r, n);
	},
	/**
	* The stops are sampled at the same PHASE, not the same second: a 2s idle and
	* a 0.6s run share a clock only once each is measured against its own length,
	* and without that the faster clip's feet slide. Mixing then goes through the
	* pose mixer a crossfade uses — the weights differ, the operation does not.
	*/
	sample(e, t, n, r) {
		const { lower: i, upper: a, t: o } = j(t, ne(e, t));
		if (!i) return false;
		if (!a) return e.sample(i.motion, n, r);
		const s = e.duration(i.motion);
		const c = e.duration(a.motion);
		const l = s > 0 && c > 0 ? s + (c - s) * o : 0;
		const u = l > 0 ? n * (s / l) : n;
		const d = l > 0 ? n * (c / l) : n;
		const f = e.borrowPose();
		const p = e.borrowPose();
		const m = e.borrowMix();
		try {
			f.reset();
			p.reset();
			const t = e.sample(i.motion, u, f);
			if (!e.sample(a.motion, d, p)) return t && e.sample(i.motion, u, r);
			if (!t) return e.sample(a.motion, d, r);
			N(m, 2);
			m[0].pose = f;
			m[0].weight = 1 - o;
			m[1].pose = p;
			m[1].weight = o;
			S(m, r, e.world, 2);
			return true;
		} finally {
			e.releaseMix(m);
			e.releasePose(p);
			e.releasePose(f);
		}
	},
	duration(e, t) {
		const { lower: n, upper: r, t: i } = j(t, ne(e, t));
		if (!n) return 0;
		const a = e.duration(n.motion);
		if (!r) return a;
		const o = e.duration(r.motion);
		return a > 0 && o > 0 ? a + (o - a) * i : a;
	},
	loops(e, t) {
		const n = M(e, t);
		return n ? e.loops(n) : false;
	},
	isFinished(e, t) {
		const n = M(e, t);
		return n ? e.finished(n) : false;
	},
	events(e, t, n, r) {
		const i = M(e, t);
		if (i) e.events(i, n, r);
	},
	/**
	* Weighted like the pose. Picking makes a character crossing run's threshold
	* jump its speed in one frame, the one thing a locomotion tree prevents. A
	* stop stating no displacement does not push the character, so the other end
	* keeps only its share rather than answering whole.
	*/
	rootMotion(e, t, n, r) {
		const { lower: i, upper: a, t: o } = j(t, ne(e, t));
		if (!i) return false;
		if (!a) return e.rootDelta(i.motion, n, r);
		const s = e.borrowDelta();
		try {
			const t = e.rootDelta(i.motion, n, r);
			const c = e.rootDelta(a.motion, n, s);
			if (t && c) {
				se(r, s, o);
				return true;
			}
			if (t) {
				ie(r, 1 - o);
				return true;
			}
			if (c) {
				ae(r, s);
				ie(r, o);
				return true;
			}
			return false;
		} finally {
			e.releaseDelta(s);
		}
	}
};
/** Displacement arithmetic. A rotation is not scaled linearly, so a share of one
*  is the identity leaned toward it — the same rule the layer stack uses. */
function ie(e, t) {
	e.position.x *= t;
	e.position.y *= t;
	e.position.z *= t;
	P.w = 1;
	P.x = 0;
	P.y = 0;
	P.z = 0;
	h(P, e.rotation, t);
	e.rotation.w = P.w;
	e.rotation.x = P.x;
	e.rotation.y = P.y;
	e.rotation.z = P.z;
}
function ae(e, t) {
	e.position.x = t.position.x;
	e.position.y = t.position.y;
	e.position.z = t.position.z;
	e.rotation.w = t.rotation.w;
	e.rotation.x = t.rotation.x;
	e.rotation.y = t.rotation.y;
	e.rotation.z = t.rotation.z;
}
function oe(e) {
	e.position.x = 0;
	e.position.y = 0;
	e.position.z = 0;
	e.rotation.w = 0;
	e.rotation.x = 0;
	e.rotation.y = 0;
	e.rotation.z = 0;
}
/** Move `out` a `weight` share of the way to `src`. */
function se(e, t, n) {
	e.position.x += (t.position.x - e.position.x) * n;
	e.position.y += (t.position.y - e.position.y) * n;
	e.position.z += (t.position.z - e.position.z) * n;
	h(e.rotation, t.rotation, n);
}
/** Accumulate `src * weight` into a zeroed `out`; the caller normalizes at the end. */
function ce(e, t, n) {
	e.position.x += t.position.x * n;
	e.position.y += t.position.y * n;
	e.position.z += t.position.z * n;
	m(e.rotation, le, t.rotation, n);
}
const P = {
	w: 1,
	x: 0,
	y: 0,
	z: 0
};
/** Every contribution aligns to the identity, which is the rotation a motion
*  stating no turn already has — so the reference is never absent. */
const le = {
	w: 1,
	x: 0,
	y: 0,
	z: 0
};
/**
* Gradient-band weights, normalized to sum to one: each point keeps what the
* neighbour nearest to pushing it out leaves it. That puts a sample standing on a
* clip entirely on that clip, and holds one outside the hull by its nearest edge
* rather than letting it fall to nothing. Only `weight` is written.
*/
function F(e, t, n, r) {
	const i = e.points;
	let a = 0;
	for (let e = 0; e < i.length; e++) {
		const o = i[e].position;
		let s = 1;
		for (let r = 0; r < i.length && s > 0; r++) {
			if (r === e) continue;
			const a = i[r].position.x - o.x;
			const c = i[r].position.y - o.y;
			const l = a * a + c * c;
			if (l <= 0) continue;
			const u = ((t - o.x) * a + (n - o.y) * c) / l;
			if (1 - u < s) s = 1 - u;
		}
		r[e].weight = s > 0 ? s : 0;
		a += r[e].weight;
	}
	if (a <= 0) {
		if (i.length > 0) r[0].weight = 1;
		return;
	}
	for (let e = 0; e < i.length; e++) r[e].weight /= a;
}
/** Read into on every call and consumed before anything re-enters — this module
*  never calls out while it holds a claim on this. */
const I = [];
/** The point carrying the most weight: what a motion that can only be SWITCHED
*  to gets, and who speaks for the blend's events and its end. */
function ue(e, t, n) {
	const r = e.points;
	if (r.length === 0) return null;
	while (I.length < r.length) I.push({ weight: 0 });
	F(e, t, n, I);
	let i = 0;
	for (let e = 1; e < r.length; e++) if (I[e].weight > I[i].weight) i = e;
	return r[i];
}
/** Where this blend sits in its plane, both parameters being floats even when
*  nothing set them. */
function L(e, t) {
	de.x = Number(e.params[t.parameterX] ?? 0);
	de.y = Number(e.params[t.parameterY] ?? 0);
	return de;
}
const de = {
	x: 0,
	y: 0
};
function R(e, t) {
	const { x: n, y: r } = L(e, t);
	return ue(t, n, r)?.motion ?? null;
}
/**
* The same operation the 1D blend performs, with the weights coming from a plane
* rather than a line — which is why this shares the pose mixer and the phase
* synchronisation rather than restating either.
*/
const fe = {
	apply(e, t, n) {
		const r = R(e, t);
		if (r) e.drive(r, n);
	},
	sample(e, t, n, r) {
		const i = t.points;
		if (i.length === 0) return false;
		if (i.length === 1) return e.sample(i[0].motion, n, r);
		const a = e.borrowMix();
		let o = 0;
		try {
			N(a, i.length);
			const { x: s, y: c } = L(e, t);
			F(t, s, c, a);
			let l = 0;
			for (let t = 0; t < i.length; t++) {
				if (a[t].weight <= 0) continue;
				const n = e.duration(i[t].motion);
				if (n <= 0) {
					l = 0;
					break;
				}
				l += a[t].weight * n;
			}
			for (let t = 0; t < i.length; t++) {
				const r = a[t].weight;
				if (r <= 0) continue;
				const s = i[t].motion;
				const c = l > 0 ? n * (e.duration(s) / l) : n;
				const u = e.borrowPose();
				u.reset();
				if (!e.sample(s, c, u)) {
					e.releasePose(u);
					continue;
				}
				a[o].pose = u;
				a[o].weight = r;
				o++;
			}
			if (o === 0) return false;
			if (o === 1) a[0].weight = 1;
			S(a, r, e.world, o);
			return true;
		} finally {
			for (let t = 0; t < o; t++) e.releasePose(a[t].pose);
			e.releaseMix(a);
		}
	},
	duration(e, t) {
		const n = t.points;
		if (n.length === 0) return 0;
		const r = e.borrowMix();
		try {
			N(r, n.length);
			const { x: i, y: a } = L(e, t);
			F(t, i, a, r);
			let o = 0;
			for (let i = 0; i < n.length; i++) {
				if (r[i].weight <= 0) continue;
				const a = e.duration(n[i].motion);
				if (a <= 0) return e.duration(R(e, t) ?? n[0].motion);
				o += r[i].weight * a;
			}
			return o;
		} finally {
			e.releaseMix(r);
		}
	},
	loops(e, t) {
		const n = R(e, t);
		return n ? e.loops(n) : false;
	},
	isFinished(e, t) {
		const n = R(e, t);
		return n ? e.finished(n) : false;
	},
	events(e, t, n, r) {
		const i = R(e, t);
		if (i) e.events(i, n, r);
	},
	rootMotion(e, t, n, r) {
		const i = t.points;
		if (i.length === 0) return false;
		const a = e.borrowMix();
		const o = e.borrowDelta();
		try {
			N(a, i.length);
			const { x: s, y: c } = L(e, t);
			F(t, s, c, a);
			oe(r);
			let l = false;
			for (let t = 0; t < i.length; t++) {
				const s = a[t].weight;
				if (s <= 0) continue;
				if (!e.rootDelta(i[t].motion, n, o)) continue;
				ce(r, o, s);
				l = true;
			}
			if (l) f(r.rotation);
			return l;
		} finally {
			e.releaseDelta(o);
			e.releaseMix(a);
		}
	}
};
//#endregion
//#region src/animation/spriteMotion.ts
const z = "sprite";
const pe = {
	apply({ world: e, entity: t }, n, r) {
		if (!e.has(t, o)) return;
		if (e.get(t, o).clip === n.clip && !r) return;
		e.update(t, o, (e) => {
			e.clip = n.clip;
			e.speed = n.speed ?? 1;
			e.loop = n.loop ?? true;
			e.currentFrame = 0;
			e.frameTimer = 0;
			e.playing = true;
			e.finished = false;
			e.enabled = true;
		});
	},
	isFinished({ world: e, entity: t }, n) {
		if (!e.has(t, o)) return false;
		const r = e.get(t, o);
		return r.clip === n.clip && r.clip !== "" && r.finished && !r.playing;
	}
};
//#endregion
//#region src/animation/layerStack.ts
function B(e) {
	if (e === null || typeof e !== "object" || Array.isArray(e)) return false;
	const t = Object.keys(e);
	if (t.length === 0) return false;
	return t.every((t) => typeof e[t] === "number");
}
/** Scratch for one additive field; this runs on one track at a time and does
*  not re-enter. */
const me = {
	w: 1,
	x: 0,
	y: 0,
	z: 0
};
const V = {
	w: 1,
	x: 0,
	y: 0,
	z: 0
};
/**
* `dst` turned further by the rotation `from` → `to`, a `weight` share of it.
* Leaning the identity toward the delta is what SCALES a rotation, there being
* nothing to scale linearly; the turn is then applied on top.
*/
function he(e, t, n, r) {
	g(me, t, n);
	V.w = 1;
	V.x = 0;
	V.y = 0;
	V.z = 0;
	h(V, me, r);
	_(e, V);
}
function ge(e, t, n, r) {
	const i = e[n];
	const a = t[n];
	if (d(a)) if (d(i)) h(i, a, r);
	else e[n] = {
		w: a.w,
		x: a.x,
		y: a.y,
		z: a.z
	};
	else if (typeof a === "number") e[n] = typeof i === "number" ? i + (a - i) * r : a;
	else if (B(a)) if (B(i)) for (const e of Object.keys(a)) {
		const t = i[e];
		i[e] = typeof t === "number" ? t + (a[e] - t) * r : a[e];
	}
	else e[n] = { ...a };
	else if (r >= 1) e[n] = a;
}
function _e(e, t, n, r, i) {
	const a = e[r];
	const o = t[r];
	const s = n[r];
	if (d(o) && d(s)) {
		if (d(a)) he(a, s, o, i);
	} else if (typeof o === "number" && typeof s === "number") {
		if (typeof a === "number") e[r] = a + (o - s) * i;
	} else if (B(o) && B(s) && B(a)) for (const e of Object.keys(o)) {
		const t = a[e];
		if (typeof t === "number") a[e] = t + ((o[e] ?? 0) - (s[e] ?? 0)) * i;
	}
}
/**
* Lay `layer` over `acc`: every field the layer wrote moves a `weight` share of
* the way from what is already there to what the layer says. Where the layer is
* the first to write a field, "already there" is the world's own value.
*/
function ve(e, t, n, r, i) {
	if (n <= 0) return;
	for (const a of t.tracks) {
		if (a.touched.size === 0) continue;
		if (i && !i.admits(a)) continue;
		const t = e.track(r, a.entity, a.def);
		if (!t) continue;
		for (const e of a.touched) {
			ge(t.data, a.data, e, n);
			t.touched.add(e);
		}
	}
}
/**
* Add what `layer` says BEYOND `reference` onto `acc` — a flinch or a lean stated
* as a departure from its own resting pose, so it reads the same over a walk as
* over a run. Measured against the layer's own start and not against `acc`, which
* would make the same clip mean something different under every base state.
*/
function ye(e, t, n, r, i, a) {
	if (r <= 0) return;
	const o = /* @__PURE__ */ new Map();
	for (const e of n.tracks) o.set(`${e.entity} ${e.def._name}`, e);
	for (const n of t.tracks) {
		if (n.touched.size === 0) continue;
		if (a && !a.admits(n)) continue;
		const t = o.get(`${n.entity} ${n.def._name}`);
		if (!t) continue;
		const s = e.track(i, n.entity, n.def);
		if (!s) continue;
		for (const e of n.touched) {
			if (!t.touched.has(e)) continue;
			_e(s.data, n.data, t.data, e, r);
			s.touched.add(e);
		}
	}
}
//#endregion
//#region src/animation/animatorMask.ts
/**
* One layer's resolved mask, reused across frames. Re-resolved each time rather
* than cached against the hierarchy: a rig gains and loses entities while it
* plays, and a mask that went stale would silently start writing a joint the
* author excluded.
*/
var be = class {
	constructor() {
		this.admitted_ = /* @__PURE__ */ new Set();
	}
	resolve(e, t, n, r) {
		this.admitted_.clear();
		for (const i of n.paths) {
			const n = r(t, i);
			if (n !== null) D(e, n, this.admitted_);
		}
	}
	admits(e) {
		return this.admitted_.has(e.entity);
	}
};
//#endregion
//#region src/animation/animatorAvatar.ts
/** What a `.esavatar` this build writes claims. */
const xe = 1;
/**
* Read a parsed `.esavatar`. Throws for a shape that is not one and for a
* version this build does not know — the same upward guard a controller has, for
* the same reason: a translation half-read animates the wrong joints in silence.
*/
function Se(e) {
	if (typeof e !== "object" || e === null) throw new Error("Avatar data must be an object");
	const t = e;
	const n = t["version"];
	if (n !== void 0 && (typeof n !== "number" || !Number.isInteger(n))) throw new Error("Avatar \"version\" must be an integer");
	if ((n ?? 1) > 1) throw new Error(`Avatar is version ${n}; this build reads up to ${1}.`);
	const r = t["joints"];
	if (typeof r !== "object" || r === null || Array.isArray(r)) throw new Error("An avatar needs a \"joints\" object mapping clip names to childPaths");
	const i = {};
	for (const [e, t] of Object.entries(r)) {
		if (typeof t !== "string") throw new Error(`Avatar joint "${e}" must map to a childPath string`);
		if (t && t !== e) i[e] = t;
	}
	const a = t["scale"];
	if (a !== void 0 && (typeof a !== "number" || !(a > 0))) throw new Error("Avatar \"scale\" must be a positive number");
	const o = t["rest"] === void 0 ? void 0 : we(t["rest"]);
	const s = t["space"] === void 0 ? void 0 : we(t["space"]);
	const c = t["restPosition"] === void 0 ? void 0 : Te(t["restPosition"]);
	const l = { joints: i };
	if (o) l.rest = o;
	if (s) l.space = s;
	if (c) l.restPosition = c;
	if (a !== void 0) l.scale = a;
	return l;
}
/**
* How far a clip authored against `source` should travel on `target`. One where
* either rig does not state its size — a ratio against a guess would move a
* character by an amount nobody chose.
*/
function Ce(e, t) {
	const n = e?.scale;
	const r = t?.scale;
	return n && r ? r / n : 1;
}
/** The bind pose, one rotation per joint. A joint listed without a usable
*  rotation is refused rather than defaulted: an identity nobody meant would
*  rebase every clip through a pose the rig is not in. */
function we(e) {
	if (typeof e !== "object" || e === null || Array.isArray(e)) throw new Error("Avatar \"rest\" must be an object of joint rotations");
	const t = {};
	for (const [n, r] of Object.entries(e)) {
		const e = r;
		if (!e || [
			"w",
			"x",
			"y",
			"z"
		].some((t) => typeof e[t] !== "number")) throw new Error(`Avatar rest pose for "${n}" must be a quaternion`);
		t[n] = {
			w: e.w,
			x: e.x,
			y: e.y,
			z: e.z
		};
	}
	return t;
}
/** Rest positions, one per joint; a joint listed without all three is refused. */
function Te(e) {
	if (typeof e !== "object" || e === null || Array.isArray(e)) throw new Error("Avatar \"restPosition\" must be an object of joint positions");
	const t = {};
	for (const [n, r] of Object.entries(e)) {
		const e = r;
		if (!e || [
			"x",
			"y",
			"z"
		].some((t) => typeof e[t] !== "number")) throw new Error(`Avatar rest position for "${n}" must be a vector`);
		t[n] = {
			x: e.x,
			y: e.y,
			z: e.z
		};
	}
	return t;
}
/** A blank avatar, which translates nothing and resolves every path as itself. */
function Ee() {
	return {
		version: 1,
		joints: {}
	};
}
/**
* The resolver a rig with `avatar` uses. Null for no avatar rather than an
* identity one, so the common case reaches {@link resolveChildEntity} with
* nothing in between.
*/
function De(e, t) {
	if (!t) return (t, n) => E(e, t, n);
	return (n, r) => E(e, n, t.joints[r] ?? r);
}
/**
* Re-state `pose` as this rig would stand it: a clip means a joint's turn off its
* rest in rig space, `D = Sₚ·stated·(Sₚ·rest)⁻¹`, which the target stands on its own
* rest as `Tₚ⁻¹·D·Tₚ·targetRest` (Sₚ, Tₚ each rig's parent space). A moved joint
* moves by the same rig-space displacement, scaled by the rigs' sizes.
*/
function Oe(e, t, r, i, a, o) {
	const c = r.rest;
	const l = i.rest;
	if (!c || !l) return;
	const u = Ce(r, i);
	for (const [d, f] of Object.entries(c)) {
		const c = l[d];
		if (!c) continue;
		const p = a(t, d);
		if (p === null) continue;
		const m = e.track(o, p, n);
		if (!m || !m.touched.has("rotation")) continue;
		const h = m.data.rotation;
		if (!h) continue;
		const g = r.space?.[d] ?? ke;
		const _ = i.space?.[d] ?? ke;
		const v = s.mul(s.mul(g, h), s.conjugate(s.mul(g, f)));
		const y = s.normalize(s.mul(s.mul(s.conjugate(_), s.mul(v, _)), c));
		m.data.rotation = {
			w: y.w,
			x: y.x,
			y: y.y,
			z: y.z
		};
		const b = r.restPosition?.[d];
		const x = i.restPosition?.[d];
		const S = m.touched.has("position") ? m.data.position : void 0;
		if (b && x && S) {
			const e = s.rotate(s.conjugate(_), s.rotate(g, {
				x: S.x - b.x,
				y: S.y - b.y,
				z: S.z - b.z
			}));
			m.data.position = {
				x: x.x + e.x * u,
				y: x.y + e.y * u,
				z: x.z + e.z * u
			};
		}
	}
}
const ke = {
	w: 1,
	x: 0,
	y: 0,
	z: 0
};
//#endregion
//#region src/animation/animatorIK.ts
const H = {
	x: {
		x: 1,
		y: 0,
		z: 0
	},
	y: {
		x: 0,
		y: 1,
		z: 0
	},
	z: {
		x: 0,
		y: 0,
		z: 1
	}
};
const U = (e, t) => ({
	x: e.x - t.x,
	y: e.y - t.y,
	z: e.z - t.z
});
const W = (e, t) => ({
	x: e.x + t.x,
	y: e.y + t.y,
	z: e.z + t.z
});
const G = (e) => Math.hypot(e.x, e.y, e.z);
const Ae = (e, t) => ({
	x: e.y * t.z - e.z * t.y,
	y: e.z * t.x - e.x * t.z,
	z: e.x * t.y - e.y * t.x
});
const je = (e, t) => e.x * t.x + e.y * t.y + e.z * t.z;
/** Any direction perpendicular to `v`. Seeded off the component `v` leans on
*  LEAST, so the cross never collapses. */
function Me(e) {
	const t = Math.abs(e.x) < Math.abs(e.y) && Math.abs(e.x) < Math.abs(e.z) ? H.x : Math.abs(e.y) < Math.abs(e.z) ? H.y : H.z;
	return Ae(e, t);
}
/** The angle between two vectors, clamped out of the range acos rejects. */
function Ne(e, t) {
	const n = G(e) * G(t);
	if (n < 1e-9) return 0;
	return Math.acos(Math.min(1, Math.max(-1, je(e, t) / n)));
}
/**
* A joint's local transform THIS frame: what the pose stated, or what the world
* holds where no motion touched it. Reading the world alone would use values the
* layers have already replaced.
*/
function Pe(e, t, r) {
	for (const e of t.tracks) if (e.entity === r && e.def === n) return e.data;
	return e.has(r, n) ? e.get(r, n) : null;
}
/** The joints from `rigRoot` down to `joint`, `rigRoot` excluded. Null when the
*  joint is not under the rig at all. */
function Fe(e, t, n) {
	const r = [];
	let i = n;
	for (let n = 0; n < 64; n++) {
		if (i === t) return r.reverse();
		r.push(i);
		const n = K(e, i);
		if (n === null) return null;
		i = n;
	}
	return null;
}
function K(e, n) {
	const r = e.tryGet(n, t);
	return r && typeof r.entity === "number" ? r.entity : null;
}
/**
* Place `joint` in the rig's space by composing the pose down the chain. Rotation
* only — a rig scaled per joint is a different problem, and silently folding a
* scale in here would answer it wrongly rather than not at all.
*/
function q(e, t, n, r) {
	const i = Fe(e, n, r);
	if (!i) return null;
	let a = {
		x: 0,
		y: 0,
		z: 0
	};
	let o = {
		w: 1,
		x: 0,
		y: 0,
		z: 0
	};
	let c = o;
	for (const n of i) {
		const r = Pe(e, t, n);
		if (!r) return null;
		c = o;
		a = W(a, s.rotate(o, r.position));
		o = s.normalize(s.mul(o, r.rotation));
	}
	return {
		position: a,
		rotation: o,
		parentRotation: c
	};
}
/** How much of this constraint applies, the parameter scaling what was authored. */
function Ie(e, t) {
	const n = e.weight ?? 1;
	const r = e.parameter ? Number(t[e.parameter] ?? 0) : 1;
	return Math.min(1, Math.max(0, n * r));
}
/**
* Move `joint`'s LOCAL rotation `weight` of the way to what the solve wants. The
* weight is a share of the answer, exactly as a layer's is — not a share of a
* correction applied joint by joint, which compounds down a chain and leaves a
* half-weight limb in a pose no solve ever produced.
*/
function J(e, t, r, i, a, o) {
	const c = s.normalize(s.mul(s.conjugate(i), a));
	const l = Pe(e, t, r)?.rotation ?? {
		w: 1,
		x: 0,
		y: 0,
		z: 0
	};
	const u = {
		w: l.w,
		x: l.x,
		y: l.y,
		z: l.z
	};
	if (o >= 1) {
		u.w = c.w;
		u.x = c.x;
		u.y = c.y;
		u.z = c.z;
	} else h(u, c, o);
	const d = t.track(e, r, n);
	if (d) {
		d.data.rotation = {
			w: u.w,
			x: u.x,
			y: u.y,
			z: u.z
		};
		d.touched.add("rotation");
	}
	return s.normalize(s.mul(i, u));
}
/** `v` with everything along `axis` taken out — the part of it that is a
*  direction the limb can actually bend towards. */
function Le(e, t) {
	const n = je(e, t);
	return {
		x: e.x - t.x * n,
		y: e.y - t.y * n,
		z: e.z - t.z * n
	};
}
const Y = (e) => {
	const t = G(e);
	return t < 1e-9 ? {
		x: 0,
		y: 0,
		z: 0
	} : {
		x: e.x / t,
		y: e.y / t,
		z: e.z / t
	};
};
const X = (e, t) => ({
	x: e.x * t,
	y: e.y * t,
	z: e.z * t
});
/**
* Two-bone IK — the tip and the two joints above it — CONSTRUCTED, not corrected.
* The elbow lies on a circle about the root-to-target line; the law of cosines
* fixes where along it and how far off, and the pole picks the point. Nudging by
* angle differences cannot reach the circle's far side: the axis lies along a bone.
*/
function Re(e, t, n, r, i, a) {
	const o = a(n, r.tip);
	const s = a(n, r.target);
	if (o === null || s === null) return false;
	const c = q(e, t, n, s);
	if (!c) return false;
	return ze(e, t, n, o, c.position, r, i, a) !== null;
}
/** The chain above `tip` bent to put it at `goal`, in the rig's space. Answers the rotation the tip's parent ends at, or null when there is no chain. */
function ze(e, t, n, r, i, a, o, c) {
	const l = K(e, r);
	const u = l === null ? null : K(e, l);
	if (l === null || u === null) return null;
	const d = q(e, t, n, r);
	const f = q(e, t, n, l);
	const p = q(e, t, n, u);
	if (!d || !f || !p) return null;
	const m = U(f.position, p.position);
	const h = U(d.position, f.position);
	const g = U(i, p.position);
	const _ = G(m);
	const v = G(h);
	if (_ < 1e-6 || v < 1e-6 || G(g) < 1e-6) return null;
	const y = Math.min(Math.max(G(g), Math.abs(_ - v) + 1e-5), _ + v - 1e-5);
	const b = Y(g);
	const x = a.pole ? c(n, a.pole) : null;
	const S = x === null ? null : q(e, t, n, x);
	const C = Be(b, [S ? Le(U(S.position, p.position), b) : null, Le(m, b)]);
	const w = Math.min(1, Math.max(-1, (_ * _ + y * y - v * v) / (2 * _ * y)));
	const T = W(p.position, W(X(b, _ * w), X(C, _ * Math.sqrt(Math.max(0, 1 - w * w)))));
	const E = W(p.position, X(b, y));
	const D = s.normalize(s.mul(s.rotationTo(m, U(T, p.position)), p.rotation));
	const O = s.normalize(s.mul(D, s.conjugate(p.rotation)));
	const k = s.normalize(s.mul(s.rotationTo(s.rotate(O, h), U(E, T)), s.mul(O, f.rotation)));
	return J(e, t, l, J(e, t, u, p.parentRotation, D, o), k, o);
}
/** The first direction that leaves the line; any will do for a straight limb. */
function Be(e, t) {
	for (const e of t) if (e && G(e) > 1e-6) return Y(e);
	return Y(Me(e));
}
/** Look-at: the tip turns so its own `axis` points at the target. */
function Ve(e, t, n, r, i, a) {
	const o = a(n, r.tip);
	const c = a(n, r.target);
	if (o === null || c === null) return false;
	const l = q(e, t, n, o);
	const u = q(e, t, n, c);
	if (!l || !u) return false;
	const d = s.rotate(l.rotation, H[r.axis ?? "z"]);
	const f = U(u.position, l.position);
	if (G(f) < 1e-6) return false;
	const p = s.normalize(s.mul(s.rotationTo(d, f), l.rotation));
	J(e, t, o, l.parentRotation, p, i);
	return true;
}
/** The steepest a foot is laid over, whatever is under it: past this it is a wall, or a ray that found the wrong thing. */
const He = Math.PI / 4;
const Z = {
	x: 0,
	y: 1,
	z: 0
};
/** Where the rig stands in the world. A root with no parent is read from what it says this frame, not the record of the last. */
function Ue(e, t) {
	const r = e.get(t, n);
	return K(e, t) === null ? {
		p: r.position,
		r: r.rotation,
		s: r.scale
	} : {
		p: r.worldPosition,
		r: r.worldRotation,
		s: r.worldScale
	};
}
/**
* Feet on the ground the clip did not know about. The clip's height above the rig's
* floor is kept, so a lifted foot stays lifted, and the floor under each foot is
* moved to where the ground really is. Every foot is measured first, because the
* pelvis has to drop for the lowest of them before any leg is solved.
*/
function We(e, t, r, i, a, o) {
	const c = Ue(e, r);
	const l = s.conjugate(c.r);
	const u = (e) => W(c.p, s.rotate(c.r, {
		x: e.x * c.s.x,
		y: e.y * c.s.y,
		z: e.z * c.s.z
	}));
	const d = (e) => {
		const t = s.rotate(l, U(e, c.p));
		return {
			x: t.x / c.s.x,
			y: t.y / c.s.y,
			z: t.z / c.s.z
		};
	};
	const f = o.rest ??= /* @__PURE__ */ new Map();
	const p = (r) => {
		if (r === null) return;
		const i = Pe(e, t, r);
		if (!i) return;
		if (!f.has(r)) f.set(r, {
			position: { ...i.position },
			rotation: { ...i.rotation }
		});
		const a = f.get(r);
		const o = t.track(e, r, n);
		if (!o) return;
		if (!o.touched.has("rotation")) {
			o.data.rotation = { ...a.rotation };
			o.touched.add("rotation");
		}
		if (!o.touched.has("position")) {
			o.data.position = { ...a.position };
			o.touched.add("position");
		}
	};
	for (const { ik: t } of i) {
		const n = a(r, t.tip);
		if (n === null) continue;
		const i = K(e, n);
		p(n);
		p(i);
		p(i === null ? null : K(e, i));
		if (t.pelvis) p(a(r, t.pelvis));
	}
	const m = [];
	for (const { ik: n, weight: f } of i) {
		const i = a(r, n.tip);
		if (i === null) continue;
		const p = q(e, t, r, i);
		const h = K(e, i);
		const g = h === null ? null : K(e, h);
		const _ = h === null ? null : q(e, t, r, h);
		const v = g === null ? null : q(e, t, r, g);
		if (!p || !_ || !v) continue;
		const y = n.reach ?? G(U(_.position, v.position)) + G(U(p.position, _.position));
		const b = u(p.position);
		const x = y * Math.abs(c.s.y);
		const S = o.probe({
			x: b.x,
			y: b.y + x,
			z: b.z
		}, x * 2, n.layers ?? 0);
		let C = 0;
		let w = Z;
		if (S) {
			C = d({
				x: b.x,
				y: S.y + p.position.y * c.s.y,
				z: b.z
			}).y - p.position.y;
			w = s.rotate(l, S.normal);
		}
		const T = `${r}/${n.tip}`;
		const E = o.memory.get(T);
		const D = n.smooth ?? .06;
		const O = !E || D <= 0 ? 1 : 1 - Math.exp(-o.dt / D);
		const k = E ? E.lift + (C - E.lift) * O : C;
		const A = Y(E ? W(E.normal, X(U(w, E.normal), O)) : w);
		o.memory.set(T, {
			lift: k,
			normal: A
		});
		m.push({
			ik: n,
			weight: f,
			tip: i,
			at: p.position,
			rotation: p.rotation,
			lift: k,
			normal: A
		});
	}
	const h = /* @__PURE__ */ new Map();
	for (const e of m) {
		if (!e.ik.pelvis) continue;
		h.set(e.ik.pelvis, Math.min(h.get(e.ik.pelvis) ?? 0, e.lift * e.weight));
	}
	for (const [i, o] of h) {
		if (o >= 0) continue;
		const c = a(r, i);
		const l = c === null ? null : q(e, t, r, c);
		const u = c === null ? null : t.track(e, c, n);
		if (!l || !u) continue;
		u.data.position = W(u.data.position, s.rotate(s.conjugate(l.parentRotation), {
			x: 0,
			y: o,
			z: 0
		}));
		u.touched.add("position");
	}
	for (const n of m) {
		const i = {
			x: n.at.x,
			y: n.at.y + n.lift,
			z: n.at.z
		};
		const o = ze(e, t, r, n.tip, i, n.ik, n.weight, a);
		if (!o || n.ik.align === false) continue;
		const c = Ne(Z, n.normal);
		const l = c > He ? Y(W(X(Z, Math.sin(c - He)), X(n.normal, Math.sin(He)))) : n.normal;
		J(e, t, n.tip, o, s.normalize(s.mul(s.rotationTo(Z, l), n.rotation)), n.weight);
	}
}
/**
* Apply every constraint to the stack's answer, in the order they are declared:
* one can move a joint another then reads, and an author who wrote them in an
* order meant it. Foot-plants go first, together: where the feet land moves the
* body the others are measured from.
*/
function Ge(e, t, n, r, i, a = (t, n) => E(e, t, n), o) {
	if (o?.probe) {
		const s = r.filter((e) => e.kind === "foot-plant").map((e) => ({
			ik: e,
			weight: Ie(e, i)
		})).filter((e) => e.weight > 0);
		if (s.length) We(e, n, t, s, a, o);
	}
	for (const o of r) {
		if (o.kind === "foot-plant") continue;
		const r = Ie(o, i);
		if (r <= 0) continue;
		if (o.kind === "look-at") Ve(e, n, t, o, r, a);
		else Re(e, n, t, o, r, a);
	}
}
//#endregion
//#region src/animation/animatorRootMotion.ts
/**
* @file    animatorRootMotion.ts
* @brief   How far the animation asks the character to move — a request, never a
*          result.
*
* @details A clip that animates the entity it is played ON is not posing a
*          skeleton; it is saying where the character travels. Writing that to
*          the Transform would put the animator in charge of movement, and an
*          animator in charge of movement walks through walls: the world's
*          answer is the character controller's to give.
*
*          So the animator states the request here and touches nothing. Gameplay
*          reads it, hands it to whatever moves the character, and the character
*          ends up wherever collision allowed — which is what the pattern beside
*          it already does with the stick.
*
*          The deltas come with the SECONDS they cover because the animator runs
*          on the frame clock and a character controller usually steps on a fixed
*          one. A consumer forms a rate from the pair; a consumer that just added
*          the delta would move twice on a frame with two steps and not at all on
*          a frame with none.
*/
/**
* Publishes what the active animation asks to move, for gameplay to hand to a
* character controller. Add it to a character whose animations drive movement;
* without it, a root-motion state still refuses to pose the character's own
* Transform — it simply plays on the spot.
*
* @experimental
*/
const Q = e("AnimatorRootMotion", {
	enabled: true,
	active: false,
	deltaPosition: {
		x: 0,
		y: 0,
		z: 0
	},
	deltaRotation: {
		w: 1,
		x: 0,
		y: 0,
		z: 0
	},
	deltaTime: 0
}, {
	readonlyFields: [
		"active",
		"deltaPosition",
		"deltaRotation",
		"deltaTime"
	],
	fields: {
		active: { advanced: true },
		deltaPosition: { advanced: true },
		deltaRotation: { advanced: true },
		deltaTime: {
			advanced: true,
			unit: "s"
		}
	}
});
//#endregion
//#region src/animation/Animator.ts
/**
* @file    Animator.ts
* @brief   Animation state machine (pure TypeScript) over motions of any kind.
*
* Design (per REARCH_2D_PARITY.md T2): the state machine is a *strategy layer*
* over the engine's animation channels — it does not run its own clip playback.
* A state names a MOTION; a {@link MotionDriver} registered for that motion's
* kind is what plays it, so the graph is the same whether the entity is a sprite
* sheet or a skinned model, and a new kind of animation is a registration rather
* than another branch through here. Parameters/triggers drive transitions,
* mirroring the Unity Animator's SetFloat/SetBool/SetTrigger model.
*
* The transition evaluator ({@link evaluateAnimatorTransitions}) is pure — no
* World, no side effects — so it is fully unit-testable.
*/
/** What a `.esanimator` this build writes claims. */
const Ke = 2;
/** How many state machines run on one entity: the base layer and those over it. */
function qe(e) {
	return 1 + (e.layers?.length ?? 0);
}
/**
* Layer `index`'s active state. Read and written through here so each layer's
* state has one home: the base layer's is `currentState`, which is what a
* single-layer controller has always had and what every reader of one expects.
*/
function Je(e, t) {
	return t === 0 ? e.currentState : e.layerStates?.[t - 1] ?? "";
}
function Ye(e, t, n) {
	if (t === 0) {
		e.currentState = n;
		return;
	}
	if (!e.layerStates) e.layerStates = [];
	while (e.layerStates.length < t) e.layerStates.push("");
	e.layerStates[t - 1] = n;
}
/** Layer `index`, the base one at 0. Null for an index the controller has not got. */
function Xe(e, t) {
	if (t === 0) return e;
	return e.layers?.[t - 1] ?? null;
}
/**
* Every machine a controller runs, base layer first. The ONE way to walk them: a
* reader that reaches for `def.states` sees the base layer and calls it the
* controller, which is how the loader shipped acquiring no clip any layer played
* — silent in a real project, green in every hand-built test.
*/
function Ze(e) {
	return [e, ...e.layers ?? []];
}
function Qe(e, t, n) {
	switch (e.op) {
		case "gt": return Number(t[e.param] ?? 0) > e.value;
		case "lt": return Number(t[e.param] ?? 0) < e.value;
		case "eq": return Number(t[e.param] ?? 0) === e.value;
		case "neq": return Number(t[e.param] ?? 0) !== e.value;
		case "true": return t[e.param] === true;
		case "false": return t[e.param] === false;
		case "trigger": return n.has(e.param);
	}
}
/** First transition in `list` that is ready (conditions hold; exit time met if
*  required), with the triggers it used. */
function $e(e, t, n, r) {
	for (const i of e) {
		if (i.hasExitTime && !r) continue;
		const e = [];
		let a = true;
		for (const r of i.conditions) {
			if (!Qe(r, t, n)) {
				a = false;
				break;
			}
			if (r.op === "trigger") e.push(r.param);
		}
		if (a) return {
			to: i.to,
			usedTriggers: e,
			fadeDuration: i.duration ?? 0
		};
	}
	return null;
}
/**
* Evaluate one step of the state machine. Any-state transitions are checked
* before the current state's. `clipFinished` gates `hasExitTime` transitions
* (true = the current clip has ended); it defaults true so transitions without
* exit time are unaffected. Returns the next state (or null to stay) and the
* triggers a fired transition consumed. Pure.
*/
function et(e, t, n, r, i = true) {
	const a = $e(e.anyStateTransitions ?? [], n, r, i);
	const o = e.states.find((e) => e.name === t);
	const s = a ?? $e(o?.transitions ?? [], n, r, i);
	return s ? {
		next: s.to,
		consumedTriggers: s.usedTriggers
	} : {
		next: null,
		consumedTriggers: []
	};
}
/** The active state is a `/`-separated path of state names (e.g. `Combat/Attack1`). */
const tt = "/";
/**
* Descend from state `name` in `scope` to a concrete leaf, returning the path
* segments. A container state (one with a `stateMachine`) recurses into its
* `initialState`; a normal state ends the path.
*/
function $(e, t) {
	const n = e.states.find((e) => e.name === t);
	if (!n || !n.stateMachine) return [t];
	return [t, ...$(n.stateMachine, n.stateMachine.initialState)];
}
/** Resolve a path to its scope/state chain, or null if any segment is unknown. */
function nt(e, t) {
	if (t.length === 0) return null;
	const n = [];
	const r = [];
	let i = e;
	for (const e of t) {
		const t = i.states.find((t) => t.name === e);
		if (!t) return null;
		n.push(i);
		r.push(t);
		if (!t.stateMachine) break;
		i = t.stateMachine;
	}
	return {
		scopes: n,
		states: r
	};
}
/**
* Evaluate one step of a (possibly nested) state machine over a path. Transitions
* are checked highest-priority first: top-level any-state, then each enclosing
* machine's any-state from outermost in, then the leaf's own transitions, then the
* container exit transitions from innermost out. A fired transition's `to` is
* resolved within the machine that owns it (descending into a sub-machine's
* initial state when needed). `clipFinished` reflects the leaf clip. Pure.
*/
function rt(e, t, n, r, i = true) {
	const a = t ? t.split("/") : [];
	const o = nt(e, a);
	if (!o) return {
		nextPath: null,
		consumedTriggers: [],
		fadeDuration: 0
	};
	const { scopes: s, states: c } = o;
	const l = c.length;
	const u = [];
	u.push({
		list: e.anyStateTransitions ?? [],
		scope: e,
		base: []
	});
	for (let e = 0; e < l - 1; e++) {
		const t = c[e].stateMachine;
		u.push({
			list: t.anyStateTransitions ?? [],
			scope: t,
			base: a.slice(0, e + 1)
		});
	}
	u.push({
		list: c[l - 1].transitions ?? [],
		scope: s[l - 1],
		base: a.slice(0, l - 1)
	});
	for (let e = l - 2; e >= 0; e--) u.push({
		list: c[e].transitions ?? [],
		scope: s[e],
		base: a.slice(0, e)
	});
	for (const e of u) {
		const t = $e(e.list, n, r, i);
		if (t) return {
			nextPath: [...e.base, ...$(e.scope, t.to)].join("/"),
			consumedTriggers: t.usedTriggers,
			fadeDuration: t.fadeDuration
		};
	}
	return {
		nextPath: null,
		consumedTriggers: [],
		fadeDuration: 0
	};
}
/** The leaf (motion-bearing) state of a resolved path, or null if unresolvable. */
function it(e, t) {
	const n = nt(e, t ? t.split("/") : []);
	return n ? n.states[n.states.length - 1] : null;
}
/**
* Select a 1D blend's clip for a parameter value: the threshold with the
* greatest `value` ≤ `value`, clamped up to the first stop when below all.
* Pure. Returns `{ clip: '' }` for an empty blend.
*/
function at(e, t) {
	const n = [...e.thresholds].sort((e, t) => e.value - t.value);
	if (n.length === 0) return {
		value: 0,
		clip: ""
	};
	let r = n[0];
	for (const e of n) if (t >= e.value) r = e;
	else break;
	return r;
}
/** Motion kind for a Spine animation; the spine module registers its driver. */
const ot = "spine";
/**
* Migrated motions, keyed by the state that spelled one the single-kind way.
* A controller's states are stable objects, so this converts once rather than
* every frame — and keeps `motionOf` free to return a fresh shape without
* allocating one per tick.
*/
const st = /* @__PURE__ */ new WeakMap();
/** How much faster than the clock a state's own clock runs: its speed parameter's value, or 1 for a state that names none. */
function ct(e, t) {
	if (!e.speedParameter) return 1;
	const n = t[e.speedParameter];
	return typeof n === "number" && n > 0 ? n : typeof n === "number" ? 0 : 1;
}
/** A legacy 1D blend over sprite clips, as the equivalent blend over motions.
*  A stop's own speed/loop wins over the state's, which is what it did before. */
function lt(e, t) {
	return {
		kind: "blend1d",
		parameter: t.parameter,
		thresholds: t.thresholds.map((t) => ({
			value: t.value,
			motion: {
				kind: z,
				clip: t.clip,
				speed: t.speed ?? e.speed,
				loop: t.loop ?? e.loop
			}
		}))
	};
}
/**
* What `clip`, `blend` or `spine` mean as a {@link AnimatorMotion} — each is one
* kind's own word for what `motion` says generally. Pure, so the migration and
* the runtime's cache share one conversion rather than two that can drift.
*/
function ut(e) {
	if (e.spine) return {
		kind: ot,
		clip: e.spine.animation,
		loop: e.spine.loop
	};
	if (e.blend) return lt(e, e.blend);
	if (e.clip) return {
		kind: z,
		clip: e.clip,
		speed: e.speed,
		loop: e.loop
	};
	return null;
}
/**
* What a state plays. A file is normalized on load, so this converts only for a
* controller built in code with the older fields — which nothing new writes, and
* which stays readable rather than becoming a silent no-motion.
* Null for a state with no motion of its own (a container).
*/
function dt(e) {
	if (e.motion) return e.motion;
	const t = st.get(e);
	if (t !== void 0) return t;
	const n = ut(e);
	st.set(e, n);
	return n;
}
/** Merge a controller's declared parameter defaults with per-entity overrides. */
function ft(e, t) {
	const n = {};
	for (const t of e.parameters) {
		if (t.type === "trigger") continue;
		n[t.name] = t.default ?? (t.type === "bool" ? false : 0);
	}
	for (const [e, r] of t) n[e] = r;
	return n;
}
/**
* A state machine over clips: the controller decides which clip plays from the
* parameters a game writes, so gameplay sets `speed` or fires a trigger rather
* than naming a clip.
*
* @beta
*/
const pt = e("Animator", {
	controller: "",
	avatar: "",
	currentState: "",
	layerStates: [],
	enabled: true
}, {
	assetFields: [{
		field: "controller",
		type: "animatorcontroller"
	}, {
		field: "avatar",
		type: "avatar"
	}],
	discoverAssets: (e) => {
		const t = [];
		const n = e.controller;
		if (typeof n === "string" && (n.endsWith(".esanimator") || a(n))) t.push({
			type: "animatorcontroller",
			path: n
		});
		const r = e.avatar;
		if (typeof r === "string" && (r.endsWith(".esavatar") || a(r))) t.push({
			type: "avatar",
			path: r
		});
		return t;
	}
});
/**
* Controllers a game registered in CODE by path, process-wide. Not where a
* `.esanimator` lands — an asset belongs to the realm that loaded it, which is
* why {@link AnimatorControllerAPI.getController} asks its own registrations,
* then its realm, and only then here.
*/
const mt = /* @__PURE__ */ new Map();
/** Register a controller under `key` (an asset path); the loader and any code
*  path that keys by path share this store. */
function ht(e, t) {
	mt.set(e, t);
}
function gt(e) {
	return mt.get(e);
}
/** Drop all path-registered controllers (tests / hot-reload). */
function _t() {
	mt.clear();
}
/**
* Owns one App's animator-controller registry and per-entity parameter/trigger
* values, evaluates each Animator's state machine, and drives the entity's
* SpriteAnimator clip on state changes. Published as the {@link AnimatorController}
* resource; read it as `app.getResource(AnimatorController)`.
*/
var vt = class {
	constructor() {
		this.assetControllers_ = null;
		this.assetAvatars_ = null;
		this.controllers = /* @__PURE__ */ new Map();
		this.params = /* @__PURE__ */ new Map();
		this.triggers = /* @__PURE__ */ new Map();
		this.runtimes_ = /* @__PURE__ */ new Map();
		this.motions_ = new A();
		this.groundProbe_ = null;
		this.spentTriggers_ = [];
		this.eventScratch_ = [];
		this.rootScratch_ = {
			position: {
				x: 0,
				y: 0,
				z: 0
			},
			rotation: {
				w: 1,
				x: 0,
				y: 0,
				z: 0
			}
		};
		this.motions_.register(z, pe);
		this.motions_.register("blend1d", re);
		this.motions_.register("blend2d", fe);
	}
	/**
	* Teach this animator a kind of motion. Called by the plugin that owns the
	* kind (TimelinePlugin, SpinePlugin); a state naming an unregistered kind is
	* inert rather than an error, since a scene may be authored against a module
	* this build does not load.
	*/
	registerMotionDriver(e, t) {
		this.motions_.register(e, t);
	}
	/** Whether some driver can play `kind` here. */
	hasMotionDriver(e) {
		return this.motions_.has(e);
	}
	/** What foot-plant constraints ask about the ground; a physics plugin wires it. Without one they leave the clip's feet alone. */
	setGroundProbe(e) {
		this.groundProbe_ = e;
	}
	/** Inject the Spine driver (SpinePlugin wires SpineManager here). Optional —
	*  without it, spine-targeting states are inert. */
	setSpineDriver(e) {
		if (!e) {
			this.motions_.unregister(ot);
			return;
		}
		this.motions_.register(ot, {
			apply: (t, n, r) => {
				if (r) e.setAnimation(t.entity, n.clip, n.loop ?? true);
			},
			isFinished: () => false
		});
	}
	registerController(e, t) {
		this.controllers.set(e, t);
	}
	unregisterController(e) {
		this.controllers.delete(e);
	}
	/**
	* @internal Where a `.esanimator` comes from: this app's realm. Set by the
	* animation plugin; without one only code registrations answer.
	*/
	useAssetControllers(e) {
		this.assetControllers_ = e;
	}
	/** Where a `.esavatar` comes from. Same shape as the controller source, and
	*  optional for the same reason: without one, every path resolves as itself. */
	useAssetAvatars(e) {
		this.assetAvatars_ = e;
	}
	/** This rig's avatar, or null where its clips need no translating. */
	avatarOf(e) {
		return e ? this.assetAvatars_?.(e) ?? null : null;
	}
	getController(e) {
		return this.controllers.get(e) ?? this.assetControllers_?.(e) ?? gt(e);
	}
	clearControllers() {
		this.controllers.clear();
	}
	setFloat(e, t, n) {
		this.paramStore(e).set(t, n);
	}
	setBool(e, t, n) {
		this.paramStore(e).set(t, n);
	}
	setTrigger(e, t) {
		this.triggerStore(e).add(t);
	}
	resetTrigger(e, t) {
		this.triggers.get(e)?.delete(t);
	}
	getFloat(e, t) {
		return Number(this.params.get(e)?.get(t) ?? 0);
	}
	getBool(e, t) {
		return this.params.get(e)?.get(t) === true;
	}
	/** Drop an entity's parameter/trigger/playback state (wire to world.onDespawn). */
	removeEntity(e) {
		this.params.delete(e);
		this.triggers.delete(e);
		this.runtimes_.delete(e);
	}
	paramStore(e) {
		let t = this.params.get(e);
		if (!t) {
			t = /* @__PURE__ */ new Map();
			this.params.set(e, t);
		}
		return t;
	}
	triggerStore(e) {
		let t = this.triggers.get(e);
		if (!t) {
			t = /* @__PURE__ */ new Set();
			this.triggers.set(e, t);
		}
		return t;
	}
	/**
	* `dt` seconds advance the animator's own clock, which is what a sampled
	* motion is evaluated against and what a crossfade progresses on. `events`
	* is where what the clips declared is posted; without one the animator still
	* runs and simply says nothing, which is what a bare App is.
	*/
	update(e, t = 0, n) {
		const r = e.getEntitiesWithComponents([pt]);
		for (const i of r) {
			const r = e.get(i, pt);
			if (!r.enabled) continue;
			const a = this.getController(r.controller);
			if (!a || Ze(a).every((e) => e.states.length === 0)) continue;
			const o = qe(a);
			const s = ft(a, this.params.get(i) ?? xt);
			const c = this.avatarOf(r.avatar);
			const l = this.avatarOf(a.avatar);
			const u = De(e, c);
			const d = Ce(l, c);
			const f = this.motions_.context(e, i, s, u);
			const p = this.runtimeFor(i, o);
			p.composed.reset();
			let m = false;
			this.spentTriggers_.length = 0;
			for (let s = 0; s < o; s++) m = this.stepLayer(e, i, r, a, s, f, p, t, n, d) || m;
			const h = this.triggers.get(i);
			if (h) for (const e of this.spentTriggers_) h.delete(e);
			if (m && c && l) Oe(p.composed, i, l, c, u, e);
			if (m && a.ik?.length) Ge(e, i, p.composed, a.ik, s, u, this.groundFor(p, t));
			if (m) p.composed.applyTo(e);
		}
	}
	/**
	* Run one layer: its own clock, its own transitions, its own pose — laid over
	* what the layers under it already put in `rt.composed`. Answers whether it
	* left anything there, a layer driving a sprite sheet having written the
	* entity directly instead.
	*/
	stepLayer(e, t, n, r, i, a, o, s, c, l) {
		const u = Xe(r, i);
		if (!u || u.states.length === 0) return false;
		let d = Je(n, i);
		let f = d ? it(u, d) : null;
		if (!f) {
			d = $(u, u.initialState).join("/");
			f = it(u, d);
			if (!f) return false;
		}
		const p = a.params;
		const m = this.triggers.get(t);
		const h = o.layers[i];
		this.advance(h, s * ct(f, p));
		const g = dt(f);
		const _ = g !== null && this.motionEnded(a, g, h.time);
		const { nextPath: v, consumedTriggers: y, fadeDuration: b } = rt(u, d, p, m ?? St, _);
		for (const e of y) this.spentTriggers_.push(e);
		const x = v ?? d;
		const S = x !== Je(n, i);
		if (S) {
			Ye(n, i, x);
			e.insert(t, pt, n);
		}
		const C = v ? it(u, x) : f;
		if (!C) return false;
		const w = C === f ? g : dt(C);
		if (S) this.beginState(h, g, f.rootMotion === true, w, b);
		const T = i === 0 && C.rootMotion === true;
		const E = i === 0 ? 1 : r.layers[i - 1].weight ?? 1;
		const D = w !== null && E > 0 && this.poseLayer(e, a, h, w, T, S);
		if (D) this.compose(e, a, r, i, o, D, w);
		const O = {
			from: h.prevTime,
			to: h.time,
			inclusiveStart: h.entered
		};
		if (w) this.emitEvents(a, t, w, O, c);
		if (i === 0) this.publishRootMotion(e, t, a, w, O, T, l);
		return D !== null;
	}
	/**
	* Put `pose` into the stack. The base layer states it outright; a layer over
	* it leans the stack toward what it says, or adds what it says beyond its own
	* rest pose — neither of which commutes, which is the whole difference
	* between this and the pose mixer a crossfade uses.
	*/
	compose(e, t, n, r, i, a, o) {
		if (r === 0) {
			ve(i.composed, a, 1, e, null);
			return;
		}
		const s = n.layers[r - 1];
		const c = s.weight ?? 1;
		const l = this.reachFor(e, t.entity, i.layers[r], s.mask, t.resolveJoint);
		if (s.blend !== "additive") {
			ve(i.composed, a, c, e, l);
			return;
		}
		i.rest.reset();
		t.extractRootMotion = false;
		if (t.sample(o, 0, i.rest)) ye(i.composed, a, i.rest, c, e, l);
	}
	/**
	* Post what the ACTIVE motion crossed. A motion being faded out states
	* nothing: its clock is still running, so an attack cancelled into a dodge
	* would go on landing its hit, and "how much of it is still on screen" is not
	* an answer to whether it happened.
	*/
	emitEvents(e, t, n, r, i) {
		const a = this.eventScratch_;
		a.length = 0;
		e.events(n, r, a);
		for (const e of a) i?.send({
			entity: t,
			name: e.name,
			value: e.value,
			text: e.text
		});
	}
	/**
	* State what the animation asks to move, for gameplay to hand on. World space,
	* because a consumer wants "move me this way" rather than a vector in a frame
	* it has to reconstruct; and paired with the seconds it covers, because the
	* consumer usually steps on a different clock than this one.
	*/
	publishRootMotion(e, t, r, i, a, o, c) {
		if (!e.has(t, Q)) return;
		const l = this.rootScratch_;
		const u = o && e.get(t, Q).enabled;
		const d = u && i !== null && r.rootDelta(i, a, l);
		const f = d ? l.position : yt;
		const p = d ? l.rotation : bt;
		const m = e.has(t, n) ? e.get(t, n).rotation : null;
		const h = m ? s.rotate(m, f) : f;
		e.update(t, Q, (e) => {
			e.active = u;
			e.deltaPosition.x = h.x * c;
			e.deltaPosition.y = h.y * c;
			e.deltaPosition.z = h.z * c;
			e.deltaRotation.w = p.w;
			e.deltaRotation.x = p.x;
			e.deltaRotation.y = p.y;
			e.deltaRotation.z = p.z;
			e.deltaTime = u ? a.to - a.from : 0;
		});
	}
	/**
	* Enter a state: the clock restarts, and the motion being left keeps running
	* as the thing to fade out of. Only when BOTH can be sampled - a switched
	* motion has no partial state to hold, so a fade over one would be a pause.
	*/
	beginState(e, t, n, r, i) {
		if (i > 0 && t !== null && r !== null && this.canSample(t) && this.canSample(r)) {
			e.fadeFrom = t;
			e.fadeFromRoot = n;
			e.fadeFromTime = e.time;
			e.fadeElapsed = 0;
			e.fadeDuration = i;
		} else e.fadeFrom = null;
		e.time = 0;
		e.prevTime = 0;
		e.entered = true;
	}
	/** Advance the state's clock, and the fade's if one is running. */
	advance(e, t) {
		e.prevTime = e.time;
		e.entered = false;
		e.time += t;
		if (e.fadeFrom === null) return;
		e.fadeFromTime += t;
		e.fadeElapsed += t;
		if (e.fadeElapsed >= e.fadeDuration) e.fadeFrom = null;
	}
	/** This layer's mask against this rig, or null where it writes all of it. */
	reachFor(e, t, n, r, i) {
		if (!r) return null;
		const a = n.reach ?? (n.reach = new be());
		a.resolve(e, t, r, i);
		return a;
	}
	/**
	* What this layer's motion says, as a pose for the stack to compose — two
	* composed here already when a fade is running, mixing being the operation
	* that does not care which was sampled first. Null for a motion that can only
	* be driven, a sprite sheet writing the entity itself and joining no stack.
	*/
	poseLayer(e, t, n, r, i, a) {
		if (n.fadeFrom !== null) {
			n.poseFrom.reset();
			n.poseTo.reset();
			t.extractRootMotion = n.fadeFromRoot;
			const a = t.sample(n.fadeFrom, n.fadeFromTime, n.poseFrom);
			t.extractRootMotion = i;
			const o = t.sample(r, n.time, n.poseTo);
			if (a && o) {
				const t = Math.min(n.fadeElapsed / n.fadeDuration, 1);
				n.mixed.reset();
				n.fade[0].pose = n.poseFrom;
				n.fade[0].weight = 1 - t;
				n.fade[1].pose = n.poseTo;
				n.fade[1].weight = t;
				S(n.fade, n.mixed, e, 2);
				return n.mixed;
			}
			n.fadeFrom = null;
		}
		n.poseTo.reset();
		t.extractRootMotion = i;
		if (t.sample(r, n.time, n.poseTo)) return n.poseTo;
		t.drive(r, a);
		return null;
	}
	/** Whether a motion has run out. A clip whose length the driver states is
	*  judged against our clock; anything else answers for itself. */
	motionEnded(e, t, n) {
		if (e.loops(t)) return false;
		const r = e.duration(t);
		return r > 0 ? n >= r : e.finished(t);
	}
	canSample(e) {
		return this.motions_.driverFor(e)?.sample !== void 0;
	}
	/**
	* This entity's clocks, grown to the controller it is now running. Grown and
	* not rebuilt: a controller swapped for one with more layers keeps the base
	* layer mid-clip, which is what the entity is visibly doing.
	*/
	groundFor(e, t) {
		const n = e.ground ??= {
			probe: null,
			dt: 0,
			memory: /* @__PURE__ */ new Map()
		};
		n.probe = this.groundProbe_;
		n.dt = t;
		return n;
	}
	runtimeFor(e, t) {
		let n = this.runtimes_.get(e);
		if (!n) {
			n = {
				layers: [],
				composed: new u(),
				rest: new u()
			};
			this.runtimes_.set(e, n);
		}
		while (n.layers.length < t) n.layers.push({
			time: 0,
			prevTime: 0,
			entered: true,
			fadeFrom: null,
			fadeFromRoot: false,
			fadeFromTime: 0,
			fadeElapsed: 0,
			fadeDuration: 0,
			poseFrom: new u(),
			poseTo: new u(),
			mixed: new u(),
			fade: [{
				pose: null,
				weight: 0
			}, {
				pose: null,
				weight: 0
			}]
		});
		return n;
	}
};
const yt = {
	x: 0,
	y: 0,
	z: 0
};
const bt = {
	w: 1,
	x: 0,
	y: 0,
	z: 0
};
const xt = /* @__PURE__ */ new Map();
const St = /* @__PURE__ */ new Set();
/**
* Per-App animator resource (controller registry + per-entity parameters),
* published by `AnimationPlugin`. Read as `app.getResource(AnimatorController)`.
*/
const Ct = i(null, "AnimatorController");
//#endregion
export { be as A, ue as B, Q as C, Ee as D, De as E, A as F, h as G, k as H, re as I, j as L, ve as M, z as N, Se as O, pe as P, fe as R, Ye as S, xe as T, te as U, O as V, E as W, ut as _, ot as a, ft as b, qe as c, $ as d, rt as f, it as g, Je as h, vt as i, ye as j, Ce as k, Ze as l, gt as m, pt as n, tt as o, et as p, Ct as r, Xe as s, Ke as t, _t as u, dt as v, Ge as w, at as x, ht as y, F as z };

//# sourceMappingURL=Animator.js.map