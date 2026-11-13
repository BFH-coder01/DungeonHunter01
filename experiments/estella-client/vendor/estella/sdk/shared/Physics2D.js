import { ft as e, qt as t, xn as n } from "./system.js";
import { s as r } from "./resource.js";
import { i, l as a } from "./customDraw.js";
import { d as o } from "./PhysicsComponents.js";
import { a as s, i as c, r as l } from "./ColliderShape2D.js";
import { t as u } from "./Physics2DRuntime.js";
//#region src/physics/Physics2DDebugDraw.ts
const d = r({
	enabled: false,
	showColliders: true,
	showVelocity: false,
	showContacts: false
}, "Physics2DDebugDraw");
const f = {
	r: .2,
	g: .4,
	b: 1,
	a: .7
};
const p = {
	r: .2,
	g: 1,
	b: .2,
	a: .7
};
const m = {
	r: .2,
	g: 1,
	b: 1,
	a: .7
};
const h = {
	r: 1,
	g: 1,
	b: .2,
	a: .5
};
const g = {
	r: 1,
	g: .2,
	b: .2,
	a: .8
};
const _ = {
	r: 1,
	g: .2,
	b: .2,
	a: 1
};
/** The outline the solver declined — drawn faintly, in the colour of a mistake. */
const v = {
	r: 1,
	g: .35,
	b: .1,
	a: .45
};
const y = 1.5;
const b = 3;
const x = .5;
const S = 32;
function C(e) {
	return Math.atan2(2 * (e.w * e.z + e.x * e.y), 1 - 2 * (e.y * e.y + e.z * e.z));
}
function w(e) {
	switch (e) {
		case 0: return f;
		case 1: return m;
		case 2: return p;
		default: return p;
	}
}
function T(t) {
	const n = t.world.getEntitiesWithComponents([e]);
	for (const r of n) {
		const n = t.world.get(r, e);
		if (n && n.pixelsPerUnit) return n.pixelsPerUnit;
	}
	return 100;
}
function E(e, t, n, r) {
	const i = e + n * x;
	const o = t + r * x;
	a.line({
		x: e,
		y: t
	}, {
		x: i,
		y: o
	}, g, y);
	const s = Math.sqrt(n * n + r * r);
	if (s < 1) return;
	const c = 6;
	const l = Math.PI / 6;
	const u = n / s;
	const d = r / s;
	const f = i - c * (u * Math.cos(l) - d * Math.sin(l));
	const p = o - c * (u * Math.sin(l) + d * Math.cos(l));
	const m = i - c * (u * Math.cos(l) + d * Math.sin(l));
	const h = o - c * (-u * Math.sin(l) + d * Math.cos(l));
	a.line({
		x: i,
		y: o
	}, {
		x: f,
		y: p
	}, g, y);
	a.line({
		x: i,
		y: o
	}, {
		x: m,
		y: h
	}, g, y);
}
function D(e, n, r) {
	const i = e.getResource(d);
	if (!i || !i.enabled) return;
	const u = T(e);
	const f = e.world.getEntitiesWithComponents([o, t]);
	let p = null;
	if (i.showVelocity && e.hasResource(n)) p = e.getResource(n);
	for (const n of f) {
		const r = e.world.get(n, o);
		if (!r.enabled) continue;
		const d = e.world.get(n, t);
		const f = d.worldPosition.x;
		const m = d.worldPosition.y;
		const g = C(d.worldRotation);
		if (i.showColliders) for (const { shape: t, isSensor: i, enabled: o } of c(e.world, n)) {
			if (!o) continue;
			const e = i ? h : w(r.bodyType);
			const n = s(t, {
				x: f,
				y: m
			}, g, u);
			const c = l(t, n, g, u);
			for (const t of c.polylines) for (let n = 0; n + 1 < t.length; n++) a.line(t[n], t[n + 1], e, y);
			for (const t of c.circles) a.circleOutline(t.c, t.r, e, y, S);
			for (const e of c.declined ?? []) for (let t = 0; t + 1 < e.length; t++) a.line(e[t], e[t + 1], v, y);
		}
		if (i.showVelocity && p && r.bodyType === 2) {
			const e = p.getLinearVelocity(n);
			E(f, m, e.x * u, e.y * u);
		}
	}
	if (i.showContacts && e.hasResource(r)) {
		const t = e.getResource(r);
		for (const e of t.collisionEnters) a.circle({
			x: e.contactX,
			y: e.contactY
		}, b, _, true, S);
	}
}
function O(e, t, n) {
	e.insertResource(d, {
		enabled: false,
		showColliders: true,
		showVelocity: false,
		showContacts: false
	});
	i("physics-debug-draw", () => {
		D(e, t, n);
	});
}
//#endregion
//#region src/physics/PhysicsTypes.ts
/**
* This step's collision and trigger events, as a resource. Drained per fixed
* step, so a system reading it must run inside one — a read from `Update` sees
* whatever the last step left.
*
* @beta
*/
const k = r({
	collisionEnters: [],
	collisionExits: [],
	collisionHits: [],
	sensorEnters: [],
	sensorExits: []
}, "Physics2DEvents");
function A(e) {
	return Math.atan2(2 * (e.w * e.z + e.x * e.y), 1 - 2 * (e.y * e.y + e.z * e.z));
}
//#endregion
//#region src/physics/Physics2D.ts
/** World pixels per Box2D meter, until a Canvas says otherwise. */
const j = 100;
/**
* Unit contract: Box2D simulates in meters; the engine converts at the
* pixels-per-unit (PPU) boundary. Spatial *queries* (`raycast` / `shapeCast` /
* `overlapCircle` / `moveCharacter`) take and return **world pixels**, scaled by
* the live PPU. Everything that talks to the solver directly — forces, impulses,
* velocities, `setGravity` — is in **meters** (m/s, m/s²), matching the collider
* component dimensions. Convert with {@link getPixelsPerUnit} when mixing the two.
*/
var M = class e {
	/**
	* Starting state for both construction paths. `_fromModule` uses `Object.create`,
	* which runs no field initializer — a default declared as `ppu_ = 100` would be
	* `undefined` there.
	*/
	init_(e) {
		this.module_ = e;
		this.ppu_ = j;
	}
	/** @internal Update the pixels-per-unit used to scale queries by default. */
	setPixelsPerUnit(e) {
		if (Number.isFinite(e) && e > 0) this.ppu_ = e;
	}
	/**
	* Live pixels-per-unit (world pixels per Box2D meter). Collider dimensions are
	* stored in meters, so consumers that cast a collider's shape through the
	* pixel-space query API (raycast/shapeCast) must scale by this.
	*/
	getPixelsPerUnit() {
		return this.ppu_;
	}
	constructor(e) {
		const t = e.hasResource(u) ? e.getResource(u).module : null;
		if (!t) throw new Error("Physics module not loaded. Ensure Physics2DPlugin init is complete.");
		this.init_(t);
	}
	/** @internal */
	static _fromModule(t) {
		const n = Object.create(e.prototype);
		n.init_(t);
		return n;
	}
	applyForce(e, t) {
		this.module_._physics_applyForce(e, t.x, t.y);
	}
	applyImpulse(e, t) {
		this.module_._physics_applyImpulse(e, t.x, t.y);
	}
	setLinearVelocity(e, t) {
		this.module_._physics_setLinearVelocity(e, t.x, t.y);
	}
	getLinearVelocity(e) {
		const t = this.module_._physics_getLinearVelocity(e) >> 2;
		return {
			x: this.module_.HEAPF32[t],
			y: this.module_.HEAPF32[t + 1]
		};
	}
	/** World gravity in **meters/s²** (Box2D space), e.g. `{ x: 0, y: -9.81 }`. */
	setGravity(e) {
		this.module_._physics_setGravity(e.x, e.y);
	}
	getGravity() {
		const e = this.module_._physics_getGravity() >> 2;
		return {
			x: this.module_.HEAPF32[e],
			y: this.module_.HEAPF32[e + 1]
		};
	}
	setAngularVelocity(e, t) {
		this.module_._physics_setAngularVelocity(e, t);
	}
	getAngularVelocity(e) {
		return this.module_._physics_getAngularVelocity(e);
	}
	applyTorque(e, t) {
		this.module_._physics_applyTorque(e, t);
	}
	applyAngularImpulse(e, t) {
		this.module_._physics_applyAngularImpulse(e, t);
	}
	createRevoluteJoint(e, t, n, r, i) {
		const a = i ?? {};
		return this.module_._physics_createRevoluteJoint(e, t, n.x, n.y, r.x, r.y, a.enableMotor ? 1 : 0, a.motorSpeed ?? 0, a.maxMotorTorque ?? 0, a.enableLimit ? 1 : 0, a.lowerAngle ?? 0, a.upperAngle ?? 0, a.collideConnected ? 1 : 0) !== 0;
	}
	destroyJoint(e) {
		this.module_._physics_destroyJoint(e);
	}
	setRevoluteMotorSpeed(e, t) {
		this.module_._physics_setRevoluteMotorSpeed(e, t);
	}
	setRevoluteMaxMotorTorque(e, t) {
		this.module_._physics_setRevoluteMaxMotorTorque(e, t);
	}
	enableRevoluteMotor(e, t) {
		this.module_._physics_enableRevoluteMotor(e, t ? 1 : 0);
	}
	enableRevoluteLimit(e, t) {
		this.module_._physics_enableRevoluteLimit(e, t ? 1 : 0);
	}
	setRevoluteLimits(e, t, n) {
		this.module_._physics_setRevoluteLimits(e, t, n);
	}
	getRevoluteAngle(e) {
		return this.module_._physics_getRevoluteAngle(e);
	}
	getRevoluteMotorTorque(e) {
		return this.module_._physics_getRevoluteMotorTorque(e);
	}
	raycast(e, t, n, r = 65535, i = this.ppu_) {
		const a = 1 / i;
		const o = this.module_._physics_raycast(e.x * a, e.y * a, t.x, t.y, n * a, r);
		if (o === 0) return [];
		const s = this.module_._physics_getRaycastBuffer() >> 2;
		const c = [];
		for (let e = 0; e < o; e++) {
			const t = s + e * 6;
			c.push({
				entity: this.module_.HEAPU32[t],
				point: {
					x: this.module_.HEAPF32[t + 1] * i,
					y: this.module_.HEAPF32[t + 2] * i
				},
				normal: {
					x: this.module_.HEAPF32[t + 3],
					y: this.module_.HEAPF32[t + 4]
				},
				fraction: this.module_.HEAPF32[t + 5]
			});
		}
		c.sort((e, t) => e.fraction - t.fraction);
		return c;
	}
	overlapCircle(e, t, n = 65535, r = this.ppu_) {
		const i = 1 / r;
		const a = this.module_._physics_overlapCircle(e.x * i, e.y * i, t * i, n);
		return this.readUniqueEntityBuffer_(a);
	}
	setAwake(e, t) {
		this.module_._physics_setAwake(e, t ? 1 : 0);
	}
	isAwake(e) {
		return this.module_._physics_isAwake(e) !== 0;
	}
	shapeCastCircle(e, t, n, r = 65535, i = this.ppu_) {
		const a = 1 / i;
		const o = this.module_._physics_shapeCastCircle(e.x * a, e.y * a, t * a, n.x * a, n.y * a, r);
		return this.readShapeCastBuffer_(o, i);
	}
	shapeCastBox(e, t, n, r, i = 65535, a = this.ppu_) {
		const o = 1 / a;
		const s = this.module_._physics_shapeCastBox(e.x * o, e.y * o, t.x * o, t.y * o, n, r.x * o, r.y * o, i);
		return this.readShapeCastBuffer_(s, a);
	}
	shapeCastCapsule(e, t, n, r, i = 65535, a = this.ppu_) {
		const o = 1 / a;
		const s = this.module_._physics_shapeCastCapsule(e.x * o, e.y * o, t.x * o, t.y * o, n * o, r.x * o, r.y * o, i);
		return this.readShapeCastBuffer_(s, a);
	}
	/**
	* Advance a kinematic capsule character one step against the world using Box2D's
	* native mover (collide-into-planes + depenetrating slide). Unlike a raw shape
	* cast this resolves resting/touching contacts with valid normals, so a grounded
	* character slides instead of wedging. Capsule endpoints/radius and `pos`/`velocity`
	* are world pixels; `dt` seconds; `up` a unit vector; `floorCos = cos(floorMaxAngle)`.
	* `self` is excluded from the collision. Returns null if the module isn't ready.
	*/
	moveCharacter(e, t, n, r, i, a, o, s, c, l, u = 0, d = 5, f = 0, p = true, m = this.ppu_, h = {}) {
		const g = 1 / m;
		const _ = (h.dropThrough ? 1 : 0) | (h.ignoreDynamic ? 2 : 0) | (h.blockSteepSlopes ? 4 : 0) | (h.wasOnFloor ? 8 : 0);
		if (!this.module_._physics_moveCharacter(e.x * g, e.y * g, t.x * g, t.y * g, n.x * g, n.y * g, r * g, i.x * g, i.y * g, a, o.x, o.y, s, c, l >>> 0, u * g, d, f * g, p ? 1 : 0, (h.carry?.x ?? 0) * g, (h.carry?.y ?? 0) * g, _, (h.stepHeight ?? 0) * g)) return null;
		const v = this.module_._physics_getMoveCharacterBuffer() >> 2;
		const y = this.module_.HEAPF32, b = this.module_.HEAPU32;
		const x = b[v + 9], S = y[v + 10];
		let C;
		for (let e = 0; e < S; e++) (C ??= []).push({
			entity: b[v + 11 + e * 3],
			normalX: y[v + 12 + e * 3],
			normalY: y[v + 13 + e * 3]
		});
		return {
			floorEntity: x === 4294967295 ? null : x,
			hits: C,
			dx: y[v] * m,
			dy: y[v + 1] * m,
			velX: y[v + 2] * m,
			velY: y[v + 3] * m,
			isOnFloor: y[v + 4] !== 0,
			isOnWall: y[v + 5] !== 0,
			isOnCeiling: y[v + 6] !== 0,
			floorNormalX: y[v + 7],
			floorNormalY: y[v + 8]
		};
	}
	overlapAABB(e, t, n = 65535, r = this.ppu_) {
		const i = 1 / r;
		const a = this.module_._physics_overlapAABB(e.x * i, e.y * i, t.x * i, t.y * i, n);
		return this.readUniqueEntityBuffer_(a);
	}
	getMass(e) {
		return this.module_._physics_getBodyMass(e);
	}
	getInertia(e) {
		return this.module_._physics_getBodyInertia(e);
	}
	getCenterOfMass(e, t = this.ppu_) {
		const n = this.module_._physics_getBodyCenterOfMass(e) >> 2;
		return {
			x: this.module_.HEAPF32[n] * t,
			y: this.module_.HEAPF32[n + 1] * t
		};
	}
	getMassData(e, t = this.ppu_) {
		return {
			mass: this.getMass(e),
			inertia: this.getInertia(e),
			centerOfMass: this.getCenterOfMass(e, t)
		};
	}
	getDistanceJointLength(e, t = this.ppu_) {
		return this.module_._physics_getDistanceJointLength(e) * t;
	}
	getDistanceJointCurrentLength(e, t = this.ppu_) {
		return this.module_._physics_getDistanceJointCurrentLength(e) * t;
	}
	setDistanceJointLength(e, t, n = this.ppu_) {
		this.module_._physics_setDistanceJointLength(e, t / n);
	}
	enableDistanceJointSpring(e, t) {
		this.module_._physics_enableDistanceJointSpring(e, t ? 1 : 0);
	}
	enableDistanceJointLimit(e, t) {
		this.module_._physics_enableDistanceJointLimit(e, t ? 1 : 0);
	}
	setDistanceJointLimits(e, t, n, r = this.ppu_) {
		this.module_._physics_setDistanceJointLimits(e, t / r, n / r);
	}
	enableDistanceJointMotor(e, t) {
		this.module_._physics_enableDistanceJointMotor(e, t ? 1 : 0);
	}
	setDistanceJointMotorSpeed(e, t) {
		this.module_._physics_setDistanceJointMotorSpeed(e, t);
	}
	setDistanceJointMaxMotorForce(e, t) {
		this.module_._physics_setDistanceJointMaxMotorForce(e, t);
	}
	getDistanceJointMotorForce(e) {
		return this.module_._physics_getDistanceJointMotorForce(e);
	}
	getPrismaticJointTranslation(e, t = this.ppu_) {
		return this.module_._physics_getPrismaticJointTranslation(e) * t;
	}
	getPrismaticJointSpeed(e, t = this.ppu_) {
		return this.module_._physics_getPrismaticJointSpeed(e) * t;
	}
	enablePrismaticJointSpring(e, t) {
		this.module_._physics_enablePrismaticJointSpring(e, t ? 1 : 0);
	}
	enablePrismaticJointLimit(e, t) {
		this.module_._physics_enablePrismaticJointLimit(e, t ? 1 : 0);
	}
	setPrismaticJointLimits(e, t, n, r = this.ppu_) {
		this.module_._physics_setPrismaticJointLimits(e, t / r, n / r);
	}
	enablePrismaticJointMotor(e, t) {
		this.module_._physics_enablePrismaticJointMotor(e, t ? 1 : 0);
	}
	setPrismaticJointMotorSpeed(e, t) {
		this.module_._physics_setPrismaticJointMotorSpeed(e, t);
	}
	setPrismaticJointMaxMotorForce(e, t) {
		this.module_._physics_setPrismaticJointMaxMotorForce(e, t);
	}
	getPrismaticJointMotorForce(e) {
		return this.module_._physics_getPrismaticJointMotorForce(e);
	}
	enableWheelJointSpring(e, t) {
		this.module_._physics_enableWheelJointSpring(e, t ? 1 : 0);
	}
	enableWheelJointLimit(e, t) {
		this.module_._physics_enableWheelJointLimit(e, t ? 1 : 0);
	}
	setWheelJointLimits(e, t, n, r = this.ppu_) {
		this.module_._physics_setWheelJointLimits(e, t / r, n / r);
	}
	enableWheelJointMotor(e, t) {
		this.module_._physics_enableWheelJointMotor(e, t ? 1 : 0);
	}
	setWheelJointMotorSpeed(e, t) {
		this.module_._physics_setWheelJointMotorSpeed(e, t);
	}
	setWheelJointMaxMotorTorque(e, t) {
		this.module_._physics_setWheelJointMaxMotorTorque(e, t);
	}
	getWheelJointMotorTorque(e) {
		return this.module_._physics_getWheelJointMotorTorque(e);
	}
	setMotorJointLinearVelocity(e, t, n = this.ppu_) {
		this.module_._physics_setMotorJointLinearVelocity(e, t.x / n, t.y / n);
	}
	setMotorJointAngularVelocity(e, t) {
		this.module_._physics_setMotorJointAngularVelocity(e, t);
	}
	setMotorJointMaxVelocityForce(e, t) {
		this.module_._physics_setMotorJointMaxVelocityForce(e, t);
	}
	setMotorJointMaxVelocityTorque(e, t) {
		this.module_._physics_setMotorJointMaxVelocityTorque(e, t);
	}
	createMouseJoint(e, t, n = {}, r = this.ppu_) {
		return this.module_._physics_createMouseJoint(e, t.x / r, t.y / r, n.hertz ?? 7.5, n.dampingRatio ?? 1, n.maxForce ?? 0) !== 0;
	}
	setMouseTarget(e, t = this.ppu_) {
		this.module_._physics_setMouseTarget(e.x / t, e.y / t);
	}
	destroyMouseJoint() {
		this.module_._physics_destroyMouseJoint();
	}
	hasMouseJoint() {
		return this.module_._physics_hasMouseJoint() !== 0;
	}
	readUniqueEntityBuffer_(e) {
		if (e === 0) return [];
		const t = this.module_._physics_getOverlapBuffer() >> 2;
		const n = [];
		const r = /* @__PURE__ */ new Set();
		for (let i = 0; i < e; i++) {
			const e = this.module_.HEAPU32[t + i];
			if (!r.has(e)) {
				r.add(e);
				n.push(e);
			}
		}
		return n;
	}
	readShapeCastBuffer_(e, t) {
		if (e === 0) return [];
		const n = this.module_._physics_getShapeCastBuffer() >> 2;
		const r = [];
		for (let i = 0; i < e; i++) {
			const e = n + i * 6;
			r.push({
				entity: this.module_.HEAPU32[e],
				point: {
					x: this.module_.HEAPF32[e + 1] * t,
					y: this.module_.HEAPF32[e + 2] * t
				},
				normal: {
					x: this.module_.HEAPF32[e + 3],
					y: this.module_.HEAPF32[e + 4]
				},
				fraction: this.module_.HEAPF32[e + 5]
			});
		}
		r.sort((e, t) => e.fraction - t.fraction);
		return r;
	}
	static setDebugDraw(e, t) {
		const n = e.getResource(d);
		if (n) {
			n.enabled = t;
			e.insertResource(d, n);
		}
	}
	static setDebugDrawConfig(e, t) {
		const n = e.getResource(d);
		if (n) e.insertResource(d, {
			...n,
			...t
		});
	}
};
/**
* Resource published by `Physics2DPlugin` once the wasm module is ready.
* Game code reads it as `Res(Physics)` / `app.getResource(Physics)` to call forces,
* impulses, joint helpers, raycasts, etc.
*/
/**
* The physics world, as `Res(Physics)` hands it over — queries, impulses and the
* step's own knobs. Bodies and colliders are components; this is for what has no
* component to be.
*
* `@beta`: the corpus reaches three of thirty-seven physics symbols, so the
* vocabulary is settled well ahead of the evidence for it.
*
* @beta
*/
const N = r(null, "Physics2D");
//#endregion
export { d as a, A as i, M as n, D as o, k as r, O as s, N as t };

//# sourceMappingURL=Physics2D.js.map