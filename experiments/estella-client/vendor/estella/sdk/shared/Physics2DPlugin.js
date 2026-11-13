import { $t as e, E as t, Et as n, R as r, V as i, Z as a, c as o, dn as s, ft as c, k as l, mt as u, n as d, pt as f, qt as p, t as m, xn as h } from "./system.js";
import { i as g, t as _ } from "./resource.js";
import { s as v } from "./logger.js";
import { t as y } from "./wasmScratch.js";
import { m as b } from "./resourceManager.js";
import { s as x } from "./env.js";
import { a as S, c as C, d as w, f as T, h as E, i as D, l as O, m as k, n as A, o as j, p as M, r as N, s as P, t as F, u as ee } from "./PhysicsComponents.js";
import { n as te, s as ne } from "./ColliderShape2D.js";
import { i as I, n as re, r as L, s as ie, t as R } from "./Physics2D.js";
import { t as z } from "./Physics2DRuntime.js";
import { n as B, r as ae } from "./constants.generated.js";
import { r as oe } from "./input.js";
import { r as se } from "./entityEvents.js";
//#region src/physics/PhysicsModuleLoader.ts
async function V(e, t) {
	if (!t) throw new Error("PhysicsModuleLoader: factory parameter is required. Pass the Physics WASM factory function explicitly via loadPhysicsModule(url, factory).");
	return t();
}
//#endregion
//#region src/physics/PhysicsBridge.ts
/**
* @file    PhysicsBridge.ts
* @brief   Physics subsystem's bridge to its WASM module.
*
* @details The physics module is loaded standalone (its own emscripten runtime
*          with its own `onAbort`), so the bridge's health module is the module
*          itself. All `_physics_*` calls made through `bridge.module` inherit
*          the terminal-abort guard for free — closing the gap where physics
*          previously called straight into a possibly-dead module.
*/
var ce = class extends b {
	constructor(...e) {
		super(...e);
		this.label = "physics";
	}
};
//#endregion
//#region src/physics/batchStaticPoses2D.ts
/** Transfer composed candidates in one batch. The native host shares its arena;
* standalone wasm modules copy only the populated pose rows between heaps. */
function le(e, t, n, r, a) {
	const o = i(e), s = e.getCppRegistry();
	if (!o?.registry_readWorldPoses2D || !o._malloc || !o._free || !o.HEAPU32 || !o.HEAPU8 || !t._physics_setBodyTransforms || !s) return false;
	if (!n.length) return true;
	const c = 4 * 4;
	return y({
		_malloc: o._malloc.bind(o),
		_free: o._free.bind(o)
	}, n.length * (4 + c), (e) => {
		if (!e) return false;
		let i = 0;
		for (const t of n) if (a(t)) o.HEAPU32[(e >>> 2) + i++] = t;
		if (!i) return true;
		const l = e + n.length * 4;
		const u = o.registry_readWorldPoses2D(s, e, i, l);
		if (!Number.isInteger(u) || u < 0 || u > i) throw new Error("Invalid world pose batch length");
		if (!u) return true;
		if (o.HEAPU8.buffer === t.HEAPU8.buffer) {
			t._physics_setBodyTransforms(l, u, r);
			return true;
		}
		return y(t, u * c, (e) => {
			if (!e) return false;
			t.HEAPU8.set(o.HEAPU8.subarray(l, l + u * c), e);
			t._physics_setBodyTransforms(e, u, r);
			return true;
		});
	});
}
//#endregion
//#region src/physics/StaticBodyPoses2D.ts
/** Static poses follow sparse authored writes and their immediate parent's world
* frame. Dynamic writeback may invalidate composition without editing either. */
var ue = class {
	constructor(e) {
		this.world = e;
		this.poses = /* @__PURE__ */ new Map();
		this.groups = /* @__PURE__ */ new Map();
		this.parents = /* @__PURE__ */ new Map();
		this.reader = null;
		this.epoch = -1;
		this.ppu = -1;
		this.legacyStale = false;
		this.dirty = /* @__PURE__ */ new Set();
	}
	set(e, t) {
		if (this.poses.get(e)?.parent !== t.parent) this.delete(e);
		this.poses.set(e, t);
		if (t.parent !== null) {
			let n = this.groups.get(t.parent);
			if (!n) {
				n = /* @__PURE__ */ new Set();
				this.groups.set(t.parent, n);
			}
			n.add(e);
		}
	}
	track(e, t) {
		const n = this.poses.get(e);
		if (n?.parent === t) return;
		this.set(e, n ? {
			...n,
			parent: t
		} : {
			x: NaN,
			y: NaN,
			angle: NaN,
			parent: t
		});
		this.invalidate(e);
	}
	invalidate(e) {
		if (this.poses.has(e)) this.dirty.add(e);
	}
	delete(e) {
		const t = this.poses.get(e)?.parent;
		if (t != null) {
			const n = this.groups.get(t);
			n?.delete(e);
			if (!n?.size) {
				this.groups.delete(t);
				this.parents.delete(t);
			}
		}
		this.poses.delete(e);
		this.dirty.delete(e);
	}
	/** A stopped simulation owes a full pose refresh, but retains no write history. */
	pause() {
		if (this.reader !== null) this.world.disposeMutationCursor(p, "write", this.reader);
		this.reader = null;
		this.epoch = -1;
	}
	sync(e, t, n, r) {
		const i = this.world;
		if (!this.poses.size) {
			this.pause();
			return;
		}
		const a = this.reader === null;
		if (a) this.reader = i.registerMutationCursor(p, "write");
		const o = i.mutationSequence("write");
		const s = i.transformEpoch();
		if (a || n || this.dirty.size || s < 0 || s !== this.epoch || t !== this.ppu) {
			i.ensureTransformsComposed();
			const o = a || n || s < 0 || t !== this.ppu;
			const c = /* @__PURE__ */ new Set();
			for (const e of this.groups.keys()) {
				let t = true;
				if (i.has(e, p)) {
					const n = i.get(e, p);
					const r = n.worldPosition, a = n.worldRotation, o = n.worldScale;
					const s = [
						r.x,
						r.y,
						r.z,
						a.x,
						a.y,
						a.z,
						a.w,
						o.x,
						o.y,
						o.z
					];
					const c = this.parents.get(e);
					t = !c || s.some((e, t) => e !== c[t]);
					this.parents.set(e, s);
				} else this.parents.delete(e);
				if (!o && t) c.add(e);
			}
			const l = /* @__PURE__ */ new Set();
			if (o) for (const e of this.poses.keys()) l.add(e);
			else {
				for (const e of c) for (const t of this.groups.get(e)) l.add(t);
				for (const e of this.dirty) l.add(e);
				const e = new Set(i.mutationsForCursor(p, "write", this.reader));
				for (const t of e) {
					const e = this.poses.get(t);
					if (e && (e.parent === null || !c.has(e.parent))) l.add(t);
				}
			}
			if (le(i, e, [...l], t, r)) this.legacyStale = true;
			else {
				if (this.legacyStale) {
					for (const e of this.poses.values()) e.x = NaN;
					this.legacyStale = false;
				}
				const n = 1 / t;
				const a = (t) => {
					if (!r(t) || !i.isEntityActive(t)) return;
					const a = this.poses.get(t);
					const o = i.get(t, p);
					const s = a.parent !== null ? o.worldPosition : o.position;
					const c = a.parent !== null ? o.worldRotation : o.rotation;
					const l = s.x * n, u = s.y * n, d = I(c);
					if (a.x !== l || a.y !== u || a.angle !== d) {
						e._physics_setBodyTransform(t, l, u, d);
						a.x = l;
						a.y = u;
						a.angle = d;
					}
				};
				for (const e of l) a(e);
			}
		}
		this.epoch = i.transformEpoch();
		this.dirty.clear();
		this.ppu = t;
		i.advanceMutationCursor(p, "write", this.reader, o);
	}
	dispose() {
		this.pause();
		this.poses.clear();
		this.groups.clear();
		this.parents.clear();
	}
};
//#endregion
//#region src/ecs/ComponentMutationReader.ts
/** Projects SDK and native mutation cursors onto World-owned entities. Readers
* acknowledge only successful runs and release history while their consumer stops. */
var de = class {
	constructor(e, t, n, r) {
		this.world = e;
		this.subtree = r;
		this.api = null;
		this.registry = null;
		this.lease = null;
		this.cursor = 0;
		this.first = true;
		this.bindingReset = false;
		this.disposed = false;
		this.checkpoint = null;
		this.resetEpoch = null;
		this.lastRegistry = null;
		this.nativeTypes = /* @__PURE__ */ new Map();
		this.writes = /* @__PURE__ */ new Map();
		this.topology = /* @__PURE__ */ new Map();
		this.values = /* @__PURE__ */ new Set([...t, ...r]);
		this.members = /* @__PURE__ */ new Set([...this.values, ...n]);
		this.offDisconnect = e.onCoreDisconnect(() => {
			try {
				this.pause();
			} finally {
				this.bindingReset = true;
				this.lastRegistry = null;
				this.resetEpoch = null;
			}
		});
	}
	open() {
		if (this.disposed) return false;
		if (this.lease !== null) return true;
		const e = i(this.world), t = this.world.getCppRegistry();
		if (!t?.componentTypeId || !e?.registry_watchEntityChanges || !e.registry_unwatchEntityChanges || !e.registry_entityChangeSequence || !e.registry_entityChangeResetEpoch || !e.registry_componentMutationRevision || !e.registry_readEntityChanges || !e._malloc || !e._free || !e.HEAPU32) return false;
		for (const e of this.members) {
			if (!s(e)) continue;
			const n = t.componentTypeId(e._cppName);
			if (!Number.isInteger(n) || n < 0) {
				this.nativeTypes.clear();
				return false;
			}
			this.nativeTypes.set(n, e);
		}
		this.api = e;
		this.registry = t;
		if (this.lastRegistry !== t) {
			this.lastRegistry = t;
			this.resetEpoch = e.registry_entityChangeResetEpoch(t);
		}
		this.lease = e.registry_watchEntityChanges(t);
		for (const e of this.values) this.writes.set(e, this.world.registerMutationCursor(e, "write"));
		for (const e of this.members) this.topology.set(e, this.world.registerMutationCursor(e, "topology"));
		return true;
	}
	read() {
		if (!this.open()) return null;
		const e = this.world, t = this.api, n = this.registry;
		const r = t.registry_entityChangeSequence(n);
		const i = t.registry_entityChangeResetEpoch(n);
		const a = [t.registry_componentMutationRevision(n, ae, false)];
		for (const t of this.values) a.push(e.mutationRevision(t, "write"));
		for (const t of this.members) a.push(e.mutationRevision(t, "topology"));
		for (const [e, r] of this.nativeTypes) a.push(t.registry_componentMutationRevision(n, e, !this.values.has(r)));
		const o = e.mutationSequence("write"), s = e.mutationSequence("topology");
		const c = /* @__PURE__ */ new Set(), l = /* @__PURE__ */ new Set();
		const u = /* @__PURE__ */ new Map();
		const d = (e, t, n) => {
			let r = u.get(e);
			if (!r) {
				r = /* @__PURE__ */ new Set();
				u.set(e, r);
			}
			r.add(t);
			if (n || this.values.has(e)) c.add(t);
			if (this.subtree.includes(e)) l.add(t);
		};
		for (const [t, n] of this.writes) for (const r of e.mutationsForCursor(t, "write", n)) d(t, r, false);
		for (const [t, n] of this.topology) for (const r of e.mutationsForCursor(t, "topology", n)) d(t, r, true);
		let m = this.bindingReset || i < 0 || i !== this.resetEpoch;
		const h = this.checkpoint !== null && a.every((e, t) => e >= 0 && e === this.checkpoint[t]);
		let g = m || this.first && !h;
		let _ = false;
		if (r !== this.cursor && !(this.first && h && !m)) y({
			_malloc: t._malloc.bind(t),
			_free: t._free.bind(t)
		}, B * 3 * 4, (r) => {
			if (!r) {
				g ||= !h;
				_ = true;
				return;
			}
			const i = t.registry_readEntityChanges(n, this.cursor, r, B);
			if (i < 0) {
				g ||= !h;
				_ = true;
				return;
			}
			if (!Number.isInteger(i) || i > 4096) throw new Error("Invalid native mutation batch length");
			const a = t.HEAPU32;
			for (let t = 0; t < i; ++t) {
				const n = (r >>> 2) + t * 3;
				const i = a[n], o = a[n + 1], s = a[n + 2];
				if (o & 2) {
					g = true;
					_ = true;
					continue;
				}
				if (o & 1) l.add(i);
				if (s === 4294967295) {
					c.add(i);
					if (!(o & 1)) for (const t of this.nativeTypes.values()) {
						d(t, i, true);
						e.refreshBuiltinMembership(i, t);
					}
				}
				const u = this.nativeTypes.get(s);
				if (!u) continue;
				const f = !(o & 4);
				d(u, i, f);
				e.refreshBuiltinMembership(i, u);
			}
		});
		if (g) for (const t of e.getAllEntities()) {
			c.add(t);
			for (const n of this.nativeTypes.values()) e.refreshBuiltinMembership(t, n);
		}
		else if (l.size) {
			const t = e.resolveHas(f);
			const r = [...l], i = /* @__PURE__ */ new Set();
			while (r.length) {
				const a = r.pop();
				if (i.has(a) || !e.valid(a) && !n.valid(a)) continue;
				i.add(a);
				c.add(a);
				if (t?.(a)) for (const t of e.get(a, f).entities) r.push(t);
			}
		}
		if (g || _ || l.size || u.has(p)) e.invalidateTransformComposition();
		return {
			full: g,
			reset: m,
			refreshPoses: _,
			entities: c,
			changed: u,
			nativeSequence: r,
			resetEpoch: i,
			writeSequence: o,
			topologySequence: s,
			checkpoint: a
		};
	}
	commit(e) {
		this.cursor = e.nativeSequence;
		this.first = false;
		this.bindingReset = false;
		this.resetEpoch = e.resetEpoch;
		this.checkpoint = e.checkpoint;
		for (const [t, n] of this.writes) this.world.advanceMutationCursor(t, "write", n, e.writeSequence);
		for (const [t, n] of this.topology) this.world.advanceMutationCursor(t, "topology", n, e.topologySequence);
	}
	pause() {
		for (const [e, t] of this.writes) this.world.disposeMutationCursor(e, "write", t);
		for (const [e, t] of this.topology) this.world.disposeMutationCursor(e, "topology", t);
		this.writes.clear();
		this.topology.clear();
		this.nativeTypes.clear();
		try {
			if (this.lease !== null) this.api.registry_unwatchEntityChanges(this.registry, this.lease);
		} finally {
			this.lease = null;
			this.registry = null;
			this.api = null;
			this.cursor = 0;
			this.first = true;
		}
	}
	dispose() {
		this.disposed = true;
		try {
			this.pause();
		} finally {
			this.lastRegistry = null;
			this.offDisconnect();
		}
	}
};
//#endregion
//#region src/physics/PhysicsSystem.ts
/** The scene's live pixels-per-unit — the one reader of Canvas.pixelsPerUnit. @internal */
function H(e) {
	const t = e.world.getEntitiesWithComponents([c]);
	for (const n of t) {
		const t = e.world.get(n, c);
		if (t && t.pixelsPerUnit) return t.pixelsPerUnit;
	}
	return 100;
}
const fe = 16;
/**
* What a collider on `categoryBits` may touch: the project's layer table when it
* names that layer, the collider's own mask otherwise. A table is saved at the
* length a project has named, so reading past its end is a layer nobody set —
* not a layer that touches nothing, which is what `undefined` reaches wasm as.
*/
function U(e, t, n) {
	if (!n) return t;
	for (let r = 0; r < fe; r++) if (e === 1 << r) return n[r] ?? t;
	return t;
}
/** Attach a Box2D shape for each enabled collider on the entity. @internal */
function W(e, t, n, r) {
	const i = E(e, n, F);
	if (i) {
		const e = i.categoryBits ?? 1;
		const a = U(e, i.maskBits ?? 65535, r);
		t._physics_addBoxShape(n, i.halfExtents.x, i.halfExtents.y, i.offset.x, i.offset.y, i.radius ?? .05, i.density, i.friction, i.restitution, i.isSensor ? 1 : 0, e, a);
	}
	const a = E(e, n, D);
	if (a) {
		const e = a.categoryBits ?? 1;
		const i = U(e, a.maskBits ?? 65535, r);
		t._physics_addCircleShape(n, a.radius, a.offset.x, a.offset.y, a.density, a.friction, a.restitution, a.isSensor ? 1 : 0, e, i);
	}
	const o = E(e, n, A);
	if (o) {
		const e = o.categoryBits ?? 1;
		const i = U(e, o.maskBits ?? 65535, r);
		t._physics_addCapsuleShape(n, o.radius, o.halfHeight, o.offset.x, o.offset.y, o.density, o.friction, o.restitution, o.isSensor ? 1 : 0, e, i);
	}
	const s = E(e, n, T);
	if (s) {
		const e = s.categoryBits ?? 1;
		const i = U(e, s.maskBits ?? 65535, r);
		t._physics_addSegmentShape(n, s.point1.x, s.point1.y, s.point2.x, s.point2.y, s.density, s.friction, s.restitution, s.isSensor ? 1 : 0, e, i);
	}
	const c = E(e, n, ee);
	if (c) {
		const e = c.categoryBits ?? 1;
		const i = U(e, c.maskBits ?? 65535, r);
		const { pieces: a } = ne(c.vertices);
		const o = a.length === 1 ? c.radius ?? 0 : 0;
		for (const r of a) {
			const a = r.length * 2 * 4;
			y(t, a, (a) => {
				const s = a >> 2;
				for (let e = 0; e < r.length; e++) {
					t.HEAPF32[s + e * 2] = r[e].x;
					t.HEAPF32[s + e * 2 + 1] = r[e].y;
				}
				t._physics_addPolygonShape(n, a, r.length, o, c.density, c.friction, c.restitution, c.isSensor ? 1 : 0, e, i);
			});
		}
	}
	const l = E(e, n, N);
	if (l) {
		const e = l.points;
		if (e.length < 4) return;
		const r = e.length * 2 * 4;
		y(t, r, (r) => {
			const i = r >> 2;
			for (let n = 0; n < e.length; n++) {
				t.HEAPF32[i + n * 2] = e[n].x;
				t.HEAPF32[i + n * 2 + 1] = e[n].y;
			}
			t._physics_addChainShape(n, r, e.length, l.isLoop ? 1 : 0, l.friction, l.restitution, l.categoryBits ?? 1, l.maskBits ?? 65535);
		});
	}
}
function pe(e, t, n, r, i) {
	const a = e.getEntitiesWithComponents([P, w]);
	for (const o of a) {
		if (r.has(o)) continue;
		if (!n.has(o)) continue;
		const a = e.get(o, P);
		if (!a.enabled) continue;
		const s = a.connectedEntity;
		if (!n.has(s)) continue;
		t._physics_createRevoluteJoint(s, o, a.anchorA.x * i, a.anchorA.y * i, a.anchorB.x * i, a.anchorB.y * i, a.enableMotor ? 1 : 0, a.motorSpeed, a.maxMotorTorque, a.enableLimit ? 1 : 0, a.lowerAngle, a.upperAngle, a.collideConnected ? 1 : 0);
		if (t._physics_hasJoint(o)) r.set(o, q(e, o, i));
	}
	for (const a of e.getEntitiesWithComponents([S, w])) {
		if (r.has(a)) continue;
		if (!n.has(a)) continue;
		const o = e.get(a, S);
		if (!o.enabled) continue;
		const s = o.connectedEntity;
		if (!n.has(s)) continue;
		t._physics_createDistanceJoint(s, a, o.anchorA.x * i, o.anchorA.y * i, o.anchorB.x * i, o.anchorB.y * i, o.length * i, o.enableSpring ? 1 : 0, o.hertz, o.dampingRatio, o.enableLimit ? 1 : 0, o.minLength * i, o.maxLength * i, o.enableMotor ? 1 : 0, o.maxMotorForce, o.motorSpeed, o.collideConnected ? 1 : 0);
		if (t._physics_hasJoint(a)) r.set(a, q(e, a, i));
	}
	for (const a of e.getEntitiesWithComponents([M, w])) {
		if (r.has(a)) continue;
		if (!n.has(a)) continue;
		const o = e.get(a, M);
		if (!o.enabled) continue;
		const s = o.connectedEntity;
		if (!n.has(s)) continue;
		t._physics_createPrismaticJoint(s, a, o.anchorA.x * i, o.anchorA.y * i, o.anchorB.x * i, o.anchorB.y * i, o.axis.x, o.axis.y, o.enableSpring ? 1 : 0, o.hertz, o.dampingRatio, o.enableLimit ? 1 : 0, o.lowerTranslation * i, o.upperTranslation * i, o.enableMotor ? 1 : 0, o.maxMotorForce, o.motorSpeed, o.collideConnected ? 1 : 0);
		if (t._physics_hasJoint(a)) r.set(a, q(e, a, i));
	}
	for (const a of e.getEntitiesWithComponents([j, w])) {
		if (r.has(a)) continue;
		if (!n.has(a)) continue;
		const o = e.get(a, j);
		if (!o.enabled) continue;
		const s = o.connectedEntity;
		if (!n.has(s)) continue;
		t._physics_createWeldJoint(s, a, o.anchorA.x * i, o.anchorA.y * i, o.anchorB.x * i, o.anchorB.y * i, o.linearHertz, o.angularHertz, o.linearDampingRatio, o.angularDampingRatio, o.collideConnected ? 1 : 0);
		if (t._physics_hasJoint(a)) r.set(a, q(e, a, i));
	}
	for (const a of e.getEntitiesWithComponents([k, w])) {
		if (r.has(a)) continue;
		if (!n.has(a)) continue;
		const o = e.get(a, k);
		if (!o.enabled) continue;
		const s = o.connectedEntity;
		if (!n.has(s)) continue;
		t._physics_createWheelJoint(s, a, o.anchorA.x * i, o.anchorA.y * i, o.anchorB.x * i, o.anchorB.y * i, o.axis.x, o.axis.y, o.enableSpring ? 1 : 0, o.hertz, o.dampingRatio, o.enableLimit ? 1 : 0, o.lowerTranslation * i, o.upperTranslation * i, o.enableMotor ? 1 : 0, o.maxMotorTorque, o.motorSpeed, o.collideConnected ? 1 : 0);
		if (t._physics_hasJoint(a)) r.set(a, q(e, a, i));
	}
	for (const a of e.getEntitiesWithComponents([C, w])) {
		if (r.has(a)) continue;
		if (!n.has(a)) continue;
		const o = e.get(a, C);
		if (!o.enabled) continue;
		const s = o.connectedEntity;
		if (!n.has(s)) continue;
		t._physics_createMotorJoint(s, a, o.linearVelocity.x * i, o.linearVelocity.y * i, o.maxVelocityForce, o.angularVelocity, o.maxVelocityTorque, o.linearHertz, o.linearDampingRatio, o.maxSpringForce, o.angularHertz, o.angularDampingRatio, o.maxSpringTorque, o.collideConnected ? 1 : 0);
		if (t._physics_hasJoint(a)) r.set(a, q(e, a, i));
	}
}
function me(e, t, n, r, i) {
	const a = i ?? /* @__PURE__ */ new Set([...e.getEntitiesWithComponents([O, w]), ...r]);
	for (const i of a) {
		if (!n.has(i) || !e.isEntityActive(i) || !e.has(i, O)) {
			if (r.delete(i)) t._physics_setOneWayPlatform(i, 0, 0, 0);
			continue;
		}
		const a = e.get(i, O);
		if (a.localSpace) t._physics_setOneWayPlatformLocal(i, a.normal.x, a.normal.y, a.enabled ? 1 : 0);
		else t._physics_setOneWayPlatform(i, a.normal.x, a.normal.y, a.enabled ? 1 : 0);
		r.add(i);
	}
}
const he = 4;
const ge = he * 4;
/**
* Write interpolated body poses into ECS Transforms. The snapshot pair and the
* lerp itself belong to the physics module (`physics_capturePoses` /
* `physics_getInterpolatedTransforms`): they run over every dynamic body every
* frame, and the no-JIT budget bars that loop from the JS path
* (docs/REARCH_NATIVE.md §3.2). What is left here is routing the finished buffer
* to the engine. With `alpha = 1` this reproduces a direct post-step sync.
* @internal exported for testing
*/
function _e(e, t, i, a, o) {
	const s = a._physics_getInterpolatedCount();
	if (s === 0) return;
	const c = e.world.getCppRegistry();
	if (!c) return;
	const l = r(e);
	const u = i.size > 0;
	const d = a._physics_getInterpolatedTransforms(o);
	const f = l?.registry_batchSyncPhysicsTransforms;
	const m = l?.HEAPU8;
	if (!u && f && m) {
		if (m.buffer === a.HEAPU8.buffer) {
			f.call(l, c, d, s, t);
			return;
		}
		if (l?._malloc && l._free) {
			const e = s * ge;
			y(l, e, (n) => {
				m.set(a.HEAPU8.subarray(d, d + e), n);
				f.call(l, c, n, s, t);
			});
			return;
		}
	}
	e.world.invalidateTransformComposition();
	const h = l?.getTransformPtr;
	const g = h ? (e) => h.call(l, c, e) : null;
	const _ = l?.HEAPF32;
	const v = !g || !_ ? c.addTransform.bind(c) : null;
	const b = a.HEAPU32;
	const x = a.HEAPF32;
	const S = d >> 2;
	for (let r = 0; r < s; r++) {
		const a = S + r * he;
		const o = b[a];
		let s = x[a + 1] * t;
		let c = x[a + 2] * t;
		let l = x[a + 3];
		if (u && i.has(o)) {
			const t = e.world.get(o, n);
			if (t && e.world.valid(t.entity) && e.world.has(t.entity, p)) {
				const n = e.world.get(t.entity, p);
				const r = I(n.worldRotation);
				const i = s - n.worldPosition.x;
				const a = c - n.worldPosition.y;
				const o = Math.cos(-r);
				const u = Math.sin(-r);
				const d = n.worldScale.x !== 0 ? n.worldScale.x : 1;
				const f = n.worldScale.y !== 0 ? n.worldScale.y : 1;
				s = (i * o - a * u) / d;
				c = (i * u + a * o) / f;
				l = l - r;
			}
		}
		const d = l * .5;
		const f = Math.cos(d);
		const m = Math.sin(d);
		if (g && _) {
			const e = g(o);
			if (e) {
				const t = e >> 2;
				_[t] = s;
				_[t + 1] = c;
				_[t + 2] = 0;
				_[t + 3] = 0;
				_[t + 4] = 0;
				_[t + 5] = m;
				_[t + 6] = f;
				continue;
			}
		}
		if (!e.world.valid(o) || !e.world.has(o, p)) continue;
		v(o, {
			...e.world.get(o, p),
			position: {
				x: s,
				y: c,
				z: 0
			},
			rotation: {
				w: f,
				x: 0,
				y: 0,
				z: m
			}
		});
	}
}
/**
* Drain this fixed step's events into the per-frame accumulator. Physics2DAPI may step
* several times per rendered frame; accumulating (rather than overwriting) keeps
* every collision — the interpolation system publishes + clears once per frame.
*/
function ve(e, t, n) {
	e._physics_collectEvents();
	const r = e._physics_getCollisionEnterCount();
	if (r > 0) {
		const i = e._physics_getCollisionEnterBuffer() >> 2;
		for (let a = 0; a < r; a++) {
			const r = i + a * 6;
			n.collisionEnters.push({
				entityA: e.HEAPU32[r],
				entityB: e.HEAPU32[r + 1],
				normalX: e.HEAPF32[r + 2],
				normalY: e.HEAPF32[r + 3],
				contactX: e.HEAPF32[r + 4] * t,
				contactY: e.HEAPF32[r + 5] * t
			});
		}
	}
	const i = e._physics_getCollisionExitCount();
	if (i > 0) {
		const t = e._physics_getCollisionExitBuffer() >> 2;
		for (let r = 0; r < i; r++) {
			const i = t + r * 2;
			n.collisionExits.push({
				entityA: e.HEAPU32[i],
				entityB: e.HEAPU32[i + 1]
			});
		}
	}
	const a = e._physics_getHitEventCount();
	if (a > 0) {
		const r = e._physics_getHitEventBuffer() >> 2;
		for (let i = 0; i < a; i++) {
			const a = r + i * 7;
			n.collisionHits.push({
				entityA: e.HEAPU32[a],
				entityB: e.HEAPU32[a + 1],
				pointX: e.HEAPF32[a + 2] * t,
				pointY: e.HEAPF32[a + 3] * t,
				normalX: e.HEAPF32[a + 4],
				normalY: e.HEAPF32[a + 5],
				approachSpeed: e.HEAPF32[a + 6] * t
			});
		}
	}
	const o = e._physics_getSensorEnterCount();
	if (o > 0) {
		const t = e._physics_getSensorEnterBuffer() >> 2;
		for (let r = 0; r < o; r++) {
			const i = t + r * 2;
			n.sensorEnters.push({
				sensorEntity: e.HEAPU32[i],
				visitorEntity: e.HEAPU32[i + 1]
			});
		}
	}
	const s = e._physics_getSensorExitCount();
	if (s > 0) {
		const t = e._physics_getSensorExitBuffer() >> 2;
		for (let r = 0; r < s; r++) {
			const i = t + r * 2;
			n.sensorExits.push({
				sensorEntity: e.HEAPU32[i],
				visitorEntity: e.HEAPU32[i + 1]
			});
		}
	}
}
const G = [
	F,
	D,
	A,
	T,
	ee,
	N
];
const K = [
	P,
	S,
	M,
	j,
	k,
	C
];
function q(e, t, n) {
	for (let r = 0; r < K.length; ++r) {
		const i = K[r];
		if (e.has(t, i)) return JSON.stringify([
			r,
			n,
			e.get(t, i)
		]);
	}
	return null;
}
/** Bitmask of which collider components an entity currently has. @internal */
function ye(e, t) {
	let n = 0;
	for (let r = 0; r < G.length; r++) if (e.has(t, G[r])) n |= 1 << r;
	return n;
}
function be(e, t) {
	return JSON.stringify(G.map((n) => E(e, t, n)));
}
/** True if any present collider component changed since `sinceTick`. @internal */
function xe(e, t, n) {
	for (const r of G) if (e.has(t, r) && e.isChangedSince(t, r, n)) return true;
	return false;
}
/**
* For a tracked joint entity (invariant: ≤1 joint component): whether its joint
* was removed, or its definition changed since `sinceTick` — either way the old
* Box2D joint must be destroyed (createPendingJoints re-adds it if still present).
* @internal
*/
function Se(e, t, n) {
	for (const r of K) if (e.has(t, r)) return e.isChangedSince(t, r, n);
	return true;
}
/**
* For a tracked joint entity: whether its connected partner body is no longer
* tracked (despawned, or its RigidBody2D removed). Box2D auto-destroys a joint
* when either connected body dies, but the owner keeps its unchanged joint
* component and stays in `trackedJoints` — so without re-establishing it here the
* joint is silently dead forever, even after the partner respawns.
* @internal
*/
function Ce(e, t, n) {
	for (const r of K) if (e.has(t, r)) {
		const i = e.get(t, r).connectedEntity;
		return !n.has(i);
	}
	return false;
}
/**
* Wire the per-frame physics system into the app. Owns tracked-entity
* / tracked-joint / parented sets via the enclosing closure so the
* plugin doesn't need to thread them through.
*/
function we(e, t, r) {
	const i = /* @__PURE__ */ new Set();
	const a = /* @__PURE__ */ new Map();
	const s = /* @__PURE__ */ new Set();
	const c = /* @__PURE__ */ new Set();
	const l = /* @__PURE__ */ new Map();
	const d = /* @__PURE__ */ new Map();
	const m = (e) => {
		let t = d.get(e);
		if (!t) {
			t = {
				value: e,
				references: 0
			};
			d.set(e, t);
		}
		t.references++;
		return t.value;
	};
	const h = (e) => {
		const t = d.get(e);
		if (t && --t.references === 0) d.delete(e);
	};
	let v = -1;
	let y = NaN;
	let b = [];
	const S = {
		collisionEnters: [],
		collisionExits: [],
		collisionHits: [],
		sensorEnters: [],
		sensorExits: []
	};
	const C = r.fixedTimestep;
	const T = [
		w,
		...G,
		...K,
		O
	];
	for (const t of T) e.world.enableChangeTracking(t);
	const E = /* @__PURE__ */ new Set();
	const D = new ue(e.world);
	let k = -1;
	const A = e.world;
	A.enableChangeTracking(p);
	const j = new de(A, T, [p, f], [n, u]);
	const M = (e) => {
		if (!i.delete(e)) return;
		t._physics_destroyBody(e);
		h(l.get(e).colliderState);
		l.delete(e);
		c.delete(e);
		E.delete(e);
		D.delete(e);
	};
	const N = A.onDespawn((e) => {
		if (a.has(e)) {
			t._physics_destroyJoint(e);
			a.delete(e);
		}
		if (s.has(e)) {
			t._physics_setOneWayPlatform(e, 0, 0, 0);
			s.delete(e);
		}
		if (i.has(e)) M(e);
	});
	e.addSystemToSchedule(11, o([], () => {
		const o = H(e);
		const u = 1 / o;
		const d = u !== y;
		if (e.hasResource(R)) e.getResource(R).setPixelsPerUnit(o);
		const f = A.getWorldVersion();
		const g = j.read();
		const _ = g ? null : K.map((e) => A.mutationRevision(e, "write"));
		const x = !!_ && _.some((e, t) => e !== b[t]);
		let O = f !== k;
		if (g) O = g.full || g.entities.size > 0;
		else if (!O) {
			for (let e = 0; e < T.length; e++) if (A.anyChangedSince(T[e], v)) {
				O = true;
				break;
			}
		}
		O ||= d || x;
		if (g) {
			for (const e of g.changed.get(p) ?? []) D.invalidate(e);
			if (g.reset) {
				for (const e of a.keys()) t._physics_destroyJoint(e);
				a.clear();
				for (const e of s) t._physics_setOneWayPlatform(e, 0, 0, 0);
				s.clear();
				for (const e of i) M(e);
			}
		}
		if (O) {
			A.ensureTransformsComposed();
			const e = g?.entities ?? A.getEntitiesWithComponents([w, p]);
			const o = /* @__PURE__ */ new Set();
			for (const a of e) {
				if (g && (!A.valid(a) || !A.has(a, w) || !A.has(a, p) || !A.isEntityActive(a))) continue;
				o.add(a);
				const e = A.get(a, w);
				if (!i.has(a)) {
					if (!e.enabled) continue;
					const o = A.get(a, p);
					const s = A.has(a, n);
					const d = s ? o.worldPosition.x : o.position.x;
					const f = s ? o.worldPosition.y : o.position.y;
					const h = s ? o.worldRotation : o.rotation;
					t._physics_createBody(a, e.bodyType, d * u, f * u, I(h), e.gravityScale, e.linearDamping, e.angularDamping, e.fixedRotation ? 1 : 0, e.bullet ? 1 : 0);
					W(A, t, a, r.collisionLayerMasks);
					i.add(a);
					if (s && e.bodyType !== 0) c.add(a);
					l.set(a, {
						bodyType: e.bodyType,
						gravityScale: e.gravityScale,
						linearDamping: e.linearDamping,
						angularDamping: e.angularDamping,
						fixedRotation: e.fixedRotation,
						bullet: e.bullet,
						enabled: true,
						colliderSig: ye(A, a),
						colliderState: m(be(A, a)),
						syncedTick: A.getWorldTick()
					});
					if (e.bodyType === 1) E.add(a);
					if (e.bodyType === 0) D.set(a, {
						x: d * u,
						y: f * u,
						angle: I(h),
						parent: s ? A.get(a, n).entity : null
					});
					continue;
				}
				const s = l.get(a);
				const d = e.enabled && !s.enabled;
				if (e.enabled !== s.enabled) {
					t._physics_setBodyEnabled(a, e.enabled ? 1 : 0);
					s.enabled = e.enabled;
					if (e.enabled) D.invalidate(a);
				}
				if (s.bodyType !== e.bodyType || s.gravityScale !== e.gravityScale || s.linearDamping !== e.linearDamping || s.angularDamping !== e.angularDamping || s.fixedRotation !== e.fixedRotation || s.bullet !== e.bullet) {
					t._physics_updateBodyProperties(a, e.bodyType, e.gravityScale, e.linearDamping, e.angularDamping, e.fixedRotation ? 1 : 0, e.bullet ? 1 : 0);
					s.bodyType = e.bodyType;
					s.gravityScale = e.gravityScale;
					s.linearDamping = e.linearDamping;
					s.angularDamping = e.angularDamping;
					s.fixedRotation = e.fixedRotation;
					s.bullet = e.bullet;
				}
				const f = ye(A, a);
				if (f !== s.colliderSig || (g ? d || g.full || G.some((e) => g.changed.get(e)?.has(a)) : xe(A, a, s.syncedTick))) {
					const e = be(A, a);
					if (e !== s.colliderState) {
						t._physics_clearShapes(a);
						W(A, t, a, r.collisionLayerMasks);
						h(s.colliderState);
						s.colliderState = m(e);
					}
					s.colliderSig = f;
				}
				if (s.bodyType === 1) E.add(a);
				else E.delete(a);
				if (s.bodyType === 0) {
					const e = A.has(a, n) ? A.get(a, n).entity : null;
					D.track(a, e);
					c.delete(a);
				} else {
					D.delete(a);
					if (A.has(a, n)) c.add(a);
					else c.delete(a);
				}
				s.syncedTick = A.getWorldTick();
			}
			for (const e of g?.entities ?? i) {
				if (!i.has(e)) continue;
				if (!o.has(e)) {
					if (A.has(e, w) && A.has(e, p)) {
						const n = l.get(e);
						if (n.enabled) {
							t._physics_setBodyEnabled(e, 0);
							n.enabled = false;
						}
						continue;
					}
					M(e);
				}
			}
			for (const [e, n] of a) {
				const r = d || (g ? g.full || K.some((t) => g.changed.get(t)?.has(e)) : x || Se(A, e, v));
				if (!i.has(e) || !t._physics_hasJoint(e) || r && q(A, e, u) !== n || Ce(A, e, i)) {
					t._physics_destroyJoint(e);
					a.delete(e);
				}
			}
			pe(A, t, i, a, u);
			me(A, t, i, s, g?.entities);
			v = A.getWorldTick();
			y = u;
			if (_) b = _;
			k = f;
		}
		D.sync(t, o, g ? g.full || g.refreshPoses : O, (e) => !!l.get(e)?.enabled);
		if (E.size) A.ensureTransformsComposed();
		for (const e of E) {
			if (!l.get(e)?.enabled) continue;
			const n = A.get(e, p);
			t._physics_setBodyTargetTransform(e, n.worldPosition.x * u, n.worldPosition.y * u, I(n.worldRotation), C);
		}
		if (i.size > 0) t._physics_step(C);
		ve(t, o, S);
		t._physics_capturePoses();
		if (g) j.commit(g);
	}, { name: "PhysicsStepSystem" }), {
		runIf: x,
		profileDomain: "physics"
	});
	e.addSystemToSchedule(4, o([_(g)], (n) => {
		e.insertResource(L, {
			collisionEnters: S.collisionEnters,
			collisionExits: S.collisionExits,
			collisionHits: S.collisionHits,
			sensorEnters: S.sensorEnters,
			sensorExits: S.sensorExits
		});
		S.collisionEnters = [];
		S.collisionExits = [];
		S.collisionHits = [];
		S.sensorEnters = [];
		S.sensorExits = [];
		_e(e, H(e), c, t, n.fixedAlpha);
	}, { name: "PhysicsInterpolateSystem" }), {
		runIf: x,
		profileDomain: "physics"
	});
	const P = e.onFrameEnd(() => {
		if (e.isPaused() || !x() || e.getResource(g).scale <= 0) {
			D.pause();
			j.pause();
		}
	});
	return () => {
		P();
		N();
		D.dispose();
		j.dispose();
		d.clear();
		l.clear();
		a.clear();
	};
}
//#endregion
//#region src/physics/PlatformerController2D.ts
/**
* @file    PlatformerController2D.ts
* @brief   What a side-on character wants: run, jump, drop through. CharacterController2D is what the world makes of it.
*
* @details The forgiveness a platformer is judged on lives here, and on its own clock. A jump pressed a moment before landing still
*          happens, and one pressed a moment after running off a ledge does too. Input is read per rendered frame and latched, so a tap
*          between two fixed steps is not lost, and consumed on the fixed step, where the character actually moves.
*/
/**
* Runs and jumps a CharacterController2D, with the forgiveness a platformer needs.
*
* @experimental
*/
const J = e("PlatformerController2D", {
	moveSpeed: 260,
	groundAcceleration: 2400,
	airAcceleration: 1500,
	groundDeceleration: 3e3,
	airDeceleration: 900,
	gravity: 1600,
	fallGravityScale: 1.25,
	maxFallSpeed: 1e3,
	jumpSpeed: 620,
	jumpCut: .5,
	coyoteTime: .1,
	jumpBuffer: .12,
	airJumps: 0,
	dropTime: .2,
	keepPlatformVelocity: true,
	readKeyboard: true,
	moveInput: 0,
	jumpHeld: false,
	jumpPressed: false,
	dropPressed: false,
	enabled: true
}, { fields: {
	moveSpeed: {
		min: 0,
		unit: "px/s"
	},
	groundAcceleration: {
		min: 0,
		unit: "px/s²",
		advanced: true
	},
	airAcceleration: {
		min: 0,
		unit: "px/s²",
		advanced: true
	},
	groundDeceleration: {
		min: 0,
		unit: "px/s²",
		advanced: true
	},
	airDeceleration: {
		min: 0,
		unit: "px/s²",
		advanced: true
	},
	gravity: {
		min: 0,
		unit: "px/s²"
	},
	fallGravityScale: {
		min: 0,
		step: .05,
		advanced: true,
		tooltip: "Gravity multiplier while falling. Above 1 lands faster than it rose."
	},
	maxFallSpeed: {
		min: 0,
		unit: "px/s",
		advanced: true
	},
	jumpSpeed: {
		min: 0,
		unit: "px/s",
		tooltip: "Upward speed a jump starts with. 0 = cannot jump."
	},
	jumpCut: {
		min: 0,
		max: 1,
		step: .05,
		tooltip: "How much of a rising speed survives letting go of jump. 1 makes every jump full height."
	},
	coyoteTime: {
		min: 0,
		step: .01,
		unit: "s",
		tooltip: "After leaving the ground, how long a jump still counts as from the ground."
	},
	jumpBuffer: {
		min: 0,
		step: .01,
		unit: "s",
		tooltip: "How long a jump pressed too early is remembered, to happen on landing."
	},
	airJumps: {
		min: 0,
		step: 1,
		tooltip: "Extra jumps before landing again."
	},
	dropTime: {
		min: 0,
		step: .01,
		unit: "s",
		tooltip: "How long a drop through a one-way platform lasts."
	},
	readKeyboard: { tooltip: "Move with A/D or the arrows, jump with Space, W or Up, drop with Down or S and jump. Off, a game writes the inputs itself." },
	moveInput: {
		min: -1,
		max: 1,
		step: .1,
		advanced: true
	},
	jumpHeld: { advanced: true },
	jumpPressed: { advanced: true },
	dropPressed: { advanced: true }
} });
function Te(e = 0) {
	return {
		coyote: 0,
		buffered: 0,
		dropping: 0,
		airJumpsLeft: e,
		jumping: false
	};
}
const Ee = (e, t, n) => e < t ? Math.min(t, e + n) : Math.max(t, e - n);
/**
* One fixed step of what the character wants, from its last velocity. Pure: every rule a player feels is here, and none of it needs a world.
* Velocities are along the world's right and up. It updates `state`, and consumes nothing of `config`.
* @internal
*/
function De(e, t, n, r, i, a, o, s) {
	const c = Math.max(-1, Math.min(1, e.moveInput)) * e.moveSpeed;
	const l = c !== 0 && (r === 0 || Math.sign(c) === Math.sign(r));
	const u = n.onFloor ? l ? e.groundAcceleration : e.groundDeceleration : l ? e.airAcceleration : e.airDeceleration;
	let d = Ee(r, c, u * s);
	let f = i;
	t.coyote = Math.max(0, t.coyote - s);
	t.buffered = Math.max(0, t.buffered - s);
	t.dropping = Math.max(0, t.dropping - s);
	if (n.onFloor && f <= 0) {
		t.coyote = e.coyoteTime;
		t.airJumpsLeft = e.airJumps;
		t.jumping = false;
	}
	if (a) t.buffered = Math.max(e.jumpBuffer, s);
	if (o && n.onFloor) {
		t.dropping = e.dropTime;
		t.buffered = 0;
	}
	let p = false;
	if (t.buffered > 0 && e.jumpSpeed > 0 && t.dropping <= 0) {
		const r = t.coyote > 0;
		if (r || t.airJumpsLeft > 0) {
			if (!r) t.airJumpsLeft--;
			f = e.jumpSpeed;
			if (r && e.keepPlatformVelocity) {
				d += n.floorVelocityX;
				if (n.floorVelocityY > 0) f += n.floorVelocityY;
			}
			t.coyote = 0;
			t.buffered = 0;
			t.jumping = true;
			p = true;
		}
	}
	if (!p) {
		if (t.jumping && f > 0 && !e.jumpHeld) {
			f *= e.jumpCut;
			t.jumping = false;
		}
		if (n.onCeiling && f > 0) f = 0;
		const r = e.gravity * (f < 0 ? e.fallGravityScale : 1);
		f = Math.max(-e.maxFallSpeed, f - r * s);
	}
	return {
		velocityX: d,
		velocityY: f,
		dropThrough: t.dropping > 0,
		jumped: p
	};
}
//#endregion
//#region src/physics/CharacterController2D.ts
/** How a character meets dynamic bodies. @experimental */
const Y = {
	/** They stop it, and stay where they are. */
	Block: 0,
	/** They stop it, and it pushes them with up to `pushForce`. */
	Push: 1,
	/** It passes through. */
	Ignore: 2
};
/**
* A kinematic mover for a player or an NPC: it sweeps rather than being pushed,
* so it never tunnels and never inherits a rigid body's momentum.
*
* @beta
*/
const X = e("CharacterController2D", {
	velocity: {
		x: 0,
		y: 0
	},
	up: {
		x: 0,
		y: 1
	},
	floorMaxAngle: .785398,
	maxSlides: 4,
	skinWidth: 1,
	snapLength: 0,
	slideOnCeiling: true,
	maskBits: 65535,
	stepHeight: 0,
	stopOnSlope: true,
	constantSlopeSpeed: false,
	blockSteepSlopes: true,
	followPlatform: true,
	dynamicBodies: Y.Block,
	pushForce: 40,
	dropThrough: false,
	isOnFloor: false,
	isOnWall: false,
	isOnCeiling: false,
	floorNormal: {
		x: 0,
		y: 0
	},
	realVelocity: {
		x: 0,
		y: 0
	},
	floorEntity: 0,
	floorVelocity: {
		x: 0,
		y: 0
	}
}, {
	entityFields: ["floorEntity"],
	fields: {
		stepHeight: {
			min: 0,
			step: 1,
			unit: "px",
			tooltip: "The highest ledge it walks up without jumping; 0 = only what its rounded foot rides over"
		},
		stopOnSlope: { tooltip: "Stand still on a walkable slope, and walk it without gravity slowing or speeding it" },
		constantSlopeSpeed: {
			advanced: true,
			tooltip: "Keep the speed asked for along a slope, rather than the speed across the ground"
		},
		blockSteepSlopes: { tooltip: "A slope past the walkable angle is a wall to walk into. Off, it walks straight up" },
		followPlatform: { tooltip: "Move with what it stands on" },
		dynamicBodies: {
			enum: [
				{
					label: "Block",
					value: Y.Block
				},
				{
					label: "Push",
					value: Y.Push
				},
				{
					label: "Ignore",
					value: Y.Ignore
				}
			],
			tooltip: "How it meets dynamic bodies"
		},
		pushForce: {
			min: 0,
			unit: "N",
			shownWhen: {
				field: "dynamicBodies",
				values: [Y.Push]
			},
			tooltip: "The most force it pushes with"
		},
		dropThrough: {
			advanced: true,
			tooltip: "Pass through one-way platforms while on"
		},
		floorEntity: { advanced: true },
		floorVelocity: { advanced: true },
		floorMaxAngle: {
			min: 0,
			max: 1.5708,
			step: .01,
			unit: "rad",
			tooltip: "Max walkable slope from up (radians)"
		},
		maxSlides: {
			min: 1,
			max: 8,
			step: 1,
			advanced: true
		},
		skinWidth: {
			min: 0,
			step: .25,
			unit: "px",
			advanced: true
		},
		snapLength: {
			min: 0,
			step: .5,
			unit: "px",
			tooltip: "Floor-snap probe length; 0 disables stair/slope stick"
		},
		slideOnCeiling: { advanced: true },
		up: { advanced: true },
		maskBits: {
			bitmask: {
				bits: 16,
				source: "collisionLayers"
			},
			advanced: true
		},
		isOnFloor: { advanced: true },
		isOnWall: { advanced: true },
		isOnCeiling: { advanced: true },
		floorNormal: { advanced: true },
		realVelocity: { advanced: true }
	}
});
const Oe = 1e-6;
/**
* Resolve one move: advance toward the first contact, classify the surface, then
* project the leftover motion (and velocity) onto it and repeat. Velocity is slid
* by the same projections so a grounded body's downward gravity doesn't accumulate
* — the contract matches Godot's `move_and_slide`.
*/
function ke(e, t) {
	let n = e.startX, r = e.startY;
	let i = e.motionX, a = e.motionY;
	let o = e.velX, s = e.velY;
	let c = false, l = false, u = false;
	let d = 0, f = 0;
	const p = Math.hypot(e.upX, e.upY) || 1;
	const m = e.upX / p, h = e.upY / p;
	const g = Math.cos(e.floorMaxAngle);
	for (let p = 0; p < e.maxSlides; p++) {
		const p = Math.hypot(i, a);
		if (p < Oe) break;
		const _ = t(n, r, i, a);
		if (!_) {
			n += i;
			r += a;
			break;
		}
		const v = _.fraction < 0 ? 0 : _.fraction > 1 ? 1 : _.fraction;
		const y = Math.max(0, v * p - e.skinWidth);
		n += i / p * y;
		r += a / p * y;
		const b = Math.hypot(_.nx, _.ny) || 1;
		const x = _.nx / b, S = _.ny / b;
		const C = x * m + S * h;
		if (C >= g) {
			c = true;
			d = x;
			f = S;
		} else if (C <= -g) u = true;
		else l = true;
		const w = i * (1 - v);
		const T = a * (1 - v);
		const E = w * x + T * S;
		i = w - x * E;
		a = T - S * E;
		const D = o * x + s * S;
		o -= x * D;
		s -= S * D;
		if (u && !e.slideOnCeiling) break;
	}
	if (e.snapLength > 0 && e.wasOnFloor && !c) {
		if (o * m + s * h <= Oe) {
			const i = -m * e.snapLength, a = -h * e.snapLength;
			const o = t(n, r, i, a);
			if (o) {
				const t = Math.hypot(o.nx, o.ny) || 1;
				const s = o.nx / t, l = o.ny / t;
				if (s * m + l * h >= g) {
					const t = Math.hypot(i, a);
					const u = o.fraction < 0 ? 0 : o.fraction > 1 ? 1 : o.fraction;
					const p = Math.max(0, u * t - e.skinWidth);
					n += i / t * p;
					r += a / t * p;
					c = true;
					d = s;
					f = l;
				}
			}
		}
	}
	return {
		x: n,
		y: r,
		velX: o,
		velY: s,
		isOnFloor: c,
		isOnWall: l,
		isOnCeiling: u,
		floorNormalX: d,
		floorNormalY: f
	};
}
//#endregion
//#region src/physics/CharacterController2DSystem.ts
const Z = /* @__PURE__ */ new WeakMap();
function Ae(e, t, n) {
	let r = Z.get(e);
	if (!r) {
		r = /* @__PURE__ */ new Map();
		Z.set(e, r);
	}
	let i = r.get(t);
	if (!i) {
		i = Te(n);
		r.set(t, i);
	}
	return i;
}
/** Input per rendered frame, so a tap between two fixed steps is not lost; the character's wishes per fixed step, ahead of its move. */
function je(e) {
	e.world.onDespawn((t) => {
		Z.get(e.world)?.delete(t);
	});
	e.addSystemToSchedule(3, o([l(t(J)), _(oe)], (e, t) => {
		for (const [, n] of e) {
			if (!n.enabled || !n.readKeyboard) continue;
			const e = t.isKeyDown("KeyD") || t.isKeyDown("ArrowRight");
			const r = t.isKeyDown("KeyA") || t.isKeyDown("ArrowLeft");
			n.moveInput = (e ? 1 : 0) - (r ? 1 : 0);
			n.jumpHeld = t.isKeyDown("Space") || t.isKeyDown("KeyW") || t.isKeyDown("ArrowUp");
			const i = t.isKeyPressed("Space") || t.isKeyPressed("KeyW") || t.isKeyPressed("ArrowUp");
			const a = t.isKeyDown("KeyS") || t.isKeyDown("ArrowDown");
			if (i && a) n.dropPressed = true;
			else if (i) n.jumpPressed = true;
		}
	}, { name: "PlatformerController2DInputSystem" }), { runIf: x });
	e.addSystemToSchedule(11, o([
		l(t(J), t(X)),
		_(g),
		m()
	], (e, t, n) => {
		const r = t.fixedDelta;
		if (r <= 0) return;
		for (const [t, i, a] of e) {
			if (!i.enabled) continue;
			const e = a.up.y, o = -a.up.x;
			const s = De(i, Ae(n, t, i.airJumps), {
				onFloor: a.isOnFloor,
				onCeiling: a.isOnCeiling,
				floorVelocityX: a.floorVelocity.x * e + a.floorVelocity.y * o,
				floorVelocityY: a.floorVelocity.x * a.up.x + a.floorVelocity.y * a.up.y
			}, a.velocity.x * e + a.velocity.y * o, a.velocity.x * a.up.x + a.velocity.y * a.up.y, i.jumpPressed, i.dropPressed, r);
			i.jumpPressed = false;
			i.dropPressed = false;
			a.velocity.x = e * s.velocityX + a.up.x * s.velocityY;
			a.velocity.y = o * s.velocityX + a.up.y * s.velocityY;
			a.dropThrough = s.dropThrough;
			if (s.jumped) a.isOnFloor = false;
		}
	}, {
		name: "PlatformerController2DSystem",
		runBefore: ["CharacterController2DSystem"],
		touches: {
			reads: [],
			writes: []
		}
	}), { runIf: x });
}
/** Read the entity's collider into a pixel-space cast shape, or null if it has no
*  enabled one — a disabled collider is no collider, here as everywhere. */
function Me(e, t, n) {
	const r = E(e, t, F);
	if (r) return {
		kind: "box",
		hx: r.halfExtents.x * n,
		hy: r.halfExtents.y * n,
		ox: r.offset.x * n,
		oy: r.offset.y * n
	};
	const i = E(e, t, D);
	if (i) return {
		kind: "circle",
		r: i.radius * n,
		ox: i.offset.x * n,
		oy: i.offset.y * n
	};
	const a = E(e, t, A);
	if (a) return {
		kind: "capsule",
		r: a.radius * n,
		halfH: a.halfHeight * n,
		ox: a.offset.x * n,
		oy: a.offset.y * n
	};
	return null;
}
function Ne(e) {
	if (e.kind === "circle") return {
		c1: {
			x: e.ox,
			y: e.oy
		},
		c2: {
			x: e.ox,
			y: e.oy
		},
		radius: e.r
	};
	if (e.kind === "capsule") return {
		c1: {
			x: e.ox,
			y: e.oy + e.halfH
		},
		c2: {
			x: e.ox,
			y: e.oy - e.halfH
		},
		radius: e.r
	};
	if (e.hy >= e.hx) {
		const t = e.hy - e.hx;
		return {
			c1: {
				x: e.ox,
				y: e.oy + t
			},
			c2: {
				x: e.ox,
				y: e.oy - t
			},
			radius: e.hx
		};
	}
	const t = e.hx - e.hy;
	return {
		c1: {
			x: e.ox + t,
			y: e.oy
		},
		c2: {
			x: e.ox - t,
			y: e.oy
		},
		radius: e.hy
	};
}
function Pe(e) {
	return Number.isFinite(e.dx) && Number.isFinite(e.dy) && Number.isFinite(e.velX) && Number.isFinite(e.velY);
}
const Fe = {
	x: 0,
	y: 0
};
/**
* How fast what it stands on carries it, pixels per second. A body's velocity is what it moved by in the step before this one, whoever
* moved it, which is exactly how far it has gone from under the character since the last move.
*/
function Ie(e, t, n, r) {
	if (!n.followPlatform || !n.isOnFloor || !n.floorEntity || !t.valid(n.floorEntity)) return Fe;
	const i = e.getLinearVelocity(n.floorEntity);
	const a = e.getAngularVelocity(n.floorEntity);
	if (i.x === 0 && i.y === 0 && a === 0) return Fe;
	return {
		x: i.x * r,
		y: i.y * r
	};
}
/** Along a walkable slope, not into it: what keeps a character from sliding down one and from launching off its top. */
function Le(e) {
	if (!e.stopOnSlope || !e.isOnFloor) return e.velocity;
	if (e.velocity.x * e.up.x + e.velocity.y * e.up.y > 0) return e.velocity;
	const t = e.floorNormal.x * e.up.x + e.floorNormal.y * e.up.y;
	if (t >= .9999 || t <= 0) return e.velocity;
	const n = e.up.y, r = -e.up.x;
	const i = e.velocity.x * n + e.velocity.y * r;
	const a = n * e.floorNormal.x + r * e.floorNormal.y;
	let o = n - a * e.floorNormal.x, s = r - a * e.floorNormal.y;
	const c = e.constantSlopeSpeed ? 1 / (Math.hypot(o, s) || 1) : 1 / (o * n + s * r || 1);
	o *= c;
	s *= c;
	return {
		x: o * i,
		y: s * i
	};
}
/** What a slope walk leaves it with: the speed it asked for across the ground, unless something stopped it. */
function Re(e, t) {
	const n = e.up.y, r = -e.up.x;
	const i = e.velocity.x * n + e.velocity.y * r;
	const a = t.isOnWall ? t.velX * n + t.velY * r : i;
	return {
		x: n * a,
		y: r * a
	};
}
/** Lean into what it pressed against, up to its force, and only as far as the body is not already getting away. */
function ze(e, t, n, r) {
	for (const i of t) {
		const t = -(n.velocity.x * i.normalX + n.velocity.y * i.normalY);
		if (i.normalX * n.up.x + i.normalY * n.up.y > .5) continue;
		const a = Math.abs(n.velocity.x) + Math.abs(n.velocity.y);
		const o = Math.max(t, a * Math.abs(i.normalX * n.up.y - i.normalY * n.up.x));
		if (o <= 0) continue;
		const s = e.getLinearVelocity(i.entity);
		if (-(s.x * i.normalX + s.y * i.normalY) * r >= o) continue;
		e.applyForce(i.entity, {
			x: -i.normalX * n.pushForce,
			y: -i.normalY * n.pushForce
		});
	}
}
/** A world displacement in the parent's own space, which is what a local position is measured in. */
function Be(e, t, r, i) {
	const a = e.get(t, n).entity;
	if (!e.valid(a) || !e.has(a, p)) return {
		x: r,
		y: i
	};
	const o = e.get(a, p);
	const s = 2 * Math.atan2(o.worldRotation.z, o.worldRotation.w), c = Math.cos(s), l = Math.sin(s);
	return {
		x: (c * r + l * i) / (o.worldScale.x || 1),
		y: (-l * r + c * i) / (o.worldScale.y || 1)
	};
}
let Q = false;
function Ve(e, t, n) {
	if (Q) return;
	Q = true;
	v.error("physics", `CharacterController2D move on entity ${e} resolved to a non-finite pose (ppu=${t}, dt=${n}); the Transform was left where it was. Check the entity's collider, velocity and the Canvas pixelsPerUnit.`);
}
/**
* Register the character-controller system. Runs in FixedUpdate ahead of the
* physics step, so the resolved Transform is what reaches a kinematic body.
* Movement goes through Box2D's kinematic mover, which — unlike a generic shape
* cast — rests a character on the ground instead of wedging it there.
*/
function He(e) {
	Q = false;
	je(e);
	e.addSystemToSchedule(11, o([
		l(t(X)),
		_(g),
		_(R),
		m()
	], (t, r, i, a) => {
		const o = r.fixedDelta;
		if (o <= 0) return;
		i.setPixelsPerUnit(H(e));
		const s = i.getPixelsPerUnit();
		const c = 1 / o;
		for (const [e, r] of t) {
			const t = Me(a, e, s);
			if (!t) continue;
			const l = Ne(t);
			const u = Ie(i, a, r, s);
			const d = Le(r);
			const f = a.has(e, n);
			if (f) a.ensureTransformsComposed();
			const m = a.get(e, p);
			const h = f ? m.worldPosition : m.position;
			const g = i.moveCharacter(h, l.c1, l.c2, l.radius, d, o, r.up, Math.cos(r.floorMaxAngle), r.maskBits, e, r.skinWidth, r.maxSlides, r.snapLength, r.slideOnCeiling, s, {
				carry: u,
				dropThrough: r.dropThrough,
				ignoreDynamic: r.dynamicBodies === Y.Ignore,
				blockSteepSlopes: r.blockSteepSlopes,
				wasOnFloor: r.isOnFloor,
				stepHeight: r.stepHeight
			});
			if (!g) continue;
			if (!Pe(g)) {
				Ve(e, s, o);
				continue;
			}
			const _ = f ? Be(a, e, g.dx, g.dy) : {
				x: g.dx,
				y: g.dy
			};
			m.position.x += _.x;
			m.position.y += _.y;
			m.worldPosition.x = h.x + g.dx;
			m.worldPosition.y = h.y + g.dy;
			a.set(e, p, m);
			const v = d === r.velocity ? null : Re(r, g);
			r.velocity.x = v ? v.x : g.velX;
			r.velocity.y = v ? v.y : g.velY;
			if (g.hits && r.dynamicBodies === Y.Push) ze(i, g.hits, r, s);
			r.floorEntity = g.floorEntity ?? 0;
			r.floorVelocity.x = u.x;
			r.floorVelocity.y = u.y;
			r.isOnFloor = g.isOnFloor;
			r.isOnWall = g.isOnWall;
			r.isOnCeiling = g.isOnCeiling;
			r.floorNormal.x = g.floorNormalX;
			r.floorNormal.y = g.floorNormalY;
			r.realVelocity.x = g.dx * c;
			r.realVelocity.y = g.dy * c;
		}
	}, {
		name: "CharacterController2DSystem",
		runBefore: ["PhysicsStepSystem"],
		touches: {
			reads: [
				F._name,
				D._name,
				A._name,
				n._name
			],
			writes: [p._name]
		}
	}), {
		runIf: x,
		profileDomain: "physics"
	});
}
//#endregion
//#region src/physics/PhysicsEventBridge.ts
/**
* The event types the physics bridge emits. Open strings, like every other
* producer's — these constants exist so the editor's palette and game code spell
* them the same way (mirrors `UIEventType`).
*/
const $ = {
	CollisionEnter: "collision_enter",
	CollisionExit: "collision_exit",
	CollisionHit: "collision_hit",
	TriggerEnter: "trigger_enter",
	TriggerExit: "trigger_exit"
};
/**
* Republish this frame's physics batch onto the entity event channel. Runs in
* Update (after the fixed-step physics has filled the resource) and only in play
* mode — the edit realm never steps the world.
*/
function Ue(e) {
	const t = se(e);
	const n = e.world;
	const r = (e, r, i, a) => {
		if (n.valid(e)) t.emit(e, i, {
			other: r,
			...a
		});
		if (n.valid(r)) t.emit(r, i, {
			other: e,
			...a
		});
	};
	e.addSystemToSchedule(3, o([_(L)], (e) => {
		for (const t of e.collisionEnters) r(t.entityA, t.entityB, $.CollisionEnter);
		for (const t of e.collisionExits) r(t.entityA, t.entityB, $.CollisionExit);
		for (const t of e.collisionHits) r(t.entityA, t.entityB, $.CollisionHit, { approachSpeed: t.approachSpeed });
		for (const r of e.sensorEnters) {
			if (n.valid(r.sensorEntity)) t.emit(r.sensorEntity, $.TriggerEnter, {
				other: r.visitorEntity,
				isSensor: true
			});
			if (n.valid(r.visitorEntity)) t.emit(r.visitorEntity, $.TriggerEnter, {
				other: r.sensorEntity,
				isSensor: false
			});
		}
		for (const r of e.sensorExits) {
			if (n.valid(r.sensorEntity)) t.emit(r.sensorEntity, $.TriggerExit, {
				other: r.visitorEntity,
				isSensor: true
			});
			if (n.valid(r.visitorEntity)) t.emit(r.visitorEntity, $.TriggerExit, {
				other: r.sensorEntity,
				isSensor: false
			});
		}
	}, { name: "PhysicsEventBridgeSystem" }), {
		runIf: x,
		profileDomain: "physics"
	});
}
//#endregion
//#region src/physics/Physics2DPlugin.ts
function We(e) {
	return {
		gravity: e.gravity ?? {
			x: 0,
			y: -9.81
		},
		fixedTimestep: e.fixedTimestep ?? 1 / 30,
		subStepCount: e.subStepCount ?? 4,
		contactHertz: e.contactHertz ?? 30,
		contactDampingRatio: e.contactDampingRatio ?? 10,
		contactSpeed: e.contactSpeed ?? 3,
		collisionLayerMasks: e.collisionLayerMasks,
		enableSleep: e.enableSleep ?? true,
		enableContinuous: e.enableContinuous ?? true,
		restitutionThreshold: e.restitutionThreshold ?? 0,
		maxLinearSpeed: e.maxLinearSpeed ?? 0
	};
}
/**
* What the frame loop calls every step. A module missing any of it is a wasm
* built before the JS that drives it.
*
* `PhysicsWasmModule` is a TypeScript interface, so it is gone at run time and
* nothing was checking that the binary answered to it. A `physics.wasm` built
* hours before the commit that added pose interpolation therefore installed
* happily, and `PhysicsStepSystem` and `PhysicsInterpolateSystem` then threw
* `_physics_capturePoses is not a function` TWICE A FRAME, for the length of
* the session, at anyone who dropped a RigidBody2D into a scene and pressed Play.
* Two dogfood runs read that as "physics is broken" and turned it off.
*
* Not the whole interface — the per-frame contract, whose absence is the one
* that fails on every tick rather than once.
*/
const Ge = [
	"_physics_init",
	"_physics_setWorldConfig",
	"_physics_step",
	"_physics_capturePoses",
	"_physics_getInterpolatedCount",
	"_physics_getInterpolatedTransforms",
	"_physics_collectEvents",
	"_physics_getDynamicBodyCount",
	"_physics_getDynamicBodyTransforms",
	"_physics_setBodyTransform",
	"_physics_setOneWayPlatformLocal"
];
function Ke(e) {
	const t = Ge.filter((t) => typeof e[t] !== "function");
	if (t.length === 0) return;
	throw new Error(`physics.wasm is out of date — it does not export ${t.join(", ")}. It was built before the engine code that calls it; rebuild the physics module (the WASM build is a separate step from the editor build). Physics is not installed.`);
}
var qe = class {
	constructor(e, t = {}, n) {
		this.name = "physics";
		this.instances_ = /* @__PURE__ */ new WeakMap();
		this.latestInstance_ = null;
		this.wasmUrl_ = e;
		this.factory_ = n;
		this.config_ = We(t);
	}
	build(e) {
		this.cleanup(e);
		const t = {
			module: null,
			initPromise: null
		};
		const n = {
			released: false,
			module: null,
			runtime: t,
			disposeSystems: null
		};
		this.instances_.set(e, n);
		this.latestInstance_ = n;
		const r = new ce();
		e.insertResource(L, {
			collisionEnters: [],
			collisionExits: [],
			collisionHits: [],
			sensorEnters: [],
			sensorExits: []
		});
		e.insertResource(z, t);
		e.subsystems.transition("physics", "initializing");
		const i = V(this.wasmUrl_, this.factory_).then((t) => {
			if (n.released) return;
			t.onAbort = () => e.subsystems.markError("physics", "Box2D wasm module aborted");
			Ke(t);
			r.connect(t);
			const i = r.module;
			n.module = i;
			i._physics_init(this.config_.gravity.x, this.config_.gravity.y, this.config_.fixedTimestep, this.config_.subStepCount, this.config_.contactHertz, this.config_.contactDampingRatio, this.config_.contactSpeed);
			i._physics_setWorldConfig(this.config_.enableSleep ? 1 : 0, this.config_.enableContinuous ? 1 : 0, this.config_.restitutionThreshold, this.config_.maxLinearSpeed);
			n.disposeSystems = we(e, i, this.config_);
			e.getResource(z).module = i;
			e.insertResource(R, re._fromModule(i));
			He(e);
			Ue(e);
			ie(e, R, L);
			e.setFixedTimestep(this.config_.fixedTimestep);
			e.subsystems.transition("physics", "ready");
		});
		i.catch((t) => {
			if (n.released) return;
			e.subsystems.markError("physics", t instanceof Error ? t.message : String(t));
			a(t, "Physics2DPlugin.init");
		});
		e.getResource(z).initPromise = i;
	}
	/**
	* Shut the native Box2D world down on app teardown. Without this,
	* `_physics_shutdown` was dead code and the C++ physics world (bodies,
	* joints, contact state) leaked across an engine re-init. The bridge-guarded
	* module makes the call abort-safe; null after so a double cleanup is a no-op.
	*/
	cleanup(e) {
		const t = e ? this.instances_.get(e) : this.latestInstance_;
		if (!t || t.released) return;
		t.released = true;
		if (e) this.instances_.delete(e);
		if (t === this.latestInstance_) this.latestInstance_ = null;
		const n = t.module;
		t.module = null;
		t.runtime.module = null;
		t.disposeSystems?.();
		t.disposeSystems = null;
		n?._physics_shutdown();
	}
};
function Je(e, t = {}, n) {
	return new qe(e, t, n);
}
//#endregion
export { He as a, ke as c, Ue as i, J as l, Je as n, X as o, $ as r, Y as s, qe as t, V as u };

//# sourceMappingURL=Physics2DPlugin.js.map