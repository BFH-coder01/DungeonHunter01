import { n as e, t } from "./disposeAll.js";
import { m as n, s as r } from "./resourceManager.js";
import { r as i } from "./shaderReflect.js";
//#region src/render/readback.ts
/** Poll result: no readback in flight, or it failed. */
const a = 2;
/**
* Awaits an engine readback poll until it reports ready (1) or failed (2),
* yielding a macrotask between pending polls. Returns the terminal status.
*
* @param timeoutMs A backstop, not a schedule: the copy is already submitted, so
*   what keeps it from landing is a device that died — which the poll reports as
*   failed on its own — or a queue that has not drained. A CPU rasterizer with a
*   few dozen shadow-casting frames behind it takes seconds to hand one over.
*/
async function o(e, t = 15e3) {
	const n = Date.now() + t;
	for (;;) {
		const t = e();
		if (t !== 0) return t;
		if (Date.now() >= n) return 2;
		await new Promise((e) => setTimeout(e, 0));
	}
}
//#endregion
//#region src/render/assetPreview.ts
/** The connected core, when it answers the preview surface; null otherwise. */
function s(e) {
	const t = e;
	return typeof t?.renderer_renderMaterialPreview === "function" ? t : null;
}
/**
* Run @p draw against the offscreen target and resolve with its pixels. The
* readback rides the engine's async seam: immediate on GL, resolved when the
* staging-buffer map lands on WebGPU — one awaited call either way.
*/
const c = /* @__PURE__ */ new WeakMap();
function l(e, t) {
	const n = (c.get(e) ?? Promise.resolve()).then(() => u(e, t));
	const r = n.then(() => {}, () => {});
	c.set(e, r);
	r.then(() => {
		if (c.get(e) === r) c.delete(e);
	});
	return n;
}
async function u(e, t) {
	if (t() === false) return null;
	if (await o(() => e.renderer_pollPreviewReadback()) !== 1) return null;
	const n = e.renderer_getPreviewSize();
	const r = e.renderer_getPreviewWidth();
	const i = e.renderer_getPreviewHeight();
	if (n === 0 || r === 0 || i === 0) return null;
	const a = new Uint8ClampedArray(e.HEAPU8.buffer, e.renderer_getPreviewPtr(), n);
	const s = new Uint8ClampedArray(n);
	const c = r * 4;
	for (let e = 0; e < i; e++) s.set(a.subarray(e * c, (e + 1) * c), (i - 1 - e) * c);
	return new ImageData(s, r, i);
}
/**
* A thumbnail of a loaded `.esmesh`, seen from off-axis and framed to its own
* bounds — a mesh is authored at whatever scale its source used, and head-on it
* is a silhouette. Null if the engine isn't ready or the mesh isn't loaded.
*/
async function d(e, t, n, r) {
	const i = s(e);
	if (!i || typeof i.renderer_renderMeshPreview !== "function" || !t) return null;
	return l(i, () => i.renderer_renderMeshPreview(t, n, r));
}
//#endregion
//#region src/render/material.ts
function f(e) {
	return typeof e === "object" && e !== null && "__textureRef" in e;
}
function p(e) {
	if (typeof e === "number") return {
		arity: 1,
		values: [
			e,
			0,
			0,
			0
		]
	};
	if (Array.isArray(e)) return {
		arity: Math.max(1, Math.min(e.length, 4)),
		values: [
			e[0] ?? 0,
			e[1] ?? 0,
			e[2] ?? 0,
			e[3] ?? 0
		]
	};
	if ("w" in e) return {
		arity: 4,
		values: [
			e.x,
			e.y,
			e.z,
			e.w
		]
	};
	if ("z" in e) return {
		arity: 3,
		values: [
			e.x,
			e.y,
			e.z,
			0
		]
	};
	return {
		arity: 2,
		values: [
			e.x,
			e.y,
			0,
			0
		]
	};
}
/** Triangle culling mode; mirrors the engine's CullMode. */
let m = /* @__PURE__ */ function(e) {
	e[e["None"] = 0] = "None";
	e[e["Back"] = 1] = "Back";
	e[e["Front"] = 2] = "Front";
	return e;
}({});
/** The `version` a `.esmaterial` this build writes carries, named the way its
*  sibling formats name theirs. */
const h = "1.0";
/** Guarded view of the core: after a wasm abort a call throws instead of reaching
*  a dead module; a native host's bindings never abort. */
var g = class extends n {
	constructor(...e) {
		super(...e);
		this.label = "material";
	}
};
const _ = new g();
let v = null;
let y = 1;
const b = /* @__PURE__ */ new Map();
const x = /* @__PURE__ */ new Map();
const S = (e) => t([...new Set(e)], (e) => e.release());
function C(e, t, n) {
	const r = x.get(e) ?? /* @__PURE__ */ new Map();
	const i = new Map(n ?? r);
	for (const [e, n] of i) {
		const r = t.get(e);
		if (!r || !f(r) || r.textureId !== n.value.handle) i.delete(e);
	}
	if (i.size) x.set(e, i);
	else x.delete(e);
	const a = new Set(i.values());
	const o = [...r.values(), ...n?.values() ?? []].filter((e) => !a.has(e));
	return () => S(o);
}
const w = /* @__PURE__ */ new Map();
const T = /* @__PURE__ */ new Map();
const E = /* @__PURE__ */ new Map();
const D = /* @__PURE__ */ new Set();
/**
* @internal Wired by the engine plugins — not part of the public API.
* Takes whichever core is present (see ecs/engineApi.ts). A core that compiles
* materials out answers none of these entry points; the caller checks that before
* connecting, which is what makes the narrowing here sound.
*/
function O(e) {
	_.connect(e);
	v = _.module;
}
function k() {
	const e = [...x.values()].flatMap((e) => [...e.values()]);
	x.clear();
	try {
		S(e);
	} finally {
		b.clear();
		w.clear();
		T.clear();
		E.clear();
		D.clear();
		y = 1;
		_.disconnect();
		v = null;
	}
}
/** The shader a material draws with — its own, or the one it inherits as an instance. */
function A(e) {
	let t = b.get(e);
	const n = t?.ownShader;
	for (let e = 0; t?.parent !== void 0 && e < 16; e++) t = b.get(t.parent);
	return n ?? t?.shader;
}
/**
* Say so when a param name is not one the shader declares.
*
* The engine drops an unknown param without a word — MaterialStore keys the std140 layout
* by the reflected name, so a value under any other name has nowhere to land. That makes a
* typo the most expensive kind of mistake here: the call succeeds, the value is stored, and
* the effect never happens. `Material.setUniform(m, 'u_amount', x)` against a shader whose
* slider is `u_progress` reads as a broken shader, and spelling is the last thing anyone
* checks. Naming what the shader DOES declare turns that into a one-line fix.
*/
function j(e, t) {
	const n = e !== void 0 ? T.get(e) : void 0;
	if (!n || n.has(t)) return;
	const r = `${e}:${t}`;
	if (D.has(r)) return;
	D.add(r);
	const i = [...n].join(", ") || "(none)";
	console.warn(`[material] "${t}" is not a parameter of this shader — the value is ignored. It declares: ${i}`);
}
function M(e, t, n) {
	return (e ? 1 : 0) | (t ? 2 : 0) | (n & 3) << 2;
}
function N(e, t) {
	let n = w.get(e);
	if (!n) {
		n = /* @__PURE__ */ new Set();
		w.set(e, n);
	}
	n.add(t);
}
function P(e, t) {
	w.get(e)?.delete(t);
}
function F(e, t, n) {
	if (!v) return;
	if (f(n)) {
		v.material_setTexture(e, t, n.textureId);
		return;
	}
	const { arity: r, values: i } = p(n);
	const a = b.get(e);
	if (a) {
		let e = a.sent_;
		if (!e) {
			e = /* @__PURE__ */ new Map();
			a.sent_ = e;
		}
		const n = e.get(t);
		if (n) {
			n[0] = r;
			n[1] = i[0];
			n[2] = i[1];
			n[3] = i[2];
			n[4] = i[3];
		} else e.set(t, [
			r,
			i[0],
			i[1],
			i[2],
			i[3]
		]);
	}
	v.material_setUniform(e, t, r, i[0], i[1], i[2], i[3]);
}
/** Whether the engine already holds exactly this value for the uniform. */
function I(e, t, n) {
	const r = b.get(e)?.sent_?.get(t);
	if (!r) return false;
	const { arity: i, values: a } = p(n);
	return r[0] === i && r[1] === a[0] && r[2] === a[1] && r[3] === a[2] && r[4] === a[3];
}
/** One changed uniform to the engine, for this material and the instances that inherit it (those that override the name keep their own). */
function L(e, t, n) {
	F(e, t, n);
	const r = b.get(e);
	if (r) r.dirty_ = true;
	const i = w.get(e);
	if (!i) return;
	for (const e of i) {
		if (b.get(e)?.uniforms.has(t)) continue;
		L(e, t, n);
	}
}
const R = /* @__PURE__ */ new Map();
function z(e, t = true) {
	const n = b.get(e);
	if (!n) return null;
	const r = n.parent !== void 0 ? z(n.parent, t) : null;
	if (!r) return {
		shader: n.shader,
		blendMode: n.blendMode,
		depthTest: n.depthTest,
		depthWrite: n.depthWrite,
		cull: n.cull,
		depthBias: n.depthBias,
		uniforms: t ? new Map(n.uniforms) : R
	};
	const i = r.uniforms;
	if (t) for (const [e, t] of n.uniforms) i.set(e, t);
	return {
		shader: n.ownShader ?? r.shader,
		blendMode: n.overrides.has("blendMode") ? n.blendMode : r.blendMode,
		depthTest: n.overrides.has("depthTest") ? n.depthTest : r.depthTest,
		depthWrite: n.overrides.has("depthWrite") ? n.depthWrite : r.depthWrite,
		cull: n.overrides.has("cull") ? n.cull : r.cull,
		depthBias: n.overrides.has("depthBias") ? n.depthBias : r.depthBias,
		uniforms: i
	};
}
function B(e, t) {
	const n = z(e);
	if (n && v) {
		const r = t?.get(e);
		if (r && [...r.uniforms.keys()].some((e) => !n.uniforms.has(e))) {
			v.material_undefine(e);
			b.get(e)?.sent_?.clear();
		}
		v.material_define(e, n.shader, n.blendMode, M(n.depthTest, n.depthWrite, n.cull), n.depthBias);
		for (const [t, r] of n.uniforms) F(e, t, r);
		const i = b.get(e);
		if (i) i.pushed_ = true;
	}
	const r = b.get(e);
	if (r) r.dirty_ = true;
	const i = w.get(e);
	if (i) for (const e of i) B(e, t);
}
function V(e) {
	const t = {};
	for (const [n, r] of Object.entries(e)) if (typeof r === "number") t[n] = r;
	else if (typeof r === "object" && r !== null) {
		const e = r;
		if ("r" in e) t[n] = {
			x: e.r ?? 0,
			y: e.g ?? 0,
			z: e.b ?? 0,
			w: e.a ?? 1
		};
		else if ("w" in e) t[n] = {
			x: e.x ?? 0,
			y: e.y ?? 0,
			z: e.z ?? 0,
			w: e.w ?? 0
		};
		else if ("z" in e) t[n] = {
			x: e.x ?? 0,
			y: e.y ?? 0,
			z: e.z ?? 0
		};
		else if ("y" in e) t[n] = {
			x: e.x ?? 0,
			y: e.y ?? 0
		};
	}
	return t;
}
const H = {
	/**
	* Creates a shader from vertex and fragment source code.
	* @param vertexSrc GLSL vertex shader source
	* @param fragmentSrc GLSL fragment shader source
	* @returns Shader handle, or 0 on failure
	*/
	createShader(e, t) {
		return r().createShader(e, t);
	},
	/**
	* Releases a shader.
	* @param shader Shader handle to release
	*/
	releaseShader(e) {
		if (e > 0) {
			T.delete(e);
			E.delete(e);
			r().releaseShader(e);
		}
	},
	/**
	* Creates a material with a shader and optional settings.
	* @param options Material creation options
	* @returns Material handle
	*/
	create(e) {
		const t = y++;
		const n = {
			shader: e.shader,
			uniforms: /* @__PURE__ */ new Map(),
			blendMode: e.blendMode ?? 0,
			depthTest: e.depthTest ?? false,
			depthWrite: e.depthWrite ?? true,
			cull: e.cull ?? 0,
			depthBias: e.depthBias ?? 0,
			switches: e.switches ? { ...e.switches } : {},
			overrides: /* @__PURE__ */ new Set(),
			dirty_: true,
			cachedBuffer_: null,
			cachedIdx_: 0
		};
		if (e.uniforms) for (const [t, r] of Object.entries(e.uniforms)) {
			j(e.shader, t);
			n.uniforms.set(t, r);
		}
		b.set(t, n);
		B(t);
		return t;
	},
	/**
	* Compiles a `.esshader` material shader through the engine's ShaderParser, which
	* generates the std140 MaterialConstants block from its `#pragma param` declarations and
	* registers the param layout. Use this (not createShader) for materials whose parameters
	* should reach the GPU. Returns a shader handle, or 0 on failure.
	*/
	compileShader(e, t = []) {
		const n = v?.material_compileEsshader(e, t.join(",")) ?? 0;
		if (n > 0) T.set(n, new Set(i(e).params.map((e) => e.name)));
		return n;
	},
	/**
	* Every live material whose shader declares `param`: what a value that belongs to the whole scene (the weather's wind) is written to, without
	* asking each sprite which material it wears.
	*/
	materialsDeclaring(e) {
		const t = [];
		for (const [n, r] of b) if (T.get(r.shader)?.has(e)) t.push(n);
		return t;
	},
	/**
	* Record what a compiled permutation was made from: the source's switches and how to compile it under others. The asset loader says so for
	* every shader it compiles, which is what lets `recompile` answer for a material that only holds the handle.
	*/
	noteProgram(e, t, n, r) {
		const i = /* @__PURE__ */ new Set();
		for (const e of n.matchAll(/^[ \t]*#pragma[ \t]+switch[ \t]+(\w+)/gm)) i.add(e[1]);
		E.set(e, {
			features: t,
			declared: i,
			compile: r
		});
	},
	/**
	* Switch a material to the permutation of its own shader source that has `changes` applied: a switch the shader does not declare is left out
	* (a project's macro the effect never branched on), and the material takes the permutation at once, with its parameters and textures
	* carried over. A material that inherits (an instance) switches for itself and leaves its parent as it is. Answers whether the shader changed.
	*/
	recompile(e, t) {
		const n = b.get(e);
		const r = A(e);
		const i = r !== void 0 ? E.get(r) : void 0;
		if (!n || !i) return false;
		const a = new Set(i.features);
		for (const [e, r] of Object.entries(t)) {
			n.switches[e] = r;
			if (r) a.add(e);
			else a.delete(e);
		}
		const o = [...a].filter((e) => i.declared.has(e)).sort();
		const s = i.compile(o);
		if (s === r || s <= 0) return false;
		if (n.parent === void 0) n.shader = s;
		else n.ownShader = s;
		B(e);
		return true;
	},
	/** Gets an enabled static switch (false when unset). */
	getSwitch(e, t) {
		return b.get(e)?.switches[t] ?? false;
	},
	/** Sets a static switch on the record. The shader permutation is chosen at compile time,
	*  so a change takes effect when the material's shader is next (re)compiled — callers that
	*  need it live recompile the shader with the new switch set. */
	setSwitch(e, t, n) {
		const r = b.get(e);
		if (r) r.switches[t] = n;
	},
	/**
	* Gets material data by handle.
	* @param material Material handle
	* @returns Material data or undefined
	*/
	get(e) {
		return b.get(e);
	},
	/** Effective shader/render state without allocating or cloning uniform maps. */
	getRenderState(e) {
		const t = z(e, false);
		if (!t) return null;
		const { uniforms: n, ...r } = t;
		return r;
	},
	/**
	* Replace the complete local parameter/render-state snapshot and flush once.
	* Missing fields restore base defaults or remove an instance override, so
	* future parent edits keep propagating. Shader and parent ownership stay with
	* the asset loader; this operation never re-acquires a different generation.
	* When supplied, textureLeases transfers ownership of the complete edited
	* texture set. Receipts remain held until replacement, Reset or material release.
	*/
	applyState(e, t, n) {
		const r = b.get(e);
		if (!r) {
			if (n) S(n.values());
			return;
		}
		const i = /* @__PURE__ */ new Map();
		const a = (e) => {
			if (i.has(e)) return;
			const t = z(e);
			if (t) i.set(e, t);
			for (const t of w.get(e) ?? []) a(t);
		};
		a(e);
		r.uniforms.clear();
		for (const [n, i] of Object.entries(t.uniforms ?? {})) {
			j(A(e), n);
			r.uniforms.set(n, i);
		}
		const o = C(e, r.uniforms, n);
		r.blendMode = t.blendMode ?? 0;
		r.depthTest = t.depthTest ?? false;
		r.depthWrite = t.depthWrite ?? true;
		r.cull = t.cull ?? 0;
		r.depthBias = Math.round(t.depthBias ?? 0);
		r.switches = { ...t.switches };
		r.overrides.clear();
		if (r.parent !== void 0) {
			for (const e of [
				"blendMode",
				"depthTest",
				"depthWrite",
				"cull",
				"depthBias"
			]) if (t[e] !== void 0) r.overrides.add(e);
		}
		try {
			B(e, i);
		} finally {
			o();
		}
	},
	/**
	* Sets a uniform value on a material.
	* @param material Material handle
	* @param name Uniform name
	* @param value Uniform value
	*/
	setUniform(e, t, n) {
		const r = b.get(e);
		if (r) {
			j(A(e), t);
			const i = r.uniforms.get(t);
			if (!f(n) && !(i !== void 0 && f(i)) && r.pushed_ && v) {
				r.uniforms.set(t, n);
				if (I(e, t, n)) return;
				r.dirty_ = true;
				L(e, t, n);
				return;
			}
			r.uniforms.set(t, n);
			const a = C(e, r.uniforms);
			r.dirty_ = true;
			try {
				B(e);
			} finally {
				a();
			}
		}
	},
	/**
	* Gets a uniform value from a material.
	* @param material Material handle
	* @param name Uniform name
	* @returns Uniform value or undefined
	*/
	getUniform(e, t) {
		return z(e)?.uniforms.get(t);
	},
	/**
	* Sets the blend mode for a material.
	* @param material Material handle
	* @param mode Blend mode
	*/
	setBlendMode(e, t) {
		const n = b.get(e);
		if (n) {
			n.blendMode = t;
			if (n.parent !== void 0) n.overrides.add("blendMode");
			B(e);
		}
	},
	/**
	* Gets the blend mode of a material.
	* @param material Material handle
	* @returns Blend mode
	*/
	getBlendMode(e) {
		return z(e, false)?.blendMode ?? 0;
	},
	/**
	* Sets depth test enabled for a material.
	* @param material Material handle
	* @param enabled Whether depth test is enabled
	*/
	setDepthTest(e, t) {
		const n = b.get(e);
		if (n) {
			n.depthTest = t;
			if (n.parent !== void 0) n.overrides.add("depthTest");
			B(e);
		}
	},
	/** Enables/disables depth writes (default on, matching the engine's 2D state). */
	setDepthWrite(e, t) {
		const n = b.get(e);
		if (n) {
			n.depthWrite = t;
			if (n.parent !== void 0) n.overrides.add("depthWrite");
			B(e);
		}
	},
	/**
	* How far toward the eye this surface is pushed, in depth-buffer units —
	* what makes a decal win against the wall it is laid on. Negative is toward
	* the eye; 0 leaves the surface where its geometry puts it.
	*/
	setDepthBias(e, t) {
		const n = b.get(e);
		if (n) {
			n.depthBias = Math.round(t);
			if (n.parent !== void 0) n.overrides.add("depthBias");
			B(e);
		}
	},
	/** Sets the triangle culling mode. */
	setCull(e, t) {
		const n = b.get(e);
		if (n) {
			n.cull = t;
			if (n.parent !== void 0) n.overrides.add("cull");
			B(e);
		}
	},
	/**
	* Gets the shader handle for a material.
	* @param material Material handle
	* @returns Shader handle
	*/
	getShader(e) {
		return z(e, false)?.shader ?? 0;
	},
	/**
	* Releases a material (does not release the shader).
	* @param material Material handle
	*/
	release(e) {
		const t = b.get(e);
		if (t?.parent !== void 0) P(t.parent, e);
		w.delete(e);
		b.delete(e);
		const n = x.get(e);
		x.delete(e);
		try {
			v?.material_undefine(e);
		} finally {
			if (n) S(n.values());
		}
	},
	/**
	* Checks if a material exists.
	* @param material Material handle
	* @returns True if material exists
	*/
	isValid(e) {
		return b.has(e);
	},
	/**
	* Render a material offscreen at @p w×@p h and resolve with its pixels, through the real
	* viewport path, lit by one directional light. `shape.mesh` (a loaded mesh handle) draws it on
	* that geometry, seen off-axis and framed; without, a sprite shader samples `shape.texture` on
	* a flat quad. Null if the engine isn't ready or the readback fails.
	*/
	async renderPreview(e, t, n, r = {}) {
		const i = v;
		const a = s(i);
		const o = b.get(e);
		if (!a || !o) return null;
		const c = [];
		try {
			return await l(a, () => {
				if (v !== i || b.get(e) !== o) return false;
				const s = /* @__PURE__ */ new Set();
				let l = e;
				while (l !== void 0 && !s.has(l)) {
					s.add(l);
					for (const e of x.get(l)?.values() ?? []) {
						const t = e.retain();
						if (t) c.push(t);
					}
					l = b.get(l)?.parent;
				}
				return a.renderer_renderMaterialPreview(e, t, n, r.mesh ?? 0, r.texture ?? 0);
			});
		} finally {
			S(c);
		}
	},
	releaseAll() {
		try {
			t([...b.keys()], (e) => H.release(e));
		} finally {
			b.clear();
			w.clear();
		}
	},
	/**
	* Creates a material from asset data. When @p parentHandle is given (the asset's
	* `instanceOf` resolved to a loaded parent), builds a Material Instance carrying only the
	* asset's overrides — `properties` and any present render-state fields. Otherwise builds a
	* base material on @p shaderHandle.
	*/
	createFromAsset(e, t, n) {
		const r = V(e.properties);
		if (n !== void 0 && n !== 0) {
			const t = this.createInstance(n);
			for (const [e, n] of Object.entries(r)) this.setUniform(t, e, n);
			if (e.blendMode !== void 0) this.setBlendMode(t, e.blendMode);
			if (e.depthTest !== void 0) this.setDepthTest(t, e.depthTest);
			if (e.depthWrite !== void 0) this.setDepthWrite(t, e.depthWrite);
			if (e.cull !== void 0) this.setCull(t, e.cull);
			if (e.depthBias !== void 0) this.setDepthBias(t, e.depthBias);
			return t;
		}
		return this.create({
			shader: t,
			uniforms: r,
			blendMode: e.blendMode ?? 0,
			depthTest: e.depthTest ?? false,
			depthWrite: e.depthWrite ?? true,
			cull: e.cull ?? 0,
			depthBias: e.depthBias ?? 0,
			switches: e.switches
		});
	},
	/**
	* Creates a material instance (UE MaterialInstanceConstant): it inherits @p source's
	* shader, render state and parameters, and stores only the diffs you later set on it.
	* Editing the parent propagates to every non-overriding instance. Use this for cheap
	* variants ("the same material, but red") instead of duplicating the whole material.
	* @param source Parent material (a base material or another instance)
	* @returns New instance handle
	*/
	createInstance(e) {
		const t = b.get(e);
		if (!t) throw new Error(`Invalid source material: ${e}`);
		const n = y++;
		const r = {
			shader: t.shader,
			uniforms: /* @__PURE__ */ new Map(),
			blendMode: t.blendMode,
			depthTest: t.depthTest,
			depthWrite: t.depthWrite,
			cull: t.cull,
			depthBias: t.depthBias,
			switches: {},
			parent: e,
			overrides: /* @__PURE__ */ new Set(),
			dirty_: true,
			cachedBuffer_: null,
			cachedIdx_: 0
		};
		b.set(n, r);
		N(e, n);
		B(n);
		return n;
	},
	/**
	* Exports material to serializable asset data.
	* @param material Material handle
	* @param shaderPath Shader file path for asset reference
	* @returns Material asset data
	*/
	toAssetData(e, t, n) {
		const r = b.get(e);
		if (!r) return null;
		const i = r.parent !== void 0 && n !== void 0;
		const a = {};
		const o = i ? r.uniforms : z(e)?.uniforms ?? r.uniforms;
		for (const [e, t] of o) a[e] = t;
		if (i) {
			const e = {
				version: "1.0",
				type: "material",
				shader: t,
				instanceOf: n,
				properties: a
			};
			if (r.overrides.has("blendMode")) e.blendMode = r.blendMode;
			if (r.overrides.has("depthTest")) e.depthTest = r.depthTest;
			if (r.overrides.has("depthWrite")) e.depthWrite = r.depthWrite;
			if (r.overrides.has("cull")) e.cull = r.cull;
			if (r.overrides.has("depthBias")) e.depthBias = r.depthBias;
			return e;
		}
		const s = {
			version: "1.0",
			type: "material",
			shader: t,
			blendMode: r.blendMode,
			depthTest: r.depthTest,
			depthWrite: r.depthWrite,
			cull: r.cull,
			depthBias: r.depthBias,
			properties: a
		};
		if (Object.keys(r.switches).length > 0) s.switches = { ...r.switches };
		return s;
	},
	/**
	* Gets all uniforms from a material.
	* @param material Material handle
	* @returns Map of uniform names to values
	*/
	getUniforms(e) {
		return z(e)?.uniforms ?? /* @__PURE__ */ new Map();
	},
	tex(e, t) {
		return {
			__textureRef: true,
			textureId: e,
			slot: t
		};
	}
};
/**
* Built-in ES 3.0 shader sources for SDK custom materials.
* These use the batch renderer vertex layout (vec3 position + vec4 color + vec2 texCoord)
* and are NOT duplicates of the .esshader files (which are ES 1.0 with different layouts).
*/
const U = {
	SPRITE_VERTEX: `#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec4 a_color;
layout(location = 2) in vec2 a_texCoord;

uniform mat4 u_projection;
uniform mat4 u_model;

out vec4 v_color;
out vec2 v_texCoord;

void main() {
    v_color = a_color;
    v_texCoord = a_texCoord;
    gl_Position = u_projection * u_model * vec4(a_position, 1.0);
}
`,
	SPRITE_FRAGMENT: `#version 300 es
precision highp float;

in vec4 v_color;
in vec2 v_texCoord;

uniform sampler2D u_texture;

out vec4 fragColor;

void main() {
    fragColor = texture(u_texture, v_texCoord) * v_color;
}
`,
	COLOR_VERTEX: `#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec4 a_color;

uniform mat4 u_projection;
uniform mat4 u_model;

out vec4 v_color;

void main() {
    v_color = a_color;
    gl_Position = u_projection * u_model * vec4(a_position, 1.0);
}
`,
	COLOR_FRAGMENT: `#version 300 es
precision highp float;

in vec4 v_color;

out vec4 fragColor;

void main() {
    fragColor = v_color;
}
`
};
//#endregion
export { p as a, k as c, U as i, d as l, h as n, O as o, H as r, f as s, m as t, o as u };

//# sourceMappingURL=material.js.map