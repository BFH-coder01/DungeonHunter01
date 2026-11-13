//#region src/runtime/entryPlugins.ts
const e = /* @__PURE__ */ new Map();
/**
* Called by an optional subsystem's support module. `id` is the subsystem, so a
* second registration of the same one replaces rather than adds.
*/
function t(t, n) {
	e.set(t, n);
}
/** Fresh instances per app: a plugin carries per-app state once built. */
function n() {
	return [...e.values()].map((e) => e());
}
//#endregion
export { n, t };

//# sourceMappingURL=entryPlugins.js.map