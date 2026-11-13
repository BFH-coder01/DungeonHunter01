//#region src/wasm/wasmScratch.ts
/**
* Run `fn` with a scratch allocator; free everything it allocated on exit,
* whether `fn` returns normally or throws. Frees in reverse allocation order.
*
* @example
* const offset = withScratch(module, alloc => {
*     const ptr = alloc(pixels.length);
*     module.HEAPU8.set(pixels, ptr);
*     return module.uploadTexture(ptr, pixels.length); // may throw — ptr still freed
* });
*/
function e(e, t) {
	const n = [];
	const r = (t) => {
		const r = e._malloc(t);
		if (r) n.push(r);
		return r;
	};
	try {
		return t(r);
	} finally {
		for (let t = n.length - 1; t >= 0; t--) e._free(n[t]);
	}
}
/**
* Convenience for the single-buffer case: allocate `size` bytes, run `fn` with
* the pointer, and free it on exit (normal or throw).
*/
function t(t, n, r) {
	return e(t, (e) => r(e(n)));
}
//#endregion
export { e as n, t };

//# sourceMappingURL=wasmScratch.js.map