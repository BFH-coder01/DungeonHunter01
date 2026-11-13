import { $t as e } from "./system.js";
//#region src/timeline/TimelineTypes.ts
/**
* The `.estimeline` format version. What the serializer stamps and what the
* loader migrates up to: two constants would let a document be written at a
* version its own reader thinks needs migrating.
*/
const t = "1.3";
const n = {
	Once: 0,
	Loop: 1,
	PingPong: 2
};
const r = {
	once: n.Once,
	loop: n.Loop,
	pingPong: n.PingPong
};
const i = {
	[n.Once]: "once",
	[n.Loop]: "loop",
	[n.PingPong]: "pingPong"
};
/** Decode a serialized wrapMode string; unknown / missing → `Once`. */
function a(e) {
	if (!e) return n.Once;
	return r[e] ?? n.Once;
}
/** Whether `value` is a wrap mode name at all — what tells an OVERRIDE from a
*  typo, where decoding to `Once` would look like a deliberate choice. */
function o(e) {
	return !!e && e in r;
}
/** Encode a wrapMode to its on-disk string (inverse of {@link wrapModeFromName}). */
function s(e) {
	return i[e] ?? "once";
}
const c = {
	Property: "property",
	Spine: "spine",
	SpriteAnim: "spriteAnim",
	Audio: "audio",
	Particle: "particle",
	Activation: "activation",
	Marker: "marker",
	CustomEvent: "customEvent",
	AnimFrames: "animFrames",
	Camera: "camera",
	Sequence: "sequence"
};
//#endregion
//#region src/timeline/TimelinePlayerComponent.ts
/**
* @file    TimelinePlayerComponent.ts
* @brief   What plays a timeline on an entity: the component, and the one rule
*          for reading its wrap mode.
*
* @details Separate from the plugin that advances it because it is DATA — the
*          plugin, the animator's timeline motion, and the AI conditions all
*          read this shape, and a component living inside the system that ticks
*          it makes every other reader depend on that system.
*/
/**
* Which wrap mode a playing clip runs under: the CLIP's, unless the player names
* one to override it with. A string that is not a wrap mode name is a typo, not
* a choice, and leaves the clip's own mode standing.
*/
function l(e, t) {
	return o(e) ? a(e) : t;
}
const u = /* @__PURE__ */ e("TimelinePlayer", {
	timeline: "",
	playing: false,
	speed: 1,
	wrapMode: "",
	finished: false
}, {
	assetFields: [{
		field: "timeline",
		type: "timeline"
	}],
	fields: {
		wrapMode: { tooltip: "Override the clip's own wrap mode: once, loop or pingPong. Empty uses what the clip declares." },
		finished: {
			advanced: true,
			tooltip: "Clip completed (runtime, read-only). Raise Playing to replay."
		}
	}
});
//#endregion
export { n as a, c as i, l as n, a as o, t as r, s, u as t };

//# sourceMappingURL=TimelinePlayerComponent.js.map