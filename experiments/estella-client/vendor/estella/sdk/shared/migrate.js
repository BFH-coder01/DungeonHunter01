import { t as e } from "./quat.js";
//#region src/render/lightAim.ts
/**
* @file    lightAim.ts
* @brief   A light aims along its entity's forward.
* @details Where a light points is its Transform's rotation, the same fact a
*          camera's orientation is — so a light turns with its parent, a rotate
*          gizmo aims it, and an animation track can swing it. Naming a direction
*          instead is a way IN, and this is the one place on this side of the
*          boundary that says which direction "no rotation" means; the engine's is
*          `lightForward` in RenderFrame.cpp.
*/
/** The direction an unrotated light aims: into the screen, where a 2D scene's
*  light has always come from. */
const t = {
	x: 0,
	y: 0,
	z: -1
};
/**
* The rotation that aims a light along `aim` (any length; zero gives no turn).
* Roll about the aim is left at none — a cone and parallel rays have nothing to
* say about it.
*
* @experimental
*/
function n(n) {
	return e.rotationTo(t, n);
}
/**
* Where a light with this rotation aims — the unit vector the engine lights along.
*
* @experimental
*/
function r(n) {
	return e.rotate(n, t);
}
//#endregion
//#region src/scene/legacyComponents.ts
/**
* @file    legacyComponents.ts
* @brief   Component data written by an older engine, brought forward.
* @details A scene and a prefab hold the same component records, so an upgrade
*          belongs to neither: one that runs on only one of them leaves the other
*          handing the engine data it no longer means. Both migrations call
*          {@link upgradeEntityComponents}, and it is idempotent — data already
*          current passes through untouched.
*/
/**
* Engine components that no longer exist. A file written before their retirement
* still names them; keeping them would only make the loader warn and skip.
*/
const i = /* @__PURE__ */ new Set(["StateMachine", "StateVisuals"]);
/**
* Components an engine upgrade renamed, old name to new. A name is the key a file
* stores a component under, so a rename is a migration: without one the loader
* reads the old name as a component it has never heard of.
*/
const a = /* @__PURE__ */ new Map([
	["LocalTransform", "Transform"],
	["WorldTransform", "Transform"],
	["Light2D", "Light"],
	["Mesh2D", "MeshRenderer"],
	["RigidBody", "RigidBody2D"],
	["BoxCollider", "BoxCollider2D"],
	["CircleCollider", "CircleCollider2D"],
	["CapsuleCollider", "CapsuleCollider2D"],
	["SegmentCollider", "SegmentCollider2D"],
	["PolygonCollider", "PolygonCollider2D"],
	["ChainCollider", "ChainCollider2D"],
	["CharacterController", "CharacterController2D"],
	["OneWayPlatform", "OneWayPlatform2D"],
	["DistanceJoint", "DistanceJoint2D"],
	["WheelJoint", "WheelJoint2D"],
	["MotorJoint", "MotorJoint2D"],
	["RevoluteJoint", "HingeJoint2D"],
	["RevoluteJoint2D", "HingeJoint2D"],
	["PrismaticJoint", "SliderJoint2D"],
	["PrismaticJoint2D", "SliderJoint2D"],
	["WeldJoint", "FixedJoint2D"],
	["WeldJoint2D", "FixedJoint2D"]
]);
/** Light kinds that aim: Directional (1) and Spot (3). Point and Ambient never did. */
const o = /* @__PURE__ */ new Set([1, 3]);
const s = {
	w: 1,
	x: 0,
	y: 0,
	z: 0
};
/**
* Would {@link upgradeEntityComponents} change this entity? Its pair, so that a
* caller who must copy before writing can ask first; every rule below is
* answered here, which is why the two live together.
*/
function c(e) {
	return e.components.some((e) => i.has(e.type) || a.has(e.type) || e.type === "UIMask" && typeof e.data["mode"] === "string" || e.type === "Light" && ("direction" in e.data || "directionZ" in e.data));
}
/**
* Move a light's aim onto the entity carrying it: `direction`/`directionZ` become
* the rotation whose forward they are, replacing whatever rotation the file
* carried — the renderer never read that one, so no frame moves.
* Point and Ambient do not aim; their fields go and their rotation is left alone.
*/
function l(t) {
	const r = t.components.find((e) => e.type === "Light");
	if (!r) return false;
	const i = r.data;
	if (!("direction" in i) && !("directionZ" in i)) return false;
	const a = i["direction"];
	const c = {
		x: Number(a?.x ?? 0),
		y: Number(a?.y ?? 0),
		z: "directionZ" in i ? Number(i["directionZ"]) : -1
	};
	delete i["direction"];
	delete i["directionZ"];
	if (!o.has(Number(i["type"] ?? 0))) return true;
	const l = n(c);
	const u = {
		x: l.x,
		y: l.y,
		z: l.z,
		w: l.w
	};
	const d = t.components.find((e) => e.type === "Transform");
	if (d) d.data["rotation"] = u;
	else if (Math.abs(e.dot(l, s)) < 1 - 1e-9) t.components.unshift({
		type: "Transform",
		data: { rotation: u }
	});
	return true;
}
/** Legacy spellings inside one component. */
function u(e) {
	let t = false;
	const n = a.get(e.type);
	if (n !== void 0) {
		e.type = n;
		t = true;
	}
	if (e.type === "UIMask") {
		const n = e.data;
		if (n["mode"] === "scissor") {
			n["mode"] = 0;
			t = true;
		} else if (n["mode"] === "stencil") {
			n["mode"] = 1;
			t = true;
		}
	}
	return t;
}
/**
* Bring one entity's component data forward, in place: drop retired components,
* normalize legacy spellings, move a light's aim onto its entity. Names of the
* retired components dropped are added to `retired` when one is given — the
* editor tells the user which its open upgraded away.
*
* @returns true when anything changed.
*/
function d(e, t) {
	let n = false;
	const r = e.components.filter((e) => {
		if (!i.has(e.type)) return true;
		t?.add(e.type);
		return false;
	});
	if (r.length !== e.components.length) {
		e.components = r;
		n = true;
	}
	for (const t of e.components) if (u(t)) n = true;
	if (l(e)) n = true;
	return n;
}
//#endregion
//#region src/prefab/migrate.ts
const f = "2";
/**
* Upgrade a parsed `.esprefab` JSON value to the current format.
*
* The historical format used numeric entity ids; current format uses
* opaque strings (UUIDs for editor-authored prefabs). Numeric ids are
* stringified with `String(n)` so cross-references — `parent`, `children`,
* `rootEntityId`, `PrefabOverride.prefabEntityId`, `nestedPrefab.overrides`
* — remain consistent.
*
* The function is total: it accepts already-migrated data and returns it
* with `migrated: false`. Throws on shapes that can't be reconciled.
*/
function p(e) {
	if (typeof e !== "object" || e === null) throw new Error("Prefab data must be an object");
	const t = e;
	if (!Array.isArray(t["entities"])) throw new Error("Prefab data must have an \"entities\" array");
	if (typeof t["rootEntityId"] !== "string" && typeof t["rootEntityId"] !== "number") throw new Error("Prefab data must have a \"rootEntityId\" string or number");
	const n = typeof t["version"] === "string" ? t["version"] : "1.0";
	const r = m(t) || n !== "2";
	const i = !r && t["entities"].some(c);
	if (!r && !i) return {
		data: t,
		migrated: false,
		fromVersion: n,
		toVersion: n
	};
	const a = r ? h(t) : JSON.parse(JSON.stringify(t));
	for (const e of a.entities) d(e);
	if (r) a.version = "2";
	return {
		data: a,
		migrated: true,
		fromVersion: n,
		toVersion: r ? "2" : n
	};
}
function m(e) {
	if (typeof e["rootEntityId"] === "number") return true;
	const t = e["entities"];
	for (const e of t) {
		if (typeof e !== "object" || e === null) continue;
		const t = e;
		if (typeof t["prefabEntityId"] === "number") return true;
		if (typeof t["parent"] === "number") return true;
		const n = t["children"];
		if (Array.isArray(n) && n.some((e) => typeof e === "number")) return true;
	}
	const n = e["overrides"];
	if (Array.isArray(n)) for (const e of n) {
		if (typeof e !== "object" || e === null) continue;
		if (typeof e["prefabEntityId"] === "number") return true;
	}
	return false;
}
function h(e) {
	const t = (e) => {
		if (typeof e === "string") return e;
		if (typeof e === "number") return String(e);
		throw new Error(`Cannot stringify prefab id of type ${typeof e}`);
	};
	const n = e["entities"].map((e) => {
		const n = e;
		const r = {
			prefabEntityId: t(n["prefabEntityId"]),
			name: typeof n["name"] === "string" ? n["name"] : "",
			parent: n["parent"] === null || n["parent"] === void 0 ? null : t(n["parent"]),
			children: Array.isArray(n["children"]) ? n["children"].map(t) : [],
			components: Array.isArray(n["components"]) ? n["components"] : [],
			visible: n["visible"] !== false
		};
		if (n["metadata"] && typeof n["metadata"] === "object") r.metadata = n["metadata"];
		if (n["nestedPrefab"] && typeof n["nestedPrefab"] === "object") {
			const e = n["nestedPrefab"];
			r.nestedPrefab = {
				prefabPath: typeof e["prefabPath"] === "string" ? e["prefabPath"] : "",
				overrides: Array.isArray(e["overrides"]) ? g(e["overrides"]) : []
			};
		}
		return r;
	});
	const r = {
		version: "2",
		name: typeof e["name"] === "string" ? e["name"] : "",
		rootEntityId: t(e["rootEntityId"]),
		entities: n
	};
	if (typeof e["basePrefab"] === "string") r.basePrefab = e["basePrefab"];
	if (Array.isArray(e["overrides"])) r.overrides = g(e["overrides"]);
	return r;
}
function g(e) {
	return e.map((e) => {
		const t = e;
		const n = t["prefabEntityId"];
		return {
			...t,
			prefabEntityId: typeof n === "number" ? String(n) : n
		};
	});
}
//#endregion
export { d as a, n as c, i, p as n, t as o, a as r, r as s, f as t };

//# sourceMappingURL=migrate.js.map