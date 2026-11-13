//#region src/render/blend.ts
/**
* @file    blend.ts
* @brief   Blend mode definitions for rendering
*/
/**
* Mirrors the engine's `BlendMode` (src/esengine/renderer/draw/BlendMode.hpp) — the
* values are serialized into material assets, so they are fixed.
*/
let e = /* @__PURE__ */ function(e) {
	/** SrcAlpha, OneMinusSrcAlpha — the default. */
	e[e["Normal"] = 0] = "Normal";
	/** SrcAlpha, One — glow, particles. */
	e[e["Additive"] = 1] = "Additive";
	/** DstColor, OneMinusSrcAlpha — shadows, multiply. */
	e[e["Multiply"] = 2] = "Multiply";
	/** One, OneMinusSrcColor — lighten. */
	e[e["Screen"] = 3] = "Screen";
	/** One, OneMinusSrcAlpha — for premultiplied-alpha sources. */
	e[e["PremultipliedAlpha"] = 4] = "PremultipliedAlpha";
	/** One, One — additive with a premultiplied-alpha source. */
	e[e["PmaAdditive"] = 5] = "PmaAdditive";
	/** Takes the brighter pixel (GL_MAX). */
	e[e["Lighten"] = 6] = "Lighten";
	/** Takes the darker pixel (GL_MIN). */
	e[e["Darken"] = 7] = "Darken";
	/** Screen on light, Multiply on dark; requires shader support. */
	e[e["Overlay"] = 8] = "Overlay";
	/**
	* No blending — the source replaces the destination. An opaque sprite pays
	* nothing to read the destination it would ignore, and this is the only mode
	* a draw may write depth in, since a blended one must stay in painter's order.
	*/
	e[e["None"] = 9] = "None";
	return e;
}({});
//#endregion
//#region src/util/disposeAll.ts
/** Dispose a detached batch completely; report its first failure unchanged. */
function t(e, t, n = false) {
	let r = false, i;
	for (let a = 0; a < e.length; a++) try {
		t(e[n ? e.length - 1 - a : a]);
	} catch (e) {
		if (!r) {
			r = true;
			i = e;
		}
	}
	if (r) throw i;
}
//#endregion
export { e as n, t };

//# sourceMappingURL=disposeAll.js.map