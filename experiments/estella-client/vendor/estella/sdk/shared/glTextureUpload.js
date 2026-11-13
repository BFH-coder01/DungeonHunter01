import { g as e } from "./base.js";
import { s as t } from "./resourceManager.js";
import { c as n } from "./env.js";
//#region src/asset/glTexParams.ts
/** WebGL wrap-mode enum for a wrap string. Unknown / undefined → `REPEAT`. */
function r(e, t) {
	return t === "clamp" ? e.CLAMP_TO_EDGE : t === "mirror" ? e.MIRRORED_REPEAT : e.REPEAT;
}
//#endregion
//#region src/asset/glTextureUpload.ts
/**
* @file    glTextureUpload.ts
* @brief   The bridge between a JS image source and the device's texture: the
*          engine's upload conventions (orientation, color-space encoding,
*          sampler state), and the only place a GL texture is created here and
*          handed to the device.
*
* Extracted for the same reason {@link ./glTexParams} was — a second uploader
* arrived (the open data context's shared canvas, re-uploaded every frame it is
* on screen) and these three conventions are exactly the ones that go wrong
* silently when they are written twice. A texture uploaded with the wrong
* `UNPACK_FLIP_Y_WEBGL` is upside down; with the wrong internal format it is
* subtly washed out in linear mode; with the wrong wrap it bleeds at the edge.
* None of the three throws.
*
* Everything here acts on the CURRENTLY BOUND `TEXTURE_2D`, which is what lets
* one function serve both a first upload and a re-upload into a live texture.
*/
/**
* Upload `source` into the bound texture.
*
* `flip` is for element and pixel sources only: an `ImageBitmap` bakes its
* orientation at decode (Chromium/ANGLE ignore the pixel-store flag for
* bitmaps), so its caller passes false — see `TextureLoader.createTextureFromImage`.
*
* `srgb` is the AUTHORED flag — whether the source stores sRGB-encoded color
* (default) or authored-linear data such as a normal map. Whether that becomes
* an sRGB internal format is this function's decision, not the caller's, so the
* linear-pipeline rule lives in one place.
*/
function i(e, t, r, i) {
	e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL, r ? 1 : 0);
	e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
	const a = n(i) ? e.SRGB8_ALPHA8 : e.RGBA;
	e.texImage2D(e.TEXTURE_2D, 0, a, e.RGBA, e.UNSIGNED_BYTE, t);
	e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL, 0);
}
/**
* Give the bound texture its sampler state, generating mipmaps when it is to
* have them — one call, because "has mipmaps" and "uses a mipmap min-filter"
* are the same decision and a texture that disagrees with itself samples black.
*/
function a(e, t) {
	const n = t?.filter ?? "linear";
	const i = t?.levels ?? 1;
	const a = i > 1 || (t?.mipmaps ?? true);
	const o = n === "nearest" ? a ? e.NEAREST_MIPMAP_NEAREST : e.NEAREST : a ? e.LINEAR_MIPMAP_LINEAR : e.LINEAR;
	e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MIN_FILTER, o);
	e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MAG_FILTER, n === "nearest" ? e.NEAREST : e.LINEAR);
	const s = r(e, t?.wrap);
	e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_S, s);
	e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_T, s);
	if (i > 1) e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MAX_LEVEL, i - 1);
	else if (a) e.generateMipmap(e.TEXTURE_2D);
}
function o(e) {
	return !!e && typeof e.texStorage2D === "function";
}
/**
* The engine's WebGL2 context, looked up through emscripten's GL bookkeeping.
* Duck-typed on `texStorage2D`: WeChat MiniGames have no `WebGL2RenderingContext`
* global, where an `instanceof` check THREW and read as "no context", refusing
* every KTX2 texture. Falls back to any registered context when none is current.
*/
function s(e) {
	try {
		const t = e?.currentContext?.GLctx;
		if (o(t)) return t;
		for (const t of e?.contexts ?? []) if (t && o(t.GLctx)) return t.GLctx;
	} catch {}
	return null;
}
/**
* Run `fn` with `texture` bound, and leave the unit bound to what it had.
*
* The device's context is not ours to leave changed: the device remembers what
* each unit holds and skips a bind it thinks is already made. Binding here on the
* unit it last made active (often 15, the per-instance records) made the device's
* memory a lie: it kept skipping its own bind, every instanced mesh read this
* texture as its transforms, and once the texture was freed they read nothing and
* the whole scene drew black, for good.
*/
function c(e, t, n) {
	const r = e.getParameter(e.TEXTURE_BINDING_2D);
	e.bindTexture(e.TEXTURE_2D, t);
	try {
		return n();
	} finally {
		e.bindTexture(e.TEXTURE_2D, r);
	}
}
/**
* Create a GL texture, let `write` fill the bound texture, and hand it to the
* device; returns the engine handle. The device owns it from here — it deletes the
* object with the handle and builds a replacement after a loss, so nothing outside
* this file may keep the WebGLTexture.
*/
function l(e, n, r, i) {
	const a = n.createTexture();
	if (!a) throw new Error("the GL context gave no texture (is it lost?)");
	try {
		c(n, a, () => r(n));
	} catch (e) {
		n.deleteTexture(a);
		throw e;
	}
	const o = e.GL;
	const s = o.getNewId(o.textures);
	o.textures[s] = a;
	const l = t();
	return i.gpuBytes !== void 0 && l.registerExternalTextureSized ? l.registerExternalTextureSized(s, i.width, i.height, i.gpuBytes, i.content) : l.registerExternalTexture(s, i.width, i.height, i.content);
}
/**
* Write into the texture the device has behind `handle` RIGHT NOW.
*
* After a device loss that is a different native object, so a caller that kept
* its own would be uploading into a dead one — which is exactly how a video came
* back blank. False when there is no context or the handle has no texture yet.
*/
function u(e, n, r) {
	const i = s(e?.GL);
	if (!i || !e || !n) return false;
	const a = t().getTextureNativeId?.(n) ?? 0;
	const o = a ? e.GL.textures[a] : null;
	if (!o) return false;
	c(i, o, () => r(i));
	return true;
}
/** The GL context pixels are read through, made once; null where there is none (a host without WebGL2, a test). */
let d;
function f() {
	if (d !== void 0) return d;
	d = null;
	try {
		const t = e(1, 1).getContext("webgl2", {
			alpha: true,
			premultipliedAlpha: false,
			antialias: false,
			depth: false,
			stencil: false
		});
		if (t && typeof t.texImage2D === "function" && typeof t.readPixels === "function") d = t;
	} catch {
		d = null;
	}
	return d;
}
/**
* The texels of a decoded bitmap exactly as the file has them, through a texture rather than a canvas. A 2D canvas keeps its pixels premultiplied, so
* the colour of a texel that is clear is gone by the time it is read back, and a texture that carries data in its colour under a clear alpha (a weight map
* the ground is mixed by) comes out black. A texture keeps what it is given.
*/
function p(e, t, n) {
	const r = f();
	if (!r || t > r.getParameter(r.MAX_TEXTURE_SIZE) || n > r.getParameter(r.MAX_TEXTURE_SIZE)) return null;
	const i = r.createTexture();
	const a = r.createFramebuffer();
	try {
		r.bindTexture(r.TEXTURE_2D, i);
		r.pixelStorei(r.UNPACK_FLIP_Y_WEBGL, false);
		r.pixelStorei(r.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		r.pixelStorei(r.UNPACK_COLORSPACE_CONVERSION_WEBGL, r.NONE);
		r.texImage2D(r.TEXTURE_2D, 0, r.RGBA, r.RGBA, r.UNSIGNED_BYTE, e);
		r.bindFramebuffer(r.FRAMEBUFFER, a);
		r.framebufferTexture2D(r.FRAMEBUFFER, r.COLOR_ATTACHMENT0, r.TEXTURE_2D, i, 0);
		if (r.checkFramebufferStatus(r.FRAMEBUFFER) !== r.FRAMEBUFFER_COMPLETE) return null;
		const o = new Uint8Array(t * n * 4);
		r.readPixels(0, 0, t, n, r.RGBA, r.UNSIGNED_BYTE, o);
		return r.getError() === r.NO_ERROR ? o : null;
	} catch {
		return null;
	} finally {
		r.bindFramebuffer(r.FRAMEBUFFER, null);
		r.deleteFramebuffer(a);
		r.deleteTexture(i);
	}
}
//#endregion
export { i as a, p as i, s as n, u as o, l as r, a as t };

//# sourceMappingURL=glTextureUpload.js.map