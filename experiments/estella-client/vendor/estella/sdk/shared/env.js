import { n as e } from "./context.js";
//#region src/ecs/env.ts
/**
* @file    env.ts
* @brief   Run-mode accessors (editor vs runtime, edit vs play).
*
* State lives on {@link AppContext} (see context.ts) so it is app-scoped and
* isolates with `setDefaultContext`, rather than as a module global. These
* functions are the stable public surface; gameplay systems gate on
* {@link playModeOnly}.
*/
function t(t) {
	e().editorMode = t;
}
function n() {
	return e().editorMode;
}
function r() {
	return !e().editorMode;
}
function i(t) {
	e().playMode = t;
}
function a() {
	return e().playMode;
}
/**
* Run condition for gameplay (simulation-advancing) systems: true outside an
* editor, or inside an editor only while play mode is active. In editor edit
* mode it returns false, freezing gameplay while render/transform/layout
* systems (which do not use this gate) keep ticking.
*/
function o() {
	const t = e();
	return !t.editorMode || t.playMode;
}
let s = false;
/** Editor-only: advance FX simulations (particles, trails) in edit mode. */
function c(e) {
	s = e;
}
function l() {
	return s;
}
/** Run condition for FX systems: gameplay rules, plus the authoring preview. */
function u() {
	return s || o();
}
let d = false;
/** Declared at app creation, before textures upload / shaders compile. */
function f(e) {
	d = e;
}
/** Whether the renderer runs the linear-light pipeline this session. */
function p() {
	return d;
}
/**
* Whether a texture is sampled through sRGB decode: colour is, under the linear
* pipeline, unless its import settings say it holds data (a normal map, packed
* roughness), which decoded as colour would bend every value below one.
*/
function m(e) {
	return d && (e ?? true);
}
//#endregion
export { r as a, m as c, f as d, i as f, a as i, t as l, n, p as o, l as r, o as s, u as t, c as u };

//# sourceMappingURL=env.js.map