import { s as e } from "./resource.js";
//#region src/terrain/planetQuery.ts
/**
* @file    planetQuery.ts
* @brief   What the world asks of a planet: which way is up where something stands, how high the ground is under it, and what pulls it.
*
* @details A round world has no one up. Everything that stands, falls or aims on a planet asks it here: `up` is away from the centre of the planet
*          the position is over, `altitude` the height above the radius, `groundHeight` the generator's own height at the direction (the ground
*          itself, before any tile is built), and `gravity` how hard the nearest planet pulls. The planets themselves are kept by the Planet
*          plugin; this file holds only the registry they are written into, so a system that needs to ask (physics, a character, a camera) does
*          not carry the renderer.
*/
/** The planets of the app. @experimental */
var t = class {
	constructor() {
		this.planets = /* @__PURE__ */ new Map();
		this.painters_ = /* @__PURE__ */ new Map();
		this.remote_ = /* @__PURE__ */ new Map();
		this.paintRevision = 0;
	}
	/** Sets what paints the planet `entity`'s ground (null takes it away); a planet paints with its provider's paint until then. */
	setPaint(e, t, n = null) {
		if (t) this.painters_.set(e, t);
		else this.painters_.delete(e);
		if (n) this.remote_.set(e, n);
		else this.remote_.delete(e);
		this.paintRevision++;
	}
	/** How a worker paints the planet `entity`'s ground as its painter does, when it can. */
	remotePaintOf(e) {
		return this.remote_.get(e) ?? null;
	}
	/** What paints the planet `entity`'s ground, if anything does. */
	paintOf(e) {
		return this.painters_.get(e) ?? null;
	}
	/** The planet whose surface is nearest the position (a planet pulls from any distance), or null with none. */
	nearest(e, t, n) {
		let r = null;
		let i = Infinity;
		for (const [a, o] of this.planets) {
			const s = Math.abs(Math.hypot(e - o.centre[0], t - o.centre[1], n - o.centre[2]) - o.radius);
			if (s < i) {
				i = s;
				r = a;
			}
		}
		return r;
	}
	/** The unit direction away from the centre of the planet `entity`, at a position; null for no such planet, or at its very centre. */
	up(e, t, n, r) {
		const i = this.planets.get(e);
		if (!i) return null;
		const a = t - i.centre[0], o = n - i.centre[1], s = r - i.centre[2];
		const c = Math.hypot(a, o, s);
		return c > 1e-9 ? [
			a / c,
			o / c,
			s / c
		] : null;
	}
	/** How far the position is above the planet's radius (negative inside), or null for no such planet. */
	altitude(e, t, n, r) {
		const i = this.planets.get(e);
		return i ? Math.hypot(t - i.centre[0], n - i.centre[1], r - i.centre[2]) - i.radius : null;
	}
	/** The ground's height above the radius under the position, from the generator; null where it cannot say yet. */
	groundHeight(e, t, n, r) {
		const i = this.planets.get(e);
		if (!i?.height) return null;
		const a = t - i.centre[0], o = n - i.centre[1], s = r - i.centre[2];
		const c = Math.hypot(a, o, s);
		return c > 1e-9 ? i.height(a / c, o / c, s / c) : null;
	}
	/** The point on the ground under the position, in world units, or null where the ground cannot be said yet. */
	groundPoint(e, t, n, r) {
		const i = this.planets.get(e);
		const a = this.groundHeight(e, t, n, r);
		const o = this.up(e, t, n, r);
		if (!i || a === null || !o) return null;
		const s = i.radius + a;
		return [
			i.centre[0] + o[0] * s,
			i.centre[1] + o[1] * s,
			i.centre[2] + o[2] * s
		];
	}
};
const n = e(new t(), "PlanetRegistry");
//#endregion
export { n, t };

//# sourceMappingURL=planetQuery.js.map