import { $t as e, Ct as t, Nt as n, R as r, c as i, ft as a, n as o, qt as s } from "./system.js";
import { i as c, s as l, t as u } from "./resource.js";
import { s as d } from "./logger.js";
import { n as f, yt as p } from "./AssetPlugin.js";
import { n as m } from "./disposeAll.js";
import { n as h } from "./wasmScratch.js";
import { s as g } from "./env.js";
import { m as _, r as v } from "./scene.js";
import { n as y, r as b, t as x } from "./material.js";
import { r as S } from "./PhysicsComponents.js";
import { n as C, r as w, s as T } from "./meshFormat.js";
import { n as E, t as D } from "./splineComponent.js";
//#region src/render/blobShadow.ts
/**
* Puts a soft shadow disc on the ground under the entity.
* @experimental
*/
const O = e("BlobShadow", {
	enabled: true,
	radius: 50,
	opacity: .5,
	softness: .6,
	groundY: 0,
	fadeHeight: 200,
	shrink: .5,
	lift: .5
}, { fields: {
	radius: {
		min: 0,
		step: 1,
		tooltip: "Radius of the disc on the ground, in world units."
	},
	opacity: {
		min: 0,
		max: 1,
		step: .01,
		tooltip: "How dark the disc is at its centre."
	},
	softness: {
		min: 0,
		max: 1,
		step: .01,
		tooltip: "How soft its edge is (0 hard, 1 fading from the centre)."
	},
	groundY: {
		step: 1,
		tooltip: "Height of the flat ground. A ground function set from code overrides it."
	},
	fadeHeight: {
		min: 0,
		step: 1,
		tooltip: "Height above the ground at which the shadow is gone (0 never fades it)."
	},
	shrink: {
		min: 0,
		max: 1,
		step: .01,
		tooltip: "How small the disc gets at that height (0 keeps its size)."
	},
	lift: {
		min: 0,
		step: .1,
		advanced: true,
		tooltip: "How far above the ground the disc is drawn."
	}
} });
const k = l({ sample: null }, "BlobShadowGround");
/** Sets how the ground height is found under each blob shadow; `null` goes back to each shadow's own `groundY`. @experimental */
function ee(e, t) {
	if (!e.hasResource(k)) e.insertResource(k, { sample: t });
	else e.getResource(k).sample = t;
}
const A = 8;
const j = 28;
/**
* A unit disc lying in the XZ plane (normal up), its vertex colour black and its alpha falling from the centre to the edge as `softness` says.
* A resident mesh and not a MeshRenderer's inline geometry: the inline path is drawn in the XY plane only (it turns about Z and no other axis),
* and a shadow lies on the ground.
* @experimental
*/
function te(e) {
	const t = (1 - Math.min(Math.max(e, 0), 1)) * .96;
	const { channels: n, vertexStride: r } = T([
		{
			semantic: C.Position,
			components: 3,
			type: w.Float32
		},
		{
			semantic: C.TexCoord0,
			components: 2,
			type: w.Float32
		},
		{
			semantic: C.Color,
			components: 4,
			type: w.UNorm8
		},
		{
			semantic: C.Normal,
			components: 3,
			type: w.Float32
		}
	]);
	const [i, a, o, s] = n.map((e) => e.offset);
	const c = 225;
	const l = new Uint8Array(c * r);
	const u = new DataView(l.buffer);
	const d = (e, t, n, c) => {
		const l = e * r;
		u.setFloat32(l + i, t, true);
		u.setFloat32(l + i + 4, 0, true);
		u.setFloat32(l + i + 8, n, true);
		u.setFloat32(l + a, t * .5 + .5, true);
		u.setFloat32(l + a + 4, n * .5 + .5, true);
		u.setUint8(l + o, 0);
		u.setUint8(l + o + 1, 0);
		u.setUint8(l + o + 2, 0);
		u.setUint8(l + o + 3, Math.round(c * 255));
		u.setFloat32(l + s, 0, true);
		u.setFloat32(l + s + 4, 1, true);
		u.setFloat32(l + s + 8, 0, true);
	};
	d(0, 0, 0, 1);
	for (let e = 1; e <= A; e++) {
		const n = e / A;
		const r = Math.min(Math.max((n - t) / Math.max(1 - t, .001), 0), 1);
		const i = 1 - r * r * (3 - 2 * r);
		for (let t = 0; t < j; t++) {
			const r = t / j * Math.PI * 2;
			d(1 + (e - 1) * j + t, Math.cos(r) * n, Math.sin(r) * n, i);
		}
	}
	const f = [];
	for (let e = 0; e < j; e++) f.push(0, 1 + (e + 1) % j, 1 + e);
	for (let e = 1; e < A; e++) {
		const t = 1 + (e - 1) * j, n = 1 + e * j;
		for (let e = 0; e < j; e++) {
			const r = (e + 1) % j;
			f.push(t + e, t + r, n + r, t + e, n + r, n + e);
		}
	}
	return {
		channels: n,
		vertexStride: r,
		vertexCount: c,
		vertices: l,
		indices: new Uint32Array(f),
		aabbMin: [
			-1,
			-.01,
			-1
		],
		aabbMax: [
			1,
			.01,
			1
		]
	};
}
/** The alpha at a vertex of a blob mesh, 0 to 1. @experimental */
function ne(e, t) {
	const n = e.channels.find((e) => e.semantic === C.Color);
	return e.vertices[t * e.vertexStride + n.offset + 3] / 255;
}
/** Installs the system that keeps each blob shadow on the ground. Called once by the mesh renderer's plugin. */
function M(e) {
	const r = /* @__PURE__ */ new Map();
	const a = /* @__PURE__ */ new Map();
	const o = (t) => {
		const n = Math.round(Math.min(Math.max(t, 0), 1) * 10);
		let r = a.get(n);
		if (r === void 0) {
			r = e.getResource(f).createMesh(te(n / 10)) ?? 0;
			a.set(n, r);
		}
		return r;
	};
	let c = 0;
	let l = false;
	const u = () => {
		if (c || l) return c;
		l = true;
		(async () => {
			try {
				const t = (await e.getResource(f).load("material-shader", "builtin:matcap")).compile([]);
				c = b.createFromAsset({
					version: "1.0",
					type: "material",
					shader: "builtin:matcap",
					blendMode: 0,
					depthTest: true,
					depthWrite: false,
					cull: 0,
					properties: { u_matcapStrength: 0 }
				}, t);
			} catch (e) {
				d.warn("render", "blob shadow material failed", e);
			} finally {
				l = false;
			}
		})();
		return c;
	};
	const m = (t) => {
		const n = r.get(t);
		if (!n) return;
		r.delete(t);
		if (e.world.valid(n.entity)) e.world.despawn(n.entity);
	};
	const h = e.world.onDespawn((e) => m(e));
	const g = (n) => {
		if (!n?.shown) return;
		e.world.insert(n.entity, t, {
			...n.mesh,
			enabled: false
		});
		n.shown = false;
	};
	const _ = i([], () => {
		const i = e.world;
		const a = i.getEntitiesWithComponents([O, s]);
		for (const e of [...r.keys()]) if (!i.valid(e) || !i.has(e, O)) m(e);
		if (a.length === 0) return;
		const c = u();
		if (!c) return;
		const l = i.getCppRegistry();
		if (l) p.updateTransforms({ _cpp: l });
		const d = e.hasResource(k) ? e.getResource(k).sample : null;
		for (const e of a) {
			const a = i.get(e, O);
			let l = r.get(e);
			if (!a.enabled || a.radius <= 0 || a.opacity <= 0) {
				g(l);
				continue;
			}
			const u = i.get(e, s).worldPosition;
			const f = d?.(u.x, u.z) ?? a.groundY;
			const p = Math.max(u.y - f, 0);
			const m = a.fadeHeight > 0 ? Math.min(Math.max(1 - p / a.fadeHeight, 0), 1) : 1;
			if (m <= 0) {
				g(l);
				continue;
			}
			if (!l) {
				const u = i.spawn("BlobShadow");
				i.insert(u, n);
				i.insert(u, s, {});
				const d = {
					mesh: o(a.softness),
					material: c,
					lit: false,
					opaque: false,
					castShadows: false,
					enabled: true
				};
				i.insert(u, t, d);
				l = {
					entity: u,
					softness: a.softness,
					shown: true,
					mesh: d
				};
				r.set(e, l);
			} else if (l.softness !== a.softness) {
				l.mesh = {
					...l.mesh,
					mesh: o(a.softness)
				};
				l.softness = a.softness;
			}
			const h = a.radius * (1 - a.shrink * (1 - m));
			i.insert(l.entity, s, {
				position: {
					x: u.x,
					y: f + a.lift,
					z: u.z
				},
				scale: {
					x: h,
					y: 1,
					z: h
				}
			});
			i.insert(l.entity, t, {
				...l.mesh,
				enabled: true,
				color: {
					r: 1,
					g: 1,
					b: 1,
					a: a.opacity * m
				}
			});
			l.shown = true;
		}
	}, { name: "BlobShadowSystem" });
	e.addSystemToSchedule(4, _);
	return () => {
		h();
		for (const e of [...r.keys()]) m(e);
		if (e.hasResource(f)) {
			for (const t of a.values()) if (t) e.getResource(f).releaseBuiltMesh(t);
		}
		a.clear();
	};
}
//#endregion
//#region src/render/meshRenderer.ts
function N(e, t) {
	const n = (e) => Math.max(0, Math.min(255, Math.round(e * 255)));
	return (n(e[t * 4 + 0] ?? 1) | n(e[t * 4 + 1] ?? 1) << 8 | n(e[t * 4 + 2] ?? 1) << 16 | n(e[t * 4 + 3] ?? 1) << 24) >>> 0;
}
/** The inline vertices are the codec's, not a field's — known before the plugin builds. */
const P = ["geometry"];
v("MeshRenderer", P);
var F = class {
	constructor(e, t) {
		this.module_ = e;
		this.registry_ = t;
		this.authored_ = /* @__PURE__ */ new Map();
	}
	/**
	* Upload geometry for an entity's MeshRenderer component. Positions are x,y pairs in
	* component-local space; uvs default to 0,0 (untextured meshes render vertex
	* colors on the white texture); colors are r,g,b,a floats per vertex.
	*/
	setGeometry(e, t) {
		const n = this.module_;
		const r = n.meshRenderer_setGeometry;
		if (!r || !n._malloc || !n._free || !n.HEAPU8) return;
		const i = n.HEAPU8;
		const a = {
			_malloc: n._malloc,
			_free: n._free
		};
		const o = Math.floor(t.positions.length / 2);
		const s = t.indices.length;
		if (o === 0 || s === 0) {
			this.clearGeometry(e);
			return;
		}
		h(a, (n) => {
			const a = n(o * 4 * 4);
			const c = new Float32Array(i.buffer, a, o * 4);
			const l = t.uvs;
			for (let e = 0; e < o; e++) {
				c[e * 4 + 0] = t.positions[e * 2 + 0] ?? 0;
				c[e * 4 + 1] = t.positions[e * 2 + 1] ?? 0;
				c[e * 4 + 2] = l?.[e * 2 + 0] ?? 0;
				c[e * 4 + 3] = l?.[e * 2 + 1] ?? 0;
			}
			let u = 0;
			const d = t.colors;
			if (d && d.length > 0) {
				u = n(o * 4);
				const e = new Uint32Array(i.buffer, u, o);
				for (let t = 0; t < o; t++) e[t] = N(d, t);
			}
			const f = n(s * 4);
			new Uint32Array(i.buffer, f, s).set(t.indices);
			r(this.registry_, e, a, o, u, f, s);
		});
		this.authored_.set(e, t);
	}
	/** Clear an entity's mesh geometry (a valid state: the mesh renders nothing). */
	clearGeometry(e) {
		this.module_.meshRenderer_setGeometry?.(this.registry_, e, 0, 0, 0, 0, 0);
		this.authored_.delete(e);
	}
	/** The last geometry uploaded for this entity (scene-export source). */
	getGeometry(e) {
		return this.authored_.get(e);
	}
};
const I = l(null, "MeshRenderers");
var L = class {
	constructor() {
		this.name = "meshRenderer";
		this.profileDomain = "render";
		this.offDespawn_ = null;
		this.offBlobShadows_ = null;
	}
	build(e) {
		const t = r(e) ?? {};
		const n = e.world.getCppRegistry();
		const i = new F(t, n);
		e.insertResource(I, i);
		this.offBlobShadows_ = M(e);
		this.offDespawn_ = e.world.onDespawn((e) => {
			if (i.getGeometry(e)) i.clearGeometry(e);
		});
		_("MeshRenderer", {
			outOfBandFields: P,
			importData: (e, t) => {
				const n = t.geometry;
				if (n && n.positions?.length && n.indices?.length) i.setGeometry(e, n);
				else i.clearGeometry(e);
			},
			exportData: (e, t) => {
				const n = i.getGeometry(e);
				if (n) t.geometry = n;
			}
		});
	}
	cleanup() {
		this.offBlobShadows_?.();
		this.offBlobShadows_ = null;
		this.offDespawn_?.();
		this.offDespawn_ = null;
	}
};
const re = new L();
//#endregion
//#region src/render/vectorPath.ts
const R = 1e-6;
const ie = () => ({
	positions: [],
	colors: [],
	indices: []
});
function z(e, t, n, r, i = 1) {
	e.positions.push(t, n);
	e.colors.push(r[0], r[1], r[2], r[3] * i);
	return e.positions.length / 2 - 1;
}
const B = (e, t, n, r) => {
	e.indices.push(t, n, r);
};
/** Consecutive points nearer than this are one point. */
function V(e, t) {
	const n = [];
	for (const t of e) {
		const e = n[n.length - 1];
		if (!e || Math.hypot(t.x - e.x, t.y - e.y) > R) n.push({
			x: t.x,
			y: t.y
		});
	}
	if (t && n.length > 1) {
		const e = n[0];
		const t = n[n.length - 1];
		if (Math.hypot(e.x - t.x, e.y - t.y) <= R) n.pop();
	}
	return n;
}
const H = (e) => {
	let t = 0;
	for (let n = 0; n < e.length; n++) {
		const r = e[n];
		const i = e[(n + 1) % e.length];
		t += r.x * i.y - i.x * r.y;
	}
	return t / 2;
};
const U = (e, t, n, r) => e * r - t * n;
function W(e, t, n, r) {
	const i = U(t.x - e.x, t.y - e.y, n.x - e.x, n.y - e.y);
	const a = U(t.x - e.x, t.y - e.y, r.x - e.x, r.y - e.y);
	const o = U(r.x - n.x, r.y - n.y, e.x - n.x, e.y - n.y);
	const s = U(r.x - n.x, r.y - n.y, t.x - n.x, t.y - n.y);
	return (i > R && a < -1e-6 || i < -1e-6 && a > R) && (o > R && s < -1e-6 || o < -1e-6 && s > R);
}
/**
* Joins each hole to the outline by a bridge (the shortest segment from a hole's point to the ring that crosses no edge), so the ring and its
* holes are one ring that visits the bridge twice. Both are made counter-clockwise (outline) and clockwise (holes) first.
*/
function ae(e, t) {
	let n = e.slice();
	const r = t.map((e) => V(e, true)).filter((e) => e.length >= 3).map((e) => H(e) > 0 ? e.slice().reverse() : e).sort((e, t) => Math.max(...t.map((e) => e.x)) - Math.max(...e.map((e) => e.x)));
	for (const e of r) {
		let t = null;
		for (let i = 0; i < e.length; i++) for (let a = 0; a < n.length; a++) {
			const o = Math.hypot(e[i].x - n[a].x, e[i].y - n[a].y);
			if (t && o >= t.d) continue;
			if (oe(n, r, e[i], n[a])) continue;
			t = {
				r: a,
				h: i,
				d: o
			};
		}
		if (!t) continue;
		const i = [];
		for (let e = 0; e <= t.r; e++) i.push(n[e]);
		for (let n = 0; n <= e.length; n++) i.push(e[(t.h + n) % e.length]);
		i.push(n[t.r]);
		for (let e = t.r + 1; e < n.length; e++) i.push(n[e]);
		n = i;
	}
	return n;
}
function oe(e, t, n, r) {
	const i = (e) => {
		for (let t = 0; t < e.length; t++) if (W(n, r, e[t], e[(t + 1) % e.length])) return true;
		return false;
	};
	if (i(e)) return true;
	for (const e of t) if (i(e)) return true;
	return false;
}
function se(e, t, n, r) {
	const i = U(n.x - t.x, n.y - t.y, e.x - t.x, e.y - t.y);
	const a = U(r.x - n.x, r.y - n.y, e.x - n.x, e.y - n.y);
	const o = U(t.x - r.x, t.y - r.y, e.x - r.x, e.y - r.y);
	return i >= -1e-6 && a >= -1e-6 && o >= -1e-6;
}
/** Triangles (as indices into `ring`) covering a counter-clockwise ring, which may visit a point twice (a bridge). */
function G(e) {
	const t = e.length;
	const n = [];
	const r = [];
	for (let e = 0; e < t; e++) {
		n.push((e + 1) % t);
		r.push((e + t - 1) % t);
	}
	const i = [];
	let a = t;
	let o = 0;
	let s = 0;
	const c = (e, t) => Math.abs(e.x - t.x) <= R && Math.abs(e.y - t.y) <= R;
	while (a > 3 && s++ < t * t) {
		const t = r[o];
		const l = n[o];
		const u = e[t], d = e[o], f = e[l];
		let p = U(d.x - u.x, d.y - u.y, f.x - d.x, f.y - d.y) > R;
		if (p) for (let r = n[l]; r !== t; r = n[r]) {
			const t = e[r];
			if (c(t, u) || c(t, d) || c(t, f)) continue;
			if (se(t, u, d, f)) {
				p = false;
				break;
			}
		}
		if (p) {
			i.push(t, o, l);
			n[t] = l;
			r[l] = t;
			--a;
			o = l;
			s = 0;
		} else o = n[o];
	}
	if (a === 3) {
		const e = r[o];
		i.push(e, o, n[o]);
	} else if (a > 3) for (let e = n[o]; n[e] !== o; e = n[e]) i.push(o, e, n[e]);
	return i;
}
function K(e, t, n, r) {
	let i = V(t, true);
	if (i.length < 3) return;
	if (H(i) < 0) i = i.slice().reverse();
	const a = (n.holes ?? []).map((e) => V(e, true)).filter((e) => e.length >= 3);
	const o = a.length ? ae(i, a) : i;
	const s = e.positions.length / 2;
	for (const t of o) z(e, t.x, t.y, n.color);
	for (const t of G(o)) e.indices.push(s + t);
	if (r <= 0) return;
	q(e, i, n.color, r, 1);
	for (const t of a) q(e, H(t) > 0 ? t.slice().reverse() : t, n.color, r, -1);
}
/** A band of transparent-to-opaque quads along a counter-clockwise ring, `side` 1 outside it and -1 inside. */
function q(e, t, n, r, i) {
	const a = t.length;
	const o = [];
	const s = [];
	for (let c = 0; c < a; c++) {
		const l = t[c], u = t[(c + a - 1) % a], d = t[(c + 1) % a];
		const f = l.x - u.x, p = l.y - u.y, m = d.x - l.x, h = d.y - l.y;
		const g = Math.hypot(f, p) || 1, _ = Math.hypot(m, h) || 1;
		let v = p / g + h / _;
		let y = -(f / g) - m / _;
		const b = Math.hypot(v, y);
		if (b < R) {
			v = p / g;
			y = -f / g;
		} else {
			v /= b;
			y /= b;
		}
		const x = r / Math.max(v * (p / g) + y * (-f / g), .3) * i;
		o.push(z(e, l.x, l.y, n));
		s.push(z(e, l.x + v * x, l.y + y * x, n, 0));
	}
	for (let t = 0; t < a; t++) {
		const n = (t + 1) % a;
		B(e, o[t], s[t], s[n]);
		B(e, o[t], s[n], o[n]);
	}
}
function ce(e, t, n, r, i, a) {
	const o = V(t, r);
	const s = n.width / 2;
	if (o.length < 2 || s <= 0) return;
	const c = o.length;
	const l = n.join ?? "miter";
	const u = n.cap ?? "butt";
	const d = Math.max(n.miterLimit ?? 4, 1);
	const f = n.color;
	const p = r ? c : c - 1;
	const m = [], h = [], g = [];
	for (let e = 0; e < p; e++) {
		const t = o[e], n = o[(e + 1) % c];
		const r = Math.hypot(n.x - t.x, n.y - t.y);
		g.push(r);
		m.push((n.x - t.x) / r);
		h.push((n.y - t.y) / r);
	}
	const _ = new Array(c).fill(-1), v = new Array(c).fill(-1);
	const y = new Array(c).fill(-1), b = new Array(c).fill(-1);
	const x = [];
	const S = [];
	const C = (t, n, r, i, a) => {
		const o = z(e, n, r, f);
		t.push({
			index: o,
			x: n,
			y: r,
			ox: i,
			oy: a
		});
		return o;
	};
	for (let t = 0; t < c; t++) {
		const n = o[t];
		const i = r || t > 0;
		const f = r || t < c - 1;
		const w = i ? (t + p - 1) % p : -1;
		const T = f ? t % p : -1;
		if (!i || !f) {
			const e = f ? T : w;
			const r = m[e], i = h[e];
			const a = -i, o = r;
			const c = u === "square" ? s * (f ? -1 : 1) : 0;
			const l = n.x + r * c, d = n.y + i * c;
			const p = C(x, l + a * s, d + o * s, a, o);
			const g = C(S, l - a * s, d - o * s, -a, -o);
			_[t] = v[t] = p;
			y[t] = b[t] = g;
			continue;
		}
		const E = m[w], D = h[w], O = m[T], k = h[T];
		const ee = U(E, D, O, k);
		const A = -D, j = E, te = -k, ne = O;
		let M = A + te, N = j + ne;
		const P = Math.hypot(M, N);
		if (P < R) {
			M = A;
			N = j;
		} else {
			M /= P;
			N /= P;
		}
		const F = Math.max(M * A + N * j, .001);
		const I = Math.min(s / F, Math.max(Math.min(g[w], g[T]) / Math.max(Math.sqrt(1 - F * F) / F, .001), s));
		const L = ee > 0;
		const re = Math.abs(ee) < 1e-5 && E * O + D * k > 0;
		const ie = 1 / F;
		const z = re || l === "miter" && ie <= d;
		const V = L ? 1 : -1;
		const H = L ? x : S;
		const W = L ? S : x;
		const ae = L ? _ : y, oe = L ? v : b;
		const se = L ? y : _, G = L ? b : v;
		const K = C(H, n.x + V * M * I, n.y + V * N * I, V * M, V * N);
		ae[t] = oe[t] = K;
		if (z) {
			const e = s / F;
			const r = C(W, n.x - V * M * e, n.y - V * N * e, -V * M, -V * N);
			se[t] = G[t] = r;
			continue;
		}
		const q = -V * A, ce = -V * j, J = -V * te, Y = -V * ne;
		const X = C(W, n.x + q * s, n.y + ce * s, q, ce);
		se[t] = X;
		let Z = X;
		if (l === "round") {
			const t = Math.atan2(ce, q);
			let r = Math.atan2(Y, J) - t;
			while (r > Math.PI) r -= Math.PI * 2;
			while (r < -Math.PI) r += Math.PI * 2;
			const i = Math.max(1, Math.ceil(Math.abs(r) / a));
			let o = X;
			for (let a = 1; a < i; a++) {
				const c = t + r * a / i;
				const l = Math.cos(c), u = Math.sin(c);
				const d = C(W, n.x + l * s, n.y + u * s, l, u);
				B(e, K, o, d);
				o = d;
			}
			Z = C(W, n.x + J * s, n.y + Y * s, J, Y);
			B(e, K, o, Z);
		} else {
			Z = C(W, n.x + J * s, n.y + Y * s, J, Y);
			B(e, K, X, Z);
		}
		G[t] = Z;
	}
	for (let t = 0; t < p; t++) {
		const n = t, r = (t + 1) % c;
		const i = v[n], a = b[n], o = _[r], s = y[r];
		B(e, i, a, s);
		B(e, i, s, o);
	}
	if (!r && u === "round") {
		J(e, o[0], -m[0], -h[0], s, f, a, _[0], y[0]);
		J(e, o[c - 1], m[p - 1], h[p - 1], s, f, a, b[c - 1], v[c - 1]);
	}
	if (i > 0) {
		const t = (t) => {
			const n = [];
			for (const r of t) n.push(z(e, r.x + r.ox * i, r.y + r.oy * i, f, 0));
			for (let r = 0; r + 1 < t.length; r++) {
				B(e, t[r].index, n[r], n[r + 1]);
				B(e, t[r].index, n[r + 1], t[r + 1].index);
			}
			if (r && t.length > 2) {
				const r = t.length - 1;
				B(e, t[r].index, n[r], n[0]);
				B(e, t[r].index, n[0], t[0].index);
			}
		};
		t(x);
		t(S);
		if (!r) {
			if (u !== "round") for (const [t, n, r, a] of [[
				x[0],
				S[0],
				-m[0],
				-h[0]
			], [
				x[x.length - 1],
				S[S.length - 1],
				m[p - 1],
				h[p - 1]
			]]) {
				const o = z(e, t.x + r * i, t.y + a * i, f, 0);
				const s = z(e, n.x + r * i, n.y + a * i, f, 0);
				B(e, t.index, o, s);
				B(e, t.index, s, n.index);
			}
		}
	}
}
/** A half circle of `radius` at `center` bulging along (dirx, diry), between two outline points already placed. */
function J(e, t, n, r, i, a, o, s, c) {
	const l = Math.atan2(r, n) - Math.PI / 2;
	const u = Math.max(2, Math.ceil(Math.PI / o));
	const d = z(e, t.x, t.y, a);
	let f = s;
	for (let n = 1; n < u; n++) {
		const r = l + Math.PI * n / u;
		const o = z(e, t.x + Math.cos(r) * i, t.y + Math.sin(r) * i, a);
		B(e, d, f, o);
		f = o;
	}
	B(e, d, f, c);
}
/**
* The geometry of a path: its fill, then its stroke on top, as one mesh in the path's own coordinates.
* An empty result (fewer than the points a shape needs) is a mesh with nothing in it, which draws nothing.
* @experimental
*/
function Y(e, t) {
	const n = ie();
	const r = Math.max(t.feather ?? 0, 0);
	const i = Math.max(t.arcStep ?? .25, .05);
	const a = t.closed ?? false;
	if (t.fill) K(n, e, t.fill, r);
	if (t.stroke) ce(n, e, t.stroke, a, r, i);
	return {
		positions: n.positions,
		colors: n.colors,
		indices: n.indices
	};
}
/** The geometry of several paths drawn into one mesh, in order. */
function X(e) {
	const t = {
		positions: [],
		colors: [],
		indices: []
	};
	for (const n of e) {
		const e = t.positions.length / 2;
		for (const e of n.positions) t.positions.push(e);
		for (const e of n.colors ?? []) t.colors.push(e);
		for (const r of n.indices) t.indices.push(e + r);
	}
	return t;
}
/** A cubic Bezier curve as points, cut finely enough that no point is further than `tolerance` from the curve. @experimental */
function Z(e, t, n, r, i = .25) {
	const a = 3 * t.x - 2 * e.x - r.x, o = 3 * t.y - 2 * e.y - r.y;
	const s = 3 * n.x - 2 * r.x - e.x, c = 3 * n.y - 2 * r.y - e.y;
	const l = Math.sqrt(Math.max(a * a, s * s) + Math.max(o * o, c * c));
	const u = Math.min(Math.max(Math.ceil(Math.sqrt(l / (4 * Math.max(i, 1e-4)))), 1), 256);
	const d = [];
	for (let i = 0; i <= u; i++) {
		const a = i / u, o = 1 - a;
		d.push({
			x: o * o * o * e.x + 3 * o * o * a * t.x + 3 * o * a * a * n.x + a * a * a * r.x,
			y: o * o * o * e.y + 3 * o * o * a * t.y + 3 * o * a * a * n.y + a * a * a * r.y
		});
	}
	return d;
}
/** A quadratic Bezier curve as points. @experimental */
function le(e, t, n, r = .25) {
	return Z(e, {
		x: e.x + 2 / 3 * (t.x - e.x),
		y: e.y + 2 / 3 * (t.y - e.y)
	}, {
		x: n.x + 2 / 3 * (t.x - n.x),
		y: n.y + 2 / 3 * (t.y - n.y)
	}, n, r);
}
/** The points of a circle (or a slice of one: angles in radians, counter-clockwise from +x). @experimental */
function ue(e, t, n, r = 0, i = 0, a = Math.PI * 2) {
	const o = Math.abs(a - i) >= Math.PI * 2 - 1e-9;
	const s = r > 0 ? r : Math.max(Math.ceil(Math.abs(a - i) / Math.max(Math.acos(1 - .25 / Math.max(n, .25)) * 2, .05)), 8);
	const c = [];
	const l = o ? s : s + 1;
	for (let r = 0; r < l; r++) {
		const o = i + (a - i) * r / s;
		c.push({
			x: e + Math.cos(o) * n,
			y: t + Math.sin(o) * n
		});
	}
	return c;
}
/**
* The triangles (indices into `ring`) that cover a simple polygon, whichever way round it is given.
* @experimental
*/
function de(e) {
	if (e.length < 3) return [];
	if (H(e) >= 0) return G(e);
	const t = e.length;
	return G(e.slice().reverse()).map((e) => t - 1 - e);
}
//#endregion
//#region src/spline/terrainBand2D.ts
/**
* Ground along the `Spline` of the same entity, drawn by the entity's MeshRenderer.
*
* @experimental
*/
const fe = e("TerrainBand2D", {
	resolution: 16,
	depth: 200,
	tile: 128,
	edgeWidth: 12,
	edgeColor: {
		r: .35,
		g: .65,
		b: .2,
		a: 1
	},
	edgeTexture: 0,
	edgeTile: 64,
	collider: false
}, {
	assetFields: [{
		field: "edgeTexture",
		type: "texture"
	}],
	fields: {
		resolution: {
			min: 1,
			category: "Shape",
			tooltip: "How far apart, along the curve, the outline's points are. Smaller is smoother and costs more triangles."
		},
		depth: {
			min: 0,
			category: "Shape",
			tooltip: "How far below its lowest point an open spline's fill reaches. A closed spline ignores it."
		},
		tile: {
			min: 1,
			category: "Look",
			tooltip: "The length of one repeat of the fill's texture, in world units."
		},
		edgeWidth: {
			min: 0,
			category: "Look",
			tooltip: "How wide the lip along the surface is, drawn over the fill. 0 draws none."
		},
		edgeColor: {
			category: "Look",
			tooltip: "The lip's colour, multiplying the texture under it."
		},
		edgeTexture: {
			category: "Look",
			tooltip: "An image the lip is drawn with, repeating along the surface. None draws the lip as a flat colour."
		},
		edgeTile: {
			min: 1,
			category: "Look",
			tooltip: "The length of one repeat of the lip's image along the surface, in world units."
		},
		collider: {
			category: "Collision",
			tooltip: "Give this entity a chain collider along the surface. Add a static Rigidbody2D to make it solid."
		}
	}
});
const pe = (e) => [
	e.r,
	e.g,
	e.b,
	e.a
];
/** The points of the curve, a `step` apart. An open curve ends on its last point; a closed one is a ring with no repeat. */
function me(e, t) {
	const n = Math.max(e.closed ? 3 : 2, Math.ceil(e.length / Math.max(t, .001)) + (e.closed ? 0 : 1));
	const r = [];
	const i = e.closed ? n : n - 1;
	for (let t = 0; t < n; t++) {
		const n = e.position(t / i * e.length);
		r.push({
			x: n[0],
			y: n[1]
		});
	}
	return r;
}
const he = (e) => {
	let t = 0;
	for (let n = 0; n < e.length; n++) {
		const r = e[n], i = e[(n + 1) % e.length];
		t += r.x * i.y - i.x * r.y;
	}
	return t / 2;
};
/**
* The geometry of a band over `points`. Pure: the same inputs give the same mesh.
*
* @experimental
*/
function ge(e, t, n) {
	if (e.length < 2) return null;
	const r = new E(e, t);
	let i = me(r, n.resolution);
	const a = r.closed;
	if (a ? he(i) < 0 : i[i.length - 1].x < i[0].x) i = i.slice().reverse();
	const o = a ? i : (() => {
		const e = Math.min(...i.map((e) => e.y)) - Math.max(n.depth, 0);
		return [
			...i,
			{
				x: i[i.length - 1].x,
				y: e
			},
			{
				x: i[0].x,
				y: e
			}
		];
	})();
	const s = [], c = [], l = [], u = [];
	const d = Math.max(n.tile, .001);
	const f = (e, t, n) => {
		s.push(e, t);
		c.push(e / d, t / d);
		l.push(n[0], n[1], n[2], n[3]);
		return s.length / 2 - 1;
	};
	const p = [
		1,
		1,
		1,
		1
	];
	for (const e of o) f(e.x, e.y, p);
	for (const e of de(o)) u.push(e);
	let m = null;
	if (n.edgeWidth > 0) {
		const e = !!n.edgeTexture;
		const t = i.length;
		const r = pe(n.edgeColor);
		const o = [], s = [], c = [], l = [];
		const d = Math.max(n.edgeTile, .001);
		let p = 0;
		const h = [];
		for (let e = 0; e < t; e++) {
			const n = i[a ? (e + t - 1) % t : Math.max(e - 1, 0)];
			const r = i[a ? (e + 1) % t : Math.min(e + 1, t - 1)];
			const o = r.x - n.x, s = r.y - n.y, c = Math.hypot(o, s) || 1;
			h.push(a ? {
				x: -s / c,
				y: o / c
			} : {
				x: s / c,
				y: -o / c
			});
		}
		const g = [], _ = [];
		const v = (t, n, i) => {
			if (!e) return f(t, n, r);
			o.push(t, n);
			s.push(p / d, i);
			c.push(1, 1, 1, 1);
			return o.length / 2 - 1;
		};
		for (let e = 0; e < t; e++) {
			const t = i[e], r = h[e];
			if (e > 0) p += Math.hypot(t.x - i[e - 1].x, t.y - i[e - 1].y);
			g.push(v(t.x, t.y, 0));
			_.push(v(t.x + r.x * n.edgeWidth, t.y + r.y * n.edgeWidth, 1));
		}
		const y = e ? l : u;
		const b = a ? t : t - 1;
		for (let e = 0; e < b; e++) {
			const n = (e + 1) % t;
			if (a) y.push(g[e], _[e], _[n], g[e], _[n], g[n]);
			else y.push(g[e], _[n], g[n], g[e], _[e], _[n]);
		}
		if (e) m = {
			positions: o,
			uvs: s,
			colors: c,
			indices: l
		};
	}
	return {
		geometry: {
			positions: s,
			uvs: c,
			colors: l,
			indices: u
		},
		edge: m,
		outline: i,
		closed: a
	};
}
/** The pixels-per-unit physics measures a Transform's units in. */
function _e(e) {
	for (const t of e.world.getEntitiesWithComponents([a])) {
		const n = e.world.get(t, a).pixelsPerUnit;
		if (n) return n;
	}
	return 100;
}
/** Keeps every `TerrainBand2D`'s mesh and collider matching its spline. Called once by the spline plugin. */
function ve(e) {
	/** What each entity's mesh was last built from, and whether that left it any (an empty one is not worth looking for). */
	const n = /* @__PURE__ */ new Map();
	const r = /* @__PURE__ */ new Set();
	/** The entity that draws each band's lip when the lip has an image of its own. */
	const a = /* @__PURE__ */ new Map();
	e.world.onDespawn((t) => {
		n.delete(t);
		r.delete(t);
		const i = a.get(t);
		a.delete(t);
		if (i !== void 0 && e.world.valid(i)) e.world.despawn(i);
	});
	const o = (t) => {
		const n = a.get(t);
		if (n === void 0) return;
		a.delete(t);
		if (e.world.valid(n)) e.world.despawn(n);
	};
	e.addSystemToSchedule(3, i([], () => {
		const i = e.world;
		if (!e.hasResource(I)) return;
		const c = e.getResource(I);
		for (const l of i.getEntitiesWithComponents([fe, D])) {
			const u = i.get(l, fe);
			const d = i.get(l, D);
			const f = u.collider ? _e(e) : 0;
			const p = u.edgeTexture;
			const m = JSON.stringify([
				d.points,
				d.closed,
				u,
				f
			]);
			const h = n.get(l);
			if (h && h.key === m && (h.empty || c.getGeometry(l))) continue;
			const g = ge(d.points, d.closed, u);
			n.set(l, {
				key: m,
				empty: !g
			});
			if (!i.has(l, t)) i.insert(l, t, { enabled: true });
			if (g) c.setGeometry(l, g.geometry);
			else c.clearGeometry(l);
			if (g?.edge && p) {
				let e = a.get(l);
				if (e === void 0 || !i.valid(e)) {
					e = i.spawn("Edge");
					i.insert(e, s, {});
					i.setParent(e, l);
					a.set(l, e);
				}
				const n = i.get(l, t);
				i.insert(e, t, {
					enabled: true,
					texture: p,
					color: u.edgeColor,
					layer: (n.layer ?? 0) + 1
				});
				c.setGeometry(e, g.edge);
			} else o(l);
			if (u.collider && g && g.outline.length >= 4) {
				const e = g.outline.map((e) => ({
					x: e.x / f,
					y: e.y / f
				}));
				const t = i.has(l, S) ? i.get(l, S) : {};
				i.insert(l, S, {
					...t,
					points: e,
					isLoop: g.closed
				});
				r.add(l);
			} else if (r.has(l)) {
				i.remove(l, S);
				r.delete(l);
			}
		}
	}, { name: "TerrainBand2DSystem" }));
}
//#endregion
//#region src/spline/roadDecal.ts
/**
* Lays the entity's MeshRenderer along the `Spline` of the same entity and over the ground.
*
* @experimental
*/
const ye = e("RoadDecal", {
	step: 20,
	across: 4,
	widthScale: 1,
	lift: .5,
	edgeFade: .35,
	tile: 200
}, { fields: {
	step: {
		min: .01,
		unit: "wu",
		tooltip: "How far apart its rows are along the curve. Finer follows the ground and the bends more closely."
	},
	across: {
		min: 1,
		max: 32,
		step: 1,
		tooltip: "How many cells across. More follows a ground that crowns or slopes under the road."
	},
	widthScale: {
		min: 0,
		step: .01,
		tooltip: "Times the width each spline point says."
	},
	lift: {
		min: 0,
		step: .01,
		unit: "wu",
		tooltip: "How far above the ground it lies. Enough to win against the ground from as far as it is seen."
	},
	edgeFade: {
		min: 0,
		max: 1,
		step: .01,
		tooltip: "The share of its half width over which each edge fades into the ground."
	},
	tile: {
		min: .01,
		unit: "wu",
		tooltip: "The length of one repeat of its texture along the curve."
	}
} });
/**
* The strip's geometry, relative to `origin`. Null where it has nothing to lay. Positions lie on the ground where it answers and on the curve
* where it does not; texture v runs along the curve in world units over `tile`, and u across from 0 to 1.
*/
function be(e, t, n, r) {
	if (e.points.length < 2) return null;
	const i = new E(e.points, e.closed);
	if (!(i.length > .001)) return null;
	const a = Math.max(1, Math.min(4096, Math.ceil(i.length / Math.max(t.step, .001))));
	const o = Math.max(1, Math.min(32, Math.floor(t.across)));
	const s = Math.min(1, Math.max(0, t.edgeFade));
	const { channels: c, vertexStride: l } = T([
		{
			semantic: C.Position,
			components: 3,
			type: w.Float32
		},
		{
			semantic: C.TexCoord0,
			components: 2,
			type: w.Float32
		},
		{
			semantic: C.Color,
			components: 4,
			type: w.UNorm8
		},
		{
			semantic: C.Normal,
			components: 3,
			type: w.Float32
		}
	]);
	const u = (a + 1) * (o + 1);
	const d = new Uint8Array(u * l);
	const f = new DataView(d.buffer);
	const p = (e) => c.find((t) => t.semantic === e).offset;
	const m = p(C.Position), h = p(C.TexCoord0), g = p(C.Color), _ = p(C.Normal);
	const v = [
		Infinity,
		Infinity,
		Infinity
	];
	const y = [
		-Infinity,
		-Infinity,
		-Infinity
	];
	let b = 0;
	for (let e = 0; e <= a; e++) {
		const c = i.length * (e / a);
		const [u, d, p] = i.position(c);
		const [x, , S] = i.tangent(c);
		const C = Math.hypot(x, S) || 1;
		const w = -S / C, T = x / C;
		const E = i.width(c) * .5 * t.widthScale;
		for (let e = 0; e <= o; e++, b++) {
			const i = e / o;
			const a = (i * 2 - 1) * E;
			const x = n.x + u + w * a, S = n.z + p + T * a;
			const C = r?.heightAt(x, S) ?? n.y + d;
			const D = r?.normalAt?.(x, S) ?? [
				0,
				1,
				0
			];
			const O = [
				x - n.x,
				C + t.lift - n.y,
				S - n.z
			];
			const k = b * l;
			for (let e = 0; e < 3; e++) {
				f.setFloat32(k + m + e * 4, O[e], true);
				f.setFloat32(k + _ + e * 4, D[e], true);
				if (O[e] < v[e]) v[e] = O[e];
				if (O[e] > y[e]) y[e] = O[e];
			}
			f.setFloat32(k + h, i, true);
			f.setFloat32(k + h + 4, c / Math.max(t.tile, .001), true);
			const ee = 1 - Math.abs(i * 2 - 1);
			const A = s > 0 ? Math.min(1, ee / s) : 1;
			f.setUint8(k + g, 255);
			f.setUint8(k + g + 1, 255);
			f.setUint8(k + g + 2, 255);
			f.setUint8(k + g + 3, Math.round(A * A * (3 - 2 * A) * 255));
		}
	}
	const x = new Uint32Array(a * o * 6);
	let S = 0;
	for (let e = 0; e < a; e++) for (let t = 0; t < o; t++) {
		const n = e * (o + 1) + t, r = n + 1, i = n + o + 1, a = i + 1;
		x[S++] = n;
		x[S++] = r;
		x[S++] = i;
		x[S++] = r;
		x[S++] = a;
		x[S++] = i;
	}
	return {
		channels: c,
		vertexStride: l,
		vertexCount: u,
		vertices: d,
		indices: x,
		aabbMin: v,
		aabbMax: y
	};
}
/** The ground, whichever module answers it, and how to tell when it has changed. */
function xe(e) {
	const t = e.getResourceByName?.("Terrains");
	if (!t || typeof t.heightAt !== "function" || !t.built_?.size) return null;
	return {
		query: t,
		revision: t.revision_ ?? 0,
		waiting: !!t.loading
	};
}
/** Keeps every `RoadDecal` lying on the ground. Called once by the spline plugin. */
function Se(e) {
	const n = /* @__PURE__ */ new Map();
	const r = (t) => {
		const r = n.get(t);
		n.delete(t);
		if (r?.handle && e.hasResource(f)) e.getResource(f).releaseBuiltMesh(r.handle);
	};
	e.world.onDespawn(r);
	e.addSystemToSchedule(3, i([], () => {
		const i = e.world;
		if (!e.hasResource(f)) return;
		const a = e.getResource(f);
		for (const e of [...n.keys()]) if (!i.valid(e) || !i.has(e, ye)) r(e);
		for (const r of i.getEntitiesWithComponents([
			ye,
			D,
			s
		])) {
			const o = xe(e);
			if (o?.waiting) continue;
			const c = i.get(r, ye);
			const l = i.get(r, D);
			const u = i.get(r, s).worldPosition;
			const d = JSON.stringify([
				l.points,
				l.closed,
				c,
				o?.revision ?? -1,
				u.x,
				u.y,
				u.z
			]);
			const f = n.get(r);
			if (f?.key === d) continue;
			const p = be(l, c, u, o?.query ?? null);
			const m = p ? a.createMesh(p) : 0;
			if (f?.handle) a.releaseBuiltMesh(f.handle);
			n.set(r, {
				key: d,
				handle: m
			});
			const h = i.has(r, t) ? i.get(r, t) : null;
			i.insert(r, t, {
				...h,
				enabled: true,
				mesh: m,
				opaque: false,
				castShadows: false,
				cullBackfaces: false
			});
		}
	}, { name: "RoadDecalSystem" }));
}
//#endregion
//#region src/spline/splinePlugin.ts
/** What a {@link PathFollower} does at the end of the curve. */
const Q = {
	Once: 0,
	Loop: 1,
	PingPong: 2
};
/** How a {@link PathFollower} turns to the way it is going. */
const $ = {
	/** Keeps the rotation it has. */
	None: 0,
	/** Turns about y to face along the curve, +z forward: a 3D walker on the ground. */
	FaceXZ: 1,
	/** Turns about z to face along the curve, +x forward: a 2D sprite. */
	FaceXY: 2
};
/**
* Moves its entity along the `Spline` of another: an enemy on a patrol route, a platform on a rail, a camera on a track. It sets the entity's
* own `position` (and `rotation`, when asked), so a follower sits at the top of the hierarchy. The curve is read through its entity's
* Transform, so moving, turning or scaling the spline moves the whole route. It advances by the length of the curve, not by its parameter,
* so it goes at `speed` everywhere on it.
*
* @experimental
*/
const Ce = e("PathFollower", {
	spline: -1,
	speed: 4,
	distance: 0,
	mode: Q.Loop,
	orient: $.None,
	playing: true
}, {
	entityFields: ["spline"],
	fields: {
		spline: {
			category: "Path",
			tooltip: "The entity that holds the Spline to follow."
		},
		speed: {
			category: "Path",
			tooltip: "World units a second along the curve. Negative runs it backwards."
		},
		distance: {
			min: 0,
			category: "Path",
			tooltip: "How far along the curve it has gone, in world units. Set it to start part-way along."
		},
		mode: {
			enum: [
				{
					label: "Once",
					value: Q.Once
				},
				{
					label: "Loop",
					value: Q.Loop
				},
				{
					label: "Ping-pong",
					value: Q.PingPong
				}
			],
			category: "Path",
			tooltip: "What it does at the end of the curve: stop, go round again, or turn back."
		},
		orient: {
			enum: [
				{
					label: "None",
					value: $.None
				},
				{
					label: "Face along (XZ)",
					value: $.FaceXZ
				},
				{
					label: "Face along (XY)",
					value: $.FaceXY
				}
			],
			category: "Path",
			tooltip: "Whether it turns to face the way it is going: about y for a 3D walker, about z for a 2D sprite."
		},
		playing: {
			category: "Path",
			tooltip: "Whether it is moving. A follower set to Once stops itself at the end."
		}
	}
});
/**
* Where a follower that has gone `travelled` along a curve of `length` stands, and whether a `Once` follower has run out of curve going the way
* it was going (`forward`).
*/
function we(e, t, n, r = true) {
	if (!(t > 0)) return {
		s: 0,
		done: n === Q.Once
	};
	if (n === Q.Loop) return {
		s: (e % t + t) % t,
		done: false
	};
	if (n === Q.PingPong) {
		const n = (e % (2 * t) + 2 * t) % (2 * t);
		return {
			s: n <= t ? n : 2 * t - n,
			done: false
		};
	}
	return {
		s: Math.min(Math.max(e, 0), t),
		done: r ? e >= t : e <= 0
	};
}
function Te(e, t, n, r) {
	const i = 2 * (e.y * r - e.z * n), a = 2 * (e.z * t - e.x * r), o = 2 * (e.x * n - e.y * t);
	return [
		t + e.w * i + (e.y * o - e.z * a),
		n + e.w * a + (e.z * i - e.x * o),
		r + e.w * o + (e.x * a - e.y * i)
	];
}
var Ee = class {
	constructor() {
		this.name = "spline";
		this.curves_ = /* @__PURE__ */ new Map();
	}
	build(e) {
		e.addSystemToSchedule(3, i([u(c)], (t) => this.follow(e, t.delta), { name: "PathFollowerSystem" }), { runIf: g });
		ve(e);
		Se(e);
	}
	curveOf(e, t) {
		const n = e.world;
		if (t < 0 || !n.valid(t)) return null;
		const r = n.tryGet(t, D);
		if (!r || r.points.length < 2) return null;
		const i = n.tryGet(t, s);
		if (!i) return null;
		const a = JSON.stringify([r.points, r.closed]);
		let o = this.curves_.get(t);
		if (!o || o.key !== a) {
			o = {
				key: a,
				curve: new E(r.points, r.closed)
			};
			this.curves_.set(t, o);
		}
		return {
			curve: o.curve,
			at: i
		};
	}
	follow(e, t) {
		const n = e.world;
		for (const r of n.getEntitiesWithComponents([Ce, s])) {
			const i = n.get(r, Ce);
			if (!i.playing) continue;
			const a = this.curveOf(e, i.spline);
			if (!a) continue;
			const { curve: o, at: c } = a;
			const l = c.worldScale.x, u = c.worldScale.y, d = c.worldScale.z;
			const f = (Math.abs(l) + Math.abs(u) + Math.abs(d)) / 3 || 1;
			const p = o.length * f;
			const m = i.distance + i.speed * t;
			const h = we(m, p, i.mode, i.speed >= 0);
			const g = o.position(h.s / f);
			const _ = Te(c.worldRotation, g[0] * l, g[1] * u, g[2] * d);
			const v = n.get(r, s);
			v.position.x = _[0] + c.worldPosition.x;
			v.position.y = _[1] + c.worldPosition.y;
			v.position.z = _[2] + c.worldPosition.z;
			if (i.orient !== $.None) {
				const e = o.tangent(h.s / f);
				const t = Te(c.worldRotation, e[0] * l, e[1] * u, e[2] * d);
				const n = i.speed < 0 ? -1 : 1;
				if (i.orient === $.FaceXZ) {
					const e = Math.atan2(t[0] * n, t[2] * n) / 2;
					v.rotation.x = 0;
					v.rotation.y = Math.sin(e);
					v.rotation.z = 0;
					v.rotation.w = Math.cos(e);
				} else {
					const e = Math.atan2(t[1] * n, t[0] * n) / 2;
					v.rotation.x = 0;
					v.rotation.y = 0;
					v.rotation.z = Math.sin(e);
					v.rotation.w = Math.cos(e);
				}
			}
			n.set(r, s, v);
			const y = i.mode === Q.Once && h.done;
			n.set(r, Ce, {
				...i,
				distance: y ? h.s : m,
				playing: !y
			});
		}
		for (const e of [...this.curves_.keys()]) if (!n.valid(e)) this.curves_.delete(e);
	}
};
const De = new Ee();
//#endregion
export { ee as C, te as S, L as _, we as a, O as b, be as c, Y as d, ue as f, F as g, le as h, Ee as i, fe as l, X as m, Q as n, De as o, Z as p, $ as r, ye as s, Ce as t, ge as u, I as v, ne as x, re as y };

//# sourceMappingURL=splinePlugin.js.map