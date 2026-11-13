import { $t as e, Ct as t, Nt as n, R as r, c as i, n as a, qt as o, rn as s } from "./system.js";
import { i as c, s as l, t as u } from "./resource.js";
import { s as d } from "./logger.js";
import { n as f } from "./AssetPlugin.js";
import { n as p } from "./wasmScratch.js";
import { i as m, n as h } from "./env.js";
import { K as g, q as _ } from "./scene.js";
import { n as v, r as y, s as b } from "./meshFormat.js";
import { c as x } from "./movers.js";
import { t as S } from "./qualityRuntime.js";
//#region src/foliage/builder.ts
/**
* @file    builder.ts
* @brief   Where plants stand, and the geometry of a patch of them.
*
* @details A field of grass is tens of thousands of blades and a forest is thousands of trees, which no engine draws one entity at a time. The
*          ground is cut into cells and every cell is ONE mesh with all its plants in it, so a field is a few hundred draws that
*          culling can drop whole. Each cell is built at the detail its distance deserves — fewer, broader blades; a tree
*          reduced to two crossed cards — and the engine's own level-of-detail picks among them.
*
*          What the wind needs is painted into the vertices, because a plant is not a thing the vertex stage can see once it is
*          merged: the colour's red is how far up the plant the vertex is (the tip moves and the root does not), green is a
*          phase of the plant's own so a meadow does not sway as one, and blue is how much light reaches it (the base of a
*          clump is darker). The Foliage material reads them; a mesh drawn without it shows them as colour, so a field with
*          no material is painted in its own colours instead.
*/
/** A deterministic 32-bit generator: the same seed grows the same field on every host. */
function C(e) {
	let t = e | 0;
	return () => {
		t = t + 1831565813 | 0;
		let e = Math.imul(t ^ t >>> 15, 1 | t);
		e = e + Math.imul(e ^ e >>> 7, 61 | e) ^ e;
		return ((e ^ e >>> 14) >>> 0) / 4294967296;
	};
}
/**
* The plants of one cell: `count` tries at random places, each kept only where the ground is gentle enough and in the height band.
* Positions come back relative to the cell's centre, with the ground's height already in them.
*/
function w(e, t) {
	const n = C(Math.imul(e.seed | 0, 73856093) ^ Math.imul(e.cellKey | 0, 19349663) ^ 2654435769);
	const r = [];
	for (let i = 0; i < e.count; i++) {
		const i = e.centerX + (n() - .5) * e.size;
		const a = e.centerZ + (n() - .5) * e.size;
		const o = n() * Math.PI * 2;
		const s = e.minScale + (e.maxScale - e.minScale) * n();
		const c = n();
		const l = .7 + .3 * n();
		const u = t(i, a);
		if (!u || u.up < e.minUp || u.y < e.heightMin || u.y > e.heightMax) continue;
		r.push({
			x: i - e.centerX,
			y: u.y,
			z: a - e.centerZ,
			yaw: o,
			scale: s,
			phase: c,
			shade: l
		});
	}
	return r;
}
/** A band as a colour's alpha: thirds, which a byte holds exactly; 1 where there is none (the shader is then told there are no bands). */
const T = (e) => e === void 0 ? 1 : Math.min(Math.max(Math.round(e), 0), 3) / 3;
const E = (e = 1) => ({
	alpha: e,
	pos: [],
	uv: [],
	color: [],
	nrm: [],
	idx: []
});
function D(e, t, n, r, i, a, o, s, c, l, u, d) {
	e.pos.push(t, n, r);
	e.uv.push(i, a);
	e.color.push(o, s, c, e.alpha);
	e.nrm.push(l, u, d);
	return e.pos.length / 3 - 1;
}
function O(e) {
	const { channels: t, vertexStride: n } = b([
		{
			semantic: v.Position,
			components: 3,
			type: y.Float32
		},
		{
			semantic: v.TexCoord0,
			components: 2,
			type: y.Float32
		},
		{
			semantic: v.Color,
			components: 4,
			type: y.UNorm8
		},
		{
			semantic: v.Normal,
			components: 3,
			type: y.Float32
		},
		...e.seat ? [{
			semantic: v.TexCoord1,
			components: 2,
			type: y.Float32
		}] : []
	]);
	const r = e.seat ? t[4].offset : -1;
	const i = e.pos.length / 3;
	const a = new Uint8Array(Math.max(1, i) * n);
	const o = new DataView(a.buffer);
	const s = t[0].offset, c = t[1].offset, l = t[2].offset, u = t[3].offset;
	const d = [
		Infinity,
		Infinity,
		Infinity
	];
	const f = [
		-Infinity,
		-Infinity,
		-Infinity
	];
	for (let t = 0; t < i; t++) {
		const i = t * n;
		for (let n = 0; n < 3; n++) {
			const r = e.pos[t * 3 + n];
			o.setFloat32(i + s + n * 4, r, true);
			o.setFloat32(i + u + n * 4, e.nrm[t * 3 + n], true);
			if (r < d[n]) d[n] = r;
			if (r > f[n]) f[n] = r;
		}
		o.setFloat32(i + c, e.uv[t * 2], true);
		o.setFloat32(i + c + 4, e.uv[t * 2 + 1], true);
		if (r >= 0) {
			o.setFloat32(i + r, e.seat[t * 2] ?? 0, true);
			o.setFloat32(i + r + 4, e.seat[t * 2 + 1] ?? 0, true);
		}
		for (let n = 0; n < 4; n++) o.setUint8(i + l + n, Math.round(Math.min(Math.max(e.color[t * 4 + n], 0), 1) * 255));
	}
	if (i === 0) {
		d.fill(0);
		f.fill(0);
	}
	return {
		channels: t,
		vertexStride: n,
		vertexCount: i,
		vertices: a,
		indices: new Uint32Array(e.idx),
		aabbMin: d,
		aabbMax: f
	};
}
/**
* A patch of grass: a tapered, slightly bent blade for each plant, facing where its yaw says. The normal leans toward the ground's up
* so a meadow is lit as one surface and not as ten thousand knives.
*/
function ee(e, t) {
	const n = E(T(t.band));
	const r = Math.max(1, Math.floor(t.segments));
	const i = Math.max(1, Math.floor(t.thin));
	const a = Math.sqrt(i);
	const o = t.lean ?? .12;
	for (let s = 0; s < e.length; s += i) {
		const i = e[s];
		const c = t.height * i.scale * (a > 1 ? 1.1 : 1);
		const l = t.width * i.scale * a * .5;
		const u = Math.cos(i.yaw), d = Math.sin(i.yaw);
		const f = d, p = u;
		n.pos.length / 3;
		const m = [];
		for (let e = 0; e <= r; e++) {
			const a = e / r;
			const s = e === r ? 0 : l * (1 - a * .85);
			const h = a * a * c * o;
			const g = i.y + a * c;
			const _ = i.x + f * h, v = i.z + p * h;
			const y = t.paint ? k(t.paint, a, i.shade) : [
				a,
				i.phase,
				i.shade * (.55 + .45 * a)
			];
			const b = .65;
			const x = f * .75, S = p * .75;
			const C = D(n, _ - u * s, g, v + d * s, 0, a, y[0], y[1], y[2], x, b, S);
			if (e === r) {
				m.push(C, C);
				continue;
			}
			const w = D(n, _ + u * s, g, v - d * s, 1, a, y[0], y[1], y[2], x, b, S);
			m.push(C, w);
		}
		for (let e = 0; e < r; e++) {
			const t = m[e * 2], r = m[e * 2 + 1], i = m[e * 2 + 2], a = m[e * 2 + 3];
			n.idx.push(t, r, i);
			if (a !== i) n.idx.push(r, a, i);
		}
	}
	return O(n);
}
function k(e, t, n) {
	const r = n * (.55 + .45 * t);
	return [
		(e.base[0] + (e.tip[0] - e.base[0]) * t) * r,
		(e.base[1] + (e.tip[1] - e.base[1]) * t) * r,
		(e.base[2] + (e.tip[2] - e.base[2]) * t) * r
	];
}
/** Reads a channel of a source mesh as floats. */
function A(e, t, n) {
	const r = e.channels.find((e) => e.semantic === t);
	if (!r || r.type !== y.Float32 || r.components < n) return () => false;
	const i = new DataView(e.vertices.buffer, e.vertices.byteOffset, e.vertices.byteLength);
	return (t, a) => {
		for (let o = 0; o < n; o++) a[o] = i.getFloat32(t * e.vertexStride + r.offset + o * 4, true);
		return true;
	};
}
/**
* Copies of a mesh, one per plant, as one mesh: placed, turned about the vertical and scaled, with the wind's weights painted by how
* high each vertex stands on its own copy (a tree's trunk hardly moves, its crown does). With `seats` the mesh has a second uv: for a
* vertex of a plant's head (the last tenth of its height) where it sits from the plant's own axis, across the ground, and zero below
* it. It is the pivot a shader turns the head about (the Foliage shader's u_faceEye), as a pivot painted into a uv is elsewhere.
*/
/** The share of a plant's height where its top begins to tip, and where it is tipped whole. */
const j = .9;
function te(e, t, n, r, i = false) {
	const a = E(T(r));
	if (i) a.seat = [];
	const o = A(e, v.Position, 3);
	const s = A(e, v.Normal, 3);
	const c = A(e, v.TexCoord0, 2);
	const l = e.aabbMin[1], u = Math.max(1e-6, e.aabbMax[1] - e.aabbMin[1]);
	const d = [
		0,
		0,
		0
	], f = [
		0,
		1,
		0
	], p = [0, 0];
	for (const r of t) {
		const t = a.pos.length / 3;
		const i = Math.cos(r.yaw), m = Math.sin(r.yaw);
		const h = r.up ? L(r.up) : null;
		const g = [
			0,
			0,
			0
		], _ = [
			0,
			0,
			0
		], v = [
			0,
			0,
			0
		];
		const y = r.tilt ?? 0, b = e.aabbMax[1] * r.scale;
		for (let t = 0; t < e.vertexCount; t++) {
			o(t, d);
			if (!s(t, f)) {
				f[0] = 0;
				f[1] = 1;
				f[2] = 0;
			}
			if (!c(t, p)) {
				p[0] = 0;
				p[1] = 0;
			}
			const e = Math.min(Math.max((d[1] - l) / u, 0), 1);
			const x = r.spread ?? 1;
			const S = d[0] * r.scale * x;
			let C = d[1] * r.scale, w = d[2] * r.scale * x;
			if (x !== 1) {
				f[0] = f[0] / x;
				f[2] = f[2] / x;
				const e = Math.hypot(f[0], f[1], f[2]) || 1;
				f[0] /= e;
				f[1] = f[1] / e;
				f[2] /= e;
			}
			if (y !== 0 && e > j) {
				const t = y * Math.min((e - j) / .04999999999999993, 1), n = Math.cos(t), r = Math.sin(t);
				const i = C - b, a = f[1], o = f[2];
				C = b + i * n - w * r;
				w = i * r + w * n;
				f[1] = a * n - o * r;
				f[2] = a * r + o * n;
			}
			const T = n ? k(n, e, r.shade) : [
				e,
				r.phase,
				r.shade * (.6 + .4 * e)
			];
			g[0] = S * i + w * m;
			g[1] = C;
			g[2] = -S * m + w * i;
			_[0] = f[0] * i + f[2] * m;
			_[1] = f[1];
			_[2] = -f[0] * m + f[2] * i;
			if (h) {
				h(g);
				h(_);
			}
			D(a, r.x + g[0], r.y + g[1], r.z + g[2], p[0], p[1], T[0], T[1], T[2], _[0], _[1], _[2]);
			if (a.seat) {
				v[0] = 0;
				v[1] = C;
				v[2] = 0;
				if (h) h(v);
				const t = e > j;
				a.seat.push(t ? g[0] - v[0] : 0, t ? g[2] - v[2] : 0);
			}
		}
		for (const n of e.indices) a.idx.push(t + n);
	}
	return O(a);
}
/**
* Copies of an authored mesh, one per plant, as one mesh, with every channel of the source kept: the colour, the second uv and the tangent that a
* normal map reads are what the artist made, and the wind's painted weights do not replace them (see buildInstancedMesh for a mesh that is painted).
* Each copy is turned about the vertical, scaled, leaned with the ground where it has an `up`, and placed; positions, normals and tangents are carried, other channels are copied as they are.
*/
function M(e, t) {
	const n = e.vertexStride, r = e.vertexCount;
	const i = new Uint8Array(Math.max(1, r * t.length) * n);
	const a = new Uint32Array(e.indices.length * t.length);
	const o = (t) => e.channels.find((e) => e.semantic === t && e.type === y.Float32 && e.components >= 3)?.offset ?? -1;
	const s = o(v.Position), c = o(v.Normal), l = o(v.Tangent);
	const u = [
		Infinity,
		Infinity,
		Infinity
	];
	const d = [
		-Infinity,
		-Infinity,
		-Infinity
	];
	const f = n >> 2, p = s >> 2, m = c >> 2, h = l >> 2;
	const g = new Float32Array(i.buffer), _ = new Uint32Array(i.buffer);
	const b = new Uint8Array(r * n);
	b.set(e.vertices.subarray(0, r * n));
	const x = new Float32Array(b.buffer), S = new Uint32Array(b.buffer);
	const C = c >= 0, w = l >= 0;
	t.forEach((t, n) => {
		const i = Math.cos(t.yaw), o = Math.sin(t.yaw), c = t.scale;
		const l = t.up ? L(t.up) : null;
		const v = n * r * f;
		_.set(S, v);
		for (let e = 0, n = v; e < r; e++, n += f) {
			if (s >= 0) {
				const r = x[e * f + p] * c, a = x[e * f + p + 1] * c, s = x[e * f + p + 2] * c;
				let m = r * i + s * o, h = a, _ = -r * o + s * i;
				if (l) {
					const e = [
						m,
						h,
						_
					];
					l(e);
					m = e[0];
					h = e[1];
					_ = e[2];
				}
				m += t.x;
				h += t.y;
				_ += t.z;
				g[n + p] = m;
				g[n + p + 1] = h;
				g[n + p + 2] = _;
				if (m < u[0]) u[0] = m;
				if (m > d[0]) d[0] = m;
				if (h < u[1]) u[1] = h;
				if (h > d[1]) d[1] = h;
				if (_ < u[2]) u[2] = _;
				if (_ > d[2]) d[2] = _;
			}
			if (C) {
				const t = x[e * f + m], r = x[e * f + m + 1], a = x[e * f + m + 2];
				g[n + m] = t * i + a * o;
				g[n + m + 2] = -t * o + a * i;
				if (l) {
					const e = [
						g[n + m],
						r,
						g[n + m + 2]
					];
					l(e);
					g[n + m] = e[0];
					g[n + m + 1] = e[1];
					g[n + m + 2] = e[2];
				}
			}
			if (w) {
				const t = x[e * f + h], r = x[e * f + h + 1], a = x[e * f + h + 2];
				g[n + h] = t * i + a * o;
				g[n + h + 2] = -t * o + a * i;
				if (l) {
					const e = [
						g[n + h],
						r,
						g[n + h + 2]
					];
					l(e);
					g[n + h] = e[0];
					g[n + h + 1] = e[1];
					g[n + h + 2] = e[2];
				}
			}
		}
		const y = n * e.indices.length, b = n * r;
		for (let t = 0; t < e.indices.length; t++) a[y + t] = e.indices[t] + b;
	});
	if (t.length === 0) {
		u.fill(0);
		d.fill(0);
	}
	return {
		channels: e.channels,
		vertexStride: n,
		vertexCount: r * t.length,
		vertices: i,
		indices: a,
		aabbMin: u,
		aabbMax: d
	};
}
/** Floats a placement takes in the engine's `MeshInstances`: three rows of a model matrix (translation last), then a tint. */
const ne = 16;
/**
* Where each plant stands, as the placements of a `MeshInstances`: the same turn about the vertical, scale, lean with the ground and position that
* buildPlacedMesh bakes into vertices, left as a matrix for the engine to apply to the one mesh every plant of the kind shares. `tint` is
* multiplied into the renderer's colour per plant.
*/
function N(e) {
	const t = new Float32Array(e.length * 16);
	const n = [
		0,
		0,
		0
	];
	e.forEach((e, r) => {
		const i = Math.cos(e.yaw), a = Math.sin(e.yaw), o = e.scale;
		const s = e.up ? L(e.up) : null;
		const c = r * 16;
		for (let e = 0; e < 3; e++) {
			n[0] = e === 0 ? i : e === 2 ? a : 0;
			n[1] = e === 1 ? 1 : 0;
			n[2] = e === 0 ? -a : e === 2 ? i : 0;
			if (s) s(n);
			for (let r = 0; r < 3; r++) t[c + r * 4 + e] = n[r] * o;
		}
		if (e.shear) {
			t[c + 1] = t[c + 1] + e.shear[0] * o;
			t[c + 9] = t[c + 9] + e.shear[1] * o;
		}
		t[c + 3] = e.x;
		t[c + 7] = e.y;
		t[c + 11] = e.z;
		t[c + 12] = t[c + 13] = t[c + 14] = t[c + 15] = 1;
	});
	return t;
}
/**
* The mesh with its normals turned toward up by `amount` (0 leaves them, 1 makes them all up): a card that stands for a crown lit as a rounded thing
* rather than as the flat it is. A copy; the source is shared by every plant of the kind.
*/
function P(e, t) {
	const n = e.channels.find((e) => e.semantic === v.Normal && e.type === y.Float32 && e.components >= 3);
	const r = Math.min(Math.max(t, 0), 1);
	if (!n || r <= 0) return e;
	const i = new Uint8Array(e.vertices.subarray(0, e.vertexCount * e.vertexStride));
	const a = new Float32Array(i.buffer), o = e.vertexStride >> 2, s = n.offset >> 2;
	for (let t = 0; t < e.vertexCount; t++) {
		const e = t * o + s;
		const n = a[e] * (1 - r), i = a[e + 1] * (1 - r) + r, c = a[e + 2] * (1 - r);
		const l = Math.hypot(n, i, c) || 1;
		a[e] = n / l;
		a[e + 1] = i / l;
		a[e + 2] = c / l;
	}
	return {
		...e,
		vertices: i
	};
}
/**
* The plants a far version keeps of a share `keep`: those whose own number (`phase`) is under it (the number the Foliage shader thins by,
* so the version holds exactly the plants still drawn where it takes over; `slack` keeps a few more for the switch), each grown to cover
* the ground of those left out, `most` times at most. `up` is the share of that growth its height takes: at 0 it grows across the ground
* only (a clump of flowers is no taller than a flower), at 1 the same every way.
*/
function F(e, t, n, r = 1.25, i = 0, a = 0) {
	const o = Math.min(Math.max(t, .001), 1);
	if (o >= 1) return e;
	const s = Math.min(Math.sqrt(1 / o), Math.max(n, 1));
	const c = [];
	const l = 1 + (s - 1) * Math.min(Math.max(i, 0), 1);
	for (const t of e) if (t.phase < o * r) c.push({
		...t,
		scale: t.scale * l,
		spread: (t.spread ?? 1) * (s / l),
		...a ? { tilt: a } : null
	});
	return c;
}
/**
* The plants a far version draws, when it draws a share `keep` of them (above 0 to 1): every n-th, n the nearest whole number to 1 / keep, each grown by the
* square root of n (to a most of twice) so the ground they cover is what it was. The same plants every time: what is kept is a matter of order.
* `already` is how many times thinner the plants were planned than they would be (a far plan with sparser spacing): the n-th is then every n / `already`-th.
*/
function I(e, t, n = 1) {
	const r = Math.max(1, Math.round(1 / Math.min(Math.max(t, .001), 1)));
	if (r === 1) return e;
	const i = Math.min(Math.sqrt(r), 2), a = Math.max(1, Math.round(r / Math.max(n, 1)));
	const o = [];
	for (let t = 0; t < e.length; t += a) o.push({
		...e[t],
		scale: e[t].scale * i
	});
	return o;
}
/** The turn that takes up (0, 1, 0) to `n` the shortest way, applied to a vector in place; null when `n` is up. */
function L(e) {
	const t = Math.hypot(e[0], e[1], e[2]) || 1;
	const n = e[0] / t, r = e[1] / t, i = e[2] / t;
	const a = Math.hypot(i, n);
	if (a < 1e-6) return null;
	const o = i / a, s = -n / a, c = r, l = 1 - c;
	return (e) => {
		const [t, n, r] = e;
		const i = o * t + s * r;
		e[0] = t * c + -s * n * a + o * i * l;
		e[1] = n * c + (s * t - o * r) * a;
		e[2] = r * c + o * n * a + s * i * l;
	};
}
/**
* The far version of a plant: two cards crossed at right angles, as wide and as tall as the plant is, each showing the rectangle of the
* plant's texture that is its picture. Cheap enough that a forest on the horizon is a few triangles a tree, and seen from any side.
*/
function re(e, t, n, r, i, a = false) {
	const o = E();
	for (const s of e) {
		const e = t * s.scale * .5, c = n * s.scale;
		for (const t of [0, Math.PI / 2]) {
			const n = s.yaw + t;
			const l = Math.cos(n), u = Math.sin(n);
			const d = i ? k(i, 0, s.shade) : [
				0,
				s.phase,
				s.shade * .6
			];
			const f = i ? k(i, 1, s.shade) : [
				1,
				s.phase,
				s.shade
			];
			if (a) {
				const t = c * .1, n = r.v0 + (r.v1 - r.v0) * .1, i = (r.u0 + r.u1) / 2;
				const a = D(o, s.x - l * e, s.y + t, s.z + u * e, r.u0, n, d[0], d[1], d[2], 0, 1, 0);
				const p = D(o, s.x + l * e, s.y + t, s.z - u * e, r.u1, n, d[0], d[1], d[2], 0, 1, 0);
				const m = D(o, s.x, s.y + c, s.z, i, r.v1, f[0], f[1], f[2], 0, 1, 0);
				o.idx.push(a, p, m);
				continue;
			}
			const p = D(o, s.x - l * e, s.y, s.z + u * e, r.u0, r.v0, d[0], d[1], d[2], 0, 1, 0);
			const m = D(o, s.x + l * e, s.y, s.z - u * e, r.u1, r.v0, d[0], d[1], d[2], 0, 1, 0);
			const h = D(o, s.x + l * e, s.y + c, s.z - u * e, r.u1, r.v1, f[0], f[1], f[2], 0, 1, 0);
			const g = D(o, s.x - l * e, s.y + c, s.z + u * e, r.u0, r.v1, f[0], f[1], f[2], 0, 1, 0);
			o.idx.push(p, m, h, p, h, g);
		}
	}
	return O(o);
}
//#endregion
//#region src/foliage/plantGrowth.ts
/**
* Loads the meshes, materials and textures of every part of every kind, once. A part whose normals are turned toward up (`soft`) is a mesh of its own,
* made here, and a part whose geometry cannot be read is left out.
*/
async function R(e, t) {
	const n = [];
	const r = new g();
	const i = /* @__PURE__ */ new Map();
	const a = async (t, n) => {
		const a = `${t}:${n}`;
		const o = i.get(a);
		if (o !== void 0) return o;
		const s = t === "texture" ? await e.acquireTexture(n) : await e.acquireTyped(t, n);
		r.add(s);
		i.set(a, s.value.handle);
		return s.value.handle;
	};
	const o = async (t, o) => {
		const s = await a("mesh", t);
		if (!o) return s;
		const c = `soft:${o}:${t}`;
		const l = i.get(c);
		if (l !== void 0) return l;
		const u = await e.readMeshData(s);
		const d = u ? e.createMesh(P(u, o)) : 0;
		if (d === 0) return s;
		n.push(d);
		r.add(_(c, d, d, (t) => e.releaseBuiltMesh(t)));
		i.set(c, d);
		return d;
	};
	const s = async (e, t) => {
		let n = 0;
		try {
			n = await o(e.mesh, e.soft ?? 0);
		} catch {
			n = 0;
		}
		if (n === 0) {
			d.warn("foliage", `the geometry of ${e.mesh} cannot be read, so its plants are left out`);
			return null;
		}
		let r = 0;
		if (t && e.lod1Mesh) try {
			r = await o(e.lod1Mesh, e.soft ?? 0);
		} catch {
			r = 0;
		}
		let i = 0;
		if (t && e.lod2Mesh) try {
			i = await o(e.lod2Mesh, e.soft ?? 0);
		} catch {
			i = 0;
		}
		return {
			part: e,
			mesh: n,
			lod1: r,
			...i ? { lod2: i } : {},
			material: e.material ? await a("material", e.material) : 0,
			texture: e.texture ? await a("texture", e.texture) : 0
		};
	};
	const c = _("foliage-parts", 0, r, (e) => {
		try {
			e.releaseAll();
		} finally {
			n.length = 0;
		}
	});
	const l = {
		kinds: [],
		far: [],
		owned: n,
		lease: c
	};
	try {
		for (const e of t) {
			const t = [], n = [];
			for (const n of e.parts) {
				const e = await s(n, true);
				if (e) t.push(e);
			}
			for (const t of e.far ?? []) {
				const e = await s(t, false);
				if (e) n.push(e);
			}
			l.kinds.push(t);
			l.far.push(n);
		}
	} catch (e) {
		c.release();
		throw e;
	}
	return l;
}
/** Retires the owner's receipt. Published cells keep this generation alive until they are replaced. */
function z(e) {
	e.lease.release();
}
/** The growth of every plant in an app: the pieces waiting. */
var B = class {
	constructor() {
		this.queue = [];
		this.app_ = null;
		this.observer_ = null;
		this.made = 0;
		this.spentMs = 0;
	}
	/** How many pieces are still waiting to be made. */
	get pending() {
		return this.queue.length;
	}
	/**
	* Makes one entity under `parent` that draws `part`'s mesh at every place in `plants`, relative to `parent`. `from` and `to` are the distances
	* from the eye between which a plant is drawn (0 for no limit); `lod` is the distance past which the part's cheaper mesh stands in, and `shadow` the one past which it casts no shadow. All of them are scaled by the quality level's `detailScale`.
	*/
	place(e, r, i, a, c, l, u, d, f = 0, p = false, m = a.mesh, h = a.lod1) {
		const g = e.world;
		const _ = e.hasResource(S) ? e.getResource(S) : null;
		const v = _ && _.enabled ? _.profile.detailScale : 1;
		l *= v;
		u *= v;
		f *= v;
		if (d > 0 && !p) d *= v;
		const y = g.spawn(i);
		g.insert(y, n);
		g.insert(y, o, {});
		g.insert(y, t, {
			mesh: m,
			material: a.material,
			texture: a.texture,
			lit: true,
			opaque: a.part.opaque !== false,
			cullBackfaces: false,
			castShadows: a.part.castShadows !== false,
			color: {
				r: a.part.tint[0],
				g: a.part.tint[1],
				b: a.part.tint[2],
				a: a.part.tint[3]
			}
		});
		const b = s("MeshInstances");
		if (b) g.insert(y, b, {
			lod1Mesh: h,
			lodDistance: h ? l : 0,
			minDistance: u,
			drawDistance: d,
			shadowDistance: f
		});
		g.setParent(y, r);
		if (c.length > 0) this.writePlacements(e, y, c);
		return y;
	}
	/** Tells the engine where a set's plants stand. An empty list clears it. */
	writePlacements(e, t, n) {
		const i = r(e);
		const a = i?.meshInstances_set;
		if (!a || !i._malloc || !i._free || !i.HEAPU8) return;
		const o = e.world.getCppRegistry();
		if (n.length === 0) {
			a(o, t, 0, 0);
			return;
		}
		const s = N(n);
		p({
			_malloc: i._malloc,
			_free: i._free
		}, (e) => {
			const n = e(s.byteLength);
			new Float32Array(i.HEAPU8.buffer, n, s.length).set(s);
			a(o, t, n, s.length / 16);
		});
	}
	/** @internal Writes a set as its observer says it should be now. */
	writeSet(e, t, n) {
		if (!e.world.valid(n.entity)) return;
		this.writePlacements(e, n.entity, this.observer_ ? this.observer_.placementsOf(t, n) : n.plants);
	}
	/** Places a set, remembering it where the cell's plants can change, and shows it as it should be now. */
	track(e, t, n, r, i, a = false) {
		if (!t.sets) return;
		const o = {
			entity: n,
			kind: r,
			plants: i,
			turned: a
		};
		t.sets.push(o);
		if (this.observer_) this.writeSet(e, t, o);
	}
	/** @internal The sets that show plants that have turned into `kindIndex`, made at once: there are few, and a stump must stand when its tree starts down. */
	placeTurned(e, t, n, r, i) {
		const a = n[i], o = r.kinds[i], s = t.entity;
		if (!a || !o || s === null || !e.world.valid(s)) return;
		o.forEach((n, r) => {
			const o = a.lodDistance > 0 ? a.lodDistance * 2 : 0;
			const c = this.place(e, s, `turned ${i}:${r}`, n, [], a.lodDistance, 0, a.drawDistance, o);
			this.track(e, t, c, i, [], true);
		});
	}
	/**
	* Grows `cell`, whose entity the caller has made and stands at the cell's centre: the plants of each kind in `byKind` (relative to that centre),
	* a piece of work a kind's part.
	*/
	growCell(e, t, n, r, i) {
		const a = e.world, o = t.entity;
		if (o === null) return;
		t.assets ??= r.lease.retain() ?? void 0;
		if (!t.assets) return;
		for (const [s, c] of i) {
			const i = n[s], l = r.kinds[s];
			if (!i || !l) continue;
			l.forEach((n, r) => {
				this.queue.push({
					cell: t,
					run: () => {
						if (!a.valid(o)) return;
						try {
							const a = i.lodDistance > 0 ? i.lodDistance * 2 : 0;
							const l = n.lod2 && (i.lod2Distance ?? 0) > 0 ? i.lod2Distance : 0;
							this.track(e, t, this.place(e, o, `${s}:${r}`, n, c, i.lodDistance, 0, l || i.drawDistance, a), s, c);
							if (l) this.track(e, t, this.place(e, o, `${s}:${r}:lod2`, n, c, 0, l, i.drawDistance, a, false, n.lod2, 0), s, c);
						} catch (e) {
							d.error("foliage", "growing a piece of a cell of plants failed", e);
						}
					}
				});
			});
		}
	}
	/**
	* Grows the far version of `cell`: each kind with one, its plants (thinned to the kind's `farKeep`) as a set of the far part's, drawn from
	* where the kind stops (`drawDistance`) out to `farDistance` from the eye. Cheap enough (a tree is two cards) to be made at once. `thinnedBy` is how many
	* times thinner they were planned already (a far plan), so they are not thinned twice.
	*/
	growFar(e, t, n, r, i, a, o = 1) {
		const s = t.entity;
		if (s === null) return;
		t.assets ??= r.lease.retain() ?? void 0;
		if (!t.assets) return;
		for (const [a, c] of i) {
			const i = r.far[a], l = n[a];
			if (!l || !i || i.length === 0) continue;
			const u = I(c, l.farKeep ?? 1, o);
			for (const n of i) this.track(e, t, this.place(e, s, `far ${a}`, n, u, 0, l.drawDistance, l.farDistance, 0, true), a, u);
		}
	}
	/** Lets a cell go: what it made is despawned, and what it had not yet made is left unmade. */
	release(e, t) {
		t.dead = true;
		this.observer_?.removeCell(t);
		try {
			if (t.entity !== null && e.world.valid(t.entity)) e.world.despawn(t.entity);
		} finally {
			t.assets?.release();
			t.assets = void 0;
			t.handles.length = 0;
		}
	}
	/** One frame of it: the far versions shown where they should be, and the queue worked through while the frame's budget lasts, one piece at least. */
	step(e) {
		const t = x(e);
		let n = true;
		while (this.queue.length > 0 && (n || t.hasTime(this))) {
			n = false;
			const e = this.queue.shift();
			if (e.cell.dead) continue;
			const t = performance.now();
			e.run();
			this.spentMs += performance.now() - t;
			this.made++;
		}
		t.mark(this, "Growing the plants", this.queue.length === 0 ? 1 : .5);
	}
};
/** The resource every plant's growth shares. @experimental */
const V = l(new B(), "PlantGrowth");
/** The App's plant growth, installed (with the system that steps it) on first use. */
function H(e) {
	if (!e.hasResource(V)) {
		const t = new B();
		t.app_ = e;
		e.insertResource(V, t);
		e.addSystemToSchedule(3, i([], () => {
			if (e.hasResource(f)) e.measureFrameScope("plants.grow", () => t.step(e));
		}, { name: "PlantGrowthSystem" }));
	}
	return e.getResource(V);
}
//#endregion
//#region src/foliage/plantInteraction.ts
/**
* Something plants feel: grass and shrubs lean away from it, and the plants near it become entities with colliders.
*
* @experimental
*/
const U = e("FoliageContact", {
	radius: 40,
	strength: 1,
	recovery: .6,
	enabled: true
}, { fields: {
	radius: {
		min: .01,
		unit: "wu",
		tooltip: "How far from this entity plants lean away."
	},
	strength: {
		min: 0,
		max: 2,
		step: .01,
		tooltip: "How hard they lean: 1 is a full lean, 0 none."
	},
	recovery: {
		min: 0,
		step: .05,
		unit: "s",
		tooltip: "How long grass takes to stand up again behind it."
	}
} });
/**
* Marks the entity standing in for a plant while something is near it. What a ray or a collision hits; `PlantInteraction.of` says which plant it is.
*
* @experimental
*/
const W = e("PlantProxy", {
	source: "",
	key: ""
});
/** How much of a lean each second gives way, and how hard it is pulled to where it should be: a rustle that settles in about a second. */
const G = 90;
const K = 9;
const q = 5e-4;
const ie = .1;
const J = 1.5;
const Y = 1.5;
const X = (e, t) => `${e}\n${t}`;
/** Everything plants know about being touched. @experimental */
var Z = class {
	constructor() {
		this.app_ = null;
		this.cells_ = /* @__PURE__ */ new Map();
		this.changes_ = /* @__PURE__ */ new Map();
		this.active_ = /* @__PURE__ */ new Map();
		this.falling_ = /* @__PURE__ */ new Set();
		this.growing_ = /* @__PURE__ */ new Map();
		this.listeners_ = /* @__PURE__ */ new Set();
		this.clock_ = 0;
		this.untilScan_ = 0;
		this.maxActive = 512;
		this.maxActivatedPerFrame = 48;
	}
	/** How many plants are entities now. */
	get activeCount() {
		return this.active_.size;
	}
	/** How many plants have had something happen to them, across every source: what a save holds. */
	get changedCount() {
		return this.changes_.size;
	}
	/** Hears what happens to plants. Returns what stops it. */
	on(e) {
		this.listeners_.add(e);
		return () => {
			this.listeners_.delete(e);
		};
	}
	/** The plant an entity stands for, a `PlantProxy` that a ray or a collision found. */
	of(e) {
		const t = this.app_?.world;
		if (!t?.valid(e) || !t.has(e, W)) return null;
		const n = t.get(e, W);
		return this.find(n.source, n.key);
	}
	/** A plant by its source and key, where its cell is grown now. */
	find(e, t) {
		for (const n of this.cells_.values()) {
			if (n.source !== e) continue;
			const r = n.plants.get(t);
			if (r) return this.refOf(n, t, r);
		}
		return null;
	}
	/** The plants with an `interaction` within `radius` of a place on the ground, nearest first: what an axe swung here could reach. Cut ones are not among them. */
	near(e, t, n) {
		const r = [];
		for (const i of this.cells_.values()) {
			const a = this.cellAt(i);
			if (!a || Math.abs(e - a.x) > i.half + n || Math.abs(t - a.z) > i.half + n) continue;
			for (const [o, s] of i.plants) {
				const c = Math.hypot(a.x + s.plant.x - e, a.z + s.plant.z - t);
				if (c > n || this.kindNow(i, o, s) < 0) continue;
				r.push({
					ref: this.refOf(i, o, s),
					d: c
				});
			}
		}
		return r.sort((e, t) => e.d - t.d).map((e) => e.ref);
	}
	/** Takes `amount` of a plant's `health`, and fells it at nothing left, away from `from` where given. False for a plant that cannot be hurt. */
	damage(e, t, n) {
		const r = this.located(e);
		if (!r) return false;
		const i = r.cell.kinds[r.kind]?.interaction;
		const a = i?.health ?? 0;
		const o = this.changes_.get(X(e.source, e.key));
		if (a <= 0 || o && o.state !== "standing") return false;
		const s = (o ? o.health : a) - Math.max(0, t);
		const c = this.changeFor(r.cell, e.key, r.kind);
		c.health = Math.max(0, s);
		const l = this.refOf(r.cell, e.key, r.entry);
		this.emit("damaged", l);
		const u = this.active_.get(X(e.source, e.key));
		const d = this.cellAt(r.cell);
		if (u && n && d && (i?.bend ?? 0) > 0) {
			const e = d.x + r.entry.plant.x - n.x, t = d.z + r.entry.plant.z - n.z, i = Math.hypot(e, t) || 1;
			u.speedX += e / i * 2;
			u.speedZ += t / i * 2;
			u.settled = false;
		}
		if (s <= 0) if (n && d) {
			const e = d.x + r.entry.plant.x - n.x, t = d.z + r.entry.plant.z - n.z;
			this.fell(l, {
				x: e,
				z: t
			});
		} else this.fell(l);
		return true;
	}
	/** Brings a plant down, toward a direction on the ground or along its own turn. Only what still stands; false otherwise. */
	fell(e, t) {
		const n = this.located(e);
		if (!n) return false;
		const r = X(e.source, e.key);
		const i = this.changes_.get(r);
		if (i && i.state !== "standing") return false;
		const a = n.cell.kinds[n.kind]?.interaction;
		const o = this.changeFor(n.cell, e.key, n.kind);
		o.state = "felled";
		o.health = 0;
		o.shownAs = this.resolveKind(a?.felledKind);
		o.regrowAt = (a?.regrowSeconds ?? 0) > 0 ? this.clock_ + a.regrowSeconds : 0;
		this.startFall(n.cell, n.kind, n.entry.plant, t, e);
		this.deactivate(r);
		this.refreshCell(n.cell, n.kind, o.shownAs);
		this.writeFar(n.cell.source);
		this.emit("felled", this.refOf(n.cell, e.key, n.entry));
		return true;
	}
	/** Takes up to `amount` from a plant, and answers how much it got. At nothing left it becomes its `harvestedKind`, or is gone until it regrows. */
	harvest(e, t = 1) {
		const n = this.located(e);
		if (!n) return 0;
		const r = n.cell.kinds[n.kind]?.interaction;
		const i = r?.yields ?? 0;
		const a = this.changes_.get(X(e.source, e.key));
		if (i <= 0 || a && a.state !== "standing") return 0;
		const o = a ? a.yields : i;
		const s = Math.min(o, Math.max(0, Math.floor(t)));
		if (s === 0) return 0;
		const c = this.changeFor(n.cell, e.key, n.kind);
		c.yields = o - s;
		if (c.yields === 0) {
			c.state = "harvested";
			c.shownAs = this.resolveKind(r?.harvestedKind);
			c.regrowAt = (r?.regrowSeconds ?? 0) > 0 ? this.clock_ + r.regrowSeconds : 0;
			this.deactivate(X(e.source, e.key));
			this.refreshCell(n.cell, n.kind, c.shownAs);
			this.writeFar(n.cell.source);
		}
		this.emit("harvested", this.refOf(n.cell, e.key, n.entry));
		return s;
	}
	/** Takes a plant away with no fall, for good: what a building placed over it or a game's own rule does. */
	remove(e) {
		const t = this.located(e);
		if (!t) return false;
		const n = this.changeFor(t.cell, e.key, t.kind);
		n.state = "removed";
		n.shownAs = -1;
		n.regrowAt = 0;
		this.deactivate(X(e.source, e.key));
		this.refreshCell(t.cell, t.kind, -1);
		this.writeFar(t.cell.source);
		this.emit("removed", this.refOf(t.cell, e.key, t.entry));
		return true;
	}
	/** Everything that has become of the plants, for a save. A tree coming down is saved as down. */
	saveState() {
		const e = [];
		for (const [t, n] of this.changes_) {
			const r = t.indexOf("\n");
			e.push({
				source: t.slice(0, r),
				key: t.slice(r + 1),
				state: n.state,
				shownAs: n.shownAs,
				health: n.health,
				yields: n.yields,
				regrowAt: n.regrowAt
			});
		}
		return {
			version: 1,
			clock: this.clock_,
			plants: e
		};
	}
	/** Puts the plants back as a save has them, whatever is grown now. What had fallen and not gone yet is gone. */
	loadState(e) {
		if (e.version !== 1) throw new Error(`plant state version ${String(e.version)} is not one this engine reads`);
		for (const e of [...this.falling_]) this.endFall(e);
		for (const e of [...this.active_.keys()]) this.deactivate(e);
		this.changes_.clear();
		this.growing_.clear();
		this.clock_ = e.clock;
		for (const t of e.plants) this.changes_.set(X(t.source, t.key), {
			state: t.state,
			shownAs: t.shownAs,
			health: t.health,
			yields: t.yields,
			regrowAt: t.regrowAt
		});
		for (const e of this.cells_.values()) {
			for (const [t] of e.plants) {
				const n = this.changes_.get(X(e.source, t));
				if (n && n.shownAs >= 0) this.ensureShown(e, n.shownAs);
			}
			this.writeCell(e);
		}
	}
	/** @internal A cell of plants has been planted: the kinds with an `interaction` are known from now on. */
	addCell(e, t, n, r, i, a) {
		const o = /* @__PURE__ */ new Map();
		let s = 0;
		for (const [e, t] of i) {
			const r = n[e]?.interaction;
			if (!r) continue;
			s = Math.max(s, r.activationDistance ?? 0);
			for (const n of t) if (n.key !== void 0) o.set(n.key, {
				plant: n,
				kind: e
			});
		}
		const c = {
			grown: e,
			source: t,
			kinds: n,
			ready: r,
			plants: o,
			half: a,
			reach: s,
			at: null,
			shown: /* @__PURE__ */ new Set()
		};
		this.cells_.set(e, c);
		for (const e of o.keys()) {
			const n = this.changes_.get(X(t, e));
			if (n && n.shownAs >= 0) this.ensureShown(c, n.shownAs);
		}
	}
	/** @internal A far cell: nothing near enough to touch, so only what stands for a felled plant needs to go. It is told apart by having no reach. */
	addFarCell(e, t, n, r) {
		this.cells_.set(e, {
			grown: e,
			source: t,
			kinds: n,
			ready: r,
			plants: /* @__PURE__ */ new Map(),
			half: 0,
			reach: 0,
			at: null,
			shown: /* @__PURE__ */ new Set()
		});
	}
	/** @internal What a cell's set should show now: its plants less those that have gone, each as it leans or grows. */
	placementsOf(e, t) {
		const n = this.cells_.get(e);
		if (!n) return t.plants;
		if (t.turned) {
			const e = [];
			for (const [r, i] of n.plants) {
				const a = this.changes_.get(X(n.source, r));
				if (a && a.state !== "standing" && a.shownAs === t.kind) e.push(i.plant);
			}
			return e;
		}
		const r = [];
		for (const e of t.plants) {
			if (e.key === void 0) {
				r.push(e);
				continue;
			}
			const t = X(n.source, e.key);
			const i = this.changes_.get(t);
			if (i && i.state !== "standing") continue;
			const a = this.active_.get(t), o = this.growing_.get(t);
			if (!a?.leanX && !a?.leanZ && o === void 0) {
				r.push(e);
				continue;
			}
			const s = o === void 0 ? 1 : Math.min(1, Math.max(.02, (this.clock_ - o) / J));
			r.push({
				...e,
				scale: e.scale * s,
				...a ? { shear: [a.leanX, a.leanZ] } : {}
			});
		}
		return r;
	}
	/** @internal A cell has been let go: its entities go with it, and what became of its plants stays. */
	removeCell(e) {
		const t = this.cells_.get(e);
		if (!t) return;
		for (const e of t.plants.keys()) this.deactivate(X(t.source, e));
		this.cells_.delete(e);
	}
	/** @internal */
	step(e) {
		if (!this.app_ || h() && !m()) return;
		this.clock_ += e;
		this.regrow();
		this.advanceFalls(e);
		const t = this.contacts();
		this.untilScan_ -= e;
		if (this.untilScan_ <= 0) {
			this.untilScan_ = ie;
			this.scan(t);
		}
		this.lean(t, e);
		this.advanceGrowth();
	}
	contacts() {
		const e = this.app_.world;
		const t = [];
		for (const n of e.getEntitiesWithComponents([U, o])) {
			const r = e.get(n, U);
			if (!r.enabled) continue;
			const i = e.get(n, o);
			t.push({
				x: i.worldPosition.x,
				y: i.worldPosition.y,
				z: i.worldPosition.z,
				radius: r.radius,
				strength: r.strength
			});
		}
		return t;
	}
	/** Which plants should be entities, within what each kind says, and which no longer should. */
	scan(e) {
		const t = /* @__PURE__ */ new Set();
		let n = this.maxActivatedPerFrame;
		for (const r of this.cells_.values()) {
			if (r.reach <= 0) continue;
			const i = this.cellAt(r);
			if (!i) continue;
			for (const a of e) {
				if (Math.abs(a.x - i.x) > r.half + r.reach * 1.25 || Math.abs(a.z - i.z) > r.half + r.reach * 1.25) continue;
				for (const [e, o] of r.plants) {
					const s = this.kindNow(r, e, o);
					if (s < 0) continue;
					const c = r.kinds[s]?.interaction?.activationDistance ?? 0;
					if (c <= 0) continue;
					const l = i.x + o.plant.x - a.x, u = i.z + o.plant.z - a.z, d = l * l + u * u;
					const f = X(r.source, e);
					const p = this.active_.has(f);
					const m = p ? c * 1.25 : c;
					if (d > m * m) continue;
					t.add(f);
					if (p || n <= 0 || this.active_.size >= this.maxActive) continue;
					n--;
					this.activate(r, e, o, s, f);
				}
			}
		}
		for (const e of [...this.active_.keys()]) if (!t.has(e)) this.deactivate(e);
	}
	activate(e, t, n, r, i) {
		const a = {
			cell: e,
			key: t,
			proxy: null,
			leanX: 0,
			leanZ: 0,
			speedX: 0,
			speedZ: 0,
			settled: true,
			kind: r
		};
		a.proxy = this.spawnProxy(e, t, n, r);
		this.active_.set(i, a);
		this.emit("activated", this.refOf(e, t, n));
	}
	spawnProxy(e, t, r, i) {
		const a = this.app_.world, s = this.cellAt(e);
		if (!s) return null;
		const c = a.spawn(`Plant ${t}`);
		a.insert(c, n);
		a.insert(c, o, { position: {
			x: s.x + r.plant.x,
			y: s.y + r.plant.y,
			z: s.z + r.plant.z
		} });
		a.insert(c, W, {
			source: e.source,
			key: t
		});
		this.insertCollider(c, e.kinds[i], r.plant.scale, 0);
		return c;
	}
	/** A capsule standing on the plant's foot. The physics module is optional and read by name; a game without it has plants with no collision and no complaint. */
	insertCollider(e, t, n, r) {
		const i = t?.interaction;
		const a = (i?.radius ?? 0) * n, o = (i?.height ?? 0) * n;
		if (a <= 0 || o <= 0) return;
		const c = s("RigidBody3D"), l = s("CapsuleCollider3D");
		if (!c || !l) return;
		const u = this.app_.world;
		u.insert(e, c, {
			bodyType: r,
			gravityScale: 0
		});
		u.insert(e, l, {
			radius: a,
			halfHeight: Math.max(0, o / 2 - a),
			center: {
				x: 0,
				y: o / 2,
				z: 0
			}
		});
	}
	deactivate(e) {
		const t = this.active_.get(e);
		if (!t) return;
		this.active_.delete(e);
		const n = this.app_?.world;
		const r = t.cell.plants.get(t.key);
		if (r) this.emit("deactivated", this.refOf(t.cell, t.key, r));
		if (t.proxy !== null && n?.valid(t.proxy)) n.despawn(t.proxy);
		if ((t.leanX || t.leanZ) && r) this.writeKind(t.cell, t.kind);
	}
	/** Each active plant toward where its contacts push it, with a spring, so it rustles on being let go. */
	lean(e, t) {
		const n = /* @__PURE__ */ new Map();
		const r = Math.min(t, 1 / 30);
		for (const t of this.active_.values()) {
			const i = t.cell.plants.get(t.key), a = this.cellAt(t.cell);
			const o = t.cell.kinds[t.kind]?.interaction?.bend ?? 0;
			if (!i || !a || o <= 0) continue;
			let s = 0, c = 0;
			for (const t of e) {
				const e = a.x + i.plant.x - t.x, n = a.z + i.plant.z - t.z, r = Math.hypot(e, n);
				if (r >= t.radius || r < 1e-5) continue;
				const o = (1 - r / t.radius) * t.strength;
				s += e / r * o;
				c += n / r * o;
			}
			const l = Math.hypot(s, c), u = Math.tan(o);
			const d = l > 1 ? u / l : u;
			s *= d;
			c *= d;
			t.speedX += ((s - t.leanX) * G - t.speedX * K) * r;
			t.speedZ += ((c - t.leanZ) * G - t.speedZ * K) * r;
			t.leanX += t.speedX * r;
			t.leanZ += t.speedZ * r;
			if (Math.abs(t.leanX - s) + Math.abs(t.leanZ - c) + Math.abs(t.speedX) * r + Math.abs(t.speedZ) * r < q) {
				t.leanX = s;
				t.leanZ = c;
				t.speedX = 0;
				t.speedZ = 0;
				if (t.settled) continue;
				t.settled = true;
			} else t.settled = false;
			let f = n.get(t.cell);
			if (!f) n.set(t.cell, f = /* @__PURE__ */ new Set());
			f.add(t.kind);
		}
		for (const [e, t] of n) for (const n of t) this.writeKind(e, n);
	}
	regrow() {
		for (const [e, t] of this.changes_) {
			if (t.regrowAt <= 0 || t.regrowAt > this.clock_) continue;
			this.changes_.delete(e);
			this.growing_.set(e, this.clock_);
			const n = e.indexOf("\n"), r = e.slice(0, n), i = e.slice(n + 1);
			for (const e of this.cells_.values()) {
				if (e.source !== r) continue;
				this.writeCell(e);
				const t = e.plants.get(i);
				if (t) this.emit("regrown", this.refOf(e, i, t));
			}
		}
	}
	advanceGrowth() {
		if (this.growing_.size === 0) return;
		const e = /* @__PURE__ */ new Map();
		for (const [t, n] of this.growing_) {
			const r = t.indexOf("\n"), i = t.slice(0, r), a = t.slice(r + 1);
			for (const t of this.cells_.values()) {
				if (t.source !== i) continue;
				const n = t.plants.get(a);
				if (!n) continue;
				let r = e.get(t);
				if (!r) e.set(t, r = /* @__PURE__ */ new Set());
				r.add(n.kind);
			}
			if (this.clock_ - n >= J) this.growing_.delete(t);
		}
		for (const [t, n] of e) for (const e of n) this.writeKind(t, e);
	}
	/** It comes down as an entity with its own meshes, turning about its foot: a shape a character can be hit by and then climb over. */
	startFall(e, r, i, a, s) {
		const c = this.app_.world, l = this.cellAt(e);
		const u = e.kinds[r]?.interaction;
		const d = u?.fallSeconds ?? 1.8;
		const f = e.ready.kinds[r];
		if (!l || !f || d <= 0) return;
		const p = a?.x ?? Math.sin(i.yaw), m = a?.z ?? Math.cos(i.yaw);
		const h = Math.hypot(p, m) || 1;
		const g = c.spawn("Felled plant");
		c.insert(g, n);
		c.insert(g, o, { position: {
			x: l.x + i.x,
			y: l.y + i.y,
			z: l.z + i.z
		} });
		c.insert(g, W, {
			source: e.source,
			key: i.key ?? ""
		});
		this.insertCollider(g, e.kinds[r], i.scale, 1);
		const _ = i.yaw / 2;
		for (const e of f) {
			const r = c.spawn("Felled part");
			c.insert(r, n);
			c.insert(r, o, {
				rotation: {
					x: 0,
					y: Math.sin(_),
					z: 0,
					w: Math.cos(_)
				},
				scale: {
					x: i.scale,
					y: i.scale,
					z: i.scale
				}
			});
			c.insert(r, t, {
				mesh: e.mesh,
				material: e.material,
				texture: e.texture,
				lit: true,
				opaque: e.part.opaque !== false,
				cullBackfaces: false,
				castShadows: e.part.castShadows !== false,
				color: {
					r: e.part.tint[0],
					g: e.part.tint[1],
					b: e.part.tint[2],
					a: e.part.tint[3]
				}
			});
			c.setParent(r, g);
		}
		this.falling_.add({
			root: g,
			elapsed: 0,
			seconds: d,
			lie: u?.lieSeconds ?? 30,
			angle: (u?.fallAngle ?? 85) * Math.PI / 180,
			axisX: m / h,
			axisZ: -p / h,
			landed: false,
			plant: s,
			assets: e.ready.lease.retain() ?? null
		});
	}
	advanceFalls(e) {
		const t = this.app_.world;
		for (const n of [...this.falling_]) {
			if (!t.valid(n.root)) {
				this.endFall(n);
				continue;
			}
			n.elapsed += e;
			const r = Math.min(1, n.elapsed / n.seconds);
			const i = n.angle * r * r;
			const a = t.get(n.root, o);
			const s = Math.sin(i / 2);
			a.rotation.x = n.axisX * s;
			a.rotation.y = 0;
			a.rotation.z = n.axisZ * s;
			a.rotation.w = Math.cos(i / 2);
			if (r >= 1 && !n.landed) {
				n.landed = true;
				this.emit("landed", n.plant);
			}
			const c = n.elapsed - n.seconds - n.lie;
			if (c > 0) a.position.y -= e * (n.plant.scale / Y);
			t.set(n.root, o, a);
			if (c > Y) this.endFall(n);
		}
	}
	endFall(e) {
		this.falling_.delete(e);
		const t = this.app_?.world;
		if (t?.valid(e.root)) t.despawn(e.root);
		e.assets?.release();
		e.assets = null;
	}
	refreshCell(e, t, n) {
		if (n >= 0) this.ensureShown(e, n);
		this.writeKind(e, t);
		if (n >= 0) this.writeKind(e, n);
	}
	/** The sets that show plants as another kind than they were grown, made the first time one is wanted in a cell. */
	ensureShown(e, t) {
		if (e.shown.has(t) || t >= e.kinds.length) return;
		e.shown.add(t);
		this.growth().placeTurned(this.app_, e.grown, e.kinds, e.ready, t);
	}
	/** The far cells of a source, which show every plant of theirs that has not gone. */
	writeFar(e) {
		for (const t of this.cells_.values()) if (t.source === e && t.plants.size === 0) this.writeCell(t);
	}
	writeCell(e) {
		for (const t of e.grown.sets ?? []) this.growth().writeSet(this.app_, e.grown, t);
	}
	writeKind(e, t) {
		for (const n of e.grown.sets ?? []) if (n.kind === t) this.growth().writeSet(this.app_, e.grown, n);
	}
	growth() {
		return H(this.app_);
	}
	cellAt(e) {
		if (e.at) return e.at;
		const t = this.app_.world, n = e.grown.entity;
		if (n === null || !t.valid(n)) return null;
		t.ensureTransformsComposed();
		const r = t.tryGet(n, o);
		if (!r) return null;
		e.at = {
			x: r.worldPosition.x,
			y: r.worldPosition.y,
			z: r.worldPosition.z
		};
		return e.at;
	}
	/** The kind a plant shows now, or -1 where nothing is there. */
	kindNow(e, t, n) {
		const r = this.changes_.get(X(e.source, t));
		return !r || r.state === "standing" ? n.kind : r.shownAs;
	}
	resolveKind(e) {
		return typeof e === "number" ? e : -1;
	}
	located(e) {
		for (const t of this.cells_.values()) {
			if (t.source !== e.source) continue;
			const n = t.plants.get(e.key);
			if (n) return {
				cell: t,
				entry: n,
				kind: n.kind
			};
		}
		return null;
	}
	changeFor(e, t, n) {
		const r = X(e.source, t);
		let i = this.changes_.get(r);
		if (!i) {
			const t = e.kinds[n]?.interaction;
			i = {
				state: "standing",
				shownAs: n,
				health: t?.health ?? 0,
				yields: t?.yields ?? 0,
				regrowAt: 0
			};
			this.changes_.set(r, i);
		}
		return i;
	}
	refOf(e, t, n) {
		const r = this.cellAt(e);
		const i = this.changes_.get(X(e.source, t));
		const a = e.kinds[n.kind]?.interaction;
		return {
			source: e.source,
			key: t,
			kind: i && i.state !== "standing" ? i.shownAs : n.kind,
			x: (r?.x ?? 0) + n.plant.x,
			y: (r?.y ?? 0) + n.plant.y,
			z: (r?.z ?? 0) + n.plant.z,
			scale: n.plant.scale,
			state: i?.state ?? "standing",
			health: i ? i.health : a?.health ?? 0,
			yields: i ? i.yields : a?.yields ?? 0,
			entity: this.active_.get(X(e.source, t))?.proxy ?? null
		};
	}
	emit(e, t) {
		for (const n of this.listeners_) try {
			n({
				type: e,
				plant: t
			});
		} catch (t) {
			d.error("foliage", `a plant ${e} listener failed`, t);
		}
	}
};
/** The resource plants are touched through. @experimental */
const Q = l(new Z(), "PlantInteraction");
/** The App's plant interaction, installed (with its system) the first time a kind wants it. */
function ae(e) {
	if (!e.hasResource(Q)) {
		const t = new Z();
		t.app_ = e;
		e.insertResource(Q, t);
		H(e).observer_ = t;
		e.addSystemToSchedule(3, i([u(c)], (e) => {
			t.step(e.delta);
		}, { name: "PlantInteractionSystem" }));
	}
	return e.getResource(Q);
}
//#endregion
//#region src/render/lodDistance.ts
/**
* @file    lodDistance.ts
* @brief   A rule that says a distance, as the screen size a LODGroup is told.
*
* @details A LODGroup's thresholds are fractions of the screen's height, measured
*          on the bounding sphere of the geometry it actually draws. A rule a
*          person writes is a distance — "draw this out to 600 m" — so something
*          turns one into the other, and it has to use the sphere the engine will
*          measure: the half-diagonal of the box that holds every level of the
*          group (`lod::boundingSphere` over `gatherLodLevels`).
*
*          A guessed radius is how a chunk comes to vanish in front of the player.
*          A chunk of a world is as big as what stands in it: a 192 m square with
*          one group of rocks in a corner has a sphere of a few metres, and a
*          threshold worked out for the square's own diagonal culled it at a few
*          percent of the distance its rule named.
*/
/** The field of view the distances are meant in. A narrower one draws further, as a zoom should. */
const oe = 60;
const se = Math.tan(60 / 2 * Math.PI / 180);
/**
* The radius the engine measures a LODGroup by: the half-diagonal of the one box
* that holds every level's geometry. Zero when no level is given.
*/
function ce(e) {
	const t = [
		Infinity,
		Infinity,
		Infinity
	], n = [
		-Infinity,
		-Infinity,
		-Infinity
	];
	let r = false;
	for (const i of e) {
		if (!i) continue;
		r = true;
		for (let e = 0; e < 3; e++) {
			t[e] = Math.min(t[e], i.aabbMin[e]);
			n[e] = Math.max(n[e], i.aabbMax[e]);
		}
	}
	if (!r) return 0;
	return Math.hypot(n[0] - t[0], n[1] - t[1], n[2] - t[2]) / 2;
}
/**
* The share of the screen's height a sphere of `radius` covers with its centre
* `distance` away, in the reference view: the LODGroup threshold that falls at
* that distance. A level takes over, or the group is culled, once the sphere is
* smaller than its threshold — that is, further than `distance`.
*/
function $(e, t) {
	return e / (Math.max(1, t) * se);
}
/**
* The cull threshold that keeps a group drawn while any of its sphere is within
* `distance`: the centre may be a radius further than the part nearest the eye.
*/
function le(e, t) {
	return $(e, t + e);
}
//#endregion
export { I as S, M as _, Z as a, w as b, ae as c, H as d, R as f, te as g, ee as h, U as i, B as l, re as m, $ as n, Q as o, z as p, ce as r, W as s, le as t, V as u, F as v, P as x, C as y };

//# sourceMappingURL=lodDistance.js.map