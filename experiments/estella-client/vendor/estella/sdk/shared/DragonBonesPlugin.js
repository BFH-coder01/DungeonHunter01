import { R as e, gt as t, n } from "./system.js";
import { i as r, s as i } from "./resource.js";
import { s as a } from "./logger.js";
import { n as o } from "./utf8.js";
import { t as s } from "./wasmScratch.js";
import { i as c, n as l, r as u, t as d } from "./submitDomains.js";
//#region src/dragonbones/atlasOwnership.ts
const f = /* @__PURE__ */ new WeakMap();
const p = /* @__PURE__ */ new WeakMap();
function m(e, t) {
	f.set(e, t);
}
function h(e, t, n) {
	const r = f.get(e);
	if (!r) return;
	f.delete(e);
	let i = p.get(t);
	if (!i) p.set(t, i = /* @__PURE__ */ new Map());
	const a = i.get(n);
	i.set(n, r);
	a?.();
}
function g(e, t) {
	const n = p.get(e), r = n?.get(t);
	n?.delete(t);
	r?.();
}
function _(e) {
	const t = p.get(e);
	p.delete(e);
	if (t) for (const e of t.values()) e();
}
function v(e) {
	for (const t of e) {
		const e = f.get(t);
		f.delete(t);
		e?.();
	}
}
//#endregion
//#region src/dragonbones/DragonBonesManager.ts
var y = class {
	constructor(e) {
		this.entities_ = /* @__PURE__ */ new Map();
		this.disabled_ = /* @__PURE__ */ new Set();
		this.skeletons_ = /* @__PURE__ */ new Map();
		this.unkeyedSkeletons_ = /* @__PURE__ */ new Map();
		this.controller_ = e;
	}
	get controller() {
		return this.controller_;
	}
	/**
	* Parse a file once per `assetKey`, or every time when none is given.
	* Returns -1 on failure, with the reason on the controller.
	*/
	loadSkeleton(e, t, n) {
		if (n !== void 0) {
			const e = this.skeletons_.get(n);
			if (e) return e.handle;
		}
		const r = this.controller_.loadSkeleton(e, t);
		if (r < 0) {
			a.warn("dragonbones", `loadSkeleton failed: ${this.controller_.getLastError()}`);
			return -1;
		}
		if (n !== void 0) this.skeletons_.set(n, {
			handle: r,
			refcount: 0
		});
		else this.unkeyedSkeletons_.set(r, 0);
		return r;
	}
	/** Bind the uploaded atlas page; safe after instances exist. */
	setAtlasTexture(e, t) {
		this.controller_.setAtlasTexture(e, t);
	}
	getArmatures(e) {
		return this.controller_.getArmatures(e);
	}
	/** @internal Retire a scene load that produced no armature instances. */
	discardUnboundSkeleton(e) {
		const t = this.skeletons_.get(e);
		if (!t || t.refcount !== 0) return;
		this.controller_.unloadSkeleton(t.handle);
		this.skeletons_.delete(e);
		g(this, t.handle);
	}
	/** Replace an armature only after its new instance and ownership are valid. */
	addEntity(e, t, n) {
		const r = this.entities_.get(e);
		const i = n.assetKey === void 0 ? void 0 : this.skeletons_.get(n.assetKey);
		if (n.assetKey !== void 0 && (!i || i.handle !== t)) return false;
		if (n.assetKey === void 0 && [...this.skeletons_.values()].some((e) => e.handle === t)) return false;
		if (r?.skeletonHandle === t && r.assetKey !== n.assetKey) return false;
		const a = this.controller_.createInstance(t, n.armature);
		if (a < 0) return false;
		if (i) i.refcount++;
		else this.unkeyedSkeletons_.set(t, (this.unkeyedSkeletons_.get(t) ?? 0) + 1);
		if (r) {
			this.controller_.destroyInstance(r.instanceId);
			this.releaseSkeleton_(r);
		}
		const o = {
			skeletonHandle: t,
			instanceId: a,
			skeletonScale: n.skeletonScale ?? 1,
			flipX: n.flipX ?? false,
			flipY: n.flipY ?? false,
			layer: n.layer ?? 0,
			timeScale: 1,
			playing: true,
			assetKey: n.assetKey
		};
		this.entities_.set(e, o);
		if (n.animation) this.controller_.play(a, n.animation, n.loop ?? true);
		return true;
	}
	removeEntity(e) {
		const t = this.entities_.get(e);
		if (!t) return;
		this.controller_.destroyInstance(t.instanceId);
		this.releaseSkeleton_(t);
		this.entities_.delete(e);
		this.disabled_.delete(e);
	}
	hasInstance(e) {
		return this.entities_.has(e);
	}
	/** The entities that currently have an armature bound — what a per-frame pass
	*  over "everything DragonBones draws" iterates, without asking the World. */
	boundEntities() {
		return this.entities_.keys();
	}
	/**
	* A disabled entity keeps its instance but stops advancing and drawing.
	*
	* Also driven by `DragonBonesAnimation.enabled` — the plugin carries that field
	* across on its edges (skeletal/enableSync), so writing the component wins at
	* the moment it is written and this call holds between such writes.
	*/
	setEnabled(e, t) {
		if (t) this.disabled_.delete(e);
		else this.disabled_.add(e);
	}
	setEntityProps(e, t) {
		const n = this.entities_.get(e);
		if (!n) return;
		const { timeScale: r, color: i, ...a } = t;
		Object.assign(n, a);
		if (r !== void 0) this.setTimeScale(e, r);
		if (i) this.setColor(e, i.r, i.g, i.b, i.a);
	}
	/**
	* Tint the whole armature. Multiplied onto each slot's authored colour, so
	* opaque white is not "no tint applied" but "the tint that changes nothing" —
	* which is why clearing the field in the editor restores the original rather
	* than leaving the last colour stuck.
	*/
	setColor(e, t, n, r, i) {
		const a = this.entities_.get(e);
		if (a) this.controller_.setColor(a.instanceId, t, n, r, i);
	}
	play(e, t, n = true) {
		const r = this.entities_.get(e);
		return r ? this.controller_.play(r.instanceId, t, n) : false;
	}
	/** Crossfade in, which is where DragonBones puts what Spine keeps in a table. */
	fadeIn(e, t, n, r = true) {
		const i = this.entities_.get(e);
		return i ? this.controller_.fadeIn(i.instanceId, t, n, r) : false;
	}
	stop(e, t = "") {
		const n = this.entities_.get(e);
		if (n) this.controller_.stop(n.instanceId, t);
	}
	setTimeScale(e, t) {
		const n = this.entities_.get(e);
		if (!n) return;
		n.timeScale = t;
		this.controller_.setTimeScale(n.instanceId, t);
	}
	getAnimations(e) {
		const t = this.entities_.get(e);
		return t ? this.controller_.getAnimations(t.instanceId) : [];
	}
	/** The posed bones of this entity's armature and how it places them; null if not loaded. @experimental */
	boneTree(e) {
		const t = this.entities_.get(e);
		if (!t) return null;
		const n = this.controller_.getBoneTree(t.instanceId);
		return n ? {
			bones: n,
			scale: t.skeletonScale,
			flipX: t.flipX,
			flipY: t.flipY
		} : null;
	}
	getBounds(e) {
		const t = this.entities_.get(e);
		return t ? this.controller_.getBounds(t.instanceId) : null;
	}
	/** Freeze inactive entities without changing their manual enable state. */
	updateAnimations(e, t) {
		for (const [n, r] of this.entities_) {
			if (this.disabled_.has(n) || t && !t(n)) continue;
			if (!r.playing) continue;
			this.controller_.update(r.instanceId, e);
		}
	}
	/** Skip extraction for entities the activity predicate excludes. */
	submitMeshes(e, t, n, r) {
		for (const [i, a] of this.entities_) {
			if (this.disabled_.has(i) || r && !r(i)) continue;
			if (!u(e, t, i, a, (e) => this.controller_.forEachMeshBatch(a.instanceId, e), n)) return;
		}
	}
	/** Drop every instance and skeleton. Idempotent, so a second call is a no-op. */
	dispose() {
		for (const e of this.entities_.values()) this.controller_.destroyInstance(e.instanceId);
		for (const e of this.skeletons_.values()) this.controller_.unloadSkeleton(e.handle);
		for (const e of this.unkeyedSkeletons_.keys()) this.controller_.unloadSkeleton(e);
		_(this);
		this.entities_.clear();
		this.disabled_.clear();
		this.skeletons_.clear();
		this.unkeyedSkeletons_.clear();
	}
	/** One reference gone; a shared skeleton unloads when the last one does. */
	releaseSkeleton_(e) {
		if (e.assetKey === void 0) {
			const t = (this.unkeyedSkeletons_.get(e.skeletonHandle) ?? 1) - 1;
			if (t > 0) this.unkeyedSkeletons_.set(e.skeletonHandle, t);
			else {
				this.controller_.unloadSkeleton(e.skeletonHandle);
				g(this, e.skeletonHandle);
				this.unkeyedSkeletons_.delete(e.skeletonHandle);
			}
			return;
		}
		const t = this.skeletons_.get(e.assetKey);
		if (!t) return;
		if (--t.refcount <= 0) {
			this.controller_.unloadSkeleton(t.handle);
			g(this, t.handle);
			this.skeletons_.delete(e.assetKey);
		}
	}
};
//#endregion
//#region src/dragonbones/DragonBonesController.ts
/**
* @file    dragonbones/DragonBonesController.ts
* @brief   One loaded DragonBones module, driven from TypeScript.
*
* @details Implements SkeletalController — the part that means the same thing as
*          it does for Spine — and then adds what only DragonBones has, rather
*          than bending either runtime into the other's vocabulary.
*
*          Two additions are worth naming. `getArmatures` exists because a
*          DragonBones file is a project holding several armatures, so choosing
*          one is a real step and not a detail. And `fadeIn` is where Spine would
*          set a mix duration: DragonBones crossfades at the moment of play, so
*          the fade is an argument to starting an animation, not state on the
*          skeleton.
*/
/** Parse a `["a","b"]` the module published; a malformed one is no names, not a throw. */
function b(e) {
	try {
		const t = JSON.parse(e);
		return Array.isArray(t) ? t : [];
	} catch {
		return [];
	}
}
var x = class {
	constructor(e, t) {
		this.raw_ = e;
		this.api_ = t;
	}
	/**
	* Parse a skeleton and its atlas together; -1 on failure, with the reason in
	* {@link getLastError}. Both are copied into the module's heap because the
	* parsers want a terminated string and the caller's bytes are not one.
	*/
	loadSkeleton(e, t) {
		const n = typeof e === "string" ? o(e) : e;
		const r = o(t);
		return s(this.raw_, n.length + r.length, (e) => {
			const t = e;
			const i = e + n.length;
			this.raw_.HEAPU8.set(n, t);
			this.raw_.HEAPU8.set(r, i);
			return this.api_.loadSkeleton(t, n.length, i, r.length);
		});
	}
	getLastError() {
		return this.api_.getLastError();
	}
	unloadSkeleton(e) {
		this.api_.unloadSkeleton(e);
	}
	/** The armatures this file holds — DragonBones-only; a Spine file has one skeleton. */
	getArmatures(e) {
		return b(this.api_.getArmatures(e));
	}
	/** The image the atlas expects, so the caller knows what to upload. */
	getAtlasImageName(e) {
		return this.api_.getAtlasImageName(e);
	}
	/**
	* Bind the uploaded page. Safe to call after instances exist — the module
	* invalidates them, because uploading last is the normal order.
	*/
	setAtlasTexture(e, t) {
		this.api_.setAtlasTexture(e, t);
	}
	/** -1 when the file holds no armature by that name (see {@link getArmatures}). */
	createInstance(e, t) {
		const n = this.api_.createInstance(e, t);
		if (n < 0) a.warn("dragonbones", `createInstance failed: ${this.getLastError()}`);
		return n;
	}
	destroyInstance(e) {
		this.api_.destroyInstance(e);
	}
	/** `loop` false plays once; DragonBones counts plays, where 0 means forever. */
	play(e, t, n = true) {
		return this.api_.playAnimation(e, t, n ? 0 : 1) !== 0;
	}
	/** Crossfade into `animation` over `fadeSeconds` — Spine's mix table, per play. */
	fadeIn(e, t, n, r = true) {
		return this.api_.fadeInAnimation(e, t, n, r ? 0 : 1) !== 0;
	}
	stop(e, t = "") {
		this.api_.stopAnimation(e, t);
	}
	setTimeScale(e, t) {
		this.api_.setTimeScale(e, t);
	}
	/** Tint, multiplied onto each slot's authored colour — opaque white is "as drawn". */
	setColor(e, t, n, r, i) {
		this.api_.setColor(e, t, n, r, i);
	}
	update(e, t) {
		this.api_.update(e, t);
	}
	getAnimations(e) {
		return b(this.api_.getAnimations(e));
	}
	/**
	* The armature's bones as posed now, in the y-up space the geometry is in: name, parent
	* (-1 for a root), start, the way each points in degrees, and length. Null from a module
	* built before the call existed. @experimental
	*/
	getBoneTree(e) {
		const t = this.api_;
		if (!t.getBones || !t.getBonePoses) return null;
		const n = b(t.getBones(e));
		if (n.length === 0) return [];
		return s(this.raw_, n.length * 5 * 4, (r) => {
			const i = t.getBonePoses(e, r, n.length);
			const a = this.raw_.HEAPF32;
			const o = [];
			for (let e = 0; e < i; e++) {
				const t = (r >> 2) + e * 5;
				o.push({
					name: n[e],
					parent: a[t] | 0,
					x: a[t + 1],
					y: a[t + 2],
					degrees: a[t + 3],
					length: a[t + 4]
				});
			}
			return o;
		});
	}
	getBounds(e) {
		return s(this.raw_, 16, (t) => {
			this.api_.getBounds(e, t, t + 4, t + 8, t + 12);
			const n = this.raw_.HEAPF32;
			return {
				x: n[t >> 2],
				y: n[t + 4 >> 2],
				width: n[t + 8 >> 2],
				height: n[t + 12 >> 2]
			};
		});
	}
	forEachMeshBatch(e, t) {
		c(this.raw_, this.api_, e, t);
	}
	/** The DragonBones data format this module reads. */
	runtimeVersion() {
		return this.api_.runtimeVersion();
	}
};
//#endregion
//#region src/dragonbones/DragonBonesModuleLoader.ts
const S = "number";
const C = "string";
/** Bind every export once; a typo becomes a load-time failure, not a call-time one. */
function w(e) {
	const t = (t, n, r) => e.cwrap(`db_${t}`, n, r);
	return {
		loadSkeleton: t("loadSkeleton", S, [
			S,
			S,
			S,
			S
		]),
		getLastError: t("getLastError", C, []),
		unloadSkeleton: t("unloadSkeleton", null, [S]),
		getArmatures: t("getArmatures", C, [S]),
		getAtlasImageName: t("getAtlasImageName", C, [S]),
		setAtlasTexture: t("setAtlasTexture", null, [S, S]),
		createInstance: t("createInstance", S, [S, C]),
		destroyInstance: t("destroyInstance", null, [S]),
		playAnimation: t("playAnimation", S, [
			S,
			C,
			S
		]),
		fadeInAnimation: t("fadeInAnimation", S, [
			S,
			C,
			S,
			S
		]),
		stopAnimation: t("stopAnimation", null, [S, C]),
		setTimeScale: t("setTimeScale", null, [S, S]),
		setColor: t("setColor", null, [
			S,
			S,
			S,
			S,
			S
		]),
		update: t("update", null, [S, S]),
		getAnimations: t("getAnimations", C, [S]),
		getMeshBatchCount: t("getMeshBatchCount", S, [S]),
		getMeshBatchVertexCount: t("getMeshBatchVertexCount", S, [S, S]),
		getMeshBatchIndexCount: t("getMeshBatchIndexCount", S, [S, S]),
		getMeshBatchData: t("getMeshBatchData", null, [
			S,
			S,
			S,
			S,
			S,
			S
		]),
		getBounds: t("getBounds", null, [
			S,
			S,
			S,
			S,
			S
		]),
		getBones: e._db_getBones ? t("getBones", C, [S]) : void 0,
		getBonePoses: e._db_getBonePoses ? t("getBonePoses", S, [
			S,
			S,
			S
		]) : void 0,
		runtimeVersion: t("runtimeVersion", S, [])
	};
}
//#endregion
//#region src/dragonbones/DragonBonesPlugin.ts
/** Reach the manager from a system or from gameplay code. Null until acquired. */
const T = i(null, "DragonBones");
var E = class {
	/** Pass a manager for headless use or tests; otherwise it is built on demand. */
	constructor(e) {
		this.name = "dragonbones";
		this.app_ = null;
		this.despawnUnsub_ = null;
		this.acquiring_ = null;
		this.submitWired_ = false;
		this.enableMirror_ = new l(t);
		this.manager_ = e ?? null;
	}
	get manager() {
		return this.manager_;
	}
	/**
	* Load the side module and build the manager, once.
	*
	* Concurrent callers share the one in-flight promise: two entities spawning in
	* the same frame must not instantiate two wasm modules and then disagree about
	* which one owns their skeletons.
	*/
	acquire() {
		if (this.manager_) return Promise.resolve(this.manager_);
		if (this.acquiring_) return this.acquiring_;
		const e = this.app_;
		const t = e?.sideModules;
		if (!e || !t) return Promise.resolve(null);
		this.acquiring_ = t.acquire("dragonbones").then((t) => {
			if (!t) {
				a.warn("dragonbones", "module unavailable in this realm");
				return null;
			}
			const n = t;
			const r = new y(new x(n, w(n)));
			this.manager_ = r;
			e.insertResource(T, r);
			return r;
		}).catch((e) => {
			a.warn("dragonbones", `module failed to load: ${String(e)}`);
			return null;
		}).finally(() => {
			this.acquiring_ = null;
		});
		return this.acquiring_;
	}
	build(n) {
		this.app_ = n;
		const i = (e) => n.world.isEntityActive(e);
		n.insertResource(T, this.manager_);
		this.despawnUnsub_ = n.world.onDespawn((e) => {
			this.manager_?.removeEntity(e);
		});
		if (!this.submitWired_) {
			this.submitWired_ = true;
			const r = e(n);
			d(n, (e, i) => {
				if (r) this.manager_?.submitMeshes(r, e._cpp, (e) => n.world.tryGet(e, t)?.material ?? 0, i);
			}, i);
		}
		const a = {
			_id: Symbol("DragonBonesUpdateSystem"),
			_name: "DragonBonesUpdateSystem",
			_params: [],
			_fn: () => {
				const e = n.getResource(r);
				const t = this.manager_;
				if (!t) return;
				this.enableMirror_.sync(n.world, t, i);
				t.updateAnimations(e?.delta ?? 0, i);
			}
		};
		n.addSystemToSchedule(2, a);
	}
	/**
	* Drop the despawn subscription and free every skeleton the module holds.
	* Without it a re-init leaves a listener pointing at a dead manager and the
	* wasm side keeps armatures nothing can reach.
	*/
	cleanup() {
		this.despawnUnsub_?.();
		this.despawnUnsub_ = null;
		this.manager_?.dispose();
		this.manager_ = null;
		this.acquiring_ = null;
	}
};
const D = () => new E();
//#endregion
export { x as a, m as c, w as i, v as l, E as n, y as o, D as r, h as s, T as t };

//# sourceMappingURL=DragonBonesPlugin.js.map