import { $t as e, Ct as t, Nt as n, c as r, dt as i, n as a, qt as o } from "./system.js";
import { s } from "./logger.js";
import { n as c } from "./AssetPlugin.js";
import { n as l } from "./disposeAll.js";
import { n as u, p as d } from "./resourceManager.js";
import { i as f } from "./runtimeAssets.js";
import { n as p, r as m, t as h } from "./material.js";
import { n as g, t as _ } from "./planetQuery.js";
import { r as v } from "./collisionGeometry.js";
import { a as y } from "./builtinShaders.js";
import { n as b, r as x, s as ee } from "./meshFormat.js";
import { o as S, x as te } from "./components.js";
import { c as C, i as w, t as T } from "./movers.js";
import { D as ne, E as re, O as ie, T as ae, f as oe, h as E, m as se, y as ce } from "./terrainPlugin.js";
import { r as le } from "./renderOrigin.js";
import { d as D, f as O, h as k, i as A, m as ue, o as de, s as fe, t as j } from "./planetPages.js";
import { n as pe, r as M, t as N } from "./planPool.js";
//#region src/terrain/planetSea.ts
/**
* @file    planetSea.ts
* @brief   The sea of a planet: a sphere at the sea level, lit like any surface and seen through, in which the ground stands.
*
* @details The first slice of water on a round world. A flat world's water (water/) is a plane of waves lifted over a zone; a planet's sea is the sphere
*          at `radius + seaLevel`, so the ground that dips below it is under water and the horizon curves away over it. It has a colour and an opacity
*          and takes the sun and the sky as a smooth, shining surface does; waves, shore foam and depth colour are the flat water's, and come to the sphere later.
*/
/** A unit sphere (radius 1, outward normals) of `rings` bands of `segments` quads, as a mesh. */
function P(e, t) {
	const n = Math.max(2, Math.floor(e)), r = Math.max(3, Math.floor(t));
	const { channels: i, vertexStride: a } = ee([
		{
			semantic: b.Position,
			components: 3,
			type: x.Float32
		},
		{
			semantic: b.TexCoord0,
			components: 2,
			type: x.Float32
		},
		{
			semantic: b.Color,
			components: 4,
			type: x.UNorm8
		},
		{
			semantic: b.Normal,
			components: 3,
			type: x.Float32
		}
	]);
	const o = (n + 1) * (r + 1);
	const s = new Uint8Array(o * a);
	const c = new DataView(s.buffer);
	const [l, u, d, f] = i.map((e) => e.offset);
	for (let e = 0; e <= n; e++) {
		const t = e / n * Math.PI, i = Math.sin(t), o = Math.cos(t);
		for (let t = 0; t <= r; t++) {
			const s = t / r * Math.PI * 2;
			const p = i * Math.cos(s), m = o, h = i * Math.sin(s);
			const g = (e * (r + 1) + t) * a;
			c.setFloat32(g + l, p, true);
			c.setFloat32(g + l + 4, m, true);
			c.setFloat32(g + l + 8, h, true);
			c.setFloat32(g + u, t / r, true);
			c.setFloat32(g + u + 4, e / n, true);
			for (let e = 0; e < 4; e++) c.setUint8(g + d + e, 255);
			c.setFloat32(g + f, p, true);
			c.setFloat32(g + f + 4, m, true);
			c.setFloat32(g + f + 8, h, true);
		}
	}
	const p = new Uint32Array(n * r * 6);
	let m = 0;
	for (let e = 0; e < n; e++) for (let t = 0; t < r; t++) {
		const n = e * (r + 1) + t, i = n + 1, a = n + r + 1, o = a + 1;
		p.set([
			n,
			i,
			a,
			i,
			o,
			a
		], m);
		m += 6;
	}
	return {
		channels: i,
		vertexStride: a,
		vertexCount: o,
		vertices: s,
		indices: p,
		aabbMin: [
			-1,
			-1,
			-1
		],
		aabbMax: [
			1,
			1,
			1
		]
	};
}
const F = `#pragma shader "Planet Sea"
#pragma version 300 es
#pragma domain Lit
// The sea's colour, and how much of it there is over what is under it.
#pragma param u_seaColor color default(0.05,0.3,0.45,1)
#pragma param u_seaOpacity float default(0.85) range(0,1) ui(slider)

#pragma fragment
precision highp float;

in vec4 v_color;
in vec2 v_texCoord;
in highp vec2 v_worldPos;
#ifdef MESH_NORMALS
in highp vec3 v_worldNormal;
in highp vec3 v_worldXYZ;
#endif

#ifdef ES_GBUFFER
layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 fragSurface;
// The surface's diffuse colour, for light an effect adds after this pass (bounce light): alpha 1 is "written".
layout(location = 2) out vec4 fragAlbedo;
#else
out vec4 fragColor;
#endif

void main() {
#ifdef MESH_NORMALS
    highp vec3 P = v_worldXYZ;
    highp vec3 N = normalize(v_worldNormal);
#else
    highp vec3 P = vec3(v_worldPos.x, 0.0, v_worldPos.y);
    highp vec3 N = vec3(0.0, 1.0, 0.0);
#endif
    // A smooth, shining surface: the sun and the sky lie on it, and what is under it shows through by the opacity.
    float roughness = 0.08;
    SurfaceExt ext = surfaceExtNone(N);
    vec3 lit = applyLightingSurface(u_seaColor.rgb, N, P, viewDirection(P), 0.0, roughness, 0.5, 1.0, ext);
    fragColor = vec4(lit, u_seaOpacity);
#ifdef ES_GBUFFER
    fragSurface = vec4(0.5, 0.5, roughness, 0.0);
    fragAlbedo = vec4(u_seaColor.rgb, 1.0);
#endif
}
#pragma end

#pragma fragment wgsl
#ifdef ES_GBUFFER
struct FragOut {
    @location(0) color : vec4f,
    @location(1) surface : vec4f,
    @location(2) albedo : vec4f,
};
@fragment fn fs_main(v : VSOut) -> FragOut {
#else
@fragment fn fs_main(v : VSOut) -> @location(0) vec4f {
#endif
    g_probeSlot = v.v_probeSlot;
#ifdef MESH_LIGHTMAP
    g_lightmap = v.v_lightmap;
#endif
#ifdef MESH_NORMALS
    let P = v.v_worldXYZ;
    let N = normalize(v.v_worldNormal);
#else
    let P = vec3f(v.v_worldPos.x, 0.0, v.v_worldPos.y);
    let N = vec3f(0.0, 1.0, 0.0);
#endif
    let roughness = 0.08;
    let ext = surfaceExtNone(N);
    let lit = applyLightingSurface(mc.u_seaColor.rgb, N, P, viewDirection(P), 0.0, roughness, 0.5, 1.0, ext);
#ifdef ES_GBUFFER
    var frag : FragOut;
    frag.color = vec4f(lit, mc.u_seaOpacity);
    frag.surface = vec4f(0.5, 0.5, roughness, 0.0);
    frag.albedo = vec4f(mc.u_seaColor.rgb, 1.0);
    return frag;
#else
    return vec4f(lit, mc.u_seaOpacity);
#endif
}
#pragma end
`;
const I = y("planet-sea", "Planet Sea", "The sea of a planet: a lit, translucent surface in a colour.", F);
//#endregion
//#region src/terrain/planetCollision.ts
/** Cells along a tile's side. */
const L = 32;
const R = (e, t) => `planet-collision:${e}:${t}`;
const z = (e, t) => `planet:${e}:${t.face}:${t.ix}:${t.iz}`;
/** One node's ground as triangles: positions measured from the node's middle (in the planet's space), wound to face out. @internal */
function me(e, t, n) {
	const r = 33;
	const { u0: i, v0: a, span: o } = O(e.levels, t);
	const s = /* @__PURE__ */ new Float32Array(3267);
	const c = [
		0,
		0,
		0
	];
	for (let e = 0; e < r; e++) for (let n = 0; n < r; n++) {
		A(t.face, i + n / L * o, a + e / L * o, c);
		const l = (e * r + n) * 3;
		s[l] = c[0];
		s[l + 1] = c[1];
		s[l + 2] = c[2];
	}
	const l = (c) => {
		const l = A(t.face, i + o / 2, a + o / 2);
		const u = [
			l[0] * e.radius,
			l[1] * e.radius,
			l[2] * e.radius
		];
		const d = /* @__PURE__ */ new Float32Array(3267);
		for (let t = 0; t < 1089; t++) {
			const n = e.radius + c[t];
			for (let e = 0; e < 3; e++) d[t * 3 + e] = s[t * 3 + e] * n - u[e];
		}
		const f = (e, t) => d[e * 3 + t];
		const p = [
			f(1, 0) - f(0, 0),
			f(1, 1) - f(0, 1),
			f(1, 2) - f(0, 2)
		], m = [
			f(r, 0) - f(0, 0),
			f(r, 1) - f(0, 1),
			f(r, 2) - f(0, 2)
		];
		const h = [
			p[1] * m[2] - p[2] * m[1],
			p[2] * m[0] - p[0] * m[2],
			p[0] * m[1] - p[1] * m[0]
		];
		const g = h[0] * l[0] + h[1] * l[1] + h[2] * l[2] > 0;
		const _ = /* @__PURE__ */ new Uint32Array(6144);
		let v = 0;
		for (let e = 0; e < L; e++) for (let t = 0; t < L; t++) {
			const n = e * r + t, i = n + 1, a = n + r, o = a + 1;
			const s = g ? [
				n,
				i,
				a,
				i,
				o,
				a
			] : [
				n,
				a,
				i,
				i,
				a,
				o
			];
			for (const e of s) _[v++] = e;
		}
		return {
			key: n,
			origin: u,
			positions: d,
			indices: _
		};
	};
	const u = e.provider.sample({
		world: e.world,
		seed: e.seed,
		version: e.version,
		radius: e.radius,
		directions: s,
		count: 1089
	});
	return u instanceof Promise ? u.then((e) => l(e.heights)) : l(u.heights);
}
/**
* Keeps the planet's collision layers: set every frame for the faces a mover is over, taken away when collision is off. Returns nothing; the geometry
* is the physics world's to read (runtime/collisionGeometry.ts).
*/
function he(e, t, n, r, i) {
	const a = w(e);
	if (!i.collision) {
		B(e, t);
		return;
	}
	const s = e.world.get(t, o).worldPosition;
	const c = v(e);
	const l = 2 ** (n.levels - 1);
	const u = n.radius * Math.PI / 2 / l;
	const d = Math.max(i.collisionDistance, 0) / u;
	for (let o = 0; o < 6; o++) a.set(R(t, o), {
		label: "Building the planet's collision",
		originX: 0,
		originZ: 0,
		sizeX: 1,
		sizeZ: 1,
		extent: [
			0,
			0,
			l,
			l
		],
		loadRadius: d,
		unloadRadius: d + 1,
		generation: `${r}:${s.x}:${s.y}:${s.z}:${i.collisionLayer}:${i.friction}`,
		sources: () => {
			const t = [];
			for (const n of T(e)) {
				const e = n.x - s.x, r = (n.y ?? 0) - s.y, i = n.z - s.z;
				const a = Math.hypot(e, r, i) || 1;
				const c = de(o, e / a, r / a, i / a);
				if (c) t.push({
					x: (c.u + 1) / 2 * l,
					z: (c.v + 1) / 2 * l
				});
			}
			return t;
		},
		make: (e, r) => me(n, {
			face: o,
			level: 0,
			ix: e,
			iz: r
		}, z(t, {
			face: o,
			level: 0,
			ix: e,
			iz: r
		})),
		publish: (e, n, r) => {
			c.set(r.key, {
				owner: t,
				origin: [
					s.x + r.origin[0],
					s.y + r.origin[1],
					s.z + r.origin[2]
				],
				positions: r.positions,
				indices: r.indices,
				friction: i.friction,
				restitution: 0,
				layer: i.collisionLayer
			});
		},
		release: (e, t, n) => c.delete(n.key)
	});
}
/** Takes the planet's collision away. */
function B(e, t) {
	const n = w(e);
	for (let e = 0; e < 6; e++) n.remove(R(t, e));
}
//#endregion
//#region src/terrain/planetProvider.ts
const V = /* @__PURE__ */ new Map();
let H = 0;
/**
* Makes `provider` available to every Planet that names it. A second provider under the same id replaces the first. A planet that named one not yet
* registered (a script registers it after the scene loaded) is made once it is.
* @experimental
*/
function ge(e) {
	V.set(e.id, e);
	H++;
}
/** The provider registered under `id`, if any. */
function U(e) {
	return V.get(e);
}
/** @internal Bumped on every registration, so a planet whose provider was missing asks again. */
function W() {
	return H;
}
//#endregion
//#region src/terrain/planetPlugin.ts
const G = (e, t, n) => ({
	r: e,
	g: t,
	b: n,
	a: 1
});
/**
* Ground on a sphere. Presence is the opt-in; its children are the quadtree's nodes.
*
* @experimental
*/
const K = e("Planet", {
	radius: 4e3,
	provider: "",
	world: "",
	generatorVersion: 1,
	seed: 1,
	cellSize: 1.5,
	detail: 1.5,
	layerColor0: G(.28, .46, .2),
	layerColor1: G(.45, .36, .24),
	layerColor2: G(.93, .95, .98),
	layerColor3: G(.4, .38, .36),
	macroScale: 90,
	macroVariation: .35,
	collision: true,
	collisionDistance: 64,
	collisionLayer: 0,
	friction: .6,
	gravity: 0,
	sea: false,
	seaLevel: 0,
	seaColor: G(.06, .28, .42),
	seaOpacity: .82,
	layers: []
}, { fields: {
	radius: {
		min: 1,
		category: "Shape",
		tooltip: "The planet's radius in metres. The planet stands at its entity, unrotated and unscaled."
	},
	provider: {
		category: "Shape",
		tooltip: "The generator the ground is made by, registered with registerPlanetProvider. The same provider, world, seed and version are the same ground everywhere."
	},
	world: {
		category: "Shape",
		tooltip: "The world (a planet) the ground belongs to, as the game names it; handed to the provider."
	},
	generatorVersion: {
		min: 1,
		step: 1,
		category: "Shape",
		tooltip: "The generator version the planet was made with. A version the provider no longer has fails the planet rather than growing other ground under what was built on it."
	},
	seed: {
		step: 1,
		category: "Shape",
		tooltip: "Another seed is another planet."
	},
	cellSize: {
		min: .01,
		category: "Detail",
		tooltip: "The finest cell of the ground's mesh, in metres: what it is drawn at near the eye. Further off the cells double, level by level."
	},
	detail: {
		min: .25,
		max: 8,
		step: .05,
		category: "Detail",
		tooltip: "Above 1 the finest cells reach further out before the ground coarsens."
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
	},
	macroScale: {
		min: 1,
		category: "Layers",
		tooltip: "The size, in metres, of the ground's own wander in brightness."
	},
	macroVariation: {
		min: 0,
		max: 1,
		step: .01,
		category: "Layers",
		tooltip: "How strongly the ground's brightness wanders."
	},
	sea: {
		category: "Sea",
		tooltip: "Whether the planet has a sea: a sphere at the sea level, in which the ground that dips below it stands."
	},
	seaLevel: {
		category: "Sea",
		tooltip: "The height of the sea above the planet's radius, in metres."
	},
	seaColor: { category: "Sea" },
	seaOpacity: {
		min: 0,
		max: 1,
		step: .01,
		category: "Sea",
		tooltip: "How much of the sea there is over what is under it."
	},
	gravity: {
		min: 0,
		category: "Physics",
		tooltip: "How hard the planet pulls bodies toward its centre, in metres a second squared at the surface (9.81 is the Earth's). Needs 3D physics; the world's own gravity is taken off the bodies it pulls."
	},
	layers: {
		category: "Layers",
		tooltip: "The terrain layers (.esterrainlayer, up to four) the ground is drawn with, in the order the paint weighs them, each read on the planes of the world's axes. Empty draws the four layer colours."
	},
	collision: {
		category: "Collision",
		tooltip: "Whether 3D bodies and characters collide with the ground: the finest tiles round each of them are built as collision geometry."
	},
	collisionDistance: {
		min: 1,
		category: "Collision",
		tooltip: "How far round each moving body and character the ground is built for collision, in metres."
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
		tooltip: "The ground's friction."
	}
} });
/** The side of the atlases the pages are kept in, in texels. */
const q = 2048;
/** Most levels a planet's tree may have: a node's place on its face is packed in a float, ix * 2048 + iz, which holds eleven levels' worth. */
const J = 12;
/** Pages asked at once of a provider that answers later. */
const _e = 16;
/** The most layers a planet draws: one paint atlas of four weights. */
const Y = 4;
/** The planets of an app, for what asks about them. @experimental */
var X = class {
	constructor() {
		this.built_ = /* @__PURE__ */ new Map();
	}
	/** How a planet stands, or null for an entity that is not one. */
	status(e) {
		const t = this.built_.get(e);
		if (!t) return null;
		return t.failure ? {
			state: "failed",
			reason: t.failure
		} : { state: t.instance && t.source ? "ready" : "loading" };
	}
};
var Z = class {
	constructor() {
		this.name = "planet";
		this.activeWhen = [K];
		this.stock_ = 0;
		this.planets_ = null;
		this.seaPending_ = false;
	}
	build(e) {
		const t = new X();
		this.planets_ = t;
		const n = new _();
		e.insertResource(g, n);
		e.addSystemToSchedule(3, r([], () => {
			if (!e.hasResource(c)) return;
			for (const [r, i] of t.built_) {
				if (e.world.valid(r) && e.world.has(r, K)) continue;
				this.destroy(e, i);
				B(e, r);
				t.built_.delete(r);
				n.planets.delete(r);
			}
			for (const r of e.world.getEntitiesWithComponents([K, o])) {
				const i = e.world.get(r, K);
				const a = ve(i);
				let s = t.built_.get(r);
				if (!s || s.signature !== a || s.failure && s.providers !== W()) {
					if (s) {
						this.destroy(e, s);
						B(e, r);
					}
					s = this.make(a, i, (s?.epoch ?? 0) + 1);
					t.built_.set(r, s);
				}
				s.data = { ...i };
				if (s.failure || !s.source || !s.tree) continue;
				const c = e.world.get(r, o).worldPosition;
				const l = s.source;
				l.paint = () => n.paintOf(r);
				if (s.painted !== n.paintRevision) {
					s.painted = n.paintRevision;
					s.table.clear();
				}
				n.planets.set(r, {
					centre: [
						c.x,
						c.y,
						c.z
					],
					radius: s.data.radius,
					gravity: s.data.gravity,
					height: (e, t, n) => $(l, e, t, n)?.heights[0] ?? null,
					paint: (e, t, n) => {
						const r = $(l, e, t, n);
						return r?.paint ? Array.from(r.paint.subarray(0, 4)) : null;
					},
					sampleMany: (e, t) => {
						const n = l.provider.sample({
							world: l.world,
							seed: l.seed,
							version: l.version,
							radius: l.radius,
							directions: e,
							count: t
						});
						return n instanceof Promise ? null : n;
					},
					worker: l.provider.workerSource ? {
						source: l.provider.workerSource,
						seed: l.seed,
						version: l.version,
						world: l.world
					} : null,
					fieldNames: l.provider.fields ?? [],
					fieldsAt: l.provider.fields ? (e, t, n) => {
						const r = $(l, e, t, n);
						return r?.fields ? Array.from(r.fields) : null;
					} : null,
					layers: s.data.layers.map((e, t) => (e.split("/").pop() ?? "").replace(/\.[^.]*$/, "") || `layer${t}`)
				});
				this.keepSea(e, r, s);
				he(e, r, s.source, s.epoch, s.data);
				if (!s.instance) {
					if (!s.pending) this.prepare(e, s);
					continue;
				}
				this.draw(e, r, s);
			}
		}, { name: "PlanetSystem" }));
	}
	cleanup(e) {
		const t = this.planets_;
		if (e && t) for (const [n, r] of t.built_) {
			this.destroy(e, r);
			B(e, n);
		}
		t?.built_.clear();
		if (this.stock_) m.release(this.stock_);
		this.stock_ = 0;
	}
	/** What a planet is made against, from its fields: its provider, and the cut its tree is made with. */
	make(e, t, n) {
		const r = {
			signature: e,
			data: { ...t },
			provider: null,
			source: null,
			tree: null,
			epoch: n,
			table: new ie(q),
			heights: 0,
			paint: 0,
			mesh: 0,
			instance: 0,
			nodes: /* @__PURE__ */ new Map(),
			spare: [],
			wanted: /* @__PURE__ */ new Map(),
			asked: /* @__PURE__ */ new Set(),
			pending: false,
			failure: null,
			arrays: [],
			packed: "",
			packing: false,
			providers: W(),
			painted: 0,
			sea: null
		};
		const i = U(t.provider);
		if (!i) {
			r.failure = t.provider ? `the planet provider "${t.provider}" is not registered` : "the planet names no provider";
			return r;
		}
		if (!i.versions.includes(t.generatorVersion)) {
			r.failure = `the planet provider ${i.id} has no version ${t.generatorVersion} (it has ${i.versions.join(", ") || "none"})`;
			return r;
		}
		const [a, o] = i.range(t.seed, t.generatorVersion, t.radius);
		const s = 32 * Math.max(t.cellSize, .001);
		const c = fe(t.radius, s);
		if (c > J) {
			r.failure = `a planet of radius ${t.radius} m with ${t.cellSize} m cells needs ${c} levels of tree; ${J} is the most (raise cellSize)`;
			return r;
		}
		r.provider = i;
		r.tree = {
			radius: t.radius,
			minHeight: a,
			maxHeight: o,
			leafSize: s,
			range0: s * 2.5 * Math.max(t.detail, .25)
		};
		r.source = {
			provider: i,
			world: t.world,
			seed: t.seed,
			version: t.generatorVersion,
			radius: t.radius,
			levels: c,
			minHeight: a,
			maxHeight: o
		};
		return r;
	}
	/** The stock material: the Planet shader, compiled once. */
	async stock(e) {
		if (this.stock_) return this.stock_;
		const t = (await e.getResource(c).load("material-shader", "builtin:planet")).compile([]);
		if (this.stock_) return this.stock_;
		this.stock_ = m.createFromAsset({
			version: "1.0",
			type: "material",
			shader: "builtin:planet",
			blendMode: 9,
			depthTest: true,
			depthWrite: true,
			cull: 1,
			properties: {}
		}, t);
		return this.stock_;
	}
	async prepare(e, t) {
		t.pending = true;
		const n = t.epoch;
		try {
			const r = await this.stock(e);
			if (t.epoch !== n) return;
			t.mesh = e.getResource(c).createMesh(ce(32, true));
			[t.heights = 0, t.paint = 0] = oe(e, 2, q, () => t.table.clear());
			t.instance = m.createInstance(r);
			if (!t.mesh || !t.heights || !t.paint || !t.instance) {
				t.failure = "the engine refused the planet's mesh, atlases or material";
				s.warn("planet", t.failure);
				return;
			}
			const i = (e, n) => {
				m.setUniform(t.instance, e, n);
			};
			i("u_heightPages", m.tex(t.heights));
			i("u_paintPages", m.tex(t.paint));
			i("u_planetPages", 1);
			i("u_atlasTexels", q);
			i("u_pageTexels", 64);
			i("u_patchCells", 32);
			i("u_planetRadius", t.data.radius);
			i("u_planetLevels", t.source.levels);
			i("u_heightRange", {
				x: t.tree.minHeight,
				y: Math.max(t.tree.maxHeight - t.tree.minHeight, 1e-6)
			});
			i("u_lodRange0", t.tree.range0);
		} catch (e) {
			t.failure = e instanceof Error ? e.message : String(e);
			s.error("planet", "preparing the planet failed", e);
		} finally {
			t.pending = false;
		}
	}
	eye(e, t) {
		if (e.hasResource(S)) {
			const n = te(e.getResource(S));
			if (n) return [
				n.x - t.worldPosition.x,
				n.y - t.worldPosition.y,
				n.z - t.worldPosition.z
			];
		}
		for (const n of e.world.getEntitiesWithComponents([i, o])) {
			if (!e.world.get(n, i).isActive) continue;
			const r = e.world.get(n, o);
			return [
				r.worldPosition.x - t.worldPosition.x,
				r.worldPosition.y - t.worldPosition.y,
				r.worldPosition.z - t.worldPosition.z
			];
		}
		return null;
	}
	/** Chooses the nodes for the eye, makes the pages they want within the budget, and places the nodes. */
	draw(e, t, n) {
		const r = n.tree, i = n.source;
		const a = e.world.get(t, o);
		const s = this.eye(e, a) ?? [
			0,
			r.radius + r.maxHeight * 2,
			0
		];
		const c = ue(r, s[0], s[1], s[2], i.levels);
		const l = n.table;
		l.tick();
		n.wanted.clear();
		const u = /* @__PURE__ */ new Map();
		const d = /* @__PURE__ */ new Set();
		const f = (e) => ({
			face: e.face,
			level: e.level + 1,
			ix: e.ix >> 1,
			iz: e.iz >> 1
		});
		for (const e of c) {
			let t = e;
			const r = k(e);
			if (!l.get(r)) n.wanted.set(r, e);
			while (t && !l.get(k(t))) {
				t = t.level + 1 < i.levels ? f(t) : null;
				if (t && !l.get(k(t))) n.wanted.set(k(t), t);
			}
			if (!t) continue;
			const a = k(t);
			if (t !== e) d.add(a);
			u.set(a, t);
		}
		for (const [e, t] of u) for (let n = t; n.level + 1 < i.levels;) {
			n = f(n);
			if (d.has(k(n))) {
				u.delete(e);
				break;
			}
		}
		this.makePages(e, t, n, s);
		this.pack(e, n);
		const p = (e, t) => {
			m.setUniform(n.instance, e, t);
		};
		const h = le();
		p("u_planetCenter", {
			x: a.worldPosition.x - h.x,
			y: a.worldPosition.y - h.y,
			z: a.worldPosition.z - h.z,
			w: 0
		});
		p("u_terrainEye", {
			x: s[0],
			y: s[1],
			z: s[2],
			w: 1
		});
		const g = n.data;
		for (const [e, t] of [
			g.layerColor0,
			g.layerColor1,
			g.layerColor2,
			g.layerColor3
		].entries()) p(`u_tint${e}`, {
			x: t.r,
			y: t.g,
			z: t.b,
			w: t.a
		});
		p("u_macroScale", g.macroScale);
		p("u_macroVariation", g.macroVariation);
		this.place(e, t, n, u);
	}
	/** The sea: a sphere at the sea level standing at the planet, made when the planet has one and let go when it has not. */
	keepSea(e, t, n) {
		const r = n.data, i = e.world;
		if (!r.sea || !e.hasResource(c)) {
			this.dropSea(e, n);
			return;
		}
		if (!n.sea) {
			if (this.seaPending_) return;
			this.seaPending_ = true;
			this.makeSea(e, t, n).finally(() => {
				this.seaPending_ = false;
			});
			return;
		}
		const a = n.sea;
		const s = r.radius + r.seaLevel;
		const l = i.get(a.entity, o);
		if (l.scale.x !== s) i.insert(a.entity, o, {
			...l,
			scale: {
				x: s,
				y: s,
				z: s
			}
		});
		const u = r.seaColor;
		m.setUniform(a.material, "u_seaColor", {
			x: u.r,
			y: u.g,
			z: u.b,
			w: 1
		});
		m.setUniform(a.material, "u_seaOpacity", r.seaOpacity);
	}
	/** Makes the sea: the sphere, a material on the Planet Sea shader that blends over what is under it and is hidden by what is nearer, and the entity. */
	async makeSea(e, r, i) {
		const a = e.world, s = e.getResource(c);
		const l = (await s.load("material-shader", "builtin:planet-sea")).compile([]);
		const u = m.createFromAsset({
			version: "1.0",
			type: "material",
			shader: "builtin:planet-sea",
			blendMode: 0,
			depthTest: true,
			depthWrite: false,
			cull: 1,
			properties: {}
		}, l);
		const d = m.createInstance(u);
		const f = s.createMesh(P(96, 192));
		if (!d || !f || !a.valid(r) || !i.data.sea || i.sea) {
			if (d) m.release(d);
			m.release(u);
			if (f) s.releaseBuiltMesh(f);
			return;
		}
		const p = a.spawn("PlanetSea");
		a.insert(p, n);
		a.insert(p, o, {});
		a.insert(p, t, {
			mesh: f,
			material: d,
			lit: true,
			opaque: false,
			cullBackfaces: true,
			castShadows: false,
			color: {
				r: 1,
				g: 1,
				b: 1,
				a: 1
			}
		});
		a.setParent(p, r);
		i.sea = {
			entity: p,
			mesh: f,
			material: d,
			base: u
		};
	}
	dropSea(e, t) {
		if (!t.sea) return;
		if (e.world.valid(t.sea.entity)) e.world.despawn(t.sea.entity);
		if (e.hasResource(c)) e.getResource(c).releaseBuiltMesh(t.sea.mesh);
		m.release(t.sea.material);
		m.release(t.sea.base);
		t.sea = null;
	}
	/** Packs the layers into the arrays the material reads, when what they name changed: the ground keeps the arrays it has until the new ones are made. */
	pack(e, t) {
		const n = t.data.layers ?? [];
		if (n.length === 0) {
			if (t.arrays.length > 0 && t.instance) m.setUniform(t.instance, "u_layerCount", 0);
			E(t.arrays);
			t.arrays = [];
			t.packed = "";
			return;
		}
		if (t.packing) return;
		const r = JSON.stringify(n);
		if (r === t.packed) return;
		t.packing = true;
		const i = t.epoch;
		(async () => {
			try {
				const r = await se(e, n, Y);
				if (t.epoch !== i || !t.instance) {
					if (r) E([r.albedo, r.normal]);
					return;
				}
				if (!r) {
					s.warn("planet", "the engine refused the planet layers' texture arrays");
					return;
				}
				E(t.arrays);
				t.arrays = [r.albedo, r.normal];
				const a = (e, n) => {
					m.setUniform(t.instance, e, n);
				};
				a("u_albedoLayers", m.tex(r.albedo));
				a("u_normalLayers", m.tex(r.normal));
				a("u_layerCount", r.tiles.length);
				const o = (e) => r.tiles[e] ?? 4;
				a("u_tiles", {
					x: o(0),
					y: o(1),
					z: o(2),
					w: o(3)
				});
			} catch (e) {
				s.error("planet", "packing the planet layers failed", e);
			} finally {
				t.packed = r;
				t.packing = false;
			}
		})();
	}
	/** Makes the wanted pages, coarse and near first, for as long as the frame can spare. */
	/** One node's page: made by a worker when the planet's provider can be loaded in one, here when it cannot. */
	pageOf(e, t, n, r) {
		const i = M();
		const a = n.provider;
		if (!i || !a.workerSource) return j(n, r);
		const o = e.hasResource(g) ? e.getResource(g) : null;
		const s = o?.remotePaintOf(t) ?? null;
		if (o?.paintOf(t) && !s) return j(n, r);
		const c = r.face % i.size;
		const l = s ? [...s.keys] : null;
		const u = {
			id: 0,
			type: "page",
			node: r,
			levels: n.levels,
			radius: n.radius,
			minHeight: n.minHeight,
			maxHeight: n.maxHeight,
			provider: {
				source: a.workerSource,
				seed: n.seed,
				version: n.version,
				world: n.world
			},
			paintKeys: l,
			specs: l ? l.map((e, t) => N(c, e) ? s.spec(t) : null) : []
		};
		return i.run(r.face, u).catch((e) => {
			if (l) for (const e of l) pe(c, e);
			throw e;
		});
	}
	makePages(e, t, n, r) {
		const i = C(e);
		if (n.wanted.size === 0) {
			i.mark(n, "Building the planet", 1);
			return;
		}
		const a = n.source;
		const o = (e) => {
			const t = D(n.tree, a.levels, e, .5, .5, 0);
			return Math.hypot(t[0] - r[0], t[1] - r[1], t[2] - r[2]);
		};
		const c = [...n.wanted.values()].sort((e, t) => t.level - e.level || o(e) - o(t));
		let l = 0;
		const u = (t, r) => {
			const i = n.table.claim(t, r.min, r.max);
			if (!i) return false;
			const [a, o] = n.table.origin(i.slot);
			f(e.wasmModule, n.heights, a, o, 67, 67, r.heights);
			f(e.wasmModule, n.paint, a, o, 67, 67, r.paint);
			return true;
		};
		const d = n.epoch;
		for (const r of c) {
			const o = k(r);
			if (n.asked.has(o)) continue;
			const c = this.pageOf(e, t, a, r);
			if (c instanceof Promise) {
				if (n.asked.size >= _e) break;
				n.asked.add(o);
				c.then((e) => {
					n.asked.delete(o);
					if (n.epoch === d && n.heights) u(o, e);
				}, (e) => {
					n.asked.delete(o);
					s.warn("planet", `the provider failed a page (${o})`, e);
				});
				continue;
			}
			if (!u(o, c)) break;
			n.wanted.delete(o);
			l++;
			if (!i.hasTime(n)) break;
		}
		i.mark(n, "Building the planet", l === 0 ? 0 : 1 - n.wanted.size / (n.wanted.size + l));
	}
	/** Puts a node entity on each node drawn (reusing the ones it had), and takes the rest away. */
	place(e, n, r, i) {
		const a = e.world, s = r.tree, c = r.source.levels;
		for (const [e, n] of r.nodes) {
			if (i.has(e)) continue;
			r.nodes.delete(e);
			if (!a.valid(n)) continue;
			const o = a.get(n, t);
			if (o.enabled) a.insert(n, t, {
				...o,
				enabled: false
			});
			r.spare.push(n);
		}
		const l = [
			0,
			0,
			0
		];
		for (const [e, u] of i) {
			const i = r.table.get(e);
			r.table.touch(e);
			let d = r.nodes.get(e);
			if (d === void 0 || !a.valid(d)) {
				d = r.spare.pop();
				if (d === void 0 || !a.valid(d)) {
					d = a.spawn("PlanetNode");
					a.insert(d, o, {});
					a.setParent(d, n);
				}
				r.nodes.set(e, d);
			}
			const [f, p] = r.table.origin(i.slot);
			const m = {
				r: (f + .5) / q,
				g: (p + .5) / q,
				b: u.level + 1 + 16 * u.face,
				a: u.ix * 2048 + u.iz + 1
			};
			const h = [
				Infinity,
				Infinity,
				Infinity
			], g = [
				-Infinity,
				-Infinity,
				-Infinity
			];
			for (let e = 0; e <= 4; e++) for (let t = 0; t <= 4; t++) for (const n of [i.min, i.max]) {
				D(s, c, u, t / 4, e / 4, n, l);
				for (let e = 0; e < 3; e++) {
					h[e] = Math.min(h[e], l[e]);
					g[e] = Math.max(g[e], l[e]);
				}
			}
			const _ = {
				x: h[0],
				y: h[1],
				z: h[2]
			};
			const v = {
				x: Math.max(g[0] - h[0], .001),
				y: Math.max(g[1] - h[1], .001),
				z: Math.max(g[2] - h[2], .001)
			};
			const y = a.get(d, o);
			if (y.position.x !== _.x || y.position.y !== _.y || y.position.z !== _.z || y.scale.x !== v.x || y.scale.y !== v.y || y.scale.z !== v.z) a.insert(d, o, {
				...y,
				position: _,
				scale: v
			});
			const b = a.tryGet(d, t);
			if (!b || !b.enabled || b.color.r !== m.r || b.color.g !== m.g || b.color.b !== m.b || b.color.a !== m.a || b.material !== r.instance) a.insert(d, t, {
				...b ?? {},
				mesh: r.mesh,
				material: r.instance,
				lit: true,
				opaque: true,
				cullBackfaces: true,
				color: m,
				enabled: true
			});
		}
	}
	destroy(e, t) {
		t.epoch++;
		this.dropSea(e, t);
		C(e).clear(t);
		const n = e.world;
		for (const e of [...t.nodes.values(), ...t.spare]) if (n.valid(e)) n.despawn(e);
		t.nodes.clear();
		t.spare.length = 0;
		t.wanted.clear();
		const r = u();
		for (const e of [t.heights, t.paint]) {
			if (!e) continue;
			d(e);
			r?.releaseTexture(e);
		}
		if (t.instance) m.release(t.instance);
		if (t.mesh && e.hasResource(c)) e.getResource(c).releaseBuiltMesh(t.mesh);
		E(t.arrays);
		t.arrays = [];
		t.packed = "";
		t.instance = t.mesh = t.heights = t.paint = 0;
		t.table.clear();
	}
};
/** The last place asked of a provider, and what it said: a generated world reads the height, the paint and each field of one point in turn. */
let Q = null;
/** The provider's answer for one direction, from its last answer where it is the same place; null while it answers later. */
function $(e, t, n, r) {
	const i = `${t},${n},${r}`;
	if (Q && Q.source === e && Q.key === i) return Q.got;
	const a = e.provider.sample({
		world: e.world,
		seed: e.seed,
		version: e.version,
		radius: e.radius,
		directions: Float32Array.of(t, n, r),
		count: 1
	});
	if (a instanceof Promise) return null;
	Q = {
		source: e,
		key: i,
		got: a
	};
	return a;
}
/** What, changed, makes the planet again: everything but the colours and the wander, which are read each frame. */
function ve(e) {
	return JSON.stringify([
		e.radius,
		e.provider,
		e.world,
		e.generatorVersion,
		e.seed,
		e.cellSize,
		e.detail
	]);
}
const ye = new Z();
//#endregion
export { U as a, ye as i, Z as n, ge as o, X as r, I as s, K as t };

//# sourceMappingURL=planetPlugin.js.map