import { $t as e, Qt as t } from "./system.js";
//#region src/physics/PhysicsComponents.ts
const n = {
	categoryBits: {
		bitmask: {
			bits: 16,
			source: "collisionLayers"
		},
		advanced: true
	},
	maskBits: {
		bitmask: {
			bits: 16,
			source: "collisionLayers"
		},
		advanced: true
	}
};
const r = t("RigidBody2D", {
	bodyType: 2,
	gravityScale: 1,
	linearDamping: 0,
	angularDamping: 0,
	fixedRotation: false,
	bullet: false,
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
	bullet: { advanced: true }
} });
const i = t("BoxCollider2D", {
	halfExtents: {
		x: .5,
		y: .5
	},
	offset: {
		x: 0,
		y: 0
	},
	radius: .05,
	density: 1,
	friction: .3,
	restitution: 0,
	isSensor: false,
	enabled: true,
	categoryBits: 1,
	maskBits: 65535
}, { fields: { ...n } });
const a = t("CircleCollider2D", {
	radius: .5,
	offset: {
		x: 0,
		y: 0
	},
	density: 1,
	friction: .3,
	restitution: 0,
	isSensor: false,
	enabled: true,
	categoryBits: 1,
	maskBits: 65535
}, { fields: { ...n } });
const o = t("CapsuleCollider2D", {
	radius: .25,
	halfHeight: .5,
	offset: {
		x: 0,
		y: 0
	},
	density: 1,
	friction: .3,
	restitution: 0,
	isSensor: false,
	enabled: true,
	categoryBits: 1,
	maskBits: 65535
}, { fields: { ...n } });
const s = t("SegmentCollider2D", {
	point1: {
		x: -.5,
		y: 0
	},
	point2: {
		x: .5,
		y: 0
	},
	density: 1,
	friction: .3,
	restitution: 0,
	isSensor: false,
	enabled: true,
	categoryBits: 1,
	maskBits: 65535
}, { fields: { ...n } });
const c = e("PolygonCollider2D", {
	vertices: [
		{
			x: -.5,
			y: -.5
		},
		{
			x: .5,
			y: -.5
		},
		{
			x: .5,
			y: .5
		},
		{
			x: -.5,
			y: .5
		}
	],
	radius: 0,
	density: 1,
	friction: .3,
	restitution: 0,
	isSensor: false,
	enabled: true,
	categoryBits: 1,
	maskBits: 65535
}, { fields: { ...n } });
const l = e("ChainCollider2D", {
	points: [
		{
			x: -1,
			y: 0
		},
		{
			x: 0,
			y: .5
		},
		{
			x: 1,
			y: 0
		},
		{
			x: 0,
			y: -.5
		}
	],
	isLoop: true,
	friction: .6,
	restitution: 0,
	categoryBits: 1,
	maskBits: 65535,
	enabled: true
}, { fields: { ...n } });
/**
* The collider's data, or null when the component is absent **or disabled** — a
* disabled collider is equivalent to an absent one (no Box2D shape, nothing to
* cast against, no debug outline), and every consumer reads it through here so
* those answers agree. Data predating the field has no `enabled`, and stays solid.
*/
function u(e, t, n) {
	if (!e.has(t, n)) return null;
	const r = e.get(t, n);
	return r.enabled === false ? null : r;
}
const d = e("OneWayPlatform2D", {
	normal: {
		x: 0,
		y: 1
	},
	localSpace: false,
	enabled: true
});
const f = {
	anchorA: { tooltip: "Where the joint attaches on the connected body, in that body's frame (pixels)." },
	anchorB: { tooltip: "Where it attaches on this entity, in its own frame (pixels)." }
};
const p = e("HingeJoint2D", {
	connectedEntity: -1,
	anchorA: {
		x: 0,
		y: 0
	},
	anchorB: {
		x: 0,
		y: 0
	},
	enableMotor: false,
	motorSpeed: 0,
	maxMotorTorque: 0,
	enableLimit: false,
	lowerAngle: 0,
	upperAngle: 0,
	collideConnected: false,
	enabled: true
}, {
	entityFields: ["connectedEntity"],
	fields: { ...f }
});
const m = e("DistanceJoint2D", {
	connectedEntity: -1,
	anchorA: {
		x: 0,
		y: 0
	},
	anchorB: {
		x: 0,
		y: 0
	},
	length: 1,
	enableSpring: false,
	hertz: 1,
	dampingRatio: .5,
	enableLimit: false,
	minLength: .5,
	maxLength: 2,
	enableMotor: false,
	maxMotorForce: 0,
	motorSpeed: 0,
	collideConnected: false,
	enabled: true
}, {
	entityFields: ["connectedEntity"],
	fields: { ...f }
});
const h = e("SliderJoint2D", {
	connectedEntity: -1,
	anchorA: {
		x: 0,
		y: 0
	},
	anchorB: {
		x: 0,
		y: 0
	},
	axis: {
		x: 1,
		y: 0
	},
	enableSpring: false,
	hertz: 1,
	dampingRatio: .5,
	enableLimit: false,
	lowerTranslation: 0,
	upperTranslation: 0,
	enableMotor: false,
	maxMotorForce: 0,
	motorSpeed: 0,
	collideConnected: false,
	enabled: true
}, {
	entityFields: ["connectedEntity"],
	fields: {
		...f,
		axis: { tooltip: "Direction of travel, in the connected body's frame." }
	}
});
const g = e("FixedJoint2D", {
	connectedEntity: -1,
	anchorA: {
		x: 0,
		y: 0
	},
	anchorB: {
		x: 0,
		y: 0
	},
	linearHertz: 0,
	angularHertz: 0,
	linearDampingRatio: 1,
	angularDampingRatio: 1,
	collideConnected: false,
	enabled: true
}, {
	entityFields: ["connectedEntity"],
	fields: { ...f }
});
const _ = e("WheelJoint2D", {
	connectedEntity: -1,
	anchorA: {
		x: 0,
		y: 0
	},
	anchorB: {
		x: 0,
		y: 0
	},
	axis: {
		x: 0,
		y: 1
	},
	enableSpring: true,
	hertz: 5,
	dampingRatio: .7,
	enableLimit: false,
	lowerTranslation: 0,
	upperTranslation: 0,
	enableMotor: false,
	maxMotorTorque: 0,
	motorSpeed: 0,
	collideConnected: false,
	enabled: true
}, {
	entityFields: ["connectedEntity"],
	fields: {
		...f,
		axis: { tooltip: "Direction of travel, in the connected body's frame." }
	}
});
const v = e("MotorJoint2D", {
	connectedEntity: -1,
	linearVelocity: {
		x: 0,
		y: 0
	},
	maxVelocityForce: 0,
	angularVelocity: 0,
	maxVelocityTorque: 0,
	linearHertz: 0,
	linearDampingRatio: 0,
	maxSpringForce: 0,
	angularHertz: 0,
	angularDampingRatio: 0,
	maxSpringTorque: 0,
	collideConnected: false,
	enabled: true
}, { entityFields: ["connectedEntity"] });
//#endregion
export { m as a, v as c, r as d, s as f, u as h, a as i, d as l, _ as m, o as n, g as o, h as p, l as r, p as s, i as t, c as u };

//# sourceMappingURL=PhysicsComponents.js.map