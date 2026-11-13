import { $t as e, Ct as t, c as n, dt as r, n as i, pt as a, qt as o } from "./system.js";
import { i as s, s as c } from "./resource.js";
import { s as l } from "./logger.js";
import { n as u } from "./AssetPlugin.js";
import { i as d } from "./base.js";
import { s as f } from "./worldUnits.js";
import { n as p } from "./disposeAll.js";
import { n as m, o as h, p as g } from "./resourceManager.js";
import { TextureContent as _ } from "../wasm.js";
import { i as v, r as y } from "./runtimeAssets.js";
import { n as b, r as x } from "./material.js";
import { a as S } from "./builtinShaders.js";
import { n as C, r as w, s as T } from "./meshFormat.js";
import { c as E } from "./movers.js";
import { o as D } from "./terrainPlugin.js";
import { c as O, d as k, f as A } from "./weather.js";
import { s as j, t as ee } from "./qualityRuntime.js";
import { n as te, t as ne } from "./splineComponent.js";
//#region src/water/waves.ts
/**
* @file    waves.ts
* @brief   The height of the water, in one formula the CPU and the Water shader share.
*
* @details A set of peaked sines (`exp(sin(theta) - 1)`: a crest narrower than its trough) spread about the wind, each with its own length,
*          height and speed. The shader's `waterWaveHeight` and `waveSlope` are the same arithmetic in GLSL and WGSL, written out FROM the
*          table below when the shader's source is assembled (waterShader.ts), so what a floating object reads here is what is drawn there
*          and there is one place to change a wave.
*
*          Each wave is taken at a place bent off the true one (`waveBend`). Straight sines a few directions apart add up to crests
*          that are long parallel lines, which is how a sea of them looked from above: scored with diagonal strokes, turning with the
*          wind.
*
*          Everything here is in the body's own space: x and z along its surface, the height along its up.
*/
/** How many waves a sea is the sum of at most. */
const re = 8;
/** How far to either side of the wind the waves head, in degrees. */
const ie = 65;
/** Each wave's length as a share of the one before it. */
const ae = .78;
/** What the heights of the whole set add up to, as a share of the body's height: the most a crest can stand above the rest plane. */
const oe = 2;
/**
* The set a sea is summed from, longest first: the first heads with the wind, each after it is shorter by the same share, lower as nearly as
* much (a wind sea's waves are about as steep at every length) and off the wind by a golden-ratio step, so no two headings are near and no
* two lengths share a multiple. Every wave travels at the speed its length gives deep water.
*/
function se() {
	const e = [];
	for (let t = 0; t < 8; t++) {
		const n = ae ** t;
		const r = t * .6180339887;
		e.push([
			t === 0 ? 0 : ie * ((r - Math.floor(r)) * 2 - 1),
			n,
			n ** .9,
			1
		]);
	}
	const t = e.reduce((e, t) => e + t[2], 0);
	const n = (e, t) => Number(e.toFixed(t));
	return e.map(([e, r, i, a]) => [
		n(e, 1),
		n(r, 4),
		n(i * 2 / t, 4),
		a
	]);
}
/** Each wave of the set: its heading off the base direction (degrees), its length and its height as shares of the body's, and its speed share. */
const M = se();
const N = Math.PI * 2;
const ce = 9.8;
/** How far a crest is bent, as a share of the longest wave. Its slope is this times the bend's frequency, about 0.33 at most. */
const P = .45;
/**
* Where the waves are read for the true place (x, z), bent by a span of `length`: a slow sine of z moves x and one of x moves z, at
* frequencies that share no multiple, repeating every 8.6 and 10.3 lengths. Each axis depends only on the other, so the two terms a slope needs (how x's bend changes along z,
* z's along x) are all of its Jacobian. The shader's `waterBend` is the same arithmetic.
*
* @returns x and z to read at, then dx/dz and dz/dx.
*/
function le(e, t, n) {
	const r = e / n, i = t / n;
	return [
		e + n * P * Math.sin(i * .73 + 1.3),
		t + n * P * Math.sin(r * .61 + 2.7),
		P * .73 * Math.cos(i * .73 + 1.3),
		P * .61 * Math.cos(r * .61 + 2.7)
	];
}
/**
* How much of a wave a mesh of `cell`-sized cells can draw: none below three cells to a wavelength, all of it from six. The shader applies the
* same ramp per vertex with the cell size of the ring the vertex is in, so a coarse far ring does not alias; `cell` 0 draws every wave.
*/
function ue(e, t) {
	if (t <= 0) return 1;
	return Math.min(Math.max((e / t - 3) / 3, 0), 1);
}
/** How many waves of the set a body sums: its count, held to the set. */
function de(e) {
	return Math.min(Math.max(Math.round(e.count ?? M.length), 1), M.length);
}
/** The surface's height above the body's rest plane at (x, z), `time` seconds in. */
function fe(e, t, n, r, i = 0) {
	let a = 0;
	const o = e.direction * Math.PI / 180;
	const [s, c] = le(t, n, e.length);
	let l = de(e);
	for (const [t, n, u, d] of M) {
		if (l-- <= 0) break;
		const f = e.length * n;
		const p = N / f;
		const m = o + t * Math.PI / 180;
		const h = Math.sqrt(ce * p) * e.speed * d;
		const g = p * (Math.sin(m) * s + Math.cos(m) * c) - h * r;
		a += e.height * u * Math.exp(Math.sin(g) - 1) * ue(f, i);
	}
	return a;
}
/** The slope of the surface at (x, z): how fast its height changes along x and along z. */
function pe(e, t, n, r) {
	let i = 0, a = 0;
	const o = e.direction * Math.PI / 180;
	const [s, c, l, u] = le(t, n, e.length);
	let d = de(e);
	for (const [t, n, l, u] of M) {
		if (d-- <= 0) break;
		const f = N / (e.length * n);
		const p = o + t * Math.PI / 180;
		const m = Math.sin(p), h = Math.cos(p);
		const g = Math.sqrt(ce * f) * e.speed * u;
		const _ = f * (m * s + h * c) - g * r;
		const v = e.height * l * Math.exp(Math.sin(_) - 1) * Math.cos(_) * f;
		i += m * v;
		a += h * v;
	}
	return [i + a * u, a + i * l];
}
/**
* The surf: waves that run in across the last `4 * length` of water, break on the shore and run up past it. `shore` is the distance to
* the shore (above zero on the water), `height` a breaker's most; the crests are lines of `phase` (a zone's is the shore's, smoothed,
* so they come in straight). Each has a steep face shoreward and a long back, at a deep-water wave's speed for their length times
* `speed`. The Water shader draws the same.
*/
function me(e, t, n, r, i, a = e) {
	if (t <= 0 || n <= 0) return 0;
	const o = n * 4;
	if (e > o || e < -o * .05) return 0;
	const s = Math.sqrt(ce * n / N) * r;
	const c = ge(a / n + s * i / n);
	const l = c > .8 ? F((c - .8) / .2) : 1 - F(c / .8);
	return t * l * l * he(e, o);
}
/** How much of the surf stands at `shore`: none out past its reach, rising as the water shoals, and dying as it runs up the ground. */
function he(e, t) {
	return (1 - F((e - t * .25) / (t * .75))) * (e >= 0 ? 1 : 1 - F(-e / (t * .05)));
}
function ge(e) {
	return e - Math.floor(e);
}
function F(e) {
	const t = Math.min(Math.max(e, 0), 1);
	return t * t * (3 - 2 * t);
}
//#endregion
//#region src/water/waterfallShader.ts
/**
* @file    waterfallShader.ts
* @brief   The Waterfall shader: a sheet of falling water that leaves the lip as glass, tears into strands and ends as veils.
*
* @details It reads what a `Waterfall`'s mesh carries (waterfall.ts): across the sheet in uv.x, the seconds fallen in uv.y, the share of the
*          fall done in the colour's red, the sheet's own number in its green. A pattern keeps its (seconds fallen - now), so it rides down
*          with the water at the water's own speed and stretches as the water does.
*/
const _e = `#pragma shader "Waterfall"
#pragma version 300 es
#pragma domain Lit
// The water at the lip, before it breaks, and the white it breaks into.
#pragma param u_water color default(0.30,0.55,0.52,1)
#pragma param u_foam color default(0.90,0.94,0.98,1)
// How many strands lie across half the sheet, and how many times in a second of its fall a strand changes: fewer is longer strands.
// The pattern always rides down with the water.
#pragma param u_strands float default(3.75) range(0.5,400) ui(slider)
#pragma param u_run float default(0.97) range(0,40) ui(slider)
// How much of the sheet is gone at its foot (0 a whole sheet to the bottom, 1 nothing left of it), and how far down it is torn that much.
#pragma param u_veil float default(0.75) range(0,1) ui(slider)
#pragma param u_tearBy float default(1) range(0.05,1) ui(slider)
#pragma param u_opacity float default(1) range(0,1) ui(slider)
#pragma param u_roughness float default(0.6) range(0.02,1) ui(slider)
// How much of the light goes through the sheet: a veil of water is lit from whichever side the sun is on, not as a wall facing it.
// 0 lights it as an opaque surface.
#pragma param u_translucency float default(1) range(0,1) ui(slider)

#pragma fragment
precision highp float;

in vec4 v_color;
in vec2 v_texCoord;
in highp vec2 v_worldPos;
#ifdef MESH_NORMALS
in highp vec3 v_worldNormal;
in highp vec3 v_worldXYZ;
#endif

#ifdef ES_GBUFFER
layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 fragSurface;
layout(location = 2) out vec4 fragAlbedo;
#else
out vec4 fragColor;
#endif

float fallHash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float fallNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 w = f * f * (3.0 - 2.0 * f);
    return mix(mix(fallHash(i), fallHash(i + vec2(1.0, 0.0)), w.x), mix(fallHash(i + vec2(0.0, 1.0)), fallHash(i + vec2(1.0, 1.0)), w.x), w.y);
}

void main() {
#ifdef MESH_NORMALS
    highp vec3 P = v_worldXYZ;
    highp vec3 N = normalize(v_worldNormal);
#else
    highp vec3 P = vec3(v_worldPos.x, 0.0, v_worldPos.y);
    highp vec3 N = vec3(0.0, 1.0, 0.0);
#endif
    highp vec3 V = viewDirection(P);
    if (dot(N, V) < 0.0) N = -N;
    float side = v_texCoord.x * 2.0 - 1.0, k = clamp(v_color.r, 0.0, 1.0), own = v_color.g;
    float across = (side + own) * u_strands;
    float along = (v_texCoord.y - u_time.x) * u_run;
    float strands = fallNoise(vec2(across, along)) * 0.55 + fallNoise(vec2(across * 2.5 + 9.0, along * 2.1)) * 0.45;
    float clumps = fallNoise(vec2(across / 3.0 + 3.0, along * 0.45));
    // A glassy lip that tears into strands, then into veils.
    float body = mix(1.0, 0.74, smoothstep(0.05, 0.7, k));
    float cut = mix(-0.05, u_veil, smoothstep(0.0, u_tearBy, k)) - (clumps - 0.5) * 0.35;
    float alpha = smoothstep(cut, cut + 0.22, strands) * body + (1.0 - smoothstep(0.0, 0.06, k)) * 0.9;
    alpha *= pow(max(1.0 - side * side, 0.0), mix(0.35, 0.9, k));
    alpha *= 1.0 - smoothstep(0.90, 1.0, k) * 0.6;
    alpha = clamp(alpha * u_opacity, 0.0, 1.0);
    if (alpha < 0.02) discard;
    vec3 albedo = mix(u_water.rgb, u_foam.rgb, smoothstep(0.0, 0.10, k) * (0.6 + 0.4 * strands));
    SurfaceExt ext = surfaceExtNone(N);
    if (u_translucency > 0.0) {
        ext.scatter = vec4(albedo, u_translucency * 0.5);
        ext.trans = vec4(u_translucency, 0.0, 0.0, 0.0);
    }
    vec3 lit = applyLightingSurface(albedo, N, P, V, 0.0, u_roughness, 0.5, 1.0, ext);
    fragColor = vec4(lit, alpha);
#ifdef ES_GBUFFER
    fragSurface = vec4(0.5, 0.5, u_roughness, 0.0);
    fragAlbedo = vec4(albedo, 1.0);
#endif
}
#pragma end

#pragma fragment wgsl
fn fallHash(p : vec2f) -> f32 { var q = fract(vec3f(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
fn fallNoise(p : vec2f) -> f32 {
    let i = floor(p); let f = fract(p);
    let w = f * f * (3.0 - 2.0 * f);
    return mix(mix(fallHash(i), fallHash(i + vec2f(1.0, 0.0)), w.x), mix(fallHash(i + vec2f(0.0, 1.0)), fallHash(i + vec2f(1.0, 1.0)), w.x), w.y);
}
#ifdef ES_GBUFFER
struct FragOut {
    @location(0) color : vec4f,
    @location(1) surface : vec4f,
    @location(2) albedo : vec4f,
};
@fragment fn fs_main(v : VSOut) -> FragOut {
#else
@fragment fn fs_main(v : VSOut) -> @location(0) vec4f {
#endif
    g_probeSlot = v.v_probeSlot;
#ifdef MESH_LIGHTMAP
    g_lightmap = v.v_lightmap;
#endif
#ifdef MESH_NORMALS
    let P = v.v_worldXYZ;
    var N = normalize(v.v_worldNormal);
#else
    let P = vec3f(v.v_worldPos.x, 0.0, v.v_worldPos.y);
    var N = vec3f(0.0, 1.0, 0.0);
#endif
    let V = viewDirection(P);
    if (dot(N, V) < 0.0) { N = -N; }
    let side = v.v_texCoord.x * 2.0 - 1.0;
    let k = clamp(v.v_color.r, 0.0, 1.0);
    let across = (side + v.v_color.g) * mc.u_strands;
    let along = (v.v_texCoord.y - tc.u_time.x) * mc.u_run;
    let strands = fallNoise(vec2f(across, along)) * 0.55 + fallNoise(vec2f(across * 2.5 + 9.0, along * 2.1)) * 0.45;
    let clumps = fallNoise(vec2f(across / 3.0 + 3.0, along * 0.45));
    let body = mix(1.0, 0.74, smoothstep(0.05, 0.7, k));
    let cut = mix(-0.05, mc.u_veil, smoothstep(0.0, mc.u_tearBy, k)) - (clumps - 0.5) * 0.35;
    var alpha = smoothstep(cut, cut + 0.22, strands) * body + (1.0 - smoothstep(0.0, 0.06, k)) * 0.9;
    alpha = alpha * pow(max(1.0 - side * side, 0.0), mix(0.35, 0.9, k));
    alpha = alpha * (1.0 - smoothstep(0.90, 1.0, k) * 0.6);
    alpha = clamp(alpha * mc.u_opacity, 0.0, 1.0);
    if (alpha < 0.02) { discard; }
    let albedo = mix(mc.u_water.rgb, mc.u_foam.rgb, smoothstep(0.0, 0.10, k) * (0.6 + 0.4 * strands));
    var ext = surfaceExtNone(N);
    if (mc.u_translucency > 0.0) {
        ext.scatter = vec4f(albedo, mc.u_translucency * 0.5);
        ext.trans = vec4f(mc.u_translucency, 0.0, 0.0, 0.0);
    }
    let lit = applyLightingSurface(albedo, N, P, V, 0.0, mc.u_roughness, 0.5, 1.0, ext);
#ifdef ES_GBUFFER
    var frag : FragOut;
    frag.color = vec4f(lit, alpha);
    frag.surface = vec4f(0.5, 0.5, mc.u_roughness, 0.0);
    frag.albedo = vec4f(albedo, 1.0);
    return frag;
#else
    return vec4f(lit, alpha);
#endif
}
#pragma end
`;
const ve = S("waterfall", "Waterfall", "Falling water for a Waterfall: glass at the lip, strands and then veils on the way down, riding down with the water.", _e);
//#endregion
//#region src/water/riverBed.ts
/** Stations to a modifier: a stretch a few widths long. */
const I = 24;
/** How far out from the edge the banks reach, in half-widths, before they give the ground back. */
const ye = 2;
const be = (e, t, n) => {
	const r = Math.min(Math.max((n - e) / (t - e), 0), 1);
	return r * r * (3 - 2 * r);
};
/** The height the bed would have at (x, z) by the stations of one stretch, and how much of it holds there (0 past its banks). */
function xe(e, t, n, r, i, a) {
	let o = Infinity, s = 0;
	for (let c = t; c < n; c++) {
		const t = e[c], n = e[c + 1];
		const l = n.x - t.x, u = n.z - t.z;
		const d = l * l + u * u;
		const f = d > 0 ? Math.min(Math.max(((i - t.x) * l + (a - t.z) * u) / d, 0), 1) : 0;
		const p = Math.hypot(i - (t.x + l * f), a - (t.z + u * f));
		const m = Math.max(t.half + (n.half - t.half) * f, .001);
		const h = m * 3;
		if (p >= h) continue;
		const g = t.y + (n.y - t.y) * f;
		const _ = p / m;
		const v = _ < 1 ? g - r * (1 - _ * _) : g + 2 * r / m * (p - m);
		o = Math.min(o, v);
		s = Math.max(s, 1 - be(m * ye, h, p));
	}
	return {
		height: o,
		weight: s
	};
}
/**
* The modifiers that cut a river's bed `depth` under its surface, a stretch of it each, their ids starting with `prefix`.
* @experimental
*/
function Se(e, t, n) {
	if (t.length < 2 || !(n > 0)) return [];
	const r = [];
	for (let i = 0; i < t.length - 1; i += I) {
		const a = Math.min(i + I, t.length - 1);
		let o = Infinity, s = Infinity, c = -Infinity, l = -Infinity;
		for (let e = i; e <= a; e++) {
			const n = t[e], r = n.half * 3;
			o = Math.min(o, n.x - r);
			c = Math.max(c, n.x + r);
			s = Math.min(s, n.z - r);
			l = Math.max(l, n.z + r);
		}
		r.push({
			id: `${e}${i / I}`,
			bounds: [
				o,
				s,
				c,
				l
			],
			apply(e, r, o) {
				const s = xe(t, i, a, n, e, r);
				if (s.weight <= 0 || s.height >= o) return o;
				return o + (s.height - o) * s.weight;
			}
		});
	}
	return r;
}
//#endregion
//#region src/water/waterMesh.ts
/**
* @file    waterMesh.ts
* @brief   The geometry of a zone's water: rings of coarsening grids that follow the camera.
*
* @details It lies in the xz plane facing up, with the uv the position itself (so the Water shader's surface space is x and z, plus
*          `u_origin`), and the vertex colour's red the number of the ring the vertex is in, in sevenths (`cell * 2^(red * 7)`
*          is its cell size: the Water shader's vertex hook fades the waves a coarse ring cannot draw by it).
*
*          The surface is rings, each a grid of the same number of cells with twice the cell size of the one inside it and a hole where that one
*          sits. Where two rings meet the coarse one has half the vertices along the edge, so the surfaces can part there by what the waves
*          do between its vertices; the fade keeps that to waves the coarse ring can already draw.
*/
/**
* An ocean of `rings` rings of `cells` cells a side (a multiple of four), the innermost with `cellSize` cells. It reaches
* `cells * cellSize * 2^(rings - 1) / 2` out from its centre, and with `skirt` a flat apron runs on from there to that
* half-extent: the sea out to the horizon, at the cost of one cell's quads along each side.
*/
function Ce(e, t, n, r = 0) {
	const i = Math.max(4, Math.round(e / 4) * 4);
	const a = Math.min(8, Math.max(1, Math.floor(t)));
	const o = [];
	for (let e = 0; e < a; e++) {
		const t = n * 2 ** e;
		o.push({
			half: i * t / 2,
			cell: t,
			hole: e === 0 ? 0 : i * t / 4,
			ring: e
		});
	}
	const s = [], c = [], l = [];
	for (const e of o) {
		const t = s.length / 3;
		const n = i + 1;
		for (let t = 0; t <= i; t++) for (let n = 0; n <= i; n++) {
			s.push(-e.half + n * e.cell, 0, -e.half + t * e.cell);
			c.push(e.ring / 7, 1, 0, 1);
		}
		for (let r = 0; r < i; r++) for (let a = 0; a < i; a++) {
			const i = -e.half + (a + .5) * e.cell, o = -e.half + (r + .5) * e.cell;
			if (e.hole > 0 && Math.abs(i) < e.hole && Math.abs(o) < e.hole) continue;
			Ee(l, t + r * n + a, t + (r + 1) * n + a, t + r * n + a + 1, t + (r + 1) * n + a + 1);
		}
	}
	const u = o[o.length - 1];
	if (r > u.half) {
		const e = s.length / 3, t = r / u.half;
		const n = [];
		for (let e = 0; e <= i; e++) n.push([-u.half + e * u.cell, -u.half]);
		for (let e = 1; e <= i; e++) n.push([u.half, -u.half + e * u.cell]);
		for (let e = 1; e <= i; e++) n.push([u.half - e * u.cell, u.half]);
		for (let e = 1; e < i; e++) n.push([-u.half, u.half - e * u.cell]);
		for (const [e, t] of n) {
			s.push(e, 0, t);
			c.push(u.ring / 7, 0, 0, 1);
		}
		for (const [e, r] of n) {
			s.push(e * t, 0, r * t);
			c.push(u.ring / 7, 0, 0, 1);
		}
		const a = n.length;
		for (let t = 0; t < a; t++) {
			const n = e + t, r = e + (t + 1) % a, i = e + a + t, o = e + a + (t + 1) % a;
			l.push(n, r, i, r, o, i);
		}
	}
	return De(s, c, l);
}
/** The outer half-extent of an ocean built with these numbers. */
function we(e, t, n) {
	return Math.max(4, Math.round(e / 4) * 4) * n * 2 ** (Math.min(8, Math.max(1, Math.floor(t))) - 1) / 2;
}
/** The cell size of the coarsest ring: the lattice an ocean follows its camera on, so every ring stays aligned. */
function Te(e, t) {
	return t * 2 ** (Math.min(8, Math.max(1, Math.floor(e))) - 1);
}
/** Two triangles over a cell, facing up (+y) for the vertex order `p00, p01 (+z), p10 (+x), p11`. */
function Ee(e, t, n, r, i) {
	e.push(t, n, r, r, n, i);
}
function De(e, t, n) {
	const { channels: r, vertexStride: i } = T([
		{
			semantic: C.Position,
			components: 3,
			type: w.Float32
		},
		{
			semantic: C.TexCoord0,
			components: 2,
			type: w.Float32
		},
		{
			semantic: C.Color,
			components: 4,
			type: w.UNorm8
		},
		{
			semantic: C.Normal,
			components: 3,
			type: w.Float32
		}
	]);
	const a = e.length / 3;
	const o = new Uint8Array(a * i);
	const s = new DataView(o.buffer);
	const c = r[0].offset, l = r[1].offset, u = r[2].offset, d = r[3].offset;
	const f = [
		Infinity,
		Infinity,
		Infinity
	];
	const p = [
		-Infinity,
		-Infinity,
		-Infinity
	];
	for (let n = 0; n < a; n++) {
		const r = n * i;
		for (let t = 0; t < 3; t++) {
			const i = e[n * 3 + t];
			s.setFloat32(r + c + t * 4, i, true);
			if (i < f[t]) f[t] = i;
			if (i > p[t]) p[t] = i;
		}
		s.setFloat32(r + d, 0, true);
		s.setFloat32(r + d + 4, 1, true);
		s.setFloat32(r + d + 8, 0, true);
		s.setFloat32(r + l, e[n * 3], true);
		s.setFloat32(r + l + 4, e[n * 3 + 2], true);
		for (let e = 0; e < 4; e++) s.setUint8(r + u + e, Math.round(Math.min(Math.max(t[n * 4 + e], 0), 1) * 255));
	}
	return {
		channels: r,
		vertexStride: i,
		vertexCount: a,
		vertices: o,
		indices: new Uint32Array(n),
		aabbMin: f,
		aabbMax: p
	};
}
//#endregion
//#region src/water/waterfall.ts
/**
* Falling water from the entity's place along its forward, drawn as the entity's MeshRenderer.
*
* @experimental
*/
const L = /* @__PURE__ */ e("Waterfall", {
	width: 800,
	speed: 500,
	flare: 1.1,
	sheets: 3,
	sheetGap: 90,
	maxDrop: 3e4,
	rows: 56,
	across: 6
}, {
	worldUnitFields: [
		"width",
		"speed",
		"sheetGap",
		"maxDrop"
	],
	fields: {
		width: {
			min: .01,
			unit: "wu",
			tooltip: "How wide the water is where it leaves the lip."
		},
		speed: {
			min: 0,
			unit: "wu/s",
			tooltip: "How fast it leaves the lip, level and along the entity's forward. Faster throws it further out."
		},
		flare: {
			min: 0,
			max: 4,
			step: .01,
			tooltip: "How much wider a sheet is at its foot than at the lip, as a share of its width."
		},
		sheets: {
			min: 1,
			max: 5,
			step: 1,
			tooltip: "How many sheets, one behind another along the throw."
		},
		sheetGap: {
			min: 0,
			unit: "wu",
			tooltip: "How far apart the sheets leave the lip."
		},
		maxDrop: {
			min: .01,
			unit: "wu",
			tooltip: "How far under the lip a fall that meets nothing ends."
		},
		rows: {
			min: 2,
			max: 256,
			step: 1,
			tooltip: "Rows down a sheet. More follows the curve more closely."
		},
		across: {
			min: 1,
			max: 32,
			step: 1,
			tooltip: "Cells across a sheet."
		}
	}
});
/**
* Keeps the entity, a child of a `Waterfall`'s, on the middle of the fall: at its foot wherever that is, or a share of the way down.
*
* @experimental
*/
const R = /* @__PURE__ */ e("WaterfallAnchor", {
	at: 1,
	lift: 0
}, {
	worldUnitFields: ["lift"],
	fields: {
		at: {
			min: 0,
			max: 1,
			step: .01,
			tooltip: "Where on the fall, as a share of the time the water takes to come down: 0 the lip, 1 the foot."
		},
		lift: {
			unit: "wu",
			tooltip: "How far above the path of the fall there."
		}
	}
});
/** Where an anchor sits in the fall's own space (the throw along -z), on a fall that takes `seconds` to come down. */
function Oe(e, t, n) {
	const r = Math.max(0, Math.min(1, n.at)) * t;
	return [
		0,
		n.lift - .5 * z * f() * r * r,
		-e.speed * r
	];
}
/** Gravity, in metres a second squared. */
const z = 9.8;
/** How far a sheet has to have dropped, in metres, before what it meets ends it: at the lip it is still in the water it left. */
const ke = .5;
/** The share of the middle sheet's width the others have. */
const Ae = .72;
/** How far the middle of a sheet bows out past its edges at the foot, as a share of the sheet's own half width there. */
const je = .14;
/** The seconds a sheet thrown from `lip`, `ahead` along the throw, falls before it lands, and the drop that is. */
function B(e, t, n, r = 0) {
	const i = z * f();
	const a = Math.sqrt(2 * Math.max(e.maxDrop, .001) / i);
	const o = ke * f();
	const s = 512;
	const c = n?.waterAt?.(t.x, t.z, t.y)?.body ?? null;
	for (let l = 1; l <= s; l++) {
		const u = a * l / s, d = .5 * i * u * u;
		if (d < o) continue;
		const f = t.x + t.dirX * (e.speed * u + r), p = t.z + t.dirZ * (e.speed * u + r), m = t.y - d;
		const h = n?.heightAt?.(f, p) ?? null;
		const g = n?.waterAt?.(f, p, m) ?? null;
		if (h !== null && m <= h || g !== null && g.above <= 0 && g.body !== c) return {
			seconds: u,
			drop: d
		};
	}
	return {
		seconds: a,
		drop: e.maxDrop
	};
}
/**
* The sheets' geometry in the entity's own space, where the throw is along -z: the entity's turn about the vertical is what aims it in the
* world, and `lip` says where that is for what the sheets land on. Null where there is nothing to draw. Rows are closer together near the
* lip, where the path turns the most.
*/
function Me(e, t, n) {
	if (!(e.width > 0) || !(e.maxDrop > 0)) return null;
	const r = z * f();
	const i = Math.max(1, Math.min(5, Math.floor(e.sheets)));
	const a = Math.max(2, Math.min(256, Math.floor(e.rows)));
	const o = Math.max(1, Math.min(32, Math.floor(e.across)));
	const { channels: s, vertexStride: c } = T([
		{
			semantic: C.Position,
			components: 3,
			type: w.Float32
		},
		{
			semantic: C.TexCoord0,
			components: 2,
			type: w.Float32
		},
		{
			semantic: C.Color,
			components: 4,
			type: w.UNorm8
		},
		{
			semantic: C.Normal,
			components: 3,
			type: w.Float32
		}
	]);
	const l = i * ((a + 1) * (o + 1));
	const u = new Uint8Array(l * c);
	const d = new DataView(u.buffer);
	const p = (e) => s.find((t) => t.semantic === e).offset;
	const m = p(C.Position), h = p(C.TexCoord0), g = p(C.Color), _ = p(C.Normal);
	const v = [
		Infinity,
		Infinity,
		Infinity
	];
	const y = [
		-Infinity,
		-Infinity,
		-Infinity
	];
	const b = new Uint32Array(i * a * o * 6);
	let x = 0, S = 0;
	for (let s = 0; s < i; s++) {
		const l = (i - 1) / 2;
		const u = (s - l) * e.sheetGap;
		const f = e.width * .5 * (s === Math.round(l) ? 1 : Ae);
		const { seconds: p } = B(e, t, n, u);
		const C = x;
		for (let t = 0; t <= a; t++) {
			const n = Math.pow(t / a, .8) * p, i = p > 0 ? n / p : 0;
			const l = e.speed * n + u, b = .5 * r * n * n;
			const S = f * (1 + e.flare * i);
			const C = r * n, w = Math.hypot(e.speed, C) || 1;
			const T = [
				0,
				e.speed / w,
				-C / w
			];
			for (let e = 0; e <= o; e++, x++) {
				const t = e / o, r = t * 2 - 1;
				const a = (1 - r * r) * je * S * i;
				const u = [
					r * S,
					-b,
					-(l + a)
				];
				const f = x * c;
				for (let e = 0; e < 3; e++) {
					d.setFloat32(f + m + e * 4, u[e], true);
					d.setFloat32(f + _ + e * 4, T[e], true);
					if (u[e] < v[e]) v[e] = u[e];
					if (u[e] > y[e]) y[e] = u[e];
				}
				d.setFloat32(f + h, t, true);
				d.setFloat32(f + h + 4, n, true);
				d.setUint8(f + g, Math.round(i * 255));
				d.setUint8(f + g + 1, Math.round(s * .381966 % 1 * 255));
				d.setUint8(f + g + 2, 255);
				d.setUint8(f + g + 3, e === 0 || e === o ? 0 : 255);
			}
		}
		for (let e = 0; e < a; e++) for (let t = 0; t < o; t++) {
			const n = C + e * (o + 1) + t, r = n + 1, i = n + o + 1, a = i + 1;
			b[S++] = n;
			b[S++] = r;
			b[S++] = i;
			b[S++] = r;
			b[S++] = a;
			b[S++] = i;
		}
	}
	return {
		channels: s,
		vertexStride: c,
		vertexCount: l,
		vertices: u,
		indices: b,
		aabbMin: v,
		aabbMax: y
	};
}
/** The level direction an entity turned by `q` faces along (its forward, -z, laid on the ground), or -z where it faces straight up or down. */
function Ne(e) {
	const t = -2 * (e.x * e.z + e.w * e.y), n = -(1 - 2 * (e.x * e.x + e.y * e.y));
	const r = Math.hypot(t, n);
	return r > 1e-6 ? [t / r, n / r] : [0, -1];
}
/** What there is to land on, whichever modules are here, and how to tell when it has changed or is still being made. */
function Pe(e) {
	const t = e.getResourceByName?.("Terrains");
	const n = e.getResourceByName?.("Waters");
	const r = t && typeof t.heightAt === "function" && t.built_?.size ? t : null;
	const i = n && typeof n.sample === "function" && !n.empty ? n : null;
	return {
		query: {
			heightAt: r ? (e, t) => r.heightAt(e, t) : void 0,
			waterAt: i ? (e, t, n) => {
				const r = i.sample(e, n, t);
				return r ? {
					body: r.entity,
					above: r.depth
				} : null;
			} : void 0
		},
		revision: `${r?.revision_ ?? -1}:${i?.revision_ ?? -1}`,
		waiting: !!t?.loading || !!n?.baking
	};
}
/** Keeps every `Waterfall` falling to what is under it. Called once by the water plugin. */
function Fe(e) {
	const r = /* @__PURE__ */ new Map();
	let i = 0, s = false;
	const c = (t) => {
		const n = r.get(t);
		r.delete(t);
		if (n?.handle && e.hasResource(u)) e.getResource(u).releaseBuiltMesh(n.handle);
	};
	e.world.onDespawn(c);
	const l = (t, n, r) => {
		const i = e.world;
		for (const e of i.tryGet(t, a)?.entities ?? []) {
			if (!i.has(e, R) || !i.has(e, o)) continue;
			const [t, a, s] = Oe(n, r, i.get(e, R));
			const c = i.get(e, o);
			if (c.position.x !== t || c.position.y !== a || c.position.z !== s) i.set(e, o, {
				...c,
				position: {
					x: t,
					y: a,
					z: s
				}
			});
		}
	};
	e.addSystemToSchedule(3, n([], () => {
		const n = e.world;
		if (!e.hasResource(u)) return;
		const a = e.getResource(u);
		for (const e of [...r.keys()]) if (!n.valid(e) || !n.has(e, L)) c(e);
		const d = n.getEntitiesWithComponents([L, o]);
		if (d.length === 0) return;
		if (!i && !s) {
			s = true;
			a.load("material-shader", "builtin:waterfall").then((e) => {
				i = x.createFromAsset({
					version: "1.0",
					type: "material",
					shader: "builtin:waterfall",
					blendMode: 0,
					depthTest: true,
					depthWrite: false,
					cull: 0,
					properties: {}
				}, e.compile([]));
			});
		}
		const p = Pe(e);
		if (p.waiting) return;
		for (const e of d) {
			const s = n.get(e, L);
			const c = n.get(e, o);
			const u = n.has(e, t) ? n.get(e, t) : null;
			const d = !!u?.material && u.material !== i;
			if (!d && !i) continue;
			const [m, h] = Ne(c.worldRotation);
			const g = {
				x: c.worldPosition.x,
				y: c.worldPosition.y,
				z: c.worldPosition.z,
				dirX: m,
				dirZ: h
			};
			const _ = JSON.stringify([
				s,
				g,
				p.revision,
				f(),
				d ? u.material : i
			]);
			const v = r.get(e);
			if (v?.key === _) {
				l(e, s, v.seconds);
				continue;
			}
			const y = Me(s, g, p.query);
			const b = y ? a.createMesh(y) : 0;
			if (v?.handle) a.releaseBuiltMesh(v.handle);
			const { seconds: x } = B(s, g, p.query);
			r.set(e, {
				key: _,
				handle: b,
				seconds: x
			});
			l(e, s, x);
			n.insert(e, t, {
				...u,
				enabled: true,
				mesh: b,
				material: d ? u.material : i,
				opaque: false,
				castShadows: false,
				cullBackfaces: false
			});
		}
	}, { name: "WaterfallSystem" }));
}
//#endregion
//#region src/water/ripples.ts
/**
* @file    ripples.ts
* @brief   The disturbance a thing makes in water: a wave equation on a grid, and the foam it leaves.
*
* @details A water zone that is asked to ripple keeps a square window of its surface, a few hundred world units across, as a grid of heights, and each
*          step moves it by the wave equation (every cell is pulled toward the mean of its four neighbours, and carries the velocity it had), with a little
*          damping so a ripple dies. A disturbance (a body entering, a body moving, a script's `disturb`) is a smooth bump put into the grid; it spreads
*          as a ring at the wave speed. Beside the height the grid keeps a foam: fed where a disturbance was and where the water moves, and fading with time.
*
*          It is the CPU's, and a plain array: it runs wherever the app does, is the same on every backend, and can be read back. The window follows the camera
*          (it is re-centred in whole cells and the contents shift with it), so a lake or an ocean of any size has ripples where they are seen, for the
*          price of one grid. The Water shader reads it as a texture (`encode`) for the slope it adds to the waves' and for the foam.
*
*          The wave equation is stepped in as many substeps as keep the wave from crossing more than half a cell in one: past that it would not be stable.
*/
/** A ripple grid over a square window of a body's own xz plane. */
var Ie = class {
	constructor(e, t) {
		this.originX = 0;
		this.originZ = 0;
		this.limit = Infinity;
		this.n = Math.max(8, Math.floor(e));
		this.size = Math.max(.001, t);
		this.cell = this.size / this.n;
		const n = this.n * this.n;
		this.height = new Float32Array(n);
		this.previous = new Float32Array(n);
		this.next = new Float32Array(n);
		this.foam = new Float32Array(n);
	}
	/** The cell index holding (x, z), or -1 outside the window. */
	index(e, t) {
		const n = Math.floor((e - this.originX) / this.cell), r = Math.floor((t - this.originZ) / this.cell);
		return n < 0 || r < 0 || n >= this.n || r >= this.n ? -1 : r * this.n + n;
	}
	/**
	* Moves the window so it is centred on (x, z), in whole cells: the grid shifts under it, what was on the side it leaves is gone and what comes in is still water.
	* Returns whether it moved.
	*/
	recenter(e, t) {
		const n = Math.round((e - this.size / 2) / this.cell) * this.cell;
		const r = Math.round((t - this.size / 2) / this.cell) * this.cell;
		const i = Math.round((n - this.originX) / this.cell), a = Math.round((r - this.originZ) / this.cell);
		if (i === 0 && a === 0) return false;
		if (Math.abs(i) >= this.n || Math.abs(a) >= this.n) {
			this.height.fill(0);
			this.previous.fill(0);
			this.foam.fill(0);
		} else for (const e of [
			this.height,
			this.previous,
			this.foam
		]) this.shift(e, i, a);
		this.originX = n;
		this.originZ = r;
		return true;
	}
	/** Shifts a grid so the cell that was at (i + di, j + dj) is at (i, j): the window moving by (di, dj) cells. */
	shift(e, t, n) {
		const r = this.n, i = e.slice();
		e.fill(0);
		for (let a = 0; a < r; a++) {
			const o = a + n;
			if (o < 0 || o >= r) continue;
			for (let n = 0; n < r; n++) {
				const s = n + t;
				if (s >= 0 && s < r) e[a * r + n] = i[o * r + s];
			}
		}
	}
	/**
	* A smooth bump of `strength` (a height in world units; negative is a dip) and `radius` put into the water at (x, z). It is put into the current heights and the
	* last step's alike, so it starts at rest and spreads, and it feeds the foam by as much as it is strong.
	*/
	disturb(e, t, n, r) {
		const i = Math.max(n, this.cell);
		const a = Math.floor((e - i - this.originX) / this.cell), o = Math.ceil((e + i - this.originX) / this.cell);
		const s = Math.floor((t - i - this.originZ) / this.cell), c = Math.ceil((t + i - this.originZ) / this.cell);
		for (let n = Math.max(s, 0); n <= Math.min(c, this.n - 1); n++) for (let s = Math.max(a, 0); s <= Math.min(o, this.n - 1); s++) {
			const a = this.originX + (s + .5) * this.cell - e, o = this.originZ + (n + .5) * this.cell - t;
			const c = (a * a + o * o) / (i * i);
			if (c >= 1) continue;
			const l = (1 - c) * (1 - c);
			const u = n * this.n + s;
			const d = this.limit;
			this.height[u] = Math.min(Math.max(this.height[u] + r * l, -d), d);
			this.previous[u] = Math.min(Math.max(this.previous[u] + r * l, -d), d);
			this.foam[u] = Math.min(this.foam[u] + Math.min(Math.abs(r) / Math.max(i * .25, 1e-6), 1) * l, 1);
		}
	}
	/**
	* Steps the grid `dt` seconds on: waves travelling at `speed` (world units a second), losing `damping` of their height a second, and the foam fading by `foamFade` a second.
	* The window's edge lets waves out (the heights there are held at rest) rather than reflecting them.
	*/
	step(e, t, n, r) {
		if (e <= 0) return;
		const i = this.n;
		const a = Math.max(1, Math.ceil(t * e / (.5 * this.cell)));
		const o = e / a;
		const s = (t * o / this.cell) ** 2;
		const c = Math.max(1 - n * o, 0);
		for (let e = 0; e < a; e++) {
			const e = this.height, t = this.previous, n = this.next;
			for (let r = 1; r < i - 1; r++) for (let a = 1; a < i - 1; a++) {
				const o = r * i + a;
				const l = e[o - 1] + e[o + 1] + e[o - i] + e[o + i] - 4 * e[o];
				n[o] = (2 * e[o] - t[o] + s * l) * c;
			}
			for (let e = 0; e < i; e++) {
				n[e] = 0;
				n[(i - 1) * i + e] = 0;
				n[e * i] = 0;
				n[e * i + i - 1] = 0;
			}
			this.previous = this.height;
			this.height = n;
			this.next = t;
		}
		const l = Math.exp(-Math.max(r, 0) * e);
		for (let e = 0; e < this.foam.length; e++) this.foam[e] *= l;
	}
	/** The height of the ripples at (x, z) in world units, 0 outside the window. */
	heightAt(e, t) {
		const n = this.index(e, t);
		return n < 0 ? 0 : this.height[n];
	}
	/** The foam at (x, z), 0 to 1, 0 outside the window. */
	foamAt(e, t) {
		const n = this.index(e, t);
		return n < 0 ? 0 : this.foam[n];
	}
	/** The greatest height anywhere in the grid, for a caller asking whether the water is still. */
	peak() {
		let e = 0;
		for (let t = 0; t < this.height.length; t++) e = Math.max(e, Math.abs(this.height[t]));
		return e;
	}
	/**
	* The grid as RGBA8 for the shader: red the height (0.5 at rest, `range` above or below at 1 and 0), green the foam, blue and alpha unused (255).
	* Row j of the grid is row j of the image, so the shader's uv is (x - originX) / size, (z - originZ) / size.
	*/
	encode(e, t) {
		const n = t && t.length === this.n * this.n * 4 ? t : new Uint8Array(this.n * this.n * 4);
		for (let t = 0; t < this.height.length; t++) {
			n[t * 4] = Math.round(Math.min(Math.max(this.height[t] / (2 * e) + .5, 0), 1) * 255);
			n[t * 4 + 1] = Math.round(Math.min(Math.max(this.foam[t], 0), 1) * 255);
			n[t * 4 + 2] = 0;
			n[t * 4 + 3] = 255;
		}
		return n;
	}
};
//#endregion
//#region src/water/waterQuery.ts
/** How far a texel is from a shore when it is the open sea's: past any shore, deep in. */
const V = 1e6;
/** How deep water stands at a point and how far it is from the shore: what a world is laid out by, from the field's own numbers. */
var Le = class {
	constructor(e) {
		this.data = e;
	}
	lerp(e, t) {
		const { minX: n, minZ: r, sizeX: i, sizeZ: a, nx: o, nz: s } = this.data.grid;
		if (o < 2 || s < 2) return null;
		const c = (e - n) / i, l = (t - r) / a;
		if (c < 0 || c > 1 || l < 0 || l > 1) return null;
		const u = c * (o - 1), d = l * (s - 1);
		const f = Math.min(Math.floor(u), o - 2), p = Math.min(Math.floor(d), s - 2);
		const m = u - f, h = d - p, g = p * o + f;
		const _ = (e) => (e[g] * (1 - m) + e[g + 1] * m) * (1 - h) + (e[g + o] * (1 - m) + e[g + o + 1] * m) * h;
		return {
			height: _(this.data.height),
			shore: _(this.data.shore)
		};
	}
	/** How deep the water stands at rest over the world height `y` at (x, z): above zero under water, null where there is none. */
	depthAt(e, t, n) {
		const r = this.lerp(e, t);
		if (r) return r.shore > 0 ? r.height - n : null;
		return this.data.ocean ? this.data.ocean.level - n : null;
	}
	/** How far (x, z) is from the water's edge: above zero on dry land, below in the water, deep in the open sea past the region; null where no water is baked. */
	shoreAt(e, t) {
		const n = this.lerp(e, t);
		if (n) return -n.shore;
		return this.data.ocean ? -1e6 : null;
	}
};
//#endregion
//#region src/water/shore.ts
/** The signed distance from (x, z) to the polygon's outline, positive inside it, negative outside. Self-intersecting outlines are not judged. */
function Re(e, t, n) {
	let r = Infinity;
	let i = false;
	for (let a = 0, o = e.length - 1; a < e.length; o = a++) {
		const s = e[o], c = e[a];
		const l = c.x - s.x, u = c.y - s.y;
		const d = l * l + u * u;
		let f = d > 0 ? ((t - s.x) * l + (n - s.y) * u) / d : 0;
		f = Math.min(Math.max(f, 0), 1);
		const p = t - (s.x + f * l), m = n - (s.y + f * u);
		r = Math.min(r, Math.hypot(p, m));
		if (s.y > n !== c.y > n && t < (c.x - s.x) * (n - s.y) / (c.y - s.y) + s.x) i = !i;
	}
	return i ? r : -r;
}
/** The share of the waves kept where the water is `reach` deep or far from the edge: none at the edge, all from `width` in; with no width, all of them everywhere. */
function H(e, t) {
	if (t <= 0) return 1;
	if (e <= 0) return 0;
	const n = Math.min(e / t, 1);
	return n * n * (3 - 2 * n);
}
//#endregion
//#region src/water/zone.ts
/**
* @file    zone.ts
* @brief   A water zone: every body of water in a region baked into one field, which one surface is drawn from.
*
* @details Bodies of water drawn each as a mesh of its own are separate surfaces, and where a river runs into a lake or the sea they meet
*          along a seam: two heights, two sets of waves, a shore foaming across the river's mouth, a ribbon's edge showing over the lake.
*          So a body of water is not drawn: it is an INPUT. A zone gathers the bodies over its region and bakes them into a grid, each
*          texel holding what the water is there:
*            - the height of its surface (a lake's level, the height of a river's curve at its nearest place, the sea's level);
*            - the signed distance to the nearest shore (positive on the water): where the surface is cut and where it foams;
*            - how high its waves stand there (a body's own height, calmed toward its shore and as the water shallows);
*            - how it flows (a river's current), and how deep it is over the ground.
*          Where two bodies meet their values are blended by how far inside each the texel is, so a river is at its lake's level where it runs
*          into it, its current fades into the still water, and its banks run on into the lake's shores with no seam; the sea gives way to
*          the bodies over it. One mesh following the camera reads the field and is the whole surface, and {@link WaterField.sample} answers
*          the CPU from the same numbers.
*
*          The field is in the world's own frame on the xz plane: bodies may be turned about their up, not tilted.
*/
/**
* Where the bodies of water are drawn from, and what they share. A scene without one is given a zone over its lakes and rivers with these
* defaults; put one in to say where, how fine, and what the water looks like.
*
* @experimental
*/
const U = /* @__PURE__ */ e("WaterZone", {
	sizeX: 2e4,
	sizeZ: 2e4,
	resolution: 256,
	material: 0,
	waveLength: 1400,
	waveSpeed: 1,
	waveDirection: 30,
	surf: .6,
	surfLength: 800,
	cellSize: 100,
	cells: 64,
	rings: 5,
	ripples: 0,
	rippleSize: 6400,
	rippleSpeed: 600,
	rippleDamping: .8,
	foamFade: .4
}, {
	worldUnitFields: [
		"sizeX",
		"sizeZ",
		"waveLength",
		"surfLength",
		"cellSize",
		"rippleSize",
		"rippleSpeed"
	],
	assetFields: [{
		field: "material",
		type: "material"
	}],
	fields: {
		sizeX: {
			min: 1,
			category: "Region",
			tooltip: "The region baked along x, centred on the entity. Water outside it is not drawn; an ocean goes on past it."
		},
		sizeZ: {
			min: 1,
			category: "Region",
			tooltip: "The region baked along z, centred on the entity."
		},
		resolution: {
			min: 32,
			max: 1024,
			step: 32,
			category: "Region",
			tooltip: "Texels along the longer side of the region: how finely shores and rivers are traced."
		},
		material: {
			category: "Look",
			tooltip: "A material on the Water shader for the whole surface. Empty uses the stock water."
		},
		waveLength: {
			min: .5,
			max: 3e3,
			category: "Waves",
			tooltip: "The length of the longest wave. Every body shares the waves; each sets how high they stand."
		},
		waveSpeed: {
			min: 0,
			max: 4,
			category: "Waves",
			tooltip: "A multiplier on how fast the waves travel."
		},
		waveDirection: {
			min: 0,
			max: 360,
			category: "Waves",
			tooltip: "The heading of the waves, in degrees."
		},
		surf: {
			min: 0,
			max: 4,
			category: "Waves",
			tooltip: "How high the surf breaking on a shore stands against its body's waves. 0 draws none. A current carries none."
		},
		surfLength: {
			min: .1,
			max: 1e5,
			category: "Waves",
			tooltip: "The length of the surf's waves, in world units. They run in over four lengths of water, break, and run up the ground past the shore."
		},
		cellSize: {
			min: .05,
			category: "Detail",
			tooltip: "The cell size of the finest ring of the surface. Waves shorter than six cells are not drawn as geometry there (the shading still shows them)."
		},
		cells: {
			min: 4,
			max: 256,
			step: 4,
			category: "Detail",
			tooltip: "Cells along a ring's side."
		},
		rings: {
			min: 1,
			max: 10,
			step: 1,
			category: "Detail",
			tooltip: "Rings of the surface, each twice as coarse as the one inside it."
		},
		ripples: {
			min: 0,
			max: 256,
			step: 8,
			category: "Ripples",
			tooltip: "Cells along a side of the grid that keeps what disturbs the water: bodies moving in it, rain, and what a script disturbs. 0 keeps none."
		},
		rippleSize: {
			min: 4,
			category: "Ripples",
			tooltip: "The side of the window the ripples are kept in, in world units. It follows the camera."
		},
		rippleSpeed: {
			min: .1,
			max: 4e3,
			category: "Ripples",
			tooltip: "How fast a ripple spreads, in world units a second."
		},
		rippleDamping: {
			min: 0,
			max: 10,
			category: "Ripples",
			tooltip: "How much of its height a ripple loses each second."
		},
		foamFade: {
			min: 0,
			max: 10,
			category: "Ripples",
			tooltip: "How fast the foam a disturbance leaves fades, a second."
		}
	}
});
/** What the current is at a reach this wide against the river's widest, against its nominal speed (half): a narrow reach is quick and a wide one slow. */
function ze(e, t) {
	return Math.min(Math.max(t / Math.max(e, .001), .25), 2) / 2;
}
/** The depth over ground nothing is known of. */
/** The gentlest slope a depth is turned into a distance by: flatter ground than this is deep water or dry land a long way from a shore. */
const W = .01;
/** The slopes a shore goes from a beach (waves wash up it) to rock (they burst on it) over. */
const Be = .25;
const Ve = .8;
/** The baked water of a zone. */
var He = class e {
	constructor(e, t) {
		this.query_ = null;
		this.ranges_ = null;
		const n = e.nx * e.nz;
		this.grid = e;
		this.ocean = t;
		this.height = new Float32Array(n);
		this.shore = new Float32Array(n);
		this.amp = new Float32Array(n);
		this.calm = new Float32Array(n);
		this.swell = new Float32Array(n);
		this.flowX = new Float32Array(n);
		this.flowZ = new Float32Array(n);
		this.depth = new Float32Array(n);
		this.surf = new Float32Array(n);
		this.still = new Float32Array(n).fill(1);
		this.steep = new Float32Array(n);
		this.exposure = new Float32Array(n).fill(1);
		this.owner = new Int32Array(n);
	}
	/**
	* Bakes `bodies` over `grid`. Each texel takes every body's say (its height, its distance to its own shore, its waves and current) and
	* weighs them by how far inside each it is, over a texel and a half, so where two bodies meet the values run from one to the other.
	* The lakes come first, then the rivers have what they leave (a river runs into a lake and is the lake there), and the ocean what both leave. A texel no body holds keeps the height of the nearest water, so the
	* surface's vertices there (which the shore cuts away) do not pull the water's edge down to nothing.
	*/
	static bake(t, n, r, i = 0) {
		const a = e.baking(t, n, r, i);
		for (;;) {
			const e = a.next();
			if (e.done) return e.value;
		}
	}
	/** {@link WaterField.bake} as a job that yields its progress (0 to 1) every few rows, for spreading over frames. */
	static *baking(t, n, r, i = 0) {
		const a = n.find((e) => e.kind === "ocean") ?? null;
		const o = new e(t, a);
		const s = Math.max(t.sizeX / Math.max(t.nx - 1, 1), t.sizeZ / Math.max(t.nz - 1, 1));
		const c = s * 1.5;
		const l = [...n.filter((e) => e.kind === "lake"), ...n.filter((e) => e.kind === "river")];
		const u = l.map((e) => Ge(e));
		const d = new Float64Array(t.nx * t.nz).fill(NaN);
		const f = new Float32Array(t.nx * t.nz);
		const p = K(t.nx, Ke);
		for (let e = 0; e < t.nz; e++) {
			if (e % p === 0) yield .3 * (e / t.nz);
			for (let n = 0; n < t.nx; n++) {
				const i = t.minX + n / Math.max(t.nx - 1, 1) * t.sizeX;
				const a = t.minZ + e / Math.max(t.nz - 1, 1) * t.sizeZ;
				d[e * t.nx + n] = r?.(i, a) ?? NaN;
			}
		}
		const m = a ? yield* We(t, d, a.level, .3) : null;
		const h = t.sizeX / Math.max(t.nx - 1, 1), g = t.sizeZ / Math.max(t.nz - 1, 1);
		const _ = (e, n) => {
			const r = (e, n) => d[Math.min(Math.max(n, 0), t.nz - 1) * t.nx + Math.min(Math.max(e, 0), t.nx - 1)];
			const i = (r(e + 1, n) - r(e - 1, n)) / (2 * h), a = (r(e, n + 1) - r(e, n - 1)) / (2 * g);
			const o = Math.hypot(i, a);
			return Number.isFinite(o) ? Math.max(o, W) : W;
		};
		for (let e = 0; e < t.nz; e++) {
			if (e % p === 0) yield .3 + .5 * (e / t.nz);
			for (let n = 0; n < t.nx; n++) {
				const r = e * t.nx + n;
				const i = t.minX + n / Math.max(t.nx - 1, 1) * t.sizeX;
				const p = t.minZ + e / Math.max(t.nz - 1, 1) * t.sizeZ;
				const h = Number.isNaN(d[r]) ? null : d[r];
				const g = h === null ? W : _(n, e);
				o.steep[r] = J(Be, Ve, g);
				let v = 0, y = 0, b = 0, x = 0, S = 0, C = 0, w = 0, T = 0, E = -Infinity, D = -1, O = 0, k = 0, A = -Infinity, j = 0;
				const ee = !a ? -V : h === null ? V : h < a.level && !m[r] ? -s : (a.level - h) / g;
				for (let e = 0; e < l.length; e++) {
					const t = u[e];
					if (i < t[0] - c || i > t[2] + c || p < t[1] - c || p > t[3] + c) continue;
					const n = Ue(l[e], i, p, h, g);
					if (!n) continue;
					E = Math.max(E, n.shore);
					const r = J(-c, c, n.shore);
					const o = Math.max(n.half, c);
					const s = a ? (a.level - n.height) / Math.max(n.grade, .001) : -V;
					const d = l[e].kind === "river" ? r * (1 - J(0, o, A)) * (1 - J(0, o, s)) : r;
					if (l[e].kind === "lake") A = Math.max(A, n.shore);
					if (d <= 0) continue;
					k = Math.max(k, d);
					if (l[e].kind === "river") j += d;
					v += d;
					y += n.height * d;
					b += n.amp * d;
					x += n.calm * d;
					S += l[e].waveHeight * d;
					w += n.fx * d;
					T += n.fz * d;
					C += (l[e].exposure ?? 1) * d;
					if (d > O) {
						O = d;
						D = l[e].key;
					}
				}
				if (a) {
					const e = ee;
					E = Math.max(E, e);
					const t = J(-c, c, e) * (1 - k);
					if (t > 0) {
						const n = H(h === null ? e : Math.min(e, a.level - h), a.shoreWidth);
						v += t;
						y += a.level * t;
						b += a.waveHeight * n * t;
						x += n * t;
						S += a.waveHeight * t;
						C += (a.exposure ?? 1) * t;
						if (t > O) {
							O = t;
							D = a.key;
						}
					}
				}
				o.shore[r] = E === -Infinity ? -V : E;
				o.owner[r] = v > 0 ? D : -1;
				if (v > 0) {
					o.height[r] = y / v;
					o.amp[r] = b / v;
					o.calm[r] = x / v;
					o.swell[r] = S / v;
					o.exposure[r] = C / v;
					o.flowX[r] = w / v;
					o.flowZ[r] = T / v;
					f[r] = j / v;
				} else o.height[r] = NaN;
				o.depth[r] = h === null ? V : Math.max(0, (v > 0 ? y / v : 0) - h);
			}
		}
		yield* qe(o, s);
		yield* Je(o);
		yield* Ye(o, f, s, i, .95);
		yield* q(o.steep, t.nx, t.nz, 2, .99);
		for (let e = 0; e < o.steep.length; e++) o.steep[e] = Math.min(o.steep[e] * 2, 1);
		return o;
	}
	/** The field at a world point inside the region, read as the texels around it blend; null outside the region. */
	at(e, t) {
		const { minX: n, minZ: r, sizeX: i, sizeZ: a, nx: o, nz: s } = this.grid;
		if (o < 2 || s < 2) return null;
		const c = (e - n) / i, l = (t - r) / a;
		if (c < 0 || c > 1 || l < 0 || l > 1) return null;
		const u = c * (o - 1), d = l * (s - 1);
		const f = Math.min(Math.floor(u), o - 2), p = Math.min(Math.floor(d), s - 2);
		const m = u - f, h = d - p;
		const g = (e) => {
			const t = p * o + f;
			const n = e[t] * (1 - m) + e[t + 1] * m, r = e[t + o] * (1 - m) + e[t + o + 1] * m;
			return n * (1 - h) + r * h;
		};
		const _ = (p + (h > .5 ? 1 : 0)) * o + f + (m > .5 ? 1 : 0);
		return {
			key: this.owner[_],
			height: g(this.height),
			amp: g(this.amp),
			calm: g(this.calm),
			swell: g(this.swell),
			flowX: g(this.flowX),
			flowZ: g(this.flowZ),
			shore: g(this.shore),
			depth: g(this.depth),
			surf: g(this.surf),
			still: g(this.still),
			exposure: g(this.exposure)
		};
	}
	/**
	* The water at a world point: the field inside the region, the ocean past it (as deep as it likes, waves whole), null where there is none.
	* `shore` above zero is water.
	*/
	sample(e, t) {
		const n = this.at(e, t);
		if (n) return n.shore > 0 ? n : null;
		const r = this.ocean;
		if (!r) return null;
		return {
			key: r.key,
			height: r.level,
			amp: r.waveHeight,
			calm: 1,
			swell: r.waveHeight,
			flowX: 0,
			flowZ: 0,
			shore: V,
			depth: V,
			surf: V,
			still: 1,
			exposure: r.exposure ?? 1
		};
	}
	/** The part of the field a world is laid out by (how deep water stands over a height, how far a point is from the shore), as a query over this field's own arrays. */
	query() {
		return this.query_ ??= new Le({
			grid: this.grid,
			height: this.height,
			shore: this.shore,
			ocean: this.ocean ? { level: this.ocean.level } : null
		});
	}
	/** The ranges the encoding spans, from what the field holds; the shore distance reaches `shoreReach` at least (as far out as the surf is drawn). */
	ranges(e = 0) {
		const t = this.ranges_ ??= this.measure();
		return {
			...t,
			shore: Math.max(t.shore, e * 1.25)
		};
	}
	measure() {
		let e = Infinity, t = -Infinity, n = 0, r = 0;
		for (let i = 0; i < this.height.length; i++) {
			const a = this.height[i];
			if (Number.isFinite(a)) {
				e = Math.min(e, a);
				t = Math.max(t, a);
			}
			n = Math.max(n, this.swell[i]);
			r = Math.max(r, Math.abs(this.flowX[i]), Math.abs(this.flowZ[i]));
		}
		if (this.ocean) {
			e = Math.min(e, this.ocean.level);
			t = Math.max(t, this.ocean.level);
			n = Math.max(n, this.ocean.waveHeight);
		}
		if (!Number.isFinite(e)) {
			e = 0;
			t = 0;
		}
		const i = Math.max(this.grid.sizeX / Math.max(this.grid.nx - 1, 1), this.grid.sizeZ / Math.max(this.grid.nz - 1, 1));
		return {
			heightMin: e,
			heightSpan: Math.max(t - e, .001),
			shore: i * 16,
			amp: Math.max(n, .001),
			flow: Math.max(r, .001),
			depth: i * 16
		};
	}
	/**
	* The field as two RGBA8 images, rows from minZ. heights (read texel by texel: filtered bytes are no number): rg the height, high byte
	* first; b the depth, as its square root (fine where the water is shallow, where the shore is drawn by it); a the swell (the body's waves' height). field (filtered): r the shore distance (0.5 at it, a signed square root); gb the current (0.5 still); a the calm.
	* exposure (filtered): r how open the water is to the wind; g the distance the surf runs in by; b how much surf a current leaves; a how steep the shore is. Each over its range in `r`.
	*/
	encode(e) {
		const t = this.height.length;
		const n = new Uint8Array(t * 4), r = new Uint8Array(t * 4), i = new Uint8Array(t * 4);
		const a = (e) => Math.round(Math.min(Math.max(e, 0), 1) * 255);
		for (let o = 0; o < t; o++) {
			const t = Math.round(Math.min(Math.max((this.height[o] - e.heightMin) / e.heightSpan, 0), 1) * 65535);
			n[o * 4] = t >> 8;
			n[o * 4 + 1] = t & 255;
			n[o * 4 + 2] = a(Math.sqrt(Math.max(this.depth[o] / e.depth, 0)));
			n[o * 4 + 3] = a(this.swell[o] / e.amp);
			const s = Math.max(Math.min(this.shore[o] / e.shore, 1), -1);
			r[o * 4] = a(Math.sign(s) * Math.sqrt(Math.abs(s)) / 2 + .5);
			r[o * 4 + 1] = a(this.flowX[o] / (2 * e.flow) + .5);
			r[o * 4 + 2] = a(this.flowZ[o] / (2 * e.flow) + .5);
			r[o * 4 + 3] = a(this.calm[o]);
			i[o * 4] = a(this.exposure[o]);
			const c = Math.max(Math.min(this.surf[o] / e.shore, 1), -1);
			i[o * 4 + 1] = a(Math.sign(c) * Math.sqrt(Math.abs(c)) / 2 + .5);
			i[o * 4 + 2] = a(this.still[o]);
			i[o * 4 + 3] = a(this.steep[o]);
		}
		return {
			heights: n,
			field: r,
			exposure: i
		};
	}
};
/** What one body says about a point: its height there, how far inside it the point is, its waves and its current. Null where it says nothing. */
function Ue(e, t, n, r, i) {
	if (e.kind === "lake") {
		const [a, o] = e.toLocal(t, n);
		const s = r === null ? V : e.level - r;
		const c = Math.min(Re(e.outline, a, o), s / i);
		const l = H(Math.min(c, s), e.shoreWidth);
		return {
			height: e.level,
			shore: c,
			amp: e.waveHeight * l,
			calm: l,
			fx: 0,
			fz: 0,
			half: 0,
			grade: 0
		};
	}
	const a = e.stations;
	if (a.length < 2) return null;
	let o = Infinity, s = 0, c = 0;
	for (let e = 0; e + 1 < a.length; e++) {
		const r = a[e], i = a[e + 1];
		const l = i.x - r.x, u = i.z - r.z;
		const d = l * l + u * u;
		const f = d > 0 ? Math.min(Math.max(((t - r.x) * l + (n - r.z) * u) / d, 0), 1) : 0;
		const p = Math.hypot(t - (r.x + f * l), n - (r.z + f * u));
		if (p < o) {
			o = p;
			s = e;
			c = f;
		}
	}
	const l = a[s], u = a[s + 1];
	const d = (e, t) => e + (t - e) * c;
	const f = d(l.half, u.half), p = d(l.y, u.y), m = d(l.speed, u.speed);
	let h = d(l.dx, u.dx), g = d(l.dz, u.dz);
	const _ = Math.hypot(h, g) || 1;
	h /= _;
	g /= _;
	const v = r === null ? V : p - r;
	const y = Math.min(f - o, v / i);
	const b = (s + c) / (a.length - 1);
	const x = a.reduce((e, t, n) => n ? e + Math.hypot(t.x - a[n - 1].x, t.z - a[n - 1].z) : 0, 0);
	const S = J(0, 2 * f, b * x) * J(0, 2 * f, (1 - b) * x);
	const C = H(Math.min(y, v), e.shoreWidth);
	return {
		height: p,
		shore: y,
		amp: e.waveHeight * C,
		calm: C,
		fx: h * m * S,
		fz: g * m * S,
		half: f,
		grade: Math.abs(u.y - l.y) / Math.max(Math.hypot(u.x - l.x, u.z - l.z), 1e-6)
	};
}
/**
* Which texels the open sea reaches: those whose ground is below `level` (or unknown) and joined, through such texels, to the region's
* edge, past which the sea goes on.
*/
function* We(e, t, n, r) {
	const { nx: i, nz: a } = e;
	const o = new Uint8Array(i * a);
	const s = (e) => {
		const r = t[e];
		return Number.isNaN(r) || r < n;
	};
	const c = [];
	const l = (e) => {
		if (!o[e] && s(e)) {
			o[e] = 1;
			c.push(e);
		}
	};
	for (let e = 0; e < i; e++) {
		l(e);
		l((a - 1) * i + e);
	}
	for (let e = 0; e < a; e++) {
		l(e * i);
		l(e * i + i - 1);
	}
	for (let e = 0; e < c.length; e++) {
		if (e % G === G - 1) yield r;
		const t = c[e], n = t % i;
		if (n > 0) l(t - 1);
		if (n < i - 1) l(t + 1);
		if (t >= i) l(t - i);
		if (t < (a - 1) * i) l(t + i);
	}
	return o;
}
/** A body's box on the world's xz plane, [minX, minZ, maxX, maxZ]. */
function Ge(e) {
	let t = Infinity, n = Infinity, r = -Infinity, i = -Infinity;
	if (e.kind === "river") {
		for (const a of e.stations) {
			t = Math.min(t, a.x - a.half);
			r = Math.max(r, a.x + a.half);
			n = Math.min(n, a.z - a.half);
			i = Math.max(i, a.z + a.half);
		}
		return [
			t,
			n,
			r,
			i
		];
	}
	for (const a of e.outline) {
		const [o, s] = e.toWorld(a.x, a.y);
		t = Math.min(t, o);
		r = Math.max(r, o);
		n = Math.min(n, s);
		i = Math.max(i, s);
	}
	return [
		t,
		n,
		r,
		i
	];
}
/**
* The shore distance made one measure everywhere: how far across the ground the nearest edge of ANY water is, the sign the bodies gave. A body's
* own say is exact only near its edge (an ocean's is its depth, a lake's ends at its outline even where a river carries the water on), so the
* texels on either side of an edge keep it, held to a texel, and every other texel is that plus how far it is from the nearest of them
* (each texel carries its nearest edge texel, two sweeps).
*/
/**
* How much of a bake is one step. A job stepped in a frame is given the frame's spare milliseconds, and takes them a step at a time: a
* step is as small as the smallest thing worth waiting for, by cells and not by rows, so a region of 4096 texels a side steps as often
* as one of 256. Reading the ground and asking every body is about a microsecond a cell; a sweep is a twentieth of that.
*/
const Ke = 2048;
const G = 32768;
const K = (e, t) => Math.max(1, Math.floor(t / Math.max(e, 1)));
function* qe(e, t) {
	const { nx: n, nz: r, sizeX: i, sizeZ: a } = e.grid;
	const o = n * r;
	if (n < 2 || r < 2) return;
	const s = i / (n - 1), c = a / (r - 1);
	const l = (t) => e.shore[t] > 0;
	const u = new Int32Array(o).fill(-1);
	const d = new Float32Array(o);
	const f = new Float32Array(o).fill(Infinity);
	const p = K(n, G);
	yield .85;
	for (let i = 0; i < r; i++) {
		if (i % p === 0) yield .85;
		for (let a = 0; a < n; a++) {
			const o = i * n + a, s = l(o);
			if (!(a > 0 && l(o - 1) !== s || a < n - 1 && l(o + 1) !== s || i > 0 && l(o - n) !== s || i < r - 1 && l(o + n) !== s)) continue;
			u[o] = o;
			d[o] = Math.min(Math.abs(e.shore[o]), t);
			f[o] = d[o];
		}
	}
	const m = (e, t) => {
		const r = u[t];
		if (r < 0) return;
		const i = (e % n - r % n) * s, a = (Math.floor(e / n) - Math.floor(r / n)) * c;
		const o = Math.hypot(i, a) + d[r];
		if (o < f[e]) {
			f[e] = o;
			u[e] = r;
		}
	};
	yield .85;
	for (let e = 0; e < r; e++) {
		if (e % p === 0) yield .85 + .035 * (e / r);
		for (let t = 0; t < n; t++) {
			const r = e * n + t;
			if (t > 0) m(r, r - 1);
			if (e > 0) {
				m(r, r - n);
				if (t > 0) m(r, r - n - 1);
				if (t < n - 1) m(r, r - n + 1);
			}
		}
	}
	for (let e = r - 1; e >= 0; e--) {
		if (e % p === 0) yield .92 - .035 * (e / r);
		for (let t = n - 1; t >= 0; t--) {
			const i = e * n + t;
			if (t < n - 1) m(i, i + 1);
			if (e < r - 1) {
				m(i, i + n);
				if (t < n - 1) m(i, i + n + 1);
				if (t > 0) m(i, i + n - 1);
			}
		}
	}
	yield .92;
	for (let t = 0; t < o; t++) {
		if (!Number.isFinite(f[t])) continue;
		e.shore[t] = l(t) ? f[t] : -f[t];
	}
}
/**
* A texel no body holds takes the height (and how open it is to the wind) of the nearest that one does: two passes of a chamfer sweep over
* which texel is nearest. The shore's filtered reads then see the water's own, not the dry land's.
*/
function* Je(e) {
	const { nx: t, nz: n } = e.grid;
	const r = t * n;
	const i = new Int32Array(r).fill(-1);
	const a = new Float32Array(r).fill(Infinity);
	for (let t = 0; t < r; t++) if (Number.isFinite(e.height[t])) {
		i[t] = t;
		a[t] = 0;
	}
	const o = (e, t, n) => {
		if (i[t] < 0 || a[t] + n >= a[e]) return;
		a[e] = a[t] + n;
		i[e] = i[t];
	};
	const s = K(t, G);
	yield .92;
	for (let e = 0; e < n; e++) {
		if (e % s === 0) yield .92 + .015 * (e / n);
		for (let n = 0; n < t; n++) {
			const r = e * t + n;
			if (n > 0) o(r, r - 1, 1);
			if (e > 0) o(r, r - t, 1);
			if (n > 0 && e > 0) o(r, r - t - 1, Math.SQRT2);
			if (n < t - 1 && e > 0) o(r, r - t + 1, Math.SQRT2);
		}
	}
	for (let e = n - 1; e >= 0; e--) {
		if (e % s === 0) yield .95 - .015 * (e / n);
		for (let r = t - 1; r >= 0; r--) {
			const i = e * t + r;
			if (r < t - 1) o(i, i + 1, 1);
			if (e < n - 1) o(i, i + t, 1);
			if (r < t - 1 && e < n - 1) o(i, i + t + 1, Math.SQRT2);
			if (r > 0 && e < n - 1) o(i, i + t - 1, Math.SQRT2);
		}
	}
	yield .95;
	const c = e.ocean ? e.ocean.level : 0;
	for (let t = 0; t < r; t++) {
		if (Number.isFinite(e.height[t])) continue;
		e.height[t] = i[t] >= 0 ? e.height[i[t]] : c;
		if (i[t] >= 0) e.exposure[t] = e.exposure[i[t]];
	}
}
/**
* The distance the surf runs in by: the shore distance with a river's water taken for land (a current carries no surf, and its mouth is
* no bay the crests bend into), smoothed over the surf's length. A crest is a line of it: smoothed, the crests come in from the open
* water as lines and turn to follow the shore only as they near it, instead of tracing every turn of it from far out.
*/
function* Ye(e, t, n, r, i) {
	const { nx: a, nz: o } = e.grid;
	const s = a * o;
	const c = new Uint8Array(s);
	for (let n = 0; n < s; n++) c[n] = e.shore[n] > 0 && t[n] < .5 ? 1 : 0;
	const l = Math.max(r * 8, n * 16);
	yield i;
	const u = yield* Xe(a, o, c, 0, i);
	const d = yield* Xe(a, o, c, 1, i);
	for (let t = 0; t < s; t++) e.surf[t] = Math.min(Math.max((d[t] - u[t]) * n, -l), l);
	yield* q(e.surf, a, o, Math.round(r / Math.max(n, 1e-6)), i);
	for (let n = 0; n < s; n++) e.still[n] = 1 - t[n];
	yield* q(e.still, a, o, Math.round(r * .5 / Math.max(n, 1e-6)), i);
	for (let n = 0; n < s; n++) e.still[n] = Math.min(e.still[n], 1 - t[n]);
}
/** `values` (a grid nx by nz) blurred in place over `radius` texels: three box passes each way, near enough a Gaussian, at a cost that
* does not grow with the radius. */
function* q(e, t, n, r, i) {
	if (r < 1 || t < 2 || n < 2) return;
	const a = new Float32Array(Math.max(t, n));
	function* o(t, n, o) {
		const s = K(n, G);
		for (let c = 0; c < t; c++) {
			if (c % s === 0) yield i;
			for (let t = 0; t < n; t++) a[t] = e[o(c, t)];
			let t = 0;
			for (let e = -r; e <= r; e++) t += a[Math.min(Math.max(e, 0), n - 1)];
			for (let i = 0; i < n; i++) {
				e[o(c, i)] = t / (2 * r + 1);
				t += a[Math.min(i + r + 1, n - 1)] - a[Math.max(i - r, 0)];
			}
		}
	}
	for (let e = 0; e < 3; e++) {
		yield* o(n, t, (e, n) => e * t + n);
		yield* o(t, n, (e, n) => n * t + e);
	}
}
/** How many texels each texel is from the nearest one whose `wet` is not `from` (half a texel at the edge, 0 on the other side). */
function* Xe(e, t, n, r, i) {
	const a = e * t;
	const o = new Float32Array(a);
	for (let e = 0; e < a; e++) o[e] = n[e] === r ? 1e9 : 0;
	const s = (e, t, n) => {
		if (o[t] + n < o[e]) o[e] = o[t] + n;
	};
	const c = K(e, G);
	for (let n = 0; n < t; n++) {
		if (n % c === 0) yield i;
		for (let t = 0; t < e; t++) {
			const r = n * e + t;
			if (t > 0) s(r, r - 1, 1);
			if (n > 0) s(r, r - e, 1);
			if (t > 0 && n > 0) s(r, r - e - 1, Math.SQRT2);
			if (t < e - 1 && n > 0) s(r, r - e + 1, Math.SQRT2);
		}
	}
	for (let n = t - 1; n >= 0; n--) {
		if (n % c === 0) yield i;
		for (let r = e - 1; r >= 0; r--) {
			const i = n * e + r;
			if (r < e - 1) s(i, i + 1, 1);
			if (n < t - 1) s(i, i + e, 1);
			if (r < e - 1 && n < t - 1) s(i, i + e + 1, Math.SQRT2);
			if (r > 0 && n < t - 1) s(i, i + e - 1, Math.SQRT2);
		}
	}
	for (let e = 0; e < a; e++) if (o[e] > 0 && o[e] < 1e9) o[e] = o[e] - .5;
	return o;
}
function J(e, t, n) {
	const r = Math.min(Math.max((n - e) / (t - e), 0), 1);
	return r * r * (3 - 2 * r);
}
//#endregion
//#region src/water/waterPlugin.ts
/** What a body of water is. A river follows the `Spline` on its own entity. */
const Y = {
	Ocean: 0,
	Lake: 1,
	River: 2
};
/**
* A body of water. Presence is the opt-in; it is drawn as part of its zone's surface.
*
* @experimental
*/
const X = /* @__PURE__ */ e("WaterBody", {
	form: Y.Lake,
	bodyId: "",
	sizeX: 1e4,
	sizeZ: 1e4,
	boundary: [],
	shoreWidth: 300,
	flowSpeed: 200,
	waveHeight: 30,
	bedDepth: 0
}, {
	worldUnitFields: [
		"sizeX",
		"sizeZ",
		"shoreWidth",
		"flowSpeed",
		"waveHeight",
		"bedDepth"
	],
	fields: {
		form: {
			enum: [
				{
					label: "Ocean",
					value: Y.Ocean
				},
				{
					label: "Lake",
					value: Y.Lake
				},
				{
					label: "River",
					value: Y.River
				}
			],
			category: "Shape",
			tooltip: "An ocean is without edge: everywhere at its height where the ground is lower; a lake is a rectangle or an outline of its own; a river follows the Spline on the same entity."
		},
		bodyId: {
			category: "Shape",
			tooltip: "What the game calls this body, the same in every session: what a query names the water by. Empty is named by its entity."
		},
		sizeX: {
			min: 1,
			category: "Shape",
			tooltip: "A lake's size along x.",
			shownWhen: {
				field: "form",
				values: [Y.Lake]
			}
		},
		sizeZ: {
			min: 1,
			category: "Shape",
			tooltip: "A lake's size along z.",
			shownWhen: {
				field: "form",
				values: [Y.Lake]
			}
		},
		boundary: {
			category: "Shape",
			tooltip: "The outline of a lake: points round it on its own xz plane. Empty is the rectangle of its size.",
			shownWhen: {
				field: "form",
				values: [Y.Lake]
			}
		},
		shoreWidth: {
			min: 0,
			category: "Shape",
			tooltip: "How far in from the shore, and how deep, the waves take to come to full height. 0 leaves them whole to the edge."
		},
		flowSpeed: {
			min: 0,
			max: 5e3,
			category: "Waves",
			tooltip: "A river's current, in world units a second where it is as wide as its widest. A narrower reach runs faster.",
			shownWhen: {
				field: "form",
				values: [Y.River]
			}
		},
		bedDepth: {
			min: 0,
			category: "Shape",
			tooltip: "How deep the river cuts its bed into the terrain under its surface, at its middle, its banks blending back into the ground. 0 leaves the ground as it is.",
			shownWhen: {
				field: "form",
				values: [Y.River]
			}
		},
		waveHeight: {
			min: 0,
			max: 800,
			category: "Waves",
			tooltip: "The height of the tallest wave, in world units. Their length, speed and heading are the zone's."
		}
	}
});
/** Everything on: a project with no quality policy, off a minigame. */
const Ze = {
	waves: 8,
	rippleCells: 256,
	displacement: true,
	mirror: true,
	caustics: true
};
/**
* What water is allowed: the active quality profile when the project has a quality policy running; else the low profile on a minigame, which has the least to spend and
* gets the lite water (flat geometry, no mirror, no web of light) without anyone asking; else everything.
*/
function Qe(e, t) {
	const n = e ?? (t ? j("low") : null);
	if (!n) return Ze;
	return {
		waves: n.waterWaves,
		rippleCells: n.waterRippleCells,
		displacement: n.waterDisplacement,
		mirror: n.waterMirror,
		caustics: n.waterCaustics
	};
}
/** The zone a scene without a `WaterZone` is given: the component's defaults, over every lake and river. */
/** The zone's defaults in the project's units: asked each time, since a project says what a unit is before its scene loads. */
const $e = () => ({ ...U._default });
/** Run-time access to the water: where its surface is at a point, for what floats on it or swims in it. */
var Z = class {
	constructor() {
		this.app_ = null;
		this.quality = Ze;
		this.field_ = null;
		this.zone_ = $e();
		this.ripples_ = null;
		this.instance_ = 0;
		this.revision_ = 0;
		this.baking = false;
	}
	/** The baked water as data a worker can answer `depthAt` and `shoreAt` from, or null where none is baked. */
	queryData() {
		return this.field_?.query().data ?? null;
	}
	/**
	* Whether there is no water to ask about: nothing is baked, so `depthAt` answers null everywhere. A world laid out with no water at
	* all is laid out the same here and on a worker, which "no data to hand over" alone does not say.
	*/
	get empty() {
		return this.field_ === null;
	}
	/** How deep the water stands at rest over the world height `y` at (x, z): above zero under water, null where there is none. */
	depthAt(e, t, n) {
		return this.field_?.query().depthAt(e, t, n) ?? null;
	}
	/**
	* The surface over or under `(x, y, z)`: how far above it the point is (negative under), the surface's normal, the current, and the point
	* on it straight above or below. Null where there is no water. The waves are read at the instant of the frame.
	*/
	sample(e, t, n) {
		const r = this.field_;
		if (!r || !this.app_) return null;
		const i = r.sample(e, n);
		if (!i) return null;
		const a = this.app_.getResource(s).elapsed;
		const o = this.waves(i.amp, i.exposure);
		const c = this.zone_;
		const l = i.still;
		const u = me(i.shore, c.surf * nt(i.exposure) * i.swell * i.exposure * l, c.surfLength, c.waveSpeed, a, i.surf);
		const d = i.height + (this.quality.displacement ? fe(o, e, n, a) + u : 0) + (this.ripples_?.heightAt(e, n) ?? 0);
		const [f, p] = pe(o, e, n, a);
		const m = Math.hypot(f, 1, p);
		return {
			entity: i.key,
			bodyId: this.bodyIdOf(i.key),
			depth: t - d,
			normal: [
				-f / m,
				1 / m,
				-p / m
			],
			flow: [
				i.flowX,
				0,
				i.flowZ
			],
			surface: [
				e,
				d,
				n
			],
			inside: true
		};
	}
	/**
	* Disturbs the water at the world point (x, y, z): a bump of `strength` world units (negative is a dip) over `radius`, which spreads as a ring and leaves foam.
	* Does nothing where there is no water or where the zone keeps no ripples.
	*/
	disturb(e, t, n, r, i) {
		if (!this.ripples_ || !this.field_?.sample(e, n)) return false;
		this.ripples_.disturb(e, n, r, i);
		return true;
	}
	/** The height the ripples add to the surface at the world point, where the zone keeps them; 0 elsewhere. */
	rippleAt(e, t, n) {
		return this.ripples_?.heightAt(e, n) ?? 0;
	}
	/**
	* The body of water at (x, z) and its surface at rest, or null where there is none: which water a place belongs to, for what a game
	* keeps per body (a fishing spot, a level it raises) and a placement that keeps by the shore.
	*/
	bodyAt(e, t) {
		const n = this.field_?.sample(e, t);
		const r = this.app_?.world;
		if (!n || !r || n.key < 0) return null;
		const i = n.key;
		const a = r.valid(i) && r.has(i, X) ? r.get(i, X) : null;
		return {
			entity: i,
			bodyId: a?.bodyId || `entity:${i}`,
			form: a?.form ?? Y.Ocean,
			level: n.height
		};
	}
	/**
	* How far (x, z) is from the water's edge, across the ground: above zero on dry land (how far to the nearest water), below it on the
	* water (how far in from its shore). Past the zone's region it is the open sea's, deep in; null where no water is baked at all.
	*/
	shoreAt(e, t) {
		return this.field_?.query().shoreAt(e, t) ?? null;
	}
	bodyIdOf(e) {
		const t = this.app_?.world;
		return (t?.valid(e) && t.has(e, X) ? t.get(e, X) : null)?.bodyId || `entity:${e}`;
	}
	/** The world height of the surface above or below (x, z), or null where there is none. */
	heightAt(e, t) {
		return this.sample(e, 0, t)?.surface[1] ?? null;
	}
	/** The waves as they stand where the zone says they are `amp` high: the zone's, at that height, raised by the weather as far as the water is open to it. */
	waves(e, t = 1) {
		return {
			...at(this.zone_),
			height: e * nt(t),
			count: this.quality.waves
		};
	}
};
/** The resource the plugin installs. @experimental */
const Q = /* @__PURE__ */ c(/* @__PURE__ */ new Z(), "Waters");
/** The outline of a lake: its own boundary when it has three points or more, else the rectangle of its size. */
function et(e) {
	if (e.boundary.length >= 3) return e.boundary.map((e) => ({
		x: e.x,
		y: e.y
	}));
	const t = e.sizeX / 2, n = e.sizeZ / 2;
	return [
		{
			x: -t,
			y: -n
		},
		{
			x: t,
			y: -n
		},
		{
			x: t,
			y: n
		},
		{
			x: -t,
			y: n
		}
	];
}
/** × the waves' height the weather asks for now: 1 with no weather, or one that does not drive the wind. */
function tt() {
	const e = k();
	return e && A() & O.Wind ? e.waves : 1;
}
/** How far the weather raises the waves of water `exposure` open to the wind: all the way on open sea, little on a sheltered pond. */
/** @internal */
function nt(e) {
	return 1 + (tt() - 1) * Math.min(Math.max(e, 0), 1);
}
/**
* How open a body is to the wind, 0 to 1: wind waves grow with the water they blow over (their fetch), so the weather raises them fully
* on the sea and the more on a lake the wider it is, against eight of the zone's wave lengths; a river's fetch is its width.
*/
/** @internal */
function rt(e, t) {
	if (e.kind === "ocean") return 1;
	let n;
	if (e.kind === "lake") {
		let t = Infinity, r = Infinity, i = -Infinity, a = -Infinity;
		for (const n of e.outline) {
			const [o, s] = e.toWorld(n.x, n.y);
			t = Math.min(t, o);
			i = Math.max(i, o);
			r = Math.min(r, s);
			a = Math.max(a, s);
		}
		n = Math.min(i - t, a - r);
	} else n = e.stations.reduce((e, t) => e + t.half * 2, 0) / Math.max(e.stations.length, 1);
	return Math.min(Math.max(n / Math.max(t * 8, 1e-6), .1), 1);
}
/** How hard it rains on the water now (the weather's rain level), 0 with none or one that does not drive the rain. */
function it() {
	const e = k();
	return e && A() & O.Rain ? e.rain : 0;
}
/** The zone's waves at unit height, scaled by the weather: what is drawn and what the surface answers both read this, times each place's height. */
function at(e) {
	return {
		height: tt(),
		length: e.waveLength,
		speed: e.waveSpeed,
		direction: e.waveDirection
	};
}
/**
* How hard it rains on the water: the weather's rain, which the Water shader rings out as drops on the surface (`u_rain`). Rain is
* drawn, not simulated: it puts nothing in the ripples a zone keeps, and no foam.
*/
function ot() {
	return it();
}
/** `v` turned by `q`. */
function $(e, t, n, r) {
	const i = 2 * (e.y * r - e.z * n), a = 2 * (e.z * t - e.x * r), o = 2 * (e.x * n - e.y * t);
	return [
		t + e.w * i + (e.y * o - e.z * a),
		n + e.w * a + (e.z * i - e.x * o),
		r + e.w * o + (e.x * a - e.y * i)
	];
}
function st(e, t, n, r, i) {
	const a = $({
		x: -e.worldRotation.x,
		y: -e.worldRotation.y,
		z: -e.worldRotation.z,
		w: e.worldRotation.w
	}, t - e.worldPosition.x, n - e.worldPosition.y, r - e.worldPosition.z);
	return [
		a[0] / i,
		a[1] / i,
		a[2] / i
	];
}
function ct(e, t, n, r, i) {
	const a = $(e.worldRotation, t * i, n * i, r * i);
	return [
		a[0] + e.worldPosition.x,
		a[1] + e.worldPosition.y,
		a[2] + e.worldPosition.z
	];
}
/** A river's stations in the world: a few to its narrowest width along its curve, each with its height, half its width, its heading and its current. */
function lt(e, t, n, r, i) {
	let a = 0, o = Infinity;
	for (let t = 0; t <= 64; t++) {
		const n = e.width(t / 64 * e.length);
		a = Math.max(a, n);
		o = Math.min(o, n);
	}
	const s = Math.max(o / 3, e.length / 1024, .001);
	const c = Math.max(2, Math.ceil(e.length / s) + 1);
	const l = [];
	for (let o = 0; o < c; o++) {
		const s = o / (c - 1) * e.length;
		const [u, d, f] = e.position(s);
		const [p, m, h] = n(u, d, f);
		const g = e.tangent(s);
		const [_, , v] = r(g[0], 0, g[2]);
		const y = Math.hypot(_, v) || 1;
		const b = e.width(s);
		l.push({
			x: p,
			y: m,
			z: h,
			half: b / 2 * i,
			dx: _ / y,
			dz: v / y,
			speed: t * ze(b, a) * 2 * i
		});
	}
	return l;
}
var ut = class {
	constructor() {
		this.name = "water";
		this.activeWhen = [X, U];
		this.stock_ = 0;
		this.waters_ = new Z();
		this.key_ = "";
		this.surface_ = null;
		this.epoch_ = 0;
		this.baking_ = null;
		this.beds_ = /* @__PURE__ */ new Map();
	}
	build(e) {
		const t = new Z();
		this.waters_ = t;
		t.app_ = e;
		e.insertResource(Q, t);
		Fe(e);
		e.addSystemToSchedule(3, n([], () => {
			const n = e.hasResource(ee) ? e.getResource(ee) : null;
			t.quality = Qe(n && n.enabled ? n.profile : null, d());
			const r = this.gather(e);
			this.carve(e, r.beds);
			t.zone_ = r.zone;
			if (r.bodies.length === 0) {
				this.baking_?.cancel();
				this.baking_ = null;
				t.baking = false;
				t.field_ = null;
				this.key_ = "";
				this.dropRipples();
				this.dropSurface(e);
				return;
			}
			if (r.key !== this.key_ && this.baking_?.key !== r.key) {
				this.baking_?.cancel();
				const n = r.key;
				const i = E(e).run("Baking the water", He.baking(r.grid, r.bodies, this.ground(e), r.zone.surfLength));
				this.baking_ = {
					key: n,
					cancel: i.cancel
				};
				t.baking = true;
				i.done.then((e) => {
					if (this.baking_?.key !== n) return;
					this.baking_ = null;
					t.baking = false;
					this.key_ = n;
					t.field_ = e;
					t.revision_++;
				}, (e) => {
					l.error("water", "baking the water failed", e);
				});
			}
			if (!t.field_) return;
			const i = this.eye(e);
			this.ripple(e, r.zone, i, e.getResource(s).delta);
			if (!e.hasResource(u)) return;
			const a = this.surface(e, r.zone);
			if (a.instance && a.entity) this.update(e, a, r.zone, i ?? this.middle(r.grid));
		}, { name: "WaterSystem" }));
	}
	cleanup(e) {
		if (e) this.carve(e, []);
		if (!e?.hasResource(Q)) return;
		this.baking_?.cancel();
		this.baking_ = null;
		e.getResource(Q).baking = false;
		this.dropRipples();
		this.dropSurface(e);
		const t = e.getResource(Q);
		t.field_ = null;
		this.key_ = "";
		if (this.stock_) x.release(this.stock_);
		this.stock_ = 0;
	}
	/** The world position of the active camera, or null where there is none (the editor's scene view has no entity). */
	eye(e) {
		for (const t of e.world.getEntitiesWithComponents([r, o])) {
			if (!e.world.get(t, r).isActive) continue;
			const n = e.world.get(t, o);
			return [
				n.worldPosition.x,
				n.worldPosition.y,
				n.worldPosition.z
			];
		}
		return null;
	}
	/** The middle of the zone's region: where the surface and the ripples stay without a camera to follow. */
	middle(e) {
		return [
			e.minX + e.sizeX / 2,
			0,
			e.minZ + e.sizeZ / 2
		];
	}
	/**
	* The bodies as the zone takes them, in the world, the zone's settings, and the region they are baked over: the `WaterZone`'s, or without
	* one a region round every lake and river with a margin for their shores.
	*/
	gather(e) {
		const t = [];
		const n = [];
		const r = [];
		for (const i of e.world.getEntitiesWithComponents([X, o])) {
			const a = e.world.get(i, X);
			const s = e.world.get(i, o);
			const c = s.worldScale.y || 1;
			const l = i;
			if (a.form === Y.Ocean) {
				t.push({
					kind: "ocean",
					key: l,
					level: s.worldPosition.y,
					waveHeight: a.waveHeight,
					shoreWidth: a.shoreWidth
				});
				r.push([
					l,
					a.form,
					s.worldPosition.y,
					a.waveHeight,
					a.shoreWidth
				]);
			} else if (a.form === Y.Lake) {
				const e = et(a);
				t.push({
					kind: "lake",
					key: l,
					level: s.worldPosition.y,
					waveHeight: a.waveHeight,
					shoreWidth: a.shoreWidth * c,
					outline: e,
					toLocal: (e, t) => {
						const n = st(s, e, s.worldPosition.y, t, c);
						return [n[0], n[2]];
					},
					toWorld: (e, t) => {
						const n = ct(s, e, 0, t, c);
						return [n[0], n[2]];
					}
				});
				r.push([
					l,
					a.form,
					e,
					a.waveHeight,
					a.shoreWidth,
					s.worldPosition,
					s.worldRotation,
					c
				]);
			} else if (a.form === Y.River) {
				const o = e.world.tryGet(i, ne);
				if (!o || o.points.length < 2) continue;
				const u = lt(new te(o.points, o.closed), a.flowSpeed, (e, t, n) => ct(s, e, t, n, c), (e, t, n) => $(s.worldRotation, e, t, n), c);
				t.push({
					kind: "river",
					key: l,
					waveHeight: a.waveHeight,
					shoreWidth: a.shoreWidth * c,
					stations: u
				});
				if (a.bedDepth > 0) n.push({
					key: l,
					stations: u,
					depth: a.bedDepth * c
				});
				r.push([
					l,
					a.form,
					o.points,
					o.closed,
					a.flowSpeed,
					a.waveHeight,
					a.shoreWidth,
					s.worldPosition,
					s.worldRotation,
					c
				]);
			}
		}
		let i = $e();
		let a = null;
		for (const t of e.world.getEntitiesWithComponents([U, o])) {
			i = e.world.get(t, U);
			const n = e.world.get(t, o);
			a = dt(n.worldPosition.x - i.sizeX / 2, n.worldPosition.z - i.sizeZ / 2, i.sizeX, i.sizeZ, i.resolution);
			break;
		}
		if (!a) {
			a = ft(t, i);
			const e = we(i.cells, i.rings, i.cellSize), n = Math.max(a.sizeX, a.sizeZ);
			if (e < n) i = {
				...i,
				cellSize: i.cellSize * (n / e)
			};
		}
		for (const e of t) e.exposure = rt(e, i.waveLength);
		const s = e.hasResource(D) ? e.getResource(D) : null;
		const c = s && s.built_.size > 0 ? s.revision_ : -1;
		return {
			bodies: t,
			beds: n,
			grid: a,
			zone: i,
			key: JSON.stringify([
				r,
				a,
				c,
				i.surfLength,
				i.waveLength
			])
		};
	}
	/**
	* Cuts each river's bed into the terrain, and gives the ground back where a river stops cutting or is gone. A bed is laid again only
	* when the river it is cut from changes: the water baked over the cut ground does not cut it again.
	*/
	carve(e, t) {
		if (t.length === 0 && this.beds_.size === 0) return;
		const n = e.hasResource(D) ? e.getResource(D) : null;
		const r = /* @__PURE__ */ new Set();
		for (const e of t) {
			r.add(e.key);
			const t = JSON.stringify([e.depth, e.stations]);
			const i = this.beds_.get(e.key);
			if (i?.signature === t || !n) continue;
			for (const e of i?.ids ?? []) n.deleteModifier(e);
			const a = Se(`river-bed:${e.key}:`, e.stations, e.depth);
			for (const e of a) n.setModifier(e);
			this.beds_.set(e.key, {
				signature: t,
				ids: a.map((e) => e.id)
			});
		}
		for (const [e, t] of this.beds_) {
			if (r.has(e)) continue;
			if (n) for (const e of t.ids) n.deleteModifier(e);
			this.beds_.delete(e);
		}
	}
	/** The world height of the ground, where a terrain is built. */
	ground(e) {
		if (!e.hasResource(D)) return void 0;
		const t = e.getResource(D);
		if (t.built_.size === 0) return void 0;
		return (e, n) => t.heightAt(e, n);
	}
	/** The material the surface is an instance of when the zone names none: the Water shader, compiled once. */
	async stock(e) {
		if (this.stock_) return this.stock_;
		const t = (await e.getResource(u).load("material-shader", "builtin:water")).compile([]);
		if (this.stock_) return this.stock_;
		this.stock_ = x.createFromAsset({
			version: "1.0",
			type: "material",
			shader: "builtin:water",
			blendMode: 0,
			depthTest: true,
			depthWrite: true,
			cull: 0,
			properties: {}
		}, t);
		return this.stock_;
	}
	/** The surface, made (or remade, where its mesh or its material changed) as the zone asks. */
	surface(e, t) {
		const n = JSON.stringify([
			t.cells,
			t.rings,
			t.cellSize
		]);
		let r = this.surface_;
		if (r && (r.meshKey !== n || r.material !== t.material)) {
			this.dropSurface(e);
			r = null;
		}
		if (!r) {
			r = {
				entity: 0,
				mesh: 0,
				meshKey: n,
				instance: 0,
				material: t.material,
				heights: 0,
				field: 0,
				exposure: 0,
				baked: null,
				ripple: 0,
				rippleBytes: null,
				epoch: ++this.epoch_,
				pending: false
			};
			this.surface_ = r;
		}
		if (!r.entity && !r.pending) this.build_(e, r, t);
		return r;
	}
	async build_(e, n, r) {
		n.pending = true;
		const i = n.epoch;
		try {
			const a = r.material || await this.stock(e);
			if (n.epoch !== i || this.surface_ !== n) return;
			const s = e.getResource(u);
			const c = s.createMesh(Ce(r.cells, r.rings, r.cellSize, 8e4 * f()));
			if (c === 0) {
				l.warn("water", "the engine refused the water geometry");
				return;
			}
			const d = x.createInstance(a);
			if (d === 0) {
				s.releaseBuiltMesh(c);
				l.warn("water", "the water material could not be instanced");
				return;
			}
			n.mesh = c;
			n.instance = d;
			this.waters_.instance_ = d;
			const p = e.world.spawn("Water");
			e.world.insert(p, o, { position: {
				x: 0,
				y: 0,
				z: 0
			} });
			e.world.insert(p, t, {
				mesh: c,
				material: d,
				lit: true,
				opaque: false,
				cullBackfaces: false,
				castShadows: false,
				color: {
					r: 1,
					g: 1,
					b: 1,
					a: 1
				}
			});
			n.entity = p;
		} catch (e) {
			l.error("water", "building the water failed", e);
		} finally {
			n.pending = false;
		}
	}
	/** Puts the baked field where the shader reads it: the heights texel by texel, the rest filtered. */
	upload(e, t, n) {
		this.dropFieldTextures(t);
		const r = n.ranges(this.waters_.zone_.surfLength * 4);
		const { heights: i, field: a, exposure: o } = n.encode(r);
		const { nx: s, nz: c, minX: l, minZ: u, sizeX: d, sizeZ: f } = n.grid;
		const p = s < 2 || c < 2;
		const m = p ? 2 : s, h = p ? 2 : c;
		t.heights = y(e.wasmModule, {
			width: m,
			height: h,
			pixels: p ? /* @__PURE__ */ new Uint8Array(16) : i
		}, _.Retained, false, {
			filterMode: "nearest",
			wrapMode: "clamp",
			srgb: false
		});
		t.field = y(e.wasmModule, {
			width: m,
			height: h,
			pixels: p ? /* @__PURE__ */ new Uint8Array(16) : a
		}, _.Retained, false, {
			filterMode: "linear",
			wrapMode: "clamp",
			srgb: false
		});
		t.exposure = y(e.wasmModule, {
			width: m,
			height: h,
			pixels: p ? (/* @__PURE__ */ new Uint8Array(16)).fill(255) : o
		}, _.Retained, false, {
			filterMode: "linear",
			wrapMode: "clamp",
			srgb: false
		});
		t.baked = n;
		const g = (e, n) => {
			x.setUniform(t.instance, e, n);
		};
		g("u_zoneHeights", x.tex(t.heights));
		g("u_zoneField", x.tex(t.field));
		g("u_zoneExposure", x.tex(t.exposure));
		g("u_zoneOrigin", p ? {
			x: 1e9,
			y: 1e9
		} : {
			x: l,
			y: u
		});
		g("u_zoneSize", p ? {
			x: 1e-4,
			y: 1e-4
		} : {
			x: d,
			y: f
		});
		g("u_zoneHeight", {
			x: r.heightMin,
			y: r.heightSpan
		});
		g("u_zoneRange", {
			x: r.shore,
			y: r.amp,
			z: r.flow,
			w: r.depth
		});
		g("u_zoneOn", 1);
	}
	/** Writes the zone into the instance, and moves the surface to the camera on the lattice its rings line up on. */
	update(e, t, n, r) {
		const i = this.waters_.field_;
		if (t.baked !== i) this.upload(e, t, i);
		const a = Te(n.rings, n.cellSize);
		const s = Math.round(r[0] / a) * a, c = Math.round(r[2] / a) * a;
		const l = e.world.get(t.entity, o);
		if (l.position.x !== s || l.position.z !== c) e.world.insert(t.entity, o, {
			...l,
			position: {
				x: s,
				y: 0,
				z: c
			}
		});
		const u = (e, n) => {
			x.setUniform(t.instance, e, n);
		};
		const d = this.waters_.quality;
		const f = i.ocean;
		const p = at(n);
		u("u_waveCount", d.waves);
		u("u_mirror", d.mirror ? 1 : 0);
		u("u_causticOn", d.caustics ? 1 : 0);
		u("u_waveSpace", 1);
		u("u_origin", {
			x: s,
			y: c
		});
		u("u_cellSize", n.cellSize);
		u("u_geoWaves", d.displacement ? 1 : 0);
		u("u_waveHeight", p.height);
		u("u_rain", ot());
		u("u_waveLength", p.length);
		u("u_waveSpeed", p.speed);
		u("u_waveDirection", p.direction);
		u("u_oceanOn", f ? 1 : 0);
		u("u_oceanLevel", f ? f.level : 0);
		u("u_oceanWaves", f ? f.waveHeight : 0);
		u("u_surfHeight", n.surf);
		u("u_surfLength", n.surfLength);
		u("u_surfSpeed", n.waveSpeed);
	}
	/**
	* Keeps the zone's ripples: makes the grid when `ripples` asks for one, moves its window to the camera, steps it, and (where drawn) puts it where the shader reads it.
	* It runs headless too, so the surface a test or a server asks about has them.
	*/
	ripple(e, t, n, r) {
		const i = this.waters_;
		if (t.ripples <= 0 || i.quality.rippleCells <= 0) {
			this.dropRipples();
			return;
		}
		const a = Math.max(8, Math.floor(Math.min(t.ripples, i.quality.rippleCells))), o = Math.max(t.rippleSize, .001);
		if (!i.ripples_ || i.ripples_.n !== a || i.ripples_.size !== o) {
			this.dropRipples();
			i.ripples_ = new Ie(a, o);
			const e = i.field_.grid;
			i.ripples_.recenter(e.minX + e.sizeX / 2, e.minZ + e.sizeZ / 2);
		}
		const s = i.ripples_;
		if (n) s.recenter(n[0], n[2]);
		const c = Math.min(Math.max(r, 0), .1);
		s.step(c, t.rippleSpeed, t.rippleDamping, t.foamFade);
		const l = this.surface_;
		if (!l || !l.instance || !e.hasResource(u)) return;
		const d = Math.max((i.field_ ? i.field_.ranges().amp : 0) * tt() * 2, t.rippleSize * .02);
		s.limit = d;
		const f = s.encode(d, l.rippleBytes ?? void 0);
		l.rippleBytes = f;
		if (!l.ripple) {
			l.ripple = y(e.wasmModule, {
				width: a,
				height: a,
				pixels: f
			}, _.Retained, false, {
				filterMode: "linear",
				wrapMode: "clamp",
				srgb: false
			});
			const t = l.ripple;
			h(t, () => {
				if (l.ripple !== t || !l.rippleBytes) return false;
				v(e.wasmModule, t, 0, 0, a, a, l.rippleBytes);
				return true;
			});
			x.setUniform(l.instance, "u_rippleMap", x.tex(t));
		} else v(e.wasmModule, l.ripple, 0, 0, a, a, f);
		const p = (e, t) => {
			x.setUniform(l.instance, e, t);
		};
		p("u_rippleOn", 1);
		p("u_rippleOrigin", {
			x: s.originX,
			y: s.originZ
		});
		p("u_rippleSize", s.size);
		p("u_rippleTexel", 1 / a);
		p("u_rippleRange", d);
	}
	dropRipples() {
		const e = this.surface_;
		if (e?.ripple) {
			g(e.ripple);
			m()?.releaseTexture(e.ripple);
		}
		if (e) {
			e.ripple = 0;
			e.rippleBytes = null;
			if (e.instance) x.setUniform(e.instance, "u_rippleOn", 0);
		}
		this.waters_.ripples_ = null;
	}
	dropFieldTextures(e) {
		const t = m();
		if (e.heights) t?.releaseTexture(e.heights);
		if (e.field) t?.releaseTexture(e.field);
		if (e.exposure) t?.releaseTexture(e.exposure);
		e.heights = 0;
		e.field = 0;
		e.exposure = 0;
		e.baked = null;
	}
	dropSurface(e) {
		const t = this.surface_;
		if (!t) return;
		t.epoch = ++this.epoch_;
		this.surface_ = null;
		if (t.entity && e.world.valid(t.entity)) e.world.despawn(t.entity);
		if (t.ripple) {
			g(t.ripple);
			m()?.releaseTexture(t.ripple);
		}
		this.waters_.ripples_ = null;
		this.dropFieldTextures(t);
		if (t.instance) x.release(t.instance);
		if (t.mesh && e.hasResource(u)) e.getResource(u).releaseBuiltMesh(t.mesh);
		this.waters_.instance_ = 0;
	}
};
/** A region from (minX, minZ), `sizeX` by `sizeZ`, with `resolution` texels along its longer side. */
function dt(e, t, n, r, i) {
	const a = Math.max(n, r, .001);
	const o = Math.max(2, Math.round(i));
	return {
		minX: e,
		minZ: t,
		sizeX: n,
		sizeZ: r,
		nx: Math.max(2, Math.round(o * n / a)),
		nz: Math.max(2, Math.round(o * r / a))
	};
}
/**
* The region a scene without a `WaterZone` is baked over: round every lake and river, with a margin of their shores and a few texels, at half
* the surface's finest cell to a texel (no finer than 32 texels along its longer side, no coarser than 1024). None, when there is only an ocean.
*/
function ft(e, t) {
	let n = Infinity, r = Infinity, i = -Infinity, a = -Infinity, o = 0;
	for (const t of e) {
		if (t.kind === "ocean") continue;
		o = Math.max(o, t.shoreWidth);
		if (t.kind === "river") for (const e of t.stations) {
			n = Math.min(n, e.x - e.half);
			i = Math.max(i, e.x + e.half);
			r = Math.min(r, e.z - e.half);
			a = Math.max(a, e.z + e.half);
		}
		else for (const e of t.outline) {
			const [o, s] = t.toWorld(e.x, e.y);
			n = Math.min(n, o);
			i = Math.max(i, o);
			r = Math.min(r, s);
			a = Math.max(a, s);
		}
	}
	if (!Number.isFinite(n)) return {
		minX: 0,
		minZ: 0,
		sizeX: 0,
		sizeZ: 0,
		nx: 0,
		nz: 0
	};
	const s = Math.max(i - n, a - r);
	const c = Math.min(1024, Math.max(32, Math.ceil(s / Math.max(t.cellSize * .5, .001))));
	const l = o + s / c * 4;
	return dt(n - l, r - l, i - n + l * 2, a - r + l * 2, c);
}
const pt = /* @__PURE__ */ new ut();
//#endregion
//#region src/postprocess/underwater.ts
let mt = null;
/** Reports the camera under water, or (null) out of it. Called by the water module each frame. */
function ht(e) {
	mt = e;
}
/** What the water module last reported. */
function gt() {
	return mt;
}
/**
* Adds the underwater effect to what the volumes resolved: filled in from the state where the scene authored none of its own, its depth and amount
* always. Does nothing out of the water.
*/
function _t(e, t) {
	if (!t || t.amount <= 0) return;
	let n = e.get("underwater");
	const r = !!n;
	if (!n) {
		n = {
			enabled: true,
			uniforms: /* @__PURE__ */ new Map(),
			textures: /* @__PURE__ */ new Map(),
			colors: /* @__PURE__ */ new Map()
		};
		e.set("underwater", n);
	}
	if (!n.enabled) return;
	const i = (e) => ({
		r: e[0],
		g: e[1],
		b: e[2],
		a: 1
	});
	if (!r) {
		n.colors.set("u_absorption", i(t.absorption));
		n.colors.set("u_scatterColor", i(t.scatter));
		n.uniforms.set("u_density", t.density);
		n.uniforms.set("u_causticStrength", t.causticStrength);
		n.uniforms.set("u_causticScale", t.causticScale);
		n.uniforms.set("u_causticSpeed", t.causticSpeed);
	}
	if (t.light === false) {
		n.uniforms.set("u_causticStrength", 0);
		n.uniforms.set("u_shaftStrength", 0);
	}
	n.uniforms.set("u_amount", Math.min(Math.max(t.amount, 0), 1) * (n.uniforms.get("u_amount") ?? 1));
	n.uniforms.set("u_cameraDepth", t.depth);
	n.uniforms.set("u_planeNx", t.plane[0]);
	n.uniforms.set("u_planeNy", t.plane[1]);
	n.uniforms.set("u_planeNz", t.plane[2]);
	n.uniforms.set("u_planeD", t.plane[3]);
	n.uniforms.set("u_band", t.band);
}
/**
* How far above a surface a camera may be and still have part of its lens under it: its near plane reaches this far ahead of it, and a camera looking down
* puts the lower edge of that plane below it. Past this the whole lens is in the air.
*/
function vt(e) {
	return Math.max(e, 0) * 2.5;
}
//#endregion
//#region src/water/basins.ts
/** A binary heap of texels by height, lowest first; ties in the order pushed. */
var yt = class {
	constructor() {
		this.k = [];
		this.h = [];
		this.o = [];
		this.n = 0;
	}
	get size() {
		return this.k.length;
	}
	push(e, t) {
		this.k.push(e);
		this.h.push(t);
		this.o.push(this.n++);
		let n = this.k.length - 1;
		while (n > 0) {
			const e = n - 1 >> 1;
			if (!this.less(n, e)) break;
			this.swap(n, e);
			n = e;
		}
	}
	pop() {
		const e = this.k[0];
		const t = this.k.pop(), n = this.h.pop(), r = this.o.pop();
		if (this.k.length > 0) {
			this.k[0] = t;
			this.h[0] = n;
			this.o[0] = r;
			let e = 0;
			for (;;) {
				const t = e * 2 + 1, n = t + 1;
				let r = e;
				if (t < this.k.length && this.less(t, r)) r = t;
				if (n < this.k.length && this.less(n, r)) r = n;
				if (r === e) break;
				this.swap(e, r);
				e = r;
			}
		}
		return e;
	}
	less(e, t) {
		return this.h[e] < this.h[t] || this.h[e] === this.h[t] && this.o[e] < this.o[t];
	}
	swap(e, t) {
		[this.k[e], this.k[t]] = [this.k[t], this.k[e]];
		[this.h[e], this.h[t]] = [this.h[t], this.h[e]];
		[this.o[e], this.o[t]] = [this.o[t], this.o[e]];
	}
};
/** The basins and drainage of the ground over `grid`. Ground not known is taken as the sea's level (or as low as the lowest known). */
function bt(e, t, n = {}) {
	const { nx: r, nz: i } = e;
	const a = r * i;
	const o = (t) => [e.minX + t % r / Math.max(r - 1, 1) * e.sizeX, e.minZ + Math.floor(t / r) / Math.max(i - 1, 1) * e.sizeZ];
	const s = new Float32Array(a);
	let c = Infinity;
	const l = new Array(a);
	for (let e = 0; e < a; e++) {
		const [n, r] = o(e);
		const i = t(n, r);
		l[e] = i !== null;
		s[e] = i ?? 0;
		if (i !== null) c = Math.min(c, i);
	}
	const u = n.seaLevel ?? (Number.isFinite(c) ? c : 0);
	for (let e = 0; e < a; e++) if (!l[e]) s[e] = u;
	const d = new Float32Array(a);
	const f = new Int32Array(a).fill(-1);
	const p = new Uint8Array(a);
	const m = new Uint8Array(a);
	const h = [];
	const g = new yt();
	const _ = n.seaLevel;
	const v = (e) => {
		if (m[e]) return;
		m[e] = 1;
		d[e] = s[e];
		if (_ !== void 0 && s[e] < _) p[e] = 1;
		g.push(e, s[e]);
	};
	for (let e = 0; e < r; e++) {
		v(e);
		v((i - 1) * r + e);
	}
	for (let e = 0; e < i; e++) {
		v(e * r);
		v(e * r + r - 1);
	}
	while (g.size > 0) {
		const e = g.pop();
		h.push(e);
		const t = e % r, n = Math.floor(e / r);
		for (let a = -1; a <= 1; a++) for (let o = -1; o <= 1; o++) {
			if (!o && !a) continue;
			const c = t + o, l = n + a;
			if (c < 0 || l < 0 || c >= r || l >= i) continue;
			const u = l * r + c;
			if (m[u]) continue;
			m[u] = 1;
			f[u] = e;
			d[u] = Math.max(s[u], d[e]);
			if (p[e] && s[u] < _) p[u] = 1;
			g.push(u, d[u]);
		}
	}
	const y = new Float32Array(a).fill(1);
	for (let e = h.length - 1; e >= 0; e--) {
		const t = h[e], n = f[t];
		if (n >= 0) y[n] += y[t];
	}
	const b = new Int32Array(a).fill(-1);
	const x = [];
	const S = n.minDepth ?? 0, C = n.minCells ?? 1;
	const w = (e) => !p[e] && d[e] - s[e] > 1e-6;
	for (let e = 0; e < a; e++) {
		if (!w(e) || b[e] >= 0) continue;
		const t = x.length, n = d[e];
		const a = [e];
		b[e] = t;
		let c = e;
		for (let e = 0; e < a.length; e++) {
			const o = a[e], l = o % r, u = Math.floor(o / r);
			if (s[o] < s[c]) c = o;
			for (let e = -1; e <= 1; e++) for (let o = -1; o <= 1; o++) {
				const s = l + o, c = u + e;
				if (s < 0 || c < 0 || s >= r || c >= i) continue;
				const f = c * r + s;
				if (b[f] < 0 && w(f) && d[f] === n) {
					b[f] = t;
					a.push(f);
				}
			}
		}
		let l = c;
		while (l >= 0 && b[l] === t) l = f[l];
		const u = l >= 0 ? l : c;
		if (n - s[c] < S || a.length < C) {
			for (const e of a) b[e] = -2;
			continue;
		}
		const [p, m] = o(c), [h, g] = o(u);
		x.push({
			id: t,
			level: n,
			cells: a.length,
			deepest: {
				x: p,
				z: m,
				y: s[c]
			},
			outlet: {
				x: h,
				z: g,
				y: s[u],
				index: u
			}
		});
	}
	const T = /* @__PURE__ */ new Map();
	x.forEach((e, t) => {
		T.set(e.id, t);
		e.id = t;
	});
	for (let e = 0; e < a; e++) b[e] = b[e] >= 0 ? T.get(b[e]) ?? -1 : -1;
	return {
		grid: e,
		ground: s,
		filled: d,
		downstream: f,
		accumulation: y,
		basin: b,
		sea: p,
		basins: x
	};
}
/** The path water takes from (x, z) down the drainage, texel by texel, to the region's edge: a river's course, as world points. */
function xt(e, t, n) {
	const { grid: r } = e, { nx: i, nz: a } = r;
	const o = Math.round((t - r.minX) / r.sizeX * (i - 1)), s = Math.round((n - r.minZ) / r.sizeZ * (a - 1));
	if (o < 0 || s < 0 || o >= i || s >= a) return [];
	const c = [];
	for (let t = s * i + o; t >= 0; t = e.downstream[t]) c.push({
		x: r.minX + t % i / Math.max(i - 1, 1) * r.sizeX,
		z: r.minZ + Math.floor(t / i) / Math.max(a - 1, 1) * r.sizeZ,
		y: e.filled[t]
	});
	return c;
}
//#endregion
export { ue as A, B as C, Te as D, we as E, pe as M, ve as O, Oe as S, Ce as T, H as _, vt as a, R as b, Y as c, Q as d, pt as f, Re as g, ze as h, gt as i, fe as j, M as k, ut as l, U as m, bt as n, ht as o, He as p, _t as r, X as s, xt as t, Z as u, Ie as v, Ne as w, Me as x, L as y };

//# sourceMappingURL=basins.js.map