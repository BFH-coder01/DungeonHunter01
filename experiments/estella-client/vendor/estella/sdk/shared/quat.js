//#region src/math/quat.ts
const e = Math.PI / 180;
const t = 180 / Math.PI;
const n = {
	create(e = 1, t = 0, n = 0, r = 0) {
		return {
			w: e,
			x: t,
			y: n,
			z: r
		};
	},
	clone(e) {
		return {
			w: e.w,
			x: e.x,
			y: e.y,
			z: e.z
		};
	},
	/** `a` applied after `b` (a·b) — a world-space turn composes on the left. */
	mul(e, t) {
		return {
			w: e.w * t.w - e.x * t.x - e.y * t.y - e.z * t.z,
			x: e.w * t.x + e.x * t.w + e.y * t.z - e.z * t.y,
			y: e.w * t.y - e.x * t.z + e.y * t.w + e.z * t.x,
			z: e.w * t.z + e.x * t.y - e.y * t.x + e.z * t.w
		};
	},
	/** A turn of `rad` about one axis. */
	axis(e, t) {
		const n = Math.sin(t / 2);
		return {
			w: Math.cos(t / 2),
			x: e === "x" ? n : 0,
			y: e === "y" ? n : 0,
			z: e === "z" ? n : 0
		};
	},
	/**
	* Unit length. Interpolating quaternions component-wise leaves a shorter
	* one, and writing that scales the model — so anything that lerps must end
	* here.
	*/
	normalize(e) {
		const t = Math.hypot(e.w, e.x, e.y, e.z);
		if (t === 0) return {
			w: 1,
			x: 0,
			y: 0,
			z: 0
		};
		return {
			w: e.w / t,
			x: e.x / t,
			y: e.y / t,
			z: e.z / t
		};
	},
	dot(e, t) {
		return e.w * t.w + e.x * t.x + e.y * t.y + e.z * t.z;
	},
	/** Negated. `-q` and `q` are the same rotation; which one is stored decides
	*  whether a component-wise interpolation takes the short arc or the long one. */
	neg(e) {
		return {
			w: -e.w,
			x: -e.x,
			y: -e.y,
			z: -e.z
		};
	},
	/** The opposite turn. For a unit quaternion — which every stored rotation is
	*  — this is the inverse, and a world direction taken into a local frame by it. */
	conjugate(e) {
		return {
			w: e.w,
			x: -e.x,
			y: -e.y,
			z: -e.z
		};
	},
	/** A vector turned by this rotation (q·v·q⁻¹, expanded). */
	rotate(e, t) {
		const n = 2 * (e.y * t.z - e.z * t.y);
		const r = 2 * (e.z * t.x - e.x * t.z);
		const i = 2 * (e.x * t.y - e.y * t.x);
		return {
			x: t.x + e.w * n + e.y * i - e.z * r,
			y: t.y + e.w * r + e.z * n - e.x * i,
			z: t.z + e.w * i + e.x * r - e.y * n
		};
	},
	/**
	* A rotation as three degrees, applied X then Y then Z about fixed axes —
	* the order every DCC's inspector shows. A rotation purely about Z reads
	* back as (0, 0, angle) and rebuilds exactly.
	*/
	toEuler(e) {
		const { x: n, y: r, z: i, w: a } = e;
		const o = 1 - 2 * (r * r + i * i);
		const s = 2 * (n * r + a * i);
		const c = 2 * (n * i - a * r);
		const l = 2 * (r * i + a * n);
		const u = 1 - 2 * (n * n + r * r);
		const d = Math.asin(Math.max(-1, Math.min(1, -c)));
		if (Math.abs(c) > .999999) {
			const e = 2 * (n * r - a * i);
			const o = 1 - 2 * (n * n + i * i);
			return [
				0,
				d * t,
				Math.atan2(-e, o) * t
			];
		}
		return [
			Math.atan2(l, u) * t,
			d * t,
			Math.atan2(s, o) * t
		];
	},
	/** Inverse of {@link toEuler}. */
	fromEuler(t) {
		const n = (t[0] ?? 0) * e / 2;
		const r = (t[1] ?? 0) * e / 2;
		const i = (t[2] ?? 0) * e / 2;
		const [a, o, s] = [
			Math.cos(n),
			Math.cos(r),
			Math.cos(i)
		];
		const [c, l, u] = [
			Math.sin(n),
			Math.sin(r),
			Math.sin(i)
		];
		return {
			w: a * o * s + c * l * u,
			x: c * o * s - a * l * u,
			y: a * l * s + c * o * u,
			z: a * o * u - c * l * s
		};
	},
	/**
	* The shortest turn taking `from` to `to`; either may be any length. A
	* direction is a way of naming a rotation, so it comes in here — what is
	* stored stays the rotation. Roll about the axis is unconstrained by the pair
	* and is left at none, which is what an aim has to say about it.
	*/
	rotationTo(e, t) {
		const n = Math.hypot(e.x, e.y, e.z);
		const r = Math.hypot(t.x, t.y, t.z);
		if (n === 0 || r === 0) return {
			w: 1,
			x: 0,
			y: 0,
			z: 0
		};
		const i = {
			x: e.x / n,
			y: e.y / n,
			z: e.z / n
		};
		const a = {
			x: t.x / r,
			y: t.y / r,
			z: t.z / r
		};
		const o = i.x * a.x + i.y * a.y + i.z * a.z;
		if (o >= 1 - 1e-9) return {
			w: 1,
			x: 0,
			y: 0,
			z: 0
		};
		if (o <= -1 + 1e-9) {
			const e = Math.abs(i.x) > .9 ? {
				x: 0,
				y: 1,
				z: 0
			} : {
				x: 1,
				y: 0,
				z: 0
			};
			const t = i.y * e.z - i.z * e.y;
			const n = i.z * e.x - i.x * e.z;
			const r = i.x * e.y - i.y * e.x;
			return this.normalize({
				w: 0,
				x: t,
				y: n,
				z: r
			});
		}
		return this.normalize({
			w: 1 + o,
			x: i.y * a.z - i.z * a.y,
			y: i.z * a.x - i.x * a.z,
			z: i.x * a.y - i.y * a.x
		});
	},
	/** Set the Z turn, keeping whatever the other two axes say — the 2D way in. */
	setAngleZ(e, t) {
		const n = e ? this.toEuler(e) : [
			0,
			0,
			0
		];
		return this.fromEuler([
			n[0],
			n[1],
			t
		]);
	},
	/** The Z turn of a 2D rotation, in radians. */
	angleZ(e) {
		return 2 * Math.atan2(e.z, e.w);
	},
	/**
	* The same turn, `t` of the way through it — the shortest arc, so a rotation
	* stored as -q scales the short way round rather than the long one. What a
	* caller handed one frame's worth of turn needs to spend it over two steps.
	*/
	scaled(e, t) {
		const n = this.normalize(e);
		const r = n.w < 0 ? -1 : 1;
		const i = Math.min(1, n.w * r);
		const a = Math.sqrt(Math.max(0, 1 - i * i));
		if (a < 1e-8) return {
			w: 1,
			x: 0,
			y: 0,
			z: 0
		};
		const o = Math.acos(i) * t;
		const s = Math.sin(o) / a * r;
		return {
			w: Math.cos(o),
			x: n.x * s,
			y: n.y * s,
			z: n.z * s
		};
	}
};
//#endregion
export { n as t };

//# sourceMappingURL=quat.js.map