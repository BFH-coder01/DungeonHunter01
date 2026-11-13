import { R as e } from "./system.js";
import { s as t } from "./resource.js";
import { St as n } from "./AssetPlugin.js";
import { M as r, N as i, P as a, n as o } from "./base.js";
import { i as s } from "./types.js";
//#region src/render/quality.ts
/** A bound on a hand-edited file, well past the effects that exist: one lower quietly left the effects past it running. */
const c = 1024;
/** The size of the set a body of water's waves are taken from (water/waves.ts: WAVE_SET_SIZE). */
const l = 8;
const u = [
	"low",
	"medium",
	"high"
];
const d = {
	low: {
		renderScale: .75,
		minRenderScale: .5,
		msaaSamples: 1,
		antialiasing: "msaa",
		shadowAtlasSize: 1024,
		shadowCellSize: 256,
		shadowCascades: 2,
		planarReflectionScale: .25,
		planarReflectionMaxSize: 512,
		planarReflectionUpdatesPerSecond: 0,
		depthPrepass: false,
		shadowDistance: 0,
		detailScale: .5,
		particleLimit: 1e3,
		postProcess: true,
		ssao: false,
		waterWaves: 3,
		waterRippleCells: 32,
		waterDisplacement: false,
		waterMirror: false,
		waterCaustics: false,
		skipEffects: [
			"ssr",
			"taa",
			"depthOfField",
			"lightShafts",
			"motionBlur",
			"lensFlare",
			"gtao",
			"subsurface",
			"voxelGI",
			"dynamicGI"
		],
		shelterMaskSize: 256,
		shadowSoftSamples: 8,
		lighting: "direct",
		dynamicGIReduced: true,
		drawCallBudget: 150,
		textureStreaming: true,
		textureStreamingBudget: 128
	},
	medium: {
		renderScale: 1,
		minRenderScale: .65,
		msaaSamples: 2,
		antialiasing: "temporal",
		shadowAtlasSize: 2048,
		shadowCellSize: 512,
		shadowCascades: 3,
		planarReflectionScale: .5,
		planarReflectionMaxSize: 1024,
		planarReflectionUpdatesPerSecond: 0,
		depthPrepass: true,
		shadowDistance: 0,
		detailScale: .8,
		particleLimit: 5e3,
		postProcess: true,
		ssao: true,
		waterWaves: 5,
		waterRippleCells: 64,
		waterDisplacement: true,
		waterMirror: true,
		waterCaustics: true,
		skipEffects: ["ssr", "depthOfField"],
		shelterMaskSize: 512,
		shadowSoftSamples: 12,
		lighting: "direct",
		dynamicGIReduced: true,
		drawCallBudget: 400,
		textureStreaming: true,
		textureStreamingBudget: 256
	},
	high: {
		renderScale: 1,
		minRenderScale: .75,
		msaaSamples: 4,
		antialiasing: "msaa",
		shadowAtlasSize: 4096,
		shadowCellSize: 1024,
		shadowCascades: 4,
		planarReflectionScale: 1,
		planarReflectionMaxSize: 2048,
		planarReflectionUpdatesPerSecond: 0,
		depthPrepass: true,
		shadowDistance: 0,
		detailScale: 1,
		particleLimit: 2e4,
		postProcess: true,
		ssao: true,
		waterWaves: 8,
		waterRippleCells: 128,
		waterDisplacement: true,
		waterMirror: true,
		waterCaustics: true,
		skipEffects: [],
		shelterMaskSize: 1024,
		shadowSoftSamples: 16,
		lighting: "full",
		dynamicGIReduced: false,
		drawCallBudget: 1500,
		textureStreaming: false,
		textureStreamingBudget: 0
	}
};
function f(e) {
	return e !== null && typeof e === "object" && !Array.isArray(e) ? e : {};
}
function p(e, t, n, r) {
	return typeof e === "number" && Number.isFinite(e) ? Math.min(r, Math.max(n, e)) : t;
}
/**
* The level a project gets that names none. A phone or tablet takes medium: all of a level's picture at a fraction of the cost (a full-screen sea on a
* Snapdragon 8 Elite is 25.7 ms a frame as authored and 9.0 at medium, mostly by leaving four samples behind). Elsewhere nothing is managed. Naming a
* level, `off` among them, always wins.
*/
function m(e) {
	return e ? "medium" : "off";
}
/** @experimental */
function h(e) {
	const t = f(e);
	const n = {
		mode: t.mode === "auto" || u.includes(t.mode) ? t.mode : "off",
		targetFps: p(t.targetFps, 60, 15, 120),
		dynamicResolution: t.dynamicResolution === true,
		asyncShaderCompile: t.asyncShaderCompile === true,
		prewarmShaders: t.prewarmShaders === true,
		renderOnDemand: t.renderOnDemand === true,
		renderOnDemandTail: p(t.renderOnDemandTail, 30, 1, 600),
		prewarmTimeoutMs: p(t.prewarmTimeoutMs, 3e4, 1e3, 6e5)
	};
	if (t.power !== void 0 && t.power !== false) n.power = g(t.power);
	if (t.profiles) {
		n.profiles = {};
		for (const e of u) {
			if (!f(t.profiles)[e]) continue;
			n.profiles[e] = _(e, f(t.profiles)[e]);
		}
	}
	if (Array.isArray(t.deviceRules)) n.deviceRules = t.deviceRules.slice(0, 64).flatMap((e) => {
		const t = f(e);
		if (!u.includes(t.level)) return [];
		const n = { level: t.level };
		for (const e of ["modelIncludes", "gpuIncludes"]) if (typeof t[e] === "string" && t[e].trim()) n[e] = t[e].trim();
		for (const e of ["maxMemoryGB", "maxCores"]) if (typeof t[e] === "number" && Number.isFinite(t[e]) && t[e] > 0) n[e] = t[e];
		return Object.keys(n).length > 1 ? [n] : [];
	});
	return n;
}
/** A power policy from a project's settings: what is not a usable number or name keeps its default, and `true` is every default. */
function g(e) {
	const t = f(e);
	const n = {};
	if (typeof t.lowBattery === "number" && Number.isFinite(t.lowBattery)) n.lowBattery = Math.min(Math.max(t.lowBattery, 0), 1);
	if (t.thermal === "serious" || t.thermal === "critical" || t.thermal === "never") n.thermal = t.thermal;
	if (typeof t.fps === "number" && Number.isFinite(t.fps)) n.fps = Math.min(Math.max(Math.round(t.fps), 10), 120);
	if (t.ceiling === "low" || t.ceiling === "medium" || t.ceiling === "high") n.ceiling = t.ceiling;
	if (t.severe === "critical" || t.severe === "never") n.severe = t.severe;
	return n;
}
function _(e, t) {
	const n = d[e];
	const r = f(t);
	const i = p(r.renderScale, n.renderScale, .25, 1);
	const a = [
		512,
		1024,
		2048,
		4096
	].includes(r.shadowAtlasSize) ? r.shadowAtlasSize : n.shadowAtlasSize;
	const o = [
		128,
		256,
		512,
		1024
	].includes(r.shadowCellSize) ? r.shadowCellSize : n.shadowCellSize;
	return {
		renderScale: i,
		minRenderScale: p(r.minRenderScale, Math.min(n.minRenderScale, i), .25, i),
		msaaSamples: [
			1,
			2,
			4,
			8
		].includes(r.msaaSamples) ? r.msaaSamples : n.msaaSamples,
		antialiasing: r.antialiasing === "msaa" || r.antialiasing === "temporal" ? r.antialiasing : n.antialiasing,
		shadowAtlasSize: a,
		shadowCellSize: Math.min(o, a / 2),
		shadowCascades: Math.round(p(r.shadowCascades, n.shadowCascades, 1, 4)),
		shadowDistance: p(r.shadowDistance, n.shadowDistance, 0, 1e7),
		detailScale: p(r.detailScale, n.detailScale, .25, 1),
		particleLimit: Math.round(p(r.particleLimit, n.particleLimit, 0, 1e6)),
		planarReflectionScale: p(r.planarReflectionScale, n.planarReflectionScale, .125, 1),
		planarReflectionMaxSize: Math.round(p(r.planarReflectionMaxSize, n.planarReflectionMaxSize, 64, 4096)),
		planarReflectionUpdatesPerSecond: p(r.planarReflectionUpdatesPerSecond, n.planarReflectionUpdatesPerSecond, 0, 120),
		depthPrepass: typeof r.depthPrepass === "boolean" ? r.depthPrepass : n.depthPrepass,
		postProcess: typeof r.postProcess === "boolean" ? r.postProcess : n.postProcess,
		ssao: typeof r.ssao === "boolean" ? r.ssao : n.ssao,
		dynamicGIReduced: typeof r.dynamicGIReduced === "boolean" ? r.dynamicGIReduced : n.dynamicGIReduced,
		waterWaves: Math.round(p(r.waterWaves, n.waterWaves, 1, 8)),
		waterRippleCells: Math.round(p(r.waterRippleCells, n.waterRippleCells, 0, 256)),
		waterDisplacement: typeof r.waterDisplacement === "boolean" ? r.waterDisplacement : n.waterDisplacement,
		waterMirror: typeof r.waterMirror === "boolean" ? r.waterMirror : n.waterMirror,
		waterCaustics: typeof r.waterCaustics === "boolean" ? r.waterCaustics : n.waterCaustics,
		skipEffects: Array.isArray(r.skipEffects) ? r.skipEffects.filter((e) => typeof e === "string" && e.trim() !== "").map((e) => e.trim()).slice(0, c) : n.skipEffects,
		shelterMaskSize: Math.round(p(r.shelterMaskSize, n.shelterMaskSize, 64, 2048)),
		shadowSoftSamples: Math.round(p(r.shadowSoftSamples, n.shadowSoftSamples, 1, 32)),
		lighting: r.lighting === "full" || r.lighting === "direct" ? r.lighting : n.lighting,
		drawCallBudget: Math.round(p(r.drawCallBudget, n.drawCallBudget, 1, 1e5)),
		textureStreaming: typeof r.textureStreaming === "boolean" ? r.textureStreaming : n.textureStreaming,
		textureStreamingBudget: Math.round(p(r.textureStreamingBudget, n.textureStreamingBudget, 0, 65536))
	};
}
/** A level's profile as the engine will use it: the level's own defaults with a project's overrides on top. */
function v(e, t) {
	return _(e, t);
}
/** What a level is before a project says anything about it. */
function y(e) {
	return d[e];
}
function b(e, t) {
	const n = (e, t) => e?.toLowerCase().includes(t.toLowerCase()) ?? false;
	return (!e.modelIncludes || n(t.model, e.modelIncludes)) && (!e.gpuIncludes || n(t.gpu, e.gpuIncludes)) && (e.maxMemoryGB === void 0 || t.memoryGB !== void 0 && t.memoryGB <= e.maxMemoryGB) && (e.maxCores === void 0 || t.cores !== void 0 && t.cores <= e.maxCores);
}
const x = 1.1;
const S = .8;
/**
* @experimental Whether resolution should go down, may come back up, or stay, from smoothed readings (-1 = not known)
* and the frame budget. Pure.
*
* A GPU reading over the budget is pressure on its own word. A small one is not headroom on its own word: a timer
* can cover less than the frame (a tile renderer has not drawn when the pass is stamped), so what a low reading may
* do is decided with the frame itself. A frame that came late although its own run fitted the budget waited on the
* GPU or the display, and resolution is the lever for that; one whose run did not fit is the CPU's, and resolution
* would buy nothing.
*/
function C(e, t) {
	const n = e.gpuMs > 0;
	const r = e.busyMs > 0;
	if (n && e.gpuMs > t * x) return "gpu-pressure";
	const i = n && e.gpuMs < t * S;
	if (e.frameMs > t * x) {
		if (r ? e.busyMs <= t : !n) return "frame-pressure";
		return i ? "headroom" : "steady";
	}
	return (n ? i : e.frameMs < t * S) ? "headroom" : "steady";
}
/** Pressure for this long lowers the scale a step; headroom for `RECOVER_MS` and up raises it one. */
const w = 500;
const T = 2e3;
const E = 32e3;
/** A step up that is taken back within this long was a mistake, not a change of scene. */
const D = 5e3;
const O = (e) => e !== void 0 && Number.isFinite(e) && e > 0;
/** @experimental Per-app policy; authored scene components remain unchanged. */
var k = class {
	constructor(e, t = {}) {
		this.device_ = t;
		this.level_ = "high";
		this.modeLevel_ = "high";
		this.ceiling_ = null;
		this.profile_ = d.high;
		this.scale_ = 1;
		this.average_ = {
			frameMs: 0,
			busyMs: -1,
			gpuMs: -1
		};
		this.pressureMs_ = 0;
		this.recoveryMs_ = 0;
		this.clockMs_ = 0;
		this.raisedAt_ = -1;
		this.recoverAfterMs_ = T;
		this.reason_ = "disabled";
		this.modeReason_ = "disabled";
		this.limitations_ = /* @__PURE__ */ new Set();
		this.config_ = h(e);
		this.setMode(this.config_.mode ?? "off");
	}
	get enabled() {
		return this.config_.mode !== "off";
	}
	get profile() {
		return this.profile_;
	}
	get renderScale() {
		return this.enabled ? this.scale_ : 1;
	}
	setMode(e) {
		this.config_.mode = e;
		const t = this.config_.deviceRules?.find((e) => b(e, this.device_));
		const n = this.device_.memoryGB !== void 0 && this.device_.memoryGB <= 2 || this.device_.cores !== void 0 && this.device_.cores <= 2;
		this.modeLevel_ = e === "off" ? "high" : e === "auto" ? t?.level ?? (n ? "low" : "medium") : e;
		this.level_ = this.ceilingOf_(this.modeLevel_);
		this.profile_ = _(this.level_, this.config_.profiles?.[this.level_]);
		this.scale_ = e === "off" ? 1 : this.profile_.renderScale;
		this.resetSampling_(true);
		this.reason_ = e === "off" ? "disabled" : e !== "auto" ? "manual" : t ? "device-rule" : n ? "device-capacity" : "device-unknown";
		this.modeReason_ = this.reason_;
	}
	ceilingOf_(e) {
		return this.ceiling_ !== null && u.indexOf(this.ceiling_) < u.indexOf(e) ? this.ceiling_ : e;
	}
	/**
	* No level above `level` while it is set; null takes it off. Only lowers: a mode already at or under the ceiling is left as it is. Used by the power
	* policy, which holds the level down while the device is short of battery or hot.
	*/
	setCeiling(e) {
		if (this.ceiling_ === e) return;
		this.ceiling_ = e;
		const t = this.ceilingOf_(this.modeLevel_);
		this.setLimitation("power-saver", t !== this.modeLevel_);
		if (t === this.level_) return;
		this.level_ = t;
		this.profile_ = _(t, this.config_.profiles?.[t]);
		this.scale_ = this.enabled ? this.profile_.renderScale : 1;
		this.resetSampling_(true);
		this.reason_ = t !== this.modeLevel_ ? "power-saver" : this.modeReason_;
	}
	setLimitation(e, t) {
		if (t) this.limitations_.add(e);
		else this.limitations_.delete(e);
	}
	/** Forget the running averages; `all` also forgets what was learned about stepping back up. */
	resetSampling_(e) {
		this.average_ = {
			frameMs: 0,
			busyMs: -1,
			gpuMs: -1
		};
		this.pressureMs_ = this.recoveryMs_ = 0;
		if (e) {
			this.clockMs_ = 0;
			this.raisedAt_ = -1;
			this.recoverAfterMs_ = T;
		}
	}
	/**
	* Take one frame's readings. Sustained pressure lowers the render scale a step towards the level's floor;
	* sustained headroom raises it back a step. See {@link judgeFrames} for what counts as which.
	*/
	sample(e) {
		if (!this.enabled || !this.config_.dynamicResolution) return;
		const { frameMs: t } = e;
		if (!Number.isFinite(t) || t <= 0 || t > 250) {
			this.resetSampling_(false);
			return;
		}
		const n = this.average_.frameMs === 0;
		const r = 1 - Math.exp(-t / 250);
		const i = (e, t) => !O(t) ? -1 : n || e < 0 ? t : e + r * (t - e);
		this.average_ = {
			frameMs: i(this.average_.frameMs, t),
			busyMs: i(this.average_.busyMs, e.busyMs),
			gpuMs: i(this.average_.gpuMs, e.gpuMs)
		};
		this.clockMs_ += t;
		const a = C(this.average_, 1e3 / (this.config_.targetFps ?? 60));
		const o = a === "gpu-pressure" || a === "frame-pressure";
		this.pressureMs_ = o ? this.pressureMs_ + t : 0;
		this.recoveryMs_ = a === "headroom" ? this.recoveryMs_ + t : 0;
		if (this.pressureMs_ >= w) {
			if (this.raisedAt_ >= 0 && this.clockMs_ - this.raisedAt_ <= D) this.recoverAfterMs_ = Math.min(E, this.recoverAfterMs_ * 2);
			this.raisedAt_ = -1;
			this.scale_ = Math.max(this.profile_.minRenderScale, Math.round((this.scale_ - .05) * 100) / 100);
			this.reason_ = this.scale_ === this.profile_.minRenderScale ? "resolution-floor" : a;
			this.pressureMs_ = this.recoveryMs_ = 0;
		} else if (this.recoveryMs_ >= this.recoverAfterMs_) {
			if (this.raisedAt_ >= 0) this.recoverAfterMs_ = Math.max(T, this.recoverAfterMs_ / 2);
			this.raisedAt_ = this.scale_ < this.profile_.renderScale ? this.clockMs_ : -1;
			this.scale_ = Math.min(this.profile_.renderScale, Math.round((this.scale_ + .05) * 100) / 100);
			this.reason_ = this.scale_ === this.profile_.renderScale ? this.modeReason_ : "recovery";
			this.pressureMs_ = this.recoveryMs_ = 0;
		}
	}
	report() {
		return {
			mode: this.config_.mode ?? "off",
			level: this.level_,
			renderScale: this.renderScale,
			targetFps: this.config_.targetFps ?? 60,
			frameMs: this.average_.frameMs,
			busyMs: this.average_.busyMs,
			gpuMs: this.average_.gpuMs,
			reason: this.reason_,
			limitations: [...this.limitations_],
			drawCallBudget: this.profile_.drawCallBudget
		};
	}
};
//#endregion
//#region src/render/power.ts
const A = {
	nominal: 0,
	fair: 1,
	serious: 2,
	critical: 3
};
/** What the policy says to do about the state the device is in. A null in the state is a reason that cannot hold. */
function j(e, t) {
	const n = {
		saving: false,
		fps: 0,
		ceiling: null,
		reason: "none"
	};
	const r = t.lowBattery ?? .2;
	const i = e.thermal ? A[e.thermal] : 0;
	const a = t.thermal === "never" ? Infinity : t.thermal === "critical" ? 3 : 2;
	const o = t.severe === "never" ? Infinity : 3;
	const s = r > 0 && e.level !== null && e.level < r && e.charging === false;
	const c = i >= a;
	if (!s && !c) return n;
	const l = Math.max(t.fps ?? 30, 1);
	const u = i >= o;
	return {
		saving: true,
		fps: u ? Math.max(Math.round(l / 2), 15) : l,
		ceiling: u ? "low" : t.ceiling ?? "medium",
		reason: u ? "critical" : c ? "thermal" : "battery"
	};
}
//#endregion
//#region src/render/qualityRuntime.ts
/** @experimental */
const M = t(null, "Quality");
function N(t, c, l) {
	const u = o();
	const d = u.deviceQualityInfo?.();
	const f = n(t.wasmModule)?.renderer || d?.gpu;
	const p = new k(c, {
		model: u.deviceName?.(),
		...d,
		gpu: f
	});
	t.insertResource(M, p);
	e(t)?.renderer_setAsyncShaderCompile?.(c.asyncShaderCompile === true);
	let m = null;
	let h = null;
	let g = 0;
	let _ = false;
	const v = i(() => {
		_ = true;
		g = 0;
	});
	const y = a(() => {
		_ = false;
		g = 0;
	});
	const b = () => {
		if (m === p.profile && h === p.enabled) return;
		m = p.profile;
		h = p.enabled;
		const n = e(t);
		n?.postprocess_setMsaaSamples?.(h ? m.antialiasing === "temporal" ? 1 : m.msaaSamples : l);
		const r = n?.renderer_setQualityBudgets;
		p.setLimitation("quality-budgets-unavailable", h && !r);
		r?.(h ? m.shadowAtlasSize : 2048, h ? m.shadowCellSize : 512, h ? m.shadowCascades : 4, h ? m.particleLimit : 4294967295);
		p.setLimitation("shadow-distance-unavailable", h && m.shadowDistance > 0 && !n?.renderer_setShadowDistance);
		n?.renderer_setShadowDistance?.(h ? m.shadowDistance : 0);
		n?.renderer_setShadow2DSoftSamples?.(h ? m.shadowSoftSamples : 16);
		n?.renderer_setDepthPrepass?.(h && m.depthPrepass);
		n?.renderer_setLightingDirect?.(h && m.lighting === "direct");
		n?.renderer_setPlanarReflectionQuality?.(h ? m.planarReflectionScale : .5, h ? m.planarReflectionMaxSize : 1024, h ? m.planarReflectionUpdatesPerSecond : 0);
	};
	t.pipeline?.setQuality(p, b);
	b();
	const x = c.power;
	let S = null;
	if (x) {
		let e = null;
		const n = () => {
			const n = u.device?.().power?.() ?? s;
			const r = j(n, x);
			p.setCeiling(r.ceiling);
			p.setLimitation("power-saver", r.saving);
			const i = t.getTargetFrameRate();
			if (r.saving && r.fps > 0) {
				if (e === null && (i === 0 || i > r.fps)) {
					e = {
						from: i,
						to: r.fps
					};
					t.setTargetFrameRate(r.fps);
				} else if (e !== null && e.to !== r.fps && i === e.to) {
					e.to = r.fps;
					t.setTargetFrameRate(r.fps);
				}
			} else if (e !== null) {
				if (i === e.to) t.setTargetFrameRate(e.from);
				e = null;
			}
		};
		n();
		S = setInterval(n, 5e3);
	}
	const C = t.onFrameEnd(() => {
		const n = r();
		if (!_ && !t.isPaused() && g > 0) p.sample({
			frameMs: n - g,
			busyMs: t.getFrameTiming()?.busyMs,
			gpuMs: e(t)?.renderer_getGpuTimeMs?.()
		});
		g = _ || t.isPaused() ? 0 : n;
	});
	t.addPlugin({
		name: "quality",
		build() {},
		cleanup() {
			C();
			v();
			y();
			if (S !== null) clearInterval(S);
		}
	});
}
//#endregion
export { k as a, C as c, l as i, h as l, N as n, m as o, j as r, y as s, M as t, v as u };

//# sourceMappingURL=qualityRuntime.js.map