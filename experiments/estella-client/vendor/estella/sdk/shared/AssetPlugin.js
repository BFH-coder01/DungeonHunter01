import { Z as e, c as t, in as n, n as r, qt as i, z as a } from "./system.js";
import { i as o, s } from "./resource.js";
import { s as c } from "./logger.js";
import { F as l, G as u, H as d, Q as f, S as p, U as m, W as h, Y as g, _ as ee, et as _, k as te, n as v, nt as y, o as b, w as x } from "./base.js";
import { n as S } from "./utf8.js";
import { r as ne } from "./worldUnits.js";
import { t as C } from "./disposeAll.js";
import { n as w, t as T } from "./wasmScratch.js";
import { d as re, n as ie, s as E, t as D } from "./resourceManager.js";
import { TextureContent as O, textureContentName as ae } from "../wasm.js";
import { c as oe, o as se } from "./env.js";
import { S as k, _ as ce, a as le, c as A, d as ue, f as de, g as fe, h as pe, l as me, m as he, o as ge, p as _e, r as ve, s as ye, u as be } from "./runtimeAssets.js";
import { a as xe, n as Se, r as Ce, t as we } from "./glTextureUpload.js";
import { a as Te, i as Ee, o as De, t as Oe } from "./SpriteAnimator.js";
import { n as ke } from "./migrate.js";
import { F as Ae, G as je, K as Me, P as Ne, U as Pe, W as Fe, d as Ie, n as Le, o as Re, q as ze } from "./scene.js";
import { t as Be } from "./prepareSpine.js";
import { r as j, u as Ve } from "./material.js";
import { t as He } from "./CoreApiBridge.js";
import { h as Ue } from "./defaults.js";
import { i as We, r as Ge, t as Ke } from "./meshCollision.js";
import { c as qe, i as Je, l as Ye, n as Xe, o as Ze, t as Qe } from "./textureRecipe.js";
import { i as $e, t as et } from "./builtinShaders.js";
import { a as tt, i as nt, n as M, r as N, s as rt } from "./meshFormat.js";
//#region src/asset/textureImportSettings.ts
/**
* A 9-slice border, or undefined when the block slices nothing. All-zero is the
* "not 9-sliced" default and must NOT be stamped onto the texture: doing so
* would clear a border another consumer authored.
*/
function it(e) {
	if (!e || typeof e !== "object") return void 0;
	const t = e;
	const n = (e) => typeof e === "number" && Number.isFinite(e) && e > 0 ? e : 0;
	const r = {
		left: n(t.left),
		right: n(t.right),
		top: n(t.top),
		bottom: n(t.bottom)
	};
	return r.left || r.right || r.top || r.bottom ? r : void 0;
}
/** Parse an importer block; undefined when it carries nothing the loader needs. */
function at(e) {
	if (!e) return void 0;
	const t = e.filterMode === "nearest" || e.filterMode === "linear" ? e.filterMode : void 0;
	const n = e.wrapMode === "repeat" || e.wrapMode === "clamp" || e.wrapMode === "mirror" ? e.wrapMode : void 0;
	const r = typeof e.sRGB === "boolean" ? e.sRGB : void 0;
	const i = typeof e.mipmaps === "boolean" ? e.mipmaps : void 0;
	const a = it(e.sliceBorder);
	return t || n || r !== void 0 || i !== void 0 || a ? {
		filter: t,
		wrap: n,
		srgb: r,
		mipmaps: i,
		sliceBorder: a
	} : void 0;
}
/**
* Index settings by EVERY spelling a scene may name the asset with — its uuid
* bare and `@uuid:`-prefixed, its authored path with and without a leading
* slash, and the staged path a content-addressed cook renamed it to.
*
* One asset, several names, and which name a component carries is the project's
* choice: the meta-driven pipeline writes `@uuid:`, hand-authored and ported
* scenes hold paths. A lookup that indexes only one of them works on whichever
* projects happen to use that spelling and silently drops the settings for the
* rest — so the spelling fan-out is done ONCE, here, rather than guessed at by
* each realm's asset source.
*/
function ot(e) {
	const t = /* @__PURE__ */ new Map();
	for (const { uuid: n, path: r, address: i, settings: a } of e) {
		if (!a) continue;
		for (const e of [
			n,
			n && `@uuid:${n}`,
			r,
			i
		]) {
			if (!e) continue;
			t.set(e, a);
			if (!e.startsWith("/")) t.set(`/${e}`, a);
		}
	}
	return t.size > 0 ? (e) => t.get(e) : () => void 0;
}
//#endregion
//#region src/asset/AddressableManifest.ts
const st = /* @__PURE__ */ new Set();
let ct = 0;
/**
* Run `fn` asking about refs that may well not be packaged, without the warning
* for each one that is not. A video asks whether the cook demuxed an audio track
* beside it (`<video>.m4a`), and a target that plays the video whole, as the
* mobile hosts do, has none: said as a missing asset, the question failed every
* video example's boot on Android and iOS. Synchronous, so the window closes with it.
*/
function lt(e) {
	ct++;
	try {
		return e();
	} finally {
		ct--;
	}
}
/**
* A project file the package does not carry, said once and with the reason —
* otherwise the first anyone hears of it is a 404 from the loader. Only refs
* that look like files: `builtin:` meshes, URLs and blobs are not the cook's.
*/
function ut(e) {
	if (ct > 0 || st.has(e) || e.includes(":") || !/\.[a-z0-9]{2,8}$/i.test(e)) return;
	st.add(e);
	c.warn("asset", `"${e}" is not in this package. A build ships what its scenes reference, what the scripts name as a whole path in a string literal, and the folders asset-groups.json marks alwaysInclude — name the file whole in code, or mark its folder alwaysInclude.`);
}
const dt = [
	"local",
	"lazy",
	"remote"
];
/**
* Normalize a wire `bundleMode` string to a known {@link BundleMode}. Unknown /
* missing values map to `local` — the safe default: treated as part of the main
* package so the asset is always present.
*/
function ft(e) {
	return e != null && dt.includes(e) ? e : "local";
}
/**
* Queryable view over an {@link AddressableManifest}. The manifest JSON is the
* wire format; this is the **runtime single source of truth** for group / label
* / bundle-mode questions, so loaders and exporters never re-walk `groups` by
* hand and never re-interpret the bare `bundleMode` string.
*/
/** Every way a manifest entry can be named — the spellings a ref may arrive as. */
function pt(e, t, n) {
	const r = [];
	for (const i of [
		e,
		`@uuid:${e}`,
		t,
		n
	]) {
		if (!i) continue;
		r.push(i);
		if (!i.startsWith("/")) r.push(`/${i}`);
	}
	return r;
}
var mt = class e {
	constructor(e) {
		this.manifest = e;
		this.packs_ = null;
		this.keyIndex_ = null;
		this.pathIndex_ = null;
		this.remoteIndex_ = null;
	}
	static fromJson(t) {
		return new e(t);
	}
	/** The pack holding the asset at build `path`, or null when it has a file of its own. */
	packOf(e) {
		if (!this.packs_) {
			this.packs_ = /* @__PURE__ */ new Map();
			for (const e of Object.values(this.manifest.groups)) for (const t of Object.values(e.assets)) if (t.pack) this.packs_.set(t.path, t.pack);
		}
		return this.packs_.get(e) ?? null;
	}
	/** The build paths each pack holds, by pack file. */
	packMembers() {
		const e = /* @__PURE__ */ new Map();
		for (const t of Object.values(this.manifest.groups)) for (const n of Object.values(t.assets)) {
			if (!n.pack) continue;
			let t = e.get(n.pack.file);
			if (!t) e.set(n.pack.file, t = /* @__PURE__ */ new Set());
			t.add(n.path);
		}
		return e;
	}
	static empty() {
		return new e({
			version: "2.0",
			groups: {}
		});
	}
	/** All group names, in manifest order. */
	groupNames() {
		return Object.keys(this.manifest.groups);
	}
	group(e) {
		return this.manifest.groups[e] ?? null;
	}
	/** Typed delivery mode of a group (unknown group → `local`). */
	bundleMode(e) {
		return ft(this.manifest.groups[e]?.bundleMode);
	}
	/** Group names whose delivery mode equals `mode`. */
	groupsByMode(e) {
		return this.groupNames().filter((t) => this.bundleMode(t) === e);
	}
	/** Assets in a group (empty for an unknown group). */
	assetsInGroup(e) {
		const t = this.manifest.groups[e];
		return t ? Object.values(t.assets) : [];
	}
	/** Asset paths in a group. */
	assetPathsInGroup(e) {
		return this.assetsInGroup(e).map((e) => e.path);
	}
	/** Every asset across all groups. */
	allAssets() {
		const e = [];
		for (const t of Object.values(this.manifest.groups)) e.push(...Object.values(t.assets));
		return e;
	}
	/** Every asset carrying its owning group name and record key — the iteration
	*  the hot-update diff walks (allAssets() drops both). */
	entries() {
		const e = [];
		for (const [t, n] of Object.entries(this.manifest.groups)) for (const [r, i] of Object.entries(n.assets)) e.push({
			group: t,
			key: r,
			asset: i
		});
		return e;
	}
	/**
	* Per-ref texture import settings for every asset that carries them — what a
	* packaged realm answers `RuntimeAssetSource.textureImportSettings` with, so
	* a shipped game samples and 9-slices exactly as the editor did.
	*/
	textureImportLookup() {
		return ot(this.entries().map(({ key: e, asset: t }) => ({
			uuid: e,
			path: t.path,
			address: t.address,
			settings: t.textureImport
		})));
	}
	/**
	* The culling contract this build ships for a spine PAIR, or undefined.
	*
	* Both refs, because there is no useful answer about a skeleton alone. The
	* atlas is compared as an IDENTITY — `@uuid:…`, a path and an address all
	* agree — so one the contract was not made against inherits nothing.
	*/
	spineCullingLookup() {
		const e = /* @__PURE__ */ new Map();
		const t = /* @__PURE__ */ new Map();
		for (const { key: n, asset: r } of this.entries()) for (const i of pt(n, r.path, r.address)) {
			t.set(i, n);
			if (r.spineImport) e.set(i, r.spineImport);
		}
		if (e.size === 0) return () => void 0;
		return (n, r) => {
			const i = e.get(n);
			if (!i) return void 0;
			return t.get(r) === i.atlas ? i.cullingBounds : void 0;
		};
	}
	/** The manifest's build content revision (see {@link deriveManifestRevision}),
	*  or null on a legacy manifest that predates the field. */
	revision() {
		return this.manifest.revision ?? null;
	}
	/** Assets carrying `label` across all groups, deduped by path. */
	assetsByLabel(e) {
		const t = /* @__PURE__ */ new Set();
		const n = [];
		for (const r of this.allAssets()) if (r.labels.includes(e) && !t.has(r.path)) {
			t.add(r.path);
			n.push(r);
		}
		return n;
	}
	/** Find an asset by its path or its address (null if absent). */
	findAsset(e) {
		for (const t of this.allAssets()) if (t.path === e || t.address === e) return t;
		return null;
	}
	indexes() {
		if (!this.keyIndex_ || !this.pathIndex_) {
			const e = /* @__PURE__ */ new Map();
			const t = /* @__PURE__ */ new Map();
			for (const n of Object.values(this.manifest.groups)) for (const [r, i] of Object.entries(n.assets)) {
				if (!e.has(r)) e.set(r, i);
				if (!t.has(i.path)) t.set(i.path, i);
				if (i.address) {
					if (!e.has(i.address)) e.set(i.address, i);
					const t = `/${i.address}`;
					if (!e.has(t)) e.set(t, i);
				}
			}
			this.keyIndex_ = e;
			this.pathIndex_ = t;
		}
		return {
			byKey: this.keyIndex_,
			byPath: this.pathIndex_
		};
	}
	/** Asset by its group-record key (the uuid in editor/WeChat manifests). */
	assetByKey(e) {
		return this.indexes().byKey.get(e) ?? null;
	}
	/** Asset by its build path. */
	assetByPath(e) {
		return this.indexes().byPath.get(e) ?? null;
	}
	/**
	* Build path of a `remote`-group asset by ANY of its keys — record key (uuid),
	* address (logical source path, bare and `/`-rooted), or build path — or null
	* when the ref is not a remote-delivered asset. Lets a resolver route scene
	* `@uuid` refs to remote assets through the CDN (so they hot-update with the
	* manifest), while local / lazy assets keep their normal resolution.
	*/
	remoteAssetPath(e) {
		return this.remoteIndexes_().byRef.get(e) ?? null;
	}
	/**
	* The stable name of the `remote`-group asset a ref names — its address,
	* else the key it is filed under. NOT interchangeable with
	* {@link remoteAssetPath}: a build path is content-addressed, so it names
	* one revision, while this is what every revision agrees on.
	*/
	remoteAssetIdentity(e) {
		return this.remoteIndexes_().identity.get(e) ?? null;
	}
	/** Both remote indexes, built together from one walk. */
	remoteIndexes_() {
		if (!this.remoteIndex_) {
			const e = /* @__PURE__ */ new Map();
			const t = /* @__PURE__ */ new Map();
			for (const n of Object.values(this.manifest.groups)) {
				if (ft(n.bundleMode) !== "remote") continue;
				for (const [r, i] of Object.entries(n.assets)) {
					const n = i.address ?? r;
					for (const a of [
						r,
						i.path,
						...i.address ? [i.address, `/${i.address}`] : []
					]) {
						e.set(a, i.path);
						t.set(a, n);
					}
				}
			}
			this.remoteIndex_ = {
				byRef: e,
				identity: t
			};
		}
		return this.remoteIndex_;
	}
	/**
	* Resolve a serialized asset ref (a uuid, an address, or a path) to its
	* build path, falling back to the ref itself. The single manifest→path
	* resolution the shipped runtimes use, and the last word on the name: a
	* build path is whatever the cook staged the file as.
	*/
	resolvePath(e) {
		const { byKey: t, byPath: n } = this.indexes();
		const r = t.get(e) ?? n.get(e);
		if (!r) ut(e);
		return r ? r.path : e;
	}
};
//#endregion
//#region src/asset/optionalLoaders.ts
const ht = /* @__PURE__ */ new Map();
/** Called by an optional subsystem's support module. */
function gt(e, t) {
	ht.set(e, t);
}
/** Fresh instances per registry: a loader may hold per-registry state. */
function _t() {
	return [...ht.values()].map((e) => e());
}
//#endregion
//#region src/asset/documentRef.ts
/**
* Resolve a document-relative path against the referencing file's path — a Tiled
* tileset image (`"../textures/tileset.png"`), an external `.tsj` source, a material's
* sibling shader — collapsing `./` and `../` and preserving a URL scheme+authority.
*
* This is a dependency-free leaf so it can be shared by BOTH the runtime tilemap loader
* AND the editor's asset-dependency scan / cook: a tilemap's tileset dependencies must
* resolve identically wherever they're walked (discover-what-to-ship vs load-it), or the
* cook embeds one path and the runtime asks for another (the single-file playable then
* 404s a tileset it did ship, or never shipped it at all).
*/
/**
* Whether `ref` is already a LOGICAL project path rather than one relative to the
* document carrying it.
*
* The cook rewrites a map's document-relative refs into logical ones
* (`"../textures/x.png"` → `"assets/textures/x.png"`, see `rewriteTilemapRefs`),
* because a cooked payload has no directory structure left to be relative to. That
* only worked while such a map was loaded by `@uuid` — a base path with no
* directory, so joining was a no-op. Load the same map by its cooked FILE path (a
* native app reads files, not uuids) and joining doubles the prefix, which is how
* "assets/textures/tileset.png" became "assets/assets/textures/tileset.png" and
* every tile went invisible.
*
* So the shape the cook emits is recognized here, in the one place both sides
* share.
*/
function vt(e) {
	return e.startsWith("/") || e.startsWith("assets/");
}
/**
* Prefix of a ref the engine answers in CODE — a stock shader, stock geometry, the
* tilemap collision palette. Such a ref names no file, so every stage that turns a
* ref into a path (resolution, the cook's rewrite, a dependency walk) has to
* recognize it BEFORE resolving, and they have to recognize the same thing.
*/
const yt = "builtin:";
/** Whether `ref` names something built in rather than a file. */
function bt(e) {
	return e.startsWith(yt);
}
/** The id a built-in ref names, minus any `?query` it carries, or null. */
function xt(e) {
	if (!bt(e)) return null;
	const t = e.slice(8);
	const n = t.indexOf("?");
	return n < 0 ? t : t.slice(0, n);
}
/**
* Resolve a ref one document carries about another asset: a logical project path
* stands as it is, anything else is relative to the document. Every loader whose
* document names a sibling resolves through this, because the cook rewrites all
* of those refs to the same logical shape.
*/
function P(e, t) {
	return vt(t) || De(t) ? t : Ct(e, t);
}
/** @deprecated Name it for the question, not for Tiled: {@link resolveDocumentRef}. */
const St = P;
function Ct(e, t) {
	const n = /^([a-z][a-z0-9+.-]*:\/\/[^/]*)(\/.*|)$/i.exec(e);
	const r = n ? n[1] : "";
	const i = n ? n[2] : e;
	const a = i.lastIndexOf("/");
	const o = ((a >= 0 ? i.substring(0, a + 1) : "") + t).split("/");
	const s = [];
	for (const e of o) if (e === "..") s.pop();
	else if (e !== "." && e !== "") s.push(e);
	return r ? `${r}/${s.join("/")}` : s.join("/");
}
//#endregion
//#region src/render/frameCapture.ts
/**
* Memory-safety model for this module
* -----------------------------------
*
* Every function here reads from WASM-owned memory and returns values the
* caller may hold across later frames. To stay safe when WASM memory grows
* or the renderer reuses its capture buffer, we never return a typed array
* that views the WASM heap — we copy primitives into fresh JS objects /
* buffers before returning.
*
*   - decodeFrameCapture copies every field out as plain `number`s and
*     numeric arrays. The intermediate `DataView` and `Uint32Array` views
*     are local and dropped as soon as the function returns.
*   - getSnapshotImageData reads pixel rows from the heap view into a
*     freshly-allocated `Uint8ClampedArray` ("flipped") and wraps that
*     JS-owned buffer in the returned ImageData.
*
* Do NOT "optimize" either function by returning a heap-backed typed array
* directly — a subsequent WASM alloc/grow would detach it or the renderer
* would overwrite the bytes on the next capture, handing the caller silent
* corruption.
*/
/**
* Why a draw call started rather than joining the one before it. Mirrors the
* engine's BatchBreak; each member is a condition the merge itself tests.
*/
let wt = /* @__PURE__ */ function(e) {
	e[e["None"] = 0] = "None";
	e[e["RunStart"] = 1] = "RunStart";
	e[e["Instanced"] = 2] = "Instanced";
	e[e["Shader"] = 3] = "Shader";
	e[e["Blend"] = 4] = "Blend";
	e[e["Layout"] = 5] = "Layout";
	e[e["Material"] = 6] = "Material";
	e[e["Depth"] = 7] = "Depth";
	e[e["Cull"] = 8] = "Cull";
	e[e["State"] = 9] = "State";
	e[e["Scissor"] = 10] = "Scissor";
	e[e["Stencil"] = 11] = "Stencil";
	e[e["IndexGap"] = 12] = "IndexGap";
	e[e["TextureSlots"] = 13] = "TextureSlots";
	return e;
}({});
let Tt = /* @__PURE__ */ function(e) {
	e[e["Sprite"] = 0] = "Sprite";
	e[e["Spine"] = 1] = "Spine";
	e[e["Mesh"] = 2] = "Mesh";
	e[e["ExternalMesh"] = 3] = "ExternalMesh";
	e[e["Text"] = 4] = "Text";
	e[e["Particle"] = 5] = "Particle";
	e[e["Shape"] = 6] = "Shape";
	e[e["UIElement"] = 7] = "UIElement";
	return e;
}({});
/** What a pass of the frame draws: a camera's scene, or the screen-space overlay. */
let Et = /* @__PURE__ */ function(e) {
	e[e["Scene"] = 0] = "Scene";
	e[e["Overlay"] = 1] = "Overlay";
	return e;
}({});
/** sizeof(DrawCallRecord) in FrameCapture.hpp, which asserts the offsets read here. */
const Dt = 84;
/** @p bytes of engine data as a JS-owned copy: read at its address where the
*  engine gives one, else copied through a scratch buffer in the heap. */
function Ot(e, t, n, r) {
	if (t === 0) return /* @__PURE__ */ new Uint8Array(0);
	if (n) {
		const r = n();
		return r ? e.HEAPU8.slice(r, r + t) : null;
	}
	if (!r || !e._malloc || !e._free) return null;
	const i = e._malloc(t);
	if (!i) return null;
	try {
		return r(i, t) ? e.HEAPU8.slice(i, i + t) : null;
	} finally {
		e._free(i);
	}
}
function kt(e) {
	if (!e.renderer_hasCapturedData()) return null;
	const t = e.renderer_getCapturedFrameSize();
	if (t === 0) return null;
	const n = e.renderer_getCapturedEntityCount();
	const r = e.renderer_getCapturedPassCount();
	const i = e.renderer_getCapturedTextureCount();
	const a = e;
	const o = Ot(a, t * Dt, a.renderer_getCapturedFrameData && (() => a.renderer_getCapturedFrameData()), a.renderer_copyCapturedRecords && ((e, t) => a.renderer_copyCapturedRecords(e, t)));
	const s = Ot(a, n * 4, a.renderer_getCapturedEntities && (() => a.renderer_getCapturedEntities()), a.renderer_copyCapturedEntities && ((e, t) => a.renderer_copyCapturedEntities(e, t)));
	const c = Ot(a, i * 4, a.renderer_getCapturedTextures && (() => a.renderer_getCapturedTextures()), a.renderer_copyCapturedTextures && ((e, t) => a.renderer_copyCapturedTextures(e, t)));
	if (!o || !s || !c) return null;
	const l = new DataView(o.buffer);
	const u = new Uint32Array(s.buffer);
	const d = new Uint32Array(c.buffer);
	const f = [];
	for (let e = 0; e < t; e++) {
		const t = e * Dt;
		const r = l.getUint32(t + 32, true);
		const a = l.getUint32(t + 36, true);
		const o = [];
		for (let e = 0; e < r && a + e < n; e++) o.push(u[a + e]);
		const s = l.getUint8(t + 72);
		const c = l.getUint32(t + 80, true);
		const p = [];
		for (let e = 0; e < s && c + e < i; e++) p.push(d[c + e]);
		f.push({
			index: l.getUint32(t, true),
			pass: l.getUint32(t + 4, true),
			stage: l.getUint8(t + 8),
			type: l.getUint8(t + 9),
			blendMode: l.getUint8(t + 10),
			passKind: l.getUint8(t + 11),
			textureId: l.getUint32(t + 12, true),
			materialId: l.getUint32(t + 16, true),
			shaderId: l.getUint32(t + 20, true),
			indexCount: l.getUint32(t + 24, true),
			triangleCount: l.getUint32(t + 28, true),
			layer: l.getInt32(t + 40, true),
			breakReason: l.getUint8(t + 44),
			scissorX: l.getInt32(t + 48, true),
			scissorY: l.getInt32(t + 52, true),
			scissorW: l.getInt32(t + 56, true),
			scissorH: l.getInt32(t + 60, true),
			scissorEnabled: l.getUint8(t + 64) !== 0,
			stencilWrite: l.getUint8(t + 65) !== 0,
			stencilTest: l.getUint8(t + 66) !== 0,
			stencilRef: l.getInt32(t + 68, true),
			textureSlotUsage: s,
			textures: p,
			instanceCount: l.getUint32(t + 76, true),
			entities: o
		});
	}
	return {
		drawCalls: f,
		passCount: r
	};
}
/**
* Asks for the captured frame's draws up to @p drawCallIndex. The engine replays
* them on a later frame, right after the pass that drew them, so frames have to
* keep rendering until {@link getSnapshotImageData} resolves.
*/
function At(e, t) {
	e.renderer_replayToDrawCall(t);
}
/** Whether the replayed pass made as many draws as the capture did; false means
*  the scene changed since, and the snapshot shows the later frame. */
function jt(e) {
	return e.renderer_snapshotMatchesCapture();
}
/**
* Resolves with the replay snapshot's pixels once its readback lands (the async
* seam: immediate on GL, a later event-loop turn on WebGPU). Null when no
* snapshot is in flight or the readback failed.
*/
async function Mt(e) {
	if (await Ve(() => e.renderer_pollSnapshotReadback()) !== 1) return null;
	const t = e.renderer_getSnapshotSize();
	if (t === 0) return null;
	const n = e.renderer_getSnapshotWidth();
	const r = e.renderer_getSnapshotHeight();
	if (n === 0 || r === 0) return null;
	const i = e;
	const a = Ot(i, t, i.renderer_getSnapshotPtr && (() => i.renderer_getSnapshotPtr()), i.renderer_copySnapshot && ((e, t) => i.renderer_copySnapshot(e, t)));
	if (!a) return null;
	const o = new Uint8ClampedArray(a.buffer);
	const s = new Uint8ClampedArray(t);
	const c = n * 4;
	for (let e = 0; e < r; e++) {
		const t = e * c;
		const n = (r - 1 - e) * c;
		s.set(o.subarray(t, t + c), n);
	}
	return typeof ImageData === "function" ? new ImageData(s, n, r) : {
		width: n,
		height: r,
		data: s,
		colorSpace: "srgb"
	};
}
/**
* Captures the next whole frame, every pass of it. Null when @p maxFrames frames
* rendered and none of them drew anything.
*/
async function Nt(e, t, n = 8) {
	e.renderer_captureNextFrame();
	for (let r = 0; r < n; r++) {
		await t();
		const n = kt(e);
		if (n) return n;
	}
	return null;
}
/** The captured frame's pass, drawn up to and including draw @p drawCallIndex. */
async function Pt(e, t, n, r = 8) {
	if (t < 0 || t >= e.renderer_getCapturedFrameSize()) return null;
	e.renderer_replayToDrawCall(t);
	for (let t = 0; t < r && e.renderer_pollSnapshotReadback() === 0; t++) await n();
	const i = await Mt(e);
	return i ? {
		image: i,
		matchesCapture: e.renderer_snapshotMatchesCapture()
	} : null;
}
//#endregion
//#region src/render/webgpuFeatures.ts
/**
* @file  What the engine needs a WebGPU device to be created with.
*
*        A feature the adapter offers is unusable until the device asked for it,
*        and the refusal arrives late and quietly: `createTexture` throws, the
*        asset loader logs a warning, and the frame draws the white placeholder.
*        So every host that acquires a device asks the same question here rather
*        than each remembering its own list.
*/
/** Optional device features the engine uses when the adapter has them. */
const Ft = [
	"texture-compression-astc",
	"texture-compression-bc",
	"texture-compression-etc2",
	"timestamp-query"
];
/** The subset of {@link ENGINE_WEBGPU_FEATURES} this adapter actually offers. */
function It(e) {
	return Ft.filter((t) => e.features?.has(t) ?? false);
}
//#endregion
//#region src/render/webgpuBoot.ts
/**
* @file  Getting a WebGPU device before the module exists.
*
*        The wasm side reads `Module.preinitializedWebGPUDevice` synchronously,
*        so the device has to be acquired first — and acquiring it is the same
*        four steps wherever a host boots the engine: is it asked for, is there
*        an adapter, which optional features does it offer, and where do its
*        validation errors go. A host that writes those out itself gets a
*        different subset right, and the ones it misses surface as a texture
*        that never loaded or a pass that silently drew nothing.
*/
function Lt(e) {
	const t = e.info ?? {};
	const n = [
		t.vendor,
		t.architecture,
		t.device
	].filter(Boolean).join(" ");
	const r = e.isFallbackAdapter ? "fallback" : "default";
	return `${n || t.description || "unnamed adapter"} (${r})`;
}
const Rt = () => globalThis.navigator?.gpu;
/**
* A device for `requested`, or null to fall back to WebGL2 — a project that asks
* for WebGPU still runs on a browser without it, which is the only behaviour a
* shipped game can have. `onError` takes Dawn's uncaptured validation messages,
* which are dropped in silence without a listener.
*
* @beta
*/
async function zt(e, t) {
	if (e === "webgl2") return { device: null };
	const n = Rt();
	if (!n) return {
		device: null,
		reason: "navigator.gpu is unavailable"
	};
	try {
		const e = await n.requestAdapter();
		if (!e) return {
			device: null,
			reason: "no WebGPU adapter"
		};
		const r = It(e);
		const i = await e.requestDevice(r.length ? { requiredFeatures: r } : void 0);
		if (t) i.addEventListener?.("uncapturederror", (e) => {
			const n = e.error?.message;
			t(`[webgpu] uncaptured error: ${n ?? String(e)}`);
		});
		return {
			device: i,
			adapter: Lt(e)
		};
	} catch (e) {
		return {
			device: null,
			reason: `WebGPU device request failed: ${String(e)}`
		};
	}
}
//#endregion
//#region src/render/refusals.ts
/**
* @file    refusals.ts
* @brief   The engine's refusal codes as the words a reader gets.
*
* Indexed by the number the engine writes, in the order of its enums
* (LightRefusal in LightPlan.hpp, the atlas refusal in ShadowPlan). The web and
* native backends read the same codes, so they read them through one table.
*/
/** Why a light did not reach the frame. */
const Bt = [
	"none",
	"capacity",
	"no-environment-sun"
];
/** Why a shadow caster got fewer tiles than it asked for. */
const Vt = [
	"none",
	"tile-budget",
	"tile-too-large",
	"atlas-full"
];
//#endregion
//#region src/render/renderer.ts
let Ht = /* @__PURE__ */ function(e) {
	e[e["Background"] = 0] = "Background";
	e[e["Opaque"] = 1] = "Opaque";
	e[e["Transparent"] = 2] = "Transparent";
	e[e["Overlay"] = 3] = "Overlay";
	return e;
}({});
const Ut = {
	shaded: 0,
	clay: 1,
	albedo: 2,
	wireframe: 3,
	directLighting: 4,
	indirectLighting: 5
};
const Wt = {
	drawCalls: 0,
	gpuDraws: 0,
	triangles: 0,
	sprites: 0,
	text: 0,
	skeletal: 0,
	meshes: 0,
	culled: 0
};
const Gt = new He("renderer");
let F = null;
let I = 0;
/** Four floats a LOD decision is read back through. */
let L = 0;
/** Five floats a light's standing with the cap or the atlas is read back
*  through. One buffer: neither answer outlives the call that asks. */
let R = 0;
/** AtlasRefusal, in the order ShadowAtlas.hpp declares it. */
let z = null;
function B() {
	return F ?? a();
}
/** The wasm backend: every call marshals through the module's heap, exactly as
*  the Renderer always has. */
function Kt(t) {
	return {
		init: (e, n) => t.renderer_init(e, n),
		resize: (e, n) => t.renderer_resize(e, n),
		beginFrame: (e) => t.renderer_beginFrame(e),
		setOrigin: (e, n, r) => {
			t.renderer_setOrigin?.(e, n, r);
		},
		updateTransforms: (n) => {
			try {
				t.renderer_updateTransforms(n);
			} catch (t) {
				e(t, "Renderer.updateTransforms");
			}
		},
		begin: (n, r, i, a, o, s, c, l, u, d, f) => {
			if (!I) return;
			try {
				t.HEAPF32.set(n, I / 4);
				t.renderer_begin(I, r, i, a, o, s, c, l, u, d, f);
			} catch (t) {
				e(t, "Renderer.begin");
			}
		},
		submitAll: (n, r, i, a, o) => {
			try {
				t.renderer_submitAll(n, r, i, a, o);
			} catch (t) {
				e(t, "Renderer.submitAll");
			}
		},
		flush: () => {
			try {
				t.renderer_flush();
			} catch (t) {
				e(t, "Renderer.flush");
			}
		},
		end: () => {
			try {
				t.renderer_end();
			} catch (t) {
				e(t, "Renderer.end");
			}
		},
		endFrame: () => {
			try {
				t.renderer_endFrame?.();
			} catch (t) {
				e(t, "Renderer.endFrame");
			}
		},
		hasScreenOverlay: () => typeof t.renderer_beginScreenOverlay === "function",
		beginScreenOverlay: (n, r, i, a, o) => {
			if (!I) return;
			try {
				t.HEAPF32.set(n, I / 4);
				t.renderer_beginScreenOverlay?.(I, r, i, a, o);
			} catch (t) {
				e(t, "Renderer.beginScreenOverlay");
			}
		},
		submitScreenOverlay: (n) => {
			try {
				t.renderer_submitScreenOverlay?.(n);
			} catch (t) {
				e(t, "Renderer.submitScreenOverlay");
			}
		},
		endScreenOverlay: (n) => {
			try {
				t.renderer_endScreenOverlay?.(n);
			} catch (t) {
				e(t, "Renderer.endScreenOverlay");
			}
		},
		setStage: (e) => t.renderer_setStage(e),
		setViewport: (e, n, r, i) => t.renderer_setViewport(e, n, r, i),
		setYSortLayers: (e) => t.renderer_setYSortLayers?.(e >>> 0),
		setDepthLayers: (e) => t.renderer_setDepthLayers?.(e >>> 0),
		setTreeSortLayers: (e) => t.renderer_setTreeSortLayers?.(e >>> 0),
		setCullingMask: (e) => t.renderer_setCullingMask?.(e >>> 0),
		setViewId: (e) => t.renderer_setViewId?.(e >>> 0),
		lodInspect: (e, n) => {
			if (!t.renderer_lodInspect || !L) return null;
			if (!t.renderer_lodInspect(e >>> 0, n >>> 0, L)) return null;
			const r = t.HEAPF32.subarray(L >> 2, (L >> 2) + 4);
			return {
				level: r[0] < 0 ? null : r[0],
				unbiased: r[1] < 0 ? null : r[1],
				levels: r[2],
				screenSize: r[3]
			};
		},
		setLodPreview: (e, n, r) => t.renderer_setLodPreview?.(e >>> 0, n >>> 0, r ?? -1),
		setViewShading: (e, n) => t.renderer_setViewShading?.(e >>> 0, n),
		setMeshEdgeBuffers: (e) => t.renderer_setMeshEdgeBuffers?.(e),
		setViewSkinWeights: (e, n, r) => t.renderer_setViewSkinWeights?.(e >>> 0, n >>> 0, r),
		shadowStatus: (e) => {
			if (!t.renderer_shadowStatus || !R) return null;
			if (!t.renderer_shadowStatus(e >>> 0, R)) return null;
			const n = t.HEAPF32.subarray(R >> 2, (R >> 2) + 5);
			return {
				requested: n[0],
				granted: n[1],
				refusal: Vt[n[2]] ?? "none",
				deniedCasters: n[3],
				reducedCasters: n[4]
			};
		},
		lightStatus: (e) => {
			if (!t.renderer_lightStatus || !R) return null;
			if (!t.renderer_lightStatus(e >>> 0, R)) return null;
			const n = t.HEAPF32.subarray(R >> 2, (R >> 2) + 9);
			return {
				accepted: n[0] === 1,
				refusal: Bt[n[1]] ?? "none",
				limit: n[2],
				requested: n[3],
				refusedCount: n[4],
				environmentSunAim: n[5] === 1 ? [
					n[6],
					n[7],
					n[8]
				] : null
			};
		},
		getStats: () => ({
			drawCalls: t.renderer_getDrawCalls(),
			gpuDraws: t.renderer_getGpuDrawCalls?.() ?? 0,
			triangles: t.renderer_getTriangles(),
			sprites: t.renderer_getSprites(),
			text: t.renderer_getText(),
			skeletal: t.renderer_getSkeletal?.() ?? 0,
			meshes: t.renderer_getMeshes(),
			culled: t.renderer_getCulled()
		})
	};
}
/** GPU device status, mirroring the engine's `GfxDeviceStatus`. */
const V = {
	Live: 0,
	Lost: 1,
	Recovering: 2,
	Dead: 3
};
/** Why a device was lost, mirroring the engine's `GfxDeviceLostReason`. */
const qt = {
	Unknown: 0,
	ContextLost: 1,
	OutOfMemory: 2,
	Reset: 3,
	Removed: 4,
	Destroyed: 5,
	Validation: 6,
	Internal: 7
};
/**
* Whether the GPU device can still be drawn to.
*
* Reports `Live` when the core cannot answer — an older wasm build, or a native
* backend with no heap to marshal. Treating "cannot tell" as a loss would black
* out every host predating this call.
*/
function Jt() {
	return F?.deviceStatus?.() ?? V.Live;
}
/** The engine's one-line loss report (backend, GPU, driver, reason); empty while live. */
function Yt() {
	return F?.deviceLostReport?.() ?? "";
}
/**
* The GPU this session is running on, readable WHILE it works.
*
* The engine captured this at init all along — a lost backend cannot be asked
* who it was — but it could only be read off a loss report, so a healthy session
* could not say which GPU it had. Null before a device exists.
*/
function Xt(e = F) {
	const t = e?.deviceIdentity?.() ?? "";
	if (!t) return null;
	const [n = "", r = "", i = "", a = ""] = t.split("|");
	return {
		backend: n,
		vendor: r,
		renderer: i,
		version: a
	};
}
/**
* Tell the engine about a loss the host observed.
*
* The browser reports context loss to JS, not to wasm, so without this the core
* keeps submitting until its own next poll notices.
*/
function Zt(e, t) {
	F?.notifyDeviceLost?.(e, t);
}
/**
* What the loss guard actually did — where it attached, and how many events it
* has seen. An observation point, because every inference about this has been
* wrong and only direct measurement has held.
*/
function Qt() {
	return {
		target: un,
		lostEventsSeen: dn
	};
}
/**
* Ask the engine to rebuild the device and every object it issued, behind the
* same handles.
*
* False means "not yet": a browser hands a WebGL context back when it is ready.
* The device then draws while Recovering and turns Live once nothing is owed.
*/
function $t() {
	return F?.recoverDevice?.() ?? false;
}
/**
* Which generation of the GPU device is current; every rebuild advances it.
* 0 where the core cannot answer.
*/
function en() {
	return F?.renderer_deviceGeneration?.() ?? 0;
}
const tn = /* @__PURE__ */ new Set();
let nn = -1;
/**
* Called after the device has been rebuilt AND refilled — everything the GPU held
* is new storage, so content the game drew itself (a render texture) is blank
* until it is drawn again. Returns the unsubscribe.
*/
function rn(e) {
	tn.add(e);
	return () => {
		tn.delete(e);
	};
}
/**
* @internal The one watcher, ticked once a frame by the core plugin. Reads the
* GENERATION, not the status: a loss that is recovered from between two frames
* leaves the status back at Live with nothing to notice.
*/
function an() {
	const e = en();
	if (nn < 0) {
		nn = e;
		return;
	}
	if (e === nn || Jt() !== V.Live) return;
	nn = e;
	for (const t of [...tn]) try {
		t(e);
	} catch (e) {
		c.error("render", "a deviceRestored listener threw", e);
	}
}
/** @internal Test seam: forget the device the watcher has seen. */
function on() {
	tn.clear();
	nn = -1;
}
/**
* Subscribe to the host's `GPUDevice.lost`.
*
* WebGPU reports loss to whoever holds the JS device object, never to the
* engine — the page acquires it before the module exists. Reading it back off
* the module lets ONE subscription cover every host, instead of each wiring its own.
*/
function sn(e) {
	cn(e, e.preinitializedWebGPUDevice);
}
/**
* Reports the loss, then acquires the replacement only the page can make.
*
* The engine cannot create a GPUDevice, so a lost one is fatal until something
* hands over another — and left to each host, the second device's feature
* negotiation stops matching the first's. Re-armed on the replacement.
*/
function cn(e, t) {
	e.currentWebGPUDevice = t;
	t?.lost?.then(async (t) => {
		Zt(t?.reason === "destroyed" ? qt.Destroyed : qt.Unknown, t?.message ?? "The GPUDevice reported itself lost");
		if (!F) return;
		const { device: n } = await zt("webgpu");
		if (!n || !F) return;
		e.pendingWebGPUDevice = n;
		e.provideReplacementDevice?.();
		cn(e, n);
	});
}
let ln = false;
let un = "none";
let dn = 0;
/**
* Subscribe to context loss unconditionally, at renderer init.
*
* The subscription is what calls preventDefault, and without that the browser
* abandons the context for good. That decision belongs to the renderer, not to
* whether a diagnostics plugin happens to be installed.
*/
function fn(e) {
	if (ln) return;
	ln = true;
	const t = (e) => {
		dn++;
		e?.preventDefault();
		Zt(qt.ContextLost, "The host reported the rendering context was lost");
	};
	const n = Se(e.GL)?.canvas;
	if (n?.addEventListener) {
		un = "canvas";
		n.addEventListener("webglcontextlost", t);
		return;
	}
	un = "window";
	l(() => t());
}
/** @internal Wired by the engine plugins — not part of the public API. */
let pn = null;
function mn(e) {
	pn?.();
	pn = ne((t) => {
		e.renderer_setWorldUnitsPerMeter?.(t);
	});
	Gt.connect(e);
	F = Gt.module;
	fn(F);
	I = F._malloc(64);
	L = F._malloc(16);
	R = F._malloc(36);
	z = Kt(F);
}
/** @internal Install a non-wasm backend (the native host's). Mirrors
*  {@link initRendererAPI} for a core that has no heap to marshal through. */
function hn(e) {
	z = e;
}
function gn() {
	if (F && I) {
		F._free(I);
		I = 0;
	}
	if (F && L) {
		F._free(L);
		L = 0;
	}
	if (F && R) {
		F._free(R);
		R = 0;
	}
	Gt.disconnect();
	F = null;
	z = null;
}
const _n = {
	init(e, t) {
		z?.init(e, t);
	},
	resize(e, t) {
		z?.resize(e, t);
	},
	beginFrame(e = 0) {
		z?.beginFrame(e);
	},
	setOrigin(e, t, n) {
		z?.setOrigin?.(e, t, n);
	},
	updateTransforms(e) {
		z?.updateTransforms(e._cpp);
	},
	/**
	* Begins the pass. The clear rides begin as a load-op: `clearFlags` bit 0 =
	* color, bit 1 = depth; `clearColor` is the color value; `clearRect` scopes the
	* clear to a viewport region (omitted = the whole target). No flags = load.
	*/
	begin(e, t, n = 0, r, i) {
		z?.begin(e, t ?? 0, n, r?.x ?? 0, r?.y ?? 0, r?.z ?? 0, r?.w ?? 1, i?.x ?? 0, i?.y ?? 0, i?.w ?? 0, i?.h ?? 0);
	},
	flush() {
		z?.flush();
	},
	end() {
		z?.end();
	},
	/** Closes the frame — after every camera, after the screen post stack, and
	*  after the overlay. See RendererBackend.endFrame. */
	endFrame() {
		z?.endFrame();
	},
	/** Whether the core can draw the frame's screen overlay. */
	hasScreenOverlay() {
		return z?.hasScreenOverlay() ?? false;
	},
	beginScreenOverlay(e, t, n, r, i) {
		z?.beginScreenOverlay(e, t, n, r, i);
	},
	submitScreenOverlay(e) {
		z?.submitScreenOverlay(e._cpp);
	},
	endScreenOverlay(e = 0) {
		z?.endScreenOverlay(e);
	},
	submitAll(e, t, n, r, i) {
		z?.submitAll(e._cpp, t, n, r, i);
	},
	setStage(e) {
		z?.setStage(e);
	},
	createRenderTarget(e, t, n = 1) {
		return B()?.renderer_createTarget?.(e, t, n) ?? 0;
	},
	releaseRenderTarget(e) {
		B()?.renderer_releaseTarget?.(e);
	},
	getTargetTexture(e) {
		return B()?.renderer_getTargetTexture?.(e) ?? 0;
	},
	getTargetDepthTexture(e) {
		return B()?.renderer_getTargetDepthTexture?.(e) ?? 0;
	},
	setClearColor(e, t, n, r) {
		B()?.renderer_setClearColor?.(e, t, n, r);
	},
	setViewport(e, t, n, r) {
		z?.setViewport(e, t, n, r);
	},
	/** Layers (bits 0..31) that sort by world Y within the layer — top-down occlusion. */
	setYSortLayers(e) {
		z?.setYSortLayers(e);
	},
	/**
	* Layers (bits 0..31) that resolve their contents by the depth buffer instead
	* of paint order — the 2.5D opt-in. Opaque draws (blend mode None) in such a
	* layer write depth and occlude whatever is behind them whatever order they
	* were drawn in; blended ones test without writing and stay back-to-front. A
	* layer that also y-sorts keeps y-sorting (see `layerOrderOf`).
	*
	* The live twin of the `depthLayers` app option, so an editor can apply the
	* project setting to a running view without rebooting the realm.
	*/
	setDepthLayers(e) {
		z?.setDepthLayers(e);
	},
	/**
	* Layers (bits 0..31) whose draws are painted in hierarchy order: a sprite, a label and a shape stack as their entities do in the tree
	* (a preorder walk), instead of by shader and depth. The order a scene of nodes has in an authoring tool, and the one in which a panel
	* covers the text of the panel under it.
	*/
	setTreeSortLayers(e) {
		z?.setTreeSortLayers(e);
	},
	/**
	* Sorting layers (bits 0..31) the NEXT collect draws — `Camera.cullingMask`.
	* Set per camera before submitting it; a layer with no bit (outside 0..31) is
	* drawn by every camera.
	*/
	setCullingMask(e) {
		z?.setCullingMask(e);
	},
	/**
	* Names the view the NEXT collect looks from — the camera entity, so a level
	* chosen by how big something looks is remembered per camera. Set per camera
	* before submitting it; 0 is the shared default view.
	*/
	setViewId(e) {
		z?.setViewId(e);
	},
	/**
	* What @p view decided about `entity`'s LOD last time it drew it, or null when
	* that view has not measured it — off screen, or carrying no LODGroup, which
	* is not the same as measuring it at level 0. @experimental
	*/
	lodInspect(e, t) {
		return z?.lodInspect(e, t) ?? null;
	},
	/**
	* Show `level` for `entity` in `view` instead of the level that view chose;
	* `null` goes back to choosing. @experimental
	*
	* View state, never component state: a group is authored policy and reads the
	* same everywhere. The choice goes on being made underneath, so leaving a
	* preview obeys the selector again rather than resuming from what was held up.
	*/
	setLodPreview(e, t, n) {
		z?.setLodPreview(e, t, n);
	},
	/**
	* Shade `view`'s meshes as `mode` says instead of as authored. @experimental
	*
	* View state, like a LOD preview. Clay is one neutral lit surface, albedo the base
	* colour with no light, wireframe a dark surface with its edges; a shadow map is
	* unaffected and a host that predates the mode ignores the call.
	*/
	setViewShading(e, t) {
		z?.setViewShading(e, Ut[t]);
	},
	/**
	* Give meshes loaded from now on an edge buffer, which a wireframe view draws. @experimental
	*
	* A second index buffer per mesh, so off unless an editor asks, and asked before the
	* assets load: a mesh realized earlier has none and is drawn as a plain surface.
	*/
	setMeshEdgeBuffers(e) {
		z?.setMeshEdgeBuffers(e);
	},
	/**
	* Colour one skinned entity in `view` by how much a joint moves each of its vertices;
	* `null` stops. @experimental
	*
	* `joint` is an index into the mesh's own bind matrices, the order its joint channel
	* uses. View state like the shading beside it: the same entity drawn through another
	* view keeps its look.
	*/
	setViewSkinWeights(e, t, n = 0) {
		z?.setViewSkinWeights(e, t ?? 0, t === null ? -1 : n);
	},
	/**
	* What the light cap did to `entity` last frame, or null before any frame has
	* collected lights. @experimental
	*
	* Read back rather than derived: a reader working out which lights were
	* dropped by taking the tail of a list would be a second cap, agreeing with
	* the frame only until either sorted differently.
	*/
	lightStatus(e) {
		return z?.lightStatus(e) ?? null;
	},
	/**
	* What the shadow atlas gave `entity` last frame, or null when it asked the
	* atlas for nothing. @experimental
	*/
	shadowStatus(e) {
		return z?.shadowStatus(e) ?? null;
	},
	setTextureParams(e, t, n, r, i) {
		B()?.renderer_setTextureParams?.(e, t, n, r, i);
	},
	measureBitmapText(e, t, n, r) {
		if (!F) return {
			width: 0,
			height: 0
		};
		return E().measureBitmapText(e, t, n, r);
	},
	getStats() {
		return z?.getStats() ?? Wt;
	},
	captureNextFrame() {
		F?.renderer_captureNextFrame();
	},
	getCapturedData() {
		if (!F) return null;
		return kt(F);
	},
	hasCapturedData() {
		return F?.renderer_hasCapturedData() ?? false;
	},
	replayToDrawCall(e) {
		if (!F) return;
		At(F, e);
	},
	/** Resolves with the replay snapshot once its async readback lands (see frameCapture). */
	getSnapshotImageData() {
		if (!F) return Promise.resolve(null);
		return Mt(F);
	},
	snapshotMatchesCapture() {
		return F ? jt(F) : false;
	}
};
//#endregion
//#region src/asset/packedBackend.ts
/**
* `inner`, reading packed assets out of their packs. A pack's bytes are held
* until every asset in it has been read once, then let go: a later read (a
* device-loss rebuild) fetches the pack again.
*/
function vn(e, t) {
	const n = /* @__PURE__ */ new Map();
	const r = /* @__PURE__ */ new Map();
	let i = null;
	let a = null;
	const o = (n) => {
		const o = t();
		if (!o) return null;
		if (a !== o) {
			a = o;
			i = /* @__PURE__ */ new Map();
			r.clear();
			for (const [t, n] of o.packMembers()) {
				r.set(t, new Set(n));
				for (const t of n) i.set(e.resolveUrl(t), t);
			}
		}
		const s = o.packOf(n);
		if (s) return {
			path: n,
			pack: s
		};
		const c = i.get(n);
		const l = c ? o.packOf(c) : null;
		return c && l ? {
			path: c,
			pack: l
		} : null;
	};
	const s = async (i) => {
		const a = o(i);
		if (!a) return null;
		const { path: s, pack: c } = a;
		let l = n.get(c.file);
		if (!l) {
			l = e.fetchBinary(c.file);
			n.set(c.file, l);
			l.catch(() => n.delete(c.file));
		}
		const u = await l;
		if (c.offset + c.size > u.byteLength) throw new Error(`${s}: ${c.file} holds ${u.byteLength} bytes, the manifest puts it at ${c.offset}+${c.size}`);
		const d = r.get(c.file);
		d?.delete(s);
		if (d && d.size === 0) {
			n.delete(c.file);
			r.set(c.file, new Set(t()?.packMembers().get(c.file) ?? []));
		}
		return u.slice(c.offset, c.offset + c.size);
	};
	return {
		async fetchBinary(t) {
			return await s(t) ?? e.fetchBinary(t);
		},
		async fetchText(t) {
			const n = await s(t);
			return n ? new TextDecoder().decode(n) : e.fetchText(t);
		},
		resolveUrl: (t) => e.resolveUrl(t),
		...e.setBaseUrl ? { setBaseUrl: (t) => {
			e.setBaseUrl(t);
			a = null;
		} } : {}
	};
}
//#endregion
//#region src/asset/Catalog.ts
/**
* Derive a CatalogEntry's atlas fields from a cook-manifest atlas record.
* Frame pixels are image-space (y from the page TOP); uv is emitted for
* flipY-uploaded textures (v origin = image bottom), matching the
* Sprite/UIVisual `uvOffset`/`uvScale` convention. `pagePath` is the page's
* fetch identity — the same string every frame of the page shares, so texture
* loading can collapse them onto one GPU texture.
*/
function yn(e, t) {
	const { frame: n, pageWidth: r, pageHeight: i } = e;
	return {
		atlas: t,
		frame: {
			x: n.x,
			y: n.y,
			w: n.width,
			h: n.height
		},
		uv: {
			offset: [n.x / r, 1 - (n.y + n.height) / i],
			scale: [n.width / r, n.height / i]
		}
	};
}
var bn = class e {
	constructor(e, t, n) {
		this.addressByBuildPath_ = null;
		this.entries_ = e;
		this.addresses_ = t;
		this.labels_ = n;
	}
	static fromJson(t) {
		const n = new Map(Object.entries(t.entries));
		const r = new Map(Object.entries(t.addresses ?? {}));
		const i = new Map(Object.entries(t.labels ?? {}));
		return new e(n, r, i);
	}
	static empty() {
		return new e(/* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map());
	}
	resolve(e) {
		const t = this.addresses_.get(e);
		if (t) return t;
		if (this.entries_.has(e)) return e;
		return e;
	}
	getEntry(e) {
		return this.entries_.get(e) ?? null;
	}
	getAtlasFrame(e) {
		const t = Te(e);
		const n = this.entries_.get(t ? `${Ee}${t}` : e);
		if (!n?.atlas || !n.frame || !n.uv) return null;
		return {
			atlas: n.atlas,
			frame: n.frame,
			uvOffset: n.uv.offset,
			uvScale: n.uv.scale,
			trim: n.trim
		};
	}
	/**
	* The authored logical address a staged path came from, or null. A document
	* that names a SIBLING — a spine atlas page, a font page — resolves it against
	* where the document was AUTHORED, and content-addressed staging renames every
	* asset to a hash under one flat directory, which loses that.
	*/
	addressOf(e) {
		if (!this.addressByBuildPath_) {
			const e = /* @__PURE__ */ new Map();
			for (const [t, n] of this.entries_) {
				if (t.startsWith("@uuid:") || t.startsWith("/")) continue;
				const r = n.buildPath;
				if (r && r !== t && !e.has(r)) e.set(r, t);
			}
			this.addressByBuildPath_ = e;
		}
		return this.addressByBuildPath_.get(e) ?? null;
	}
	/** The small copy of a texture streaming fetches first, or null when the build shipped none. */
	getStreamTail(e) {
		return this.entries_.get(e)?.streamTail ?? null;
	}
	getBuildPath(e) {
		return this.entries_.get(e)?.buildPath ?? e;
	}
	getDeps(e) {
		return this.entries_.get(e)?.deps ?? [];
	}
	getByLabel(e) {
		return this.labels_.get(e) ?? [];
	}
	getAllLabels() {
		return Array.from(this.labels_.keys());
	}
	hasEntry(e) {
		return this.entries_.has(e);
	}
	hasAddress(e) {
		return this.addresses_.has(e);
	}
	get isEmpty() {
		return this.entries_.size === 0;
	}
};
//#endregion
//#region src/asset/hotUpdate.ts
function xn(e, t, n) {
	const r = {
		key: t,
		group: e,
		path: n.path,
		type: n.type,
		size: n.size ?? 0
	};
	if (n.contentHash != null) r.contentHash = n.contentHash;
	return r;
}
/**
* Compare the active manifest to `next` and produce the download plan.
*
* Matching is by group-record key (stable per asset across builds). An asset is
* "changed" when it is brand-new, or its content differs — authoritatively by
* `contentHash` when both sides carry one, else by build path. `current === null`
* (no manifest yet, e.g. first launch off a persisted-manifest miss) treats every
* asset as new — a full fetch.
*/
function Sn(e, t) {
	const n = [];
	const r = /* @__PURE__ */ new Set();
	let i = 0;
	for (const { group: a, key: o, asset: s } of t.entries()) {
		const t = e?.assetByKey(o) ?? null;
		if (!t || (s.contentHash != null && t.contentHash != null ? s.contentHash !== t.contentHash : s.path !== t.path)) {
			n.push(xn(a, o, s));
			r.add(a);
			i += s.size ?? 0;
		}
	}
	const a = [];
	if (e) {
		const n = new Set(t.entries().map((e) => e.key));
		for (const { group: t, key: r, asset: i } of e.entries()) if (!n.has(r)) a.push(xn(t, r, i));
	}
	const o = e?.revision() ?? null;
	const s = t.revision() ?? null;
	return {
		hasUpdate: n.length > 0 || o != null && s != null && o !== s,
		fromRevision: o,
		toRevision: s,
		changedGroups: [...r],
		changedAssets: n,
		removedAssets: a,
		totalBytes: i
	};
}
//#endregion
//#region src/asset/dependencies.ts
/**
* Whether a change to what this edge names can invalidate the era that recorded
* it. A read is causality by definition; an acquisition only when it names an
* addressable asset, since a composed resource has no content anyone can change
* and its `composed:<handle>` identity is a debug name, not a lookup key.
*/
function Cn(e) {
	if (e.kind === "source") return true;
	return e.type !== void 0;
}
/**
* What to rebuild after `changed` changed, deepest dependency first, each cycle
* one group. The root is a PATH (a change names a file, which need not be an
* asset); every vertex after it keeps its TYPE, since flattening two assets that
* share a path invents a cycle between them. Tarjan emits last-reached first.
*/
function wn(e, t) {
	const n = /* @__PURE__ */ new Map();
	const r = /* @__PURE__ */ new Map();
	const i = /* @__PURE__ */ new Set();
	const a = [];
	const o = [];
	let s = 0;
	const c = (e) => `${e.type}\0${e.path}`;
	const l = (e) => {
		const u = c(e);
		n.set(u, s);
		r.set(u, s);
		s++;
		a.push(e);
		i.add(u);
		for (const a of t.ofAsset(e)) {
			const e = c(a);
			if (!n.has(e)) {
				l(a);
				r.set(u, Math.min(r.get(u), r.get(e)));
			} else if (i.has(e)) r.set(u, Math.min(r.get(u), n.get(e)));
		}
		if (r.get(u) !== n.get(u)) return;
		const d = [];
		for (;;) {
			const e = a.pop();
			i.delete(c(e));
			d.push(e);
			if (c(e) === u) break;
		}
		o.push(d);
	};
	for (const r of t.ofSource(e)) if (!n.has(c(r))) l(r);
	return o.reverse();
}
/** Internal rejection transport. Its sources belong to this preparation, not
* to an Error object that several concurrent loaders may reuse. Public doors
* rethrow the original reason, including primitive rejection values. */
var Tn = class extends Error {
	constructor(e, t) {
		super(e instanceof Error ? e.message : String(e));
		this.reason = e;
		this.sources = t;
	}
	toString() {
		return String(this.reason);
	}
};
function H(e) {
	return e instanceof Tn ? e.reason : e;
}
/**
* The recorder behind one preparation: everything it acquires lands here, so
* neither the era's ownership nor the graph's edges depend on a loader
* remembering to report anything.
*
* It is also the preparation's TRANSACTION. An acquisition made on the way to a
* value that never arrives has no owner — the era that would have held it does
* not exist, and no caller was ever handed a receipt for it — so a preparation
* either commits what it took onto what it produced, or gives all of it back.
*/
var En = class {
	constructor() {
		this.edges_ = [];
		this.acquired_ = new Me();
		this.failed_ = /* @__PURE__ */ new Set();
		this.state_ = "open";
	}
	/** A runtime resource this preparation now holds. */
	own(e, t, n) {
		if (this.state_ !== "open") return this.late_(t);
		this.acquired_.add(t);
		this.edges_.push(n === void 0 ? {
			kind: "owned",
			path: e
		} : {
			kind: "owned",
			type: n,
			path: e
		});
		for (const e of t.failedDependencies ?? []) this.failed_.add(e);
		return t;
	}
	/** Content this preparation read to decide what to produce. */
	read(e) {
		if (this.state_ !== "open") return;
		this.edges_.push({
			kind: "source",
			path: e
		});
	}
	failed(e, t) {
		if (this.state_ !== "open") return;
		this.read(e);
		this.failed_.add(e);
		if (t instanceof Tn) for (const e of t.sources) this.read(e);
	}
	/**
	* The preparation produced `value`: what it took is what that value owns.
	*
	* Sealing here rather than at the call site is what makes the two
	* inseparable — there is no shape of the result that carries edges without
	* the receipts behind them.
	*/
	commit(e) {
		this.state_ = "committed";
		return {
			...e,
			dependencies: this.acquired_,
			edges: this.edges_,
			failedDependencies: [...this.failed_]
		};
	}
	/** The preparation produced nothing, so it may keep nothing. */
	rollback() {
		this.state_ = "rolled-back";
		try {
			this.acquired_.releaseAll();
		} finally {
			this.edges_.length = 0;
		}
	}
	/** Roll back ownership while transporting the reads that caused failure. */
	abort(e) {
		const t = new Set(this.edges_.filter(Cn).map((e) => e.path));
		const n = H(e);
		if (e instanceof Tn) for (const n of e.sources) t.add(n);
		try {
			this.rollback();
		} catch (e) {
			c.warn("asset", "Preparation rollback cleanup failed", e);
		}
		return new Tn(n, [...t]);
	}
	/**
	* An acquisition that landed after the transaction settled: the losing half
	* of a preparation whose other half threw, or a loader that kept the context
	* past its own work. Nobody can own it either way, so it goes back here —
	* the last place that still knows it exists.
	*/
	late_(e) {
		if (this.state_ === "committed") c.warn("asset", `an acquisition of "${e.key}" landed after its preparation was published`);
		e.release();
		return e;
	}
};
//#endregion
//#region src/asset/AsyncCache.ts
var Dn = class {
	/**
	* @param dispose_ Optional releaser for a value whose load finishes AFTER
	*   its getOrLoad already timed out — the caller got the timeout rejection,
	*   so that late value has no owner and would otherwise leak (e.g. a GL
	*   texture created past the deadline). NOT called for
	*   invalidate()/clearAll(), whose in-flight results still reach the caller.
	*/
	constructor(e) {
		this.dispose_ = e;
		this.cache_ = /* @__PURE__ */ new Map();
		this.pending_ = /* @__PURE__ */ new Map();
		this.failed_ = /* @__PURE__ */ new Map();
	}
	/** Current cooldown rejections; expired records retain no failure metadata. */
	/** @internal Failed preparation provenance for source invalidation. */
	*failures() {
		const e = Date.now();
		for (const [t, n] of this.failed_) {
			if (n.expiry <= e) {
				this.failed_.delete(t);
				continue;
			}
			yield [t, n.error];
		}
	}
	async getOrLoad(e, t, n = Ue.assetLoadTimeout) {
		const r = this.cache_.get(e);
		if (r !== void 0) return r;
		const i = this.failed_.get(e);
		if (i && Date.now() < i.expiry) throw i.error;
		this.failed_.delete(e);
		const a = this.pending_.get(e);
		if (a && !a.aborted) return a.promise;
		const o = {
			promise: null,
			aborted: false
		};
		o.promise = (async () => {
			const r = t();
			if (n <= 0) {
				const t = await r;
				if (!o.aborted) this.cache_.set(e, t);
				this.clearPendingIfCurrent_(e, o);
				return t;
			}
			let i = false;
			let a;
			r.then((t) => {
				if (i) this.disposeAbandoned_(e, t);
			}, () => {});
			let s;
			try {
				s = await Promise.race([r, new Promise((t, r) => {
					a = setTimeout(() => {
						i = true;
						o.aborted = true;
						r(/* @__PURE__ */ new Error(`AsyncCache timeout: ${e} (${n}ms)`));
					}, n);
				})]);
			} finally {
				clearTimeout(a);
			}
			if (!o.aborted) this.cache_.set(e, s);
			this.clearPendingIfCurrent_(e, o);
			return s;
		})();
		this.pending_.set(e, o);
		try {
			return await o.promise;
		} catch (t) {
			if (this.pending_.get(e) === o) {
				this.pending_.delete(e);
				if (t instanceof Error && H(t) instanceof Error) this.failed_.set(e, {
					error: t,
					expiry: Date.now() + Ue.assetFailureCooldown
				});
			}
			if (t instanceof Error && t.message.startsWith("AsyncCache timeout:")) c.warn("asset", t.message);
			throw t;
		}
	}
	/**
	* Drop this key's pending record only if it is still THIS request's. A load
	* that finishes after invalidate() replaced it would otherwise delete its
	* successor's record, and the next getOrLoad would start a third load of the
	* same asset instead of joining the second.
	*/
	clearPendingIfCurrent_(e, t) {
		if (this.pending_.get(e) === t) this.pending_.delete(e);
	}
	/** Release a value that was abandoned by a timeout; never throws upward. */
	disposeAbandoned_(e, t) {
		if (!this.dispose_) return;
		try {
			this.dispose_(t);
		} catch (t) {
			c.warn("asset", `AsyncCache: releasing abandoned "${e}" threw`, t);
		}
	}
	get(e) {
		return this.cache_.get(e);
	}
	has(e) {
		return this.cache_.has(e);
	}
	delete(e) {
		return this.cache_.delete(e);
	}
	/**
	* Drop every record of `key` — resolved value, failure cooldown, and
	* any in-flight loader. Used by hot-reload when the underlying bytes
	* changed on disk and the next `getOrLoad` must fetch fresh.
	*
	* Returns true if any record was removed. Doesn't release whatever
	* resource the cached value points to — that's the caller's concern
	* (see `Assets.invalidate` for the resource-aware variant).
	*/
	invalidate(e) {
		const t = this.cache_.delete(e);
		const n = this.failed_.delete(e);
		const r = this.pending_.get(e);
		if (r) {
			r.aborted = true;
			this.pending_.delete(e);
		}
		return t || n || r !== void 0;
	}
	clear() {
		this.cache_.clear();
	}
	clearAll() {
		this.cache_.clear();
		this.failed_.clear();
		for (const e of this.pending_.values()) e.aborted = true;
		this.pending_.clear();
	}
	/** Re-file a value under `key`, for a sweep that removed it to force a reload. */
	set(e, t) {
		this.cache_.set(e, t);
	}
	/**
	* Key/value pairs of what is resolved. `values()` is not enough for a sweep
	* that has to RELOAD each entry: the key is what names the asset.
	*/
	entries() {
		return this.cache_.entries();
	}
	values() {
		return this.cache_.values();
	}
	/**
	* @internal Entry counts for the resource census.
	*
	* `pending` is the one to watch: it should be empty at rest, so a non-zero
	* value between cycles means a load never settled — and a load that never
	* settles holds its callbacks, its buffers and whatever closed over them.
	*/
	sizes() {
		return {
			cached: this.cache_.size,
			pending: this.pending_.size,
			failed: this.failed_.size
		};
	}
};
//#endregion
//#region src/asset/textureFormatReport.ts
/**
* The per-realm ledger. One record per residency key: a texture revived from the
* pool under the same key made the same decision, and a second row would count
* one texture's memory twice.
*/
var On = class {
	constructor() {
		this.rows_ = /* @__PURE__ */ new Map();
	}
	record(e, t) {
		this.rows_.set(e, {
			path: e,
			...t
		});
	}
	report(e, t) {
		const n = [...this.rows_.values()];
		let r = 0;
		let i = 0;
		for (const e of n) {
			if (e.payload !== "ktx2") continue;
			if (e.reason === "compressed") r++;
			else i++;
		}
		return {
			deviceFormats: e,
			deviceProbed: t,
			textures: n,
			compressed: r,
			decoded: i
		};
	}
	clear() {
		this.rows_.clear();
	}
};
/**
* The record for one asset path, whichever flip orientation it loaded under.
*
* Rows are keyed by residency key (path + flip), so a caller holding a plain
* asset path cannot look one up — and a caller that reconstructed the key would
* own a copy of a shape that is not its to know.
*/
function kn(e, t) {
	return e?.textures.find((e) => e.path.startsWith(`${t}:`)) ?? null;
}
//#endregion
//#region src/asset/loaders/TextureLoader.ts
/** The longest edge a texture waiting for its compressed form is drawn at. */
const An = 1024;
let jn = Date.now();
/** An asset's settings for the engine's pixel upload: mipmapped unless it says not, as the WebGL upload is. */
function Mn(e) {
	return {
		filterMode: e?.filter,
		wrapMode: e?.wrap,
		srgb: e?.srgb,
		mipmaps: e?.mipmaps ?? true
	};
}
/**
* Canonical residency key for a texture: the resolved load path plus the
* flip-orientation flag (flipped and raw uploads are genuinely different GPU
* objects). One string serves as both the SDK's AsyncCache key and the C++
* ResourcePool path identity, so a texture whose last reference was released
* can be revived by `acquireTextureByPath` under the exact same key the next
* `loadTexture` looks up.
*/
function Nn(e, t) {
	return `${e}:${t ? "f" : "n"}`;
}
const Pn = (e) => e.byteLength > 8 && e[0] === 137 && e[1] === 80 && e[2] === 78 && e[3] === 71;
var Fn = class {
	/** End the browser image-cache identity when an asset's bytes change. */
	invalidate(e) {
		this.imageRevisions_.set(e, ++jn);
		return false;
	}
	setTranscoder(e) {
		this.transcoder_ = e;
	}
	setTranscoderProvider(e) {
		this.transcoderProvider_ = e;
	}
	/** The transcoder, acquiring it once on demand. Concurrent KTX2 loads share
	*  the in-flight acquisition so the basis module loads exactly once. */
	async ensureTranscoder_() {
		if (this.transcoder_) return this.transcoder_;
		if (!this.transcoderProvider_) return null;
		if (!this.transcoderPending_) this.transcoderPending_ = this.transcoderProvider_();
		this.transcoder_ = await this.transcoderPending_;
		return this.transcoder_;
	}
	constructor(e) {
		this.imageRevisions_ = /* @__PURE__ */ new Map();
		this.type = "texture";
		this.extensions = [
			".png",
			".jpg",
			".jpeg",
			".webp",
			".gif",
			".bmp",
			".ktx2"
		];
		this.transcoder_ = null;
		this.transcoderProvider_ = null;
		this.transcoderPending_ = null;
		this.formats_ = new On();
		this.sources_ = /* @__PURE__ */ new Map();
		this.pendingStartEdge_ = 0;
		this.startedSmall = 0;
		this.askedSmall = 0;
		this.sourcesByKey_ = /* @__PURE__ */ new Map();
		this.lastDecision_ = ge;
		this.deviceFormats_ = null;
		this.importSettingsResolver = null;
		this.pixelDecoder_ = null;
		this.compressedSource_ = null;
		this.module_ = e;
	}
	setPendingSettings(e) {
		this.pendingSettings_ = e;
	}
	setPixelDecoder(e) {
		this.pixelDecoder_ = e;
	}
	get pixelDecoder() {
		return this.pixelDecoder_;
	}
	setCompressedSource(e) {
		this.compressedSource_ = e;
	}
	async load(e, t) {
		const n = this.pendingSettings_;
		this.pendingSettings_ = void 0;
		return this.loadWithFlip(e, t, true, n);
	}
	async loadRaw(e, t) {
		const n = this.pendingSettings_;
		this.pendingSettings_ = void 0;
		return this.loadWithFlip(e, t, false, n);
	}
	async loadFromPixels(e, t, n, r, i) {
		const a = E();
		const o = oe(true) ? 2 : 1;
		if (a.createTextureFromBytes) return {
			handle: a.createTextureFromBytes(e, t, n, o, r, i),
			width: e,
			height: t
		};
		if (!this.module_) throw new Error("TextureLoader.loadFromPixels: no wasm module and no native byte-upload path");
		const s = this.module_;
		return {
			handle: T(s, n.length, (c) => {
				s.HEAPU8.set(n, c);
				return a.createTexture(e, t, c, n.length, o, r, i);
			}),
			width: e,
			height: t
		};
	}
	unload(e) {
		this.sources_.delete(e.handle);
		E().releaseTexture(e.handle);
	}
	/**
	* Loads the bytes onto the GPU WITHOUT claiming the path — what a re-upload
	* after a device loss wants, since the identity belongs to the handle being
	* recovered. Claiming it leaves the pool holding two records, and the loser
	* is swept up by the next loss with nobody able to re-upload it.
	*/
	async loadDetached(e, t, n, r) {
		return this.decodeAndUpload_(e, t, n, r);
	}
	/**
	* Decode the texture behind @p handle again, no larger than @p maxEdge texels on a side (0 is its full size), and move the new
	* pixels behind the handle: everything that holds the handle — a material, a renderer, a batch key — sees the new size at once.
	* The texture streamer's one move. False for a handle this loader did not decode from a file, or one the host cannot re-point.
	*/
	async resize(e, t, n) {
		const r = this.sources_.get(e);
		const i = E();
		if (!r || !i.adoptTextureContent) return null;
		const a = await this.decodeAndUpload_(r.path, n, r.flip, r.settings, t);
		const o = i.adoptTextureContent(e, a.handle);
		i.releaseTexture(a.handle);
		return o ? {
			width: a.width,
			height: a.height
		} : null;
	}
	/** Whether @p handle was decoded from a file by this loader, so it can be decoded again at another size. */
	resizable(e) {
		return this.sources_.has(e);
	}
	/** The size of the file behind @p handle, whatever size it is held at; null for one this loader did not decode from a file. */
	fullSize(e) {
		const t = this.sources_.get(e);
		return t ? {
			width: t.fullWidth,
			height: t.fullHeight
		} : null;
	}
	/** Decode the next load no larger than @p edge on a side (texture streaming's start), where the file's own size can still be known. */
	setPendingStartEdge(e) {
		this.pendingStartEdge_ = Math.max(0, e);
	}
	/** A texture the warm cache gave back under @p key is the one this loader decoded under it: resizable again. */
	adoptRevived(e, t) {
		const n = this.sourcesByKey_.get(t);
		if (n) this.sources_.set(e, n);
	}
	async loadWithFlip(e, t, n, r) {
		const i = this.pendingStartEdge_;
		this.pendingStartEdge_ = 0;
		if (i > 0) this.askedSmall++;
		const a = await this.decodeAndUpload_(e, t, n, r, i);
		const o = {
			path: e,
			flip: n,
			settings: r,
			fullWidth: a.fullWidth ?? a.width,
			fullHeight: a.fullHeight ?? a.height
		};
		this.sources_.set(a.handle, o);
		if (a.fullWidth !== void 0) this.startedSmall++;
		this.sourcesByKey_.set(Nn(e, n), o);
		this.formats_.record(Nn(e, n), this.lastDecision_);
		E().registerTextureWithPath?.(a.handle, Nn(e, n));
		return a;
	}
	async decodeAndUpload_(e, t, n, r, i = 0) {
		const a = i > 0 ? t.catalog.getStreamTail?.(e) ?? null : null;
		if (a && i <= Math.max(a.width, a.height)) return {
			...await this.decodeFile_(e, a.path, t, n, r, i, true),
			fullWidth: a.fullWidth,
			fullHeight: a.fullHeight
		};
		return this.decodeFile_(e, t.catalog?.getBuildPath(e) ?? e, t, n, r, i, false);
	}
	/** Decode @p path (whose bytes are at @p buildPath; @p copy when that is its small copy) no larger than @p maxEdge, and upload it. */
	async decodeFile_(e, t, n, r, i, a, o) {
		this.lastDecision_ = ge;
		if (Qe(t)) {
			const a = await Xe(e, (r) => n.backend.fetchBinary(r === e ? t : n.catalog?.getBuildPath(r) ?? r));
			return {
				handle: ve(this.module_, a, O.Asset, r, Mn(i)),
				width: a.width,
				height: a.height
			};
		}
		if (he(t)) {
			const r = await n.backend.fetchBinary(t);
			return this.uploadKtx2_(e, new Uint8Array(r), i, a);
		}
		let s = false;
		if (!o && this.compressedSource_) {
			const t = await this.compressedSource_(e);
			if (t instanceof Uint8Array && Pn(t)) return this.uploadImageBytes_(t, r, i, a);
			if (t instanceof Uint8Array) return this.uploadKtx2_(e, t, i, a);
			s = t === "pending";
		}
		const c = s ? a > 0 ? Math.min(a, An) : An : a;
		if (this.pixelDecoder_) {
			const n = await this.pixelDecoder_(o ? t : e, r, c);
			const a = ve(this.module_, n, O.Asset, r, Mn(i));
			return n.sourceWidth !== void 0 && n.sourceHeight !== void 0 ? {
				handle: a,
				width: n.width,
				height: n.height,
				fullWidth: n.sourceWidth,
				fullHeight: n.sourceHeight
			} : {
				handle: a,
				width: n.width,
				height: n.height
			};
		}
		const l = n.backend.resolveUrl(t);
		const u = {
			width: 0,
			height: 0
		};
		const d = await this.loadImage(l, r, c, o ? void 0 : this.imageRevisions_.get(e), u);
		const f = this.createTextureFromImage(d, r, i);
		return u.width > f.width || u.height > f.height ? {
			...f,
			fullWidth: u.width,
			fullHeight: u.height
		} : f;
	}
	/** An encoded image in memory, through the same image path a URL takes. */
	async uploadImageBytes_(e, t, n, r = 0) {
		const i = URL.createObjectURL(new Blob([e], { type: "image/png" }));
		try {
			const e = {
				width: 0,
				height: 0
			};
			const a = await this.loadImage(i, t, r, void 0, e);
			const o = this.createTextureFromImage(a, t, n);
			return e.width > o.width || e.height > o.height ? {
				...o,
				fullWidth: e.width,
				fullHeight: e.height
			} : o;
		} finally {
			URL.revokeObjectURL(i);
		}
	}
	/**
	* Upload a KTX2 (Basis) compressed texture: transcode to a device-supported GPU
	* format (or RGBA8 fallback), and upload. KTX2 carries its own orientation, so
	* the `flip` flag does not apply.
	*/
	async uploadKtx2_(e, t, n, r = 0) {
		const i = await this.uploadKtx2Levels_(e, t, n, r);
		if (t.byteLength >= 28) {
			const e = new DataView(t.buffer, t.byteOffset, t.byteLength);
			const n = e.getUint32(20, true), r = e.getUint32(24, true);
			if (n > i.width || r > i.height) return {
				...i,
				fullWidth: n,
				fullHeight: r
			};
		}
		return i;
	}
	async uploadKtx2Levels_(e, t, n, r = 0) {
		if (!_e(t)) throw new Error(`TextureLoader: ${e} is not a KTX2 file`);
		const i = E();
		if (i.createTextureFromKTX2) {
			const r = i.createTextureFromKTX2(t, oe(n?.srgb));
			if (!r) throw new Error(`TextureLoader: KTX2 transcode failed for ${e}`);
			this.lastDecision_ = de(r.format ?? -1, r.blockRefused ?? false);
			return {
				handle: r.handle,
				width: r.width,
				height: r.height
			};
		}
		const a = await this.ensureTranscoder_();
		if (!a) throw new Error("TextureLoader: no Basis transcoder available (basis side module missing — KTX2 assets need it)");
		const o = this.getWebGL2Context();
		if (!o) return this.loadCompressedViaEngine(e, a, t, oe(n?.srgb), r);
		const s = await fe(o, this.module_, a, t, {
			...n,
			srgb: oe(n?.srgb),
			maxEdge: r
		});
		this.lastDecision_ = s.decision;
		return {
			handle: s.handle,
			width: s.width,
			height: s.height
		};
	}
	/**
	* KTX2 through the engine's own upload, for a backend with no GL context.
	* Falls back to an RGBA decode when no compressed format is available or the
	* transcode to it fails — the same bargain the GL path makes.
	*/
	async loadCompressedViaEngine(e, t, n, r, i = 0) {
		const a = E();
		const o = this.module_;
		if (o && a.supportsCompressedFormat && a.createCompressedTexture) {
			const e = a.supportsCompressedFormat.bind(a);
			const s = ye((t) => e(t), r);
			const c = s ? await t.transcode(n, s) : null;
			const l = c ? pe(c, i) : null;
			this.lastDecision_ = A(s, l !== null);
			if (s && l) {
				const e = be(s, r);
				const t = l.levels ?? [l];
				const n = t.reduce((e, t) => e + t.data.length, 0);
				const i = T(o, n, (r) => {
					let i = r;
					for (const e of t) {
						o.HEAPU8.set(e.data, i);
						i += e.data.length;
					}
					return a.createCompressedTexture(l.width, l.height, e, r, n, t.length, O.Asset);
				});
				if (i) return {
					handle: i,
					width: l.width,
					height: l.height
				};
				this.lastDecision_ = A(s, false);
			}
		} else this.lastDecision_ = A(null, false);
		const s = await t.transcodeToRgba(n);
		if (!s) throw new Error(`TextureLoader: KTX2 decode failed for ${e}`);
		const c = pe(s, i);
		return this.loadFromPixels(c.width, c.height, c.data, false, O.Asset);
	}
	/**
	* Decode `src` into a GPU-uploadable source. When `createImageBitmap` is
	* available we bake the vertical orientation into the bitmap here via
	* `imageOrientation`, NOT later via `UNPACK_FLIP_Y_WEBGL`: Chromium/ANGLE
	* silently ignore that pixel-store flag for `ImageBitmap` sources, so relying
	* on it uploads every texture upside-down. The raw `<img>` fallback keeps the
	* flag (it works for element/pixel sources) — see {@link createTextureFromImage}.
	*/
	loadImage(e, t, n = 0, r, i) {
		return new Promise((a, o) => {
			const s = ee();
			s.crossOrigin = "anonymous";
			s.onload = async () => {
				if (i) {
					i.width = s.width;
					i.height = s.height;
				}
				if (typeof createImageBitmap !== "undefined") try {
					a(await Ye(await Je(s, t), n));
					return;
				} catch {}
				a(s);
			};
			s.onerror = () => o(/* @__PURE__ */ new Error(`Failed to load image: ${e}`));
			if (r && typeof HTMLImageElement !== "undefined" && s instanceof HTMLImageElement && !e.startsWith("data:") && !e.startsWith("blob:")) {
				const t = new URL(e, document.baseURI);
				t.searchParams.set("_esTextureRevision", String(r));
				s.src = t.href;
			} else s.src = e;
		});
	}
	createTextureFromImage(e, t, n) {
		const { width: r, height: i } = e;
		const a = this.getWebGL2Context();
		const o = typeof ImageBitmap !== "undefined" && e instanceof ImageBitmap ? false : t;
		if (a) return this.createTextureWebGL2(a, e, r, i, o, n);
		return this.createTextureFallback(e, r, i, o, n);
	}
	getWebGL2Context() {
		return Se(this.module_?.GL);
	}
	/**
	* Which compressed formats this device samples, best first.
	*
	* The INPUT to every upload decision, and the half a realm answers without
	* loading one. Null when nothing could be asked — an empty list would read as
	* a capability. Cached, since `getExtension` also ENABLES.
	*/
	deviceFormats() {
		if (this.deviceFormats_) return this.deviceFormats_;
		const e = se();
		const t = this.getWebGL2Context();
		if (t) {
			const n = me(t);
			return this.deviceFormats_ = ce((t) => ue(n, t, e) !== null);
		}
		const n = E();
		if (n.supportsCompressedFormat) {
			const t = n.supportsCompressedFormat.bind(n);
			return this.deviceFormats_ = ce((n) => t(be(n, e)));
		}
		return null;
	}
	/** What the textures this loader uploaded became, and on what device. */
	formatReport() {
		const e = this.deviceFormats();
		return this.formats_.report(e ?? [], e !== null);
	}
	createTextureWebGL2(e, t, n, r, i, a) {
		return {
			handle: Ce(this.module_, e, (e) => {
				xe(e, t, i, a?.srgb);
				we(e, a);
			}, {
				width: n,
				height: r,
				content: O.Asset
			}),
			width: n,
			height: r
		};
	}
	createTextureFallback(e, t, n, r, i) {
		if (!this.module_) throw new Error("TextureLoader: 2D-canvas fallback needs a wasm module (native uses the pixel-decode path)");
		const { pixels: a } = qe(e);
		return {
			handle: ve(this.module_, {
				width: t,
				height: n,
				pixels: a
			}, O.Asset, r, Mn(i)),
			width: t,
			height: n
		};
	}
};
//#endregion
//#region src/asset/AssetRefLedger.ts
var In = class {
	constructor() {
		this.byKey_ = /* @__PURE__ */ new Map();
		this.nextId_ = 1;
	}
	/**
	* Record one more holder of `value` under `key` and hand back its receipt.
	*
	* Joins the key's current generation when it is holding the same value —
	* that is a cache hit, and both holders really do share one asset. A
	* superseded generation is never joined: its era is over.
	*/
	acquire(e, t) {
		let n = this.byKey_.get(e);
		if (!n) {
			n = [];
			this.byKey_.set(e, n);
		}
		const r = n[n.length - 1];
		let i;
		if (r && !r.superseded && r.value === t) {
			r.count++;
			i = r;
		} else {
			i = {
				id: this.nextId_++,
				value: t,
				count: 1,
				superseded: false
			};
			n.push(i);
		}
		return {
			key: e,
			generation: i.id,
			value: t,
			spent: false
		};
	}
	/**
	* A second holder of the generation `lease` names — a superseded one included.
	*
	* The difference from {@link acquire} is which era the caller joins: acquire
	* asks what a NEW holder should load, which after an invalidate is a new era.
	* An owner SPLITTING what it holds is a second owner of the one already bound.
	*/
	retain(e) {
		const t = this.byKey_.get(e.key)?.find((t) => t.id === e.generation);
		if (!t) return void 0;
		t.count++;
		return {
			key: e.key,
			generation: t.id,
			value: t.value,
			spent: false
		};
	}
	/**
	* The key's current generation is over: its holders keep what they have and
	* still owe a release, but the next acquire starts a new era rather than
	* joining theirs. Called when the cache entry is invalidated.
	*/
	supersede(e) {
		const t = this.byKey_.get(e);
		const n = t?.[t.length - 1];
		if (n) n.superseded = true;
	}
	/**
	* Give back one receipt; `exhausted` says the caller now owns the disposal.
	*
	* A receipt the ledger no longer knows is a no-op rather than an error:
	* a wholesale {@link drain} already took that reference, and taking it
	* again is the double free.
	*/
	release(e) {
		const t = e;
		if (t.spent) return void 0;
		const n = this.byKey_.get(e.key);
		const r = n?.findIndex((t) => t.id === e.generation) ?? -1;
		if (!n || r < 0) return void 0;
		t.spent = true;
		const i = n[r];
		if (--i.count > 0) return {
			value: i.value,
			exhausted: false
		};
		n.splice(r, 1);
		if (n.length === 0) this.byKey_.delete(e.key);
		return {
			value: i.value,
			exhausted: true
		};
	}
	/**
	* Drop one reference to `key` without a receipt, oldest generation first.
	*
	* The compatibility door for callers that only knew a path. Exact while a
	* key has ONE generation — every key never invalidated; `ambiguous` says it
	* had to guess. See {@link release}.
	*/
	releaseOldest(e) {
		const t = this.byKey_.get(e);
		if (!t || t.length === 0) return void 0;
		const n = t.length > 1;
		const r = t[0];
		r.count--;
		if (r.count > 0) return {
			value: r.value,
			exhausted: false,
			ambiguous: n
		};
		t.shift();
		if (t.length === 0) this.byKey_.delete(e);
		return {
			value: r.value,
			exhausted: true,
			ambiguous: n
		};
	}
	/** Every live value, and forget them all. For a wholesale teardown. */
	drain() {
		const e = [];
		for (const [t, n] of this.byKey_) for (const r of n) e.push({
			key: t,
			value: r.value
		});
		this.byKey_.clear();
		return e;
	}
	/** Keys with at least one live reference. */
	get size() {
		return this.byKey_.size;
	}
	/**
	* Live references across every key and generation.
	*
	* The distinction from {@link size} is the whole point: a key whose count
	* climbs from one to a hundred is one key either way, so a census that
	* reported only `size` would show a runaway acquire as a flat line.
	*/
	get rows() {
		let e = 0;
		for (const t of this.byKey_.values()) for (const n of t) e += n.count;
		return e;
	}
	/** @internal Live generations of one key, oldest first — diagnostics and tests. */
	generations(e) {
		return this.byKey_.get(e) ?? [];
	}
	/** @internal The whole ledger, for the resource census. */
	entries() {
		return this.byKey_;
	}
};
//#endregion
//#region src/asset/entityAssetScopes.ts
var Ln = class {
	constructor() {
		this.worlds_ = /* @__PURE__ */ new Map();
	}
	/**
	* The scope this entity owns, created on first use.
	*
	* Takes the World rather than being handed one at construction: the end of
	* an entity scope is its despawn, so the subscription that ends it is made
	* here — before any scope exists there is nothing that could be missed.
	*/
	ensure(e, t) {
		if (!e.valid(t) || e.isDestructionPending(t)) throw new Error(`Cannot own resources for entity ${t}: destroyed or pending destruction`);
		const n = this.bind_(e);
		let r = n.get(t);
		if (!r) {
			r = new Me();
			n.set(t, r);
		}
		return r;
	}
	/** What this entity owns, or null when it owns nothing of its own. */
	scopeFor(e, t) {
		if (t) return this.worlds_.get(t)?.scopes.get(e) ?? null;
		let n = null;
		for (const { scopes: t } of this.worlds_.values()) {
			const r = t.get(e);
			if (!r) continue;
			if (n) return null;
			n = r;
		}
		return n;
	}
	/** Live per-entity scopes. Diagnostics and the resource census. */
	get size() {
		let e = 0;
		for (const { scopes: t } of this.worlds_.values()) e += t.size;
		return e;
	}
	bind_(e) {
		const t = this.worlds_.get(e);
		if (t) return t.scopes;
		const n = {
			scopes: /* @__PURE__ */ new Map(),
			unbind: () => {}
		};
		this.worlds_.set(e, n);
		n.unbind = e.onDespawn((t) => {
			const r = n.scopes.get(t);
			if (!r) return;
			n.scopes.delete(t);
			try {
				r.releaseAll();
			} finally {
				if (!n.scopes.size && this.worlds_.get(e) === n) {
					this.worlds_.delete(e);
					n.unbind();
				}
			}
		});
		return n.scopes;
	}
};
//#endregion
//#region src/asset/registryAssets.ts
const Rn = (e) => e?.dependencies.releaseAll();
function zn(e) {
	return Array.isArray(e.names);
}
var Bn = class {
	constructor(e, t, n) {
		this.type = e;
		this.key = t;
		this.id = n;
		this.names = [];
		this.refs = 0;
		this.era = null;
		this.loading = null;
		this.refresh = 0;
	}
};
/**
* Every registry-backed asset this Assets has published, by every name that
* resolves to it.
*/
/** One lookup identity. `\0` cannot occur in a path or a ref. */
function U(e, t) {
	return `${e}\0${t}`;
}
var Vn = class {
	constructor() {
		this.byName_ = /* @__PURE__ */ new Map();
		this.nextId_ = 1;
		this.versions_ = /* @__PURE__ */ new Map();
	}
	/** Publication counter; failed preparations and additional holders do not change it. */
	version(e) {
		return this.versions_.get(e) ?? 0;
	}
	changed_(e) {
		this.versions_.set(e, this.version(e) + 1);
	}
	/**
	* A claim on the slot `key` identifies, publishing its first era if there is
	* none. `names` are what the registry answers to — the load path and every
	* ref a component may spell it as, all resolving to the SAME slot rather
	* than to a copy of the object.
	*/
	async acquire(e, t, n, r) {
		const i = this.slotFor_(t, n);
		for (const e of r) this.name_(i, t, e);
		if (!i.era) {
			i.loading ??= e.prepare(n);
			let r;
			try {
				r = await i.loading;
			} catch (e) {
				i.loading = null;
				if (i.refs === 0) this.forget_(i);
				throw e;
			}
			i.loading = null;
			if (this.byName_.get(U(t, n)) !== i) {
				r.dependencies.releaseAll();
				throw new Error(`"${n}" was released while it was loading; it has no owner. Load it again.`);
			}
			if (!i.era) {
				i.era = r;
				this.changed_(t);
			} else if (r !== i.era) r.dependencies.releaseAll();
		}
		return this.lease_(e, i);
	}
	/**
	* Replace the current era with a freshly prepared one, atomically.
	*
	* A failed prepare leaves the slot exactly as it was — holders keep working
	* with the era they have rather than losing it to a bad download. Answers
	* false when nothing holds this name, and when what came back is no longer
	* the answer to any live question.
	*/
	async republish(e, t, n) {
		const r = this.byName_.get(U(t, n));
		if (!r?.era) return false;
		const i = ++r.refresh;
		const a = await e.prepare(r.key);
		if (a.failedDependencies?.length) {
			a.dependencies.releaseAll();
			throw new Error(`Cannot refresh "${n}": dependencies did not load: ${a.failedDependencies.join(", ")}`);
		}
		if (i !== r.refresh || !r.era) {
			a.dependencies.releaseAll();
			return false;
		}
		const o = r.era;
		r.era = a;
		this.changed_(t);
		o.dependencies.releaseAll();
		return true;
	}
	/** Whether this name is one a slot of this type answers to. */
	has(e, t) {
		return this.byName_.has(U(e, t));
	}
	/** What the current era of (type, name) took — the graph, as a projection
	*  of acquisitions rather than a table anyone maintains. */
	dependenciesOf(e, t) {
		return this.byName_.get(U(e, t))?.era?.edges ?? [];
	}
	/** Every live era, by the key its slot is filed under. What a reverse walk
	*  reads: who depends on what is computed from the eras themselves. */
	eras() {
		const e = [];
		for (const t of new Set(this.byName_.values())) if (t.era) e.push({
			type: t.type,
			key: t.key,
			edges: t.era.edges
		});
		return e;
	}
	/**
	* What this realm publishes for (type, name) right now — the answer a
	* runtime lookup reads, and the only copy of it.
	*/
	published(e, t) {
		return this.byName_.get(U(e, t))?.era?.published;
	}
	/** Everything published of one type. What a schedule analysis reads to learn
	*  what the loaded graphs of this realm reach for. */
	publishedOf(e) {
		const t = [];
		for (const n of new Set(this.byName_.values())) if (n.type === e && n.era) t.push(n.era.published);
		return t;
	}
	/** Live slots — one per asset, however many names it answers to. */
	get size() {
		return new Set(this.byName_.values()).size;
	}
	/** Give up every slot. For a wholesale teardown. */
	releaseAll() {
		const e = [];
		for (const t of new Set(this.byName_.values())) {
			e.push(t.era);
			if (t.era) this.changed_(t.type);
			t.era = null;
			t.refs = 0;
		}
		this.byName_.clear();
		C(e, Rn);
	}
	/** Drop one claim on the slot `name` resolves to, without its receipt. The
	*  compatibility door for a caller that only ever had a path. */
	releaseByName(e, t) {
		const n = this.byName_.get(U(e, t));
		if (!n || n.refs === 0) return false;
		this.drop_(n);
		return true;
	}
	lease_(e, t) {
		t.refs++;
		let n = false;
		return {
			key: t.key,
			generation: t.id,
			value: t.era.value,
			get failedDependencies() {
				return t.era?.failedDependencies;
			},
			names: t.names,
			release: () => {
				if (n) return;
				n = true;
				this.drop_(t);
			},
			retain: () => this.byName_.get(U(t.type, t.key)) === t && t.era ? this.lease_(e, t) : null
		};
	}
	drop_(e) {
		if (e.refs === 0) return;
		if (--e.refs > 0) return;
		const t = e.era;
		e.era = null;
		if (t) this.changed_(e.type);
		this.forget_(e);
		Rn(t);
	}
	slotFor_(e, t) {
		const n = U(e, t);
		let r = this.byName_.get(n);
		if (!r) {
			r = new Bn(e, t, this.nextId_++);
			this.byName_.set(n, r);
		}
		return r;
	}
	/**
	* Index another lookup name onto this slot, and publish under it too.
	*
	* The dedupe is on the NAME list, not on the index: the slot's own key is
	* already indexed when it is created, and reading that back as "already
	* known" left the list — which is what gets published — empty.
	*/
	name_(e, t, n) {
		if (!e.names.includes(n)) e.names.push(n);
		this.byName_.set(U(t, n), e);
	}
	forget_(e) {
		for (const [t, n] of [...this.byName_]) if (n === e) this.byName_.delete(t);
	}
};
//#endregion
//#region src/asset/loaders/SpineAssetLoader.ts
var Hn = class {
	constructor() {
		this.type = "spine";
		this.extensions = [".skel"];
	}
	/** The pair a skeleton names on its own: its atlas is a Catalog dependency,
	*  which is what a cook records for it. */
	async load(e, t) {
		const n = t.catalog.getDeps(e);
		const r = n.length > 0 ? n[0] : null;
		if (!r) throw new Error(`Spine skeleton has no atlas dependency: ${e}. Pass the atlas explicitly or configure Catalog deps.`);
		return this.prepare(e, r, t);
	}
	/** The pair as a caller named it — a component authors both fields. */
	async prepare(e, t, n) {
		return Be(Un(n, t), e, t);
	}
};
/** The asset layer as a spine transport: documents through the source door,
*  pages through the acquisition door — so the era holds every page receipt. */
function Un(e, t) {
	const n = e.catalog.addressOf(t) ?? t;
	const r = n.substring(0, n.lastIndexOf("/"));
	return {
		text: (t) => e.readSource ? e.readSource(t) : e.loadText(e.catalog.getBuildPath(t)),
		binary: (t) => e.loadBinary(e.catalog.getBuildPath(t)),
		page: async (t) => (await e.acquireTexture(t, false)).value,
		pagePath: (e) => r ? `${r}/${e}` : e,
		isBinary: (e) => k(e)?.contentType === "binary"
	};
}
//#endregion
//#region src/render/materialProblems.ts
/**
* @file  materialProblems.ts
* @brief What a material asset says that nothing reads. Pure, and apart from material.ts so a loader can name it without the material system.
*/
/**
* The properties of a material asset that `parseAssetProperties` (material.ts) would drop, each with what to write instead. A dropped value is the quietest
* way a material goes wrong: it loads, draws, and simply ignores what was written (a tiling of `[12, 12]` leaves the surface untiled).
* Strings are texture refs and are the loader's own business.
*/
function Wn(e) {
	const t = [];
	for (const [n, r] of Object.entries(e)) {
		if (typeof r === "number" || typeof r === "string") continue;
		if (Array.isArray(r)) {
			const e = [
				"x",
				"y",
				"z",
				"w"
			].slice(0, Math.min(Math.max(r.length, 2), 4));
			const i = r.length === 3 || r.length === 4;
			t.push(`${n} is an array and no material reads one: write ${i ? "{ \"r\": .., \"g\": .., \"b\": .., \"a\": .. } for a colour or " : ""}{ ${e.map((e) => `"${e}": ..`).join(", ")} } for a vector`);
		} else if (typeof r === "object" && r !== null) {
			const e = r;
			if (!("r" in e) && !("w" in e) && !("z" in e) && !("y" in e)) t.push(`${n} is an object with none of the keys a colour (r, g, b, a) or a vector (x, y, z, w) has`);
		} else t.push(`${n} is ${r === null ? "null" : typeof r}: a material property is a number, a texture path, a colour or a vector`);
	}
	return t;
}
//#endregion
//#region src/asset/loaders/MaterialAssetLoader.ts
var Gn = class {
	constructor() {
		this.type = "material";
		this.extensions = [".esmaterial"];
	}
	async load(e, t) {
		const n = t.catalog.getBuildPath(e);
		const r = await t.loadText(n);
		const i = JSON.parse(r);
		if (i.type !== "material") throw new Error(`Invalid material file type: ${i.type} at ${e}`);
		if (i.instanceOf) {
			const n = P(e, i.instanceOf);
			const r = await t.acquireAsset("material", n);
			const a = j.createFromAsset(i, 0, r.value.handle);
			const o = await this.applyTextureProps(a, i, e, t);
			t.noteAssetProblems?.(e, [...Wn(i.properties), ...o]);
			return {
				handle: a,
				shaderHandle: r.value.shaderHandle
			};
		}
		const a = Kn(i.switches);
		const o = bt(i.shader) ? i.shader : P(e, i.shader);
		const s = (await t.acquireAsset("material-shader", o)).value.compile(a);
		const c = j.createFromAsset(i, s);
		const l = await this.applyTextureProps(c, i, e, t);
		t.noteAssetProblems?.(e, [...Wn(i.properties), ...l]);
		return {
			handle: c,
			shaderHandle: s
		};
	}
	async applyTextureProps(e, t, n, r) {
		const i = [];
		for (const [a, o] of Object.entries(t.properties)) {
			if (typeof o !== "string") continue;
			const t = P(n, o);
			r.noteMaterialTexture?.(n, t);
			try {
				const n = await r.acquireTexture(t);
				j.setUniform(e, a, j.tex(n.value.handle));
			} catch (e) {
				c.warn("asset", `Material ${n}: failed to load texture '${t}' for param '${a}'`, e);
				i.push(`${a}: the texture "${t}" did not load (${e instanceof Error ? e.message : String(e)}), so the surface draws without it`);
			}
		}
		return i;
	}
	unload(e) {
		j.release(e.handle);
	}
};
function Kn(e) {
	if (!e) return [];
	return Object.entries(e).filter(([, e]) => e).map(([e]) => e).sort();
}
//#endregion
//#region src/asset/loaders/MaterialShaderAssetLoader.ts
/** One source era owns every permutation compiled from those exact bytes. */
var qn = class {
	constructor(e, t) {
		this.path_ = e;
		this.source_ = t;
		this.programs_ = /* @__PURE__ */ new Map();
	}
	compile(e) {
		const t = JSON.stringify(e);
		const n = this.programs_.get(t);
		if (n !== void 0) return n;
		const r = j.compileShader(this.source_, e);
		if (!r) throw new Error(`Failed to compile material shader: ${this.path_}`);
		this.programs_.set(t, r);
		j.noteProgram(r, e, this.source_, (e) => this.compile(e));
		return r;
	}
	dispose() {
		const e = [...this.programs_.values()];
		this.programs_.clear();
		C(e, (e) => j.releaseShader(e));
	}
};
var Jn = class {
	constructor() {
		this.type = "material-shader";
		this.extensions = [".esshader"];
	}
	async load(e, t) {
		let n;
		if (bt(e)) {
			const t = $e(e.slice(yt.length));
			if (!t) {
				const t = e.slice(yt.length);
				const n = et[t];
				throw new Error(n ? `The built-in shader ${e} ships in ${n}, which this package did not install: import '${n}'.` : `Unknown built-in shader: ${e}`);
			}
			n = t.source;
		} else n = t.readSource ? await t.readSource(e) : await t.loadText(t.catalog.getBuildPath(e));
		return new qn(e, n);
	}
	unload(e) {
		e.dispose();
	}
};
//#endregion
//#region src/asset/loaders/engineCore.ts
/** `api` when it can marshal, else null. */
function Yn(e) {
	return e?._malloc && e._free && e.HEAPU8 && e.HEAPF32 ? e : null;
}
//#endregion
//#region src/lightmap/charts.ts
const Xn = (e, t, n, r) => e[t] * n[r] + e[t + 1] * n[r + 1] + e[t + 2] * n[r + 2];
/**
* Welds vertices by POSITION, returning a representative index per vertex.
*
* Adjacency has to be geometric: an importer already splits a vertex wherever a
* normal or a UV is discontinuous, so two triangles sharing an edge of the model
* usually share no vertex index at all. Quantising is what makes them meet.
*/
function Zn(e, t, n) {
	const r = new Int32Array(t);
	const i = /* @__PURE__ */ new Map();
	const a = 1 / Math.max(n, 1e-9);
	for (let n = 0; n < t; n++) {
		const t = `${Math.round(e[n * 3] * a)},${Math.round(e[n * 3 + 1] * a)},${Math.round(e[n * 3 + 2] * a)}`;
		const o = i.get(t);
		if (o === void 0) {
			i.set(t, n);
			r[n] = n;
		} else r[n] = o;
	}
	return r;
}
/** Geometric normal of a triangle, unnormalised — its length is twice the area. */
function Qn(e, t, n, r) {
	const i = e[t.a * 3], a = e[t.a * 3 + 1], o = e[t.a * 3 + 2];
	const s = e[t.b * 3] - i, c = e[t.b * 3 + 1] - a, l = e[t.b * 3 + 2] - o;
	const u = e[t.c * 3] - i, d = e[t.c * 3 + 1] - a, f = e[t.c * 3 + 2] - o;
	const p = c * f - l * d, m = l * u - s * f, h = s * d - c * u;
	n[r] = p;
	n[r + 1] = m;
	n[r + 2] = h;
	return Math.hypot(p, m, h);
}
/** Triangles sharing each welded edge, as a map from edge key to triangle list. */
function $n(e, t) {
	const n = /* @__PURE__ */ new Map();
	const r = (e, t, r) => {
		const i = Math.min(e, t), a = Math.max(e, t);
		const o = i * 67108864 + a;
		const s = n.get(o);
		if (s) s.push(r);
		else n.set(o, [r]);
	};
	for (let n = 0; n < e.length; n++) {
		const i = e[n];
		r(t[i.a], t[i.b], n);
		r(t[i.b], t[i.c], n);
		r(t[i.c], t[i.a], n);
	}
	return n;
}
/**
* Cuts the surface into nearly-flat charts and gives each a projection basis.
*
* @param maxAngleCos Cosine of the widest angle two neighbours may differ by and
*        still be one chart. Flatter charts project with less stretch and pack
*        worse; this is the whole of that trade.
*/
function er(e, t, n, r) {
	const i = t.length;
	const a = new Float32Array(i * 3);
	const o = new Uint8Array(i);
	for (let n = 0; n < i; n++) {
		const r = Qn(e, t[n], a, n * 3);
		if (r < 1e-12) {
			o[n] = 1;
			continue;
		}
		a[n * 3] /= r;
		a[n * 3 + 1] /= r;
		a[n * 3 + 2] /= r;
	}
	const s = $n(t, n);
	const c = (e) => {
		const r = t[e];
		const i = [];
		const a = (r, a) => {
			const o = Math.min(n[r], n[a]), c = Math.max(n[r], n[a]);
			if (o === c) return;
			const l = s.get(o * 67108864 + c);
			if (l?.length !== 2) return;
			for (const o of l) {
				if (o === e) continue;
				const s = t[o];
				if (n[s.a] === n[a] && n[s.b] === n[r] || n[s.b] === n[a] && n[s.c] === n[r] || n[s.c] === n[a] && n[s.a] === n[r]) i.push(o);
			}
		};
		a(r.a, r.b);
		a(r.b, r.c);
		a(r.c, r.a);
		return i;
	};
	const l = new Int32Array(i).fill(-1);
	const u = [];
	let d = 0;
	for (let e = 0; e < i; e++) {
		if (l[e] >= 0) continue;
		const t = d++;
		u.push(e);
		l[e] = t;
		const n = [e];
		while (n.length > 0) {
			const i = n.pop();
			for (const s of c(i)) {
				if (l[s] >= 0) continue;
				if (!o[s] && !o[e] && Xn(a, e * 3, a, s * 3) < r) continue;
				l[s] = t;
				n.push(s);
			}
		}
	}
	const f = new Float32Array(d * 6);
	const p = new Float32Array(d * 3);
	for (let e = 0; e < i; e++) {
		if (o[e]) continue;
		const t = l[e] * 3;
		p[t] += a[e * 3];
		p[t + 1] += a[e * 3 + 1];
		p[t + 2] += a[e * 3 + 2];
	}
	for (let e = 0; e < d; e++) {
		let t = p[e * 3], n = p[e * 3 + 1], r = p[e * 3 + 2];
		let i = Math.hypot(t, n, r);
		if (i < 1e-9) {
			t = 0;
			n = 0;
			r = 1;
			i = 1;
		}
		t /= i;
		n /= i;
		r /= i;
		const a = Math.abs(t), o = Math.abs(n), s = Math.abs(r);
		const c = a <= o && a <= s ? [
			1,
			0,
			0
		] : o <= s ? [
			0,
			1,
			0
		] : [
			0,
			0,
			1
		];
		let l = c[1] * r - c[2] * n;
		let u = c[2] * t - c[0] * r;
		let d = c[0] * n - c[1] * t;
		const m = Math.hypot(l, u, d) || 1;
		l /= m;
		u /= m;
		d /= m;
		f[e * 6] = l;
		f[e * 6 + 1] = u;
		f[e * 6 + 2] = d;
		f[e * 6 + 3] = n * d - r * u;
		f[e * 6 + 4] = r * l - t * d;
		f[e * 6 + 5] = t * u - n * l;
	}
	return {
		chartOf: l,
		count: d,
		basis: f
	};
}
//#endregion
//#region src/lightmap/pack.ts
/** Height the skyline reaches over `[x, x+width)`, or -1 if that runs off the end. */
function tr(e, t, n, r, i) {
	if (n + r > i) return -1;
	let a = e[t].y;
	let o = r;
	for (let r = t; r < e.length && o > 0; r++) {
		a = Math.max(a, e[r].y);
		o -= e[r].width - (r === t ? n - e[r].x : 0);
	}
	return o > 0 ? -1 : a;
}
function nr(e, t, n, r, i) {
	const a = n + i;
	const o = [];
	for (const n of e) {
		if (n.x + n.width <= t || n.x >= t + r) {
			o.push(n);
			continue;
		}
		if (n.x < t) o.push({
			x: n.x,
			y: n.y,
			width: t - n.x
		});
		if (n.x + n.width > t + r) o.push({
			x: t + r,
			y: n.y,
			width: n.x + n.width - (t + r)
		});
	}
	o.push({
		x: t,
		y: a,
		width: r
	});
	o.sort((e, t) => e.x - t.x);
	e.length = 0;
	for (const t of o) {
		const n = e[e.length - 1];
		if (n && n.y === t.y && n.x + n.width === t.x) n.width += t.width;
		else e.push(t);
	}
}
/**
* Places every rectangle inside a square of side `extent`, or returns null.
*
* Null is the caller's signal to scale the whole set down and try again — which
* is the only way to keep one ratio for all of them.
*/
function rr(e, t) {
	const n = e.map((e, t) => t).sort((t, n) => Math.max(e[n][0], e[n][1]) - Math.max(e[t][0], e[t][1]));
	const r = [{
		x: 0,
		y: 0,
		width: t
	}];
	const i = new Array(e.length);
	for (const a of n) {
		const [n, o] = e[a];
		let s = null;
		for (let e = 0; e < r.length; e++) for (const [i, a, c] of [[
			n,
			o,
			false
		], [
			o,
			n,
			true
		]]) {
			const n = tr(r, e, r[e].x, i, t);
			if (n < 0 || n + a > t) continue;
			if (!s || n < s.y || n === s.y && r[e].x < s.x) s = {
				x: r[e].x,
				y: n,
				rotated: c
			};
		}
		if (!s) return null;
		const [c, l] = s.rotated ? [o, n] : [n, o];
		nr(r, s.x, s.y, c, l);
		i[a] = s;
	}
	return i;
}
/** Marks every cell of a mask a triangle touches, by the span each of its edges covers in each row. */
function ir(e, t, n, r, i, a, o) {
	const s = [
		r[i] * a + o,
		r[i + 2] * a + o,
		r[i + 4] * a + o
	];
	const c = [
		r[i + 1] * a + o,
		r[i + 3] * a + o,
		r[i + 5] * a + o
	];
	const l = Math.max(0, Math.floor(Math.min(c[0], c[1], c[2])));
	const u = Math.min(n - 1, Math.floor(Math.max(c[0], c[1], c[2])));
	for (let n = l; n <= u; n++) {
		let r = Infinity, i = -Infinity;
		for (let e = 0; e < 3; e++) {
			const [t, a, o, l] = [
				s[e],
				c[e],
				s[(e + 1) % 3],
				c[(e + 1) % 3]
			];
			const [u, d] = [Math.max(Math.min(a, l), n), Math.min(Math.max(a, l), n + 1)];
			if (u > d) continue;
			const f = l - a;
			const p = f === 0 ? t : t + (u - a) / f * (o - t);
			const m = f === 0 ? o : t + (d - a) / f * (o - t);
			r = Math.min(r, p, m);
			i = Math.max(i, p, m);
		}
		if (r > i) continue;
		const [a, o] = [Math.max(0, Math.floor(r)), Math.min(t - 1, Math.floor(i))];
		e.fill(1, n * t + a, n * t + o + 1);
	}
}
/** The filled cells of one chart at one scale, grown by @p pad cells, as offsets from its corner. */
function ar(e, t, n, r) {
	const [i, a] = r ? [e.height, e.width] : [e.width, e.height];
	const o = Math.ceil(i * t) + 1 + n * 2, s = Math.ceil(a * t) + 1 + n * 2;
	let c = new Uint8Array(o * s);
	const l = e.triangles;
	if (r) {
		const e = /* @__PURE__ */ new Float64Array(6);
		for (let r = 0; r < l.length; r += 6) {
			for (let t = 0; t < 3; t++) {
				e[t * 2] = l[r + t * 2 + 1];
				e[t * 2 + 1] = l[r + t * 2];
			}
			ir(c, o, s, e, 0, t, n);
		}
	} else for (let e = 0; e < l.length; e += 6) ir(c, o, s, l, e, t, n);
	if (n > 0) {
		const e = new Uint8Array(o * s);
		for (let t = 0; t < s; t++) for (let r = 0; r < o; r++) {
			if (!c[t * o + r]) continue;
			e.fill(1, t * o + Math.max(0, r - n), t * o + Math.min(o, r + n + 1));
		}
		const t = new Uint8Array(o * s);
		for (let r = 0; r < s; r++) for (let i = 0; i < o; i++) {
			if (!e[r * o + i]) continue;
			for (let e = Math.max(0, r - n); e <= Math.min(s - 1, r + n); e++) t[e * o + i] = 1;
		}
		c = t;
	}
	let u = 0;
	for (let e = 0; e < o * s; e++) if (c[e]) u++;
	const d = new Int32Array(u * 2);
	let f = 0;
	for (let e = 0; e < s; e++) for (let t = 0; t < o; t++) if (c[e * o + t]) {
		d[f++] = t;
		d[f++] = e;
	}
	return {
		w: o,
		h: s,
		cells: d
	};
}
/**
* Places charts by the cells they really cover, so a small one can sit in the bite of a large one, as a rectangle
* around that large one could never let it. Null if they do not all fit at this scale.
*
* @param scale Chart units to one unit of the square. As in {@link packSkyline} it is one number for all of them.
* @param grid  Cells along a side.
* @param pad   Cells to keep clear around every chart.
*/
function or(e, t, n, r) {
	const i = t * n;
	const a = new Uint8Array(n * n);
	/** First cell of each row that may be free: rows only ever fill. */
	const o = new Int32Array(n);
	const s = e.map((e) => e.width * e.height);
	const c = e.map((e, t) => t).sort((e, t) => s[t] - s[e]);
	const l = new Array(e.length);
	const u = (e, t, r) => {
		const { cells: i } = e;
		const o = i.length > 512 ? 32 : 2;
		for (let e = 0; e < i.length; e += o) if (a[(r + i[e + 1]) * n + t + i[e]]) return false;
		if (o > 2) {
			for (let e = 0; e < i.length; e += 2) if (a[(r + i[e + 1]) * n + t + i[e]]) return false;
		}
		return true;
	};
	const d = (e) => {
		if (e.w > n || e.h > n || e.cells.length === 0) return e.cells.length === 0 ? {
			x: 0,
			y: 0
		} : null;
		const [t, r] = [e.cells[0], e.cells[1]];
		for (let i = 0; i + e.h <= n; i++) {
			const s = i + r;
			for (let r = Math.max(0, o[s] - t); r + e.w <= n; r++) {
				if (a[s * n + r + t]) continue;
				if (u(e, r, i)) return {
					x: r,
					y: i
				};
			}
		}
		return null;
	};
	for (const t of c) {
		const s = e[t];
		const c = ar(s, i, r, false);
		const u = ar(s, i, r, true);
		const f = d(c), p = d(u);
		if (!f && !p) return null;
		const m = !f || p !== null && (p.y + u.h < f.y + c.h || p.y + u.h === f.y + c.h && p.x < f.x);
		const [h, g] = m ? [u, p] : [c, f];
		for (let e = 0; e < h.cells.length; e += 2) a[(g.y + h.cells[e + 1]) * n + g.x + h.cells[e]] = 1;
		for (let e = g.y; e < g.y + h.h; e++) {
			let t = o[e];
			while (t < n && a[e * n + t]) t++;
			o[e] = t;
		}
		l[t] = {
			x: (g.x + r) / n,
			y: (g.y + r) / n,
			rotated: m
		};
	}
	return l;
}
//#endregion
//#region src/lightmap/unwrap.ts
/**
* @file    unwrap.ts
* @brief   A second UV set for a mesh that has none — the whole unwrap, in order.
*
* Cut into flat charts, project each onto its own plane, scale them all by ONE
* ratio, pack, split the vertices the cuts run through. A bake is read through
* the result, so what it must guarantee is that no two surfaces share a texel —
* which is exactly what the UV set the art is wrapped in does not.
*/
const sr = {
	maxChartAngleDegrees: 60,
	paddingTexels: 2,
	atlasSize: 1024
};
/** Cells along a side when laying out by outline. Past this a chart's outline is finer than anything packing gains from. */
const cr = 512;
/** Beyond these, charts are packed as rectangles: outlines cost seconds, and many small charts gain little from them. */
const lr = 200;
const ur = 2e5;
const dr = .8;
/** Halvings of the gap between a size that fits and one that does not: from a gap of 20%, to about a third of a percent. */
const fr = 6;
function pr(e, t) {
	return e.find((e) => e.semantic === t);
}
/** Positions as a tight `vertexCount * 3` array, whatever the source stride is. */
function mr(e) {
	const t = pr(e.channels, M.Position);
	if (!t || t.type !== N.Float32) throw new Error("unwrapLightmapUV: the mesh carries no float Position channel");
	const n = new DataView(e.vertices.buffer, e.vertices.byteOffset, e.vertices.byteLength);
	const r = new Float32Array(e.vertexCount * 3);
	for (let i = 0; i < e.vertexCount; i++) {
		const a = i * e.vertexStride + t.offset;
		r[i * 3] = n.getFloat32(a, true);
		r[i * 3 + 1] = n.getFloat32(a + 4, true);
		r[i * 3 + 2] = t.components >= 3 ? n.getFloat32(a + 8, true) : 0;
	}
	return r;
}
/** The diagonal of the bounds, as the scale a weld epsilon is relative to. */
function hr(e) {
	const t = Math.hypot(e.aabbMax[0] - e.aabbMin[0], e.aabbMax[1] - e.aabbMin[1], e.aabbMax[2] - e.aabbMin[2]);
	return Math.max(t, 1e-6) * 1e-5;
}
/**
* Gives `mesh` a lightmap UV set, splitting vertices where charts meet.
*
* Every per-vertex datum follows its vertex, morph deltas included, so the result
* is the same mesh — drawn, skinned and shaped identically — that now also
* carries somewhere to read a bake from.
*/
function gr(e, t = {}) {
	const n = {
		...sr,
		...t
	};
	const r = mr(e);
	const i = [];
	for (let t = 0; t + 2 < e.indices.length; t += 3) i.push({
		a: e.indices[t],
		b: e.indices[t + 1],
		c: e.indices[t + 2]
	});
	const a = Zn(r, e.vertexCount, hr(e));
	const o = Math.cos(n.maxChartAngleDegrees * Math.PI / 180);
	const s = er(r, i, a, o);
	const c = new Float32Array(i.length * 3);
	const l = new Float32Array(i.length * 3);
	const u = new Float32Array(s.count * 2).fill(Infinity);
	const d = new Float32Array(s.count * 2).fill(-Infinity);
	for (let e = 0; e < i.length; e++) {
		const t = s.chartOf[e] * 6;
		const n = [
			i[e].a,
			i[e].b,
			i[e].c
		];
		for (let i = 0; i < 3; i++) {
			const a = n[i] * 3;
			const o = r[a] * s.basis[t] + r[a + 1] * s.basis[t + 1] + r[a + 2] * s.basis[t + 2];
			const f = r[a] * s.basis[t + 3] + r[a + 1] * s.basis[t + 4] + r[a + 2] * s.basis[t + 5];
			c[e * 3 + i] = o;
			l[e * 3 + i] = f;
			const p = s.chartOf[e] * 2;
			if (o < u[p]) u[p] = o;
			if (o > d[p]) d[p] = o;
			if (f < u[p + 1]) u[p + 1] = f;
			if (f > d[p + 1]) d[p + 1] = f;
		}
	}
	const f = [];
	for (let e = 0; e < s.count; e++) f.push([Math.max(d[e * 2] - u[e * 2], 0), Math.max(d[e * 2 + 1] - u[e * 2 + 1], 0)]);
	const p = n.paddingTexels / n.atlasSize;
	const m = Array.from({ length: s.count }, () => []);
	let h = 0;
	for (let e = 0; e < i.length; e++) {
		const t = s.chartOf[e];
		const n = m[t];
		for (let r = 0; r < 3; r++) n.push(c[e * 3 + r] - u[t * 2], l[e * 3 + r] - u[t * 2 + 1]);
		h += Math.abs((c[e * 3 + 1] - c[e * 3]) * (l[e * 3 + 2] - l[e * 3]) - (c[e * 3 + 2] - c[e * 3]) * (l[e * 3 + 1] - l[e * 3])) / 2;
	}
	const g = Math.min(n.atlasSize, cr);
	const ee = Math.max(1, Math.ceil(p * g));
	const _ = s.count <= lr && i.length <= ur;
	const te = _ ? m.map((e, t) => ({
		triangles: e,
		width: f[t][0],
		height: f[t][1]
	})) : [];
	const v = (e) => {
		if (_) return or(te, e, g, ee);
		const t = f.map(([t, n]) => [t * e + p * 2, n * e + p * 2]);
		const n = rr(t, 1);
		return n && n.map((e) => ({
			...e,
			x: e.x + p,
			y: e.y + p
		}));
	};
	let y = h > 0 ? Math.sqrt(1 / h) : 1;
	let b = null;
	let x = y;
	for (let e = 0; e < 32 && !b; e++) {
		b = v(y);
		if (!b) {
			x = y;
			y *= dr;
		}
	}
	if (!b) throw new Error("unwrapLightmapUV: charts do not fit even at 0.1% of their size");
	let S = y;
	for (let e = 0; e < fr && x > S; e++) {
		const e = Math.sqrt(S * x);
		const t = v(e);
		if (t) {
			b = t;
			S = e;
		} else x = e;
	}
	y = S;
	const ne = h * y * y;
	const C = /* @__PURE__ */ new Map();
	const w = [];
	const T = [];
	const re = new Uint32Array(i.length * 3);
	for (let e = 0; e < i.length; e++) {
		const t = s.chartOf[e];
		const n = b[t];
		const r = [
			i[e].a,
			i[e].b,
			i[e].c
		];
		for (let i = 0; i < 3; i++) {
			const a = r[i] * s.count + t;
			let o = C.get(a);
			if (o === void 0) {
				o = w.length;
				C.set(a, o);
				w.push(r[i]);
				const s = (c[e * 3 + i] - u[t * 2]) * y;
				const d = (l[e * 3 + i] - u[t * 2 + 1]) * y;
				T.push(n.rotated ? n.x + d : n.x + s, n.rotated ? n.y + s : n.y + d);
			}
			re[e * 3 + i] = o;
		}
	}
	return {
		mesh: _r(e, w, T, re),
		charts: s.count,
		coverage: ne
	};
}
/** The same mesh over a new vertex table, with the UV set appended to each. */
function _r(e, t, n, r) {
	const i = pr(e.channels, M.TexCoord1);
	const a = i ? e.vertexStride : e.vertexStride + 8;
	const o = i ? i.offset : e.vertexStride;
	const s = i ? [...e.channels] : [...e.channels, {
		semantic: M.TexCoord1,
		components: 2,
		type: N.Float32,
		offset: o
	}];
	const c = new Uint8Array(t.length * a);
	const l = new DataView(c.buffer);
	for (let r = 0; r < t.length; r++) {
		c.set(e.vertices.subarray(t[r] * e.vertexStride, (t[r] + 1) * e.vertexStride), r * a);
		l.setFloat32(r * a + o, n[r * 2], true);
		l.setFloat32(r * a + o + 4, n[r * 2 + 1], true);
	}
	let u = e.morph;
	if (u) {
		const n = u.hasNormals ? 6 : 3;
		const r = u.names.length;
		const i = new Float32Array(r * t.length * n);
		for (let a = 0; a < r; a++) for (let r = 0; r < t.length; r++) {
			const o = (a * e.vertexCount + t[r]) * n;
			i.set(u.deltas.subarray(o, o + n), (a * t.length + r) * n);
		}
		u = {
			...u,
			deltas: i
		};
	}
	return {
		...e,
		channels: s,
		vertexStride: a,
		vertexCount: t.length,
		vertices: c,
		indices: r,
		morph: u
	};
}
//#endregion
//#region src/asset/builtinMeshes.ts
/**
* @file  builtinMeshes.ts — stock geometry a project references without owning a file.
*        A `builtin:<id>` mesh ref names one of these; it is built here, not fetched.
*/
/**
* The size every primitive is built at, matching `ShapeRenderer.size` — the other
* renderable born from a menu rather than an asset. A cube is 100 units on a side,
* so one dropped into a default scene is visible without being scaled first.
*/
const W = 100;
const G = 32;
const vr = 16;
const K = () => ({
	pos: [],
	uv: [],
	nrm: [],
	idx: []
});
function q(e, t, n, r, i) {
	const a = e.pos.length / 3;
	e.pos.push(t[0], t[1], t[2]);
	e.uv.push(n, r);
	e.nrm.push(i[0], i[1], i[2]);
	return a;
}
function J(e, t, n, r) {
	e.idx.push(t, n, r);
}
/** A flat quad from four corners wound counter-clockwise seen from `n`. */
function Y(e, t, n) {
	const r = q(e, t[0], 0, 0, n);
	const i = q(e, t[1], 1, 0, n);
	const a = q(e, t[2], 1, 1, n);
	const o = q(e, t[3], 0, 1, n);
	J(e, r, i, a);
	J(e, r, a, o);
}
/**
* Revolve `rings` around the Y axis and connect consecutive ones. Every curved
* surface here is this: a sphere is rings of shrinking radius, a cylinder is two
* of equal radius, a cone is one of radius zero above one that is not.
*/
function yr(e, t, n) {
	const r = e.pos.length / 3;
	for (const r of t) for (let t = 0; t <= n; t++) {
		const i = t / n * Math.PI * 2;
		const a = Math.sin(i);
		const o = Math.cos(i);
		const s = a * r.nr;
		const c = o * r.nr;
		const l = Math.hypot(s, r.ny, c) || 1;
		q(e, [
			a * r.radius,
			r.y,
			o * r.radius
		], t / n, r.v, [
			s / l,
			r.ny / l,
			c / l
		]);
	}
	const i = n + 1;
	for (let a = 0; a < t.length - 1; a++) {
		const o = t[a];
		const s = t[a + 1];
		for (let t = 0; t < n; t++) {
			const n = r + a * i + t;
			const c = n + i;
			if (o.radius > 0) J(e, n, c, n + 1);
			if (s.radius > 0) J(e, n + 1, c, c + 1);
		}
	}
}
/** A flat disc at `y` facing `sign * Y`. */
function br(e, t, n, r, i) {
	const a = [
		0,
		r,
		0
	];
	const o = q(e, [
		0,
		t,
		0
	], .5, .5, a);
	const s = [];
	for (let r = 0; r <= i; r++) {
		const o = r / i * Math.PI * 2;
		const c = Math.sin(o);
		const l = Math.cos(o);
		s.push(q(e, [
			c * n,
			t,
			l * n
		], .5 + c * .5, .5 + l * .5, a));
	}
	for (let t = 0; t < i; t++) if (r > 0) J(e, o, s[t], s[t + 1]);
	else J(e, o, s[t + 1], s[t]);
}
/** Rings tracing a hemisphere from `phiFrom` to `phiTo`, centred at `centerY`. */
function xr(e, t, n, r, i, a, o) {
	const s = [];
	for (let c = 0; c <= i; c++) {
		const l = c / i;
		const u = n + (r - n) * l;
		s.push({
			y: e + Math.cos(u) * t,
			radius: Math.sin(u) * t,
			nr: Math.sin(u),
			ny: Math.cos(u),
			v: a + (o - a) * l
		});
	}
	return s;
}
function Sr(e, t, n) {
	const r = K();
	const i = e / 2, a = t / 2, o = n / 2;
	Y(r, [
		[
			-i,
			-a,
			o
		],
		[
			i,
			-a,
			o
		],
		[
			i,
			a,
			o
		],
		[
			-i,
			a,
			o
		]
	], [
		0,
		0,
		1
	]);
	Y(r, [
		[
			i,
			-a,
			-o
		],
		[
			-i,
			-a,
			-o
		],
		[
			-i,
			a,
			-o
		],
		[
			i,
			a,
			-o
		]
	], [
		0,
		0,
		-1
	]);
	Y(r, [
		[
			i,
			-a,
			o
		],
		[
			i,
			-a,
			-o
		],
		[
			i,
			a,
			-o
		],
		[
			i,
			a,
			o
		]
	], [
		1,
		0,
		0
	]);
	Y(r, [
		[
			-i,
			-a,
			-o
		],
		[
			-i,
			-a,
			o
		],
		[
			-i,
			a,
			o
		],
		[
			-i,
			a,
			-o
		]
	], [
		-1,
		0,
		0
	]);
	Y(r, [
		[
			-i,
			a,
			o
		],
		[
			i,
			a,
			o
		],
		[
			i,
			a,
			-o
		],
		[
			-i,
			a,
			-o
		]
	], [
		0,
		1,
		0
	]);
	Y(r, [
		[
			-i,
			-a,
			-o
		],
		[
			i,
			-a,
			-o
		],
		[
			i,
			-a,
			o
		],
		[
			-i,
			-a,
			o
		]
	], [
		0,
		-1,
		0
	]);
	return r;
}
function Cr(e) {
	const t = K();
	yr(t, xr(0, e, 0, Math.PI, vr, 0, 1), G);
	return t;
}
function wr(e, t) {
	const n = K();
	const r = t / 2;
	yr(n, [{
		y: r,
		radius: e,
		nr: 1,
		ny: 0,
		v: 0
	}, {
		y: -r,
		radius: e,
		nr: 1,
		ny: 0,
		v: 1
	}], G);
	br(n, r, e, 1, G);
	br(n, -r, e, -1, G);
	return n;
}
function Tr(e, t) {
	const n = K();
	const r = t / 2;
	const i = Math.hypot(e, t) || 1;
	const a = t / i;
	const o = e / i;
	yr(n, [{
		y: r,
		radius: 0,
		nr: a,
		ny: o,
		v: 0
	}, {
		y: -r,
		radius: e,
		nr: a,
		ny: o,
		v: 1
	}], G);
	br(n, -r, e, -1, G);
	return n;
}
/** Total height is `2*radius + cylinderHeight`, the shape CapsuleCollider3D describes. */
function Er(e, t) {
	const n = K();
	const r = t / 2;
	const i = Math.max(2, vr / 2);
	yr(n, [...xr(r, e, 0, Math.PI / 2, i, 0, .3), ...xr(-r, e, Math.PI / 2, Math.PI, i, .7, 1)], G);
	return n;
}
function Dr(e) {
	const t = K();
	const n = e / 2;
	Y(t, [
		[
			-n,
			0,
			n
		],
		[
			n,
			0,
			n
		],
		[
			n,
			0,
			-n
		],
		[
			-n,
			0,
			-n
		]
	], [
		0,
		1,
		0
	]);
	return t;
}
function Or(e) {
	const t = K();
	const n = e / 2;
	Y(t, [
		[
			-n,
			-n,
			0
		],
		[
			n,
			-n,
			0
		],
		[
			n,
			n,
			0
		],
		[
			-n,
			n,
			0
		]
	], [
		0,
		0,
		1
	]);
	return t;
}
/**
* Pack a builder into the channel layout the model import writes, so built-in and
* imported geometry reach the renderer as the same kind of thing.
*/
function kr(e) {
	const { channels: t, vertexStride: n } = rt([
		{
			semantic: M.Position,
			components: 3,
			type: N.Float32
		},
		{
			semantic: M.TexCoord0,
			components: 2,
			type: N.Float32
		},
		{
			semantic: M.Color,
			components: 4,
			type: N.UNorm8
		},
		{
			semantic: M.Normal,
			components: 3,
			type: N.Float32
		}
	]);
	const r = e.pos.length / 3;
	const i = new Uint8Array(r * n);
	const a = new DataView(i.buffer);
	const o = t[0].offset;
	const s = t[1].offset;
	const c = t[2].offset;
	const l = t[3].offset;
	const u = [
		Infinity,
		Infinity,
		Infinity
	];
	const d = [
		-Infinity,
		-Infinity,
		-Infinity
	];
	for (let t = 0; t < r; t++) {
		const r = t * n;
		for (let n = 0; n < 3; n++) {
			const i = e.pos[t * 3 + n];
			a.setFloat32(r + o + n * 4, i, true);
			a.setFloat32(r + l + n * 4, e.nrm[t * 3 + n], true);
			if (i < u[n]) u[n] = i;
			if (i > d[n]) d[n] = i;
		}
		a.setFloat32(r + s, e.uv[t * 2], true);
		a.setFloat32(r + s + 4, e.uv[t * 2 + 1], true);
		a.setUint32(r + c, 4294967295, true);
	}
	return {
		channels: t,
		vertexStride: n,
		vertexCount: r,
		vertices: i,
		indices: new Uint32Array(e.idx),
		aabbMin: u,
		aabbMax: d
	};
}
/** A copy a caller may change without changing what the next caller is given. */
function Ar(e) {
	return {
		...e,
		channels: e.channels.map((e) => ({ ...e })),
		vertices: e.vertices.slice(),
		indices: e.indices.slice(),
		aabbMin: [...e.aabbMin],
		aabbMax: [...e.aabbMax]
	};
}
const X = (e, t, n, r, i) => {
	let a = null;
	return {
		id: e,
		ref: yt + e,
		label: t,
		description: n,
		closed: r,
		build: () => Ar(a ??= gr(kr(i())).mesh)
	};
};
const jr = [
	X("cube", "Cube", `A ${W}-unit box, one flat normal per face.`, true, () => Sr(W, W, W)),
	X("sphere", "Sphere", `A ${W}-unit sphere with smooth normals.`, true, () => Cr(W / 2)),
	X("capsule", "Capsule", `A ${W}-unit upright capsule — what CapsuleCollider3D describes.`, true, () => Er(W / 4, W / 2)),
	X("cylinder", "Cylinder", `A ${W}-unit upright cylinder with flat caps.`, true, () => wr(W / 2, W)),
	X("cone", "Cone", `A ${W}-unit cone standing on its base.`, true, () => Tr(W / 2, W)),
	X("plane", "Plane", `A ${W}-unit ground square in XZ, facing up.`, false, () => Dr(W)),
	X("quad", "Quad", `A ${W}-unit square in XY, facing the camera.`, false, () => Or(W))
];
const Mr = new Map(jr.map((e) => [e.id, e]));
/** The template a ref (or a bare id) names, or undefined for anything else. */
function Nr(e) {
	return Mr.get(xt(e) ?? e);
}
/** Whether `ref` names built-in geometry rather than a project file. */
function Pr(e) {
	return xt(e) !== null && Nr(e) !== void 0;
}
//#endregion
//#region src/asset/loaders/MeshAssetLoader.ts
/**
* Loads `.esmesh` — geometry that goes to the GPU once and is drawn from there.
*
* The file describes its own channels, and that table crosses to the engine in
* the file's own byte layout: this layer owns the format, the engine owns the
* vertex layout it becomes, and neither restates the other.
*
* A `builtin:<id>` ref is the same geometry with no file under it — built here,
* in the layout the model import writes, and uploaded down the identical path.
*/
var Fr = class {
	/** Lazy like the audio loader's: unload/invalidate have no LoadContext. */
	constructor(e) {
		this.core_ = e;
		this.type = "mesh";
		this.extensions = [".esmesh"];
	}
	async load(e, t) {
		const n = await this.decode_(e, t);
		const r = this.upload_(n, 0);
		if (!r) throw new Error(`the engine rejected the geometry in ${e}`);
		const i = Ke(n.vertices, n.vertexCount, n.vertexStride, n.channels);
		if (i) Ge(r, {
			positions: i,
			indices: n.indices
		});
		return { handle: r };
	}
	/**
	* Puts the source back behind a handle a device loss emptied.
	*
	* The same decode and upload as {@link load}, aimed at an existing handle: a
	* second `load` would mint a new one that nothing in the world points at. The
	* collision data is CPU-side and survived the loss, so it is not rebuilt.
	*/
	async rematerialize(e, t, n) {
		return this.upload_(await this.decode_(t, n), e) !== 0;
	}
	/** The decoded source behind a mesh path — what a tool that rebuilds geometry (a static batch) starts from. */
	readSource(e, t) {
		return this.decode_(e, t);
	}
	/** Uploads geometry that has no file under it; `target` 0 mints a handle, otherwise the existing one is re-realized. */
	uploadData(e, t = 0) {
		return this.upload_(e, t);
	}
	async decode_(e, t) {
		const n = Pr(e) ? Nr(e) : void 0;
		return n ? n.build() : nt(new Uint8Array(await t.loadBinary(t.catalog.getBuildPath(e))));
	}
	/** Uploads decoded geometry; `target` 0 mints a handle, otherwise the
	*  existing one is re-realized. Returns the handle, or 0 on refusal. */
	upload_(e, t) {
		const n = tt(e.channels);
		const r = Yn(this.core_());
		const i = t === 0;
		if (i ? !r?.mesh_createFromChannels : !r?.mesh_rematerializeFromChannels) throw new Error(`this engine build carries no ${i ? "mesh_createFromChannels" : "mesh_rematerializeFromChannels"}`);
		return w(r, (a) => {
			const o = a(n.byteLength);
			const s = a(e.vertices.byteLength);
			const c = a(e.indices.byteLength);
			const l = e.inverseBindMatrices;
			const u = l ? a(l.byteLength) : 0;
			const d = e.morph;
			const f = d ? a(d.deltas.byteLength) : 0;
			r.HEAPU8.set(n, o);
			r.HEAPU8.set(e.vertices, s);
			r.HEAPU8.set(new Uint8Array(e.indices.buffer, e.indices.byteOffset, e.indices.byteLength), c);
			if (l) r.HEAPU8.set(new Uint8Array(l.buffer, l.byteOffset, l.byteLength), u);
			if (d) r.HEAPU8.set(new Uint8Array(d.deltas.buffer, d.deltas.byteOffset, d.deltas.byteLength), f);
			const p = [
				f,
				d?.deltas.length ?? 0,
				d?.names.length ?? 0,
				d?.hasNormals ? 1 : 0
			];
			return i ? r.mesh_createFromChannels(o, e.channels.length, e.vertexStride, s, e.vertices.byteLength, c, e.indices.length, e.aabbMin[0], e.aabbMin[1], e.aabbMin[2], e.aabbMax[0], e.aabbMax[1], e.aabbMax[2], u, l?.length ?? 0, ...p) : r.mesh_rematerializeFromChannels(t, o, e.channels.length, e.vertexStride, s, e.vertices.byteLength, c, e.indices.length, e.aabbMin[0], e.aabbMin[1], e.aabbMin[2], e.aabbMax[0], e.aabbMax[1], e.aabbMax[2], u, l?.length ?? 0, ...p);
		});
	}
	/** Gives back a handle {@link uploadData} minted. */
	releaseData(e) {
		this.core_()?.mesh_release?.(e);
	}
	unload(e) {
		We(e.handle);
		this.core_()?.mesh_release?.(e.handle);
	}
};
//#endregion
//#region src/asset/loaders/EnvironmentAssetLoader.ts
/**
* Loads `.esenv` — an environment's irradiance and its prefiltered reflection.
*
* The reflection is an ordinary texture asset, acquired through the same door as
* any other — so the preparation holds the receipt and the era gives it back.
* Only the nine coefficients are the environment's own.
*/
var Ir = class {
	/** Lazy like the mesh loader's: the module arrives after construction. */
	constructor(e) {
		this.core_ = e;
		this.type = "environment";
		this.extensions = [".esenv"];
	}
	async load(e, t) {
		const n = await t.loadText(t.catalog.getBuildPath(e));
		const r = JSON.parse(n);
		if (!Array.isArray(r.irradiance) || r.irradiance.length !== 27) throw new Error(`${e}: an environment is nine RGB coefficients, got ${r.irradiance?.length ?? 0} numbers`);
		const i = Yn(this.core_());
		if (!i?.environment_create) throw new Error("this engine build carries no environment_create");
		let a = 0;
		if (r.specular) {
			const n = P(e, r.specular);
			try {
				a = (await t.acquireTexture(n, false)).value.handle;
			} catch (t) {
				c.warn("asset", `${e}: no reflection atlas at '${n}'`, t);
			}
		}
		const o = w(i, (e) => {
			const t = e(108);
			i.HEAPF32.set(Float32Array.from(r.irradiance), t >> 2);
			return i.environment_create(t, a, r.faceSize ?? 0, r.mipCount ?? 0, r.maxRange ?? 0, r.columns ?? 1);
		});
		if (!o) throw new Error(`the engine rejected the environment in ${e}`);
		const s = r.sun;
		if (s && i.environment_setSun) if (s.skyIrradiance?.length === 27 && s.direction?.length === 3 && s.color?.length === 3) w(i, (e) => {
			const t = e(108);
			i.HEAPF32.set(Float32Array.from(s.skyIrradiance), t >> 2);
			i.environment_setSun(o, t, s.direction[0], s.direction[1], s.direction[2], s.color[0], s.color[1], s.color[2]);
		});
		else c.warn("asset", `${e}: a sun needs a direction, a colour and nine sky coefficients`);
		if (r.sky && i.environment_setSky) {
			const n = P(e, r.sky);
			try {
				i.environment_setSky(o, (await t.acquireTexture(n, false)).value.handle);
			} catch (t) {
				c.warn("asset", `${e}: no sky panorama at '${n}'`, t);
			}
		}
		return { handle: o };
	}
	unload(e) {
		this.core_()?.environment_release?.(e.handle);
	}
};
/** Resolve the atlas ref relative to the `.esenv`; rooted refs pass through. */
//#endregion
//#region src/asset/loaders/ProbeVolumeAssetLoader.ts
/**
* Loads `.esprobes` — irradiance solved at a grid of points.
*
* The same nine coefficients an `.esenv` carries, at every probe instead of once:
* an environment is this field held constant. Where the grid stands is NOT here —
* the component's box says that, so one bake can be read at a second placement.
*/
var Lr = class {
	/** Lazy like the environment loader's: the module arrives after construction. */
	constructor(e) {
		this.core_ = e;
		this.type = "probeVolume";
		this.extensions = [".esprobes"];
	}
	async load(e, t) {
		const n = await t.loadText(t.catalog.getBuildPath(e));
		const r = JSON.parse(n);
		const i = r.resolution;
		if (!Array.isArray(i) || i.length !== 3 || i.some((e) => !Number.isInteger(e) || e < 1)) throw new Error(`${e}: a probe volume is three positive probe counts, got ${JSON.stringify(r.resolution)}`);
		const a = i[0] * i[1] * i[2] * 27;
		if (!Array.isArray(r.irradiance) || r.irradiance.length !== a) throw new Error(`${e}: ${i[0]}x${i[1]}x${i[2]} probes want ${a} coefficients, got ${r.irradiance?.length ?? 0}`);
		const o = Yn(this.core_());
		if (!o?.probe_volume_create) throw new Error("this engine build carries no probe_volume_create");
		const s = w(o, (e) => {
			const t = e(a * 4);
			o.HEAPF32.set(Float32Array.from(r.irradiance), t >> 2);
			return o.probe_volume_create(i[0], i[1], i[2], t);
		});
		if (!s) throw new Error(`the engine rejected the probe volume in ${e}`);
		if (r.skyVisibility !== void 0) {
			const t = r.skyVisibility;
			const n = i[0] * i[1] * i[2] * 9;
			if (!Array.isArray(t) || t.length !== n) throw new Error(`${e}: ${i[0]}x${i[1]}x${i[2]} probes want ${n} sky visibility coefficients, got ${Array.isArray(t) ? t.length : 0}`);
			if (!o.probe_volume_setSkyVisibility) throw new Error(`${e} is baked with sky occlusion, which this engine build cannot read`);
			w(o, (e) => {
				const r = e(n * 4);
				o.HEAPF32.set(Float32Array.from(t), r >> 2);
				o.probe_volume_setSkyVisibility(s, r);
			});
		}
		return { handle: s };
	}
	unload(e) {
		this.core_()?.probe_volume_release?.(e.handle);
	}
};
//#endregion
//#region src/gi/meshSdfFormat.ts
function Rr(e) {
	const t = e & 32768 ? -1 : 1, n = e >>> 10 & 31, r = e & 1023;
	if (n === 0) return t * r * 2 ** -24;
	if (n === 31) return t * 65504;
	return t * (1 + r / 1024) * 2 ** (n - 15);
}
/** `.esmeshsdf`: 'ESDF', version 1, dims x3 (u32), cell, origin x3, inflate (f32), then the distances as half floats, x fastest. */
const zr = 1178882885;
const Br = 40;
function Vr(e) {
	const t = new DataView(e.buffer, e.byteOffset, e.byteLength);
	if (t.getUint32(0, true) !== 1178882885) throw new Error("not a mesh distance field");
	if (t.getUint32(4, true) !== 1) throw new Error(`unsupported mesh distance field version ${t.getUint32(4, true)}`);
	const n = [
		t.getUint32(8, true),
		t.getUint32(12, true),
		t.getUint32(16, true)
	];
	const r = t.getFloat32(20, true);
	const i = [
		t.getFloat32(24, true),
		t.getFloat32(28, true),
		t.getFloat32(32, true)
	];
	const a = t.getFloat32(36, true);
	const o = n[0] * n[1] * n[2], s = new Float32Array(o);
	for (let e = 0; e < o; e++) s[e] = Rr(t.getUint16(40 + e * 2, true));
	return {
		dims: n,
		cell: r,
		origin: i,
		distance: s,
		inflate: a
	};
}
/**
* The field's value at a point: trilinear between cell centres inside the grid, and beyond its edge the edge value plus how far the point
* is from the grid (the nearest surface is at least that much further, so a trace may step that far).
*/
function Hr(e, t) {
	const n = [
		0,
		1,
		2
	].map((n) => Math.min(Math.max((t[n] - e.origin[n]) / e.cell - .5, 0), e.dims[n] - 1 - 1e-6));
	const r = n.map(Math.floor), i = n.map((e, t) => e - r[t]);
	const a = Math.hypot(...[
		0,
		1,
		2
	].map((n) => Math.max(e.origin[n] + .5 * e.cell - t[n], t[n] - (e.origin[n] + (e.dims[n] - .5) * e.cell), 0)));
	const o = (t, n, r) => e.distance[t + n * e.dims[0] + r * e.dims[0] * e.dims[1]];
	let s = 0;
	for (let e = 0; e < 8; e++) {
		const t = e & 1, n = e >> 1 & 1, a = e >> 2 & 1;
		const c = (t ? i[0] : 1 - i[0]) * (n ? i[1] : 1 - i[1]) * (a ? i[2] : 1 - i[2]);
		s += c * o(r[0] + t, r[1] + n, r[2] + a);
	}
	return s + a;
}
//#endregion
//#region src/asset/loaders/MeshSdfAssetLoader.ts
/**
* Loads `.esmeshsdf` — the signed distance field baked beside a mesh at import. Plain memory: the dynamic GI composes it into its
* clipmaps, so nothing here belongs to the GPU and unloading has nothing to free.
*/
var Ur = class {
	constructor() {
		this.type = "meshSdf";
		this.extensions = [".esmeshsdf"];
	}
	async load(e, t) {
		const n = new Uint8Array(await t.loadBinary(t.catalog.getBuildPath(e)));
		try {
			return Vr(n);
		} catch (t) {
			throw new Error(`${e}: ${t instanceof Error ? t.message : String(t)}`);
		}
	}
	unload() {}
};
//#endregion
//#region src/gi/cardFormat.ts
const Wr = 65535;
/** Per face: the axis it looks along, the sign of the side it looks from, and the two axes its pixels run over. */
const Gr = [
	{
		axis: 0,
		sign: 1,
		u: 1,
		v: 2
	},
	{
		axis: 0,
		sign: -1,
		u: 1,
		v: 2
	},
	{
		axis: 1,
		sign: 1,
		u: 0,
		v: 2
	},
	{
		axis: 1,
		sign: -1,
		u: 0,
		v: 2
	},
	{
		axis: 2,
		sign: 1,
		u: 0,
		v: 1
	},
	{
		axis: 2,
		sign: -1,
		u: 0,
		v: 1
	}
];
const Kr = 1145262917;
const qr = 40;
function Jr(e) {
	const t = new DataView(e.buffer, e.byteOffset, e.byteLength);
	if (e.byteLength < qr || t.getUint32(0, true) !== 1145262917) throw new Error("not a mesh card file");
	if (t.getUint32(4, true) !== 1) throw new Error(`unsupported mesh card file version ${t.getUint32(4, true)}`);
	const n = (e) => t.getFloat32(e, true);
	const r = [
		n(8),
		n(12),
		n(16)
	], i = [
		n(20),
		n(24),
		n(28)
	];
	const a = n(32), o = n(36);
	let s = qr;
	const c = [];
	for (let n = 0; n < 6; n++) {
		if (s + 4 > e.byteLength) throw new Error("mesh card file is truncated");
		const n = t.getUint16(s, true), r = t.getUint16(s + 2, true);
		s += 4;
		const i = n * r;
		if (s + i * 11 > e.byteLength) throw new Error("mesh card file is truncated");
		const a = new Uint16Array(i);
		for (let e = 0; e < i; e++) a[e] = t.getUint16(s + e * 2, true);
		s += i * 2;
		const o = new Int8Array(e.slice(s, s + i * 3).buffer);
		s += i * 3;
		const l = e.slice(s, s + i * 3);
		s += i * 3;
		const u = e.slice(s, s + i * 3);
		s += i * 3;
		c.push({
			width: n,
			height: r,
			depth: a,
			normal: o,
			albedo: l,
			emissive: u
		});
	}
	return {
		aabbMin: r,
		aabbMax: i,
		cell: a,
		emissiveScale: o,
		cards: c
	};
}
//#endregion
//#region src/asset/loaders/MeshCardsAssetLoader.ts
/**
* Loads `.esmeshcards` — the six axis views of a mesh the dynamic GI's surface cache lights. Plain memory, like the distance field.
*/
var Yr = class {
	constructor() {
		this.type = "meshCards";
		this.extensions = [".esmeshcards"];
	}
	async load(e, t) {
		const n = new Uint8Array(await t.loadBinary(t.catalog.getBuildPath(e)));
		try {
			return Jr(n);
		} catch (t) {
			throw new Error(`${e}: ${t instanceof Error ? t.message : String(t)}`);
		}
	}
	unload() {}
};
//#endregion
//#region src/ui/text/bitmap-font.ts
function Xr(e) {
	const t = {};
	for (const n of e.matchAll(/(\w+)=("([^"]*)"|\S+)/g)) t[n[1]] = n[3] ?? n[2];
	return t;
}
const Z = (e, t = 0) => {
	const n = e === void 0 ? NaN : Number.parseInt(e, 10);
	return Number.isFinite(n) ? n : t;
};
/**
* Read the text form of a BMFont file. Only the first page is kept — a font spread over several pages would
* need one draw per page, and nothing here ships one. Kerning is not applied.
* @throws when there is no `common` line or no page: there is nothing to draw from.
*/
function Zr(e) {
	let t = 0, n = 0, r = 0, i = 0, a = 0, o = "";
	let s = false;
	let c = false;
	const l = /* @__PURE__ */ new Map();
	for (const u of e.split(/\r?\n/)) {
		const e = u.trim();
		if (e.startsWith("info ")) t = Math.abs(Z(Xr(e).size));
		else if (e.startsWith("common ")) {
			const t = Xr(e);
			n = Z(t.lineHeight);
			r = Z(t.base);
			i = Z(t.scaleW);
			a = Z(t.scaleH);
			c = Z(t.alphaChnl, -1) === 2 && Z(t.redChnl, -1) === 0;
			s = true;
		} else if (e.startsWith("page ")) {
			const t = Xr(e);
			if (!o && Z(t.id) === 0) o = t.file ?? "";
		} else if (e.startsWith("char ")) {
			const t = Xr(e);
			if (Z(t.page) !== 0) continue;
			l.set(Z(t.id), {
				x: Z(t.x),
				y: Z(t.y),
				width: Z(t.width),
				height: Z(t.height),
				xoffset: Z(t.xoffset),
				yoffset: Z(t.yoffset),
				xadvance: Z(t.xadvance)
			});
		}
	}
	if (!s || !o || i <= 0 || a <= 0) throw new Error("not a bitmap font: no common line or page");
	return {
		size: t || n,
		lineHeight: n,
		base: r,
		pageWidth: i,
		pageHeight: a,
		page: o,
		outlineInAlpha: c,
		glyphs: l
	};
}
const Qr = /* @__PURE__ */ new Map();
const $r = /* @__PURE__ */ new Map();
/**
* Make a loaded bitmap font usable by `Text`. @p handle is the resource handle the asset loader hands back — what
* `Text.font` holds — and @p texture the page's GL texture id. Re-registering a handle replaces it.
*/
function ei(e, t, n) {
	ti(e);
	const r = `bmfont:${e}`;
	const i = {
		font: t,
		texture: n,
		family: r,
		entries: /* @__PURE__ */ new Map()
	};
	Qr.set(e, i);
	$r.set(r, i);
}
function ti(e) {
	const t = Qr.get(e);
	if (!t) return;
	Qr.delete(e);
	$r.delete(t.family);
}
/** The family name `Text` lays out with for this font handle, or null when it is not a registered bitmap font. */
function ni(e) {
	return Qr.get(e)?.family ?? null;
}
/**
* Where a family's first baseline sits below the top of its line, as a fraction of the font size: a bitmap font says
* (`base` over the size it was drawn at — a glyph's top is `yoffset` below the line top and its baseline `base`), any
* other font gets @p fallback.
*/
function ri(e, t) {
	const n = $r.get(e)?.font;
	return n && n.size > 0 && n.base > 0 ? n.base / n.size : t;
}
/** The font a family names, or null when the family is an ordinary (outline) one. */
function ii(e) {
	return $r.get(e)?.font ?? null;
}
/**
* Where a glyph is and how it advances, in the font's pixels — the shape the glyph atlas hands to the layout. A
* character the font does not draw is null, as it is for a system font with no glyph for it.
*/
function ai(e, t) {
	const n = $r.get(e);
	if (!n) return null;
	const r = n.entries.get(t);
	if (r !== void 0) return r;
	const i = n.font.glyphs.get(t);
	let a = null;
	if (i) {
		const { pageWidth: e, pageHeight: t, base: r } = n.font;
		a = {
			pageId: n.texture,
			u0: i.x / e,
			v0: i.y / t,
			u1: (i.x + i.width) / e,
			v1: (i.y + i.height) / t,
			width: i.width,
			height: i.height,
			advance: i.xadvance,
			bearingX: i.xoffset,
			bearingY: r - i.yoffset
		};
	}
	n.entries.set(t, a);
	return a;
}
//#endregion
//#region src/ui/text/font-registry.ts
/**
* @file    ui/text/font-registry.ts
* @brief   Project fonts: the handle ↔ family-name map for shipped font files.
*
* The whole text pipeline — layout, the glyph atlas cache key, every rasterizer
* — speaks ONE language for "which typeface": a family name string. A system
* font already has one. A font the game ships does not, until the platform's
* text stack is told about it (browser `FontFace`, the native host's font
* table), and that registration needs a name to file it under.
*
* This module owns that name. The font asset loader mints one per font asset,
* registers the bytes with the platform under it, and gets back a handle to
* store in `Text.font`; the text plugin turns that handle back into the family
* it passes down the pipeline. Nothing downstream of the plugin changes — which
* is the point: shipped fonts are not a second text path, just another way to
* arrive at a family name.
*
* Handles are allocated from a HIGH base so they can never be confused with the
* C++ bitmap-font handles `BitmapText.font` holds: both live in the same
* `font`-typed asset slot vocabulary, and a `.fnt` assigned to `Text.font`
* must miss this table (falling back to `fontFamily`) rather than alias a
* project font that happens to share a small integer.
*/
/** Distinct from any ResourceManager handle (those count up from small ints). */
const oi = 1073741824;
let si = oi;
let ci = 0;
/** Runtime handle → owned path and platform family. */
const li = /* @__PURE__ */ new Map();
/** Asset path → live handles; legacy path registration reuses the first. */
const ui = /* @__PURE__ */ new Map();
/** A CSS-safe, collision-free family name for a font asset path. */
function di(e) {
	const t = (e.split("/").pop() ?? e).replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "font";
	let n = "";
	for (let t = 0; t < e.length; t++) {
		const r = e.charCodeAt(t);
		n += r < 128 ? r.toString(16).padStart(2, "0") : `z${r.toString(16).padStart(4, "0")}`;
	}
	return `es-${t}-${n || "0"}`;
}
/** @internal A platform registration must not overwrite a still-owned font face. */
function fi(e) {
	return `${di(e)}-load${(++ci).toString(36)}`;
}
/** @internal Each prepared asset era owns a distinct runtime handle. */
function pi(e, t) {
	const n = si++;
	li.set(n, {
		path: e,
		family: t
	});
	let r = ui.get(e);
	if (!r) ui.set(e, r = /* @__PURE__ */ new Set());
	r.add(n);
	return n;
}
/** The family name for a handle, or null when it is not a project font. */
function mi(e) {
	return li.get(e)?.family ?? null;
}
/** @internal Release only the registration owned by this font result. */
function hi(e) {
	const t = li.get(e);
	if (!t) return;
	li.delete(e);
	const n = ui.get(t.path);
	n?.delete(e);
	if (n?.size === 0) ui.delete(t.path);
}
/**
* The family a `Text` should rasterize with: its project font when `font` names
* one, else the authored `fontFamily`, else the project's default family. The
* single place that precedence lives — an empty `fontFamily` is how a Text says
* "whatever this project uses", which is what makes that project setting real.
*/
function gi(e, t) {
	return (e ? mi(e) ?? ni(e) : null) ?? (t || Ue.defaultFontFamily);
}
//#endregion
//#region src/asset/loaders/FontAssetLoader.ts
/** Outline fonts — rasterized per glyph by the text stack, not pre-baked pages. */
const _i = /\.(ttf|otf|woff2?)$/i;
var vi = class {
	constructor() {
		this.type = "font";
		this.extensions = [
			".bmfont",
			".fnt",
			".ttf",
			".otf",
			".woff",
			".woff2"
		];
	}
	async load(e, t) {
		if (_i.test(e)) return this.loadOutlineFont(e, t);
		const n = k(e);
		if (n?.editorType === "bitmap-font" && n.contentType === "json") return this.loadBmfontJson(e, t);
		return this.loadFntFile(e, t);
	}
	unload(e) {
		if (e.family !== void 0 || e.path !== void 0 || mi(e.handle) !== null) {
			hi(e.handle);
			return;
		}
		ti(e.handle);
		E().releaseBitmapFont(e.handle);
	}
	/**
	* Hand the file to the platform's text stack under a minted family name, so
	* `Text` can name a shipped font exactly as it names a system one. A host
	* with no `registerFont` (a headless realm) still resolves and returns a
	* handle — the family simply will not rasterize, and Text falls back.
	*/
	async loadOutlineFont(e, t) {
		const n = await t.loadBinary(t.catalog.getBuildPath(e));
		const r = fi(e);
		await v().registerFont?.(r, n);
		return {
			handle: pi(e, r),
			family: r,
			path: e
		};
	}
	async loadBmfontJson(e, t) {
		const n = t.catalog.getBuildPath(e);
		const r = await t.loadText(n);
		const i = JSON.parse(r);
		const a = i.type === "label-atlas" ? i.generatedFnt : i.fntFile;
		if (!a) throw new Error(`Invalid bmfont asset: no fnt file specified in ${e}`);
		const o = e.substring(0, e.lastIndexOf("/"));
		const s = o ? `${o}/${a}` : a;
		return this.loadFntFile(s, t);
	}
	async loadFntFile(e, t) {
		const n = t.catalog.getBuildPath(e);
		const r = await t.loadText(n);
		const i = r.match(/file="([^"]+)"/);
		if (!i) throw new Error(`No page texture found in .fnt file: ${e}`);
		const a = P(e, i[1]);
		const o = await t.loadTexture(a, false);
		const s = E();
		const l = s.loadBitmapFont(r, o.handle, o.width, o.height);
		try {
			ei(l, Zr(r), s.getTextureGLId(o.handle));
		} catch (t) {
			c.warn("text", `${e}: not usable by Text as a bitmap font — ${t instanceof Error ? t.message : String(t)}`);
		}
		return { handle: l };
	}
};
//#endregion
//#region src/asset/loaders/AudioAssetLoader.ts
var yi = class {
	/** Same lazy audio accessor Assets uses — needed by unload/invalidate,
	*  which have no LoadContext. Defaults to "no audio" for bare setups. */
	constructor(e = () => null) {
		this.getAudio_ = e;
		this.releases_ = /* @__PURE__ */ new WeakMap();
		this.type = "audio";
		this.extensions = [
			".mp3",
			".wav",
			".ogg",
			".m4a",
			".aac",
			".flac",
			".webm"
		];
	}
	async load(e, t) {
		const n = t.getAudio();
		if (!n) {
			c.warn("asset", `AudioAssetLoader: no Audio resource for "${e}" (AudioPlugin not installed?)`);
			return { bufferId: e };
		}
		if (n.retainBuffer(e)) return this.ownedResult_(n, e);
		if (n.delivery === "url") await n.preload(e);
		else {
			const r = t.catalog.getBuildPath(e);
			await n.preloadFromData(e, await t.loadBinary(r));
		}
		n.retainBuffer(e);
		return this.ownedResult_(n, e);
	}
	ownedResult_(e, t) {
		const n = { bufferId: t };
		const r = e.getBufferHandle(t);
		if (r) this.releases_.set(n, () => {
			if (e.getBufferHandle(t) === r) e.releaseBuffer(t);
		});
		return n;
	}
	unload(e) {
		const t = this.releases_.get(e);
		this.releases_.delete(e);
		t?.();
	}
	invalidate(e) {
		return this.getAudio_()?.invalidateBuffer(e) ?? false;
	}
};
//#endregion
//#region src/render/uvRect.ts
/**
* The UV window of a pixel rectangle in a @p textureWidth x @p textureHeight
* picture, the rectangle's @p y measured DOWN from the top edge as image tools
* measure it. Spread the result into a `Sprite` to show exactly that cell.
*/
function bi(e, t, n) {
	return {
		uvOffset: {
			x: e.x / t,
			y: 1 - (e.y + e.height) / n
		},
		uvScale: {
			x: e.width / t,
			y: e.height / n
		}
	};
}
//#endregion
//#region src/asset/sheetGrid.ts
/**
* @file    sheetGrid.ts
* @brief   How a sprite sheet is cut into cells — the one author for that stride.
*
* Three surfaces cut a sheet the same way and each had written the arithmetic
* down: the flipbook's `.esanim`, the tileset's atlas, and the particle emitter's
* `spriteColumns`/`spriteRows`. The stride is `margin + i * (cell + spacing)` in
* all of them, and it is the kind of expression that is wrong by one for a long
* time before anybody notices, because a sheet with no margin and no spacing —
* which is most of them — hides every mistake in both terms.
*
* So it lives here, named for what it is rather than for whoever asked first.
* `.esanim` keeps its own spellings as one-line delegates: this is the author,
* those are the aliases.
*
* A cell is addressed row-major from 0, the way every one of those surfaces
* already addresses it.
*/
/** Columns the grid fits across the page. At least 1, so cell 0 always resolves. */
function xi(e) {
	const t = e.cellWidth + e.spacing;
	return t > 0 ? Math.max(1, Math.floor((e.pageWidth - e.margin + e.spacing) / t)) : 1;
}
/** Rows the grid fits down the page. At least 1, for the same reason. */
function Si(e) {
	const t = e.cellHeight + e.spacing;
	return t > 0 ? Math.max(1, Math.floor((e.pageHeight - e.margin + e.spacing) / t)) : 1;
}
/** How many cells the grid holds — what a cell index is addressed against. */
function Ci(e) {
	return xi(e) * Si(e);
}
/** Pixel rect of a cell, clamped into the valid range so no index escapes the page. */
function wi(e, t) {
	const n = xi(e);
	const r = Math.min(Math.max(0, Math.floor(t)), Ci(e) - 1);
	const i = r % n;
	const a = Math.floor(r / n);
	return {
		x: e.margin + i * (e.cellWidth + e.spacing),
		y: e.margin + a * (e.cellHeight + e.spacing),
		width: e.cellWidth,
		height: e.cellHeight
	};
}
/**
* UV window of a cell — exactly what `Sprite.uvOffset` / `Sprite.uvScale` take.
*
* Y is flipped: a sheet is addressed from its top-left, UV space runs from the
* bottom, so cell 0 carries the HIGHEST v. That is the one thing here that reads
* as wrong in an inspector until you remember which way an image is stored.
*/
function Ti(e, t) {
	return bi(wi(e, t), e.pageWidth, e.pageHeight);
}
//#endregion
//#region src/animation/AnimClipLoader.ts
const Ei = "1.5";
/** The anchor a clip that authors pivots falls back to — the `Sprite.pivot` default. */
const Di = {
	x: .5,
	y: .5
};
/** @see sheetCols */
function Oi(e) {
	return xi(e);
}
/** @see sheetRows */
function ki(e) {
	return Si(e);
}
/** @see sheetCellRect */
function Ai(e, t) {
	return wi(e, t);
}
/** @see sheetCellUv */
function ji(e, t) {
	return Ti(e, t);
}
/**
* Does this clip author anchors at all? True as soon as the clip OR any single
* frame declares one. All-or-nothing on purpose: a clip that anchored only some
* frames would leave the last override standing on the plain ones — the same
* staleness the UV window has to reset away.
*
* An offset counts: it IS an anchor, written in units instead of fractions.
*/
function Mi(e) {
	return e.pivot !== void 0 || e.frames.some((e) => e.pivot !== void 0 || e.offset !== void 0);
}
/**
* Does this clip own `Sprite.size`? The mode says so outright, an authored frame
* size says so by existing — and so does an offset, which needs the size it is a
* fraction of. Left to the entity, one clip on two entities would shift by two
* different amounts, the very drift offsets exist to remove.
*/
function Ni(e) {
	return e.frameSizing === "frame" || e.frames.some((e) => e.size !== void 0 || e.offset !== void 0);
}
/**
* The size a frame renders at: its own override, else its natural size (the
* caller's — a sheet cell, or the texture's pixels) — or `null` when the clip
* does not own size, which leaves `Sprite.size` as the entity authored it.
*/
function Pi(e, t, n) {
	if (t.size) return {
		x: t.size.x,
		y: t.size.y
	};
	if (!Ni(e)) return null;
	return n ? {
		x: n.x,
		y: n.y
	} : null;
}
/**
* The anchor a frame actually renders with: its own override, else the clip
* default, else centered — or `null` when the clip authors no anchors, which is
* the signal to leave `Sprite.pivot` exactly as the entity set it.
*
* The one place this resolution lives: the runtime bake, the edit-mode viewport
* projection, and the editor's drag handle all read it here.
*/
function Fi(e, t, n) {
	const r = t.pivot ?? (Mi(e) ? e.pivot ?? Di : null);
	if (!t.offset) return r ? {
		x: r.x,
		y: r.y
	} : null;
	if (!n || n.x <= 0 || n.y <= 0) return r ? {
		x: r.x,
		y: r.y
	} : null;
	const i = r ?? Di;
	return {
		x: i.x - t.offset.x / n.x,
		y: i.y - t.offset.y / n.y
	};
}
const Ii = 12;
function Li(e, t) {
	return typeof e === "number" && Number.isInteger(e) && e > 0 ? e : t;
}
function Ri(e, t) {
	return typeof e === "number" && Number.isFinite(e) && e >= 0 ? e : t;
}
/** A `{x,y}` anchor, or undefined when the field is missing or not a finite pair.
*  Deliberately unclamped: an anchor outside 0–1 is legal on `Sprite.pivot` too. */
function zi(e) {
	const t = e;
	if (!t || typeof t.x !== "number" || typeof t.y !== "number") return void 0;
	if (!Number.isFinite(t.x) || !Number.isFinite(t.y)) return void 0;
	return {
		x: t.x,
		y: t.y
	};
}
/** A `{x,y}` in clip units, or undefined. `positive` rejects a zero/negative size,
*  which would divide an offset by nothing and blank the sprite. */
function Bi(e, t) {
	const n = e;
	if (!n || typeof n.x !== "number" || typeof n.y !== "number") return void 0;
	if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) return void 0;
	if (t && (n.x <= 0 || n.y <= 0)) return void 0;
	return {
		x: n.x,
		y: n.y
	};
}
/** Parse arbitrary JSON into a normalized {@link AnimClipAssetData} (tolerant of missing fields). */
function Vi(e) {
	const t = e;
	let n;
	const r = t?.sheet;
	if (r && typeof r.texture === "string" && r.texture) n = {
		texture: r.texture,
		cellWidth: Li(r.cellWidth, 32),
		cellHeight: Li(r.cellHeight, 32),
		margin: Ri(r.margin, 0),
		spacing: Ri(r.spacing, 0),
		pageWidth: Li(r.pageWidth, 1),
		pageHeight: Li(r.pageHeight, 1)
	};
	const i = [];
	for (const e of Array.isArray(t?.frames) ? t.frames : []) {
		if (!e) continue;
		const t = typeof e.duration === "number" && e.duration > 0 ? e.duration : void 0;
		const r = zi(e.pivot);
		const a = Bi(e.size, true);
		const o = Bi(e.offset, false);
		if (n && typeof e.cell === "number" && Number.isInteger(e.cell) && e.cell >= 0) i.push({
			cell: e.cell,
			...t !== void 0 ? { duration: t } : {},
			...r ? { pivot: r } : {},
			...a ? { size: a } : {},
			...o ? { offset: o } : {}
		});
		else if (typeof e.texture === "string" && e.texture) {
			const n = { texture: e.texture };
			if (t !== void 0) n.duration = t;
			if (r) n.pivot = r;
			if (a) n.size = a;
			if (o) n.offset = o;
			const s = e.atlasFrame;
			if (s && [
				s.x,
				s.y,
				s.width,
				s.height,
				s.pageWidth,
				s.pageHeight
			].every((e) => typeof e === "number" && Number.isFinite(e))) n.atlasFrame = {
				x: s.x,
				y: s.y,
				width: s.width,
				height: s.height,
				pageWidth: s.pageWidth,
				pageHeight: s.pageHeight
			};
			i.push(n);
		}
	}
	const a = [];
	for (const e of Array.isArray(t?.events) ? t.events : []) if (e && typeof e.name === "string" && e.name && typeof e.frame === "number" && Number.isInteger(e.frame) && e.frame >= 0) a.push({
		frame: e.frame,
		name: e.name,
		...e.data !== void 0 ? { data: e.data } : {}
	});
	const o = zi(t?.pivot);
	const s = t?.frameSizing === "frame" ? "frame" : t?.frameSizing === "entity" ? "entity" : void 0;
	return {
		version: typeof t?.version === "string" ? t.version : "1.5",
		type: "animation-clip",
		fps: Li(t?.fps, Ii),
		loop: typeof t?.loop === "boolean" ? t.loop : true,
		...o ? { pivot: o } : {},
		...s ? { frameSizing: s } : {},
		...n ? { sheet: n } : {},
		frames: i,
		...a.length ? { events: a } : {}
	};
}
/**
* Serialize an {@link AnimClipAssetData} to a plain JSON-ready object (drops
* empty/undefined). Stamps the CURRENT format version: whatever the file said when
* it was read, this writer produced what is on disk now — a clip that gained 1.4
* anchors must not keep claiming 1.3.
*/
function Hi(e) {
	return {
		version: "1.5",
		type: "animation-clip",
		fps: e.fps ?? Ii,
		loop: e.loop ?? true,
		...e.pivot ? { pivot: { ...e.pivot } } : {},
		...e.frameSizing ? { frameSizing: e.frameSizing } : {},
		...e.sheet ? { sheet: { ...e.sheet } } : {},
		frames: e.frames.map((e) => ({
			...e,
			...e.pivot ? { pivot: { ...e.pivot } } : {},
			...e.size ? { size: { ...e.size } } : {},
			...e.offset ? { offset: { ...e.offset } } : {}
		})),
		...e.events && e.events.length ? { events: e.events.map((e) => ({ ...e })) } : {}
	};
}
/** A fresh sheet-sliced clip over a texture (no frames yet). */
function Ui(e, t, n, r, i) {
	return {
		version: "1.5",
		type: "animation-clip",
		fps: Ii,
		loop: true,
		sheet: {
			texture: e,
			cellWidth: t,
			cellHeight: n,
			margin: 0,
			spacing: 0,
			pageWidth: r,
			pageHeight: i
		},
		frames: []
	};
}
/**
* A fresh clip over a sequence of per-frame textures — the shape a flipbook of
* separate images is. Owns size from the start: images drawn at one shared size
* is the thing an image sequence is authored to avoid.
*/
function Wi(e) {
	return {
		version: "1.5",
		type: "animation-clip",
		fps: Ii,
		loop: true,
		frameSizing: "frame",
		frames: e.filter((e) => !!e).map((e) => ({ texture: e }))
	};
}
function Gi(e) {
	const t = /* @__PURE__ */ new Set();
	if (e.sheet?.texture) t.add(e.sheet.texture);
	for (const n of e.frames) if (n.texture) t.add(n.texture);
	return Array.from(t);
}
function Ki(e, t, n) {
	return bi(e, t, n);
}
/**
* Bake a parsed clip into what the runtime plays. @p textureSizes carries each
* frame texture's pixel size, which is the natural size of a per-texture frame —
* without it a clip that owns size has nothing to fall back to and says so.
*/
function qi(e, t, n, r) {
	const i = t.sheet;
	const a = i ? Oi(i) * ki(i) : 0;
	const o = Ni(t);
	let s = 0;
	const l = {
		name: e,
		fps: t.fps ?? Ii,
		loop: t.loop ?? true,
		...t.events?.length ? { events: t.events.map((e) => ({
			frame: e.frame,
			name: e.name,
			data: e.data
		})) } : {},
		frames: t.frames.map((l) => {
			const u = Pi(t, l, i && l.cell !== void 0 ? {
				x: i.cellWidth,
				y: i.cellHeight
			} : r?.get(l.texture ?? ""));
			if (o && !u) s++;
			const d = Fi(t, l, u);
			if (i && l.cell !== void 0) {
				if (l.cell >= a) c.warn("asset", `${e}: frame cell ${l.cell} outside the ${a}-cell sheet grid; clamped`);
				return {
					texture: n.get(i.texture) ?? 0,
					duration: l.duration,
					...d ? { pivot: d } : {},
					...u ? { size: u } : {},
					...ji(i, l.cell)
				};
			}
			const f = {
				texture: n.get(l.texture ?? "") ?? 0,
				duration: l.duration,
				...d ? { pivot: d } : {},
				...u ? { size: u } : {}
			};
			if (l.atlasFrame) {
				const e = l.atlasFrame;
				Object.assign(f, Ki(e, e.pageWidth, e.pageHeight));
			}
			return f;
		})
	};
	if (s > 0) c.warn("asset", `${e}: ${s} frame(s) own their size but no natural size was available; they draw at the entity's`);
	return l;
}
//#endregion
//#region src/asset/loaders/AnimClipAssetLoader.ts
var Ji = class {
	constructor() {
		this.type = "anim-clip";
		this.extensions = [".esanim"];
		this.registry = { prepare: async (e, t) => {
			const n = await t.loadText(t.catalog.getBuildPath(e));
			const r = Vi(JSON.parse(n));
			const i = /* @__PURE__ */ new Map();
			const a = /* @__PURE__ */ new Map();
			for (const e of Gi(r)) try {
				const n = await t.acquireTexture(e, true);
				i.set(e, n.value.handle);
				if (n.value.width > 0 && n.value.height > 0) a.set(e, {
					x: n.value.width,
					y: n.value.height
				});
			} catch (t) {
				c.warn("asset", `Failed to load texture: ${e}`, t);
				i.set(e, 0);
			}
			return {
				published: qi(e, r, i, a),
				value: { clipId: e }
			};
		} };
	}
};
//#endregion
//#region src/asset/loaders/PrefabAssetLoader.ts
var Yi = class {
	constructor() {
		this.type = "prefab";
		this.extensions = [".esprefab"];
	}
	async load(e, t) {
		const n = t.catalog.getBuildPath(e);
		const r = await t.loadText(n);
		const i = JSON.parse(r);
		const { data: a, migrated: o, fromVersion: s, toVersion: l } = ke(i);
		if (o) c.info("prefab", `migrated "${e}" ${s} → ${l} (legacy numeric ids → strings). Re-save to persist.`);
		return { data: a };
	}
	unload(e) {}
};
//#endregion
//#region src/prefab/preparedPrefab.ts
/** @internal The shared bake, with acquisition supplied by its owning era. */
async function Xi(e, t, n = []) {
	const r = await e.loadPrefab(t);
	const i = ke(r.data).data;
	const a = /* @__PURE__ */ new Map();
	await Ne(i, async (t) => ke((await e.loadPrefab(t)).data).data, a);
	let o = 0;
	const s = {
		allocateId: () => o++,
		loadPrefab: (e) => a.get(e) ?? null,
		visited: /* @__PURE__ */ new Set()
	};
	const { entities: c, rootId: l } = Ae(i, [...n], s);
	const u = {
		version: 4,
		name: i.name,
		entities: c.map((e) => ({
			id: e.id,
			name: e.name,
			parent: e.parent,
			children: e.children,
			components: e.components,
			visible: e.visible
		}))
	};
	const d = await e.preloadSceneAssets(u);
	const f = Pe(u, d, e.entityScopes, e.resolveRef?.bind(e));
	e.resolveSceneAssetPaths(u, d);
	return {
		ref: t,
		scene: u,
		rootId: l,
		missing: d.missing.map((e) => e.ref),
		release: () => d.scope.releaseAll(),
		retainSpawnAssets: f,
		trackSpawnReferences: (t) => e.trackSceneAssetReferences?.(u, t)
	};
}
/**
* Spawn a prepared prefab. Synchronous: everything it names is already loaded
* and its handles are already in the data, so this is a clone and a spawn.
*/
function Zi(e, t, n) {
	const r = t.retainSpawnAssets?.();
	let a;
	try {
		a = Ie(e, t.scene);
		r?.attach(e, a);
		t.trackSpawnReferences?.(a);
		const o = a.get(t.rootId);
		if (n?.parent !== void 0 && !e.trySetParent(o, n.parent)) throw new Error(`Prepared prefab "${t.scene.name}" could not attach to parent ${n.parent}`);
		if (n?.position) {
			const t = e.get(o, i);
			t.position = {
				...t.position,
				...n.position
			};
			e.set(o, i, t);
		}
		return {
			root: o,
			entities: a
		};
	} catch (t) {
		if (a) {
			for (const t of a.values()) if (e.valid(t)) e.despawn(t);
		}
		throw t;
	} finally {
		r?.release();
	}
}
//#endregion
//#region src/i18n/pseudo-localization.ts
const Qi = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const $i = "áƀçďéƒğĥíĵķľṁñóṕɋŕšţúṽŵẋýžÁƁÇĎÉƑĞĤÍĴĶĽṀÑÓṔɊŔŠŢÚṼŴẊÝŽ";
/** Length stress preview preserving placeholders, rich-text tags and newlines. @experimental */
function ea(e, t = {}) {
	const n = Math.min(3, Math.max(0, Number.isFinite(t.expansion ?? .35) ? t.expansion ?? .35 : .35));
	return e.split("\n").map((e) => {
		if (!e) return e;
		let r = 0;
		return `⟦${e.split(/(\{\w+\}|<[^>]*>|\[[^\]]*\])/g).map((e, n) => {
			if (n % 2) return e;
			r += [...e].length;
			return t.accents === false ? e : e.replace(/[a-z]/gi, (e) => $i[Qi.indexOf(e)]);
		}).join("")}${"~".repeat(Math.ceil(r * n))}⟧`;
	}).join("\n");
}
//#endregion
//#region src/i18n/Localization.ts
/**
* @file    Localization.ts
* @brief   String localization (pure TypeScript). A per-App catalog registry +
*          `t(key, params)` with `{placeholder}` interpolation and pluggable
*          plural rules. Deliberately free of `Intl` so it behaves identically
*          on web and WeChat (which lacks full Intl); supply a PluralSelector
*          per locale for languages whose rules differ from the default.
*/
/** Default (English-like) rule: exactly 1 → `one`, everything else → `other`.
*  `zero` is honored separately by selectPluralForm when count is 0. */
const ta = (e) => e === 1 ? "one" : "other";
/** Replace `{name}` placeholders from `params`; unknown placeholders are left
*  intact so a missing binding is visible rather than silently blank. Pure. */
function na(e, t) {
	if (!t) return e;
	return e.replace(/\{(\w+)\}/g, (e, n) => Object.prototype.hasOwnProperty.call(t, n) ? String(t[n]) : e);
}
/** Pick a plural form: explicit `zero` when count is 0, else the selector's
*  category, falling back to `other`. Pure. */
function ra(e, t, n) {
	if (t === 0 && e.zero !== void 0) return e.zero;
	return e[n(t)] ?? e.other;
}
/**
* Per-App localization service: catalogs keyed by locale, an active locale + a
* fallback, and `t()` resolution (active → fallback → the key itself). Published
* as the {@link Localization} resource; read it as `app.getResource(Localization)`.
*/
var ia = class {
	constructor(e = "en", t = "en") {
		this.catalogs = /* @__PURE__ */ new Map();
		this.selectors = /* @__PURE__ */ new Map();
		this.pseudo_ = null;
		this.plainCache_ = /* @__PURE__ */ new Map();
		this.locale_ = e;
		this.fallback_ = t;
	}
	/** Merge `entries` into a locale's catalog (later calls override keys). */
	addCatalog(e, t) {
		this.plainCache_.clear();
		let n = this.catalogs.get(e);
		if (!n) {
			n = /* @__PURE__ */ new Map();
			this.catalogs.set(e, n);
		}
		for (const e of Object.keys(t)) n.set(e, t[e]);
	}
	setLocale(e) {
		this.locale_ = e;
		this.plainCache_.clear();
	}
	get locale() {
		return this.locale_;
	}
	setFallbackLocale(e) {
		this.fallback_ = e;
		this.plainCache_.clear();
	}
	get fallbackLocale() {
		return this.fallback_;
	}
	/** Opt-in length stress preview. Pass null to restore ordinary translation. */
	setPseudoLocalization(e) {
		this.plainCache_.clear();
		this.pseudo_ = e ? { ...e } : null;
	}
	/** Override the plural rule for a locale (e.g. languages with few/many). */
	setPluralSelector(e, t) {
		this.selectors.set(e, t);
	}
	/** Locales that have a catalog, in insertion order. */
	availableLocales() {
		return [...this.catalogs.keys()];
	}
	/** True if the key resolves in the active locale or the fallback. */
	has(e) {
		return this.lookup_(e) !== void 0;
	}
	/**
	* Translate `key`, interpolating `{params}`. A pluralized entry selects a
	* form from `params.count` (default 0). Unknown keys return the key itself
	* (a visible, greppable fallback) rather than throwing.
	*/
	t(e, t) {
		if (t === void 0) {
			const t = this.plainCache_.get(e);
			if (t !== void 0) return t;
		}
		const n = this.lookup_(e);
		if (n === void 0) return e;
		if (typeof n === "string") {
			const r = this.translate_(n, t);
			if (t === void 0) {
				if (this.plainCache_.size >= 256) this.plainCache_.delete(this.plainCache_.keys().next().value);
				this.plainCache_.set(e, r);
			}
			return r;
		}
		const r = typeof t?.count === "number" ? t.count : 0;
		const i = this.selectors.get(this.locale_) ?? ta;
		return this.translate_(ra(n, r, i), t);
	}
	translate_(e, t) {
		return na(this.pseudo_ ? ea(e, this.pseudo_) : e, t);
	}
	lookup_(e) {
		return this.catalogs.get(this.locale_)?.get(e) ?? this.catalogs.get(this.fallback_)?.get(e);
	}
};
/**
* Per-App localization resource, published by `LocalizationPlugin`. Read as
* `app.getResource(Localization)`.
*/
const aa = s(null, "Localization");
const oa = 1;
/**
* Pick the best available locale for a platform tag: exact match first, else
* the first locale sharing the primary language ('zh-Hans-CN' → 'zh-CN'),
* else null — the caller keeps its current locale. Pure.
*/
function sa(e, t) {
	if (t.includes(e)) return e;
	const n = e.split("-")[0].toLowerCase();
	return t.find((e) => e.split("-")[0].toLowerCase() === n) ?? null;
}
/**
* Parse + validate `.eslocale` text. Fail-loud: a malformed table names the
* offending file and field instead of silently registering nothing. Pure.
*/
function ca(e, t) {
	let n;
	try {
		n = JSON.parse(e);
	} catch (e) {
		throw new Error(`${t}: not valid JSON — ${e instanceof Error ? e.message : String(e)}`);
	}
	const r = n;
	if (typeof r !== "object" || r === null) throw new Error(`${t}: expected an object { version, locale, entries }`);
	if (r.version !== void 0 && r.version !== oa) throw new Error(`${t}: unsupported locale-table version ${String(r.version)} (expected ${oa})`);
	if (typeof r.locale !== "string" || r.locale.length === 0) throw new Error(`${t}: 'locale' must be a non-empty string (e.g. "en", "zh-CN")`);
	if (typeof r.entries !== "object" || r.entries === null || Array.isArray(r.entries)) throw new Error(`${t}: 'entries' must be an object of key → string | plural forms`);
	for (const [e, n] of Object.entries(r.entries)) {
		if (typeof n === "string") continue;
		if (typeof n === "object" && n !== null && typeof n.other === "string") {
			let r = null;
			for (const [e, t] of Object.entries(n)) if (typeof t !== "string") {
				r = e;
				break;
			}
			if (r === null) continue;
			throw new Error(`${t}: entry '${e}' plural form '${r}' must be a string`);
		}
		throw new Error(`${t}: entry '${e}' must be a string or plural forms with an 'other' catch-all`);
	}
	return {
		version: oa,
		locale: r.locale,
		entries: r.entries
	};
}
//#endregion
//#region src/asset/loaders/LocaleAssetLoader.ts
var la = class {
	constructor() {
		this.type = "locale";
		this.extensions = [".eslocale"];
	}
	async load(e, t) {
		const n = t.getLocalization();
		if (!n) throw new Error(`${e}: no Localization resource — add localizationPlugin to the app before loading locale tables`);
		const r = t.catalog.getBuildPath(e);
		const i = await t.loadText(r);
		const a = ca(i, e);
		n.addCatalog(a.locale, a.entries);
		return {
			locale: a.locale,
			keyCount: Object.keys(a.entries).length
		};
	}
	unload() {}
};
//#endregion
//#region src/asset/loaders/JsonAssetLoader.ts
var ua = class {
	constructor() {
		this.type = "json";
		this.extensions = [".json"];
	}
	async load(e, t) {
		const n = t.catalog.getBuildPath(e);
		const r = await t.loadText(n);
		try {
			return { data: JSON.parse(r) };
		} catch (t) {
			throw new Error(`${e}: not valid JSON — ${t instanceof Error ? t.message : String(t)}`);
		}
	}
	unload() {}
};
//#endregion
//#region src/audio/SpatialAudio.ts
let da = /* @__PURE__ */ function(e) {
	e[e["Linear"] = 0] = "Linear";
	e[e["Inverse"] = 1] = "Inverse";
	e[e["Exponential"] = 2] = "Exponential";
	return e;
}({});
const fa = {
	model: 1,
	refDistance: 100,
	maxDistance: 1e3,
	rolloff: 1
};
function pa(e, t = fa) {
	const { model: n, refDistance: r, maxDistance: i, rolloff: a } = t;
	const o = Math.max(e, .001);
	let s;
	switch (n) {
		case 0: {
			const e = i - r;
			if (e <= 0) return 1;
			s = 1 - (Math.min(Math.max(o, r), i) - r) / e;
			break;
		}
		case 1:
			s = r / Math.max(o, r);
			break;
		case 2:
			s = Math.pow(Math.max(o, r) / r, -a);
			break;
		default: return 1;
	}
	return Math.max(0, Math.min(1, s));
}
/** How far apart two points are, in the three dimensions a scene has. */
function ma(e, t) {
	const n = e.x - t.x;
	const r = e.y - t.y;
	const i = e.z - t.z;
	return Math.sqrt(n * n + r * r + i * i);
}
/**
* Stereo pan for a source heard by a listener whose own right points along
* `right`: how far along that right the source sits, over the audible radius.
* Against the LISTENER'S right, not world +X — a listener that has turned hears
* the world turn with it, and an unturned one's right IS world +X.
*/
function ha(e, t, n, r) {
	const i = (e.x - t.x) * n.x + (e.y - t.y) * n.y + (e.z - t.z) * n.z;
	return Math.max(-1, Math.min(1, i / Math.max(r, .001)));
}
//#endregion
//#region src/audio/SoundEvent.ts
function ga(e, t) {
	if (!e || typeof e !== "object" || Array.isArray(e)) throw new Error(`${t}: expected an object`);
	return e;
}
function Q(e, t, n, r) {
	if (e === void 0 && r !== void 0) return r;
	if (typeof e !== "number" || !Number.isFinite(e) || e < n) throw new Error(`${t}: expected a finite number >= ${n}`);
	return e;
}
function _a(e, t, n) {
	if (e === void 0) return [1, 1];
	if (!Array.isArray(e) || e.length !== 2) throw new Error(`${t}: expected [min, max]`);
	const r = Q(e[0], `${t}[0]`, 0), i = Q(e[1], `${t}[1]`, r);
	if (n && r <= 0) throw new Error(`${t}: playback rate must be positive`);
	return [r, i];
}
/** Validates the authored document with slot-specific errors; never drops a broken clip. @beta */
function va(e) {
	const t = ga(e, "soundEvent");
	if (t.version !== 1) throw new Error("soundEvent.version: expected 1");
	if (!Array.isArray(t.clips)) throw new Error("soundEvent.clips: expected an array");
	const n = t.clips.map((e, t) => {
		const n = `soundEvent.clips[${t}]`, r = ga(e, n);
		if (typeof r.clip !== "string" || !r.clip.trim()) throw new Error(`${n}.clip: expected an audio reference`);
		return {
			clip: r.clip,
			weight: Q(r.weight, `${n}.weight`, 0, 1)
		};
	});
	const r = t.mode ?? "no-repeat";
	if (r !== "random" && r !== "no-repeat" && r !== "sequence") throw new Error("soundEvent.mode: unknown selection mode");
	const i = t.bus ?? "sfx";
	if (typeof i !== "string" || !i.trim()) throw new Error("soundEvent.bus: expected a bus name");
	const a = Q(t.maxInstances, "soundEvent.maxInstances", 0, 0);
	if (!Number.isSafeInteger(a)) throw new Error("soundEvent.maxInstances: expected a safe integer");
	const o = {
		version: 1,
		clips: n,
		mode: r,
		bus: i,
		maxInstances: a,
		volume: _a(t.volume, "soundEvent.volume", false),
		playbackRate: _a(t.playbackRate, "soundEvent.playbackRate", true),
		priority: Q(t.priority, "soundEvent.priority", -Number.MAX_VALUE, 0),
		cooldown: Q(t.cooldown, "soundEvent.cooldown", 0, 0)
	};
	if (t.spatial !== void 0) {
		const e = ga(t.spatial, "soundEvent.spatial");
		const n = e.model;
		if (n !== 0 && n !== 1 && n !== 2) throw new Error("soundEvent.spatial.model: unknown attenuation model");
		const r = Q(e.refDistance, "soundEvent.spatial.refDistance", Number.MIN_VALUE);
		o.spatial = {
			model: n,
			refDistance: r,
			maxDistance: Q(e.maxDistance, "soundEvent.spatial.maxDistance", r),
			rolloff: Q(e.rolloff, "soundEvent.spatial.rolloff", 0)
		};
	}
	return o;
}
/** Immutable compiled choices; selecting allocates no candidate lists or retained history.
* Selection and parameter random streams are independent so range edits preserve clip order.
* Duplicate clip identities combine weights in random modes; their first slot is reported.
* The seed is reduced to 32 bits; only selection and sampled parameters are reproducible.
* @beta */
var ya = class {
	constructor(e, t = 0) {
		this.groups = [];
		this.sequence = [];
		this.total = 0;
		this.cursor = 0;
		this.last = -1;
		this.asset = va(e);
		if (!Number.isSafeInteger(t)) throw new Error("soundEvent.seed: expected a safe integer");
		this.choiceState = t >>> 0;
		this.parameterState = (t ^ 2654435769) >>> 0;
		let n = 0;
		for (const e of this.asset.clips) n = Math.max(n, e.weight);
		const r = /* @__PURE__ */ new Map();
		for (let e = 0; e < this.asset.clips.length; ++e) {
			const t = this.asset.clips[e];
			if (!t.weight) continue;
			this.sequence.push(e);
			const n = Te(t.clip) ?? t.clip;
			let i = r.get(n);
			if (!i) {
				i = {
					slot: e,
					weight: 0,
					end: 0,
					scale: 0,
					sum: 0
				};
				r.set(n, i);
				this.groups.push(i);
			}
			if (t.weight > i.scale) {
				i.sum = i.sum * (i.scale / t.weight) + 1;
				i.scale = t.weight;
			} else i.sum += t.weight / i.scale;
		}
		for (const e of this.groups) {
			e.weight = e.scale / n * e.sum;
			this.total += e.weight;
			e.end = this.total;
		}
	}
	next() {
		if (!this.sequence.length) return {
			selection: null,
			reason: this.asset.clips.length ? "zero-weight" : "empty"
		};
		let e;
		if (this.asset.mode === "sequence") {
			e = this.sequence[this.cursor];
			this.cursor = (this.cursor + 1) % this.sequence.length;
		} else {
			const t = this.asset.mode === "no-repeat" && this.groups.length > 1 && this.last >= 0 ? this.groups[this.last] : null;
			const n = this.random(false), r = this.total - (t?.weight ?? 0);
			let i;
			if (t && r <= this.total * Number.EPSILON * 8) i = this.sampleWithoutLast(n);
			else {
				let e = n * r;
				if (t && e >= t.end - t.weight) e += t.weight;
				i = 0;
				let a = this.groups.length - 1;
				while (i < a) {
					const t = i + a >>> 1;
					if (e < this.groups[t].end) a = t;
					else i = t + 1;
				}
				if (t && i === this.last) i = this.sampleWithoutLast(n);
			}
			this.last = i;
			e = this.groups[i].slot;
		}
		return { selection: {
			clip: this.asset.clips[e].clip,
			slot: e,
			volume: this.sampleRange(this.asset.volume),
			playbackRate: this.sampleRange(this.asset.playbackRate)
		} };
	}
	/** Rescale after excluding a dominant weight so subtraction cannot erase the remaining choices. */
	sampleWithoutLast(e) {
		let t = 0, n = 0, r = 0;
		for (let e = 0; e < this.groups.length; ++e) if (e !== this.last) t = Math.max(t, this.groups[e].scale);
		for (let e = 0; e < this.groups.length; ++e) if (e !== this.last) n += this.groups[e].scale / t * this.groups[e].sum;
		let i = e * n;
		for (let e = 0; e < this.groups.length; ++e) {
			if (e === this.last) continue;
			r = e;
			i -= this.groups[e].scale / t * this.groups[e].sum;
			if (i < 0) return e;
		}
		return r;
	}
	sampleRange(e) {
		const t = this.random(true);
		return Math.min(e[1], Math.max(e[0], e[0] * (1 - t) + e[1] * t));
	}
	random(e) {
		const t = (e ? this.parameterState : this.choiceState) + 1831565813 | 0;
		if (e) this.parameterState = t;
		else this.choiceState = t;
		let n = Math.imul(t ^ t >>> 15, t | 1);
		n ^= n + Math.imul(n ^ n >>> 7, n | 61);
		return ((n ^ n >>> 14) >>> 0) / 4294967296;
	}
};
//#endregion
//#region src/asset/loaders/SoundEventAssetLoader.ts
/** Loads a validated event definition without decoding every candidate sound. */
var ba = class {
	constructor() {
		this.type = "sound-event";
		this.extensions = [".esaudioevent"];
	}
	async load(e, t) {
		const n = await t.loadText(t.catalog.getBuildPath(e));
		try {
			return va(JSON.parse(n));
		} catch (t) {
			throw new Error(`${e}: ${t instanceof Error ? t.message : String(t)}`);
		}
	}
	unload() {}
};
//#endregion
//#region src/asset/Assets.ts
/**
* Default upper bound on concurrent loads inside preloadSceneAssets.
* Picked to match typical browser per-origin connection limits; scenes
* with hundreds of assets would otherwise fan out all at once and
* saturate the network, CPU image decoders, and WASM memory.
*/
const xa = 6;
/** A preload's timings are a report, so they need no platform: a realm without
*  one (a test, a tool) still loads. */
const Sa = () => typeof performance !== "undefined" ? performance.now() : Date.now();
/**
* Run an array of lazy task thunks with at most `maxConcurrent` in
* flight. Calls `onEach` once per task completion (success or failure)
* so callers can drive a progress indicator. Never rejects — individual
* task errors are expected to be handled inside the thunk itself.
*/
async function Ca(e, t, n) {
	if (e.length === 0) return;
	let r = 0;
	const i = [];
	const a = async () => {
		while (r < e.length) {
			const t = r++;
			try {
				await e[t]();
			} finally {
				n();
			}
		}
	};
	const o = Math.min(t, e.length);
	for (let e = 0; e < o; e++) i.push(a());
	await Promise.all(i);
}
function wa() {
	const e = new Me();
	return {
		textures: /* @__PURE__ */ new Map(),
		materials: /* @__PURE__ */ new Map(),
		spine: /* @__PURE__ */ new Map(),
		fonts: /* @__PURE__ */ new Map(),
		scope: e,
		release: () => e.releaseAll()
	};
}
const Ta = {
	texture: {
		load: (e, t, n) => e.acquireTexture(t).then((e) => {
			n.scope.add(e);
			n.textures.set(t, e.value);
		}),
		release: (e, t) => e.releaseTexture(t),
		displayable: true
	},
	material: {
		load: (e, t, n) => e.acquireTyped("material", t).then((e) => {
			n.scope.add(e);
			n.materials.set(t, e.value);
		}),
		release: (e, t) => e.releaseTyped("material", t),
		displayable: true
	},
	font: {
		load: (e, t, n) => e.acquireTyped("font", t).then((e) => {
			n.scope.add(e);
			n.fonts.set(t, e.value);
		}),
		release: (e, t) => e.releaseTyped("font", t),
		displayable: true
	},
	"bitmap-font": {
		load: (e, t, n) => e.acquireTyped("font", t).then((e) => {
			n.scope.add(e);
			n.fonts.set(t, e.value);
		}),
		release: (e, t) => e.releaseTyped("font", t),
		displayable: true
	},
	spine: {
		load: (e, t, n) => e.acquireSpine(t).then((e) => {
			n.scope.add(e);
			n.spine.set(t, e.value);
		}),
		release: (e, t) => e.releaseTyped("spine", t),
		displayable: true
	},
	prefab: {
		load: (e, t, n) => e.acquireTyped("prefab", t).then((e) => {
			n.scope.add(e);
		}),
		release: (e, t) => e.releaseTyped("prefab", t),
		displayable: false
	},
	audio: {
		load: (e, t, n) => e.acquireTyped("audio", t).then((e) => {
			n.scope.add(e);
		}),
		release: (e, t) => e.releaseTyped("audio", t),
		displayable: false
	}
};
/**
* Say what failed, wherever it failed. Two loading doors reached this same dead
* end — a caller holding an empty result it cannot tell from an empty group —
* so the sentence is written once rather than at each of them.
*/
function Ea(e, t) {
	if (e.length === 0) return;
	c.warn("asset", `${t ? `${t}: ` : ""}${e.length} asset(s) failed to load`, e);
}
/**
* The asset server: one typed loader per asset type, over one ref vocabulary.
*
* Every `ref` a loader takes is one of two spellings, and both land on the same
* file:
*
*  - a **project-root-relative path** — `'assets/textures/player.png'`. Relative
*    to the project root, NOT to the assets folder, so it carries the `assets/`
*    segment: it is the path the Content Browser shows, the key the cook's
*    manifest is built on, and what the backend appends to its base url. A ref
*    that drops the root resolves just the same and 404s, because nothing lives
*    at the project root.
*  - an **`@uuid:` ref** — what the editor serializes into scenes and prefabs so
*    renaming or moving the file breaks nothing. Not hand-written; the realm's
*    resolver turns it back into the path above before any fetch.
*/
/**
* A path-addressed release had more than one generation to choose from, so it
* took the oldest and may have freed somebody else's asset. Reported once per
* key: the caller that can carry a lease should, and one that cannot needs to
* hear it once, not every frame.
*/
const Da = /* @__PURE__ */ new Set();
function Oa(e) {
	if (Da.has(e)) return;
	Da.add(e);
	c.warn("asset", `release("${e}") had more than one live generation and released the oldest — which may not be the one the caller holds. Release it by its lease instead.`);
}
/**
* What edge a mesh texture is first loaded at, asked as each one loads (texture streaming says, by the quality level): set once per
* realm, before any Assets exists, since a scene can load before the first frame. 0 loads it whole.
*/
let ka = () => 0;
/** @internal */
function Aa(e) {
	ka = e;
}
var ja = class e {
	get baseUrl() {
		return this.baseUrl_;
	}
	set baseUrl(e) {
		this.baseUrl_ = e;
		if (this.backend.setBaseUrl) this.backend.setBaseUrl(e ?? "");
	}
	/** @internal How many times everything this loader held has been given back: what a holder kept of an earlier one names things that are gone. */
	get epoch() {
		return this.resetEpoch_;
	}
	assertLoading_(e = this.resetEpoch_) {
		if (this.releasing_ || e !== this.resetEpoch_) throw new Error("Assets were released while loading; this request has no owner. Load it again.");
	}
	constructor(e) {
		this.manifestModel_ = null;
		this.applyChain_ = Promise.resolve();
		this.applying_ = 0;
		this.pendingUpdate_ = null;
		this.persistKey_ = null;
		this.shippedRevision_ = null;
		this.cacheOwner_ = null;
		this.cacheRollback_ = null;
		this.cacheLaunch_ = null;
		this.cacheLaunchRollback_ = null;
		this.activeUpdate_ = null;
		this.loaders_ = /* @__PURE__ */ new Map();
		this.textureImportResolver_ = null;
		this.textureCache_ = new Dn((e) => {
			E().releaseTexture(e.handle);
		});
		this.textureRefs_ = new In();
		this.resetEpoch_ = 0;
		this.releasing_ = false;
		this.preparations_ = /* @__PURE__ */ new Set();
		this.abandoned_ = /* @__PURE__ */ new Set();
		this.genericCache_ = /* @__PURE__ */ new Map();
		this.genericRefs_ = new In();
		this.retired_ = /* @__PURE__ */ new WeakSet();
		this.settling_ = /* @__PURE__ */ new Set();
		this.loadContext_ = null;
		this.assetRefResolver_ = null;
		this.refCounter_ = null;
		this.invalidateListeners_ = /* @__PURE__ */ new Set();
		this.appScope_ = new Me();
		this.entityScopes_ = new Ln();
		this.registrySlots_ = new Vn();
		this.handleToPath_ = /* @__PURE__ */ new Map();
		this.meshTextures_ = /* @__PURE__ */ new Set();
		this.meshMaterials_ = /* @__PURE__ */ new Set();
		this.streamingStartEdge_ = 0;
		this.builtMeshes_ = /* @__PURE__ */ new Map();
		this.assetProblems_ = /* @__PURE__ */ new Map();
		this.assetProblemListener_ = null;
		this.backend = e.backend && vn(e.backend, () => this.manifestModel_);
		this.catalog = e.catalog ?? bn.empty();
		this.module_ = e.module;
		this.getAudio_ = e.getAudio ?? (() => null);
		this.getSpriteAnimation_ = e.getSpriteAnimation ?? (() => null);
		this.getLocalization_ = e.getLocalization ?? (() => null);
		this.setManifest(e.manifest ?? null);
		this.textureLoader_ = new Fn(e.module);
		this.spineLoader_ = new Hn();
		this.registerBuiltinLoaders();
	}
	static create(t) {
		return new e(t);
	}
	register(e) {
		this.loaders_.set(e.type, e);
	}
	getLoader(e) {
		return this.loaders_.get(e);
	}
	async loadTexture(e) {
		return this.loadTextureVariant_(e, true);
	}
	async loadTextureRaw(e) {
		return this.loadTextureVariant_(e, false);
	}
	/**
	* The textures the engine is waiting for content for — its ledger, not a
	* mirror of this cache — with who refills each and the path it was
	* registered under. A blank path is not this layer's to fetch.
	*/
	texturesAwaitingReupload() {
		const e = E().texturesAwaitingReupload?.() ?? "";
		if (!e) return [];
		return e.split("\n").map((e) => {
			const [t, n, ...r] = e.split("|");
			return {
				handle: Number(t),
				content: Number(n),
				path: r.join("|")
			};
		});
	}
	/**
	* Decode the texture behind @p handle again, no larger than @p maxEdge texels on a side (0 is its full size), behind the same handle:
	* what texture streaming moves a texture between sizes with. Null for a texture no file of this realm's stands behind.
	*/
	async resizeTexture(e, t) {
		const n = await this.textureLoader_.resize(e, t, this.getLoadContext_());
		if (n) D(e);
		return n;
	}
	/** The size of the file behind @p handle, whatever size it is held at; null for a texture no file of this realm's stands behind. */
	textureFullSize(e) {
		return this.textureLoader_.fullSize(e);
	}
	/**
	* Load the textures meshes draw no larger than @p edge on a side to begin with (0 loads them whole): texture streaming grows each
	* to what its views need. A texture something else also draws is put back at its size by the streamer.
	*/
	setTextureStreamingStart(e) {
		this.streamingStartEdge_ = e;
	}
	/** Whether {@link resizeTexture} can move @p handle between sizes. */
	textureResizable(e) {
		return this.textureLoader_.resizable(e);
	}
	/**
	* Refills every owed texture someone can: an asset texture is loaded again and
	* moved behind its handle, any other goes to the refill its creator provided.
	* Content nobody can remake is forgone by name, or the device recovers forever.
	*/
	async reuploadTexturesAfterDeviceLoss() {
		const e = E();
		if (!e.adoptTextureContent) return 0;
		let t = 0;
		for (const { handle: n, content: r, path: i } of this.texturesAwaitingReupload()) {
			if (r !== O.Asset || !i) {
				const i = re(n);
				if (!i) {
					c.warn("assets", `Device recovery: texture ${n} (${ae(r)}) has no provider to refill it; it stays blank`);
					e.forgoTextureContent?.(n);
					continue;
				}
				try {
					if (await i()) t++;
				} catch (e) {
					c.warn("assets", `Device recovery: refilling texture ${n} (${ae(r)}) failed`, e);
				}
				continue;
			}
			const a = i.lastIndexOf(":");
			const o = a < 0 ? i : i.slice(0, a);
			const s = a < 0 || i.slice(a + 1) === "f";
			try {
				const r = await this.textureLoader_.loadDetached(this.resolveLoadPath_(o), this.getLoadContext_(), s, this.textureImportResolver_?.(o));
				if (e.adoptTextureContent(n, r.handle)) t++;
				e.releaseTexture(r.handle);
			} catch (e) {
				c.warn("assets", `Device recovery: re-upload failed for ${o}`, e);
			}
		}
		c.info("assets", `Device recovery: ${t} texture(s) re-uploaded`);
		return t;
	}
	/**
	* The meshes the engine is waiting for geometry for, by handle. No path
	* travels with them: the engine never knew one, and this layer does.
	*/
	meshesAwaitingRematerialization() {
		const e = E().meshesAwaitingRemat?.() ?? "";
		return e ? e.split(",").map(Number).filter((e) => e > 0) : [];
	}
	/** Every live mesh and whether its geometry is on the device. */
	meshRealizations() {
		const e = E().meshRealizations?.() ?? "";
		if (!e) return [];
		return e.split(",").map((e) => {
			const [t, n] = e.split(":");
			return {
				handle: Number(t),
				realized: n === "1"
			};
		});
	}
	/**
	* Replays each owed mesh from its source, into the handle it already has.
	*
	* A missing provenance is a CONTRACT VIOLATION, not a mesh that turns out to
	* be unrecoverable: the engine only owes what a producer declared
	* replayable, so an absent path means this layer lost the record.
	*
	* @return How many came back. The rest stay owed.
	*/
	async rematerializeMeshesAfterDeviceLoss() {
		const e = this.getLoader("mesh");
		if (!(e instanceof Fr)) return 0;
		let t = 0;
		for (const n of this.meshesAwaitingRematerialization()) {
			const r = this.builtMeshes_.get(n);
			if (r) {
				if (e.uploadData(r, n) !== 0) t++;
				else c.error("assets", `Device recovery: the engine refused built geometry ${n}`);
				continue;
			}
			const i = this.pathForHandle("mesh", n);
			if (!i) {
				c.error("assets", `Device recovery: mesh ${n} is declared replayable and has no recorded source — its provenance was lost, so it cannot come back`);
				continue;
			}
			try {
				if (await e.rematerialize(n, i, this.getLoadContext_())) t++;
				else c.error("assets", `Device recovery: the engine refused geometry for ${i}`);
			} catch (e) {
				c.error("assets", `Device recovery: replaying ${i} failed`, e);
			}
		}
		c.info("assets", `Device recovery: ${t} mesh(es) rematerialized`);
		return t;
	}
	/**
	* Pays what the engine owes after rebuilding the device. The rebuild itself
	* is the engine's, once per loss; this only refills content. Returns whether
	* the device is whole — false while the context is not back yet, or while
	* content is still owed, so a caller retries.
	*/
	async recoverFromDeviceLoss() {
		if (!$t()) return false;
		await this.reuploadTexturesAfterDeviceLoss();
		await this.rematerializeMeshesAfterDeviceLoss();
		const e = Jt() === V.Live;
		if (!e) {
			const e = this.texturesAwaitingReupload().length + this.meshesAwaitingRematerialization().length;
			c.warn("assets", `Device recovery: ${e} texture(s)/mesh(es) have not come back`);
		}
		return e;
	}
	/** The decoded geometry behind a mesh handle this realm loaded, or null when nothing here can name it. */
	async readMeshData(e) {
		const t = this.getLoader("mesh");
		const n = this.pathForHandle("mesh", e);
		if (!(t instanceof Fr) || !n) return null;
		try {
			return await t.readSource(n, this.getLoadContext_());
		} catch (e) {
			c.warn("assets", `Reading the geometry of ${n} failed`, e);
			return null;
		}
	}
	/** Uploads geometry built at run time. Returns its handle, or 0 when the engine refused it. */
	createMesh(e) {
		const t = this.getLoader("mesh");
		if (!(t instanceof Fr)) return 0;
		const n = t.uploadData(e);
		if (n !== 0) this.builtMeshes_.set(n, e);
		return n;
	}
	/** Gives back geometry {@link createMesh} made. */
	releaseBuiltMesh(e) {
		if (!this.builtMeshes_.delete(e)) return;
		const t = this.getLoader("mesh");
		if (t instanceof Fr) t.releaseData(e);
	}
	async loadTextureVariant_(e, t) {
		return (await this.acquireTextureVariant_(e, t)).result;
	}
	async acquireTextureVariant_(e, t) {
		this.assertLoading_();
		const n = this.resolveLoadPath_(e);
		const r = this.textureCacheKey_(n, t);
		const i = this.textureImportResolver_?.(e);
		const a = this.resetEpoch_;
		const o = await this.textureCache_.getOrLoad(r, () => {
			const e = this.reviveResidentTexture_(r);
			if (e) return Promise.resolve(e);
			this.textureLoader_.setPendingSettings(i);
			const a = typeof this.streamingStartEdge_ === "function" ? this.streamingStartEdge_() : this.streamingStartEdge_;
			const o = a > 0 ? a : ka();
			if (o > 0 && this.meshTextures_.has(n)) this.textureLoader_.setPendingStartEdge(o);
			return t ? this.textureLoader_.load(n, this.getLoadContext_()) : this.textureLoader_.loadRaw(n, this.getLoadContext_());
		});
		if (a !== this.resetEpoch_) {
			if (!this.abandoned_.has(o.handle)) {
				this.abandoned_.add(o.handle);
				E().releaseTexture(o.handle);
				D(o.handle);
			}
			throw new Error(`Assets were released while "${e}" was loading; its texture has no owner. Load it again.`);
		}
		const s = this.textureRefs_.acquire(r, o.handle);
		this.recordHandlePath_("texture", o.handle, n);
		if (i?.sliceBorder) {
			const e = i.sliceBorder;
			E().setTextureMetadata(o.handle, e.left, e.right, e.top, e.bottom);
		}
		return {
			result: o,
			lease: s
		};
	}
	/**
	* Try to revive an evictable texture from the C++ pool's residency cache.
	* Returns null on a miss — or when the resource-manager surface doesn't
	* support residency (minimal test mocks). Gated on invalidateTexturePath
	* too: reviving without the ability to sever a path on hot reload could
	* hand out stale bytes, so both must be present or neither is used.
	*/
	reviveResidentTexture_(e) {
		const t = E();
		if (typeof t.acquireTextureByPath !== "function" || typeof t.invalidateTexturePath !== "function") return null;
		const n = t.acquireTextureByPath(e);
		if (!n) return null;
		const r = t.getTextureDimensions(n);
		if (!r) {
			t.releaseTexture(n);
			return null;
		}
		this.textureLoader_.adoptRevived(n, e);
		return {
			handle: n,
			width: r.width,
			height: r.height
		};
	}
	/**
	* Provide per-asset texture import settings at load time (filter, wrap,
	* mipmaps). The resolver is called with the original ref — keyed off
	* `@uuid:...` in editor scenarios. Returning `undefined` uses defaults.
	*/
	setTextureImportSettingsResolver(e) {
		this.textureImportResolver_ = e;
	}
	getTexture(e) {
		const t = this.resolveLoadPath_(e);
		return this.textureCache_.get(this.textureCacheKey_(t, true));
	}
	/**
	* The load path behind a LIVE handle (`kind` = the asset slot type:
	* 'texture' | 'material' | 'font' | …), or null when this realm never
	* loaded such a handle. The reverse of ref resolution — the live "Game"
	* inspector uses it to show WHICH asset a World component's handle-valued
	* slot is wearing (a raw handle number names nothing to a human).
	*/
	pathForHandle(e, t) {
		return this.handleToPath_.get(`${e}:${t}`) ?? null;
	}
	/**
	* The load path of a texture by the id the renderer bound it with — a frame
	* capture's `textureId` — rather than by asset handle. Null for a texture no
	* asset of this realm loaded: the white fill, a render target, a glyph atlas.
	*/
	pathForRenderedTexture(e) {
		const t = ie();
		if (!t || e === 0) return null;
		for (const [n, r] of this.handleToPath_) if (n.startsWith("texture:") && t.getTextureGLId(Number(n.slice(8))) === e) return r;
		return null;
	}
	/** Record a handle→path pair, dropped on invalidation or final release. */
	recordHandlePath_(e, t, n) {
		if (t !== 0) this.handleToPath_.set(`${e}:${t}`, n);
	}
	/** {@link acquireSpine} without the receipt, for a caller that will let the
	*  realm's teardown be its release. */
	async loadSpine(e, t) {
		return (await this.acquireSpine(e, t)).value;
	}
	/**
	* One spine PAIR — a skeleton and the atlas it is drawn with. The same
	* skeleton with another atlas is another asset, which is why the receipt
	* names the pair and not the skeleton's path.
	*/
	async acquireSpine(e, t) {
		try {
			return await this.acquireSpineLease_(e, t);
		} catch (e) {
			throw H(e);
		}
	}
	async acquireSpineLease_(e, t) {
		const n = this.resolveLoadPath_(e);
		const r = this.spineAtlasOf_(n, t);
		const i = Fe(n, r);
		const { value: a, lease: o } = await this.acquirePrepared_("spine", i, e, (e) => this.spineLoader_.prepare(n, r, e));
		return this.typedLease_("spine", o, a);
	}
	/** The atlas of a pair the caller named only half of: a skeleton's atlas is
	*  a Catalog dependency, which is what a cook records for it. */
	spineAtlasOf_(e, t) {
		if (t) return this.resolveLoadPath_(t);
		const n = this.catalog.getDeps(e);
		if (n.length === 0) throw new Error(`Spine skeleton has no atlas dependency: ${e}. Pass the atlas explicitly or configure Catalog deps.`);
		return n[0];
	}
	async loadMaterial(e) {
		return this.loadTyped("material", e);
	}
	async loadFont(e) {
		return this.loadTyped("font", e);
	}
	async loadAudio(e) {
		return this.loadTyped("audio", e);
	}
	async loadAnimClip(e) {
		return (await this.acquireAnimClip_(e)).value;
	}
	/**
	* A clip is published under the load path AND the ref as it was spelled: a
	* realm whose resolver returns URLs hands the loader `estella://…/walk.esanim`
	* while components ask for `assets/animations/walk.esanim`. Both names are
	* the slot's, so a republish is seen through either.
	*/
	async acquireAnimClip_(e) {
		return this.acquireTyped("anim-clip", e);
	}
	async loadTilemap(e) {
		return this.loadTyped("tilemap", e);
	}
	async loadTileset(e) {
		return this.loadTyped("tileset", e);
	}
	async loadTimeline(e) {
		return this.loadTyped("timeline", e);
	}
	/** Load a `.eslocale` string table and merge it into the app's Localization
	*  catalogs. Requires the LocalizationPlugin (fails loud otherwise). */
	async loadLocaleTable(e) {
		return this.loadTyped("locale", e);
	}
	/** Load a `.esfsm` state machine into the shared AI store, keyed by its
	*  asset path — the ref a StateMachineAgent's `fsm` field resolves. */
	async loadStateMachine(e) {
		return this.loadTyped("statemachine", e);
	}
	/** Load a `.esbt` behavior tree into the shared AI store, keyed by its
	*  asset path — the ref a BehaviorTreeAgent's `bt` field resolves. */
	async loadBehaviorTree(e) {
		return this.loadTyped("behaviortree", e);
	}
	/** Load a `.esanimator` controller into the shared animator store, keyed by
	*  its asset path — the ref an Animator's `controller` field resolves. */
	async loadAnimatorController(e) {
		return this.loadTyped("animatorcontroller", e);
	}
	async loadPrefab(e) {
		return this.loadTyped("prefab", e);
	}
	/**
	* Load a `.json` data asset — a game's own table, tuning or dialogue file.
	*
	* `T` is what the caller expects the document to be; nothing validates it,
	* so this is `JSON.parse`'s guarantee, not a schema's. What the asset system
	* adds over fetching the file yourself is everything around the parse: ref
	* resolution (`@uuid:` and manifest paths), one parse per file, group /
	* subpackage delivery, and hot update.
	*/
	async loadJson(e) {
		return this.loadTyped("json", e);
	}
	async load(e, t) {
		return this.loadTyped(e, t);
	}
	getAtlasFrame(e) {
		return this.catalog.getAtlasFrame(e) ?? this.catalog.getAtlasFrame(this.resolveLoadPath_(e));
	}
	/**
	* Set (or clear) the addressable manifest used by {@link loadGroup}.
	* Accepts the raw manifest JSON or a pre-built {@link ManifestModel};
	* `null` clears it.
	*/
	setManifest(e) {
		this.manifestModel_ = e == null ? null : e instanceof mt ? e : mt.fromJson(e);
	}
	getManifest() {
		return this.manifestModel_;
	}
	async loadByLabel(e, t) {
		const n = wa();
		let r = 0;
		const i = [];
		const a = (e) => e.then(() => {
			t?.(++r, o);
		}).catch(() => {
			t?.(++r, o);
		});
		for (const t of this.catalog.getByLabel(e)) {
			const e = this.catalog.getEntry(t);
			if (!e) continue;
			const r = this.bundleLoadTask_(t, e.type, n);
			if (r) i.push(a(r));
		}
		const o = i.length;
		t?.(0, o);
		r = 0;
		await Promise.allSettled(i);
		return n;
	}
	/**
	* Load every asset in an addressable group through the typed loaders,
	* warming the cache (and populating the returned bundle for the four
	* displayable types). Requires a manifest (see {@link setManifest}); with
	* no manifest set, this is a no-op returning an empty bundle.
	*
	* This is the single group-loading channel — the basis for on-demand /
	* subpackage delivery. It dispatches through the same per-type loaders as
	* {@link loadByLabel}, so the two never diverge.
	*/
	async loadGroup(e, t) {
		const n = wa();
		const r = this.manifestModel_;
		if (!r) {
			c.warn("asset", `loadGroup('${e}') called but no manifest is set`);
			t?.(0, 0);
			return n;
		}
		const i = r.bundleMode(e);
		if (i === "lazy") await te(e);
		let a = 0;
		const o = [];
		const s = [];
		const l = (e, n, r) => e.then(() => {
			t?.(++a, u);
		}).catch((e) => {
			s.push({
				ref: n,
				type: r,
				reason: "load-failed",
				error: String(e)
			});
			t?.(++a, u);
		});
		for (const t of r.assetsInGroup(e)) {
			const e = this.manifestAssetUrl_(t.path, i === "remote");
			const r = this.groupLoadTask_(e, t.type, n);
			if (r) o.push(l(r, e, t.type));
		}
		const u = o.length;
		t?.(0, u);
		a = 0;
		await Promise.allSettled(o);
		Ea(s, `loadGroup('${e}')`);
		return n;
	}
	/**
	* Release every asset the group's CURRENT membership names.
	*
	* @details Prefer `bundle.release()` on what {@link loadGroup} returned:
	*          this door re-reads the manifest, so an update between the two
	*          releases a set the load never took. No-op without a manifest.
	*/
	releaseGroup(e) {
		const t = this.manifestModel_;
		if (!t) {
			c.warn("asset", `releaseGroup('${e}') called but no manifest is set`);
			return;
		}
		const n = t.bundleMode(e);
		for (const r of t.assetsInGroup(e)) {
			const e = this.manifestAssetUrl_(r.path, n === "remote");
			Ta[r.type]?.release?.(this, e);
		}
	}
	/** The CDN / remote root that `remote`-group assets resolve against. */
	get remoteRoot() {
		return this.remoteRoot_;
	}
	/** Point `remote`-group resolution at a CDN root: their content-addressed
	*  paths then fetch from `<root>/<path>`. A trailing slash is trimmed;
	*  `undefined` clears it (same-origin fallback). */
	setRemoteRoot(e) {
		this.remoteRoot_ = e ? e.replace(/\/+$/, "") : void 0;
	}
	/** Absolute url of a `remote`-group asset against `root` (default the active
	*  remote root). An already-absolute manifest path (a fully-qualified CDN url)
	*  passes through; with no root the path returns as-is (same-origin fallback). */
	remoteUrlFor_(e, t = this.remoteRoot_) {
		if (/^[a-z][a-z0-9+.-]*:\/\//i.test(e)) return e;
		if (!t) return e;
		return `${t.replace(/\/+$/, "")}/${e.replace(/^\/+/, "")}`;
	}
	/** The load url for a manifest asset. A `remote`-group asset resolves to its
	*  `<root>/<path>` CDN url when a root is set; every other case (local / lazy
	*  group, or a remote group with no CDN root — same-origin realms like editor
	*  Play) resolves through the normal resolver + Catalog. The single remote/local
	*  routing rule shared by {@link loadGroup} and {@link fetchAndVerify_}, so a
	*  loadGroup'd asset and the same asset reached by a scene `@uuid` ref (via
	*  {@link resolveLoadPath_} → {@link remoteAssetPath_}) never resolve two ways. */
	manifestAssetUrl_(e, t, n = this.remoteRoot_) {
		return t && n ? this.remoteUrlFor_(e, n) : this.resolveLoadPath_(e);
	}
	/**
	* Fetch a candidate manifest and diff it against the active one WITHOUT
	* applying anything — the "is there an update, and how big?" query. The
	* returned plan (changed assets + byte total) is what a UI shows before
	* asking the player to download; the candidate is staged for {@link applyUpdate}.
	*
	* Diffing is by content hash (see {@link diffManifests}); because assets are
	* content-addressed, a changed asset is a brand-new url, so applying can never
	* overwrite or corrupt a cached file.
	*/
	async checkForUpdate(e) {
		const t = await this.backend.fetchText(this.backend.resolveUrl(e.manifestUrl));
		const n = JSON.parse(t);
		const r = mt.fromJson(n);
		const i = Sn(this.manifestModel_, r);
		const a = e.remoteRoot ?? this.remoteRoot_ ?? null;
		this.pendingUpdate_ = {
			model: r,
			manifestJson: n,
			remoteRoot: a
		};
		await this.protectCacheVersions_();
		return i;
	}
	/**
	* Apply the update staged by the last {@link checkForUpdate}, ATOMICALLY.
	* Phase 1 downloads AND integrity-verifies every changed (content-addressed)
	* asset — bytes are hashed and checked against the manifest's `contentHash`,
	* so a corrupted / tampered CDN response is caught. Only if ALL succeed does
	* phase 2 commit: swap the active manifest + root, rebind live handles (via
	* `onInvalidate`), and persist. If any asset fails to download or fails its
	* hash check, NOTHING is swapped — the old manifest stays active (rollback)
	* and the failures are returned. No-op with nothing staged.
	*/
	async applyUpdate(e) {
		this.applying_++;
		const t = this.applyChain_.then(async () => {
			try {
				return await this.applyStaged_(e);
			} finally {
				this.activeUpdate_ = null;
			}
		});
		this.applyChain_ = t.catch(() => {});
		try {
			return await t;
		} finally {
			this.applying_--;
		}
	}
	async applyStaged_(e) {
		const t = this.pendingUpdate_;
		const n = () => this.manifestModel_?.revision() ?? null;
		const r = {
			verified: false,
			applied: false,
			persisted: false,
			cached: false
		};
		if (!t) {
			c.warn("asset", "applyUpdate() called with no pending update — call checkForUpdate first");
			e?.(0, 0);
			return {
				ok: false,
				updated: 0,
				failed: [],
				stages: r,
				revision: n(),
				uncached: [],
				reason: "nothing-staged"
			};
		}
		const i = Sn(this.manifestModel_, t.model).changedAssets;
		const a = t.remoteRoot ?? void 0;
		this.activeUpdate_ = t;
		await this.protectCacheVersions_();
		const o = [];
		const s = [];
		let l = false;
		let u = 0;
		e?.(0, i.length);
		await Ca(i.map((e) => async () => {
			const n = await this.fetchAndVerify_(e, t.model, a);
			if (n.failure) o.push({
				path: e.path,
				reason: n.failure
			});
			if (n.cache !== "unsupported" && n.cache !== void 0) l = true;
			if (n.cache === "failed") s.push(n.url);
		}), xa, () => {
			e?.(++u, i.length);
		});
		if (o.length > 0) {
			c.warn("asset", `applyUpdate: ${o.length}/${i.length} asset(s) failed — update rolled back (manifest unchanged)`);
			return {
				ok: false,
				updated: 0,
				failed: o,
				stages: r,
				revision: n(),
				uncached: []
			};
		}
		const d = /* @__PURE__ */ new Map();
		for (const e of i) {
			const t = this.getTexture(e.key) ?? this.getTexture(`${"@uuid:"}${e.key}`);
			if (t) d.set(e.key, t.handle);
		}
		const f = this.cacheVersion_(this.manifestModel_, this.remoteRoot_, "rollback");
		const p = this.cacheRollback_;
		this.cacheRollback_ = f;
		try {
			await this.protectCacheVersions_(this.cacheVersion_(t.model, a, "current"));
		} catch (e) {
			this.cacheRollback_ = p;
			throw e;
		}
		if (t.remoteRoot != null) this.setRemoteRoot(t.remoteRoot);
		this.setManifest(t.model);
		if (this.pendingUpdate_ === t) this.pendingUpdate_ = null;
		if (i.length > 0 && d.size === 0) c.warn("asset", `applyUpdate: no changed asset is bound to a live texture, so this update will rebind nothing. ${i.map((e) => `${e.type} ${e.key} -> ${this.resolveLoadPath_(e.key)}`).join("; ")}`);
		for (const e of i) this.fireInvalidate_({
			ref: e.key,
			type: e.type,
			oldValue: d.get(e.key)
		});
		for (const e of i) {
			const t = this.rebuildPlan_(e.key);
			this.track_(this.republishSlots_(e.key).rebuilt.then(() => this.rebuildAssetGraph_(t)));
		}
		await this.assetGraphSettled();
		const m = this.persistActiveManifest_(t.manifestJson);
		if (m === true) {
			this.cacheLaunch_ = this.cacheVersion_(t.model, a, "retained");
			this.cacheLaunchRollback_ = f ? {
				...f,
				reason: "retained"
			} : null;
		}
		await this.protectCacheVersions_().catch((e) => c.warn("asset", "updated content is protected but its cache index could not be refreshed", e));
		if (m !== true) c.warn("asset", m === false ? "applyUpdate: the update runs now, but was not stored — the next launch starts on the previous version" : "applyUpdate: no persistence key (restorePersistedUpdate was never called), so the next launch starts on what shipped");
		return {
			ok: true,
			updated: i.length,
			failed: [],
			revision: n(),
			uncached: s,
			stages: {
				verified: true,
				applied: true,
				persisted: m,
				cached: l ? s.length === 0 : null
			}
		};
	}
	/** Which revision runs, which one the next launch starts on, and what is staged. */
	updateStatus() {
		const e = this.pendingUpdate_;
		const t = e ? Sn(this.manifestModel_, e.model).changedAssets : [];
		return {
			revision: this.manifestModel_?.revision() ?? null,
			persistedRevision: this.persistedRevision_(),
			staged: e ? {
				revision: e.model.revision(),
				assets: t.length,
				bytes: t.reduce((e, t) => e + t.size, 0)
			} : null,
			applying: this.applying_ > 0
		};
	}
	cacheVersion_(e, t, n) {
		if (!e) return null;
		const r = e.entries().filter((t) => ft(e.group(t.group)?.bundleMode) === "remote").map((e) => this.backend.resolveUrl(this.manifestAssetUrl_(e.asset.path, true, t))).filter((e) => /^https?:\/\//i.test(e));
		return {
			revision: e.revision() ?? y(S(JSON.stringify(r))),
			reason: n,
			keys: r
		};
	}
	async protectCacheVersions_(e) {
		if (!b()) return;
		const t = _(v());
		if (t.capability() !== "managed") return;
		this.cacheOwner_ ??= `assets:${this.persistKey_ ?? this.remoteRoot_ ?? "package"}`;
		this.cacheLaunch_ ??= this.cacheVersion_(this.manifestModel_, this.remoteRoot_, "retained");
		const n = [
			e ?? this.cacheVersion_(this.manifestModel_, this.remoteRoot_, "current"),
			this.cacheRollback_,
			this.cacheLaunch_,
			this.cacheLaunchRollback_
		];
		for (const e of [this.pendingUpdate_, this.activeUpdate_]) if (e) n.push(this.cacheVersion_(e.model, e.remoteRoot ?? void 0, "pending"));
		await t.protect(this.cacheOwner_, n.filter((e) => e !== null));
	}
	/** Disk cache statistics, distinct from texture/audio residency budgets.
	* A scan reconciles interrupted writes/deletes; unknown files stay pinned. */
	async diskCacheReport(e = false) {
		if (!b()) return {
			capability: "unavailable",
			usedBytes: null,
			indexBytes: null,
			protectedBytes: null,
			reclaimableBytes: null,
			entries: [],
			versions: []
		};
		await this.protectCacheVersions_().catch((e) => c.warn("asset", "cache protection is active but its index could not be stored", e));
		return {
			...await _(v()).report(e),
			owner: this.cacheOwner_ ?? void 0
		};
	}
	/** Preview by default; execution recomputes LRU against current protections. */
	async cleanDiskCache(e, t = false) {
		if (!Number.isSafeInteger(e) || e < 0) throw Error("cache budget must be a non-negative safe integer");
		await this.diskCacheReport();
		if (!b()) return {
			report: await this.diskCacheReport(),
			budgetBytes: e,
			candidates: [],
			releaseBytes: 0,
			remainingBytes: null,
			budgetMet: null,
			removed: [],
			failed: []
		};
		const n = await _(v()).cleanup(e, t);
		n.report.owner = this.cacheOwner_ ?? void 0;
		return n;
	}
	/** Keep an older downloaded build, independently of the rolling rollback. */
	async retainDiskCacheVersion(e, t = true) {
		await this.diskCacheReport();
		if (!b() || !this.cacheOwner_) throw Error("cache management unavailable");
		const n = _(v());
		await n.retainVersion(this.cacheOwner_, e, t);
		return {
			...await n.report(),
			owner: this.cacheOwner_
		};
	}
	/** Download one changed asset's bytes from its delivery source (remote → CDN
	*  url against `root`, else the normal resolved path) and verify the content
	*  hash. Null on success, else the failure reason. Uses the PENDING manifest +
	*  root — phase 1 runs before the swap. */
	async fetchAndVerify_(e, t, n) {
		const r = t.group(e.group);
		const i = r != null && ft(r.bundleMode) === "remote";
		if (t.packOf(e.path)) return {
			url: e.path,
			failure: "packed"
		};
		const a = this.manifestAssetUrl_(e.path, i, n);
		const o = this.backend.resolveUrl(a);
		try {
			const t = await this.backend.fetchBinary(o);
			if (e.contentHash && y(new Uint8Array(t)) !== e.contentHash) return {
				url: o,
				failure: "integrity"
			};
			return {
				url: o,
				cache: i ? await f(o, t) : void 0
			};
		} catch {
			return {
				url: o,
				failure: "fetch"
			};
		}
	}
	/**
	* Remember a storage key under which {@link applyUpdate} persists the active
	* manifest, and immediately restore any manifest a prior run persisted there —
	* so a returning player boots straight onto the updated content, even offline.
	* Returns true if a persisted manifest was found and made active. Call at
	* boot, before the first scene loads.
	*/
	restorePersistedUpdate(e) {
		this.persistKey_ = e;
		this.shippedRevision_ = this.manifestModel_?.revision() ?? null;
		const t = x(e);
		if (!t) return false;
		try {
			const n = JSON.parse(t);
			if (n.base === void 0 || n.base !== this.shippedRevision_) {
				c.info("asset", `a stored update (${n.manifest?.revision ?? "?"}) was made for another package (${n.base ?? "unknown"}, this one ships ${this.shippedRevision_ ?? "none"}) — starting on what shipped`);
				u(e);
				return false;
			}
			if (n.remoteRoot) this.setRemoteRoot(n.remoteRoot);
			this.setManifest(n.manifest);
			if (n.cacheRollback && typeof n.cacheRollback.revision === "string" && Array.isArray(n.cacheRollback.keys) && n.cacheRollback.keys.every((e) => typeof e === "string")) {
				this.cacheRollback_ = {
					...n.cacheRollback,
					reason: "rollback"
				};
				this.cacheLaunchRollback_ = {
					...this.cacheRollback_,
					reason: "retained"
				};
			}
			this.protectCacheVersions_().catch((e) => c.warn("asset", "cache protection could not be persisted", e));
			return true;
		} catch (e) {
			c.warn("asset", "failed to restore persisted manifest", e);
			return false;
		}
	}
	/** True once stored and read back; a store can drop a write without throwing.
	*  Null with no persistence key. */
	persistActiveManifest_(e) {
		if (!this.persistKey_) return null;
		const t = JSON.stringify({
			manifest: e,
			remoteRoot: this.remoteRoot_ ?? null,
			base: this.shippedRevision_,
			cacheRollback: this.cacheRollback_
		});
		try {
			g(this.persistKey_, t);
			return x(this.persistKey_) === t;
		} catch (e) {
			c.warn("asset", "failed to persist updated manifest", e);
			return false;
		}
	}
	persistedRevision_() {
		const e = this.persistKey_ ? x(this.persistKey_) : null;
		if (!e) return null;
		try {
			return JSON.parse(e).manifest?.revision ?? null;
		} catch {
			return null;
		}
	}
	/**
	* Load one asset into the displayable bundle maps. Returns the in-flight
	* promise for the four bundle-able types (texture / material / spine /
	* font), or null for any other type. Shared by `loadByLabel` and
	* `loadGroup` so both dispatch through one channel.
	*/
	bundleLoadTask_(e, t, n) {
		const r = Ta[t];
		if (!r?.displayable) return null;
		return r.load(this, e, n);
	}
	/**
	* Like {@link bundleLoadTask_} but also warms the cache for non-displayable
	* types that have a typed loader (prefab, audio), so a whole group / sub-
	* package preloads. Raw types (json / text / binary) and unknowns return
	* null — they have no typed loader and are fetched lazily on demand.
	*/
	groupLoadTask_(e, t, n) {
		const r = Ta[t];
		return r ? r.load(this, e, n) : null;
	}
	/**
	* Preload an explicit list of refs (`@uuid:` or paths) through the typed
	* loaders, warming every cache with bounded concurrency and progress.
	* This is the streaming prefetch primitive: point it at the next area's
	* assets while gameplay continues, and the eventual real loads hit warm
	* caches (or revive resident textures) instead of the network.
	*
	* Asset types come from the catalog / manifest when known, falling back
	* to file-extension matching against the registered loaders. Refs whose
	* type can't be determined — and refs that fail to load — are reported
	* in `failed`; preload itself never rejects.
	*/
	async preload(e, t, n) {
		const r = [];
		const i = [];
		for (const t of e) {
			const e = this.resolveLoadPath_(t);
			const n = this.inferAssetType_(e);
			if (!n) {
				c.warn("asset", `preload: cannot determine asset type for ${t}`);
				r.push({
					ref: t,
					reason: "unresolved"
				});
				continue;
			}
			const a = this.typedLoadFor_(e, n);
			if (!a) {
				c.warn("asset", `preload: no loader for type '${n}' (${t})`);
				r.push({
					ref: t,
					type: n,
					reason: "unresolved"
				});
				continue;
			}
			i.push(() => a().then(() => {}).catch((e) => {
				c.warn("asset", `preload: failed to load ${t}`, e);
				r.push({
					ref: t,
					type: n,
					reason: "load-failed",
					error: e instanceof Error ? e.message : String(e)
				});
			}));
		}
		let a = 0;
		const o = i.length;
		t?.(0, o);
		await Ca(i, Math.max(1, n?.maxConcurrent ?? xa), () => {
			t?.(++a, o);
		});
		return { failed: r };
	}
	/** Asset type for a resolved path: catalog entry → manifest entry →
	*  extension match against the registered loaders → null. */
	inferAssetType_(e) {
		const t = this.catalog.getEntry(e)?.type;
		if (t) return t;
		const n = this.manifestModel_?.assetByPath(e)?.type;
		if (n) return n;
		const r = e.lastIndexOf(".");
		if (r < 0) return null;
		const i = e.slice(r).toLowerCase();
		for (const e of this.loaders_.values()) if (e.extensions.includes(i)) return e.type;
		return null;
	}
	/** Thunk that loads `path` through its type's canonical channel, or null
	*  when no loader handles the type. Textures/spine have dedicated entry
	*  points (refcount / two-file pairing); everything else is loadTyped. */
	typedLoadFor_(e, t) {
		switch (t) {
			case "texture": return () => this.loadTexture(e);
			case "spine": return () => this.loadSpine(e);
			case "font":
			case "bitmap-font": return () => this.loadFont(e);
			default: return this.loaders_.has(t) ? () => this.loadTyped(t, e) : null;
		}
	}
	async fetchJson(e) {
		const t = this.resolveLoadPath_(e);
		const n = this.backend.resolveUrl(this.catalog.getBuildPath(t));
		const r = await this.backend.fetchText(n);
		return JSON.parse(r);
	}
	async fetchBinary(e) {
		const t = this.resolveLoadPath_(e);
		const n = this.backend.resolveUrl(this.catalog.getBuildPath(t));
		return this.backend.fetchBinary(n);
	}
	async fetchText(e) {
		const t = this.resolveLoadPath_(e);
		const n = this.backend.resolveUrl(this.catalog.getBuildPath(t));
		return this.backend.fetchText(n);
	}
	async preloadSceneAssets(e, t, n) {
		return this.preloadSceneAssets_(e, t, n);
	}
	async preloadSceneAssets_(e, t, n, r) {
		const i = [];
		const a = je(e, (e) => this.resolveRef(e));
		for (const e of a.meshTextures) this.meshTextures_.add(e);
		for (const e of a.meshMaterials) this.meshMaterials_.add(e);
		for (const e of a.unresolved) i.push({
			ref: e,
			reason: "unresolved"
		});
		if (a.unresolved.length > 0) c.warn("asset", `${a.unresolved.length} unresolved asset ref(s)`, a.unresolved);
		const o = a.byType.get("texture") ?? /* @__PURE__ */ new Set();
		const s = a.byType.get("material") ?? /* @__PURE__ */ new Set();
		const l = a.byType.get("font") ?? /* @__PURE__ */ new Set();
		const u = a.rawByType.get("anim-clip") ?? /* @__PURE__ */ new Set();
		const d = a.byType.get("audio") ?? /* @__PURE__ */ new Set();
		const f = a.byType.get("sound-event") ?? /* @__PURE__ */ new Set();
		const p = a.byType.get("tilemap") ?? /* @__PURE__ */ new Set();
		const m = a.byType.get("tileset") ?? /* @__PURE__ */ new Set();
		const h = a.byType.get("timeline") ?? /* @__PURE__ */ new Set();
		const g = a.byType.get("statemachine") ?? /* @__PURE__ */ new Set();
		const ee = a.byType.get("behaviortree") ?? /* @__PURE__ */ new Set();
		const _ = a.byType.get("scriptgraph") ?? /* @__PURE__ */ new Set();
		const te = a.byType.get("animatorcontroller") ?? /* @__PURE__ */ new Set();
		const v = a.byType.get("avatar") ?? /* @__PURE__ */ new Set();
		const y = a.byType.get("mesh") ?? /* @__PURE__ */ new Set();
		const b = a.byType.get("environment") ?? /* @__PURE__ */ new Set();
		const x = a.byType.get("probeVolume") ?? /* @__PURE__ */ new Set();
		const S = a.byType.get("prefab") ?? /* @__PURE__ */ new Set();
		const ne = a.spines;
		const C = /* @__PURE__ */ new Map();
		const w = /* @__PURE__ */ new Map();
		const T = /* @__PURE__ */ new Map();
		const re = /* @__PURE__ */ new Map();
		const ie = /* @__PURE__ */ new Map();
		const E = /* @__PURE__ */ new Map();
		const D = [];
		const O = new Me();
		const ae = [];
		let oe = 0;
		const se = (e, t, n) => {
			r?.failed(e, n);
			i.push({
				ref: e,
				type: t,
				reason: "load-failed",
				error: n instanceof Error ? n.message : String(n)
			});
		};
		const k = [];
		/**
		* One task per path. The receipt is recorded only when the acquire
		* SUCCEEDED — a failed load owns nothing, so there is nothing for the
		* scene to give back and nothing to guess about at unload.
		*/
		const ce = {};
		const le = (e, t) => {
			const n = Sa();
			return t().finally(() => {
				const t = Sa() - n;
				const r = ce[e] ??= {
					count: 0,
					ms: 0,
					slowestMs: 0
				};
				r.count++;
				r.ms += t;
				r.slowestMs = Math.max(r.slowestMs, t);
			});
		};
		const A = (e, t, n, i) => {
			for (const a of e) k.push(() => le(n, () => t(a)).then((e) => {
				if (r) r.own(a, e, n);
				else O.add(e);
				ae.push({
					type: n,
					path: a,
					lease: e
				});
				D.push(() => e.release());
				if (i) i.set(a, e.value?.handle ?? 0);
			}).catch((e) => {
				c.warn("asset", `Failed to load ${n}: ${a}`, e);
				i?.set(a, 0);
				se(a, n, e);
			}));
		};
		A(o, (e) => this.acquireTexture(a.rawFor.get(e) ?? e), "texture", C);
		A(s, (e) => this.acquireTypedLease_("material", e), "material", w);
		A(l, (e) => this.acquireTypedLease_("font", e), "font", T);
		A(y, (e) => this.acquireTypedLease_("mesh", e), "mesh", re);
		A(b, (e) => this.acquireTypedLease_("environment", e), "environment", ie);
		A(x, (e) => this.acquireTypedLease_("probeVolume", e), "probeVolume", E);
		if (!n?.skipSpine) for (const e of ne) k.push(() => this.acquireSpineLease_(e.skeleton, e.atlas).then((t) => {
			if (r) r.own(Fe(e.skeleton, e.atlas), t, "spine");
			else O.add(t);
			ae.push({
				type: "spine",
				path: Fe(e.skeleton, e.atlas),
				lease: t
			});
			D.push(() => t.release());
		}).catch((t) => {
			c.warn("asset", `Failed to load spine: ${e.skeleton}`, t);
			se(e.skeleton, "spine", t);
		}));
		A(u, (e) => this.acquireTypedLease_("anim-clip", e), "anim-clip");
		A(p, (e) => this.acquireTypedLease_("tilemap", e), "tilemap");
		A(m, (e) => this.acquireTypedLease_("tileset", e), "tileset");
		A(h, (e) => this.acquireTypedLease_("timeline", e), "timeline");
		A(d, (e) => this.acquireTypedLease_("audio", e), "audio");
		A(f, (e) => this.acquireTypedLease_("sound-event", e), "sound-event");
		A(g, (e) => this.acquireTypedLease_("statemachine", e), "statemachine");
		A(ee, (e) => this.acquireTypedLease_("behaviortree", e), "behaviortree");
		A(_, (e) => this.acquireTypedLease_("scriptgraph", e), "scriptgraph");
		A(te, (e) => this.acquireTypedLease_("animatorcontroller", e), "animatorcontroller");
		A(v, (e) => this.acquireTypedLease_("avatar", e), "avatar");
		A(S, (e) => this.acquireTypedLease_("prefab", e), "prefab");
		const ue = k.length;
		t?.(0, ue);
		const de = Math.max(1, n?.maxConcurrent ?? xa);
		const fe = Sa();
		await Ca(k, de, () => {
			t?.(++oe, ue);
		});
		const pe = Sa() - fe;
		if (ue > 0) {
			const e = Object.entries(ce).sort((e, t) => t[1].ms - e[1].ms).map(([e, t]) => `${e} ${t.count} (${Math.round(t.ms)}ms, slowest ${Math.round(t.slowestMs)}ms)`);
			c.info("asset", `preloaded ${ue} asset(s) in ${Math.round(pe)}ms, ${de} at a time: ${e.join(", ")}`);
		}
		Ea(i.filter((e) => e.reason === "load-failed"));
		return {
			textureHandles: C,
			materialHandles: w,
			fontHandles: T,
			meshHandles: re,
			environmentHandles: ie,
			probeVolumeHandles: E,
			releaseCallbacks: D,
			scope: O,
			acquisitions: ae,
			missing: i,
			timings: ce,
			wallMs: pe
		};
	}
	resolveSceneAssetPaths(e, t) {
		const { textureHandles: r, materialHandles: i, fontHandles: a, meshHandles: o, environmentHandles: s, probeVolumeHandles: c } = t;
		for (const t of e.entities) {
			if (!Array.isArray(t.components)) continue;
			for (const e of t.components) {
				const t = Re(e.type);
				for (const { field: l, type: u } of t) {
					const t = e.data[l];
					if (typeof t !== "string" || !t) continue;
					const d = this.resolveRef(t);
					if (d == null) {
						e.data[l] = n(e.type)?.[l] ?? 0;
						continue;
					}
					switch (u) {
						case "texture": {
							const n = r.get(d) ?? 0;
							e.data[l] = n;
							this.recordHandlePath_("texture", n, d);
							const i = this.catalog.getAtlasFrame(t) ?? this.catalog.getAtlasFrame(d);
							if (i) {
								const t = e.data["uvOffset"];
								const n = e.data["uvScale"];
								const r = t?.x ?? 0, a = t?.y ?? 0;
								const o = n?.x ?? 1, s = n?.y ?? 1;
								e.data["uvOffset"] = {
									x: i.uvOffset[0] + r * i.uvScale[0],
									y: i.uvOffset[1] + a * i.uvScale[1]
								};
								e.data["uvScale"] = {
									x: o * i.uvScale[0],
									y: s * i.uvScale[1]
								};
								if (i.trim) {
									e.data["_trimOffsetX"] = i.trim.offsetX;
									e.data["_trimOffsetY"] = i.trim.offsetY;
									e.data["_trimSourceW"] = i.trim.sourceW;
									e.data["_trimSourceH"] = i.trim.sourceH;
								}
							}
							break;
						}
						case "material": {
							const t = i.get(d) ?? 0;
							e.data[l] = t;
							this.recordHandlePath_("material", t, d);
							break;
						}
						case "font": {
							const t = a.get(d) ?? 0;
							e.data[l] = t;
							this.recordHandlePath_("font", t, d);
							break;
						}
						case "mesh":
							e.data[l] = o.get(d) ?? 0;
							break;
						case "environment":
							e.data[l] = s.get(d) ?? 0;
							break;
						case "probeVolume": e.data[l] = c.get(d) ?? 0;
					}
				}
			}
		}
	}
	/** Record scene users only after source IDs have been mapped to live World entities.
	* Resolution is preparation; source IDs cannot be removed by World.onDespawn. */
	trackSceneAssetReferences(e, t) {
		const n = this.refCounter_;
		if (!n) return;
		for (const r of e.entities) {
			const e = t.get(r.id);
			if (e === void 0 || !Array.isArray(r.components)) continue;
			for (const t of r.components) for (const { field: r, type: i } of Re(t.type)) {
				const a = t.data[r];
				if (typeof a !== "number" || !a) continue;
				const o = this.pathForHandle(i, a);
				if (o === null) continue;
				if (i === "texture") n.addTextureRef(o, e);
				else if (i === "material") n.addMaterialRef(o, e);
				else if (i === "font") n.addFontRef(o, e);
			}
		}
	}
	/**
	* Load a texture and get the receipt for THIS acquisition.
	*
	* The difference from {@link loadTexture} is who can be released correctly
	* afterwards: a path names an asset, a lease names the instance this caller
	* was handed. After `invalidate()` those are no longer the same thing.
	*/
	async acquireTexture(e) {
		const { result: t, lease: n } = await this.acquireTextureVariant_(e, true);
		return this.textureLease_(n, t);
	}
	/** {@link acquireTexture} for everything that goes through a typed loader. */
	async acquireTyped(e, t) {
		try {
			return await this.acquireTypedLease_(e, t);
		} catch (e) {
			throw H(e);
		}
	}
	async acquireTypedLease_(e, t) {
		const n = this.resetEpoch_;
		this.assertLoading_(n);
		const r = await this.acquireSlot_(e, t);
		try {
			this.assertLoading_(n);
		} catch (e) {
			r?.release();
			throw e;
		}
		if (r) return r;
		const { value: i, lease: a } = await this.acquireTyped_(e, t);
		return this.typedLease_(e, a, i);
	}
	/**
	* A claim on the slot for a registry-backed asset, or null when this type is
	* not one. The ref the caller spelled is an ALIAS of the slot: a component
	* carries that spelling and looks the asset up by it, while the load path is
	* whatever this realm resolved it to.
	*/
	async acquireSlot_(e, t) {
		const n = this.registryKind_(e);
		if (!n) return null;
		const r = this.assetIdentity_(t);
		const i = t === r ? [r] : [r, t];
		return this.registrySlots_.acquire(n, e, r, i);
	}
	/**
	* The owner-facing receipt for one ledger acquisition.
	*
	* `retain` goes through the ledger rather than through this class's load
	* path: an owner splitting what it holds joins the era it already has, which
	* after an invalidate is not the era a path resolves to.
	*/
	textureLease_(e, t) {
		return {
			key: e.key,
			generation: e.generation,
			value: t,
			release: () => this.releaseTextureLease(e),
			retain: () => {
				const n = this.textureRefs_.retain(e);
				return n ? this.textureLease_(n, t) : null;
			}
		};
	}
	/**
	* A receipt for a texture this engine COMPOSED — no path, no generation, no
	* cache entry to join. Its only identity is the handle, so the last holder
	* destroys it rather than handing it back to a pool that could revive it.
	*/
	ownedTextureLease_(e) {
		return ze(`composed:${e.handle}`, e.handle, e, (e) => {
			E().releaseTexture(e.handle);
			D(e.handle);
		});
	}
	/** {@link textureLease_} for everything that goes through a typed loader. */
	typedLease_(e, t, n) {
		return {
			key: t.key,
			generation: t.generation,
			value: n,
			failedDependencies: t.value.failedDependencies,
			release: () => this.releaseTypedLease(e, t),
			retain: () => {
				const r = this.genericRefs_.retain(t);
				return r ? this.typedLease_(e, r, n) : null;
			}
		};
	}
	releaseTexture(e) {
		const t = this.resolveLoadPath_(e);
		for (const e of [true, false]) {
			const n = this.textureCacheKey_(t, e);
			const r = this.textureRefs_.releaseOldest(n);
			if (!r) continue;
			if (r.ambiguous) Oa(n);
			if (r.exhausted) this.disposeTexture_(n, r.value);
		}
	}
	/**
	* @internal Give back one texture acquisition by its receipt — exact even
	* when `invalidate()` left two generations of the same path live. Callers
	* hold an {@link AssetLease} and use its `release()`.
	*/
	releaseTextureLease(e) {
		const t = this.textureRefs_.release(e);
		if (t?.exhausted) this.disposeTexture_(e.key, t.value);
	}
	/** The last SDK reference to a texture handle is gone: let the C++ pool decide. */
	disposeTexture_(e, t) {
		D(t);
		this.handleToPath_.delete(`texture:${t}`);
		if (this.textureCache_.get(e)?.handle === t) this.textureCache_.delete(e);
		E().releaseTexture(t);
	}
	releaseFont(e) {
		this.releaseTyped("font", e);
	}
	releaseAudio(e) {
		this.releaseTyped("audio", e);
	}
	releaseAnimClip(e) {
		this.releaseTyped("anim-clip", e);
	}
	releaseTimeline(e) {
		this.releaseTyped("timeline", e);
	}
	releaseTilemap(e) {
		this.releaseTyped("tilemap", e);
	}
	releasePrefab(e) {
		this.releaseTyped("prefab", e);
	}
	/**
	* Release a material obtained via {@link loadMaterial}, addressed by its
	* handle (materials are tracked by handle, not ref, in the scene manager).
	* Routes through the shared refcount + cache path so a material shared by
	* two scenes survives until its last owner releases it, and the cache never
	* hands the next load a destroyed handle. Destroying the handle directly
	* (bypassing this) would strand a dead handle in the material cache.
	*/
	releaseMaterial(e) {
		const t = this.pathForHandle("material", e);
		if (t !== null) this.releaseTyped("material", t);
	}
	/**
	* Give back one reference to every asset in `byType` — what a scene, a
	* document or a group acquired, in one call.
	*
	* Materials (handle-keyed) and skeletons (SpineManager's) are skipped.
	* @beta Pre-1.0: the type vocabulary follows the loader registry.
	*/
	releaseAssets(e) {
		for (const [t, n] of e) {
			if (t === "material" || t === "spine") continue;
			for (const e of n) if (t === "texture") this.releaseTexture(e);
			else this.releaseTyped(t, e);
		}
	}
	/**
	* @internal Release one reference to a typed asset by path — the door the
	* group channel table uses. Game code calls the named release* methods.
	*/
	releaseTyped(e, t) {
		const n = e === "spine" ? Fe(this.resolveLoadPath_(t), this.spineAtlasOf_(this.resolveLoadPath_(t))) : this.resolveLoadPath_(t);
		if (this.registryKind_(e)) {
			this.registrySlots_.releaseByName(e, this.assetIdentity_(t));
			return;
		}
		const r = `${e}:${n}`;
		const i = this.genericRefs_.releaseOldest(r);
		if (!i) return;
		if (i.ambiguous) Oa(r);
		if (i.exhausted) this.disposeGeneric_(e, n, i.value);
	}
	/**
	* @internal The typed twin of {@link releaseTextureLease}; callers use the
	* lease's own `release()`.
	*/
	releaseTypedLease(e, t) {
		const n = this.genericRefs_.release(t);
		if (!n?.exhausted) return;
		const r = t.key.slice(e.length + 1);
		this.disposeGeneric_(e, r, n.value);
	}
	/** The last reference to a typed asset is gone: hand it to its loader. */
	disposeGeneric_(e, t, n) {
		const r = this.genericCache_.get(e);
		if (r && r.get(t) === n) r.delete(t);
		this.retire_(e, n);
	}
	/** End one handle-bound era: its loader destroys what it made, then what its
	*  preparation acquired goes back — in that order, since the value is what
	*  is still using it. */
	retire_(e, t) {
		if (this.retired_.has(t)) return;
		this.retired_.add(t);
		const n = t.value?.handle;
		if (typeof n === "number") this.handleToPath_.delete(`${e}:${n}`);
		C([() => this.loaders_.get(e)?.unload?.(t.value), () => t.dependencies.releaseAll()], (e) => e());
	}
	/**
	* Drop every internal cache entry for `ref` so the next `loadTexture` /
	* `loadMaterial` / ... fetches fresh bytes. Call this when the source
	* file changed on disk (hot reload).
	*
	* Any GPU handle that was already handed out stays valid and keeps
	* rendering — that's the caller's concern to release. The next load
	* produces a brand-new handle from the updated bytes; the old handle
	* is evicted from the cache but not freed, so currently-rendering
	* entities don't flicker.
	*
	* If any cache held `ref`, invokes every listener registered via
	* `onInvalidate` with the original ref. Listeners that throw are
	* caught and logged — one bad subscriber can't prevent other
	* subscribers from observing the invalidation.
	*
	* What was BUILT from `ref` ends too. The plan is read BEFORE anything is
	* dropped, and walked deepest-first with each group awaiting the one before
	* it: a parent re-prepared too early acquires the era it already had.
	*
	* Returns true if any cache held `ref` itself.
	*/
	invalidate(e) {
		const t = this.rebuildPlan_(e);
		const n = this.assetIdentity_(e);
		for (const e of this.genericCache_.values()) for (const [t, r] of e.failures()) if (r instanceof Tn && r.sources.some((e) => this.assetIdentity_(e) === n)) e.invalidate(t);
		const { hit: r, rebuilt: i } = this.invalidateSource_(e);
		if (t.length > 0) this.track_(i.then(() => this.rebuildAssetGraph_(t)));
		return r;
	}
	/**
	* Resolves when every propagation started so far has landed.
	*
	* The ASSET graph only. What reads it — a component bound to a handle — is
	* the second barrier, and it moves on a frame rather than here: see the
	* live-binding coordinator's `settled`.
	*
	* @internal
	*/
	async assetGraphSettled() {
		while (this.settling_.size > 0) {
			const e = [...this.settling_];
			await Promise.all(e);
			for (const t of e) this.settling_.delete(t);
		}
	}
	/** What a change to `ref` reaches. Not filtered by path: an asset that
	*  happens to live at the changed file can still be what the chain reaches
	*  LAST, and dropping it there is the same erasure one level up. */
	rebuildPlan_(e) {
		return wn(this.resolveLoadPath_(e), {
			ofSource: (e) => this.dependentsOfSource(e),
			ofAsset: (e) => this.dependentsOfAsset(e)
		});
	}
	/** Count one propagation as in flight until it lands. It answers to nobody
	*  in the ordinary case, so a failure is reported here rather than thrown at
	*  whoever happens to be waiting. */
	track_(e) {
		const t = e.catch((e) => {
			c.warn("asset", "propagating a change failed; what it reached keeps what it has", e);
		});
		this.settling_.add(t);
		t.finally(() => this.settling_.delete(t));
	}
	/** Each group only once everything it was built from has landed. */
	async rebuildAssetGraph_(e) {
		for (const t of e) await Promise.all(t.map((e) => this.invalidateAsset_(e).rebuilt));
	}
	/**
	* End every era at one PATH: a file changed, and whatever it names changed
	* with it. What `invalidate(ref)` is, and what a hot update's changed key is.
	*/
	invalidateSource_(e) {
		let t = false;
		const n = [];
		for (const r of this.loaders_.keys()) {
			const i = this.invalidateAsset_({
				type: r,
				path: e
			});
			t = i.hit || t;
			n.push(i.rebuilt);
		}
		return {
			hit: t,
			rebuilt: Promise.all(n).then(() => void 0)
		};
	}
	/**
	* End ONE asset's era — its type all the way down. A path can name a texture
	* and a material, and what one of them acquired changing is not a change to
	* the other; a plan that knows the difference and then ends both has thrown
	* away what it knew.
	*/
	invalidateAsset_(e) {
		const { type: t } = e;
		const n = this.resolveLoadPath_(e.path);
		let r = false;
		let i;
		if (t === "texture") {
			i = this.textureCache_.get(this.textureCacheKey_(n, true))?.handle ?? 0;
			const e = ie();
			for (const t of [true, false]) {
				const i = this.textureCacheKey_(n, t);
				if (this.textureCache_.invalidate(i)) r = true;
				this.textureRefs_.supersede(i);
				if (typeof e?.invalidateTexturePath === "function" && e.invalidateTexturePath(i)) r = true;
			}
			if (typeof e?.invalidateTexturePath === "function" && e.invalidateTexturePath(n)) r = true;
		} else {
			const e = this.genericCache_.get(t);
			if (e) {
				i = e.get(n)?.value;
				if (e.invalidate(n)) r = true;
			}
			this.genericRefs_.supersede(`${t}:${n}`);
		}
		const a = this.republishSlot_(t, e.path);
		if (this.loaders_.get(t)?.invalidate?.(n)) r = true;
		for (const [e, r] of this.handleToPath_) if (r === n && e.startsWith(`${t}:`)) this.handleToPath_.delete(e);
		if (r) this.fireInvalidate_({
			ref: e.path,
			type: t,
			oldValue: i
		});
		return {
			hit: r || a.found,
			rebuilt: a.rebuilt
		};
	}
	/**
	* Prepare a new era for the slot (type, ref) names, and publish it
	* atomically. By IDENTITY: the slot is keyed by what the asset is, and this
	* preparation resolves where the current revision serves it.
	*/
	republishSlot_(e, t) {
		const n = this.registryKind_(e);
		const r = this.assetIdentity_(t);
		if (!n || !this.registrySlots_.has(e, r)) return {
			found: false,
			rebuilt: Promise.resolve()
		};
		return {
			found: true,
			rebuilt: this.registrySlots_.republish(n, e, r).then(() => void 0, (e) => {
				c.warn("asset", `hot update: re-publishing "${t}" failed; holders keep the era they have`, e);
			})
		};
	}
	/** {@link republishSlot_} for every type this ref names one of — a changed
	*  FILE, which does not say what kind of asset lives at it. */
	republishSlots_(e) {
		const t = [];
		let n = false;
		for (const r of this.loaders_.keys()) {
			const i = this.republishSlot_(r, e);
			n = i.found || n;
			t.push(i.rebuilt);
		}
		return {
			found: n,
			rebuilt: Promise.all(t).then(() => void 0)
		};
	}
	/** Fire every onInvalidate listener with one generation's ending. Isolates
	*  throws. Shared by {@link invalidate} and {@link applyUpdate}. */
	fireInvalidate_(e) {
		for (const t of this.invalidateListeners_) try {
			t(e);
		} catch (e) {
			c.warn("asset", "onInvalidate listener threw", e);
		}
	}
	/**
	* Subscribe to cache invalidations. The listener fires once per
	* successful `invalidate(ref)` call with the original ref (not the
	* resolved path). Returns an unsubscribe function.
	*
	* Typical use: a scene-graph controller or renderer that holds cached
	* handles for assets — subscribe to re-bind / re-load on hot reload
	* so stale GPU handles stop being rendered.
	*/
	onInvalidate(e) {
		this.invalidateListeners_.add(e);
		return () => {
			this.invalidateListeners_.delete(e);
		};
	}
	/**
	* @internal Live entry counts for the resource census.
	*
	* Cache sizes are not expected to return to baseline — that is what a cache
	* is for. `refCounts` and `handlePaths` are: every load handing one out has a
	* release taking it back. `pendingLoads` and `propagations` should be zero at rest.
	*/
	sizes() {
		const e = this.textureCache_.sizes();
		let t = 0;
		let n = e.pending;
		for (const e of this.genericCache_.values()) {
			const r = e.sizes();
			t += r.cached;
			n += r.pending;
		}
		return {
			textureCached: e.cached,
			pendingLoads: n,
			propagations: this.settling_.size,
			refCounts: this.textureRefs_.size + this.genericRefs_.size,
			refRows: this.textureRefs_.rows + this.genericRefs_.rows,
			genericCaches: this.genericCache_.size,
			genericCached: t,
			handlePaths: this.handleToPath_.size,
			invalidateListeners: this.invalidateListeners_.size,
			registrySlots: this.registrySlots_.size,
			trackedRefRows: this.refCounter_?.getTotalRefRows() ?? 0
		};
	}
	/**
	* What is explicitly owned by the whole asset realm.
	*
	* Its life is this instance's. Entity bindings use scene or entity scopes,
	* including runtime entities with no scene, so their resources can end sooner.
	*
	* @internal
	*/
	get appScope() {
		return this.appScope_;
	}
	/**
	* What entities own for themselves — runtime entities with no scene and
	* persistent entities that outlived theirs. Ends at the entity's despawn.
	*
	* @internal
	*/
	get entityScopes() {
		return this.entityScopes_;
	}
	/** @internal A standalone bake uses the same acquisition transaction as a graph recipe. */
	async preparePrefab(e, t = []) {
		const n = this.resetEpoch_;
		try {
			const r = await this.prepared_((n) => this.bakePrefab_(this.resolveLoadPath_(e), n, t));
			if (n !== this.resetEpoch_) {
				r.dependencies.releaseAll();
				throw new Error(`Assets were released while "${e}" was preparing; it has no owner. Load it again.`);
			}
			return {
				...r,
				ref: e,
				release: () => r.dependencies.releaseAll()
			};
		} catch (e) {
			throw H(e);
		}
	}
	releaseAll() {
		if (this.releasing_) return;
		this.releasing_ = true;
		this.resetEpoch_++;
		this.abandoned_.clear();
		try {
			C([
				() => {
					const e = [...this.preparations_];
					this.preparations_.clear();
					C(e, (e) => e.rollback());
				},
				() => this.appScope_.releaseAll(),
				() => this.registrySlots_.releaseAll(),
				() => {
					const e = /* @__PURE__ */ new Set();
					for (const t of this.textureCache_.values()) e.add(t.handle);
					this.textureCache_.clearAll();
					for (const { value: t } of this.textureRefs_.drain()) e.add(t);
					if (e.size === 0) return;
					const t = E();
					C([...e], (e) => {
						D(e);
						t.releaseTexture(e);
					});
				},
				() => {
					for (const e of this.genericCache_.values()) e.clearAll();
					this.genericCache_.clear();
					const e = this.genericRefs_.drain();
					C(e, ({ key: e, value: t }) => this.retire_(e.slice(0, e.indexOf(":")), t));
				}
			], (e) => e());
		} finally {
			const e = this.getLoader("mesh");
			if (e instanceof Fr) for (const t of this.builtMeshes_.keys()) e.releaseData(t);
			this.builtMeshes_.clear();
			this.handleToPath_.clear();
			this.releasing_ = false;
		}
	}
	getTextureLoader() {
		return this.textureLoader_;
	}
	/**
	* What the textures this realm loaded became on the GPU, and which compressed
	* formats the device samples at all. @experimental
	*
	* The upload half; what the BUILD shipped is the cook's own record. A realm
	* that plays source images still answers `deviceFormats` — the capability a
	* cooked payload would meet here.
	*/
	textureFormatReport() {
		return this.textureLoader_.formatReport();
	}
	setAssetRefResolver(e) {
		this.assetRefResolver_ = e;
	}
	/**
	* What is wrong with an asset that loaded: the parts of it that were left out, each said once. Empty when it is whole (or was never
	* loaded). A material whose texture would not load, or whose value has a shape nothing reads, is here and not in a failed load.
	* @experimental
	*/
	getAssetProblems(e) {
		return this.assetProblems_.get(e) ?? [];
	}
	/** Hear every change to an asset's problems (the editor's diagnostics). One listener; null removes it. @experimental */
	setAssetProblemListener(e) {
		this.assetProblemListener_ = e;
	}
	getAssetRefResolver() {
		return this.assetRefResolver_;
	}
	/**
	* Attach optional usage monitoring. Scene publication records runtime
	* entity IDs through trackSceneAssetReferences; the shared World binding
	* removes them on despawn and follows the active asset resource. Plugin
	* and runtime factories install it; manually created Assets default to
	* no tracking until a counter is attached.
	*/
	setRefCounter(e) {
		this.refCounter_ = e;
	}
	getRefCounter() {
		return this.refCounter_;
	}
	/**
	* Resolve any serialized asset ref (UUID or plain path) to a concrete
	* path. Returns null when a UUID ref can't be matched to a known
	* asset. Without a registry/resolver configured, refs pass through
	* unchanged — legacy path-only scenes keep working.
	*/
	resolveRef(e) {
		if (bt(e)) return e;
		if (this.assetRefResolver_) return this.assetRefResolver_(e);
		return e;
	}
	/**
	* The load path a ref resolves to — resolver plus addressable Catalog,
	* the same two steps every typed load performs. This is the key a loader
	* registers a data asset under, so runtime stores keyed by registration
	* path (FSM/BT/timeline/tilemap via `resolveAssetKey`) must look up with
	* THIS: `resolveRef` alone diverges once the Catalog carries mappings.
	*/
	resolveLoadPath(e) {
		return this.resolveLoadPath_(e);
	}
	/**
	* Canonical path-resolution for all typed load methods.
	* Runs the AssetRefResolver first so `@uuid:...` refs map to their real
	* project path, then applies the addressable Catalog for any further
	* indirection. If the resolver returns null (unknown UUID), we fall back
	* to the Catalog on the original ref — the loader will 404 with a clear
	* error rather than silently succeeding on a nonsense URL.
	*
	* Historically each load method called `this.catalog.resolve(ref)`
	* directly, which completely bypassed the AssetRefResolver. Editors that
	* serialized asset refs as `@uuid:...` could never resolve them at load
	* time — textures silently rendered white. This helper closes that gap.
	*/
	resolveLoadPath_(e) {
		if (bt(e)) return e;
		const t = this.remoteAssetPath_(e);
		if (t != null) return t;
		const n = this.assetRefResolver_?.(e) ?? e;
		return this.catalog.resolve(n);
	}
	/** CDN url of `ref` when it names a `remote`-group asset AND a remote root is
	*  set; null otherwise (caller falls back to the normal resolver). */
	remoteAssetPath_(e) {
		if (!this.remoteRoot_) return null;
		const t = this.manifestModel_;
		if (!t) return null;
		const n = e.startsWith("@uuid:") ? e.slice(Ee.length).toLowerCase() : e;
		const r = t.remoteAssetPath(n) ?? t.remoteAssetPath(e);
		return r != null ? this.remoteUrlFor_(r) : null;
	}
	/**
	* What a ref MEANS in this realm, with no revision in it.
	*
	* Distinct from {@link resolveLoadPath_}, which goes on to where that asset
	* is served from NOW. Identity is what a slot is keyed by and what two
	* spellings agree on; a locator is what one preparation reads.
	*/
	assetIdentity_(e) {
		if (Pr(e)) return e;
		const t = this.manifestModel_?.remoteAssetIdentity(e);
		if (t != null) return t;
		const n = this.assetRefResolver_?.(e) ?? e;
		return this.catalog.resolve(n);
	}
	registerBuiltinLoaders() {
		this.register(this.textureLoader_);
		this.register(this.spineLoader_);
		this.register(new Jn());
		this.register(new Gn());
		this.register(new vi());
		const e = () => this.module_ ?? a();
		this.register(new Fr(e));
		this.register(new Ir(e));
		this.register(new Lr(e));
		this.register(new Ur());
		this.register(new Yr());
		this.register(new yi(() => this.getAudio_()));
		this.register(new Ji());
		this.register(new Yi());
		this.register({
			type: "prepared-prefab",
			extensions: [],
			load: (e, t) => this.bakePrefab_(e, t),
			unload: (e) => e.release()
		});
		this.register(new la());
		this.register(new ua());
		this.register(new ba());
		for (const e of _t()) this.register(e);
	}
	textureCacheKey_(e, t) {
		return Nn(e, t);
	}
	async loadTyped(e, t) {
		try {
			return (await this.acquireTyped_(e, t)).value;
		} catch (e) {
			throw H(e);
		}
	}
	async acquireTyped_(e, t) {
		const n = this.loaders_.get(e);
		if (!n) throw new Error(`No loader registered for type: ${e}`);
		if (!n.load) throw new Error(`Loader for "${e}" publishes by name; acquire it through its slot`);
		const r = n.load.bind(n);
		const i = this.resolveLoadPath_(t);
		return this.acquirePrepared_(e, i, t, (e) => r(i, e));
	}
	/**
	* One era of one handle-bound asset, under the KEY that identifies it — the
	* path for everything whose identity is a path, and the PAIR for spine,
	* whose skeleton with another atlas is another asset. One ownership
	* algorithm, differing only in what it calls one asset.
	*/
	async acquirePrepared_(e, t, n, r) {
		this.assertLoading_();
		const i = this.resetEpoch_;
		const a = await this.genericCacheFor_(e).getOrLoad(t, () => this.prepared_(async (e) => ({ value: await r(e) })));
		if (i !== this.resetEpoch_) {
			this.retire_(e, a);
			throw new Error(`Assets were released while "${n}" was loading; it has no owner. Load it again.`);
		}
		const o = this.genericRefs_.acquire(`${e}:${t}`, a);
		const s = a.value;
		const c = s?.handle;
		if (typeof c === "number" && c !== 0) this.recordHandlePath_(e, c, t);
		return {
			value: s,
			lease: o
		};
	}
	/** The cache of current eras for one handle-bound type. A load that lands
	*  after its own deadline was never handed to anyone, so this is the last
	*  place that knows it and what it acquired. */
	genericCacheFor_(e) {
		let t = this.genericCache_.get(e);
		if (!t) {
			t = new Dn((t) => this.retire_(e, t));
			this.genericCache_.set(e, t);
		}
		return t;
	}
	/**
	* What THIS realm publishes for a ref-bound asset — the answer a runtime
	* lookup reads, and the only copy of it.
	*
	* By the ref as spelled or the path it resolves to: a slot answers to both,
	* so a lookup site need not know which spelling a scene serialized.
	*
	* @internal
	*/
	resolveRegistryAsset(e, t) {
		return this.registrySlots_.published(e, t) ?? this.registrySlots_.published(e, this.assetIdentity_(t));
	}
	/** @internal Changes when a registry type publishes, replaces or withdraws an era. */
	registryAssetVersion(e) {
		return this.registrySlots_.version(e);
	}
	/**
	* What the current era of a ref-bound asset took — the dependency graph as a
	* PROJECTION of acquisitions, never a table anyone maintains.
	*
	* @internal
	*/
	dependenciesOf(e, t) {
		const n = this.registrySlots_.dependenciesOf(e, t);
		if (n.length > 0) return n;
		const r = this.registrySlots_.dependenciesOf(e, this.assetIdentity_(t));
		if (r.length > 0) return r;
		return this.genericCache_.get(e)?.get(this.resolveLoadPath_(t))?.edges ?? [];
	}
	/**
	* The asset types a component holds BY HANDLE — the loaders with a `load`
	* door. What a live rebind can migrate: a ref-bound asset's slot swaps
	* under the name a field already holds, so there is nothing to move.
	*
	* @internal
	*/
	handleBoundTypes() {
		const e = [];
		for (const [t, n] of this.loaders_) if (n.load) e.push(t);
		return e;
	}
	/**
	* Every asset of this realm whose CURRENT era took `ref` — the reverse of
	* {@link dependenciesOf}, walked from the eras so there is no table to keep.
	* By canonical identity: a receipt says what the acquisition ASKED for (a
	* `@uuid:` ref, a document-relative path) and a change names a file.
	*
	* @internal
	*/
	dependentsOfSource(e) {
		return this.dependents_(e, Cn);
	}
	/**
	* Every asset of this realm that ACQUIRED this one — the edge to follow once
	* the walk is past the file that changed. A source read is NOT one: those
	* bytes are exactly as their reader read them, and what ended here is this
	* asset's own generation.
	*
	* @internal
	*/
	dependentsOfAsset(e) {
		return this.dependents_(e.path, (t) => t.kind === "owned" && t.type === e.type);
	}
	/** Every era with an edge that `names` — the walk both doors share. */
	dependents_(e, t) {
		const n = /* @__PURE__ */ new Map();
		const r = (e) => {
			let t = n.get(e);
			if (t === void 0) {
				t = this.resolveLoadPath_(e);
				n.set(e, t);
			}
			return t;
		};
		const i = r(e);
		const a = [];
		for (const e of this.eras_()) if (e.edges.some((e) => t(e) && r(e.path) === i)) a.push({
			type: e.type,
			path: e.path
		});
		return a;
	}
	/** Every live era of this realm, published under a name or held by handle. */
	*eras_() {
		for (const e of this.registrySlots_.eras()) yield {
			type: e.type,
			path: e.key,
			edges: e.edges
		};
		const e = /* @__PURE__ */ new Set();
		for (const [t, n] of this.genericCache_) for (const [r, i] of n.entries()) {
			e.add(i);
			yield {
				type: t,
				path: r,
				edges: i.edges
			};
		}
		for (const [t, n] of this.genericRefs_.entries()) {
			const r = t.indexOf(":");
			const i = t.slice(0, r), a = t.slice(r + 1);
			for (const { value: t } of n) {
				if (e.has(t)) continue;
				e.add(t);
				yield {
					type: i,
					path: a,
					edges: t.edges
				};
			}
		}
	}
	/**
	* Everything this realm publishes of one type. What a schedule analysis
	* reads to learn what the graphs THIS app loaded reach for.
	*
	* @internal
	*/
	publishedRegistryAssets(e) {
		return this.registrySlots_.publishedOf(e);
	}
	/**
	* The slot table's view of one registry-backed loader — the LoadContext
	* bound in, so the table stays about ownership and knows nothing about how
	* any particular kind of asset is parsed.
	*/
	registryKind_(e) {
		const t = this.loaders_.get(e)?.registry;
		if (!t) return null;
		return { prepare: (e) => this.prepared_((n) => t.prepare(this.resolveLoadPath_(e), n)) };
	}
	/** A generation-bound recipe through the ordinary typed-asset door. */
	preparePrefabLease_(e) {
		return this.acquireTypedLease_("prepared-prefab", e);
	}
	bakePrefab_(e, t, n = []) {
		return Xi({
			loadPrefab: async (e) => (await t.acquireAsset("prefab", e)).value,
			preloadSceneAssets: (e) => this.preloadSceneAssets_(e, void 0, void 0, t.recorder),
			resolveSceneAssetPaths: (e, t) => this.resolveSceneAssetPaths(e, t),
			trackSceneAssetReferences: (e, t) => this.trackSceneAssetReferences(e, t),
			resolveRef: (e) => this.resolveRef(e),
			entityScopes: this.entityScopes
		}, e, n);
	}
	/**
	* Run one preparation: what the loader takes IS the result's ownership and
	* IS the graph's edges. A transaction, because an acquisition on the way to
	* a value that never arrives has no owner — the thing that would have held
	* it does not exist.
	*/
	async prepared_(e) {
		this.assertLoading_();
		const t = new En();
		this.preparations_.add(t);
		try {
			return t.commit(await e(this.recordingContext_(t)));
		} catch (e) {
			throw t.abort(e);
		} finally {
			this.preparations_.delete(t);
		}
	}
	/** The load context one preparation sees: every door that takes something
	*  reports it, and the plain readers stay plain. */
	recordingContext_(e) {
		const t = this.getLoadContext_();
		const n = this.resetEpoch_;
		const r = async (t, r) => {
			try {
				this.assertLoading_(n);
				return await r();
			} catch (n) {
				e.failed(t, n);
				throw H(n);
			}
		};
		const i = async (e, t) => {
			const i = await r(e, t);
			this.assertLoading_(n);
			return i;
		};
		const a = async (t, i, a) => {
			const o = e.own(t, await r(t, i), a);
			this.assertLoading_(n);
			return o;
		};
		return {
			...t,
			recorder: e,
			loadText: (e) => i(e, () => t.loadText(e)),
			loadBinary: (e) => i(e, () => t.loadBinary(e)),
			loadTexture: (e, n) => i(e, () => t.loadTexture(e, n)),
			decodePixels: (e) => i(e, () => t.decodePixels(e)),
			acquireTexture: async (e, n) => a(e, () => t.acquireTexture(e, n), "texture"),
			acquireAsset: async (e, t) => a(t, () => this.acquireTypedLease_(e, t), e),
			resolveRef: (e) => this.resolveRef(e),
			preparePrefab: async (e) => a(e, () => this.preparePrefabLease_(e), "prepared-prefab"),
			createOwnedTexture: async (r, i, a, o) => {
				this.assertLoading_(n);
				const s = await t.createOwnedTexture(r, i, a, o);
				e.own(`composed:${s.value.handle}`, s);
				this.assertLoading_(n);
				return s;
			},
			readSource: async (n) => {
				e.read(n);
				return i(n, () => t.loadText(this.catalog.getBuildPath(n)));
			}
		};
	}
	getLoadContext_() {
		if (this.loadContext_) return this.loadContext_;
		const e = this;
		this.loadContext_ = {
			backend: this.backend,
			catalog: this.catalog,
			resourceManager: E(),
			async loadTexture(t, n) {
				if (n === false) return e.loadTextureRaw(t);
				return e.loadTexture(t);
			},
			async acquireTexture(t, n) {
				const { result: r, lease: i } = await e.acquireTextureVariant_(t, n !== false);
				return e.textureLease_(i, r);
			},
			noteAssetProblems(t, n) {
				const r = e.resolveLoadPath_(t);
				const i = (e.assetProblems_.get(r) ?? []).join("\n") === n.join("\n");
				if (n.length === 0) e.assetProblems_.delete(r);
				else e.assetProblems_.set(r, [...n]);
				if (!i) e.assetProblemListener_?.(r, n);
			},
			noteMaterialTexture(t, n) {
				if (e.meshMaterials_.has(e.resolveLoadPath_(t)) || e.meshMaterials_.has(t)) e.meshTextures_.add(e.resolveLoadPath_(n));
			},
			async acquireAsset(t, n) {
				return e.acquireTyped(t, n);
			},
			async loadText(t) {
				return e.backend.fetchText(e.backend.resolveUrl(t));
			},
			async loadBinary(t) {
				return e.backend.fetchBinary(e.backend.resolveUrl(t));
			},
			async decodePixels(t) {
				const n = e.textureLoader_.pixelDecoder;
				if (n) return n(t, false);
				return Ze(e.backend.resolveUrl(e.catalog.getBuildPath(t)));
			},
			async createTextureFromPixels(t, n, r, i) {
				return e.textureLoader_.loadFromPixels(t, n, r, i, O.Retained);
			},
			async createOwnedTexture(t, n, r, i) {
				return e.ownedTextureLease_(await e.textureLoader_.loadFromPixels(t, n, r, i, O.Retained));
			},
			getAudio() {
				return e.getAudio_();
			},
			getSpriteAnimation() {
				return e.getSpriteAnimation_();
			},
			getLocalization() {
				return e.getLocalization_();
			}
		};
		return this.loadContext_;
	}
};
//#endregion
//#region src/asset/Backend.ts
function Ma(e) {
	return /^https?:\/\//i.test(e);
}
/**
* Content cache first: hot update wrote its verified, content-addressed (immutable)
* assets to the platform's disk store keyed by this url, so they load offline and
* skip the CDN. Only remote urls are ever written, so anything else just fetches.
*/
async function Na(e, t) {
	if (Ma(e)) {
		const t = await d(e);
		if (t) return t;
	}
	const n = await p(e, { responseType: "arraybuffer" });
	if (!n.ok) throw new Error(`Failed to fetch '${t}': ${n.status} ${n.statusText}`);
	return n.arrayBuffer();
}
async function Pa(e, t) {
	const n = await p(e);
	if (!n.ok) throw new Error(`Failed to fetch '${t}': ${n.status} ${n.statusText}`);
	return n.text();
}
var Fa = class {
	constructor(e) {
		this.baseUrl_ = e.baseUrl.replace(/\/+$/, "");
	}
	async fetchBinary(e) {
		return Na(this.resolveUrl(e), e);
	}
	async fetchText(e) {
		return Pa(this.resolveUrl(e), e);
	}
	resolveUrl(e) {
		if (e.startsWith("/") || e.includes("://")) return e;
		return this.baseUrl_ ? `${this.baseUrl_}/${e}` : e;
	}
	setBaseUrl(e) {
		this.baseUrl_ = e.replace(/\/+$/, "");
	}
};
/**
* Reads assets from the platform filesystem (WeChat `wx.getFileSystemManager`).
* Paths are already resolved build paths (the runtime's `resolveRef` maps
* uuid→build path before fetch), so `resolveUrl` is identity — there is no URL,
* the path IS the file location.
*/
var Ia = class {
	async fetchBinary(e) {
		return Ma(e) ? Na(e, e) : m(e);
	}
	async fetchText(e) {
		return Ma(e) ? Pa(e, e) : h(e);
	}
	resolveUrl(e) {
		return e;
	}
};
var La = class {
	constructor(e) {
		this.assets_ = new Map(Object.entries(e));
	}
	async fetchBinary(e) {
		const t = this.getDataUrl(e);
		const n = t.slice(t.indexOf(",") + 1);
		const r = atob(n);
		const i = new Uint8Array(r.length);
		for (let e = 0; e < r.length; e++) i[e] = r.charCodeAt(e);
		return i.buffer;
	}
	async fetchText(e) {
		const t = this.getDataUrl(e);
		if (t.startsWith("data:") && t.includes(";base64,")) {
			const e = t.slice(t.indexOf(",") + 1);
			const n = atob(e);
			const r = new Uint8Array(n.length);
			for (let e = 0; e < n.length; e++) r[e] = n.charCodeAt(e);
			return new TextDecoder().decode(r);
		}
		return t;
	}
	resolveUrl(e) {
		return this.assets_.get(e) ?? e;
	}
	has(e) {
		return this.assets_.has(e);
	}
	getDataUrl(e) {
		if (e.startsWith("data:")) return e;
		const t = this.assets_.get(e);
		if (!t) throw new Error(`EmbeddedBackend: asset not found: ${e}`);
		return t;
	}
};
//#endregion
//#region src/asset/basisTranscoder.ts
/** Numeric format contract shared with BasisModuleEntry.cpp::mapFormat. */
const Ra = {
	["etc2-rgba8"]: 0,
	["astc-4x4"]: 1,
	["s3tc-dxt5"]: 2
};
const za = 3;
/** Adapts a loaded basis wasm module to the {@link BasisTranscoder} interface. */
var Ba = class {
	constructor(e) {
		this.mod = e;
	}
	transcode(e, t) {
		return this.run_(e, Ra[t]);
	}
	transcodeToRgba(e) {
		return this.run_(e, 3);
	}
	run_(e, t) {
		return Va(this.mod, e, t);
	}
};
/**
* Every level of `ktx2` transcoded to format `code`, level 0 first, or null when
* level 0 will not come out. Self-contained on purpose — it names nothing outside
* itself — because a transcode worker is built from its source text, and a
* second copy of this loop is how the two would drift.
*/
function Va(e, t, n) {
	const r = e._malloc(t.length);
	if (!r) return null;
	try {
		e.HEAPU8.set(t, r);
		if (!e._es_basis_open(r, t.length)) return null;
		try {
			const t = typeof e._es_basis_transcode_level === "function";
			const r = t ? Math.max(1, e._es_basis_level_count()) : 1;
			const i = [];
			for (let a = 0; a < r; a++) {
				const r = t ? e._es_basis_level_width(a) : e._es_basis_get_width();
				const o = t ? e._es_basis_level_height(a) : e._es_basis_get_height();
				const s = t ? e._es_basis_level_size(n, a) : e._es_basis_transcoded_size(n);
				let c = null;
				const l = s > 0 ? e._malloc(s) : 0;
				if (l) try {
					if (t ? e._es_basis_transcode_level(n, a, l, s) : e._es_basis_transcode(n, l, s)) c = e.HEAPU8.slice(l, l + s);
				} finally {
					e._free(l);
				}
				if (!c) {
					if (a === 0) return null;
					break;
				}
				i.push({
					width: r,
					height: o,
					data: c
				});
			}
			return {
				width: i[0].width,
				height: i[0].height,
				data: i[0].data,
				levels: i
			};
		} finally {
			e._es_basis_close();
		}
	} finally {
		e._free(r);
	}
}
/**
* Adapt an already-instantiated basis module (acquired through the realm's
* {@link SideModuleHost}.acquire('basis')) to the {@link BasisTranscoder} seam.
* Inits the transcoder tables (idempotent) and wraps the module — the bridge the
* texture loaders use so KTX2 assets transcode on demand, the same way physics /
* spine modules are acquired.
*/
function Ha(e) {
	e._es_basis_init();
	return new Ba(e);
}
//#endregion
//#region src/asset/basisWorkers.ts
function Ua() {
	return `'use strict';
const transcodeKtx2Levels = ${Va.toString()};
let ready = null;
self.onmessage = (e) => {
    const m = e.data;
    if (m.init) {
        // Instantiated as the main thread does it (host.ts instantiateWithBytes),
        // with the same gate, so a binary that will not compile fails the load
        // rather than leaving it waiting.
        ready = (async () => {
            importScripts(URL.createObjectURL(new Blob([m.glueText], { type: 'text/javascript' })));
            let fail;
            const gate = new Promise((_, reject) => { fail = reject; });
            const mod = await Promise.race([self[m.globalName]({
                instantiateWasm(imports, cb) {
                    WebAssembly.instantiate(m.wasmBytes, imports).then((r) => cb(r.instance, r.module), fail);
                    return {};
                },
            }), gate]);
            mod._es_basis_init();
            return mod;
        })();
        // Reported with the first transcode it fails, not as an unhandled rejection now.
        ready.catch(() => {});
        return;
    }
    ready.then((mod) => {
        const r = transcodeKtx2Levels(mod, m.bytes, m.code);
        self.postMessage({ id: m.id, result: r }, r ? r.levels.map((l) => l.data.buffer) : []);
    }).catch((err) => self.postMessage({ id: m.id, error: String(err && err.message || err) }));
};
`;
}
/**
* A transcoder whose work runs on `count` workers, or null where this realm has
* no `Worker` (mini-game hosts, node) — the caller then transcodes in place.
*
* The caller owns the workers: each holds its own instance of the module, and a
* running worker is never collected, so they last until {@link WorkerBasisTranscoder.dispose}.
*/
function Wa(e, t) {
	if (typeof Worker === "undefined" || typeof Blob === "undefined" || typeof URL?.createObjectURL !== "function") return null;
	const n = URL.createObjectURL(new Blob([Ua()], { type: "text/javascript" }));
	const r = /* @__PURE__ */ new Map();
	let i = 1;
	const a = [];
	try {
		for (let i = 0; i < Math.max(1, t); i++) {
			const t = new Worker(n);
			t.onmessage = (e) => {
				const t = r.get(e.data.id);
				if (!t) return;
				r.delete(e.data.id);
				if (e.data.error !== void 0) t.reject(/* @__PURE__ */ new Error(`transcode worker: ${e.data.error}`));
				else t.resolve(e.data.result ?? null);
			};
			t.onerror = (e) => {
				const t = /* @__PURE__ */ new Error(`transcode worker: ${e.message || "the worker stopped"}`);
				for (const [e, n] of r) {
					r.delete(e);
					n.reject(t);
				}
			};
			t.postMessage({
				init: true,
				glueText: e.glueText,
				globalName: e.globalName,
				wasmBytes: e.wasmBytes.slice(0)
			});
			a.push(t);
		}
	} finally {
		URL.revokeObjectURL(n);
	}
	const o = new Array(a.length).fill(0);
	let s = false;
	const c = (e, t) => {
		if (s) return Promise.resolve(null);
		const n = o.indexOf(Math.min(...o));
		const c = i++;
		o[n]++;
		return new Promise((i, o) => {
			r.set(c, {
				resolve: i,
				reject: o
			});
			a[n].postMessage({
				id: c,
				bytes: e,
				code: t
			});
		}).finally(() => {
			o[n]--;
		});
	};
	return {
		transcode: (e, t) => c(e, Ra[t]),
		transcodeToRgba: (e) => c(e, 3),
		dispose() {
			if (s) return;
			s = true;
			for (const e of a) e.terminate();
			for (const [e, t] of r) {
				r.delete(e);
				t.resolve(null);
			}
		}
	};
}
/** Workers to transcode on: the cores beside the main thread, at most four. */
function Ga() {
	const e = typeof navigator !== "undefined" ? navigator.hardwareConcurrency ?? 2 : 2;
	return Math.max(1, Math.min(4, e - 1));
}
/**
* The realm's KTX2 transcoder: its basis module on the main thread, and workers
* in front of it where the host can hand over the module's source and the realm
* has `Worker`. A worker that fails once (a CSP refusing blob workers, a module
* that will not start) sends that load and every later one to the main thread.
*
* The workers are the host's: they stop when it is disposed, which is what an App
* does on quit. A realm that starts a game over and over would otherwise keep
* every earlier game's workers, each with a WebAssembly memory of its own.
*/
function Ka(e) {
	if (!e) return Promise.resolve(null);
	let t = qa.get(e);
	if (!t) {
		t = Ja(e);
		qa.set(e, t);
	}
	return t;
}
const qa = /* @__PURE__ */ new WeakMap();
async function Ja(e) {
	const t = await e.acquire("basis");
	if (!t) return null;
	const n = Ha(t);
	const r = e.source ? await e.source("basis").catch(() => null) : null;
	const i = r ? Wa(r, Ga()) : null;
	if (!i) return n;
	e.onDispose?.(() => i.dispose());
	let a = false;
	const o = (e, t) => {
		if (a) return Promise.resolve(t());
		return Promise.resolve(e()).catch((e) => {
			a = true;
			i.dispose();
			c.warn("asset", "KTX2 transcoding moved back to the main thread: the transcode workers failed", e);
			return t();
		});
	};
	return {
		transcode: (e, t) => o(() => i.transcode(e, t), () => n.transcode(e, t)),
		transcodeToRgba: (e) => o(() => i.transcodeToRgba(e), () => n.transcodeToRgba(e))
	};
}
//#endregion
//#region src/asset/AssetRefCounter.ts
var Ya = class {
	constructor() {
		this.refs_ = /* @__PURE__ */ new Map();
		this.pathsByEntity_ = /* @__PURE__ */ new Map();
		this.rows_ = 0;
	}
	add(e, t) {
		let n = this.refs_.get(e);
		if (!n) {
			n = /* @__PURE__ */ new Set();
			this.refs_.set(e, n);
		}
		if (n.has(t)) return;
		n.add(t);
		let r = this.pathsByEntity_.get(t);
		if (!r) this.pathsByEntity_.set(t, r = /* @__PURE__ */ new Set());
		r.add(e);
		this.rows_++;
	}
	remove(e, t) {
		const n = this.refs_.get(e);
		if (n?.delete(t)) {
			this.rows_--;
			if (n.size === 0) this.refs_.delete(e);
			const r = this.pathsByEntity_.get(t);
			r?.delete(e);
			if (r?.size === 0) this.pathsByEntity_.delete(t);
		}
	}
	getCount(e) {
		return this.refs_.get(e)?.size ?? 0;
	}
	getRefs(e) {
		return Array.from(this.refs_.get(e) ?? []);
	}
	getAll() {
		const e = [];
		for (const [t, n] of this.refs_) e.push({
			assetPath: t,
			refCount: n.size,
			entities: Array.from(n)
		});
		return e;
	}
	removeEntity(e) {
		const t = this.pathsByEntity_.get(e);
		if (!t) return;
		this.pathsByEntity_.delete(e);
		for (const n of t) {
			const t = this.refs_.get(n);
			if (t.delete(e)) this.rows_--;
			if (t.size === 0) this.refs_.delete(n);
		}
	}
	get size() {
		return this.refs_.size;
	}
	get rows() {
		return this.rows_;
	}
	clear() {
		this.refs_.clear();
		this.pathsByEntity_.clear();
		this.rows_ = 0;
	}
};
var Xa = class {
	constructor() {
		this.textures_ = new Ya();
		this.fonts_ = new Ya();
		this.materials_ = new Ya();
	}
	addTextureRef(e, t) {
		this.textures_.add(e, t);
	}
	removeTextureRef(e, t) {
		this.textures_.remove(e, t);
	}
	getTextureRefCount(e) {
		return this.textures_.getCount(e);
	}
	getTextureRefs(e) {
		return this.textures_.getRefs(e);
	}
	getAllTextureRefs() {
		return this.textures_.getAll();
	}
	addFontRef(e, t) {
		this.fonts_.add(e, t);
	}
	removeFontRef(e, t) {
		this.fonts_.remove(e, t);
	}
	getFontRefCount(e) {
		return this.fonts_.getCount(e);
	}
	getFontRefs(e) {
		return this.fonts_.getRefs(e);
	}
	getAllFontRefs() {
		return this.fonts_.getAll();
	}
	addMaterialRef(e, t) {
		this.materials_.add(e, t);
	}
	removeMaterialRef(e, t) {
		this.materials_.remove(e, t);
	}
	getMaterialRefCount(e) {
		return this.materials_.getCount(e);
	}
	getMaterialRefs(e) {
		return this.materials_.getRefs(e);
	}
	getAllMaterialRefs() {
		return this.materials_.getAll();
	}
	removeAllRefsForEntity(e) {
		this.textures_.removeEntity(e);
		this.fonts_.removeEntity(e);
		this.materials_.removeEntity(e);
	}
	clear() {
		this.textures_.clear();
		this.fonts_.clear();
		this.materials_.clear();
	}
	getTotalRefCount() {
		return {
			textures: this.textures_.size,
			fonts: this.fonts_.size,
			materials: this.materials_.size
		};
	}
	/**
	* Total (asset, entity) pairs held, across every kind — the number a
	* spawn/despawn round trip must conserve.
	*
	* {@link getTotalRefCount} counts distinct PATHS, which understates a leak:
	* ten thousand entities that never released one texture read as a single ref.
	*/
	getTotalRefRows() {
		return this.textures_.rows + this.fonts_.rows + this.materials_.rows;
	}
};
//#endregion
//#region src/asset/assetReferenceTracking.ts
const Za = /* @__PURE__ */ new WeakSet();
/**
* Bind a World to the asset layer of its App — one call on every core (web,
* packaged, native). Two things a world needs from it:
*   * references are dropped when an entity goes;
*   * an asset PATH written into an engine-backed component at run time
*     (`cmds.spawn().insert(Sprite, { texture: 'assets/hero.png' })`) is loaded
*     and replaced by its handle, through the same preload and resolve a scene
*     file goes through, and held for as long as the entity is.
* `current` is read at notification time, so a replaced Assets is the one used.
*/
function Qa(e, t, n) {
	if (!t.getRefCounter()) t.setRefCounter(new Xa());
	if (Za.has(e)) return;
	Za.add(e);
	e.onDespawn((e) => n()?.getRefCounter()?.removeAllRefsForEntity(e));
	e.setAssetFieldResolver((t, r, i) => {
		const a = n();
		if (a && ie()) $a(e, a, t, r, i);
	});
}
/** The fields this component was given as paths, loaded, and written in as handles once they are. */
async function $a(e, t, n, r, i) {
	const a = { ...i };
	const o = {
		version: 4,
		name: `${r._name}@${n}`,
		entities: [{
			id: 0,
			name: "",
			parent: null,
			children: [],
			components: [{
				type: r._name,
				data: a
			}],
			visible: true
		}]
	};
	try {
		const s = await t.preloadSceneAssets(o);
		const l = Pe(o, s, t.entityScopes, t.resolveRef?.bind(t));
		t.resolveSceneAssetPaths(o, s);
		try {
			if (!e.valid(n) || !e.has(n, r)) return;
			for (const e of s.missing) c.warn("asset", `${r._name} on entity ${n}: could not load "${e.ref}"`);
			const t = e.get(n, r);
			const o = r._default;
			const u = {};
			for (const [e, n] of Object.entries(a)) if (typeof i[e] === "string") {
				if (t[e] === (o[e] ?? 0)) u[e] = n;
			} else if (n !== i[e]) u[e] = n;
			if (Object.keys(u).length === 0) return;
			e.set(n, r, {
				...t,
				...u
			});
			l?.().attach(e, /* @__PURE__ */ new Map([[0, n]]));
		} finally {
			s.scope.releaseAll();
		}
	} catch (e) {
		c.warn("asset", `${r._name} on entity ${n}: loading its asset paths failed`, e);
	}
}
//#endregion
//#region src/audio/Audio.ts
/** `./a//b.mp3` and `a/b.mp3` are one clip. */
function eo(e) {
	return e.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/{2,}/g, "/");
}
const to = /* @__PURE__ */ new WeakMap();
/** Internal host suspension, preserving explicit Audio.suspend/resume intent. */
function no(e, t, n) {
	const r = to.get(e);
	if (!r) return;
	if (n) r.owners.add(t);
	else r.owners.delete(t);
	r.sync();
}
/**
* Per-app audio API. Each `App` owns an `AudioAPI` instance (created by
* `AudioPlugin.build()`), exposed via the `Audio` resource.
*
* Consumed as a resource: declare `Res(Audio)` as a system param or
* grab it with `app.getResource(Audio)` outside ECS code.
*/
/** A playing voice this API owns the volume of: base × bus gain × fade. */
/**
* How many voices sound at once before `priority` decides. Beyond a couple of
* dozen a listener hears loudness, not sounds, and a phone pays for every one.
*/
const ro = 32;
/** The answer to "play this" when the pool is full and this voice lost: a handle
*  that behaves like one whose sound already ended, so no caller special-cases it. */
function io() {
	return {
		id: 0,
		stop() {},
		pause() {},
		resume() {},
		setVolume() {},
		setPan() {},
		setLoop() {},
		setPlaybackRate() {},
		get isPlaying() {
			return false;
		},
		get currentTime() {
			return 0;
		},
		get duration() {
			return 0;
		}
	};
}
var ao = class {
	constructor(e, t = null) {
		this.voiceStates_ = /* @__PURE__ */ new WeakMap();
		this.playbackStops_ = /* @__PURE__ */ new Set();
		this.bufferCache_ = /* @__PURE__ */ new Map();
		this.loadingBuffers_ = /* @__PURE__ */ new Map();
		this.bufferSources_ = /* @__PURE__ */ new Map();
		this.evictOrder_ = /* @__PURE__ */ new Set();
		this.awaitingPlay_ = /* @__PURE__ */ new Map();
		this.oversizeReported_ = /* @__PURE__ */ new Set();
		this.residentBytes_ = 0;
		this.bufferBudgetOverride_ = null;
		this.loadTypes_ = /* @__PURE__ */ new Map();
		this.encoded_ = /* @__PURE__ */ new Map();
		this.bgmHandle_ = null;
		this.bgmGroup_ = null;
		this.layersWarned_ = false;
		this.bgmRequest_ = 0;
		this.playbackEpoch_ = 0;
		this.bgmVolume_ = 1;
		this.fades_ = [];
		this.softBuses_ = /* @__PURE__ */ new Map();
		this.softVoices_ = [];
		this.maxVoices_ = ro;
		this.voiceSeq_ = 0;
		this.fadingOut_ = /* @__PURE__ */ new Set();
		this.disposed_ = false;
		this.suspended_ = false;
		this.deviceSuspended_ = false;
		this.assetResolver_ = null;
		this.refResolver_ = null;
		this.baseUrl = "";
		this.backend_ = e;
		this.mixer_ = t;
		to.set(this, {
			owners: /* @__PURE__ */ new Set(),
			sync: () => this.syncHostSuspension_()
		});
	}
	/** What this platform's backend needs in order to play a clip — asked by the
	*  asset loader, so a `url` backend is not made to wait on a fetch whose
	*  bytes it then drops. See {@link AudioDelivery}. */
	get delivery() {
		return this.backend_.delivery;
	}
	/** The effective warm-cache byte budget: an explicit override, else the
	*  live `RuntimeConfig.audioCacheBudget` (so build-config changes apply
	*  without plumbing). 0 disables the warm cache — a buffer is freed the
	*  moment its refCount reaches 0. */
	get bufferBudget() {
		return this.bufferBudgetOverride_ ?? Ue.audioCacheBudget;
	}
	/** Override the warm-cache byte budget; `null` returns to RuntimeConfig. */
	setBufferBudget(e) {
		this.bufferBudgetOverride_ = e === null ? null : Math.max(0, Math.floor(e));
		this.enforceBudget_();
	}
	/**
	* Pin a cached buffer: refCount + 1 (reviving an evictable entry back to
	* held). Returns false on a miss — the caller must load and re-acquire.
	* Every retain needs a matching {@link releaseBuffer}.
	*/
	retainBuffer(e) {
		const t = this.bufferCache_.get(e);
		if (!t) return false;
		t.refCount++;
		this.evictOrder_.delete(e);
		return true;
	}
	/**
	* Unpin a buffer. At refCount 0 it becomes an evictable warm-cache entry
	* (bounded by {@link bufferBudget}) — still instantly playable and
	* revivable by {@link retainBuffer} — or is freed outright when the
	* budget is 0.
	*/
	releaseBuffer(e) {
		const t = this.bufferCache_.get(e);
		if (!t || t.refCount === 0) return;
		if (--t.refCount === 0) if (this.bufferBudget === 0) this.freeBuffer_(e, t);
		else {
			this.evictOrder_.add(e);
			this.enforceBudget_();
		}
	}
	/** End cached and pending loads for changed source bytes. Playing sources
	*  keep their decoded data; later loads fetch fresh. Returns whether a load ended. */
	invalidateBuffer(e) {
		let t = this.bufferCache_.get(e)?.source ?? this.loadingBuffers_.get(e)?.source;
		if (!t) try {
			t = this.bufferSources_.get(this.resolveUrl_(e));
		} catch {
			return false;
		}
		if (!t) return false;
		this.backend_.invalidateSource?.(t.url);
		if (this.bufferSources_.get(t.url) === t) this.bufferSources_.delete(t.url);
		for (const e of t.requests) if (this.loadingBuffers_.get(e)?.source === t) this.loadingBuffers_.delete(e);
		for (const e of [...t.aliases]) {
			const n = this.bufferCache_.get(e);
			if (n?.source === t) this.freeBuffer_(e, n);
		}
		this.releaseSource_(t);
		return true;
	}
	/**
	* Free every evictable warm-cache buffer now (memory pressure). Held
	* buffers and the budget are untouched; the cache refills as buffers are
	* released afterwards. Returns the number of unique decoded buffers freed.
	*/
	trimBufferCache() {
		let e = 0;
		for (const t of [...this.evictOrder_]) {
			const n = this.bufferCache_.get(t);
			if (n && this.freeBuffer_(t, n)) e++;
		}
		return e;
	}
	/**
	* How each clip the importer was told about is held. Keyed by the clip's project-relative path, the way
	* the asset loader and `play` address it; anything absent is `auto`. A clip already loaded keeps how it
	* was loaded until it is reloaded.
	*/
	setLoadTypes(e) {
		this.loadTypes_ = new Map(Object.entries(e ?? {}).map(([e, t]) => [eo(e), t]));
	}
	/**
	* What the exporter's encoding did to each clip, keyed as {@link setLoadTypes} is. A clip named here is played
	* from past the silence encoding put before it and ended or looped at its real length. A clip already loaded
	* keeps how it was loaded.
	*/
	setEncodedClips(e) {
		this.encoded_ = new Map(Object.entries(e ?? {}).map(([e, t]) => [eo(e), t]));
	}
	loadOptions_(e) {
		const t = eo(e);
		const [n, r] = [this.loadTypes_.get(t), this.encoded_.get(t)];
		return n || r ? {
			...n ? { loadType: n } : {},
			...r ? { trim: r } : {}
		} : void 0;
	}
	/** Buffer residency counters — the observability side of the budget. */
	getBufferStats() {
		const e = /* @__PURE__ */ new Set();
		let t = 0;
		let n = 0;
		for (const r of this.bufferCache_.values()) {
			if (!r.handle.streamed || e.has(r.source)) continue;
			e.add(r.source);
			t++;
			n += r.handle.savedBytes ?? 0;
		}
		return {
			streamedCount: t,
			streamedSavedBytes: n,
			bufferCount: this.bufferCache_.size,
			bufferBytes: this.residentBytes_,
			bufferBudget: this.bufferBudget,
			evictableCount: this.evictOrder_.size
		};
	}
	/** Register a decoded buffer as an evictable warm-cache entry. The budget
	*  is enforced against the OLD warm entries before the new one joins the
	*  eviction pool — mirroring the C++ pool's add(), where a just-created
	*  resource can't be the one evicted to make room for itself (a caller
	*  about to pin or play it would find it already gone). */
	insertEntry_(e, t, n) {
		const r = {
			handle: t,
			source: n,
			refCount: 0
		};
		this.bufferCache_.set(e, r);
		n.aliases.add(e);
		if (!n.charged) {
			n.charged = true;
			this.residentBytes_ += t.bytes ?? 0;
			this.reportOversize_(e, t);
			this.enforceBudget_();
		}
		this.evictOrder_.add(e);
	}
	/**
	* A clip that is larger than the whole budget cannot be kept warm: making room for it empties the cache,
	* and the next clip to load evicts it in turn, so it is decoded again every time it is played. Nothing
	* about that is visible from the game — the sound just starts late, or not at all — so it is said once.
	*/
	reportOversize_(e, t) {
		const n = t.bytes ?? 0;
		const r = this.bufferBudget;
		if (r === 0 || n <= r || this.oversizeReported_.has(e)) return;
		this.oversizeReported_.add(e);
		const i = (e) => (e / 1048576).toFixed(1);
		c.warn("audio", `${e} takes ${i(n)} MB decoded, more than the whole ${i(r)} MB audio cache (audioCacheBudget): it is dropped as soon as another clip loads and decoded again on its next play. Set its import to 'streaming', or raise the budget`);
	}
	/** Cache lookup for playback: refreshes the LRU position of an evictable
	*  entry so frequently-played warm sounds aren't the first to go. */
	lookupBuffer_(e) {
		const t = this.bufferCache_.get(e);
		if (!t) return void 0;
		if (t.refCount === 0 && this.evictOrder_.delete(e)) this.evictOrder_.add(e);
		return t.handle;
	}
	freeBuffer_(e, t) {
		if (this.bufferCache_.get(e) !== t) return false;
		this.bufferCache_.delete(e);
		this.evictOrder_.delete(e);
		const n = t.source;
		n.aliases.delete(e);
		if (n.aliases.size === 0 && n.charged) {
			n.charged = false;
			this.residentBytes_ -= t.handle.bytes ?? 0;
		}
		return this.releaseSource_(n);
	}
	releaseSource_(e) {
		if (e.aliases.size || e.requests.size) return false;
		if (this.bufferSources_.get(e.url) === e) this.bufferSources_.delete(e.url);
		const t = e.handle;
		e.handle = void 0;
		if (t) this.backend_.unloadBuffer(t);
		return !!t;
	}
	/** Evict oldest warm-cache entries until resident bytes fit the budget.
	*  Held (refCount > 0) entries are never evicted. */
	enforceBudget_() {
		const e = this.bufferBudget;
		if (e === 0) return;
		for (const t of this.evictOrder_) {
			if (this.residentBytes_ <= e) break;
			if (this.awaitingPlay_.has(t)) continue;
			const n = this.bufferCache_.get(t);
			if (n) this.freeBuffer_(t, n);
		}
	}
	setAssetResolver(e) {
		this.assetResolver_ = e;
	}
	/**
	* Route play refs through the realm's single asset resolver — the same
	* channel every other asset type resolves through (uuid manifest, cooked
	* logical→staged maps, project base). Takes precedence over the legacy
	* `baseUrl` prefix, so `playSFX('assets/…')` works in cooked builds whose
	* content-addressed staging renamed the physical files.
	*/
	setRefResolver(e) {
		this.refResolver_ = e;
	}
	resolveUrl_(e) {
		if (this.refResolver_) return this.refResolver_(e);
		if (!this.baseUrl || e.startsWith("/") || e.startsWith("http://") || e.startsWith("https://")) return e;
		return `${this.baseUrl}/${e}`;
	}
	/** Coalesce authored requests through their captured physical source. */
	async ensureBuffer_(e, t, n) {
		if (this.disposed_) return;
		if (this.bufferCache_.has(e)) return;
		const r = this.loadingBuffers_.get(e);
		if (r) return r.promise;
		const i = n ?? this.resolveUrl_(e);
		let a = this.bufferSources_.get(i);
		let o;
		if (!a) {
			let e, n;
			a = {
				url: i,
				aliases: /* @__PURE__ */ new Set(),
				requests: /* @__PURE__ */ new Set(),
				charged: false,
				loading: new Promise((t, r) => {
					e = t;
					n = r;
				})
			};
			const r = a;
			this.bufferSources_.set(i, r);
			o = () => {
				try {
					Promise.resolve(t(i)).then((t) => {
						r.handle = t;
						e(t);
					}, n);
				} catch (e) {
					n(e);
				}
			};
		}
		const s = a;
		s.requests.add(e);
		let c;
		const l = (async () => {
			try {
				const t = await s.loading;
				if (this.disposed_ || this.loadingBuffers_.get(e) !== c) return;
				if (!this.bufferCache_.has(e)) this.insertEntry_(e, t, s);
			} finally {
				if (this.loadingBuffers_.get(e) === c) this.loadingBuffers_.delete(e);
				s.requests.delete(e);
				this.releaseSource_(s);
			}
		})();
		c = {
			promise: l,
			source: s
		};
		this.loadingBuffers_.set(e, c);
		o?.();
		await l;
	}
	async preload(e) {
		if (this.disposed_ || this.bufferCache_.has(e)) return;
		if (this.assetResolver_) {
			const t = this.assetResolver_(e);
			if (t) return this.preloadFromData(e, t);
		}
		const t = this.loadOptions_(e);
		await this.ensureBuffer_(e, (e) => t ? this.backend_.loadBuffer(e, t) : this.backend_.loadBuffer(e));
	}
	/**
	* Load `url` for a play that is waiting on it and start that play, as one step: the clip cannot be
	* evicted between arriving and being played, which is what a load finishing beside it used to do to a
	* clip larger than the budget. Says so when the clip is not there to play after all, instead of the
	* silence that left a game with no music and nothing in its log.
	*/
	async loadThenPlay_(e, t, n) {
		this.awaitingPlay_.set(e, (this.awaitingPlay_.get(e) ?? 0) + 1);
		try {
			await this.preload(e);
			if (this.disposed_) return;
			const r = this.lookupBuffer_(e);
			if (r) n(r);
			else c.warn("audio", `${t} did not play: ${e} loaded, but was gone from the audio cache before it could start`);
		} catch (n) {
			c.warn("audio", `Failed to preload ${t}: ${e}`, n);
		} finally {
			const t = (this.awaitingPlay_.get(e) ?? 1) - 1;
			if (t > 0) this.awaitingPlay_.set(e, t);
			else this.awaitingPlay_.delete(e);
		}
	}
	async preloadAll(e) {
		await Promise.all(e.map((e) => this.preload(e)));
	}
	/**
	* Cache `url`'s clip from bytes the caller already holds. `url` is the
	* AUTHORED path this API is addressed by (the key `retainBuffer` and
	* `getBufferHandle` take); the backend is handed the RESOLVED source, which
	* for a `url`-delivery backend is the only thing it plays.
	*/
	async preloadFromData(e, t) {
		const n = this.loadOptions_(e);
		await this.ensureBuffer_(e, (e) => n ? this.backend_.loadBufferFromData(e, t, n) : this.backend_.loadBufferFromData(e, t));
	}
	/**
	* Play a fully-RESOLVED clip URL on an explicit bus (created on demand
	* under master). Unlike playSFX/playBGM this applies no ref resolution —
	* the caller already holds the final URL (the video system's audio track
	* derives it from the resolved video source). Null when the clip can't
	* load; loaded buffers share the residency cache.
	*/
	async playTrack(e, t = {}) {
		if (this.disposed_) return null;
		const n = this.playbackEpoch_;
		try {
			await this.ensureBuffer_(e, (e) => this.backend_.loadBuffer(e), e);
		} catch {
			return null;
		}
		if (this.disposed_ || n !== this.playbackEpoch_) return null;
		const r = this.lookupBuffer_(e);
		if (!r) return null;
		if (t.bus) this.ensureBus(t.bus);
		return this.playVoice_(r, t);
	}
	playSFX(e, t) {
		const n = this.playbackEpoch_;
		const r = {
			bus: "sfx",
			volume: t?.volume,
			playbackRate: t?.pitch,
			pan: t?.pan,
			priority: t?.priority ?? 0
		};
		const i = this.lookupBuffer_(e);
		if (!i) {
			const t = this.createDeferredHandle_(r.volume ?? 1);
			this.loadThenPlay_(e, "audio", (e) => {
				if (n !== this.playbackEpoch_ || t.cancelled) return;
				t.resolve((t) => this.playVoice_(e, {
					...r,
					...t
				}));
			});
			return t;
		}
		return this.playVoice_(i, r);
	}
	/**
	* Background music: one piece at a time, round and round. `fadeIn` brings it up over that many seconds and
	* `crossFade` brings it up as the piece before goes down. `loopStart` is for a piece with an introduction:
	* the file plays from its top once, and each time it reaches its end it comes back to that many seconds in,
	* so the introduction is heard once and what follows it goes round.
	*/
	playBGM(e, t) {
		const n = ++this.bgmRequest_;
		const r = (e) => {
			if (this.disposed_ || n !== this.bgmRequest_) return;
			this.cancelFades_();
			const r = t?.volume ?? 1;
			const i = this.bgmVolume_;
			this.bgmVolume_ = r;
			this.retireMusic_(t?.crossFade, i);
			const a = t?.fadeIn ?? t?.crossFade;
			this.bgmHandle_ = this.playVoice_(e, {
				bus: "music",
				volume: r,
				loop: true,
				...t?.loopStart && t.loopStart > 0 ? { loopStart: t.loopStart } : {}
			});
			if (a) this.fadeIn_(this.bgmHandle_, a, r);
		};
		const i = this.lookupBuffer_(e);
		if (i) r(i);
		else this.loadThenPlay_(e, "BGM", r);
	}
	/** What was playing as music goes: at once, or down over @p fade seconds. Its layers go with it. */
	retireMusic_(e, t) {
		const n = (t, n) => {
			if (e && e > 0) this.fadeOut_(t, e, n);
			else t.stop();
		};
		if (this.bgmHandle_) n(this.bgmHandle_, t);
		this.bgmHandle_ = null;
		const r = this.bgmGroup_;
		this.bgmGroup_ = null;
		if (r) {
			r.stopped = true;
			for (const [e, t] of r.voices) n(t, r.volume * (r.levels.get(e) ?? 1));
		}
	}
	/**
	* Background music as layers: every clip begun on the same sample and looping together, each with a level of its
	* own. `layers` names them, `{ drums: 'a_drums.wav', melody: 'a_melody.wav' }`, and they must be as long as one
	* another, which the stems of one piece are. It takes the place of whatever music was playing, as playBGM does,
	* and stopBGM ends it.
	*
	* Layers are only music while they are in step. Where the backend decodes its clips they are, to the sample; where
	* it cannot promise it and `mix` names the whole piece as one clip, that plays instead.
	*/
	playLayers(e, t = {}) {
		const n = ++this.bgmRequest_;
		const r = Object.keys(e);
		const i = (e) => Math.max(0, Math.min(1, e ?? 1));
		const a = {
			names: r,
			voices: /* @__PURE__ */ new Map(),
			rates: /* @__PURE__ */ new Map(),
			volume: t.volume ?? 1,
			stopped: false,
			layered: true,
			inStep: true,
			levels: new Map(r.map((e) => [e, i(t.levels?.[e])])),
			targets: new Map(r.map((e) => [e, i(t.levels?.[e])]))
		};
		const o = this;
		const s = () => {
			if (this.disposed_ || n !== this.bgmRequest_ || a.stopped) return;
			const i = r.map((t) => this.lookupBuffer_(e[t]));
			if (i.some((e) => !e)) {
				c.warn("audio", `music layers did not play: ${r.filter((e, t) => !i[t]).join(", ")} loaded, but gone from the audio cache before they could start`);
				return;
			}
			const o = this.backend_.delivery === "bytes" && i.every((e) => !e.streamed);
			if (!o && t.mix) {
				a.layered = false;
				a.inStep = false;
				this.playBGM(t.mix, {
					volume: a.volume,
					fadeIn: t.fadeIn,
					crossFade: t.crossFade,
					loopStart: t.loopStart
				});
				return;
			}
			if (!o && !this.layersWarned_) {
				this.layersWarned_ = true;
				c.warn("audio", "music layers cannot be kept in step here (clips are played from their files); they are started one after another and may drift. Give playLayers a `mix` to play the whole piece instead");
			}
			this.cancelFades_();
			const s = this.bgmVolume_;
			this.bgmVolume_ = a.volume;
			this.retireMusic_(t.crossFade, s);
			for (const e of r) a.levels.set(e, a.targets.get(e));
			const l = {};
			const u = t.fadeIn ?? t.crossFade;
			r.forEach((e, n) => {
				const r = a.volume * a.levels.get(e);
				const o = this.playVoice_(i[n], {
					bus: "music",
					volume: r,
					loop: true,
					together: l,
					...t.loopStart && t.loopStart > 0 ? { loopStart: t.loopStart } : {}
				});
				a.voices.set(e, o);
				if (u) this.fadeIn_(o, u, r);
			});
			a.inStep = o;
			this.bgmGroup_ = a;
		};
		const l = r.filter((t) => !this.lookupBuffer_(e[t]));
		if (l.length === 0) s();
		else Promise.all(l.map((t) => this.preload(e[t]))).then(s, (t) => c.warn("audio", `Failed to preload music layers: ${l.map((t) => e[t]).join(", ")}`, t));
		return {
			names: r,
			get layered() {
				return a.layered;
			},
			get inStep() {
				return a.inStep;
			},
			setLayer(e, t, n = 1) {
				if (!a.targets.has(e)) return;
				const r = i(t);
				a.targets.set(e, r);
				const s = a.levels.get(e);
				if (!(n > 0) || a.voices.size === 0) {
					a.levels.set(e, r);
					a.rates.delete(e);
					o.applyLayer_(a, e);
				} else a.rates.set(e, Math.abs(r - s) / n);
			},
			layerLevel(e) {
				return a.levels.get(e) ?? 0;
			},
			stop(e) {
				a.stopped = true;
				if (o.bgmGroup_ === a || !a.layered && n + 1 === o.bgmRequest_) o.stopBGM(e);
			},
			get isPlaying() {
				if (!a.layered) return o.bgmHandle_?.isPlaying ?? false;
				for (const e of a.voices.values()) if (e.isPlaying) return true;
				return false;
			}
		};
	}
	/** A layer's level written to its voice: the piece's volume times the layer's own. */
	applyLayer_(e, t) {
		const n = e.voices.get(t);
		const r = n && this.voiceStates_.get(n);
		if (!r) return;
		r.base = e.volume * e.levels.get(t);
		if (r.paused || r.handle.isPlaying) this.applyVoice_(r);
	}
	stopAll() {
		this.bgmRequest_++;
		const e = ++this.playbackEpoch_;
		const t = this.softVoices_;
		this.softVoices_ = [];
		this.bgmHandle_ = null;
		if (this.bgmGroup_) this.bgmGroup_.stopped = true;
		this.bgmGroup_ = null;
		this.fades_.length = 0;
		this.fadingOut_.clear();
		const n = /* @__PURE__ */ new Set();
		const r = [];
		for (const e of t) {
			e.paused = false;
			e.retired = true;
			if (!n.has(e.handle)) {
				n.add(e.handle);
				r.push(() => e.handle.stop());
			}
		}
		for (const t of this.playbackStops_) r.push(() => t(e));
		C(r, (e) => e());
	}
	/** @internal Generation boundary for pending playback intents. */
	get playbackGeneration() {
		return this.playbackEpoch_;
	}
	/** @internal Terminal and paused ownership comes from the global voice pool. */
	getVoiceState(e) {
		const t = this.voiceStates_.get(e);
		if (!t) return "untracked";
		if (t.retired) return "stopped";
		return t.paused ? "paused" : t.handle.isPlaying ? "playing" : "ended";
	}
	/** @internal Stop pending consumers after every old backend voice was stopped. */
	onPlaybackStop(e) {
		this.playbackStops_.add(e);
		return () => {
			this.playbackStops_.delete(e);
		};
	}
	stopBGM(e) {
		this.bgmRequest_++;
		if (!this.bgmHandle_ && !this.bgmGroup_) {
			if (!(e && e > 0)) this.cancelFades_();
			return;
		}
		this.cancelFades_();
		this.retireMusic_(e, this.bgmVolume_);
	}
	/**
	* Suspend the whole audio device (every voice, every bus) without touching
	* any volume the user set — the device-level pause a fullscreen takeover
	* (a rewarded ad, an OS interruption) wants, where per-bus volumes would
	* fight the mixer's own state. Balanced by {@link resume}.
	*/
	suspend() {
		this.backend_.suspend();
		this.suspended_ = true;
		this.deviceSuspended_ = true;
	}
	/** Resume the audio device after {@link suspend}. */
	resume() {
		this.suspended_ = false;
		if (!to.get(this)?.owners.size) {
			this.backend_.resume();
			this.deviceSuspended_ = false;
		}
	}
	syncHostSuspension_() {
		const e = this.suspended_ || !!to.get(this)?.owners.size;
		if (this.disposed_ || e === this.deviceSuspended_) return;
		this.deviceSuspended_ = e;
		if (e) this.backend_.suspend();
		else this.backend_.resume();
	}
	setMasterVolume(e) {
		if (this.mixer_) {
			this.mixer_.master.volume = e;
			return;
		}
		this.setSoftBus_("master", { volume: e });
	}
	setMusicVolume(e) {
		if (this.mixer_) {
			this.mixer_.music.volume = e;
			return;
		}
		this.setSoftBus_("music", { volume: e });
	}
	setSFXVolume(e) {
		if (this.mixer_) {
			this.mixer_.sfx.volume = e;
			return;
		}
		this.setSoftBus_("sfx", { volume: e });
	}
	setUIVolume(e) {
		if (this.mixer_) {
			this.mixer_.ui.volume = e;
			return;
		}
		this.setSoftBus_("ui", { volume: e });
	}
	/** Mixerless backends (WeChat/Null) report unity volume and unmuted —
	*  the read-side mirror of the volume setters' silent no-op there. */
	getMasterVolume() {
		return this.mixer_?.master.volume ?? 1;
	}
	getMusicVolume() {
		return this.mixer_?.music.volume ?? 1;
	}
	getSFXVolume() {
		return this.mixer_?.sfx.volume ?? 1;
	}
	getUIVolume() {
		return this.mixer_?.ui.volume ?? 1;
	}
	/** Unity (1) for an unknown bus. */
	getBusVolume(e) {
		if (this.mixer_) return this.mixer_.getBus(e)?.volume ?? 1;
		return this.softBuses_.get(e)?.volume ?? 1;
	}
	isBusMuted(e) {
		if (this.mixer_) return this.mixer_.getBus(e)?.muted ?? false;
		return this.softBuses_.get(e)?.muted ?? false;
	}
	/** Record a bus change for a mixerless backend and push it to live voices —
	*  what a gain node would have done to the tracks already playing. */
	setSoftBus_(e, t) {
		const n = this.softBuses_.get(e) ?? {
			volume: 1,
			muted: false
		};
		if (t.volume !== void 0) n.volume = t.volume;
		if (t.muted !== void 0) n.muted = t.muted;
		this.softBuses_.set(e, n);
		this.applyBus_(e);
	}
	/** The gain a mixerless backend folds into a voice: its bus, times master. */
	softGain_(e) {
		if (this.mixer_) return 1;
		const t = (e) => {
			const t = this.softBuses_.get(e);
			if (!t) return 1;
			return t.muted ? 0 : t.volume;
		};
		return e === "master" ? t("master") : t(e) * t("master");
	}
	/** Push a voice's computed volume to the backend. */
	applyVoice_(e) {
		e.handle.setVolume(e.base * this.softGain_(e.bus) * e.fade);
	}
	/** Re-apply after a bus (or master) changed, and forget voices that ended. */
	applyBus_(e) {
		this.softVoices_ = this.softVoices_.filter((e) => e.paused || e.handle.isPlaying || this.fadeOf_(e) !== null);
		for (const t of this.softVoices_) if (e === "master" || t.bus === e) this.applyVoice_(t);
	}
	fadeOf_(e) {
		return this.fades_.find((t) => t.voice === e) ?? null;
	}
	/** Play through the backend as a tracked voice, so bus gain and fades have
	*  one place to act — on every platform, mixer graph or not. */
	/**
	* Play an already-resolved buffer. The one door every voice comes through —
	* a scripted `playSFX`, a `playBGM`, an `AudioSource` in the scene — so the
	* bus gain a backend without a mixer graph cannot apply, and the voice cap
	* `priority` is measured against, are decided once for all of them.
	*/
	playBuffer(e, t) {
		if (t?.bus) this.ensureBus(t.bus);
		return this.playVoice_(e, t ?? {});
	}
	/** The voice ceiling; 0 or less means no cap. @see playBuffer */
	setMaxVoices(e) {
		this.maxVoices_ = Number.isFinite(e) ? Math.floor(e) : ro;
	}
	get maxVoices() {
		return this.maxVoices_;
	}
	playVoice_(e, t) {
		if (this.disposed_) return io();
		const n = t.bus ?? "sfx";
		const r = t.volume ?? 1;
		const i = t.priority ?? 0;
		if (!this.makeRoomForVoice_(i)) return io();
		const a = this.backend_.play(e, {
			...t,
			volume: r * this.softGain_(n)
		});
		const o = {
			handle: a,
			bus: n,
			base: r,
			fade: 1,
			paused: false,
			priority: i,
			seq: this.voiceSeq_++
		};
		const s = this;
		const c = {
			get id() {
				return a.id;
			},
			stop() {
				if (!o.retired) {
					o.retired = true;
					o.paused = false;
					a.stop();
				}
			},
			pause() {
				if (!a.isPlaying) return;
				a.pause();
				o.paused = !a.isPlaying;
			},
			resume() {
				if (!o.paused || s.disposed_ || !s.softVoices_.includes(o)) return;
				a.resume();
				if (a.isPlaying) o.paused = false;
			},
			setVolume(e) {
				o.base = e;
				if (!s.disposed_ && (o.paused || a.isPlaying)) s.applyVoice_(o);
			},
			setPan(e) {
				if (!s.disposed_ && (o.paused || a.isPlaying)) a.setPan(e);
			},
			setLoop(e) {
				a.setLoop(e);
			},
			setPlaybackRate(e) {
				a.setPlaybackRate(e);
			},
			get isPlaying() {
				return a.isPlaying;
			},
			get currentTime() {
				return a.currentTime;
			},
			get duration() {
				return a.duration;
			},
			get onEnd() {
				return a.onEnd;
			},
			set onEnd(e) {
				a.onEnd = e;
			}
		};
		o.publicHandle = c;
		this.voiceStates_.set(c, o);
		this.softVoices_.push(o);
		return c;
	}
	/**
	* Drop the least valuable voice if the pool is full, so a new one of
	* @p priority can sound. False when the new voice is the least valuable
	* itself. Ties go to the OLDER voice, which is what keeps a repeated sound
	* audible: every shot of a machine gun is worth the same.
	*/
	makeRoomForVoice_(e) {
		this.softVoices_ = this.softVoices_.filter((e) => e.paused || e.handle.isPlaying || this.fadeOf_(e) !== null);
		if (this.maxVoices_ <= 0 || this.softVoices_.length < this.maxVoices_) return true;
		let t = null;
		for (const e of this.softVoices_) if (!t || e.priority < t.priority || e.priority === t.priority && e.seq < t.seq) t = e;
		if (!t || t.priority > e) return false;
		t.paused = false;
		t.retired = true;
		t.handle.stop();
		this.softVoices_ = this.softVoices_.filter((e) => e !== t);
		return true;
	}
	muteBus(e, t) {
		if (!this.mixer_) {
			this.setSoftBus_(e, { muted: t });
			return;
		}
		const n = this.mixer_.getBus(e);
		if (n) n.muted = t;
	}
	/**
	* Whether this backend has a mixer graph at all. @experimental
	*
	* The fact behind every `false` the bus calls below return, reported once so a
	* reader does not have to infer a capability from a failed write. Without one,
	* {@link applyAudioProjectConfig} applies `maxVoices` and stops before the bus
	* list — so an authored mixer is not partly applied, it is not applied.
	*/
	hasMixerGraph() {
		return this.mixer_ !== null;
	}
	/** Ensure a named bus exists (creating it under `parent` ?? master).
	*  False on backends without a mixer graph. */
	ensureBus(e, t) {
		if (!this.mixer_) return false;
		if (!this.mixer_.getBus(e)) this.mixer_.createBus({
			name: e,
			...t ? { parent: t } : {}
		});
		return true;
	}
	setBusVolume(e, t) {
		if (!this.mixer_) {
			this.setSoftBus_(e, { volume: t });
			return;
		}
		const n = this.mixer_.getBus(e);
		if (n) n.volume = t;
	}
	/** Replace a bus's DSP insert chain. No-op (false) on backends without a
	*  WebAudio graph (WeChat/Null) — same degradation as the volume APIs. */
	setBusEffects(e, t) {
		const n = this.mixer_?.getBus(e);
		if (!n) return false;
		n.setEffects(t);
		return true;
	}
	getBusEffects(e) {
		return this.mixer_?.getBus(e)?.effects ?? [];
	}
	/** Install (or clear with null) sidechain ducking on `target` — e.g. duck
	*  'music' to 30% while 'voice' carries signal. */
	setBusDucking(e, t) {
		return this.mixer_?.setDucking(e, t) ?? false;
	}
	getBusDucking(e) {
		return this.mixer_?.getDucking(e) ?? null;
	}
	/** Advance duck envelopes (driven per-frame by AudioUpdateSystem). */
	updateDucking() {
		this.mixer_?.updateDucking();
	}
	getBufferHandle(e) {
		return this.lookupBuffer_(e);
	}
	/** Fill `out` with the master output's frequency spectrum (0-255 per bin,
	*  low→high) for visualizers. Returns false on backends without analysis
	*  (e.g. WeChat) — callers should treat that as silence. */
	getSpectrum(e) {
		return this.backend_.getFrequencyData?.(e) ?? false;
	}
	dispose() {
		this.disposed_ = true;
		C([
			() => this.stopAll(),
			() => this.playbackStops_.clear(),
			() => {
				this.loadingBuffers_.clear();
				try {
					C([...this.bufferCache_], ([e, t]) => {
						this.freeBuffer_(e, t);
					});
				} finally {
					this.bufferCache_.clear();
					this.bufferSources_.clear();
					this.evictOrder_.clear();
					this.residentBytes_ = 0;
				}
			},
			() => this.backend_?.dispose()
		], (e) => e());
	}
	/**
	* Advance every fade by `dt` seconds — called once a frame by the audio
	* system, which is what makes a fade the game's clock rather than the
	* browser's: it pauses when the game does, and it exists on a device.
	*/
	updateFades(e) {
		if (this.suspended_ || !(e > 0)) return;
		const t = this.bgmGroup_;
		if (t && t.rates.size > 0) for (const [n, r] of t.rates) {
			const [i, a] = [t.levels.get(n), t.targets.get(n)];
			const o = i < a ? Math.min(a, i + r * e) : Math.max(a, i - r * e);
			t.levels.set(n, o);
			if (o === a) t.rates.delete(n);
			this.applyLayer_(t, n);
		}
		if (this.fades_.length === 0) return;
		for (let t = this.fades_.length - 1; t >= 0; t--) {
			const n = this.fades_[t];
			if (n.voice.paused) continue;
			if (!n.voice.handle.isPlaying) {
				this.fadingOut_.delete(n.voice.publicHandle ?? n.voice.handle);
				this.fades_.splice(t, 1);
				continue;
			}
			n.elapsed += e;
			const r = n.duration > 0 ? Math.min(n.elapsed / n.duration, 1) : 1;
			n.voice.fade = n.from + (n.to - n.from) * r;
			this.applyVoice_(n.voice);
			if (r >= 1) {
				if (n.stopAtEnd) {
					n.voice.handle.stop();
					this.fadingOut_.delete(n.voice.publicHandle ?? n.voice.handle);
				}
				this.fades_.splice(t, 1);
			}
		}
	}
	fadeIn_(e, t, n) {
		const r = this.voiceOf_(e, n, "music");
		r.base = n;
		r.fade = 0;
		this.applyVoice_(r);
		this.fades_.push({
			voice: r,
			from: 0,
			to: 1,
			duration: t,
			elapsed: 0,
			stopAtEnd: false
		});
	}
	/** The tracked voice for a handle, registering one if it came from outside
	*  the play path (a deferred handle resolved later). */
	voiceOf_(e, t, n) {
		const r = this.softVoices_.find((t) => t.handle === e || t.publicHandle === e);
		if (r) return r;
		const i = {
			handle: e,
			bus: n,
			base: t,
			fade: 1,
			paused: false,
			priority: 0,
			seq: this.voiceSeq_++
		};
		this.softVoices_.push(i);
		return i;
	}
	/** Cancel every in-flight fade AND stop the tracks that were fading out — a
	*  cancelled fade would otherwise never reach their `stop()`. */
	cancelFades_() {
		this.fades_.length = 0;
		for (const e of this.fadingOut_) e.stop();
		this.fadingOut_.clear();
	}
	fadeOut_(e, t, n) {
		this.fadingOut_.add(e);
		const r = this.voiceOf_(e, n, "music");
		this.fades_.push({
			voice: r,
			from: r.fade,
			to: 0,
			duration: t,
			elapsed: 0,
			stopAtEnd: true
		});
	}
	createDeferredHandle_(e) {
		let t = null;
		let n = false, r = false, i = false;
		let a;
		const o = {};
		return {
			get id() {
				return t?.id ?? -1;
			},
			get cancelled() {
				return n;
			},
			stop() {
				if (!n) {
					n = true;
					t?.stop();
				}
			},
			pause() {
				if (!n) {
					r = true;
					t?.pause();
				}
			},
			resume() {
				if (!n) {
					r = false;
					t?.resume();
				}
			},
			setVolume(e) {
				if (!n) {
					o.volume = e;
					t?.setVolume(e);
				}
			},
			setPan(e) {
				if (!n) {
					o.pan = e;
					t?.setPan(e);
				}
			},
			setLoop(e) {
				if (!n) {
					o.loop = e;
					t?.setLoop(e);
				}
			},
			setPlaybackRate(e) {
				if (!n) {
					o.playbackRate = e;
					t?.setPlaybackRate(e);
				}
			},
			get isPlaying() {
				return t?.isPlaying ?? false;
			},
			get currentTime() {
				return t?.currentTime ?? 0;
			},
			get duration() {
				return t?.duration ?? 0;
			},
			get onEnd() {
				return t ? t.onEnd : a;
			},
			set onEnd(e) {
				a = e;
				i = true;
				if (t) t.onEnd = e;
			},
			resolve(s) {
				if (n || t) return;
				const c = s(r ? {
					...o,
					volume: 0
				} : o);
				if (n) {
					c.stop();
					return;
				}
				t = c;
				if (i) t.onEnd = a;
				if (r) {
					t.pause();
					t.setVolume(o.volume ?? e);
				}
			}
		};
	}
};
/** Resource handle for the per-app audio API. */
/**
* Playback, buses and mixing, as `Res(Audio)` hands it over.
*
* `@beta`: a certified run now drives a loop and reads the master bus's analyser,
* so a break here is noticed — but the corpus reaches a handful of twenty-three
* audio symbols, which is thin evidence for freezing the shape.
*
* @beta
*/
const oo = s(null, "Audio");
//#endregion
//#region src/asset/AssetPlugin.ts
/**
* The asset loader, as a resource. Rarely the door a game uses: scenes preload
* what they reference and components resolve their own assets, so this is for the
* cases that outlive a scene — hot updates, groups loaded on demand.
*
* @beta
*/
const $ = s(null, "Assets");
var so = class {
	constructor() {
		this.name = "asset";
		this.states_ = /* @__PURE__ */ new WeakMap();
		this.latestState_ = null;
	}
	build(e) {
		this.cleanup(e);
		const t = e.wasmModule;
		if (!t) {
			c.warn("asset", "AssetPlugin: No WASM module available");
			return;
		}
		const n = ja.create({
			backend: new Fa({ baseUrl: "" }),
			module: t,
			getAudio: () => e.hasResource(oo) ? e.getResource(oo) : null,
			getSpriteAnimation: () => e.hasResource(Oe) ? e.getResource(Oe) : null,
			getLocalization: () => e.hasResource(aa) ? e.getResource(aa) : null
		});
		n.getTextureLoader().setTranscoderProvider(() => Ka(e.sideModules));
		Qa(e.world, n, () => e.hasResource($) ? e.getResource($) : null);
		e.insertResource($, n);
		const r = {
			created: n,
			current: () => e.hasResource($) ? e.getResource($) : null,
			released: false
		};
		this.states_.set(e, r);
		this.latestState_ = r;
		this.driveDeviceRecovery_(e, r);
	}
	/** Release both the default loader and any runtime replacement owned by this App. */
	cleanup(e) {
		const t = e ? this.states_.get(e) : this.latestState_;
		if (!t || t.released) return;
		t.released = true;
		if (e) this.states_.delete(e);
		if (t === this.latestState_) this.latestState_ = null;
		const n = t.current();
		C(n && n !== t.created ? [t.created, n] : [t.created], (e) => {
			try {
				e.releaseAll();
			} finally {
				e.getRefCounter()?.clear();
			}
		});
	}
	/**
	* Recovers the renderer after a device loss, which nothing did: the path
	* existed end to end with no caller but a test probe, so a shipped game that
	* lost its GPU stayed lost. Timed off UNSCALED delta — a paused game still
	* has to come back — and backed off, since each attempt re-fetches content.
	*/
	driveDeviceRecovery_(e, n) {
		let r = false;
		let i = 0;
		let a = 0;
		let s = 0;
		e.addSystemToSchedule(1, t([], () => {
			if (n.released) return;
			const t = Jt();
			if (t === V.Live || t === V.Dead) {
				a = 0;
				i = 0;
				s = 0;
				return;
			}
			const l = e.getResource(o)?.unscaledDelta ?? 0;
			s += l;
			if (r) return;
			i += l;
			if (i < a) return;
			i = 0;
			r = true;
			const u = s;
			const d = async () => {
				let t = e.hasResource($) ? e.getResource($) : null;
				while (t && !n.released) {
					const r = await t.recoverFromDeviceLoss();
					if (n.released) return false;
					const i = e.hasResource($) ? e.getResource($) : null;
					if (i === t) return r;
					t = i;
				}
				return false;
			};
			d().then((e) => {
				if (n.released) return;
				if (e) {
					c.info("asset", `Device recovered after ${u.toFixed(1)}s`);
					a = 0;
					return;
				}
				a = Math.min(a ? a * 2 : co, lo);
			}).catch((e) => {
				if (n.released) return;
				c.warn("asset", "Device recovery threw; will retry", e);
				a = Math.min(a ? a * 2 : co, lo);
			}).finally(() => {
				r = false;
			});
		}));
	}
};
/** First wait after a recovery attempt comes back incomplete, in seconds. */
const co = .25;
/** Ceiling for that wait: a context can take a while, but not minutes. */
const lo = 5;
const uo = new so();
//#endregion
export { ii as $, at as $t, Ei as A, on as At, Ui as B, Et as Bt, ta as C, Yt as Ct, ra as D, an as Dt, ca as E, rn as Et, Ni as F, Bt as Ft, Hi as G, P as Gt, Gi as H, Nt as Ht, Fi as I, zt as It, Ti as J, gt as Jt, Ci as K, Ct as Kt, Pi as L, Ft as Lt, Ai as M, gn as Mt, ji as N, sn as Nt, ea as O, $t as Ot, Mi as P, Vt as Pt, gi as Q, lt as Qt, Oi as R, It as Rt, ia as S, Xt as St, sa as T, mn as Tt, Vi as U, Pt as Ut, Wi as V, Tt as Vt, qi as W, yt as Wt, Si as X, mt as Xt, xi as Y, dt as Yt, bi as Z, ft as Zt, da as _, V as _t, ao as a, jr as at, ma as b, en as bt, Xa as c, gr as ct, Ia as d, zn as dt, ai as et, Fa as f, kn as ft, va as g, qt as gt, ya as h, yn as ht, oo as i, Hr as it, Di as j, hn as jt, Zi as k, Zt as kt, Ka as l, rr as lt, Aa as m, bn as mt, $ as n, Gr as nt, no as o, Nr as ot, ja as p, Dn as pt, wi as q, St as qt, uo as r, Wr as rt, Qa as s, Pr as st, so as t, ri as tt, La as u, Yn as ut, pa as v, Ht as vt, na as w, Jt as wt, aa as x, Qt as xt, ha as y, _n as yt, ki as z, wt as zt };

//# sourceMappingURL=AssetPlugin.js.map