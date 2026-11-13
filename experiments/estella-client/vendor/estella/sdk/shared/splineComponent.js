import { $t as e } from "./system.js";
//#region src/spline/curve.ts
const t = 16;
/** The curve through `points`, open or closed. */
var n = class {
	constructor(e, n = false) {
		this.closed = n && e.length >= 3;
		const r = e.length;
		const a = r < 2 ? 0 : this.closed ? r : r - 1;
		const o = a * t + (this.closed ? 0 : 1);
		const s = r === 0 ? 0 : r === 1 ? 1 : o;
		this.count = s;
		this.px = new Float64Array(s);
		this.py = new Float64Array(s);
		this.pz = new Float64Array(s);
		this.pw = new Float64Array(s);
		this.ps = new Float64Array(s);
		if (r === 1) {
			this.px[0] = e[0].x;
			this.py[0] = e[0].y;
			this.pz[0] = e[0].z;
			this.pw[0] = e[0].width;
		}
		const c = (t) => {
			if (this.closed) return e[(t % r + r) % r];
			if (t < 0) {
				const t = e[0], n = e[1];
				return {
					x: 2 * t.x - n.x,
					y: 2 * t.y - n.y,
					z: 2 * t.z - n.z,
					width: t.width
				};
			}
			if (t >= r) {
				const t = e[r - 1], n = e[r - 2];
				return {
					x: 2 * t.x - n.x,
					y: 2 * t.y - n.y,
					z: 2 * t.z - n.z,
					width: t.width
				};
			}
			return e[t];
		};
		let l = 0;
		for (let e = 0; e < a; e++) {
			const n = c(e - 1), r = c(e), o = c(e + 1), s = c(e + 2);
			const u = !this.closed && e === a - 1;
			for (let e = 0; e < t + (u ? 1 : 0); e++) {
				const a = e / t;
				const c = i(n, r, o, s, a);
				this.px[l] = c[0];
				this.py[l] = c[1];
				this.pz[l] = c[2];
				this.pw[l] = r.width + (o.width - r.width) * (a * a * (3 - 2 * a));
				l++;
			}
		}
		let u = 0;
		for (let e = 0; e < s; e++) {
			if (e > 0) u += Math.hypot(this.px[e] - this.px[e - 1], this.py[e] - this.py[e - 1], this.pz[e] - this.pz[e - 1]);
			this.ps[e] = u;
		}
		if (this.closed && s > 0) u += Math.hypot(this.px[0] - this.px[s - 1], this.py[0] - this.py[s - 1], this.pz[0] - this.pz[s - 1]);
		this.length = u;
	}
	/** The index of the piece `s` falls in, and how far along it (0 to 1). */
	locate(e) {
		const t = this.count;
		if (t < 2) return [0, 0];
		const n = this.closed ? (e % this.length + this.length) % this.length : Math.min(Math.max(e, 0), this.length);
		let r = 0, i = t - 1;
		const a = this.closed ? this.ps[t - 1] : Infinity;
		if (this.closed && n >= a) return [t - 1, (n - a) / Math.max(this.length - a, 1e-12)];
		while (i - r > 1) {
			const e = r + i >> 1;
			if (this.ps[e] <= n) r = e;
			else i = e;
		}
		const o = this.ps[r + 1] - this.ps[r];
		return [r, o > 0 ? (n - this.ps[r]) / o : 0];
	}
	next(e) {
		return this.closed ? (e + 1) % this.count : Math.min(e + 1, this.count - 1);
	}
	/** The point a distance `s` along the curve. Past either end of an open curve it is the end; a closed curve goes round. */
	position(e) {
		if (this.count === 0) return [
			0,
			0,
			0
		];
		const [t, n] = this.locate(e);
		const i = this.next(t);
		return [
			r(this.px[t], this.px[i], n),
			r(this.py[t], this.py[i], n),
			r(this.pz[t], this.pz[i], n)
		];
	}
	/** The unit direction of travel at distance `s`. */
	tangent(e) {
		if (this.count < 2) return [
			0,
			0,
			1
		];
		const [t] = this.locate(e);
		const n = this.next(t);
		let r = this.px[n] - this.px[t], i = this.py[n] - this.py[t], a = this.pz[n] - this.pz[t];
		if (n === t) {
			r = this.px[t] - this.px[t - 1];
			i = this.py[t] - this.py[t - 1];
			a = this.pz[t] - this.pz[t - 1];
		}
		const o = Math.hypot(r, i, a) || 1;
		return [
			r / o,
			i / o,
			a / o
		];
	}
	/** The width at distance `s`. */
	width(e) {
		if (this.count === 0) return 0;
		const [t, n] = this.locate(e);
		return r(this.pw[t], this.pw[this.next(t)], n);
	}
	/** Where on the curve (x, z) is nearest, measured in the xz plane. */
	nearest(e, t) {
		let n = Infinity, r = 0, i = 0;
		const a = this.closed ? this.count : this.count - 1;
		for (let o = 0; o < a; o++) {
			const a = this.next(o);
			const s = this.px[o], c = this.pz[o];
			const l = this.px[a] - s, u = this.pz[a] - c;
			const d = l * l + u * u;
			const f = d > 0 ? Math.min(Math.max(((e - s) * l + (t - c) * u) / d, 0), 1) : 0;
			const p = e - (s + f * l), m = t - (c + f * u);
			const h = p * p + m * m;
			if (h < n) {
				n = h;
				const e = o === this.count - 1 ? this.length - this.ps[o] : this.ps[a] - this.ps[o];
				r = this.ps[o] + f * e;
				i = Math.sign(l * m - u * p);
			}
		}
		return {
			s: r,
			distance: Math.sqrt(n),
			side: i
		};
	}
};
function r(e, t, n) {
	return e + (t - e) * n;
}
/**
* The centripetal Catmull-Rom curve between p1 and p2 (`t` 0 to 1), through p0 and p3: its knots are spaced by the square root of the distance
* between points, which is what keeps it from looping or cusping where the points are close at one end and far at the other, as the
* uniform one does.
*/
function i(e, t, n, r, i) {
	const a = (e, t) => Math.max(Math.hypot(t.x - e.x, t.y - e.y, t.z - e.z) ** .5, 1e-4);
	const o = 0, s = o + a(e, t), c = s + a(t, n), l = c + a(n, r);
	const u = s + i * (c - s);
	const d = (e, t, n, r) => {
		const i = (r - u) / (r - n), a = (u - n) / (r - n);
		return [
			e[0] * i + t[0] * a,
			e[1] * i + t[1] * a,
			e[2] * i + t[2] * a
		];
	};
	const f = (e) => [
		e.x,
		e.y,
		e.z
	];
	const p = d(f(e), f(t), o, s), m = d(f(t), f(n), s, c), h = d(f(n), f(r), c, l);
	return d(d(p, m, o, c), d(m, h, s, l), s, c);
}
//#endregion
//#region src/spline/splineComponent.ts
/**
* @file    splineComponent.ts
* @brief   The Spline component alone, which the plugin that drives it and what is built from it both read.
*/
/**
* A curve through points. It is read by what follows it (a river's `WaterBody` on the same entity, a {@link PathFollower} on another).
*
* @experimental
*/
const a = e("Spline", {
	points: [{
		x: -10,
		y: 0,
		z: 0,
		width: 4
	}, {
		x: 10,
		y: 0,
		z: 0,
		width: 4
	}],
	closed: false
}, { fields: {
	points: {
		category: "Shape",
		tooltip: "The points the curve passes through, in order, in the entity's own space. Each carries the width of whatever follows the curve there."
	},
	closed: {
		category: "Shape",
		tooltip: "Join the end of the curve to its start (three points or more)."
	}
} });
//#endregion
export { n, a as t };

//# sourceMappingURL=splineComponent.js.map