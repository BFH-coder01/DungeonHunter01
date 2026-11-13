//#region src/audio/PlatformAudioBackend.ts
/**
* Where a clip really lies in what a decoder made of it, in seconds: from `lead` to `end`. A decoder that took the
* lead off itself is seen by how long its result is, and is not asked to take it off twice.
*/
function e(e, t) {
	if (!e) return null;
	const n = t > e.seconds + e.lead * .5 ? e.lead : 0;
	return {
		lead: n,
		end: Math.min(t, n + e.seconds)
	};
}
//#endregion
//#region src/audio/audioStreaming.ts
/** A clip at least this long streams when the importer says `auto`. */
const t = 30;
/** A compressed file of unknown length this big streams under `auto` — what 30 seconds of a
*  typical 128 kbps file weighs, rounded up to leave the short effects alone. */
const n = 614400;
/** The PCM a decoded clip costs: what `bytes` would report if it were decoded, and what streaming saves. */
function r(e, t = 48e3, n = 2) {
	return Math.round(Math.max(0, e) * t * n * 4);
}
const i = {
	1: [
		0,
		32,
		40,
		48,
		56,
		64,
		80,
		96,
		112,
		128,
		160,
		192,
		224,
		256,
		320,
		0
	],
	2: [
		0,
		8,
		16,
		24,
		32,
		40,
		48,
		56,
		64,
		80,
		96,
		112,
		128,
		144,
		160,
		0
	]
};
function a(e) {
	if (e.byteLength < 10 || e.getUint8(0) !== 73 || e.getUint8(1) !== 68 || e.getUint8(2) !== 51) return 0;
	return 10 + ((e.getUint8(6) & 127) << 21 | (e.getUint8(7) & 127) << 14 | (e.getUint8(8) & 127) << 7 | e.getUint8(9) & 127);
}
/** Length of a PCM WAV from its header, or null when it is not a RIFF/WAVE we can read. */
function o(e) {
	if (e.byteLength < 44 || e.getUint32(0, false) !== 1380533830 || e.getUint32(8, false) !== 1463899717) return null;
	let t = 0;
	let n = 12;
	while (n + 8 <= e.byteLength) {
		const r = e.getUint32(n, false);
		const i = e.getUint32(n + 4, true);
		if (r === 1718449184 && n + 20 <= e.byteLength) t = e.getUint32(n + 16, true);
		if (r === 1684108385) return t > 0 ? Math.min(i, e.byteLength - (n + 8)) / t : null;
		n += 8 + i + (i & 1);
	}
	return null;
}
/** Length of a constant-bitrate MP3 from its first frame header and the file size; null if it is not one. */
function s(e) {
	const t = a(e);
	for (let n = t; n + 4 <= Math.min(e.byteLength, t + 4096); n++) {
		if (e.getUint8(n) !== 255 || (e.getUint8(n + 1) & 224) !== 224) continue;
		const t = e.getUint8(n + 1);
		const r = e.getUint8(n + 2);
		const a = t >> 3 & 3;
		const o = t >> 1 & 3;
		const s = r >> 4;
		if (a === 1 || o !== 1 || s === 0 || s === 15) continue;
		const c = i[a === 3 ? 1 : 2][s];
		return c > 0 ? (e.byteLength - n) * 8 / (c * 1e3) : null;
	}
	return null;
}
/**
* How long a compressed clip plays, read from its header without decoding it.
* WAV is exact; an MP3 is exact at a constant bitrate and an estimate at a variable one; any
* other container is unknown (null) and the caller falls back to its size.
*/
function c(e) {
	const t = new DataView(e);
	return o(t) ?? s(t);
}
/** Whether a clip that arrived as `data` is streamed, given what the importer said. */
function l(e, t) {
	if (e === "streaming") return true;
	if (e === "decompress") return false;
	const r = c(t);
	return r === null ? t.byteLength >= n : r >= 30;
}
//#endregion
export { e as i, c as n, l as r, r as t };

//# sourceMappingURL=audioStreaming.js.map