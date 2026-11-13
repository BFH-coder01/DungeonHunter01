import { $t as e, rn as t } from "./system.js";
import { s as n } from "./logger.js";
import { _ as r } from "./AssetPlugin.js";
import { t as i } from "./disposeAll.js";
import { i as a, n as o } from "./env.js";
import { r as s } from "./SpriteAnimator.js";
import { t as c } from "./TimelinePlayerComponent.js";
import { t as l } from "./AiContext.js";
//#region src/ai/fsm/Blackboard.ts
var u = class {
	constructor() {
		this.data = /* @__PURE__ */ new Map();
		this.triggers = /* @__PURE__ */ new Set();
	}
	get(e) {
		return this.data.get(e);
	}
	set(e, t) {
		this.data.set(e, t);
	}
	has(e) {
		return this.data.has(e);
	}
	delete(e) {
		this.data.delete(e);
	}
	/** Fire a one-shot event; a transition keyed on it becomes enabled until taken. */
	fire(e) {
		this.triggers.add(e);
	}
	isFired(e) {
		return this.triggers.has(e);
	}
	consume(e) {
		this.triggers.delete(e);
	}
	/** Drop all pending triggers (e.g. on reset). */
	clearTriggers() {
		this.triggers.clear();
	}
};
/** Evaluate one guard against the blackboard. Missing keys compare as undefined. */
function d(e, t) {
	const n = e.get(t.key);
	switch (t.op) {
		case "==": return n === t.value;
		case "!=": return n !== t.value;
		case "<": return p(n) < p(t.value);
		case "<=": return p(n) <= p(t.value);
		case ">": return p(n) > p(t.value);
		case ">=": return p(n) >= p(t.value);
		case "truthy": return !!n;
		case "falsy": return !n;
		default: return m(t.op);
	}
}
/** True when every guard passes (empty set → vacuously true). */
function f(e, t) {
	if (Array.isArray(t)) {
		for (const n of t) if (!d(e, n)) return false;
		return true;
	}
	return d(e, t);
}
function p(e) {
	return typeof e === "number" ? e : Number(e);
}
function m(e) {
	throw new Error(`unknown compare op: ${e}`);
}
//#endregion
//#region src/audio/AudioComponents.ts
const h = e("AudioSource", {
	clip: "",
	bus: "sfx",
	volume: 1,
	pitch: 1,
	loop: false,
	loopStart: 0,
	fadeIn: 0,
	fadeOut: 0,
	playing: false,
	finished: false,
	playOnAwake: false,
	spatial: false,
	minDistance: 100,
	maxDistance: 1e3,
	attenuationModel: 1,
	rolloff: 1,
	priority: 0,
	enabled: true
}, {
	assetFields: [{
		field: "clip",
		type: "audio"
	}],
	fields: {
		loopStart: {
			min: 0,
			step: .1,
			tooltip: "With Loop: seconds into the clip that it comes back to at its end, so an introduction plays once. 0 is the start."
		},
		fadeIn: {
			min: 0,
			step: .1,
			tooltip: "Seconds to come up to Volume when Playing is raised. 0 is at once."
		},
		fadeOut: {
			min: 0,
			step: .1,
			tooltip: "Seconds to go down to nothing when Playing is lowered; it stops after. 0 is at once."
		},
		playing: { tooltip: "Raise to play, lower to stop. The engine lowers it when a non-looping clip ends." },
		finished: {
			advanced: true,
			tooltip: "Clip completed (runtime, read-only). Raise Playing to play it again."
		}
	}
});
/** Trigger with triggerSoundEventSource or the soundEvent.trigger graph action. @beta */
const g = e("SoundEventSource", {
	event: "",
	seed: 0,
	playOnAwake: false,
	enabled: true
}, {
	assetFields: [{
		field: "event",
		type: "sound-event"
	}],
	fields: { seed: { tooltip: "Fixed 32-bit seed for this source selection stream." } }
});
const _ = e("AudioListener", { enabled: true });
//#endregion
//#region src/audio/SoundEventSource.ts
const v = /* @__PURE__ */ new WeakMap();
const y = 256;
/** Play one source intent, independently of other triggers in the same frame.
* While the definition loads, at most 256 intents per source wait in FIFO order.
* Returns null when unavailable, cancelled, overflowing, or the definition fails;
* otherwise the handle exposes event/global admission and clip-load results.
* @beta */
function b(e, t) {
	return v.get(e)?.trigger(t) ?? Promise.resolve(null);
}
/** Cancel this component's queued intents and voices, preserving other emitters on the entity. @beta */
function x(e, t) {
	v.get(e)?.stop(t);
}
/** @internal Per-world component adapter; playback, selection and budgets remain in SoundEvents. */
var S = class {
	constructor(e, t, n) {
		this.world = e;
		this.playback = t;
		this.audio = n;
		this.sources = /* @__PURE__ */ new Map();
		this.disposed = false;
		v.get(e)?.dispose();
		e.enableIncarnationTracking(g);
		v.set(e, this);
		this.offStop = n.onPlaybackStop((e) => {
			for (const t of this.sources.values()) this.cancelPending(t, e);
		});
	}
	trigger(e) {
		const t = this.source(e);
		if (!t) return Promise.resolve(null);
		t.awake = true;
		if (t.emitter && !t.emitter.disposed) return Promise.resolve(t.emitter.trigger());
		if (t.pending.length >= y) return Promise.resolve(null);
		const n = new Promise((e) => t.pending.push({
			generation: this.audio.playbackGeneration,
			resolve: e
		}));
		this.prepare(t);
		return n;
	}
	update() {
		if (this.disposed) return;
		for (const e of this.sources.values()) if (!this.current(e)) this.remove(e.entity);
		for (const e of this.world.getEntitiesWithComponents([g])) {
			if (!this.world.get(e, g).playOnAwake) continue;
			const t = this.source(e);
			if (t && !t.awake) {
				t.awake = true;
				this.trigger(e);
			}
		}
	}
	stop(e) {
		const t = this.source(e);
		if (!t) return;
		t.awake = true;
		this.cancelPending(t);
		t.epoch++;
		t.loading = false;
		const n = t.emitter;
		t.emitter = null;
		n?.dispose();
	}
	remove(e) {
		const t = this.sources.get(e);
		if (!t) return;
		this.sources.delete(e);
		this.cancelPending(t);
		t.epoch++;
		const n = t.emitter;
		t.emitter = null;
		n?.dispose();
	}
	reset() {
		if (this.sources.size) i([...this.sources.keys()], (e) => this.remove(e));
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		if (v.get(this.world) === this) v.delete(this.world);
		this.offStop();
		this.reset();
	}
	enabled(e) {
		return !this.disposed && (!o() || a()) && this.world.isEntityActive(e) && this.world.has(e, g) && this.world.get(e, g).enabled;
	}
	current(e) {
		if (this.sources.get(e.entity) !== e || !this.enabled(e.entity)) return false;
		const t = this.world.get(e.entity, g);
		return t.event === e.event && t.seed === e.seed && this.world.getComponentIncarnation(e.entity, g) === e.incarnation;
	}
	source(e) {
		let t = this.sources.get(e);
		if (t && !this.current(t)) {
			this.remove(e);
			t = void 0;
		}
		if (!this.enabled(e)) return null;
		const n = this.world.get(e, g);
		if (!n.event) return null;
		if (!t) {
			t = {
				entity: e,
				event: n.event,
				seed: n.seed,
				incarnation: this.world.getComponentIncarnation(e, g),
				awake: false,
				emitter: null,
				loading: false,
				epoch: 0,
				pending: []
			};
			this.sources.set(e, t);
		}
		return t;
	}
	cancelPending(e, t = Infinity) {
		const n = e.pending;
		e.pending = [];
		for (const r of n) if (r.generation < t) r.resolve(null);
		else e.pending.push(r);
	}
	prepare(e) {
		if (e.loading) return;
		e.loading = true;
		const t = e.epoch;
		const r = () => t === e.epoch && this.current(e);
		this.playback.load(e.event, {
			owner: e.entity,
			seed: e.seed,
			alive: r
		}).then((n) => {
			if (!r()) {
				n?.dispose();
				if (t === e.epoch && this.sources.get(e.entity) === e) this.remove(e.entity);
				return;
			}
			e.loading = false;
			e.emitter = n;
			const i = e.pending;
			e.pending = [];
			try {
				for (const e of i) e.resolve(e.generation === this.audio.playbackGeneration && r() && n ? n.trigger() : null);
			} finally {
				for (const e of i) e.resolve(null);
			}
		}).catch((t) => {
			if (!r()) return;
			e.loading = false;
			this.cancelPending(e);
			n.warn("audio", `SoundEventSource ${e.entity}: ${e.event}`, t);
		});
	}
};
//#endregion
//#region src/ecs/propertyPath.ts
function C(e, t) {
	const n = t.split(".");
	let r = e;
	for (const e of n) {
		if (r == null || typeof r !== "object") return void 0;
		r = r[e];
	}
	return r;
}
function w(e, t, n) {
	const r = t.split(".");
	let i = e;
	for (let e = 0; e < r.length - 1; e++) {
		i = i[r[e]];
		if (i == null || typeof i !== "object") return false;
	}
	const a = r[r.length - 1];
	if (!(a in i)) return false;
	i[a] = n;
	return true;
}
function T(e) {
	const t = e.indexOf(".");
	if (t === -1) return null;
	return {
		componentName: e.substring(0, t),
		fieldPath: e.substring(t + 1)
	};
}
function E(e, n, r) {
	const i = T(r);
	if (!i) return void 0;
	const a = t(i.componentName);
	if (!a || !e.has(n, a)) return void 0;
	return C(e.get(n, a), i.fieldPath);
}
function D(e, n, r, i) {
	const a = T(r);
	if (!a) return false;
	const o = t(a.componentName);
	if (!o || !e.has(n, o)) return false;
	const s = e.get(n, o);
	if (!w(s, a.fieldPath, i)) return false;
	e.insert(n, o, s);
	return true;
}
//#endregion
//#region src/ai/builtins.ts
/**
* @file    builtins.ts
* @brief   Engine-provided AI actions/conditions — code-free glue from
*          `.esfsm`/`.esbt` data to engine subsystems.
*
* Registered when the FSM/BT plugin builds, so the names show up in the editor
* palettes next to game-registered ones. Namespaced (`timeline.…`) to stay clear
* of game action names; a name already present in the registry is never
* overwritten, so game code wins regardless of registration order. Everything
* here speaks through components — the same channel game code and the editor
* use. Event-source verbs dispatch intents through their component adapter.
*/
const O = {
	reads: [c._name],
	writes: [c._name]
};
const k = {
	reads: [s._name],
	writes: [s._name]
};
const A = {
	reads: [h._name],
	writes: [h._name]
};
const j = { reads: [g._name] };
/** The one parameter the play verbs take: which clip, empty for the current one. */
const M = [{
	name: "clip",
	type: "string",
	tooltip: "Leave empty to replay the current one"
}];
/**
* Register the engine's built-in actions/conditions. Idempotent (and safe after
* an `aiRegistry.clear()`): each name registers only if absent.
*/
function N() {
	L("timeline.play", (e) => {
		if (!e.has(c)) return;
		const t = e.get(c);
		if (t.playing) return;
		t.playing = true;
		e.set(c, t);
	}, O);
	L("timeline.pause", (e) => {
		if (!e.has(c)) return;
		const t = e.get(c);
		if (!t.playing) return;
		t.playing = false;
		e.set(c, t);
	}, O);
	R("timeline.finished", (e) => {
		if (!e.has(c)) return false;
		const t = e.get(c);
		return t.finished && !t.playing;
	}, { reads: [c._name] });
	I("spriteAnim.play", s, k, (e, t) => {
		const n = !!t && t !== e.clip;
		if (!n && e.playing) return false;
		if (n) {
			e.clip = t;
			e.currentFrame = 0;
			e.frameTimer = 0;
			e.finished = false;
		}
		e.playing = true;
		return true;
	});
	I("spriteAnim.restart", s, k, (e, t) => {
		if (t) e.clip = t;
		e.currentFrame = 0;
		e.frameTimer = 0;
		e.finished = false;
		e.playing = true;
		return true;
	});
	L("spriteAnim.stop", (e) => {
		if (!e.has(s)) return;
		const t = e.get(s);
		if (!t.playing) return;
		t.playing = false;
		e.set(s, t);
	}, k);
	R("spriteAnim.finished", (e) => {
		if (!e.has(s)) return false;
		const t = e.get(s);
		return t.finished && !t.playing;
	}, { reads: [s._name] });
	I("audio.play", h, A, (e, t) => {
		const n = !!t && t !== e.clip;
		if (n) {
			e.clip = t;
			e.finished = false;
		}
		if (!n && e.playing) return false;
		e.playing = true;
		return true;
	});
	L("audio.stop", (e) => {
		if (!e.has(h)) return;
		const t = e.get(h);
		if (!t.playing) return;
		t.playing = false;
		e.set(h, t);
	}, A);
	L("soundEvent.trigger", (e) => {
		b(e.world, e.entity);
	}, j);
	L("soundEvent.stop", (e) => {
		x(e.world, e.entity);
	}, j);
	R("audio.finished", (e) => {
		if (!e.has(h)) return false;
		const t = e.get(h);
		return t.finished && !t.playing;
	}, { reads: [h._name] });
	if (!l.hasAction("property.set")) l.registerAction("property.set", {
		separator: "=",
		params: [
			{
				name: "path",
				type: "string",
				tooltip: "Component.field, e.g. UIVisual.color.a"
			},
			{
				name: "value",
				type: "string"
			},
			{
				name: "entity",
				type: "number",
				tooltip: "Leave empty for this entity"
			}
		],
		run: (e, t, n, r) => {
			const i = typeof r?.path === "string" ? r.path.trim() : "";
			const a = r?.value;
			if (!i || a === void 0) return;
			const o = Number(r?.entity ?? 0) || e.entity;
			D(e.world, o, i, F(a));
		},
		touches: (e) => {
			const t = P(e).split(".")[0];
			return t ? { writes: [t] } : { opaque: true };
		}
	});
}
/** `property.set`'s target path, from whichever form the reference carries: the
*  named parameter, or the canonical `path=value` string. */
function P(e) {
	const t = e.params?.path;
	if (typeof t === "string") return t.trim();
	return (e.arg ?? "").split("=")[0].trim();
}
/** A parameter's JSON reading when it has one; otherwise the value itself. */
function F(e) {
	if (typeof e !== "string") return e;
	try {
		return JSON.parse(e.trim());
	} catch {
		return e.trim();
	}
}
/**
* A `play`-shaped verb: one optional `clip` parameter, declared — which is what
* gives it an input pin in a graph instead of only a hand-typed `arg` — and a
* component edit that says whether anything changed.
*/
function I(e, t, n, r) {
	if (l.hasAction(e)) return;
	l.registerAction(e, {
		params: M,
		touches: n,
		run: (e, n, i, a) => {
			if (!e.has(t)) return;
			const o = e.get(t);
			if (r(o, typeof a?.clip === "string" ? a.clip.trim() : "")) e.set(t, o);
		}
	});
}
function L(e, t, n) {
	if (!l.hasAction(e)) l.registerAction(e, {
		run: t,
		touches: n
	});
}
function R(e, t, n) {
	if (!l.hasCondition(e)) l.registerCondition(e, {
		check: t,
		touches: n
	});
}
//#endregion
//#region src/ai/worldView.ts
/** Accumulates leaf claims into one system-level claim. */
var z = class {
	constructor() {
		this.reads = /* @__PURE__ */ new Set();
		this.writes = /* @__PURE__ */ new Set();
		this.unknown = false;
	}
	/** A leaf that declared. `undefined` is a leaf that did not — see `opaque`. */
	add(e) {
		if (!e) {
			this.unknown = true;
			return this;
		}
		for (const t of e.reads ?? []) this.reads.add(t);
		for (const t of e.writes ?? []) this.writes.add(t);
		if (e.opaque) this.unknown = true;
		return this;
	}
	/** Access the system has regardless of the data — the agent component itself. */
	reading(...e) {
		for (const t of e) this.reads.add(t);
		return this;
	}
	writing(...e) {
		for (const t of e) this.writes.add(t);
		return this;
	}
	build() {
		return {
			reads: [...this.reads].sort(),
			writes: [...this.writes].sort(),
			...this.unknown ? { opaque: true } : {}
		};
	}
};
/** Fold every leaf of every loaded graph into one claim. */
function B(e, t, n = new z()) {
	for (const r of t) if (r.kind === "action") {
		if (!e.hasAction(r.name)) continue;
		n.add(e.actionTouches(r.name, r.input));
	} else {
		if (!e.hasCondition(r.name)) continue;
		n.add(e.conditionTouches(r.name));
	}
	return n;
}
//#endregion
export { S as a, _ as c, u as d, d as f, E as i, h as l, B as n, x as o, f as p, N as r, b as s, z as t, g as u };

//# sourceMappingURL=worldView.js.map