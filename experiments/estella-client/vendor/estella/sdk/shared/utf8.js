//#region src/util/utf8.ts
/**
* @file    utf8.ts
* @brief   UTF-8 conversion that does not assume a browser.
*
* @details `TextEncoder` is a web platform API, not a JavaScript one. The engine
*          runs on a device inside QuickJS, which does not have it — so SDK code
*          that reaches for the global works everywhere it was tested and throws
*          on the one target nobody can test in a unit test. That is how a
*          skeleton loader shipped in an APK that failed at boot.
*
*          So: use the platform's encoder when it exists, because it is faster and
*          correct, and fall back to doing the arithmetic. The fallback is not a
*          nicety — on a native host it is the only path.
*/
const e = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
const t = typeof TextDecoder !== "undefined" ? new TextDecoder() : null;
/** `str` as UTF-8 bytes. */
function n(t) {
	if (e) return e.encode(t);
	let n = 0;
	for (let e = 0; e < t.length; e++) {
		const r = t.codePointAt(e);
		if (r > 65535) e++;
		n += r < 128 ? 1 : r < 2048 ? 2 : r < 65536 ? 3 : 4;
	}
	const r = new Uint8Array(n);
	let i = 0;
	for (let e = 0; e < t.length; e++) {
		const n = t.codePointAt(e);
		if (n > 65535) e++;
		if (n < 128) r[i++] = n;
		else if (n < 2048) {
			r[i++] = 192 | n >> 6;
			r[i++] = 128 | n & 63;
		} else if (n < 65536) {
			r[i++] = 224 | n >> 12;
			r[i++] = 128 | n >> 6 & 63;
			r[i++] = 128 | n & 63;
		} else {
			r[i++] = 240 | n >> 18;
			r[i++] = 128 | n >> 12 & 63;
			r[i++] = 128 | n >> 6 & 63;
			r[i++] = 128 | n & 63;
		}
	}
	return r;
}
/** UTF-8 `bytes` as a string. Malformed input yields U+FFFD, as the platform's
*  decoder does in its non-fatal mode. */
function r(e) {
	if (t) return t.decode(e);
	const n = [];
	let r = [];
	for (let t = 0; t < e.length;) {
		const i = e[t];
		let a;
		let o;
		if (i < 128) {
			a = i;
			o = 1;
		} else if ((i & 224) === 192) {
			a = i & 31;
			o = 2;
		} else if ((i & 240) === 224) {
			a = i & 15;
			o = 3;
		} else if ((i & 248) === 240) {
			a = i & 7;
			o = 4;
		} else {
			a = 65533;
			o = 1;
		}
		if (o > 1) if (t + o > e.length) {
			a = 65533;
			o = 1;
		} else for (let n = 1; n < o; n++) {
			const r = e[t + n];
			if ((r & 192) !== 128) {
				a = 65533;
				o = 1;
				break;
			}
			a = a << 6 | r & 63;
		}
		t += o;
		if (a > 65535) {
			const e = a - 65536;
			r.push(55296 | e >> 10, 56320 | e & 1023);
		} else r.push(a);
		if (r.length >= 4096) {
			n.push(String.fromCharCode(...r));
			r = [];
		}
	}
	if (r.length) n.push(String.fromCharCode(...r));
	return n.join("");
}
//#endregion
export { n, r as t };

//# sourceMappingURL=utf8.js.map