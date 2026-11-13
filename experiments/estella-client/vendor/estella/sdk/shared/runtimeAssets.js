import { t as e } from "./wasmScratch.js";
import { o as t, s as n } from "./resourceManager.js";
import { TextureContent as r } from "../wasm.js";
import { c as i } from "./env.js";
import { r as a, t as o } from "./glTextureUpload.js";
//#region src/assetTypes.ts
const s = [
	{
		extensions: [
			"png",
			"jpg",
			"jpeg",
			"gif",
			"webp",
			"svg"
		],
		contentType: "image",
		editorType: "texture",
		addressableType: "texture",
		wechatPackInclude: false,
		hasTransitiveDeps: false
	},
	{
		extensions: ["ktx2"],
		contentType: "binary",
		editorType: "texture",
		addressableType: "texture",
		wechatPackInclude: true,
		hasTransitiveDeps: false
	},
	{
		extensions: ["esimage"],
		contentType: "json",
		editorType: "texture",
		addressableType: "texture",
		wechatPackInclude: true,
		hasTransitiveDeps: false
	},
	{
		extensions: [
			"mp3",
			"wav",
			"ogg",
			"aac",
			"flac",
			"m4a",
			"webm"
		],
		contentType: "audio",
		editorType: "audio",
		addressableType: "audio",
		wechatPackInclude: false,
		hasTransitiveDeps: false
	},
	{
		extensions: [
			"mp4",
			"m4v",
			"mov"
		],
		contentType: "binary",
		editorType: "video",
		addressableType: "binary",
		wechatPackInclude: false,
		hasTransitiveDeps: false
	},
	{
		extensions: [
			"mpg",
			"mpeg",
			"esv"
		],
		contentType: "binary",
		editorType: "video",
		addressableType: "binary",
		wechatPackInclude: true,
		hasTransitiveDeps: false
	},
	{
		extensions: ["esmaterial"],
		contentType: "json",
		editorType: "material",
		addressableType: "material",
		wechatPackInclude: true,
		hasTransitiveDeps: true
	},
	{
		extensions: ["esshader"],
		contentType: "text",
		editorType: "shader",
		addressableType: null,
		wechatPackInclude: false,
		hasTransitiveDeps: false
	},
	{
		extensions: ["atlas"],
		contentType: "text",
		editorType: "spine-atlas",
		addressableType: "binary",
		wechatPackInclude: true,
		hasTransitiveDeps: true
	},
	{
		extensions: ["skel"],
		contentType: "binary",
		editorType: "spine-skeleton",
		addressableType: "spine",
		wechatPackInclude: true,
		hasTransitiveDeps: true
	},
	{
		extensions: ["dbbin"],
		suffixes: ["_ske.json"],
		contentType: "binary",
		editorType: "dragonbones-skeleton",
		addressableType: "binary",
		wechatPackInclude: true,
		hasTransitiveDeps: false
	},
	{
		extensions: [],
		suffixes: ["_tex.json"],
		contentType: "text",
		editorType: "dragonbones-atlas",
		addressableType: "binary",
		wechatPackInclude: true,
		hasTransitiveDeps: true
	},
	{
		extensions: ["json"],
		contentType: "json",
		editorType: "json",
		addressableType: "json",
		wechatPackInclude: false,
		hasTransitiveDeps: false
	},
	{
		extensions: ["inputmap"],
		contentType: "json",
		editorType: "json",
		addressableType: "json",
		wechatPackInclude: true,
		hasTransitiveDeps: false
	},
	{
		extensions: ["bmfont"],
		contentType: "json",
		editorType: "bitmap-font",
		addressableType: "bitmap-font",
		wechatPackInclude: true,
		hasTransitiveDeps: true
	},
	{
		extensions: ["fnt"],
		contentType: "text",
		editorType: "bitmap-font",
		addressableType: "bitmap-font",
		wechatPackInclude: true,
		hasTransitiveDeps: true
	},
	{
		extensions: [
			"ttf",
			"otf",
			"woff",
			"woff2"
		],
		contentType: "binary",
		editorType: "font",
		addressableType: "font",
		wechatPackInclude: true,
		hasTransitiveDeps: false
	},
	{
		extensions: ["esprefab"],
		contentType: "json",
		editorType: "prefab",
		addressableType: "prefab",
		wechatPackInclude: true,
		hasTransitiveDeps: true
	},
	{
		extensions: ["esscene"],
		contentType: "json",
		editorType: "scene",
		addressableType: null,
		wechatPackInclude: false,
		hasTransitiveDeps: false
	},
	{
		extensions: ["esmesh"],
		contentType: "binary",
		editorType: "mesh",
		addressableType: "binary",
		wechatPackInclude: true,
		hasTransitiveDeps: false
	},
	{
		extensions: ["esanim"],
		contentType: "json",
		editorType: "anim-clip",
		addressableType: null,
		wechatPackInclude: true,
		hasTransitiveDeps: true
	},
	{
		extensions: ["tmj"],
		contentType: "json",
		editorType: "tilemap",
		addressableType: "json",
		wechatPackInclude: true,
		hasTransitiveDeps: true
	},
	{
		extensions: ["estileset"],
		contentType: "json",
		editorType: "tileset",
		addressableType: "json",
		wechatPackInclude: true,
		hasTransitiveDeps: true
	},
	{
		extensions: ["estimeline"],
		contentType: "json",
		editorType: "timeline",
		addressableType: "json",
		wechatPackInclude: true,
		hasTransitiveDeps: true
	},
	{
		extensions: ["esaudioevent"],
		contentType: "json",
		editorType: "sound-event",
		addressableType: "json",
		wechatPackInclude: true,
		hasTransitiveDeps: true
	},
	{
		extensions: ["esworld"],
		contentType: "json",
		editorType: "world-rules",
		addressableType: "json",
		wechatPackInclude: true,
		hasTransitiveDeps: true
	},
	{
		extensions: ["esterrainlayer"],
		contentType: "json",
		editorType: "terrain-layer",
		addressableType: "json",
		wechatPackInclude: true,
		hasTransitiveDeps: true
	},
	{
		extensions: ["esterrain"],
		contentType: "json",
		editorType: "terrain-tiles",
		addressableType: "json",
		wechatPackInclude: true,
		hasTransitiveDeps: true
	},
	{
		extensions: ["eslocale"],
		contentType: "json",
		editorType: "json",
		addressableType: "json",
		wechatPackInclude: true,
		hasTransitiveDeps: false
	},
	{
		extensions: ["esfsm"],
		contentType: "json",
		editorType: "json",
		addressableType: "json",
		wechatPackInclude: true,
		hasTransitiveDeps: false
	},
	{
		extensions: ["esanimator"],
		contentType: "json",
		editorType: "json",
		addressableType: "json",
		wechatPackInclude: true,
		hasTransitiveDeps: false
	},
	{
		extensions: ["esbt"],
		contentType: "json",
		editorType: "json",
		addressableType: "json",
		wechatPackInclude: true,
		hasTransitiveDeps: false
	},
	{
		extensions: ["esgraph"],
		contentType: "json",
		editorType: "json",
		addressableType: "json",
		wechatPackInclude: true,
		hasTransitiveDeps: false
	},
	{
		extensions: ["esenv"],
		contentType: "json",
		editorType: "json",
		addressableType: "json",
		wechatPackInclude: true,
		hasTransitiveDeps: true
	},
	{
		extensions: ["esprobes"],
		contentType: "json",
		editorType: "json",
		addressableType: "json",
		wechatPackInclude: true,
		hasTransitiveDeps: false
	}
];
const c = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
	svg: "image/svg+xml",
	bmp: "image/bmp",
	ktx2: "image/ktx2",
	mp3: "audio/mpeg",
	wav: "audio/wav",
	ogg: "audio/ogg",
	aac: "audio/aac",
	m4a: "audio/mp4",
	flac: "audio/flac",
	webm: "audio/webm",
	mp4: "video/mp4",
	m4v: "video/x-m4v",
	mov: "video/quicktime",
	mpg: "video/mpeg",
	mpeg: "video/mpeg",
	esv: "video/mpeg",
	json: "application/json",
	atlas: "text/plain",
	skel: "application/octet-stream",
	esmaterial: "application/json",
	esshader: "text/plain",
	esprefab: "application/json",
	esmesh: "application/octet-stream",
	esanim: "application/json",
	estimeline: "application/json",
	estileset: "application/json",
	eslocale: "application/json",
	esfsm: "application/json",
	esanimator: "application/json",
	esbt: "application/json",
	esenv: "application/json",
	esprobes: "application/json",
	bmfont: "application/json",
	fnt: "text/plain"
};
const l = /* @__PURE__ */ new Map();
const u = /* @__PURE__ */ new Set();
for (const e of s) for (const t of e.extensions) {
	l.set(t, e);
	u.add(t);
}
/**
* A host whose packer refuses a custom suffix takes the file under `.bin`
* (exportMiniGame's restage). What it IS is still whatever the real suffix says,
* so read through that wrapper — but only when a known extension is under it, or
* a file genuinely named `foo.bin` would read as one with no extension at all.
*/
function d(e) {
	const t = e.toLowerCase();
	const n = (e) => {
		const t = e.lastIndexOf(".");
		return t >= 0 ? e.substring(t + 1) : e;
	};
	if (t.endsWith(".bin")) {
		const e = n(t.slice(0, -4));
		if (u.has(e)) return e;
	}
	return n(t);
}
/**
* A path with the restage `.bin` wrapper removed, when it wraps an extension this
* registry knows. Readers that care about a specific format ask this rather than
* spelling both paths — one place learns what a restaged file looks like.
*/
function f(e) {
	const t = e.toLowerCase();
	if (!t.endsWith(".bin")) return t;
	const n = t.slice(0, -4);
	const r = n.lastIndexOf(".");
	const i = r >= 0 ? n.substring(r + 1) : n;
	return u.has(i) ? n : t;
}
function p(e) {
	const t = e.toLowerCase();
	for (const e of s) if (e.suffixes?.some((e) => t.endsWith(e))) return e;
	return l.get(d(e));
}
function m(e) {
	return p(e)?.editorType ?? "unknown";
}
function h(e) {
	return p(e)?.addressableType ?? null;
}
function g(e) {
	for (const t of s) if (t.editorType === e) return t.addressableType;
	if (e === "text") return "text";
	if (e === "binary") return "binary";
	return "binary";
}
function _(e) {
	return u.has(e.toLowerCase());
}
function v() {
	return u;
}
function y(e) {
	if (typeof e !== "string") return false;
	if (!e.includes("/")) return false;
	return _(d(e));
}
function b() {
	const e = [];
	for (const t of s) if (t.wechatPackInclude) for (const n of t.extensions) e.push(`.${n}`);
	return e;
}
function x() {
	return b().map((e) => ({
		type: "suffix",
		value: e
	}));
}
function S(e) {
	return c[e.toLowerCase()];
}
function C(e) {
	return p(e)?.wechatPackInclude ?? false;
}
//#endregion
//#region src/asset/compressed.ts
/**
* Compressed-texture loading (KTX2 / Basis Universal).
*
* Decoded textures stay GPU-compressed in VRAM (4–8× smaller than RGBA8), the key
* constraint on mobile. The actual transcode is done by a wasm side-module behind
* the {@link BasisTranscoder} seam; this module owns the device
* capability probe, the format choice, and the WebGL upload — all testable without
* the wasm.
*
* Upload is JS-direct (`gl.compressedTexImage2D`) to mirror the existing
* `TextureLoader` PNG path, and because WebGL compressed-texture extensions must be
* enabled JS-side via `getExtension`. The C++ `GfxDevice::compressedTexImage2D`
* entry backs the non-WebGL2 fallback path instead.
*/
/**
* GPU compressed formats the transcoder can target, mirroring the C++
* `GfxCompressedFormat`. ASTC is best quality/size, ETC2 is the WebGL2 baseline,
* S3TC covers desktop GPUs.
*/
let w = /* @__PURE__ */ function(e) {
	e["ETC2_RGBA8"] = "etc2-rgba8";
	e["ASTC_4x4"] = "astc-4x4";
	e["S3TC_DXT5"] = "s3tc-dxt5";
	return e;
}({});
const T = [
	171,
	75,
	84,
	88,
	32,
	50,
	48,
	187,
	13,
	10,
	26,
	10
];
/** True if `bytes` begins with the 12-byte KTX2 file identifier. */
function E(e) {
	if (e.length < T.length) return false;
	for (let t = 0; t < T.length; t++) if (e[t] !== T[t]) return false;
	return true;
}
/** True if `path` names a KTX2 container, including the `.ktx2.bin` a packer
*  that refuses the real suffix is given (what restaging looks like is
*  `unwrapRestagedPath`'s to know, not every reader's). */
function D(e) {
	return f(e).endsWith(".ktx2");
}
/**
* Probes — and, crucially, *enables* — the WebGL compressed-texture extensions.
* `getExtension` is the only way to turn an extension on, so this must run before
* any `compressedTexImage2D` with a non-core format.
*/
function O(e) {
	return {
		astc: e.getExtension("WEBGL_compressed_texture_astc"),
		etc: e.getExtension("WEBGL_compressed_texture_etc"),
		s3tc: e.getExtension("WEBGL_compressed_texture_s3tc"),
		s3tcSrgb: e.getExtension("WEBGL_compressed_texture_s3tc_srgb")
	};
}
/**
* The C++ `GfxCompressedFormat` ordinal for each target, as [unorm, sRGB].
*
* Asking the ENGINE which formats it samples is the only question both backends
* answer; WebGL extensions are one backend's answer, and on the other one that
* answer is "none", which is how a compressed texture became a white placeholder.
*/
const k = {
	["etc2-rgba8"]: [1, 6],
	["astc-4x4"]: [2, 7],
	["s3tc-dxt5"]: [5, 8]
};
/** The engine's ordinal for `format` under the running colour pipeline. */
function A(e, t) {
	return k[e][t ? 1 : 0];
}
/**
* Quality/size order: ASTC (best), ETC2 (the WebGL2 baseline), S3TC (desktop).
*
* ONE list. The GL path and the engine-upload path ask different oracles about
* the same device; a second ordering would let a texture land in a different
* format depending on which backend loaded it.
*/
const j = [
	"astc-4x4",
	"etc2-rgba8",
	"s3tc-dxt5"
];
/** Best target the ENGINE says it can sample, in {@link TARGET_PREFERENCE} order. */
function M(e, t = false) {
	for (const n of j) if (e(A(n, t))) return n;
	return null;
}
/**
* Best available target in {@link TARGET_PREFERENCE} order. null = none.
* With `srgb` (linear pipeline) a format only qualifies when its sRGB variant is
* uploadable — S3TC needs the separate s3tc_srgb extension; ASTC/ETC2 sRGB ride
* the same extension as their UNORM twins. The transcoded block data is
* identical either way; only the sampling interpretation differs, which is why
* "can this be uploaded" IS whether an internalformat exists for it.
*/
function N(e, t = false) {
	for (const n of j) if (F(e, n, t) !== null) return n;
	return null;
}
/** Every target this device samples, best first — the capability, not a choice. */
function P(e) {
	return j.filter(e);
}
/** WebGL `internalformat` enum for a chosen format, from its enabling extension. */
function F(e, t, n = false) {
	switch (t) {
		case "astc-4x4":
			if (!e.astc) return null;
			return n ? e.astc.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR : e.astc.COMPRESSED_RGBA_ASTC_4x4_KHR;
		case "etc2-rgba8":
			if (!e.etc) return null;
			return n ? e.etc.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC : e.etc.COMPRESSED_RGBA8_ETC2_EAC;
		case "s3tc-dxt5":
			if (n) return e.s3tcSrgb ? e.s3tcSrgb.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT : null;
			return e.s3tc ? e.s3tc.COMPRESSED_RGBA_S3TC_DXT5_EXT : null;
	}
	return null;
}
/**
* The chain from the first level no larger than @p maxEdge on a side: what a texture held smaller than its file needs, without decoding
* or encoding anything. A file whose smallest level is still larger keeps its smallest; 0 keeps the chain as it is.
*/
function I(e, t) {
	if (!t || t <= 0 || Math.max(e.width, e.height) <= t) return e;
	const n = e.levels && e.levels.length > 0 ? e.levels : [{
		width: e.width,
		height: e.height,
		data: e.data
	}];
	let r = n.findIndex((e) => Math.max(e.width, e.height) <= t);
	if (r < 0) r = n.length - 1;
	const i = n.slice(r);
	return {
		...e,
		width: i[0].width,
		height: i[0].height,
		data: i[0].data,
		levels: i
	};
}
/**
* A texture's sampling from the levels it was given: a chain the file carried is
* sampled as one, and a single compressed level samples without mips — a mip
* filter over one level would make it incomplete, and no compressed format can
* generate the rest. Only uncompressed pixels may have a chain generated.
*/
function L(e, t, n, r) {
	o(e, {
		filter: r?.filter,
		wrap: r?.wrap,
		mipmaps: n,
		levels: t
	});
}
function R(e, t) {
	const n = {
		width: e.width,
		height: e.height,
		data: e.data
	};
	if (t?.mipmaps === false) return [n];
	return e.levels && e.levels.length > 0 ? e.levels : [n];
}
/** S3TC requires each mip's dimensions, scaled to level zero, to align to
* four texels. Small tail levels remain valid at their original mip index. */
function z(e, t) {
	return e !== "s3tc-dxt5" || t.every((e, t) => e.width * 2 ** t % 4 === 0 && e.height * 2 ** t % 4 === 0);
}
/** Upload pre-transcoded compressed blocks via `gl.compressedTexImage2D`. */
function B(e, t, n, i, o, s) {
	const c = F(n, i, s?.srgb ?? false);
	if (c == null) throw new Error(`compressed upload: no GL internalformat for ${i}`);
	const l = R(o, s);
	if (!z(i, l)) throw new Error("S3TC texture mip dimensions are not block aligned for WebGL");
	return {
		handle: a(t, e, (e) => {
			l.forEach((t, n) => e.compressedTexImage2D(e.TEXTURE_2D, n, c, t.width, t.height, 0, t.data));
			L(e, l.length, false, s);
		}, {
			width: o.width,
			height: o.height,
			content: r.Asset,
			gpuBytes: l.reduce((e, t) => e + t.data.byteLength, 0)
		}),
		width: o.width,
		height: o.height
	};
}
/** Fallback: upload decoded RGBA8 via `gl.texImage2D`. */
function V(e, t, n, i) {
	return {
		handle: a(t, e, (e) => {
			const t = i?.srgb ? e.SRGB8_ALPHA8 : e.RGBA;
			const r = R(n, i);
			r.forEach((n, r) => e.texImage2D(e.TEXTURE_2D, r, t, n.width, n.height, 0, e.RGBA, e.UNSIGNED_BYTE, n.data));
			L(e, r.length, r.length === 1 && i?.mipmaps !== false, i);
		}, {
			width: n.width,
			height: n.height,
			content: r.Asset
		}),
		width: n.width,
		height: n.height
	};
}
/** The decision a compressed payload came to, given the device's answer and
*  whether the transcode to it worked. Pure — the three cases hold without a
*  GL context, a device or the basis module. */
function H(e, t) {
	if (e === null) return {
		payload: "ktx2",
		target: null,
		effective: "rgba8",
		reason: "no-device-format"
	};
	if (!t) return {
		payload: "ktx2",
		target: e,
		effective: "rgba8",
		reason: "transcode-failed"
	};
	return {
		payload: "ktx2",
		target: e,
		effective: e,
		reason: "compressed"
	};
}
/** The target an engine ordinal names, or null when it names none of the three
*  (an RGBA upload, or a format no loader targets). */
function U(e) {
	for (const t of j) {
		const [n, r] = k[t];
		if (e === n || e === r) return t;
	}
	return null;
}
/**
* What a native host's own KTX2 upload came to.
*
* `format` is the engine ordinal it uploaded, negative when it decoded to RGBA.
* `blockRefused` separates the two ways that happens — an image that was not
* whole blocks, or a device that offered nothing. Only the first is the asset's.
*/
function W(e, t) {
	const n = U(e);
	if (n) return {
		payload: "ktx2",
		target: n,
		effective: n,
		reason: "compressed"
	};
	return {
		payload: "ktx2",
		target: null,
		effective: "rgba8",
		reason: t ? "not-block-aligned" : "no-device-format"
	};
}
/** A texture that was never a compressed payload — an ordinary image upload. */
const G = {
	payload: "raw",
	target: null,
	effective: "rgba8",
	reason: "uncompressed-payload"
};
/**
* Load a KTX2 buffer into a GPU texture: prefer a device-supported compressed
* format, fall back to RGBA8 when none is available or the compressed transcode
* fails. Throws only if even the RGBA decode fails (a corrupt/unsupported file).
*/
async function K(e, t, n, r, i) {
	const a = O(e);
	const o = N(a, i?.srgb ?? false);
	const s = o !== null ? await n.transcode(r, o) : null;
	const c = s ? I(s, i?.maxEdge) : null;
	const l = o !== null && c !== null && z(o, R(c, i));
	const u = o !== null && c && !l ? {
		payload: "ktx2",
		target: o,
		effective: "rgba8",
		reason: "not-block-aligned"
	} : H(o, c !== null);
	if (o !== null && c && l) return {
		...B(e, t, a, o, c, i),
		decision: u
	};
	const d = await n.transcodeToRgba(r);
	if (!d) throw new Error("BasisTranscoder failed to decode KTX2 (compressed and RGBA paths both failed)");
	return {
		...V(e, t, I(d, i?.maxEdge), i),
		decision: u
	};
}
//#endregion
//#region src/runtime/runtimeAssets.ts
/**
* @file    runtimeAssets.ts
* @brief   Shared runtime asset primitives — the pluggable asset-fetch provider
*          interface and the decoded-pixels → GL texture upload — used by the
*          builder runtime loader and the spine scene loader (and any editor that
*          drives the same load path). Kept in its own module so neither the
*          runtime loader nor the spine loader has to import the other.
*/
const q = {
	"nearest": 0,
	"linear": 1
};
/** Set on a filter code to ask `rm_createTextureEx` for a mip chain. */
const J = 2;
/** The `rm_createTextureEx` filter code: nearest or linear, and whether it has mips. */
function Y(e) {
	return (q[e.filterMode ?? "linear"] ?? 1) | (e.mipmaps ? J : 0);
}
const X = {
	"repeat": 0,
	"clamp": 1,
	"mirror": 2
};
/** Upload decoded RGBA pixels as a GL texture; returns the engine texture handle.
*  `module` is the wasm-heap marshalling vehicle; it may be null on the native
*  (embedded-Dawn) backend, whose ResourceManager takes the bytes directly. */
/**
* A texture for an ATLAS PAGE, in whichever form the cook left it — KTX2 through the
* ResourceManager or the realm's transcoder, the choice TextureLoader makes. After a
* device loss the page is decoded again and moved behind the handle the skeleton holds.
*/
async function Z(e, r, i, a, o) {
	const s = () => Q(e, r, i, a, o);
	const c = await s();
	t(c.handle, async () => {
		const e = await s();
		const t = n();
		const r = t.adoptTextureContent?.(c.handle, e.handle) ?? false;
		t.releaseTexture(e.handle);
		return r;
	});
	return c;
}
async function Q(e, t, a, o, s) {
	if (!D(e)) {
		const t = await a(e);
		return {
			handle: $(s, t, r.AtlasPage, false),
			...t
		};
	}
	const c = new Uint8Array(await t(e));
	const l = n();
	if (l.createTextureFromKTX2) {
		const t = l.createTextureFromKTX2(c, i());
		if (!t) throw new Error(`KTX2 transcode failed: ${e}`);
		return t;
	}
	const u = await o?.();
	if (!u) throw new Error("KTX2 atlas page but no Basis transcoder in this realm");
	const d = await u.transcodeToRgba(c);
	if (!d) throw new Error(`KTX2 transcode failed: ${e}`);
	const f = {
		width: d.width,
		height: d.height,
		pixels: d.data
	};
	return {
		handle: $(s, f, r.AtlasPage, false),
		...f
	};
}
function $(t, r, a, o = true, s, c) {
	const l = c ?? n();
	const u = i(s?.srgb) ? 2 : 1;
	if (l.createTextureFromBytes) {
		const e = s ? Y(s) : void 0;
		const t = s?.wrapMode ? X[s.wrapMode] ?? 1 : void 0;
		return l.createTextureFromBytes(r.width, r.height, r.pixels, u, o, a, e, t);
	}
	if (!t) throw new Error("createTextureFromPixels: a wasm module is required for the heap upload path");
	return e(t, r.pixels.length, (e) => {
		t.HEAPU8.set(r.pixels, e);
		if (s && (s.filterMode || s.wrapMode || s.mipmaps) && l.createTextureEx) {
			const t = Y(s);
			const n = X[s.wrapMode ?? "clamp"] ?? 1;
			return l.createTextureEx(r.width, r.height, e, r.pixels.length, u, o, t, n, a);
		}
		return l.createTexture(r.width, r.height, e, r.pixels.length, u, o, a);
	});
}
/**
* A 2D texture array of same-size RGBA8 layers, for a `textureArray` material param (`Material.tex(handle)`).
* Layers go up in the rows given, never flipped, and are fixed: there is no sub-rectangle update. Pass
* `TextureContent.Retained` for an array that must survive a device loss. Returns 0 when the engine refuses it.
*/
function ee(t, r, a, o, s) {
	const { width: c, height: l, layers: u } = r;
	const d = c * l * 4;
	if (u.length === 0 || u.some((e) => e.length !== d)) throw new Error(`createTextureArrayFromPixels: every layer must be ${c}x${l} RGBA8 (${d} bytes)`);
	const f = s ?? n();
	const p = i(o?.srgb) ? 2 : 1;
	const m = o ? Y(o) : -1;
	const h = X[o?.wrapMode ?? "clamp"] ?? 1;
	const g = d * u.length;
	if (f.createTextureArrayFromBytes) {
		const e = new Uint8Array(g);
		u.forEach((t, n) => e.set(t, n * d));
		return f.createTextureArrayFromBytes(c, l, u.length, e, p, m, h, a);
	}
	if (!f.createTextureArray || !t) throw new Error("createTextureArrayFromPixels: needs the wasm ResourceManager and its heap");
	return e(t, g, (e) => {
		if (!e) return 0;
		u.forEach((n, r) => t.HEAPU8.set(n, e + r * d));
		return f.createTextureArray(c, l, u.length, e, g, p, m, h, a);
	});
}
/**
* Upload pixels into a sub-rectangle of an existing texture. Lets the dynamic
* glyph atlas pack glyphs individually instead of re-uploading
* the whole atlas. `pixels` must match the texture's format (RGBA8) and the
* rect must lie inside the texture (the engine bounds-checks and no-ops if not).
*/
function te(t, r, i, a, o, s, c, l) {
	if (o <= 0 || s <= 0 || c.length === 0) return;
	const u = l ?? n();
	if (u.updateTextureSubregionFromBytes) {
		u.updateTextureSubregionFromBytes(r, i, a, o, s, c);
		return;
	}
	if (!u.updateTextureSubregion || !t) return;
	e(t, c.length, (e) => {
		t.HEAPU8.set(c, e);
		u.updateTextureSubregion(r, i, a, o, s, e, c.length);
	});
}
//#endregion
export { b as C, _ as D, C as E, y as O, p as S, x as T, P as _, w as a, v as b, H as c, F as d, W as f, K as g, I as h, te as i, O as l, D as m, ee as n, G as o, E as p, $ as r, M as s, Z as t, A as u, h as v, m as w, S as x, g as y };

//# sourceMappingURL=runtimeAssets.js.map