import { s as e } from "./logger.js";
import { s as t } from "./resourceManager.js";
import { W as n } from "./scene.js";
//#region src/spine/atlasPages.ts
/**
* @file  atlasPages.ts — the single source of truth for a Spine `.atlas`'s page
*        image names. A spine atlas is a text manifest whose page headers name an
*        image file (`spineboy.png`) at column 0, each followed by indented
*        `key: value` property lines. Those page images are the atlas's texture
*        DEPENDENCIES — resolved relative to the atlas file.
*
*        Every consumer reads pages through here so the cook's dependency scan
*        (which decides what ships), the runtime {@link SpineAssetLoader}, and the
*        scene loader ({@link loadSpineAssets}) agree by construction — a texture
*        the loader will request is exactly one the cook embedded. Kept a
*        dependency-free leaf so the Node-side cook can import it too.
*/
/** Parse a spine `.atlas`'s page image filenames (relative to the atlas file). */
function r(e) {
	const t = [];
	for (const n of e.split("\n")) {
		const e = n.trim();
		if (e && !e.includes(":") && (/\.png$/i.test(e) || /\.jpg$/i.test(e))) t.push(e);
	}
	return t;
}
//#endregion
//#region src/spine/prepareSpine.ts
/**
* @file    prepareSpine.ts
* @brief   What one spine asset IS, and the one algorithm that produces it.
*
* @details A spine asset is a PAIR: a skeleton document and the atlas it is
*          drawn with. The same skeleton with another atlas is another asset —
*          the component authors both fields, so a scene can and does say so —
*          which is why the pair, not the skeleton's path, is its identity.
*
*          What a preparation produces is data: the two documents and the atlas
*          pages it took. The native skeleton is NOT here. That object belongs
*          to a runtime backend of a particular Spine version, is built from
*          this, and dies with the entities using it — an asset layer that
*          creates one owns something it cannot answer questions about.
*
*          The transport differs by host — the asset layer's recording context,
*          an editor's own file access — and the algorithm does not. Which pages
*          the atlas names, where they live, what is read and what is acquired
*          is decided once, here.
*/
/** The era binding for an acquired spine asset: identity is the pair plus the
*  generation, and the claim is a retain of exactly that generation. */
function i(e, t, r = { kind: "unknown" }) {
	return {
		id: `${n(e.skeleton, e.atlas)}#${t.generation}`,
		pair: e,
		value: t.value,
		retain: () => t.retain(),
		culling: r
	};
}
/**
* Prepare one spine pair. A page that fails to load is left out with a warning
* rather than failing the asset: a skeleton missing one page still poses, and
* the atlas naming a page the build dropped is the ordinary shape of it.
*/
async function a(n, i, a) {
	const o = await n.text(a);
	const s = t();
	const c = /* @__PURE__ */ new Map();
	for (const t of r(o)) {
		const r = n.pagePath(t);
		try {
			const e = await n.page(r);
			s.registerTextureWithPath(e.handle, r);
			c.set(t, {
				glId: s.getTextureGLId(e.handle),
				w: e.width,
				h: e.height
			});
		} catch (t) {
			e.warn("spine", `atlas page "${r}" did not load`, t);
		}
	}
	const l = n.isBinary(i);
	return {
		skelData: l ? new Uint8Array(await n.binary(i)) : await n.text(i),
		atlasText: o,
		isBinary: l,
		textures: c
	};
}
//#endregion
export { i as n, a as t };

//# sourceMappingURL=prepareSpine.js.map