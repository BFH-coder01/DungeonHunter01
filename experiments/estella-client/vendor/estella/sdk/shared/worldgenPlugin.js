import { $t as e, Ct as t, Ft as n, Nt as r, c as i, n as a, qt as o, rn as s } from "./system.js";
import { s as c } from "./resource.js";
import { s as l } from "./logger.js";
import { n as u } from "./AssetPlugin.js";
import { K as d, q as f } from "./scene.js";
import { n as p } from "./planetQuery.js";
import { a as m, i as h, r as g } from "./movers.js";
import { R as _, o as v, z as y } from "./terrainPlugin.js";
import { a as b, i as x, n as S, o as ee, r as te } from "./planetPages.js";
import { n as C, r as ne, t as w } from "./planPool.js";
import { c as re, d as ie, f as ae, g as oe, m as se, n as ce, r as le, t as ue } from "./lodDistance.js";
import { i as de, n as fe } from "./sceneOrigins.js";
//#region src/worldgen/fields.ts
/**
* @file    fields.ts
* @brief   The environment a world is laid out by: numbers read anywhere in it, the same for the same seed on every machine.
*
* @details A field is a function of the world position. The ground's (`height`, `up`, `slope`) and the water's (`waterDepth`, and
*          `shoreDistance`: how far a dry place is from the water's edge, negative in the water) are
*          read from the terrain and the water; `moisture`, `temperature` and `rock` are seeded noise, slow across the world; a game
*          adds fields of its own. A zone may set a field over its area, blended in by its weight, so a designer can make a wet hollow
*          or a dry clearing by hand. Nothing here depends on what is loaded or in what order it was asked.
*/
const pe = {
	moisture: {
		scale: 900,
		octaves: 4
	},
	temperature: {
		scale: 2400,
		octaves: 3
	},
	rock: {
		scale: 500,
		octaves: 4
	}
};
/** A stable 32-bit hash of integers, as a number in [0, 1). */
function T(...e) {
	let t = -1640531527;
	for (const n of e) {
		t = Math.imul(t ^ (n | 0), 2246822507);
		t = t ^ t >>> 13 | 0;
		t = Math.imul(t, 3266489909);
		t = t ^ t >>> 16 | 0;
	}
	return (t >>> 0) / 4294967296;
}
/** A stable hash of a string, for mixing a name into a seed. */
function E(e) {
	let t = -2128831035;
	for (let n = 0; n < e.length; n++) t = Math.imul(t ^ e.charCodeAt(n), 16777619);
	return t | 0;
}
/** Fractal value noise in three dimensions, 0 to 1: what a round world's slow fields are read from, which has no seam and no pole. */
function me(e, t, n, r, i) {
	let a = 0, o = 0, s = 1, c = 1;
	for (let l = 0; l < i; l++) {
		a += ge(e * c, t * c, n * c, r + l * 131) * s;
		o += s;
		s *= .5;
		c *= 2;
	}
	return a / o;
}
function he(e, t, n, r) {
	return T(e, t, n, r);
}
/** Smooth value noise in three dimensions, 0 to 1, at a point measured in lattice cells. */
function ge(e, t, n, r) {
	const i = Math.floor(e), a = Math.floor(t), o = Math.floor(n);
	const s = e - i, c = t - a, l = n - o;
	const u = s * s * (3 - 2 * s), d = c * c * (3 - 2 * c), f = l * l * (3 - 2 * l);
	const p = (e, t, n) => he(i + e, a + t, o + n, r);
	const m = p(0, 0, 0) + (p(1, 0, 0) - p(0, 0, 0)) * u, h = p(0, 1, 0) + (p(1, 1, 0) - p(0, 1, 0)) * u;
	const g = p(0, 0, 1) + (p(1, 0, 1) - p(0, 0, 1)) * u, _ = p(0, 1, 1) + (p(1, 1, 1) - p(0, 1, 1)) * u;
	const v = m + (h - m) * d;
	return v + (g + (_ - g) * d - v) * f;
}
/** Fractal value noise, 0 to 1. */
function D(e, t, n, r) {
	let i = 0, a = 0, o = 1, s = 1;
	for (let c = 0; c < r; c++) {
		i += y(e * s, t * s, n + c * 131)[0] * o;
		a += o;
		o *= .5;
		s *= 2;
	}
	return i / a;
}
/** Samples the environment. */
var O = class {
	constructor(e) {
		this.inputs = e;
		this.seeds_ = {};
		this.noise_ = { ...pe };
		for (const [t, n] of Object.entries(e.noise ?? {})) if (n) this.noise_[t] = n;
		for (const t of Object.keys(this.noise_)) this.seeds_[t] = e.seed * 7919 ^ E(t);
	}
	/**
	* Every field at (x, z), each worked out the first time it is read and not before: a biome reads three or four of the dozen, and a candidate asks
	* of every biome, so working all of them out for each was most of what laying out a world cost.
	*/
	sample(e, t) {
		const n = {};
		const r = (e, t) => {
			let r = false, i = 0;
			Object.defineProperty(n, e, {
				enumerable: true,
				configurable: true,
				get: () => {
					if (!r) {
						i = t();
						r = true;
					}
					return i;
				},
				set: (e) => {
					i = e;
					r = true;
				}
			});
		};
		let i;
		const a = () => i === void 0 ? i = this.inputs.ground(e, t) : i;
		r("height", () => a()?.y ?? NaN);
		r("up", () => a()?.up ?? 1);
		r("slope", () => 1 - (a()?.up ?? 1));
		r("waterDepth", () => {
			const n = a();
			return n && this.inputs.waterDepth ? this.inputs.waterDepth(e, t, n.y) ?? -Infinity : -Infinity;
		});
		r("shoreDistance", () => this.inputs.shoreDistance?.(e, t) ?? Infinity);
		for (const [n, i] of Object.entries(this.noise_)) {
			const a = Math.max(i.scale, 1e-6), o = Math.max(1, i.octaves ?? 3);
			if (this.inputs.space) r(n, () => {
				const r = this.inputs.space(e, t);
				return me(r[0] / a, r[1] / a, r[2] / a, this.seeds_[n], o);
			});
			else r(n, () => D(e / a, t / a, this.seeds_[n], o));
		}
		for (const [i, a] of Object.entries(this.inputs.fields ?? {})) r(i, () => a(e, t, n));
		for (const r of this.inputs.overrides?.(e, t) ?? []) {
			const e = n[r.field] ?? r.value;
			n[r.field] = e + (r.value - e) * Math.min(Math.max(r.weight, 0), 1);
		}
		return n;
	}
};
//#endregion
//#region src/worldgen/rules.ts
const _e = /* @__PURE__ */ new Map();
let ve = 0;
/**
* Makes `rules` available to every WorldGen that names them; a second set under the same id replaces the first. A WorldGen waiting
* for its rules (a script registers them after the scene loaded) is laid out once they are here.
*/
function ye(e) {
	_e.set(e.id, e);
	ve++;
}
/** @internal Bumped on every registration, so what named rules that were missing asks again. */
function be() {
	return ve;
}
function xe(e) {
	return _e.get(e);
}
/** The weight of a soft band at `v`. */
function Se(e, t) {
	if (!Number.isFinite(t)) return 0;
	const n = Math.max(e.blend ?? 0, 1e-9);
	const r = (e) => {
		if (e <= 0) return 1;
		if (e >= n) return 0;
		const t = 1 - e / n;
		return t * t * (3 - 2 * t);
	};
	return r(e.min !== void 0 ? e.min - t : -1) * r(e.max !== void 0 ? t - e.max : -1);
}
//#endregion
//#region src/worldgen/grounding.ts
/** Shared by file validation and direct callers; bad grids must never cause unbounded sampling. */
function k(e) {
	if (!e || !Array.isArray(e.size) || e.size.length !== 2 || e.size.some((e) => !Number.isFinite(e) || e <= 0)) throw new Error("grounding.size: two positive model dimensions");
	if (![
		3,
		5,
		7,
		9
	].includes(e.samples ?? 5)) throw new Error("grounding.samples: 3, 5, 7 or 9");
	if (![
		"highest",
		"lowest",
		"mean",
		"center"
	].includes(e.mode ?? "highest")) throw new Error("grounding.mode: highest, lowest, mean or center");
	if (e.maxRelief !== void 0 && (!Number.isFinite(e.maxRelief) || e.maxRelief < 0)) throw new Error("grounding.maxRelief: a nonnegative world distance");
	if (e.offset !== void 0 && !Number.isFinite(e.offset)) throw new Error("grounding.offset: a finite model distance");
}
/**
* Samples the same ground used by the plan, without changing it. Positive yaw follows the engine's +Y quaternion rotation.
* A supported site is a finite grid test, not a proof about features smaller than its sample spacing. Use maxRelief no greater
* than the model's foundation depth, or level the accepted site with a WorldZone before placing an authored building.
*/
function Ce(e, t, n, r, i, a, o = {}) {
	k(a);
	if (![
		t,
		n,
		r,
		i
	].every(Number.isFinite) || i <= 0) throw new Error("grounding transform: finite position, yaw and positive scale");
	const s = a.samples ?? 5, c = Math.cos(r), l = Math.sin(r);
	let u = Infinity, d = -Infinity, f = 0, p = 0;
	for (let r = 0; r < s; r++) for (let m = 0; m < s; m++) {
		const h = (m / (s - 1) - .5) * a.size[0] * i;
		const g = (r / (s - 1) - .5) * a.size[1] * i;
		const _ = t + h * c + g * l, v = n - h * l + g * c;
		const y = e.ground(_, v);
		if (!y || !Number.isFinite(y.y) || !Number.isFinite(y.up)) return {
			ok: false,
			reason: "noGround"
		};
		if (y.up < (o.minUp ?? 0)) return {
			ok: false,
			reason: "slope"
		};
		const b = e.waterDepth?.(_, v, y.y) ?? 0;
		if (!Number.isFinite(b)) return {
			ok: false,
			reason: "noGround"
		};
		if (b > (o.waterDepth ?? 0)) return {
			ok: false,
			reason: "water"
		};
		u = Math.min(u, y.y);
		d = Math.max(d, y.y);
		f += y.y;
		if (m === (s - 1) / 2 && r === (s - 1) / 2) p = y.y;
	}
	const m = d - u, h = f / (s * s);
	if (m > (a.maxRelief ?? Infinity)) return {
		ok: false,
		reason: "relief"
	};
	const g = {
		highest: d,
		lowest: u,
		mean: h,
		center: p
	}[a.mode ?? "highest"] + (a.offset ?? 0) * i;
	return {
		ok: true,
		fit: {
			y: g,
			min: u,
			max: d,
			mean: h,
			relief: m,
			supportDepth: Math.max(0, g - u),
			buriedDepth: Math.max(0, d - g),
			samples: s * s
		}
	};
}
//#endregion
//#region src/worldgen/plan.ts
/**
* @file    plan.ts
* @brief   Where everything in a world stands: biomes from the fields, groups from the recipes, layer by layer, the same whatever is
*          asked first.
*
* @details Every answer is a function of the world position, the seed and the rules, so a chunk placed before its neighbour and one
*          placed after it agree, and a server and a client agree.
*
*            - Each layer has one candidate a cell of a grid `spacing` apart, jittered, with a priority drawn for it. A candidate takes
*              a biome by the weights there (so a border mixes), a recipe of that biome by its density, and must have ground, not be
*              too steep or under water, not be kept out by a zone, and keep clear of the footprints of the layers before it.
*            - Of two candidates of a layer whose groups would overlap, the one with the higher priority stands. Each candidate looks
*              only at its neighbours, so nothing depends on the order chunks are made in.
*            - A group's members are placed round its anchor and checked the same way; a member that cannot stand is left out.
*            - A group belongs to the chunk its anchor stands in, members and all, so a group across a chunk's edge is neither cut nor
*              placed twice.
*            - Ids are made of the layer, the grid cell, the recipe and the member, with their versions: never a position in a list.
*/
/** Entries a cache holds before it is emptied: a source walking for ever does not grow it without end. */
const we = 4e4;
function Te(e) {
	let t = A(e.anchor, e.anchor.scale?.[1] ?? 1);
	for (const n of e.members ?? []) t = Math.max(t, (n.ring?.[1] ?? 0) + A(n, n.scale?.[1] ?? 1));
	return t;
}
/** A fitted base cannot reach beyond its reservation, even if the authored radius is smaller. */
function A(e, t) {
	return Math.max(e.footprint * (e.scaleFootprint ? Math.abs(t) : 1), e.grounding ? Math.hypot(...e.grounding.size) * Math.abs(t) / 2 : 0);
}
const j = (e, t, n) => e ? e[0] + (e[1] - e[0]) * t : n;
/** One world's plan. */
var M = class {
	constructor(e, t, n, r, i) {
		this.rules = e;
		this.env = t;
		this.zones = n;
		this.seed = r;
		this.world = i;
		this.recipes_ = /* @__PURE__ */ new Map();
		this.layers_ = [];
		this.viable_ = /* @__PURE__ */ new Map();
		this.groups_ = /* @__PURE__ */ new Map();
		this.worldHash_ = E(i) ^ r;
		for (const t of e.recipes) this.recipes_.set(t.id, t);
		for (const t of e.layers) {
			const n = /* @__PURE__ */ new Set();
			for (const r of e.biomes) for (const e of r.recipes) if (e.layer === t.id) n.add(e.recipe);
			let r = 0;
			for (const e of n) {
				const t = this.recipes_.get(e);
				if (t) r = Math.max(r, Te(t));
			}
			this.layers_.push({
				def: t,
				hash: E(t.id),
				maxRadius: r,
				recipes: n
			});
		}
	}
	/** Forgets what was worked out: the ground, the water or the zones changed. */
	invalidate() {
		this.viable_.clear();
		this.groups_.clear();
	}
	/** The layer's index by id, or -1. */
	layerIndex(e) {
		return this.layers_.findIndex((t) => t.def.id === e);
	}
	/** The weight of every biome that holds at (x, z), summing to 1 (empty where none does), heaviest first. */
	biomeWeights(e, t) {
		const n = [];
		let r = 0;
		for (const i of this.rules.biomes) {
			const a = this.biomeWeight(i, e, t);
			if (a > 0) {
				n.push({
					biome: i.id,
					weight: a
				});
				r += a;
			}
		}
		for (const { zone: i, weight: a } of this.zones.at(e, t)) {
			if (!i.biome) continue;
			for (const e of n) e.weight *= 1 - a;
			r = r * (1 - a) + a;
			const e = n.find((e) => e.biome === i.biome);
			if (e) e.weight += a;
			else n.push({
				biome: i.biome,
				weight: a
			});
			break;
		}
		if (r <= 0) return [];
		for (const e of n) e.weight /= r;
		return n.filter((e) => e.weight > 0).sort((e, t) => t.weight - e.weight || (e.biome < t.biome ? -1 : 1));
	}
	/** The biome that holds most at (x, z), or null. */
	biomeAt(e, t) {
		return this.biomeWeights(e, t)[0]?.biome ?? null;
	}
	/** The ground's paint at (x, z): `base` (grass, dirt, snow, rock) pulled toward each biome's paint by its weight and strength. */
	paint(e, t, n) {
		let r = n.length;
		const i = this.biomeWeights(e, t);
		for (const { biome: e } of i) r = Math.max(r, this.rules.biomes.find((t) => t.id === e)?.paint?.length ?? 0);
		const a = Array.from({ length: r }, (e, t) => n[t] ?? 0);
		for (const { biome: e, weight: t } of i) {
			const i = this.rules.biomes.find((t) => t.id === e);
			if (!i?.paint) continue;
			const o = t * Math.min(Math.max(i.paintStrength ?? 1, 0), 1);
			for (let e = 0; e < r; e++) a[e] = a[e] + ((i.paint[e] ?? 0) - (n[e] ?? 0)) * o;
		}
		const o = a.reduce((e, t) => e + t, 0) || 1;
		return a.map((e) => e / o);
	}
	/** The groups of layer `layer` whose anchors stand in [x0, x1) by [z0, z1). */
	groupsIn(e, t, n, r, i) {
		const a = this.layerIndex(e);
		if (a < 0) return [];
		const o = this.layers_[a].def.spacing;
		const s = [];
		for (let e = Math.floor(n / o); e <= Math.floor(i / o); e++) for (let c = Math.floor(t / o); c <= Math.floor(r / o); c++) {
			const o = this.group(a, c, e);
			if (typeof o !== "string" && o.x >= t && o.x < r && o.z >= n && o.z < i) s.push(o);
		}
		return s;
	}
	/** Every placement of the given layers (all, by default) whose group's anchor stands in the square. */
	placementsIn(e, t, n, r, i) {
		const a = [];
		for (const o of this.layers_) {
			if (i && !i.includes(o.def.id)) continue;
			for (const i of this.groupsIn(o.def.id, e, t, n, r)) a.push(i.anchor, ...i.members);
		}
		return a;
	}
	/** How many candidates of a layer in the square stood, and why the rest did not. */
	stats(e, t, n, r, i) {
		const a = {
			placed: 0,
			noBiome: 0,
			density: 0,
			noGround: 0,
			slope: 0,
			water: 0,
			relief: 0,
			zone: 0,
			occupied: 0,
			conflict: 0
		};
		const o = this.layerIndex(e);
		if (o < 0) return a;
		const s = this.layers_[o].def.spacing;
		for (let e = Math.floor(n / s); e < Math.ceil(i / s); e++) for (let n = Math.floor(t / s); n < Math.ceil(r / s); n++) {
			const t = this.group(o, n, e);
			if (typeof t === "string") a[t]++;
			else a.placed++;
		}
		return a;
	}
	/** Everything that decided what stands at (x, z): the fields, the biomes, the zones, and each layer's candidate in that cell. */
	explain(e, t) {
		const n = this.layers_.map((n, r) => {
			const i = Math.floor(e / n.def.spacing), a = Math.floor(t / n.def.spacing);
			const o = this.group(r, i, a);
			const s = this.viable(r, i, a);
			return {
				layer: n.def.id,
				cell: [i, a],
				group: typeof o === "string" ? null : o.id,
				rejected: typeof o === "string" ? o : null,
				detail: s.ok ? void 0 : s.detail
			};
		});
		return {
			fields: this.env.sample(e, t),
			biomes: this.biomeWeights(e, t),
			zones: this.zones.at(e, t).map(({ zone: e, weight: t }) => ({
				id: e.id,
				kind: e.kind,
				weight: t
			})),
			layers: n
		};
	}
	/** The group of layer `li` in grid cell (gx, gz), or why there is none. */
	group(e, t, n) {
		const r = `${e}:${t},${n}`;
		const i = this.groups_.get(r);
		if (i !== void 0) return i;
		if (this.groups_.size > we) this.groups_.clear();
		const a = this.makeGroup(e, t, n);
		this.groups_.set(r, a);
		return a;
	}
	makeGroup(e, t, n) {
		const r = this.viable(e, t, n);
		if (!r.ok) return r.reason;
		const i = r.candidate;
		const a = this.layers_[e];
		const o = a.def.spacing;
		const s = Math.ceil((i.radius + a.maxRadius) / o);
		for (let r = -s; r <= s; r++) for (let a = -s; a <= s; a++) {
			if (a === 0 && r === 0) continue;
			const o = this.viable(e, t + a, n + r);
			if (!o.ok) continue;
			const s = o.candidate;
			if ((s.priority > i.priority || s.priority === i.priority && (s.gz < n || s.gz === n && s.gx < t)) && Math.hypot(s.x - i.x, s.z - i.z) < i.radius + s.radius) return "conflict";
		}
		const c = `${a.def.id}@${a.def.version ?? 1}:${t},${n}`;
		const l = i.recipe;
		const u = i.anchor;
		const d = [];
		const f = [u];
		for (const [r, o] of (l.members ?? []).entries()) {
			const s = (e, i) => T(this.worldHash_, a.hash, t, n, 1e3 + r * 37 + e, i);
			const u = o.count ? o.count[0] + Math.floor(s(0, 0) * (o.count[1] - o.count[0] + 1)) : 1;
			for (let t = 0; t < u; t++) {
				if (o.chance !== void 0 && s(1, t) >= o.chance) continue;
				const n = j(o.arc, s(2, t), s(2, t) * 360) * Math.PI / 180;
				const r = j(o.ring, s(3, t), 0);
				const u = i.x + Math.cos(n) * r, p = i.z + Math.sin(n) * r;
				const m = this.env.sample(u, p);
				const h = this.place(c, a.def, l, o, t, u, p, i.biome, m, s(4, t));
				if (typeof h === "string") continue;
				if (this.zones.excluding(u, p, h.footprint, this.tagsOf(a.def, l, o), this.seed) !== null) continue;
				if (this.occupied(e, u, p, h.footprint) !== null) continue;
				if (f.some((e) => Math.hypot(e.x - u, e.z - p) < e.footprint + h.footprint)) continue;
				d.push(h);
				f.push(h);
			}
		}
		return {
			id: c,
			layer: a.def.id,
			x: i.x,
			z: i.z,
			radius: i.radius,
			priority: i.priority,
			anchor: u,
			members: d
		};
	}
	place(e, t, n, r, i, a, o, s, c, l) {
		const u = this.standing(c, r);
		if (u) return u;
		const d = T(this.worldHash_, E(e), E(r.id), i, 7);
		const f = (l || d) * Math.PI * 2, p = j(r.scale, T(this.worldHash_, E(e), i, 11), 1);
		let m;
		if (r.grounding) {
			const e = Ce(this.env.inputs, a, o, f, p, r.grounding, r);
			if (!e.ok) return e.reason;
			m = e.fit;
		}
		const h = this.env.inputs.ground(a, o);
		const g = h?.up ?? 1;
		const _ = h?.normal ?? [
			0,
			g,
			Math.sqrt(Math.max(0, 1 - g * g))
		];
		return {
			id: `${e}/${n.id}@${n.version}/${r.id}.${i}`,
			group: e,
			layer: t.id,
			recipe: n.id,
			recipeVersion: n.version,
			member: r.id,
			biome: s,
			zone: this.zones.at(a, o)[0]?.zone.id ?? null,
			x: a,
			y: m?.y ?? c.height,
			z: o,
			yaw: f,
			scale: p,
			normal: _,
			attach: r.attach ?? "upright",
			mesh: typeof r.mesh === "number" ? r.mesh : 0,
			material: typeof r.material === "number" ? r.material : 0,
			plant: r.plant ?? null,
			interactive: r.interactive ?? null,
			footprint: A(r, p),
			canopy: (r.canopy ?? r.footprint) * (r.scaleFootprint ? Math.abs(p) : 1),
			far: r.far ?? null,
			...m ? { grounding: m } : {}
		};
	}
	/** Why a member cannot stand on the place whose fields are `f`, or null if it can. */
	standing(e, t) {
		if (!Number.isFinite(e.height)) return "noGround";
		if (e.up < (t.minUp ?? 0)) return "slope";
		if (e.waterDepth > (t.waterDepth ?? 0)) return "water";
		return null;
	}
	tagsOf(e, t, n) {
		return [
			e.id,
			t.id,
			n.interactive ? "interactive" : "decor",
			...t.tags ?? [],
			...n.tags ?? []
		];
	}
	/** The candidate of layer `li` in cell (gx, gz) if it may stand before its own layer's overlaps are settled, or why not. */
	viable(e, t, n) {
		const r = `${e}:${t},${n}`;
		const i = this.viable_.get(r);
		if (i) return i;
		if (this.viable_.size > we) this.viable_.clear();
		const a = this.makeViable(e, t, n);
		this.viable_.set(r, a);
		return a;
	}
	makeViable(e, t, n) {
		const r = this.layers_[e];
		const i = r.def.spacing;
		const a = (e) => T(this.worldHash_, r.hash, t, n, e);
		const o = (t + a(1)) * i, s = (n + a(2)) * i;
		const c = this.biomeWeights(o, s);
		if (c.length === 0) return {
			ok: false,
			reason: "noBiome"
		};
		let l = a(3), u = c[c.length - 1].biome;
		for (const e of c) {
			if (l < e.weight) {
				u = e.biome;
				break;
			}
			l -= e.weight;
		}
		const d = (this.rules.biomes.find((e) => e.id === u)?.recipes ?? []).filter((e) => e.layer === r.def.id && this.recipes_.has(e.recipe));
		let f = a(4), p = null;
		for (const e of d) {
			if (f < e.density) {
				p = this.recipes_.get(e.recipe);
				break;
			}
			f -= e.density;
		}
		if (!p) return {
			ok: false,
			reason: "density"
		};
		const m = this.env.sample(o, s);
		const h = `${r.def.id}@${r.def.version ?? 1}:${t},${n}`;
		const g = this.place(h, r.def, p, p.anchor, 0, o, s, u, m, 0);
		if (typeof g === "string") return {
			ok: false,
			reason: g
		};
		const _ = this.zones.excluding(o, s, g.footprint, this.tagsOf(r.def, p, p.anchor), this.seed);
		if (_) return {
			ok: false,
			reason: "zone",
			detail: _.id
		};
		const v = this.occupied(e, o, s, g.footprint);
		if (v) return {
			ok: false,
			reason: "occupied",
			detail: v
		};
		return {
			ok: true,
			candidate: {
				gx: t,
				gz: n,
				x: o,
				z: s,
				priority: a(5),
				biome: u,
				recipe: p,
				radius: Te(p),
				anchor: g
			}
		};
	}
	/** The id of a placement of an earlier layer whose footprint a footprint of `radius` at (x, z) would overlap, or null. */
	occupied(e, t, n, r) {
		for (let i = 0; i < e; i++) {
			const e = this.layers_[i];
			if (e.def.occupies === false) continue;
			const a = e.def.spacing, o = r + e.maxRadius;
			for (let e = Math.floor((n - o) / a); e <= Math.floor((n + o) / a); e++) for (let s = Math.floor((t - o) / a); s <= Math.floor((t + o) / a); s++) {
				const a = this.group(i, s, e);
				if (typeof a === "string") continue;
				for (const e of [a.anchor, ...a.members]) if (Math.hypot(e.x - t, e.z - n) < e.footprint + r) return e.id;
			}
		}
		return null;
	}
	biomeWeight(e, t, n) {
		const r = e.transition ?? 0;
		let i = t, a = n;
		if (r > 0) {
			const o = E(e.id) ^ this.worldHash_;
			i += (D(t / r, n / r, o, 2) - .5) * 2 * r;
			a += (D(t / r, n / r, o + 1, 2) - .5) * 2 * r;
		}
		const o = this.env.sample(i, a);
		let s = e.weight ?? 1;
		for (const t of e.conditions) {
			s *= Se(t, o[t.field] ?? NaN);
			if (s <= 0) return 0;
		}
		return s;
	}
};
//#endregion
//#region src/worldgen/facePlan.ts
/**
* @file    facePlan.ts
* @brief   The plan of one face of a planet's world, made the same way on the main thread and on a worker.
*
* @details A face's plan is a function of the rules, the seed, the world's name, the sea, the face's zones and what the planet's provider says. Where it is made
*          is not part of that: the main thread makes it for painting the ground, a worker makes it to place what grows, and the two must agree, so there is
*          one place that makes it.
*/
/** The far rules for `rules`: each layer with a `farSpacing` spaced that many times further; null when none has one. */
function Ee(e) {
	if (!e.layers.some((e) => (e.farSpacing ?? 1) > 1)) return null;
	return {
		...e,
		layers: e.layers.map((e) => (e.farSpacing ?? 1) > 1 ? {
			...e,
			spacing: e.spacing * e.farSpacing
		} : e)
	};
}
/** A face's plan, and the far one. */
function De(e, t) {
	const n = {};
	t.layers.forEach((t, r) => {
		n[`paint.${t}`] = (t, n) => e.paintAt(t, n)?.[r] ?? 0;
	});
	t.fieldNames.forEach((t, r) => {
		n[t] = (t, n) => e.fieldsAt(t, n)?.[r] ?? 0;
	});
	const r = new O({
		seed: t.seed,
		noise: t.rules.noise,
		fields: {
			...n,
			...t.rules.fields
		},
		...e.environment(),
		waterDepth: (e, n, r) => t.seaLevel - r,
		overrides: (e, n) => {
			const r = [];
			for (const { zone: i, weight: a } of t.zones.at(e, n)) for (const [e, t] of Object.entries(i.fields ?? {})) r.push({
				field: e,
				value: t,
				weight: a
			});
			return r;
		}
	});
	const i = `${t.world}#${e.face}`;
	return {
		plan: new M(t.rules, r, t.zones, t.seed, i),
		farPlan: t.farRules ? new M(t.farRules, r, t.zones, t.seed, i) : null
	};
}
//#endregion
//#region src/worldgen/planePlan.ts
/**
* @file    planePlan.ts
* @brief   The plan of a world on a plane (a terrain of x and z), made the same way on the main thread and on a worker.
*
* @details A plane's plan reads the ground (its height, its normal, how it is painted) and the water (how deep it stands, how far a point is from the shore).
*          Both are asked through two small interfaces, so the main thread can give it the terrain and the water it has and a worker the same answers rebuilt
*          from the data they were sent: one function makes the plan, and where it is made is not part of what it places.
*/
/** A plane's plan, and the far one. */
function Oe(e) {
	const t = {};
	if (e.ground) e.layers.forEach((n, r) => {
		t[`paint.${n}`] = (t, n) => e.ground.paintAt(t, n)?.[r] ?? 0;
	});
	const n = new O({
		seed: e.seed,
		noise: e.rules.noise,
		fields: {
			...t,
			...e.rules.fields
		},
		ground: (t, n) => {
			if (e.ground) {
				const r = e.ground.heightAt(t, n);
				if (r === null) return null;
				const i = e.ground.normalAt(t, n) ?? [
					0,
					1,
					0
				];
				return {
					y: r,
					up: i[1],
					normal: i
				};
			}
			return {
				y: e.flatY,
				up: 1,
				normal: [
					0,
					1,
					0
				]
			};
		},
		waterDepth: (t, n, r) => e.water?.depthAt(t, n, r) ?? null,
		shoreDistance: (t, n) => e.water?.shoreAt(t, n) ?? null,
		overrides: (t, n) => {
			const r = [];
			for (const { zone: i, weight: a } of e.zones.at(t, n)) for (const [e, t] of Object.entries(i.fields ?? {})) r.push({
				field: e,
				value: t,
				weight: a
			});
			return r;
		}
	});
	return {
		plan: new M(e.rules, n, e.zones, e.seed, e.world),
		farPlan: e.farRules ? new M(e.farRules, n, e.zones, e.seed, e.world) : null
	};
}
//#endregion
//#region src/worldgen/zones.ts
/**
* @file    zones.ts
* @brief   Areas a world is planned by: a home, a road, a landing site, a building's footprint, a view kept open.
*
* @details A zone has a shape, a kind, a priority and an edge that fades over `falloff` world units. Over its area it can keep out what
*          is placed (everything, or what carries one of the tags it names), hold a biome, and set fields; at its edge each of those
*          fades, and what it keeps out thins rather than stopping on a line. Where zones overlap the higher priority holds the biome.
*          A game adds zones as it plans (a reserved home) and as the player builds; authored ones come from `WorldZone` components.
*/
/** How far (x, z) is outside a zone's outline: negative inside. */
function ke(e, t, n) {
	if (e.type === "circle") return Math.hypot(t - e.x, n - e.z) - e.radius;
	const r = Math.cos(-(e.yaw ?? 0)), i = Math.sin(-(e.yaw ?? 0));
	const a = t - e.x, o = n - e.z;
	const s = Math.abs(a * r - o * i) - e.halfX, c = Math.abs(a * i + o * r) - e.halfZ;
	return Math.hypot(Math.max(s, 0), Math.max(c, 0)) + Math.min(Math.max(s, c), 0);
}
/** How much of a zone holds at a point `d` outside its outline: 1 inside, fading smoothly to 0 at `falloff`. */
function Ae(e, t) {
	if (t <= 0) return 1;
	if (e.falloff <= 0 || t >= e.falloff) return 0;
	const n = 1 - t / e.falloff;
	return n * n * (3 - 2 * n);
}
/** The square a zone reaches, its edge included: [minX, minZ, maxX, maxZ]. */
function je(e) {
	const t = e.shape;
	const n = (t.type === "circle" ? t.radius : Math.hypot(t.halfX, t.halfZ)) + Math.max(e.falloff, 0);
	return [
		t.x - n,
		t.z - n,
		t.x + n,
		t.z + n
	];
}
/** The zones of one world. */
var N = class {
	constructor() {
		this.zones_ = /* @__PURE__ */ new Map();
		this.listeners_ = /* @__PURE__ */ new Set();
		this.revision = 0;
		this.onChange = null;
	}
	/** Listens alongside other consumers; the returned function stops listening. */
	subscribe(e) {
		this.listeners_.add(e);
		return () => {
			this.listeners_.delete(e);
		};
	}
	changed(e) {
		const t = je(e);
		this.onChange?.(t, e);
		for (const n of this.listeners_) n(t, e);
	}
	set(e) {
		const t = this.zones_.get(e.id);
		if (t && JSON.stringify(t) === JSON.stringify(e)) return;
		this.zones_.set(e.id, e);
		this.revision++;
		if (t) this.changed(t);
		this.changed(e);
	}
	delete(e) {
		const t = this.zones_.get(e);
		if (!t) return;
		this.zones_.delete(e);
		this.revision++;
		this.changed(t);
	}
	get(e) {
		return this.zones_.get(e);
	}
	all() {
		return this.zones_.values();
	}
	/** The zones that hold at (x, z), with how much, highest priority first. */
	at(e, t, n = 0) {
		const r = [];
		for (const i of this.zones_.values()) {
			const a = Ae(i, ke(i.shape, e, t) - n);
			if (a > 0) r.push({
				zone: i,
				weight: a
			});
		}
		return r.sort((e, t) => t.zone.priority - e.zone.priority || (e.zone.id < t.zone.id ? -1 : 1));
	}
	/**
	* The zone that keeps out something of radius `radius` carrying `tags` at (x, z), or null. Inside a zone it is kept out; in its
	* edge it is kept out with the zone's weight there, by a draw fixed for that place, so the edge thins instead of ending on a line.
	*/
	excluding(e, t, n, r, i) {
		for (const { zone: a, weight: o } of this.at(e, t, n)) {
			if (!a.excludes.some((e) => e === "*" || r.includes(e))) continue;
			if (o >= 1 || T(i, E(a.id), Math.floor(e * 16), Math.floor(t * 16)) < o) return a;
		}
		return null;
	}
};
//#endregion
//#region src/worldgen/planetSurface.ts
/** The metres a unit of a face's -1 to 1 is, at its middle. */
const P = (e) => e * Math.PI / 4;
/** How wide a face is, in metres across the plane (-half to +half). */
const F = (e) => P(e);
/** Metres between the points of a tile, the cells along its side, and so its side; how many tiles a face keeps. */
const I = 1.5;
const L = I * 32;
const Me = 6e3;
/** One face of a planet as a plane. */
var Ne = class {
	constructor(e, t) {
		this.face = e;
		this.planet = t;
		this.tiles_ = /* @__PURE__ */ new Map();
	}
	facts() {
		return this.planet();
	}
	/** The unit direction from the centre at a point of the plane (beyond the face's edge it carries on over the next). */
	directionAt(e, t) {
		const n = this.facts();
		const r = P(n?.radius ?? 1);
		return x(this.face, e / r, t / r);
	}
	/** The point of the plane under a direction from the centre, or null for a direction that does not face this one. */
	planeOf(e, t, n) {
		const r = this.facts();
		const i = ee(this.face, e, t, n);
		if (!r || !i) return null;
		const a = P(r.radius);
		return {
			x: i.u * a,
			z: i.v * a
		};
	}
	/** The frame at a point of the plane. */
	frameAt(e, t) {
		const n = this.directionAt(e, t);
		const r = [
			0,
			0,
			0
		], i = [
			0,
			0,
			0
		];
		S(this.face, n, r, i);
		return {
			dir: n,
			eu: r,
			ev: i
		};
	}
	/** The world position of a point of the plane at a height above the radius. */
	world(e, t, n) {
		const r = this.facts();
		const i = this.directionAt(e, n), a = r.radius + t;
		return [
			r.centre[0] + i[0] * a,
			r.centre[1] + i[1] * a,
			r.centre[2] + i[2] * a
		];
	}
	/** The tile of the plane that holds (x, z), read from the provider in one call for all its points; null while the provider answers later. */
	tile(e, t) {
		const n = Math.floor(e / L), r = Math.floor(t / L), i = `${n},${r}`;
		const a = this.tiles_.get(i);
		if (a) {
			this.tiles_.delete(i);
			this.tiles_.set(i, a);
			return a;
		}
		const o = this.facts();
		if (!o?.sampleMany) return null;
		const s = 35;
		const c = /* @__PURE__ */ new Float32Array(3675);
		for (let e = 0; e < s; e++) for (let t = 0; t < s; t++) {
			const i = this.directionAt(n * L + (t - 1) * I, r * L + (e - 1) * I);
			c[(e * s + t) * 3] = i[0];
			c[(e * s + t) * 3 + 1] = i[1];
			c[(e * s + t) * 3 + 2] = i[2];
		}
		const l = o.sampleMany(c, 1225);
		if (!l) return null;
		const u = {
			x0: n * L - I,
			z0: r * L - I,
			n: s,
			heights: l.heights,
			paint: l.paint,
			fields: l.fields,
			fieldCount: o.fieldNames.length
		};
		this.tiles_.set(i, u);
		if (this.tiles_.size > Me) this.tiles_.delete(this.tiles_.keys().next().value);
		return u;
	}
	/** The cell of a tile that holds (x, z), and where in it. */
	cellOf(e, t, n) {
		const r = (t - e.x0) / I, i = (n - e.z0) / I;
		const a = Math.min(Math.max(Math.floor(r), 0), e.n - 2), o = Math.min(Math.max(Math.floor(i), 0), e.n - 2);
		return {
			i: a,
			j: o,
			fx: Math.min(Math.max(r - a, 0), 1),
			fz: Math.min(Math.max(i - o, 0), 1)
		};
	}
	/** The ground's height above the radius at (x, z), filtered between the tile's points; null where it cannot be said yet. */
	heightAt(e, t) {
		const n = this.tile(e, t);
		if (!n) return null;
		const { i: r, j: i, fx: a, fz: o } = this.cellOf(n, e, t), s = n.n, c = n.heights;
		const l = c[i * s + r], u = c[i * s + r + 1], d = c[(i + 1) * s + r], f = c[(i + 1) * s + r + 1];
		return (l + (u - l) * a) * (1 - o) + (d + (f - d) * a) * o;
	}
	/** The planet's layers' paint at (x, z) from the provider (the nearest point of its tile), or null where it does not paint or cannot say yet. */
	paintAt(e, t) {
		const n = this.tile(e, t);
		if (!n?.paint) return null;
		const { i: r, j: i, fx: a, fz: o } = this.cellOf(n, e, t), s = (i + (o > .5 ? 1 : 0)) * n.n + r + (a > .5 ? 1 : 0);
		return [
			n.paint[s * 4],
			n.paint[s * 4 + 1],
			n.paint[s * 4 + 2],
			n.paint[s * 4 + 3]
		];
	}
	/** The provider's own fields at (x, z), filtered between the tile's points; null where it has none or cannot say yet. */
	fieldsAt(e, t) {
		const n = this.tile(e, t);
		if (!n?.fields || n.fieldCount === 0) return null;
		const { i: r, j: i, fx: a, fz: o } = this.cellOf(n, e, t), s = n.fieldCount, c = n.n;
		const l = [];
		for (let e = 0; e < s; e++) {
			const t = n.fields[(i * c + r) * s + e], u = n.fields[(i * c + r + 1) * s + e], d = n.fields[((i + 1) * c + r) * s + e], f = n.fields[((i + 1) * c + r + 1) * s + e];
			l.push((t + (u - t) * a) * (1 - o) + (d + (f - d) * a) * o);
		}
		return l;
	}
	/** The ground under a point of the plane: its height above the radius, how much it faces away from the centre, and its normal along the plane's x, up and z. */
	ground(e, t) {
		const n = this.heightAt(e, t);
		if (n === null) return null;
		const r = I;
		const i = this.heightAt(e - r, t), a = this.heightAt(e + r, t), o = this.heightAt(e, t - r), s = this.heightAt(e, t + r);
		if (i === null || a === null || o === null || s === null) return {
			y: n,
			up: 1,
			normal: [
				0,
				1,
				0
			]
		};
		const c = 2 * r;
		const l = -(a - i) / c, u = -(s - o) / c;
		const d = Math.hypot(l, 1, u);
		return {
			y: n,
			up: 1 / d,
			normal: [
				l / d,
				1 / d,
				u / d
			]
		};
	}
	/** What a plane normal is in the world: along the frame's x, up and z. */
	worldNormal(e, t, n) {
		const r = this.frameAt(t, n);
		return [
			e[0] * r.eu[0] + e[1] * r.dir[0] + e[2] * r.ev[0],
			e[0] * r.eu[1] + e[1] * r.dir[1] + e[2] * r.ev[1],
			e[0] * r.eu[2] + e[1] * r.dir[2] + e[2] * r.ev[2]
		];
	}
	/** The environment's inputs for this face: the ground, and the noise read in three dimensions from the point's place on the sphere. */
	environment() {
		return {
			ground: (e, t) => this.ground(e, t),
			space: (e, t) => {
				const n = this.facts();
				const r = this.directionAt(e, t);
				return [
					r[0] * n.radius,
					r[1] * n.radius,
					r[2] * n.radius
				];
			}
		};
	}
	/** A zone of the world (a circle or a box standing at a world position) as this face's plane has it, or null where its centre is not over this face. */
	zoneOnFace(e) {
		const t = this.facts();
		const n = e.shape;
		if (!t || n.y === void 0) return null;
		const r = n.x - t.centre[0], i = n.y - t.centre[1], a = n.z - t.centre[2];
		const o = Math.hypot(r, i, a);
		if (o < 1e-9) return null;
		const s = this.planeOf(r / o, i / o, a / o);
		const c = F(t.radius);
		const l = (n.type === "circle" ? n.radius : Math.hypot(n.halfX, n.halfZ)) + e.falloff;
		if (!s || Math.abs(s.x) > c + l || Math.abs(s.z) > c + l) return null;
		if (n.type === "circle") return {
			...e,
			shape: {
				type: "circle",
				x: s.x,
				z: s.z,
				radius: n.radius
			}
		};
		const u = this.frameAt(s.x, s.z);
		const d = n.facing ?? [
			Math.cos(n.yaw ?? 0),
			0,
			Math.sin(n.yaw ?? 0)
		];
		const f = Math.atan2(d[0] * u.ev[0] + d[1] * u.ev[1] + d[2] * u.ev[2], d[0] * u.eu[0] + d[1] * u.eu[1] + d[2] * u.eu[2]);
		return {
			...e,
			shape: {
				type: "rect",
				x: s.x,
				z: s.z,
				halfX: n.halfX,
				halfZ: n.halfZ,
				yaw: f
			}
		};
	}
	/** The streaming sources, in this face's plane (those over it, and over its neighbours' edges within `reach`). */
	sourcesOnFace(e, t) {
		const n = this.facts();
		const r = [];
		if (!n) return r;
		const i = F(n.radius);
		for (const a of e) {
			const e = a.x - n.centre[0], o = (a.y ?? 0) - n.centre[1], s = a.z - n.centre[2];
			const c = Math.hypot(e, o, s);
			if (c < 1e-9) continue;
			const l = this.planeOf(e / c, o / c, s / c);
			if (l && Math.abs(l.x) <= i + t && Math.abs(l.z) <= i + t) r.push(l);
		}
		return r;
	}
};
/** The six faces of a planet, as planes. */
function Pe(e) {
	return te.map((t, n) => new Ne(n, e));
}
/** The zones of a world as each face has them: those over it, in its plane. Kept in step by `sync`. */
var Fe = class {
	constructor(e) {
		this.face = e;
		this.zones = new N();
	}
	/** Takes the world's zones, replacing what was there: only what changed touches the plan. */
	sync(e) {
		const t = /* @__PURE__ */ new Set();
		for (const n of e) {
			const e = this.face.zoneOnFace(n);
			if (!e) continue;
			this.zones.set(e);
			t.add(e.id);
		}
		for (const e of [...this.zones.all()]) if (!t.has(e.id)) this.zones.delete(e.id);
	}
};
//#endregion
//#region src/worldgen/plants.ts
function Ie(e) {
	const t = [];
	const n = /* @__PURE__ */ new Map();
	let r = 0, i = 0;
	for (const [a, o] of Object.entries(e)) {
		const e = o.tints && o.tints.length > 0 ? o.tints : [[
			1,
			1,
			1
		]];
		const s = t.length;
		for (const n of e) {
			const e = (e) => ({
				...e,
				tint: [
					e.tint[0] * n[0],
					e.tint[1] * n[1],
					e.tint[2] * n[2],
					e.tint[3]
				]
			});
			t.push({
				parts: o.parts.map(e),
				lodDistance: o.lodDistance,
				...o.lod2Distance === void 0 ? {} : { lod2Distance: o.lod2Distance },
				drawDistance: o.drawDistance,
				far: o.far.map(e),
				farDistance: o.farDistance,
				...o.farKeep === void 0 ? {} : { farKeep: o.farKeep },
				...o.interaction ? { interaction: o.interaction } : {}
			});
		}
		n.set(a, {
			first: s,
			count: e.length,
			scale: o.tintScale ?? 1300,
			seed: E(a),
			sink: o.sink ?? 0,
			unit: o.unit ?? 1
		});
		r = Math.max(r, o.drawDistance, o.far.length > 0 ? o.farDistance : 0);
		if (o.far.length > 0 && o.farDistance > o.drawDistance) i = i > 0 ? Math.min(i, o.farDistance - o.drawDistance) : o.farDistance - o.drawDistance;
	}
	const a = (e) => typeof e === "string" ? n.get(e)?.first : e;
	for (const e of t) if (e.interaction) e.interaction = {
		...e.interaction,
		felledKind: a(e.interaction.felledKind),
		harvestedKind: a(e.interaction.harvestedKind)
	};
	return {
		kinds: t,
		reach: r,
		span: i,
		kindAt(e, t, r) {
			const i = n.get(e);
			if (!i) return -1;
			return i.count === 1 ? i.first : i.first + Math.min(i.count - 1, Math.floor(D(t / i.scale, r / i.scale, i.seed, 1) * i.count));
		},
		sinkOf: (e) => n.get(e)?.sink ?? 0,
		unitOf: (e) => n.get(e)?.unit ?? 1
	};
}
//#endregion
//#region src/worldgen/diffs.ts
var Le = class {
	constructor() {
		this.removed_ = /* @__PURE__ */ new Set();
		this.changed_ = /* @__PURE__ */ new Map();
		this.listeners_ = /* @__PURE__ */ new Set();
		this.revision = 0;
		this.onChange = null;
	}
	/** Listens alongside other consumers; the returned function stops listening. */
	subscribe(e) {
		this.listeners_.add(e);
		return () => {
			this.listeners_.delete(e);
		};
	}
	notify(e) {
		this.onChange?.(e);
		for (const t of this.listeners_) t(e);
	}
	/** Takes a placement out of the world for good (felled, mined, picked up). */
	remove(e) {
		if (this.removed_.has(e)) return;
		this.removed_.add(e);
		this.changed();
		this.notify(e);
	}
	/** Puts a removed placement back (it grew again). */
	restore(e) {
		if (!this.removed_.delete(e)) return;
		this.changed();
		this.notify(e);
	}
	/** Moves, turns or scales a placement. */
	change(e, t) {
		this.changed_.set(e, {
			...this.changed_.get(e),
			...t
		});
		this.changed();
		this.notify(e);
	}
	isRemoved(e) {
		return this.removed_.has(e);
	}
	changeOf(e) {
		return this.changed_.get(e);
	}
	toJSON() {
		return {
			version: 1,
			removed: [...this.removed_].sort(),
			changed: Object.fromEntries([...this.changed_].sort(([e], [t]) => e < t ? -1 : 1))
		};
	}
	/** Replaces every change with a save's. */
	load(e) {
		const t = /* @__PURE__ */ new Set([
			...this.removed_,
			...this.changed_.keys(),
			...e.removed,
			...Object.keys(e.changed)
		]);
		this.removed_.clear();
		this.changed_.clear();
		for (const t of e.removed) this.removed_.add(t);
		for (const [t, n] of Object.entries(e.changed)) this.changed_.set(t, { ...n });
		this.changed();
		for (const e of t) this.notify(e);
	}
	changed() {
		this.revision++;
	}
};
//#endregion
//#region src/worldgen/rulesAsset.ts
/** Whether a WorldGen's `rules` names a file rather than rules registered by code. */
function R(e) {
	return e.endsWith(".esworld") || e.startsWith("@uuid:");
}
const z = (e, t) => {
	throw new Error(`${e}: ${t}`);
};
function B(e, t, n = -Infinity) {
	if (typeof e !== "number" || !Number.isFinite(e) || e < n) z(t, `a number${n > -Infinity ? ` of at least ${n}` : ""}, not ${JSON.stringify(e)}`);
	return e;
}
function V(e, t) {
	if (typeof e !== "string" || e.length === 0) z(t, `a name, not ${JSON.stringify(e)}`);
	return e;
}
function H(e, t) {
	if (e === void 0) return void 0;
	if (!Array.isArray(e) || e.length !== 2) z(t, "two numbers, [least, most]");
	const n = B(e[0], t), r = B(e[1], t);
	if (r < n) z(t, "the least is more than the most");
	return [n, r];
}
function Re(e, t) {
	if (!e || typeof e !== "object") z(t, "a member, an object");
	const n = e;
	const r = n.mesh;
	if (n.scaleFootprint !== void 0 && typeof n.scaleFootprint !== "boolean") z(`${t}.scaleFootprint`, "a boolean");
	if (n.grounding !== void 0) {
		try {
			k(n.grounding);
		} catch (e) {
			z(t, e instanceof Error ? e.message : String(e));
		}
		if (n.attach === "align") z(`${t}.grounding`, "footprint fitting requires an upright member");
	}
	const i = H(n.scale, `${t}.scale`);
	if ((n.grounding || n.scaleFootprint) && i && i[0] <= 0) z(`${t}.scale`, "positive scales for fitted or scaled footprints");
	if (n.plant !== void 0) V(n.plant, `${t}.plant`);
	else if (typeof r !== "string" && typeof r !== "number") z(`${t}.mesh`, "a mesh path, or a plant");
	return {
		...n,
		id: V(n.id, `${t}.id`),
		...r === void 0 ? {} : { mesh: r },
		footprint: B(n.footprint, `${t}.footprint`, 0),
		count: H(n.count, `${t}.count`),
		ring: H(n.ring, `${t}.ring`),
		arc: H(n.arc, `${t}.arc`),
		scale: i
	};
}
function ze(e, t) {
	if (!e || typeof e !== "object") z(t, "a part, an object");
	const n = e;
	const r = n.tint ?? [
		1,
		1,
		1,
		1
	];
	if (!Array.isArray(r) || r.length !== 4) z(`${t}.tint`, "four numbers, red, green, blue and alpha");
	return {
		mesh: V(n.mesh, `${t}.mesh`),
		lod1Mesh: typeof n.lod1Mesh === "string" ? n.lod1Mesh : "",
		...typeof n.lod2Mesh === "string" && n.lod2Mesh !== "" ? { lod2Mesh: n.lod2Mesh } : {},
		material: typeof n.material === "string" ? n.material : "",
		texture: typeof n.texture === "string" ? n.texture : "",
		tint: r.map((e, n) => B(e, `${t}.tint[${n}]`)),
		opaque: n.opaque !== false,
		...n.soft === void 0 ? {} : { soft: Math.min(Math.max(B(n.soft, `${t}.soft`), 0), 1) },
		...n.castShadows === false ? { castShadows: false } : {}
	};
}
function Be(e, t) {
	if (!e || typeof e !== "object") z(t, "a plant, an object");
	const n = e;
	if (!Array.isArray(n.parts) || n.parts.length === 0) z(`${t}.parts`, "at least one part");
	const r = Array.isArray(n.far) ? n.far.map((e, n) => ze(e, `${t}.far[${n}]`)) : [];
	let i;
	if (n.tints !== void 0) {
		if (!Array.isArray(n.tints) || n.tints.length === 0) z(`${t}.tints`, "a list of colourings, each three numbers");
		i = n.tints.map((e, n) => {
			if (!Array.isArray(e) || e.length !== 3) z(`${t}.tints[${n}]`, "three numbers, red, green and blue");
			return e.map((e, r) => B(e, `${t}.tints[${n}][${r}]`));
		});
	}
	return {
		parts: n.parts.map((e, n) => ze(e, `${t}.parts[${n}]`)),
		lodDistance: B(n.lodDistance ?? 0, `${t}.lodDistance`, 0),
		...n.lod2Distance === void 0 ? {} : { lod2Distance: B(n.lod2Distance, `${t}.lod2Distance`, 0) },
		drawDistance: B(n.drawDistance, `${t}.drawDistance`, 0),
		far: r,
		farDistance: r.length > 0 ? B(n.farDistance, `${t}.farDistance`, 0) : 0,
		...n.farKeep === void 0 ? {} : { farKeep: B(n.farKeep, `${t}.farKeep`, .001) },
		...i ? {
			tints: i,
			tintScale: B(n.tintScale ?? 1300, `${t}.tintScale`, 1e-6)
		} : {},
		...n.sink === void 0 ? {} : { sink: B(n.sink, `${t}.sink`) },
		...n.unit === void 0 ? {} : { unit: B(n.unit, `${t}.unit`, 1e-9) }
	};
}
/** Rules from a file's JSON, checked; throws naming the first thing a world could not be laid out from. */
function Ve(e, t = "world rules") {
	if (!e || typeof e !== "object") z(t, "an object");
	const n = e;
	const r = V(n.id, `${t}.id`);
	if (!Array.isArray(n.versions) || n.versions.length === 0) z(`${t}.versions`, "the versions it can make, at least one");
	const i = n.versions.map((e, n) => B(e, `${t}.versions[${n}]`, 1));
	if (!Array.isArray(n.recipes)) z(`${t}.recipes`, "a list");
	const a = n.recipes.map((e, n) => {
		const r = `${t}.recipes[${n}]`;
		const i = e ?? {};
		return {
			...i,
			id: V(i.id, `${r}.id`),
			version: B(i.version, `${r}.version`, 1),
			anchor: Re(i.anchor, `${r}.anchor`),
			members: Array.isArray(i.members) ? i.members.map((e, t) => Re(e, `${r}.members[${t}]`)) : void 0
		};
	});
	let o;
	if (n.plants !== void 0) {
		if (!n.plants || typeof n.plants !== "object" || Array.isArray(n.plants)) z(`${t}.plants`, "an object of plants by name");
		o = {};
		for (const [e, r] of Object.entries(n.plants)) o[e] = Be(r, `${t}.plants.${e}`);
	}
	for (const [e, n] of a.entries()) for (const r of [n.anchor, ...n.members ?? []]) if (r.plant !== void 0 && !o?.[r.plant]) z(`${t}.recipes[${e}].${r.id}.plant`, `no plant ${JSON.stringify(r.plant)} in the file's plants`);
	if (!Array.isArray(n.layers) || n.layers.length === 0) z(`${t}.layers`, "at least one layer");
	const s = n.layers.map((e, n) => {
		const r = `${t}.layers[${n}]`;
		const i = e ?? {};
		return {
			...i,
			id: V(i.id, `${r}.id`),
			spacing: B(i.spacing, `${r}.spacing`, 1e-6),
			drawDistance: B(i.drawDistance, `${r}.drawDistance`, 0),
			...i.farSpacing === void 0 ? {} : { farSpacing: B(i.farSpacing, `${r}.farSpacing`, 1) }
		};
	});
	const c = new Set(a.map((e) => e.id)), l = new Set(s.map((e) => e.id));
	if (!Array.isArray(n.biomes)) z(`${t}.biomes`, "a list");
	return {
		id: r,
		versions: i,
		biomes: n.biomes.map((e, n) => {
			const r = `${t}.biomes[${n}]`;
			const i = e ?? {};
			if (!Array.isArray(i.conditions)) z(`${r}.conditions`, "a list (empty holds everywhere)");
			if (!Array.isArray(i.recipes)) z(`${r}.recipes`, "a list");
			for (const [e, t] of i.recipes.entries()) {
				if (!c.has(t.recipe)) z(`${r}.recipes[${e}].recipe`, `no recipe ${JSON.stringify(t.recipe)} in the file`);
				if (!l.has(t.layer)) z(`${r}.recipes[${e}].layer`, `no layer ${JSON.stringify(t.layer)} in the file`);
				B(t.density, `${r}.recipes[${e}].density`, 0);
			}
			return {
				...i,
				id: V(i.id, `${r}.id`)
			};
		}),
		recipes: a,
		layers: s,
		...o ? { plants: o } : {},
		...n.noise ? { noise: n.noise } : {}
	};
}
/** Loads `.esworld` files as checked world rules. */
var He = class {
	constructor() {
		this.type = "world-rules";
		this.extensions = [".esworld"];
	}
	async load(e, t) {
		const n = await t.loadText(t.catalog.getBuildPath(e));
		return Ve(JSON.parse(n), e);
	}
	unload() {}
};
//#endregion
//#region src/worldgen/worldgenPlugin.ts
/** What a world is laid out on. */
const U = {
	Plane: 0,
	Planet: 1
};
/**
* A generated world: the rules it is laid out by. Presence is the opt-in; what the rules place is published as its children.
*
* @experimental
*/
const W = e("WorldGen", {
	rules: "",
	version: 1,
	world: "",
	seed: 1,
	paintGround: true,
	surface: U.Plane,
	seaLevel: 0
}, { fields: {
	rules: { tooltip: "The rules the world is laid out by: a .esworld file, or the id of rules the game registered with registerWorldRules." },
	version: {
		min: 1,
		step: 1,
		tooltip: "The version of the rules the world was made with. A version the rules no longer have fails the world rather than laying out another one."
	},
	world: { tooltip: "The world (a planet, a level) as the game names it." },
	seed: {
		step: 1,
		tooltip: "Another seed lays out another world by the same rules."
	},
	paintGround: { tooltip: "Whether the biomes paint the terrain." },
	surface: {
		enum: [{
			label: "Plane",
			value: U.Plane
		}, {
			label: "Planet",
			value: U.Planet
		}],
		tooltip: "Plane: laid out over a Terrain. Planet: this entity is also a Planet, and the world is laid out over its six faces."
	},
	seaLevel: {
		shownWhen: {
			field: "surface",
			values: [U.Planet]
		},
		tooltip: "The height of the sea above the planet's radius: ground lower than this is under water."
	}
} });
/** How a `WorldZone` is shaped. */
const G = {
	Circle: 0,
	Box: 1
};
/**
* An area of a generated world planned by hand: kept clear, held to a biome, or both. It follows its entity's position and its turn
* about the vertical.
*
* @experimental
*/
const K = e("WorldZone", {
	kind: "reserve",
	shape: G.Circle,
	radius: 10,
	sizeX: 20,
	sizeZ: 20,
	falloff: 4,
	priority: 0,
	excludes: "*",
	biome: "",
	flatten: false
}, { fields: {
	kind: { tooltip: "What the zone is for (home, road, landing, building, resource, view): the game's own words." },
	shape: { enum: [{
		label: "Circle",
		value: G.Circle
	}, {
		label: "Box",
		value: G.Box
	}] },
	radius: {
		min: 0,
		shownWhen: {
			field: "shape",
			values: [G.Circle]
		},
		tooltip: "The circle's radius, in world units."
	},
	sizeX: {
		min: 0,
		shownWhen: {
			field: "shape",
			values: [G.Box]
		},
		tooltip: "The box's size along its own x."
	},
	sizeZ: {
		min: 0,
		shownWhen: {
			field: "shape",
			values: [G.Box]
		},
		tooltip: "The box's size along its own z."
	},
	falloff: {
		min: 0,
		tooltip: "Over how many world units past the outline the zone fades out: what it keeps out thins there."
	},
	priority: {
		step: 1,
		tooltip: "Where zones overlap, the higher priority holds the biome."
	},
	excludes: { tooltip: "The tags of what the zone keeps out, separated by commas (a layer, a recipe, its tags, decor, interactive); * keeps out everything; empty keeps nothing out." },
	biome: { tooltip: "A biome the zone holds over its area; empty holds none." },
	flatten: { tooltip: "Level the terrain under the zone to the ground's height at its centre, blending back over its falloff: a plot to build on." }
} });
/**
* Marks an entity a generated world placed for the game to interact with. Written by the engine; a scene does not author it.
*
* @experimental
*/
const Ue = e("PlacedObject", {
	id: "",
	kind: ""
});
function q(e) {
	const t = e.getResourceByName?.("Waters");
	return t && typeof t.depthAt === "function" ? t : null;
}
const J = (e, t, n = "") => `worldgen:${e}:${n ? `${n}:` : ""}${t}`;
function We(e, t) {
	const r = de(e, t);
	const i = e.world.tryGet(t, n)?.scene;
	return r !== void 0 && i !== void 0 ? `zone:scene:${JSON.stringify([i, r])}` : `zone:${t}`;
}
const Y = [
	"f0",
	"f1",
	"f2",
	"f3",
	"f4",
	"f5"
];
/** Lets go of a layer's chunks, near and far, on a plane and on every face of a planet. */
function X(e, t, n) {
	const r = h(e);
	for (const e of ["", ...Y]) {
		r.remove(J(t, n, e));
		r.remove(J(t, `${n}:far`, e));
	}
}
/** Run-time access to the generated worlds. */
var Z = class {
	constructor() {
		this.built_ = /* @__PURE__ */ new Map();
		this.app_ = null;
		this.zones_ = /* @__PURE__ */ new Map();
		this.diffs_ = /* @__PURE__ */ new Map();
		this.authored_ = /* @__PURE__ */ new Map();
		this.levelled_ = /* @__PURE__ */ new Map();
		this.objects_ = /* @__PURE__ */ new Map();
	}
	/** The zones of a world (by its name), which a game adds to as it plans and builds. Shared by every WorldGen of that world. */
	zones(e = this.first_()?.data.world ?? "") {
		let t = this.zones_.get(e);
		if (!t) {
			t = new N();
			this.zones_.set(e, t);
		}
		return t;
	}
	/** The changes made to a world (by its name), which a save stores and reads back. */
	diffs(e = this.first_()?.data.world ?? "") {
		let t = this.diffs_.get(e);
		if (!t) {
			t = new Le();
			this.diffs_.set(e, t);
		}
		return t;
	}
	/** A WorldGen's plan, or the first one's: what stands where, asked of anywhere, loaded or not. Null until it is made or if it failed. */
	plan(e) {
		return (e !== void 0 ? this.built_.get(e) : this.first_())?.plan ?? null;
	}
	/** The interactive entity standing for placement `id`, or null where its chunk is not published or the placement is removed. */
	objectOf(e) {
		return this.objects_.get(e) ?? null;
	}
	status(e) {
		const t = this.built_.get(e);
		if (!t) return null;
		const n = {};
		const r = this.app_?.hasResource(g) ? this.app_.getResource(g) : null;
		for (const i of t.rules?.layers ?? []) for (const a of t.faces ? Y : [""]) {
			const t = r?.status(J(e, i.id, a));
			if (!t) continue;
			const o = n[i.id];
			n[i.id] = o ? {
				ready: o.ready + t.ready,
				stale: o.stale + t.stale,
				pending: o.pending + t.pending,
				making: o.making + t.making,
				failed: o.failed + t.failed,
				reason: o.reason ?? t.reason
			} : t;
		}
		if (t.failure) return {
			state: "failed",
			reason: t.failure,
			layers: n
		};
		return {
			state: t.plan ? "ready" : "loading",
			layers: n
		};
	}
	first_() {
		return this.built_.values().next().value;
	}
};
/** The resource the plugin installs. @experimental */
const Q = c(new Z(), "WorldGens");
/**
* Runs an asset load again when it fails, a few times and a little later each time. Reading a project's files is slowest while the project is still being
* opened (the asset database is scanned and cooked against it), and a load that waited out its timeout then is not a world that cannot be shown.
*/
async function Ge(e, t = 5) {
	for (let n = 1;; n++) try {
		return await e();
	} catch (e) {
		if (n >= t) throw e;
		l.warn("worldgen", `loading the world's assets failed (${e instanceof Error ? e.message : String(e)}); trying again`);
		await new Promise((e) => setTimeout(e, 2e3 * n));
	}
}
var Ke = class {
	constructor() {
		this.name = "worldgen";
		this.watching_ = null;
	}
	build(e) {
		fe(e);
		const t = new Z();
		t.app_ = e;
		e.insertResource(Q, t);
		e.addSystemToSchedule(3, i([], () => {
			this.sweep(e, t);
			for (const n of e.world.getEntitiesWithComponents([W, o])) {
				const r = e.world.get(n, W);
				const i = `${JSON.stringify(r)}#${be()}`;
				let a = t.built_.get(n);
				if (!a || a.signature !== i) {
					a = this.make(e, t, n, r, a);
					t.built_.set(n, a);
				}
				if (a.waitingForPlanet && a.rules && e.hasResource(p) && e.getResource(p).planets.has(n)) {
					a.waitingForPlanet = false;
					this.plan(e, t, n, a, a.rules);
				}
			}
			this.syncZones(e, t);
			for (const [n, r] of t.built_) this.publish(e, t, n, r);
		}, { name: "WorldGenSystem" }));
	}
	cleanup(e) {
		this.watching_?.();
		this.watching_ = null;
		if (!e?.hasResource(Q)) return;
		const t = e.getResource(Q);
		for (const n of [...t.built_.keys()]) this.drop(e, t, n);
		this.syncZones(e, t);
	}
	/** A WorldGen's rules and plan, or why it has none. */
	make(e, t, n, r, i) {
		if (i) this.retire(e, t, i);
		const a = /* @__PURE__ */ new Map();
		const o = {
			assets: f(`worldgen:${n}`, (i?.assets.generation ?? 0) + 1, new d(), (e) => {
				try {
					e.releaseAll();
				} finally {
					a.clear();
				}
			}),
			retired: false,
			meshData: a,
			signature: `${JSON.stringify(r)}#${be()}`,
			data: { ...r },
			rules: null,
			plan: null,
			farPlan: null,
			failure: null,
			ground: "",
			listeners: [],
			levelled: /* @__PURE__ */ new Set(),
			paint: null,
			levelling: /* @__PURE__ */ new Set(),
			plants: null,
			plantsReady: null,
			faces: null,
			waitingForPlanet: false
		};
		if (R(r.rules)) {
			if (!e.hasResource(u)) {
				o.failure = `the world rules file ${r.rules} cannot be read without an asset system: register its rules in code instead`;
				l.error("worldgen", o.failure);
				return o;
			}
			const a = e.getResource(u);
			if (!this.watching_) this.watching_ = a.onInvalidate(({ ref: e }) => {
				const n = a.resolveLoadPath(e);
				for (const e of t.built_.values()) if (R(e.data.rules) && a.resolveLoadPath(e.data.rules) === n) e.signature = "";
			});
			a.acquireTyped("world-rules", r.rules).then((r) => {
				if (o.retired || t.built_.get(n) !== o) {
					r.release();
					return;
				}
				o.assets.value.add(r);
				this.adopt(e, t, n, o, r.value, i);
			}, (e) => {
				if (t.built_.get(n) !== o) return;
				o.failure = `the world rules file ${r.rules} could not be read: ${e instanceof Error ? e.message : String(e)}`;
				l.error("worldgen", o.failure);
			});
			return o;
		}
		const s = xe(r.rules);
		if (!s) {
			o.failure = `no world rules ${r.rules || "(none named)"} are registered`;
			l.error("worldgen", `the world ${r.world} cannot be laid out: ${o.failure}`);
			for (const t of i?.rules?.layers ?? []) X(e, n, t.id);
			return o;
		}
		this.adopt(e, t, n, o, s, i);
		return o;
	}
	/** Takes a WorldGen's rules, once they are known: checks the version, and makes the plan (loading what the recipes name first). */
	adopt(e, t, n, r, i, a) {
		const o = r.data;
		if (!i.versions.includes(o.version)) r.failure = `the world rules ${i.id} have no version ${o.version} (they have ${i.versions.join(", ")})`;
		else r.rules = i;
		if (r.failure) {
			l.error("worldgen", `the world ${o.world} cannot be laid out: ${r.failure}`);
			for (const t of a?.rules?.layers ?? []) X(e, n, t.id);
			return;
		}
		for (const t of a?.rules?.layers ?? []) if (!i.layers.some((e) => e.id === t.id)) X(e, n, t.id);
		if (i.plants && Object.keys(i.plants).length > 0 && e.hasResource(u)) {
			const a = Ie(i.plants);
			r.plants = a;
			Ge(() => ae(e.getResource(u), a.kinds)).then((e) => {
				if (r.retired || t.built_.get(n) !== r) {
					e.lease.release();
					return;
				}
				r.assets.value.add(e.lease);
				r.plantsReady = e;
			}, (e) => {
				if (r.retired) return;
				r.failure = `the plants' assets could not be loaded: ${e instanceof Error ? e.message : String(e)}`;
				l.error("worldgen", r.failure);
			});
		}
		const s = qe(i);
		if (s.length > 0 && e.hasResource(u)) {
			Ge(() => this.resolve(e, i, s)).then((i) => {
				if (r.retired || t.built_.get(n) !== r) {
					i.scope.releaseAll();
					return;
				}
				r.assets.value.absorb(i.scope);
				r.rules = i.rules;
				this.plan(e, t, n, r, i.rules);
			}, (e) => {
				if (r.retired) return;
				r.failure = `the recipes' assets could not be loaded: ${e instanceof Error ? e.message : String(e)}`;
				l.error("worldgen", r.failure);
			});
			return;
		}
		this.plan(e, t, n, r, i);
	}
	/** Loads the meshes and materials `refs` name, and gives back the rules with each path replaced by its handle. */
	async resolve(e, t, n) {
		const r = e.getResource(u);
		const i = new d();
		const a = /* @__PURE__ */ new Map();
		const o = (await Promise.allSettled(n.map(async ({ kind: e, ref: t }) => {
			const n = i.add(await r.acquireTyped(e, t));
			a.set(`${e}:${t}`, n.value.handle);
		}))).find((e) => e.status === "rejected");
		if (o) {
			i.releaseAll();
			throw o.reason;
		}
		const s = (e) => ({
			...e,
			mesh: typeof e.mesh === "string" ? a.get(`mesh:${e.mesh}`) ?? 0 : e.mesh,
			material: typeof e.material === "string" ? a.get(`material:${e.material}`) ?? 0 : e.material
		});
		return {
			scope: i,
			rules: {
				...t,
				recipes: t.recipes.map((e) => ({
					...e,
					anchor: s(e.anchor),
					members: e.members?.map(s)
				}))
			}
		};
	}
	/** Makes a WorldGen's plan from its rules, and what keeps it current. */
	plan(e, t, n, r, i) {
		const a = r.data;
		if (a.surface === U.Planet) {
			this.planPlanet(e, t, n, r, i);
			return;
		}
		const s = e.hasResource(v) ? e.getResource(v) : null;
		const c = t.zones(a.world);
		const l = e.world.tryGet(n, o)?.worldPosition.y ?? 0;
		const u = Oe({
			rules: i,
			farRules: Ee(i),
			seed: a.seed,
			world: a.world,
			zones: c,
			ground: s ? {
				heightAt: (e, t) => s.built_.size > 0 || s.loading ? s.heightAt(e, t) : l,
				normalAt: (e, t) => s.normalAt(e, t),
				paintAt: (e, t) => s.paintAt(e, t)
			} : null,
			flatY: l,
			water: {
				depthAt: (t, n, r) => q(e)?.depthAt(t, n, r) ?? null,
				shoreAt: (t, n) => q(e)?.shoreAt?.(t, n) ?? null
			},
			layers: s ? s.layerNames() : []
		});
		r.plan = u.plan;
		const d = r.plan;
		r.farPlan = u.farPlan;
		r.listeners.push(c.subscribe((o, l) => {
			d.invalidate();
			r.farPlan?.invalidate();
			const u = h(e);
			for (const e of i.layers) {
				const t = e.spacing * 3;
				u.invalidate(J(n, e.id), o[0] - t, o[1] - t, o[2] + t, o[3] + t);
			}
			if (s && a.paintGround && (l.biome || l.fields)) s.repaint();
			if (s) {
				const e = c.get(l.id);
				if (e?.flatten !== void 0) this.level(s, t, r, e);
				else this.unlevel(s, t, r, l.id);
			}
		}));
		r.listeners.push(t.diffs(a.world).subscribe((t) => {
			const r = this.anchorOf(d, t);
			if (r) h(e).invalidate(J(n, r.layer), r.x, r.z, r.x, r.z);
		}));
		if (s && a.paintGround) {
			r.paint = this.painter(d);
			s.setPaint(r.paint);
		}
		if (s) {
			for (const e of c.all()) if (e.flatten !== void 0) this.level(s, t, r, e);
		}
	}
	/**
	* Makes a planet's plans: one for each face of the cube, each on the face's plane. The plan of a face is the same plan as a plane's, read from the
	* planet's ground by direction and from noise in three dimensions, so a field wanders over an edge between two faces without a seam; a direction is
	* planned by the face it falls on, and the faces' plans paint the planet's ground by the same biomes that place what stands on it.
	*/
	planPlanet(e, t, n, r, i) {
		const a = r.data;
		if (!e.hasResource(p)) {
			r.failure = "a world on a planet needs the Planet plugin";
			l.error("worldgen", r.failure);
			return;
		}
		const o = e.getResource(p);
		const s = () => o.planets.get(n) ?? null;
		if (!s()) {
			r.waitingForPlanet = true;
			return;
		}
		const c = Ee(i);
		r.faces = Pe(s).map((t) => {
			const r = new Fe(t);
			const { plan: l, farPlan: u } = De(t, {
				rules: i,
				farRules: c,
				seed: a.seed,
				world: a.world,
				seaLevel: a.seaLevel,
				layers: s()?.layers ?? [],
				fieldNames: s()?.fieldNames ?? [],
				zones: r.zones
			});
			r.zones.onChange = (r, s) => {
				l.invalidate();
				u?.invalidate();
				const c = h(e);
				for (const e of i.layers) {
					const i = e.spacing * 3;
					c.invalidate(J(n, e.id, Y[t.face]), r[0] - i, r[1] - i, r[2] + i, r[3] + i);
				}
				if (a.paintGround && (s.biome || s.fields)) o.setPaint(n, o.paintOf(n), o.remotePaintOf(n));
			};
			return {
				face: t,
				plan: l,
				farPlan: u,
				zones: r
			};
		});
		r.plan = r.faces[2].plan;
		const u = r.faces;
		const d = this;
		if (a.paintGround) {
			const e = s()?.worker ? {
				get keys() {
					return u.map((e) => d.planKey(r, e));
				},
				spec: (e) => d.planSpec(r, u[e], s())
			} : null;
			o.setPaint(n, (e, t, n, r) => {
				const i = u[b(e, t, n).face];
				const a = i.face.planeOf(e, t, n);
				return a ? i.plan.paint(a.x, a.z, r) : r;
			}, e);
		}
	}
	/** Levels a zone's ground, or (the ground under its centre not known yet) keeps it to level once it is. */
	level(e, t, n, r) {
		const i = r.flatten === "ground" ? e.heightBeneathAt(r.shape.x, r.shape.z) : r.flatten;
		if (i === null || i === void 0) {
			n.levelling.add(r.id);
			return;
		}
		const a = JSON.stringify([
			r.shape,
			r.falloff,
			i
		]);
		let o = t.levelled_.get(r.id);
		if (!o) {
			o = {
				signature: "",
				owners: /* @__PURE__ */ new Set()
			};
			t.levelled_.set(r.id, o);
		}
		o.owners.add(n);
		n.levelled.add(r.id);
		if (o.signature !== a) {
			e.setModifier(_(`zone:${r.id}`, r.shape, i, r.falloff));
			o.signature = a;
		}
		n.levelling.delete(r.id);
	}
	unlevel(e, t, n, r) {
		n.levelling.delete(r);
		n.levelled.delete(r);
		const i = t.levelled_.get(r);
		if (!i) return;
		i.owners.delete(n);
		if (i.owners.size === 0) {
			e?.deleteModifier(`zone:${r}`);
			t.levelled_.delete(r);
		}
	}
	/** The ground's paint by a plan's biomes. */
	painter(e) {
		return (t, n, r, i, a) => e.paint(t, n, a);
	}
	/** Where the group of placement `id` is anchored, from the layer and grid cell its id names. */
	anchorOf(e, t) {
		const n = /^(.+)@\d+:(-?\d+),(-?\d+)\//.exec(t);
		if (!n) return null;
		const r = e.layerIndex(n[1]);
		if (r < 0) return null;
		const i = e.group(r, Number(n[2]), Number(n[3]));
		return typeof i === "string" ? null : {
			layer: n[1],
			x: i.x,
			z: i.z
		};
	}
	/** Puts the authored `WorldZone`s into their world's zones. */
	syncZones(e, t) {
		const n = new Map([...t.built_.values()].map((e) => [e.data.world, e]));
		for (const [e, r] of t.authored_) {
			if (n.has(e)) continue;
			for (const n of r) t.zones(e).delete(n);
			t.authored_.delete(e);
		}
		const r = e.world.getEntitiesWithComponents([K, o]);
		for (const [i, a] of n) this.syncWorldZones(e, t, i, a, r);
	}
	syncWorldZones(e, t, n, r, i) {
		const a = t.zones(n);
		const s = /* @__PURE__ */ new Set();
		for (const t of i) {
			const n = e.world.get(t, K);
			const i = e.world.get(t, o);
			const c = i.worldPosition, l = i.worldRotation;
			const u = Math.atan2(2 * (l.w * l.y + l.x * l.z), 1 - 2 * (l.y * l.y + l.z * l.z));
			const d = r.data.surface === U.Planet;
			const f = [
				1 - 2 * (l.y * l.y + l.z * l.z),
				2 * (l.x * l.y + l.w * l.z),
				2 * (l.x * l.z - l.w * l.y)
			];
			const p = {
				id: We(e, t),
				kind: n.kind,
				falloff: n.falloff,
				priority: n.priority,
				shape: n.shape === G.Box ? {
					type: "rect",
					x: c.x,
					z: c.z,
					halfX: n.sizeX / 2,
					halfZ: n.sizeZ / 2,
					yaw: -u,
					...d ? {
						y: c.y,
						facing: f
					} : {}
				} : {
					type: "circle",
					x: c.x,
					z: c.z,
					radius: n.radius,
					...d ? { y: c.y } : {}
				},
				excludes: n.excludes.split(",").map((e) => e.trim()).filter(Boolean),
				...n.biome ? { biome: n.biome } : {},
				...n.flatten ? { flatten: "ground" } : {}
			};
			a.set(p);
			s.add(p.id);
		}
		for (const e of t.authored_.get(n) ?? []) if (!s.has(e)) a.delete(e);
		t.authored_.set(n, s);
	}
	/** Hands each of the rules' layers to the chunks, made from the plan: of the one plane, or of each face of a planet. */
	publish(e, t, n, r) {
		const i = r.plan, a = r.rules;
		if (!i || !a) return;
		const o = e.hasResource(v) ? e.getResource(v) : null;
		const s = q(e);
		if (r.faces) {
			const i = e.getResource(p).planets.get(n);
			if (!i) return;
			const a = [...t.zones(r.data.world).all()];
			for (const e of r.faces) e.zones.sync(a);
			const o = F(i.radius);
			const s = ne();
			for (const a of r.faces) this.publishUnit(e, t, n, r, {
				key: Y[a.face.face],
				plan: a.plan,
				farPlan: a.farPlan,
				face: a.face,
				bounds: [
					-o,
					-o,
					o,
					o
				],
				known: (e, t) => a.face.ground(e, t) !== null,
				away: s && i.worker ? this.awayOf(s, r, a, i) : void 0
			}, `planet:${i.radius}`, false);
			return;
		}
		const c = `${o?.revision_ ?? 0}:${s?.revision_ ?? 0}`;
		if (c !== r.ground) {
			i.invalidate();
			r.farPlan?.invalidate();
			r.ground = c;
		}
		const l = !!o?.loading || !!s?.baking;
		if (o) for (const e of [...r.levelling]) {
			const n = t.zones(r.data.world).get(e);
			if (n?.flatten !== void 0) this.level(o, t, r, n);
			else this.unlevel(o, t, r, e);
		}
		this.publishUnit(e, t, n, r, {
			key: "",
			plan: i,
			farPlan: r.farPlan,
			face: null,
			bounds: o?.areaBounds() ?? null,
			known: (e, t) => !o || o.groundKnownAt(e, t),
			away: this.awayOnPlane(e, t, n, r, o, s, l)
		}, c, l);
	}
	/**
	* What lays a plane's world out on workers, when the ground and the water can be handed to them as data (a terrain of a field or of noise, with nothing laid over it;
	* water that is baked): the chunks are spread over the workers, and a worker is sent the plan the first time it is asked a square of it. Null when they cannot, and
	* the world is laid out here.
	*/
	awayOnPlane(e, t, n, r, i, a, s) {
		const c = ne();
		const l = r.paint !== null && i?.paint_ === r.paint;
		const u = () => {
			if (l && i && r.pager && i.pager_ === r.pager) i.setPager(null);
			r.pager = null;
			r.pagerKey = void 0;
		};
		if (!c || s || r.data.surface !== U.Plane) return u();
		const d = i && i.built_.size > 0 ? i.groundData() : null;
		if (i && i.built_.size > 0 && !d) return u();
		const f = a ? a.queryData?.() ?? null : null;
		if (a && !f && a.queryData && !a.empty) return u();
		const p = t.zones(r.data.world);
		const m = `${r.signature}:plane:t${i?.revision_ ?? 0}:w${a?.revision_ ?? 0}:z${p.revision}`;
		const h = e.world.tryGet(n, o)?.worldPosition.y ?? 0;
		const g = () => ({
			plane: true,
			rules: {
				...r.rules,
				fields: void 0,
				plants: void 0
			},
			seed: r.data.seed,
			world: r.data.world,
			ground: d,
			flatY: h,
			water: f,
			layers: i ? i.layerNames() : [],
			zones: [...p.all()]
		});
		const _ = (e, t) => Math.abs(Math.floor(e / 256) * 73856093 ^ Math.floor(t / 256) * 19349663) % c.size;
		if (l && i && d && r.pagerKey !== m) {
			const e = d.origin;
			r.pagerKey = m;
			r.pager = (t, n, a) => {
				if (r.pagerKey !== m || i.groundData() === null) return null;
				const o = _(t + e.x, n + e.z);
				const s = w(o, m);
				const l = {
					id: 0,
					type: "groundPage",
					key: m,
					x0: t,
					z0: n,
					size: a,
					paint: true,
					...s ? { spec: g() } : {}
				};
				return c.run(o, l).catch((e) => {
					C(o, m);
					throw e;
				});
			};
			i.setPager(r.pager);
		}
		return (e, t, n, r, i, a) => {
			const o = _(n, r);
			const s = w(o, m);
			const l = {
				id: 0,
				key: m,
				layer: e,
				far: t,
				x0: n,
				z0: r,
				x1: i,
				z1: a,
				...s ? { spec: g() } : {}
			};
			return c.run(o, l).catch((e) => {
				C(o, m);
				throw e;
			});
		};
	}
	/** The name of a face's plan for workers: what it was made from, so a plan made from other rules, zones or sea is a new one. */
	planKey(e, t) {
		return `${e.signature}:f${t.face.face}:z${t.zones.zones.revision}`;
	}
	/** What a worker makes a face's plan from: plain data, the rules without what is code (the fields a game registered) or what only the main thread reads (the plants' kinds). */
	planSpec(e, t, n) {
		const r = e.data;
		return {
			rules: {
				...e.rules,
				fields: void 0,
				plants: void 0
			},
			seed: r.seed,
			world: r.world,
			seaLevel: r.seaLevel,
			face: t.face.face,
			radius: n.radius,
			centre: n.centre,
			layers: [...n.layers],
			fieldNames: [...n.fieldNames],
			zones: [...t.zones.zones.all()],
			provider: n.worker
		};
	}
	/** Asks the pool for a square of a face's plan: the plan is sent with the first question a worker is asked of it, and named after that. */
	awayOf(e, t, n, r) {
		const i = n.face.face % e.size;
		return (a, o, s, c, l, u) => {
			const d = this.planKey(t, n);
			const f = {
				id: 0,
				key: d,
				layer: a,
				far: o,
				x0: s,
				z0: c,
				x1: l,
				z1: u,
				...w(i, d) ? { spec: this.planSpec(t, n, r) } : {}
			};
			return e.run(n.face.face, f).catch((e) => {
				C(i, d);
				throw e;
			});
		};
	}
	/** One unit's layers as chunks: nearest first within the frame's budget, with the far versions of its plants a layer of their own. */
	publishUnit(e, t, n, r, i, a, o) {
		const s = r.rules;
		const c = t.diffs(r.data.world);
		const l = e.hasResource(u);
		const d = h(e);
		const { plan: f, bounds: p, face: g } = i;
		const _ = (e, t, n) => [
			[e, t],
			[e + n, t],
			[e, t + n],
			[e + n, t + n]
		].every(([e, t]) => i.known(e, t));
		const v = g ? (t) => () => g.sourcesOnFace(m(e), t) : null;
		for (const u of s.layers) {
			const s = u.chunkSize ?? 64;
			const m = p ? [
				Math.floor(p[0] / s),
				Math.floor(p[1] / s),
				Math.ceil(p[2] / s),
				Math.ceil(p[3] / s)
			] : null;
			d.set(J(n, u.id, i.key), {
				label: "Laying out the world",
				async: !!i.away,
				originX: 0,
				originZ: 0,
				sizeX: s,
				sizeZ: s,
				extent: m,
				loadRadius: u.drawDistance,
				unloadRadius: u.drawDistance + s,
				generation: `${r.signature}:${a}`,
				...v ? { sources: v(u.drawDistance + s) } : {},
				make: (t, n) => {
					const a = t * s, d = n * s;
					if (l && r.plants && !r.plantsReady) return null;
					const p = i.away?.(u.id, false, a, d, a + s, d + s);
					if (p) return this.ownChunk(r, () => p.then((t) => this.chunk(e, r.meshData, null, c, u, a, d, s, l, r.plants, g, false, 1, t)));
					if (o || !_(a, d, s)) return null;
					return this.ownChunk(r, () => this.chunk(e, r.meshData, f, c, u, a, d, s, l, r.plants, g));
				},
				publish: (r, i, a) => this.place(e, t, n, a),
				release: (n, r, i) => this.unplace(e, t, i)
			});
			const h = J(n, `${u.id}:far`, i.key);
			if (!l || !r.plants || r.plants.reach <= u.drawDistance) {
				d.remove(h);
				continue;
			}
			const y = s * Math.min(Math.max(Math.floor(r.plants.span / s), 1), 2);
			const b = p ? [
				Math.floor(p[0] / y),
				Math.floor(p[1] / y),
				Math.ceil(p[2] / y),
				Math.ceil(p[3] / y)
			] : null;
			d.set(h, {
				label: "Laying out the far plants",
				async: !!i.away,
				originX: 0,
				originZ: 0,
				sizeX: y,
				sizeZ: y,
				extent: b,
				loadRadius: r.plants.reach,
				unloadRadius: r.plants.reach + y,
				generation: `${r.signature}:${a}`,
				...v ? { sources: v(r.plants.reach + y) } : {},
				make: (t, n) => {
					const a = t * y, s = n * y;
					if (!r.plantsReady) return null;
					const d = (u.farSpacing ?? 1) > 1 && i.farPlan;
					const p = i.away?.(u.id, true, a, s, a + y, s + y);
					if (p) return this.ownChunk(r, () => p.then((t) => this.chunk(e, r.meshData, null, c, u, a, s, y, l, r.plants, g, true, d ? u.farSpacing ** 2 : 1, t)));
					if (o || !_(a, s, y)) return null;
					return this.ownChunk(r, () => this.chunk(e, r.meshData, d ? i.farPlan : f, c, u, a, s, y, l, r.plants, g, true, d ? u.farSpacing ** 2 : 1));
				},
				publish: (r, i, a) => this.place(e, t, n, a),
				release: (n, r, i) => this.unplace(e, t, i)
			});
		}
	}
	/** Pending and published chunks both borrow the generation they were built from. */
	ownChunk(e, t) {
		const n = e.assets.retain();
		if (!n) return null;
		const r = (e) => {
			e.assets = n;
			return e;
		};
		try {
			const e = t();
			return e instanceof Promise ? e.then(r, (e) => {
				n.release();
				throw e;
			}) : r(e);
		} catch (e) {
			n.release();
			throw e;
		}
	}
	/** What one chunk of a layer places: its decoration merged by mesh, and its interactive placements, with the changes laid over. */
	chunk(e, t, n, r, i, a, o, s, c, d, f, p = false, m = 1, h) {
		const g = [];
		for (const e of h ?? n.placementsIn(a, o, a + s, o + s, [i.id])) {
			const t = f ? Je(e, f) : e;
			if (r.isRemoved(t.id)) continue;
			const n = r.changeOf(t.id);
			g.push(n ? {
				...t,
				...n
			} : t);
		}
		const _ = f ? f.world(a + s / 2, 0, o + s / 2) : [
			a + s / 2,
			0,
			o + s / 2
		];
		const v = p ? [] : g.filter((e) => e.interactive !== null);
		const y = c && !p ? g.filter((e) => e.interactive === null && e.mesh) : [];
		const b = [...new Set(y.map((e) => e.mesh))];
		const x = () => {
			const e = {
				decor: [],
				objects: v,
				planted: null,
				at: _,
				side: s,
				grown: null,
				far: p,
				thinnedBy: m,
				entities: [],
				meshes: []
			};
			if (d && c) {
				const t = /* @__PURE__ */ new Map();
				for (const n of g) {
					if (n.interactive !== null || n.plant === null) continue;
					const r = d.kindAt(n.plant, n.x, n.z);
					if (r < 0) continue;
					let i = t.get(r);
					if (!i) t.set(r, i = []);
					i.push({
						...d.kinds[r]?.interaction ? { key: n.id } : {},
						x: n.x - e.at[0],
						y: n.y - e.at[1] - d.sinkOf(n.plant),
						z: n.z - e.at[2],
						yaw: n.yaw,
						scale: n.scale * d.unitOf(n.plant),
						phase: 0,
						shade: 1,
						...$(n) ? { up: $(n) } : {}
					});
				}
				if (t.size > 0) e.planted = t;
			}
			const n = /* @__PURE__ */ new Map();
			for (const e of y) {
				const t = `${e.mesh}:${e.material}`;
				let r = n.get(t);
				if (!r) n.set(t, r = []);
				r.push(e);
			}
			const r = e.at;
			for (const a of n.values()) {
				const n = t.get(a[0].mesh);
				if (!n || n instanceof Promise) continue;
				const o = a.map((e, t) => ({
					x: e.x - r[0],
					y: e.y - r[1],
					z: e.z - r[2],
					yaw: e.yaw,
					scale: e.scale,
					phase: t * .618 % 1,
					shade: 1,
					...$(e) ? { up: $(e) } : {}
				}));
				const s = a[0].far;
				const c = Math.max(n.aabbMax[0] - n.aabbMin[0], n.aabbMax[2] - n.aabbMin[2]);
				e.decor.push({
					mesh: a[0].mesh,
					material: a[0].material,
					data: oe(n, o),
					origin: r,
					far: s ? se(o, c, n.aabbMax[1] - n.aabbMin[1], s, void 0, s.tent === true) : null,
					lodDistance: i.lodDistance ?? i.drawDistance,
					drawDistance: i.drawDistance
				});
			}
			return e;
		};
		const S = b.filter((e) => !t.has(e) || t.get(e) instanceof Promise);
		if (S.length === 0) return x();
		const ee = e.getResource(u);
		return Promise.all(S.map((e) => {
			let n = t.get(e);
			if (n === void 0) {
				const r = ee.readMeshData(e).catch(() => null).then((n) => {
					if (!n) l.warn("worldgen", `the geometry of mesh ${e} cannot be read, so what it draws is left out`);
					t.set(e, n);
					return n;
				});
				t.set(e, r);
				n = r;
			}
			return n;
		})).then(x);
	}
	/** Puts a chunk in the world: a mesh a kind of decoration, an entity an interactive placement. */
	place(e, n, i, a) {
		const c = e.world;
		if (!c.valid(i)) return;
		const l = c.get(i, o).worldPosition;
		const d = e.hasResource(u) ? e.getResource(u) : null;
		const f = n.built_.get(i);
		if (a.planted && f?.plants && f.plantsReady) {
			const t = c.spawn("WorldGenPlants");
			c.insert(t, r);
			c.insert(t, o, { position: {
				x: a.at[0] - l.x,
				y: a.at[1] - l.y,
				z: a.at[2] - l.z
			} });
			c.setParent(t, i);
			a.entities.push(t);
			a.grown = {
				entity: t,
				handles: [],
				dead: false
			};
			const n = ie(e);
			const s = f.plants.kinds.some((e) => e.interaction);
			if (s) a.grown.sets = [];
			if (a.far) n.growFar(e, a.grown, f.plants.kinds, f.plantsReady, a.planted, {
				x: a.at[0],
				z: a.at[2],
				half: a.side / 2
			}, a.thinnedBy);
			else n.growCell(e, a.grown, f.plants.kinds, f.plantsReady, a.planted);
			if (s) {
				const t = `world:${f.data.world}`;
				if (a.far) re(e).addFarCell(a.grown, t, f.plants.kinds, f.plantsReady);
				else re(e).addCell(a.grown, t, f.plants.kinds, f.plantsReady, a.planted, a.side / 2);
			}
		}
		for (const e of a.decor) {
			const n = d?.createMesh(e.data) ?? 0;
			if (!n) continue;
			a.meshes.push(n);
			const u = e.far ? d?.createMesh(e.far) ?? 0 : 0;
			if (u) a.meshes.push(u);
			const f = c.spawn("WorldGenDecor");
			c.insert(f, r);
			c.insert(f, o, { position: {
				x: e.origin[0] - l.x,
				y: e.origin[1] - l.y,
				z: e.origin[2] - l.z
			} });
			c.insert(f, t, {
				mesh: n,
				material: e.material,
				lit: true,
				opaque: true,
				cullBackfaces: false,
				color: {
					r: 1,
					g: 1,
					b: 1,
					a: 1
				}
			});
			const p = s("LODGroup");
			if (p) {
				const t = le([e.data, u ? e.far : null]);
				c.insert(f, p, {
					lod1: u,
					lod2: 0,
					lod3: 0,
					lod1Size: u ? ce(t, e.lodDistance) : 0,
					lod2Size: 0,
					lod3Size: 0,
					cullSize: ue(t, e.drawDistance),
					hysteresis: .1,
					enabled: true
				});
			}
			c.setParent(f, i);
			a.entities.push(f);
		}
		for (const e of a.objects) {
			const s = c.spawn(`${e.interactive} ${e.id}`);
			c.insert(s, r);
			c.insert(s, o, {
				position: {
					x: e.x - l.x,
					y: e.y - l.y,
					z: e.z - l.z
				},
				rotation: Ye(e),
				scale: {
					x: e.scale,
					y: e.scale,
					z: e.scale
				}
			});
			if (d && e.mesh) c.insert(s, t, {
				mesh: e.mesh,
				material: e.material,
				lit: true,
				opaque: true,
				color: {
					r: 1,
					g: 1,
					b: 1,
					a: 1
				}
			});
			c.insert(s, Ue, {
				id: e.id,
				kind: e.interactive
			});
			c.setParent(s, i);
			a.entities.push(s);
			n.objects_.set(e.id, s);
		}
	}
	unplace(e, t, n) {
		if (n.grown) {
			ie(e).release(e, n.grown);
			n.grown = null;
		}
		const r = new Set(n.entities);
		for (const e of n.objects) if (r.has(t.objects_.get(e.id))) t.objects_.delete(e.id);
		for (const t of n.entities) if (e.world.valid(t)) e.world.despawn(t);
		const i = e.hasResource(u) ? e.getResource(u) : null;
		for (const e of n.meshes) i?.releaseBuiltMesh(e);
		n.entities.length = 0;
		n.meshes.length = 0;
		n.assets?.release();
		n.assets = void 0;
	}
	retire(e, t, n) {
		n.retired = true;
		for (const e of n.listeners.splice(0)) e();
		const r = e.hasResource(v) ? e.getResource(v) : null;
		for (const e of n.levelled) this.unlevel(r, t, n, e);
		n.levelling.clear();
		if (r && n.paint && r.paint_ === n.paint) {
			const e = [...t.built_.values()].reverse().find((e) => !e.retired && e.paint);
			r.setPaint(e?.paint ?? null);
		}
		if (r && n.pager && r.pager_ === n.pager) r.setPager(null);
		n.pager = null;
		n.paint = null;
		n.assets.release();
	}
	drop(e, t, n) {
		const r = t.built_.get(n);
		if (e.hasResource(g)) {
			for (const t of r?.rules?.layers ?? []) X(e, n, t.id);
			if (r?.faces && e.hasResource(p)) e.getResource(p).setPaint(n, null);
		}
		if (r) this.retire(e, t, r);
		t.built_.delete(n);
	}
	sweep(e, t) {
		for (const n of [...t.built_.keys()]) {
			if (e.world.valid(n) && e.world.has(n, W) && e.world.has(n, o)) continue;
			this.drop(e, t, n);
		}
	}
};
/** The meshes and materials a rule set's recipes name by path. */
function qe(e) {
	const t = /* @__PURE__ */ new Map();
	for (const n of e.recipes) for (const e of [n.anchor, ...n.members ?? []]) {
		if (typeof e.mesh === "string" && e.mesh) t.set(`mesh:${e.mesh}`, {
			kind: "mesh",
			ref: e.mesh
		});
		if (typeof e.material === "string" && e.material) t.set(`material:${e.material}`, {
			kind: "material",
			ref: e.material
		});
	}
	return [...t.values()];
}
/** What a placement leans toward: the ground's normal when it is aligned, else which way is up where it stands on a round world; null when it stands along +Y. */
function $(e) {
	return e.attach === "align" ? e.normal : e.up ?? null;
}
/** A placement of a face's plane as it stands on the planet: its place in the world, its normal and up in the world, and its face in its names. */
function Je(e, t) {
	const n = t.world(e.x, e.y, e.z);
	return {
		...e,
		id: `f${t.face}:${e.id}`,
		group: `f${t.face}:${e.group}`,
		x: n[0],
		y: n[1],
		z: n[2],
		normal: t.worldNormal(e.normal, e.x, e.z),
		up: t.frameAt(e.x, e.z).dir
	};
}
/** A placement's turn: about the vertical, and leaning with the ground when it is aligned (or with up, on a round world). */
function Ye(e) {
	const t = e.yaw / 2;
	const n = {
		x: 0,
		y: Math.sin(t),
		z: 0,
		w: Math.cos(t)
	};
	const r = $(e);
	if (!r) return n;
	const [i, a, o] = r;
	const s = o, c = -i, l = Math.hypot(s, c);
	if (l < 1e-6) return n;
	const u = Math.acos(Math.min(Math.max(a, -1), 1)) / 2;
	const d = {
		x: s / l * Math.sin(u),
		y: 0,
		z: c / l * Math.sin(u),
		w: Math.cos(u)
	};
	return {
		x: d.w * n.x + d.x * n.w + d.y * n.z - d.z * n.y,
		y: d.w * n.y - d.x * n.z + d.y * n.w + d.z * n.x,
		z: d.w * n.z + d.x * n.y - d.y * n.x + d.z * n.w,
		w: d.w * n.w - d.x * n.x - d.y * n.y - d.z * n.z
	};
}
const Xe = new Ke();
//#endregion
export { O as A, Oe as C, Se as D, k as E, me as M, T as N, ye as O, E as P, Ae as S, Ce as T, P as _, Z as a, je as b, G as c, R as d, Ve as f, F as g, Ne as h, Q as i, D as j, xe as k, Xe as l, Fe as m, W as n, U as o, Le as p, Ke as r, K as s, Ue as t, He as u, Pe as v, M as w, ke as x, N as y };

//# sourceMappingURL=worldgenPlugin.js.map