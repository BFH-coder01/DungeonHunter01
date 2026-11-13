import { ar as e } from "./system.js";
import { c as t, l as n, n as r } from "./resourceManager.js";
//#region src/defaults.ts
const i = e.Canvas.defaults;
const a = i.designResolution.x;
const o = i.designResolution.y;
const s = i.pixelsPerUnit;
const c = 512;
const l = { ...e.Sprite.editorDefaults.size };
const u = "Arial";
const d = 24;
const f = 1.2;
const p = .5;
const m = 1 / 60;
const h = {
	x: 0,
	y: -9.81
};
const g = 1 / 60;
const _ = "default";
const v = {
	sceneTransitionDuration: .3,
	sceneTransitionColor: {
		r: 0,
		g: 0,
		b: 0,
		a: 1
	},
	/** The family a Text with no `fontFamily` of its own rasterizes with. */
	defaultFontFamily: u,
	maxDeltaTime: .25,
	maxFixedSteps: 8,
	textCanvasSize: 512,
	assetLoadTimeout: 3e4,
	assetFailureCooldown: 5e3,
	/** Whether several fingers are handled at once, until a game says otherwise with `Input.setMultiTouch`. */
	multiTouch: true,
	/**
	* Resident GPU-texture byte budget (see setTextureBudget). Released-but-
	* budgeted textures stay resident as an evictable LRU cache, so re-entering
	* a scene (or streaming an area back in) revives them instead of
	* re-fetching + re-decoding. 0 turns the cache off (free at refcount 0).
	*/
	textureCacheBudget: 67108864,
	/**
	* Decoded audio-buffer byte budget — the audio mirror of
	* textureCacheBudget. Released buffers stay as an evictable warm cache
	* (instantly playable, revived without re-fetch + re-decode) and the
	* oldest are dropped past this budget. Read live by AudioAPI, so changes
	* apply without re-init. 0 turns the warm cache off.
	*/
	audioCacheBudget: 33554432,
	/**
	* How many bytes of CPU copies the graphics device may keep to survive a GPU
	* loss before it warns (see setRetainedBudget). The engine keeps about 28 KiB
	* of its own; this is one 2048×2048 image. 0 never warns.
	*/
	retainedBudget: 16777216
};
/**
* What every {@link RuntimeBuildConfig} field is when a project says nothing, in the units the config is written in (seconds, milliseconds,
* bytes, `#rrggbb`). A project block carries only what differs from these, so an untouched project ships the bytes it always did.
*/
const y = {
	sceneTransitionDuration: .3,
	sceneTransitionColor: "#000000",
	defaultFontFamily: u,
	maxDeltaTime: .25,
	maxFixedSteps: 8,
	textCanvasSize: 512,
	assetLoadTimeout: 3e4,
	assetFailureCooldown: 5e3,
	textureCacheBudget: 67108864,
	audioCacheBudget: 33554432,
	retainedBudget: 16777216,
	multiTouch: true
};
const b = {
	sceneTransitionDuration: [
		0,
		10,
		false
	],
	maxDeltaTime: [
		.01,
		5,
		false
	],
	maxFixedSteps: [
		1,
		64,
		true
	],
	textCanvasSize: [
		64,
		4096,
		true
	],
	assetLoadTimeout: [
		1e3,
		6e5,
		true
	],
	assetFailureCooldown: [
		0,
		6e5,
		true
	],
	textureCacheBudget: [
		0,
		4294967296,
		true
	],
	audioCacheBudget: [
		0,
		1073741824,
		true
	],
	retainedBudget: [
		0,
		1073741824,
		true
	]
};
/**
* The runtime tuning a project declared, read from untrusted JSON: a field of the wrong type is dropped, a number is held to its range, and a value
* equal to its default is dropped too (absence is how a default is written everywhere else in a project). Nothing here invents a value.
* @experimental
*/
function x(e) {
	const t = e !== null && typeof e === "object" && !Array.isArray(e) ? e : {};
	const n = {};
	for (const [e, [r, i, a]] of Object.entries(b)) {
		const o = t[e];
		if (typeof o !== "number" || !Number.isFinite(o)) continue;
		const s = Math.min(i, Math.max(r, a ? Math.round(o) : o));
		if (s !== y[e]) n[e] = s;
	}
	const r = t.sceneTransitionColor;
	if (typeof r === "string" && /^#[0-9a-f]{6}$/i.test(r) && r.toLowerCase() !== y.sceneTransitionColor) n.sceneTransitionColor = r.toLowerCase();
	if (t.multiTouch === false) n.multiTouch = false;
	const i = t.defaultFontFamily;
	if (typeof i === "string" && i.trim() !== "" && i.length <= 200 && i !== y.defaultFontFamily) n.defaultFontFamily = i;
	return n;
}
function S(e, i) {
	if (i.maxDeltaTime !== void 0) {
		v.maxDeltaTime = i.maxDeltaTime;
		e.setMaxDeltaTime(i.maxDeltaTime);
	}
	if (i.maxFixedSteps !== void 0) {
		v.maxFixedSteps = i.maxFixedSteps;
		e.setMaxFixedSteps(i.maxFixedSteps);
	}
	if (i.textCanvasSize !== void 0) v.textCanvasSize = i.textCanvasSize;
	v.multiTouch = i.multiTouch ?? true;
	if (i.defaultFontFamily !== void 0) v.defaultFontFamily = i.defaultFontFamily;
	if (i.sceneTransitionDuration !== void 0) v.sceneTransitionDuration = i.sceneTransitionDuration;
	if (i.sceneTransitionColor) {
		const e = i.sceneTransitionColor.replace("#", "");
		v.sceneTransitionColor = {
			r: parseInt(e.substring(0, 2), 16) / 255,
			g: parseInt(e.substring(2, 4), 16) / 255,
			b: parseInt(e.substring(4, 6), 16) / 255,
			a: 1
		};
	}
	if (i.assetLoadTimeout !== void 0) v.assetLoadTimeout = i.assetLoadTimeout;
	if (i.assetFailureCooldown !== void 0) v.assetFailureCooldown = i.assetFailureCooldown;
	if (i.textureCacheBudget !== void 0) {
		v.textureCacheBudget = i.textureCacheBudget;
		if (r()) n(i.textureCacheBudget);
	}
	if (i.retainedBudget !== void 0) {
		v.retainedBudget = i.retainedBudget;
		if (r()) t(i.retainedBudget);
	}
	if (i.audioCacheBudget !== void 0) v.audioCacheBudget = i.audioCacheBudget;
}
//#endregion
export { x as _, u as a, f as c, _ as d, l as f, S as g, v as h, g as i, p as l, y as m, a as n, d as o, c as p, m as r, h as s, o as t, s as u };

//# sourceMappingURL=defaults.js.map