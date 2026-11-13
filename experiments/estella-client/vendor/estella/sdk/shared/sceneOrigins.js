import { s as e } from "./resource.js";
//#region src/scene/sceneOrigins.ts
/**
* Per loaded entity, the id it carried in the scene document.
*
* Absent unless a consumer asks for it. The editor, streamed cells and authored
* procedural zones use the document identity across entity lifetimes; games
* without those consumers do not pay for the table.
*
* @experimental
*/
const t = e(/* @__PURE__ */ new Map(), "SceneOrigins");
/**
* Start recording origins on `app`. Call before the first scene loads — what is
* already spawned was not recorded.
*
* @experimental
*/
function n(e) {
	if (!e.hasResource(t)) e.insertResource(t, /* @__PURE__ */ new Map());
}
/** @experimental */
function r(e) {
	return e.hasResource(t);
}
/**
* Record a scene load's document-id → entity map. No-op unless enabled.
*
* @experimental
*/
function i(e, n) {
	if (!e.hasResource(t)) return;
	const r = e.getResource(t);
	for (const t of r.keys()) if (!e.world.valid(t)) r.delete(t);
	for (const [e, t] of n) r.set(t, e);
}
/**
* The document id `entity` was loaded from; undefined if the game spawned it (or
* nothing is recording).
*
* @experimental
*/
function a(e, n) {
	return e.hasResource(t) ? e.getResource(t).get(n) : void 0;
}
//#endregion
export { r as a, a as i, n, i as r, t };

//# sourceMappingURL=sceneOrigins.js.map