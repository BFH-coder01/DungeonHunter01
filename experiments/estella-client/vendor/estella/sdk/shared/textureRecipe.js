import { H as e, Q as t, g as n, nt as r } from "./base.js";
import { n as i, t as a } from "./utf8.js";
import { i as o } from "./glTextureUpload.js";
//#region src/asset/imageDecode.ts
/**
* @file    imageDecode.ts
* @brief   The single image-decode path for every texture provider (editor,
*          play realm, preview, spine). Routing all of them through one module
*          keeps premultiply / colorspace / orientation identical, so the
*          edit/play/ship paths can't drift — that drift is the texture-flip
*          class of bug. Vertical orientation is baked via `imageOrientation`,
*          NEVER `UNPACK_FLIP_Y_WEBGL`, which Chromium/ANGLE silently ignore for
*          `ImageBitmap` sources (uploads every texture upside-down otherwise).
*/
/**
* Canonical `createImageBitmap` options. premultiply + colorspace conversion are
* OFF so the engine owns blending and color (matching the C++ upload); `flip`
* bakes a vertical flip into the bitmap so callers upload it as-is.
*/
function s(e) {
	return {
		premultiplyAlpha: "none",
		colorSpaceConversion: "none",
		imageOrientation: e ? "flipY" : "from-image"
	};
}
/**
* Decode a source into a GL-oriented `ImageBitmap` for direct `texImage2D` upload
* (the editor/web TextureLoader). With `flip`, the result samples file-top at v=1;
* upload it with `UNPACK_FLIP_Y_WEBGL` off (the orientation is already baked).
*/
function c(e, t) {
	return createImageBitmap(e, s(t));
}
/**
* Decode a source into a top-first RGBA pixel buffer for the C++ `createTexture`
* upload path (play realm, preview, spine). Orientation stays top-first here; the
* consumer chooses the final convention via `createTextureFromPixels(flipY)` —
* v=1=top for general textures, v=0=top for spine / bitmap fonts.
*/
async function l(e, t = 0) {
	const n = await c(e, false);
	const r = n.width, i = n.height;
	const a = await u(n, t);
	try {
		const e = d(a, t);
		return e.width < r || e.height < i ? {
			...e,
			sourceWidth: r,
			sourceHeight: i
		} : e;
	} finally {
		a.close?.();
	}
}
/**
* A bitmap made no longer than `maxEdge` on its long side (the bitmap itself when it already is, or when there is no decoder to do it). The decoder makes
* it smaller with the options it decoded with: left to its defaults a resize premultiplies, and the colour under a clear texel is gone, which a weight map
* the ground is mixed by has all over it. The bitmap given is closed when a smaller one is made.
*/
async function u(e, t) {
	const n = Math.max(e.width, e.height);
	if (!(t > 0 && n > t) || typeof createImageBitmap !== "function") return e;
	const r = t / n;
	const i = await createImageBitmap(e, {
		resizeWidth: Math.max(1, Math.round(e.width * r)),
		resizeHeight: Math.max(1, Math.round(e.height * r)),
		resizeQuality: "high",
		premultiplyAlpha: "none",
		colorSpaceConversion: "none"
	});
	e.close?.();
	return i;
}
/**
* The RGBA of an image that is already decoded, in its own row order.
*
* `ImageData` is unpremultiplied by definition, so these bytes are the upload as
* they stand: dividing them by alpha again drives every half-transparent texel
* toward white, and an RGBM texel — whose alpha IS its brightness — to grey.
*/
function d(e, t = 0) {
	const r = t > 0 ? Math.min(1, t / Math.max(e.width, e.height)) : 1;
	const i = Math.max(1, Math.round(e.width * r));
	const a = Math.max(1, Math.round(e.height * r));
	if (typeof ImageBitmap !== "undefined" && e instanceof ImageBitmap && i === e.width && a === e.height) {
		const t = o(e, i, a);
		if (t) return {
			width: i,
			height: a,
			pixels: t
		};
	}
	const s = n(i, a);
	s.width = i;
	s.height = a;
	const c = s.getContext("2d", { willReadFrequently: true });
	if (!c) throw new Error("imageDecode: 2D context unavailable for pixel decode");
	c.drawImage(e, 0, 0, i, a);
	const l = c.getImageData(0, 0, i, a);
	const u = new Uint8Array(l.data.buffer);
	return r < 1 ? {
		width: i,
		height: a,
		pixels: u,
		sourceWidth: e.width,
		sourceHeight: e.height
	} : {
		width: i,
		height: a,
		pixels: u
	};
}
/**
* Fetch a URL and decode it to top-first RGBA pixels. The single fetch→blob→decode
* path the runtime asset sources use for `estella://` / http origins (a CORS-mode
* `<img>` taints the canvas on custom schemes; fetch→blob sidesteps it). Uses the
* global `fetch` — these callers all run in a browser/electron context.
*/
async function f(e, t = 0) {
	const n = await fetch(e);
	if (!n.ok) throw new Error(`image fetch failed (${n.status}): ${e}`);
	return l(await n.blob(), t);
}
//#endregion
//#region src/asset/textureRecipe.ts
/**
* @file    textureRecipe.ts
* @brief   A texture that is a recipe: a picture's source (an `.esimage`) shipped in place of its pixels and drawn where it is loaded.
*
* @details A package that ships a picture ships every pixel of it; one that ships how the picture is drawn ships a few hundred bytes
*          and pays for the drawing once, on the device. Whoever reads an image (the texture loader, a ground reading its layers)
*          asks here for any path that is a recipe. What draws one is not in the core: importing `esengine/image` installs it, so a
*          game with no recipe does not carry the raster.
*
*          A recipe may need other files of the project: a picture it lays in, a font, the recipe it is a map of. The drawer says
*          which, they are read here, and a drawn picture is kept in the platform's content cache under all it was drawn from: the
*          source, those files' own bytes, and the drawer's revision. A change in any of them is another key.
*/
const p = ".esimage";
/** A kept picture's bytes: two sizes, then its pixels. */
const m = 8;
let h = null;
const g = {
	drawn: 0,
	drawMs: 0,
	reused: 0
};
/** Whether a texture's path names a recipe and not an image. */
function _(e) {
	const t = e.indexOf("?");
	return (t < 0 ? e : e.slice(0, t)).toLowerCase().endsWith(p);
}
/** Installs what draws recipes (null takes it out again). `esengine/image` does this on import. */
function v(e) {
	h = e;
}
/** The content cache's key for a recipe: the drawer's revision, and the hash of the source with the files it was drawn from. */
function y(e, t = /* @__PURE__ */ new Map(), n = h?.revision ?? "") {
	const a = [...t.keys()].sort().map((e) => `\n${e}:${r(new Uint8Array(t.get(e)))}`).join("");
	return `estella:texture-recipe:${n}:${r(i(e + a))}`;
}
function b(e) {
	if (e.byteLength < m) return null;
	const t = new DataView(e);
	const n = t.getUint32(0, true), r = t.getUint32(4, true);
	if (n === 0 || r === 0 || e.byteLength !== m + n * r * 4) return null;
	return {
		width: n,
		height: r,
		pixels: new Uint8Array(e, m)
	};
}
function x(e) {
	const t = new ArrayBuffer(m + e.pixels.byteLength);
	const n = new DataView(t);
	n.setUint32(0, e.width, true);
	n.setUint32(4, e.height, true);
	new Uint8Array(t, m).set(e.pixels);
	return t;
}
/** Reads what `source` needs into `files`, and what the recipes among those need, each file once. */
async function S(e, t, n, r, i) {
	for (const o of e.needs(t)) {
		if (o === i) throw new Error(`recipe "${i}" needs itself`);
		if (r.has(o)) continue;
		const t = await n(o);
		r.set(o, t);
		if (_(o)) await S(e, a(new Uint8Array(t)), n, r, i);
	}
}
/** The pixels of the recipe at `path`: read back where an earlier run drew them, drawn and kept otherwise. */
async function C(n, r) {
	const i = h;
	if (!i) throw new Error(`texture "${n}" is a recipe, and nothing here draws recipes: import 'esengine/image' where the game starts`);
	const o = a(new Uint8Array(await r(n)));
	const s = /* @__PURE__ */ new Map();
	await S(i, o, r, s, n);
	const c = y(o, s, i.revision);
	const l = await e(c);
	const u = l ? b(l) : null;
	if (u) {
		g.reused++;
		return u;
	}
	const d = Date.now();
	const f = await i.draw(o, s, n);
	g.drawn++;
	g.drawMs += Date.now() - d;
	t(c, x(f));
	return f;
}
//#endregion
export { l as a, d as c, c as i, u as l, C as n, f as o, v as r, s, _ as t };

//# sourceMappingURL=textureRecipe.js.map