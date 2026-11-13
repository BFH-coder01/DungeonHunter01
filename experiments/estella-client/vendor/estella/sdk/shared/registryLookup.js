import { n as e } from "./AssetPlugin.js";
//#region src/asset/registryLookup.ts
/** The current era of one ref-bound asset in `app`'s realm. */
function t(t, n, r) {
	return t.hasResource(e) ? t.getResource(e).resolveRegistryAsset(n, r) : void 0;
}
/** Every ref-bound asset of one type this realm publishes — what a schedule
*  analysis reads, so it sees the graphs THIS app loaded and no others. */
function n(t, n) {
	return t.hasResource(e) ? t.getResource(e).publishedRegistryAssets(n) : [];
}
//#endregion
export { n, t };

//# sourceMappingURL=registryLookup.js.map