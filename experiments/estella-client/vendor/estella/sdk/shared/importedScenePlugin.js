import { $t as e, Ot as t, c as n, mn as r, n as i, pt as a, qt as o } from "./system.js";
import { t as s } from "./env.js";
import { g as c } from "./scene.js";
//#region src/imported-scene/nodeVisibility.ts
/** An authored visual gate on a subtree. Cameras, physics and gameplay stay active. */
const l = e("NodeVisibility", { visible: true }, { animatableFields: ["visible"] });
/** No hierarchy walk or renderer write when the gates and scene structure are unchanged. */
var u = class {
	constructor() {
		this.masked = /* @__PURE__ */ new Map();
		this.gates = /* @__PURE__ */ new Map();
		this.version = -1;
	}
	exportData(e, t, n) {
		const r = this.masked.get(e)?.find((e) => e.def._name === t);
		if (r) n[r.def.renderableField] = r.value;
	}
	update(e) {
		const t = e.getEntitiesWithComponents([l]);
		if (t.length === 0 && this.masked.size === 0 && this.gates.size === 0) return;
		let n = e.getWorldVersion() !== this.version || t.length !== this.gates.size;
		const i = /* @__PURE__ */ new Map();
		for (const r of t) {
			const t = !!e.get(r, l).visible;
			i.set(r, t);
			if (this.gates.get(r) !== t) n = true;
		}
		if (n) {
			const t = /* @__PURE__ */ new Set();
			const n = [...i].filter(([, e]) => !e).map(([e]) => e);
			while (n.length) {
				const r = n.pop();
				if (t.has(r) || !e.valid(r)) continue;
				t.add(r);
				if (e.has(r, a)) n.push(...e.get(r, a).entities);
			}
			for (const [n, r] of this.masked) {
				if (t.has(n)) continue;
				if (e.valid(n)) for (const t of r) {
					if (!e.has(n, t.def)) continue;
					const r = e.get(n, t.def);
					r[t.def.renderableField] = t.value;
					e.set(n, t.def, r);
				}
				this.masked.delete(n);
			}
			const o = r();
			for (const n of t) {
				const t = this.masked.get(n) ?? [];
				for (const r of o) {
					if (!e.has(n, r) || t.some((e) => e.def === r)) continue;
					t.push({
						def: r,
						value: e.get(n, r)[r.renderableField]
					});
				}
				if (t.length) this.masked.set(n, t);
			}
			this.gates = i;
			this.version = e.getWorldVersion();
		}
		for (const [t, n] of this.masked) {
			if (!e.valid(t)) {
				this.masked.delete(t);
				continue;
			}
			for (const r of n) {
				if (!e.has(t, r.def)) continue;
				const n = e.get(t, r.def);
				if (n[r.def.renderableField] === false) continue;
				r.value = n[r.def.renderableField];
				n[r.def.renderableField] = false;
				e.set(t, r.def, n);
			}
		}
	}
};
//#endregion
//#region src/imported-scene/particleModelUnits.ts
/** Imported world-space particles: geometry follows Transform, lengths and forces use model units here. */
const d = e("ParticleModelUnits", {
	startSizeMin: 1,
	startSizeMax: 1,
	endSizeMin: 1,
	endSizeMax: 1,
	speedMin: 0,
	speedMax: 0,
	gravity: {
		x: 0,
		y: 0,
		z: 0
	}
});
var f = class {
	constructor() {
		this.snapshots = /* @__PURE__ */ new Map();
	}
	update(e) {
		const n = /* @__PURE__ */ new Set();
		for (const r of e.queryEntities([
			d,
			t,
			o
		])) {
			n.add(r);
			const i = e.get(r, o).worldScale;
			const a = Math.max(Math.abs(i.x), Math.abs(i.y), Math.abs(i.z));
			const s = e.get(r, d);
			const c = [
				a,
				s.startSizeMin,
				s.startSizeMax,
				s.endSizeMin,
				s.endSizeMax,
				s.speedMin,
				s.speedMax,
				s.gravity.x,
				s.gravity.y,
				s.gravity.z
			];
			const l = this.snapshots.get(r);
			if (l && c.every((e, t) => e === l[t])) continue;
			this.snapshots.set(r, c);
			const u = e.get(r, t);
			for (const e of [
				"startSizeMin",
				"startSizeMax",
				"endSizeMin",
				"endSizeMax",
				"speedMin",
				"speedMax"
			]) u[e] = s[e] * a;
			u.gravity = {
				x: s.gravity.x * a,
				y: s.gravity.y * a,
				z: s.gravity.z * a
			};
			e.set(r, t, u);
		}
		for (const e of this.snapshots.keys()) if (!n.has(e)) this.snapshots.delete(e);
	}
};
//#endregion
//#region src/imported-scene/importedScenePlugin.ts
var p = class {
	constructor() {
		this.name = "importedScene";
		this.release_ = null;
	}
	build(e) {
		const t = new u();
		const r = new f();
		this.release_ = c(e.world, (e, n, r) => t.exportData(e, n, r));
		e.addSystemToSchedule(3, n([], () => {
			e.world.ensureTransformsComposed();
			r.update(e.world);
		}, { name: "ParticleModelUnitSystem" }), { runIf: s });
		e.addSystemToSchedule(4, n([], () => t.update(e.world), { name: "NodeVisibilitySystem" }));
	}
	cleanup() {
		this.release_?.();
		this.release_ = null;
	}
};
//#endregion
export { d as n, l as r, p as t };

//# sourceMappingURL=importedScenePlugin.js.map