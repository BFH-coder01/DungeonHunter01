import { $t as e, Ct as t, c as n, k as r, n as i, qt as a, rn as o } from "./system.js";
import { i as s, s as c, t as l } from "./resource.js";
import { s as u } from "./logger.js";
import { n as d } from "./AssetPlugin.js";
import { i as f, n as p } from "./env.js";
import { r as m } from "./material.js";
import { c as h, i as g, r as _ } from "./movers.js";
import { o as v, p as y } from "./terrainPlugin.js";
import { n as b, r as x, t as S } from "./planPool.js";
import { c as C, d as w, f as T } from "./weather.js";
import { b as E, g as D, h as O, i as k, m as A, n as j, r as ee, t as M, v as N } from "./lodDistance.js";
//#region src/foliage/foliageContacts.ts
/** The most places the Foliage shader parts plants around at once. */
const te = 4;
const P = Array.from({ length: 4 }, (e, t) => `u_contact${t}`);
const F = () => ({
	trails: /* @__PURE__ */ new Map(),
	last: /* @__PURE__ */ new Map()
});
/** How far behind itself a contact leaves its last place, as a share of its reach. */
const I = .75;
/**
* Follows the contacts for one frame: each one that has moved on leaves a place behind it, and what was left shrinks.
* The answer is the contacts themselves first, nearest `focus`, then what they left, newest first, as many as the shader has room for. Unused places reach nowhere.
*/
function L(e, t, n, r) {
	const { trails: i, last: a } = t;
	const o = [];
	for (const t of e) {
		const e = t.radius * t.strength;
		if (e <= 0) continue;
		const r = a.get(t.id);
		if (!r) a.set(t.id, {
			x: t.x,
			y: t.y,
			z: t.z
		});
		else if (Math.hypot(t.x - r.x, t.z - r.z) > e * I) {
			let n = i.get(t.id);
			if (!n) i.set(t.id, n = []);
			n.push({
				x: r.x,
				y: r.y,
				z: r.z,
				reach: e,
				recovery: t.recovery,
				age: 0
			});
			r.x = t.x;
			r.y = t.y;
			r.z = t.z;
		}
		o.push({
			place: {
				x: t.x,
				y: t.y,
				z: t.z,
				w: e
			},
			d: n ? Math.hypot(t.x - n.x, t.z - n.z) : 0
		});
	}
	const s = [];
	for (const [e, t] of i) {
		for (let e = t.length - 1; e >= 0; e--) {
			const n = t[e];
			n.age += r;
			const i = n.recovery > 0 ? 1 - n.age / n.recovery : 0;
			if (i <= 0) {
				t.splice(e, 1);
				continue;
			}
			s.push({
				place: {
					x: n.x,
					y: n.y,
					z: n.z,
					w: n.reach * i
				},
				age: n.age
			});
		}
		if (t.length === 0) i.delete(e);
	}
	o.sort((e, t) => e.d - t.d);
	s.sort((e, t) => e.age - t.age);
	const c = [...o.map((e) => e.place), ...s.map((e) => e.place)].slice(0, 4);
	while (c.length < 4) c.push({
		x: 0,
		y: 0,
		z: 0,
		w: 0
	});
	return c;
}
/** Installs the system that tells Foliage materials about the contacts. Returns what clears them. */
function ne(e) {
	const t = F();
	let i = false;
	const o = () => {
		if (!i) return;
		i = false;
		t.trails.clear();
		t.last.clear();
		for (const e of m.materialsDeclaring(P[0])) for (const t of P) m.setUniform(e, t, {
			x: 0,
			y: 0,
			z: 0,
			w: 0
		});
	};
	const c = n([r(k, a), l(s)], (n, r) => {
		if (p() && !f()) {
			o();
			return;
		}
		const a = [];
		for (const [e, t, r] of n) {
			if (!t.enabled) continue;
			const n = r.worldPosition;
			a.push({
				id: e,
				x: n.x,
				y: n.y,
				z: n.z,
				radius: t.radius,
				strength: t.strength,
				recovery: t.recovery
			});
		}
		const s = g(e).sources_()[0];
		const c = L(a, t, s ? {
			x: s.x,
			z: s.z
		} : null, r.delta);
		i = true;
		for (const e of m.materialsDeclaring(P[0])) for (let t = 0; t < 4; t++) m.setUniform(e, P[t], c[t]);
	}, { name: "FoliageContactSystem" });
	e.addSystemToSchedule(4, c, { activeWhen: [k] });
	return o;
}
//#endregion
//#region src/foliage/cellBuild.ts
/** The share of plants that stand at (x, z), 0 to 1: the four texels about it blended. */
function R(e, t, n) {
	const r = (t - e.originX) / e.sizeX, i = (n - e.originZ) / e.sizeZ;
	if (!(r >= 0 && r <= 1 && i >= 0 && i <= 1)) return 0;
	const a = Math.min(r * e.width - .5, e.width - 1), o = Math.min(i * e.height - .5, e.height - 1);
	const s = Math.max(Math.floor(a), 0), c = Math.max(Math.floor(o), 0);
	const l = Math.min(s + 1, e.width - 1), u = Math.min(c + 1, e.height - 1);
	const d = Math.min(Math.max(a - s, 0), 1), f = Math.min(Math.max(o - c, 0), 1);
	const p = (t, n) => e.values[n * e.width + t];
	return ((p(s, c) * (1 - d) + p(l, c) * d) * (1 - f) + (p(s, u) * (1 - d) + p(l, u) * d) * f) / 255;
}
/** A number from 0 to 1 that is a place's own, whichever cell or thread asks: which plants a density thins out. */
function re(e, t, n) {
	let r = Math.imul(Math.floor(e * 64) | 0, 374761393) ^ Math.imul(Math.floor(t * 64) | 0, 668265263) ^ Math.imul(n | 0, 2246822519);
	r = Math.imul(r ^ r >>> 13, 1274126177);
	return ((r ^ r >>> 16) >>> 0) / 4294967296;
}
/** Where a plant may stand in a cell, as `scatterCell` asks it. */
function z(e, t) {
	return (n, r) => {
		if (t.zones?.excluding(n, r, Math.max(0, e.zonePadding), e.tags, e.seed)) return null;
		if (t.density && re(n, r, e.seed) >= R(t.density, n, r)) return null;
		const i = t.ground ? t.ground.heightAt(n, r) : t.flatY;
		if (i === null) return null;
		const a = t.water?.depthAt(n, r, i);
		if (a != null && a > e.waterDepth) return null;
		if (!t.ground) return {
			y: i,
			up: 1
		};
		const o = t.ground.normalAt(n, r);
		return {
			y: i,
			up: o ? o[1] : 1
		};
	};
}
/** A plant under this share of its own size is not there. */
const B = .03;
/** The plants at the size the scale map gives each where it stands (their places are from the cell's centre), without those it takes to nothing. */
function V(e, t, n, r) {
	const i = [];
	for (const a of e) {
		const e = R(t, n + a.x, r + a.z);
		if (e >= B) i.push(e >= 1 ? a : {
			...a,
			scale: a.scale * e
		});
	}
	return i;
}
/**
* The geometry of a cell: its near mesh and its far one, or none where nothing grows in it. `source` is the plant's own mesh for a
* cell of copies, and not read for grass.
*/
function H(e, t, n) {
	const r = E({
		centerX: e.centerX,
		centerZ: e.centerZ,
		size: e.size,
		count: e.count,
		seed: e.seed,
		cellKey: e.cellKey,
		minScale: e.minScale,
		maxScale: e.maxScale,
		minUp: e.minUp,
		heightMin: e.heightMin,
		heightMax: e.heightMax
	}, z(e, t));
	if (r.length === 0) return [];
	for (const t of r) t.y -= e.baseY;
	const i = t.scale ? V(r, t.scale, e.centerX, e.centerZ) : r;
	if (i.length === 0) return [];
	const a = Math.min(Math.max(Math.floor(e.far.levels), 1), 3);
	const o = (t) => Math.pow(Math.min(Math.max(e.far.keep, .01), 1), t);
	const s = (t) => e.far.only != null ? 1 : Math.min(Math.sqrt(1 / o(t)), Math.max(e.far.grow, 1));
	const c = e.far.only ?? null;
	const l = c === null ? void 0 : c;
	const u = (t) => {
		const r = t === 0 ? i : N(i, o(t), e.far.grow, void 0, e.far.up ?? 0, e.far.tilt ?? 0);
		return r.length === 0 ? null : D(n, r, e.paint, l, !!e.seats);
	};
	const d = (t) => {
		if (e.look.kind !== "grass") return null;
		const n = {
			height: e.look.bladeHeight,
			width: e.look.bladeWidth,
			lean: e.look.bladeLean,
			paint: e.paint,
			band: l
		};
		if (t === 0) return O(i, {
			...n,
			segments: 3,
			thin: 1
		});
		const r = N(i, o(t), 1);
		return r.length === 0 ? null : O(r, {
			...n,
			height: n.height * 1.1,
			width: n.width * s(t),
			segments: 1,
			thin: 1
		});
	};
	if (e.look.kind === "mesh" && !n) throw new Error("a cell of copies needs the mesh it copies");
	const f = e.look.kind === "mesh" ? u : d;
	if (c !== null) {
		const e = f(Math.min(Math.max(Math.floor(c), 0), a));
		return e ? [e] : [];
	}
	if (e.look.kind === "mesh" && e.far.cards) {
		const t = Math.max(n.aabbMax[0] - n.aabbMin[0], n.aabbMax[2] - n.aabbMin[2]);
		return [u(0), A(i, t, n.aabbMax[1] - n.aabbMin[1], e.look.card, e.paint, e.look.tent)];
	}
	const p = [];
	for (let e = 0; e <= a; e++) {
		const t = f(e);
		if (!t) break;
		p.push(t);
	}
	return p;
}
//#endregion
//#region src/foliage/foliagePlugin.ts
/**
* How many cells an area is cut into along x and z: as many as it takes for none to be wider than `cellSize`, however large the area.
* Only those near the eye are ever grown, so the count costs nothing; a cap on it would leave each cell wider than the plants scattered in it.
*/
function U(e, t, n) {
	const r = Math.max(1, n);
	return {
		x: Math.max(1, Math.ceil(e / r)),
		z: Math.max(1, Math.ceil(t / r))
	};
}
/**
* Plants across an area. Presence is the opt-in; its children are the cells that draw them.
*
* @experimental
*/
const W = e("Foliage", {
	mesh: 0,
	material: 0,
	densityMap: 0,
	scaleMap: 0,
	colorMap: 0,
	colorMapStrength: 1,
	colorMapFrom: 0,
	palette: 0,
	farLevels: 1,
	farKeep: .34,
	farStep: 2,
	farGrow: 2,
	farGrowUp: 0,
	farTilt: 0,
	faceEyeNear: 0,
	faceEye: 0,
	farCards: true,
	sizeX: 400,
	sizeZ: 400,
	cellSize: 40,
	count: 500,
	seed: 1,
	minScale: .8,
	maxScale: 1.25,
	minUp: .7,
	heightMin: -1e5,
	heightMax: 1e5,
	waterDepth: 0,
	bladeHeight: 14,
	bladeWidth: 1.6,
	bladeLean: .12,
	lodDistance: 140,
	drawDistance: 420,
	castShadows: true,
	zoneWorld: "",
	zoneTags: "",
	zonePadding: 0,
	cardU0: 0,
	cardV0: 0,
	cardU1: 1,
	cardV1: 1,
	cardTent: 0
}, {
	assetFields: [
		{
			field: "mesh",
			type: "mesh"
		},
		{
			field: "material",
			type: "material"
		},
		{
			field: "densityMap",
			type: "texture"
		},
		{
			field: "scaleMap",
			type: "texture"
		},
		{
			field: "colorMap",
			type: "texture"
		},
		{
			field: "palette",
			type: "texture"
		}
	],
	fields: {
		mesh: {
			tooltip: "The plant to scatter. Empty grows grass.",
			category: "Plant"
		},
		material: {
			tooltip: "A material on the Foliage shader, which makes the wind. Empty draws the plants still, in their own colours.",
			category: "Plant"
		},
		densityMap: {
			tooltip: "An image over the area whose red says how many of the plants stand where: none at black, all of them at white. Its Use is Data. Empty grows them everywhere.",
			category: "Placement"
		},
		scaleMap: {
			tooltip: "An image over the area whose red says how large the plants stand where: full size at white, smaller toward black, none at black. A sward that shrinks to nothing has a soft edge where one that only thins has a ragged one. Its Use is Data. Empty leaves every plant its own size.",
			category: "Placement"
		},
		colorMap: {
			tooltip: "A picture over the area that colours the plants by where they stand, mixed in by its alpha. Needs a material.",
			category: "Plant"
		},
		colorMapStrength: {
			min: 0,
			max: 1,
			step: .01,
			slider: true,
			category: "Plant",
			tooltip: "How much of the colour map is mixed in where its alpha is whole."
		},
		palette: {
			tooltip: "A strip of colours each plant takes the colour of its top from, by a number of its own: as wide a share of the strip, as many of the plants. Needs a material; the top begins at its Tip From.",
			category: "Plant"
		},
		colorMapFrom: {
			min: 0,
			max: 1,
			step: .01,
			slider: true,
			category: "Plant",
			tooltip: "How far up a plant the colour map begins: 0 colours it whole, higher only its top."
		},
		sizeX: {
			min: 1,
			category: "Area",
			tooltip: "World size along x, centred on this entity."
		},
		sizeZ: {
			min: 1,
			category: "Area",
			tooltip: "World size along z, centred on this entity."
		},
		cellSize: {
			min: 4,
			category: "Area",
			tooltip: "Side of the cells the area is cut into. Each is one mesh, culled whole."
		},
		count: {
			min: 0,
			step: 1,
			category: "Area",
			tooltip: "Plants per cell."
		},
		seed: {
			step: 1,
			category: "Area",
			tooltip: "Another seed grows the same plants in other places."
		},
		minScale: {
			min: .01,
			category: "Plant"
		},
		maxScale: {
			min: .01,
			category: "Plant"
		},
		minUp: {
			min: 0,
			max: 1,
			step: .01,
			category: "Placement",
			tooltip: "The least a place may face up and still grow something. Lower lets plants onto slopes."
		},
		heightMin: {
			category: "Placement",
			tooltip: "The lowest world height plants grow at."
		},
		heightMax: {
			category: "Placement",
			tooltip: "The highest world height plants grow at."
		},
		waterDepth: {
			min: 0,
			category: "Placement",
			tooltip: "How deep under water a plant may stand. 0 keeps them on dry ground; reeds stand in the shallows."
		},
		bladeHeight: {
			min: .1,
			category: "Grass",
			tooltip: "Height of a blade at scale 1."
		},
		bladeWidth: {
			min: .01,
			category: "Grass",
			tooltip: "Width of a blade at its base, at scale 1."
		},
		bladeLean: {
			min: 0,
			max: 2,
			step: .01,
			slider: true,
			category: "Grass",
			tooltip: "How far a blade’s tip is thrown over, as a share of its height, each blade its own way. Upright blades are needles with the ground between them; blades that lie over cover it."
		},
		farLevels: {
			min: 1,
			max: 3,
			step: 1,
			category: "Distance",
			tooltip: "How many far versions a cell has: each is the same plants, fewer and larger, and takes over further out than the last."
		},
		farKeep: {
			min: .1,
			max: 1,
			step: .01,
			slider: true,
			category: "Distance",
			tooltip: "The share of its plants each far version keeps of the one before. They thin to it plant by plant before it takes over."
		},
		farStep: {
			min: 1.2,
			max: 4,
			step: .05,
			category: "Distance",
			tooltip: "How many times further out each far version takes over than the one before. The first takes over at the LOD distance."
		},
		farGrow: {
			min: 1,
			max: 6,
			step: .1,
			category: "Distance",
			tooltip: "The most a plant kept in a far version is grown by, to cover the ground the ones left out did."
		},
		farGrowUp: {
			min: 0,
			max: 1,
			step: .01,
			slider: true,
			category: "Distance",
			tooltip: "The share of that growth the height of a mesh plant takes: at 0 it grows across the ground only (a clump of flowers is no taller than a flower), at 1 the same every way."
		},
		farTilt: {
			min: 0,
			max: 90,
			step: 1,
			slider: true,
			category: "Distance",
			tooltip: "How far the top of a mesh plant is tipped over in its far versions, each plant its own way round. A flat flower is edge on to a low eye a field away; tipped, half the field shows its face."
		},
		faceEyeNear: {
			min: 0,
			max: 1,
			step: .01,
			slider: true,
			category: "Distance",
			tooltip: "How far the head of a mesh plant (the last tenth of its height) is turned to face the eye, close to. Needs a material."
		},
		faceEye: {
			min: 0,
			max: 1,
			step: .01,
			slider: true,
			category: "Distance",
			tooltip: "How far it is turned to face the eye half the draw distance away and beyond: a far flower stands for a clump, and a clump shows its colour from the side. Needs a material."
		},
		farCards: {
			category: "Far version",
			tooltip: "A mesh's far version is crossed cards of its texture (a tree). Off, it is the plant itself, fewer and larger (a flower)."
		},
		lodDistance: {
			min: 1,
			category: "Distance",
			tooltip: "Past this a cell is drawn as its far version: fewer, broader blades, or a tree as crossed cards."
		},
		drawDistance: {
			min: 1,
			category: "Distance",
			tooltip: "Past this a cell is not drawn."
		},
		castShadows: {
			category: "Distance",
			tooltip: "Generated cells cast shadows. Turn off for dense short grass to avoid drawing every cell again into each shadow cascade. Lighting and received shadows remain."
		},
		zoneWorld: {
			category: "Placement",
			tooltip: "WorldGen world whose building and road exclusion zones this field respects. Empty uses the first world."
		},
		zoneTags: {
			category: "Placement",
			tooltip: "Extra comma-separated tags used by zone exclusions. foliage and grass (or tree for a mesh) are included automatically."
		},
		zonePadding: {
			min: 0,
			category: "Placement",
			tooltip: "Extra world-space clearance from building and road zones."
		},
		cardU0: {
			label: "Card left",
			category: "Far version",
			tooltip: "The part of the plant's texture a far tree shows (left, bottom, right, top)."
		},
		cardV0: {
			label: "Card bottom",
			category: "Far version"
		},
		cardU1: {
			label: "Card right",
			category: "Far version"
		},
		cardV1: {
			label: "Card top",
			category: "Far version"
		},
		cardTent: {
			label: "Card shape",
			category: "Far version",
			enum: [{
				label: "Rectangle",
				value: 0
			}, {
				label: "Tent (conifer)",
				value: 1
			}],
			tooltip: "The outline of the cards a far tree is drawn as."
		}
	}
});
function G(e) {
	const t = e.getResourceByName?.("Waters");
	return t && typeof t.depthAt === "function" ? t : null;
}
/** Optional world generation: querying zones must not pull that module into a foliage-only game. */
function K(e, t) {
	return (e.getResourceByName?.("WorldGens"))?.zones?.(t || void 0) ?? null;
}
/** The chunk layer a Foliage's cells are. */
/** The most far versions a cell has. */
const q = 3;
/** A field's layer of cells; with `level`, the layer of one version of them (0 the near one). */
const J = (e, t = 0) => t === 0 ? `foliage:${e}` : `foliage:${e}:${t}`;
/**
* Whether a field's versions are layers of their own, each grown only as far out as it is drawn and told apart by the shader: what a
* material makes possible, for grass and for a mesh whose far version is itself. Else a cell holds its versions and a LODGroup picks one.
*/
const Y = (e, t) => e.material && (!t || !e.farCards) ? Math.min(Math.max(Math.floor(e.farLevels), 1), q) : 0;
/** Where far version `level` (1 on) takes over from the one before. */
const X = (e, t) => e.lodDistance * Math.pow(Math.max(e.farStep, 1.01), t - 1);
/** Run-time facts about the foliage the plugin has grown. */
var Z = class {
	constructor() {
		this.built_ = /* @__PURE__ */ new Map();
		this.authoredWind_ = /* @__PURE__ */ new Map();
		this.retired_ = [];
		this.app_ = null;
		this.landed_ = [];
	}
	/** How many cells near enough to be drawn, across every field, are still waiting to be grown. */
	get pending() {
		let e = 0;
		for (const [t, n] of this.built_) {
			for (let n = 0; n <= q; n++) e += this.statusOf_(t, n)?.pending ?? 0;
			if (n.loading) e++;
		}
		return e;
	}
	/** How many cells are grown and standing now, across every field. */
	get cellCount() {
		let e = 0;
		for (const t of this.built_.keys()) for (let n = 0; n <= q; n++) {
			const r = this.statusOf_(t, n);
			if (r) e += r.ready + r.stale;
		}
		return e;
	}
	statusOf_(e, t = 0) {
		const n = this.app_;
		return n?.hasResource(_) ? n.getResource(_).status(J(e, t)) : null;
	}
};
/** The resource the plugin installs. @experimental */
const Q = c(new Z(), "Foliage");
var $ = class {
	constructor() {
		this.name = "foliage";
		this.activeWhen = [W];
		this.clearContacts_ = null;
	}
	build(e) {
		const t = new Z();
		t.app_ = e;
		e.insertResource(Q, t);
		this.clearContacts_ = ne(e);
		e.addSystemToSchedule(3, n([], () => {
			if (!e.hasResource(d)) return;
			const n = e.hasResource(v) ? e.getResource(v) : null;
			this.sweep(e, t);
			this.blow(e, t);
			const r = h(e);
			for (let e = true; t.landed_.length > 0 && (e || r.hasTime(t)); e = false) t.landed_.shift()();
			r.mark(t, "Growing the plants", t.landed_.length === 0 ? 1 : .5);
			const i = G(e);
			const o = (n?.revision_ ?? 0) * 100003 + (i?.revision_ ?? 0);
			const s = !!n?.loading || !!i?.baking;
			for (const n of e.world.getEntitiesWithComponents([W, a])) {
				const r = e.world.get(n, W);
				const { colorMap: i, colorMapStrength: a, colorMapFrom: c, palette: l, ...u } = r;
				const d = JSON.stringify(u);
				let f = t.built_.get(n);
				if (!f || f.signature !== d) {
					const i = f && f.data.material === r.material ? f.instance : 0;
					if (f && f.instance && !i) t.retired_.push({
						instance: f.instance,
						frames: 600
					});
					const a = i || (r.material ? m.createInstance(r.material) : 0);
					f = {
						signature: d,
						data: { ...r },
						source: null,
						instance: a,
						density: null,
						scale: null,
						loading: true,
						epoch: (f?.epoch ?? 0) + 1
					};
					t.built_.set(n, f);
					this.start(e, f);
				}
				f.data = { ...r };
				this.wash(e, n, f);
				const p = K(e, r.zoneWorld);
				this.layer(e, n, f, `${o}:${p?.revision ?? 0}`, s);
			}
		}, { name: "FoliageSystem" }));
	}
	/**
	* The weather's wind on the plants: each Foliage material's u_windStrength is its authored strength times the weather's `wind`, and is
	* put back when the weather is taken away or stops driving the wind. Only while the game runs, as the weather's lights are: in the
	* editor a material asset is left as authored, so previewing a storm never saves one.
	*/
	blow(e, t) {
		const n = w();
		const r = !p() || f();
		const i = n && r && T() & C.Wind ? n.wind : 1;
		const a = /* @__PURE__ */ new Set();
		if (i !== 1) for (const t of e.world.getEntitiesWithComponents([W])) {
			const n = e.world.get(t, W).material;
			if (n) a.add(n);
		}
		for (const e of a) {
			let n = t.authoredWind_.get(e);
			if (n === void 0) {
				const r = m.getUniform(e, "u_windStrength");
				if (typeof r !== "number") continue;
				n = r;
				t.authoredWind_.set(e, n);
			}
			m.setUniform(e, "u_windStrength", n * i);
		}
		for (const [e, n] of t.authoredWind_) {
			if (a.has(e)) continue;
			m.setUniform(e, "u_windStrength", n);
			t.authoredWind_.delete(e);
		}
	}
	cleanup(e) {
		this.clearContacts_?.();
		this.clearContacts_ = null;
		if (!e?.hasResource(Q)) return;
		const t = e.getResource(Q);
		for (const n of t.built_.keys()) if (e.hasResource(_)) for (let t = 0; t <= q; t++) e.getResource(_).remove(J(n, t));
		for (const e of t.built_.values()) if (e.instance) m.release(e.instance);
		for (const e of t.retired_) m.release(e.instance);
		t.retired_.length = 0;
		t.built_.clear();
		t.landed_.length = 0;
	}
	/** Reads the plant's geometry, if it has one; the cells wait for it. */
	async start(e, t) {
		const n = t.data;
		try {
			if (n.mesh) {
				t.source = await e.getResource(d).readMeshData(n.mesh);
				if (!t.source) u.warn("foliage", `the geometry of mesh ${n.mesh} cannot be read, so its plants are grass instead`);
			}
			const r = async (t, n, r) => {
				const i = e.getResource(d).pathForHandle("texture", t);
				const a = i ? await y(e, i) : null;
				if (!a) {
					u.warn("foliage", `the ${n} (texture ${t}) cannot be read, so its plants ${r}`);
					return null;
				}
				const o = new Uint8Array(a.width * a.height);
				for (let e = 0; e < o.length; e++) o[e] = a.pixels[e * 4];
				return {
					width: a.width,
					height: a.height,
					values: o
				};
			};
			if (n.densityMap) t.density = await r(n.densityMap, "density map", "grow everywhere");
			if (n.scaleMap) t.scale = await r(n.scaleMap, "scale map", "keep their own size");
		} catch (e) {
			u.error("foliage", "growing the foliage failed", e);
		} finally {
			t.loading = false;
		}
	}
	/**
	* The field's cells as a layer of chunks: the area's grid, wanted out to `drawDistance` round the streaming sources, grown again
	* (each old cell kept till its new one stands) when a field, the ground or the water changes.
	*/
	layer(e, t, n, r, i) {
		const o = e.world.get(t, a);
		const s = n.data, c = this.cellsAcross(s);
		const l = o.worldScale.x || 1, u = o.worldScale.z || 1;
		const f = e.getResource(d);
		const p = `${n.epoch}:${r}:${o.worldPosition.x}:${o.worldPosition.y}:${o.worldPosition.z}:${l}:${u}`;
		n.generation = p;
		const m = i || n.loading ? null : this.awayFor(e, t, n, r, o.worldPosition.y);
		const h = Y(s, !!n.source);
		const _ = Math.max(1, s.cellSize);
		for (let r = 0; r <= q; r++) {
			if (r > h) {
				g(e).remove(J(t, r));
				continue;
			}
			const a = h === 0 || r === h ? s.drawDistance : Math.min(X(s, r + 1) + _, s.drawDistance);
			const d = h === 0 ? null : r;
			g(e).set(J(t, r), {
				label: "Growing the plants",
				async: m !== null,
				originX: o.worldPosition.x - s.sizeX / 2 * l,
				originZ: o.worldPosition.z - s.sizeZ / 2 * u,
				sizeX: s.sizeX / c.x * l,
				sizeZ: s.sizeZ / c.z * u,
				extent: [
					0,
					0,
					c.x,
					c.z
				],
				loadRadius: a,
				unloadRadius: a + _ * 1.5,
				generation: p,
				make: (r, a, o) => i || n.loading ? null : this.grow(e, t, n, r, a, m, p, o, d),
				publish: (n, r, i) => {
					if (i.entity !== null) e.world.setParent(i.entity, t);
				},
				release: (t, n, r) => {
					if (r.entity !== null && e.world.valid(r.entity)) e.world.despawn(r.entity);
					for (const e of r.handles) f.releaseBuiltMesh(e);
				}
			});
		}
	}
	/** The field's density map where it lies in the world: over the whole area. */
	densityOf(e, t, n) {
		return this.mapOf(e, t, n, n.density);
	}
	/** The same for its scale map. */
	scaleOf(e, t, n) {
		return this.mapOf(e, t, n, n.scale);
	}
	mapOf(e, t, n, r) {
		const i = e.world.tryGet(t, a);
		if (!r || !i) return null;
		const o = n.data.sizeX * (i.worldScale.x || 1), s = n.data.sizeZ * (i.worldScale.z || 1);
		return {
			...r,
			originX: i.worldPosition.x - o / 2,
			originZ: i.worldPosition.z - s / 2,
			sizeX: o,
			sizeZ: s
		};
	}
	/** Writes the colour map and the palette to the field's instance of its material. */
	wash(e, t, n) {
		const r = n.instance, i = n.data;
		if (!r) return;
		const o = e.world.tryGet(t, a);
		const s = i.colorMap && o ? i.colorMapStrength : 0;
		if (s > 0 && o) {
			const e = i.sizeX * (o.worldScale.x || 1), t = i.sizeZ * (o.worldScale.z || 1);
			m.setUniform(r, "u_colorMap", m.tex(i.colorMap));
			m.setUniform(r, "u_colorMapArea", {
				x: o.worldPosition.x - e / 2,
				y: o.worldPosition.z - t / 2,
				z: e,
				w: t
			});
			m.setUniform(r, "u_colorMapFrom", i.colorMapFrom);
		}
		m.setUniform(r, "u_colorMapStrength", s);
		if (i.palette) m.setUniform(r, "u_palette", m.tex(i.palette));
		m.setUniform(r, "u_paletteOn", i.palette ? 1 : 0);
	}
	cellsAcross(e) {
		return U(e.sizeX, e.sizeZ, e.cellSize);
	}
	/**
	* What makes a Foliage's cells on the workers, when what they are grown against can be handed over as data: no terrain (a flat
	* area) or one a worker can rebuild, water that is baked or absent, and the zones, which are data already. Null when it cannot,
	* and the cells are made here. Worked out again only when the ground, the water or the zones change.
	*/
	awayFor(e, t, n, r, i) {
		const a = `foliage:${t}:${n.epoch}:${r}:${i}`;
		if (n.away?.key === a) return n.away.grow;
		const o = () => {
			n.away = {
				key: a,
				grow: null
			};
			return null;
		};
		const s = x();
		if (!s) return o();
		const c = e.hasResource(v) ? e.getResource(v) : null;
		const l = !!c && c.built_.size > 0;
		const u = l ? c.groundData() : null;
		if (l && !u) return o();
		const d = G(e);
		const f = d?.queryData?.() ?? null;
		if (d && !f && !d.empty) return o();
		const p = K(e, n.data.zoneWorld);
		const m = this.densityOf(e, t, n), h = this.scaleOf(e, t, n);
		const g = () => ({
			ground: u,
			flatY: i,
			water: f,
			zones: p ? [...p.all()] : [],
			density: m,
			scale: h
		});
		const _ = n.source;
		const y = _ ? `${a}:mesh` : void 0;
		const C = (e) => {
			const t = Math.abs(Math.floor(e.centerX / 256) * 73856093 ^ Math.floor(e.centerZ / 256) * 19349663) % s.size;
			const n = S(t, a);
			const r = {
				id: 0,
				type: "foliageCell",
				key: a,
				cell: e,
				...n ? { around: g() } : {},
				...y ? {
					sourceKey: y,
					...n ? { source: _ } : {}
				} : {}
			};
			return s.run(t, r).catch((e) => {
				b(t, a);
				throw e;
			});
		};
		n.away = {
			key: a,
			grow: C
		};
		return C;
	}
	/**
	* Grows cell (cx, cz): its plants, their meshes and the entity that draws them, not yet in the world (its parent is set on publishing).
	* The geometry is made on a worker where `away` can make it, and the cell lands a frame or two later; else it is made here.
	*/
	grow(e, t, n, r, i, o = null, s, c, l = null) {
		const d = e.world;
		if (!d.valid(t)) return null;
		const f = n.data;
		const p = e.hasResource(v) ? e.getResource(v) : null;
		const h = d.tryGet(t, a);
		if (!h) return null;
		const g = Math.max(1, f.cellSize);
		const _ = this.cellsAcross(f);
		const y = -f.sizeX / 2 + (r + .5) * (f.sizeX / _.x);
		const b = -f.sizeZ / 2 + (i + .5) * (f.sizeZ / _.z);
		const x = h.worldScale.x || 1, S = h.worldScale.z || 1;
		const C = h.worldPosition.x + y * x, w = h.worldPosition.z + b * S;
		const T = !!p && p.built_.size > 0;
		const E = (T ? p.heightAt(C, w) : null) ?? h.worldPosition.y;
		const D = (E - h.worldPosition.y) / (h.worldScale.y || 1);
		if (n.instance) {
			const e = !n.source || !f.farCards;
			m.setUniform(n.instance, "u_thinLevels", Y(f, !!n.source));
			m.setUniform(n.instance, "u_bladeWidth", n.source ? 0 : f.bladeWidth);
			m.setUniform(n.instance, "u_thinGrow", Math.max(f.farGrow, 1));
			m.setUniform(n.instance, "u_thinDistance", e ? f.lodDistance : 0);
			m.setUniform(n.instance, "u_thinKeep", Math.min(Math.max(f.farKeep, .01), 1));
			m.setUniform(n.instance, "u_thinStep", Math.max(f.farStep, 1.01));
			m.setUniform(n.instance, "u_thinEnd", e ? f.drawDistance : 0);
			m.setUniform(n.instance, "u_faceEyeNear", Math.min(Math.max(f.faceEyeNear ?? 0, 0), 1));
			m.setUniform(n.instance, "u_faceEye", Math.min(Math.max(f.faceEye ?? 0, 0), 1));
			m.setUniform(n.instance, "u_faceEyeBy", Math.max(f.drawDistance * .5, .001));
		}
		const O = {
			centerX: C,
			centerZ: w,
			size: Math.min(g, f.sizeX / _.x),
			count: Math.floor(f.count),
			seed: f.seed,
			cellKey: i * 1e3 + r,
			minScale: f.minScale,
			maxScale: f.maxScale,
			minUp: f.minUp,
			heightMin: f.heightMin,
			heightMax: f.heightMax,
			waterDepth: f.waterDepth,
			zonePadding: f.zonePadding ?? 0,
			tags: [
				"foliage",
				f.mesh ? "tree" : "grass",
				...(f.zoneTags ?? "").split(",").map((e) => e.trim()).filter(Boolean)
			],
			baseY: E,
			seats: !!n.source && !!n.instance && (f.faceEye > 0 || f.faceEyeNear > 0),
			paint: f.material ? null : {
				base: [
					.14,
					.3,
					.08
				],
				tip: [
					.55,
					.72,
					.25
				]
			},
			far: {
				levels: f.farLevels,
				keep: f.farKeep,
				grow: f.farGrow,
				cards: f.farCards,
				only: l,
				up: f.farGrowUp,
				tilt: (f.farTilt ?? 0) * Math.PI / 180
			},
			look: n.source ? {
				kind: "mesh",
				card: {
					u0: f.cardU0,
					v0: f.cardV0,
					u1: f.cardU1,
					v1: f.cardV1
				},
				tent: f.cardTent === 1
			} : {
				kind: "grass",
				bladeHeight: f.bladeHeight,
				bladeWidth: f.bladeWidth,
				bladeLean: f.bladeLean ?? .12
			}
		};
		const k = () => {
			const r = {
				ground: T ? p : null,
				flatY: h.worldPosition.y,
				water: G(e),
				zones: K(e, f.zoneWorld),
				density: this.densityOf(e, t, n),
				scale: this.scaleOf(e, t, n)
			};
			return H(O, r, n.source);
		};
		if (o) {
			const a = e.getResource(Q);
			return o(O).catch((e) => {
				if (n.away?.grow) u.warn("foliage", "the workers failed a cell; this field grows its cells on the main thread from here", e);
				if (n.away) n.away = {
					key: n.away.key,
					grow: null
				};
				return null;
			}).then((o) => new Promise((u, d) => {
				a.landed_.push(() => {
					if (c?.aborted || n.generation !== s || !e.world.valid(t)) {
						u(null);
						return;
					}
					try {
						u(this.land(e, n, r, i, y, D, b, o ?? k(), l !== null));
					} catch (e) {
						d(e);
					}
				});
			}));
		}
		return this.land(e, n, r, i, y, D, b, k(), l !== null);
	}
	/** Puts a cell's geometry in the world: its meshes on the GPU and the entity that draws them (its parent is set on publishing). */
	land(e, n, r, i, s, c, l, f, p = false) {
		if (f.length === 0) return {
			entity: null,
			handles: []
		};
		const m = e.world, h = n.data;
		const g = e.getResource(d);
		const _ = [];
		for (const e of f) {
			const t = g.createMesh(e);
			if (t === 0) {
				u.warn("foliage", `the engine refused the geometry of cell ${r},${i}`);
				for (const e of _) g.releaseBuiltMesh(e);
				throw new Error(`the engine refused the geometry of cell ${r},${i}`);
			}
			_.push(t);
		}
		const v = m.spawn(`FoliageCell ${r},${i}`);
		m.insert(v, a, { position: {
			x: s,
			y: c,
			z: l
		} });
		m.insert(v, t, {
			mesh: _[0],
			material: n.instance || h.material,
			lit: true,
			opaque: true,
			cullBackfaces: false,
			castShadows: h.castShadows !== false,
			color: {
				r: 1,
				g: 1,
				b: 1,
				a: 1
			}
		});
		const y = p ? null : o("LODGroup");
		if (y) {
			const e = ee(_.length > 1 ? f : [f[0]]);
			const t = Math.max(h.farStep, 1.01);
			const n = (n) => _[n] ? j(e, h.lodDistance * Math.pow(t, n - 1)) : 0;
			m.insert(v, y, {
				lod1: _[1] ?? 0,
				lod2: _[2] ?? 0,
				lod3: _[3] ?? 0,
				lod1Size: n(1),
				lod2Size: n(2),
				lod3Size: n(3),
				cullSize: M(e, h.drawDistance),
				hysteresis: .1,
				enabled: true
			});
		}
		return {
			entity: v,
			handles: _
		};
	}
	sweep(e, t) {
		for (const [n, r] of t.built_) {
			if (e.world.valid(n) && e.world.has(n, W)) continue;
			if (e.hasResource(_)) for (let t = 0; t <= q; t++) e.getResource(_).remove(J(n, t));
			if (r.instance) t.retired_.push({
				instance: r.instance,
				frames: 2
			});
			t.built_.delete(n);
		}
		for (let e = t.retired_.length - 1; e >= 0; e--) {
			if (--t.retired_[e].frames > 0) continue;
			m.release(t.retired_[e].instance);
			t.retired_.splice(e, 1);
		}
	}
};
const ie = new $();
//#endregion
export { ie as a, Q as i, Z as n, $ as r, W as t };

//# sourceMappingURL=foliagePlugin.js.map