import { _ as e } from "./system.js";
//#region src/animation/animatorEvent.ts
/**
* @file    animatorEvent.ts
* @brief   What the animator says happened, for anything that cares to hear it.
*
* @details The animator's job ends at "the clip declared `hit` and the playhead
*          just crossed it". Dealing damage, playing a footstep, bursting dust —
*          those belong to the systems that own damage, sound and particles, and
*          an animator that called them would be a state machine that imports the
*          combat rules. So it states the event and stops, and the dependency
*          runs the other way: gameplay reads the animator, never the reverse.
*
*          One channel, the engine's own event bus, rather than a listener list
*          beside it: a callback fires inside the animator's own loop over
*          entities, and a handler that spawns or despawns there is mutating the
*          set being iterated.
*/
/**
* The bus every animation event arrives on. Read it with
* `EventReader(AnimatorEvent)` in a system of your own.
*
* @experimental
*/
const t = e("AnimatorEvent", {
	entity: 0,
	name: "",
	value: 0,
	text: ""
});
//#endregion
export { t };

//# sourceMappingURL=animatorEvent.js.map