import { o as e } from "./worldUnits.js";
import { n as t, t as n } from "./effectSources.js";
//#region src/postprocess/voxelAtlas.ts
/** The Voxel GI fallback's atlas, and where the engine is told to make the memory it keeps for the pass that writes it. */
const r = {
	width: 2048,
	height: 1024
};
//#endregion
//#region src/postprocess/fogOfWarMask.ts
/** The samplers the maps are bound to: where a viewer has ever seen, and where one sees now. */
const i = "u_fogExplored";
const a = "u_fogVisible";
/** The world rectangle the maps cover: its low corner and its size. Written with the maps each frame, so nobody authors them. */
const o = [
	"L",
	"B",
	"W",
	"H"
].map((e) => ({
	name: `u_fog${e}`,
	label: `Fog Map ${e}`,
	min: -1e9,
	max: 1e9,
	step: 1,
	defaultValue: 0,
	internal: true
}));
//#endregion
//#region src/postprocess/rainShelterMask.ts
/** The sampler the mask is bound to. */
const s = "u_shelterMask";
const c = 2048;
/** The world rectangle the mask covers: its low corner and its size. Written with the mask each frame, so nobody authors them. */
const l = [
	"L",
	"B",
	"W",
	"H"
].map((e) => ({
	name: `u_mask${e}`,
	label: `Shelter Mask ${e}`,
	min: -1e9,
	max: 1e9,
	step: 1,
	defaultValue: 0,
	internal: true
}));
//#endregion
//#region src/postprocess/effects.ts
/** The factories of the built-in effects' shaders. Calling one needs the group that carries it installed. */
const u = t();
const d = t();
const f = t();
const p = t();
const m = t();
/**
* A uniform as it reads in this project: a world-unit one's default and range scaled to the project's units per metre
* (a length by the scale, a rate per length by its inverse), any other as declared. What the volume system fills an
* unset uniform with, and what an inspector offers.
*/
function h(t) {
	if (!t.worldUnits) return t;
	const n = e();
	if (n === 1) return t;
	const r = t.worldUnits === 1 ? n : 1 / n;
	const i = t.min * r, a = t.max * r;
	return {
		...t,
		defaultValue: t.defaultValue * r,
		min: Math.min(i, a),
		max: Math.max(i, a),
		step: t.step * r
	};
}
const g = /* @__PURE__ */ new Map();
function _(e) {
	g.set(e.type, e);
}
function v(e) {
	return g.get(e);
}
/**
* The names of every pass an effect puts in the chain, in order: its sub-passes' for a multi-pass effect
* (`ssao` is four, named `ssao_ao`, `ssao_blur_x` …; `autoExposure` is `ae_measure`, `ae_adapt`,
* `ae_apply`), its own type otherwise. Empty for a type nobody registered. What a quality level that leaves an
* effect out has to remove, and what no guess from the effect's name would find.
*/
function y(e) {
	const t = e.toLowerCase();
	for (const e of g.values()) {
		if (e.type.toLowerCase() !== t) continue;
		return e.multiPass ? e.multiPass.map((e) => e.name) : [e.type, ...e.fallback?.map((e) => e.name) ?? []];
	}
	return [];
}
function b() {
	return Array.from(g.keys());
}
function x() {
	return Array.from(g.values());
}
_({
	type: "blur",
	label: "Blur",
	factory: () => u.createBlur(),
	uniforms: [{
		name: "u_intensity",
		label: "Intensity",
		min: 0,
		max: 20,
		step: .1,
		defaultValue: 2
	}]
});
_({
	type: "bloom",
	label: "Bloom",
	factory: () => u.createBloomExtract(),
	uniforms: [
		{
			name: "u_threshold",
			label: "Threshold",
			min: 0,
			max: 2,
			step: .01,
			defaultValue: .4
		},
		{
			name: "u_intensity",
			label: "Intensity",
			min: 0,
			max: 5,
			step: .1,
			defaultValue: 1.5
		},
		{
			name: "u_radius",
			label: "Radius",
			min: .5,
			max: 5,
			step: .1,
			defaultValue: 1
		}
	],
	multiPass: [
		{
			name: "bloom_prefilter",
			factory: () => u.createBloomPrefilter(),
			scale: .5
		},
		{
			name: "bloom_down_1",
			factory: () => u.createBloomDown(1),
			scale: .25
		},
		{
			name: "bloom_down_2",
			factory: () => u.createBloomDown(2),
			scale: .125
		},
		{
			name: "bloom_down_3",
			factory: () => u.createBloomDown(3),
			scale: .0625
		},
		{
			name: "bloom_down_4",
			factory: () => u.createBloomDown(4),
			scale: .03125
		},
		{
			name: "bloom_down_5",
			factory: () => u.createBloomDown(5),
			scale: .015625
		},
		{
			name: "bloom_up_4",
			factory: () => u.createBloomUp(4, "bloom_down_4"),
			scale: .03125
		},
		{
			name: "bloom_up_3",
			factory: () => u.createBloomUp(3, "bloom_down_3"),
			scale: .0625
		},
		{
			name: "bloom_up_2",
			factory: () => u.createBloomUp(2, "bloom_down_2"),
			scale: .125
		},
		{
			name: "bloom_up_1",
			factory: () => u.createBloomUp(1, "bloom_down_1"),
			scale: .25
		},
		{
			name: "bloom_up_0",
			factory: () => u.createBloomUp(0, "bloom_prefilter"),
			scale: .5
		},
		{
			name: "bloom_composite",
			factory: () => u.createBloomComposite()
		}
	]
});
_({
	type: "vignette",
	label: "Vignette",
	factory: () => u.createVignette(),
	uniforms: [
		{
			name: "u_intensity",
			label: "Intensity",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .6
		},
		{
			name: "u_softness",
			label: "Softness",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .5
		},
		{
			name: "u_radius",
			label: "Radius",
			min: .05,
			max: 2,
			step: .01,
			defaultValue: 1
		},
		{
			name: "u_roundness",
			label: "Roundness",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 0
		}
	]
});
_({
	type: "grayscale",
	label: "Grayscale",
	factory: () => u.createGrayscale(),
	uniforms: [{
		name: "u_intensity",
		label: "Intensity",
		min: 0,
		max: 1,
		step: .01,
		defaultValue: 1
	}]
});
_({
	type: "colorGrade",
	label: "Color Grade",
	factory: () => u.createColorGrade(),
	uniforms: [
		{
			name: "u_exposure",
			label: "Exposure",
			min: -3,
			max: 3,
			step: .05,
			defaultValue: 0
		},
		{
			name: "u_contrast",
			label: "Contrast",
			min: 0,
			max: 2,
			step: .01,
			defaultValue: 1,
			neutralValue: 1
		},
		{
			name: "u_saturation",
			label: "Saturation",
			min: 0,
			max: 2,
			step: .01,
			defaultValue: 1,
			neutralValue: 1
		},
		{
			name: "u_temperature",
			label: "Temperature",
			min: -1,
			max: 1,
			step: .01,
			defaultValue: 0
		},
		{
			name: "u_tint",
			label: "Tint",
			min: -1,
			max: 1,
			step: .01,
			defaultValue: 0
		},
		{
			name: "u_toneLow",
			label: "Tone Low",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .03
		},
		{
			name: "u_toneHigh",
			label: "Tone High",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .55
		},
		{
			name: "u_curve",
			label: "S-Curve",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 0,
			neutralValue: 0
		},
		{
			name: "u_gain",
			label: "Gain",
			min: 0,
			max: 4,
			step: .01,
			defaultValue: 1,
			neutralValue: 1
		},
		{
			name: "u_offset",
			label: "Offset",
			min: -.5,
			max: .5,
			step: .001,
			defaultValue: 0,
			neutralValue: 0
		}
	],
	colors: [
		{
			name: "u_shadowTint",
			label: "Shadow Tint",
			defaultValue: {
				r: 1,
				g: 1,
				b: 1,
				a: 1
			}
		},
		{
			name: "u_highlightTint",
			label: "Highlight Tint",
			defaultValue: {
				r: 1,
				g: 1,
				b: 1,
				a: 1
			}
		},
		{
			name: "u_lift",
			label: "Lift",
			defaultValue: {
				r: 0,
				g: 0,
				b: 0,
				a: 1
			}
		}
	]
});
_({
	type: "chromaticAberration",
	label: "Chromatic Aberration",
	factory: () => u.createChromaticAberration(),
	uniforms: [{
		name: "u_intensity",
		label: "Intensity",
		min: 0,
		max: 20,
		step: .1,
		defaultValue: 3
	}]
});
_({
	type: "tonemap",
	label: "Tonemap (ACES)",
	factory: () => u.createTonemap(),
	uniforms: [{
		name: "u_exposure",
		label: "Exposure",
		min: -3,
		max: 3,
		step: .05,
		defaultValue: 0
	}, {
		name: "u_curve",
		label: "Fitted ACES",
		min: 0,
		max: 1,
		step: 1,
		defaultValue: 0,
		neutralValue: 0
	}]
});
_({
	type: "fxaa",
	label: "FXAA",
	factory: () => u.createFxaa(),
	uniforms: [{
		name: "u_intensity",
		label: "Intensity",
		min: 0,
		max: 1,
		step: .01,
		defaultValue: 1
	}]
});
_({
	type: "lensDistortion",
	label: "Lens Distortion",
	factory: () => u.createLensDistortion(),
	uniforms: [{
		name: "u_strength",
		label: "Strength",
		min: -1,
		max: 1,
		step: .01,
		defaultValue: 0
	}, {
		name: "u_zoom",
		label: "Zoom",
		min: .5,
		max: 2,
		step: .01,
		defaultValue: 1,
		neutralValue: 1
	}]
});
_({
	type: "pixelate",
	label: "Pixelate",
	factory: () => u.createPixelate(),
	uniforms: [{
		name: "u_pixelSize",
		label: "Pixel Size",
		min: 1,
		max: 64,
		step: 1,
		defaultValue: 4
	}]
});
_({
	type: "outline",
	label: "Outline",
	factory: () => u.createOutline(),
	uniforms: [
		{
			name: "u_intensity",
			label: "Intensity",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 1
		},
		{
			name: "u_threshold",
			label: "Threshold",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .2
		},
		{
			name: "u_thickness",
			label: "Thickness",
			min: .5,
			max: 4,
			step: .5,
			defaultValue: 1
		}
	]
});
_({
	type: "depthOutline",
	label: "Depth Outline",
	factory: () => u.createDepthOutline(),
	uniforms: [
		{
			name: "u_intensity",
			label: "Intensity",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 1
		},
		{
			name: "u_threshold",
			label: "Threshold",
			min: 5e-4,
			max: .2,
			step: 5e-4,
			defaultValue: .01
		},
		{
			name: "u_thickness",
			label: "Thickness",
			min: 1,
			max: 4,
			step: 1,
			defaultValue: 1
		}
	]
});
_({
	type: "edgeOutline",
	label: "Edge Outline",
	factory: () => u.createEdgeOutline(),
	uniforms: [
		{
			name: "u_intensity",
			label: "Intensity",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 1
		},
		{
			name: "u_depthThreshold",
			label: "Depth Threshold",
			min: 5e-4,
			max: .2,
			step: 5e-4,
			defaultValue: .01
		},
		{
			name: "u_normalThreshold",
			label: "Crease Threshold",
			min: .02,
			max: 1.5,
			step: .01,
			defaultValue: .4
		},
		{
			name: "u_thickness",
			label: "Thickness",
			min: 1,
			max: 4,
			step: 1,
			defaultValue: 1
		}
	],
	colors: [{
		name: "u_lineColor",
		label: "Line Colour",
		defaultValue: {
			r: 0,
			g: 0,
			b: 0,
			a: 1
		}
	}]
});
_({
	type: "mist2d",
	label: "Mist 2D",
	factory: () => u.createMist2d(),
	uniforms: [
		{
			name: "u_density",
			label: "Density",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .55,
			neutralValue: 0
		},
		{
			name: "u_coverage",
			label: "Coverage",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .6
		},
		{
			name: "u_scale",
			label: "Scale",
			min: 40,
			max: 4e3,
			step: 10,
			defaultValue: 520
		},
		{
			name: "u_speed",
			label: "Speed",
			min: 0,
			max: 400,
			step: 1,
			defaultValue: 18
		},
		{
			name: "u_direction",
			label: "Direction",
			min: 0,
			max: 360,
			step: 1,
			defaultValue: 25
		},
		{
			name: "u_glow",
			label: "Glow",
			min: 0,
			max: 2,
			step: .01,
			defaultValue: .6
		}
	],
	colors: [{
		name: "u_fogColor",
		label: "Colour",
		defaultValue: {
			r: .62,
			g: .72,
			b: .76,
			a: 1
		}
	}]
});
_({
	type: "rain2d",
	label: "Rain 2D",
	factory: () => u.createRain2d(),
	uniforms: [
		{
			name: "u_intensity",
			label: "Intensity",
			min: 0,
			max: 2,
			step: .01,
			defaultValue: 1,
			neutralValue: 0
		},
		{
			name: "u_wetness",
			label: "Wetness",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 1,
			neutralValue: 0
		},
		{
			name: "u_puddles",
			label: "Puddles",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .4,
			neutralValue: 0
		},
		{
			name: "u_puddleScale",
			label: "Puddle Size",
			min: 20,
			max: 4e3,
			step: 10,
			defaultValue: 220
		},
		{
			name: "u_rippleScale",
			label: "Ripple Scale",
			min: 6,
			max: 400,
			step: 1,
			defaultValue: 36
		},
		{
			name: "u_wind",
			label: "Wind",
			min: -1,
			max: 1,
			step: .01,
			defaultValue: .15
		},
		{
			name: "u_speed",
			label: "Speed",
			min: .2,
			max: 6,
			step: .1,
			defaultValue: 1.6
		},
		{
			name: "u_streakLength",
			label: "Streak Length",
			min: .05,
			max: .9,
			step: .01,
			defaultValue: .3
		},
		{
			name: "u_maskSize",
			label: "Shelter Mask Size",
			min: 64,
			max: c,
			step: 64,
			defaultValue: 512
		},
		...l
	],
	textures: [{
		name: s,
		label: "Shelter Mask",
		internal: true
	}],
	colors: [{
		name: "u_streakColor",
		label: "Streak Colour",
		defaultValue: {
			r: .78,
			g: .82,
			b: .9,
			a: 1
		}
	}]
});
_({
	type: "fog2d",
	label: "Fog of War 2D",
	factory: () => u.createFog2d(),
	uniforms: [
		{
			name: "u_forgetLight",
			label: "Remembered Brightness",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .4
		},
		{
			name: "u_forgetDesat",
			label: "Remembered Desaturation",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .7
		},
		...o
	],
	textures: [{
		name: i,
		label: "Explored Map",
		internal: true
	}, {
		name: a,
		label: "Visible Map",
		internal: true
	}],
	colors: [{
		name: "u_unexploredColor",
		label: "Unexplored Colour",
		defaultValue: {
			r: 0,
			g: 0,
			b: 0,
			a: 1
		}
	}]
});
_({
	type: "distanceFog",
	label: "Distance Fog",
	factory: () => u.createDistanceFog(),
	uniforms: [
		{
			name: "u_fogNear",
			label: "Near",
			min: 0,
			max: 500,
			step: .5,
			defaultValue: 10
		},
		{
			name: "u_fogFar",
			label: "Far",
			min: 0,
			max: 500,
			step: .5,
			defaultValue: 60
		},
		{
			name: "u_intensity",
			label: "Intensity",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 1
		}
	],
	colors: [{
		name: "u_fogColor",
		label: "Colour",
		defaultValue: {
			r: .6,
			g: .68,
			b: .78,
			a: 1
		}
	}]
});
_({
	type: "skyAtmosphere",
	label: "Sky Atmosphere",
	factory: () => u.createSkyClouds(),
	multiPass: [{
		name: "sky_clouds",
		factory: () => u.createSkyClouds(),
		scale: .5
	}, {
		name: "sky_composite",
		factory: () => u.createSkyAtmosphere()
	}],
	uniforms: [
		{
			name: "u_planetRadius",
			label: "Planet Radius",
			min: 0,
			max: 1e8,
			step: 100,
			defaultValue: 0,
			neutralValue: 0
		},
		{
			name: "u_planetX",
			label: "Planet Centre X",
			min: -1e8,
			max: 1e8,
			step: 100,
			defaultValue: 0
		},
		{
			name: "u_planetY",
			label: "Planet Centre Y",
			min: -1e8,
			max: 1e8,
			step: 100,
			defaultValue: 0
		},
		{
			name: "u_planetZ",
			label: "Planet Centre Z",
			min: -1e8,
			max: 1e8,
			step: 100,
			defaultValue: 0
		},
		{
			name: "u_intensity",
			label: "Brightness",
			min: 0,
			max: 8,
			step: .01,
			defaultValue: 1
		},
		{
			name: "u_lightScene",
			label: "Light the Scene",
			min: 0,
			max: 1,
			step: 1,
			defaultValue: 0,
			neutralValue: 0
		},
		{
			name: "u_panorama",
			label: "Keep Background",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 0,
			neutralValue: 1
		},
		{
			name: "u_overcast",
			label: "Overcast",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 0
		},
		{
			name: "u_groundAlbedo",
			label: "Ground Albedo",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .2
		},
		{
			name: "u_haze",
			label: "Haze",
			min: 0,
			max: 8,
			step: .05,
			defaultValue: 1
		},
		{
			name: "u_altitude",
			label: "Altitude",
			min: 0,
			max: 20,
			step: .1,
			defaultValue: .1
		},
		{
			name: "u_sunSize",
			label: "Sun Size",
			min: .2,
			max: 8,
			step: .1,
			defaultValue: 1
		},
		{
			name: "u_sunBrightness",
			label: "Sun Brightness",
			min: 0,
			max: 400,
			step: 1,
			defaultValue: 40
		},
		{
			name: "u_moon",
			label: "Moon",
			min: 0,
			max: 4,
			step: .05,
			defaultValue: 1
		},
		{
			name: "u_stars",
			label: "Stars",
			min: 0,
			max: 4,
			step: .05,
			defaultValue: 1
		},
		{
			name: "u_clouds",
			label: "Cloud Coverage",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .45,
			neutralValue: 0
		},
		{
			name: "u_cloudBase",
			label: "Cloud Base",
			min: .2,
			max: 10,
			step: .1,
			defaultValue: 1.5
		},
		{
			name: "u_cloudThickness",
			label: "Cloud Thickness",
			min: .2,
			max: 8,
			step: .1,
			defaultValue: 2.5
		},
		{
			name: "u_cloudBrightness",
			label: "Cloud Brightness",
			min: 0,
			max: 4,
			step: .05,
			defaultValue: 1
		},
		{
			name: "u_windSpeed",
			label: "Wind Speed",
			min: 0,
			max: 2,
			step: .01,
			defaultValue: .05
		},
		{
			name: "u_windDirection",
			label: "Wind Direction",
			min: 0,
			max: 360,
			step: 1,
			defaultValue: 60
		},
		{
			name: "u_followSun",
			label: "Follow Scene Sun",
			min: 0,
			max: 1,
			step: 1,
			defaultValue: 1,
			neutralValue: 1
		},
		{
			name: "u_sunAzimuth",
			label: "Sun Azimuth",
			min: 0,
			max: 360,
			step: 1,
			defaultValue: 40
		},
		{
			name: "u_sunElevation",
			label: "Sun Elevation",
			min: -90,
			max: 90,
			step: 1,
			defaultValue: 35
		},
		{
			name: "u_cloudShadow",
			label: "Cloud Shadows",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 0,
			neutralValue: 0
		},
		{
			name: "u_unitsPerKm",
			label: "World Units per km",
			min: 100,
			max: 1e7,
			step: 100,
			defaultValue: 1e5,
			worldUnits: 1
		},
		{
			name: "u_cloudMaskTile",
			label: "Cloud Mask Tile (km)",
			min: 0,
			max: 100,
			step: .1,
			defaultValue: 0
		},
		{
			name: "u_cloudMask2Tile",
			label: "Cloud Mask 2 Tile (km)",
			min: 0,
			max: 100,
			step: .1,
			defaultValue: 0
		},
		{
			name: "u_cloudScale",
			label: "Cloud Scale",
			min: .1,
			max: 8,
			step: .05,
			defaultValue: 1
		},
		{
			name: "u_cloudSoftness",
			label: "Cloud Softness",
			min: .02,
			max: 1,
			step: .01,
			defaultValue: .22
		},
		{
			name: "u_cloudChange",
			label: "Cloud Change",
			min: 0,
			max: 1,
			step: .001,
			defaultValue: .004
		},
		{
			name: "u_cloudSilver",
			label: "Silver Lining",
			min: 0,
			max: 2,
			step: .01,
			defaultValue: .6
		},
		{
			name: "u_cloud2Coverage",
			label: "Upper Layer Coverage",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 0,
			neutralValue: 0
		},
		{
			name: "u_cloud2Base",
			label: "Upper Layer Base",
			min: .2,
			max: 20,
			step: .1,
			defaultValue: 6
		},
		{
			name: "u_cloud2Thickness",
			label: "Upper Layer Thickness",
			min: .05,
			max: 8,
			step: .05,
			defaultValue: .6
		},
		{
			name: "u_cloud2Scale",
			label: "Upper Layer Scale",
			min: .1,
			max: 8,
			step: .05,
			defaultValue: 1.8
		},
		{
			name: "u_cloud2Wind",
			label: "Upper Layer Wind",
			min: 0,
			max: 8,
			step: .05,
			defaultValue: 1.6
		},
		{
			name: "u_cloudDriftX",
			label: "Cloud Drift X",
			min: -1e8,
			max: 1e8,
			step: .01,
			defaultValue: 0,
			internal: true
		},
		{
			name: "u_cloudDriftZ",
			label: "Cloud Drift Z",
			min: -1e8,
			max: 1e8,
			step: .01,
			defaultValue: 0,
			internal: true
		},
		{
			name: "u_cloud2DriftX",
			label: "Upper Layer Drift X",
			min: -1e8,
			max: 1e8,
			step: .01,
			defaultValue: 0,
			internal: true
		},
		{
			name: "u_cloud2DriftZ",
			label: "Upper Layer Drift Z",
			min: -1e8,
			max: 1e8,
			step: .01,
			defaultValue: 0,
			internal: true
		},
		{
			name: "u_cloudEvolve",
			label: "Cloud Evolve",
			min: 0,
			max: 1e8,
			step: .01,
			defaultValue: 0,
			internal: true
		}
	],
	textures: [{
		name: "u_cloudMask",
		label: "Cloud Mask (tileable coverage, linear, repeat)"
	}, {
		name: "u_cloudMask2",
		label: "Cloud Mask 2 (a softer, higher layer)"
	}]
});
_({
	type: "voxelGI",
	label: "Voxel GI",
	native: "voxelGI",
	fallback: [
		{
			name: "gi_voxels",
			factory: () => m.createVoxels(),
			uniforms: {
				u_feedbackWidth: r.width,
				u_feedbackHeight: r.height
			}
		},
		{
			name: "gi_gather",
			factory: () => m.createGather(),
			scale: .5
		},
		{
			name: "gi_apply",
			factory: () => m.createApply()
		}
	],
	uniforms: [
		{
			name: "u_intensity",
			label: "Intensity",
			min: 0,
			max: 4,
			step: .01,
			defaultValue: 1,
			neutralValue: 0
		},
		{
			name: "u_rays",
			label: "Rays",
			min: 1,
			max: 32,
			step: 1,
			defaultValue: 8
		},
		{
			name: "u_voxelSize",
			label: "Voxel Size",
			min: .01,
			max: 400,
			step: .01,
			defaultValue: 40,
			worldUnits: 1
		},
		{
			name: "u_range",
			label: "Range",
			min: 4,
			max: 90,
			step: 1,
			defaultValue: 48
		},
		{
			name: "u_maxBounce",
			label: "Max Bounce",
			min: .5,
			max: 16,
			step: .5,
			defaultValue: 3
		},
		{
			name: "u_decay",
			label: "Memory",
			min: 0,
			max: .99,
			step: .01,
			defaultValue: .93
		},
		{
			name: "u_bias",
			label: "Start Bias",
			min: 0,
			max: 4,
			step: .1,
			defaultValue: 1.2
		},
		{
			name: "u_divisor",
			label: "Resolution Divisor",
			min: 1,
			max: 4,
			step: 1,
			defaultValue: 2
		},
		{
			name: "u_blend",
			label: "Temporal Blend",
			min: .02,
			max: 1,
			step: .01,
			defaultValue: .2
		},
		{
			name: "u_debug",
			label: "Show GI Only",
			min: 0,
			max: 1,
			step: 1,
			defaultValue: 0
		},
		{
			name: "u_sunAlbedo",
			label: "Off-screen Sun Albedo",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .6
		},
		{
			name: "u_bounceFeedback",
			label: "Multi-bounce",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 1
		}
	]
});
_({
	type: "dynamicGI",
	label: "Dynamic GI",
	native: "dynamicGI",
	uniforms: [
		{
			name: "u_intensity",
			label: "Intensity",
			min: 0,
			max: 4,
			step: .01,
			defaultValue: 1,
			neutralValue: 0
		},
		{
			name: "u_blend",
			label: "Temporal Blend",
			min: .02,
			max: 1,
			step: .01,
			defaultValue: .15
		},
		{
			name: "u_cardSlices",
			label: "Card Update Frames",
			min: 1,
			max: 16,
			step: 1,
			defaultValue: 4
		},
		{
			name: "u_probeStride",
			label: "Probe Ray Stride",
			min: 1,
			max: 8,
			step: 1,
			defaultValue: 2
		},
		{
			name: "u_probeSpacing",
			label: "Probe Spacing",
			min: 0,
			max: 64,
			step: 1,
			defaultValue: 0
		},
		{
			name: "u_skip",
			label: "Skip Passes (profiling)",
			min: 0,
			max: 63,
			step: 1,
			defaultValue: 0
		},
		{
			name: "u_halfRes",
			label: "Half Resolution",
			min: 0,
			max: 1,
			step: 1,
			defaultValue: 0
		},
		{
			name: "u_probeDensity",
			label: "Probe Density",
			min: .25,
			max: 1,
			step: .01,
			defaultValue: 1
		},
		{
			name: "u_cellSize",
			label: "Field Cell Size",
			min: 0,
			max: 1e3,
			step: .1,
			defaultValue: 0,
			worldUnits: 1
		}
	]
});
_({
	type: "sharpen",
	label: "Sharpen",
	compute: { get source() {
		return n("sharpen");
	} },
	fallback: [{
		name: "sharpen_fs",
		factory: () => u.createSharpen()
	}],
	uniforms: [{
		name: "u_intensity",
		label: "Intensity",
		min: 0,
		max: 2,
		step: .01,
		defaultValue: .5,
		neutralValue: 0
	}, {
		name: "u_limit",
		label: "Overshoot Limit",
		min: 0,
		max: 1,
		step: .01,
		defaultValue: .25
	}]
});
_({
	type: "heightFog",
	label: "Height Fog",
	factory: () => u.createHeightFogVolume(),
	multiPass: [{
		name: "fog_volume",
		factory: () => u.createHeightFogVolume(),
		scale: .5
	}, {
		name: "fog_composite",
		factory: () => u.createHeightFog()
	}],
	uniforms: [
		{
			name: "u_density",
			label: "Density",
			min: 0,
			max: .05,
			step: 1e-4,
			defaultValue: .0015,
			neutralValue: 0,
			worldUnits: -1
		},
		{
			name: "u_heightFalloff",
			label: "Height Falloff",
			min: 0,
			max: .1,
			step: 5e-4,
			defaultValue: .003,
			worldUnits: -1
		},
		{
			name: "u_baseHeight",
			label: "Base Height",
			min: -1e3,
			max: 5e3,
			step: 10,
			defaultValue: 0,
			worldUnits: 1
		},
		{
			name: "u_planetRadius",
			label: "Planet Radius",
			min: 0,
			max: 1e8,
			step: 100,
			defaultValue: 0,
			neutralValue: 0
		},
		{
			name: "u_planetX",
			label: "Planet Centre X",
			min: -1e8,
			max: 1e8,
			step: 100,
			defaultValue: 0
		},
		{
			name: "u_planetY",
			label: "Planet Centre Y",
			min: -1e8,
			max: 1e8,
			step: 100,
			defaultValue: 0
		},
		{
			name: "u_planetZ",
			label: "Planet Centre Z",
			min: -1e8,
			max: 1e8,
			step: 100,
			defaultValue: 0
		},
		{
			name: "u_startDistance",
			label: "Start Distance",
			min: 0,
			max: 3e3,
			step: 10,
			defaultValue: 0,
			worldUnits: 1
		},
		{
			name: "u_maxOpacity",
			label: "Max Opacity",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 1
		},
		{
			name: "u_followSun",
			label: "Follow Scene Sun",
			min: 0,
			max: 1,
			step: 1,
			defaultValue: 1,
			neutralValue: 1
		},
		{
			name: "u_sunAzimuth",
			label: "Sun Azimuth",
			min: 0,
			max: 360,
			step: 1,
			defaultValue: 40
		},
		{
			name: "u_sunElevation",
			label: "Sun Elevation",
			min: -90,
			max: 90,
			step: 1,
			defaultValue: 25
		},
		{
			name: "u_inscatter",
			label: "Sun Glow",
			min: 0,
			max: 2,
			step: .01,
			defaultValue: .6,
			neutralValue: 0
		},
		{
			name: "u_sunExponent",
			label: "Glow Sharpness",
			min: 1,
			max: 64,
			step: 1,
			defaultValue: 8
		},
		{
			name: "u_skyFog",
			label: "Sky Haze",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .8,
			neutralValue: 0
		},
		{
			name: "u_volumetric",
			label: "Volumetric Light",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 0,
			neutralValue: 0
		},
		{
			name: "u_volumeRange",
			label: "Volumetric Range",
			min: 100,
			max: 1e6,
			step: 100,
			defaultValue: 3e3,
			worldUnits: 1
		},
		{
			name: "u_cloudShade",
			label: "Cloud Shafts",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 0,
			neutralValue: 0
		},
		{
			name: "u_skyCover",
			label: "Sky Cover",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 0,
			internal: true
		},
		{
			name: "u_skyBase",
			label: "Sky Cloud Base",
			min: .2,
			max: 10,
			step: .1,
			defaultValue: 1.5,
			internal: true
		},
		{
			name: "u_skyThickness",
			label: "Sky Cloud Thickness",
			min: .2,
			max: 8,
			step: .1,
			defaultValue: 2.5,
			internal: true
		},
		{
			name: "u_skyAltitude",
			label: "Sky Altitude",
			min: 0,
			max: 20,
			step: .1,
			defaultValue: .1,
			internal: true
		},
		{
			name: "u_skyUnits",
			label: "Sky Units per km",
			min: 1,
			max: 1e5,
			step: 1,
			defaultValue: 1e3,
			internal: true
		},
		{
			name: "u_skySigma",
			label: "Sky Cloud Density",
			min: 0,
			max: 10,
			step: .1,
			defaultValue: 1.3,
			internal: true
		},
		{
			name: "u_skyDriftX",
			label: "Sky Drift X",
			min: -1e8,
			max: 1e8,
			step: .01,
			defaultValue: 0,
			internal: true
		},
		{
			name: "u_skyEvolve",
			label: "Sky Evolve",
			min: 0,
			max: 1e8,
			step: .01,
			defaultValue: 0,
			internal: true
		},
		{
			name: "u_skyScale",
			label: "Sky Cloud Scale",
			min: .1,
			max: 8,
			step: .05,
			defaultValue: 1,
			internal: true
		},
		{
			name: "u_skySoftness",
			label: "Sky Cloud Softness",
			min: .02,
			max: 1,
			step: .01,
			defaultValue: .22,
			internal: true
		},
		{
			name: "u_skyDriftZ",
			label: "Sky Drift Z",
			min: -1e8,
			max: 1e8,
			step: .01,
			defaultValue: 0,
			internal: true
		},
		{
			name: "u_cloudMaskTile",
			label: "Sky Cloud Mask Tile",
			min: 0,
			max: 100,
			step: .1,
			defaultValue: 0,
			internal: true
		},
		{
			name: "u_cloudMask2Tile",
			label: "Sky Cloud Mask 2 Tile",
			min: 0,
			max: 100,
			step: .1,
			defaultValue: 0,
			internal: true
		}
	],
	textures: [{
		name: "u_cloudMask",
		label: "Sky Cloud Mask",
		internal: true
	}, {
		name: "u_cloudMask2",
		label: "Sky Cloud Mask 2",
		internal: true
	}],
	colors: [{
		name: "u_fogColor",
		label: "Colour",
		defaultValue: {
			r: .62,
			g: .7,
			b: .8,
			a: 1
		}
	}, {
		name: "u_sunColor",
		label: "Sun Colour",
		defaultValue: {
			r: 1,
			g: .82,
			b: .55,
			a: 1
		}
	}]
});
_({
	type: "ssgi",
	label: "Screen Space GI",
	factory: () => u.createSsgiApply(),
	uniforms: [
		{
			name: "u_intensity",
			label: "Intensity",
			min: 0,
			max: 4,
			step: .01,
			defaultValue: 1,
			neutralValue: 0
		},
		{
			name: "u_radius",
			label: "Radius",
			min: .05,
			max: 1500,
			step: .05,
			defaultValue: 150,
			worldUnits: 1
		},
		{
			name: "u_thickness",
			label: "Thickness",
			min: .01,
			max: 300,
			step: .01,
			defaultValue: 30,
			worldUnits: 1
		},
		{
			name: "u_maxBounce",
			label: "Max Bounce",
			min: .5,
			max: 16,
			step: .5,
			defaultValue: 3
		}
	],
	multiPass: [{
		name: "ssgi_gather",
		factory: () => u.createSsgiGather(),
		scale: .5
	}, {
		name: "ssgi_apply",
		factory: () => u.createSsgiApply()
	}]
});
_({
	type: "contactShadows",
	label: "Contact Shadows",
	factory: () => u.createContactShadows(),
	uniforms: [
		{
			name: "u_intensity",
			label: "Intensity",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .6,
			neutralValue: 0
		},
		{
			name: "u_length",
			label: "Length",
			min: 5,
			max: 600,
			step: 1,
			defaultValue: 60,
			worldUnits: 1
		},
		{
			name: "u_thickness",
			label: "Thickness",
			min: .5,
			max: 80,
			step: .5,
			defaultValue: 8,
			worldUnits: 1
		},
		{
			name: "u_followSun",
			label: "Follow Scene Sun",
			min: 0,
			max: 1,
			step: 1,
			defaultValue: 1,
			neutralValue: 1
		},
		{
			name: "u_sunAzimuth",
			label: "Sun Azimuth",
			min: 0,
			max: 360,
			step: 1,
			defaultValue: 40
		},
		{
			name: "u_sunElevation",
			label: "Sun Elevation",
			min: -90,
			max: 90,
			step: 1,
			defaultValue: 35
		}
	]
});
_({
	type: "lightShafts",
	label: "Light Shafts",
	factory: () => u.createLightShafts(),
	uniforms: [
		{
			name: "u_intensity",
			label: "Intensity",
			min: 0,
			max: 3,
			step: .01,
			defaultValue: .6,
			neutralValue: 0
		},
		{
			name: "u_followSun",
			label: "Follow Scene Sun",
			min: 0,
			max: 1,
			step: 1,
			defaultValue: 1,
			neutralValue: 1
		},
		{
			name: "u_sunAzimuth",
			label: "Sun Azimuth",
			min: 0,
			max: 360,
			step: 1,
			defaultValue: 40
		},
		{
			name: "u_sunElevation",
			label: "Sun Elevation",
			min: -90,
			max: 90,
			step: 1,
			defaultValue: 25
		},
		{
			name: "u_decay",
			label: "Decay",
			min: .8,
			max: 1,
			step: .005,
			defaultValue: .96
		},
		{
			name: "u_reach",
			label: "Reach",
			min: .1,
			max: 1,
			step: .01,
			defaultValue: .6
		}
	],
	colors: [{
		name: "u_sunColor",
		label: "Sun Colour",
		defaultValue: {
			r: 1,
			g: .85,
			b: .6,
			a: 1
		}
	}]
});
_({
	type: "autoExposure",
	label: "Auto Exposure",
	factory: () => u.createAutoExposureApply(),
	uniforms: [
		{
			name: "u_bias",
			label: "Compensation (EV)",
			min: -4,
			max: 4,
			step: .1,
			defaultValue: 0,
			neutralValue: 0
		},
		{
			name: "u_speedUp",
			label: "Brighten Speed",
			min: .1,
			max: 20,
			step: .1,
			defaultValue: 3
		},
		{
			name: "u_speedDown",
			label: "Darken Speed",
			min: .1,
			max: 20,
			step: .1,
			defaultValue: 1
		},
		{
			name: "u_minEV",
			label: "Min EV",
			min: -10,
			max: 0,
			step: .5,
			defaultValue: -4
		},
		{
			name: "u_maxEV",
			label: "Max EV",
			min: 0,
			max: 10,
			step: .5,
			defaultValue: 4
		},
		{
			name: "u_metering",
			label: "Metering (0 avg, 1 centre, 2 spot)",
			min: 0,
			max: 2,
			step: 1,
			defaultValue: 0
		},
		{
			name: "u_meterSize",
			label: "Meter Size",
			min: .02,
			max: 1,
			step: .01,
			defaultValue: .35
		}
	],
	multiPass: [
		{
			name: "ae_measure",
			factory: () => u.createAutoExposureMeasure(),
			scale: .0625
		},
		{
			name: "ae_adapt",
			factory: () => u.createAutoExposureAdapt(),
			scale: .01
		},
		{
			name: "ae_apply",
			factory: () => u.createAutoExposureApply()
		}
	]
});
_({
	type: "depthOfField",
	label: "Depth of Field",
	factory: () => u.createDofGather(),
	uniforms: [
		{
			name: "u_focusDistance",
			label: "Focus Distance",
			min: 1,
			max: 5e3,
			step: 1,
			defaultValue: 600,
			worldUnits: 1
		},
		{
			name: "u_autoFocus",
			label: "Auto Focus",
			min: 0,
			max: 1,
			step: 1,
			defaultValue: 0,
			neutralValue: 0
		},
		{
			name: "u_focusX",
			label: "Focus Point X",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .5
		},
		{
			name: "u_focusY",
			label: "Focus Point Y",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .5
		},
		{
			name: "u_focusSpeed",
			label: "Focus Speed",
			min: .1,
			max: 40,
			step: .1,
			defaultValue: 5
		},
		{
			name: "u_focusRange",
			label: "Focus Range",
			min: 0,
			max: 2e3,
			step: 1,
			defaultValue: 100,
			worldUnits: 1
		},
		{
			name: "u_aperture",
			label: "Aperture (px)",
			min: 0,
			max: 64,
			step: .5,
			defaultValue: 24,
			neutralValue: 0
		},
		{
			name: "u_maxBlur",
			label: "Max Blur (px)",
			min: 1,
			max: 32,
			step: .5,
			defaultValue: 14
		},
		{
			name: "u_blades",
			label: "Aperture Blades (0 = round)",
			min: 0,
			max: 9,
			step: 1,
			defaultValue: 0
		},
		{
			name: "u_bokehRotation",
			label: "Blade Rotation",
			min: 0,
			max: 360,
			step: 1,
			defaultValue: 0
		},
		{
			name: "u_highlight",
			label: "Highlight Boost",
			min: 0,
			max: 8,
			step: .1,
			defaultValue: 0
		}
	],
	multiPass: [
		{
			name: "dof_focus",
			factory: () => u.createDofFocus(),
			scale: .01
		},
		{
			name: "dof_coc",
			factory: () => u.createDofCoc()
		},
		{
			name: "dof_gather",
			factory: () => u.createDofGather()
		}
	]
});
_({
	type: "rain",
	label: "Rain",
	factory: () => u.createRain(),
	uniforms: [
		{
			name: "u_intensity",
			label: "Intensity",
			min: 0,
			max: 2,
			step: .01,
			defaultValue: 1,
			neutralValue: 0
		},
		{
			name: "u_wetness",
			label: "Wetness",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 1,
			neutralValue: 0
		},
		{
			name: "u_wind",
			label: "Wind",
			min: -1,
			max: 1,
			step: .01,
			defaultValue: .15
		},
		{
			name: "u_speed",
			label: "Speed",
			min: .2,
			max: 6,
			step: .1,
			defaultValue: 1.6
		},
		{
			name: "u_streakLength",
			label: "Streak Length",
			min: .05,
			max: .9,
			step: .01,
			defaultValue: .3
		},
		{
			name: "u_rippleScale",
			label: "Ripple Scale",
			min: 5,
			max: 400,
			step: 1,
			defaultValue: 60,
			worldUnits: 1
		},
		{
			name: "u_shelterRange",
			label: "Shelter Range",
			min: 100,
			max: 3e4,
			step: 100,
			defaultValue: 3e3,
			worldUnits: 1
		},
		{
			name: "u_puddles",
			label: "Puddles",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .3,
			neutralValue: 0
		},
		{
			name: "u_puddleScale",
			label: "Puddle Size",
			min: 40,
			max: 2e3,
			step: 10,
			defaultValue: 350,
			worldUnits: 1
		}
	],
	colors: [{
		name: "u_streakColor",
		label: "Streak Colour",
		defaultValue: {
			r: .78,
			g: .82,
			b: .9,
			a: 1
		}
	}]
});
_({
	type: "snowCover",
	label: "Snow Cover",
	factory: () => u.createSnowCover(),
	uniforms: [
		{
			name: "u_amount",
			label: "Amount",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 1,
			neutralValue: 0
		},
		{
			name: "u_snowLine",
			label: "Snow Line",
			min: -1e5,
			max: 1e5,
			step: 1,
			defaultValue: -1e5,
			worldUnits: 1
		},
		{
			name: "u_snowLineBand",
			label: "Snow Line Band",
			min: 0,
			max: 1e5,
			step: 1,
			defaultValue: 100,
			worldUnits: 1
		},
		{
			name: "u_slopeLimit",
			label: "Slope Limit",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .55
		},
		{
			name: "u_grainScale",
			label: "Drift Size",
			min: 1,
			max: 1e5,
			step: 1,
			defaultValue: 120,
			worldUnits: 1
		},
		{
			name: "u_shelterRange",
			label: "Shelter Range",
			min: 100,
			max: 3e4,
			step: 100,
			defaultValue: 3e3,
			worldUnits: 1
		}
	],
	colors: [{
		name: "u_snowColor",
		label: "Snow Colour",
		defaultValue: {
			r: .92,
			g: .95,
			b: 1,
			a: 1
		}
	}]
});
_({
	type: "ssao",
	label: "Ambient Occlusion",
	factory: () => u.createSsaoAo(),
	uniforms: [
		{
			name: "u_radius",
			label: "Radius",
			min: .01,
			max: 400,
			step: .01,
			defaultValue: 60,
			worldUnits: 1
		},
		{
			name: "u_intensity",
			label: "Intensity",
			min: 0,
			max: 2,
			step: .01,
			defaultValue: 1
		},
		{
			name: "u_bias",
			label: "Bias",
			min: 0,
			max: .6,
			step: .005,
			defaultValue: .12
		},
		{
			name: "u_power",
			label: "Power",
			min: .5,
			max: 4,
			step: .05,
			defaultValue: 1.6,
			neutralValue: 1
		}
	],
	multiPass: [
		{
			name: "ssao_ao",
			factory: () => u.createSsaoAo(),
			scale: .5
		},
		{
			name: "ssao_blur_x",
			factory: () => u.createSsaoBlur(0),
			scale: .5
		},
		{
			name: "ssao_blur_y",
			factory: () => u.createSsaoBlur(1),
			scale: .5
		},
		{
			name: "ssao_composite",
			factory: () => u.createSsaoComposite()
		}
	]
});
_({
	type: "subsurface",
	label: "Subsurface Scattering",
	factory: () => p.createSubsurface(0),
	uniforms: [{
		name: "u_width",
		label: "Width",
		min: .1,
		max: 80,
		step: .1,
		defaultValue: 8
	}, {
		name: "u_strength",
		label: "Strength",
		min: 0,
		max: 1,
		step: .01,
		defaultValue: 1,
		neutralValue: 0
	}],
	colors: [{
		name: "u_color",
		label: "Scatter Colour",
		defaultValue: {
			r: 1,
			g: .45,
			b: .25,
			a: 1
		}
	}],
	multiPass: [{
		name: "sss_x",
		factory: () => p.createSubsurface(0)
	}, {
		name: "sss_y",
		factory: () => p.createSubsurface(1)
	}]
});
_({
	type: "gtao",
	label: "Ground-Truth Ambient Occlusion",
	factory: () => f.createGtaoAo(),
	uniforms: [
		{
			name: "u_radius",
			label: "Radius",
			min: .01,
			max: 500,
			step: .01,
			defaultValue: 80,
			worldUnits: 1
		},
		{
			name: "u_intensity",
			label: "Intensity",
			min: 0,
			max: 2,
			step: .01,
			defaultValue: 1
		},
		{
			name: "u_power",
			label: "Power",
			min: .5,
			max: 4,
			step: .05,
			defaultValue: 1.4,
			neutralValue: 1
		},
		{
			name: "u_thickness",
			label: "Thickness",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .5
		}
	],
	multiPass: [
		{
			name: "gtao_ao",
			factory: () => f.createGtaoAo(),
			scale: .5
		},
		{
			name: "gtao_blur_x",
			factory: () => u.createSsaoBlur(0),
			scale: .5
		},
		{
			name: "gtao_blur_y",
			factory: () => u.createSsaoBlur(1),
			scale: .5
		},
		{
			name: "gtao_composite",
			factory: () => u.createSsaoComposite()
		}
	]
});
_({
	type: "ssr",
	label: "Screen Space Reflections",
	factory: () => u.createSsr(),
	uniforms: [
		{
			name: "u_intensity",
			label: "Intensity",
			min: 0,
			max: 2,
			step: .01,
			defaultValue: 1,
			neutralValue: 0
		},
		{
			name: "u_maxDistance",
			label: "Max Distance",
			min: 10,
			max: 3e3,
			step: 10,
			defaultValue: 400,
			worldUnits: 1
		},
		{
			name: "u_thickness",
			label: "Thickness",
			min: 1,
			max: 200,
			step: 1,
			defaultValue: 12,
			worldUnits: 1
		},
		{
			name: "u_floorBias",
			label: "Floor Bias",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 0
		},
		{
			name: "u_puddles",
			label: "Puddles",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 0,
			neutralValue: 0
		},
		{
			name: "u_puddleScale",
			label: "Puddle Size",
			min: 40,
			max: 2e3,
			step: 10,
			defaultValue: 350,
			worldUnits: 1
		},
		{
			name: "u_maxRoughness",
			label: "Max Roughness",
			min: .05,
			max: 1,
			step: .01,
			defaultValue: .75
		},
		{
			name: "u_wetness",
			label: "Wetness",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 0,
			neutralValue: 0
		},
		{
			name: "u_skyReflection",
			label: "Sky Reflection",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 1,
			neutralValue: 0
		}
	]
});
_({
	type: "taa",
	label: "Temporal Anti-Aliasing",
	factory: () => u.createTaa(),
	uniforms: [{
		name: "u_blend",
		label: "Blend",
		min: .02,
		max: 1,
		step: .01,
		defaultValue: .1,
		neutralValue: 1
	}, {
		name: "u_objectMotion",
		label: "Object Motion",
		min: 0,
		max: 1,
		step: 1,
		defaultValue: 1,
		neutralValue: 1
	}]
});
_({
	type: "motionBlur",
	label: "Motion Blur",
	factory: () => d.createMotionBlur(),
	uniforms: [
		{
			name: "u_intensity",
			label: "Shutter",
			min: 0,
			max: 2,
			step: .01,
			defaultValue: .5,
			neutralValue: 0
		},
		{
			name: "u_maxBlur",
			label: "Max Blur",
			min: .002,
			max: .25,
			step: .002,
			defaultValue: .05
		},
		{
			name: "u_objectMotion",
			label: "Object Motion",
			min: 0,
			max: 1,
			step: 1,
			defaultValue: 1,
			neutralValue: 1
		}
	]
});
_({
	type: "filmGrain",
	label: "Film Grain",
	factory: () => d.createFilmGrain(),
	uniforms: [
		{
			name: "u_intensity",
			label: "Intensity",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .15,
			neutralValue: 0
		},
		{
			name: "u_size",
			label: "Grain Size",
			min: 1,
			max: 6,
			step: .1,
			defaultValue: 1.6
		},
		{
			name: "u_response",
			label: "Mid-tone Response",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .8
		}
	]
});
_({
	type: "lensFlare",
	label: "Lens Flare",
	factory: () => d.createLensFlare(),
	multiPass: [{
		name: "lensflare_flare",
		factory: () => d.createLensFlare(),
		scale: .5
	}, {
		name: "lensflare_composite",
		factory: () => d.createLensFlareComposite()
	}],
	uniforms: [
		{
			name: "u_intensity",
			label: "Intensity",
			min: 0,
			max: 4,
			step: .01,
			defaultValue: .4,
			neutralValue: 0
		},
		{
			name: "u_threshold",
			label: "Threshold",
			min: 0,
			max: 8,
			step: .05,
			defaultValue: 1.2
		},
		{
			name: "u_ghosts",
			label: "Ghosts",
			min: 1,
			max: 8,
			step: 1,
			defaultValue: 5
		},
		{
			name: "u_dispersal",
			label: "Dispersal",
			min: .05,
			max: 1,
			step: .01,
			defaultValue: .35
		},
		{
			name: "u_haloWidth",
			label: "Halo Width",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .45
		},
		{
			name: "u_chromatic",
			label: "Colour Fringe",
			min: 0,
			max: .05,
			step: .001,
			defaultValue: .012
		}
	],
	colors: [{
		name: "u_tint",
		label: "Tint",
		defaultValue: {
			r: 1,
			g: .85,
			b: .7,
			a: 1
		}
	}]
});
_({
	type: "agx",
	label: "AgX",
	factory: () => u.createAgx(),
	uniforms: [{
		name: "u_contrast",
		label: "Contrast (Look)",
		min: .5,
		max: 2,
		step: .01,
		defaultValue: 1,
		neutralValue: 1
	}],
	builtinTextures: {
		u_lut: () => u.agxLut(),
		u_lookHigh: () => u.agxLookHigh(),
		u_lookLow: () => u.agxLookLow()
	}
});
_({
	type: "lutGrade",
	label: "LUT Grade",
	factory: () => u.createLutGrade(),
	uniforms: [{
		name: "u_intensity",
		label: "Intensity",
		min: 0,
		max: 1,
		step: .01,
		defaultValue: 1
	}],
	textures: [{
		name: "u_lut",
		label: "LUT (1024x32, 32 slices)"
	}]
});
_({
	type: "palette",
	label: "Palette",
	factory: () => u.createPalette(),
	uniforms: [
		{
			name: "u_strength",
			label: "Strength",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: 1,
			neutralValue: 0
		},
		{
			name: "u_dither",
			label: "Dither",
			min: 0,
			max: 1,
			step: .01,
			defaultValue: .5
		},
		{
			name: "u_ditherScale",
			label: "Dither Scale",
			min: 1,
			max: 16,
			step: 1,
			defaultValue: 1
		}
	],
	textures: [{
		name: "u_palette",
		label: "Palette (N x 1 image, one colour a pixel, up to 64)"
	}]
});
_({
	type: "displayLut",
	label: "Display LUT",
	stage: "output",
	uniforms: [{
		name: "u_intensity",
		label: "Intensity",
		min: 0,
		max: 1,
		step: .01,
		defaultValue: 1
	}],
	textures: [{
		name: "u_lut",
		label: "LUT (1024x32, 32 slices, as the display shows it)"
	}]
});
for (const [e, t] of Object.entries({
	lens: [
		"bloom",
		"depthOfField",
		"motionBlur",
		"lensFlare",
		"filmGrain",
		"chromaticAberration",
		"lensDistortion",
		"vignette",
		"sharpen"
	],
	color: [
		"tonemap",
		"agx",
		"colorGrade",
		"lutGrade",
		"displayLut",
		"autoExposure",
		"grayscale"
	],
	light: [
		"ssao",
		"gtao",
		"ssgi",
		"ssr",
		"voxelGI",
		"contactShadows",
		"lightShafts",
		"subsurface"
	],
	atmosphere: [
		"mist2d",
		"rain2d",
		"fog2d",
		"distanceFog",
		"heightFog",
		"skyAtmosphere",
		"rain",
		"snowCover"
	],
	aa: ["fxaa", "taa"],
	stylize: [
		"blur",
		"pixelate",
		"palette",
		"outline",
		"depthOutline",
		"edgeOutline"
	]
})) for (const n of t) {
	const t = g.get(n);
	if (t) t.category = e;
}
//#endregion
export { _ as a, s as c, b as i, i as l, x as n, h as o, v as r, c as s, y as t, a as u };

//# sourceMappingURL=effects.js.map