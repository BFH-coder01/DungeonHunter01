import { Qt as e } from "./system.js";
import { s as t } from "./resource.js";
//#region src/physics3d/physics3dRuntime.ts
/**
* @file    physics3dRuntime.ts
* @brief   The 3D physics world's live state, as a resource: the module, the bodies built, the world's configuration.
*
* @details Apart from the plugin that fills it so that what only reads it (water's floating, a planet's gravity) need not import the plugin.
*/
const n = t({
	module: null,
	initPromise: null,
	bodies: /* @__PURE__ */ new Map(),
	characters: /* @__PURE__ */ new Map(),
	joints: /* @__PURE__ */ new Map(),
	pieces: /* @__PURE__ */ new Map(),
	config: null
}, "Physics3DRuntime");
//#endregion
//#region src/physics3d/Physics3DComponents.ts
/**
* @file    Physics3DComponents.ts
* @brief   The 3D world's components, as a scene authors them.
* @details Their own set rather than a third dimension on the 2D ones: a 2D scene
*          keeps the solver, units and feel it already has, and pays nothing for a
*          world it never asks for.
*/
const r = e("RigidBody3D", {
	bodyType: 2,
	layer: 0,
	gravityScale: 1,
	linearDamping: .05,
	angularDamping: .05,
	fixedRotation: false,
	continuousCollision: false,
	enabled: true
}, { fields: {
	linearDamping: {
		min: 0,
		advanced: true
	},
	angularDamping: {
		min: 0,
		advanced: true
	},
	fixedRotation: { advanced: true },
	continuousCollision: {
		advanced: true,
		tooltip: "Check the whole path a step covers — what a bullet needs"
	}
} });
const i = e("BoxCollider3D", {
	halfExtents: {
		x: 50,
		y: 50,
		z: 50
	},
	center: {
		x: 0,
		y: 0,
		z: 0
	},
	friction: .3,
	restitution: 0,
	isSensor: false,
	enabled: true
});
const a = e("SphereCollider3D", {
	radius: 50,
	center: {
		x: 0,
		y: 0,
		z: 0
	},
	friction: .3,
	restitution: 0,
	isSensor: false,
	enabled: true
});
const o = e("CapsuleCollider3D", {
	radius: 30,
	halfHeight: 50,
	center: {
		x: 0,
		y: 0,
		z: 0
	},
	friction: .3,
	restitution: 0,
	isSensor: false,
	enabled: true
});
/**
* Imported geometry used as it is, for a level to collide against. Always static:
* a triangle soup has no inertia tensor, so there is nothing for a solver to push.
*
* @experimental
*/
const s = e("MeshCollider3D", {
	mesh: 0,
	layer: 0,
	friction: .3,
	restitution: 0,
	enabled: true
});
/**
* The convex hull of imported geometry — what a `MeshCollider3D` cannot be. A
* triangle soup has no inertia tensor and is scenery whatever its body says; a
* hull is a volume a solver pushes as readily as a box.
*
* @experimental
*/
const c = e("ConvexCollider3D", {
	mesh: 0,
	friction: .3,
	restitution: 0,
	isSensor: false,
	enabled: true
});
/**
* A kinematic mover for a 3D player or NPC: swept against the world rather than
* solved in it. Set `velocity` each step and read `isOnFloor` back; the vertical
* component is carried for you, so a zero there means "walk", not "hang".
*
* @experimental
*/
const l = e("CharacterController3D", {
	velocity: {
		x: 0,
		y: 0,
		z: 0
	},
	radius: 30,
	halfHeight: 50,
	maxSlope: .87,
	layer: 0,
	stepHeight: 40,
	snapDown: 50,
	mass: 70,
	pushForce: 5e3,
	enabled: true,
	isOnFloor: false,
	floorNormal: {
		x: 0,
		y: 0,
		z: 0
	},
	realVelocity: {
		x: 0,
		y: 0,
		z: 0
	}
}, { fields: {
	maxSlope: {
		min: 0,
		max: 1.5708,
		step: .01,
		unit: "rad",
		tooltip: "Steepest ground it can stand on"
	},
	stepHeight: {
		min: 0,
		step: .05,
		advanced: true
	},
	snapDown: {
		min: 0,
		step: .05,
		advanced: true
	},
	mass: {
		min: 0,
		advanced: true
	},
	pushForce: {
		min: 0,
		advanced: true,
		tooltip: "How hard it can shove what it walks into"
	},
	layer: {
		min: 0,
		max: 15,
		step: 1,
		advanced: true
	},
	isOnFloor: { advanced: true },
	floorNormal: { advanced: true },
	realVelocity: { advanced: true }
} });
//#endregion
export { s as a, n as c, c as i, o as n, r as o, l as r, a as s, i as t };

//# sourceMappingURL=Physics3DComponents.js.map