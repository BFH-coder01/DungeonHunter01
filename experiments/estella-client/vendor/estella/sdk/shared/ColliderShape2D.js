import { f as e, i as t, n, r, t as i, u as a } from "./PhysicsComponents.js";
//#region src/physics/polygonHull2D.ts
/**
* The most vertices Box2D stores in ONE polygon (`B2_MAX_POLYGON_VERTICES`). It
* caps a convex piece, not what an author may draw: a ring past it is divided
* into pieces that each fit.
*/
const o = 8;
/** Fewer than a triangle is not a polygon: Box2D builds no shape from it. */
const s = 3;
/** `B2_LINEAR_SLOP`, at the engine's length unit of one metre per metre. */
const c = .005;
const l = (e, t) => e.x * t.y - e.y * t.x;
const u = (e, t) => ({
	x: e.x - t.x,
	y: e.y - t.y
});
const d = (e, t) => (e.x - t.x) ** 2 + (e.y - t.y) ** 2;
function f(e) {
	const t = Math.hypot(e.x, e.y);
	return t > 0 ? {
		x: e.x / t,
		y: e.y / t
	} : {
		x: 0,
		y: 0
	};
}
/** Quickhull's recursion: the hull of `ps` strictly right of the edge p1→p2. */
function p(e, t, n) {
	if (n.length === 0) return [];
	const r = f(u(t, e));
	const i = [];
	let a = 0;
	let o = l(u(n[0], e), r);
	if (o > 0) i.push(n[0]);
	for (let t = 1; t < n.length; t++) {
		const s = l(u(n[t], e), r);
		if (s > o) {
			a = t;
			o = s;
		}
		if (s > 0) i.push(n[t]);
	}
	if (o < 2 * c) return [];
	const s = n[a];
	return [
		...p(e, s, i),
		s,
		...p(s, t, i)
	];
}
/**
* The convex hull Box2D builds from `vertices`, counter-clockwise, in metres.
* Empty when Box2D builds no shape: fewer than three vertices survive welding,
* or every surviving one is collinear.
*/
function m(e) {
	if (e.length < 3) return [];
	const t = e.slice(0, 8);
	const n = 16 * c * c;
	let r = {
		x: Infinity,
		y: Infinity
	};
	let i = {
		x: -Infinity,
		y: -Infinity
	};
	const a = [];
	for (const e of t) {
		r = {
			x: Math.min(r.x, e.x),
			y: Math.min(r.y, e.y)
		};
		i = {
			x: Math.max(i.x, e.x),
			y: Math.max(i.y, e.y)
		};
		if (!a.some((t) => d(e, t) < n)) a.push(e);
	}
	if (a.length < 3) return [];
	const o = {
		x: (r.x + i.x) / 2,
		y: (r.y + i.y) / 2
	};
	let s = 0;
	for (let e = 1; e < a.length; e++) if (d(o, a[e]) > d(o, a[s])) s = e;
	const m = a[s];
	a[s] = a[a.length - 1];
	a.pop();
	s = 0;
	for (let e = 1; e < a.length; e++) if (d(m, a[e]) > d(m, a[s])) s = e;
	const g = a[s];
	a[s] = a[a.length - 1];
	a.pop();
	const _ = f(u(g, m));
	const v = [];
	const y = [];
	for (const e of a) {
		const t = l(u(e, m), _);
		if (t >= 2 * c) v.push(e);
		else if (t <= -2 * c) y.push(e);
	}
	const b = p(m, g, v);
	const x = p(g, m, y);
	if (b.length === 0 && x.length === 0) return [];
	return h([
		m,
		...b,
		g,
		...x
	]);
}
/** Drop every vertex its two neighbours already span, until none is left. */
function h(e) {
	for (let t = true; t && e.length > 2;) {
		t = false;
		for (let n = 0; n < e.length; n++) {
			const r = e[n];
			const i = e[(n + 1) % e.length];
			const a = e[(n + 2) % e.length];
			if (l(u(i, r), f(u(a, r))) <= 2 * c) {
				e.splice((n + 1) % e.length, 1);
				t = true;
				break;
			}
		}
	}
	return e;
}
//#endregion
//#region src/physics/polygonDecompose2D.ts
/** Points nearer than this are one point, matching the hull's own welding. */
const g = .02;
/** Box2D's linear slop; {@link WELD} is the 4x radius its hull welds within. */
const _ = g / 4;
const v = (e, t, n, r) => e * r - t * n;
/** The turn at `b` walking a → b → c. Positive is a left turn, so convex in CCW. */
function y(e, t, n) {
	return v(t.x - e.x, t.y - e.y, n.x - t.x, n.y - t.y);
}
/**
* Whether the ring encloses more than slop. Area against PERIMETER, because area
* alone has no scale to be small against: a long thin sliver and a small honest
* triangle measure alike, and only one of them is a shape Box2D builds.
*/
function b(e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) {
		const r = e[n];
		const i = e[(n + 1) % e.length];
		t += Math.hypot(i.x - r.x, i.y - r.y);
	}
	return Math.abs(x(e)) > 2 * _ * t;
}
/** Twice the signed area of a ring: positive counter-clockwise. */
function x(e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) {
		const r = e[n];
		const i = e[(n + 1) % e.length];
		t += v(r.x, r.y, i.x, i.y);
	}
	return t;
}
/** No right turn anywhere. Collinear joints pass: Box2D merges those away itself. */
function S(e) {
	for (let t = 0; t < e.length; t++) {
		const n = e[(t + e.length - 1) % e.length];
		const r = e[t];
		const i = e[(t + 1) % e.length];
		if (y(n, r, i) < 0) return false;
	}
	return true;
}
/**
* Whether two segments cross at a point interior to BOTH. Touching — an endpoint
* on a segment, two collinear runs — is not a crossing: a ring may legitimately
* fold back onto its own corner, and only a real crossing has no partition.
*/
function C(e, t, n, r) {
	const i = v(t.x - e.x, t.y - e.y, n.x - e.x, n.y - e.y);
	const a = v(t.x - e.x, t.y - e.y, r.x - e.x, r.y - e.y);
	const o = v(r.x - n.x, r.y - n.y, e.x - n.x, e.y - n.y);
	const s = v(r.x - n.x, r.y - n.y, t.x - n.x, t.y - n.y);
	return i !== 0 && a !== 0 && o !== 0 && s !== 0 && i > 0 !== a > 0 && o > 0 !== s > 0;
}
/**
* Whether any two non-adjacent edges cross. Asked outright rather than inferred
* from ear clipping running out of ears: a self-crossing ring often still yields
* ears, and the triangulation it yields covers the wrong area in silence.
*/
function w(e) {
	const t = e.length;
	for (let n = 0; n < t; n++) for (let r = n + 2; r < t; r++) {
		if (n === 0 && r === t - 1) continue;
		if (C(e[n], e[(n + 1) % t], e[r], e[(r + 1) % t])) return true;
	}
	return false;
}
/** Inside or ON the boundary of a counter-clockwise triangle. */
function T(e, t, n, r) {
	return v(n.x - t.x, n.y - t.y, e.x - t.x, e.y - t.y) >= 0 && v(r.x - n.x, r.y - n.y, e.x - n.x, e.y - n.y) >= 0 && v(t.x - r.x, t.y - r.y, e.x - r.x, e.y - r.y) >= 0;
}
/** The ring with consecutive duplicates removed, wound counter-clockwise. */
function E(e) {
	const t = [];
	for (const n of e) {
		const e = t[t.length - 1];
		if (e && Math.hypot(n.x - e.x, n.y - e.y) < g) continue;
		t.push({
			x: n.x,
			y: n.y
		});
	}
	const n = t[0];
	const r = t[t.length - 1];
	if (t.length > 1 && n && r && Math.hypot(n.x - r.x, n.y - r.y) < g) t.pop();
	if (t.length >= 3 && x(t) < 0) t.reverse();
	return t;
}
/**
* Triangles as index triples, or null when no ear can be found — which a simple
* ring always has, so failing means this one is not simple: it crosses itself,
* and no partition of it exists to compute.
*/
function D(e) {
	const t = e.map((e, t) => t);
	const n = [];
	const r = (n) => y(e[t[(n + t.length - 1) % t.length]], e[t[n]], e[t[(n + 1) % t.length]]);
	while (t.length > 3) {
		let i = -1;
		for (let a = 0; a < t.length; a++) {
			const o = t[(a + t.length - 1) % t.length];
			const s = t[a];
			const c = t[(a + 1) % t.length];
			if (y(e[o], e[s], e[c]) <= 0) continue;
			let l = false;
			for (let n = 0; n < t.length && !l; n++) {
				const i = t[n];
				if (i === o || i === s || i === c) continue;
				if (r(n) > 0) continue;
				if (T(e[i], e[o], e[s], e[c])) l = true;
			}
			if (l) continue;
			n.push([
				o,
				s,
				c
			]);
			i = a;
			break;
		}
		if (i < 0) return null;
		t.splice(i, 1);
	}
	n.push([
		t[0],
		t[1],
		t[2]
	]);
	return n;
}
/** The two pieces joined along the edge they share, or null when they share none. */
function O(e, t) {
	for (let n = 0; n < e.length; n++) {
		const r = e[n];
		const i = e[(n + 1) % e.length];
		for (let a = 0; a < t.length; a++) {
			if (t[a] !== i || t[(a + 1) % t.length] !== r) continue;
			const o = [];
			for (let t = 0; t < e.length - 1; t++) o.push(e[(n + 1 + t) % e.length]);
			for (let e = 0; e < t.length - 1; e++) o.push(t[(a + 1 + e) % t.length]);
			return {
				ring: o,
				u: r,
				v: i
			};
		}
	}
	return null;
}
/**
* Merge neighbours back while each result stays convex and within the cap,
* longest shared edge first. The candidate is tested for convexity outright
* rather than at the two joints the merge creates: on a polygon capped at eight
* vertices that walk is cheaper than being clever, and cannot mistake a winding.
*/
function k(e, t) {
	const n = (t, n) => t * e.length + n;
	for (;;) {
		const r = /* @__PURE__ */ new Map();
		for (let e = 0; e < t.length; e++) {
			const i = t[e];
			for (let t = 0; t < i.length; t++) r.set(n(i[t], i[(t + 1) % i.length]), e);
		}
		let i = -1;
		let a = -1;
		let o = -1;
		let s = null;
		for (let c = 0; c < t.length; c++) {
			const l = t[c];
			for (let u = 0; u < l.length; u++) {
				const d = r.get(n(l[(u + 1) % l.length], l[u]));
				if (d === void 0 || d <= c) continue;
				if (l.length + t[d].length - 2 > 8) continue;
				const f = O(l, t[d]);
				if (!f || !S(f.ring.map((t) => e[t]))) continue;
				const p = e[f.u];
				const m = e[f.v];
				const h = (p.x - m.x) ** 2 + (p.y - m.y) ** 2;
				if (h <= i) continue;
				i = h;
				a = c;
				o = d;
				s = f.ring;
			}
		}
		if (!s) return t;
		t.splice(o, 1);
		t[a] = s;
	}
}
/**
* One answer per vertex array: the gizmo asks about the same ring every frame,
* and a hundred-vertex one measures milliseconds to partition. The key is the
* ARRAY, so an edit writes a new one and misses — while a mutation in place hits
* a stale entry, as does the solver, whose shapes that same flag rebuilds.
*/
const A = /* @__PURE__ */ new WeakMap();
/**
* The convex pieces `vertices` collides as. A ring already convex and within the
* cap is ONE piece and the same points, so the common shape costs nothing and
* keeps the identity an author drew.
*/
function j(e) {
	const t = A.get(e);
	if (t) return t;
	const n = M(e);
	A.set(e, n);
	return n;
}
function M(e) {
	const t = E(e);
	if (t.length < 3) return {
		pieces: [],
		degenerate: false
	};
	if (w(t)) return {
		pieces: [m(t)],
		degenerate: true
	};
	if (!b(t)) return {
		pieces: [],
		degenerate: false
	};
	if (t.length <= 8 && S(t)) return {
		pieces: [t],
		degenerate: false
	};
	const n = D(t);
	if (!n) return {
		pieces: [m(t)],
		degenerate: true
	};
	return {
		pieces: k(t, n).map((e) => m(e.map((e) => t[e]))).filter((e) => e.length >= 3),
		degenerate: false
	};
}
//#endregion
//#region src/physics/ColliderShape2D.ts
/** Semicircle-cap segment count for a capsule outline (matches the legacy debug draw). */
const N = 16;
/** Box2D builds no chain below four points; the editor may not author one either. */
const P = 4;
const F = {
	x: 0,
	y: 0
};
/** The collider's local offset in metres (0 for segment/polygon/chain, which have none). */
function I(e) {
	return e.kind === "box" || e.kind === "circle" || e.kind === "capsule" ? e.offset : F;
}
/**
* The shape's world-pixel centre = the entity's world position plus its collider offset
* (metres × ppu) rotated by the entity angle. Every drawer of a collider goes through
* here, so a gizmo and the solver cannot disagree about where the shape is.
*/
function L(e, t, n, r) {
	const i = I(e);
	const a = i.x * r;
	const o = i.y * r;
	const s = Math.cos(n);
	const c = Math.sin(n);
	return {
		x: t.x + a * s - o * c,
		y: t.y + a * c + o * s
	};
}
/**
* The shape's outline in world pixels, rotated by `angle` about `center` (see
* {@link shapeCenter}). Straight-edged shapes return closed/open polylines; a circle
* returns a single {c, r} for the backend to stroke as an arc.
*/
function R(e, t, n, r) {
	const i = Math.cos(n);
	const a = Math.sin(n);
	const o = (e, n) => ({
		x: t.x + e * i - n * a,
		y: t.y + e * a + n * i
	});
	switch (e.kind) {
		case "box": {
			const t = e.halfExtents.x * r;
			const n = e.halfExtents.y * r;
			const i = [
				o(-t, -n),
				o(t, -n),
				o(t, n),
				o(-t, n)
			];
			return {
				polylines: [[...i, i[0]]],
				circles: []
			};
		}
		case "circle": return {
			polylines: [],
			circles: [{
				c: t,
				r: e.radius * r
			}]
		};
		case "capsule": {
			const t = e.radius * r;
			const n = e.halfHeight * r;
			const i = [o(-t, -n), o(-t, n)];
			for (let e = 1; e <= 16; e++) {
				const r = e / 16 * Math.PI;
				i.push(o(-t * Math.cos(r), n + t * Math.sin(r)));
			}
			i.push(o(t, -n));
			for (let e = 1; e <= 16; e++) {
				const r = Math.PI + e / 16 * Math.PI;
				i.push(o(-t * Math.cos(r), -n + t * Math.sin(r)));
			}
			return {
				polylines: [i],
				circles: []
			};
		}
		case "segment": return {
			polylines: [[o(e.point1.x * r, e.point1.y * r), o(e.point2.x * r, e.point2.y * r)]],
			circles: []
		};
		case "polygon": {
			const t = (e) => {
				const t = e.map((e) => o(e.x * r, e.y * r));
				return t.length > 0 ? [[...t, t[0]]] : [];
			};
			const { pieces: n, degenerate: i } = j(e.vertices);
			if (!i && n.length > 0) return {
				polylines: t(e.vertices),
				circles: []
			};
			return {
				polylines: n.flatMap((e) => t(e)),
				circles: [],
				declined: t(e.vertices)
			};
		}
		case "chain": {
			const t = e.points.map((e) => o(e.x * r, e.y * r));
			if (t.length < 2) return {
				polylines: [],
				circles: []
			};
			return {
				polylines: [e.isLoop ? [...t, t[0]] : t],
				circles: []
			};
		}
	}
}
/**
* Read every collider component present on `entity` into shape descriptors, in the same
* order PhysicsSystem's addShapeForEntity dispatches (box, circle, capsule, segment,
* polygon, chain). Chain has no sensor flag, so it reports isSensor: false.
*/
function z(o, s) {
	const c = [];
	const l = (e) => e.enabled !== false;
	if (o.has(s, i)) {
		const e = o.get(s, i);
		c.push({
			shape: {
				kind: "box",
				halfExtents: e.halfExtents,
				offset: e.offset
			},
			isSensor: e.isSensor,
			enabled: l(e)
		});
	}
	if (o.has(s, t)) {
		const e = o.get(s, t);
		c.push({
			shape: {
				kind: "circle",
				radius: e.radius,
				offset: e.offset
			},
			isSensor: e.isSensor,
			enabled: l(e)
		});
	}
	if (o.has(s, n)) {
		const e = o.get(s, n);
		c.push({
			shape: {
				kind: "capsule",
				radius: e.radius,
				halfHeight: e.halfHeight,
				offset: e.offset
			},
			isSensor: e.isSensor,
			enabled: l(e)
		});
	}
	if (o.has(s, e)) {
		const t = o.get(s, e);
		c.push({
			shape: {
				kind: "segment",
				point1: t.point1,
				point2: t.point2
			},
			isSensor: t.isSensor,
			enabled: l(t)
		});
	}
	if (o.has(s, a)) {
		const e = o.get(s, a);
		c.push({
			shape: {
				kind: "polygon",
				vertices: e.vertices
			},
			isSensor: e.isSensor,
			enabled: l(e)
		});
	}
	if (o.has(s, r)) {
		const e = o.get(s, r);
		c.push({
			shape: {
				kind: "chain",
				points: e.points,
				isLoop: e.isLoop
			},
			isSensor: false,
			enabled: l(e)
		});
	}
	return c;
}
//#endregion
export { L as a, o as c, z as i, s as l, P as n, I as o, R as r, j as s, N as t, m as u };

//# sourceMappingURL=ColliderShape2D.js.map