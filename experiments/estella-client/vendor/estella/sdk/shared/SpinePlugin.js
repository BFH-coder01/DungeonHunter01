import { R as e, n as t, zt as n } from "./system.js";
import { i as r, s as i } from "./resource.js";
import { s as a } from "./logger.js";
import { n as o, t as s } from "./wasmScratch.js";
import { m as c } from "./resourceManager.js";
import { i as l, n as u, r as d, t as f } from "./submitDomains.js";
import { r as p } from "./Animator.js";
//#region src/spine/SpineBridge.ts
/**
* @file    SpineBridge.ts
* @brief   Spine's bridges to its two WASM surfaces.
*
* @details Each spine version runs in its own standalone side module
*          (3.8 / 4.1 / 4.2), guarded through {@link WasmBridge} so every call
*          inherits the terminal-abort guard. (There is no native spine runtime
*          in the core module any more — spine is fully side-module.)
*/
/**
* Guards a version-specific spine side module's wrapped API. The call surface
* (`SpineWrappedAPI`, all functions) is guarded; its abort-authoritative module
* is the raw side module, which owns the heap, allocator, and `onAbort`.
*/
var m = class extends c {
	constructor(...e) {
		super(...e);
		this.label = "spine";
	}
};
//#endregion
//#region src/spine/SpineController.ts
var h = class {
	constructor(e, t) {
		this.bridge_ = new m();
		this.raw_ = e;
		this.bridge_.connect(t, e);
		this.api_ = this.bridge_.module;
	}
	get raw() {
		return this.raw_;
	}
	loadSkeleton(e, t, n) {
		return o(this.raw_, (r) => {
			const i = (e, t) => {
				const n = r(e.length + (t ? 1 : 0));
				this.raw_.HEAPU8.set(e, n);
				if (t) this.raw_.HEAPU8[n + e.length] = 0;
				return n;
			};
			const a = new TextEncoder();
			const o = typeof e === "string" ? a.encode(e) : e;
			const s = a.encode(t);
			return this.api_.loadSkeleton(i(o, typeof e === "string"), o.length, i(s, true), s.length, n);
		});
	}
	getLastError() {
		return this.api_.getLastError();
	}
	unloadSkeleton(e) {
		this.api_.unloadSkeleton(e);
	}
	getAtlasPageCount(e) {
		return this.api_.getAtlasPageCount(e);
	}
	getAtlasPageTextureName(e, t) {
		return this.api_.getAtlasPageTextureName(e, t);
	}
	setAtlasPageTexture(e, t, n, r, i) {
		this.api_.setAtlasPageTexture(e, t, n, r, i);
	}
	createInstance(e) {
		return this.api_.createInstance(e);
	}
	destroyInstance(e) {
		this.api_.destroyInstance(e);
	}
	/**
	* Back to where the skeleton's data says it starts, every track cleared.
	*
	* The one state a replay is reproducible from: `play` resets nothing, so a
	* bone the next animation does not key keeps whatever the last pose left it
	* at, and seeking twice to one time gives two poses.
	*/
	setToSetupPose(e) {
		this.api_.setToSetupPose(e);
	}
	play(e, t, n = true, r = 0) {
		return !!this.api_.playAnimation(e, t, n, r);
	}
	addAnimation(e, t, n = true, r = 0, i = 0) {
		return !!this.api_.addAnimation(e, t, n, r, i);
	}
	setSkin(e, t) {
		this.api_.setSkin(e, t);
	}
	update(e, t) {
		this.api_.update(e, t);
	}
	getAnimations(e) {
		const t = this.api_.getAnimations(e);
		try {
			return JSON.parse(t);
		} catch (e) {
			a.warn("spine", "Failed to parse animations JSON", e);
			return [];
		}
	}
	getSkins(e) {
		const t = this.api_.getSkins(e);
		try {
			return JSON.parse(t);
		} catch (e) {
			a.warn("spine", "Failed to parse skins JSON", e);
			return [];
		}
	}
	getBonePosition(e, t) {
		return o(this.raw_, (n) => {
			const r = n(4);
			const i = n(4);
			if (!this.api_.getBonePosition(e, t, r, i)) return null;
			return {
				x: this.raw_.HEAPF32[r >> 2],
				y: this.raw_.HEAPF32[i >> 2]
			};
		});
	}
	getBoneRotation(e, t) {
		return this.api_.getBoneRotation(e, t);
	}
	/**
	* The skeleton as a tree in the pose the instance is in: each bone's name, parent
	* (-1 for a root), where it starts, the way it points in degrees and how long it is,
	* in skeleton space. Null from a module built before the call existed. @experimental
	*/
	getBoneTree(e) {
		const t = this.api_;
		if (!t.getBones || !t.getBonePoses) return null;
		let n;
		try {
			n = JSON.parse(t.getBones(e));
		} catch (e) {
			a.warn("spine", "Failed to parse bones JSON", e);
			return null;
		}
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
	/**
	* What this instance's clipping costs the engine in the pose it is in, as
	* work rather than time: a coefficient measured on one machine and compiler
	* stops being true, and the three quantities below do not.
	*
	* `null` where the runtime cannot answer — 2.1 and 4.3 have no counted walk.
	*/
	clipBudget(e) {
		return s(this.raw_, 44, (t) => {
			if (!this.api_.clipBudget(e, t)) return null;
			const n = this.raw_.HEAPU32;
			const r = t >> 2;
			const i = n[r + 6];
			const a = n[r + 8];
			const o = n[r + 9];
			const s = n[r + 10];
			return {
				rawVertices: n[r],
				pieces: n[r + 1],
				effectiveEdges: n[r + 2],
				candidateTriangles: n[r + 3],
				rejectedTriangles: n[r + 4],
				bypassedTriangles: n[r + 5],
				chargedTriangles: i,
				edgeWork: n[r + 7],
				inputVertices: a,
				outputVertices: o,
				outputTriangles: s,
				vertexAmplification: a > 0 ? o / a : 0,
				triangleAmplification: i > 0 ? s / i : 0
			};
		});
	}
	/** The animation clock onto the bones' LOCAL transforms — see spineBounds
	*  and the runtime's ensurePose for why this is not the whole pose. */
	advanceAndApply(e, t) {
		this.api_.advanceAndApply(e, t);
	}
	/** The world transforms the local pose implies. */
	materializeWorldPose(e, t) {
		this.api_.materializeWorldPose(e, t);
	}
	/** Seconds; negative where this skeleton has no such animation. */
	animationDuration(e, t) {
		return this.api_.getAnimationDuration(e, t);
	}
	/** Whether this skeleton's world pose carries state and may not be deferred. */
	requiresContinuousWorldPose(e) {
		return !!this.api_.requiresContinuousWorldPose(e);
	}
	/** What the skeleton was AUTHORED at, in its own space — no instance, no
	*  pose, and never an authority over culling. See spineBounds. */
	skeletonBounds(e) {
		return s(this.raw_, 16, (t) => {
			if (!this.api_.getSkeletonBounds(e, t, t + 4, t + 8, t + 12)) return null;
			const n = this.raw_.HEAPF32;
			const r = t >> 2;
			return {
				minX: n[r],
				minY: n[r + 1],
				maxX: n[r] + n[r + 2],
				maxY: n[r + 1] + n[r + 3]
			};
		});
	}
	getBounds(e) {
		return s(this.raw_, 16, (t) => {
			this.api_.getBounds(e, t, t + 4, t + 8, t + 12);
			const n = this.raw_.HEAPF32;
			const r = t >> 2;
			return {
				x: n[r],
				y: n[r + 1],
				width: n[r + 2],
				height: n[r + 3]
			};
		});
	}
	/**
	* Iterate this instance's mesh batches. The views point into wasm scratch and
	* are valid only for the duration of each call, so a consumer copies straight
	* into its own heap and nothing allocates a typed array per batch per frame.
	*
	* The walk itself is shared with every other skeletal module (see
	* skeletal/meshBatches) — the four readback entry points are packed the same
	* way on the C++ side, so reading them differently per runtime would be two
	* copies of one contract.
	*/
	forEachMeshBatch(e, t, n) {
		l(this.raw_, this.api_, e, t, n);
	}
	setDefaultMix(e, t) {
		this.api_.setDefaultMix(e, t);
	}
	setMixDuration(e, t, n, r) {
		this.api_.setMixDuration(e, t, n, r);
	}
	setTrackAlpha(e, t, n) {
		this.api_.setTrackAlpha(e, t, n);
	}
	setAttachment(e, t, n) {
		return !!this.api_.setAttachment(e, t, n);
	}
	setIKTarget(e, t, n, r, i) {
		return !!this.api_.setIKTarget(e, t, n, r, i);
	}
	setSlotColor(e, t, n, r, i, a) {
		return !!this.api_.setSlotColor(e, t, n, r, i, a);
	}
	/** Whole-skeleton tint, multiplied into every vertex — backs SpineAnimation.color.
	*  Optional-chained: a spine wasm without this export (a realm still on an older
	*  module — the SDK can lead the wasm) degrades to a no-op instead of crashing. */
	setSkeletonColor(e, t, n, r, i) {
		return !!this.api_.setSkeletonColor?.(e, t, n, r, i);
	}
	enableEvents(e) {
		this.api_.enableEvents(e);
	}
	collectEvents(e) {
		const t = this.api_.getEventCount(e);
		if (t === 0) return [];
		const n = 4;
		const r = this.api_.getEventBuffer();
		const i = this.raw_.HEAPF32;
		const a = this.raw_.HEAPU32;
		const o = r >> 2;
		const s = [];
		for (let e = 0; e < t; e++) {
			const t = o + e * n;
			const r = a[t] | 0;
			s.push({
				type: r,
				track: a[t + 1] | 0,
				floatValue: i[t + 2],
				intValue: a[t + 3] | 0,
				animationName: this.api_.getEventAnimationName(e),
				eventName: r === 5 ? this.api_.getEventName(e) : "",
				stringValue: r === 5 ? this.api_.getEventStringValue(e) : ""
			});
		}
		this.api_.clearEvents();
		return s;
	}
	listConstraints(e) {
		const t = this.api_.listConstraints(e);
		try {
			return JSON.parse(t);
		} catch {
			return {
				ik: [],
				transform: [],
				path: []
			};
		}
	}
	getTransformConstraintMix(e, t) {
		const n = this.api_.getTransformConstraintMix(e, t);
		if (!n) return null;
		try {
			return JSON.parse(n);
		} catch {
			return null;
		}
	}
	setTransformConstraintMix(e, t, n) {
		return !!this.api_.setTransformConstraintMix(e, t, n.mixRotate, n.mixX, n.mixY, n.mixScaleX, n.mixScaleY, n.mixShearY);
	}
	getPathConstraintMix(e, t) {
		const n = this.api_.getPathConstraintMix(e, t);
		if (!n) return null;
		try {
			return JSON.parse(n);
		} catch {
			return null;
		}
	}
	setPathConstraintMix(e, t, n) {
		return !!this.api_.setPathConstraintMix(e, t, n.position, n.spacing, n.mixRotate, n.mixX, n.mixY);
	}
};
//#endregion
//#region src/spine/SpineModuleLoader.ts
function g(e) {
	const t = e.cwrap.bind(e);
	return {
		loadSkeleton: t("spine_loadSkeleton", "number", [
			"number",
			"number",
			"number",
			"number",
			"number"
		]),
		getLastError: t("spine_getLastError", "string", []),
		unloadSkeleton: t("spine_unloadSkeleton", null, ["number"]),
		getAtlasPageCount: t("spine_getAtlasPageCount", "number", ["number"]),
		getAtlasPageTextureName: t("spine_getAtlasPageTextureName", "string", ["number", "number"]),
		setAtlasPageTexture: t("spine_setAtlasPageTexture", null, [
			"number",
			"number",
			"number",
			"number",
			"number"
		]),
		createInstance: t("spine_createInstance", "number", ["number"]),
		destroyInstance: t("spine_destroyInstance", null, ["number"]),
		playAnimation: t("spine_playAnimation", "number", [
			"number",
			"string",
			"number",
			"number"
		]),
		setToSetupPose: t("spine_setToSetupPose", null, ["number"]),
		addAnimation: t("spine_addAnimation", "number", [
			"number",
			"string",
			"number",
			"number",
			"number"
		]),
		setSkin: t("spine_setSkin", null, ["number", "string"]),
		update: t("spine_update", null, ["number", "number"]),
		advanceAndApply: t("spine_advanceAndApply", null, ["number", "number"]),
		materializeWorldPose: t("spine_materializeWorldPose", null, ["number", "number"]),
		requiresContinuousWorldPose: t("spine_requiresContinuousWorldPose", "number", ["number"]),
		getAnimationDuration: t("spine_getAnimationDuration", "number", ["number", "string"]),
		getAnimations: t("spine_getAnimations", "string", ["number"]),
		getSkins: t("spine_getSkins", "string", ["number"]),
		getBonePosition: t("spine_getBonePosition", "number", [
			"number",
			"string",
			"number",
			"number"
		]),
		getBoneRotation: t("spine_getBoneRotation", "number", ["number", "string"]),
		getBones: typeof e._spine_getBones === "function" ? t("spine_getBones", "string", ["number"]) : void 0,
		getBonePoses: typeof e._spine_getBonePoses === "function" ? t("spine_getBonePoses", "number", [
			"number",
			"number",
			"number"
		]) : void 0,
		getBounds: t("spine_getBounds", null, [
			"number",
			"number",
			"number",
			"number",
			"number"
		]),
		getSkeletonBounds: t("spine_getSkeletonBounds", "number", [
			"number",
			"number",
			"number",
			"number",
			"number"
		]),
		getMeshBatchColorPremultiplied: typeof e._spine_getMeshBatchColorPremultiplied === "function" ? t("spine_getMeshBatchColorPremultiplied", "number", ["number", "number"]) : void 0,
		getMeshBatchCount: t("spine_getMeshBatchCount", "number", ["number"]),
		getMeshBatchVertexCount: t("spine_getMeshBatchVertexCount", "number", ["number", "number"]),
		getMeshBatchIndexCount: t("spine_getMeshBatchIndexCount", "number", ["number", "number"]),
		getMeshBatchData: t("spine_getMeshBatchData", null, [
			"number",
			"number",
			"number",
			"number",
			"number",
			"number"
		]),
		setDefaultMix: t("spine_setDefaultMix", null, ["number", "number"]),
		setMixDuration: t("spine_setMixDuration", null, [
			"number",
			"string",
			"string",
			"number"
		]),
		setTrackAlpha: t("spine_setTrackAlpha", null, [
			"number",
			"number",
			"number"
		]),
		enableEvents: t("spine_enableEvents", null, ["number"]),
		getEventCount: t("spine_getEventCount", "number", ["number"]),
		getEventBuffer: t("spine_getEventBuffer", "number", []),
		clearEvents: t("spine_clearEvents", null, []),
		getEventAnimationName: t("spine_getEventAnimationName", "string", ["number"]),
		getEventName: t("spine_getEventName", "string", ["number"]),
		getEventStringValue: t("spine_getEventStringValue", "string", ["number"]),
		setAttachment: t("spine_setAttachment", "number", [
			"number",
			"string",
			"string"
		]),
		setIKTarget: t("spine_setIKTarget", "number", [
			"number",
			"string",
			"number",
			"number",
			"number"
		]),
		setSlotColor: t("spine_setSlotColor", "number", [
			"number",
			"string",
			"number",
			"number",
			"number",
			"number"
		]),
		setSkeletonColor: t("spine_setSkeletonColor", "number", [
			"number",
			"number",
			"number",
			"number",
			"number"
		]),
		listConstraints: t("spine_listConstraints", "string", ["number"]),
		getTransformConstraintMix: t("spine_getTransformConstraintMix", "string", ["number", "string"]),
		setTransformConstraintMix: t("spine_setTransformConstraintMix", "number", [
			"number",
			"string",
			"number",
			"number",
			"number",
			"number",
			"number",
			"number"
		]),
		getPathConstraintMix: t("spine_getPathConstraintMix", "string", ["number", "string"]),
		setPathConstraintMix: t("spine_setPathConstraintMix", "number", [
			"number",
			"string",
			"number",
			"number",
			"number",
			"number",
			"number"
		]),
		probeExtract: t("spine_probe_extract", "number", [
			"number",
			"number",
			"number"
		]),
		probeCounts: t("spine_probe_counts", null, ["number"]),
		probeClipStorage: t("spine_probe_clip_storage", null, ["number"]),
		probeClipStart: t("spine_probe_clip_start", "number", ["number", "number"]),
		probeClipStartCounts: t("spine_probe_clip_start_counts", null, ["number"]),
		clipBudget: t("spine_clipBudget", "number", ["number", "number"]),
		probeStorage: t("spine_probe_storage", null, ["number"]),
		probePose: t("spine_probe_pose", "number", [
			"number",
			"number",
			"number"
		]),
		probePoseCounts: t("spine_probe_pose_counts", null, ["number"])
	};
}
//#endregion
//#region src/spine/spineMetrics.ts
function _() {
	return {
		frame: 0,
		entities: 0,
		residencies: 0,
		meshBatches: 0,
		vertices: 0,
		indices: 0,
		abi: {
			pose: 0,
			world: 0,
			batchCount: 0,
			vertexCount: 0,
			indexCount: 0,
			batchData: 0,
			batchColor: 0,
			malloc: 0,
			free: 0,
			submit: 0
		},
		pose: {
			logicalUpdates: 0,
			worldMaterializations: 0,
			worldAlreadyCurrent: 0,
			meshExtractions: 0,
			renderCulled: 0
		},
		bytes: {
			wasmRead: 0,
			coreWrite: 0,
			scratchAllocated: 0
		},
		time: {
			pose: 0,
			readback: 0,
			total: 0
		}
	};
}
/** Start a frame's counts over, keeping the object. */
function v(e) {
	e.frame++;
	e.entities = 0;
	e.residencies = 0;
	e.meshBatches = 0;
	e.vertices = 0;
	e.indices = 0;
	e.abi.pose = 0;
	e.abi.world = 0;
	e.abi.batchCount = 0;
	e.abi.vertexCount = 0;
	e.abi.indexCount = 0;
	e.abi.batchData = 0;
	e.abi.batchColor = 0;
	e.abi.malloc = 0;
	e.abi.free = 0;
	e.abi.submit = 0;
	e.bytes.wasmRead = 0;
	e.bytes.coreWrite = 0;
	e.bytes.scratchAllocated = 0;
	e.pose.logicalUpdates = 0;
	e.pose.worldMaterializations = 0;
	e.pose.worldAlreadyCurrent = 0;
	e.pose.meshExtractions = 0;
	e.pose.renderCulled = 0;
	e.time.pose = 0;
	e.time.readback = 0;
	e.time.total = 0;
}
/** The last N frames of one number, and what they were. A mean hides the frame
*  that missed: four at 4ms and one at 9ms averages to a budget nobody blew. */
var y = class {
	constructor(e = 120) {
		this.capacity = e;
		this.count_ = 0;
		this.at_ = 0;
		this.samples_ = new Float64Array(e);
		this.scratch_ = new Float64Array(e);
	}
	push(e) {
		this.samples_[this.at_] = e;
		this.at_ = (this.at_ + 1) % this.capacity;
		if (this.count_ < this.capacity) this.count_++;
	}
	get size() {
		return this.count_;
	}
	/** last / mean / p50 / p95 / max over the window. Allocates one object per
	*  CALL, which is a diagnostic reading its own answer, not a frame. */
	stats() {
		if (this.count_ === 0) return {
			last: 0,
			mean: 0,
			p50: 0,
			p95: 0,
			max: 0
		};
		const e = this.scratch_.subarray(0, this.count_);
		e.set(this.samples_.subarray(0, this.count_));
		e.sort();
		let t = 0;
		for (let n = 0; n < this.count_; n++) t += e[n];
		const n = (t) => e[Math.min(this.count_ - 1, Math.floor(t * this.count_))];
		return {
			last: this.samples_[(this.at_ - 1 + this.capacity) % this.capacity],
			mean: t / this.count_,
			p50: n(.5),
			p95: n(.95),
			max: e[this.count_ - 1]
		};
	}
};
//#endregion
//#region src/spine/spineBounds.ts
const b = {
	minX: Infinity,
	minY: Infinity,
	maxX: -Infinity,
	maxY: -Infinity
};
function x(e, t) {
	if (t.width <= 0 && t.height <= 0) return e;
	return {
		minX: Math.min(e.minX, t.x),
		minY: Math.min(e.minY, t.y),
		maxX: Math.max(e.maxX, t.x + t.width),
		maxY: Math.max(e.maxY, t.y + t.height)
	};
}
/** What the skeleton was authored at. A fact, never an authority. */
function S(e, t) {
	return e.skeletonBounds(t);
}
/**
* Every animation, at `sampleStep` through its whole duration, in every skin.
*
* On its own scratch instance, so the entities using this skeleton keep the
* pose they were in. The result is `observed`, and stays that whatever it finds.
*/
function C(e, t, n, r = 1 / 30) {
	const i = e.createInstance(t);
	try {
		const a = e.getSkins(i);
		const o = e.getAnimations(i);
		let s = b;
		let c = 0;
		for (const n of a) {
			e.setSkin(i, n);
			e.update(i, 0);
			s = x(s, e.getBounds(i));
			c++;
			for (const n of o) {
				const a = e.animationDuration(t, n);
				if (a < 0) continue;
				e.play(i, n, false, 0);
				e.update(i, 0);
				s = x(s, e.getBounds(i));
				c++;
				for (let t = 0; t < a; t += r) {
					e.update(i, Math.min(r, a - t));
					s = x(s, e.getBounds(i));
					c++;
				}
			}
		}
		return {
			kind: "observed",
			source: "animation-scan",
			sampleStep: r,
			era: n,
			bounds: s,
			coverage: {
				animations: o.length,
				skins: a.length,
				samples: c
			}
		};
	} finally {
		e.destroyInstance(i);
	}
}
/**
* Somebody promising that no pose of this skeleton leaves `bounds`.
*
* The only way to make a certificate, and it takes a rectangle rather than
* another envelope: an observation cannot be upgraded into a promise by passing
* it through a function, only by somebody deciding to make one.
*/
function w(e) {
	return {
		kind: "certified",
		bounds: { ...e },
		source: "explicit"
	};
}
/**
* The envelope as it stands for `era`. An observation of another generation is
* not one of this one, and comes back unknown rather than being trusted.
*/
function T(e, t) {
	if (e.kind !== "observed") return e;
	return e.era === t ? e : { kind: "unknown" };
}
/**
* Whether this entity's world pose may be left unresolved when nothing can see
* it. Two independent proofs, and the absence of either is a no: the runtime
* saying its constraints carry no state across a pose, and an envelope somebody
* certified. Anything else materialises, which costs time and cannot be wrong.
*/
function E(e, t) {
	return !t && e.kind === "certified";
}
/**
* The local rectangle in world space, still conservative: all four corners are
* transformed and re-bounded, because under rotation the corners of the result
* are not the transformed corners of the input.
*/
function ee(e, t) {
	const [n, r, i, a, o, s] = t;
	const c = [
		[e.minX, e.minY],
		[e.maxX, e.minY],
		[e.maxX, e.maxY],
		[e.minX, e.maxY]
	];
	let l = b;
	for (const [e, t] of c) {
		const c = n * e + i * t + o;
		const u = r * e + a * t + s;
		l = {
			minX: Math.min(l.minX, c),
			minY: Math.min(l.minY, u),
			maxX: Math.max(l.maxX, c),
			maxY: Math.max(l.maxY, u)
		};
	}
	return l;
}
/** Whether `outer` contains `inner`, which is what "did not leave it" means. */
function te(e, t) {
	return t.minX >= e.minX && t.minY >= e.minY && t.maxX <= e.maxX && t.maxY <= e.maxY;
}
//#endregion
//#region src/spine/SpineRuntime.ts
/**
* Whether entities of this residency may be left owing a world pose. Both
* proofs, and the absence of either is a no — see spineBounds for why an
* observation is not one of them.
*/
function D(e) {
	return E(e.culling, e.requiresContinuousWorldPose);
}
var O = class {
	/** One runtime per loaded module: the ABI adapter is made here rather than
	*  handed in, because nothing else has a reason to hold one. */
	constructor(e, t) {
		this.version = e;
		this.entities_ = /* @__PURE__ */ new Map();
		this.disabledEntities_ = /* @__PURE__ */ new Set();
		this.skeletons_ = /* @__PURE__ */ new Map();
		this.metrics_ = null;
		this.poseWindow_ = new y();
		this.readbackWindow_ = new y();
		this.totalWindow_ = new y();
		this.controller_ = new h(t, g(t));
	}
	get entityCount() {
		return this.entities_.size;
	}
	loadEntity(e, t) {
		const n = this.claimSkeleton_(t);
		if (n < 0) return false;
		const r = this.controller_.createInstance(n);
		if (r < 0) {
			a.error("spine", `Failed to create instance: ${this.controller_.getLastError()}`);
			this.releaseSkeleton_({
				skelHandle: n,
				era: t.id
			});
			return false;
		}
		const i = this.disabledEntities_.has(e);
		this.removeEntity(e);
		if (i) this.disabledEntities_.add(e);
		this.entities_.set(e, {
			skelHandle: n,
			instanceId: r,
			era: t.id,
			skeletonScale: 1,
			flipX: false,
			flipY: false,
			layer: 0,
			timeScale: 1,
			playing: true,
			logicalRevision: 0,
			worldRevision: 0,
			pendingDt: 0
		});
		return true;
	}
	/**
	* One claim on the era's native skeleton — the loaded one if this runtime has
	* it, else a fresh parse; -1 when the era cannot be joined or will not parse.
	* Retained BEFORE anything is parsed from it: what a native skeleton was made
	* of has to outlive it, and a page freed under it cannot be put back.
	*/
	claimSkeleton_(e) {
		const t = this.skeletons_.get(e.id);
		if (t) {
			t.refcount++;
			return t.skelHandle;
		}
		const n = e.retain();
		if (!n) {
			a.error("spine", `Spine era "${e.id}" can no longer be joined`);
			return -1;
		}
		const { skelData: r, atlasText: i, isBinary: o, textures: s } = e.value;
		const c = this.controller_.loadSkeleton(r, i, o);
		if (c < 0) {
			a.error("spine", `Failed to load skeleton: ${this.controller_.getLastError()}`);
			n.release();
			return -1;
		}
		const l = this.controller_.getAtlasPageCount(c);
		for (let e = 0; e < l; e++) {
			const t = this.controller_.getAtlasPageTextureName(c, e);
			const n = s.get(t);
			if (n) this.controller_.setAtlasPageTexture(c, e, n.glId, n.w, n.h);
		}
		this.skeletons_.set(e.id, {
			skelHandle: c,
			refcount: 1,
			claim: n,
			pair: e.pair,
			culling: e.culling ?? { kind: "unknown" },
			requiresContinuousWorldPose: this.controller_.requiresContinuousWorldPose(c)
		});
		return c;
	}
	setEntityProps(e, t) {
		const n = this.entities_.get(e);
		if (!n) return;
		if (t.skeletonScale !== void 0) n.skeletonScale = t.skeletonScale;
		if (t.flipX !== void 0) n.flipX = t.flipX;
		if (t.flipY !== void 0) n.flipY = t.flipY;
		if (t.layer !== void 0) n.layer = t.layer;
		if (t.timeScale !== void 0) n.timeScale = t.timeScale;
		if (t.playing !== void 0) n.playing = t.playing;
		if (t.color) this.controller_.setSkeletonColor(n.instanceId, t.color.r, t.color.g, t.color.b, t.color.a);
	}
	setAnimation(e, t, n) {
		const r = this.entities_.get(e);
		if (r) this.controller_.play(r.instanceId, t, n);
	}
	setSkin(e, t) {
		const n = this.entities_.get(e);
		if (!n) return;
		this.controller_.setSkin(n.instanceId, t);
		this.poseChanged_(n);
	}
	getBounds(e) {
		const t = this.entities_.get(e);
		if (!t) return null;
		return this.controller_.getBounds(t.instanceId);
	}
	clipBudget(e) {
		const t = this.entities_.get(e);
		if (!t) return null;
		return this.controller_.clipBudget(t.instanceId);
	}
	getAnimations(e) {
		const t = this.entities_.get(e);
		if (!t) return [];
		return this.controller_.getAnimations(t.instanceId);
	}
	getSkins(e) {
		const t = this.entities_.get(e);
		if (!t) return [];
		return this.controller_.getSkins(t.instanceId);
	}
	/**
	* The skeleton's bones as drawn this frame, with how the entity places them: the
	* skeleton's own scale and flips, which the draw applies and a point in skeleton
	* space has to as well. Null when nothing is loaded or the module predates the call.
	*/
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
	setDefaultMix(e, t) {
		const n = this.entities_.get(e);
		if (n) this.controller_.setDefaultMix(n.skelHandle, t);
	}
	setMixDuration(e, t, n, r) {
		const i = this.entities_.get(e);
		if (i) this.controller_.setMixDuration(i.skelHandle, t, n, r);
	}
	setTrackAlpha(e, t, n) {
		const r = this.entities_.get(e);
		if (r) this.controller_.setTrackAlpha(r.instanceId, t, n);
	}
	setAttachment(e, t, n) {
		const r = this.entities_.get(e);
		if (!r) return false;
		this.poseChanged_(r);
		return this.controller_.setAttachment(r.instanceId, t, n);
	}
	setIKTarget(e, t, n, r, i) {
		const a = this.entities_.get(e);
		if (!a) return false;
		this.poseChanged_(a);
		return this.controller_.setIKTarget(a.instanceId, t, n, r, i);
	}
	setSlotColor(e, t, n, r, i, a) {
		const o = this.entities_.get(e);
		if (!o) return false;
		return this.controller_.setSlotColor(o.instanceId, t, n, r, i, a);
	}
	listConstraints(e) {
		const t = this.entities_.get(e);
		if (!t) return null;
		return this.controller_.listConstraints(t.instanceId);
	}
	getTransformConstraintMix(e, t) {
		const n = this.entities_.get(e);
		if (!n) return null;
		return this.controller_.getTransformConstraintMix(n.instanceId, t);
	}
	setTransformConstraintMix(e, t, n) {
		const r = this.entities_.get(e);
		if (!r) return false;
		this.poseChanged_(r);
		return this.controller_.setTransformConstraintMix(r.instanceId, t, n);
	}
	getPathConstraintMix(e, t) {
		const n = this.entities_.get(e);
		if (!n) return null;
		return this.controller_.getPathConstraintMix(n.instanceId, t);
	}
	setPathConstraintMix(e, t, n) {
		const r = this.entities_.get(e);
		if (!r) return false;
		this.poseChanged_(r);
		return this.controller_.setPathConstraintMix(r.instanceId, t, n);
	}
	setEnabled(e, t) {
		if (t) this.disabledEntities_.delete(e);
		else this.disabledEntities_.add(e);
	}
	enableEvents(e) {
		const t = this.entities_.get(e);
		if (t) this.controller_.enableEvents(t.instanceId);
	}
	collectAllEvents(e) {
		const t = [];
		for (const [n, r] of this.entities_) {
			if (this.disabledEntities_.has(n) || e && !e(n)) continue;
			const i = this.controller_.collectEvents(r.instanceId);
			for (const e of i) t.push({
				entity: n,
				raw: e
			});
		}
		return t;
	}
	/**
	* Whether the camera in hand would draw this entity, or null where the
	* question cannot be asked — no certified extent, or a core without the
	* entry point. Null is not "invisible": an unknown extent makes visibility
	* unknown, and the only answer a caller may act on is `false`.
	*/
	cameraWouldDraw_(e, t, n, r) {
		const i = e.renderer_entityVisibleToCamera;
		if (!i) return "unknown";
		const a = this.skeletons_.get(r.era);
		if (!a || a.culling.kind !== "certified") return "unknown";
		const { bounds: s } = a.culling;
		const c = r.skeletonScale;
		const l = e.HEAPU32;
		if (!l || !e._malloc || !e._free) return "unknown";
		return o({
			_malloc: e._malloc,
			_free: e._free
		}, (e) => {
			const a = e(4);
			i(t, n, r.layer, s.minX * c, s.minY * c, s.maxX * c, s.maxY * c, a);
			return l[a >> 2] !== 0 ? "visible" : "culled";
		});
	}
	/**
	* Whether this entity's world pose may be left owed when nothing wants it —
	* both proofs, settled when its residency was made. The scheduler that will
	* use it does not exist yet; a diagnostic asking why can already read the
	* two facts off the residency.
	*/
	mayDefer(e) {
		const t = this.entities_.get(e);
		const n = t ? this.skeletons_.get(t.era) : void 0;
		return n ? D(n) : false;
	}
	/**
	* Scan this entity's SKELETON — every animation over its whole duration, in
	* every skin — on a scratch instance, so the entity asking keeps its pose.
	* An OBSERVATION whatever it finds: authoring proposes contracts from it and
	* the runtime may never act on it. See spineBounds.
	*/
	observedBounds(e, t) {
		const n = this.entities_.get(e);
		if (!n) return null;
		return C(this.controller_, n.skelHandle, n.era, t);
	}
	/** Why, for a diagnostic: the promise, and what the runtime says of itself. */
	poseEligibility(e) {
		const t = this.entities_.get(e);
		const n = t ? this.skeletons_.get(t.era) : void 0;
		if (!n) return null;
		return {
			culling: n.culling,
			requiresContinuousWorldPose: n.requiresContinuousWorldPose
		};
	}
	/**
	* A skeleton posed by nobody but its caller.
	*
	* Outside `entities_` on purpose — the map `updateAll` and the submit both
	* walk — so a preview is never advanced or drawn by the frame. What it gives
	* back is the same instance and the same batch walk a scene entity gets.
	*/
	openPreview(e) {
		const t = this.claimSkeleton_(e);
		if (t < 0) return null;
		const n = this.controller_.createInstance(t);
		if (n < 0) {
			a.error("spine", `Failed to create preview instance: ${this.controller_.getLastError()}`);
			this.releaseSkeleton_({
				skelHandle: t,
				era: e.id
			});
			return null;
		}
		const r = this.controller_;
		let i = true;
		let o = 0;
		let s = true;
		const c = () => {
			if (!s) return;
			r.materializeWorldPose(n, o);
			o = 0;
			s = false;
		};
		return {
			animations: () => i ? r.getAnimations(n) : [],
			skins: () => i ? r.getSkins(n) : [],
			play: (e) => {
				if (!i) return;
				r.setToSetupPose(n);
				r.play(n, e, false);
				o = 0;
				s = true;
			},
			setSkin: (e) => {
				if (i) {
					r.setSkin(n, e);
					s = true;
				}
			},
			advance: (e) => {
				if (!i) return;
				r.advanceAndApply(n, e);
				o += e;
				s = true;
			},
			duration: (e) => i ? Math.max(0, r.animationDuration(t, e)) : 0,
			clipBudget: () => {
				if (!i) return null;
				c();
				return r.clipBudget(n);
			},
			forEachMeshBatch: (e) => {
				if (!i) return;
				c();
				r.forEachMeshBatch(n, e);
			},
			dispose: () => {
				if (!i) return;
				i = false;
				r.destroyInstance(n);
				this.releaseSkeleton_({
					skelHandle: t,
					era: e.id
				});
			}
		};
	}
	/** Every residency this runtime holds, for a scene-level diagnostic. */
	residencies() {
		const e = [];
		for (const [t, n] of this.skeletons_) e.push({
			era: t,
			pair: n.pair,
			entities: n.refcount,
			culling: n.culling,
			requiresContinuousWorldPose: n.requiresContinuousWorldPose,
			mayDefer: D(n)
		});
		return e;
	}
	/**
	* Entities owing a world pose, disabled ones aside — those are out of the
	* frame, so posing every frame would not have resolved them either.
	*
	* A STATE and not a tally, which is what makes it exact: read after a
	* frame's submit it is the world-transform resolves that frame did not do.
	*/
	worldPoseDebt() {
		let e = 0;
		for (const [t, n] of this.entities_) {
			if (this.disabledEntities_.has(t)) continue;
			if (n.worldRevision !== n.logicalRevision) e++;
		}
		return e;
	}
	/**
	* Resolve this entity's world transforms if they do not already reflect its
	* local pose; returns whether it had to. The REVISION is the authority, not
	* the frame — a frame that resolves and then moves an IK target owes another
	* one, and a frame key would hand the next asker the pose from before it.
	*/
	ensurePose(e) {
		const t = this.entities_.get(e);
		if (!t || this.disabledEntities_.has(e)) return false;
		if (t.worldRevision === t.logicalRevision) {
			if (this.metrics_) this.metrics_.pose.worldAlreadyCurrent++;
			return false;
		}
		this.controller_.materializeWorldPose(t.instanceId, t.pendingDt);
		t.worldRevision = t.logicalRevision;
		t.pendingDt = 0;
		if (this.metrics_) {
			this.metrics_.pose.worldMaterializations++;
			this.metrics_.abi.world++;
		}
		return true;
	}
	/** What only the world transforms will show — a constraint retargeted, an
	*  attachment swapped. The local pose is already whatever it was. */
	poseChanged_(e) {
		e.logicalRevision++;
	}
	updateAll(e, t) {
		const n = this.metrics_;
		if (n) {
			if (n.frame > 0) {
				this.poseWindow_.push(n.time.pose);
				this.readbackWindow_.push(n.time.readback);
				this.totalWindow_.push(n.time.total);
			}
			v(n);
		}
		const r = n ? performance.now() : 0;
		for (const [r, i] of this.entities_) {
			if (this.disabledEntities_.has(r) || t && !t(r)) continue;
			if (i.playing) {
				const t = e * i.timeScale;
				this.controller_.advanceAndApply(i.instanceId, t);
				i.logicalRevision++;
				i.pendingDt += t;
				if (n) {
					n.abi.pose++;
					n.pose.logicalUpdates++;
				}
			}
			const a = this.skeletons_.get(i.era);
			if (!a || !D(a)) this.ensurePose(r);
		}
		if (!n) return;
		n.time.pose = performance.now() - r;
		n.entities = this.entities_.size;
		n.residencies = this.skeletons_.size;
	}
	/** @param core whichever engine core is present (see ecs/engineApi.ts) — the
	*  batches cross through its heap, which is wasm linear memory on the web and the
	*  host arena on a device. */
	extractAndSubmitMeshes(e, t, n, r) {
		const i = this.metrics_;
		const a = i ? performance.now() : 0;
		for (const [a, o] of this.entities_) {
			if (this.disabledEntities_.has(a) || r && !r(a)) continue;
			if (this.cameraWouldDraw_(e, t, a, o) === "culled") {
				if (i) i.pose.renderCulled++;
				continue;
			}
			this.ensurePose(a);
			if (i) i.pose.meshExtractions++;
			if (!d(e, t, a, o, (e) => this.controller_.forEachMeshBatch(o.instanceId, e, i ?? void 0), n, i ?? void 0)) return;
		}
		if (!i) return;
		i.time.readback += performance.now() - a;
		i.time.total = i.time.pose + i.time.readback;
	}
	/**
	* Start or stop reporting what each frame costs. Off by default and off is
	* free: every counter and both clock reads are behind this one field, so a
	* runtime nobody is watching pays a branch per entity and nothing else.
	*/
	observe(e) {
		this.metrics_ = e ? this.metrics_ ?? _() : null;
	}
	/** The LIVE frame record — the same object every frame, so reading it costs
	*  nothing and holding it shows the next frame. Null when not observing. */
	metrics() {
		return this.metrics_;
	}
	/** The last 120 COMPLETED frames of each timed phase — all three fed at the
	*  same boundary, so they always describe the same frames. A mean hides the
	*  frame that missed; these say whether one did. */
	windows() {
		return {
			pose: this.poseWindow_,
			readback: this.readbackWindow_,
			total: this.totalWindow_
		};
	}
	removeEntity(e) {
		const t = this.entities_.get(e);
		if (!t) return;
		this.controller_.destroyInstance(t.instanceId);
		this.releaseSkeleton_(t);
		this.entities_.delete(e);
		this.disabledEntities_.delete(e);
	}
	/** Drop one reference to an entity's skeleton. At zero the NATIVE object
	*  goes first and the era it was parsed from after it — the order ownership
	*  says, not the order today's unload happens to tolerate. */
	releaseSkeleton_(e) {
		const t = this.skeletons_.get(e.era);
		if (!t) return;
		if (--t.refcount > 0) return;
		this.controller_.unloadSkeleton(t.skelHandle);
		this.skeletons_.delete(e.era);
		t.claim.release();
	}
	/** Give back everything this runtime holds, in the order it holds it:
	*  instances, then the native skeletons, then the eras they came from. */
	dispose() {
		for (const e of this.entities_.values()) this.controller_.destroyInstance(e.instanceId);
		for (const e of this.skeletons_.values()) {
			this.controller_.unloadSkeleton(e.skelHandle);
			e.claim.release();
		}
		this.entities_.clear();
		this.disabledEntities_.clear();
		this.skeletons_.clear();
	}
};
//#endregion
//#region src/spine/spineSceneDiagnostics.ts
function k(e) {
	const { last: t, p50: n, p95: r, max: i } = e.stats();
	return {
		last: t,
		p50: n,
		p95: r,
		max: i
	};
}
function A(e) {
	const t = [];
	if (e.requiresContinuousWorldPose) t.push("stateful-constraints");
	if (e.culling.kind !== "certified") t.push("no-certificate");
	return t;
}
/**
* Read every loaded runtime and say what the scene's spine is doing.
*
* `observing` is the manager's, not inferred from whether metrics objects
* exist: a realm watching a scene that has loaded no runtime yet is observing,
* and reporting otherwise would send someone to turn on what is already on.
*/
function j(e, t) {
	const n = [];
	const r = [];
	const i = {
		logicalUpdates: 0,
		worldMaterializations: 0,
		worldAlreadyCurrent: 0,
		meshExtractions: 0,
		renderCulled: 0
	};
	const a = {
		meshBatches: 0,
		vertices: 0,
		indices: 0
	};
	const o = {
		pose: 0,
		world: 0,
		batchCount: 0,
		vertexCount: 0,
		indexCount: 0,
		batchData: 0,
		batchColor: 0,
		malloc: 0,
		free: 0,
		submit: 0
	};
	const s = {
		wasmRead: 0,
		coreWrite: 0,
		scratchAllocated: 0
	};
	const c = {
		pose: 0,
		readback: 0,
		total: 0
	};
	let l = 0;
	let u = 0;
	let d = 0;
	let f = 0;
	for (const t of e) {
		u += t.entityCount;
		d += t.worldPoseDebt();
		for (const e of t.residencies()) {
			if (e.mayDefer) f += e.entities;
			n.push({
				version: t.version,
				era: e.era,
				pair: e.pair,
				entities: e.entities,
				mayDefer: e.mayDefer,
				envelope: e.culling.kind,
				blockedBy: A(e)
			});
		}
		const e = t.metrics();
		if (!e) continue;
		const p = t.windows();
		r.push({
			version: t.version,
			frames: p.total.size,
			pose: k(p.pose),
			readback: k(p.readback),
			total: k(p.total)
		});
		l = Math.max(l, e.frame);
		i.logicalUpdates += e.pose.logicalUpdates;
		i.worldMaterializations += e.pose.worldMaterializations;
		i.worldAlreadyCurrent += e.pose.worldAlreadyCurrent;
		i.meshExtractions += e.pose.meshExtractions;
		i.renderCulled += e.pose.renderCulled;
		a.meshBatches += e.meshBatches;
		a.vertices += e.vertices;
		a.indices += e.indices;
		for (const t of Object.keys(o)) o[t] += e.abi[t];
		for (const t of Object.keys(s)) s[t] += e.bytes[t];
		c.pose += e.time.pose;
		c.readback += e.time.readback;
		c.total += e.time.total;
	}
	n.sort((e, t) => t.entities - e.entities || (e.era < t.era ? -1 : e.era > t.era ? 1 : 0));
	return {
		observing: t,
		frame: l,
		entities: u,
		worldPoseDebt: d,
		deferrable: f,
		assets: n,
		runtimes: r,
		pose: i,
		geometry: a,
		abi: o,
		bytes: s,
		time: c,
		findings: N(t, u, d, f, n)
	};
}
/** Ordered actionable-first: what to go do, before what merely explains. */
const M = [
	"not-observing",
	"no-certificate",
	"stateful-constraints",
	"nothing-deferred",
	"deferral-working"
];
function N(e, t, n, r, i) {
	const a = [];
	if (!e) a.push({
		code: "not-observing",
		entities: t,
		assets: []
	});
	const o = i.filter((e) => e.blockedBy.includes("no-certificate") && !e.blockedBy.includes("stateful-constraints"));
	if (o.length > 0) a.push({
		code: "no-certificate",
		entities: o.reduce((e, t) => e + t.entities, 0),
		assets: o.map((e) => e.era)
	});
	const s = i.filter((e) => e.blockedBy.includes("stateful-constraints"));
	if (s.length > 0) a.push({
		code: "stateful-constraints",
		entities: s.reduce((e, t) => e + t.entities, 0),
		assets: s.map((e) => e.era)
	});
	if (e && r > 0) a.push(n > 0 ? {
		code: "deferral-working",
		entities: n,
		assets: []
	} : {
		code: "nothing-deferred",
		entities: r,
		assets: []
	});
	return a.sort((e, t) => M.indexOf(e.code) - M.indexOf(t.code));
}
function P(e) {
	return `${e.toFixed(2)}ms`;
}
function F(e) {
	if (e < 1024) return `${e}B`;
	if (e < 1048576) return `${(e / 1024).toFixed(1)}KB`;
	return `${(e / 1048576).toFixed(1)}MB`;
}
function I(e, t, n = `${t}s`) {
	return `${e} ${e === 1 ? t : n}`;
}
function L(e) {
	return I(e, "entity", "entities");
}
function ne(e) {
	const t = e.assets.length > 0 ? ` across ${I(e.assets.length, "asset")} (${e.assets.join(", ")})` : "";
	switch (e.code) {
		case "not-observing": return "nothing is counting — call observe(true) and read this again after a frame.";
		case "no-certificate": return `${L(e.entities)}${t} resolve a world pose every frame because nothing certified their extent. Scan the asset and record a culling contract to let them skip it while no camera wants them.`;
		case "stateful-constraints": return `${L(e.entities)}${t} can never defer: their world pose carries state across frames, which no culling contract changes.`;
		case "nothing-deferred": return `${L(e.entities)} may defer and none did — every one of them was wanted this frame, so this cost is work being consumed rather than opportunity being missed.`;
		case "deferral-working": return `${I(e.entities, "world pose")} went unresolved — work this frame did not do.`;
	}
}
/** Wrapped to a terminal, since a finding is a sentence and not a field. */
function re(e, t, n = 78) {
	const r = " ".repeat(e.length);
	const i = [];
	let a = "";
	for (const o of t.split(" ")) if (a === "") a = (i.length === 0 ? e : r) + o;
	else if (a.length + 1 + o.length > n) {
		i.push(a);
		a = r + o;
	} else a += ` ${o}`;
	if (a !== "") i.push(a);
	return i;
}
/** The report as text, for a console or an overlay. */
function R(e) {
	const t = [
		`spine — frame ${e.frame}, ${L(e.entities)} across ${I(e.assets.length, "asset")}`,
		`  time      pose ${P(e.time.pose)}   readback ${P(e.time.readback)}   total ${P(e.time.total)}`,
		`  world     ${e.pose.worldMaterializations} resolved, ${e.worldPoseDebt} unresolved, ${e.pose.worldAlreadyCurrent} already current`,
		`  logical   ${e.pose.logicalUpdates} advances`,
		`  draw      ${e.pose.meshExtractions} extracted, ${e.pose.renderCulled} camera declines`,
		`  geometry  ${e.geometry.meshBatches} batches, ${e.geometry.vertices} vertices, ${e.geometry.indices} indices`,
		`  bytes     ${F(e.bytes.wasmRead)} out of the modules, ${F(e.bytes.coreWrite)} into the core`,
		`  crossings ${e.abi.pose} pose, ${e.abi.world} world, ${e.abi.batchData} batch data, ${e.abi.submit} submit`
	];
	for (const n of e.runtimes) t.push(`  ${n.version.padEnd(9)} ${n.frames} frames — total p50 ${P(n.total.p50)}  p95 ${P(n.total.p95)}  max ${P(n.total.max)}`);
	t.push("");
	for (const n of e.assets) {
		const e = n.mayDefer ? "may defer" : `always resolves — ${n.blockedBy.join(", ")}`;
		t.push(`  ${n.era.padEnd(28)} ${String(n.entities).padStart(6)}  ${n.version.padEnd(4)} ${e}`);
	}
	if (e.findings.length > 0) t.push("");
	for (const n of e.findings) t.push(...re("  * ", ne(n)));
	return t.join("\n");
}
//#endregion
//#region src/spine/SpineManager.ts
/**
* Which runtime reads a given skeleton's version string, newest prefix first. A
* release Estella vendors no runtime for maps onto the one that reads its format:
* 3.7 and older data loads on the 3.8 runtime. Anything unmatched is a version we
* cannot honestly claim to play, so detection fails rather than guessing.
*/
const z = [
	["4.3", "4.3"],
	["4.2", "4.2"],
	["4.1", "4.1"],
	["3.", "3.8"],
	["2.1", "2.1"]
];
function B(e) {
	for (const [t, n] of z) if (e.startsWith(t)) return n;
	return null;
}
var V = class e {
	constructor(e, t) {
		this.runtimes_ = /* @__PURE__ */ new Map();
		this.loadingRuntimes_ = /* @__PURE__ */ new Map();
		this.bindings_ = /* @__PURE__ */ new Map();
		this.disabledEntities_ = /* @__PURE__ */ new Set();
		this.observing_ = false;
		this.coreModule_ = e;
		this.factories_ = t;
	}
	static detectVersion(e) {
		const t = U(e);
		if (t) return t;
		return W(e);
	}
	static detectVersionJson(e) {
		const t = e.match(/"spine"\s*:\s*"(\d+\.\d+)/);
		return t ? B(t[1]) : null;
	}
	async loadEntity(t, n, r) {
		const { skelData: i } = n.value;
		const o = typeof i === "string" ? e.detectVersionJson(i) : e.detectVersion(i);
		if (!o) return null;
		const s = await this.ensureRuntime(o);
		if (!s) {
			a.error("spine", `Failed to create the runtime for version ${o}`);
			return null;
		}
		const c = this.bindings_.get(t);
		if (!s.loadEntity(t, n)) {
			a.error("spine", `Failed to load entity ${t} into the ${o} runtime`);
			return null;
		}
		if (c && c !== s) c.removeEntity(t);
		this.bindings_.set(t, s);
		s.setEnabled(t, !this.disabledEntities_.has(t));
		return o;
	}
	/** Freeze inactive entities without changing their manual enable state. */
	updateAnimations(e, t) {
		for (const n of this.runtimes_.values()) n.updateAll(e, t);
	}
	/** Skip extraction for entities the activity predicate excludes. */
	submitMeshes(e, t, n) {
		for (const r of this.runtimes_.values()) r.extractAndSubmitMeshes(this.coreModule_, e, t, n);
	}
	/** The entities that currently have a skeleton bound — what a per-frame pass
	*  over "everything spine draws" iterates, without asking the World. */
	boundEntities() {
		return this.bindings_.keys();
	}
	removeEntity(e) {
		this.bindings_.get(e)?.removeEntity(e);
		this.bindings_.delete(e);
		this.disabledEntities_.delete(e);
	}
	/**
	* Tear down every loaded runtime, freeing the native skeletons / atlases
	* each holds. Idempotent — clearing the maps makes a second call a no-op.
	* The ONE teardown door: `shutdown()` was a second name for this.
	*/
	dispose() {
		for (const e of this.runtimes_.values()) e.dispose();
		this.runtimes_.clear();
		this.loadingRuntimes_.clear();
		this.bindings_.clear();
		this.disabledEntities_.clear();
	}
	getEntityVersion(e) {
		return this.bindings_.get(e)?.version;
	}
	hasRuntime(e) {
		return this.runtimes_.has(e);
	}
	/**
	* Start or stop reporting what frames cost, on every runtime this app has
	* and every one it loads later. Off by default.
	*/
	observe(e) {
		this.observing_ = e;
		for (const t of this.runtimes_.values()) t.observe(e);
	}
	/**
	* Open a skeleton for an editor to pose itself, outside this manager's
	* bindings: it is never advanced by `updateAnimations` and never drawn by
	* `submitMeshes`. Null when the era's version has no runtime here.
	*/
	async openPreview(t) {
		const { skelData: n } = t.value;
		const r = typeof n === "string" ? e.detectVersionJson(n) : e.detectVersion(n);
		if (!r) return null;
		const i = await this.ensureRuntime(r);
		return i ? i.openPreview(t) : null;
	}
	/** Whether anything is counting. */
	get observing() {
		return this.observing_;
	}
	/**
	* Why this scene's spine costs what it does — the frame's numbers joined to
	* the per-asset reason each of them was paid. Derived on the spot from what
	* the runtimes already know; see spineSceneDiagnostics.
	*/
	diagnostics() {
		return j(this.runtimes_.values(), this.observing_);
	}
	setAnimation(e, t, n) {
		this.runtimeOf_(e)?.setAnimation(e, t, n);
	}
	setSkin(e, t) {
		this.runtimeOf_(e)?.setSkin(e, t);
	}
	setEntityProps(e, t) {
		this.runtimeOf_(e)?.setEntityProps(e, t);
	}
	getBounds(e) {
		return this.runtimeOf_(e)?.getBounds(e) ?? null;
	}
	/**
	* What a scan of this entity's skeleton saw — an OBSERVATION, for authoring
	* to propose a culling contract from. Never an authority: see spineBounds.
	*/
	observedBounds(e, t) {
		return this.runtimeOf_(e)?.observedBounds(e, t) ?? null;
	}
	clipBudget(e) {
		return this.runtimeOf_(e)?.clipBudget(e) ?? null;
	}
	getAnimations(e) {
		return this.runtimeOf_(e)?.getAnimations(e) ?? [];
	}
	getSkins(e) {
		return this.runtimeOf_(e)?.getSkins(e) ?? [];
	}
	/** The posed bones of this entity's skeleton and how it places them; null if not loaded. @experimental */
	boneTree(e) {
		return this.runtimeOf_(e)?.boneTree(e) ?? null;
	}
	setDefaultMix(e, t) {
		const n = this.runtimeOf_(e);
		if (n) n.setDefaultMix(e, t);
	}
	setMixDuration(e, t, n, r) {
		const i = this.runtimeOf_(e);
		if (i) i.setMixDuration(e, t, n, r);
	}
	setTrackAlpha(e, t, n) {
		const r = this.runtimeOf_(e);
		if (r) r.setTrackAlpha(e, t, n);
	}
	setAttachment(e, t, n) {
		const r = this.runtimeOf_(e);
		if (!r) return false;
		return r.setAttachment(e, t, n);
	}
	setIKTarget(e, t, n, r, i) {
		const a = this.runtimeOf_(e);
		if (!a) return false;
		return a.setIKTarget(e, t, n, r, i);
	}
	setSlotColor(e, t, n, r, i, a) {
		const o = this.runtimeOf_(e);
		if (!o) return false;
		return o.setSlotColor(e, t, n, r, i, a);
	}
	listConstraints(e) {
		const t = this.runtimeOf_(e);
		if (t) return t.listConstraints(e);
		return null;
	}
	getTransformConstraintMix(e, t) {
		const n = this.runtimeOf_(e);
		if (n) return n.getTransformConstraintMix(e, t);
		return null;
	}
	setTransformConstraintMix(e, t, n) {
		const r = this.runtimeOf_(e);
		if (r) return r.setTransformConstraintMix(e, t, n);
		return false;
	}
	getPathConstraintMix(e, t) {
		const n = this.runtimeOf_(e);
		if (n) return n.getPathConstraintMix(e, t);
		return null;
	}
	setPathConstraintMix(e, t, n) {
		const r = this.runtimeOf_(e);
		if (r) return r.setPathConstraintMix(e, t, n);
		return false;
	}
	/**
	* Take an entity out of the frame, or put it back: a disabled entity keeps its
	* instance but stops posing and drawing. Distinct from `playing: false`, which
	* freezes the pose and keeps showing it.
	*
	* Also driven by `SpineAnimation.enabled` — the plugin carries that field
	* across on its edges (skeletal/enableSync), so writing the component wins at
	* the moment it is written and this call holds between such writes.
	*/
	setEnabled(e, t) {
		const n = this.runtimeOf_(e);
		if (!n) return;
		if (t) this.disabledEntities_.delete(e);
		else this.disabledEntities_.add(e);
		n.setEnabled(e, t);
	}
	enableEvents(e) {
		const t = this.runtimeOf_(e);
		if (t) t.enableEvents(e);
	}
	collectAllEvents(e) {
		const t = [];
		for (const n of this.runtimes_.values()) {
			const r = n.collectAllEvents(e);
			for (const e of r) t.push(e);
		}
		return t;
	}
	hasInstance(e) {
		return this.bindings_.has(e);
	}
	runtimeOf_(e) {
		return this.bindings_.get(e);
	}
	async ensureRuntime(e) {
		const t = this.runtimes_.get(e);
		if (t) return t;
		const n = this.loadingRuntimes_.get(e);
		if (n) return n;
		const r = this.factories_.get(e);
		if (!r) {
			a.warn("spine", `No module factory for version ${e}`);
			return null;
		}
		const i = (async () => {
			try {
				const t = new O(e, await r());
				if (this.observing_) t.observe(true);
				this.runtimes_.set(e, t);
				return t;
			} catch (t) {
				a.error("spine", `Failed to load WASM module for version ${e}`, t);
				return null;
			} finally {
				this.loadingRuntimes_.delete(e);
			}
		})();
		this.loadingRuntimes_.set(e, i);
		return i;
	}
};
function H(e, t) {
	let n = 0, r = 0, i = 0;
	do {
		const a = e[t + i++];
		n |= (a & 127) << r;
		r += 7;
		if (!(a & 128)) break;
	} while (r < 35);
	return {
		value: n,
		bytesRead: i
	};
}
/** 4.x binaries open with an 8-byte hash, then a length-prefixed version string. */
function U(e) {
	if (e.length < 10) return null;
	let t = 8;
	const { value: n, bytesRead: r } = H(e, t);
	t += r;
	if (n <= 1 || t + n - 1 > e.length) return null;
	const i = new TextDecoder().decode(e.subarray(t, t + n - 1));
	return i.startsWith("4.") ? B(i) : null;
}
/** 3.x and 2.1 both length-prefix the hash, so the version string sits just after it. */
function W(e) {
	if (e.length < 4) return null;
	let t = 0;
	const { value: n, bytesRead: r } = H(e, t);
	t += r;
	if (n > 0) t += n - 1;
	if (t >= e.length) return null;
	const { value: i, bytesRead: a } = H(e, t);
	t += a;
	if (i <= 1 || t + i - 1 > e.length) return null;
	const o = new TextDecoder().decode(e.subarray(t, t + i - 1));
	return o.startsWith("3.") || o.startsWith("2.") ? B(o) : null;
}
//#endregion
//#region src/sideModules/registry.ts
/**
* @file    registry.ts
* @brief   The single source of truth mapping an optional native module to its
*          shipped artifacts and emscripten glue convention.
*
* @details Estella's optional native subsystems (physics, the per-version spine
*          runtimes, …) ship as standalone emscripten modules — a `<file>.js`
*          glue plus a `<file>.wasm`. They are acquired uniformly through a
*          {@link SideModuleHost}; only the *transport* (fetch / inlined base64 /
*          WeChat factory) differs per realm. This table is what every transport
*          and the exporters agree on, so a module can never be referenced by one
*          and shipped under a different name by another.
*/
const G = {
	physics: { file: "physics" },
	physics3d: {
		file: "physics3d",
		globalName: "ESPhysics3DModule"
	},
	"physics3d:physx": {
		file: "physics3d-physx",
		globalName: "ESPhysics3DModule"
	},
	basis: {
		file: "basis",
		globalName: "ESBasisModule"
	},
	videodec: {
		file: "videodec",
		globalName: "ESVideoModule"
	},
	dragonbones: {
		file: "dragonbones",
		globalName: "ESDragonBonesModule"
	},
	"spine:2.1": {
		file: "spine21",
		globalName: "ESSpineModule"
	},
	"spine:3.8": {
		file: "spine38",
		globalName: "ESSpineModule"
	},
	"spine:4.1": {
		file: "spine41",
		globalName: "ESSpineModule"
	},
	"spine:4.2": {
		file: "spine42",
		globalName: "ESSpineModule"
	},
	"spine:4.3": {
		file: "spine43",
		globalName: "ESSpineModule"
	}
};
/** The side module that implements the 3D world for `backend`; Jolt when unset. */
function K(e) {
	return e === "physx" ? "physics3d:physx" : "physics3d";
}
const q = [
	"2.1",
	"3.8",
	"4.1",
	"4.2",
	"4.3"
];
/** The {@link SideModuleId} carrying a given spine skeleton version. */
function J(e) {
	return `spine:${e}`;
}
/** Modules a project supplied, keyed by id. Separate from the built-in table so
*  a project can never redefine `physics` out from under the engine. */
const Y = /* @__PURE__ */ new Map();
/**
* Declare a module the engine did not build.
*
* Called by the runtime from the packaged game's config (which the export writes
* from `.esengine/modules/`), so a game never registers by hand — but it is
* public, because a host embedding the engine may know its modules some other
* way. Registering an id the engine owns is refused: `physics` meaning two
* different binaries depending on load order is not a capability.
*/
function ie(e, t) {
	if (e in G) {
		a.warn("sidemodule", `ignoring a project module named "${e}" — that id belongs to the engine`);
		return;
	}
	Y.set(e, t);
}
/** How every transport and the exporters resolve an id. Built-ins win. */
function ae(e) {
	return G[e] ?? Y.get(e);
}
/** The ids a project declared — what an editor or a diagnostic lists. */
function X() {
	return [...Y.keys()];
}
/** Drop every project-declared module. Realm teardown: a reloaded play session
*  must not inherit the previous project's modules. */
function oe() {
	Y.clear();
}
//#endregion
//#region src/spine/SpinePlugin.ts
const Z = i({ events: [] }, "SpineEvents");
/**
* Public runtime spine API. Present once the app has a {@link SpineManager}
* (a realm with the spine side-module). Read it with `Res(Spine)` to control
* playback — `setAnimation` / `setSkin` / `setMixDuration` / `getAnimations` / etc.
*/
/**
* Spine playback, as `Res(Spine)` hands it over. Reached through the
* `esengine/spine` entry, since the runtime is a side module a project opts into.
*
* @beta
*/
const Q = i(null, "Spine");
const se = {
	0: "start",
	1: "interrupt",
	2: "end",
	3: "complete",
	4: null,
	5: "event"
};
function ce(e) {
	return new $(e);
}
var $ = class {
	/** Pass an explicit manager for headless/tests; otherwise the plugin builds
	*  one in {@link build} from the app's {@link App.sideModules} host (the realm
	*  decides the transport — fetch / inlined / WeChat). */
	constructor(e) {
		this.name = "spine";
		this.app_ = null;
		this.despawnUnsub_ = null;
		this.submitWired_ = false;
		this.enableMirror_ = new u(n);
		this.spineManager_ = e ?? null;
	}
	get spineManager() {
		return this.spineManager_;
	}
	setSpineManager(e) {
		this.spineManager_ = e;
		if (this.app_) {
			const t = this.app_;
			t.insertResource(Q, e);
			this.wireSubmit_(t);
			this.wireAnimatorDriver_(t);
		}
	}
	wireSubmit_(e) {
		if (this.submitWired_) return;
		this.submitWired_ = true;
		const t = (t) => e.world.isEntityActive(t);
		f(e, (t, r) => {
			this.spineManager_?.submitMeshes(t._cpp, (t) => e.world.tryGet(t, n)?.material ?? 0, r);
		}, t);
	}
	build(t) {
		this.app_ = t;
		const n = (e) => t.world.isEntityActive(e);
		const i = e(t);
		if (!this.spineManager_ && t.sideModules && i) {
			const e = t.sideModules;
			const n = /* @__PURE__ */ new Map();
			for (const t of q) n.set(t, async () => {
				const n = await e.acquire(J(t));
				if (!n) throw new Error(`spine ${t} module unavailable in this realm`);
				return n;
			});
			this.spineManager_ = new V(i, n);
		}
		t.insertResource(Z, { events: [] });
		if (this.spineManager_) t.insertResource(Q, this.spineManager_);
		this.despawnUnsub_ = t.world.onDespawn((e) => {
			this.spineManager_?.removeEntity(e);
		});
		const a = {
			_id: Symbol("SpineUpdateSystem"),
			_name: "SpineUpdateSystem",
			_params: [],
			_fn: () => {
				const e = t.getResource(r);
				const i = this.spineManager_;
				if (i) {
					this.enableMirror_.sync(t.world, i, n);
					i.updateAnimations(e.delta, n);
				}
				this.collectAndPublishEvents_(t, n);
			}
		};
		t.addSystemToSchedule(2, a);
		if (this.spineManager_) this.wireSubmit_(t);
	}
	/**
	* Wire the spine manager into the Animator as its Spine driver, so
	* spine-targeting Animator states drive skeletal animations. Runs after all
	* plugins build (the AnimatorController resource exists by then if the
	* AnimationPlugin is installed).
	*/
	finish(e) {
		this.wireAnimatorDriver_(e);
	}
	wireAnimatorDriver_(e) {
		if (this.spineManager_ && e.hasResource(p)) e.getResource(p).setSpineDriver(this.spineManager_);
	}
	/**
	* Drop the world.onDespawn subscription and dispose the spine manager's
	* native backends. Without this, a re-init left a stale despawn listener
	* pointing at a dead manager and leaked the wasm-side spine resources.
	*/
	cleanup() {
		this.despawnUnsub_?.();
		this.despawnUnsub_ = null;
		this.spineManager_?.dispose();
		this.app_ = null;
		this.submitWired_ = false;
	}
	collectAndPublishEvents_(e, t) {
		const n = [];
		if (this.spineManager_) for (const { entity: e, raw: r } of this.spineManager_.collectAllEvents(t)) {
			const t = se[r.type];
			if (t === null || t === void 0) continue;
			const i = {
				entity: e,
				type: t,
				track: r.track,
				animationName: r.animationName
			};
			if (t === "event") {
				i.eventName = r.eventName;
				i.floatValue = r.floatValue;
				i.intValue = r.intValue;
				i.stringValue = r.stringValue;
			}
			n.push(i);
		}
		e.insertResource(Z, { events: n });
	}
};
//#endregion
export { ee as C, S, h as T, w as _, G as a, E as b, K as c, ae as d, J as f, O as g, j as h, ce as i, X as l, R as m, Z as n, q as o, V as p, $ as r, oe as s, Q as t, ie as u, te as v, g as w, C as x, T as y };

//# sourceMappingURL=SpinePlugin.js.map