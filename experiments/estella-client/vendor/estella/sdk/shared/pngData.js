//#region src/asset/pngData.ts
const e = [
	137,
	80,
	78,
	71,
	13,
	10,
	26,
	10
];
/** Whether `bytes` is a PNG this reader takes: 8 or 16 bits a channel, grey, grey+alpha, RGB or RGBA, not interlaced. */
function t(t) {
	if (t.length < 33 || e.some((e, n) => t[n] !== e)) return null;
	const n = new DataView(t.buffer, t.byteOffset, t.byteLength);
	const r = n.getUint32(16), i = n.getUint32(20);
	const a = t[24], o = t[25], s = t[28];
	const c = {
		0: 1,
		2: 3,
		4: 2,
		6: 4
	}[o];
	if (a !== 8 && a !== 16 || !c || s !== 0 || !r || !i) return null;
	return {
		width: r,
		height: i,
		channels: c,
		depth: a
	};
}
async function n(e) {
	const t = new Blob([e]).stream().pipeThrough(new DecompressionStream("deflate"));
	return new Uint8Array(await new Response(t).arrayBuffer());
}
const r = (e, t, n) => {
	const r = e + t - n, i = Math.abs(r - e), a = Math.abs(r - t), o = Math.abs(r - n);
	return i <= a && i <= o ? e : a <= o ? t : n;
};
/**
* The RGBA bytes of a PNG, top row first, as stored; null when it is not a PNG this reads or the host has no
* DecompressionStream, and the caller decodes it as an image instead.
*/
async function i(e) {
	const i = t(e);
	if (!i || typeof DecompressionStream !== "function") return null;
	const { width: a, height: o, channels: s, depth: c } = i;
	const l = c / 8, u = s * l;
	const d = new DataView(e.buffer, e.byteOffset, e.byteLength);
	const f = [];
	for (let t = 8; t + 8 <= e.length;) {
		const n = d.getUint32(t);
		const r = String.fromCharCode(e[t + 4], e[t + 5], e[t + 6], e[t + 7]);
		if (r === "IDAT") f.push(e.subarray(t + 8, t + 8 + n));
		if (r === "IEND") break;
		t += 12 + n;
	}
	const p = new Uint8Array(f.reduce((e, t) => e + t.length, 0));
	f.reduce((e, t) => (p.set(t, e), e + t.length), 0);
	const m = await n(p);
	const h = a * u;
	if (m.length < (h + 1) * o) return null;
	const g = new Uint8Array(h * o);
	for (let e = 0; e < o; e++) {
		const t = m[e * (h + 1)];
		const n = e * (h + 1) + 1, i = e * h, a = i - h;
		for (let o = 0; o < h; o++) {
			const s = o >= u ? g[i + o - u] : 0;
			const c = e > 0 ? g[a + o] : 0;
			const l = o >= u && e > 0 ? g[a + o - u] : 0;
			const d = m[n + o];
			g[i + o] = (t === 1 ? d + s : t === 2 ? d + c : t === 3 ? d + (s + c >> 1) : t === 4 ? d + r(s, c, l) : d) & 255;
		}
	}
	if (s === 4 && l === 1) return {
		width: a,
		height: o,
		pixels: g
	};
	const _ = (e, t) => g[e * u + t * l];
	const v = new Uint8Array(a * o * 4);
	for (let e = 0; e < a * o; e++) {
		const t = e * 4;
		const n = s <= 2;
		v[t] = _(e, 0);
		v[t + 1] = n ? _(e, 0) : _(e, 1);
		v[t + 2] = n ? _(e, 0) : _(e, 2);
		v[t + 3] = s === 2 ? _(e, 1) : s === 4 ? _(e, 3) : 255;
	}
	if (l === 1) return {
		width: a,
		height: o,
		pixels: v
	};
	const y = new Uint16Array(a * o);
	for (let e = 0; e < a * o; e++) y[e] = g[e * u] << 8 | g[e * u + 1];
	return {
		width: a,
		height: o,
		pixels: v,
		wide: y
	};
}
//#endregion
export { i as t };

//# sourceMappingURL=pngData.js.map