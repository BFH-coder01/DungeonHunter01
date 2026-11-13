//#region src/math/random.ts
const e = 4;
const t = 12;
function n(e) {
	e = Math.imul(e ^ e >>> 16, 2246822507);
	e = Math.imul(e ^ e >>> 13, 3266489909);
	return (e ^ e >>> 16) >>> 0;
}
function r(e, t) {
	e = Math.imul(e ^ t, 2654435761);
	return (e << 13 | e >>> 19) >>> 0;
}
/** A 32-bit hash of a seed, stable across hosts. */
function i(e) {
	const t = typeof e === "object" ? e : [e];
	let i = 2166136261;
	for (const e of t) if (typeof e === "number") {
		if (!Number.isFinite(e)) throw new RangeError("[rng] a numeric seed must be finite");
		const t = Math.floor(e);
		i = r(i, t >>> 0);
		i = r(i, Math.floor(t / 4294967296) >>> 0);
		i = r(i, 110);
	} else {
		for (let t = 0; t < e.length; t++) i = r(i, e.charCodeAt(t));
		i = r(i, 115);
	}
	return n(i);
}
var a = class a {
	constructor(i) {
		this.root = i;
		let a = i;
		const o = [];
		for (let t = 0; t < e; t++) {
			a = n(r(a, t + 1));
			o.push(a);
		}
		[this.a, this.b, this.c, this.d] = o;
		for (let e = 0; e < t; e++) this.nextU32();
	}
	nextU32() {
		const e = (this.a + this.b | 0) + this.d | 0;
		this.d = this.d + 1 | 0;
		this.a = this.b ^ this.b >>> 9;
		this.b = this.c + (this.c << 3) | 0;
		this.c = this.c << 21 | this.c >>> 11;
		this.c = this.c + e | 0;
		return e >>> 0;
	}
	float() {
		return this.nextU32() / 4294967296;
	}
	int(e, t) {
		if (!Number.isInteger(e) || !Number.isInteger(t) || t < e) throw new RangeError(`[rng] int(${e}, ${t}) needs integers with min <= max`);
		const n = t - e + 1;
		if (n > 4294967296) throw new RangeError("[rng] int range exceeds 32 bits");
		if (n === 4294967296) return e + this.nextU32();
		const r = 4294967296 - 4294967296 % n;
		let i = this.nextU32();
		while (i >= r) i = this.nextU32();
		return e + i % n;
	}
	chance(e) {
		return this.float() < e;
	}
	pick(e) {
		if (e.length === 0) throw new RangeError("[rng] pick() of an empty list");
		return e[this.int(0, e.length - 1)];
	}
	weighted(e, t) {
		let n = 0;
		const r = e.map((e) => {
			const r = t(e);
			if (!(r >= 0) || !Number.isFinite(r)) throw new RangeError("[rng] a weight must be a finite number >= 0");
			n += r;
			return r;
		});
		if (!(n > 0)) throw new RangeError("[rng] weighted() needs a positive total weight");
		let i = this.float() * n;
		for (let t = 0; t < e.length; t++) {
			i -= r[t];
			if (i < 0 && r[t] > 0) return e[t];
		}
		for (let t = e.length - 1; t >= 0; t--) if (r[t] > 0) return e[t];
		return e[0];
	}
	shuffle(e) {
		const t = e.slice();
		for (let e = t.length - 1; e > 0; e--) {
			const n = this.int(0, e);
			const r = t[e];
			t[e] = t[n];
			t[n] = r;
		}
		return t;
	}
	fork(e) {
		return new a(i([this.root, e]));
	}
};
/** A generator that replays the same numbers for the same seed on every host. */
function o(e) {
	return new a(i(e));
}
//#endregion
export { i as n, o as t };

//# sourceMappingURL=random.js.map