//#region src/asset/meshFormat.ts
/**
* @file  .esmesh — GPU-resident geometry on disk.
*
*        Self-describing: the channel table is written out rather than implied by
*        a mask, so a file states its own strides and offsets and a reader needs
*        no table of its own. Adding a channel is then an append to the vocabulary
*        below, not a format version — and a mesh without normals stays a file
*        without normals instead of one carrying zeroes.
*/
/** Magic 'ESMH', little-endian. */
const e = 1213027141;
const t = 4;
/** The last version whose indices are always 32-bit. */
const n = 3;
/** Flag bits at header offset 50, beside the morph-normals bit. */
const r = 1;
/** v4: the index section is 16-bit. Widened to 32-bit when read, so nothing downstream
*  of the decoder knows the file was narrower. */
const i = 2;
/** Largest vertex index a 16-bit index can name. */
const a = 65535;
/** Whether every index fits in 16 bits — half the index bytes, for any mesh that small. */
function o(e) {
	for (let t = 0; t < e.length; t++) if (e[t] > a) return false;
	return true;
}
/** v1 had no joint count; a file that predates skinning reads with the shorter one. */
const s = 44;
/** v2 ended at the joint count; a file that predates morph targets reads with that. */
const c = 48;
const l = 56;
const u = 8;
/** One inverse bind matrix: 16 floats. */
const d = 64;
/**
* Joints one draw can be posed by — what the RENDERER holds (256 mat4 is 16KB,
* exactly WebGL2's guaranteed block), not what the format carries. A mesh bound
* to more is drawn in its bind pose: a joint index no uploaded matrix answers
* moves the vertex nowhere in particular. Mirrors GfxEnums.hpp.
*/
const f = 256;
/**
* What a channel means. The value IS the shader attribute location, and the first
* three match the 2D batch layout, so one attribute vocabulary serves both vertex
* sources. Append only: these numbers are serialized.
*/
const p = {
	Position: 0,
	Color: 1,
	TexCoord0: 2,
	Normal: 3,
	Tangent: 4,
	/** Which joints move this vertex — indices into the mesh's own bind matrices. */
	Joints: 5,
	/** How much each of those four joints moves it. */
	Weights: 6,
	/** A second UV set: what an unwrap produces for a lightmap, a detail pass or an
	*  AO atlas. Carried because the boundary is lossy in one direction — a source
	*  that had one cannot be re-derived — and read by nothing yet, which is why
	*  `meshShaderReads` in GfxEnums.hpp keeps it out of the vertex LAYOUT. */
	TexCoord1: 7
};
/** How a channel's components are stored. Append only — serialized. */
/** Every id {@link MeshChannel} declares, for validating a file's channel table. */
const m = new Set(Object.values(p));
const h = {
	Float32: 0,
	UNorm8: 1,
	/** Joint indices: glTF writes them as u8 or u16, and u16 loses neither. */
	UInt16: 2
};
/** Bytes one component of a channel type occupies. */
function g(e) {
	if (e === h.UNorm8) return 1;
	if (e === h.UInt16) return 2;
	return 4;
}
/**
* Byte size of one vertex for these channels, laid out in the order given.
*
* Rounded up to 4 so every channel starts aligned: WebGL rejects a float
* attribute at an unaligned offset, and a colour packed between two of them is
* exactly how that happens.
*/
function _(e) {
	const t = [];
	let n = 0;
	for (const r of e) {
		t.push({
			...r,
			offset: n
		});
		n += r.components * g(r.type);
		n = n + 3 & -4;
	}
	return {
		channels: t,
		vertexStride: n
	};
}
/** Bytes the target names occupy: each carries its own length, the whole padded
*  to 4 so the deltas behind it start where a float may be written. */
function v(e) {
	return e.reduce((e, t) => e + 2 + t.length, 0) + 3 & -4;
}
function y(a) {
	const s = (a.inverseBindMatrices?.length ?? 0) / 16;
	const c = (a.morph?.names ?? []).map((e) => new TextEncoder().encode(e));
	const f = v(c);
	const p = a.morph?.deltas.length ?? 0;
	const m = o(a.indices);
	const g = m ? 2 : 4;
	const _ = l + a.channels.length * u + a.vertexCount * a.vertexStride + a.indices.length * g + s * d + f + p * 4;
	const y = new Uint8Array(_);
	const b = new DataView(y.buffer);
	b.setUint32(0, e, true);
	b.setUint16(4, m ? t : n, true);
	b.setUint16(6, a.channels.length, true);
	b.setUint32(8, a.vertexStride, true);
	b.setUint32(12, a.vertexCount, true);
	b.setUint32(16, a.indices.length, true);
	for (let e = 0; e < 3; e++) {
		b.setFloat32(20 + e * 4, a.aabbMin[e], true);
		b.setFloat32(32 + e * 4, a.aabbMax[e], true);
	}
	b.setUint32(44, s, true);
	b.setUint16(48, c.length, true);
	b.setUint16(50, (a.morph?.hasNormals ? r : 0) | (m ? i : 0), true);
	b.setUint32(52, f, true);
	let x = l;
	for (const e of a.channels) {
		b.setUint8(x, e.semantic);
		b.setUint8(x + 1, e.components);
		b.setUint8(x + 2, e.type);
		b.setUint8(x + 3, e.type === h.UNorm8 ? 1 : 0);
		b.setUint32(x + 4, e.offset, true);
		x += u;
	}
	y.set(a.vertices.subarray(0, a.vertexCount * a.vertexStride), x);
	x += a.vertexCount * a.vertexStride;
	if (m) for (let e = 0; e < a.indices.length; e++) b.setUint16(x + e * 2, a.indices[e], true);
	else y.set(new Uint8Array(a.indices.buffer, a.indices.byteOffset, a.indices.length * 4), x);
	x += a.indices.length * g;
	if (a.inverseBindMatrices) for (let e = 0; e < a.inverseBindMatrices.length; e++) b.setFloat32(x + e * 4, a.inverseBindMatrices[e], true);
	x += s * d;
	if (a.morph) {
		let e = x;
		for (const t of c) {
			b.setUint16(e, t.length, true);
			y.set(t, e + 2);
			e += 2 + t.length;
		}
		x += f;
		for (let e = 0; e < a.morph.deltas.length; e++) b.setFloat32(x + e * 4, a.morph.deltas[e], true);
	}
	return y;
}
function b(a) {
	const o = new DataView(a.buffer, a.byteOffset, a.byteLength);
	if (a.byteLength < s || o.getUint32(0, true) !== e) throw new Error("not an .esmesh file");
	const f = o.getUint16(4, true);
	if (f > t) throw new Error(`.esmesh version ${f} is newer than this engine understands (${t})`);
	const p = o.getUint16(6, true);
	if (p > m.size) throw new Error(`.esmesh declares ${p} channels; the format has ${m.size}`);
	const h = o.getUint32(8, true);
	const g = o.getUint32(12, true);
	const _ = o.getUint32(16, true);
	const v = [
		o.getFloat32(20, true),
		o.getFloat32(24, true),
		o.getFloat32(28, true)
	];
	const y = [
		o.getFloat32(32, true),
		o.getFloat32(36, true),
		o.getFloat32(40, true)
	];
	const b = f >= 3 ? l : f >= 2 ? c : s;
	const x = f >= 2 ? o.getUint32(44, true) : 0;
	const S = f >= 3 ? o.getUint16(48, true) : 0;
	const C = f >= 3 ? o.getUint16(50, true) : 0;
	const w = (C & r) !== 0;
	const T = f > n && (C & i) !== 0 ? 2 : 4;
	const E = f >= 3 ? o.getUint32(52, true) : 0;
	const D = w ? 6 : 3;
	const O = [];
	let k = b;
	for (let e = 0; e < p; e++) {
		const t = o.getUint8(k);
		if (!m.has(t)) throw new Error(`.esmesh channel ${e} has semantic ${t}, which the format does not define`);
		O.push({
			semantic: t,
			components: o.getUint8(k + 1),
			type: o.getUint8(k + 2),
			offset: o.getUint32(k + 4, true)
		});
		k += u;
	}
	const A = g * h;
	const j = S * g * D;
	const M = k + A + _ * T + x * d + E + j * 4;
	if (a.byteLength < M) throw new Error(`.esmesh is truncated: ${a.byteLength} bytes, header describes ${M}`);
	const N = a.subarray(k, k + A);
	const P = new Uint32Array(_);
	const F = k + A;
	if (T === 2) for (let e = 0; e < _; e++) P[e] = o.getUint16(F + e * 2, true);
	else for (let e = 0; e < _; e++) P[e] = o.getUint32(F + e * 4, true);
	const I = {
		channels: O,
		vertexStride: h,
		vertexCount: g,
		vertices: N,
		indices: P,
		aabbMin: v,
		aabbMax: y
	};
	const L = F + _ * T;
	if (x > 0) {
		const e = new Float32Array(x * 16);
		for (let t = 0; t < e.length; t++) e[t] = o.getFloat32(L + t * 4, true);
		I.inverseBindMatrices = e;
	}
	if (S > 0) {
		const e = L + x * d;
		const t = [];
		let n = e;
		for (let r = 0; r < S; r++) {
			const i = o.getUint16(n, true);
			if (n + 2 + i > e + E) throw new Error(`.esmesh morph target ${r} names ${i} bytes, which runs past the name section`);
			t.push(new TextDecoder().decode(a.subarray(n + 2, n + 2 + i)));
			n += 2 + i;
		}
		const r = e + E;
		const i = new Float32Array(j);
		for (let e = 0; e < i.length; e++) i[e] = o.getFloat32(r + e * 4, true);
		I.morph = {
			names: t,
			hasNormals: w,
			deltas: i
		};
	}
	return I;
}
/** The channel table as the engine takes it: one 8-byte record per channel. */
function x(e) {
	const t = new Uint8Array(e.length * u);
	const n = new DataView(t.buffer);
	let r = 0;
	for (const t of e) {
		n.setUint8(r, t.semantic);
		n.setUint8(r + 1, t.components);
		n.setUint8(r + 2, t.type);
		n.setUint8(r + 3, t.type === h.UNorm8 ? 1 : 0);
		n.setUint32(r + 4, t.offset, true);
		r += u;
	}
	return t;
}
//#endregion
export { x as a, b as i, p as n, y as o, h as r, _ as s, f as t };

//# sourceMappingURL=meshFormat.js.map