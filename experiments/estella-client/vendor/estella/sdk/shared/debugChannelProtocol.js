import { $ as e, $t as t, Ct as n, Et as r, F as i, Ft as a, I as o, L as s, Ln as c, Nt as l, Q as u, Qt as d, R as f, Sn as p, Z as m, Zn as h, ar as g, c as _, cr as v, d as y, dn as b, dt as x, hn as S, kn as ee, m as te, mn as C, mt as w, n as T, on as ne, pt as re, q as ie, qt as E, r as ae, rn as D, sr as oe, t as se, u as ce, v as le, wt as ue, xn as de, y as fe } from "./system.js";
import { a as pe, c as me, d as he, f as ge, i as O, l as _e, n as ve, o as ye, r as be, s as k, t as xe, u as Se } from "./resource.js";
import { l as Ce, s as A } from "./logger.js";
import { At as we, Dt as Te, Ht as Ee, Mt as De, Nt as Oe, Tt as ke, Ut as Ae, bt as je, dt as Me, i as Ne, m as Pe, n as j, r as Fe, yt as M } from "./AssetPlugin.js";
import { E as Ie, I as Le, M as Re, N as ze, P as Be, i as Ve, n as He, r as Ue, x as We } from "./base.js";
import { n as Ge } from "./context.js";
import { t as Ke } from "./disposeAll.js";
import { n as qe } from "./wasmScratch.js";
import { a as Je, c as Ye, f as Xe, i as Ze, l as Qe, m as $e, n as et, u as tt } from "./resourceManager.js";
import { d as nt, s as N } from "./env.js";
import { t as rt } from "./quat.js";
import { n as it } from "./migrate.js";
import { F as at, K as ot, P as st, f as ct, n as lt, nt as ut, o as dt, tt as ft, u as pt } from "./scene.js";
import { c as mt, o as ht, u as gt } from "./material.js";
import { t as _t } from "./CoreApiBridge.js";
import { c as vt, d as yt, f as bt, i as xt, l as St, m as Ct, n as wt, p as Tt, r as Et, s as Dt, t as Ot, u as kt } from "./customDraw.js";
import { t as At } from "./Physics2DRuntime.js";
import { c as jt, r as P, s as Mt } from "./input.js";
import { h as Nt } from "./defaults.js";
import { n as F, r as Pt } from "./meshFormat.js";
import { t as Ft } from "./effects.js";
import { i as It, n as Lt, r as Rt } from "./CameraDirector.js";
import { A as zt, E as Bt, F as Vt, M as Ht, N as Ut, O as Wt, P as Gt, a as Kt, d as qt, f as Jt, i as Yt, j as Xt, k as Zt, o as I, p as Qt, v as $t } from "./components.js";
import { n as en, r as tn, t as nn } from "./renderOrigin.js";
import { n as rn, o as an, t as on } from "./qualityRuntime.js";
import { i as sn, r as cn } from "./sceneOrigins.js";
import { t as ln } from "./AiContext.js";
import { n as un, t as dn } from "./speculation.js";
//#region src/prefab.ts
async function fn(e, t, n) {
	const r = it(t).data;
	const i = /* @__PURE__ */ new Map();
	if (n?.assets) {
		const e = n.assets;
		await st(r, async (t) => {
			const n = await e.acquireTyped("prefab", t);
			try {
				return it(n.value.data).data;
			} finally {
				n.release();
			}
		}, i);
	}
	let a = 0;
	const o = [];
	const s = {
		allocateId: () => a++,
		loadPrefab: (e) => i.get(e) ?? null,
		visited: /* @__PURE__ */ new Set(),
		...n?.expandDeferred ?? ft() ? {} : { deferred: o }
	};
	const { entities: c, rootId: l } = at(r, n?.overrides ?? [], s);
	const u = {
		version: 4,
		name: r.name,
		entities: c.map((e) => ({
			id: e.id,
			name: e.name,
			parent: e.parent,
			children: e.children,
			components: e.components,
			visible: e.visible
		}))
	};
	const d = await pt(e, u, {
		assets: n?.assets,
		assetBaseUrl: n?.assetBaseUrl
	});
	ut(e, o, d);
	const f = d.get(l);
	if (n?.parent !== void 0 && !e.trySetParent(f, n.parent)) {
		for (const t of d.values()) if (e.valid(t)) e.despawn(t);
		throw new Error(`Prefab "${r.name}" could not attach to parent ${n.parent}`);
	}
	return {
		root: f,
		entities: d
	};
}
//#endregion
//#region src/runtime/debugChannelHook.ts
let pn = null;
/** @internal Installed by `esengine/debug-channel`. */
function mn(e) {
	pn = e;
}
/** Open this build's line to the editor, from a host as soon as it has read its
*  config: what it prints while the engine boots is then heard too. */
function hn(e) {
	if (!pn) {
		A.warn("debug", "this build names an editor to connect to but was packaged without esengine/debug-channel");
		return;
	}
	pn.start(e);
}
/** @internal Give the channel the running game, once there is one. */
function gn(e) {
	pn?.attach(e);
}
//#endregion
//#region src/postprocess/PostProcessStack.ts
/**
* Owns one App's post-process stacks, camera bindings, screen stack, and id
* counter. A stack registers into the state it is created with — no global.
* Held by {@link PostProcessAPI} (a per-App resource in B2b-3b).
*/
var _n = class {
	constructor() {
		this.nextStackId = 1;
		this.stacks = /* @__PURE__ */ new Map();
		this.cameraBindings = /* @__PURE__ */ new Map();
		this.screenStack = null;
	}
	/** Create a stack owned by (and registered in) this state. */
	createStack() {
		return new vn(this);
	}
	reset() {
		for (const e of [...this.stacks.values()]) e.destroy();
		this.stacks.clear();
		this.cameraBindings.clear();
		this.screenStack = null;
		this.nextStackId = 1;
	}
};
var vn = class {
	constructor(e) {
		this.passes_ = [];
		this.destroyed_ = false;
		this.dirty_ = true;
		this.displayLut_ = {
			texture: 0,
			amount: 0
		};
		this.state_ = e;
		this.id = e.nextStackId++;
		e.stacks.set(this.id, this);
	}
	addPass(e, t, n = 1, r = false) {
		this.passes_.push({
			name: e,
			shader: t,
			enabled: true,
			floatUniforms: /* @__PURE__ */ new Map(),
			vec4Uniforms: /* @__PURE__ */ new Map(),
			textureUniforms: /* @__PURE__ */ new Map(),
			scale: n,
			continuesEffect: r
		});
		this.dirty_ = true;
		return this;
	}
	/** Adds a compute pass (see {@link ComputePassSource}). A device with no compute leaves it out of the chain. */
	addComputePass(e, t) {
		this.passes_.push({
			name: e,
			shader: 0,
			enabled: true,
			floatUniforms: /* @__PURE__ */ new Map(),
			vec4Uniforms: /* @__PURE__ */ new Map(),
			textureUniforms: /* @__PURE__ */ new Map(),
			scale: 1,
			continuesEffect: false,
			compute: t
		});
		this.dirty_ = true;
		return this;
	}
	/** Adds a pass the engine implements itself, by kind. A device with no compute stage leaves it out of the chain. */
	addNativePass(e, t) {
		this.passes_.push({
			name: e,
			shader: 0,
			enabled: true,
			floatUniforms: /* @__PURE__ */ new Map(),
			vec4Uniforms: /* @__PURE__ */ new Map(),
			textureUniforms: /* @__PURE__ */ new Map(),
			scale: 1,
			continuesEffect: false,
			native: t
		});
		this.dirty_ = true;
		return this;
	}
	removePass(e) {
		const t = this.passes_.findIndex((t) => t.name === e);
		if (t !== -1) {
			this.passes_.splice(t, 1);
			this.dirty_ = true;
		}
		return this;
	}
	clearPasses() {
		if (this.passes_.length > 0) {
			this.passes_.length = 0;
			this.dirty_ = true;
		}
		this.setDisplayLut(0, 0);
		return this;
	}
	/**
	* A graded look for the last pass: `texture` is a 1024x32 table (a 32-slice strip, slice along x being blue) read by the picture as the
	* display shows it, after the output transform, and `amount` how far the picture moves toward its answer (0 to 1). Part of the stack, as
	* its passes are: 0 for no table clears it.
	*/
	setDisplayLut(e, t) {
		const n = e !== 0 && t > 0 ? {
			texture: e,
			amount: Math.min(t, 1)
		} : {
			texture: 0,
			amount: 0
		};
		if (n.texture !== this.displayLut_.texture || n.amount !== this.displayLut_.amount) {
			this.displayLut_ = n;
			this.dirty_ = true;
		}
		return this;
	}
	get displayLut() {
		return this.displayLut_;
	}
	setEnabled(e, t) {
		const n = this.passes_.find((t) => t.name === e);
		if (n && n.enabled !== t) {
			n.enabled = t;
			this.dirty_ = true;
		}
		return this;
	}
	setUniform(e, t, n) {
		const r = this.passes_.find((t) => t.name === e);
		if (r) {
			if (r.floatUniforms.get(t) !== n) {
				r.floatUniforms.set(t, n);
				this.dirty_ = true;
			}
		}
		return this;
	}
	/** Binds a texture (SDK texture handle) to a pass's sampler uniform. */
	setTexture(e, t, n) {
		const r = this.passes_.find((t) => t.name === e);
		if (r) {
			if (r.textureUniforms.get(t) !== n) {
				r.textureUniforms.set(t, n);
				this.dirty_ = true;
			}
		}
		return this;
	}
	setUniformVec4(e, t, n) {
		const r = this.passes_.find((t) => t.name === e);
		if (r) {
			const e = r.vec4Uniforms.get(t);
			if (!e || e.x !== n.x || e.y !== n.y || e.z !== n.z || e.w !== n.w) {
				r.vec4Uniforms.set(t, { ...n });
				this.dirty_ = true;
			}
		}
		return this;
	}
	setAllPassesEnabled(e) {
		for (const t of this.passes_) if (t.enabled !== e) {
			t.enabled = e;
			this.dirty_ = true;
		}
	}
	get passCount() {
		return this.passes_.length;
	}
	get enabledPassCount() {
		let e = 0;
		for (const t of this.passes_) if (t.enabled) e++;
		return e;
	}
	get passes() {
		return this.passes_;
	}
	get isDirty() {
		return this.dirty_;
	}
	clearDirty() {
		this.dirty_ = false;
	}
	get isDestroyed() {
		return this.destroyed_;
	}
	destroy() {
		if (this.destroyed_) return;
		this.destroyed_ = true;
		for (const [e, t] of this.state_.cameraBindings) if (t === this) this.state_.cameraBindings.delete(e);
		this.state_.stacks.delete(this.id);
	}
};
//#endregion
//#region src/postprocess/qualityFilter.ts
/**
* Whether a quality level lets a pass of the chain run.
*
* A level names the effects it leaves out by TYPE; a pass is named by the effect's definition (its type, or the
* names of its sub-passes), so this asks the registry which passes an effect is rather than guessing from the
* name — a guess that reads `autoExposure` as a prefix finds none of `ae_measure`, `ae_adapt`, `ae_apply`.
* An entry no effect answers to is kept as a prefix of the pass name, which is what the list meant before
* effects were named by type.
*/
function yn(e, t) {
	if (e === null) return true;
	if (!e.postProcess) return false;
	const n = t.toLowerCase();
	if (e.antialiasing === "temporal") {
		if (Ft("taa").some((e) => e.toLowerCase() === n)) return true;
		if (Ft("fxaa").some((e) => e.toLowerCase() === n)) return false;
	}
	if (!e.ssao && ["ssao", "gtao"].some((e) => Ft(e).some((e) => e.toLowerCase() === n))) return false;
	for (const t of e.skipEffects) {
		const e = Ft(t);
		if (e.length > 0) {
			if (e.some((e) => e.toLowerCase() === n)) return false;
		} else if (n.startsWith(t.toLowerCase())) return false;
	}
	return true;
}
//#endregion
//#region src/postprocess/PostProcessAPI.ts
/** Guarded view of the core: after a wasm abort a call throws instead of reaching
*  a dead module; a native host's bindings never abort. */
var bn = class extends $e {
	constructor(...e) {
		super(...e);
		this.label = "postprocess";
	}
};
const xn = new bn();
let L = null;
/** Four floats the committed format decision is read back through. */
let R = 0;
/**
* @internal Wired by the engine plugins — not part of the public API.
* Takes whichever core is present (see ecs/engineApi.ts). A core built without
* ES_ENABLE_POSTPROCESS answers none of these entry points; the plugin checks that
* before calling, which is what makes the narrowing here sound.
*/
/** Whether the last App shut the pipeline down under a renderer that may have outlived it. */
let Sn = false;
function Cn(e) {
	xn.connect(e);
	L = xn.module;
	const t = e;
	if (!R && typeof t._malloc === "function") R = t._malloc(16);
	const n = L;
	if (Sn && wn(n) && !n.postprocess_isInitialized()) n.postprocess_init(1, 1);
	Sn = false;
}
/** A core built without ES_ENABLE_POSTPROCESS (the lite mini-game engine) has none of these entry points: no chain, nothing to ask. */
function wn(e) {
	return typeof e.postprocess_isInitialized === "function";
}
/** @internal Wired by the engine plugins — not part of the public API. */
function Tn() {
	if (L) try {
		if (wn(L) && L.postprocess_isInitialized()) {
			L.postprocess_shutdown();
			Sn = true;
		}
	} catch (e) {
		m(e, "PostProcess.shutdown");
	}
	if (R && L) {
		L._free?.(R);
		R = 0;
	}
	xn.disconnect();
	L = null;
}
/**
* Whether the device the chain runs on has a compute stage (WebGPU). False before the chain is up, and on WebGL2.
* An effect that has a compute version and a fragment one asks which to build.
*/
function En() {
	try {
		return z().postprocess_supportsCompute?.() === true;
	} catch {
		return false;
	}
}
function z() {
	if (!L) throw new Error("PostProcess API not initialized. Call initPostProcessAPI() first.");
	return L;
}
/**
* Push a stack's enabled passes to the engine. `force` re-pushes a stack that has
* not been edited — needed because the engine's pass list is torn down after every
* camera (see {@link PostProcessAPI._resetAfterCamera}), so "not dirty" says the
* stack is unchanged, NOT that the engine still holds it.
*/
function Dn(e, t = false, n = () => true) {
	if (!t && !e.isDirty) return;
	const r = z();
	try {
		r.postprocess_clearPasses();
	} catch (e) {
		m(e, "PostProcess._applyForCamera:clearPasses");
		return;
	}
	for (const t of e.passes) {
		if (!t.enabled || !n(t.name)) continue;
		try {
			if (t.native) {
				if (!r.postprocess_addNativePass) continue;
				r.postprocess_addNativePass(t.name, t.native);
			} else if (t.compute) {
				if (!r.postprocess_addComputePass) continue;
				r.postprocess_addComputePass(t.name, t.compute.source, t.compute.params.join(","), t.compute.workgroupSize[0], t.compute.workgroupSize[1]);
			} else r.postprocess_addPass(t.name, t.shader);
			if (t.scale !== 1) r.postprocess_setPassScale(t.name, t.scale);
			if (t.continuesEffect) r.postprocess_setPassContinuesEffect(t.name);
		} catch (e) {
			m(e, `PostProcess._applyForCamera:addPass("${t.name}")`);
			continue;
		}
		for (const [e, n] of t.floatUniforms) try {
			r.postprocess_setUniformFloat(t.name, e, n);
		} catch (n) {
			m(n, `PostProcess._applyForCamera:setUniform("${t.name}", "${e}")`);
		}
		for (const [e, n] of t.vec4Uniforms) try {
			r.postprocess_setUniformVec4(t.name, e, n.x, n.y, n.z, n.w);
		} catch (n) {
			m(n, `PostProcess._applyForCamera:setUniformVec4("${t.name}", "${e}")`);
		}
		for (const [e, n] of t.textureUniforms) try {
			r.postprocess_setPassTexture(t.name, e, n);
		} catch (n) {
			m(n, `PostProcess._applyForCamera:setPassTexture("${t.name}", "${e}")`);
		}
	}
	if (e.displayLut.amount > 0) try {
		r.postprocess_setDisplayLut?.(e.displayLut.texture, e.displayLut.amount);
	} catch (e) {
		m(e, "PostProcess._applyForCamera:setDisplayLut");
	}
	e.clearDirty();
}
/**
* The curve's number at the wasm boundary. Here and not at each call: the
* translation was written twice, and a third curve would have reached one of
* them and been silently read as `none` by the other.
*/
function On(e) {
	return e === "aces" ? 1 : e === "neutral" ? 2 : 0;
}
var kn = class {
	constructor() {
		this.state = new _n();
		this.volumeStacks = /* @__PURE__ */ new Map();
		this.volumeShaders = /* @__PURE__ */ new Map();
		this.engineStack_ = null;
		this.qualityFilter_ = null;
		this.allowQualityPass_ = (e) => {
			return yn(this.qualityFilter_, e);
		};
	}
	setQualityFilter(e) {
		if (this.qualityFilter_ === e) return;
		this.qualityFilter_ = e;
		this.engineStack_ = null;
	}
	/** How the quality level in force smooths edges: the volume system adds the temporal pass where it says `temporal`. */
	get antialiasing() {
		return this.qualityFilter_?.antialiasing ?? "msaa";
	}
	/** Whether the quality level in force has the dynamic GI run its cheaper way: the volume system sets the effect's switches from it. */
	get dynamicGIReduced() {
		return this.qualityFilter_?.dynamicGIReduced ?? false;
	}
	/**
	* Whether the quality level in force runs an effect, by its type. For a system that prepares something for an effect off the GPU (the dynamic GI
	* builds a distance field, a second of a phone's CPU): it asks before it does.
	*/
	effectAllowed(e) {
		const t = Ft(e);
		return (t.length > 0 ? t : [e]).every((e) => yn(this.qualityFilter_, e));
	}
	get screenStack() {
		return this.state.screenStack;
	}
	setScreenStack(e) {
		this.state.screenStack = e;
	}
	createStack() {
		return this.state.createStack();
	}
	bind(e, t) {
		if (t.isDestroyed) throw new Error("Cannot bind a destroyed PostProcessStack");
		this.state.cameraBindings.set(e, t);
	}
	unbind(e) {
		this.state.cameraBindings.delete(e);
	}
	getStack(e) {
		return this.state.cameraBindings.get(e) ?? null;
	}
	init(e, t) {
		try {
			return z().postprocess_init(e, t);
		} catch (n) {
			m(n, `PostProcess.init(${e}x${t})`);
			return false;
		}
	}
	shutdown() {
		try {
			z().postprocess_shutdown();
		} catch (e) {
			m(e, "PostProcess.shutdown");
		}
	}
	resize(e, t) {
		try {
			z().postprocess_resize(e, t);
		} catch (n) {
			m(n, `PostProcess.resize(${e}x${t})`);
		}
	}
	isInitialized() {
		if (!L || !wn(L)) return false;
		try {
			return L.postprocess_isInitialized();
		} catch (e) {
			m(e, "PostProcess.isInitialized");
			return false;
		}
	}
	setBypass(e) {
		try {
			z().postprocess_setBypass(e);
		} catch (e) {
			m(e, "PostProcess.setBypass");
		}
	}
	/**
	* The curve the frame applies on its way to the display.
	*
	* Applied to whatever the chain produced, so it also engages the capture: a
	* project that asks for a curve gets one with an empty stack. See
	* {@link OutputTransform} for which to want.
	*/
	setOutputTransform(e) {
		try {
			z().postprocess_setOutputTransform(On(e));
		} catch (e) {
			m(e, "PostProcess.setOutputTransform");
		}
	}
	/**
	* Multisampling the scene target should rasterise with; 1 turns it off. The
	* device clamps it, so this is the project's ASK, not what it gets — a
	* backend with no MSAA answers 1 whatever is set here.
	*/
	setMsaaSamples(e) {
		try {
			z().postprocess_setMsaaSamples(e >>> 0);
		} catch (e) {
			m(e, "PostProcess.setMsaaSamples");
		}
	}
	/**
	* What the scene target is ACTUALLY multisampled at, and the most this
	* device can do. @experimental
	*
	* Two numbers because a request and a capability are different facts: asking
	* for 8 where the backend allows 1 is not a typo, and only saying both tells
	* those apart. `0` means nothing here can answer.
	*/
	msaaCapability() {
		try {
			const e = z();
			return {
				effective: e.postprocess_effectiveMsaaSamples?.() ?? 0,
				max: e.postprocess_maxMsaaSamples?.() ?? 0
			};
		} catch (e) {
			m(e, "PostProcess.msaaCapability");
			return {
				effective: 0,
				max: 0
			};
		}
	}
	/**
	* The format decision the last frame COMMITTED to. @experimental
	*
	* The frame's own answer, not the device asked again. `linear` false is a
	* project that never asked for HDR, which is not a fallback. The names come
	* from the engine — a second spelling of the enum's order is drift.
	*/
	hdrFormat() {
		try {
			const e = z();
			if (!e.postprocess_hdrFormat || !e.postprocess_hdrFormatNames || !R) return null;
			if (!e.postprocess_hdrFormat(R)) return null;
			const t = xn.module.HEAPF32;
			if (!t) return null;
			const n = t.subarray(R >> 2, (R >> 2) + 4);
			const [r, i, a] = e.postprocess_hdrFormatNames().split("|");
			return {
				requested: r ?? "",
				effective: i ?? "",
				reason: a ?? "none",
				linear: n[3] === 1,
				fellBack: (r ?? "") !== (i ?? "")
			};
		} catch (e) {
			m(e, "PostProcess.hdrFormat");
			return null;
		}
	}
	begin() {
		try {
			z().postprocess_begin();
		} catch (e) {
			m(e, "PostProcess.begin");
		}
	}
	end() {
		try {
			z().postprocess_end();
		} catch (e) {
			m(e, "PostProcess.end");
		}
	}
	/** Say the frame needs a present when the rects alone cannot: a 1x letterbox
	*  and a split-screen viewport are the same geometry and differ only in intent. */
	setPresentRequired(e) {
		try {
			z().postprocess_setPresentRequired?.(e);
		} catch (e) {
			m(e, "PostProcess.setPresentRequired");
		}
	}
	setOutputViewport(e, t, n, r) {
		try {
			z().postprocess_setOutputViewport(e, t, n, r);
		} catch (e) {
			m(e, "PostProcess.setOutputViewport");
		}
	}
	_applyForCamera(e) {
		const t = this.state.cameraBindings.get(e);
		if (!t || t.isDestroyed || t.enabledPassCount === 0) {
			this.setBypass(true);
			return;
		}
		if (!this.isInitialized()) this.init(1, 1);
		this.setBypass(false);
		Dn(t, this.engineStack_ !== t, this.allowQualityPass_);
		this.engineStack_ = t;
	}
	_resetAfterCamera() {
		try {
			z().postprocess_clearPasses();
			z().postprocess_setBypass(true);
			this.engineStack_ = null;
		} catch (e) {
			m(e, "PostProcess._resetAfterCamera");
		}
	}
	_beginScreenCapture() {
		try {
			z().postprocess_beginScreenCapture();
		} catch (e) {
			m(e, "PostProcess._beginScreenCapture");
		}
	}
	_endScreenCapture() {
		try {
			z().postprocess_endScreenCapture();
		} catch (e) {
			m(e, "PostProcess._endScreenCapture");
		}
	}
	_applyScreenStack() {
		const e = this.state.screenStack;
		if (!e || e.isDestroyed || e.enabledPassCount === 0) return;
		const t = z();
		try {
			t.postprocess_clearScreenPasses();
		} catch (e) {
			m(e, "PostProcess._applyScreenStack:clearScreenPasses");
			return;
		}
		for (const n of e.passes) {
			if (!n.enabled || !this.allowQualityPass_(n.name)) continue;
			try {
				t.postprocess_addScreenPass(n.name, n.shader);
			} catch (e) {
				m(e, `PostProcess._applyScreenStack:addScreenPass("${n.name}")`);
				continue;
			}
			for (const [e, r] of n.floatUniforms) try {
				t.postprocess_setScreenUniformFloat(n.name, e, r);
			} catch (t) {
				m(t, `PostProcess._applyScreenStack:setScreenUniform("${n.name}", "${e}")`);
			}
			for (const [e, r] of n.vec4Uniforms) try {
				t.postprocess_setScreenUniformVec4(n.name, e, r.x, r.y, r.z, r.w);
			} catch (t) {
				m(t, `PostProcess._applyScreenStack:setScreenUniformVec4("${n.name}", "${e}")`);
			}
		}
	}
	_executeScreenPasses() {
		try {
			z().postprocess_executeScreenPasses();
		} catch (e) {
			m(e, "PostProcess._executeScreenPasses");
		}
	}
};
/**
* Per-App post-process resource. Published + injected into the render pipeline
* by `PostProcessPlugin`; read as `app.getResource(PostProcess)`.
*/
const B = k(null, "PostProcess");
//#endregion
//#region src/camera/presentPlan.ts
/**
* A viewport fraction in pixels of the surface it is measured against, y-DOWN.
*
* The flip and the rounding drift, so they live here. WHICH surface stays the
* caller's: input measures the window (a pointer is there), drawing measures the
* render target (pixels go there).
*/
function An(e, t, n) {
	return {
		x: Math.round(e.x * t),
		y: Math.round((1 - e.y - e.h) * n),
		w: Math.round(e.w * t),
		h: Math.round(e.h * n)
	};
}
function jn(e) {
	return Math.max(1, Math.round(e));
}
/**
* Plan a frame's render target and its present rect.
*
* @param worldHeight World units the camera shows vertically — `2 *` the
*   effective ortho size, AFTER the scale mode adapted it to the aspect.
* @param surfaceWidth Destination width in px: the camera's viewport, which is
*   the window for a full-screen camera and a slice of it for split-screen.
*/
function Mn(e, t, n, r) {
	const i = jn(n);
	const a = jn(r);
	if (e === 0 || !(t > 0)) return {
		renderWidth: i,
		renderHeight: a,
		x: 0,
		y: 0,
		width: i,
		height: a,
		oneToOne: true
	};
	const o = jn(t);
	const s = jn(o * (i / a));
	if (e === 2) {
		const e = Math.floor(Math.min(i / s, a / o));
		if (e >= 1) {
			const t = s * e;
			const n = o * e;
			return {
				renderWidth: s,
				renderHeight: o,
				x: Math.floor((i - t) / 2),
				y: Math.floor((a - n) / 2),
				width: t,
				height: n,
				oneToOne: e === 1 && t === i && n === a
			};
		}
	}
	return {
		renderWidth: s,
		renderHeight: o,
		x: 0,
		y: 0,
		width: i,
		height: a,
		oneToOne: s === i && o === a
	};
}
//#endregion
//#region src/camera/ScreenScaling.ts
/**
* @file    ScreenScaling.ts
* @brief   Project-level screen fit — the design (reference) resolution the game
*          scales against, independent of any UI Canvas.
*
* The design resolution used to live only on the `Canvas` (UI) component, so a
* scene without UI got no design-resolution fit (the camera kept its raw
* orthoSize). This resource makes the fit a project/screen concern: when
* `scaleMode` is a real {@link CanvasScaleMode} (0..4) the camera letterboxes the
* design resolution into the actual aspect exactly as a Canvas would — no UI layer
* required. `scaleMode = SCREEN_FIT_OFF` (the default) keeps the Canvas fit when
* present, else the raw orthoSize, so an unconfigured project is unchanged.
*
* When it opts in it is the project's ONE design resolution: the camera fit and the
* UI layout box both resolve through CameraPlugin.resolveFitSource, so a scene whose
* Canvas still carries an older design resolution cannot lay UI out one way while
* authoring and another once it ships.
*
* Installed by every runtime; the shipped game / play realm / editor set it from
* the project config (design resolution + fit). Read by CameraPlugin.resolveCameras.
*/
/** `scaleMode` sentinel: no camera fit — the camera uses its own orthoSize (default). */
const Nn = -1;
/** Off by default (scaleMode = -1) ⇒ zero behavior change for a project that never
*  opts into a camera fit. Dimensions default to the engine's Canvas default. */
const Pn = {
	designWidth: 1920,
	designHeight: 1080,
	scaleMode: -1,
	matchWidthOrHeight: .5,
	renderPolicy: 0
};
const V = k({ ...Pn }, "ScreenScaling");
//#endregion
//#region src/app/renderOptions.ts
/**
* @file    renderOptions.ts
* @brief   What a project declares about its frame, handed to whichever core runs it.
*
* One function per moment and one caller per core, so the web and native apps cannot drift. They did: the native road read only
* packagedRuntimeInit, so every field of packagedAppOptions was dropped on a device with no error. A linear project showed its
* linear values unencoded, far too dark, and its output transform, MSAA, quality and layer sorting never arrived either.
*/
/**
* Before any shader compiles: they compile against it. Always applied, not only when set, since the renderer outlives an App across a
* realm reload and a fresh App must reset a prior session's mode.
*/
function Fn(e, t) {
	nt(t?.colorSpace === "linear");
	e.renderer_setColorSpace?.(t?.colorSpace === "linear" ? 1 : 0);
}
/**
* Once the renderer exists: the post-process pipeline is created by it, and a curve declared before it exists reaches nothing. Always
* applied, for the same reason as the colour space.
*/
function In(e, t) {
	e.renderer_setYSortLayers?.((t?.ySortLayers ?? 0) >>> 0);
	e.renderer_setDepthLayers?.((t?.depthLayers ?? 0) >>> 0);
	e.postprocess_setOutputTransform?.(On(t?.outputTransform));
	e.postprocess_setMsaaSamples?.((t?.msaaSamples ?? 4) >>> 0);
}
/** Once the App's plugins are in: what the options install as resources on it. */
function Ln(e, t) {
	if (t?.screenFit && (t.screenFit.scaleMode > -1 || (t.screenFit.renderPolicy ?? 0) !== 0)) e.insertResource(V, { ...t.screenFit });
	const n = t?.quality?.mode ?? an(He().isHandheld?.() ?? false);
	if (t?.quality || n !== "off") rn(e, {
		...t?.quality,
		mode: n
	}, t?.msaaSamples ?? 4);
}
//#endregion
//#region src/ecs/WasmPoolMemory.ts
/**
* Rows on the engine's heap. `byteOffset` is a wasm address, which is what makes
* a pool's `span()` directly usable by compiled code.
*/
var Rn = class {
	constructor(e) {
		this.heap = e;
		this.allocatorIdentity = e.allocatorIdentity ?? e;
	}
	alloc(e) {
		const t = e + 7 & -8;
		const n = this.heap._malloc(t);
		if (n === 0) throw new Error(`ScriptPool: the wasm heap refused ${t} bytes`);
		return {
			buffer: this.heap.HEAPU8.buffer,
			byteOffset: n,
			byteLength: t
		};
	}
	release(e) {
		this.heap._free(e.byteOffset);
	}
	/**
	* The block's buffer as it is NOW. After a growth the one handed out at
	* `alloc` is detached and this is a different object holding the same bytes
	* at the same offset.
	*/
	current(e) {
		return this.heap.HEAPU8.buffer;
	}
};
//#endregion
//#region src/math/exact.ts
/**
* @file    exact.ts
* @brief   Trigonometry that answers the same bits everywhere.
*
* @details `Math.sin` is implementation-defined: two engines may both be right
*          and disagree in the last bit. That is fine until a system is
*          COMPILED, because then the interpreted build and the shipped one are
*          two implementations, and a pixel gate goes red on trigonometry
*          rather than on a bug.
*
*          So these are specified rather than delegated: one range reduction,
*          one polynomial, one order of operations — written twice, in this file
*          and in the compiler's runtime header, and held together by a
*          bit-for-bit differential. `exact.sin` is what a system that wants to
*          compile calls; `Math.sin` stays refused, and says so.
*
*          Determinism is the promise, not accuracy. The reduction is two-step
*          Cody-Waite, so a very large argument loses digits — identically on
*          both sides, which is the property that matters here.
*/
/** π/2 in two pieces, so `x - n·π/2` keeps the bits a single constant loses. */
const zn = 1.5707963267341256;
const Bn = 6077100506506192e-26;
/** 2/π, as one number both sides read from the same digits. */
const Vn = .6366197723675814;
/** Minimax coefficients for sin on [-π/4, π/4] (fdlibm's kernel). */
const Hn = -.16666666666666632;
const Un = .008333333333324894;
const Wn = -.0001984126982985795;
const Gn = 2755731370707007e-21;
const Kn = -2.505076025340686e-8;
const qn = 158969099521155e-24;
/** The same, for cos. */
const Jn = .0416666666666666;
const Yn = -.001388888888887411;
const Xn = 2480158728947673e-20;
const Zn = -2.7557314351390663e-7;
const Qn = 2.087572321298175e-9;
const $n = -11359647557788195e-27;
/**
* Every constant the algorithm IS, under the name both sides call it. The
* compiler writes the C half's coefficients from here: what is implemented
* twice is the STRUCTURE, which a differential compares. Retyping a 17-digit
* decimal is not a second implementation — it is a copy that drifts in silence.
*
* @internal
*/
const er = {
	PIO2_HI: zn,
	PIO2_LO: Bn,
	TWO_OVER_PI: Vn,
	S1: Hn,
	S2: Un,
	S3: Wn,
	S4: Gn,
	S5: Kn,
	S6: qn,
	C1: Jn,
	C2: Yn,
	C3: Xn,
	C4: Zn,
	C5: Qn,
	C6: $n
};
/**
* The same, as a list the digest takes exactly — the ORDER is in the hash, so
* reordering the record above is an ABI change and not a tidy-up. Sampling
* answers alone would not do: a 1-ulp `S3` moved none of 250 probed answers
* (measured) while still being arithmetic a long run disagrees on.
*
* @internal
*/
const tr = Object.values(er);
/**
* `Math.round`'s rule — ties toward +Infinity — spelled out, because C's
* `round` breaks ties away from zero and would disagree on every .5.
*/
function nr(e) {
	return Math.floor(e + .5);
}
/** sin on [-π/4, π/4], by Horner in one fixed order. */
function rr(e) {
	const t = e * e;
	const n = Hn + t * (Un + t * (Wn + t * (Gn + t * (Kn + t * qn))));
	return e + e * t * n;
}
/** cos on [-π/4, π/4], likewise. */
function ir(e) {
	const t = e * e;
	const n = Jn + t * (Yn + t * (Xn + t * (Zn + t * (Qn + t * $n))));
	return 1 - .5 * t + t * t * n;
}
/**
* Trigonometry a compiled system may call, answering the same bits as the
* interpreted build. `Math.sin` is refused by the AOT subset and says so.
*
* @beta
*/
const ar = {
	/** Sine, to the same bits in an interpreted build and a compiled one. */
	sin(e) {
		if (!Number.isFinite(e)) return NaN;
		const t = nr(e * Vn);
		const n = e - t * zn - t * Bn;
		const r = (t % 4 + 4) % 4;
		if (r === 0) return rr(n);
		if (r === 1) return ir(n);
		if (r === 2) return -rr(n);
		return -ir(n);
	},
	/** Cosine, to the same bits in an interpreted build and a compiled one. */
	cos(e) {
		if (!Number.isFinite(e)) return NaN;
		const t = nr(e * Vn);
		const n = e - t * zn - t * Bn;
		const r = (t % 4 + 4) % 4;
		if (r === 0) return ir(n);
		if (r === 1) return -rr(n);
		if (r === 2) return -ir(n);
		return rr(n);
	}
};
//#endregion
//#region src/ecs/aot/abiDigest.ts
/**
* @file    abiDigest.ts
* @brief   What a compiled module baked in, as two numbers it can be asked for.
*
* @details A compiled system reads memory at offsets fixed when it was built. It
*          reads the WRONG THING — not an error, a different field — if anything
*          those offsets came from has changed since. So a loader compares.
*
*          Two digests, not one, because the mismatches have different fixes:
*
*          - `engineAbi` is everything about the ENGINE the module baked in:
*            EHT's struct offsets, the resource shapes, the sizes of the four
*            ABI structs, the specified trigonometry and the width of an
*            address. A mismatch means rebuild
*            the module against this engine.
*          - `projectShapes` is the `defineComponent` shapes it compiled
*            against, scoped to the components it actually names. A mismatch
*            means the project's components changed — rebuild the project.
*
*          A system's PARAMETER ORDER is deliberately in neither. It cannot
*          drift: the manifest is what drives the layout at run time, so it is
*          the instruction being followed rather than an input to compare.
*
*          This file is the ONE author, imported by the SDK that checks and by
*          the compiler that writes. It has only leaf imports for that reason —
*          a build tool reads it without pulling in the engine.
*/
/** Sizes of the four ABI structs, in address-wide words. */
const or = 6;
const sr = 2;
/**
* The header a system's event queue starts with: buf, cap, count. Here rather
* than beside either consumer because BOTH the runtime and the differential
* host lay this block out, and the number was written in each of them: a fourth
* field appended by one is three words the other keeps stepping over.
*/
const cr = 3;
/** A command is four u32 at every address width. */
const lr = 4;
const ur = 1;
const dr = 2;
/**
* Where the digest LOOKS: off the quadrant grid so every branch of the
* reduction is reached, then the tie, the boundaries, and arguments large
* enough that Cody-Waite loses digits. Sampling alone does not do — a 1-ulp
* `S3` moved none of these, which is why the constants go in exactly.
*/
function fr() {
	const e = [];
	for (let t = -120; t <= 120; t++) e.push(t * .37);
	const t = Math.PI / 2;
	for (let n = -4; n <= 4; n++) for (const r of [
		-1e-9,
		0,
		1e-9
	]) e.push(n * t + r);
	for (let n = -3; n <= 3; n++) e.push((n + .5) * t);
	e.push(0, -0, 1, -1, 1e-8, 12345.6789, -98765.4321, 1e10, -1e10);
	return e;
}
/** A double as the bits it is, because one ulp apart is one pixel apart. */
function pr(e) {
	const t = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(8));
	t.setFloat64(0, e);
	return t.getBigUint64(0).toString(16).padStart(16, "0");
}
/**
* Two halves because one alone misses: the CONSTANTS exactly, so a coefficient
* change counts whether or not it moves a sampled answer, and the ANSWERS for
* what the constants are not — quadrant choice, the reduction's tie, summation
* order. A parameter so a test can nudge one constant and watch this move.
*
* @internal
*/
function mr(e = tr) {
	return vr(`${e.map(pr).join(",")}|${fr().map((e) => `${pr(ar.sin(e))}/${pr(ar.cos(e))}`).join(",")}`);
}
/**
* Everything about the engine the module baked in. Recomputable by the SDK from
* what it ships, which is what makes this the check that can actually run.
*/
function hr(e) {
	return vr(gr(e).join("\n"));
}
/**
* What the digest is taken OF, so a test can ask whether something is covered.
* A digest can only say two things differ; this says what it was looking at.
*
* @internal
*/
function gr(e) {
	const t = [
		`addr=${e}`,
		`sysctx=${6} rows=${2} cmd=${4} eventout=${3}`,
		`cmdkinds=${1},${2}`,
		`trig=${mr()}`
	];
	for (const [e, n] of Object.entries(ie)) {
		const r = n.fields.map((e) => {
			const t = e.members ? `{${e.members.map((e) => `${e.name}:${e.type}@${e.offset}`).join(",")}}` : "";
			return `${e.name}:${e.type}@${e.offset}${t}`;
		});
		t.push(`comp ${e}=${r.join(",")}`);
	}
	for (const e of me) {
		const n = _e[e];
		const r = (ge(e) ?? []).map((e) => {
			if (e.kind === "scalar") return `${e.name}@${e.offset}`;
			const t = n.bits?.[e.name];
			const r = t?.keys ? t.keys.join("/") : `0..${(t?.count ?? 0) - 1}`;
			return `${e.name}@${e.offset}[${r}]`;
		});
		const i = Object.entries(n.methods ?? {}).map(([e, t]) => `${e}->${t}`);
		t.push(`res ${e}=${r.join(",")}|${i.join(",")}`);
	}
	return t;
}
/**
* The project's own component shapes, scoped to the ones a module names. Scoped
* on purpose: adding an unrelated component to a project must not invalidate a
* module that never reads it.
*/
function _r(e) {
	return vr([...e].sort((e, t) => e.name < t.name ? -1 : e.name > t.name ? 1 : 0).map((e) => `${e.name}=${e.fields.join(",")}`).join("\n"));
}
/** FNV-1a, as `mkbc` and the asset hashes already use; not a new mechanism. */
function vr(e) {
	const t = (1n << 64n) - 1n;
	let n = 14695981039346656037n;
	for (let r = 0; r < e.length; r++) {
		n = (n ^ BigInt(e.charCodeAt(r) & 255)) & t;
		n = n * 1099511628211n & t;
	}
	return n.toString(16).padStart(16, "0");
}
//#endregion
//#region src/ecs/aot/AotContext.ts
/**
* The per-call scratch, in engine memory. One instance per system is enough —
* a call is over before the next begins, and nothing may outlive it.
*/
var yr = class {
	constructor(e, t = 256, n = 512) {
		this.memory = e;
		this.block = null;
		this.disposed = false;
		this.words = br;
		this.lengths_ = [];
		this.countAt_ = 0;
		this.cmdAt_ = 0;
		this.evCountAt_ = 0;
		this.evBufAt_ = 0;
		this.address_ = 0;
		this.cmdCap = t;
		this.eventCap = n;
	}
	/** Hand the block back; the arena is dead after this. */
	dispose() {
		this.disposed = true;
		const e = this.block;
		this.block = null;
		this.words = br;
		if (e) this.memory.release(e);
	}
	/**
	* Lay out one call and answer the ctx address.
	*
	* The rows arrive packed — every query's, back to back, in query order —
	* because the caller wrote them there as it walked. `offsets[k]`/`counts[k]`
	* locate the k-th Query's; `resources[j]` is the j-th Res. One `set` copies
	* the block, where a row at a time was a word at a time (bench/aot-frame).
	*/
	build(e, t, n, r, i) {
		if (this.disposed) throw new Error("AotContext is disposed");
		const a = r.length;
		const o = 6 + a * 2 + t + i.length + 1 + this.cmdCap * 4 + 3 + 1 + this.eventCap * 2;
		this.reserve_(o);
		const s = this.block.byteOffset;
		const c = this.words;
		const l = 6;
		const u = l + a * 2;
		c.set(e.subarray(0, t), u);
		let d = u + t;
		const f = d;
		for (const e of i) c[d++] = e;
		const p = d++;
		c[p] = 0;
		const m = d;
		for (let e = 0; e < a; e++) {
			const t = l + e * 2;
			c[t] = s + (u + n[e]) * 4;
			c[t + 1] = r[e];
		}
		let h = m + this.cmdCap * 4;
		const g = h;
		h += 3;
		const _ = h++;
		c[_] = 0;
		const v = h + 1 & -2;
		c[g] = s + v * 4;
		c[g + 1] = this.eventCap * 2;
		c[g + 2] = s + _ * 4;
		c[0] = s + l * 4;
		c[1] = s + f * 4;
		c[2] = s + m * 4;
		c[3] = this.cmdCap;
		c[4] = s + p * 4;
		c[5] = s + g * 4;
		this.countAt_ = p;
		this.cmdAt_ = m;
		this.evCountAt_ = _;
		this.evBufAt_ = v;
		this.address_ = s;
		return s;
	}
	/** What the call appended. Valid until the next `build`. */
	commands() {
		if (this.block === null) return [];
		const e = this.view_();
		const t = e[this.countAt_];
		const n = [];
		for (let r = 0; r < t; r++) {
			const t = this.cmdAt_ + r * 4;
			n.push({
				kind: e[t],
				a: e[t + 1]
			});
		}
		return n;
	}
	/**
	* What the call SENT: each record is a writer slot then its fields, in the
	* order the manifest declares. Valid until the next `build`.
	*/
	events() {
		if (this.block === null) return [];
		const e = this.view_();
		const t = e[this.evCountAt_];
		const n = new Float64Array(e.buffer, e.byteOffset + this.evBufAt_ * 4, Math.max(0, Math.floor((e.byteLength - this.evBufAt_ * 4) / 8)));
		const r = [];
		for (let e = 0; e < t;) {
			const t = n[e];
			const i = this.lengthOf_(t);
			r.push({
				slot: t,
				fields: [...n.subarray(e + 1, e + i)]
			});
			e += i;
		}
		return r;
	}
	/** How long one writer's record is, set by the caller before the call. */
	setRecordLengths(e) {
		this.lengths_ = e;
	}
	lengthOf_(e) {
		return (this.lengths_[e] ?? 0) + 1;
	}
	/** The ctx `build` last laid out. */
	get address() {
		return this.address_;
	}
	reserve_(e) {
		if (this.block !== null && e * 4 <= this.block.byteLength) {
			this.words = this.view_();
			return;
		}
		const t = Math.max(e * 4 * 2, 1024);
		const n = this.memory.alloc(t);
		const r = this.block;
		this.block = n;
		this.words = this.view_();
		if (r) this.memory.release(r);
	}
	/** The words of this arena, over whatever buffer the heap is in now. */
	view_() {
		const e = this.block;
		const t = this.memory.current?.(e) ?? e.buffer;
		return new Uint32Array(t, e.byteOffset, e.byteLength >> 2);
	}
};
const br = /* @__PURE__ */ new Uint32Array(0);
//#endregion
//#region src/ecs/aot/AotResources.ts
/**
* @file    AotResources.ts
* @brief   A resource's bytes, for code that reaches it by address.
*
* @details A resource is a host record — a JS object with no address — and a
*          compiled system reads one at `base + offset` like anything else. So
*          each resource a twin declares gets a block in the engine's memory and
*          its values are written there before the call.
*
*          That IS a copy, and it is the one copy this design keeps. The reason
*          it is affordable is the shape of it: one small record per resource
*          per system call, not one per component per entity per frame, which is
*          the per-row cost AOT exists to delete.
*
*          The layout is `resourceShapes.ts`, which is also what the compiler
*          reads. Order is the layout, so a second list here would be a second
*          answer — `pool-layout.test.ts` holds the two together.
*/
/**
* Blocks for the resources compiled systems read, refreshed on demand. One per
* world; a resource with no declared shape simply has no address, and a system
* naming it did not compile.
*/
var xr = class {
	constructor(e, t, n = /* @__PURE__ */ new Map()) {
		this.memory = e;
		this.read = t;
		this.declared = n;
		this.blocks = /* @__PURE__ */ new Map();
		this.views = /* @__PURE__ */ new Map();
		this.disposed = false;
	}
	/** `name`'s members, from the engine's table or from what the build said. */
	layoutOf(e) {
		const t = ge(e);
		if (t) return t;
		const n = this.declared.get(e);
		return n ? n.map((e, t) => ({
			kind: "scalar",
			name: e,
			offset: t * 8
		})) : null;
	}
	/** Bytes `name`'s block needs, by whichever layout answers for it. */
	/** How many bytes `name`'s mirror is, for a host that must be given a range. */
	bytesOf(e) {
		const t = this.declared.get(e);
		return t ? t.length * 8 : he(e);
	}
	/**
	* The address of `name`'s bytes, with this frame's values in them, or
	* undefined when the resource has no layout or the world has no value.
	*/
	addressOf(e) {
		if (this.disposed) throw new Error("AotResources is disposed");
		const t = this.layoutOf(e);
		if (!t) return void 0;
		const n = this.read(e);
		if (!n) return void 0;
		let r = this.blocks.get(e);
		if (!r) {
			r = this.memory.alloc(this.bytesOf(e));
			this.blocks.set(e, r);
		}
		const i = this.memory.current?.(r) ?? r.buffer;
		let a = this.views.get(e);
		if (!a || a.buffer !== i) {
			a = new Uint8Array(i, r.byteOffset, this.bytesOf(e));
			this.views.set(e, a);
		}
		const o = new Float64Array(a.buffer, a.byteOffset, a.byteLength / 8);
		for (const r of t) {
			if (r.kind === "scalar") {
				const e = n[r.name];
				o[r.offset / 8] = typeof e === "boolean" ? e ? 1 : 0 : typeof e === "number" ? e : 0;
				continue;
			}
			this.fillBits(e, r.name, r.offset, r.bits, a, n);
		}
		return r.byteOffset;
	}
	/**
	* One bit per key, from the resource's OWN method. That is a call per key
	* per system call — bounded by the declared table, and paid only by a system
	* that named the resource. Reading the state behind the method instead would
	* be cheaper and would answer a different question inside a fixed step.
	*/
	fillBits(e, t, n, r, i, a) {
		const o = Math.ceil(r / 8);
		i.fill(0, n, n + o);
		const s = Se(e, t);
		const c = s && a[s.method];
		if (!s || typeof c !== "function") return;
		s.keys.forEach((e, t) => {
			if (c.call(a, e) === true) i[n + (t >> 3)] |= 1 << (t & 7);
		});
	}
	/**
	* Copy `name`'s block back onto the live resource, for a system that
	* declared `ResMut`: a mirror nobody reads back is a write that did not
	* happen. A field the resource does not hold as a number or a boolean is
	* skipped, because the block never carried it.
	*/
	writeBack(e) {
		const t = this.layoutOf(e);
		const n = this.views.get(e);
		const r = this.read(e);
		if (!t || !n || !r) return;
		const i = new Float64Array(n.buffer, n.byteOffset, n.byteLength / 8);
		for (const e of t) {
			if (e.kind !== "scalar") continue;
			const t = r[e.name];
			const n = i[e.offset / 8];
			if (typeof t === "boolean") r[e.name] = n !== 0;
			else if (typeof t === "number") r[e.name] = n;
		}
	}
	dispose() {
		this.disposed = true;
		const e = [...this.blocks.values()];
		this.blocks.clear();
		this.views.clear();
		Ke(e, (e) => this.memory.release(e));
	}
};
//#endregion
//#region src/ecs/aot/AotEvents.ts
/**
* @file    AotEvents.ts
* @brief   A frame's payloads, as memory a compiled system can walk.
*
* @details An event is a JS object on a bus, and compiled code reads addresses.
*          So each payload this frame is flattened into a block laid out in the
*          order the manifest declares — the same order the code reads at — and
*          the reader is handed one row per payload.
*
*          Sending is the same trade backwards: the code appended numbers, and
*          the object is rebuilt from that field list before it goes on the bus.
*/
var Sr = class {
	dispose() {
		this.disposed = true;
		this.release();
	}
	constructor(e, t) {
		this.memory = e;
		this.bus = t;
		this.blocks = [];
		this.disposed = false;
	}
	/**
	* One row per payload: `[entity, address]`, where the entity is zero because
	* nothing carries an event. The blocks live until `release`, which is the
	* end of the call — the same lifetime the row array has.
	*/
	rowsFor(e, t) {
		if (this.disposed) throw new Error("AotEvents is disposed");
		const n = this.bus(e)?.read() ?? [];
		const r = [];
		for (const e of n) {
			const n = this.memory.alloc(Math.max(8, t.length * 8));
			this.blocks.push(n);
			const i = this.memory.current?.(n) ?? n.buffer;
			const a = new Float64Array(i, n.byteOffset, t.length);
			t.forEach((t, n) => {
				a[n] = Cr(e, t);
			});
			r.push([0, n.byteOffset]);
		}
		return r;
	}
	/** Rebuild one payload from the fields the code wrote, and put it on the bus. */
	send(e, t, n) {
		if (this.disposed) throw new Error("AotEvents is disposed");
		const r = this.bus(e);
		if (!r) return;
		const i = {};
		t.forEach((e, t) => {
			wr(i, e, n[t] ?? 0);
		});
		r.send(i);
	}
	/** Give the per-call blocks back; they are only valid inside one call. */
	release() {
		const e = this.blocks.splice(0);
		Ke(e, (e) => this.memory.release(e));
	}
};
/** A dotted path read off a payload; a field it does not carry reads as 0. */
function Cr(e, t) {
	let n = e;
	for (const e of t.split(".")) {
		if (n === null || typeof n !== "object" || !oe(n, e)) return 0;
		n = n[e];
	}
	return typeof n === "boolean" ? n ? 1 : 0 : typeof n === "number" ? n : 0;
}
/** The same path, written back — nested objects are created as needed. */
function wr(e, t, n) {
	const r = t.split(".");
	let i = e;
	for (const e of r.slice(0, -1)) {
		if (!oe(i, e) || typeof i[e] !== "object" || i[e] === null) v(i, e, {});
		i = i[e];
	}
	v(i, r[r.length - 1], n);
}
//#endregion
//#region src/ecs/aot/AotSystems.ts
/**
* The twins available to a world. Empty in the editor and in dev, which is why
* dispatch needs no mode flag: there is simply nothing to find.
*/
var Tr = class {
	constructor() {
		this.byName = /* @__PURE__ */ new Map();
		this.calls_ = 0;
	}
	get size() {
		return this.byName.size;
	}
	/** The systems a module supplied twins for. Install is all-or-nothing. */
	names() {
		return [...this.byName.keys()];
	}
	/**
	* How many times a twin has been called. Installed is not the same question
	* as ran: a differential cannot tell them apart, because the closure that
	* would have run produces the same numbers.
	*/
	get calls() {
		return this.calls_;
	}
	/** Counted by the runner, which is the only thing that dispatches. */
	noteCall() {
		this.calls_++;
	}
	/**
	* Take a built module, after checking what it baked in against what is here.
	*
	* `resolve` turns a component NAME into the definition this world uses,
	* because the manifest carries names — a build cannot know a runtime's ids.
	* It is also how the project digest is recomputed: the shapes the module
	* named, as this runtime has them now.
	*/
	install(e, t, n, r = {}) {
		const { resourceFields: i = () => [], eventFields: a = le, addressBytes: o = 4, runs: s = () => true, moduleContract: c = null } = r;
		const l = hr(o);
		if (e.engineAbi !== l) throw new Error(`AOT module refused: built for engine ${e.engineAbi}, this is ${l}. Rebuild the module against this engine — a wrong offset reads a different field rather than failing.`);
		if (c !== null && e.moduleContract !== c) throw new Error(`AOT module refused: the module was built as ${c} and the manifest beside it says ${e.moduleContract ?? "(nothing)"}. They are from different builds — the declarations this runtime reads are not the ones the module compiled. Rebuild both.`);
		const u = _r(Er(e, n, i, a));
		if (e.projectShapes !== u) throw new Error(`AOT module refused: built for components ${e.projectShapes}, this project has ${u}. Rebuild the project — a component's fields moved under it.`);
		for (const r of e.systems) {
			for (const e of r.resources) if (!i(e.name)) throw new Error(`AOT module refused: '${r.name}' reads resource '${e.name}', which this runtime does not have`);
			const e = t[r.symbol];
			if (typeof e !== "function") throw new Error(`AOT module refused: it declares '${r.name}' but exports no '${r.symbol}'`);
			if (!s(r.name)) continue;
			const a = r.queries.map((e) => e.filter((e) => e.mut).map((e) => n(e.comp)).filter((e) => e !== void 0));
			this.byName.set(r.name, {
				decl: r,
				mutated: a,
				call: e
			});
		}
	}
	get(e) {
		return this.byName.get(e);
	}
	clear() {
		this.byName.clear();
	}
};
/**
* The script-component shapes a manifest names, as this runtime has them. Engine
* components are covered by the engine digest, from EHT's own table, so they are
* skipped here rather than counted twice.
*/
function Er(e, t, n, r) {
	const i = /* @__PURE__ */ new Set();
	const a = [];
	for (const o of e.systems) {
		for (const e of o.resources) {
			if (!e.fields || i.has(e.name)) continue;
			i.add(e.name);
			a.push({
				name: e.name,
				fields: [...n(e.name) ?? []]
			});
		}
		for (const e of [...o.readers ?? [], ...o.writers ?? []]) {
			if (i.has(e.event)) continue;
			i.add(e.event);
			a.push({
				name: e.event,
				fields: [...r(e.event) ?? []]
			});
		}
		const e = new Set((o.readers ?? []).map((e) => e.slot));
		for (const [n, r] of o.queries.entries()) {
			if (e.has(n)) continue;
			for (const e of r) {
				if (i.has(e.comp)) continue;
				i.add(e.comp);
				const n = t(e.comp);
				if (!n || n._builtin) continue;
				const r = n._default;
				if (r === null || typeof r !== "object") continue;
				a.push({
					name: e.comp,
					fields: Object.keys(r)
				});
			}
		}
	}
	return a;
}
//#endregion
//#region src/ecs/aot/AotDispatch.ts
/** No `With`/`Without` on a compiled query; the subset has no syntax for one. */
const Dr = [];
const Or = [];
/** What a query that named an unknown component matches. */
const kr = [];
/**
* The compiled half of the scheduler: given a twin, run it against this world.
*
* One per installed runtime, holding one plan per twin — a system's shape is
* fixed by the build that produced it, so nothing here is recomputed per frame.
*/
/** A component with no fields: a query filters on it and nothing reads it. */
function Ar(e) {
	const t = e._default;
	return typeof t === "object" && t !== null && Object.keys(t).length === 0;
}
/**
* A TAG has no fields, so no bytes and no address — and a resolver answering
* `undefined` would drop the whole row. Its slot is never read (the verifier
* refuses a field read against a shape with none), so zero is a filler.
*/
function jr(e, t) {
	return Ar(t) ? () => 0 : e.addressResolver(t);
}
/** Components whose value feeds the world-transform composition. */
const Mr = /* @__PURE__ */ new Set([
	"Transform",
	"Parent",
	"Children"
]);
var Nr = class {
	constructor(e, t) {
		this.world = e;
		this.runtime = t;
		this.plans = /* @__PURE__ */ new Map();
	}
	run(e) {
		const t = this.planFor_(e);
		if (!this.packRows_(t, this.world.layoutEpoch())) {
			if (t.reads) this.runtime.addresses.releasePayloads();
			return false;
		}
		const n = t.resources.map((e) => this.runtime.addresses.resourceAt(e.name) ?? 0);
		const r = e.decl.writers ?? [];
		this.runtime.ctx.setRecordLengths(r.map((e) => e.fields.length));
		this.runtime.ctx.build(t.scratch, t.rowWords, t.offsets, t.counts, n);
		e.call(this.runtime.ctx.address);
		this.runtime.systems.noteCall();
		for (const e of t.resources) if (e.mut) this.runtime.addresses.resourceWriteBack(e.name);
		for (const e of r.length > 0 ? this.runtime.ctx.events() : Or) {
			const t = r.find((t) => t.slot === e.slot);
			if (t) this.runtime.addresses.sendEvent(t.event, t.fields, e.fields);
		}
		if (t.reads) this.runtime.addresses.releasePayloads();
		for (const e of this.runtime.ctx.commands()) if (e.kind === 1) this.world.despawn(e.a);
		this.markChanged_(t);
		return true;
	}
	/** Drop the plans; the next call rebuilds them. */
	reset() {
		this.plans.clear();
	}
	/**
	* Every row of every query, written into one block.
	*
	* Every matching row must be addressable. If one is not, the interpreter
	* runs the whole system; skipping it would silently lose authored work.
	*/
	packRows_(e, t) {
		let n = t !== null && t === e.packedAt;
		const r = [];
		for (let t = 0; t < e.queries.length; t++) {
			const i = e.queries[t];
			if (i.reader) {
				n = false;
				r.push(kr);
				continue;
			}
			const a = i.resolved ? this.world.queryEntities(i.comps, Dr, Dr, i.key, void 0, i.depIds) : kr;
			r.push(a);
			if (a !== e.packedFrom[t]) n = false;
		}
		if (n) return true;
		e.packedAt = null;
		let i = 0;
		for (let t = 0; t < e.queries.length; t++) {
			const n = e.queries[t];
			e.offsets[t] = i;
			e.packedFrom[t] = r[t];
			if (n.reader) {
				const r = this.runtime.addresses.payloadRows(n.reader.event, n.reader.fields);
				e.scratch = Pr(e.scratch, i + r.length * n.width);
				for (let t = 0; t < r.length; t++) {
					const a = r[t];
					e.scratch[i + t * n.width] = a[0];
					e.scratch[i + t * n.width + 1] = a[1];
				}
				e.counts[t] = r.length;
				i += r.length * n.width;
				continue;
			}
			if (!n.resolved) {
				e.counts[t] = 0;
				continue;
			}
			const a = r[t];
			e.scratch = Pr(e.scratch, i + a.length * n.width);
			const o = e.scratch;
			const s = n.width;
			const c = n.resolvers;
			let l = 0;
			for (let e = 0; e < a.length; e++) {
				const t = a[e];
				const n = i + l * s;
				let r = true;
				for (let e = 0; e < c.length; e++) {
					const i = c[e](t);
					if (i === void 0) {
						r = false;
						break;
					}
					o[n + 1 + e] = i;
				}
				if (!r) return false;
				o[n] = t;
				l++;
			}
			e.counts[t] = l;
			i += l * s;
		}
		e.rowWords = i;
		e.packedAt = t;
		return true;
	}
	/**
	* The `Changed` ticks the compiled code could not record — it never calls
	* back. Asked once per component rather than per row: `recordChanged`
	* self-gates on the same answer, and on a hot path with nothing listening
	* that is a per-row cost spent for nothing.
	*/
	markChanged_(e) {
		for (let t = 0; t < e.queries.length; t++) {
			const n = e.queries[t];
			const r = e.counts[t];
			if (n.mutated.length === 0 || r === 0) continue;
			for (const e of n.mutated) if (Mr.has(e._name)) {
				this.world.invalidateTransformComposition();
				break;
			}
			for (const i of n.mutated) {
				if (!this.world.isChangeTracked(i)) continue;
				const a = e.offsets[t];
				for (let t = 0; t < r; t++) this.world.markChanged(e.scratch[a + t * n.width], i);
			}
		}
	}
	planFor_(e) {
		let t = this.plans.get(e);
		if (t) return t;
		const n = new Map((e.decl.readers ?? []).map((e) => [e.slot, e]));
		const r = e.decl.queries.map((t, r) => {
			const i = n.get(r);
			if (i) return {
				comps: [],
				resolvers: [],
				mutated: [],
				key: "",
				depIds: [],
				width: 2,
				resolved: true,
				reader: {
					event: i.event,
					fields: i.fields
				}
			};
			const a = [];
			for (const e of t) {
				const t = this.runtime.addresses.componentNamed(e.comp);
				if (t) a.push(t);
			}
			const c = a.length === t.length;
			return {
				comps: a,
				resolvers: a.map((e) => jr(this.world, e)),
				mutated: [...e.mutated[r] ?? []],
				key: o(a),
				depIds: s(a, Dr, Dr),
				width: 1 + a.length,
				resolved: c,
				reader: null
			};
		});
		t = {
			queries: r,
			reads: r.some((e) => e.reader !== null),
			resources: e.decl.resources,
			scratch: /* @__PURE__ */ new Uint32Array(0),
			counts: new Uint32Array(r.length),
			offsets: new Uint32Array(r.length),
			rowWords: 0,
			packedFrom: r.map(() => null),
			packedAt: null
		};
		this.plans.set(e, t);
		return t;
	}
};
/** At least `words` long, keeping what is already written. */
function Pr(e, t) {
	if (e.length >= t) return e;
	const n = new Uint32Array(Math.max(t, e.length * 2, 64));
	n.set(e);
	return n;
}
//#endregion
//#region src/ecs/aot/executorCapabilities.ts
/**
* The wasm road: the module shares the engine's memory, so every table the ctx
* carries has somewhere to live and `AotDispatch` drains all of them.
*/
const Fr = {
	eventRead: true,
	eventWrite: true,
	commands: true
};
/**
* The loading road: a host in its own process, packing its own rows.
*
* Neither event table exists (`AotHost.hpp` fills `events = 0`), and commands
* are applied to the C++ Registry by `es_aot_run` — a world the SDK's own
* `World.despawn` is not part of, so a despawn there is half a despawn.
*/
const Ir = {
	eventRead: false,
	eventWrite: false,
	commands: false
};
/** What this system needs a road to carry, off what the build declared. */
function Lr(e) {
	return {
		eventRead: (e.readers?.length ?? 0) > 0,
		eventWrite: (e.writers?.length ?? 0) > 0,
		commands: e.commands ?? true
	};
}
/** Every capability this system needs that the road does not have. */
function Rr(e, t) {
	const n = Lr(e);
	return Object.keys(n).filter((e) => n[e] && !t[e]);
}
/** What to say when a road leaves a system to the interpreter, in one place so
*  both roads say it the same way. */
function zr(e, t) {
	return `AOT: ${e} needs ${t.map((e) => Br[e] ?? e).join(" and ")}, which this host cannot hand compiled code — the interpreter keeps it`;
}
const Br = {
	eventRead: "to read events",
	eventWrite: "to write events",
	commands: "to append commands"
};
//#endregion
//#region src/ecs/aot/installAot.ts
/**
* @file    installAot.ts
* @brief   Take a built module and let the scheduler call it.
*
* @details The one entry point a shipping runtime needs: instantiate the wasm a
*          build produced, check what it baked in, and hand the runner the twins.
*          Everything it assembles has been tested on its own — this is the
*          wiring that was waiting for the handshake to be decided.
*
*          The module IMPORTS the engine's memory, so there is nothing to link
*          and no engine change: it reads the components where they already
*          are.
*
*          Refuses rather than degrades. A module built for other offsets does
*          not produce a wrong answer, it produces a read of a different field,
*          and a runtime that fell back to the interpreter on a mismatch would
*          hide exactly the thing worth knowing.
*/
/**
* Everything install does except hand the twins to a runner, because the two
* halves have different deadlines: the pool memory has to be in place before the
* world's first pooled component, and a runner may not exist until the first
* frame. A caller holding the result attaches it when it does.
*/
/**
* What the module says it was built as. Two exported functions rather than a
* constant: a module sharing the engine's memory carries no data section.
*/
function Vr(e) {
	const t = e["es_module_contract_lo"];
	const n = e["es_module_contract_hi"];
	if (typeof t !== "function" || typeof n !== "function") return null;
	const r = (e) => (e >>> 0).toString(16).padStart(8, "0");
	return r(n()) + r(t());
}
async function Hr(e) {
	const t = new Rn(e.host);
	const { instance: n } = await Ie(Ur(e.wasm), { env: { memory: e.host.memory } });
	const r = n.exports;
	r["_initialize"]?.();
	const i = new Tr();
	const a = new Map(e.manifest.systems.map((e) => {
		const t = Rr(e, Fr);
		if (t.length > 0) A.info("runtime", zr(e.name, t));
		return [e.name, t.length === 0];
	}));
	i.install(e.manifest, r, Gr, {
		resourceFields: e.resourceFields ?? ((t) => {
			const n = e.resources(t);
			return n === void 0 ? void 0 : Object.keys(n);
		}),
		runs: (e) => a.get(e) ?? false,
		moduleContract: Vr(r)
	});
	e.beforeCommit?.();
	e.world.useScriptPoolMemory(t);
	const o = new xr(t, e.resources, Wr(e.manifest));
	const s = new Sr(t, e.events ?? (() => void 0));
	const c = new yr(t);
	let l = false;
	const u = {
		dispose() {
			if (l) return;
			l = true;
			Ke([
				() => s.dispose(),
				() => o.dispose(),
				() => c.dispose()
			], (e) => e());
		},
		systems: i,
		addresses: Kr(o, s),
		ctx: c,
		dispatcherFor: (e) => {
			const t = new Nr(e, u);
			return { run: (e) => !l && t.run(e) };
		}
	};
	return u;
}
/**
* The module as the platform seam takes it. A view over a pooled buffer (what
* node hands back for a file read) is a window onto other bytes, so it gives up
* its own rather than the pool's.
*/
function Ur(e) {
	if (typeof e === "string" || e instanceof ArrayBuffer) return e;
	return e.buffer.slice(e.byteOffset, e.byteOffset + e.byteLength);
}
/** Layouts the BUILD derived for the project's own resources, by name. */
function Wr(e) {
	const t = /* @__PURE__ */ new Map();
	for (const n of e.systems) for (const e of n.resources) if (e.fields) t.set(e.name, e.fields);
	return t;
}
/** What a manifest's component NAME means in this runtime. */
function Gr(e) {
	return D(e);
}
/**
* What the manifest's names mean here, and where a resource's mirror is. A
* COMPONENT's address is not among them: `AotDispatch` takes a resolver from the
* world once per system rather than asking per row.
*/
function Kr(e, t) {
	return {
		componentNamed: Gr,
		resourceAt: (t) => e.addressOf(t),
		resourceWriteBack: (t) => e.writeBack(t),
		payloadRows: (e, n) => t.rowsFor(e, n),
		sendEvent: (e, n, r) => t.send(e, n, r),
		releasePayloads: () => t.release()
	};
}
//#endregion
//#region src/ecs/aot/installNativeAot.ts
/**
* @file    installNativeAot.ts
* @brief   Compiled systems on a host that loads a library, not a wasm module.
*
* @details The web road hands the module the engine's memory and packs the rows
*          here. A native host IS the engine's process: an address is a pointer
*          nothing in JS can hold, so the host packs them and this says only
*          which system to run (`es_aot_*`, native/host/bindings/AotBindings.cpp).
*
*          What stays on this side is what only this side knows. Where a script
*          component's rows are, because the pool is ours and it MOVES them; and
*          the Changed ticks, because compiled code never calls back and the
*          host has no idea who is watching.
*
*          Refuses rather than degrades, exactly as the wasm road does: the
*          handshake is checked here too, at the width a loading host runs at.
*/
/** `sizeof(es_addr_t)` where a loaded library runs. */
const qr = 8;
const Jr = /* @__PURE__ */ new WeakMap();
/** A project resource's field order, as the build compiled it. The engine's own
*  come from `resourceShapes`; a project's cannot, and only the build knows. */
function Yr(e) {
	const t = /* @__PURE__ */ new Map();
	for (const n of e.systems) for (const e of n.resources) if (e.fields) t.set(e.name, e.fields);
	return t;
}
/**
* The mask a sparse table is addressed by — the SDK's own, imported rather than
* spelled again. It was spelled again here, as a 20-bit mask against the real
* 22-bit one, which aliased every entity above index 2^20 onto another row.
*/
const Xr = e;
/** Read the `es_aot_*` globals a native host bound, or null where it bound none. */
function Zr(e = globalThis) {
	const t = (t) => typeof e[t] === "function" ? e[t] : null;
	const n = t("es_aot_install");
	const r = t("es_aot_install_checked");
	const i = t("es_aot_run");
	if (n === null || i === null) return null;
	const a = (e, n) => (...r) => {
		const i = t(e);
		return i === null ? n : i(...r);
	};
	return {
		runtimeIdentity: n,
		install: (e) => n(e),
		...r === null ? {} : { installChecked: (e, t) => r(e, t) },
		index: a("es_aot_index", -1),
		bound: a("es_aot_bound", false),
		scriptRows: a("es_aot_script_rows", false),
		resource: a("es_aot_resource", false),
		run: (e, t) => i(e, t),
		reset: a("es_aot_reset", void 0),
		contract: a("es_aot_contract", "")
	};
}
/**
* Install a module and hand the runner its twins, or null where this host has
* no `es_aot_*` at all — which is every host but a native one.
*/
function Qr(e) {
	const t = e.bindings ?? Zr();
	if (t === null) return null;
	const n = new Tr();
	const r = {};
	for (const t of e.manifest.systems) r[t.symbol] = () => {
		throw new Error(`AOT: ${t.name} is the host's to call, not this runtime's`);
	};
	const i = (t) => {
		const n = e.resources?.(t);
		return n === void 0 ? void 0 : Object.keys(n);
	};
	n.install(e.manifest, r, D, {
		addressBytes: qr,
		runs: () => false,
		resourceFields: i
	});
	const a = new Rn(e.heap);
	e.world.useScriptPoolMemory(a, true);
	if ((t.installChecked ? t.installChecked(e.modulePath, e.manifest.moduleContract ?? "") : t.install(e.modulePath)) < 0) return null;
	const o = t.runtimeIdentity ?? t;
	const s = Jr.get(o);
	const c = { retire: () => {} };
	Jr.set(o, c);
	const l = () => Jr.get(o) === c;
	try {
		s?.retire();
	} catch (e) {
		A.warn("runtime", "Native compiled runtime retirement error", e);
	}
	try {
		e.world.useScriptPoolMemory(a);
		const s = /* @__PURE__ */ new Map();
		for (const n of e.manifest.systems) {
			const e = Rr(n, Ir);
			if (e.length > 0) {
				A.info("runtime", zr(n.name, e));
				continue;
			}
			const r = t.index(n.name);
			if (r >= 0) s.set(n.name, r);
		}
		const u = t.contract?.() ?? "";
		n.install(e.manifest, r, (e) => D(e), {
			addressBytes: qr,
			runs: (e) => s.has(e),
			moduleContract: u === "" ? null : u,
			resourceFields: i
		});
		const d = /* @__PURE__ */ new Set();
		for (const t of e.manifest.systems) for (const e of t.queries) for (const t of e) d.add(t.comp);
		const f = new xr(a, e.resources ?? (() => void 0), Yr(e.manifest));
		let p = false;
		const m = {
			dispose() {
				if (p) return;
				p = true;
				n.clear();
				const e = l();
				if (e) Jr.delete(o);
				Ke([() => {
					if (e) t.reset();
				}, () => f.dispose()], (e) => e());
			},
			systems: n,
			addresses: {
				componentNamed: (e) => D(e),
				resourceAt: () => void 0
			},
			ctx: null,
			dispatcherFor: (e) => {
				const r = new ei(e, t, s, d, f, n);
				return { run: (e) => !p && r.run(e) };
			}
		};
		c.retire = () => m.dispose?.();
		if (!l()) {
			m.dispose?.();
			throw new Error("Native compiled installation was superseded during preparation");
		}
		e.runner.useAot(m);
		return m;
	} catch (e) {
		try {
			c.retire();
		} catch (e) {
			A.warn("runtime", "Native compiled cleanup error", e);
		}
		if (l()) {
			Jr.delete(o);
			try {
				t.reset();
			} catch (e) {
				A.warn("runtime", "Native compiled reset error", e);
			}
		}
		throw e;
	}
}
/**
* One twin's frame on a host that packs its own rows.
*
* Two things happen here and nothing else: the pools are re-reported when they
* may have moved, and the Changed ticks are marked. The call itself is one
* number crossing the boundary.
*/
/** Components whose value feeds the world-transform composition. */
const $r = /* @__PURE__ */ new Set([
	"Transform",
	"Parent",
	"Children"
]);
var ei = class {
	constructor(e, t, n, r, i, a) {
		this.world = e;
		this.bindings = t;
		this.indexByName = n;
		this.pooled = r;
		this.resources = i;
		this.systems = a;
		this.reportedAt_ = void 0;
		this.running_ = /* @__PURE__ */ new Set();
		this.assetQueries_ = /* @__PURE__ */ new Map();
	}
	run(e) {
		const t = this.indexByName.get(e.decl.name);
		if (t === void 0) return false;
		let n = this.assetQueries_.get(e);
		if (!n) {
			n = e.decl.queries.map((e) => {
				const t = e.map((e) => D(e.comp)).filter((e) => e !== void 0);
				const n = t.filter((e) => !b(e));
				return {
					comps: t,
					scripts: n,
					addresses: n.map((e) => this.world.addressResolver(e))
				};
			});
			this.assetQueries_.set(e, n);
		}
		for (const e of n) {
			if (!e.scripts.some((e) => this.world.hasPortableScriptAssetRefs(e))) continue;
			for (const t of this.world.queryEntities(e.comps)) for (let n = 0; n < e.scripts.length; n++) if (e.addresses[n](t) === void 0) return false;
		}
		this.reportPools_();
		this.reportResources_(e);
		if (this.bindings.run(t, this.world.scriptLayoutEpoch()) < 0) return false;
		this.systems.noteCall();
		if (!this.running_.has(e.decl.name)) {
			this.running_.add(e.decl.name);
			A.info("runtime", `AOT: ${e.decl.name} is running compiled`);
		}
		this.writeBackResources_(e);
		this.markChanged_(e);
		return true;
	}
	/** Mirror each declared resource into the heap and say where it landed. */
	reportResources_(e) {
		for (const t of e.decl.resources) {
			const e = this.resources.addressOf(t.name);
			if (e === void 0) continue;
			this.bindings.resource(t.name, e, this.resources.bytesOf(t.name));
		}
	}
	/** A `ResMut` the compiled code wrote is in the mirror, not in the world. */
	writeBackResources_(e) {
		for (const t of e.decl.resources) if (t.mut) this.resources.writeBack(t.name);
	}
	/**
	* Tell the host where each script component's rows are NOW.
	*
	* Keyed on the layout epoch, which is what the engine and the pools both
	* bump when anything moved. Null means nobody could say, and then the answer
	* has to be "assume they moved" — the same rule the row cache follows.
	*/
	reportPools_() {
		const e = this.world.layoutEpoch();
		if (e !== null && e === this.reportedAt_) return;
		this.reportedAt_ = e;
		for (const e of this.pooled) {
			const t = D(e);
			if (t === void 0 || b(t)) continue;
			const n = this.world.scriptSpanOf(t);
			if (n === void 0) {
				this.bindings.scriptRows(e, 0, 0, 0, 0, Xr, 0, 0);
				continue;
			}
			this.bindings.scriptRows(e, n.sparse, n.sparseCount, n.rows, n.stride, Xr, n.owners, n.ownerCount);
		}
	}
	/**
	* The ticks the compiled code could not leave. The matched set is walked
	* here rather than carried back: it is the same set — every component
	* present — and a query is cheaper than marshalling the rows. Only when
	* something watches, because that walk is the whole cost.
	*/
	markChanged_(e) {
		for (let t = 0; t < e.decl.queries.length; t++) {
			for (const n of e.mutated[t] ?? []) if ($r.has(n._name)) {
				this.world.invalidateTransformComposition();
				break;
			}
			const n = (e.mutated[t] ?? []).filter((e) => this.world.isChangeTracked(e));
			if (n.length === 0) continue;
			const r = e.decl.queries[t].map((e) => D(e.comp)).filter((e) => e !== void 0);
			for (const e of this.world.queryEntities(r)) for (const t of n) this.world.markChanged(e, t);
		}
	}
};
//#endregion
//#region src/ecs/bridge/nativeHeap.ts
/** The host globals that carry it. */
const ti = {
	heap: "es_heap",
	malloc: "es_malloc",
	free: "es_free"
};
const ni = /* @__PURE__ */ new WeakMap();
/** Whether this host bound the heap at all. A core that marshals nothing may not. */
function ri(e) {
	return typeof e[ti.heap] === "function" && typeof e[ti.malloc] === "function" && typeof e[ti.free] === "function";
}
/**
* Build the heap views over a host scope (the QuickJS global object; a plain
* object in tests). Null when the host bound no heap, which every caller treats
* the way it treats a core that left a subsystem out.
*/
function ii(e = globalThis) {
	if (!ri(e)) return null;
	const t = e[ti.heap]();
	if (!t) return null;
	const n = e[ti.malloc];
	const r = e[ti.free];
	let i = ni.get(e);
	if (!i || i.buffer !== t || i.malloc !== n || i.free !== r) {
		i = {
			buffer: t,
			malloc: n,
			free: r,
			identity: {}
		};
		ni.set(e, i);
	}
	return {
		allocatorIdentity: i.identity,
		HEAPU8: new Uint8Array(t),
		HEAPU16: new Uint16Array(t),
		HEAPU32: new Uint32Array(t),
		HEAPI32: new Int32Array(t),
		HEAPF32: new Float32Array(t),
		HEAPF64: new Float64Array(t),
		_malloc: (e) => n(e),
		_free: (e) => r(e)
	};
}
//#endregion
//#region src/ui/core/ui-camera-info.ts
/** The UI surface, as a resource — what a system reads to place something in
*  screen terms rather than design terms.
*  @beta */
const ai = k({
	viewProjection: /* @__PURE__ */ new Float32Array(16),
	vpX: 0,
	vpY: 0,
	vpW: 0,
	vpH: 0,
	screenW: 0,
	screenH: 0,
	worldLeft: 0,
	worldBottom: 0,
	worldRight: 0,
	worldTop: 0,
	worldMouseX: 0,
	worldMouseY: 0,
	valid: false,
	revision: 0
}, "UICameraInfo");
//#endregion
//#region src/camera/uiLayoutRect.ts
/**
* Half-height (world units) of the visible area after fitting a design resolution
* into an actual aspect per @p scaleMode. `orthoForWidth` is the half-height that
* makes the design *width* exactly fit; `orthoForHeight` the design height.
*/
function oi(e, t, n, r, i) {
	const a = e * t / n;
	const o = e;
	switch (r) {
		case 0: return a;
		case 1: return o;
		case 2: return Math.max(a, o);
		case 3: return Math.min(a, o);
		case 4: {
			const e = i;
			return Math.pow(a, 1 - e) * Math.pow(o, e);
		}
		default: return o;
	}
}
/**
* Synthetic camera `entity` id of the editor navigation view (never a real ECS
* entity — see CameraPlugin.editorCameraInfo). Distinguishes the free-zoom editor
* view from scene cameras when deciding the UI layout box.
*/
const si = -1;
/**
* World anchor of the editor's UI box — the origin. The design frame is a fixed
* place in the world, not something glued to the navigation view: anchored here it
* stays concentric with the viewport's design-frame overlay, and pans/zooms with
* the scene like every other piece of content. (In play the box tracks the camera
* instead; see {@link uiLayoutRect}.)
*/
const ci = {
	x: 0,
	y: 0
};
/**
* The world-space box the UI subtree is laid out within (UINode `px` are world
* units in this box), for the primary camera. Its SIZE is the area UI lays out in;
* its CENTER is where that area sits in the world, which places screen roots (a UI
* root with no transform parent) — so in play the HUD tracks the camera.
*
* A scene camera's extents carry its zoom (`orthoSize` fitted to the screen), so
* under a fit its box is the design resolution fitted to the camera's aspect and
* centred on the camera — UINode px map 1:1 to design px and a zoom does not reflow
* the UI. Without a fit the box is the camera's extents. The editor view instead renders the world at a *free
* zoom* with a raw orthoSize (editorCameraInfo passes a null fit, for predictable
* navigation), so laying UI out in its zoomed extents would rescale and reflow every
* element on each zoom. For it, recover the *fixed* design-resolution box from the
* fit and anchor it at {@link EDITOR_UI_ANCHOR}: the UI then lays out identically at
* any zoom or pan, and still scales visually with the scene because it renders
* through the same zoomed viewProjection.
*
* With no fit (no Canvas and no project fit) the editor falls back to its own
* extents — there is nothing to lay out, so it doesn't matter.
*/
function li(e, t, n, r, i = 0) {
	let a = e.halfW;
	let o = e.halfH;
	let s = e.cameraX;
	let c = e.cameraY;
	if (e.entity !== -1 && t && e.halfH > 0) {
		const n = e.halfW / e.halfH;
		const r = t.designResolution.x / t.designResolution.y;
		o = oi(t.designResolution.y / 2, r, n, t.scaleMode, t.matchWidthOrHeight);
		a = o * n;
	} else if (e.entity === -1 && t && n > 0 && r > 0) {
		const e = t.designResolution.x / t.designResolution.y;
		const n = i > 0 ? i : e;
		o = oi(t.designResolution.y / 2, e, n, t.scaleMode, t.matchWidthOrHeight);
		a = o * n;
		s = ci.x;
		c = ci.y;
	}
	return {
		left: s - a,
		right: s + a,
		bottom: c - o,
		top: c + o
	};
}
//#endregion
//#region src/ui/core/screen-layout.ts
/**
* @file    screen-layout.ts
* @brief   The one screen-space fact every consumer of it reads.
*
* @details Screen UI is laid out in a pixel domain decided by the design
*          resolution, the viewport, the scale mode and the device — and by
*          nothing else. No camera position, no camera projection, no world
*          units. A camera moving must not move a HUD, and the only way to
*          guarantee that is for the coordinates never to have come from one.
*
*          Two rects, not one. The VIEWPORT box is the whole framebuffer and is
*          what the overlay projects; the SAFE box is the part a layout should
*          keep its content inside. Merging them shrinks a full-screen fade into
*          the notch-safe rect, which is not what a fade is.
*/
const ui = {
	left: 0,
	bottom: 0,
	right: 0,
	top: 0
};
const di = {
	valid: false,
	left: 0,
	bottom: 0,
	right: 0,
	top: 0,
	safeLeft: 0,
	safeBottom: 0,
	safeRight: 0,
	safeTop: 0,
	scale: 1,
	viewportW: 0,
	viewportH: 0
};
const H = k({ ...di }, "ScreenLayout");
/**
* The layout box for a viewport. `fit` is the project's design resolution and
* scale mode; absent, the viewport is its own design box and one layout pixel is
* one device pixel.
*
* @param insets device-reported safe-area insets, in DEVICE pixels.
*/
function fi(e, t, n, r = ui) {
	if (t <= 0 || n <= 0) return { ...di };
	const i = t / n;
	let a;
	if (e && e.designResolution.y > 0 && e.designResolution.x > 0) {
		const t = e.designResolution.x / e.designResolution.y;
		a = oi(e.designResolution.y / 2, t, i, e.scaleMode, e.matchWidthOrHeight);
	} else a = n / 2;
	const o = a * i;
	const s = n / (a * 2);
	return {
		valid: true,
		left: -o,
		right: o,
		bottom: -a,
		top: a,
		safeLeft: -o + r.left / s,
		safeRight: o - r.right / s,
		safeBottom: -a + r.bottom / s,
		safeTop: a - r.top / s,
		scale: s,
		viewportW: t,
		viewportH: n
	};
}
/**
* How far a screen quad may sit either side of the plane before the projection
* clips it. Generous on purpose: a screen root's `Transform.worldPosition.z` is
* layout storage with no depth meaning, so a value left there must not decide
* whether the element exists.
*/
const pi = 1e5;
/**
* The projection the screen domain is drawn and picked through.
*
* @details ONE matrix, not two agreeing ones: the overlay renders with it and the
*          pointer is inverted through it, so "the HUD is where it looks" holds
*          by construction. Its only input is the layout box.
*/
function mi(e, t) {
	const n = t ?? /* @__PURE__ */ new Float32Array(16);
	if (!e.valid) {
		n.fill(0);
		n[0] = n[5] = n[10] = n[15] = 1;
		return n;
	}
	n.set(Gt(e.left, e.right, e.bottom, e.top, -1e5, pi));
	return n;
}
//#endregion
//#region src/ui/core/screen-overlay.ts
/**
* @file    screen-overlay.ts
* @brief   How the screen domain reaches pixels this frame — read by the draw
*          and by the pointer, which is why it is a published value.
*
* @details {@link ScreenLayout} says WHERE a screen element is; this says how
*          that place becomes a framebuffer pixel. They are different facts and
*          only this one can vary with the surface presenting it.
*
*          Render and pick must not merely agree — they must read the SAME
*          matrix. Two derivations that are equal today drift the moment either
*          side gains a case, and the symptom (a HUD that looks right and clicks
*          somewhere else) is worse to diagnose than one that never drew.
*
*          In a shipped frame the projection is {@link screenProjection} over the
*          whole surface: no camera, no world. The editor's design view is the
*          one place it is anything else — there the screen box is shown IN the
*          scene, zoomed and panned like the content it will sit over. That is a
*          value this carries, not a branch the renderer takes.
*
*          A frame with NO camera still presents: the surface and the design fit
*          are the whole of it (gated by `ui-screen-no-camera`). Needing a camera
*          for the projection, the viewport or the mask would put one back in the
*          screen's path by a side door.
*/
/** A fresh instance. A factory rather than a shared literal because the matrix
*  is a buffer: two Apps spreading one default would write each other's frame. */
function hi() {
	return {
		active: false,
		projection: /* @__PURE__ */ new Float32Array(16),
		vpX: 0,
		vpY: 0,
		vpW: 0,
		vpH: 0,
		surfaceW: 0,
		surfaceH: 0,
		pointerX: 0,
		pointerY: 0,
		layerMask: 4294967295
	};
}
const U = k(hi(), "ScreenOverlay");
//#endregion
//#region src/asset/liveAssetBindings.ts
/** Component names carrying at least one field of any of these asset types —
*  what a system walking those bindings reaches for, from the same declaration. */
function gi(e) {
	const t = [];
	for (const [n, r] of ne()) if (r.assetFields.some((t) => e.includes(t.type))) t.push(n);
	return t;
}
/**
* Every live binding of `value` — the asset a replacement is about to migrate.
*
* An empty value (0 / '') is refused rather than matched: it is what an UNBOUND
* field holds, so matching it would hand back every field of every entity that
* never referenced the asset at all.
*/
function _i(e, t, n) {
	const r = [];
	if (n === 0 || n === "" || n === null || n === void 0) return r;
	for (const i of ne().values()) {
		const a = i.assetFields.filter((e) => e.type === t);
		if (a.length === 0) continue;
		for (const t of e.getEntitiesWithComponents([i])) {
			if (e.isDestructionPending(t)) continue;
			const o = e.get(t, i);
			for (const { field: e } of a) if (o[e] === n) r.push({
				entity: t,
				component: i,
				field: e
			});
		}
	}
	return r;
}
/** Every asset field this one entity carries, whatever the type. */
function vi(e, t) {
	const n = [];
	for (const r of ne().values()) {
		if (r.assetFields.length === 0) continue;
		if (!e.has(t, r)) continue;
		for (const { field: e } of r.assetFields) n.push({
			entity: t,
			component: r,
			field: e
		});
	}
	return n;
}
/** Read one binding's current value — what a rollback has to put back. */
function yi(e, t) {
	return e.get(t.entity, t.component)[t.field];
}
/**
* Point one binding at another asset.
*
* Through `world.set` rather than a mutation: an engine-backed component answers
* a fresh object per `get`, so writing to that object stores nothing.
*/
function bi(e, t, n) {
	const r = e.get(t.entity, t.component);
	r[t.field] = n;
	e.set(t.entity, t.component, r);
}
//#endregion
//#region src/asset/liveAssetRebind.ts
/**
* What a bound field holds for this asset value — a handle.
*
* One rule for both ends of a replacement: the outgoing value an invalidation
* reports, and the incoming lease. Undefined for an asset a field names by REF
* rather than by value, which is not migrated at all — its slot swaps under the
* name the field already holds.
*/
function xi(e) {
	if (typeof e === "number") return e;
	return e?.handle;
}
/** {@link boundValueIn} for what a receipt names. */
function Si(e) {
	return xi(e.value);
}
/** The receipt in `scope` that a bound value names, if the scope holds one. */
function Ci(e, t) {
	if (t === void 0 || t === null || t === 0 || t === "") return void 0;
	return e.leases().find((e) => Si(e) === t);
}
/**
* The slot receipt in `scope` that answers to this ref, if the scope holds one.
*
* The other half of {@link leaseBoundAs}: a field naming an asset by ref points
* at a SLOT, and the slot's own names say which — no resolving a path, which
* after an invalidate names a different era than the field is reading.
*/
function wi(e, t) {
	if (typeof t !== "string" || t === "") return void 0;
	return e.leases().find((e) => Me(e) && e.names.includes(t));
}
/** Every scope owning at least one live binding of `oldValue` — one replacement
*  acquisition is owed to each. */
function Ti(e, t, n, r) {
	const i = [];
	for (const a of _i(e, t, n)) {
		const e = r(a.entity);
		if (!i.includes(e)) i.push(e);
	}
	return i;
}
/**
* Move one scope onto the replacement: bindings and ownership together, all or
* none. Returns whether it migrated; when it did not, the replacement has been
* given back rather than kept by the coordinator.
*/
function Ei(e, t, n, r, i, a) {
	const o = _i(e, n, r).filter((e) => a(e.entity) === t);
	const s = i.boundValue(i.lease);
	if (o.length === 0 || s === void 0) {
		i.lease.release();
		return false;
	}
	const c = Ci(t, r);
	const l = o.map((t) => yi(e, t));
	let u = 0;
	let d = null;
	for (; u < o.length; u++) try {
		bi(e, o[u], s);
	} catch (e) {
		d = e;
		break;
	}
	if (d !== null) {
		for (let t = o.length - 1; t >= 0; t--) try {
			bi(e, o[t], l[t]);
		} catch {}
		i.lease.release();
		A.warn("asset", "live asset rebind rolled back — a binding could not be written", d);
		return false;
	}
	t.add(i.lease);
	if (c) {
		t.forget(c);
		c.release();
	}
	return true;
}
//#endregion
//#region src/camera/CameraCommit.ts
/**
* @file    CameraCommit.ts
* @brief   The camera the picture on screen was drawn from.
* @details Anything that draws OVER the canvas — an editor's gizmo overlay, a
*          DOM label pinned to a world point — has to project through the same
*          camera the canvas did, or it lands somewhere the picture never was.
*
*          {@link UICameraInfo} cannot answer that. Its matrix is rewritten in
*          place twice a frame (an early peek, then the authoritative resolve),
*          so a reader on its own clock samples at an arbitrary phase and can
*          get a camera no frame was ever drawn with — not stale, a third state.
*
*          This is a COPY, published once, after the draw. A reader holding it
*          holds a moment rather than a view onto memory somebody else is still
*          writing, and `revision` says which moment, so an overlay can be held
*          to having used the same one.
*/
const Di = /* @__PURE__ */ new Set();
/** Subscribe to committed-camera changes. Returns an unsubscribe. @beta */
function Oi(e) {
	Di.add(e);
	return () => {
		Di.delete(e);
	};
}
/** Announce a change. Called by the camera plugin, after the submit. @beta */
function ki() {
	for (const e of [...Di]) e();
}
/** The last drawn camera, as a resource. @beta */
const Ai = k({
	revision: 0,
	viewProjection: /* @__PURE__ */ new Float32Array(16),
	vpX: 0,
	vpY: 0,
	vpW: 0,
	vpH: 0,
	valid: false
}, "CameraCommit");
//#endregion
//#region src/ui/util/math.ts
function ji(e, t) {
	const n = Math.max(e.x, t.x);
	const r = Math.max(e.y, t.y);
	const i = Math.min(e.x + e.w, t.x + t.w);
	const a = Math.min(e.y + e.h, t.y + t.h);
	return {
		x: n,
		y: r,
		w: Math.max(0, i - n),
		h: Math.max(0, a - r)
	};
}
/**
* Unprojects one NDC point, depth included.
*
* The full 4×4 product, unlike the x/y-only shortcut it replaces — under a
* perspective projection the third column is not zero, so a screen point does
* not name a world point at all until a depth is chosen.
*/
function Mi(e, t, n, r) {
	const i = r[0] * e + r[4] * t + r[8] * n + r[12];
	const a = r[1] * e + r[5] * t + r[9] * n + r[13];
	const o = r[2] * e + r[6] * t + r[10] * n + r[14];
	const s = r[3] * e + r[7] * t + r[11] * n + r[15];
	const c = s !== 0 ? 1 / s : 0;
	return {
		x: i * c,
		y: a * c,
		z: o * c
	};
}
/**
* A pointer position as {@link Input} reports it — CSS pixels, y growing DOWN
* from the top edge — in the framebuffer pixels every projection here takes:
* device pixels, y growing UP from the bottom edge.
*
* @details The one place the two spaces meet. Passing `input.mouseY` straight to
*          a screen-space query mirrors the answer about the viewport's centre,
*          which is easy to miss in a symmetric scene.
*/
function Ni(e, t, n, r) {
	return {
		x: e * n,
		y: r - t * n
	};
}
function Pi(e, t, n, r, i, a, o) {
	const s = (e - r) / a * 2 - 1;
	const c = (t - i) / o * 2 - 1;
	const l = Mi(s, c, -1, n);
	const u = Mi(s, c, 1, n);
	const d = u.x - l.x;
	const f = u.y - l.y;
	const p = u.z - l.z;
	const m = Math.hypot(d, f, p) || 1;
	return {
		origin: l,
		dir: {
			x: d / m,
			y: f / m,
			z: p / m
		}
	};
}
/**
* Where @p ray meets the plane through @p point with normal @p normal, or null
* when the two are parallel — a plane the ray never reaches has no point on it,
* and a number would be a position the caller did not ask about.
*/
function Fi(e, t, n) {
	const r = e.dir.x * n.x + e.dir.y * n.y + e.dir.z * n.z;
	if (Math.abs(r) <= 1e-9) return null;
	const i = ((t.x - e.origin.x) * n.x + (t.y - e.origin.y) * n.y + (t.z - e.origin.z) * n.z) / r;
	return {
		x: e.origin.x + e.dir.x * i,
		y: e.origin.y + e.dir.y * i,
		z: e.origin.z + e.dir.z * i
	};
}
/** The plane 2D content lives on, and the one a caller with no depth in mind means. */
const Ii = {
	x: 0,
	y: 0,
	z: 1
};
/**
* Where a screen point lands on the world plane at @p planeZ.
*
* @details A screen point is a RAY, not a position. Orthographically the ray's
*          x/y are constant along its length, which is why taking z = 0 worked
*          and why every 2D caller can keep calling this unchanged. Under a
*          perspective camera they are not constant, and the same call would
*          answer with wherever the near plane happened to be — off by more the
*          further the content sits from z = 0.
*
*          So the ray is intersected with the plane, which is one implementation
*          with the orthographic case as its degenerate form rather than two
*          branches that have to agree. `planeZ` defaults to the 2D plane, so a
*          caller that has no depth in mind keeps getting the 2D answer.
*/
function Li(e, t, n, r, i, a, o, s = 0) {
	const c = Pi(e, t, n, r, i, a, o);
	const l = Fi(c, {
		x: 0,
		y: 0,
		z: s
	}, Ii);
	return l ? {
		x: l.x,
		y: l.y
	} : {
		x: c.origin.x,
		y: c.origin.y
	};
}
function Ri(e, t, n, r, i, a, o, s) {
	const c = n - i * o;
	const l = n + i * (1 - o);
	const u = r - a * s;
	const d = r + a * (1 - s);
	return e >= c && e <= l && t >= u && t <= d;
}
function zi(e, t) {
	return rt.angleZ({
		z: e,
		w: t
	});
}
/** At or below this, w names the eye itself and the divide has no answer. */
const Bi = 1e-6;
/** Whether the point has a screen position at all — see {@link ProjectedPoint}. */
function Vi(e) {
	return e.clipW > Bi;
}
/**
* Where a world point lands on screen — the inverse of {@link screenToWorld}, and
* it takes the same third dimension.
*
* @details A point off the z = 0 plane projects to a different place than its
*          shadow on it: nearer content is larger and further from the centre.
*          Dropping @p wz would put an entity's outline, gizmo and screen rect
*          where the entity is NOT drawn. No default: which plane a point sits on
*          is the caller's fact, not this function's guess.
*/
function Hi(e, t, n, r, i, a, o, s) {
	const c = r[0] * e + r[4] * t + r[8] * n + r[12];
	const l = r[1] * e + r[5] * t + r[9] * n + r[13];
	const u = r[2] * e + r[6] * t + r[10] * n + r[14];
	const d = r[3] * e + r[7] * t + r[11] * n + r[15];
	const f = c / d;
	const p = l / d;
	return {
		x: i + (f * .5 + .5) * o,
		y: a + (p * .5 + .5) * s,
		clipZ: u,
		clipW: d
	};
}
/**
* How far a projected point is in FRONT of the near plane, in clip units.
*
* @details Negative behind it, and affine along a world segment — so where a
*          segment crosses solves for one t, and the world point at that t is the
*          furthest the segment can be drawn to.
*/
function Ui(e) {
	return e.clipZ + e.clipW;
}
/**
* How a world direction moves the projection of its own anchor, in viewport
* pixels per world unit, y-up.
*
* @details Under perspective the answer depends on the POINT: the divide by w
*          swings an axis's screen direction with where it stands.
*/
function Wi(e, t, n, r, i, a, o, s, c) {
	const l = (e.x - a) / s * 2 - 1;
	const u = (e.y - o) / c * 2 - 1;
	const d = i[0] * t + i[4] * n + i[8] * r;
	const f = i[1] * t + i[5] * n + i[9] * r;
	const p = i[3] * t + i[7] * n + i[11] * r;
	return {
		x: (d - l * p) / e.clipW * .5 * s,
		y: (f - u * p) / e.clipW * .5 * c
	};
}
function Gi() {
	const e = /* @__PURE__ */ new Float32Array(16);
	const t = /* @__PURE__ */ new Float32Array(16);
	let n = true;
	return {
		update(e) {
			for (let r = 0; r < 16; r++) if (t[r] !== e[r]) {
				t.set(e);
				n = true;
				break;
			}
		},
		getInverse(t) {
			if (n) {
				Zt(t, e);
				n = false;
			}
			return e;
		}
	};
}
function Ki(e, t, n, r, i, a, o, s, c, l) {
	if (c === 0 && l === 1) return Ri(e, t, n, r, i, a, o, s);
	const u = zi(c, l);
	const d = Math.sin(-u);
	const f = Math.cos(-u);
	const p = e - n;
	const m = t - r;
	const h = p * f - m * d + n;
	const g = p * d + m * f + r;
	const _ = n - i * o;
	const v = n + i * (1 - o);
	const y = r - a * s;
	const b = r + a * (1 - s);
	return h >= _ && h <= v && g >= y && g <= b;
}
//#endregion
//#region src/camera/Camera.ts
/**
* Per-App camera-space query API: screen<->world conversions, the world-space
* mouse position, and the active camera's world bounds.
*
* Reads the per-App {@link UICameraInfo} resource. Each App holds its own
* instance (published as the {@link CameraView} resource) and its own
* inverse-view-projection cache, so two Apps running at once never share a
* single cached `app` or clobber each other's cache.
*/
/** How far inside the near plane a cut lands, as a fraction of the segment. */
const qi = 1e-4;
/** The camera currently being resolved — moves twice a frame. */
const Ji = (e) => {
	const t = e.getResource(ai);
	return t.valid ? t : null;
};
/** The camera the last frame was drawn with. */
const Yi = (e) => {
	const t = e.getResource(Ai);
	return t.valid ? t : null;
};
var Xi = class {
	/**
	* @param lens_ Which camera this view answers for. The default is the one
	*              being resolved — what a system inside the frame wants.
	*              Anything aligning to the PICTURE wants
	*              {@link PresentedCameraView}: the live one moves mid-frame and
	*              can hold a state no frame was drawn from.
	*/
	constructor(e, t = Ji) {
		this.app_ = e;
		this.lens_ = t;
		this.invVPCache = Gi();
	}
	cam() {
		return this.lens_(this.app_);
	}
	/**
	* The live UI surface, for the two answers that are not projections.
	*
	* Where the pointer is and what box UI lays out within are facts about the
	* surface as it stands, not about a picture that was drawn — so they read
	* the live resource even on a view over the committed camera.
	*/
	surface() {
		const e = this.app_.getResource(ai);
		return e.valid ? e : null;
	}
	/**
	* Where a screen point lands on the world plane at @p planeZ.
	*
	* @p screenX / @p screenY are FRAMEBUFFER pixels, y growing up from the
	* bottom edge. For the pointer use {@link pointerToWorld}, which takes
	* `input.mouseX` / `input.mouseY` as they come.
	*
	* A screen point is a ray. Orthographically its x/y do not vary along it, so
	* the plane is irrelevant and the default answers for everyone. Under a
	* perspective camera it decides the answer, and the right plane is the one
	* the thing being hit or dragged actually sits on — z = 0 would place a
	* sprite at z = -400 wherever its shadow on the 2D plane happens to fall.
	*/
	screenToWorld(e, t, n = 0) {
		const r = this.cam();
		if (!r) return null;
		this.invVPCache.update(r.viewProjection);
		const i = this.invVPCache.getInverse(r.viewProjection);
		return Li(e, t, i, r.vpX, r.vpY, r.vpW, r.vpH, n);
	}
	/**
	* Where the POINTER lands on the world plane at @p planeZ, taking the
	* coordinates {@link Input} reports (`input.mouseX` / `input.mouseY`, a
	* touch's x / y): CSS pixels, y down from the top.
	*
	* `screenToWorld` takes framebuffer pixels with y UP — what the renderer and
	* the editor viewport work in. Feeding it the pointer directly mirrors the
	* answer about the viewport's centre; this is the call a game wants.
	*/
	pointerToWorld(e, t, n = 0) {
		const r = this.pointerScreen(e, t);
		return r ? this.screenToWorld(r.x, r.y, n) : null;
	}
	/** The world ray under the pointer, in {@link Input}'s coordinates — see {@link pointerToWorld}. */
	pointerRay(e, t) {
		const n = this.pointerScreen(e, t);
		return n ? this.screenRay(n.x, n.y) : null;
	}
	pointerScreen(e, t) {
		const n = this.surface();
		if (!n) return null;
		return Ni(e, t, We(), n.screenH);
	}
	/**
	* The world ray a screen point names — what `screenToWorld` intersects with
	* the z plane. Callers that drag along an arbitrary plane (an editor moving
	* along a world axis, a pick against the ground) need the ray itself: a
	* z-keyed answer cannot express a plane that is not z-keyed.
	*/
	screenRay(e, t) {
		const n = this.cam();
		if (!n) return null;
		this.invVPCache.update(n.viewProjection);
		const r = this.invVPCache.getInverse(n.viewProjection);
		return Pi(e, t, r, n.vpX, n.vpY, n.vpW, n.vpH);
	}
	/**
	* Where the world point lands on screen — the inverse of `screenToWorld`,
	* taking the same third dimension. Under a perspective camera a point at
	* @p worldZ projects nowhere near its shadow on the 2D plane, so anything
	* drawing an overlay ON an entity (an outline, a gizmo, a screen rect) has to
	* pass the entity's z or it draws where the entity is not.
	*
	* Null means the point has NO screen position: no camera, or it stands at or
	* behind the eye, where the divide mirrors it to the far side of the view.
	* Outside the viewport is NOT that, and keeps its coordinates.
	*/
	worldToScreen(e, t, n = 0) {
		const r = this.cam();
		if (!r) return null;
		const i = Hi(e, t, n, r.viewProjection, r.vpX, r.vpY, r.vpW, r.vpH);
		return Vi(i) ? {
			x: i.x,
			y: i.y
		} : null;
	}
	/**
	* The part of segment @p a → @p b that can be drawn, cut at the near plane.
	*
	* @details One end behind the eye still leaves a visible part, and dropping the
	*          whole segment is what makes a wireframe come apart as the eye moves
	*          into it. Null when none of it is in front.
	*/
	clipSegment(e, t) {
		const n = this.cam();
		if (!n) return null;
		const r = (e) => Hi(e.x, e.y, e.z, n.viewProjection, n.vpX, n.vpY, n.vpW, n.vpH);
		const i = Ui(r(e));
		const a = Ui(r(t));
		if (i >= 0 && a >= 0) return {
			a: e,
			b: t
		};
		if (i < 0 && a < 0) return null;
		const o = i / (i - a);
		const s = i >= 0 ? o * .9999 : o + (1 - o) * qi;
		const c = {
			x: e.x + (t.x - e.x) * s,
			y: e.y + (t.y - e.y) * s,
			z: e.z + (t.z - e.z) * s
		};
		return i >= 0 ? {
			a: e,
			b: c
		} : {
			a: c,
			b: t
		};
	}
	/**
	* Where a world DIRECTION points on screen at @p at — px per world unit, y-up.
	*
	* @details Null when @p at has no projection. Perspective makes this a fact
	*          about the POINT: an arm drawn on something asks here, where a basis
	*          read off the camera answers only for the centre of the view.
	*/
	projectDirectionAt(e, t) {
		const n = this.cam();
		if (!n) return null;
		const r = Hi(e.x, e.y, e.z, n.viewProjection, n.vpX, n.vpY, n.vpW, n.vpH);
		if (!Vi(r)) return null;
		return Wi(r, t.x, t.y, t.z, n.viewProjection, n.vpX, n.vpY, n.vpW, n.vpH);
	}
	getWorldMousePosition() {
		const e = this.surface();
		if (!e) return null;
		return {
			x: e.worldMouseX,
			y: e.worldMouseY
		};
	}
	getWorldBounds() {
		const e = this.surface();
		if (!e) return null;
		return {
			left: e.worldLeft,
			right: e.worldRight,
			bottom: e.worldBottom,
			top: e.worldTop
		};
	}
};
/**
* Per-App camera-query API resource, published by `cameraPlugin` on every core
* (web and native alike). Read it as
* `app.getResource(CameraView)` to convert screen<->world etc. (Named
* `CameraView` rather than `Camera` because `Camera` is the ECS component.)
*/
const Zi = k(null, "CameraView");
/**
* The same queries, against the camera the last frame was actually drawn with.
*
* One implementation, two sources: a second projection written over the commit
* would be a second near-plane cut to keep in step, and a wireframe cut by one
* and drawn by the other comes apart exactly where a segment leaves the view.
* @beta
*/
const Qi = k(null, "PresentedCameraView");
/** A view over the camera the last frame was drawn with. @beta */
const $i = (e) => new Xi(e, Yi);
//#endregion
//#region src/render/renderTexture.ts
let ea = false;
/**
* Handle → the size of the target behind it. A `Camera.renderTarget` is a bare
* handle (a component holds no object), and what decides that camera's
* resolution is the target's own size — so the one place that knows it says so.
*/
const ta = /* @__PURE__ */ new Map();
/** The size of a live render target, or null once it has been released. */
function na(e) {
	return ta.get(e) ?? null;
}
const ra = {
	create(e) {
		const t = e.depth ?? true;
		const n = e.filter === "linear";
		const r = (t ? 1 : 0) | (n ? 2 : 0);
		const i = M.createRenderTarget(e.width, e.height, r);
		if (i === 0 && !ea) {
			ea = true;
			Ce("render", `RenderTexture.create(${e.width}x${e.height}) made no render target: the renderer is not up yet, or this engine core has none`);
		}
		const a = M.getTargetTexture(i);
		const o = a !== 0 ? et()?.wrapDeviceTexture?.(a, e.width, e.height) ?? 0 : 0;
		ta.set(i, {
			width: e.width,
			height: e.height
		});
		return {
			_handle: i,
			textureId: a,
			texture: o,
			width: e.width,
			height: e.height,
			_depth: t,
			_filter: n ? "linear" : "nearest",
			_generation: je()
		};
	},
	release(e) {
		if (e.texture !== 0) et()?.releaseTexture(e.texture);
		ta.delete(e._handle);
		M.releaseRenderTarget(e._handle);
	},
	resize(e, t, n) {
		ra.release(e);
		return ra.create({
			width: t,
			height: n,
			depth: e._depth,
			filter: e._filter
		});
	},
	begin(e, t) {
		M.begin(t, e._handle);
	},
	end() {
		M.end();
	},
	getDepthTexture(e) {
		return M.getTargetDepthTexture(e._handle);
	},
	/**
	* Whether the device has been rebuilt since this target was drawn: the storage
	* is there, zero-filled, and only whoever drew the pixels can put them back.
	* A target a camera renders every frame never needs asking; one drawn once
	* (a minimap, a baked mask) does. Pair it with `onDeviceRestored`.
	*/
	contentLost(e) {
		return e._generation !== je();
	},
	/** Says the target has been drawn again, which is what clears {@link contentLost}. */
	contentDrawn(e) {
		e._generation = je();
	}
};
//#endregion
//#region src/scene/SceneTransitionController.ts
const ia = "__scene_transition_overlay__";
const aa = 2e4;
var oa = class {
	constructor() {
		this.state_ = null;
		this.performSwap_ = null;
	}
	isTransitioning() {
		return this.state_ !== null;
	}
	/**
	* Begin a fade transition. The returned promise resolves after fade-in
	* completes following a successful `performSwap`, or rejects with
	* a swap or lifecycle callback error. The controller drives the visual overlay via
	* `Draw.rect` on every frame until the state machine clears itself.
	*/
	start(e, t) {
		return new Promise((n, r) => {
			const { duration: i, color: a, onComplete: o } = e;
			e.onStart?.();
			this.state_ = {
				phase: "fade-out",
				elapsed: 0,
				duration: i,
				color: a,
				resolve: n,
				reject: r,
				onComplete: o,
				outcome: { status: "pending" }
			};
			xt(ia, () => this.drawOverlay_());
			this.performSwap_ = t;
		});
	}
	/** Advance the state machine by `dt` seconds. */
	update(e) {
		if (!this.state_) return;
		this.state_.elapsed += e;
		const t = this.state_.duration / 2;
		if (this.state_.phase === "fade-out" && this.state_.elapsed >= t) {
			this.state_.phase = "loading";
			this.state_.elapsed = 0;
			this.kickSwap_();
		}
		if (this.state_.phase === "loading") {
			const e = this.state_.outcome;
			if (e.status === "pending") {
				this.state_.elapsed = 0;
				return;
			}
			if (e.status === "error") {
				const { reject: t } = this.state_;
				this.teardown_();
				t(e.error);
				return;
			}
			this.state_.phase = "fade-in";
			this.state_.elapsed = 0;
			return;
		}
		if (this.state_.phase === "fade-in" && this.state_.elapsed >= t) {
			const { resolve: e, reject: t, onComplete: n } = this.state_;
			this.teardown_();
			try {
				n?.();
				e();
			} catch (e) {
				t(e);
			}
		}
	}
	/** Forcibly drop any in-flight transition without resolving or rejecting. */
	reset() {
		if (this.state_) this.teardown_();
	}
	kickSwap_() {
		const e = this.state_;
		const t = this.performSwap_;
		this.performSwap_ = null;
		if (!e || !t) return;
		(async () => {
			try {
				await t();
				if (this.state_ === e) e.outcome = { status: "success" };
			} catch (t) {
				A.error("scene", "Scene transition failed", t);
				if (this.state_ === e) e.outcome = {
					status: "error",
					error: t
				};
			}
		})();
	}
	teardown_() {
		this.state_ = null;
		this.performSwap_ = null;
		Dt(ia);
	}
	drawOverlay_() {
		const e = this.state_;
		if (!e) return;
		const t = e.duration / 2;
		let n;
		switch (e.phase) {
			case "fade-out":
				n = Math.min(e.elapsed / t, 1);
				break;
			case "loading":
				n = 1;
				break;
			case "fade-in": n = Math.max(1 - e.elapsed / t, 0);
		}
		St.setLayer(9999);
		St.setDepth(9999);
		St.rect({
			x: 0,
			y: 0
		}, {
			x: aa,
			y: aa
		}, {
			r: e.color.r,
			g: e.color.g,
			b: e.color.b,
			a: n
		});
	}
};
//#endregion
//#region src/ui/core/dimension.ts
/**
* @file    ui/core/dimension.ts
* @brief   Dimension — a CSS-style length (value + unit) for the runtime UI box
*          model.
*
* One field can be pixels, a percentage of the parent, or content-driven (auto),
* replacing the old size/offset/`-1`-sentinel scheme. The on-wire shape matches
* the C++ `Dimension` struct serialized by the EHT codegen (`{ value, unit }`,
* `unit` an integer); these helpers give it a typed, ergonomic authoring API.
*/
/** How a {@link Dimension}'s `value` is interpreted. Mirrors the C++ u8 unit.
*  @public */
const sa = {
	/** Absolute pixels. */
	Px: 0,
	/** Percentage of the parent's corresponding axis (0..100). */
	Percent: 1,
	/** Content-/layout-driven; `value` is ignored. */
	Auto: 2
};
/** `n` pixels — a design pixel, which at the project's design resolution is one
*  screen pixel and scales with it thereafter.
*  @public */
const ca = (e) => ({
	value: e,
	unit: sa.Px
});
/** `n` percent of the parent axis (0..100), not a 0..1 fraction.
*  @public */
const la = (e) => ({
	value: e,
	unit: sa.Percent
});
/** Content-/layout-driven length (Yoga `auto`); `value` is ignored. Not frozen
*  with its two siblings: no certified game asks for one. */
const W = () => ({
	value: 0,
	unit: sa.Auto
});
/** True when the dimension is the content-/layout-driven `auto` length. */
const ua = (e) => e.unit === sa.Auto;
//#endregion
//#region src/ui/core/ui-node.ts
/**
* @file    ui/core/ui-node.ts
* @brief   UINode — the CSS box-model layout primitive.
*
* The primary way to author UI geometry: every size is a {@link Dimension}
* (px / percent / auto) fed straight into the single-pass Yoga solver. The
* per-item flex properties (grow/shrink/basis/alignSelf/margin/min-max) live
* here; container properties stay on {@link FlexContainer}. Mirrors the C++ `UINode`
* builtin; `computed_size_` is C++-internal (not serialized). Construct lengths
* with `px()/percent()/auto()`.
*/
/**
* A layout box. Under a Canvas its size and position come from the flex layout
* rather than from Transform, which the layout writes.
*
* `@beta`: anchors, insets and the theme tokens beside them are the newest part
* of the UI, and the corpus reaches thirty-three of a hundred and fifteen UI
* symbols.
*
* @beta
*/
const G = d("UINode", {
	position: 0,
	display: 0,
	opacity: 1,
	pointerEvents: 0,
	width: W(),
	height: W(),
	minWidth: W(),
	minHeight: W(),
	maxWidth: W(),
	maxHeight: W(),
	flexGrow: 0,
	flexShrink: 1,
	flexBasis: W(),
	alignSelf: 0,
	marginLeft: ca(0),
	marginTop: ca(0),
	marginRight: ca(0),
	marginBottom: ca(0),
	insetLeft: W(),
	insetTop: W(),
	insetRight: W(),
	insetBottom: W()
});
//#endregion
//#region src/ecs/entityUtils.ts
/**
* Whether hiding this entity would do anything — it has a UI node, or at least
* one renderer of its own. False for a bare transform, whose children draw but
* which has nothing of its own to hide.
*/
function da(e, t) {
	if (e.has(t, G)) return true;
	return C().some((n) => e.has(t, n));
}
/**
* Show or hide an entity.
*
* A UI node hides through `display`, which the layout pass resolves down the
* tree — hiding a panel hides everything under it, and that is what hiding a UI
* element means. Nothing else has hierarchical visibility in the runtime, so
* for the rest the write lands on this entity's own renderers and its children
* keep drawing.
*/
function fa(e, t, n) {
	if (e.has(t, G)) {
		const r = e.get(t, G);
		r.display = n ? 0 : 1;
		e.set(t, G, r);
		return;
	}
	for (const r of C()) {
		if (!e.has(t, r)) continue;
		const i = e.get(t, r);
		i[r.renderableField] = n;
		e.set(t, r, i);
	}
}
/** The reading {@link setEntityVisible} writes. An entity with nothing to hide is visible. */
function pa(e, t) {
	if (e.has(t, G)) return e.get(t, G).display !== 1;
	for (const n of C()) {
		if (!e.has(t, n)) continue;
		return e.get(t, n)[n.renderableField] !== false;
	}
	return true;
}
/**
* Switch `entity` off, or back on. Everything under it goes with it — a
* character switched off with its sword still swinging is not switched off —
* and the subtree is DERIVED, so switching the character back on does not
* un-switch a sword the author had switched off on its own.
*/
function ma(e, t, n) {
	if (!e.valid(t)) return;
	if (n) {
		if (e.has(t, w)) e.remove(t, w);
	} else if (!e.has(t, w)) e.insert(t, w, {});
	e.getCppRegistry()?.setEntityEnabled?.(t, n);
}
/** Whether this entity ITSELF is switched on. An ancestor's switch takes it out
*  of every query without changing this — see {@link setEntityActive}. */
function ha(e, t) {
	return e.valid(t) && (e.getCppRegistry()?.isEntityEnabled?.(t) ?? !e.has(t, w));
}
/**
* Take `entity` out of its parent's hierarchy and leave it where it was.
*
* A bare {@link World.removeParent} keeps the LOCAL transform — a position
* relative to a parent that is no longer there, so the entity jumps. The world
* transform, as of the last transform pass, becomes the local one.
*/
function ga(e, t) {
	const n = e.tryGet(t, E);
	e.removeParent(t);
	if (!n) return;
	e.set(t, E, {
		...n,
		position: { ...n.worldPosition },
		rotation: { ...n.worldRotation },
		scale: { ...n.worldScale }
	});
}
//#endregion
//#region src/scene/sceneManager.ts
var _a = class {
	constructor(e) {
		this.entities = /* @__PURE__ */ new Set();
		this.drawCallbacks = /* @__PURE__ */ new Map();
		this.postProcessBindings = /* @__PURE__ */ new Map();
		this.savedEnabled = /* @__PURE__ */ new Map();
		this.systemIds = [];
		this.assetScope = new ot();
		this.loadedByType = /* @__PURE__ */ new Map();
		this.status = "loading";
		this.config = e;
	}
};
var va = class {
	constructor(e, t, n, r) {
		this.instance_ = e;
		this.app_ = t;
		this.adopt_ = n;
		this.isCurrent_ = r;
	}
	assertCurrent_() {
		if (!this.isCurrent_()) throw new ya(this.name);
	}
	get name() {
		return this.instance_.config.name;
	}
	get entities() {
		return this.instance_.entities;
	}
	spawn() {
		this.assertCurrent_();
		const e = this.app_.world.spawn();
		this.adopt(e);
		return e;
	}
	adopt(e) {
		this.assertCurrent_();
		this.adopt_(e);
	}
	trackAssetScope(e) {
		if (!this.isCurrent_()) {
			e.releaseAll();
			throw new ya(this.name);
		}
		this.instance_.assetScope.absorb(e);
	}
	trackAssets(e) {
		this.assertCurrent_();
		for (const [t, n] of e) {
			if (t === "material" || t === "spine") continue;
			let e = this.instance_.loadedByType.get(t);
			if (!e) {
				e = /* @__PURE__ */ new Set();
				this.instance_.loadedByType.set(t, e);
			}
			for (const t of n) e.add(t);
		}
	}
	despawn(e) {
		this.assertCurrent_();
		this.instance_.entities.delete(e);
		this.app_.world.despawn(e);
	}
	registerDrawCallback(e, t) {
		this.assertCurrent_();
		this.instance_.drawCallbacks.set(e, t);
		xt(e, t, this.instance_.config.name);
	}
	bindPostProcess(e, t) {
		this.assertCurrent_();
		if (this.app_.hasResource(B)) this.app_.getResource(B).bind(e, t);
		this.instance_.postProcessBindings.set(e, t);
	}
	unbindPostProcess(e) {
		this.assertCurrent_();
		if (this.app_.hasResource(B)) this.app_.getResource(B).unbind(e);
		this.instance_.postProcessBindings.delete(e);
	}
	setPersistent(e, t) {
		this.assertCurrent_();
		if (this.app_.world.has(e, a)) {
			const n = this.app_.world.get(e, a);
			n.persistent = t;
			this.app_.world.insert(e, a, n);
		}
	}
};
/**
* Thrown by a `load()` whose scene slot was replaced — by a concurrent `unload()`
* or a superseding load — while its assets were still loading. The load despawns
* anything it had spawned and rejects with this instead of committing a
* half-loaded scene, so a `load()`/`unload()` race can't orphan entities.
*/
var ya = class extends Error {
	constructor(e) {
		super(`Scene load for "${e}" was cancelled (the scene was unloaded mid-load)`);
		this.name = "SceneLoadCancelled";
	}
};
/**
* Scene loading and transitions, as `Res(SceneManager)` hands it over. A scene is
* a unit of ownership as much as of content: what it spawned is despawned and what
* it acquired is released when it unloads.
*
* `@beta`: the vocabulary is settled, but one certified project drives it against
* twenty-six signatures — thin evidence for that breadth of promise.
*
* @beta
*/
var ba = class {
	constructor(e) {
		this.configs_ = /* @__PURE__ */ new Map();
		this.scenes_ = /* @__PURE__ */ new Map();
		this.contexts_ = /* @__PURE__ */ new Map();
		this.additiveScenes_ = /* @__PURE__ */ new Set();
		this.pausedScenes_ = /* @__PURE__ */ new Set();
		this.sleepingScenes_ = /* @__PURE__ */ new Set();
		this.loadOrder_ = [];
		this.activeScene_ = null;
		this.initialScene_ = null;
		this.transitionController_ = new oa();
		this.switching_ = false;
		this.loadPromises_ = /* @__PURE__ */ new Map();
		this.stopEntityTracking_ = null;
		this.app_ = e;
	}
	trackEntityDestruction_() {
		if (this.stopEntityTracking_) return;
		this.stopEntityTracking_ = this.app_.world.onDespawn?.((e) => {
			for (const t of this.scenes_.values()) {
				t.entities.delete(e);
				t.savedEnabled.delete(e);
			}
		}) ?? null;
	}
	/**
	* Forget the scenes while the caller keeps the World.
	*
	* scene-teardown: NOT the shared protocol. Entities stay, so what they still
	* render must not be released under them — and a dropped instance therefore
	* keeps its receipts and systems. No caller in this repo says if that is right.
	*/
	reset() {
		this.stopEntityTracking_?.();
		this.stopEntityTracking_ = null;
		for (const e of this.scenes_.values()) {
			for (const t of e.drawCallbacks.keys()) Dt(t);
			const t = this.app_.hasResource(B) ? this.app_.getResource(B) : null;
			for (const n of e.postProcessBindings.keys()) t?.unbind(n);
		}
		this.transitionController_.reset();
		this.configs_.clear();
		this.scenes_.clear();
		this.contexts_.clear();
		this.additiveScenes_.clear();
		this.pausedScenes_.clear();
		this.sleepingScenes_.clear();
		this.loadOrder_.length = 0;
		this.activeScene_ = null;
		this.initialScene_ = null;
		this.switching_ = false;
		this.loadPromises_.clear();
	}
	register(e) {
		this.configs_.set(e.name, e);
	}
	setInitial(e) {
		this.initialScene_ = e;
	}
	getInitial() {
		return this.initialScene_;
	}
	isTransitioning() {
		return this.transitionController_.isTransitioning();
	}
	async switchTo(e, t) {
		return this.switchTo_(e, t, false);
	}
	/**
	* Start the active scene over: retire it and bring it back up, entities and
	* all. `switchTo` cannot express this — asked for the scene already running
	* it does nothing, which is the right answer for a gate and the wrong one
	* for every death, retry and restart there is.
	*/
	async reload(e) {
		const t = this.activeScene_;
		if (!t) {
			A.warn("scene", "reload() with no active scene");
			return;
		}
		return this.switchTo_(t, e, true);
	}
	async switchTo_(e, t, n) {
		if (this.transitionController_.isTransitioning() || this.switching_) {
			A.warn("scene", `Scene switch already in progress, ignoring switchTo("${e}")`);
			return;
		}
		this.switching_ = true;
		try {
			if ((t?.transition ?? "none") !== "fade") {
				await this.swapTo_(e, t, n);
				return;
			}
			await this.transitionController_.start({
				duration: t?.duration ?? Nt.sceneTransitionDuration,
				color: t?.color ?? { ...Nt.sceneTransitionColor },
				onStart: t?.onStart,
				onComplete: t?.onComplete
			}, () => this.swapTo_(e, t, n));
		} finally {
			this.switching_ = false;
		}
	}
	/** The swap itself: retire whatever is active, bring `name` up. */
	async swapTo_(e, t, n = false) {
		const r = this.activeScene_;
		if (r && (n || r !== e)) await this.unload(r, t);
		await this.load(e);
	}
	updateTransition(e) {
		this.transitionController_.update(e);
	}
	/** Replace whatever is active with `name`. */
	async load(e, t) {
		return this.loadScene_(e, "exclusive", t);
	}
	/** Bring `name` up alongside whatever is already running. */
	async loadAdditive(e, t) {
		return this.loadScene_(e, "additive", t);
	}
	/**
	* Ready `name` without bringing it up. A no-op for a scene that declares no
	* preparation, and for one already loaded — there is nothing left to hide.
	*/
	async prepare(e) {
		if (this.scenes_.has(e)) return;
		await this.configs_.get(e)?.prepare?.();
	}
	/**
	* Make the render programs `name`'s prepared content requires ready.
	* @returns Not applicable where the scene declares no readying or is already
	*          up; otherwise the claim, or null when one could not be made.
	*/
	async readyRenderPrograms(e) {
		if (this.scenes_.has(e)) return { applicable: false };
		const t = this.configs_.get(e)?.readyRenderPrograms;
		return t ? t() : { applicable: false };
	}
	/**
	* Give back what {@link prepare} readied, answering how many acquisitions
	* came back with it. Zero for a scene that readied nothing.
	*/
	discardPrepared(e) {
		if (this.scenes_.has(e)) return 0;
		return this.configs_.get(e)?.discardPrepared?.() ?? 0;
	}
	/**
	* The one load path. `mode` is the only difference between the two doors —
	* which is why they were two copies, and why the fix for re-loading a SLEPT
	* scene reached only one: additive flipped the status bit without the
	* restore, leaving those entities disabled forever.
	*/
	async loadScene_(e, t, n) {
		const r = () => {
			if (t === "additive") this.additiveScenes_.add(e);
			else this.activeScene_ = e;
		};
		if (this.scenes_.has(e)) {
			const t = this.scenes_.get(e);
			if (t.status === "loading") return this.loadPromises_.get(e);
			if (t.status === "sleeping") this.wake(e);
			else if (t.status === "paused") this.resume(e);
			t.status = "running";
			r();
			return this.contexts_.get(e);
		}
		const i = this.configs_.get(e);
		if (!i) throw new Error(`Scene "${e}" is not registered`);
		const a = new _a(i);
		this.trackEntityDestruction_();
		this.scenes_.set(e, a);
		const o = new va(a, this.app_, (e) => this.adoptInto_(a, e), () => this.scenes_.get(e) === a);
		this.contexts_.set(e, o);
		const s = (async () => {
			let t = i.data;
			if (!t && i.path) {
				const e = performance.now();
				const n = this.app_.hasResource(j) ? this.app_.getResource(j) : null;
				if (n) t = await n.fetchJson(i.path);
				else t = await (await fetch(i.path)).json();
				i.onPhase?.("fetch", performance.now() - e);
			}
			await this.loadSceneData_(a, e, i, t, n);
			a.status = "running";
			r();
			this.loadOrder_.push(e);
			return o;
		})();
		this.loadPromises_.set(e, s);
		try {
			return await s;
		} catch (t) {
			this.rollbackFailedLoad_(e, a);
			throw t;
		} finally {
			this.loadPromises_.delete(e);
		}
	}
	/**
	* Roll back a load that threw partway, through the teardown a successful
	* unload runs: a half-loaded scene owns what a loaded one owns.
	*
	* `keepPersistent: false` because persistence is a property of a COMMITTED
	* scene — a failed load cannot promote an entity into a global one.
	*/
	rollbackFailedLoad_(e, t) {
		this.disposeSceneOwnedState_(t, false, false);
		this.removeSceneSlot_(e, t);
	}
	/**
	* Give back everything this instance owns — the one teardown protocol.
	*
	* Idempotent by construction: every collection is emptied as it is walked.
	* An `unload` during a load tears the instance down, and that load's own
	* rollback then runs over it again — over whatever its setup added between.
	*/
	disposeSceneOwnedState_(e, t, n) {
		const i = this.app_.world;
		const { survivors: a, doomed: o } = this.partitionOnUnload_(e, t);
		const s = new Set(o);
		for (const e of a) {
			if (!i.has(e, r)) continue;
			const t = i.get(e, r).entity;
			if (s.has(t)) ga(i, e);
		}
		for (const t of a) this.promoteToGlobal_(e, t, n);
		for (const e of o) if (i.valid(e)) i.despawn(e);
		e.entities.clear();
		e.savedEnabled.clear();
		for (const t of e.drawCallbacks.keys()) Dt(t);
		e.drawCallbacks.clear();
		for (const t of e.systemIds) this.app_.removeSystem(t);
		e.systemIds.length = 0;
		const c = this.app_.hasResource(B) ? this.app_.getResource(B) : null;
		for (const t of e.postProcessBindings.keys()) c?.unbind(t);
		e.postProcessBindings.clear();
		this.releaseSceneAssets_(e);
	}
	/**
	* Who lives through this unload and who does not, decided before anything is
	* destroyed. Persistence is only asked of a scene that COMMITTED: a rollback
	* passes `keepPersistent: false`, and everything it made is doomed.
	*/
	partitionOnUnload_(e, t) {
		const n = this.app_.world;
		const r = [];
		const i = [];
		for (const o of e.entities) {
			if (!n.valid(o)) continue;
			if ((t ? n.tryGet(o, a) : null)?.persistent) r.push(o);
			else i.push(o);
		}
		return {
			survivors: r,
			doomed: i
		};
	}
	/**
	* Hand one entity over to nobody in particular: it outlives the scene it came
	* from, so nothing scene-gated may still read it as that scene's.
	*
	* `scene === ''` is the existing "always active" rule; left as the dead
	* scene's, a persistent camera would stop rendering.
	*/
	promoteToGlobal_(e, t, n) {
		const r = this.app_.world;
		this.promoteAssetOwnership_(e, t);
		const i = r.get(t, a);
		if (i.scene !== "") {
			i.scene = "";
			r.insert(t, a, i);
		}
		if (n) this.restoreSleepState_(e, t);
	}
	/**
	* Split the scene's ownership of what this entity is bound to.
	*
	* `retain`, not a re-acquire: the era the fields hold is not the era their
	* path resolves to once a hot update has passed this scene by. One per
	* SOURCE receipt — a handle names its receipt by value, a ref names the
	* slot that publishes it.
	*/
	promoteAssetOwnership_(e, t) {
		const n = this.app_.hasResource(j) ? this.app_.getResource(j) : null;
		if (!n) return;
		const r = /* @__PURE__ */ new Set();
		for (const n of vi(this.app_.world, t)) {
			const t = yi(this.app_.world, n);
			const i = Ci(e.assetScope, t) ?? wi(e.assetScope, t);
			if (i) r.add(i);
		}
		if (r.size === 0) return;
		const i = n.entityScopes.ensure(this.app_.world, t);
		for (const e of r) {
			if (i.leases().some((t) => t.key === e.key && t.generation === e.generation)) continue;
			const t = e.retain();
			if (t) i.add(t);
		}
	}
	adoptInto_(e, t) {
		const n = this.app_.world;
		if (!n.valid(t)) throw new Error("Cannot adopt a destroyed entity");
		const i = e.entities.has(t);
		for (const i of this.scenes_.values()) {
			if (i === e || !i.entities.has(t)) continue;
			this.promoteAssetOwnership_(i, t);
			const a = n.tryGet(t, r)?.entity;
			if (a !== void 0 && i.entities.has(a)) ga(n, t);
			if (i.status === "sleeping") this.restoreSleepState_(i, t);
			const o = i.postProcessBindings.get(t);
			if (o) {
				i.postProcessBindings.delete(t);
				e.postProcessBindings.set(t, o);
				o.setAllPassesEnabled(e.status !== "sleeping" && e.status !== "paused");
			}
			i.entities.delete(t);
			i.savedEnabled.delete(t);
		}
		e.entities.add(t);
		n.insert(t, a, {
			scene: e.config.name,
			persistent: false
		});
		if (!i && e.status === "sleeping") this.sleepEntity_(e, t, C());
	}
	/**
	* Forget the scene, if the slot is still this instance's.
	*
	* The identity check is the whole point: a concurrent unload + reload may
	* already have put a NEWER instance in the slot, and a rollback that
	* cleared it by name would delete the live scene out from under it.
	*/
	removeSceneSlot_(e, t) {
		if (this.scenes_.get(e) !== t) return;
		this.scenes_.delete(e);
		this.contexts_.delete(e);
		this.additiveScenes_.delete(e);
		this.pausedScenes_.delete(e);
		this.sleepingScenes_.delete(e);
		const n = this.loadOrder_.indexOf(e);
		if (n !== -1) this.loadOrder_.splice(n, 1);
		if (this.activeScene_ === e) this.activeScene_ = null;
	}
	async unload(e, t) {
		const n = this.scenes_.get(e);
		if (!n) return;
		const r = this.contexts_.get(e);
		const i = n.status === "sleeping";
		n.status = "unloading";
		if (n.config.cleanup) try {
			n.config.cleanup(r);
		} catch (t) {
			A.error("scene", `Scene "${e}" cleanup callback threw; continuing teardown`, t);
		}
		this.disposeSceneOwnedState_(n, t?.keepPersistent ?? true, i);
		this.removeSceneSlot_(e, n);
	}
	/**
	* Populate a scene: entities, assets, systems, setup().
	*
	* Returning means this load still owns the scene slot. Every await inside is a
	* window for a concurrent unload to take it; checking that here rather than
	* per caller is what the additive path was missing.
	*/
	async loadSceneData_(e, t, n, r, i) {
		if (r) {
			e.loadedByType.clear();
			const o = { collectAssets: {
				scope: e.assetScope,
				texturePaths: /* @__PURE__ */ new Set(),
				materialHandles: /* @__PURE__ */ new Set(),
				fontPaths: /* @__PURE__ */ new Set(),
				spineKeys: /* @__PURE__ */ new Set()
			} };
			if (i) o.onProgress = i;
			if (n.externalEntities) o.externalEntities = n.externalEntities();
			if (n.onPhase) o.onPhase = n.onPhase;
			if (this.app_.hasResource(j)) o.assets = this.app_.getResource(j);
			const s = await ct(this.app_.world, r, o);
			if (this.scenes_.get(t) !== e) {
				for (const e of s.values()) if (this.app_.world.valid(e)) this.app_.world.despawn(e);
				throw new ya(t);
			}
			for (const n of s.values()) {
				e.entities.add(n);
				this.app_.world.insert(n, a, {
					scene: t,
					persistent: false
				});
			}
			cn(this.app_, s);
		}
		if (this.scenes_.get(t) !== e) throw new ya(t);
		if (n.systems) for (const { schedule: r, system: i } of n.systems) {
			const n = Sa(this.app_, t, i);
			this.app_.addSystemToSchedule(r, n);
			e.systemIds.push(n._id);
		}
		const o = this.contexts_.get(t);
		if (n.setup) {
			await n.setup(o);
			if (this.scenes_.get(t) !== e) throw new ya(t);
		}
	}
	releaseSceneAssets_(e) {
		const t = this.app_.hasResource(j) ? this.app_.getResource(j) : null;
		e.assetScope.releaseAll();
		t?.releaseAssets(e.loadedByType);
		e.loadedByType.clear();
	}
	/**
	* What the named scene acquired, so an owner-aware operation (a live asset
	* replacement) can put a receipt where this scene will give it back.
	*
	* @internal
	*/
	assetScopeFor(e) {
		return this.scenes_.get(e)?.assetScope ?? null;
	}
	pause(e) {
		const t = this.scenes_.get(e);
		if (!t || t.status !== "running") return;
		t.status = "paused";
		this.pausedScenes_.add(e);
		this.setPostProcessPassesEnabled(t, false);
	}
	resume(e) {
		const t = this.scenes_.get(e);
		if (!t || t.status !== "paused") return;
		t.status = "running";
		this.pausedScenes_.delete(e);
		this.setPostProcessPassesEnabled(t, true);
	}
	sleep(e) {
		const t = this.scenes_.get(e);
		if (!t || t.status !== "running") return;
		t.status = "sleeping";
		this.sleepingScenes_.add(e);
		this.setPostProcessPassesEnabled(t, false);
		t.savedEnabled.clear();
		const n = C();
		for (const e of t.entities) this.sleepEntity_(t, e, n);
	}
	sleepEntity_(e, t, n) {
		const r = this.app_.world;
		if (!r.valid(t)) return;
		r.insert(t, w, {});
		const i = /* @__PURE__ */ new Map();
		for (const e of n) if (r.has(t, e)) {
			const n = r.get(t, e);
			const a = n[e.renderableField] !== false;
			i.set(e, a);
			if (a) {
				n[e.renderableField] = false;
				r.set(t, e, n);
			}
		}
		if (i.size > 0) e.savedEnabled.set(t, i);
	}
	wake(e) {
		const t = this.scenes_.get(e);
		if (!t || t.status !== "sleeping") return;
		t.status = "running";
		this.sleepingScenes_.delete(e);
		this.setPostProcessPassesEnabled(t, true);
		for (const e of t.entities) this.restoreSleepState_(t, e);
		t.savedEnabled.clear();
	}
	/** Put one entity back the way {@link sleep} found it. Shared with the
	*  promotion of a persistent entity out of a sleeping scene, which is the
	*  same question asked about one entity instead of all of them. */
	restoreSleepState_(e, t) {
		const n = this.app_.world;
		if (!n.valid(t)) return;
		n.remove(t, w);
		const r = e.savedEnabled.get(t);
		if (!r) return;
		for (const [e, i] of r) {
			if (!n.has(t, e)) continue;
			const r = n.get(t, e);
			r[e.renderableField] = i;
			n.set(t, e, r);
		}
	}
	setPostProcessPassesEnabled(e, t) {
		for (const n of e.postProcessBindings.values()) n.setAllPassesEnabled(t);
	}
	isPaused(e) {
		return this.pausedScenes_.has(e);
	}
	isSleeping(e) {
		return this.sleepingScenes_.has(e);
	}
	isLoaded(e) {
		return this.scenes_.has(e);
	}
	isActive(e) {
		return this.activeScene_ === e;
	}
	getActive() {
		return this.activeScene_;
	}
	getActiveScenes() {
		const e = [];
		for (const [t, n] of this.scenes_) if (n.status === "running") e.push(t);
		return e;
	}
	getLoaded() {
		return Array.from(this.scenes_.keys());
	}
	/** Scenes whose load has started and not yet finished, in the order they began. */
	getLoading() {
		return Array.from(this.loadPromises_.keys());
	}
	/**
	* Resolves once every load in flight NOW has finished, failed or been
	* cancelled — loads read their files in wall time, so a caller that advances
	* the game by frames (a test, an automation driver) cannot count its way to
	* a loaded scene. A load started after this call is not waited for.
	*/
	async whenLoadsSettle() {
		await Promise.allSettled([...this.loadPromises_.values()]);
	}
	getLoadOrder() {
		return [...this.loadOrder_];
	}
	bringToTop(e) {
		const t = this.loadOrder_.indexOf(e);
		if (t === -1) return;
		this.loadOrder_.splice(t, 1);
		this.loadOrder_.push(e);
	}
	getScene(e) {
		return this.contexts_.get(e) ?? null;
	}
	getSceneStatus(e) {
		return this.scenes_.get(e)?.status ?? null;
	}
};
/**
* Scene loading, as a resource. Registered by the scene plugin, so a bare `App`
* without it has no scenes to manage.
*
* @beta
*/
const K = k(null, "SceneManager");
/**
* Who owes a release for what this entity's asset fields hold: its existing
* entity scope, its scene, or a new scope ending at its own despawn.
*
* A promoted entity owns what it holds and carries no scene tag, so a caller
* working the rule out for itself hands its replacement to the app instead.
* Runtime entities without a scene also end before the app does.
*/
function xa(e, t, n) {
	const r = t.entityScopes.scopeFor(n, e.world);
	if (r) return r;
	const i = e.world.tryGet(n, a);
	return (i?.scene && e.hasResource(K) ? e.getResource(K).assetScopeFor(i.scene) : null) ?? t.entityScopes.ensure(e.world, n);
}
function Sa(e, t, n) {
	return {
		_id: Symbol(`SceneScoped_${n._name}_${t}`),
		_name: `${n._name}@${t}`,
		_params: n._params,
		_fn: (...r) => {
			if (e.getResource(K).getSceneStatus(t) === "running") n._fn(...r);
		}
	};
}
//#endregion
//#region src/prefab/prefabServer.ts
/**
* Prefab instantiation, as `Res(Prefabs)` hands it over.
*
* `@beta`: `instantiate` is the whole surface and it has not moved, but its result
* and override shapes are spelled in the prefab document model, which is also the
* on-disk format — so their names are settled ahead of the shapes.
*
* @beta
*/
var Ca = class {
	constructor(e, t, n = () => null) {
		this.world_ = e;
		this.getAssets_ = t;
		this.getScenes_ = n;
	}
	/**
	* Spawn a prefab into the world. What it spawns belongs to the scene that
	* was live when it landed, exactly like an entity that scene authored —
	* ownerless, a bullet or a called minion leaks into the next room. Pass
	* `scene: false` for something meant to outlive the area it came from.
	*/
	async instantiate(e, t) {
		const n = this.getAssets_();
		const r = await n.acquireTyped("prefab", e);
		try {
			const i = r.value.data;
			const a = await fn(this.world_, i, {
				assets: n,
				assetBaseUrl: t?.baseUrl,
				parent: t?.parent,
				overrides: wa(i, e, t?.overrides)
			});
			if (t?.scene !== false) this.adoptIntoActiveScene_(a);
			return a;
		} finally {
			r.release();
		}
	}
	/**
	* The load is asynchronous, so the scene that asked may already be gone by
	* the time the entities exist — adopting into whatever is active now is the
	* only owner that is real, and a switch that already happened takes it.
	*/
	adoptIntoActiveScene_(e) {
		const t = this.getScenes_();
		const n = t?.getActive();
		const r = n ? t?.getScene(n) : null;
		if (!r) return;
		for (const t of e.entities.values()) r.adopt(t);
	}
};
/**
* Aim each override at an entity this prefab actually has — and say so when one
* does not.
*
* `prefabEntityId` is a STABLE ADDRESS inside the prefab, and an override
* carrying one nobody answers to is dropped without a word: the bullet spawns,
* at the position the prefab was authored with, and the only symptom is that
* every one of them appears in the same place. Two things make that easy to
* write. `'0'` is the id every prefab had before stable ids, so it is what every
* older example still shows — and a prefab saved since gets a uuid instead. And
* the common case, spawning one sprite, has exactly one entity to aim at, so
* naming it at all is ceremony: an omitted id means the root.
*
* The editor's own instance path deliberately does NOT do this — an override
* left over from a since-deleted child is a normal thing to carry there. This is
* the RUNTIME spawn door, where the override was written moments ago by someone
* who can still fix it.
*/
function wa(e, t, n) {
	if (!n?.length) return void 0;
	const r = new Set(e.entities.map((e) => e.prefabEntityId));
	return n.map((n) => {
		if (!n.prefabEntityId) return {
			...n,
			prefabEntityId: e.rootEntityId
		};
		if (!r.has(n.prefabEntityId)) throw new Error(`prefab "${t}" has no entity "${n.prefabEntityId}" for this override (${n.type}${n.componentType ? ` ${n.componentType}.${n.propertyName}` : ""}). Its root is "${e.rootEntityId}" — or leave prefabEntityId out and the root is used. Entities: ${[...r].join(", ")}`);
		return n;
	});
}
/**
* Prefab instantiation, as a resource. Spawning from a prefab is asynchronous
* because its assets may not be loaded yet.
*
* @beta
*/
const Ta = k(null, "Prefabs");
var Ea = class {
	constructor() {
		this.name = "prefabs";
		this.dependencies = [j];
	}
	build(e) {
		e.insertResource(Ta, new Ca(e.world, () => e.getResource(j), () => e.hasResource(K) ? e.getResource(K) : null));
	}
};
const Da = new Ea();
//#endregion
//#region src/render/geometry.ts
let Oa = /* @__PURE__ */ function(e) {
	e[e["Float"] = 1] = "Float";
	e[e["Float2"] = 2] = "Float2";
	e[e["Float3"] = 3] = "Float3";
	e[e["Float4"] = 4] = "Float4";
	e[e["Int"] = 5] = "Int";
	e[e["Int2"] = 6] = "Int2";
	e[e["Int3"] = 7] = "Int3";
	e[e["Int4"] = 8] = "Int4";
	return e;
}({});
const ka = new _t("geometry");
let q = null;
let J = 0;
let Y = 0;
let Aa = 0;
const ja = 65536;
const Ma = 16384;
/** @internal Wired by the engine plugins — not part of the public API. */
function Na(e) {
	ka.connect(e);
	q = ka.module;
	J = q._malloc(ja * 4);
	Y = q._malloc(Ma * 4);
	Aa = q._malloc(256);
}
function Pa() {
	if (q) {
		if (J) q._free(J);
		if (Y) q._free(Y);
		if (Aa) q._free(Aa);
		J = 0;
		Y = 0;
		Aa = 0;
	}
	ka.disconnect();
	q = null;
}
function Fa() {
	if (!q) throw new Error("Geometry API not initialized. Call initGeometryAPI() first.");
	return q;
}
const Ia = {
	/**
	* Creates a new geometry with vertices and optional indices.
	* @param options Geometry creation options
	* @returns Geometry handle
	*/
	create(e) {
		const t = Fa();
		const n = t.geometry_create();
		if (n === 0) throw new Error("Failed to create geometry");
		const r = e.vertices.length;
		if (r * 4 > ja * 4) throw new Error(`Vertex data too large: ${r} floats (max ${ja})`);
		t.HEAPF32.set(e.vertices, J / 4);
		const i = e.layout.length;
		const a = new Int32Array(i);
		for (let t = 0; t < i; t++) a[t] = e.layout[t].type;
		new Int32Array(t.HEAPU8.buffer, Aa, i).set(a);
		t.geometry_init(n, J, r, Aa, i, e.dynamic ?? false);
		if (e.indices) {
			const r = e.indices.length;
			if (r * 4 > Ma * 4) throw new Error(`Index data too large: ${r} indices (max ${Ma})`);
			if (e.indices instanceof Uint16Array) {
				new Uint16Array(t.HEAPU8.buffer, Y, r).set(e.indices);
				t.geometry_setIndices16(n, Y, r);
			} else {
				new Uint32Array(t.HEAPU8.buffer, Y, r).set(e.indices);
				t.geometry_setIndices32(n, Y, r);
			}
		}
		return n;
	},
	/**
	* Updates vertices of a dynamic geometry.
	* @param handle Geometry handle
	* @param vertices New vertex data
	* @param offset Offset in floats
	*/
	updateVertices(e, t, n = 0) {
		const r = Fa();
		const i = t.length;
		if (i * 4 > ja * 4) throw new Error(`Vertex data too large: ${i} floats (max ${ja})`);
		r.HEAPF32.set(t, J / 4);
		r.geometry_updateVertices(e, J, i, n);
	},
	/**
	* Releases a geometry.
	* @param handle Geometry handle
	*/
	release(e) {
		if (e > 0) Fa().geometry_release(e);
	},
	/**
	* Checks if a geometry handle is valid.
	* @param handle Geometry handle
	* @returns True if valid
	*/
	isValid(e) {
		if (!q || e <= 0) return false;
		return q.geometry_isValid(e);
	},
	/**
	* Creates a unit quad geometry (1x1, centered at origin).
	* @returns Geometry handle
	*/
	createQuad(e = 1, t = 1) {
		const n = e / 2;
		const r = t / 2;
		return Ia.create({
			vertices: new Float32Array([
				-n,
				-r,
				0,
				0,
				n,
				-r,
				1,
				0,
				n,
				r,
				1,
				1,
				-n,
				r,
				0,
				1
			]),
			layout: [{
				name: "a_position",
				type: 2
			}, {
				name: "a_texCoord",
				type: 2
			}],
			indices: new Uint16Array([
				0,
				1,
				2,
				2,
				3,
				0
			])
		});
	},
	/**
	* Creates a circle geometry.
	* @param radius Circle radius
	* @param segments Number of segments
	* @returns Geometry handle
	*/
	createCircle(e = 1, t = 32) {
		const n = [];
		const r = [];
		n.push(0, 0, .5, .5);
		for (let r = 0; r <= t; r++) {
			const i = r / t * Math.PI * 2;
			const a = Math.cos(i) * e;
			const o = Math.sin(i) * e;
			const s = (Math.cos(i) + 1) / 2;
			const c = (Math.sin(i) + 1) / 2;
			n.push(a, o, s, c);
		}
		for (let e = 1; e <= t; e++) r.push(0, e, e + 1);
		return Ia.create({
			vertices: new Float32Array(n),
			layout: [{
				name: "a_position",
				type: 2
			}, {
				name: "a_texCoord",
				type: 2
			}],
			indices: new Uint16Array(r)
		});
	},
	/**
	* Creates a polygon geometry from vertices.
	* @param points Array of {x, y} points
	* @returns Geometry handle
	*/
	createPolygon(e) {
		if (e.length < 3) throw new Error("Polygon must have at least 3 points");
		let t = Infinity, n = Infinity;
		let r = -Infinity, i = -Infinity;
		for (const a of e) {
			t = Math.min(t, a.x);
			n = Math.min(n, a.y);
			r = Math.max(r, a.x);
			i = Math.max(i, a.y);
		}
		const a = r - t;
		const o = i - n;
		const s = [];
		for (const r of e) {
			const e = a > 0 ? (r.x - t) / a : 0;
			const i = o > 0 ? (r.y - n) / o : 0;
			s.push(r.x, r.y, e, i);
		}
		const c = [];
		for (let t = 1; t < e.length - 1; t++) c.push(0, t, t + 1);
		return Ia.create({
			vertices: new Float32Array(s),
			layout: [{
				name: "a_position",
				type: 2
			}, {
				name: "a_texCoord",
				type: 2
			}],
			indices: new Uint16Array(c)
		});
	}
};
//#endregion
//#region src/render/glDebug.ts
const La = new _t("glDebug");
let Ra = null;
/** @internal Wired by the engine plugins — not part of the public API. */
function za(e) {
	La.connect(e);
	Ra = La.module;
}
function Ba() {
	La.disconnect();
	Ra = null;
}
const Va = {
	enable() {
		Ra?.gl_enableErrorCheck(true);
	},
	disable() {
		Ra?.gl_enableErrorCheck(false);
	},
	check(e) {
		return Ra?.gl_checkErrors(e) ?? 0;
	},
	diagnose() {
		Ra?.renderer_diagnose();
	}
};
//#endregion
//#region src/app/corePlugin.ts
let Ha = null;
const Ua = {
	name: "engineCore",
	build(e) {
		const t = e.wasmModule;
		Je(t.getResourceManager(), t);
		Qe(Nt.textureCacheBudget);
		Ye(Nt.retainedBudget);
		Ha = Le(() => {
			Xe();
		});
		bt(t);
		Na(t);
		ht(t);
		Cn(t);
		ke(t);
		za(t);
		e.addSystemToSchedule(1, _([], Te, { name: "DeviceRestoredWatch" }));
	},
	cleanup() {
		we();
		Ha?.();
		Ha = null;
		Ot();
		Ba();
		De();
		Tn();
		Pa();
		mt();
		Ct();
		tt();
	}
};
const Wa = {
	viewProjection: /* @__PURE__ */ new Float32Array(16),
	vpX: 0,
	vpY: 0,
	vpW: 0,
	vpH: 0,
	screenW: 0,
	screenH: 0,
	worldLeft: 0,
	worldBottom: 0,
	worldRight: 0,
	worldTop: 0,
	worldMouseX: 0,
	worldMouseY: 0,
	valid: false,
	revision: 0
};
//#endregion
//#region src/app/access.ts
const Ga = (e) => e._name;
/** The component a query argument is about, whatever it is wrapped in. Anything
*  that is not one — a nested array from a mis-spelled `Query([...])` — is not
*  access, and guessing at it would put `undefined` in the set. */
function Ka(e) {
	const t = e._component ?? e;
	return typeof t?._name === "string" ? t : null;
}
const qa = (e) => e._type === "mut";
/** A resource's declared name — what `defineResource` stamped on it. */
const Ja = (e) => e?._name ?? String(e);
/** Read a system's declared access. Cheap, and re-read rather than cached: a
*  system may answer for the data currently loaded (see `touches`). */
function Ya(e) {
	const t = /* @__PURE__ */ new Set();
	const n = /* @__PURE__ */ new Set();
	const r = /* @__PURE__ */ new Set();
	const i = /* @__PURE__ */ new Set();
	let a = false;
	for (const o of e._params) switch (o._type) {
		case "query": {
			const e = o;
			e._components.forEach((e) => {
				const r = Ka(e);
				if (!r) return;
				(qa(e) ? n : t).add(Ga(r));
			});
			for (const n of [...e._with, ...e._without]) t.add(Ga(n));
			break;
		}
		case "removed":
			t.add(Ga(o._component));
			break;
		case "res":
			r.add(Ja(o._resource));
			break;
		case "res_mut":
			i.add(Ja(o._resource));
			break;
		case "get_world": a = true;
	}
	const o = e._touches;
	const s = typeof o === "function" ? o() : o;
	if (s) {
		for (const e of s.reads ?? []) t.add(e);
		for (const e of s.writes ?? []) n.add(e);
		a = s.opaque === true;
	}
	return {
		readsComponents: t,
		writesComponents: n,
		readsResources: r,
		writesResources: i,
		opaque: a
	};
}
const Xa = (e, t) => {
	const [n, r] = e.size <= t.size ? [e, t] : [t, e];
	for (const e of n) if (r.has(e)) return true;
	return false;
};
/**
* Whether two systems touch the same data in a way that makes their order
* matter: one writes what the other reads or writes.
*/
function Za(e, t) {
	if (e.opaque || t.opaque) return true;
	return Xa(e.writesComponents, t.writesComponents) || Xa(e.writesComponents, t.readsComponents) || Xa(e.readsComponents, t.writesComponents) || Xa(e.writesResources, t.writesResources) || Xa(e.writesResources, t.readsResources) || Xa(e.readsResources, t.writesResources);
}
/** What two conflicting systems disagree over, for a message that names it. */
function Qa(e, t) {
	if (e.opaque || t.opaque) return ["the World itself"];
	const n = /* @__PURE__ */ new Set();
	const r = (e, t) => {
		for (const r of e) if (t.has(r)) n.add(r);
	};
	r(e.writesComponents, t.writesComponents);
	r(e.writesComponents, t.readsComponents);
	r(e.readsComponents, t.writesComponents);
	r(e.writesResources, t.writesResources);
	r(e.writesResources, t.readsResources);
	r(e.readsResources, t.writesResources);
	return [...n].sort();
}
//#endregion
//#region src/app/ambiguity.ts
/**
* `edges[i]` lists the indices that must run BEFORE `i`. `runBefore` is folded
* in symmetrically, so both spellings of one relationship produce one edge.
*/
function $a(e, t) {
	const n = e.map(() => []);
	const r = (e, t) => {
		if (e === t) return;
		const r = n[t];
		if (!r.includes(e)) r.push(e);
	};
	for (let n = 0; n < e.length; n++) {
		for (const i of e[n].runAfter ?? []) for (const e of t(i)) r(e, n);
		for (const i of e[n].runBefore ?? []) for (const e of t(i)) r(n, e);
	}
	return n;
}
/**
* Everything that must run before each index, transitively.
*
* Exported because the schedule needs it for a second reason: a system may only
* start beside an unfinished one if it does not depend on it, and "depends on"
* has to include the edge it inherited rather than declared.
*/
function eo(e) {
	const t = e.map(() => /* @__PURE__ */ new Set());
	const n = new Uint8Array(e.length);
	const r = (i, a) => {
		if (n[i] || a.has(i)) return;
		a.add(i);
		for (const n of e[i]) {
			r(n, a);
			t[i].add(n);
			for (const e of t[n]) t[i].add(e);
		}
		a.delete(i);
		n[i] = 1;
	};
	for (let t = 0; t < e.length; t++) r(t, /* @__PURE__ */ new Set());
	return t;
}
/**
* Every pair of systems in one schedule that conflicts and is unordered.
*
* Reported in registration order and deduplicated, so a schedule's ambiguities
* are a stable list something can be held to.
*/
function to(e, t) {
	if (e.length < 2) return [];
	const n = eo($a(e, t));
	const r = e.map((e) => Ya(e.system));
	const i = [];
	for (let t = 0; t < e.length; t++) for (let a = t + 1; a < e.length; a++) {
		if (n[t].has(a) || n[a].has(t)) continue;
		if (!Za(r[t], r[a])) continue;
		i.push({
			a: e[t].system._name,
			b: e[a].system._name,
			over: Qa(r[t], r[a])
		});
	}
	return i;
}
/**
* Systems grouped into batches that could run at the same time: a batch is free
* of conflicts within itself and its dependencies are met by the batches before
* it.
*
* A measurement, not the plan: the schedule starts systems in sorted order and
* overlaps by this same rule, which shows on the clock only where a system
* awaits — a synchronous one finishes before the next can start.
*/
function no(e, t) {
	const n = $a(e, t);
	const r = e.map((e) => Ya(e.system));
	const i = new Int32Array(e.length).fill(-1);
	const a = [];
	let o = e.length;
	while (o > 0) {
		const t = [];
		for (let a = 0; a < e.length; a++) {
			if (i[a] >= 0) continue;
			if (n[a].some((e) => i[e] < 0)) continue;
			if (t.some((e) => Za(r[a], r[e]))) continue;
			t.push(a);
		}
		if (t.length === 0) break;
		for (const e of t) i[e] = a.length;
		a.push(t);
		o -= t.length;
	}
	return a.map((t) => t.map((t) => e[t].system._name));
}
//#endregion
//#region src/render/renderDemand.ts
/** Everything about the player's hands that can show in a picture, folded into one number that changes when any of it does. */
function ro(e) {
	let t = 17;
	const n = (e) => {
		t = Math.imul(t, 31) + (e | 0) + (e * 1024 | 0) | 0;
	};
	n(e.mouseX);
	n(e.mouseY);
	n(e.scrollDeltaX);
	n(e.scrollDeltaY);
	n(e.keysDown.size);
	n(e.keysPressed.size);
	n(e.keysReleased.size);
	n(e.mouseButtons.size);
	n(e.mouseButtonsPressed.size);
	n(e.mouseButtonsReleased.size);
	n(e.touches.size);
	n(e.touchesStarted.size);
	n(e.touchesEnded.size);
	for (const t of e.touches.values()) {
		n(t.x);
		n(t.y);
	}
	return t;
}
/** @experimental */
var io = class {
	constructor() {
		this.enabled_ = false;
		this.tailFrames_ = 30;
		this.remaining_ = 0;
		this.requested_ = false;
		this.holds_ = 0;
		this.lastWidth_ = -1;
		this.lastHeight_ = -1;
		this.lastWorldVersion_ = -1;
		this.lastInput_ = 0;
		this.drawn_ = 0;
		this.skipped_ = 0;
	}
	get enabled() {
		return this.enabled_;
	}
	/** Frames drawn and frames left out since this was turned on. */
	get stats() {
		return {
			drawn: this.drawn_,
			skipped: this.skipped_
		};
	}
	enable(e = {}) {
		this.enabled_ = true;
		this.tailFrames_ = Math.max(1, Math.floor(e.tailFrames ?? 30));
		this.remaining_ = this.tailFrames_;
		this.drawn_ = this.skipped_ = 0;
	}
	disable() {
		this.enabled_ = false;
	}
	/** Draw the next frame (and the tail after it): something changed that the engine could not see. */
	request() {
		this.requested_ = true;
	}
	/**
	* Draw every frame until the returned function is called: for what moves on its own (a tween, a video, an animation). Holds add up, so two
	* owners do not release each other's.
	*/
	hold() {
		++this.holds_;
		let e = false;
		return () => {
			if (e) return;
			e = true;
			this.holds_ = Math.max(0, this.holds_ - 1);
			this.requested_ = true;
		};
	}
	/** Asked once per frame, by the frame that would draw. False leaves the frame out; the screen keeps the last picture. */
	shouldRender(e) {
		if (!this.enabled_) return true;
		let t = this.requested_ || this.holds_ > 0 || e.pendingShaders > 0;
		this.requested_ = false;
		if (e.width !== this.lastWidth_ || e.height !== this.lastHeight_) t = true;
		if (e.worldVersion !== this.lastWorldVersion_) t = true;
		if (e.input) {
			if (e.input.keysDown.size > 0 || e.input.mouseButtons.size > 0 || e.input.touches.size > 0) t = true;
			const n = ro(e.input);
			if (n !== this.lastInput_) t = true;
			this.lastInput_ = n;
		}
		this.lastWidth_ = e.width;
		this.lastHeight_ = e.height;
		this.lastWorldVersion_ = e.worldVersion;
		if (t) this.remaining_ = this.tailFrames_;
		else if (this.remaining_ > 0) --this.remaining_;
		else {
			++this.skipped_;
			return false;
		}
		++this.drawn_;
		return true;
	}
};
//#endregion
//#region src/render/renderPipeline.ts
var ao = class {
	constructor() {
		this.frameElapsed_ = 0;
		this.renderingEnabled_ = true;
		this.demand = new io();
		this.lastWidth_ = 0;
		this.lastHeight_ = 0;
		this.activeScenes_ = null;
		this.preFlushCallbacks_ = [];
		this.screenOverlayCallbacks_ = [];
		this.postProcess_ = null;
		this.quality_ = null;
		this.applyQuality_ = null;
		this.warnedMissingPresent_ = false;
	}
	get frameElapsed() {
		return this.frameElapsed_;
	}
	/** @experimental */
	get renderingEnabled() {
		return this.renderingEnabled_;
	}
	/** @experimental */
	setRenderingEnabled(e) {
		this.renderingEnabled_ = e;
	}
	setQuality(e, t) {
		this.quality_ = e;
		this.applyQuality_ = t ?? null;
	}
	setActiveScenes(e) {
		this.activeScenes_ = e;
	}
	/**
	* Inject this App's post-process API (by PostProcessPlugin). When null, the
	* pipeline does no post-processing — it has no hard dependency on the
	* post-process subsystem.
	*/
	setPostProcess(e) {
		this.postProcess_ = e;
	}
	/** The optional projection is the current pass; legacy manual hosts may omit it. */
	addPreFlushCallback(e) {
		this.preFlushCallbacks_.push(e);
	}
	/**
	* Register geometry a plugin draws into the SCREEN overlay rather than into a
	* camera — the sibling of {@link addPreFlushCallback}, separate for the same
	* reason the two collects are: a callback that ran in both would put the same
	* glyph in each list. Runs between the overlay's collect and its pass.
	*/
	addScreenOverlayCallback(e) {
		this.screenOverlayCallbacks_.push(e);
	}
	/**
	* Run what plugins registered to draw just before the frame flushes (glyph
	* quads, today). {@link submitScene} calls this in the middle of its own
	* sequence; a host that owns its render loop in C++ — the native one — calls
	* it directly at the same point, between collecting the scene and flushing,
	* so text lands in the same frame either way.
	*/
	runPreFlushCallbacks(e, t) {
		for (const n of this.preFlushCallbacks_) n(e, t);
	}
	beginFrame(e = 0) {
		this.frameElapsed_ = e;
		this.applyQuality_?.();
		this.quality_?.setLimitation("fixed-render-resolution", false);
		this.quality_?.setLimitation("resolution-present-unavailable", false);
		this.postProcess_?.setQualityFilter(this.quality_?.enabled ? this.quality_.profile : null);
		M.beginFrame(e);
	}
	/**
	* Closes the frame. The pair of {@link beginFrame}, and the last thing a
	* frame does: a backend that borrows the swapchain image for a frame gives it
	* back here, so everything drawn after the first camera — a second camera,
	* the screen post stack, the overlay — still has somewhere to land.
	*/
	endFrame() {
		M.endFrame();
	}
	/**
	* The frame's screen-space overlay: one pass, after every camera and after
	* post. It takes a projection and a rect and no camera, which is what makes a
	* HUD hold still while the view moves. Silent when the core has no overlay
	* pass, which has not partitioned the domains either.
	*/
	renderScreenOverlay(e, t, n = 0) {
		if (!t.active || t.vpW === 0 || t.vpH === 0) return;
		if (!M.hasScreenOverlay()) return;
		M.beginScreenOverlay(t.projection, t.vpX, t.vpY, t.vpW, t.vpH);
		M.setCullingMask(t.layerMask);
		M.submitScreenOverlay(e);
		for (const n of this.screenOverlayCallbacks_) n(e, t.projection);
		M.endScreenOverlay(n);
	}
	beginScreenCapture() {
		const e = this.postProcess_;
		if (e && e.screenStack && e.screenStack.enabledPassCount > 0) {
			if (!e.isInitialized()) e.init(1, 1);
			e._applyScreenStack();
			e._beginScreenCapture();
		}
	}
	endScreenCapture() {
		const e = this.postProcess_;
		if (e && e.screenStack && e.screenStack.enabledPassCount > 0) {
			e._endScreenCapture();
			e._executeScreenPasses();
		}
	}
	submitScene(e, t, n, r) {
		this.executePreSceneDrawCallbacks(t, n, r);
		M.updateTransforms(e);
		M.submitAll(e, n.x, n.y, n.w, n.h);
		this.runPreFlushCallbacks(e, t);
		M.flush();
		this.executeDrawCallbacks(t, n, r, e._cpp);
	}
	render(e) {
		const { registry: t, viewProjection: n, width: r, height: i, elapsed: a } = e;
		if (r !== this.lastWidth_ || i !== this.lastHeight_) {
			M.resize(r, i);
			this.lastWidth_ = r;
			this.lastHeight_ = i;
		}
		if (!e.frameAlreadyBegun) M.beginFrame(a);
		M.setViewport(0, 0, r, i);
		M.begin(n, 0, 3, e.clearColor);
		M.setCullingMask(4294967295);
		M.setViewId(0);
		this.submitScene(t, n, {
			x: 0,
			y: 0,
			w: r,
			h: i
		}, a);
		M.end();
	}
	renderCamera(e) {
		const { registry: t, viewProjection: n, viewportPixels: r, clearFlags: i, elapsed: a, cameraEntity: o } = e;
		let s = Mn(e.renderPolicy ?? 0, e.worldHeight ?? 0, r.w, r.h);
		const c = this.quality_;
		const l = c?.renderScale ?? 1;
		const u = (e.renderPolicy ?? 0) !== 0;
		const d = l < 1 && !u && !e.renderTarget;
		if (l < 1 && u) c?.setLimitation("fixed-render-resolution", true);
		if (d && !this.postProcess_) c?.setLimitation("resolution-present-unavailable", true);
		if (d && this.postProcess_) s = {
			...s,
			renderWidth: Math.max(1, Math.round(r.w * l)),
			renderHeight: Math.max(1, Math.round(r.h * l)),
			oneToOne: false
		};
		if (!s.oneToOne && !this.postProcess_) {
			if (!this.warnedMissingPresent_) {
				A.warn("render", "Resolution policy needs post-processing; using surface resolution");
				this.warnedMissingPresent_ = true;
			}
			s = Mn(0, 0, r.w, r.h);
		}
		const f = s.oneToOne ? r : {
			x: 0,
			y: 0,
			w: s.renderWidth,
			h: s.renderHeight
		};
		const p = s.oneToOne ? r : {
			x: r.x + s.x,
			y: r.y + s.y,
			w: s.width,
			h: s.height
		};
		const m = this.postProcess_;
		m?.setQualityFilter(c?.enabled ? c.profile : null);
		const h = m !== null && o !== void 0 && m.getStack(o) !== null;
		const g = m !== null && (h || !s.oneToOne);
		if (g) {
			if (!m.isInitialized()) m.init(1, 1);
			if (h) m._applyForCamera(o);
		}
		if (m?.isInitialized()) {
			m.resize(f.w, f.h);
			m.setOutputViewport(p.x, p.y, p.w, p.h);
			m.setPresentRequired(!s.oneToOne);
		}
		if (g) m.begin();
		M.setViewport(f.x, f.y, f.w, f.h);
		M.begin(e.renderViewProjection ?? n, e.renderTarget ?? 0, i, e.clearColor, f);
		M.setCullingMask(e.cullingMask ?? 4294967295);
		M.setViewId(o ?? 0);
		this.submitScene(t, n, f, a);
		M.end();
		if (g) {
			m.end();
			if (h) m._resetAfterCamera();
		}
	}
	executePreSceneDrawCallbacks(e, t, n) {
		const r = Et();
		if (r.size === 0 || !Tt()) return;
		St.begin(e, t.w, t.h);
		const i = [];
		for (const [e, a] of r.entries()) try {
			a({
				width: t.w,
				height: t.h,
				elapsed: n
			});
		} catch (t) {
			A.error("render", `pre-scene callback '${e}' error`, t);
			i.push(e);
		}
		St.end();
		for (const e of i) vt(e);
	}
	executeDrawCallbacks(e, t, n, r) {
		const i = wt();
		if (i.size > 0 && Tt()) {
			kt(e, t.w, t.h);
			const a = [];
			for (const [o, s] of i.entries()) {
				if (s.registry !== void 0 && s.registry !== r) continue;
				if (s.scene && this.activeScenes_ && !this.activeScenes_.has(s.scene)) continue;
				try {
					s.fn(n, {
						viewProjection: e,
						width: t.w,
						height: t.h
					});
				} catch (e) {
					A.error("render", `callback '${o}' error`, e);
					a.push(o);
				}
			}
			yt();
			for (const e of a) Dt(e);
		}
	}
};
//#endregion
//#region src/scene/sceneStreaming.ts
/**
* @file    sceneStreaming.ts
* @brief   Proximity-driven scene streaming over the SceneManager primitives.
*
* Large/open worlds split into cells, each an additively-loaded scene. A focus
* point (usually the player/camera) drives which cells are resident: cells within
* `loadRadius` of the focus are brought in, cells past `unloadRadius` are dropped.
* The two radii form a hysteresis band so a focus hovering at a boundary does not
* thrash. This is pure orchestration — it owns no loading itself, only calls the
* existing `loadAdditive`/`unload`/`sleep`/`wake` primitives.
*/
/**
* Decide which cells cross the load/unload thresholds this tick. A cell becomes
* active when its edge is within `loadRadius`; an active cell deactivates only
* once its edge passes `unloadRadius` (hysteresis). Cells inside the band keep
* their current state. Pure.
*
* A cell is a sphere, not a circle: measuring in two axes makes every floor of a
* tower the same place, so a world stacked in depth holds all of it resident at
* once. Both z default to 0, which is where a flat game's cells and focus are —
* the third term vanishes and the answer is the plane one.
*/
function oo(e, t, n, r, i, a, o = 0) {
	const s = [];
	const c = [];
	for (const l of e) {
		const e = Math.max(0, Math.hypot(t - l.x, n - l.y, o - (l.z ?? 0)) - l.radius);
		const u = a.has(l.scene);
		if (!u && e <= r) s.push(l.scene);
		else if (u && e > i) c.push(l.scene);
	}
	return {
		toActivate: s,
		toDeactivate: c
	};
}
var so = class {
	constructor(e, t) {
		this.cells_ = /* @__PURE__ */ new Map();
		this.active_ = /* @__PURE__ */ new Set();
		this.inFlight_ = /* @__PURE__ */ new Set();
		this.focusX_ = 0;
		this.focusY_ = 0;
		this.focusZ_ = 0;
		this.loadRadius_ = 0;
		this.unloadRadius_ = 0;
		this.policy_ = "unload";
		this.focusEntity_ = null;
		this.host_ = e;
		if (t) this.configure(t);
	}
	configure(e) {
		this.loadRadius_ = e.loadRadius;
		this.unloadRadius_ = Math.max(e.loadRadius, e.unloadRadius);
		this.policy_ = e.policy ?? "unload";
	}
	register(e) {
		this.cells_.set(e.scene, e);
	}
	unregister(e) {
		this.cells_.delete(e);
		this.active_.delete(e);
	}
	clear() {
		this.cells_.clear();
		this.active_.clear();
		this.inFlight_.clear();
		this.focusEntity_ = null;
	}
	/** Set the focus directly (or let the streaming system read a focus entity).
	*  @p z defaults to the plane a flat game's cells sit on. */
	setFocus(e, t, n = 0) {
		this.focusX_ = e;
		this.focusY_ = t;
		this.focusZ_ = n;
	}
	/** Follow an entity; the streaming system reads its Transform each tick. */
	setFocusEntity(e) {
		this.focusEntity_ = e;
	}
	getFocusEntity() {
		return this.focusEntity_;
	}
	/** Scenes the controller currently holds in-range. */
	getActive() {
		return [...this.active_];
	}
	/** Reconcile resident cells against the current focus. Idempotent per tick. */
	update() {
		if (this.cells_.size === 0) return;
		const e = oo([...this.cells_.values()], this.focusX_, this.focusY_, this.loadRadius_, this.unloadRadius_, this.active_, this.focusZ_);
		for (const t of e.toActivate) {
			this.active_.add(t);
			this.activate_(t);
		}
		for (const t of e.toDeactivate) {
			this.active_.delete(t);
			this.deactivate_(t);
		}
	}
	activate_(e) {
		if (this.policy_ === "sleep" && this.host_.isSleeping(e)) {
			this.host_.wake(e);
			return;
		}
		if (this.host_.isLoaded(e) || this.inFlight_.has(e)) return;
		this.inFlight_.add(e);
		Promise.resolve(this.host_.loadAdditive(e)).then(() => {
			this.inFlight_.delete(e);
			if (!this.active_.has(e)) this.deactivate_(e);
		}, () => {
			this.inFlight_.delete(e);
		});
	}
	deactivate_(e) {
		if (this.policy_ === "sleep") {
			if (this.host_.isLoaded(e)) this.host_.sleep(e);
			return;
		}
		if (!this.host_.isLoaded(e) || this.inFlight_.has(e)) return;
		this.inFlight_.add(e);
		Promise.resolve(this.host_.unload(e)).then(() => {
			this.inFlight_.delete(e);
			if (this.active_.has(e)) this.activate_(e);
		}, () => {
			this.inFlight_.delete(e);
		});
	}
};
const co = k(null, "SceneStreaming");
//#endregion
//#region src/residency/cells.ts
/** The plane a manifest's cells lie on, a manifest cooked before the field existing as the ground. @experimental */
function lo(e) {
	return e?.plane === "xy" ? "xy" : "xz";
}
/** The second coordinate of a world position on a plane: z on the ground, y on the screen. @experimental */
function uo(e, t) {
	return t === "xy" ? e.y : e.z ?? 0;
}
/**
* The cell a world position falls in — the one rule, with two callers that must
* not drift: the cook assigns every top-level root by it, and the editor draws
* its grid from it. `z` is the position's SECOND coordinate on the plane the
* world is cut on: world z on the ground, world y on the screen plane.
*/
function fo(e, t, n) {
	return {
		x: Math.floor(e / n),
		z: Math.floor(t / n)
	};
}
/**
* The grid square one cell coordinate stands for.
*
* NOT the same as {@link WorldCell}'s box: a cooked cell's box is this square
* unioned with where its content actually reached, so it is usually larger. This
* is the partition; that is the partition plus its overhang.
*/
function po(e, t, n) {
	const r = e * n;
	const i = t * n;
	return {
		minX: r,
		minZ: i,
		maxX: r + n,
		maxZ: i + n
	};
}
/**
* Ground-plane distance from a point to a cell's box; zero inside it.
*
* To the BOX rather than to the cell's centre, because a centre answers the same
* for a source standing on a diagonal corner as for one a whole cell away, and
* that is where holes open in a world laid out on a grid.
*/
function mo(e, t, n) {
	const r = Math.max(e.minX - t, 0, t - e.maxX);
	const i = Math.max(e.minZ - n, 0, n - e.maxZ);
	return Math.hypot(r, i);
}
/**
* Which cells should exist, given where the sources are and what is resident.
*
* A UNION, never a fold: a fold lets the last source win, and a second camera
* then deletes the world the first is standing in. The band is the other half —
* in at `loadRadius`, out past `unloadRadius`, so a boundary is not a treadmill.
*/
function ho(e, t, n) {
	const r = [];
	const i = [];
	const a = [];
	/** Demanded-and-absent cells with how far the nearest source is. */
	const o = [];
	for (const s of e) {
		let e = false;
		let c = false;
		let l = false;
		let u = Infinity;
		for (const n of t) {
			const t = mo(s, n.x, n.z);
			if (t < u) u = t;
			if (t <= n.loadRadius) e = true;
			else if (t <= Math.max(n.loadRadius, n.unloadRadius)) c = true;
			if (t <= Math.max(n.loadRadius, n.prefetchRadius)) l = true;
		}
		if (l) i.push(s.name);
		const d = n.has(s.name);
		if (e || c && d) {
			r.push(s.name);
			if (!d) o.push({
				name: s.name,
				distance: u
			});
		} else if (d) a.push(s.name);
	}
	o.sort((e, t) => e.distance - t.distance);
	return {
		target: r,
		prefetch: i,
		toLoad: o.map((e) => e.name),
		toUnload: a
	};
}
//#endregion
//#region src/render/renderReadiness.ts
/** Whether two claims describe the same requirements under the same epoch. */
function go(e, t) {
	return e.digestLo === t.digestLo && e.digestHi === t.digestHi && e.programEpoch === t.programEpoch;
}
//#endregion
//#region src/residency/WorldStreamer.ts
/**
* @file    WorldStreamer.ts
* @brief   The one thing that decides which cells of a cooked world exist.
*
* @details Residency has a single author. Renderers do not load places, AI does
*          not unload them, and an entity never decides it is far enough away to
*          delete itself — every one of those is a second author, and two authors
*          of existence is how a world ends up holding entities nobody can name.
*
*          A cell is an additively-loaded scene, so bringing one in and taking it
*          out is the scene lifecycle transaction that already exists: one
*          teardown protocol, idempotent, with the cell's asset receipts owned by
*          the cell's own scope. Unloading is a real destroy — not a visibility
*          flag — which is the whole reason a cell is a scene rather than a list
*          of things to hide.
*/
var _o = class {
	constructor(e) {
		this.manifest_ = null;
		this.cells_ = /* @__PURE__ */ new Map();
		this.sourceCount_ = 0;
		this.loadCount_ = 0;
		this.unloadCount_ = 0;
		this.prepareCount_ = 0;
		this.cancelCount_ = 0;
		this.cancelledRefs_ = 0;
		this.prefetchRequests_ = 0;
		this.prefetchHits_ = 0;
		this.prefetchMisses_ = 0;
		this.lastDemandToResident_ = 0;
		this.operations_ = /* @__PURE__ */ new Set();
		this.clearPromise_ = null;
		this.clearing_ = false;
		this.manifestRequest_ = 0;
		this.host_ = e;
	}
	/** Adopt a cooked world after the previous world's operations and receipts drain. The latest request wins. */
	async loadManifest(e, t) {
		const n = ++this.manifestRequest_;
		if (this.cells_.size > 0 || this.clearing_) await this.clearCells_();
		if (n !== this.manifestRequest_) return;
		this.manifest_ = e;
		this.cells_.clear();
		for (const n of e.cells) {
			this.host_.register(t?.(n) ?? {
				name: n.name,
				path: n.path
			});
			this.cells_.set(n.name, {
				cell: n,
				residency: "unloaded",
				desired: false,
				speculated: false,
				assetsReady: false,
				renderReadiness: null,
				readinessInFlight: false,
				restamps: 0,
				phases: {},
				issuedAt: 0,
				delivery: 0,
				demandedAt: 0,
				preparedAt: 0,
				publishedAt: 0,
				prepareMs: 0,
				publishMs: 0,
				demandToResidentMs: 0,
				dwellMs: 0,
				outcome: ""
			});
		}
	}
	get manifest() {
		return this.manifest_;
	}
	residencyOf(e) {
		return this.cells_.get(e)?.residency ?? "unloaded";
	}
	/**
	* The render-program claim a cell holds, or null when it holds none.
	*
	* A cell on a host with no renderer holds NONE — the obligation did not
	* apply, which is a different fact from a claim that succeeded and must stay
	* distinguishable from one. Publication reads this to re-check freshness.
	*
	* @experimental
	*/
	renderReadinessOf(e) {
		return this.cells_.get(e)?.renderReadiness ?? null;
	}
	/**
	* How often publication found this cell's claim stale and made a new one.
	*
	* Zero across a dwell where nothing moved: readying again for content that
	* did not change is the cost prefetching exists to avoid paying twice.
	*
	* @experimental
	*/
	restampsOf(e) {
		return this.cells_.get(e)?.restamps ?? 0;
	}
	/**
	* Where a cell's load spent its time.
	*
	* Most of a load runs BETWEEN frames — off every system timer there is — so a
	* profiler watching the frame loop sees the cost and cannot name it.
	*/
	recordPhase(e, t, n) {
		const r = this.cells_.get(e);
		if (r) r.phases[t] = (r.phases[t] ?? 0) + n;
	}
	/**
	* Per cell: where its last delivery spent its time.
	*
	* Per CELL and not a running average, because the question prefetch answers
	* is asked one arrival at a time: a mean over hits and misses together
	* describes no arrival that happened.
	*/
	delivery() {
		const e = {};
		for (const [t, n] of this.cells_) {
			if (n.delivery === 0 && Object.keys(n.phases).length === 0) continue;
			e[t] = {
				phases: { ...n.phases },
				deliveryMs: n.delivery,
				prepareMs: n.prepareMs,
				publishMs: n.publishMs,
				demandToResidentMs: n.demandToResidentMs,
				dwellMs: n.dwellMs,
				outcome: n.outcome
			};
		}
		return e;
	}
	/**
	* Reconcile residency against where the sources are.
	*
	* The sources arrive as a list and are unioned, never folded: a fold gives
	* the last one written the whole answer, and then a second camera deletes
	* the world the first is standing in.
	*/
	update(e) {
		if (this.clearing_) return;
		this.sourceCount_ = e.length;
		if (this.cells_.size === 0) return;
		const t = /* @__PURE__ */ new Set();
		for (const [e, n] of this.cells_) if (n.residency === "resident" || n.residency === "publishing") t.add(e);
		const n = [];
		for (const e of this.cells_.values()) n.push(e.cell);
		const r = ho(n, e, t);
		const i = new Set(r.target);
		const a = new Set(r.prefetch);
		const o = performance.now();
		for (const [e, t] of this.cells_) {
			const n = i.has(e);
			if (n && !t.desired) this.demand_(t, o);
			t.desired = n;
			t.speculated = a.has(e);
		}
		for (const e of r.toLoad) this.step_(e);
		for (const e of r.prefetch) if (!i.has(e)) this.step_(e);
		for (const e of r.toUnload) this.step_(e);
		for (const [e, t] of this.cells_) if ((t.residency === "prepared" || t.residency === "preparing") && !t.desired && !t.speculated) this.step_(e);
	}
	/** Drain every cell and preparation; registrations remain reusable by a later update. Cancels pending adoption. */
	clear() {
		this.manifestRequest_++;
		return this.clearCells_();
	}
	clearCells_() {
		if (this.clearPromise_) return this.clearPromise_;
		this.clearing_ = true;
		this.sourceCount_ = 0;
		for (const e of this.cells_.values()) {
			e.desired = false;
			e.speculated = false;
		}
		this.clearPromise_ = (async () => {
			for (const e of this.cells_.keys()) this.step_(e);
			while (this.operations_.size > 0) await Promise.allSettled([...this.operations_]);
			const e = [...this.cells_].filter(([, e]) => e.residency !== "unloaded");
			if (e.length > 0) throw new Error(`World residency could not release: ${e.map(([e]) => e).join(", ")}`);
		})().finally(() => {
			this.clearing_ = false;
			this.clearPromise_ = null;
		});
		return this.clearPromise_;
	}
	/** Track host operations through their completion handlers so replacement cannot reuse a live scene name. */
	run_(e, t, n) {
		let r;
		try {
			r = Promise.resolve(e());
		} catch (e) {
			r = Promise.reject(e);
		}
		const i = r.then(t, n);
		this.operations_.add(i);
		i.then(() => {
			this.operations_.delete(i);
		}, (e) => {
			this.operations_.delete(i);
			A.error("residency", "cell completion failed", e);
		});
	}
	status() {
		const e = [];
		const t = [];
		const n = [];
		const r = [];
		const i = [];
		const a = [];
		for (const [o, s] of this.cells_) {
			if (s.desired) e.push(o);
			if (s.speculated) t.push(o);
			if (s.residency === "resident") n.push(o);
			else if (s.residency === "prepared") r.push(o);
			else if (s.residency === "preparing" || s.residency === "publishing") i.push(o);
			else if (s.residency === "unloading") a.push(o);
		}
		return {
			cellCount: this.cells_.size,
			sourceCount: this.sourceCount_,
			desiredCells: e,
			prefetchCells: t,
			residentCells: n,
			preparedCells: r,
			loadingCells: i,
			unloadingCells: a,
			loadCount: this.loadCount_,
			unloadCount: this.unloadCount_,
			prepareCount: this.prepareCount_,
			cancelCount: this.cancelCount_,
			prefetchRequests: this.prefetchRequests_,
			cancelledRefs: this.cancelledRefs_,
			prefetchHits: this.prefetchHits_,
			prefetchMisses: this.prefetchMisses_,
			lastDemandToResidentMs: this.lastDemandToResident_
		};
	}
	/**
	* A cell has just been asked for, and what the ask FINDS is the hit.
	*
	* Not judged at publication: "prepared by the time we published it" is true
	* of every cell that ever loads. Only readiness that already existed when
	* the ask arrived took anything off the wait.
	*/
	demand_(e, t) {
		e.demandedAt = t;
		if (e.residency === "resident" || e.residency === "publishing") return;
		if (e.residency === "prepared") {
			this.prefetchHits_++;
			e.outcome = "hit";
			e.dwellMs = t - e.preparedAt;
		} else {
			this.prefetchMisses_++;
			e.outcome = "miss";
			e.dwellMs = 0;
		}
	}
	/**
	* Move one cell toward what it should be, or leave it alone while an earlier
	* move is still in flight. Re-entered when that move finishes, which is what
	* lets a source that turned around re-issue the opposite one — without this,
	* a cell whose load was overtaken stays resident forever.
	*/
	step_(e) {
		const t = this.cells_.get(e);
		if (!t) return;
		if (t.readinessInFlight) return;
		if (t.residency === "preparing") {
			if (t.assetsReady) if (!t.desired && !t.speculated) this.discardPrepared_(e, t);
			else this.settleReadiness_(e, t);
			return;
		}
		if (t.residency === "publishing" || t.residency === "unloading") return;
		if (t.residency === "unloaded" && (t.desired || t.speculated)) this.beginPrepare_(e, t);
		else if (t.residency === "prepared" && t.desired) this.publishWhenReady_(e, t);
		else if (t.residency === "prepared" && !t.speculated) this.discardPrepared_(e, t);
		else if (t.residency === "resident" && !t.desired) this.beginUnload_(e, t);
	}
	discardPrepared_(e, t) {
		this.cancelledRefs_ += this.host_.discardPrepared(e);
		t.residency = "unloaded";
		t.assetsReady = false;
		t.renderReadiness = null;
		this.cancelCount_++;
	}
	beginPrepare_(e, t) {
		t.residency = "preparing";
		t.phases = {};
		t.issuedAt = performance.now();
		t.prepareMs = 0;
		t.publishMs = 0;
		t.demandToResidentMs = 0;
		this.prepareCount_++;
		if (!t.desired) {
			this.prefetchRequests_++;
			t.outcome = "";
			t.dwellMs = 0;
		}
		t.assetsReady = false;
		t.renderReadiness = null;
		this.run_(() => this.host_.prepare(e), () => {
			t.assetsReady = true;
			this.step_(e);
		}, (n) => {
			t.residency = "unloaded";
			t.assetsReady = false;
			A.error("residency", `cell "${e}" did not prepare`, n);
		});
	}
	/**
	* Pay the render-program obligation, or leave it owed.
	*
	* A debt rather than an event: a claim that could not be made leaves the cell
	* in `preparing` with its assets intact, and the next progression tries
	* again. Dropping it would strip a preparation that had almost finished.
	*/
	settleReadiness_(e, t) {
		const n = this.host_.readyRenderPrograms;
		if (!n) {
			this.markPrepared_(e, t);
			return;
		}
		t.readinessInFlight = true;
		this.run_(() => this.askReadiness_(e, n), (n) => {
			t.readinessInFlight = false;
			if (!t.desired && !t.speculated) {
				this.discardPrepared_(e, t);
				return;
			}
			if (!n.applicable) {
				this.markPrepared_(e, t);
				return;
			}
			if (!n.stamp) {
				A.warn("residency", `cell "${e}" readied no render programs; still owed`);
				return;
			}
			t.renderReadiness = n.stamp;
			this.markPrepared_(e, t);
		}, (n) => {
			t.readinessInFlight = false;
			A.error("residency", `cell "${e}" could not ready its programs`, n);
			if (!t.desired && !t.speculated) this.step_(e);
		});
	}
	/**
	* Ask the host to ready a cell's programs, as a promise either way.
	*
	* A host that throws SYNCHRONOUSLY would otherwise unwind through the
	* progression and leave the streamer mid-step. A failed readying is an
	* outcome this handles, not one it propagates.
	*/
	askReadiness_(e, t) {
		const n = performance.now();
		try {
			return Promise.resolve(t.call(this.host_, e));
		} catch (e) {
			return Promise.reject(e);
		} finally {
			this.recordPhase(e, "readying", performance.now() - n);
		}
	}
	/** Every obligation is satisfied: only now is the cell prepared. */
	markPrepared_(e, t) {
		t.residency = "prepared";
		t.preparedAt = performance.now();
		t.prepareMs = t.preparedAt - t.issuedAt;
		this.step_(e);
	}
	/**
	* The obligation publication has, which is not the one preparation had.
	*
	* A claim about THEN, so requirements are derived AGAIN rather than inferred
	* from what looks like it moved. A stale one blocks this publication without
	* sending the cell backwards; an unpayable debt leaves it prepared.
	*/
	publishWhenReady_(e, t) {
		const n = this.host_.readyRenderPrograms;
		if (!n || !t.renderReadiness) {
			this.beginLoad_(e, t);
			return;
		}
		if (t.readinessInFlight) return;
		t.readinessInFlight = true;
		this.run_(() => this.askReadiness_(e, n), (n) => {
			t.readinessInFlight = false;
			if (!t.desired) {
				this.step_(e);
				return;
			}
			if (!n.applicable) {
				this.beginLoad_(e, t);
				return;
			}
			if (!n.stamp) {
				A.warn("residency", `cell "${e}" cannot publish: its programs are not ready`);
				return;
			}
			if (!go(t.renderReadiness, n.stamp)) {
				t.renderReadiness = n.stamp;
				t.restamps++;
			}
			this.beginLoad_(e, t);
		}, (n) => {
			t.readinessInFlight = false;
			A.error("residency", `cell "${e}" could not re-ready its programs`, n);
			if (!t.desired) this.step_(e);
		});
	}
	beginLoad_(e, t) {
		t.residency = "publishing";
		t.publishedAt = performance.now();
		this.loadCount_++;
		this.run_(() => this.host_.loadAdditive(e), () => {
			const n = performance.now();
			t.residency = "resident";
			t.delivery = n - t.issuedAt;
			t.publishMs = n - t.publishedAt;
			if (t.demandedAt > 0) {
				t.demandToResidentMs = n - t.demandedAt;
				this.lastDemandToResident_ = t.demandToResidentMs;
			}
			this.step_(e);
		}, (n) => {
			t.residency = "unloaded";
			A.error("residency", `cell "${e}" did not load`, n);
		});
	}
	beginUnload_(e, t) {
		t.residency = "unloading";
		this.unloadCount_++;
		this.run_(() => this.host_.unload(e, { keepPersistent: false }), () => {
			t.residency = "unloaded";
			this.step_(e);
		}, (n) => {
			t.residency = this.host_.isLoaded(e) ? "resident" : "unloaded";
			A.error("residency", `cell "${e}" did not unload`, n);
		});
	}
};
/** The world's residency authority. @experimental */
const vo = k(null, "WorldStreaming");
//#endregion
//#region src/residency/residencyPlugin.ts
/**
* Sample every enabled source and hand the whole list to the streamer.
*
* A list, not a focus: the streamer unions them. Exported because this is the
* only place a `Transform` becomes a residency ask, which is what the criterion
* for "a second source cannot delete the first one's world" has to reach.
*/
const yo = _([xe(vo), se()], (e, t) => {
	if (e.manifest === null) return;
	t.ensureTransformsComposed();
	const n = lo(e.manifest);
	const r = [];
	for (const e of t.getEntitiesWithComponents([Yt, E])) {
		const i = t.get(e, Yt);
		if (!i.enabled) continue;
		const a = t.get(e, E);
		const o = a.worldPosition ?? a.position;
		r.push({
			x: o.x,
			z: uo(o, n),
			loadRadius: i.loadRadius,
			unloadRadius: i.unloadRadius,
			prefetchRadius: i.prefetchRadius
		});
	}
	e.update(r);
}, {
	name: "WorldResidencySystem",
	touches: { reads: ["Transform", "WorldStreamingSource"] }
});
/**
* Residency, over the scene manager's primitives.
*
* `PostUpdate`: a source's ask is about where it ended this frame, and reading it
* before movement asks for the world it was in last frame — which at a boundary
* is the wrong side of it.
*/
const bo = {
	name: "worldResidency",
	profileDomain: "scene",
	dependencies: [K],
	build(e) {
		e.insertResource(vo, new _o(e.getResource(K)));
		e.addSystemToSchedule(4, yo, { runIf: N });
	}
};
//#endregion
//#region src/scene/ai-builtins.ts
/**
* @file    scene/ai-builtins.ts
* @brief   The `.esfsm` / `.esbt` / `.esgraph` → SceneManager bridge.
*
* Changing scene is the one thing gameplay needs that no component can express:
* it retires the world those components live in. Registered from the scene side
* (scene → ai, one direction) so the `ai` module never learns about scenes;
* idempotent and namespaced, so game-registered names win.
*/
const xo = {
	name: "fade",
	type: "number",
	tooltip: "Seconds to fade through; 0 cuts straight over"
};
/**
* Register the scene verbs. Idempotent (and safe after an `aiRegistry.clear()`):
* each name registers only if absent.
*/
function So() {
	Co("scene.load", [{
		name: "scene",
		type: "string"
	}, xo], (e, t) => {
		const n = typeof t?.scene === "string" ? t.scene.trim() : "";
		if (!n) return;
		e.switchTo(n, wo(t?.fade));
	});
	Co("scene.reload", [xo], (e, t) => {
		e.reload(wo(t?.fade));
	});
}
function Co(e, t, n) {
	if (ln.hasAction(e)) return;
	ln.registerAction(e, {
		params: t,
		touches: { opaque: true },
		run: (t, r, i, a) => {
			const o = t.commands?.resource(K) ?? null;
			if (!o) {
				A.warn("scene", `${e}: no SceneManager to reach`);
				return;
			}
			n(o, a);
		}
	});
}
/** A fade of `seconds`, or an immediate cut when there is none to speak of. */
function wo(e) {
	const t = Number(e ?? 0);
	return t > 0 ? {
		transition: "fade",
		duration: t
	} : void 0;
}
//#endregion
//#region src/scene/scenePlugin.ts
const To = _([ve(K), xe(O)], (e, t) => {
	e.get().updateTransition(t.delta);
}, { name: "SceneTransitionSystem" });
const Eo = _([xe(co), se()], (e, t) => {
	const n = e.getFocusEntity();
	if (n != null && t.valid(n) && t.has(n, E)) {
		const r = t.get(n, E);
		e.setFocus(r.position.x, r.position.y, r.position.z);
	}
	e.update();
}, {
	name: "SceneStreamingSystem",
	touches: { reads: ["Transform"] }
});
const Do = {
	name: "sceneManager",
	profileDomain: "scene",
	cleanup(e) {
		if (e.hasResource(K)) e.getResource(K).reset();
	},
	build(e) {
		So();
		const t = new ba(e);
		e.insertResource(K, t);
		e.insertResource(co, new so(t));
		e.addPlugin(bo);
		const n = {
			_id: Symbol("SceneInitSystem"),
			_name: "SceneInitSystem",
			_params: [],
			_fn: () => {
				const t = e.getResource(K);
				const n = t.getInitial();
				if (n) t.load(n).catch((e) => {
					A.error("scene", "Failed to load initial scene", e);
				});
			}
		};
		e.addSystemToSchedule(0, n);
		e.addSystemToSchedule(5, To);
		e.addSystemToSchedule(3, Eo, { runIf: N });
	}
};
//#endregion
//#region src/camera/FollowTarget.ts
/**
* @file    FollowTarget.ts
* @brief   Per-camera follow behaviour — the procedural half of the camera
*          modifier layer (Cinemachine's vcam Body). A camera with a FollowTarget
*          component damps its Transform toward a target each frame, with a dead
*          zone (the target can roam within it without the camera moving) and
*          frame-rate-independent damping. State lives in the camera's Transform
*          (the ECS-native place), so the director simply blends already-followed
*          POVs. Runs in play mode only.
*/
const Oo = t("FollowTarget", {
	target: -1,
	offsetX: 0,
	offsetY: 0,
	offsetZ: 0,
	followZ: false,
	deadzone: 0,
	damping: .25
});
/**
* One damped follow step. Pure: given the camera position, the desired position
* (target + offset), the dead zone, the damping time-constant, and dt, returns
* the camera's next position. Moves the camera only by the part of the gap that
* exceeds the dead zone, eased by a frame-rate-independent damping factor.
*
* Three-dimensional, and the dead zone with it: a sphere, so a target circling a
* 3D camera at the dead-zone radius stays inside it the whole way round. A flat
* scene hands in equal z on both sides and gets exactly what it always did.
*/
function ko(e, t, n, r, i) {
	const a = t.x - e.x;
	const o = t.y - e.y;
	const s = t.z - e.z;
	const c = Math.sqrt(a * a + o * o + s * s);
	if (c === 0 || c <= n) return {
		x: e.x,
		y: e.y,
		z: e.z
	};
	const l = 1 - n / c;
	const u = r > 0 ? 1 - Math.exp(-i / r) : 1;
	return {
		x: e.x + a * l * u,
		y: e.y + o * l * u,
		z: e.z + s * l * u
	};
}
/** Advance every FollowTarget camera by one damped step (called by the follow system). */
function Ao(e, t) {
	const n = e.getEntitiesWithComponents([Oo, E]);
	for (const r of n) {
		const n = e.get(r, Oo);
		const i = n.target;
		if (n.target < 0 || !e.valid(i) || !e.has(i, E)) continue;
		const a = e.get(r, E);
		const o = e.get(i, E);
		const s = n.followZ ? o.position.z + n.offsetZ : a.position.z;
		const c = ko(a.position, {
			x: o.position.x + n.offsetX,
			y: o.position.y + n.offsetY,
			z: s
		}, n.deadzone, n.damping, t);
		if (c.x !== a.position.x || c.y !== a.position.y || c.z !== a.position.z) e.set(r, E, {
			...a,
			position: c
		});
	}
}
//#endregion
//#region src/camera/CameraBounds.ts
/**
* @file    CameraBounds.ts
* @brief   The world rectangle an orthographic camera may not look outside of —
*          what keeps a level's edge at the edge of the screen instead of
*          showing the void beyond it.
*
* A constraint on where the camera IS, not on what moved it: a followed camera,
* a scripted one and a blended one all end their frame inside the same
* rectangle, because the clamp runs after they have all had their say. Each
* axis is independent and opts in by naming a real interval (max > min), so a
* component left at its defaults constrains nothing.
*/
const jo = t("CameraBounds", {
	minX: 0,
	minY: 0,
	maxX: 0,
	maxY: 0
});
/**
* Where the camera's centre may sit on one axis. Pure: the view's half extent is
* held inside [min, max], and when the interval is narrower than the view there
* is no such position — the whole of it is shown centred, which reads as a level
* too small to scroll rather than as a camera stuck against one wall.
*/
function Mo(e, t, n, r) {
	if (!(r > n)) return e;
	if (r - n <= t * 2) return (n + r) / 2;
	return Math.min(Math.max(e, n + t), r - t);
}
/** Hold every bounded camera inside its rectangle (called by the bounds system). */
function No(e) {
	for (const t of e.getEntitiesWithComponents([
		jo,
		x,
		E
	])) {
		const n = e.get(t, x);
		if (n.projectionType !== 1) continue;
		const r = e.get(t, jo);
		const i = e.get(t, E);
		const a = n.orthoSize;
		const o = a * (n.aspectRatio > 0 ? n.aspectRatio : 1);
		const s = Mo(i.position.x, o, r.minX, r.maxX);
		const c = Mo(i.position.y, a, r.minY, r.maxY);
		if (s === i.position.x && c === i.position.y) continue;
		e.set(t, E, {
			...i,
			position: {
				...i.position,
				x: s,
				y: c
			}
		});
	}
}
//#endregion
//#region src/ui/core/canvas-roots.ts
/** Top-level canvases in input order; parentOf returns null for absent or invalid parents. @experimental */
function Po(e, t) {
	if (e.length <= 1) return [...e];
	const n = new Map(e.map((e) => [e, 3]));
	const r = [];
	const i = [];
	for (const a of e) {
		i.length = 0;
		let e = t(a);
		let o = false;
		while (e !== null) {
			const r = n.get(e);
			if (r !== void 0) {
				o = r === 3;
				break;
			}
			n.set(e, 1);
			i.push(e);
			e = t(e);
		}
		for (const e of i) n.set(e, o ? 3 : 2);
		if (!o) r.push(a);
	}
	return r;
}
//#endregion
//#region src/lightmap/environmentLight.ts
/**
* @file    environmentLight.ts
* @brief   Which Ambient light is a scene's environment.
*
* @details The frame decides this in RenderFrame.cpp: the first active Light that is
*          enabled, has intensity, is Ambient and names an environment the registry
*          holds. A bake has to take the same light's sky, and an editor has to say
*          which light that is and why the others lose — three readers of one rule,
*          so the document-side reading is this one function, beside `bakeLightOf`
*          which fills defaults the same way. The C++ rule is the authority; this
*          mirrors it over a scene document, so a change to one is a change to both.
*/
function Fo(e, t, n, r) {
	const i = e[n];
	if (i !== void 0) return i;
	const a = t?.[n];
	return a !== void 0 ? a : r;
}
/**
* Every Ambient light in a scene, in document order.
*
* @param exists Whether the project holds the asset a light names. The frame cannot
*        use an environment it cannot load, and it moves on to the next light.
*/
function Io(e, t) {
	const n = g["Light"]?.defaults;
	const r = g["Light"]?.editorDefaults;
	const i = {
		...n,
		...r
	};
	const a = [];
	for (const n of e) for (const e of n.components) {
		if (e.type !== "Light") continue;
		if (Fo(e.data, i, "type", 0) !== 2) continue;
		const r = Fo(e.data, i, "environment", "");
		const o = typeof r === "string" && r !== "" ? r : null;
		const s = Fo(e.data, i, "intensity", 1);
		const c = n.visible === false ? "hidden" : Fo(e.data, i, "enabled", true) === false ? "disabled" : !(s > 0) ? "no-intensity" : null;
		const l = Fo(e.data, i, "environmentRotation", 0);
		a.push({
			entityId: n.id,
			name: n.name,
			skipped: c,
			environment: o,
			environmentMissing: o !== null && !t(o),
			drawEnvironment: Fo(e.data, i, "drawEnvironment", false) === true,
			rotation: Number.isFinite(l) ? l : 0,
			intensity: Number.isFinite(s) ? s : 1
		});
	}
	return a;
}
/** An Ambient light the frame could take the environment from. */
function Lo(e) {
	return e.skipped === null && e.environment !== null && !e.environmentMissing;
}
/**
* The light whose environment the frame uses, and the lights that name one but lose to it.
* Nothing is removed from the scene to settle it: a shadowed light is kept, and said so.
*/
function Ro(e) {
	const t = e.filter(Lo);
	return {
		effective: t[0] ?? null,
		shadowed: t.slice(1)
	};
}
//#endregion
//#region src/camera/EditorViewLighting.ts
/**
* @file    EditorViewLighting.ts
* @brief   The editor viewport's own lighting and exposure — view state, like EditorView.
*
* @details "Scene lighting" shows the scene by the lights it carries. "Studio preview"
*          replaces them, for the eye only, with a neutral sky, a key and a fill, so a
*          model the scene left dark can be read while it is authored. The exposure is
*          a second, independent control: a stop count applied where the frame is
*          written out, the same exp2(EV) the post-process exposure uses.
*
*          None of it is a scene entity, none of it is serialized, and it reaches the
*          engine only while the editor view is active — a packaged build never inserts
*          the view, never calls the engine setters, and so renders by the scene's own
*          settings. Play mode deactivates the view and with it every override here.
*/
const zo = {
	mode: "scene",
	rotation: 0,
	keyIntensity: .8,
	fillIntensity: .3,
	skyIntensity: 1,
	showSky: false,
	exposure: 0
};
const Bo = {
	min: -6,
	max: 6
};
const Vo = k({ ...zo }, "EditorViewLighting");
/** True when the view differs from the game's own settings in any way. */
function Ho(e) {
	return e.mode === "studio" || e.exposure !== 0;
}
/** The game's own settings: studio off and exposure at zero. The rig's tuning is kept. */
function Uo(e) {
	return {
		...e,
		mode: "scene",
		exposure: 0
	};
}
/** The numbers the engine setters take, so the push and its tests share one reading. */
function Wo(e, t) {
	if (!t) return {
		mode: 0,
		rotation: 0,
		key: 0,
		fill: 0,
		sky: 1,
		showSky: false,
		exposure: 0
	};
	const n = (e, t) => Number.isFinite(e) ? e : t;
	return {
		mode: e.mode === "studio" ? 1 : 0,
		rotation: n(e.rotation, 0),
		key: Math.max(0, n(e.keyIntensity, 0)),
		fill: Math.max(0, n(e.fillIntensity, 0)),
		sky: Math.max(0, n(e.skyIntensity, 1)),
		showSky: e.showSky,
		exposure: Math.min(Bo.max, Math.max(Bo.min, n(e.exposure, 0)))
	};
}
/**
* Pushes the view's lighting to the engine, once per change. Returns the key it last
* pushed, so a caller skips the crossing while nothing moved.
*/
function Go(e, t, n, r) {
	const i = Wo(t, n);
	const a = `${i.mode}|${i.rotation}|${i.key}|${i.fill}|${i.sky}|${i.showSky}|${i.exposure}`;
	if (a === r || !e) return r;
	e.renderer_setViewLighting?.(i.mode, i.rotation, i.key, i.fill, i.sky, i.showSky);
	e.postprocess_setViewExposure?.(i.exposure);
	return a;
}
/**
* The actual reasons, read from the scene document: nothing here guesses at what the
* engine did. The Lighting panel uses it to say why a toggle is disabled or why the
* scene looks dark without the studio.
*/
function Ko(e, t) {
	const n = g["Light"];
	const r = {
		...n?.defaults,
		...n?.editorDefaults
	};
	let i = 0;
	let a = 0;
	for (const t of e) for (const e of t.components) {
		if (e.type !== "Light") continue;
		a++;
		if ((e.data.type ?? r.type ?? 0) === 2) continue;
		const n = (e.data.enabled ?? r.enabled ?? true) !== false;
		const o = e.data.intensity ?? r.intensity ?? 1;
		if (t.visible !== false && n && o > 0) i++;
	}
	const o = Io(e, t);
	const { effective: s } = Ro(o);
	const c = o.filter((e) => e.environment !== null);
	let l = null;
	if (!s) if (o.length === 0) l = "no-ambient";
	else if (c.length === 0) l = "no-environment";
	else if (c.every((e) => e.environmentMissing)) l = "missing";
	else if (c.some((e) => e.skipped !== null && !Lo(e))) l = "off";
	else l = "unusable";
	let u = null;
	if (i === 0 && !s) u = a === 0 ? "no-lights" : "no-enabled-light";
	return {
		sceneLights: i,
		environment: s,
		skyUnavailable: l,
		sceneDark: u
	};
}
//#endregion
//#region src/camera/EditorViewShading.ts
/**
* @file    EditorViewShading.ts
* @brief   How the editor viewport shades its meshes — view state, beside EditorViewLighting.
*
* @details Clay and albedo are questions asked of the scene while it is authored: "is this
*          the right shape", "is this the right texture". Like the view's lighting it is
*          no scene entity and is never serialized, and it reaches the engine only while
*          the editor view is the one drawing, so play mode and a packaged build always
*          render each mesh as authored.
*/
const qo = {
	mode: "shaded",
	weights: null
};
const Jo = k({ ...qo }, "EditorViewShading");
/** The mode the engine is to use: an inactive view (play mode, a shipped game) carries no override. */
function Yo(e, t) {
	return t ? e.mode : "shaded";
}
/**
* Pushes the view's shading to the engine, once per change. Returns the mode it last
* pushed, so a caller skips the crossing while nothing moved.
*/
function Xo(e, t) {
	return t && e.weights ? `${e.weights.entity}:${e.weights.joint}` : "";
}
/** Pushes the skin-weight target to the engine, once per change; returns the key it pushed. */
function Zo(e, t, n) {
	const r = Xo(e, t);
	if (r === n) return n;
	const i = t ? e.weights : null;
	M.setViewSkinWeights(-1 >>> 0, i ? i.entity : null, i?.joint ?? 0);
	return r;
}
function Qo(e, t, n) {
	const r = Yo(e, t);
	if (r !== n) M.setViewShading(-1 >>> 0, r);
	return r;
}
//#endregion
//#region src/render/shaderWarmup.ts
const $o = (e) => new Promise((t) => setTimeout(t, e));
const es = () => typeof performance !== "undefined" ? performance.now() : Date.now();
/**
* How many shaders are still compiling in the background (0 when shaders are not compiled that way).
* @experimental
*/
function ts(e) {
	return (e && "wasmModule" in e ? e.wasmModule : e)?.renderer_getPendingShaders?.() ?? 0;
}
/**
* Waits until no shader is compiling. For a host that asked the engine to ready programs (a scene being prepared) and wants "ready" to be true.
* @experimental
*/
async function ns(e, t = 3e4) {
	const n = es();
	while (ts(e) > 0) {
		if (es() - n > t) return false;
		await $o(8);
	}
	return true;
}
/**
* Draws the app's frames out of sight until its shaders have finished compiling, so what is shown first is complete.
*
* The frames advance the world by a tenth of a millisecond each: they exist to make the renderer ask for the shaders the scene needs (a variant is
* only asked for when something first draws with it), not to play the game. Meant for a loading screen, before the first visible frame.
* @experimental
*/
async function rs(e, t = {}) {
	const n = t.timeoutMs ?? 3e4;
	const r = Math.max(t.settleFrames ?? 3, 1);
	const i = e.wasmModule;
	const a = es();
	let o = 0;
	let s = 0;
	let c = 0;
	if (!i?.renderer_getPendingShaders) return {
		frames: o,
		ms: 0,
		pending: 0,
		timedOut: false
	};
	while (s < r) {
		if (es() - a > n) return {
			frames: o,
			ms: es() - a,
			pending: c,
			timedOut: true
		};
		await e.stepFrames(1, 1e-4);
		++o;
		c = i.renderer_getPendingShaders?.() ?? 0;
		t.onProgress?.(c);
		s = c === 0 ? s + 1 : 0;
		await $o(8);
	}
	return {
		frames: o,
		ms: es() - a,
		pending: 0,
		timedOut: false
	};
}
//#endregion
//#region src/camera/cameraClear.ts
const is = /* @__PURE__ */ new Map();
/** Clear @p camera to @p colour instead of the canvas's background; null puts it back. @internal */
function as(e, t) {
	if (t) is.set(e, t);
	else is.delete(e);
}
/** The colour @p camera clears to if it has its own, else @p fallback. @internal */
function os(e, t) {
	return is.get(e) ?? t;
}
//#endregion
//#region src/camera/CameraPlugin.ts
function ss(e, t) {
	if (t < e.length) return e[t];
	const n = {
		entity: 0,
		viewProjection: /* @__PURE__ */ new Float32Array(16),
		renderViewProjection: /* @__PURE__ */ new Float32Array(16),
		viewportRect: {
			x: 0,
			y: 0,
			w: 0,
			h: 0
		},
		clearFlags: 0,
		priority: 0,
		halfW: 0,
		halfH: 0,
		cameraX: 0,
		cameraY: 0,
		cullingMask: 4294967295,
		renderTarget: 0
	};
	e.push(n);
	return n;
}
/**
* The Canvas whose fit and background the frame uses: the first owned by a RUNNING
* scene, else the first at all. Scene membership (SceneOwner) is an SDK component
* the engine cannot see, so it enumerates and this chooses.
*/
function cs(e, t, n, r) {
	const i = t;
	const o = i.getCanvasEntities ? i.getCanvasEntities.call(t) : e?.registry_getCanvasEntities?.(t);
	if (o && o.length > 0) {
		const e = Po(o, (e) => {
			if (!t.hasParent(e)) return null;
			const n = t.getParent(e).entity;
			return t.valid(n) ? n : null;
		});
		if (n && r) for (const t of e) {
			const e = n.tryGet(t, a);
			if (!e || e.scene === "" || r.has(e.scene)) return t;
		}
		return e[0] ?? -1;
	}
	const s = i.getCanvasEntity;
	if (s) return s.call(t);
	return e?.registry_getCanvasEntity(t) ?? -1;
}
function ls(e, t) {
	const n = t.getCameraEntities;
	if (n) return n.call(t);
	return e?.registry_getCameraEntities(t) ?? [];
}
function us(e, t, n, r) {
	const i = cs(e, t, n, r);
	if (i < 0) return null;
	return t.getCanvas(i);
}
/**
* Snap a world coordinate to the camera's pixel grid (one cell = one rendered pixel,
* in world units). Rounding the camera position to this grid is what makes pixel-perfect
* rendering stable — static sprites land on the same texels every frame instead of
* shimmering as the camera drifts by sub-pixel amounts. worldPerPixel <= 0 is a no-op.
*/
function ds(e, t) {
	return t > 0 ? Math.round(e / t) * t : e;
}
function fs(e, t, n) {
	const r = n.worldRotation;
	const i = n.worldPosition;
	return {
		entity: e,
		isActive: t.isActive,
		x: i.x,
		y: i.y,
		z: i.z,
		rotation: 2 * Math.atan2(r.z, r.w),
		tilt: r.x !== 0 || r.y !== 0 ? {
			x: r.x,
			y: r.y,
			z: r.z,
			w: r.w
		} : void 0,
		projection: t.projectionType,
		orthoSize: t.orthoSize,
		fov: t.fov,
		near: t.nearPlane,
		far: t.farPlane,
		viewport: {
			x: t.viewport.x,
			y: t.viewport.y,
			z: t.viewport.z,
			w: t.viewport.w
		},
		clearFlags: t.clearFlags,
		priority: t.priority,
		pixelPerfect: t.pixelPerfect,
		cullingMask: t.cullingMask ?? 4294967295,
		renderTarget: t.renderTarget ?? 0
	};
}
/**
* Apply design-resolution ortho scaling only to full-screen scene cameras.
* Sub-viewport and texture cameras keep their authored zoom; null `canvas`
* preserves raw orthoSize for editor views. Rotation uses invertViewZ.
*/
function X(e, t, n, r, i, a) {
	const o = e.renderTarget ? na(e.renderTarget) : null;
	t = o?.width ?? t;
	n = o?.height ?? n;
	const s = e.viewport.z * t / (e.viewport.w * n);
	let c;
	let l = 0;
	let u = 0;
	if (e.projection === 1) {
		u = e.orthoSize;
		if (r && (e.renderTarget ?? 0) === 0 && _s(e.viewport)) {
			const t = r.designResolution.x / r.designResolution.y;
			u = oi(e.orthoSize, t, s, r.scaleMode, r.matchWidthOrHeight);
		}
		l = u * s;
		c = Gt(-l, l, -u, u, -e.far, e.far);
	} else c = Vt(e.fov * Math.PI / 180, s, e.near, e.far);
	let d = e.x;
	let f = e.y;
	if (e.pixelPerfect && e.projection === 1) {
		const t = 2 * u / Math.max(e.viewport.w * n, 1);
		d = ds(e.x, t);
		f = ds(e.y, t);
	}
	const p = e.orbit ? zt(d, f, e.orbit.focusZ, e.orbit.yaw, e.orbit.pitch, e.z) : e.tilt ? Xt(d, f, e.z, e.tilt.x, e.tilt.y, e.tilt.z, e.tilt.w) : Ht(d, f, e.z, Math.cos(e.rotation), Math.sin(e.rotation));
	const m = ss(i, a);
	m.entity = e.entity;
	m.viewProjection.set(Ut(c, p));
	const h = tn();
	if (h.x === 0 && h.y === 0 && h.z === 0) m.renderViewProjection.set(m.viewProjection);
	else {
		const t = e.orbit ? zt(d - h.x, f - h.y, e.orbit.focusZ - h.z, e.orbit.yaw, e.orbit.pitch, e.z) : e.tilt ? Xt(d - h.x, f - h.y, e.z - h.z, e.tilt.x, e.tilt.y, e.tilt.z, e.tilt.w) : Ht(d - h.x, f - h.y, e.z - h.z, Math.cos(e.rotation), Math.sin(e.rotation));
		m.renderViewProjection.set(Ut(c, t));
	}
	m.viewportRect.x = e.viewport.x;
	m.viewportRect.y = e.viewport.y;
	m.viewportRect.w = e.viewport.z;
	m.viewportRect.h = e.viewport.w;
	m.clearFlags = e.clearFlags;
	m.priority = e.priority;
	m.halfW = l;
	m.halfH = u;
	m.cameraX = d;
	m.cameraY = f;
	m.cullingMask = e.cullingMask;
	m.renderTarget = e.renderTarget;
	return m;
}
const ps = [];
/**
* The eight world-space corners of what a camera sees — near face then far, in
* the order {@link frustumCornersWorld} documents. Built through the same POV →
* CameraInfo path a frame is, so it carries the projection, the tilt and the
* design-resolution framing. @p width / @p height are the frame it renders into.
*
* @beta
*/
function ms(e, t, n, r, i, a) {
	const o = X(fs(0, e, t), n, r, i, ps, 0);
	return Wt(o.viewProjection, a);
}
/** Authored POVs of the scene's cameras (scene-filtered), no matrices built yet. */
function hs(e, t, n, r, i, o) {
	if (n === 0 || r === 0) return [];
	const s = ls(e, t);
	if (s.length === 0) return [];
	const c = o && i ? s.filter((e) => {
		const t = i.tryGet(e, a);
		if (!t || t.scene === "") return true;
		return o.has(t.scene);
	}) : s;
	const l = [];
	for (const e of c) l.push(fs(e, t.getCamera(e), t.getTransform(e)));
	return l;
}
function gs(e, t, n, r, i, a, o = []) {
	const s = hs(e, t, n, r, i, a);
	if (s.length === 0) return [];
	const c = us(e, t, i, a);
	const l = s.map((e, t) => X(e, n, r, c, o, t));
	l.sort((e, t) => e.priority - t.priority);
	return l;
}
const _s = (e) => e.x === 0 && e.y === 0 && e.z === 1 && e.w === 1;
/**
* Build a full-frame CameraInfo from the editor view, reusing the SAME VP math
* primitives (ortho / invertTranslation / multiply) as scene cameras — only the
* camera *configuration* differs (full-frame viewport, raw orthoSize, no canvas
* design-resolution scaling). This is what makes the editor view a first-class
* peer of scene cameras rather than a separate view-math implementation.
*/
function vs(e, t, n, r) {
	return X({
		entity: -1,
		isActive: true,
		x: e.x,
		y: e.y,
		z: $t(e),
		rotation: 0,
		orbit: {
			yaw: (e.yaw ?? 0) * Math.PI / 180,
			pitch: (e.pitch ?? 0) * Math.PI / 180,
			focusZ: e.z ?? 0
		},
		projection: e.perspective ? 0 : 1,
		orthoSize: e.orthoSize,
		fov: e.fov,
		near: Jt(e),
		far: qt(e),
		viewport: {
			x: 0,
			y: 0,
			z: 1,
			w: 1
		},
		clearFlags: 3,
		priority: 0,
		pixelPerfect: false,
		cullingMask: 4294967295,
		renderTarget: 0
	}, t, n, null, r, 0);
}
/**
* The cameras to render + sync this frame, as ONE shared decision (so what's
* drawn and what screen<->world resolves to can't diverge):
*  1. the editor view, if active (a single full-frame camera); else
*  2. the camera director's resolved MAIN view (the active full-frame camera,
*     or a view-target blend) at index 0, plus any sub-viewport overlay cameras.
* `advance` ticks the director's blend; the early UICameraInfo sync peeks (false)
* so it doesn't double-advance the same frame's blend.
*/
/**
* The design-resolution fit: the project screen fit (ScreenScaling) when it opts in
* (scaleMode ≥ 0), else the scene's UI Canvas, else null (raw orthoSize). The project
* fit works WITHOUT a Canvas and, when set, is authoritative.
*
* The camera and UI layout both resolve their fit here — one screen, one answer. They
* used to disagree: the camera preferred ScreenScaling while the editor's UI box read
* the Canvas alone, so a project fit whose design resolution differed from the scene's
* Canvas laid UI out in one box while authoring and another once it shipped.
*/
function ys(e, t) {
	if (e.hasResource(V)) {
		const t = e.getResource(V);
		if (t.scaleMode > -1) return {
			designResolution: {
				x: t.designWidth,
				y: t.designHeight
			},
			scaleMode: t.scaleMode,
			matchWidthOrHeight: t.matchWidthOrHeight
		};
	}
	return t;
}
function bs(e, t, n, r, i, a, o, s, c, l) {
	if (e.hasResource(I)) {
		const t = e.getResource(I);
		if (t.active && r > 0 && i > 0) {
			if (l) {
				const e = Qt(t);
				nn(e.x, e.y, e.z);
			}
			return [vs(t, r, i, s)];
		}
	}
	const u = hs(t, n, r, i, a, o);
	if (u.length === 0) return [];
	const d = ys(e, us(t, n, a, o));
	const f = u.filter((e) => e.renderTarget !== 0).sort((e, t) => e.priority - t.priority);
	const p = u.filter((e) => e.renderTarget === 0);
	const { fullFrame: m, overlays: h } = Os(p);
	if (l) {
		const e = m[0] ?? p[0];
		if (e) nn(e.x, e.y, e.z);
	}
	const g = [];
	for (const e of f) g.push(X(e, r, i, d, s, g.length));
	if (m.length > 0 && e.hasResource(Lt)) {
		const t = It(e.getResource(Lt), m, c, l);
		if (t) g.push(X(t, r, i, d, s, g.length));
	} else for (const e of m.slice().sort((e, t) => e.priority - t.priority)) g.push(X(e, r, i, d, s, g.length));
	for (const e of h) g.push(X(e, r, i, d, s, g.length));
	return g;
}
/**
* The aspect the design box is fitted to, when it is NOT the surface's — the
* editor's design view lays UI out for the DEVICE it simulates, not the panel
* showing it. Zero is every shipped frame. Mirrors uiLayoutRect's editor branch
* from the same inputs, so the design frame and the layout cannot disagree.
*/
function xs(e, t) {
	if (!t || !e.hasResource(I)) return 0;
	const n = e.getResource(I);
	if (!n.active) return 0;
	return n.uiPreviewAspect > 0 ? n.uiPreviewAspect : t.designResolution.x / t.designResolution.y;
}
/**
* The screen domain, published from the fit and the surface and from NOTHING
* else — `screenLayoutRect` has no parameter a camera could reach. Unconditional,
* including with no camera at all: a HUD is not something a camera grants.
*/
function Ss(e, t, n, r, i) {
	if (!e.hasResource(H)) return;
	const a = ys(e, us(t, n));
	const o = xs(e, a);
	Object.assign(e.getResource(H), o > 0 ? fi(a, i * o, i) : fi(a, r, i));
}
/**
* Publish the camera this frame was drawn from, as a copy.
*
* After the submit, never from the early peek: the value names a picture, and a
* peek draws nothing. Copied because UICameraInfo's array is rewritten in place,
* so a view onto it would change under a reader mid-gizmo.
*/
function Cs(e, t, n) {
	const r = e.getResource(Ai);
	if (!t) {
		r.valid = false;
		return;
	}
	const i = !r.valid || r.vpX !== n.vpX || r.vpY !== n.vpY || r.vpW !== n.vpW || r.vpH !== n.vpH || !ws(r.viewProjection, t.viewProjection);
	r.viewProjection.set(t.viewProjection);
	r.vpX = n.vpX;
	r.vpY = n.vpY;
	r.vpW = n.vpW;
	r.vpH = n.vpH;
	r.revision = n.revision;
	r.valid = true;
	if (i) ki();
}
/** Exact: the question is whether the projection moved, not whether two cameras
*  are close enough to look alike. */
function ws(e, t) {
	for (let n = 0; n < 16; n++) if (e[n] !== t[n]) return false;
	return true;
}
function Ts(e) {
	return e.find((e) => e.renderTarget === 0) ?? null;
}
function Es(e, t, n, r, i, a, o) {
	if (!a) a = gs(t, n, r, i, void 0, void 0, o);
	Ss(e, t, n, r, i);
	const s = e.getResource(ai);
	const c = Ts(a);
	if (c) {
		s.viewProjection.set(c.viewProjection);
		s.revision++;
		const a = An(c.viewportRect, r, i);
		const o = e.hasResource(V) ? e.getResource(V).renderPolicy : void 0;
		const l = Mn(o ?? 0, 2 * c.halfH, a.w, a.h);
		s.vpX = a.x + l.x;
		s.vpY = a.y + l.y;
		s.vpW = l.width;
		s.vpH = l.height;
		s.screenW = r;
		s.screenH = i;
		const u = e.hasResource(I) ? e.getResource(I).uiPreviewAspect : 0;
		const d = ys(e, us(t, n));
		const f = li(c, d, r, i, u);
		s.worldLeft = f.left;
		s.worldRight = f.right;
		s.worldBottom = f.bottom;
		s.worldTop = f.top;
		s.valid = true;
	} else {
		s.valid = false;
		s.revision++;
	}
	Ds(e, r, i, s, a);
}
/**
* How the screen domain reaches the framebuffer this frame: {@link
* screenProjection} over the whole surface, which is every shipped frame.
*
* The editor's design VIEW is the one exception: there the screen box is shown
* inside the scene so it can be zoomed while it is authored.
*/
function Ds(e, t, n, r, i) {
	if (!e.hasResource(U)) return;
	const a = e.getResource(U);
	a.surfaceW = t;
	a.surfaceH = n;
	let o = 0;
	let s = false;
	for (const e of i) {
		if (e.renderTarget !== 0) continue;
		s = true;
		o |= e.cullingMask ?? 4294967295;
	}
	a.layerMask = (s ? o : 4294967295) >>> 0;
	const c = Ts(i);
	if (r.valid && c?.entity === -1) {
		a.projection.set(r.viewProjection);
		a.vpX = r.vpX;
		a.vpY = r.vpY;
		a.vpW = r.vpW;
		a.vpH = r.vpH;
		a.active = true;
		return;
	}
	const l = e.hasResource(H) ? e.getResource(H) : null;
	if (!l?.valid) {
		a.active = false;
		return;
	}
	mi(l, a.projection);
	a.vpX = 0;
	a.vpY = 0;
	a.vpW = t;
	a.vpH = n;
	a.active = true;
}
/**
* Which on-screen cameras compete to be the main view and which are laid over it. A full-frame camera that does not clear colour is drawn over
* what another one drew (a UI camera over the world's): it is a layer on the main view, not a candidate to be it. With nothing else to lay it
* over, it is the main view. Sub-viewport cameras are layers too; the layers are in priority order.
* @internal
*/
function Os(e) {
	const t = (e) => (e.clearFlags & 1) !== 0;
	const n = e.filter((e) => _s(e.viewport));
	const r = n.some(t) ? n.filter(t) : n;
	return {
		fullFrame: r,
		overlays: e.filter((e) => !r.includes(e)).sort((e, t) => e.priority - t.priority)
	};
}
function ks(e) {
	return {
		name: "camera",
		profileDomain: "render",
		build(t) {
			const n = t.wasmModule;
			const r = t.world.getCppRegistry();
			const i = t.pipeline;
			const a = [];
			let o = 0;
			let s = 0;
			t.insertResource(I, { ...Kt });
			t.insertResource(Vo, { ...zo });
			let c = "";
			t.insertResource(Jo, { ...qo });
			let l = null;
			let u = "";
			t.insertResource(Lt, Rt());
			t.insertResource(Zi, new Xi(t));
			t.insertResource(Qi, $i(t));
			const d = e ?? (() => {
				const e = We();
				return {
					width: window.innerWidth * e,
					height: window.innerHeight * e
				};
			});
			const f = {
				_id: Symbol("UICameraSyncSystem"),
				_name: "UICameraSyncSystem",
				_runWhenPaused: true,
				_params: [],
				_fn: () => {
					const { width: e, height: i } = d();
					const o = t.getResource(O).elapsed;
					const s = bs(t, n, r, e, i, void 0, void 0, a, o, false);
					Es(t, n, r, e, i, s);
				}
			};
			const p = {
				_id: Symbol("RenderSystem"),
				_name: "RenderSystem",
				_params: [],
				_fn: () => {
					if (!i.renderingEnabled) return;
					const { width: e, height: f } = d();
					if (e === 0 || f === 0) return;
					if (i.demand.enabled && !i.demand.shouldRender({
						width: e,
						height: f,
						worldVersion: t.world.getWorldVersion(),
						pendingShaders: ts(n),
						input: t.hasResource(P) ? t.getResource(P) : null
					})) return;
					const p = cs(n, r);
					let m;
					if (p >= 0) m = r.getCanvas(p).backgroundColor;
					const h = t.getResource(O).elapsed;
					if (e !== o || f !== s) {
						t.measureFrameScope("render.resize", () => M.resize(e, f));
						o = e;
						s = f;
					}
					let g;
					if (t.hasResource(K)) {
						const e = t.getResource(K).getActiveScenes();
						if (e.length > 0) g = new Set(e);
					}
					i.setActiveScenes(g ?? null);
					c = Go(n, t.getResource(Vo), t.hasResource(I) && t.getResource(I).active, c);
					l = Qo(t.getResource(Jo), t.hasResource(I) && t.getResource(I).active, l);
					u = Zo(t.getResource(Jo), t.hasResource(I) && t.getResource(I).active, u);
					i.beginFrame(h);
					t.measureFrameScope("render.updateTransforms", () => M.updateTransforms({ _cpp: r }));
					const _ = t.measureFrameScope("render.resolveCameras", () => bs(t, n, r, e, f, t.world, g, a, h, true));
					en((e, t, n) => {
						M.setOrigin(e, t, n);
					});
					t.measureFrameScope("render.uiCameraSync", () => Es(t, n, r, e, f, _));
					t.measureFrameScope("render.submit", () => {
						if (_.length === 0) i.render({
							registry: { _cpp: r },
							viewProjection: Bt,
							width: e,
							height: f,
							elapsed: h,
							clearColor: m,
							frameAlreadyBegun: true
						});
						else {
							i.beginScreenCapture();
							const n = t.hasResource(V) ? t.getResource(V).renderPolicy : void 0;
							for (const t of _) {
								const a = t.viewportRect;
								const o = t.renderTarget !== 0 ? na(t.renderTarget) : null;
								const s = o?.width ?? e;
								const c = o?.height ?? f;
								const { x: l, y: u, w: d, h: p } = An(a, s, c);
								i.renderCamera({
									registry: { _cpp: r },
									viewProjection: t.viewProjection,
									renderViewProjection: t.renderViewProjection,
									viewportPixels: {
										x: l,
										y: u,
										w: d,
										h: p
									},
									clearFlags: t.clearFlags,
									elapsed: h,
									cameraEntity: t.entity,
									clearColor: os(t.entity, m),
									cullingMask: t.cullingMask,
									renderTarget: o ? t.renderTarget : 0,
									worldHeight: 2 * t.halfH,
									renderPolicy: n
								});
							}
							i.endScreenCapture();
							M.setViewport(0, 0, e, f);
						}
						if (t.hasResource(U)) i.renderScreenOverlay({ _cpp: r }, t.getResource(U));
						i.endFrame();
					}, { remainder: "wait" });
					Cs(t, Ts(_), t.getResource(ai));
				}
			};
			t.addSystemToSchedule(3, _([xe(O)], (e) => Ao(t.world, e.delta), { name: "CameraFollowSystem" }), { runIf: N });
			t.addSystemToSchedule(3, _([], () => No(t.world), { name: "CameraBoundsSystem" }), { runIf: N });
			t.addSystemToSchedule(1, f);
			t.addSystemToSchedule(5, p);
		}
	};
}
/** Draw a camera's current world without stepping gameplay or changing authored cameras.
* Hosts may read this frame and redraw their editor eye in the same browser task. */
function As(e, t, n, r) {
	const i = e.pipeline;
	const a = e.world.getCppRegistry();
	const o = e.wasmModule;
	if (!i || !a || t <= 0 || n <= 0) return false;
	const s = i.frameElapsed;
	M.resize(t, n);
	i.beginFrame(s);
	try {
		M.updateTransforms({ _cpp: a });
		const c = r === void 0 ? bs(e, o, a, t, n, e.world, void 0, [], s, false) : hs(o, a, t, n, e.world).filter((e) => e.entity === r).map((r, i) => X(r, t, n, ys(e, us(o, a, e.world)), [], i));
		if (!c.length) return false;
		const l = cs(o, a);
		const u = l >= 0 ? a.getCanvas(l).backgroundColor : void 0;
		const d = e.hasResource(V) ? e.getResource(V).renderPolicy : void 0;
		Es(e, o, a, t, n, c);
		if (r !== void 0) {
			M.setViewport(0, 0, t, n);
			M.begin(Bt, 0, 3, u, {
				x: 0,
				y: 0,
				w: t,
				h: n
			});
			M.end();
		}
		i.beginScreenCapture();
		for (const e of c) {
			const r = An(e.viewportRect, t, n);
			i.renderCamera({
				registry: { _cpp: a },
				viewProjection: e.viewProjection,
				renderViewProjection: e.renderViewProjection,
				viewportPixels: r,
				clearFlags: e.clearFlags,
				elapsed: s,
				cameraEntity: e.entity,
				clearColor: u,
				cullingMask: e.cullingMask,
				worldHeight: 2 * e.halfH,
				renderPolicy: d
			});
		}
		i.endScreenCapture();
		M.setViewport(0, 0, t, n);
		if (e.hasResource(U)) i.renderScreenOverlay({ _cpp: a }, e.getResource(U));
	} finally {
		i.endFrame();
	}
	return true;
}
//#endregion
//#region src/app/subsystems.ts
/**
* @file    subsystems.ts
* @brief   Per-App registry of engine subsystem lifecycle + liveness — the
*          observability seam for "which modules are loaded, ready, stepping, or
*          errored".
*
* @details Phase (registered → initializing → ready, error terminal) is recorded;
*          each transition appends a timestamped event for history. Liveness is
*          derived, not stored: an owned system pets the watchdog via
*          markStepped() each tick; getStatuses() reports `stepping` while beats
*          are fresh, `idle` once stale (e.g. physics frozen by playModeOnly in
*          edit mode) — the load≠run distinction. One registry per realm, never a
*          shared singleton, so realms report independently.
*/
/** Wall clock for beat/age math; degrades to 0 where performance is absent. */
function js() {
	return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : 0;
}
/** Beats older than this (ms) read as stopped — bridges a ~33ms fixed step +
*  editor sampling, yet flips to `idle` promptly on pause. */
const Ms = 400;
/** Bound on retained lifecycle events (a diagnostics tail, not full history). */
const Ns = 128;
var Ps = class {
	constructor() {
		this.entries_ = /* @__PURE__ */ new Map();
		this.order_ = [];
		this.events_ = [];
		this.listeners_ = /* @__PURE__ */ new Set();
		this.seq_ = 0;
	}
	/** Register (or re-register) a subsystem in the `registered` phase. */
	register(e, t = {}) {
		let n = this.entries_.get(e);
		if (!n) {
			n = {
				id: e,
				displayName: t.displayName ?? e,
				phase: "registered",
				dependsOn: t.dependsOn ?? [],
				phaseSinceMs: js(),
				lastBeatMs: 0
			};
			this.entries_.set(e, n);
			this.order_.push(e);
		} else {
			if (t.displayName) n.displayName = t.displayName;
			if (t.dependsOn) n.dependsOn = t.dependsOn;
			n.phase = "registered";
			n.phaseSinceMs = js();
			n.lastError = void 0;
		}
		this.emit_(e, "registered");
	}
	/** Move a subsystem to a new lifecycle phase (no-op for an unknown id). */
	transition(e, t, n) {
		const r = this.entries_.get(e);
		if (!r) return;
		r.phase = t;
		r.detail = n;
		r.phaseSinceMs = js();
		if (t === "error") r.lastError = n ?? r.lastError;
		this.emit_(e, t, n);
	}
	/** Terminal error transition; keeps the reason in `lastError`. */
	markError(e, t) {
		this.transition(e, "error", t);
	}
	/** The current phase of a subsystem, or undefined if unknown. */
	phaseOf(e) {
		return this.entries_.get(e)?.phase;
	}
	/** Pet the watchdog: an owned system ran this frame. Cheap and silent (no
	*  notify) — liveness is sampled, not pushed. Call once per tick. */
	markStepped(e) {
		const t = this.entries_.get(e);
		if (t) t.lastBeatMs = js();
	}
	/** Current status of every subsystem, install order, liveness derived now. */
	getStatuses() {
		const e = js();
		return this.order_.map((t) => {
			const n = this.entries_.get(t);
			let r = "inactive";
			if (n.phase === "ready" && n.lastBeatMs > 0) r = e - n.lastBeatMs <= Ms ? "stepping" : "idle";
			return {
				id: n.id,
				displayName: n.displayName,
				phase: n.phase,
				activity: r,
				detail: n.detail,
				lastError: n.lastError,
				dependsOn: n.dependsOn.slice(),
				phaseAgeMs: e - n.phaseSinceMs
			};
		});
	}
	/** Recent lifecycle transitions, oldest→newest (for a diagnostics log). */
	recentEvents(e = Ns) {
		return e >= this.events_.length ? this.events_.slice() : this.events_.slice(-e);
	}
	/** Subscribe to phase transitions (not per-beat). Returns an unsubscribe. */
	subscribe(e) {
		this.listeners_.add(e);
		return () => {
			this.listeners_.delete(e);
		};
	}
	emit_(e, t, n) {
		this.events_.push({
			id: e,
			phase: t,
			detail: n,
			atMs: js(),
			seq: ++this.seq_
		});
		if (this.events_.length > Ns) this.events_.shift();
		for (const e of this.listeners_) e();
	}
};
//#endregion
//#region src/app/frameProfile.ts
/** Systems a project registered, as opposed to any engine plugin's. */
const Fs = "scripts";
/** Systems registered outside both a plugin build and the project bundle. */
const Is = "unattributed";
/** No display refreshes slower than this, so a longer block is not a present. */
const Ls = 50;
/** The label of the row holding render time that no scope measured and no present explains. */
const Rs = "untimed";
/** Below this a row is noise, and a `rest` row for it would be rounding dust. */
const zs = .05;
/**
* Average a window of frames into one profile, per frame. A node is divided by
* the whole window, not by the frames it appeared in: dividing by its own
* appearances would report an every-fourth-frame system four times too dear.
* Obeys the same sums a single frame does.
*/
function Bs(e) {
	if (e.length === 0) return {
		frameMs: 0,
		cpuMs: 0,
		waitMs: 0,
		idleMs: 0,
		gpuMs: -1,
		domains: []
	};
	const t = e.length;
	const n = e.filter((e) => e.gpuMs >= 0);
	return {
		frameMs: e.reduce((e, t) => e + t.frameMs, 0) / t,
		cpuMs: e.reduce((e, t) => e + t.cpuMs, 0) / t,
		waitMs: e.reduce((e, t) => e + t.waitMs, 0) / t,
		idleMs: e.reduce((e, t) => e + t.idleMs, 0) / t,
		gpuMs: n.length > 0 ? n.reduce((e, t) => e + t.gpuMs, 0) / n.length : -1,
		domains: Vs(e.map((e) => e.domains), t)
	};
}
function Vs(e, t) {
	const n = /* @__PURE__ */ new Map();
	for (const t of e) for (const e of t) {
		const t = n.get(e.id);
		if (t) {
			t.ms += e.ms;
			t.kids.push([...e.children]);
			if (e.query) t.query = t.query ? {
				calls: t.query.calls + e.query.calls,
				scanned: t.query.scanned + e.query.scanned,
				filtered: t.query.filtered + e.query.filtered
			} : { ...e.query };
		} else n.set(e.id, {
			node: e,
			ms: e.ms,
			kids: [[...e.children]],
			query: e.query ? { ...e.query } : null
		});
	}
	const r = [];
	for (const e of n.values()) r.push({
		id: e.node.id,
		label: e.node.label,
		ms: e.ms / t,
		kind: e.node.kind,
		children: Vs(e.kids, t),
		...e.query ? { query: {
			calls: e.query.calls / t,
			scanned: e.query.scanned / t,
			filtered: e.query.filtered / t
		} } : {}
	});
	r.sort(Ws);
	return r;
}
/** The part of a dotted scope name that names its domain. */
function Hs(e) {
	const t = e.indexOf(".");
	return t > 0 ? e.slice(0, t) : e;
}
function Us(e) {
	let t = 0;
	for (const n of e) t += n.ms;
	return t;
}
function Ws(e, t) {
	return t.ms - e.ms;
}
/** The native mesh collector also publishes work counts in its scope packet.
* These are quantities, including in existing captures, never milliseconds. */
function Gs(e) {
	return /^render\.collect\.mesh\.(scene|depth|motion|other)\.(walks|visits)$/.test(e);
}
/**
* Fold one frame's flat measurements into the tree the profiler renders.
*
* Pure, so the live editor view, an imported capture and the agent all derive
* the same numbers from the same rule rather than each rounding their own way.
*/
function Ks(e) {
	const t = /* @__PURE__ */ new Map();
	for (const n of e.nativeScopes ?? []) {
		if (Gs(n.name)) continue;
		const e = Hs(n.name);
		const r = t.get(e);
		if (r) r.push(n);
		else t.set(e, [n]);
	}
	const n = new Set(e.scopes.map((e) => e.name));
	const r = /* @__PURE__ */ new Map();
	const i = /* @__PURE__ */ new Map();
	for (const t of e.scopes) {
		const e = t.parent !== void 0 && n.has(t.parent);
		const a = e ? r : i;
		const o = e ? t.parent : t.system;
		const s = a.get(o);
		if (s) s.push(t);
		else a.set(o, [t]);
	}
	const a = (e, t) => (r.get(e) ?? []).map((e) => {
		const n = `${t}/${e.name}`;
		const r = a(e.name, n);
		const i = e.ms - Us(r);
		if (r.length > 0 && i >= zs) r.push({
			id: `${n}/~`,
			label: "rest",
			ms: i,
			kind: "rest",
			children: []
		});
		r.sort(Ws);
		return {
			id: n,
			label: e.name,
			ms: e.ms,
			kind: "scope",
			children: r
		};
	});
	let o = 0;
	const s = /* @__PURE__ */ new Map();
	for (const n of e.systems) {
		const e = [];
		let r = 0;
		for (const o of i.get(n.name) ?? []) {
			const i = [...(o.remainder === "wait" ? t.get(Hs(o.name)) ?? [] : []).map((e) => ({
				id: `${n.name}/${o.name}/${e.name}`,
				label: e.name,
				ms: e.ms,
				kind: "scope",
				children: []
			})), ...a(o.name, `${n.name}/${o.name}`)];
			const s = Math.max(0, o.ms - Us(i));
			const c = o.remainder === "wait" ? Math.min(s, 50) : 0;
			const l = o.remainder === "wait" ? s - c : 0;
			r += c;
			if (l >= zs) i.push({
				id: `${n.name}/${o.name}/~untimed`,
				label: Rs,
				ms: l,
				kind: "rest",
				children: []
			});
			else if (o.remainder !== "wait" && s >= zs && i.length > 0) i.push({
				id: `${n.name}/${o.name}/~`,
				label: "rest",
				ms: s,
				kind: "rest",
				children: []
			});
			i.sort(Ws);
			const u = o.ms - c;
			e.push({
				id: `${n.name}/${o.name}`,
				label: o.name,
				ms: u,
				kind: "scope",
				children: i
			});
		}
		const c = Math.max(0, n.ms - r);
		const l = Math.max(0, c - Us(e));
		if (e.length > 0 && l >= zs) e.push({
			id: `${n.name}/~`,
			label: "rest",
			ms: l,
			kind: "rest",
			children: []
		});
		e.sort(Ws);
		o += r;
		const u = {
			id: n.name,
			label: n.name,
			ms: c,
			kind: "system",
			children: e,
			...n.query ? { query: n.query } : {}
		};
		const d = s.get(n.domain);
		if (d) d.push(u);
		else s.set(n.domain, [u]);
	}
	const c = [];
	for (const [e, t] of s) {
		t.sort(Ws);
		c.push({
			id: e,
			label: e,
			ms: Us(t),
			kind: "domain",
			children: t
		});
	}
	c.sort(Ws);
	const l = Us(c);
	const u = Math.max(e.frameMs, l + o);
	return {
		frameMs: u,
		cpuMs: l,
		waitMs: o,
		idleMs: Math.max(0, u - l - o),
		gpuMs: e.gpuMs ?? -1,
		domains: c
	};
}
//#endregion
//#region src/app/app.ts
/**
* @file    app.ts
* @brief   Application builder and web platform integration
*/
const qs = /* @__PURE__ */ new WeakMap();
/** Internal host pause ownership, independent of the game's setPaused intent. */
function Js(e, t, n) {
	if (n) {
		let n = qs.get(e);
		if (!n) qs.set(e, n = /* @__PURE__ */ new Set());
		n.add(t);
	} else {
		const n = qs.get(e);
		n?.delete(t);
		if (!n?.size) qs.delete(e);
	}
}
/**
* How a rejected schedule reads back to whoever wrote it. The two mistakes that
* get here look nothing alike in the source and identically at runtime, so the
* message has to tell them apart: a member that does not exist arrives as
* `undefined`, and swapped arguments arrive as the system itself.
*/
function Ys(e) {
	if (e === void 0) return "undefined (no such Schedule member?)";
	if (e === null) return "null";
	if (typeof e === "number" || typeof e === "string") return JSON.stringify(e);
	const t = e?._name;
	if (typeof t === "string") return `the system "${t}" (arguments the wrong way round?)`;
	return Object.prototype.toString.call(e);
}
/** How early a capped frame may land and still count as on time: vsync jitter. */
const Xs = 1;
var Zs = class e {
	constructor() {
		this.systems_ = /* @__PURE__ */ new Map();
		this.runner_ = null;
		this.booted_ = false;
		this.aot_ = null;
		this.systemCounter_ = 0;
		this.templateToRuntime_ = /* @__PURE__ */ new Map();
		this.setMembership_ = /* @__PURE__ */ new Map();
		this.running_ = false;
		this.executionHolds_ = /* @__PURE__ */ new Set();
		this.executionEpoch_ = 0;
		this.executionObservers_ = [];
		this.loopVersion_ = 0;
		this.queuedFrame_ = null;
		this.queuedOnTimer_ = false;
		this.runInBackground_ = false;
		this.onVisibility_ = null;
		this.frameInFlight_ = null;
		this.frameTiming_ = null;
		this.lastTime_ = 0;
		this.fixedTimestep_ = 1 / 60;
		this.fixedAccumulator_ = 0;
		this.maxDeltaTime_ = .25;
		this.maxFixedSteps_ = 8;
		this.fixedStepBudgetMs_ = 8;
		this.targetFrameInterval_ = 0;
		this.nextCapFrameAt_ = 0;
		this.module_ = null;
		this.ownedCppRegistry_ = null;
		this.pipeline_ = null;
		this.compiledInstallTail_ = Promise.resolve();
		this.installed_plugins_ = [];
		this.installedPluginSet_ = /* @__PURE__ */ new Set();
		this.installedPluginNames_ = /* @__PURE__ */ new Set();
		this.subsystems_ = new Ps();
		this.buildingPlugin_ = null;
		this.buildingDomain_ = null;
		this.buildingGate_ = null;
		this.buildRollback_ = null;
		this.addingBundleSystems_ = false;
		this.sideModules_ = null;
		this.ownsSideModules_ = false;
		this.pluginsFinished_ = false;
		this.eventRegistry_ = new te();
		this.sortedSystemsCache_ = /* @__PURE__ */ new Map();
		this.dependencyCache_ = /* @__PURE__ */ new Map();
		this.error_handler_ = null;
		this.system_error_handler_ = null;
		this.statsEnabled_ = false;
		this.phaseTimings_ = null;
		this.frameScopes_ = null;
		this.currentSystem_ = "";
		this.openScopes_ = [];
		this.frameObservers_ = [];
		this.frame_paused_ = false;
		this.user_paused_ = false;
		this.step_pending_ = false;
		this.steppedFrames_ = 0;
		this.play_speed_ = 1;
		this.mainLoop = async (e, t = this.loopVersion_) => {
			if (!this.running_ || this.isExecutionHeld() || t !== this.loopVersion_) return;
			const n = typeof e === "number" && e > 0 ? e : Re();
			const r = n - this.lastTime_;
			if (this.targetFrameInterval_ > 0) {
				if (n < this.nextCapFrameAt_ - Xs) {
					this.queueLoopFrame_();
					return;
				}
				this.nextCapFrameAt_ = n - this.nextCapFrameAt_ > this.targetFrameInterval_ ? n + this.targetFrameInterval_ : this.nextCapFrameAt_ + this.targetFrameInterval_;
			}
			this.lastTime_ = n;
			const i = Math.max(0, Math.min(r / 1e3, this.maxDeltaTime_)) * this.play_speed_;
			this.frame_paused_ = false;
			this.boot_();
			await this.flushStartupSystems_();
			if (!this.running_ || this.isExecutionHeld() || t !== this.loopVersion_) return;
			const a = this.runFrame_(i, Math.max(0, r));
			this.frameInFlight_ = a;
			try {
				await a;
			} finally {
				if (this.frameInFlight_ === a) this.frameInFlight_ = null;
			}
			if (this.running_ && t === this.loopVersion_) this.queueLoopFrame_();
		};
		this.quitting_ = false;
		this.quitEpoch_ = 0;
		this.startupInFlight_ = null;
		this.world_ = new i();
		this.resources_ = new be();
		for (const e of Object.values(T)) if (typeof e === "number") this.systems_.set(e, []);
	}
	static new() {
		return new e();
	}
	getPlugin(e) {
		return this.installed_plugins_.find((t) => t instanceof e);
	}
	/** Subsystem lifecycle registry ("which modules loaded/ready/stepping/errored").
	*  Named plugins auto-register in {@link addPlugin}; async plugins (physics)
	*  drive their own initializing→ready/error transitions. */
	get subsystems() {
		return this.subsystems_;
	}
	/** The realm's optional-native-module acquirer (physics, spine). Physics and
	*  spine pull their wasm from here, so a realm wires its transport once
	*  (fetch / inlined / WeChat) and every subsystem follows. */
	get sideModules() {
		return this.sideModules_;
	}
	/**
	* `owned` says the host was made for this App alone: quitting then disposes
	* it, with the workers and module instances tied to it. A host shared with
	* anything else is left as it is, and whoever made it disposes it.
	*/
	setSideModules(e, t) {
		this.sideModules_ = e;
		this.ownsSideModules_ = t?.owned === true;
	}
	addPlugins(e) {
		const t = this.sortPlugins(e);
		for (const e of t) this.addPlugin(e);
		return this;
	}
	addPlugin(e) {
		if (this.quitting_) throw new Error("Cannot install plugins while App.quit is running");
		if (this.installedPluginSet_.has(e)) return this;
		if (e.dependencies) {
			for (const t of e.dependencies) if (typeof t === "string") {
				if (!this.installedPluginNames_.has(t)) throw new Error(`Plugin "${e.name ?? "unknown"}" requires plugin "${t}" which has not been installed`);
			} else if (!this.hasResource(t)) throw new Error(`Plugin "${e.name ?? "unknown"}" requires resource "${t._name}" which has not been registered`);
		}
		this.installedPluginSet_.add(e);
		this.installed_plugins_.push(e);
		if (e.name) {
			this.installedPluginNames_.add(e.name);
			this.subsystems_.register(e.name, { dependsOn: e.dependencies?.filter((e) => typeof e === "string") });
		}
		const t = this.buildingPlugin_;
		const n = this.buildingDomain_;
		const r = this.buildingGate_;
		const i = this.buildRollback_;
		const a = [];
		const o = this.quitEpoch_;
		this.buildRollback_ = a;
		this.buildingPlugin_ = e.name ?? null;
		this.buildingDomain_ = e.profileDomain ?? e.name ?? null;
		this.buildingGate_ = e.activeWhen?.length ? {
			components: e.activeWhen,
			frame: -1,
			open: true,
			present: true
		} : null;
		try {
			e.build(this);
			if (e.name && this.subsystems_.phaseOf(e.name) === "registered") this.subsystems_.transition(e.name, "ready");
			i?.push(() => this.rollbackPluginBuild_(e, a, o, "Enclosing plugin build failed"));
		} catch (t) {
			this.buildRollback_ = null;
			this.rollbackPluginBuild_(e, a, o, t instanceof Error ? t.message : String(t));
			throw t;
		} finally {
			this.buildingPlugin_ = t;
			this.buildingDomain_ = n;
			this.buildingGate_ = r;
			this.buildRollback_ = i;
		}
		return this;
	}
	rollbackPluginBuild_(e, t, n, r) {
		this.installedPluginSet_.delete(e);
		const i = this.installed_plugins_.indexOf(e);
		if (i >= 0) this.installed_plugins_.splice(i, 1);
		if (e.name) {
			if (!this.installed_plugins_.some((t) => t.name === e.name)) this.installedPluginNames_.delete(e.name);
			this.subsystems_.markError(e.name, r);
		}
		for (let e = t.length - 1; e >= 0 && this.quitEpoch_ === n; e--) try {
			t[e]();
		} catch (e) {
			A.error("app", "Failed plugin registration rollback error", e);
		}
		try {
			if (i >= 0) e.cleanup?.(this);
		} catch (e) {
			A.error("app", "Failed plugin build cleanup error", e);
		}
	}
	addEvent(e) {
		this.eventRegistry_.register(e);
		return this;
	}
	/**
	* The entry list for `schedule`, or a refusal that says what was wrong.
	*
	* Every valid schedule gets its list in the constructor, so a miss means the
	* caller passed something that is not a Schedule — a member that does not
	* exist (`Schedule.LateUpdate` evaluates to `undefined`), or the two
	* arguments the wrong way round. Neither is caught before it runs: the
	* editor and the mini-game exporters bundle project code with esbuild, which
	* strips types without checking them, so a registration TypeScript would
	* have rejected reaches the App intact.
	*
	* It used to be `systems_.get(schedule)!`, which turned both into "Cannot
	* read properties of undefined (reading 'push')" thrown from inside a
	* minified bundle, naming neither the system nor the value.
	*/
	/** Whether a plugin's systems run this frame: some entity has one of its components, or had last frame. */
	gateOpen_(e) {
		const t = this.hasResource(O) ? this.getResource(O).frameCount : 0;
		if (e.frame === t) return e.open;
		const n = this.world;
		let r = false;
		for (const t of e.components) try {
			if (n.queryEntities([t]).length > 0) {
				r = true;
				break;
			}
		} catch {
			r = true;
			break;
		}
		e.open = r || e.present;
		e.present = r;
		e.frame = t;
		return e.open;
	}
	registeringDomain_() {
		if (this.buildingDomain_) return this.buildingDomain_;
		return this.addingBundleSystems_ ? Fs : Is;
	}
	scheduleBucket_(e, t) {
		const n = this.systems_.get(e);
		if (n) return n;
		const r = Object.entries(T).filter(([, e]) => typeof e === "number").map(([e, t]) => `${e} (${String(t)})`).join(", ");
		throw new Error(`addSystemToSchedule("${t}"): ${Ys(e)} is not a schedule. Expected one of: ${r}. Check the Schedule member exists, and that the schedule comes before the system.`);
	}
	/**
	* Register `system` onto `schedule`, adding ordering to its declared edges.
	* `profileDomain` attributes systems registered after an async plugin build
	* returns; otherwise the current build context supplies it.
	*/
	addSystemToSchedule(e, t, n) {
		const r = t._name || `System_${++this.systemCounter_}`;
		const i = y(t, r);
		this.registerSystemEntry_(e, t._id, {
			system: i,
			runBefore: ce(t._runBefore, n?.runBefore),
			runAfter: ce(t._runAfter, n?.runAfter),
			runIf: n?.runIf,
			subsystem: this.buildingPlugin_ ?? void 0,
			fromBundle: this.addingBundleSystems_ || void 0,
			domain: n?.profileDomain ?? this.registeringDomain_(),
			...n?.activeWhen?.length ? { gate: {
				components: n.activeWhen,
				frame: -1,
				open: true,
				present: true
			} } : this.buildingGate_ ? { gate: this.buildingGate_ } : {}
		});
		this.sortedSystemsCache_.delete(e);
		this.dependencyCache_.delete(e);
		return this;
	}
	registerSystemEntry_(e, t, n) {
		const r = this.scheduleBucket_(e, n.system._name);
		const i = this.templateToRuntime_.get(t);
		this.templateToRuntime_.set(t, n.system._id);
		r.push(n);
		this.buildRollback_?.push(() => {
			const r = this.systems_.get(e);
			const a = r?.indexOf(n) ?? -1;
			if (a >= 0) r.splice(a, 1);
			this.sortedSystemsCache_.delete(e);
			this.dependencyCache_.delete(e);
			this.runner_?.evict(n.system._id);
			if (this.templateToRuntime_.get(t) === n.system._id) if (i === void 0) this.templateToRuntime_.delete(t);
			else this.templateToRuntime_.set(t, i);
		});
	}
	addSystem(e) {
		return this.addSystemToSchedule(3, e);
	}
	/**
	* Register systems drained from the PROJECT BUNDLE, marking them as the set
	* hot reload may swap. The bundle drain is the one boundary that separates
	* user-authored systems from everything the engine registers — plugin
	* builds tag themselves, but lazily-added engine systems are told apart
	* from user code only by which door they came through.
	* @internal
	*/
	addBundleSystems(e) {
		this.addingBundleSystems_ = true;
		try {
			for (const t of e) if (t.system._kind === "set") this.addSystemSetToSchedule(t.schedule, t.system);
			else this.addSystemToSchedule(t.schedule, t.system);
		} finally {
			this.addingBundleSystems_ = false;
		}
		return this;
	}
	addStartupSystem(e) {
		return this.addSystemToSchedule(0, e);
	}
	/**
	* Hot-swap the project's (user-authored) system function bodies in place, keeping
	* the live World/Registry/entities — the state-preserving hot-reload fast path
	* (RC10 P3). `incoming` is the freshly re-imported bundle's drained systems.
	*
	* Returns false when the structure changed — a user system was added, removed, or
	* renamed, or a schedule's user-system count differs — because the running systems
	* then no longer line up with the new code, so the caller must full-reload instead.
	* Builtin/plugin systems (those with an owning subsystem) are never touched. The
	* match validates fully before mutating, so a rejected swap leaves the scheduler
	* untouched (no torn half-swap). Component identity is stable by name (see
	* component.ts), so the new functions' queries resolve to the live storage.
	*/
	hotSwapSystems(t) {
		const n = /* @__PURE__ */ new Map();
		for (const e of t) {
			const t = n.get(e.schedule);
			if (t) t.push(e.system);
			else n.set(e.schedule, [e.system]);
		}
		const r = (e) => (this.systems_.get(e) ?? []).filter((e) => e.fromBundle === true);
		for (const [t, i] of n) {
			if (t === 0) continue;
			const n = r(t);
			if (n.length !== i.length) {
				A.info("hotReload", `structure: schedule ${T[t]} has ${n.length} live user system(s) [${n.map((e) => e.system._name).join(", ")}] vs ${i.length} incoming [${i.map((e) => e._name || "(unnamed)").join(", ")}]`);
				return false;
			}
			for (let r = 0; r < n.length; r++) if (!e.systemNamesCompatible(n[r].system._name, i[r]._name)) {
				A.info("hotReload", `structure: schedule ${T[t]} system #${r} renamed "${n[r].system._name}" -> "${i[r]._name || "(unnamed)"}"`);
				return false;
			}
		}
		for (const [e, t] of this.systems_) {
			if (e === 0) continue;
			if (!n.has(e) && t.some((e) => e.fromBundle === true)) {
				A.info("hotReload", `structure: schedule ${T[e]} lost its user systems in the new bundle`);
				return false;
			}
		}
		for (const [e, t] of n) {
			if (e === 0) continue;
			const n = r(e);
			for (let e = 0; e < n.length; e++) {
				const r = n[e].system;
				n[e].system = {
					_id: r._id,
					_params: t[e]._params,
					_fn: t[e]._fn,
					_name: r._name
				};
			}
			this.sortedSystemsCache_.delete(e);
			this.dependencyCache_.delete(e);
		}
		return true;
	}
	/** A live (scoped) system name and a re-imported raw name refer to the same system
	*  if the live one is an explicit name that matches, or both are auto-named (the
	*  live `System_N` placeholder ⇔ an unnamed re-import). */
	static systemNamesCompatible(e, t) {
		return /^System_\d+$/.test(e) ? t === "" : t === e;
	}
	/**
	* Register every system in `set` onto `schedule`. Each member gets the set's
	* `runIf`, and the set's `runBefore` / `runAfter` edges on top of any it
	* declared itself; members keep the order they were listed in. Other systems
	* may reference the set's name in their own ordering, and the scheduler
	* expands those references to every member.
	*/
	addSystemSetToSchedule(e, t) {
		const n = [];
		for (const r of t._systems) {
			const i = r._name || `System_${String(++this.systemCounter_)}`;
			n.push(i);
			const a = ce(r._runBefore, t._runBefore);
			const o = ce(r._runAfter, t._runAfter);
			const s = t._runIf;
			const c = s ? (() => s()) : void 0;
			const l = y(r, i);
			this.registerSystemEntry_(e, r._id, {
				system: l,
				runBefore: a,
				runAfter: o,
				runIf: c,
				subsystem: this.buildingPlugin_ ?? void 0,
				domain: this.registeringDomain_()
			});
		}
		this.sortedSystemsCache_.delete(e);
		this.dependencyCache_.delete(e);
		const r = this.setMembership_.get(t._name);
		const i = r ? [...r, ...n] : n;
		this.setMembership_.set(t._name, i);
		this.buildRollback_?.push(() => {
			if (this.setMembership_.get(t._name) !== i) return;
			if (r) this.setMembership_.set(t._name, r);
			else this.setMembership_.delete(t._name);
		});
		return this;
	}
	/** Shortcut for `addSystemSetToSchedule(Schedule.Update, set)`. */
	addSystemSet(e) {
		return this.addSystemSetToSchedule(3, e);
	}
	removeSystem(e) {
		const t = this.templateToRuntime_.get(e) ?? e;
		let n = false;
		for (const [e, r] of this.systems_) {
			const i = r.filter((e) => e.system._id !== t);
			if (i.length !== r.length) {
				this.systems_.set(e, i);
				this.sortedSystemsCache_.delete(e);
				this.dependencyCache_.delete(e);
				n = true;
			}
		}
		if (n) {
			this.runner_?.evict(t);
			this.templateToRuntime_.delete(e);
		}
		return n;
	}
	/**
	* Bind the app to an engine core. Part of the embedding contract, which is
	* `esengine/wasm` — a host builds the module and calls this; a game is
	* handed an App that is already connected.
	* `ownedRegistry` transfers a newly constructed instance to this App after
	* the connection guards pass; failed verification releases it too. Omit
	* it for a registry whose lifetime belongs to the embedding host.
	*
	* @internal
	*/
	connectCpp(e, t, n) {
		if (this.quitting_) throw new Error("Cannot connect a registry while App.quit is releasing it");
		if (this.ownedCppRegistry_ && this.ownedCppRegistry_ !== e) throw new Error("Quit the App before replacing its owned registry");
		try {
			this.world_.connectCpp(e, t, n);
		} catch (t) {
			if (n?.ownedRegistry && this.ownedCppRegistry_ !== e) {
				this.world_.disconnectCpp();
				try {
					e.delete();
				} catch (e) {
					A.warn("app", "Failed registry connection release error", e);
				}
			}
			throw t;
		}
		if (n?.ownedRegistry) this.ownedCppRegistry_ = e;
		if (t) this.module_ = t;
		return this;
	}
	/** @internal */
	get wasmModule() {
		return this.module_;
	}
	get pipeline() {
		return this.pipeline_;
	}
	setPipeline(e) {
		this.pipeline_ = e;
	}
	get spineInitPromise() {
		return this.spineInitPromise_;
	}
	set spineInitPromise(e) {
		this.spineInitPromise_ = e;
	}
	async waitForPhysics() {
		if (!this.hasResource(At)) {
			A.warn("app", "No Physics2DPlugin installed, waitForPhysics() is a no-op");
			return;
		}
		const e = this.getResource(At).initPromise;
		if (e) await e;
	}
	get isPhysicsReady() {
		return this.hasResource(At) && this.getResource(At).module != null;
	}
	get world() {
		return this.world_;
	}
	/**
	* Run the compiled twins a build produced instead of the systems' closures.
	* Call it BEFORE the world has any pooled component: the rows must be in the
	* memory the module reads. Refuses rather than degrades — a module built for
	* other offsets reads a different field, which is not an error.
	*
	* @experimental
	*/
	async useCompiledSystems(e) {
		const t = this.reserveCompiledInstall_();
		await t.ready;
		try {
			const n = t.epoch;
			this.checkCompiledInstallEpoch_(n);
			this.ensureTime_();
			const r = await Hr({
				world: this.world_,
				host: e.host,
				manifest: e.manifest,
				wasm: e.wasm,
				beforeCommit: () => this.checkCompiledInstallEpoch_(n),
				resourceFields: (e) => {
					const t = pe(e) ?? this.resources_.getByName(e) ?? ye(e);
					if (t === void 0) return void 0;
					const n = this.resources_.get(t);
					return typeof n === "object" && n !== null ? Object.keys(n) : [];
				},
				events: (e) => {
					const t = fe(e);
					if (t === void 0) return void 0;
					const n = this.eventRegistry_.getBus(t);
					return {
						read: () => n.getReadBuffer(),
						send: (e) => n.send(e)
					};
				},
				resources: (e) => {
					const t = pe(e) ?? this.resources_.getByName(e) ?? ye(e);
					return t === void 0 ? void 0 : this.resources_.get(t);
				}
			});
			if (n !== this.quitEpoch_) {
				r.dispose?.();
				throw new Error("Compiled systems installation was cancelled by App.quit");
			}
			this.commitCompiledRuntime_(r, n);
		} finally {
			t.done();
		}
	}
	reserveCompiledInstall_() {
		const e = this.compiledInstallTail_;
		let t;
		this.compiledInstallTail_ = new Promise((e) => {
			t = e;
		});
		return {
			ready: e,
			done: t,
			epoch: this.quitEpoch_
		};
	}
	checkCompiledInstallEpoch_(e) {
		if (this.quitting_ || e !== this.quitEpoch_) throw new Error("Compiled systems installation was cancelled by App.quit");
	}
	commitCompiledRuntime_(e, t) {
		const n = this.aot_;
		try {
			this.runner_?.useAot(e);
		} catch (t) {
			try {
				this.runner_?.useAot(n);
			} catch (e) {
				A.warn("app", "Compiled dispatch restore error", e);
			}
			try {
				e.dispose?.();
			} catch (e) {
				A.warn("app", "Compiled installation cleanup error", e);
			}
			throw t;
		}
		this.aot_ = e;
		try {
			n?.dispose?.();
		} catch (e) {
			A.warn("app", "Compiled runtime replacement cleanup error", e);
		}
		this.checkCompiledInstallEpoch_(t);
	}
	/**
	* Which systems this App is running compiled, and how many twin calls have
	* happened. `installed` without `calls` rising means the module loaded and
	* nothing dispatched to it — which no differential can report, because the
	* closure it replaced computes the same answer.
	*
	* @experimental
	*/
	get compiledSystems() {
		return {
			installed: this.aot_?.systems.names() ?? [],
			calls: this.aot_?.systems.calls ?? 0
		};
	}
	setFixedTimestep(e) {
		this.fixedTimestep_ = e;
		return this;
	}
	/** The fixed-update timestep (seconds) — the FixedUpdate / physics cadence. */
	getFixedTimestep() {
		return this.fixedTimestep_;
	}
	setMaxDeltaTime(e) {
		this.maxDeltaTime_ = e;
		return this;
	}
	setMaxFixedSteps(e) {
		this.maxFixedSteps_ = e;
		return this;
	}
	onError(e) {
		this.error_handler_ = e;
		return this;
	}
	onSystemError(e) {
		this.system_error_handler_ = e;
		return this;
	}
	onWasmError(e) {
		u(e);
		return this;
	}
	/** Pause simulation time and ordinary systems; presentation opt-ins and Last still run. */
	setPaused(e) {
		this.user_paused_ = e;
	}
	isPaused() {
		return this.user_paused_ || !!qs.get(this)?.size;
	}
	stepFrame() {
		if (this.isExecutionHeld()) return;
		this.step_pending_ = true;
	}
	setPlaySpeed(e) {
		this.play_speed_ = Math.max(.1, Math.min(4, e));
	}
	setTargetFrameRate(e) {
		this.targetFrameInterval_ = e > 0 ? 1e3 / e : 0;
		this.nextCapFrameAt_ = 0;
		globalThis.es_setTargetFrameRate?.(e > 0 ? e : 0);
	}
	/**
	* Keep simulating while the page is hidden — a window behind others, a
	* minimized one, or one never shown (an editor driven by automation).
	*
	* A browser stops `requestAnimationFrame` for a hidden document, so without
	* this the game holds still there: what a shipped game wants, since nobody is
	* watching and the battery is. An editor's Play wants the opposite; Unity
	* calls the same switch `Application.runInBackground`. While hidden the loop
	* runs on a timer at the frame cap (60 fps when uncapped).
	*/
	setRunInBackground(e) {
		this.runInBackground_ = e;
		if (typeof document === "undefined") return;
		if (e && !this.onVisibility_) {
			this.onVisibility_ = () => {
				if (this.queuedFrame_ === null || this.queuedOnTimer_ || document.visibilityState !== "hidden") return;
				if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(this.queuedFrame_);
				this.queuedFrame_ = null;
				this.queueLoopFrame_();
			};
			document.addEventListener("visibilitychange", this.onVisibility_);
		} else if (!e && this.onVisibility_) {
			document.removeEventListener("visibilitychange", this.onVisibility_);
			this.onVisibility_ = null;
		}
	}
	getRunInBackground() {
		return this.runInBackground_;
	}
	getTargetFrameRate() {
		return this.targetFrameInterval_ > 0 ? 1e3 / this.targetFrameInterval_ : 0;
	}
	getPlaySpeed() {
		return this.play_speed_;
	}
	enableStats() {
		this.statsEnabled_ = true;
		this.phaseTimings_ = /* @__PURE__ */ new Map();
		this.frameScopes_ = /* @__PURE__ */ new Map();
		this.runner_?.setTimingEnabled(true);
		return this;
	}
	getSystemTimings() {
		return this.runner_?.getTimings() ?? null;
	}
	getPhaseTimings() {
		return this.phaseTimings_;
	}
	/** @experimental The last completed frame's clock readings; see {@link FrameTiming}. */
	getFrameTiming() {
		return this.frameTiming_;
	}
	/** Frames requested by stepping controls, excluded from wall-clock FPS windows. */
	getSteppedFrameCount() {
		return this.steppedFrames_;
	}
	/**
	* Sub-frame CPU scopes recorded this frame via {@link measureFrameScope} —
	* the finer breakdown within a single system, keyed by scope name. Null when
	* stats aren't enabled. Sibling of {@link getSystemTimings} /
	* {@link getPhaseTimings}; surfaces as the profiler's `js.*` rows.
	*/
	getFrameScopes() {
		if (!this.frameScopes_) return null;
		const e = /* @__PURE__ */ new Map();
		for (const [t, n] of this.frameScopes_) e.set(t, n.ms);
		return e;
	}
	/**
	* This frame's costs with the attribution a profile tree needs: which domain
	* owns each system, which system each scope ran inside. Null when stats are
	* off. Feed to `buildFrameProfile`, which is where the tree is derived.
	*/
	getFrameCosts() {
		if (!this.frameScopes_) return null;
		const e = this.runner_?.getTimings();
		const t = /* @__PURE__ */ new Map();
		for (const e of this.systems_.values()) for (const n of e) t.set(n.system._name, n.domain);
		const n = this.runner_?.getQueryCosts();
		const r = [];
		for (const [i, a] of e ?? []) {
			const e = n?.get(i);
			r.push({
				name: i,
				ms: a,
				domain: t.get(i) ?? "unattributed",
				...e ? { query: e } : {}
			});
		}
		return {
			systems: r,
			scopes: [...this.frameScopes_.values()]
		};
	}
	/**
	* Time `fn` as a named sub-frame scope (accumulated if the name repeats in a
	* frame). A no-op passthrough when stats are off, so shipped games pay only a
	* single branch. Use it to split a heavy system into attributable pieces.
	*
	* `remainder: 'wait'` declares that whatever time is left under this scope
	* once its native scopes are subtracted is CPU blocked, not work — the
	* swapchain block a GPU submit absorbs, or an await. The profiler keeps such
	* time out of every cost total instead of reporting it as a hotspot.
	*/
	measureFrameScope(e, t, n) {
		const r = this.frameScopes_;
		if (!r) return t();
		const i = this.openScopes_[this.openScopes_.length - 1];
		this.openScopes_.push(e);
		const a = performance.now();
		try {
			return t();
		} finally {
			const t = performance.now() - a;
			this.openScopes_.pop();
			const o = r.get(e);
			r.set(e, {
				name: e,
				ms: (o?.ms ?? 0) + t,
				system: o?.system ?? this.currentSystem_,
				remainder: n?.remainder ?? "work",
				...i !== void 0 ? { parent: i } : {}
			});
		}
	}
	/**
	* Observe the end of every frame, once its systems have run and its timings
	* are final. Returns a disposer.
	*
	* A broadcast, not a slot: a recorder and a game's own budget alarm both
	* watch without either taking the hook from the other.
	*/
	onFrameEnd(e) {
		this.frameObservers_.push(e);
		return () => {
			const t = this.frameObservers_.indexOf(e);
			if (t >= 0) this.frameObservers_.splice(t, 1);
		};
	}
	getEntityCount() {
		return this.world_.entityCount();
	}
	insertResource(e, t) {
		this.resources_.insert(e, t);
		return this;
	}
	getResource(e) {
		return this.resources_.get(e);
	}
	hasResource(e) {
		return this.resources_.has(e);
	}
	getResourceByName(e) {
		const t = pe(e) ?? this.resources_.getByName(e) ?? ye(e);
		return t ? this.resources_.get(t) : void 0;
	}
	getResourceChangeTick(e) {
		const t = this.resources_.getByName(e);
		return t ? this.resources_.getChangeTick(t) : 0;
	}
	getRegisteredResourceNames() {
		return this.resources_.getRegisteredNames();
	}
	/**
	* Every resource this app holds, as `[name, value]` — what an inspector
	* shows. Includes the slots only a read has materialised, which
	* {@link getRegisteredResourceNames} (insert-only) does not.
	*/
	getResourceEntries() {
		return this.resources_.entries();
	}
	registerScene(e) {
		this.getResource(K).register(e);
		return this;
	}
	setInitialScene(e) {
		this.getResource(K).setInitial(e);
		return this;
	}
	/**
	* How many compiled twins this App runs. Zero unless a build installed some,
	* which is the whole of the mode policy — and the one number that tells a
	* shipped AOT build apart from a shipped interpreted one from outside.
	*/
	get compiledSystemCount() {
		return this.aot_?.systems.size ?? 0;
	}
	/**
	* Install the compiled twins a build produced, and answer how many
	* (docs/REARCH_AOT.md §9). Call it BEFORE any component exists — a twin reads
	* rows in the ENGINE's memory, and refuses rather than move rows already
	* allocated elsewhere, or trust a module built for other offsets.
	*/
	async installCompiledSystems(e, t) {
		const n = this.reserveCompiledInstall_();
		await n.ready;
		try {
			const r = n.epoch;
			this.checkCompiledInstallEpoch_(r);
			const i = this.installNative_(e, t);
			if (i !== null) return i;
			const a = e;
			const o = this.module_;
			if (!o) throw new Error("installCompiledSystems: this App has no engine module, and a compiled system reads the memory of one");
			const s = o.wasmMemory;
			if (s && (typeof WebAssembly === "undefined" || !(s instanceof WebAssembly.Memory))) {
				A.info("runtime", "AOT: this engine runs without WebAssembly, so its compiled systems stay interpreted");
				return 0;
			}
			if (!s) throw new Error("installCompiledSystems: this engine artifact does not export 'wasmMemory', so there is no memory for the module to import — rebuild the engine");
			const c = {
				allocatorIdentity: o,
				memory: s,
				_malloc: (e) => o._malloc(e),
				_free: (e) => o._free(e),
				get HEAPU8() {
					return o.HEAPU8;
				}
			};
			this.ensureTime_();
			const l = await Hr({
				world: this.world_,
				host: c,
				manifest: t,
				wasm: a,
				beforeCommit: () => this.checkCompiledInstallEpoch_(r),
				resources: (e) => this.getResourceByName(e)
			});
			if (r !== this.quitEpoch_) {
				l.dispose?.();
				throw new Error("Compiled systems installation was cancelled by App.quit");
			}
			this.ensureRunner_();
			this.commitCompiledRuntime_(l, r);
			return l.systems.size;
		} finally {
			n.done();
		}
	}
	/**
	* The same, where the host loads a library. Null when this is not such a
	* host, which is every host but a native one — and then the caller falls
	* through to the module road above.
	*/
	installNative_(e, t) {
		if (typeof e !== "string") return null;
		const n = Zr();
		const r = ii();
		if (n === null || r === null) return null;
		this.ensureTime_();
		const i = this.quitEpoch_;
		const a = Qr({
			world: this.world_,
			runner: this.ensureRunner_(),
			modulePath: e,
			manifest: t,
			heap: r,
			bindings: n,
			resources: (e) => this.getResourceByName(e)
		});
		if (a === null) return 0;
		if (i !== this.quitEpoch_) {
			a.dispose?.();
			this.runner_?.useAot(this.aot_);
			throw new Error("Compiled systems installation was cancelled by App.quit");
		}
		this.commitCompiledRuntime_(a, i);
		return a.systems.size;
	}
	async tick(e) {
		if (this.isExecutionHeld()) return;
		const t = this.executionEpoch_;
		this.frame_paused_ = false;
		this.boot_();
		await this.flushStartupSystems_();
		if (t !== this.executionEpoch_ || this.isExecutionHeld()) return;
		await this.runFrame_(e);
	}
	/** Hold frame execution without changing the game's own pause state. */
	holdExecution() {
		const e = {}, t = this.quitEpoch_;
		const n = this.executionHolds_.size === 0;
		this.executionHolds_.add(e);
		if (n) {
			this.executionEpoch_++;
			this.frame_paused_ = true;
			this.invalidateLoop_();
			if (this.hasResource(P)) jt(this.getResource(P), this, true);
			this.notifyExecution_();
		}
		return () => {
			if (t !== this.quitEpoch_ || !this.executionHolds_.delete(e) || this.executionHolds_.size) return;
			if (this.hasResource(P)) jt(this.getResource(P), this, false);
			this.notifyExecution_();
			if (this.isExecutionHeld()) return;
			const n = this.loopVersion_;
			(this.frameInFlight_ ?? Promise.resolve()).then(() => {
				if (!this.running_ || this.isExecutionHeld() || n !== this.loopVersion_) return;
				this.lastTime_ = Re();
				if (typeof requestAnimationFrame === "function") this.queueLoopFrame_();
				else this.mainLoop();
			});
		};
	}
	isExecutionHeld() {
		return this.executionHolds_.size > 0;
	}
	/** Observe execution holds, including the initial state. Media/timer owners can cooperate here. */
	onExecutionChange(e) {
		this.executionObservers_.push(e);
		this.callExecutionObserver_(e);
		return () => {
			const t = this.executionObservers_.indexOf(e);
			if (t >= 0) this.executionObservers_.splice(t, 1);
		};
	}
	notifyExecution_() {
		for (const e of [...this.executionObservers_]) this.callExecutionObserver_(e);
	}
	callExecutionObserver_(e) {
		try {
			const t = e(this.isExecutionHeld());
			if (t instanceof Promise) t.catch((e) => A.error("app", "Execution observer error", e));
		} catch (e) {
			A.error("app", "Execution observer error", e);
		}
	}
	/**
	* Advance exactly `frames` frames of exactly `dt` seconds, with the rAF loop held
	* off for the duration — "let the game run a bit", made reproducible.
	*
	* The loop it replaces is wall-clock and browser-scheduled: a backgrounded tab is
	* throttled to about one frame a second, so an observer that steps by waiting sees
	* a frozen game and concludes the game is broken. Worse, there was no other door —
	* a driver that needed the next 30 frames of simulation had to reach for
	* `runFrame_`, and reaching for a private method is a thing that keeps working
	* until the day it doesn't.
	*
	* A PAUSED app still steps here: advancing frame by frame is exactly what stepping
	* a paused game means. The pause (and the loop) are restored afterwards, with the
	* clock re-based so the first resumed frame is not handed the whole excursion as
	* its delta.
	*/
	async stepFrames(e = 1, t = 1 / 60) {
		if (this.isExecutionHeld()) return;
		const n = this.executionEpoch_, r = this.quitEpoch_;
		const i = this.step_pending_;
		const a = this.running_;
		const o = this.user_paused_;
		this.invalidateLoop_();
		const s = this.loopVersion_;
		this.running_ = false;
		try {
			await this.frameInFlight_;
			this.user_paused_ = false;
			for (let r = 0; r < e; r++) {
				if (this.isExecutionHeld() || n !== this.executionEpoch_) break;
				this.step_pending_ = true;
				await this.tick(t);
			}
		} finally {
			if (r === this.quitEpoch_) {
				this.user_paused_ = o;
				if (n !== this.executionEpoch_ || this.isExecutionHeld()) this.step_pending_ = i;
			}
			if (a && r === this.quitEpoch_ && (s === this.loopVersion_ || n !== this.executionEpoch_)) {
				this.lastTime_ = Re();
				this.running_ = true;
				if (!this.isExecutionHeld()) if (typeof requestAnimationFrame === "function") this.queueLoopFrame_();
				else this.mainLoop();
			}
		}
	}
	async run() {
		if (this.running_) return;
		this.running_ = true;
		if (this.isExecutionHeld()) return;
		const e = this.loopVersion_;
		this.frame_paused_ = false;
		this.boot_();
		await this.flushStartupSystems_();
		if (!this.running_ || this.isExecutionHeld() || e !== this.loopVersion_) return;
		this.lastTime_ = Re();
		this.mainLoop();
	}
	invalidateLoop_() {
		this.loopVersion_++;
		if (this.queuedFrame_ !== null) {
			if (this.queuedOnTimer_) clearTimeout(this.queuedFrame_);
			else if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(this.queuedFrame_);
		}
		this.queuedFrame_ = null;
	}
	queueLoopFrame_() {
		if (this.isExecutionHeld() || this.queuedFrame_ !== null) return;
		if (typeof requestAnimationFrame !== "function") return;
		const e = this.loopVersion_;
		if (typeof document !== "undefined" && document.visibilityState === "hidden" && this.runInBackground_) {
			this.queuedOnTimer_ = true;
			this.queuedFrame_ = setTimeout(() => {
				if (e !== this.loopVersion_) return;
				this.queuedFrame_ = null;
				this.mainLoop(Re(), e);
			}, this.targetFrameInterval_ > 0 ? this.targetFrameInterval_ : 1e3 / 60);
			return;
		}
		this.queuedOnTimer_ = false;
		this.queuedFrame_ = requestAnimationFrame((t) => {
			if (e !== this.loopVersion_) return;
			this.queuedFrame_ = null;
			return this.mainLoop(t, e);
		});
	}
	quit(e) {
		if (this.quitting_) return;
		this.quitting_ = true;
		this.quitEpoch_++;
		try {
			this.quit_(e);
		} finally {
			this.quitting_ = false;
		}
	}
	quit_(e) {
		this.executionEpoch_++;
		this.executionHolds_.clear();
		if (this.hasResource(P)) jt(this.getResource(P), this, false);
		this.invalidateLoop_();
		this.setRunInBackground(false);
		this.running_ = false;
		for (let e = this.installed_plugins_.length - 1; e >= 0; e--) try {
			this.installed_plugins_[e].cleanup?.(this);
		} catch (e) {
			A.error("app", "Plugin cleanup error", e);
		}
		this.installed_plugins_.length = 0;
		this.executionObservers_.length = 0;
		this.installedPluginSet_.clear();
		this.installedPluginNames_.clear();
		for (const e of this.world_.getAllEntities()) try {
			this.world_.despawn(e);
		} catch (e) {
			A.warn("app", "Shutdown despawn error", e);
		}
		const t = this.aot_;
		this.aot_ = null;
		this.runner_?.useAot(null);
		try {
			t?.dispose?.();
		} catch (e) {
			A.warn("app", "Shutdown compiled-runtime release error", e);
		}
		try {
			this.world_.releaseScriptPools();
		} catch (e) {
			A.warn("app", "Shutdown script-pool release error", e);
		}
		this.world_.disconnectCpp();
		const n = this.ownedCppRegistry_;
		this.ownedCppRegistry_ = null;
		try {
			n?.delete();
		} catch (e) {
			A.warn("app", "Shutdown registry release error", e);
		}
		const r = this.ownsSideModules_ ? this.sideModules_ : null;
		this.ownsSideModules_ = false;
		try {
			r?.dispose?.();
		} catch (e) {
			A.warn("app", "Shutdown module-host release error", e);
		}
		for (const [, e] of this.systems_) e.length = 0;
		this.sortedSystemsCache_.clear();
		this.dependencyCache_.clear();
		this.templateToRuntime_.clear();
		this.systemCounter_ = 0;
		this.pipeline_ = null;
		this.runner_ = null;
		this.booted_ = false;
		this.aot_ = null;
		if (!e?.keepRenderer) {
			this.module_?.shutdownRenderer?.();
			this.module_ = null;
		}
	}
	/**
	* The runner, made on demand. Making one is free and decides nothing — what
	* has to happen exactly once before a frame is in `boot_`, so a caller that
	* needs the runner early (a compiled-systems install) does not consume the
	* boot by asking.
	*/
	ensureRunner_() {
		if (!this.runner_) {
			this.runner_ = new ae(this.world_, this.resources_, this.eventRegistry_);
			if (this.aot_) this.runner_.useAot(this.aot_);
			if (this.statsEnabled_) this.runner_.setTimingEnabled(true);
		}
		return this.runner_;
	}
	/**
	* The clock, before anything asks for it. Installing compiled systems is one
	* such thing and it runs BEFORE the first frame: a twin declaring `Res(Time)`
	* is refused outright if this App cannot yet say what Time's fields are.
	*/
	ensureSpeculation_() {
		if (this.resources_.has(dn)) return;
		this.resources_.insert(dn, new un(this.world, this.resources_, this.eventRegistry_));
	}
	ensureTime_() {
		if (this.resources_.has(O)) return;
		this.resources_.insert(O, {
			delta: 0,
			elapsed: 0,
			frameCount: 0,
			fixedDelta: this.fixedTimestep_,
			fixedAlpha: 0,
			fixedTick: 0,
			scale: 1,
			unscaledDelta: 0
		});
		this.ensureSpeculation_();
	}
	/** Once per app, on the way into the first frame: the clock every system
	*  reads, and the plugins' last chance to add one. */
	boot_() {
		this.ensureRunner_();
		if (this.booted_) return;
		this.booted_ = true;
		this.ensureTime_();
		this.finishPlugins_();
	}
	async runFrame_(e, t = e * 1e3) {
		if (this.isExecutionHeld()) return;
		const n = this.executionEpoch_;
		const r = () => !this.isExecutionHeld() && n === this.executionEpoch_;
		const i = typeof performance !== "undefined" && typeof performance.now === "function" ? performance : null;
		const a = i ? i.now() : 0;
		this.runner_?.clearTimings();
		this.phaseTimings_?.clear();
		this.frameScopes_?.clear();
		this.eventRegistry_.swapAll();
		this.world_.advanceTick();
		this.updateTime(e);
		this.world_.resetQueryPool();
		this.frame_paused_ = false;
		if (this.isPaused() && !this.step_pending_) {
			await this.runSchedule(1, n, true);
			await this.runSchedule(2, n, true);
			await this.runSchedule(3, n, true);
			await this.runSchedule(4, n, true);
			await this.runSchedule(5, n);
		} else {
			await this.runSchedule(1, n);
			if (!r()) return;
			this.fixedAccumulator_ += this.resources_.get(O).delta;
			let e = 0;
			const t = this.resources_.has(P) ? this.resources_.get(P) : null;
			const i = typeof performance !== "undefined" && typeof performance.now === "function" ? performance : null;
			const a = i ? i.now() : 0;
			while (this.fixedAccumulator_ >= this.fixedTimestep_ && e < this.maxFixedSteps_) {
				this.fixedAccumulator_ -= this.fixedTimestep_;
				this.resources_.get(O).fixedTick++;
				t?.beginFixedStep();
				await this.runSchedule(10, n);
				await this.runSchedule(11, n);
				await this.runSchedule(12, n);
				t?.endFixedStep();
				if (!r()) return;
				e++;
				if (i && i.now() - a >= this.fixedStepBudgetMs_) break;
			}
			if (this.fixedAccumulator_ >= this.fixedTimestep_) this.fixedAccumulator_ = 0;
			this.resources_.get(O).fixedAlpha = this.fixedTimestep_ > 0 ? this.fixedAccumulator_ / this.fixedTimestep_ : 0;
			await this.runSchedule(2, n);
			await this.runSchedule(3, n);
			await this.runSchedule(4, n);
			await this.runSchedule(5, n);
			if (this.step_pending_) this.step_pending_ = false;
		}
		if (!r()) return;
		this.frameTiming_ = {
			seq: (this.frameTiming_?.seq ?? 0) + 1,
			frameMs: t,
			busyMs: i ? i.now() - a : -1
		};
		for (const e of this.frameObservers_) try {
			e(t);
		} catch (e) {
			A.error("app", "Frame observer error", e);
		}
	}
	finishPlugins_() {
		if (this.pluginsFinished_) return;
		this.pluginsFinished_ = true;
		for (const e of this.installed_plugins_) try {
			e.finish?.(this);
		} catch (t) {
			A.error("app", `Plugin "${e.name ?? "unknown"}" finish error`, t);
		}
	}
	sortPlugins(e) {
		if (e.length <= 1) return e;
		const t = /* @__PURE__ */ new Map();
		for (let n = 0; n < e.length; n++) {
			const r = e[n].name;
			if (r) {
				if (t.has(r)) A.warn("app", `Duplicate plugin name "${r}" at indices ${t.get(r)} and ${n}`);
				t.set(r, n);
			}
		}
		const n = /* @__PURE__ */ new Map();
		for (let t = 0; t < e.length; t++) n.set(t, /* @__PURE__ */ new Set());
		for (let r = 0; r < e.length; r++) {
			const i = e[r];
			if (i.dependencies) for (const e of i.dependencies) {
				if (typeof e !== "string") continue;
				const i = t.get(e);
				if (i !== void 0) n.get(r).add(i);
			}
			if (i.after) for (const e of i.after) {
				const i = t.get(e);
				if (i !== void 0) n.get(r).add(i);
			}
			if (i.before) for (const e of i.before) {
				const i = t.get(e);
				if (i !== void 0) n.get(i).add(r);
			}
		}
		const r = [];
		const i = /* @__PURE__ */ new Set();
		const a = /* @__PURE__ */ new Set();
		const o = [];
		const s = (t) => {
			if (i.has(t)) return;
			if (a.has(t)) {
				const n = o.indexOf(t);
				const r = o.slice(n).concat(t).map((t) => e[t].name ?? `<index ${t}>`);
				throw new Error(`Circular plugin dependency: ${r.join(" -> ")}`);
			}
			a.add(t);
			o.push(t);
			for (const e of n.get(t)) s(e);
			o.pop();
			a.delete(t);
			i.add(t);
			r.push(e[t]);
		};
		for (let t = 0; t < e.length; t++) s(t);
		return r;
	}
	/**
	* Expands an ordering name to the indices it refers to — a system, or every
	* member of a set that is also in this schedule. A name matching neither
	* resolves to nothing, which is how ordering against a system that was never
	* registered stays a no-op rather than an error.
	*/
	resolverFor(e) {
		const t = /* @__PURE__ */ new Map();
		for (let n = 0; n < e.length; n++) t.set(e[n].system._name, n);
		return (e) => {
			const n = t.get(e);
			if (n !== void 0) return [n];
			const r = this.setMembership_.get(e);
			if (!r) return [];
			const i = [];
			for (const e of r) {
				const n = t.get(e);
				if (n !== void 0) i.push(n);
			}
			return i;
		};
	}
	/**
	* Pairs of systems in `schedule` that touch the same data with nothing
	* saying which runs first, so their order is whatever registration and the
	* sort happened to produce.
	*
	* @beta
	*/
	scheduleAmbiguities(e) {
		const t = this.systems_.get(e) ?? [];
		return to(t, this.resolverFor(t));
	}
	/**
	* `schedule` grouped into batches that could run at the same time — how much
	* of it is inherently sequential. A measurement: the schedule starts systems
	* in sorted order, overlapping only what awaits. See {@link parallelBatches}.
	*
	* @beta
	*/
	scheduleBatches(e) {
		const t = this.systems_.get(e) ?? [];
		return no(t, this.resolverFor(t));
	}
	sortSystems(e) {
		if (e.length <= 1) return e;
		const t = this.resolverFor(e);
		const n = $a(e, t);
		const r = 1, i = 2;
		const a = new Uint8Array(e.length);
		const o = [];
		const s = [];
		const c = (t) => {
			if (a[t] === i) return;
			if (a[t] === r) {
				const n = o.indexOf(t);
				const r = o.slice(n).map((t) => e[t].system._name);
				r.push(e[t].system._name);
				throw new Error(`Circular system dependency: ${r.join(" → ")}`);
			}
			a[t] = r;
			o.push(t);
			for (const e of n[t]) c(e);
			o.pop();
			a[t] = i;
			s.push(e[t]);
		};
		for (let t = 0; t < e.length; t++) c(t);
		return s;
	}
	async flushStartupSystems_() {
		const e = this.systems_.get(0);
		const t = this.executionEpoch_;
		while (e.length && !this.isExecutionHeld() && !this.frame_paused_ && t === this.executionEpoch_) {
			if (!this.startupInFlight_) this.startupInFlight_ = Promise.resolve().then(async () => {
				await this.runSchedule(0, t);
				for (let t = e.length - 1; t >= 0; t--) if (e[t].startupInvoked) e.splice(t, 1);
				this.sortedSystemsCache_.delete(0);
				this.dependencyCache_.delete(0);
			}).finally(() => {
				this.startupInFlight_ = null;
			});
			await this.startupInFlight_;
		}
	}
	async runSchedule(e, t = this.executionEpoch_, n = false) {
		const r = this.systems_.get(e);
		if (!r || !this.runner_ || this.frame_paused_ || this.isExecutionHeld() || t !== this.executionEpoch_) return;
		let i = this.sortedSystemsCache_.get(e);
		if (!i) {
			if (r.some((e) => e.runBefore || e.runAfter)) i = this.sortSystems(r);
			else i = r;
			this.sortedSystemsCache_.set(e, i);
		}
		const a = this.phaseTimings_ ? performance.now() : 0;
		const o = [];
		const s = async () => {
			const e = o.map((e) => e.done);
			o.length = 0;
			await Promise.all(e);
		};
		for (let r = 0; r < i.length; r++) {
			const a = i[r];
			if (this.frame_paused_ || this.isExecutionHeld() || t !== this.executionEpoch_) break;
			if (e === 0 && a.startupInvoked) continue;
			if (n && !a.system._runWhenPaused) continue;
			if (a.runIf && !a.runIf()) {
				if (e === 0) a.startupInvoked = true;
				continue;
			}
			if (a.gate && e !== 0 && !this.gateOpen_(a.gate)) continue;
			if (o.length > 0) {
				const t = this.dependenciesFor(e, i)[r];
				const n = Ya(a.system);
				if (o.some((e) => t.has(e.index) || Za(n, e.access))) await s();
			}
			if (this.frame_paused_ || this.isExecutionHeld() || t !== this.executionEpoch_) break;
			if (e === 0) a.startupInvoked = true;
			try {
				this.currentSystem_ = a.system._name;
				const e = this.runner_.run(a.system);
				if (e instanceof Promise) o.push({
					index: r,
					access: Ya(a.system),
					done: e.then(() => {
						this.markSystemStepped(a);
					}, (e) => {
						this.reportSystemError(e, a.system._name);
					})
				});
				else this.markSystemStepped(a);
			} catch (e) {
				this.reportSystemError(e, a.system._name);
			} finally {
				this.currentSystem_ = "";
			}
		}
		await s();
		if (this.phaseTimings_) this.phaseTimings_.set(T[e], performance.now() - a);
	}
	/**
	* What must finish before each system of `systems` may start, transitively.
	*
	* Ordering edges are a stronger statement than access: two systems that touch
	* nothing in common may still have been ordered on purpose, and starting the
	* second beside the first would silently ignore that.
	*/
	dependenciesFor(e, t) {
		let n = this.dependencyCache_.get(e);
		if (!n) {
			n = eo($a(t, this.resolverFor(t)));
			this.dependencyCache_.set(e, n);
		}
		return n;
	}
	/** Liveness: a system ran, so its owning subsystem stepped this frame. */
	markSystemStepped(e) {
		if (e.subsystem) this.subsystems_.markStepped(e.subsystem);
	}
	/**
	* Report one system's failure. Pausing stops the schedule from STARTING
	* anything else; what is already in flight still has to be waited for, since
	* a promise cannot be taken back.
	*/
	reportSystemError(e, t) {
		A.error("app", `System "${t}" threw an error`, e);
		if (this.error_handler_) this.error_handler_(e, t);
		if (this.system_error_handler_) {
			const n = e instanceof Error ? e : new Error(String(e));
			if (this.system_error_handler_(n, t) === "pause") this.frame_paused_ = true;
		}
	}
	updateTime(e) {
		const t = this.resources_.get(O);
		const n = t.scale >= 0 ? t.scale : 0;
		t.unscaledDelta = e;
		t.delta = this.isPaused() && !this.step_pending_ ? 0 : e * n;
		t.elapsed += t.delta;
		t.frameCount++;
		if (this.step_pending_) this.steppedFrames_++;
		t.fixedDelta = this.fixedTimestep_;
	}
};
const Qs = /* @__PURE__ */ new WeakMap();
/** Null for an app whose module resolved its own surface. */
function $s(e) {
	return Qs.get(e)?.graphics ?? null;
}
/**
* Tell @p app the size its host draws at — what a host that builds its App
* without {@link createWebApp} (the native core) does, so frame read-back and
* anything else asking {@link surfaceSizeOf} gets the same answer on every core.
* @internal
*/
function ec(e, t) {
	Qs.set(e, {
		graphics: Qs.get(e)?.graphics ?? null,
		size: t
	});
}
/** The size the engine draws at, as its host reports it; null when the host did not say. */
function tc(e) {
	return Qs.get(e)?.size?.() ?? null;
}
function nc(e) {
	switch (e.kind) {
		case "webgpu": return "WebGPU";
		case "gl-context": return e.glx ? "EmscriptenGLX" : "WebGL2";
		case "default": return null;
	}
}
function rc(e, t) {
	S();
	const n = Zs.new();
	if (t?.sideModules) n.setSideModules(t.sideModules, { owned: t.ownsSideModules });
	const r = new e.Registry();
	try {
		n.connectCpp(r, e, {
			strict: true,
			ownedRegistry: true
		});
		Fn(e, t);
		if (t?.randomSeed !== void 0) e.engine_setRandomSeed?.(t.randomSeed >>> 0);
		const i = t?.renderSurface ?? { kind: "default" };
		switch (i.kind) {
			case "webgpu": {
				const n = t?.getViewportSize?.() ?? {
					width: 800,
					height: 600
				};
				const r = navigator.gpu?.getPreferredCanvasFormat?.() === "bgra8unorm";
				if (!e.initRendererWebGPU(i.canvasSelector ?? "#canvas", n.width, n.height, i.readback === true, r)) throw new Error("WebGPU renderer initialization failed — the module needs a preinitializedWebGPUDevice and a WebGPU-enabled engine build.");
				Oe(e);
				break;
			}
			case "gl-context":
				if (!e.initRendererWithContext(i.handle)) throw new Error(`WebGL2 renderer initialization failed for context ${i.handle}.`);
				break;
			case "default": if (!e.initRenderer()) throw new Error("WebGL2 renderer initialization failed for the default canvas.");
		}
		Qs.set(n, {
			graphics: nc(i),
			size: t?.getViewportSize ?? null
		});
		In(e, t);
		n.addPlugin(Ua);
		n.setPipeline(new ao());
		n.insertResource(ai, { ...Wa });
		n.insertResource(H, { ...H._default });
		n.insertResource(U, hi());
		n.addPlugin(ks(t?.getViewportSize));
		n.addPlugin(Fe);
		n.addPlugin(Da);
		n.addPlugin(Mt);
		n.addPlugin(Do);
		if (t?.plugins) n.addPlugins(t.plugins);
		Ln(n, t);
		return n;
	} catch (e) {
		try {
			n.quit({ keepRenderer: true });
		} catch (e) {
			A.warn("app", "Failed web App construction cleanup error", e);
		}
		throw e;
	}
}
/**
* Install a {@link Plugin} from a project bundle — the module-level twin of
* {@link App.addPlugin}, and the door a plugin PACKAGE is installed through: a
* bundle is imported before an App exists.
*
* @experimental
*/
function ic(e) {
	Ge().pendingPlugins.push(e);
}
/**
* Install everything a project bundle registered at module level. One door, so a
* host cannot drain half of it — plugins first, because a project's own system
* may read a resource one of them inserts.
*
* @experimental
*/
function ac(e) {
	const t = Ge();
	for (const n of t.drainPendingPlugins()) e.addPlugin(n);
	e.addBundleSystems(t.drainPendingSystems());
}
//#endregion
//#region src/render/frameDebugReport.ts
function oc(e, t, n) {
	const r = {};
	const i = {};
	const a = {};
	for (const o of e.drawCalls) {
		if (n && o.materialId !== 0 && !(o.materialId in i)) {
			const e = n.material(o.materialId);
			if (e) i[o.materialId] = e;
		}
		for (const e of o.textures) {
			if (!n || e === 0 || e in a) continue;
			const t = n.texture(e);
			if (t) a[e] = t;
		}
		for (const e of o.entities) {
			if (e in r) continue;
			const n = t(e);
			if (n) r[e] = n;
		}
	}
	return {
		passCount: e.passCount,
		draws: e.drawCalls,
		names: r,
		materials: i,
		textures: a
	};
}
/**
* Capture @p app's next whole frame; null when it drew nothing. @p pathOf turns an
* asset's load path into the one its reader knows it by.
*/
async function sc(e, t, n = (e) => e) {
	const r = cc(e);
	if (!r) return null;
	const i = await Ee(r, t);
	if (!i) return null;
	const a = e.hasResource(j) ? e.getResource(j) : null;
	const o = (e) => e ? n(e) : null;
	return oc(i, (t) => e.world.tryGet(t, ue)?.value || null, {
		material: (e) => o(a?.pathForHandle("material", e)),
		texture: (e) => o(a?.pathForRenderedTexture(e))
	});
}
/** The engine surface capture runs on — the wasm module, or a native host's — or
*  null on a host without one. */
function cc(e) {
	const t = f(e);
	return t && typeof t.renderer_captureNextFrame === "function" && t.HEAPU8 ? t : null;
}
/** The last capture's pass in @p app, drawn up to and including @p drawIndex. */
async function lc(e, t, n) {
	const r = cc(e);
	const i = r ? await Ae(r, t, n) : null;
	return i && {
		width: i.image.width,
		height: i.image.height,
		pixels: i.image.data,
		matchesCapture: i.matchesCapture
	};
}
//#endregion
//#region src/render/framePixels.ts
/**
* @file  Asking the engine what it drew.
*
*        One answer for both backends, from the side that holds the pixels — a
*        host that reads the page instead gets the DISPLAY's answer, colour
*        managed on a wide-gamut machine, so a frame painting rgb(0,255,0) reads
*        back as rgb(58,254,32) with nothing rendered wrong.
*
*        GL serves the request on the spot. WebGPU books the copy for the end of
*        its own frame, so the caller has to let a frame happen: that is what
*        `advance` is for, and it is the whole difference between the backends.
*/
/** Whether this build can return its own pixels — an older wasm cannot. */
function uc(e) {
	const t = e;
	return typeof t.renderer_captureFrame === "function" && typeof t.renderer_pollFrameCapture === "function" && typeof t.renderer_takeFrameCapture === "function";
}
/**
* The next completed frame, read from the engine.
*
* `advance` runs one frame — a driver's own step, or waiting a rAF under a live
* loop. Null when the build cannot capture, when the request is refused (a
* WebGPU surface configured without readback), or when the readback never lands.
*
* @beta
*/
async function dc(e, t, n, r) {
	const i = e;
	if (!uc(e) || t <= 0 || n <= 0) return null;
	const a = i.renderer_captureFrame(t, n);
	if (!a) return null;
	if (r) await r();
	if (await gt(() => i.renderer_pollFrameCapture(a)) !== 1) return null;
	const o = t * n * 4;
	const s = new Uint8Array(o);
	return qe(i, (e) => {
		const t = e(o);
		if (!t) return false;
		if (!i.renderer_takeFrameCapture(a, t, o)) return false;
		s.set(i.HEAPU8.subarray(t, t + o));
		return true;
	}) ? {
		rgba: s,
		width: t,
		height: n
	} : null;
}
//#endregion
//#region src/ecs/lifecycle.ts
/**
* @file    lifecycle.ts
* @brief   App lifecycle plugin - visibility/focus auto-pause and lifecycle events
*/
var fc = class {
	constructor(e = true) {
		this.listeners_ = [];
		this.visible_ = true;
		this.focused_ = true;
		this.autoPause_ = e;
	}
	get visible() {
		return this.visible_;
	}
	get focused() {
		return this.focused_;
	}
	get autoPause() {
		return this.autoPause_;
	}
	set autoPause(e) {
		this.autoPause_ = e;
	}
	on(e) {
		this.listeners_.push(e);
		return () => {
			const t = this.listeners_.indexOf(e);
			if (t >= 0) this.listeners_.splice(t, 1);
		};
	}
	off(e) {
		const t = this.listeners_.indexOf(e);
		if (t >= 0) this.listeners_.splice(t, 1);
	}
	/** @internal */
	setVisible_(e) {
		if (this.visible_ === e) return;
		this.visible_ = e;
		this.emit_(e ? "show" : "hide");
	}
	/** @internal */
	setFocused_(e) {
		if (this.focused_ === e) return;
		this.focused_ = e;
	}
	/** @internal */
	emit_(e) {
		for (const t of this.listeners_) try {
			t(e);
		} catch (e) {
			A.error("lifecycle", "Listener error", e);
		}
	}
	removeAllListeners() {
		this.listeners_.length = 0;
	}
};
const pc = k(new fc(), "Lifecycle");
var mc = class {
	constructor(e) {
		this.options_ = e;
		this.name = "Lifecycle";
		this.cleanupFn_ = null;
	}
	build(e) {
		const t = this.options_?.autoPause ?? true;
		const n = new fc(t);
		e.insertResource(pc, n);
		if (Ue() === "native" || Ve()) this.cleanupFn_ = _c(n, e);
		else if (typeof document !== "undefined" && typeof document.addEventListener === "function" && typeof window !== "undefined") this.cleanupFn_ = gc(n, e);
	}
	cleanup() {
		this.cleanupFn_?.();
		this.cleanupFn_ = null;
	}
};
/** Default-config instance; `new LifecyclePlugin({ autoPause })` to configure. */
const hc = new mc();
function gc(e, t) {
	let n = false;
	const r = () => {
		const r = document.hidden;
		e.setVisible_(!r);
		if (r) {
			if (e.autoPause && !t.isPaused()) {
				t.setPaused(true);
				n = true;
				e.emit_("pause");
			}
		} else if (n) {
			t.setPaused(false);
			n = false;
			e.emit_("resume");
		}
	};
	const i = () => {
		e.setFocused_(true);
	};
	const a = () => {
		e.setFocused_(false);
	};
	document.addEventListener("visibilitychange", r);
	window.addEventListener("focus", i);
	window.addEventListener("blur", a);
	if (document.hidden) r();
	return () => {
		document.removeEventListener("visibilitychange", r);
		window.removeEventListener("focus", i);
		window.removeEventListener("blur", a);
		e.removeAllListeners();
	};
}
/**
* The host pushes foreground/background through the adapter (a mini-game's
* onShow/onHide, the native bridge). Native suspends audio itself on background,
* so this only drives the game tick and the lifecycle events.
*/
function _c(e, t) {
	let n = false;
	const r = Be(() => {
		e.setVisible_(true);
		if (n) {
			t.setPaused(false);
			n = false;
			e.emit_("resume");
		}
	});
	const i = ze(() => {
		e.setVisible_(false);
		if (e.autoPause && !t.isPaused()) {
			t.setPaused(true);
			n = true;
			e.emit_("pause");
		}
	});
	return () => {
		r();
		i();
		e.removeAllListeners();
	};
}
//#endregion
//#region src/render/staticBatch.ts
/**
* @file    staticBatch.ts
* @brief   Many static meshes that share a material, folded into a few larger ones.
*
* @details The renderer already draws the SAME geometry many times as one instanced
*          draw. What it cannot do is draw DIFFERENT geometry as one: each mesh is its
*          own buffer range, so a level assembled from fifty distinct props pays fifty
*          draws per material. A static batch is the answer a tool can give — bake each
*          part's world transform into its vertices, concatenate, and draw the result once.
*
*          Three jobs, kept apart so each can be tested without a GPU:
*            - {@link mergeMeshes}   the geometry: transforms and concatenates decoded meshes;
*            - {@link planStaticBatches}  the grouping: who may share a draw, in which cells;
*            - the plugin (staticBatchPlugin.ts)  the world: reads entities, uploads, hides.
*
*          What it costs is memory, not correctness: the merged mesh holds a copy of every
*          part's vertices, and a part that stood for a hundred instances is now a hundred
*          copies. {@link StaticBatchGroup} reports both numbers so the trade is visible.
*/
/** Whether a vertex layout is one the merge knows how to transform. */
function vc(e, t) {
	return `${t}:${e.map((e) => `${e.semantic}.${e.components}.${e.type}@${e.offset}`).join(",")}`;
}
/** Null when the layout can be merged; otherwise the refusal to report. */
function yc(e) {
	if (e.inverseBindMatrices || e.channels.some((e) => e.semantic === F.Joints || e.semantic === F.Weights)) return "skinned";
	if (e.morph) return "morph";
	const t = (t, n) => {
		const r = e.channels.find((e) => e.semantic === t);
		return !r || r.type === Pt.Float32 && r.components >= n;
	};
	return t(F.Position, 3) && t(F.Normal, 3) && t(F.Tangent, 4) && e.channels.some((e) => e.semantic === F.Position) ? null : "layout";
}
/** A column-major 4x4 from a TRS, as the engine resolved the entity's world transform. */
function bc(e, t, n) {
	const { x: r, y: i, z: a, w: o } = t;
	return Float64Array.of((1 - 2 * (i * i + a * a)) * n.x, 2 * (r * i + a * o) * n.x, 2 * (r * a - i * o) * n.x, 0, 2 * (r * i - a * o) * n.y, (1 - 2 * (r * r + a * a)) * n.y, 2 * (i * a + r * o) * n.y, 0, 2 * (r * a + i * o) * n.z, 2 * (i * a - r * o) * n.z, (1 - 2 * (r * r + i * i)) * n.z, 0, e.x, e.y, e.z, 1);
}
/** The inverse transpose of the upper 3x3, which is what carries a normal through a non-uniform scale. */
function xc(e) {
	const t = e[0], n = e[1], r = e[2], i = e[4], a = e[5], o = e[6], s = e[8], c = e[9], l = e[10];
	return Float64Array.of(a * l - o * c, o * s - i * l, i * c - a * s, r * c - n * l, t * l - r * s, n * s - t * c, n * o - r * a, r * i - t * o, t * a - n * i);
}
const Sc = (e) => e[0] * (e[5] * e[10] - e[6] * e[9]) - e[4] * (e[1] * e[10] - e[2] * e[9]) + e[8] * (e[1] * e[6] - e[2] * e[5]);
/**
* Concatenates `parts` into one mesh in world space.
*
* Every part must carry the same vertex layout (the planner groups by it); positions and
* tangents go through the world matrix, normals through its inverse transpose. A mirrored part
* (negative determinant) has its winding reversed and its tangent handedness flipped, so it
* still faces the way it did.
*/
function Cc(e) {
	if (e.length === 0) throw new Error("mergeMeshes needs at least one part");
	const t = e[0].mesh;
	const n = vc(t.channels, t.vertexStride);
	const r = t.vertexStride;
	let i = 0;
	let a = 0;
	for (const t of e) {
		if (vc(t.mesh.channels, t.mesh.vertexStride) !== n) throw new Error("mergeMeshes: parts carry different vertex layouts");
		i += t.mesh.vertexCount;
		a += t.mesh.indices.length;
	}
	const o = t.channels.find((e) => e.semantic === F.Position);
	const s = t.channels.find((e) => e.semantic === F.Normal);
	const c = t.channels.find((e) => e.semantic === F.Tangent);
	const l = new Uint8Array(i * r);
	const u = new Uint32Array(a);
	const d = [
		Infinity,
		Infinity,
		Infinity
	];
	const f = [
		-Infinity,
		-Infinity,
		-Infinity
	];
	let p = 0;
	let m = 0;
	for (const { mesh: t, world: n } of e) {
		new Uint8Array(l.buffer, p * r, t.vertexCount * r).set(t.vertices.subarray(0, t.vertexCount * r));
		const e = new DataView(l.buffer, p * r, t.vertexCount * r);
		const i = xc(n);
		const a = Sc(n) < 0;
		for (let l = 0; l < t.vertexCount; l++) {
			const t = l * r;
			const u = e.getFloat32(t + o.offset, true);
			const p = e.getFloat32(t + o.offset + 4, true);
			const m = e.getFloat32(t + o.offset + 8, true);
			const h = n[0] * u + n[4] * p + n[8] * m + n[12];
			const g = n[1] * u + n[5] * p + n[9] * m + n[13];
			const _ = n[2] * u + n[6] * p + n[10] * m + n[14];
			e.setFloat32(t + o.offset, h, true);
			e.setFloat32(t + o.offset + 4, g, true);
			e.setFloat32(t + o.offset + 8, _, true);
			if (h < d[0]) d[0] = h;
			if (h > f[0]) f[0] = h;
			if (g < d[1]) d[1] = g;
			if (g > f[1]) f[1] = g;
			if (_ < d[2]) d[2] = _;
			if (_ > f[2]) f[2] = _;
			if (s) {
				const n = e.getFloat32(t + s.offset, true);
				const r = e.getFloat32(t + s.offset + 4, true);
				const o = e.getFloat32(t + s.offset + 8, true);
				let c = i[0] * n + i[3] * r + i[6] * o;
				let l = i[1] * n + i[4] * r + i[7] * o;
				let u = i[2] * n + i[5] * r + i[8] * o;
				const d = Math.hypot(c, l, u) || 1;
				const f = a ? -1 : 1;
				c = c / d * f;
				l = l / d * f;
				u = u / d * f;
				e.setFloat32(t + s.offset, c, true);
				e.setFloat32(t + s.offset + 4, l, true);
				e.setFloat32(t + s.offset + 8, u, true);
			}
			if (c) {
				const r = e.getFloat32(t + c.offset, true);
				const i = e.getFloat32(t + c.offset + 4, true);
				const o = e.getFloat32(t + c.offset + 8, true);
				let s = n[0] * r + n[4] * i + n[8] * o;
				let l = n[1] * r + n[5] * i + n[9] * o;
				let u = n[2] * r + n[6] * i + n[10] * o;
				const d = Math.hypot(s, l, u) || 1;
				s /= d;
				l /= d;
				u /= d;
				e.setFloat32(t + c.offset, s, true);
				e.setFloat32(t + c.offset + 4, l, true);
				e.setFloat32(t + c.offset + 8, u, true);
				if (a) e.setFloat32(t + c.offset + 12, -e.getFloat32(t + c.offset + 12, true), true);
			}
		}
		const h = t.indices;
		if (a) for (let e = 0; e + 2 < h.length; e += 3) {
			u[m + e] = h[e] + p;
			u[m + e + 1] = h[e + 2] + p;
			u[m + e + 2] = h[e + 1] + p;
		}
		else for (let e = 0; e < h.length; e++) u[m + e] = h[e] + p;
		p += t.vertexCount;
		m += h.length;
	}
	return {
		channels: t.channels.map((e) => ({ ...e })),
		vertexStride: r,
		vertexCount: i,
		vertices: l,
		indices: u,
		aabbMin: d,
		aabbMax: f
	};
}
const wc = {
	cellSize: 1600,
	maxVertices: 262144
};
/** The draw state two meshes must share to be one draw, as a string. */
function Tc(e, t) {
	const n = e.color;
	return [
		e.material,
		e.texture,
		e.normalMap,
		n.r,
		n.g,
		n.b,
		n.a,
		e.layer,
		e.cullBackfaces ? 1 : 0,
		e.lit ? 1 : 0,
		e.castShadows !== false ? 1 : 0,
		e.parallax.x,
		e.parallax.y,
		e.group,
		t
	].join("|");
}
/**
* Groups candidates by draw state, confines each group to world cells, and splits a cell at the
* vertex limit. Order inside a batch follows entity id, so the same scene always merges the same way.
*/
function Ec(e, t = wc) {
	const n = /* @__PURE__ */ new Map();
	const r = Math.max(1, t.cellSize);
	for (const t of e) {
		const e = `${t.key}#${Math.floor(t.center[0] / r)},${Math.floor(t.center[1] / r)},${Math.floor(t.center[2] / r)}`;
		const i = n.get(e);
		if (i) i.push(t);
		else n.set(e, [t]);
	}
	const i = {
		batches: [],
		alone: []
	};
	for (const e of n.values()) {
		e.sort((e, t) => e.entity - t.entity);
		let n = [];
		let r = 0;
		const a = () => {
			if (n.length === 0) return;
			if (n.length === 1) i.alone.push(n[0].entity);
			else i.batches.push({
				key: n[0].key,
				entities: n.map((e) => e.entity),
				vertices: r
			});
			n = [];
			r = 0;
		};
		for (const i of e) {
			if (n.length > 0 && r + i.vertices > t.maxVertices) a();
			n.push(i);
			r += i.vertices;
		}
		a();
	}
	i.batches.sort((e, t) => e.entities[0] - t.entities[0]);
	i.alone.sort((e, t) => e - t);
	return i;
}
//#endregion
//#region src/render/compositeBatch.ts
/**
* @file    compositeBatch.ts
* @brief   A model built from many parts, drawn in a few draws, that still moves as a whole.
*
* @details A static batch bakes each part's WORLD transform into its vertices, so a merged
*          mesh is nailed to where the parts stood: a ship, a train or a moving platform
*          assembled from planks, rails and props cannot use it. A composite batch bakes
*          each part relative to the composite's ROOT instead, and draws the result from an
*          entity parented to that root. Moving the root moves every draw with no work per
*          part; the parts themselves are never touched again.
*
*          Two ways to fold a part, chosen per mesh:
*            - a mesh repeated `instanceMin` times or more (deck planks, rail posts) stays one
*              resident mesh and is drawn as the placements of one `MeshInstances` set, which
*              holds a copy of nothing;
*            - every other part is merged, by draw state, into chunks: cells of the root's own
*              space, so adding or removing a part re-merges the one chunk it is in.
*
*          This module is the arithmetic and the plan; compositeBatchPlugin.ts is the world.
*/
/** `a * b`, column-major. */
function Dc(e, t) {
	const n = /* @__PURE__ */ new Float64Array(16);
	for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) n[r * 4 + i] = e[i] * t[r * 4] + e[4 + i] * t[r * 4 + 1] + e[8 + i] * t[r * 4 + 2] + e[12 + i] * t[r * 4 + 3];
	return n;
}
/**
* Where a part stands in its root's space: the product of the LOCAL transforms on the way down
* from the root to it, root excluded. Read from local transforms rather than from world ones, so
* the answer does not depend on whether the root has moved this frame and its world matrices
* have been brought up to date yet.
*/
function Oc(e) {
	let t = bc({
		x: 0,
		y: 0,
		z: 0
	}, {
		x: 0,
		y: 0,
		z: 0,
		w: 1
	}, {
		x: 1,
		y: 1,
		z: 1
	});
	for (const n of e) t = Dc(t, bc(n.position, n.rotation, n.scale));
	return t;
}
/** Whether two placements are the same within a rounding a float transform picks up from a read-back. */
function kc(e, t, n = 1e-5) {
	for (let r = 0; r < 16; r++) if (Math.abs(e[r] - t[r]) > n * Math.max(1, Math.abs(e[r]))) return false;
	return true;
}
/** Floats a placement takes in the engine's `MeshInstances`: three rows of the model matrix (translation in .w), then a tint. */
const Ac = 16;
/** The placements of a `MeshInstances` set, one per matrix, untinted. */
function jc(e) {
	const t = new Float32Array(e.length * 16);
	e.forEach((e, n) => {
		const r = n * 16;
		for (let n = 0; n < 3; n++) {
			t[r + n * 4] = e[n];
			t[r + n * 4 + 1] = e[4 + n];
			t[r + n * 4 + 2] = e[8 + n];
			t[r + n * 4 + 3] = e[12 + n];
		}
		t[r + 12] = t[r + 13] = t[r + 14] = t[r + 15] = 1;
	});
	return t;
}
const Mc = {
	instanceMin: 4,
	cellSize: 0,
	maxVertices: 262144
};
/**
* The side of a chunk when the author left it to the planner: a quarter of the composite's
* longest side, so a ship is a handful of chunks and an edit re-merges a fraction of it.
*/
function Nc(e) {
	if (e.length === 0) return 1;
	const t = [
		Infinity,
		Infinity,
		Infinity
	], n = [
		-Infinity,
		-Infinity,
		-Infinity
	];
	for (const r of e) for (let e = 0; e < 3; e++) {
		t[e] = Math.min(t[e], r.center[e]);
		n[e] = Math.max(n[e], r.center[e]);
	}
	const r = Math.max(n[0] - t[0], n[1] - t[1], n[2] - t[2]);
	return r > 0 ? r / 4 : 1;
}
/** Decide which parts are instanced, which are merged and in which chunk, and which draw alone. */
function Pc(e, t = Mc, n) {
	const r = /* @__PURE__ */ new Map();
	for (const t of e) {
		const e = `${t.key}|${t.mesh}`;
		const n = r.get(e);
		if (n) n.push(t);
		else r.set(e, [t]);
	}
	const i = [];
	const a = [];
	const o = Math.max(2, t.instanceMin);
	for (const e of r.values()) if (e.length >= o) i.push({
		key: e[0].key,
		mesh: e[0].mesh,
		entities: e.map((e) => e.entity)
	});
	else a.push(...e);
	const s = n ?? (t.cellSize > 0 ? t.cellSize : Nc(a));
	const c = a.map((e) => ({
		entity: e.entity,
		key: e.key,
		center: e.center,
		vertices: e.vertices
	}));
	const l = Ec(c, {
		cellSize: s,
		maxVertices: t.maxVertices
	});
	return {
		sets: i,
		chunks: l.batches.map((e) => {
			const t = [...e.entities].sort((e, t) => e - t);
			return {
				id: `${e.key}#${t.join(",")}`,
				key: e.key,
				entities: t
			};
		}),
		alone: [...l.alone],
		cellSize: s
	};
}
//#endregion
//#region src/render/compositeBatchPlugin.ts
/**
* Marks the root of a model assembled from many parts that moves as a whole (a ship, a vehicle, a moving platform),
* so its parts may be drawn in a few draws that follow it. Presence is the opt-in; the parts need nothing.
*
* @experimental
*/
const Z = t("CompositeBatch", {
	instanceMin: Mc.instanceMin,
	cellSize: Mc.cellSize,
	parts: 0,
	instanced: 0,
	draws: 0,
	drawsBefore: 0,
	moving: 0
}, {
	readonlyFields: [
		"parts",
		"instanced",
		"draws",
		"drawsBefore",
		"moving"
	],
	fields: {
		instanceMin: {
			min: 2,
			label: "Instance at",
			tooltip: "Parts of one mesh at or past this count are drawn as one instanced set (no copy of their vertices). Fewer are merged."
		},
		cellSize: {
			min: 0,
			label: "Chunk size",
			tooltip: "Side of a merge chunk in the root's space. Smaller chunks re-merge less on an edit and cull better; 0 chooses from the model's size."
		},
		parts: { label: "Batched parts" },
		instanced: { label: "Instanced parts" },
		draws: { label: "Draws" },
		drawsBefore: { label: "Draws before" },
		moving: { label: "Moving parts" }
	}
});
/** Looks a part may change in a row before it is taken for one that moves inside the model. */
const Fc = 3;
/** Frames between looks at a composite (half a second at 60 fps). A look reads every part through the engine, which is the pass's whole cost on a still model; `refresh(root)` looks at once. */
const Ic = 30;
/** Whether two renderers draw the same way: the state a part's key is made from. */
function Lc(e, t) {
	return e.material === t.material && e.texture === t.texture && e.normalMap === t.normalMap && e.layer === t.layer && e.cullBackfaces === t.cullBackfaces && e.lit === t.lit && e.castShadows !== false === (t.castShadows !== false) && e.color.r === t.color.r && e.color.g === t.color.g && e.color.b === t.color.b && e.color.a === t.color.a && e.parallax.x === t.parallax.x && e.parallax.y === t.parallax.y;
}
/** Run-time access to the composites: what each one draws, and how to look again now. */
var Rc = class {
	constructor() {
		this.composites_ = /* @__PURE__ */ new Map();
		this.forced_ = /* @__PURE__ */ new Set();
		this.busy_ = false;
		this.counts = {
			scans: 0,
			applies: 0,
			merges: 0,
			placementWrites: 0
		};
	}
	/** Look at `root` (or every composite) on the next frame instead of waiting for the next scheduled look. */
	refresh(e) {
		if (e === void 0) for (const e of this.composites_.keys()) this.forced_.add(e);
		else this.forced_.add(e);
	}
	/** What a composite draws now, or null when it is not one the pass has seen. */
	report(e) {
		const t = this.composites_.get(e);
		if (!t) return null;
		const n = new Set([...t.chunks.values()].flatMap((e) => e.entities).concat([...t.sets.values()].flatMap((e) => e.entities)));
		return {
			sets: t.sets.size,
			chunks: t.chunks.size,
			alone: [...t.parts.keys()].filter((e) => !n.has(e)).length,
			moving: t.moving.size,
			refused: t.refused.size,
			parts: n.size
		};
	}
};
/** The resource the plugin installs. @experimental */
const Q = k(new Rc(), "CompositeBatching");
/** Whether `entity` sits under a `CompositeBatch` root (itself excluded): such a part is the composite's, not a static batch's. */
function zc(e, t) {
	let n = t;
	for (let t = 0; t < 256 && e.has(n, r); t++) {
		n = e.get(n, r).entity;
		if (!e.valid(n)) return false;
		if (e.has(n, Z)) return true;
	}
	return false;
}
var Bc = class {
	constructor() {
		this.name = "compositeBatch";
		this.meshes_ = /* @__PURE__ */ new Map();
		this.resolved_ = /* @__PURE__ */ new Map();
	}
	build(e) {
		const t = new Rc();
		e.insertResource(Q, t);
		let n = 0;
		e.addSystemToSchedule(3, _([], () => {
			n++;
			if (t.busy_ || !e.hasResource(j)) return;
			const r = e.world;
			for (const [n, i] of t.composites_) if (!r.valid(n) || !r.has(n, Z)) {
				this.discard(e, i);
				t.composites_.delete(n);
			}
			const i = [];
			for (const e of r.getEntitiesWithComponents([Z])) {
				let r = t.composites_.get(e);
				if (!r) {
					r = {
						root: e,
						cellSize: null,
						parts: /* @__PURE__ */ new Map(),
						chunks: /* @__PURE__ */ new Map(),
						sets: /* @__PURE__ */ new Map(),
						owned: /* @__PURE__ */ new Set(),
						moving: /* @__PURE__ */ new Set(),
						refused: /* @__PURE__ */ new Map(),
						holders: /* @__PURE__ */ new Set(),
						nextScan: n
					};
					t.composites_.set(e, r);
				}
				if (t.forced_.has(e) || n >= r.nextScan) i.push(e);
			}
			if (i.length === 0) return;
			t.busy_ = true;
			(async () => {
				for (const r of i) {
					const i = t.composites_.get(r);
					if (!i) continue;
					t.forced_.delete(r);
					i.nextScan = n + Ic;
					await this.scan(e, i);
				}
			})().catch((e) => A.error("compositeBatch", "a composite batch pass failed", e)).finally(() => {
				t.busy_ = false;
			});
		}, { name: "CompositeBatchSystem" }), { runIf: N });
	}
	cleanup(e) {
		if (!e?.hasResource(Q)) return;
		const t = e.getResource(Q);
		for (const n of t.composites_.values()) this.discard(e, n);
		t.composites_.clear();
	}
	meshData(e, t) {
		let n = this.meshes_.get(t);
		if (!n) {
			n = e.getResource(j).readMeshData(t).catch(() => null);
			this.meshes_.set(t, n);
		}
		return n;
	}
	/** The root's subtree (root included), not entering a nested composite or the pass's own draws. */
	subtree(e, t) {
		const n = e.world;
		const r = [];
		const i = [t.root];
		while (i.length > 0) {
			const e = i.pop();
			if (t.holders.has(e) || !n.valid(e)) continue;
			if (e !== t.root && n.has(e, Z)) continue;
			r.push(e);
			if (n.has(e, re)) for (const t of n.get(e, re).entities) i.push(t);
		}
		return r;
	}
	/** The local transforms from just under the root down to `entity`. */
	chain(e, t, n) {
		const i = e.world;
		const a = [];
		let o = n;
		for (let e = 0; e < 256 && o !== t; e++) {
			const e = i.get(o, E);
			a.push({
				position: e.position,
				rotation: e.rotation,
				scale: e.scale
			});
			if (!i.has(o, r)) break;
			o = i.get(o, r).entity;
		}
		return a.reverse();
	}
	/** Why a part cannot be folded, or null. The same rules a static batch keeps, read the same way. */
	refusal(e, t, n, r) {
		const i = e.world;
		const a = (e) => !!e && i.has(t, e);
		if (!n.opaque) return "blended";
		if (a(r.lod)) return "lod";
		if (a(r.billboard) && i.get(t, r.billboard).enabled) return "billboard";
		if (a(r.skin)) return "skinned";
		if (a(r.instances)) return "layout";
		if (a(r.character) || a(r.body) && i.get(t, r.body).bodyType === 2) return "moves";
		return null;
	}
	async scan(e, t) {
		const r = e.world;
		const i = e.getResource(Q).counts;
		i.scans++;
		if (!r.valid(t.root)) return;
		const a = r.get(t.root, Z);
		const o = {
			...Mc,
			instanceMin: a.instanceMin,
			cellSize: a.cellSize
		};
		const s = {
			lod: D("LODGroup"),
			billboard: D("Billboard"),
			skin: D("MeshSkin"),
			instances: D("MeshInstances"),
			body: D("RigidBody3D"),
			character: D("CharacterController3D")
		};
		const c = /* @__PURE__ */ new Set();
		const l = /* @__PURE__ */ new Set();
		let u = false;
		for (const i of this.subtree(e, t)) {
			if (!r.has(i, n) || !r.has(i, E)) continue;
			const a = r.get(i, n);
			const o = t.owned.has(i);
			if (!a.enabled && !o || a.mesh === 0) continue;
			if (t.moving.has(i)) {
				c.add(i);
				continue;
			}
			const d = this.refusal(e, i, a, s);
			if (d) {
				if (!t.refused.has(i)) {
					t.refused.set(i, d);
					u = true;
				}
				continue;
			}
			t.refused.delete(i);
			let f = this.resolved_.get(a.mesh);
			if (f === void 0) {
				f = await this.meshData(e, a.mesh);
				this.resolved_.set(a.mesh, f);
			}
			if (!r.valid(i) || !r.valid(t.root)) continue;
			if (!f) {
				t.refused.set(i, "no-mesh");
				continue;
			}
			const p = yc(f);
			if (p) {
				t.refused.set(i, p);
				continue;
			}
			const m = Oc(this.chain(e, t.root, i));
			const h = t.parts.get(i);
			const g = h && h.mesh === a.mesh && Lc(h.mr, a) ? h.key : Tc({
				material: a.material,
				texture: a.texture,
				normalMap: a.normalMap,
				color: a.color,
				layer: a.layer,
				cullBackfaces: a.cullBackfaces,
				lit: a.lit,
				castShadows: a.castShadows,
				parallax: a.parallax,
				group: ""
			}, vc(f.channels, f.vertexStride));
			const _ = (f.aabbMin[0] + f.aabbMax[0]) / 2, v = (f.aabbMin[1] + f.aabbMax[1]) / 2, y = (f.aabbMin[2] + f.aabbMax[2]) / 2;
			const b = [
				m[0] * _ + m[4] * v + m[8] * y + m[12],
				m[1] * _ + m[5] * v + m[9] * y + m[13],
				m[2] * _ + m[6] * v + m[10] * y + m[14]
			];
			c.add(i);
			const x = h;
			if (!x) {
				t.parts.set(i, {
					entity: i,
					key: g,
					mesh: a.mesh,
					local: m,
					vertices: f.vertexCount,
					center: b,
					mr: {
						...a,
						enabled: true
					},
					changed: 0
				});
				u = true;
				continue;
			}
			if (x.key !== g || x.mesh !== a.mesh) {
				Object.assign(x, {
					key: g,
					mesh: a.mesh,
					local: m,
					vertices: f.vertexCount,
					center: b,
					mr: {
						...a,
						enabled: true
					},
					changed: 0
				});
				l.add(i);
				continue;
			}
			if (!kc(x.local, m)) {
				x.changed++;
				x.local = m;
				x.center = b;
				if (x.changed >= Fc) {
					t.moving.add(i);
					t.parts.delete(i);
					u = true;
				} else l.add(i);
			} else x.changed = 0;
		}
		for (const e of [...t.parts.keys()]) if (!c.has(e)) {
			t.parts.delete(e);
			u = true;
		}
		for (const e of [...t.moving]) if (!c.has(e)) t.moving.delete(e);
		for (const e of [...t.refused.keys()]) if (!r.valid(e)) t.refused.delete(e);
		if (!u && l.size === 0) return;
		i.applies++;
		this.apply(e, t, o, l);
	}
	/** Re-plan the composite and bring its draws in line, re-merging only the chunks whose members changed. */
	apply(e, t, r, i) {
		const a = e.world;
		const o = e.getResource(j);
		const s = [...t.parts.values()].map((e) => ({
			entity: e.entity,
			key: e.key,
			mesh: e.mesh,
			local: e.local,
			vertices: e.vertices,
			center: e.center
		}));
		if (t.cellSize === null) t.cellSize = r.cellSize > 0 ? r.cellSize : null;
		const c = Pc(s, r, t.cellSize ?? void 0);
		if (t.cellSize === null) t.cellSize = c.cellSize;
		const l = /* @__PURE__ */ new Set();
		const u = /* @__PURE__ */ new Set();
		for (const n of c.sets) {
			const r = `${n.key}|${n.mesh}`;
			u.add(r);
			const i = n.entities;
			for (const e of i) l.add(e);
			const o = jc(i.map((e) => t.parts.get(e).local));
			const s = t.sets.get(r);
			if (s && Vc(s.placements, o)) continue;
			const c = s?.holder ?? this.holder(e, t, `CompositeBatch set ${t.sets.size + 1}`, {
				...t.parts.get(i[0]).mr,
				mesh: n.mesh
			});
			if (!s) {
				const e = D("MeshInstances");
				if (e) a.insert(c, e, {});
			}
			if (!this.writePlacements(e, c, o)) {
				for (const e of i) l.delete(e);
				if (!s) {
					a.despawn(c);
					t.holders.delete(c);
				}
				u.delete(r);
				continue;
			}
			t.sets.set(r, {
				holder: c,
				entities: i,
				placements: o
			});
		}
		for (const [e, n] of t.sets) {
			if (u.has(e)) continue;
			if (a.valid(n.holder)) a.despawn(n.holder);
			t.holders.delete(n.holder);
			t.sets.delete(e);
		}
		const d = /* @__PURE__ */ new Set();
		for (const r of c.chunks) {
			const s = r.entities;
			const c = s.some((e) => i.has(e));
			const u = t.chunks.get(r.id);
			if (u && !c) {
				d.add(r.id);
				for (const e of s) l.add(e);
				continue;
			}
			e.getResource(Q).counts.merges++;
			const f = Cc(s.map((e) => ({
				mesh: this.cached(t.parts.get(e).mesh),
				world: t.parts.get(e).local
			})));
			const p = o.createMesh(f);
			if (p === 0) {
				A.warn("compositeBatch", `the engine refused a merged chunk of ${s.length} parts (${f.vertexCount} vertices)`);
				continue;
			}
			if (u) {
				a.insert(u.holder, n, {
					...a.get(u.holder, n),
					mesh: p
				});
				o.releaseBuiltMesh(u.handle);
				u.handle = p;
			} else {
				const n = this.holder(e, t, `CompositeBatch chunk ${t.chunks.size + 1}`, {
					...t.parts.get(s[0]).mr,
					mesh: p
				});
				t.chunks.set(r.id, {
					holder: n,
					handle: p,
					entities: s
				});
			}
			d.add(r.id);
			for (const e of s) l.add(e);
		}
		for (const [e, n] of t.chunks) {
			if (d.has(e)) continue;
			if (a.valid(n.holder)) a.despawn(n.holder);
			o.releaseBuiltMesh(n.handle);
			t.holders.delete(n.holder);
			t.chunks.delete(e);
		}
		for (const e of l) {
			if (t.owned.has(e) || !a.valid(e)) continue;
			a.insert(e, n, {
				...a.get(e, n),
				enabled: false
			});
			t.owned.add(e);
		}
		for (const n of [...t.owned]) {
			if (l.has(n)) continue;
			this.restore(e, n);
			t.owned.delete(n);
		}
		this.stamp(e, t, c.sets.reduce((e, t) => e + t.entities.length, 0), l.size);
	}
	/** Mesh data the scan has already read, so a merge never waits. */
	cached(e) {
		return this.resolved_.get(e) ?? null;
	}
	holder(e, t, r, i) {
		const a = e.world;
		const o = a.spawn(r);
		a.insert(o, l);
		a.insert(o, E, {});
		a.insert(o, n, {
			...i,
			enabled: true
		});
		a.setParent(o, t.root);
		t.holders.add(o);
		return o;
	}
	writePlacements(e, t, n) {
		const r = f(e);
		const i = r?.meshInstances_set;
		if (!i || !r._malloc || !r._free || !r.HEAPU8) return false;
		const a = e.world.getCppRegistry();
		e.getResource(Q).counts.placementWrites++;
		qe({
			_malloc: r._malloc,
			_free: r._free
		}, (e) => {
			const o = e(Math.max(4, n.byteLength));
			new Float32Array(r.HEAPU8.buffer, o, n.length).set(n);
			i(a, t, o, n.length / 16);
		});
		return true;
	}
	restore(e, t) {
		const r = e.world;
		const i = r.valid(t) ? r.tryGet(t, n) : null;
		if (i) r.insert(t, n, {
			...i,
			enabled: true
		});
	}
	stamp(e, t, n, r) {
		const i = e.world;
		if (!i.valid(t.root) || !i.has(t.root, Z)) return;
		const a = [...t.parts.values()];
		const o = new Set(a.map((e) => `${e.key}|${e.mesh}`)).size + t.moving.size;
		const s = t.sets.size + t.chunks.size + (a.length - r) + t.moving.size;
		i.insert(t.root, Z, {
			...i.get(t.root, Z),
			parts: r,
			instanced: n,
			draws: s,
			drawsBefore: o,
			moving: t.moving.size
		});
	}
	discard(e, t) {
		const n = e.world;
		const r = e.hasResource(j) ? e.getResource(j) : null;
		for (const e of t.sets.values()) if (n.valid(e.holder)) n.despawn(e.holder);
		for (const e of t.chunks.values()) {
			if (n.valid(e.holder)) n.despawn(e.holder);
			r?.releaseBuiltMesh(e.handle);
		}
		for (const n of t.owned) this.restore(e, n);
		t.sets.clear();
		t.chunks.clear();
		t.owned.clear();
		t.holders.clear();
		t.parts.clear();
	}
};
function Vc(e, t) {
	if (e.length !== t.length) return false;
	for (let n = 0; n < e.length; n++) if (e[n] !== t[n]) return false;
	return true;
}
const Hc = new Bc();
//#endregion
//#region src/render/staticBatchPlugin.ts
/** Where a marked mesh stands after the last pass: not decided yet, merged, or left out and why. @experimental */
const $ = {
	Pending: 0,
	Merged: 1,
	Skinned: 2,
	Morph: 3,
	Lod: 4,
	Blended: 5,
	Moves: 6,
	Baked: 7,
	Alone: 8,
	NoMesh: 9,
	Layout: 10,
	Disabled: 11,
	Billboard: 12
};
const Uc = {
	skinned: $.Skinned,
	morph: $.Morph,
	lod: $.Lod,
	blended: $.Blended,
	moves: $.Moves,
	baked: $.Baked,
	alone: $.Alone,
	"no-mesh": $.NoMesh,
	layout: $.Layout,
	disabled: $.Disabled,
	billboard: $.Billboard
};
/**
* Marks a mesh as one that will not move, so it may be drawn together with others that share its material.
* Presence is the opt-in.
*
* @experimental
*/
const Wc = t("StaticBatch", {
	group: "",
	state: $.Pending,
	batched: 0
}, {
	readonlyFields: ["state", "batched"],
	fields: {
		group: { tooltip: "Meshes batch only with others of the same group. Empty is the default group." },
		state: {
			label: "Status",
			enum: [
				{
					label: "Waiting",
					value: $.Pending
				},
				{
					label: "Merged",
					value: $.Merged
				},
				{
					label: "Not merged: skinned",
					value: $.Skinned
				},
				{
					label: "Not merged: morphing",
					value: $.Morph
				},
				{
					label: "Not merged: level of detail",
					value: $.Lod
				},
				{
					label: "Not merged: blended",
					value: $.Blended
				},
				{
					label: "Not merged: moves",
					value: $.Moves
				},
				{
					label: "Not merged: baked light",
					value: $.Baked
				},
				{
					label: "Not merged: alone in its group",
					value: $.Alone
				},
				{
					label: "Not merged: no mesh",
					value: $.NoMesh
				},
				{
					label: "Not merged: vertex layout",
					value: $.Layout
				},
				{
					label: "Not merged: disabled",
					value: $.Disabled
				},
				{
					label: "Not merged: billboard",
					value: $.Billboard
				}
			],
			shownWhen: {
				field: "state",
				values: [
					1,
					2,
					3,
					4,
					5,
					6,
					7,
					8,
					9,
					10,
					11,
					12
				]
			}
		},
		batched: {
			label: "Batched meshes",
			min: 0,
			shownWhen: {
				field: "state",
				values: [1]
			}
		}
	}
});
/** Run-time access to the batcher: what it did, and how to ask it to do it again. */
var Gc = class {
	constructor() {
		this.limits = { ...wc };
		this.groups_ = [];
		this.refused_ = /* @__PURE__ */ new Map();
		this.seen_ = /* @__PURE__ */ new Set();
		this.pending_ = 0;
		this.stable_ = 0;
		this.busy_ = false;
		this.dirty_ = true;
	}
	/** What the last passes merged and left out. */
	report() {
		return {
			groups: this.groups_.map((e) => e.report),
			refused: new Map(this.refused_)
		};
	}
	/** The last passes in the small form the profiler reports across a process boundary. */
	summary() {
		if (this.groups_.length === 0 && this.refused_.size === 0) return null;
		const e = /* @__PURE__ */ new Map();
		for (const [t, n] of this.refused_) {
			const r = e.get(n);
			if (r) r.push(t);
			else e.set(n, [t]);
		}
		return {
			groups: this.groups_.map((e) => ({
				entity: e.entity,
				parts: e.parts.slice(0, Kc),
				partCount: e.parts.length,
				triangles: e.report.triangles,
				bytes: e.report.bytes,
				drawsBefore: e.report.drawsBefore
			})),
			refused: [...e].map(([e, t]) => ({
				reason: e,
				count: t.length,
				entities: t.slice(0, Kc)
			}))
		};
	}
	/** Marked entities the pass has not decided on yet (their mesh is still loading). */
	get pending() {
		return this.pending_;
	}
	/** Forget every decision and merge again from the scene as it stands. */
	rebuild() {
		this.dirty_ = true;
		this.stable_ = 0;
	}
};
/** Entities named per group or reason in {@link StaticBatching.summary}: enough to select, small enough to poll. */
const Kc = 200;
/** The resource the plugin installs. @experimental */
const qc = k(new Gc(), "StaticBatching");
/** Frames with nothing new to merge before a pass starts. */
const Jc = 2;
/** Frames between checks for a part that has gone away. */
const Yc = 30;
const Xc = (e) => new Set(e).size;
var Zc = class {
	constructor() {
		this.name = "staticBatch";
	}
	build(e) {
		const t = new Gc();
		e.insertResource(qc, t);
		e.world;
		let n = 0;
		e.addSystemToSchedule(3, _([], () => {
			n++;
			if (t.busy_ || !e.hasResource(j)) return;
			const r = e.getResource(j);
			if (t.dirty_) {
				this.discardAll(e, t);
				t.dirty_ = false;
			}
			const i = this.freshEntities(e, t);
			if (i.length > 0) {
				t.stable_ = 0;
				t.pending_ = i.length;
				return;
			}
			t.pending_ = 0;
			const a = this.undecided(e, t);
			if (a.length > 0) {
				t.stable_++;
				if (t.stable_ < Jc) return;
				t.busy_ = true;
				this.pass(e, t, r, a).catch((e) => A.error("staticBatch", "a static batch pass failed", e)).finally(() => {
					t.busy_ = false;
				});
				return;
			}
			if (n % Yc === 0) this.sweep(e, t, r);
		}, { name: "StaticBatchSystem" }), { runIf: N });
	}
	cleanup(e) {
		if (e?.hasResource(qc)) this.discardAll(e, e.getResource(qc));
	}
	/** Marked entities whose mesh handle has not arrived: the pass cannot decide on them yet. */
	freshEntities(e, t) {
		const r = e.world;
		const i = [];
		for (const e of r.getEntitiesWithComponents([
			Wc,
			n,
			E
		])) {
			if (t.seen_.has(e)) continue;
			const a = r.get(e, n);
			if (a.enabled && a.mesh === 0) i.push(e);
		}
		return i;
	}
	/** Marked entities with a mesh, not yet merged or refused. */
	undecided(e, t) {
		const r = e.world;
		return r.getEntitiesWithComponents([
			Wc,
			n,
			E
		]).filter((e) => !t.seen_.has(e) && !zc(r, e));
	}
	refuse(e, t, n, r) {
		t.refused_.set(n, r);
		t.seen_.add(n);
		this.stamp(e, n, Uc[r], 0);
	}
	/** Records on the component what became of it, which is where the editor reads it from. */
	stamp(e, t, n, r) {
		const i = e.world;
		if (!i.valid(t) || !i.has(t, Wc)) return;
		i.insert(t, Wc, {
			...i.get(t, Wc),
			state: n,
			batched: r
		});
	}
	async pass(e, t, r, i) {
		const o = e.world;
		const s = D("LODGroup");
		const c = D("Billboard");
		const l = D("MeshSkin");
		const u = D("LightProbeVolume");
		const d = D("BakedLighting");
		const f = D("RigidBody3D");
		const p = D("CharacterController3D");
		const m = !!u && o.getEntitiesWithComponents([u]).length > 0;
		const h = !!d && o.getEntitiesWithComponents([d]).some((e) => o.get(e, d).bakedFrom);
		const g = /* @__PURE__ */ new Map();
		const _ = [];
		const v = /* @__PURE__ */ new Map();
		for (const u of i) {
			if (!o.valid(u)) continue;
			const i = o.get(u, n);
			const d = o.get(u, Wc);
			if (!i.enabled) {
				this.refuse(e, t, u, "disabled");
				continue;
			}
			if (!i.opaque) {
				this.refuse(e, t, u, "blended");
				continue;
			}
			if (s && o.has(u, s)) {
				this.refuse(e, t, u, "lod");
				continue;
			}
			if (c && o.has(u, c) && o.get(u, c).enabled) {
				this.refuse(e, t, u, "billboard");
				continue;
			}
			if (l && o.has(u, l)) {
				this.refuse(e, t, u, "skinned");
				continue;
			}
			if (p && o.has(u, p) || f && o.has(u, f) && o.get(u, f).bodyType !== 0) {
				this.refuse(e, t, u, "moves");
				continue;
			}
			if (m) {
				this.refuse(e, t, u, "baked");
				continue;
			}
			if (!g.has(i.mesh)) g.set(i.mesh, await r.readMeshData(i.mesh));
			const y = g.get(i.mesh) ?? null;
			if (!y) {
				this.refuse(e, t, u, "no-mesh");
				continue;
			}
			if (h && y.channels.some((e) => e.semantic === F.TexCoord1)) {
				this.refuse(e, t, u, "baked");
				continue;
			}
			const b = yc(y);
			if (b) {
				this.refuse(e, t, u, b);
				continue;
			}
			if (!o.valid(u)) continue;
			const x = o.get(u, E);
			const S = bc(x.worldPosition, x.worldRotation, x.worldScale);
			const ee = o.has(u, a) ? o.get(u, a).scene : "";
			const te = (y.aabbMin[0] + y.aabbMax[0]) / 2, C = (y.aabbMin[1] + y.aabbMax[1]) / 2, w = (y.aabbMin[2] + y.aabbMax[2]) / 2;
			const T = [
				S[0] * te + S[4] * C + S[8] * w + S[12],
				S[1] * te + S[5] * C + S[9] * w + S[13],
				S[2] * te + S[6] * C + S[10] * w + S[14]
			];
			const ne = Tc({
				material: i.material,
				texture: i.texture,
				normalMap: i.normalMap,
				color: i.color,
				layer: i.layer,
				cullBackfaces: i.cullBackfaces,
				lit: i.lit,
				castShadows: i.castShadows,
				parallax: i.parallax,
				group: `${d.group}@${ee}`
			}, vc(y.channels, y.vertexStride));
			_.push({
				entity: u,
				key: ne,
				center: T,
				vertices: y.vertexCount
			});
			v.set(u, {
				mr: i,
				mesh: y,
				world: S,
				scene: ee
			});
		}
		const y = Ec(_, t.limits);
		for (const n of y.alone) this.refuse(e, t, n, "alone");
		for (const i of y.batches) {
			const s = i.entities.filter((e) => o.valid(e));
			if (s.length < 2) {
				for (const n of s) this.refuse(e, t, n, "alone");
				continue;
			}
			const c = s.map((e) => ({
				mesh: v.get(e).mesh,
				world: v.get(e).world
			}));
			const l = Cc(c);
			const u = r.createMesh(l);
			if (u === 0) {
				A.warn("staticBatch", `the engine refused a merged mesh of ${s.length} parts (${l.vertexCount} vertices)`);
				for (const n of s) this.refuse(e, t, n, "layout");
				continue;
			}
			const d = v.get(s[0]);
			const f = o.spawn(`StaticBatch ${t.groups_.length + 1}`);
			o.insert(f, E, {});
			o.insert(f, n, {
				...d.mr,
				mesh: u,
				enabled: true
			});
			if (d.scene) o.insert(f, a, { scene: d.scene });
			for (const r of s) {
				const i = o.get(r, n);
				o.insert(r, n, {
					...i,
					enabled: false
				});
				t.seen_.add(r);
				this.stamp(e, r, $.Merged, s.length);
			}
			t.groups_.push({
				entity: f,
				handle: u,
				parts: s,
				report: {
					entity: f,
					parts: s,
					vertices: l.vertexCount,
					triangles: l.indices.length / 3,
					bytes: l.vertices.byteLength + l.indices.byteLength,
					drawsBefore: Xc(s.map((e) => v.get(e).mesh))
				}
			});
		}
	}
	/** Rebuild any group that lost a part (its scene unloaded, or the entity was destroyed). */
	sweep(e, t, n) {
		const r = e.world;
		for (let i = t.groups_.length - 1; i >= 0; i--) {
			const a = t.groups_[i];
			const o = a.parts.filter((e) => r.valid(e));
			if (!r.valid(a.entity)) {
				n.releaseBuiltMesh(a.handle);
				for (const e of o) this.restore(r, e);
				t.groups_.splice(i, 1);
				continue;
			}
			if (o.length === a.parts.length) continue;
			t.busy_ = true;
			this.shrink(e, t, n, a, o).finally(() => {
				t.busy_ = false;
			});
			return;
		}
	}
	restore(e, t) {
		const r = e.tryGet(t, n);
		if (r) e.insert(t, n, {
			...r,
			enabled: true
		});
	}
	async shrink(e, t, r, i, a) {
		const o = e.world;
		const s = t.groups_.indexOf(i);
		if (s < 0) return;
		if (a.length < 2) {
			for (const t of a) {
				this.restore(o, t);
				this.stamp(e, t, $.Alone, 0);
			}
			if (o.valid(i.entity)) o.despawn(i.entity);
			r.releaseBuiltMesh(i.handle);
			t.groups_.splice(s, 1);
			return;
		}
		const c = /* @__PURE__ */ new Map();
		const l = [];
		for (const e of a) {
			const t = o.get(e, n).mesh;
			if (!c.has(t)) c.set(t, await r.readMeshData(t));
			const i = c.get(t);
			if (!i || !o.valid(e)) continue;
			const a = o.get(e, E);
			l.push({
				mesh: i,
				world: bc(a.worldPosition, a.worldRotation, a.worldScale)
			});
		}
		if (l.length !== a.length || !o.valid(i.entity)) return;
		const u = Cc(l);
		const d = r.createMesh(u);
		if (d === 0) return;
		const f = o.get(i.entity, n);
		o.insert(i.entity, n, {
			...f,
			mesh: d
		});
		r.releaseBuiltMesh(i.handle);
		i.handle = d;
		i.parts = a;
		for (const t of a) this.stamp(e, t, $.Merged, a.length);
		i.report = {
			...i.report,
			parts: a,
			vertices: u.vertexCount,
			triangles: u.indices.length / 3,
			bytes: u.vertices.byteLength + u.indices.byteLength,
			drawsBefore: Xc(l.map((e) => e.mesh))
		};
	}
	/** Undo everything: parts draw themselves again, merged meshes are released. */
	discardAll(e, t) {
		const n = e.world;
		const r = e.hasResource(j) ? e.getResource(j) : null;
		for (const e of t.groups_) {
			for (const t of e.parts) if (n.valid(t)) this.restore(n, t);
			if (n.valid(e.entity)) n.despawn(e.entity);
			r?.releaseBuiltMesh(e.handle);
		}
		t.groups_.length = 0;
		t.refused_.clear();
		t.seen_.clear();
	}
};
const Qc = new Zc();
//#endregion
//#region src/render/textureStreaming.ts
/** @experimental */
const $c = {
	minEdge: 64,
	budgetBytes: 0,
	shrinkAfter: 3e3,
	unseenAfter: 5e3
};
const el = (e) => 2 ** Math.ceil(Math.log2(Math.max(1, e)));
/** The longer side a texture should be held at: the next power of two above what is wanted, between `minEdge` and the file. @experimental */
function tl(e, t, n) {
	if (!(t > 0)) return Math.min(e, n);
	return Math.min(e, Math.max(n, el(t)));
}
/** The bytes a texture held at `edge` on its longer side takes, with its chain, at four bytes a texel. @experimental */
function nl(e, t, n) {
	const r = Math.min(1, n / Math.max(e, t));
	const i = Math.max(1, Math.round(e * r)), a = Math.max(1, Math.round(t * r));
	return Math.round(i * a * 4 * 4 / 3);
}
/**
* What to move now: every texture whose size should change, the growing ones first and the most starved of those first, then the
* shrinking ones. With a budget, the sizes are first brought within it by halving the largest, so a scene that needs more than the
* budget is drawn a level softer rather than over it. Writes `smallerSince` on the entries it judges.
*
* @experimental
*/
function rl(e, t, n) {
	const r = /* @__PURE__ */ new Map();
	for (const i of e) {
		const e = t - i.seenAt > n.unseenAfter ? 0 : i.wanted;
		r.set(i.handle, tl(Math.max(i.fullWidth, i.fullHeight), e, n.minEdge));
	}
	if (n.budgetBytes > 0) {
		let t = 0;
		for (const n of e) t += nl(n.fullWidth, n.fullHeight, r.get(n.handle));
		while (t > n.budgetBytes) {
			let i = null, a = 0;
			for (const t of e) {
				const e = r.get(t.handle);
				if (e <= n.minEdge) continue;
				const o = nl(t.fullWidth, t.fullHeight, e);
				if (o > a) {
					i = t;
					a = o;
				}
			}
			if (!i) break;
			const o = Math.max(n.minEdge, r.get(i.handle) / 2);
			t += nl(i.fullWidth, i.fullHeight, o) - a;
			r.set(i.handle, o);
		}
	}
	const i = [];
	const a = [];
	for (const o of e) {
		const e = r.get(o.handle);
		if (e > o.edge) {
			o.smallerSince = -1;
			i.push({
				handle: o.handle,
				edge: e,
				starved: e / o.edge
			});
		} else if (e < o.edge) {
			if (o.smallerSince < 0) o.smallerSince = t;
			if (t - o.smallerSince >= n.shrinkAfter) a.push({
				handle: o.handle,
				edge: e
			});
		} else o.smallerSince = -1;
	}
	i.sort((e, t) => t.starved - e.starved);
	return [...i.map(({ handle: e, edge: t }) => ({
		handle: e,
		edge: t
	})), ...a];
}
/** What streaming is doing, for a profiler and a check. @experimental */
var il = class {
	constructor() {
		this.textures = /* @__PURE__ */ new Map();
		this.held = /* @__PURE__ */ new Set();
		this.refused = /* @__PURE__ */ new Set();
		this.restoring = /* @__PURE__ */ new Set();
		this.moves = 0;
		this.failures = 0;
		this.inFlight = 0;
		this.enabled = false;
	}
	/** The bytes the streamed textures take now, and would at their files' sizes. */
	bytes() {
		let e = 0, t = 0;
		for (const n of this.textures.values()) {
			e += nl(n.fullWidth, n.fullHeight, n.edge);
			t += nl(n.fullWidth, n.fullHeight, Math.max(n.fullWidth, n.fullHeight));
		}
		return {
			now: e,
			full: t
		};
	}
};
/** @experimental */
const al = k(new il(), "TextureStreaming");
/** Components whose `texture` field draws a texture no view measures the need of. */
const ol = [
	"Sprite",
	"UIVisual",
	"TilemapLayer",
	"ParticleEmitter",
	"TrailRenderer",
	"SpriteMask"
];
/** @experimental */
var sl = class {
	constructor() {
		this.name = "textureStreaming";
	}
	build(e) {
		const t = new il();
		e.insertResource(al, t);
		const n = e.world;
		let r = 0, i = -Infinity;
		const a = 4;
		/** The edge a mesh texture starts at while streaming is on. */
		const o = 256;
		const s = () => {
			return (e.hasResource(on) ? e.getResource(on) : null)?.profile.textureStreaming && f(e)?.renderer_takeTextureWants ? o : 0;
		};
		Pe(s);
		const c = (e) => {
			const t = /* @__PURE__ */ new Map();
			if (!e) return t;
			for (const n of e.split(",")) {
				const e = n.indexOf(":");
				if (e > 0) t.set(Number(n.slice(0, e)), Number(n.slice(e + 1)));
			}
			return t;
		};
		const l = () => {
			t.held.clear();
			for (const e of ol) {
				const r = D(e);
				if (!r) continue;
				for (const e of n.getEntitiesWithComponents([r])) {
					const i = n.get(e, r).texture;
					if (typeof i === "number" && i > 0) t.held.add(i);
				}
			}
		};
		e.addSystemToSchedule(5, _([], () => {
			const n = (e.hasResource(on) ? e.getResource(on) : null)?.profile;
			t.enabled = !!n?.textureStreaming;
			const o = f(e);
			if (!t.enabled || !o?.renderer_takeTextureWants || !e.hasResource(j)) return;
			const s = Re();
			if (s - r < 250) return;
			r = s;
			if (s - i > 2e3) {
				l();
				i = s;
			}
			const u = e.getResource(j);
			for (const [e, n] of c(o.renderer_takeTextureWants())) {
				if (t.held.has(e)) {
					t.textures.delete(e);
					continue;
				}
				if (t.refused.has(e)) continue;
				let r = t.textures.get(e);
				if (!r) {
					if (!u.textureResizable(e)) continue;
					const n = u.textureFullSize(e) ?? Ze(e);
					if (!n || n.width <= 0 || n.height <= 0) continue;
					const i = Ze(e);
					r = {
						handle: e,
						fullWidth: n.width,
						fullHeight: n.height,
						edge: i ? Math.max(i.width, i.height) : Math.max(n.width, n.height),
						wanted: 0,
						seenAt: s,
						smallerSince: -1
					};
					t.textures.set(e, r);
				}
				r.wanted = r.seenAt === s ? Math.max(r.wanted, n) : n;
				r.seenAt = s;
			}
			for (const e of t.held) {
				t.textures.delete(e);
				const n = u.textureFullSize(e), r = Ze(e);
				if (n && r && (r.width < n.width || r.height < n.height) && t.inFlight < a && !t.restoring.has(e)) {
					t.restoring.add(e);
					t.inFlight++;
					u.resizeTexture(e, 0).catch(() => {
						t.failures++;
					}).finally(() => {
						t.inFlight--;
						t.restoring.delete(e);
					});
				}
			}
			const d = {
				...$c,
				budgetBytes: Math.max(0, n.textureStreamingBudget) * 1024 * 1024
			};
			for (const e of rl([...t.textures.values()], s, d)) {
				if (t.inFlight >= a) break;
				const n = t.textures.get(e.handle);
				const r = Math.max(n.fullWidth, n.fullHeight);
				t.inFlight++;
				const i = n.edge;
				n.edge = e.edge;
				u.resizeTexture(e.handle, e.edge >= r ? 0 : e.edge).then((a) => {
					if (a && Math.max(a.width, a.height) > e.edge && e.edge < r) {
						n.edge = Math.max(a.width, a.height);
						t.refused.add(e.handle);
						t.textures.delete(e.handle);
					} else if (a) {
						n.edge = Math.max(a.width, a.height);
						t.moves++;
					} else {
						n.edge = i;
						t.failures++;
						t.textures.delete(e.handle);
					}
				}, () => {
					n.edge = i;
					t.failures++;
					t.textures.delete(e.handle);
				}).finally(() => {
					t.inFlight--;
				});
			}
		}, { name: "TextureStreamingSystem" }), { runIf: N });
	}
};
/** @experimental */
const cl = new sl();
//#endregion
//#region src/runtime/frameStats.ts
function ll(e) {
	if (!e) return {};
	try {
		return JSON.parse(e);
	} catch {
		return {};
	}
}
function ul(e) {
	if (!e.hasResource(Ne)) return {};
	const t = e.getResource(Ne).getBufferStats();
	return {
		audioBytes: t.bufferBytes,
		audioStreamedCount: t.streamedCount,
		audioStreamedSavedBytes: t.streamedSavedBytes
	};
}
function dl(e) {
	const t = f(e);
	return {
		...e.getFrameTiming(),
		phases: Object.fromEntries(e.getPhaseTimings() ?? []),
		costs: e.getFrameCosts(),
		drawCalls: t?.renderer_getDrawCalls?.() ?? 0,
		gpuDraws: t?.renderer_getGpuDrawCalls?.() ?? 0,
		triangles: t?.renderer_getTriangles?.() ?? 0,
		sprites: t?.renderer_getSprites?.() ?? 0,
		entities: e.world.getAllEntities().length,
		gpuMs: t?.renderer_getGpuTimeMs?.() ?? -1,
		cppScopes: ll(t?.engine_getCpuScopes?.()),
		cppCounters: ll(t?.engine_getCounters?.()),
		gpuScopes: ll(t?.engine_getGpuScopes?.()),
		wasmBytes: e.wasmModule?.HEAPU8?.byteLength ?? 0,
		vramBytes: t?.renderer_getEstimatedGpuBytes?.() ?? 0,
		...ul(e),
		...e.hasResource(qc) ? (() => {
			const t = e.getResource(qc).summary();
			return t ? { staticBatch: t } : {};
		})() : {},
		quality: e.hasResource(on) ? e.getResource(on)?.report() : void 0,
		...pl(e),
		...fl(e)
	};
}
/** What each CompositeBatch root says it draws, as the pass last wrote it on the root. */
function fl(e) {
	const t = e.world.getEntitiesWithComponents([Z]);
	if (t.length === 0) return {};
	return { compositeBatch: t.map((t) => {
		const n = e.world.get(t, Z);
		return {
			entity: t,
			parts: n.parts,
			instanced: n.instanced,
			draws: n.draws,
			drawsBefore: n.drawsBefore,
			moving: n.moving
		};
	}) };
}
function pl(e) {
	if (!e.hasResource(al)) return {};
	const t = e.getResource(al);
	const n = t.bytes();
	const r = e.hasResource(j) ? e.getResource(j).getTextureLoader() : null;
	return { textureStreaming: {
		enabled: t.enabled,
		textures: t.textures.size,
		streamedMB: n.now / 1048576,
		fullMB: n.full / 1048576,
		moves: t.moves,
		failures: t.failures,
		startedSmall: r?.startedSmall ?? 0
	} };
}
//#endregion
//#region src/runtime/worldSnapshot.ts
/** Kept as the tree's own shape (name, parent, children) rather than as rows. */
const ml = /* @__PURE__ */ new Set([
	"Name",
	"Parent",
	"Children",
	"WorldTransform"
]);
/** Authoring inspection omits transient state; runtime diagnostics may request
* it explicitly. The tree's own structural fields remain separate. */
function hl(e, t, n = false) {
	return gl(e.getComponentTypes(t), n);
}
function gl(e, t = false) {
	return e.filter((e) => {
		if (ml.has(e)) return false;
		const n = D(e);
		return !!n && (t || !n.transient);
	});
}
/**
* Rewrite handle-valued asset fields to the load paths behind them. A World stores
* handles; an inspector speaks refs, and a handle shown raw reads as an empty slot.
* Handles nobody can name pass through untouched.
*/
function _l(e, t) {
	return e.map(({ type: e, data: n }) => {
		let r = null;
		for (const i of dt(e)) {
			const e = n[i.field];
			if (typeof e !== "number" || e === 0) continue;
			const a = t(i.type, e);
			if (a !== null) (r ??= { ...n })[i.field] = a;
		}
		return r ? {
			type: e,
			data: r
		} : {
			type: e,
			data: n
		};
	});
}
/**
* @p app's world: the tree when @p withTree (O(entities), so a caller polling one
* entity's values skips it), and @p selectedId's values when given.
*/
function vl(e, t, n, r = {}) {
	const i = e.world;
	if (t != null && !i.valid(t)) t = null;
	if (!n && t == null) return {
		tree: null,
		selected: null
	};
	const a = D("Name");
	const o = D("Parent");
	const s = D("Children");
	const c = D("SceneOwner");
	const l = n ? i.getAllEntities() : [];
	const u = n ? i.getComponentTypesBatch(l) : null;
	const d = !n && t != null ? i.getComponentTypes(t) : null;
	let f;
	const p = (e, t) => {
		if (!o || !t.includes(o._name)) return void 0;
		if (f === void 0) f = i.resolveGetter(o);
		return (f ? f(e) : i.get(e, o))?.entity;
	};
	const m = /* @__PURE__ */ new Map();
	const h = /* @__PURE__ */ new Map();
	if (!n && t != null && s) {
		const e = p(t, d);
		if (e !== void 0) m.set(t, e);
		const n = i.resolveHas(s);
		let r = null;
		if (!n) r = i.tryGet(t, s);
		else if (n(t)) {
			const e = i.resolveGetter(s, "retained");
			r = e ? e(t) : i.tryGet(t, s);
		}
		if (r?.entities?.length) {
			const e = new Set(r.entities);
			h.set(t, i.getAllEntities().filter((t) => e.has(t)));
		}
	} else if (o) {
		const e = n ? l : i.getAllEntities();
		const t = u ?? i.getComponentTypesBatch(e);
		for (let n = 0; n < e.length; n++) {
			const r = p(e[n], t[n]);
			if (r !== void 0) m.set(e[n], r);
		}
		for (const [e, t] of m) (h.get(t) ?? h.set(t, []).get(t)).push(e);
	}
	const g = (e) => (a ? i.tryGet(e, a)?.value : void 0) ?? `Entity_${e}`;
	const _ = C();
	const v = /* @__PURE__ */ new Map();
	const y = (e, t) => {
		const n = t.includes(G._name) ? G : _.find((e) => t.includes(e._name));
		if (!n) return {};
		let r = v.get(n);
		if (!r) {
			const e = i.resolveGetter(n);
			r = e ? (t) => e(t) : (e) => i.get(e, n);
			v.set(n, r);
		}
		const a = n === G ? "display" : n.renderableField;
		const o = r(e);
		const s = o && o[a] !== void 0 ? o : i.get(e, n);
		return {
			hideable: true,
			hidden: n === G ? s.display === 1 : s[a] === false
		};
	};
	const b = (t) => {
		if (r.entryScene === void 0) return void 0;
		if (((c ? i.tryGet(t, c) : null)?.scene ?? "") !== r.entryScene) return void 0;
		return sn(e, t);
	};
	const x = (e, t, n) => {
		const r = b(e);
		return {
			id: e,
			name: g(e),
			parent: m.get(e) ?? null,
			children: h.get(e) ?? [],
			components: t,
			...y(e, n),
			...r === void 0 ? {} : { src: r }
		};
	};
	let S = null;
	const ee = n ? {
		version: "1.0",
		name: "live",
		entities: l.map((e, n) => {
			const r = e;
			const i = u[n];
			if (r === t) S = i;
			return x(r, gl(i).map((e) => ({
				type: e,
				data: {}
			})), i);
		})
	} : null;
	let te = null;
	if (t != null) {
		const n = S ?? d ?? i.getComponentTypes(t);
		const a = gl(n).map((e) => {
			const n = D(e);
			const r = n ? i.tryGet(t, n) : null;
			return r ? {
				type: e,
				data: r
			} : null;
		}).filter((e) => !!e);
		const o = e.hasResource(j) ? e.getResource(j) : null;
		const s = _l(a, (e, t) => {
			const n = o?.pathForHandle(e, t) ?? null;
			return n === null ? null : r.assetPath ? r.assetPath(n) : n;
		});
		te = x(t, s, n);
	}
	return {
		tree: ee,
		selected: te
	};
}
//#endregion
//#region src/runtime/consoleForward.ts
const yl = {
	log: "info",
	info: "info",
	debug: "info",
	warn: "warn",
	error: "error"
};
function bl(e) {
	if (typeof e === "string") return e;
	if (e instanceof Error) return e.stack ?? e.message;
	try {
		return typeof e === "object" ? JSON.stringify(e) : String(e);
	} catch {
		return String(e);
	}
}
/** Wrap console so @p send hears every line; returns the unwrap. A throwing
*  listener never stops the original console from printing. */
function xl(e) {
	const t = /* @__PURE__ */ new Map();
	for (const n of Object.keys(yl)) {
		const r = console[n].bind(console);
		t.set(n, console[n]);
		console[n] = (...t) => {
			r(...t);
			try {
				e(yl[n], t.map(bl).join(" "));
			} catch {}
		};
	}
	return () => {
		for (const [e, n] of t) console[e] = n;
	};
}
//#endregion
//#region src/runtime/debugChannelProtocol.ts
const Sl = 1;
//#endregion
export { Fs as $, ar as $n, Na as $t, vc as A, Ni as An, Oo as At, dc as B, Si as Bn, lo as Bt, Rc as C, Xi as Cn, Uo as Ct, Pc as D, ji as Dn, Ro as Dt, Mc as E, Gi as En, Io as Et, pc as F, Li as Fn, vo as Ft, Zs as G, hi as Gn, ao as Gt, sc as H, Ti as Hn, co as Ht, fc as I, Ai as In, fo as It, ac as J, si as Jn, Ua as Jt, ic as K, H as Kn, io as Kt, mc as L, ki as Ln, po as Lt, Cc as M, zi as Mn, bo as Mt, Ec as N, Fi as Nn, yo as Nt, Oc as O, Ki as On, Po as Ot, Tc as P, Pi as Pn, _o as Pt, tc as Q, ii as Qn, Ia as Qt, hc as R, Oi as Rn, ho as Rt, Bc as S, Zi as Sn, Ho as St, Hc as T, $i as Tn, Lo as Tt, oc as U, gi as Un, so as Ut, cc as V, Ei as Vn, uo as Vt, lc as W, U as Wn, oo as Wt, Js as X, li as Xn, Ba as Xt, $s as Y, oi as Yn, Va as Yt, ec as Z, ai as Zn, Oa as Zt, $ as _, W as _n, Yo as _t, vl as a, ya as an, V as ar, Bs as at, Qc as b, ca as bn, Vo as bt, il as c, xa as cn, En as cr, ms as ct, rl as d, ha as dn, gn as dr, as as dt, Pa as en, Ln as er, Is as et, tl as f, pa as fn, mn as fr, ts as ft, Zc as g, sa as gn, Jo as gt, Wc as h, G as hn, qo as ht, _l as i, Da as in, Nn as ir, Gs as it, yc as j, Hi as jn, Do as jt, wc as k, Ri as kn, jo as kt, sl as l, Sa as ln, Cn as lr, ks as lt, cl as m, fa as mn, fn as mr, rs as mt, xl as n, Ta as nn, In as nr, Rs as nt, dl as o, K as on, B as or, Hs as ot, nl as p, ma as pn, hn as pr, ns as pt, rc as q, ci as qn, Wa as qt, hl as r, Ea as rn, Pn as rr, Ks as rt, $c as s, ba as sn, kn as sr, Ps as st, Sl as t, Ca as tn, Fn as tr, Ls as tt, al as u, da as un, vn as ur, As as ut, Gc as v, ua as vn, zo as vt, Q as w, Qi as wn, Ko as wt, Z as x, ra as xn, Wo as xt, qc as y, la as yn, Bo as yt, uc as z, xi as zn, mo as zt };

//# sourceMappingURL=debugChannelProtocol.js.map