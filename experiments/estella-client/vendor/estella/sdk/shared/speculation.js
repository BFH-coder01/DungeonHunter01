import { or as e, x as t } from "./system.js";
import { s as n } from "./resource.js";
//#region src/ecs/speculation.ts
/**
* The undo log a World writes into while a speculation is open.
*
* First touch wins: a component written five times in one step still has one
* pre-scope value, and restoring it is what "before" means.
*/
var r = class {
	constructor() {
		this.before_ = /* @__PURE__ */ new Map();
		this.restoring_ = false;
		this.capturing_ = false;
	}
	/** @internal Called by World wherever a handle leaves or a value lands. */
	record(t, n, r) {
		if (this.restoring_ || this.capturing_) return;
		const i = `${n}:${String(r._id.description ?? r._id.toString())}`;
		if (this.before_.has(i)) return;
		this.capturing_ = true;
		try {
			const a = t.has(n, r) ? t.tryGet(n, r) : void 0;
			this.before_.set(i, {
				entity: n,
				component: r,
				value: a === void 0 || a === null ? void 0 : e(a)
			});
		} finally {
			this.capturing_ = false;
		}
	}
	/** @internal Put every touched component back, without recording the undo. */
	undo(e) {
		this.restoring_ = true;
		try {
			for (const { entity: t, component: n, value: r } of this.before_.values()) if (r === void 0) {
				if (e.has(t, n)) e.remove(t, n);
			} else e.set(t, n, r);
		} finally {
			this.restoring_ = false;
			this.before_.clear();
		}
	}
	/** @internal */
	forget() {
		this.before_.clear();
	}
	/** @internal Where the step LEFT every component it touched. Read with the
	*  speculation already closed, so looking does not record. */
	postImage(e) {
		const t = [];
		for (const [n, { entity: r, component: a }] of this.before_) {
			const o = e.has(r, a) ? e.tryGet(r, a) : void 0;
			t.push(`${n}=${o === void 0 || o === null ? "absent" : i(o)}`);
		}
		return t.sort().join("|");
	}
};
/** Key order is not a difference a replay should report, so sort it away. */
function i(e) {
	if (e === null || typeof e !== "object") return JSON.stringify(e) ?? "undefined";
	if (Array.isArray(e)) return `[${e.map(i).join(",")}]`;
	const t = e;
	return `{${Object.keys(t).sort().map((e) => `${e}:${i(t[e])}`).join(",")}}`;
}
/** Run the step and take it back, keeping an account of what it did. */
function a(e, n) {
	const { world: i, resources: a, events: o } = e;
	const s = new r();
	const c = new t(i, a);
	const l = o?.writeMarks();
	i.openSpeculation(s);
	let u;
	try {
		u = n(c);
	} finally {
		i.closeSpeculation();
	}
	const d = {
		outcome: u,
		values: s.postImage(i),
		commands: c.describe(),
		events: l && o ? o.writtenSince(l) : ""
	};
	s.undo(i);
	if (l && o) o.rewindWrites(l);
	return d;
}
/**
* Run the same step twice from the same state, over the three surfaces this
* scope aligns; both runs are taken back. A predicted step already promises to
* depend "only on world state + actions + dt" (replication/client.ts), and
* nothing held it to that — a clock or a random source reads green until desync.
*/
function o(e, t) {
	const n = a(e, t);
	const r = a(e, t);
	for (const e of [
		"outcome",
		"values",
		"commands",
		"events"
	]) if (n[e] !== r[e]) return {
		stable: false,
		why: `${e} differed between runs: ${String(n[e])} then ${String(r[e])}`
	};
	return {
		stable: true,
		why: ""
	};
}
/**
* Run `body` as a step that has not happened yet.
*
* It gets the scope's own command queue, and that is what keeps an abandoned
* step from consuming an identity: `EntityCommands` allocates none until the
* queue is flushed. Spawning on the World itself throws inside the scope.
*/
function s(e, n) {
	const { world: i, resources: a, events: o } = e;
	const s = new r();
	const c = new t(i, a);
	const l = o?.writeMarks();
	i.openSpeculation(s);
	let u;
	try {
		u = n(c);
	} catch (e) {
		i.closeSpeculation();
		s.undo(i);
		if (l && o) o.rewindWrites(l);
		throw e;
	}
	i.closeSpeculation();
	if (u === "commit") {
		s.forget();
		c.flush();
		return "commit";
	}
	s.undo(i);
	if (l && o) o.rewindWrites(l);
	return "abandon";
}
/**
* The scope a system was handed. `run` is one step: the body mutates, then says
* whether it happened.
*
* @experimental
*/
var c = class {
	constructor(e, t, n) {
		this.world_ = e;
		this.resources_ = t;
		this.events_ = n;
	}
	run(e) {
		return s(this.scope_(), e);
	}
	/** Ask whether the step is a function of the world alone. Takes both runs
	*  back, so asking costs the world nothing. */
	replay(e) {
		return o(this.scope_(), e);
	}
	scope_() {
		return {
			world: this.world_,
			resources: this.resources_,
			events: this.events_ ?? void 0
		};
	}
};
/**
* `Res(Speculation)` — the engine's existing way for a system to be handed a
* service, which is what this is. The parameter vocabulary is a frozen public
* type: a capability that grows it breaks that promise for every reader of
* `SystemParam`, and a service does not need to.
*
* @experimental
*/
const l = n(null, "Speculation");
//#endregion
export { c as n, o as r, l as t };

//# sourceMappingURL=speculation.js.map