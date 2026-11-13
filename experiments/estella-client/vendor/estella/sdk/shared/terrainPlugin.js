import { $t as e, Ct as t, c as n, dt as r, n as i, qt as a } from "./system.js";
import { s as o } from "./resource.js";
import { s } from "./logger.js";
import { n as c } from "./AssetPlugin.js";
import { O as l, i as u } from "./base.js";
import { o as d } from "./worldUnits.js";
import { n as f } from "./disposeAll.js";
import { n as p, o as m, p as h } from "./resourceManager.js";
import { TextureContent as g } from "../wasm.js";
import { i as _, n as v, r as y } from "./runtimeAssets.js";
import { n as b, r as x } from "./material.js";
import { r as S } from "./collisionGeometry.js";
import { a as C, n as w, t as T } from "./textureRecipe.js";
import { n as E, r as D, s as O } from "./meshFormat.js";
import { o as k, x as A } from "./components.js";
import { c as j, i as M, r as N, t as P } from "./movers.js";
import { t as ee } from "./minHeap.js";
import { t as te } from "./pngData.js";
//#region src/terrain/heightfield.ts
/**
* How a heightmap image holds its heights. The file says how deep its channels are; this says what they mean, so an image is never
* read one way or another by what its pixels happen to hold.
* @experimental
*/
const F = {
	/** The grey (or red) channel is the height, at the depth the file has: 16 bits from a 16-bit PNG, 8 (256 steps) from any other. */
	Grey: 0,
	/** Sixteen bits across two 8-bit channels: red is the high byte, green the low one. */
	RedGreen16: 1
};
/**
* A heightfield from an RGBA image read as data, 0 at its lowest and 1 at its highest, by `format`. `wide` is the first channel at 16
* bits, for an image whose file holds 16 bits a channel.
*/
function I(e, t, n, r = F.Grey, i) {
	const a = new Float32Array(e * t);
	for (let o = 0; o < e * t; o++) a[o] = r === F.RedGreen16 ? (n[o * 4] * 256 + n[o * 4 + 1]) / 65535 : i ? i[o] / 65535 : n[o * 4] / 255;
	return {
		width: e,
		height: t,
		data: a
	};
}
/** A 32-bit integer hash, stable across hosts, so a seed makes the same ground everywhere. */
function L(e, t, n) {
	let r = Math.imul(e, 374761393) + Math.imul(t, 668265263) + Math.imul(n | 0, 2147483647) | 0;
	r = Math.imul(r ^ r >>> 13, 1274126177);
	r = (r ^ r >>> 16) >>> 0;
	return r / 4294967295;
}
function R(e, t, n) {
	const r = Math.floor(e), i = Math.floor(t);
	const a = e - r, o = t - i;
	const s = a * a * (3 - 2 * a), c = o * o * (3 - 2 * o);
	const l = L(r, i, n), u = L(r + 1, i, n);
	const d = L(r, i + 1, n), f = L(r + 1, i + 1, n);
	return l + (u - l) * s + (d + (f - d) * s - (l + (u - l) * s)) * c;
}
/** Fractal noise as a heightfield, scaled to span 0 to 1 so the terrain's height is its true range. */
function ne(e) {
	const t = Math.max(2, Math.floor(e.resolution));
	const n = new Float32Array(t * t);
	const r = Math.min(Math.max(e.warp ?? 0, 0), 1);
	let i = Infinity, a = -Infinity;
	for (let o = 0; o < t; o++) for (let s = 0; s < t; s++) {
		let c = s / (t - 1), l = o / (t - 1);
		if (r > 0) {
			const t = e.frequency;
			const n = R(c * t + 5.2, l * t + 1.3, e.seed + 7001) + .5 * R(c * t * 2 + 2.8, l * t * 2 + 9.1, e.seed + 7002);
			const i = R(c * t + 8.3, l * t + 2.8, e.seed + 7003) + .5 * R(c * t * 2 + 4.4, l * t * 2 + 6.6, e.seed + 7004);
			c += (n / 1.5 * 2 - 1) * r * .5 / t;
			l += (i / 1.5 * 2 - 1) * r * .5 / t;
		}
		let u = 1, d = e.frequency, f = 0, p = 0;
		for (let t = 0; t < Math.max(1, Math.min(8, Math.floor(e.octaves))); t++) {
			let n = R(c * d, l * d, e.seed + t * 101);
			n = n * (1 - e.ridged) + (1 - Math.abs(n * 2 - 1)) * e.ridged;
			f += n * u;
			p += u;
			u *= e.persistence;
			d *= 2;
		}
		const m = f / p;
		n[o * t + s] = m;
		if (m < i) i = m;
		if (m > a) a = m;
	}
	const o = a - i || 1;
	for (let e = 0; e < n.length; e++) n[e] = (n[e] - i) / o;
	return {
		width: t,
		height: t,
		data: n
	};
}
/** The height at (u, v), each 0 to 1 across the field, bilinear between the four samples it falls among. */
function z(e, t, n) {
	const r = Math.min(Math.max(t, 0), 1) * (e.width - 1);
	const i = Math.min(Math.max(n, 0), 1) * (e.height - 1);
	const a = Math.min(Math.floor(r), e.width - 2), o = Math.min(Math.floor(i), e.height - 2);
	const s = r - a, c = i - o;
	const l = (t, n) => e.data[n * e.width + t];
	const u = l(a, o) + (l(a + 1, o) - l(a, o)) * s;
	return u + (l(a, o + 1) + (l(a + 1, o + 1) - l(a, o + 1)) * s - u) * c;
}
/** The unit normal of the ground at (u, v), from the heights a texel either side of it, in world units. */
function re(e, t, n, r, i, a) {
	const o = 1 / (e.width - 1), s = 1 / (e.height - 1);
	const c = (z(e, t + o, n) - z(e, t - o, n)) * a / (2 * o * r);
	const l = (z(e, t, n + s) - z(e, t, n - s)) * a / (2 * s * i);
	const u = Math.hypot(c, 1, l);
	return [
		-c / u,
		1 / u,
		-l / u
	];
}
/**
* Hydraulic erosion: drops of rain fall at random over the field, each runs downhill carrying what it can for its speed and the water in it,
* cuts the ground where it carries less than it could, lays it down where it carries more or slows (in a hollow, on a flat, as it dries),
* and evaporates as it goes. What is left has gullies down the slopes, sharper ridges between them and silt in the valleys, and where the water
* ran is kept as `flow`. The same seed wears the same ground everywhere.
*/
function B(e, t) {
	const n = V(e, t);
	for (;;) {
		const e = n.next();
		if (e.done) return e.value;
	}
}
/** {@link erodeHeightfield} as a job that yields its progress (0 to 1) every few thousand drops, for spreading over frames. */
function* V(e, t) {
	const n = e.width, r = e.height;
	const i = Math.min(6e5, Math.floor(Math.min(Math.max(t.amount, 0), 4) * n * r));
	if (i === 0 || n < 3 || r < 3) return {
		field: e,
		flow: new Float32Array(e.data.length)
	};
	const a = Math.max(t.sizeX / Math.max(n - 1, 1), t.sizeZ / Math.max(r - 1, 1), 1e-6);
	const o = t.height / a;
	const s = new Float32Array(e.data.length);
	for (let t = 0; t < s.length; t++) s[t] = e.data[t] * o;
	const c = new Float32Array(e.data.length);
	const l = ie(t.seed * 7919 + 17), u = .05, d = 4, f = .01, p = .3, m = .3, h = 4, g = 40;
	const _ = 2;
	const v = [];
	let y = 0;
	for (let e = -2; e <= _; e++) for (let t = -2; t <= _; t++) {
		const n = Math.hypot(t, e);
		if (n > _) continue;
		v.push([
			t,
			e,
			1 - n / _
		]);
		y += 1 - n / _;
	}
	for (const e of v) e[2] /= y;
	const b = (e, t) => {
		const i = Math.min(Math.floor(e), n - 2), a = Math.min(Math.floor(t), r - 2);
		const o = e - i, c = t - a;
		const l = a * n + i;
		const u = s[l], d = s[l + 1], f = s[l + n], p = s[l + n + 1];
		return [
			(d - u) * (1 - c) + (p - f) * c,
			(f - u) * (1 - o) + (p - d) * o,
			u * (1 - o) * (1 - c) + d * o * (1 - c) + f * (1 - o) * c + p * o * c
		];
	};
	for (let e = 0; e < i; e++) {
		if (e % 2e3 === 0) yield e / i;
		let t = l() * (n - 1), a = l() * (r - 1);
		let o = 0, _ = 0, y = 1, x = 1, S = 0;
		for (let e = 0; e < g; e++) {
			const e = Math.floor(t), i = Math.floor(a);
			const l = t - e, g = a - i;
			const [C, w, T] = b(t, a);
			o = o * u - C * .95;
			_ = _ * u - w * .95;
			const E = Math.hypot(o, _);
			if (E < 1e-9) break;
			o /= E;
			_ /= E;
			const D = t + o, O = a + _;
			if (D < 0 || D > n - 1.001 || O < 0 || O > r - 1.001) break;
			const k = b(D, O)[2] - T;
			const A = Math.max(-k * y * x * d, f);
			const j = i * n + e;
			c[j] = c[j] + x;
			if (S > A || k > 0) {
				const e = k > 0 ? Math.min(k, S) : (S - A) * p;
				S -= e;
				s[j] = s[j] + e * (1 - l) * (1 - g);
				s[j + 1] = s[j + 1] + e * l * (1 - g);
				s[j + n] = s[j + n] + e * (1 - l) * g;
				s[j + n + 1] = s[j + n + 1] + e * l * g;
			} else {
				const t = Math.min((A - S) * m, -k);
				for (const [a, o, c] of v) {
					const l = e + a, u = i + o;
					if (l < 0 || u < 0 || l >= n || u >= r) continue;
					const d = u * n + l;
					const f = Math.min(s[d], t * c);
					s[d] = s[d] - f;
					S += f;
				}
			}
			y = Math.sqrt(Math.max(y * y - k * h, 0));
			x *= .98;
			t = D;
			a = O;
		}
	}
	const x = new Float32Array(s.length);
	let S = 0;
	for (let e = 0; e < s.length; e++) {
		x[e] = Math.min(Math.max(s[e] / o, 0), 1);
		S = Math.max(S, c[e]);
	}
	const C = Math.log1p(S);
	for (let e = 0; e < c.length; e++) c[e] = C > 0 ? Math.log1p(c[e]) / C : 0;
	return {
		field: {
			width: n,
			height: r,
			data: x
		},
		flow: c
	};
}
/** A small seeded random number generator: the same seed gives the same sequence on every host. */
function ie(e) {
	let t = e >>> 0;
	return () => {
		t = t + 1831565813 | 0;
		let e = Math.imul(t ^ t >>> 15, 1 | t);
		e = e + Math.imul(e ^ e >>> 7, 61 | e) ^ e;
		return ((e ^ e >>> 14) >>> 0) / 4294967296;
	};
}
//#endregion
//#region src/terrain/reach.ts
/**
* @file    reach.ts
* @brief   Whether one place on the ground can be walked to from another, and by what way: a search over the ground itself, held to
*          how steep a walker can climb.
*
* @details The ground is read where it is asked, a cell of `step` at a time, so it works on ground without end and on ground a modifier
*          has just changed, with nothing baked first. A step between two cells is taken when the ground between them is no steeper
*          than `maxSlope` (sampled along it, so a ridge narrower than a cell is not stepped over) and the caller does not refuse the
*          place (deep water, a zone kept clear). The way found is pulled straight wherever a straight walk holds, so it reads as a
*          route, not a staircase of cells. The search is bounded (`maxCells`), and says when it ran out rather than claiming no way.
*/
const ae = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
	[1, 1],
	[1, -1],
	[-1, 1],
	[-1, -1]
];
/**
* Searches the ground for a way from (fromX, fromZ) to (toX, toZ) that a walker held to `maxSlope` can take.
* @experimental
*/
function oe(e, t, n, r, i, a = {}) {
	const o = Math.max(a.step ?? 4, .001);
	const s = Math.tan(Math.min(Math.max(a.maxSlope ?? 35, 0), 89.9) * Math.PI / 180);
	const c = a.blocked;
	const l = Math.max(1, a.maxCells ?? 2e5);
	const u = Math.max(a.detour ?? 1, 0);
	const d = (t, n) => {
		const r = e.heightAt(t, n);
		return r === null || c && c(t, n) ? null : r;
	};
	const f = 3;
	const p = (e, t, n, r, i, a) => {
		const o = Math.hypot(r - e, i - t) / f;
		let c = n;
		for (let n = 1; n <= f; n++) {
			const l = n / f;
			const u = n === f ? a : d(e + (r - e) * l, t + (i - t) * l);
			if (u === null || Math.abs(u - c) > s * o + 1e-6) return false;
			c = u;
		}
		return true;
	};
	const m = d(t, n), h = d(r, i);
	if (m === null || h === null) return {
		state: "noGround",
		path: [],
		length: 0,
		cells: 0
	};
	const g = Math.hypot(r - t, i - n);
	const _ = g * u + o * 4;
	const v = Math.floor((Math.min(t, r) - _ - t) / o), y = Math.ceil((Math.max(t, r) + _ - t) / o);
	const b = Math.floor((Math.min(n, i) - _ - n) / o), x = Math.ceil((Math.max(n, i) + _ - n) / o);
	const S = y - v + 1;
	const C = (e, t) => (t - b) * S + (e - v);
	const w = (e) => t + e * o;
	const T = (e) => n + e * o;
	const E = Math.round((r - t) / o), D = Math.round((i - n) / o);
	const O = /* @__PURE__ */ new Map();
	const k = /* @__PURE__ */ new Map();
	const A = /* @__PURE__ */ new Map();
	const j = /* @__PURE__ */ new Set();
	const M = new ee(1024);
	const N = C(0, 0);
	O.set(N, 0);
	k.set(N, m);
	M.push(N, g);
	let P = N, te = g, F = -1, I = 0, L = false;
	while (M.size > 0) {
		const e = M.pop();
		if (j.has(e)) continue;
		j.add(e);
		if (++I > l) {
			L = true;
			break;
		}
		const t = e % S + v, n = Math.floor(e / S) + b;
		const a = w(t), o = T(n), s = k.get(e);
		const c = Math.hypot(r - a, i - o);
		if (c < te) {
			te = c;
			P = e;
		}
		if (Math.abs(t - E) <= 1 && Math.abs(n - D) <= 1 && p(a, o, s, r, i, h)) {
			F = e;
			break;
		}
		for (const [c, l] of ae) {
			const u = t + c, f = n + l;
			if (u < v || u > y || f < b || f > x) continue;
			const m = C(u, f);
			if (j.has(m)) continue;
			const h = w(u), g = T(f);
			let _ = k.get(m);
			if (_ === void 0) {
				const e = d(h, g);
				if (e === null) {
					j.add(m);
					continue;
				}
				_ = e;
				k.set(m, _);
			}
			if (!p(a, o, s, h, g, _)) continue;
			const S = O.get(e) + Math.hypot(h - a, g - o, _ - s);
			if (S >= (O.get(m) ?? Infinity)) continue;
			O.set(m, S);
			A.set(m, e);
			M.push(m, S + Math.hypot(r - h, i - g));
		}
	}
	const R = F >= 0 ? F : P;
	const ne = [];
	for (let e = R; e !== void 0; e = A.get(e)) ne.push(e);
	ne.reverse();
	const z = ne.map((e) => ({
		x: w(e % S + v),
		y: k.get(e),
		z: T(Math.floor(e / S) + b)
	}));
	z[0] = {
		x: t,
		y: m,
		z: n
	};
	if (F >= 0) z.push({
		x: r,
		y: h,
		z: i
	});
	const re = (e, t) => {
		const n = Math.max(1, Math.ceil(Math.hypot(t.x - e.x, t.z - e.z) / o));
		let r = e.x, i = e.z, a = e.y;
		for (let o = 1; o <= n; o++) {
			const s = o / n;
			const c = e.x + (t.x - e.x) * s, l = e.z + (t.z - e.z) * s;
			const u = o === n ? t.y : d(c, l);
			if (u === null || !p(r, i, a, c, l, u)) return false;
			r = c;
			i = l;
			a = u;
		}
		return true;
	};
	const B = se(z, re);
	let V = 0;
	for (let e = 1; e < B.length; e++) V += Math.hypot(B[e].x - B[e - 1].x, B[e].y - B[e - 1].y, B[e].z - B[e - 1].z);
	return {
		state: F >= 0 ? "reached" : L ? "exhausted" : "unreachable",
		path: B,
		length: V,
		cells: I
	};
}
/** The way with every corner a straight walk can cut left out: each point joined to the farthest one ahead it can walk to directly. */
function se(e, t) {
	if (e.length <= 2) return e;
	const n = [e[0]];
	let r = 0;
	while (r < e.length - 1) {
		let i = r + 1;
		for (let n = Math.min(e.length - 1, r + 64); n > r + 1; n--) if (t(e[r], e[n])) {
			i = n;
			break;
		}
		n.push(e[i]);
		r = i;
	}
	return n;
}
//#endregion
//#region src/terrain/paint.ts
const ce = (e, t, n) => {
	const r = Math.min(Math.max((n - e) / (t - e || 1e-6), 0), 1);
	return r * r * (3 - 2 * r);
};
/** The weights of grass, dirt, snow and rock at a point of ground, by how high (0 to 1 of the terrain) and how steep it is. */
function H(e, t, n) {
	const r = ce(n.rockSlope - .08, n.rockSlope + .08, 1 - t);
	const i = ce(n.snowHeight - .06, n.snowHeight + .06, e) * (1 - r * .85);
	const a = ce(n.dirtHeight - .15, n.dirtHeight + .15, e) * (1 - i) * (1 - r);
	const o = (1 - r) * (1 - i) * (1 - a);
	const s = o + a + i + r || 1;
	return [
		o / s,
		a / s,
		i / s,
		r / s
	];
}
//#endregion
//#region src/terrain/sculpt.ts
/** What a brush does to heights. @experimental */
const le = {
	Raise: 0,
	Lower: 1,
	Smooth: 2,
	Flatten: 3
};
/** The brush's weight at `d` from its centre, 1 over its core, easing (smoothstep) to 0 at its edge. */
function ue(e, t, n) {
	if (e >= t) return 0;
	const r = t * (1 - Math.min(Math.max(n, 0), 1));
	if (e <= r) return 1;
	const i = 1 - (e - r) / Math.max(t - r, 1e-9);
	return i * i * (3 - 2 * i);
}
/** The texel span of a brush over a grid `width` by `height` laid across `sizeX` by `sizeZ`, or null when it reaches none. */
function de(e, t, n, r, i) {
	const a = (i.x - i.radius) / n + .5, o = (i.x + i.radius) / n + .5;
	const s = (i.z - i.radius) / r + .5, c = (i.z + i.radius) / r + .5;
	const l = Math.max(Math.ceil(a * (e - 1)), 0), u = Math.min(Math.floor(o * (e - 1)), e - 1);
	const d = Math.max(Math.ceil(s * (t - 1)), 0), f = Math.min(Math.floor(c * (t - 1)), t - 1);
	return l > u || d > f ? null : {
		i0: l,
		j0: d,
		i1: u,
		j1: f
	};
}
/** The union of two dirty spans, either of which may be absent. */
function U(e, t) {
	if (!e) return t;
	if (!t) return e;
	return {
		i0: Math.min(e.i0, t.i0),
		j0: Math.min(e.j0, t.j0),
		i1: Math.max(e.i1, t.i1),
		j1: Math.max(e.j1, t.j1)
	};
}
/**
* Applies one dab to `field` and says which texels it touched (null when the brush is off the area). Heights stay between 0 and 1.
*/
function fe(e, t, n, r) {
	const i = de(e.width, e.height, t, n, r.brush);
	if (!i) return null;
	const { width: a, data: o } = e, s = r.brush;
	const c = r.mode === le.Smooth ? pe(e, i) : null;
	const l = i.i1 - i.i0 + 1;
	for (let u = i.j0; u <= i.j1; u++) for (let d = i.i0; d <= i.i1; d++) {
		const f = (d / (e.width - 1) - .5) * t, p = (u / (e.height - 1) - .5) * n;
		const m = ue(Math.hypot(f - s.x, p - s.z), s.radius, s.falloff);
		if (m <= 0) continue;
		const h = u * a + d;
		const g = o[h];
		let _ = g;
		if (r.mode === le.Raise) _ = g + r.amount * m;
		else if (r.mode === le.Lower) _ = g - r.amount * m;
		else if (r.mode === le.Flatten) _ = g + ((r.target ?? g) - g) * Math.min(r.amount * m, 1);
		else if (c) {
			let t = 0, n = 0;
			for (let r = -1; r <= 1; r++) for (let s = -1; s <= 1; s++) {
				const f = Math.min(Math.max(d + s, 0), e.width - 1), p = Math.min(Math.max(u + r, 0), e.height - 1);
				const m = f >= i.i0 && f <= i.i1 && p >= i.j0 && p <= i.j1;
				t += m ? c[(p - i.j0) * l + (f - i.i0)] : o[p * a + f];
				n++;
			}
			_ = g + (t / n - g) * Math.min(r.amount * m, 1);
		}
		o[h] = Math.min(Math.max(_, 0), 1);
	}
	return i;
}
function pe(e, t) {
	const n = t.i1 - t.i0 + 1, r = new Float32Array(n * (t.j1 - t.j0 + 1));
	for (let i = t.j0; i <= t.j1; i++) for (let a = t.i0; a <= t.i1; a++) r[(i - t.j0) * n + (a - t.i0)] = e.data[i * e.width + a];
	return r;
}
/** One texel's eight weights, from the splatmaps. */
function me(e, t, n, r) {
	for (let i = 0; i < 4; i++) {
		r[i] = e.pixels[n * 4 + i] / 255;
		r[4 + i] = t ? t.pixels[n * 4 + i] / 255 : 0;
	}
}
/**
* Paints one dab into the splatmaps (`b` null paints layers 1 to 4 only) and says which texels it touched. The two maps must be the
* same size. The weights of a texel always add to one: laying a layer takes from the others in proportion to what they had, and
* erasing one gives its share back to them (to layer 1 where there is nothing else).
*/
function he(e, t, n, r, i) {
	if (i.layer < 0 || i.layer > 7 || i.layer > 3 && !t) return null;
	const a = de(e.width, e.height, n, r, i.brush);
	if (!a) return null;
	const o = i.brush, s = /* @__PURE__ */ new Float32Array(8);
	for (let c = a.j0; c <= a.j1; c++) for (let l = a.i0; l <= a.i1; l++) {
		const a = (l / (e.width - 1) - .5) * n, u = (c / (e.height - 1) - .5) * r;
		const d = ue(Math.hypot(a - o.x, u - o.z), o.radius, o.falloff) * i.strength;
		if (d <= 0) continue;
		const f = c * e.width + l;
		me(e, t, f, s);
		let p = 0;
		for (let e = 0; e < 8; e++) if (e !== i.layer) p += s[e];
		const m = s[i.layer];
		const h = Math.min(Math.max(i.erase ? m * (1 - Math.min(d, 1)) : m + (1 - m) * Math.min(d, 1), 0), 1);
		const g = 1 - h;
		if (p > 1e-6) {
			for (let e = 0; e < 8; e++) if (e !== i.layer) s[e] = s[e] * g / p;
		} else if (i.erase) s[i.layer === 0 ? 1 : 0] = g;
		s[i.layer] = h;
		for (let n = 0; n < 4; n++) {
			e.pixels[f * 4 + n] = Math.round(s[n] * 255);
			if (t) t.pixels[f * 4 + n] = Math.round(s[4 + n] * 255);
		}
	}
	return a;
}
/** A height field as the red-and-green 16-bit image a heightmap is saved as (red the high byte): `RGBA` pixels, opaque. */
function W(e) {
	const t = new Uint8Array(e.width * e.height * 4);
	for (let n = 0; n < e.width * e.height; n++) {
		const r = Math.round(Math.min(Math.max(e.data[n], 0), 1) * 65535);
		t[n * 4] = r >> 8;
		t[n * 4 + 1] = r & 255;
		t[n * 4 + 2] = 0;
		t[n * 4 + 3] = 255;
	}
	return t;
}
//#endregion
//#region src/terrain/groundEdit.ts
const G = 32;
/** @internal */
var K = class {
	constructor(e, t, n) {
		this.width = e;
		this.height = t;
		this.stride = n;
		this.kept = /* @__PURE__ */ new Map();
	}
	keep(e, t) {
		for (let n = t.j0 >> 5; n <= t.j1 >> 5; n++) for (let r = t.i0 >> 5; r <= t.i1 >> 5; r++) {
			const t = n * ((this.width - 1 >> 5) + 1) + r;
			if (this.kept.has(t)) continue;
			const i = {
				i0: r * G,
				j0: n * G,
				i1: Math.min(r * G + G - 1, this.width - 1),
				j1: Math.min(n * G + G - 1, this.height - 1)
			};
			this.kept.set(t, {
				rect: i,
				before: ve(e, this.width, i, this.stride)
			});
		}
	}
	piece(e, t) {
		const n = [...this.kept.values()].map((t) => ({
			...t,
			after: ve(e, this.width, t.rect, this.stride)
		}));
		return {
			rect: t,
			width: this.width,
			tiles: n
		};
	}
};
/** One area terrain's ground, open to brushes. @experimental */
var ge = class {
	/** @internal */
	constructor(e, t, n, r, i) {
		this.host = e;
		this.source = t;
		this.modified = n;
		this.sizeX = r;
		this.sizeZ = i;
		this.open_ = null;
	}
	get field() {
		return this.source.field;
	}
	get samplesX() {
		return this.source.field.width;
	}
	get samplesZ() {
		return this.source.field.height;
	}
	/** The world height the field's 0 sits at and its 1 reaches. */
	get minHeight() {
		return this.source.minHeight;
	}
	get maxHeight() {
		return this.source.maxHeight;
	}
	get area() {
		return {
			sizeX: this.sizeX,
			sizeZ: this.sizeZ
		};
	}
	/** The terrain's world position on the ground plane: the brush's world (x, z) is this far from the terrain's own. */
	get origin() {
		return {
			x: this.modified.origin.x,
			z: this.modified.origin.z
		};
	}
	get span() {
		return Math.max(this.maxHeight - this.minHeight, 1e-6);
	}
	/** The height of the ground (the brushes' own, without modifiers laid over it) at world (x, z), or null off the area. */
	heightAt(e, t) {
		return this.source.height(e - this.modified.origin.x, t - this.modified.origin.z);
	}
	begin() {
		if (this.open_) return;
		this.open_ = {
			heights: new K(this.field.width, this.field.height, 1),
			splat: null,
			splat2: null,
			h: null,
			s: null,
			s2: null
		};
	}
	/**
	* One dab of height. `amount` is in world units for raise and lower (how far the brush's core moves the ground) and 0 to 1 for smooth
	* and flatten (how much of the way they go); `target` is flatten's world height. At the world position (x, z).
	*/
	sculpt(e, t, n, r, i, a, o) {
		const s = this.modified.origin;
		const c = {
			mode: e,
			brush: {
				x: t - s.x,
				z: n - s.z,
				radius: r,
				falloff: i
			},
			amount: e <= 1 ? a / this.span : a,
			target: o === void 0 ? void 0 : (o - this.minHeight) / this.span
		};
		const l = de(this.field.width, this.field.height, this.sizeX, this.sizeZ, c.brush);
		if (this.open_ && l) this.open_.heights.keep(this.field.data, l);
		const u = fe(this.field, this.sizeX, this.sizeZ, c);
		if (!u) return;
		if (this.open_) this.open_.h = U(this.open_.h, u);
		this.remake(t, n, r, this.field);
	}
	/** One dab of paint at the world position (x, z). Layers 5 to 8 make the second splatmap if there is none. */
	paint(e, t, n, r, i, a, o = false) {
		const s = this.modified.origin;
		const { a: c, b: l } = this.source.ensureSplats(e > 3);
		const u = {
			x: t - s.x,
			z: n - s.z,
			radius: r,
			falloff: i
		};
		const d = de(c.width, c.height, this.sizeX, this.sizeZ, u);
		if (this.open_ && d) {
			(this.open_.splat ??= new K(c.width, c.height, 4)).keep(c.pixels, d);
			if (l) (this.open_.splat2 ??= new K(l.width, l.height, 4)).keep(l.pixels, d);
		}
		const f = he(c, l, this.sizeX, this.sizeZ, {
			layer: e,
			brush: u,
			strength: a,
			erase: o
		});
		if (!f) return;
		if (this.open_) {
			this.open_.s = U(this.open_.s, f);
			if (l) this.open_.s2 = U(this.open_.s2, f);
		}
		this.remake(t, n, r, c);
	}
	/** Ends the stroke and says what it changed, or null when it changed nothing. */
	end() {
		const e = this.open_;
		this.open_ = null;
		if (!e) return null;
		const { a: t, b: n } = this.source.splats();
		const r = {
			heights: e.h ? e.heights.piece(this.field.data, e.h) : null,
			splat: e.s && t && e.splat ? e.splat.piece(t.pixels, e.s) : null,
			splat2: e.s2 && n && e.splat2 ? e.splat2.piece(n.pixels, e.s2) : null
		};
		return r.heights || r.splat || r.splat2 ? r : null;
	}
	/** Lays a patch's `before` or its `after` back over the ground. */
	apply(e, t) {
		let n = null;
		if (e.heights) {
			q(this.field.data, e.heights, t, 1);
			n = e.heights.rect;
		}
		const { a: r, b: i } = this.source.splats();
		if (e.splat && r) q(r.pixels, e.splat, t, 4);
		if (e.splat2 && i) q(i.pixels, e.splat2, t, 4);
		const a = n ?? e.splat?.rect ?? e.splat2?.rect;
		if (!a) return;
		const o = e.heights ? this.field.width : (r ?? i).width, s = e.heights ? this.field.height : (r ?? i).height;
		const c = (a.i0 / (o - 1) - .5) * this.sizeX + this.modified.origin.x, l = (a.i1 / (o - 1) - .5) * this.sizeX + this.modified.origin.x;
		const u = (a.j0 / (s - 1) - .5) * this.sizeZ + this.modified.origin.z, d = (a.j1 / (s - 1) - .5) * this.sizeZ + this.modified.origin.z;
		this.host.remake([
			c - this.sizeX / o,
			u - this.sizeZ / s,
			l + this.sizeX / o,
			d + this.sizeZ / s
		]);
	}
	/** The heights as the image a heightmap is saved as: red and green 16 bits, `RGBA`, `field.width` by `field.height`. */
	heightmapPixels() {
		return {
			width: this.field.width,
			height: this.field.height,
			pixels: W(this.field)
		};
	}
	/** The splatmaps as `RGBA` images to save, null where the ground has none. */
	splatmapPixels() {
		return this.source.splats();
	}
	remake(e, t, n, r) {
		const i = Math.max(this.sizeX / Math.max(r.width - 1, 1), 0);
		this.host.remake([
			e - n - i,
			t - n - i,
			e + n + i,
			t + n + i
		]);
	}
};
function _e(e, t, n) {
	return new e.constructor((t.i1 - t.i0 + 1) * (t.j1 - t.j0 + 1) * n);
}
function ve(e, t, n, r) {
	const i = _e(e, n, r), a = (n.i1 - n.i0 + 1) * r;
	for (let o = n.j0; o <= n.j1; o++) {
		const s = (o * t + n.i0) * r;
		i.set(e.subarray(s, s + a), (o - n.j0) * a);
	}
	return i;
}
/** @internal */
function q(e, t, n, r) {
	for (const i of t.tiles) {
		const a = i[n], o = i.rect, s = (o.i1 - o.i0 + 1) * r;
		for (let n = o.j0; n <= o.j1; n++) {
			const i = (n - o.j0) * s;
			e.set(a.subarray(i, i + s), (n * t.width + o.i0) * r);
		}
	}
}
//#endregion
//#region src/terrain/source.ts
/**
* @file    source.ts
* @brief   Where the ground's height and paint come from: a field over an area, or noise that goes on for ever.
*
* @details The terrain draws from height pages (pages.ts) and answers the CPU (what stands on it, what floats over it) from the same
*          numbers, so both ask one source. Positions are in the terrain's own space (its entity at the origin), heights in world units
*          above it.
*            - An area is a heightfield (a heightmap, or noise made once and worn by rain) over `sizeX` by `sizeZ`, painted by its splatmap
*              or by height and slope, with dirt where the rain ran.
*            - An infinite ground is noise read at any (x, z), so it never ends and the same seed is the same ground everywhere. Rain cannot
*              be run over ground that has no edge, so its wear is the noise's own: each octave is damped where the octaves under it are
*              already steep, which leaves smooth valleys between sharp ridges and gullies down the slopes.
*/
/**
* An area's ground: a field of heights (0 to 1 over `range`, from 0 to `height` by default), centred on the terrain, with its splatmap
* and where its rain ran.
*/
var ye = class e {
	constructor(e, t, n, r, i = [0, t.height], a = null) {
		this.field = e;
		this.data = t;
		this.splat = n;
		this.flow = r;
		this.splat2 = a;
		this.infinite = false;
		this.bounds = [
			-t.sizeX / 2,
			-t.sizeZ / 2,
			t.sizeX / 2,
			t.sizeZ / 2
		];
		[this.minHeight, this.maxHeight] = i;
	}
	/**
	* The splatmaps a brush paints into, made where the ground had none: the first from the paint the ground has now (by height and
	* slope), the second (layers 5 to 8) empty, and only when `second` says it is wanted. They are as fine as the field, to 1024 a side.
	*/
	ensureSplats(e) {
		const t = this.field, n = Math.min(t.width, 1024), r = Math.min(t.height, 1024);
		if (!this.splat) {
			const e = new Uint8Array(n * r * 4);
			const t = this.data.sizeX, i = this.data.sizeZ;
			for (let a = 0; a < r; a++) for (let o = 0; o < n; o++) {
				const s = (o / (n - 1) - .5) * t, c = (a / (r - 1) - .5) * i;
				const l = this.height(s, c) ?? this.minHeight, u = this.normal(s, c);
				const d = H((l - this.minHeight) / this.span, u ? u[1] : 1, this.data);
				for (let t = 0; t < 4; t++) e[(a * n + o) * 4 + t] = Math.round(d[t] * 255);
			}
			this.splat = {
				width: n,
				height: r,
				pixels: e
			};
		}
		if (e && !this.splat2) this.splat2 = {
			width: this.splat.width,
			height: this.splat.height,
			pixels: new Uint8Array(this.splat.width * this.splat.height * 4)
		};
		return {
			a: this.splat,
			b: this.splat2
		};
	}
	/** The splatmaps now, null where the ground has none. */
	splats() {
		return {
			a: this.splat,
			b: this.splat2
		};
	}
	get span() {
		return Math.max(this.maxHeight - this.minHeight, 1e-6);
	}
	/** The ground as data (its arrays are shared, not copied): `FieldSource.fromData` makes the same ground from it. */
	toData() {
		const e = this.data;
		return {
			field: this.field,
			params: {
				sizeX: e.sizeX,
				sizeZ: e.sizeZ,
				height: e.height,
				rockSlope: e.rockSlope,
				dirtHeight: e.dirtHeight,
				snowHeight: e.snowHeight
			},
			splat: this.splat,
			splat2: this.splat2,
			flow: this.flow,
			range: [this.minHeight, this.maxHeight]
		};
	}
	static fromData(t) {
		return new e(t.field, t.params, t.splat, t.flow, t.range, t.splat2);
	}
	height(e, t) {
		const n = e / this.data.sizeX + .5, r = t / this.data.sizeZ + .5;
		if (n < 0 || n > 1 || r < 0 || r > 1) return null;
		return this.minHeight + z(this.field, n, r) * this.span;
	}
	/** The ground's normal at (x, z), or null off the area. */
	normal(e, t) {
		const n = e / this.data.sizeX + .5, r = t / this.data.sizeZ + .5;
		if (n < 0 || n > 1 || r < 0 || r > 1) return null;
		return re(this.field, n, r, this.data.sizeX, this.data.sizeZ, this.span);
	}
	paint(e, t, n, r) {
		const i = Math.min(Math.max(e / this.data.sizeX + .5, 0), 1), a = Math.min(Math.max(t / this.data.sizeZ + .5, 0), 1);
		let o = [...H((n - this.minHeight) / this.span, r, this.data)];
		const s = (e) => {
			if (!e) return [
				0,
				0,
				0,
				0
			];
			const t = i * (e.width - 1), n = a * (e.height - 1);
			const r = Math.floor(t), o = Math.floor(n), s = Math.min(r + 1, e.width - 1), c = Math.min(o + 1, e.height - 1);
			const l = t - r, u = n - o, d = e.pixels, f = o * e.width, p = c * e.width;
			const m = [
				0,
				0,
				0,
				0
			];
			for (let e = 0; e < 4; e++) {
				const t = d[(f + r) * 4 + e] * (1 - l) + d[(f + s) * 4 + e] * l;
				const n = d[(p + r) * 4 + e] * (1 - l) + d[(p + s) * 4 + e] * l;
				m[e] = (t * (1 - u) + n * u) / 255;
			}
			return m;
		};
		if (this.splat || this.splat2) {
			const e = [...s(this.splat), ...this.splat2 ? s(this.splat2) : []];
			const t = e.reduce((e, t) => e + t, 0);
			if (t > .001) o = e.map((e) => e / t);
		}
		if (this.flow) {
			const e = Math.round(i * (this.field.width - 1)), t = Math.round(a * (this.field.height - 1));
			const n = Te(.45, .85, this.flow[t * this.field.width + e]) * .8 * o[0];
			o[0] = o[0] - n;
			o[1] = o[1] + n;
		}
		return o;
	}
};
/**
* Ground that goes on for ever: fractal noise read at any point, `frequency` hills to every `sizeX` world units, `height` tall at most.
* `erosion` damps each octave by how steep the ones under it already are, which is what rain does to real ground.
*/
var be = class e {
	constructor(e) {
		this.p = e;
		this.infinite = true;
		this.bounds = null;
		this.minHeight = 0;
		this.maxHeight = e.height;
	}
	/** The ground as data: `NoiseSource.fromData` makes the same ground from it. */
	toData() {
		return { ...this.p };
	}
	static fromData(t) {
		return new e(t);
	}
	height(e, t) {
		return this.sample(e, t)[0] * this.p.height;
	}
	/** The normal at (x, z), from the noise's own slope. */
	normal(e, t) {
		const [, n, r] = this.sample(e, t);
		const i = n * this.p.height, a = r * this.p.height;
		const o = Math.hypot(i, 1, a);
		return [
			-i / o,
			1 / o,
			-a / o
		];
	}
	paint(e, t, n, r) {
		return H(n / Math.max(this.p.height, 1e-6), r, this.p);
	}
	/** The height (0 to 1) at (x, z) and its slope along x and z, per world unit. */
	sample(e, t) {
		const n = this.p;
		const r = Math.max(n.frequency, 1e-6) / Math.max(n.sizeX, 1e-6);
		let i = e * r, a = t * r;
		const o = Math.min(Math.max(n.warp, 0), 1);
		if (o > 0) {
			i += (we(i + 5.2, a + 1.3, n.seed + 7001)[0] * 2 - 1) * o * .5;
			a += (we(i + 8.3, a + 2.8, n.seed + 7003)[0] * 2 - 1) * o * .5;
		}
		const s = Math.max(1, Math.min(8, Math.floor(n.octaves)));
		const c = Math.min(Math.max(n.erosion, 0), 4);
		let l = 1, u = 1, d = 0, f = 0, p = 0, m = 0;
		let h = 0, g = 0;
		for (let e = 0; e < s; e++) {
			const [t, r, o] = we(i * u, a * u, n.seed + e * 101);
			let s = t, _ = r * u, v = o * u;
			if (n.ridged > 0) {
				const e = t * 2 - 1, r = Math.sqrt(e * e + xe * xe);
				const i = (r - xe) / Se, a = e / r / Se * 2;
				s = t * (1 - n.ridged) + (1 - i) * n.ridged;
				_ = _ * (1 - n.ridged) - a * _ * n.ridged;
				v = v * (1 - n.ridged) - a * v * n.ridged;
			}
			h += _ * l;
			g += v * l;
			const y = c > 0 ? 1 / (1 + c * (h * h + g * g) * .25) : 1;
			d += s * l * y;
			p += _ * l * y;
			m += v * l * y;
			f += l;
			l *= n.persistence;
			u *= 2;
		}
		return [
			d / f,
			p / f * r,
			m / f * r
		];
	}
};
/** How round a ridge's crest is, in the noise's own 0 to 1 (folded, -1 to 1), and what the rounded fold reaches at the ends. */
const xe = .06;
const Se = Math.sqrt(1.0036) - xe;
/** A 32-bit integer hash, stable across hosts, so a seed makes the same ground everywhere. */
function Ce(e, t, n) {
	let r = Math.imul(e, 374761393) + Math.imul(t, 668265263) + Math.imul(n | 0, 2147483647) | 0;
	r = Math.imul(r ^ r >>> 13, 1274126177);
	r = (r ^ r >>> 16) >>> 0;
	return r / 4294967295;
}
/** Value noise at (x, y), 0 to 1, and its derivatives along x and y. */
function we(e, t, n) {
	const r = Math.floor(e), i = Math.floor(t);
	const a = e - r, o = t - i;
	const s = a * a * (3 - 2 * a), c = o * o * (3 - 2 * o);
	const l = 6 * a * (1 - a), u = 6 * o * (1 - o);
	const d = Ce(r, i, n), f = Ce(r + 1, i, n);
	const p = Ce(r, i + 1, n), m = Ce(r + 1, i + 1, n);
	const h = f - d, g = p - d, _ = d - f - p + m;
	return [
		d + h * s + g * c + _ * s * c,
		(h + _ * c) * l,
		(g + _ * s) * u
	];
}
function Te(e, t, n) {
	const r = Math.min(Math.max((n - e) / (t - e || 1e-6), 0), 1);
	return r * r * (3 - 2 * r);
}
/** A source with the modifiers laid over it: what the pages, the queries and collision all read. */
var J = class {
	constructor(e, t, n, r) {
		this.base = e;
		this.modifiers = t;
		this.step = r;
		this.infinite = e.infinite;
		this.bounds = e.bounds;
		this.minHeight = e.minHeight;
		this.maxHeight = e.maxHeight;
		this.origin = { ...n };
	}
	height(e, t) {
		const n = this.base.height(e, t);
		return n === null ? null : this.modify(e, t, n);
	}
	normal(e, t) {
		if (!this.touched(e - this.step, t - this.step, e + this.step, t + this.step)) return this.base.normal(e, t);
		const n = this.step;
		const r = this.height(e - n, t), i = this.height(e + n, t), a = this.height(e, t - n), o = this.height(e, t + n);
		if (r === null || i === null || a === null || o === null) return null;
		const s = (i - r) / (2 * n), c = (o - a) / (2 * n), l = Math.hypot(s, 1, c);
		return [
			-s / l,
			1 / l,
			-c / l
		];
	}
	paint(e, t, n, r) {
		return this.base.paint(e, t, n, r);
	}
	get region() {
		const e = this.base.region?.bind(this.base);
		if (!e) return void 0;
		return (t, n, r, i) => {
			const a = e(t, n, r, i);
			const o = (e) => {
				if (!this.touched(t, n, t + r * (i - 1), n + r * (i - 1))) return e;
				const a = new Float32Array(e.heights);
				for (let e = 0; e < i; e++) for (let o = 0; o < i; o++) a[e * i + o] = this.modify(t + o * r, n + e * r, a[e * i + o]);
				return {
					...e,
					heights: a
				};
			};
			return a instanceof Promise ? a.then(o) : o(a);
		};
	}
	/** Whether any modifier can change something in the square [x0, x1] by [z0, z1] of the terrain's space. */
	touched(e, t, n, r) {
		const i = this.origin.x, a = this.origin.z;
		for (const o of this.modifiers()) {
			const s = o.bounds;
			if (s[0] <= n + i && s[2] >= e + i && s[1] <= r + a && s[3] >= t + a) return true;
		}
		return false;
	}
	modify(e, t, n) {
		const r = e + this.origin.x, i = t + this.origin.z, a = this.origin.y;
		let o = n + a;
		for (const e of this.modifiers()) {
			const t = e.bounds;
			if (r < t[0] || r > t[2] || i < t[1] || i > t[3]) continue;
			o = e.apply(r, i, o);
		}
		return Math.min(Math.max(o - a, this.minHeight), this.maxHeight);
	}
};
/**
* Levels the ground to world height `height` over a circle or a turned rectangle, blending back to the ground over `falloff` world
* units past its outline: a plot built on, a landing pad, a road's bed.
*/
function Ee(e, t, n, r) {
	const i = (t.type === "circle" ? t.radius : Math.hypot(t.halfX, t.halfZ)) + Math.max(r, 0);
	const a = (e, n) => {
		if (t.type === "circle") return Math.hypot(e - t.x, n - t.z) - t.radius;
		const r = Math.cos(-(t.yaw ?? 0)), i = Math.sin(-(t.yaw ?? 0));
		const a = e - t.x, o = n - t.z;
		const s = Math.abs(a * r - o * i) - t.halfX, c = Math.abs(a * i + o * r) - t.halfZ;
		return Math.hypot(Math.max(s, 0), Math.max(c, 0)) + Math.min(Math.max(s, c), 0);
	};
	return {
		id: e,
		bounds: [
			t.x - i,
			t.z - i,
			t.x + i,
			t.z + i
		],
		apply(e, t, i) {
			const o = a(e, t);
			if (o <= 0) return n;
			if (r <= 0 || o >= r) return i;
			const s = 1 - o / r, c = s * s * (3 - 2 * s);
			return i + (n - i) * c;
		}
	};
}
//#endregion
//#region src/terrain/quadtree.ts
/** The range of level `level`: where its nodes end and the next level's begin. */
function De(e, t) {
	return e.range0 * 2 ** t;
}
/**
* The nodes to draw for an eye at (ex, ey, ez), coarse to fine. Every place in the area (or within the top range of the eye, for an
* infinite ground) is covered by exactly one node.
*/
function Oe(e, t, n, r) {
	const i = [];
	const a = e.levels - 1;
	const o = e.leafSize * 2 ** a;
	let s, c, l, u;
	if (e.bounds) [s, c, l, u] = e.bounds;
	else {
		const n = De(e, a);
		s = t - n;
		l = t + n;
		c = r - n;
		u = r + n;
	}
	const d = Math.floor(s / o), f = Math.ceil(l / o) - 1;
	const p = Math.floor(c / o), m = Math.ceil(u / o) - 1;
	for (let o = p; o <= m; o++) for (let s = d; s <= f; s++) ke(e, a, s, o, t, n, r, i);
	return i;
}
function ke(e, t, n, r, i, a, o, s) {
	const c = e.leafSize * 2 ** t;
	const l = n * c, u = r * c;
	if (e.bounds && (l >= e.bounds[2] || u >= e.bounds[3] || l + c <= e.bounds[0] || u + c <= e.bounds[1])) return;
	if (t === 0 || Ae(l, u, c, e.minHeight, e.maxHeight, i, a, o) > De(e, t - 1)) {
		s.push({
			level: t,
			ix: n,
			iz: r,
			x0: l,
			z0: u,
			size: c
		});
		return;
	}
	for (let c = 0; c < 2; c++) for (let l = 0; l < 2; l++) ke(e, t - 1, n * 2 + l, r * 2 + c, i, a, o, s);
}
/** How far the eye is from a node's box (its square, from the least to the most height). */
function Ae(e, t, n, r, i, a, o, s) {
	const c = Math.max(e - a, 0, a - (e + n));
	const l = Math.max(t - s, 0, s - (t + n));
	const u = Math.max(r - o, 0, o - i);
	return Math.hypot(c, u, l);
}
/** The node one level up that holds this one. */
function je(e, t) {
	const n = e.level + 1, r = t * 2 ** n;
	const i = Math.floor(e.ix / 2), a = Math.floor(e.iz / 2);
	return {
		level: n,
		ix: i,
		iz: a,
		x0: i * r,
		z0: a * r,
		size: r
	};
}
/** A node's key, for the pages and the pool. */
function Y(e, t, n) {
	return `${e}:${t}:${n}`;
}
/** How much a fit that is over its budget gives up at a time, and how far under the budget the next step up has to be before it is taken back. */
const Me = .9;
const Ne = .85;
/**
* The share of its `range0` a tree (`tree(share)`) can keep and still draw the eye's ground in `most` nodes: a node is a page, and a tree
* that wants more pages than the atlas holds is drawn in part by coarser pages, which do not meet their finer neighbours' edges (cracks).
* `held` is the share the frame before settled on: given up a step at a time while the nodes are too many, taken back a step only with
* room to spare, so an eye moving along the edge of the budget does not change the ground every frame.
*/
function Pe(e, t, n, r, i, a = 1) {
	let o = Math.min(Math.max(a, .01), 1);
	let s = Oe(e(o), t, n, r);
	while (s.length > i && o > .01) {
		o *= Me;
		s = Oe(e(o), t, n, r);
	}
	if (o < 1 && s.length <= i) {
		const a = Math.min(o / Me, 1);
		const s = Oe(e(a), t, n, r);
		if (s.length <= i * Ne) return {
			share: a,
			nodes: s
		};
	}
	return {
		share: o,
		nodes: s
	};
}
//#endregion
//#region src/terrain/pages.ts
/** Cells along a patch's side, and samples along a page's (two to a cell). */
const Fe = 32;
const Ie = 64;
/** A page's side in the atlas: its samples, the one on its far edge, and one past each edge. */
const Le = 67;
/**
* Samples a node's page from `source`: square (x0, z0) to (x0 + size, z0 + size) in the terrain's space. Heights are encoded over
* the source's range. Off an area's edge the ground is its nearest edge's, so the pages there are whole. A source that samples regions
* (a provider) is asked for the page's whole grid at once, and may answer later. `repaint`, given, has the last word on each sample's
* paint (a world's biomes), from the paint the source gave it.
*/
function Re(e, t, n, r, i) {
	const a = 67, o = r / 64;
	if (e.region) {
		const r = e.region(t - o, n - o, o, a);
		return r instanceof Promise ? r.then((r) => Ve(e, t, n, o, r.heights, r, i)) : Ve(e, t, n, o, r.heights, r, i);
	}
	return Be(ze(e, t, n, r, i));
}
/** A page made in bounded sample batches. Use only when height() is ready and synchronous; region-only providers keep their async path. */
function* ze(e, t, n, r, i) {
	const a = 67, o = r / 64, s = /* @__PURE__ */ new Float32Array(4489);
	const [c, l, u, d] = e.bounds ?? [
		-Infinity,
		-Infinity,
		Infinity,
		Infinity
	];
	for (let r = 0; r < s.length; r++) {
		const i = r % a, f = Math.floor(r / a);
		const p = Math.min(Math.max(t + (i - 1) * o, c), u), m = Math.min(Math.max(n + (f - 1) * o, l), d);
		s[r] = e.height(p, m) ?? e.minHeight;
		if ((r + 1) % 32 === 0) yield .4 * (r + 1) / s.length;
	}
	yield .4;
	return yield* He(e, t, n, o, s, void 0, i);
}
function Be(e) {
	for (;;) {
		const t = e.next();
		if (t.done) return t.value;
	}
}
/** Encodes a page's samples (row by row, one past each edge): heights and normals into one image, the paint into the other. */
function Ve(e, t, n, r, i, a, o) {
	return Be(He(e, t, n, r, i, a, o));
}
function* He(e, t, n, r, i, a, o) {
	const s = 67;
	const [c, l, u, d] = e.bounds ?? [
		-Infinity,
		-Infinity,
		Infinity,
		Infinity
	];
	let f = Infinity, p = -Infinity;
	for (let e = 1; e <= 65; e++) for (let t = 1; t <= 65; t++) {
		const n = i[e * s + t];
		f = Math.min(f, n);
		p = Math.max(p, n);
	}
	const m = Math.max(e.maxHeight - e.minHeight, 1e-6);
	const h = /* @__PURE__ */ new Uint8Array(17956), g = /* @__PURE__ */ new Uint8Array(17956), _ = /* @__PURE__ */ new Uint8Array(17956);
	for (let f = 0; f < s; f++) for (let p = 0; p < s; p++) {
		const v = f * s + p;
		const y = Math.round(Math.min(Math.max((i[v] - e.minHeight) / m, 0), 1) * 65535);
		const b = i[f * s + Math.max(p - 1, 0)], x = i[f * s + Math.min(p + 1, 66)];
		const S = i[Math.max(f - 1, 0) * s + p], C = i[Math.min(f + 1, 66) * s + p];
		const w = (x - b) / (2 * r), T = (C - S) / (2 * r);
		const E = Math.hypot(w, 1, T);
		const D = -w / E, O = 1 / E, k = -T / E;
		h[v * 4] = y >> 8;
		h[v * 4 + 1] = y & 255;
		h[v * 4 + 2] = Math.round((D * .5 + .5) * 255);
		h[v * 4 + 3] = Math.round((k * .5 + .5) * 255);
		const A = Math.min(Math.max(t + (p - 1) * r, c), u), j = Math.min(Math.max(n + (f - 1) * r, l), d);
		const M = a?.paint, N = a?.paint2;
		let P = M ? [
			M[v * 4],
			M[v * 4 + 1],
			M[v * 4 + 2],
			M[v * 4 + 3],
			...N ? [
				N[v * 4],
				N[v * 4 + 1],
				N[v * 4 + 2],
				N[v * 4 + 3]
			] : []
		] : e.paint(A, j, i[v], O);
		if (o) P = o(A, j, i[v], O, P);
		for (let e = 0; e < 4; e++) {
			g[v * 4 + e] = Math.round(Math.min(Math.max(P[e] ?? 0, 0), 1) * 255);
			_[v * 4 + e] = Math.round(Math.min(Math.max(P[e + 4] ?? 0, 0), 1) * 255);
		}
		if ((v + 1) % 32 === 0) yield .4 + .6 * (v + 1) / 4489;
	}
	return {
		heights: h,
		paint: g,
		paint2: _,
		min: Number.isFinite(f) ? f : e.minHeight,
		max: Number.isFinite(p) ? p : e.maxHeight
	};
}
/** Where the pages live: slots in a square atlas, given out and taken back by key. */
var Ue = class {
	constructor(e) {
		this.atlasSize = e;
		this.pages_ = /* @__PURE__ */ new Map();
		this.free_ = [];
		this.clock_ = 0;
		this.perRow = Math.floor(e / 67);
		this.capacity = this.perRow * this.perRow;
		for (let e = this.capacity - 1; e >= 0; e--) this.free_.push(e);
	}
	get(e) {
		return this.pages_.get(e);
	}
	/** Marks pages drawn this frame, so they are the last to be given up. */
	touch(e) {
		const t = this.pages_.get(e);
		if (t) t.used = this.clock_;
	}
	/** Moves the clock a frame on. */
	tick() {
		this.clock_++;
	}
	/** A slot for a new page under `key`: a free one, or the least recently drawn one not drawn this frame. Null when every slot is in use now. */
	claim(e, t, n) {
		const r = this.pages_.get(e);
		if (r) {
			r.min = t;
			r.max = n;
			r.used = this.clock_;
			r.stale = false;
			return r;
		}
		let i = this.free_.pop();
		if (i === void 0) {
			let e = null, t = Infinity;
			for (const [n, r] of this.pages_) if (r.used < this.clock_ && r.used < t) {
				t = r.used;
				e = n;
			}
			if (e === null) return null;
			i = this.pages_.get(e).slot;
			this.pages_.delete(e);
		}
		const a = {
			slot: i,
			min: t,
			max: n,
			used: this.clock_
		};
		this.pages_.set(e, a);
		return a;
	}
	/** Forgets the pages `test` names (the ground changed under them): they are made again as they are wanted. */
	forget(e) {
		for (const [t, n] of this.pages_) {
			if (!e(t)) continue;
			this.pages_.delete(t);
			this.free_.push(n.slot);
		}
	}
	/**
	* Marks the pages `test` names as out of date without taking them away: they go on being drawn as they were until each is made again
	* (`claim` on its key), so an edit never leaves a hole in the ground while its pages are rebuilt over the next frames.
	*/
	markStale(e) {
		for (const [t, n] of this.pages_) if (e(t)) n.stale = true;
	}
	/** Whether the page under `key` is out of date. */
	isStale(e) {
		return this.pages_.get(e)?.stale === true;
	}
	/** Forgets every page (the device lost the atlas, or the ground changed). */
	clear() {
		this.pages_.clear();
		this.free_.length = 0;
		for (let e = this.capacity - 1; e >= 0; e--) this.free_.push(e);
	}
	/** Where a slot's page starts in the atlas, in texels. */
	origin(e) {
		return [e % this.perRow * 67, Math.floor(e / this.perRow) * 67];
	}
	get size() {
		return this.pages_.size;
	}
};
//#endregion
//#region src/terrain/provider.ts
const We = /* @__PURE__ */ new Map();
let Ge = 0;
/**
* Makes `provider` available to every Terrain that names it. A second provider under the same id replaces the first. A terrain that
* named one not yet registered (a script registers it after the scene loaded) is made once it is.
*/
function Ke(e) {
	We.set(e.id, e);
	Ge++;
}
/** @internal Bumped on every registration, so a terrain whose provider was missing asks again. */
function qe() {
	return Ge;
}
/** The provider registered under `id`, if any. */
function Je(e) {
	return We.get(e);
}
/** Why a terrain's ground could not be made. */
var Ye = class extends Error {};
/** The size of the tiles a point is answered from when its provider has no `heightAt`: this many samples a side. */
const Xe = 33;
/** Ground from a provider, as a terrain draws and answers it. Positions are world positions less the terrain's own. */
var Ze = class {
	constructor(e, t, n, r, i, a, o, s) {
		this.provider = e;
		this.world = t;
		this.seed = n;
		this.version = r;
		this.originX = i;
		this.originZ = a;
		this.pointSpacing = o;
		this.paintRules = s;
		this.infinite = true;
		this.bounds = null;
		this.tiles_ = /* @__PURE__ */ new Map();
		if (!e.versions.includes(r)) throw new Ye(`the terrain provider ${e.id} has no version ${r} (it has ${e.versions.join(", ") || "none"})`);
		[this.minHeight, this.maxHeight] = e.range(n, r);
	}
	/** The ground over a region of the terrain's space, from the provider. */
	region(e, t, n, r) {
		return this.provider.sample({
			world: this.world,
			seed: this.seed,
			version: this.version,
			x0: e + this.originX,
			z0: t + this.originZ,
			spacing: n,
			count: r
		});
	}
	height(e, t) {
		const n = this.provider;
		if (n.heightAt) return n.heightAt(this.world, this.seed, this.version, e + this.originX, t + this.originZ);
		const r = this.pointSpacing * 32;
		const i = Math.floor(e / r), a = Math.floor(t / r);
		const o = `${i}:${a}`;
		let s = this.tiles_.get(o);
		if (!s) {
			s = this.region(i * r, a * r, this.pointSpacing, Xe);
			this.tiles_.set(o, s);
			if (s instanceof Promise) s.then((e) => this.tiles_.set(o, e), () => this.tiles_.delete(o));
		}
		if (s instanceof Promise) return null;
		const c = (e - i * r) / this.pointSpacing, l = (t - a * r) / this.pointSpacing;
		const u = Math.min(Math.floor(c), 31), d = Math.min(Math.floor(l), 31);
		const f = c - u, p = l - d, m = s.heights, h = Xe;
		const g = m[d * h + u], _ = m[d * h + u + 1], v = m[(d + 1) * h + u], y = m[(d + 1) * h + u + 1];
		return g + (_ - g) * f + (v - g) * p + (g - _ - v + y) * f * p;
	}
	/** The normal at (x, z), from the heights a spacing either side; null where they are not known yet. */
	normal(e, t) {
		const n = this.pointSpacing;
		const r = this.height(e - n, t), i = this.height(e + n, t), a = this.height(e, t - n), o = this.height(e, t + n);
		if (r === null || i === null || a === null || o === null) return null;
		const s = (i - r) / (2 * n), c = (o - a) / (2 * n);
		const l = Math.hypot(s, 1, c);
		return [
			-s / l,
			1 / l,
			-c / l
		];
	}
	paint(e, t, n, r) {
		return this.paintRules(n, r);
	}
};
/** The engine's own ground without end: seeded noise of the world's position, as `estella:noise` version 1. */
function Qe(e) {
	const t = /* @__PURE__ */ new Map();
	const n = (n) => {
		let r = t.get(n);
		if (!r) {
			r = new be(e(n));
			t.set(n, r);
		}
		return r;
	};
	return {
		id: "estella:noise",
		versions: [1],
		range: (e) => [0, n(e).maxHeight],
		sample(e) {
			const t = n(e.seed);
			const r = new Float32Array(e.count * e.count);
			for (let n = 0; n < e.count; n++) for (let i = 0; i < e.count; i++) r[n * e.count + i] = t.height(e.x0 + i * e.spacing, e.z0 + n * e.spacing);
			return { heights: r };
		},
		heightAt: (e, t, r, i, a) => n(t).height(i, a)
	};
}
//#endregion
//#region src/terrain/patch.ts
/**
* @file    patch.ts
* @brief   The one patch every quadtree node of the ground is drawn with.
*
* @details A flat grid of `cells` by `cells` over 0 to 1 in x and z, its uv the same; its box runs 0 to 1 in y as well, because the
*          Terrain shader lifts it to the node's page and the node's scale.y is its page's height range, so culling sees the ground's true box.
*/
function $e(e, t = false) {
	const n = Math.max(1, Math.floor(e));
	const { channels: r, vertexStride: i } = O([
		{
			semantic: E.Position,
			components: 3,
			type: D.Float32
		},
		{
			semantic: E.TexCoord0,
			components: 2,
			type: D.Float32
		},
		{
			semantic: E.Color,
			components: 4,
			type: D.UNorm8
		},
		{
			semantic: E.Normal,
			components: 3,
			type: D.Float32
		}
	]);
	const a = (n + 1) * (n + 1);
	const o = new Uint8Array(a * i);
	const s = new DataView(o.buffer);
	const [c, l, u, d] = r.map((e) => e.offset);
	for (let e = 0; e <= n; e++) for (let t = 0; t <= n; t++) {
		const r = (e * (n + 1) + t) * i, a = t / n, o = e / n;
		s.setFloat32(r + c, a, true);
		s.setFloat32(r + c + 4, 0, true);
		s.setFloat32(r + c + 8, o, true);
		s.setFloat32(r + l, a, true);
		s.setFloat32(r + l + 4, o, true);
		for (let e = 0; e < 4; e++) s.setUint8(r + u + e, 255);
		s.setFloat32(r + d + 4, 1, true);
	}
	const f = new Uint32Array(n * n * 6);
	let p = 0;
	for (let e = 0; e < n; e++) for (let r = 0; r < n; r++) {
		const i = e * (n + 1) + r, a = i + 1, o = i + n + 1, s = o + 1;
		f.set(t ? [
			i,
			a,
			o,
			a,
			s,
			o
		] : [
			i,
			o,
			a,
			a,
			o,
			s
		], p);
		p += 6;
	}
	return {
		channels: r,
		vertexStride: i,
		vertexCount: a,
		vertices: o,
		indices: f,
		aabbMin: [
			0,
			0,
			0
		],
		aabbMax: [
			1,
			1,
			1
		]
	};
}
//#endregion
//#region src/terrain/surface.ts
/** Cells along a collision tile's side. */
const et = 32;
var tt = class {
	constructor(e, t) {
		this.source = e;
		this.cell = t;
	}
	/** The height of lattice node (i, k), or null where the source has not answered. Off an area it is its nearest edge's, as the pages have it. */
	node(e, t) {
		let n = e * this.cell, r = t * this.cell;
		const i = this.source.bounds;
		if (i) {
			n = Math.min(Math.max(n, i[0]), i[2]);
			r = Math.min(Math.max(r, i[1]), i[3]);
		}
		return this.source.height(n, r);
	}
	/** Whether (x, z) is on the ground: inside an area, anywhere for ground without end. */
	covers(e, t) {
		const n = this.source.bounds;
		return !n || e >= n[0] && e <= n[2] && t >= n[1] && t <= n[3];
	}
	/** The height at (x, z) on its cell's triangle, or null off the ground or where a corner is not known yet. */
	height(e, t) {
		const n = this.corners(e, t);
		if (!n) return null;
		const [r, i, a, o, s, c] = n;
		return s + c <= 1 ? r + (i - r) * s + (a - r) * c : o + (a - o) * (1 - s) + (i - o) * (1 - c);
	}
	/** The normal of the triangle under (x, z), or null where its height is not known. */
	normal(e, t) {
		const n = this.corners(e, t);
		if (!n) return null;
		const [r, i, a, o, s, c] = n;
		const l = (s + c <= 1 ? i - r : o - a) / this.cell, u = (s + c <= 1 ? a - r : o - i) / this.cell;
		const d = Math.hypot(l, 1, u);
		return [
			-l / d,
			1 / d,
			-u / d
		];
	}
	/** Tile (tx, tz)'s triangles, or null while a node of it is not known yet. */
	tile(e, t) {
		const n = 32, r = 33;
		const i = /* @__PURE__ */ new Float32Array(3267);
		for (let a = 0; a <= n; a++) for (let o = 0; o <= n; o++) {
			const s = this.node(e * n + o, t * n + a);
			if (s === null) return null;
			const c = (a * r + o) * 3;
			i[c] = o * this.cell;
			i[c + 1] = s;
			i[c + 2] = a * this.cell;
		}
		const a = /* @__PURE__ */ new Uint32Array(6144);
		let o = 0;
		for (let e = 0; e < n; e++) for (let t = 0; t < n; t++) {
			const n = e * r + t, i = n + 1, s = n + r, c = s + 1;
			a.set([
				n,
				s,
				i,
				i,
				s,
				c
			], o);
			o += 6;
		}
		return {
			x0: e * n * this.cell,
			z0: t * n * this.cell,
			positions: i,
			indices: a
		};
	}
	/**
	* Where the ray from (ox, oy, oz) along (dx, dy, dz) first meets the ground, within `maxDistance` (along the direction, normalised):
	* the distance, the point and the triangle's normal; null where it meets none (or crosses ground not known yet). Exact against the
	* triangles: it walks the lattice cell by cell under the ray and meets each cell's two.
	*/
	raycast(e, t, n, r, i, a, o) {
		const s = Math.hypot(r, i, a);
		if (s <= 0) return null;
		r /= s;
		i /= s;
		a /= s;
		const c = this.cell;
		let l = Math.floor(e / c), u = Math.floor(n / c);
		const d = r > 0 ? 1 : -1, f = a > 0 ? 1 : -1;
		const p = r !== 0 ? Math.abs(c / r) : Infinity, m = a !== 0 ? Math.abs(c / a) : Infinity;
		let h = r !== 0 ? ((r > 0 ? (l + 1) * c : l * c) - e) / r : Infinity;
		let g = a !== 0 ? ((a > 0 ? (u + 1) * c : u * c) - n) / a : Infinity;
		let _ = 0;
		for (let s = 0; s < 1e6 && _ <= o; s++) {
			const s = this.node(l, u), v = this.node(l + 1, u), y = this.node(l, u + 1), b = this.node(l + 1, u + 1);
			if (s === null || v === null || y === null || b === null) return null;
			const x = l * c, S = u * c;
			for (const l of [[
				[
					x,
					s,
					S
				],
				[
					x,
					y,
					S + c
				],
				[
					x + c,
					v,
					S
				]
			], [
				[
					x + c,
					v,
					S
				],
				[
					x,
					y,
					S + c
				],
				[
					x + c,
					b,
					S + c
				]
			]]) {
				const s = nt(e, t, n, r, i, a, l[0], l[1], l[2]);
				if (s && s.t <= o && this.covers(e + r * s.t, n + a * s.t)) return {
					distance: s.t,
					point: [
						e + r * s.t,
						t + i * s.t,
						n + a * s.t
					],
					normal: s.n
				};
			}
			if (h < g) {
				_ = h;
				h += p;
				l += d;
			} else {
				_ = g;
				g += m;
				u += f;
			}
			if (r === 0 && a === 0) break;
		}
		return null;
	}
	/** The four corners of the cell under (x, z) and where in it the point is, or null. */
	corners(e, t) {
		if (!this.covers(e, t)) return null;
		const n = e / this.cell, r = t / this.cell;
		const i = Math.floor(n), a = Math.floor(r);
		const o = this.node(i, a), s = this.node(i + 1, a), c = this.node(i, a + 1), l = this.node(i + 1, a + 1);
		if (o === null || s === null || c === null || l === null) return null;
		return [
			o,
			s,
			c,
			l,
			n - i,
			r - a
		];
	}
};
/** Where a ray (unit direction) meets a triangle from either side, and the triangle's upward normal; null where it misses. */
function nt(e, t, n, r, i, a, o, s, c) {
	const l = s[0] - o[0], u = s[1] - o[1], d = s[2] - o[2];
	const f = c[0] - o[0], p = c[1] - o[1], m = c[2] - o[2];
	const h = i * m - a * p, g = a * f - r * m, _ = r * p - i * f;
	const v = l * h + u * g + d * _;
	if (Math.abs(v) < 1e-12) return null;
	const y = 1 / v;
	const b = e - o[0], x = t - o[1], S = n - o[2];
	const C = (b * h + x * g + S * _) * y;
	if (C < -1e-9 || C > 1 + 1e-9) return null;
	const w = x * d - S * u, T = S * l - b * d, E = b * u - x * l;
	const D = (r * w + i * T + a * E) * y;
	if (D < -1e-9 || C + D > 1 + 1e-9) return null;
	const O = (f * w + p * T + m * E) * y;
	if (O < 0) return null;
	let k = u * m - d * p, A = d * f - l * m, j = l * p - u * f;
	if (A < 0) {
		k = -k;
		A = -A;
		j = -j;
	}
	const M = Math.hypot(k, A, j) || 1;
	return {
		t: O,
		n: [
			k / M,
			A / M,
			j / M
		]
	};
}
//#endregion
//#region src/terrain/groundQuery.ts
/** The world height of the ground at (x, z) on a surface standing at `origin`, or null off it. */
function rt(e, t, n, r) {
	const i = e.height(n - t.x, r - t.z);
	return i === null ? null : t.y + i;
}
/** The ground's unit normal at (x, z), or null off the ground. */
function it(e, t, n, r) {
	return e.normal(n - t.x, r - t.z);
}
/** The weights of the ground's layers at (x, z), or null off the ground. */
function at(e, t, n, r, i) {
	const a = r - n.x, o = i - n.z;
	const s = t.height(a, o), c = t.normal(a, o);
	return s === null || !c ? null : e.paint(a, o, s, c[1]);
}
//#endregion
//#region src/terrain/layers.ts
/** A layer file that names no tile repeats every 4 m: 400 units at the engine's reference, in the project's own (ecs/worldUnits.ts). */
const ot = 400;
const st = {
	tile: ot,
	tint: [
		1,
		1,
		1
	],
	roughness: .9,
	normalStrength: 1
};
/** A layer from a file's JSON, with what it leaves out at its defaults; throws naming the first field it cannot take. */
function ct(e, t = "terrain layer") {
	if (!e || typeof e !== "object") throw new Error(`${t}: an object`);
	const n = e;
	const r = (e, r, i, a) => {
		const o = n[e];
		if (o === void 0) return r;
		if (typeof o !== "number" || !Number.isFinite(o) || o < i || o > a) throw new Error(`${t}.${e}: a number from ${i} to ${a}, not ${JSON.stringify(o)}`);
		return o;
	};
	const i = (e) => {
		const r = n[e];
		if (r === void 0 || r === "") return void 0;
		if (typeof r !== "string") throw new Error(`${t}.${e}: a texture path, not ${JSON.stringify(r)}`);
		return r;
	};
	const a = n.tint === void 0 ? st.tint : n.tint;
	if (!Array.isArray(a) || a.length !== 3 || a.some((e) => typeof e !== "number" || !Number.isFinite(e))) throw new Error(`${t}.tint: three numbers, red, green and blue`);
	return {
		albedo: i("albedo"),
		normal: i("normal"),
		mask: i("mask"),
		tile: r("tile", ot * d(), .001, 1e6),
		tint: a,
		roughness: r("roughness", st.roughness, 0, 1),
		normalStrength: r("normalStrength", st.normalStrength, 0, 4),
		...n.heightBlend === void 0 ? {} : { heightBlend: r("heightBlend", 0, 0, 1) }
	};
}
/** Loads `.esterrainlayer` files as checked layers. @experimental */
var lt = class {
	constructor() {
		this.type = "terrain-layer";
		this.extensions = [".esterrainlayer"];
	}
	async load(e, t) {
		const n = await t.loadText(t.catalog.getBuildPath(e));
		return ct(JSON.parse(n), e);
	}
	unload() {}
};
/** `image` resampled (bilinear, wrapping, as the layer tiles) to `size` by `size`. */
function ut(e, t) {
	if (e.width === t && e.height === t) return e.pixels;
	const n = new Uint8Array(t * t * 4);
	const { width: r, height: i, pixels: a } = e;
	for (let e = 0; e < t; e++) {
		const o = (e + .5) / t * i - .5, s = Math.floor(o), c = o - s;
		const l = (s % i + i) % i, u = (l + 1) % i;
		for (let i = 0; i < t; i++) {
			const o = (i + .5) / t * r - .5, s = Math.floor(o), d = o - s;
			const f = (s % r + r) % r, p = (f + 1) % r;
			for (let o = 0; o < 4; o++) {
				const s = a[(l * r + f) * 4 + o], m = a[(l * r + p) * 4 + o], h = a[(u * r + f) * 4 + o], g = a[(u * r + p) * 4 + o];
				n[(e * t + i) * 4 + o] = Math.round((s + (m - s) * d) * (1 - c) + (h + (g - h) * d) * c);
			}
		}
	}
	return n;
}
/** Packs `layers` into the three arrays, at the size of their largest texture to a power of two no larger than `maxSize`. */
function dt(e, t = 1024) {
	let n = 16;
	for (const t of e) for (const e of [
		t.albedo,
		t.normal,
		t.mask
	]) if (e) n = Math.max(n, e.width, e.height);
	const r = Math.min(2 ** Math.ceil(Math.log2(n)), Math.max(t, 16));
	const i = r * r;
	const a = [], o = [], s = [];
	for (const { def: t, albedo: n, normal: c, mask: l } of e) {
		const e = n ? new Uint8Array(ut(n, r)) : new Uint8Array(i * 4).fill(255);
		const u = t.tint.map((e) => Math.pow(Math.min(Math.max(e, 0), 1), 1 / 2.2));
		for (let t = 0; t < i; t++) {
			for (let n = 0; n < 3; n++) e[t * 4 + n] = Math.round(e[t * 4 + n] * u[n]);
			e[t * 4 + 3] = 255;
		}
		a.push(e);
		const d = new Uint8Array(i * 4);
		const f = c ? ut(c, r) : null;
		for (let e = 0; e < i; e++) {
			const n = f ? (f[e * 4] / 255 * 2 - 1) * t.normalStrength : 0;
			const r = f ? (f[e * 4 + 1] / 255 * 2 - 1) * t.normalStrength : 0;
			const i = Math.sqrt(Math.max(1 - Math.min(n * n + r * r, 1), 0));
			const a = Math.hypot(n, r, i) || 1;
			d[e * 4] = Math.round((n / a * .5 + .5) * 255);
			d[e * 4 + 1] = Math.round((r / a * .5 + .5) * 255);
			d[e * 4 + 2] = Math.round((i / a * .5 + .5) * 255);
			d[e * 4 + 3] = 255;
		}
		o.push(d);
		if (l) s.push(new Uint8Array(ut(l, r)));
		else {
			const r = new Uint8Array(i * 4);
			const a = Math.round(t.roughness * 255);
			for (let t = 0; t < i; t++) {
				r[t * 4] = 255;
				r[t * 4 + 1] = a;
				r[t * 4 + 2] = n ? Math.round(e[t * 4] * .299 + e[t * 4 + 1] * .587 + e[t * 4 + 2] * .114) : 128;
				r[t * 4 + 3] = 255;
			}
			s.push(r);
		}
	}
	return {
		size: r,
		albedo: a,
		normal: o,
		mask: s,
		tiles: e.map((e) => e.def.tile),
		heightBlends: e.map((e) => e.def.heightBlend ?? -1)
	};
}
//#endregion
//#region src/terrain/layerArrays.ts
/** An image file's pixels exactly as stored (no premultiply, no colour conversion), by its project path or reference. */
async function ft(e, t) {
	if (!e.hasResource(c)) return null;
	const n = e.getResource(c);
	try {
		if (T(t)) return await w(t, (e) => n.fetchBinary(e));
		if (typeof createImageBitmap === "function" && typeof Blob !== "undefined") {
			const e = new Uint8Array(await n.fetchBinary(t));
			return await te(e) ?? await C(new Blob([e]));
		}
		const e = await l(n.resolveLoadPath(t));
		return {
			width: e.width,
			height: e.height,
			pixels: e.pixels
		};
	} catch (e) {
		s.warn("terrain", `reading ${t} failed`, e);
		return null;
	}
}
/** Reads the layer files `refs` (at most `most`) and packs them, at half the size on a minigame, whose memory is smaller. */
async function pt(e, t, n) {
	const r = e.getResource(c);
	if (t.length > n) s.warn("terrain", `a ground draws ${n} layers at most; it names ${t.length}`);
	const i = [];
	for (const a of t.slice(0, n)) {
		const t = await r.load("terrain-layer", a);
		const n = async (t) => {
			if (!t) return null;
			const n = await ft(e, t);
			if (!n) s.warn("terrain", `the texture ${t} of terrain layer ${a} could not be read`);
			return n;
		};
		i.push({
			def: t,
			albedo: await n(t.albedo),
			normal: await n(t.normal),
			mask: await n(t.mask)
		});
	}
	return dt(i, u() ? 512 : 1024);
}
/**
* One texture array per kind from `packed`. The device keeps no copy of them (four layers of three kinds are 48 MiB): after a device loss
* `repack` packs the sources again, once for all the kinds, and each kind's layers are moved behind the handle it had, which is when the
* device counts them restored. Null, with nothing left made, if the engine refuses one.
*/
function mt(e, t, n, r) {
	const i = (n, r, i) => v(e.wasmModule, {
		width: t.size,
		height: t.size,
		layers: n
	}, i, {
		filterMode: "linear",
		wrapMode: "repeat",
		mipmaps: true,
		srgb: r === "albedo"
	});
	const a = n.map((e) => i(t[e], e, g.Composed));
	if (a.some((e) => !e)) {
		gt(a);
		return null;
	}
	let o = null;
	let s = 0;
	a.forEach((e, t) => m(e, async () => {
		if (!o) {
			o = r();
			s = a.length;
		}
		try {
			const r = i((await o)[n[t]], n[t], g.Transient);
			const a = p();
			if (!r || !a?.adoptTextureContent) return false;
			const s = a.adoptTextureContent(e, r);
			a.releaseTexture(r);
			return s;
		} finally {
			if (--s === 0) o = null;
		}
	}));
	return a;
}
/** Reads the layer files `refs` and packs them; null if the engine refuses the arrays. At most `most` layers are packed. */
async function ht(e, t, n) {
	const r = await pt(e, t, n);
	const i = mt(e, r, ["albedo", "normal"], () => pt(e, t, n));
	return i ? {
		albedo: i[0],
		normal: i[1],
		tiles: r.tiles
	} : null;
}
/** Gives the engine back arrays made by {@link createLayerArrays}. */
function gt(e) {
	const t = p();
	for (const n of e) {
		if (!n) continue;
		h(n);
		t?.releaseTexture(n);
	}
}
//#endregion
//#region src/terrain/atlases.ts
/**
* `count` blank `size`-square atlases (heights, paint, then paint2 for a ground of more than four layers); 0 for one the engine refused.
* The device keeps no copy: a page is made from the source whenever it is wanted, so after a loss `forget` drops them all and they are
* made again. That leaves the atlases the blank storage they come back with, which is their content, and pays the device for them.
*/
function _t(e, t, n, r) {
	const i = new Uint8Array(n * n * 4);
	const a = {
		filterMode: "linear",
		wrapMode: "clamp",
		srgb: false
	};
	const o = [];
	for (let s = 0; s < t; s++) {
		const t = y(e.wasmModule, {
			width: n,
			height: n,
			pixels: i
		}, g.Composed, false, a);
		if (t) m(t, () => {
			r();
			p()?.restoreTextureContent?.(t);
			return true;
		});
		o.push(t);
	}
	return o;
}
//#endregion
//#region src/terrain/tiles.ts
/**
* @file    tiles.ts
* @brief   An area's ground kept as tiles (`.esterrain`): a coarse overview always in memory, and full-detail tiles read near where
*          they are looked at and let go, least recently used first, past a budget.
*
* @details Tiles share their edge samples, so tile (tx, tz) of `tileSamples` a side covers the area's samples
*          [tx (tileSamples - 1), (tx + 1)(tileSamples - 1)] along x and the same along z. A page as coarse as the overview or coarser is
*          made from it alone; a finer one waits for the tiles it covers. A height where no tile is in memory is not known yet (null),
*          as with a provider: collision and queries try again once it is.
*/
/** A `.esterrain` checked, or a message naming what is wrong with it. */
function vt(e, t = "terrain tiles") {
	const n = e;
	if (!n || typeof n !== "object" || n.version !== 1) throw new Error(`${t}: not a version 1 terrain`);
	const r = (e, t) => typeof e === "number" && Number.isInteger(e) && e >= t;
	if (!r(n.tileSamples, 3) || !r(n.tilesX, 1) || !r(n.tilesZ, 1)) throw new Error(`${t}: tileSamples, tilesX and tilesZ must be whole numbers`);
	if (typeof n.overview !== "string" || !n.overview) throw new Error(`${t}: names no overview image`);
	if (!Array.isArray(n.tiles)) throw new Error(`${t}: has no tile list`);
	const i = /* @__PURE__ */ new Set();
	for (const e of n.tiles) {
		if (!r(e?.x, 0) || !r(e?.z, 0) || e.x >= n.tilesX || e.z >= n.tilesZ || typeof e.height !== "string") throw new Error(`${t}: tile ${JSON.stringify(e)} is outside the ${n.tilesX} by ${n.tilesZ} grid or names no heights`);
		if (i.has(`${e.x}:${e.z}`)) throw new Error(`${t}: tile ${e.x}, ${e.z} is listed twice`);
		i.add(`${e.x}:${e.z}`);
	}
	return {
		version: 1,
		tileSamples: n.tileSamples,
		tilesX: n.tilesX,
		tilesZ: n.tilesZ,
		format: n.format ?? F.RedGreen16,
		overview: n.overview,
		overviewSplat: n.overviewSplat,
		overviewSplat2: n.overviewSplat2,
		tiles: n.tiles
	};
}
/** The default most a tiled ground keeps of its full-detail tiles in memory. */
const yt = 268435456;
/** An area's ground read from tiles. @experimental */
var bt = class {
	constructor(e, t, n, r, i, a, o = yt) {
		this.doc = e;
		this.params = t;
		this.overview = n;
		this.overviewSplat = r;
		this.overviewSplat2 = i;
		this.read = a;
		this.budget = o;
		this.infinite = false;
		this.minHeight = 0;
		this.entries_ = /* @__PURE__ */ new Map();
		this.tiles_ = /* @__PURE__ */ new Map();
		this.reading_ = /* @__PURE__ */ new Map();
		this.dirty_ = /* @__PURE__ */ new Set();
		this.overviewDirty_ = false;
		this.clock_ = 0;
		this.bytes_ = 0;
		this.reads_ = 0;
		this.evictions_ = 0;
		this.bounds = [
			-t.sizeX / 2,
			-t.sizeZ / 2,
			t.sizeX / 2,
			t.sizeZ / 2
		];
		this.maxHeight = t.height;
		this.samplesX = e.tilesX * (e.tileSamples - 1) + 1;
		this.samplesZ = e.tilesZ * (e.tileSamples - 1) + 1;
		for (const t of e.tiles) this.entries_.set(`${t.x}:${t.z}`, t);
	}
	stats() {
		return {
			resident: this.tiles_.size,
			reading: this.reading_.size,
			bytes: this.bytes_,
			reads: this.reads_,
			evictions: this.evictions_
		};
	}
	/** Bytes the overview holds, which stay for as long as the ground does. */
	get overviewBytes() {
		return this.overview.data.byteLength + (this.overviewSplat?.pixels.byteLength ?? 0) + (this.overviewSplat2?.pixels.byteLength ?? 0);
	}
	/** The world-unit spacing of the overview's samples along x: pages this coarse or coarser are made from it alone. */
	get overviewSpacing() {
		return this.params.sizeX / Math.max(this.overview.width - 1, 1);
	}
	height(e, t) {
		const n = this.locate(e, t), r = this.tile(n.key);
		if (!r) {
			this.ensure(n.key);
			return null;
		}
		return this.params.height * xt(r.field.data, r.field.width, n.lx, n.lz);
	}
	normal(e, t) {
		const n = this.params.sizeX / (this.samplesX - 1);
		const r = this.height(e - n, t), i = this.height(e + n, t), a = this.height(e, t - n), o = this.height(e, t + n);
		if (r === null || i === null || a === null || o === null) return null;
		const s = (i - r) / (2 * n), c = (o - a) / (2 * n), l = Math.hypot(s, 1, c);
		return [
			-s / l,
			1 / l,
			-c / l
		];
	}
	paint(e, t, n, r) {
		const i = this.locate(e, t), a = this.tile(i.key);
		const o = e / this.params.sizeX + .5, s = t / this.params.sizeZ + .5;
		if (a?.splat) return St(a.splat, a.splat2, i.lx / (this.doc.tileSamples - 1), i.lz / (this.doc.tileSamples - 1));
		if (this.overviewSplat) return St(this.overviewSplat, this.overviewSplat2, o, s);
		return H((n - this.minHeight) / Math.max(this.maxHeight, 1e-6), r, this.params);
	}
	region(e, t, n, r) {
		if (n >= this.overviewSpacing * .999) return this.fromOverview(e, t, n, r);
		const i = e + n * (r - 1), a = t + n * (r - 1);
		const o = this.keysOver(e, t, i, a);
		const s = o.filter((e) => !this.tiles_.has(e) && this.entries_.has(e));
		for (const e of o) this.tile(e);
		if (s.length === 0) return this.fromTiles(e, t, n, r);
		return Promise.all(s.map((e) => this.ensure(e))).then(() => {
			for (const e of o) this.tile(e);
			return this.fromTiles(e, t, n, r);
		});
	}
	/** Lets go of tiles, least recently used first, until what is held is within the budget; those in `keep` stay. */
	trim(e = /* @__PURE__ */ new Set()) {
		if (this.bytes_ <= this.budget) return;
		const t = [...this.tiles_].filter(([t]) => !e.has(t) && !this.dirty_.has(t)).sort((e, t) => e[1].used - t[1].used);
		for (const [e, n] of t) {
			if (this.bytes_ <= this.budget) break;
			this.tiles_.delete(e);
			this.bytes_ -= n.bytes;
			this.evictions_++;
		}
	}
	/** @internal The tile at (tx, tz) if it is in memory. */
	tileAt(e, t) {
		return this.tile(`${e}:${t}`);
	}
	/** @internal Reads the tile at (tx, tz) if it is not in memory; null where the document has none. */
	readTile(e, t) {
		return this.ensure(`${e}:${t}`);
	}
	/** @internal Whether the document has a tile at (tx, tz). */
	hasTile(e, t) {
		return this.entries_.has(`${e}:${t}`);
	}
	/** @internal Keeps a changed tile in memory until {@link markSaved}: a tile let go with changes in it would lose them. */
	markDirty(e, t) {
		this.dirty_.add(`${e}:${t}`);
	}
	/** @internal The tiles changed since they were read or last saved. */
	dirtyTiles() {
		return [...this.dirty_].sort();
	}
	/** @internal Whether the overview has changed since it was read or last saved. */
	get overviewDirty() {
		return this.overviewDirty_;
	}
	/** @internal */
	markOverviewDirty() {
		this.overviewDirty_ = true;
	}
	/** @internal Lets saved tiles go again. */
	markSaved() {
		this.dirty_.clear();
		this.overviewDirty_ = false;
		this.trim();
	}
	/** @internal Gives a tile in memory its splatmaps where it has none, painted as the ground is painted now. */
	ensureTileSplats(e, t, n, r) {
		const i = this.doc.tileSamples, a = i - 1;
		const o = (r) => {
			const o = new Uint8Array(i * i * 4);
			for (let s = 0; s < i; s++) for (let c = 0; c < i; c++) {
				const l = ((t * a + c) / (this.samplesX - 1) - .5) * this.params.sizeX, u = ((n * a + s) / (this.samplesZ - 1) - .5) * this.params.sizeZ;
				const d = this.params.height * e.field.data[s * i + c];
				const f = this.paint(l, u, d, this.normal(l, u)?.[1] ?? 1);
				for (let e = 0; e < 4; e++) o[(s * i + c) * 4 + e] = Math.round(Math.min(Math.max(f[e + r] ?? 0, 0), 1) * 255);
			}
			return {
				width: i,
				height: i,
				pixels: o
			};
		};
		if (!e.splat) {
			e.splat = o(0);
			e.bytes += e.splat.pixels.byteLength;
			this.bytes_ += e.splat.pixels.byteLength;
		}
		if (r && !e.splat2) {
			e.splat2 = o(4);
			e.bytes += e.splat2.pixels.byteLength;
			this.bytes_ += e.splat2.pixels.byteLength;
		}
	}
	/** @internal The overview's splatmaps, made at the overview's size where it has none. */
	overviewSplats(e, t) {
		const n = this.overview.width, r = this.overview.height;
		if (e && !this.overviewSplat) {
			const e = new Uint8Array(n * r * 4), t = this.overview.data, i = this.params.sizeX / (n - 1), a = this.params.sizeZ / (r - 1);
			for (let o = 0; o < r; o++) for (let s = 0; s < n; s++) {
				const c = (e, i) => t[Math.min(Math.max(i, 0), r - 1) * n + Math.min(Math.max(e, 0), n - 1)] * this.params.height;
				const l = (c(s + 1, o) - c(s - 1, o)) / (2 * i), u = (c(s, o + 1) - c(s, o - 1)) / (2 * a);
				const d = H(t[o * n + s], 1 / Math.hypot(l, 1, u), this.params);
				for (let t = 0; t < 4; t++) e[(o * n + s) * 4 + t] = Math.round(d[t] * 255);
			}
			this.overviewSplat = {
				width: n,
				height: r,
				pixels: e
			};
		}
		if (e && t && !this.overviewSplat2) this.overviewSplat2 = {
			width: n,
			height: r,
			pixels: new Uint8Array(n * r * 4)
		};
		return {
			a: this.overviewSplat,
			b: this.overviewSplat2
		};
	}
	tile(e) {
		const t = this.tiles_.get(e);
		if (t) t.used = ++this.clock_;
		return t;
	}
	ensure(e) {
		const t = this.tiles_.get(e);
		if (t) return Promise.resolve(t);
		const n = this.reading_.get(e);
		if (n) return n;
		const r = this.entries_.get(e);
		if (!r) return Promise.resolve(null);
		const i = (async () => {
			const [t, n, i] = await Promise.all([
				this.read(r.height),
				r.splat ? this.read(r.splat) : null,
				r.splat2 ? this.read(r.splat2) : null
			]);
			if (!t) throw new Error(`the heights of terrain tile ${e} (${r.height}) could not be read`);
			if (t.width !== this.doc.tileSamples || t.height !== this.doc.tileSamples) throw new Error(`terrain tile ${e} is ${t.width} by ${t.height}, not ${this.doc.tileSamples} a side`);
			const a = I(t.width, t.height, t.pixels, this.doc.format, t.wide);
			const o = n && {
				width: n.width,
				height: n.height,
				pixels: n.pixels
			};
			const s = i && {
				width: i.width,
				height: i.height,
				pixels: i.pixels
			};
			const c = {
				field: a,
				splat: o,
				splat2: s,
				used: ++this.clock_,
				bytes: a.data.byteLength + (o?.pixels.byteLength ?? 0) + (s?.pixels.byteLength ?? 0)
			};
			this.tiles_.set(e, c);
			this.bytes_ += c.bytes;
			this.reads_++;
			this.trim(/* @__PURE__ */ new Set([e]));
			return c;
		})().finally(() => this.reading_.delete(e));
		this.reading_.set(e, i);
		return i;
	}
	/** Where (x, z) falls: its tile's key, and its place in that tile in samples. */
	locate(e, t) {
		const n = this.doc.tileSamples - 1;
		const r = X(e / this.params.sizeX + .5, 0, 1) * (this.samplesX - 1), i = X(t / this.params.sizeZ + .5, 0, 1) * (this.samplesZ - 1);
		const a = Math.min(Math.floor(r / n), this.doc.tilesX - 1), o = Math.min(Math.floor(i / n), this.doc.tilesZ - 1);
		return {
			key: `${a}:${o}`,
			lx: r - a * n,
			lz: i - o * n
		};
	}
	keysOver(e, t, n, r) {
		const i = this.locate(e, t), a = this.locate(n, r);
		const [o, s] = i.key.split(":").map(Number), [c, l] = a.key.split(":").map(Number);
		const u = [];
		for (let e = s; e <= l; e++) for (let t = o; t <= c; t++) u.push(`${t}:${e}`);
		return u;
	}
	fromOverview(e, t, n, r) {
		const i = new Float32Array(r * r);
		const a = this.overviewSplat ? new Float32Array(r * r * 4) : void 0;
		const o = this.overviewSplat2 ? new Float32Array(r * r * 4) : void 0;
		for (let s = 0; s < r; s++) for (let c = 0; c < r; c++) {
			const l = s * r + c;
			const u = X((e + c * n) / this.params.sizeX + .5, 0, 1), d = X((t + s * n) / this.params.sizeZ + .5, 0, 1);
			i[l] = this.params.height * xt(this.overview.data, this.overview.width, u * (this.overview.width - 1), d * (this.overview.height - 1));
			if (a) Z(a, l, this.overviewSplat, u, d);
			if (o) Z(o, l, this.overviewSplat2, u, d);
		}
		return {
			heights: i,
			...a ? { paint: a } : {},
			...o ? { paint2: o } : {}
		};
	}
	fromTiles(e, t, n, r) {
		const i = new Float32Array(r * r);
		const a = this.overviewSplat !== null || [...this.tiles_.values()].some((e) => e.splat);
		const o = a ? new Float32Array(r * r * 4) : void 0;
		const s = this.overviewSplat2 !== null || [...this.tiles_.values()].some((e) => e.splat2);
		const c = a && s ? new Float32Array(r * r * 4) : void 0;
		const l = this.doc.tileSamples - 1;
		for (let a = 0; a < r; a++) for (let s = 0; s < r; s++) {
			const u = a * r + s, d = e + s * n, f = t + a * n;
			const p = this.locate(d, f), m = this.tiles_.get(p.key);
			const h = X(d / this.params.sizeX + .5, 0, 1), g = X(f / this.params.sizeZ + .5, 0, 1);
			i[u] = m ? this.params.height * xt(m.field.data, m.field.width, p.lx, p.lz) : this.params.height * xt(this.overview.data, this.overview.width, h * (this.overview.width - 1), g * (this.overview.height - 1));
			if (!o) continue;
			const _ = m?.splat ?? this.overviewSplat, v = m?.splat ? m.splat2 : this.overviewSplat2;
			const y = m?.splat ? p.lx / l : h, b = m?.splat ? p.lz / l : g;
			if (_) Z(o, u, _, y, b);
			if (c && v) Z(c, u, v, y, b);
		}
		return {
			heights: i,
			...o ? { paint: o } : {},
			...c ? { paint2: c } : {}
		};
	}
};
const X = (e, t, n) => Math.min(Math.max(e, t), n);
function xt(e, t, n, r) {
	const i = e.length / t;
	const a = X(Math.floor(n), 0, t - 2), o = X(Math.floor(r), 0, i - 2);
	const s = n - a, c = r - o;
	const l = e[o * t + a], u = e[o * t + a + 1], d = e[(o + 1) * t + a], f = e[(o + 1) * t + a + 1];
	return l + (u - l) * s + (d - l) * c + (l - u - d + f) * s * c;
}
function Z(e, t, n, r, i) {
	const a = Math.round(X(r, 0, 1) * (n.width - 1)), o = Math.round(X(i, 0, 1) * (n.height - 1));
	for (let r = 0; r < 4; r++) e[t * 4 + r] = n.pixels[(o * n.width + a) * 4 + r] / 255;
}
function St(e, t, n, r) {
	const i = new Float32Array(t ? 8 : 4);
	Z(i, 0, e, n, r);
	if (t) {
		const e = /* @__PURE__ */ new Float32Array(4);
		Z(e, 0, t, n, r);
		i.set(e, 4);
	}
	return [...i];
}
//#endregion
//#region src/terrain/tiledGroundEdit.ts
/**
* @file    tiledGroundEdit.ts
* @brief   Brushes on ground kept as tiles: a dab changes the tiles in memory under it and the overview with them, and a changed tile stays
*          in memory until it is saved.
*
* @details A dab is run on a window of the area's samples copied out of the tiles it covers (one sample wider, for smoothing), with the
*          same brushes as an area of one heightfield (sculpt.ts), and written back to every tile that holds each changed sample, so a
*          seam two tiles share stays one height. Where a tile under the brush is not in memory yet, it is read and that dab is skipped,
*          as only loaded ground can be edited.
*/
const Ct = () => ({
	heights: null,
	splat: null,
	splat2: null,
	h: null,
	s: null,
	s2: null
});
/** One tiled ground, open to brushes. @experimental */
var wt = class {
	/** @internal */
	constructor(e, t, n, r, i) {
		this.host = e;
		this.source = t;
		this.modified = n;
		this.sizeX = r;
		this.sizeZ = i;
		this.tiled = true;
		this.open_ = null;
	}
	get minHeight() {
		return this.source.minHeight;
	}
	get maxHeight() {
		return this.source.maxHeight;
	}
	get area() {
		return {
			sizeX: this.sizeX,
			sizeZ: this.sizeZ
		};
	}
	get origin() {
		return {
			x: this.modified.origin.x,
			z: this.modified.origin.z
		};
	}
	get samplesX() {
		return this.source.samplesX;
	}
	get samplesZ() {
		return this.source.samplesZ;
	}
	/** Tiles changed and not saved yet. */
	get unsaved() {
		return this.source.dirtyTiles();
	}
	heightAt(e, t) {
		return this.source.height(e - this.modified.origin.x, t - this.modified.origin.z);
	}
	begin() {
		if (!this.open_) this.open_ = {
			tiles: /* @__PURE__ */ new Map(),
			overview: Ct(),
			bounds: null
		};
	}
	sculpt(e, t, n, r, i, a, o) {
		const s = this.span;
		this.dab({
			x: t,
			z: n,
			radius: r,
			falloff: i
		}, (t, n, r, i) => {
			const c = {
				width: t.w,
				height: t.h,
				data: this.readWindow(t, (e) => e.field.data, 1)
			};
			const l = fe(c, n, r, {
				mode: e,
				brush: i,
				amount: e <= 1 ? a / s : a,
				target: o === void 0 ? void 0 : (o - this.minHeight) / s
			});
			if (l) this.writeWindow(t, l, c.data, 1, "heights");
			return l;
		});
	}
	paint(e, t, n, r, i, a, o = false) {
		this.dab({
			x: t,
			z: n,
			radius: r,
			falloff: i
		}, (t, n, r, i) => {
			const s = e > 3 || t.tiles.some(({ tile: e }) => e.splat2);
			for (const { tile: e, tx: n, tz: r } of t.tiles) this.source.ensureTileSplats(e, n, r, s);
			const c = {
				width: t.w,
				height: t.h,
				pixels: this.readWindow(t, (e) => e.splat.pixels, 4)
			};
			const l = s ? {
				width: t.w,
				height: t.h,
				pixels: this.readWindow(t, (e) => e.splat2.pixels, 4)
			} : null;
			const u = he(c, l, n, r, {
				layer: e,
				brush: i,
				strength: a,
				erase: o
			});
			if (!u) return null;
			this.writeWindow(t, u, c.pixels, 4, "splat");
			if (l) this.writeWindow(t, u, l.pixels, 4, "splat2");
			return u;
		});
	}
	end() {
		const e = this.open_;
		this.open_ = null;
		if (!e || !e.bounds) return null;
		const t = /* @__PURE__ */ new Map();
		for (const [n, r] of e.tiles) {
			const [e, i] = n.split(":").map(Number);
			const a = this.source.tileAt(e, i);
			if (a) t.set(n, Tt(r, a.field.data, a.splat?.pixels, a.splat2?.pixels));
		}
		const { a: n, b: r } = this.source.overviewSplats(false, false);
		return {
			tiles: t,
			overview: Tt(e.overview, this.source.overview.data, n?.pixels, r?.pixels),
			bounds: e.bounds
		};
	}
	/** Lays a patch's `before` or `after` back; a tile that has left memory since is read again first. */
	apply(e, t) {
		const n = (e, n) => {
			if (n.heights) q(e.field.data, n.heights, t, 1);
			if (n.splat && e.splat) q(e.splat.pixels, n.splat, t, 4);
			if (n.splat2 && e.splat2) q(e.splat2.pixels, n.splat2, t, 4);
		};
		const r = [];
		for (const [t, i] of e.tiles) {
			const [e, a] = t.split(":").map(Number);
			this.source.markDirty(e, a);
			const o = this.source.tileAt(e, a);
			if (o) {
				n(o, i);
				continue;
			}
			r.push(this.source.readTile(e, a).then((e) => {
				if (e) n(e, i);
			}));
		}
		const { a: i, b: a } = this.source.overviewSplats(!!e.overview.splat, !!e.overview.splat2);
		if (e.overview.heights) q(this.source.overview.data, e.overview.heights, t, 1);
		if (e.overview.splat && i) q(i.pixels, e.overview.splat, t, 4);
		if (e.overview.splat2 && a) q(a.pixels, e.overview.splat2, t, 4);
		this.source.markOverviewDirty();
		this.host.remake(this.world(e.bounds));
		if (r.length) Promise.all(r).then(() => this.host.remake(this.world(e.bounds)));
	}
	/**
	* What a save writes: every changed tile's images, and the overview's, at the paths the document names. A splatmap the document did not
	* name before is given a path beside its tile's heights, and `document` is then the document to write as well (null when unchanged).
	*/
	saveImages() {
		const e = this.source.doc, t = [];
		let n = false;
		const r = (e, t) => e.replace(/(\.[^./]+)?$/, `${t}.png`);
		for (const i of this.source.dirtyTiles()) {
			const [a, o] = i.split(":").map(Number);
			const s = this.source.tileAt(a, o), c = e.tiles.find((e) => e.x === a && e.z === o);
			if (!s || !c) continue;
			t.push({
				path: c.height,
				width: s.field.width,
				height: s.field.height,
				pixels: W(s.field)
			});
			if (s.splat) {
				if (!c.splat) {
					c.splat = r(c.height, "_splat");
					n = true;
				}
				t.push({
					path: c.splat,
					...s.splat
				});
			}
			if (s.splat2) {
				if (!c.splat2) {
					c.splat2 = r(c.height, "_splat2");
					n = true;
				}
				t.push({
					path: c.splat2,
					...s.splat2
				});
			}
		}
		if (this.source.overviewDirty) {
			t.push({
				path: e.overview,
				width: this.source.overview.width,
				height: this.source.overview.height,
				pixels: W(this.source.overview)
			});
			const { a: i, b: a } = this.source.overviewSplats(false, false);
			if (i) {
				if (!e.overviewSplat) {
					e.overviewSplat = r(e.overview, "_splat");
					n = true;
				}
				t.push({
					path: e.overviewSplat,
					...i
				});
			}
			if (a) {
				if (!e.overviewSplat2) {
					e.overviewSplat2 = r(e.overview, "_splat2");
					n = true;
				}
				t.push({
					path: e.overviewSplat2,
					...a
				});
			}
		}
		return {
			images: t,
			document: n ? e : null
		};
	}
	/**
	* The whole area as one heightmap image, the size {@link importImage} takes: from every tile (`all`, each read in turn), or from
	* the tiles in memory (`loaded`), the rest from the overview. Null when `loaded` finds no tile in memory.
	*/
	async exportImage(e) {
		const t = this.source, n = t.doc.tileSamples - 1, r = n + 1;
		const i = t.doc.tiles.filter((n) => e === "all" || t.tileAt(n.x, n.z));
		if (i.length === 0) return null;
		const a = 0, o = 0;
		const s = {
			width: t.samplesX,
			height: t.samplesZ,
			data: new Float32Array(t.samplesX * t.samplesZ)
		};
		const c = t.overview;
		for (let e = 0; e < s.height; e++) for (let n = 0; n < s.width; n++) {
			const r = (a + n) / (t.samplesX - 1) * (c.width - 1), i = (o + e) / (t.samplesZ - 1) * (c.height - 1);
			s.data[e * s.width + n] = Et(c.data, c.width, r, i);
		}
		for (const c of i) {
			const i = t.tileAt(c.x, c.z) ?? (e === "all" ? await t.readTile(c.x, c.z) : null);
			if (!i) continue;
			for (let e = 0; e < r; e++) {
				const t = (c.z * n + e - o) * s.width + (c.x * n - a);
				s.data.set(i.field.data.subarray(e * r, e * r + r), t);
			}
		}
		return {
			width: s.width,
			height: s.height,
			pixels: W(s)
		};
	}
	/**
	* A heightmap laid over the ground: on every tile (`all`) or the tiles in memory (`loaded`). `field` covers the whole area and is
	* resampled to it if its size differs. The tiles in memory take it at once; what comes back is every image to write (the tiles'
	* and the overview's). Refused while there are changes not saved, which it would overwrite.
	*/
	importImage(e, t) {
		const n = this.source, r = n.doc.tileSamples - 1, i = r + 1;
		if (n.dirtyTiles().length > 0 || n.overviewDirty) throw new Error("save or undo the changes to this terrain before importing over it");
		const a = (t, r) => Et(e.data, e.width, t / (n.samplesX - 1) * (e.width - 1), r / (n.samplesZ - 1) * (e.height - 1));
		const o = n.doc.tiles.filter((e) => t === "all" || n.tileAt(e.x, e.z));
		const s = [];
		for (const e of o) {
			const t = {
				width: i,
				height: i,
				data: new Float32Array(i * i)
			};
			for (let n = 0; n < i; n++) for (let o = 0; o < i; o++) t.data[n * i + o] = a(e.x * r + o, e.z * r + n);
			const o = n.tileAt(e.x, e.z);
			if (o) o.field.data.set(t.data);
			s.push({
				path: e.height,
				width: i,
				height: i,
				pixels: W(t)
			});
		}
		const c = n.overview;
		for (let e = 0; e < c.height; e++) for (let t = 0; t < c.width; t++) {
			const i = t / (c.width - 1) * (n.samplesX - 1), s = e / (c.height - 1) * (n.samplesZ - 1);
			const l = Math.min(Math.floor(i / r), n.doc.tilesX - 1), u = Math.min(Math.floor(s / r), n.doc.tilesZ - 1);
			if (o.some((e) => e.x === l && e.z === u)) c.data[e * c.width + t] = a(i, s);
		}
		s.push({
			path: n.doc.overview,
			width: c.width,
			height: c.height,
			pixels: W(c)
		});
		this.host.remake(this.world([
			-this.sizeX / 2,
			-this.sizeZ / 2,
			this.sizeX / 2,
			this.sizeZ / 2
		]));
		return s;
	}
	/** After the images of {@link saveImages} are written: the tiles may leave memory again. */
	saved() {
		this.source.markSaved();
	}
	get span() {
		return Math.max(this.maxHeight - this.minHeight, 1e-6);
	}
	/** The window of samples a brush reaches, one wider, and the tiles in memory over it; null where one is not, after asking for it. */
	dab(e, t) {
		const n = this.modified.origin, r = this.source;
		const i = {
			...e,
			x: e.x - n.x,
			z: e.z - n.z
		};
		const a = de(r.samplesX, r.samplesZ, this.sizeX, this.sizeZ, i);
		if (!a) return;
		const o = this.window(a);
		if (!o) return;
		const s = this.sizeX / (r.samplesX - 1), c = this.sizeZ / (r.samplesZ - 1);
		const l = ((o.i0 + o.i1) / 2 / (r.samplesX - 1) - .5) * this.sizeX, u = ((o.j0 + o.j1) / 2 / (r.samplesZ - 1) - .5) * this.sizeZ;
		const d = t(o, (o.w - 1) * s, (o.h - 1) * c, {
			...i,
			x: i.x - l,
			z: i.z - u
		});
		if (!d) return;
		const f = {
			i0: d.i0 + o.i0,
			j0: d.j0 + o.j0,
			i1: d.i1 + o.i0,
			j1: d.j1 + o.j0
		};
		this.updateOverview(f);
		const p = [
			(f.i0 / (r.samplesX - 1) - .5) * this.sizeX - s,
			(f.j0 / (r.samplesZ - 1) - .5) * this.sizeZ - c,
			(f.i1 / (r.samplesX - 1) - .5) * this.sizeX + s,
			(f.j1 / (r.samplesZ - 1) - .5) * this.sizeZ + c
		];
		if (this.open_) {
			const e = this.open_.bounds;
			this.open_.bounds = e ? [
				Math.min(e[0], p[0]),
				Math.min(e[1], p[1]),
				Math.max(e[2], p[2]),
				Math.max(e[3], p[3])
			] : p;
		}
		this.host.remake(this.world(p));
	}
	window(e) {
		const t = this.source, n = t.doc.tileSamples - 1;
		const r = Math.max(e.i0 - 1, 0), i = Math.max(e.j0 - 1, 0);
		const a = Math.min(e.i1 + 1, t.samplesX - 1), o = Math.min(e.j1 + 1, t.samplesZ - 1);
		const s = [];
		let c = false;
		for (let e = Math.min(Math.floor(i / n), t.doc.tilesZ - 1); e <= Math.min(Math.floor(o / n), t.doc.tilesZ - 1); e++) for (let i = Math.min(Math.floor(r / n), t.doc.tilesX - 1); i <= Math.min(Math.floor(a / n), t.doc.tilesX - 1); i++) {
			if (!t.hasTile(i, e)) continue;
			const n = t.tileAt(i, e);
			if (n) s.push({
				tile: n,
				tx: i,
				tz: e
			});
			else {
				c = true;
				t.readTile(i, e);
			}
		}
		return c ? null : {
			i0: r,
			j0: i,
			i1: a,
			j1: o,
			w: a - r + 1,
			h: o - i + 1,
			tiles: s
		};
	}
	/** The window's values of one array, read from whichever tile holds each sample. */
	readWindow(e, t, n) {
		const r = this.source.doc.tileSamples - 1, i = r + 1;
		let a = null;
		for (const { tile: o, tx: s, tz: c } of e.tiles) {
			const l = t(o);
			a ??= new l.constructor(e.w * e.h * n);
			const u = Math.max(e.i0, s * r), d = Math.min(e.i1, s * r + r), f = Math.max(e.j0, c * r), p = Math.min(e.j1, c * r + r);
			for (let t = f; t <= p; t++) {
				const o = ((t - c * r) * i + (u - s * r)) * n;
				a.set(l.subarray(o, o + (d - u + 1) * n), ((t - e.j0) * e.w + (u - e.i0)) * n);
			}
		}
		return a;
	}
	/** Writes the window's `hit` back into every tile that holds a sample of it, keeping each tile's values first for undo. */
	writeWindow(e, t, n, r, i) {
		const a = this.source.doc.tileSamples - 1, o = a + 1;
		const s = t.i0 + e.i0, c = t.i1 + e.i0, l = t.j0 + e.j0, u = t.j1 + e.j0;
		for (const { tile: t, tx: d, tz: f } of e.tiles) {
			const p = Math.max(s, d * a), m = Math.min(c, d * a + a), h = Math.max(l, f * a), g = Math.min(u, f * a + a);
			if (p > m || h > g) continue;
			const _ = i === "heights" ? t.field.data : i === "splat" ? t.splat.pixels : t.splat2.pixels;
			const v = {
				i0: p - d * a,
				j0: h - f * a,
				i1: m - d * a,
				j1: g - f * a
			};
			if (this.open_) {
				const e = `${d}:${f}`;
				let t = this.open_.tiles.get(e);
				if (!t) this.open_.tiles.set(e, t = Ct());
				if (i === "heights") {
					(t.heights ??= new K(o, o, 1)).keep(_, v);
					t.h = U(t.h, v);
				} else if (i === "splat") {
					(t.splat ??= new K(o, o, 4)).keep(_, v);
					t.s = U(t.s, v);
				} else {
					(t.splat2 ??= new K(o, o, 4)).keep(_, v);
					t.s2 = U(t.s2, v);
				}
			}
			for (let t = h; t <= g; t++) {
				const i = ((t - e.j0) * e.w + (p - e.i0)) * r;
				_.set(n.subarray(i, i + (m - p + 1) * r), ((t - f * a) * o + (p - d * a)) * r);
			}
			this.source.markDirty(d, f);
		}
	}
	/** Brings the overview's samples over the changed samples up to date, from the tiles. */
	updateOverview(e) {
		const t = this.source, n = t.overview, r = n.width, i = n.height;
		const a = (r - 1) / (t.samplesX - 1), o = (i - 1) / (t.samplesZ - 1);
		const s = {
			i0: Math.max(Math.floor((e.i0 - 1) * a), 0),
			j0: Math.max(Math.floor((e.j0 - 1) * o), 0),
			i1: Math.min(Math.ceil((e.i1 + 1) * a), r - 1),
			j1: Math.min(Math.ceil((e.j1 + 1) * o), i - 1)
		};
		const c = [...this.tilesOver(s, a, o)].some(({ tile: e }) => e.splat);
		const { a: l, b: u } = t.overviewSplats(c, [...this.tilesOver(s, a, o)].some(({ tile: e }) => e.splat2));
		const d = this.open_?.overview;
		if (d) {
			(d.heights ??= new K(r, i, 1)).keep(n.data, s);
			d.h = U(d.h, s);
			if (l) {
				(d.splat ??= new K(r, i, 4)).keep(l.pixels, s);
				d.s = U(d.s, s);
			}
			if (u) {
				(d.splat2 ??= new K(r, i, 4)).keep(u.pixels, s);
				d.s2 = U(d.s2, s);
			}
		}
		const f = t.doc.tileSamples - 1;
		for (let e = s.j0; e <= s.j1; e++) for (let i = s.i0; i <= s.i1; i++) {
			const s = i / a, c = e / o;
			const d = Math.min(Math.floor(s / f), t.doc.tilesX - 1), p = Math.min(Math.floor(c / f), t.doc.tilesZ - 1);
			const m = t.tileAt(d, p);
			if (!m) continue;
			const h = s - d * f, g = c - p * f;
			n.data[e * r + i] = Et(m.field.data, f + 1, h, g);
			const _ = Math.round(h), v = (Math.round(g) * (f + 1) + _) * 4, y = (e * r + i) * 4;
			if (l && m.splat) l.pixels.set(m.splat.pixels.subarray(v, v + 4), y);
			if (u && m.splat2) u.pixels.set(m.splat2.pixels.subarray(v, v + 4), y);
		}
		t.markOverviewDirty();
	}
	*tilesOver(e, t, n) {
		const r = this.source, i = r.doc.tileSamples - 1;
		for (let a = Math.floor(e.j0 / n / i); a <= Math.min(Math.floor(e.j1 / n / i), r.doc.tilesZ - 1); a++) for (let n = Math.floor(e.i0 / t / i); n <= Math.min(Math.floor(e.i1 / t / i), r.doc.tilesX - 1); n++) {
			const e = r.tileAt(n, a);
			if (e) yield { tile: e };
		}
	}
	world(e) {
		const t = this.modified.origin;
		return [
			e[0] + t.x,
			e[1] + t.z,
			e[2] + t.x,
			e[3] + t.z
		];
	}
};
function Tt(e, t, n, r) {
	return {
		heights: e.heights && e.h ? e.heights.piece(t, e.h) : null,
		splat: e.splat && e.s && n ? e.splat.piece(n, e.s) : null,
		splat2: e.splat2 && e.s2 && r ? e.splat2.piece(r, e.s2) : null
	};
}
function Et(e, t, n, r) {
	const i = e.length / t;
	const a = Math.min(Math.max(Math.floor(n), 0), t - 2), o = Math.min(Math.max(Math.floor(r), 0), i - 2);
	const s = n - a, c = r - o;
	const l = e[o * t + a], u = e[o * t + a + 1], d = e[(o + 1) * t + a], f = e[(o + 1) * t + a + 1];
	return l + (u - l) * s + (d - l) * c + (l - u - d + f) * s * c;
}
//#endregion
//#region src/terrain/terrainPlugin.ts
/** The engine's own provider of ground without end: seeded noise of the world's position. */
const Dt = "estella:noise";
/** How far the ground goes: an area of its own size, or for ever. */
const Q = {
	Area: 0,
	Infinite: 1
};
const Ot = (e, t, n) => ({
	r: e,
	g: t,
	b: n,
	a: 1
});
/**
* The ground. Presence is the opt-in; its children are the quadtree's nodes, drawn as instances of one patch.
*
* @experimental
*/
const kt = /* @__PURE__ */ e("Terrain", {
	extent: Q.Area,
	provider: Dt,
	world: "",
	generatorVersion: 1,
	heightmap: 0,
	tiles: "",
	heightmapFormat: F.Grey,
	splatmap: 0,
	splatmap2: 0,
	colorMap: 0,
	colorMapStrength: 1,
	occlusionMap: 0,
	occlusionStrength: 1,
	layers: [],
	material: 0,
	sizeX: 1e5,
	sizeZ: 1e5,
	height: 15e3,
	cellSize: 200,
	detail: 1,
	drawDistance: 4e5,
	collision: true,
	collisionDistance: 6400,
	collisionLayer: 0,
	friction: .6,
	seed: 1,
	frequency: 3,
	octaves: 5,
	persistence: .5,
	ridged: .35,
	resolution: 257,
	warp: 0,
	erosion: 0,
	rockSlope: .35,
	dirtHeight: .62,
	snowHeight: .88,
	layerColor0: Ot(.28, .46, .2),
	layerColor1: Ot(.45, .36, .24),
	layerColor2: Ot(.93, .95, .98),
	layerColor3: Ot(.4, .38, .36)
}, {
	assetFields: [
		{
			field: "heightmap",
			type: "texture"
		},
		{
			field: "splatmap",
			type: "texture"
		},
		{
			field: "splatmap2",
			type: "texture"
		},
		{
			field: "colorMap",
			type: "texture"
		},
		{
			field: "occlusionMap",
			type: "texture"
		},
		{
			field: "material",
			type: "material"
		}
	],
	worldUnitFields: [
		"sizeX",
		"sizeZ",
		"height",
		"cellSize",
		"drawDistance",
		"collisionDistance"
	],
	fields: {
		extent: {
			enum: [{
				label: "Area",
				value: Q.Area
			}, {
				label: "Infinite",
				value: Q.Infinite
			}],
			category: "Shape",
			tooltip: "An area of its own size, from a heightmap or noise; or ground that goes on for ever, from noise read anywhere (the same seed is the same ground)."
		},
		provider: {
			category: "Shape",
			tooltip: "The generator the ground is made by, without end or (with no heightmap) in an area: estella:noise, or one the game registers. The same provider, world, seed and version are the same ground on every machine, and two areas side by side join."
		},
		world: {
			category: "Shape",
			tooltip: "The world (a planet, a level) the ground belongs to, as the game names it; handed to the provider."
		},
		generatorVersion: {
			min: 1,
			step: 1,
			category: "Shape",
			tooltip: "The generator version the world was made with. A version the provider no longer has fails the terrain rather than growing other ground under what was built."
		},
		heightmap: {
			tooltip: "A heightmap image, read as data (shipped as the PNG it is). Empty makes the ground from noise; a heightmap that cannot be read fails the terrain instead.",
			category: "Shape",
			shownWhen: {
				field: "extent",
				values: [Q.Area]
			}
		},
		tiles: {
			category: "Shape",
			tooltip: "A .esterrain: the ground as tiles, read near where it is looked at and let go far from it, with a coarse overview for the rest. Takes the heightmap's place.",
			shownWhen: {
				field: "extent",
				values: [Q.Area]
			}
		},
		heightmapFormat: {
			enum: [{
				label: "Grey (8 or 16 bit)",
				value: F.Grey
			}, {
				label: "Red + green (16 bit)",
				value: F.RedGreen16
			}],
			category: "Shape",
			tooltip: "How the heightmap holds its heights: grey (or red) at the depth of the file, 16 bits from a 16-bit PNG; or sixteen bits across red (high byte) and green (low byte) of an 8-bit image.",
			shownWhen: {
				field: "extent",
				values: [Q.Area]
			}
		},
		splatmap: {
			tooltip: "An image whose red, green, blue and alpha are the weights of grass, dirt, snow and rock.",
			category: "Layers",
			shownWhen: {
				field: "extent",
				values: [Q.Area]
			}
		},
		splatmap2: {
			tooltip: "An image whose red, green, blue and alpha are the weights of layers 5 to 8.",
			category: "Layers",
			shownWhen: {
				field: "extent",
				values: [Q.Area]
			}
		},
		colorMap: {
			tooltip: "A picture laid over the whole area and mixed into the ground's colour by its alpha. Its Use is Colour.",
			category: "Layers",
			shownWhen: {
				field: "extent",
				values: [Q.Area]
			}
		},
		colorMapStrength: {
			min: 0,
			max: 1,
			step: .01,
			slider: true,
			category: "Layers",
			tooltip: "How much of the colour map is mixed in where its alpha is whole.",
			shownWhen: {
				field: "extent",
				values: [Q.Area]
			}
		},
		occlusionMap: {
			tooltip: "An image over the whole area whose red says how much of the sky reaches the ground: white all of it, black none. It dims the light from all round, not the sun's. Its Use is Data.",
			category: "Layers",
			shownWhen: {
				field: "extent",
				values: [Q.Area]
			}
		},
		occlusionStrength: {
			min: 0,
			max: 1,
			step: .01,
			slider: true,
			category: "Layers",
			tooltip: "How much of the occlusion map is applied.",
			shownWhen: {
				field: "extent",
				values: [Q.Area]
			}
		},
		layers: {
			tooltip: "The terrain layers (.esterrainlayer, up to eight) the ground is drawn with, in the order the paint weighs them. Empty draws the four layer colours.",
			category: "Layers"
		},
		material: {
			tooltip: "A material on the Terrain shader (on Terrain Layers when the ground has layers). Empty uses the stock one.",
			category: "Layers"
		},
		sizeX: {
			min: 1,
			category: "Shape",
			tooltip: "An area's size along x; for ground without end, the span its hills are spread over."
		},
		sizeZ: {
			min: 1,
			category: "Shape",
			tooltip: "An area's size along z.",
			shownWhen: {
				field: "extent",
				values: [Q.Area]
			}
		},
		height: {
			min: 0,
			category: "Shape",
			tooltip: "World height of the highest ground."
		},
		cellSize: {
			min: .01,
			category: "Detail",
			tooltip: "The finest cell of the ground's mesh, in world units: what it is drawn at near the eye. Further off the cells double, level by level."
		},
		detail: {
			min: .25,
			max: 8,
			step: .05,
			category: "Detail",
			tooltip: "Above 1 the finest cells reach further out before the ground coarsens."
		},
		drawDistance: {
			min: 1,
			category: "Detail",
			tooltip: "How far ground without end is drawn.",
			shownWhen: {
				field: "extent",
				values: [Q.Infinite]
			}
		},
		collision: {
			category: "Collision",
			tooltip: "Whether 3D bodies and characters collide with the ground: the finest level's triangles, wherever the camera is."
		},
		collisionDistance: {
			min: 1,
			category: "Collision",
			tooltip: "How far round each moving body and character the ground is built for collision, in world units."
		},
		collisionLayer: {
			min: 0,
			max: 15,
			step: 1,
			category: "Collision",
			advanced: true,
			tooltip: "The collision layer the ground is in (0 to 15)."
		},
		friction: {
			min: 0,
			category: "Collision",
			advanced: true,
			tooltip: "How much the ground holds what slides on it."
		},
		seed: {
			step: 1,
			category: "Noise",
			tooltip: "Another seed is another ground."
		},
		frequency: {
			min: .1,
			max: 32,
			step: .1,
			category: "Noise",
			tooltip: "How many hills across the terrain (or across sizeX, for ground without end)."
		},
		octaves: {
			min: 1,
			max: 8,
			step: 1,
			category: "Noise",
			tooltip: "Layers of detail in the noise."
		},
		persistence: {
			min: 0,
			max: 1,
			step: .01,
			category: "Noise",
			tooltip: "How much of its height each finer layer keeps. Lower is smoother."
		},
		ridged: {
			min: 0,
			max: 1,
			step: .01,
			category: "Noise",
			tooltip: "0 is rolling hills; 1 is sharp ridges."
		},
		resolution: {
			min: 17,
			max: 2049,
			step: 1,
			category: "Noise",
			tooltip: "Samples along each side of an area's noise ground.",
			shownWhen: {
				field: "extent",
				values: [Q.Area]
			}
		},
		warp: {
			min: 0,
			max: 1,
			step: .01,
			category: "Noise",
			tooltip: "How far the noise is bent by noise of its own: winding valleys and bent ridges instead of round hills."
		},
		erosion: {
			min: 0,
			max: 4,
			step: .05,
			category: "Shape",
			tooltip: "How much rain wears the ground: an area (a heightmap's too) drop by drop, with dirt where the water ran; ground without end by its noise. 0 leaves it as made."
		},
		rockSlope: {
			min: 0,
			max: 1,
			step: .01,
			category: "Layers",
			tooltip: "How steep ground must be to turn to rock. 0 is flat, 1 is sheer."
		},
		dirtHeight: {
			min: 0,
			max: 1,
			step: .01,
			category: "Layers",
			tooltip: "The height, as a share of the terrain, where grass gives way to dirt."
		},
		snowHeight: {
			min: 0,
			max: 1,
			step: .01,
			category: "Layers",
			tooltip: "The height, as a share of the terrain, where snow begins."
		},
		layerColor0: {
			label: "Grass",
			category: "Layers"
		},
		layerColor1: {
			label: "Dirt",
			category: "Layers"
		},
		layerColor2: {
			label: "Snow",
			category: "Layers"
		},
		layerColor3: {
			label: "Rock",
			category: "Layers"
		}
	}
});
/** The side of the atlases the pages are kept in, in texels: 900 pages of 67 by 67. */
const At = 2048;
/** The share of the atlas the nodes drawn may fill: the rest is for the coarser pages that stand in while a finer one is made. */
const jt = .85;
/** The most layers a terrain draws: two paint atlases of four weights. */
const Mt = 8;
/** The chunk layer a terrain's collision is, and the key of one tile's piece of collision geometry. */
const Nt = (e) => `terrain-collision:${e}`;
const Pt = (e, t, n) => `terrain:${e}:${t}:${n}`;
/** Pages asked at once of a provider that answers later. */
const Ft = 16;
/** Run-time access to the ground: how high it is anywhere, for putting things on it. */
var It = class {
	constructor() {
		this.built_ = /* @__PURE__ */ new Map();
		this.app_ = null;
		this.modifiers_ = /* @__PURE__ */ new Map();
		this.paint_ = null;
		this.pager_ = null;
		this.revision_ = 0;
	}
	/**
	* The world height of the ground at (x, z), or null where no terrain is. The terrain's own position is taken into account; its
	* rotation and scale are not (a terrain is laid flat at its own size).
	*/
	heightAt(e, t) {
		const n = this.app_?.world;
		if (!n) return null;
		for (const [r, i] of this.built_) {
			if (!i.surface || !n.valid(r)) continue;
			const o = n.tryGet(r, a);
			if (!o) continue;
			const s = rt(i.surface, o.worldPosition, e, t);
			if (s !== null) return s;
		}
		return null;
	}
	/**
	* The weights of the terrain's layers at (x, z), as the ground is painted there (four, or as many as it has layers), or null where no terrain is:
	* what a world's rules read as the fields `paint.<layer>`.
	*/
	paintAt(e, t) {
		const n = this.app_?.world;
		if (!n) return null;
		for (const [r, i] of this.built_) {
			const o = i.source, s = i.surface;
			if (!o || !s || !n.valid(r)) continue;
			const c = n.tryGet(r, a);
			if (!c) continue;
			const l = at(o, s, c.worldPosition, e, t);
			if (l) return l;
		}
		return null;
	}
	/**
	* The world rectangle the terrains cover, `[minX, minZ, maxX, maxZ]`, or null where it has no end (a terrain of infinite extent) or there is none:
	* what a layer of chunks laid over the ground is held to, so it does not count a radius of empty world.
	*/
	areaBounds() {
		const e = this.app_?.world;
		if (!e) return null;
		let t = null;
		for (const [n, r] of this.built_) {
			if (!e.valid(n)) continue;
			if (r.data.extent !== Q.Area) return null;
			const i = e.tryGet(n, a);
			if (!i) continue;
			const o = [
				i.worldPosition.x - r.data.sizeX / 2,
				i.worldPosition.z - r.data.sizeZ / 2,
				i.worldPosition.x + r.data.sizeX / 2,
				i.worldPosition.z + r.data.sizeZ / 2
			];
			t = t ? [
				Math.min(t[0], o[0]),
				Math.min(t[1], o[1]),
				Math.max(t[2], o[2]),
				Math.max(t[3], o[3])
			] : o;
		}
		return t;
	}
	/**
	* The ground as data a worker can rebuild it from, when it can be: one terrain, made, of a field or of noise (the engine's own noise provider
	* included, whose ground is its parameters), with nothing laid over it. Null otherwise (a game's provider, a modified ground, several terrains,
	* one still being made), when what is laid out over it must ask here.
	*/
	groundData() {
		const e = this.app_?.world;
		if (!e || this.built_.size !== 1 || this.modifiers_.size > 0) return null;
		const [t, n] = [...this.built_][0];
		if (n.failure || n.loading || !n.surface || !n.source || !e.valid(t)) return null;
		const r = e.tryGet(t, a);
		if (!r) return null;
		const i = n.source instanceof J ? n.source.base : n.source;
		const o = {
			x: r.worldPosition.x,
			y: r.worldPosition.y,
			z: r.worldPosition.z
		};
		if (i instanceof ye) return {
			origin: o,
			cell: n.surface.cell,
			source: {
				kind: "field",
				data: i.toData()
			}
		};
		if (i instanceof be) return {
			origin: o,
			cell: n.surface.cell,
			source: {
				kind: "noise",
				data: i.toData()
			}
		};
		if (i instanceof Ze && i.provider.id === "estella:noise") {
			const e = n.data;
			const t = {
				seed: e.seed,
				frequency: e.frequency,
				octaves: e.octaves,
				persistence: e.persistence,
				ridged: e.ridged,
				warp: e.warp,
				erosion: e.erosion,
				sizeX: e.sizeX,
				height: e.height,
				rockSlope: e.rockSlope,
				dirtHeight: e.dirtHeight,
				snowHeight: e.snowHeight
			};
			return {
				origin: o,
				cell: n.surface.cell,
				source: {
					kind: "noise",
					data: t
				},
				shift: {
					x: o.x,
					z: o.z
				}
			};
		}
		return null;
	}
	/** The names of the terrain's layers, in the order `paintAt` weighs them: the layer files' names, or grass, dirt, snow and rock without any. */
	layerNames() {
		for (const e of this.built_.values()) {
			const t = e.data.layers ?? [];
			if (t.length > 0) return t.map((e, t) => (e.split("/").pop() ?? "").replace(/\.[^.]*$/, "") || `layer${t}`);
		}
		return [
			"grass",
			"dirt",
			"snow",
			"rock"
		];
	}
	/** The world height of the ground at (x, z) as it was made, under every modifier laid over it: what a plot is levelled from. */
	heightBeneathAt(e, t) {
		const n = this.app_?.world;
		if (!n) return null;
		for (const [r, i] of this.built_) {
			const o = i.source;
			if (!o || !n.valid(r)) continue;
			const s = n.tryGet(r, a);
			if (!s) continue;
			const c = (o instanceof J ? o.base : o).height(e - s.worldPosition.x, t - s.worldPosition.z);
			if (c !== null) return s.worldPosition.y + c;
		}
		return null;
	}
	/** Where the ground faces at (x, z) (a unit normal), or null where no terrain is. */
	normalAt(e, t) {
		const n = this.app_?.world;
		if (!n) return null;
		for (const [r, i] of this.built_) {
			const o = i.surface;
			if (!o || !n.valid(r)) continue;
			const s = n.tryGet(r, a);
			if (!s) continue;
			const c = it(o, s.worldPosition, e, t);
			if (c) return c;
		}
		return null;
	}
	/**
	* Whether the ground at (x, z) is known: false while a terrain that covers it is still being made, or its provider has not answered
	* there yet; true where it is known, and where no terrain is (there is no ground to wait for).
	*/
	groundKnownAt(e, t) {
		const n = this.app_?.world;
		if (!n) return true;
		for (const [r, i] of this.built_) {
			if (i.failure || !n.valid(r)) continue;
			if (i.loading || !i.surface) return false;
			const o = n.tryGet(r, a);
			if (!o) continue;
			const s = e - o.worldPosition.x, c = t - o.worldPosition.z;
			if (i.surface.covers(s, c)) return i.surface.height(s, c) !== null;
		}
		return true;
	}
	/**
	* Where a ray meets the ground, anywhere and whether or not anything collides there: exact against the same triangles collision and
	* `heightAt` use. `maxDistance` is along the direction. Null where it meets no terrain within it.
	*/
	raycast(e, t, n) {
		const r = this.app_?.world;
		if (!r) return null;
		let i = null;
		for (const [o, s] of this.built_) {
			if (!s.surface || !r.valid(o)) continue;
			const c = r.tryGet(o, a);
			if (!c) continue;
			const l = c.worldPosition;
			const u = s.surface.raycast(e.x - l.x, e.y - l.y, e.z - l.z, t.x, t.y, t.z, i ? i.distance : n);
			if (!u) continue;
			i = {
				distance: u.distance,
				entity: o,
				point: {
					x: u.point[0] + l.x,
					y: u.point[1] + l.y,
					z: u.point[2] + l.z
				},
				normal: {
					x: u.normal[0],
					y: u.normal[1],
					z: u.normal[2]
				}
			};
		}
		return i;
	}
	/**
	* A way across the ground from one place to another that a walker held to `maxSlope` can take, or why there is none: what a game
	* checks a spawn, a quest's goal or a village against. The ground is read where the search goes, modifiers and all, so nothing is
	* baked first; ground still being made is no ground yet (see `groundKnownAt`).
	*/
	findPath(e, t, n) {
		return oe(this, e.x, e.z, t.x, t.z, n);
	}
	/** Whether the ground under (x, z) is built for collision: what a game waits on before it drops something there. */
	collisionReadyAt(e, t) {
		const n = this.app_;
		if (!n?.hasResource(N)) return false;
		const r = n.getResource(N);
		for (const [i, o] of this.built_) {
			const s = n.world.valid(i) ? n.world.tryGet(i, a) : null;
			if (!s || !o.surface?.covers(e - s.worldPosition.x, t - s.worldPosition.z)) continue;
			const c = r.stateAt(Nt(i), e, t);
			return c === "ready" || c === "stale";
		}
		return false;
	}
	/** Where a terrain's ground stands. A failed one draws and answers nothing, and says why. */
	status(e) {
		const t = this.built_.get(e);
		if (!t) return null;
		if (t.failure) return {
			state: "failed",
			reason: t.failure
		};
		return { state: t.loading || !t.source ? "loading" : "ready" };
	}
	load() {
		let e = 0, t = 0, n = 0, r = 0;
		for (const i of this.built_.values()) {
			if (i.loading) e++;
			const a = i.source instanceof J ? i.source.base : i.source;
			if (a instanceof bt) {
				const i = a.stats();
				e += i.reading;
				t += i.bytes + a.overviewBytes;
				n += i.resident;
				r += a.dirtyTiles().length;
				continue;
			}
			if (!(a instanceof ye)) continue;
			const { a: o, b: s } = a.splats();
			t += a.field.data.byteLength + (o?.pixels.byteLength ?? 0) + (s?.pixels.byteLength ?? 0);
		}
		return {
			loading: e,
			cpuBytes: t,
			tiles: n,
			unsaved: r
		};
	}
	/**
	* Lays `modifier` over the ground (or replaces the one with its id): the drawn ground, its queries and its collision all follow it,
	* and only what it reaches is made again.
	*/
	setModifier(e) {
		const t = this.modifiers_.get(e.id);
		this.modifiers_.set(e.id, e);
		if (t) this.remake_(t.bounds);
		this.remake_(e.bounds);
	}
	/** Takes a modifier off the ground. */
	deleteModifier(e) {
		const t = this.modifiers_.get(e);
		if (!t) return;
		this.modifiers_.delete(e);
		this.remake_(t.bounds);
	}
	/**
	* A handle to change the ground of the area terrain on `entity` with brushes (sculpt.ts), or null while it is being made, when it
	* is not an area of its own heights (infinite ground, a provider's) or when it is not a terrain.
	*/
	groundEdit(e) {
		const t = this.built_.get(e), n = t?.source;
		if (t && n instanceof J && n.base instanceof bt) return new wt({ remake: (e) => this.remake_(e) }, n.base, n, t.data.sizeX, t.data.sizeZ);
		if (!t || !(n instanceof J) || !(n.base instanceof ye)) return null;
		return new ge({ remake: (e) => this.remake_(e) }, n.base, n, t.data.sizeX, t.data.sizeZ);
	}
	/** @internal Makes again what the world square `b` reaches: its pages and its collision, and what stands on the ground. */
	remake_(e) {
		const t = this.app_;
		for (const [n, r] of this.built_) {
			const i = r.source;
			if (!(i instanceof J)) continue;
			const a = i.origin, o = 32 * Math.max(r.data.cellSize, .001);
			r.table.markStale((t) => {
				const [n, r, i] = t.split(":").map(Number);
				const s = o * 2 ** n, c = r * s + a.x, l = i * s + a.z;
				return c <= e[2] && c + s >= e[0] && l <= e[3] && l + s >= e[1];
			});
			r.edits++;
			if (t?.hasResource(N)) t.getResource(N).invalidate(Nt(n), e[0], e[1], e[2], e[3]);
		}
		this.revision_++;
	}
	/**
	* Gives the ground's paint to `paint` (or back to the terrains, with null): at each sample, in world space, it is handed the paint
	* the terrain made and returns the paint to draw. The pages already made are made again.
	*/
	setPaint(e) {
		if (e === this.paint_) return;
		this.paint_ = e;
		this.repaint();
	}
	/**
	* Hands the making of pages to `pager` (or back to the terrain, with null). A world that paints the ground has the plan the paint is
	* read from on its workers already, and a page painted there costs the frame nothing; painted here it is tens of milliseconds a page.
	* The pager answers null for a page it cannot make (its plan is no longer the ground's), and the terrain makes that one itself.
	*/
	setPager(e) {
		this.pager_ = e;
	}
	/** Makes every page again, for a paint that changed what it answers. */
	repaint() {
		for (const e of this.built_.values()) {
			e.edits++;
			e.pageWork = void 0;
			e.table.markStale(() => true);
		}
	}
	/** Whether any terrain is still reading its images or wearing its ground: its heights are not known yet. */
	get loading() {
		for (const e of this.built_.values()) if (e.loading) return true;
		return false;
	}
	/** How many pages every terrain still wants made for what is in view. */
	get pending() {
		let e = 0;
		for (const t of this.built_.values()) e += t.wanted.size + (t.loading ? 1 : 0);
		return e;
	}
};
/** The resource the plugin installs. @experimental */
const $ = /* @__PURE__ */ o(/* @__PURE__ */ new It(), "Terrains");
/** What, changed, rebuilds the ground: everything but the colours, the colour map, the detail and the collision, which are read each frame. */
function Lt(e, t) {
	const { layerColor0: n, layerColor1: r, layerColor2: i, layerColor3: a, detail: o, drawDistance: s, collision: c, collisionDistance: l, collisionLayer: u, friction: d, colorMap: f, colorMapStrength: p, occlusionMap: m, occlusionStrength: h, layers: g, ..._ } = e;
	const v = {
		..._,
		layered: (g?.length ?? 0) > 0
	};
	const y = e.extent === Q.Infinite || !e.heightmap && !e.tiles;
	const b = y ? `@${t.x},${t.z}` : "";
	const x = y && e.provider !== "estella:noise" ? `#${qe()}` : "";
	return `${JSON.stringify(v)}${b}${x}`;
}
async function Rt(e, t) {
	const n = e.getResource(c);
	const r = vt(JSON.parse(await n.fetchText(t.tiles)), t.tiles);
	const i = (t) => ft(e, t);
	const [a, o, s] = await Promise.all([
		i(r.overview),
		r.overviewSplat ? i(r.overviewSplat) : null,
		r.overviewSplat2 ? i(r.overviewSplat2) : null
	]);
	if (!a) throw new Ye(`the overview of ${t.tiles} (${r.overview}) could not be read`);
	const l = I(a.width, a.height, a.pixels, r.format, a.wide);
	const u = (e) => e && {
		width: e.width,
		height: e.height,
		pixels: e.pixels
	};
	return new bt(r, t, l, u(o), u(s), i);
}
/** The provider a terrain names, or why it cannot have it. */
function zt(e) {
	const t = e.provider === "estella:noise" ? Qe(() => e) : Je(e.provider);
	if (!t) throw new Ye(`no terrain provider ${e.provider} is registered`);
	return t;
}
/** The ground's paint by height (over the provider's range) and slope, for a provider that does not paint. */
function Bt(e, t) {
	const [n, r] = e.range(t.seed, t.generatorVersion);
	return (e, i) => H((e - n) / Math.max(r - n, 1e-6), i, t);
}
/** An area's window on its provider's ground: `resolution` samples along its longer side, over the provider's range. */
async function Vt(e, t, n, r, i) {
	const a = Math.min(2049, Math.max(17, Math.floor(t.resolution)));
	const o = Math.max(t.sizeX, t.sizeZ) / (a - 1);
	const s = Math.max(2, Math.round(t.sizeX / o) + 1), c = Math.max(2, Math.round(t.sizeZ / o) + 1);
	const l = Math.max(s, c);
	const u = await e.sample({
		world: t.world,
		seed: t.seed,
		version: t.generatorVersion,
		x0: n - t.sizeX / 2,
		z0: r - t.sizeZ / 2,
		spacing: o,
		count: l
	});
	const d = Math.max(i[1] - i[0], 1e-6);
	const f = new Float32Array(s * c);
	for (let e = 0; e < c; e++) for (let t = 0; t < s; t++) f[e * s + t] = (u.heights[e * l + t] - i[0]) / d;
	return {
		width: s,
		height: c,
		data: f
	};
}
var Ht = class {
	constructor() {
		this.name = "terrain";
		this.activeWhen = [kt];
		this.stock_ = 0;
		this.stockLayers_ = 0;
		this.layerEdits_ = 0;
		this.watching_ = null;
	}
	build(e) {
		const t = new It();
		t.app_ = e;
		e.insertResource($, t);
		e.addSystemToSchedule(3, n([], () => {
			const n = e.hasResource(c);
			this.sweep(e, t);
			for (const r of e.world.getEntitiesWithComponents([kt, a])) {
				const i = e.world.get(r, kt);
				const o = Lt(i, e.world.get(r, a).worldPosition);
				let s = t.built_.get(r);
				if (!s || s.signature !== o) {
					if (s) this.destroy(e, s);
					s = {
						signature: o,
						data: { ...i },
						source: null,
						surface: null,
						epoch: (s?.epoch ?? 0) + 1,
						loading: true,
						cancel: null,
						table: new Ue(At),
						heights: 0,
						paint: 0,
						mesh: 0,
						instance: 0,
						nodes: /* @__PURE__ */ new Map(),
						spare: [],
						wanted: /* @__PURE__ */ new Map(),
						fit: 1,
						asked: /* @__PURE__ */ new Set(),
						pending: false,
						failure: null,
						edits: 0,
						paint2: 0,
						arrays: [],
						packed: "",
						packing: false,
						washed: false,
						shaded: false
					};
					t.built_.set(r, s);
					this.load(e, r, s);
					continue;
				}
				s.data = { ...i };
				if (s.source instanceof J) {
					const n = e.world.get(r, a).worldPosition, i = s.source.origin;
					if (n.x !== i.x || n.y !== i.y || n.z !== i.z) {
						s.source.origin = {
							x: n.x,
							y: n.y,
							z: n.z
						};
						for (const e of t.modifiers_.values()) t.remake_(e.bounds);
					}
				}
				this.collide(e, r, s);
				if (s.loading || !s.source || !n) continue;
				if (!s.instance) {
					if (!s.pending) this.prepare(e, s);
					continue;
				}
				this.pack(e, s);
				this.draw(e, r, s);
			}
		}, { name: "TerrainSystem" }));
	}
	cleanup(e) {
		if (!e?.hasResource($)) return;
		const t = e.getResource($);
		for (const [n, r] of t.built_) {
			if (e.hasResource(N)) e.getResource(N).remove(Nt(n));
			this.destroy(e, r);
		}
		t.built_.clear();
		if (this.stock_) x.release(this.stock_);
		this.stock_ = 0;
		if (this.stockLayers_) x.release(this.stockLayers_);
		this.stockLayers_ = 0;
		this.watching_?.();
		this.watching_ = null;
	}
	/** Reads the images the terrain names (or makes its noise, and wears it), and makes its source. */
	async load(e, t, n) {
		const r = n.epoch;
		const i = n.data;
		try {
			const o = e.world.get(t, a);
			if (i.extent === Q.Infinite) {
				const e = zt(i);
				n.source = new Ze(e, i.world, i.seed, i.generatorVersion, o.worldPosition.x, o.worldPosition.z, Math.max(i.cellSize, .001), Bt(e, i));
			} else if (i.tiles) {
				n.source = await Rt(e, i);
				if (n.epoch !== r || !e.world.valid(t)) return;
			} else {
				const a = await this.pixelsOf(e, i.heightmap);
				if (i.heightmap && !a) throw new Ye(`the heightmap (texture ${i.heightmap}) could not be read: it is read as data, so it must ship as the PNG it is (not compressed)`);
				const s = await this.pixelsOf(e, i.splatmap);
				const c = await this.pixelsOf(e, i.splatmap2);
				if (n.epoch !== r || !e.world.valid(t)) return;
				let l = [0, i.height];
				let u;
				if (a) u = I(a.width, a.height, a.pixels, i.heightmapFormat, a.wide);
				else {
					const a = zt({
						...i,
						erosion: 0
					});
					const s = new Ze(a, i.world, i.seed, i.generatorVersion, 0, 0, 1, Bt(a, i));
					l = [s.minHeight, s.maxHeight];
					u = await Vt(a, i, o.worldPosition.x, o.worldPosition.z, l);
					if (n.epoch !== r || !e.world.valid(t)) return;
				}
				let d = u, f = null;
				if (i.erosion > 0) {
					const a = j(e).run("Eroding the terrain", V(u, {
						amount: i.erosion,
						seed: i.seed,
						sizeX: i.sizeX,
						sizeZ: i.sizeZ,
						height: l[1] - l[0]
					}));
					n.cancel = a.cancel;
					const o = await a.done;
					n.cancel = null;
					if (n.epoch !== r || !e.world.valid(t)) return;
					d = o.field;
					f = o.flow;
				}
				n.source = new ye(d, i, s, f, l, c);
			}
			const s = e.getResource($);
			n.source = new J(n.source, () => s.modifiers_.values(), o.worldPosition, Math.max(i.cellSize, .001));
			n.surface = new tt(n.source, Math.max(i.cellSize, .001));
			e.getResource($).revision_++;
		} catch (e) {
			if (n.epoch === r) n.failure = e instanceof Error ? e.message : String(e);
			s.error("terrain", "building the terrain failed", e);
		} finally {
			if (n.epoch === r) n.loading = false;
		}
	}
	async pixelsOf(e, t) {
		if (!t || !e.hasResource(c)) return null;
		const n = e.getResource(c).pathForHandle("texture", t);
		if (!n) {
			s.warn("terrain", `no source image is known for texture ${t}`);
			return null;
		}
		return this.pixelsAt(e, n);
	}
	/** An image file's pixels exactly as stored (no premultiply, no colour conversion), by its project path or reference. */
	pixelsAt(e, t) {
		return ft(e, t);
	}
	/** The stock material: the Terrain shader, compiled once. */
	async stock(e) {
		if (this.stock_) return this.stock_;
		const t = (await e.getResource(c).load("material-shader", "builtin:terrain")).compile([]);
		if (this.stock_) return this.stock_;
		this.stock_ = x.createFromAsset({
			version: "1.0",
			type: "material",
			shader: "builtin:terrain",
			blendMode: 9,
			depthTest: true,
			depthWrite: true,
			cull: 0,
			properties: {}
		}, t);
		return this.stock_;
	}
	/** The stock material for ground with layers: the Terrain Layers shader, compiled once. */
	async stockLayers(e) {
		if (this.stockLayers_) return this.stockLayers_;
		const t = (await e.getResource(c).load("material-shader", "builtin:terrain-layers")).compile([]);
		if (this.stockLayers_) return this.stockLayers_;
		this.stockLayers_ = x.createFromAsset({
			version: "1.0",
			type: "material",
			shader: "builtin:terrain-layers",
			blendMode: 9,
			depthTest: true,
			depthWrite: true,
			cull: 0,
			properties: {}
		}, t);
		return this.stockLayers_;
	}
	/**
	* Packs the terrain's layers into the arrays its material reads, when what they name changed (or a layer file was saved): the
	* ground keeps the arrays it has until the new ones are made.
	*/
	pack(e, t) {
		const n = t.data.layers ?? [];
		if (n.length === 0 || t.packing) return;
		const r = e.getResource(c);
		const i = `${JSON.stringify(n)}#${this.layerEdits_}`;
		if (i === t.packed) return;
		t.packing = true;
		const a = t.epoch;
		if (!this.watching_) this.watching_ = r.onInvalidate(() => {
			this.layerEdits_++;
		});
		(async () => {
			try {
				const r = await pt(e, n, Mt);
				if (t.epoch !== a || !t.instance) return;
				const i = mt(e, r, [
					"albedo",
					"normal",
					"mask"
				], () => pt(e, n, Mt));
				if (!i) {
					s.warn("terrain", "the engine refused the terrain layers' texture arrays");
					return;
				}
				gt(t.arrays);
				t.arrays = i;
				const o = (e, n) => {
					x.setUniform(t.instance, e, n);
				};
				o("u_albedoLayers", x.tex(i[0]));
				o("u_normalLayers", x.tex(i[1]));
				o("u_maskLayers", x.tex(i[2]));
				o("u_layerCount", r.tiles.length);
				const c = (e) => r.tiles[e] ?? 4;
				o("u_tiles0", {
					x: c(0),
					y: c(1),
					z: c(2),
					w: c(3)
				});
				o("u_tiles1", {
					x: c(4),
					y: c(5),
					z: c(6),
					w: c(7)
				});
				const l = (e) => r.heightBlends[e] ?? -1;
				o("u_heightBlends0", {
					x: l(0),
					y: l(1),
					z: l(2),
					w: l(3)
				});
				o("u_heightBlends1", {
					x: l(4),
					y: l(5),
					z: l(6),
					w: l(7)
				});
			} catch (e) {
				s.error("terrain", "packing the terrain layers failed", e);
			} finally {
				t.packed = i;
				t.packing = false;
			}
		})();
	}
	/** Makes what the ground is drawn with: the patch, the atlases and an instance of its material. */
	async prepare(e, t) {
		t.pending = true;
		const n = t.epoch;
		try {
			const r = (t.data.layers?.length ?? 0) > 0;
			const i = t.data.material || (r ? await this.stockLayers(e) : await this.stock(e));
			if (t.epoch !== n) return;
			t.mesh = e.getResource(c).createMesh($e(32));
			[t.heights = 0, t.paint = 0, t.paint2 = 0] = _t(e, r ? 3 : 2, At, () => t.table.clear());
			t.instance = x.createInstance(i);
			if (!t.mesh || !t.heights || !t.paint || !t.instance) {
				s.warn("terrain", "the engine refused the terrain's mesh, atlases or material");
				return;
			}
			const a = (e, n) => {
				x.setUniform(t.instance, e, n);
			};
			a("u_heightPages", x.tex(t.heights));
			a("u_paintPages", x.tex(t.paint));
			if (t.paint2) {
				a("u_paintPages2", x.tex(t.paint2));
				const n = (t, n) => v(e.wasmModule, {
					width: 1,
					height: 1,
					layers: [new Uint8Array(t)]
				}, g.Retained, {
					filterMode: "linear",
					wrapMode: "repeat",
					srgb: n
				});
				t.arrays = [
					n([
						150,
						150,
						140,
						255
					], true),
					n([
						128,
						128,
						255,
						255
					], false),
					n([
						255,
						230,
						128,
						255
					], false)
				];
				a("u_albedoLayers", x.tex(t.arrays[0]));
				a("u_normalLayers", x.tex(t.arrays[1]));
				a("u_maskLayers", x.tex(t.arrays[2]));
				a("u_layerCount", 1);
			}
			a("u_terrainPages", 1);
			a("u_atlasTexels", At);
			a("u_pageTexels", 64);
			a("u_patchCells", 32);
		} catch (e) {
			s.error("terrain", "preparing the terrain failed", e);
		} finally {
			t.pending = false;
		}
	}
	/**
	* The terrain's collision as a layer of procedural chunks: a tile within `collisionDistance` of every moving 3D body and character,
	* made when one comes near, let go when none is, and made again (the old tile kept till then) when the ground changes.
	*/
	collide(e, t, n) {
		const r = Nt(t);
		const i = n.data;
		if (!i.collision || n.failure) {
			if (e.hasResource(N)) e.getResource(N).remove(r);
			return;
		}
		const o = M(e);
		const s = e.world.get(t, a).worldPosition;
		const c = Math.max(i.cellSize, .001), l = 32 * c;
		const u = n.source?.bounds ?? (i.extent === Q.Area ? [
			-i.sizeX / 2,
			-i.sizeZ / 2,
			i.sizeX / 2,
			i.sizeZ / 2
		] : null);
		const d = S(e);
		o.set(r, {
			label: "Building the ground's collision",
			originX: s.x,
			originZ: s.z,
			sizeX: l,
			sizeZ: l,
			extent: u && [
				Math.floor(u[0] / l),
				Math.floor(u[1] / l),
				Math.ceil(u[2] / l),
				Math.ceil(u[3] / l)
			],
			loadRadius: Math.max(i.collisionDistance, 0),
			unloadRadius: Math.max(i.collisionDistance, 0) + l,
			generation: `${n.epoch}:${s.x}:${s.y}:${s.z}:${i.collisionLayer}:${i.friction}`,
			sources: () => P(e),
			make: (e, r) => {
				const i = n.surface?.tile(e, r);
				return i ? {
					key: Pt(t, e, r),
					tile: i
				} : null;
			},
			publish: (e, n, { key: r, tile: a }) => {
				d.set(r, {
					owner: t,
					origin: [
						s.x + a.x0,
						s.y,
						s.z + a.z0
					],
					positions: a.positions,
					indices: a.indices,
					friction: i.friction,
					restitution: 0,
					layer: i.collisionLayer
				});
			},
			release: (e, t, { key: n }) => d.delete(n)
		});
	}
	eye(e, t) {
		if (e.hasResource(k)) {
			const n = A(e.getResource(k));
			if (n) return [
				n.x - t.worldPosition.x,
				n.y - t.worldPosition.y,
				n.z - t.worldPosition.z
			];
		}
		for (const n of e.world.getEntitiesWithComponents([r, a])) {
			if (!e.world.get(n, r).isActive) continue;
			const i = e.world.get(n, a);
			return [
				i.worldPosition.x - t.worldPosition.x,
				i.worldPosition.y - t.worldPosition.y,
				i.worldPosition.z - t.worldPosition.z
			];
		}
		return null;
	}
	/** The quadtree's cut for this terrain: leaf nodes a patch of the finest cells, ranges doubling, enough levels to cover it. */
	treeOf(e, t, n = 1) {
		const r = e.data;
		const i = 32 * Math.max(r.cellSize, .001);
		const a = i * 2.5 * Math.max(r.detail, .25) * n;
		const o = t.bounds ? Math.max(t.bounds[2] - t.bounds[0], t.bounds[3] - t.bounds[1]) : Math.max(r.drawDistance, i);
		let s = 1;
		while (s < 16 && (t.bounds ? i * 2 ** (s - 1) < o : De({ range0: a }, s - 1) < o)) s++;
		return {
			leafSize: i,
			levels: s,
			range0: a,
			bounds: t.bounds,
			minHeight: t.minHeight,
			maxHeight: t.maxHeight
		};
	}
	/** Chooses the nodes for the eye, makes the pages they want within the budget, and places the nodes. */
	draw(e, t, n) {
		const r = n.source;
		const i = e.world.get(t, a);
		const o = this.eye(e, i) ?? [
			0,
			r.maxHeight,
			0
		];
		const c = n.table;
		const l = Pe((e) => this.treeOf(n, r, e), o[0], o[1], o[2], Math.floor(c.capacity * jt), n.fit);
		if (l.share < 1 && !n.fitSaid) {
			n.fitSaid = true;
			s.warn("terrain", `detail ${n.data.detail} asks for more pages than the ${c.capacity} there are; the ground is drawn at ${(n.data.detail * l.share).toFixed(2)}`);
		}
		n.fit = l.share;
		const u = this.treeOf(n, r, l.share);
		const d = l.nodes;
		c.tick();
		n.wanted.clear();
		const f = /* @__PURE__ */ new Map();
		const p = /* @__PURE__ */ new Set();
		for (const e of d) {
			let t = e;
			const r = Y(e.level, e.ix, e.iz);
			if (!c.get(r) || c.isStale(r)) n.wanted.set(r, e);
			while (t && !c.get(Y(t.level, t.ix, t.iz))) {
				t = t.level + 1 < u.levels ? je(t, u.leafSize) : null;
				if (t && !c.get(Y(t.level, t.ix, t.iz))) n.wanted.set(Y(t.level, t.ix, t.iz), t);
			}
			if (!t) continue;
			const i = Y(t.level, t.ix, t.iz);
			if (t !== e && c.isStale(i)) n.wanted.set(i, t);
			if (t !== e) p.add(i);
			f.set(i, t);
		}
		for (const [e, t] of f) for (let n = t; n.level + 1 < u.levels;) {
			n = je(n, u.leafSize);
			if (p.has(Y(n.level, n.ix, n.iz))) {
				f.delete(e);
				break;
			}
		}
		for (const e of f.keys()) c.touch(e);
		this.makePages(e, n, r, o, i.worldPosition);
		const m = (e, t) => {
			x.setUniform(n.instance, e, t);
		};
		m("u_heightRange", {
			x: r.minHeight,
			y: Math.max(r.maxHeight - r.minHeight, 1e-6)
		});
		m("u_lodRange0", u.range0);
		m("u_terrainOrigin", {
			x: i.worldPosition.x,
			y: i.worldPosition.y,
			z: i.worldPosition.z,
			w: 0
		});
		m("u_terrainEye", {
			x: o[0] + i.worldPosition.x,
			y: o[1] + i.worldPosition.y,
			z: o[2] + i.worldPosition.z,
			w: 1
		});
		const h = r.bounds;
		m("u_terrainBounds", h ? {
			x: h[0],
			y: h[1],
			z: h[2],
			w: h[3]
		} : {
			x: -1e9,
			y: -1e9,
			z: 1e9,
			w: 1e9
		});
		const g = h && n.data.colorMap ? n.data.colorMapStrength : 0;
		const _ = h && n.data.occlusionMap ? n.data.occlusionStrength : 0;
		if ((g > 0 || _ > 0) && h) m("u_colorMapArea", {
			x: h[0],
			y: h[1],
			z: h[2] - h[0],
			w: h[3] - h[1]
		});
		if (g > 0) m("u_colorMap", x.tex(n.data.colorMap));
		if (_ > 0) m("u_occlusionMap", x.tex(n.data.occlusionMap));
		if (_ > 0 || n.shaded) m("u_occlusionStrength", _);
		n.shaded = _ > 0;
		if (g > 0 || n.washed) m("u_colorMapStrength", g);
		n.washed = g > 0;
		if (!n.data.material && (n.data.layers?.length ?? 0) === 0) {
			const e = n.data;
			for (const [t, n] of [
				e.layerColor0,
				e.layerColor1,
				e.layerColor2,
				e.layerColor3
			].entries()) m(`u_tint${t}`, {
				x: n.r,
				y: n.g,
				z: n.b,
				w: n.a
			});
		}
		this.place(e, t, n, f);
	}
	/** Makes the wanted pages, coarse and near first: asked of the workers where a pager can make them, else made here for as long as the frame can spare. */
	makePages(e, t, n, r, i) {
		const a = e.getResource($);
		const o = a.paint_;
		const c = o ? (e, t, n, r, a) => o(e + i.x, t + i.z, n + i.y, r, a) : void 0;
		const l = j(e);
		if (t.wanted.size === 0) {
			t.pageWork = void 0;
			l.mark(t, "Building the terrain", 1);
			l.urge(t, false);
			return;
		}
		const u = () => t.table.size / (t.table.size + t.wanted.size);
		l.urge(t, [...t.wanted.values()].some((e) => e.level === 0 && r[0] >= e.x0 && r[0] < e.x0 + e.size && r[2] >= e.z0 && r[2] < e.z0 + e.size));
		const d = t.pagerFailed ? null : a.pager_;
		if (d) {
			const n = [...t.wanted.values()].sort((e, t) => t.level - e.level || Math.hypot(e.x0 + e.size / 2 - r[0], e.z0 + e.size / 2 - r[2]) - Math.hypot(t.x0 + t.size / 2 - r[0], t.z0 + t.size / 2 - r[2]));
			const i = t.epoch, a = t.edits;
			let o = false;
			for (const r of n) {
				const n = Y(r.level, r.ix, r.iz);
				if (t.asked.has(n)) continue;
				if (t.asked.size >= Ft) break;
				const c = d(r.x0, r.z0, r.size);
				if (!c) {
					o = true;
					break;
				}
				t.asked.add(n);
				c.then((r) => {
					t.asked.delete(n);
					if (t.epoch !== i || t.edits !== a || !t.heights) return;
					const o = t.table.claim(n, r.min, r.max);
					if (!o) return;
					const [s, c] = t.table.origin(o.slot);
					_(e.wasmModule, t.heights, s, c, 67, 67, r.heights);
					_(e.wasmModule, t.paint, s, c, 67, 67, r.paint);
					if (t.paint2) _(e.wasmModule, t.paint2, s, c, 67, 67, r.paint2);
				}, (e) => {
					t.asked.delete(n);
					if (!t.pagerFailed) s.warn("terrain", "the workers failed a page; the terrain makes its pages on the main thread from here", e);
					t.pagerFailed = true;
				});
			}
			if (!o) {
				t.pageWork = void 0;
				l.mark(t, "Building the terrain", u());
				return;
			}
		}
		if (t.pageWork && (t.pageWork.epoch !== t.epoch || t.pageWork.edits !== t.edits || !t.wanted.has(t.pageWork.key))) t.pageWork = void 0;
		const f = [...t.wanted.values()].sort((e, t) => t.level - e.level || Math.hypot(e.x0 + e.size / 2 - r[0], e.z0 + e.size / 2 - r[2]) - Math.hypot(t.x0 + t.size / 2 - r[0], t.z0 + t.size / 2 - r[2]));
		let p = 0;
		const m = (n, r) => {
			const i = t.table.claim(n, r.min, r.max);
			if (!i) return false;
			const [a, o] = t.table.origin(i.slot);
			_(e.wasmModule, t.heights, a, o, 67, 67, r.heights);
			_(e.wasmModule, t.paint, a, o, 67, 67, r.paint);
			if (t.paint2) _(e.wasmModule, t.paint2, a, o, 67, 67, r.paint2);
			return true;
		};
		const h = t.epoch, g = t.edits;
		const v = n instanceof J ? n.base : n;
		if (!n.region || v instanceof Ze && v.provider.id === "estella:noise") {
			do {
				if (!t.pageWork) {
					const e = f.find((e) => t.wanted.has(Y(e.level, e.ix, e.iz)));
					if (!e) break;
					t.pageWork = {
						key: Y(e.level, e.ix, e.iz),
						epoch: h,
						edits: g,
						job: ze(n, e.x0, e.z0, e.size, c)
					};
				}
				const e = t.pageWork;
				if (!e.image) {
					const t = e.job.next();
					if (t.done) e.image = t.value;
				}
				if (e.image) {
					if (!m(e.key, e.image)) break;
					t.wanted.delete(e.key);
					t.pageWork = void 0;
					p++;
				}
			} while (l.hasTime(t));
			l.mark(t, "Building the terrain", u());
			return;
		}
		for (const e of f) {
			const r = Y(e.level, e.ix, e.iz);
			if (t.asked.has(r)) continue;
			if (n.region && t.asked.size >= Ft) break;
			const i = Re(n, e.x0, e.z0, e.size, c);
			if (i instanceof Promise) {
				t.asked.add(r);
				i.then((e) => {
					t.asked.delete(r);
					if (t.epoch === h && t.edits === g && t.heights) m(r, e);
				}, (e) => {
					t.asked.delete(r);
					s.warn("terrain", `the provider failed a page (${r})`, e);
				});
				continue;
			}
			if (!m(r, i)) break;
			t.wanted.delete(r);
			p++;
			if (!l.hasTime(t)) break;
		}
		l.mark(t, "Building the terrain", u());
	}
	/** Puts a node entity on each node drawn (reusing the ones it had), and takes the rest away. */
	place(e, n, r, i) {
		const o = e.world;
		for (const [e, n] of r.nodes) {
			if (i.has(e)) continue;
			r.nodes.delete(e);
			if (!o.valid(n)) continue;
			const a = o.get(n, t);
			if (a.enabled) o.insert(n, t, {
				...a,
				enabled: false
			});
			r.spare.push(n);
		}
		for (const [e, s] of i) {
			const i = r.table.get(e);
			r.table.touch(e);
			let c = r.nodes.get(e);
			if (c === void 0 || !o.valid(c)) {
				c = r.spare.pop();
				if (c === void 0 || !o.valid(c)) {
					c = o.spawn("TerrainNode");
					o.insert(c, a, {});
					o.setParent(c, n);
				}
				r.nodes.set(e, c);
			}
			const [l, u] = r.table.origin(i.slot);
			const d = {
				r: (l + .5) / At,
				g: (u + .5) / At,
				b: (s.level + 1) / 64,
				a: 1
			};
			const f = {
				x: s.x0,
				y: i.min,
				z: s.z0
			};
			const p = {
				x: s.size,
				y: Math.max(i.max - i.min, .001),
				z: s.size
			};
			const m = o.get(c, a);
			if (m.position.x !== f.x || m.position.y !== f.y || m.position.z !== f.z || m.scale.x !== p.x || m.scale.y !== p.y) o.insert(c, a, {
				...m,
				position: f,
				scale: p
			});
			const h = o.tryGet(c, t);
			if (!h || !h.enabled || h.color.r !== d.r || h.color.g !== d.g || h.color.b !== d.b || h.material !== r.instance) o.insert(c, t, {
				...h ?? {},
				mesh: r.mesh,
				material: r.instance,
				lit: true,
				opaque: true,
				cullBackfaces: true,
				color: d,
				enabled: true
			});
		}
	}
	destroy(e, t) {
		t.epoch++;
		t.cancel?.();
		t.cancel = null;
		j(e).clear(t);
		for (const n of [...t.nodes.values(), ...t.spare]) if (e.world.valid(n)) e.world.despawn(n);
		t.nodes.clear();
		t.spare.length = 0;
		t.wanted.clear();
		t.pageWork = void 0;
		const n = p();
		for (const e of [
			t.heights,
			t.paint,
			t.paint2
		]) {
			if (!e) continue;
			h(e);
			n?.releaseTexture(e);
		}
		t.heights = t.paint = t.paint2 = 0;
		gt(t.arrays);
		t.arrays = [];
		t.packed = "";
		if (t.instance) x.release(t.instance);
		t.instance = 0;
		if (t.mesh && e.hasResource(c)) e.getResource(c).releaseBuiltMesh(t.mesh);
		t.mesh = 0;
		t.source = null;
	}
	/** Releases the nodes of a terrain whose entity is gone. */
	sweep(e, t) {
		for (const [n, r] of t.built_) {
			if (e.world.valid(n) && e.world.has(n, kt)) continue;
			M(e).remove(Nt(n));
			this.destroy(e, r);
			t.built_.delete(n);
			t.revision_++;
		}
	}
};
const Ut = /* @__PURE__ */ new Ht();
//#endregion
export { ne as $, Ae as A, ge as B, Ke as C, Fe as D, Ie as E, ye as F, fe as G, ue as H, J as I, oe as J, U as K, be as L, Y as M, je as N, Ue as O, Oe as P, I as Q, Ee as R, Qe as S, Le as T, W as U, le as V, he as W, B as X, F as Y, V as Z, dt as _, It as a, Ze as b, wt as c, vt as d, z as et, _t as f, lt as g, gt as h, Ht as i, De as j, Re as k, yt as l, ht as m, kt as n, $ as o, ft as p, H as q, Q as r, Ut as s, Dt as t, re as tt, bt as u, ct as v, Je as w, Ye as x, $e as y, we as z };

//# sourceMappingURL=terrainPlugin.js.map