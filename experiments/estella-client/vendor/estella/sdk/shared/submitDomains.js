import { R as e } from "./system.js";
import { n as t, t as n } from "./wasmScratch.js";
//#region src/skeletal/meshBatches.ts
/**
* @file    skeletal/meshBatches.ts
* @brief   Reading posed geometry back out of a skeletal side module.
*
* @details Every such module answers the same four questions — how many batches,
*          how many vertices, how many indices, give me the bytes — because
*          SkeletalModule.hpp packs them the same way on the other side. So this
*          is written against those four rather than against a runtime, and Spine
*          and DragonBones both hand it their own.
*
*          The views handed to the callback point INTO the module's scratch heap
*          and die when the call returns. That is the point: a consumer copies
*          those bytes straight into its own heap, and nothing allocates a typed
*          array per batch per frame.
*/
/** Interleaved x,y,u,v,r,g,b,a — the layout every skeletal module writes. */
const r = 8;
/**
* Visit each posed batch. Views are valid only for the duration of each call.
*
* `probe` is counted into, never timed into: this loop is per batch per entity,
* so a clock read here is one per crossing.
*/
function i(e, i, a, o, s) {
	const c = i.getMeshBatchCount(a);
	if (s) s.abi.batchCount++;
	if (c === 0) return;
	n(e, 8, (n) => {
		if (s) {
			s.abi.malloc++;
			s.abi.free++;
			s.bytes.scratchAllocated += 8;
		}
		const l = n;
		const u = n + 4;
		for (let n = 0; n < c; n++) {
			const c = i.getMeshBatchVertexCount(a, n);
			const d = i.getMeshBatchIndexCount(a, n);
			if (s) {
				s.abi.vertexCount++;
				s.abi.indexCount++;
			}
			if (c <= 0 || d <= 0) continue;
			const f = c * r * 4;
			const p = d * 2;
			t(e, (t) => {
				const r = t(f);
				const m = t(p);
				i.getMeshBatchData(a, n, r, m, l, u);
				if (s) {
					s.meshBatches++;
					s.vertices += c;
					s.indices += d;
					s.abi.batchData++;
					s.abi.malloc += 2;
					s.abi.free += 2;
					s.bytes.scratchAllocated += f + p;
					s.bytes.wasmRead += f + p;
				}
				const h = e.HEAPU32[u >> 2];
				const g = i.getMeshBatchColorPremultiplied ? i.getMeshBatchColorPremultiplied(a, n) !== 0 : h === 4 || h === 5;
				if (s && i.getMeshBatchColorPremultiplied) s.abi.batchColor++;
				o(new Uint8Array(e.HEAPU8.buffer, r, f), new Uint8Array(e.HEAPU8.buffer, m, p), c, d, e.HEAPU32[l >> 2], h, g);
			});
		}
	});
}
//#endregion
//#region src/skeletal/submitMeshes.ts
/**
* @file    skeletal/submitMeshes.ts
* @brief   Handing one entity's posed geometry to the engine core.
*
* @details One entry point serves every skeletal runtime: it takes vertices,
*          indices, a texture, a blend mode, an entity, a scale, two flips and a
*          layer, and nothing in that list knows what posed them.
*
*          The copy is the delicate part. A module's batch bytes live in ITS heap,
*          and the core reads from the CORE's — so each batch is copied into an
*          engine-side scratch arena and submitted while the source view is still
*          live. Nothing intermediate is allocated, and nothing is cached between
*          frames.
*/
/**
* Copy each posed batch into the core's heap and submit it for `entity`.
*
* Returns false when the core cannot accept geometry at all (no submit export, no
* heap) — the caller stops rather than repeating the check per entity.
*/
function a(e, n, r, i, a, o, s) {
	const c = e.renderer_submitSkeletalBatchByEntityEx;
	const l = c ?? e.renderer_submitSkeletalBatchByEntity;
	const u = e.HEAPU8;
	if (!l || !u || !e._malloc || !e._free) return false;
	const d = {
		_malloc: e._malloc,
		_free: e._free
	};
	const f = o?.(r) ?? 0;
	t(d, (t) => {
		a((a, o, l, d, p, m, h) => {
			const g = t(a.byteLength);
			const _ = t(o.byteLength);
			u.set(a, g);
			u.set(o, _);
			if (s) {
				s.abi.submit++;
				s.bytes.coreWrite += a.byteLength + o.byteLength;
			}
			if (c) c.call(e, n, g, l, _, d, p, m, r, i.skeletonScale, i.flipX, i.flipY, i.layer, 0, f, h ?? (m === 4 || m === 5));
			else e.renderer_submitSkeletalBatchByEntity.call(e, n, g, l, _, d, p, m, r, i.skeletonScale, i.flipX, i.flipY, i.layer, 0, f);
		});
	});
	return true;
}
//#endregion
//#region src/skeletal/enableSync.ts
/**
* Carries `<component>.enabled` from the World into one skeletal manager, on the
* edges of that field. Hold one per manager (the memo of what it last pushed is
* what makes it edge-triggered) and call {@link sync} once per frame, before the
* manager advances and submits.
*/
var o = class {
	constructor(e) {
		this.component_ = e;
		this.mirrored_ = /* @__PURE__ */ new Map();
	}
	sync(e, t, n) {
		let r = 0;
		for (const i of t.boundEntities()) {
			r++;
			if (this.mirrored_.has(i) && n && !n(i)) continue;
			const a = e.tryGet(i, this.component_);
			if (!a) continue;
			const o = a.enabled !== false;
			if (this.mirrored_.get(i) === o) continue;
			this.mirrored_.set(i, o);
			t.setEnabled(i, o);
		}
		if (this.mirrored_.size > r) this.prune_(t);
	}
	prune_(e) {
		const t = new Set(e.boundEntities());
		for (const e of this.mirrored_.keys()) if (!t.has(e)) this.mirrored_.delete(e);
	}
};
//#endregion
//#region src/skeletal/submitDomains.ts
/**
* Register `submit` for the cameras and for the screen overlay. A core that cannot
* say what the screen owns has partitioned nothing, so everything goes to the cameras.
*/
function s(t, n, r) {
	const i = e(t);
	const a = (e, t) => i?.ui_isScreenDomain?.(e._cpp, t) ?? false;
	t.pipeline?.addPreFlushCallback((e) => n(e, (t) => r(t) && !a(e, t)));
	if (!i?.ui_isScreenDomain) return;
	t.pipeline?.addScreenOverlayCallback((e) => n(e, (t) => r(t) && a(e, t)));
}
//#endregion
export { i, o as n, a as r, s as t };

//# sourceMappingURL=submitDomains.js.map