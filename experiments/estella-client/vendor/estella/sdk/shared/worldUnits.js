//#region src/ecs/worldUnits.ts
/**
* @file    worldUnits.ts
* @brief   What one world unit is, and the defaults that follow it.
*
* @details A 3D project says how many world units make a metre (Project Settings → Physics → 3D, `world3d.unitsPerMeter`):
*          100 — a unit is a centimetre — unless it says otherwise, and 1 for a scene in metres such as an imported glTF.
*          Every default that is a length, a speed or an acceleration is written once, at that reference of 100 a metre,
*          and is scaled by the project's own: a character controller is a 1.6 m person, a first-person walk 3.2 m/s and a
*          particle half a metre across in either kind of project. Before, those defaults were written in whichever unit
*          their author had in mind — the character's in metres under a solver that reads centimetres, a 3 mm capsule; the
*          first person's in centimetres in a metre scene, a 3.2 km/s walk.
*
*          A value a scene states is never scaled: only what a default fills in is.
*/
/** The scale every world-unit default is written at: 100 units a metre, a unit a centimetre. */
const e = 100;
let t = 100;
let n = 0;
const r = /* @__PURE__ */ new Set();
/** Calls `fn` now and on every change: how the renderer learns what a metre is (inverse-square lights measure in it). */
function i(e) {
	r.add(e);
	e(t);
	return () => r.delete(e);
}
/**
* Set the project's units per metre. Called before a scene loads (by the runtime from the project's config, by the
* editor when a project opens or the setting changes), so the defaults it fills in are the project's.
*/
function a(e) {
	const i = Number.isFinite(e) && e > 0 ? e : 100;
	if (i === t) return;
	t = i;
	n++;
	for (const e of r) e(i);
}
/** The project's units per metre. */
function o() {
	return t;
}
/** What a reference-scale default is multiplied by: 1 in a centimetre project, 0.01 in a metre one. */
function s() {
	return t / 100;
}
/**
* The world-unit fields of the engine's own components whose defaults come from C++ (generated), so cannot carry
* the flag in their TS definition. A component defined in TS names its own in `ComponentMetadata.worldUnitFields`.
*/
const c = {
	CharacterController3D: [
		"radius",
		"halfHeight",
		"stepHeight",
		"snapDown"
	],
	BoxCollider3D: ["halfExtents", "center"],
	SphereCollider3D: ["radius", "center"],
	CapsuleCollider3D: [
		"radius",
		"halfHeight",
		"center"
	],
	ParticleEmitter: [
		"shapeRadius",
		"shapeSize",
		"speedMin",
		"speedMax",
		"startSizeMin",
		"startSizeMax",
		"endSizeMin",
		"endSizeMax",
		"gravity",
		"addedVelocityMin",
		"addedVelocityMax",
		"speedLimit",
		"noiseStrength",
		"trailWidth",
		"trailMinDistance",
		"collisionThickness",
		"collisionMaxDistance"
	]
};
/** `defaults` with each named field multiplied by `scale` (a number, or each axis of a vector). */
function l(e, t, n) {
	if (n === 1 || t.length === 0) return e;
	const r = { ...e };
	for (const e of t) {
		const t = r[e];
		if (typeof t === "number") r[e] = t * n;
		else if (t !== null && typeof t === "object" && !Array.isArray(t)) {
			const i = { ...t };
			for (const e of [
				"x",
				"y",
				"z",
				"w"
			]) if (typeof i[e] === "number") i[e] = i[e] * n;
			r[e] = i;
		}
	}
	return r;
}
/**
* The defaults a component hands out now: its reference-scale ones, scaled to the project's units. Cached until the
* scale changes; at the reference scale the very object it was defined with.
*/
function u(e, t) {
	let r = e, i = -1;
	return () => {
		if (t.length === 0 || s() === 1) return e;
		if (i !== n) {
			r = l(e, t, s());
			i = n;
		}
		return r;
	};
}
//#endregion
export { u as a, a as i, e as n, s as o, i as r, o as s, c as t };

//# sourceMappingURL=worldUnits.js.map