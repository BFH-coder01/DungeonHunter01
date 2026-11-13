//#region src/postprocess/effectSources.ts
const e = /* @__PURE__ */ new Map();
/** Called by a group's installer with the object of `createX` factories it carries. */
function t(t) {
	for (const [n, r] of Object.entries(t)) if (typeof r === "function") e.set(n, r);
}
const n = /* @__PURE__ */ new Map();
/** A compute effect's WGSL, installed with its group. */
function r(e, t) {
	n.set(e, t);
}
/** The WGSL of a compute effect, read when its pass is compiled. */
function i(e) {
	const t = n.get(e);
	if (t === void 0) throw new Error(`The "${e}" compute effect is not in this package. Import esengine/fx-basic, or set the module to Include in Project Settings.`);
	return t;
}
/**
* A stand-in for one of the source objects an effect definition calls into. Typed as the real object (a type-only import, which
* costs nothing), resolved by name when a method is called.
*/
function a() {
	return new Proxy({}, { get(t, n) {
		if (typeof n !== "string") return void 0;
		return (...t) => {
			const r = e.get(n);
			if (!r) throw new Error(`The post-process effect needs "${n}", which this package does not carry. Import the effect group that has it (esengine/fx-basic, esengine/fx-atmosphere, esengine/fx-lighting or esengine/fx-agx), or set the module to Include in Project Settings.`);
			return r(...t);
		};
	} });
}
//#endregion
export { t as i, a as n, r, i as t };

//# sourceMappingURL=effectSources.js.map