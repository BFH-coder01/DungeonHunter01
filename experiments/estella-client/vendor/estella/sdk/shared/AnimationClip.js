import { Zn as e, c as t, n, rn as r, zt as i } from "./system.js";
import { i as a, s as o, t as s } from "./resource.js";
import { s as c } from "./logger.js";
import { i as l, n as u } from "./AssetPlugin.js";
import { s as d } from "./env.js";
import { r as f } from "./SpriteAnimator.js";
import { W as p, r as m } from "./Animator.js";
import { t as h } from "./quat.js";
import { a as g, i as _, n as ee, o as te, r as ne, s as re, t as v } from "./TimelinePlayerComponent.js";
import { a as y, n as b } from "./CameraDirector.js";
//#region src/math/keyframes.ts
/**
* @file    keyframes.ts
* @brief   A curve as authored: keys, tangents, and the one function that samples them.
*
* There were two curves. A timeline channel had tangents and six interpolations and an
* editor that could draw it; a particle's size-over-life had `{t, v}` pairs, straight
* lines, and no way to author one at all. Nothing about "a value that changes over a
* span" is particular to either, so the shape and the sampler live here and both ask.
*
* Where `time` runs is the caller's: seconds for a timeline, 0..1 of a particle's life.
*
* @copyright Copyright (c) 2026 ESEngine Team
*            Licensed under the Apache License, Version 2.0.
*/
/** How a key reaches the NEXT one. Set per key, so one curve can mix them. */
const x = {
	Hermite: "hermite",
	Linear: "linear",
	Step: "step",
	EaseIn: "easeIn",
	EaseOut: "easeOut",
	EaseInOut: "easeInOut"
};
function ie(e, t, n, r, i) {
	const a = i * i;
	const o = a * i;
	const s = 2 * o - 3 * a + 1;
	const c = o - 2 * a + i;
	const l = -2 * o + 3 * a;
	const u = o - a;
	return s * e + c * n + l * t + u * r;
}
function ae(e) {
	return e * e;
}
function oe(e) {
	return 1 - (1 - e) * (1 - e);
}
function se(e) {
	return e < .5 ? 2 * e * e : 1 - 2 * (1 - e) * (1 - e);
}
/**
* @brief The value @p keys hold at @p at. Endpoints CLAMP — a curve states what it
*        states and nothing beyond, which is what lets a caller sample any time.
*
* @details Keys are expected in ascending time; an empty curve is 0 and a single key is
*          that key everywhere. Hermite is the default: a key states tangents, so
*          ignoring them would be a silent straight line.
*/
function S(e, t) {
	if (!e || e.length === 0) return 0;
	if (e.length === 1) return e[0].value;
	if (t <= e[0].time) return e[0].value;
	if (t >= e[e.length - 1].time) return e[e.length - 1].value;
	let n = 0;
	while (n < e.length - 1 && e[n + 1].time <= t) n++;
	const r = e[n];
	const i = e[n + 1];
	const a = i.time - r.time;
	if (a <= 0) return r.value;
	const o = (t - r.time) / a;
	switch (r.interpolation) {
		case x.Linear: return r.value + (i.value - r.value) * o;
		case x.Step: return r.value;
		case x.EaseIn: return r.value + (i.value - r.value) * ae(o);
		case x.EaseOut: return r.value + (i.value - r.value) * oe(o);
		case x.EaseInOut: return r.value + (i.value - r.value) * se(o);
		case x.Hermite:
		default: return ie(r.value, i.value, r.outTangent * a, i.inTangent * a, o);
	}
}
/** A key at @p time with straight lines either side — what a hand-written curve wants. */
function ce(e, t) {
	return {
		time: e,
		value: t,
		inTangent: 0,
		outTangent: 0,
		interpolation: x.Linear
	};
}
//#endregion
//#region src/timeline/TimelineRuntime.ts
/**
* Shared timeline runtime helpers. The timeline is a
* pure-TS runtime now (see TimelineDrive); this module holds the pieces shared by
* the drive and the editor: child-entity resolution, nested-path writes, and the
* event dispatcher.
*/
const C = {
	SpinePlay: 0,
	SpineStop: 1,
	SpriteAnimPlay: 2,
	AudioPlay: 3,
	ActivationSet: 4,
	ParticleAction: 5
};
function le(e, t, n) {
	const r = t.split(".");
	let i = e;
	for (let e = 0; e < r.length - 1; e++) {
		i = i[r[e]];
		if (i == null || typeof i !== "object") return false;
	}
	const a = r[r.length - 1];
	if (!(a in i)) return false;
	i[a] = typeof i[a] === "boolean" ? n !== 0 : n;
	return true;
}
function w(e, t, n, a, o, s, c, l) {
	switch (n) {
		case C.ParticleAction:
			if (c === "play") {
				l?.reset(a);
				l?.play(a);
			} else if (c === "stop") l?.stop(a);
			else if (c === "reset") l?.reset(a);
			break;
		case C.SpinePlay:
			if (e.has(a, i)) {
				const t = e.get(a, i);
				t.animation = c;
				t.playing = true;
				t.loop = o !== 0;
				e.set(a, i, t);
			}
			break;
		case C.SpineStop:
			if (e.has(a, i)) {
				const t = e.get(a, i);
				t.playing = false;
				e.set(a, i, t);
			}
			break;
		case C.SpriteAnimPlay:
			if (e.has(a, f)) {
				const t = e.get(a, f);
				e.insert(a, f, {
					...t,
					clip: c,
					playing: true
				});
			}
			break;
		case C.AudioPlay:
			if (c && t) t.playSFX(c, { volume: s });
			break;
		case C.ActivationSet: {
			const t = o !== 0;
			if (e.has(a, i)) {
				const n = e.get(a, i);
				if (n.enabled !== t) {
					n.enabled = t;
					e.set(a, i, n);
				}
			}
			if (e.has(a, f)) {
				const n = e.get(a, f);
				if (n.enabled !== t) e.insert(a, f, {
					...n,
					enabled: t
				});
			}
			const n = r("Sprite");
			if (n && e.has(a, n)) {
				const r = e.get(a, n);
				if (r.enabled !== t) e.set(a, n, {
					...r,
					enabled: t
				});
			}
			const s = r("UINode");
			if (s && e.has(a, s)) {
				const n = e.get(a, s);
				const r = t ? 0 : 1;
				if (n.display !== r) e.insert(a, s, {
					...n,
					display: r
				});
			}
			break;
		}
	}
}
//#endregion
//#region src/timeline/TimelineEvaluator.ts
/**
* @file    TimelineEvaluator.ts
* @brief   Pure-TS timeline sampler — evaluate a TimelineAsset at an absolute
*          time and apply its property tracks to the world.
*
* The engine's C++ TimelineSystem is a temporary implementation. This is the
* modern replacement's kernel: ONE
* sample(time) call drives both forward playback (advance the clock, then sample)
* and editor scrubbing (sample at any T) — so the editor gets "scrub ==
* evaluate-at-T" for free, with no separate evaluate/apply paths.
*
* The interpolation math is a 1:1 port of TimelineSystem.cpp::evaluateChannel
* (hermite/linear/step/ease) so playback and editor preview match the C++ path
* numerically, and P4 can delete the C++ runtime with no regression.
*
* The sampler is dependency-injected (world / component lookup / child resolution)
* so it is a pure function: unit-testable without WASM and reusable by both the
* runtime and the editor preview bridge.
*/
const ue = 180 / Math.PI;
/** Evaluate a single property channel at `time` (seconds). Endpoints clamp. */
function T(e, t) {
	return S(e.keyframes, t);
}
/** Map an absolute time through the clip's wrap mode (for forward playback). */
function E(e, t, n) {
	if (t <= 0) return {
		time: 0,
		stopped: true
	};
	if (e < 0) return {
		time: 0,
		stopped: false
	};
	if (e < t) return {
		time: e,
		stopped: false
	};
	switch (n) {
		case g.Loop: return {
			time: e % t,
			stopped: false
		};
		case g.PingPong: {
			const n = t * 2;
			const r = e % n;
			return {
				time: r <= t ? r : n - r,
				stopped: false
			};
		}
		case g.Once:
		default: return {
			time: t,
			stopped: true
		};
	}
}
/**
* Per-field writers for animatable paths whose JS shape differs from the raw
* dot-path, so a generic `setNestedProperty` would corrupt them.
*
* `rotation.angle` is the Z turn in radians, and it COMPOSES: the other two axes
* survive it, so a clip turning a model about Z cannot flatten its pose. The
* four components are written raw, normalized in {@link finishQuaternions}.
*/
const de = { "Transform.rotation.angle": (e, t) => {
	e.rotation = h.setAngleZ(e.rotation, t * ue);
} };
/** Component fields written component-wise that must end up unit length. */
const fe = { Transform: ["rotation"] };
/**
* Renormalize any quaternion a track wrote component-wise. Interpolating the
* four numbers independently lands INSIDE the unit sphere — about 0.92 halfway
* between two rotations 90° apart — and writing that scales the object.
* Normalized it traces the arc slerp would, differing only in angular speed.
*/
function D(e, t, n) {
	for (const r of fe[t] ?? []) {
		if (!n.has(r)) continue;
		e[r] = h.normalize(e[r]);
	}
}
function pe(e, t, n, r) {
	const i = de[`${t}.${n}`];
	if (i) {
		i(e, r);
		return true;
	}
	return le(e, n, r);
}
/**
* Whether a channel states the placement of the entity the clip is played ON —
* the whole of root motion: a channel aimed at a child poses a bone, one aimed at
* nothing says where the character travels. Read by both the sampler that leaves
* these out of the pose and the extractor, so the two cannot disagree.
*/
function O(e, t, n) {
	return e === "" && t === "Transform" && (n.startsWith("position") || n.startsWith("rotation"));
}
/** A placement holder to sample into; the base is neutral, see below. */
function k() {
	return {
		position: {
			x: 0,
			y: 0,
			z: 0
		},
		rotation: {
			w: 1,
			x: 0,
			y: 0,
			z: 0
		}
	};
}
function me(e) {
	e.position.x = 0;
	e.position.y = 0;
	e.position.z = 0;
	e.rotation = {
		w: 1,
		x: 0,
		y: 0,
		z: 0
	};
}
/**
* The root placement `asset` states at `time`, into `out`. Over a NEUTRAL base:
* two of these are only ever subtracted, so the entity's own values would cancel
* anyway while making the answer depend on where the character stood.
*
* False when the clip states no root track — not the same as one holding still.
*/
function A(e, t, n) {
	me(n);
	let r = false;
	for (const i of e.tracks) {
		if (i.type !== _.Property) continue;
		if (i.childPath !== "" || i.component !== "Transform") continue;
		const e = /* @__PURE__ */ new Set();
		for (const r of i.channels) {
			if (!r.keyframes || r.keyframes.length === 0) continue;
			if (!O(i.childPath, i.component, r.property)) continue;
			if (pe(n, "Transform", r.property, T(r, t))) e.add(r.property.split(".")[0]);
		}
		if (e.size > 0) {
			D(n, "Transform", e);
			r = true;
		}
	}
	return r;
}
/** The sink that writes the world directly. */
function he(e) {
	return {
		open: (t, n) => e.has(t, n) ? e.get(t, n) : null,
		close: (t, n, r) => {
			e.set(t, n, r);
		}
	};
}
/** The sink that records into a pose for later composition. */
function ge(e, t) {
	let n = null;
	return {
		open: (r, i) => {
			n = e.track(t, r, i);
			return n?.data ?? null;
		},
		close: (e, t, r, i) => {
			if (!n) return;
			for (const e of i) n.touched.add(e);
			n = null;
		}
	};
}
/**
* Evaluate every property track at `time` into `sink`. Property tracks only —
* spine, audio, spriteAnim and activation carry side effects a sink cannot hold.
* Each track touches one component on one entity, so it opens that component
* once and folds every channel into a single write.
*/
function j(e, t, n, r, i, a) {
	for (const o of e.tracks) {
		if (o.type !== _.Property) continue;
		const e = r.getComponent(o.component);
		if (!e) continue;
		const s = r.resolveChild(n, o.childPath);
		if (s == null) continue;
		const c = i.open(s, e);
		if (!c) continue;
		let l = false;
		const u = /* @__PURE__ */ new Set();
		for (const e of o.channels) {
			if (!e.keyframes || e.keyframes.length === 0) continue;
			if (a?.skipChannel?.(o.childPath, o.component, e.property)) continue;
			const n = T(e, t);
			if (pe(c, o.component, e.property, n)) {
				l = true;
				u.add(e.property.split(".")[0]);
			}
		}
		if (l) {
			D(c, o.component, u);
			i.close(s, e, c, u);
		}
	}
}
/** Evaluate every property track at `time` and write the results to the world. */
function M(e, t, n, r, i) {
	j(e, t, n, r, he(r.world), i);
}
/**
* Evaluate every property track at `time` into `pose`, touching no component.
* What a motion says, held apart from what the entity becomes.
*/
function _e(e, t, n, r, i, a) {
	j(e, t, n, r, ge(i, r.world), a);
}
/**
* Convenience wrapper binding the real SDK component registry + child resolver.
* The editor preview bridge and the runtime both call this; tests inject mocks
* into {@link sampleTimeline} directly.
*/
function ve(e, t, n, i, a) {
	M(e, t, i, {
		world: n,
		getComponent: r,
		resolveChild: (e, t) => p(n, e, t)
	}, a);
}
//#endregion
//#region src/timeline/timelineEvents.ts
/**
* @file    timelineEvents.ts
* @brief   Which stretches of a clip a playhead covered between two times, and
*          which authored events that crossed.
*
* @details A fixed step never lands on an event's time, so "did it happen" is a
*          question about an INTERVAL, and the interval is not always one piece:
*          a looping clip advancing past its end covered the tail and then the
*          head, with a discontinuity between them that a single (from, to] span
*          reads as a rewind. {@link playheadRuns} is the one place that knows
*          the shape of that, so events and root motion answer the same question
*          the same way — the alternative is two wrap handlers that agree until
*          one of them is fixed.
*
*          Pure: no world, no asset state. What a run means in clip time is all
*          that is here, so the loop seam is a unit test rather than a frame.
*/
/** Where a phase within a ping-pong cycle sits in clip time. */
function N(e, t) {
	const n = t * 2;
	const r = e % n;
	return r <= t ? r : n - r;
}
/**
* The stretches of clip time a playhead covered going from `from` to `to` (both
* in clip seconds, `to` at or after `from`) under `mode`.
*
* A span at least a whole pass long collapses to ONE covering run: a frame long
* enough to lap the clip twice reporting everything twice is a stutter.
*/
function P(e, t, n, r, i) {
	if (n <= 0 || t < e) return [];
	const a = t - e;
	if (r === g.Once) return [{
		from: Math.min(Math.max(e, 0), n),
		to: Math.min(Math.max(t, 0), n),
		inclusiveStart: i
	}];
	if (r === g.Loop) {
		if (a >= n) return [{
			from: 0,
			to: n,
			inclusiveStart: true
		}];
		const t = e % n;
		const r = i || t === 0 && e > 0;
		const o = t + a;
		if (o <= n) return [{
			from: t,
			to: o,
			inclusiveStart: r
		}];
		return [{
			from: t,
			to: n,
			inclusiveStart: r
		}, {
			from: 0,
			to: o - n,
			inclusiveStart: true
		}];
	}
	const o = n * 2;
	if (a >= o) return [{
		from: 0,
		to: n,
		inclusiveStart: true
	}];
	if (a === 0) {
		const t = N(e, n);
		return [{
			from: t,
			to: t,
			inclusiveStart: i
		}];
	}
	const s = [];
	let c = e % o;
	const l = c + a;
	let u = i;
	while (c < l) {
		const e = Math.min(l, (Math.floor(c / n) + 1) * n);
		s.push({
			from: N(c, n),
			to: N(e, n),
			inclusiveStart: u
		});
		u = false;
		c = e;
	}
	return s;
}
/** Whether a moment at `at` falls inside `run`, in the direction it runs. */
function F(e, t) {
	const { from: n, to: r, inclusiveStart: i } = e;
	if (r > n) return (t > n || i && t === n) && t <= r;
	if (r < n) return (t < n || i && t === n) && t >= r;
	return i && t === n;
}
/** Shared by standalone players and animator motions; pose sampling never fires effects. */
function I(e, t, n) {
	for (const r of t) {
		let t;
		let i;
		for (const n of e.events) {
			if (!F(r, n.time)) continue;
			if (!t) t = n;
			else (i ??= [t]).push(n);
		}
		if (i) {
			const e = r.to < r.from ? -1 : 1;
			i.sort((t, n) => e * (t.time - n.time));
			for (const e of i) n(e.action);
		} else if (t) n(t.action);
	}
}
/** The event's numeric payload, or 0 where it carries none. */
function ye(e) {
	const t = e?.value;
	return typeof t === "number" ? t : 0;
}
/** The event's string payload, or empty where it carries none. */
function be(e) {
	const t = e?.text;
	return typeof t === "string" ? t : "";
}
/**
* Append every custom event `asset` declares within `runs` to `out`, run by run
* and then in declaration order, so a long frame still reports swing before hit.
* `childPath` is not read: the event happened to the character the clip plays on.
*/
function L(e, t, n) {
	for (const r of t) for (const t of e.tracks) {
		if (t.type !== _.CustomEvent) continue;
		for (const e of t.events) {
			if (!F(r, e.time)) continue;
			n.push({
				name: e.name,
				value: ye(e.payload),
				text: be(e.payload)
			});
		}
	}
}
//#endregion
//#region src/timeline/timelineSequences.ts
/**
* @file    timelineSequences.ts
* @brief   Which timelines play inside which, and which camera is the view when.
*
* Both are pure functions of (asset, time), so playback, scrubbing and a backwards run all ask the
* same question and get the same answer: nothing here remembers the previous frame.
*/
/** Timelines nested deeper than this are not played (and the editor refuses to build them). */
const xe = 4;
/** The time a nested timeline is at when its parent is at `parentTime`, or null outside the clip. */
function Se(e, t, n) {
	if (t < e.start || t >= e.start + e.duration) return null;
	const r = (t - e.start) * e.speed;
	if (n <= 0) return 0;
	if (e.loop) return r % n;
	return r >= n ? n : r;
}
/**
* The timelines playing inside `asset` at `time`, outermost first, with each one's own time and root.
* A timeline already on the way down (a loop) or past the depth limit is skipped, not entered.
*/
function R(e, t, n, r, i, a = [], o = "", s = 0) {
	if (s >= 4) return [];
	const c = [];
	e.tracks.forEach((e, l) => {
		if (e.type !== _.Sequence) return;
		e.clips.forEach((e, u) => {
			if (!e.timeline || a.includes(e.timeline)) return;
			const d = i(e.timeline);
			if (!d) return;
			const f = Se(e, t, d.duration);
			if (f === null) return;
			const p = e.root ? r(n, e.root) : n;
			if (p == null) return;
			const m = `${o}${l}.${u}/`;
			c.push({
				key: m,
				asset: d,
				ref: e.timeline,
				time: f,
				clip: e,
				root: p
			});
			c.push(...R(d, f, p, r, i, [...a, e.timeline], m, s + 1));
		});
	});
	return c;
}
/** Whether `ref` can be played inside `asset` without it ending up inside itself, by whatever route. */
function Ce(e, t, n) {
	if (e === t) return true;
	const r = /* @__PURE__ */ new Set();
	const i = (t) => {
		if (t === e) return true;
		if (r.has(t)) return false;
		r.add(t);
		const a = n(t);
		if (!a) return false;
		for (const e of a.tracks) {
			if (e.type !== _.Sequence) continue;
			for (const t of e.clips) if (t.timeline && i(t.timeline)) return true;
		}
		return false;
	};
	return i(t);
}
/**
* Which camera is the view at `time`. Clips that touch cut; clips that overlap blend over the overlap.
* No clip over `time` is no answer (null): the scene's own camera takes over.
*/
function z(e, t) {
	const n = e.filter((e) => e.camera && t >= e.start && (t < e.start + e.duration || e.duration === 0 && t === e.start)).sort((e, t) => e.start - t.start);
	if (n.length === 0) return null;
	const r = n[n.length - 1];
	const i = n.length > 1 ? n[n.length - 2] : null;
	if (!i) return {
		from: null,
		to: r.camera,
		weight: 1,
		curve: r.curve ?? 3
	};
	const a = i.start + i.duration - r.start;
	const o = a > 0 ? Math.min(1, Math.max(0, (t - r.start) / a)) : 1;
	return {
		from: i.camera,
		to: r.camera,
		weight: o,
		curve: r.curve ?? 3
	};
}
/**
* The shot at `time` across a timeline and the ones nested in it: the outermost timeline that has a camera
* answer wins, so a parent's cut is not overridden by what a child inside it was doing.
*/
function B(e, t, n, r, i) {
	const a = (e, t, n) => {
		for (const i of e.tracks) {
			if (i.type !== _.Camera) continue;
			const e = z(i.clips, t);
			if (!e) continue;
			const a = r(n, e.to);
			if (a == null) continue;
			const o = e.from === null ? null : r(n, e.from);
			return {
				from: o ?? null,
				to: a,
				weight: o == null ? 1 : e.weight,
				curve: e.curve
			};
		}
		return null;
	};
	const o = a(e, t, n);
	if (o) return o;
	for (const o of R(e, t, n, r, i)) {
		const e = a(o.asset, o.time, o.root);
		if (e) return e;
	}
	return null;
}
//#endregion
//#region src/timeline/TimelineDrive.ts
/**
* @file    TimelineDrive.ts
* @brief   Pure-TS per-frame timeline runtime — the replacement for the C++
*          TimelineSystem::advance.
*
* Holds a per-entity playback clock and, each frame: advances time (speed + wrap),
* samples property tracks (via the shared evaluator), and edge-detects event-track
* triggers through the shared {@link applyTimelineEvent}. Event windows use the
* same playhead runs as animator motions, including loop seams and ping-pong
* turns; a folded sample time alone cannot preserve playback direction.
*/
function V(e = g.Once, t = 1) {
	return {
		time: 0,
		prevTime: 0,
		phase: 0,
		started: false,
		playing: false,
		speed: t,
		wrapMode: e,
		spineClipIndices: {},
		nested: {}
	};
}
/**
* Edge-detect event-track triggers over playback runs. Mutates `state.spineClipIndices`.
*/
function H(e, t, n, r, i = [[t.prevTime, t.time]]) {
	const a = [];
	const { time: o } = t;
	const s = i.map((e) => "from" in e ? e : {
		from: e[0],
		to: Math.max(e[0], e[1]),
		inclusiveStart: e[0] === 0 && e[1] > e[0]
	});
	for (let i = 0; i < e.tracks.length; i++) {
		const c = e.tracks[i];
		if (c.type === _.Property || c.type === _.AnimFrames) continue;
		const l = n(r, c.childPath);
		if (l == null) continue;
		switch (c.type) {
			case _.Particle:
				I(c, s, (e) => {
					a.push({
						kind: C.ParticleAction,
						entity: l,
						intParam: 0,
						floatParam: 0,
						str: e
					});
				});
				break;
			case _.Spine: {
				let e = -1;
				for (let t = c.clips.length - 1; t >= 0; t--) {
					const n = c.clips[t];
					if (o >= n.start && o < n.start + n.duration) {
						e = t;
						break;
					}
				}
				const n = t.spineClipIndices[i] ?? -1;
				if (e !== n) {
					t.spineClipIndices[i] = e;
					if (e === -1) {
						if (n >= 0) a.push({
							kind: C.SpineStop,
							entity: l,
							intParam: 0,
							floatParam: 0,
							str: ""
						});
					} else {
						const t = c.clips[e];
						a.push({
							kind: C.SpinePlay,
							entity: l,
							intParam: t.loop ? 1 : 0,
							floatParam: t.speed,
							str: t.animation
						});
					}
				}
				break;
			}
			case _.SpriteAnim:
				for (const e of s) if (F(e, c.startTime)) {
					a.push({
						kind: C.SpriteAnimPlay,
						entity: l,
						intParam: 0,
						floatParam: 0,
						str: c.clip
					});
					break;
				}
				break;
			case _.Audio:
				for (const e of s) for (const t of c.events) if (F(e, t.time)) a.push({
					kind: C.AudioPlay,
					entity: l,
					intParam: 0,
					floatParam: t.volume,
					str: t.clip
				});
				break;
			case _.Activation: {
				let e = false;
				for (const t of c.ranges) if (o >= t.start && o < t.end) {
					e = true;
					break;
				}
				a.push({
					kind: C.ActivationSet,
					entity: l,
					intParam: e ? 1 : 0,
					floatParam: 0,
					str: ""
				});
				break;
			}
		}
	}
	return a;
}
/**
* Pre-advance half of the flag contract: component → state. Raising `playing`
* while `finished` is latched replays the clip from the top (the only way a
* completed Once clip can run again — its clock is parked at the end). Returns
* true when the component was mutated (`finished` cleared) and needs a write-back.
*/
function we(e, t) {
	let n = false;
	if (e.playing && e.finished) {
		t.time = 0;
		t.prevTime = 0;
		t.phase = 0;
		t.started = false;
		t.spineClipIndices = {};
		t.nested = {};
		e.finished = false;
		n = true;
	}
	t.playing = e.playing;
	return n;
}
/**
* Post-advance half: state → component. A clip that just hit its Once end
* clears `playing` and latches `finished` (read by the `timeline.finished` AI
* condition and observable in the inspector); a stop from any other source only
* clears `playing`. Returns true when the component needs a write-back.
*/
function Te(e, t, n) {
	if (!t.playing && e.playing) {
		e.playing = false;
		if (n) e.finished = true;
		return true;
	}
	return false;
}
/**
* Advance one entity's timeline by `dt`. Mirrors TimelineSystem::advance: clock +
* wrap, sample property tracks, edge-detect + dispatch events. Returns true when
* the clip just stopped (Once reached its end), so the caller can flip `playing`.
*/
function Ee(e, t, n, r, i) {
	if (!n.playing) return false;
	let a = n.phase ?? n.time;
	if (E(a, e.duration, n.wrapMode).time !== n.time) a = n.time;
	n.prevTime = n.time;
	const o = a + r * n.speed;
	const s = E(o, e.duration, n.wrapMode);
	n.time = s.time;
	n.phase = o;
	M(e, n.time, t, i.deps, i.sampleOpts);
	i.onPropertyApplied?.(t, e);
	const c = P(a, o, e.duration, n.wrapMode, !n.started);
	n.started = true;
	for (const r of H(e, n, i.deps.resolveChild, t, c)) w(i.deps.world, i.audio ?? null, r.kind, r.entity, r.intParam, r.floatParam, r.str, i.particle);
	const l = i.lookup ?? De;
	if (i.lookup) Oe(e, t, n, i, i.lookup);
	i.onShot?.(B(e, n.time, t, i.deps.resolveChild, l));
	if (s.stopped) n.playing = false;
	return s.stopped;
}
const De = () => void 0;
/**
* Play the timelines nested in `asset`: each runs on its own clock, samples its property tracks onto
* its own root and fires its own events. A clip entered this step has no past (-1), so a trigger at its
* start fires; one that has ended is forgotten, so entering it again starts it over.
*/
function Oe(e, t, n, r, i) {
	const a = /* @__PURE__ */ new Set();
	for (const o of R(e, n.time, t, r.deps.resolveChild, i)) {
		a.add(o.key);
		M(o.asset, o.time, o.root, r.deps, r.sampleOpts);
		r.onPropertyApplied?.(o.root, o.asset);
		const e = n.nested[o.key];
		const t = e ? e.time : -1;
		const i = V(g.Once, 1);
		i.time = o.time;
		i.prevTime = t;
		i.spineClipIndices = e ? e.spineClipIndices : {};
		const s = o.time < t ? [[t, o.asset.duration], [0, o.time]] : [[t, o.time]];
		for (const e of H(o.asset, i, r.deps.resolveChild, o.root, s)) w(r.deps.world, r.audio ?? null, e.kind, e.entity, e.intParam, e.floatParam, e.str, r.particle);
		n.nested[o.key] = {
			time: o.time,
			spineClipIndices: i.spineClipIndices
		};
	}
	for (const e of Object.keys(n.nested)) if (!a.has(e)) delete n.nested[e];
}
//#endregion
//#region src/timeline/TimelineControl.ts
/**
* Per-App timeline playback control. Holds this App's per-entity playback state
* and is published as the {@link Timeline} resource; game code drives playback via
* `app.getResource(Timeline)`.
*
* The timeline runtime is pure TS now — there is no
* C++ handle or wasm module here. `TimelinePlugin` advances each entity's
* {@link TimelineState} every frame; these methods flip/seek that state and
* write the play flags through to the entity's `TimelinePlayer` component.
*/
var U = class {
	constructor(e = null) {
		this.flags_ = e;
		this.states_ = /* @__PURE__ */ new Map();
		this.codeAssets_ = /* @__PURE__ */ new Map();
		this.assetTimelines_ = null;
	}
	/**
	* Register a timeline built in code under `name`, so a `TimelinePlayer`
	* whose `timeline` is that name plays it like an authored one.
	*
	* Per app, like every other code registration: a name registered here is
	* this app's, and it wins over an asset of the same name.
	*/
	registerAsset(e, t) {
		this.codeAssets_.set(e, t);
	}
	unregisterAsset(e) {
		this.codeAssets_.delete(e);
	}
	/** @internal Where a loaded `.estimeline` comes from: this app's realm. */
	useAssetTimelines(e) {
		this.assetTimelines_ = e;
	}
	/** What `name` plays: a code registration first, then this realm's asset. */
	getAsset(e) {
		return this.codeAssets_.get(e) ?? this.assetTimelines_?.(e);
	}
	/** @internal Plugin ensures (creating if needed) the per-entity playback state. */
	ensureState(e, t, n) {
		let r = this.states_.get(e);
		if (!r) {
			r = V(t, n);
			this.states_.set(e, r);
		}
		return r;
	}
	getState(e) {
		return this.states_.get(e);
	}
	/** @internal Forget an entity's state (on despawn). */
	removeState(e) {
		this.states_.delete(e);
	}
	/** @internal */
	clearStates() {
		this.states_.clear();
	}
	play(e) {
		const t = this.states_.get(e);
		if (t) t.playing = true;
		this.flags_?.raise(e);
	}
	pause(e) {
		const t = this.states_.get(e);
		if (t) t.playing = false;
		this.flags_?.lower(e);
	}
	stop(e) {
		const t = this.states_.get(e);
		if (t) {
			t.playing = false;
			t.time = 0;
			t.prevTime = 0;
			t.phase = 0;
			t.started = false;
			t.spineClipIndices = {};
			t.nested = {};
		}
		this.flags_?.reset(e);
	}
	setTime(e, t) {
		const n = this.states_.get(e);
		if (n) {
			n.prevTime = n.time;
			n.time = t;
			n.phase = t;
			n.started = true;
		}
	}
	isPlaying(e) {
		return this.states_.get(e)?.playing ?? false;
	}
	getCurrentTime(e) {
		return this.states_.get(e)?.time ?? 0;
	}
};
/**
* Per-App timeline control resource, published by `TimelinePlugin`. Drive
* playback as `app.getResource(Timeline).play(entity)`.
*/
const W = /* @__PURE__ */ o(null, "Timeline");
//#endregion
//#region src/timeline/timelineMotion.ts
const G = "timeline";
/** How the motion wants the clip wrapped; unstated leaves the clip's own. */
function K(e, t) {
	if (e.loop === void 0) return t.wrapMode;
	return e.loop ? g.Loop : g.Once;
}
const q = (e) => Math.max(e.speed ?? 1, 1e-4);
/**
* What the pose must not state while the animator is taking the root track as
* displacement. Not a filter the animator passes in: which channels those are is
* the evaluator's own answer, and the extractor reads the same one.
*/
const ke = { skipChannel: O };
function J(e, t = {}) {
	const n = k();
	const i = k();
	/** The span in the CLIP's own time, split where its wrap makes it discontinuous. */
	const a = (e, t, n) => {
		const r = q(t);
		return P(n.from * r, n.to * r, e.duration, K(t, e), n.inclusiveStart);
	};
	const o = {
		world: null,
		getComponent: r,
		resolveChild: (e, t) => p(o.world, e, t)
	};
	return {
		sample(t, n, r, i) {
			const a = e.getAsset(n.clip);
			if (!a) return false;
			const s = E(r * q(n), a.duration, K(n, a));
			o.world = t.world;
			o.resolveChild = t.resolveJoint;
			_e(a, s.time, t.entity, o, i, t.extractRootMotion ? ke : void 0);
			return true;
		},
		events(n, r, i, o) {
			const s = e.getAsset(r.clip);
			if (!s) return;
			const c = a(s, r, i);
			L(s, c, o);
			const l = t.particle?.();
			if (!l) return;
			for (const e of s.tracks) {
				if (e.type !== _.Particle) continue;
				const t = n.resolveJoint(n.entity, e.childPath);
				if (t === null) continue;
				I(e, c, (e) => {
					w(n.world, null, C.ParticleAction, t, 0, 0, e, l);
				});
			}
		},
		/**
		* The clip's own displacement over the span, summed run by run: a lap
		* boundary is a jump in clip time and a difference across it would read
		* as the character teleporting back to where the clip starts.
		*/
		rootMotion(t, r, o, s) {
			const c = e.getAsset(r.clip);
			if (!c || !A(c, 0, n)) return false;
			s.position.x = 0;
			s.position.y = 0;
			s.position.z = 0;
			let l = {
				w: 1,
				x: 0,
				y: 0,
				z: 0
			};
			for (const e of a(c, r, o)) {
				A(c, e.from, n);
				A(c, e.to, i);
				s.position.x += i.position.x - n.position.x;
				s.position.y += i.position.y - n.position.y;
				s.position.z += i.position.z - n.position.z;
				l = h.mul(h.mul(i.rotation, h.conjugate(n.rotation)), l);
			}
			s.rotation.w = l.w;
			s.rotation.x = l.x;
			s.rotation.y = l.y;
			s.rotation.z = l.z;
			return true;
		},
		/** In the animator's own seconds, which is why the speed divides out. */
		duration(t, n) {
			return (e.getAsset(n.clip)?.duration ?? 0) / q(n);
		},
		loops(t, n) {
			const r = e.getAsset(n.clip);
			return r ? K(n, r) !== g.Once : false;
		}
	};
}
//#endregion
//#region src/particle/ParticleCollisionBridge.ts
/** No hard dependency on either optional physics plugin. Their existing APIs own unit conversion. @internal */
function Ae(e) {
	return (t) => {
		if (t.mask === 0) return null;
		if (t.mode === 1) {
			const n = e.getResourceByName("Physics2D");
			if (!n) return void 0;
			const r = Math.hypot(t.dx, t.dy);
			if (!r) return null;
			const i = n.raycast({
				x: t.x,
				y: t.y
			}, {
				x: t.dx / r,
				y: t.dy / r
			}, r, t.mask).find((e) => Number.isFinite(e.fraction) && e.fraction >= 0 && e.fraction <= 1);
			return i ? {
				body: i.entity,
				x: i.point.x,
				y: i.point.y,
				z: t.z,
				nx: i.normal.x,
				ny: i.normal.y,
				nz: 0
			} : null;
		}
		if (t.mode === 2) {
			const n = e.getResourceByName("Physics3D");
			if (!n) return void 0;
			const r = n.raycast({
				x: t.x,
				y: t.y,
				z: t.z
			}, {
				x: t.dx,
				y: t.dy,
				z: t.dz
			}, t.mask);
			return r ? {
				body: r.entity,
				x: r.x,
				y: r.y,
				z: r.z,
				nx: r.normalX,
				ny: r.normalY,
				nz: r.normalZ
			} : null;
		}
	};
}
/** Same-frame bulk exchange with either a WASM or native core. @internal */
var je = class {
	constructor(e, t, n) {
		this.engine_ = e;
		this.registry_ = t;
		this.resolve_ = n;
		this.events = [];
		this.contacts = [];
		this.debug = false;
		this.stats = [];
		this.error = null;
		this.budget = {
			queries: 4096,
			events: 1024
		};
		this.updating_ = false;
	}
	read_(e, t, n, r) {
		if (!Number.isInteger(e) || e < 0 || e > r || !n) return void 0;
		const i = n(), a = this.engine_.HEAPU8;
		if (!a || !Number.isSafeInteger(i) || i % 4 !== 0 || e > 0 && i === 0 || i < 0 || i + e * t * 4 > a.byteLength) return void 0;
		return a.slice(i, i + e * t * 4).buffer;
	}
	update(e) {
		if (this.updating_) throw new Error("Particle.update cannot re-enter during collision queries");
		this.updating_ = true;
		this.events = [];
		this.contacts = [];
		this.stats = [];
		this.error = null;
		const t = this.engine_;
		try {
			t.particle_collisionSetBudget?.(this.budget.queries, this.budget.events, this.debug);
			t.particle_update?.(this.registry_, e);
			const n = t.particle_collisionQueryCount?.() ?? 0;
			if (n > 0 && t.particle_collisionResolve) {
				const e = this.read_(n, 10, t.particle_collisionQueries?.bind(t), 65536);
				let r = 0;
				try {
					if (e && t._malloc && t._free && t.HEAPU8) r = t._malloc(n * 32);
					if (r && e) {
						const i = new Uint32Array(e), a = new Float32Array(e);
						const o = /* @__PURE__ */ new ArrayBuffer(n * 32), s = new Uint32Array(o), c = new Float32Array(o);
						for (let e = 0; e < n; e++) {
							const t = e * 10, n = e * 8;
							let r;
							try {
								r = this.resolve_?.({
									mode: i[t + 2],
									mask: i[t + 3],
									x: a[t + 4],
									y: a[t + 5],
									z: a[t + 6],
									dx: a[t + 7],
									dy: a[t + 8],
									dz: a[t + 9]
								});
							} catch (e) {
								this.error = String(e);
								r = void 0;
							}
							s[n] = r === void 0 ? 2 : r === null ? 0 : 1;
							if (r) {
								s[n + 1] = r.body;
								c.set([
									r.x,
									r.y,
									r.z,
									r.nx,
									r.ny,
									r.nz
								], n + 2);
							}
						}
						t.HEAPU8.set(new Uint8Array(o), r);
						t.particle_collisionResolve(this.registry_, r, n);
					} else t.particle_collisionResolve(this.registry_, 0, 0);
				} finally {
					if (r) t._free?.(r);
				}
			}
			const r = t.particle_collisionEventCount?.() ?? 0;
			const i = this.read_(r, 14, t.particle_collisionEvents?.bind(t), 16384);
			if (i) {
				const e = new Uint32Array(i), t = new Float32Array(i);
				for (let n = 0; n < r; n++) {
					const r = n * 14;
					const i = {
						emitter: e[r],
						particle: e[r + 1],
						body: e[r + 2],
						mode: e[r + 3],
						x: t[r + 4],
						y: t[r + 5],
						z: t[r + 6],
						normalX: t[r + 7],
						normalY: t[r + 8],
						normalZ: t[r + 9],
						velocityX: t[r + 10],
						velocityY: t[r + 11],
						velocityZ: t[r + 12]
					};
					this.contacts.push(i);
					if (e[r + 13]) this.events.push(i);
				}
			}
			const a = t.particle_collisionStatsCount?.() ?? 0;
			const o = this.read_(a, 10, t.particle_collisionStats?.bind(t), 1e6);
			if (o) {
				const e = new Uint32Array(o);
				for (let t = 0; t < a; t++) {
					const n = t * 10;
					this.stats.push({
						emitter: e[n],
						queries: e[n + 1],
						hits: e[n + 2],
						budgetSkipped: e[n + 3],
						distanceSkipped: e[n + 4],
						unavailable: e[n + 5],
						events: e[n + 6],
						eventDropped: e[n + 7],
						fallbacks: e[n + 8],
						mode: e[n + 9]
					});
				}
			}
		} finally {
			this.updating_ = false;
		}
	}
};
//#endregion
//#region src/particle/ParticleAPI.ts
/**
* Per-app particle API. Wraps the C++ registry-scoped particle system
* so two App instances (e.g. editor tabs previewing different scenes)
* can drive independent simulations without cross-talk.
*
* Consumed as a resource: declare `Res(Particle)` as a system param, or
* grab it with `app.getResource(Particle)` outside ECS code.
*/
var Me = class {
	/** @param module whichever engine core is present — the wasm module on the web,
	*  the native host's bindings on a device (see ecs/engineApi.ts). */
	constructor(e, t, n) {
		this.module_ = e;
		this.registry_ = t;
		this.collisions_ = new je(e, t, n);
	}
	update(e) {
		this.collisions_.update(e);
	}
	/** Contacts published by the last completed update, in project world units. */
	get collisionEvents() {
		return this.collisions_.events;
	}
	/** Per-emitter counters from the last update, including fallback reasons. */
	get collisionStats() {
		return this.collisions_.stats;
	}
	/** Provider errors are visible alongside the unavailable/fallback counters. */
	get collisionError() {
		return this.collisions_.error;
	}
	/** Global App caps, independent of each emitter's smaller limits. */
	setCollisionBudget(e) {
		for (const t of ["queries", "events"]) {
			const n = e[t];
			if (n !== void 0) this.collisions_.budget[t] = Number.isFinite(n) ? Math.max(0, Math.min(t === "queries" ? 65536 : 16384, Math.floor(n))) : 0;
		}
	}
	/** Draw bounded hit normals without enabling gameplay collision events. */
	get debugNormals() {
		return this.collisions_.debug;
	}
	set debugNormals(e) {
		this.collisions_.debug = e;
	}
	/** @internal */
	get collisionContacts() {
		return this.collisions_.contacts;
	}
	play(e) {
		this.module_.particle_play?.(this.registry_, e);
	}
	stop(e) {
		this.module_.particle_stop?.(this.registry_, e);
	}
	reset(e) {
		this.module_.particle_reset?.(this.registry_, e);
	}
	/**
	* Spawn `count` of `entity`'s particles at a world point, now — an impact's sparks, a muzzle's flash — without moving
	* the emitter or replaying it (Unity's `ParticleSystem.Emit`). The emitter's own settings make them; its shape's +Y (a
	* cone's or hemisphere's axis) points along `options.normal` when given, else as the entity is turned, and
	* `options.velocity` is added to each. CPU-simulated emitters only. Returns how many were spawned.
	*/
	emitAt(e, t, n, r = {}) {
		const i = r.normal ?? {
			x: 0,
			y: 0,
			z: 0
		}, a = r.velocity ?? {
			x: 0,
			y: 0,
			z: 0
		};
		return this.module_.particle_emitAt?.(this.registry_, e, Math.max(0, Math.floor(t)), n.x, n.y, n.z, i.x, i.y, i.z, a.x, a.y, a.z) ?? 0;
	}
	getAliveCount(e) {
		return this.module_.particle_getAliveCount?.(e) ?? 0;
	}
	/**
	* Upload an entity's baked color-over-life LUT (an N×4 RGBA Float32Array) so
	* the sim samples it instead of start/end + easing; pass null to clear. The
	* data is copied into the wasm heap for the call, then freed.
	*/
	setColorLut(e, t) {
		this.uploadLut(this.module_.particle_set_color_lut, e, t, 4);
	}
	/** Upload an entity's baked size-over-life multiplier LUT (an N-scalar
	*  Float32Array), or null to clear. */
	setSizeLut(e, t) {
		this.uploadLut(this.module_.particle_set_size_lut, e, t, 1);
	}
	/**
	* Speed-over-life multiplier. Scales how fast a particle travels along the
	* trajectory it already has — gravity, damping and noise still accumulate
	* into its velocity, so this is not a second force system.
	*/
	setSpeedLut(e, t) {
		this.uploadLut(this.module_.particle_set_speed_lut, e, t, 1);
	}
	/**
	* Burst schedule: each burst releases `count` particles once the emitter has been emitting for `time` seconds
	* (counted from the end of its start delay). A looping emitter repeats the schedule every duration. Null clears.
	*/
	setBursts(e, t) {
		const n = t && t.length > 0 ? Float32Array.from(t.flatMap((e) => [e.time, e.count])) : null;
		this.uploadLut(this.module_.particle_set_bursts, e, n, 2);
	}
	uploadLut(e, t, n, r) {
		if (!e) return;
		if (!n || n.length === 0) {
			e(t, 0, 0);
			return;
		}
		const { _malloc: i, _free: a } = this.module_;
		if (!i || !a || !this.module_.HEAPF32) return;
		const o = n.buffer === this.module_.HEAPF32.buffer ? n.slice() : n;
		const s = i(o.length * 4);
		try {
			this.module_.HEAPF32.set(o, s / 4);
			e(t, s, o.length / r);
		} finally {
			a(s);
		}
	}
};
/** Resource handle for the per-app particle API. */
const Y = o(null, "Particle");
//#endregion
//#region src/timeline/TimelinePlugin.ts
var X = class {
	constructor() {
		this.name = "timeline";
		this.animFramesStates_ = /* @__PURE__ */ new Map();
		this.offDespawn_ = null;
	}
	build(e) {
		const n = e.world;
		const i = (e, t, r) => {
			if (!n.has(e, v)) return;
			const i = n.get(e, v);
			if (i.playing === t && !(r && i.finished)) return;
			i.playing = t;
			if (r) i.finished = false;
			n.insert(e, v, i);
		};
		e.insertResource(W, new U({
			raise: (e) => i(e, true, false),
			lower: (e) => i(e, false, false),
			reset: (e) => i(e, false, true)
		}));
		e.getResource(W).useAssetTimelines((t) => e.hasResource(u) ? e.getResource(u).resolveRegistryAsset("timeline", t)?.asset : void 0);
		if (e.hasResource(m)) e.getResource(m).registerMotionDriver(G, J(e.getResource(W), { particle: () => e.hasResource(Y) ? e.getResource(Y) : null }));
		this.offDespawn_ = n.onDespawn((t) => {
			e.getResource(W).removeState(t);
			this.animFramesStates_.delete(t);
			if (e.hasResource(b)) y(e.getResource(b), t, null);
		});
		e.addSystemToSchedule(3, t([s(a)], (t) => {
			const i = e.getResource(W);
			const a = e.hasResource(l) ? e.getResource(l) : null;
			const o = e.hasResource(u) ? e.getResource(u) : null;
			const s = e.hasResource(b) ? e.getResource(b) : null;
			const c = {
				world: n,
				getComponent: r,
				resolveChild: (e, t) => p(n, e, t)
			};
			for (const r of n.getEntitiesWithComponents([v])) {
				const l = n.get(r, v);
				if (!l.timeline) continue;
				const u = i.getAsset(l.timeline);
				if (!u) continue;
				const d = o?.resolveRegistryAsset("timeline", l.timeline);
				const f = ee(l.wrapMode, u.wrapMode);
				const p = i.ensureState(r, f, l.speed);
				p.speed = l.speed;
				p.wrapMode = f;
				const m = we(l, p);
				this.ensureAnimFrames(r, u);
				const h = Ee(u, r, p, t.delta, {
					particle: e.hasResource(Y) ? e.getResource(Y) : null,
					deps: c,
					audio: a,
					lookup: (e) => i.getAsset(e),
					onShot: s ? (e) => y(s, r, e) : void 0
				});
				this.processAnimFrames(n, r, p.time, d?.textureHandles);
				if (h && s) y(s, r, null);
				if (Te(l, p, h) || m) n.insert(r, v, l);
			}
		}, { name: "TimelineSystem" }), { runIf: d });
	}
	clearHandles() {
		this.animFramesStates_.clear();
	}
	cleanup() {
		this.offDespawn_?.();
		this.offDespawn_ = null;
		this.animFramesStates_.clear();
	}
	ensureAnimFrames(e, t) {
		if (this.animFramesStates_.has(e)) return;
		const n = t.tracks.filter((e) => e.type === _.AnimFrames);
		if (n.length > 0) this.animFramesStates_.set(e, {
			tracks: n,
			lastFrameIndices: n.map(() => -1)
		});
	}
	processAnimFrames(e, t, n, i) {
		const a = this.animFramesStates_.get(t);
		if (!a) return;
		const o = r("Sprite");
		if (!o || !e.has(t, o)) return;
		const s = 1 / 12;
		for (let r = 0; r < a.tracks.length; r++) {
			const c = a.tracks[r].frames;
			if (c.length === 0) continue;
			let l = 0;
			let u = 0;
			for (let e = 0; e < c.length; e++) {
				const t = c[e].duration ?? s;
				if (n < l + t) {
					u = e;
					break;
				}
				l += t;
				if (e === c.length - 1) u = c.length - 1;
			}
			if (u !== a.lastFrameIndices[r]) {
				a.lastFrameIndices[r] = u;
				const n = i?.get(c[u].texture) ?? 0;
				if (n) {
					const r = e.get(t, o);
					r.texture = n;
					e.set(t, o, r);
				}
			}
		}
	}
};
const Ne = /* @__PURE__ */ new X();
//#endregion
//#region src/timeline/TimelineLoader.ts
const Pe = 1e5;
const Fe = [
	[
		"1.0",
		"1.1",
		(e) => {
			for (const t of e.tracks ?? []) if (t.type === _.Property) for (const e of t.channels ?? []) for (const t of e.keyframes ?? []) {
				if (t.interpolation) continue;
				if (Math.abs(t.outTangent) >= Pe) {
					t.interpolation = "step";
					t.outTangent = 0;
				}
			}
		}
	],
	[
		"1.1",
		"1.2",
		(e) => {
			for (const t of e.tracks ?? []) {
				if (t.type !== _.Property) continue;
				for (const e of t.channels ?? []) if (e.property === "rotation.z") e.property = "rotation.angle";
			}
		}
	],
	[
		"1.2",
		"1.3",
		() => void 0
	]
];
function Ie(e) {
	let t = e.version ?? "1.0";
	for (const [n, r, i] of Fe) if (t === n) {
		i(e);
		t = r;
	}
	e.version = "1.3";
}
const Z = (e, t) => typeof e === "number" && Number.isFinite(e) ? e : t;
function Le(e) {
	const t = {
		name: e.name ?? "",
		childPath: e.childPath ?? ""
	};
	switch (e.type) {
		case _.Property: return {
			...t,
			type: _.Property,
			component: e.component ?? "",
			channels: (e.channels ?? []).map((e) => ({
				property: e.property,
				keyframes: (e.keyframes ?? []).map((e) => ({
					...e,
					inTangent: e.inTangent ?? 0,
					outTangent: e.outTangent ?? 0
				}))
			}))
		};
		case _.Spine: return {
			...t,
			type: _.Spine,
			clips: e.clips ?? [],
			blendIn: e.blendIn ?? 0
		};
		case _.SpriteAnim: return {
			...t,
			type: _.SpriteAnim,
			clip: e.clip ?? "",
			startTime: e.startTime ?? 0
		};
		case _.Audio: return {
			...t,
			type: _.Audio,
			events: e.events ?? []
		};
		case _.Activation: return {
			...t,
			type: _.Activation,
			ranges: e.ranges ?? []
		};
		case _.Marker: return {
			...t,
			type: _.Marker,
			markers: e.markers ?? []
		};
		case _.Particle: return {
			...t,
			type: _.Particle,
			events: (e.events ?? []).filter((e) => Number.isFinite(e.time) && e.time >= 0 && [
				"play",
				"stop",
				"reset"
			].includes(e.action)).map((e) => ({
				time: e.time,
				action: e.action
			}))
		};
		case _.CustomEvent: return {
			...t,
			type: _.CustomEvent,
			events: (e.events ?? []).map((e) => ({
				time: e.time ?? 0,
				name: e.name ?? "",
				payload: e.payload ?? {}
			}))
		};
		case _.AnimFrames: return {
			...t,
			type: _.AnimFrames,
			frames: (e.animFrames ?? []).map((e) => ({
				texture: e.texture ?? "",
				duration: e.duration
			}))
		};
		case _.Camera: return {
			...t,
			childPath: "",
			type: _.Camera,
			clips: (e.clips ?? []).map((e) => ({
				start: Z(e.start, 0),
				duration: Math.max(0, Z(e.duration, 0)),
				camera: typeof e.camera === "string" ? e.camera : "",
				...typeof e.curve === "number" ? { curve: e.curve } : {}
			}))
		};
		case _.Sequence: return {
			...t,
			childPath: "",
			type: _.Sequence,
			clips: (e.clips ?? []).map((e) => ({
				start: Z(e.start, 0),
				duration: Math.max(0, Z(e.duration, 0)),
				timeline: typeof e.timeline === "string" ? e.timeline : "",
				root: typeof e.root === "string" ? e.root : "",
				speed: Z(e.speed, 1) || 1,
				loop: e.loop === true
			}))
		};
		default:
			c.warn("timeline", `Unknown track type: ${e.type}, skipping`);
			return null;
	}
}
function Q(e) {
	const t = e ?? {};
	Ie(t);
	return {
		version: "1.3",
		type: "timeline",
		duration: t.duration ?? 0,
		wrapMode: te(t.wrapMode),
		tracks: (t.tracks ?? []).map(Le).filter((e) => e !== null)
	};
}
function Re(e) {
	const t = /* @__PURE__ */ new Set();
	const n = /* @__PURE__ */ new Set();
	const r = /* @__PURE__ */ new Set();
	const i = /* @__PURE__ */ new Set();
	for (const a of e.tracks) if (a.type === _.Audio) for (const e of a.events) t.add(e.clip);
	else if (a.type === _.SpriteAnim) {
		if (a.clip) n.add(a.clip);
	} else if (a.type === _.Sequence) {
		for (const e of a.clips) if (e.timeline) i.add(e.timeline);
	} else if (a.type === _.AnimFrames) {
		for (const e of a.frames) if (e.texture) r.add(e.texture);
	}
	return {
		audio: Array.from(t),
		animClips: Array.from(n),
		textures: Array.from(r),
		timelines: Array.from(i)
	};
}
//#endregion
//#region src/timeline/TimelineSerializer.ts
/**
* @file    TimelineSerializer.ts
* @brief   Serialize an in-memory TimelineAsset back to .estimeline JSON — the
*          inverse of TimelineLoader.parseTimelineAsset.
*
* The runtime previously only LOADED timelines; authoring (the Sequencer editor)
* needs to write them back. Field names and the wrapMode
* string encoding mirror the loader exactly so parse(serialize(x)) round-trips —
* notably AnimFrames tracks persist under the on-disk key `animFrames` (the loader
* reads `raw.animFrames` into the in-memory `frames`).
*/
function ze(e) {
	const t = {
		type: e.type,
		name: e.name,
		childPath: e.childPath
	};
	switch (e.type) {
		case _.Property: return {
			...t,
			component: e.component,
			channels: e.channels.map((e) => ({
				property: e.property,
				keyframes: e.keyframes.map((e) => ({
					time: e.time,
					value: e.value,
					inTangent: e.inTangent,
					outTangent: e.outTangent,
					...e.interpolation ? { interpolation: e.interpolation } : {}
				}))
			}))
		};
		case _.Spine: return {
			...t,
			clips: e.clips,
			blendIn: e.blendIn
		};
		case _.SpriteAnim: return {
			...t,
			clip: e.clip,
			startTime: e.startTime
		};
		case _.Particle:
		case _.Audio: return {
			...t,
			events: e.events
		};
		case _.Activation: return {
			...t,
			ranges: e.ranges
		};
		case _.Marker: return {
			...t,
			markers: e.markers
		};
		case _.CustomEvent: return {
			...t,
			events: e.events
		};
		case _.Camera: return {
			...t,
			childPath: "",
			clips: e.clips
		};
		case _.Sequence: return {
			...t,
			childPath: "",
			clips: e.clips
		};
		case _.AnimFrames: return {
			...t,
			animFrames: e.frames
		};
		default: return t;
	}
}
/** Serialize to a plain JSON-ready object (the `.estimeline` document shape). */
function $(e) {
	return {
		version: "1.3",
		type: "timeline",
		duration: e.duration,
		wrapMode: re(e.wrapMode),
		tracks: e.tracks.map(ze)
	};
}
/** Serialize to a pretty-printed JSON string for writing to disk. */
function Be(e, t = 2) {
	return JSON.stringify($(e), null, t);
}
//#endregion
//#region src/timeline/AnimationClip.ts
/**
* @file    AnimationClip.ts
* @brief   The unified animation-clip loader — one .esanim document the Sequencer
*          authors and the Animator state-machine references.
*
* The editor unified two formats into `.esanim`: the rich multi-track model
* (property curves + sprite frames + events + …) and the legacy sprite-flipbook
* AnimClip (frames + fps). `parseAnimationClip` accepts either — discriminating by
* structure, not the `type` string — and returns the one in-memory model
* ({@link TimelineAsset}). A flipbook becomes a clip with a single sprite-frame
* track, so old `.esanim` files keep working while everything converges on one
* format. (The engine's two RUNTIMES merge in P4; this is the format seam.)
*/
/** Convert a legacy flipbook AnimClip (frames + fps) to a single sprite-frame track. */
function Ve(e) {
	const t = typeof e.fps === "number" && e.fps > 0 ? e.fps : 12;
	const n = (e.frames ?? []).map((e) => ({
		texture: e.texture ?? "",
		duration: e.duration ?? 1 / t
	}));
	const r = n.reduce((e, n) => e + (n.duration ?? 1 / t), 0);
	const i = {
		type: _.AnimFrames,
		name: "Sprite",
		childPath: "",
		frames: n
	};
	return {
		version: "1.1",
		type: "timeline",
		duration: r,
		wrapMode: e.loop === false ? g.Once : g.Loop,
		tracks: [i]
	};
}
/**
* Parse any `.esanim` / legacy `.estimeline` document into the unified clip model.
* Discriminates by shape: a `tracks` array is the rich multi-track clip; a `frames`
* array is the legacy flipbook.
*/
function He(e) {
	const t = e;
	if (t && Array.isArray(t.tracks)) return Q(t);
	if (t && Array.isArray(t.frames)) return Ve(t);
	return Q(t ?? {});
}
//#endregion
export { x as A, E as C, A as D, O as E, S as M, M as O, F as S, T, B as _, Q as a, L as b, Y as c, G as d, J as f, R as g, xe as h, Re as i, ce as j, ve as k, Me as l, U as m, $ as n, X as o, W as p, Be as r, Ne as s, He as t, Ae as u, z as v, k as w, P as x, Ce as y };

//# sourceMappingURL=AnimationClip.js.map