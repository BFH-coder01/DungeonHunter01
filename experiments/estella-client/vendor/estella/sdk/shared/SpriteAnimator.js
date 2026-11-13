import { $t as e, Ht as t } from "./system.js";
import { s as n } from "./resource.js";
import { n as r } from "./context.js";
//#region src/asset/AssetRegistry.ts
/**
* @file    AssetRegistry.ts
* @brief   Maps stable asset UUIDs to file paths + importer settings.
*
* Scene / prefab JSON stores asset references as `"@uuid:<uuid-v4>"` strings.
* At load time the registry answers "which path does this UUID point to?" so
* the loader can fetch the bytes. Renaming a file on disk therefore never
* breaks a ref — the UUID (baked into the `.meta` sidecar) stays stable;
* only the path moves, and the registry is rebuilt from the new filesystem
* layout on next scan.
*
* The registry itself is pure data — it has no I/O. Populate it from an
* `AssetManifest` (produced at build time or scanned by a host-side tool)
* via `loadManifest()` / `addEntries()`. The asset system consults it
* through `resolveRef()` / `uuidToPath()`.
*/
/** Prefix that distinguishes a UUID ref from a raw path in serialized data. */
const i = "@uuid:";
/** UUID v4 regex — 8-4-4-4-12 lowercase hex. Generators use crypto.randomUUID(). */
const a = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/**
* True if `ref` is an asset UUID reference. Accepts two forms:
*   - canonical: `"@uuid:xxxxxxxx-xxxx-..."`
*   - bare:     `"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"`
*
* The bare form exists because earlier prefabs in the repo (pre-Phase 1
* of the resource refactor) wrote UUIDs as plain strings. The migration
* script rewrites those to the canonical form, but until it runs the
* loader must accept both. UUID_V4_REGEX is strict enough that no plain
* asset path can collide (paths have slashes / extensions).
*/
function o(e) {
	if (typeof e !== "string") return false;
	if (e.startsWith("@uuid:")) return a.test(e.slice(6));
	return a.test(e);
}
/**
* Extract the UUID out of either ref form, or null if `ref` is not a UUID
* ref. The returned UUID is lower-cased for consistent map lookup.
*/
function s(e) {
	if (typeof e !== "string") return null;
	const t = e.startsWith("@uuid:") ? e.slice(6) : e;
	if (!a.test(t)) return null;
	return t.toLowerCase();
}
//#endregion
//#region src/animation/SpriteAnimator.ts
/**
* @file    SpriteAnimator.ts
* @brief   Sprite frame animation component and system (pure TypeScript)
*/
function c(e, t, n, r) {
	const i = e.frames[t]?.duration;
	return Math.max(Number.MIN_VALUE, (i !== void 0 && Number.isFinite(i) && i > 0 ? i : r) / n);
}
/**
* Owns one App's sprite-animation clip registry and frame-event listeners,
* advances SpriteAnimator components, and drives goto-frame/label. Published as
* the {@link SpriteAnimation} resource; read it as
* `app.getResource(SpriteAnimation)`.
*/
var l = class {
	constructor() {
		this.clips = /* @__PURE__ */ new Map();
		this.assetClips_ = null;
		this.entityListeners = /* @__PURE__ */ new Map();
		this.globalListeners = [];
		this.clipTokens = /* @__PURE__ */ new WeakMap();
		this.appliedAnimators = /* @__PURE__ */ new WeakMap();
		this.pendingApplies = /* @__PURE__ */ new WeakSet();
		this.updating = false;
	}
	registerClip(e) {
		this.clips.set(e.name, e);
	}
	/**
	* Register an EXISTING clip object under an additional lookup name. Loaders
	* register a clip under its resolved load path, which in some realms is an
	* absolute URL — components reference the serialized project-relative ref,
	* so the two must alias to the SAME object (events attached through one
	* name fire for the other).
	*/
	aliasClip(e, t) {
		this.clips.set(e, t);
	}
	unregisterClip(e) {
		this.clips.delete(e);
	}
	/**
	* @internal Where a clip loaded from a `.esanim` comes from: this app's
	* realm. A code registration wins, as it always did — what changes is that
	* the asset half is no longer a second copy kept in the map above.
	*/
	useAssetClips(e) {
		this.assetClips_ = e;
	}
	getClip(e) {
		return this.clips.get(e) ?? this.assetClips_?.(e);
	}
	clearClips() {
		this.clips.clear();
	}
	onEvent(e, t) {
		this.entityListeners.set(e, [...this.entityListeners.get(e) ?? [], t]);
		return () => {
			const n = this.entityListeners.get(e);
			if (n) {
				const r = n.indexOf(t);
				if (r < 0) return;
				if (n.length === 1) this.entityListeners.delete(e);
				else this.entityListeners.set(e, [...n.slice(0, r), ...n.slice(r + 1)]);
			}
		};
	}
	onEventGlobal(e) {
		this.globalListeners = [...this.globalListeners, e];
		return () => {
			const t = this.globalListeners.indexOf(e);
			if (t >= 0) this.globalListeners = [...this.globalListeners.slice(0, t), ...this.globalListeners.slice(t + 1)];
		};
	}
	removeEntityListeners(e) {
		this.entityListeners.delete(e);
	}
	isCurrentAnimator(e, t, n, r, i, a, o) {
		if (!e.isEntityActive(t) || !n.enabled) {
			this.pendingApplies.add(n);
			return false;
		}
		if (e.tryGet(t, d) !== n || n.clip !== r || this.getClip(r) !== i || this.pendingApplies.has(n)) return false;
		if (i.frames !== a || a.length !== o || !Number.isInteger(n.currentFrame) || n.currentFrame < 0 || n.currentFrame >= o) {
			this.appliedAnimators.delete(n);
			return false;
		}
		return true;
	}
	fireEvents(e, t, n, r, i, a, o, s, c) {
		if (!i.events || i.events.length === 0) return true;
		if (!this.entityListeners.get(t)?.length && !this.globalListeners.length) return true;
		const l = i.frames;
		const u = l.length;
		let d;
		let f = 0;
		let p;
		for (const e of i.events) {
			if (!Number.isInteger(e.frame) || e.frame < 0 || e.frame >= i.frames.length) continue;
			const t = e.frame - a;
			const n = s && t === 0 ? 0 : c ? (t + i.frames.length) % i.frames.length || i.frames.length : t;
			if (!(n === 0 && s) && !(n > 0 && n <= o)) continue;
			if (!d) {
				d = e;
				f = n;
			} else {
				p ??= [{
					event: d,
					distance: f
				}];
				p.push({
					event: e,
					distance: n
				});
			}
		}
		if (p) p.sort((e, t) => e.distance - t.distance);
		const m = p?.length ?? (d ? 1 : 0);
		for (let a = 0; a < m; a++) {
			const o = p ? p[a].event : d;
			const s = this.entityListeners.get(t);
			const c = this.globalListeners;
			if (s) for (const a of s) {
				a(o, t);
				if (!this.isCurrentAnimator(e, t, n, r, i, l, u)) return false;
			}
			for (const a of c) {
				a(o, t);
				if (!this.isCurrentAnimator(e, t, n, r, i, l, u)) return false;
			}
		}
		return true;
	}
	update(e, t) {
		if (this.updating) return;
		this.updating = true;
		try {
			this.updateWorld(e, t);
		} finally {
			this.updating = false;
		}
	}
	updateWorld(e, n) {
		const i = e.getEntitiesWithComponents([d]);
		if (i.length === 0) return;
		const a = e.getCppRegistry(), o = e.getWasmModule();
		const s = e.resolveGetter(t), l = e.resolveSetter(t);
		for (const u of i) {
			if (!e.isEntityActive(u)) continue;
			const i = e.tryGet(u, d);
			if (!i) continue;
			if (!i.enabled || !i.clip) continue;
			const f = this.appliedAnimators.get(i);
			if (!i.playing && !this.pendingApplies.has(i) && !f) continue;
			const p = i.clip;
			const m = this.getClip(p);
			if (!m || m.frames.length === 0) continue;
			if (i.finished && i.playing) {
				i.finished = false;
				i.currentFrame = 0;
				i.frameTimer = 0;
				this.appliedAnimators.delete(i);
			}
			let h = this.clipTokens.get(m);
			if (!h) {
				h = {};
				this.clipTokens.set(m, h);
			}
			const g = this.appliedAnimators.get(i) !== h;
			if (!i.playing && !this.pendingApplies.has(i) && !g) continue;
			const _ = Number.isFinite(i.speed) ? Math.max(i.speed, 1e-4) : 1;
			const v = 1 / (Number.isFinite(m.fps) && m.fps > 0 ? m.fps : 12);
			i.currentFrame = Number.isFinite(i.currentFrame) ? Math.max(0, Math.min(Math.floor(i.currentFrame), m.frames.length - 1)) : 0;
			const y = i.currentFrame;
			const b = i.playing;
			const x = i.loop && m.loop;
			const S = b && Number.isFinite(n) ? Math.max(0, n) : 0;
			i.frameTimer = Math.min(Number.MAX_VALUE, (Number.isFinite(i.frameTimer) ? Math.max(0, i.frameTimer) : 0) + S);
			let C = g || this.pendingApplies.has(i);
			let w = 0;
			let T = 0;
			let E = 0;
			while (i.playing && w < m.frames.length * 2) {
				if (x && w === m.frames.length) i.frameTimer %= E;
				const e = c(m, i.currentFrame, _, v);
				if (i.frameTimer < e) break;
				i.frameTimer -= e;
				if (w < m.frames.length) E += e;
				w++;
				i.currentFrame++;
				if (i.currentFrame >= m.frames.length) if (x) {
					i.currentFrame = 0;
					T++;
				} else {
					i.currentFrame = m.frames.length - 1;
					i.playing = false;
					i.finished = true;
					i.frameTimer = 0;
				}
				else T++;
				C = true;
			}
			this.pendingApplies.delete(i);
			if (g) this.appliedAnimators.set(i, h);
			if (C) {
				if (!this.fireEvents(e, u, i, p, m, y, T, g && b, x)) continue;
			}
			if (C && e.has(u, t)) {
				const n = m.frames[i.currentFrame];
				const c = s && l && !e.speculating && !r().editorBridge && a === e.getCppRegistry() && o === e.getWasmModule();
				const d = c ? s(u) : e.get(u, t);
				d.texture = n.texture;
				if (n.uvOffset) {
					d.uvOffset = {
						x: n.uvOffset.x,
						y: n.uvOffset.y
					};
					d.uvScale = n.uvScale ? {
						x: n.uvScale.x,
						y: n.uvScale.y
					} : {
						x: 1,
						y: 1
					};
				} else {
					d.uvOffset = {
						x: 0,
						y: 0
					};
					d.uvScale = {
						x: 1,
						y: 1
					};
				}
				if (n.size) d.size = {
					x: n.size.x,
					y: n.size.y
				};
				if (n.pivot) d.pivot = {
					x: n.pivot.x,
					y: n.pivot.y
				};
				if (c) {
					l(u, d);
					e.markChanged(u, t);
				} else e.set(u, t, d);
			}
			if (C) {
				e.set(u, d, i);
				this.appliedAnimators.set(i, h);
			}
		}
	}
	gotoFrame(e, t, n = true) {
		const r = this.getClip(e.clip);
		if (!r || r.frames.length === 0) return;
		e.currentFrame = Math.max(0, Math.min(t, r.frames.length - 1));
		e.frameTimer = 0;
		e.playing = n;
		e.finished = false;
		this.appliedAnimators.delete(e);
		this.pendingApplies.add(e);
	}
	gotoLabel(e, t, n = true) {
		const r = this.getClip(e.clip);
		if (!r || !r.labels) return;
		const i = r.labels[t];
		if (i === void 0) return;
		this.gotoFrame(e, i, n);
	}
};
/**
* Per-App sprite-animation resource (clip registry + frame-event listeners),
* published by `AnimationPlugin`. Read as `app.getResource(SpriteAnimation)`.
*/
const u = n(null, "SpriteAnimation");
/**
* Frame playback on an entity: which clip, how fast, and where in it. The clip is
* named rather than referenced, so a project registers clips from code or ships
* them as `.esanim` and this stays the same either way.
*
* @beta
*/
const d = e("SpriteAnimator", {
	clip: "",
	speed: 1,
	playing: true,
	loop: true,
	enabled: true,
	currentFrame: 0,
	frameTimer: 0,
	finished: false
}, { assetFields: [{
	field: "clip",
	type: "anim-clip"
}] });
//#endregion
export { s as a, i, l as n, o, d as r, u as t };

//# sourceMappingURL=SpriteAnimator.js.map