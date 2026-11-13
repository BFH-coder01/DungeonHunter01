import { s as e } from "./resource.js";
import { n as t, o as n } from "./base.js";
import { a as r, i } from "./types.js";
import { r as a } from "./core.js";
//#region src/gameplay/vocabulary.ts
/**
* @file  vocabulary.ts — the names authored content uses to reach gameplay.
*
* Strings, and its own module because of who reads them: an AnimatorController
* asset names the parameters, an input map names the keys, and an event binding
* names the combat events — none of which needs a controller, a health bar or a
* melee solver. These stay on `esengine`; the runtime behind them is
* `esengine/gameplay`.
*/
/**
* Animator parameters a controller writes, and the triggers it sets. Names, not
* clips — and shared with the hunter, so one graph drives a player and an enemy
* and neither can drift into a private vocabulary.
*/
const o = "speed";
const s = "grounded";
/** Set the frame a jump was ACCEPTED, not the frame one was asked for. */
const c = "jump";
const l = "dodge";
const u = "attack";
/** The key a dodge is asked for on; the animator decides whether there is one. */
const d = "ShiftLeft";
/** The key an attack is asked for on. Same rule: a request, not a clip name. */
const f = "KeyJ";
/**
* The events a clip declares that melee reads. Names rather than times: a state
* that re-times its swing re-times the hit, and nothing else has to be told.
*/
const p = "attack-start";
const m = "hit";
const h = "attack-end";
//#endregion
//#region src/device/index.ts
const g = a();
function _() {
	return n() ? t().device?.() ?? g : g;
}
function v(e) {
	try {
		return Promise.resolve(e(_())).catch(r);
	} catch (e) {
		return Promise.resolve(r(e));
	}
}
/** Requests requiring a player gesture must be called from the host event itself. */
const y = {
	capabilities: () => _().capabilities(),
	state: () => _().state(),
	/** The battery and the processor's heat as far as the platform has said (a null is a thing it does not say). */
	power: () => _().power?.() ?? i,
	motion: {
		start: (e) => v((t) => t.startMotion(e)),
		stop: () => v((e) => e.stopMotion()),
		onChange: (e) => _().onMotion(e)
	},
	vibrate: (e) => v((t) => t.vibrate(e)),
	keepScreenOn: (e) => v((t) => t.keepScreenOn(e)),
	fullscreen: (e, t) => v((n) => n.fullscreen(e, t)),
	pointerLock: (e, t) => v((n) => n.pointerLock(e, t)),
	onChange: (e) => _().onStateChange(e),
	dispose: () => _().dispose()
};
//#endregion
//#region src/runtime/playthrough.ts
/**
* @file    Playthrough.ts
* @brief   What a game says about its own progress, for automation that must
*          prove a run can be finished.
*
* @details The observation seam a packaged game already had could see the
*          ENGINE's side of a run — where a character stands, what an animator
*          plays, whether a swing landed. It could not see the game's: a
*          checkpoint armed, three cores taken, a gate opened, a victory. So no
*          level's completion could be confirmed from outside, and a playthrough
*          driver had to infer one from an entity going missing.
*
*          Published, not read. The engine does not reach into a game's
*          resources and guess which field means "won" — the game states it, in
*          its own words, and that statement is the contract. Read-only from
*          outside: this is how a run is OBSERVED, never how it is driven.
*
*          Core, not `gameplay`: the host's observation seam reads it from every
*          packaged game, and it depends on nothing the gameplay runtime has.
*/
const b = e({ facts: {} }, "Playthrough");
//#endregion
export { p as a, u as c, c as d, o as f, h as i, l, y as n, m as o, f as r, d as s, b as t, s as u };

//# sourceMappingURL=playthrough.js.map