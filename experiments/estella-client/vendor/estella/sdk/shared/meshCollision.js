//#region src/asset/meshCollision.ts
const e = /* @__PURE__ */ new Map();
/** Remember `handle`'s triangles. Called by the loader that decoded them. */
function t(t, n) {
	if (t !== 0) e.set(t, n);
}
/** The triangles behind a mesh handle, or null when nothing loaded it. */
function n(t) {
	return e.get(t) ?? null;
}
function r(t) {
	e.delete(t);
}
/**
* Pull the Position channel out of an interleaved vertex buffer.
*
* @param channels The file's channel table; Position is semantic 0.
* @returns null when the mesh carries no positions, which nothing can collide with.
*/
function i(e, t, n, r) {
	const i = r.find((e) => e.semantic === 0);
	if (!i || i.type !== 0) return null;
	const a = new DataView(e.buffer, e.byteOffset, e.byteLength);
	const o = new Float32Array(t * 3);
	for (let e = 0; e < t; e++) {
		const t = e * n + i.offset;
		o[e * 3] = a.getFloat32(t, true);
		o[e * 3 + 1] = a.getFloat32(t + 4, true);
		o[e * 3 + 2] = a.getFloat32(t + 8, true);
	}
	return o;
}
//#endregion
export { r as i, n, t as r, i as t };

//# sourceMappingURL=meshCollision.js.map