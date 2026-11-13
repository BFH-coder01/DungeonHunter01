//#region src/runtime/sceneOptionals.ts
let e = null;
let t = null;
let n = null;
let r = null;
let i = null;
/** Called by each subsystem's `support.ts`, which an entry or a subpath calls. */
function a(a) {
	if (a.spine) e = a.spine;
	if (a.dragonBones) i = a.dragonBones;
	if (a.physics) t = a.physics;
	if (a.physics3d) n = a.physics3d;
	if (a.video) r = a.video;
}
/** Null in a build that does not ship Spine — a scene holding one then loads
*  without it rather than failing, which is what a lean build IS. */
const o = () => e;
/** Null in a build that does not ship DragonBones. */
const s = () => i;
/** Null in a build that does not ship 2D physics. */
const c = () => t;
/** Null in a build that does not ship 3D physics. */
const l = () => n;
/** Null in a build that does not ship video. */
const u = () => r;
/**
* Which optional subsystems this BUILD ships, as the seam itself answers it.
*
* Exported because the only honest test of that question reads the shipped
* bundle rather than the source. Every registration here is reached from an
* entry, and an entry is the one thing a bundler is told to keep — but what the
* entry reaches was dropped once already, and the SDK's own suite could not see
* it: it imports `src`, where the wiring was never in doubt.
*
* Diagnostic, not a switch. A scene that needs a subsystem this build does not
* ship already says so in the log; this is how a report can say it too.
*/
function d() {
	return [
		e && "spine",
		i && "dragonBones",
		t && "physics",
		n && "physics3d",
		r && "video"
	].filter((e) => typeof e === "string");
}
//#endregion
export { d as a, a as i, l as n, o, c as r, u as s, s as t };

//# sourceMappingURL=sceneOptionals.js.map