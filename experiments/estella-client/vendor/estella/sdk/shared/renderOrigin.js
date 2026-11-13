//#region src/render/renderOrigin.ts
const e = {
	step: 0,
	x: 0,
	y: 0,
	z: 0
};
let t = {
	x: 0,
	y: 0,
	z: 0
};
/** The origin now. Read-only: it moves by {@link followRenderOrigin}. */
function n() {
	return e;
}
/** Turns the origin on (a step above 0, in world units) or off (0). Turning it off returns it to zero. */
function r(t) {
	e.step = Math.max(t, 0);
	if (e.step === 0) {
		e.x = 0;
		e.y = 0;
		e.z = 0;
	}
}
/**
* Keeps the origin near the eye: it moves to the eye rounded to `step` once the eye is further than `step` from it. True if it moved.
* Call it before the frame's cameras are built, with the eye the frame is drawn from.
*/
function i(t, n, r) {
	const i = e.step;
	if (i <= 0) return false;
	if (Math.abs(t - e.x) <= i && Math.abs(n - e.y) <= i && Math.abs(r - e.z) <= i) return false;
	e.x = Math.round(t / i) * i;
	e.y = Math.round(n / i) * i;
	e.z = Math.round(r / i) * i;
	return true;
}
/** Hands the origin to the engine if it is not what the engine was last given. */
function a(n) {
	if (t.x === e.x && t.y === e.y && t.z === e.z) return;
	t = {
		x: e.x,
		y: e.y,
		z: e.z
	};
	n(e.x, e.y, e.z);
}
//#endregion
export { r as i, a as n, n as r, i as t };

//# sourceMappingURL=renderOrigin.js.map