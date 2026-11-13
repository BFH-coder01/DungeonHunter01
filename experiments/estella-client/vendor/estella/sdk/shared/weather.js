import { o as e, r as t } from "./effects.js";
//#region src/postprocess/weather.ts
const n = {
	sun: 1,
	sky: 1,
	sunTint: [
		1,
		1,
		1
	],
	shadowSoftness: 1,
	shadowStrength: 1,
	fogDensity: 1,
	fogTint: [
		.7,
		.72,
		.76
	],
	fogTintAmount: 0,
	fogGlow: 1,
	skyFog: 1,
	saturation: 1,
	contrast: 1,
	exposure: 0,
	rain: 0,
	wetness: 0,
	puddles: 0,
	snow: 0,
	ssr: 1,
	reflection: 1,
	reflectionSaturation: 1,
	overcast: 0,
	sound: 0,
	wind: 1,
	waves: 1
};
/** The presets every project has. Their ids are the dropdown's values, so they only ever grow. */
const r = 0;
const i = 1;
const a = 2;
const o = 3;
const s = 4;
const c = 5;
/** What `target` says when there is nothing to move toward. */
const l = -1;
const u = /* @__PURE__ */ new Map();
const d = /* @__PURE__ */ new Map();
let f = 100;
function p(e) {
	return {
		...n,
		...e,
		sunTint: e.sunTint ?? n.sunTint,
		fogTint: e.fogTint ?? n.fogTint
	};
}
function m(e, t, n) {
	u.set(e, {
		name: t,
		state: p(n)
	});
	d.set(t, e);
}
m(0, "clear", {});
m(1, "mist", {
	sun: .45,
	sky: .9,
	shadowSoftness: 3,
	shadowStrength: .8,
	fogDensity: 8,
	fogTint: [
		.86,
		.86,
		.84
	],
	fogTintAmount: .7,
	fogGlow: 1.8,
	skyFog: 1.7,
	saturation: .86,
	contrast: .94,
	exposure: .2,
	wetness: .2,
	puddles: .1,
	ssr: 1.3,
	reflection: .85,
	reflectionSaturation: .9,
	overcast: .55,
	wind: .4,
	waves: .6
});
m(2, "overcast", {
	sun: .25,
	sky: .85,
	sunTint: [
		.9,
		.93,
		1
	],
	shadowSoftness: 8,
	shadowStrength: .5,
	fogDensity: 3,
	fogTint: [
		.62,
		.66,
		.72
	],
	fogTintAmount: .5,
	fogGlow: .3,
	skyFog: 1.4,
	saturation: .85,
	contrast: .96,
	exposure: .25,
	wetness: .1,
	ssr: 1.2,
	reflection: .7,
	reflectionSaturation: .7,
	overcast: .95,
	wind: 1.5,
	waves: 1.3
});
m(3, "rain", {
	sun: .04,
	sky: .75,
	sunTint: [
		.8,
		.86,
		1
	],
	shadowSoftness: 10,
	shadowStrength: .3,
	fogDensity: 5.5,
	fogTint: [
		.58,
		.63,
		.7
	],
	fogTintAmount: .8,
	fogGlow: 0,
	skyFog: 1.7,
	saturation: .73,
	contrast: .93,
	exposure: .45,
	rain: 1.1,
	wetness: 1,
	puddles: .6,
	ssr: 2.6,
	reflection: .55,
	reflectionSaturation: .5,
	overcast: .9,
	sound: 1,
	wind: 1.9,
	waves: 1.5
});
m(5, "snow", {
	sun: .7,
	sky: 1.05,
	sunTint: [
		.92,
		.95,
		1
	],
	shadowSoftness: 2,
	shadowStrength: .7,
	fogDensity: 1.8,
	fogTint: [
		.82,
		.85,
		.9
	],
	fogTintAmount: .5,
	skyFog: 1.3,
	saturation: .85,
	contrast: .96,
	exposure: .1,
	snow: .85,
	overcast: .75,
	wind: .8
});
m(4, "storm", {
	sun: .02,
	sky: .5,
	sunTint: [
		.7,
		.78,
		1
	],
	shadowSoftness: 10,
	shadowStrength: .2,
	fogDensity: 8,
	fogTint: [
		.4,
		.44,
		.5
	],
	fogTintAmount: .9,
	fogGlow: 0,
	skyFog: 1.8,
	saturation: .6,
	contrast: .9,
	exposure: .8,
	rain: 2.2,
	wetness: 1,
	puddles: 1,
	ssr: 3,
	reflection: .4,
	reflectionSaturation: .35,
	overcast: 1,
	sound: 1.6,
	wind: 3.2,
	waves: 2.4
});
/**
* Adds a weather of the project's own, and returns the id it answers to.
*
* @details A preset names only what it changes; the rest is neutral. Registering a name again replaces it, so a
*          project can retune a built-in one. A custom id is for code (`weatherTo`, a component's `preset` value) — the
*          Inspector's dropdown lists the built-ins.
*
* @beta
*/
function h(e, t) {
	const n = d.get(e) ?? f++;
	m(n, e, t);
	return n;
}
/** The id a preset answers to, or undefined. @beta */
function g(e) {
	return d.get(e);
}
/** Every preset, built-in first. @beta */
function _() {
	return [...u.entries()].sort((e, t) => e[0] - t[0]).map(([, e]) => e.name);
}
const v = (e) => e * e * (3 - 2 * e);
const y = (e, t, n) => e + (t - e) * n;
/**
* The weather `progress` of the way from one preset to another, eased so a transition starts and ends gently.
*
* @beta
*/
function b(e, t, n) {
	const r = (u.get(e) ?? u.get(0)).state;
	if (t === -1 || n <= 0) return {
		...r,
		sunTint: [...r.sunTint],
		fogTint: [...r.fogTint]
	};
	const i = (u.get(t) ?? u.get(0)).state;
	const a = v(Math.min(Math.max(n, 0), 1));
	const o = {};
	for (const e of Object.keys(r)) {
		const t = r[e];
		const n = i[e];
		o[e] = Array.isArray(t) ? t.map((e, t) => y(e, n[t], a)) : y(t, n, a);
	}
	return o;
}
const x = {
	Lights: 1,
	Fog: 2,
	Rain: 4,
	Grade: 8,
	Exposure: 16,
	Reflections: 32,
	Sound: 64,
	/** The plants' sway and the waves' height. */
	Wind: 128,
	All: 255
};
/** The state the frame is under, or null when no Weather component is. Set by the weather system, read by the volumes. */
let S = null;
function C(e, t = x.All) {
	S = e ? {
		state: e,
		drive: t
	} : null;
}
/** @beta */
function w() {
	return S ? S.state : null;
}
/** The bits of {@link WeatherDrive} the current weather has been asked to apply. */
function T() {
	return S ? S.drive : 0;
}
/** What an effect's uniform is now: the scene's word if it said one, the effect's own default if it did not. */
function E(n, r, i, a = 0) {
	const o = n.uniforms.get(i);
	if (o !== void 0) return o;
	const s = t(r)?.uniforms.find((e) => e.name === i);
	return s ? e(s).defaultValue : a;
}
function D(e, t) {
	let n = e.get(t);
	if (!n) {
		n = {
			enabled: true,
			uniforms: /* @__PURE__ */ new Map(),
			textures: /* @__PURE__ */ new Map(),
			colors: /* @__PURE__ */ new Map()
		};
		e.set(t, n);
	}
	return n;
}
const O = (e, t, n) => ({
	r: e.r * (1 - n) + t[0] * n,
	g: e.g * (1 - n) + t[1] * n,
	b: e.b * (1 - n) + t[2] * n,
	a: e.a
});
/**
* Applies the weather to what the volumes blended: the effects the scene authored are scaled and tinted, and the
* ones a weather brings with it (rain, and the grade a weather implies) are added when the scene has none.
*
* @details Multipliers act on whatever the scene resolved — the authored density, the authored saturation — so a scene
*          that fogs itself thinly stays thinner than one that fogs itself thickly in the same rain.
*/
function k(e, n, r) {
	if (r & x.Fog) {
		const r = e.get("heightFog");
		if (r && r.enabled) {
			r.uniforms.set("u_density", E(r, "heightFog", "u_density") * n.fogDensity);
			r.uniforms.set("u_inscatter", E(r, "heightFog", "u_inscatter") * n.fogGlow);
			r.uniforms.set("u_volumetric", E(r, "heightFog", "u_volumetric") * n.fogGlow);
			r.uniforms.set("u_skyFog", Math.min(E(r, "heightFog", "u_skyFog") * n.skyFog, 1));
			const e = r.colors.get("u_fogColor") ?? t("heightFog")?.colors?.find((e) => e.name === "u_fogColor")?.defaultValue;
			if (e && n.fogTintAmount > 0) r.colors.set("u_fogColor", O(e, n.fogTint, n.fogTintAmount));
		}
	}
	if (r & x.Fog) {
		const r = e.get("mist2d");
		if (r && r.enabled) {
			r.uniforms.set("u_density", Math.min(E(r, "mist2d", "u_density") * (1 + .25 * Math.log(Math.max(n.fogDensity, 1))), 1));
			r.uniforms.set("u_coverage", Math.min(E(r, "mist2d", "u_coverage") * (1 + .04 * (n.fogDensity - 1)), 1));
			r.uniforms.set("u_glow", E(r, "mist2d", "u_glow") * Math.min(n.fogGlow, 1.2));
			const e = r.colors.get("u_fogColor") ?? t("mist2d")?.colors?.find((e) => e.name === "u_fogColor")?.defaultValue;
			if (e && n.fogTintAmount > 0) r.colors.set("u_fogColor", O(e, n.fogTint, n.fogTintAmount));
		}
	}
	if (r & x.Fog) {
		const t = e.get("skyAtmosphere");
		if (t && t.enabled) t.uniforms.set("u_overcast", Math.max(E(t, "skyAtmosphere", "u_overcast"), n.overcast));
	}
	if (r & x.Rain) {
		if (n.rain > .001 || n.wetness > .001) {
			const t = e.get("rain2d");
			const r = t && t.enabled ? "rain2d" : "rain";
			const i = e.has(r);
			const a = D(e, r);
			const o = (e, t) => i ? Math.max(E(a, r, e), t) : t;
			a.uniforms.set("u_intensity", o("u_intensity", n.rain));
			a.uniforms.set("u_wetness", o("u_wetness", n.wetness));
			a.uniforms.set("u_puddles", o("u_puddles", n.puddles));
		}
		const t = e.get("ssr");
		if (t && t.enabled) {
			t.uniforms.set("u_intensity", E(t, "ssr", "u_intensity") * n.ssr);
			t.uniforms.set("u_wetness", Math.max(E(t, "ssr", "u_wetness"), n.wetness));
			t.uniforms.set("u_puddles", Math.max(E(t, "ssr", "u_puddles"), n.puddles));
		}
	}
	if (r & x.Rain && (n.snow > .001 || e.has("snowCover"))) {
		const t = e.has("snowCover");
		const r = D(e, "snowCover");
		r.uniforms.set("u_amount", t ? Math.max(E(r, "snowCover", "u_amount"), n.snow) : n.snow);
	}
	if (r & x.Grade) {
		const t = Math.abs(n.saturation - 1) < .001 && Math.abs(n.contrast - 1) < .001;
		const r = e.get("colorGrade");
		if (r && r.enabled) {
			r.uniforms.set("u_saturation", E(r, "colorGrade", "u_saturation", 1) * n.saturation);
			r.uniforms.set("u_contrast", E(r, "colorGrade", "u_contrast", 1) * n.contrast);
		} else if (!t) {
			const t = D(e, "colorGrade");
			t.uniforms.set("u_saturation", n.saturation);
			t.uniforms.set("u_contrast", n.contrast);
		}
	}
	if (r & x.Exposure) {
		const t = e.get("autoExposure");
		if (t && t.enabled) t.uniforms.set("u_bias", E(t, "autoExposure", "u_bias") + n.exposure);
		else if (Math.abs(n.exposure) > .001) {
			const t = e.get("colorGrade");
			if (t && t.enabled) t.uniforms.set("u_exposure", E(t, "colorGrade", "u_exposure") + n.exposure);
		}
	}
}
//#endregion
export { o as a, x as c, w as d, T as f, _ as g, g as h, a as i, k as l, C as m, i as n, c as o, h as p, l as r, s, r as t, b as u };

//# sourceMappingURL=weather.js.map