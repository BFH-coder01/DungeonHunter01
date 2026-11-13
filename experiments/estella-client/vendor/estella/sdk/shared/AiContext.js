import { a as e } from "./input.js";
//#region src/ai/fsm/registry.ts
var t = class {
	constructor() {
		this.actions = /* @__PURE__ */ new Map();
		this.conditions = /* @__PURE__ */ new Map();
	}
	/**
	* Register `name`, either as a bare function (input is the raw `arg` string,
	* as it always was) or with declared parameters.
	*
	* A declared action is stored WRAPPED in the projection, so both shapes are
	* filled in no matter how it is reached — {@link invokeAction}, a direct
	* `getAction(name)(ctx, bb, "tabs:settings")`, anything. Normalizing once
	* here is what keeps the two forms from becoming two contracts.
	*/
	registerAction(e, t) {
		const i = typeof t === "function" ? { run: t } : t;
		const a = i.params ?? [];
		const o = i.separator ?? ":";
		const s = i.run;
		const c = a.length === 0 ? s : (e, t, i, c, l) => {
			const u = c && Object.keys(c).length > 0 ? c : n(i, a, o);
			return s(e, t, i ?? r(u, a, o), u, l);
		};
		this.actions.set(e, {
			fn: c,
			params: a,
			outputs: i.outputs ?? [],
			pure: i.pure === true,
			separator: o,
			touches: i.touches
		});
	}
	/**
	* Register a pure name — see {@link AiValueSpec}. It lands in the SAME store
	* actions do, so one lookup, one catalog and one extractor serve both: a
	* palette asks what names exist, not what kind of thing each one is.
	*/
	registerValue(e, t) {
		const { evaluate: n } = t;
		this.registerAction(e, {
			params: t.params,
			outputs: t.outputs,
			pure: true,
			touches: t.touches,
			run: (e, t, r, i, a) => {
				if (a) n(e, t, i ?? {}, a);
			}
		});
	}
	registerCondition(e, t) {
		const n = typeof t === "function" ? { check: t } : t;
		this.conditions.set(e, {
			fn: n.check,
			touches: n.touches
		});
	}
	getAction(e) {
		return this.actions.get(e)?.fn;
	}
	/**
	* What running `name` reaches for, given the input an authored reference
	* carries. `undefined` for an unregistered name or one that never declared —
	* the caller has to decide what an unknown leaf means, and treating it as
	* "touches nothing" would be the one wrong answer.
	*/
	actionTouches(e, t = {}) {
		const n = this.actions.get(e)?.touches;
		if (!n) return void 0;
		return typeof n === "function" ? n(t) : n;
	}
	conditionTouches(e) {
		return this.conditions.get(e)?.touches;
	}
	/** The declared parameters of `name` (empty when it takes a bare string). */
	getActionParams(e) {
		return this.actions.get(e)?.params ?? [];
	}
	/** The separator joining `name`'s parameters in the canonical string form. */
	getActionSeparator(e) {
		return this.actions.get(e)?.separator ?? ":";
	}
	/** What `name` hands back (empty when it declares nothing). */
	getActionOutputs(e) {
		return this.actions.get(e)?.outputs ?? [];
	}
	/** Whether running `name` changes nothing — see {@link AiActionSpec.pure}. */
	isActionPure(e) {
		return this.actions.get(e)?.pure ?? false;
	}
	getCondition(e) {
		return this.conditions.get(e)?.fn;
	}
	hasAction(e) {
		return this.actions.has(e);
	}
	hasCondition(e) {
		return this.conditions.has(e);
	}
	/** Registered action/condition names, for editor palettes. */
	actionNames() {
		return [...this.actions.keys()];
	}
	conditionNames() {
		return [...this.conditions.keys()];
	}
	/** Drop all registrations (tests / hot-reload). */
	clear() {
		this.actions.clear();
		this.conditions.clear();
	}
};
/**
* Split a canonical string into declared parameters. The last parameter absorbs
* the remainder, so `"tabs:a:b"` against `[controller, page]` yields
* `{controller: 'tabs', page: 'a:b'}` — the same rule `ui.setPage` hand-rolled.
* Numbers and booleans are coerced to their declared type.
*/
function n(e, t, n = ":") {
	const r = {};
	if (!e || t.length === 0) return r;
	const i = [];
	let o = e;
	for (let e = 0; e < t.length - 1; e++) {
		const e = o.indexOf(n);
		if (e < 0) break;
		i.push(o.slice(0, e));
		o = o.slice(e + n.length);
	}
	i.push(o);
	for (let e = 0; e < i.length && e < t.length; e++) r[t[e].name] = a(i[e], t[e].type);
	return r;
}
/**
* Join declared parameters back into the canonical string — so data authored as
* parameters still reaches an action (or a tool) that only speaks `arg`.
* Trailing empties are dropped, keeping `"tabs"` rather than `"tabs:"`.
*/
function r(e, t, n = ":") {
	if (!e || t.length === 0) return void 0;
	const r = t.map((t) => {
		const n = e[t.name];
		return n === void 0 || n === null ? "" : String(n);
	});
	while (r.length && r[r.length - 1] === "") r.pop();
	return r.length ? r.join(n) : void 0;
}
/**
* The one dispatch path for a named action, shared by the FSM, the behaviour
* tree and event wires: resolve the name and hand it whichever form the authored
* data carries — the registration wrapper fills in the other. An unknown name is
* a silent no-op, so each caller reports it in its own vocabulary (a BT leaf
* fails, an event wire warns).
*/
function i(e, t, n, i, a = {}, o) {
	const s = e.getAction(t);
	if (!s) return void 0;
	const c = a.params && Object.keys(a.params).length > 0 ? a.params : void 0;
	return s(n, i, c ? r(c, e.getActionParams(t), e.getActionSeparator(t)) ?? a.arg : a.arg, c, o);
}
function a(e, t) {
	if (t === "number") {
		const t = Number(e);
		return Number.isFinite(t) ? t : 0;
	}
	if (t === "bool") return e === "true" || e === "1";
	return e;
}
//#endregion
//#region src/ai/fsm/AiContext.ts
/**
* The process-wide AI registry. Actions/conditions are code registrations
* (stable like component defs), so a single shared instance is correct across
* App instances; `.esfsm`/`.esbt` data references resolve against it.
*/
const o = new t();
/** An input state with nothing pressed — what a caller with no devices supplies. */
const s = () => c;
const c = new e();
/**
* Register a named action referenced by FSM state hooks / BT leaves / event
* rows — as a bare function, or with declared parameters, which is what turns
* an editor text box into typed controls.
*/
function l(e, t) {
	o.registerAction(e, t);
}
/** Register a named condition referenced by FSM transitions / BT conditions. */
function u(e, t) {
	o.registerCondition(e, t);
}
/**
* Register a named VALUE — a pure name that answers a question, which a script
* graph reads by wiring its declared outputs. Same store as the actions, so it
* shows up in the same palettes.
*/
function d(e, t) {
	o.registerValue(e, t);
}
//#endregion
export { d as a, i as c, u as i, n as l, s as n, t as o, l as r, r as s, o as t };

//# sourceMappingURL=AiContext.js.map