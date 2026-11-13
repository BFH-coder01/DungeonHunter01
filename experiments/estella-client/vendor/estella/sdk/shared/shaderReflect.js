import { o as e } from "./worldUnits.js";
//#region src/render/shaderReflect.ts
/**
* @file    shaderReflect.ts
* @brief   What a `.esshader`'s `#pragma param` lines declare, read from the source.
* @details Parses the same param grammar the engine's C++ ShaderParser does, but only the
*          declaration metadata (name / type / default / range / ui hint / display name).
*          The engine remains the single source of the std140 layout + GLSL codegen; this is
*          the static view of the declarations, for everything that needs to know a shader's
*          parameter vocabulary without compiling one.
*
*          Three things read it, which is why it lives here rather than in the editor where
*          it started: the Material inspector builds its parameter panel from it, the built-in
*          templates derive their material defaults from it (so the defaults cannot drift from
*          the shader that consumes them), and `Material.setUniform` uses it to tell a caller
*          that the name it just wrote is not one this shader has — a value the engine would
*          otherwise drop without a word.
*
*          Grammar (matches ShaderParser):
*            #pragma param <name> <type> [default(csv)] [range(min,max)] [ui(hint)] [texel(data)] [unit(length|perLength)]
*            (<type> `textureArray` reads as a `texture` param with `layered` set)
*            #pragma domain <Unlit|Lit|PostProcess|UI>
*/
/**
* A param as it reads in this project: a world-unit one's default and range scaled to the project's units per metre (a length
* by the scale, a rate per length by its inverse), as the engine fills it; any other as declared.
*/
function t(t) {
	const n = e();
	if (!t.worldUnits || n === 1) return t;
	const r = t.worldUnits === 1 ? n : 1 / n;
	const i = t.range ? {
		min: t.range.min * r,
		max: t.range.max * r
	} : void 0;
	return {
		...t,
		default: t.default.map((e) => e * r),
		...i ? { range: i } : {}
	};
}
const n = /* @__PURE__ */ new Set([
	"float",
	"vec2",
	"vec3",
	"vec4",
	"color",
	"int",
	"texture"
]);
const r = {
	float: 1,
	int: 1,
	vec2: 2,
	vec3: 3,
	vec4: 4,
	color: 4
};
const i = [
	"x",
	"y",
	"z",
	"w"
];
function a(e, t) {
	const n = `${t}(`;
	const r = e.indexOf(n);
	if (r < 0) return void 0;
	const i = r + n.length;
	const a = e.indexOf(")", i);
	if (a < 0) return void 0;
	return e.slice(i, a).trim();
}
function o(e) {
	if (e === "texture") return [];
	if (e === "color") return [
		0,
		0,
		0,
		1
	];
	return new Array(r[e] ?? 1).fill(0);
}
function s(e) {
	let t = e.startsWith("u_") ? e.slice(2) : e;
	if (t.length > 0) t = t[0].toUpperCase() + t.slice(1);
	return t;
}
function c(e) {
	const t = e.trim().split(/\s+/);
	const r = t[0];
	const i = t[1];
	const c = i === "textureArray";
	if (!r || !i || !c && !n.has(i)) return null;
	const l = c ? "texture" : i;
	const u = {
		name: r,
		type: l,
		displayName: s(r),
		default: o(l)
	};
	if (c) u.layered = true;
	const d = a(e, "default");
	if (d !== void 0) if (l === "texture") u.defaultTexture = d;
	else {
		const e = d.split(",").map((e) => parseFloat(e.trim())).filter((e) => !Number.isNaN(e));
		if (e.length > 0) u.default = e;
	}
	const f = a(e, "range");
	if (f !== void 0) {
		const [e, t] = f.split(",").map((e) => parseFloat(e.trim()));
		if (!Number.isNaN(e) && !Number.isNaN(t)) u.range = {
			min: e,
			max: t
		};
	}
	const p = a(e, "ui");
	if (p !== void 0) u.ui = p;
	if (l === "texture" && a(e, "texel") === "data") u.texel = "data";
	const m = a(e, "unit");
	if (l !== "texture" && (m === "length" || m === "perLength")) u.worldUnits = m === "length" ? 1 : -1;
	return u;
}
/**
* A param's declared default in the shape a `.esmaterial`'s `properties` stores it: a number
* for float/int, `{r,g,b,a}` for a color, `{x,y,…}` for a vector, and for a texture the
* default's NAME (`"white"`, `"flatnormal"` — an engine-resolved stand-in, not an asset ref).
*/
function l(e) {
	if (e.type === "texture") return e.defaultTexture ?? 0;
	if (e.type === "color") {
		const t = e.default;
		return {
			r: t[0] ?? 0,
			g: t[1] ?? 0,
			b: t[2] ?? 0,
			a: t[3] ?? 1
		};
	}
	if (e.type === "float" || e.type === "int") return e.default[0] ?? 0;
	const t = {};
	const n = r[e.type] ?? 1;
	for (let r = 0; r < n; r++) t[i[r]] = e.default[r] ?? 0;
	return t;
}
/**
* A domain a shader was authored against, under the name the engine uses now.
* The twin of the engine parser's own table: the two lit domains were named for
* a plane before either was the only one there is, and a `.esshader` carries no
* format version to migrate by, so the old spelling is answered on the way in.
*/
const u = {
	Lit2D: "Lit",
	Unlit2D: "Unlit"
};
/** Parse a `.esshader` source into its declared parameters (world-unit ones in the project's units) and domain. */
function d(e) {
	const n = [];
	let r = "Unlit";
	for (const i of e.split("\n")) {
		const e = i.trim();
		if (!e.startsWith("#pragma")) continue;
		const a = e.slice(7).trim();
		const o = a.search(/\s/);
		const s = o < 0 ? a : a.slice(0, o);
		const l = o < 0 ? "" : a.slice(o + 1).trim();
		if (s === "param") {
			const e = c(l);
			if (e) n.push(t(e));
		} else if (s === "domain" && l) r = u[l] ?? l;
	}
	return {
		domain: r,
		params: n
	};
}
//#endregion
export { l as n, d as r, u as t };

//# sourceMappingURL=shaderReflect.js.map