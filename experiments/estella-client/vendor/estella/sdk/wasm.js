//#region src/wasm.ts
/**
* Who refills a texture after a device loss, stated by whoever creates it —
* mirroring the engine's `resource::ResourceContent`.
*/
const e = {
	/** Rewritten before every use (a decoded video frame). */
	Transient: 0,
	/** The engine keeps the bytes (a tile collection composed at load). */
	Retained: 1,
	/** The asset layer loads it again from its path. */
	Asset: 2,
	/** Redrawn from the canvas it mirrors. */
	Canvas: 3,
	/** Refilled by the video it shows. */
	Video: 4,
	/** Repainted from the glyphs placed on it. */
	GlyphPage: 6,
	/** A skeleton's atlas page, decoded again from its image. */
	AtlasPage: 7,
	/** Composed again by its creator from its sources (a terrain's layer arrays). */
	Composed: 8
};
/** A content code's name, for a log that says what could not be refilled. */
function t(t) {
	const n = Object.entries(e).find(([, e]) => e === t);
	return n ? n[0] : `content ${t}`;
}
//#endregion
export { e as TextureContent, t as textureContentName };

//# sourceMappingURL=wasm.js.map