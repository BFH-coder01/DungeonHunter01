import { s as e } from "./logger.js";
import { n as t, t as n } from "./utf8.js";
//#region src/asset/contentHash.ts
/**
* Content hashing for asset identity (content-addressed identity).
*
* XXH64 — a fast, well-distributed 64-bit non-cryptographic hash — is the single
* canonical definition backing {@link AddressableManifest}'s `contentHash` field.
* The hash is an asset's *physical* identity: computed at build time over the
* built bytes, it lets the pipeline dedupe identical content and treat
* `<contentHash>.<ext>` as an immutable, permanently-cacheable URL — change a byte
* → new hash → new URL, never a stale cache.
*
* Pure and dependency-free (BigInt, no Node/DOM APIs) so the build-time cook and
* the runtime (e.g. integrity re-check of a CDN download) share ONE implementation
* — no hand-mirrored second copy to drift. BigInt keeps the 64-bit arithmetic
* exact and deterministic across engines; build-time hashing is not hot enough for
* the 32-bit-emulation complexity to earn its risk. Output is canonical XXH64,
* anchored on the official `XXH64("") == 0xEF46DB3751D8E999` vector, so external
* `xxhsum`-family tooling can verify our artifacts.
*/
const r = (1n << 64n) - 1n;
const i = 11400714785074694791n;
const a = 14029467366897019727n;
const o = 1609587929392839161n;
const s = 9650029242287828579n;
const c = 2870177450012600261n;
function l(e, t) {
	return (e << t | e >> 64n - t) & r;
}
function u(e, t) {
	e = e + t * a & r;
	e = l(e, 31n);
	return e * i & r;
}
function d(e, t) {
	const n = u(0n, t);
	e = (e ^ n) & r;
	return e * i + s & r;
}
/** Unsigned 32-bit little-endian read. `>>> 0` defeats JS's signed bit-ops. */
function f(e, t) {
	return BigInt((e[t] | e[t + 1] << 8 | e[t + 2] << 16 | e[t + 3] << 24) >>> 0);
}
/** Unsigned 64-bit little-endian read, composed from two 32-bit halves. */
function p(e, t) {
	return f(e, t + 4) << 32n | f(e, t);
}
/**
* Canonical XXH64 of `data` as an exact unsigned 64-bit {@link bigint}.
* Deterministic across engines; `seed` defaults to 0 (the manifest convention).
*/
function m(e, t = 0n) {
	const n = e.length;
	let m = 0;
	let h;
	if (n >= 32) {
		let o = t + i + a & r;
		let s = t + a & r;
		let c = t & r;
		let f = t - i & r;
		const g = n - 32;
		do {
			o = u(o, p(e, m));
			m += 8;
			s = u(s, p(e, m));
			m += 8;
			c = u(c, p(e, m));
			m += 8;
			f = u(f, p(e, m));
			m += 8;
		} while (m <= g);
		h = l(o, 1n) + l(s, 7n) + l(c, 12n) + l(f, 18n) & r;
		h = d(h, o);
		h = d(h, s);
		h = d(h, c);
		h = d(h, f);
	} else h = t + c & r;
	h = h + BigInt(n) & r;
	while (m + 8 <= n) {
		h = (h ^ u(0n, p(e, m))) & r;
		h = l(h, 27n) * i + s & r;
		m += 8;
	}
	if (m + 4 <= n) {
		h = (h ^ f(e, m) * i & r) & r;
		h = l(h, 23n) * a + o & r;
		m += 4;
	}
	while (m < n) {
		h = (h ^ BigInt(e[m]) * c & r) & r;
		h = l(h, 11n) * i & r;
		m += 1;
	}
	h = (h ^ h >> 33n) & r;
	h = h * a & r;
	h = (h ^ h >> 29n) & r;
	h = h * o & r;
	h = (h ^ h >> 32n) & r;
	return h;
}
/** Lower-case, zero-padded 16-hex-digit XXH64 — the canonical `contentHash` string. */
function h(e) {
	return m(e).toString(16).padStart(16, "0");
}
/**
* Convenience over {@link contentHashHex} that also accepts a string (hashed as
* UTF-8). Build-time only — `TextEncoder` is a Node/browser global.
*/
function g(e) {
	return h(typeof e === "string" ? new TextEncoder().encode(e) : e);
}
//#endregion
//#region src/audio/NullAudioBackend.ts
var ee = class {
	constructor(e) {
		this.id = e;
	}
	stop() {}
	pause() {}
	resume() {}
	setVolume() {}
	setPan() {}
	setLoop() {}
	setPlaybackRate() {}
	get isPlaying() {
		return false;
	}
	get currentTime() {
		return 0;
	}
	get duration() {
		return 0;
	}
};
var te = class {
	constructor() {
		this.delivery = "url";
		this.name = "null";
		this.mixer = null;
		this.isReady = true;
		this.nextId_ = 1;
	}
	async initialize(e) {}
	async ensureResumed() {}
	async loadBuffer(e) {
		return {
			id: this.nextId_++,
			duration: 0,
			bytes: 0
		};
	}
	async loadBufferFromData(e, t) {
		return {
			id: this.nextId_++,
			duration: 0,
			bytes: 0
		};
	}
	unloadBuffer(e) {}
	play(e, t) {
		return new ee(this.nextId_++);
	}
	suspend() {}
	resume() {}
	dispose() {}
};
//#endregion
//#region src/platform/cacheEntryName.ts
/**
* @file  cacheEntryName.ts — the file a content cache key is stored under.
*/
/**
* The key's XXH64, as 16 hex digits. A key is a content-addressed url, which no
* filesystem name holds as-is, and the native host refuses any name outside
* `[A-Za-z0-9._-]` — so every platform with a disk cache stores under this.
*/
function _(e) {
	return h(t(e));
}
//#endregion
//#region src/platform/contentCache.ts
const v = "estella:content-cache:index:v1";
const y = _(v);
/** One coordinator per adapter: byte IO, index changes and eviction share a
* queue. A cleaner cannot unlink a read/write in flight. Unknown legacy files
* stay protected until a verified write establishes their resource identity. */
var b = class {
	constructor(e) {
		this.platform_ = e;
		this.chain_ = Promise.resolve();
		this.index_ = null;
		this.indexBytes_ = 0;
	}
	capability() {
		const e = this.platform_;
		if (!e.readCacheFile || !e.writeCacheFile || e.hasCacheStorage?.() === false) return "unavailable";
		return e.listCacheFiles && e.removeCacheFile && e.canManageCache?.() !== false ? "managed" : "storage-only";
	}
	run_(e) {
		const t = this.chain_.then(e);
		this.chain_ = t.catch(() => {});
		return t;
	}
	async load_() {
		if (this.index_) return this.index_;
		const e = await this.platform_.readCacheFile(v);
		if (e) try {
			const t = JSON.parse(n(new Uint8Array(e)));
			if (t.schema !== 1 || !Array.isArray(t.entries) || !t.owners || !t.entries.every((e) => /^[0-9a-f]{16}(?:\.\d+\.tmp)?$/.test(e.name) && Number.isFinite(e.size) && e.size >= 0 && Number.isFinite(e.lastAccess) && (e.key === void 0 || typeof e.key === "string" && _(e.key) === e.name)) || !Object.values(t.owners).every((e) => Array.isArray(e) && e.every((e) => typeof e.revision === "string" && Array.isArray(e.keys) && e.keys.every((e) => typeof e === "string") && [
				null,
				"current",
				"pending",
				"rollback",
				"retained"
			].includes(e.reason)))) throw Error("invalid index");
			this.index_ = t;
			this.indexBytes_ = e.byteLength;
			return t;
		} catch {}
		return this.index_ = {
			schema: 1,
			entries: [],
			owners: {}
		};
	}
	async save_() {
		const e = t(JSON.stringify(this.index_));
		await this.platform_.writeCacheFile(v, e.buffer);
		this.indexBytes_ = e.byteLength;
	}
	async read(e) {
		if (this.capability() !== "managed") return this.platform_.readCacheFile(e);
		return this.run_(async () => {
			const t = await this.load_();
			const n = await this.platform_.readCacheFile(e);
			const r = t.entries.find((t) => t.name === _(e));
			if (n && r) {
				r.lastAccess = Date.now();
				await this.save_().catch(() => {});
			}
			return n;
		});
	}
	async write(e, t) {
		if (this.capability() !== "managed") return this.platform_.writeCacheFile(e, t);
		return this.run_(async () => {
			const n = await this.load_();
			await this.platform_.writeCacheFile(e, t);
			const r = {
				name: _(e),
				key: e,
				hash: h(new Uint8Array(t)),
				size: t.byteLength,
				lastAccess: Date.now()
			};
			n.entries = n.entries.filter((e) => e.name !== r.name);
			n.entries.push(r);
			await this.save_();
		});
	}
	/** Replaces this application's protected versions, preserving historical
	* ownership and other applications sharing the directory. Persists before
	* an updater starts downloading or switches its active manifest. */
	async protect(e, t) {
		if (this.capability() !== "managed") return;
		const n = /* @__PURE__ */ new Map();
		const r = [
			null,
			"retained",
			"rollback",
			"pending",
			"current"
		];
		for (const e of t) {
			const t = n.get(e.revision);
			n.set(e.revision, {
				revision: e.revision,
				reason: t && r.indexOf(t.reason) > r.indexOf(e.reason) ? t.reason : e.reason,
				keys: [.../* @__PURE__ */ new Set([...t?.keys ?? [], ...e.keys])]
			});
		}
		const i = [...n.values()];
		return this.run_(async () => {
			const t = await this.load_();
			const n = t.owners[e] ?? [];
			t.owners[e] = [...n.filter((e) => !i.some((t) => t.revision === e.revision)).map((e) => ({
				...e,
				reason: null
			})), ...i];
			await this.save_();
		});
	}
	async scan_(e = false) {
		const t = await this.load_();
		const n = await this.platform_.listCacheFiles();
		const r = new Map(t.entries.map((e) => [e.name, e]));
		t.entries = n.filter((e) => e.name !== y).map((e) => ({
			...r.get(e.name),
			...e,
			lastAccess: Math.max(r.get(e.name)?.lastAccess ?? 0, e.lastAccess)
		}));
		this.indexBytes_ = n.find((e) => e.name === y)?.size ?? 0;
		if (e) {
			const e = /* @__PURE__ */ new Map();
			for (const n of Object.values(t.owners)) for (const t of n) for (const n of t.keys) e.set(_(n), n);
			for (const n of t.entries) {
				const t = e.get(n.name);
				if (n.key || !t) continue;
				const r = await this.platform_.readCacheFile(t).catch(() => null);
				if (!r) continue;
				n.key = t;
				n.hash = h(new Uint8Array(r));
				n.size = r.byteLength;
			}
		}
	}
	/** Explicit retention lives under its own owner, so advancing the automatic
	* current/rollback pair cannot silently release a developer's retained build. */
	async retainVersion(e, t, n = true) {
		if (this.capability() !== "managed") throw Error("cache management unavailable");
		return this.run_(async () => {
			const r = await this.load_();
			const i = `retained:${e}`;
			const a = r.owners[i] ?? [];
			const o = r.owners[e]?.find((e) => e.revision === t);
			if (!o) throw Error("unknown cache version");
			r.owners[i] = a.filter((e) => e.revision !== t);
			if (n) r.owners[i].push({
				...o,
				keys: [...o.keys],
				reason: "retained"
			});
			await this.save_();
		});
	}
	report_() {
		const e = this.capability();
		if (e !== "managed") return {
			capability: e,
			usedBytes: null,
			indexBytes: null,
			protectedBytes: null,
			reclaimableBytes: null,
			entries: [],
			versions: []
		};
		const t = this.index_;
		const n = new Set(t.entries.map((e) => e.name));
		const r = /* @__PURE__ */ new Map();
		const i = [];
		for (const [e, a] of Object.entries(t.owners)) {
			const o = new Set(t.owners[`retained:${e}`]?.map((e) => e.revision) ?? []);
			for (const t of a) {
				let a = 0;
				for (const i of t.keys) {
					const o = _(i);
					if (!n.has(o)) a++;
					let s = r.get(o);
					if (!s) {
						s = {
							versions: /* @__PURE__ */ new Set(),
							protection: /* @__PURE__ */ new Set()
						};
						r.set(o, s);
					}
					s.versions.add(t.revision);
					if (t.reason) s.protection.add(`${e}:${t.reason}`);
				}
				if (!e.startsWith("retained:")) {
					const n = o.has(t.revision);
					i.push({
						owner: e,
						revision: t.revision,
						reason: t.reason ?? (n ? "retained" : null),
						retained: n,
						missing: a
					});
				}
			}
		}
		const a = t.entries.map((e) => {
			const t = r.get(e.name);
			return {
				...e,
				versions: [...t?.versions ?? []],
				protection: [...e.key ? [] : ["unindexed"], ...t?.protection ?? []]
			};
		});
		const o = a.reduce((e, t) => e + t.size, 0);
		const s = a.reduce((e, t) => e + (t.protection.length ? t.size : 0), 0);
		return {
			capability: e,
			usedBytes: o,
			indexBytes: this.indexBytes_,
			protectedBytes: s,
			reclaimableBytes: o - s,
			entries: a,
			versions: i
		};
	}
	async report(e = false) {
		if (this.capability() !== "managed") return this.report_();
		return this.run_(async () => {
			await this.scan_(e);
			if (e) await this.save_();
			return this.report_();
		});
	}
	preview_(e) {
		const t = this.report_();
		let n = t.usedBytes;
		const r = [];
		let i = 0;
		if (n !== null) for (const a of [...t.entries].filter((e) => e.protection.length === 0).sort((e, t) => e.lastAccess - t.lastAccess || e.name.localeCompare(t.name))) {
			if (n <= e) break;
			r.push(a.name);
			i += a.size;
			n -= a.size;
		}
		return {
			report: t,
			budgetBytes: e,
			candidates: r,
			releaseBytes: i,
			remainingBytes: n,
			budgetMet: n === null ? null : n <= e
		};
	}
	/** Re-evaluates protection at execution; never trusts a stale UI preview.
	* Serial deletion yields every batch and reports only successful unlinks. */
	async cleanup(e, t = false) {
		if (!Number.isSafeInteger(e) || e < 0) throw Error("cache budget must be a non-negative safe integer");
		return this.run_(async () => {
			if (this.capability() === "managed") await this.scan_();
			const n = this.preview_(e);
			const r = [], i = [];
			if (!t || n.report.capability !== "managed") return {
				...n,
				removed: r,
				failed: i
			};
			let a = 0;
			for (const e of n.candidates) {
				try {
					await this.platform_.removeCacheFile(e);
					a += this.index_.entries.find((t) => t.name === e).size;
					this.index_.entries = this.index_.entries.filter((t) => t.name !== e);
					r.push(e);
				} catch {
					i.push(e);
				}
				if ((r.length + i.length) % 16 === 0) await new Promise((e) => setTimeout(e, 0));
			}
			const o = await this.save_().then(() => true, () => false);
			const s = this.report_();
			return {
				...n,
				report: s,
				releaseBytes: a,
				remainingBytes: s.usedBytes,
				budgetMet: s.usedBytes <= e,
				removed: r,
				failed: i,
				indexPersisted: o
			};
		});
	}
};
const x = /* @__PURE__ */ new WeakMap();
function S(e) {
	let t = x.get(e);
	if (!t) {
		t = new b(e);
		x.set(e, t);
	}
	return t;
}
//#endregion
//#region src/platform/base.ts
let C = false;
let w = null;
/**
* Set the platform adapter (called by entry point)
*/
function ne(e) {
	w = e;
}
/**
* Add capabilities to the platform this app is already on — a host answering
* what its adapter cannot (the editor's play realm stands in for an open data
* context this way). Its own door because `setPlatform({ ...getPlatform() })`
* drops every method an adapter holds on its PROTOTYPE.
*
* @throws Error if no platform is set — there is nothing to extend yet.
*/
function re(e) {
	Object.assign(T(), e);
}
/**
* Get the current platform adapter
* @throws Error if platform not initialized
*/
function T() {
	if (!w) throw new Error("[ESEngine] Platform not initialized. Import from \"esengine\" (web) or \"esengine/wechat\" (WeChat) instead of direct imports.");
	return w;
}
/**
* Check if platform is initialized
*/
function E() {
	return w !== null;
}
/**
* Get platform type
*/
function D() {
	return w?.name ?? null;
}
/**
* Check if running on WeChat specifically (true vendor identity).
* Prefer isMiniGame() for "no DOM / packaged fs / subpackages" checks that hold
* for every mini-game vendor, not just WeChat.
*/
function O() {
	return w?.name === "wechat";
}
/**
* Check if running on any mini-game host (WeChat, Douyin, a vendor the game
* brought itself) — the capability family that shares the packaged-filesystem /
* subpackage / no-DOM model.
*
* Reads the adapter's declared family, not a list of vendor names: every
* platform built on {@link MiniGamePlatformAdapter} answers true here, so
* shipping a new vendor never means editing this function.
*/
function k() {
	return w?.family === "minigame";
}
/**
* Check if running on Web
*/
function A() {
	return w?.name === "web";
}
/**
* Check if running on a native host (embedded Dawn + JS engine on iOS/Android).
* Native has no DOM: offscreen canvas/image throw, textures come from the
* pixel-decode path (loadImagePixels), and lifecycle/safe-area treat it like a
* headless-but-visible host rather than the web DOM branch.
*/
function j() {
	return w?.name === "native";
}
async function M(e, t) {
	return T().fetch(e, t);
}
async function N(e) {
	return T().readFile(e);
}
async function P(e) {
	return T().readTextFile(e);
}
async function F(e) {
	return T().fileExists(e);
}
async function I(e) {
	return T().loadImagePixels(e);
}
async function L(e, t) {
	return T().instantiateWasm(e, t);
}
function R(e, t) {
	return T().createCanvas(e, t);
}
function z() {
	return T().createImage();
}
/** Whether this platform rasterizes glyphs itself (no 2D canvas to draw them on).
*  The glyph atlas picks its rasterizer from this — false everywhere a canvas
*  exists, so web/WeChat text is untouched. Safe before a platform is set. */
function B() {
	return E() && typeof T().rasterizeGlyph === "function";
}
/** Rasterize one glyph through the platform's own text stack; null when the
*  platform has no rasterizer, or the font/glyph was unavailable. */
function V(e) {
	if (!E()) return null;
	return T().rasterizeGlyph?.(e) ?? null;
}
/** The platform's text-editing surface, or null where there is none (a headless
*  realm, the editor in edit mode) — fields then render but cannot be typed
*  into. Safe before a platform is set. */
function H() {
	if (!E()) return null;
	return T().createTextEditor?.() ?? null;
}
function U() {
	return T().now();
}
/** Tear down input listeners the adapter bound. No-op on a host that never bound
*  input (headless node) or before a platform is set (tests). */
function W() {
	if (!E()) return;
	T().unbindInputEvents?.();
}
/** The platform audio backend, or the silent Null backend when the host has no
*  audio device (headless node, the native shell before audio lands) — the single
*  place the "no real backend" default is decided, mirroring the video backend. */
function G() {
	return T().createAudioBackend?.() ?? new te();
}
/** Download an on-demand subpackage by name (resolves immediately on platforms
*  with no subpackage concept, e.g. web). The single channel lazy asset groups
*  use before loading their assets. */
function K(e) {
	const t = T();
	return t.loadSubpackage ? t.loadSubpackage(e) : Promise.resolve();
}
/** Read a content-addressed asset from the persistent cache (hot-update's offline
*  store). Returns null on a miss, when the platform has no cache (web), when the
*  platform is uninitialized (tests), OR on any read error — every case means "not
*  cached, fetch normally", so cache failures never break loading. */
async function q(e) {
	if (!E()) return null;
	const t = T();
	if (!t.readCacheFile) return null;
	try {
		return await S(t).read(e);
	} catch {
		return null;
	}
}
/** Persist a content-addressed asset to the cache: `stored`, `failed` (said once in
*  the log as well), or `unsupported` where the platform keeps no cache (web) or is
*  uninitialized (tests). A caller decides what a failed write means for it. */
async function J(t, n) {
	if (!E()) return "unsupported";
	const r = T();
	if (!r.writeCacheFile || r.hasCacheStorage?.() === false) return "unsupported";
	try {
		await S(r).write(t, n);
		return "stored";
	} catch (t) {
		if (!C) {
			C = true;
			e.warn("asset", `cache write failed, so updated assets will need the network next launch: ${String(t)}`);
		}
		return "failed";
	}
}
/** Subscribe to OS memory-pressure warnings (wx.onMemoryWarning on WeChat).
*  Returns an unsubscribe. On platforms without a pressure signal the callback
*  simply never fires. Tolerates an uninitialized platform (tests). */
function Y(e) {
	if (!E()) return () => {};
	const t = T();
	return t.onMemoryWarning ? t.onMemoryWarning(e) : () => {};
}
/** Subscribe to errors that reached the host uncaught (window.onerror /
*  wx.onError and the promise equivalents). Returns an unsubscribe. A platform
*  without the signal never fires; tolerates an uninitialized platform (tests). */
function ie(e) {
	if (!E()) return () => {};
	const t = T();
	return t.onUnhandledError ? t.onUnhandledError(e) : () => {};
}
/** Subscribe to the render context being lost. Returns an unsubscribe. A
*  platform whose surface cannot be lost never fires; tolerates an
*  uninitialized platform (tests). */
function ae(e) {
	if (!E()) return () => {};
	const t = T();
	return t.onContextLost ? t.onContextLost(e) : () => {};
}
/** Subscribe to the app returning to foreground / going to background — the
*  native shell's push signals (no DOM visibility on native). Return an
*  unsubscribe; a platform without the signal never fires. Tolerates an
*  uninitialized platform (tests). */
function oe(e) {
	if (!E()) return () => {};
	const t = T();
	return t.onAppShow ? t.onAppShow(e) : () => {};
}
function se(e) {
	if (!E()) return () => {};
	const t = T();
	return t.onAppHide ? t.onAppHide(e) : () => {};
}
/** Read a persisted string by key (adapter storage: localStorage on web,
*  `wx.getStorageSync` on WeChat). Returns null when the key is absent OR the
*  platform is uninitialized (tests) — callers treat both as "nothing stored". */
function ce(e) {
	if (!E()) return null;
	return T().getStorageItem(e);
}
/** Persist a string by key through the adapter's storage. No-op when the platform
*  is uninitialized (tests), so persistence is a safe best-effort everywhere. */
function le(e, t) {
	if (!E()) return;
	T().setStorageItem(e, t);
}
function ue(e) {
	if (!E()) return;
	T().removeStorageItem(e);
}
/** The app's own native code, or null where there is none to reach (the web, a
*  mini-game, a native host built before the channel, an uninitialized platform). */
function de() {
	if (!E()) return null;
	return T().nativeChannel?.() ?? null;
}
/** Whether this platform can mint ad units at all, without minting one (a
*  mini-game host materializes a real host object per created unit). */
function fe() {
	return E() && T().createRewardedAd !== void 0;
}
/** One rewarded ad unit from the platform, or null where the platform has no ad
*  system (web, a native app whose own code answers for none, playable, an uninitialized platform in tests). Null is
*  an answer, not an error: the services layer substitutes its mock provider or
*  fails loud with the reason, which is a decision this layer cannot make. */
function pe(e) {
	if (!E()) return null;
	return T().createRewardedAd?.(e) ?? null;
}
/** One interstitial ad unit, or null — same availability story as rewarded. */
function me(e) {
	if (!E()) return null;
	return T().createInterstitialAd?.(e) ?? null;
}
/** Whether this platform can open a share sheet at all, without opening one. */
function he() {
	return E() && T().share !== void 0;
}
/** Actively open the host's share sheet; false when this platform cannot share
*  (web, native, tests) so the caller can hide its share button honestly. */
function ge(e) {
	if (!E()) return false;
	const t = T();
	if (!t.share) return false;
	t.share(e);
	return true;
}
/** Register the passive-share card provider; false when the platform has no
*  passive share surface. The host asks the provider at share time. */
function _e(e) {
	if (!E()) return false;
	const t = T();
	if (!t.onShareRequest) return false;
	t.onShareRequest(e);
	return true;
}
/** The host's screen recorder, or null where there is none — which a game reads
*  to hide its record button rather than to show one that fails. */
function ve() {
	if (!E()) return null;
	return T().screenRecorder?.() ?? null;
}
/** Whether this platform can sign a player in at all — what a menu reads to
*  hide its sign-in button honestly (web, native and the editor cannot). */
function X() {
	if (!E()) return false;
	const e = T();
	return e.login !== void 0 && (e.canSignIn?.() ?? true);
}
/** Begin a sign-in; rejects where the platform has none, so a caller that
*  skipped {@link platformCanSignIn} still hears about it rather than awaiting
*  a promise that never settles. */
function ye() {
	if (!X()) return Promise.reject(/* @__PURE__ */ new Error("this platform has no sign-in"));
	return T().login();
}
/** Whether the host still regards the last sign-in as current. False where
*  there is no sign-in at all — there is nothing current about nothing. */
function be() {
	if (!E()) return Promise.resolve(false);
	return T().checkSession?.() ?? Promise.resolve(false);
}
/** Whether a purchase may happen here at all — declared by the platform, and
*  permitted on THIS device. See `PlatformAdapter.canPay`. */
function Z() {
	if (!E()) return false;
	const e = T();
	return e.requestPayment !== void 0 && (e.canPay?.() ?? true);
}
/** Buy in-game currency; rejects where purchase is not available, so a caller
*  that skipped {@link platformCanPay} hears why rather than hanging. */
function xe(e) {
	if (!Z()) return Promise.reject(/* @__PURE__ */ new Error("in-game purchase is not available on this platform"));
	return T().requestPayment(e);
}
/**
* Whether this platform has a USABLE open data context — what a leaderboard
* reads to hide itself honestly (web, native and the editor have none).
*
* Method presence is not the answer here, the way it is for share: the
* mini-game family is ONE adapter, so every vendor defines these, and a game
* whose package declares no context directory has none even on a host that
* supports them. So the honest probe is the same one the ad path uses — ask
* for the thing and treat null as "not here".
*/
function Q() {
	if (!E()) return false;
	const e = T();
	return e.openDataPostMessage !== void 0 && e.openDataCanvas?.() != null;
}
/**
* Send one message into the open data context; false where there is none.
* One way: the hosts offer no path back, so there is nothing to await.
*
* Gated on the same probe rather than on method presence — otherwise this
* reports a delivery it did not make, on every mini-game host without a
* context, which is the answer a caller is least able to check.
*/
function Se(e) {
	if (!Q()) return false;
	T().openDataPostMessage(e);
	return true;
}
/** The canvas the open data context draws on, for sampling as a texture. */
function Ce() {
	if (!E()) return null;
	return T().openDataCanvas?.() ?? null;
}
/** Write this player's own cloud rows; false where the host has no such store.
*  Unlike a share, "there was nowhere to write this" is knowable at call time,
*  so it is reported rather than swallowed. */
function $(e) {
	if (!E()) return false;
	return T().setCloudKeyValues?.(e) ?? false;
}
function we() {
	if (w) return w.devicePixelRatio();
	return typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
}
/** The host's UI language as a BCP-47-ish tag ('zh-CN', 'en-US', …): the
*  adapter's report (WeChat), else navigator.language (web), else 'en'.
*  Underscore tags ('zh_CN') normalize to hyphens. Tolerates an
*  uninitialized platform (tests). */
function Te() {
	return (w?.language?.() ?? (typeof navigator !== "undefined" ? navigator.language : void 0) ?? "en").replace(/_/g, "-");
}
//#endregion
export { ne as $, ye as A, Se as B, F as C, Te as D, L as E, ae as F, ue as G, q as H, Y as I, $ as J, xe as K, _e as L, U as M, se as N, I as O, oe as P, J as Q, ie as R, M as S, B as T, N as U, V, P as W, ge as X, le as Y, W as Z, z as _, j as a, H as b, A as c, Z as d, S as et, he as f, R as g, G as h, k as i, de as j, K as k, fe as l, be as m, T as n, h as nt, E as o, X as p, ve as q, D as r, g as rt, O as s, re as t, _ as tt, Q as u, me as v, ce as w, we as x, pe as y, Ce as z };

//# sourceMappingURL=base.js.map