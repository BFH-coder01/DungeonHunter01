import { c as e, dt as t, n, qt as r, rn as i } from "./system.js";
import { s as a } from "./resource.js";
import { s as o } from "./logger.js";
import { i as s, o as c, x as l } from "./components.js";
//#region src/runtime/bakes.ts
/** Who asks when a caller names nobody: every such caller is one owner, and shares one turn. */
const u = {};
/** The jobs an App is running. Read {@link Bakes.active} for what to show. */
var d = class {
	constructor() {
		this.budgetMs = 8;
		this.priorityExtraMs = 12;
		this.left_ = 0;
		this.turns_ = /* @__PURE__ */ new Map();
		this.waiting_ = /* @__PURE__ */ new Set();
		this.open_ = null;
		this.piece_ = /* @__PURE__ */ new WeakMap();
		this.urgent_ = /* @__PURE__ */ new Set();
		this.clock_ = () => performance.now();
		this.starved_ = false;
		this.starvedBefore_ = false;
		this.running_ = /* @__PURE__ */ new Set();
		this.marks_ = /* @__PURE__ */ new Map();
	}
	/**
	* Runs `job` over the frames to come, under `label`; the promise is what it returns. A job that is cancelled (see `cancel`)
	* never settles.
	*/
	run(e, t) {
		let n;
		const r = new Promise((r, i) => {
			n = {
				label: e,
				progress: 0,
				job: t,
				done: r,
				fail: i
			};
		});
		this.running_.add(n);
		return {
			done: r,
			cancel: () => {
				this.running_.delete(n);
			}
		};
	}
	/**
	* Shows work that is stepped elsewhere (pages made a few a frame) under `label` while `progress` is below 1; `owner` names it,
	* so a later mark replaces it. Mark it 1, or `clear` it, when it is done.
	*/
	mark(e, t, n) {
		if (n >= 1) this.marks_.delete(e);
		else this.marks_.set(e, {
			label: t,
			progress: Math.max(0, n)
		});
	}
	clear(e) {
		this.marks_.delete(e);
		this.urgent_.delete(e);
	}
	/** Every piece of work in hand now. Empty when the engine is idle. */
	get active() {
		const e = [];
		for (const t of this.running_) e.push({
			label: t.label,
			progress: t.progress
		});
		for (const t of this.marks_.values()) e.push({
			label: t.label,
			progress: t.progress
		});
		return e;
	}
	/**
	* Whether `owner`'s work stepped elsewhere may go on this frame. Such work does what it must at once (what stands right by the
	* player) whatever this says, and stops when it says no; saying no is remembered, so the jobs leave it more of the next frame.
	*
	* The first time an owner asks in a frame it is given its part: what the frame has left, divided among it and those that asked
	* the frame before and have not had their turn yet. An owner that asks alone has all of it.
	*/
	hasTime(e = u) {
		const t = this.clock_();
		let n = this.turns_.get(e);
		if (!n) {
			if (this.open_) this.left_ -= this.open_.last - this.open_.start;
			this.waiting_.delete(e);
			n = {
				start: t,
				last: t,
				allowance: Math.max(0, this.left_) / (this.waiting_.size + 1)
			};
			this.turns_.set(e, n);
			this.open_ = n;
		} else {
			const r = t - n.last;
			const i = this.piece_.get(e);
			this.piece_.set(e, i === void 0 ? r : Math.max(r, i * .9));
		}
		const r = n.last === n.start && t === n.start;
		n.last = t;
		if (r ? n.allowance > 0 : t - n.start + (this.piece_.get(e) ?? 0) <= n.allowance) return true;
		this.starved_ = true;
		return false;
	}
	/**
	* Says whether what `owner` still has to do would be seen missing by the player: the chunk they stand in, the ground under them.
	* While any owner says so the frame's budget is larger by `priorityExtraMs`. Say false when it is done, or it is held for good.
	*/
	urge(e, t) {
		if (t) this.urgent_.add(e);
		else this.urgent_.delete(e);
	}
	/** Whether something the player would see missing is still being made: what a loading screen waits for. */
	get urgent() {
		return this.urgent_.size > 0;
	}
	/** What this frame may spend: the steady budget, and the extra while something urgent is outstanding. */
	get frameBudgetMs() {
		return this.budgetMs + (this.urgent_.size > 0 ? this.priorityExtraMs : 0);
	}
	/** Starts the frame's budget and steps the jobs for their part of it, oldest first; a job that finishes or throws settles its promise. */
	step(e = () => performance.now()) {
		this.clock_ = e;
		this.starvedBefore_ = this.starved_;
		this.starved_ = false;
		const t = e();
		const n = this.frameBudgetMs;
		this.waiting_ = new Set(this.turns_.keys());
		this.turns_.clear();
		this.open_ = null;
		this.left_ = n;
		if (this.running_.size === 0) return;
		const r = t + (this.starvedBefore_ ? n / 2 : n);
		for (const t of [...this.running_]) {
			do {
				let e;
				try {
					e = t.job.next();
				} catch (e) {
					this.running_.delete(t);
					t.fail(e);
					break;
				}
				if (e.done) {
					this.running_.delete(t);
					t.done(e.value);
					break;
				}
				t.progress = Math.min(Math.max(e.value, 0), 1);
			} while (e() < r);
			if (e() >= r) break;
		}
		this.left_ = n - (e() - t);
	}
};
/** The resource; {@link bakesOf} installs it where it is missing. @experimental */
const f = a(new d(), "Bakes");
/** The App's jobs, installed (with the system that steps them, before Update) on first use, so a plugin that bakes needs nothing else. */
function p(t) {
	if (!t.hasResource(f)) {
		const n = new d();
		t.insertResource(f, n);
		t.addSystemToSchedule(2, e([], () => n.step(), { name: "BakeSystem" }));
	}
	return t.getResource(f);
}
/** Runs a job to its end at once, for a caller with no frames to spread it over (a test, a tool). */
function m(e) {
	for (;;) {
		const t = e.next();
		if (t.done) return t.value;
	}
}
//#endregion
//#region src/util/abort.ts
var h = class {
	constructor() {
		this.aborted = false;
		this.reason = void 0;
		this.onabort = null;
		this.listeners_ = [];
	}
	addEventListener(e, t) {
		if (e === "abort") this.listeners_.push(t);
	}
	removeEventListener(e, t) {
		if (e !== "abort") return;
		const n = this.listeners_.indexOf(t);
		if (n >= 0) this.listeners_.splice(n, 1);
	}
	throwIfAborted() {
		if (this.aborted) throw this.reason;
	}
	fire(e) {
		if (this.aborted) return;
		this.aborted = true;
		this.reason = e ?? Object.assign(/* @__PURE__ */ new Error("This operation was aborted"), { name: "AbortError" });
		const t = { type: "abort" };
		this.onabort?.(t);
		for (const e of this.listeners_.slice()) e(t);
	}
};
function g() {
	if (typeof AbortController !== "undefined") return new AbortController();
	const e = new h();
	return {
		signal: e,
		abort: (t) => e.fire(t)
	};
}
//#endregion
//#region src/residency/chunks.ts
/**
* @file    chunks.ts
* @brief   The one owner of procedural chunks: what is made round the streaming sources, in what order, within the frame's budget,
*          and when it is let go.
*
* @details A cooked world's cells are scenes, brought in by the WorldStreamer. What a game makes as it runs (the ground's collision
*          round what moves, plants round the eye, and later what stands in a biome) is chunks of layers, and this is the single
*          author of their lifetime, as the streamer is of cells. A layer says how it is cut, how far round its sources it is wanted
*          and how one chunk is made, published and released; the layer never decides on its own that a chunk exists.
*
*            - Every frame the chunks within a layer's load radius of a source are wanted, nearest first across every layer; the
*              ones a source stands in are made at once, the rest while the frame's budget (Bakes) lasts.
*            - A chunk past every source's unload radius is released: whatever it published (meshes, colliders, entities) goes with
*              it, so a source walking for ever holds a bounded number of chunks.
*            - A layer's `generation` names its inputs. When it changes every chunk is made again; until a chunk's new version is
*              published its old one stays, so nothing standing on it falls, and an answer that arrives for an older generation (a
*              provider still working on the planet just left) is thrown away, never published.
*            - A chunk whose making throws is failed until the generation changes, and says why.
*/
/**
* How far a source may move, as a share of a cell, before the cells round it are walked again. The walk is every cell within the
* larger radius, each with a key and a distance, and then every one of them asked whether it is made: 9 ms a frame for six fields
* of 8 m cells reaching 260 m, with the camera standing still and nothing left to make. A source that has not left its cell and
* has moved less than this is where it was; and a layer with every chunk it wants made, for the generation it is at, is not asked.
*/
const _ = 1 / 16;
/** At most this many chunks of a layer are answered later at once. */
const v = 16;
const y = (e, t) => `${e},${t}`;
/** What a published chunk's generation is set to when it is made out of date by hand: no layer's generation. */
const b = Symbol("outdated");
/** The procedural chunks of every layer. Read {@link ProceduralChunks.status} for where they stand. */
var x = class {
	constructor() {
		this.layers_ = /* @__PURE__ */ new Map();
		this.sources_ = () => [];
		this.suspended = false;
	}
	/** Adds a layer under `id`, or takes the new definition of one already there (its chunks stay and follow the new generation). */
	set(e, t) {
		const n = this.layers_.get(e);
		if (n) n.def = t;
		else this.layers_.set(e, {
			def: t,
			chunks: /* @__PURE__ */ new Map(),
			wanted: /* @__PURE__ */ new Set()
		});
	}
	/** Takes a layer away, releasing every chunk it published and stopping what is being made. */
	remove(e) {
		const t = this.layers_.get(e);
		if (!t) return;
		for (const e of t.chunks.values()) this.drop(t, e);
		this.layers_.delete(e);
	}
	has(e) {
		return this.layers_.has(e);
	}
	/** Where the chunk of layer `id` at world (x, z) (x, y on an 'xy' layer) stands, or null when it is not wanted, not made, or there is no such layer. */
	stateAt(e, t, n) {
		const r = this.layers_.get(e);
		if (!r) return null;
		const i = r.def;
		const a = r.chunks.get(y(Math.floor((t - i.originX) / i.sizeX), Math.floor((n - i.originZ) / i.sizeZ)));
		return a ? C(a, i.generation) : null;
	}
	/** Layer `id`'s chunks counted, or null when there is no such layer. */
	status(e) {
		const t = this.layers_.get(e);
		if (!t) return null;
		const n = {
			ready: 0,
			stale: 0,
			pending: S(t),
			making: 0,
			failed: 0
		};
		for (const e of t.chunks.values()) {
			if (e.making) n.making++;
			if (C(e, t.def.generation) === "failed") {
				n.failed++;
				n.reason ??= e.reason;
			}
			if (e.value !== null) if (e.publishedFor === t.def.generation) n.ready++;
			else n.stale++;
		}
		return n;
	}
	/** How many chunks every layer still wants made. */
	get pending() {
		let e = 0;
		for (const t of this.layers_.values()) e += S(t);
		return e;
	}
	/**
	* Makes the published chunks of layer `id` that touch the world square [x0, x1] by [z0, z1] again, each keeping its old version
	* until the new one replaces it: what changed there (a zone, a felled tree) changed only them.
	*/
	invalidate(e, t, n, r, i) {
		const a = this.layers_.get(e);
		if (!a) return;
		const o = a.def;
		const s = Math.floor((t - o.originX) / o.sizeX), c = Math.floor((r - o.originX) / o.sizeX);
		const l = Math.floor((n - o.originZ) / o.sizeZ), u = Math.floor((i - o.originZ) / o.sizeZ);
		if (a.walk) a.walk.settledFor = void 0;
		for (const e of a.chunks.values()) {
			if (e.cx < s || e.cx > c || e.cz < l || e.cz > u) continue;
			if (e.value !== null) e.publishedFor = b;
			e.failedFor = null;
			e.making?.abort.abort();
			e.making = null;
		}
	}
	/** Lets go of every chunk of every layer. */
	clear() {
		for (const e of [...this.layers_.keys()]) this.remove(e);
	}
	/**
	* One frame: releases what no source is near, then makes what is wanted, nearest first across every layer: the chunks a source
	* stands in at once, and the rest while `hasTime` says so (an `async` layer's, all of them).
	*/
	step(e) {
		const t = this.suspended ? [] : this.sources_();
		const n = [];
		for (const e of this.layers_.values()) {
			const r = e.def;
			const i = r.sources ? [...r.sources()] : r.plane === "xy" ? t.map((e) => ({
				x: e.x,
				z: e.y ?? 0
			})) : t;
			const a = `${r.loadRadius},${r.unloadRadius},${r.sizeX},${r.sizeZ},${r.originX},${r.originZ},${r.extent ? r.extent.join(",") : ""}`;
			const o = Math.min(r.sizeX, r.sizeZ) * _;
			const s = e.walk;
			const c = s !== void 0 && s.from === a && s.at.length === i.length && i.every((e, t) => {
				const n = s.at[t];
				return Math.abs(e.x - n.x) <= o && Math.abs(e.z - n.z) <= o && Math.floor((e.x - r.originX) / r.sizeX) === Math.floor((n.x - r.originX) / r.sizeX) && Math.floor((e.z - r.originZ) / r.sizeZ) === Math.floor((n.z - r.originZ) / r.sizeZ);
			});
			const l = c ? s.near : /* @__PURE__ */ new Map();
			const u = c ? s.keep : /* @__PURE__ */ new Set();
			if (c && s.settledFor === r.generation) continue;
			if (!c) e.walk = {
				from: a,
				at: i.map((e) => ({
					x: e.x,
					z: e.z
				})),
				near: l,
				keep: u
			};
			for (const e of c ? [] : i) {
				const t = Math.max(r.loadRadius, r.unloadRadius);
				const n = Math.floor((e.x - t - r.originX) / r.sizeX), i = Math.floor((e.x + t - r.originX) / r.sizeX);
				const a = Math.floor((e.z - t - r.originZ) / r.sizeZ), o = Math.floor((e.z + t - r.originZ) / r.sizeZ);
				const s = r.extent;
				const c = s ? Math.max(n, s[0]) : n, d = s ? Math.min(i, s[2] - 1) : i;
				const f = s ? Math.max(a, s[1]) : a, p = s ? Math.min(o, s[3] - 1) : o;
				for (let t = f; t <= p; t++) for (let n = c; n <= d; n++) {
					const i = r.originX + n * r.sizeX, a = r.originZ + t * r.sizeZ;
					const o = Math.hypot(Math.max(i - e.x, 0, e.x - i - r.sizeX), Math.max(a - e.z, 0, e.z - a - r.sizeZ));
					const s = y(n, t);
					if (o <= r.unloadRadius) u.add(s);
					if (o <= r.loadRadius && o < (l.get(s) ?? Infinity)) l.set(s, o);
				}
			}
			for (const [t, n] of e.chunks) {
				if (l.has(t) || u.has(t)) continue;
				this.drop(e, n);
				e.chunks.delete(t);
			}
			if (!c) e.wanted = new Set(l.keys());
			let d = false;
			for (const [t, i] of l) {
				const a = e.chunks.get(t);
				const o = a ? C(a, r.generation) : null;
				if (a?.making) d = true;
				if (o === "ready" || o === "failed" || a?.making) continue;
				const [s, c] = t.split(",").map(Number);
				n.push({
					layer: e,
					cx: s,
					cz: c,
					dist: i
				});
				d = true;
			}
			e.walk.settledFor = d ? void 0 : r.generation;
		}
		n.sort((e, t) => e.dist - t.dist);
		const r = /* @__PURE__ */ new Map();
		for (const e of this.layers_.values()) {
			let t = 0;
			for (const n of e.chunks.values()) if (n.making) t++;
			r.set(e, t);
		}
		let i = false;
		let a = false;
		for (const t of n) {
			if (t.dist > 0 && !t.layer.def.async && (a || (a = !e()))) {
				if (t.dist <= Math.max(t.layer.def.sizeX, t.layer.def.sizeZ)) i = true;
				continue;
			}
			if ((r.get(t.layer) ?? 0) >= v) continue;
			if (this.make(t.layer, t.cx, t.cz)) r.set(t.layer, (r.get(t.layer) ?? 0) + 1);
		}
		return i;
	}
	/** Makes one chunk; true when it is now being answered later. */
	make(e, t, n) {
		const r = y(t, n);
		let i = e.chunks.get(r);
		if (!i) {
			i = {
				cx: t,
				cz: n,
				value: null,
				publishedFor: null,
				making: null,
				failedFor: null
			};
			e.chunks.set(r, i);
		}
		const a = i;
		const o = e.def.generation;
		const s = g();
		let c;
		try {
			c = e.def.make(t, n, s.signal);
		} catch (t) {
			this.fail(e, a, o, t);
			return false;
		}
		if (!(c instanceof Promise)) {
			if (c !== null) this.publish(e, a, c, o);
			else if (a.value === null) e.chunks.delete(r);
			return false;
		}
		a.making = {
			generation: o,
			abort: s
		};
		c.then((t) => {
			if (a.making?.abort !== s || s.signal.aborted) return;
			a.making = null;
			if (e.chunks.get(r) !== a || o !== e.def.generation) return;
			if (t !== null) this.publish(e, a, t, o);
		}, (t) => {
			if (a.making?.abort !== s || s.signal.aborted) return;
			a.making = null;
			if (o === e.def.generation) this.fail(e, a, o, t);
		});
		return true;
	}
	publish(e, t, n, r) {
		if (t.value !== null) e.def.release(t.cx, t.cz, t.value);
		t.value = n;
		t.publishedFor = r;
		t.failedFor = null;
		t.reason = void 0;
		e.def.publish(t.cx, t.cz, n);
	}
	fail(e, t, n, r) {
		t.failedFor = n;
		t.reason = r instanceof Error ? r.message : String(r);
		o.error("chunks", `making chunk ${t.cx},${t.cz} of ${e.def.label} failed`, r);
	}
	/** Releases what a chunk published and stops what it is making. */
	drop(e, t) {
		t.making?.abort.abort();
		t.making = null;
		if (t.value !== null) e.def.release(t.cx, t.cz, t.value);
		t.value = null;
		t.publishedFor = null;
	}
	/** @internal The labels and progress of the layers still making chunks, for the bakes list. */
	progress_() {
		const e = [];
		for (const t of this.layers_.values()) {
			const n = S(t);
			if (n === 0) continue;
			const r = t.wanted.size - n;
			e.push({
				label: t.def.label,
				progress: r / t.wanted.size,
				owner: t
			});
		}
		return e;
	}
};
/** The wanted chunks not yet published for the generation now (nor failed for it). */
function S(e) {
	let t = 0;
	for (const n of e.wanted) {
		const r = e.chunks.get(n);
		const i = r ? C(r, e.def.generation) : null;
		if (i !== "ready" && i !== "failed") t++;
	}
	return t;
}
function C(e, t) {
	if (e.failedFor === t) return "failed";
	if (e.value !== null) return e.publishedFor === t ? "ready" : "stale";
	return "making";
}
/** The resource; {@link chunksOf} installs it where it is missing. @experimental */
const w = a(new x(), "ProceduralChunks");
function T(e) {
	const n = e.world;
	if (e.hasResource(c)) {
		const t = l(e.getResource(c));
		if (t) return [{
			x: t.x,
			y: t.y,
			z: t.z
		}];
	}
	n.ensureTransformsComposed();
	const i = [];
	for (const e of n.getEntitiesWithComponents([s, r])) {
		if (!n.get(e, s).enabled) continue;
		const t = n.get(e, r).worldPosition;
		i.push({
			x: t.x,
			y: t.y,
			z: t.z
		});
	}
	if (i.length > 0) return i;
	for (const e of n.getEntitiesWithComponents([t, r])) {
		if (!n.get(e, t).isActive) continue;
		const a = n.get(e, r).worldPosition;
		i.push({
			x: a.x,
			y: a.y,
			z: a.z
		});
	}
	return i;
}
/** The App's procedural chunks, installed (with the system that steps them, after Update) on first use. */
function E(t) {
	if (!t.hasResource(w)) {
		const n = new x();
		n.sources_ = () => T(t);
		t.insertResource(w, n);
		const r = p(t);
		const i = /* @__PURE__ */ new Set();
		t.addSystemToSchedule(4, e([], () => {
			t.measureFrameScope("chunks.step", () => r.urge(n, n.step(() => r.hasTime(n))));
			const e = /* @__PURE__ */ new Set();
			for (const t of n.progress_()) {
				r.mark(t.owner, t.label, t.progress);
				e.add(t.owner);
			}
			for (const t of i) if (!e.has(t)) r.clear(t);
			i.clear();
			for (const t of e) i.add(t);
		}, { name: "ProceduralChunkSystem" }));
	}
	return t.getResource(w);
}
//#endregion
//#region src/terrain/movers.ts
/** Where what collides with the ground is: every moving 3D body and every character. */
function D(e) {
	const t = e.world;
	t.ensureTransformsComposed();
	const n = [];
	const a = i("RigidBody3D"), o = i("CharacterController3D");
	if (a) for (const e of t.getEntitiesWithComponents([a, r])) {
		const i = t.get(e, a);
		if (!i.enabled || i.bodyType === 0) continue;
		const o = t.get(e, r).worldPosition;
		n.push({
			x: o.x,
			y: o.y,
			z: o.z
		});
	}
	if (o) for (const e of t.getEntitiesWithComponents([o, r])) {
		const i = t.get(e, r).worldPosition;
		n.push({
			x: i.x,
			y: i.y,
			z: i.z
		});
	}
	return n;
}
//#endregion
export { T as a, p as c, E as i, m as l, x as n, d as o, w as r, f as s, D as t };

//# sourceMappingURL=movers.js.map