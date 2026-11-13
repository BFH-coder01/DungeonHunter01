//#region src/device/types.ts
const e = {
	level: null,
	charging: null,
	thermal: null
};
const t = { status: "ok" };
const n = { status: "unavailable" };
const r = {
	accelerometer: false,
	gyroscope: false,
	orientation: false,
	vibration: false,
	vibrationIntensity: false,
	keepScreenOn: false,
	fullscreen: false,
	pointerLock: false
};
function i(e) {
	const t = e?.name;
	return {
		status: t === "NotSupportedError" ? "unavailable" : t === "NotAllowedError" || t === "SecurityError" ? "denied" : "failed",
		reason: e instanceof Error ? e.message : String(e)
	};
}
//#endregion
export { i as a, e as i, n, r, t };

//# sourceMappingURL=types.js.map