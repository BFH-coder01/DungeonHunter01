import { E as e, T as t } from "./terrainPlugin.js";
//#region src/terrain/sphere.ts
/**
* @file    sphere.ts
* @brief   Ground on a sphere: which squares of a cube's faces to draw, and where a square's point stands on the planet.
*
* @details A planet is a cube whose six faces are each a quadtree, with every point pushed out onto the sphere: a node is a square of a face
*          (`level`, `ix`, `iz`), drawn with the same patch as flat ground, and its points are cut by distance exactly as the flat quadtree's
*          are (quadtree.ts), only the distance is to the node's bounding sphere and the top of the tree is six faces round the planet's centre.
*
*          A face is (u, v) in -1 to 1. The point on the cube is `normal + tan(u * PI / 4) * a + tan(v * PI / 4) * b`, normalised: the tangent
*          spreads the squares evenly by angle, so a node's size on the ground varies by a third from the middle of a face to its corner and not
*          by two; it is closed in both directions (`direction` and `faceOf`), which is what lets a point be named by the face it is on.
*
*          Nothing here touches a renderer or a terrain: positions are in the planet's own space, its centre the origin and its radius `radius`.
*/
/** The six faces of the cube: the outward normal, and the directions u and v grow along. Each is a right-handed frame (a x b = normal). */
const n = [
	{
		normal: [
			1,
			0,
			0
		],
		a: [
			0,
			0,
			-1
		],
		b: [
			0,
			1,
			0
		]
	},
	{
		normal: [
			-1,
			0,
			0
		],
		a: [
			0,
			0,
			1
		],
		b: [
			0,
			1,
			0
		]
	},
	{
		normal: [
			0,
			1,
			0
		],
		a: [
			1,
			0,
			0
		],
		b: [
			0,
			0,
			-1
		]
	},
	{
		normal: [
			0,
			-1,
			0
		],
		a: [
			1,
			0,
			0
		],
		b: [
			0,
			0,
			1
		]
	},
	{
		normal: [
			0,
			0,
			1
		],
		a: [
			1,
			0,
			0
		],
		b: [
			0,
			1,
			0
		]
	},
	{
		normal: [
			0,
			0,
			-1
		],
		a: [
			-1,
			0,
			0
		],
		b: [
			0,
			1,
			0
		]
	}
];
const r = Math.PI / 4;
/** The unit direction from the planet's centre to the point (u, v) of a face. */
function i(e, t, i, a = [
	0,
	0,
	0
]) {
	const o = n[e];
	const s = Math.tan(t * r), c = Math.tan(i * r);
	const l = o.normal[0] + s * o.a[0] + c * o.b[0];
	const u = o.normal[1] + s * o.a[1] + c * o.b[1];
	const d = o.normal[2] + s * o.a[2] + c * o.b[2];
	const f = Math.hypot(l, u, d);
	a[0] = l / f;
	a[1] = u / f;
	a[2] = d / f;
	return a;
}
/** The face a direction falls on and where on it: the inverse of `direction`. */
function a(e, t, i) {
	const a = Math.abs(e), o = Math.abs(t), s = Math.abs(i);
	let c;
	if (a >= o && a >= s) c = e >= 0 ? 0 : 1;
	else if (o >= s) c = t >= 0 ? 2 : 3;
	else c = i >= 0 ? 4 : 5;
	const l = n[c];
	const u = e * l.normal[0] + t * l.normal[1] + i * l.normal[2];
	const d = e * l.a[0] + t * l.a[1] + i * l.a[2];
	const f = e * l.b[0] + t * l.b[1] + i * l.b[2];
	return {
		face: c,
		u: Math.atan(d / u) / r,
		v: Math.atan(f / u) / r
	};
}
/** Where a direction falls on a given face's plane, in the face's units (beyond -1 to 1 past its edge); null for a direction that does not face it. */
function o(e, t, i, a) {
	const o = n[e];
	const s = t * o.normal[0] + i * o.normal[1] + a * o.normal[2];
	if (s <= 1e-6) return null;
	const c = t * o.a[0] + i * o.a[1] + a * o.a[2];
	const l = t * o.b[0] + i * o.b[1] + a * o.b[2];
	return {
		u: Math.atan(c / s) / r,
		v: Math.atan(l / s) / r
	};
}
/** The side of a node of `level` on its face, in the face's -1 to 1 units. */
const s = (e, t) => 2 / 2 ** (e - 1 - t);
/** How many levels a planet needs so that the finest node is about `leafSize` metres a side (to the nearest power of two): the top level's node is a whole face. */
function c(e, t) {
	return Math.max(1, Math.round(Math.log2(Math.max(e * Math.PI / 2 / Math.max(t, 1e-6), 1))) + 1);
}
/** The corner of a node, in its face's units: u0, v0 and the span. */
function l(e, t) {
	const n = s(e, t.level);
	return {
		u0: -1 + t.ix * n,
		v0: -1 + t.iz * n,
		span: n
	};
}
/** The point of a node on the planet at (s, t) in 0 to 1 across it, at `height` above the radius, in the planet's space. */
function u(e, t, n, r, a, o, s = [
	0,
	0,
	0
]) {
	const { u0: c, v0: u, span: d } = l(t, n);
	i(n.face, c + r * d, u + a * d, s);
	const f = e.radius + o;
	s[0] *= f;
	s[1] *= f;
	s[2] *= f;
	return s;
}
/**
* A sphere that holds every point of the node whatever the ground's height is: centred on the node's middle at the middle of the height range,
* as far across as the node's corners and the full height range between them.
*/
function d(e, t, n) {
	const r = (e.minHeight + e.maxHeight) / 2, i = (e.maxHeight - e.minHeight) / 2;
	const a = u(e, t, n, .5, .5, r);
	let o = 0;
	const s = [
		0,
		0,
		0
	];
	for (const [r, i] of [
		[0, 0],
		[1, 0],
		[0, 1],
		[1, 1]
	]) for (const c of [e.minHeight, e.maxHeight]) {
		u(e, t, n, r, i, c, s);
		o = Math.max(o, Math.hypot(s[0] - a[0], s[1] - a[1], s[2] - a[2]));
	}
	return {
		x: a[0],
		y: a[1],
		z: a[2],
		r: Math.max(o, i)
	};
}
/**
* How far the eye is from a node, measured on the shell of ground at the eye's own height (held to the ground's range): a node under the eye is at no
* distance however high or low the ground there turns out to be, as a flat node's box is for an eye between its least and most height. A bound that
* held the whole height range would be a few hundred metres across even for the finest node and split everything near it a level too far.
*/
function f(e, t, a, o, s, c) {
	const d = Math.hypot(o, s, c);
	const f = Math.min(Math.max(d - e.radius, e.minHeight), e.maxHeight);
	const p = n[a.face];
	const m = (o * p.normal[0] + s * p.normal[1] + c * p.normal[2]) / d;
	const h = [
		0,
		0,
		0
	];
	if (m > 1e-6) {
		const n = Math.atan((o * p.a[0] + s * p.a[1] + c * p.a[2]) / d / m) / r;
		const u = Math.atan((o * p.b[0] + s * p.b[1] + c * p.b[2]) / d / m) / r;
		const { u0: g, v0: _, span: v } = l(t, a);
		i(a.face, Math.min(Math.max(n, g), g + v), Math.min(Math.max(u, _), _ + v), h);
		const y = e.radius + f;
		return Math.hypot(o - h[0] * y, s - h[1] * y, c - h[2] * y);
	}
	const g = u(e, t, a, .5, .5, f);
	let _ = 0;
	for (const [n, r] of [
		[0, 0],
		[1, 0],
		[0, 1],
		[1, 1]
	]) {
		u(e, t, a, n, r, f, h);
		_ = Math.max(_, Math.hypot(h[0] - g[0], h[1] - g[1], h[2] - g[2]));
	}
	return Math.max(Math.hypot(o - g[0], s - g[1], c - g[2]) - _, 0);
}
/** The range of level `level`: where its nodes end and the next level's begin. */
const p = (e, t) => e.range0 * 2 ** t;
/**
* The nodes to draw for an eye at (ex, ey, ez) in the planet's space, coarse to fine. Every point of the planet is covered by exactly one node: a node
* nearer the eye than the level below's range is split into its four children, and the six faces' top nodes are where it begins.
*/
function m(e, t, n, r, i = c(e.radius, e.leafSize)) {
	const a = [];
	for (let o = 0; o < 6; o++) h(e, i, {
		face: o,
		level: i - 1,
		ix: 0,
		iz: 0
	}, t, n, r, a);
	return a;
}
function h(e, t, n, r, i, a, o) {
	if (n.level === 0 || f(e, t, n, r, i, a) > p(e, n.level - 1)) {
		o.push(n);
		return;
	}
	for (let s = 0; s < 2; s++) for (let c = 0; c < 2; c++) h(e, t, {
		face: n.face,
		level: n.level - 1,
		ix: n.ix * 2 + c,
		iz: n.iz * 2 + s
	}, r, i, a, o);
}
/** The node of `level` on `face` that holds (u, v). */
function g(e, t, n, r, i) {
	const a = 2 ** (e - 1 - n);
	const o = (e) => Math.min(Math.max(Math.floor((e + 1) / 2 * a), 0), a - 1);
	return {
		face: t,
		level: n,
		ix: o(r),
		iz: o(i)
	};
}
/** A key that names a node, for the pages and the children a terrain keeps by it. */
const _ = (e) => `${e.face}:${e.level}:${e.ix}:${e.iz}`;
//#endregion
//#region src/terrain/planetPages.ts
/**
* @file    planetPages.ts
* @brief   A planet node's page: its heights, normals and paint, sampled from a provider by direction.
*
* @details The same three images a flat node's page holds (pages.ts), laid out the same way so the one atlas and the one page table serve both: a
*          node's square of its face sampled `PAGE_TEXELS` times along each side with one more sample past each edge. What differs is the normal. Flat
*          ground has one up for every sample; here up is the direction from the planet's centre, so the normal is stored in the frame at its own
*          sample, x along the face's u direction made perpendicular to up, z along its v direction, y up; the shader builds the same frame from the
*          direction and the face and turns it back.
*/
/** The frame at a unit direction on a face: the face's u and v directions made perpendicular to it. */
function v(e, t, r, i) {
	const a = n[e];
	for (const [e, n] of [[a.a, r], [a.b, i]]) {
		const r = e[0] * t[0] + e[1] * t[1] + e[2] * t[2];
		const i = e[0] - t[0] * r, a = e[1] - t[1] * r, o = e[2] - t[2] * r;
		const s = Math.hypot(i, a, o) || 1;
		n[0] = i / s;
		n[1] = a / s;
		n[2] = o / s;
	}
}
/** Samples a node's page: the grid's directions go to the provider, and what comes back is encoded. May answer later, as the provider may. */
function y(e, t) {
	const n = 67;
	const { u0: r, v0: a, span: o } = l(e.levels, t);
	const s = o / 64;
	const c = new Float32Array(n * n * 3);
	const u = [
		0,
		0,
		0
	];
	for (let e = 0; e < n; e++) for (let o = 0; o < n; o++) {
		i(t.face, r + (o - 1) * s, a + (e - 1) * s, u);
		const l = (e * n + o) * 3;
		c[l] = u[0];
		c[l + 1] = u[1];
		c[l + 2] = u[2];
	}
	const d = e.provider.sample({
		world: e.world,
		seed: e.seed,
		version: e.version,
		radius: e.radius,
		directions: c,
		count: n * n
	});
	return d instanceof Promise ? d.then((n) => b(e, t, c, n.heights, n.paint)) : b(e, t, c, d.heights, d.paint);
}
function b(e, t, n, r, i) {
	const a = 67;
	let o = Infinity, s = -Infinity;
	for (let e = 1; e <= a - 2; e++) for (let t = 1; t <= a - 2; t++) {
		const n = r[e * a + t];
		o = Math.min(o, n);
		s = Math.max(s, n);
	}
	const c = Math.max(e.maxHeight - e.minHeight, 1e-6);
	const l = new Uint8Array(a * a * 4), u = new Uint8Array(a * a * 4), d = new Uint8Array(a * a * 4);
	const f = (t, i, o) => {
		const s = Math.min(Math.max(t, 0), a - 1), c = Math.min(Math.max(i, 0), a - 1) * a + s, l = e.radius + r[c];
		o[0] = n[c * 3] * l;
		o[1] = n[c * 3 + 1] * l;
		o[2] = n[c * 3 + 2] * l;
	};
	const p = [
		0,
		0,
		0
	], m = [
		0,
		0,
		0
	], h = [
		0,
		0,
		0
	], g = [
		0,
		0,
		0
	];
	const _ = [
		0,
		0,
		0
	], y = [
		0,
		0,
		0
	];
	const b = e.paint?.() ?? null;
	const x = b ? S(b, n, i) : null;
	for (let o = 0; o < a; o++) for (let s = 0; s < a; s++) {
		const d = o * a + s;
		const b = Math.round(Math.min(Math.max((r[d] - e.minHeight) / c, 0), 1) * 65535);
		f(s - 1, o, p);
		f(s + 1, o, m);
		f(s, o - 1, h);
		f(s, o + 1, g);
		const S = [
			m[0] - p[0],
			m[1] - p[1],
			m[2] - p[2]
		], C = [
			g[0] - h[0],
			g[1] - h[1],
			g[2] - h[2]
		];
		let w = S[1] * C[2] - S[2] * C[1], T = S[2] * C[0] - S[0] * C[2], E = S[0] * C[1] - S[1] * C[0];
		const D = [
			n[d * 3],
			n[d * 3 + 1],
			n[d * 3 + 2]
		];
		let O = Math.hypot(w, T, E) || 1;
		w /= O;
		T /= O;
		E /= O;
		if (w * D[0] + T * D[1] + E * D[2] < 0) {
			w = -w;
			T = -T;
			E = -E;
		}
		v(t.face, D, _, y);
		const k = w * _[0] + T * _[1] + E * _[2], A = w * y[0] + T * y[1] + E * y[2];
		const j = w * D[0] + T * D[1] + E * D[2];
		O = Math.hypot(k, j, A) || 1;
		l[d * 4] = b >> 8;
		l[d * 4 + 1] = b & 255;
		l[d * 4 + 2] = Math.round((k / O * .5 + .5) * 255);
		l[d * 4 + 3] = Math.round((A / O * .5 + .5) * 255);
		let M = 0, N = 0, P = 0, F = 0;
		if (x) {
			const e = x(s, o);
			M = e[0];
			N = e[1];
			P = e[2];
			F = e[3];
		} else if (i) {
			M = i[d * 4];
			N = i[d * 4 + 1];
			P = i[d * 4 + 2];
			F = i[d * 4 + 3];
		} else {
			const e = Math.min(Math.max((.9 - j / O) * 6, 0), 1);
			M = 1 - e;
			F = e;
		}
		u[d * 4] = Math.round(Math.min(Math.max(M, 0), 1) * 255);
		u[d * 4 + 1] = Math.round(Math.min(Math.max(N, 0), 1) * 255);
		u[d * 4 + 2] = Math.round(Math.min(Math.max(P, 0), 1) * 255);
		u[d * 4 + 3] = Math.round(Math.min(Math.max(F, 0), 1) * 255);
	}
	return {
		heights: l,
		paint: u,
		paint2: d,
		min: Number.isFinite(o) ? o : e.minHeight,
		max: Number.isFinite(s) ? s : e.maxHeight
	};
}
/** How many samples apart a painter is asked: it paints as a biome does, over many metres, and is read at every few texels and filtered between. */
const x = 8;
/**
* The page's paint from a painter asked every PAINT_STRIDE samples (from the first sample inside the page, so two pages that share an edge ask the same
* places there and agree on it), filtered between. A sample outside the lattice takes the nearest.
*/
function S(e, t, n) {
	const r = 67;
	const i = Math.floor((r - 3) / x) + 1;
	const a = new Array(i * i);
	for (let o = 0; o < i; o++) for (let s = 0; s < i; s++) {
		const c = 1 + s * x, l = (1 + o * x) * r + c;
		const u = n ? [
			n[l * 4],
			n[l * 4 + 1],
			n[l * 4 + 2],
			n[l * 4 + 3]
		] : [
			1,
			0,
			0,
			0
		];
		const d = e(t[l * 3], t[l * 3 + 1], t[l * 3 + 2], u);
		a[o * i + s] = [
			d[0] ?? 0,
			d[1] ?? 0,
			d[2] ?? 0,
			d[3] ?? 0
		];
	}
	return (e, t) => {
		const n = Math.min(Math.max((e - 1) / x, 0), i - 1), r = Math.min(Math.max((t - 1) / x, 0), i - 1);
		const o = Math.min(Math.floor(n), i - 2), s = Math.min(Math.floor(r), i - 2);
		const c = n - o, l = r - s;
		const u = a[s * i + o], d = a[s * i + o + 1], f = a[(s + 1) * i + o], p = a[(s + 1) * i + o + 1];
		const m = [
			0,
			0,
			0,
			0
		];
		for (let e = 0; e < 4; e++) m[e] = (u[e] * (1 - c) + d[e] * c) * (1 - l) + (f[e] * (1 - c) + p[e] * c) * l;
		return m;
	};
}
//#endregion
export { a, g as c, u as d, l as f, p as g, _ as h, i, d as l, m, v as n, o, s as p, n as r, c as s, y as t, f as u };

//# sourceMappingURL=planetPages.js.map