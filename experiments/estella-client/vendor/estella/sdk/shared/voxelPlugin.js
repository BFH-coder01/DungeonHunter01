import { $t as e, Ct as t, Nt as n, c as r, n as i, qt as a } from "./system.js";
import { s as o } from "./resource.js";
import { s } from "./logger.js";
import { n as c } from "./AssetPlugin.js";
import { n as l } from "./disposeAll.js";
import { n as u, r as d } from "./material.js";
import { r as f } from "./collisionGeometry.js";
import { n as p, r as m, s as h } from "./meshFormat.js";
import { o as g, p as _ } from "./components.js";
import { a as v, i as y, r as b, t as x } from "./movers.js";
//#region src/voxel/field.ts
/**
* @file    field.ts
* @brief   The ground as a volume: a signed distance at every point of a grid, cut into chunks, that can be carved and filled.
*
* @details Below zero is solid. A height field has one answer per column, so it cannot hold a cave or an overhang; this has one per point.
*          A chunk keeps its own copy of a margin one sample wide round it, so that it can be meshed alone and two chunks still agree where
*          they meet. Only what was edited has to be kept: the rest is the source's answer, made again when it is next needed, which is what
*          lets a world without end cost what the player changed in it. Distances are stored in a byte, clamped to a few cells: a
*          surface needs to know its distance only close by.
*/
/** How many layers of material a volume has. */
const S = 4;
/** How many cells a stored distance reaches. */
const C = 4;
const w = (e, t, n) => `${e},${t},${n}`;
const T = (e) => e > 127 ? 127 : e < -127 ? -127 : Math.round(e);
const E = (e, t, n) => {
	if (n <= 0) return Math.max(e, t);
	const r = Math.max(n - Math.abs(e - t), 0) / n;
	return Math.max(e, t) + r * r * n * .25;
};
const D = (e, t, n) => -E(-e, -t, n);
function ee(e, t, n, r) {
	if (e.kind === "sphere") return Math.hypot(t - e.center.x, n - e.center.y, r - e.center.z) - e.radius;
	if (e.kind === "box") {
		const i = Math.abs(t - e.center.x) - e.halfExtents.x, a = Math.abs(n - e.center.y) - e.halfExtents.y, o = Math.abs(r - e.center.z) - e.halfExtents.z;
		return Math.hypot(Math.max(i, 0), Math.max(a, 0), Math.max(o, 0)) + Math.min(Math.max(i, a, o), 0);
	}
	const i = e.to.x - e.from.x, a = e.to.y - e.from.y, o = e.to.z - e.from.z;
	const s = t - e.from.x, c = n - e.from.y, l = r - e.from.z;
	const u = i * i + a * a + o * o;
	const d = u > 0 ? Math.min(1, Math.max(0, (s * i + c * a + l * o) / u)) : 0;
	return Math.hypot(s - i * d, c - a * d, l - o * d) - e.radius;
}
function O(e) {
	if (e.kind === "sphere") {
		const { center: t, radius: n } = e;
		return [
			t.x - n,
			t.y - n,
			t.z - n,
			t.x + n,
			t.y + n,
			t.z + n
		];
	}
	if (e.kind === "box") {
		const { center: t, halfExtents: n } = e;
		return [
			t.x - n.x,
			t.y - n.y,
			t.z - n.z,
			t.x + n.x,
			t.y + n.y,
			t.z + n.z
		];
	}
	const { from: t, to: n, radius: r } = e;
	return [
		Math.min(t.x, n.x) - r,
		Math.min(t.y, n.y) - r,
		Math.min(t.z, n.z) - r,
		Math.max(t.x, n.x) + r,
		Math.max(t.y, n.y) + r,
		Math.max(t.z, n.z) + r
	];
}
const k = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function A(e) {
	const t = [];
	for (let n = 0; n < e.length; n += 3) {
		const r = e[n], i = e[n + 1] ?? 0, a = e[n + 2] ?? 0;
		t.push(k[r >> 2], k[(r & 3) << 4 | i >> 4], n + 1 < e.length ? k[(i & 15) << 2 | a >> 6] : "=", n + 2 < e.length ? k[a & 63] : "=");
	}
	return t.join("");
}
function j(e) {
	if (e.length % 4 !== 0) return null;
	const t = e.endsWith("==") ? 2 : e.endsWith("=") ? 1 : 0;
	const n = new Uint8Array(e.length / 4 * 3 - t);
	let r = 0;
	for (let t = 0; t < e.length; t += 4) {
		const i = [
			0,
			1,
			2,
			3
		].map((n) => e[t + n] === "=" ? 0 : k.indexOf(e[t + n]));
		if (i.some((e) => e < 0)) return null;
		if (r < n.length) n[r++] = i[0] << 2 | i[1] >> 4;
		if (r < n.length) n[r++] = (i[1] & 15) << 4 | i[2] >> 2;
		if (r < n.length) n[r++] = (i[2] & 3) << 6 | i[3];
	}
	return n;
}
/** Runs of (count 1..255, byte). Below ground and in the air a chunk is long runs, and a save is mostly these. */
function M(e, t) {
	for (let n = 0; n < e.length;) {
		let r = 1;
		while (r < 255 && n + r < e.length && e[n + r] === e[n]) r++;
		t.push(r, e[n]);
		n += r;
	}
}
function N(e, t) {
	let n = 0;
	for (let r = 0; r + 1 < e.length; r += 2) {
		const i = e[r];
		if (n + i > t.length) return false;
		t.fill(e[r + 1], n, n + i);
		n += i;
	}
	return n === t.length;
}
var P = class {
	constructor(e) {
		this.chunks_ = /* @__PURE__ */ new Map();
		this.dirty_ = /* @__PURE__ */ new Set();
		this.sample_ = {
			distance: 0,
			material: 0
		};
		this.clock_ = 0;
		this.cellSize = Math.max(e.cellSize, .001);
		this.chunkCells = Math.max(4, Math.min(64, Math.floor(e.chunkCells)));
		this.side = this.chunkCells + 2;
		const t = this.cellSize * this.chunkCells;
		this.floorY_ = e.minY + this.cellSize;
		this.ceilingY_ = e.maxY - this.cellSize;
		this.rowMin = Math.floor(e.minY / t);
		this.rowMax = Math.max(this.rowMin, Math.ceil(e.maxY / t) - 1);
		this.range_ = this.cellSize * C;
		this.source_ = e.source;
		this.cached_ = e.cached ?? 64;
	}
	/** The chunk, holding its samples. Asks the source when nothing holds them. */
	chunk(e, t, n) {
		const r = w(e, t, n);
		let i = this.chunks_.get(r);
		if (!i) {
			i = {
				cx: e,
				cy: t,
				cz: n,
				key: r,
				distances: null,
				materials: null,
				edited: false,
				surfaced: false,
				revision: 0,
				savedRevision: 0,
				touched: 0
			};
			this.chunks_.set(r, i);
		}
		if (!i.distances) this.generate_(i);
		i.touched = ++this.clock_;
		return i;
	}
	generate_(e) {
		const t = this.chunkCells, n = this.side, r = this.cellSize, i = 127 / this.range_;
		const a = new Int8Array(n * n * n), o = new Uint8Array(n * n * n);
		const s = this.sample_;
		let c = 0, l = 0;
		for (let n = -1; n <= t; n++) {
			const u = (e.cz * t + n) * r;
			for (let n = -1; n <= t; n++) {
				const d = (e.cy * t + n) * r;
				for (let n = -1; n <= t; n++, c++) {
					s.distance = 1;
					s.material = 0;
					this.source_((e.cx * t + n) * r, d, u, s);
					const f = Math.min(Math.max(s.distance, d - this.ceilingY_), d - this.floorY_);
					const p = T(f * i);
					a[c] = p;
					o[c] = s.material;
					if (p < 0) l++;
				}
			}
		}
		e.distances = a;
		e.materials = o;
		e.surfaced = l > 0 && l < c;
	}
	/** Lets go of what the source can make again, oldest first, past the number to hold. What `keep` names stays and is not counted: asking the source again is what a dig must not wait on. */
	trim(e) {
		const t = [...this.chunks_.values()].filter((t) => !t.edited && t.distances && !e?.(t));
		if (t.length <= this.cached_) return;
		t.sort((e, t) => e.touched - t.touched);
		for (let e = 0; e < t.length - this.cached_; e++) if (!this.dirty_.has(t[e])) this.chunks_.delete(t[e].key);
	}
	/** The chunks changed since this was last asked. */
	takeDirty() {
		const e = [...this.dirty_];
		this.dirty_.clear();
		return e;
	}
	/** Carves, fills or paints with a shape. Everything it reaches, the margins of the chunks round it included, changes together. */
	apply(e, t, n = {}) {
		const r = this.cellSize, i = this.chunkCells, a = this.side;
		const o = Math.max(n.smooth ?? 0, 0);
		const s = t === "paint" ? r : this.range_ + o;
		const c = O(e);
		const l = [
			c[0] - s,
			c[1] - s,
			c[2] - s
		].map((e) => Math.floor(e / r));
		const u = [
			c[3] + s,
			c[4] + s,
			c[5] + s
		].map((e) => Math.ceil(e / r));
		const d = (e) => Math.ceil((e - i) / i);
		const f = (e) => Math.floor((e + 1) / i);
		const p = Math.max(0, Math.min(3, Math.floor(n.material ?? 0)));
		const m = new Array(4).fill(0);
		let h = 0, g = 0;
		const _ = 127 / this.range_, v = this.range_ / 127, y = r * r * r;
		for (let s = d(l[2]); s <= f(u[2]); s++) for (let c = Math.max(d(l[1]), this.rowMin); c <= Math.min(f(u[1]), this.rowMax); c++) for (let b = d(l[0]); b <= f(u[0]); b++) {
			const d = this.chunk(b, c, s);
			const f = d.distances, x = d.materials;
			let S = false;
			const C = Math.max(-1, l[2] - s * i), w = Math.min(i, u[2] - s * i);
			const O = Math.max(-1, l[1] - c * i), k = Math.min(i, u[1] - c * i);
			const A = Math.max(-1, l[0] - b * i), j = Math.min(i, u[0] - b * i);
			for (let l = C; l <= w; l++) {
				const u = (s * i + l) * r;
				for (let s = O; s <= k; s++) {
					const d = (c * i + s) * r;
					if (t === "subtract" ? d <= this.floorY_ : t === "add" && d >= this.ceilingY_) continue;
					for (let c = A; c <= j; c++) {
						const g = c + 1 + (s + 1) * a + (l + 1) * a * a;
						const C = x[g], w = f[g];
						if (n.keep?.(C) && w < 0) continue;
						const O = ee(e, (b * i + c) * r, d, u);
						if (t === "paint") {
							if (O < 0 && w < 0 && C !== p) {
								x[g] = p;
								S = true;
							}
							continue;
						}
						const k = w * v;
						const A = T((t === "subtract" ? E(k, -O, o) : D(k, O, o)) * _);
						if (A === w) continue;
						f[g] = A;
						S = true;
						const j = c >= 0 && c < i && s >= 0 && s < i && l >= 0 && l < i;
						if (w < 0 && A >= 0 && j) m[C] += y;
						if (w >= 0 && A < 0) {
							x[g] = p;
							if (j) h += y;
						}
					}
				}
			}
			if (S) {
				d.edited = true;
				d.revision++;
				this.refreshSurfaced_(d);
				this.dirty_.add(d);
				g++;
			}
		}
		return {
			removed: m,
			added: h,
			chunks: g
		};
	}
	refreshSurfaced_(e) {
		const t = e.distances;
		let n = 0;
		for (let e = 0; e < t.length; e++) if (t[e] < 0) n++;
		e.surfaced = n > 0 && n < t.length;
	}
	at_(e, t, n) {
		const r = this.chunkCells, i = this.side;
		const a = Math.floor(t / r);
		if (a < this.rowMin) return -this.range_;
		if (a > this.rowMax) return this.range_;
		const o = Math.floor(e / r), s = Math.floor(n / r);
		return this.chunk(o, a, s).distances[e - o * r + 1 + (t - a * r + 1) * i + (n - s * r + 1) * i * i] * (this.range_ / 127);
	}
	/** The signed distance at a place, read between the samples. */
	distanceAt(e, t, n) {
		const r = this.cellSize;
		const i = e / r, a = t / r, o = n / r;
		const s = Math.floor(i), c = Math.floor(a), l = Math.floor(o);
		const u = i - s, d = a - c, f = o - l;
		const p = (e, t, n) => e + (t - e) * n;
		const m = (e, t) => p(this.at_(s, c + e, l + t), this.at_(s + 1, c + e, l + t), u);
		return p(p(m(0, 0), m(1, 0), d), p(m(0, 1), m(1, 1), d), f);
	}
	/** The material of the deepest solid sample round a place, or -1 where all round it is air. */
	materialAt(e, t, n) {
		const r = this.cellSize, i = this.chunkCells, a = this.side;
		const o = Math.floor(e / r), s = Math.floor(t / r), c = Math.floor(n / r);
		let l = -1, u = 0;
		for (let e = 0; e < 8; e++) {
			const t = o + (e & 1), n = s + (e >> 1 & 1), r = c + (e >> 2 & 1);
			const d = Math.floor(n / i);
			if (d < this.rowMin || d > this.rowMax) continue;
			const f = Math.floor(t / i), p = Math.floor(r / i);
			const m = this.chunk(f, d, p);
			const h = t - f * i + 1 + (n - d * i + 1) * a + (r - p * i + 1) * a * a;
			if (m.distances[h] < u) {
				u = m.distances[h];
				l = m.materials[h];
			}
		}
		return l;
	}
	/** Where a ray from `origin` first meets something solid, within `maxDistance`. `direction` need not be of any length. */
	raycast(e, t, n) {
		const r = Math.hypot(t.x, t.y, t.z);
		if (!(r > 0)) return null;
		const i = t.x / r, a = t.y / r, o = t.z / r;
		const s = (t) => this.distanceAt(e.x + i * t, e.y + a * t, e.z + o * t);
		let c = 0, l = 0, u = s(0);
		if (u < 0) return this.hit_(e, i, a, o, 0);
		while (l < n) {
			c = l;
			l = Math.min(n, l + Math.max(u * .75, this.cellSize * .25));
			u = s(l);
			if (u < 0) {
				let t = c, n = l;
				for (let e = 0; e < 12; e++) {
					const e = (t + n) * .5;
					if (s(e) < 0) n = e;
					else t = e;
				}
				return this.hit_(e, i, a, o, n);
			}
		}
		return null;
	}
	hit_(e, t, n, r, i) {
		const a = e.x + t * i, o = e.y + n * i, s = e.z + r * i, c = this.cellSize * .5;
		const l = this.distanceAt(a + c, o, s) - this.distanceAt(a - c, o, s);
		const u = this.distanceAt(a, o + c, s) - this.distanceAt(a, o - c, s);
		const d = this.distanceAt(a, o, s + c) - this.distanceAt(a, o, s - c);
		const f = Math.hypot(l, u, d) || 1;
		return {
			point: {
				x: a,
				y: o,
				z: s
			},
			normal: {
				x: l / f,
				y: u / f,
				z: d / f
			},
			distance: i,
			material: Math.max(0, this.materialAt(a, o, s))
		};
	}
	/** What the save holds: every chunk edited, or only those changed since the last call that asked for `changedOnly`. */
	serialize(e = false) {
		const t = {};
		for (const n of this.chunks_.values()) {
			if (!n.edited || e && n.revision === n.savedRevision) continue;
			const r = [];
			M(new Uint8Array(n.distances.buffer), r);
			M(n.materials, r);
			t[n.key] = A(Uint8Array.from(r));
			n.savedRevision = n.revision;
		}
		return {
			version: 1,
			cellSize: this.cellSize,
			chunkCells: this.chunkCells,
			chunks: t
		};
	}
	/**
	* Puts saved chunks back over the volume. With `merge` those not named stay as they are; otherwise they go back to the source. A save cut from another grid cannot
	* be read and changes nothing: false. A chunk that cannot be read is left as it was, and named in `skipped`.
	*/
	restore(e, t = false, n) {
		if (e?.version !== 1 || e.cellSize !== this.cellSize || e.chunkCells !== this.chunkCells) return false;
		if (!t) for (const t of [...this.chunks_.values()]) {
			if (!t.edited || e.chunks[t.key] !== void 0) continue;
			t.distances = null;
			t.materials = null;
			t.edited = false;
			t.revision++;
			this.generate_(t);
			this.dirty_.add(t);
		}
		const r = this.side ** 3;
		for (const [t, i] of Object.entries(e.chunks)) {
			const e = t.split(",").map(Number);
			const a = j(i);
			if (e.length !== 3 || e.some((e) => !Number.isInteger(e)) || !a) {
				n?.push(t);
				continue;
			}
			const o = new Int8Array(r), s = new Uint8Array(r);
			let c = 0, l = 0;
			while (c + 1 < a.length && l < r) {
				l += a[c];
				c += 2;
			}
			if (l !== r || !N(a.subarray(0, c), new Uint8Array(o.buffer)) || !N(a.subarray(c), s)) {
				n?.push(t);
				continue;
			}
			const u = this.chunk(e[0], e[1], e[2]);
			u.distances = o;
			u.materials = s;
			u.edited = true;
			u.revision++;
			u.savedRevision = u.revision;
			this.refreshSurfaced_(u);
			this.dirty_.add(u);
		}
		return true;
	}
	/** How many chunks are held with their samples, and how many of those were edited. */
	get held() {
		let e = 0, t = 0;
		for (const n of this.chunks_.values()) {
			if (n.distances) e++;
			if (n.edited) t++;
		}
		return {
			chunks: e,
			edited: t
		};
	}
};
//#endregion
//#region src/voxel/source.ts
/** The material of each part of the stock ground. @experimental */
const F = {
	Topsoil: 0,
	Soil: 1,
	Rock: 2,
	Ore: 3
};
function te(e, t, n, r) {
	let i = Math.imul(e, 2376512323) ^ Math.imul(t, 3625334849) ^ Math.imul(n, 3407524639) ^ Math.imul(r, 374761393);
	i = Math.imul(i ^ i >>> 13, 1540483477);
	return ((i ^ i >>> 15) >>> 0) / 4294967295;
}
/** Smooth noise from -1 to 1 with features about a unit across. */
function I(e, t, n, r) {
	const i = Math.floor(e), a = Math.floor(t), o = Math.floor(n);
	const s = e - i, c = t - a, l = n - o;
	const u = s * s * (3 - 2 * s), d = c * c * (3 - 2 * c), f = l * l * (3 - 2 * l);
	const p = (e, t, n) => e + (t - e) * n;
	const m = (e, t, n) => te(i + e, a + t, o + n, r);
	return p(p(p(m(0, 0, 0), m(1, 0, 0), u), p(m(0, 1, 0), m(1, 1, 0), u), d), p(p(m(0, 0, 1), m(1, 0, 1), u), p(m(0, 1, 1), m(1, 1, 1), u), d), f) * 2 - 1;
}
/** Hills, with tunnels where two sheets of noise cross, soil over rock, and pockets of ore. @experimental */
function L(e) {
	const { seed: t, surfaceHeight: n, hillHeight: r, soilDepth: i, caveWidth: a } = e;
	const o = 1 / Math.max(e.hillScale, .001), s = 1 / Math.max(e.caveScale, .001);
	const c = Math.max(i * .25, (e.cellSize ?? 1) * 2.5);
	const l = e.oreAmount > 0 ? .7 - Math.min(e.oreAmount, 1) * 1.4 : 2;
	let u = NaN, d = NaN, f = 0;
	return (p, m, h, g) => {
		if (p !== u || h !== d) {
			u = p;
			d = h;
			f = n + r * (I(p * o, 0, h * o, t) * .7 + I(p * o * 2.3, 7.5, h * o * 2.3, t + 1) * .3);
		}
		const _ = m - f;
		let v = _;
		if (a > 0 && _ < a) {
			const n = I(p * s, m * s, h * s, t + 2), r = I(p * s, m * s, h * s, t + 3);
			const i = Math.hypot(n, r) * e.caveScale * .5 - a;
			v = Math.max(_, -i);
		}
		g.distance = v;
		const y = -_;
		if (y < c) g.material = F.Topsoil;
		else if (y < Math.max(i, c)) g.material = F.Soil;
		else g.material = I(p * s * 3, m * s * 3, h * s * 3, t + 4) > l ? F.Ore : F.Rock;
	};
}
/**
* A body under a height field: solid below `heightAt`, so a Terrain's own ground, or any other, can be dug into as a volume. The answer must be
* the same for the same place, and null where it knows no height is air.
*
* @experimental
*/
function ne(e, t = (e, t) => {
	t.material = e < 1 ? F.Topsoil : e < 4 ? F.Soil : F.Rock;
}) {
	return (n, r, i, a) => {
		const o = e(n, i);
		a.distance = o === null ? 1 : r - o;
		t(-a.distance, a);
	};
}
//#endregion
//#region src/voxel/surfaceNets.ts
/**
* @file    surfaceNets.ts
* @brief   The skin of one chunk of a volume: Naive Surface Nets over its samples.
*
* @details One vertex for each cell the surface passes through, at the mean of where it crosses that cell's edges, and one quad for each
*          grid edge it crosses. An edge belongs to the chunk its first sample is in, so no quad is made twice; a vertex and its normal are
*          worked out from the eight corners of its cell alone, and those corners are in both chunks' samples at a border, so the two
*          agree exactly and no crack can open between them, however the chunks were edited.
*/
let R = /* @__PURE__ */ new Int32Array(0);
let z = /* @__PURE__ */ new Float32Array(16384);
let B = /* @__PURE__ */ new Float32Array(16384);
let V = /* @__PURE__ */ new Uint8Array(16384);
let H = /* @__PURE__ */ new Uint32Array(32768);
function re() {
	const e = new Float32Array(z.length * 2);
	e.set(z);
	z = e;
	const t = new Float32Array(B.length * 2);
	t.set(B);
	B = t;
	const n = new Uint8Array(V.length * 2);
	n.set(V);
	V = n;
}
/** The skin of a chunk of `cells` a side, with samples from -1 to `cells`; null where the surface does not pass. */
function U(e, t, n, r) {
	const i = n + 2, a = i * i, o = n + 1;
	if (R.length < o * o * o) R = new Int32Array(o * o * o);
	R.fill(-1, 0, o * o * o);
	let s = 0, c = 0;
	const l = [
		0,
		0,
		0,
		0
	];
	/** The vertex of the cell whose low corner is at sample (x, y, z), each from 0 to `cells`. */
	const u = (n, c, u) => {
		const d = n + c * o + u * o * o;
		const f = R[d];
		if (f >= 0) return f;
		const p = n + c * i + u * a;
		let m = 0, h = 0, g = 0, _ = 0;
		for (let t = 0; t < 8; t++) {
			const n = p + (t & 1) + (t >> 1 & 1) * i + (t >> 2 & 1) * a;
			const r = e[n];
			for (let o = 0; o < 3; o++) {
				const s = 1 << o;
				if (t & s) continue;
				const c = e[n + (o === 0 ? 1 : o === 1 ? i : a)];
				if (r < 0 === c < 0) continue;
				const l = r / (r - c);
				m += (t & 1) + (o === 0 ? l : 0);
				h += (t >> 1 & 1) + (o === 1 ? l : 0);
				g += (t >> 2 & 1) + (o === 2 ? l : 0);
				_++;
			}
		}
		const v = s++;
		if ((v + 1) * 3 > z.length) re();
		const y = (t, n, r) => e[p + t + n * i + r * a];
		const b = y(1, 0, 0) - y(0, 0, 0) + y(1, 1, 0) - y(0, 1, 0) + y(1, 0, 1) - y(0, 0, 1) + y(1, 1, 1) - y(0, 1, 1);
		const x = y(0, 1, 0) - y(0, 0, 0) + y(1, 1, 0) - y(1, 0, 0) + y(0, 1, 1) - y(0, 0, 1) + y(1, 1, 1) - y(1, 0, 1);
		const S = y(0, 0, 1) - y(0, 0, 0) + y(1, 0, 1) - y(1, 0, 0) + y(0, 1, 1) - y(0, 1, 0) + y(1, 1, 1) - y(1, 1, 0);
		const C = Math.hypot(b, x, S) || 1;
		z[v * 3] = (n - 1 + m / _) * r;
		z[v * 3 + 1] = (c - 1 + h / _) * r;
		z[v * 3 + 2] = (u - 1 + g / _) * r;
		B[v * 3] = b / C;
		B[v * 3 + 1] = x / C;
		B[v * 3 + 2] = S / C;
		l[0] = l[1] = l[2] = l[3] = 0;
		let w = 0;
		for (let n = 0; n < 8; n++) {
			const r = p + (n & 1) + (n >> 1 & 1) * i + (n >> 2 & 1) * a;
			if (e[r] < 0) {
				l[t[r] & 3]++;
				w++;
			}
		}
		for (let e = 0; e < 4; e++) V[v * 4 + e] = Math.round(l[e] / w * 255);
		R[d] = v;
		return v;
	};
	const d = (e, t, n, r, i) => {
		if (c + 6 > H.length) {
			const e = new Uint32Array(H.length * 2);
			e.set(H);
			H = e;
		}
		if (i) {
			H[c++] = e;
			H[c++] = n;
			H[c++] = t;
			H[c++] = e;
			H[c++] = r;
			H[c++] = n;
		} else {
			H[c++] = e;
			H[c++] = t;
			H[c++] = n;
			H[c++] = e;
			H[c++] = n;
			H[c++] = r;
		}
	};
	for (let t = 1; t <= n; t++) for (let r = 1; r <= n; r++) for (let o = 1; o <= n; o++) {
		const n = o + r * i + t * a;
		const s = e[n] < 0;
		if (s !== e[n + 1] < 0) d(u(o, r - 1, t - 1), u(o, r, t - 1), u(o, r, t), u(o, r - 1, t), !s);
		if (s !== e[n + i] < 0) d(u(o - 1, r, t - 1), u(o - 1, r, t), u(o, r, t), u(o, r, t - 1), !s);
		if (s !== e[n + a] < 0) d(u(o - 1, r - 1, t), u(o, r - 1, t), u(o, r, t), u(o - 1, r, t), !s);
	}
	if (c === 0) return null;
	return {
		positions: z.slice(0, s * 3),
		normals: B.slice(0, s * 3),
		weights: V.slice(0, s * 4),
		indices: H.slice(0, c)
	};
}
/** A skin as geometry for the engine. */
function ie(e) {
	const { channels: t, vertexStride: n } = h([
		{
			semantic: p.Position,
			components: 3,
			type: m.Float32
		},
		{
			semantic: p.Normal,
			components: 3,
			type: m.Float32
		},
		{
			semantic: p.Color,
			components: 4,
			type: m.UNorm8
		},
		{
			semantic: p.TexCoord0,
			components: 2,
			type: m.Float32
		}
	]);
	const r = (e) => t.find((t) => t.semantic === e).offset;
	const i = r(p.Position), a = r(p.Normal), o = r(p.Color);
	const s = e.positions.length / 3;
	const c = new Uint8Array(s * n);
	const l = new DataView(c.buffer);
	const u = [
		Infinity,
		Infinity,
		Infinity
	], d = [
		-Infinity,
		-Infinity,
		-Infinity
	];
	for (let t = 0; t < s; t++) {
		const r = t * n;
		for (let n = 0; n < 3; n++) {
			const o = e.positions[t * 3 + n];
			l.setFloat32(r + i + n * 4, o, true);
			l.setFloat32(r + a + n * 4, e.normals[t * 3 + n], true);
			if (o < u[n]) u[n] = o;
			if (o > d[n]) d[n] = o;
		}
		for (let n = 0; n < 4; n++) c[r + o + n] = e.weights[t * 4 + n];
	}
	return {
		channels: t,
		vertexStride: n,
		vertexCount: s,
		vertices: c,
		indices: e.indices,
		aabbMin: u,
		aabbMax: d
	};
}
//#endregion
//#region src/voxel/voxelPlugin.ts
const W = (e, t, n) => ({
	r: e,
	g: t,
	b: n,
	a: 1
});
/**
* Ground that is a volume. Presence is the opt-in; the entity's position places it, and its rotation and scale do not apply.
*
* @experimental
*/
const G = /* @__PURE__ */ e("VoxelTerrain", {
	cellSize: 1,
	chunkCells: 24,
	minY: -48,
	maxY: 48,
	seed: 1,
	surfaceHeight: 8,
	hillHeight: 14,
	hillScale: 60,
	caveWidth: 2.5,
	caveScale: 36,
	soilDepth: 5,
	oreAmount: .06,
	drawDistance: 96,
	castShadows: true,
	collision: true,
	collisionDistance: 32,
	collisionLayer: 0,
	friction: .6,
	material: 0,
	color0: W(.3, .42, .2),
	color1: W(.36, .27, .18),
	color2: W(.42, .41, .4),
	color3: W(.72, .55, .25),
	map0: 0,
	map1: 0,
	map2: 0,
	map3: 0,
	tile: 8
}, {
	assetFields: [
		{
			field: "material",
			type: "material"
		},
		{
			field: "map0",
			type: "texture"
		},
		{
			field: "map1",
			type: "texture"
		},
		{
			field: "map2",
			type: "texture"
		},
		{
			field: "map3",
			type: "texture"
		}
	],
	fields: {
		cellSize: {
			min: .05,
			unit: "wu",
			category: "Shape",
			tooltip: "The side of a cell: the finest thing the ground can show. Half the size is eight times the cells."
		},
		chunkCells: {
			min: 8,
			max: 64,
			step: 1,
			category: "Shape",
			advanced: true,
			tooltip: "How many cells a chunk has a side. Smaller makes less again for each edit and draws more meshes."
		},
		minY: {
			unit: "wu",
			category: "Shape",
			tooltip: "How far down the volume goes from the entity. Nothing digs through its floor."
		},
		maxY: {
			unit: "wu",
			category: "Shape",
			tooltip: "How far up the volume goes from the entity. Nothing is built past it."
		},
		seed: {
			step: 1,
			category: "Ground",
			tooltip: "Another seed is another ground. A save holds what was changed in the ground this seed makes."
		},
		surfaceHeight: {
			unit: "wu",
			category: "Ground",
			tooltip: "Where the ground lies on average, from the entity."
		},
		hillHeight: {
			min: 0,
			unit: "wu",
			category: "Ground",
			tooltip: "How far the hills rise and fall from it."
		},
		hillScale: {
			min: 1,
			unit: "wu",
			category: "Ground",
			tooltip: "How wide the hills are."
		},
		caveWidth: {
			min: 0,
			unit: "wu",
			category: "Ground",
			tooltip: "How wide the tunnels through the ground are. 0 has none."
		},
		caveScale: {
			min: 1,
			unit: "wu",
			category: "Ground",
			tooltip: "How far apart the tunnels are."
		},
		soilDepth: {
			min: 0,
			unit: "wu",
			category: "Ground",
			tooltip: "How deep the soil goes before rock."
		},
		oreAmount: {
			min: 0,
			max: 1,
			step: .01,
			category: "Ground",
			tooltip: "How much of the rock is ore."
		},
		drawDistance: {
			min: 1,
			unit: "wu",
			category: "Detail",
			tooltip: "How far from the eye the ground is drawn."
		},
		castShadows: {
			category: "Detail",
			tooltip: "Whether the ground casts shadows."
		},
		collision: {
			category: "Collision",
			tooltip: "Whether 3D bodies and characters collide with the ground."
		},
		collisionDistance: {
			min: 1,
			unit: "wu",
			category: "Collision",
			tooltip: "How far round each moving body and character the ground is built for collision."
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
		material: {
			category: "Look",
			tooltip: "A material on the Voxel Ground shader. Empty uses the stock one, with the colours and pictures below."
		},
		color0: {
			label: "Topsoil",
			category: "Look"
		},
		color1: {
			label: "Soil",
			category: "Look"
		},
		color2: {
			label: "Rock",
			category: "Look"
		},
		color3: {
			label: "Ore",
			category: "Look"
		},
		map0: {
			label: "Topsoil Picture",
			category: "Look",
			tooltip: "Laid from the three sides by world position."
		},
		map1: {
			label: "Soil Picture",
			category: "Look",
			tooltip: "Laid from the three sides by world position."
		},
		map2: {
			label: "Rock Picture",
			category: "Look",
			tooltip: "Laid from the three sides by world position."
		},
		map3: {
			label: "Ore Picture",
			category: "Look",
			tooltip: "Laid from the three sides by world position."
		},
		tile: {
			min: .01,
			unit: "wu",
			category: "Look",
			tooltip: "How long one repeat of the pictures is in the world."
		}
	}
});
/** What, changed, makes the ground again: not how it looks, or how far it reaches. */
function ae(e, t, n, r) {
	if (n && !r.has(n)) r.set(n, r.size + 1);
	return JSON.stringify([
		e.cellSize,
		e.chunkCells,
		e.minY,
		e.maxY,
		e.seed,
		e.surfaceHeight,
		e.hillHeight,
		e.hillScale,
		e.caveWidth,
		e.caveScale,
		e.soilDepth,
		e.oreAmount,
		e.material,
		e.map0,
		t.x,
		t.y,
		t.z,
		n ? r.get(n) : 0
	]);
}
/**
* Where a volume is wanted drawn. The game's own eye while it runs; while it is laid out, both the view's eye and what it looks at, since an
* editor's eye often stands far back from the ground it is looking at, past any distance worth drawing round it.
*/
function oe(e) {
	if (e.hasResource(g)) {
		const t = e.getResource(g);
		if (t.active) {
			const e = _(t);
			return [{
				x: e.x,
				y: e.y,
				z: e.z
			}, {
				x: t.x,
				y: t.y,
				z: t.z ?? 0
			}];
		}
	}
	return v(e);
}
const K = (e) => `voxel-draw:${e}`;
const q = (e) => `voxel-collide:${e}`;
const J = (e, t) => `voxel:${e}:${t}`;
const Y = (e, t) => `${e},${t}`;
/** The most time edits may take of a frame, in milliseconds. At least one chunk is always made, so a dig is never left waiting. */
const se = 4;
/** What a game asks of its volumes. Places are in the world. @experimental */
var X = class {
	constructor() {
		this.app_ = null;
		this.built_ = /* @__PURE__ */ new Map();
		this.sources_ = /* @__PURE__ */ new Map();
		this.sourceIds_ = /* @__PURE__ */ new Map();
		this.listeners_ = /* @__PURE__ */ new Set();
		this.ensure_ = null;
	}
	/** Sets what the volume is before anyone digs in it, in place of the stock hills. The same place must always get the same answer. */
	setSource(e, t) {
		if (t) this.sources_.set(e, t);
		else this.sources_.delete(e);
	}
	/** The volume's own field: made here if the system has not yet got to it, so a game can edit in the frame it spawned it. */
	fieldOf_(e) {
		return this.ensure_?.(e) ?? this.built_.get(e) ?? null;
	}
	/** Changes the volume with a shape. Every chunk the shape reaches is made again, and the collision with it. */
	edit(e, t, n, r) {
		const i = this.fieldOf_(e);
		if (!i) return null;
		const a = le(t, i.origin);
		const o = i.field.apply(a, n, r);
		for (const e of i.field.takeDirty()) i.waiting.set(e.key, e);
		if (o.chunks > 0) for (const r of this.listeners_) r({
			entity: e,
			shape: t,
			op: n,
			result: o
		});
		return o;
	}
	/** Carves a shape out of the volume. What it answers is how much of each material came out. */
	carve(e, t, n) {
		return this.edit(e, t, "subtract", n);
	}
	/** Fills a shape with a material. */
	fill(e, t, n = 0, r) {
		return this.edit(e, t, "add", {
			...r,
			material: n
		});
	}
	/** Hears every edit that changed something: what a game keeps a navmesh or a quest in step by. Returns how to stop. */
	onEdit(e) {
		this.listeners_.add(e);
		return () => {
			this.listeners_.delete(e);
		};
	}
	/** Where a ray first meets any volume, within `maxDistance`. */
	raycast(e, t, n = 1e3) {
		let r = null;
		for (const i of [...this.built_.keys()]) {
			const a = this.built_.get(i);
			const o = a.field.raycast(Z(e, a.origin), t, r ? r.distance : n);
			if (o && (!r || o.distance < r.distance)) r = {
				...o,
				point: ce(o.point, a.origin),
				entity: i
			};
		}
		return r;
	}
	/** The signed distance at a place: below zero is inside something solid. Null with no such volume. */
	distanceAt(e, t) {
		const n = this.fieldOf_(e);
		if (!n) return null;
		const r = Z(t, n.origin);
		return n.field.distanceAt(r.x, r.y, r.z);
	}
	/** The material at a place, or -1 in the open. Null with no such volume. */
	materialAt(e, t) {
		const n = this.fieldOf_(e);
		if (!n) return null;
		const r = Z(t, n.origin);
		return n.field.materialAt(r.x, r.y, r.z);
	}
	/** What a save holds: only chunks that were edited, and with `changedOnly` only those changed since the last such call. Plain JSON. */
	serialize(e, t = false) {
		return this.fieldOf_(e)?.field.serialize(t) ?? null;
	}
	/** Puts a save back; with `merge`, over what is there rather than instead of it. False when it was cut from another grid and nothing changed. */
	restore(e, t, n = false) {
		const r = this.fieldOf_(e);
		if (!r) return false;
		const i = [];
		const a = r.field.restore(t, n, i);
		if (i.length) s.warn("voxel", `a save's chunks could not be read and were left as they were: ${i.slice(0, 8).join(" ")}`);
		for (const e of r.field.takeDirty()) r.waiting.set(e.key, e);
		return a;
	}
	/** Whether the volume round (x, z) is built for collision: what a game waits on before it drops something there. */
	collisionReadyAt(e, t, n) {
		const r = this.built_.get(e);
		if (!r) return false;
		const i = r.field.cellSize * r.field.chunkCells;
		return r.collidedColumns.has(Y(Math.floor((t - r.origin.x) / i), Math.floor((n - r.origin.z) / i)));
	}
	status(e) {
		const t = this.built_.get(e);
		if (!t) return null;
		let n = 0;
		for (const e of t.drawn.values()) n += e.triangles;
		const r = t.field.held;
		return {
			drawnChunks: t.drawn.size,
			triangles: n,
			collidingChunks: t.collided.size,
			heldChunks: r.chunks,
			editedChunks: r.edited,
			waitingChunks: t.waiting.size,
			lastRebuildMs: t.lastRebuildMs
		};
	}
};
const ce = (e, t) => ({
	x: e.x + t.x,
	y: e.y + t.y,
	z: e.z + t.z
});
const Z = (e, t) => ({
	x: e.x - t.x,
	y: e.y - t.y,
	z: e.z - t.z
});
function le(e, t) {
	if (e.kind === "capsule") return {
		...e,
		from: Z(e.from, t),
		to: Z(e.to, t)
	};
	return {
		...e,
		center: Z(e.center, t)
	};
}
/** @experimental */
const Q = o(new X(), "VoxelTerrains");
/** Makes and keeps every `VoxelTerrain`. @experimental */
var $ = class {
	constructor() {
		this.name = "voxel";
		this.activeWhen = [G];
		this.stock_ = 0;
	}
	build(e) {
		const t = new X();
		t.app_ = e;
		t.ensure_ = (n) => this.ensure(e, t, n);
		e.insertResource(Q, t);
		e.world.onDespawn((n) => {
			const r = t.built_.get(n);
			if (r) this.destroy(e, t, r);
			t.sources_.delete(n);
		});
		e.addSystemToSchedule(3, r([], () => {
			const n = e.hasResource(c);
			for (const n of [...t.built_.values()]) if (!e.world.valid(n.entity) || !e.world.has(n.entity, G)) this.destroy(e, t, n);
			for (const r of e.world.getEntitiesWithComponents([G, a])) {
				const i = this.ensure(e, t, r);
				if (!i) continue;
				i.data = { ...e.world.get(r, G) };
				this.collide(e, i);
				if (n) {
					if (i.data.material || i.instance) this.draw(e, i);
					else if (!i.pending) this.prepare(e, i);
				}
				this.remake(e, i);
				i.field.trim((e) => i.collidedColumns.has(Y(e.cx, e.cz)));
			}
		}, { name: "VoxelTerrainSystem" }));
	}
	cleanup(e) {
		if (!e?.hasResource(Q)) return;
		const t = e.getResource(Q);
		for (const n of [...t.built_.values()]) this.destroy(e, t, n);
		if (this.stock_) d.release(this.stock_);
		this.stock_ = 0;
	}
	/** The volume's state: made again when what it is made from has changed. */
	ensure(e, t, n) {
		const r = e.world;
		if (!r.valid(n) || !r.has(n, G) || !r.has(n, a)) return null;
		r.ensureTransformsComposed();
		const i = r.get(n, G);
		const o = r.get(n, a).worldPosition;
		const s = t.sources_.get(n);
		const c = ae(i, o, s, t.sourceIds_);
		const l = t.built_.get(n);
		if (l?.signature === c) return l;
		const u = l ? l.field.serialize() : null;
		if (l) this.destroy(e, t, l);
		const d = new P({
			cellSize: i.cellSize,
			chunkCells: i.chunkCells,
			minY: i.minY,
			maxY: i.maxY,
			source: s ?? L(i)
		});
		const f = {
			entity: n,
			signature: c,
			field: d,
			origin: {
				x: o.x,
				y: o.y,
				z: o.z
			},
			data: { ...i },
			drawn: /* @__PURE__ */ new Map(),
			drawnColumns: /* @__PURE__ */ new Set(),
			collidedColumns: /* @__PURE__ */ new Set(),
			collided: /* @__PURE__ */ new Set(),
			waiting: /* @__PURE__ */ new Map(),
			instance: 0,
			pending: false,
			epoch: (l?.epoch ?? 0) + 1,
			lastRebuildMs: 0
		};
		if (u) {
			d.restore(u);
			d.takeDirty();
		}
		t.built_.set(n, f);
		return f;
	}
	async prepare(e, t) {
		t.pending = true;
		const n = t.epoch;
		try {
			const r = await this.stock(e);
			if (t.epoch !== n || !r) return;
			t.instance = d.createInstance(r);
		} catch (e) {
			s.error("voxel", "preparing the volume failed", e);
		} finally {
			t.pending = false;
		}
	}
	async stock(e) {
		if (this.stock_) return this.stock_;
		const t = (await e.getResource(c).load("material-shader", "builtin:voxel-ground")).compile([]);
		if (this.stock_) return this.stock_;
		this.stock_ = d.createFromAsset({
			version: "1.0",
			type: "material",
			shader: "builtin:voxel-ground",
			blendMode: 9,
			depthTest: true,
			depthWrite: true,
			cull: 0,
			properties: {}
		}, t);
		return this.stock_;
	}
	rows(e) {
		const t = [];
		for (let n = e.field.rowMin; n <= e.field.rowMax; n++) t.push(n);
		return t;
	}
	/** One chunk's skin, and its surface data, or null where nothing passes through. */
	skin(e, t) {
		return t.surfaced ? U(t.distances, t.materials, e.field.chunkCells, e.field.cellSize) : null;
	}
	showChunk(e, r, i, o) {
		const s = r.data, l = e.world, u = e.getResource(c);
		const d = r.drawn.get(i.key);
		if (!o) {
			if (d) {
				if (l.valid(d.entity)) l.despawn(d.entity);
				u.releaseBuiltMesh(d.mesh);
				r.drawn.delete(i.key);
			}
			return;
		}
		const f = u.createMesh(ie(o));
		if (!f) return;
		const p = r.field.cellSize * r.field.chunkCells;
		const m = d?.entity ?? l.spawn(`VoxelChunk ${i.key}`);
		if (!d) {
			l.insert(m, n);
			l.insert(m, a, { position: {
				x: i.cx * p,
				y: i.cy * p,
				z: i.cz * p
			} });
			l.setParent(m, r.entity);
		}
		const h = d ? l.get(m, t) : null;
		l.insert(m, t, {
			...h,
			enabled: true,
			mesh: f,
			material: r.instance || s.material,
			texture: s.map0,
			lit: true,
			opaque: true,
			cullBackfaces: true,
			castShadows: s.castShadows
		});
		if (d) u.releaseBuiltMesh(d.mesh);
		r.drawn.set(i.key, {
			entity: m,
			mesh: f,
			triangles: o.indices.length / 3
		});
	}
	colliderOf(e, t, n, r) {
		const i = f(e), a = J(t.entity, n.key), o = t.data;
		if (!r) {
			i.delete(a);
			t.collided.delete(n.key);
			return;
		}
		const s = t.field.cellSize * t.field.chunkCells;
		i.set(a, {
			owner: t.entity,
			origin: [
				t.origin.x + n.cx * s,
				t.origin.y + n.cy * s,
				t.origin.z + n.cz * s
			],
			positions: r.positions,
			indices: r.indices,
			friction: o.friction,
			restitution: 0,
			layer: o.collisionLayer
		});
		t.collided.add(n.key);
	}
	/** The chunks edits reached, for as long as the frame can spare and at least one, so a dig is always seen. */
	remake(e, t) {
		if (t.waiting.size === 0) return;
		const n = performance.now();
		const r = e.hasResource(c) && !!(t.instance || t.data.material);
		for (const [i, a] of t.waiting) {
			const o = Y(a.cx, a.cz);
			const s = r && t.drawnColumns.has(o), c = t.collidedColumns.has(o);
			if (s || c) {
				const n = performance.now();
				const r = t.field.chunk(a.cx, a.cy, a.cz);
				const i = this.skin(t, r);
				if (s) this.showChunk(e, t, r, i);
				if (c && t.data.collision) this.colliderOf(e, t, r, i);
				t.lastRebuildMs = performance.now() - n;
			}
			t.waiting.delete(i);
			if (performance.now() - n > se) break;
		}
	}
	draw(e, t) {
		const n = t.data;
		const r = t.instance;
		if (r && !n.material) {
			const e = (e, t) => {
				d.setUniform(r, e, t);
			};
			for (const [t, r] of [
				n.color0,
				n.color1,
				n.color2,
				n.color3
			].entries()) e(`u_voxelTint${t}`, {
				x: r.r,
				y: r.g,
				z: r.b,
				w: r.a
			});
			e("u_voxelTile", n.tile);
			if (n.map1) e("u_voxelMap1", d.tex(n.map1));
			if (n.map2) e("u_voxelMap2", d.tex(n.map2));
			if (n.map3) e("u_voxelMap3", d.tex(n.map3));
		}
		const i = t.field.cellSize * t.field.chunkCells;
		y(e).set(K(t.entity), {
			label: "Building the volume",
			originX: t.origin.x,
			originZ: t.origin.z,
			sizeX: i,
			sizeZ: i,
			extent: null,
			loadRadius: Math.max(n.drawDistance, 0),
			unloadRadius: Math.max(n.drawDistance, 0) + i,
			generation: t.epoch,
			sources: () => oe(e),
			make: (e, n) => ({
				cx: e,
				cz: n,
				skins: this.rows(t).map((r) => {
					const i = t.field.chunk(e, r, n);
					return {
						chunk: i,
						surface: this.skin(t, i)
					};
				})
			}),
			publish: (n, r, { skins: i }) => {
				t.drawnColumns.add(Y(n, r));
				for (const { chunk: n, surface: r } of i) {
					this.showChunk(e, t, n, r);
					t.waiting.delete(n.key);
				}
			},
			release: (n, r) => {
				t.drawnColumns.delete(Y(n, r));
				for (const i of this.rows(t)) {
					const a = w(n, i, r);
					const o = t.drawn.get(a);
					if (!o) continue;
					if (e.world.valid(o.entity)) e.world.despawn(o.entity);
					if (e.hasResource(c)) e.getResource(c).releaseBuiltMesh(o.mesh);
					t.drawn.delete(a);
				}
			}
		});
	}
	collide(e, t) {
		const n = q(t.entity), r = t.data;
		if (!r.collision) {
			if (e.hasResource(b)) e.getResource(b).remove(n);
			return;
		}
		const i = t.field.cellSize * t.field.chunkCells;
		y(e).set(n, {
			label: "Building the volume's collision",
			originX: t.origin.x,
			originZ: t.origin.z,
			sizeX: i,
			sizeZ: i,
			extent: null,
			loadRadius: Math.max(r.collisionDistance, 0),
			unloadRadius: Math.max(r.collisionDistance, 0) + i,
			generation: `${t.epoch}:${r.collisionLayer}:${r.friction}`,
			sources: () => x(e),
			make: (e, n) => ({ skins: this.rows(t).map((r) => {
				const i = t.field.chunk(e, r, n);
				return {
					chunk: i,
					surface: this.skin(t, i)
				};
			}) }),
			publish: (n, r, { skins: i }) => {
				t.collidedColumns.add(Y(n, r));
				for (const { chunk: n, surface: r } of i) this.colliderOf(e, t, n, r);
			},
			release: (n, r) => {
				t.collidedColumns.delete(Y(n, r));
				const i = f(e);
				for (const e of this.rows(t)) {
					const a = w(n, e, r);
					i.delete(J(t.entity, a));
					t.collided.delete(a);
				}
			}
		});
	}
	destroy(e, t, n) {
		t.built_.delete(n.entity);
		n.epoch++;
		if (e.hasResource(b)) {
			const t = e.getResource(b);
			t.remove(K(n.entity));
			t.remove(q(n.entity));
		}
		f(e).deleteAll(`voxel:${n.entity}:`);
		for (const t of n.drawn.values()) {
			if (e.world.valid(t.entity)) e.world.despawn(t.entity);
			if (e.hasResource(c)) e.getResource(c).releaseBuiltMesh(t.mesh);
		}
		n.drawn.clear();
		if (n.instance) d.release(n.instance);
		n.instance = 0;
	}
};
/** @experimental */
const ue = /* @__PURE__ */ new $();
//#endregion
export { ue as a, ne as c, P as d, Q as i, L as l, G as n, U as o, X as r, F as s, $ as t, S as u };

//# sourceMappingURL=voxelPlugin.js.map